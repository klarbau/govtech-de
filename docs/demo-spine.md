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
| 2 | Dashboard shows "heute zu tun" incl. the Umzug nudge | `(app)/dashboard` | shipped |
| 3 | **User tells the assistant "leite meinen Umzug ein"** | `(app)/assistent` + `lib/ai/**` | shipped |
| 4 | Assistant proposes params → user confirms → autopilot fires | `lib/mock-backend/autopilot/umzug.ts` | shipped (wired: confirm-gated `preview_umzug` → `starte_umzug`) |
| 5 | Autopilot timeline: each Behörde "receives" the change | `components/autopilot/**` | shipped |
| 6 | Confirmations land in Posteingang with AI summaries | `(app)/posteingang` | shipped |

**The spine is CLOSED — demo-shipped.** Steps 1–6 run green end-to-end (`tests/e2e/spine.spec.ts`); the assistant triggers the Umzug autopilot via the confirm-gated `preview_umzug` → `starte_umzug` flow (offline-graceful). The gate is no longer "close the spine" but **amplification vs. dispersion**: does a candidate deepen the working autopilot/cascade/receipt hero, or scatter into disconnected net-new surfaces?

## Spine surfaces vs supporting surfaces

**Spine** (full rigor — 6 locales human-reviewed, AR-RTL audited, a11y PASS, whole-journey e2e green, adversarial demo-impact review):
- onboarding, dashboard (the Umzug nudge only), **assistent**, autopilot timeline, posteingang (letter list + AI summary).

**Supporting** (reduced rigor until promoted — DE source + fast-drafted other locales flagged `needs_review`, a11y PASS still mandatory, no sub-versioning while the spine is incomplete):
- Stammdaten (V1–V1.3 — **frozen**), Dokumente, Termine, Datenschutz-Cockpit, Steuer, Familie.

a11y is non-negotiable on both tracks — it is a BITV credibility signal, not polish.

## Current bet / next action

**Shipped (2026-05-30): the full-sweep redesign + Convenience-Pass-1 are on the baseline** (branch `redesign-prototype-sweep`). All 10 screens on the unified design system (cobalt `#2563EB` + Inter) + mock-backend; spine demo-shipped. Pass-1 made the autopilot's convenience undeniable: value-receipt, agent-voice cascade, Datenminimierung receipt, EUDI export, Termin ops, autopilot-catalog teaser, calm empty states. Gates green: 681/681 unit, spine e2e green, `next build` green, a11y PASS (incl. a real-`inert` focus-trap fix for the base-ui modals), 6-locale i18n at parity.

**NEXT BET (decided 2026-05-30): wow-backlog #1 — "Kontinuierlicher Kaskaden-Moment."** The hero works but its emotional payoff is fragmented across routes: after the citizen says one sentence, the cascade plays on a *separate* page (`/vorgaenge/umzug/run`), reached via a link in `ToolCallCard`. Make it CONTINUOUS — stream the cascade INLINE in the assistant thread (+ per-Behörde consequence receipt + Once-Only counter + Stammdaten source line + confirmations landing in Posteingang). Pure presentation re-wire of already-validated data; highest wow×feasibility×realism in the pool. Full ranked backlog + non-negotiable realism guardrails: [`docs/research/wow-backlog.md`](research/wow-backlog.md).

Standing rule holds: amplify the hero, ground every claim (conditional / `[MOCK]`, € amounts only "geschätzt ca.", only antragsloses Kindergeld is truly antragslos), and resist the long tail of net-new persona verticals until the hero is continuous.

## How this file gates work

- `product-architect` refuses to spec a new sub-version of a solved supporting surface while a spine surface is a stub. Kick back here.
- `concept-verifier`'s first test is "does this advance the spine?" A legally perfect feature that doesn't move the headline story gets REVISE.
- `i18n-localizer` and `code-reviewer` read the spec's `track:` field and apply the matching rigor tier.

_Last updated: 2026-05-30 — spine CLOSED + Convenience-Pass-1 shipped; bet: wow-backlog #1 (make the cascade continuous, inline in the assistant)._
