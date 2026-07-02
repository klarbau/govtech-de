/**
 * EUDI OpenID4VP verifier — in-memory session store (`src/lib/eudi/vp/session-store.ts`).
 *
 * Gates (Spec §12): create/get, TTL expiry (lazy, clock-injected), and the
 * idempotent-verify / double-submit guard. Pure + deterministic — the clock is
 * passed in, so no timers or real wall-clock dependence.
 */
import { beforeEach, describe, expect, test } from 'vitest';

import {
  VP_SESSION_TTL_MS,
  __resetSessionStoreForTests,
  createSession,
  getSession,
  setError,
  setScanned,
  setVerified,
  sweepExpired,
} from '@/lib/eudi/vp/session-store';

const T0 = 1_000_000_000_000; // fixed base instant (ms)

beforeEach(() => {
  __resetSessionStoreForTests();
});

describe('createSession / getSession', () => {
  test('creates a pending session with id, nonce and a 5-min TTL', () => {
    const s = createSession('unsigned', T0);
    expect(s.state).toBe('pending');
    expect(s.requestMode).toBe('unsigned');
    expect(s.id).toMatch(/[0-9a-f-]{36}/);
    expect(s.nonce.length).toBeGreaterThan(20);
    expect(s.createdAt).toBe(T0);
    expect(s.expiresAt).toBe(T0 + VP_SESSION_TTL_MS);
  });

  test('id and nonce are unique across sessions', () => {
    const a = createSession('unsigned', T0);
    const b = createSession('unsigned', T0);
    expect(a.id).not.toBe(b.id);
    expect(a.nonce).not.toBe(b.nonce);
  });

  test('getSession returns the live session before TTL', () => {
    const s = createSession('unsigned', T0);
    const got = getSession(s.id, T0 + 1000);
    expect(got?.state).toBe('pending');
  });

  test('unknown id → undefined', () => {
    expect(getSession('does-not-exist')).toBeUndefined();
  });
});

describe('TTL expiry (lazy)', () => {
  test('a pending session flips to expired once now >= expiresAt', () => {
    const s = createSession('unsigned', T0);
    expect(getSession(s.id, s.expiresAt - 1)?.state).toBe('pending');
    expect(getSession(s.id, s.expiresAt)?.state).toBe('expired');
  });

  test('a verified session is terminal — not flipped to expired after TTL', () => {
    const s = createSession('unsigned', T0);
    setVerified(s.id, { given_name: 'Anna' }, T0 + 1000);
    const got = getSession(s.id, s.expiresAt + 5000);
    expect(got?.state).toBe('verified');
  });

  test('sweepExpired removes sessions past their TTL', () => {
    const s = createSession('unsigned', T0);
    expect(sweepExpired(s.expiresAt - 1)).toBe(0);
    expect(sweepExpired(s.expiresAt)).toBe(1);
    expect(getSession(s.id, s.expiresAt)).toBeUndefined();
  });
});

describe('state transitions', () => {
  test('setScanned moves pending → scanned', () => {
    const s = createSession('unsigned', T0);
    expect(setScanned(s.id, T0 + 10)?.state).toBe('scanned');
  });

  test('setError moves a live session → error with a reason', () => {
    const s = createSession('unsigned', T0);
    const got = setError(s.id, 'sd-hash-mismatch', T0 + 10);
    expect(got?.state).toBe('error');
    expect(got?.error).toBe('sd-hash-mismatch');
  });
});

describe('setVerified — idempotent double-submit guard', () => {
  test('records claims + verifiedAt on first verify', () => {
    const s = createSession('unsigned', T0);
    const got = setVerified(
      s.id,
      { given_name: 'Anna', family_name: 'Petrov', birthdate: '1997-03-22' },
      T0 + 20,
    );
    expect(got?.state).toBe('verified');
    expect(got?.claims).toEqual({
      given_name: 'Anna',
      family_name: 'Petrov',
      birthdate: '1997-03-22',
    });
    expect(got?.verifiedAt).toBe(T0 + 20);
  });

  test('a second setVerified is ignored (double-submit protection)', () => {
    const s = createSession('unsigned', T0);
    setVerified(s.id, { given_name: 'Anna' }, T0 + 20);
    const again = setVerified(s.id, { given_name: 'ATTACKER' }, T0 + 40);
    expect(again?.claims).toEqual({ given_name: 'Anna' });
    expect(again?.verifiedAt).toBe(T0 + 20);
  });

  test('setVerified on an expired session is ignored', () => {
    const s = createSession('unsigned', T0);
    const got = setVerified(s.id, { given_name: 'Anna' }, s.expiresAt + 1);
    expect(got?.state).toBe('expired');
    expect(got?.claims).toBeUndefined();
  });

  test('setError does not overwrite a verified session', () => {
    const s = createSession('unsigned', T0);
    setVerified(s.id, { given_name: 'Anna' }, T0 + 20);
    const got = setError(s.id, 'late-failure', T0 + 30);
    expect(got?.state).toBe('verified');
  });
});
