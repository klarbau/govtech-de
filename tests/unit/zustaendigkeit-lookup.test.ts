/**
 * wow-backlog #15 — `finde_zustaendige_stelle` Mapping-Tests.
 *
 * Der Zuständigkeits-Lookup ist die sensible Fläche: er darf NUR Themen aus dem
 * festen Katalog beantworten (keine halluzinierte Zuständigkeit) und muss den
 * Anker (Kindergeld → Familienkasse, NICHT Finanzamt) deterministisch treffen.
 *
 * Coverage:
 *   - Anker: „kindergeld" + der Anker-Satz → Familienkasse (bund), nicht Finanzamt.
 *   - Föderalismus-Kontraste (elterngeld ≠ Familienkasse; steuer_id ≠ Finanzamt).
 *   - „nicht im Katalog" → null (kein Raten); Behörden-Name als thema → null.
 *   - Determinismus + Longest-Match.
 *   - Drift-Guard: jede Katalog-behoerdeId existiert in behoerden.json mit Ebene
 *     bund/land/kommune; jedes Katalog-Thema hat einen de.json-i18n-Key.
 */
import { describe, expect, test } from 'vitest';

import behoerdenFixture from '@/data/behoerden.json';
import de from '@/lib/i18n/locales/de.json';
import type { Behoerde } from '@/types';
import {
  findeZustaendigeStelle,
  ZUSTAENDIGKEIT_KATALOG,
} from '@/lib/ai/zustaendigkeit';

const behoerden = behoerdenFixture as unknown as Behoerde[];
const behoerdeById = new Map(behoerden.map((b) => [b.id, b]));

describe('findeZustaendigeStelle — Anker (Markus Schmidt: Kindergeld ≠ Finanzamt)', () => {
  test('„kindergeld" → Familienkasse (bund), nicht Finanzamt', () => {
    const t = findeZustaendigeStelle('kindergeld');
    expect(t).not.toBeNull();
    expect(t!.behoerdeId).toBe('familienkasse-berlin-brandenburg');
    expect(t!.ebene).toBe('bund');
    expect(t!.nichtZustaendig).toBe('Finanzamt');
    expect(t!.name).toMatch(/Familienkasse/);
  });

  test('der ganze Anker-Satz löst zu Kindergeld → Familienkasse auf (nicht zum Finanzamt)', () => {
    const t = findeZustaendigeStelle(
      'Ich will Kindergeld beantragen, muss ich zum Finanzamt?',
    );
    expect(t).not.toBeNull();
    expect(t!.behoerdeId).toBe('familienkasse-berlin-brandenburg');
    expect(t!.nichtZustaendig).toBe('Finanzamt');
  });

  test('Diakritik-/Case-tolerant: „KINDERGELD" trifft ebenso', () => {
    expect(findeZustaendigeStelle('KINDERGELD')!.behoerdeId).toBe(
      'familienkasse-berlin-brandenburg',
    );
  });
});

describe('findeZustaendigeStelle — Föderalismus-Kontraste', () => {
  test('„elterngeld" → kommunale Elterngeldstelle, nicht Familienkasse', () => {
    const t = findeZustaendigeStelle('elterngeld');
    expect(t!.behoerdeId).toBe('elterngeldstelle-berlin-mitte');
    expect(t!.ebene).toBe('kommune');
    expect(t!.nichtZustaendig).toBe('Familienkasse');
  });

  test('„steuer-id" → Bundeszentralamt für Steuern (bund), nicht Finanzamt', () => {
    const t = findeZustaendigeStelle('steuer-id');
    expect(t!.behoerdeId).toBe('bzst');
    expect(t!.ebene).toBe('bund');
    expect(t!.nichtZustaendig).toBe('Finanzamt');
  });

  test('„einkommensteuer" → Finanzamt (land), ohne Fehlannahme', () => {
    const t = findeZustaendigeStelle('einkommensteuer');
    expect(t!.behoerdeId).toBe('finanzamt-berlin-mitte-tiergarten');
    expect(t!.ebene).toBe('land');
    expect(t!.nichtZustaendig).toBeUndefined();
  });

  test('„aufenthaltstitel verlängern" → Ausländerbehörde (LEA, land), nicht Bürgeramt', () => {
    const t = findeZustaendigeStelle('aufenthaltstitel verlängern');
    expect(t!.behoerdeId).toBe('abh-berlin-lea');
    expect(t!.ebene).toBe('land');
    expect(t!.nichtZustaendig).toBe('Bürgeramt');
  });

  test('„wohngeld" → kommunale Wohngeldstelle', () => {
    expect(findeZustaendigeStelle('wohngeld')!.behoerdeId).toBe(
      'wohngeldstelle-berlin-mitte',
    );
  });
});

describe('findeZustaendigeStelle — kein Raten (nicht im Katalog → null)', () => {
  test('unbekanntes Thema → null', () => {
    expect(findeZustaendigeStelle('gewerbeanmeldung')).toBeNull();
    expect(findeZustaendigeStelle('quantenphysik')).toBeNull();
  });

  test('leerer / whitespace-Input → null', () => {
    expect(findeZustaendigeStelle('')).toBeNull();
    expect(findeZustaendigeStelle('   ')).toBeNull();
  });

  test('ein blanker Behörden-Name (statt Sach-Thema) → null (keine Zuständigkeits-Umkehr)', () => {
    // „finanzamt" ist keine einkommensteuer-Alias-Phrase — der Lookup rät nicht.
    expect(findeZustaendigeStelle('finanzamt')).toBeNull();
  });
});

describe('findeZustaendigeStelle — Determinismus + Longest-Match', () => {
  test('mehrfacher Aufruf liefert identisches Ergebnis', () => {
    const a = findeZustaendigeStelle('kindergeld');
    const b = findeZustaendigeStelle('kindergeld');
    expect(a).toEqual(b);
  });

  test('„kinderzuschlag" trifft eigenes Thema (nicht das kürzere „kind…")', () => {
    const t = findeZustaendigeStelle('kinderzuschlag');
    expect(t!.thema).toBe('kinderzuschlag');
    expect(t!.behoerdeId).toBe('familienkasse-berlin-brandenburg');
  });
});

describe('Katalog-Drift-Guard', () => {
  test('jede behoerdeId existiert in behoerden.json mit Ebene bund/land/kommune', () => {
    for (const eintrag of ZUSTAENDIGKEIT_KATALOG) {
      const b = behoerdeById.get(eintrag.behoerdeId);
      expect(b, `behoerdeId „${eintrag.behoerdeId}" fehlt in behoerden.json`).toBeDefined();
      expect(
        ['bund', 'land', 'kommune'],
        `„${eintrag.behoerdeId}" hat unzulässige Ebene „${b!.kategorie}"`,
      ).toContain(b!.kategorie);
    }
  });

  test('jedes Katalog-Thema hat einen de.json-i18n-Key (Card-Warum-Zeile)', () => {
    const themaKeys = (
      de as unknown as {
        assistent: { zustaendigkeit: { thema: Record<string, string> } };
      }
    ).assistent.zustaendigkeit.thema;
    for (const eintrag of ZUSTAENDIGKEIT_KATALOG) {
      expect(
        themaKeys[eintrag.thema],
        `de.json fehlt assistent.zustaendigkeit.thema.${eintrag.thema}`,
      ).toBeTruthy();
    }
  });

  test('Katalog-Themen sind eindeutig (keine doppelten thema-Keys)', () => {
    const themen = ZUSTAENDIGKEIT_KATALOG.map((e) => e.thema);
    expect(new Set(themen).size).toBe(themen.length);
  });
});
