/**
 * EUDI Tier-1 CORE — shared types for the offline SD-JWT VC verifier.
 * SERVER-ONLY (the verifier touches `node:crypto` X509 + `jose`).
 *
 * Honest framing — `[reference-ecosystem]`: every artefact this module verifies
 * is from the EU Digital Identity *reference / development* ecosystem
 * (issuer.eudiw.dev, the demo IACA `PID Issuer CA - UT 02`, a synthetic FormEU
 * test identity). It is NOT a German-state credential, NOT eIDAS-trusted, NOT
 * production. The German EUDI Wallet is `[ZUKUNFT]` (2 Jan 2027). Nothing here
 * implies state-level or production verification.
 */

/** The five ARF-mandatory PID attributes (EUDI ARF, PID rulebook). */
export const MANDATORY_PID_ATTRS = [
  'family_name',
  'given_name',
  'birthdate',
  'place_of_birth',
  'nationalities',
] as const;

export type MandatoryPidAttr = (typeof MANDATORY_PID_ATTRS)[number];

/** Nested `place_of_birth` shape (each sub-claim is itself selectively disclosed). */
export interface PlaceOfBirth {
  country?: string;
  region?: string;
  locality?: string;
}

/**
 * The PID claims that were actually *disclosed* by the presented SD-JWT VC.
 * Only attributes whose disclosure was present AND whose SHA-256 digest matched
 * an `_sd` entry appear here. Everything is optional — a holder may present a
 * subset (selective disclosure is the whole point).
 */
export interface DisclosedPidClaims {
  family_name?: string;
  given_name?: string;
  birthdate?: string;
  place_of_birth?: PlaceOfBirth;
  /** Nationalities as ISO 3166-1 alpha-2 codes, e.g. `['DE']`. */
  nationalities?: string[];
  // Non-mandatory PID attributes that may also be disclosed.
  date_of_issuance?: string;
  date_of_expiry?: string;
  issuing_authority?: string;
  issuing_country?: string;
  /** Any further disclosed claims we don't model explicitly. */
  [key: string]: unknown;
}

/** Validity window read from the issuer JWT (`nbf`/`iat` and `exp`). */
export interface CredentialValidity {
  /** ISO-8601; from `nbf`, falling back to `iat`. Informational. */
  notBefore?: string;
  /** ISO-8601; from `exp`. Informational — expiry is NON-FATAL (see verify.ts). */
  expiresAt?: string;
}

/**
 * Result of {@link verifyPidSdJwtVc}. This is the exact shape the UI chunk
 * consumes. `verified` is the headline: issuer signature valid AND every
 * presented disclosure digest matched an `_sd` entry. `chainValid` is reported
 * separately (leaf → vendored demo CA). Expiry is surfaced honestly via
 * `expired` + `validity` but never flips `verified` to false on its own.
 */
export interface PidVerificationResult {
  /** Signature valid + all disclosure digests matched. Expiry does NOT gate this. */
  verified: boolean;
  /** Present only when `verified === false`: a short machine-ish reason. */
  reason?: string;
  /** The disclosed PID claims (selective-disclosure subset). */
  claims: DisclosedPidClaims;
  /** Which of the 5 ARF-mandatory attrs were disclosed AND digest-matched. */
  mandatoryPresent: MandatoryPidAttr[];
  /** Validity window (informational; see `expired`). */
  validity: CredentialValidity;
  /** The credential type, e.g. `urn:eudi:pid:1`. */
  vct: string;
  /** Issuer JWT signing algorithm, e.g. `ES256`. */
  alg: string;
  /** Subject DN of the trust anchor the leaf chained to (the demo CA). */
  trustAnchorSubject: string;
  /** Leaf cert chains to the vendored demo CA (leaf→CA, no CRL — see verify.ts). */
  chainValid: boolean;
  /** True if `exp` is in the past at verification time. Informational only. */
  expired: boolean;
}

/** Options for {@link verifyPidSdJwtVc}. */
export interface VerifyPidOptions {
  /**
   * Override the trust anchor (PEM). Defaults to the vendored demo CA
   * `PID Issuer CA - UT 02`. Provided for tests / alternate reference anchors.
   */
  trustAnchorPem?: string;
}
