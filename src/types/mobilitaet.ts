/**
 * V1.3 — Mobilität-Block (Lese-Schicht).
 *
 * Spec: `docs/specs/stammdaten-v1-3-mobilitaet.md` § 5.2.
 * Hard-Lines § 11.1–§ 11.14 (verifier-locked, VL-1..VL-14).
 *
 * Aufbau gespiegelt aus den drei autoritativen Registern beim KBA:
 *   - Fahrerlaubnis  ⇄ ZFER (§ 48 Abs. 2 StVG)
 *   - Halter-Daten   ⇄ ZFZR (§ 32 StVG i.V.m. § 57 FZV-2023)
 *   - Punkte         ⇄ FAER (§ 28 StVG) — on-demand, NICHT hier persistiert
 *
 * HL-MOB-11 / VL-4: keine `punkte`-Property in dieser Datenstruktur. Punktestand
 * lebt component-local mit TTL ≤ 5 min in-memory; niemals in localStorage.
 * `mobilitaetSchema.strict()` in `src/lib/mock-backend/schemas.ts` rejected
 * `punkte` als Excess-Key.
 *
 * HL-MOB-1 / HL-MOB-10: alle Felder sind Read-Only-Snapshots aus dem Persona-
 * Seed. Es darf kein UI-Control geben, das diese Werte mutiert (insbesondere
 * kein `<FeNrSpeculativePushModal>` / `<FinSpeculativePushModal>` /
 * `<HalterAdresseSpeculativePushModal>`).
 */
import type { BehoerdeId } from './behoerde';

// ---------------------------------------------------------------------------
// Top-Level
// ---------------------------------------------------------------------------

/**
 * Mobilität-Block einer Persona (V1.3). Optional — `undefined` = Persona ohne
 * Mobilität-Snapshot (UI rendert Empty-State).
 */
export interface Mobilitaet {
  /** Optionale Fahrerlaubnis (undefined = z. B. Lena-Schmidt-Empty-State). */
  fahrerlaubnis?: Fahrerlaubnis;
  /** Liste eigener Halter-Karten (kann leer sein). */
  halter: KfzHalter[];
  /** Halter-Adresse — deduplizierte single-source-of-truth pro Persona. */
  halter_adresse?: HalterAdresse;
}

// ---------------------------------------------------------------------------
// Fahrerlaubnis (ZFER)
// ---------------------------------------------------------------------------

export type PflichtumtauschStatus =
  | 'nicht_relevant'
  | 'frist_aktiv'
  | 'frist_abgelaufen_offen'
  | 'umtausch_erfolgt';

export interface Fahrerlaubnis {
  /**
   * 11-stellige FE-Nr nach FS-VwV: Bundesland-Buchstabe (1) +
   * Behörden-Code (3) + lfd. Nr. (5) + Prüfziffer (1) + Ausfertigung (1).
   * `[MOCK]`-Prefix obligatorisch.
   *
   * HL-MOB-1 / HL-MOB-10: read-only Snapshot aus Seed; kein Self-Edit.
   */
  fe_nr: string;
  /**
   * Bundesland-Buchstabe für Anzeige (Pos. 1 der FE-Nr; redundant zum
   * `fe_nr`-Substring, aber explizit, weil Bundesland-Mapping
   * fehleranfällig ist). FS-VwV-Alphabet: F=Berlin, J=Hamburg, N=NRW, …
   */
  bundesland_kennzeichen: string;
  /** ID der ausstellenden FE-Behörde (kommune; § 73 FeV). */
  fe_behoerde_id: BehoerdeId;
  /**
   * Klassen-Tabelle: für jede erteilte FE-Klasse ein Eintrag mit
   * Erteilungsdatum + Ablaufdatum (bei C/D-Klassen 5-Jahre-Frist;
   * unbefristet bei B/AM/L/T → `gueltig_bis` undefined) + Schlüsselzahlen.
   */
  klassen: FeKlasse[];
  /**
   * Ausstellungsdatum der aktuellen Plastikkarte (relevant für
   * Pflichtumtausch-Stichtag-Berechnung gegen Anlage 8a FeV).
   * ISO YYYY-MM-DD.
   */
  ausstellungsdatum: string;
  /**
   * Pflichtumtausch-Stichtag (Anlage 8a FeV); abgeleitet aus Geburtsjahr +
   * Ausstellungsdatum bei Erstellung des Seeds. `undefined` = nicht-relevant
   * (z. B. Ausstellung ab 2014, EU-konforme 15-Jahre-Karte).
   * ISO YYYY-MM-DD.
   */
  pflichtumtausch_stichtag?: string;
  /** Pflichtumtausch-Status; steuert das Banner-Render in `<PflichtumtauschBanner>`. */
  pflichtumtausch_status: PflichtumtauschStatus;
  /** Bei `pflichtumtausch_status: 'umtausch_erfolgt'`: Datum des Umtauschs. */
  pflichtumtausch_erfolgt_am?: string;
  /** FE-Aktenzeichen bei der FE-Behörde. `[MOCK]`-Prefix obligatorisch. */
  fe_aktenzeichen: string;
}

export interface FeKlasse {
  /** EU-Klassen-Code: A1 / A2 / A / B / BE / C1 / C / CE / D1 / D / DE / T / L / AM. */
  klasse: string;
  /** ISO YYYY-MM-DD. */
  erteilt_am: string;
  /** ISO YYYY-MM-DD; `undefined` = unbefristet. */
  gueltig_bis?: string;
  /** Schlüsselzahlen (Anlage 9 FeV): z. B. '95', '70', '78', '79.06'. */
  schluesselzahlen: string[];
}

// ---------------------------------------------------------------------------
// KFZ-Halter (ZFZR)
// ---------------------------------------------------------------------------

export interface KfzHalter {
  /**
   * Kennzeichen mit Unterscheidungs-Buchstaben + Erkennungs-Buchstaben +
   * Ziffern; FZV Anlage 4. `[MOCK]`-Prefix obligatorisch.
   */
  kennzeichen: string;
  marke: string;
  modell: string;
  /** Baujahr, ISO YYYY. */
  baujahr: string;
  /**
   * FIN nach ISO 3779, 17 Zeichen (WMI 3 + VDS 6 + VIS 8). `[MOCK]`-Prefix
   * obligatorisch.
   *
   * HL-MOB-3 / HL-MOB-7: masked-by-default in UI; volle Anzeige nur on-click.
   * `<FinMaskedSpan>`-Komponente verbindlich.
   */
  fin_voll: string;
  /**
   * Maskierte FIN-Darstellung für Default-UI (z. B. `WAUZZZ•••••••3456` —
   * 4 letzte Stellen sichtbar, Rest durch `•` ersetzt). Vorberechnet im
   * Seed, damit Tests deterministisch sind.
   */
  fin_masked: string;
  /** ID der zuständigen Zulassungsstelle (kommune). */
  zulassungsstelle_id: BehoerdeId;
  /** ISO YYYY-MM-DD; HU-Plakette-Frist. */
  hu_bis: string;
  /** 7-Zeichen alphanumerische eVB-Nummer. `[MOCK]`-Prefix obligatorisch. */
  evb_nummer: string;
  /** Aktenzeichen bei Zulassungsstelle. `[MOCK]`-Prefix obligatorisch. */
  zulassung_aktenzeichen: string;
  /**
   * Mitnutzer-Liste (rein illustrativ; FZV § 6: rechtlich kein Halter).
   * `undefined` oder leer = keine sichtbare Mitnutzer-Pill.
   * VL-12: Schmidt-Halter-Card listet Lena hier.
   */
  mitnutzer?: Array<{ vorname: string; nachname: string }>;
}

// ---------------------------------------------------------------------------
// Halter-Adresse + Umzug-Bridge (VL-13)
// ---------------------------------------------------------------------------

export interface HalterAdresse {
  /**
   * Aktuelle Halter-Adresse (gehalten in ZFZR — § 57 FZV-2023). Im V1.3-Demo
   * deterministisch identisch mit `Persona.adresse`, solange keine Block-D-
   * Bridge aktiv ist.
   */
  strasse: string;
  hausnummer: string;
  plz: string;
  ort: string;
  /**
   * Übergangs-Marker bei Umzug-Bridge (VL-13).
   * `true` = `<UmzugBridgeBadge>` rendert; Activity-Log-Eintrag
   * `kfz_halter_adresse_prefilled_via_umzug` existiert.
   */
  uebergangs_marker_via_umzug: boolean;
  /**
   * ISO-Timestamp, wann der Übergangs-Marker gesetzt wurde (= Umzug-Vorgang-
   * Block-D-Abschluss-Zeitpunkt). `undefined` wenn marker=false.
   */
  uebergangs_marker_seit?: string;
  /**
   * Reference auf den Umzug-Vorgang, der den Marker erzeugt hat.
   * `undefined` wenn marker=false.
   */
  via_umzug_vorgang_id?: string;
}

// ---------------------------------------------------------------------------
// FAER Punktestand on-demand (VL-8 / HL-MOB-11)
// ---------------------------------------------------------------------------

/**
 * Result eines on-demand-FAER-Pulls. Niemals in `localStorage` geschrieben
 * (Hard-Line § 11.11). Liegt component-local in `useState` mit `setTimeout`-
 * TTL = 300 s.
 */
export interface PunktestandPullResult {
  /** Punktestand-Wert (Mock: Anna 0, Schmidt 0, Mehmet 1 per OQ-3-Resolution). */
  punkte: 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
  /** ISO-Timestamp, server-side `now()`. */
  abgerufen_am: string;
  /** Immer 300 (5 min). Hard-Lock per VL-8. */
  ttl_seconds: 300;
  /** „Stand der zugrundeliegenden Eintragungen" (ISO-Datum). */
  stichtag: string;
  /** Geschäftszeichen des Abrufs. `[MOCK]`-Prefix obligatorisch. */
  aktenzeichen: string;
}

// ---------------------------------------------------------------------------
// mDL Mock-Attestation (VL-7 / VL-9)
// ---------------------------------------------------------------------------

/**
 * Mock-Status der mDL-Attestation einer Persona. In V1.3 für alle 3 Personas
 * `status: 'not_issued'`; Preview-Data wird beim Modal-Open aus der
 * Fahrerlaubnis befüllt.
 */
export interface MdlAttestationMock {
  status: 'not_issued' | 'mock_preview_ready';
  preview_data?: MdlAttestationPreviewData;
}

export interface MdlAttestationPreviewData {
  given_name: string;
  family_name: string;
  /** ISO YYYY-MM-DD. */
  birth_date: string;
  driving_privileges: Array<{
    klasse: string;
    erteilt_am: string;
    gueltig_bis?: string;
    schluesselzahlen: string[];
  }>;
  /** Name der ausstellenden FE-Behörde. */
  issuing_authority: string;
  /** ISO-Country-Code; in V1.3 immer 'DE'. */
  issuing_country: 'DE';
  /** Entspricht der FE-Nr. */
  document_number: string;
  /** ISO YYYY-MM-DD. */
  issue_date: string;
  /** ISO YYYY-MM-DD. */
  expiry_date: string;
}

// ---------------------------------------------------------------------------
// Selective-Disclosure (VL-9 — closed enum)
// ---------------------------------------------------------------------------

/**
 * Closed-Enum aus ISO/IEC 18013-5 Annex B (mDL data elements). Diese 14
 * Attribute sind die *einzigen*, die im `<WalletMdlAttestationPreviewModal>`
 * als Selective-Disclosure-Toggle erscheinen dürfen.
 *
 * Forbidden (VL-9, unit-test-enforced via
 * `tests/unit/stammdaten-v1-3-iso-mdl-toggle-enum.test.ts`):
 *   - `punkte` / `punktezahl` (FAER, kein mDL-Attribut)
 *   - `bezirk_der_fe_behoerde` (kein mDL-Attribut)
 *   - `mpu_status` (kein mDL-Attribut)
 *   - `schluesselzahl_95_isolated` (Schlüssel 95 nicht von übrigen Schlüsseln
 *     separat freigebbar — Schlüsselzahlen sind Teil des
 *     `driving_privileges`-Gesamtblocks je Klasse)
 *   - `faer_eintragungen` (kein mDL-Attribut)
 */
export const ISO_18013_5_MDL_TOGGLE_SET = [
  'given_name',
  'family_name',
  'birth_date',
  'age_over_18',
  'age_in_years',
  'driving_privileges',
  'portrait',
  'signature_usual_mark',
  'issue_date',
  'expiry_date',
  'issuing_authority',
  'issuing_country',
  'document_number',
  'un_distinguishing_sign',
] as const;

export type MdlSelectiveDisclosureToggle =
  (typeof ISO_18013_5_MDL_TOGGLE_SET)[number];
