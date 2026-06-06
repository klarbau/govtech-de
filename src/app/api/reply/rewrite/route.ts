/**
 * POST /api/reply/rewrite
 *
 * Posteingang „Antwort verfassen" KI-Umformulieren path. Receives an existing
 * reply draft body + a fixed rewrite action and returns the re-phrased body.
 * On ANY downstream failure (missing key, SDK error, timeout, empty output) it
 * returns the ORIGINAL body unchanged with `source: 'fallback'` so the client
 * degrades silently and the demo never breaks offline.
 *
 * This is a SEPARATE surface from the conversational assistant
 * (`/api/assistant`) and the dashboard sort (`/api/dashboard/top-actions`) —
 * a one-shot, non-streaming text call. See `src/lib/ai/reply-rewrite.ts` for
 * the RDG-safety rules (§ 2 RDG — re-phrase only, no legal argumentation).
 *
 * Hard rules enforced here:
 *   - Node runtime (server-only SDK + process.env).
 *   - Server-only secret access (the key never reaches the client).
 *   - Prompt caching ON (in the AI module).
 *   - Rate limited (distinct `reply-rewrite` bucket) + body size cap.
 *   - 400 for malformed input; 429 (with Retry-After) on rate limit; otherwise
 *     ALWAYS 200 — a downstream failure still returns the original body.
 */

import {
  CAPS,
  checkRateLimit,
  rateLimitKeyFromRequest,
  REPLY_REWRITE_RATE_LIMIT,
} from '@/lib/ai/rate-limit';
import {
  rewriteReplyBody,
  type ReplyRewriteAction,
  type ReplyRewriteResult,
} from '@/lib/ai/reply-rewrite';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const VALID_ACTIONS: readonly ReplyRewriteAction[] = [
  'umformulieren',
  'kuerzer',
  'formeller',
  'einfacher',
] as const;

interface RewriteRequestBody {
  body: string;
  action: ReplyRewriteAction;
}

function isReplyRewriteAction(value: unknown): value is ReplyRewriteAction {
  return (
    typeof value === 'string' &&
    (VALID_ACTIONS as readonly string[]).includes(value)
  );
}

export async function POST(req: Request): Promise<Response> {
  // ── Rate limit ──────────────────────────────────────────────────────────
  // Same session-keyed best-effort throttle as the other AI routes, separate
  // bucket so heavy rewriting doesn't starve the assistant or dashboard sort.
  const limit = checkRateLimit(
    'reply-rewrite',
    rateLimitKeyFromRequest(req),
    REPLY_REWRITE_RATE_LIMIT,
  );
  if (!limit.ok) {
    return rateLimited(limit.retryAfterSeconds);
  }

  let body: RewriteRequestBody;
  try {
    body = (await req.json()) as RewriteRequestBody;
  } catch {
    return json(400, {
      error: { code: 'invalid_json', message: 'Body ist kein gültiges JSON.' },
    });
  }

  // Validate `action` against the union → 400 on unknown.
  if (!body || !isReplyRewriteAction(body.action)) {
    return json(400, {
      error: {
        code: 'invalid_action',
        message: `\`action\` muss eines von ${VALID_ACTIONS.join(' | ')} sein.`,
      },
    });
  }

  // Validate `body` is a non-empty string → 400.
  if (typeof body.body !== 'string' || body.body.trim().length === 0) {
    return json(400, {
      error: {
        code: 'invalid_body',
        message: '`body` muss ein nicht-leerer String sein.',
      },
    });
  }

  // Size cap: reject an oversize body before it reaches the (cached) prompt.
  // A real Behörden-Antwort is a page or two; this is comfortable headroom.
  if (body.body.length > CAPS.maxReplyBodyChars) {
    return json(413, {
      error: {
        code: 'payload_too_large',
        message: `Text zu lang (max. ${CAPS.maxReplyBodyChars} Zeichen).`,
      },
    });
  }

  // Defensive: even if the AI module throws unexpectedly, the client still gets
  // the original body back rather than a 500. `rewriteReplyBody` already never
  // throws, but the route stays 200-on-failure regardless.
  try {
    const result = await rewriteReplyBody({
      body: body.body,
      action: body.action,
    });
    return json(200, result satisfies ReplyRewriteResult);
  } catch {
    return json(200, {
      body: body.body,
      source: 'fallback',
    } satisfies ReplyRewriteResult);
  }
}

function json(status: number, payload: unknown): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}

/** 429 with a `Retry-After` header. */
function rateLimited(retryAfterSeconds: number): Response {
  return new Response(
    JSON.stringify({
      error: {
        code: 'rate_limited',
        message:
          'Zu viele Anfragen in kurzer Zeit. Bitte einen Moment warten und erneut versuchen.',
      },
    }),
    {
      status: 429,
      headers: {
        'content-type': 'application/json; charset=utf-8',
        'retry-after': String(retryAfterSeconds),
      },
    },
  );
}
