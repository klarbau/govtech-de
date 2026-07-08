/**
 * „Unter der Haube" (unter-der-haube.md § 5) — the honesty invariants of the
 * pure feed-mapping logic, tested in the repo's node env (no DOM).
 *
 * These guard the structural-honesty rules the reviewer checks (§ 11):
 *   (a) a Tier-1 / absent receipt reveals NO micro-beat (Demo-Modus byte-identical),
 *   (b) `beat_confirmed` renders ONLY on `live.setVerified === true`, else the
 *       terminal stage is `beat_pending_ack` (never a false „verifiziert"),
 *   (c) a mock-bus `autopilot_step` maps to an `origin: 'sim'` line and NEVER an
 *       `origin: 'real'` line — real lines exist only with a Tier-2 receipt.
 */
import { describe, expect, test } from 'vitest';

import {
  microBeatStages,
  mockEventToSimLine,
  receiptRealLineDescriptors,
} from '@/components/autopilot/protokoll-haube';
import type { FitConnectReceipt } from '@/types/fit-connect';
import type { AutopilotStep, MockBackendEvent } from '@/types';

function receipt(overrides: Partial<FitConnectReceipt> = {}): FitConnectReceipt {
  return {
    tier: 2,
    mockDestination: true,
    routing: { leikaKey: 'urn:x', leikaKeyConfirmed: false },
    metadataPreview: {
      publicServiceIdentifier: 'urn:x',
      levelOfAssurance: 'http://eidas.europa.eu/LoA/high',
      schemaVersion: '2.1.0',
      announcedAttachments: 1,
    },
    jwePreview: { alg: 'RSA-OAEP-256', enc: 'A256GCM', compactExcerpt: 'eyJ…abc' },
    schemaValid: true,
    ...overrides,
  };
}

function stepEvent(overrides: Partial<AutopilotStep> = {}): MockBackendEvent {
  return {
    type: 'autopilot_step',
    vorgangId: 'v-1',
    step: {
      id: 'step-kfz',
      behoerde_id: 'kfz-berlin-labo',
      block: 'D',
      aktion: 'Adressänderung i-Kfz',
      rechtsgrundlage: '§ 13 FZV',
      status: 'in_progress',
      ...overrides,
    },
  };
}

describe('microBeatStages — (a) Tier-1 / absent reveals nothing', () => {
  test('Tier-1 receipt → no stages', () => {
    expect(microBeatStages(receipt({ tier: 1 }))).toEqual([]);
  });
});

describe('microBeatStages — (b) confirmed only on live.setVerified === true', () => {
  test('setVerified true → terminal stage is beat_confirmed', () => {
    const stages = microBeatStages(
      receipt({ submissionId: 'a1b2c3d4e5', live: { setVerified: true } }),
    );
    expect(stages.at(-1)?.key).toBe('beat_confirmed');
    expect(stages.some((s) => s.key === 'beat_pending_ack')).toBe(false);
  });

  test('setVerified false → terminal stage is beat_pending_ack', () => {
    const stages = microBeatStages(
      receipt({ submissionId: 'a1b2c3d4e5', live: { setVerified: false } }),
    );
    expect(stages.at(-1)?.key).toBe('beat_pending_ack');
    expect(stages.some((s) => s.key === 'beat_confirmed')).toBe(false);
  });

  test('no live evidence at all → beat_pending_ack (never a false verified)', () => {
    const stages = microBeatStages(receipt({ submissionId: 'a1b2c3d4e5' }));
    expect(stages.at(-1)?.key).toBe('beat_pending_ack');
  });

  test('beat_submitted carries the first 8 chars of the submissionId', () => {
    const stages = microBeatStages(
      receipt({ submissionId: 'a1b2c3d4-longer', live: { setVerified: true } }),
    );
    expect(stages.find((s) => s.key === 'beat_submitted')?.sid).toBe('a1b2c3d4');
  });
});

describe('mockEventToSimLine — (c) sim origin, never real without a receipt', () => {
  test('autopilot_step for this vorgang → an origin:"sim" line', () => {
    const line = mockEventToSimLine(stepEvent(), 'v-1', '2026-07-02T10:00:00.000Z');
    expect(line).not.toBeNull();
    expect(line?.origin).toBe('sim');
    expect(line?.behoerdeId).toBe('kfz-berlin-labo');
  });

  test('agent_label wins over aktion; status maps to a row_status key', () => {
    const line = mockEventToSimLine(
      stepEvent({ agent_label: 'Wir ändern Ihre Kfz-Adresse', status: 'confirmed' }),
      'v-1',
      '2026-07-02T10:00:00.000Z',
    );
    expect(line?.text).toBe('Wir ändern Ihre Kfz-Adresse');
    expect(line?.statusKey).toBe('confirmed');
  });

  test('a sim line NEVER carries an ID-shaped token (behoerde/aktion/status only)', () => {
    const line = mockEventToSimLine(
      stepEvent({ status: 'confirmed' }),
      'v-1',
      '2026-07-02T10:00:00.000Z',
    );
    const serialized = JSON.stringify({ text: line?.text, statusKey: line?.statusKey });
    // No submission/case id ever appears on a sim line.
    expect(serialized).not.toMatch(/[0-9a-f]{8}/i);
  });

  test('event for a different vorgang → null', () => {
    expect(
      mockEventToSimLine(stepEvent(), 'other', '2026-07-02T10:00:00.000Z'),
    ).toBeNull();
  });

  test('mockEventToSimLine can never produce an origin:"real" line', () => {
    const events: MockBackendEvent[] = [
      stepEvent({ status: 'pending' }),
      stepEvent({ status: 'confirmed' }),
      stepEvent({ status: 'failed' }),
    ];
    for (const event of events) {
      const line = mockEventToSimLine(event, 'v-1', '2026-07-02T10:00:00.000Z');
      expect(line?.origin).not.toBe('real');
    }
  });
});

describe('receiptRealLineDescriptors — real lines require a Tier-2 receipt', () => {
  test('Tier-1 receipt → no real lines', () => {
    expect(receiptRealLineDescriptors(receipt({ tier: 1 }))).toEqual([]);
  });

  test('Tier-2 receipt → real lines carry 8-char ids + a set verdict', () => {
    const lines = receiptRealLineDescriptors(
      receipt({
        submissionId: 'a1b2c3d4e5f6',
        caseId: 'c9c8c7c6c5c4',
        live: {
          setVerified: true,
          eventTypes: ['urn:…/create-submission', 'urn:…/accept-submission'],
        },
      }),
    );
    expect(lines.some((l) => l.kind === 'event')).toBe(true);
    const ids = lines.find((l) => l.kind === 'ids');
    expect(ids).toEqual({ kind: 'ids', sid: 'a1b2c3d4', cid: 'c9c8c7c6' });
    expect(lines.some((l) => l.kind === 'set' && l.verified === true)).toBe(true);
  });
});
