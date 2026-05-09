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
  consent_given_at?: string;
  eid_confirmed_at?: string;
  /** Bei status === 'failed' der Fehlergrund. */
  failure_reason?: string;
}

export type VorgangTyp =
  | 'umzug'
  | 'kindergeburt'
  | 'aufenthaltstitel-verlaengerung'
  | 'eheschliessung'
  | 'gewerbeanmeldung'
  | 'anmeldung'
  | string;

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
