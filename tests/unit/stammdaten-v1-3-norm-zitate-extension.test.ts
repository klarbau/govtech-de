/**
 * V1.3 — NormZitatSpan-Lookup-Map Erweiterung (Spec § 8 / VL-3).
 *
 * Positive assertions: jeder V1.3-Norm-Zitat-Eintrag muss mit dem korrekten
 * `aria-label` im Lookup stehen.
 *
 * Negative assertions (VL-3 — verifier-mandated):
 *   - `§ 13 FZV` darf NICHT auf „Mitteilungspflicht" auflösen
 *     (FZV-2023 § 13 = „Zulassungsbescheinigung Teil I"; Mitteilungspflicht
 *     lebt in § 15 FZV).
 *   - `§ 32 FZV` darf NICHT auf „Halterdaten-Speicherung" auflösen
 *     (FZV-2023 § 32 ist ZFZR-Halterauskunft; ZFZR-Speicherung lebt in
 *     § 32 StVG i.V.m. § 57 FZV-2023, NICHT in § 32 FZV).
 *   - `§ 33 FZV` ist NICHT in der V1.3-Map (FZV-2023-Renumbering — § 33 FZV
 *     existiert nicht mehr als Übermittlungs-Norm).
 */
import { describe, expect, test } from 'vitest';
import {
  getNormZitatAriaLabel,
  NORM_ZITAT_ARIA_LABELS,
} from '@/components/posteingang/normZitatLookup';

const V13_NORM_ZITATE: Array<[string, string]> = [
  // StVG (FAER / ZFER)
  ['§ 4 StVG', 'Paragraph 4 des Straßenverkehrsgesetzes'],
  ['§ 24 StVG', 'Paragraph 24 des Straßenverkehrsgesetzes'],
  ['§ 28 StVG', 'Paragraph 28 des Straßenverkehrsgesetzes'],
  ['§ 29 StVG', 'Paragraph 29 des Straßenverkehrsgesetzes'],
  ['§ 30 StVG', 'Paragraph 30 des Straßenverkehrsgesetzes'],
  ['§ 30 Abs. 8 StVG', 'Paragraph 30 Absatz 8 des Straßenverkehrsgesetzes'],
  ['§ 30a StVG', 'Paragraph 30a des Straßenverkehrsgesetzes'],
  ['§ 48 StVG', 'Paragraph 48 des Straßenverkehrsgesetzes'],
  ['§ 48 Abs. 2 StVG', 'Paragraph 48 Absatz 2 des Straßenverkehrsgesetzes'],
  ['§ 65 StVG', 'Paragraph 65 des Straßenverkehrsgesetzes'],
  // FeV
  ['§ 47 FeV', 'Paragraph 47 der Fahrerlaubnis-Verordnung'],
  ['§ 73 FeV', 'Paragraph 73 der Fahrerlaubnis-Verordnung'],
  ['§ 6 Abs. 7 FeV', 'Paragraph 6 Absatz 7 der Fahrerlaubnis-Verordnung'],
  ['§ 75 Nr. 4 FeV', 'Paragraph 75 Nummer 4 der Fahrerlaubnis-Verordnung'],
  ['Anlage 8a FeV', 'Anlage 8a der Fahrerlaubnis-Verordnung'],
  ['Anlage 9 FeV', 'Anlage 9 der Fahrerlaubnis-Verordnung'],
  ['Anlage 11 FeV', 'Anlage 11 der Fahrerlaubnis-Verordnung'],
  // FZV (2023)
  ['§ 15 FZV', 'Paragraph 15 der Fahrzeug-Zulassungsverordnung'],
  ['§ 15 Abs. 4 FZV', 'Paragraph 15 Absatz 4 der Fahrzeug-Zulassungsverordnung'],
  ['§ 57 FZV', 'Paragraph 57 der Fahrzeug-Zulassungsverordnung'],
  ['§ 60 FZV', 'Paragraph 60 der Fahrzeug-Zulassungsverordnung'],
  ['§ 75 Nr. 1 FZV', 'Paragraph 75 Nummer 1 der Fahrzeug-Zulassungsverordnung'],
  // EU + ISO
  [
    'RL (EU) 2025/2205',
    'Richtlinie (EU) 2025/2205 zur Modernisierung der EU-Führerschein-Regeln',
  ],
  ['ISO/IEC 18013-5', 'ISO/IEC-Norm 18013-5 für den mobilen Führerschein (mDL)'],
];

describe('NormZitatSpan-Lookup-Map V1.3 — § 8.1 positive assertions (VL-3)', () => {
  test.each(V13_NORM_ZITATE)(
    'enthält "%s" mit aria-label "%s"',
    (text, expectedAria) => {
      expect(NORM_ZITAT_ARIA_LABELS[text]).toBe(expectedAria);
      expect(getNormZitatAriaLabel(text)).toBe(expectedAria);
    },
  );

  test('Lookup-Map enthält alle V1.3-Pflicht-Einträge laut § 8.1', () => {
    for (const [text] of V13_NORM_ZITATE) {
      expect(NORM_ZITAT_ARIA_LABELS[text]).toBeDefined();
    }
  });
});

describe('NormZitatSpan-Lookup-Map V1.3 — § 8.2 negative assertions (VL-3)', () => {
  test('§ 13 FZV resolves not to "Mitteilungspflicht"', () => {
    // FZV-2023 § 13 = „Zulassungsbescheinigung Teil I". Die Mitteilungspflicht
    // sitzt in § 15 FZV. Wenn V1.3 § 13 FZV überhaupt nicht in die Map aufnimmt,
    // ist label === undefined — auch ok (das ist der Default-State).
    const label = NORM_ZITAT_ARIA_LABELS['§ 13 FZV'];
    if (label !== undefined) {
      expect(label).not.toMatch(/Mitteilungspflicht/i);
    }
  });

  test('§ 32 FZV resolves not to "Halterdaten-Speicherung"', () => {
    // FZV-2023 § 32 ist ZFZR-Halterauskunft; ZFZR-Speicherung lebt in
    // § 32 StVG i.V.m. § 57 FZV-2023, NICHT in § 32 FZV.
    const label = NORM_ZITAT_ARIA_LABELS['§ 32 FZV'];
    if (label !== undefined) {
      expect(label).not.toMatch(/Halterdaten/i);
      expect(label).not.toMatch(/Speicherung/i);
    }
  });

  test('§ 33 FZV is not in the V1.3 map (FZV-2023-Renumbering)', () => {
    // § 33 FZV existiert in der FZV-2023 nicht mehr als Übermittlungs-Norm;
    // korrekt ist § 60 FZV-2023. V1.3 nimmt § 33 FZV NICHT auf.
    expect(NORM_ZITAT_ARIA_LABELS['§ 33 FZV']).toBeUndefined();
  });
});
