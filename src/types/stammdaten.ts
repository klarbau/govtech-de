/**
 * Stammdaten — Single-Source-of-Truth Bürger:innen-Profil (Lese- und Wegweiser-
 * Schicht). Spec: `docs/specs/stammdaten.md` § 4.2; Domain-Lock:
 * `docs/domain/stammdaten.md`.
 *
 * Hard-Lines (verbatim aus § 11 der Spec, hier kommentar-relevant):
 *   - § 11.2  Lese-/Wegweiser-Architektur — keine `setStammdatenField()`-API.
 *   - § 11.3  Religion ist `hidden_by_default` mit Session-Consent.
 *   - § 11.4  Religion-Consent NIE persistiert.
 *   - § 11.6  Activity-Log-Note-Format `<key>:<value>;` (semicolon-getrennt).
 *   - § 11.7  §-numerische Inhalte → `<NormZitatSpan>` im Frontend.
 *   - § 11.8  `[MOCK]`-Watermark auf jedem identifier-artigen Wert.
 *   - § 11.10 Pilot-Phase-Status-Badge → `pilot_phase`-Flag in Stammdaten.
 *   - § 11.18 Wallet minimal-statisch — feste Mock-Attestationen.
 *   - § 11.19 `getStammdaten()` ist Single-Source-of-Truth.
 */
import type { Adresse } from './adresse';
import type { BehoerdeId } from './behoerde';
import type { PersonaId } from './persona';
import type {
  AnrechnungszeitPflege,
  EpaStatus,
  ERezeptModus,
  FamilienversicherteEintrag,
  KvnrV11,
  KvVersichertenStatus,
  Pflegegrad,
  PflegegradConsent,
  RentenEckdaten,
  RentenTrack,
  Versorgungswerk,
} from './renten-kv';

// ---------------------------------------------------------------------------
// Field-Quellen, Korrekturweg, Editability
// ---------------------------------------------------------------------------

/**
 * Quell-Behörde, die ein Stammdaten-Feld autoritativ pflegt. Ein Feld kann
 * mehrere Quellen haben (z. B. Anschrift: Bürgeramt primär; Standesamt für
 * Heirats-Anschrift indirekt).
 */
export interface StammdatenFieldQuelle {
  behoerde_id: BehoerdeId;
  /** Norm-Kürzel der Pflege-Pflicht (z. B. '§ 3 Abs. 1 Nr. 12 BMG'). */
  rechtsgrundlage: string;
}

/**
 * Korrekturweg pro Feld — wird im Frontend als Pointer angezeigt. Verlinkt
 * auf einen Wizard im /vorgaenge-Tab oder beschreibt einen persönlichen
 * Behördenweg (read-only-Felder ohne Self-Edit).
 */
export interface StammdatenKorrekturweg {
  /**
   * Lookup-Slug für Wizard im /vorgaenge-Tab (z. B. 'adresse-ewa', 'sbgg',
   * 'iban-speculative'). undefined = kein Wizard, Pfad ist persönlich/
   * papierhaft.
   */
  wizard_slug?: string;
  /**
   * Verbatim-DE-Text des Pointers (i18n-Key in DE-Locale). Beispiel:
   * 'Bürgeramt-Termin nach § 17 BMG / eWA online'.
   */
  pointer_i18n_key: string;
  /** Norm-Kürzel der Korrekturpflicht. */
  rechtsgrundlage: string;
}

/**
 * Editierbarkeit eines Stammdaten-Felds in der UI. Hard-Line § 11.2: nur
 * `self_edit*`/`hidden_by_default`/`self_edit_mock_pattern` erlauben dem
 * Frontend Mutations-Pfade. `read_only` = ausschließlich Korrekturweg-Pointer.
 *
 * Alias-Name `StammdatenFieldEditability` ist der Spec-Wortlaut; das
 * entsprechende Konzept heißt — analog der Architecture.md-Konvention für
 * andere Felder mit deutschem Domänen-Wort — auch `FeldQuelle`. Wir
 * exportieren beide aliasse (FeldQuelle / Quelle) damit das Frontend
 * frei wählen kann.
 */
export type StammdatenFieldEditability =
  | 'read_only'                  // Hoheitlich gepflegt, kein Self-Edit
  | 'self_edit'                  // Reine App-Setting (Kontakt, Sprache)
  | 'self_edit_speculative_2027' // IBAN-Self-Edit als 2027-Vision
  | 'hidden_by_default'          // Religion (Art. 9 DSGVO)
  | 'self_edit_mock_pattern';    // Sperren-Toggle als Demo-Pattern

/**
 * Sektion-Identifier.
 *
 * V1: 5 fixe Sektionen (Verifier Test #5).
 * V1.1: + 2 additive Sektionen `altersvorsorge` und `krankenversicherung_pflege`,
 *        zwischen `familie` und `dokumente` zu rendern (Spec § 12).
 */
export type StammdatenSektionId =
  | 'identitaet'
  | 'anschrift'
  | 'familie'
  | 'altersvorsorge'
  | 'krankenversicherung_pflege'
  | 'dokumente'
  | 'sperren_einstellungen';

/**
 * Build-Time-konstante Field-Definition für die UI. Werte kommen aus der
 * Persona-Instanz, nicht aus dieser Definition.
 */
export interface StammdatenFieldDef {
  field_id: string;
  sektion: StammdatenSektionId;
  label_i18n_key: string;
  editability: StammdatenFieldEditability;
  quellen: StammdatenFieldQuelle[];
  korrekturweg: StammdatenKorrekturweg;
  /** Art-9-Hinweis-Badge sichtbar (z. B. AZR, Religion). */
  art9_relevant?: boolean;
  /** Speculative-Badge „2027-Vision" auf der Card sichtbar. */
  speculative_2027?: boolean;
}

/** Spec-Alias: `FeldQuelle` ist Spec-Sprech für `StammdatenFieldQuelle`. */
export type FeldQuelle = StammdatenFieldQuelle;

// ---------------------------------------------------------------------------
// Übermittlungs-Log / Activity-Log
// ---------------------------------------------------------------------------

/**
 * Ein einzelner Übermittlungs-/App-Activity-Log-Eintrag.
 *
 * Hard-Line (Disclaimer-2 / § 11.6): jeder Eintrag MUSS klar machen, ob er
 * App-intern (Aufrufe / Selbst-Editierungen) oder behördlich (IDA-
 * Übermittlung zwischen öffentlichen Stellen) ist.
 *
 * `note`-Format: semicolon-getrennte `<key>:<value>`-Paare; reservierte
 * Keys siehe Spec § 4.4. Kein PII-Klartext.
 */
export interface UebermittlungsLogEntry {
  id: string;
  /** ISO-8601 Timestamp. */
  timestamp: string;
  kategorie:
    | 'behoerde_zu_behoerde'   // Mock-IDA-Push (z. B. Bürgeramt → Beitragsservice)
    | 'app_aktivitaet'         // App-internes Log (Religion-Anzeige, Self-Edit, …)
    | 'speculative_2027'       // IBAN-Push-Mock, Wallet-Attestation-Preview, V1.2 Notification-Präferenz-Mutation
    | 'behoerde_zu_buerger';   // V1.2: Notification.gesendet, Posteingang.eingegangen (Hard-Line § 11.40)
  /** Welches Feld / welche Sektion betroffen ist. */
  field_id?: string;
  sektion?: StammdatenSektionId;
  /** Absender-Behörde (Quelle der Übermittlung); bei `app_aktivitaet` undefined. */
  absender_behoerde_id?: BehoerdeId;
  /**
   * Empfänger-Behörde (oder privater Mock-Empfänger bei speculative_2027).
   * Bei `app_aktivitaet` undefined.
   */
  empfaenger_id?: BehoerdeId | string;
  /** i18n-Key des Klartext-Zwecks. Frontend rendert Lokalisat. */
  zweck_i18n_key: string;
  /** Norm-Kürzel als Rechtsgrundlage (z. B. '§ 11 Abs. 4 RBStV'). */
  rechtsgrundlage: string;
  /** Optional: `<key>:<value>;`-Marker; analog Posteingang V1.5.1. */
  note?: string;
}

// ---------------------------------------------------------------------------
// Sperren / Religion-Consent / IBAN-Speculative
// ---------------------------------------------------------------------------

/**
 * Übermittlungssperre nach BMG-Spezialnorm. Verifier Probe #4.
 */
export type StammdatenUebermittlungssperreId =
  | 'religionsgesellschaften_42_3'   // § 42 Abs. 3 BMG
  | 'adressbuch_verlage_50_5'        // § 50 Abs. 5 BMG
  | 'wahlwerbung_50_1'               // § 50 Abs. 1 BMG
  | 'oeffentlich_rechtl_rundfunk_42'; // § 42 BMG indirekt — Demo-Toggle

/**
 * Sperren-Status nach §§ 42 Abs. 3, 50 Abs. 5, 51 BMG. Mock-Pattern: in der
 * Demo via Toggle aktivierbar; im echten System Antrag bei Meldebehörde
 * (Disclaimer-8 sperren_mock_pattern).
 */
export interface StammdatenSperren {
  /** § 51 Abs. 1 BMG; mit Begründung (Min. 30 Zeichen). */
  auskunftssperre_aktiv: boolean;
  auskunftssperre_begruendung?: string;
  /** ISO-Datum (zweijährige Höchstdauer in der Praxis; in Mock optional). */
  auskunftssperre_befristet_bis?: string;
  uebermittlungssperren: StammdatenUebermittlungssperreId[];
}

/**
 * Spec-Alias: Backwards-konsistenter Name aus dem Briefing. Frontend
 * importiert je nach Komponente entweder `StammdatenSperren` oder
 * `SperrenStatus`.
 */
export type SperrenStatus = StammdatenSperren;

/**
 * Religion-Einwilligungs-Status (Art. 9 Abs. 2 lit. a DSGVO; nur Session-
 * scope, NICHT persistiert — Hard-Line § 11.4).
 */
export interface StammdatenReligionConsent {
  /** Session-only Toggle; bei Reload zurückgesetzt. */
  consent_session: boolean;
  /** Letzter Anzeige-Zeitstempel (für Activity-Log-Korrelation). */
  last_shown_at?: string;
}

/** Spec-Alias. */
export type ReligionConsent = StammdatenReligionConsent;

/**
 * IBAN-Self-Edit-Container — als 2027-Vision deklariert (Disclaimer-4).
 * Mock-Push-Targets sind die 3 Empfänger (Familienkasse, ELSTER, GKV).
 */
export interface StammdatenIbanSpeculative {
  /** IBAN, formatiert mit `[MOCK] DE…`-Präfix in Seed. */
  iban?: string;
  /** Pro Empfänger: hat der/die Bürger:in den Mock-Push abgesendet? */
  consented_pushes: {
    familienkasse: boolean;
    elster: boolean;
    gkv: boolean;
  };
}

/** Spec-Alias. */
export type IbanSpeculativeStatus = StammdatenIbanSpeculative;

// ---------------------------------------------------------------------------
// Wallet-Attestation (V1 minimal-statisch — Hard-Line § 11.18)
// ---------------------------------------------------------------------------

/**
 * Mock-Drittanbieter im Wallet-Sub-Tab. V1: 3 fixe Empfänger (Hard-Line
 * § 11.18). Frontend rendert die Cards; Mock-Backend liefert `getWalletAttestations()`.
 */
export interface WalletAttestation {
  /**
   * Synthetic ID (z. B. 'berliner-sparkasse'); kann eine echte BehoerdeId
   * sein (für Hausbank) oder ein eigener Mock-String.
   */
  empfaenger_id: BehoerdeId | string;
  /** Anzeigename (verbatim aus i18n). */
  name_i18n_key: string;
  /** Kategorie: 'bank' / 'hausverwaltung' / 'energieversorger'. */
  kategorie: 'bank' | 'hausverwaltung' | 'energieversorger';
  /** Zweck-Beschreibung (i18n-Key). */
  zweck_i18n_key: string;
}

/**
 * Vorschau-Payload für `getWalletAttestationPreview()`. PID-Felder gemäß
 * EUDI ARF v2.0 PID-Rulebook (8 Pflicht + 4-aus-6 Hilfsattribute).
 */
export interface WalletAttestationPreview {
  /** Empfänger-ID, identisch zur `WalletAttestation.empfaenger_id`. */
  empfaenger_id: BehoerdeId | string;
  /** 8 PID-Pflicht-Attribute (key → label/value). */
  pid_pflicht: Record<string, string>;
  /** 4-aus-6 PID-Hilfs-Attribute (key → label/value). */
  pid_optional: Record<string, string>;
  /** Deterministisches Mock-Attestation-ID (per Persona × Empfänger). */
  mock_attestation_id: string;
  /** `[MOCK]`-Watermark — Hard-Line § 11.8. */
  watermark: '[MOCK]';
}

// ---------------------------------------------------------------------------
// Disclaimer-Meta (Hard-Line § 11.1: Disclaimer-1 verbatim aus i18n)
// ---------------------------------------------------------------------------

/**
 * Top-Level-Disclaimer-Meta, das `getStammdaten()` mitliefert. Frontend rendert
 * ausschließlich verbatim die unter dem `key` in `de.json` hinterlegten Strings.
 */
export interface StammdatenDisclaimerMeta {
  /** Disclaimer-1 (lese_schicht): Hard-Line § 11.1 — verbatim mit SBGG-Präzisierung. */
  lese_schicht_i18n_key: 'stammdaten.disclaimer.lese_schicht';
  /** Disclaimer-2 (audit_log_app_internal): App-Aktivität ≠ behördlicher Audit. */
  audit_log_app_internal_i18n_key: 'stammdaten.disclaimer.audit_log_app_internal';
  /** Disclaimer-3 (eudi_speculative): ARF v2.0-Versionsangabe (Hard-Line § 11.11). */
  eudi_speculative_i18n_key: 'stammdaten.disclaimer.eudi_speculative';
  /** Pilot-Phase-Status — Hard-Line § 11.10. */
  pilot_phase: 'pilot' | 'rollout';
  /** ARF-Versionsangabe für Wallet-Sub-Tab — Hard-Line § 11.11. */
  arf_version: 'v2.0';
}

// ---------------------------------------------------------------------------
// Stammdaten-Snapshot (Top-Level-Read-Model)
// ---------------------------------------------------------------------------

/**
 * Top-Level-Stammdaten-Container — projeziert die Persona auf die UI-Sicht.
 * Wird durch `getStammdaten()` aufgebaut (Hard-Line § 11.19) und kombiniert
 * persona-derived Daten mit UI-spezifischen Sperren-/Einwilligungs-/IBAN-
 * Containern.
 *
 * **Hard-Line § 11.19**: Diese Struktur ist ein READ-MODEL. Persona bleibt
 * Source-of-Truth für Identität/Anschrift/Familie/Beschäftigung; Stammdaten
 * ergänzt die Demo-spezifischen Sperren / Religion-Einwilligung / IBAN-
 * Speculative-Felder und das Aktivitätsprotokoll.
 */
export interface Stammdaten {
  persona_id: PersonaId;
  identitaet: {
    familienname: string;
    fruehere_namen: string[];
    vornamen: string;
    doktorgrad?: string;
    geburtsdatum: string;
    geburtsort?: string;
    geschlecht: 'm' | 'w' | 'd' | 'x' | 'unbestimmt';
    staatsangehoerigkeit: string;
    /** [MOCK] 11-Ziffer-Format aus Persona. */
    steuer_id?: string;
  };
  anschrift_aktuell: Adresse;
  anschriften_historisch: Array<
    Adresse & { gueltig_ab: string; gueltig_bis: string }
  >;
  familie: {
    partner?: {
      vorname: string;
      nachname: string;
      geburtsdatum: string;
      idnr_mock?: string;
    };
    kinder: Array<{
      vorname: string;
      nachname: string;
      geburtsdatum: string;
      idnr_mock?: string;
    }>;
    /** [MOCK] Eheschließungs-Aktenzeichen aus Persona. */
    eheschliessung?: { datum: string; ort: string; az: string };
  };
  dokumente_refs: {
    personalausweis?: { nummer: string; gueltig_bis: string };
    reisepass?: { nummer: string; gueltig_bis: string };
    /** Nur Drittstaatsangehörige (Mehmet). */
    eat_can?: string;
    /** Nur Drittstaatsangehörige. */
    azr_nr?: string;
  };
  kontakt: {
    email?: string;
    mobil?: string;
    /** ISO-639-1. */
    sprachpraeferenz: string;
  };
  beschaeftigung_readonly?: {
    typ: string;
    arbeitgeber?: string;
    drv_versicherungsnummer?: string;
    krankenversicherung_traeger?: string;
    kvnr?: string;
  };
  religion: {
    /** Wert wird nur bei Einwilligung an die UI durchgereicht. */
    wert?: 'rk' | 'ev' | 'ohne' | 'andere' | string;
    consent: StammdatenReligionConsent;
  };
  sperren: StammdatenSperren;
  iban_speculative: StammdatenIbanSpeculative;
  /**
   * Letzte 50 Einträge — UI-Sicht; vollständige Historie liegt in
   * separatem Persistence-Bucket (max 200 mit FIFO; Spec § 5.4).
   */
  uebermittlungs_log: UebermittlungsLogEntry[];
  /** Hard-Line § 11.1 + § 11.10 + § 11.11. */
  disclaimer_meta: StammdatenDisclaimerMeta;

  // -------------------------------------------------------------------------
  // V1.1 — Renten/KV-Top-Level-Container (Spec § 4.3).
  // Beide Felder optional, damit V1-Konsumenten nicht brechen. Für V1.1-
  // Personas füllt `getStammdaten()` sie deterministisch aus Persona-Daten +
  // Buckets (siehe `getAltersvorsorge` / `getKrankenversicherungPflege` in
  // `src/lib/mock-backend/api.ts`).
  // -------------------------------------------------------------------------

  /** V1.1 — Altersvorsorge-Sektion. */
  altersvorsorge?: {
    track: RentenTrack;
    /** Bei Track A: zuständiger DRV-Träger. */
    drv_traeger_id?: BehoerdeId;
    /** Bei Track B: Versorgungswerk-Stammsatz. */
    versorgungswerk?: Versorgungswerk;
    /** Bei Track A nach Yellow-Letter-Bridge: 5 Pflicht-Inhalte. */
    eckdaten?: RentenEckdaten;
    /** Quell-Letter aus Posteingang-Bridge (für Stamp-Anzeige). */
    yellow_letter_id?: string;
  };

  /** V1.1 — Krankenversicherung & Pflege-Sektion. */
  krankenversicherung_pflege?: {
    krankenkasse: { id: BehoerdeId | string; name: string };
    kvnr_v1_1?: KvnrV11;
    versicherten_status: KvVersichertenStatus;
    /** Bei Familienversicherten: Stamm-Versicherte:r. */
    familienversichert_ueber?: PersonaId | string;
    /** ISO YYYY-MM oder YYYY-MM-DD. */
    familienversichert_bis?: string;
    /** Familienversicherte Personen (nur bei Stamm-Versicherten). */
    familienversicherte_personen: FamilienversicherteEintrag[];
    epa_status: EpaStatus;
    erezept_modus: ERezeptModus;
    pflegekasse: { id: BehoerdeId | string; name: string };
    /**
     * Existenz-Marker (Art-9-Gating-Fix, REVISE-Wave 2026-05-10): `true`, wenn
     * die Persona einen Pflegegrad-Seed besitzt — UNABHÄNGIG von Consent.
     * Frontend nutzt dieses Flag, um den `<RevealConsentButton>` (Modal-
     * Trigger) anzuzeigen; ohne den Flag wäre der Modal-Pfad für jede Persona
     * ohne pre-existing Session-Consent dead-ended (a11y-tester / code-
     * reviewer-Befund). Wert ändert sich nur bei Persona-Switch oder Seed-
     * Re-Import.
     */
    pflegegrad_exists: boolean;
    /**
     * Pflegegrad-Stammsatz — Art-9-relevant; ausschließlich gefüllt, wenn
     * `pflegegrad_exists === true` UND `pflegegrad_consent.consent_session
     * === true`. Sonst `undefined` (Hard-Line § 11.22 Gating).
     */
    pflegegrad?: Pflegegrad;
    /** Pflegegrad-Einwilligungs-Status (sessionStorage; Hard-Line § 11.22). */
    pflegegrad_consent: PflegegradConsent;
    /**
     * Anrechnungszeit Pflege (§ 3 SGB VI). Hard-Line § 11.30: gekoppelt an
     * `pflegegrad_consent.consent_session === true`.
     */
    anrechnungszeit_pflege?: AnrechnungszeitPflege;
  };
}

/** Spec-Alias: `StammdatenSnapshot` ist Briefing-Sprech für `Stammdaten`. */
export type StammdatenSnapshot = Stammdaten;

/** Spec-Alias für die Sektions-Variante (für Code, das Sektionen einzeln liest). */
export type StammdatenSection = StammdatenSektionId;
