/**
 * Initial-State der Mock-Backend-Schicht.
 *
 * Wird beim ersten App-Boot ausgeführt (kein `meta`-Key vorhanden) und schreibt
 * die Fixtures aus `src/data/*.json` in localStorage. Bei Schema-Mismatch
 * (siehe persistence.read) wird der jeweilige Bucket gelöscht und beim nächsten
 * `seedIfEmpty()`-Aufruf re-seeded.
 *
 * Aktive Persona ist standardmäßig 'anna-petrov'. Ein Persona-Switch (Onboarding)
 * schreibt `meta.active_persona_id` neu und ruft `reseedForActivePersona()`.
 */
import behoerdenFixture from '@/data/behoerden.json';
import documentsFixture from '@/data/documents.json';
import lettersFixture from '@/data/letters.json';
import personasFixture from '@/data/personas.json';
import termineFixture from '@/data/termine.json';
import vorgaengeFixture from '@/data/vorgaenge.json';
import type { Behoerde } from '@/types/behoerde';
import type { Document } from '@/types/document';
import type { Letter } from '@/types/letter';
import type { Persona } from '@/types/persona';
import type { Termin } from '@/types/termin';
import type { Vorgang } from '@/types/vorgang';
import {
  read,
  readOrInit,
  write,
  type CollectionKey,
} from './persistence';
import { runStorageMigrations } from './persistence-migrations';
import { SEED_MOBILITAET } from './mobilitaet/seed-mobilitaet';
import {
  behoerdenArraySchema,
  consentSchema,
  documentsArraySchema,
  letterActivityLogSchema,
  letterRepliesMapSchema,
  lettersArraySchema,
  metaSchema,
  personasArraySchema,
  personaSchema,
  stammdatenIbanSpeculativeBucketSchema,
  stammdatenKontaktBucketSchema,
  stammdatenKontaktV2BucketSchema,
  stammdatenMobilitaetBucketSchema,
  stammdatenSperrenBucketSchema,
  stammdatenUebermittlungsLogBucketSchema,
  termineArraySchema,
  vorgaengeArraySchema,
} from './schemas';
import {
  reseedStammdatenForPersona,
  seedStammdatenForPersona,
} from './stammdaten/api';

const DEFAULT_PERSONA_ID = 'anna-petrov';

const fixtures = {
  behoerden: behoerdenFixture as unknown as Behoerde[],
  personas: personasFixture as unknown as Persona[],
  letters: lettersFixture as unknown as Letter[],
  vorgaenge: vorgaengeFixture as unknown as Vorgang[],
  documents: documentsFixture as unknown as Document[],
  termine: termineFixture as unknown as Termin[],
};

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
  const profile = read('profile' as CollectionKey, personaSchema);
  if (!profile) {
    const persona = fixtures.personas.find((p) => p.id === personaId);
    if (persona) write('profile' as CollectionKey, persona);
  }
  readOrInit<Letter[]>(
    'letters' as CollectionKey,
    lettersArraySchema as unknown as import('zod').ZodType<Letter[]>,
    filterByPersona(fixtures.letters, personaId),
  );
  readOrInit<Vorgang[]>(
    'vorgaenge' as CollectionKey,
    vorgaengeArraySchema as unknown as import('zod').ZodType<Vorgang[]>,
    filterVorgaengeByPersona(fixtures.vorgaenge, personaId),
  );
  readOrInit('documents' as CollectionKey, documentsArraySchema, fixtures.documents);
  readOrInit('termine' as CollectionKey, termineArraySchema, fixtures.termine);
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
  // Per-Persona-Initial-Seed (idempotent — überschreibt bestehende Einträge nicht).
  try {
    seedStammdatenForPersona(personaId);
  } catch (err) {
    if (typeof console !== 'undefined') {
      console.warn('[mock-backend/seed] stammdaten seed failed', err);
    }
  }
}

function filterByPersona(letters: Letter[], personaId: string): Letter[] {
  return letters.filter((l) => l.empfaenger_persona_id === personaId);
}

function filterVorgaengeByPersona(vorgaenge: Vorgang[], personaId: string): Vorgang[] {
  return vorgaenge.filter((v) => v.persona_id === personaId);
}

function seedForPersona(personaId: string): void {
  const persona = fixtures.personas.find((p) => p.id === personaId);
  if (persona) write('profile' as CollectionKey, persona);
  write('letters' as CollectionKey, filterByPersona(fixtures.letters, personaId));
  write(
    'vorgaenge' as CollectionKey,
    filterVorgaengeByPersona(fixtures.vorgaenge, personaId),
  );
  write('documents' as CollectionKey, fixtures.documents);
  write('termine' as CollectionKey, fixtures.termine);
  write('consent' as CollectionKey, {});
  write('letter-activity-log' as CollectionKey, {});
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
