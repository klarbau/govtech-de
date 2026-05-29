/**
 * V1.1 — Mehmet Track C Empty-State (Hard-Line § 11.24).
 *
 * Coverage:
 *  - Mehmet-Persona hat `renten_track === 'C'`.
 *  - getAltersvorsorge('mehmet-yildiz') returns
 *      { track: 'C', eckdaten: undefined, yellow_letter_id: undefined }.
 *  - Posteingang enthält KEINEN renteninfo-Letter für Mehmet.
 */
import { beforeAll, beforeEach, describe, expect, test } from 'vitest';

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
  reseedForActivePersona('mehmet-yildiz');
});

describe('Track C — Mehmet Empty-State (Hard-Line § 11.24)', () => {
  test('Persona-renten_track ist "C"', async () => {
    const persona = await api.getProfile();
    expect(persona.id).toBe('mehmet-yildiz');
    expect(persona.renten_track).toBe('C');
  });

  test('getAltersvorsorge gibt track=C ohne Eckdaten zurück', async () => {
    const av = await api.getAltersvorsorge('mehmet-yildiz');
    expect(av).not.toBeNull();
    expect(av?.track).toBe('C');
    expect(av?.eckdaten).toBeUndefined();
    expect(av?.yellow_letter_id).toBeUndefined();
  });

  test('kein Yellow-Letter im Posteingang für Mehmet', async () => {
    const letters = await api.getLetters();
    const renteninfoForMehmet = letters.filter(
      (l) =>
        l.archetype === 'renteninfo' &&
        l.empfaenger_persona_id === 'mehmet-yildiz',
    );
    expect(renteninfoForMehmet.length).toBe(0);
  });
});
