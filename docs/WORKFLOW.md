# Autonomous Workflow

This document codifies how the agents in `.claude/agents/` are orchestrated. The **main Claude thread does not write code or run web research directly** — it routes work through the specialized agents below. This is the rule the project user explicitly asked for: every idea is researched, then independently verified by a different agent, then specced, then built, then reviewed, before it is considered shipped.

## Stage 0 — Demo-Spine gate (orchestrator, before research-scout)

The pipeline is good at "is this idea sound?" but cannot answer "is this the *right* idea *right now*?". That question is the orchestrator's, and it is answered against [`docs/demo-spine.md`](demo-spine.md) — the single source of truth for the headline wow and the ordered path that appears in the Loom.

Before invoking `research-scout` for any new feature, the main thread writes 3 sentences:

1. **Which demo wow does this serve?** (point at a spine step in `demo-spine.md`)
2. **Why this, not the hero, now?** (if the hero/spine is incomplete, the honest answer is usually "it shouldn't be this")
3. **What gets cut or frozen to make room?**

If a feature does not advance the spine and the spine is still broken, do **not** enter the pipeline — close the spine first. This operationalises the project lesson *Polish is not vision*: a clean supporting surface is not progress while the hero is a stub.

## The pipeline

```
                          ┌──────────────────┐
   user idea / gap ─────▶ │  research-scout  │
                          └────────┬─────────┘
                                   │ docs/research/<topic>.md
                                   ▼
                          ┌──────────────────┐
                          │  domain-expert   │
                          └────────┬─────────┘
                                   │ docs/domain/<vorgang>.md
                                   ▼
                          ┌──────────────────┐
                          │ concept-verifier │  ← independent skeptic
                          └────────┬─────────┘
                                   │ docs/reviews/<date>-<feature>-verify.md
                                   │ verdict: PROCEED | REVISE | REJECT
                                   ▼
                          ┌──────────────────┐
                          │ product-architect│
                          └────────┬─────────┘
                                   │ docs/specs/<feature>.md (status: spec)
                                   ▼
                  ┌────────────────┼────────────────┐
                  ▼                ▼                ▼
          ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
          │ frontend-    │ │ mock-backend-│ │ assistant-   │
          │ coder        │ │ coder        │ │ engineer     │
          └──────┬───────┘ └──────┬───────┘ └──────┬───────┘
                 └────────┬───────┴────────┬───────┘
                          ▼                ▼
                 ┌──────────────┐  ┌──────────────┐
                 │ i18n-        │  │ a11y-tester  │
                 │ localizer    │  │              │
                 └──────┬───────┘  └──────┬───────┘
                        └────────┬───────┘
                                 ▼
                        ┌──────────────────┐
                        │  code-reviewer   │  ← final gate
                        └──────────────────┘
                                 │
                                 ▼
                       spec status: shipped
```

## Two-agent consensus rule

Nothing reaches the coder tier without **all** of the following holding:

1. `docs/research/<feature>.md` has `status: verified` (set by domain-expert).
2. `docs/reviews/<date>-<feature>-verify.md` has `verdict: PROCEED` (set by concept-verifier).
3. The feature advances a step in [`docs/demo-spine.md`](demo-spine.md), **or** the spine is already complete and this is a deliberate supporting-surface investment.

Note the asymmetry the consensus used to have: both research-scout and concept-verifier covered the *legal/realism* axis (the lowest-stakes axis for a mock demo — nobody litigates a mock letter), while the highest-stakes axis for a portfolio piece — *is this impressive and does it serve the story* — had no gate. Condition 3 + concept-verifier's reordered demo-impact test (see its definition) fix that.

If `concept-verifier` says REVISE, return to `research-scout`/`domain-expert` to address the gaps, then re-verify. If REJECT, escalate the alternative recommendation to the user before proposing another idea.

If `domain-expert` and `concept-verifier` disagree on a load-bearing question, **escalate to user** with both positions written into the review file. Do not attempt a tie-break inside the agent system.

## Rigor tiers (spine vs supporting)

Not every surface deserves production-grade ceremony. The spec's `track:` field decides:

| Concern | `track: spine` | `track: supporting` |
|---|---|---|
| i18n | all 6 locales, human-reviewed, AR-RTL audited | DE source + fast-drafted other 5, flagged `needs_review`; not a code-review blocker |
| a11y | PASS (axe 0 serious/critical, manual keyboard) | **same — non-negotiable on both tracks** |
| Whole-journey e2e | must be green before "demo-shipped" | feature-level happy path only |
| Sub-versioning | allowed when it sharpens the wow | **forbidden while any spine surface is a stub** |
| code-reviewer strictness | full | correctness + security + a11y; do not gold-plate locale parity or sub-version completeness |

Treating every supporting surface as production-critical is the over-engineering this project already paid for once (six-locale AR-RTL translations + Lighthouse 100 + adversarial legal review on a read-only profile screen that got four iterations while the hero stayed a stub). Spend rigor where the viewer looks.

## Orchestration triggers

The main thread invokes agents based on the kind of input it receives from the user:

| User input | First agent invoked | Then |
|---|---|---|
| "Add feature X" / "What about Y?" | `research-scout` | full pipeline |
| "Fix bug in Z" | `code-reviewer` reads the diff first; then dispatches to the responsible coder | re-review after fix |
| "Re-validate that X is still legally accurate" | `domain-expert` directly | update affected spec |
| "Make this faster / simpler" | `code-reviewer` first; then responsible coder | re-review |
| "Translate / fix translation" | `i18n-localizer` directly | done |
| "Audit a11y" | `a11y-tester` directly | report |
| "What did our research say about X?" | main thread reads docs/research, no agent needed | — |

The main thread should **invoke agents in parallel where dependencies allow** — e.g. `frontend-coder`, `mock-backend-coder`, and `assistant-engineer` can run concurrently against the same spec because their file footprints don't overlap.

## Per-agent invocation prompt template

When the main thread invokes an agent, it must include:

1. **Reference to the artefact(s) the agent should read first** — e.g. "Read `docs/specs/umzug.md` and the build log appended yesterday."
2. **The specific question or task** — e.g. "Verify that the autopilot's claim 'Krankenkasse is automatically notified upon Umzug' survives DSGVO + BMG scrutiny."
3. **The expected output location** — agents know their default but the main thread should confirm.
4. **Any constraints from the user that the agent context wouldn't otherwise know.**

Agents are stateless across invocations. Always re-prime them with the relevant docs.

## Daily/weekly cadence (when the project is active)

- **Per feature**: full pipeline, ~3–7 days elapsed depending on complexity.
- **Weekly review**: code-reviewer audits the recent spec set, flags drift, ensures `docs/architecture.md` reflects current truth.
- **Monthly research refresh**: research-scout re-checks load-bearing claims (numbers, ministers, programs) — German GovTech moves fast.

## Two definitions of "shipped"

- **feature-shipped**: code-reviewer APPROVE, a11y PASS, spec status `shipped`. The unit of work is done in isolation.
- **demo-shipped**: the whole spine (steps 1–6 in `demo-spine.md`) runs green end-to-end — a real click-through, not a sum of isolated features. This is the only "shipped" that matters for the Loom.

A pile of feature-shipped surfaces is not a demo. Before claiming the project demos, the orchestrator runs the spine e2e and watches it complete. Stop accumulating skipped e2e specs — a skipped spine test means the demo is not demo-shipped.

## Escalation to user

The user is consulted only when:

- `concept-verifier` and `domain-expert` disagree on a load-bearing fact.
- `concept-verifier` returns REJECT and proposes an alternative not previously discussed.
- A spec's required scope contradicts the project mission as stated in `CLAUDE.md`.
- An agent encounters a situation outside its competence (e.g. `frontend-coder` is asked to implement a paid third-party integration).
- `code-reviewer` flags a security or legal-risk issue that the spec did not anticipate.

Routine progress, build logs, and successful audits are recorded in their respective files but do not trigger user escalation.

## Anti-patterns the orchestrator must avoid

- **Skipping verification** because "the idea is obviously good" — concept-verifier exists exactly for that bias.
- **Asking the user to make agent-level decisions** ("Should this go to mock-backend-coder or frontend-coder?") — that's the orchestrator's job.
- **Combining agent invocations** ("Have research-scout also write the spec") — agents have their roles, do not blur them.
- **Re-doing an agent's work** in the main thread — if an agent's output is wrong, send it back, do not silently rewrite.
- **Forgetting to read the artefacts** — every agent invocation must point at concrete files; agents are not psychic.
- **Polishing a solved surface while the hero is a stub** — the most expensive anti-pattern this project has hit. Run Stage 0 against `demo-spine.md` before specing anything; if the spine is broken, fix the spine.
- **Full compliance ceremony on an unvalidated supporting surface** — six human-reviewed locales + AR-RTL audit + sub-versioning on a screen that might be cut. Apply the rigor tier the spec's `track:` declares.
- **Confusing feature-shipped with demo-shipped** — counting APPROVEd features as progress while the spine e2e is red or skipped.
