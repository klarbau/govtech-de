/**
 * FIT-Connect JWE — `jose`-based JWE Compact Serialization (Spec § 6.2,
 * Research § D). SERVER-ONLY.
 *
 * All three FIT-Connect dataset types (metadata, Fachdaten, attachments) MUST
 * be JWE-encrypted with Compact Serialization, each separately
 * (Research § D, "drei separate JWE"). Key-wrap `RSA-OAEP-256`, content
 * `A256GCM`, RSA ≥ 4096-bit recipient key. The `zip` header is PROHIBITED in
 * Submission API v2 — we never set it (Research § D, Spec § 13.2).
 *
 * Tier-1 (default): the recipient "public key" is the SYNTHETIC, public-only
 * `[MOCK destination]` JWK vendored at `schema/mock-destination-key.json`.
 * There is no real Behörde and no private material — this is a closed loop
 * (Spec § 13.2 #4). The JWE is produced to render a STANDARDS-TRUE wire excerpt
 * in the receipt panel; it is never sent over the network in Tier-1.
 */

import {
  CompactEncrypt,
  compactDecrypt,
  importJWK,
  type CryptoKey,
  type JWK,
} from 'jose';

import { JWE_CRYPTO } from './config';
import mockDestinationJwk from './schema/mock-destination-key.json';

/** The three FIT-Connect dataset kinds, each its own JWE (Research § D). */
export type JweDatasetKind = 'metadata' | 'fachdaten' | 'attachment';

let cachedKey: CryptoKey | Uint8Array | null = null;

/**
 * Import the vendored synthetic `[MOCK destination]` RSA-4096 public JWK.
 * Cached per process. The JWK contains only `n`/`e` (no private material).
 */
async function getMockDestinationKey(): Promise<CryptoKey | Uint8Array> {
  if (cachedKey) return cachedKey;
  // Strip the documentation `_comment` field before importing.
  const { _comment: _omit, ...jwk } = mockDestinationJwk as Record<string, unknown> & {
    _comment?: string;
  };
  cachedKey = await importJWK(jwk as JWK, JWE_CRYPTO.alg);
  return cachedKey;
}

export interface JweResult {
  /** The full JWE Compact Serialization (5 dot-separated segments). */
  compact: string;
  /** A rendered excerpt for the receipt panel (first/last N chars). */
  excerpt: string;
}

/**
 * Encrypt a payload as a JWE Compact Serialization against the synthetic
 * `[MOCK destination]` key. Header is exactly `{ alg: RSA-OAEP-256,
 * enc: A256GCM }` — NO `zip`.
 */
export async function encryptCompact(payload: unknown): Promise<JweResult> {
  const key = await getMockDestinationKey();
  const plaintext = new TextEncoder().encode(JSON.stringify(payload));
  const compact = await new CompactEncrypt(plaintext)
    .setProtectedHeader({ alg: JWE_CRYPTO.alg, enc: JWE_CRYPTO.enc })
    .encrypt(key);
  return { compact, excerpt: renderWireExcerpt(compact) };
}

/**
 * Produce the three separate JWE (metadata / Fachdaten / attachments), as the
 * v2 submission flow requires (Research § D). `attachments` may be empty.
 */
export async function encryptThreeDatasets(input: {
  metadata: unknown;
  fachdaten: unknown;
  attachments?: unknown[];
}): Promise<{
  metadata: JweResult;
  fachdaten: JweResult;
  attachments: JweResult[];
}> {
  const [metadata, fachdaten] = await Promise.all([
    encryptCompact(input.metadata),
    encryptCompact(input.fachdaten),
  ]);
  const attachments = await Promise.all(
    (input.attachments ?? []).map((a) => encryptCompact(a)),
  );
  return { metadata, fachdaten, attachments };
}

/**
 * Render a first/last-N-chars excerpt of a JWE Compact Serialization for the
 * receipt panel. Shows the real protected-header prefix (which base64url-decodes
 * to `{"alg":"RSA-OAEP-256","enc":"A256GCM"}`) and the trailing AEAD-tag
 * segment, with a truncation marker in the middle.
 */
export function renderWireExcerpt(compact: string, head = 46, tail = 12): string {
  if (compact.length <= head + tail + 1) return compact;
  return `${compact.slice(0, head)}…⟨gekürzt⟩…${compact.slice(-tail)}`;
}

/* ───────────────────────── Tier-2 live JWE (direct REST) ─────────────────── */

/**
 * FIT-Connect publishes its destination wrap key with `key_ops: ["wrapKey"]`
 * (and sometimes `use: "enc"`). `jose`'s WebCrypto backend maps those to key
 * usages that EXCLUDE `encrypt`/`decrypt`, so a direct `importJWK` →
 * `CompactEncrypt` throws "usages must include encrypt". Stripping the
 * operation-restricting fields lets the key import with the default RSA-OAEP-256
 * encrypt/decrypt usages. (VERIFIED LIVE 2026-06-14.)
 */
function relaxJwkForJwe(jwk: JWK): JWK {
  const { use: _use, key_ops: _ops, ext: _ext, ...rest } = jwk as JWK & {
    ext?: boolean;
  };
  return rest as JWK;
}

/**
 * Encrypt a payload as a JWE Compact Serialization against a PROVIDED public JWK
 * (the destination's fetched encryption key — Tier-2 live path), with the
 * protected header `{ alg: RSA-OAEP-256, enc: A256GCM, kid }` and NO `zip`.
 *
 * `cty` is required by FITKO for the metadata + Fachdaten JWEs
 * (`application/json` — VERIFIED LIVE: a finalize PUT without it returns
 * `422 Invalid JWE Header 'cty'`). Pass `undefined` only where FITKO does not
 * require it.
 */
export async function encryptCompactToJwk(
  payload: unknown,
  publicJwk: JWK,
  kid: string,
  cty?: 'application/json' | 'application/xml',
): Promise<JweResult> {
  const key = await importJWK(relaxJwkForJwe(publicJwk), JWE_CRYPTO.alg);
  const plaintext = new TextEncoder().encode(JSON.stringify(payload));
  // Object literal (not a cast) so tsc type-checks the header shape against
  // jose's CompactJWEHeaderParameters — alg/enc are `as const` literals; cty is
  // spread in only when FITKO requires it (metadata/Fachdaten). NO `zip`.
  const compact = await new CompactEncrypt(plaintext)
    .setProtectedHeader({
      alg: JWE_CRYPTO.alg,
      enc: JWE_CRYPTO.enc,
      kid,
      ...(cty ? { cty } : {}),
    })
    .encrypt(key);
  return { compact, excerpt: renderWireExcerpt(compact) };
}

/**
 * Decrypt a JWE Compact Serialization with a PROVIDED private JWK
 * (the destination's decryption key — Tier-2 receive path) and return the
 * parsed JSON plaintext. Used to assert the metadata/Fachdaten round-trip.
 */
export async function decryptCompact(
  jwe: string,
  privateJwk: JWK,
): Promise<unknown> {
  const key = await importJWK(relaxJwkForJwe(privateJwk), JWE_CRYPTO.alg);
  const { plaintext } = await compactDecrypt(jwe, key);
  return JSON.parse(new TextDecoder().decode(plaintext));
}
