/**
 * EUDI OpenID4VP verifier — core (Spec §6.4). SERVER-ONLY.
 *
 * Stands up OUR OWN OpenID4VP 1.0 verifier so a real EU reference wallet (phone)
 * or the headless driver (`scripts/eudi-present-pid.mjs`) presents a PID over the
 * wire. It:
 *   1. builds a DCQL authorization request for exactly the 3 PID claims the mock
 *      dialog shows (given_name, family_name, birthdate; vct `urn:eudi:pid:1`,
 *      format `dc+sd-jwt`) via `createOpenid4vpAuthorizationRequest`,
 *   2. serves it unsigned (plain JSON request object) or x5c-signed (JAR), and
 *   3. verifies the direct_post response = the SHIPPED `verifyPidSdJwtVc`
 *      (issuer ES256 sig + disclosure binding + chain → demo CA) PLUS the NEW
 *      `verifyKbJwt` (holder key-binding).
 *
 * `@openid4vc/openid4vp` is heavy + server-only: it is DYNAMIC-IMPORTED here
 * (§4.2), and this module itself is only imported from route handlers inside the
 * `EUDI_VP_LIVE=1` branch — so nothing loads it in the deployed/flag-off bundle.
 *
 * Honesty (§9): the verifier is a SANDBOX trust anchor — EU reference/development
 * ecosystem, NOT German-state, NOT eIDAS, NOT production. It cannot address a
 * real authority.
 */

import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';

import { importJWK, type CryptoKey, type JWK } from 'jose';

import { verifyPidSdJwtVc } from '../verify';
import type { EudiVpEnv } from './config';
import { verifyKbJwt } from './kb-jwt';
import { makeVerifierCallbacks } from './oid4vc-callbacks';
import type { VpSession } from './types';

/** Human-facing verifier name shown in the wallet consent screen (sandbox). */
const VERIFIER_CLIENT_NAME = 'GovTech DE — Protokoll-Modus (Sandbox)';
/** The single DCQL credential-query id we map the presentation back from. */
const PID_CREDENTIAL_ID = 'pid';
/** The PID credential type + presentation format we request. */
const PID_VCT = 'urn:eudi:pid:1';
const PID_FORMAT = 'dc+sd-jwt';

/* ───────────────────────── dynamic library load ─────────────────────────── */

type Oid4vpModule = typeof import('@openid4vc/openid4vp');
let libPromise: Promise<Oid4vpModule> | undefined;
function loadLib(): Promise<Oid4vpModule> {
  if (!libPromise) libPromise = import('@openid4vc/openid4vp');
  return libPromise;
}

/* ───────────────────────── URIs & client identifiers ────────────────────── */

export function responseUriFor(sessionId: string, externalUrl: string): string {
  return `${externalUrl}/api/eudi/vp/response/${sessionId}`;
}

export function requestUriFor(sessionId: string, externalUrl: string): string {
  return `${externalUrl}/api/eudi/vp/request/${sessionId}`;
}

interface DemoSigningKey {
  privateKey: CryptoKey | Uint8Array;
  publicJwk: JWK;
  x5c: string[];
  derB64: string;
  alg: string;
}

/**
 * Read the demo verifier signing key (x5c-signed mode). The JWK file carries the
 * private key AND an `x5c` chain (self-signed demo cert). Read server-side via
 * `node:fs`; the private material never leaves this module.
 */
async function loadSigningKey(signingJwkPath: string): Promise<DemoSigningKey> {
  const raw = JSON.parse(await readFile(signingJwkPath, 'utf8')) as JWK & {
    x5c?: string[];
    alg?: string;
  };
  if (!raw.x5c || raw.x5c.length === 0) {
    throw new Error('demo signing JWK is missing its x5c chain');
  }
  const alg = raw.alg ?? 'ES256';
  const privateKey = await importJWK(raw, alg);
  // Strip private + chain members to form the public JWK.
  const { d: _d, x5c: _x5c, ...publicJwk } = raw;
  return { privateKey, publicJwk: publicJwk as JWK, x5c: raw.x5c, derB64: raw.x5c[0], alg };
}

/** `x509_hash:` client-id prefix value = base64url(SHA-256(cert DER)). */
function x509HashClientId(derB64: string): string {
  const der = Buffer.from(derB64, 'base64');
  return `x509_hash:${createHash('sha256').update(der).digest('base64url')}`;
}

/**
 * The verifier's effective `client_id` — the value a KB-JWT `aud` must match.
 * Unsigned: the `redirect_uri:` prefix over our response_uri. x5c-signed: the
 * `x509_hash:` prefix over the demo cert.
 */
export async function clientIdFor(session: VpSession, env: EudiVpEnv): Promise<string> {
  if (session.requestMode === 'x5c-signed') {
    if (!env.signingJwkPath) throw new Error('x5c mode requires EUDI_VP_SIGNING_JWK_PATH');
    const { derB64 } = await loadSigningKey(env.signingJwkPath);
    return x509HashClientId(derB64);
  }
  return `redirect_uri:${responseUriFor(session.id, env.externalUrl!)}`;
}

/** The `openid4vp://` deep link (also the QR payload) — request-by-reference. */
export async function openid4vpUriFor(session: VpSession, env: EudiVpEnv): Promise<string> {
  const clientId = await clientIdFor(session, env);
  const requestUri = requestUriFor(session.id, env.externalUrl!);
  const params = new URLSearchParams({
    client_id: clientId,
    request_uri: requestUri,
  });
  return `openid4vp://?${params.toString()}`;
}

/* ───────────────────────── DCQL query ───────────────────────────────────── */

function buildDcqlQuery(): Record<string, unknown> {
  return {
    credentials: [
      {
        id: PID_CREDENTIAL_ID,
        format: PID_FORMAT,
        meta: { vct_values: [PID_VCT] },
        claims: [
          { path: ['given_name'] },
          { path: ['family_name'] },
          { path: ['birthdate'] },
        ],
      },
    ],
  };
}

function baseRequestPayload(clientId: string, responseUri: string, nonce: string) {
  return {
    response_type: 'vp_token' as const,
    client_id: clientId,
    response_uri: responseUri,
    response_mode: 'direct_post' as const,
    nonce,
    dcql_query: buildDcqlQuery(),
    client_metadata: {
      client_name: VERIFIER_CLIENT_NAME,
      vp_formats_supported: {
        [PID_FORMAT]: {
          'sd-jwt_alg_values': ['ES256'] as [string, ...string[]],
          'kb-jwt_alg_values': ['ES256'] as [string, ...string[]],
        },
      },
    },
  };
}

/* ───────────────────────── request object (served at /request) ──────────── */

export interface RequestObjectArtifact {
  contentType: string;
  body: string;
}

/**
 * Build the authorization request object served at `/api/eudi/vp/request/{id}`.
 * Unsigned → validated plain-JSON request object. x5c-signed → a signed JAR
 * (JWT, `x5c` header = the self-signed demo cert).
 */
export async function buildRequestObject(
  session: VpSession,
  env: EudiVpEnv,
): Promise<RequestObjectArtifact> {
  const lib = await loadLib();
  const responseUri = responseUriFor(session.id, env.externalUrl!);

  if (session.requestMode === 'x5c-signed') {
    if (!env.signingJwkPath) throw new Error('x5c mode requires EUDI_VP_SIGNING_JWK_PATH');
    const signing = await loadSigningKey(env.signingJwkPath);
    const clientId = x509HashClientId(signing.derB64);
    const requestUri = requestUriFor(session.id, env.externalUrl!);
    const result = await lib.createOpenid4vpAuthorizationRequest({
      authorizationRequestPayload: baseRequestPayload(clientId, responseUri, session.nonce),
      jar: {
        requestUri,
        jwtSigner: { method: 'x5c', alg: signing.alg, x5c: signing.x5c },
        expiresInSeconds: 300,
      },
      callbacks: makeVerifierCallbacks({
        privateKey: signing.privateKey,
        publicJwk: signing.publicJwk,
      }),
    });
    const jwt = (result.jar as { authorizationRequestJwt?: string } | undefined)
      ?.authorizationRequestJwt;
    if (!jwt) throw new Error('JAR signing produced no request JWT');
    return { contentType: 'application/oauth-authz-req+jwt', body: jwt };
  }

  const clientId = `redirect_uri:${responseUri}`;
  const result = await lib.createOpenid4vpAuthorizationRequest({
    authorizationRequestPayload: baseRequestPayload(clientId, responseUri, session.nonce),
    callbacks: makeVerifierCallbacks(),
  });
  return {
    contentType: 'application/json',
    body: JSON.stringify(result.authorizationRequestPayload),
  };
}

/* ───────────────────────── response verification ────────────────────────── */

export interface VerifyVpResult {
  ok: boolean;
  reason?: string;
  claims?: { given_name?: string; family_name?: string; birthdate?: string };
}

/**
 * Verify a direct_post response for a session. Extracts the SD-JWT VC
 * presentation from the DCQL `vp_token` via oid4vc-ts, then runs the shipped
 * issuer-credential verifier AND the new KB-JWT holder-binding check. Never
 * throws — returns an honest, PII-free reason on any failure.
 */
export async function verifyVpResponse(
  session: VpSession,
  responseParams: Record<string, unknown>,
  env: EudiVpEnv,
): Promise<VerifyVpResult> {
  const lib = await loadLib();

  // vp_token may arrive as a JSON string (form-encoded direct_post) or object.
  let vpToken: unknown = responseParams.vp_token;
  if (typeof vpToken === 'string') {
    try {
      vpToken = JSON.parse(vpToken);
    } catch {
      /* leave as string — parseDcqlVpToken will reject it */
    }
  }
  if (vpToken === undefined || vpToken === null) {
    return { ok: false, reason: 'vp-token-missing' };
  }

  let presentations: Record<string, unknown[]>;
  try {
    presentations = lib.parseDcqlVpToken(vpToken) as Record<string, unknown[]>;
  } catch {
    return { ok: false, reason: 'vp-token-unparseable' };
  }

  const entry =
    (presentations[PID_CREDENTIAL_ID]?.[0] as unknown) ??
    (Object.values(presentations)[0]?.[0] as unknown);
  if (typeof entry !== 'string') {
    return { ok: false, reason: 'no-sd-jwt-presentation' };
  }
  const presentation = entry;

  // 1. Issuer credential — shipped verifier (ES256 sig + disclosure binding +
  //    chain → vendored demo CA). It strips/ignores the KB-JWT segment.
  const issuer = await verifyPidSdJwtVc(presentation);
  if (!issuer.verified) {
    return { ok: false, reason: `credential-${issuer.reason ?? 'invalid'}` };
  }

  // 2. KB-JWT holder key-binding — the gap verify.ts defers. aud = our effective
  //    client_id; nonce = the session nonce; sd_hash binds the disclosures.
  const clientId = await clientIdFor(session, env);
  const kb = await verifyKbJwt({
    presentation,
    expectedAudience: clientId,
    expectedNonce: session.nonce,
  });
  if (!kb.verified) {
    return { ok: false, reason: `kb-${kb.reason ?? 'invalid'}` };
  }

  return {
    ok: true,
    claims: {
      given_name: typeof issuer.claims.given_name === 'string' ? issuer.claims.given_name : undefined,
      family_name: typeof issuer.claims.family_name === 'string' ? issuer.claims.family_name : undefined,
      birthdate: typeof issuer.claims.birthdate === 'string' ? issuer.claims.birthdate : undefined,
    },
  };
}
