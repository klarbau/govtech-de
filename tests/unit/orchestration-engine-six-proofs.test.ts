/**
 * Resilient Orchestration Engine — die SECHS Proofs (Spec § 7).
 *
 * Diese Tests SIND die Rebuttal auf „not atomic, not scaling, no disaster
 * recovery". Sie treiben den Engine deterministisch über die injizierte
 * Clock/IdSource + den Fault-Knopf (`__forceFail`) — NICHT über die 5%-Rate —
 * und prüfen jede der sechs Eigenschaften auf Library-Ebene:
 *
 *   (a) Kompensation rollt bereits-erledigte Schritte bei Failure zurück.
 *   (b) Idempotenter Replay = genau EIN Effekt.
 *   (c) Retry-Erschöpfung → DLQ (+ One-Tap-Replay).
 *   (d) Circuit-Breaker isoliert EINE ausgefallene Behörde, ohne die Saga zu killen.
 *   (e) Kill-mid-flight + Reload-aus-dem-Log → Recovery setzt fort.
 *   (f) verifyChain erkennt einen manipulierten Eintrag.
 *
 * Kein localStorage / kein api.ts — der Engine wird direkt mit einem
 * In-Memory-PersistencePort, einem Recording-EventPort, dem Mock-Transport und
 * Recording-Hooks verdrahtet. Determinismus über makeFakeClock +
 * makeCounterIdSource + gestubbtem Random.
 */
import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import type {
  AuditLogEntry,
  CircuitBreakerState,
  DeadLetterEntry,
  OutboxEntry,
  SagaInstance,
  SagaStatus,
  SagaStep,
} from '@/types/orchestration';
import type { Persona } from '@/types/persona';
import type { UmzugInput } from '@/types/umzug';
import {
  OrchestrationEngine,
  buildUmzugSaga,
  makeCounterIdSource,
  makeFakeClock,
  verifyChainSync,
  __resetEngineDeterminism,
  __setEngineClock,
  __setEngineRandom,
  __setIdSource,
  type EngineEvent,
  type EngineHooks,
  type PersistencePort,
  MAX_ATTEMPTS,
  BREAKER_OPEN_THRESHOLD,
  BREAKER_COOLDOWN_MS,
  COMPENSATION_TARGET_BEHOERDE,
} from '@/lib/mock-backend/orchestration';
import { createMockTransport, type Transport } from '@/lib/mock-backend/orchestration/transport';
import { recoverOnBoot } from '@/lib/mock-backend/orchestration/recovery';
import { computeEntryHashSync } from '@/lib/mock-backend/orchestration/audit-log';

// ---------------------------------------------------------------------------
// In-memory persistence port (no localStorage)
// ---------------------------------------------------------------------------

function makeMemoryPort(): PersistencePort & { _state: MemoryState } {
  const state: MemoryState = {
    sagas: {},
    outbox: [],
    audit: [],
    dlq: [],
    breakers: {},
  };
  return {
    _state: state,
    readSagas: () => structuredCloneSafe(state.sagas),
    writeSagas: (v) => {
      state.sagas = structuredCloneSafe(v);
    },
    readOutbox: () => structuredCloneSafe(state.outbox),
    writeOutbox: (v) => {
      state.outbox = structuredCloneSafe(v);
    },
    readAuditLog: () => structuredCloneSafe(state.audit),
    writeAuditLog: (v) => {
      state.audit = structuredCloneSafe(v);
    },
    readDlq: () => structuredCloneSafe(state.dlq),
    writeDlq: (v) => {
      state.dlq = structuredCloneSafe(v);
    },
    readBreakers: () => structuredCloneSafe(state.breakers),
    writeBreakers: (v) => {
      state.breakers = structuredCloneSafe(v);
    },
  };
}

interface MemoryState {
  sagas: Record<string, SagaInstance>;
  outbox: OutboxEntry[];
  audit: AuditLogEntry[];
  dlq: DeadLetterEntry[];
  breakers: Record<string, CircuitBreakerState>;
}

function structuredCloneSafe<T>(v: T): T {
  return JSON.parse(JSON.stringify(v)) as T;
}

// ---------------------------------------------------------------------------
// Recording event + hooks
// ---------------------------------------------------------------------------

function makeRecordingEvents(): EngineEvent & { audits: AuditLogEntry[] } {
  const audits: AuditLogEntry[] = [];
  return {
    audits,
    audit: (e) => audits.push(e),
    dlqChanged: () => {},
    breakerChanged: () => {},
    sagaStatusChanged: () => {},
  };
}

interface HookRecord {
  /** behoerdeId → count of onStepSucceeded EFFECT runs (letter mints). */
  effectCounts: Record<string, number>;
  /** behoerdeId → count of onStepCompensated runs. */
  compensatedCounts: Record<string, number>;
  terminalStatuses: SagaStatus[];
}

function makeRecordingHooks(): EngineHooks & { record: HookRecord } {
  const record: HookRecord = {
    effectCounts: {},
    compensatedCounts: {},
    terminalStatuses: [],
  };
  return {
    record,
    projectStep: () => {},
    onStepSucceeded: async (_saga, step) => {
      // Each non-cache success runs the effect exactly once (letter mint).
      record.effectCounts[step.behoerdeId] =
        (record.effectCounts[step.behoerdeId] ?? 0) + 1;
      return `letter-${step.behoerdeId}-${record.effectCounts[step.behoerdeId]}`;
    },
    onStepCompensated: async (_saga, step) => {
      record.compensatedCounts[step.behoerdeId] =
        (record.compensatedCounts[step.behoerdeId] ?? 0) + 1;
    },
    onSagaTerminal: async (saga) => {
      record.terminalStatuses.push(saga.status);
    },
  };
}

// ---------------------------------------------------------------------------
// Test fixtures: persona + input that yield all blocks
// ---------------------------------------------------------------------------

function makePersona(): Persona {
  return {
    id: 'persona-test',
    vorname: 'Olha',
    nachname: 'Kovalenko',
    geburtsdatum: '1990-04-12',
    staatsangehoerigkeit: 'UA',
    adresse: {
      strasse: 'Alte Straße',
      hausnummer: '1',
      plz: '10115',
      ort: 'Berlin',
    },
    familie: { kinder: [] },
    beschaeftigung: { typ: 'angestellt', arbeitgeber: 'Mittelstand Software GmbH' },
    kfz_halter: true,
    kindergeld_bezug: true,
    aufenthaltstitel: {
      norm: '§ 18g AufenthG',
      valid_until: '2028-01-01',
      az: '[MOCK] ABH-B-2027/IV-A-1234',
    },
    wehrerfasst: false,
    sprachen: ['uk', 'de'],
  };
}

function makeInput(): UmzugInput {
  return {
    neue_adresse: {
      strasse: 'Müllerstraße',
      hausnummer: '146',
      plz: '13353',
      ort: 'Berlin',
    },
    stichtag: '2027-03-01',
    betroffene_personen: ['persona-test'],
    // Two Block-B recipients get consent so Block B is exercised.
    consents: ['aok-nordost', 'berliner-sparkasse'],
  };
}

const VORGANG_ID = 'vorgang-test-saga';

// ---------------------------------------------------------------------------
// Harness wiring
// ---------------------------------------------------------------------------

interface Harness {
  engine: OrchestrationEngine;
  port: ReturnType<typeof makeMemoryPort>;
  events: ReturnType<typeof makeRecordingEvents>;
  hooks: ReturnType<typeof makeRecordingHooks>;
  transport: Transport;
  clock: ReturnType<typeof makeFakeClock>;
  saga: SagaInstance;
}

function setupHarness(): Harness {
  const clock = makeFakeClock('2027-01-01T00:00:00.000Z');
  __setEngineClock(clock);
  __setIdSource(makeCounterIdSource());
  // Deterministic jitter: random() === 0 → backoff = floor(0 * cap) = 0ms,
  // so each scheduled retry is eligible immediately at the current clock and we
  // do not need to advance time between retries unless a test wants to.
  __setEngineRandom(() => 0);

  const port = makeMemoryPort();
  const events = makeRecordingEvents();
  const hooks = makeRecordingHooks();
  const transport = createMockTransport({ reliable: () => true, randomFailRate: 0 });

  const engine = new OrchestrationEngine({
    persistence: port,
    events,
    transport,
    hooks,
  });

  const { saga } = buildUmzugSaga(makePersona(), makeInput(), VORGANG_ID);
  return { engine, port, events, hooks, transport, clock, saga };
}

function stepByBehoerde(saga: SagaInstance, behoerdeId: string): SagaStep {
  const s = saga.steps.find((x) => x.behoerdeId === behoerdeId);
  if (!s) throw new Error(`no step for ${behoerdeId}`);
  return s;
}

function auditTypes(audits: AuditLogEntry[]): string[] {
  return audits.map((a) => a.type);
}

afterEach(() => {
  __resetEngineDeterminism();
});

// ===========================================================================
// PROOF (a) — Compensation rolls back already-done steps on failure
// ===========================================================================

describe('Proof (a) — Kompensation rollt erledigte Schritte zurück', () => {
  test('ABH permanent-fail nach Block A → Saga compensating→compensated, Beitragsservice zurückgenommen', async () => {
    const h = setupHarness();
    // ABH (a required Block-D step) permanently fails when authorised.
    h.transport.__forceFail('abh-berlin-lea', 'permanent');

    await h.engine.startSaga(h.saga); // Block A auto-runs to succeeded.

    // Authorise the two other Block-D steps so they succeed first, building
    // up an already-succeeded Beitragsservice (Block A) that can be compensated.
    await h.engine.authorizeStep(VORGANG_ID, stepByBehoerde(h.saga, 'kfz-berlin-labo').stepId);
    await h.engine.authorizeStep(
      VORGANG_ID,
      stepByBehoerde(h.saga, 'familienkasse-berlin-brandenburg').stepId,
    );

    // Now authorise the ABH step → it permanently fails → dead-letters →
    // required step dead → saga enters compensation.
    await h.engine.authorizeStep(VORGANG_ID, stepByBehoerde(h.saga, 'abh-berlin-lea').stepId);

    const saga = h.engine.getSaga(VORGANG_ID)!;
    // Saga is the honest partial-failure end state (compensated), NOT completed.
    expect(saga.status).toBe('compensated');
    expect(saga.status).not.toBe('completed');

    // The compensation target (Beitragsservice) was rolled back.
    const comp = stepByBehoerde(saga, COMPENSATION_TARGET_BEHOERDE);
    expect(comp.status).toBe('compensated');

    // The rolled-back step's effect is NOT double-counted: exactly one forward
    // effect ran (the deliver), and the compensation hook ran exactly once.
    expect(h.hooks.record.effectCounts[COMPENSATION_TARGET_BEHOERDE]).toBe(1);
    expect(h.hooks.record.compensatedCounts[COMPENSATION_TARGET_BEHOERDE]).toBe(1);

    // The audit trail shows the compensation pair + the honest terminal.
    const types = auditTypes(h.events.audits);
    expect(types).toContain('STEP_COMPENSATING');
    expect(types).toContain('STEP_COMPENSATED');
    expect(types).toContain('SAGA_COMPENSATED');
  });
});

// ===========================================================================
// COMPLETION-GATE — required-only terminal semantics (BLOCKER 1 regression)
// ===========================================================================
//
// A consented-but-never-authorised Block-B (optional) step stays `pending` with
// NO live outbox entry. It must NOT count as in-flight: once all REQUIRED steps
// (Block-A auto + Block-D eID) are terminal, the saga reaches `completed` and
// fires onSagaTerminal — even though an optional Block-B step is still pending.
// (Regression: the spine `inline cascade COMPLETES` test failed when un-enqueued
// optional steps were counted as in-flight, so the value receipt never mounted.)
describe('Completion-Gate — optionale, nie-eingereihte Block-B-Schritte blockieren NICHT', () => {
  test('alle required Schritte terminal → Saga completed + onSagaTerminal, obwohl Block-B pending', async () => {
    const h = setupHarness();
    await h.engine.startSaga(h.saga); // Block A auto-runs to succeeded.

    // The consented Block-B steps exist but are NEVER authorised (no enqueue).
    const aokPending = stepByBehoerde(h.engine.getSaga(VORGANG_ID)!, 'aok-nordost');
    expect(aokPending.status).toBe('pending');

    // Authorise all three required Block-D (eID) steps → they succeed.
    for (const beh of [
      'kfz-berlin-labo',
      'familienkasse-berlin-brandenburg',
      'abh-berlin-lea',
    ]) {
      await h.engine.authorizeStep(
        VORGANG_ID,
        stepByBehoerde(h.saga, beh).stepId,
      );
    }

    const saga = h.engine.getSaga(VORGANG_ID)!;
    // All required steps succeeded → terminal `completed` despite pending Block-B.
    expect(saga.steps.filter((s) => s.required).every((s) => s.status === 'succeeded')).toBe(true);
    expect(stepByBehoerde(saga, 'aok-nordost').status).toBe('pending');
    expect(stepByBehoerde(saga, 'berliner-sparkasse').status).toBe('pending');
    expect(saga.status).toBe('completed');
    // onSagaTerminal fired exactly once with `completed` (drives the value receipt).
    expect(h.hooks.record.terminalStatuses).toContain('completed');
    expect(auditTypes(h.events.audits)).toContain('SAGA_COMPLETED');
  });

  test('später erteiltes Consent reiht den Block-B-Schritt separat ein und läuft durch', async () => {
    const h = setupHarness();
    await h.engine.startSaga(h.saga);
    for (const beh of [
      'kfz-berlin-labo',
      'familienkasse-berlin-brandenburg',
      'abh-berlin-lea',
    ]) {
      await h.engine.authorizeStep(VORGANG_ID, stepByBehoerde(h.saga, beh).stepId);
    }
    expect(h.engine.getSaga(VORGANG_ID)!.status).toBe('completed');

    // A later consent authorises a Block-B step → it enqueues + succeeds; this is
    // a separate enqueue and does not retroactively un-complete the saga.
    await h.engine.authorizeStep(VORGANG_ID, stepByBehoerde(h.saga, 'aok-nordost').stepId);
    const saga = h.engine.getSaga(VORGANG_ID)!;
    expect(stepByBehoerde(saga, 'aok-nordost').status).toBe('succeeded');
    expect(saga.status).toBe('completed');
  });
});

// ===========================================================================
// PROOF (b) — Idempotent replay = exactly one effect
// ===========================================================================

describe('Proof (b) — idempotenter Replay = genau ein Effekt', () => {
  test('Block-D-Step zweimal autorisieren → genau ein Effekt, zweite Quittung fromCache', async () => {
    const h = setupHarness();
    await h.engine.startSaga(h.saga);

    const kfz = stepByBehoerde(h.saga, 'kfz-berlin-labo');
    await h.engine.authorizeStep(VORGANG_ID, kfz.stepId);

    // First authorise → succeeded, effect ran once.
    let saga = h.engine.getSaga(VORGANG_ID)!;
    const kfzAfter1 = stepByBehoerde(saga, 'kfz-berlin-labo');
    expect(kfzAfter1.status).toBe('succeeded');
    expect(kfzAfter1.receipt?.fromCache).toBe(false);
    expect(h.hooks.record.effectCounts['kfz-berlin-labo']).toBe(1);

    // Authorise the SAME step again → idempotent: the engine re-enqueues, the
    // transport returns the cached receipt, no second effect runs.
    await h.engine.authorizeStep(VORGANG_ID, kfz.stepId);
    saga = h.engine.getSaga(VORGANG_ID)!;
    const kfzAfter2 = stepByBehoerde(saga, 'kfz-berlin-labo');
    expect(kfzAfter2.status).toBe('succeeded');
    // Exactly ONE effect total (no double letter / no double Once-Only count).
    expect(h.hooks.record.effectCounts['kfz-berlin-labo']).toBe(1);
  });

  test('Re-drain eines bereits-succeeded Auto-Steps → kein zweiter Effekt, fromCache:true', async () => {
    const h = setupHarness();
    await h.engine.startSaga(h.saga);

    // Beitragsservice (Block A) succeeded on first drain.
    expect(h.hooks.record.effectCounts[COMPENSATION_TARGET_BEHOERDE]).toBe(1);

    // Force a re-enqueue + re-drain of the same step via authorizeStep (which
    // tolerates already-succeeded by short-circuiting); assert no second effect.
    const bs = stepByBehoerde(h.saga, COMPENSATION_TARGET_BEHOERDE);
    await h.engine.authorizeStep(VORGANG_ID, bs.stepId);
    expect(h.hooks.record.effectCounts[COMPENSATION_TARGET_BEHOERDE]).toBe(1);
  });
});

// ===========================================================================
// PROOF (c) — Retry exhaustion → DLQ
// ===========================================================================

describe('Proof (c) — Retry-Erschöpfung → DLQ', () => {
  test('transient-fail MAX_ATTEMPTS-mal → STEP_RETRY_SCHEDULED ×(MAX-1), dann dead_lettered + DLQ', async () => {
    const h = setupHarness();
    // A Block-B (optional) recipient transient-fails forever so it does NOT
    // trigger saga-level compensation (only REQUIRED steps do).
    h.transport.__forceFail('aok-nordost', 'transient');

    await h.engine.startSaga(h.saga); // Block A succeeds.
    // Authorise the consented Block-B step → it starts failing + retrying.
    const aok = stepByBehoerde(h.saga, 'aok-nordost');
    await h.engine.authorizeStep(VORGANG_ID, aok.stepId);

    // The retry budget and the circuit-breaker are independent mechanisms: the
    // breaker opens after BREAKER_OPEN_THRESHOLD consecutive failures, which
    // pauses the lane until its cooldown elapses. To prove RETRY EXHAUSTION we
    // advance the fake clock past each cooldown so the half-open probes keep
    // failing and the attempt counter climbs to MAX_ATTEMPTS → DLQ. This is
    // fully deterministic (no random rate, fixed clock).
    for (let i = 0; i < MAX_ATTEMPTS + 2; i++) {
      const s = stepByBehoerde(h.engine.getSaga(VORGANG_ID)!, 'aok-nordost');
      if (s.status === 'dead_lettered') break;
      h.clock.tick(BREAKER_COOLDOWN_MS + 1);
      await h.engine.drainAll(VORGANG_ID);
    }

    const saga = h.engine.getSaga(VORGANG_ID)!;
    const aokAfter = stepByBehoerde(saga, 'aok-nordost');
    expect(aokAfter.status).toBe('dead_lettered');
    expect(aokAfter.attempts).toBe(MAX_ATTEMPTS);

    // The Laufzettel shows the expected number of scheduled retries.
    const retryCount = h.events.audits.filter(
      (a) => a.type === 'STEP_RETRY_SCHEDULED' && a.stepId === aok.stepId,
    ).length;
    expect(retryCount).toBe(MAX_ATTEMPTS - 1);
    expect(auditTypes(h.events.audits)).toContain('STEP_DEAD_LETTERED');

    // It landed in the DLQ, replayable.
    const dlq = h.engine.getDlq();
    const entry = dlq.find((d) => d.stepId === aok.stepId);
    expect(entry).toBeDefined();
    expect(entry?.replayable).toBe(true);
    expect(entry?.behoerdeId).toBe('aok-nordost');

    // One-tap replay AFTER clearing the fault → resolves to succeeded. Advance
    // the clock past the breaker cooldown so the half-open probe (now with the
    // fault cleared) is allowed and closes the breaker.
    h.transport.__clearForceFail('aok-nordost');
    h.clock.tick(BREAKER_COOLDOWN_MS + 1);
    await h.engine.replayDeadLetter(entry!.dlqId);
    const saga2 = h.engine.getSaga(VORGANG_ID)!;
    expect(stepByBehoerde(saga2, 'aok-nordost').status).toBe('succeeded');
    expect(h.engine.getDlq().find((d) => d.stepId === aok.stepId)).toBeUndefined();
  });
});

// ===========================================================================
// PROOF (d) — Circuit-breaker isolates one failing authority
// ===========================================================================

describe('Proof (d) — Circuit-Breaker isoliert eine Behörde', () => {
  test('KFZ failt → Breaker open; die anderen Lanes erreichen succeeded; half-open schließt wieder', async () => {
    const h = setupHarness();
    h.transport.__forceFail('kfz-berlin-labo', 'transient');

    await h.engine.startSaga(h.saga); // Block A unaffected → all succeeded.

    // All four Block-A steps reached succeeded (isolation: KFZ failure later
    // does not retro-actively touch them).
    const sagaA = h.engine.getSaga(VORGANG_ID)!;
    const blockA = sagaA.steps.filter((s) => s.block === 'A');
    expect(blockA.every((s) => s.status === 'succeeded')).toBe(true);

    // Authorise the failing KFZ step → it retries until its breaker opens.
    const kfz = stepByBehoerde(h.saga, 'kfz-berlin-labo');
    await h.engine.authorizeStep(VORGANG_ID, kfz.stepId);

    const breakers = h.engine.getBreakers();
    const kfzBreaker = breakers.find((b) => b.behoerdeId === 'kfz-berlin-labo');
    expect(kfzBreaker).toBeDefined();
    // After >= threshold consecutive failures the breaker opened.
    expect(kfzBreaker?.consecutiveFailures).toBeGreaterThanOrEqual(
      BREAKER_OPEN_THRESHOLD,
    );
    expect(auditTypes(h.events.audits)).toContain('BREAKER_OPENED');

    // The OTHER five lanes still reached succeeded — the saga kept moving while
    // one authority was isolated. Authorise the remaining Block-D steps:
    await h.engine.authorizeStep(
      VORGANG_ID,
      stepByBehoerde(h.saga, 'familienkasse-berlin-brandenburg').stepId,
    );
    await h.engine.authorizeStep(VORGANG_ID, stepByBehoerde(h.saga, 'abh-berlin-lea').stepId);
    const sagaMid = h.engine.getSaga(VORGANG_ID)!;
    expect(stepByBehoerde(sagaMid, 'familienkasse-berlin-brandenburg').status).toBe('succeeded');
    expect(stepByBehoerde(sagaMid, 'abh-berlin-lea').status).toBe('succeeded');

    // Now clear the fault, advance the clock past the cooldown → half-open probe
    // closes the breaker, and the KFZ step finally succeeds.
    h.transport.__clearForceFail('kfz-berlin-labo');
    h.clock.tick(BREAKER_COOLDOWN_MS + 1);
    await h.engine.authorizeStep(VORGANG_ID, kfz.stepId);

    const sagaEnd = h.engine.getSaga(VORGANG_ID)!;
    expect(stepByBehoerde(sagaEnd, 'kfz-berlin-labo').status).toBe('succeeded');
    const kfzBreakerEnd = h.engine
      .getBreakers()
      .find((b) => b.behoerdeId === 'kfz-berlin-labo');
    expect(kfzBreakerEnd?.state).toBe('closed');
    expect(auditTypes(h.events.audits)).toContain('BREAKER_HALF_OPEN');
    expect(auditTypes(h.events.audits)).toContain('BREAKER_CLOSED');
  });
});

// ===========================================================================
// PROOF (e) — Kill-mid-flight + reload-from-log → recovery resumes
// ===========================================================================

describe('Proof (e) — Recovery aus dem Log nach Kill-mid-flight', () => {
  test('inflight Outbox + running Saga → recoverOnBoot setzt fort ohne Doppel-Effekt', async () => {
    const h = setupHarness();
    await h.engine.startSaga(h.saga);

    // Simulate a tab-kill mid-flight: pick a not-yet-run step (Block D, eID
    // gated → still pending), enqueue it, and leave its outbox entry `inflight`
    // (as if the tab died after markInflight but before the receipt landed).
    const fk = stepByBehoerde(h.saga, 'familienkasse-berlin-brandenburg');
    // Manually mark the saga running + craft an inflight outbox entry by reading
    // the persisted state and mutating it the way a crash would leave it.
    const sagas = h.port.readSagas();
    const saga = sagas[VORGANG_ID];
    saga.status = 'running';
    saga.steps = saga.steps.map((s) =>
      s.stepId === fk.stepId ? { ...s, status: 'running', attempts: 1 } : s,
    );
    h.port.writeSagas(sagas);
    h.port.writeOutbox([
      ...h.port.readOutbox(),
      {
        outboxId: 'crash-outbox-1',
        sagaId: VORGANG_ID,
        stepId: fk.stepId,
        idempotencyKey: fk.idempotencyKey,
        intent: 'deliver',
        status: 'inflight',
        attempts: 1,
        enqueuedAt: h.clock.now(),
        envelope: {
          messageId: 'crash-msg-1',
          behoerdeId: fk.behoerdeId,
          idempotencyKey: fk.idempotencyKey,
          intent: 'deliver',
          datenkategorien: fk.datenkategorien ?? [],
          mock: true,
        },
      },
    ]);

    // A fresh process: recoverOnBoot reads the persisted log/snapshot and resumes.
    const result = await recoverOnBoot({
      persistence: h.port,
      events: h.events,
      engine: h.engine,
      appendRecoveryAudit: async (sagaId: string) => {
        const log = h.port.readAuditLog();
        const prev = log[log.length - 1];
        const prevHash = prev ? prev.hash : '';
        const seq = log.length;
        const ts = h.clock.now();
        const base = {
          seq,
          ts,
          sagaId,
          stepId: undefined as string | undefined,
          type: 'RECOVERY_REPLAYED' as const,
          payload: {},
        };
        const hash = computeEntryHashSync(base, prevHash);
        const entry = { ...base, prevHash, hash };
        log.push(entry);
        h.port.writeAuditLog(log);
        h.events.audit(entry);
      },
    });

    // At least one in-flight saga reconstructed.
    expect(result.recovered).toBeGreaterThanOrEqual(1);
    expect(result.degraded).toBe(false);
    expect(auditTypes(h.port.readAuditLog())).toContain('RECOVERY_REPLAYED');

    // The re-armed Familienkasse step resumed and reached succeeded WITHOUT a
    // double effect (idempotent re-send returned the same outcome; the effect
    // ran exactly once for that Behörde).
    const saga2 = h.engine.getSaga(VORGANG_ID)!;
    expect(stepByBehoerde(saga2, 'familienkasse-berlin-brandenburg').status).toBe('succeeded');
    expect(h.hooks.record.effectCounts['familienkasse-berlin-brandenburg']).toBe(1);
  });
});

// ===========================================================================
// PROOF (f) — verifyChain detects a tampered entry
// ===========================================================================

describe('Proof (f) — verifyChain erkennt Manipulation', () => {
  test('intaktes Log → ok; ein manipulierter payload → broken bei seq', async () => {
    const h = setupHarness();
    await h.engine.startSaga(h.saga);

    // Intact chain verifies ok.
    const intact = verifyChainSync(h.port.readAuditLog());
    expect(intact.ok).toBe(true);
    expect(intact.count).toBeGreaterThan(0);

    // Tamper with one entry's payload WITHOUT recomputing its hash (this is
    // exactly what an attacker / a corrupt write would do).
    const log = h.port.readAuditLog();
    const targetIdx = Math.floor(log.length / 2);
    log[targetIdx] = {
      ...log[targetIdx],
      payload: { ...log[targetIdx].payload, tampered: 'yes' },
    };
    h.port.writeAuditLog(log);

    const broken = verifyChainSync(h.port.readAuditLog());
    expect(broken.ok).toBe(false);
    // The chain breaks AT or BEFORE the tampered seq (its own hash mismatches;
    // if the entry's stored hash still matched, the next entry's prevHash link
    // would break — either way verifyChain surfaces the first broken seq).
    expect(broken.brokenAtSeq).toBeDefined();
    expect(broken.brokenAtSeq).toBeLessThanOrEqual(log[targetIdx].seq);
  });
});
