/**
 * POST /api/dashboard/top-actions
 *
 * Dashboard "KI"-sort AI path. Receives the structured top-action candidates
 * (NO Brief bodies — `TopActionCandidateInput[]`, already stripped by
 * `getCandidatesForTopActions`) and returns a Zod-validated ranking. On any
 * failure (missing key, schema mismatch, timeout, SDK error) it returns a
 * deterministic Frist-sort fallback so the dashboard never breaks offline.
 *
 * This is a SEPARATE surface from the conversational assistant
 * (`/api/assistant`) — it is a one-shot, non-streaming tool-use call. See
 * `src/lib/ai/dashboard-prioritize.ts` for the hard architecture rules
 * (dashboard.md Hard-Line §11.44).
 *
 * Hard rules enforced here:
 *   - Node runtime (server-only SDK + process.env).
 *   - Server-only secret access (the key never reaches the client).
 *   - Prompt caching ON (in the AI module).
 *   - Input is structured candidates only; we re-validate the array shape.
 */

import {
  deterministicRank,
  prioritizeTopActionsAi,
  type PrioritizeOutcome,
} from '@/lib/ai/dashboard-prioritize';
import {
  approxByteLength,
  CAPS,
  checkRateLimit,
  rateLimitKeyFromRequest,
  TOP_ACTIONS_RATE_LIMIT,
} from '@/lib/ai/rate-limit';
import type { PrioritizedTopAction, TopActionCandidateInput } from '@/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface TopActionsRequestBody {
  candidates: TopActionCandidateInput[];
}

interface TopActionsResponseBody {
  ranking: PrioritizedTopAction[];
  /** Why this ranking was produced — consumed by the dashboard ai-log. */
  outcome: PrioritizeOutcome;
}

export async function POST(req: Request): Promise<Response> {
  // ── Rate limit (audit defect #1) ────────────────────────────────────────
  // Same session-keyed best-effort throttle as /api/assistant, separate bucket.
  const limit = checkRateLimit(
    'top-actions',
    rateLimitKeyFromRequest(req),
    TOP_ACTIONS_RATE_LIMIT,
  );
  if (!limit.ok) {
    return rateLimited(limit.retryAfterSeconds);
  }

  let body: TopActionsRequestBody;
  try {
    body = (await req.json()) as TopActionsRequestBody;
  } catch {
    return json(400, { error: { code: 'invalid_json', message: 'Body ist kein gültiges JSON.' } });
  }

  if (!body || !Array.isArray(body.candidates)) {
    return json(400, {
      error: { code: 'invalid_body', message: '`candidates` muss ein Array sein.' },
    });
  }

  // Size caps (audit defect #1): reject oversize candidate sets / bodies before
  // they reach the (cached) prompt. The real dashboard sends well under these.
  if (approxByteLength(body) > CAPS.maxTotalBytes) {
    return json(413, {
      error: { code: 'payload_too_large', message: `Anfrage zu groß (max. ${CAPS.maxTotalBytes} Bytes).` },
    });
  }
  if (body.candidates.length > CAPS.maxTopActionCandidates) {
    return json(413, {
      error: {
        code: 'too_many_candidates',
        message: `Zu viele Kandidaten (max. ${CAPS.maxTopActionCandidates}).`,
      },
    });
  }

  // Defensive: even if the AI module throws unexpectedly, the dashboard gets a
  // usable deterministic ranking rather than a 500.
  try {
    const result = await prioritizeTopActionsAi(body.candidates);
    return json(200, result satisfies TopActionsResponseBody);
  } catch {
    return json(200, {
      ranking: deterministicRank(body.candidates),
      outcome: 'fallback:sdk_error',
    } satisfies TopActionsResponseBody);
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
