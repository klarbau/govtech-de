/**
 * EUDI OpenID4VP verifier — Key-Binding JWT verification (`src/lib/eudi/vp/kb-jwt.ts`).
 *
 * Gates (Spec §12): a valid KB-JWT (signed by the credential's `cnf.jwk`, correct
 * aud/nonce/sd_hash/iat) verifies; every tampered dimension fails with an honest
 * reason. Self-contained: the test mints its own EC holder key + a synthetic
 * issuer credential carrying that key in `cnf.jwk` — no `.secrets/` dependency,
 * so it runs in CI. (The kb-jwt module reads `cnf.jwk`/`_sd_alg` from the issuer
 * payload but does NOT verify the issuer signature — that is verify.ts's job.)
 */
import { createHash } from 'node:crypto';

import { SignJWT, exportJWK, generateKeyPair, type JWK, type CryptoKey } from 'jose';
import { beforeAll, describe, expect, test } from 'vitest';

import { verifyKbJwt } from '@/lib/eudi/vp/kb-jwt';

const AUD = 'redirect_uri:https://example.test/api/eudi/vp/response/s1';
const NONCE = 'test-nonce-abc123';

function b64urlJson(obj: unknown): string {
  return Buffer.from(JSON.stringify(obj)).toString('base64url');
}

function sha256Base64url(input: string): string {
  return createHash('sha256').update(input, 'ascii').digest('base64url');
}

/** Build a synthetic issuer-signed JWT carrying `cnf.jwk` (signature is a stub). */
function makeIssuerJwt(cnfJwk: JWK, extra: Record<string, unknown> = {}): string {
  const header = b64urlJson({ alg: 'ES256', typ: 'dc+sd-jwt' });
  const payload = b64urlJson({
    vct: 'urn:eudi:pid:1',
    iss: 'https://issuer.test',
    cnf: { jwk: cnfJwk },
    ...extra,
  });
  return `${header}.${payload}.c3R1Yg`; // "stub" signature — not checked here
}

/** Sign a KB-JWT over the presentation base with the holder private key. */
async function makeKbJwt(
  privateKey: CryptoKey,
  presentationBase: string,
  overrides: {
    aud?: string;
    nonce?: string;
    sdHash?: string;
    iat?: number;
    typ?: string;
  } = {},
): Promise<string> {
  const sdHash = overrides.sdHash ?? sha256Base64url(presentationBase);
  const builder = new SignJWT({
    nonce: overrides.nonce ?? NONCE,
    sd_hash: sdHash,
  })
    .setProtectedHeader({ alg: 'ES256', typ: overrides.typ ?? 'kb+jwt' })
    .setAudience(overrides.aud ?? AUD)
    .setIssuedAt(overrides.iat);
  return builder.sign(privateKey);
}

let holderPublicJwk: JWK;
let holderPrivateKey: CryptoKey;
let presentationBase: string;

beforeAll(async () => {
  const { publicKey, privateKey } = await generateKeyPair('ES256', { extractable: true });
  holderPublicJwk = await exportJWK(publicKey);
  holderPrivateKey = privateKey as CryptoKey;
  const issuerJwt = makeIssuerJwt(holderPublicJwk);
  // presentation base = issuerJwt ~ disclosure1 ~ disclosure2 ~
  presentationBase = `${issuerJwt}~${b64urlJson(['salt', 'given_name', 'Anna'])}~${b64urlJson(['salt2', 'family_name', 'Petrov'])}~`;
});

describe('verifyKbJwt — happy path', () => {
  test('a correctly-signed, correctly-bound KB-JWT verifies', async () => {
    const kb = await makeKbJwt(holderPrivateKey, presentationBase);
    const res = await verifyKbJwt({
      presentation: presentationBase + kb,
      expectedAudience: AUD,
      expectedNonce: NONCE,
    });
    expect(res.verified).toBe(true);
    expect(res.reason).toBeUndefined();
  });
});

describe('verifyKbJwt — tamper detection', () => {
  test('missing KB-JWT (bare credential) → kb-jwt-missing', async () => {
    const res = await verifyKbJwt({
      presentation: presentationBase, // trailing `~`, no KB-JWT
      expectedAudience: AUD,
      expectedNonce: NONCE,
    });
    expect(res.verified).toBe(false);
    expect(res.reason).toBe('kb-jwt-missing');
  });

  test('wrong nonce → nonce-mismatch', async () => {
    const kb = await makeKbJwt(holderPrivateKey, presentationBase, { nonce: 'other' });
    const res = await verifyKbJwt({
      presentation: presentationBase + kb,
      expectedAudience: AUD,
      expectedNonce: NONCE,
    });
    expect(res.verified).toBe(false);
    expect(res.reason).toBe('nonce-mismatch');
  });

  test('wrong audience → signature/aud failure', async () => {
    const kb = await makeKbJwt(holderPrivateKey, presentationBase, { aud: 'redirect_uri:https://evil.test' });
    const res = await verifyKbJwt({
      presentation: presentationBase + kb,
      expectedAudience: AUD,
      expectedNonce: NONCE,
    });
    expect(res.verified).toBe(false);
    expect(res.reason).toMatch(/^kb-jwt-signature-invalid/);
  });

  test('sd_hash not matching the presented disclosures → sd-hash-mismatch', async () => {
    // Correct signature, but sd_hash points at a different disclosure set.
    const kb = await makeKbJwt(holderPrivateKey, presentationBase, {
      sdHash: sha256Base64url('tampered-content'),
    });
    const res = await verifyKbJwt({
      presentation: presentationBase + kb,
      expectedAudience: AUD,
      expectedNonce: NONCE,
    });
    expect(res.verified).toBe(false);
    expect(res.reason).toBe('sd-hash-mismatch');
  });

  test('a swapped disclosure invalidates the binding (sd_hash no longer matches)', async () => {
    const kb = await makeKbJwt(holderPrivateKey, presentationBase);
    // Swap one disclosure for a different-value one AFTER the KB-JWT was bound
    // to the original base → the recomputed sd_hash no longer matches.
    const tamperedBase = presentationBase.replace(
      b64urlJson(['salt2', 'family_name', 'Petrov']),
      b64urlJson(['salt2', 'family_name', 'ATTACKER']),
    );
    const swapped = tamperedBase + kb;
    const res = await verifyKbJwt({
      presentation: swapped,
      expectedAudience: AUD,
      expectedNonce: NONCE,
    });
    expect(res.verified).toBe(false);
    expect(res.reason).toBe('sd-hash-mismatch');
  });

  test('KB-JWT signed by a foreign key → signature-invalid', async () => {
    const { privateKey: foreign } = await generateKeyPair('ES256', { extractable: true });
    const kb = await makeKbJwt(foreign as CryptoKey, presentationBase);
    const res = await verifyKbJwt({
      presentation: presentationBase + kb,
      expectedAudience: AUD,
      expectedNonce: NONCE,
    });
    expect(res.verified).toBe(false);
    expect(res.reason).toMatch(/^kb-jwt-signature-invalid/);
  });

  test('stale iat (older than the freshness window) → kb-jwt-stale', async () => {
    const kb = await makeKbJwt(holderPrivateKey, presentationBase, {
      iat: Math.floor(Date.now() / 1000) - 5000,
    });
    const res = await verifyKbJwt({
      presentation: presentationBase + kb,
      expectedAudience: AUD,
      expectedNonce: NONCE,
      maxAgeSeconds: 600,
    });
    expect(res.verified).toBe(false);
    expect(res.reason).toBe('kb-jwt-stale');
  });

  test('wrong typ header → signature/typ failure', async () => {
    const kb = await makeKbJwt(holderPrivateKey, presentationBase, { typ: 'JWT' });
    const res = await verifyKbJwt({
      presentation: presentationBase + kb,
      expectedAudience: AUD,
      expectedNonce: NONCE,
    });
    expect(res.verified).toBe(false);
    expect(res.reason).toMatch(/^kb-jwt-signature-invalid/);
  });

  test('credential without cnf.jwk → cnf-jwk-missing', async () => {
    const issuerNoCnf = `${b64urlJson({ alg: 'ES256', typ: 'dc+sd-jwt' })}.${b64urlJson({ vct: 'urn:eudi:pid:1' })}.c3R1Yg`;
    const base = `${issuerNoCnf}~`;
    const kb = await makeKbJwt(holderPrivateKey, base);
    const res = await verifyKbJwt({
      presentation: base + kb,
      expectedAudience: AUD,
      expectedNonce: NONCE,
    });
    expect(res.verified).toBe(false);
    expect(res.reason).toBe('cnf-jwk-missing');
  });
});
