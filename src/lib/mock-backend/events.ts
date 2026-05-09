/**
 * Minimale Pub/Sub-Schicht für `MockBackendEvent`. Ein einziger Process-Wide-Bus,
 * an den UI-Komponenten via `api.subscribe(listener)` andocken.
 */
import type { MockBackendEvent, MockBackendEventListener } from '@/types/mock-event';

const listeners = new Set<MockBackendEventListener>();

export function subscribe(listener: MockBackendEventListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function emit(event: MockBackendEvent): void {
  // Snapshot: erlaubt unsubscribe innerhalb eines Listeners ohne Iterator-Korruption.
  const snapshot = Array.from(listeners);
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

/** Nur für Tests. */
export function _resetListeners(): void {
  listeners.clear();
}
