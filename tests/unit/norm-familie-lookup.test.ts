/**
 * V1.5.1 — `pickNormFamilie` + `getPreInsertionModalSpec` Tests.
 *
 * Spec V1.5.1 § 7.1: table-driven Lookup über Letter-Archetype +
 * Template-ID. Bei `aussetzung_vollziehung_skelett` ist die Norm-Familie
 * IMMER `'aussetzung_ao'` (Hard-Line Domain-Doc § 1 letztes Bullet).
 *
 * Coverage:
 *   - Alle 5 Skelett-fähigen Archetypes × Skelett-Templates.
 *   - Aussetzung-Spezialfall: archetype-unabhängig → 'aussetzung_ao'.
 *   - OWiG-Pfad wirft (V2-Hook).
 *   - getPreInsertionModalSpec: Familienkasse-Zusatz-Sentence wird konditional
 *     gerendert (mandatorisch wenn AO + familienkasse-nachweis).
 */
import { describe, expect, test } from 'vitest';
import lettersFixture from '@/data/letters.json';
import type { Letter, ReplyTemplateId } from '@/types';
import {
  pickNormFamilie,
  getPreInsertionModalSpec,
  type NormFamilie,
} from '@/lib/mock-backend/reply-template-order';

const letters = lettersFixture as unknown as Letter[];

function findLetter(id: string): Letter {
  const found = letters.find((l) => l.id === id);
  if (!found) throw new Error(`Letter "${id}" missing in fixture.`);
  return found;
}

function syntheticLetter(overrides: Partial<Letter>): Letter {
  return {
    id: 'synthetic',
    absender_behoerde_id: 'finanzamt-koeln-mitte',
    empfaenger_persona_id: 'mehmet-yildiz',
    aktenzeichen: '[MOCK] SYNTH',
    betreff: 'Synthetic',
    body_de: '[MOCK]',
    archetype: 'sonstiges',
    auth_channel: 'briefpost',
    status: 'ungelesen',
    empfangen_am: '2026-05-09T00:00:00.000Z',
    fristen: [],
    ...overrides,
  } as Letter;
}

// ---------------------------------------------------------------------------
// pickNormFamilie — Archetype-Mapping.
// ---------------------------------------------------------------------------

describe('pickNormFamilie — Archetype × Template-ID Mapping', () => {
  test('steuerbescheid + einspruch → AO-Familie', () => {
    const letter = findLetter('letter-mehmet-fa-steuerbescheid-2024');
    expect(pickNormFamilie(letter, 'rechtsbehelf_einspruch_skelett')).toBe('ao');
  });

  test('familienkasse-nachweis + einspruch (V2 synthetic) → AO-Familie', () => {
    const letter = syntheticLetter({
      archetype: 'familienkasse-nachweis',
      absender_behoerde_id: 'familienkasse-berlin-brandenburg',
    });
    expect(pickNormFamilie(letter, 'rechtsbehelf_einspruch_skelett')).toBe('ao');
  });

  test('krankenkasse-beitrag + widerspruch → SGG-Familie', () => {
    const letter = findLetter('letter-schmidt-krankenkasse-beitrag');
    expect(pickNormFamilie(letter, 'rechtsbehelf_widerspruch_skelett')).toBe(
      'sgg',
    );
  });

  test('berufsgenossenschaft-beitrag + widerspruch → SGG-Familie', () => {
    const letter = findLetter('letter-mehmet-bgw-beitrag');
    expect(pickNormFamilie(letter, 'rechtsbehelf_widerspruch_skelett')).toBe(
      'sgg',
    );
  });

  test('ihk-beitrag + widerspruch → VwGO-Familie', () => {
    const letter = findLetter('letter-mehmet-ihk-beitrag');
    expect(pickNormFamilie(letter, 'rechtsbehelf_widerspruch_skelett')).toBe(
      'vwgo',
    );
  });

  test('beitragsservice-mahnung + widerspruch → VwGO-Familie', () => {
    const letter = findLetter('letter-mehmet-beitragsservice-mahnung');
    expect(pickNormFamilie(letter, 'rechtsbehelf_widerspruch_skelett')).toBe(
      'vwgo',
    );
  });

  test('abh-verlaengerung + widerspruch (V2 synthetic) → VwGO-Familie', () => {
    const letter = syntheticLetter({
      archetype: 'abh-verlaengerung',
    });
    expect(pickNormFamilie(letter, 'rechtsbehelf_widerspruch_skelett')).toBe(
      'vwgo',
    );
  });
});

// ---------------------------------------------------------------------------
// Aussetzung-Spezialfall: IMMER 'aussetzung_ao'.
// ---------------------------------------------------------------------------

describe('pickNormFamilie — Aussetzung der Vollziehung Spezialfall', () => {
  test('aussetzung_vollziehung_skelett → IMMER aussetzung_ao, unabhängig vom Archetype', () => {
    const letter = findLetter('letter-mehmet-fa-steuerbescheid-2024');
    expect(pickNormFamilie(letter, 'aussetzung_vollziehung_skelett')).toBe(
      'aussetzung_ao',
    );
  });

  test('aussetzung_vollziehung_skelett auf nicht-AO-Letter (Hard-Line: noch immer aussetzung_ao)', () => {
    // Hard-Line Domain-Doc § 1 letztes Bullet: aussetzung-Skelett ist
    // demoseitig auf AO-Familie beschränkt; Spec § 7.1 schreibt unabhängig
    // vom letter.archetype → aussetzung_ao.
    const letter = findLetter('letter-schmidt-krankenkasse-beitrag');
    expect(pickNormFamilie(letter, 'aussetzung_vollziehung_skelett')).toBe(
      'aussetzung_ao',
    );
  });
});

// ---------------------------------------------------------------------------
// OWiG-Pfad / unhandled archetypes wirft.
// ---------------------------------------------------------------------------

describe('pickNormFamilie — Drift-Schutz (Spec § 11)', () => {
  test('unhandled archetype (sonstiges) wirft mit klarer Error-Message', () => {
    const letter = syntheticLetter({ archetype: 'sonstiges' });
    expect(() =>
      pickNormFamilie(letter, 'rechtsbehelf_einspruch_skelett'),
    ).toThrow(/unhandled archetype/);
  });

  test('buergeramt-meldung wirft (Master-Predicate würde Skelett ohnehin ausschließen)', () => {
    const letter = syntheticLetter({ archetype: 'buergeramt-meldung' });
    expect(() =>
      pickNormFamilie(letter, 'rechtsbehelf_einspruch_skelett'),
    ).toThrow(/unhandled archetype/);
  });

  test('standesamt-urkunde wirft', () => {
    const letter = syntheticLetter({ archetype: 'standesamt-urkunde' });
    expect(() =>
      pickNormFamilie(letter, 'rechtsbehelf_einspruch_skelett'),
    ).toThrow(/unhandled archetype/);
  });
});

// ---------------------------------------------------------------------------
// getPreInsertionModalSpec — Modal-Spec-Lookup.
// ---------------------------------------------------------------------------

describe('getPreInsertionModalSpec — Modal-Variante × Norm-Familie', () => {
  test('AO-Familie → einspruch_ao Modal', () => {
    const letter = findLetter('letter-mehmet-fa-steuerbescheid-2024');
    const spec = getPreInsertionModalSpec('ao', letter);
    expect(spec.modal_title_key).toBe(
      'posteingang.compose.pre_insertion_modal.einspruch_ao.title',
    );
    expect(spec.modal_body_key).toBe(
      'posteingang.compose.pre_insertion_modal.einspruch_ao.body',
    );
    // Mehmet ist steuerbescheid, kein familienkasse-nachweis → kein Zusatz.
    expect(spec.additional_explainer_key).toBeUndefined();
  });

  test('SGG-Familie → widerspruch_sgg Modal', () => {
    const letter = findLetter('letter-schmidt-krankenkasse-beitrag');
    const spec = getPreInsertionModalSpec('sgg', letter);
    expect(spec.modal_title_key).toBe(
      'posteingang.compose.pre_insertion_modal.widerspruch_sgg.title',
    );
    expect(spec.additional_explainer_key).toBeUndefined();
  });

  test('VwGO-Familie → widerspruch_vwgo Modal', () => {
    const letter = findLetter('letter-mehmet-ihk-beitrag');
    const spec = getPreInsertionModalSpec('vwgo', letter);
    expect(spec.modal_title_key).toBe(
      'posteingang.compose.pre_insertion_modal.widerspruch_vwgo.title',
    );
  });

  test('aussetzung_ao → aussetzung_ao Modal', () => {
    const letter = findLetter('letter-mehmet-fa-steuerbescheid-2024');
    const spec = getPreInsertionModalSpec('aussetzung_ao', letter);
    expect(spec.modal_title_key).toBe(
      'posteingang.compose.pre_insertion_modal.aussetzung_ao.title',
    );
  });

  test('OWiG-Familie wirft (V2-Hook)', () => {
    const letter = findLetter('letter-mehmet-fa-steuerbescheid-2024');
    expect(() => getPreInsertionModalSpec('owig', letter)).toThrow(
      /OWiG-Familie ist V2-Hook/,
    );
  });
});

// ---------------------------------------------------------------------------
// Familienkasse-AO-Zusatz-Sentence: mandatorisch (Spec § 11.4).
// ---------------------------------------------------------------------------

describe('getPreInsertionModalSpec — Familienkasse-AO-Zusatz (Spec § 11.4 Hard-Line)', () => {
  test('AO + familienkasse-nachweis → additional_explainer_key gesetzt', () => {
    const letter = syntheticLetter({
      archetype: 'familienkasse-nachweis',
      absender_behoerde_id: 'familienkasse-berlin-brandenburg',
    });
    const spec = getPreInsertionModalSpec('ao', letter);
    expect(spec.additional_explainer_key).toBe(
      'posteingang.compose.pre_insertion_modal.einspruch_ao_familienkasse_zusatz',
    );
  });

  test('AO + steuerbescheid → KEIN additional_explainer_key', () => {
    const letter = findLetter('letter-mehmet-fa-steuerbescheid-2024');
    const spec = getPreInsertionModalSpec('ao', letter);
    expect(spec.additional_explainer_key).toBeUndefined();
  });

  test('SGG + familienkasse-nachweis → KEIN additional_explainer_key (nur AO)', () => {
    // Hypothetical edge case: norm wurde irgendwie als SGG bestimmt — Zusatz
    // gilt nur in AO-Modal.
    const letter = syntheticLetter({
      archetype: 'familienkasse-nachweis',
    });
    const spec = getPreInsertionModalSpec('sgg', letter);
    expect(spec.additional_explainer_key).toBeUndefined();
  });

  test('aussetzung_ao + familienkasse-nachweis → KEIN additional_explainer_key (Aussetzung-Modal)', () => {
    // Aussetzung-Modal hat eigenen Body; der Familienkasse-Zusatz lebt im
    // Einspruch-AO-Modal, nicht im Aussetzung-AO-Modal.
    const letter = syntheticLetter({
      archetype: 'familienkasse-nachweis',
    });
    const spec = getPreInsertionModalSpec('aussetzung_ao', letter);
    expect(spec.additional_explainer_key).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Vollständige Norm-Familie-Truth-Table.
// ---------------------------------------------------------------------------

describe('NormFamilie — Truth-Table', () => {
  // Mapping per archetype für Skelett-Templates (Domain-Doc § 1).
  type Case = {
    archetype: Letter['archetype'];
    template: Extract<
      ReplyTemplateId,
      | 'rechtsbehelf_einspruch_skelett'
      | 'rechtsbehelf_widerspruch_skelett'
      | 'aussetzung_vollziehung_skelett'
    >;
    expected: NormFamilie;
  };
  const cases: Case[] = [
    { archetype: 'steuerbescheid', template: 'rechtsbehelf_einspruch_skelett', expected: 'ao' },
    { archetype: 'familienkasse-nachweis', template: 'rechtsbehelf_einspruch_skelett', expected: 'ao' },
    { archetype: 'krankenkasse-beitrag', template: 'rechtsbehelf_widerspruch_skelett', expected: 'sgg' },
    { archetype: 'berufsgenossenschaft-beitrag', template: 'rechtsbehelf_widerspruch_skelett', expected: 'sgg' },
    { archetype: 'ihk-beitrag', template: 'rechtsbehelf_widerspruch_skelett', expected: 'vwgo' },
    { archetype: 'beitragsservice-mahnung', template: 'rechtsbehelf_widerspruch_skelett', expected: 'vwgo' },
    { archetype: 'abh-verlaengerung', template: 'rechtsbehelf_widerspruch_skelett', expected: 'vwgo' },
    // Aussetzung — egal welcher archetype, immer 'aussetzung_ao'.
    { archetype: 'steuerbescheid', template: 'aussetzung_vollziehung_skelett', expected: 'aussetzung_ao' },
    { archetype: 'krankenkasse-beitrag', template: 'aussetzung_vollziehung_skelett', expected: 'aussetzung_ao' },
  ];

  for (const c of cases) {
    test(`${c.archetype} + ${c.template} → ${c.expected}`, () => {
      const letter = syntheticLetter({ archetype: c.archetype });
      expect(pickNormFamilie(letter, c.template)).toBe(c.expected);
    });
  }
});
