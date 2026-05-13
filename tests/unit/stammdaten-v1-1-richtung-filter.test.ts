/**
 * V1.2 — Activity-Log Richtung-Filter (Spec § 6.11, Hard-Line § 11.40).
 *
 * Coverage (Backend-side): das Backend liefert pro Kategorie filterbare
 * Aktivitätslog-Einträge — das Frontend mappt die UI-Richtung auf
 * Kategorie-Filter:
 *
 *   richtung 'eingehend' → kategorie 'behoerde_zu_buerger'
 *   richtung 'ausgehend' → kategorie 'behoerde_zu_behoerde' || 'speculative_2027'
 *   richtung 'intern'    → kategorie 'app_aktivitaet'
 *   richtung 'alle'      → kein Filter
 *
 * Tests:
 *  - Anna seed-Inhalt enthält ≥ 1 `behoerde_zu_buerger`-Eintrag (Familienkasse).
 *  - Schmidt seed-Inhalt enthält ≥ 2 `behoerde_zu_buerger`-Einträge.
 *  - Mehmet seed-Inhalt enthält ≥ 1 `behoerde_zu_buerger`-Eintrag mit
 *    Absender `abh-koeln` (Hard-Line § 11.40 ABH-Hard-Lock-Visualisierung).
 *  - `simulateFamilienkasseFollowupLetter` → erzeugt 1 `behoerde_zu_buerger`
 *    + 1 Letter im Posteingang.
 *  - kategorie-Filter via `getUebermittlungsLog({ kategorie: ... })` filtert
 *    korrekt; ohne Filter werden alle Einträge geliefert.
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

let api: typeof import('@/lib/mock-backend').api;
let reseedForActivePersona: typeof import('@/lib/mock-backend').reseedForActivePersona;

beforeAll(async () => {
  const mod = await import('@/lib/mock-backend');
  api = mod.api;
  reseedForActivePersona = mod.reseedForActivePersona;
});

beforeEach(() => {
  globalThis.sessionStorage.clear();
  globalThis.localStorage.removeItem(
    'govtech-de:v1:stammdaten:notification-praeferenzen',
  );
  globalThis.localStorage.removeItem(
    'govtech-de:v1:stammdaten:uebermittlungs-log',
  );
  globalThis.localStorage.removeItem('govtech-de:v1:letters');
});

describe('Seed-Inhalt: behoerde_zu_buerger pro Persona', () => {
  test('Anna: ≥ 1 behoerde_zu_buerger-Eintrag (Familienkasse)', async () => {
    reseedForActivePersona('anna-petrov');
    const eingehend = await api.getUebermittlungsLog('anna-petrov', {
      kategorie: 'behoerde_zu_buerger',
    });
    expect(eingehend.length).toBeGreaterThanOrEqual(1);
    expect(
      eingehend.some(
        (e) => e.absender_behoerde_id === 'familienkasse-berlin-brandenburg',
      ),
    ).toBe(true);
  });

  test('Schmidt: ≥ 2 behoerde_zu_buerger-Einträge', async () => {
    reseedForActivePersona('markus-schmidt');
    const eingehend = await api.getUebermittlungsLog('markus-schmidt', {
      kategorie: 'behoerde_zu_buerger',
    });
    expect(eingehend.length).toBeGreaterThanOrEqual(2);
  });

  test('Mehmet: ≥ 1 behoerde_zu_buerger mit Absender abh-koeln (kanal:brief)', async () => {
    reseedForActivePersona('mehmet-yildiz');
    const eingehend = await api.getUebermittlungsLog('mehmet-yildiz', {
      kategorie: 'behoerde_zu_buerger',
    });
    const abhEntry = eingehend.find((e) => e.absender_behoerde_id === 'abh-koeln');
    expect(abhEntry).toBeDefined();
    expect(abhEntry?.note).toContain('kanal:brief');
  });
});

describe('Kategorie-Filter (Richtung-Mapping)', () => {
  test('richtung "eingehend" === kategorie "behoerde_zu_buerger"', async () => {
    reseedForActivePersona('anna-petrov');
    const all = await api.getUebermittlungsLog('anna-petrov');
    const eingehend = await api.getUebermittlungsLog('anna-petrov', {
      kategorie: 'behoerde_zu_buerger',
    });
    expect(eingehend.every((e) => e.kategorie === 'behoerde_zu_buerger')).toBe(
      true,
    );
    expect(eingehend.length).toBeLessThanOrEqual(all.length);
    // Anna seed enthält definitiv behoerde_zu_buerger-Einträge.
    expect(eingehend.length).toBeGreaterThan(0);
  });

  test('richtung "ausgehend" Pseudo-Filter (Komposition aus 2 Kategorien)', async () => {
    reseedForActivePersona('anna-petrov');
    const b2b = await api.getUebermittlungsLog('anna-petrov', {
      kategorie: 'behoerde_zu_behoerde',
    });
    const spec = await api.getUebermittlungsLog('anna-petrov', {
      kategorie: 'speculative_2027',
    });
    expect(b2b.every((e) => e.kategorie === 'behoerde_zu_behoerde')).toBe(true);
    expect(spec.every((e) => e.kategorie === 'speculative_2027')).toBe(true);
    // Anna seed enthält viele behoerde_zu_behoerde-Einträge (Umzug-Cascade).
    expect(b2b.length).toBeGreaterThan(0);
  });

  test('richtung "intern" === kategorie "app_aktivitaet"', async () => {
    reseedForActivePersona('mehmet-yildiz');
    const intern = await api.getUebermittlungsLog('mehmet-yildiz', {
      kategorie: 'app_aktivitaet',
    });
    expect(intern.every((e) => e.kategorie === 'app_aktivitaet')).toBe(true);
  });

  test('Default (kein Filter) liefert alle Einträge', async () => {
    reseedForActivePersona('anna-petrov');
    const all = await api.getUebermittlungsLog('anna-petrov');
    const kategorien = new Set(all.map((e) => e.kategorie));
    // Anna trägt mind. 2 unterschiedliche Kategorien (behoerde_zu_behoerde +
    // behoerde_zu_buerger).
    expect(kategorien.size).toBeGreaterThanOrEqual(2);
  });
});

describe('Live-Erzeugung: simulateFamilienkasseFollowupLetter', () => {
  beforeEach(() => {
    reseedForActivePersona('anna-petrov');
  });

  test('erzeugt einen behoerde_zu_buerger-Eintrag im Activity-Log', async () => {
    const beforeLog = await api.getUebermittlungsLog('anna-petrov', {
      kategorie: 'behoerde_zu_buerger',
    });
    await api.simulateFamilienkasseFollowupLetter('anna-petrov');
    const afterLog = await api.getUebermittlungsLog('anna-petrov', {
      kategorie: 'behoerde_zu_buerger',
    });
    expect(afterLog.length).toBe(beforeLog.length + 1);
    const newEntry = afterLog[0]; // sortiert nach timestamp DESC
    expect(newEntry.absender_behoerde_id).toBe(
      'familienkasse-berlin-brandenburg',
    );
    expect(newEntry.note).toContain('kanal:postfach');
  });

  test('legt einen Letter mit kanal=postfach in den Posteingang', async () => {
    const result = await api.simulateFamilienkasseFollowupLetter('anna-petrov');
    expect(result.id).toBe(
      'letter-familienkasse-bewilligung-postfach-followup',
    );
    expect(result.kanal).toBe('postfach');
    // Letter ist im Posteingang persistiert.
    const found = await api.getLetterById(result.id);
    expect(found).not.toBeNull();
    expect(found?.kanal).toBe('postfach');
  });

  test('idempotent: zweiter Aufruf liefert denselben Letter, kein Doppel-Eintrag', async () => {
    const first = await api.simulateFamilienkasseFollowupLetter('anna-petrov');
    const logBetween = await api.getUebermittlungsLog('anna-petrov', {
      kategorie: 'behoerde_zu_buerger',
    });
    const second = await api.simulateFamilienkasseFollowupLetter('anna-petrov');
    expect(second.id).toBe(first.id);
    const logAfter = await api.getUebermittlungsLog('anna-petrov', {
      kategorie: 'behoerde_zu_buerger',
    });
    // Idempotency: log entry count UNCHANGED on second invocation.
    expect(logAfter.length).toBe(logBetween.length);
  });
});

describe('Behörde-Anbindung-Lookup (für Frontend-Picker)', () => {
  test('Familienkasse Berlin-Brandenburg ist angebunden', async () => {
    reseedForActivePersona('anna-petrov');
    const status = await api.getBehoerdeAnbindung(
      'familienkasse-berlin-brandenburg',
    );
    expect(status).toBe('angebunden');
  });

  test('LEA Berlin ist nicht_angebunden (Mehmet-Hard-Lock-Realismus)', async () => {
    reseedForActivePersona('anna-petrov');
    const status = await api.getBehoerdeAnbindung('abh-berlin-lea');
    expect(status).toBe('nicht_angebunden');
  });

  test('Bürgeramt Mitte ist in_pilotierung', async () => {
    reseedForActivePersona('anna-petrov');
    const status = await api.getBehoerdeAnbindung('buergeramt-berlin-mitte');
    expect(status).toBe('in_pilotierung');
  });
});
