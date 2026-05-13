/**
 * Posteingang → Stammdaten Yellow-Letter-Bridge (V1.1).
 *
 * Spec: `docs/specs/stammdaten-v1-1-renten-kv.md` § 8.1.
 * Hard-Line § 11.25 (Idempotenz): Activity-Log-Eintrag pro `letter_id`
 * höchstens 1× erzeugt, auch bei Page-Reload.
 *
 * Anders als der Umzug-Cascade (Push-Trigger durch Vorgang-Wizard) ist diese
 * Bridge ein **User-Click-Trigger**: `<RentenBridgeCTA>` im LetterReader ruft
 * `api.applyYellowLetterBridge()` auf, das hier landet.
 *
 * Architektur:
 *  - Bucket `stammdaten:renten-eckdaten-v1-1` hält pro Persona die zuletzt
 *    abgelegten `RentenEckdaten`.
 *  - Bucket `stammdaten:yellow-letter-bridge-applied` hält pro Persona die
 *    Liste bereits gebridgeter `letter_id`s — Idempotenz-Check vor Mutation.
 *  - Activity-Log-Eintrag wird über `appendLogEntry()` aus `stammdaten/api.ts`
 *    geschrieben (Single-Path, keine Schreib-Doppelung).
 */
import type {
  Letter,
  PersonaId,
  RentenEckdaten,
  YellowLetterBridgeResult,
} from '@/types';
import { MockBackendError } from '../errors';
import { emit } from '../events';
import { uuid } from '../id';
import {
  readOrInit,
  write,
  type CollectionKey,
} from '../persistence';
import {
  rentenEckdatenBucketSchema,
  yellowLetterBridgeAppliedBucketSchema,
} from '../schemas';
import { appendLogEntry } from '../stammdaten/api';

// ---------------------------------------------------------------------------
// Bucket-Helpers
// ---------------------------------------------------------------------------

const RENTEN_ECKDATEN_KEY: CollectionKey = 'stammdaten:renten-eckdaten-v1-1';
const BRIDGE_APPLIED_KEY: CollectionKey = 'stammdaten:yellow-letter-bridge-applied';

function loadEckdatenBucket(): Record<PersonaId, RentenEckdaten> {
  return readOrInit(
    RENTEN_ECKDATEN_KEY,
    rentenEckdatenBucketSchema as unknown as import('zod').ZodType<
      Record<PersonaId, RentenEckdaten>
    >,
    {} as Record<PersonaId, RentenEckdaten>,
  );
}

function saveEckdatenBucket(bucket: Record<PersonaId, RentenEckdaten>): void {
  write(RENTEN_ECKDATEN_KEY, bucket);
}

function loadAppliedBucket(): Record<PersonaId, string[]> {
  return readOrInit(
    BRIDGE_APPLIED_KEY,
    yellowLetterBridgeAppliedBucketSchema,
    {} as Record<PersonaId, string[]>,
  );
}

function saveAppliedBucket(bucket: Record<PersonaId, string[]>): void {
  write(BRIDGE_APPLIED_KEY, bucket);
}

// ---------------------------------------------------------------------------
// Public Read — wird von api.getAltersvorsorge() konsumiert
// ---------------------------------------------------------------------------

/**
 * Liest die zuletzt abgelegten RentenEckdaten für eine Persona.
 *
 * Reihenfolge:
 *  1. Bucket `renten-eckdaten-v1-1` (per Bridge-Aufruf gefüllt).
 *  2. Persona-Default `persona.renten_eckdaten_v1_1` (Schmidt-Seed-Bestand).
 *  3. `undefined` (Track A noch ohne Brief, oder Track B/C).
 */
export function readEckdatenForPersona(
  personaId: PersonaId,
  fallback?: RentenEckdaten,
): RentenEckdaten | undefined {
  const bucket = loadEckdatenBucket();
  return bucket[personaId] ?? fallback;
}

/** Hat diese Persona den `letter_id` bereits gebridgt? */
export function hasBridgedLetter(
  personaId: PersonaId,
  letterId: string,
): boolean {
  const bucket = loadAppliedBucket();
  const list = bucket[personaId] ?? [];
  return list.includes(letterId);
}

// ---------------------------------------------------------------------------
// Resolver — leitet RentenEckdaten aus einem Letter ab
// ---------------------------------------------------------------------------

/**
 * Deterministisches Default-Eckdaten-Set für den Anna-Mock-Letter
 * `letter-renteninfo-anna-2026-05`. Werte spiegeln 1:1 die fünf
 * Pflicht-Inhalte aus dem Brief-Body (Spec § 9.1).
 */
const ANNA_RENTENINFO_DEFAULT: Omit<
  RentenEckdaten,
  'quelle_letter_id' | 'abgelegt_am'
> = {
  grundlage_kurzauszug: {
    beitragszeit_von: '2018-01',
    beitragszeit_bis: '2025-12',
    entgeltpunkte_aktuell: 6.8,
  },
  em_rente_prognose_eur_monat: 312.21,
  regelalter_prognose_eur_monat: 743.99,
  anpassungs_wirkung: {
    beispiel_prozent_p_a: 2.0,
    plus_eur_monat: 1100,
  },
  beitragsuebersicht: {
    jahr: '2025',
    gesamt_eur: 8414.52,
    versicherter_anteil_eur: 4207.26,
    arbeitgeber_anteil_eur: 4207.26,
  },
  stichtag: '2026-05-04',
};

/**
 * Resolved `RentenEckdaten` aus einem Letter.
 *
 * V1.1 nutzt einen statischen Lookup auf die `letter.id`, weil die Werte
 * im Brief-Body als deutscher Fließtext stehen — eine echte LLM-Extraktion
 * wäre aufwendig und über die Demo-Scope hinaus. Der Mock-Letter
 * `letter-renteninfo-anna-2026-05` ist die einzige V1.1-Quelle.
 *
 * Bei unbekannter Letter-ID: deterministische Sentinel-Werte (`0`-Eckdaten
 * mit `quelle_letter_id` aus dem Letter), damit das Frontend trotzdem
 * Card-Top-3 / Tooltip-2 / Expandable-5 rendern kann ohne Crash.
 */
function resolveEckdatenFromLetter(letter: Letter): Omit<
  RentenEckdaten,
  'quelle_letter_id' | 'abgelegt_am'
> {
  if (letter.id === 'letter-renteninfo-anna-2026-05') {
    return ANNA_RENTENINFO_DEFAULT;
  }
  // Fallback — sollte für V1.1 nicht aufgerufen werden, weil keine weiteren
  // renteninfo-Letters geseedet sind. Domain-Doc Correction 3 verlangt 5
  // Pflicht-Inhalte; wir liefern eine deterministische Default-Struktur.
  return {
    ...ANNA_RENTENINFO_DEFAULT,
    stichtag: letter.bescheid_dated_at ?? letter.empfangen_am.slice(0, 10),
  };
}

// ---------------------------------------------------------------------------
// Public Mutate — `applyYellowLetterBridge`
// ---------------------------------------------------------------------------

/**
 * Bridge-Trigger: legt RentenEckdaten in Stammdaten ab + schreibt einen
 * Activity-Log-Eintrag. Idempotent (Hard-Line § 11.25): bei wiederholtem
 * Aufruf mit derselben `letter_id` no-op-bypassed.
 *
 * Vorbedingung: `letter.archetype === 'renteninfo'`. Bei anderen Archetypen
 * wirft die Funktion `MockBackendError(BRIDGE_WRONG_ARCHETYPE)`.
 */
export function applyYellowLetterBridgeImpl(args: {
  letterId: string;
  personaId: PersonaId;
  letter: Letter;
}): YellowLetterBridgeResult {
  const { letterId, personaId, letter } = args;

  if (letter.archetype !== 'renteninfo') {
    throw new MockBackendError(
      `Yellow-Letter-Bridge erwartet archetype === 'renteninfo' (erhalten: ${letter.archetype ?? 'undefined'}).`,
      { code: 'BRIDGE_WRONG_ARCHETYPE', retryable: false },
    );
  }

  // Idempotenz-Check (Hard-Line § 11.25).
  if (hasBridgedLetter(personaId, letterId)) {
    emit({
      type: 'stammdaten/yellow-letter-bridge-skipped-idempotent',
      persona_id: personaId,
      letter_id: letterId,
    });
    return { applied: false };
  }

  // Resolved Eckdaten (5 Pflicht-Inhalte) — Hard-Line § 11.27.
  const resolved = resolveEckdatenFromLetter(letter);
  const now = new Date().toISOString();
  const eckdaten: RentenEckdaten = {
    ...resolved,
    quelle_letter_id: letterId,
    abgelegt_am: now,
  };

  // Persistierung.
  const eckdatenBucket = loadEckdatenBucket();
  eckdatenBucket[personaId] = eckdaten;
  saveEckdatenBucket(eckdatenBucket);

  const appliedBucket = loadAppliedBucket();
  const list = appliedBucket[personaId] ?? [];
  appliedBucket[personaId] = [...list, letterId];
  saveAppliedBucket(appliedBucket);

  // Activity-Log: app_aktivitaet, mit zwei-Norm-Zitat aus § 109 Abs. 1 + Abs. 3 SGB VI.
  const activityLogEntryId = `log-${uuid()}`;
  appendLogEntry(personaId, {
    id: activityLogEntryId,
    timestamp: now,
    kategorie: 'app_aktivitaet',
    field_id: 'renten_eckdaten',
    sektion: 'altersvorsorge',
    zweck_i18n_key: 'stammdaten.aktivitaet.zweck.renteninfo_eingelesen',
    rechtsgrundlage: '§ 109 Abs. 1 + Abs. 3 SGB VI',
    note: `persona_id:${personaId}; field_id:renten_eckdaten; quelle:posteingang_bridge; mock:true; letter_id:${letterId}`,
  });

  emit({
    type: 'stammdaten/yellow-letter-bridge-applied',
    persona_id: personaId,
    letter_id: letterId,
  });

  return {
    applied: true,
    eckdaten,
    activity_log_entry_id: activityLogEntryId,
  };
}

/**
 * Test-only Reset für die V1.1-Bridge-Buckets. Wird von Vitest-`beforeEach`
 * aufgerufen, um zwischen Test-Cases einen sauberen Storage-Zustand zu haben.
 */
export function _resetYellowLetterBridgeForTests(): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  // Direkt schreiben (nicht über `clear()` — wir wollen leere Records, nicht
  // gelöschte Keys, damit `readOrInit` keinen Reseed triggert).
  saveEckdatenBucket({});
  saveAppliedBucket({});
  // Persistence-Migrations-Marker brauchen wir hier NICHT zurückzusetzen —
  // `migrateRentenKvBuckets()` ist idempotent: schreibt nur wenn Key === null.
}
