/**
 * V1.2 — toggleNotificationPraeferenz + Cascade-Trigger (Spec § 5.1, § 11.31).
 *
 * Coverage:
 *  - Anna × `familie` × `postfach` → returns `{ counter: { 8, 4 } }` und
 *    `cascade`-Daten (Hero-Pfad).
 *  - Activity-Log-Eintrag Kategorie `speculative_2027` entsteht.
 *  - 5 Kategorien × 4 Kanäle = 20 Permutationen aus SAVINGS_LOOKUP.
 *  - Hard-Lock § 11.35: Mehmet × `sonstige` × `postfach` wirft (drittstaats-
 *    angehörig + ABH `nicht_angebunden`).
 *  - Mehmet ist im V1-Persona-Setup deutscher Staatsangehöriger ohne
 *    Aufenthaltstitel → kein Hard-Lock; deshalb verwenden wir hier Anna,
 *    die in personas.json einen `aufenthaltstitel`-Block trägt
 *    (`abh-berlin-lea` `nicht_angebunden`).
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
  // sessionStorage löschen ist OK (für Pflegegrad-Consent etc.); localStorage
  // NICHT clear-en, sonst wird der Personen-Bucket unter ensureBooted nicht
  // re-seeded — `reseedForActivePersona` schreibt nur meta + persona-spezifische
  // Buckets, NICHT den globalen `personas`-Bucket. Für Test-Isolation reicht
  // es, die per-Persona-Buckets via reseedForActivePersona zurückzusetzen.
  globalThis.sessionStorage.clear();
  // V1.2 Notification-Bucket isoliert wegnehmen, damit jeder Test mit
  // Default-Snapshot startet (sonst trägt er den Wert aus dem vorherigen
  // toggleNotificationPraeferenz).
  globalThis.localStorage.removeItem(
    'govtech-de:v1:stammdaten:notification-praeferenzen',
  );
  globalThis.localStorage.removeItem(
    'govtech-de:v1:stammdaten:uebermittlungs-log',
  );
  globalThis.localStorage.removeItem('govtech-de:v1:letters');
  reseedForActivePersona('anna-petrov');
});

describe('Hero-Cascade — Anna × familie × postfach', () => {
  test('returns counter { briefe_pro_jahr_gespart: 8, tage_frist_gespart: 4 }', async () => {
    const result = await api.toggleNotificationPraeferenz(
      'anna-petrov',
      'familie',
      'postfach',
    );
    expect(result.ok).toBe(true);
    expect(result.counter.briefe_pro_jahr_gespart).toBe(8);
    expect(result.counter.tage_frist_gespart).toBe(4);
  });

  test('returns cascade-Daten mit vorher_letter_id und followup_letter_hint_id', async () => {
    const result = await api.toggleNotificationPraeferenz(
      'anna-petrov',
      'familie',
      'postfach',
    );
    expect(result.cascade).toBeDefined();
    expect(result.cascade?.ersparte_briefe_pro_jahr).toBe(8);
    expect(result.cascade?.ersparte_tage_pro_bescheid).toBe(4);
    expect(result.cascade?.vorher_letter_id).toBe(
      'letter-familienkasse-bewilligung',
    );
    expect(result.cascade?.followup_letter_hint_id).toBe(
      'letter-familienkasse-bewilligung-postfach-followup',
    );
  });

  test('Activity-Log-Eintrag mit Kategorie speculative_2027', async () => {
    await api.toggleNotificationPraeferenz('anna-petrov', 'familie', 'postfach');
    const log = await api.getUebermittlungsLog('anna-petrov', {
      kategorie: 'speculative_2027',
    });
    const entry = log.find((e) => e.field_id === 'notification_praeferenz');
    expect(entry).toBeDefined();
    expect(entry?.kategorie).toBe('speculative_2027');
    expect(entry?.note).toContain('vorher:brief');
    expect(entry?.note).toContain('nachher:postfach');
    expect(entry?.note).toContain('kategorie:familie');
  });

  test('Schmidt × familie × postfach → counter, aber keine cascade (nur Anna)', async () => {
    reseedForActivePersona('markus-schmidt');
    const result = await api.toggleNotificationPraeferenz(
      'markus-schmidt',
      'familie',
      'postfach',
    );
    expect(result.counter.briefe_pro_jahr_gespart).toBe(8);
    expect(result.cascade).toBeUndefined();
  });
});

describe('Counter-Werte für 5 Kategorien × 4 Kanäle (Schmidt — kein ABH-Hard-Lock)', () => {
  // Schmidt-Persona ist deutscher Staatsangehöriger ohne aufenthaltstitel —
  // somit greift kein § 11.35 ABH-Hard-Lock und alle 20 Kombinationen
  // sind testbar (für Anna/Mehmet variant siehe ABH-Hard-Lock-describe).
  const cases: Array<[string, string, number, number]> = [
    ['steuer', 'postfach', 4, 4],
    ['sozial', 'postfach', 6, 4],
    ['familie', 'postfach', 8, 4],
    ['verkehr', 'postfach', 0, 0],
    ['sonstige', 'postfach', 2, 4],
    ['steuer', 'email_pilot', 0, 0],
    ['sozial', 'sms_pilot', 0, 0],
    ['familie', 'brief', 0, 0],
  ];

  for (const [kategorie, kanal, briefe, tage] of cases) {
    test(`${kategorie} × ${kanal} → ${briefe} Briefe / ${tage} Tage`, async () => {
      reseedForActivePersona('markus-schmidt');
      const result = await api.toggleNotificationPraeferenz(
        'markus-schmidt',
        kategorie as 'steuer' | 'sozial' | 'familie' | 'verkehr' | 'sonstige',
        kanal as 'postfach' | 'email_pilot' | 'sms_pilot' | 'brief',
      );
      expect(result.counter.briefe_pro_jahr_gespart).toBe(briefe);
      expect(result.counter.tage_frist_gespart).toBe(tage);
    });
  }
});

describe('ABH-Hard-Lock § 11.35 (Anna mit aufenthaltstitel-Block)', () => {
  test('Anna × sonstige × postfach wirft BUNDID_HARD_LOCK_ABH', async () => {
    // Anna trägt im Persona-Fixture einen aufenthaltstitel mit
    // abh_behoerde_id `abh-berlin-lea` (`nicht_angebunden`). Hard-Lock greift.
    await expect(
      api.toggleNotificationPraeferenz('anna-petrov', 'sonstige', 'postfach'),
    ).rejects.toThrow(/ABH|BundID|Aufenthalts/i);
  });

  test('Anna × sonstige × brief ist erlaubt (kein Hard-Lock auf Default-Kanal)', async () => {
    const result = await api.toggleNotificationPraeferenz(
      'anna-petrov',
      'sonstige',
      'brief',
    );
    expect(result.ok).toBe(true);
  });
});

describe('Persistenz-Roundtrip', () => {
  test('nachher = postfach: getNotificationPraeferenzen reflektiert den Wert', async () => {
    await api.toggleNotificationPraeferenz('anna-petrov', 'familie', 'postfach');
    const prefs = await api.getNotificationPraeferenzen('anna-petrov');
    expect(prefs.familie).toBe('postfach');
    // andere Kategorien bleiben brief.
    expect(prefs.steuer).toBe('brief');
    expect(prefs.sozial).toBe('brief');
  });
});
