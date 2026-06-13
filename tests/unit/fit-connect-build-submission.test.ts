/**
 * FIT-Connect Tier-1 `buildSubmission` — schema-valid, offline, deterministic
 * (Spec § 6.3, § 7, § 12, § 13.2; guards "a Tier-1 schema fail in CI is a build
 * bug", Spec § 3).
 *
 * Asserts, for each of the three Block-D `behoerdeId`s, that the receipt:
 *   - is schema-valid against the vendored 2.1.0 schema (`schemaValid === true`),
 *   - is `tier === 1` with `mockDestination === true`,
 *   - carries a non-empty `jwePreview.compactExcerpt` (RSA-OAEP-256 / A256GCM),
 *   - sets `levelOfAssurance` to eIDAS LoA-high,
 *   - renders the leikaKey placeholder as NOT catalogue-confirmed,
 *   - and is produced WITHOUT any network call (fetch is trip-wired).
 */
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { buildSubmission } from '@/lib/fit-connect';
import {
  BLOCK_D_PLACEHOLDER_LEIKA_KEYS,
  EIDAS_LOA_HIGH,
} from '@/lib/fit-connect/config';
import type {
  FitConnectBehoerdeId,
  FitConnectSubmissionInput,
} from '@/types/fit-connect';

const BLOCK_D_IDS: FitConnectBehoerdeId[] = [
  'kfz-berlin-labo',
  'familienkasse-berlin-brandenburg',
  'abh-berlin-lea',
];

function inputFor(behoerdeId: FitConnectBehoerdeId): FitConnectSubmissionInput {
  return {
    behoerdeId,
    leikaKey: BLOCK_D_PLACEHOLDER_LEIKA_KEYS[behoerdeId],
    leikaKeyConfirmed: false,
    datenkategorien: ['anschrift', 'name'],
    loa: 'high',
  };
}

/* ── Network trip-wire — Tier-1 must make NO network call ───────────────────── */

let networkAttempts: string[];

beforeEach(() => {
  networkAttempts = [];
  vi.stubGlobal(
    'fetch',
    vi.fn((...args: unknown[]) => {
      networkAttempts.push(`fetch:${String(args[0])}`);
      throw new Error('NETWORK_CALL_IN_TIER1');
    }),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('FIT-Connect Tier-1 buildSubmission — Block-D rows', () => {
  for (const behoerdeId of BLOCK_D_IDS) {
    test(`${behoerdeId}: schema-valid, tier 1, mockDestination, offline`, async () => {
      const receipt = await buildSubmission(inputFor(behoerdeId));

      expect(receipt.schemaValid).toBe(true);
      expect(receipt.tier).toBe(1);
      expect(receipt.mockDestination).toBe(true);

      // JWE preview present + correct crypto params.
      expect(receipt.jwePreview.compactExcerpt.length).toBeGreaterThan(0);
      expect(receipt.jwePreview.alg).toBe('RSA-OAEP-256');
      expect(receipt.jwePreview.enc).toBe('A256GCM');

      // eIDAS LoA-high (our schema-allowed choice).
      expect(receipt.metadataPreview.levelOfAssurance).toBe(EIDAS_LOA_HIGH);
      expect(receipt.metadataPreview.schemaVersion).toBe('2.1.0');
      expect(receipt.metadataPreview.publicServiceIdentifier).toBe(
        BLOCK_D_PLACEHOLDER_LEIKA_KEYS[behoerdeId],
      );
      expect(receipt.metadataPreview.announcedAttachments).toBeGreaterThan(0);

      // Placeholder leikaKey is honestly NOT catalogue-confirmed.
      expect(receipt.routing.leikaKeyConfirmed).toBe(false);
      expect(receipt.routing.leikaKey).toBe(
        BLOCK_D_PLACEHOLDER_LEIKA_KEYS[behoerdeId],
      );

      // Never the docs example key.
      expect(receipt.routing.leikaKey).not.toContain('99123456760610');

      // No network call happened.
      expect(networkAttempts).toEqual([]);
    });
  }

  test('output is deterministic across runs (same input ⇒ same metadata preview)', async () => {
    const a = await buildSubmission(inputFor('kfz-berlin-labo'));
    const b = await buildSubmission(inputFor('kfz-berlin-labo'));
    expect(a.metadataPreview).toEqual(b.metadataPreview);
    expect(a.routing).toEqual(b.routing);
    expect(networkAttempts).toEqual([]);
  });

  test('no docs example key leaks for any Block-D row', async () => {
    for (const id of BLOCK_D_IDS) {
      const r = await buildSubmission(inputFor(id));
      expect(JSON.stringify(r)).not.toContain('99123456760610');
    }
  });
});
