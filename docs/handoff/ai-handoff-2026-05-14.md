# AI Handoff — GovTech DE Concept Demo

**Purpose**: This document is a self-contained brief for any AI/LLM that picks up this project. It captures (1) what the product is, (2) what has been built, (3) what failed and why, (4) what the UI still needs, and (5) hard-lines that must not break. Copy-paste this whole file as a prompt when handing off to another model or agent.

---

## 1. What this is

GovTech DE is a **speculative-design prototype** showing how a citizen-first interaction layer for German public administration could feel in 2027, sitting on top of DeutschlandID + EUDI Wallet + the Deutschland-Stack. **It is not a real integration. All data is mocked.** The artefact is portfolio-grade: demo to GovTech stakeholders (DigitalService DE, BMDS, Tech4Germany, GovTech Deutschland, GovStart), live URL, GitHub repo, Loom walkthrough.

**Repo**: `https://github.com/loneliness-is-repulsive/govtech-de` (private).
**Tree**: `C:\Users\iaiaa\govtech` on Windows 11.

**One-sentence pitch (working)**: "The state works for you — your identity, your documents, your bureaucratic life in one calm, premium, citizen-respectful interface."

The hero of the demo is **what the system does FOR the user, not faster forms**. The "Autopilot" pattern: user says "I'm moving", system fires 14 actions across 4 Behörden, user watches it happen.

---

## 2. Mission constraints (non-negotiable)

- **Visual + linguistic register**: serious, citizen-respectful, gov.uk / DigitalService DE-style minimalism. NEVER cloning Russian Gosuslugi aesthetics or generic AI-fintech templates.
- **Primary language**: German (Sie-Form, formal). Secondary locales: EN, RU, UK, AR (RTL), TR.
- **Accessibility**: WCAG 2.1 AA + BITV 2.0 mandatory.
- **Privacy-by-design**: every screen with personal data shows what is processed, by whom, on what legal basis. Datenminimierung visible.
- **Realism**: mock data uses real Behörden-Bezeichnungen, real PLZ, real Aktenzeichen-Formate. Marked `[MOCK]` where helpful.
- **Autopilot is the hero**: the demo's central wow-moment is what the system does *for* the user.

---

## 3. Tech stack

| Layer | Choice |
|---|---|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript (strict) |
| UI | Tailwind v4 + shadcn/ui + lucide-react |
| Animation | framer-motion (sparingly, `reducedMotion="user"` global) |
| State | React Server Components + useState/useReducer |
| Mock backend | TS module simulating REST, persists to `localStorage` |
| AI assistant (planned) | `@anthropic-ai/sdk` + Claude Haiku 4.5, prompt caching, tool use |
| i18n | `next-intl`, `de.json` source-of-truth, 5 non-DE locales |
| Testing | Vitest (unit) + Playwright (e2e + a11y via `@axe-core/playwright`) |
| Deployment | Vercel (planned) |

---

## 4. Personas (mocked, drive all demo behaviour)

- **Anna Petrov** — Russian, born 1992 in St. Petersburg, lives in Berlin, holds Aufenthaltstitel § 18g (Blue Card EU). Single. Has mDL (Class B, 2024), ePA, eRezept. Uses many pilot features. Tech-savvy migrant.
- **Markus Schmidt** — German, born 1968, married to Lena, father of Sophie (14). Lives in Brandenburg. Holds Führerschein from 2002 → Pflichtumtausch deadline 19.01.2027 (a featured "wow" alert). KFZ-Halter for 4 vehicles. Family-shared profile.
- **Mehmet Yıldız** — Turkish-German, mid-40s, lives in Mannheim, self-employed since 2019. Holds eAT (electronic Aufenthaltstitel). Many "nothing here yet" empty-states (no GRV pension, no marriage, no central PKV aggregator).

Persona data lives in `src/data/personas.json`. Switch via `?persona=anna-petrov`/`markus-schmidt`/`mehmet-yildiz` query param.

---

## 5. What is shipped (V1.0 → V1.3)

- **V1.0 (2026-05-08)**: Umzug autopilot. User triggers a move, system cascades 4 blocks (A: Anmeldung, B: Consent + Datenschutz, C: KFZ, D: Stammdaten-Sync — readonly Beschäftigung) across BMG, Bundeszentralamt für Steuern, KBA, ABH. Live timeline UI with framer-motion + reduced-motion gate. eID-Confirm dialog before run.
- **V1.5 + V1.5.1 (2026-05-09)**: Posteingang Brief-Erklärer. AI summary of Behörden letter + 4 reply templates (Bestätigung, Rückfrage, Einspruch-Skelett § 355 AO, Widerspruch SGG/VwGO, Aussetzung der Vollziehung § 361 AO). Cross-Template-Versand (2+ replies). Norm-Zitate as interactive tooltips. Multi-reply stack.
- **V1.0–V1.3 Stammdaten** (2026-05-10 → 05-13): Single-source-of-truth profile page. 8 sections (Identität, Anschrift, Familie, Beschäftigung readonly, Altersvorsorge, KV/Pflege, Kontakt, Mobilität). Wallet-Sub-Tab for mDL with closed-list ISO/IEC 18013-5 Annex-B attributes. Pflichtumtausch banner for Schmidt FE 2002. Punktestand on-demand with eID-reauth + 5-minute component-local TTL (never persisted to storage).
- **Stammdaten V1.3 Phase 6c rework (2026-05-14)**: Hero summary prominent, StammdatenSectionNav (sticky in-page-ToC + IntersectionObserver), MdlTeaserCard (only renders when mDL present), FieldCard density refactor, MobilitaetSektion collapsed-preview, FE-Nr + FIN `dir="ltr"` for AR locale + `tabular-nums`.
- **Design-System v2 foundation (Phase 5a/5b/5e, 2026-05-14)**: 28 additive type/spacing/motion tokens (`--ds-*`) + 16 OKLCH color tokens + HEX `@supports` fallback + `@media print` stylesheet + `@media (prefers-contrast: more)` AAA layer + Button `ds-primary` variant (44px touch-target) + `MotionConfig reducedMotion="user"` global.
- **Phase 6a/6b/6c per-screen rework**: Sidebar logical-RTL active-state (`border-s-4`), max-w-7xl container, WizardProgress 3-step, FristChip urgency palette (`<3d` danger / `<7d` warning), Skeleton-Banner after Modal-Accept, ReplyConfirmationView body-preview, StickyFristAction fixed-bottom + 1s static outline (CSS-Module), Nach-Vorgang-Tab Filter-Count-Badge, WasKannIchTunFooter pre-action-hints (Zahlung/Frist).

**Tests**: vitest 636/636 PASS, typecheck 0, lint 0 new errors, JSON.parse 6/6 locales, axe 0/0/0/0 across 81 runs.

---

## 6. What was tried and rejected (do NOT repeat)

### Rejected aesthetic direction 1: Mein-Profil-Wallet (Mercury/Stripe/Cron warm-fintech)

A full identity-first profile page was built at `/mein-profil`:
- IdentityHero with real photo (Unsplash CC0 portraits), Source Serif 4 headlines, "Bürgerin mit Aufenthaltstitel § 18g, wohnhaft in Berlin" status statement
- WalletCardStack (3–5 overlapping cards: Personalausweis, mDL, eAT, KV)
- FamilyPanel with persona-specific empty-states
- NeuigkeitenFeed (curated top-3: urgent Frist + running Vorgang + new letter)
- DatenschutzPreview (3-line teaser)
- VollstaendigesDatenprofil collapsed `<details>` wrapping the V1.0–V1.3 view
- Aesthetic tokens: cream bg `oklch(0.98 0.005 80)`, Source Serif 4 headings, 14px-radius cards, warm-fintech reference (Mercury / Stripe / Cron)

**User rejection (verbatim)**: "теперь всё как будто всё сделано ИИ: раньше было намного лучше. говно шрифты говно цвета".

**Why it failed**: Mercury/Stripe/Cron + cream OKLCH + serif headlines + Unsplash portraits + 14px-radius is the **default LLM-fintech aesthetic of 2024-2026**. It reads as "made by AI" even when the user picks it from a multiple-choice list — because the AI wrote the list. The user wasn't endorsing the aesthetic, they were picking the least-cold of four AI-default options.

**Reverted**: `/mein-profil` removed, Source Sans 3 + Source Serif 4 removed, `--mp-*` tokens removed, persona portraits deleted, Sidebar nav back to "Stammdaten". Local commit + force-push completed.

### Rejected aesthetic direction 2: Design-System v2 polish-by-audit

Before the Mein-Profil attempt, a polish-driven refactor (audit each screen → list top problems → fix each one) shipped clean tokens and 0 axe violations but **felt like the same architecture with cleaner numbers**. The user's words: "весь интерфейс всё ещё в перемешку, нет никакой идеи".

**Lesson**: refactor produces polish, not vision. Before any UI redesign, force a design-vision gate that defines product DNA (one-sentence pitch, identity-hero, wow moment, visual anchor) FIRST. Then product-architect writes spec from that vision, not from an audit.

### Rejected interaction pattern: BehoerdenBadge category coloring (HL-DS-10 leak)

`BehoerdenBadge.tsx` originally color-coded Bund (zinc), Land (sky), Kommune (emerald), Sozialversicherung (amber), Privat (violet). This violates HL-DS-3 (max 1 chromatic accent family + 3 status families). Inbox/Posteingang hot-path was stripped of `kategorie` prop in Phase 6b, but 12 detail-view consumers still pass kategorie. **Followup**: remove `kategorieClasses` from primitive entirely, replace with text-label only.

---

## 7. What the UI still needs (the actual brief)

The current state (after revert) is the post-Phase-6c codebase: clean tokens at the foundation, polished sidebar + topbar + Posteingang + Stammdaten, but **no central product idea, no identity moment, no visual concept that travels across screens**. The user explicitly wants:

### A. Identity / "who am I" moment
A first-3-seconds experience that says "this is you". The user mentioned a photo, family info, important news in the profile. Current `/stammdaten` opens with disclaimer text — wrong priority. The Mein-Profil attempt's IdentityHero idea was good but executed in AI-default aesthetic.

**Open**: what aesthetic delivers identity-affirming hero without reading as Mercury/Stripe/Cron? User has NOT yet supplied concrete app references they like. Until they do, do not propose Mercury-style premium-warm-fintech. Counter-defaults to try (still need user confirmation):
- Pure white or pure black bg (no cream)
- Single hardworking sans (Inter / Söhne / Geist — already in repo via `--font-sans`)
- Sharp 4–6 px radii, not 14 px
- High information density, not generous whitespace
- No portrait photos (illustrative or none)
- Branded accent that isn't soft-warm-blue

### B. A central concept that travels across all screens
Currently Posteingang feels like an inbox, Stammdaten feels like a data table, Vorgänge feels like a wizard. They don't share a worldview. Possible unifying concepts (each is a different product):
- **Wallet metaphor**: identity + documents + life, you carry, system updates (user picked this in a multi-choice but rejected the execution)
- **Cockpit metaphor**: dashboard, metrics, you control, Behörden execute orders
- **Akt metaphor**: your file, state writes in it, you respond
- **Assistant metaphor**: chat-driven, system does work behind confirmations

Pick one and commit. Don't blend.

### C. A SINGLE wow moment to develop first
The 3 candidates from earlier user feedback:
1. **Autopilot cinematic upgrade** — V1.0 Umzug is already a form-with-timeline. Should become a real-time film: 4 Behörden, 14 actions, live status-pulse. Already half-built.
2. **AI translator** — chancery-text → 1-sentence summary + draft reply. Already half-built in Posteingang V1.5.1 Brief-Erklärer. Could be elevated with stronger before/after visual contrast.
3. **Datenschutz-Cockpit** — banking-statement style for data accesses: who saw what when, with revoke button per row. Radical transparency as the trust-currency. Not yet built.

Develop one as hero, plan the others. User said: "развивай что-то одно то что важно сейчас".

### D. Non-hero patterns that still need work
- Onboarding: currently just a persona-picker. Should be a real DeutschlandID-login experience with welcome sequence.
- Sidebar IA: 10 nav items but Dashboard / Dokumente / Termine / Familie / Steuer / Assistent / Datenschutz are all stubs. Either build them or hide them.
- Mobile (375px): mostly works, but FieldCard density and LetterCard 3-line hierarchy not battle-tested on small screens.
- Dark mode: tokens exist (`prefers-color-scheme: dark` + `.dark` class), but no UI toggle, no full audit yet.

---

## 8. Failure modes to actively avoid

These are encoded in `~/.claude/projects/C--Users-iaiaa-govtech/memory/` and should be respected by any next agent:

1. **Polish ≠ vision**: don't run audit → fix-list → spec → coder pipeline on a UI rework. Force a vision gate first.
2. **LLM-default aesthetic trap**: Mercury / Stripe / Cron / Linear / Apple Wallet / Apple Health / Notion are the most-cited LLM-popular references. Picking ANY of them without user-supplied confirmation produces work that reads as AI-default. Get concrete user-supplied app refs (open them via WebFetch and look) before committing to a visual direction.
3. **Multiple-choice direction picking is poisoned by the option-writer's bias**: if I (the AI) write the four options, the user picks the least-bad, not the right one. Always give user a free-text path or explicitly ask for references they personally use.
4. **Parallel agent boundary slippage**: when 3 frontend-coders work on different UI areas, they must have strict file-scope separation. Sidebar / Layout = 6a only; Posteingang = 6b only; Stammdaten = 6c only. Shared files (globals.css, de.json, i18n) only touched by foundation phases.
5. **a11y-tester false-PASS**: don't trust the agent's PASS without running its own listed grep/axe checks from the spec. Past incident: PASS report had a contrast violation in the same file.
6. **i18n agent lacks Bash**: it can't run `JSON.parse` validation itself. Main thread MUST run a `node -e "[6 locales].forEach(JSON.parse(...))"` gate after every i18n agent run, or commits ship broken JSON.
7. **Brittle full-suite re-audits**: don't make a11y-tester re-audit the entire app on every per-screen change. Scope it to the changed surface.

---

## 9. Hard-Lines that must NEVER break (verifier-locked)

These are spread across `docs/specs/*.md` and `CLAUDE.md`. A code-reviewer agent will reject diffs that violate any.

### Cross-cutting

- **HL-DS-1**: Word "BundesSans" forbidden in `src/`, `docs/specs/`, i18n, git commit messages. Build/lint check: `grep -ri "BundesSans" src/ docs/specs/` must return 0 hits.
- **HL-DS-3**: Maximum 1 chromatic accent family + 3 status families (warning/danger/success) + 1 info-soft (Föderalismus-Disclaimer pattern). No additional brand-purple, brand-teal, etc.
- **HL-DS-4**: `MotionConfig reducedMotion="user"` global wrapper. Animations ≥400 ms have hard-coded reduced-motion fallback ≤200 ms opacity fade.
- **HL-DS-5**: No glassmorphism, no liquid-glass, no audio, no confetti anywhere.
- **HL-DS-6**: `tabular-nums` mandatory for Aktenzeichen, FE-Nr, IBAN, AZR-ID, Renten-Nr, Frist-Daten, Kfz-Kennzeichen.
- **HL-DS-7**: BITV 4.5:1 normal text, 3:1 large text/UI. V1.5.1 `--muted-foreground` hardening (5.63:1 light / 5.53:1 dark) NEVER loosened.
- **HL-DS-11**: Yellow-Letter highlight is 1-second static outline + fade-out. No loop pulse.
- **HL-DS-12**: Wallet cards follow page-theme strictly. No Apple-Wallet-dark override.
- **HL-DS-13**: `@media print` stylesheet for LetterReader / Vorgangs-Zusammenfassung / Bescheid-Detail.
- **HL-DS-14**: Föderalismus-Disclaimer-Card pattern + StickyFristAction pattern are domain-eigene patterns. Don't refactor them away.

### V1.3 Mobilität-specific

- **HL-MOB-9**: mDL attribute set is closed (`ISO_18013_5_MDL_TOGGLE_SET` whitelist of 14 Annex-B fields). No additional fields rendered in Wallet card or detail modal.
- **HL-MOB-11**: FAER (Fahrer-Eignungs-Register) Punktestand is on-demand only, 5-minute component-local TTL. NEVER persisted to `localStorage`, NEVER on a schema field.
- **HL-MOB-13 / HL-MOB-14**: Halter-Adresse phrase ban-list. Phrases "Halter-Adresse aktualisiert" and "automatische Synchronisierung" forbidden anywhere in render output. Block-D autopilot wording uses "§ 15 FZV / Pre-Fill der i-Kfz-Adressänderung / unverzüglich".

### V1.5/V1.5.1 Posteingang

- Cross-Template-Versand stack (2+ replies per letter) must keep working.
- Norm-Zitate tooltips on §-references must keep working.
- Rechtsbehelf skeleton templates (Einspruch / Widerspruch / Aussetzung) require PreInsertionModal acceptance before body is loaded.
- Disclaimer "Kein Rechtsrat" visible on every skeleton template.

### V1.0 Stammdaten

- ARF v2.0 disclaimer text verbatim (no paraphrasing).
- "Datenschutzcockpit (Pilot-Phase)" badge text exact.
- Block-D (Beschäftigung) is readonly. No edit affordance.

### i18n / a11y

- 6 locales (DE / EN / RU / UK / AR / TR) must parse. JSON.parse gate from main thread is mandatory.
- AR is RTL. FE-Nr, FIN, Aktenzeichen, IBAN, Kfz-Kennzeichen render `dir="ltr"` even in AR.
- Behörden terminology in non-DE locales keeps DE term in parentheses: e.g. `"Driving licence (Fahrerlaubnis)"`.

---

## 10. The agent pipeline (CLAUDE.md workflow)

Every new feature goes through this. The main thread does NOT write code directly — it orchestrates agents.

```
user idea → research-scout → domain-expert → concept-verifier (PROCEED/REVISE/REJECT)
         → product-architect (spec) → [frontend-coder | mock-backend-coder | assistant-engineer]
         → i18n-localizer + a11y-tester → code-reviewer (final gate)
```

**Two-agent consensus rule**: an idea proceeds to coding only if both research-scout and concept-verifier sign off. Domain-expert can override on legal-realism. Disagreement escalates to the user.

Agents are defined in `.claude/agents/*.md`. Skills are in `.claude/skills/` (17 design skills + Anthropic marketplace).

---

## 11. What the next AI should do

If you (the next AI) are picking up this project, here's the priority stack:

1. **Get user-supplied concrete app references first.** Open them with WebFetch. Look at their typography, color palette, density, navigation, hero patterns. Derive the visual direction from THOSE, not from your own list of "premium-but-warm" references.
2. **Pick ONE wow to develop**. Re-confirm with the user: Autopilot cinematic / AI translator / Datenschutz-Cockpit. Don't try to build all three.
3. **Define product DNA in writing before any code**: one-sentence pitch, identity-hero spec, central metaphor, visual anchor (with concrete reference URLs), wow moment. Get user PROCEED on this brief BEFORE spec.
4. **Then run product-architect → frontend-coder pipeline**. Per-screen agents must respect strict file-scope boundaries (Layout / Posteingang / Stammdaten don't cross).
5. **Never break the hard-lines in § 9**. Verifier and code-reviewer will catch most, but design your spec around them from the start.
6. **Run main-thread gates after agents**: JSON.parse on 6 locales, typecheck, vitest 636+/636+ (the baseline grows with each phase). Don't trust agent self-reports.
7. **Commit small + push**. Repo is `loneliness-is-repulsive/govtech-de` (private). git user.email is the GitHub noreply for that account.

---

## 12. Outstanding open questions for the user

These have NOT been resolved and should be asked before next major UI work:

- What apps/sites do you personally use that you find beautiful? URLs please.
- Which of the 3 wow moments is highest priority right now: Autopilot cinematic / AI translator / Datenschutz-Cockpit?
- Should we commit to the Wallet metaphor, the Cockpit metaphor, or another central frame?
- Should the demo include avatars/portraits at all, or skip them entirely?
- Is dark mode a portfolio requirement or a V2?
- Should /mein-profil come back (as a separate concept) or stay buried under /stammdaten?

---

## 13. File-system landmarks

- Project root: `C:\Users\iaiaa\govtech`
- Spec docs: `docs/specs/` (per-feature implementable specs, status-tracked)
- Research docs: `docs/research/` (research-scout output, including rejected directions like `2026-05-14-design-vision-mein-profil-wallet.md`)
- Audit reports: `docs/research/2026-05-14-ux-audit-*.md`
- a11y reports: `docs/a11y-reports/`
- Code reviews: `docs/reviews/`
- Mock backend: `src/lib/mock-backend/`, `src/data/`
- i18n: `src/lib/i18n/locales/{de,en,ru,uk,ar,tr}.json` (DE is source-of-truth)
- Tests: `tests/unit/` (vitest), `tests/a11y/` + `tests/e2e/` (Playwright)
- Memory (persistent across sessions): `~/.claude/projects/C--Users-iaiaa-govtech/memory/*.md`

---

## 14. Tone for the user

The user is direct, impatient with vague proposals, and rejects work that "looks made by AI". They want premium quality but resist Mercury/Stripe/Cron tropes. They prefer concrete references over abstract direction-picking. They will say "говно шрифты" if shrifty are wrong — take that as signal, not insult.

Russian is their primary working language for project conversation, but the product itself is German Sie-Form. Don't switch product strings to Russian.

---

End of brief.
