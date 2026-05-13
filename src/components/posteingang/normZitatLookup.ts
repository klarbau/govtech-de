/**
 * Norm-Zitat-Lookup-Daten — Plain-TS-Variante (ohne JSX), damit Vitest-Unit-
 * Tests sie laden können, ohne den Rolldown-JSX-Pfad zu triggern.
 *
 * Die JSX-Helfer (`wrapNormZitate`, `<NormZitatSpan>`) leben in
 * `wrapNormZitate.tsx` bzw. `NormZitatSpan.tsx`; sie importieren
 * `NORM_ZITAT_REGEX` / `getNormZitatAriaLabel` von hier, damit es keine
 * Duplizierung gibt.
 *
 * Verbatim-Quelle der Map ist Posteingang V1.5.1 § 11.5 + Stammdaten V1
 * § 11.7. Erweiterungen werden hier eingetragen; die `.tsx`-Datei muss
 * nichts zusätzlich importieren.
 */

export const NORM_ZITAT_ARIA_LABELS: Record<string, string> = {
  // Posteingang V1 / V1.5 / V1.5.1 Norm-Zitate
  '§ 357 Abs. 2 Satz 1 AO': 'Paragraph 357 Absatz 2 Satz 1 der Abgabenordnung',
  '§ 357 Abs. 2 Satz 4 AO': 'Paragraph 357 Absatz 2 Satz 4 der Abgabenordnung',
  '§ 84 Abs. 2 Satz 1 SGG':
    'Paragraph 84 Absatz 2 Satz 1 des Sozialgerichtsgesetzes',
  '§ 84 Abs. 2 Satz 2 SGG':
    'Paragraph 84 Absatz 2 Satz 2 des Sozialgerichtsgesetzes',
  '§ 70 Abs. 1 Satz 1 VwGO':
    'Paragraph 70 Absatz 1 Satz 1 der Verwaltungsgerichtsordnung',
  '§ 361 Abs. 2 Satz 1 AO': 'Paragraph 361 Absatz 2 Satz 1 der Abgabenordnung',
  '§ 361 Abs. 2 Satz 2 AO': 'Paragraph 361 Absatz 2 Satz 2 der Abgabenordnung',
  '§ 361 Abs. 2 AO': 'Paragraph 361 Absatz 2 der Abgabenordnung',
  '§ 240 AO': 'Paragraph 240 der Abgabenordnung',
  '§ 31 EStG': 'Paragraph 31 des Einkommensteuergesetzes',
  '§ 357 AO': 'Paragraph 357 der Abgabenordnung',
  '§ 122a Abs. 4 AO': 'Paragraph 122a Absatz 4 der Abgabenordnung',
  '§ 355 Abs. 1 AO': 'Paragraph 355 Absatz 1 der Abgabenordnung',
  '§ 84 Abs. 1 SGG': 'Paragraph 84 Absatz 1 des Sozialgerichtsgesetzes',
  '§ 80 Abs. 2 Nr. 1 VwGO':
    'Paragraph 80 Absatz 2 Nummer 1 der Verwaltungsgerichtsordnung',
  '§ 86a Abs. 2 Nr. 1 SGG':
    'Paragraph 86a Absatz 2 Nummer 1 des Sozialgerichtsgesetzes',
  '§ 67 Abs. 1 Satz 1 OWiG':
    'Paragraph 67 Absatz 1 Satz 1 des Ordnungswidrigkeitengesetzes',
  '§ 2 RDG': 'Paragraph 2 des Rechtsdienstleistungsgesetzes',

  // Stammdaten V1 — Lookup-Map-Erweiterung (Spec stammdaten.md § 11.7)
  '§ 3 BMG': 'Paragraph 3 des Bundesmeldegesetzes',
  '§ 3 Abs. 1 Nr. 7 BMG':
    'Paragraph 3 Absatz 1 Nummer 7 des Bundesmeldegesetzes',
  '§ 3 Abs. 1 Nr. 11 BMG':
    'Paragraph 3 Absatz 1 Nummer 11 des Bundesmeldegesetzes',
  '§ 3 Abs. 1 Nr. 12 BMG':
    'Paragraph 3 Absatz 1 Nummer 12 des Bundesmeldegesetzes',
  '§ 3 Abs. 1 Nr. 17a BMG':
    'Paragraph 3 Absatz 1 Nummer 17a des Bundesmeldegesetzes',
  '§ 17 BMG': 'Paragraph 17 des Bundesmeldegesetzes',
  '§ 19 BMG': 'Paragraph 19 des Bundesmeldegesetzes',
  '§ 33 BMG': 'Paragraph 33 des Bundesmeldegesetzes',
  '§ 34 BMG': 'Paragraph 34 des Bundesmeldegesetzes',
  '§ 36 BMG': 'Paragraph 36 des Bundesmeldegesetzes',
  '§ 42 BMG': 'Paragraph 42 des Bundesmeldegesetzes',
  '§ 42 Abs. 3 BMG': 'Paragraph 42 Absatz 3 des Bundesmeldegesetzes',
  '§ 50 BMG': 'Paragraph 50 des Bundesmeldegesetzes',
  '§ 50 Abs. 1 BMG': 'Paragraph 50 Absatz 1 des Bundesmeldegesetzes',
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
  '§ 1355 BGB': 'Paragraph 1355 des Bürgerlichen Gesetzbuches',
  // Stammdaten V1 — DSGVO-Artikel (Spec § 11.7).
  'Art. 6 Abs. 1 lit. a DSGVO':
    'Artikel 6 Absatz 1 Buchstabe a der Datenschutz-Grundverordnung',
  'Art. 6 Abs. 1 lit. b DSGVO':
    'Artikel 6 Absatz 1 Buchstabe b der Datenschutz-Grundverordnung',
  'Art. 9 Abs. 2 lit. a DSGVO':
    'Artikel 9 Absatz 2 Buchstabe a der Datenschutz-Grundverordnung',
  'Art. 15 DSGVO': 'Artikel 15 der Datenschutz-Grundverordnung',
  'Art. 16 DSGVO': 'Artikel 16 der Datenschutz-Grundverordnung',

  // Stammdaten V1.1 — Renten-/KV-/Pflege-Norm-Zitate (Spec § 6.4).
  '§ 109 SGB VI': 'Paragraph 109 des Sozialgesetzbuches Sechs',
  '§ 109 Abs. 1 SGB VI':
    'Paragraph 109 Absatz 1 des Sozialgesetzbuches Sechs',
  '§ 109 Abs. 3 SGB VI':
    'Paragraph 109 Absatz 3 des Sozialgesetzbuches Sechs',
  '§ 50 SGB VI': 'Paragraph 50 des Sozialgesetzbuches Sechs',
  '§ 7 SGB VI': 'Paragraph 7 des Sozialgesetzbuches Sechs',
  '§ 2 SGB VI': 'Paragraph 2 des Sozialgesetzbuches Sechs',
  '§ 6 Abs. 1 Nr. 1 SGB VI':
    'Paragraph 6 Absatz 1 Nummer 1 des Sozialgesetzbuches Sechs',
  '§ 56 SGB VI': 'Paragraph 56 des Sozialgesetzbuches Sechs',
  '§ 3 SGB VI': 'Paragraph 3 des Sozialgesetzbuches Sechs',
  '§ 128 SGB VI': 'Paragraph 128 des Sozialgesetzbuches Sechs',
  '§ 291 SGB V': 'Paragraph 291 des Sozialgesetzbuches Fünf',
  '§ 291a SGB V': 'Paragraph 291a des Sozialgesetzbuches Fünf',
  '§ 342 SGB V': 'Paragraph 342 des Sozialgesetzbuches Fünf',
  '§ 342 Abs. 1 S. 2 SGB V':
    'Paragraph 342 Absatz 1 Satz 2 des Sozialgesetzbuches Fünf',
  '§ 343 SGB V': 'Paragraph 343 des Sozialgesetzbuches Fünf',
  '§ 10 SGB V': 'Paragraph 10 des Sozialgesetzbuches Fünf',
  '§ 14 SGB XI': 'Paragraph 14 des Sozialgesetzbuches Elf',
  '§ 18c SGB XI': 'Paragraph 18c des Sozialgesetzbuches Elf',
  '§ 20 SGB XI': 'Paragraph 20 des Sozialgesetzbuches Elf',
  '§ 23 SGB XI': 'Paragraph 23 des Sozialgesetzbuches Elf',

  // Stammdaten V1.2 — Kontakt-Schicht-Norm-Zitate (Spec § 11.39).
  '§ 9 OZG': 'Paragraph 9 des Onlinezugangsgesetzes',
  '§ 9 Abs. 1 OZG': 'Paragraph 9 Absatz 1 des Onlinezugangsgesetzes',
  '§ 9 Abs. 1 S. 2 OZG':
    'Paragraph 9 Absatz 1 Satz 2 des Onlinezugangsgesetzes',
  '§ 9 Abs. 1 S. 3 OZG':
    'Paragraph 9 Absatz 1 Satz 3 des Onlinezugangsgesetzes',
  '§ 2 Abs. 7 OZG': 'Paragraph 2 Absatz 7 des Onlinezugangsgesetzes',
  '§ 41 VwVfG': 'Paragraph 41 des Verwaltungsverfahrensgesetzes',
  '§ 41 Abs. 2 VwVfG':
    'Paragraph 41 Absatz 2 des Verwaltungsverfahrensgesetzes',
  '§ 41 Abs. 2a VwVfG':
    'Paragraph 41 Absatz 2a des Verwaltungsverfahrensgesetzes',
  '§ 36a SGB I': 'Paragraph 36a des Sozialgesetzbuches Eins',
  '§ 35 SGB I': 'Paragraph 35 des Sozialgesetzbuches Eins',
  '§ 67 SGB X': 'Paragraph 67 des Sozialgesetzbuches Zehn',
  '§ 67a SGB X': 'Paragraph 67a des Sozialgesetzbuches Zehn',
  '§ 122a AO': 'Paragraph 122a der Abgabenordnung',
  'Art. 13 DSGVO': 'Artikel 13 der Datenschutz-Grundverordnung',
  'Art. 14 DSGVO': 'Artikel 14 der Datenschutz-Grundverordnung',
};

/**
 * Liefert die `aria-label`-Aussprache zu einem sichtbaren Norm-Zitat.
 * `undefined` → Caller fällt auf den sichtbaren Text zurück.
 */
export function getNormZitatAriaLabel(text: string): string | undefined {
  const normalised = text.trim();
  return NORM_ZITAT_ARIA_LABELS[normalised];
}

/**
 * Regex zur Erkennung von §-Citations in einem Body-String.
 */
export const NORM_ZITAT_REGEX =
  /§\s*\d+[a-z]?(?:\s+Abs\.\s*\d+[a-z]?)?(?:\s+S(?:atz|\.)\s*\d+)?(?:\s+Nr\.\s*\d+[a-z]?)?\s+(?:AO|SGG|VwGO|VwVfG|EStG|OWiG|RDG|BMG|IDNrG|OZG|BDSG|SBGG|PStG|RBStV|SG|BGB|AufenthG|SGB(?:\s+(?:I{1,3}|IV|V|VI|VII|VIII|IX|X|XI|XII|XIV))?)/g;
