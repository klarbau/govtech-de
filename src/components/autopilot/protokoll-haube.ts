/**
 * „Unter der Haube" (unter-der-haube.md § 5) — the pure, JSX-free feed-mapping
 * logic shared by `ProtokollMicroBeat` and `UnterDerHaubeLeiste`.
 *
 * Kept in a plain `.ts` module (no React, no next-intl) so it is unit-testable
 * in the repo's node env and so the honesty invariants live in ONE place:
 *   - a non-Tier-2 receipt reveals NOTHING (Demo-Modus byte-identical),
 *   - `beat_confirmed` / an „echt"-line exist ONLY on the real receipt fact,
 *   - a mock-bus event only ever becomes an `origin: 'sim'` line.
 */

import type { AutopilotStepStatus, MockBackendEvent } from '@/types';
import type { FitConnectReceipt } from '@/types/fit-connect';

export type MicroBeatStageKey =
  | 'beat_encrypted'
  | 'beat_submitted'
  | 'beat_confirmed'
  | 'beat_pending_ack';

export interface MicroBeatStage {
  key: MicroBeatStageKey;
  /** First 8 chars of the submissionId — only present on `beat_submitted`. */
  sid?: string;
}

/**
 * The ordered stages a receipt's micro-beat may reveal (§ 5.A). EACH stage
 * renders only when its underlying receipt fact is present; a non-Tier-2 receipt
 * reveals nothing (`[]`). Terminal stage is `beat_confirmed` ONLY when
 * `live.setVerified === true`, else `beat_pending_ack` (never a false verified).
 */
export function microBeatStages(receipt: FitConnectReceipt): MicroBeatStage[] {
  if (receipt.tier !== 2) return [];

  const stages: MicroBeatStage[] = [];
  if (receipt.jwePreview?.compactExcerpt) {
    stages.push({ key: 'beat_encrypted' });
  }
  if (receipt.submissionId) {
    stages.push({ key: 'beat_submitted', sid: receipt.submissionId.slice(0, 8) });
  }
  stages.push({
    key: receipt.live?.setVerified === true ? 'beat_confirmed' : 'beat_pending_ack',
  });
  return stages;
}

export type HaubeOrigin = 'sim' | 'real';

export interface HaubeSimLine {
  id: string;
  origin: 'sim';
  tsIso: string;
  behoerdeId: string;
  /** Behörde name / aktion / agent-voice text — NEVER an ID token (§ amendment 3). */
  text: string;
  /** Key suffix into `convenience.inline_cascade.row_status`, or null. */
  statusKey: string | null;
}

export type RealLineDescriptor =
  | { kind: 'event'; eventKey: 'create' | 'submit' | 'notify' | 'accept' }
  | { kind: 'ids'; sid: string; cid: string }
  | { kind: 'set'; verified: boolean };

export interface HaubeRealLine {
  id: string;
  origin: 'real';
  tsIso: string;
  descriptor: RealLineDescriptor;
}

/** AutopilotStepStatus → existing `row_status` key (self_assigned/Block-C omitted). */
const SIM_STATUS_LABEL_KEY: Partial<Record<AutopilotStepStatus, string>> = {
  pending: 'pending',
  in_progress: 'in_progress',
  needs_eid: 'needs_eid',
  pending_eid_confirmation: 'needs_eid',
  confirmed: 'confirmed',
  failed: 'failed',
};

/**
 * Map a raw mock-bus event to ONE `origin: 'sim'` log line, or `null` if the
 * event is not for this vorgang / not a rendered type. NEVER returns an
 * `origin: 'real'` line — real lines come ONLY from a Tier-2 receipt.
 */
export function mockEventToSimLine(
  event: MockBackendEvent,
  vorgangId: string,
  nowIso: string,
): HaubeSimLine | null {
  if (event.type === 'autopilot_step' && event.vorgangId === vorgangId) {
    const step = event.step;
    return {
      id: `sim-step-${step.id}-${step.status}`,
      origin: 'sim',
      tsIso: step.completed_at ?? step.started_at ?? nowIso,
      behoerdeId: step.behoerde_id,
      text: step.agent_label ?? step.aktion,
      statusKey: SIM_STATUS_LABEL_KEY[step.status] ?? null,
    };
  }
  if (event.type === 'letter_received' && event.letter.vorgang_id === vorgangId) {
    return {
      id: `sim-letter-${event.letter.id}`,
      origin: 'sim',
      tsIso: nowIso,
      behoerdeId: event.letter.absender_behoerde_id,
      text: event.letter.betreff,
      statusKey: null,
    };
  }
  return null;
}

/** RFC-8417 event-type URI → the friendly `protokoll.fit_connect.event.*` suffix. */
export function eventKeyFromUri(
  uri: string,
): 'create' | 'submit' | 'notify' | 'accept' | null {
  if (uri.endsWith('/create-submission')) return 'create';
  if (uri.endsWith('/submit-submission')) return 'submit';
  if (uri.endsWith('/notify-submission')) return 'notify';
  if (uri.endsWith('/accept-submission')) return 'accept';
  return null;
}

/**
 * The `origin: 'real'` overlay descriptors from a Tier-2 receipt — the ONLY
 * source of an „echt"-labelled line. Returns `[]` for a non-Tier-2 receipt.
 */
export function receiptRealLineDescriptors(
  receipt: FitConnectReceipt,
): RealLineDescriptor[] {
  if (receipt.tier !== 2) return [];

  const out: RealLineDescriptor[] = [];
  for (const uri of receipt.live?.eventTypes ?? []) {
    const key = eventKeyFromUri(uri);
    if (key) out.push({ kind: 'event', eventKey: key });
  }
  if (receipt.submissionId || receipt.caseId) {
    out.push({
      kind: 'ids',
      sid: (receipt.submissionId ?? '').slice(0, 8),
      cid: (receipt.caseId ?? '').slice(0, 8),
    });
  }
  if (receipt.live?.setVerified !== undefined) {
    out.push({ kind: 'set', verified: receipt.live.setVerified === true });
  }
  return out;
}
