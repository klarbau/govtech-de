/**
 * V1.1 — Yellow-Letter resolved 5 Pflicht-Inhalte (Hard-Line § 11.27).
 *
 * Coverage (verbatim aus Spec § 15.1):
 *  - applyYellowLetterBridge resolved alle 5 Pflicht-Inhalte:
 *    grundlage_kurzauszug.entgeltpunkte_aktuell === 6.8
 *    em_rente_prognose_eur_monat === 312.21
 *    regelalter_prognose_eur_monat === 743.99
 *    anpassungs_wirkung.beispiel_prozent_p_a === 2.0
 *    beitragsuebersicht.gesamt_eur === 8414.52
 *  - quelle_letter_id === 'letter-renteninfo-anna-2026-05'
 *  - stichtag === '2026-05-04'
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

describe('Yellow-Letter resolved 5 Pflicht-Inhalte (§ 109 Abs. 3 SGB VI)', () => {
  test('alle 5 Pflicht-Werte deterministisch korrekt für Anna-Letter', async () => {
    const result = await api.applyYellowLetterBridge({
      letter_id: 'letter-renteninfo-anna-2026-05',
      persona_id: 'anna-petrov',
    });

    expect(result.applied).toBe(true);
    const e = result.eckdaten;
    expect(e).toBeDefined();
    if (!e) throw new Error('eckdaten missing');

    // Pflicht-Inhalt 1: Grundlage der Berechnung.
    expect(e.grundlage_kurzauszug.entgeltpunkte_aktuell).toBe(6.8);
    expect(e.grundlage_kurzauszug.beitragszeit_von).toBe('2018-01');
    expect(e.grundlage_kurzauszug.beitragszeit_bis).toBe('2025-12');

    // Pflicht-Inhalt 2: EM-Rente-Prognose.
    expect(e.em_rente_prognose_eur_monat).toBe(312.21);

    // Pflicht-Inhalt 3: Regelaltersrenten-Prognose.
    expect(e.regelalter_prognose_eur_monat).toBe(743.99);

    // Pflicht-Inhalt 4: Wirkung künftiger Anpassungen.
    expect(e.anpassungs_wirkung.beispiel_prozent_p_a).toBe(2.0);
    expect(e.anpassungs_wirkung.plus_eur_monat).toBe(1100);

    // Pflicht-Inhalt 5: Beitragsübersicht.
    expect(e.beitragsuebersicht.gesamt_eur).toBe(8414.52);
    expect(e.beitragsuebersicht.versicherter_anteil_eur).toBe(4207.26);
    expect(e.beitragsuebersicht.arbeitgeber_anteil_eur).toBe(4207.26);
    expect(e.beitragsuebersicht.jahr).toBe('2025');
  });

  test('quelle_letter_id und stichtag korrekt', async () => {
    const result = await api.applyYellowLetterBridge({
      letter_id: 'letter-renteninfo-anna-2026-05',
      persona_id: 'anna-petrov',
    });
    expect(result.eckdaten?.quelle_letter_id).toBe(
      'letter-renteninfo-anna-2026-05',
    );
    expect(result.eckdaten?.stichtag).toBe('2026-05-04');
    expect(result.eckdaten?.abgelegt_am).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });
});
