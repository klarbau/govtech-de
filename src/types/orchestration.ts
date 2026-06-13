/**
 * Resilient Orchestration Engine — Datenmodell (Spec `resilient-orchestration-engine.md` § 2).
 *
 * Re-platforms the shipped Umzug-Autopilot onto a genuinely resilient Saga
 * machine: persisted Saga-Schritte mit Kompensation, Idempotenz, Retry/DLQ und
 * Circuit-Breaker, protokolliert in einem fälschungs-EVIDENTEN
 * (SHA-256-hash-verketteten) Append-only-Log.
 *
 * Honesty (§ 10): Alles ist `[MOCK]`. Der Audit-Log ist tamper-EVIDENT (Hash-
 * Kette), NICHT tamper-proof. OSCI/XTA-Shaping ist Inspiration, kein echtes
 * Protokoll. Idempotenz/Outbox/Retry/Breaker stammen aus der allgemeinen
 * Distributed-Systems-Literatur — NICHT aus X-Road (dessen Kern-Protokolle
 * synchrones RPC sind).
 *
 * Determinismus-Regel (load-bearing, § 2 Preamble): KEIN Typ hier trägt einen
 * implizit erzeugten Wert. Jede `id`, `seq` und jeder Timestamp wird vom
 * Aufrufer über die injizierte Clock/IdSource (§ 3.1) gesetzt, niemals von
 * einem bare `Date.now()` / `Math.random()` / `crypto.randomUUID()` INNERHALB
 * reiner Engine-Logik.
 */
import type { BehoerdeId } from './behoerde';
import type { BlockTyp } from './vorgang';

// ----------------------------------------------------------------------------
// § 2.1 Saga
// ----------------------------------------------------------------------------

export type SagaType = 'umzug';

export type SagaStatus =
  /** at least one step still pending/running/retrying */
  | 'running'
  /** all required steps succeeded; optional steps succeeded/skipped */
  | 'completed'
  /** a required step dead-lettered → driving compensations */
  | 'compensating'
  /** all started steps rolled back (honest partial-failure end state) */
  | 'compensated'
  /** compensation itself could not complete (surfaced, never silent) */
  | 'failed';

export type StepStatus =
  /** created, not yet attempted (outbox not yet drained) */
  | 'pending'
  /** an attempt is in flight against the transport */
  | 'running'
  /** a positive Quittung (receipt) was recorded */
  | 'succeeded'
  /** last attempt failed; eligible for retry until attempts exhausted */
  | 'failed'
  /** a compensation send is in flight */
  | 'compensating'
  /** compensation acknowledged (semantic undo done) */
  | 'compensated'
  /** attempts exhausted OR permanent error → parked in DLQ, replayable */
  | 'dead_lettered';

/** How the citizen's authorisation gates a step (mirrors today's Block A/B/D). */
export type StepGate = 'auto' | 'eid' | 'consent';

export interface SagaStep {
  /** stable within the saga; `${sagaId}:${shortName}` form recommended */
  stepId: string;
  behoerdeId: BehoerdeId;
  /** Maps onto the existing cascade block so the UI keeps its A→D→B ordering. */
  block: BlockTyp;
  gate: StepGate;
  /** required steps drive saga-level completion/compensation */
  required: boolean;
  /** = `${sagaId}:${stepId}` — generated once at saga creation (§ 3.2) */
  idempotencyKey: string;
  status: StepStatus;
  /** increments per transport attempt */
  attempts: number;
  /** Backoff bookkeeping — injected-clock ISO string (§ 3.3). */
  nextAttemptAt?: string;
  lastError?: { message: string; permanent: boolean };
  /** the OSCI/XTA-inspired Quittung (§ 4) */
  receipt?: TransportReceipt;
  /** stepId of the compensation, or a well-known compensation key */
  compensatesWith?: string;
  /** Carried through to the cascade UI unchanged (legal micro-line; § 5.3). */
  rechtsgrundlage: string;
  /** Carried through unchanged: the delegated agent-voice primary line. */
  agentLabel?: string;
  /** Datenkategorien carried to the transport envelope (Datenminimierung). */
  datenkategorien?: string[];
  /** Klartext-Aktion, carried verbatim onto the projected AutopilotStep. */
  aktion?: string;
  startedAt?: string;
  completedAt?: string;
  /** ID of the synthetic Bestätigungsschreiben minted on success. */
  letterId?: string;
  /** the AutopilotStep id this Saga step projects onto (1:1 with stepId). */
  autopilotStepId: string;
}

export interface SagaInstance {
  /** = the existing vorgangId — ONE saga per Umzug Vorgang (§ 5.1) */
  sagaId: string;
  type: SagaType;
  /** 1:1 with sagaId; kept explicit for the join to Vorgang */
  vorgangId: string;
  personaId: string;
  status: SagaStatus;
  steps: SagaStep[];
  createdAt: string;
  updatedAt: string;
  /** Free context from startUmzug (neue_adresse, stichtag…) — read-only to the engine. */
  context: Record<string, unknown>;
}

// ----------------------------------------------------------------------------
// § 2.2 Outbox
// ----------------------------------------------------------------------------

export type OutboxStatus = 'pending' | 'inflight' | 'delivered' | 'failed';

export interface OutboxEntry {
  outboxId: string;
  sagaId: string;
  stepId: string;
  /** duplicate of step's key — the transport dedupes on THIS */
  idempotencyKey: string;
  /** 'deliver' = forward send; 'compensate' = the semantic-undo send. */
  intent: 'deliver' | 'compensate';
  status: OutboxStatus;
  attempts: number;
  enqueuedAt: string;
  /** backoff target; the drainer skips entries until clock ≥ this */
  nextDrainAt?: string;
  /** Snapshot of what would be sent — for replay after crash. */
  envelope: TransportEnvelope;
}

// ----------------------------------------------------------------------------
// § 2.3 Audit log (the DR + non-repudiation substrate)
// ----------------------------------------------------------------------------

export type AuditEventType =
  | 'SAGA_STARTED'
  | 'STEP_ENQUEUED'
  | 'STEP_STARTED'
  /** positive or negative Quittung recorded */
  | 'STEP_RECEIPT'
  | 'STEP_RETRY_SCHEDULED'
  | 'STEP_DEAD_LETTERED'
  | 'STEP_COMPENSATING'
  | 'STEP_COMPENSATED'
  | 'BREAKER_OPENED'
  | 'BREAKER_HALF_OPEN'
  | 'BREAKER_CLOSED'
  | 'SAGA_COMPLETED'
  | 'SAGA_COMPENSATED'
  /** emitted once per saga reconstructed on boot */
  | 'RECOVERY_REPLAYED';

export interface AuditLogEntry {
  /** strictly monotonic, 0-based, per-store (NOT per-saga) — the chain order */
  seq: number;
  ts: string;
  sagaId: string;
  stepId?: string;
  type: AuditEventType;
  /** event-specific payload (Behörde, receipt id, error, breaker state…). */
  payload: Record<string, unknown>;
  /** hash of seq-1 entry; '' (empty string) for seq 0 (the genesis link) */
  prevHash: string;
  /** = sha256Hex(prevHash + canonicalJson({seq, ts, sagaId, stepId, type, payload})) */
  hash: string;
}

// ----------------------------------------------------------------------------
// § 2.4 Dead-letter & circuit-breaker
// ----------------------------------------------------------------------------

export interface DeadLetterEntry {
  dlqId: string;
  sagaId: string;
  stepId: string;
  behoerdeId: BehoerdeId;
  /** human-readable DE reason (i18n key id — § 8) */
  reason: string;
  lastError: { message: string; permanent: boolean };
  deadLetteredAt: string;
  /** Snapshot so a one-tap replay can re-enqueue without re-deriving. */
  envelope: TransportEnvelope;
  /** always true in this demo; one tap resets attempts (§ 3.6) */
  replayable: true;
}

export type BreakerState = 'closed' | 'open' | 'half_open';

export interface CircuitBreakerState {
  /** one breaker per authority */
  behoerdeId: BehoerdeId;
  state: BreakerState;
  consecutiveFailures: number;
  /** When OPEN, the clock value after which a single half-open probe is allowed. */
  openUntil?: string;
  updatedAt: string;
}

// ----------------------------------------------------------------------------
// § 4 Transport boundary (OSCI/XTA-INSPIRED — NOT real OSCI/XTA)
// ----------------------------------------------------------------------------

export interface TransportEnvelope {
  /** synthetic; ids.receiptId-style */
  messageId: string;
  behoerdeId: BehoerdeId;
  /** the transport dedupes on THIS key */
  idempotencyKey: string;
  intent: 'deliver' | 'compensate';
  /** carried from the step (Datenminimierung) */
  datenkategorien: string[];
  /** structural honesty marker */
  mock: true;
}

export type Quittung = 'positive' | 'negative';

export interface TransportReceipt {
  /** Quittungs-ID */
  receiptId: string;
  messageId: string;
  behoerdeId: BehoerdeId;
  /** positive = "Auftrag ausgeführt"; negative = "nicht zustellbar" */
  quittung: Quittung;
  /** OSCI-Laufzettel-inspired routing slip */
  laufzettel: {
    /** injected-clock ISO ("delivery timestamp") */
    acceptedAt: string;
    transportCode: 'ausgefuehrt' | 'nicht_zustellbar';
  };
  /** True when this receipt was returned from the dedupe cache (idempotent replay). */
  fromCache: boolean;
  mock: true;
}

// ----------------------------------------------------------------------------
// Saga definition (input to engine.startSaga) — § 3.2
// ----------------------------------------------------------------------------

export interface UmzugSagaDefinition {
  saga: SagaInstance;
}
