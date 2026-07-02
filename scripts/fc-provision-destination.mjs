// FIT-Connect TEST — provision our own Zustellpunkt (destination) via the
// Destination API, with locally generated keys. THROWAWAY-grade rig, but kept
// in scripts/ because it doubles as the "bring your own test client" story:
// anyone with a free TEST subscriber client (scope: manage-destinations) can
// run this and get a destination they fully control.
//
//   node scripts/fc-provision-destination.mjs           # refuses to overwrite keys
//   node scripts/fc-provision-destination.mjs --force   # rotate keys + new destination
//
// What it does:
//   1. reads subscriber creds from .env.local (never printed)
//   2. generates 2 self-signed RSA-4096 keypairs via openssl
//      (encryption: RSA-OAEP-256/wrapKey · signing: PS512/verify — TEST accepts
//      self-generated certs, see docs.fitko.de "Betriebs-Umgebungen")
//   3. POST /v1/destinations with the PUBLIC JWKs (incl. x5c)
//   4. stores the PRIVATE JWKs under .secrets/fit-connect/ (gitignored)
//   5. prints the .env.local lines to adopt the new destination
//
// NEVER prints secrets: only destinationId, kids, HTTP statuses.

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createPublicKey, createPrivateKey, randomUUID } from 'node:crypto';
import { join } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;
const SECRETS_DIR = join(ROOT, '.secrets', 'fit-connect');
const FORCE = process.argv.includes('--force');

/* ── .env.local ──────────────────────────────────────────────────────────── */
function loadEnvLocal() {
  const raw = readFileSync(join(ROOT, '.env.local'), 'utf8');
  const env = {};
  for (const line of raw.split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const eq = t.indexOf('=');
    if (eq < 0) continue;
    let v = t.slice(eq + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    env[t.slice(0, eq).trim()] = v;
  }
  return env;
}
const ENV = loadEnvLocal();
const TOKEN_URL = 'https://auth-testing.fit-connect.fitko.dev/token';
const DEST_API = 'https://test.fit-connect.fitko.dev/destination-api';

/* ── key generation (openssl) ────────────────────────────────────────────── */
function genKeyPairWithCert(cn, tmpPrefix) {
  const keyPath = join(SECRETS_DIR, `${tmpPrefix}.key.pem`);
  const crtPath = join(SECRETS_DIR, `${tmpPrefix}.crt.pem`);
  execFileSync('openssl', ['req', '-x509', '-newkey', 'rsa:4096', '-nodes', '-sha256',
    '-keyout', keyPath, '-out', crtPath, '-days', '365',
    '-subj', `/CN=${cn}/O=GovTech-DE Concept Demo [MOCK]/C=DE`], { stdio: 'pipe' });
  const keyPem = readFileSync(keyPath, 'utf8');
  const crtPem = readFileSync(crtPath, 'utf8');
  const derB64 = crtPem.replace(/-----(BEGIN|END) CERTIFICATE-----/g, '').replace(/\s+/g, '');
  const pubJwk = createPublicKey(keyPem).export({ format: 'jwk' });
  const privJwk = createPrivateKey(keyPem).export({ format: 'jwk' });
  return { pubJwk, privJwk, x5c: [derB64] };
}

async function main() {
  const clientId = ENV.FIT_CONNECT_SUBSCRIBER_CLIENT_ID;
  const clientSecret = ENV.FIT_CONNECT_SUBSCRIBER_CLIENT_SECRET;
  const leikaKey = ENV.FIT_CONNECT_LEIKA_KEY || 'urn:de:fim:leika:leistung:512431';
  if (!clientId || !clientSecret) throw new Error('subscriber creds missing in .env.local');

  const encPrivPath = join(SECRETS_DIR, 'privateKey_decryption.jwk.json');
  const sigPrivPath = join(SECRETS_DIR, 'privateKey_signing.jwk.json');
  if (!FORCE && (existsSync(encPrivPath) || existsSync(sigPrivPath))) {
    throw new Error(`.secrets/fit-connect keys already exist — rerun with --force to rotate`);
  }
  mkdirSync(SECRETS_DIR, { recursive: true });

  // 1) token (subscriber → manage-destinations)
  const tRes = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'client_credentials', client_id: clientId, client_secret: clientSecret }),
  });
  const tJson = await tRes.json();
  if (!tRes.ok) throw new Error(`token: HTTP ${tRes.status} ${tJson.error_description || tJson.error || ''}`);
  console.log(`token: OK scope=${tJson.scope}`);
  const bearer = { Authorization: `Bearer ${tJson.access_token}`, 'Content-Type': 'application/json' };

  // 2) keys
  const encKid = `${randomUUID()}-wrapKey`;
  const sigKid = `${randomUUID()}-sigKey`;
  const enc = genKeyPairWithCert('GovTech-DE Demo Zustellpunkt Encryption TEST', 'enc');
  const sig = genKeyPairWithCert('GovTech-DE Demo Zustellpunkt Signing TEST', 'sig');
  const encryptionPublicKey = { ...enc.pubJwk, kid: encKid, alg: 'RSA-OAEP-256', use: 'enc', key_ops: ['wrapKey'], x5c: enc.x5c };
  const signingPublicKey = { ...sig.pubJwk, kid: sigKid, alg: 'PS512', use: 'sig', key_ops: ['verify'], x5c: sig.x5c };

  // 3) create destination
  const body = {
    name: 'GovTech-DE Demo Zustellpunkt (Linux host) [MOCK]',
    contactInformation: {
      legalName: 'GovTech-DE Concept Demo [MOCK] — kein Echtbetrieb',
      email: 'demo@example.org',
    },
    services: [{
      identifier: leikaKey,
      submissionSchemas: [{
        schemaUri: 'https://schema.example/govtech-de-demo/fachdaten/1.0.0/schema.json',
        mimeType: 'application/json',
      }],
      regions: ['DE000000000000'],
    }],
    encryptionKid: encKid,
    encryptionPublicKey,
    signingPublicKey,
    metadataVersions: ['2.1.0'],
  };
  const cRes = await fetch(`${DEST_API}/v1/destinations`, { method: 'POST', headers: bearer, body: JSON.stringify(body) });
  const cJson = await cRes.json().catch(() => ({}));
  if (!cRes.ok) {
    console.error(`create destination: HTTP ${cRes.status}`);
    console.error(JSON.stringify(cJson, null, 2));
    process.exit(1);
  }
  const destinationId = cJson.destinationId || cJson.id;
  console.log(`create destination: HTTP ${cRes.status} destinationId=${destinationId} status=${cJson.status}`);

  // 4) activate if needed
  if (cJson.status && cJson.status !== 'active') {
    const aRes = await fetch(`${DEST_API}/v1/destinations/${destinationId}`, {
      method: 'PATCH',
      headers: { ...bearer, 'Content-Type': 'application/merge-patch+json' },
      body: JSON.stringify({ status: 'active' }),
    });
    console.log(`activate: HTTP ${aRes.status}`);
    if (!aRes.ok) console.error(JSON.stringify(await aRes.json().catch(() => ({})), null, 2));
  }

  // 5) persist private JWKs (kid/alg attached so the subscriber code can select by kid)
  writeFileSync(encPrivPath, JSON.stringify({ ...enc.privJwk, kid: encKid, alg: 'RSA-OAEP-256', key_ops: ['unwrapKey', 'decrypt'] }, null, 2));
  writeFileSync(sigPrivPath, JSON.stringify({ ...sig.privJwk, kid: sigKid, alg: 'PS512', key_ops: ['sign'] }, null, 2));
  console.log(`private JWKs written under .secrets/fit-connect/ (gitignored)`);

  console.log('\nAdopt in .env.local:');
  console.log(`FIT_CONNECT_DESTINATION_ID=${destinationId}`);
  console.log(`FIT_CONNECT_DECRYPTION_JWK_PATH=.secrets/fit-connect/privateKey_decryption.jwk.json`);
  console.log(`FIT_CONNECT_SIGNING_JWK_PATH=.secrets/fit-connect/privateKey_signing.jwk.json`);
}

main().catch((e) => { console.error(e.message); process.exit(1); });
