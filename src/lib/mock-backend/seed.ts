/**
 * Initial-State der Mock-Backend-Schicht.
 *
 * Wird beim ersten App-Boot ausgeführt (kein `meta`-Key vorhanden) und schreibt
 * die Fixtures aus `src/data/*.json` in den *aktuell gültigen Store* (Browser:
 * localStorage; Server-Session: In-Memory). Bei Schema-Mismatch (siehe
 * persistence.read) wird der jeweilige Bucket gelöscht und beim nächsten
 * `seedIfEmpty()`-Aufruf re-seeded.
 *
 * Store-Agnostik: alle Schreibvorgänge laufen über `persistence.*`, das den
 * Store via `getCurrentStore()` auflöst. Um eine *konkrete* Store-Instanz zu
 * seeden (z. B. eine frische Server-Session), `seedStore(store)` aufrufen — es
 * führt `seedIfEmpty()` im Kontext dieses Stores aus.
 *
 * Aktive Persona ist standardmäßig 'anna-petrov'. Ein Persona-Switch (Onboarding)
 * schreibt `meta.active_persona_id` neu und ruft `reseedForActivePersona()`.
 */
import behoerdenFixture from '@/data/behoerden.json';
import documentsFixture from '@/data/documents.json';
import lettersFixture from '@/data/letters.json';
import personasFixture from '@/data/personas.json';
import remindersFixture from '@/data/reminders.json';
import steuerFixture from '@/data/steuer.json';
import termineFixture from '@/data/termine.json';
import vorgaengeFixture from '@/data/vorgaenge.json';
import type { Behoerde } from '@/types/behoerde';
import type { Document } from '@/types/document';
import type { Letter } from '@/types/letter';
import type { Persona } from '@/types/persona';
import type { Reminder } from '@/types/termin';
import type { SteuerUebersicht } from '@/types/steuer';
import type { Termin } from '@/types/termin';
import type { Vorgang } from '@/types/vorgang';
import {
  read,
  readOrInit,
  write,
  type CollectionKey,
} from './persistence';
import { runStorageMigrations } from './persistence-migrations';
import { runWithStore } from './store-context';
import type { MockStore } from './store';
import { SEED_MOBILITAET } from './mobilitaet/seed-mobilitaet';
import {
  behoerdenArraySchema,
  consentSchema,
  datenschutzEinwilligungenBucketSchema,
  datenschutzVisionBannerDismissedBucketSchema,
  documentsArraySchema,
  letterActivityLogSchema,
  letterRepliesMapSchema,
  lettersArraySchema,
  metaSchema,
  personasArraySchema,
  personaSchema,
  remindersArraySchema,
  stammdatenIbanSpeculativeBucketSchema,
  stammdatenKontaktBucketSchema,
  stammdatenKontaktV2BucketSchema,
  stammdatenMobilitaetBucketSchema,
  stammdatenSperrenBucketSchema,
  stammdatenUebermittlungsLogBucketSchema,
  steuerBucketSchema,
  termineArraySchema,
  vorgaengeArraySchema,
} from './schemas';
import {
  reseedStammdatenForPersona,
  seedStammdatenForPersona,
} from './stammdaten/api';

const DEFAULT_PERSONA_ID = 'anna-petrov';

// ---------------------------------------------------------------------------
// §A1 — Relative-Zeit-Anker / Sentinel-Resolver
// ---------------------------------------------------------------------------
//
// Fixture-Datumsfelder dürfen Sentinels statt harter ISO-Daten tragen:
//   "@now"        → der Seed-Anker (jetzt)
//   "@now-<N>d"   → N Tage vor dem Anker
//   "@now+<N>d"   → N Tage nach dem Anker
// Felder, deren Schlüssel reine Datumsangaben sind (DATE_ONLY_KEYS), lösen auf
// `YYYY-MM-DD` auf; alle anderen (Timestamps) auf vollen ISO um 09:00 UTC
// (deterministisch). Sentinels leben NUR in Fixtures, nie in nutzergeschriebenem
// State. Resolution passiert EINMALIG beim Seed (gegen `seeded_at`).

const SENTINEL_RE = /^@now([+-]\d+)d$/;

const DATE_ONLY_KEYS = new Set([
  'datum', // VorgangFrist / LetterFrist / Reminder-Datum (YYYY-MM-DD)
  'ausgestellt_am',
  'gueltig_bis',
  'faellig_am',
  'erlassdatum',
  'bescheid_dated_at',
]);

function isSentinel(value: unknown): value is string {
  return typeof value === 'string' && (value === '@now' || SENTINEL_RE.test(value));
}

function resolveSentinel(sentinel: string, anchor: Date, dateOnly: boolean): string {
  let offsetDays = 0;
  if (sentinel !== '@now') {
    const m = sentinel.match(SENTINEL_RE);
    if (m) offsetDays = parseInt(m[1], 10);
  }
  const d = new Date(anchor);
  d.setUTCDate(d.getUTCDate() + offsetDays);
  if (dateOnly) return d.toISOString().slice(0, 10);
  d.setUTCHours(9, 0, 0, 0);
  return d.toISOString();
}

/** Tief-Walk: ersetzt jeden Sentinel-String durch sein aufgelöstes ISO-Datum. */
function resolveSentinels<T>(node: T, anchor: Date, keyHint?: string): T {
  if (isSentinel(node)) {
    return resolveSentinel(node, anchor, keyHint ? DATE_ONLY_KEYS.has(keyHint) : false) as unknown as T;
  }
  if (Array.isArray(node)) {
    return node.map((item) => resolveSentinels(item, anchor, keyHint)) as unknown as T;
  }
  if (node && typeof node === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(node)) out[k] = resolveSentinels(v, anchor, k);
    return out as unknown as T;
  }
  return node;
}

const fixtures = {
  behoerden: behoerdenFixture as unknown as Behoerde[],
  personas: personasFixture as unknown as Persona[],
  letters: lettersFixture as unknown as Letter[],
  vorgaenge: vorgaengeFixture as unknown as Vorgang[],
  documents: documentsFixture as unknown as Document[],
  termine: termineFixture as unknown as Termin[],
  reminders: remindersFixture as unknown as Reminder[],
  steuer: steuerFixture as unknown as Record<
    string,
    Record<string, SteuerUebersicht>
  >,
};

/**
 * §A1 — der relative-Zeit-Anker. Wird einmal pro Seed bestimmt und in
 * `meta.seeded_at` persistiert; Sentinels lösen gegen diesen Wert auf. Existiert
 * bereits ein `meta.seeded_at`, wird es wiederverwendet (Sentinels bleiben
 * stabil über Re-Seeds einzelner Buckets).
 */
function seedAnchor(): Date {
  const meta = read('meta' as CollectionKey, metaSchema);
  return meta?.seeded_at ? new Date(meta.seeded_at) : new Date();
}

/** Fixtures mit aufgelösten Sentinels (gegen den Seed-Anker). */
function resolvedFixtures(anchor: Date): {
  letters: Letter[];
  vorgaenge: Vorgang[];
  documents: Document[];
  termine: Termin[];
  reminders: Reminder[];
} {
  return {
    letters: resolveSentinels(fixtures.letters, anchor),
    vorgaenge: resolveSentinels(fixtures.vorgaenge, anchor),
    documents: resolveSentinels(fixtures.documents, anchor),
    termine: resolveSentinels(fixtures.termine, anchor),
    reminders: resolveSentinels(fixtures.reminders, anchor),
  };
}

/**
 * Stellt sicher, dass alle Buckets befüllt und schema-konform sind.
 * Idempotent — kann beim App-Boot bedenkenlos mehrfach aufgerufen werden.
 */
export function seedIfEmpty(): void {
  // V1.5.1: Migrate stored data from V1.5.0 shapes BEFORE any bucket reads, so
  // schema-validating reads in this function do not trip on the legacy shape
  // and trigger unnecessary reseeds. Idempotent — runs each migration exactly
  // once via the `schema-migrations` marker key.
  runStorageMigrations();

  // Reference-Daten (Behörden) immer aus Fixtures laden — nicht-mutable im UI.
  readOrInit('behoerden' as CollectionKey, behoerdenArraySchema, fixtures.behoerden);
  // Cast via `unknown`: Persona-Schema ist permissive (passthrough); Persona-
  // Type trägt seit V1.2 verschachtelte typed Felder (Aufenthaltstitel,
  // PersonaKontakt) ohne Index-Signatur — strikte Inferenz der Schema-Output-
  // Form schlägt fehl. localStorage-Validation läuft über Zod, TS-Cast ist
  // hier nur ein Type-Hint.
  readOrInit(
    'personas' as CollectionKey,
    personasArraySchema as unknown as import('zod').ZodType<Persona[]>,
    fixtures.personas,
  );

  // Per-Persona-State.
  const meta = read('meta' as CollectionKey, metaSchema);
  if (!meta) {
    const activePersonaId = DEFAULT_PERSONA_ID;
    // §A1 — Seed-Anker setzen, BEVOR seedForPersona Sentinels auflöst.
    write('meta' as CollectionKey, {
      version: 1,
      active_persona_id: activePersonaId,
      seeded_at: new Date().toISOString(),
    });
    seedForPersona(activePersonaId);
    return;
  }

  // Ggf. einzelne fehlende Buckets nachseeden (z. B. nach Schema-Reset).
  const personaId = meta.active_persona_id;
  const anchor = seedAnchor();
  const rf = resolvedFixtures(anchor);
  const profile = read('profile' as CollectionKey, personaSchema);
  if (!profile) {
    const persona = fixtures.personas.find((p) => p.id === personaId);
    if (persona) write('profile' as CollectionKey, persona);
  }
  readOrInit<Letter[]>(
    'letters' as CollectionKey,
    lettersArraySchema as unknown as import('zod').ZodType<Letter[]>,
    filterByPersona(rf.letters, personaId),
  );
  readOrInit<Vorgang[]>(
    'vorgaenge' as CollectionKey,
    vorgaengeArraySchema as unknown as import('zod').ZodType<Vorgang[]>,
    filterVorgaengeByPersona(rf.vorgaenge, personaId),
  );
  // §A3 — Owner-Filter auch auf documents/termine/reminders (vorher Anna-Leak).
  readOrInit<Document[]>(
    'documents' as CollectionKey,
    documentsArraySchema as unknown as import('zod').ZodType<Document[]>,
    filterDocumentsByPersona(rf.documents, personaId),
  );
  readOrInit<Termin[]>(
    'termine' as CollectionKey,
    termineArraySchema as unknown as import('zod').ZodType<Termin[]>,
    filterTermineByPersona(rf.termine, personaId),
  );
  readOrInit('consent' as CollectionKey, consentSchema, {});
  readOrInit('letter-activity-log' as CollectionKey, letterActivityLogSchema, {});
  // V1.5 — Reply-Bucket: leer initialisieren, wenn nicht vorhanden.
  readOrInit('letter-replies' as CollectionKey, letterRepliesMapSchema, {});
  // V1 Stammdaten — vier neue Buckets (Spec § 5.4). Religion-Consent ist
  // bewusst NICHT als Bucket registriert (Hard-Line § 11.4: session-only).
  readOrInit('stammdaten:sperren' as CollectionKey, stammdatenSperrenBucketSchema, {});
  readOrInit(
    'stammdaten:iban-speculative' as CollectionKey,
    stammdatenIbanSpeculativeBucketSchema,
    {},
  );
  readOrInit('stammdaten:kontakt' as CollectionKey, stammdatenKontaktBucketSchema, {});
  readOrInit(
    'stammdaten:uebermittlungs-log' as CollectionKey,
    stammdatenUebermittlungsLogBucketSchema,
    {},
  );
  // V1.2 Kontakt-Schicht — Bucket initialisieren (Migration `v1-to-v12-kontakt-schicht`
  // füllt ihn beim ersten Boot mit Persona-Snapshots; hier nur Empty-State-Init).
  readOrInit(
    'stammdaten:notification-praeferenzen' as CollectionKey,
    stammdatenKontaktV2BucketSchema,
    {},
  );
  // V1.3 Mobilität — Bucket aus Seed initialisieren (Migration
  // `v12-to-v13-mobilitaet` füllt ebenfalls; hier nur Default-Init für
  // den Fall, dass die Migration auf bereits geseeded localStorage trifft).
  readOrInit(
    'stammdaten:mobilitaet' as CollectionKey,
    stammdatenMobilitaetBucketSchema,
    SEED_MOBILITAET,
  );
  // Redesign-Termine — Reminder-Bucket aus Fixture (idempotent, owner-gefiltert §A3).
  readOrInit(
    'reminders' as CollectionKey,
    remindersArraySchema as unknown as import('zod').ZodType<Reminder[]>,
    filterRemindersByPersona(rf.reminders, personaId),
  );
  // Redesign-Steuer — Steuer-Übersicht-Bucket aus Fixture (idempotent).
  readOrInit(
    'steuer' as CollectionKey,
    steuerBucketSchema as unknown as import('zod').ZodType<
      Record<string, Record<string, SteuerUebersicht>>
    >,
    fixtures.steuer,
  );
  // Redesign-Datenschutz — Einwilligungen lazy-init (api leitet Defaults ab);
  // hier nur Empty-State-Init + Banner-Dismiss-Bucket.
  readOrInit(
    'datenschutz:einwilligungen' as CollectionKey,
    datenschutzEinwilligungenBucketSchema,
    {},
  );
  readOrInit(
    'datenschutz:vision-banner-dismissed' as CollectionKey,
    datenschutzVisionBannerDismissedBucketSchema,
    {},
  );
  // Per-Persona-Initial-Seed (idempotent — überschreibt bestehende Einträge nicht).
  try {
    seedStammdatenForPersona(personaId);
  } catch (err) {
    if (typeof console !== 'undefined') {
      console.warn('[mock-backend/seed] stammdaten seed failed', err);
    }
  }
}

/**
 * Seedet eine *konkrete* Store-Instanz vollständig (Migrationen + Fixtures +
 * Persona-Buckets) — analog `seedIfEmpty()`, aber im async-Kontext des
 * übergebenen Stores. Stage-2-Route-Handler nutzen das, um eine frische
 * Server-Session zu befüllen:
 *
 *   getOrCreateSessionStore(sessionId, (store) => seedStore(store));
 *
 * Identisches Ergebnis wie der Browser-Boot, da `seedIfEmpty()` ausschließlich
 * über die store-agnostische `persistence.*`-Schicht schreibt.
 */
export function seedStore(store: MockStore): void {
  runWithStore(store, () => {
    seedIfEmpty();
  });
}

function filterByPersona(letters: Letter[], personaId: string): Letter[] {
  return letters.filter((l) => l.empfaenger_persona_id === personaId);
}

function filterVorgaengeByPersona(vorgaenge: Vorgang[], personaId: string): Vorgang[] {
  return vorgaenge.filter((v) => v.persona_id === personaId);
}

// §A3 — Owner-Filter pro Entität. Legacy-Records ohne Owner-Feld werden NICHT
// geleakt (kein Match → ausgefiltert); neue Seeds tragen den Owner immer.
function filterDocumentsByPersona(documents: Document[], personaId: string): Document[] {
  return documents.filter((d) => d.owner_persona_id === personaId);
}

function filterTermineByPersona(termine: Termin[], personaId: string): Termin[] {
  return termine.filter((t) => t.owner_persona_id === personaId);
}

function filterRemindersByPersona(reminders: Reminder[], personaId: string): Reminder[] {
  return reminders.filter((r) => r.owner_persona_id === personaId);
}

function seedForPersona(personaId: string): void {
  const persona = fixtures.personas.find((p) => p.id === personaId);
  if (persona) write('profile' as CollectionKey, persona);
  // §A1 — Sentinels gegen den Seed-Anker auflösen; §A3 — Owner-Filter auf allen Listen.
  const anchor = seedAnchor();
  const rf = resolvedFixtures(anchor);
  write('letters' as CollectionKey, filterByPersona(rf.letters, personaId));
  write(
    'vorgaenge' as CollectionKey,
    filterVorgaengeByPersona(rf.vorgaenge, personaId),
  );
  write('documents' as CollectionKey, filterDocumentsByPersona(rf.documents, personaId));
  write('termine' as CollectionKey, filterTermineByPersona(rf.termine, personaId));
  write('reminders' as CollectionKey, filterRemindersByPersona(rf.reminders, personaId));
  write('steuer' as CollectionKey, fixtures.steuer);
  write('consent' as CollectionKey, {});
  write('letter-activity-log' as CollectionKey, {});
  // Redesign-Datenschutz — Einwilligungen + Banner-Dismiss bei Persona-Switch
  // zurücksetzen (lazy-init Defaults greifen beim nächsten Read).
  write('datenschutz:einwilligungen' as CollectionKey, {});
  write('datenschutz:vision-banner-dismissed' as CollectionKey, {});
  // V1.5 — Reply-Bucket: bei jedem Persona-Wechsel leer.
  write('letter-replies' as CollectionKey, {});
  // V1 Stammdaten — Persona-Reseed (Sperren / IBAN / Kontakt / Initial-Log
  // zurücksetzen; Religion-Consent ohnehin session-only).
  try {
    reseedStammdatenForPersona(personaId);
  } catch (err) {
    if (typeof console !== 'undefined') {
      console.warn('[mock-backend/seed] stammdaten reseed failed', err);
    }
  }
  // V1.3 Mobilität — Bucket aus Seed re-init für aktive Persona (idempotent;
  // andere Personas im Bucket bleiben unangetastet).
  try {
    const existing = (() => {
      try {
        const raw = read(
          'stammdaten:mobilitaet' as CollectionKey,
          stammdatenMobilitaetBucketSchema,
        );
        return raw ?? {};
      } catch {
        return {};
      }
    })();
    if (SEED_MOBILITAET[personaId]) {
      const merged = { ...existing } as Record<string, unknown>;
      merged[personaId] = JSON.parse(
        JSON.stringify(SEED_MOBILITAET[personaId]),
      );
      write('stammdaten:mobilitaet' as CollectionKey, merged);
    }
  } catch (err) {
    if (typeof console !== 'undefined') {
      console.warn('[mock-backend/seed] mobilitaet reseed failed', err);
    }
  }
}

/**
 * Wechselt die aktive Persona (z. B. aus dem Onboarding-Flow). Persistiert
 * Meta + reseedt alle Persona-spezifischen Buckets aus Fixtures.
 */
export function reseedForActivePersona(personaId: string): void {
  write('meta' as CollectionKey, {
    version: 1,
    active_persona_id: personaId,
    seeded_at: new Date().toISOString(),
  });
  seedForPersona(personaId);
}

/** Liest die aktuell aktive Persona-ID. */
export function getActivePersonaId(): string {
  const meta = read('meta' as CollectionKey, metaSchema);
  return meta?.active_persona_id ?? DEFAULT_PERSONA_ID;
}
