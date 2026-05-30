/**
 * Server-side write gate for irreversible mock-backend writes (audit defect #2).
 *
 * The `POST /api/mock` dispatcher allowlists EVERY `api` function, so a raw
 * `{"method":"startUmzug"}` ran the cascade with no confirmation, bypassing the
 * React preview→confirm card. The gate now requires a single-use, session-
 * scoped preview token that only a preceding `previewUmzug` mints.
 *
 * This file pins:
 *   1. The pure token logic: record→consume succeeds once (single-use), a
 *      mismatched address is rejected, and a TTL-expired token is rejected.
 *   2. The full dispatch path:
 *        - raw `startUmzug` with NO preceding `previewUmzug` → 403
 *          CONFIRMATION_REQUIRED (the bypass is closed).
 *        - the LEGIT sequence previewUmzug → startUmzug (same session, same
 *          move) → succeeds and returns a vorgangId (the demo flow still works).
 *        - a second `startUmzug` after the token is burned → 403 again
 *          (single-use; no replay).
 *
 * Setup mirrors reply-roundtrip.test.ts: in-memory localStorage + window stub
 * before importing the dispatcher (which transitively imports the core api),
 * NEXT_PUBLIC_RELIABLE='1' to disable the 5% error injection.
 */
import { beforeAll, beforeEach, describe, expect, test } from 'vitest';

import {
  __resetWriteGate,
  consumePreviewToken,
  recordPreviewToken,
} from '@/lib/mock-backend/server/write-gate';

// --------------------------------------------------------------------------
// localStorage + window stubs (before importing the dispatcher/core api)
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

const MOVE = {
  neue_adresse: {
    strasse: 'Torstraße',
    hausnummer: '120',
    plz: '10119',
    ort: 'Berlin',
    land: 'DE' as const,
  },
  stichtag: '2026-07-01',
};

/** The args array as the dispatcher receives it (`api.previewUmzug(args[0])`). */
function previewArgs() {
  return [{ neue_adresse: MOVE.neue_adresse, stichtag: MOVE.stichtag }];
}

/** The richer startUmzug arg — note it carries consents the gate ignores. */
function startArgs() {
  return [
    {
      neue_adresse: MOVE.neue_adresse,
      stichtag: MOVE.stichtag,
      consents: ['finanzamt'],
      betroffene_personen: ['anna-petrov'],
      source: 'assistant' as const,
    },
  ];
}

describe('write-gate token logic (pure)', () => {
  beforeEach(() => __resetWriteGate());

  test('record → consume succeeds exactly once (single-use)', () => {
    const sid = 'sess-1';
    recordPreviewToken(sid, previewArgs());
    // start binds on the SAME address+stichtag despite extra consent fields.
    expect(consumePreviewToken(sid, startArgs())).toBe(true);
    // Burned — a replay of the identical start is now rejected.
    expect(consumePreviewToken(sid, startArgs())).toBe(false);
  });

  test('a token for a different address does not unlock another move', () => {
    const sid = 'sess-2';
    recordPreviewToken(sid, previewArgs());
    const otherMove = [
      {
        neue_adresse: { ...MOVE.neue_adresse, strasse: 'Anderestraße', hausnummer: '9' },
        stichtag: MOVE.stichtag,
      },
    ];
    expect(consumePreviewToken(sid, otherMove)).toBe(false);
    // The original token survives the mismatch and still works.
    expect(consumePreviewToken(sid, startArgs())).toBe(true);
  });

  test('a TTL-expired token is rejected', () => {
    const sid = 'sess-3';
    const t0 = 10_000_000;
    recordPreviewToken(sid, previewArgs(), t0);
    // 30 min + 1 ms later → past the TTL.
    expect(consumePreviewToken(sid, startArgs(), t0 + 30 * 60_000 + 1)).toBe(false);
  });

  test('tokens are isolated per session', () => {
    recordPreviewToken('sess-a', previewArgs());
    // A different session never sees session-a's token.
    expect(consumePreviewToken('sess-b', startArgs())).toBe(false);
    expect(consumePreviewToken('sess-a', startArgs())).toBe(true);
  });
});

describe('dispatch path enforcement', () => {
  let dispatch: typeof import('@/lib/mock-backend/server/dispatch').dispatch;

  beforeAll(async () => {
    const mod = await import('@/lib/mock-backend/server/dispatch');
    dispatch = mod.dispatch;
  });

  beforeEach(() => __resetWriteGate());

  test('raw startUmzug with NO preceding previewUmzug is rejected 403', async () => {
    const res = await dispatch({
      method: 'startUmzug',
      args: startArgs(),
      sessionId: 'dispatch-attacker',
      reliable: true,
    });
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.status).toBe(403);
      expect(res.error.code).toBe('CONFIRMATION_REQUIRED');
    }
  });

  test('legit previewUmzug → startUmzug (same session) succeeds; replay then 403', async () => {
    const sid = 'dispatch-legit';

    // 1) Preview (read-only) mints the token.
    const preview = await dispatch({
      method: 'previewUmzug',
      args: previewArgs(),
      sessionId: sid,
      reliable: true,
    });
    expect(preview.ok).toBe(true);

    // 2) Start (write) consumes the token → cascade runs, vorgangId returned.
    const start = await dispatch({
      method: 'startUmzug',
      args: startArgs(),
      sessionId: sid,
      reliable: true,
    });
    expect(start.ok).toBe(true);
    if (start.ok) {
      expect((start.data as { vorgangId: string }).vorgangId).toMatch(/^vorgang-/);
    }

    // 3) Replay without a fresh preview → blocked (single-use).
    const replay = await dispatch({
      method: 'startUmzug',
      args: startArgs(),
      sessionId: sid,
      reliable: true,
    });
    expect(replay.ok).toBe(false);
    if (!replay.ok) expect(replay.status).toBe(403);
  });

  test('read-only methods are never gated', async () => {
    const res = await dispatch({
      method: 'getProfile',
      args: [],
      sessionId: 'dispatch-read',
      reliable: true,
    });
    expect(res.ok).toBe(true);
  });
});
