/**
 * FIT-Connect Tier-2 LIVE recon harness — SELF-CONTAINED, throwaway rig.
 *
 *   node scripts/fc-live.mjs
 *
 * Pure globalThis.fetch + jose + node:fs. Does NOT import any project TS module
 * (the JSON-import + @/ alias break plain node). Parses .env.local by hand.
 *
 * NEVER logs secret values (client secrets, JWK private fields). Prints
 * submissionId / caseId / SET / public JWK only.
 *
 * Proves each REST step live against the FITKO TEST sandbox until:
 *  - a real submissionId is returned (sender), and
 *  - the subscriber pulls + decryptCompact round-trips the metadata/Fachdaten,
 *  - and (if reachable) a signed SET appears in the event log and verifies.
 *
 * Gated behind FIT_CONNECT_LIVE=1 in .env.local. Flip it back to 0 when done.
 */

import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import * as jose from 'jose';

/* ───────────────────────── .env.local parser ───────────────────────────── */

function loadEnvLocal() {
  const raw = readFileSync(new URL('../.env.local', import.meta.url), 'utf8');
  const env = {};
  for (const line of raw.split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const eq = t.indexOf('=');
    if (eq < 0) continue;
    const k = t.slice(0, eq).trim();
    let v = t.slice(eq + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    env[k] = v;
  }
  return env;
}

const ENV = loadEnvLocal();

const BASE = {
  token: 'https://auth-testing.fit-connect.fitko.dev/token',
  submission: 'https://test.fit-connect.fitko.dev/submission-api',
};

const SCOPE_SEND = 'https://schema.fitko.de/fit-connect/oauth/scopes/send-submissions';

/* ───────────────────────── helpers ─────────────────────────────────────── */

function need(k) {
  const v = ENV[k];
  if (!v) throw new Error(`missing env ${k}`);
  return v;
}

const sha512Hex = (s) => createHash('sha512').update(s, 'utf8').digest('hex');

function deterministicUuidV4(seed) {
  const h = createHash('sha256').update(seed, 'utf8').digest('hex');
  const variant = ((parseInt(h[16], 16) & 0x3) | 0x8).toString(16);
  return [
    h.slice(0, 8),
    h.slice(8, 12),
    `4${h.slice(13, 16)}`,
    `${variant}${h.slice(17, 20)}`,
    h.slice(20, 32),
  ].join('-');
}

async function getToken(clientId, clientSecret, label) {
  const body = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: clientId,
    client_secret: clientSecret,
  });
  const res = await fetch(BASE.token, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': USER_AGENT },
    body: body.toString(),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(`token(${label}) ${res.status}: ${JSON.stringify(json)}`);
  }
  console.log(`  [token:${label}] status=${res.status} type=${json.token_type} expires=${json.expires_in} scope=${json.scope}`);
  return json.access_token;
}

const USER_AGENT = 'govtech-de-fit-connect-recon/1.0 (TEST sandbox)';

async function apiJson(method, url, token, { body, contentType } = {}) {
  const headers = { Authorization: `Bearer ${token}`, 'User-Agent': USER_AGENT };
  if (contentType) headers['Content-Type'] = contentType;
  if (body !== undefined && contentType === undefined) headers['Content-Type'] = 'application/json';
  const res = await fetch(url, {
    method,
    headers,
    body: body === undefined ? undefined : (typeof body === 'string' ? body : JSON.stringify(body)),
  });
  const text = await res.text();
  let json;
  try { json = text ? JSON.parse(text) : undefined; } catch { json = undefined; }
  return { res, json, text };
}

/* ───────────────────────── JWE helpers ─────────────────────────────────── */

// FIT-Connect publishes the wrap key with key_ops:["wrapKey"] / use:"enc",
// which jose's WebCrypto backend maps to usages that exclude "encrypt", so a
// direct importJWK → CompactEncrypt throws "usages must include encrypt".
// Strip the operation-restricting fields so the key imports with the default
// RSA-OAEP-256 encrypt/decrypt usages.
function relaxJwkForJwe(jwk) {
  const { use: _use, key_ops: _ops, ext: _ext, ...rest } = jwk;
  return rest;
}

async function encryptCompactToJwk(payload, publicJwk, kid, cty) {
  const key = await jose.importJWK(relaxJwkForJwe(publicJwk), 'RSA-OAEP-256');
  const pt = new TextEncoder().encode(JSON.stringify(payload));
  const header = { alg: 'RSA-OAEP-256', enc: 'A256GCM', kid };
  if (cty) header.cty = cty;
  const compact = await new jose.CompactEncrypt(pt)
    .setProtectedHeader(header)
    .encrypt(key);
  return compact;
}

async function decryptCompact(jwe, privateJwk) {
  const key = await jose.importJWK(relaxJwkForJwe(privateJwk), 'RSA-OAEP-256');
  const { plaintext } = await jose.compactDecrypt(jwe, key);
  return JSON.parse(new TextDecoder().decode(plaintext));
}

/* ───────────────────────── metadata builder (mirror of metadata.ts) ─────── */

function buildMetadata({ seed, leikaKey, leistungName, schemaUri, announcedAttachmentCount, datenkategorien, fachdaten }) {
  const announcedAttachmentIds = Array.from({ length: announcedAttachmentCount }, (_, i) =>
    deterministicUuidV4(`${seed}:attachment:${i}`));
  const identificationDataSetId = deterministicUuidV4(`${seed}:identification`);
  const fachdatenHash = sha512Hex(JSON.stringify(fachdaten));

  const attachments = announcedAttachmentIds.map((attachmentId, i) => ({
    hash: { type: 'sha512', content: sha512Hex(`${seed}:attachment-content:${i}`) },
    purpose: i === 0 ? 'form' : 'attachment',
    mimeType: 'application/pdf',
    attachmentId,
  }));

  const identificationContent = { levelOfAssurance: 'http://eidas.europa.eu/LoA/high', mock: true };

  const metadata = {
    $schema: 'https://schema.fitko.de/fit-connect/metadata/2.1.0/metadata.schema.json',
    publicService: { identifier: leikaKey, name: leistungName },
    contentStructure: {
      data: {
        hash: { type: 'sha512', content: fachdatenHash },
        submissionSchema: { schemaUri, mimeType: 'application/json' },
      },
      attachments,
    },
    author: {
      name: 'GovTech DE Demo',
      description: 'Speculative-design prototype — [MOCK destination], TEST environment only.',
    },
    dataSets: [
      {
        dataSetId: identificationDataSetId,
        schema: {
          schemaUri: 'https://raw.githubusercontent.com/Governikus/IdentificationReport/2.0.0/schema/identification-report.json',
          mimeType: 'application/jose',
        },
        hash: { type: 'sha512', content: sha512Hex(JSON.stringify(identificationContent)) },
        content: identificationContent,
      },
    ],
  };
  return { metadata, announcedAttachmentIds, identificationDataSetId };
}

/* ───────────────────────── main flow ───────────────────────────────────── */

async function main() {
  if (ENV.FIT_CONNECT_LIVE !== '1') {
    console.error('FIT_CONNECT_LIVE is not 1 in .env.local — aborting (live recon disabled).');
    process.exit(2);
  }

  const senderId = need('FIT_CONNECT_CLIENT_ID');
  const senderSecret = need('FIT_CONNECT_CLIENT_SECRET');
  const subId = need('FIT_CONNECT_SUBSCRIBER_CLIENT_ID');
  const subSecret = need('FIT_CONNECT_SUBSCRIBER_CLIENT_SECRET');
  const destinationId = need('FIT_CONNECT_DESTINATION_ID');
  const leikaKey = need('FIT_CONNECT_LEIKA_KEY');

  const decryptionJwk = JSON.parse(readFileSync(need('FIT_CONNECT_DECRYPTION_JWK_PATH'), 'utf8'));
  const signingJwk = JSON.parse(readFileSync(need('FIT_CONNECT_SIGNING_JWK_PATH'), 'utf8'));

  console.log('=== STEP 1: sender token ===');
  const senderToken = await getToken(senderId, senderSecret, 'sender');

  console.log('=== STEP 2: GET destination ===');
  const dest = await apiJson('GET', `${BASE.submission}/v2/destinations/${destinationId}`, senderToken);
  console.log(`  status=${dest.res.status} destStatus=${dest.json?.status} encryptionKid=${dest.json?.encryptionKid}`);
  if (!dest.res.ok) throw new Error(`get destination failed: ${dest.text}`);
  const encryptionKid = dest.json.encryptionKid;
  const ps = dest.json.publicServices?.[0];
  const schemaUri = ps?.submissionSchemas?.[0]?.schemaUri;
  const region = ps?.regions?.[0];
  console.log(`  publicService.identifier=${ps?.identifier}`);
  console.log(`  submissionSchema.schemaUri=${schemaUri}`);
  console.log(`  regions=${JSON.stringify(ps?.regions)} -> region=${region}`);
  console.log(`  metadataVersions=${JSON.stringify(dest.json.metadataVersions)}`);

  console.log('=== STEP 3: GET destination encryption key ===');
  const keyRes = await apiJson('GET', `${BASE.submission}/v2/destinations/${destinationId}/keys/${encryptionKid}`, senderToken);
  if (!keyRes.res.ok) throw new Error(`get key failed: ${keyRes.text}`);
  const destPubJwk = keyRes.json;
  console.log(`  status=${keyRes.res.status} kty=${destPubJwk.kty} alg=${destPubJwk.alg} kid=${destPubJwk.kid} n_len=${(destPubJwk.n||'').length}`);
  console.log(`  destPubJwk use=${destPubJwk.use} key_ops=${JSON.stringify(destPubJwk.key_ops)} keys=${JSON.stringify(Object.keys(destPubJwk))}`);

  console.log('=== STEP 3.5: JWE encrypt->decrypt round-trip (local sanity) ===');
  const probe = { hello: 'fit-connect', t: Date.now() };
  const probeJwe = await encryptCompactToJwk(probe, destPubJwk, encryptionKid);
  const probeBack = await decryptCompact(probeJwe, decryptionJwk);
  console.log(`  local round-trip equal=${JSON.stringify(probeBack) === JSON.stringify(probe)}`);

  console.log('=== STEP 4: build + encrypt three datasets ===');
  const seed = `fc-live:kfz-berlin-labo:${Date.now()}`;
  const datenkategorien = ['adresse', 'kfz-kennzeichen'];
  const fachdaten = { datenkategorien, mock: true, note: '[MOCK destination] TEST only' };
  const { metadata, announcedAttachmentIds } = buildMetadata({
    seed,
    leikaKey,
    leistungName: 'i-Kfz Adressänderung [MOCK]',
    schemaUri,
    announcedAttachmentCount: 1,
    datenkategorien,
    fachdaten,
  });

  // FITKO requires JWE header cty ∈ [application/xml, application/json] for
  // metadata + Fachdaten (the 422 from the finalize PUT).
  const metadataJwe = await encryptCompactToJwk(metadata, destPubJwk, encryptionKid, 'application/json');
  const dataJwe = await encryptCompactToJwk(fachdaten, destPubJwk, encryptionKid, 'application/json');
  const attachmentPlain = { attachmentId: announcedAttachmentIds[0], mock: true, content: '[MOCK] Antragsform PDF placeholder' };
  const attachmentJwe = await encryptCompactToJwk(attachmentPlain, destPubJwk, encryptionKid, 'application/json');
  console.log(`  metadataJwe segs=${metadataJwe.split('.').length} dataJwe segs=${dataJwe.split('.').length} attachmentJwe segs=${attachmentJwe.split('.').length}`);
  console.log(`  announcedAttachmentIds=${JSON.stringify(announcedAttachmentIds)}`);

  // ── Steps 5+ are NOT-yet-verified. We discover their exact shapes live below.
  // Read docs/research/fit-connect-wire-contract-2026-06-14.md if present.

  const ctx = {
    senderToken, destinationId, leikaKey, schemaUri, region, encryptionKid, destPubJwk,
    metadata, fachdaten, metadataJwe, dataJwe, attachmentJwe, announcedAttachmentIds,
    subId, subSecret, decryptionJwk, signingJwk,
  };

  await senderCreateAndSend(ctx);
}

/* ───────────────────────── steps 5–9 (create/upload/send) ──────────────── */

async function senderCreateAndSend(ctx) {
  console.log('=== STEP 5: POST /v2/submissions (create) ===');
  const createBody = {
    destinationId: ctx.destinationId,
    announcedAttachments: ctx.announcedAttachmentIds,
    publicService: { name: 'i-Kfz Adressänderung [MOCK]', identifier: ctx.leikaKey },
    region: ctx.region,
  };
  let create = await apiJson('POST', `${BASE.submission}/v2/submissions`, ctx.senderToken, { body: createBody });
  console.log(`  status=${create.res.status} body=${truncate(create.text)}`);
  if (!create.res.ok) {
    console.log('  -> create rejected; see error body above. Will adapt in next iteration.');
    return;
  }
  const submissionId = create.json.submissionId;
  const caseId = create.json.caseId;
  console.log(`  >>> submissionId=${submissionId} caseId=${caseId}`);

  console.log('=== STEP 6: PUT attachments ===');
  for (const aid of ctx.announcedAttachmentIds) {
    const put = await apiJson('PUT',
      `${BASE.submission}/v2/submissions/${submissionId}/attachments/${aid}`,
      ctx.senderToken,
      { body: ctx.attachmentJwe, contentType: 'application/jose' });
    console.log(`  attachment ${aid}: status=${put.res.status} body=${truncate(put.text)}`);
    if (!put.res.ok) { console.log('  -> attachment PUT rejected'); return; }
  }

  console.log('=== STEP 7: PUT /v2/submissions/{id} (finalize/send) ===');
  const sendBody = { encryptedMetadata: ctx.metadataJwe, encryptedData: ctx.dataJwe };
  const send = await apiJson('PUT', `${BASE.submission}/v2/submissions/${submissionId}`, ctx.senderToken, { body: sendBody });
  console.log(`  status=${send.res.status} body=${truncate(send.text)}`);
  if (!send.res.ok) { console.log('  -> finalize PUT rejected'); return; }
  console.log(`  >>> SUBMITTED submissionId=${submissionId} caseId=${caseId}`);

  console.log('=== STEP 7b: GET /v2/cases/{caseId}/events (sender reads its own case) ===');
  const ev = await apiJson('GET', `${BASE.submission}/v2/cases/${caseId}/events`, ctx.senderToken);
  console.log(`  status=${ev.res.status} body=${truncate(ev.text, 500)}`);
  if (ev.res.ok) {
    const log = ev.json?.eventLog ?? [];
    console.log(`  eventLog count=${log.length}`);
    // Verify each SET's JWS signature against the delivery-service JWKS.
    const jwks = jose.createRemoteJWKSet(
      new URL(`${BASE.submission}/.well-known/jwks.json`),
    );
    for (let i = 0; i < log.length; i++) {
      try {
        const decoded = jose.decodeProtectedHeader(log[i]);
        let verified = false;
        try {
          await jose.jwtVerify(log[i], jwks, { algorithms: ['PS512'] });
          verified = true;
        } catch (ve) {
          console.log(`    SET[${i}] verify error: ${redact(String(ve?.message || ve))}`);
        }
        const claims = jose.decodeJwt(log[i]);
        console.log(`    SET[${i}] typ=${decoded.typ} alg=${decoded.alg} iss=${claims.iss} events=${JSON.stringify(Object.keys(claims.events || {}))} SIGNATURE_VERIFIED=${verified}`);
      } catch (e) { console.log(`    SET[${i}] decode failed: ${redact(String(e))}`); }
    }
  }

  await subscriberReceive({ ...ctx, submissionId, caseId });
}

/* ───────────────────────── steps 10–15 (subscriber) ───────────────────── */

async function subscriberReceive(ctx) {
  console.log('=== STEP 8: subscriber token ===');
  let subToken;
  try {
    subToken = await getToken(ctx.subId, ctx.subSecret, 'subscriber');
  } catch (e) {
    console.log(`  subscriber token FAILED: ${redact(String(e))}`);
    return;
  }

  console.log('=== STEP 9: list submissions (poll, retry until ours appears) ===');
  const listUrl = `${BASE.submission}/v2/submissions?destinationId=${ctx.destinationId}&offset=0&limit=50`;
  let found = false;
  for (let attempt = 1; attempt <= 8 && !found; attempt++) {
    const list = await apiJson('GET', listUrl, subToken);
    const subs = list.json?.submissions ?? [];
    const mine = subs.find((s) => s.submissionId === ctx.submissionId);
    console.log(`  attempt ${attempt}: status=${list.res.status} totalCount=${list.json?.totalCount} mine=${!!mine}`);
    if (!list.res.ok) { console.log(`  body=${truncate(list.text, 300)}`); break; }
    if (mine) { found = true; break; }
    await sleep(2000);
  }
  if (!found) console.log('  -> our submission did NOT appear in the poll within budget (state/propagation).');

  console.log('=== STEP 10: GET submission ===');
  const getSub = await apiJson('GET', `${BASE.submission}/v2/submissions/${ctx.submissionId}`, subToken);
  console.log(`  status=${getSub.res.status} body=${truncate(getSub.text, 200)}`);
  if (!getSub.res.ok) { console.log('  -> get submission rejected'); return; }

  console.log('=== STEP 11: decrypt round-trip ===');
  try {
    const meta = await decryptCompact(getSub.json.encryptedMetadata, ctx.decryptionJwk);
    const data = await decryptCompact(getSub.json.encryptedData, ctx.decryptionJwk);
    const metaEq = JSON.stringify(meta) === JSON.stringify(ctx.metadata);
    const dataEq = JSON.stringify(data) === JSON.stringify(ctx.fachdaten);
    console.log(`  metadata round-trip equal=${metaEq} fachdaten round-trip equal=${dataEq}`);
  } catch (e) {
    console.log(`  decrypt failed: ${redact(String(e))}`);
  }
}

/* ───────────────────────── utils ───────────────────────────────────────── */

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function truncate(s, n = 600) {
  if (!s) return s;
  return s.length <= n ? s : `${s.slice(0, n)}…[+${s.length - n}]`;
}

// Defensive: never let a thrown error string carry a secret to the log.
function redact(s) {
  let out = s;
  for (const k of ['FIT_CONNECT_CLIENT_SECRET', 'FIT_CONNECT_SUBSCRIBER_CLIENT_SECRET']) {
    const v = ENV[k];
    if (v) out = out.split(v).join('***');
  }
  return out;
}

main().catch((e) => {
  console.error('FATAL:', redact(String(e?.stack || e)));
  process.exit(1);
});
