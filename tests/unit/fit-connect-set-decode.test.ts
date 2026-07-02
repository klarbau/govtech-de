/**
 * Unit tests for the pure SET-decode display helper (Protokoll-Modus Spec § 5.2,
 * § 12). Covers: a valid delivery SET, a valid accept SET, malformed input, and
 * a SET with no `events` claim. The helper NEVER throws and forces
 * `signatureVerified: false` on input it cannot decode.
 *
 * `decodeSet` performs no signature verification (that stays server-side in
 * `rest-tier2.ts`), so the tests build compact JWS strings with an arbitrary,
 * unverified signature segment — exactly the display path the helper handles.
 */
import { describe, expect, test } from 'vitest';

import { decodeSet } from '@/lib/fit-connect/set-decode';

const EVENTS_BASE = 'https://schema.fitko.de/fit-connect/events';
const DELIVERY_ISS = 'https://test.fit-connect.fitko.dev/submission-api';
const DESTINATION_ID = 'a1b2c3d4-0000-4000-8000-000000000000';

function b64url(value: unknown): string {
  return Buffer.from(JSON.stringify(value)).toString('base64url');
}

/** Build a compact JWS with a fixed, unverified signature segment. */
function compactJws(header: Record<string, unknown>, payload: Record<string, unknown>): string {
  return `${b64url(header)}.${b64url(payload)}.AAAA`;
}

describe('decodeSet', () => {
  test('valid delivery SET (submit-submission) — header trio + iat + events', () => {
    const compact = compactJws(
      { alg: 'PS512', typ: 'secevent+jwt', kid: 'delivery-kid-1' },
      {
        iss: DELIVERY_ISS,
        iat: 1_720_000_000,
        events: { [`${EVENTS_BASE}/submit-submission`]: {} },
      },
    );

    const decoded = decodeSet(compact, true);

    expect(decoded.header).toEqual({ alg: 'PS512', typ: 'secevent+jwt', kid: 'delivery-kid-1' });
    expect(decoded.issuer).toBe(DELIVERY_ISS);
    expect(decoded.iat).toBe(1_720_000_000);
    expect(decoded.iatIso).toBe(new Date(1_720_000_000 * 1000).toISOString());
    expect(decoded.eventTypes).toEqual([`${EVENTS_BASE}/submit-submission`]);
    expect(decoded.signatureVerified).toBe(true);
  });

  test('valid accept SET (accept-submission, iss = destinationId)', () => {
    const compact = compactJws(
      { alg: 'PS512', typ: 'secevent+jwt', kid: 'sig-kid-9' },
      {
        iss: DESTINATION_ID,
        iat: 1_720_000_500,
        events: { [`${EVENTS_BASE}/accept-submission`]: { authenticationTags: { metadata: 'x' } } },
      },
    );

    const decoded = decodeSet(compact, true);

    expect(decoded.header.kid).toBe('sig-kid-9');
    expect(decoded.issuer).toBe(DESTINATION_ID);
    expect(decoded.eventTypes).toEqual([`${EVENTS_BASE}/accept-submission`]);
    expect(decoded.signatureVerified).toBe(true);
  });

  test('malformed compact string never throws; forces signatureVerified false', () => {
    for (const bad of ['', 'not-a-jws', 'only.two', '...', 'a.b.c.d.e']) {
      const decoded = decodeSet(bad, true);
      expect(decoded.header).toEqual({ alg: 'unknown' });
      expect(decoded.eventTypes).toEqual([]);
      expect(decoded.signatureVerified).toBe(false);
      expect(decoded.issuer).toBeUndefined();
      expect(decoded.iat).toBeUndefined();
    }
  });

  test('valid SET with no events claim → empty eventTypes, verdict preserved', () => {
    const compact = compactJws(
      { alg: 'PS512', typ: 'secevent+jwt' },
      { iss: DELIVERY_ISS, iat: 1_720_000_900 },
    );

    const verified = decodeSet(compact, true);
    expect(verified.eventTypes).toEqual([]);
    expect(verified.signatureVerified).toBe(true);
    expect(verified.header.kid).toBeUndefined();

    const notVerified = decodeSet(compact, false);
    expect(notVerified.eventTypes).toEqual([]);
    expect(notVerified.signatureVerified).toBe(false);
  });
});
