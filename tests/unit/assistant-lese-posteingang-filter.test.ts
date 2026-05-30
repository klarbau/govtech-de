/**
 * Regression lock for the `lese_posteingang` tool-filter drift (wow-1 audit
 * defect #1).
 *
 * The tool's public JSONSchema advertises `{absender, status (single string),
 * max}`, but the API's `LetterFilter` has no `absender`, its `status` is an
 * ARRAY, and there is no `max`. The old dispatch path blind-cast the model's
 * args, so a single-string `status: 'ungelesen'` was iterated char-by-char by
 * `getLetters` (`'ungelesen'.length === 9`) and matched NOTHING — "zeig mir die
 * ungelesenen Briefe" silently returned an empty list.
 *
 * This test pins:
 *   1. The OLD bug shape (single-string status) returns empty — documents why
 *      the translation is mandatory.
 *   2. `toLetterFilter({status:'ungelesen'})` → real LetterFilter → getLetters
 *      returns ONLY unread letters (the fix).
 *   3. `filterLettersPostFetch` applies the `absender` substring (id + name_de)
 *      and the `max` cap that getLetters does not support.
 *
 * Setup mirrors reply-roundtrip.test.ts: vitest `node` env, in-memory
 * localStorage + window stub before importing the in-process core api,
 * NEXT_PUBLIC_RELIABLE='1' to disable the 5% error injection.
 */
import { beforeAll, beforeEach, describe, expect, test } from 'vitest';

import {
  toLetterFilter,
  filterLettersPostFetch,
  LESE_POSTEINGANG_DEFAULT_MAX,
} from '@/components/assistent/dispatch-tool';
import type { Letter } from '@/types';

// --------------------------------------------------------------------------
// localStorage + window stubs (before importing the core api)
// --------------------------------------------------------------------------

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
  process.env.NEXT_PUBLIC_RELIABLE = '1';
  Object.defineProperty(globalThis, 'window', {
    value: { localStorage: storage, location: { search: '' } },
    writable: true,
    configurable: true,
  });
  Object.defineProperty(globalThis, 'localStorage', {
    value: storage,
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
  // Anna Petrov's seed inbox has all three states (11 ungelesen / 4 gelesen /
  // 1 erledigt) — the fixture that makes every status assertion meaningful.
  reseedForActivePersona('anna-petrov');
});

// --------------------------------------------------------------------------
// toLetterFilter — field translation
// --------------------------------------------------------------------------

describe('toLetterFilter — tool filter → LetterFilter', () => {
  test('single-string status is lifted into a status ARRAY', () => {
    expect(toLetterFilter({ status: 'ungelesen' })).toEqual({
      status: ['ungelesen'],
    });
  });

  test('vorgang_id passes through; absender + max are NOT in LetterFilter', () => {
    const f = toLetterFilter({
      absender: 'finanzamt',
      status: 'gelesen',
      vorgang_id: 'vg-x',
      max: 3,
    });
    expect(f).toEqual({ status: ['gelesen'], vorgang_id: 'vg-x' });
    expect('absender' in f).toBe(false);
    expect('max' in f).toBe(false);
  });

  test('empty/undefined filter → empty LetterFilter', () => {
    expect(toLetterFilter(undefined)).toEqual({});
    expect(toLetterFilter({})).toEqual({});
  });
});

// --------------------------------------------------------------------------
// End-to-end against the in-process core api.getLetters
// --------------------------------------------------------------------------

describe('lese_posteingang end-to-end — getLetters', () => {
  test('THE BUG: a single-string status blind-cast returns NOTHING', async () => {
    // What the old dispatch path did: pass the tool input straight through.
    // 'ungelesen'.length === 9, so getLetters iterates 9 single chars and
    // matches no letter status — the silent empty result the audit found.
    const broken = await api.getLetters({
      status: 'ungelesen',
    } as unknown as Parameters<typeof api.getLetters>[0]);
    expect(broken).toHaveLength(0);
  });

  test('THE FIX: toLetterFilter({status:"ungelesen"}) returns ONLY unread', async () => {
    const all = await api.getLetters();
    const unread = await api.getLetters(toLetterFilter({ status: 'ungelesen' }));

    // There must be at least one unread letter for the assertion to be meaningful.
    expect(unread.length).toBeGreaterThan(0);
    // Strictly a subset of all, and every returned letter is unread.
    expect(unread.length).toBeLessThanOrEqual(all.length);
    expect(unread.every((l) => l.status === 'ungelesen')).toBe(true);
    // Sanity: the fix returns the SAME set as the canonical unread filter.
    const canonical = await api.getLetters({ unread: true });
    expect(new Set(unread.map((l) => l.id))).toEqual(
      new Set(canonical.map((l) => l.id)),
    );
  });

  test('status:"erledigt" returns only erledigt letters', async () => {
    const done = await api.getLetters(toLetterFilter({ status: 'erledigt' }));
    expect(done.every((l) => l.status === 'erledigt')).toBe(true);
  });
});

// --------------------------------------------------------------------------
// filterLettersPostFetch — absender substring + max cap
// --------------------------------------------------------------------------

function letter(id: string, behoerdeId: string): Letter {
  // Minimal cast — only the fields the post-filter reads matter.
  return {
    id,
    absender_behoerde_id: behoerdeId,
    status: 'ungelesen',
    empfangen_am: '2026-01-01',
  } as unknown as Letter;
}

describe('filterLettersPostFetch — absender substring + max', () => {
  const letters = [
    letter('l1', 'finanzamt-berlin'),
    letter('l2', 'beitragsservice-ardzdf'),
    letter('l3', 'buergeramt-mitte'),
  ];
  const nameById = new Map<string, string>([
    ['finanzamt-berlin', 'finanzamt berlin-mitte'],
    ['beitragsservice-ardzdf', 'beitragsservice ard zdf deutschlandradio'],
    ['buergeramt-mitte', 'bürgeramt berlin-mitte'],
  ]);

  test('absender matches the behoerde id substring (case-insensitive)', () => {
    const out = filterLettersPostFetch(letters, nameById, {
      absender: 'FINANZ',
    });
    expect(out.map((l) => l.id)).toEqual(['l1']);
  });

  test('absender matches the behoerde name_de when id does not', () => {
    // "deutschlandradio" appears only in name_de, not the id.
    const out = filterLettersPostFetch(letters, nameById, {
      absender: 'deutschlandradio',
    });
    expect(out.map((l) => l.id)).toEqual(['l2']);
  });

  test('no absender match → empty', () => {
    const out = filterLettersPostFetch(letters, nameById, {
      absender: 'kfz-zulassung',
    });
    expect(out).toHaveLength(0);
  });

  test('max caps the result and keeps the first (most recent) entries', () => {
    const out = filterLettersPostFetch(letters, nameById, { max: 2 });
    expect(out.map((l) => l.id)).toEqual(['l1', 'l2']);
  });

  test('default cap is LESE_POSTEINGANG_DEFAULT_MAX when max omitted', () => {
    const many = Array.from({ length: 25 }, (_, i) =>
      letter(`x${i}`, 'finanzamt-berlin'),
    );
    const out = filterLettersPostFetch(many, nameById, undefined);
    expect(out).toHaveLength(LESE_POSTEINGANG_DEFAULT_MAX);
  });
});
