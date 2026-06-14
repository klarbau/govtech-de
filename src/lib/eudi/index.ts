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
 *  - `REFERENCE_PID_SD_JWT_VC` → the vendored real reference credential.
 */

export { verifyPidSdJwtVc } from './verify';
export {
  REFERENCE_PID_SD_JWT_VC,
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
} from './types';
