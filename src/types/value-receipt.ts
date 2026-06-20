import type { BehoerdeId } from './behoerde';

/**
 * Wertquittung eines abgeschlossenen Autopilot-Laufs (§1.3 / §B1).
 *
 * Alle Zahlen sind konservative `ca.`-Schätzungen und stammen verbatim aus
 * `docs/domain/umzug-konvenienz-und-normen.md` §1a — KEINE erfundenen Werte.
 * Die UI rendert sie immer mit „ca." (Anti-Overclaim-Regel §1b).
 */
export interface ValueReceipt {
  vorgang_id: string;
  /**
   * Lebenslage des Laufs. Pass-1 war nur `'umzug'`; mit den funktionalen
   * Lebenslagen (Spec `vorgaenge-functional.md` §1.4) auf die 8 Slugs geweitet.
   * `computeValueReceipt` bleibt generisch (zählt `step.datenkategorien` + die
   * distinkten Behörden); die dossierfesten Override-Werte
   * (`behoerdengaenge_gespart`/`minuten_gespart`) kommen aus
   * `LebenslageConfig.value_receipt`.
   */
  lebenslage:
    | 'umzug'
    | 'geburt'
    | 'aufenthalt-verlaengerung'
    | 'kindergeld'
    | 'reisepass'
    | 'bafoeg'
    | 'pflegegrad'
    | 'wohngeld';
  /** Distinkte Behörden, die der Lauf berührt hat. [domain: beteiligte-behoerden] */
  behoerden_count: number;
  /** Konservative gesparte Minuten (Status-quo minus Bürgeraufwand). [domain: zeitersparnis] */
  geschaetzte_zeitersparnis_min: number;
  /** Status-quo-Anzahl Anträge/Behördengänge. [domain: status-quo-aufwand] */
  klassische_schritte: number;
  /** Literal 1 — „ein Satz" Bürgeraufwand. */
  ihr_aufwand_schritte: 1;

  /**
   * Once-Only-Zähler: Summe der pro Schritt wiederverwendeten Datenkategorien
   * über alle bestätigten Schritte (NICHT dedupliziert über Schritte hinweg —
   * jede Übermittlung eines Feldes an eine Stelle ist ein vermiedenes Ausfüllen).
   * Abgeleitet aus `step.datenkategorien`, KEINE erfundene Zahl. Immer mit „ca."
   * gerendert (Anti-Overclaim §1b). [domain: §D7]
   */
  once_only_fields: number;

  /**
   * Quelle der Wiederverwendung: ISO-Datum, an dem die Stammdaten-Anschrift zuletzt
   * bestätigt wurde. Speist die „Quelle: Ihre Stammdaten, einmal bestätigt am …"-Zeile.
   * Ableitung: `verifiziert_am` des Anschrift-Feldes der Persona, sonst Fallback
   * `vorgang.angelegt_am`. [domain: Once-Only / RegMoG]
   */
  stammdaten_bestaetigt_am: string;
}

/**
 * EUDI-Wallet-Export-Vorschau (§1.7 / §C3) — IMMER `[MOCK]`, nie ein echter
 * Export. `mock: true` ist literal-konstant.
 */
export interface EudiExportPreview {
  document_id: string;
  mock: true;
  /** Pretty-printed, `[MOCK]`-markierter VC-förmiger JSON-String. */
  payload_preview: string;
  /** i18n-Key, der den realen EUDI-Wallet-2027-Rollout-Status benennt. */
  disclaimer_key: string;
}

/**
 * Autopilot-Katalog-Eintrag (§1.8 / §A-katalog) — Teaser-Zeile „ist das ein
 * Muster?". Nur Umzug ist `live`; die anderen sind `demnaechst`-Vorschau.
 */
export interface AutopilotKatalogEntry {
  id: 'umzug' | 'kindergeburt' | 'steuererklaerung';
  status: 'live' | 'demnaechst';
  /** i18n-Key. */
  titel_key: string;
  /** i18n-Key. */
  beschreibung_key: string;
  /** Statische Teaser-Liste echter Behörden-IDs aus behoerden.json. */
  behoerden_preview: BehoerdeId[];
  /** Konservative `ca.`-Teaser-Schätzung: Anzahl beteiligter Stellen für diese Lebenslage.
   *  Teaser-Wert (kann von behoerden_preview.length abweichen). UI rendert immer mit „ca.". */
  behoerden_count: number;
  /** Konservative `ca.`-Teaser-Schätzung gesparter Aufwand in Minuten für diese Lebenslage.
   *  Teaser-Wert, KEINE realisierte Quittungszahl (die liegt in ValueReceipt). UI rendert immer mit „ca.". */
  geschaetzte_zeitersparnis_min: number;
}
