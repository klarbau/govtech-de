/**
 * IBAN-Speculative-Tests (Spec § 11.1 Vitest #5).
 *
 * Coverage:
 *   - simulateIbanPush({familienkasse:true, elster:true, gkv:false}) → 2
 *     speculative_2027-Einträge im Activity-Log mit korrekten Empfängern.
 *   - [MOCK]-Watermark im IBAN-Wert (Hard-Line § 11.8).
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
  reseedForActivePersona('mehmet-yildiz');
});

afterEach(() => {
  if (typeof window !== 'undefined' && window.localStorage) {
    [
      'govtech-de:v1:stammdaten:iban-speculative',
      'govtech-de:v1:stammdaten:uebermittlungs-log',
    ].forEach((k) => window.localStorage.removeItem(k));
  }
});

describe('IBAN-Speculative — addIbanSpeculative', () => {
  test('Watermark wird automatisch ergänzt (Hard-Line § 11.8)', async () => {
    await api.addIbanSpeculative('mehmet-yildiz', 'DE89 3704 0044 0532 0130 00');
    const sd = await api.getStammdaten('mehmet-yildiz');
    expect(sd.iban_speculative.iban).toBe(
      '[MOCK] DE89 3704 0044 0532 0130 00',
    );
  });

  test('bereits gewatermarktes IBAN wird nicht doppelt-prefixed', async () => {
    await api.addIbanSpeculative(
      'mehmet-yildiz',
      '[MOCK] DE89 3704 0044 0532 0130 00',
    );
    const sd = await api.getStammdaten('mehmet-yildiz');
    expect(sd.iban_speculative.iban).toBe(
      '[MOCK] DE89 3704 0044 0532 0130 00',
    );
  });

  test('dismissIbanSpeculative leert IBAN + setzt consents zurück', async () => {
    await api.addIbanSpeculative('mehmet-yildiz', 'DE89 1234 5678 9012 3456 78');
    await api.simulateIbanPush('mehmet-yildiz', {
      familienkasse: true,
      elster: false,
      gkv: false,
    });
    await api.dismissIbanSpeculative('mehmet-yildiz');
    const sd = await api.getStammdaten('mehmet-yildiz');
    expect(sd.iban_speculative.iban).toBeUndefined();
    expect(sd.iban_speculative.consented_pushes).toEqual({
      familienkasse: false,
      elster: false,
      gkv: false,
    });
  });
});

describe('IBAN-Speculative — simulateIbanPush', () => {
  test('zwei aktive Targets → genau 2 speculative_2027-Einträge', async () => {
    await api.simulateIbanPush('mehmet-yildiz', {
      familienkasse: true,
      elster: true,
      gkv: false,
    });
    const log = await api.getUebermittlungsLog('mehmet-yildiz', {
      kategorie: 'speculative_2027',
    });
    // Filter only IBAN-related entries (the seed-log might contain none).
    const ibanLog = log.filter((e) => e.field_id === 'iban_speculative');
    expect(ibanLog.length).toBe(2);
    const targets = ibanLog
      .map((e) => e.empfaenger_id)
      .sort();
    expect(targets).toEqual(['elster', 'familienkasse']);
  });

  test('alle drei Targets → 3 Einträge', async () => {
    await api.simulateIbanPush('mehmet-yildiz', {
      familienkasse: true,
      elster: true,
      gkv: true,
    });
    const log = await api.getUebermittlungsLog('mehmet-yildiz', {
      kategorie: 'speculative_2027',
    });
    const ibanLog = log.filter((e) => e.field_id === 'iban_speculative');
    expect(ibanLog.length).toBe(3);
  });

  test('keine aktiven Targets → keine speculative_2027-IBAN-Einträge', async () => {
    await api.simulateIbanPush('mehmet-yildiz', {
      familienkasse: false,
      elster: false,
      gkv: false,
    });
    const log = await api.getUebermittlungsLog('mehmet-yildiz', {
      kategorie: 'speculative_2027',
    });
    const ibanLog = log.filter((e) => e.field_id === 'iban_speculative');
    expect(ibanLog.length).toBe(0);
  });

  test('consented_pushes spiegeln den Toggle-Stand', async () => {
    await api.simulateIbanPush('mehmet-yildiz', {
      familienkasse: true,
      elster: false,
      gkv: true,
    });
    const sd = await api.getStammdaten('mehmet-yildiz');
    expect(sd.iban_speculative.consented_pushes).toEqual({
      familienkasse: true,
      elster: false,
      gkv: true,
    });
  });
});
