#!/usr/bin/env node
/**
 * Provision the self-signed DEMO verifier signing key for the EUDI OpenID4VP
 * Protokoll-Modus x5c-signed request mode (Spec `protokoll-modus.md` §6.4).
 *
 * SANDBOX ONLY — this is a self-signed DEMO trust anchor, "nicht produktiv".
 * It is NOT eIDAS, NOT a German-state RP certificate. Unsigned mode needs no
 * cert (works with just `EUDI_VP_LIVE=1` + a tunnel URL); this key only enables
 * the additional x5c-signed mode.
 *
 * Writes a single JWK file carrying the private key AND its `x5c` chain (so one
 * env var — `EUDI_VP_SIGNING_JWK_PATH` — points the verifier at both). The file
 * stays OUTSIDE the repo under `.secrets/` (gitignored).
 *
 * Usage:
 *   node scripts/eudi-vp-provision-cert.mjs
 * Then in .env.local:
 *   EUDI_VP_SIGNING_JWK_PATH=/abs/path/.secrets/eudi/vp-verifier-key.jwk.json
 */
import { execSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { exportJWK, importPKCS8 } from 'jose';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outPath = join(repoRoot, '.secrets', 'eudi', 'vp-verifier-key.jwk.json');
mkdirSync(dirname(outPath), { recursive: true });

const tmp = mkdtempSync(join(tmpdir(), 'vp-verifier-cert-'));
try {
  execSync(`openssl ecparam -genkey -name prime256v1 -noout -out ${tmp}/key.pem`, { stdio: 'ignore' });
  execSync(
    `openssl req -new -x509 -key ${tmp}/key.pem -out ${tmp}/cert.pem -days 3650 ` +
      `-subj "/CN=govtech-de-sandbox-verifier/O=GovTech DE (Sandbox)/C=DE" ` +
      `-addext "subjectAltName=DNS:govtech-de.sandbox.invalid"`,
    { stdio: 'ignore' },
  );
  execSync(`openssl pkcs8 -topk8 -nocrypt -in ${tmp}/key.pem -out ${tmp}/key.pkcs8.pem`, { stdio: 'ignore' });

  const key = await importPKCS8(readFileSync(`${tmp}/key.pkcs8.pem`, 'utf8'), 'ES256', { extractable: true });
  const jwk = await exportJWK(key);
  const der = readFileSync(`${tmp}/cert.pem`, 'utf8').replace(
    /-----BEGIN CERTIFICATE-----|-----END CERTIFICATE-----|\s/g,
    '',
  );
  jwk.alg = 'ES256';
  jwk.use = 'sig';
  jwk.x5c = [der];

  writeFileSync(outPath, JSON.stringify(jwk, null, 2));
  console.log(`Wrote demo verifier signing JWK → ${outPath}`);
  console.log(`  kty=${jwk.kty} crv=${jwk.crv}  (self-signed sandbox cert, NOT production/eIDAS)`);
  console.log('Set in .env.local:');
  console.log(`  EUDI_VP_SIGNING_JWK_PATH=${outPath}`);
} finally {
  rmSync(tmp, { recursive: true, force: true });
}
