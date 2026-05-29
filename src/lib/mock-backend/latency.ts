import { MockBackendError } from './errors';
import { getRequestContext } from './store-context';

export interface LatencyOptions {
  /** Untergrenze in ms. Default 300. */
  min?: number;
  /** Obergrenze in ms. Default 800. */
  max?: number;
  /** Fehler-Wahrscheinlichkeit, 0..1. Default 0.05. */
  errorRate?: number;
  /** Fehlermeldung im MockBackendError. */
  errorMessage?: string;
}

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

const randomBetween = (min: number, max: number): number =>
  min + Math.random() * (max - min);

const isReliableMode = (): boolean => {
  // Stage 2 (HTTP-Server-Pfad): der Request-Kontext trägt das per-Request
  // aufgelöste Reliable-Flag (aus dem `x-mock-reliable`-Header bzw.
  // `reliable`-Body-Feld des RPC-Dispatchers). Hat Vorrang vor allem anderen,
  // weil es die einzige Quelle ist, die der Server pro Request kennt.
  const reqCtx = getRequestContext();
  if (reqCtx) return reqCtx.reliable;

  // Erlaubt das Abschalten der Fehler-Injektion für Loom-Aufzeichnungen.
  // Server- und Client-seitig auswertbar (Next.js inlined NEXT_PUBLIC_*).
  if (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_RELIABLE === '1') {
    return true;
  }
  if (typeof window !== 'undefined') {
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.get('reliable') === '1') return true;
      const meta = window.localStorage.getItem('govtech-de:v1:meta');
      if (meta) {
        const parsed = JSON.parse(meta) as { reliable_mode?: boolean };
        if (parsed?.reliable_mode === true) return true;
      }
    } catch {
      // localStorage / URL-Lesefehler ignorieren — defensive default 'unreliable'.
    }
  }
  return false;
};

/**
 * Wickelt eine synchrone oder asynchrone Funktion in eine simulierte Behörden-Latenz
 * (Default 300–800 ms) und injiziert mit 5% Wahrscheinlichkeit einen
 * MockBackendError. Der „Reliable Mode" (`NEXT_PUBLIC_RELIABLE=1` oder `?reliable=1`)
 * deaktiviert die Fehlerinjektion.
 */
export async function withLatency<T>(
  fn: () => T | Promise<T>,
  opts: LatencyOptions = {},
): Promise<T> {
  const min = opts.min ?? 300;
  const max = opts.max ?? 800;
  const errorRate = opts.errorRate ?? 0.05;
  const ms = randomBetween(min, max);
  await sleep(ms);
  if (!isReliableMode() && Math.random() < errorRate) {
    throw new MockBackendError(
      opts.errorMessage ?? 'Behörde nicht erreichbar — bitte erneut versuchen.',
    );
  }
  return fn();
}

/** Reine Sleep-Funktion ohne Fehlerinjektion (für Choreografie innerhalb des Autopilot-Generators). */
export const wait = sleep;
