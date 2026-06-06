/**
 * Lightweight, dependency-free request hardening for the public AI endpoints.
 *
 * Why this exists: the demo deploys to a public Vercel URL with a REAL
 * `ANTHROPIC_API_KEY`. The AI routes (`/api/assistant`, `/api/dashboard/
 * top-actions`) are unauthenticated by design (it's a portfolio demo, no login
 * gate on the hero). Without caps + a rate limit, a crawler or a bored visitor
 * can drive unbounded token spend and knock out the hero feature mid-demo.
 *
 * Scope is deliberately proportionate to the blast radius — API spend +
 * availability, NOT a data breach (no real PII or money flows through here
 * beyond the key). So: in-memory, best-effort, per-instance. Good enough for a
 * demo; explicitly NOT a substitute for a real gateway/WAF in production.
 *
 * Two concerns, both pure + unit-testable:
 *   1. Rate limiting — fixed-window counter keyed by the existing session id
 *      (`mock_sid` cookie) with an `x-forwarded-for` IP fallback.
 *   2. Size caps — message count / per-block length / total bytes guards, so a
 *      single request can't smuggle a megabyte of text into the prompt cache.
 *
 * The store is anchored on `globalThis` (same pattern as the session-bus
 * registry) so it survives Next.js's per-route bundle splitting — otherwise
 * each route would get its own counter and the limit would be effectively 2x.
 */

/* ───────────────────────────── rate limiter ─────────────────────────────── */

interface WindowState {
  /** Epoch ms at which the current window started. */
  windowStart: number;
  /** Requests counted in the current window. */
  count: number;
}

const STORE_KEY = Symbol.for('govtech-de:ai:rate-limit-store');

type RateLimitGlobal = typeof globalThis & {
  [STORE_KEY]?: Map<string, WindowState>;
};

function store(): Map<string, WindowState> {
  const g = globalThis as RateLimitGlobal;
  if (!g[STORE_KEY]) g[STORE_KEY] = new Map<string, WindowState>();
  return g[STORE_KEY];
}

export interface RateLimitConfig {
  /** Max requests permitted per window. */
  limit: number;
  /** Window length in milliseconds. */
  windowMs: number;
}

export interface RateLimitResult {
  ok: boolean;
  /** Requests remaining in the current window (>= 0). */
  remaining: number;
  /** Seconds until the current window resets — surfaced as `Retry-After`. */
  retryAfterSeconds: number;
}

/**
 * Default budget for `/api/assistant`. ~20 req/min/session is generous for a
 * human driving the Umzug conversation (each turn = 1 request; a full demo run
 * is a handful) yet caps a scripted abuser hard.
 */
export const ASSISTANT_RATE_LIMIT: RateLimitConfig = {
  limit: 20,
  windowMs: 60_000,
};

/** Same shape for the dashboard "KI"-sort one-shot. */
export const TOP_ACTIONS_RATE_LIMIT: RateLimitConfig = {
  limit: 20,
  windowMs: 60_000,
};

/**
 * Budget for the Posteingang reply-rewrite one-shot (`/api/reply/rewrite`).
 * A human drafting a reply taps a KI-chip a handful of times per draft; this
 * is generous for that while still capping a scripted abuser that hammers the
 * (real-key) rewrite path. Distinct bucket → heavy rewriting does not starve
 * the assistant or the dashboard sort.
 */
export const REPLY_REWRITE_RATE_LIMIT: RateLimitConfig = {
  limit: 20,
  windowMs: 60_000,
};

/**
 * Fixed-window check. Distinct `bucket` namespaces keep the two endpoints'
 * counters separate even when they share a `key` (the session id), so heavy
 * assistant use doesn't starve the dashboard sort.
 *
 * `now` is injectable for deterministic tests.
 */
export function checkRateLimit(
  bucket: string,
  key: string,
  config: RateLimitConfig = ASSISTANT_RATE_LIMIT,
  now: number = Date.now(),
): RateLimitResult {
  const map = store();
  const composite = `${bucket}:${key}`;
  const state = map.get(composite);

  // Fresh window: either no state, or the previous window has fully elapsed.
  if (!state || now - state.windowStart >= config.windowMs) {
    map.set(composite, { windowStart: now, count: 1 });
    return {
      ok: true,
      remaining: config.limit - 1,
      retryAfterSeconds: Math.ceil(config.windowMs / 1000),
    };
  }

  if (state.count >= config.limit) {
    const retryAfterMs = config.windowMs - (now - state.windowStart);
    return {
      ok: false,
      remaining: 0,
      retryAfterSeconds: Math.max(1, Math.ceil(retryAfterMs / 1000)),
    };
  }

  state.count += 1;
  return {
    ok: true,
    remaining: config.limit - state.count,
    retryAfterSeconds: Math.ceil(
      (config.windowMs - (now - state.windowStart)) / 1000,
    ),
  };
}

/** Test-only: wipe the in-memory window store. */
export function __resetRateLimitStore(): void {
  store().clear();
}

/**
 * Derive a stable rate-limit key from a request. Prefers the `mock_sid` session
 * cookie (the app's own session identity), falling back to the first
 * `x-forwarded-for` hop, then a shared `anon` bucket. The fallback chain means
 * a cookie-less crawler still gets throttled (by IP, then globally), it just
 * shares a coarser bucket — acceptable for a demo.
 */
export function rateLimitKeyFromRequest(req: Request): string {
  const cookie = req.headers.get('cookie') ?? '';
  const sid = parseCookie(cookie, 'mock_sid');
  if (sid) return `sid:${sid}`;

  const xff = req.headers.get('x-forwarded-for');
  if (xff) {
    const first = xff.split(',')[0]?.trim();
    if (first) return `ip:${first}`;
  }
  return 'anon';
}

/** Minimal cookie parse — no dependency, returns the first matching value. */
function parseCookie(cookieHeader: string, name: string): string | undefined {
  if (!cookieHeader) return undefined;
  for (const part of cookieHeader.split(';')) {
    const eq = part.indexOf('=');
    if (eq === -1) continue;
    const k = part.slice(0, eq).trim();
    if (k === name) return decodeURIComponent(part.slice(eq + 1).trim());
  }
  return undefined;
}

/* ─────────────────────────────── size caps ──────────────────────────────── */

/**
 * Centralised cap values. Tuned to clear the real demo flows (the full Umzug
 * conversation, the dashboard candidate set) with comfortable headroom while
 * rejecting anything that smells like an abuse payload.
 */
export const CAPS = {
  /** Max conversation turns forwarded to Anthropic. A long demo is < 20. */
  maxMessages: 40,
  /** Max characters in any single text block (user text or tool_result). */
  maxCharsPerBlock: 16_000,
  /** Max total request body size in bytes (UTF-8). */
  maxTotalBytes: 32_768,
  /** Persona free-text notes cap — keeps unbounded notes out of the cache. */
  maxNotizenChars: 2_000,
  /** Max dashboard top-action candidates in one ranking request. */
  maxTopActionCandidates: 50,
  /**
   * Max characters in a reply body sent to `/api/reply/rewrite`. A real
   * Behörden-Antwort is a page or two of plain text; 16k chars is comfortable
   * headroom while keeping a megabyte of text out of the (cached) prompt.
   */
  maxReplyBodyChars: 16_000,
} as const;

/**
 * Byte length of an already-parsed body. We re-serialise rather than reading
 * the raw stream twice (the route already consumed it via `req.json()`), which
 * is a safe over-estimate of the wire size — JSON.stringify of the parsed
 * object is never materially smaller than what arrived.
 */
export function approxByteLength(value: unknown): number {
  try {
    return Buffer.byteLength(JSON.stringify(value) ?? '', 'utf8');
  } catch {
    // Circular/unstringifiable — treat as oversize so it's rejected.
    return Number.MAX_SAFE_INTEGER;
  }
}
