/**
 * `api.starteVorgangSchritt` — Vertragstests (Spec vorgang-schritt-autopilot.md §2/§5).
 *
 * Das System vollzieht einen geseedeten Bürger-Schritt SELBST; der Bürger
 * autorisiert per Ein-Tap. Diese Funktion wird nur NACH der Dialog-Autorisierung
 * aufgerufen und deckt alle vier geseedeten Confirm-Typen ab:
 *  - eID-Schritt   (Anna, Kindergeld-Nachweis / Elterngeld / Steuer / Vorauszahlung)
 *  - Einwilligung  (Schmidt, Familienversicherung Mia)
 *  - Termin        (Schmidt, Führerschein-Umtausch — Ausnahme #6, kein eID/Consent)
 *
 * Coverage (§5-Gates):
 *  - Statusfolge needs_eid/self_assigned → in_progress → confirmed (Event-Sequenz)
 *  - Gate-Stempel je Flag (eid_confirmed_at / consent_given_at; Termin: keiner)
 *  - Brief-Mint-Determinismus (deterministische ID) + Idempotenz (kein 2. Brief)
 *  - Mint ist BESTÄTIGUNG, nie Bescheid; [MOCK]-Footer; realistische Az.
 *  - Vorgang-Gesamtstatus unverändert (Behörde prüft weiter)
 *  - Fehlerpfad: not-found (non-retryable) + Boundary-Fehler lässt Schritt unangetastet
 *  - eid_preview (#5) vorhanden; Termin-Ausnahme (#6) ohne eID/Consent-Stempel
 *
 * Setup spiegelt die vorherige `erledige-vorgang-schritt`-Datei: In-Memory-
 * localStorage + window-Stub vor dem Import von api.ts; `NEXT_PUBLIC_RELIABLE='1'`
 * deaktiviert die 5%-Fehler-Injektion in latency.ts.
 */
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  test,
  vi,
} from 'vitest';
import type { Letter } from '@/types';

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

let api: typeof import('@/lib/mock-backend/test-core').api;
let MockBackendError: typeof import('@/lib/mock-backend/test-core').MockBackendError;
let reseedForActivePersona: typeof import('@/lib/mock-backend/test-core').reseedForActivePersona;

beforeAll(async () => {
  const mod = await import('@/lib/mock-backend/test-core');
  api = mod.api;
  MockBackendError = mod.MockBackendError;
  reseedForActivePersona = mod.reseedForActivePersona;
});

// Ein voller Lauf = withLatency (300–800 ms) + wait (1200–1600 ms) + Read-Calls;
// großzügiges Test-Timeout gegen Flakes.
const RUN_TIMEOUT = 20_000;

const letterId = (vorgangId: string, stepId: string): string =>
  `letter-${vorgangId}-${stepId}-eingang`;

async function findMinted(
  vorgangId: string,
  stepId: string,
): Promise<Letter | undefined> {
  const letters = await api.getLetters();
  return letters.find((l) => l.id === letterId(vorgangId, stepId));
}

// ==========================================================================
// eID-Schritt (Anna, Kindergeld-Fortzahlungs-Nachweis)
// ==========================================================================

describe('starteVorgangSchritt — eID-Schritt (needs_eid): Anna Kindergeld-Nachweis', () => {
  const VG = 'vorgang-anna-kindergeld-aktualisierung-2026';
  const STEP = 'step-kindergeld-2026-nachweis-schulbescheinigung';

  beforeEach(() => reseedForActivePersona('anna-petrov'));

  test(
    'needs_eid → confirmed; setzt eid_confirmed_at + completed_at + letter_id, kein consent_given_at',
    async () => {
      const before = await api.getVorgang(VG);
      expect(before.schritte.find((s) => s.id === STEP)?.status).toBe('needs_eid');

      await api.starteVorgangSchritt(VG, STEP);

      const after = await api.getVorgang(VG);
      const step = after.schritte.find((s) => s.id === STEP);
      expect(step?.status).toBe('confirmed');
      expect(step?.eid_confirmed_at).toBeTruthy();
      expect(step?.completed_at).toBeTruthy();
      expect(step?.consent_given_at).toBeUndefined();
      expect(step?.letter_id).toBe(letterId(VG, STEP));
    },
    RUN_TIMEOUT,
  );

  test(
    'Statusfolge needs_eid → in_progress → confirmed (autopilot_step-Events)',
    async () => {
      const statuses: string[] = [];
      const unsub = api.subscribe((e) => {
        if (
          e.type === 'autopilot_step' &&
          e.vorgangId === VG &&
          e.step.id === STEP
        ) {
          statuses.push(e.step.status);
        }
      });
      try {
        await api.starteVorgangSchritt(VG, STEP);
      } finally {
        unsub();
      }
      expect(statuses).toEqual(['in_progress', 'confirmed']);
    },
    RUN_TIMEOUT,
  );

  test(
    'Brief-Mint: Eingangsbestätigung der Familienkasse landet ungelesen im Posteingang; kein Bescheid',
    async () => {
      expect(await findMinted(VG, STEP)).toBeUndefined();

      await api.starteVorgangSchritt(VG, STEP);

      const minted = await findMinted(VG, STEP);
      expect(minted).toBeDefined();
      expect(minted?.absender_behoerde_id).toBe('familienkasse-berlin-brandenburg');
      expect(minted?.status).toBe('ungelesen');
      expect(minted?.vorgang_id).toBe(VG);
      expect(minted?.aktenzeichen).toBe('[MOCK] 115FK668412');
      expect(minted?.body_de).toContain('[MOCK');
      // Ehrlichkeits-Guardrail: Eingangs-BESTÄTIGUNG, nie Bescheid.
      expect(minted?.betreff.toLowerCase()).not.toContain('bescheid');
      expect(minted?.body_de).toContain('kein Bescheid');
      expect(minted?.betrag_cent).toBeUndefined();
    },
    RUN_TIMEOUT,
  );

  test(
    'Idempotenz: Doppel-Confirm mintet keinen 2. Brief und lässt den Schritt confirmed',
    async () => {
      await api.starteVorgangSchritt(VG, STEP);
      const afterFirst = await api.getLetters();
      expect(
        afterFirst.filter((l) => l.id === letterId(VG, STEP)).length,
      ).toBe(1);

      await expect(api.starteVorgangSchritt(VG, STEP)).resolves.toBeUndefined();

      const afterSecond = await api.getLetters();
      expect(
        afterSecond.filter((l) => l.id === letterId(VG, STEP)).length,
      ).toBe(1);
      const step = (await api.getVorgang(VG)).schritte.find((s) => s.id === STEP);
      expect(step?.status).toBe('confirmed');
    },
    RUN_TIMEOUT,
  );

  test(
    'Vorgang-Gesamtstatus bleibt unverändert (Behörde prüft weiter)',
    async () => {
      const before = await api.getVorgang(VG);
      await api.starteVorgangSchritt(VG, STEP);
      const after = await api.getVorgang(VG);
      expect(after.status).toBe(before.status);
      expect(after.abgeschlossen_am).toBeUndefined();
    },
    RUN_TIMEOUT,
  );

  test(
    'andere Schritte des Vorgangs bleiben unangetastet',
    async () => {
      const before = await api.getVorgang(VG);
      const otherBefore = before.schritte
        .filter((s) => s.id !== STEP)
        .map((s) => ({ id: s.id, status: s.status }));

      await api.starteVorgangSchritt(VG, STEP);

      const after = await api.getVorgang(VG);
      const otherAfter = after.schritte
        .filter((s) => s.id !== STEP)
        .map((s) => ({ id: s.id, status: s.status }));
      expect(otherAfter).toEqual(otherBefore);
    },
    RUN_TIMEOUT,
  );
});

// ==========================================================================
// Einwilligungs-Schritt (Schmidt, Familienversicherung Mia)
// ==========================================================================

describe('starteVorgangSchritt — Einwilligung (self_assigned + requires_consent): Schmidt TK', () => {
  const VG = 'vg-schmidt-kindergeburt-mia-2026';
  const STEP = 'step-mia-krankenkasse';

  beforeEach(() => reseedForActivePersona('markus-schmidt'));

  test(
    'self_assigned → confirmed; setzt consent_given_at, KEIN eid_confirmed_at',
    async () => {
      const before = await api.getVorgang(VG);
      expect(before.schritte.find((s) => s.id === STEP)?.status).toBe(
        'self_assigned',
      );

      await api.starteVorgangSchritt(VG, STEP);

      const step = (await api.getVorgang(VG)).schritte.find((s) => s.id === STEP);
      expect(step?.status).toBe('confirmed');
      expect(step?.consent_given_at).toBeTruthy();
      expect(step?.eid_confirmed_at).toBeUndefined();
    },
    RUN_TIMEOUT,
  );

  test(
    'Familienversicherungs-Bestätigung § 10 SGB V (Status-Bestätigung, kein Bescheid)',
    async () => {
      await api.starteVorgangSchritt(VG, STEP);
      const minted = await findMinted(VG, STEP);
      expect(minted?.absender_behoerde_id).toBe('tk-hamburg');
      expect(minted?.betreff).toContain('Familienversicherung');
      expect(minted?.betreff.toLowerCase()).not.toContain('bescheid');
      expect(minted?.body_de).toContain('§ 10 SGB V');
      expect(minted?.body_de).toContain('[MOCK');
    },
    RUN_TIMEOUT,
  );
});

// ==========================================================================
// Termin-Ausnahme #6 (Schmidt, Führerschein-Umtausch)
// ==========================================================================

describe('starteVorgangSchritt — Termin-Ausnahme #6 (requires_termin): Schmidt Führerschein', () => {
  const VG = 'vg-schmidt-fuehrerschein-umtausch-2026';
  const STEP = 'step-schmidt-fs-umtausch-unterlagen';

  beforeEach(() => reseedForActivePersona('markus-schmidt'));

  test(
    'self_assigned → confirmed; KEIN eid/consent-Stempel (Termin-Systemleistung)',
    async () => {
      const before = await api.getVorgang(VG);
      const seed = before.schritte.find((s) => s.id === STEP);
      expect(seed?.requires_termin).toBe(true);
      expect(seed?.status).toBe('self_assigned');

      await api.starteVorgangSchritt(VG, STEP);

      const step = (await api.getVorgang(VG)).schritte.find((s) => s.id === STEP);
      expect(step?.status).toBe('confirmed');
      expect(step?.completed_at).toBeTruthy();
      expect(step?.eid_confirmed_at).toBeUndefined();
      expect(step?.consent_given_at).toBeUndefined();
    },
    RUN_TIMEOUT,
  );

  test(
    'Terminbestätigung mit Mitbringliste — kein Bescheid, kein gefakter Vollzug',
    async () => {
      await api.starteVorgangSchritt(VG, STEP);
      const minted = await findMinted(VG, STEP);
      expect(minted?.absender_behoerde_id).toBe('fe-hamburg-lbv');
      expect(minted?.betreff).toContain('Terminbestätigung');
      expect(minted?.betreff.toLowerCase()).not.toContain('bescheid');
      expect(minted?.body_de).toContain('Führerschein');
      expect(minted?.body_de).toContain('Lichtbild');
      expect(minted?.betrag_cent).toBeUndefined();
    },
    RUN_TIMEOUT,
  );
});

// ==========================================================================
// Steuer-Zahlung #5 (Mehmet) — eid_preview + „angewiesen", nie „ausgeglichen"
// ==========================================================================

describe('starteVorgangSchritt — Steuer-Zahlung #5 (eid_preview): Mehmet', () => {
  const VG = 'vg-mehmet-steuererklaerung-2024';
  const STEP = 'step-mehmet-steuer-zahlung';

  beforeEach(() => reseedForActivePersona('mehmet-yildiz'));

  test(
    'eid_preview vorhanden; Zahlungsbestätigung „angewiesen" — kein „ausgeglichen"',
    async () => {
      const before = await api.getVorgang(VG);
      expect(before.schritte.find((s) => s.id === STEP)?.eid_preview).toBeTruthy();

      await api.starteVorgangSchritt(VG, STEP);

      const minted = await findMinted(VG, STEP);
      expect(minted?.betreff).toContain('Zahlungsbestätigung');
      expect(minted?.body_de).toContain('angewiesen');
      expect(minted?.body_de.toLowerCase()).not.toContain('ausgeglichen');
      expect(minted?.betreff.toLowerCase()).not.toContain('bescheid');
    },
    RUN_TIMEOUT,
  );
});

// ==========================================================================
// Reminder-Resolution (termine-uebergaben.md § 10) — der Nachweis-Schritt IST
// die Fristerfüllung → verknüpfte Nachweis-Frist wird erledigt.
// ==========================================================================

describe('starteVorgangSchritt — Reminder-Resolution (§10): Anna Kindergeld-Nachweis', () => {
  const VG = 'vorgang-anna-kindergeld-aktualisierung-2026';
  const STEP = 'step-kindergeld-2026-nachweis-schulbescheinigung';
  const NACHWEIS_REMINDER = 'reminder-anna-kindergeld-nachweis'; // frist_typ 'nachweis', gleicher Vorgang
  const FREMD_REMINDER = 'reminder-anna-aufenthaltstitel-unterlagen'; // anderer Vorgang

  beforeEach(() => reseedForActivePersona('anna-petrov'));

  test(
    'verknüpfte Nachweis-Frist wird erledigt; Schritt confirmed; genau 1 Bestätigungsbrief',
    async () => {
      const before = (await api.getReminders()).find(
        (r) => r.id === NACHWEIS_REMINDER,
      );
      expect(before).toBeDefined();
      expect(before?.erledigt).toBeFalsy();

      await api.starteVorgangSchritt(VG, STEP);

      const rem = (await api.getReminders()).find((r) => r.id === NACHWEIS_REMINDER);
      expect(rem?.erledigt).toBe(true);
      const step = (await api.getVorgang(VG)).schritte.find((s) => s.id === STEP);
      expect(step?.status).toBe('confirmed');
      expect(
        (await api.getLetters()).filter((l) => l.id === letterId(VG, STEP)).length,
      ).toBe(1);
    },
    RUN_TIMEOUT,
  );

  test(
    'idempotent: Doppel-Confirm hält die Frist erledigt und mintet keinen 2. Brief',
    async () => {
      await api.starteVorgangSchritt(VG, STEP);
      await api.starteVorgangSchritt(VG, STEP);

      const rem = (await api.getReminders()).find((r) => r.id === NACHWEIS_REMINDER);
      expect(rem?.erledigt).toBe(true);
      expect(
        (await api.getLetters()).filter((l) => l.id === letterId(VG, STEP)).length,
      ).toBe(1);
    },
    RUN_TIMEOUT,
  );

  test(
    'Reminder mit fremder vorgang_id bleibt unberührt',
    async () => {
      await api.starteVorgangSchritt(VG, STEP);
      const fremd = (await api.getReminders()).find((r) => r.id === FREMD_REMINDER);
      expect(fremd).toBeDefined();
      expect(fremd?.erledigt).toBeFalsy();
    },
    RUN_TIMEOUT,
  );
});

describe('starteVorgangSchritt — Reminder-Resolution (§10): zahlung-Frist bleibt unberührt (Mehmet)', () => {
  const VG = 'vg-mehmet-steuererklaerung-2024';
  const STEP = 'step-mehmet-steuer-zahlung';
  const ZAHLUNG_REMINDER = 'reminder-mehmet-steuer-zahlung'; // gleicher Vorgang, aber frist_typ 'zahlung'

  beforeEach(() => reseedForActivePersona('mehmet-yildiz'));

  test(
    'gleicher Vorgang, aber frist_typ zahlung → NICHT erledigt (nur Nachweis-Fristen)',
    async () => {
      await api.starteVorgangSchritt(VG, STEP);

      const rem = (await api.getReminders()).find((r) => r.id === ZAHLUNG_REMINDER);
      expect(rem).toBeDefined();
      expect(rem?.erledigt).toBeFalsy();
      // Der Schritt selbst ist trotzdem vollzogen.
      const step = (await api.getVorgang(VG)).schritte.find((s) => s.id === STEP);
      expect(step?.status).toBe('confirmed');
    },
    RUN_TIMEOUT,
  );
});

// ==========================================================================
// Bündelungs-Dismiss (termine-uebergaben.md § 7.4/§ 9.3) — deviceLocal,
// persona-scoped Liste dismisster später-Termin-IDs (mirror Wohngeld-Muster).
// ==========================================================================

describe('dismissTerminBundling / getTerminBundlingDismissed (§7.4/§9.3)', () => {
  // Booted-Store; synthetische Persona-IDs (PersonaId = string) isolieren die
  // Buckets ohne Reset-API (der Bucket wird beim Reseed bewusst NICHT geleert).
  beforeEach(() => reseedForActivePersona('anna-petrov'));

  test(
    'persistiert + persona-scoped',
    async () => {
      const persona = 'bundle-persona-a';
      expect(await api.getTerminBundlingDismissed(persona)).toEqual([]);

      await api.dismissTerminBundling(persona, 'termin-spaeter-1');

      expect(await api.getTerminBundlingDismissed(persona)).toEqual([
        'termin-spaeter-1',
      ]);
      // Andere Persona bleibt unberührt (persona-scoped im Record).
      expect(await api.getTerminBundlingDismissed('bundle-persona-b')).toEqual([]);
    },
    RUN_TIMEOUT,
  );

  test(
    'additive Liste, de-dupliziert',
    async () => {
      const persona = 'bundle-persona-c';
      await api.dismissTerminBundling(persona, 't-1');
      await api.dismissTerminBundling(persona, 't-2');
      expect(await api.getTerminBundlingDismissed(persona)).toEqual(['t-1', 't-2']);

      // Gleiche ID erneut → kein Duplikat.
      await api.dismissTerminBundling(persona, 't-1');
      expect(await api.getTerminBundlingDismissed(persona)).toEqual(['t-1', 't-2']);
    },
    RUN_TIMEOUT,
  );

  test(
    'überlebt Persona-Wechsel (deviceLocal, seedForPersona setzt nicht zurück)',
    async () => {
      const persona = 'bundle-persona-d';
      await api.dismissTerminBundling(persona, 't-x');

      reseedForActivePersona('markus-schmidt');
      reseedForActivePersona('anna-petrov');

      expect(await api.getTerminBundlingDismissed(persona)).toEqual(['t-x']);
    },
    RUN_TIMEOUT,
  );
});

// ==========================================================================
// Fehlerpfad
// ==========================================================================

describe('starteVorgangSchritt — Fehlerpfad', () => {
  const VG = 'vorgang-anna-kindergeld-aktualisierung-2026';
  const STEP = 'step-kindergeld-2026-nachweis-schulbescheinigung';

  beforeEach(() => reseedForActivePersona('anna-petrov'));
  afterAll(() => {
    process.env.NEXT_PUBLIC_RELIABLE = '1';
  });

  test('unbekannter Vorgang → VORGANG_NOT_FOUND (non-retryable)', async () => {
    await expect(
      api.starteVorgangSchritt('vorgang-existiert-nicht', STEP),
    ).rejects.toMatchObject({ code: 'VORGANG_NOT_FOUND', retryable: false });
    await expect(
      api.starteVorgangSchritt('vorgang-existiert-nicht', STEP),
    ).rejects.toBeInstanceOf(MockBackendError);
  });

  test('unbekannter Schritt → STEP_NOT_FOUND (non-retryable)', async () => {
    await expect(
      api.starteVorgangSchritt(VG, 'step-existiert-nicht'),
    ).rejects.toMatchObject({ code: 'STEP_NOT_FOUND', retryable: false });
  });

  test(
    'Boundary-Fehler (5% am äußeren Rand) lässt den Schritt unangetastet — kein halb-vollzogener Zustand',
    async () => {
      // Fehler-Injektion in withLatency deterministisch erzwingen: Reliable-Mode
      // aus + Math.random unter der 5%-Schwelle → Fehler VOR jeder Statusänderung.
      const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0.01);
      process.env.NEXT_PUBLIC_RELIABLE = '0';
      try {
        await expect(
          api.starteVorgangSchritt(VG, STEP),
        ).rejects.toBeInstanceOf(MockBackendError);
      } finally {
        randomSpy.mockRestore();
        process.env.NEXT_PUBLIC_RELIABLE = '1';
      }

      const step = (await api.getVorgang(VG)).schritte.find((s) => s.id === STEP);
      expect(step?.status).toBe('needs_eid'); // unverändert
      expect(step?.eid_confirmed_at).toBeUndefined();
      expect(await findMinted(VG, STEP)).toBeUndefined();
    },
  );
});
