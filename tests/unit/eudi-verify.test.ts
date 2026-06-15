/**
 * EUDI Tier-1 CORE — offline SD-JWT VC verifier (`src/lib/eudi/verify.ts`).
 *
 * `[reference-ecosystem]`: asserts the verifier against the VENDORED REAL,
 * PERSONA-AWARE EU reference PID credentials + genuine demo CA
 * (`PID Issuer CA - UT 02`):
 *   - each of the 3 demo personas' pre-issued PIDs verifies (signature + chain +
 *     x5c + all 5 mandatory attrs) with that persona's exact synthetic attrs,
 *   - the default (Erika) credential verifies,
 *   - the registry / fallback selects the right credential per personaId,
 *   - a tampered token fails,
 *   - and verification makes ZERO network calls (the Tier-1 deploy-safety
 *     premise — `fetch` is trip-wired).
 *
 * Deterministic and offline: no live issuer, no PKI fetch, no clock dependence
 * (expiry is non-fatal — the fixtures' `exp` is 2026-09-12).
 */
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import {
  verifyPidSdJwtVc,
  REFERENCE_PID_SD_JWT_VC,
  PID_SD_JWT_VC_BY_PERSONA,
  pidSdJwtVcForPersona,
} from '@/lib/eudi';
import { MANDATORY_PID_ATTRS } from '@/lib/eudi/types';

/**
 * Expected per-persona disclosed attrs (the SYNTHETIC FormEU identities entered
 * at issuance). Each credential carries the real demo leaf DS cert in `x5c[0]`.
 */
const PERSONA_EXPECTATIONS = {
  'anna-petrov': {
    family_name: 'Petrov',
    given_name: 'Anna',
    birthdate: '1997-03-22',
    nationalities: ['RU'],
    place_of_birth: { country: 'BG', locality: 'Sofia', region: 'Sofia' },
  },
  'markus-schmidt': {
    family_name: 'Schmidt',
    given_name: 'Markus',
    birthdate: '1988-02-14',
    nationalities: ['DE'],
    place_of_birth: { country: 'DE', locality: 'Hamburg', region: 'Hamburg' },
  },
  'mehmet-yildiz': {
    family_name: 'Yıldız',
    given_name: 'Mehmet',
    birthdate: '1990-09-04',
    nationalities: ['TR'],
    place_of_birth: { country: 'TR', locality: 'Konya', region: 'Konya' },
  },
} as const;

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

describe('EUDI Tier-1 verifyPidSdJwtVc — persona-aware reference credentials', () => {
  const personaIds = Object.keys(PERSONA_EXPECTATIONS) as Array<
    keyof typeof PERSONA_EXPECTATIONS
  >;

  test('the registry holds exactly the 3 demo personas', () => {
    expect(Object.keys(PID_SD_JWT_VC_BY_PERSONA).sort()).toEqual(
      [...personaIds].sort(),
    );
  });

  test.each(personaIds)(
    'verifies %s\'s pre-issued PID offline with that persona\'s attrs',
    async (personaId) => {
      const expected = PERSONA_EXPECTATIONS[personaId];
      const token = pidSdJwtVcForPersona(personaId);
      // the registry and the resolver agree for a known id
      expect(token).toBe(PID_SD_JWT_VC_BY_PERSONA[personaId]);

      const r = await verifyPidSdJwtVc(token);

      // signature + chain + x5c-backed leaf all valid
      expect(r.verified).toBe(true);
      expect(r.reason).toBeUndefined();
      expect(r.chainValid).toBe(true);
      expect(r.alg).toBe('ES256');
      expect(r.vct).toBe('urn:eudi:pid:1');
      // x5c presence is implied by a passing signature check (verify.ts fails
      // `missing-x5c` otherwise); the genuine demo CA is the trust anchor.
      expect(r.trustAnchorSubject).toContain('PID Issuer CA - UT 02');
      expect(r.trustAnchorSubject).not.toContain('PID DS - 01');

      // all 5 ARF-mandatory attrs disclosed + digest-matched
      for (const attr of MANDATORY_PID_ATTRS) {
        expect(r.mandatoryPresent).toContain(attr);
      }
      expect(r.mandatoryPresent).toHaveLength(5);

      // the disclosed values are THIS persona's synthetic identity
      expect(r.claims.family_name).toBe(expected.family_name);
      expect(r.claims.given_name).toBe(expected.given_name);
      expect(r.claims.birthdate).toBe(expected.birthdate);
      expect(r.claims.nationalities).toEqual(expected.nationalities);
      expect(r.claims.place_of_birth).toMatchObject(expected.place_of_birth);

      // ZERO network.
      expect(networkAttempts).toEqual([]);
    },
  );

  test('an unknown personaId falls back to the default (Erika) credential', async () => {
    expect(pidSdJwtVcForPersona('not-a-persona')).toBe(REFERENCE_PID_SD_JWT_VC);
    expect(pidSdJwtVcForPersona(undefined)).toBe(REFERENCE_PID_SD_JWT_VC);

    const r = await verifyPidSdJwtVc(pidSdJwtVcForPersona('not-a-persona'));
    expect(r.verified).toBe(true);
    expect(r.claims.family_name).toBe('Mustermann');
    expect(r.claims.given_name).toBe('Erika');
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
