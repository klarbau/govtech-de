/**
 * Verifiable Once-Only — THE crypto round-trip proof (spec §11, the "leap").
 *
 * Mints an amtliche Meldebestätigung (§ 24 Abs. 2 BMG) SD-JWT VC via the
 * Demo-Issuer (`issueMeldebestaetigungSdJwtVc`) and re-verifies it with the
 * UNCHANGED Tier-1 verifier (`verifyPidSdJwtVc`) against the injected
 * Demo-Trust-Anchor (`DEMO_ONCE_ONLY_CA_PEM`). Asserts:
 *   - verified === true && chainValid === true (the leap),
 *   - the token carries exactly the 8 (or 7 w/o doktorgrad) § 24 fields and NO
 *     PID fields (C3 — no nationalities / place_of_birth padding),
 *   - vct is demo-owned (`govtech-de.example/…`), never bund.de/*.gov.de (C7),
 *   - the readout adapter yields the right presentFields / totalFields (§6d),
 *   - selective disclosure (Phase-2 mechanic) collapses presentFields honestly,
 *   - a tampered token fails (verified === false),
 *   - issuance + verification make ZERO network calls (deploy-safety premise).
 *
 * Deterministic + offline: vendored synthetic PKI, no live issuer, no network.
 */
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import {
  issueMeldebestaetigungSdJwtVc,
  verifyPidSdJwtVc,
  toMeldebestaetigungReadout,
  MELDEBESTAETIGUNG_FIELDS,
  MELDEBESTAETIGUNG_VCT,
  DEMO_ONCE_ONLY_CA_PEM,
  type MeldebestaetigungClaims,
} from '@/lib/eudi';
import { MANDATORY_PID_ATTRS } from '@/lib/eudi/types';

/** Full 8-field claim set (Markus Schmidt — has a doktorgrad). */
const CLAIMS_FULL: MeldebestaetigungClaims = {
  familienname: 'Schmidt',
  vornamen: 'Markus',
  doktorgrad: 'Dr.',
  geburtsdatum: '1988-02-14',
  einzugsdatum: '2026-06-01',
  datum_anmeldung: '2026-06-01',
  anschrift: 'Müllerstr. 142a, 13353 Berlin',
  wohnungsstatus: 'hauptwohnung',
};

/** 7-field claim set (Anna Petrov — no doktorgrad). */
const CLAIMS_NO_DOKTORGRAD: MeldebestaetigungClaims = {
  familienname: 'Petrov',
  vornamen: 'Anna',
  geburtsdatum: '1997-03-22',
  einzugsdatum: '2026-06-01',
  datum_anmeldung: '2026-06-01',
  anschrift: 'Müllerstr. 142a, 13353 Berlin',
  wohnungsstatus: 'hauptwohnung',
};

/** Decode the issuer-JWT payload of an SD-JWT VC token (no verification). */
function payloadOf(token: string): Record<string, unknown> {
  const [issuerJwt] = token.split('~');
  const [, p] = issuerJwt.split('.');
  return JSON.parse(Buffer.from(p, 'base64url').toString('utf8'));
}

/** Decode every disclosure's claim name from an SD-JWT VC token. */
function disclosedNames(token: string): string[] {
  const segs = token.split('~').filter((s) => s.length > 0);
  const [, ...disclosures] = segs;
  return disclosures
    .filter((s) => s.split('.').length !== 3) // skip any KB-JWT
    .map((raw) => {
      const arr = JSON.parse(Buffer.from(raw, 'base64url').toString('utf8'));
      return String(arr[1]); // [salt, name, value]
    });
}

/* ── Network trip-wire — issuance + verification must make NO network call ──── */

let networkAttempts: string[];

beforeEach(() => {
  networkAttempts = [];
  vi.stubGlobal(
    'fetch',
    vi.fn((...args: unknown[]) => {
      networkAttempts.push(`fetch:${String(args[0])}`);
      throw new Error('NETWORK_CALL_IN_ONCE_ONLY');
    }),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('Verifiable Once-Only — issue → verify round-trip', () => {
  test('mints + re-verifies (verified && chainValid) against the Demo-Trust-Anchor', async () => {
    const token = await issueMeldebestaetigungSdJwtVc(CLAIMS_FULL);
    const result = await verifyPidSdJwtVc(token, {
      trustAnchorPem: DEMO_ONCE_ONLY_CA_PEM,
    });

    expect(result.verified).toBe(true);
    expect(result.chainValid).toBe(true);
    expect(result.alg).toBe('ES256');
    expect(networkAttempts).toEqual([]);
  });

  test('vct is demo-owned (govtech-de.example/…), never bund.de/*.gov.de (C7)', async () => {
    const token = await issueMeldebestaetigungSdJwtVc(CLAIMS_FULL);
    const payload = payloadOf(token);
    expect(payload.vct).toBe(MELDEBESTAETIGUNG_VCT);
    expect(String(payload.vct).startsWith('govtech-de.example/')).toBe(true);
    expect(String(payload.vct)).not.toMatch(/bund\.de|\.gov\.de/);
    expect(String(payload.iss)).not.toMatch(/bund\.de|\.gov\.de/);
  });

  test('token carries EXACTLY the 8 § 24 fields and NO PID padding (C3)', async () => {
    const token = await issueMeldebestaetigungSdJwtVc(CLAIMS_FULL);
    const names = disclosedNames(token);

    expect(names.sort()).toEqual([...MELDEBESTAETIGUNG_FIELDS].sort());
    expect(names).toHaveLength(8);
    // No PID padding.
    for (const pidAttr of [...MANDATORY_PID_ATTRS, 'nationalities', 'place_of_birth']) {
      expect(names).not.toContain(pidAttr);
    }
  });

  test('readout adapter yields presentFields=8 / totalFields=8 for the full set (§6d)', async () => {
    const token = await issueMeldebestaetigungSdJwtVc(CLAIMS_FULL);
    const result = await verifyPidSdJwtVc(token, {
      trustAnchorPem: DEMO_ONCE_ONLY_CA_PEM,
    });
    const readout = toMeldebestaetigungReadout(result);

    expect(readout.verified).toBe(true);
    expect(readout.chainValid).toBe(true);
    expect(readout.totalFields).toBe(8);
    expect(readout.presentFields).toHaveLength(8);
    expect(readout.fields.anschrift).toBe('Müllerstr. 142a, 13353 Berlin');
    expect(readout.fields.familienname).toBe('Schmidt');
    expect(readout.fields.doktorgrad).toBe('Dr.');
    // The readout NEVER carries mandatoryPresent (C4).
    expect(
      (readout as unknown as Record<string, unknown>).mandatoryPresent,
    ).toBeUndefined();
  });

  test('honest 7-von-8 when doktorgrad is absent (no rounding up, §6d)', async () => {
    const token = await issueMeldebestaetigungSdJwtVc(CLAIMS_NO_DOKTORGRAD);
    const names = disclosedNames(token);
    expect(names).toHaveLength(7);
    expect(names).not.toContain('doktorgrad');

    const result = await verifyPidSdJwtVc(token, {
      trustAnchorPem: DEMO_ONCE_ONLY_CA_PEM,
    });
    const readout = toMeldebestaetigungReadout(result);
    expect(readout.totalFields).toBe(8);
    expect(readout.presentFields).toHaveLength(7);
    expect(readout.fields.doktorgrad).toBeUndefined();
  });

  test('selective disclosure: only the chosen subset stays present (Phase-2 mechanic)', async () => {
    const token = await issueMeldebestaetigungSdJwtVc(CLAIMS_FULL, {
      discloseOnly: ['anschrift', 'datum_anmeldung'],
    });
    const names = disclosedNames(token);
    expect(names.sort()).toEqual(['anschrift', 'datum_anmeldung']);

    const result = await verifyPidSdJwtVc(token, {
      trustAnchorPem: DEMO_ONCE_ONLY_CA_PEM,
    });
    const readout = toMeldebestaetigungReadout(result);
    expect(readout.verified).toBe(true);
    expect(readout.chainValid).toBe(true);
    expect(readout.presentFields.sort()).toEqual(['anschrift', 'datum_anmeldung']);
    expect(readout.totalFields).toBe(8);
  });

  test('wrong trust anchor → chainValid false but signature still verified (honest)', async () => {
    const token = await issueMeldebestaetigungSdJwtVc(CLAIMS_FULL);
    // Verify against the DEFAULT (EU reference) CA, not the Demo-CA → no chain.
    const result = await verifyPidSdJwtVc(token);
    expect(result.verified).toBe(true); // issuer signature is still valid
    expect(result.chainValid).toBe(false); // but it does NOT chain to the wrong CA
  });

  test('tampered disclosure value → verified false', async () => {
    const token = await issueMeldebestaetigungSdJwtVc(CLAIMS_FULL);
    const segs = token.split('~').filter((s) => s.length > 0);
    const [issuerJwt, ...disclosures] = segs;
    // Forge the first disclosure (re-salt + change value) — its digest no longer
    // matches any `_sd` entry → the verifier flags an unbound disclosure.
    const forged = Buffer.from(
      JSON.stringify(['forgedsalt000000', 'familienname', 'Falsch']),
      'utf8',
    ).toString('base64url');
    const tampered = [issuerJwt, forged, ...disclosures.slice(1), ''].join('~');

    const result = await verifyPidSdJwtVc(tampered, {
      trustAnchorPem: DEMO_ONCE_ONLY_CA_PEM,
    });
    expect(result.verified).toBe(false);
  });
});
