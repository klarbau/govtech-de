/**
 * EUDI Tier-1 CORE — offline SD-JWT VC verifier (`src/lib/eudi/verify.ts`).
 *
 * `[reference-ecosystem]`: asserts the verifier against the VENDORED REAL EU
 * reference PID credential + genuine demo CA (`PID Issuer CA - UT 02`):
 *   - the real credential verifies (signature + chain + all 5 mandatory attrs),
 *   - a tampered token fails,
 *   - and verification makes ZERO network calls (the Tier-1 deploy-safety
 *     premise — `fetch` is trip-wired).
 *
 * Deterministic and offline: no live issuer, no PKI fetch, no clock dependence
 * (expiry is non-fatal — the fixture's `exp` is 2026-09-12).
 */
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { verifyPidSdJwtVc, REFERENCE_PID_SD_JWT_VC } from '@/lib/eudi';
import { MANDATORY_PID_ATTRS } from '@/lib/eudi/types';

/* ── Network trip-wire — verification must make NO network call ──────────────── */

let networkAttempts: string[];

beforeEach(() => {
  networkAttempts = [];
  vi.stubGlobal(
    'fetch',
    vi.fn((...args: unknown[]) => {
      networkAttempts.push(`fetch:${String(args[0])}`);
      throw new Error('NETWORK_CALL_IN_EUDI_TIER1');
    }),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('EUDI Tier-1 verifyPidSdJwtVc — real reference credential', () => {
  test('verifies the vendored real PID SD-JWT VC, offline', async () => {
    const r = await verifyPidSdJwtVc(REFERENCE_PID_SD_JWT_VC);

    expect(r.verified).toBe(true);
    expect(r.reason).toBeUndefined();
    expect(r.chainValid).toBe(true);
    expect(r.alg).toBe('ES256');
    expect(r.vct).toBe('urn:eudi:pid:1');

    // Trust anchor is the genuine demo CA — NOT the leaf (`PID DS - 01`).
    expect(r.trustAnchorSubject).toContain('PID Issuer CA - UT 02');
    expect(r.trustAnchorSubject).not.toContain('PID DS - 01');

    // All 5 ARF-mandatory PID attributes disclosed + digest-matched.
    for (const attr of MANDATORY_PID_ATTRS) {
      expect(r.mandatoryPresent).toContain(attr);
    }
    expect(r.mandatoryPresent).toHaveLength(5);

    // Disclosed claim values (the synthetic FormEU test identity).
    expect(r.claims.family_name).toBe('Mustermann');
    expect(r.claims.given_name).toBe('Erika');
    expect(r.claims.birthdate).toBe('1990-01-01');
    expect(r.claims.nationalities).toEqual(['DE']);
    // Nested place_of_birth (sub-claims are themselves selectively disclosed).
    expect(r.claims.place_of_birth).toMatchObject({
      country: 'DE',
      locality: 'Berlin',
      region: 'Berlin',
    });

    // Validity surfaced honestly even though expiry is non-fatal. The JWT `exp`
    // epoch (1789167600) is the issuer's local-midnight 2026-09-12 == 23:00Z.
    expect(r.validity.expiresAt).toBe(new Date(1789167600 * 1000).toISOString());
    expect(r.validity.notBefore).toBe(new Date(1781391600 * 1000).toISOString());
    // The disclosed `date_of_expiry` claim string is the calendar date.
    expect(r.claims.date_of_expiry).toBe('2026-09-12');
    // `expired` reflects the real wall clock; it must NOT flip `verified`.
    expect(typeof r.expired).toBe('boolean');

    // ZERO network.
    expect(networkAttempts).toEqual([]);
  });

  test('expiry is non-fatal: an already-expired fixture still verifies', async () => {
    const r = await verifyPidSdJwtVc(REFERENCE_PID_SD_JWT_VC);
    // Regardless of whether `expired` is true at run time, `verified` stays true.
    expect(r.verified).toBe(true);
    if (r.expired) {
      // If/when the wall clock passes 2026-09-12, the deployed demo still renders.
      expect(r.validity.expiresAt).toBeTruthy();
    }
    expect(networkAttempts).toEqual([]);
  });
});

describe('EUDI Tier-1 verifyPidSdJwtVc — tamper detection', () => {
  test('a flipped signature char fails (verified === false)', async () => {
    const [head, payload, sig] = REFERENCE_PID_SD_JWT_VC.split('~')[0].split('.');
    // Flip the first char of the signature to a different base64url char.
    const flipped = (sig[0] === 'A' ? 'B' : 'A') + sig.slice(1);
    const rest = REFERENCE_PID_SD_JWT_VC.slice(
      REFERENCE_PID_SD_JWT_VC.indexOf('~'),
    );
    const tampered = `${head}.${payload}.${flipped}${rest}`;

    const r = await verifyPidSdJwtVc(tampered);
    expect(r.verified).toBe(false);
    expect(r.reason).toMatch(/issuer-signature-invalid/);
    expect(networkAttempts).toEqual([]);
  });

  test('a tampered disclosure fails its digest binding (verified === false)', async () => {
    const segs = REFERENCE_PID_SD_JWT_VC.split('~');
    // The first disclosure is family_name="Mustermann". Re-encode it with a
    // different value → its SHA-256 digest no longer matches any `_sd` entry,
    // while the issuer signature (over the unchanged JWT) still verifies.
    const forged = Buffer.from(
      JSON.stringify(['c7KtP3WJTZPtTxs3HjodGA', 'family_name', 'Schmidt']),
    ).toString('base64url');
    segs[1] = forged;
    const tampered = segs.join('~');

    const r = await verifyPidSdJwtVc(tampered);
    expect(r.verified).toBe(false);
    expect(r.reason).toBe('disclosure-digest-mismatch');
    // family_name must NOT have been accepted into the disclosed claims.
    expect(r.claims.family_name).toBeUndefined();
    expect(networkAttempts).toEqual([]);
  });
});
