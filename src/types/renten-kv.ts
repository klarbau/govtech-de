/**
 * Renten- und Krankenversicherungs-Pflege-Typen (V1.1).
 *
 * Spec: `docs/specs/stammdaten-v1-1-renten-kv.md` § 4.2 (NEW types).
 * Verifier-Locked Hard-Lines § 11.21–§ 11.30 (insb. § 11.22 Pflegegrad-
 * sessionStorage-Pattern, § 11.25 Yellow-Letter-Bridge-Idempotenz, § 11.27
 * fünf Pflicht-Inhalte aus § 109 Abs. 3 SGB VI).
 *
 * Diese Datei ist additiv und ohne Bruch zu V1 — keine bestehenden Typen
 * werden mutiert. `Persona` (V1.1-Felder), `Stammdaten` (zwei neue Top-Level-
 * Container `altersvorsorge` + `krankenversicherung_pflege`) und der Mock-
 * Backend-Event-Bus referenzieren die hier definierten Strukturen.
 */
import type { BehoerdeId } from './behoerde';
import type { PersonaId } from './persona';

/**
 * Renten-Track (§ 4.1 Persona-Erweiterung).
 *
 * - `'A'` = Pflicht in der GRV (Default für Angestellte / § 2-Pflicht-Selbst.).
 * - `'B'` = Versorgungswerk (Kammerberuf; fall-back-only — V1.1-Demo nutzt
 *           keine Track-B-Persona, FieldCard bleibt für V2-Hooks aktiv).
 * - `'C'` = Privat-Vorsorge-only (kein Pflicht-System; demonstrative Lücke,
 *           Hard-Line § 11.24 Mehmet-Default mit Empty-State-Card).
 */
export type RentenTrack = 'A' | 'B' | 'C';

/**
 * Renten-Eckdaten aus dem letzten Yellow Letter (§ 109 Abs. 3 SGB VI).
 * 5 Pflicht-Inhalte (Domain-Doc Correction 3 — research-scout vergaß Nr. 1):
 *  1. Grundlage der Rentenberechnung (Beitragszeit + Entgeltpunkte).
 *  2. EM-Renten-Höhe bei sofortiger voller EM.
 *  3. Regelaltersrenten-Prognose ohne weitere Beiträge.
 *  4. Wirkung künftiger Anpassungen.
 *  5. Beitragsübersicht letzte Periode.
 *
 * Hard-Line § 11.27: `<YellowLetterEchoCard>` rendert Card-Top-3 (1./2./3.),
 * Tooltip-2 (4./5.) und Expandable-5 (alle).
 */
export interface RentenEckdaten {
  /** § 109 Abs. 3 Nr. 1 — Grundlage der Rentenberechnung. */
  grundlage_kurzauszug: {
    /** ISO YYYY-MM. */
    beitragszeit_von: string;
    /** ISO YYYY-MM. */
    beitragszeit_bis: string;
    /** Erworbene Entgeltpunkte (Stand letzter Brief-Stichtag). */
    entgeltpunkte_aktuell: number;
  };
  /** § 109 Abs. 3 Nr. 2 — EM-Renten-Höhe bei sofortiger voller EM in €/Monat. */
  em_rente_prognose_eur_monat: number;
  /** § 109 Abs. 3 Nr. 3 — Regelaltersrenten-Prognose ohne weitere Beiträge in €/Monat. */
  regelalter_prognose_eur_monat: number;
  /** § 109 Abs. 3 Nr. 4 — Wirkung künftiger Anpassungen (Floskel + Beispielwert). */
  anpassungs_wirkung: {
    /** Beispiel-Anpassungs-Prozentsatz (z. B. 2.0 für 2 % p.a.). */
    beispiel_prozent_p_a: number;
    /** Resultierender Plus-Wert in €/Monat bei Renteneintritt. */
    plus_eur_monat: number;
  };
  /** § 109 Abs. 3 Nr. 5 — Beitragsübersicht letzte Periode. */
  beitragsuebersicht: {
    /** ISO YYYY (Kalenderjahr). */
    jahr: string;
    /** Gesamtbeiträge in € (vor Aufteilung). */
    gesamt_eur: number;
    /** Versicherten-Anteil in €. */
    versicherter_anteil_eur: number;
    /** Arbeitgeber-Anteil in €. */
    arbeitgeber_anteil_eur: number;
    /** Optional: öffentliche Kassen (z. B. Kindererziehung). */
    oeffentliche_kassen_eur?: number;
  };
  /** ISO-Datum: Brief-Erlassdatum (= Stichtag der Renteninformation). */
  stichtag: string;
  /** Quelle: aus welchem Letter resolved (Aktenzeichen aus letters.json). */
  quelle_letter_id: string;
  /** ISO-Timestamp: wann diese Eckdaten in Stammdaten abgelegt wurden. */
  abgelegt_am: string;
}

/**
 * Pflegegrad-Einwilligungs-Status (Art-9-Modal-Pattern, V1-Religion-Mechanik).
 *
 * Hard-Line § 11.22: separater sessionStorage-Key
 * `govtech-de:v1:stammdaten:pflegegrad-consent-session`. NIE in localStorage.
 * Reset bei Tab-Close, Browser-Beendigung, Persona-Switch, explizitem Revoke.
 * NICHT-Reset bei F5-Reload innerhalb desselben Tabs.
 */
export interface PflegegradConsent {
  /**
   * Session-scoped Toggle. Pattern erbt von V1-§ 11.4 Religion-Consent.
   */
  consent_session: boolean;
  /** Letzter Anzeige-Zeitstempel (für Activity-Log-Korrelation). */
  last_shown_at?: string;
}

/**
 * Pflegegrad-Stammsatz (Art-9-relevant — Hard-Line § 11.21-Tabelle).
 * Wert-Set 1–5 nach SGB XI; Bewilligung über Pflegekasse (§ 18c SGB XI).
 */
export interface Pflegegrad {
  grad: 1 | 2 | 3 | 4 | 5;
  /** ISO-Datum des Bewilligungs-Bescheids. */
  bewilligt_am: string;
  /** Pflegekasse-ID (= GKV-Pflegekasse oder PKV-Pflichtversicherer). */
  pflegekasse_id: BehoerdeId | string;
  /** Begutachtungs-Stelle: 'md' (GKV) oder 'medicproof' (PKV). */
  begutachtung_stelle: 'md' | 'medicproof';
}

/**
 * Anrechnungszeit Pflege (§ 3 SGB VI).
 *
 * Hard-Line § 11.30: gekoppelt an Pflegegrad-Modal-Toggle — sichtbar nur wenn
 * `pflegegrad_consent.consent_session === true` (semantische Art-9-Coupling).
 */
export interface AnrechnungszeitPflege {
  /** Anzahl Monate Pflege-Anrechnungszeit. */
  monate: number;
  /** Bezugsperson (Familienmitglied, das gepflegt wurde). */
  pflegebeduerftige_person?: string;
  /** Norm-Zitat: '§ 3 SGB VI' für Anrechnungszeit. */
  rechtsgrundlage: string;
}

/**
 * Versorgungswerk (Track B; nur Kammerberufe — Architekt:in, Ärzt:in, …).
 * V1.1-Demo-Personas haben keinen Track-B-Eintrag; Typ existiert für V2-Hooks.
 */
export interface Versorgungswerk {
  name: string;
  /** [MOCK] Mitgliedsnummer. */
  mitgliedsnummer: string;
}

/**
 * KVNR im § 290-konformen 10/10-Format.
 *
 * Visual-Trennung in der V1.1-KV-Sektion: unveränderbarer Teil bleibt
 * lebenslang stabil (1 Großbuchstabe + 8 Ziffern + Prüfziffer = 10 Zeichen),
 * veränderbarer Teil ändert sich bei Kassenwechsel (10 Ziffern).
 */
export interface KvnrV11 {
  /** Unveränderbar: 1 Großbuchstabe + 8 Ziffern + Prüfziffer (10 Zeichen). */
  unveraenderbar: string;
  /** Veränderbar: 10 Ziffern (Kassenzugehörigkeit + Familien-Bezug). */
  veraenderbar: string;
}

/**
 * ePA-Status (eingerichtet seit 15.01.2025, § 342 Abs. 1 S. 2 SGB V).
 * Default `{ eingerichtet: true, widerspruch_gesetzt: false }`.
 *
 * Hard-Line § 11.21 Zeile 5: ePA-Widerspruch (Boolean) ist NICHT Art-9, aber
 * obligatorisch mit Disclaimer-Banner zu rendern (§ 342 Abs. 1 S. 2 i.V.m.
 * § 343 SGB V — Hard-Line § 11.26 zwei-Norm-Zitat).
 */
export interface EpaStatus {
  eingerichtet: boolean;
  widerspruch_gesetzt: boolean;
  /** Optional: ISO-Datum, an dem ePA eingerichtet wurde. */
  eingerichtet_am?: string;
  /** Optional: ISO-Datum, an dem Widerspruch gesetzt wurde. */
  widerspruch_am?: string;
}

/** eRezept-Bezugsmodus (Kommunikations-Präferenz, NICHT Art-9). */
export type ERezeptModus = 'app' | 'egk' | 'papier';

/**
 * Versicherten-Status (§ 10 SGB V Familien-Bezug, § 5 ff. Pflicht-Bezug).
 */
export type KvVersichertenStatus =
  | 'pflicht'
  | 'freiwillig'
  | 'familienversichert'
  | 'privat';

/**
 * Familienversicherter Stamm-Eintrag (Sub-Card pro Familienmitglied).
 * Bei Stamm-Versicherten: Liste der mitversicherten Personen.
 */
export interface FamilienversicherteEintrag {
  persona_id?: PersonaId;
  vorname: string;
  nachname: string;
  /** ISO-Datum YYYY-MM oder YYYY-MM-DD: Mitversicherung läuft längstens bis. */
  familienversichert_bis: string;
  art: 'partner' | 'kind';
}

/**
 * Yellow-Letter-Bridge — Read-Result für `applyYellowLetterBridge`.
 *
 * Hard-Line § 11.25 Idempotenz: Doppel-Aufruf returns `{ applied: false }`,
 * 2. Aufruf erzeugt KEINEN neuen Activity-Log-Eintrag.
 */
export interface YellowLetterBridgeResult {
  /** `false` = no-op (Idempotenz § 11.25); `true` = neue Eckdaten persistiert. */
  applied: boolean;
  /** Gefüllt wenn `applied = true`. */
  eckdaten?: RentenEckdaten;
  /** Activity-Log-Entry-ID; nur bei `applied = true`. */
  activity_log_entry_id?: string;
}
