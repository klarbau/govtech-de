/**
 * Aufenthaltstitel-Frist-Nudge — Dismiss/Snooze-Persistenz (wow-backlog #10)
 * + persona-scoped Autopilot-Katalog (#15).
 *
 * Coverage:
 *   - `dismissAufenthaltFristNudge` → Nudge bleibt unterdrückt (Reload-fest).
 *   - `snoozeAufenthaltFristNudge` → Nudge unterdrückt, solange Snooze läuft.
 *   - Dismiss ist persona-lokal (eine Persona unterdrückt ≠ die andere).
 *   - `getAutopilotKatalog` löst die Berlin-Seed-Slugs gegen den Wohnort der
 *     aktiven Persona auf — Mehmet (Köln) ≠ Berlin; Anna (Berlin) unverändert.
 */
import { afterEach, beforeAll, beforeEach, describe, expect, test } from 'vitest';

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
  const sessionStorage = new MemoryStorage();
  process.env.NEXT_PUBLIC_RELIABLE = '1';
  Object.defineProperty(globalThis, 'window', {
    value: { localStorage: storage, sessionStorage, location: { search: '' } },
    writable: true,
    configurable: true,
  });
  Object.defineProperty(globalThis, 'localStorage', {
    value: storage,
    writable: true,
    configurable: true,
  });
  Object.defineProperty(globalThis, 'sessionStorage', {
    value: sessionStorage,
    writable: true,
    configurable: true,
  });
});

let api: typeof import('@/lib/mock-backend/test-core').api;
let reseedForActivePersona: typeof import('@/lib/mock-backend/test-core').reseedForActivePersona;

beforeAll(async () => {
  const mod = await import('@/lib/mock-backend/test-core');
  api = mod.api;
  reseedForActivePersona = mod.reseedForActivePersona;
});

beforeEach(() => {
  reseedForActivePersona('anna-petrov');
});

afterEach(() => {
  if (typeof window !== 'undefined' && window.localStorage) {
    [
      'govtech-de:v1:aufenthalt-frist-nudge:dismissed',
      'govtech-de:v1:aufenthalt-frist-nudge:snoozed-until',
    ].forEach((k) => window.localStorage.removeItem(k));
  }
});

describe('AufenthaltFristNudge — Dismiss/Snooze-Persistenz', () => {
  test('Default: nicht unterdrückt', async () => {
    expect(await api.isAufenthaltFristNudgeSuppressed('anna-petrov')).toBe(false);
  });

  test('dismiss → dauerhaft unterdrückt (Reload-fest)', async () => {
    await api.dismissAufenthaltFristNudge('anna-petrov');
    expect(await api.isAufenthaltFristNudgeSuppressed('anna-petrov')).toBe(true);
  });

  test('snooze (30 Tage) → unterdrückt, solange der Snooze läuft', async () => {
    await api.snoozeAufenthaltFristNudge('anna-petrov', 30);
    expect(await api.isAufenthaltFristNudgeSuppressed('anna-petrov')).toBe(true);
  });

  test('snooze mit 0 Tagen / Vergangenheit unterdrückt NICHT', async () => {
    await api.snoozeAufenthaltFristNudge('anna-petrov', -1);
    expect(await api.isAufenthaltFristNudgeSuppressed('anna-petrov')).toBe(false);
  });

  test('Dismiss ist persona-lokal', async () => {
    await api.dismissAufenthaltFristNudge('anna-petrov');
    expect(await api.isAufenthaltFristNudgeSuppressed('anna-petrov')).toBe(true);
    expect(await api.isAufenthaltFristNudgeSuppressed('mehmet-yildiz')).toBe(false);
  });
});

describe('getAutopilotKatalog — persona-scoped (#15)', () => {
  test('Mehmet (Köln): Kölner Stellen statt Berlin', async () => {
    reseedForActivePersona('mehmet-yildiz');
    const katalog = await api.getAutopilotKatalog();
    const umzug = katalog.find((e) => e.id === 'umzug');
    expect(umzug).toBeDefined();
    // Kölner Stellen aufgelöst …
    expect(umzug!.behoerden_preview).toContain('finanzamt-koeln-mitte');
    expect(umzug!.behoerden_preview).toContain('kfz-koeln-stadt');
    expect(umzug!.behoerden_preview).toContain('abh-koeln');
    // … und KEIN ortsgebundener Berlin-Slug mehr.
    expect(umzug!.behoerden_preview).not.toContain('buergeramt-berlin-mitte');
    expect(umzug!.behoerden_preview).not.toContain('finanzamt-berlin-mitte-tiergarten');
    expect(umzug!.behoerden_preview).not.toContain('kfz-berlin-labo');
    expect(umzug!.behoerden_preview).not.toContain('abh-berlin-lea');

    const steuer = katalog.find((e) => e.id === 'steuererklaerung');
    expect(steuer!.behoerden_preview).toEqual(['finanzamt-koeln-mitte']);
  });

  test('Anna (Berlin): Berlin-Slugs unverändert', async () => {
    reseedForActivePersona('anna-petrov');
    const katalog = await api.getAutopilotKatalog();
    const umzug = katalog.find((e) => e.id === 'umzug');
    expect(umzug!.behoerden_preview).toContain('buergeramt-berlin-mitte');
    expect(umzug!.behoerden_preview).toContain('finanzamt-berlin-mitte-tiergarten');
    expect(umzug!.behoerden_preview).toContain('abh-berlin-lea');
  });
});
