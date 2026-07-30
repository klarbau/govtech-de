/**
 * V1.5.1 — Reply-Body-Resolver Tests für die drei neuen Skelett-Templates.
 *
 * Coverage (Spec V1.5.1 § 12.1):
 *   - 3 Skelett-Templates × 3 Personas (Anna, Schmidt, Mehmet) — Resolver-
 *     Round-Trip: Output enthält Stammdaten, Aktenzeichen, Behörde, alle
 *     Placeholder aufgelöst.
 *   - `{datum_bescheid}`-Token resolved aus `letter.bescheid_dated_at`.
 *   - Fallback bei `bescheid_dated_at: undefined` → `letter.empfangen_am`.
 *   - Zero `§`-Symbole im Body (Spec § 11.2 Hard-Line, regex-Assertion).
 *   - RDG-Cleanliness: kein „Begründung reiche ich gesondert nach", keine
 *     „aufschiebende Wirkung", keine „Erfolgsprognose"-Marker (Spec § 11.3,
 *     Domain-Doc § 4 Cleanliness-Check).
 *   - V1.5.0-Resolver bleibt unverändert: `{datum_letter}` weiterhin aus
 *     `letter.empfangen_am` (Spec § 11.9 Hard-Line, Sanity-Check).
 *
 * Setup mirrors `tests/unit/reply-templates.test.ts`.
 */
import { afterEach, beforeAll, beforeEach, describe, expect, test } from 'vitest';
import { formatDateDe } from '@/lib/utils';

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

let api: typeof import('@/lib/mock-backend/test-core').api;
let reseedForActivePersona: typeof import('@/lib/mock-backend/test-core').reseedForActivePersona;
let resolveReplyBodySync: typeof import('@/lib/mock-backend/test-core').resolveReplyBodySync;

beforeAll(async () => {
  const mod = await import('@/lib/mock-backend/test-core');
  api = mod.api;
  reseedForActivePersona = mod.reseedForActivePersona;
  resolveReplyBodySync = mod.resolveReplyBodySync;
});

afterEach(() => {
  if (typeof window !== 'undefined' && window.localStorage) {
    window.localStorage.removeItem('govtech-de:v1:letter-replies');
    window.localStorage.removeItem('govtech-de:v1:letter-activity-log');
  }
});

// --------------------------------------------------------------------------
// Helpers — Skelett-fähige Anker pro Persona (Letters mit einspruch-Frist).
// --------------------------------------------------------------------------

const ANCHORS = {
  anna: {
    personaId: 'anna-petrov',
    nachname: 'Petrov',
    // Anna-Erstattungsbescheid 2024 (FA Berlin). Frist: einspruch (kein Triple-AND
    // → kein Aussetzung-Skelett, aber Einspruch-Skelett ist gültig).
    letterId: 'letter-fa-steuerbescheid-2025',
    aktenzeichen: '[MOCK] 11/123/45678',
    behoerdenName: 'Finanzamt für Körperschaften I Berlin',
  },
  schmidt: {
    personaId: 'markus-schmidt',
    nachname: 'Schmidt',
    // Schmidt FA Köln-Mitte (eigentlich Hamburg-Eimsbüttel im Mock).
    letterId: 'letter-schmidt-fa-steuerbescheid-2024',
    aktenzeichen: '[MOCK] 22/345/12345',
    behoerdenName: 'Finanzamt Hamburg-Eimsbüttel',
  },
  mehmet: {
    personaId: 'mehmet-yildiz',
    nachname: 'Yıldız',
    // Mehmet FA Köln-Mitte mit ELSTER-Bekanntgabe.
    letterId: 'letter-mehmet-fa-steuerbescheid-2024',
    aktenzeichen: '[MOCK] 217/5732/00088',
    behoerdenName: 'Finanzamt Köln-Mitte',
  },
  // Die Empfangs-/Bescheid-Daten werden NICHT mehr gepinnt: die Schmidt-/
  // Mehmet-Bescheid-Briefe tragen seit der Schmidt-Content-Welle (2026-07-30)
  // @now-Sentinels und lösen Seed-Anker-relativ auf — die Tests leiten die
  // erwarteten DE-Strings zur Laufzeit aus dem geseedeten Brief ab (derselbe
  // `formatDateDe`-Pfad, den der Resolver nutzt).
} as const;

const LEFTOVER_TOKEN_RE = /\{[a-zA-Z_][a-zA-Z0-9_]*\}/;

function switchToPersona(personaId: string): void {
  reseedForActivePersona(personaId);
}

// --------------------------------------------------------------------------
// 3 × 3 Round-Trip — Stammdaten + Aktenzeichen + Behörde + bescheid-Datum.
// --------------------------------------------------------------------------

const SKELETT_TEMPLATES = [
  'rechtsbehelf_einspruch_skelett',
  'rechtsbehelf_widerspruch_skelett',
  'aussetzung_vollziehung_skelett',
] as const;

describe('V1.5.1 Skelett-Templates — Resolver-Round-Trip × 3 Personas', () => {
  for (const [personaKey, anchor] of Object.entries(ANCHORS)) {
    describe(`persona: ${personaKey} (${anchor.personaId})`, () => {
      beforeEach(() => {
        switchToPersona(anchor.personaId);
      });

      for (const templateId of SKELETT_TEMPLATES) {
        test(`${templateId} resolves Stammdaten + Aktenzeichen + Behörde + datum_bescheid`, async () => {
          // Erwartete Daten aus dem GESEEDETEN Brief ableiten (Sentinel-Briefe
          // lösen Seed-Anker-relativ auf, siehe ANCHORS-Kommentar).
          const letter = await api.getLetterById(anchor.letterId);
          if (!letter?.bescheid_dated_at) {
            throw new Error(`Anchor-Letter ${anchor.letterId} ohne bescheid_dated_at`);
          }
          const bescheidDatedAtDe = formatDateDe(letter.bescheid_dated_at);
          const empfangenAmDe = formatDateDe(letter.empfangen_am);

          const body = await api.resolveReplyBody({
            personaId: anchor.personaId,
            letterId: anchor.letterId,
            templateId,
          });

          // Persona / Letter / Behörde:
          expect(body).toContain(anchor.nachname);
          expect(body).toContain(anchor.aktenzeichen);
          expect(body).toContain(anchor.behoerdenName);

          // {datum_bescheid} muss aus letter.bescheid_dated_at resolven, NICHT
          // aus letter.empfangen_am — das ist die V1.5.1-Hard-Line § 11.9.
          expect(body).toContain(bescheidDatedAtDe);
          expect(body).not.toContain(empfangenAmDe);

          // Keine offenen `{token}`-Patterns:
          expect(body).not.toMatch(LEFTOVER_TOKEN_RE);
        });
      }
    });
  }
});

// --------------------------------------------------------------------------
// Hard-Line § 11.2: Zero `§`-Symbole im Skelett-Body.
// --------------------------------------------------------------------------

describe('V1.5.1 Skelett-Templates — Spec § 11.2 Zero `§` im Body', () => {
  beforeEach(() => {
    switchToPersona('mehmet-yildiz');
  });

  for (const templateId of SKELETT_TEMPLATES) {
    test(`${templateId} body contains zero § symbols`, async () => {
      const body = await api.resolveReplyBody({
        personaId: 'mehmet-yildiz',
        letterId: 'letter-mehmet-fa-steuerbescheid-2024',
        templateId,
      });
      // RDG/Spec-Hard-Line: § darf nur in Modal-Body / Disclaimer / Frist-
      // Cited-Format leben, niemals im Skelett-Body selbst.
      expect(body).not.toMatch(/§/);
    });
  }
});

// --------------------------------------------------------------------------
// Hard-Line § 11.3: Kein „Begründung reiche ich gesondert nach"-Selbst-Bindung.
// RDG-Cleanliness: keine „aufschiebende Wirkung" / „Erfolg" / „ernstliche Zweifel".
// --------------------------------------------------------------------------

describe('V1.5.1 Skelett-Templates — RDG-Cleanliness (Spec § 11.3, Domain § 4)', () => {
  beforeEach(() => {
    switchToPersona('mehmet-yildiz');
  });

  for (const templateId of SKELETT_TEMPLATES) {
    test(`${templateId} body trägt keine Selbst-Bindungs- oder Erfolgs-Wendungen`, async () => {
      const body = await api.resolveReplyBody({
        personaId: 'mehmet-yildiz',
        letterId: 'letter-mehmet-fa-steuerbescheid-2024',
        templateId,
      });
      // Verbotene Phrasen (Spec § 11.3 + RDG-Linie):
      expect(body).not.toMatch(/Begründung\s+reiche\s+ich\s+gesondert\s+nach/i);
      expect(body).not.toMatch(/aufschiebende\s+Wirkung/i);
      expect(body).not.toMatch(/Erfolg/i);
      expect(body).not.toMatch(/ernstliche\s+Zweifel/i);
      expect(body).not.toMatch(/Bewertung/i);
    });
  }
});

// --------------------------------------------------------------------------
// Fallback-Test: bescheid_dated_at undefined → datum_bescheid = empfangen_am.
// --------------------------------------------------------------------------

describe('V1.5.1 Skelett-Templates — Fallback bei fehlendem bescheid_dated_at', () => {
  test('synthetic letter ohne bescheid_dated_at → datum_bescheid fällt auf empfangen_am zurück', () => {
    // Wir nutzen den synchronen Resolver, weil wir das zeitliche Verhalten von
    // withLatency hier nicht brauchen. Voraussetzung: Anna-Letters sind im
    // Storage; wir reseed.
    switchToPersona('anna-petrov');

    // letter-buergeramt-meldebestaetigung-anmeldung hat KEIN bescheid_dated_at
    // (Bestätigung, kein Bescheid). Wenn wir trotzdem das Skelett rendern,
    // muss der Fallback auf empfangen_am greifen.
    const body = resolveReplyBodySync({
      personaId: 'anna-petrov',
      letterId: 'letter-buergeramt-meldebestaetigung-anmeldung',
      templateId: 'rechtsbehelf_einspruch_skelett',
    });

    // empfangen_am: 2024-09-19 → 19.09.2024
    expect(body).toContain('19.09.2024');
    expect(body).not.toMatch(LEFTOVER_TOKEN_RE);
  });
});

// --------------------------------------------------------------------------
// Sanity-Check: V1.5.0-Resolver bleibt unverändert (Spec § 11.9).
// {datum_letter} weiterhin aus letter.empfangen_am.
// --------------------------------------------------------------------------

describe('V1.5.0 Resolver — Spec § 11.9 Hard-Line: {datum_letter} unverändert', () => {
  test('informative_rueckmeldung resolves {datum_letter} aus empfangen_am, nicht bescheid_dated_at', async () => {
    switchToPersona('mehmet-yildiz');
    // letter-mehmet-fa-steuerbescheid-2024 trägt @now-Sentinels (empfangen_am
    // @now-6d, bescheid_dated_at @now-10d) — erwartete DE-Strings aus dem
    // geseedeten Brief ableiten. V1.5.0-Templates verweisen auf
    // {datum_letter} = empfangen_am.
    const letter = await api.getLetterById('letter-mehmet-fa-steuerbescheid-2024');
    if (!letter?.bescheid_dated_at) throw new Error('Anchor-Letter ohne bescheid_dated_at');
    const body = await api.resolveReplyBody({
      personaId: 'mehmet-yildiz',
      letterId: 'letter-mehmet-fa-steuerbescheid-2024',
      templateId: 'informative_rueckmeldung',
      userInput: { rueckmeldung_text: 'Sanity-check.' },
    });
    expect(body).toContain(formatDateDe(letter.empfangen_am)); // empfangen_am-DE
    expect(body).not.toContain(formatDateDe(letter.bescheid_dated_at)); // NICHT bescheid_dated_at
  });
});
