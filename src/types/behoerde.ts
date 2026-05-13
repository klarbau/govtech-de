import type { Adresse } from './adresse';
import type { BundidPostfachAnbindung } from './persona-kontakt';

/**
 * Föderale Ebene bzw. Träger-Typ einer Stelle, an die Adressdaten übermittelt werden.
 * `'privat'` deckt privatrechtliche Empfänger (Banken, Versicherer, EVU, Telekom, …)
 * ab — diese sind streng genommen keine Behörde, werden aber im UI gemeinsam
 * mit Behörden gelistet (Block B / DSGVO-Einwilligung). Siehe specs/umzug.md §6.
 */
export type BehoerdeKategorie =
  | 'bund'
  | 'land'
  | 'kommune'
  | 'sozialversicherung'
  | 'privat';

export type BehoerdeId = string;

export interface Behoerde {
  id: BehoerdeId;
  name_de: string;
  kategorie: BehoerdeKategorie;
  /** Themenbereiche, für die diese Stelle zuständig ist (z. B. 'meldewesen', 'kfz_zulassung'). */
  zustaendige_themen: string[];
  adresse: Adresse;
  online: {
    portal_url?: string;
    /** Unterstützt EUDI-Wallet-basierte Authentifizierung / Credential-Vorlage. */
    supports_eudi: boolean;
  };
  /**
   * V1.2 — BundID-Postfach-Anbindungs-Status der Behörde (Stand Mai 2026, Mock).
   *
   * - `angebunden`: Bürger:in kann Postfach-Notification wählen (Picker enabled).
   * - `nicht_angebunden`: hard-locked auf Brief/Eigenportal (Picker disabled
   *   mit Reason-Tooltip — z. B. ABH/LEA, KFZ-Behörden, GKV-Träger).
   * - `in_pilotierung`: Picker enabled mit „Pilot-Phase"-Disclaimer-Note
   *   (z. B. Berliner Bürgerämter 2026).
   *
   * Werte sind Mock-Annahmen für Demo-Realismus; in der echten 2026er Welt
   * ist die Liste der ~1.600 BundID-Onlinedienste pro Behörde dynamisch und
   * nicht direkt einsehbar (research-scout-Note + verifier-Föderalismus-
   * Disclaimer). Hard-Line § 11.35.
   */
  bundid_postfach_anbindung: BundidPostfachAnbindung;
}
