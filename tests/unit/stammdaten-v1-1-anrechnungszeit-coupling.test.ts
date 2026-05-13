/**
 * V1.1 — Anrechnungszeit-Pflege Coupling (Hard-Line § 11.30).
 *
 * Schmidt-Persona hat sowohl `pflegegrad_v1_1: { grad: 2 }` als auch
 * `anrechnungszeit_pflege_v1_1: { monate: 18 }`. Render-Bedingung beider
 * Felder ist gekoppelt an denselben Pflegegrad-Modal-Toggle (§ 11.30
 * semantische Art-9-Coupling — kein separater Modal-Toggle für Anrechnungszeit).
 *
 * Vor Consent: beide Felder undefined.
 * Nach Consent: beide Felder sichtbar.
 * Nach Revoke: beide wieder undefined.
 */
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  test,
} from 'vitest';

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

let api: typeof import('@/lib/mock-backend').api;
let reseedForActivePersona: typeof import('@/lib/mock-backend').reseedForActivePersona;

beforeAll(async () => {
  const mod = await import('@/lib/mock-backend');
  api = mod.api;
  reseedForActivePersona = mod.reseedForActivePersona;
});

beforeEach(() => {
  if (typeof globalThis.sessionStorage !== 'undefined') {
    globalThis.sessionStorage.clear();
  }
  reseedForActivePersona('markus-schmidt');
});

afterEach(() => {
  if (typeof globalThis.sessionStorage !== 'undefined') {
    globalThis.sessionStorage.clear();
  }
});

describe('Anrechnungszeit-Pflege § 11.30 — semantische Coupling', () => {
  test('vor Consent: pflegegrad UND anrechnungszeit_pflege undefined', async () => {
    const sd = await api.getKrankenversicherungPflege('markus-schmidt');
    expect(sd?.pflegegrad).toBeUndefined();
    expect(sd?.anrechnungszeit_pflege).toBeUndefined();
    expect(sd?.pflegegrad_consent.consent_session).toBe(false);
  });

  test('nach Consent: BEIDE Felder sichtbar', async () => {
    await api.consentPflegegrad('markus-schmidt', true);
    const sd = await api.getKrankenversicherungPflege('markus-schmidt');

    expect(sd?.pflegegrad?.grad).toBe(2);
    expect(sd?.anrechnungszeit_pflege).toBeDefined();
    expect(sd?.anrechnungszeit_pflege?.monate).toBe(18);
    expect(sd?.anrechnungszeit_pflege?.rechtsgrundlage).toBe('§ 3 SGB VI');
  });

  test('nach Revoke: beide wieder undefined', async () => {
    await api.consentPflegegrad('markus-schmidt', true);
    await api.revokePflegegradConsent('markus-schmidt');

    const sd = await api.getKrankenversicherungPflege('markus-schmidt');
    expect(sd?.pflegegrad).toBeUndefined();
    expect(sd?.anrechnungszeit_pflege).toBeUndefined();
  });

  test('Anna (kein Pflegegrad) sieht weder pflegegrad noch anrechnungszeit', async () => {
    reseedForActivePersona('anna-petrov');
    await api.consentPflegegrad('anna-petrov', true);

    const sd = await api.getKrankenversicherungPflege('anna-petrov');
    expect(sd?.pflegegrad).toBeUndefined();
    expect(sd?.anrechnungszeit_pflege).toBeUndefined();
  });
});
