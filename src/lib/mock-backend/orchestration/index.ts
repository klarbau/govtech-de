/**
 * Barrel + Production-Wiring der Resilient Orchestration Engine.
 *
 * Stellt eine LAZY-Singleton-Engine bereit, die `api.ts` mit seinen Hooks
 * (Projektion auf AutopilotStep, Letter-Mint, Block-D-Side-Effects)
 * konfiguriert. Die Persistence-Ports binden an den bestehenden
 * `persistence.ts`-Pfad (`govtech-de:v1:orchestration:*`, eigener
 * Schema-Version-Marker — KEIN globaler v1→v2-Bump). Der Event-Port bindet an
 * `events.ts:emit`. Determinismus + Reliable-Mode laufen über clock.ts /
 * latency.ts-Konventionen.
 */
import type {
  AuditLogEntry,
  CircuitBreakerState,
  DeadLetterEntry,
  OutboxEntry,
  SagaInstance,
} from '@/types/orchestration';
import { read, write, type CollectionKey } from '../persistence';
import { emit } from '../events';
import { isReliableModeForEngine } from './reliable';
import {
  OrchestrationEngine,
  type EngineEvent,
  type EngineHooks,
  type PersistencePort,
} from './engine';
import { createMockTransport, type Transport } from './transport';
import { recoverOnBoot, type RecoveryResult } from './recovery';
import { verifyChainSync, computeEntryHash } from './audit-log';
import { getEngineClock } from './clock';
import {
  auditLogArraySchema,
  breakersMapSchema,
  dlqArraySchema,
  outboxArraySchema,
  sagasMapSchema,
  schemaVersionSchema,
} from './schemas';

export const ORCHESTRATION_SCHEMA_VERSION = 1;

// ── Persistence port over persistence.ts ──────────────────────────────────────

function readBucket<T>(
  key: CollectionKey,
  schema: Parameters<typeof read<T>>[1],
  fallback: T,
): T {
  const v = read<T>(key, schema);
  return v ?? fallback;
}

const persistencePort: PersistencePort = {
  readSagas: () =>
    readBucket(
      'orchestration:sagas' as CollectionKey,
      sagasMapSchema as unknown as Parameters<
        typeof read<Record<string, SagaInstance>>
      >[1],
      {} as Record<string, SagaInstance>,
    ),
  writeSagas: (v) => write('orchestration:sagas' as CollectionKey, v),
  readOutbox: () =>
    readBucket(
      'orchestration:outbox' as CollectionKey,
      outboxArraySchema as unknown as Parameters<typeof read<OutboxEntry[]>>[1],
      [] as OutboxEntry[],
    ),
  writeOutbox: (v) => write('orchestration:outbox' as CollectionKey, v),
  readAuditLog: () =>
    readBucket(
      'orchestration:audit-log' as CollectionKey,
      auditLogArraySchema as unknown as Parameters<
        typeof read<AuditLogEntry[]>
      >[1],
      [] as AuditLogEntry[],
    ),
  writeAuditLog: (v) => write('orchestration:audit-log' as CollectionKey, v),
  readDlq: () =>
    readBucket(
      'orchestration:dlq' as CollectionKey,
      dlqArraySchema as unknown as Parameters<typeof read<DeadLetterEntry[]>>[1],
      [] as DeadLetterEntry[],
    ),
  writeDlq: (v) => write('orchestration:dlq' as CollectionKey, v),
  readBreakers: () =>
    readBucket(
      'orchestration:breakers' as CollectionKey,
      breakersMapSchema as unknown as Parameters<
        typeof read<Record<string, CircuitBreakerState>>
      >[1],
      {} as Record<string, CircuitBreakerState>,
    ),
  writeBreakers: (v) => write('orchestration:breakers' as CollectionKey, v),
};

// ── Event port over events.ts:emit ────────────────────────────────────────────

const eventPort: EngineEvent = {
  audit: (entry) => emit({ type: 'audit_appended', sagaId: entry.sagaId, entry }),
  dlqChanged: (sagaId, dlq) => emit({ type: 'dlq_changed', sagaId, dlq }),
  breakerChanged: (behoerdeId, state) =>
    emit({ type: 'breaker_changed', behoerdeId, state }),
  sagaStatusChanged: (sagaId, status) =>
    emit({ type: 'saga_status_changed', sagaId, status }),
};

// ── Transport (mock; reliable mode disables the random fault) ─────────────────

let transportSingleton: Transport | undefined;
function getTransport(): Transport {
  if (!transportSingleton) {
    transportSingleton = createMockTransport({
      reliable: () => isReliableModeForEngine(),
      // The engine drives faults explicitly via __test.forceFail (deterministic
      // proofs); the random rate stays 0 so the spine is deterministic. The 5%
      // UI-path fault remains in latency.ts, untouched.
      randomFailRate: 0,
    });
  }
  return transportSingleton;
}

// ── Lazy engine singleton, configured by api.ts via setEngineHooks ────────────

let engineSingleton: OrchestrationEngine | undefined;
let configuredHooks: EngineHooks | undefined;

const NOOP_HOOKS: EngineHooks = {
  projectStep: () => {},
  onStepSucceeded: async () => undefined,
};

/** api.ts calls this once at module init to inject projection + side-effects. */
export function setEngineHooks(hooks: EngineHooks): void {
  configuredHooks = hooks;
  // Recreate the engine so the new hooks take effect.
  engineSingleton = undefined;
}

export function getEngine(): OrchestrationEngine {
  if (!engineSingleton) {
    engineSingleton = new OrchestrationEngine({
      persistence: persistencePort,
      events: eventPort,
      transport: getTransport(),
      hooks: configuredHooks ?? NOOP_HOOKS,
    });
  }
  return engineSingleton;
}

// ── verifyChain (delegates to audit-log.ts) ───────────────────────────────────

export function verifyChain(): { ok: boolean; brokenAtSeq?: number; count: number } {
  return verifyChainSync(persistencePort.readAuditLog());
}

// ── recovery on boot (guarded once per page load by api.ts) ───────────────────

export async function runRecoverOnBoot(): Promise<RecoveryResult> {
  // Ensure the schema-version marker exists (future migration seam).
  const ver = read<{ version: number }>(
    'orchestration:schema-version' as CollectionKey,
    schemaVersionSchema,
  );
  if (!ver) {
    write('orchestration:schema-version' as CollectionKey, {
      version: ORCHESTRATION_SCHEMA_VERSION,
    });
  }

  const engine = getEngine();
  return recoverOnBoot({
    persistence: persistencePort,
    events: eventPort,
    engine,
    appendRecoveryAudit: async (sagaId: string) => {
      const log = persistencePort.readAuditLog();
      const prev = log[log.length - 1];
      const prevHash = prev ? prev.hash : '';
      const seq = log.length;
      const ts = getEngineClock().now();
      const base = {
        seq,
        ts,
        sagaId,
        stepId: undefined as string | undefined,
        type: 'RECOVERY_REPLAYED' as const,
        payload: {},
      };
      const hash = await computeEntryHash(base, prevHash);
      const entry: AuditLogEntry = { ...base, prevHash, hash };
      log.push(entry);
      persistencePort.writeAuditLog(log);
      eventPort.audit(entry);
    },
  });
}

// ── Test-only access to the persistence port + transport (proofs § 7) ─────────

export const __orchestrationInternals = {
  persistencePort,
  getTransport,
};

export { OrchestrationEngine } from './engine';
export type { EngineHooks, PersistencePort, EngineEvent } from './engine';
export type { RecoveryResult } from './recovery';
export { verifyChainSync, sha256Hex, sha256HexPure, canonicalJson } from './audit-log';
export {
  makeFakeClock,
  makeCounterIdSource,
  __setEngineClock,
  __setIdSource,
  __setEngineRandom,
  __resetEngineDeterminism,
} from './clock';
export { buildUmzugSaga, COMPENSATION_TARGET_BEHOERDE } from './saga-defs';
export { MAX_ATTEMPTS } from './outbox';
export { BREAKER_OPEN_THRESHOLD, BREAKER_COOLDOWN_MS } from './breaker';
