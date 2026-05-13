/**
 * V1.5.1 — Visibility-Predicate Tests (`getReplyTemplatePickerOrder`).
 *
 * Spec V1.5.1 § 11.6 Hard-Line: Skelett-Templates erscheinen *nur*, wenn
 * `letter.fristen[]` mind. einen Eintrag mit `typ ∈ {einspruch, widerspruch}`
 * enthält. `aussetzung_vollziehung_skelett` zusätzlich gated auf das Triple-AND
 * (`archetype === 'steuerbescheid'` AND fristen einspruch AND fristen zahlung).
 *
 * Coverage (Spec § 12.1):
 *   - Truth-Table über alle Seed-Letters.
 *   - Master-Predicate: kein Skelett bei Mitwirkungs-/Bestätigungs-/Bewilligungs-
 *     Letters (negative-Pfad).
 *   - Triple-AND positive: `letter-mehmet-fa-steuerbescheid-2024`,
 *     `letter-schmidt-fa-steuerbescheid-2024`.
 *   - Triple-AND negative: `letter-fa-steuerbescheid-2025` (Anna-Erstattung,
 *     keine Zahlungsfrist).
 */
import { describe, expect, test } from 'vitest';
import lettersFixture from '@/data/letters.json';
import type { Letter } from '@/types';
import { getReplyTemplatePickerOrder } from '@/lib/mock-backend/reply-template-order';

const letters = lettersFixture as unknown as Letter[];

function findLetter(id: string): Letter {
  const found = letters.find((l) => l.id === id);
  if (!found) {
    throw new Error(`Letter "${id}" not in seed — test fixture drift.`);
  }
  return found;
}

const SKELETT_IDS = new Set([
  'rechtsbehelf_einspruch_skelett',
  'rechtsbehelf_widerspruch_skelett',
  'aussetzung_vollziehung_skelett',
]);

// ---------------------------------------------------------------------------
// Master-Predicate (positive-allow).
// ---------------------------------------------------------------------------

describe('Visibility-Predicate — Master-Predicate (positive-allow)', () => {
  test('Letter mit fristen[].typ einspruch → Einspruch-Skelett erscheint', () => {
    const letter = findLetter('letter-mehmet-fa-steuerbescheid-2024');
    const order = getReplyTemplatePickerOrder(letter);
    expect(order).toContain('rechtsbehelf_einspruch_skelett');
    // Triple-AND: zusätzlich aussetzung.
    expect(order).toContain('aussetzung_vollziehung_skelett');
  });

  test('Letter mit fristen[].typ widerspruch → Widerspruch-Skelett erscheint', () => {
    const letter = findLetter('letter-schmidt-krankenkasse-beitrag');
    const order = getReplyTemplatePickerOrder(letter);
    expect(order).toContain('rechtsbehelf_widerspruch_skelett');
    expect(order).not.toContain('rechtsbehelf_einspruch_skelett');
    expect(order).not.toContain('aussetzung_vollziehung_skelett');
  });

  test('Letter mit fristen[].typ nachweis → KEIN Skelett-Template (negative-Pfad)', () => {
    const letter = findLetter('letter-schmidt-familienkasse-nachweis');
    const order = getReplyTemplatePickerOrder(letter);
    for (const id of SKELETT_IDS) {
      expect(order).not.toContain(id);
    }
    // Default-V1.5.0: nachweis_einreichen ist erste Option.
    expect(order[0]).toBe('nachweis_einreichen');
  });

  test('Letter ohne fristen → KEIN Skelett-Template (negative-Pfad)', () => {
    const letter = findLetter('letter-aok-mitgliedsbescheinigung');
    const order = getReplyTemplatePickerOrder(letter);
    for (const id of SKELETT_IDS) {
      expect(order).not.toContain(id);
    }
  });

  test('Bestätigungs-Letter (familienkasse-bewilligung) → KEIN Skelett-Template', () => {
    const letter = findLetter('letter-familienkasse-bewilligung');
    const order = getReplyTemplatePickerOrder(letter);
    for (const id of SKELETT_IDS) {
      expect(order).not.toContain(id);
    }
  });

  test('Standesamt-Termin-Letter mit antragstellung-Frist → KEIN Skelett (positive-allow ist eng)', () => {
    const letter = findLetter('letter-anna-standesamt-eheschliessung-termin');
    const order = getReplyTemplatePickerOrder(letter);
    for (const id of SKELETT_IDS) {
      expect(order).not.toContain(id);
    }
    // Stattdessen: termin_antwort führt.
    expect(order[0]).toBe('termin_antwort');
  });
});

// ---------------------------------------------------------------------------
// Triple-AND für aussetzung_vollziehung_skelett.
// ---------------------------------------------------------------------------

describe('Visibility-Predicate — Triple-AND für Aussetzung der Vollziehung', () => {
  test('Mehmet FA Steuerbescheid (einspruch + zahlung) → Aussetzung erscheint', () => {
    const letter = findLetter('letter-mehmet-fa-steuerbescheid-2024');
    const order = getReplyTemplatePickerOrder(letter);
    expect(order).toContain('aussetzung_vollziehung_skelett');
  });

  test('Schmidt FA Steuerbescheid (einspruch + zahlung) → Aussetzung erscheint', () => {
    const letter = findLetter('letter-schmidt-fa-steuerbescheid-2024');
    const order = getReplyTemplatePickerOrder(letter);
    expect(order).toContain('aussetzung_vollziehung_skelett');
  });

  test('Anna Erstattungsbescheid 2024 (nur einspruch, KEINE zahlung) → KEIN Aussetzung', () => {
    const letter = findLetter('letter-fa-steuerbescheid-2025');
    const order = getReplyTemplatePickerOrder(letter);
    expect(order).toContain('rechtsbehelf_einspruch_skelett');
    expect(order).not.toContain('aussetzung_vollziehung_skelett');
  });

  test('Krankenkasse-Beitrag (widerspruch, kein steuerbescheid) → KEIN Aussetzung', () => {
    const letter = findLetter('letter-schmidt-krankenkasse-beitrag');
    const order = getReplyTemplatePickerOrder(letter);
    expect(order).not.toContain('aussetzung_vollziehung_skelett');
  });
});

// ---------------------------------------------------------------------------
// Truth-Table über alle Seed-Letters.
// ---------------------------------------------------------------------------

describe('Visibility-Predicate — Truth-Table aller Seed-Letters', () => {
  // Pro Letter: erwartete Ausschluss-Marker.
  // Wir testen drei Eigenschaften:
  //   - hasEinspruch: hat mindestens eine einspruch-Frist
  //   - hasWiderspruch: hat mindestens eine widerspruch-Frist
  //   - hasZahlung: hat mindestens eine zahlung-Frist
  // Dann leiten wir die expected Skelett-Sichtbarkeit ab.
  for (const letter of letters) {
    const fristTypes = new Set((letter.fristen ?? []).map((f) => f.typ));
    const hasEinspruch = fristTypes.has('einspruch');
    const hasWiderspruch = fristTypes.has('widerspruch');
    const hasZahlung = fristTypes.has('zahlung');
    const isSteuerbescheid = letter.archetype === 'steuerbescheid';

    test(`${letter.id} (archetype=${letter.archetype}, fristen=${[...fristTypes].join('|') || 'none'})`, () => {
      const order = getReplyTemplatePickerOrder(letter);

      // Spec § 11.6: Einspruch-Skelett nur, wenn fristen einspruch ODER
      // (für familienkasse) … aber Master-Predicate prüft generell.
      // Genauer: Einspruch-Skelett-Visibility hängt vom archetype + frist ab.
      // Steuerbescheid+einspruch → ja. Familienkasse+einspruch → V2-Pfad ja.
      // Krankenkasse+widerspruch → nein (Widerspruch-Skelett, nicht Einspruch).
      if (
        (letter.archetype === 'steuerbescheid' && hasEinspruch) ||
        (letter.archetype === 'familienkasse-nachweis' && hasEinspruch)
      ) {
        expect(order).toContain('rechtsbehelf_einspruch_skelett');
      } else {
        expect(order).not.toContain('rechtsbehelf_einspruch_skelett');
      }

      // Widerspruch-Skelett: SGG-/VwGO-Familie + widerspruch-Frist.
      const widerspruchEligible =
        hasWiderspruch &&
        (letter.archetype === 'krankenkasse-beitrag' ||
          letter.archetype === 'berufsgenossenschaft-beitrag' ||
          letter.archetype === 'ihk-beitrag' ||
          letter.archetype === 'beitragsservice-mahnung' ||
          letter.archetype === 'abh-verlaengerung');
      if (widerspruchEligible) {
        expect(order).toContain('rechtsbehelf_widerspruch_skelett');
      } else {
        expect(order).not.toContain('rechtsbehelf_widerspruch_skelett');
      }

      // Triple-AND für Aussetzung.
      if (isSteuerbescheid && hasEinspruch && hasZahlung) {
        expect(order).toContain('aussetzung_vollziehung_skelett');
      } else {
        expect(order).not.toContain('aussetzung_vollziehung_skelett');
      }
    });
  }
});

// ---------------------------------------------------------------------------
// Default-Highlight: order[0] ist der default-highlighted Picker-Eintrag.
// ---------------------------------------------------------------------------

describe('Visibility-Predicate — Default-Highlight (order[0])', () => {
  test('steuerbescheid + einspruch + zahlung → order[0] === einspruch_skelett', () => {
    const letter = findLetter('letter-mehmet-fa-steuerbescheid-2024');
    const order = getReplyTemplatePickerOrder(letter);
    expect(order[0]).toBe('rechtsbehelf_einspruch_skelett');
  });

  test('krankenkasse-beitrag + widerspruch → order[0] === widerspruch_skelett', () => {
    const letter = findLetter('letter-schmidt-krankenkasse-beitrag');
    const order = getReplyTemplatePickerOrder(letter);
    expect(order[0]).toBe('rechtsbehelf_widerspruch_skelett');
  });

  test('familienkasse-nachweis + nachweis → order[0] === nachweis_einreichen', () => {
    const letter = findLetter('letter-schmidt-familienkasse-nachweis');
    const order = getReplyTemplatePickerOrder(letter);
    expect(order[0]).toBe('nachweis_einreichen');
  });

  test('standesamt-urkunde + antragstellung → order[0] === termin_antwort', () => {
    const letter = findLetter('letter-anna-standesamt-eheschliessung-termin');
    const order = getReplyTemplatePickerOrder(letter);
    expect(order[0]).toBe('termin_antwort');
  });
});
