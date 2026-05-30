import type { BehoerdeId } from './behoerde';

/** Typische Dokumenten-Kategorien im Bürger-Vault. Erweiterbar via String-Fallback. */
export type DocumentTyp =
  | 'aufenthaltstitel'
  | 'geburtsurkunde'
  | 'meldebestaetigung'
  | 'steuerbescheid'
  | 'lohnsteuerbescheinigung'
  | 'wohnungsgeberbestaetigung'
  | 'zulassungsbescheinigung_teil_i'
  | 'sozialversicherungsausweis'
  | 'eheurkunde'
  | 'fuehrerschein'
  | 'krankenversicherungskarte'
  | 'kindergeldbescheid'
  | 'rentenauskunft'
  // Redesign-Dokumente — neue Typ-Strings (`redesign-dokumente.md` § 6).
  | 'reisepass'
  | 'mietvertrag'
  | 'versicherungspolice'
  | 'mobilfunkvertrag'
  | string;

/**
 * Vault-Kategorie für die FilterTabs im Dokumente-Screen.
 * Optional auf `Document` — das Backend leitet sie bei Fehlen aus `typ` ab.
 */
export type DocumentKategorie =
  | 'ausweise'
  | 'bescheide'
  | 'familie'
  | 'vertraege';

export interface Document {
  id: string;
  typ: DocumentTyp;
  /** Anzeige-Name für UI ('Aufenthaltstitel — Blue Card EU'). */
  titel: string;
  ausstellende_behoerde_id: BehoerdeId;
  /** ISO-Datum. */
  ausgestellt_am: string;
  /** ISO-Datum; bei unbefristeten Dokumenten weglassen. */
  gueltig_bis?: string;
  /** Synthetischer QR-Inhalt für die Demo-Verifikation. */
  qr_payload: string;
  /** Ob das Dokument als EUDI-Wallet-Credential exportierbar ist. */
  eudi_compatible: boolean;
  /** Konstantes Watermark-Feld; alle Demo-Dokumente führen `[MOCK]`. */
  watermark: '[MOCK]';
  /** Optionaler Bezug zu einem Vorgang (z. B. Wohnungsgeberbestätigung → Umzug). */
  vorgang_id?: string;
  /**
   * Besitzer-Persona (Owner-Filter, §A3). Verhindert, dass Dokumente einer
   * Persona für eine andere sichtbar werden. Optional für Legacy-Seeds; der
   * Owner-Filter behandelt fehlenden Owner als "gehört keiner anderen Persona"
   * NICHT — neue Seeds tragen das Feld immer.
   */
  owner_persona_id?: string;

  // ---------------------------------------------------------------------------
  // Redesign-Dokumente — additive optionale Felder (`redesign-dokumente.md` § 6).
  // Bestehende Seeds bleiben gültig.
  // ---------------------------------------------------------------------------

  /** Vault-Kategorie für FilterTabs. Optional — Backend leitet bei Fehlen aus `typ` ab. */
  kategorie?: DocumentKategorie;
  /** Optionale Dokumentnummer für die Tabellen-Anzeige (z. B. Pass-Nr.). `tabular-nums`. */
  dokument_nr?: string;
}
