/**
 * Persistence-Migrationen für Schema-Bumps zwischen Mock-Backend-Versionen.
 *
 * V1.5.0 → V1.5.1: Der `letter-replies`-Bucket wechselt sein Shape von
 * `Record<letterId, Reply>` (genau eine Reply pro Brief) zu
 * `Record<letterId, Reply[]>` (Liste von Replies pro Brief), weil der
 * Cross-Template-Versand-Pfad „Beide als getrennte Briefe versenden" zwei
 * separate Reply-Records auf demselben Letter erzeugt (Spec V1.5.1 § 8.4).
 *
 * Lifecycle:
 *   1. `runStorageMigrations()` läuft idempotent beim ersten Boot, getriggert
 *      aus `seed.ts` vor dem Bucket-Lookup.
 *   2. Schreibt einen Marker-Key (`schema-migrations`) mit der Liste
 *      ausgeführter Migrationen, damit dieselbe Migration nicht zweimal läuft.
 *   3. Bei Schema-Validierungs-Fehler in einem Bucket: Bucket bleibt unangetastet
 *      (persistence.ts cleared ihn dann beim nächsten `read()`-Versuch). Wir
 *      werfen *nie* aus einer Migration — Drift soll zum Reseed führen, nicht
 *      zum Boot-Crash.
 */
import { z } from 'zod';
import { getCurrentStore } from './store-context';
import {
  letterRepliesMapSchema,
  letterRepliesMapV150Schema,
} from './schemas';
import { SEED_MOBILITAET } from './mobilitaet/seed-mobilitaet';
import type {
  Familienstand,
  LetterReplyMap,
  Mobilitaet,
  PersonaId,
  PersonaKontakt,
  Reply,
} from '@/types';

const NAMESPACE = 'govtech-de:v1:';
const MIGRATIONS_KEY = `${NAMESPACE}schema-migrations`;
const REPLIES_KEY = `${NAMESPACE}letter-replies`;
// V1-Kontakt-Bucket trägt nur noch `sprachpraeferenz` (V1.x-stable) — wird
// durch die V1.2-Migration NICHT angefasst (additive only). Doc-Reminder.
const KONTAKT_V12_KEY = `${NAMESPACE}stammdaten:notification-praeferenzen`;
const PERSONAS_KEY = `${NAMESPACE}personas`;
const BEHOERDEN_KEY = `${NAMESPACE}behoerden`;
// V1.3 — Mobilität (Spec § 5.3). Bucket + Schema-Version-Marker.
const MOBILITAET_KEY = `${NAMESPACE}stammdaten:mobilitaet`;
const SCHEMA_VERSION_KEY = `${NAMESPACE}stammdaten:schema-version`;

/** Liste aller Migrationen, die exakt einmal pro Storage laufen. */
const ALL_MIGRATIONS = [
  'v150-to-v151-letter-replies-array',
  // V1 → V1.1 Renten/KV-Buckets initialisieren. Persona-Bestände bleiben
  // unverändert; die V1.1-optionalen Felder sind additiv und werden über
  // `seedStammdatenV11ForPersona()` befüllt (siehe `stammdaten/api.ts`).
  'v1-to-v11-renten-kv-buckets',
  // V1 → V1.2 Kontakt-Schicht-Migration (Spec § 4.1). Persona-Snapshots werden
  // vom Persona-Block auf den V1.2-shape überführt (full rename) und in den
  // neuen Bucket `stammdaten:notification-praeferenzen` kopiert; idempotent.
  'v1-to-v12-kontakt-schicht',
  // V1.x → V1.2 Behörden-Default für `bundid_postfach_anbindung`. Behörden im
  // Bucket ohne expliziten Wert bekommen `nicht_angebunden`-Default; eine
  // sub-set Whitelist (Familienkasse, Bürgerämter Berlin) bekommt
  // realismus-Werte. Idempotent — überschreibt vorhandene Werte nicht.
  'v1-to-v12-behoerden-anbindung-default',
  // V1.2 → V1.3 Mobilität-Schicht (Spec § 5.3). Pro Persona: `mobilitaet`-
  // Block aus Seed übernehmen (idempotent — überschreibt existierende
  // Werte NICHT); Lena Schmidt `kfz_halter`-Korrektur (V1.0-Drift) auf
  // `false`; Anna `halter_adresse.uebergangs_marker_via_umzug` auf `true`
  // mit Vorgang-Ref. Schema-Version-Marker `'1.3'` setzen. Sicherheits-
  // Guard: kein `punkte`-Feld in `persona.mobilitaet` (VL-4 / HL-MOB-11).
  'v12-to-v13-mobilitaet',
  // V1.3 → V1.3.x Familienstand-Default: Personas im localStorage ohne
  // `familienstand` bekommen den Wert additiv — abgeleitet aus
  // `eheschliessung` (→ `verheiratet`), sonst Default `ledig`. Idempotent —
  // überschreibt vorhandene Werte nicht.
  'v13-familienstand-default',
] as const;

type MigrationId = (typeof ALL_MIGRATIONS)[number];

const migrationsLogSchema = z.array(z.string());

/**
 * Migrationen liefen früher nur im Browser (`window.localStorage`). Seit der
 * Store-Abstraktion ist über `getCurrentStore()` IMMER ein Store auflösbar
 * (Browser-localStorage, Server-Session-Memory oder Default-Memory), daher
 * laufen Migrationen jetzt in jeder Umgebung. Der Helper bleibt als
 * benannter Guard erhalten, gibt aber konstant `true` zurück — so bleibt jede
 * Call-Site unverändert und die Diff minimal.
 */
const isBrowser = (): boolean => true;

function readExecutedMigrations(): MigrationId[] {
  if (!isBrowser()) return [];
  const raw = getCurrentStore().getItem(MIGRATIONS_KEY);
  if (raw === null) return [];
  try {
    const parsed = migrationsLogSchema.safeParse(JSON.parse(raw));
    if (!parsed.success) return [];
    return parsed.data.filter(
      (id): id is MigrationId =>
        (ALL_MIGRATIONS as readonly string[]).includes(id),
    );
  } catch {
    return [];
  }
}

function recordMigration(id: MigrationId): void {
  if (!isBrowser()) return;
  const existing = readExecutedMigrations();
  if (existing.includes(id)) return;
  const next = [...existing, id];
  getCurrentStore().setItem(MIGRATIONS_KEY, JSON.stringify(next));
}

/**
 * Migriert `letter-replies` von V1.5.0-Shape (`Record<string, Reply>`) zu
 * V1.5.1-Shape (`Record<string, Reply[]>`). Idempotent — wenn der Bucket
 * bereits im neuen Shape liegt (oder nicht existiert), ist die Migration ein
 * No-op.
 *
 * Strategie:
 *   - Lies `letter-replies` raw.
 *   - Versuche zuerst, mit dem V1.5.1-Schema zu parsen → wenn erfolgreich, no-op.
 *   - Sonst versuche, mit dem V1.5.0-Schema zu parsen → wenn erfolgreich,
 *     wrappe jede Reply in ein `[reply]` und schreibe zurück.
 *   - Beide Schemas falsch → no-op (persistence.ts wird beim nächsten `read()`
 *     den Bucket cleared und seedIfEmpty() füllt ihn neu).
 */
function migrateLetterRepliesArray(): void {
  if (!isBrowser()) return;
  const raw = getCurrentStore().getItem(REPLIES_KEY);
  if (raw === null) return;

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(raw);
  } catch {
    // Corrupt JSON — persistence.ts entfernt das beim nächsten read().
    return;
  }

  // Schon im neuen Shape? → fertig.
  if (letterRepliesMapSchema.safeParse(parsedJson).success) return;

  // Im alten Shape? → wrappen.
  const v150 = letterRepliesMapV150Schema.safeParse(parsedJson);
  if (!v150.success) {
    // Weder V1.5.0 noch V1.5.1 — corrupt; keine Aktion (persistence räumt auf).
    if (typeof console !== 'undefined') {
      console.warn(
        '[mock-backend/persistence-migrations] letter-replies bucket fits neither V1.5.0 nor V1.5.1 schema — leaving for persistence.read() to clean up.',
      );
    }
    return;
  }

  const migrated: LetterReplyMap = {};
  for (const [letterId, reply] of Object.entries(v150.data)) {
    migrated[letterId] = [reply as Reply];
  }
  getCurrentStore().setItem(REPLIES_KEY, JSON.stringify(migrated));

  if (typeof console !== 'undefined') {
    // `warn` (not `info`) — project lint config restricts console to warn/error.
    console.warn(
      `[mock-backend/persistence-migrations] migrated letter-replies from V1.5.0 (Record<string, Reply>) to V1.5.1 (Record<string, Reply[]>) — ${Object.keys(migrated).length} letter(s).`,
    );
  }
}

/**
 * V1 → V1.1 Migration: legt die zwei neuen V1.1-Renten/KV-Buckets als leere
 * Records an, falls sie noch nicht existieren. Persona-Daten bleiben
 * unangetastet (V1.1-Felder in `personas.json` werden direkt über die
 * Fixture geseedet beim nächsten `seedIfEmpty()`-Pass).
 *
 * Hard-Line § 11.22 + § 11.25: `pflegegrad-consent-session` lebt in
 * sessionStorage und wird hier NICHT angelegt; die Yellow-Letter-Bridge-
 * applied-Liste startet leer.
 */
function migrateRentenKvBuckets(): void {
  if (!isBrowser()) return;
  const RENTEN_ECKDATEN_KEY = `${NAMESPACE}stammdaten:renten-eckdaten-v1-1`;
  const BRIDGE_APPLIED_KEY = `${NAMESPACE}stammdaten:yellow-letter-bridge-applied`;

  if (getCurrentStore().getItem(RENTEN_ECKDATEN_KEY) === null) {
    getCurrentStore().setItem(RENTEN_ECKDATEN_KEY, JSON.stringify({}));
  }
  if (getCurrentStore().getItem(BRIDGE_APPLIED_KEY) === null) {
    getCurrentStore().setItem(BRIDGE_APPLIED_KEY, JSON.stringify({}));
  }
}

// ---------------------------------------------------------------------------
// V1 → V1.2 Kontakt-Schicht-Migration (Spec § 4.1)
// ---------------------------------------------------------------------------

/**
 * Default-Notification-Präferenzen `5×'brief'` (Hard-Line § 11.34 Default-
 * Brief-Fallback bei noch-nicht-konfigurierter Persona).
 */
const DEFAULT_NOTIFICATION_PRAEFERENZEN: PersonaKontakt['notification_praeferenzen'] = {
  steuer: 'brief',
  sozial: 'brief',
  familie: 'brief',
  verkehr: 'brief',
  sonstige: 'brief',
};

const DEFAULT_POSTFACH: PersonaKontakt['bundid_postfach'] = {
  aktiviert: false,
  status: 'inaktiv',
};

/**
 * Persona-spezifische V1.2-Kontakt-Snapshots (Spec § 4.5). Hard-coded weil
 * `personas.json`-Migration den Persona-`kontakt`-Block aus dem Fixture
 * direkt in den V1.2-Shape überführt; falls die JSON-Quelle einen V1-Shape
 * `{email, mobil}` trägt, fallen wir auf diesen Lookup zurück.
 *
 * Hard-Line § 11.31 (Anna): postfach `aktiv`, bundid_email verified,
 * mobil verified. Hard-Line § 3.2 (Schmidt): postfach `teilaktiviert`,
 * mobil unverified. Hard-Line § 3.3 (Mehmet): postfach `inaktiv`,
 * Selbstständigen-Caveat.
 */
const PERSONA_V12_DEFAULTS: Record<string, PersonaKontakt> = {
  'anna-petrov': {
    bundid_email: {
      value: '[MOCK] anna.petrov@example.de',
      verified: true,
      quelle: 'bundid',
      verifiziert_am: '2025-11-04',
    },
    bundid_mobil: {
      value: '[MOCK] +49 30 12345678',
      verified: true,
      quelle: 'bundid_self_attested',
      verifiziert_am: '2026-04-15',
    },
    bundid_postfach: {
      aktiviert: true,
      status: 'aktiv',
      aktiviert_am: '2026-05-08',
    },
    notification_praeferenzen: { ...DEFAULT_NOTIFICATION_PRAEFERENZEN },
  },
  'markus-schmidt': {
    bundid_email: {
      value: '[MOCK] elias.schmidt@example.de',
      verified: true,
      quelle: 'bundid',
      verifiziert_am: '2024-09-12',
    },
    bundid_mobil: {
      value: '[MOCK] +49 89 87654321',
      verified: false,
      quelle: 'bundid_self_attested',
    },
    bundid_postfach: {
      aktiviert: false,
      status: 'teilaktiviert',
      aktiviert_am: '2026-03-21',
    },
    notification_praeferenzen: { ...DEFAULT_NOTIFICATION_PRAEFERENZEN },
  },
  'mehmet-yildiz': {
    bundid_email: {
      value: '[MOCK] mehmet.yildiz@example.de',
      verified: true,
      quelle: 'bundid',
      verifiziert_am: '2025-08-30',
    },
    bundid_mobil: {
      value: '[MOCK] +49 221 5550199',
      verified: true,
      quelle: 'bundid_self_attested',
      verifiziert_am: '2025-08-30',
    },
    bundid_postfach: { aktiviert: false, status: 'inaktiv' },
    notification_praeferenzen: { ...DEFAULT_NOTIFICATION_PRAEFERENZEN },
  },
};

interface LegacyKontaktV1 {
  email?: string;
  mobil?: string;
}

interface MaybePersonaKontakt {
  bundid_email?: { value?: string; verified?: boolean; quelle?: string; verifiziert_am?: string };
  bundid_mobil?: { value?: string; verified?: boolean; quelle?: string; verifiziert_am?: string };
  bundid_postfach?: { aktiviert?: boolean; status?: 'aktiv' | 'inaktiv' | 'teilaktiviert'; aktiviert_am?: string };
  notification_praeferenzen?: PersonaKontakt['notification_praeferenzen'];
}

/**
 * Build V1.2-shape from a V1-shape `{email?, mobil?}` snapshot.
 * - `email` → `bundid_email.value` mit `verified=true` wenn truthy, sonst
 *   `''` mit `verified=false`.
 * - `mobil` → `bundid_mobil.value` mit `verified=false` (self-attested).
 * - `bundid_postfach` initial-default `{ aktiviert: false, status: 'inaktiv' }`.
 * - `notification_praeferenzen` initial-default `5×'brief'`.
 */
export function buildKontaktFromLegacyV1(
  personaId: string | undefined,
  legacy: LegacyKontaktV1 | undefined,
): PersonaKontakt {
  // Persona-spezifische Snapshot-Defaults (Spec § 4.5).
  if (personaId && PERSONA_V12_DEFAULTS[personaId]) {
    const tmpl = PERSONA_V12_DEFAULTS[personaId];
    return {
      bundid_email: { ...tmpl.bundid_email },
      bundid_mobil: tmpl.bundid_mobil ? { ...tmpl.bundid_mobil } : undefined,
      bundid_postfach: { ...tmpl.bundid_postfach },
      notification_praeferenzen: { ...tmpl.notification_praeferenzen },
    };
  }
  const email = legacy?.email;
  const mobil = legacy?.mobil;
  const result: PersonaKontakt = {
    bundid_email: {
      value: email && email.length > 0 ? email : '',
      verified: !!email && email.length > 0,
      quelle: 'bundid',
    },
    bundid_postfach: { ...DEFAULT_POSTFACH },
    notification_praeferenzen: { ...DEFAULT_NOTIFICATION_PRAEFERENZEN },
  };
  if (mobil && mobil.length > 0) {
    result.bundid_mobil = {
      value: mobil,
      verified: false,
      quelle: 'bundid_self_attested',
    };
  }
  return result;
}

function isV12KontaktShape(value: MaybePersonaKontakt | undefined): boolean {
  if (!value) return false;
  return (
    !!value.bundid_email &&
    !!value.bundid_postfach &&
    !!value.notification_praeferenzen
  );
}

/**
 * V1 → V1.2 Kontakt-Schicht-Migration (Spec § 4.1).
 *
 * Strategie:
 *   1. Liest alle Persona-Einträge aus `personas`-Bucket.
 *   2. Pro Persona: prüft, ob `kontakt`-Block bereits V1.2-shape (BundID-
 *      Postfach + notification_praeferenzen) trägt → no-op.
 *   3. Sonst: baut V1.2-shape aus V1-`{email, mobil}` (oder Persona-spezifischem
 *      Default) und schreibt zurück in `personas`-Bucket UND in den neuen
 *      `stammdaten:notification-praeferenzen`-Bucket.
 *
 * Idempotenz: Re-Run ändert nichts, wenn der Bucket bereits V1.2-Shape hat.
 * Lossless: V1-Werte (`email`, `mobil`) bleiben in der V1.2-Struktur erhalten
 * (`bundid_email.value`, `bundid_mobil.value`).
 */
export function migrateKontaktV1ToV11(): void {
  if (!isBrowser()) return;

  // 1. Persona-Bucket lesen (raw).
  const personasRaw = getCurrentStore().getItem(PERSONAS_KEY);
  const personasParsed: unknown = (() => {
    if (personasRaw === null) return undefined;
    try {
      return JSON.parse(personasRaw);
    } catch {
      return undefined;
    }
  })();

  let migrated = false;
  let migratedPersonaCount = 0;

  if (Array.isArray(personasParsed)) {
    const newKontaktBucket: Record<string, PersonaKontakt> = (() => {
      const existingRaw = getCurrentStore().getItem(KONTAKT_V12_KEY);
      if (existingRaw === null) return {};
      try {
        const parsed: unknown = JSON.parse(existingRaw);
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          return parsed as Record<string, PersonaKontakt>;
        }
        return {};
      } catch {
        return {};
      }
    })();

    for (const p of personasParsed) {
      if (!p || typeof p !== 'object') continue;
      const persona = p as { id?: string; kontakt?: MaybePersonaKontakt & LegacyKontaktV1 };
      const personaId = persona.id;
      if (!personaId) continue;

      const k = persona.kontakt;
      if (isV12KontaktShape(k)) {
        // Already V1.2 — copy into bucket if not already there (idempotent).
        if (!newKontaktBucket[personaId]) {
          newKontaktBucket[personaId] = k as unknown as PersonaKontakt;
        }
        continue;
      }

      // V1-shape (or undefined) → build V1.2.
      const next = buildKontaktFromLegacyV1(personaId, {
        email: k?.email,
        mobil: k?.mobil,
      });
      persona.kontakt = next as unknown as MaybePersonaKontakt & LegacyKontaktV1;
      newKontaktBucket[personaId] = next;
      migratedPersonaCount += 1;
      migrated = true;
    }

    // 2. Persona-Bucket zurückschreiben (in-place mutation OK).
    if (migrated) {
      getCurrentStore().setItem(
        PERSONAS_KEY,
        JSON.stringify(personasParsed),
      );
    }
    // 3. V1.2-Bucket schreiben (auch wenn nichts neu zu migrieren war —
    //    Initial-Bestand für leere Buckets).
    getCurrentStore().setItem(
      KONTAKT_V12_KEY,
      JSON.stringify(newKontaktBucket),
    );
  } else {
    // Kein Persona-Bucket vorhanden — nur den V1.2-Bucket initialisieren.
    if (getCurrentStore().getItem(KONTAKT_V12_KEY) === null) {
      getCurrentStore().setItem(KONTAKT_V12_KEY, JSON.stringify({}));
    }
  }

  // 4. V1-`stammdaten:kontakt`-Bucket bleibt erhalten (trägt nur
  //    `sprachpraeferenz` — V1-stable). Niemals löschen.

  if (migrated && typeof console !== 'undefined') {
    console.warn(
      `[mock-backend/persistence-migrations] migrated kontakt from V1 (email/mobil) to V1.2 (BundID-Postfach + notification_praeferenzen) — ${migratedPersonaCount} persona(s).`,
    );
  }
}

// ---------------------------------------------------------------------------
// V1.x → V1.2 Behörden-Default für `bundid_postfach_anbindung` (Spec § 10)
// ---------------------------------------------------------------------------

/**
 * Persona-realistic Mock-Annahmen pro Behörde (Spec § 10). Hard-Line § 11.35.
 * Behörden ohne Eintrag bekommen `nicht_angebunden` (sicherer Default).
 */
const BEHOERDE_ANBINDUNG_DEFAULTS: Record<string, 'angebunden' | 'in_pilotierung' | 'nicht_angebunden'> = {
  // Hero-Demo: Familienkasse Berlin-Brandenburg ist verbindlich `angebunden`.
  'familienkasse-berlin-brandenburg': 'angebunden',
  // Berliner Bürgerämter in 2026-Pilot-Phase.
  'buergeramt-berlin-mitte': 'in_pilotierung',
  'buergeramt-berlin-friedrichshain-kreuzberg': 'in_pilotierung',
  // ABH/LEA: Mehmet-Hard-Lock.
  'abh-berlin-lea': 'nicht_angebunden',
  'abh-koeln': 'nicht_angebunden',
  // Steuer-Bekanntgabe läuft über ELSTER-Posteingang, nicht BundID.
  'finanzamt-koerperschaften-i-berlin': 'nicht_angebunden',
  'finanzamt-hamburg-eimsbuettel': 'nicht_angebunden',
  'finanzamt-koeln-mitte': 'nicht_angebunden',
  // KFZ-Behörden 2026 nicht an BundID.
  'kfz-berlin-labo': 'nicht_angebunden',
  // GKV-Träger eigene Portale (§ 36a SGB I).
  'aok-nordost': 'nicht_angebunden',
  'aok-rheinland-hamburg': 'nicht_angebunden',
  'tk-hamburg': 'nicht_angebunden',
  'barmer-koeln': 'nicht_angebunden',
  'aok-nordost-pflegekasse': 'nicht_angebunden',
  'tk-pflegekasse': 'nicht_angebunden',
  'barmer-pflegekasse': 'nicht_angebunden',
  // DRV-Träger angebunden (Demo: § 109 SGB VI Yellow-Letter Bridge).
  'drv-bund': 'angebunden',
  'drv-berlin-brandenburg': 'angebunden',
  'drv-nord': 'angebunden',
  'drv-rheinland': 'angebunden',
  'drv-bayern-sued': 'angebunden',
  'zfdr-drv-bund': 'angebunden',
  // Beitragsservice eigenes Portal.
  'beitragsservice-koeln': 'nicht_angebunden',
  // Bundesdruckerei — privatrechtlich, kein hoheitlicher Bekanntgabe-Träger.
  'bundesdruckerei': 'nicht_angebunden',
  // Privat (Banken, Versicherer, EVU, Telekom).
  'berliner-sparkasse': 'nicht_angebunden',
  'allianz-hausrat': 'nicht_angebunden',
  'vattenfall-strom': 'nicht_angebunden',
  'telekom': 'nicht_angebunden',
  // Standesämter 2026 nicht an BundID-Postfach.
  'standesamt-hamburg-eimsbuettel': 'nicht_angebunden',
  'standesamt-berlin-mitte': 'nicht_angebunden',
  // BZSt → angebunden (Bund-Pionier wie Familienkasse).
  'bzst': 'angebunden',
  'bamf': 'nicht_angebunden',
  // IHK / Berufsgenossenschaft → eigene Portale.
  'ihk-koeln': 'nicht_angebunden',
  'vbg-hamburg': 'nicht_angebunden',
  // gematik (Telematikinfrastruktur) → kein Bürger-Postfach-Träger.
  'gematik': 'nicht_angebunden',
};

/**
 * Setzt `bundid_postfach_anbindung` auf jedem Behörden-Eintrag im Bucket
 * (falls nicht bereits gesetzt). Idempotent — überschreibt vorhandene Werte
 * nicht.
 */
export function migrateBehoerdenAnbindungDefault(): void {
  if (!isBrowser()) return;
  const raw = getCurrentStore().getItem(BEHOERDEN_KEY);
  if (raw === null) return;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return;
  }
  if (!Array.isArray(parsed)) return;

  let dirty = false;
  for (const b of parsed) {
    if (!b || typeof b !== 'object') continue;
    const beh = b as { id?: string; bundid_postfach_anbindung?: string };
    if (beh.bundid_postfach_anbindung) continue; // already set
    const id = beh.id;
    beh.bundid_postfach_anbindung =
      (id && BEHOERDE_ANBINDUNG_DEFAULTS[id]) ?? 'nicht_angebunden';
    dirty = true;
  }

  if (dirty) {
    getCurrentStore().setItem(BEHOERDEN_KEY, JSON.stringify(parsed));
    if (typeof console !== 'undefined') {
      console.warn(
        '[mock-backend/persistence-migrations] migrated behoerden bucket: added bundid_postfach_anbindung defaults.',
      );
    }
  }
}

// ---------------------------------------------------------------------------
// V1.2 → V1.3 Mobilität-Schicht-Migration (Spec § 5.3)
// ---------------------------------------------------------------------------

/**
 * Defensive-strip aller `punkte`-/`punktezahl`-Felder aus einem
 * `Mobilitaet`-Objekt (HL-MOB-11 / VL-4). Mutiert in-place.
 * Re-Export aus Test-Hilfen.
 */
export function stripPunkteField(mob: Mobilitaet | undefined): Mobilitaet | undefined {
  if (!mob) return mob;
  const record = mob as unknown as Record<string, unknown>;
  if ('punkte' in record) delete record.punkte;
  if ('punktezahl' in record) delete record.punktezahl;
  return mob;
}

/**
 * V1.2 → V1.3 Mobilität-Schicht-Migration (Spec § 5.3).
 *
 * Schritte:
 *   1. Prüft `schema-version`-Marker: bei `'1.3'` → no-op (Idempotenz).
 *   2. Pro Persona im `personas`-Bucket:
 *      a. Wenn `persona.mobilitaet` fehlt → aus `SEED_MOBILITAET` kopieren.
 *      b. Defensive strip von `punkte`/`punktezahl`-Excess-Keys
 *         (HL-MOB-11 / VL-4).
 *      c. Lena Schmidt (`markus-schmidt.familie.partner`)
 *         `kfz_halter`-Korrektur auf `false` (V1.0-Drift; VL-12).
 *   3. Schreibt den Mobilität-Bucket `stammdaten:mobilitaet` aus den
 *      kombinierten Persona-Mobilität-Werten neu (idempotent: existierende
 *      Werte werden NICHT überschrieben).
 *   4. Setzt `schema-version` auf `'1.3'`.
 *
 * Lossless: kein Persona-Bestandsdatum geht verloren. Re-Run = no-op.
 *
 * Architect-Hinweis (Spec § 5.3): die Funktion heißt `migratePersonaV12ToV13`
 * (kanonisch laut Spec); ein Alias `migrateMobilitaetV12ToV13` wird ebenfalls
 * exportiert, damit Tests beide Importpfade greifen können.
 */
export function migratePersonaV12ToV13(): void {
  if (!isBrowser()) return;

  // 1. Idempotenz: schon migriert?
  const versionRaw = getCurrentStore().getItem(SCHEMA_VERSION_KEY);
  if (versionRaw !== null) {
    try {
      const parsed = JSON.parse(versionRaw) as { version?: string };
      if (parsed?.version === '1.3') return;
    } catch {
      // ignore corrupt marker — werden wir gleich überschreiben.
    }
  }

  // 2. Persona-Bucket-Mutation: mobilitaet additiv + Lena-Korrektur + punkte-Strip.
  const personasRaw = getCurrentStore().getItem(PERSONAS_KEY);
  const personasParsed: unknown = (() => {
    if (personasRaw === null) return undefined;
    try {
      return JSON.parse(personasRaw);
    } catch {
      return undefined;
    }
  })();

  if (Array.isArray(personasParsed)) {
    for (const p of personasParsed) {
      if (!p || typeof p !== 'object') continue;
      const persona = p as {
        id?: PersonaId;
        mobilitaet?: Mobilitaet;
        familie?: { partner?: { id?: string; kfz_halter?: boolean } };
      };
      const personaId = persona.id;
      if (!personaId) continue;

      // a. mobilitaet aus Seed übernehmen, falls noch nicht vorhanden.
      if (!persona.mobilitaet && SEED_MOBILITAET[personaId]) {
        persona.mobilitaet = JSON.parse(
          JSON.stringify(SEED_MOBILITAET[personaId]),
        ) as Mobilitaet;
      }

      // b. Defensive punkte-Strip (HL-MOB-11 / VL-4).
      stripPunkteField(persona.mobilitaet);

      // c. Lena-Korrektur (VL-12): Schmidt-Vater bleibt einziger Halter.
      if (
        personaId === 'markus-schmidt' &&
        persona.familie?.partner?.id === 'lena-schmidt' &&
        persona.familie.partner.kfz_halter === true
      ) {
        persona.familie.partner.kfz_halter = false;
      }
    }
    getCurrentStore().setItem(PERSONAS_KEY, JSON.stringify(personasParsed));
  }

  // 3. Standalone-Bucket `stammdaten:mobilitaet` schreiben (idempotent —
  //    existierende Werte überschreiben wir NICHT, fehlende füllen wir).
  const existingMobBucketRaw = getCurrentStore().getItem(MOBILITAET_KEY);
  const existingBucket: Record<PersonaId, Mobilitaet> = (() => {
    if (existingMobBucketRaw === null) return {};
    try {
      const parsed: unknown = JSON.parse(existingMobBucketRaw);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return parsed as Record<PersonaId, Mobilitaet>;
      }
      return {};
    } catch {
      return {};
    }
  })();

  for (const [personaId, seedValue] of Object.entries(SEED_MOBILITAET)) {
    if (!existingBucket[personaId]) {
      existingBucket[personaId] = JSON.parse(JSON.stringify(seedValue)) as Mobilitaet;
    }
    // Defensive punkte-Strip.
    stripPunkteField(existingBucket[personaId]);
  }
  getCurrentStore().setItem(MOBILITAET_KEY, JSON.stringify(existingBucket));

  // 4. Schema-Version-Marker.
  getCurrentStore().setItem(
    SCHEMA_VERSION_KEY,
    JSON.stringify({ version: '1.3' }),
  );

  if (typeof console !== 'undefined') {
    console.warn(
      '[mock-backend/persistence-migrations] migrated persona schema V1.2 → V1.3 (Mobilität-Sektion + Lena kfz_halter-Korrektur + punkte-Excess-Key-Strip).',
    );
  }
}

/** Alias für Tests, die den Mobilität-zentrischen Namen erwarten. */
export const migrateMobilitaetV12ToV13 = migratePersonaV12ToV13;

// ---------------------------------------------------------------------------
// V1.3.x Familienstand-Default-Migration
// ---------------------------------------------------------------------------

/**
 * Leitet einen `Familienstand`-Wert aus dem vorhandenen Familien-Snapshot ab.
 * Konservativ: ein `eheschliessung`-Block (Standesamt-Daten) impliziert
 * `verheiratet`; ohne diesen Beleg fällt der Default auf `ledig` (häufigster
 * Melderegister-Wert; kein Beleg für andere Stände im Persona-Seed).
 */
function deriveFamilienstand(persona: {
  eheschliessung?: unknown;
}): Familienstand {
  return persona.eheschliessung ? 'verheiratet' : 'ledig';
}

/**
 * V1.3.x Familienstand-Default-Migration.
 *
 * Personas im `personas`-Bucket ohne `familienstand` bekommen den Wert additiv:
 * aus `eheschliessung` abgeleitet (→ `verheiratet`), sonst Default `ledig`.
 *
 * Idempotent: Personas mit bereits gesetztem `familienstand` bleiben
 * unangetastet; Re-Run ohne Persona-Bucket ist ein No-op.
 */
export function migrateFamilienstandDefault(): void {
  if (!isBrowser()) return;

  const personasRaw = getCurrentStore().getItem(PERSONAS_KEY);
  if (personasRaw === null) return;

  let personasParsed: unknown;
  try {
    personasParsed = JSON.parse(personasRaw);
  } catch {
    return;
  }
  if (!Array.isArray(personasParsed)) return;

  let dirty = false;
  for (const p of personasParsed) {
    if (!p || typeof p !== 'object') continue;
    const persona = p as {
      familienstand?: Familienstand;
      eheschliessung?: unknown;
    };
    if (persona.familienstand) continue; // already set — idempotent
    persona.familienstand = deriveFamilienstand(persona);
    dirty = true;
  }

  if (dirty) {
    getCurrentStore().setItem(PERSONAS_KEY, JSON.stringify(personasParsed));
    if (typeof console !== 'undefined') {
      console.warn(
        '[mock-backend/persistence-migrations] migrated personas bucket: added familienstand defaults (derived from eheschliessung, fallback ledig).',
      );
    }
  }
}

/**
 * Public Entry-Point: läuft idempotent alle ausstehenden Migrationen.
 * `seed.ts:seedIfEmpty()` ruft das vor jedem Bucket-Lookup.
 */
export function runStorageMigrations(): void {
  if (!isBrowser()) return;
  const executed = new Set(readExecutedMigrations());

  if (!executed.has('v150-to-v151-letter-replies-array')) {
    migrateLetterRepliesArray();
    recordMigration('v150-to-v151-letter-replies-array');
  }

  if (!executed.has('v1-to-v11-renten-kv-buckets')) {
    migrateRentenKvBuckets();
    recordMigration('v1-to-v11-renten-kv-buckets');
  }

  if (!executed.has('v1-to-v12-kontakt-schicht')) {
    migrateKontaktV1ToV11();
    recordMigration('v1-to-v12-kontakt-schicht');
  }

  if (!executed.has('v1-to-v12-behoerden-anbindung-default')) {
    migrateBehoerdenAnbindungDefault();
    recordMigration('v1-to-v12-behoerden-anbindung-default');
  }

  if (!executed.has('v12-to-v13-mobilitaet')) {
    migratePersonaV12ToV13();
    recordMigration('v12-to-v13-mobilitaet');
  }

  if (!executed.has('v13-familienstand-default')) {
    migrateFamilienstandDefault();
    recordMigration('v13-familienstand-default');
  }
}
