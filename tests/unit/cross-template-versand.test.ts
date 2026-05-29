/**
 * V1.5.1 — Cross-Template-Versand-Tests (Spec § 8 + § 12.1).
 *
 * Coverage:
 *   - End-to-End-Mock: 2 Replies auf demselben Letter (Einspruch + Aussetzung)
 *     mit distinkten `id`, distinkten `template_id`, distinkten `sent_at`.
 *   - `getReplyByLetterId` liefert chronologisch jüngste Reply.
 *   - `getRepliesForLetter` liefert beide Replies aufsteigend chronologisch.
 *   - LocalStorage-Migration `Record<letterId, Reply>` → `Record<letterId, Reply[]>`
 *     (V1.5.0 → V1.5.1).
 *   - `simulateSendReply` Activity-Log-Note enthält `template_id:<id>; channel:<…>`.
 */
import { afterEach, beforeAll, beforeEach, describe, expect, test } from 'vitest';
import type { Reply } from '@/types';

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

let testStorage: MemoryStorage;

beforeAll(() => {
  testStorage = new MemoryStorage();
  process.env.NEXT_PUBLIC_RELIABLE = '1';
  Object.defineProperty(globalThis, 'window', {
    value: {
      localStorage: testStorage,
      location: { search: '' },
    },
    writable: true,
    configurable: true,
  });
  Object.defineProperty(globalThis, 'localStorage', {
    value: testStorage,
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
    window.localStorage.removeItem('govtech-de:v1:letter-replies');
    window.localStorage.removeItem('govtech-de:v1:letter-activity-log');
  }
});

const MEHMET_LETTER = 'letter-mehmet-fa-steuerbescheid-2024';

// --------------------------------------------------------------------------
// Cross-Template-Versand-Pfad: 2 Replies auf demselben Letter.
// --------------------------------------------------------------------------

describe('Cross-Template-Versand — 2 Replies auf demselben Letter', () => {
  test('Einspruch + Aussetzung → distinct id, distinct template_id, distinct sent_at', async () => {
    // Reply 1 (Einspruch).
    const draft1 = await api.saveReplyDraft(MEHMET_LETTER, {
      template_id: 'rechtsbehelf_einspruch_skelett',
      body_de: '[MOCK] Einspruch-Body',
    });
    const sent1 = await api.sendReplySimulated(MEHMET_LETTER, draft1);

    // Tiny delay to ensure different sent_at timestamps. ISO-8601 second
    // precision means same-tick replies might collide; force at least 10 ms.
    await new Promise((r) => setTimeout(r, 25));

    // Reply 2 (Aussetzung) — neuer Draft, neue id.
    const draft2 = await api.saveReplyDraft(MEHMET_LETTER, {
      template_id: 'aussetzung_vollziehung_skelett',
      body_de: '[MOCK] Aussetzung-Body',
    });
    const sent2 = await api.sendReplySimulated(MEHMET_LETTER, draft2);

    // Distinct ids:
    expect(sent1.id).not.toBe(sent2.id);
    // Distinct template_ids:
    expect(sent1.template_id).toBe('rechtsbehelf_einspruch_skelett');
    expect(sent2.template_id).toBe('aussetzung_vollziehung_skelett');
    // Both letter_id same:
    expect(sent1.letter_id).toBe(MEHMET_LETTER);
    expect(sent2.letter_id).toBe(MEHMET_LETTER);
    // Both sent_at distinct:
    expect(sent1.sent_at).not.toBe(sent2.sent_at);
    expect(sent1.sent_at).toBeTruthy();
    expect(sent2.sent_at).toBeTruthy();
  });

  test('getReplyByLetterId returns chronologically latest reply', async () => {
    const draft1 = await api.saveReplyDraft(MEHMET_LETTER, {
      template_id: 'rechtsbehelf_einspruch_skelett',
      body_de: '[MOCK] Einspruch.',
    });
    await api.sendReplySimulated(MEHMET_LETTER, draft1);

    await new Promise((r) => setTimeout(r, 25));

    const draft2 = await api.saveReplyDraft(MEHMET_LETTER, {
      template_id: 'aussetzung_vollziehung_skelett',
      body_de: '[MOCK] Aussetzung.',
    });
    const sent2 = await api.sendReplySimulated(MEHMET_LETTER, draft2);

    const latest = await api.getReplyByLetterId(MEHMET_LETTER);
    expect(latest?.id).toBe(sent2.id);
    expect(latest?.template_id).toBe('aussetzung_vollziehung_skelett');
  });

  test('getRepliesForLetter returns both replies in chronological order', async () => {
    const draft1 = await api.saveReplyDraft(MEHMET_LETTER, {
      template_id: 'rechtsbehelf_einspruch_skelett',
      body_de: '[MOCK] Einspruch.',
    });
    const sent1 = await api.sendReplySimulated(MEHMET_LETTER, draft1);

    await new Promise((r) => setTimeout(r, 25));

    const draft2 = await api.saveReplyDraft(MEHMET_LETTER, {
      template_id: 'aussetzung_vollziehung_skelett',
      body_de: '[MOCK] Aussetzung.',
    });
    const sent2 = await api.sendReplySimulated(MEHMET_LETTER, draft2);

    const all = await api.getRepliesForLetter(MEHMET_LETTER);
    expect(all).toHaveLength(2);
    // Aufsteigend sortiert: Reply 1 zuerst, Reply 2 danach.
    expect(all[0].id).toBe(sent1.id);
    expect(all[1].id).toBe(sent2.id);
  });

  test('after Cross-Template-Versand, getReplyDraft returns null (kein offener Draft)', async () => {
    const draft1 = await api.saveReplyDraft(MEHMET_LETTER, {
      template_id: 'rechtsbehelf_einspruch_skelett',
      body_de: '[MOCK]',
    });
    await api.sendReplySimulated(MEHMET_LETTER, draft1);

    const draft2 = await api.saveReplyDraft(MEHMET_LETTER, {
      template_id: 'aussetzung_vollziehung_skelett',
      body_de: '[MOCK]',
    });
    await api.sendReplySimulated(MEHMET_LETTER, draft2);

    expect(await api.getReplyDraft(MEHMET_LETTER)).toBeNull();
  });
});

// --------------------------------------------------------------------------
// Activity-Log: template_id:<id>; channel:<…> Format (Spec § 11.11).
// --------------------------------------------------------------------------

describe('Cross-Template-Versand — Activity-Log Note-Format', () => {
  test('reply_sent_simulated note enthält template_id:<id>; channel:<resolved>', async () => {
    const draft = await api.saveReplyDraft(MEHMET_LETTER, {
      template_id: 'rechtsbehelf_einspruch_skelett',
      body_de: '[MOCK]',
    });
    await api.sendReplySimulated(MEHMET_LETTER, draft);

    const log = await api.getLetterAktivitaet(MEHMET_LETTER);
    const sent = log.find((e) => e.event === 'reply_sent_simulated');
    expect(sent).toBeDefined();
    expect(sent?.note).toMatch(/template_id:rechtsbehelf_einspruch_skelett/);
    // Mehmet-FA-Köln-Mitte → ELSTER-Postfach (api.ts: id.startsWith('finanzamt-')).
    expect(sent?.note).toMatch(/channel:ELSTER-Postfach/);
    // Spec § 11.11: semicolon-getrennt.
    expect(sent?.note).toMatch(/template_id:[^;]+;\s*channel:/);
  });

  test('reply_template_inserted note enthält template_id:<id> (V1.5.1-Format)', async () => {
    await api.saveReplyDraft(MEHMET_LETTER, {
      template_id: 'aussetzung_vollziehung_skelett',
      body_de: '[MOCK]',
    });
    const log = await api.getLetterAktivitaet(MEHMET_LETTER);
    const inserted = log.find((e) => e.event === 'reply_template_inserted');
    expect(inserted?.note).toBe('template_id:aussetzung_vollziehung_skelett');
  });
});

// --------------------------------------------------------------------------
// LocalStorage-Migration V1.5.0 → V1.5.1.
// --------------------------------------------------------------------------

describe('Persistence — V1.5.0 → V1.5.1 letter-replies-Migration', () => {
  test('Record<string, Reply> wird beim Boot zu Record<string, Reply[]> migriert', async () => {
    // Storage komplett leeren (Migration-Marker auch).
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem('govtech-de:v1:letter-replies');
      window.localStorage.removeItem('govtech-de:v1:schema-migrations');
    }

    // Synthetische V1.5.0-Daten (Record<letterId, Reply>) injizieren — bevor
    // die Migration läuft.
    const v150Reply: Reply = {
      id: 'reply-v150-legacy',
      letter_id: MEHMET_LETTER,
      status: 'sent_simulated',
      template_id: 'frist_verlaengerung',
      body_de: '[MOCK] V1.5.0 legacy reply',
      attachments: [],
      created_at: '2026-05-08T10:00:00.000Z',
      updated_at: '2026-05-08T10:00:00.000Z',
      sent_at: '2026-05-08T10:00:00.000Z',
      kanal: 'ELSTER-Postfach',
    };
    const v150Map: Record<string, Reply> = {
      [MEHMET_LETTER]: v150Reply,
    };
    window.localStorage.setItem(
      'govtech-de:v1:letter-replies',
      JSON.stringify(v150Map),
    );

    // Re-import des Mock-Backend-Moduls geht hier nicht trivial; stattdessen
    // direkt die Migration triggern, indem wir reseedForActivePersona aufrufen
    // — das ruft seedIfEmpty() auf, das wiederum runStorageMigrations() läuft.
    // ABER: reseedForActivePersona schreibt den Bucket neu (leerer Map). Wir
    // brauchen also stattdessen einen direkten Migrations-Trigger.
    const { runStorageMigrations } = await import(
      '@/lib/mock-backend/persistence-migrations'
    );
    runStorageMigrations();

    // Nach Migration: Bucket sollte als Record<string, Reply[]> liegen.
    const raw = window.localStorage.getItem('govtech-de:v1:letter-replies');
    expect(raw).not.toBeNull();
    const parsed = JSON.parse(raw as string);

    expect(parsed[MEHMET_LETTER]).toBeInstanceOf(Array);
    expect(parsed[MEHMET_LETTER]).toHaveLength(1);
    expect(parsed[MEHMET_LETTER][0].id).toBe('reply-v150-legacy');

    // Migration-Marker geschrieben:
    const markerRaw = window.localStorage.getItem(
      'govtech-de:v1:schema-migrations',
    );
    expect(markerRaw).not.toBeNull();
    const marker = JSON.parse(markerRaw as string);
    expect(marker).toContain('v150-to-v151-letter-replies-array');
  });

  test('Wenn schon im V1.5.1-Shape, ist Migration ein No-op', async () => {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem('govtech-de:v1:letter-replies');
      window.localStorage.removeItem('govtech-de:v1:schema-migrations');
    }

    const v151Reply: Reply = {
      id: 'reply-v151-already',
      letter_id: MEHMET_LETTER,
      status: 'draft',
      template_id: 'rechtsbehelf_einspruch_skelett',
      body_de: '[MOCK]',
      attachments: [],
      created_at: '2026-05-09T10:00:00.000Z',
      updated_at: '2026-05-09T10:00:00.000Z',
      sent_at: null,
      kanal: null,
    };
    const v151Map: Record<string, Reply[]> = {
      [MEHMET_LETTER]: [v151Reply],
    };
    window.localStorage.setItem(
      'govtech-de:v1:letter-replies',
      JSON.stringify(v151Map),
    );

    const { runStorageMigrations } = await import(
      '@/lib/mock-backend/persistence-migrations'
    );
    runStorageMigrations();

    // Bucket bleibt unverändert.
    const raw = window.localStorage.getItem('govtech-de:v1:letter-replies');
    expect(raw).not.toBeNull();
    const parsed = JSON.parse(raw as string);
    expect(parsed[MEHMET_LETTER]).toHaveLength(1);
    expect(parsed[MEHMET_LETTER][0].id).toBe('reply-v151-already');
  });
});

// --------------------------------------------------------------------------
// JSON validity of letters.json — V1.5-ship-lessons reminder (smart-quote
// outage prevention).
// --------------------------------------------------------------------------

describe('letters.json — JSON.parse validity', () => {
  test('letters.json roundtrips through JSON.parse without errors', async () => {
    const fs = await import('node:fs');
    const path = await import('node:path');
    const file = path.resolve(
      process.cwd(),
      'src/data/letters.json',
    );
    expect(() => JSON.parse(fs.readFileSync(file, 'utf8'))).not.toThrow();
  });

  test('letters.json contains 11 letters with bescheid_dated_at (V1.5.1 § 5.3 + V1.1 renteninfo)', async () => {
    // V1.5.1: 10 V1.5.1-Briefe (steuer / KK-Beitrag / BG-Beitrag / IHK-Beitrag /
    // Beitragsservice / Familienkasse-Aufhebung / …).
    // V1.1: + 1 renteninfo-Brief (`letter-renteninfo-anna-2026-05` mit
    // `bescheid_dated_at: '2026-05-04'`).
    const fs = await import('node:fs');
    const path = await import('node:path');
    const file = path.resolve(
      process.cwd(),
      'src/data/letters.json',
    );
    const raw = fs.readFileSync(file, 'utf8');
    const letters = JSON.parse(raw) as Array<Record<string, unknown>>;
    const withBescheid = letters.filter(
      (l) => typeof l.bescheid_dated_at === 'string',
    );
    expect(withBescheid).toHaveLength(11);
  });

  test('all bescheid_dated_at values are ISO-8601 YYYY-MM-DD', async () => {
    const fs = await import('node:fs');
    const path = await import('node:path');
    const file = path.resolve(
      process.cwd(),
      'src/data/letters.json',
    );
    const raw = fs.readFileSync(file, 'utf8');
    const letters = JSON.parse(raw) as Array<{ bescheid_dated_at?: string }>;
    for (const letter of letters) {
      if (letter.bescheid_dated_at !== undefined) {
        expect(letter.bescheid_dated_at).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      }
    }
  });
});
