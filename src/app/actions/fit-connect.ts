'use server';

/**
 * Server action: `submitViaFitConnect` (Spec § 7). SERVER-ONLY.
 *
 * The Block-D success handler in `InlineCascade.tsx` calls this after a "Mit
 * eID bestätigen" tap on one of the three FIT-Connect rows. We prefer a server
 * action over a public route (Spec § 7): no public HTTP endpoint, less attack
 * surface, directly importable from the client component.
 *
 * Discipline (mirrors `src/app/api/assistant/route.ts`): server-only secret
 * access via `process.env`, stateless (no server-stateful store — the resolved
 * Vercel risk), no PII echoed in errors. Tier-1 is offline & deterministic;
 * Tier-2 is flag-gated and falls back gracefully when creds are absent.
 */

import {
  buildSubmission,
  sendLiveSubmission,
} from '@/lib/fit-connect';
import {
  BLOCK_D_PLACEHOLDER_LEIKA_KEYS,
  MOCK_ARS,
  readTier2Env,
} from '@/lib/fit-connect/config';
import type {
  FitConnectClientInput,
  FitConnectReceipt,
  FitConnectSubmissionInput,
} from '@/types/fit-connect';

/** Block-D ids that may legitimately submit via FIT-Connect (Spec § 13.2 #5). */
const ALLOWED_BEHOERDE_IDS: ReadonlySet<FitConnectSubmissionInput['behoerdeId']> =
  new Set([
    'kfz-berlin-labo',
    'familienkasse-berlin-brandenburg',
    'abh-berlin-lea',
  ]);

/**
 * Build (Tier-1) or send (Tier-2, flag-gated) a FIT-Connect submission for one
 * Block-D row, returning the receipt the panel renders.
 *
 * The CLIENT passes only `{ behoerdeId, datenkategorien }` (Spec § 6.6
 * client-safety) — the LeiKa placeholder, its catalogue-confirmed flag, the ARS
 * and the LoA are derived HERE, server-side, from `behoerdeId` via the config
 * placeholder map. No server-only module is ever pulled into the client bundle.
 *
 * Defensive guard: a non-Block-D id is rejected before any build runs — only
 * the three legitimate rows ever reach the adapter (Spec § 12 edge case).
 */
export async function submitViaFitConnect(
  input: FitConnectClientInput,
): Promise<FitConnectReceipt> {
  if (!ALLOWED_BEHOERDE_IDS.has(input.behoerdeId)) {
    // No PII, no leikaKey echo — just refuse the off-list id.
    throw new Error('FIT_CONNECT_BEHOERDE_NOT_ELIGIBLE');
  }

  // Server-side derivation: the LeiKa key is the §6.5 placeholder (never
  // invented, never catalogue-confirmed for rows 7–9); the ARS is the synthetic
  // [MOCK] Berlin value; the LoA is always our schema-allowed `high`.
  const submission: FitConnectSubmissionInput = {
    behoerdeId: input.behoerdeId,
    leikaKey: BLOCK_D_PLACEHOLDER_LEIKA_KEYS[input.behoerdeId],
    leikaKeyConfirmed: false,
    datenkategorien: input.datenkategorien,
    ars: MOCK_ARS,
    loa: 'high',
  };

  // Tier-2 only when the flag + creds are present; otherwise Tier-1 (offline,
  // deterministic). `sendLiveSubmission` itself falls back if creds are absent,
  // but we branch here to keep the Tier-1 path free of any env read on the hot
  // path of the deployed build.
  return readTier2Env().enabled
    ? sendLiveSubmission(submission)
    : buildSubmission(submission);
}
