/**
 * FIT-Connect adapter — static configuration (Spec § 6.2, § 6.4, § 6.7).
 *
 * SERVER-ONLY. Nothing in this module is imported by the client bundle: the
 * adapter is reached exclusively through the `'use server'` action in
 * `src/app/actions/fit-connect.ts`. Secrets are read from `process.env` and
 * never echoed.
 *
 * All technical values are VERBATIM from the pre-flight research
 * (`docs/research/fit-connect-preflight-2026-06-13.md` §§ A–E). No value here
 * is invented; where a fact is unconfirmed it is marked as such.
 *
 * FIT-Connect is the FITKO-operated Datenübermittlung Basisdienst of the
 * OZG-Rahmenarchitektur — NOT the "Verwaltungsportalverbund", NOT
 * "Deutschland-Stack" (Spec § 13.2 #8). Routing discovery = PVOG/DVDV.
 */

/* ───────────────────────── Base URLs (Research § B, verbatim) ───────────── */

export const FIT_CONNECT_BASE_URLS = {
  /** OAuth 2.0 client-credentials token endpoint (TEST). */
  token: 'https://auth-testing.fit-connect.fitko.dev/token',
  /** Routing API (TEST) — `GET /v1/routes?ars=…&leikaKey=…`. */
  routing: 'https://routing-api-testing.fit-connect.fitko.dev',
  /** Submission API v2 (TEST). */
  submission: 'https://test.fit-connect.fitko.dev/submission-api',
  /** Self-Service-Portal (TEST) — onboarding only, never called at runtime. */
  selfServicePortal: 'https://portal.auth-testing.fit-connect.fitko.dev',
} as const;

/* ───────────────────────── Schema pin (Research § E, Spec § 6.4) ────────── */

/**
 * Pinned metadata schema version. FITKO enforces schema ≥ 1.3.0 since
 * 2026-04-01; current latest is 2.1.0. We pin `2.1.0` (not `latest`) so Tier-1
 * validation is deterministic in CI. Bump deliberately.
 *
 * The schema file itself is VENDORED at build time
 * (`schema/metadata-2.1.0.schema.json`) — Tier-1 validates offline, no network
 * fetch in CI.
 */
export const METADATA_SCHEMA_VERSION = '2.1.0' as const;

export const METADATA_SCHEMA_URL =
  `https://schema.fitko.de/fit-connect/metadata/${METADATA_SCHEMA_VERSION}/metadata.schema.json` as const;

/**
 * Governikus IdentificationReport 2.0.0 — the eID hook. The metadata models
 * identification as a `dataSets[]` entry whose `schemaUri` is this JWT schema
 * (Research § E, Spec § 6.6). Its `levelOfAssurance` enum includes all three
 * eIDAS-notified URIs.
 */
export const IDENTIFICATION_REPORT_SCHEMA_URI =
  'https://raw.githubusercontent.com/Governikus/IdentificationReport/2.0.0/schema/identification-report.json' as const;

/* ───────────────────────── eIDAS LoA (Research § E Delta 2) ─────────────── */

/**
 * Our chosen eIDAS level of assurance.
 *
 * HONESTY (Spec § 6.4, § 13.2 #9): `LoA/high` is a SCHEMA-VALID enum member of
 * the Governikus IdentificationReport schema — it is OUR narrative choice
 * (matching the German eID / DeutschlandID LoA-high story), legitimately
 * allowed by the schema. It is NOT the value the FITKO doc happens to
 * exemplify (the doc's worked example shows `LoA/low`). Copy/README must frame
 * it as "our chosen, schema-allowed value", never as doc-mandated.
 */
export const EIDAS_LOA_HIGH = 'http://eidas.europa.eu/LoA/high' as const;

/* ───────────────────────── Crypto params (Research § D, Plan § 5) ───────── */

export const JWE_CRYPTO = {
  /** Key-wrap algorithm. FITKO: "Key algorithm must be RSA-OAEP-256!". */
  alg: 'RSA-OAEP-256',
  /** Content-encryption algorithm. */
  enc: 'A256GCM',
  /** Minimum RSA modulus. FITKO: "…should be at least 4096!". */
  minRsaModulusBits: 4096,
} as const;

/**
 * Security Event Token (SET) signing — Research § D "ADDED PRECISION".
 * `PS512` (RSASSA-PSS / SHA-512), fixed `typ` header `secevent+jwt`
 * (RFC 8417 § 2.3). Used for the Tier-1 rendered SET / Tier-2 receive.
 */
export const SET_SIGNING = {
  alg: 'PS512',
  typ: 'secevent+jwt',
} as const;

/* ───────────────────────── LeiKa keys (Spec § 6.5, Domain § 2 — DO NOT INVENT) */

/**
 * The anchor (Wohnsitzanmeldung) LeiKa key — catalogue-confirmed, high
 * confidence. DISPLAY ONLY: the Anmeldung itself does NOT route over
 * FIT-Connect (BMeldDigiV § 2 → OSCI-XMeld). Never used as a FIT-Connect
 * routing key here. We keep it for reference / honesty completeness.
 */
export const ANCHOR_LEIKA_KEY =
  'urn:de:fim:leika:leistung:99115005104000' as const;

/**
 * Placeholder LeiKa keys for the three Block-D citizen-Antrag rows. These are
 * NOT catalogue-confirmed (the FIM-Portal detail pages are JS-rendered and did
 * not yield the 14-digit keys, Domain § 7). They render in the wire excerpt
 * LITERALLY, marked "nicht aus dem Katalog bestätigt". We NEVER invent a
 * 14-digit key, and NEVER ship the docs example `99123456760610`
 * (Spec § 13.2 #6).
 */
export const BLOCK_D_PLACEHOLDER_LEIKA_KEYS = {
  'kfz-berlin-labo':
    'urn:de:fim:leika:leistung:<i-Kfz-Adressaenderung>',
  'familienkasse-berlin-brandenburg':
    'urn:de:fim:leika:leistung:<Kindergeld-Veraenderungsmitteilung>',
  'abh-berlin-lea':
    'urn:de:fim:leika:leistung:<Aufenthaltstitel-Adressaenderung>',
} as const;

/** The three — and only three — behoerdeIds that may carry a FIT-Connect submission. */
export type FitConnectBehoerdeId = keyof typeof BLOCK_D_PLACEHOLDER_LEIKA_KEYS;

/* ───────────────────────── Tier-2 flag & creds (Spec § 6.7) ─────────────── */

/**
 * Reads the Tier-2 enablement flag + creds from `process.env` (server only).
 *
 * Returns a structural verdict — NEVER the secret values themselves, and never
 * logs them. If `FIT_CONNECT_LIVE` is unset OR either credential is missing,
 * `enabled` is false and the public surface gracefully falls back to Tier-1
 * (Spec § 12, § 6.7).
 */
export function readTier2Env(): {
  enabled: boolean;
  clientId?: string;
  clientSecret?: string;
} {
  const live = process.env.FIT_CONNECT_LIVE === '1';
  const clientId = process.env.FIT_CONNECT_CLIENT_ID;
  const clientSecret = process.env.FIT_CONNECT_CLIENT_SECRET;
  const enabled = live && Boolean(clientId) && Boolean(clientSecret);
  return enabled
    ? { enabled, clientId, clientSecret }
    : { enabled: false };
}

/**
 * Synthetic Amtlicher Regionalschlüssel for the routing-request shape.
 * `[MOCK]` — Berlin (11000000). Never a real destination routing target.
 */
export const MOCK_ARS = '110000000000' as const;
