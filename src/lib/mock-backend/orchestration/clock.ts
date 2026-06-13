/**
 * Determinismus-Seam (Spec § 3.1) — injizierte Clock + IdSource.
 *
 * Die load-bearing Testbarkeits-Constraint des Engines: KEINE reine Engine-
 * Funktion liest `Date.now()` / `Math.random()` / `crypto.randomUUID()` direkt.
 * Stattdessen lösen alle Module Zeit + IDs über das modul-weite Singleton hier
 * auf, das Tests über `__setEngineClock()` / `__setIdSource()` / `__setRandom()`
 * austauschen. Production wired die echte Clock + die bestehende `uuid()`/
 * `aktenzeichenForBehoerde()`-basierte IdSource.
 */
import { uuid } from '../id';

export interface EngineClock {
  /** ISO-8601 string. */
  now(): string;
}

export interface IdSource {
  sagaId(vorgangId: string): string;
  stepId(sagaId: string, name: string): string;
  outboxId(): string;
  dlqId(): string;
  receiptId(behoerdeId: string): string;
}

/** Random in [0,1) — injectable so backoff jitter is deterministic in tests. */
export type EngineRandom = () => number;

// ----------------------------------------------------------------------------
// Production defaults
// ----------------------------------------------------------------------------

const realClock: EngineClock = {
  now: () => new Date().toISOString(),
};

const realIdSource: IdSource = {
  // sagaId === vorgangId (§ 5.1): one saga per Umzug Vorgang.
  sagaId: (vorgangId) => vorgangId,
  stepId: (sagaId, name) => `${sagaId}:${name}`,
  outboxId: () => `outbox-${uuid()}`,
  dlqId: () => `dlq-${uuid()}`,
  receiptId: (behoerdeId) => `[MOCK] QID-${behoerdeId}-${uuid().slice(0, 8)}`,
};

const realRandom: EngineRandom = () => Math.random();

// ----------------------------------------------------------------------------
// Module-level injectable singletons
// ----------------------------------------------------------------------------

let currentClock: EngineClock = realClock;
let currentIds: IdSource = realIdSource;
let currentRandom: EngineRandom = realRandom;

export function getEngineClock(): EngineClock {
  return currentClock;
}

export function getIdSource(): IdSource {
  return currentIds;
}

export function getEngineRandom(): EngineRandom {
  return currentRandom;
}

// ----------------------------------------------------------------------------
// Test hooks (no-op in prod call sites; only the test harness flips these)
// ----------------------------------------------------------------------------

export function __setEngineClock(clock: EngineClock): void {
  currentClock = clock;
}

export function __setIdSource(ids: IdSource): void {
  currentIds = ids;
}

export function __setEngineRandom(random: EngineRandom): void {
  currentRandom = random;
}

export function __resetEngineDeterminism(): void {
  currentClock = realClock;
  currentIds = realIdSource;
  currentRandom = realRandom;
}

/**
 * A controllable fake clock for tests. `tick(ms)` advances the wall time;
 * `now()` returns the current frozen ISO string. Counter-based IDs are provided
 * by `makeCounterIdSource()`.
 */
export function makeFakeClock(startIso = '2027-01-01T00:00:00.000Z'): EngineClock & {
  tick(ms: number): void;
  setNow(iso: string): void;
} {
  let t = new Date(startIso).getTime();
  return {
    now: () => new Date(t).toISOString(),
    tick: (ms: number) => {
      t += ms;
    },
    setNow: (iso: string) => {
      t = new Date(iso).getTime();
    },
  };
}

/** Counter-based deterministic IdSource for tests. */
export function makeCounterIdSource(): IdSource {
  let outbox = 0;
  let dlq = 0;
  let receipt = 0;
  return {
    sagaId: (vorgangId) => vorgangId,
    stepId: (sagaId, name) => `${sagaId}:${name}`,
    outboxId: () => `outbox-${++outbox}`,
    dlqId: () => `dlq-${++dlq}`,
    receiptId: (behoerdeId) => `[MOCK] QID-${behoerdeId}-${++receipt}`,
  };
}
