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
  // V1.5 — Antwort verfassen. V1.5.0-Schema: `Record<letterId, Reply>` (genau
  // eine Reply pro Brief). V1.5.1-Schema: `Record<letterId, Reply[]>`, weil
  // der Cross-Template-Versand-Pfad (Einspruch + Aussetzung) zwei Reply-Records
  // auf demselben Letter erzeugt (Spec V1.5.1 § 8.4). Migration aus V1.5.0
  // läuft idempotent in `persistence-migrations.ts:runStorageMigrations()`.
  | 'letter-replies'
  // V1 — Stammdaten (Spec § 5.4). Vier neue persistente Buckets, Religion-
  // Consent ist bewusst NICHT persistiert (Hard-Line § 11.4: bei Reload
  // wird `consent_session` auf `false` zurückgesetzt — sessionStorage-Layer
  // in api.ts).
  | 'stammdaten:sperren'
  | 'stammdaten:iban-speculative'
  | 'stammdaten:kontakt'
  | 'stammdaten:uebermittlungs-log'
  // V1.1 — Renten/KV (Spec § 4.4). Pflegegrad-Consent ist bewusst NICHT
  // hier registriert (Hard-Line § 11.22: sessionStorage-only, kein
  // localStorage-Bucket).
  | 'stammdaten:renten-eckdaten-v1-1'
  | 'stammdaten:yellow-letter-bridge-applied'
  // V1.2 — Kontakt-Schicht (Spec § 5.4). Bucket-Bump V1 → V2 erfolgt durch
  // `migrateKontaktV1ToV11` in `persistence-migrations.ts`. Das vorherige
  // `stammdaten:kontakt`-Bucket trägt nur noch `sprachpraeferenz` (V1-stable);
  // BundID-Postfach + Notification-Präferenzen leben im neuen Bucket.
  | 'stammdaten:notification-praeferenzen'
  // V1.3 — Mobilität (Spec § 5.3). `Record<PersonaId, Mobilitaet>`. Strict-
  // mode: kein `punkte`-Feld erlaubt (HL-MOB-11 / VL-4). Punktestand-Result
  // ist component-local mit TTL ≤ 5 min, niemals in localStorage.
  | 'stammdaten:mobilitaet'
  // V1.3 — Schema-Version-Marker für Mobilität-Migration V12→V13.
  | 'stammdaten:schema-version'
  // Redesign-Termine — Reminder-Bucket (`redesign-termine.md` § 6). Analog
  // `termine`: aus Fixture geseedet, idempotent über `seedIfEmpty`.
  | 'reminders'
  // Redesign-Steuer — vorausgefüllte Steuer-Übersicht (`redesign-steuer.md` § 6).
  // `Record<personaId, Record<steuerjahr, SteuerUebersicht>>`.
  | 'steuer'
  // Redesign-Datenschutz — funktionale + persistierte Einwilligungs-Toggles
  // (`redesign-datenschutz.md` § 6). Aktivitäts-Log nutzt den BESTEHENDEN
  // `stammdaten:uebermittlungs-log`-Bucket (kein paralleler Log).
  | 'datenschutz:einwilligungen'
  | 'datenschutz:vision-banner-dismissed'
  // Redesign-Dashboard — deviceLocal-State (`dashboard.md` § 5.4).
  | 'dashboard:last-seen'
  | 'dashboard:sort-mode';

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
