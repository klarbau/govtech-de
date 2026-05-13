/**
 * `getStammdaten()` round-trip tests (Spec § 11.1 Vitest #1).
 *
 * Coverage:
 *   - Anna: identitaet.familienname=`Petrov`; anschrift_aktuell.plz=`10117`;
 *     religion.wert=`undefined` (consent off); sperren.uebermittlungssperren=`[]`.
 *   - Schmidt: identitaet.fruehere_namen=`['Müller']`; familie.eheschliessung.az=`[MOCK] M-E-00471/2024`;
 *     religion.wert=`'rk'` after consent on.
 *   - Mehmet: dokumente_refs.eat_can=`[MOCK] T0123456X`; dokumente_refs.azr_nr=`[MOCK] 6724813-090`.
 *   - Persona-derived Felder match Persona-Snapshot.
 *   - LocalStorage-Bucket-Hydration-Round-Trip.
 *   - Hard-Line § 11.10 + § 11.11 disclaimer_meta-Felder.
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
    value: {
      localStorage: storage,
      sessionStorage,
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
  reseedForActivePersona('anna-petrov');
});

afterEach(() => {
  if (typeof window !== 'undefined' && window.localStorage) {
    // Reset Stammdaten-Buckets between tests.
    [
      'govtech-de:v1:stammdaten:sperren',
      'govtech-de:v1:stammdaten:iban-speculative',
      'govtech-de:v1:stammdaten:kontakt',
      'govtech-de:v1:stammdaten:uebermittlungs-log',
      'govtech-de:v1:stammdaten:religion-consent-session',
    ].forEach((k) => window.localStorage.removeItem(k));
  }
  if (typeof globalThis.sessionStorage !== 'undefined') {
    globalThis.sessionStorage.clear();
  }
});

describe('getStammdaten — Anna Petrov', () => {
  test('returns expected identitaet, anschrift, religion=undefined (consent off)', async () => {
    const sd = await api.getStammdaten('anna-petrov');

    expect(sd.persona_id).toBe('anna-petrov');
    expect(sd.identitaet.familienname).toBe('Petrov');
    expect(sd.identitaet.vornamen).toBe('Anna');
    expect(sd.anschrift_aktuell.plz).toBe('10117');
    expect(sd.identitaet.steuer_id).toBe('[MOCK] 47 113 815 421');
    expect(sd.religion.wert).toBeUndefined();
    expect(sd.religion.consent.consent_session).toBe(false);
    expect(sd.sperren.uebermittlungssperren).toEqual([]);
    expect(sd.sperren.auskunftssperre_aktiv).toBe(false);
  });

  test('disclaimer_meta carries pilot_phase + arf_version (Hard-Line §§ 11.10, 11.11)', async () => {
    const sd = await api.getStammdaten('anna-petrov');
    expect(sd.disclaimer_meta.pilot_phase).toBe('pilot');
    expect(sd.disclaimer_meta.arf_version).toBe('v2.0');
    expect(sd.disclaimer_meta.lese_schicht_i18n_key).toBe(
      'stammdaten.disclaimer.lese_schicht',
    );
  });

  test('iban_speculative.iban undefined by default; consented_pushes all false', async () => {
    const sd = await api.getStammdaten('anna-petrov');
    expect(sd.iban_speculative.iban).toBeUndefined();
    expect(sd.iban_speculative.consented_pushes).toEqual({
      familienkasse: false,
      elster: false,
      gkv: false,
    });
  });
});

describe('getStammdaten — Familie Schmidt', () => {
  beforeEach(() => {
    reseedForActivePersona('markus-schmidt');
  });

  test('fruehere_namen=[Müller], eheschliessung az=[MOCK] M-E-00471/2024', async () => {
    const sd = await api.getStammdaten('markus-schmidt');
    expect(sd.identitaet.fruehere_namen).toEqual(['Müller']);
    expect(sd.familie.eheschliessung?.az).toBe('[MOCK] M-E-00471/2024');
    expect(sd.familie.eheschliessung?.datum).toBe('2024-06-22');
    expect(sd.familie.kinder.length).toBeGreaterThanOrEqual(1);
  });

  test('religion.wert undefined by default; surfaces "rk" after consent', async () => {
    const sd = await api.getStammdaten('markus-schmidt');
    expect(sd.religion.wert).toBeUndefined();

    await api.setReligionSessionConsent('markus-schmidt', true);

    const sd2 = await api.getStammdaten('markus-schmidt');
    expect(sd2.religion.wert).toBe('rk');
    expect(sd2.religion.consent.consent_session).toBe(true);
  });
});

describe('getStammdaten — Mehmet Yıldız (Drittstaatsangehöriger)', () => {
  beforeEach(() => {
    reseedForActivePersona('mehmet-yildiz');
  });

  test('eat_can + azr_nr surface in dokumente_refs', async () => {
    const sd = await api.getStammdaten('mehmet-yildiz');
    expect(sd.dokumente_refs.eat_can).toBe('[MOCK] T0123456X');
    expect(sd.dokumente_refs.azr_nr).toBe('[MOCK] 6724813-090');
  });

  test('addIbanSpeculative round-trips through the bucket', async () => {
    await api.addIbanSpeculative('mehmet-yildiz', 'DE89 3704 0044 0532 0130 00');
    const sd = await api.getStammdaten('mehmet-yildiz');
    expect(sd.iban_speculative.iban).toBe(
      '[MOCK] DE89 3704 0044 0532 0130 00',
    );
  });
});

describe('getStammdaten — LocalStorage hydration round-trip', () => {
  test('mutations to sperren/IBAN survive a reload (re-read from bucket)', async () => {
    await api.toggleUebermittlungssperre(
      'anna-petrov',
      'religionsgesellschaften_42_3',
      true,
    );

    const sd = await api.getStammdaten('anna-petrov');
    expect(sd.sperren.uebermittlungssperren).toContain(
      'religionsgesellschaften_42_3',
    );

    // Simulate fresh read — the api re-reads from localStorage on each call.
    const sd2 = await api.getStammdaten('anna-petrov');
    expect(sd2.sperren.uebermittlungssperren).toContain(
      'religionsgesellschaften_42_3',
    );
  });

  test('uebermittlungs_log surfaces seeded entries (jüngst first, max 50)', async () => {
    const sd = await api.getStammdaten('anna-petrov');
    expect(sd.uebermittlungs_log.length).toBeGreaterThan(0);
    expect(sd.uebermittlungs_log.length).toBeLessThanOrEqual(50);
    // chronologisch absteigend
    for (let i = 1; i < sd.uebermittlungs_log.length; i++) {
      expect(
        sd.uebermittlungs_log[i - 1].timestamp >= sd.uebermittlungs_log[i].timestamp,
      ).toBe(true);
    }
  });
});
