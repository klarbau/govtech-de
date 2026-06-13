/**
 * Replay-on-Boot / Recovery (Spec § 3.7) — die DR-Story.
 *
 * Läuft einmal beim Store-Init (nach seedIfEmpty, vor der ersten Panel-
 * Subscription). Rekonstruiert in-flight Sagas aus dem persistierten Log/
 * Snapshot und setzt den Drainer fort. RPO ≈ 0 (Append-only-Log + transaktional
 * geschriebener Saga/Outbox-Snapshot), RTO = ein Prozess-Restart.
 *
 * Honesty (§ 10): best-effort Replay eines Single-Process-localStorage-Stores —
 * KEINE Multi-Node-DR-Garantie, keine Data-Embassy, nicht geo-redundant.
 */
import type {
  AuditLogEntry,
  OutboxEntry,
  SagaInstance,
} from '@/types/orchestration';
import { getEngineClock } from './clock';
import { verifyChainSync } from './audit-log';
import type { OrchestrationEngine, PersistencePort, EngineEvent } from './engine';

export interface RecoveryResult {
  recovered: number;
  degraded: boolean;
}

export interface RecoveryDeps {
  persistence: PersistencePort;
  events: EngineEvent;
  engine: OrchestrationEngine;
  /** Appends a RECOVERY_REPLAYED audit entry for a recovered saga. */
  appendRecoveryAudit: (sagaId: string) => Promise<void>;
}

/**
 * Reads the persisted engine state, runs the integrity gate, resets any
 * mid-send (`inflight`) outbox entries to `pending`, marks in-flight sagas as
 * recovered, and resumes the drainer.
 */
export async function recoverOnBoot(deps: RecoveryDeps): Promise<RecoveryResult> {
  const { persistence, engine, appendRecoveryAudit } = deps;

  const sagasMap: Record<string, SagaInstance> = persistence.readSagas();
  const outbox: OutboxEntry[] = persistence.readOutbox();
  const log: AuditLogEntry[] = persistence.readAuditLog();

  // 2) Integrity gate — do NOT crash on a broken chain; the snapshot is the
  //    operational truth, the chain is the evidence. Mark degraded + proceed.
  let degraded = false;
  if (log.length > 0) {
    const verify = verifyChainSync(log);
    if (!verify.ok) {
      degraded = true;
      if (typeof console !== 'undefined') {
        console.warn(
          `[orchestration] audit chain integrity could not be confirmed (breaks at seq ${verify.brokenAtSeq}); recovery proceeds from snapshot (degraded).`,
        );
      }
    }
  }

  const inFlightSagas = Object.values(sagasMap).filter(
    (s) => s.status === 'running' || s.status === 'compensating',
  );

  if (inFlightSagas.length === 0) {
    return { recovered: 0, degraded };
  }

  // 4) Re-arm: any outbox entry left `inflight` (tab died mid-send) → `pending`
  //    so the drainer re-attempts it (idempotency makes the duplicate safe).
  const rearmed = outbox.map((o) =>
    o.status === 'inflight' ? { ...o, status: 'pending' as const } : o,
  );
  persistence.writeOutbox(rearmed);

  // 3) One RECOVERY_REPLAYED audit per recovered saga (UI banner keys on this).
  for (const saga of inFlightSagas) {
    await appendRecoveryAudit(saga.sagaId);
  }

  // 5) Resume the drainer for each in-flight saga. No step with a positive
  //    receipt is re-run with effect (idempotent); pending/inflight continue.
  for (const saga of inFlightSagas) {
    await engine.drainAll(saga.sagaId);
  }

  void getEngineClock; // referenced for determinism documentation
  return { recovered: inFlightSagas.length, degraded };
}
