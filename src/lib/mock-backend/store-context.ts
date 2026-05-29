/**
 * Ambient-Store-Auflösung (Stage 1 der HTTP-Migration).
 *
 * Statt einen Store durch alle ~45 `api`-Methoden zu fädeln, lösen
 * `persistence.ts` und `persistence-migrations.ts` den *aktuell gültigen* Store
 * über `getCurrentStore()` auf. Die Auflösungs-Reihenfolge:
 *
 *   1. Ein per `runWithStore(store, fn)` gesetzter async-Kontext (Server-Pfad —
 *      der Route-Handler in Stage 2 läuft jede Request-Session innerhalb von
 *      `runWithSession(sessionId, fn)`, was intern `runWithStore` nutzt).
 *   2. Browser: ein `LocalStorageStore` über `window.localStorage` — exakt das
 *      bisherige Verhalten. Komponenten rufen `api.*` weiterhin direkt auf,
 *      ohne Kontext, und treffen damit weiter localStorage.
 *   3. Node/Test ohne Kontext: ein Prozess-weiter Default-`InMemoryStore`.
 *
 * `AsyncLocalStorage` ist Node-built-in (kein neues Dependency). In Umgebungen
 * ohne den Node-Core (z. B. der Browser-Bundle) ist der ALS-Pfad schlicht nie
 * aktiv — `getStore()` gibt dort `undefined` und wir fallen auf (2)/(3) zurück.
 */
import { createAsyncStore } from './async-local-storage';
import { InMemoryStore, LocalStorageStore, type MockStore } from './store';

/**
 * Async-Kontext, der den Session-Store pro Request trägt. `undefined`, wenn
 * außerhalb eines `runWithStore`-Scopes aufgelöst wird. Im Browser ist das ein
 * No-op-Stub (kein Kontext) — die Auflösung fällt dann auf localStorage zurück.
 */
// ALS-Instanz auf `globalThis` verankert (gleiche Begründung wie events.ts:
// Bundle-übergreifend dieselbe Instanz, sonst schreibt `runWithStore` in eine
// andere ALS als `getCurrentStore` liest).
const STORE_CONTEXT_KEY = Symbol.for('govtech-de:mock-backend:store-context');
const REQUEST_CONTEXT_KEY = Symbol.for(
  'govtech-de:mock-backend:request-context',
);
type ContextGlobal = typeof globalThis & {
  [STORE_CONTEXT_KEY]?: ReturnType<typeof createAsyncStore<MockStore>>;
  [REQUEST_CONTEXT_KEY]?: ReturnType<
    typeof createAsyncStore<MockRequestContext>
  >;
};
const contextGlobal = globalThis as ContextGlobal;
const storeContext =
  contextGlobal[STORE_CONTEXT_KEY] ??
  (contextGlobal[STORE_CONTEXT_KEY] = createAsyncStore<MockStore>());

/**
 * Server-Session-Registry: `sessionId → InMemoryStore`. Lazy: ein Store wird
 * beim ersten Zugriff für eine Session erzeugt (und vom Aufrufer geseedet,
 * s. `getOrCreateSessionStore`).
 *
 * Liegt als Modul-Singleton im Server-Prozess. Im Browser-Bundle wird die Map
 * angelegt, aber nie befüllt (der Browser nutzt den localStorage-Pfad).
 */
// Auf `globalThis` verankert: Next.js kompiliert Route-Handler in getrennte
// Server-Bundles; ein normaler Modul-`const` wäre pro Bundle eine eigene
// Instanz. Über `Symbol.for` teilen sich alle Bundles dieselbe Registry, sodass
// dieselbe `sessionId` überall denselben Store trifft.
const SESSION_STORES_KEY = Symbol.for(
  'govtech-de:mock-backend:session-stores',
);
type SessionStoresGlobal = typeof globalThis & {
  [SESSION_STORES_KEY]?: Map<string, InMemoryStore>;
};
function sessionStoresRegistry(): Map<string, InMemoryStore> {
  const g = globalThis as SessionStoresGlobal;
  if (!g[SESSION_STORES_KEY]) {
    g[SESSION_STORES_KEY] = new Map<string, InMemoryStore>();
  }
  return g[SESSION_STORES_KEY];
}
const sessionStores = sessionStoresRegistry();

const hasBrowserLocalStorage = (): boolean =>
  typeof window !== 'undefined' && !!window.localStorage;

/**
 * Prozess-weiter Default-In-Memory-Store für den Node-/Test-Pfad ohne async-
 * Kontext und ohne `window`. Lazy initialisiert, damit der Browser-Bundle ihn
 * gar nicht erst anlegt.
 */
let defaultMemoryStore: InMemoryStore | undefined;

function getDefaultMemoryStore(): InMemoryStore {
  if (!defaultMemoryStore) defaultMemoryStore = new InMemoryStore();
  return defaultMemoryStore;
}

/**
 * Liefert den aktuell gültigen Store gemäß Auflösungs-Reihenfolge oben.
 *
 * Wichtig für Test-Kompatibilität: solange die Tests ein `window.localStorage`-
 * Shim setzen (Map-backed `MemoryStorage`), greift Schritt (2) und das bisherige
 * Verhalten bleibt bit-identisch.
 */
export function getCurrentStore(): MockStore {
  const ctxStore = storeContext.getStore();
  if (ctxStore) return ctxStore;
  if (hasBrowserLocalStorage()) {
    return new LocalStorageStore(window.localStorage);
  }
  return getDefaultMemoryStore();
}

/**
 * Führt `fn` aus, während `store` als ambient-Store gilt. Synchron oder async.
 * Stage-2-Route-Handler nutzen das (via `runWithSession`), um jede Request-
 * Session auf ihren eigenen In-Memory-Store zu binden.
 */
export function runWithStore<T>(store: MockStore, fn: () => T): T {
  return storeContext.run(store, fn);
}

/**
 * Liefert (oder erzeugt) den In-Memory-Store für eine Session-ID. Beim ersten
 * Zugriff wird ein frischer Store angelegt und über `seedFn` befüllt — typisch
 * `() => runWithStore(store, () => seedIfEmpty())`, damit der Seed im Kontext
 * des neuen Stores landet.
 *
 * `seedFn` wird genau einmal pro neu erzeugtem Store aufgerufen. Existiert der
 * Store bereits, ist der Aufruf ein reiner Lookup ohne Re-Seed.
 */
export function getOrCreateSessionStore(
  sessionId: string,
  seedFn?: (store: InMemoryStore) => void,
): InMemoryStore {
  let store = sessionStores.get(sessionId);
  if (!store) {
    store = new InMemoryStore();
    sessionStores.set(sessionId, store);
    if (seedFn) seedFn(store);
  }
  return store;
}

/**
 * Convenience für Stage-2-Route-Handler: löst den Session-Store auf (lazy
 * erzeugt + optional geseedet) und führt `fn` innerhalb dessen async-Kontext
 * aus. So braucht keine `api`-Methode einen Store-Parameter.
 *
 * @example
 *   await runWithSession(sessionId, () => api.getProfile(), (s) =>
 *     runWithStore(s, () => seedIfEmpty()),
 *   );
 */
export function runWithSession<T>(
  sessionId: string,
  fn: () => T,
  seedFn?: (store: InMemoryStore) => void,
): T {
  const store = getOrCreateSessionStore(sessionId, seedFn);
  return runWithStore(store, fn);
}

/** Entfernt eine Session aus der Registry (z. B. bei Logout). */
export function dropSessionStore(sessionId: string): boolean {
  return sessionStores.delete(sessionId);
}

// ----------------------------------------------------------------------------
// Request-Kontext (Stage 2): trägt Per-Request-Flags, die NICHT im Store leben,
// aber serverseitig deterministisch auflösbar sein müssen. Aktuell nur
// `reliable` (deaktiviert die 5%-Fehler-Injektion in `latency.ts` und im
// Autopilot). Im Browser ist der Kontext nie gesetzt → `getRequestContext()`
// liefert `undefined`, und `latency.ts` fällt auf seinen bisherigen
// `window`/`?reliable=1`/localStorage-Pfad zurück.
// ----------------------------------------------------------------------------

export interface MockRequestContext {
  /** Wenn true: keine synthetische Fehler-Injektion (Spine-e2e / Loom). */
  reliable: boolean;
}

const requestContext =
  contextGlobal[REQUEST_CONTEXT_KEY] ??
  (contextGlobal[REQUEST_CONTEXT_KEY] = createAsyncStore<MockRequestContext>());

/** Aktuell gültiger Request-Kontext oder `undefined` außerhalb eines Scopes. */
export function getRequestContext(): MockRequestContext | undefined {
  return requestContext.getStore();
}

/** Führt `fn` mit gesetztem Request-Kontext aus. */
export function runWithRequestContext<T>(
  ctx: MockRequestContext,
  fn: () => T,
): T {
  return requestContext.run(ctx, fn);
}

// ----------------------------------------------------------------------------
// Kontext-Snapshot (Stage 2 — Deferred-Emit-Fix).
//
// Problem: `startUmzug` startet den Autopilot fire-and-forget
// (`void runAutopilotInBackground(...)`). Dessen `emit()`-Aufrufe laufen über
// Timer/`await` und damit potenziell NACHDEM die POST-Async-Chain bereits
// abgewickelt ist. Ob `AsyncLocalStorage` den Kontext über solche detached
// Promise-Ketten trägt, ist abhängig vom Scheduling — wir verlassen uns NICHT
// darauf. Stattdessen kapselt der Aufrufer den Hintergrund-Lauf in
// `runWithCapturedContext(snapshot, cb)`: der Snapshot wird im Request-Scope
// (Store + Bus + Request-Kontext) gezogen und für JEDEN deferred Callback neu
// gebunden. So landen auch verzögerte `emit()`-Aufrufe garantiert auf dem
// Session-Bus.
//
// Der Bus wird über schwache Spät-Bindung aufgelöst (Setter unten), damit
// store-context.ts events.ts nicht statisch importieren muss (Zyklus-Vermeidung).
// ----------------------------------------------------------------------------

interface ContextBusBridge {
  getCurrentBus: () => unknown;
  runWithEventBus: <T>(bus: unknown, fn: () => T) => T;
}

let busBridge: ContextBusBridge | undefined;

/**
 * Internes Bindeglied: `events.ts` registriert hier seine Bus-Auflösung, damit
 * der Snapshot-Mechanismus den Event-Bus mit-kapseln kann, ohne dass
 * store-context.ts events.ts statisch importiert (Modul-Zyklus).
 */
export function _registerBusBridge(bridge: ContextBusBridge): void {
  busBridge = bridge;
}

export interface MockContextSnapshot {
  store: MockStore | undefined;
  bus: unknown;
  request: MockRequestContext | undefined;
}

/** Zieht einen Snapshot aller drei async-Kontexte am aktuellen Scope. */
export function captureContext(): MockContextSnapshot {
  return {
    store: storeContext.getStore(),
    bus: busBridge ? busBridge.getCurrentBus() : undefined,
    request: requestContext.getStore(),
  };
}

/**
 * Führt `fn` mit dem zuvor gekapselten Kontext (Store + Bus + Request) aus.
 * Re-bindet alle drei Schichten, sodass verzögerte `emit()`/`read()`/`write()`-
 * Aufrufe denselben Session-Store und Session-Bus treffen wie der ursprüngliche
 * Request.
 */
export function runWithCapturedContext<T>(
  snapshot: MockContextSnapshot,
  fn: () => T,
): T {
  const runStore = (): T =>
    snapshot.store ? runWithStore(snapshot.store, fn) : fn();
  const runReq = (): T =>
    snapshot.request
      ? runWithRequestContext(snapshot.request, runStore)
      : runStore();
  if (busBridge && snapshot.bus !== undefined) {
    return busBridge.runWithEventBus(snapshot.bus, runReq) as T;
  }
  return runReq();
}

/**
 * Test-Hilfe: setzt die gesamte Store-Auflösung zurück (Default-Memory-Store +
 * Session-Registry). Beeinflusst NICHT ein gesetztes `window.localStorage`-Shim.
 */
export function _resetStoresForTests(): void {
  defaultMemoryStore = undefined;
  sessionStores.clear();
}
