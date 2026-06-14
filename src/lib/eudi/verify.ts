/**
 * EUDI Tier-1 CORE — offline SD-JWT VC verifier. SERVER-ONLY.
 *
 * `[reference-ecosystem]`: verifies an EU Digital Identity *reference /
 * development* PID credential against the *development* demo IACA. NOT a
 * German-state credential, NOT eIDAS-trusted, NOT production. See `types.ts`.
 *
 * The whole point of Tier-1 is determinism + deploy-safety: this function makes
 * **ZERO network calls**. No `fetch`, no DNS, no CRL pull — everything (the
 * credential, its `x5c` leaf, the trust anchor) is in-memory. That is what lets
 * it render in a deployed Vercel build and in a Loom take without flaking.
 *
 * What it does, with no network:
 *  1. Split the SD-JWT VC on `~` → issuer JWT + disclosures (+ optional KB-JWT,
 *     which the issuer-output credential does NOT carry — key binding is added
 *     at OpenID4VP presentation time).
 *  2. Parse the issuer JWT protected header; take `x5c[0]` as the leaf DS cert.
 *  3. Verify the ES256 issuer-JWT signature against that leaf (`jose`
 *     `importX509` → `jwtVerify`). Expiry is made NON-FATAL (the fixture is a
 *     frozen reference artefact) by verifying at a fixed instant inside the
 *     credential's validity window — but the REAL `nbf`/`exp` are still surfaced
 *     and `expired` is computed against the actual wall clock.
 *  4. Chain the leaf to the vendored demo CA via `node:crypto` `X509Certificate`
 *     (`leaf.checkIssued(ca)` + `leaf.verify(ca.publicKey)`). This is a
 *     leaf→CA check only — NO revocation (CRL) check. The CRL lives at
 *     `https://preprod.pki.eudiw.dev/crl/pid_CA_UT_02.crl`; pulling + caching it
 *     is a documented FUTURE hardening (would require a network fetch, so it is
 *     deliberately out of the Tier-1 offline path).
 *  5. Recompute each disclosure's SHA-256 digest (base64url) and match it against
 *     the issuer JWT's `_sd` arrays — top-level and the nested `place_of_birth`
 *     object's own `_sd`. Collect the disclosed claims.
 */

// SERVER-ONLY by convention (matches `src/lib/ai/client.ts` / `src/lib/fit-connect`):
// `node:crypto` + the vendored CA make this Node-runtime only; it must never be
// pulled into the client bundle. `server-only` is not a project dep yet (see
// `src/lib/ai/client.ts`), so enforcement is via this notice, not an import.
import { createHash, X509Certificate } from 'node:crypto';

import { importX509, jwtVerify, type JWTPayload } from 'jose';

import { PID_ISSUER_CA_UT_02_PEM } from './fixtures';
import {
  MANDATORY_PID_ATTRS,
  type DisclosedPidClaims,
  type MandatoryPidAttr,
  type PidVerificationResult,
  type PlaceOfBirth,
  type VerifyPidOptions,
} from './types';

/* ───────────────────────── base64url helpers (no deps) ───────────────────── */

function base64urlDecodeToString(segment: string): string {
  return Buffer.from(segment, 'base64url').toString('utf8');
}

function base64urlDecodeJson<T = unknown>(segment: string): T {
  return JSON.parse(base64urlDecodeToString(segment)) as T;
}

/** SHA-256 digest of a disclosure string, base64url-encoded (SD-JWT `_sd` form). */
function sha256Base64url(input: string): string {
  return createHash('sha256').update(input, 'ascii').digest('base64url');
}

/* ───────────────────────── SD-JWT structural parsing ─────────────────────── */

interface IssuerJwtHeader {
  alg?: string;
  typ?: string;
  x5c?: string[];
}

/** Wrap a single-line DER-base64 `x5c[0]` entry into a PEM cert block. */
function x5cToPem(x5cEntry: string): string {
  const lines = x5cEntry.match(/.{1,64}/g)?.join('\n') ?? x5cEntry;
  return `-----BEGIN CERTIFICATE-----\n${lines}\n-----END CERTIFICATE-----\n`;
}

/**
 * A parsed disclosure. SD-JWT defines two forms (IETF SD-JWT draft § 4.2):
 *  - object-property: `[salt, claimName, claimValue]` — referenced from an `_sd`
 *    array; recombines as `claimName: claimValue` in the enclosing object.
 *  - array-element:   `[salt, claimValue]` — referenced from an array entry
 *    `{"...": <digest>}`; recombines as a plain array element.
 */
interface Disclosure {
  raw: string;
  digest: string;
  name?: string; // present only for object-property disclosures
  value: unknown;
}

function parseDisclosure(raw: string): Disclosure {
  const arr = base64urlDecodeJson<unknown[]>(raw);
  const digest = sha256Base64url(raw);
  if (arr.length === 3) return { raw, digest, name: String(arr[1]), value: arr[2] };
  return { raw, digest, value: arr[1] }; // array-element form
}

/**
 * Resolve a node against the disclosure map per the SD-JWT recombination
 * algorithm, recursively: replace `_sd` digests (object-property disclosures)
 * and `{"...": <digest>}` array entries (array-element disclosures) with their
 * disclosed values, marking each used disclosure. A digest that appears in the
 * structure but is NOT in `byDigest` is simply skipped (an undisclosed claim);
 * a disclosure whose digest is referenced nowhere is detected by the caller
 * (it stays unmarked) — that is the tamper signal.
 */
function resolve(
  node: unknown,
  byDigest: Map<string, Disclosure>,
  used: Set<string>,
): unknown {
  if (Array.isArray(node)) {
    const out: unknown[] = [];
    for (const item of node) {
      if (
        item &&
        typeof item === 'object' &&
        !Array.isArray(item) &&
        typeof (item as Record<string, unknown>)['...'] === 'string'
      ) {
        const digest = (item as Record<string, unknown>)['...'] as string;
        const d = byDigest.get(digest);
        if (d) {
          used.add(digest);
          out.push(resolve(d.value, byDigest, used));
        }
        // undisclosed array element → omit
      } else {
        out.push(resolve(item, byDigest, used));
      }
    }
    return out;
  }
  if (node && typeof node === 'object') {
    const obj = node as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(obj)) {
      if (key === '_sd' || key === '_sd_alg') continue;
      out[key] = resolve(val, byDigest, used);
    }
    const sd = obj._sd;
    if (Array.isArray(sd)) {
      for (const digest of sd) {
        if (typeof digest !== 'string') continue;
        const d = byDigest.get(digest);
        if (d && d.name !== undefined) {
          used.add(digest);
          out[d.name] = resolve(d.value, byDigest, used);
        }
        // undisclosed object property → omit
      }
    }
    return out;
  }
  return node;
}

/* ───────────────────────── result builders ──────────────────────────────── */

function fail(reason: string, partial?: Partial<PidVerificationResult>): PidVerificationResult {
  return {
    verified: false,
    reason,
    claims: {},
    mandatoryPresent: [],
    validity: {},
    vct: '',
    alg: '',
    trustAnchorSubject: '',
    chainValid: false,
    expired: false,
    ...partial,
  };
}

function isoFromUnixSeconds(seconds: unknown): string | undefined {
  if (typeof seconds !== 'number' || !Number.isFinite(seconds)) return undefined;
  return new Date(seconds * 1000).toISOString();
}

/** SD-JWT registered/structural members that are not disclosed PID claims. */
const NON_CLAIM_KEYS = new Set([
  'iss',
  'iat',
  'exp',
  'nbf',
  'vct',
  'cnf',
  'status',
  '_sd',
  '_sd_alg',
]);

/**
 * From the fully recombined payload, keep the disclosed PID attributes (and any
 * other disclosed non-registered claims), shaped as {@link DisclosedPidClaims}.
 * `place_of_birth` arrives as a nested object of disclosed sub-claims.
 */
function pickPidClaims(resolved: Record<string, unknown>): DisclosedPidClaims {
  const claims: DisclosedPidClaims = {};
  for (const [key, val] of Object.entries(resolved)) {
    if (NON_CLAIM_KEYS.has(key)) continue;
    if (key === 'place_of_birth' && val && typeof val === 'object') {
      claims.place_of_birth = val as PlaceOfBirth;
    } else {
      (claims as Record<string, unknown>)[key] = val;
    }
  }
  return claims;
}

/* ───────────────────────── public API ───────────────────────────────────── */

/**
 * Verify a PID SD-JWT VC entirely offline. See module header for the full
 * algorithm. Never throws on a malformed token — returns
 * `{ verified: false, reason }` instead, so a UI render can't crash on bad input.
 */
export async function verifyPidSdJwtVc(
  token: string,
  opts: VerifyPidOptions = {},
): Promise<PidVerificationResult> {
  // 1. Structural split. Trailing `~` (no KB-JWT) yields a final empty segment.
  const segments = token.trim().split('~').filter((s) => s.length > 0);
  if (segments.length < 1) return fail('empty-token');
  const [issuerJwt, ...disclosureSegments] = segments;

  // The last segment is a KB-JWT iff it has the 3-part JWS shape (header.payload.sig)
  // AND there is no further disclosure after it. The reference issuer-output
  // credential has none; we tolerate either case (KB verification is a later
  // chunk's concern — Tier-1 verifies the issuer credential only).
  const disclosureRaws = disclosureSegments.filter((s) => s.split('.').length !== 3);

  let header: IssuerJwtHeader;
  let unsafePayload: JWTPayload;
  try {
    const [h, p] = issuerJwt.split('.');
    header = base64urlDecodeJson<IssuerJwtHeader>(h);
    unsafePayload = base64urlDecodeJson<JWTPayload>(p);
  } catch {
    return fail('issuer-jwt-unparseable');
  }

  const alg = header.alg ?? '';
  const vct = typeof unsafePayload.vct === 'string' ? unsafePayload.vct : '';
  const validity = {
    notBefore: isoFromUnixSeconds(unsafePayload.nbf ?? unsafePayload.iat),
    expiresAt: isoFromUnixSeconds(unsafePayload.exp),
  };
  // `expired` is computed against the REAL wall clock — honest, even though we
  // do NOT let it gate `verified`.
  const expired =
    typeof unsafePayload.exp === 'number' && unsafePayload.exp * 1000 < Date.now();

  if (alg !== 'ES256') {
    return fail(`unexpected-alg:${alg || 'none'}`, { alg, vct, validity, expired });
  }
  if (!header.x5c || header.x5c.length === 0) {
    return fail('missing-x5c', { alg, vct, validity, expired });
  }

  const leafPem = x5cToPem(header.x5c[0]);

  // 2 + 3. Verify the ES256 issuer signature against the x5c leaf.
  //
  // Expiry is NON-FATAL: we pin `jwtVerify`'s clock to a fixed instant INSIDE
  // the credential's validity window (iat..exp midpoint) so a frozen, now-expired
  // reference artefact still verifies in a deployed build. The real `exp`/`nbf`
  // are reported separately via `validity`/`expired`. `clockTolerance:Infinity`
  // alone would also work for `exp`, but a fixed `currentDate` is unambiguous and
  // also tolerates an `nbf` slightly in the future on other reference artefacts.
  let chainSubject = '';
  let chainValid = false;
  try {
    const leafKey = await importX509(leafPem, 'ES256');
    const iat = typeof unsafePayload.iat === 'number' ? unsafePayload.iat : undefined;
    const exp = typeof unsafePayload.exp === 'number' ? unsafePayload.exp : undefined;
    const midpoint =
      iat !== undefined && exp !== undefined ? Math.floor((iat + exp) / 2) : iat ?? exp;
    await jwtVerify(issuerJwt, leafKey, {
      algorithms: ['ES256'],
      ...(midpoint !== undefined ? { currentDate: new Date(midpoint * 1000) } : {}),
    });
  } catch (err) {
    const code = (err as { code?: string })?.code;
    return fail(`issuer-signature-invalid${code ? `:${code}` : ''}`, {
      alg,
      vct,
      validity,
      expired,
    });
  }

  // 4. Chain leaf → vendored demo CA (leaf→CA only; NO CRL — see module header).
  try {
    const leafCert = new X509Certificate(leafPem);
    const caCert = new X509Certificate(opts.trustAnchorPem ?? PID_ISSUER_CA_UT_02_PEM);
    chainSubject = caCert.subject.replace(/\r?\n/g, ', ');
    chainValid = leafCert.checkIssued(caCert) && leafCert.verify(caCert.publicKey);
  } catch {
    chainValid = false;
  }

  // 5. Recompute each disclosure's SHA-256 digest, then recombine per the
  //    SD-JWT algorithm: walk the signed payload, replacing `_sd` digests and
  //    `{"...": <digest>}` array entries with the matching disclosure values —
  //    recursively (so the nested `place_of_birth._sd` and the array-element
  //    `nationalities` disclosures resolve too). A disclosure whose digest is
  //    referenced NOWHERE in the resolved structure is unbound to the signed
  //    credential → integrity failure (the tamper signal).
  const byDigest = new Map<string, Disclosure>();
  let sawUnparseableDisclosure = false;
  for (const raw of disclosureRaws) {
    try {
      const d = parseDisclosure(raw);
      byDigest.set(d.digest, d);
    } catch {
      sawUnparseableDisclosure = true;
    }
  }

  const used = new Set<string>();
  const resolved = resolve(unsafePayload, byDigest, used) as Record<string, unknown>;
  // Every presented disclosure MUST have been consumed by the recombination.
  // A leftover (digest matches nothing in the signed structure) means the
  // disclosure was forged/swapped → not bound to the issuer signature.
  const sawUnmatchedDisclosure =
    sawUnparseableDisclosure || used.size !== byDigest.size;

  const claims: DisclosedPidClaims = sawUnmatchedDisclosure
    ? {}
    : pickPidClaims(resolved);

  const mandatoryPresent = MANDATORY_PID_ATTRS.filter(
    (attr) => claims[attr] !== undefined,
  ) as MandatoryPidAttr[];

  // `verified` = issuer signature OK (we got here) AND every disclosure was
  // bound to the signed credential. Chain validity and expiry are reported but
  // do NOT gate the headline.
  const verified = !sawUnmatchedDisclosure;

  return {
    verified,
    ...(verified ? {} : { reason: 'disclosure-digest-mismatch' }),
    claims,
    mandatoryPresent,
    validity,
    vct,
    alg,
    trustAnchorSubject: chainSubject,
    chainValid,
    expired,
  };
}
