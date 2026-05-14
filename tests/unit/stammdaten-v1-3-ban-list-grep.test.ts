/**
 * V1.3 — Ban-List-Grep (Spec § 13 / VL-2 + VL-13 + VL-14; HL-MOB-13 + HL-MOB-14).
 *
 * CI-Lint — verifier-mandated, must not be relaxed:
 *
 *  (a) VL-13 / HL-MOB-13: Phrase `"Halter-Adresse aktualisiert"` (case-
 *      insensitive, with hyphen/underscore/space variants) ist verboten in:
 *        - allen 6 Locale-Files
 *        - `src/data/letters.json` (Mock-Brief-Bodies)
 *        - allen `src/lib/mock-backend/autopilot/*.ts` (Step-Texte +
 *          Brief-Templates)
 *
 *  (b) VL-14 / HL-MOB-14: Phrasen `automatische[r]? Synchron(?:isation|isierung)`
 *      und `synchronisiert automatisch` sind in denselben Files verboten.
 *
 *  (c) VL-2 / HL-MOB-14: Phrase `7-Tage-Frist` / `Frist 7 Tage` ist verboten.
 *      Korrekter Frist-Wortlaut: „unverzüglich (i.d.R. innerhalb einer Woche)".
 *
 * Whitelist-Exception: `stammdaten.disclaimer.kfz_halter_adresse_speculative`
 * (zitiert die verbotene Phrase „automatische Synchronisierung" als das, was
 * es heute *nicht* gibt — speculative-future-Wegweiser).
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, test } from 'vitest';

const REPO_ROOT = join(__dirname, '..', '..');

const LOCALE_FILES = [
  'src/lib/i18n/locales/de.json',
  'src/lib/i18n/locales/en.json',
  'src/lib/i18n/locales/ru.json',
  'src/lib/i18n/locales/uk.json',
  'src/lib/i18n/locales/ar.json',
  'src/lib/i18n/locales/tr.json',
];

const AUTOPILOT_FILES = [
  'src/lib/mock-backend/autopilot/umzug.ts',
];

const LETTERS_FILE = 'src/data/letters.json';

const WHITELIST_KEY = 'kfz_halter_adresse_speculative';

const HALTER_ADRESSE_AKTUALISIERT_RE =
  /Halter[-_ ]?Adresse[-_ ]?aktualisiert/i;
const AUTO_SYNCHRON_RE =
  /automatische[r]?\s+Synchron(?:isation|isierung)/i;
const SYNCHRONISIERT_AUTOMATISCH_RE = /synchronisiert\s+automatisch/i;
const FRIST_7_TAGE_RE = /\b7[- ]Tage[- ]?Frist\b|\bFrist\s+7\s+Tage\b/i;

function readFile(rel: string): string {
  return readFileSync(join(REPO_ROOT, rel), 'utf-8');
}

/**
 * Filter helper for the whitelist-exception. The disclaimer string
 * `kfz_halter_adresse_speculative` deliberately quotes the verboten phrase
 * "automatische Synchronisierung" as part of "es gibt heute keine
 * automatische Synchronisierung". We strip those whitelisted lines BEFORE
 * grep-checking, so only legitimate violations remain.
 */
function stripWhitelistedLines(content: string): string {
  return content
    .split(/\r?\n/)
    .filter((line) => !line.includes(WHITELIST_KEY))
    .join('\n');
}

describe('V1.3 Ban-List-Grep (VL-2 / VL-13 / VL-14)', () => {
  describe('VL-13 / HL-MOB-13 — "Halter-Adresse aktualisiert" verboten', () => {
    test.each(LOCALE_FILES)('locale %s', (file) => {
      const content = stripWhitelistedLines(readFile(file));
      expect(
        content,
        `forbidden phrase "Halter-Adresse aktualisiert" found in ${file}`,
      ).not.toMatch(HALTER_ADRESSE_AKTUALISIERT_RE);
    });

    test('letters.json', () => {
      const content = stripWhitelistedLines(readFile(LETTERS_FILE));
      expect(content).not.toMatch(HALTER_ADRESSE_AKTUALISIERT_RE);
    });

    test.each(AUTOPILOT_FILES)('autopilot %s', (file) => {
      const content = stripWhitelistedLines(readFile(file));
      expect(content).not.toMatch(HALTER_ADRESSE_AKTUALISIERT_RE);
    });
  });

  describe('VL-14 / HL-MOB-14 — "automatische Synchronisierung" verboten (mit Whitelist)', () => {
    test.each(LOCALE_FILES)('locale %s', (file) => {
      const content = stripWhitelistedLines(readFile(file));
      expect(
        content,
        `forbidden phrase "automatische Synchronisierung" found in ${file} (outside whitelist)`,
      ).not.toMatch(AUTO_SYNCHRON_RE);
      expect(content).not.toMatch(SYNCHRONISIERT_AUTOMATISCH_RE);
    });

    test('letters.json', () => {
      const content = stripWhitelistedLines(readFile(LETTERS_FILE));
      expect(content).not.toMatch(AUTO_SYNCHRON_RE);
      expect(content).not.toMatch(SYNCHRONISIERT_AUTOMATISCH_RE);
    });

    test.each(AUTOPILOT_FILES)('autopilot %s', (file) => {
      const content = stripWhitelistedLines(readFile(file));
      expect(content).not.toMatch(AUTO_SYNCHRON_RE);
      expect(content).not.toMatch(SYNCHRONISIERT_AUTOMATISCH_RE);
    });
  });

  describe('VL-2 / HL-MOB-14 — "7-Tage-Frist" verboten', () => {
    test.each(LOCALE_FILES)('locale %s', (file) => {
      const content = readFile(file);
      expect(
        content,
        `forbidden phrase "7-Tage-Frist"/"Frist 7 Tage" found in ${file}`,
      ).not.toMatch(FRIST_7_TAGE_RE);
    });

    test('letters.json', () => {
      const content = readFile(LETTERS_FILE);
      expect(content).not.toMatch(FRIST_7_TAGE_RE);
    });

    test.each(AUTOPILOT_FILES)('autopilot %s', (file) => {
      const content = readFile(file);
      expect(content).not.toMatch(FRIST_7_TAGE_RE);
    });
  });

  describe('Whitelist-Exception correctly quotes the banned phrase', () => {
    test('de.json `kfz_halter_adresse_speculative` contains "automatische Synchronisierung" as quoted meta-text', () => {
      const content = readFile('src/lib/i18n/locales/de.json');
      // Find the kfz_halter_adresse_speculative value line — it MUST contain
      // the banned phrase as the only place in the file.
      const lines = content.split(/\r?\n/);
      const whitelistedLines = lines.filter((l) => l.includes(WHITELIST_KEY));
      expect(whitelistedLines.length).toBeGreaterThan(0);
      const joined = whitelistedLines.join('\n');
      expect(joined).toMatch(AUTO_SYNCHRON_RE);
    });
  });
});
