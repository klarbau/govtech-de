/**
 * Shared types for the FIT-Connect submission adapter (Spec § 7).
 *
 * These are the public input/output shapes of the server action
 * `submitViaFitConnect`. The frontend (InlineCascade / FitConnectReceiptPanel)
 * imports `FitConnectReceipt`; the Block-D success handler builds a
 * `FitConnectSubmissionInput`.
 *
 * Honesty markers are STRUCTURAL: `mockDestination` is the literal `true` —
 * there is no code path in this demo that addresses a real Behörde
 * (Spec § 13.2 #4). `leikaKeyConfirmed === false` for the three Block-D rows,
 * because their LeiKa keys are not catalogue-confirmed (Domain § 7).
 */

import type { EIDAS_LOA_HIGH } from '@/lib/fit-connect/config';

/**
 * The three — and ONLY three — Block-D rows that may legitimately carry a
 * FIT-Connect submission (Domain § 5 Layer D, Spec § 13.2 #5): i-Kfz,
 * Familienkasse, Ausländerbehörde. The input type is structurally pinned to
 * these ids so no register/consent row can be submitted by accident.
 */
export type FitConnectBehoerdeId =
  | 'kfz-berlin-labo'
  | 'familienkasse-berlin-brandenburg'
  | 'abh-berlin-lea';

export interface FitConnectSubmissionInput {
  behoerdeId: FitConnectBehoerdeId;
  /** LeiKa placeholder string from Spec § 6.5 — NEVER invented. */
  leikaKey: string;
  /** `false` for the Block-D rows → UI renders "nicht aus dem Katalog bestätigt". */
  leikaKeyConfirmed: boolean;
  /** Data categories from the step (Datenminimierung). */
  datenkategorien: string[];
  /** Amtlicher Regionalschlüssel (synthetic / `[MOCK]`). */
  ars?: string;
  /** eIDAS LoA — our schema-valid choice. Always `high` in this demo. */
  loa: 'high';
}

/**
 * The MINIMAL, serializable input the CLIENT passes to the `submitViaFitConnect`
 * server action (Spec § 6.6 client-safety). The client never knows the LeiKa
 * placeholder, its catalogue-confirmed flag, the ARS, or the LoA — those are
 * derived SERVER-side from `behoerdeId` (via the config placeholder map), so no
 * server-only module is ever pulled into the client bundle. `datenkategorien`
 * carries the step's Datenminimierung set.
 */
export interface FitConnectClientInput {
  behoerdeId: FitConnectBehoerdeId;
  datenkategorien: string[];
}

export interface FitConnectReceipt {
  tier: 1 | 2;
  /** Structural honesty marker — ALWAYS `true` in this demo (Spec § 7). */
  mockDestination: true;
  routing: {
    leikaKey: string;
    leikaKeyConfirmed: boolean;
    ars?: string;
    /** Synthetic destination id (Tier-1) / real TEST destination id (Tier-2). */
    destinationId?: string;
  };
  /** Schema-validated metadata, abbreviated for display. */
  metadataPreview: {
    publicServiceIdentifier: string;
    levelOfAssurance: typeof EIDAS_LOA_HIGH;
    schemaVersion: '2.1.0';
    announcedAttachments: number;
  };
  /** Rendered wire excerpt of the metadata JWE Compact Serialization. */
  jwePreview: {
    alg: 'RSA-OAEP-256';
    enc: 'A256GCM';
    /** First/last N chars of the JWE Compact Serialization. */
    compactExcerpt: string;
  };
  /** Ajv result against the vendored 2.1.0 schema (Tier-1). */
  schemaValid: boolean;
  /* ── Tier-2 only ───────────────────────────────────────────────────────── */
  submissionId?: string;
  caseId?: string;
  status?: 'submitted' | 'received' | 'error';
}
