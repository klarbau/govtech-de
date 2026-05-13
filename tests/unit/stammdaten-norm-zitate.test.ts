/**
 * Norm-Zitate-Lookup-Map-Coverage-Test (Spec § 11.1 Vitest #7).
 *
 * Coverage:
 *   - Lookup-Map enthält ALLE in Stammdaten-Spec § 11.7 aufgelisteten
 *     Stammdaten-Norm-Zitate.
 *   - Aussprache-Strings haben das erwartete Format ("Paragraph N des/der …").
 *
 * Note: Die Lookup-Map lebt in `@/components/posteingang/normZitatLookup`
 * (V1.5.2-followup-NIT-cleanup zentralisiert dort). Der Vitest-Loader
 * verarbeitet die `.tsx`-Datei via Vite-default-Resolver — wir importieren
 * nur den Plain-Object-Export, kein React-Render.
 */
import { describe, expect, test } from 'vitest';
import { NORM_ZITAT_ARIA_LABELS } from '@/components/posteingang/normZitatLookup';

/**
 * Spec stammdaten.md § 11.7 verbatim — sichtbarer Norm-Text → Aussprache.
 * 30+ Einträge (BMG, IDNrG, AO, SGB, BDSG, DSGVO, SBGG, PStG, RBStV, SG, AufenthG).
 */
const SPEC_STAMMDATEN_NORM_ZITATE: Record<string, string> = {
  '§ 3 BMG': 'Paragraph 3 des Bundesmeldegesetzes',
  '§ 3 Abs. 1 Nr. 11 BMG':
    'Paragraph 3 Absatz 1 Nummer 11 des Bundesmeldegesetzes',
  '§ 3 Abs. 1 Nr. 7 BMG':
    'Paragraph 3 Absatz 1 Nummer 7 des Bundesmeldegesetzes',
  '§ 17 BMG': 'Paragraph 17 des Bundesmeldegesetzes',
  '§ 34 BMG': 'Paragraph 34 des Bundesmeldegesetzes',
  '§ 36 BMG': 'Paragraph 36 des Bundesmeldegesetzes',
  '§ 42 BMG': 'Paragraph 42 des Bundesmeldegesetzes',
  '§ 42 Abs. 3 BMG': 'Paragraph 42 Absatz 3 des Bundesmeldegesetzes',
  '§ 50 BMG': 'Paragraph 50 des Bundesmeldegesetzes',
  '§ 50 Abs. 5 BMG': 'Paragraph 50 Absatz 5 des Bundesmeldegesetzes',
  '§ 51 BMG': 'Paragraph 51 des Bundesmeldegesetzes',
  '§ 51 Abs. 1 BMG': 'Paragraph 51 Absatz 1 des Bundesmeldegesetzes',
  '§ 4 IDNrG': 'Paragraph 4 des Identifikationsnummerngesetzes',
  '§ 9 IDNrG': 'Paragraph 9 des Identifikationsnummerngesetzes',
  '§ 139b AO': 'Paragraph 139b der Abgabenordnung',
  '§ 8 OZG': 'Paragraph 8 des Onlinezugangsgesetzes',
  '§ 290 SGB V': 'Paragraph 290 des Sozialgesetzbuches Fünf',
  '§ 147 SGB VI': 'Paragraph 147 des Sozialgesetzbuches Sechs',
  '§ 22 BDSG': 'Paragraph 22 des Bundesdatenschutzgesetzes',
  'Art. 6 Abs. 1 lit. a DSGVO':
    'Artikel 6 Absatz 1 Buchstabe a der Datenschutz-Grundverordnung',
  'Art. 9 Abs. 2 lit. a DSGVO':
    'Artikel 9 Absatz 2 Buchstabe a der Datenschutz-Grundverordnung',
  'Art. 15 DSGVO': 'Artikel 15 der Datenschutz-Grundverordnung',
  'Art. 16 DSGVO': 'Artikel 16 der Datenschutz-Grundverordnung',
  '§ 2 SBGG': 'Paragraph 2 des Selbstbestimmungsgesetzes',
  '§ 4 SBGG': 'Paragraph 4 des Selbstbestimmungsgesetzes',
  '§ 5 SBGG': 'Paragraph 5 des Selbstbestimmungsgesetzes',
  '§ 45b PStG': 'Paragraph 45b des Personenstandsgesetzes',
  '§ 11 Abs. 4 RBStV':
    'Paragraph 11 Absatz 4 des Rundfunkbeitragsstaatsvertrags',
  '§ 58c SG': 'Paragraph 58c des Soldatengesetzes',
  '§ 28a SGB IV': 'Paragraph 28a des Sozialgesetzbuches Vier',
  '§ 18f SGB IV': 'Paragraph 18f des Sozialgesetzbuches Vier',
  '§ 86 AufenthG': 'Paragraph 86 des Aufenthaltsgesetzes',
  '§ 87 AufenthG': 'Paragraph 87 des Aufenthaltsgesetzes',
};

describe('NormZitatLookup-Map — Stammdaten Coverage (Spec § 11.7)', () => {
  test('every Stammdaten-Norm-Zitat aus § 11.7 ist in der Lookup-Map', () => {
    const missing: string[] = [];
    for (const key of Object.keys(SPEC_STAMMDATEN_NORM_ZITATE)) {
      if (!(key in NORM_ZITAT_ARIA_LABELS)) missing.push(key);
    }
    expect(missing).toEqual([]);
  });

  test('aria-labels match the expected pronunciation', () => {
    for (const [key, expectedLabel] of Object.entries(
      SPEC_STAMMDATEN_NORM_ZITATE,
    )) {
      expect(NORM_ZITAT_ARIA_LABELS[key]).toBe(expectedLabel);
    }
  });

  test('lookup hat ≥30 Einträge (Spec § 11.7 nennt ~30 neue)', () => {
    expect(Object.keys(NORM_ZITAT_ARIA_LABELS).length).toBeGreaterThanOrEqual(
      30,
    );
  });
});
