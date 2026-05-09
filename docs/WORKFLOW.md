# Autonomous Workflow

This document codifies how the agents in `.claude/agents/` are orchestrated. The **main Claude thread does not write code or run web research directly** — it routes work through the specialized agents below. This is the rule the project user explicitly asked for: every idea is researched, then independently verified by a different agent, then specced, then built, then reviewed, before it is considered shipped.

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

Nothing reaches the coder tier without **both** of the following holding:

1. `docs/research/<feature>.md` has `status: verified` (set by domain-expert).
2. `docs/reviews/<date>-<feature>-verify.md` has `verdict: PROCEED` (set by concept-verifier).

If `concept-verifier` says REVISE, return to `research-scout`/`domain-expert` to address the gaps, then re-verify. If REJECT, escalate the alternative recommendation to the user before proposing another idea.

If `domain-expert` and `concept-verifier` disagree on a load-bearing question, **escalate to user** with both positions written into the review file. Do not attempt a tie-break inside the agent system.

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
