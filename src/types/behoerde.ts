import type { Adresse } from './adresse';

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
}
