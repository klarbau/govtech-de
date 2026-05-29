/**
 * Sperren-Toggle-Tests (Spec § 11.1 Vitest #4).
 *
 * Coverage:
 *   - Auskunftssperre mit Begründung < 30 Zeichen → MockBackendError
 *     (`BEGRUENDUNG_ZU_KURZ`). Hard-Line § 11.14.
 *   - Auskunftssperre mit Begründung ≥ 30 Zeichen → success; Activity-Log-Eintrag.
 *   - Übermittlungssperre ohne Begründung → success.
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
    [
      'govtech-de:v1:stammdaten:sperren',
      'govtech-de:v1:stammdaten:uebermittlungs-log',
    ].forEach((k) => window.localStorage.removeItem(k));
  }
});

describe('Auskunftssperre § 51 BMG', () => {
  test('begründung < 30 Zeichen → MockBackendError BEGRUENDUNG_ZU_KURZ', async () => {
    await expect(
      api.toggleAuskunftssperre('anna-petrov', true, 'kurz'),
    ).rejects.toThrow(MockBackendError);
    try {
      await api.toggleAuskunftssperre('anna-petrov', true, 'kurz');
    } catch (err) {
      expect(err).toBeInstanceOf(MockBackendError);
      expect(
        (err as InstanceType<typeof MockBackendError>).code,
      ).toBe('BEGRUENDUNG_ZU_KURZ');
    }
  });

  test('begründung ≥ 30 Zeichen → success + Activity-Log-Eintrag', async () => {
    const begruendung =
      'Bedrohungslage durch Stalking — Schutz nach § 51 Abs. 1 BMG erforderlich.';
    await api.toggleAuskunftssperre('anna-petrov', true, begruendung);

    const sd = await api.getStammdaten('anna-petrov');
    expect(sd.sperren.auskunftssperre_aktiv).toBe(true);
    expect(sd.sperren.auskunftssperre_begruendung).toBe(begruendung);

    const log = await api.getUebermittlungsLog('anna-petrov', {
      kategorie: 'app_aktivitaet',
    });
    const sperrenLog = log.filter(
      (e) => e.field_id === 'auskunftssperre',
    );
    expect(sperrenLog.length).toBe(1);
    expect(sperrenLog[0].rechtsgrundlage).toMatch(/§ 51/);
  });

  test('deaktivieren ohne begründung-pflicht', async () => {
    const begruendung =
      'Bedrohungslage durch Stalking — Schutz nach § 51 Abs. 1 BMG erforderlich.';
    await api.toggleAuskunftssperre('anna-petrov', true, begruendung);
    // Toggle off — keine Begründung notwendig.
    await api.toggleAuskunftssperre('anna-petrov', false);
    const sd = await api.getStammdaten('anna-petrov');
    expect(sd.sperren.auskunftssperre_aktiv).toBe(false);
    expect(sd.sperren.auskunftssperre_begruendung).toBeUndefined();
  });
});

describe('Übermittlungssperren §§ 42 Abs. 3, 50 BMG (ohne Begründung)', () => {
  test('toggleUebermittlungssperre(religionsgesellschaften_42_3, true) → success', async () => {
    await api.toggleUebermittlungssperre(
      'anna-petrov',
      'religionsgesellschaften_42_3',
      true,
    );
    const sd = await api.getStammdaten('anna-petrov');
    expect(sd.sperren.uebermittlungssperren).toContain(
      'religionsgesellschaften_42_3',
    );
  });

  test('toggleSpeicherungssperre is an alias of toggleUebermittlungssperre', async () => {
    await api.toggleSpeicherungssperre(
      'anna-petrov',
      'adressbuch_verlage_50_5',
      true,
    );
    const sd = await api.getStammdaten('anna-petrov');
    expect(sd.sperren.uebermittlungssperren).toContain(
      'adressbuch_verlage_50_5',
    );
  });

  test('toggle off removes the sperre from the array', async () => {
    await api.toggleUebermittlungssperre(
      'anna-petrov',
      'wahlwerbung_50_1',
      true,
    );
    await api.toggleUebermittlungssperre(
      'anna-petrov',
      'wahlwerbung_50_1',
      false,
    );
    const sd = await api.getStammdaten('anna-petrov');
    expect(sd.sperren.uebermittlungssperren).not.toContain('wahlwerbung_50_1');
  });
});
