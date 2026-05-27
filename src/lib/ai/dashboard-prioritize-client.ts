/**
 * Client-side bridge for the dashboard "KI"-sort AI path.
 *
 * The Anthropic call MUST run server-side (the key never reaches the browser),
 * so the dashboard cannot call `prioritizeTopActionsAi` directly. This helper
 * POSTs the structured candidates to `/api/dashboard/top-actions` and returns
 * the validated ranking. If the fetch fails for ANY reason (offline, route
 * 500, network error) it falls back to the deterministic Frist-sort — the
 * demo must never break offline.
 *
 * Where to call it:
 *   - The dashboard's "KI" sort (`redesign-dashboard.md` §7) should call this
 *     instead of the deterministic mock-backend stub
 *     (`dashboardApi.prioritizeTopActions`). The mock-backend stub stays in
 *     place as the synchronous, never-throwing fallback.
 *   - Recommended wiring (one line, for mock-backend-coder OR the dashboard
 *     frontend): replace the stub body with
 *       `prioritizeTopActions: (candidates) =>
 *          fetchPrioritizedTopActions(candidates).then((r) => r.ranking)`
 *     — keeping `deterministicRank` as the import-side fallback. See
 *     `docs/reviews/2026-05-27-assistant-needs.md`.
 *
 * This module is browser-safe: it only uses `fetch` and the pure
 * `deterministicRank`. It does NOT import the server-only Anthropic client.
 */

import {
  deterministicRank,
  type PrioritizeOutcome,
} from './dashboard-prioritize';
import type { PrioritizedTopAction, TopActionCandidateInput } from '@/types';

export interface PrioritizeClientResult {
  ranking: PrioritizedTopAction[];
  outcome: PrioritizeOutcome | 'fallback:fetch_error';
}

/**
 * Fetch the AI ranking from the server route, falling back deterministically
 * on any error. Always resolves — never rejects.
 */
export async function fetchPrioritizedTopActions(
  candidates: TopActionCandidateInput[],
): Promise<PrioritizeClientResult> {
  if (candidates.length === 0) {
    return { ranking: [], outcome: 'fallback:empty' };
  }
  try {
    const res = await fetch('/api/dashboard/top-actions', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ candidates }),
    });
    if (!res.ok) {
      return {
        ranking: deterministicRank(candidates),
        outcome: 'fallback:fetch_error',
      };
    }
    const data = (await res.json()) as PrioritizeClientResult;
    if (!Array.isArray(data?.ranking)) {
      return {
        ranking: deterministicRank(candidates),
        outcome: 'fallback:fetch_error',
      };
    }
    return data;
  } catch {
    return {
      ranking: deterministicRank(candidates),
      outcome: 'fallback:fetch_error',
    };
  }
}
