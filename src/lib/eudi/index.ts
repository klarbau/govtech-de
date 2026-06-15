/**
 * EUDI Tier-1 CORE — public surface. SERVER-ONLY.
 *
 * `[reference-ecosystem]`: an OFFLINE SD-JWT VC verifier for an EU Digital
 * Identity *reference / development* PID, checked against the *development* demo
 * IACA. NOT German-state, NOT eIDAS-trusted, NOT production. The German EUDI
 * Wallet is `[ZUKUNFT]` (2 Jan 2027).
 *
 *  - `verifyPidSdJwtVc(token, opts?)` → fully offline (ZERO network) issuer-
 *    signature + leaf→CA chain + disclosure-digest verification. Always safe in
 *    the deployed build.
 *  - `pidSdJwtVcForPersona(personaId)` → the active persona's vendored real PID
 *    (each demo persona has its own pre-issued reference credential), falling
 *    back to `REFERENCE_PID_SD_JWT_VC` (Erika) for an unknown id.
 *  - `PID_SD_JWT_VC_BY_PERSONA` → the personaId → credential registry.
 *  - `REFERENCE_PID_SD_JWT_VC` → the default vendored real reference credential.
 */

export { verifyPidSdJwtVc } from './verify';
export {
  REFERENCE_PID_SD_JWT_VC,
  PID_SD_JWT_VC_BY_PERSONA,
  pidSdJwtVcForPersona,
  PID_ISSUER_CA_UT_02_PEM,
} from './fixtures';
export {
  MANDATORY_PID_ATTRS,
  type DisclosedPidClaims,
  type MandatoryPidAttr,
  type PidVerificationResult,
  type PlaceOfBirth,
  type CredentialValidity,
  type VerifyPidOptions,
  // Verifiable Once-Only (additive)
  MELDEBESTAETIGUNG_FIELDS,
  type MeldebestaetigungField,
  type MeldebestaetigungVerificationResult,
} from './types';

/**
 * Verifiable Once-Only — Demo-Issuer surface. SERVER-ONLY. `[reference-ecosystem]`
 * + `[ZUKUNFT]`: mints + re-verifies the amtliche Meldebestätigung (§ 24 Abs. 2
 * BMG) credential offline with the synthetic Demo-CA — FORMAT real, AUTHORITY
 * Demo. See `issue.ts` / `meldebestaetigung-readout.ts` / `once-only-issuer.ts`.
 */
export {
  issueMeldebestaetigungSdJwtVc,
  issueMeldebestaetigungForPersona,
  MELDEBESTAETIGUNG_VCT,
  MELDEBESTAETIGUNG_ISS,
  type MeldebestaetigungClaims,
  type IssueOptions,
  type PersonaMeldeContext,
} from './issue';
export { toMeldebestaetigungReadout } from './meldebestaetigung-readout';
export {
  DEMO_ONCE_ONLY_CA_PEM,
  DEMO_ONCE_ONLY_LEAF_PEM,
  DEMO_ONCE_ONLY_LEAF_X5C_DER_B64,
} from './fixtures/once-only-issuer';
