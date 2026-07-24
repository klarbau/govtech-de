/**
 * `deriveErklaererSlots` — brief-spezifische Fakten-Slots des KI-Erklärers
 * („Einfach erklärt"). Statt starrer Zahlungs-Fragen leitet der Helfer je Brief
 * Betrag-/Frist-/Handeln-Slots ab; die Frist-Frage wird über den Fristtyp
 * typisiert (Rechts-Ehrlichkeit — Einspruch/Nachweis nie unter der Zahlungs-Frage).
 */
import { describe, expect, test } from 'vitest';

import { deriveErklaererSlots } from '@/components/posteingang/erklaerer-slots';
import type { Letter, LetterFrist } from '@/types';

function makeLetter(overrides: Partial<Letter>): Letter {
  return {
    id: 'letter-test',
    absender_behoerde_id: 'finanzamt-hamburg',
    empfaenger_persona_id: 'anna-petrov',
    aktenzeichen: '[MOCK] TEST-1',
    betreff: 'Testbetreff',
    body_de: 'Sehr geehrte Frau … [MOCK]',
    status: 'ungelesen',
    empfangen_am: '2026-07-01T10:00:00.000Z',
    ...overrides,
  };
}

function frist(typ: LetterFrist['typ'], datum: string): LetterFrist {
  return { typ, datum, original_zitat: `Frist bis ${datum}`, citation_match: true };
}

describe('deriveErklaererSlots', () => {
  test('Zahlungsbrief: Betrag (nachzahlung) + Frist (zahlung)', () => {
    const slots = deriveErklaererSlots(
      makeLetter({
        betrag_cent: 12345,
        betrag_richtung: 'nachzahlung',
        fristen: [frist('zahlung', '2026-08-15')],
      }),
    );
    expect(slots).toEqual([
      { kind: 'betrag', richtung: 'nachzahlung', betrag_cent: 12345 },
      { kind: 'frist', typ: 'zahlung', datum: '2026-08-15' },
    ]);
  });

  test('Erstattungsbescheid mit Einspruchsfrist → Frist-Slot trägt typ „einspruch"', () => {
    const slots = deriveErklaererSlots(
      makeLetter({
        betreff: 'Bescheid für 2024 über Einkommensteuer',
        betrag_cent: 37100,
        betrag_richtung: 'erstattung',
        fristen: [frist('einspruch', '2026-08-01')],
      }),
    );
    expect(slots).toEqual([
      { kind: 'betrag', richtung: 'erstattung', betrag_cent: 37100 },
      { kind: 'frist', typ: 'einspruch', datum: '2026-08-01' },
    ]);
  });

  test('Mehrfach-Fristen: früheste Frist wird gewählt und typisiert die Frage', () => {
    const slots = deriveErklaererSlots(
      makeLetter({
        fristen: [
          frist('klage', '2026-10-20'),
          frist('nachweis', '2026-09-05'),
          frist('widerspruch', '2026-12-01'),
        ],
      }),
    );
    expect(slots).toEqual([{ kind: 'frist', typ: 'nachweis', datum: '2026-09-05' }]);
  });

  test('Bestätigungsschreiben (kein Betrag/keine Frist, Betreff „Eingangsbestätigung") → handeln/bestaetigung', () => {
    const slots = deriveErklaererSlots(
      makeLetter({
        betreff: 'Eingangsbestätigung zu Ihrem Antrag',
        fristen: [],
      }),
    );
    expect(slots).toEqual([{ kind: 'handeln', antwort: 'bestaetigung' }]);
  });

  test('required_action.cta hat Vorrang vor der Bestätigungs-Heuristik', () => {
    const slots = deriveErklaererSlots(
      makeLetter({
        betreff: 'Bescheinigung mit offener Aufforderung',
        required_action: {
          typ: 'termin_buchen',
          frist: '2026-09-01',
          cta: 'Termin zur Verlängerung buchen',
        },
      }),
    );
    expect(slots).toEqual([
      { kind: 'handeln', antwort: 'cta', cta: 'Termin zur Verlängerung buchen' },
    ]);
  });

  test('reines Informationsschreiben → handeln/information', () => {
    const slots = deriveErklaererSlots(
      makeLetter({
        betreff: 'Renteninformation nach § 109 SGB VI',
        fristen: [],
      }),
    );
    expect(slots).toEqual([{ kind: 'handeln', antwort: 'information' }]);
  });

  test('betrag_cent = 0 erzeugt keinen Betrag-Slot (fällt auf handeln zurück)', () => {
    const slots = deriveErklaererSlots(
      makeLetter({ betrag_cent: 0, betreff: 'Mitteilung' }),
    );
    expect(slots).toEqual([{ kind: 'handeln', antwort: 'information' }]);
  });
});
