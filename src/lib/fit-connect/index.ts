/**
 * FIT-Connect adapter — public surface (Spec § 6.2 `index.ts`). SERVER-ONLY.
 *
 *  - `buildSubmission(input)`     → Tier-1: offline, deterministic, schema-validated
 *                                   wire-form. ALWAYS in the deployed build.
 *  - `sendLiveSubmission(input)`  → Tier-2: flag-gated real round-trip. If
 *                                   `FIT_CONNECT_LIVE` is unset OR creds are
 *                                   missing → graceful fallback to Tier-1
 *                                   (no crash, no secret in logs).
 *
 * The Block-D success handler (via the `submitViaFitConnect` server action)
 * calls these. Only the three Block-D rows ever reach here (the input type is
 * pinned to those ids).
 */

import {
  ANCHOR_LEIKA_KEY,
  EIDAS_LOA_HIGH,
  JWE_CRYPTO,
  MOCK_ARS,
  readTier2Env,
} from './config';
import { encryptThreeDatasets } from './jwe';
import { buildMetadata, deterministicUuidV4 } from './metadata';
import { validateMetadata } from './schema';
import type {
  FitConnectReceipt,
  FitConnectSubmissionInput,
} from '@/types/fit-connect';

/** Human-readable Leistung name per Block-D row (display only). */
const LEISTUNG_NAME: Record<FitConnectSubmissionInput['behoerdeId'], string> = {
  'kfz-berlin-labo': 'i-Kfz Adressänderung',
  'familienkasse-berlin-brandenburg': 'Kindergeld Veränderungsmitteilung',
  'abh-berlin-lea': 'Aufenthaltstitel Adressänderung',
};

/**
 * Tier-1: build a standards-true, schema-validated FIT-Connect submission
 * wire-form. **No network call.** Deterministic for a given input (UUIDs/hashes
 * derived from `behoerdeId`). The destination is the synthetic
 * `[MOCK destination]` — `mockDestination` is structurally `true`.
 */
export async function buildSubmission(
  input: FitConnectSubmissionInput,
): Promise<FitConnectReceipt> {
  const seed = `fit-connect:${input.behoerdeId}`;
  const leistungName = LEISTUNG_NAME[input.behoerdeId];

  // Block-D: at least one announced attachment (the generated Antragsform PDF).
  const announcedAttachmentCount = 1;

  const { metadata, announcedAttachmentIds } = buildMetadata({
    seed,
    leikaKey: input.leikaKey,
    leistungName,
    announcedAttachmentCount,
    datenkategorien: input.datenkategorien,
  });

  // Schema validation against the vendored 2.1.0 schema (offline).
  const { valid } = validateMetadata(metadata);

  // Three separate JWE (metadata / Fachdaten / attachments) — Research § D.
  const fachdaten = { datenkategorien: input.datenkategorien, mock: true };
  const { metadata: metadataJwe } = await encryptThreeDatasets({
    metadata,
    fachdaten,
    attachments: announcedAttachmentIds.map((id) => ({ attachmentId: id, mock: true })),
  });

  return {
    tier: 1,
    mockDestination: true,
    routing: {
      leikaKey: input.leikaKey,
      leikaKeyConfirmed: input.leikaKeyConfirmed,
      ars: input.ars ?? MOCK_ARS,
      destinationId: `mock-destination:${input.behoerdeId}`,
    },
    metadataPreview: {
      publicServiceIdentifier: input.leikaKey,
      levelOfAssurance: EIDAS_LOA_HIGH,
      schemaVersion: '2.1.0',
      announcedAttachments: announcedAttachmentIds.length,
    },
    jwePreview: {
      alg: JWE_CRYPTO.alg,
      enc: JWE_CRYPTO.enc,
      compactExcerpt: metadataJwe.excerpt,
    },
    schemaValid: valid,
  };
}

/**
 * Tier-2: live TEST round-trip — flag-gated, off the deployed build.
 *
 * Gracefully falls back to `buildSubmission` (Tier-1) when `FIT_CONNECT_LIVE`
 * is unset OR creds are missing (Spec § 12). The real round-trip lives in
 * `sdk-tier2.ts` behind a dynamic import so `@fitko/fit-connect` is NEVER
 * resolved at build time. Never logs or returns secret material; on sandbox
 * failure returns a Tier-2 receipt with `status: 'error'` (NOT framed as a real
 * Behörde failing — it is the TEST sandbox / our own destination).
 */
export async function sendLiveSubmission(
  input: FitConnectSubmissionInput,
): Promise<FitConnectReceipt> {
  const env = readTier2Env();
  if (!env.enabled) {
    // Graceful, silent fallback — no error UI, no secret-hinting log.
    return buildSubmission(input);
  }

  try {
    // Dynamic, build-time-invisible import (see sdk-tier2.ts).
    const { runLiveSubmission } = await import('./sdk-tier2');
    return await runLiveSubmission(input, {
      clientId: env.clientId!,
      clientSecret: env.clientSecret!,
    });
  } catch {
    // Never surface secrets or the underlying error detail.
    const base = await buildSubmission(input);
    return {
      ...base,
      tier: 2,
      status: 'error',
      submissionId: deterministicUuidV4(`tier2-error:${input.behoerdeId}`),
    };
  }
}

export { ANCHOR_LEIKA_KEY };
