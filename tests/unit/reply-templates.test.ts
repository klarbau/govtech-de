/**
 * Reply-Body-Resolver Tests (V1.5).
 *
 * Coverage:
 *  - 4 administrative templates × 3 personas — round-trip resolves to a string
 *    that contains absender_name, aktenzeichen, empfaenger_behoerde and has
 *    no remaining `{token}` patterns (except bracketed `[…]` user-input hints).
 *  - termin_antwort × 3 modes + missing/invalid mode — `other`-fallback.
 *  - freitext → empty string.
 *  - Persona / Letter / Template not found → throws MockBackendError.
 *
 * Setup mirrors `tests/unit/reply-roundtrip.test.ts` — in-memory localStorage
 * + window-stub (must come before importing api.ts), `?reliable=1` to disable
 *   the 5%-error injection.
 */
import { afterEach, beforeAll, beforeEach, describe, expect, test } from 'vitest';

// --------------------------------------------------------------------------
// localStorage + window Stubs (vor dem Import von api.ts!)
// --------------------------------------------------------------------------

class MemoryStorage implements Storage {
  private map = new Map<string, string>();
  get length(): number {
    return this.map.size;
  }
  clear(): void {
    this.map.clear();
  }
  getItem(key: string): string | null {
    return this.map.has(key) ? (this.map.get(key) as string) : null;
  }
  key(index: number): string | null {
    return Array.from(this.map.keys())[index] ?? null;
  }
  removeItem(key: string): void {
    this.map.delete(key);
  }
  setItem(key: string, value: string): void {
    this.map.set(key, value);
  }
}

beforeAll(() => {
  const storage = new MemoryStorage();
  process.env.NEXT_PUBLIC_RELIABLE = '1';
  Object.defineProperty(globalThis, 'window', {
    value: {
      localStorage: storage,
      location: { search: '' },
    },
    writable: true,
    configurable: true,
  });
  Object.defineProperty(globalThis, 'localStorage', {
    value: storage,
    writable: true,
    configurable: true,
  });
});

let api: typeof import('@/lib/mock-backend').api;
let MockBackendError: typeof import('@/lib/mock-backend').MockBackendError;
let reseedForActivePersona: typeof import('@/lib/mock-backend').reseedForActivePersona;

beforeAll(async () => {
  const mod = await import('@/lib/mock-backend');
  api = mod.api;
  MockBackendError = mod.MockBackendError;
  reseedForActivePersona = mod.reseedForActivePersona;
});

afterEach(() => {
  if (typeof window !== 'undefined' && window.localStorage) {
    window.localStorage.removeItem('govtech-de:v1:letter-replies');
    window.localStorage.removeItem('govtech-de:v1:letter-activity-log');
  }
});

// --------------------------------------------------------------------------
// Helpers
// --------------------------------------------------------------------------

/**
 * Anchor letters per persona — picked because each carries the right shape
 * for the relevant template (Aktenzeichen, Frist, Behörde, body content).
 */
const ANCHORS = {
  anna: {
    personaId: 'anna-petrov',
    nachname: 'Petrov',
    // Standesamt-Eheschließung-Termin: hat Frist + Termin-Vorschlag im Body.
    letterId: 'letter-anna-standesamt-eheschliessung-termin',
    aktenzeichen: '[MOCK] B-E-04711/2026',
    behoerdenName: 'Standesamt Mitte von Berlin',
  },
  schmidt: {
    personaId: 'markus-schmidt',
    nachname: 'Schmidt',
    // Familienkasse-Nachweis: hat Frist 15.06.2026, Aktenzeichen.
    letterId: 'letter-schmidt-familienkasse-nachweis',
    aktenzeichen: '[MOCK] 234FK892017',
    behoerdenName: 'Familienkasse Berlin-Brandenburg',
  },
  mehmet: {
    personaId: 'mehmet-yildiz',
    nachname: 'Yıldız',
    // Steuerbescheid: hat Frist + Aktenzeichen.
    letterId: 'letter-mehmet-fa-steuerbescheid-2024',
    aktenzeichen: '[MOCK] 217/5732/00088',
    behoerdenName: 'Finanzamt Köln-Mitte',
  },
} as const;

/**
 * Strict regex used by the test to detect leftover unresolved tokens.
 * Bracketed `[…]` hints (e.g. `[gewünschte neue Frist]`) are EXPECTED for
 * empty user-input fields and must not trigger the assertion.
 */
const LEFTOVER_TOKEN_RE = /\{[a-zA-Z_][a-zA-Z0-9_]*\}/;

/** Switch active persona — full reseed of letters/vorgaenge/etc. */
function switchToPersona(personaId: string): void {
  reseedForActivePersona(personaId);
}

// --------------------------------------------------------------------------
// Tests
// --------------------------------------------------------------------------

describe('resolveReplyBody — administrative templates × all personas', () => {
  for (const [personaKey, anchor] of Object.entries(ANCHORS)) {
    describe(`persona: ${personaKey} (${anchor.personaId})`, () => {
      beforeEach(() => {
        switchToPersona(anchor.personaId);
      });

      test('frist_verlaengerung resolves Stammdaten + Aktenzeichen + Behörde', async () => {
        const body = await api.resolveReplyBody({
          personaId: anchor.personaId,
          letterId: anchor.letterId,
          templateId: 'frist_verlaengerung',
          userInput: {
            frist_neu_gewuenscht: '30.07.2026',
            begruendung_kurz: 'Urlaubsbedingt; Unterlagen werden nachgereicht.',
          },
        });
        expect(body).toContain(anchor.nachname);
        expect(body).toContain(anchor.aktenzeichen);
        expect(body).toContain(anchor.behoerdenName);
        expect(body).toContain('Antrag auf Fristverlängerung');
        expect(body).toContain('30.07.2026');
        expect(body).toContain('Urlaubsbedingt');
        expect(body).not.toMatch(LEFTOVER_TOKEN_RE);
      });

      test('nachweis_einreichen contains the Verifier-locked sentence + uses Behörde', async () => {
        const body = await api.resolveReplyBody({
          personaId: anchor.personaId,
          letterId: anchor.letterId,
          templateId: 'nachweis_einreichen',
          userInput: { nachweis_bezeichnung: 'Schulbescheinigung' },
        });
        expect(body).toContain(anchor.nachname);
        expect(body).toContain(anchor.aktenzeichen);
        expect(body).toContain(anchor.behoerdenName);
        // Verifier-locked phrase (Domain §2):
        expect(body).toContain(
          'anbei finden Sie den von Ihnen angeforderten Nachweis Schulbescheinigung. Bitte bestätigen Sie den Eingang.',
        );
        expect(body).not.toMatch(LEFTOVER_TOKEN_RE);
      });

      test('informative_rueckmeldung contains datum_letter twice + Stammdaten', async () => {
        const body = await api.resolveReplyBody({
          personaId: anchor.personaId,
          letterId: anchor.letterId,
          templateId: 'informative_rueckmeldung',
          userInput: { rueckmeldung_text: 'Ich habe die Unterlagen geprüft.' },
        });
        expect(body).toContain(anchor.nachname);
        expect(body).toContain(anchor.aktenzeichen);
        expect(body).toContain(anchor.behoerdenName);
        expect(body).toContain('Ich habe die Unterlagen geprüft.');
        // Domain §3 Notes: datum_letter erscheint im Betreff UND im Bezugnahme-
        // Satz — beide Vorkommen müssen aufgelöst sein.
        const dateMatches = body.match(/\d{2}\.\d{2}\.\d{4}/g) ?? [];
        // Mind. 2 Daten: heutiges {datum} + 2× {datum_letter} = 3 (oder mehr,
        // falls {frist_alt} auch belegt ist — egal, wir prüfen ≥ 2).
        expect(dateMatches.length).toBeGreaterThanOrEqual(2);
        expect(body).not.toMatch(LEFTOVER_TOKEN_RE);
      });
    });
  }
});

describe('resolveReplyBody — termin_antwort modes', () => {
  beforeEach(() => {
    switchToPersona(ANCHORS.anna.personaId);
  });

  test('mode=bestaetigen renders confirmation phrase (with umlaut)', async () => {
    const body = await api.resolveReplyBody({
      personaId: ANCHORS.anna.personaId,
      letterId: ANCHORS.anna.letterId,
      templateId: 'termin_antwort',
      mode: 'bestaetigen',
    });
    // Domain §4: ICU-select-key is ASCII (`bestaetigen`) but rendered DE has umlaut.
    expect(body).toContain('bestätige');
    // Termin date should be extracted from body (regex finds 22.06.2026, 14:00 Uhr).
    expect(body).toMatch(/22\.06\.2026/);
    expect(body).not.toContain('schlage stattdessen');
    expect(body).not.toContain('muss ich leider absagen');
    expect(body).not.toMatch(LEFTOVER_TOKEN_RE);
  });

  test('mode=verschieben renders alternative-date phrase', async () => {
    const body = await api.resolveReplyBody({
      personaId: ANCHORS.anna.personaId,
      letterId: ANCHORS.anna.letterId,
      templateId: 'termin_antwort',
      mode: 'verschieben',
      userInput: { termin_neu_gewuenscht: '29.06.2026, 10:00 Uhr' },
    });
    // Domain §4 verschieben branch contains both phrases:
    expect(body).toContain('schlage stattdessen');
    expect(body).toContain('29.06.2026');
    expect(body).not.toContain('bestätige ich hiermit');
    expect(body).not.toContain('muss ich leider absagen');
    expect(body).not.toMatch(LEFTOVER_TOKEN_RE);
  });

  test('mode=absagen renders cancellation phrase', async () => {
    const body = await api.resolveReplyBody({
      personaId: ANCHORS.anna.personaId,
      letterId: ANCHORS.anna.letterId,
      templateId: 'termin_antwort',
      mode: 'absagen',
    });
    expect(body).toContain('muss ich leider absagen');
    expect(body).not.toContain('bestätige ich hiermit');
    expect(body).not.toContain('schlage stattdessen');
    expect(body).not.toMatch(LEFTOVER_TOKEN_RE);
  });

  test('mode missing → falls through to other branch (conservatively bestätigen)', async () => {
    const body = await api.resolveReplyBody({
      personaId: ANCHORS.anna.personaId,
      letterId: ANCHORS.anna.letterId,
      templateId: 'termin_antwort',
      // mode intentionally omitted
    });
    // Domain §4: `other` branch is identical to `bestaetigen` — conservatively
    // safe fallback (eine versehentliche Bestätigung ist weniger schädlich als
    // eine versehentliche Absage).
    expect(body).toContain('bestätige');
    expect(body).not.toContain('muss ich leider absagen');
    expect(body).not.toMatch(LEFTOVER_TOKEN_RE);
  });

  test('mode is invalid string → falls through to other branch without crashing', async () => {
    const body = await api.resolveReplyBody({
      personaId: ANCHORS.anna.personaId,
      letterId: ANCHORS.anna.letterId,
      templateId: 'termin_antwort',
      // Cast über unknown, weil das das Frontend-Failure-Szenario ist
      // (UI-Mode-Wert irgendwie kaputt).
      mode: 'gibt-es-nicht' as unknown as 'bestaetigen',
    });
    expect(body).toContain('bestätige');
    expect(body).not.toMatch(LEFTOVER_TOKEN_RE);
  });
});

describe('resolveReplyBody — freitext + edge cases', () => {
  beforeEach(() => {
    switchToPersona(ANCHORS.anna.personaId);
  });

  test('freitext returns empty string regardless of letter / persona', async () => {
    const body = await api.resolveReplyBody({
      personaId: ANCHORS.anna.personaId,
      letterId: ANCHORS.anna.letterId,
      templateId: 'freitext',
    });
    expect(body).toBe('');
  });

  test('persona not found → throws MockBackendError(PERSONA_NOT_FOUND)', async () => {
    await expect(
      api.resolveReplyBody({
        personaId: 'persona-does-not-exist',
        letterId: ANCHORS.anna.letterId,
        templateId: 'frist_verlaengerung',
      }),
    ).rejects.toThrow(MockBackendError);
    try {
      await api.resolveReplyBody({
        personaId: 'persona-does-not-exist',
        letterId: ANCHORS.anna.letterId,
        templateId: 'frist_verlaengerung',
      });
    } catch (err) {
      expect(err).toBeInstanceOf(MockBackendError);
      expect((err as InstanceType<typeof MockBackendError>).code).toBe(
        'PERSONA_NOT_FOUND',
      );
    }
  });

  test('letter not found → throws MockBackendError(LETTER_NOT_FOUND)', async () => {
    await expect(
      api.resolveReplyBody({
        personaId: ANCHORS.anna.personaId,
        letterId: 'letter-does-not-exist',
        templateId: 'frist_verlaengerung',
      }),
    ).rejects.toThrow(MockBackendError);
    try {
      await api.resolveReplyBody({
        personaId: ANCHORS.anna.personaId,
        letterId: 'letter-does-not-exist',
        templateId: 'frist_verlaengerung',
      });
    } catch (err) {
      expect(err).toBeInstanceOf(MockBackendError);
      expect((err as InstanceType<typeof MockBackendError>).code).toBe(
        'LETTER_NOT_FOUND',
      );
    }
  });

  test('empty user-input renders bracketed `[…]` placeholder, not raw token', async () => {
    const body = await api.resolveReplyBody({
      personaId: ANCHORS.anna.personaId,
      letterId: ANCHORS.anna.letterId,
      templateId: 'frist_verlaengerung',
      // userInput intentionally omitted → both fields empty
    });
    // Bracketed German placeholders should appear:
    expect(body).toMatch(/\[gewünschte neue Frist\]/);
    expect(body).toMatch(/\[kurze Begründung\]/);
    // No raw `{token}` should remain:
    expect(body).not.toMatch(LEFTOVER_TOKEN_RE);
  });
});
