/**
 * Pub/Sub-Schicht für `MockBackendEvent`.
 *
 * Stage 1: ein Prozess-weiter Default-Bus, an den UI-Komponenten via
 * `api.subscribe(listener)` andocken — unverändertes Verhalten im Browser und
 * für die bestehenden Tests.
 *
 * Stage-2-Seam: `emit`/`subscribe` lösen ihren Bus über einen async-Kontext auf
 * (`runWithEventBus`), mit dem Default-Bus als Fallback. Der Route-Handler in
 * Stage 2 kann damit pro Session einen eigenen `EventBus` binden (für eine
 * session-isolierte SSE-`GET /api/mock/events`-Route), ohne dass `emit`-
 * Call-Sites im Kern geändert werden müssen. Solange kein Kontext gesetzt ist,
 * läuft alles über den Default-Bus — exakt wie bisher.
 */
import { createAsyncStore } from './async-local-storage';
import { _registerBusBridge } from './store-context';
import type { MockBackendEvent, MockBackendEventListener } from '@/types/mock-event';

/** Ein isolierter Event-Bus (eine Listener-Menge). */
export class EventBus {
  private readonly listeners = new Set<MockBackendEventListener>();

  subscribe(listener: MockBackendEventListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  emit(event: MockBackendEvent): void {
    // Snapshot: erlaubt unsubscribe innerhalb eines Listeners ohne Iterator-Korruption.
    const snapshot = Array.from(this.listeners);
    for (const listener of snapshot) {
      try {
        listener(event);
      } catch (err) {
        if (typeof console !== 'undefined') {
          console.error('[mock-backend] listener threw', err);
        }
      }
    }
  }

  clear(): void {
    this.listeners.clear();
  }
}

// WICHTIG (Next.js): `events.ts` kann über getrennte Server-Route-Bundles
// MEHRFACH instanziiert werden. Wären `defaultBus` und vor allem `busContext`
// (die AsyncLocalStorage-Instanz) pro Bundle eigene Objekte, dann schriebe
// `runWithEventBus` in die ALS-Instanz von Bundle A, während `getCurrentBus`
// (tief in api.ts/emit) die ALS-Instanz von Bundle B liest → immer Default-Bus,
// und die SSE-Kaskade streamt nie. Wir verankern beide Singletons auf
// `globalThis` (via `Symbol.for`), sodass alle Bundles dieselbe ALS + denselben
// Default-Bus teilen.
const DEFAULT_BUS_KEY = Symbol.for('govtech-de:mock-backend:default-bus');
const BUS_CONTEXT_KEY = Symbol.for('govtech-de:mock-backend:bus-context');

type EventsGlobal = typeof globalThis & {
  [DEFAULT_BUS_KEY]?: EventBus;
  [BUS_CONTEXT_KEY]?: ReturnType<typeof createAsyncStore<EventBus>>;
};

const eventsGlobal = globalThis as EventsGlobal;

/** Prozess-weiter Default-Bus (Browser + kontextfreier Pfad). */
const defaultBus: EventBus =
  eventsGlobal[DEFAULT_BUS_KEY] ??
  (eventsGlobal[DEFAULT_BUS_KEY] = new EventBus());

/**
 * Async-Kontext, der pro Server-Session einen eigenen Bus tragen kann. Leer im
 * Browser-Bundle und im kontextfreien Node-Pfad → Auflösung fällt auf
 * `defaultBus` zurück.
 */
const busContext =
  eventsGlobal[BUS_CONTEXT_KEY] ??
  (eventsGlobal[BUS_CONTEXT_KEY] = createAsyncStore<EventBus>());

/** Aktuell gültiger Bus: Kontext-Bus, sonst Default-Bus. */
export function getCurrentBus(): EventBus {
  return busContext.getStore() ?? defaultBus;
}

/**
 * Führt `fn` aus, während `bus` als ambient-Event-Bus gilt. Stage-2-Route-
 * Handler binden so einen session-eigenen Bus (typischerweise gemeinsam mit
 * `runWithStore`).
 */
export function runWithEventBus<T>(bus: EventBus, fn: () => T): T {
  return busContext.run(bus, fn);
}

export function subscribe(listener: MockBackendEventListener): () => void {
  return getCurrentBus().subscribe(listener);
}

export function emit(event: MockBackendEvent): void {
  getCurrentBus().emit(event);
}

// Bus-Brücke für den Kontext-Snapshot-Mechanismus (store-context.ts). Erlaubt
// `captureContext()`/`runWithCapturedContext()`, den aktuellen Event-Bus mit zu
// kapseln, ohne dass store-context.ts events.ts statisch importiert.
_registerBusBridge({
  getCurrentBus: () => getCurrentBus(),
  runWithEventBus: (bus, fn) => runWithEventBus(bus as EventBus, fn),
});

/** Nur für Tests. Leert den Default-Bus. */
export function _resetListeners(): void {
  defaultBus.clear();
}
