/**
 * Religion-Consent-Tests (Spec § 11.1 Vitest #3).
 *
 * Coverage:
 *   - setReligionSessionConsent(true) → consent_session=true; religion.wert ausgeliefert.
 *   - setReligionSessionConsent(false) → consent_session=false; religion.wert undefined.
 *   - Hard-Line § 11.4 — religion-consent ist NICHT in localStorage persistiert.
 *     Bucket-Key `govtech-de:v1:stammdaten:religion-consent` darf nicht existieren.
 *     sessionStorage-Reset → consent_session=false.
 *   - Activity-Log-Eintrag bei jeder Anzeige (kategorie=app_aktivitaet, mit
 *     `consent:art_9_lit_a`-Marker).
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

let api: typeof import('@/lib/mock-backend').api;
let reseedForActivePersona: typeof import('@/lib/mock-backend').reseedForActivePersona;

beforeAll(async () => {
  const mod = await import('@/lib/mock-backend');
  api = mod.api;
  reseedForActivePersona = mod.reseedForActivePersona;
});

beforeEach(() => {
  reseedForActivePersona('markus-schmidt');
});

afterEach(() => {
  if (typeof window !== 'undefined' && window.localStorage) {
    [
      'govtech-de:v1:stammdaten:sperren',
      'govtech-de:v1:stammdaten:iban-speculative',
      'govtech-de:v1:stammdaten:kontakt',
      'govtech-de:v1:stammdaten:uebermittlungs-log',
      'govtech-de:v1:stammdaten:religion-consent', // forbidden by § 11.4 — must never exist
    ].forEach((k) => window.localStorage.removeItem(k));
  }
  if (typeof globalThis.sessionStorage !== 'undefined') {
    globalThis.sessionStorage.clear();
  }
});

describe('Religion-Consent — happy path', () => {
  test('consent ON surfaces religion.wert', async () => {
    const sd0 = await api.getStammdaten('markus-schmidt');
    expect(sd0.religion.wert).toBeUndefined();

    const result = await api.setReligionSessionConsent('markus-schmidt', true);
    expect(result.wert).toBe('rk');

    const sd1 = await api.getStammdaten('markus-schmidt');
    expect(sd1.religion.wert).toBe('rk');
    expect(sd1.religion.consent.consent_session).toBe(true);
    expect(sd1.religion.consent.last_shown_at).toBeTruthy();
  });

  test('consent OFF (revoke) hides religion.wert', async () => {
    await api.setReligionSessionConsent('markus-schmidt', true);
    await api.setReligionSessionConsent('markus-schmidt', false);

    const sd = await api.getStammdaten('markus-schmidt');
    expect(sd.religion.wert).toBeUndefined();
    expect(sd.religion.consent.consent_session).toBe(false);
  });
});

describe('Religion-Consent — Hard-Line § 11.4 (NICHT persistiert)', () => {
  test('localStorage NEVER contains a religion-consent bucket', async () => {
    await api.setReligionSessionConsent('markus-schmidt', true);

    // Iterate all keys: there must be NO key matching the forbidden pattern.
    const ls = window.localStorage;
    for (let i = 0; i < ls.length; i++) {
      const key = ls.key(i) as string;
      // Hard-Line § 11.4: kein localStorage-Bucket
      // `govtech-de:v1:stammdaten:religion-consent` (ohne `-session`-Suffix).
      expect(key).not.toBe('govtech-de:v1:stammdaten:religion-consent');
    }
  });

  test('clearing sessionStorage drops consent → religion hidden again (Reload-Sim)', async () => {
    await api.setReligionSessionConsent('markus-schmidt', true);
    const before = await api.getStammdaten('markus-schmidt');
    expect(before.religion.wert).toBe('rk');

    // Reload simulieren: sessionStorage leeren.
    globalThis.sessionStorage.clear();

    const after = await api.getStammdaten('markus-schmidt');
    expect(after.religion.wert).toBeUndefined();
    expect(after.religion.consent.consent_session).toBe(false);
  });
});

describe('Religion-Consent — Activity-Log-Eintrag', () => {
  test('consent ON erzeugt app_aktivitaet-Eintrag mit consent:art_9_lit_a-Marker', async () => {
    await api.setReligionSessionConsent('markus-schmidt', true);
    const log = await api.getUebermittlungsLog('markus-schmidt', {
      kategorie: 'app_aktivitaet',
    });
    const religionEntries = log.filter(
      (e) => e.field_id === 'religionszugehoerigkeit',
    );
    expect(religionEntries.length).toBe(1);
    expect(religionEntries[0].note).toMatch(/consent:art_9_lit_a/);
    expect(religionEntries[0].rechtsgrundlage).toMatch(/Art\. 9.*lit\. a/);
  });
});
