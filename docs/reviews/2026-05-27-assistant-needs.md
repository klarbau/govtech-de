# Assistant-engineer → mock-backend-coder hand-off (2026-05-27)

Context: redesign-assistent.md §7 (Umzug tool path) + redesign-dashboard.md §7
/ dashboard.md §4.4 (`prioritize_top_actions`). The AI side is built; this note
lists the (small) optional backend wiring the assistant-engineer recommends but
did NOT make, to respect the mock-backend ownership boundary.

## 1. `dashboardApi.prioritizeTopActions` — optional rewire (RECOMMENDED)

Today `src/lib/mock-backend/dashboard/api.ts` ships `prioritizeTopActions` as a
deterministic Frist-sort STUB (Hard-Line §11.44). The real AI path now exists:

- Server route: `src/app/api/dashboard/top-actions/route.ts` (POST `{candidates}`
  → `{ranking, outcome}`; Zod-validated; deterministic fallback on any failure
  incl. missing key).
- Client bridge: `src/lib/ai/dashboard-prioritize-client.ts`
  → `fetchPrioritizedTopActions(candidates): Promise<{ranking, outcome}>`.

The Anthropic call MUST run server-side (key never reaches the browser), so the
mock-backend stub cannot call the SDK directly. Two equally valid ways to use
the real path — pick whichever fits the dashboard frontend:

- **Frontend-driven (no backend change):** the dashboard "KI"-sort calls
  `fetchPrioritizedTopActions(candidates)` directly and keeps calling
  `api.prioritizeTopActions` only as the synchronous fallback. This needs NO
  mock-backend edit. (assistant-engineer's default expectation.)
- **Backend-wired (one line):** if you prefer `api.prioritizeTopActions` to be
  the single call site, replace the stub body with:

  ```ts
  // src/lib/mock-backend/dashboard/api.ts
  import { fetchPrioritizedTopActions } from '@/lib/ai/dashboard-prioritize-client';
  // …
  prioritizeTopActions: (candidates) =>
    fetchPrioritizedTopActions(candidates).then((r) => r.ranking),
  ```

  Keep `deterministicRank` in place — `fetchPrioritizedTopActions` already
  falls back to it on any error, so the demo never breaks offline. NOTE: this
  makes `prioritizeTopActions` only callable in a browser/SSR context that can
  `fetch` a relative URL; the existing SSR path (`getDashboard`) already ships a
  deterministic ranking in the snapshot, so this is fine.

No type changes required — `PrioritizedTopAction` / `TopActionCandidateInput`
are reused verbatim.

## 2. dashboard ai-log bucket (OPTIONAL, V1 nice-to-have)

dashboard.md §5.1 mentions `govtech-de:v1:dashboard:ai-log` (FIFO max 50) for
`{timestamp, persona_id, candidates_count, response, used_fallback}`. The AI
path returns an `outcome` discriminator (`'ai' | 'fallback:*'`) that maps
directly to `used_fallback`. The assistant-engineer did NOT create this bucket
(persistence is mock-backend territory). If you want the §11.44 fallback
activity-log event, persist `outcome !== 'ai'` from the dashboard frontend after
calling the bridge. Not required for the spine.

## 3. No `previewUmzug`/`startUmzug` changes needed

The Umzug tool path (`preview_umzug` → `api.previewUmzug`, `starte_umzug` →
`api.startUmzug`) maps onto existing methods unchanged. One field-name mapping
the CLIENT dispatcher (frontend-coder) owns, NOT the backend:

- tool input `stichtag_iso` → `UmzugInput.stichtag`
- tool input `block_b_consent` → `UmzugInput.consents`
- the dispatcher should set `UmzugInput.source = 'assistant'` and
  `betroffene_personen = [activePersonaId]`.

This is documented in redesign-assistent.md §7.3 and `tool-schemas.ts`
(`TOOL_DISPATCH`). No backend action.
