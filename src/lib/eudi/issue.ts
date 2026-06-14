/**
 * Verifiable Once-Only — DEMO ISSUER. SERVER-ONLY.
 *
 * The outgoing half of the Once-Only loop: the SAME real SD-JWT VC cryptography
 * the Tier-1 verifier (`verify.ts`) applies to an INCOMING PID, run OUTGOING — we
 * MINT an amtliche Meldebestätigung (§ 24 Abs. 2 BMG) credential with our own
 * synthetic Demo-Issuer key + Demo-Trust-Anchor, and the verifier re-verifies it
 * offline against the injected Demo-CA. `[reference-ecosystem]` + `[ZUKUNFT]`:
 * FORMAT + signature are real, AUTHORITY is Demo (not a German Meldebehörde, not
 * eIDAS-trusted, not production).
 *
 * SERVER-ONLY by convention (matches `verify.ts` / `src/lib/ai/client.ts`):
 * `node:crypto` + `jose` + the vendored synthetic signing key make this Node-
 * runtime only; it must never be pulled into the client bundle. The issuance is
 * keyless from the caller's view (no `.env`) and fully offline (no `fs`, no
 * network) — it runs in a deployed Vercel build and in a Loom take.
 *
 * Output shape (consumed by `verifyPidSdJwtVc` with ZERO verifier changes, C4):
 *   header  : { alg: 'ES256', typ: 'dc+sd-jwt', x5c: [<leaf b64 DER>] }
 *   payload : { iss, iat, exp(~90d), vct, _sd: [...digests], _sd_alg: 'sha-256' }
 *   token   : <issuerJwt>~<d1>~<d2>~…~   (object-property disclosures, trailing `~`)
 *   NO KB-JWT (issuer output; key binding is presentation-time).
 *   NO PID padding — exactly the (up to) 8 § 24 Abs. 2 fields (C3).
 */
import { createHash, randomBytes } from 'node:crypto';

import { SignJWT, importPKCS8, type JWTPayload } from 'jose';

import {
  DEMO_ONCE_ONLY_ISSUER_PRIVATE_KEY_PKCS8_PEM,
  DEMO_ONCE_ONLY_LEAF_X5C_DER_B64,
} from './fixtures/once-only-issuer';
import { MELDEBESTAETIGUNG_FIELDS, type MeldebestaetigungField } from './types';

/** Demo-owned credential type — NEVER `bund.de`/`*.gov.de` (C7). */
export const MELDEBESTAETIGUNG_VCT =
  'govtech-de.example/credentials/meldebestaetigung/1';
/** Demo-namespaced issuer (C7). */
export const MELDEBESTAETIGUNG_ISS = 'https://demo-issuer.govtech-de.example';

export interface MeldebestaetigungClaims {
  familienname: string;
  vornamen: string;
  doktorgrad?: string; // optional (C3 allows absence)
  geburtsdatum: string; // ISO yyyy-mm-dd
  einzugsdatum: string; // ISO
  datum_anmeldung: string; // ISO
  anschrift: string; // single-line address
  wohnungsstatus: 'hauptwohnung' | 'nebenwohnung' | 'alleinige_wohnung';
}

export interface IssueOptions {
  /** Default ~90 days from now. */
  validityDays?: number;
  /** Which fields to emit as `_sd` disclosures (default: all present ones). */
  discloseOnly?: MeldebestaetigungField[];
}

/* ── helpers — must match verify.ts byte-for-byte ──────────────────────────── */

/** base64url-encode a UTF-8 string (no padding). */
function base64url(input: string): string {
  return Buffer.from(input, 'utf8').toString('base64url');
}

/**
 * SHA-256 digest of a disclosure string, base64url-encoded. Verify.ts hashes the
 * disclosure raw with `update(raw, 'ascii')`; base64url chars are pure ASCII, so
 * this is identical. The verifier recomputes the digest from the SAME raw it
 * receives, so consistency (not any particular JSON whitespace style) is what
 * binds a disclosure to the `_sd` entry.
 */
function sha256Base64url(input: string): string {
  return createHash('sha256').update(input, 'ascii').digest('base64url');
}

/** A salted object-property disclosure `[salt, name, value]` and its digest. */
interface BuiltDisclosure {
  raw: string;
  digest: string;
}

function buildDisclosure(name: string, value: string): BuiltDisclosure {
  // 128-bit salt, base64url (SD-JWT recommends ≥128 bits).
  const salt = randomBytes(16).toString('base64url');
  const raw = base64url(JSON.stringify([salt, name, value]));
  return { raw, digest: sha256Base64url(raw) };
}

/* ── public API ────────────────────────────────────────────────────────────── */

/**
 * Mint an ES256 SD-JWT VC for the amtliche Meldebestätigung. Each present field
 * (omitting absent ones, e.g. `doktorgrad`) becomes an object-property `_sd`
 * disclosure; the issuer JWT carries only the digests in `_sd`. Returns
 * `<issuerJwt>~<d1>~…~` (trailing `~`, no KB-JWT) — parseable + verifiable by
 * `verifyPidSdJwtVc` with no verifier changes.
 */
export async function issueMeldebestaetigungSdJwtVc(
  claims: MeldebestaetigungClaims,
  opts: IssueOptions = {},
): Promise<string> {
  const key = await importPKCS8(
    DEMO_ONCE_ONLY_ISSUER_PRIVATE_KEY_PKCS8_PEM,
    'ES256',
  );

  // Resolve which of the 8 fields to disclose: those present on `claims` AND (if
  // a filter is given) in `discloseOnly`. Iterate in the canonical field order
  // so the token is stable. NO PID padding — only § 24 Abs. 2 fields (C3).
  const filter = opts.discloseOnly ? new Set(opts.discloseOnly) : undefined;
  const disclosures: BuiltDisclosure[] = [];
  for (const field of MELDEBESTAETIGUNG_FIELDS) {
    if (filter && !filter.has(field)) continue;
    const value = (claims as unknown as Record<string, string | undefined>)[
      field
    ];
    if (value === undefined || value === null || value === '') continue;
    disclosures.push(buildDisclosure(field, String(value)));
  }

  const nowSec = Math.floor(Date.now() / 1000);
  const validityDays = opts.validityDays ?? 90;
  const expSec = nowSec + validityDays * 24 * 60 * 60;

  const payload: JWTPayload & { _sd: string[]; _sd_alg: string } = {
    iss: MELDEBESTAETIGUNG_ISS,
    iat: nowSec,
    exp: expSec,
    vct: MELDEBESTAETIGUNG_VCT,
    _sd: disclosures.map((d) => d.digest),
    _sd_alg: 'sha-256',
  };

  const issuerJwt = await new SignJWT(payload)
    .setProtectedHeader({
      alg: 'ES256',
      typ: 'dc+sd-jwt',
      x5c: [DEMO_ONCE_ONLY_LEAF_X5C_DER_B64],
    })
    .sign(key);

  // `<issuerJwt>~<d1>~<d2>~…~` — trailing `~`, no KB-JWT.
  return [issuerJwt, ...disclosures.map((d) => d.raw), ''].join('~');
}

/* ── persona convenience path (§6b) ──────────────────────────────────────────
 *
 * NOTE: this module is server-only but deliberately store-agnostic — it must NOT
 * import the mock-backend (`api.ts` is browser/server-store wired and would drag
 * a heavy graph into the EUDI module). The mapping from persona + Umzug-Vorgang
 * to claims is therefore passed in by the caller (the backend issuance hook in
 * `api.ts` / the server action), which already holds the loaded Persona +
 * Vorgang. `issueMeldebestaetigungForPersona` accepts the resolved claims so the
 * spec signature is honoured without a circular dependency.
 */

export interface PersonaMeldeContext {
  /** From the persona Stammdaten. */
  familienname: string;
  vornamen: string;
  doktorgrad?: string;
  geburtsdatum: string;
  /** The NEW Umzug address (single line) — the just-registered address. */
  anschrift: string;
  /** The Vorgang's Umzug date (ISO). */
  einzugsdatum: string;
  datum_anmeldung: string;
  wohnungsstatus?: MeldebestaetigungClaims['wohnungsstatus'];
}

/**
 * Convenience persona path: builds claims from a resolved persona/Vorgang context
 * and mints. `personaId`/`vorgangId` are accepted for signature-parity with the
 * spec + future logging; the actual values come from `ctx` (resolved by the
 * caller, which owns the store). `wohnungsstatus` defaults to `'hauptwohnung'`.
 */
export async function issueMeldebestaetigungForPersona(
  _personaId: string | undefined,
  _vorgangId: string,
  ctx: PersonaMeldeContext,
  opts?: IssueOptions,
): Promise<string> {
  const claims: MeldebestaetigungClaims = {
    familienname: ctx.familienname,
    vornamen: ctx.vornamen,
    ...(ctx.doktorgrad ? { doktorgrad: ctx.doktorgrad } : {}),
    geburtsdatum: ctx.geburtsdatum,
    einzugsdatum: ctx.einzugsdatum,
    datum_anmeldung: ctx.datum_anmeldung,
    anschrift: ctx.anschrift,
    wohnungsstatus: ctx.wohnungsstatus ?? 'hauptwohnung',
  };
  return issueMeldebestaetigungSdJwtVc(claims, opts);
}
