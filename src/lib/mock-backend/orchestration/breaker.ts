/**
 * Per-Authority Circuit-Breaker (Spec § 2.4, § 3, proof (d)).
 *
 * Ein Breaker pro Behörde isoliert eine ausgefallene Stelle, ohne die Saga zu
 * killen: schlägt eine Behörde `OPEN_THRESHOLD`-mal in Folge fehl, geht ihr
 * Breaker `open` — der Drainer überspringt ihre Outbox-Einträge, bis
 * `openUntil` (Clock) erreicht ist. Dann lässt er EINEN `half_open`-Probe-Send
 * zu; positiv → `closed`, negativ → wieder `open`.
 *
 * Reine Transitions-Funktionen über `CircuitBreakerState`; kein I/O. Zeit kommt
 * als injizierter Clock-Wert (`nowIso`), nicht aus `Date.now()`.
 */
import type {
  BreakerState,
  CircuitBreakerState,
} from '@/types/orchestration';

/** Aufeinanderfolgende Fehler, ab denen der Breaker öffnet. */
export const BREAKER_OPEN_THRESHOLD = 3;
/** Cooldown-Dauer (ms), nach der ein half-open-Probe erlaubt wird. */
export const BREAKER_COOLDOWN_MS = 10_000;

export function initialBreaker(
  behoerdeId: string,
  nowIso: string,
): CircuitBreakerState {
  return {
    behoerdeId,
    state: 'closed',
    consecutiveFailures: 0,
    updatedAt: nowIso,
  };
}

/**
 * Ob ein Send gegen diese Behörde JETZT (Clock = nowIso) zugelassen wird.
 * - closed → ja
 * - open → nein, solange nowIso < openUntil; danach genau ein half-open-Probe
 * - half_open → ja (genau der Probe-Send läuft; sein Resultat schließt/öffnet)
 */
export function breakerAllows(
  breaker: CircuitBreakerState | undefined,
  nowIso: string,
): boolean {
  if (!breaker) return true;
  if (breaker.state === 'closed' || breaker.state === 'half_open') return true;
  // open: erlaubt, sobald die Cooldown-Zeit abgelaufen ist (→ half-open-Probe).
  if (breaker.openUntil && nowIso >= breaker.openUntil) return true;
  return false;
}

/**
 * Markiert für das nächste `breakerAllows`, dass ein open-Breaker in den
 * half_open-Zustand wechselt (der Drainer ruft das, kurz bevor er den Probe-
 * Send absetzt). Rein, gibt den neuen State zurück; `null`, wenn kein Wechsel.
 */
export function maybeHalfOpen(
  breaker: CircuitBreakerState,
  nowIso: string,
): CircuitBreakerState | null {
  if (
    breaker.state === 'open' &&
    breaker.openUntil &&
    nowIso >= breaker.openUntil
  ) {
    return { ...breaker, state: 'half_open', updatedAt: nowIso };
  }
  return null;
}

export interface BreakerTransition {
  next: CircuitBreakerState;
  /** Whether the state literal changed (caller emits an audit/event on change). */
  changed: boolean;
  /** The kind of change, for the audit event type. */
  event?: 'opened' | 'half_open' | 'closed';
}

/** Erfolgreicher Send → Breaker schließt, Fehlerzähler zurück. */
export function onSuccess(
  breaker: CircuitBreakerState,
  nowIso: string,
): BreakerTransition {
  const wasOpenish = breaker.state !== 'closed';
  const next: CircuitBreakerState = {
    behoerdeId: breaker.behoerdeId,
    state: 'closed',
    consecutiveFailures: 0,
    updatedAt: nowIso,
    openUntil: undefined,
  };
  return {
    next,
    changed: wasOpenish,
    event: wasOpenish ? 'closed' : undefined,
  };
}

/**
 * Fehlgeschlagener Send → Fehlerzähler hoch; bei Schwelle (oder aus half_open
 * heraus) öffnet der Breaker mit neuem `openUntil = nowIso + cooldown`.
 */
export function onFailure(
  breaker: CircuitBreakerState,
  nowIso: string,
  cooldownMs: number = BREAKER_COOLDOWN_MS,
): BreakerTransition {
  const failures = breaker.consecutiveFailures + 1;
  const cameFromHalfOpen = breaker.state === 'half_open';
  const shouldOpen = cameFromHalfOpen || failures >= BREAKER_OPEN_THRESHOLD;

  if (shouldOpen) {
    const openUntil = new Date(
      new Date(nowIso).getTime() + cooldownMs,
    ).toISOString();
    const next: CircuitBreakerState = {
      behoerdeId: breaker.behoerdeId,
      state: 'open',
      consecutiveFailures: failures,
      openUntil,
      updatedAt: nowIso,
    };
    return {
      next,
      // „opened" gilt als Change, wenn der Breaker nicht schon offen war.
      changed: breaker.state !== 'open',
      event: breaker.state !== 'open' ? 'opened' : undefined,
    };
  }

  const next: CircuitBreakerState = {
    behoerdeId: breaker.behoerdeId,
    state: breaker.state === 'closed' ? 'closed' : breaker.state,
    consecutiveFailures: failures,
    openUntil: breaker.openUntil,
    updatedAt: nowIso,
  };
  return { next, changed: false };
}

export function breakerStateLabel(state: BreakerState): string {
  return state;
}
