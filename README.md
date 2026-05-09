# GovTech DE — Concept Demo

> Speculative-design prototype: how a citizen-first interaction layer for German public administration could feel in 2027, built on top of DeutschlandID + EUDI Wallet + Deutschland-Stack.
>
> **All data is mocked. No real Behörden are integrated.**

This repository is structured for autonomous development by specialized Claude Code subagents. See `CLAUDE.md` for project context, `docs/WORKFLOW.md` for the agent pipeline, and `.claude/agents/` for the agent definitions.

## Quick start (developer)

```bash
pnpm install
cp .env.example .env.local   # add ANTHROPIC_API_KEY
pnpm dev
```

Open http://localhost:3000.

## Quick start (Claude Code orchestrator)

When you (the human) ask Claude to add or change something, the main thread routes the work through the agent pipeline:

```
research-scout → domain-expert → concept-verifier → product-architect
                                                          │
                            ┌─────────────────────────────┤
                            ▼                             ▼
                   frontend-coder        mock-backend-coder        assistant-engineer
                            │                             │                    │
                            └──────────────┬──────────────┴────────────────────┘
                                           ▼
                              i18n-localizer + a11y-tester
                                           │
                                           ▼
                                     code-reviewer
```

Each agent runs on Claude Opus 4.7 and has scoped tools + a detailed role definition in `.claude/agents/<name>.md`.

## Project layout

See `CLAUDE.md` for the full folder map.

## Documentation

- `CLAUDE.md` — project mission, stack, conventions (loaded into every agent's context)
- `docs/PRD.md` — living product requirements
- `docs/architecture.md` — runtime data flow, mock-backend contract, AI assistant execution model
- `docs/personas.md` — Anna, Familie Schmidt, Mehmet Yıldız
- `docs/WORKFLOW.md` — autonomous agent pipeline + escalation rules
- `docs/research/` — research-scout outputs (one MD per topic)
- `docs/domain/` — domain-expert outputs (Behörden process notes)
- `docs/specs/` — product-architect outputs (one MD per feature)
- `docs/reviews/` — concept-verifier + code-reviewer verdicts
- `docs/a11y-reports/` — a11y-tester outputs

## License

MIT (to be added once first build lands).
