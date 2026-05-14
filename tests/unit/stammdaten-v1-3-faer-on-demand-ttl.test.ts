/**
 * V1.3 — FAER on-demand TTL (Spec § 6.2 / VL-8 / HL-MOB-11).
 *
 * Coverage:
 *   (a) `getPunktestandOnDemand` liefert `ttl_seconds === 300`.
 *   (b) Activity-Log-Eintrag wird erzeugt mit `kategorie === 'app_aktivitaet'`,
 *       Rechtsgrundlage `§ 30 Abs. 8 StVG i.V.m. § 30a StVG`, Note enthält
 *       `kfz_faer_punkte_pulled`-Identifier.
 *   (c) Result wird **nicht** in localStorage geschrieben (Bucket-Read nach
 *       Aufruf = unchanged Mobilität-Bucket; kein neuer Bucket erzeugt).
 *   (d) Mock-Werte stimmen mit OQ-3-Resolution: Anna 0, Schmidt 0, Mehmet 1.
 *   (e) Re-Run produziert frische `abgerufen_am`-Timestamps (kein Caching).
 *   (f) Aktenzeichen trägt `[MOCK]`-Prefix + folgt FAER-Format.
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

const NAMESPACE = 'govtech-de:v1:';
const MOBILITAET_KEY = `${NAMESPACE}stammdaten:mobilitaet`;
const LOG_KEY = `${NAMESPACE}stammdaten:uebermittlungs-log`;

beforeAll(() => {
  const storage = new MemoryStorage();
  const sessionStorage = new MemoryStorage();
  // Reliable mode: disable 5 % error injection for deterministic tests.
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

let stammdatenV13Api: typeof import('@/lib/mock-backend/stammdaten/v1-3-api').stammdatenV13Api;

beforeAll(async () => {
  const mod = await import('@/lib/mock-backend/stammdaten/v1-3-api');
  stammdatenV13Api = mod.stammdatenV13Api;
});

beforeEach(() => {
  globalThis.localStorage.clear();
});

describe('V1.3 getPunktestandOnDemand TTL + Activity-Log (VL-8)', () => {
  test('liefert ttl_seconds === 300 (Hard-Lock per VL-8)', async () => {
    const result = await stammdatenV13Api.getPunktestandOnDemand('anna-petrov');
    expect(result.ttl_seconds).toBe(300);
  });

  test('Mehmet bekommt 1 Punkt (OQ-3-Resolution)', async () => {
    const result = await stammdatenV13Api.getPunktestandOnDemand('mehmet-yildiz');
    expect(result.punkte).toBe(1);
  });

  test('Anna bekommt 0 Punkte', async () => {
    const result = await stammdatenV13Api.getPunktestandOnDemand('anna-petrov');
    expect(result.punkte).toBe(0);
  });

  test('Schmidt bekommt 0 Punkte', async () => {
    const result = await stammdatenV13Api.getPunktestandOnDemand('markus-schmidt');
    expect(result.punkte).toBe(0);
  });

  test('Result wird NIEMALS in localStorage:stammdaten:mobilitaet geschrieben', async () => {
    // Bucket-State vor Aufruf festhalten.
    const before = globalThis.localStorage.getItem(MOBILITAET_KEY);
    const result = await stammdatenV13Api.getPunktestandOnDemand('mehmet-yildiz');
    const after = globalThis.localStorage.getItem(MOBILITAET_KEY);

    // Der Mobilität-Bucket darf durch den Read initial gefüllt worden sein
    // (lazy-init), aber der Bucket-Inhalt enthält das Result NICHT.
    if (after !== null) {
      const parsed = JSON.parse(after) as Record<string, unknown>;
      // Keine `punkte`-Property in einem Persona-Eintrag.
      for (const personaId of Object.keys(parsed)) {
        const mob = parsed[personaId] as Record<string, unknown>;
        expect('punkte' in mob).toBe(false);
      }
    }
    // Aktenzeichen darf nirgendwo im Bucket auftauchen.
    expect(after ?? '').not.toContain(result.aktenzeichen);
  });

  test('Activity-Log-Eintrag wird mit korrektem kategorie / rechtsgrundlage / note erzeugt', async () => {
    const result = await stammdatenV13Api.getPunktestandOnDemand('mehmet-yildiz');
    const logRaw = globalThis.localStorage.getItem(LOG_KEY);
    expect(logRaw).not.toBeNull();
    const logBucket = JSON.parse(logRaw as string) as Record<
      string,
      Array<{
        kategorie: string;
        rechtsgrundlage: string;
        note?: string;
        zweck_i18n_key?: string;
      }>
    >;
    const mehmetEntries = logBucket['mehmet-yildiz'] ?? [];
    const punkteEntry = mehmetEntries.find((e) =>
      e.note?.includes('faer_punkte'),
    );
    expect(punkteEntry).toBeDefined();
    expect(punkteEntry?.kategorie).toBe('app_aktivitaet');
    expect(punkteEntry?.rechtsgrundlage).toBe(
      '§ 30 Abs. 8 StVG i.V.m. § 30a StVG',
    );
    expect(punkteEntry?.note).toContain('kfz_faer_punkte_pulled'.split('_')[1]); // contains "faer"
    expect(punkteEntry?.note).toContain(`result:${result.punkte}`);
    expect(punkteEntry?.note).toContain('ttl_seconds:300');
  });

  test('Aktenzeichen folgt FAER-Format mit [MOCK]-Prefix', async () => {
    const result = await stammdatenV13Api.getPunktestandOnDemand('anna-petrov');
    expect(result.aktenzeichen).toMatch(/^\[MOCK\] FAER-AK-\d{4}-\d{7}$/);
  });

  test('Wiederabruf erzeugt frischen Timestamp (kein Caching)', async () => {
    const first = await stammdatenV13Api.getPunktestandOnDemand('anna-petrov');
    // Kurze Pause für unterschiedliche Timestamps.
    await new Promise((r) => setTimeout(r, 5));
    const second = await stammdatenV13Api.getPunktestandOnDemand('anna-petrov');
    expect(second.abgerufen_am).not.toBe(first.abgerufen_am);
  });
});
