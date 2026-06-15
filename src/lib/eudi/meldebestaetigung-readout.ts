/**
 * Verifiable Once-Only — claim-mapper / readout adapter (§6d, C4). SERVER-ONLY.
 *
 * The "presentation-dirty" layer that translates the claim-agnostic
 * {@link PidVerificationResult} into a credential-appropriate Meldebestätigung
 * readout — WITHOUT touching the verifier. It reads the 8 § 24 Abs. 2 BMG fields
 * out of `result.claims` (the verifier keeps any disclosed non-PID claim via the
 * `[key]: unknown` fallback in `DisclosedPidClaims` / `pickPidClaims`, verified
 * in `verify.ts`), and passes `verified` / `chainValid` / `expired` / `validity`
 * / `vct` / `alg` / `trustAnchorSubject` straight through.
 *
 * It NEVER consumes `result.mandatoryPresent` / `MANDATORY_PID_ATTRS` — that is
 * PID-specific (C4), so the "X von 5 PID-Pflichtattributen" readout can never be
 * pointed at this credential. The fields here are the 8 Meldebestätigung fields.
 */
import {
  MELDEBESTAETIGUNG_FIELDS,
  type MeldebestaetigungField,
  type MeldebestaetigungVerificationResult,
  type PidVerificationResult,
} from './types';

/**
 * Map the raw verifyPidSdJwtVc result to the Meldebestätigung readout.
 *
 * `presentFields` = the subset of the 8 fields that were disclosed (present as a
 * non-empty string in `result.claims`) AND therefore digest-matched (the
 * verifier only populates `claims` when EVERY presented disclosure bound to the
 * signed `_sd`, so a disclosed value here is implicitly digest-matched).
 *
 * `totalFields` = 8 (the full mandatory set). `doktorgrad` is optional and does
 * NOT count against completeness — when it is absent the UI honestly shows
 * "7 von 8" (no rounding up). The label is NEVER "PID-Pflichtattribute" (C4).
 */
export function toMeldebestaetigungReadout(
  result: PidVerificationResult,
): MeldebestaetigungVerificationResult {
  const fields: Partial<Record<MeldebestaetigungField, string>> = {};
  const presentFields: MeldebestaetigungField[] = [];

  for (const field of MELDEBESTAETIGUNG_FIELDS) {
    const raw = (result.claims as Record<string, unknown>)[field];
    if (typeof raw === 'string' && raw.length > 0) {
      fields[field] = raw;
      presentFields.push(field);
    }
  }

  return {
    verified: result.verified,
    ...(result.reason !== undefined ? { reason: result.reason } : {}),
    chainValid: result.chainValid,
    expired: result.expired,
    validity: {
      ...(result.validity.notBefore !== undefined
        ? { notBefore: result.validity.notBefore }
        : {}),
      ...(result.validity.expiresAt !== undefined
        ? { expiresAt: result.validity.expiresAt }
        : {}),
    },
    vct: result.vct,
    alg: result.alg,
    trustAnchorSubject: result.trustAnchorSubject,
    fields,
    presentFields,
    totalFields: MELDEBESTAETIGUNG_FIELDS.length, // 8
  };
}
