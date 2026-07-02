#!/usr/bin/env node
/**
 * Headless EUDI wallet driver — the P2 "real presentation over the wire" proof
 * WITHOUT a phone (Spec `protokoll-modus.md` §6.6).
 *
 * Acts as the wallet against OUR OpenID4VP verifier (`src/lib/eudi/vp/*` +
 * `/api/eudi/vp/*`): creates a session, resolves the authorization request with
 * `@openid4vc/openid4vp`'s `Openid4vpClient`, builds a `vp_token` from the
 * persona PID fixture + a KB-JWT signed with the persona holder key, submits it
 * via `direct_post`, and prints the resulting verified session status.
 *
 * SANDBOX ONLY. The PID is EU reference/development ecosystem (issuer.eudiw.dev),
 * NOT German-state, NOT eIDAS, NOT production. Holder keys live under `.secrets/`
 * (gitignored) and never leave this process except as a KB-JWT signature.
 *
 * Usage:
 *   node scripts/eudi-present-pid.mjs --persona anna-petrov --create-url http://localhost:3000/api/eudi/vp/create-session
 *   node scripts/eudi-present-pid.mjs --persona markus-schmidt --openid4vp 'openid4vp://?client_id=...&request_uri=...'
 *   optional: --mode unsigned|x5c-signed   (default: unsigned)
 */
import { createHash, randomBytes } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { X509Certificate } from 'node:crypto';
import { SignJWT, exportJWK, importJWK, importX509, jwtVerify } from 'jose';
import { Openid4vpClient } from '@openid4vc/openid4vp';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/* ───────────────────────── args ─────────────────────────────────────────── */

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (next && !next.startsWith('--')) {
        args[key] = next;
        i += 1;
      } else {
        args[key] = true;
      }
    }
  }
  return args;
}

const args = parseArgs(process.argv.slice(2));
const persona = args.persona;
const mode = args.mode === 'x5c-signed' ? 'x5c-signed' : 'unsigned';

if (!persona) {
  console.error('Missing --persona <anna-petrov|markus-schmidt|mehmet-yildiz|erika>');
  process.exit(2);
}
if (!args['create-url'] && !args.openid4vp) {
  console.error('Provide either --create-url <…/api/eudi/vp/create-session> or --openid4vp <uri>');
  process.exit(2);
}

/* ───────────────────────── persona material ─────────────────────────────── */

function readPersonaPid(id) {
  const path = resolve(repoRoot, 'docs/research/eudi-fixtures', `pid-${id}.txt`);
  return readFileSync(path, 'utf8').trim();
}

function readHolderKey(id) {
  const path = resolve(repoRoot, '.secrets/eudi', `holder-key-${id}.jwk.json`);
  return JSON.parse(readFileSync(path, 'utf8'));
}

const pid = readPersonaPid(persona);
const holderJwk = readHolderKey(persona);

/* ───────────────────────── jose-backed wallet callbacks ─────────────────── */

function nodeHashName(alg) {
  if (alg === 'sha-384') return 'sha384';
  if (alg === 'sha-512') return 'sha512';
  return 'sha256';
}

function x5cToPem(der) {
  const lines = der.match(/.{1,64}/g)?.join('\n') ?? der;
  return `-----BEGIN CERTIFICATE-----\n${lines}\n-----END CERTIFICATE-----\n`;
}

const holderPrivateKey = await importJWK(holderJwk, 'ES256');
const holderPublicJwk = await exportJWK(await importJWK({ ...holderJwk, d: undefined }, 'ES256'));

const callbacks = {
  fetch: (...a) => fetch(...a),
  hash: (data, alg) => new Uint8Array(createHash(nodeHashName(alg)).update(data).digest()),
  generateRandom: (len) => new Uint8Array(randomBytes(len)),
  signJwt: async (signer, jwt) => {
    // Only reached if the wallet has to sign (e.g. JARM). Sign with the holder key.
    const compact = await new SignJWT(jwt.payload).setProtectedHeader(jwt.header).sign(holderPrivateKey);
    return { jwt: compact, signerJwk: holderPublicJwk };
  },
  verifyJwt: async (signer, jwt) => {
    try {
      let key;
      if (signer.method === 'x5c' && Array.isArray(signer.x5c)) {
        key = await importX509(x5cToPem(signer.x5c[0]), signer.alg ?? 'ES256');
      } else if (signer.publicJwk) {
        key = await importJWK(signer.publicJwk, signer.alg ?? 'ES256');
      } else {
        return { verified: false };
      }
      await jwtVerify(jwt.compact, key, { algorithms: [signer.alg ?? 'ES256'] });
      return { verified: true, signerJwk: signer.publicJwk };
    } catch {
      return { verified: false };
    }
  },
  decryptJwe: async () => ({ decrypted: false }),
  encryptJwe: async () => {
    throw new Error('encryptJwe not supported by the headless driver');
  },
  getX509CertificateMetadata: (der) => {
    try {
      const cert = new X509Certificate(x5cToPem(der));
      const sans = (cert.subjectAltName ?? '')
        .split(',')
        .map((s) => s.trim());
      return {
        sanDnsNames: sans.filter((s) => s.startsWith('DNS:')).map((s) => s.slice(4)),
        sanUriNames: sans.filter((s) => s.startsWith('URI:')).map((s) => s.slice(4)),
      };
    } catch {
      return { sanDnsNames: [], sanUriNames: [] };
    }
  },
};

/* ───────────────────────── SD-JWT VC presentation build ──────────────────── */

const REQUESTED_CLAIMS = new Set(['given_name', 'family_name', 'birthdate']);

function b64urlJson(seg) {
  return JSON.parse(Buffer.from(seg, 'base64url').toString('utf8'));
}

/** Select only the requested object-property disclosures + rebuild the base. */
function buildPresentationBase(pidToken) {
  const segments = pidToken.split('~').filter((s) => s.length > 0);
  const issuerJwt = segments[0];
  const rest = segments.slice(1).filter((s) => s.split('.').length !== 3); // drop any KB-JWT
  const selected = rest.filter((raw) => {
    try {
      const arr = b64urlJson(raw);
      return arr.length === 3 && REQUESTED_CLAIMS.has(String(arr[1]));
    } catch {
      return false;
    }
  });
  // SD-JWT presentation base: <issuer>~<disc>~…~  (trailing ~ before KB-JWT)
  return `${[issuerJwt, ...selected].join('~')}~`;
}

async function buildPresentation(pidToken, { audience, nonce }) {
  const base = buildPresentationBase(pidToken);
  const sdHash = createHash('sha256').update(base, 'ascii').digest('base64url');
  const kbJwt = await new SignJWT({ nonce, sd_hash: sdHash })
    .setProtectedHeader({ alg: 'ES256', typ: 'kb+jwt' })
    .setAudience(audience)
    .setIssuedAt()
    .sign(holderPrivateKey);
  return base + kbJwt;
}

/* ───────────────────────── flow ─────────────────────────────────────────── */

async function getOpenid4vpUri() {
  if (args.openid4vp) return String(args.openid4vp);
  const res = await fetch(String(args['create-url']), {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ requestMode: mode }),
  });
  if (!res.ok) {
    throw new Error(`create-session failed: HTTP ${res.status} ${await res.text()}`);
  }
  const body = await res.json();
  console.log(`• create-session → sessionId=${body.sessionId} (mode=${mode})`);
  return body.openid4vpUri;
}

function statusUrlFromRequestUri(requestUri) {
  // …/api/eudi/vp/request/<id>  →  …/api/eudi/vp/status/<id>
  return requestUri.replace('/request/', '/status/');
}

async function main() {
  const uri = await getOpenid4vpUri();
  const url = new URL(uri);
  const requestUri = url.searchParams.get('request_uri');
  const clientIdFromUri = url.searchParams.get('client_id');
  if (!requestUri) throw new Error('openid4vp URI has no request_uri');
  console.log(`• openid4vp:// → request_uri=${requestUri}`);

  // Fetch the authorization request object (unsigned JSON or signed JAR).
  const reqRes = await fetch(requestUri);
  if (!reqRes.ok) throw new Error(`request fetch failed: HTTP ${reqRes.status}`);
  const reqText = await reqRes.text();
  const reqContentType = reqRes.headers.get('content-type') ?? '';

  const client = new Openid4vpClient({ callbacks });

  let resolveInput;
  if (reqContentType.includes('json') || reqText.trimStart().startsWith('{')) {
    resolveInput = { authorizationRequestPayload: JSON.parse(reqText) };
  } else {
    resolveInput = { authorizationRequestPayload: { request: reqText, client_id: clientIdFromUri } };
  }

  const resolved = await client.resolveOpenId4vpAuthorizationRequest({
    ...resolveInput,
    responseMode: { type: 'direct_post' },
  });

  const requestPayload = resolved.authorizationRequestPayload;
  const nonce = requestPayload.nonce;
  const audience = requestPayload.client_id ?? clientIdFromUri;
  const responseUri = requestPayload.response_uri;
  const credId = resolved.dcql?.query?.credentials?.[0]?.id ?? 'pid';
  console.log(`• resolved request: nonce=${nonce?.slice(0, 8)}… client_id=${audience}`);

  const presentation = await buildPresentation(pid, { audience, nonce });
  const vpToken = { [credId]: presentation };
  console.log(`• built vp_token (credId=${credId}) with KB-JWT (aud=${audience})`);

  const created = await client.createOpenid4vpAuthorizationResponse({
    authorizationRequestPayload: requestPayload,
    authorizationResponsePayload: { vp_token: vpToken },
  });

  let submitOk = false;
  try {
    const submit = await client.submitOpenid4vpAuthorizationResponse({
      authorizationRequestPayload: { response_uri: responseUri },
      authorizationResponsePayload: created.authorizationResponsePayload,
    });
    submitOk = submit.response?.ok ?? false;
    console.log(`• direct_post via oid4vc-ts → HTTP ${submit.response?.status}`);
  } catch (err) {
    console.warn(`• oid4vc-ts submit threw (${err?.message ?? err}); manual direct_post fallback`);
  }

  if (!submitOk) {
    // Manual form-encoded direct_post fallback (same wire, no library helper).
    const form = new URLSearchParams();
    form.set('vp_token', JSON.stringify(created.authorizationResponsePayload.vp_token ?? vpToken));
    const res = await fetch(responseUri, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: form.toString(),
    });
    console.log(`• direct_post (manual) → HTTP ${res.status} ${await res.text()}`);
  }

  // Poll status.
  const statusUrl = statusUrlFromRequestUri(requestUri);
  let final;
  for (let i = 0; i < 10; i += 1) {
    const s = await fetch(statusUrl);
    final = await s.json();
    if (final.state === 'verified' || final.state === 'error' || final.state === 'expired') break;
    await new Promise((r) => setTimeout(r, 500));
  }

  console.log('\n─────────────────────────────────────────────');
  console.log(`RESULT  state=${final?.state}  sandbox=${final?.sandbox}`);
  if (final?.state === 'verified') {
    console.log('Verified claims:');
    console.log(`  given_name  = ${final.claims?.given_name}`);
    console.log(`  family_name = ${final.claims?.family_name}`);
    console.log(`  birthdate   = ${final.claims?.birthdate}`);
  }
  console.log('─────────────────────────────────────────────');
  process.exit(final?.state === 'verified' ? 0 : 1);
}

main().catch((err) => {
  console.error('driver error:', err?.message ?? err);
  process.exit(1);
});
