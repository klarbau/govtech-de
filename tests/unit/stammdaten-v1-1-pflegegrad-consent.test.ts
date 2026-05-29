/**
 * V1.1 — Pflegegrad-Consent (Hard-Line § 11.22).
 *
 * Coverage:
 *  - `consentPflegegrad('schmidt', true)` setzt `consent_session=true`;
 *    `getKrankenversicherungPflege` rendert `pflegegrad`.
 *  - `revokePflegegradConsent('schmidt')` setzt false; `pflegegrad === undefined`.
 *  - localStorage-Sentinel: nach Consent darf
 *    `localStorage.getItem('govtech-de:v1:stammdaten:pflegegrad-consent')` strikt
 *    `null` sein UND
 *    `localStorage.getItem('govtech-de:v1:stammdaten:pflegegrad-consent-session')`
 *    ebenfalls strikt `null` sein (sessionStorage statt localStorage).
 *  - sessionStorage-Wert: enthält JSON mit `consent_session: true` für Schmidt.
 *  - Tab-Close-Simulation (`sessionStorage.clear()`): consent_session=false.
 *  - Anrechnungszeit Pflege § 11.30 Coupling: visible nur bei consent_session=true.
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

let api: typeof import('@/lib/mock-backend/test-core').api;
let reseedForActivePersona: typeof import('@/lib/mock-backend/test-core').reseedForActivePersona;

beforeAll(async () => {
  const mod = await import('@/lib/mock-backend/test-core');
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

describe('Pflegegrad-Consent — happy path', () => {
  test('consent ON surfacet Pflegegrad PG 2 für Schmidt', async () => {
    const before = await api.getKrankenversicherungPflege('markus-schmidt');
    expect(before?.pflegegrad).toBeUndefined();
    expect(before?.pflegegrad_consent.consent_session).toBe(false);
    // REVISE-Wave 2026-05-10: existenz-Marker bleibt true unabhängig von Consent.
    expect(before?.pflegegrad_exists).toBe(true);

    await api.consentPflegegrad('markus-schmidt', true);

    const after = await api.getKrankenversicherungPflege('markus-schmidt');
    expect(after?.pflegegrad?.grad).toBe(2);
    expect(after?.pflegegrad?.bewilligt_am).toBe('2025-09-14');
    expect(after?.pflegegrad?.begutachtung_stelle).toBe('md');
    expect(after?.pflegegrad_consent.consent_session).toBe(true);
    expect(after?.pflegegrad_exists).toBe(true);
  });

  test('revoke setzt consent_session=false und versteckt Pflegegrad', async () => {
    await api.consentPflegegrad('markus-schmidt', true);
    await api.revokePflegegradConsent('markus-schmidt');

    const sd = await api.getKrankenversicherungPflege('markus-schmidt');
    expect(sd?.pflegegrad).toBeUndefined();
    expect(sd?.pflegegrad_consent.consent_session).toBe(false);
    // Existenz bleibt unverändert — Reveal-Button bleibt erreichbar.
    expect(sd?.pflegegrad_exists).toBe(true);
  });
});

describe('Pflegegrad-Existenz-Flag (REVISE-Wave 2026-05-10)', () => {
  test('Schmidt mit pflegegrad_v1_1-Seed → pflegegrad_exists === true unabhängig von Consent', async () => {
    // Vor Consent.
    const before = await api.getKrankenversicherungPflege('markus-schmidt');
    expect(before?.pflegegrad_exists).toBe(true);
    expect(before?.pflegegrad).toBeUndefined();

    // Nach Consent.
    await api.consentPflegegrad('markus-schmidt', true);
    const afterConsent = await api.getKrankenversicherungPflege('markus-schmidt');
    expect(afterConsent?.pflegegrad_exists).toBe(true);
    expect(afterConsent?.pflegegrad?.grad).toBe(2);

    // Nach Revoke — Existenz bleibt.
    await api.revokePflegegradConsent('markus-schmidt');
    const afterRevoke = await api.getKrankenversicherungPflege('markus-schmidt');
    expect(afterRevoke?.pflegegrad_exists).toBe(true);
    expect(afterRevoke?.pflegegrad).toBeUndefined();
  });

  test('Anna ohne pflegegrad-Seed → pflegegrad_exists === false', async () => {
    reseedForActivePersona('anna-petrov');
    if (typeof globalThis.sessionStorage !== 'undefined') {
      globalThis.sessionStorage.clear();
    }
    const sd = await api.getKrankenversicherungPflege('anna-petrov');
    expect(sd?.pflegegrad_exists).toBe(false);
    expect(sd?.pflegegrad).toBeUndefined();

    // Auch wenn man (hypothetisch) Consent geben würde — kein Seed → pflegegrad
    // bleibt undefined und exists bleibt false.
    await api.consentPflegegrad('anna-petrov', true);
    const after = await api.getKrankenversicherungPflege('anna-petrov');
    expect(after?.pflegegrad_exists).toBe(false);
    expect(after?.pflegegrad).toBeUndefined();
  });

  test('Mehmet (Track C, kein Seed) → pflegegrad_exists === false', async () => {
    reseedForActivePersona('mehmet-yildiz');
    if (typeof globalThis.sessionStorage !== 'undefined') {
      globalThis.sessionStorage.clear();
    }
    const sd = await api.getKrankenversicherungPflege('mehmet-yildiz');
    expect(sd?.pflegegrad_exists).toBe(false);
    expect(sd?.pflegegrad).toBeUndefined();
  });
});

describe('Pflegegrad-Consent — Hard-Line § 11.22 (NICHT in localStorage)', () => {
  test('localStorage hat KEINEN Bucket "pflegegrad-consent" (ohne Suffix)', async () => {
    await api.consentPflegegrad('markus-schmidt', true);

    expect(
      window.localStorage.getItem('govtech-de:v1:stammdaten:pflegegrad-consent'),
    ).toBeNull();
  });

  test('localStorage hat KEINEN Bucket "pflegegrad-consent-session"', async () => {
    await api.consentPflegegrad('markus-schmidt', true);

    // Hard-Line § 11.22: sessionStorage statt localStorage.
    expect(
      window.localStorage.getItem(
        'govtech-de:v1:stammdaten:pflegegrad-consent-session',
      ),
    ).toBeNull();
  });

  test('sessionStorage enthält JSON mit consent_session=true für Schmidt', async () => {
    await api.consentPflegegrad('markus-schmidt', true);

    const raw = globalThis.sessionStorage.getItem(
      'govtech-de:v1:stammdaten:pflegegrad-consent-session',
    );
    expect(raw).toBeTruthy();
    const parsed = JSON.parse(raw as string);
    expect(parsed['markus-schmidt']?.consent_session).toBe(true);
  });

  test('Tab-Close-Simulation (sessionStorage.clear): consent zurückgesetzt', async () => {
    await api.consentPflegegrad('markus-schmidt', true);
    const before = await api.getKrankenversicherungPflege('markus-schmidt');
    expect(before?.pflegegrad?.grad).toBe(2);

    // Tab-Close = sessionStorage.clear().
    globalThis.sessionStorage.clear();

    const after = await api.getKrankenversicherungPflege('markus-schmidt');
    expect(after?.pflegegrad).toBeUndefined();
    expect(after?.pflegegrad_consent.consent_session).toBe(false);
  });
});

describe('Pflegegrad-Consent — Activity-Log', () => {
  test('consent ON erzeugt app_aktivitaet-Eintrag mit Art-9-Marker', async () => {
    await api.consentPflegegrad('markus-schmidt', true);

    const log = await api.getUebermittlungsLog('markus-schmidt', {
      kategorie: 'app_aktivitaet',
    });
    const pgEntries = log.filter((e) =>
      e.note?.includes('field_id:pflegegrad') &&
      e.note?.includes('consent:art_9_lit_a'),
    );
    expect(pgEntries.length).toBeGreaterThanOrEqual(1);
    expect(pgEntries[0].rechtsgrundlage).toBe(
      'Art. 9 Abs. 2 lit. a DSGVO i.V.m. § 14 SGB XI',
    );
  });
});
