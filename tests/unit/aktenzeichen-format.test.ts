/**
 * Aktenzeichen-Format-Validierung für alle Seed-Briefe in `src/data/letters.json`.
 *
 * Ziele (Spec posteingang.md §6.2 + §11):
 *  - jedes Aktenzeichen folgt dem Behörden-typischen Format aus der
 *    Domain-Tabelle (Steuernummer, Steuer-IdNr., KVNR, Kindergeldnummer,
 *    Beitragsservice, ABH, Bürgeramt, Standesamt, IHK, BG, …).
 *  - jedes Aktenzeichen + jeder Brief-Body trägt den `[MOCK]`-Watermark.
 *  - jeder Brief in `letters.json` hat einen passenden Eintrag in
 *    `letter-summaries.json` (eindeutig per `letter_id` als Map-Key).
 *
 * Mismatch → roter Test, niemals UI-Warnung (Verifier-Auflage #5).
 */
import { describe, expect, test } from 'vitest';
import lettersFixture from '@/data/letters.json';
import letterSummariesFixture from '@/data/letter-summaries.json';

interface SeedLetter {
  id: string;
  absender_behoerde_id: string;
  archetype?: string;
  aktenzeichen: string;
  aktenzeichen_weitere?: string[];
  body_de: string;
}

const letters = lettersFixture as unknown as SeedLetter[];
const summaries = letterSummariesFixture as Record<string, unknown>;

// ---------------------------------------------------------------------------
// Format-Tabelle aus posteingang.md §11 (Review-Checklist) +
// docs/domain/posteingang.md („Aktenzeichen-Formate (verifiziert)").
// Jeder Eintrag matcht das **primäre** Aktenzeichen einer Behörde + Archetyp.
// `[MOCK] ` ist Pflicht-Präfix. Bewusst eng — wir wollen Drift auf Char-
// Niveau erkennen, nicht „irgendwas Ähnliches".
// ---------------------------------------------------------------------------
const MOCK = String.raw`\[MOCK\] `;

interface FormatRule {
  /** Stabiler Name der Regel — erscheint in Test-Failure-Messages. */
  name: string;
  /** Regex inkl. `[MOCK] `-Präfix. */
  regex: RegExp;
  /** Behörden-IDs, deren primäres Aktenzeichen dieser Regel folgen muss. */
  behoerdeIds: string[];
}

const FORMAT_RULES: FormatRule[] = [
  {
    name: 'Finanzamt — Steuernummer NN/NNN/NNNNN bzw. NNN/NNNN/NNNNN',
    // Bundeslandprefix 2 oder 3 Ziffern; Mittelteil 3 oder 4 Ziffern.
    regex: new RegExp(`^${MOCK}\\d{2,3}/\\d{3,4}/\\d{5}$`),
    behoerdeIds: [
      'finanzamt-koerperschaften-i-berlin',
      'finanzamt-hamburg-eimsbuettel',
      'finanzamt-koeln-mitte',
    ],
  },
  {
    name: 'Krankenkasse / Pflegeversicherung — KVNR [A-Z]\\d{9}',
    regex: new RegExp(`^${MOCK}[A-Z]\\d{9}$`),
    behoerdeIds: ['aok-nordost', 'tk-hamburg', 'aok-rheinland-hamburg'],
  },
  {
    name: 'Familienkasse — Kindergeldnummer NNNFKNNNNNN',
    regex: new RegExp(`^${MOCK}\\d{3}FK\\d{6}$`),
    behoerdeIds: ['familienkasse-berlin-brandenburg'],
  },
  {
    name: 'Beitragsservice — Beitragsnummer NNN NNN NNN (mit Leerzeichen)',
    regex: new RegExp(`^${MOCK}\\d{3} \\d{3} \\d{3}$`),
    behoerdeIds: ['beitragsservice-koeln'],
  },
  {
    name: 'ABH Berlin LEA — ABH-B-YYYY/RB-X-NNNN',
    regex: new RegExp(`^${MOCK}ABH-B-\\d{4}/[IVX]+-[A-Z]-\\d{4}$`),
    behoerdeIds: ['abh-berlin-lea'],
  },
  {
    name: 'Bürgeramt — lokal frei (Bezirk + Vorgangsnummer)',
    // Bezirks-Kürzel + EWA-Marker + Datum + Sequenz; Buchstaben/Schrägstriche/Bindestriche erlaubt.
    regex: new RegExp(`^${MOCK}BA-[A-Z]{2,8}/[A-Z]{2,5}-\\d{4}-\\d{2}-\\d{7}$`),
    behoerdeIds: ['buergeramt-berlin-friedrichshain-kreuzberg', 'buergeramt-berlin-mitte'],
  },
  {
    name: 'Standesamt — <Stadt-Kürzel>-<Buchstabe>-NNNNN/JJJJ',
    regex: new RegExp(`^${MOCK}[A-Z]{1,3}-[A-Z]-\\d{5}/\\d{4}$`),
    behoerdeIds: ['standesamt-hamburg-eimsbuettel', 'standesamt-berlin-mitte'],
  },
  {
    name: 'IHK — IHK-<Stadt>-YYYY/MITGLIED-NNNNN',
    regex: new RegExp(`^${MOCK}IHK-[A-Z]-\\d{4}/MITGLIED-\\d{5}$`),
    behoerdeIds: ['ihk-koeln'],
  },
  {
    name: 'VBG / Berufsgenossenschaft — BG-VBG-YYYY-MITGLIED-NNNNN',
    regex: new RegExp(`^${MOCK}BG-VBG-\\d{4}-MITGLIED-\\d{5}$`),
    behoerdeIds: ['vbg-hamburg'],
  },
  {
    name: 'Bundesdruckerei — BD-PA/YYYY-MM-NNNNNN',
    regex: new RegExp(`^${MOCK}BD-PA/\\d{4}-\\d{2}-\\d{6}$`),
    behoerdeIds: ['bundesdruckerei'],
  },
  {
    name: 'AOK-Rechnungen / Mahnungen — AOK-<Region>-YYYY-NNNNNNNN',
    regex: new RegExp(`^${MOCK}AOK-[A-Z]{2}-\\d{4}-\\d{8}$`),
    behoerdeIds: [], // wird dynamisch zugeordnet (Sonderfall — siehe unten)
  },
];

// Sekundär-Aktenzeichen (`aktenzeichen_weitere`).
// Steuerbescheide tragen die Steuer-IdNr. (11 Ziffern mit Leerzeichen),
// ABH-Briefe tragen die Pass-Nr. (Buchstaben + 7 Stellen).
const SECONDARY_FORMAT_BY_ARCHETYPE: Record<string, RegExp> = {
  steuerbescheid: new RegExp(`^${MOCK}\\d{2} \\d{3} \\d{3} \\d{3}$`),
  'abh-verlaengerung': new RegExp(`^${MOCK}[A-Z0-9]{8,9}$`),
};

// Briefe, die ein primäres Aktenzeichen tragen, das NICHT vom Behörden-ID
// abgeleitet werden kann (AOK Nordost vergibt sowohl KVNR als auch
// Rechnungs-Az „AOK-NO-YYYY-NNNNNNNN"). Wir matchen nach `id`.
const PER_LETTER_PRIMARY_OVERRIDE: Record<string, RegExp> = {
  // letter-aok-rechnung-zuzahlung trägt eine Rechnungsnummer, keine KVNR.
  'letter-aok-rechnung-zuzahlung': new RegExp(`^${MOCK}AOK-[A-Z]{2}-\\d{4}-\\d{8}$`),
};

function findRule(behoerdeId: string): FormatRule | undefined {
  return FORMAT_RULES.find((r) => r.behoerdeIds.includes(behoerdeId));
}

// ---------------------------------------------------------------------------

describe('letters.json: Aktenzeichen-Formate', () => {
  test('mindestens 18 Seed-Briefe sind vorhanden', () => {
    expect(letters.length).toBeGreaterThanOrEqual(18);
  });

  for (const letter of letters) {
    describe(`Brief ${letter.id} (${letter.archetype ?? '?'} / ${letter.absender_behoerde_id})`, () => {
      test('primäres Aktenzeichen folgt Behörden-Format', () => {
        const override = PER_LETTER_PRIMARY_OVERRIDE[letter.id];
        if (override) {
          expect(letter.aktenzeichen).toMatch(override);
          return;
        }
        const rule = findRule(letter.absender_behoerde_id);
        expect(
          rule,
          `Keine Format-Regel für Behörde "${letter.absender_behoerde_id}" — bitte FORMAT_RULES erweitern oder Brief-Behörde prüfen.`,
        ).toBeDefined();
        if (!rule) return;
        expect(
          rule.regex.test(letter.aktenzeichen),
          `${letter.id}: Aktenzeichen "${letter.aktenzeichen}" matcht Regel „${rule.name}" (${rule.regex}) nicht.`,
        ).toBe(true);
      });

      test('jedes weitere Aktenzeichen folgt Archetyp-Sekundärformat', () => {
        const weitere = letter.aktenzeichen_weitere ?? [];
        if (weitere.length === 0) return;
        const archetype = letter.archetype ?? 'sonstiges';
        const rule = SECONDARY_FORMAT_BY_ARCHETYPE[archetype];
        if (!rule) {
          // Kein Sekundärformat erwartet → wir akzeptieren beliebige `[MOCK] `-Strings.
          for (const a of weitere) {
            expect(
              a.startsWith('[MOCK] '),
              `${letter.id}: aktenzeichen_weitere "${a}" muss [MOCK]-Präfix tragen.`,
            ).toBe(true);
          }
          return;
        }
        for (const a of weitere) {
          expect(
            rule.test(a),
            `${letter.id}: aktenzeichen_weitere "${a}" matcht Sekundär-Format für Archetyp "${archetype}" (${rule}) nicht.`,
          ).toBe(true);
        }
      });

      test('[MOCK]-Watermark ist im Aktenzeichen enthalten', () => {
        expect(letter.aktenzeichen).toContain('[MOCK]');
        for (const a of letter.aktenzeichen_weitere ?? []) {
          expect(a).toContain('[MOCK]');
        }
      });

      test('[MOCK]-Watermark ist im body_de enthalten', () => {
        // CLAUDE.md-Regel: jeder Letter.body_de trägt mindestens eine
        // `[MOCK …]`-Zeile (Default-Banner aus seed.ts ist
        // `[MOCK – Verwaltungsdemo, keine echten Daten]`).
        expect(letter.body_de).toContain('[MOCK');
      });

      test('hat eine korrespondierende Pre/Post-Open-Summary', () => {
        const entry = summaries[letter.id];
        expect(
          entry,
          `Keine letter-summaries.json-Entry für "${letter.id}".`,
        ).toBeDefined();
      });
    });
  }
});

describe('letter-summaries.json: keine verwaisten Einträge', () => {
  test('jede Summary hat einen passenden Brief', () => {
    const letterIds = new Set(letters.map((l) => l.id));
    const orphans = Object.keys(summaries).filter((id) => !letterIds.has(id));
    expect(
      orphans,
      `Verwaiste Summaries (kein passender Brief): ${orphans.join(', ')}`,
    ).toEqual([]);
  });
});
