/**
 * FIT-Connect metadata builder (Spec § 6.2).
 *
 * Builds a FIT-Connect **metadata** object that validates against the vendored
 * 2.1.0 schema (`schema/metadata-2.1.0.schema.json`). SERVER-ONLY.
 *
 * Schema notes (verified against the vendored 2.1.0 schema):
 *  - Top-level required = `$schema` + `contentStructure`. `additionalProperties`
 *    is undefined ⇒ extra top-level properties (e.g. `publicService`) are
 *    permitted, so we carry the LeiKa Leistungsidentifikator on
 *    `publicService.identifier` (the shape FITKO worked-examples use) AND model
 *    the eID identification report as a `dataSets[]` entry whose `schema.schemaUri`
 *    is the Governikus IdentificationReport 2.0.0 (Spec § 6.6 — the eID hook).
 *  - `contentStructure.data.hash` + each attachment `hash` require sha512 hex
 *    (`^[a-f0-9]{128}$`).
 *  - `attachmentId` / `dataSetId` are UUIDv4 (`format: uuid`).
 *
 * Determinism (Spec § 6.2): UUIDs and hashes are derived **deterministically**
 * from the input so `buildSubmission` is reproducible and the unit test can
 * assert schema-validity offline without flake. They are still format-valid
 * UUIDv4 / sha512-hex strings.
 */

import { createHash } from 'node:crypto';

import {
  EIDAS_LOA_HIGH,
  IDENTIFICATION_REPORT_SCHEMA_URI,
  METADATA_SCHEMA_URL,
  METADATA_SCHEMA_VERSION,
} from './config';

/* ───────────────────────── deterministic primitives ────────────────────── */

/** sha512 hex of a string — matches the schema `^[a-f0-9]{128}$` hash pattern. */
export function sha512Hex(input: string): string {
  return createHash('sha512').update(input, 'utf8').digest('hex');
}

/**
 * Deterministically derive a format-valid UUIDv4 from a seed.
 *
 * We hash the seed and lay the digest into the canonical 8-4-4-4-12 layout,
 * forcing the version nibble to `4` and the variant nibble to `8…b`. The result
 * is a stable, schema-`format:uuid`-valid string for a given seed — which keeps
 * `buildSubmission` deterministic (no `crypto.randomUUID()` randomness leaking
 * into the test).
 */
export function deterministicUuidV4(seed: string): string {
  const h = createHash('sha256').update(seed, 'utf8').digest('hex'); // 64 hex chars
  const variantNibble = ((parseInt(h[16], 16) & 0x3) | 0x8).toString(16); // 8,9,a,b
  return [
    h.slice(0, 8),
    h.slice(8, 12),
    `4${h.slice(13, 16)}`, // version 4
    `${variantNibble}${h.slice(17, 20)}`,
    h.slice(20, 32),
  ].join('-');
}

/* ───────────────────────── metadata shape ──────────────────────────────── */

export interface BuildMetadataArgs {
  /** Stable seed so UUIDs/hashes are deterministic across runs (e.g. behoerdeId). */
  seed: string;
  /** LeiKa Leistungsidentifikator (placeholder for Block-D rows — § 6.5). */
  leikaKey: string;
  /** Human-readable Leistung name for `publicService.name`. */
  leistungName: string;
  /** Number of announced attachments (UUIDv4 list). */
  announcedAttachmentCount: number;
  /** Datenminimierung categories carried in the (synthetic) Fachdaten ref. */
  datenkategorien: string[];
}

/** The metadata object plus the announced-attachment UUIDs (used by the JWE step). */
export interface BuiltMetadata {
  metadata: Record<string, unknown>;
  announcedAttachmentIds: string[];
  /** UUID of the identification-report dataSet (the eID hook). */
  identificationDataSetId: string;
}

/**
 * Build the FIT-Connect metadata object. Deterministic for a given `args.seed`.
 */
export function buildMetadata(args: BuildMetadataArgs): BuiltMetadata {
  const { seed, leikaKey, leistungName, datenkategorien } = args;
  const announcedCount = Math.max(0, args.announcedAttachmentCount);

  const announcedAttachmentIds = Array.from({ length: announcedCount }, (_, i) =>
    deterministicUuidV4(`${seed}:attachment:${i}`),
  );

  const identificationDataSetId = deterministicUuidV4(`${seed}:identification`);

  // Synthetic Fachdaten payload — Datenminimierung categories only, no PII.
  const fachdaten = { datenkategorien, mock: true };
  const fachdatenHash = sha512Hex(JSON.stringify(fachdaten));

  const attachments = announcedAttachmentIds.map((attachmentId, i) => ({
    hash: { type: 'sha512', content: sha512Hex(`${seed}:attachment-content:${i}`) },
    purpose: i === 0 ? 'form' : 'attachment',
    mimeType: 'application/pdf',
    attachmentId,
  }));

  // The eID hook: identification report as a dataSet whose schemaUri is the
  // Governikus IdentificationReport 2.0.0, carrying our schema-valid LoA/high.
  const identificationContent = {
    levelOfAssurance: EIDAS_LOA_HIGH,
    mock: true,
  };

  const metadata: Record<string, unknown> = {
    $schema: METADATA_SCHEMA_URL,
    // Extra top-level property (schema permits it): the Leistungsidentifikator.
    publicService: {
      identifier: leikaKey,
      name: leistungName,
    },
    contentStructure: {
      data: {
        hash: { type: 'sha512', content: fachdatenHash },
        submissionSchema: {
          // Synthetic Fachdaten schema reference — never claims to be reachable.
          schemaUri:
            'https://schema.example/govtech-de-demo/fachdaten/1.0.0/schema.json',
          mimeType: 'application/json',
        },
      },
      attachments,
    },
    author: {
      name: 'GovTech DE Demo',
      description:
        'Speculative-design prototype — [MOCK destination], TEST environment only.',
      product: {
        name: 'govtech-de-fit-connect-adapter',
        version: '1.0.0',
        manufacturer: 'GovTech DE Demo [MOCK]',
      },
    },
    dataSets: [
      {
        dataSetId: identificationDataSetId,
        schema: {
          schemaUri: IDENTIFICATION_REPORT_SCHEMA_URI,
          mimeType: 'application/jose',
        },
        hash: {
          type: 'sha512',
          content: sha512Hex(JSON.stringify(identificationContent)),
        },
        description:
          'Synthetic Governikus IdentificationReport (eID). LoA/high is our schema-allowed choice [MOCK].',
        content: identificationContent,
      },
    ],
  };

  return { metadata, announcedAttachmentIds, identificationDataSetId };
}

/** Re-export the pinned version for callers building the receipt preview. */
export { METADATA_SCHEMA_VERSION };
