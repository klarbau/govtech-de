/**
 * Dashboard — abgeleitetes Read-Model über Letter / Vorgang / Termin /
 * Stammdaten / Persona. Spec: `docs/specs/dashboard.md` § 4.2; Re-Skin-
 * Binding: `docs/specs/redesign-dashboard.md`.
 *
 * Alle Typen sind additive Read-Model-Shapes; sie brechen kein existierendes
 * Schema. `getDashboard()` aggregiert sie zur Top-Level-Sicht `DashboardSnapshot`.
 */
import type { BehoerdeId, BehoerdeKategorie } from './behoerde';
import type { PersonaId } from './persona';
import type { LetterFristTyp } from './letter';
import type { VorgangStatus } from './vorgang';
import type { ValueReceipt } from './value-receipt';

/**
 * Eine Zeile im "Automatisch erledigt für Sie"-Feed (§1.4/§B2). Delegierte
 * Agent-Stimme + Behörden-Badge + relative Zeit + Link zum Quell-Letter/Vorgang.
 */
export interface ErledigtFeedItem {
  id: string;
  behoerde_id: BehoerdeId;
  /** Delegierte Agent-Stimme (§B3). DE-Daten. */
  agent_label: string;
  /** ISO → relative Zeit. */
  erledigt_at: string;
  vorgang_id: string;
  letter_id?: string;
}

/** Whitelist von Reasoning-Tokens für AI-Top-3 (Hard-Line § 11.44). */
export type TopActionReasonToken =
  | 'frist_naehe' // „Frist näher als bei anderen offenen Aktionen"
  | 'termin_steht' // „Termin bereits vereinbart"
  | 'folgevorgang' // „Folgevorgang aus {Vorgang-Titel}"
  | 'manuell_priorisiert'; // „Manuell als prioritär markiert"

/** Sort-Mode für `<SortierToggleBar>` / `<HeuteZuTunSortTabs>`. */
export type DashboardSortMode = 'ki' | 'frist' | 'behoerde' | 'vorgang';

/** Eine einzelne Karte in `<HeuteZuTunHero>` / `<HeuteZuTunCard>`. */
export interface TopActionItem {
  id: string;
  /** Lookup-Source: 'letter' | 'vorgang' | 'termin'. */
  source_typ: 'letter' | 'vorgang' | 'termin';
  source_id: string;
  /** Anzeige-Titel ('Aufenthaltstitel verlängern', 'USt-Voranmeldung Q1 2026'). */
  titel: string;
  /** Behörden-ID — für `<BehoerdenBadge>`. */
  behoerde_id: BehoerdeId;
  /** Aktenzeichen oder Vorgangs-Az (Klartext, [MOCK]-Format). */
  aktenzeichen?: string;
  /** Frist-Datum als ISO-YYYY-MM-DD (kann undefined sein bei termin_steht). */
  frist_datum?: string;
  frist_typ?: LetterFristTyp;
  /** Whitelist-Reasoning-Token für die ⓘ-Sub-Zeile. */
  reason_token: TopActionReasonToken;
  /** Optional: für `folgevorgang` der Trigger-Vorgang-Titel. */
  reason_context?: string;
  /** Sortier-Rang: 1 = oben. AI vergibt 1–3; manuelle Sortierung neu sortiert. */
  rank: 1 | 2 | 3;
  /** Klick-Ziel (`router.push`). */
  target_route: string;
}

/** Container für „seit letztem Login"-Block. */
export interface DiffBlock {
  /** ISO-Timestamp des letzten Logins (deviceLocal). */
  last_seen_at?: string;
  /** Anzahl neuer Briefe (status: 'ungelesen', `empfangen_am > last_seen_at`). */
  neue_briefe: number;
  /** Anzahl Fristen, deren Tage-Countdown sich seit `last_seen_at` reduziert hat. */
  fristen_naeher_gerueckt: number;
  /** Anzahl Vorgänge, deren `status === 'abgeschlossen'` zwischen `last_seen_at` und jetzt eintrat. */
  vorgaenge_abgeschlossen: number;
  /** Summe aller Änderungs-Zähler. */
  total_changes: number;
}

/** App-eigenes Activity-Log-Aggregat letzte 30 Tage (für DSC-Tile-Block 1). */
export interface DscAppActivitySummary {
  briefe_geoeffnet: number;
  ki_zusammenfassungen_erstellt: number;
  /** Datenfelder an Anthropic übermittelt (pseudonymisiert). */
  ai_uebermittlungen: number;
  /** aus Stammdaten V1.2 uebermittlungs_log. */
  stammdaten_aktivitaeten: number;
  zeitraum_tage: 30;
}

/** Speculative-2027-Aggregat-Counter (für DSC-Tile-Block 2). */
export interface DscSpeculativeAggregate {
  /** „N Datenabfragen letzte 30 Tage" — Mock-Wert aus seed.ts. */
  datenabfragen_30d: number;
  /** Pflicht-Flag für UI-Speculative-Badge. */
  is_speculative: true;
  /** URL-Stub zum echten BVA-DSC (extern, ↗-Pfeil). */
  external_dsc_url: string;
}

/** Container für Datenschutz-Cockpit-Tile. */
export interface DscSnapshot {
  app_activity: DscAppActivitySummary;
  /** optional — wenn nicht gesetzt, Block 2 wird nicht gerendert. */
  speculative_aggregate?: DscSpeculativeAggregate;
  external_dsc_url: string;
}

/**
 * Mock-Vollmachts-Credential — für Familie-Tile-Aktivierung.
 * Hard-Line § 11.49: Tile **unsichtbar** bis mindestens 1 Vollmacht
 * vorhanden ODER `sorge_gemeinschaftlich: true` bei mind. 1 Kind.
 */
export interface Vollmacht {
  id: string;
  /** Wer wird vertreten — Persona-ID des Bevollmächtigers. */
  bevollmaechtigender_persona_id: PersonaId;
  /** Wer vertritt — Persona-ID des Bevollmächtigten. */
  bevollmaechtigter_persona_id: PersonaId;
  /** Klartext-Bezeichnung ('Ehegatten-Vertretung in Verwaltungsangelegenheiten'). */
  bezeichnung: string;
  /** Norm-Kürzel der Rechtsgrundlage. */
  rechtsgrundlage: string;
  /** Ausgestellt-Datum (Mock). */
  ausgestellt_am: string;
  /** Mock-Speculative-Hinweis: EUDI-Wallet-Vollmacht-Credential ist 2027-Vision. */
  is_speculative_2027: boolean;
  /** Granular-Sicht: welche Vorgangs-Typen abgedeckt sind (default: alle). */
  scope?: Array<
    'umzug' | 'kindergeld' | 'schulanmeldung' | 'steuer' | 'sozial' | string
  >;
}

/** Proaktiver Lebenslagen-Hinweis (Empty-State). */
export interface LebenslagenHinweis {
  id: string;
  /** i18n-Key des Hinweis-Texts (DE source-of-truth). */
  text_i18n_key: string;
  /** Klick-Ziel. */
  target_route: string;
  /** Optional: Trigger-Bedingung (z. B. „<12 Monate vor Ablauf Personalausweis"). */
  trigger_condition_label?: string;
}

/**
 * Strukturierte Kandidaten-Eingabe für die AI-Top-3-Priorisierung
 * (`prioritize_top_actions`, assistant-engineer). Enthält NUR strukturierte
 * Felder — KEINE Brief-Bodies (Anti-Prompt-Injection, Hard-Line § 11.44).
 */
export interface TopActionCandidateInput {
  id: string;
  /** Lookup-Source, damit das Frontend nach dem Ranking die TopActionItem-Felder hydrieren kann. */
  source_typ: 'letter' | 'vorgang' | 'termin';
  source_id: string;
  titel: string;
  behoerde_id: BehoerdeId;
  absender_kategorie: BehoerdeKategorie;
  absender_name: string;
  aktenzeichen?: string;
  /** ISO-YYYY-MM-DD. */
  frist_datum?: string;
  frist_typ?: LetterFristTyp;
  vorgangs_status?: VorgangStatus;
  behoerden_kategorie?: BehoerdeKategorie;
  /** hat Termin? */
  termin_steht: boolean;
  /** Trigger-Vorgang-Titel oder undefined. */
  folgevorgang_von?: string;
  /** vorgeschlagenes Klick-Ziel (vom Mock-Backend gesetzt). */
  target_route: string;
}

/** Ergebnis-Eintrag von `prioritizeTopActions` (AI oder Fallback). */
export interface PrioritizedTopAction {
  id: string;
  rank: 1 | 2 | 3;
  reason_token: TopActionReasonToken;
}

/** Top-Level-Snapshot, den `getDashboard(personaId)` zurückgibt. */
export interface DashboardSnapshot {
  persona_id: PersonaId;
  /** ISO-Timestamp des letzten Logins (deviceLocal). undefined beim Erst-Login. */
  last_login_at?: string;
  /** Begrüßung-Daten (Sie-Form). */
  greeting: {
    vorname: string;
    nachname: string;
    geschlecht_anrede: 'frau' | 'herr' | 'neutral';
  };
  /** Diff seit letztem Login. */
  diff_block: DiffBlock;
  /** AI-priorisierte Top-3 Aktionen. Maximal 3, kann 0 sein (Empty-State). */
  top_actions: TopActionItem[];
  /** Frist-Tile-Inhalt: Top-3 Fristen mit Aktenzeichen + Original-Frist-Floskel. */
  frist_tile: Array<{
    letter_id?: string;
    vorgang_id?: string;
    titel: string;
    aktenzeichen: string;
    behoerde_id: BehoerdeId;
    frist_datum: string;
    frist_typ: LetterFristTyp;
    original_zitat: string;
  }>;
  /** Posteingang-Tile-Inhalt. */
  posteingang_tile: {
    ungelesen: number;
    gesamt: number;
    letzter_brief?: {
      absender_behoerde_id: BehoerdeId;
      eingang_datum: string;
      betreff_pre_open_snippet: string;
    };
  };
  /** Vorgangs-Stand-Tile-Inhalt: Top-3 laufende Vorgänge. */
  vorgangs_stand_tile: Array<{
    vorgang_id: string;
    titel: string;
    status: VorgangStatus;
    beteiligte_anzahl: number;
    letzte_bewegung_iso: string;
    /** 'letzte Bewegung vor 11 Tagen' — als Roh-ISO + UI-formatiert; hier nur ISO-derived label-Hint. */
    letzte_bewegung_label: string;
  }>;
  /** Termin-Tile-Inhalt: nächster Termin oder undefined. */
  termin_tile?: {
    termin_id: string;
    behoerde_id: BehoerdeId;
    datum_iso: string;
    ort_typ: 'praesenz' | 'video' | 'telefon';
    ort_details: string;
    betreff: string;
  };
  /** Datenschutz-Cockpit-Tile-Inhalt. */
  dsc_tile: DscSnapshot;
  /** Stammdaten-Status-Tile-Inhalt: nur eigene Bestätigungs-Historie. */
  stammdaten_tile: {
    /** 'Friedrichstr. 100, 10117 Berlin'. */
    anschrift_aktuell_einzeiler: string;
    /** ISO-Datum oder undefined. */
    letzte_bestaetigung_durch_buerger?: string;
  };
  /** Familie-Tile-Inhalt — undefined wenn Tile nicht angezeigt werden soll. */
  familie_tile?: {
    vollmachten: Vollmacht[];
    sorge_kinder: Array<{
      kind_id: string;
      vorname: string;
      geburtsdatum: string;
      sorge_norm: string;
    }>;
    gemeinsame_vorgaenge: Array<{
      vorgang_id: string;
      titel: string;
      status: VorgangStatus;
    }>;
    /** True, wenn Bürger:in den Vollmacht-Acknowledge-Dialog NIE bestätigt hat. */
    needs_acknowledge: boolean;
  };
  /** Proaktive Lebenslagen-Hinweise (Empty-State). */
  lebenslagen_hinweise: LebenslagenHinweis[];
  /** Achievement-Counter für Empty-State. */
  vorgaenge_abgeschlossen_jahr: number;
  /**
   * Triumph-Banner-Quelle: jüngster abgeschlossener Autopilot-Lauf (§1.4/§B2).
   * Absent vor jedem Lauf → Banner versteckt.
   */
  autopilot_highlight?: {
    vorgang_id: string;
    lebenslage: 'umzug';
    value_receipt: ValueReceipt;
    /** ISO — via §A1-Anker → rendert "gerade eben". */
    abgeschlossen_at: string;
  };
  /** "Automatisch erledigt für Sie"-Feed — chronologisch, neueste zuerst (§B2). */
  erledigt_feed: ErledigtFeedItem[];
}
