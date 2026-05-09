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
  termineArraySchema,
  vorgaengeArraySchema,
} from './schemas';

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
  // Reference-Daten (Behörden) immer aus Fixtures laden — nicht-mutable im UI.
  readOrInit('behoerden' as CollectionKey, behoerdenArraySchema, fixtures.behoerden);
  readOrInit('personas' as CollectionKey, personasArraySchema, fixtures.personas);

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
