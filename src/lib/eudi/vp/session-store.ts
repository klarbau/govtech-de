/**
 * EUDI OpenID4VP verifier — in-memory session store (Spec §6.3).
 *
 * Pure + unit-testable. A process-local `Map<sessionId, VpSession>` with a 5-min
 * TTL. `sessionId`/`nonce` come from `node:crypto`. Every mutating call is
 * clock-injectable (`now` arg, default `Date.now()`) so the TTL + idempotency
 * gates can be tested deterministically.
 *
 * Serverless note (Spec §6.3 — DOCUMENT, don't build): a `Map` does not survive
 * Vercel cold starts / multiple lambdas. This feature is local-only (flag off on
 * Vercel → routes 404), so in-memory is correct here. A hypothetical deployed
 * verifier would swap the `Map` for Vercel KV behind this same interface —
 * mirroring Tier-2's "excluded from the deployed build" stance.
 */

import { randomBytes, randomUUID } from 'node:crypto';

import type { RequestMode, VpSession } from './types';

/** Session lifetime: 5 minutes (Spec §6.3). */
export const VP_SESSION_TTL_MS = 5 * 60 * 1000;

/**
 * Process-global store. Guarded against Next.js dev HMR module re-evaluation by
 * stashing the Map on `globalThis` (same pattern used for singletons in dev), so
 * an in-flight session survives a server-file hot reload.
 */
const STORE_KEY = Symbol.for('govtech.eudi.vp.sessionStore');

type Store = Map<string, VpSession>;

function store(): Store {
  const g = globalThis as unknown as Record<symbol, Store | undefined>;
  if (!g[STORE_KEY]) g[STORE_KEY] = new Map<string, VpSession>();
  return g[STORE_KEY];
}

/** A terminal state is never overwritten by expiry or a late response. */
function isTerminal(state: VpSession['state']): boolean {
  return state === 'verified' || state === 'error';
}

/**
 * Create a fresh session in `pending` state with a random id + nonce and a
 * 5-min TTL from `now`.
 */
export function createSession(
  requestMode: RequestMode,
  now: number = Date.now(),
): VpSession {
  const session: VpSession = {
    id: randomUUID(),
    nonce: randomBytes(32).toString('base64url'),
    state: 'pending',
    requestMode,
    createdAt: now,
    expiresAt: now + VP_SESSION_TTL_MS,
  };
  store().set(session.id, session);
  return session;
}

/**
 * Fetch a session, applying lazy TTL expiry: a non-terminal session past its
 * `expiresAt` flips to `expired` (and is returned in that state). A terminal
 * session (verified/error) is returned unchanged. Returns `undefined` for an
 * unknown id.
 */
export function getSession(
  id: string,
  now: number = Date.now(),
): VpSession | undefined {
  const session = store().get(id);
  if (!session) return undefined;
  if (!isTerminal(session.state) && now >= session.expiresAt) {
    session.state = 'expired';
  }
  return session;
}

/**
 * Mark a live session as `scanned` (wallet connected, verification in flight).
 * No-op if the session is unknown, terminal, or already expired.
 */
export function setScanned(id: string, now: number = Date.now()): VpSession | undefined {
  const session = getSession(id, now);
  if (!session) return undefined;
  if (session.state === 'pending') session.state = 'scanned';
  return session;
}

/**
 * Record a successful verification. Idempotent double-submit guard: only a
 * `pending`/`scanned` session transitions to `verified`; a second call (already
 * `verified`) or a call on a terminal/expired session is ignored.
 */
export function setVerified(
  id: string,
  claims: NonNullable<VpSession['claims']>,
  now: number = Date.now(),
): VpSession | undefined {
  const session = getSession(id, now);
  if (!session) return undefined;
  if (session.state === 'pending' || session.state === 'scanned') {
    session.state = 'verified';
    session.claims = claims;
    session.verifiedAt = now;
  }
  return session;
}

/**
 * Record a verification failure with an honest, PII-free reason. Only a
 * non-terminal session transitions to `error`.
 */
export function setError(
  id: string,
  reason: string,
  now: number = Date.now(),
): VpSession | undefined {
  const session = getSession(id, now);
  if (!session) return undefined;
  if (!isTerminal(session.state)) {
    session.state = 'error';
    session.error = reason;
  }
  return session;
}

/**
 * Remove every session past its TTL. Returns the number swept. Callers may run
 * this opportunistically; the store never grows unbounded because sessions are
 * short-lived and local-only.
 */
export function sweepExpired(now: number = Date.now()): number {
  const s = store();
  let swept = 0;
  for (const [id, session] of s) {
    if (now >= session.expiresAt) {
      s.delete(id);
      swept += 1;
    }
  }
  return swept;
}

/** Test-only: empty the store so cases don't leak into one another. */
export function __resetSessionStoreForTests(): void {
  store().clear();
}
