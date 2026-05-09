/**
 * Eine deutsche Postanschrift.
 * V1: Inland-only (`land: 'DE'`); Auslandsumzug ist Out-of-scope (siehe specs/umzug.md §10).
 */
export interface Adresse {
  strasse: string;
  hausnummer: string;
  /** Optionaler Adresszusatz (z. B. „c/o", „Hinterhaus", „2. OG"). */
  zusatz?: string;
  /** 5-stellige deutsche PLZ; validiert per Regex /^\d{5}$/. */
  plz: string;
  ort: string;
  /** Default 'DE'. Andere Werte sind im V1 nicht zulässig. */
  land?: 'DE' | string;
}
