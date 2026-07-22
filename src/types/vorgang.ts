import type { BehoerdeId } from './behoerde';

/** Einer der vier Block-Typen aus specs/umzug.md §5. */
export type BlockTyp = 'A' | 'B' | 'C' | 'D';

export type AutopilotStepStatus =
  | 'pending'
  | 'in_progress'
  | 'needs_eid'
  | 'pending_eid_confirmation'
  | 'self_assigned'
  | 'confirmed'
  | 'failed';

/**
 * Einzelner Schritt einer Autopilot-Kaskade. Trägt die Block-Zuordnung sowie
 * Block-spezifische Felder (consent_given_at für B, eid_confirmed_at für D).
 */
export interface AutopilotStep {
  id: string;
  behoerde_id: BehoerdeId;
  block: BlockTyp;
  /** Klartext-Aktion ('Anmeldung neuer Wohnort', 'Adressänderung Versichertenkonto'). */
  aktion: string;
  /** Kurzes Norm-Tag wie '§ 36 BMG'. */
  rechtsgrundlage: string;
  status: AutopilotStepStatus;
  started_at?: string;
  completed_at?: string;
  /** ID des erzeugten Bestätigungsschreibens. */
  letter_id?: string;
  /** Erfordert eID-Tap (nur Block D). */
  requires_eid?: boolean;
  /** Erfordert ausdrückliche DSGVO-Einwilligung (nur Block B). */
  requires_consent?: boolean;
  /**
   * Erfordert eine Termin-Systemleistung statt eID/Einwilligung: der Schritt ist
   * ehrlich nicht rein digital vollziehbar (physische Präsenz zwingend, z. B.
   * Führerschein-Umtausch § 24a FeV) → das System bereitet den Antrag vor und
   * vereinbart den Vorsprachetermin. Additiv/optional (wie `zukunft`/`eid_preview`);
   * bricht keine Cascade-Konsumenten. Spec: vorgang-schritt-autopilot.md §2.1.
   */
  requires_termin?: boolean;
  consent_given_at?: string;
  eid_confirmed_at?: string;
  /** Bei status === 'failed' der Fehlergrund. */
  failure_reason?: string;
  /**
   * Delegierte Agent-Stimme ("Wir melden Sie beim Einwohnermeldeamt an").
   * DE-Daten (kein t()-Key) — wird in B3 zur Primärzeile; `aktion` +
   * `rechtsgrundlage` werden zur Trust-Subline. Pass-1 (§1.1).
   */
  agent_label?: string;
  /**
   * Datenkategorien, die in diesem Hop tatsächlich übermittelt werden
   * (Datenminimierung, Art. 5 Abs. 1 lit. c DSGVO — G8/B4). Minimalsatz je
   * Empfänger; speist die Übermittlungs-Log-Quittung (§B4). Pass-1 (§1.1).
   */
  datenkategorien?: string[];
  /**
   * Markiert einen spekulativen 2027-Hop (z. B. antragsloses Kindergeld,
   * Regierungsentwurf BT-Drs. 21/5874) → die UI rendert den [ZUKUNFT 2027]-Chip
   * an dieser Zeile. Additiv/optional; bricht keine bestehenden Umzug-Konsumenten.
   */
  zukunft?: boolean;
  /**
   * Maskierte Konto-Vorschau für einen eID-Bestätigungs-Schritt (Stufe-1
   * Kindergeld: das Auszahlungskonto ist bereits bekannt → der eID-Tap ist eine
   * BESTÄTIGUNG, keine Eingabe). Format `DE.. •••• 4711`. Nur gesetzt, wenn der
   * Config-Step `eidInput.kind === 'confirm'` mit `fieldKey === 'iban'` trägt.
   */
  eid_preview?: string;
}

export type VorgangTyp =
  | 'umzug'
  | 'kindergeburt'
  | 'aufenthaltstitel-verlaengerung'
  | 'eheschliessung'
  | 'gewerbeanmeldung'
  | 'anmeldung'
  // Keeps literal autocomplete + exhaustiveness on the known types while still
  // accepting arbitrary future Vorgang-Typen (e.g. from mock JSON). The
  // `string & {}` idiom prevents the union from collapsing to bare `string`,
  // unlike `| string`. See types/vorgang.ts history.
  | (string & {});

export type VorgangStatus =
  | 'angelegt'
  | 'in_pruefung'
  | 'genehmigt'
  | 'abgelehnt'
  | 'abgeschlossen';

export interface VorgangFrist {
  /** Maschinenlesbarer Frist-Typ ('bmg_17', 'fzv_15', 'bmg_33'). */
  typ: string;
  /** ISO-Datum. */
  datum: string;
}

export interface Vorgang {
  id: string;
  typ: VorgangTyp;
  /** Anzeige-Titel ('Umzug nach Berlin-Wedding', 'Geburt Kind Mia'). */
  titel: string;
  status: VorgangStatus;
  beteiligte_behoerden_ids: BehoerdeId[];
  schritte: AutopilotStep[];
  fristen: VorgangFrist[];
  /** ISO-Timestamp. */
  angelegt_am: string;
  /** ISO-Timestamp. */
  abgeschlossen_am?: string;
  /** ID der Persona, die den Vorgang ausgelöst hat. */
  persona_id: string;
  /** Optionaler vorgangsspezifischer Kontext (frei strukturiert). */
  context?: Record<string, unknown>;
}

export interface VorgangFilter {
  status?: VorgangStatus | VorgangStatus[];
  typ?: VorgangTyp;
}
