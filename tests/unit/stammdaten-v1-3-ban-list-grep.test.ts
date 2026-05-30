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
 *  (d) wow-1-inline-cascade-fixes §2 Decision D: `§ 86 AufenthG` / `§ 87 AufenthG`
 *      sind als Rechtsgrundlage für den ABH-eAT-Adress-Schritt VERBOTEN — die
 *      eAT-Adressaktualisierung ist nutzergesteuerter eID-Self-Service nach
 *      `§ 18 PAuswG`, NICHT ein automatischer Melderegister→ABH-Push (§86 = ABH-
 *      Datenerhebung, §87 = Übermittlungen AN die ABH bei Verstößen — beides
 *      Strafverfolgungs-/Erhebungskanäle, nicht Adresspflege; verbatim
 *      docs/domain/umzug-konvenienz-und-normen.md §2 D2). Diese Ban-Liste scannt
 *      die GESAMTE Mock-Backend-Norm-Oberfläche (api.ts + alle autopilot/*.ts) —
 *      sie hätte den §86-Hardcode im Block-D-Log-Hook von api.ts gefangen.
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
  'src/lib/mock-backend/autopilot/posteingang-renten-bridge.ts',
];

/**
 * The full mock-backend norm surface scanned by the AufenthG ban (d).
 * Includes `api.ts` — whose `bestaetigeImpl` Block-D log-hook previously
 * hardcoded `§ 86 AufenthG` for the ABH step (the bug this ban now guards).
 */
const MOCK_BACKEND_NORM_FILES = [
  'src/lib/mock-backend/api.ts',
  ...AUTOPILOT_FILES,
];

const LETTERS_FILE = 'src/data/letters.json';

const WHITELIST_KEY = 'kfz_halter_adresse_speculative';

const HALTER_ADRESSE_AKTUALISIERT_RE =
  /Halter[-_ ]?Adresse[-_ ]?aktualisiert/i;
const AUTO_SYNCHRON_RE =
  /automatische[r]?\s+Synchron(?:isation|isierung)/i;
const SYNCHRONISIERT_AUTOMATISCH_RE = /synchronisiert\s+automatisch/i;
const FRIST_7_TAGE_RE = /\b7[- ]Tage[- ]?Frist\b|\bFrist\s+7\s+Tage\b/i;

/**
 * (d) §86/§87 AufenthG used as a `rechtsgrundlage` VALUE — i.e. an actual code
 * assignment, not the `//`-comment that documents why it was removed. Matches a
 * quoted string literal that contains `§ 86`/`§ 87 AufenthG` (the form a
 * rechtsgrundlage takes in this surface). Comment lines are stripped first
 * (see `stripCommentLines`) so the corrected files' explanatory `// …entfernt`
 * notes do not false-RED.
 */
const AUFENTHG_86_87_LITERAL_RE = /['"`][^'"`]*§\s*8[67]\s+AufenthG[^'"`]*['"`]/;

function readFile(rel: string): string {
  return readFileSync(join(REPO_ROOT, rel), 'utf-8');
}

/**
 * Strip single-line `//` comments before grepping for the AufenthG ban. The
 * corrected `umzug.ts` / `api.ts` keep explanatory comments like
 * `// §86/§87 AufenthG entfernt` — those are documentation of the removal, not
 * a live rechtsgrundlage, and must not trip the ban.
 */
function stripCommentLines(content: string): string {
  return content
    .split(/\r?\n/)
    .filter((line) => !line.trimStart().startsWith('//'))
    .join('\n');
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

  describe('(d) §86/§87 AufenthG als ABH-rechtsgrundlage verboten (wow-1 §2 D) — gesamte Mock-Backend-Norm-Oberfläche', () => {
    test.each(MOCK_BACKEND_NORM_FILES)(
      'mock-backend %s enthält kein `§ 86/§ 87 AufenthG` als rechtsgrundlage-Literal',
      (file) => {
        const content = stripCommentLines(readFile(file));
        expect(
          content,
          `forbidden norm "§ 86/§ 87 AufenthG" used as a rechtsgrundlage literal in ${file} — ` +
            `the ABH eAT address step is user-driven eID self-service (§ 18 PAuswG), ` +
            `not a Melderegister→ABH push`,
        ).not.toMatch(AUFENTHG_86_87_LITERAL_RE);
      },
    );

    test('api.ts Block-D log-hook uses § 18 PAuswG for abh-berlin-lea (the corrected norm)', () => {
      const content = readFile('src/lib/mock-backend/api.ts');
      // Positive guard: the corrected basis must be present in the ABH branch.
      expect(content).toMatch(/'§ 18 PAuswG'/);
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
