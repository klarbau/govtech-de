/**
 * Aktivitätsprotokoll-Tests (Spec § 11.1 Vitest #2).
 *
 * Coverage:
 *   - getUebermittlungsLog({limit:5}) returns chronologisch absteigend.
 *   - kategorie-Filter + sektion-Filter funktionieren.
 *   - FIFO-Eviction bei >200 Einträgen pro Persona.
 *   - Hard-Line § 11.6 — note-Format `<key>:<value>;`-Marker.
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
  reseedForActivePersona('anna-petrov');
});

afterEach(() => {
  if (typeof window !== 'undefined' && window.localStorage) {
    [
      'govtech-de:v1:stammdaten:sperren',
      'govtech-de:v1:stammdaten:iban-speculative',
      'govtech-de:v1:stammdaten:kontakt',
      'govtech-de:v1:stammdaten:uebermittlungs-log',
    ].forEach((k) => window.localStorage.removeItem(k));
  }
});

describe('Aktivitätsprotokoll — sorting + limit', () => {
  test('returns entries sorted youngest first', async () => {
    const log = await api.getUebermittlungsLog('anna-petrov', { limit: 5 });
    expect(log.length).toBeGreaterThan(0);
    expect(log.length).toBeLessThanOrEqual(5);
    for (let i = 1; i < log.length; i++) {
      expect(log[i - 1].timestamp >= log[i].timestamp).toBe(true);
    }
  });

  test('limit clamps the result-length', async () => {
    const log = await api.getUebermittlungsLog('anna-petrov', { limit: 2 });
    expect(log.length).toBeLessThanOrEqual(2);
  });
});

describe('Aktivitätsprotokoll — kategorie filter', () => {
  test('filters to behoerde_zu_behoerde only', async () => {
    const log = await api.getUebermittlungsLog('anna-petrov', {
      kategorie: 'behoerde_zu_behoerde',
    });
    expect(log.length).toBeGreaterThan(0);
    for (const e of log) {
      expect(e.kategorie).toBe('behoerde_zu_behoerde');
    }
  });

  test('filters to app_aktivitaet only after a Religion-Consent', async () => {
    await api.setReligionSessionConsent('anna-petrov', true);
    const log = await api.getUebermittlungsLog('anna-petrov', {
      kategorie: 'app_aktivitaet',
    });
    expect(log.length).toBeGreaterThan(0);
    for (const e of log) {
      expect(e.kategorie).toBe('app_aktivitaet');
    }
  });

  test('filters to speculative_2027 only after IBAN-Push', async () => {
    await api.simulateIbanPush('anna-petrov', {
      familienkasse: true,
      elster: true,
      gkv: false,
    });
    const log = await api.getUebermittlungsLog('anna-petrov', {
      kategorie: 'speculative_2027',
    });
    expect(log.length).toBe(2);
    for (const e of log) {
      expect(e.kategorie).toBe('speculative_2027');
    }
  });
});

describe('Aktivitätsprotokoll — sektion filter', () => {
  test('filters to anschrift sektion only', async () => {
    const log = await api.getUebermittlungsLog('anna-petrov', {
      sektion: 'anschrift',
    });
    expect(log.length).toBeGreaterThan(0);
    for (const e of log) {
      expect(e.sektion).toBe('anschrift');
    }
  });
});

describe('Aktivitätsprotokoll — note format Hard-Line § 11.6', () => {
  test('seeded entries have semicolon-separated <key>:<value> markers, no PII', async () => {
    const log = await api.getUebermittlungsLog('anna-petrov');
    const withNotes = log.filter((e) => e.note);
    expect(withNotes.length).toBeGreaterThan(0);
    for (const e of withNotes) {
      const note = e.note as string;
      // semicolon-separated key:value pairs
      const pairs = note.split(';').map((p) => p.trim()).filter(Boolean);
      for (const pair of pairs) {
        expect(pair).toMatch(/^[a-z_]+:[^:]+$/i);
      }
      // mock:true marker is mandatory in V1 (Spec § 4.4)
      expect(note).toMatch(/mock\s*:\s*true/);
    }
  });
});

describe('Aktivitätsprotokoll — FIFO-Eviction (>200 entries)', () => {
  test(
    'FIFO drops oldest when bucket exceeds 200',
    async () => {
      // Wir umgehen den withLatency-Pfad und schreiben direkt über den
      // internen `appendLogEntry`-Helfer (sync, in-Memory + localStorage).
      // 205 Append-Aufrufe → der Bucket muss bei 200 capped sein.
      const { appendLogEntry } = await import(
        '@/lib/mock-backend/stammdaten/api'
      );
      for (let i = 0; i < 205; i++) {
        appendLogEntry('anna-petrov', {
          id: `fifo-test-${String(i).padStart(4, '0')}`,
          timestamp: new Date(2026, 0, 1, 0, 0, i).toISOString(),
          kategorie: 'app_aktivitaet',
          zweck_i18n_key: 'stammdaten.aktivitaet.zweck.app_kontakt_geaendert',
          rechtsgrundlage: 'Art. 6 Abs. 1 lit. b DSGVO',
          note: `persona_id:anna-petrov; field_id:test-${i}; mock:true`,
        });
      }
      const raw = window.localStorage.getItem(
        'govtech-de:v1:stammdaten:uebermittlungs-log',
      );
      expect(raw).not.toBeNull();
      const parsed = JSON.parse(raw as string);
      expect(parsed['anna-petrov'].length).toBe(200);
      // Älteste 5+ Einträge wurden evicted — der erste sollte fifo-test-0005+ sein
      // (plus ggf. seed entries; total cap = 200).
      const ids = parsed['anna-petrov'].map(
        (e: { id: string }) => e.id,
      );
      // FIFO drops oldest first — fifo-test-0000..fifo-test-0004 sind weg.
      expect(ids).not.toContain('fifo-test-0000');
      expect(ids).toContain('fifo-test-0204');
    },
    10_000,
  );
});
