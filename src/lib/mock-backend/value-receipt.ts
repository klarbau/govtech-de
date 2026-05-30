/**
 * Wertquittungs-Derivation (B1).
 *
 * ALLE Zahlen stammen verbatim aus docs/domain/umzug-konvenienz-und-normen.md
 * Abschnitt 1a — konservativ, immer mit "ca." gerendert. KEINE erfundenen Werte.
 *
 * Domain-1a-Bezugszahlen (Umzug):
 *   - Anna live: "6 Behoerden"               [domain: beteiligte-behoerden]
 *   - klassisch: "ca. 7 Meldungen"           [domain: status-quo-aufwand]
 *   - Aufwand klassisch: "ca. 8 Stunden" = 480 min
 *   - Aufwand Autopilot: "ca. 15 Minuten"
 *   - => Zeitersparnis = 480 - 15 = ca. 465 Min  [domain: zeitersparnis]
 *   - Ihr Aufwand: "ein Satz" = 1
 */
import type { ValueReceipt } from '@/types/value-receipt';
import type { Vorgang } from '@/types/vorgang';

/** Status-quo-Aufwand klassisch in Minuten (ca. 8 Stunden, 1a, gerundet). */
const KLASSISCH_AUFWAND_MIN = 480;

/** Autopilot-Aufwand in Minuten (ca. 15 Minuten, 1a). */
const AUTOPILOT_AUFWAND_MIN = 15;

/** Klassische Meldungen/Antraege (ca. 7, 1a). */
const KLASSISCHE_SCHRITTE = 7;

/**
 * Private / anstaltliche Empfaenger, die NICHT in den "sechs Behoerden"-Count
 * zaehlen (Abschnitt 3) — Arbeitgeber (privat), Beitragsservice (Anstalt),
 * Bundesdruckerei (Unter-Schritt) sowie die Block-B-Privatempfaenger.
 */
const PRIVATE_ODER_ANSTALT = new Set<string>([
  'arbeitgeber-mittelstand-software',
  'beitragsservice-koeln',
  'bundesdruckerei',
  'berliner-sparkasse',
  'allianz-hausrat',
  'vattenfall-strom',
  'telekom',
]);

/**
 * Leitet die Wertquittung aus einem abgeschlossenen/laufenden Umzug-Vorgang ab.
 * `null` bis >= 1 Schritt bestaetigt ist (Card bleibt versteckt, B1 Edge case).
 *
 * `stammdatenBestaetigtAm` ist das ISO-Datum, an dem die Stammdaten-Anschrift
 * zuletzt bestaetigt wurde (Once-Only-Quellzeile). Es wird im
 * `api.getValueReceipt`-Wrapper aus der Persona abgeleitet und hereingereicht
 * (Shape A, spec §5.2). Default `vorgang.angelegt_am`, damit reine Vorgang-
 * Aufrufer (z. B. dashboard/api.ts) ohne Persona-Lookup kompatibel bleiben.
 */
export function computeValueReceipt(
  vorgang: Vorgang,
  stammdatenBestaetigtAm: string = vorgang.angelegt_am,
): ValueReceipt | null {
  if (vorgang.typ !== 'umzug') return null;
  const confirmed = vorgang.schritte.filter((s) => s.status === 'confirmed');
  if (confirmed.length === 0) return null;

  // Distinkte oeffentliche Behoerden des Laufs (fuer den ehrlichen Count, Abschnitt 3).
  const behoerden = new Set(
    confirmed
      .map((s) => s.behoerde_id)
      .filter((id) => !PRIVATE_ODER_ANSTALT.has(id)),
  );

  // Once-Only-Zaehler: Summe der pro Schritt wiederverwendeten Datenkategorien
  // ueber ALLE bestaetigten Schritte — auch private/anstaltliche Empfaenger
  // (Once-Only gilt fuer Datenwiederverwendung, nicht nur fuer Behoerden;
  // anders als behoerden_count, R1/C5). NICHT dedupliziert: jede Uebermittlung
  // eines Feldes an eine Stelle ist ein vermiedenes Ausfuellen.
  let onceOnly = 0;
  for (const step of confirmed) {
    onceOnly += Array.isArray(step.datenkategorien)
      ? step.datenkategorien.length
      : 0;
  }

  return {
    vorgang_id: vorgang.id,
    lebenslage: 'umzug',
    behoerden_count: behoerden.size,
    geschaetzte_zeitersparnis_min: KLASSISCH_AUFWAND_MIN - AUTOPILOT_AUFWAND_MIN,
    klassische_schritte: KLASSISCHE_SCHRITTE,
    ihr_aufwand_schritte: 1,
    once_only_fields: onceOnly,
    stammdaten_bestaetigt_am: stammdatenBestaetigtAm,
  };
}
