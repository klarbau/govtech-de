import type { BehoerdeId } from './behoerde';

export type TerminStatus =
  // Enum-WERTE bleiben stabil (schützt `mintBuergeramtAnmeldungArtefakte`
  // + die gated `spine.spec.ts`). Die UI-LABELS ändern sich (redesign-termine-
  // vorgemerkt.md, Tier 2): 'vorgeschlagen' wird als „Vorgemerkt" angezeigt;
  // 'gebucht' und 'verschoben' verschwinden aus dem UI-Vokabular (gebucht →
  // als „Bestätigt" gemappt; verschoben ist eine Transition, kein Ruhe-Status).
  // „Erledigt" ist KEIN sechster Enum-Wert, sondern in der View abgeleitet
  // (datum < heute && war bestätigt).
  | 'vorgeschlagen' // Label „Vorgemerkt" — Autopilot-Slot, vom Bürger noch zu bestätigen
  | 'gebucht' // Legacy-Wert; UI mappt auf „Bestätigt" (Seeds migriert auf 'bestaetigt')
  | 'bestaetigt' // Label „Bestätigt" — vom Bürger akzeptiert (RFC 5545 ACCEPTED)
  | 'abgesagt' // Label „Abgesagt"
  | 'verschoben'; // Legacy-Wert; nicht mehr geschrieben (reschedule mutiert nur `datum`)
export type TerminOrtTyp = 'praesenz' | 'video' | 'telefon';

export interface TerminOrt {
  typ: TerminOrtTyp;
  /** Adresse oder Video-Link / Telefonnummer (Klartext für UI). */
  details: string;
}

/** Kategorie-Markierung eines Termins für den Termine-Filter (Redesign). */
export type TerminKategorie = 'behoerdentermin' | 'buchung';

/** Eine Zeile der Vorbereitungs-Checkliste eines Termins (Demo, client-abhakbar). */
export interface TerminVorbereitungItem {
  /** i18n-Key der Checklisten-Zeile (z. B. "termine.vorbereitung.reisepass"). */
  label_i18n_key: string;
  /**
   * Vorab-abgehakt (illustrativ, die eigene Checkliste des Bürgers — ehrlich, kein
   * Backend-Anspruch). Fehlt das Feld, rendert die Zeile unabgehakt. Der
   * Toggle-Zustand ist danach rein clientseitig (`redesign termine-green § 5`).
   */
  done?: boolean;
}

export interface Termin {
  id: string;
  behoerde_id: BehoerdeId;
  vorgang_id?: string;
  /** ISO-Timestamp inkl. Uhrzeit. */
  datum: string;
  ort: TerminOrt;
  status: TerminStatus;
  /** Anzeige-Titel ('Adressaktualisierung Aufenthaltstitel', 'Anmeldung neuer Wohnort'). */
  betreff: string;

  // ---------------------------------------------------------------------------
  // Redesign-Termine — additive optionale Felder (`redesign-termine.md` § 6).
  // Kein Bruch an existierenden Termin-Konsumenten.
  // ---------------------------------------------------------------------------

  /** Buchungsreferenz für die Anzeige (`tabular-nums`). z. B. "LEA-2025-04412". */
  buchungsreferenz?: string;
  /** Vorbereitungs-Checkliste (Demo, client-abhakbar). */
  vorbereitung?: TerminVorbereitungItem[];
  /**
   * @deprecated UI liest `kategorie` / `ort.typ` nicht mehr (redesign-termine-
   * vorgemerkt.md, Tier 2: TerminKategorie aus der IA entfernt). Feld bleibt für
   * Alt-Seeds typkompatibel, hat aber keine Anzeige-Wirkung mehr.
   */
  kategorie?: TerminKategorie;
  /** Besitzer-Persona (Owner-Filter, §A3). Neue Seeds tragen das Feld immer. */
  owner_persona_id?: string;

  // ---------------------------------------------------------------------------
  // Tier-2 (redesign-termine-vorgemerkt.md) — additive Felder für den
  // Frist↔Termin-Reasoning-String des „Vorgemerkt"-Hero. Optional & nicht-
  // brechend: gesetzt nur beim Bürgeramt-Anmeldung-Mint; Alt-Termine ohne diese
  // Felder fallen in der View auf das statische §-17-Reasoning ohne „noch N Tage".
  // ---------------------------------------------------------------------------

  /**
   * ISO-Timestamp der gesetzlichen Anmeldefrist, an die dieser Termin gekoppelt
   * ist (= `letzterSichererAnmeldungSlot(stichtag).fristIso`). Erlaubt der View,
   * „noch N Tage bis zur Frist" tagesaktuell zu rechnen, ohne den stichtag zu
   * kennen. § 17 Abs. 1 BMG = ZWEI WOCHEN / 14 Kalendertage (nie Werktage).
   */
  frist_iso?: string;
  /**
   * Maschinenlesbarer Reasoning-Typ für den Frist↔Termin-Satz (aktuell nur
   * 'bmg_17'). Steuert, welcher i18n-Reasoning-String gerendert wird.
   */
  reasoning_typ?: 'bmg_17';
}

/** Kategorie eines Reminders (Redesign-Termine). */
export type ReminderKategorie = 'frist' | 'erinnerung';

/**
 * Eigenständige Erinnerung / Frist für den Termine-Screen.
 * Seed-basiert (`src/data/reminders.json`) + abgeleitet aus `Vorgang.fristen[]`.
 */
export interface Reminder {
  id: string;
  /** Bezug zur Behörde (für IconCircle + Name). */
  behoerde_id?: BehoerdeId;
  /** Optionaler Vorgangs-Bezug (Frist eines Vorgangs). */
  vorgang_id?: string;
  /** Anzeige-Titel ("Kindergeld-Nachweis fällig", "Steuererklärung 2024"). */
  titel: string;
  /** ISO-Datum der Frist/Erinnerung. */
  datum: string;
  kategorie: ReminderKategorie;
  /** Maschinenlesbarer Frist-Typ, falls aus Vorgang ("bmg_17", …). */
  frist_typ?: string;
  /** Besitzer-Persona (Owner-Filter, §A3). Neue Seeds tragen das Feld immer. */
  owner_persona_id?: string;
  /**
   * Erledigt-Status (§A1 "overdue-but-handled" / §C4 markReminderDone). Wenn
   * `true`, gilt die Frist als bereits abgearbeitet — überfällig aber gehandhabt.
   */
  erledigt?: boolean;
}
