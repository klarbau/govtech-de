/**
 * FIT-Connect SET decode — pure display helper (Protokoll-Modus Spec § 5.2).
 *
 * Decodes a compact JWS Security Event Token (RFC 8417) into the display form
 * the ProtokollInspector timeline renders: the protected-header trio, the `iss`
 * / `iat` claims and the RFC-8417 `events` keys (the real FIT-Connect event
 * vocabulary — create/submit/notify/accept-submission).
 *
 * PURE: no network, no secrets, no signature verification. The signature
 * verdict is decided SERVER-side in `rest-tier2.ts` against the correct key by
 * issuer (delivery-service JWKS vs. the destination's per-kid sig key) and
 * passed in here as `signatureVerified` — this helper only formats it.
 *
 * NEVER throws on malformed input: a garbage/short/non-JWS string returns a
 * `DecodedSet` with empty `eventTypes` and `signatureVerified: false`.
 */

import { decodeJwt, decodeProtectedHeader } from 'jose';

export interface DecodedSet {
  header: { alg: string; kid?: string; typ?: string };
  /** `iss` claim — FITKO host for delivery SETs, destinationId for our accept-SET. */
  issuer?: string;
  /** `iat` in seconds. */
  iat?: number;
  /** `iat` rendered as an ISO-8601 string for display. */
  iatIso?: string;
  /** Keys of the RFC 8417 `events` claim (create/submit/notify/accept-submission URIs). */
  eventTypes: string[];
  /** Verdict decided server-side against the correct key; forced `false` on malformed input. */
  signatureVerified: boolean;
}

/**
 * Base64url-decode a compact JWS SET's header + payload FOR DISPLAY ONLY.
 * `signatureVerified` is the server-side verdict; it is preserved on a valid
 * decode and forced `false` when the input cannot be decoded.
 */
export function decodeSet(compactJws: string, signatureVerified: boolean): DecodedSet {
  try {
    const hdr = decodeProtectedHeader(compactJws);
    const claims = decodeJwt(compactJws) as {
      iss?: string;
      iat?: number;
      events?: Record<string, unknown>;
    };

    const iat = typeof claims.iat === 'number' ? claims.iat : undefined;
    const eventTypes =
      claims.events && typeof claims.events === 'object'
        ? Object.keys(claims.events)
        : [];

    return {
      header: {
        alg: typeof hdr.alg === 'string' ? hdr.alg : 'unknown',
        ...(typeof hdr.kid === 'string' ? { kid: hdr.kid } : {}),
        ...(typeof hdr.typ === 'string' ? { typ: hdr.typ } : {}),
      },
      ...(typeof claims.iss === 'string' ? { issuer: claims.iss } : {}),
      ...(iat !== undefined
        ? { iat, iatIso: new Date(iat * 1000).toISOString() }
        : {}),
      eventTypes,
      signatureVerified,
    };
  } catch {
    // Malformed / non-JWS input — never throw; degrade to an honest empty verdict.
    return { header: { alg: 'unknown' }, eventTypes: [], signatureVerified: false };
  }
}
