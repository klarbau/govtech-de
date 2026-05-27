import type { BehoerdeId } from './behoerde';

export type TerminStatus = 'gebucht' | 'bestaetigt' | 'abgesagt';
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
  /** Optionale Kategorie-Markierung für Filter; sonst aus `ort.typ` abgeleitet. */
  kategorie?: TerminKategorie;
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
}
