/**
 * POST /api/reply/sachverhalt
 *
 * Klartext-Rückkanal restatement path (klartext-rueckkanal.md §7). Receives the
 * citizen's OWN plain-language facts (`rohtext`) + the mechanically-derived
 * remedy family (`norm_familie`) and returns a neutral first-person Sachverhalt
 * for the `begruendung_kurz` slot of an already-selected Rechtsbehelf-Skelett.
 *
 * This is a SEPARATE, narrower capability from the `disabledForSkelett` rewrite
 * chips — those stay HARD-disabled on skeletons. This route is reached ONLY by
 * the `RechtsbehelfFaktenCapture` box, never by the chips.
 *
 * On ANY downstream failure (missing key, SDK error, timeout, empty output) it
 * returns the citizen's RAW text unchanged with `source: 'fallback'`
 * (Correction #9) so the slot gets the raw text for manual editing and the demo
 * never breaks offline — with NO silent legal phrasing.
 *
 * Mirrors `/api/reply/rewrite` exactly:
 *   - Node runtime (server-only SDK + process.env).
 *   - Server-only secret access (the key never reaches the client).
 *   - Prompt caching ON (in the AI module).
 *   - Rate limited (distinct `sachverhalt` bucket) + rohtext size cap.
 *   - 400 for malformed input; 429 (with Retry-After) on rate limit; 413 on
 *     oversize; otherwise ALWAYS 200 — a downstream failure returns raw text.
 */

import {
  CAPS,
  checkRateLimit,
  rateLimitKeyFromRequest,
  SACHVERHALT_RATE_LIMIT,
} from '@/lib/ai/rate-limit';
import {
  formulateSachverhalt,
  type SachverhaltNormFamilie,
  type SachverhaltResult,
} from '@/lib/ai/sachverhalt';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const VALID_NORM_FAMILIES: readonly SachverhaltNormFamilie[] = [
  'ao',
  'sgg',
  'vwgo',
] as const;

interface SachverhaltRequestBody {
  rohtext: string;
  norm_familie: SachverhaltNormFamilie;
}

function isNormFamilie(value: unknown): value is SachverhaltNormFamilie {
  return (
    typeof value === 'string' &&
    (VALID_NORM_FAMILIES as readonly string[]).includes(value)
  );
}

export async function POST(req: Request): Promise<Response> {
  // ── Rate limit ──────────────────────────────────────────────────────────
  const limit = checkRateLimit(
    'sachverhalt',
    rateLimitKeyFromRequest(req),
    SACHVERHALT_RATE_LIMIT,
  );
  if (!limit.ok) {
    return rateLimited(limit.retryAfterSeconds);
  }

  let body: SachverhaltRequestBody;
  try {
    body = (await req.json()) as SachverhaltRequestBody;
  } catch {
    return json(400, {
      error: { code: 'invalid_json', message: 'Body ist kein gültiges JSON.' },
    });
  }

  // Validate `norm_familie` against the union → 400 on unknown.
  if (!body || !isNormFamilie(body.norm_familie)) {
    return json(400, {
      error: {
        code: 'invalid_norm_familie',
        message: `\`norm_familie\` muss eines von ${VALID_NORM_FAMILIES.join(' | ')} sein.`,
      },
    });
  }

  // Validate `rohtext` is a non-empty string → 400.
  if (typeof body.rohtext !== 'string' || body.rohtext.trim().length === 0) {
    return json(400, {
      error: {
        code: 'invalid_rohtext',
        message: '`rohtext` muss ein nicht-leerer String sein.',
      },
    });
  }

  // Size cap: reject an oversize rohtext before it reaches the (cached) prompt.
  if (body.rohtext.length > CAPS.maxSachverhaltRohtextChars) {
    return json(413, {
      error: {
        code: 'payload_too_large',
        message: `Text zu lang (max. ${CAPS.maxSachverhaltRohtextChars} Zeichen).`,
      },
    });
  }

  // Defensive: even if the AI module throws unexpectedly, the client still gets
  // the raw text back rather than a 500. `formulateSachverhalt` already never
  // throws, but the route stays 200-on-failure regardless (Correction #9).
  try {
    const result = await formulateSachverhalt({
      rohtext: body.rohtext,
      normFamilie: body.norm_familie,
    });
    return json(200, result satisfies SachverhaltResult);
  } catch {
    return json(200, {
      sachverhalt: body.rohtext,
      source: 'fallback',
    } satisfies SachverhaltResult);
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
