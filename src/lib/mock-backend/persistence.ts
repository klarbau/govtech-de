/**
 * localStorage-Wrapper.
 *
 * - Single Namespace: `govtech-de:v1:`
 * - Eine Top-Level-Key pro Entity-Collection.
 * - JSON-encodiert; beim Lesen via zod validiert. Schlägt die Validierung fehl,
 *   wird der Bucket gelöscht und der nächste `seedIfEmpty()`-Aufruf re-seeded.
 * - Server-Rendering-Safe: alle Operationen no-op'en, wenn `window` undefined ist.
 */
import { z } from 'zod';

const NAMESPACE = 'govtech-de:v1:';

export type CollectionKey =
  | 'meta'
  | 'profile'
  | 'personas'
  | 'behoerden'
  | 'letters'
  | 'vorgaenge'
  | 'documents'
  | 'termine'
  | 'consent'
  | 'letter-activity-log'
  // V1.5 — Antwort verfassen. Schema: `Record<letterId, Reply>` — genau eine
  // Reply pro Brief; sent_simulated-Replies bleiben erhalten, Drafts werden
  // beim nächsten saveReplyDraft überschrieben.
  | 'letter-replies';

const fullKey = (key: CollectionKey): string => `${NAMESPACE}${key}`;

const isBrowser = (): boolean => typeof window !== 'undefined' && !!window.localStorage;

export function readRaw(key: CollectionKey): unknown {
  if (!isBrowser()) return undefined;
  const raw = window.localStorage.getItem(fullKey(key));
  if (raw === null) return undefined;
  try {
    return JSON.parse(raw);
  } catch {
    // Corrupt JSON → behandeln wie „nicht gesetzt".
    window.localStorage.removeItem(fullKey(key));
    return undefined;
  }
}

/**
 * Liest und validiert. Wenn der Wert fehlt → undefined. Wenn die Validierung
 * fehlschlägt → der Bucket wird gelöscht und undefined zurückgegeben (Aufrufer
 * erkennt das als „Reseed nötig").
 */
export function read<T>(key: CollectionKey, schema: z.ZodType<T>): T | undefined {
  const raw = readRaw(key);
  if (raw === undefined) return undefined;
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    if (isBrowser()) {
      window.localStorage.removeItem(fullKey(key));
    }
    if (typeof console !== 'undefined') {
      console.warn(
        `[mock-backend] Schema mismatch for "${key}", reseeding bucket.`,
        parsed.error.issues.slice(0, 3),
      );
    }
    return undefined;
  }
  return parsed.data;
}

export function write<T>(key: CollectionKey, value: T): void {
  if (!isBrowser()) return;
  window.localStorage.setItem(fullKey(key), JSON.stringify(value));
}

export function clear(key: CollectionKey): void {
  if (!isBrowser()) return;
  window.localStorage.removeItem(fullKey(key));
}

/** Löscht alle govtech-de:v1:*-Keys. Verwendet bei Version-Bump (v1 → v2). */
export function purgeAll(): void {
  if (!isBrowser()) return;
  const toRemove: string[] = [];
  for (let i = 0; i < window.localStorage.length; i++) {
    const k = window.localStorage.key(i);
    if (k?.startsWith(NAMESPACE)) toRemove.push(k);
  }
  toRemove.forEach((k) => window.localStorage.removeItem(k));
}

/** Liest oder initialisiert. Falls leer/invalid → schreibt `defaultValue` und gibt es zurück. */
export function readOrInit<T>(
  key: CollectionKey,
  schema: z.ZodType<T>,
  defaultValue: T,
): T {
  const existing = read<T>(key, schema);
  if (existing !== undefined) return existing;
  write(key, defaultValue);
  return defaultValue;
}
