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

- [x] Project context + agent roster defined
- [x] Personas, PRD baseline
- [x] Project scaffold (Next.js 15 + Tailwind v4 + shadcn/ui + Playwright + Vitest)
- [x] First Vorgang implemented end-to-end (Umzug autopilot — shipped 2026-05-08)
- [x] Strategy pivot 2026-05-08: build horizontal capabilities (Posteingang, Stammdaten, Dokumente, Termine, Datenschutz-Cockpit, Assistent-UI) before more verticals
- [x] Posteingang Brief-Erklärer (shipped 2026-05-09: a11y PASS axe 0/0, code review APPROVE, vitest 92/92, Lighthouse a11y 95/100)
- [x] Posteingang V1.5 — Antwort verfassen (4 templates + freitext) + UX-Restructure (filter popover, sticky CTA, sr-only h2, controlled `<Select>` for nachweis_bezeichnung) — shipped 2026-05-09: a11y PASS Lighthouse 100/100 axe 0/0 after Issue A token fix, code review APPROVE, vitest 126/126. Followup: hard-remove `Reply.receipt_text` (currently optional+@deprecated)
- [x] Posteingang V1.5.1 — Rechtsbehelf-Skelette (Einspruch AO + Widerspruch SGG/VwGO + Aussetzung der Vollziehung § 361 AO) — shipped 2026-05-09: a11y PASS Lighthouse 100/100 axe 0/0/0/0 across 3 modal variants, code review APPROVE after 3 REVISE iterations, vitest 254/254. Cross-Template-Versand-Pfad ("Beide als getrennte Briefe versenden") + ReplyConfirmationView multi-reply stack + StickyFristAction dual-template hint live. `--muted-foreground` token darkened (light 5.63:1, dark 5.53:1). Followups for V1.5.2: hard-remove `Reply.receipt_text`; e2e extension assert post-versand multi-reply + dual-template sticky; extract duplicated `wrapNormZitate` helper; remove dead `crossSendStage === 'done'` transition.
- [x] Stammdaten V1 — Single-Source-of-Truth Lese-/Wegweiser-Schicht (Hero + 6 Sektionen + 4 Modale + Wallet-Sub-Tab + Aktivitätsprotokoll + 3 Personas × 17 seed log entries) — shipped 2026-05-10: a11y component-level PASS Lighthouse 100/100 × 3 routes axe 0/0/0/0, code review APPROVE after 1 REVISE iteration (i18n parity 66 keys × 5 locales + 5 `as unknown as` casts removed + 4 Behörde-IDs + spec § 11.4 sessionStorage clarification + e2e helper session-key fix), vitest 298/298, JSON.parse 6/6 OK, ARF v2.0 disclaimer-meta, NormZitatSpan auf 34 §-Zitaten, Block-A/B/D Umzug-autopilot Stammdaten-log-emission. V1.0.1 Followups: stale doc-comment `api.ts:59`, declarative `STAMMDATEN_FIELD_DEFS[]`-Refactor, persona-address-vs-seedlog Anna/Friedrichshain-Kreuzberg sync, Schmidt 1→2 children, Mehmet eAT-CAN/Anna PA mock-string-collision, sektion-`<aside>`-aria-label-uniqueness, declarative wizard-slug `'sbgg-3-stufen'→'sbgg'`, AZR-Selbstauskunft `zweck`-key-semantic, ABH-Block-D `zweck`-mapping, `countRegisters` heuristic, persona-id `markus-schmidt` cleanup carry to test files, 14 pre-existing e2e/a11y test failures (Religion-Consent + Widerspruch + Familienkasse + pre-insertion-modal radio-timeout — task #60).
- [x] Stammdaten V1.1 — Renten/KV (Altersvorsorge + Krankenversicherung & Pflege als 2 neue Sektionen + Pflegegrad-Modal mit Art-9-Pattern + Yellow-Letter-Bridge Posteingang→Stammdaten + 11/11 Art-9-Linie DECIDED + RechtsprechungZitatSpan für EuGH C-184/20 + Mehmet-Track-C Empty-State als ehrlicher speculative-Wow) — shipped 2026-05-10: a11y component-level PASS Lighthouse 100/100 axe 0/0/0/0, code review APPROVE after 3 REVISE iterations (P0-1 i18n namespace flatten v1_1.* → root + 16 new keys for hardcoded strings, P0-2 LetterReader path refactor + 4 missing posteingang.bridge keys, a11y functional pflegegrad reveal-button dead-end fix via pflegegrad_exists field, 5 expandable_5 body templates × 6 locales for YellowLetterEchoCard prose). vitest 357/357 (V1 305 → V1.1 +49 + 3 reveal-button tests), JSON.parse 6/6 OK, persistence-migration V1→V1.1 idempotent, 11 new Behörden (DRV Bund/BB/Nord/Rheinland/Bayern Süd + gematik + 3 Krankenkassen + 3 Pflegekassen + ZfDR), Yellow-Letter mock with 5 § 109 Abs. 3 Pflicht-Inhalte verbatim. 10 verifier-locked Hard-Lines § 11.21–§ 11.30. V1.0.1 followups: consentPflegegrad signature drift (spec § 5.1 boolean-merge), getEpaStatus write-on-read fragile coupling, Anna letter-body Anschrift Potsdam vs Frankfurt(Oder) inconsistency, YellowLetterEchoCard Stamp uses quelle_letter_id instead of human Aktenzeichen, e2e specs `test.skip` (4 specs awaiting unskip), `as unknown as ZodType` extract helper, animate-spin without motion-reduce: guard, try/catch defensive-fallback cleanup in 4 V1.1 components.
- [x] Stammdaten V1.2 — Kontakt-Schicht (BundID-Postfach + verifizierte E-Mail + Mobilfunk-Self-Edit + Postanschrift-Cross-Ref + Notification-Präferenzen 2027-Vision + Föderalismus-Card-Disclaimer + § 9 OZG primary norm + 4-Kategorie Aktivitätsprotokoll-Richtungsfilter + Familienkasse-Wechsel-Cascade als Wow-Mechanik mit prefers-reduced-motion-fallback) — shipped 2026-05-10: a11y PASS Lighthouse 100/100 axe 0/0/0/0 across 3 personas + 2 modals (SaveConfirmDialog + MobilOtpMockModal mit useStripBaseUiFocusGuardAriaHidden), code review APPROVE after 3 REVISE iterations (P0 RichtungSwitch dead-code-wired into StammdatenView per § 11.40, P1 aria-live re-announce reliability via monotonic key, Mehmet persona-seed drift fix tuerkisch+selbstaendig+§ 21 AufenthG so § 11.41 Wow triggers, plus i18n REVISE 6 sub-trees × 5 non-DE = 70 missing strings). vitest 442/442 (V1.1 357 → V1.2 +85 incl. ABH-Hard-Lock § 11.35 + savings-lookup 5×4 matrix + OTP-mock 124857 + richtung-filter cascade-bridge + persona-migration idempotent), JSON.parse 6/6 OK, 11 Hard-Lines § 11.31–§ 11.41, savings-lookup `familie × postfach = {8 Briefe/Jahr, 4 Tage}` Hero-Wert verbatim, 35 Behörden mit `bundid_postfach_anbindung` (Familienkasse-BB angebunden + ABH-Köln nicht_angebunden + Bürgeramt-Friedrichshain in_pilotierung). Persona-Schema full rename `kontakt` V1→V1.2 idempotent migration. NormZitatSpan-Lookup +14 V1.2-Norms incl. § 9 OZG primary, VwVfG-Regex-Branch erweitert. V1.2.1 Followups: 4 a11y/e2e Playwright specs (`stammdaten-v1-1-kontakt-cards|notification-praeferenzen|save-confirm-modal|cascade-reduced-motion.spec.ts`) als test.skip-scaffolds nicht abgeliefert; spec § 3 sektionen-count says 10 vs runtime h2-count 11 (Beschäftigung extra); migration name `migrateKontaktV1ToV11` actually migrates V1→V1.2 (rename to V1ToV12 cleanup); 2× `as unknown as` casts in persistence-migrations.ts:379/389 V1.0.1 cleanup; spec § 3.3 vs § 4.5 Mehmet-mobil internal inconsistency (impl follows § 4.5).
- [x] Stammdaten V1.3 — Mobilität-Sektion (Führerschein + KFZ-Halter + mDL-Wallet-Card + 2 wows: Pflichtumtausch-Frist-Banner für Schmidt-Vater FE 2002 / Stichtag 19.01.2027 + Punktestand on-demand-CTA mit eID-Reauth + 5min-TTL + VL-14 Block-D autopilot wording-co-correction "§ 32 FZV / automatische Synchronisierung" → "§ 15 FZV / Pre-Fill der i-Kfz-Adressänderung / unverzüglich") — shipped 2026-05-13: verifier PROCEED-with-14-Verifier-Locks, a11y PASS-with-followups after 1 REVISE iteration (Playwright axe 14/14 PASS up from 12/14: 2 UmzugBridgeBadge contrast blockers `text-amber-900/90` → `text-amber-950` + fade-in-animation entfernt da axe-Mid-Animation-Sampling + PunkteEidReauthModal focus-restoration via `triggerRef`+`requestAnimationFrame`+`document.contains`-guard), code review APPROVE first-pass, vitest 575/578 (V1.2 442 → V1.3 +136 incl. 10 dedicated VL-Tests: norm-zitate-extension positive+negative, persistence-migration V12→V13 idempotent, behoerden-kategorie kommune/bund, schema-no-punkte, ban-list-grep 6-Locale + Whitelist `kfz_halter_adresse_speculative`, faer-on-demand-TTL ≤300s, iso-mdl-toggle-enum 14 ISO/IEC 18013-5 Annex-B-Attribute closed, pflichtumtausch-stichtag-lookup, fe-nr-format-validator, block-d-wording), Playwright a11y 14/14, JSON.parse 6/6 OK, i18n parity ~111 V1.3-Keys × 5 Non-DE locales, 14 Hard-Lines HL-MOB-1..HL-MOB-14 (incl. VL-erweitert HL-MOB-10..HL-MOB-14: no-FE-Nr-write, no-punkte-schema, disclaimer-naming-convention, Halter-Adresse-ban-list, automatische-Synchronisierung-Phrase-Ban). 7 neue Behörden (KBA Flensburg `bund` + LBV Hamburg + KVR München + FE Köln + KFZ Brandenburg-Havel + 2 weitere `kommune` per VL-5). 3 neue Mock-Briefe (Pflichtumtausch, § 15 FZV-Aufforderung, FAER-Selbstauskunft-PDF). NormZitatSpan-Lookup erweitert: §§ 4, 28, 29, 30, 30 Abs. 8, 30a, 48, 65 StVG; §§ 47, 73 FeV; §§ 15, 57, 60 FZV (2023); § 4 IDNrG; RL (EU) 2025/2205. Architect-resolved OQs: Anna `russisch + § 18g AufenthG` (NOT EU-Bürgerin gegen Verifier-Behauptung), Markus Halter/Sonja Mitnutzerin/Lena FE-Empty-State, Mehmet 1 P. demo, WalletMdl ships V1.3, mDL lives in existing Wallet-Sub-Tab + Mobilität-CrossRef-Link. Bundesland-Letter-Korrektur F-Berlin/J-Hamburg/N-NRW gegen Research-Vorlage B-Bayern. V1.3.1 Followups: FE-Nr-Regex 12-char (seeds) vs 11-char (spec § 6.8) reconcile, `setHalterAdresseUebergangsMarker` public-vs-internal architect-doc-Update, `getMdlAttestation` optional→required architect-doc-Update, `console.error` in `PunktestandOnDemandCard.tsx:58` cleanup, AR `dir="ltr"` auf FIN/FE-Nr-Latin-Spans, Lighthouse CLI `@lhci/cli` für true Score-Capture (a11y-tester runtime kein-CLI), `pretest:a11y` kill-port-3000-Hook für Windows-Dev-Server-Stale-Daemon, `kfz-*`-startsWith-Heuristik in `api.ts:1042-1044` tighten, `as unknown as ZodType` Helper-Extraction (carry over V1.0.1), Lena-FE-Empty-State unreachable im Persona-Picker (sub-persona-only), pre-V1.3 i18n parity gaps ~40 leaf-keys EN/RU/UK/AR/TR (V1.0.1/V1.1.0.1/V1.2.0.1 carry over).
- [ ] Dashboard (research+verify ✓ 2026-05-08; awaiting product-architect)
- [ ] Dokumente vault (research+verify ✓ 2026-05-08; awaiting product-architect)
- [ ] Termine, Datenschutz-Cockpit, Assistent-UI (not yet researched)
- [ ] Vertical autopilots beyond Umzug (Kindergeburt, Aufenthaltstitel-Verlängerung, Steuererklärung) — wait until horizontal layer is solid
- [ ] AI assistant with tool use
- [ ] Loom video, README, deploy
