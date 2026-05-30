/**
 * Server-side confirm gate for irreversible/state-changing mock-backend writes
 * reachable over the `POST /api/mock` RPC path.
 *
 * THE PROBLEM IT CLOSES
 * ─────────────────────
 * `dispatch.ts` allowlists EVERY function on the `api` object, so a raw
 * `POST /api/mock {"method":"startUmzug", "args":[…]}` runs the whole Umzug
 * cascade — notifying Behörden, persisting consent, generating letters — with
 * NO confirmation. That bypasses the React preview→confirm gate
 * (`<UmzugConfirmCard>`), turning the assistant's stated "structurally
 * enforced" safety claim (tools.ts §7.3) into a UI-only fiction: the consent
 * list becomes a caller-supplied parameter an attacker can fabricate.
 *
 * THE MECHANISM (single-use, session-scoped preview token)
 * ────────────────────────────────────────────────────────
 * The LEGIT flow already calls `previewUmzug({neue_adresse, stichtag})` BEFORE
 * `startUmzug(…)`, over the SAME server session (cookie `mock_sid`). We hook
 * that ordering:
 *
 *   1. `previewUmzug` (read-only) → `recordPreviewToken(sessionId, input)`
 *      stamps a single-use token for {session, address, stichtag} with a TTL.
 *   2. `startUmzug` (write) → `consumePreviewToken(sessionId, input)` must find
 *      and burn a matching, unexpired token, OR the dispatch is rejected 403.
 *
 * So the real demo path (preview → user confirms in the card → start) passes
 * untouched; a direct `startUmzug` with no preceding `previewUmzug` in the same
 * session is structurally blocked at the server. The gate binds the token to
 * the address + stichtag, so a token minted for one move can't be replayed to
 * start a different one.
 *
 * Best-effort + in-memory (per-instance), anchored on `globalThis` to survive
 * Next.js per-route bundle splits — same rationale as the session-bus registry.
 * Proportionate to the blast radius (API spend + a mock cascade, no real
 * money/PII). It is NOT a cryptographic capability; it raises the bar from
 * "trivially scriptable" to "must replay the exact two-call sequence per
 * session", which is what closes the audit's bypass.
 */

/** RPC methods that mutate state irreversibly and therefore require the gate. */
export const GATED_WRITE_METHODS: ReadonlySet<string> = new Set(['startUmzug']);

interface PreviewToken {
  /** Stable hash of the move params the preview was issued for. */
  paramsKey: string;
  /** Epoch ms the token was minted. */
  issuedAt: number;
}

const STORE_KEY = Symbol.for('govtech-de:mock-backend:write-gate-tokens');

type WriteGateGlobal = typeof globalThis & {
  // session id → list of live tokens (a session may have previewed several
  // candidate moves before confirming one).
  [STORE_KEY]?: Map<string, PreviewToken[]>;
};

function store(): Map<string, PreviewToken[]> {
  const g = globalThis as WriteGateGlobal;
  if (!g[STORE_KEY]) g[STORE_KEY] = new Map<string, PreviewToken[]>();
  return g[STORE_KEY];
}

/** Tokens live 30 min — long enough for a human to read the card and confirm. */
const TOKEN_TTL_MS = 30 * 60_000;
/** Cap tokens per session so a preview-spam loop can't grow memory unbounded. */
const MAX_TOKENS_PER_SESSION = 25;

/**
 * Build the params key the token binds to. Reads `neue_adresse` + `stichtag`
 * out of the first dispatch arg (both `previewUmzug` and `startUmzug` take the
 * move as `args[0]`). Normalised + JSON-stringified; undefined fields collapse
 * to a stable shape so preview and start hash identically.
 */
export function umzugParamsKey(args: unknown[]): string {
  const input = (args?.[0] ?? {}) as {
    neue_adresse?: Record<string, unknown>;
    stichtag?: unknown;
  };
  const a = input.neue_adresse ?? {};
  const norm = (v: unknown): string =>
    typeof v === 'string' ? v.trim().toLowerCase() : '';
  return JSON.stringify({
    strasse: norm(a.strasse),
    hausnummer: norm(a.hausnummer),
    plz: norm(a.plz),
    ort: norm(a.ort),
    stichtag: norm(input.stichtag),
  });
}

/** Drop expired tokens for a session in place; returns the surviving list. */
function prune(tokens: PreviewToken[], now: number): PreviewToken[] {
  return tokens.filter((t) => now - t.issuedAt < TOKEN_TTL_MS);
}

/**
 * Called after a successful `previewUmzug`. Mints a single-use token for this
 * session bound to the previewed move. `now` injectable for tests.
 */
export function recordPreviewToken(
  sessionId: string,
  args: unknown[],
  now: number = Date.now(),
): void {
  const map = store();
  const paramsKey = umzugParamsKey(args);
  const existing = prune(map.get(sessionId) ?? [], now);
  existing.push({ paramsKey, issuedAt: now });
  // Keep only the most recent N (preview-spam guard).
  const trimmed = existing.slice(-MAX_TOKENS_PER_SESSION);
  map.set(sessionId, trimmed);
}

/**
 * Called before a gated write executes. Finds and BURNS a matching live token
 * for this session. Returns `true` if a valid token was consumed (write may
 * proceed), `false` if none exists (write must be rejected).
 */
export function consumePreviewToken(
  sessionId: string,
  args: unknown[],
  now: number = Date.now(),
): boolean {
  const map = store();
  const paramsKey = umzugParamsKey(args);
  const tokens = prune(map.get(sessionId) ?? [], now);
  const idx = tokens.findIndex((t) => t.paramsKey === paramsKey);
  if (idx === -1) {
    // Persist the pruned list even on miss (keeps the store tidy).
    if (tokens.length > 0) map.set(sessionId, tokens);
    else map.delete(sessionId);
    return false;
  }
  tokens.splice(idx, 1); // single-use: burn it.
  if (tokens.length > 0) map.set(sessionId, tokens);
  else map.delete(sessionId);
  return true;
}

/** Test-only: wipe the in-memory token store. */
export function __resetWriteGate(): void {
  store().clear();
}
