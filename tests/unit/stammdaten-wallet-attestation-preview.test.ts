/**
 * Wallet-Attestation-Preview-Tests (Spec § 11.1 Vitest #6).
 *
 * Coverage:
 *   - getWalletAttestationPreview('berliner-sparkasse') → 8 PID-Pflicht +
 *     4 Hilfsattribute aus Persona-Daten resolved.
 *   - mock_attestation_id ist deterministisch pro Persona × Empfänger.
 *   - [MOCK]-Watermark mitgesendet (Hard-Line § 11.8).
 *   - Hard-Line § 11.18 — getWalletAttestations() liefert genau 3 Empfänger.
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
let MockBackendError: typeof import('@/lib/mock-backend/test-core').MockBackendError;
let reseedForActivePersona: typeof import('@/lib/mock-backend/test-core').reseedForActivePersona;

beforeAll(async () => {
  const mod = await import('@/lib/mock-backend/test-core');
  api = mod.api;
  MockBackendError = mod.MockBackendError;
  reseedForActivePersona = mod.reseedForActivePersona;
});

beforeEach(() => {
  reseedForActivePersona('anna-petrov');
});

afterEach(() => {
  if (typeof window !== 'undefined' && window.localStorage) {
    window.localStorage.removeItem(
      'govtech-de:v1:stammdaten:uebermittlungs-log',
    );
  }
});

describe('getWalletAttestations — Hard-Line § 11.18 (minimal-statisch)', () => {
  test('returns exactly 3 fixe Mock-Empfänger', async () => {
    const list = await api.getWalletAttestations('anna-petrov');
    expect(list.length).toBe(3);
    const ids = list.map((a) => a.empfaenger_id);
    expect(ids).toContain('berliner-sparkasse');
    expect(ids).toContain('mock-hausverwaltung');
    expect(ids).toContain('vattenfall-strom');
  });
});

describe('getWalletAttestationPreview — PID-Felder', () => {
  test('berliner-sparkasse: 8 Pflicht + 4 Optional + Watermark', async () => {
    const preview = await api.getWalletAttestationPreview(
      'anna-petrov',
      'berliner-sparkasse',
    );
    expect(Object.keys(preview.pid_pflicht).length).toBe(8);
    expect(Object.keys(preview.pid_optional).length).toBe(4);
    expect(preview.watermark).toBe('[MOCK]');
    // Persona-derived Felder
    expect(preview.pid_pflicht.family_name).toBe('Petrov');
    expect(preview.pid_pflicht.given_name).toBe('Anna');
    expect(preview.pid_optional.resident_postal_code).toBe('10117');
  });

  test('mock_attestation_id ist deterministisch pro Persona × Empfänger', async () => {
    const a = await api.getWalletAttestationPreview(
      'anna-petrov',
      'berliner-sparkasse',
    );
    const b = await api.getWalletAttestationPreview(
      'anna-petrov',
      'berliner-sparkasse',
    );
    expect(a.mock_attestation_id).toBe(b.mock_attestation_id);
    expect(a.mock_attestation_id.startsWith('[MOCK] ATT-')).toBe(true);

    const otherEmpfaenger = await api.getWalletAttestationPreview(
      'anna-petrov',
      'vattenfall-strom',
    );
    expect(otherEmpfaenger.mock_attestation_id).not.toBe(a.mock_attestation_id);
  });

  test('preview erzeugt einen speculative_2027-Activity-Log-Eintrag', async () => {
    await api.getWalletAttestationPreview('anna-petrov', 'berliner-sparkasse');
    const log = await api.getUebermittlungsLog('anna-petrov', {
      kategorie: 'speculative_2027',
    });
    const walletLog = log.filter(
      (e) => e.field_id === 'wallet_attestation',
    );
    expect(walletLog.length).toBeGreaterThanOrEqual(1);
    expect(walletLog[0].empfaenger_id).toBe('berliner-sparkasse');
  });

  test('unknown empfaenger_id throws MockBackendError', async () => {
    await expect(
      api.getWalletAttestationPreview('anna-petrov', 'unknown-empfaenger'),
    ).rejects.toThrow(MockBackendError);
  });
});

describe('getWalletAttestationPreview — pro Persona unterschiedlich', () => {
  beforeEach(() => {
    reseedForActivePersona('mehmet-yildiz');
  });

  test('Mehmet-IDs unterscheiden sich von Anna-IDs (Hash-Determinismus)', async () => {
    const mehmet = await api.getWalletAttestationPreview(
      'mehmet-yildiz',
      'berliner-sparkasse',
    );
    expect(mehmet.pid_pflicht.family_name).toBe('Yıldız');
    expect(mehmet.pid_pflicht.given_name).toBe('Mehmet');
    expect(mehmet.pid_optional.resident_postal_code).toBe('50825');
    // Per-Persona-Determinismus: Mehmet bekommt anderen Hash als Anna.
    reseedForActivePersona('anna-petrov');
    const anna = await api.getWalletAttestationPreview(
      'anna-petrov',
      'berliner-sparkasse',
    );
    expect(mehmet.mock_attestation_id).not.toBe(anna.mock_attestation_id);
  });
});
