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
  | string;

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
}
