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
- **No AI-design tells**: every UI-building agent applies the checklist in [`docs/research/ai-design-tells.md`](docs/research/ai-design-tells.md) (no icon-tile-above-heading cards, no uniform card grids, no boxed stat stacks; whitespace/hairlines before borders). Violations without a spec-stated reason are a REVISE ground in code review.

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

## Run it so the user can verify (every change)

Whenever you add or change something the user can see or interact with (a screen, component, flow, or visible fix), it is **not "done" until the user can check it themselves**. Before you hand back:

1. **Make it runnable.** Ensure the app is actually serving the change. The dev server runs on `http://localhost:3000` (`next dev`, HMR picks up edits live). If none is running, start one (`node_modules/.bin/next dev`, in the background). Do **not** run `next build`/`next start` over a live `next dev` — it rewrites the shared `.next` and corrupts the running server (this has cost real demo sessions).
2. **Give exact test instructions.** Tell the user precisely how to reach and exercise the change: the route (e.g. `/lebenslagen/geburt`), the persona/login if relevant (e.g. `anna-petrov`), the steps to reproduce the target state (e.g. "submit → it parks at the eID gate — that's the screen"), and what to look for. A path + concrete steps, never just "open the app".
3. **Don't claim a visual/behavioural PASS you didn't show.** A self-reported "looks good" is not enough (see verification discipline). Either screenshot it yourself, or point the user at the running route so they can see it live.

Formal gates (axe a11y, `next build`, spine e2e) need a clean prod build that pauses :3000 — coordinate that pause with the user rather than silently killing their dev server.

## Live preview / dev tunnel (always-on)

The dev server is exposed publicly for the user to watch progress live, run as **systemd** units (survive reboot, auto-restart on crash):

- `govtech-dev.service` — `next dev --turbo` on `localhost:3000` (HMR, **Turbopack** — since 2026-07-10; webpack-dev served ~21 MB JS/page and 8–20 s cold compiles per route → the "15 s per page" complaint. Turbo: ~11 MB, 2–3 s cold, <0.5 s warm). ExecStart runs the bin via `node node_modules/next/dist/bin/next dev --turbo` (the pnpm `.bin/next` shim has a broken shebang on this host). Gotcha: Turbopack's CSS parser (lightningcss) is strict — a `*/` sequence *inside* a comment (e.g. `vlf-*/vab-*`) hard-fails the route where webpack silently dropped the rule.
- `govtech-tunnel.service` — `cloudflared tunnel --url http://localhost:3000` (Requires/After the dev unit), giving a public `*.trycloudflare.com` URL with full HMR over WebSocket. `next.config.ts` carries `allowedDevOrigins: ['*.trycloudflare.com']` so Next 15 doesn't block the cross-origin HMR socket.

Operate it:

```bash
# current public URL (a *quick* tunnel — the host ROTATES on every tunnel restart)
journalctl -u govtech-tunnel.service | grep -oE "https://[a-z0-9-]+\.trycloudflare\.com" | tail -1
systemctl status  govtech-dev.service govtech-tunnel.service   # health
journalctl -u govtech-dev.service -f                           # live build log / errors
systemctl restart govtech-dev.service                          # after next.config.ts / .env.local / dep changes (NOT picked up by HMR)
systemctl restart govtech-tunnel.service                       # only if the tunnel dies — note the URL changes
```

`.tsx/.ts/.css/de.json` edits reload live via HMR — no restart. Setup gotcha: deps install with **`npx -y pnpm@10.15.0 install`** (the `pnpm-workspace.yaml` needs pnpm 10; corepack's pnpm 11 crashes on `node:sqlite` under Node 20). For a **stable** address instead of the rotating one, switch to a named Cloudflare tunnel (`cloudflared login`). Do **not** background the dev server with bare `&`/`nohup` — it gets killed in the sandbox; use the systemd unit.

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

## Coding discipline — Karpathy guidelines (mandatory)

The repo vendors the **`karpathy-guidelines`** skill at `.claude/skills/karpathy-guidelines/SKILL.md` (from [multica-ai/andrej-karpathy-skills](https://github.com/multica-ai/andrej-karpathy-skills), MIT). **Every agent that writes, reviews, or refactors code MUST apply it** — invoke the skill (or, for subagents without the Skill tool, read the SKILL.md) before non-trivial code work. Its four principles in one line each:

1. **Think Before Coding** — surface assumptions, name confusion, present tradeoffs; don't pick an interpretation silently.
2. **Simplicity First** — minimum code that solves the problem; no speculative abstractions, flexibility, or impossible-scenario error handling.
3. **Surgical Changes** — touch only what the task requires; clean up orphans your change created, leave pre-existing dead code alone.
4. **Goal-Driven Execution** — turn tasks into verifiable success criteria (test first, then make it pass) and loop until verified.

Tradeoff note from the skill itself: it biases caution over speed — for trivial one-liners, use judgment.

## Data model — quick reference

- `Persona` — user profile (Stammdaten, family, employment, residency status)
- `Behoerde` — authority (id, name DE, kategorie: bundesweit/land/kommune, zuständige Themen)
- `Vorgang` — process/case (status: angelegt/in_pruefung/genehmigt/abgelehnt, beteiligte Behörden, Fristen)
- `Letter` — Behörden-Brief (Absender, Aktenzeichen, betreff, body_de, ai_summary, required_action, frist, status)
- `Document` — vault entry (typ, ausstellende_behörde, ausgestellt_am, gültig_bis, qr_payload, eudi_compatible)
- `Termin` — appointment (Behörde, datum, ort_oder_video, vorgang_id)

Full schemas live in `src/types/`. Any agent extending the model must update both the type file and `docs/architecture.md`.

## Working the backlog (human trigger)

When the human tells you to **work the backlog / integrate features** (e.g. "работай по бэклогу",
"integrate the features", "build out the backlog"):

1. **Decompose into tasks — don't free-style.** Read `BACKLOG.md` (the Backlog Scout's findings). Take the
   *Accepted* items (or the *Candidate* items the human points at) and break each into concrete, ordered
   implementation tasks tracked with a task list (`TaskCreate`/`TaskUpdate`). One backlog item ≈ a small
   spec + implementation + gates + review.
2. **Verify before you build.** The Scout is reliable on topics/sources but **inflates specifics** (dates,
   names, versions, "the source says X"). Open each item's cited source and confirm the facts before
   implementing; drop or correct anything the source doesn't support (see `routine-backlog-scout.md`).
3. **Execute** through the project's quality flow: product-architect spec → coder
   (frontend / mock-backend / assistant) → i18n + a11y → code-reviewer → run the gates → review-gated PR.
   Honor the honesty guardrails and the Demo-Spine.
4. **Orchestration mode:**
   - **If multi-agent Workflow orchestration is enabled** (ultracode on, or the human asked for a workflow):
     run the decomposition + per-item pipeline **as a `Workflow`** (fan out, adversarially verify, synthesize).
   - **If Workflow is off / unavailable:** do the same work **outside** it — orchestrate the pipeline agents
     via the `Agent` tool (or, for trivial one-liners, the main thread).
5. **Branch:** when implementing an item the Scout raised, build on its working branch
   `claude/<date>-<slug>`; otherwise the relevant feature branch. The main thread orchestrates — it does not
   write feature code directly when the pipeline applies.

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
- All 10 `(app)` screens redesigned (Dashboard, Posteingang, Stammdaten, Vorgänge, Dokumente, Termine, Steuer, Familie, Datenschutz, Assistent). **Caveat (verified 2026-05-31):** the **Stammdaten** and **Familie** re-skins stripped every `data-testid` from the live `StammdatenView`/`FamilieView`; the hero/section/v2 anchors moved into `src/components/stammdaten/v2/*`/`StammdatenHero.tsx`. **Update (verified 2026-07-08, LG-Rollout):** the v2 cards are since the Green-Bento redesign **wired into the live `StammdatenView`** (imports L20–29) — the "orphaned/un-wired" state is history. Remaining debt: the 6 `stammdaten-*` + 4 `redesign-familie` a11y specs are still `test.fixme`-deferred and need re-evaluation against the now-live markup (testids may still be missing). Live pages remain axe-clean.
- Umzug autopilot end-to-end; assistant triggers it via confirm-gated `preview_umzug` → `starte_umzug` (offline-graceful). **Spine e2e green = demo-shipped** (`tests/e2e/spine.spec.ts`).
- Deep feature layers behind the redesign: Posteingang Brief-Erklärer + Antwort/Rechtsbehelf-Skelette; Stammdaten V1→V1.3 (SSoT layer, Renten/KV, Kontakt, Mobilität). Details + open followups in the changelog.
- **Convenience-Pass-1 (shipped 2026-05-30):** value-receipt, agent-voice cascade, Datenminimierung receipt, EUDI export (`[MOCK]`), Termin ops, autopilot-catalog teaser, calm empty states + to-do dismiss/snooze; real-time event subscriptions. Gates: a11y PASS (incl. a real-`inert` focus-trap fix — base-ui 1.5.0 leaks Tab via `aria-hidden`-not-`inert`, see changelog), spine e2e green, `next build` green, 6-locale i18n at parity.
- **wow-backlog #1 "Kontinuierlicher Kaskaden-Moment" (shipped 2026-05-30, branch `feat/wow-1-inline-cascade`):** the Umzug cascade now streams **inline in the assistant thread** (`src/components/autopilot/InlineCascade.tsx`) instead of behind a link on `/vorgaenge/umzug/run` — statutory recipients confirm automatically (§ 36 BMG / § 28 PAuswG), the two sensitive authorities (Familienkasse, Ausländerbehörde) gate behind a real "Mit eID bestätigen" tap (§ 18 PAuswG — user-driven, no Melderegister→ABH push), private recipients (Krankenkasse, Arbeitgeber) run on consent; then the value-receipt, Once-Only counter and Stammdaten source line render in-thread and confirmations land in Posteingang. Honest per-row Rechtsgrundlage micro-line. Gates: a11y PASS (`docs/a11y-reports/wow-1-inline-cascade-2026-05-30.md` + `inline-cascade-eid-2026-05-30.md`), 726/726 unit, spine e2e green (2/2), `next build` green, 6-locale i18n at parity. Ranked backlog + realism guardrails: `docs/research/wow-backlog.md`.
- **Onboarding/Login (DeutschlandID + EUDI) + Landing re-skin (shipped, branch `feat/wow-1-inline-cascade`):** `src/app/page.tsx` (static DE-inline landing) + `src/app/(auth)/onboarding/**`; a11y PASS (`docs/a11y-reports/onboarding-landing-2026-05-27.md`).
- **Pass-2 #2 "Antragsloses Kindergeld" — 2nd in-thread cascade (shipped 2026-07-01, branch `feat/kindergeld-cascade`):** the assistant's write path is generalised from Umzug-only to any Lebenslage via a confirm-gated `preview_lebenslage` → `starte_lebenslage` tool (per-vertical gating — only antragslos-classified slugs run the auto multi-Behörden chain; smoke-tested that `wohngeld`/`umzug` are rejected). „Kindergeld einrichten" → held `LebenslageConfirmCard` → **only on explicit click** `api.starteLebenslage('kindergeld')` streams the Standesamt→Meldebehörde/BZSt→Familienkasse chain **inline in the assistant thread** (reuses `InlineCascade`; `BLOCK_RANK` de-duplicated), Stufe-1 masked-IBAN eID confirmation (§ 18 PAuswG), Kindergeldbescheid `[MOCK]` lands in Posteingang. **Honest phasing: „Regierungsentwurf — Schlussabstimmung 09.07.2026 terminiert / gestuft ab 2027", never „beschlossen".** Persona: Familie Schmidt / Mia = 2nd child (Stufe-1 Geschwisterkind, IBAN known → pure confirmation; `withNewestChildFirst` invariant in `api.ts`). Gates: `next build` green, spine e2e 3/3 (`tests/e2e/spine-kindergeld.spec.ts`), a11y PASS (`docs/a11y-reports/kindergeld-cascade-2026-07-01.md`), tsc clean, 6-locale parity, code-review APPROVE. Spec: `docs/specs/kindergeld-cascade.md`.
- **wow-backlog pass-3 "Anspruch-Arc + flankierende Beats" (shipped 2026-07-02, branch `feat/wow-backlog-pass3`):** one wave, one emotional arc — *aus Holschuld wird Bringschuld*. **#3** `WohngeldFolgeCard` (inline im Assistenten-Thread + Run-Page, direkt unter der Umzug-Value-Receipt; antragsgebunden-ehrlich, „geschätzt ca."), **#4** `AnspruchLane` auf dem Dashboard (Split „eingerichtet" NUR antragsloses Kindergeld vs. „Anspruch erkannt — wir bereiten den Antrag vor" als Typ-Union erzwungen), **#5** `KinderzuschlagRadarCard` + AntragForm (`familienkasse-nord-hamburg`, Eingangsbestätigung statt Bescheid), **#12** Elterngeld-Frist-Rescue (§ 7 Abs. 1 S. 2 BEEG), **#15** `ZustaendigkeitCard` (Konjunktiv-HARD-RULE, § 25 VwVfG), **#8** `PresentCredentialDialog` (3 Felder, `inert`-Trap), **#10** `AufenthaltFristNudge` (enge Form), **F** Daten-Aktualität-Fold-in (Datenschutz), **G** Trauerfall nur als Katalog-Teaser; E war schon da (Bedienhilfen). a11y-Welle: 1 serious (WCAG 1.4.3, unlayered `a{color:inherit}` der FROZEN `prototype-v2.css`) zentral in `globals.css:1044` gefixt → Re-Audit 0 Violations. Gates: code-review APPROVE, a11y PASS (`docs/a11y-reports/wow-backlog-pass3-2026-07-02.md`), unit 804 (+4 pre-existing Snapshot-Fails), spine e2e 3/3, `next build` grün, 149 neue Keys × 5 Locales Parity. Spec: `docs/specs/anspruch-arc.md`. Followups: `docs/CHANGELOG.md`.
- **Liquid Glass — app-weiter Rollout (2026-07-08, branch `feat/liquid-glass-app-wide`; Posteingang-Referenz als Milestone `0fb1054` auf `feat/posteingang-liquid-glass`):** der Posteingang-Look (Ambient-Refraktion, frosted Shell, schwebende Glas-Karten, Waldgrün + irisierende Opt-in-CTA `.lg-iridescent`) auf **allen 22 App-Routen + Onboarding/Landing** — reiner Surfaces-Reskin (nie Textfarben), 1 Commit/Screen, Kill-Switch `NEXT_PUBLIC_LG=0`. Architektur: `liquid-glass-core.css` (Shell + Primitives, `html[data-lg]` via `LiquidGlassChrome` in `(app)/layout.tsx`) + Screen-Dateien unter `html[data-lg][data-lg-screen='<name>']` (`LiquidGlassScreen`-Mounts — schützt shared Klassen; das 100vh-Posteingang-Viewport-Modell strikt posteingang-gescoped); Onboarding/Landing seit 2026-07-09 (User-Entscheid) im **vollen Glas-Look** — Mechanik bleibt das eigene `data-lg-aux`-Gate (`LiquidGlassAux`, NICHT `data-lg` — App-Shell-Regeln dürfen nicht leaken): Aux-Sheet auf volle Flächenabdeckung ausgebaut (Frost-`.landing-header`, Glas-Karten, Core-starkes Ambient), Iris-CTA „Demo erleben" / „Anmeldung bestätigen" (`7c97ae3` + `1d2f829`, axe light+dark 0). Blur-Budget: Shell 2 Ebenen + max. 1 statischer Hero-Frost/Screen, Content-Karten + alles Animierte (Cascade, Demo-Pacer) blur-frei. Gates: tsc clean · **a11y-Welle PASS** (17 Routen × light+dark = 34 axe-Scans, 0 Rollout-Violations; Fokus-Ringe auf Glas, reduced-motion; Report lokal `docs/a11y-reports/liquid-glass-app-wide-2026-07-08.md`) · code-review „Code Approve-reif, 0 Blocker" (REVISE nur bis Gate-Evidenz; 4/6 Nits direkt angewendet `a4755ea`) · 6-Locale-Parität (0 neue Keys; on top: fix(i18n) `adc60cf` schließt 4 pre-existing MISSING_MESSAGE-Löcher) · **OFFEN: `next build` + Spine-e2e** (koordinierte :3000-Pause nötig). Details + neu aufgedeckte pre-existing Debt-Tickets: `docs/CHANGELOG.md`.
- **UX-Audit-Welle (shipped 2026-07-09, branch `feat/liquid-glass-app-wide`, `bec2575`+`02176e0`+`fbaa394`):** Heuristik-Audit (Krug/Nielsen, 24 Screens desktop/mobile/dark) → 4 parallele Opus-Fix-Zonen → i18n-Sync → code-review REVISE→APPROVE (1 Major gefixt). Seed-Daten dynamisch (`@now±Nd@HH:MM`-Sentinels; Termine in Geschäftszeiten statt 00:00; Assistent==Steuer-Einspruchsfrist aus EINER Quelle; Dashboard-`frist_count_14d` statt Top-3-Slice; `seed_content_version=2`-Reseed für Tunnel-Zuschauer), Behörden-Namen statt Slugs (`lib/behoerde-name.ts`), Vorgänge-Karten ohne Text-Overlap, Assistent-Offline-Recovery (Retry + Direkt-Link; Partial-Stream-Retry-Wedge gefixt) + Quick-Chip „Umzug einleiten" + Mobile-Fixes, Familie rendert 3/3 Haushaltsmitglieder, Onboarding-Schrittindikator, `devIndicators:false`. 10 neue Keys × 6 Locales. Gates: tsc clean · 843 unit · 24-Screen-Nachher-Sweep. Followups: `docs/CHANGELOG.md`.
- **Vorgang-Lifecycle-Rework „Akte statt Video" (shipped 2026-07-10, branch `feat/liquid-glass-app-wide`, uncommitted):** User-Verdikt gegen die Demo-Player-Semantik → ein Vorgang ist eine Akte: explizit erstellt (Wizard / click-gated antragslos-CTA „Automatische Bearbeitung starten"), Kaskade läuft genau EINMAL live (Fresh-Run-Reveal once-per-Vorgang via sessionStorage-Marker), abgeschlossen = statisches Dossier für immer. Entfernt: „Live-Demo abspielen"-Replay (`use-cascade-replay.ts` gelöscht), Beispiel-Umzug-Demo-Karte (bare `/vorgaenge/umzug/run` → Wizard-Redirect), antragslos-**Auto-Start-on-Load** in `/lebenslagen/<slug>/cascade` (mintete pro Reload einen Duplikat-Vorgang — Write-on-Click-Verstoß; bare `/cascade` → Leistungsseite). i18n: −11 Keys/+1 rename × 6 Locales. Gates: tsc · 843 unit · a11y umzug 15/15 · Lifecycle-Verify-Spec 5/5 (`tests/e2e/_lifecycle-verify.spec.ts`) · code-review APPROVE. Details: `docs/CHANGELOG.md`.
- **Stammdaten-Welle — De-Templating + eAT-Realismus + app-wide Fokusring-Fix (shipped 2026-07-10, branch `feat/liquid-glass-app-wide`, uncommitted):** letzter großer Screen ohne De-Templating → Icon-Tiles raus, 6-col-Bento → 3 unabhängige Flex-Spalten (keine toten Zonen/Clipping), Header 4→2 Buttons; i18n-Leaks gefixt (hartes `'Uhr'`, Roh-„Russisch", Familienstand-Casing); Seed-Realismus: Anna & Mehmet deutscher `personalausweis_nr` → RU/TR-Reisepass, Anna-Protokoll „Bundesdruckerei/PA" → eAT via LEA Berlin (§ 18 PAuswG nutzergesteuert), `SEED_CONTENT_VERSION`-Bump reseedet Tunnel-Zuschauer; **app-wide:** shared `<Button>`/`SelectTrigger` malten keinen `:focus-visible`-Ring (Tailwind-v4 `outline-none`-Falle, pre-existing HEAD-Debt) → `focus-visible:outline-solid` ×2, schließt LG-Followup „LanguageSwitcher-Fokusring". Gates: tsc · eslint · 843 unit · axe /stammdaten light+dark 0 · a11y PASS (`docs/a11y-reports/stammdaten-detemplating-2026-07-10.md`, FAIL→Fix→Re-Audit PASS) · 6-Locale-Parität · code-review APPROVE. Followups (u. a. /dokumente+/posteingang tragen dieselbe PA-Fehlerklasse noch): `docs/CHANGELOG.md`.
- **Barrierefreiheit v2 (shipped 2026-07-10, branch `feat/liquid-glass-app-wide`, uncommitted):** Ausbau der Bedienhilfen-v1 um deren deferred Items — **Leichte-Sprache-Erläuterung im Brief-Reader** (BGG § 11; `LeichteSpracheReveal` im live `PostDetail`, opt-in, pre-authored `leichte_sprache` auf 3 Seed-Briefen, „kein rechtsverbindlicher Text"-Disclaimer + `[MOCK]`, Original führend, bewusst OHNE KI-Consent-Zeile da kein Live-KI-Call), **DGS-Erklärvideo-Platzhalter** (BITV § 4 Anlage 2, keine Fake-Controls), **`/barrierefreiheit`** (Erklärung zur Barrierefreiheit `[MOCK]` + client-only „Barriere melden" + Schlichtungsstelle § 16 BGG; Footer-Link verdrahtet), **Vorlese-Tempo** (`readAloudRate` 0.8/1/1.25, wirkt auf Panel- + Selection-Vorlesen ohne Call-Site-Änderung). `SEED_CONTENT_VERSION` 4→5. Gates: verifier PROCEED · a11y PASS (0 axe light+dark inkl. mobile Sheet; Erst-FAIL fing den LS-Mount im verwaisten `LetterReader` — Remount in `PostDetail`) · code-review APPROVE · tsc · 843 unit · 55 Keys × 6 Locales. Spec: `docs/specs/barrierefreiheit-v2.md`. Followups + Kandidat „Termin-Kommunikationshilfen (§ 5 BGG/KHV)": `docs/CHANGELOG.md`.
- **Debt-Closure-Welle (shipped 2026-07-17, branch `feat/liquid-glass-app-wide`):** „закончи всё незаконченное" vor dem Public-Push — **alle LG-Rest-Gates GRÜN** (`next build` prod ×2 isolierte `NEXT_DIST_DIR`s · Spine 2/2 + Kindergeld 1/1 · Umzug-Resilienz 6/6 ORCH_TEST-Prod; der Gate-Lauf fing 2 echte Bugs: Wizard-Preview-Retry war No-op via `router.refresh()`, Run-Page-Initial-Fetch ohne Transient-Retry — beide gefixt) + **alle dokumentierten Followups geschlossen**: LG/Mobile (data-slot-Frost EudiExport/TerminAbsagen, BottomTabBar-Assertion, A11yMenu-useId; ⌘K-Pill + 320px-Overflow obsolet befunden), Pass-3 (`a{}`-Reset in `@layer base`, FristNudge persona-generisch + dismiss/snooze-Persistenz übers Wohngeld-Muster, #15 Katalog/Zuständigkeit persona-scoped — Mehmet→Köln, AntragForm-invalid-submit-a11y), Move A (Whitelist-Drift-Test, `status_resolved`-Key), Seed-Realismus (Anna RU-Pass, eAT-Zusatzblatt § 78a AufenthG statt PA-Aufkleber, `SEED_CONTENT_VERSION` 6), Spec-Debt (alle **7** stammdaten-fixme-Specs + 4 familie rewritten/gelöscht gegen Live-Green-Bento; 4 tote v1-e2e-Specs raus; Onboarding-„RED"-Ticket war stale — 19/19 grün), Design-System-Snapshots auf Waldgrün (Unit **868/868, 0 pre-existing-Fails mehr**), i18n (11 neue Keys × 6, 32 beweisbar tote Keys raus, „~176-Altlast" = beabsichtigte DE-Fallback-Architektur — kein Debt; Runtime-`IntlError`-Sweep CLEAN). Gates final: tsc · 868/868 · **a11y-Suite 184 passed/1 skipped gegen Prod-Build** · Spot-Axe invalid-submit+Nudge 0 · 6-Locale-Parität · code-review **APPROVE**. Details: `docs/CHANGELOG.md`.
- **Mobile-Comfort-Welle (shipped 2026-07-11, branch `feat/liquid-glass-app-wide`, uncommitted):** Antwort auf User-Befund „с телефона неудобно" — 4 parallele Zonen per Spec `docs/specs/mobile-comfort.md` (§4.4-File-Ownership, Breakpoint ≤767px, `--mobile-tabbar-h: 56px`-Vertrag): **A** Bottom-Tab-Bar (NEU `BottomTabBar.tsx` + `mobile-nav.css` — 5 Ziele aus `navItems`-SSOT, aria-current, Unread-Badge, LG-Frost + Solid-Kill-Switch-Fallback) + TopNav-Entrümpelung (Utilities → Burger-Sheet `.gt-sidebar-utils`); **B** Preambel-Kollaps auf termine/vorgaenge/lebenslagen/dokumente/datenschutz (erste Content-Karte 340–473px statt 493–708px); **C** Assistent-Composer fixed über der Bar (ungated, überlebt `NEXT_PUBLIC_LG=0`); **D** Tap-Targets ≥44px + 13px-Fließtext-Floor (globals.css, EIN appended ≤767-Block) + Blur-Budget (Content-Karten blur-frei ≤767) + Landing-Burger (NEU `LandingMobileNav.tsx`, DE-inline sanktioniert). Metriken @390: Small-Targets 203→32, Tiny-Text 299→199, Dashboard 5.4→4.7 Screens. Gates: a11y FAIL→3 Fixes→**PASS** (20 axe-Scans; Badge-Kontrast dark, fokussierbare Kennzahlen-Strips + 2 i18n-Keys, Composer-Fokusring vs. frozen CSS; `docs/a11y-reports/mobile-comfort-2026-07-11.md`) · code-review **APPROVE** (Minor direkt gefixt: Kalender-Opt-out erzwang 44px → Pillen-Überlappung im `<details>`-Kalender; `docs/reviews/mobile-comfort-2026-07-11.md`) · tsc · 843 unit · 6-Locale-Parität. Followups: `docs/CHANGELOG.md`.

- **Dashboard-Redesign „Ein Blick, eine Antwort" (shipped 2026-07-19, branch `feat/dashboard-redesign`):** De-Slop des Hauptscreens nach User-Verdikt („напоминает ai-slop") — Mockup-first (User-Freigabe; Sidebar per Auflage unangetastet), Spec `docs/specs/dashboard-redesign.md`. `DashboardView`-Rewrite: berechnete TL;DR-Subline, EINE boxless „Heute"-Liste (Top-Actions + Termin + Wohngeld/Aufenthalt als Disclosure-Rows mit vollen Karten-Inhalten/Rechtsgrundlagen), Umzug-Glas-Panel mit Segment-Balken statt 86%-Donut (der eine Frost; „Abgeschlossen"-Widerspruch weg), Rail = einzeilige Kennzahlen + „Autopilot verfügbar für"-Textzeilen + Kontrolle-Satz; Aktivitäten/ErledigtFeed/Trust-Box/Katalog-Teaser entfernt (Orphans `TriumphBanner`/`ErledigtFeed`/`AutopilotKatalogTeaser` gelöscht); Fetch-Wasserfall abgeflacht (getBehoerden-Roundtrip weg). Desktop ~3→1 Screen, Mobile ~4,7→~2. i18n +35/−68 Keys ×6. Gates: tsc · eslint · vitest 868/868 · Spine 3/3 (Assertions mitgezogen) · Prod-Build grün · a11y PASS (5 Scans) · code-review REVISE→APPROVE (Blocker: geerbtes `lg-iridescent` vom Panel-CTA entfernt; Build-Artefakt-Leck). Details/Followups: `docs/CHANGELOG.md`.

**In progress / next:**
- [x] ~~LG-Rollout Rest-Gates~~ — **geschlossen 2026-07-17 (Debt-Closure-Welle):** build + Spine 3/3 + Resilienz 6/6 grün, code-review APPROVE. Auch geschlossen: dl-Nesting + `#no-next-step-title` (schon 2026-07-10 Vorgang-Detail), LanguageSwitcher-Fokusring (2026-07-10), data-slot-AlertDialogs, ⌘K-Pill (obsolet — S9-GlobalSearch).
- [x] ~~Stammdaten/Familie a11y-Spec-Debt~~ — geschlossen 2026-07-17: alle 7 (nicht 6) Specs rewritten/bereinigt, grün gegen Live-Markup.
- [x] ~~Onboarding a11y~~ — Ticket war stale: voller Spec 19/19 grün (2026-07-17 verifiziert), kein Fix nötig.
- [x] ~~Pass-2 verticals: #3 Wohngeld~~ — shipped 2026-07-02 als Wohngeld-Folge-Beat (`WohngeldFolgeCard`, antragsgebunden-ehrlich) in wow-backlog pass-3.
- [ ] **User-Entscheidung offen: Idee D Heirats-/Namens-Kaskade** — Verifier-DEFERRED (Spine-Bet-Änderung = User-Eskalation; 8 Pflichtkorrekturen liegen bereit in `docs/reviews/2026-06-28-heirats-namens-kaskade-verify.md`). Bauen oder deferred lassen?
- [x] ~~Pass-3-Followups + Move-A-Followups + i18n-Altlast~~ — geschlossen 2026-07-17 (Debt-Closure-Welle); einzige bewusste Ausnahme: #8 optionaler Datenschutz-Log-Eintrag (braucht neue Append-API — Feature, kein Followup).
- [ ] **Neue Tickets aus der Debt-Closure-Welle (nicht blockierend):** (a) Umzug-Kaskade mintet Block-A „PA-Adressaufkleber § 19 PAuswV" für alle Personas — für Nicht-Deutsche (Anna/Mehmet) bräuchte es persona-bedingte Verzweigung (analog eAT-Zusatzblatt § 78a); (b) `documents.json` Freitext im `ausstellende_behoerde_id`-Feld (RU-Konsulat) — Schema-Nit; (c) restliche ~360 Orphan-Key-KANDIDATEN (Analyzer-Skript vorhanden, slug-dynamische Namespaces machen Auto-Prune unsafe).
- [ ] Loom video, README, deploy — README + Loom script in progress; Vercel deploy pending
