/**
 * V1.5.1 — Picker-Order Tests (`getReplyTemplatePickerOrder`).
 *
 * Spec V1.5.1 § 6.2: table-driven Lookup über
 * `pickerOrderByArchetype` (= archetype + sortierte Frist-Typ-Set). Dieses
 * Test-Suite verifiziert die exakten Reihenfolgen aus der Spec-Tabelle.
 */
import { describe, expect, test } from 'vitest';
import lettersFixture from '@/data/letters.json';
import type { Letter } from '@/types';
import { getReplyTemplatePickerOrder } from '@/lib/mock-backend/reply-template-order';

const letters = lettersFixture as unknown as Letter[];

function findLetter(id: string): Letter {
  const found = letters.find((l) => l.id === id);
  if (!found) throw new Error(`Letter "${id}" missing in fixture.`);
  return found;
}

// Synthetic test-fixture builder für Archetype-/Frist-Kombos, die der V1.5.1-
// Seed nicht enthält (familienkasse-nachweis + einspruch ist V2-Mock-Letter,
// abh-verlaengerung + widerspruch dito).
function syntheticLetter(overrides: Partial<Letter>): Letter {
  return {
    id: 'synthetic',
    absender_behoerde_id: 'finanzamt-koeln-mitte',
    empfaenger_persona_id: 'mehmet-yildiz',
    aktenzeichen: '[MOCK] SYNTHETIC',
    betreff: 'Synthetic test fixture',
    body_de: '[MOCK] body',
    archetype: 'sonstiges',
    auth_channel: 'briefpost',
    status: 'ungelesen',
    empfangen_am: '2026-05-09T00:00:00.000Z',
    fristen: [],
    ...overrides,
  } as Letter;
}

// ---------------------------------------------------------------------------
// Spec § 6.2 Tabelle — pro ArchetypeOrderKey.
// ---------------------------------------------------------------------------

describe('Picker-Order — Spec § 6.2 Tabelle', () => {
  test('steuerbescheid + einspruch + zahlung → [einspruch_skelett, aussetzung_skelett, frist_verlaengerung, informative_rueckmeldung, freitext]', () => {
    const order = getReplyTemplatePickerOrder(
      findLetter('letter-mehmet-fa-steuerbescheid-2024'),
    );
    expect(order).toEqual([
      'rechtsbehelf_einspruch_skelett',
      'aussetzung_vollziehung_skelett',
      'frist_verlaengerung',
      'informative_rueckmeldung',
      'freitext',
    ]);
  });

  test('steuerbescheid + einspruch (Anna-Erstattung, kein Triple-AND) → [einspruch_skelett, frist_verlaengerung, informative_rueckmeldung, freitext]', () => {
    const order = getReplyTemplatePickerOrder(
      findLetter('letter-fa-steuerbescheid-2025'),
    );
    expect(order).toEqual([
      'rechtsbehelf_einspruch_skelett',
      'frist_verlaengerung',
      'informative_rueckmeldung',
      'freitext',
    ]);
  });

  test('familienkasse-nachweis + nachweis (V1.5.0-Default) → [nachweis_einreichen, frist_verlaengerung, informative_rueckmeldung, freitext]', () => {
    const order = getReplyTemplatePickerOrder(
      findLetter('letter-schmidt-familienkasse-nachweis'),
    );
    expect(order).toEqual([
      'nachweis_einreichen',
      'frist_verlaengerung',
      'informative_rueckmeldung',
      'freitext',
    ]);
  });

  test('familienkasse-nachweis + einspruch (V2-Mock, synthetic) → [einspruch_skelett, frist_verlaengerung, informative_rueckmeldung, freitext]', () => {
    const synthetic = syntheticLetter({
      id: 'synthetic-familienkasse-aufhebungsbescheid',
      archetype: 'familienkasse-nachweis',
      absender_behoerde_id: 'familienkasse-berlin-brandenburg',
      fristen: [
        {
          typ: 'einspruch',
          datum: '2026-06-08',
          original_zitat: '[MOCK] Synthetic',
          citation_match: false,
        },
      ],
    });
    const order = getReplyTemplatePickerOrder(synthetic);
    expect(order).toEqual([
      'rechtsbehelf_einspruch_skelett',
      'frist_verlaengerung',
      'informative_rueckmeldung',
      'freitext',
    ]);
  });

  test('krankenkasse-beitrag + widerspruch → [widerspruch_skelett, frist_verlaengerung, informative_rueckmeldung, freitext]', () => {
    const order = getReplyTemplatePickerOrder(
      findLetter('letter-schmidt-krankenkasse-beitrag'),
    );
    expect(order).toEqual([
      'rechtsbehelf_widerspruch_skelett',
      'frist_verlaengerung',
      'informative_rueckmeldung',
      'freitext',
    ]);
  });

  test('krankenkasse-beitrag + none (Mitgliedsbescheinigung) → [informative_rueckmeldung, freitext]', () => {
    const order = getReplyTemplatePickerOrder(
      findLetter('letter-aok-mitgliedsbescheinigung'),
    );
    expect(order).toEqual(['informative_rueckmeldung', 'freitext']);
  });

  test('berufsgenossenschaft-beitrag + widerspruch → [widerspruch_skelett, …]', () => {
    const order = getReplyTemplatePickerOrder(
      findLetter('letter-mehmet-bgw-beitrag'),
    );
    expect(order).toEqual([
      'rechtsbehelf_widerspruch_skelett',
      'frist_verlaengerung',
      'informative_rueckmeldung',
      'freitext',
    ]);
  });

  test('ihk-beitrag + widerspruch → [widerspruch_skelett, …]', () => {
    const order = getReplyTemplatePickerOrder(
      findLetter('letter-mehmet-ihk-beitrag'),
    );
    expect(order).toEqual([
      'rechtsbehelf_widerspruch_skelett',
      'frist_verlaengerung',
      'informative_rueckmeldung',
      'freitext',
    ]);
  });

  test('beitragsservice-mahnung + widerspruch → [widerspruch_skelett, nachweis_einreichen, …] (Befreiungs-Nachweis bleibt sichtbar)', () => {
    const order = getReplyTemplatePickerOrder(
      findLetter('letter-mehmet-beitragsservice-mahnung'),
    );
    expect(order).toEqual([
      'rechtsbehelf_widerspruch_skelett',
      'nachweis_einreichen',
      'informative_rueckmeldung',
      'freitext',
    ]);
  });

  test('abh-verlaengerung + nachweis (V1.5.0-Default) → [nachweis_einreichen, frist_verlaengerung, …]', () => {
    const order = getReplyTemplatePickerOrder(
      findLetter('letter-abh-erinnerung-verlaengerung'),
    );
    // letter-abh-erinnerung-verlaengerung trägt frist.typ === 'antragstellung'.
    // archetype-Switch case maps das auf die abh-verlaengerung+nachweis-Variante.
    expect(order).toEqual([
      'nachweis_einreichen',
      'frist_verlaengerung',
      'informative_rueckmeldung',
      'freitext',
    ]);
  });

  test('abh-verlaengerung + widerspruch (V2-Mock, synthetic) → [widerspruch_skelett, informative_rueckmeldung, freitext]', () => {
    const synthetic = syntheticLetter({
      id: 'synthetic-abh-ablehnungsbescheid',
      archetype: 'abh-verlaengerung',
      absender_behoerde_id: 'abh-berlin-lea',
      fristen: [
        {
          typ: 'widerspruch',
          datum: '2026-06-08',
          original_zitat: '[MOCK] Synthetic',
          citation_match: false,
        },
      ],
    });
    const order = getReplyTemplatePickerOrder(synthetic);
    expect(order).toEqual([
      'rechtsbehelf_widerspruch_skelett',
      'informative_rueckmeldung',
      'freitext',
    ]);
  });

  test('standesamt-urkunde + antragstellung → [termin_antwort, informative_rueckmeldung, freitext]', () => {
    const order = getReplyTemplatePickerOrder(
      findLetter('letter-anna-standesamt-eheschliessung-termin'),
    );
    expect(order).toEqual(['termin_antwort', 'informative_rueckmeldung', 'freitext']);
  });

  test('standesamt-urkunde + none (Geburtsurkunde) → [informative_rueckmeldung, freitext]', () => {
    const order = getReplyTemplatePickerOrder(
      findLetter('letter-schmidt-standesamt-geburt'),
    );
    expect(order).toEqual(['informative_rueckmeldung', 'freitext']);
  });

  test('buergeramt-meldung + none → [informative_rueckmeldung, freitext]', () => {
    const order = getReplyTemplatePickerOrder(
      findLetter('letter-buergeramt-meldebestaetigung-anmeldung'),
    );
    expect(order).toEqual(['informative_rueckmeldung', 'freitext']);
  });

  test('sonstiges + none (Bundesdruckerei) → [informative_rueckmeldung, freitext]', () => {
    const order = getReplyTemplatePickerOrder(
      findLetter('letter-bundesdruckerei-pa-aufkleber'),
    );
    expect(order).toEqual(['informative_rueckmeldung', 'freitext']);
  });
});

// ---------------------------------------------------------------------------
// Default-Highlight: order[0] muss korrekt sein.
// ---------------------------------------------------------------------------

describe('Picker-Order — output[0] ist default-highlighted', () => {
  test('steuerbescheid+einspruch+zahlung default = einspruch_skelett', () => {
    const order = getReplyTemplatePickerOrder(
      findLetter('letter-mehmet-fa-steuerbescheid-2024'),
    );
    expect(order[0]).toBe('rechtsbehelf_einspruch_skelett');
  });

  test('krankenkasse-beitrag+widerspruch default = widerspruch_skelett', () => {
    const order = getReplyTemplatePickerOrder(
      findLetter('letter-schmidt-krankenkasse-beitrag'),
    );
    expect(order[0]).toBe('rechtsbehelf_widerspruch_skelett');
  });

  test('beitragsservice-mahnung+widerspruch default = widerspruch_skelett', () => {
    const order = getReplyTemplatePickerOrder(
      findLetter('letter-mehmet-beitragsservice-mahnung'),
    );
    expect(order[0]).toBe('rechtsbehelf_widerspruch_skelett');
  });
});

// ---------------------------------------------------------------------------
// freitext ist letztes Element (V1.5.0-Konvention).
// ---------------------------------------------------------------------------

describe('Picker-Order — freitext ist immer letztes Element', () => {
  for (const letter of letters) {
    test(`${letter.id} → freitext am Ende`, () => {
      const order = getReplyTemplatePickerOrder(letter);
      expect(order[order.length - 1]).toBe('freitext');
    });
  }
});
