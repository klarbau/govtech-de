/**
 * Steuer — vorausgefüllte Steuererklärung aus bekannten Daten.
 * Spec: `docs/specs/redesign-steuer.md` § 6.
 *
 * Read-only Mock-Model: das Backend hat die Erklärung aus bekannten Daten
 * (Lohnsteuerbescheinigung, Kindergeldbescheid, KV-Beitragsbescheinigung,
 * Stammdaten) vorbefüllt. Keine echte Abgabe.
 */
import type { BehoerdeId } from './behoerde';

export type SteuerBereichStatus = 'geprueft' | 'ergaenzen' | 'nicht_vorhanden';

export interface SteuerBereich {
  id: string;
  /** i18n-Key des Bereich-Namens (z. B. "steuer.bereich.einkommen"). */
  name_i18n_key: string;
  /** Betrag in Euro-Cent (Integer, `tabular-nums`-Formatierung im UI). undefined = "—". */
  betrag_cent?: number;
  status: SteuerBereichStatus;
}

export interface SteuerDatenquelle {
  id: string;
  /** i18n-Key ("steuer.quelle.lohnsteuer" …). */
  label_i18n_key: string;
  /** Herkunft: Behörde-ID oder Klartext-Arbeitgeber-Name. */
  herkunft: string;
  /** Optional: Bezug zu einem Dokument in documents.json. */
  document_id?: string;
}

export interface SteuerFrist {
  /** i18n-Key ("steuer.frist.abgabe" / "steuer.frist.einspruch"). */
  label_i18n_key: string;
  /** ISO-Datum. */
  datum: string;
}

export interface SteuerDatenschutz {
  /** Liste verarbeiteter Datenarten (i18n-Keys). */
  verarbeitete_daten_i18n_keys: string[];
  /** Rechtsgrundlage als Norm-String (z. B. "§ 150 AO i.V.m. § 31 EStG"). */
  rechtsgrundlage: string;
  /** Empfänger-Behörde (Finanzamt). */
  empfaenger_behoerde_id: BehoerdeId;
}

export interface SteuerUebersicht {
  steuerjahr: number;
  /** "entwurf" | "eingereicht" — V1 immer "entwurf". */
  status: 'entwurf' | 'eingereicht';
  /** Voraussichtliche Erstattung in Euro-Cent (positiv = Erstattung). */
  voraussichtliche_erstattung_cent: number;
  datenquellen: SteuerDatenquelle[];
  /** 3-Schritt-Fortschritt: index 0–2, welcher Schritt aktiv ist. */
  fortschritt_aktiver_schritt: 0 | 1 | 2;
  bereiche: SteuerBereich[];
  fristen: SteuerFrist[];
  verwendete_nachweise_document_ids: string[];
  datenschutz: SteuerDatenschutz;
  watermark: '[MOCK]';
}
