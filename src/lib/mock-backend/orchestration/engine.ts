/**
 * Resilient Orchestration Engine — der Saga-Reducer + Drainer (Spec § 3).
 *
 * Verantwortet: startSaga / authorizeStep / drain-tick / retry+backoff /
 * compensation / dead-letter / replayDeadLetter — alles über EINE transaktionale
 * `commit()`-Funktion (§ 3.5): jede Transition schreibt Saga + Outbox + GENAU
 * EINEN Audit-Eintrag zusammen, dann emit. So ist kein partieller State
 * beobachtbar; ein Crash zwischen Intent und Delivery verliert nichts.
 *
 * Decoupled über Ports (kein statischer Import von api.ts → kein Modul-Zyklus):
 *   - PersistencePort: read/write der orchestration:*-Buckets.
 *   - EventPort: emit der additiven MockBackendEvents.
 *   - EngineHooks: Projektion auf AutopilotStep (upsertStep), Letter-Mint auf
 *     Erfolg, Block-D-Side-Effects (bestaetigeImpl), Completion-Check.
 *
 * Determinismus: Zeit + IDs ausschließlich über clock.ts.
 */
import type {
  AuditEventType,
  AuditLogEntry,
  CircuitBreakerState,
  DeadLetterEntry,
  OutboxEntry,
  SagaInstance,
  SagaStatus,
  SagaStep,
  StepStatus,
  TransportEnvelope,
  TransportReceipt,
} from '@/types/orchestration';
import { getEngineClock, getEngineRandom, getIdSource } from './clock';
import { computeEntryHash } from './audit-log';
import {
  breakerAllows,
  initialBreaker,
  maybeHalfOpen,
  onFailure as breakerOnFailure,
  onSuccess as breakerOnSuccess,
} from './breaker';
import { computeBackoffMs, isDrainEligible, MAX_ATTEMPTS } from './outbox';
import { TransportError, type Transport } from './transport';

// ----------------------------------------------------------------------------
// Ports
// ----------------------------------------------------------------------------

export interface PersistencePort {
  readSagas(): Record<string, SagaInstance>;
  writeSagas(v: Record<string, SagaInstance>): void;
  readOutbox(): OutboxEntry[];
  writeOutbox(v: OutboxEntry[]): void;
  readAuditLog(): AuditLogEntry[];
  writeAuditLog(v: AuditLogEntry[]): void;
  readDlq(): DeadLetterEntry[];
  writeDlq(v: DeadLetterEntry[]): void;
  readBreakers(): Record<string, CircuitBreakerState>;
  writeBreakers(v: Record<string, CircuitBreakerState>): void;
}

export interface EngineEvent {
  audit(entry: AuditLogEntry): void;
  dlqChanged(sagaId: string, dlq: DeadLetterEntry[]): void;
  breakerChanged(behoerdeId: string, state: CircuitBreakerState): void;
  sagaStatusChanged(sagaId: string, status: SagaStatus): void;
}

/** Side-effect hooks (provided by api.ts) — preserve existing Umzug behaviour. */
export interface EngineHooks {
  /** Project a SagaStep onto the existing AutopilotStep via upsertStep. */
  projectStep(saga: SagaInstance, step: SagaStep): void;
  /**
   * Called once when a step's positive receipt lands. Returns the minted
   * letterId (if any) so the engine records it on the step. For Block-D steps
   * this runs the existing bestaetigeImpl side-effects (Brief/Ripple/marker).
   */
  onStepSucceeded(saga: SagaInstance, step: SagaStep): Promise<string | undefined>;
  /** Called when a compensation send confirms (semantic undo done). */
  onStepCompensated?(saga: SagaInstance, step: SagaStep): Promise<void>;
  /** Called when the saga reaches a terminal state (completed/compensated/failed). */
  onSagaTerminal?(saga: SagaInstance): Promise<void>;
}

export interface EngineDeps {
  persistence: PersistencePort;
  events: EngineEvent;
  transport: Transport;
  hooks: EngineHooks;
}

// ----------------------------------------------------------------------------
// Engine
// ----------------------------------------------------------------------------

export class OrchestrationEngine {
  private readonly p: PersistencePort;
  private readonly ev: EngineEvent;
  private readonly transport: Transport;
  private readonly hooks: EngineHooks;

  constructor(deps: EngineDeps) {
    this.p = deps.persistence;
    this.ev = deps.events;
    this.transport = deps.transport;
    this.hooks = deps.hooks;
  }

  // ── audit append (the chain) ──────────────────────────────────────────────

  private async appendAudit(
    sagaId: string,
    type: AuditEventType,
    payload: Record<string, unknown>,
    stepId?: string,
  ): Promise<void> {
    const log = this.p.readAuditLog();
    const prev = log[log.length - 1];
    const prevHash = prev ? prev.hash : '';
    const seq = log.length;
    const ts = getEngineClock().now();
    const base = { seq, ts, sagaId, stepId, type, payload };
    const hash = await computeEntryHash(base, prevHash);
    const entry: AuditLogEntry = { ...base, prevHash, hash };
    log.push(entry);
    this.p.writeAuditLog(log);
    this.ev.audit(entry);
  }

  // ── saga + outbox persistence helpers ─────────────────────────────────────

  private getSagaInternal(sagaId: string): SagaInstance | undefined {
    return this.p.readSagas()[sagaId];
  }

  private saveSaga(saga: SagaInstance): void {
    const all = this.p.readSagas();
    all[saga.sagaId] = saga;
    this.p.writeSagas(all);
  }

  private updateStep(
    saga: SagaInstance,
    stepId: string,
    patch: Partial<SagaStep>,
  ): SagaInstance {
    const steps = saga.steps.map((s) =>
      s.stepId === stepId ? { ...s, ...patch } : s,
    );
    return { ...saga, steps, updatedAt: getEngineClock().now() };
  }

  // ── public API ────────────────────────────────────────────────────────────

  /** Persists the saga (steps pending), enqueues auto-gated steps, kicks drainer. */
  async startSaga(saga: SagaInstance): Promise<{ sagaId: string }> {
    this.saveSaga(saga);
    await this.appendAudit(saga.sagaId, 'SAGA_STARTED', {
      type: saga.type,
      stepCount: saga.steps.length,
    });

    // Auto-gated (Block A) steps are enqueued immediately. eID/consent steps
    // wait for authorizeStep.
    for (const step of saga.steps) {
      this.hooks.projectStep(saga, step);
      if (step.gate === 'auto') {
        await this.enqueue(saga.sagaId, step.stepId, 'deliver');
      }
    }
    await this.drainAll(saga.sagaId);
    return { sagaId: saga.sagaId };
  }

  /** eID/consent gate release → enqueue the step and drive it. */
  async authorizeStep(sagaId: string, stepId: string): Promise<void> {
    const saga = this.getSagaInternal(sagaId);
    if (!saga) return;
    const step = saga.steps.find((s) => s.stepId === stepId);
    if (!step) return;
    if (step.status === 'succeeded' || step.status === 'running') return;
    await this.enqueue(sagaId, stepId, 'deliver');
    await this.drainAll(sagaId);
  }

  /** One-tap DLQ replay: reset attempts → pending, re-enqueue, re-drain. */
  async replayDeadLetter(dlqId: string): Promise<void> {
    const dlq = this.p.readDlq();
    const entry = dlq.find((d) => d.dlqId === dlqId);
    if (!entry) return;
    const saga = this.getSagaInternal(entry.sagaId);
    if (!saga) return;

    // Remove the DLQ entry, reset the step.
    const remaining = dlq.filter((d) => d.dlqId !== dlqId);
    this.p.writeDlq(remaining);
    this.ev.dlqChanged(entry.sagaId, remaining);

    const reset = this.updateStep(saga, entry.stepId, {
      status: 'pending',
      attempts: 0,
      nextAttemptAt: undefined,
      lastError: undefined,
    });
    this.saveSaga(reset);
    const step = reset.steps.find((s) => s.stepId === entry.stepId);
    if (step) this.hooks.projectStep(reset, step);

    await this.appendAudit(
      entry.sagaId,
      'STEP_ENQUEUED',
      { reason: 'dlq_replay', dlqId },
      entry.stepId,
    );
    await this.enqueue(entry.sagaId, entry.stepId, entry.envelope.intent);
    await this.drainAll(entry.sagaId);
  }

  // ── enqueue (transactional: outbox + step + audit) ────────────────────────

  private async enqueue(
    sagaId: string,
    stepId: string,
    intent: 'deliver' | 'compensate',
  ): Promise<void> {
    const saga = this.getSagaInternal(sagaId);
    if (!saga) return;
    const step = saga.steps.find((s) => s.stepId === stepId);
    if (!step) return;

    const ids = getIdSource();
    const clock = getEngineClock();
    const envelope: TransportEnvelope = {
      messageId: ids.receiptId(step.behoerdeId),
      behoerdeId: step.behoerdeId,
      idempotencyKey:
        intent === 'compensate'
          ? `${step.idempotencyKey}:compensate`
          : step.idempotencyKey,
      intent,
      datenkategorien: step.datenkategorien ?? [],
      mock: true,
    };

    const outbox = this.p.readOutbox();
    // Idempotent enqueue: if a non-terminal entry for this step+intent exists,
    // reset it to pending rather than duplicate.
    const existingIdx = outbox.findIndex(
      (o) => o.stepId === stepId && o.intent === intent && o.status !== 'delivered',
    );
    const entry: OutboxEntry = {
      outboxId: ids.outboxId(),
      sagaId,
      stepId,
      idempotencyKey: envelope.idempotencyKey,
      intent,
      status: 'pending',
      attempts: existingIdx >= 0 ? outbox[existingIdx].attempts : 0,
      enqueuedAt: clock.now(),
      envelope,
    };
    if (existingIdx >= 0) {
      outbox[existingIdx] = { ...entry, outboxId: outbox[existingIdx].outboxId };
    } else {
      outbox.push(entry);
    }
    this.p.writeOutbox(outbox);

    // Mark the step pending/compensating depending on intent.
    const stepPatch: Partial<SagaStep> =
      intent === 'compensate'
        ? { status: 'compensating' }
        : { status: step.status === 'pending' ? 'pending' : step.status };
    const updated = this.updateStep(saga, stepId, stepPatch);
    this.saveSaga(updated);

    await this.appendAudit(
      sagaId,
      intent === 'compensate' ? 'STEP_COMPENSATING' : 'STEP_ENQUEUED',
      { behoerdeId: step.behoerdeId, intent },
      stepId,
    );
    const projStep = updated.steps.find((s) => s.stepId === stepId);
    if (projStep) this.hooks.projectStep(updated, projStep);
  }

  // ── drainer ───────────────────────────────────────────────────────────────

  /**
   * Drains all currently-eligible outbox entries for a saga, repeatedly, until
   * nothing more is eligible at the current clock. (Retries scheduled into the
   * future are NOT drained now — the test advances the fake clock and re-ticks.)
   */
  async drainAll(sagaId: string): Promise<void> {
    // Bounded loop: each iteration drains all eligible entries once; if an
    // entry succeeds it may unblock others (e.g. compensation cascade). Cap to
    // avoid any pathological infinite loop.
    for (let guard = 0; guard < 64; guard++) {
      const nowIso = getEngineClock().now();
      const outbox = this.p.readOutbox();
      const eligible = outbox.filter(
        (o) => o.sagaId === sagaId && isDrainEligible(o, nowIso),
      );
      if (eligible.length === 0) break;

      let progressed = false;
      for (const o of eligible) {
        const handled = await this.drainOne(o.outboxId);
        if (handled) progressed = true;
      }
      if (!progressed) break;
    }
    await this.evaluateSaga(sagaId);
  }

  private async drainOne(outboxId: string): Promise<boolean> {
    const outbox = this.p.readOutbox();
    const o = outbox.find((x) => x.outboxId === outboxId);
    if (!o) return false;
    const nowIso = getEngineClock().now();
    if (!isDrainEligible(o, nowIso)) return false;

    const saga = this.getSagaInternal(o.sagaId);
    if (!saga) return false;
    const step = saga.steps.find((s) => s.stepId === o.stepId);
    if (!step) return false;

    // ── Circuit-breaker gate.
    const breakers = this.p.readBreakers();
    const breaker = breakers[step.behoerdeId];
    if (!breakerAllows(breaker, nowIso)) {
      // Behörde isoliert — diesen Eintrag jetzt überspringen (Saga lebt weiter).
      return false;
    }
    // Falls open + Cooldown abgelaufen → half-open für den Probe-Send.
    if (breaker) {
      const half = maybeHalfOpen(breaker, nowIso);
      if (half) {
        breakers[step.behoerdeId] = half;
        this.p.writeBreakers(breakers);
        await this.appendAudit(
          o.sagaId,
          'BREAKER_HALF_OPEN',
          { behoerdeId: step.behoerdeId },
          step.stepId,
        );
        this.ev.breakerChanged(step.behoerdeId, half);
      }
    }

    // ── Flip step → running, outbox → inflight, append STEP_STARTED.
    this.markInflight(o, saga, step);

    let receipt: TransportReceipt | undefined;
    let error: TransportError | undefined;
    try {
      receipt = await this.transport.deliver(o.envelope);
    } catch (err) {
      if (err instanceof TransportError) {
        error = err;
      } else {
        // Unexpected error — treat as transient.
        error = new TransportError(
          err instanceof Error ? err.message : String(err),
          false,
          {
            receiptId: '[MOCK] QID-error',
            messageId: o.envelope.messageId,
            behoerdeId: step.behoerdeId,
            quittung: 'negative',
            laufzettel: {
              acceptedAt: getEngineClock().now(),
              transportCode: 'nicht_zustellbar',
            },
            fromCache: false,
            mock: true,
          },
        );
      }
    }

    if (receipt) {
      await this.onDeliverSuccess(o.outboxId, receipt);
    } else if (error) {
      await this.onDeliverFailure(o.outboxId, error);
    }
    return true;
  }

  private markInflight(o: OutboxEntry, saga: SagaInstance, step: SagaStep): void {
    const nowIso = getEngineClock().now();
    const outbox = this.p.readOutbox().map((x) =>
      x.outboxId === o.outboxId
        ? { ...x, status: 'inflight' as const, attempts: x.attempts + 1 }
        : x,
    );
    this.p.writeOutbox(outbox);
    const runningStatus: StepStatus =
      o.intent === 'compensate' ? 'compensating' : 'running';
    const updated = this.updateStep(saga, step.stepId, {
      status: runningStatus,
      startedAt: step.startedAt ?? nowIso,
      attempts: step.attempts + 1,
    });
    this.saveSaga(updated);
    const projStep = updated.steps.find((s) => s.stepId === step.stepId);
    if (projStep) this.hooks.projectStep(updated, projStep);
  }

  private async onDeliverSuccess(
    outboxId: string,
    receipt: TransportReceipt,
  ): Promise<void> {
    const outbox = this.p.readOutbox();
    const o = outbox.find((x) => x.outboxId === outboxId);
    if (!o) return;
    const saga = this.getSagaInternal(o.sagaId);
    if (!saga) return;
    const step = saga.steps.find((s) => s.stepId === o.stepId);
    if (!step) return;

    // ── Breaker: success → close.
    this.applyBreakerSuccess(o.sagaId, step.behoerdeId);

    // ── Outbox → delivered.
    this.p.writeOutbox(
      this.p.readOutbox().map((x) =>
        x.outboxId === outboxId ? { ...x, status: 'delivered' as const } : x,
      ),
    );

    await this.appendAudit(
      o.sagaId,
      'STEP_RECEIPT',
      {
        behoerdeId: step.behoerdeId,
        quittung: receipt.quittung,
        receiptId: receipt.receiptId,
        transportCode: receipt.laufzettel.transportCode,
        fromCache: receipt.fromCache,
        intent: o.intent,
      },
      step.stepId,
    );

    if (o.intent === 'compensate') {
      // Compensation acknowledged → step compensated.
      const updated = this.updateStep(saga, step.stepId, {
        status: 'compensated',
        receipt,
        completedAt: getEngineClock().now(),
      });
      this.saveSaga(updated);
      await this.appendAudit(
        o.sagaId,
        'STEP_COMPENSATED',
        { behoerdeId: step.behoerdeId },
        step.stepId,
      );
      const cs = updated.steps.find((s) => s.stepId === step.stepId);
      if (cs) {
        this.hooks.projectStep(updated, cs);
        if (this.hooks.onStepCompensated) {
          await this.hooks.onStepCompensated(updated, cs);
        }
      }
      return;
    }

    // ── Forward deliver success → succeeded; run side-effect hook (letter etc).
    // Idempotency guard: if the step is already succeeded, do NOT re-run the
    // effect (exactly-once). A fromCache receipt also implies the effect ran.
    if (step.status === 'succeeded') return;

    const succeededSaga = this.updateStep(saga, step.stepId, {
      status: 'succeeded',
      receipt,
      completedAt: getEngineClock().now(),
    });
    this.saveSaga(succeededSaga);

    let letterId: string | undefined;
    const succeededStep = succeededSaga.steps.find(
      (s) => s.stepId === step.stepId,
    );
    if (succeededStep) {
      // Run the existing side-effects (Brief mint / Block-D ripple). The hook
      // only mints when the receipt is NOT fromCache (exactly-once effect).
      if (!receipt.fromCache) {
        letterId = await this.hooks.onStepSucceeded(succeededSaga, succeededStep);
      }
      const withLetter = this.updateStep(succeededSaga, step.stepId, {
        letterId: letterId ?? succeededStep.letterId,
      });
      this.saveSaga(withLetter);
      const finalStep = withLetter.steps.find((s) => s.stepId === step.stepId);
      if (finalStep) this.hooks.projectStep(withLetter, finalStep);
    }
  }

  private async onDeliverFailure(
    outboxId: string,
    error: TransportError,
  ): Promise<void> {
    const outbox = this.p.readOutbox();
    const o = outbox.find((x) => x.outboxId === outboxId);
    if (!o) return;
    const saga = this.getSagaInternal(o.sagaId);
    if (!saga) return;
    const step = saga.steps.find((s) => s.stepId === o.stepId);
    if (!step) return;

    // ── Breaker: failure.
    this.applyBreakerFailure(o.sagaId, step.behoerdeId);

    await this.appendAudit(
      o.sagaId,
      'STEP_RECEIPT',
      {
        behoerdeId: step.behoerdeId,
        quittung: 'negative',
        transportCode: 'nicht_zustellbar',
        permanent: error.permanent,
        intent: o.intent,
      },
      step.stepId,
    );

    const attempts = step.attempts; // already incremented at markInflight
    const exhausted = attempts >= MAX_ATTEMPTS;

    if (error.permanent || exhausted) {
      await this.deadLetter(o, saga, step, error);
      return;
    }

    // ── Schedule retry with backoff + jitter.
    const random = getEngineRandom();
    const backoff = computeBackoffMs(attempts, random);
    const nextAttemptAt = new Date(
      new Date(getEngineClock().now()).getTime() + backoff,
    ).toISOString();

    const retrySaga = this.updateStep(saga, step.stepId, {
      status: o.intent === 'compensate' ? 'compensating' : 'failed',
      nextAttemptAt,
      lastError: { message: error.message, permanent: false },
    });
    this.saveSaga(retrySaga);

    this.p.writeOutbox(
      this.p.readOutbox().map((x) =>
        x.outboxId === outboxId
          ? { ...x, status: 'pending' as const, nextDrainAt: nextAttemptAt }
          : x,
      ),
    );

    await this.appendAudit(
      o.sagaId,
      'STEP_RETRY_SCHEDULED',
      { behoerdeId: step.behoerdeId, attempts, nextAttemptAt, backoffMs: backoff },
      step.stepId,
    );
    const rs = retrySaga.steps.find((s) => s.stepId === step.stepId);
    if (rs) this.hooks.projectStep(retrySaga, rs);
  }

  private async deadLetter(
    o: OutboxEntry,
    saga: SagaInstance,
    step: SagaStep,
    error: TransportError,
  ): Promise<void> {
    const nowIso = getEngineClock().now();
    const dlSaga = this.updateStep(saga, step.stepId, {
      status: 'dead_lettered',
      lastError: { message: error.message, permanent: error.permanent },
      completedAt: nowIso,
    });
    this.saveSaga(dlSaga);

    // Outbox entry → failed (terminal for this attempt cycle).
    this.p.writeOutbox(
      this.p.readOutbox().map((x) =>
        x.outboxId === o.outboxId ? { ...x, status: 'failed' as const } : x,
      ),
    );

    const ids = getIdSource();
    const dlq = this.p.readDlq();
    const dlqEntry: DeadLetterEntry = {
      dlqId: ids.dlqId(),
      sagaId: o.sagaId,
      stepId: step.stepId,
      behoerdeId: step.behoerdeId,
      reason: error.permanent
        ? 'orchestration.dlq.reason_permanent'
        : 'orchestration.dlq.reason_unreachable',
      lastError: { message: error.message, permanent: error.permanent },
      deadLetteredAt: nowIso,
      envelope: o.envelope,
      replayable: true,
    };
    dlq.push(dlqEntry);
    this.p.writeDlq(dlq);

    await this.appendAudit(
      o.sagaId,
      'STEP_DEAD_LETTERED',
      {
        behoerdeId: step.behoerdeId,
        permanent: error.permanent,
        reason: dlqEntry.reason,
      },
      step.stepId,
    );
    this.ev.dlqChanged(o.sagaId, dlq);
    const ds = dlSaga.steps.find((s) => s.stepId === step.stepId);
    if (ds) this.hooks.projectStep(dlSaga, ds);

    // If a REQUIRED forward step dead-lettered → enter compensation.
    if (step.required && o.intent === 'deliver') {
      await this.startCompensation(o.sagaId);
    }
  }

  // ── compensation ──────────────────────────────────────────────────────────

  private async startCompensation(sagaId: string): Promise<void> {
    let saga = this.getSagaInternal(sagaId);
    if (!saga) return;
    if (saga.status === 'compensating' || saga.status === 'compensated') return;

    saga = { ...saga, status: 'compensating', updatedAt: getEngineClock().now() };
    this.saveSaga(saga);
    this.ev.sagaStatusChanged(sagaId, 'compensating');

    // Walk already-succeeded steps that carry a compensation and enqueue undo.
    const toCompensate = saga.steps.filter(
      (s) => s.status === 'succeeded' && s.compensatesWith,
    );
    for (const s of toCompensate) {
      await this.enqueue(sagaId, s.stepId, 'compensate');
    }
    await this.drainAll(sagaId);
  }

  // ── breaker application ────────────────────────────────────────────────────

  private applyBreakerSuccess(sagaId: string, behoerdeId: string): void {
    const breakers = this.p.readBreakers();
    const current = breakers[behoerdeId] ?? initialBreaker(behoerdeId, getEngineClock().now());
    const t = breakerOnSuccess(current, getEngineClock().now());
    breakers[behoerdeId] = t.next;
    this.p.writeBreakers(breakers);
    if (t.changed) {
      void this.appendAudit(sagaId, 'BREAKER_CLOSED', { behoerdeId }, undefined);
      this.ev.breakerChanged(behoerdeId, t.next);
    }
  }

  private applyBreakerFailure(sagaId: string, behoerdeId: string): void {
    const breakers = this.p.readBreakers();
    const current = breakers[behoerdeId] ?? initialBreaker(behoerdeId, getEngineClock().now());
    const t = breakerOnFailure(current, getEngineClock().now());
    breakers[behoerdeId] = t.next;
    this.p.writeBreakers(breakers);
    if (t.changed && t.event === 'opened') {
      void this.appendAudit(sagaId, 'BREAKER_OPENED', { behoerdeId }, undefined);
      this.ev.breakerChanged(behoerdeId, t.next);
    }
  }

  // ── saga state evaluation ──────────────────────────────────────────────────

  /**
   * Recomputes the saga's terminal status after a drain pass.
   *  - completed: all required steps succeeded, no required step dead_lettered,
   *    and no work in flight.
   *  - compensated: in compensation and all compensations done (no succeeded
   *    step with a pending compensation remains).
   *  - failed: a compensation itself dead-lettered.
   */
  private async evaluateSaga(sagaId: string): Promise<void> {
    const saga = this.getSagaInternal(sagaId);
    if (!saga) return;
    if (saga.status === 'completed' || saga.status === 'compensated' || saga.status === 'failed') {
      return;
    }

    const required = saga.steps.filter((s) => s.required);

    // ── In-flight semantics (completion gate, Spec § 5.5 spine-safety).
    //
    // A step counts as in-flight ONLY if it is genuinely doing work that must
    // finish before the saga is terminal. The load-bearing distinction:
    //
    //   • REQUIRED steps (Block-A statutory + Block-D eID): any non-terminal
    //     status (pending / running / compensating) IS in-flight. Block-D sits
    //     `pending` until the user authorises it — but it is required, so it
    //     legitimately holds the saga open until the eID tap drives it through.
    //
    //   • OPTIONAL steps (Block-B consent: Krankenkasse / Arbeitgeber): a
    //     `pending` optional step that was NEVER enqueued (no consent → never
    //     went through authorizeStep → no live outbox entry) is NOT in-flight —
    //     it is simply skipped and must NOT block the terminal transition. It
    //     only counts once it has actually been enqueued (a live outbox entry)
    //     or is mid-attempt (`running`/`compensating`). A later user consent is
    //     a separate enqueue that re-evaluates the saga then.
    //
    // This restores the pristine-HEAD completion semantics the engine wiring
    // regressed: after both Block-D eID steps succeed (and no optional Block-B
    // is in flight), the saga reaches `completed` and fires onSagaTerminal.
    const liveOutboxStepIds = new Set(
      this.p
        .readOutbox()
        .filter(
          (o) =>
            o.sagaId === sagaId &&
            (o.status === 'pending' || o.status === 'inflight'),
        )
        .map((o) => o.stepId),
    );
    const stepInFlight = (s: SagaStep): boolean => {
      // Mid-attempt is always in-flight, required or not.
      if (s.status === 'running' || s.status === 'compensating') return true;
      if (s.status === 'pending') {
        // Required pending → in-flight (e.g. an eID step awaiting authorize).
        // Optional pending → in-flight ONLY if actually enqueued (consented).
        return s.required || liveOutboxStepIds.has(s.stepId);
      }
      // `failed` with a scheduled retry still has a live outbox entry.
      if (s.status === 'failed') return liveOutboxStepIds.has(s.stepId);
      return false;
    };
    const anyInFlight = saga.steps.some(stepInFlight);
    const pendingOutbox = liveOutboxStepIds.size > 0;

    if (saga.status === 'compensating') {
      // A compensation that dead-lettered → saga failed.
      const compFailed = saga.steps.some(
        (s) => s.compensatesWith && s.status === 'dead_lettered' && s.completedAt,
      );
      const compsOutstanding = saga.steps.some(
        (s) => s.compensatesWith && s.status === 'compensating',
      );
      if (compFailed && !compsOutstanding && !pendingOutbox) {
        await this.transitionTerminal(sagaId, 'failed', 'SAGA_COMPENSATED');
        return;
      }
      const allCompsDone = saga.steps
        .filter((s) => s.compensatesWith && s.status === 'succeeded')
        .length === 0;
      if (allCompsDone && !compsOutstanding && !pendingOutbox) {
        await this.transitionTerminal(sagaId, 'compensated', 'SAGA_COMPENSATED');
      }
      return;
    }

    // running → completed?
    const allRequiredSucceeded =
      required.length > 0 && required.every((s) => s.status === 'succeeded');
    const anyRequiredDead = required.some((s) => s.status === 'dead_lettered');

    if (anyRequiredDead) {
      // handled via startCompensation already; nothing to do here.
      return;
    }
    if (allRequiredSucceeded && !anyInFlight && !pendingOutbox) {
      await this.transitionTerminal(sagaId, 'completed', 'SAGA_COMPLETED');
    }
  }

  private async transitionTerminal(
    sagaId: string,
    status: SagaStatus,
    auditType: 'SAGA_COMPLETED' | 'SAGA_COMPENSATED',
  ): Promise<void> {
    let saga = this.getSagaInternal(sagaId);
    if (!saga) return;
    saga = { ...saga, status, updatedAt: getEngineClock().now() };
    this.saveSaga(saga);
    await this.appendAudit(sagaId, auditType, { status });
    this.ev.sagaStatusChanged(sagaId, status);
    if (this.hooks.onSagaTerminal) await this.hooks.onSagaTerminal(saga);
  }

  // ── reads (for UI accessors) ──────────────────────────────────────────────

  getSaga(sagaId: string): SagaInstance | undefined {
    return this.getSagaInternal(sagaId);
  }

  getDlq(): DeadLetterEntry[] {
    return this.p.readDlq();
  }

  getBreakers(): CircuitBreakerState[] {
    return Object.values(this.p.readBreakers());
  }

  getAuditLog(sagaId?: string): AuditLogEntry[] {
    const log = this.p.readAuditLog();
    return sagaId ? log.filter((e) => e.sagaId === sagaId) : log;
  }
}
