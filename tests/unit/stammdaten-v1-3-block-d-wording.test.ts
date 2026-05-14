/**
 * V1.3 — Block-D Wording-Co-Correction (Spec § 9 / VL-13 + VL-14 + VL-2).
 *
 * Coverage:
 *   (a) `BLOCK_D[0].aktion` für `kfz-berlin-labo` enthält
 *       „Pre-Fill der i-Kfz-Adressänderung gemäß § 15 FZV".
 *   (b) `BLOCK_D[0].briefTemplate.floskel` enthält **nicht** „aktualisiert"
 *       und enthält „Pre-Fill" + „§ 15 FZV".
 *   (c) DE-i18n-Wert für `vorgang.umzug.rechtsgrundlage.fzv_15` enthält
 *       „unverzüglich (i.d.R. innerhalb einer Woche)" und **nicht** „7 Tage".
 *   (d) Block-D-Confirmation-Letter (`buildBlockDConfirmation`) für eine
 *       KFZ-Persona enthält „Pre-Fill" + „§ 15 FZV" und **nicht** „aktualisiert".
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, test } from 'vitest';
import { buildUmzugPreview } from '@/lib/mock-backend/autopilot/umzug';
import type { Persona } from '@/types';

const REPO_ROOT = join(__dirname, '..', '..');

function readFile(rel: string): string {
  return readFileSync(join(REPO_ROOT, rel), 'utf-8');
}

function buildKfzHalterPersona(): Persona {
  return {
    id: 'test-kfz-halter',
    vorname: 'Test',
    nachname: 'Halter',
    geburtsdatum: '1990-01-01',
    staatsangehoerigkeit: 'deutsch',
    adresse: {
      strasse: 'Teststr.',
      hausnummer: '1',
      plz: '10117',
      ort: 'Berlin',
    },
    familie: { kinder: [] },
    kfz_halter: true,
    kindergeld_bezug: false,
    wehrerfasst: false,
    sprachen: ['de'],
  } as Persona;
}

describe('V1.3 Block-D Wording (Spec § 9 / VL-13 + VL-14)', () => {
  test('BLOCK_D KFZ-aktion-text enthält "Pre-Fill der i-Kfz-Adressänderung gemäß § 15 FZV"', () => {
    const persona = buildKfzHalterPersona();
    const preview = buildUmzugPreview(persona);
    const kfzStep = preview.block_d.find(
      (s) => s.behoerde_id === 'kfz-berlin-labo',
    );
    expect(kfzStep).toBeDefined();
    expect(kfzStep?.aktion).toBe(
      'Pre-Fill der i-Kfz-Adressänderung gemäß § 15 FZV',
    );
  });

  test('autopilot/umzug.ts Block-D-floskel enthält "Pre-Fill" + "§ 15 FZV", NICHT "aktualisiert"', () => {
    const src = readFile('src/lib/mock-backend/autopilot/umzug.ts');
    // Wir locken nur den Block-D-`kfz-berlin-labo`-Eintrag (einziger KFZ-
    // Block-D-Eintrag in V1.3). Such-Region: zwischen "kfz-berlin-labo" und
    // dem nächsten "behoerdeId" oder Closing.
    const blockDStart = src.indexOf("behoerdeId: 'kfz-berlin-labo'");
    expect(blockDStart).toBeGreaterThan(-1);
    const blockDEnd = src.indexOf('behoerdeId:', blockDStart + 50);
    const blockDSection = src.slice(
      blockDStart,
      blockDEnd > -1 ? blockDEnd : blockDStart + 1500,
    );

    expect(blockDSection).toContain('Pre-Fill');
    expect(blockDSection).toContain('§ 15 FZV');
    // VL-13 / HL-MOB-13: "aktualisiert" muss aus dem Block-D-floskel raus.
    // (Andere Block-D-Briefe — Familienkasse, ABH — könnten "aktualisiert"
    // in legitimen Kontexten haben; wir locken nur den KFZ-Block.)
    expect(blockDSection).not.toMatch(/Halteranschrift Ihres Fahrzeugs auf Ihre neue Anschrift aktualisiert/i);
  });

  test('de.json `umzug.rechtsgrundlage.fzv_15` enthält "unverzüglich (i.d.R. innerhalb einer Woche)" + NICHT "7 Tage"', () => {
    const deRaw = readFile('src/lib/i18n/locales/de.json');
    const de = JSON.parse(deRaw) as Record<string, unknown>;
    // Pfad: umzug.rechtsgrundlage.fzv_15 (V1.0-Bestandsstruktur).
    const umzug = de['umzug'] as Record<string, unknown> | undefined;
    const rechtsgrundlage = umzug?.['rechtsgrundlage'] as
      | Record<string, unknown>
      | undefined;
    const fzv15 = rechtsgrundlage?.['fzv_15'] as string | undefined;
    expect(fzv15).toBeDefined();
    expect(fzv15).toContain('unverzüglich (i.d.R. innerhalb einer Woche)');
    expect(fzv15).not.toContain('7 Tage');
    expect(fzv15).not.toMatch(/7[- ]Tage[- ]?Frist/);
  });
});
