/**
 * Transaktionale Outbox (Spec § 2.2, § 3.5).
 *
 * Reine Helfer für Backoff-Scheduling + Eligibility. Der durable Queue-State
 * (`OutboxEntry[]`) lebt im `orchestration:outbox`-Bucket und wird vom Engine
 * via `commit()` zusammen mit Saga + Audit geschrieben — niemals separat.
 *
 * Retry-Policy (fix, § 3.3): capped exponential backoff + full jitter.
 *   base = 500ms, factor = 2, cap = 8000ms, MAX_ATTEMPTS = 5.
 *   delay = random(0, min(cap, base * 2^(attempts-1)))
 * `random` kommt aus dem injizierten Seam (in Tests deterministisch gestubbt).
 */
import type { OutboxEntry } from '@/types/orchestration';

export const MAX_ATTEMPTS = 5;
const BACKOFF_BASE_MS = 500;
const BACKOFF_FACTOR = 2;
const BACKOFF_CAP_MS = 8_000;

/**
 * Capped exponential backoff with full jitter.
 * `attempts` is the attempt count AFTER the failed try (1 = first failure).
 */
export function computeBackoffMs(attempts: number, random: () => number): number {
  const exp = BACKOFF_BASE_MS * Math.pow(BACKOFF_FACTOR, Math.max(0, attempts - 1));
  const cap = Math.min(BACKOFF_CAP_MS, exp);
  return Math.floor(random() * cap);
}

/**
 * Whether an outbox entry is eligible to drain at `nowIso`:
 * pending/inflight status AND (no nextDrainAt OR nextDrainAt ≤ now).
 */
export function isDrainEligible(entry: OutboxEntry, nowIso: string): boolean {
  if (entry.status !== 'pending' && entry.status !== 'inflight') return false;
  if (!entry.nextDrainAt) return true;
  return entry.nextDrainAt <= nowIso;
}
