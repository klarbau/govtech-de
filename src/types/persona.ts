import type { Adresse } from './adresse';

/** Krankenversicherungs-Stammsatz (gesetzlich oder privat). */
export interface Krankenversicherung {
  typ: 'gkv' | 'pkv';
  /** Name der Kasse / des Versicherers (z. B. 'AOK Nordost', 'DAK-Gesundheit', 'Allianz Privat'). */
  traeger: string;
  /** Versichertennummer (synthetisch, mit `[MOCK]`-Präfix in seed-Daten). */
  versichertennummer?: string;
}

/** Beschäftigungsverhältnis. */
export interface Beschaeftigung {
  typ: 'angestellt' | 'selbstaendig' | 'beamt' | 'student' | 'arbeitssuchend' | 'rente';
  arbeitgeber?: string;
  rolle?: string;
  /** ISO-Datum. */
  beginn?: string;
}

/** Aufenthaltstitel-Stammsatz (nur Drittstaatsangehörige). */
export interface Aufenthaltstitel {
  /** Norm-Kürzel, z. B. '§ 18g AufenthG' für die Blue Card EU (post-2023-Reform). */
  norm: string;
  /** ISO-Datum: gültig bis. */
  valid_until: string;
  /** Aktenzeichen der zuständigen Ausländerbehörde (synthetisch, `[MOCK]`-Präfix). */
  az: string;
  /** ID der zuständigen Ausländerbehörde aus behoerden.json. */
  abh_behoerde_id?: string;
}

export type PersonaId = string;

/**
 * Stammdaten einer Person. Spiegelt die für die Demo benötigte Untermenge des
 * deutschen Melde- und Sozialversicherungs-Datenmodells wider. Verschachtelte
 * Familie referenziert vollständige Personas (für Ehegatten/Kinder).
 */
export interface Persona {
  id: PersonaId;
  vorname: string;
  nachname: string;
  /** ISO-Datum (YYYY-MM-DD). */
  geburtsdatum: string;
  staatsangehoerigkeit: string;
  adresse: Adresse;
  /** Steuer-Identifikationsnummer (AO §139b), 11 Ziffern, synthetisch. */
  steuer_id?: string;
  /** Rentenversicherungsnummer im Format AANNNNNNNAA (12 Stellen). */
  rentenversicherungsnummer?: string;
  aufenthaltstitel?: Aufenthaltstitel;
  familie: {
    partner?: Persona;
    kinder: Persona[];
  };
  beschaeftigung?: Beschaeftigung;
  krankenversicherung?: Krankenversicherung;
  /** Steuert, ob Block D den KFZ-Zulassungs-Schritt (§ 15 FZV) anzeigt. */
  kfz_halter: boolean;
  /** Steuert, ob Block D den Familienkasse-Schritt (§ 67/68 EStG) anzeigt. */
  kindergeld_bezug: boolean;
  /** Steuert, ob Block A den Wehrverwaltungs-Schritt (§ 58c SG) anzeigt. */
  wehrerfasst: boolean;
  /** ISO-639-1-Codes der gesprochenen Sprachen (z. B. ['de','ru','en']). */
  sprachen: string[];
}
