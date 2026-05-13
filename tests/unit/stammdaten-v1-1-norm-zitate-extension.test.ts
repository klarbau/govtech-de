/**
 * V1.1 — NormZitatSpan-Lookup-Map Erweiterung (Spec § 6.4).
 *
 * Coverage:
 *  - Lookup-Map enthält alle V1.1-Norm-Zitate aus § 6.4 mit korrekten
 *    `aria-label`-Pronunciations.
 *  - `§ 109 Abs. 3 SGB VI` → „Paragraph 109 Absatz 3 des Sozialgesetzbuches Sechs"
 *  - `§ 342 Abs. 1 S. 2 SGB V` → korrekt.
 *  - `§ 343 SGB V` als separater Eintrag (Hard-Line § 11.26 zwei-Norm-Zitat).
 */
import { describe, expect, test } from 'vitest';
import {
  getNormZitatAriaLabel,
  NORM_ZITAT_ARIA_LABELS,
} from '@/components/posteingang/normZitatLookup';

const V11_NORM_ZITATE: Array<[string, string]> = [
  ['§ 109 SGB VI', 'Paragraph 109 des Sozialgesetzbuches Sechs'],
  ['§ 109 Abs. 1 SGB VI', 'Paragraph 109 Absatz 1 des Sozialgesetzbuches Sechs'],
  ['§ 109 Abs. 3 SGB VI', 'Paragraph 109 Absatz 3 des Sozialgesetzbuches Sechs'],
  ['§ 50 SGB VI', 'Paragraph 50 des Sozialgesetzbuches Sechs'],
  ['§ 7 SGB VI', 'Paragraph 7 des Sozialgesetzbuches Sechs'],
  ['§ 2 SGB VI', 'Paragraph 2 des Sozialgesetzbuches Sechs'],
  [
    '§ 6 Abs. 1 Nr. 1 SGB VI',
    'Paragraph 6 Absatz 1 Nummer 1 des Sozialgesetzbuches Sechs',
  ],
  ['§ 56 SGB VI', 'Paragraph 56 des Sozialgesetzbuches Sechs'],
  ['§ 3 SGB VI', 'Paragraph 3 des Sozialgesetzbuches Sechs'],
  ['§ 128 SGB VI', 'Paragraph 128 des Sozialgesetzbuches Sechs'],
  ['§ 291 SGB V', 'Paragraph 291 des Sozialgesetzbuches Fünf'],
  ['§ 291a SGB V', 'Paragraph 291a des Sozialgesetzbuches Fünf'],
  ['§ 342 SGB V', 'Paragraph 342 des Sozialgesetzbuches Fünf'],
  [
    '§ 342 Abs. 1 S. 2 SGB V',
    'Paragraph 342 Absatz 1 Satz 2 des Sozialgesetzbuches Fünf',
  ],
  ['§ 343 SGB V', 'Paragraph 343 des Sozialgesetzbuches Fünf'],
  ['§ 10 SGB V', 'Paragraph 10 des Sozialgesetzbuches Fünf'],
  ['§ 14 SGB XI', 'Paragraph 14 des Sozialgesetzbuches Elf'],
  ['§ 18c SGB XI', 'Paragraph 18c des Sozialgesetzbuches Elf'],
  ['§ 20 SGB XI', 'Paragraph 20 des Sozialgesetzbuches Elf'],
  ['§ 23 SGB XI', 'Paragraph 23 des Sozialgesetzbuches Elf'],
];

describe('NormZitatSpan-Lookup-Map V1.1 — § 6.4', () => {
  test.each(V11_NORM_ZITATE)(
    'enthält "%s" mit aria-label "%s"',
    (text, expectedAria) => {
      expect(NORM_ZITAT_ARIA_LABELS[text]).toBe(expectedAria);
      expect(getNormZitatAriaLabel(text)).toBe(expectedAria);
    },
  );

  test('§ 343 SGB V ist separater Eintrag (Hard-Line § 11.26)', () => {
    expect(NORM_ZITAT_ARIA_LABELS['§ 343 SGB V']).toBeDefined();
    expect(NORM_ZITAT_ARIA_LABELS['§ 342 Abs. 1 S. 2 SGB V']).toBeDefined();
    // Verschiedene aria-labels.
    expect(NORM_ZITAT_ARIA_LABELS['§ 343 SGB V']).not.toEqual(
      NORM_ZITAT_ARIA_LABELS['§ 342 Abs. 1 S. 2 SGB V'],
    );
  });

  test('Lookup-Map enthält alle 18 V1.1-Pflicht-Einträge laut § 6.4', () => {
    // V1 § 147 SGB VI + § 290 SGB V bestehen schon (Spec-Note "V1 bereits gepflegt"
    // in § 6.4) — wir testen hier nur die V1.1-Erweiterung.
    for (const [text] of V11_NORM_ZITATE) {
      expect(NORM_ZITAT_ARIA_LABELS[text]).toBeDefined();
    }
  });
});
