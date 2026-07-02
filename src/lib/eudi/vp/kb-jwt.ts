/**
 * EUDI OpenID4VP verifier — Key-Binding JWT verification (Spec §6.4, step 2).
 *
 * SERVER-ONLY. This is the gap the shipped Tier-1 verifier (`../verify.ts`)
 * explicitly DEFERS: it verifies the issuer credential (ES256 signature +
 * disclosure-digest binding + chain → demo CA) but strips the KB-JWT. When a
 * PID is *presented* over OpenID4VP the holder proves possession with a
 * Key-Binding JWT (IETF SD-JWT §4.3) — this module verifies it:
 *
 *   1. signature ← the credential's embedded `cnf.jwk` (holder public key),
 *   2. `typ` header = `kb+jwt`, `alg` = ES256,
 *   3. `aud`   = our verifier `client_id` (replay/audience binding),
 *   4. `nonce` = the session nonce (freshness / anti-replay against the request),
 *   5. `sd_hash` = base64url(SHA-256(issuer-JWT ~ presented disclosures ~)),
 *      binding the KB-JWT to exactly the disclosures presented,
 *   6. `iat` within a freshness window.
 *
 * jose-based, never throws — returns `{ verified: false, reason }` so a route
 * handler can't crash on a malformed presentation. No PII in any reason.
 */

import { createHash } from 'node:crypto';

import { importJWK, jwtVerify, type JWK } from 'jose';

/** Default KB-JWT freshness window (seconds). */
const DEFAULT_MAX_AGE_SECONDS = 600;
/** Tolerated forward clock skew for `iat` (seconds). */
const CLOCK_SKEW_SECONDS = 60;

export interface KbJwtVerifyInput {
  /** The full SD-JWT VC presentation: `issuerJwt~disc1~…~discN~kbJwt`. */
  presentation: string;
  /** Expected audience — the verifier's effective `client_id`. */
  expectedAudience: string;
  /** Expected nonce — the session nonce from the authorization request. */
  expectedNonce: string;
  /** Max age of the KB-JWT `iat` in seconds (default 600). */
  maxAgeSeconds?: number;
  /** Injectable clock in ms epoch (default `Date.now()`), for tests. */
  now?: number;
}

export interface KbJwtVerifyResult {
  /** True iff signature + typ + aud + nonce + sd_hash + iat all check out. */
  verified: boolean;
  /** Present only on failure: a short, PII-free machine reason. */
  reason?: string;
}

function base64urlJson<T = Record<string, unknown>>(segment: string): T {
  return JSON.parse(Buffer.from(segment, 'base64url').toString('utf8')) as T;
}

/** base64url(SHA-256(input)) over an ASCII string (SD-JWT `sd_hash` form). */
function sha256Base64url(input: string): string {
  return createHash('sha256').update(input, 'ascii').digest('base64url');
}

/**
 * Extract the holder confirmation key (`cnf.jwk`) from the issuer-signed JWT of
 * a presentation. Returns `undefined` if absent/unparseable — never throws.
 */
export function extractHolderCnfJwk(presentation: string): JWK | undefined {
  try {
    const issuerJwt = presentation.trim().split('~')[0];
    const payload = base64urlJson<{ cnf?: { jwk?: JWK } }>(issuerJwt.split('.')[1]);
    return payload.cnf?.jwk;
  } catch {
    return undefined;
  }
}

/**
 * Verify the Key-Binding JWT of an SD-JWT VC presentation. See module header for
 * the full check list. Never throws.
 */
export async function verifyKbJwt(input: KbJwtVerifyInput): Promise<KbJwtVerifyResult> {
  const { presentation, expectedAudience, expectedNonce } = input;
  const maxAgeSeconds = input.maxAgeSeconds ?? DEFAULT_MAX_AGE_SECONDS;
  const nowMs = input.now ?? Date.now();
  const nowSec = Math.floor(nowMs / 1000);

  const segments = presentation.trim().split('~');
  const kbJwt = segments[segments.length - 1];

  // 0. There MUST be a KB-JWT (3-part JWS) as the final segment. The bare
  //    issuer credential (trailing `~`, no KB-JWT) is not a valid presentation.
  if (!kbJwt || kbJwt.split('.').length !== 3) {
    return { verified: false, reason: 'kb-jwt-missing' };
  }

  // 1. Holder key from the credential's `cnf.jwk`.
  const cnfJwk = extractHolderCnfJwk(presentation);
  if (!cnfJwk) return { verified: false, reason: 'cnf-jwk-missing' };

  // 2. Enforce the SD-JWT hash algorithm. Default is sha-256; the issuer may pin
  //    it via `_sd_alg`. We only support sha-256 (matches the shipped verifier).
  let sdAlg = 'sha-256';
  try {
    const issuerPayload = base64urlJson<{ _sd_alg?: string }>(
      segments[0].split('.')[1],
    );
    if (typeof issuerPayload._sd_alg === 'string') sdAlg = issuerPayload._sd_alg;
  } catch {
    return { verified: false, reason: 'issuer-jwt-unparseable' };
  }
  if (sdAlg !== 'sha-256') {
    return { verified: false, reason: `unsupported-sd-alg:${sdAlg}` };
  }

  // 3. Bind the KB-JWT to exactly the presented disclosures: sd_hash =
  //    base64url(SHA-256( everything up to and including the final `~` )).
  const hashedContent = presentation.slice(0, presentation.length - kbJwt.length);
  const expectedSdHash = sha256Base64url(hashedContent);

  // 4. Signature (ES256) against the holder key + `typ`/`aud` via jose.
  let payload: Record<string, unknown>;
  try {
    const key = await importJWK(cnfJwk, 'ES256');
    const verified = await jwtVerify(kbJwt, key, {
      algorithms: ['ES256'],
      typ: 'kb+jwt',
      audience: expectedAudience,
      clockTolerance: CLOCK_SKEW_SECONDS,
    });
    payload = verified.payload as Record<string, unknown>;
  } catch (err) {
    const code = (err as { code?: string })?.code;
    return { verified: false, reason: `kb-jwt-signature-invalid${code ? `:${code}` : ''}` };
  }

  // 5. Nonce — anti-replay against the authorization request.
  if (payload.nonce !== expectedNonce) {
    return { verified: false, reason: 'nonce-mismatch' };
  }

  // 6. sd_hash — the disclosure binding.
  if (payload.sd_hash !== expectedSdHash) {
    return { verified: false, reason: 'sd-hash-mismatch' };
  }

  // 7. iat freshness (jose does not gate iat by default here).
  const iat = payload.iat;
  if (typeof iat !== 'number' || !Number.isFinite(iat)) {
    return { verified: false, reason: 'iat-missing' };
  }
  if (iat > nowSec + CLOCK_SKEW_SECONDS) {
    return { verified: false, reason: 'iat-in-future' };
  }
  if (nowSec - iat > maxAgeSeconds) {
    return { verified: false, reason: 'kb-jwt-stale' };
  }

  return { verified: true };
}
