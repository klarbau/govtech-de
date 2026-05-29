/**
 * V1.2 — Mock-OTP-Flow für Mobilfunk (Spec § 5.1, Hard-Line § 11.37).
 *
 * Coverage:
 *  - Demo-Code `124857` (`MOCK_OTP_DEMO_CODE`) wird akzeptiert; verified=true.
 *  - Andere Codes werfen `OTP_INVALID`.
 *  - Bei verified=true: Activity-Log Kategorie `app_aktivitaet` mit
 *    `field_id: bundid_mobil`.
 *  - Persistiert: `bundid_mobil.verified === true` nach erfolgreicher
 *    Verifikation; `bundid_mobil.verifiziert_am` gesetzt.
 *  - Schmidt-Persona: vor OTP `verified=false`; nach OTP `true`.
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
let MOCK_OTP_DEMO_CODE: typeof import('@/types').MOCK_OTP_DEMO_CODE;

beforeAll(async () => {
  const mod = await import('@/lib/mock-backend/test-core');
  api = mod.api;
  reseedForActivePersona = mod.reseedForActivePersona;
  const types = await import('@/types');
  MOCK_OTP_DEMO_CODE = types.MOCK_OTP_DEMO_CODE;
});

beforeEach(() => {
  globalThis.sessionStorage.clear();
  globalThis.localStorage.removeItem(
    'govtech-de:v1:stammdaten:notification-praeferenzen',
  );
  globalThis.localStorage.removeItem(
    'govtech-de:v1:stammdaten:uebermittlungs-log',
  );
  reseedForActivePersona('markus-schmidt');
});

describe('simulateMobilOtpFlow — Happy Path', () => {
  test('Demo-Code 124857 akzeptiert → verified=true', async () => {
    expect(MOCK_OTP_DEMO_CODE).toBe('124857');
    const result = await api.simulateMobilOtpFlow('markus-schmidt', {
      code: '124857',
    });
    expect(result.verified).toBe(true);
  });

  test('persistiert bundid_mobil.verified=true und verifiziert_am gesetzt', async () => {
    const before = await api.getKontakt('markus-schmidt');
    expect(before.bundid_mobil?.verified).toBe(false);

    await api.simulateMobilOtpFlow('markus-schmidt', { code: '124857' });
    const after = await api.getKontakt('markus-schmidt');
    expect(after.bundid_mobil?.verified).toBe(true);
    expect(after.bundid_mobil?.verifiziert_am).toBeDefined();
    expect(after.bundid_mobil?.verifiziert_am).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  test('Activity-Log-Eintrag Kategorie app_aktivitaet mit field_id bundid_mobil', async () => {
    await api.simulateMobilOtpFlow('markus-schmidt', { code: '124857' });
    const log = await api.getUebermittlungsLog('markus-schmidt', {
      kategorie: 'app_aktivitaet',
    });
    const entry = log.find((e) => e.field_id === 'bundid_mobil');
    expect(entry).toBeDefined();
    expect(entry?.kategorie).toBe('app_aktivitaet');
    expect(entry?.note).toContain('user_otp_verify');
  });
});

describe('simulateMobilOtpFlow — Negativ-Pfad', () => {
  test('Falscher Code wirft OTP_INVALID', async () => {
    await expect(
      api.simulateMobilOtpFlow('markus-schmidt', { code: '000000' }),
    ).rejects.toThrow(/OTP/i);
  });

  test('Falscher Code ändert bundid_mobil.verified NICHT', async () => {
    try {
      await api.simulateMobilOtpFlow('markus-schmidt', { code: '999999' });
    } catch {
      /* expected */
    }
    const after = await api.getKontakt('markus-schmidt');
    expect(after.bundid_mobil?.verified).toBe(false);
  });

  test('Anderer Demo-Pattern-Code (z. B. "12 4857" mit Spaces) wird abgelehnt', async () => {
    await expect(
      api.simulateMobilOtpFlow('markus-schmidt', { code: '12 4857' }),
    ).rejects.toThrow(/OTP/i);
  });
});
