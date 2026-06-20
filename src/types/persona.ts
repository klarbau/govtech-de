import type { Adresse } from './adresse';
import type { Mobilitaet } from './mobilitaet';
import type { PersonaKontakt } from './persona-kontakt';
import type {
  AnrechnungszeitPflege,
  EpaStatus,
  ERezeptModus,
  KvnrV11,
  Pflegegrad,
  RentenEckdaten,
  RentenTrack,
  Versorgungswerk,
} from './renten-kv';

/** Krankenversicherungs-Stammsatz (gesetzlich oder privat). */
export interface Krankenversicherung {
  typ: 'gkv' | 'pkv';
  /** Name der Kasse / des Versicherers (z. B. 'AOK Nordost', 'DAK-Gesundheit', 'Allianz Privat'). */
  traeger: string;
  /** Versichertennummer (synthetisch, mit `[MOCK]`-Präfix in seed-Daten). */
  versichertennummer?: string;
}

/**
 * Bankverbindung (Stammdaten / Once-Only-Quelle). Synthetisch, `[MOCK]`-Präfix
 * auf der IBAN. Quelle: BundID-verifiziert oder Selbstauskunft. Speist die
 * Once-Only-Prefill der funktionalen Lebenslagen (Kindergeld, BAföG, Wohngeld,
 * Elterngeld — Spec `vorgaenge-functional.md` §1.3/§3).
 */
export interface Bankverbindung {
  /** Synthetische IBAN mit `[MOCK]`-Präfix. */
  iban: string;
  /** Name der Bank (z. B. 'Berliner Sparkasse'). */
  bank: string;
  /** Provenienz der Angabe (z. B. 'bundid', 'selbstauskunft'). */
  quelle: string;
  /** Ob die Bankverbindung verifiziert ist. */
  verified: boolean;
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
 * Familienstand (Personenstand) nach deutschem Melderecht (§ 3 Abs. 1 Nr. 8 BMG).
 * Geschlossene Enum analog der amtlichen Melderegister-Werte.
 */
export type Familienstand =
  | 'ledig'
  | 'verheiratet'
  | 'geschieden'
  | 'verwitwet'
  | 'eingetragene_lebenspartnerschaft';

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
  /**
   * Familienstand (Personenstand, § 3 Abs. 1 Nr. 8 BMG). Optional — Personas
   * ohne expliziten Seed-Wert werden bei der Persistenz-Migration aus
   * `familie`/`eheschliessung` abgeleitet (Default `ledig`).
   */
  familienstand?: Familienstand;
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
  /**
   * Bankverbindung (Once-Only-Quelle für Leistungs-Auszahlungen). Optional,
   * additiv — bricht keine bestehenden Konsumenten. Spec
   * `vorgaenge-functional.md` §1.3.
   */
  bankverbindung?: Bankverbindung;
  /** Steuert, ob Block D den KFZ-Zulassungs-Schritt (§ 15 FZV) anzeigt. */
  kfz_halter: boolean;
  /** Steuert, ob Block D den Familienkasse-Schritt (§ 67/68 EStG) anzeigt. */
  kindergeld_bezug: boolean;
  /** Steuert, ob Block A den Wehrverwaltungs-Schritt (§ 58c SG) anzeigt. */
  wehrerfasst: boolean;
  /** ISO-639-1-Codes der gesprochenen Sprachen (z. B. ['de','ru','en']). */
  sprachen: string[];

  // -------------------------------------------------------------------------
  // V1 Stammdaten — additive optionale Felder (Spec § 4.3). Kein Bruch an
  // existierenden V1.5.0/V1.5.1-Konsumenten (Umzug, Posteingang).
  // -------------------------------------------------------------------------

  /**
   * Frühere Namen (z. B. Geburtsname). Optional — nur gepflegt für Personas
   * mit Namensänderung (Schmidt-Persona post-Heirat).
   */
  fruehere_namen?: string[];

  /** Doktorgrad. */
  doktorgrad?: string;

  /** Geburtsort. */
  geburtsort?: string;

  /** Geschlecht (BMG § 3 Abs. 1 Nr. 7). */
  geschlecht?: 'm' | 'w' | 'd' | 'x' | 'unbestimmt';

  /** Religionszugehörigkeit (BMG § 3 Abs. 1 Nr. 11; Art. 9 DSGVO). */
  religion?: 'rk' | 'ev' | 'ohne' | 'andere' | string;

  /** Personalausweis-Nummer (synthetisch, [MOCK]). */
  personalausweis_nr?: { nummer: string; gueltig_bis: string };

  /** Reisepass (synthetisch, [MOCK]). */
  reisepass?: { nummer: string; gueltig_bis: string };

  /** eAT-CAN — nur Drittstaatsangehörige (Mehmet). */
  eat_can?: string;

  /** AZR-Nr. — nur Drittstaatsangehörige. */
  azr_nr?: string;

  /**
   * V1.2 Kontakt-Schicht (BundID-Postfach + Notification-Präferenzen).
   * **Full rename** aus V1 `kontakt: { email?, mobil? }` (Spec § 4.1). V1-Daten
   * werden beim ersten V1.2-Boot durch `migrateKontaktV1ToV11` in den neuen
   * Shape überführt (Spec § 4.1 + `persistence-migrations.ts`).
   *
   * `undefined` = Persona hat noch keinen V1.2-Kontakt-Snapshot — der Mock-
   * Backend liefert in diesem Fall einen Default mit
   * `bundid_postfach.status === 'inaktiv'` und `notification_praeferenzen`-
   * Default `5×'brief'` (Hard-Line § 11.34).
   */
  kontakt?: PersonaKontakt;

  /** Eheschließung — Standesamt-Daten (synthetisch, [MOCK]). */
  eheschliessung?: { datum: string; ort: string; az: string };

  // -------------------------------------------------------------------------
  // V1.1 Stammdaten Renten/KV — additive optionale Felder (Spec § 4.1).
  // Alle Felder optional; V1-Konsumenten bleiben kompatibel.
  // -------------------------------------------------------------------------

  /**
   * V1.1 — Renten-Track-Override.
   *  - 'A' Pflicht in GRV (Default für Angestellte / § 2 SGB VI Pflicht-Selbst.)
   *  - 'B' Versorgungswerk (Kammerberuf)
   *  - 'C' Privat-Vorsorge-only (kein Pflicht-System; Hard-Line § 11.24)
   * `undefined` = aus `beschaeftigung` ableiten (Fallback: 'A').
   */
  renten_track?: RentenTrack;

  /**
   * V1.1 — Renten-Eckdaten aus dem letzten Yellow Letter (§ 109 Abs. 3 SGB VI).
   * `undefined` = noch kein Yellow Letter eingelesen oder Track B/C.
   */
  renten_eckdaten_v1_1?: RentenEckdaten;

  /**
   * V1.1 — KVNR im § 290-konformen 10/10-Format (zusätzlich zu V1
   * `krankenversicherung.versichertennummer`).
   */
  kvnr_v1_1?: KvnrV11;

  /**
   * V1.1 — Familienversicherten-Beziehung. `familienversichert_ueber` zeigt auf
   * den/die Stamm-Versicherte:n; bei `undefined` ist die Person eigen-versichert.
   */
  familienversichert_ueber?: PersonaId | string;
  /** ISO YYYY-MM oder YYYY-MM-DD: Mitversicherung läuft längstens bis. */
  familienversichert_bis?: string;

  /**
   * V1.1 — ePA-Status (eingerichtet seit 15.01.2025, § 342 Abs. 1 S. 2 SGB V).
   * Default `{ eingerichtet: true, widerspruch_gesetzt: false }`.
   */
  epa_status_v1_1?: EpaStatus;

  /** V1.1 — eRezept-Bezugsmodus. Default 'app'. */
  erezept_modus_v1_1?: ERezeptModus;

  /**
   * V1.1 — Pflegegrad (Art-9-relevant; nur sichtbar nach Modal-Consent —
   * Hard-Line § 11.22).
   */
  pflegegrad_v1_1?: Pflegegrad;

  /**
   * V1.1 — Anrechnungszeit Pflege (§ 3 SGB VI). Hard-Line § 11.30: gekoppelt
   * an Pflegegrad-Modal-Toggle (semantische Art-9-Coupling).
   */
  anrechnungszeit_pflege_v1_1?: AnrechnungszeitPflege;

  /** V1.1 — Versorgungswerk (Track B; nur Kammerberufe). */
  versorgungswerk_v1_1?: Versorgungswerk;

  // -------------------------------------------------------------------------
  // V1.3 Stammdaten — Mobilität (Spec § 5.1).
  // -------------------------------------------------------------------------

  /**
   * V1.3 — Mobilität-Block (Lese-Schicht).
   *
   * `undefined` = Persona ohne FE und ohne Halter-Eigenschaft; UI rendert
   * Empty-State.
   *
   * HL-MOB-1 + HL-MOB-10 — alle Felder darin sind Read-Only-Snapshots aus dem
   * Persona-Seed. UI darf keinen Self-Edit-Pfad für FE-Nr, Klassen,
   * Schlüsselzahlen, FIN, Kennzeichen, Halter-Adresse bieten.
   *
   * HL-MOB-11 / VL-4 — `punkte` darf in dieser Struktur NICHT als persistiertes
   * Feld existieren. Punktestand-On-Demand-Result lebt component-local mit
   * TTL ≤ 5 min, niemals in `localStorage`. `mobilitaetSchema.strict()` in
   * `src/lib/mock-backend/schemas.ts` rejected `punkte` als Excess-Key.
   */
  mobilitaet?: Mobilitaet;
}
