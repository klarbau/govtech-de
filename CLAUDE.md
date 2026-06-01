# GovTech DE — Concept Demo

Speculative-design prototype: how a citizen-first interaction layer for German public administration could look in 2027, on top of DeutschlandID + EUDI Wallet + Deutschland-Stack. **Not a real integration. All data is mocked.**

The artefact is a portfolio-grade demo intended to:
1. Demonstrate UX/automation potential to GovTech stakeholders (DigitalService, BMDS, Tech4Germany, GovTech Deutschland, GovStart)
2. Communicate the idea via live demo, GitHub repo, and Loom video
3. Open doors to roles or programs in the German GovTech ecosystem

## Mission constraints

- **Visual + linguistic register**: serious, citizen-respectful, gov.uk / DigitalService DE-style minimalism. Never cloning Russian Gosuslugi aesthetics.
- **Primary language**: Deutsch (Sie-Form). Secondary: EN, RU, UK, AR, TR.
- **Accessibility**: WCAG 2.1 AA + BITV 2.0 mandatory.
- **Privacy-by-design**: every screen with personal data shows what is processed, by whom, on what legal basis. Datenminimierung visible.
- **Realism**: mock data uses real Behörden-Bezeichnungen, real PLZ, real Aktenzeichen-Formate. Marked `[MOCK]` where helpful.
- **Autopilot is the hero**: the demo's central wow-moment is what the system does *for* the user, not faster forms.

## Tech stack

| Layer | Choice |
|---|---|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript (strict) |
| UI | Tailwind v4 + shadcn/ui + lucide-react |
| Animation | framer-motion (sparingly) |
| State | React Server Components + useState/useReducer; Zustand only if cross-page state required |
| Mock backend | TypeScript module simulating REST, persisting to `localStorage` |
| AI assistant | `@anthropic-ai/sdk` + Claude Haiku 4.5 (`claude-haiku-4-5-20251001`), prompt caching enabled, tool use for autopilot actions |
| i18n | `next-intl` |
| Testing | Playwright (e2e + a11y via `@axe-core/playwright`) |
| Deployment | Vercel |

## Code intelligence — token discipline (READ FIRST)

This repo is indexed by a **CodeGraph MCP server** (`mcp__codegraph__*`) — a live SQLite knowledge graph of every symbol, edge, and file, auto-synced by a file watcher (~1s lag). It is the cheapest way to understand the code. **Querying the graph costs a fraction of the tokens that a Read/Grep/Glob sweep does.** The main thread and every code-touching agent (frontend-coder, mock-backend-coder, assistant-engineer, code-reviewer, product-architect) must use it.

**The rule: query the graph BEFORE you Read/Grep/Glob source.** Do not open files to "see what's there" — ask the graph, then open only the few files it points you to.

- "What's the deal with feature/area/bug X?" → `codegraph_context` (PRIMARY — one call returns entry points + related symbols + key code; usually answers without any Read)
- "Where is symbol X?" → `codegraph_search`
- "How does X reach Y / trace the flow?" → `codegraph_trace` (follows dynamic-dispatch hops grep can't)
- "Show me this symbol's body" → `codegraph_node`
- "Survey several related symbols" → `codegraph_explore` (one capped call, not many Reads)

A direct codegraph answer is a handful of calls; the equivalent grep+read exploration is dozens. Reach for raw Read/Grep only to confirm a specific detail the graph didn't surface, or for non-code files (specs, locales, JSON fixtures — the graph indexes code, not Markdown/JSON). **Do not delegate code-location exploration to a fresh sub-agent or an Explore fan-out** — that re-does work the graph already did and pays full freight for it. If the graph seems stale or returns nothing for a symbol you know exists, fall back to Read/Grep and note it; do not loop.

**Specs are large (100–160 KB each) — do NOT read them whole.** They are section-numbered. Read only the sections your role needs: skim the spec's heading list first (Grep `^#` or read the top), then Read the targeted §-ranges (e.g. assistant-engineer → §7 tool contract; a11y-tester → §11 checklist; mock-backend-coder → data-schema + autopilot §§; frontend-coder → screen-flow + component-inventory §§). Reading a 160 KB spec end-to-end when you need two sections is the single biggest avoidable token cost in this repo. Same for control docs: pull the section you need, not the whole file.

## Folder structure

```
govtech/
├── CLAUDE.md                     # This file. Project context for all agents.
├── README.md                     # Public-facing: pitch + screenshots + run instructions (DE/EN)
├── package.json
├── next.config.js
├── tsconfig.json
├── tailwind.config.ts
├── .env.example                  # ANTHROPIC_API_KEY placeholder only
│
├── .claude/
│   ├── settings.json             # Permissions, model defaults
│   └── agents/                   # Specialized subagents (see WORKFLOW)
│       ├── research-scout.md
│       ├── domain-expert.md
│       ├── concept-verifier.md
│       ├── product-architect.md
│       ├── frontend-coder.md
│       ├── mock-backend-coder.md
│       ├── assistant-engineer.md
│       ├── i18n-localizer.md
│       ├── a11y-tester.md
│       └── code-reviewer.md
│
├── docs/
│   ├── PRD.md                    # Living product requirements doc
│   ├── architecture.md           # Tech architecture, data flow, mock-backend contract
│   ├── personas.md               # Anna, Familie Schmidt, Selbstständige(r) Mehmet
│   ├── WORKFLOW.md               # Autonomous research→verify→build pipeline
│   ├── research/                 # Output of research-scout (one MD per topic)
│   ├── specs/                    # Output of product-architect (one MD per feature)
│   ├── domain/                   # Output of domain-expert (Behörden processes, legal notes)
│   ├── reviews/                  # Output of code-reviewer (one MD per review pass)
│   └── a11y-reports/             # Output of a11y-tester (one MD per audit)
│
├── src/
│   ├── app/                      # Next.js App Router
│   │   ├── (auth)/onboarding/    # Fake DeutschlandID + EUDI Wallet login
│   │   ├── (app)/
│   │   │   ├── dashboard/        # Übersicht: open Vorgänge, Fristen, "heute zu tun"
│   │   │   ├── posteingang/      # Unified inbox of Behörden-Briefe with AI summaries
│   │   │   ├── stammdaten/       # Single source-of-truth profile
│   │   │   ├── vorgaenge/        # Wizards: Umzug, Heirat, Geburt, Aufenthalt-Verlängerung
│   │   │   ├── dokumente/        # QR-verifiable document vault, EUDI export
│   │   │   ├── termine/          # All Behörden-Termine, calendar integration
│   │   │   ├── steuer/           # Pre-filled Steuererklärung from known data
│   │   │   ├── familie/          # Joint dependents, shared Vorgänge
│   │   │   ├── assistent/        # Conversational AI with tool use
│   │   │   └── datenschutz/      # Granular consent: who sees what
│   │   ├── api/
│   │   │   └── assistant/route.ts  # SSE endpoint for AI assistant
│   │   ├── layout.tsx
│   │   └── page.tsx              # Landing / login switch
│   │
│   ├── components/
│   │   ├── ui/                   # shadcn/ui primitives (Button, Card, Dialog, …)
│   │   ├── layout/               # Sidebar, Topbar, Footer, LanguageSwitcher
│   │   ├── autopilot/            # AutopilotTimeline, AutopilotConfirmDialog, …
│   │   ├── assistant/            # ChatPanel, MessageBubble, ToolCallCard
│   │   ├── posteingang/          # LetterCard, LetterReader, AISummaryCard
│   │   ├── vorgaenge/            # VorgangWizard, ProgressTracker, …
│   │   └── shared/               # BehoerdenBadge, FristCountdown, ConsentBanner
│   │
│   ├── lib/
│   │   ├── mock-backend/
│   │   │   ├── api.ts            # Function-style API mimicking REST (getLetters, postUmzug, …)
│   │   │   ├── persistence.ts    # localStorage wrapper with versioning
│   │   │   ├── seed.ts           # Initial state for each persona
│   │   │   ├── latency.ts        # Simulated 300–800ms delays + 5% error rate
│   │   │   └── autopilot/        # Autopilot orchestration (umzug, geburt, aufenthalt, …)
│   │   ├── ai/
│   │   │   ├── client.ts         # Anthropic SDK client
│   │   │   ├── system-prompt.ts  # Cached system prompt
│   │   │   ├── tools.ts          # Tool/function definitions matching mock-backend ops
│   │   │   └── stream.ts         # SSE streaming helpers
│   │   ├── i18n/
│   │   │   ├── config.ts
│   │   │   └── locales/          # de.json (source), en.json, ru.json, uk.json, ar.json, tr.json
│   │   └── utils/                # cn(), formatDate(), formatPLZ(), …
│   │
│   ├── data/                     # Static fixtures consumed by mock-backend/seed.ts
│   │   ├── personas.json
│   │   ├── behoerden.json        # Real Behörden names + addresses + zuständigkeit
│   │   ├── letters.json          # Mock Behörden-Briefe with realistic Aktenzeichen
│   │   ├── vorgaenge.json
│   │   └── documents.json
│   │
│   └── types/                    # Shared TypeScript types
│       ├── behoerde.ts
│       ├── vorgang.ts
│       ├── letter.ts
│       ├── document.ts
│       └── persona.ts
│
├── tests/
│   ├── e2e/                      # Playwright user-flow tests
│   └── a11y/                     # axe-core a11y tests
│
└── public/
    ├── behoerden-logos/          # Mock or generic Behörden-Logos
    └── og.png                    # Social preview
```

## Naming & coding conventions

- Files: `kebab-case.tsx`. Components: `PascalCase`. Functions/vars: `camelCase`. Types: `PascalCase`.
- Imports: `@/` alias → `./src/`.
- Strings: **never hardcoded**. Always via `t('key.path')` from `next-intl`. Source-of-truth = `de.json`.
- Components: Server Components by default. Add `'use client'` only when interactive state/effects required.
- Mock-backend access: components MUST go through `lib/mock-backend/api.ts`. Never touch `localStorage` directly from components.
- Personally identifiable data in mocks: must look real but be obviously synthetic. Use `[MOCK]` watermark on document previews.

## Data model — quick reference

- `Persona` — user profile (Stammdaten, family, employment, residency status)
- `Behoerde` — authority (id, name DE, kategorie: bundesweit/land/kommune, zuständige Themen)
- `Vorgang` — process/case (status: angelegt/in_pruefung/genehmigt/abgelehnt, beteiligte Behörden, Fristen)
- `Letter` — Behörden-Brief (Absender, Aktenzeichen, betreff, body_de, ai_summary, required_action, frist, status)
- `Document` — vault entry (typ, ausstellende_behörde, ausgestellt_am, gültig_bis, qr_payload, eudi_compatible)
- `Termin` — appointment (Behörde, datum, ort_oder_video, vorgang_id)

Full schemas live in `src/types/`. Any agent extending the model must update both the type file and `docs/architecture.md`.

## Autonomous workflow (READ docs/WORKFLOW.md)

Every new feature passes through this pipeline. The main thread does NOT write code directly — it orchestrates agents.

**Stage 0 first**: before any feature enters the pipeline, the orchestrator runs the Demo-Spine gate against [`docs/demo-spine.md`](docs/demo-spine.md) — the single source of truth for the headline wow and the Loom path. A feature only enters the pipeline if it advances the spine (or the spine is already complete). Specs carry a `track: spine | supporting` field that sets the rigor tier; supporting surfaces get DE-source i18n + a11y PASS, not full six-locale ceremony. See WORKFLOW.md → "Stage 0", "Rigor tiers", "Two definitions of shipped".

```
                      ┌──────────────────┐
  user idea / gap ──▶ │  research-scout  │  (web research, prior art, references)
                      └────────┬─────────┘
                               ▼
                      ┌──────────────────┐
                      │  domain-expert   │  (legal/process realism check)
                      └────────┬─────────┘
                               ▼
                      ┌──────────────────┐
                      │ concept-verifier │  (adversarial second opinion — DIFFERENT agent)
                      └────────┬─────────┘
                               │  PROCEED / REVISE / REJECT
                               ▼
                      ┌──────────────────┐
                      │ product-architect│  (PRD/spec, screen flow, mock data shape)
                      └────────┬─────────┘
                               ▼
              ┌────────────────┼────────────────┐
              ▼                ▼                ▼
     ┌──────────────┐ ┌──────────────┐ ┌──────────────────┐
     │ frontend-    │ │ mock-backend-│ │ assistant-       │
     │ coder        │ │ coder        │ │ engineer         │
     └──────┬───────┘ └──────┬───────┘ └──────┬───────────┘
            └────────┬───────┴────────┬───────┘
                     ▼                ▼
            ┌──────────────┐  ┌──────────────┐
            │ i18n-        │  │ a11y-tester  │
            │ localizer    │  │              │
            └──────┬───────┘  └──────┬───────┘
                   └─────────┬───────┘
                             ▼
                    ┌──────────────────┐
                    │  code-reviewer   │  (final gate before merge)
                    └──────────────────┘
```

Two-agent consensus rule: an idea proceeds to coding only if **both research-scout and concept-verifier sign off** (or domain-expert overrides on a legal-realism basis). Disagreement is escalated to the user.

## Status

Full ship history with followup lists → [`docs/CHANGELOG.md`](docs/CHANGELOG.md). This section is the *current-state snapshot only*.

**Shipped & on the redesign baseline** (branch `redesign-prototype-sweep`, design system: cobalt `#2563EB` + Inter + ~14 shared primitives in `src/components/shared/**`, all on the mock-backend, WCAG 2.1 AA, 6-locale i18n, green `next build`):
- All 10 `(app)` screens redesigned (Dashboard, Posteingang, Stammdaten, Vorgänge, Dokumente, Termine, Steuer, Familie, Datenschutz, Assistent). **Caveat (verified 2026-05-31):** the **Stammdaten** and **Familie** re-skins stripped every `data-testid` from the live `StammdatenView`/`FamilieView`; the hero/section/v2 anchors now live in **orphaned, un-wired** components (`src/components/stammdaten/v2/*`, `StammdatenHero.tsx`, the familie monogram/aside features). The live pages are **verified axe-clean (0 WCAG 2.1 AA violations)**, but their structural a11y specs (6 `stammdaten-*` files + 4 `redesign-familie` tests) are `test.fixme`-deferred until the components are wired back. This is un-integrated redesign work, **not** an accessibility regression. See `docs/CHANGELOG.md` → "Deferred".
- Umzug autopilot end-to-end; assistant triggers it via confirm-gated `preview_umzug` → `starte_umzug` (offline-graceful). **Spine e2e green = demo-shipped** (`tests/e2e/spine.spec.ts`).
- Deep feature layers behind the redesign: Posteingang Brief-Erklärer + Antwort/Rechtsbehelf-Skelette; Stammdaten V1→V1.3 (SSoT layer, Renten/KV, Kontakt, Mobilität). Details + open followups in the changelog.
- **Convenience-Pass-1 (shipped 2026-05-30):** value-receipt, agent-voice cascade, Datenminimierung receipt, EUDI export (`[MOCK]`), Termin ops, autopilot-catalog teaser, calm empty states + to-do dismiss/snooze; real-time event subscriptions. Gates: a11y PASS (incl. a real-`inert` focus-trap fix — base-ui 1.5.0 leaks Tab via `aria-hidden`-not-`inert`, see changelog), spine e2e green, `next build` green, 6-locale i18n at parity.
- **wow-backlog #1 "Kontinuierlicher Kaskaden-Moment" (shipped 2026-05-30, branch `feat/wow-1-inline-cascade`):** the Umzug cascade now streams **inline in the assistant thread** (`src/components/autopilot/InlineCascade.tsx`) instead of behind a link on `/vorgaenge/umzug/run` — statutory recipients confirm automatically (§ 36 BMG / § 28 PAuswG), the two sensitive authorities (Familienkasse, Ausländerbehörde) gate behind a real "Mit eID bestätigen" tap (§ 18 PAuswG — user-driven, no Melderegister→ABH push), private recipients (Krankenkasse, Arbeitgeber) run on consent; then the value-receipt, Once-Only counter and Stammdaten source line render in-thread and confirmations land in Posteingang. Honest per-row Rechtsgrundlage micro-line. Gates: a11y PASS (`docs/a11y-reports/wow-1-inline-cascade-2026-05-30.md` + `inline-cascade-eid-2026-05-30.md`), 726/726 unit, spine e2e green (2/2), `next build` green, 6-locale i18n at parity. Ranked backlog + realism guardrails: `docs/research/wow-backlog.md`.
- **Onboarding/Login (DeutschlandID + EUDI) + Landing re-skin (shipped, branch `feat/wow-1-inline-cascade`):** `src/app/page.tsx` (static DE-inline landing) + `src/app/(auth)/onboarding/**`; a11y PASS (`docs/a11y-reports/onboarding-landing-2026-05-27.md`).

**In progress / next:**
- [ ] **Deferred — Stammdaten + Familie redesign integration** (decided 2026-05-31): wire the orphaned `src/components/stammdaten/v2/*` + `StammdatenHero.tsx` (and the familie monogram-avatar / "Was betrifft wen" aside / Vertretung `role=note` features) back into the live views, then un-`fixme` the 6 `stammdaten-*` + 4 `redesign-familie` a11y specs. Live pages are axe-clean today; this is visual-consistency + spec-coverage debt, not an a11y blocker.
- [ ] **Onboarding a11y** — 4 tests in `onboarding-landing.spec.ts` (`axe onboarding A de light/dark`, `onboarding full keyboard flow`, `axe onboarding D dark`) are RED as of 2026-05-31; the **landing** half of that file is green. Belongs to the onboarding workstream — needs a separate look (the "a11y PASS" claim on the Onboarding line above is stale).
- [ ] Pass-2 verticals: #2 antragsloses Kindergeld (legislated, 2027), #3 Wohngeld — now that the hero is continuous.
- [ ] Loom video, README, deploy — README + Loom script in progress; Vercel deploy pending
