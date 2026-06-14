/**
 * FIT-Connect Tier-2 — live TEST round-trip via DIRECT REST + `jose` (Spec
 * § 1 decision, § 6). SERVER-ONLY. Reached ONLY behind `FIT_CONNECT_LIVE=1`
 * + creds, from `sendLiveSubmission`'s dynamic `import('./rest-tier2')`, so it
 * stays out of the deployed Vercel build.
 *
 * ── Why direct REST, not `@fitko/fit-connect` (Spec § 1) ───────────────────
 * The JS SDK is browser/proxy-oriented, does not document the receiving side,
 * and pins Node ^22.16; the host runs Node 24 and `npm install` is broken.
 * `jose` is runtime-agnostic and already a project dep. We speak FIT-Connect
 * Submission API v2 over plain `fetch`.
 *
 * ── Honesty (Spec § 8) ─────────────────────────────────────────────────────
 * Every call targets OUR OWN TEST Zustellpunkt (`[MOCK destination]`); no real
 * authority is involved. No secret (client secret, JWK private material) is ever
 * logged or placed in the receipt/error. On ANY sandbox failure we return a
 * Tier-2 receipt `status: 'error'`, framed as the TEST sandbox failing.
 *
 * ── What is LIVE-VERIFIED (orchestrator + this module, 2026-06-14) ──────────
 *  - token (client_secret_post) → Bearer/1800/send-submissions scope
 *  - GET /v2/destinations/{id} → status:active, encryptionKid, region
 *  - GET /v2/destinations/{id}/keys/{kid} → RSA-OAEP-256 4096-bit public JWK
 *  - POST /v2/submissions {destinationId, announcedAttachments, publicService:{name,identifier}, region} → 201 {submissionId, caseId}
 *  - PUT  /v2/submissions/{id}/attachments/{aid} (application/jose) → 204
 *  - PUT  /v2/submissions/{id} {encryptedMetadata, encryptedData} → 200  (JWE needs cty:application/json)
 *  - GET  /v2/cases/{caseId}/events → {eventLog:[JWS SET…]} — real PS512 SETs, signatures verified against /.well-known/jwks.json
 * The subscriber pull/decrypt (GET /v2/submissions/{id}) requires a manual
 * Self-Service-Portal step to connect the subscriber client to the destination
 * (returns 403 "connect client and destination there" until then) — left as a
 * documented follow-up; it does not block the sender round-trip + SET evidence.
 */

import { readFile } from 'node:fs/promises';

import {
  createRemoteJWKSet,
  decodeJwt,
  decodeProtectedHeader,
  jwtVerify,
  type JWK,
} from 'jose';

import {
  FIT_CONNECT_BASE_URLS,
  FIT_CONNECT_USER_AGENT,
  SET_SIGNING,
  type Tier2Env,
} from './config';
import { encryptCompactToJwk } from './jwe';
import { buildSubmission } from './index';
import { buildMetadata } from './metadata';
import { validateMetadata } from './schema';
import type {
  FitConnectReceipt,
  FitConnectSubmissionInput,
} from '@/types/fit-connect';

const SUB = FIT_CONNECT_BASE_URLS.submission;

/** Human-readable Leistung name per Block-D row (mirror of index.ts). */
const LEISTUNG_NAME: Record<FitConnectSubmissionInput['behoerdeId'], string> = {
  'kfz-berlin-labo': 'i-Kfz Adressänderung',
  'familienkasse-berlin-brandenburg': 'Kindergeld Veränderungsmitteilung',
  'abh-berlin-lea': 'Aufenthaltstitel Adressänderung',
};

/* ───────────────────────── small REST helpers ──────────────────────────── */

async function getToken(clientId: string, clientSecret: string): Promise<string> {
  // client_secret_post (NOT Basic — Basic → invalid_client). VERIFIED LIVE.
  const body = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: clientId,
    client_secret: clientSecret,
  });
  const res = await fetch(FIT_CONNECT_BASE_URLS.token, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': FIT_CONNECT_USER_AGENT,
    },
    body: body.toString(),
  });
  if (!res.ok) {
    // Do NOT echo the response body — it may reflect the (URL-encoded) secret.
    throw new Error(`FIT_CONNECT_TOKEN_${res.status}`);
  }
  const json = (await res.json()) as { access_token?: string };
  if (!json.access_token) throw new Error('FIT_CONNECT_TOKEN_NO_ACCESS_TOKEN');
  return json.access_token;
}

interface ApiResult {
  ok: boolean;
  status: number;
  json: unknown;
}

async function api(
  method: string,
  url: string,
  token: string,
  opts: { body?: unknown; contentType?: string } = {},
): Promise<ApiResult> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    'User-Agent': FIT_CONNECT_USER_AGENT,
  };
  let body: string | undefined;
  if (opts.body !== undefined) {
    if (typeof opts.body === 'string') {
      body = opts.body;
      if (opts.contentType) headers['Content-Type'] = opts.contentType;
    } else {
      body = JSON.stringify(opts.body);
      headers['Content-Type'] = opts.contentType ?? 'application/json';
    }
  }
  const res = await fetch(url, { method, headers, body });
  const text = await res.text();
  let json: unknown;
  try {
    json = text ? JSON.parse(text) : undefined;
  } catch {
    json = undefined;
  }
  return { ok: res.ok, status: res.status, json };
}

async function readJwk(path: string): Promise<JWK> {
  return JSON.parse(await readFile(path, 'utf8')) as JWK;
}

/* ───────────────────────── the live round-trip ─────────────────────────── */

/**
 * Run the real submission lifecycle against the FITKO TEST sandbox using direct
 * REST + jose. `env` is the structural Tier-2 verdict from `readTier2Env()`
 * (already gated on `enabled`). Returns a Tier-2 `FitConnectReceipt` carrying the
 * real `submissionId`/`caseId`, schema-valid metadata, the JWE preview, and live
 * SET evidence. Throws on any unexpected failure → caller falls back to Tier-1.
 */
export async function runLiveSubmission(
  input: FitConnectSubmissionInput,
  env: Tier2Env,
): Promise<FitConnectReceipt> {
  const destinationId = env.destinationId!;
  const leikaKey = env.leikaKey!;
  const leistungName = LEISTUNG_NAME[input.behoerdeId];

  // 1 — sender token (client_secret_post).
  const senderToken = await getToken(env.clientId!, env.clientSecret!);

  // 2 — GET destination → status, encryptionKid, region, schemaUri.
  const dest = await api('GET', `${SUB}/v2/destinations/${destinationId}`, senderToken);
  if (!dest.ok) throw new Error(`FIT_CONNECT_GET_DESTINATION_${dest.status}`);
  const d = dest.json as {
    status?: string;
    encryptionKid?: string;
    publicServices?: Array<{
      submissionSchemas?: Array<{ schemaUri?: string }>;
      regions?: string[];
    }>;
  };
  if (d.status !== 'active') throw new Error(`FIT_CONNECT_DESTINATION_NOT_ACTIVE`);
  const encryptionKid = d.encryptionKid!;
  const ps0 = d.publicServices?.[0];
  const schemaUri = ps0?.submissionSchemas?.[0]?.schemaUri;
  const region = ps0?.regions?.[0];

  // 3 — GET destination public encryption key (RSA-OAEP-256, 4096-bit).
  const keyRes = await api(
    'GET',
    `${SUB}/v2/destinations/${destinationId}/keys/${encryptionKid}`,
    senderToken,
  );
  if (!keyRes.ok) throw new Error(`FIT_CONNECT_GET_KEY_${keyRes.status}`);
  const destPubJwk = keyRes.json as JWK;

  // 4 — build metadata (live leikaKey) + validate against the vendored 2.1.0 schema.
  const seed = `fit-connect-live:${input.behoerdeId}:${Date.now()}`;
  const fachdaten = { datenkategorien: input.datenkategorien, mock: true };
  const { metadata, announcedAttachmentIds } = buildMetadata({
    seed,
    leikaKey,
    leistungName,
    announcedAttachmentCount: 1,
    datenkategorien: input.datenkategorien,
  });
  const { valid: schemaValid } = validateMetadata(metadata);
  // The destination pins its own submissionSchema; align the metadata's
  // contentStructure.data.submissionSchema.schemaUri to it when present.
  if (schemaUri) {
    const cs = (metadata.contentStructure as { data?: { submissionSchema?: { schemaUri?: string } } })
      .data?.submissionSchema;
    if (cs) cs.schemaUri = schemaUri;
  }

  // 5 — three separate JWE to the fetched destination key; metadata + Fachdaten
  //     need cty:application/json (VERIFIED: finalize 422 without it).
  const metadataJwe = await encryptCompactToJwk(metadata, destPubJwk, encryptionKid, 'application/json');
  const dataJwe = await encryptCompactToJwk(fachdaten, destPubJwk, encryptionKid, 'application/json');
  const attachmentJwes = await Promise.all(
    announcedAttachmentIds.map((id) =>
      encryptCompactToJwk(
        { attachmentId: id, mock: true, content: '[MOCK destination] Antragsform PDF placeholder' },
        destPubJwk,
        encryptionKid,
        'application/json',
      ),
    ),
  );

  // 6 — POST create submission → real submissionId + caseId.
  const create = await api('POST', `${SUB}/v2/submissions`, senderToken, {
    body: {
      destinationId,
      announcedAttachments: announcedAttachmentIds,
      publicService: { name: `${leistungName} [MOCK]`, identifier: leikaKey },
      ...(region ? { region } : {}),
    },
  });
  if (!create.ok) throw new Error(`FIT_CONNECT_CREATE_${create.status}`);
  const created = create.json as { submissionId?: string; caseId?: string };
  const submissionId = created.submissionId!;
  const caseId = created.caseId!;

  // 7 — PUT each attachment JWE (application/jose).
  for (let i = 0; i < announcedAttachmentIds.length; i++) {
    const aid = announcedAttachmentIds[i];
    const put = await api(
      'PUT',
      `${SUB}/v2/submissions/${submissionId}/attachments/${aid}`,
      senderToken,
      { body: attachmentJwes[i].compact, contentType: 'application/jose' },
    );
    if (!put.ok) throw new Error(`FIT_CONNECT_ATTACHMENT_${put.status}`);
  }

  // 8 — PUT finalize/send (encryptedMetadata + encryptedData, both mandatory v2).
  const send = await api('PUT', `${SUB}/v2/submissions/${submissionId}`, senderToken, {
    body: { encryptedMetadata: metadataJwe.compact, encryptedData: dataJwe.compact },
  });
  if (!send.ok) throw new Error(`FIT_CONNECT_FINALIZE_${send.status}`);

  // 9 — read + verify the event-log SETs (real FITKO-signed PS512 tokens).
  const live = await readEventLogEvidence(caseId, senderToken);

  // 10 — (optional) subscriber decrypt round-trip, if creds + JWK present and the
  //      SSP subscriber-connect step has been done. Best-effort: never throws.
  if (env.canReceive) {
    const recv = await tryReceiveRoundTrip(input, env, submissionId, metadata, fachdaten);
    if (recv.decryptRoundTripOk !== undefined) live.decryptRoundTripOk = recv.decryptRoundTripOk;
    if (recv.note) live.note = recv.note;
  }

  // Build the Tier-1 receipt shell for the standard preview fields, then overlay
  // the live identifiers + evidence. Still `[MOCK destination]`.
  const base = await buildSubmission(input);
  return {
    ...base,
    tier: 2,
    status: 'submitted',
    submissionId,
    caseId,
    routing: { ...base.routing, destinationId },
    metadataPreview: { ...base.metadataPreview },
    jwePreview: { ...base.jwePreview, compactExcerpt: metadataJwe.excerpt },
    schemaValid,
    live,
  };
}

/* ───────────────────────── event-log SET evidence ─────────────────────── */

async function readEventLogEvidence(
  caseId: string,
  token: string,
): Promise<NonNullable<FitConnectReceipt['live']>> {
  const ev = await api('GET', `${SUB}/v2/cases/${caseId}/events`, token);
  if (!ev.ok) return { note: `Event-Log nicht abrufbar (TEST sandbox, HTTP ${ev.status}).` };
  const log = (ev.json as { eventLog?: string[] })?.eventLog ?? [];

  const jwks = createRemoteJWKSet(new URL(`${SUB}/.well-known/jwks.json`));
  const eventTypes: string[] = [];
  let allVerified = log.length > 0;
  for (const set of log) {
    try {
      const hdr = decodeProtectedHeader(set);
      // Defensive: only PS512 secevent+jwt are valid SETs here.
      if (hdr.alg !== SET_SIGNING.alg) {
        allVerified = false;
        continue;
      }
      await jwtVerify(set, jwks, { algorithms: [SET_SIGNING.alg] });
      const claims = decodeJwt(set) as { events?: Record<string, unknown> };
      for (const t of Object.keys(claims.events ?? {})) eventTypes.push(t);
    } catch {
      allVerified = false;
    }
  }
  return { eventLogCount: log.length, setVerified: allVerified, eventTypes };
}

/* ───────────────────────── subscriber decrypt round-trip ───────────────── */

async function tryReceiveRoundTrip(
  _input: FitConnectSubmissionInput,
  env: Tier2Env,
  submissionId: string,
  metadata: unknown,
  fachdaten: unknown,
): Promise<{ decryptRoundTripOk?: boolean; note?: string }> {
  try {
    const subToken = await getToken(env.subscriberClientId!, env.subscriberClientSecret!);
    const getSub = await api('GET', `${SUB}/v2/submissions/${submissionId}`, subToken);
    if (getSub.status === 403) {
      return {
        note:
          'Subscriber-Abruf blockiert: der Verwaltungssystem-Client ist im FITKO-Self-Service-Portal noch nicht mit dem TEST-Zustellpunkt verbunden (HTTP 403). Manueller SSP-Schritt — Sender-Round-Trip + signierte SETs sind dennoch live verifiziert.',
      };
    }
    if (!getSub.ok) return { note: `Subscriber-Abruf fehlgeschlagen (TEST sandbox, HTTP ${getSub.status}).` };

    const { decryptCompact } = await import('./jwe');
    const privateJwk = await readJwk(env.decryptionJwkPath!);
    const body = getSub.json as { encryptedMetadata?: string; encryptedData?: string };
    const meta = await decryptCompact(body.encryptedMetadata!, privateJwk);
    const data = await decryptCompact(body.encryptedData!, privateJwk);
    const ok =
      JSON.stringify(meta) === JSON.stringify(metadata) &&
      JSON.stringify(data) === JSON.stringify(fachdaten);
    return { decryptRoundTripOk: ok };
  } catch {
    // Best-effort; never block or leak.
    return { note: 'Subscriber-Round-Trip übersprungen (TEST sandbox).' };
  }
}
