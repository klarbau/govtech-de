import type { Adresse } from './adresse';
import type { BehoerdeId } from './behoerde';
import type { PersonaId } from './persona';

/**
 * Eingabe für `api.startUmzug` und `api.previewUmzug`.
 * `wohnungsgeber_bestaetigung_dataurl` ist eine Data-URL (base64), die
 * im Vault als Document persistiert wird; alternativ wird der Demo-Default
 * verwendet, wenn das Feld fehlt.
 */
export interface UmzugInput {
  neue_adresse: Adresse;
  /** Optional: alte Adresse, falls explizit erfasst. Sonst aus Persona-Stammdaten. */
  alte_adresse?: Adresse;
  /** ISO-Datum (YYYY-MM-DD). Einzugsdatum. */
  stichtag: string;
  /** Optional eingebettete Wohnungsgeberbestätigung als Data-URL. */
  wohnungsgeber_bestaetigung_dataurl?: string;
  /** Persona-IDs aller mit-umziehenden Personen (V1: i. d. R. nur die aktive Persona). */
  betroffene_personen: PersonaId[];
  /** Liste der Behörden-IDs, für die DSGVO-Einwilligung erteilt wurde (Block B). */
  consents?: BehoerdeId[];
  /** Auslöser: UI oder AI-Assistant. Default 'ui'. */
  source?: 'ui' | 'assistant';
}

/** Vorab-Beschreibung eines Autopilot-Schritts (vor Persistierung im Vorgang). */
export interface AutopilotStepDraft {
  behoerde_id: BehoerdeId;
  aktion: string;
  rechtsgrundlage: string;
  block: 'A' | 'B' | 'C' | 'D';
  requires_eid?: boolean;
  requires_consent?: boolean;
  /** Persona-Flag, der die Sichtbarkeit dieses Schritts steuert (z. B. 'kfz_halter'). */
  persona_flag?: string;
}

/** Eintrag der Block-C-Selbstchecks (kein Datenkanal vorhanden). */
export interface SelfTask {
  id: string;
  titel: string;
  beschreibung: string;
  /** Externer Deep-Link zum Self-Service-Portal. */
  link?: string;
  /** Aktion 'vorlage_generieren' erzeugt im UI ein synthetisches Anschreiben. */
  generates_template?: boolean;
}

export interface UmzugPreview {
  block_a: AutopilotStepDraft[];
  block_b: AutopilotStepDraft[];
  block_c: SelfTask[];
  block_d: AutopilotStepDraft[];
}
