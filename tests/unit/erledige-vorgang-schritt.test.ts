/**
 * `api.erledigeVorgangSchritt` — generischer Bürger:innen-Schritt-Abschluss (WoW-1).
 *
 * Backs den „Schritt erledigen"-Button auf dem Vorgang-Detail-Screen, z. B. den
 * Familienkasse-Schritt „Nachweis zur Fortzahlung einreichen" im geseedeten
 * Vorgang `vorgang-anna-kindergeld-aktualisierung-2026`.
 *
 * Coverage:
 *  (a) pending/self_assigned → confirmed + completed_at gesetzt
 *  (b) idempotent: zweiter Aufruf wirft nicht, bleibt confirmed
 *  (c) unbekannter Vorgang → MockBackendError(VORGANG_NOT_FOUND)
 *  (d) unbekannter Schritt → MockBackendError(STEP_NOT_FOUND)
 *  (e) vorgang.status bleibt unverändert (Behörde prüft weiter)
 *  (+) emittiert `autopilot_step` für Live-Subscriber
 *
 * Setup spiegelt `reply-roundtrip.test.ts`: In-Memory-localStorage + window-Stub
 * vor dem Import von api.ts; `NEXT_PUBLIC_RELIABLE='1'` deaktiviert die
 * 5%-Fehler-Injektion in latency.ts.
 */
import { afterEach, beforeAll, beforeEach, describe, expect, test } from 'vitest';
import type { MockBackendEvent } from '@/types';

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

beforeEach(() => {
  // Anna Petrov ist die Default-Persona; sie hat den Kindergeld-Vorgang mit dem
  // self_assigned-Block-C-Schritt.
  reseedForActivePersona('anna-petrov');
});

afterEach(() => {
  if (typeof window !== 'undefined' && window.localStorage) {
    window.localStorage.removeItem('govtech-de:v1:vorgaenge');
  }
});

// --------------------------------------------------------------------------
// Konstanten (geseedeter Block-C-Schritt — KEIN Block D)
// --------------------------------------------------------------------------

const VORGANG_ID = 'vorgang-anna-kindergeld-aktualisierung-2026';
const SCHRITT_ID = 'step-kindergeld-2026-nachweis-schulbescheinigung';

// --------------------------------------------------------------------------
// Tests
// --------------------------------------------------------------------------

describe('api.erledigeVorgangSchritt', () => {
  test('(a) self_assigned step → confirmed + completed_at gesetzt', async () => {
    const before = await api.getVorgang(VORGANG_ID);
    const stepBefore = before.schritte.find((s) => s.id === SCHRITT_ID);
    expect(stepBefore?.status).toBe('self_assigned');
    expect(stepBefore?.completed_at).toBeUndefined();

    await api.erledigeVorgangSchritt(VORGANG_ID, SCHRITT_ID);

    const after = await api.getVorgang(VORGANG_ID);
    const stepAfter = after.schritte.find((s) => s.id === SCHRITT_ID);
    expect(stepAfter?.status).toBe('confirmed');
    expect(stepAfter?.completed_at).toBeTruthy();
    expect(() => new Date(stepAfter!.completed_at as string).toISOString()).not.toThrow();
  });

  test('(a+) andere Schritte des Vorgangs bleiben unangetastet', async () => {
    const before = await api.getVorgang(VORGANG_ID);
    const otherBefore = before.schritte
      .filter((s) => s.id !== SCHRITT_ID)
      .map((s) => ({ id: s.id, status: s.status }));

    await api.erledigeVorgangSchritt(VORGANG_ID, SCHRITT_ID);

    const after = await api.getVorgang(VORGANG_ID);
    const otherAfter = after.schritte
      .filter((s) => s.id !== SCHRITT_ID)
      .map((s) => ({ id: s.id, status: s.status }));
    expect(otherAfter).toEqual(otherBefore);
  });

  test('(b) idempotent: zweiter Aufruf wirft nicht, bleibt confirmed', async () => {
    await api.erledigeVorgangSchritt(VORGANG_ID, SCHRITT_ID);
    const first = await api.getVorgang(VORGANG_ID);
    const completedAtFirst = first.schritte.find((s) => s.id === SCHRITT_ID)?.completed_at;

    await expect(
      api.erledigeVorgangSchritt(VORGANG_ID, SCHRITT_ID),
    ).resolves.toBeUndefined();

    const second = await api.getVorgang(VORGANG_ID);
    const stepSecond = second.schritte.find((s) => s.id === SCHRITT_ID);
    expect(stepSecond?.status).toBe('confirmed');
    // Idempotent: completed_at wurde beim zweiten Aufruf NICHT überschrieben.
    expect(stepSecond?.completed_at).toBe(completedAtFirst);
  });

  test('(c) unbekannter Vorgang → VORGANG_NOT_FOUND', async () => {
    await expect(
      api.erledigeVorgangSchritt('vorgang-existiert-nicht', SCHRITT_ID),
    ).rejects.toMatchObject({ code: 'VORGANG_NOT_FOUND', retryable: false });
    await expect(
      api.erledigeVorgangSchritt('vorgang-existiert-nicht', SCHRITT_ID),
    ).rejects.toBeInstanceOf(MockBackendError);
  });

  test('(d) unbekannter Schritt → STEP_NOT_FOUND', async () => {
    await expect(
      api.erledigeVorgangSchritt(VORGANG_ID, 'step-existiert-nicht'),
    ).rejects.toMatchObject({ code: 'STEP_NOT_FOUND', retryable: false });
  });

  test('(e) vorgang.status bleibt unverändert (Behörde prüft weiter)', async () => {
    const before = await api.getVorgang(VORGANG_ID);
    expect(before.status).toBe('in_pruefung');

    await api.erledigeVorgangSchritt(VORGANG_ID, SCHRITT_ID);

    const after = await api.getVorgang(VORGANG_ID);
    expect(after.status).toBe('in_pruefung');
    expect(after.abgeschlossen_am).toBeUndefined();
  });

  test('(+) emittiert autopilot_step für den erledigten Schritt', async () => {
    const events: MockBackendEvent[] = [];
    const unsubscribe = api.subscribe((e) => events.push(e));
    try {
      await api.erledigeVorgangSchritt(VORGANG_ID, SCHRITT_ID);
    } finally {
      unsubscribe();
    }

    const stepEvent = events.find(
      (e): e is Extract<MockBackendEvent, { type: 'autopilot_step' }> =>
        e.type === 'autopilot_step' &&
        e.vorgangId === VORGANG_ID &&
        e.step.id === SCHRITT_ID,
    );
    expect(stepEvent).toBeDefined();
    expect(stepEvent?.step.status).toBe('confirmed');
  });
});
