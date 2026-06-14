/**
 * Verifiable Once-Only — DEMO ISSUER PKI fixtures. SERVER-ONLY.
 *
 * `[reference-ecosystem]` + `[ZUKUNFT]`: the synthetic Demo-Issuer that signs the
 * amtliche Meldebestätigung (§ 24 Abs. 2 BMG) credential as an SD-JWT VC for the
 * "Verifiable Once-Only" feature. The FORMAT + signature verification are real
 * (same SD-JWT VC mechanism as the Tier-1 PID verifier); the AUTHORITY is Demo.
 * This is NOT a German Meldebehörde, NOT eIDAS-trusted, NOT production. That a
 * German authority issues a Meldebestätigung as a wallet credential (PuB-EAA) is
 * a future function (`[ZUKUNFT]`); the German EUDI Wallet targets 2 Jan 2027.
 *
 * These three artefacts were generated ONCE, reproducibly + offline, by
 * `scripts/once-only-gen-pki.mjs` (mirrors `scripts/eudi-fetch-pid.mjs`
 * discipline). Source-of-truth copies live under `docs/research/once-only-pki/`.
 *
 *   - {@link DEMO_ONCE_ONLY_CA_PEM}  — the self-signed Demo-CA cert. Used both as
 *     the `x5c` chain root AND injected as the verifier's `trustAnchorPem` so the
 *     round-trip re-verification (`verifyPidSdJwtVc(token, { trustAnchorPem })`)
 *     reports `chainValid: true` with ZERO changes to `verify.ts`.
 *   - {@link DEMO_ONCE_ONLY_LEAF_X5C_DER_B64} — the leaf DS cert as single-line
 *     base64 DER; this is exactly the `x5c[0]` header entry the issuer emits.
 *   - {@link DEMO_ONCE_ONLY_ISSUER_PRIVATE_KEY_PKCS8_PEM} — the leaf's private
 *     signing key (PKCS#8). Purely synthetic, signs ONLY demo credentials, ZERO
 *     real authority. Vendored server-only (the whole `src/lib/eudi` module is
 *     server-only, enforced by the server-action boundary) so issuance runs
 *     keyless / offline in a deployed Vercel build — no `.env`, no `fs`, no
 *     network (exactly like the verifier).
 *
 * ES256 / P-256 throughout (matches the verifier's `alg: 'ES256'` requirement).
 */

/** Self-signed Demo-CA (the trust anchor). Also re-exported for verifier injection. */
export const DEMO_ONCE_ONLY_CA_PEM = `-----BEGIN CERTIFICATE-----
MIICODCCAd6gAwIBAgIUfWEo0H/C+oSEO+Rv3+pwovPP6dgwCgYIKoZIzj0EAwIw
ejEsMCoGA1UEAwwjR292VGVjaC1ERSBEZW1vIE9uY2UtT25seSBDQSBbTU9DS10x
PTA7BgNVBAoMNEdvdlRlY2gtREUgVmVyd2FsdHVuZ3NkZW1vIChzeW50aGV0aWMs
IG5vIGF1dGhvcml0eSkxCzAJBgNVBAYTAkRFMB4XDTI2MDYxNDE3MDE1M1oXDTM2
MDYxMTE3MDE1M1owejEsMCoGA1UEAwwjR292VGVjaC1ERSBEZW1vIE9uY2UtT25s
eSBDQSBbTU9DS10xPTA7BgNVBAoMNEdvdlRlY2gtREUgVmVyd2FsdHVuZ3NkZW1v
IChzeW50aGV0aWMsIG5vIGF1dGhvcml0eSkxCzAJBgNVBAYTAkRFMFkwEwYHKoZI
zj0CAQYIKoZIzj0DAQcDQgAE2ZOQwxPuhaJWs00yCiMUr/BJ0e6UHb1godApcNTV
O3SBEF5tevjFvWqKqKh2wfEdQZS1kooL35iR3y9BiXqduaNCMEAwDwYDVR0TAQH/
BAUwAwEB/zAOBgNVHQ8BAf8EBAMCAQYwHQYDVR0OBBYEFGw8TNWutztZ1TKdixoN
aP3dkLZTMAoGCCqGSM49BAMCA0gAMEUCID0ES8mHJsCn5YzSl+awFkZYLKWEBEY3
3wUFAWDwOSo/AiEAokHW7T2kvXsC6h9bvgHt5E5ooxHjXOr7lp9q3puwP00=
-----END CERTIFICATE-----
`;

/** Leaf DS cert (PEM) issued by the Demo-CA above. Informational / debugging. */
export const DEMO_ONCE_ONLY_LEAF_PEM = `-----BEGIN CERTIFICATE-----
MIICbDCCAhGgAwIBAgIUXe7EExIudWVGyAt+7DTzrKqABtEwCgYIKoZIzj0EAwIw
ejEsMCoGA1UEAwwjR292VGVjaC1ERSBEZW1vIE9uY2UtT25seSBDQSBbTU9DS10x
PTA7BgNVBAoMNEdvdlRlY2gtREUgVmVyd2FsdHVuZ3NkZW1vIChzeW50aGV0aWMs
IG5vIGF1dGhvcml0eSkxCzAJBgNVBAYTAkRFMB4XDTI2MDYxNDE3MDE1NFoXDTMx
MDYxMzE3MDE1NFowejEsMCoGA1UEAwwjR292VGVjaC1ERSBEZW1vIE9uY2UtT25s
eSBEUyBbTU9DS10xPTA7BgNVBAoMNEdvdlRlY2gtREUgVmVyd2FsdHVuZ3NkZW1v
IChzeW50aGV0aWMsIG5vIGF1dGhvcml0eSkxCzAJBgNVBAYTAkRFMFkwEwYHKoZI
zj0CAQYIKoZIzj0DAQcDQgAE1x7iqnCpvXFqJbATDTuWoDNXjcUKXGwrzQ4VyTcA
H2TVTpkt2L/WISQKRL4wrGDY8PnHOyUtCOb7rI/KvMbOzaN1MHMwDAYDVR0TAQH/
BAIwADAOBgNVHQ8BAf8EBAMCB4AwEwYDVR0lBAwwCgYIKwYBBQUHAyQwHQYDVR0O
BBYEFJ1V58aX+XGGe9HlhPqDMUETSpzeMB8GA1UdIwQYMBaAFGw8TNWutztZ1TKd
ixoNaP3dkLZTMAoGCCqGSM49BAMCA0kAMEYCIQDETgggNDyT1RYHtR6aq42voxBN
s2PtBRRCzMoo++4juQIhAPFzN0gt2zGXTIGFGFsyDNLPqmDws0lKi09DAxeXoYMc
-----END CERTIFICATE-----
`;

/**
 * The leaf DS cert as a single-line base64 DER string — this is verbatim the
 * `x5c[0]` entry the issuer JWT header carries. The verifier wraps it back into
 * a PEM block (`x5cToPem`) and verifies the issuer signature against it.
 */
export const DEMO_ONCE_ONLY_LEAF_X5C_DER_B64 =
  'MIICbDCCAhGgAwIBAgIUXe7EExIudWVGyAt+7DTzrKqABtEwCgYIKoZIzj0EAwIwejEsMCoGA1UEAwwjR292VGVjaC1ERSBEZW1vIE9uY2UtT25seSBDQSBbTU9DS10xPTA7BgNVBAoMNEdvdlRlY2gtREUgVmVyd2FsdHVuZ3NkZW1vIChzeW50aGV0aWMsIG5vIGF1dGhvcml0eSkxCzAJBgNVBAYTAkRFMB4XDTI2MDYxNDE3MDE1NFoXDTMxMDYxMzE3MDE1NFowejEsMCoGA1UEAwwjR292VGVjaC1ERSBEZW1vIE9uY2UtT25seSBEUyBbTU9DS10xPTA7BgNVBAoMNEdvdlRlY2gtREUgVmVyd2FsdHVuZ3NkZW1vIChzeW50aGV0aWMsIG5vIGF1dGhvcml0eSkxCzAJBgNVBAYTAkRFMFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAE1x7iqnCpvXFqJbATDTuWoDNXjcUKXGwrzQ4VyTcAH2TVTpkt2L/WISQKRL4wrGDY8PnHOyUtCOb7rI/KvMbOzaN1MHMwDAYDVR0TAQH/BAIwADAOBgNVHQ8BAf8EBAMCB4AwEwYDVR0lBAwwCgYIKwYBBQUHAyQwHQYDVR0OBBYEFJ1V58aX+XGGe9HlhPqDMUETSpzeMB8GA1UdIwQYMBaAFGw8TNWutztZ1TKdixoNaP3dkLZTMAoGCCqGSM49BAMCA0kAMEYCIQDETgggNDyT1RYHtR6aq42voxBNs2PtBRRCzMoo++4juQIhAPFzN0gt2zGXTIGFGFsyDNLPqmDws0lKi09DAxeXoYMc';

/**
 * The leaf DS private signing key (PKCS#8 PEM). SERVER-ONLY, purely synthetic,
 * ZERO real authority — signs ONLY demo Meldebestätigung credentials. Imported
 * by `issue.ts` via `jose` `importPKCS8(..., 'ES256')`.
 */
export const DEMO_ONCE_ONLY_ISSUER_PRIVATE_KEY_PKCS8_PEM = `-----BEGIN PRIVATE KEY-----
MIGHAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBG0wawIBAQQg36DrLua+uJGIZ+fA
uExz7fXUdJ9xcHylnuGs0uFePl+hRANCAATXHuKqcKm9cWolsBMNO5agM1eNxQpc
bCvNDhXJNwAfZNVOmS3Yv9YhJApEvjCsYNjw+cc7JS0I5vusj8q8xs7N
-----END PRIVATE KEY-----
`;
