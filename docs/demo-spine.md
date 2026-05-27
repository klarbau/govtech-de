# Demo-Spine — the through-line the whole project serves

This is the single source of truth for **what the demo is about**. It is maintained by the orchestrator (main thread), not by a coder agent. Every feature that enters the pipeline must earn its place against this file. When the bet changes, edit this file *first*, then let the change propagate.

Why this exists: the pipeline is excellent at answering "is this idea sound?" but had no place to answer "is this the *right* idea *right now*?" Without a spine, the project drifts into polishing solved surfaces (see project memory: *Polish is not vision*). This file is the prioritisation anchor.

---

## Headline wow (one sentence)

> The citizen says "ich ziehe um" once, and the system notifies every competent Behörde for them — Einwohnermeldeamt, Finanzamt, KFZ-Stelle, Krankenkasse, Rundfunkbeitrag, Arbeitgeber — while they watch the confirmations arrive.

If a viewer remembers one thing from the Loom, it is this. Everything else is supporting cast.

## The spine (the path that appears in the 3-minute Loom)

Ordered. This is the only end-to-end journey that must always run green.

| # | Step | Surface | State |
|---|---|---|---|
| 1 | Login with DeutschlandID + EUDI Wallet | `(auth)/onboarding` | built |
| 2 | Dashboard shows "heute zu tun" incl. the Umzug nudge | `(app)/dashboard` | spec exists, not shipped |
| 3 | **User tells the assistant "leite meinen Umzug ein"** | `(app)/assistent` + `lib/ai/**` | **STUB — this is the gap that breaks the spine** |
| 4 | Assistant proposes params → user confirms → autopilot fires | `lib/mock-backend/autopilot/umzug.ts` | built (backend), not wired to assistant |
| 5 | Autopilot timeline: each Behörde "receives" the change | `components/autopilot/**` | built |
| 6 | Confirmations land in Posteingang with AI summaries | `(app)/posteingang` | built |

**The spine is currently broken at step 3.** The declared hero (assistant + autopilot) was prototyped on day one and abandoned; the assistant page is a 5-line placeholder. This is the highest-leverage thing in the project and the next pipeline run must close it.

## Spine surfaces vs supporting surfaces

**Spine** (full rigor — 6 locales human-reviewed, AR-RTL audited, a11y PASS, whole-journey e2e green, adversarial demo-impact review):
- onboarding, dashboard (the Umzug nudge only), **assistent**, autopilot timeline, posteingang (letter list + AI summary).

**Supporting** (reduced rigor until promoted — DE source + fast-drafted other locales flagged `needs_review`, a11y PASS still mandatory, no sub-versioning while the spine is incomplete):
- Stammdaten (V1–V1.3 — **frozen**), Dokumente, Termine, Datenschutz-Cockpit, Steuer, Familie.

a11y is non-negotiable on both tracks — it is a BITV credibility signal, not polish.

## Current bet / next action

**ACTIVE BUILD (decided 2026-05-27): full-sweep redesign from a user-supplied prototype.** The user delivered a complete, coherent visual prototype for all 10 screens (`docs/design-prototype/*.png`) and authorized a full sweep — every screen rebuilt to this unified design system, functional on the mock-backend. This is a deliberate override of "freeze supporting": adopting a concrete, user-supplied design vision app-wide is not aimless polish, and the hero (Assistent) is inside the sweep, so the spine is served too.

Because the design is user-supplied, the pipeline skips `research-scout`/`domain-expert`/`concept-verifier` for this work (Stage 0 is satisfied directly — the user IS the vision source). Path: `product-architect` (extract design system + screen specs from the prototype) → `frontend-coder` (+ `mock-backend-coder` for new screen data, `assistant-engineer` for Assistent) → `i18n-localizer` + `a11y-tester` → `code-reviewer`.

Build order (foundation gates everything):
1. **Foundation** — reconcile tokens + app shell (Sidebar/Topbar) + shared primitives against the prototype.
2. **Screens** — Dashboard, Assistent (hero), Posteingang/Vorgänge re-skin, then Dokumente, Termine, Steuer, Familie, Datenschutz, Stammdaten re-skin.
3. **demo-shipped** — spine e2e (steps 1–6 above) green end-to-end.

After this redesign: the standing rule reverts — build the hero before polishing, freeze supporting surfaces, no sub-versioning while the spine is a stub.

## How this file gates work

- `product-architect` refuses to spec a new sub-version of a solved supporting surface while a spine surface is a stub. Kick back here.
- `concept-verifier`'s first test is "does this advance the spine?" A legally perfect feature that doesn't move the headline story gets REVISE.
- `i18n-localizer` and `code-reviewer` read the spec's `track:` field and apply the matching rigor tier.

_Last updated: 2026-05-27 — bet: close the assistant→autopilot gap (step 3)._
