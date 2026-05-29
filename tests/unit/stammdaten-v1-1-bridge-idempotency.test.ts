/**
 * V1.1 — Yellow-Letter-Bridge-Idempotenz (Hard-Line § 11.25).
 *
 * Coverage:
 *  - Doppel-Aufruf von `applyYellowLetterBridge` mit gleichem `letter_id`:
 *      1. Aufruf returns `{ applied: true }`, schreibt Activity-Log.
 *      2. Aufruf returns `{ applied: false }`, KEINEN neuen Activity-Log.
 *  - Page-Reload-Simulation: Bucket-Hydration aus localStorage → erneuter Aufruf
 *    bleibt `{ applied: false }`.
 *  - Skip-Event `stammdaten/yellow-letter-bridge-skipped-idempotent` emittiert
 *    beim 2. Aufruf.
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
  // Reset alle V1.1-Buckets pro Test-Case.
  if (typeof window !== 'undefined' && window.localStorage) {
    window.localStorage.removeItem(
      'govtech-de:v1:stammdaten:renten-eckdaten-v1-1',
    );
    window.localStorage.removeItem(
      'govtech-de:v1:stammdaten:yellow-letter-bridge-applied',
    );
  }
  reseedForActivePersona('anna-petrov');
});

afterEach(() => {
  if (typeof window !== 'undefined' && window.localStorage) {
    window.localStorage.removeItem(
      'govtech-de:v1:stammdaten:renten-eckdaten-v1-1',
    );
    window.localStorage.removeItem(
      'govtech-de:v1:stammdaten:yellow-letter-bridge-applied',
    );
  }
});

describe('Yellow-Letter-Bridge — Hard-Line § 11.25 Idempotenz', () => {
  test('1. Aufruf applied=true; 2. Aufruf applied=false', async () => {
    const r1 = await api.applyYellowLetterBridge({
      letter_id: 'letter-renteninfo-anna-2026-05',
      persona_id: 'anna-petrov',
    });
    expect(r1.applied).toBe(true);
    expect(r1.eckdaten?.quelle_letter_id).toBe(
      'letter-renteninfo-anna-2026-05',
    );

    const r2 = await api.applyYellowLetterBridge({
      letter_id: 'letter-renteninfo-anna-2026-05',
      persona_id: 'anna-petrov',
    });
    expect(r2.applied).toBe(false);
    expect(r2.eckdaten).toBeUndefined();
  });

  test('Activity-Log enthält genau 1 Eintrag mit letter_id-Marker', async () => {
    await api.applyYellowLetterBridge({
      letter_id: 'letter-renteninfo-anna-2026-05',
      persona_id: 'anna-petrov',
    });
    await api.applyYellowLetterBridge({
      letter_id: 'letter-renteninfo-anna-2026-05',
      persona_id: 'anna-petrov',
    });

    const log = await api.getUebermittlungsLog('anna-petrov', {
      kategorie: 'app_aktivitaet',
    });
    const renteninfoEntries = log.filter((e) =>
      e.note?.includes('letter_id:letter-renteninfo-anna-2026-05'),
    );
    expect(renteninfoEntries.length).toBe(1);
    expect(renteninfoEntries[0].rechtsgrundlage).toBe(
      '§ 109 Abs. 1 + Abs. 3 SGB VI',
    );
  });

  test('Page-Reload-Simulation: erneuter Aufruf bleibt applied=false', async () => {
    await api.applyYellowLetterBridge({
      letter_id: 'letter-renteninfo-anna-2026-05',
      persona_id: 'anna-petrov',
    });

    // Bucket bleibt persistiert (localStorage). Wir simulieren keinen
    // tatsächlichen Reload — der Bucket-Read in applyYellowLetterBridge
    // greift auf denselben localStorage-Eintrag zu.
    const r2 = await api.applyYellowLetterBridge({
      letter_id: 'letter-renteninfo-anna-2026-05',
      persona_id: 'anna-petrov',
    });
    expect(r2.applied).toBe(false);
  });

  test('skipped-Event wird beim 2. Aufruf emittiert', async () => {
    let skipped = 0;
    let applied = 0;
    const unsubscribe = api.subscribe((e) => {
      if (e.type === 'stammdaten/yellow-letter-bridge-applied') applied++;
      if (e.type === 'stammdaten/yellow-letter-bridge-skipped-idempotent')
        skipped++;
    });

    await api.applyYellowLetterBridge({
      letter_id: 'letter-renteninfo-anna-2026-05',
      persona_id: 'anna-petrov',
    });
    await api.applyYellowLetterBridge({
      letter_id: 'letter-renteninfo-anna-2026-05',
      persona_id: 'anna-petrov',
    });

    expect(applied).toBe(1);
    expect(skipped).toBe(1);
    unsubscribe();
  });

  test('getAltersvorsorge surfacet Eckdaten nach 1. Bridge-Aufruf', async () => {
    const before = await api.getAltersvorsorge('anna-petrov');
    expect(before?.track).toBe('A');
    expect(before?.eckdaten).toBeUndefined();

    await api.applyYellowLetterBridge({
      letter_id: 'letter-renteninfo-anna-2026-05',
      persona_id: 'anna-petrov',
    });

    const after = await api.getAltersvorsorge('anna-petrov');
    expect(after?.eckdaten?.grundlage_kurzauszug.entgeltpunkte_aktuell).toBe(
      6.8,
    );
    expect(after?.yellow_letter_id).toBe('letter-renteninfo-anna-2026-05');
  });
});
