/**
 * Daten-getriebene Saga-Definition für den Umzug (Spec § 3.2).
 *
 * Wiederverwendet die EXPORTIERTEN `BLOCK_A/B/D`-Arrays aus `autopilot/umzug.ts`
 * (eine Source of Truth — Behörden, Normen, Datenkategorien, agentLabel) und
 * mappt jeden sichtbaren Eintrag auf einen `SagaStep`:
 *   - `idempotencyKey = `${sagaId}:${stepId}`` — EINMAL hier erzeugt.
 *   - `gate`: Block A → 'auto'; Block B → 'consent'; Block D → 'eid'.
 *   - `required`: Block A + Block D required; Block B optional (consent).
 *   - `compensatesWith`: nur Schritte mit sinnvollem semantischem Undo. Für die
 *     Demo trägt der Beitragsservice-Schritt eine Kompensation („Adressänderung
 *     zurückgezogen") — ein reiner Adress-Write mit offensichtlichem Inversen,
 *     getriggert vom ABH-Failure-Pfad (proof (a)).
 *
 * Determinismus: alle Timestamps/IDs kommen aus der injizierten Clock/IdSource.
 * Block C (Self-Tasks) wird NIE als Transport-Step aufgenommen (§ 9.2).
 */
import type { Persona } from '@/types/persona';
import type { UmzugInput } from '@/types/umzug';
import type {
  SagaInstance,
  SagaStep,
  StepGate,
} from '@/types/orchestration';
import {
  BLOCK_A,
  BLOCK_B,
  BLOCK_D,
  type BlockAEntry,
  type BlockBEntry,
  type BlockDEntry,
} from '../autopilot/umzug';
import { getEngineClock, getIdSource } from './clock';

/** Der Behörden-Step, der bei ABH-Failure kompensiert wird (§ 3.2 Default). */
export const COMPENSATION_TARGET_BEHOERDE = 'beitragsservice-koeln';

/** Der Behörden-Step, dessen permanenter Fehler die Kompensation auslöst. */
export const COMPENSATION_TRIGGER_BEHOERDE = 'abh-berlin-lea';

function shortName(behoerdeId: string): string {
  return behoerdeId;
}

function makeStep(params: {
  sagaId: string;
  behoerdeId: string;
  block: 'A' | 'B' | 'D';
  gate: StepGate;
  required: boolean;
  rechtsgrundlage: string;
  agentLabel: string;
  aktion: string;
  datenkategorien: string[];
  nowIso: string;
  compensatesWith?: string;
}): SagaStep {
  const ids = getIdSource();
  const stepId = ids.stepId(params.sagaId, shortName(params.behoerdeId));
  return {
    stepId,
    autopilotStepId: stepId,
    behoerdeId: params.behoerdeId,
    block: params.block,
    gate: params.gate,
    required: params.required,
    idempotencyKey: `${params.sagaId}:${stepId}`,
    status: 'pending',
    attempts: 0,
    rechtsgrundlage: params.rechtsgrundlage,
    agentLabel: params.agentLabel,
    aktion: params.aktion,
    datenkategorien: params.datenkategorien,
    compensatesWith: params.compensatesWith,
  };
}

/**
 * Baut die Umzug-Saga aus Persona + Input. Spiegelt die Sichtbarkeits-
 * Entscheidungen des Generators (`visibleIf`) und die Block-Reihenfolge A → D
 * → B (Run-Reihenfolge der Spec).
 */
export function buildUmzugSaga(
  persona: Persona,
  input: UmzugInput,
  vorgangId: string,
): { saga: SagaInstance } {
  const clock = getEngineClock();
  const ids = getIdSource();
  const nowIso = clock.now();
  const sagaId = ids.sagaId(vorgangId);

  const steps: SagaStep[] = [];

  // ── Block A — auto, required.
  for (const entry of BLOCK_A as BlockAEntry[]) {
    if (entry.visibleIf && !entry.visibleIf(persona)) continue;
    const isCompTarget = entry.behoerdeId === COMPENSATION_TARGET_BEHOERDE;
    steps.push(
      makeStep({
        sagaId,
        behoerdeId: entry.behoerdeId,
        block: 'A',
        gate: 'auto',
        required: true,
        rechtsgrundlage: entry.rechtsgrundlage,
        agentLabel: entry.agentLabel,
        aktion: entry.aktion,
        datenkategorien: entry.datenkategorien,
        nowIso,
        // Der Beitragsservice-Schritt kompensiert sich selbst (Adress-Write
        // zurücknehmen). Der konkrete Compensation-Send läuft als
        // `intent: 'compensate'` über dieselbe Transport-/Retry-Maschinerie.
        compensatesWith: isCompTarget ? 'self' : undefined,
      }),
    );
  }

  // ── Block D — eID-gated, required.
  for (const entry of BLOCK_D as BlockDEntry[]) {
    if (!entry.visibleIf(persona)) continue;
    steps.push(
      makeStep({
        sagaId,
        behoerdeId: entry.behoerdeId,
        block: 'D',
        gate: 'eid',
        required: true,
        rechtsgrundlage: entry.rechtsgrundlage,
        agentLabel: entry.agentLabel,
        aktion: entry.aktion,
        datenkategorien: entry.datenkategorien,
        nowIso,
      }),
    );
  }

  // ── Block B — consent-gated, optional. Nur Empfänger mit erteiltem Consent
  // werden aufgenommen (die anderen existieren als Saga-Step gar nicht — sie
  // können nicht „completed" blockieren, weil sie nicht required sind).
  const consents = new Set(input.consents ?? []);
  for (const entry of BLOCK_B as BlockBEntry[]) {
    if (!consents.has(entry.behoerdeId)) continue;
    if (entry.visibleIf && !entry.visibleIf(persona)) continue;
    steps.push(
      makeStep({
        sagaId,
        behoerdeId: entry.behoerdeId,
        block: 'B',
        gate: 'consent',
        required: false,
        rechtsgrundlage: entry.rechtsgrundlage,
        agentLabel: entry.agentLabel,
        aktion: entry.aktion,
        datenkategorien: entry.datenkategorien,
        nowIso,
      }),
    );
  }

  const saga: SagaInstance = {
    sagaId,
    type: 'umzug',
    vorgangId,
    personaId: persona.id,
    status: 'running',
    steps,
    createdAt: nowIso,
    updatedAt: nowIso,
    context: {
      neue_adresse: input.neue_adresse,
      stichtag: input.stichtag,
      consents: input.consents ?? [],
    },
  };

  return { saga };
}
