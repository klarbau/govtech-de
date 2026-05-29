/**
 * Per-Session-Event-Bus-Registry (Stage 2).
 *
 * Spiegelt das Muster der Session-Store-Registry in `store-context.ts`: ein
 * Modul-Singleton `Map<sessionId, EventBus>`. KRITISCH: sowohl der RPC-
 * Dispatcher (`POST /api/mock`) als auch der SSE-Handler (`GET /api/mock/events`)
 * MÜSSEN über `getOrCreateSessionBus(sessionId)` dieselbe `EventBus`-Instanz
 * auflösen. Sonst emittiert ein `startUmzug`-POST auf einen Bus, während die
 * SSE-Verbindung auf einem anderen lauscht — und die Kaskade streamt nie.
 *
 * Liegt als Server-Prozess-Singleton vor. Im Browser-Bundle nie befüllt.
 *
 * WICHTIG (Next.js): `POST /api/mock` und `GET /api/mock/events` werden in
 * getrennte Server-Bundles kompiliert. Ein normaler Modul-`const` wäre damit
 * PRO Route eine eigene Instanz — POST emittiert dann auf einen anderen Bus als
 * die SSE-Route abhört, und die Kaskade streamt nie. Wir verankern die Map
 * deshalb auf `globalThis`, sodass sie über Bundle-Grenzen hinweg geteilt wird
 * (Standard-Pattern für Next-Route-übergreifende Singletons).
 */
import { EventBus } from '../events';

const GLOBAL_KEY = Symbol.for('govtech-de:mock-backend:session-buses');

type BusGlobal = typeof globalThis & {
  [GLOBAL_KEY]?: Map<string, EventBus>;
};

function registry(): Map<string, EventBus> {
  const g = globalThis as BusGlobal;
  if (!g[GLOBAL_KEY]) g[GLOBAL_KEY] = new Map<string, EventBus>();
  return g[GLOBAL_KEY];
}

/** Liefert (oder erzeugt lazy) den Event-Bus einer Session. */
export function getOrCreateSessionBus(sessionId: string): EventBus {
  const sessionBuses = registry();
  let bus = sessionBuses.get(sessionId);
  if (!bus) {
    bus = new EventBus();
    sessionBuses.set(sessionId, bus);
  }
  return bus;
}

/** Entfernt den Bus einer Session (z. B. bei Logout). */
export function dropSessionBus(sessionId: string): boolean {
  const sessionBuses = registry();
  const bus = sessionBuses.get(sessionId);
  if (bus) bus.clear();
  return sessionBuses.delete(sessionId);
}
