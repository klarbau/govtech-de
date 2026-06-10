# GovTech DE — Design System

> Speculative-design prototype: how a citizen-first interaction layer for German public administration could feel in 2027, built on top of DeutschlandID + EUDI Wallet + Deutschland-Stack.
>
> **All data is mocked. No real Behörden are integrated.** Every screen carries a `[MOCK]` watermark or prototype-disclaimer banner.

This design system encodes the visual language, content register, components and screens of the upstream GovTech DE prototype so designers and Claude Code agents can produce on-brand artefacts without re-reading the entire app.

## Sources

| Source | Where to look |
|---|---|
| **Upstream codebase (GitHub)** | <https://github.com/klarbau/govtech-de> — `main` branch. Read this if you need pixel-level fidelity beyond what's transcribed here. |
| Project context (verbatim) | `CLAUDE.md` in upstream repo — mission, tech stack, folder map, naming conventions, status log. |
| Visual foundations | `docs/research/2026-05-14-design-direction-premium-minimal.md` in upstream — full 70k token research brief; Hard-Lines HL-DS-1..HL-DS-14 enforced here. |
| Personas | `docs/personas.md` in upstream — Anna Petrov, Familie Schmidt, Mehmet Yıldız. |
| Tokens-in-CSS | `src/app/globals.css` in upstream — full Tailwind v4 `@theme` block + `--ds-color-*` aliases. Transcribed in [`colors_and_type.css`](./colors_and_type.css). |
| Components | `src/components/` in upstream — shadcn/ui primitives in `ui/`, layout in `layout/`, domain in `posteingang/`, `stammdaten/`, `umzug/`. |

If you have access to the upstream repo, **explore it further** — there is roughly 600 KB of domain research (`docs/domain/`), spec briefs (`docs/specs/`), and accessibility reports (`docs/a11y-reports/`) we did not lift verbatim.

---

## What this product is

GovTech DE is a portfolio-grade speculative demo aimed at GovTech stakeholders (DigitalService, BMDS, Tech4Germany, GovTech Deutschland, GovStart). It demonstrates:

- A **single unified citizen interface** that sits over the existing federal/state/communal Behörden layer.
- An **AI-driven autopilot** that handles compound bureaucratic events (Umzug, Geburt, Aufenthaltstitel-Verlängerung) end-to-end with explicit consent at each Behörden handoff.
- A **post-letter inbox** ("Posteingang") that summarises Behörden-Briefe with citation-backed AI explanations and template-driven replies — including legal-remedy skeletons (Einspruch §357 AO, Widerspruch §69 SGG).
- A **Stammdaten** single-source-of-truth profile that shows every register the citizen is recorded in, with an activity log of who pulled what data when.

The product's central wow-moment is **what the system does *for* the user, not faster forms**.

### Three primary personas

| Persona | Status | What the demo unlocks for them |
|---|---|---|
| **Anna Petrov, 28** | Blue Card EU (§18g AufenthG), Russian, in Berlin since 2023; partner + 1 child | Aufenthaltstitel-Verlängerung autopilot; Kindergeld-window awareness; Umzug-anmeldung without 5-week Termin queue |
| **Familie Schmidt** | Markus (38, angestellt) + Lena (35, selbstständig Architektin) + Felix (4) + Mia (in 2 Wochen geboren) in Hamburg-Eimsbüttel | The 7-application "Geburt" autopilot (Geburtsurkunde, KK, Elterngeld, Kindergeld, Steuer-ID, Kita) compressed to one consent flow |
| **Mehmet Yıldız, 34** | Deutsch-türkisch (eingebürgert 2018), in Köln; will Gewerbe anmelden | Gewerbeanmeldung cascade (Finanzamt-Fragebogen, IHK, Berufsgenossenschaft, KK-Statuswechsel) explained in DE + TR |

The onboarding screen lets viewers pick one persona to "log in as" — each pre-seeds the demo state with realistic letters, Vorgänge, documents, and Termine.

### Surfaces (one product, ten routes)

| Route | What lives there |
|---|---|
| `/` (landing) | Persona picker + prototype disclaimer |
| `/dashboard` | "Heute zu tun" — open Vorgänge, Fristen-Countdowns |
| `/posteingang` | Unified Behörden-Brief inbox with AI summaries + reply templates |
| `/stammdaten` | Single-source-of-truth profile, 11 sections, Wallet sub-tab, activity log |
| `/vorgaenge/umzug/{start,preview,run}` | Umzug wizard + autopilot cascade |
| `/dokumente` | QR-verifiable vault, EUDI export (V2 — stub) |
| `/termine` | Behörden-Termine + calendar integration (V2 — stub) |
| `/steuer` | Pre-filled Steuererklärung (V2 — stub) |
| `/familie` | Joint dependents, shared Vorgänge (V2 — stub) |
| `/assistent` | Conversational AI with tool-use (V2 — in research) |
| `/datenschutz` | Granular consent: who sees what |

This design system covers the **shipped surfaces** (Posteingang, Stammdaten, Umzug, Landing) — V2 routes are stubbed in the upstream code but no UI exists.

---

## Content fundamentals

### Language register

- **Primary language: Deutsch in Sie-Form.** The product never says "du" / "deine Daten" — it says "Sie" / "Ihre Daten". This is non-negotiable; it's the linguistic equivalent of HL-DS-1.
- **Secondary languages: EN, RU, UK, AR, TR.** Source-of-truth is `de.json`; all surfaces go through `t('key.path')` via `next-intl`. AR is right-to-left and uses the Source Sans 3 + Noto Sans Arabic stack.
- **Persona-respectful, never patronising.** Mehmet sees Turkish + German side-by-side because his AI assistant is bilingual, not because he "needs help in his native language".

### Tone

- **Citizen-respectful, not chummy.** The product is a serious public-administration tool — register is closer to gov.uk + DigitalService DE than to Notion or Linear.
- **Function-first copy.** Every label states what will happen, what data will move, on what legal basis. No "Hooray! 🎉 You're done." — instead `"Antrag eingereicht. Eingangsbestätigung folgt per BundID-Postfach."`
- **Explicit about uncertainty.** Where a Behörde is not BundID-connected, the disclaimer says so verbatim: `"Familienkasse Brandenburg ist seit 04/2026 angebunden. ABH Köln noch nicht angebunden — Brief wird postalisch zugestellt."`
- **No marketing voice.** No "transform your government experience" or "powered by AI". Instead the AI summary block says: `"Diese Zusammenfassung wurde von einem KI-Modell erzeugt. Maßgeblich ist der Bescheid im Original."`

### Casing & punctuation

- **Sentence case for headings.** "Ihre Stammdaten" — not "Ihre Stammdaten" "IHRE STAMMDATEN".
- **Eyebrows in `UPPERCASE` with `0.06em` letter-spacing.** Only for eyebrows above headings — never for body or links.
- **No exclamation marks.** Anywhere. Including in success states.
- **No emoji.** Anywhere. Including in tone-of-voice copy. Status is conveyed with Lucide icons (`Sparkles`, `AlertTriangle`, `ShieldCheck`, etc.) plus a text label — never emoji glyphs.
- **Tabular numerals mandatory for IDs, dates and money** (HL-DS-6). Aktenzeichen `F-2026-04827-K`, IBAN `DE89 3704 0044 0532 0130 00`, FE-Nr `B026F0Z4P`, Fristen `15.06.2027`.

### Norm citation

When the AI summary or a Behörden-letter cites German law, citations are wrapped in a `<NormZitatSpan>` (e.g. `§ 357 AO`, `§ 15 FZV`, `§ 9 OZG`). On hover they expand to the full norm title and link to gesetze-im-internet.de. Decorative norm-name fakes are forbidden — every citation has to resolve to a real regulation.

### Copy examples (verbatim from i18n)

| Surface | German source string |
|---|---|
| Posteingang hero | `"Ihr Posteingang fasst alle Behördenbriefe zusammen. Jede Zusammenfassung verlinkt auf das Original."` |
| LetterCard action hint | `"Antwort erforderlich"` · `"Zur Kenntnis"` · `"Erledigt"` |
| Frist chip | `"Frist · 15.06.2027 · in 14 Tagen"` |
| Stammdaten hero | `"Sie sind in {register_count} Registern geführt."` |
| Stammdaten last transmission | `"Letzte Übermittlung vor {dauer}: {absender} → {empfaenger} ({rechtsgrundlage})"` |
| 2027 vision banner | `"In 2027 sieht das Datenschutzcockpit alle Übermittlungen Ihrer Daten zwischen Behörden."` |
| Prototype disclaimer | `"Speculative Prototype — keine echte Behörde ist angebunden. Alle Daten sind synthetisch."` |
| AI summary footer | `"Diese Zusammenfassung wurde von einem KI-Modell erzeugt. Maßgeblich ist der Bescheid im Original."` |

---

## Visual foundations

### Direction in one sentence

**"DigitalService DE in einem Linear-Hemd"** — gov.uk / KERN-conformant grid and language, polished with three Stripe/Linear-inspired moves: warm-neutral palette (Chroma ≤ 0.005), three-tier shadow system, two documented motion curves.

### Colors

All tokens live in [`colors_and_type.css`](./colors_and_type.css). The palette is **OKLCH-native with HEX fallback** for legacy chassis (Edge ≤ 108, institutional browsers).

| Family | Tokens | Hue & chroma | Where it appears |
|---|---|---|---|
| Surface (warm-neutral) | `--ds-color-surface{,-raised,-muted}` | Hue 80°, chroma ≤ 0.005 (HL-DS-3 cap) | Page background, cards, section dividers |
| Border | `--ds-color-border{,-strong}` | Hue 80°, chroma 0.004–0.005 | 1-px hairlines, focus rings, dividers |
| Text (cool-neutral) | `--ds-color-text-{primary,secondary,muted}` | Hue 250°, chroma 0.005–0.015 | Body, captions; muted has hardened 5.63:1 / 5.53:1 floor (HL-DS-7) |
| Accent — Trust-Blau | `--ds-color-accent{,-soft,-foreground}` | Hue 252° | The *single* chromatic accent — buttons, links, active nav, focus rings (HL-DS-3) |
| Warning | `--ds-color-warning{,-soft}` | Hue 80° | Frist-banners, Achtung-states |
| Danger | `--ds-color-danger` | Hue 27° | Errors, expired Fristen — used very sparingly |
| Success | `--ds-color-success` | Hue 152° | Erfolg-states, sync_ok |
| Föderalismus-Info | `--ds-color-info-soft` | Hue 245° | The disclaimer-card pattern (V1.2; HL-DS-14) |

**Behörden categories (Bund / Land / Kommune) carry no colour differentiation** (HL-DS-10). They are conveyed by text label only — colour would imply hierarchy.

### Typography

The full scale lives in `colors_and_type.css` as `--ds-text-*` + matching `--ds-line-*`. Drop `class="ds-display"` / `ds-h1` / `ds-h2` / `ds-h3` / `ds-body` / `ds-body-s` / `ds-caption` / `ds-eyebrow` on any element.

| Class | Size | Line-height | Weight | Use |
|---|---|---|---|---|
| `ds-display` | 48 px | 50 px | 700 | Hero on landing only |
| `ds-h1` | 36 px | 40 px | 600 | Page title |
| `ds-h2` | 24 px | 30 px | 600 | Section title |
| `ds-h3` | 19 px | 25 px | 600 | Card title |
| `ds-body` | 16 px | 24 px | 400 | Default body |
| `ds-body-s` | 15 px | 24 px | 400 | Secondary body, descriptions |
| `ds-caption` | 14 px | 20 px | 500 | Labels, metadata |
| `ds-eyebrow` | 11 px | 1.45 | 600 + `0.06em` tracking, UPPERCASE | Eyebrows above headings only |

Source Sans 3 is loaded via the Google Fonts CDN at the top of `colors_and_type.css`. See [`fonts/README.md`](./fonts/README.md) for the substitution flag (the upstream Next.js app uses `next/font/google` so no .woff2 files ship).

### Spacing

The Tailwind 4-pt default scale is **untouched** (`p-1` = 4 px, `p-4` = 16 px). New components needing the GOV.UK 5-px-vertical-rhythm use the **additive** `--ds-space-fixed-{5,10,15,20,25,30,40,50,60}` tokens. Vertical rhythm at the type level comes for free because all line-heights are 5-px multiples (20 / 25 / 30 / 40 / 50).

### Backgrounds, imagery, gradients

- **Solid backgrounds only.** The page background is `--ds-color-surface` (white in light, near-black in dark). Cards sit on `--ds-color-surface-raised`.
- **No marketing gradients.** Anywhere. The 2027-vision banner uses a flat `--ds-color-info-soft`, not a gradient.
- **No stock photography or illustrations.** Every pixel is functional UI. If a Behörden-letter renders a document preview, it shows the rendered text with a `[MOCK]` watermark — not an image.
- **No background patterns or textures.** The closest we get to "warmth" is the Hue-80° chroma-0.003 surface-muted divider — barely perceivable side-by-side.

### Borders, shadows, depth

- **Border-first, shadow second.** Default cards have `ring-1 ring-foreground/10` (1-px hairline) and `border` — shadow is only added on hover (`hover:shadow-md`) or for true layering.
- **Exactly three shadow tokens** (HL-DS-2): `--ds-shadow-card` (1 px + 3 px, opacity 4–6 %), `--ds-shadow-popover` (8 px + 16 px, opacity 6–8 %), `--ds-shadow-modal` (24 px + 48 px, opacity 10–14 %). All soft, never sharp; values are roughly 60–70 % the intensity of Stripe's `shadow-xl` family.
- **No glassmorphism.** The Topbar has `backdrop-blur supports-backdrop-filter:bg-background/60` — that is the *only* place blur ever appears. Cards, modals, sidebar are opaque.
- **No coloured shadows.** Shadow tokens are pure black with low alpha.

### Corner radii

| Token | px | Use |
|---|---|---|
| `--ds-radius-xs` | 2 | Inline badges, tags, `<NormZitatSpan>` |
| `--ds-radius-sm` | 4 | Inputs, checkboxes |
| `--ds-radius-md` | 8 | Cards (small) |
| `--ds-radius-lg` | 12 | Modals, large cards |
| `--ds-radius-card` | 14 | Wallet card, mDL — Apple-Pass reference |
| `--ds-radius-full` | 9999 | FristChip, avatar, round icon button |

Buttons use Tailwind `rounded-lg` (12 px) for `default`/`lg` and a `min()` cap for `sm`/`xs` so they don't out-round their container.

### Motion

- **Two curves, three durations** + one handoff slot (HL-DS-4):

  | Token | Curve | Duration | Use |
  |---|---|---|---|
  | `--ds-ease-out` | `cubic-bezier(0.22, 0.61, 0.36, 1)` | 180 ms | Enter — modal open, toast in, fade-in |
  | `--ds-ease-in` | `cubic-bezier(0.64, 0, 0.78, 0.39)` | 140 ms | Exit — modal close, toast out |
  | `--ds-ease-in-out` | `cubic-bezier(0.65, 0, 0.35, 1)` | 240 ms | Layout shifts, sidebar collapse, AutopilotTimeline sync |
  | `--ds-ease-handoff` | same curve as in-out | 400 ms | AI-handoff moments — never bouncy, never springy |

- **No bounce. No overshoot. No spring.** Iteration 1 of the research brief had a `cubic-bezier(0.34, 1.56, 0.64, 1)` overshoot curve; Iteration 2 explicitly removed it — "boing" reads as playful and breaks the trust anchor.
- **`prefers-reduced-motion` is respected globally**, via the `@media (prefers-reduced-motion: reduce)` block in `colors_and_type.css` and via `<MotionConfig reducedMotion="user">` at the React root.
- **Animations ≥ 400 ms must collapse to a ≤ 200 ms opacity fade under reduced-motion** (V1.3 a11y lesson).

### Hover / press states

- **Hover** — links + nav: `text-foreground` (from `text-muted-foreground`). Buttons: `hover:bg-primary/80` (default), `hover:bg-muted` (outline/ghost). Cards: `hover:shadow-md` (lift), never colour shift.
- **Active / press** — `active:not-aria-[haspopup]:translate-y-px` (1-px down, faux-tactile). No scale, no shrink, no colour darken on press.
- **Focus** — universal `outline: 2px solid var(--ds-color-accent); outline-offset: 2px;`. Under `prefers-contrast: more` the outline grows to `3px` with `3px` offset.
- **Disabled** — `pointer-events: none; opacity: 0.5;` plus `aria-disabled="true"`. Disabled inputs additionally darken to `--ds-color-surface-muted`.
- **Invalid** — `aria-invalid="true"` adds `border-destructive` + `ring-3 ring-destructive/20`.

### Layout rules

- **Sidebar `w-64` (256 px), fixed on `md:` and up**, hidden on mobile (mobile gets a sheet trigger from the Topbar). Active nav item gets a 4-px left `border-s` in `--ds-color-accent` + `--ds-color-accent-soft` background.
- **Topbar `h-14` (56 px), sticky `top-0 z-30`**, semi-transparent (`bg-background/80 backdrop-blur supports-backdrop-filter:bg-background/60`). The *only* place blur appears.
- **Main column `max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8`.** Page content is centered with generous padding.
- **PrototypeDisclaimerBanner** sits between Topbar and main on every authenticated page — yellow stripe, `[MOCK]` watermark.

### Transparency & blur

Used **only** for the Topbar's `bg-background/80 backdrop-blur` trick. Anywhere else, blur or transparency breaks the trust anchor. Cards, modals, popovers are 100 % opaque.

### Imagery vibe

Not applicable — there is none. If you must add imagery (Loom thumbnail, social-share OG image), keep it **monochrome / cool**, document-and-architecture only, never people-in-marketing situations.

### Cards (the canonical pattern)

```
rounded-xl
bg-[--ds-color-surface-raised]
ring-1 ring-[--ds-color-border]   ← border-first, not shadow-first
p-4 (sometimes p-5 sm:p-6 for hero cards)
shadow-sm                          ← optional, very soft
hover:shadow-md transition-shadow  ← lift on hover, never colour shift
```

Card titles use `font-medium` + `ds-h3`. Card descriptions use `ds-body-s` in `--ds-color-text-secondary`. Card footers sit on `bg-muted/50` with a top border.

### What we explicitly avoid

- Bluish-purple gradients of any kind.
- Emoji as content or as iconography.
- Cards with rounded corners and a coloured-left-border-only accent.
- Drawing iconography from scratch as SVG (we use Lucide).
- Marketing photography or stock imagery.
- Bouncy / spring / overshoot animation.
- Glassmorphism beyond the single Topbar blur.
- Per-category colour coding for Bund / Land / Kommune (HL-DS-10).
- Mode-bruch sonderlocken: every surface (including the mDL Wallet card) follows the page theme. No "Wallet is always dark" exceptions (HL-DS-12).

---

## Iconography

### System

**lucide-react** (ISC license) is the *only* icon system. The npm package is loaded at build time in the Next.js app; for design artefacts in this folder use the Lucide CDN: `<script src="https://unpkg.com/lucide@latest/dist/umd/lucide.min.js"></script>` then `lucide.createIcons()`.

- **Stroke**: 2 px (Lucide default), `stroke-linecap="round"`, `stroke-linejoin="round"`.
- **Default size**: `size-4` (16 px) in buttons and chips, `size-5` (20 px) in sidebar nav, `size-3` (12 px) in tiny badges.
- **Colour**: always `currentColor` — recolour by setting the parent's text colour.

### No emoji. No unicode glyph icons.

- Emoji **never** appear in UI strings or as decorative content (HL: not enumerated but treated as part of HL-DS-1's tone of voice).
- Unicode dingbats (`•`, `→`, `·`) are used as **typographic** characters in body text, not as icon replacements. `·` is the canonical middle-dot separator between metadata fields (`Behörde · Brieftyp`).

### Brand mark

- `assets/logo-mark.svg` — square 48 × 48 reproduction of Lucide-`Landmark` for use in artefacts.
- `assets/logo-wordmark.svg` — horizontal lockup with "GovTech DE" wordmark + UPPERCASE eyebrow.

The mark is intentionally a Lucide glyph: it signals that the product is a citizen-tool, not a brand. There is no proprietary logotype.

### Substitution flag

The upstream repo did not snapshot any Behörden logos or proprietary brand assets in a `public/` folder we could read — the `BehoerdenBadge` component renders text only by design (HL-DS-10). If you need real Behörden logos for a high-fidelity demo, source them per-Behörde and respect each Behörde's CD guidelines.

---

## Index — what else lives here

| Path | What |
|---|---|
| [`README.md`](./README.md) | This file |
| [`SKILL.md`](./SKILL.md) | Agent-Skills front-matter wrapper for Claude Code |
| [`skills/`](./skills/) | 17 design-related Agent Skills imported from the upstream repo (refactoring-ui, web-typography, ux-heuristics, design-system, top-design, ios-hig-design, microinteractions, design-sprint, design-everyday-things, brand, ui-styling, ui-ux-pro-max, slides, banner-design, design, emil-design-eng, ui-refactor) |
| [`colors_and_type.css`](./colors_and_type.css) | All `--ds-*` tokens; semantic `.ds-*` class hooks; reduced-motion + high-contrast + dark mode |
| [`assets/`](./assets/) | Brand marks (logo-mark.svg, logo-wordmark.svg); iconography notes |
| [`fonts/`](./fonts/) | Source Sans 3 sourcing, substitution flag |
| [`preview/`](./preview/) | Design-system card HTMLs (one card per token cluster — colours, type, spacing, components) |
| [`ui_kits/web/`](./ui_kits/web/) | Web product UI kit: index.html click-thru + Posteingang / Stammdaten / Umzug surfaces; primitives.jsx + components.jsx |

### When to read what

- **Designing a one-off slide or doc?** Read this README, then drop `colors_and_type.css` into your HTML and use the `.ds-*` classes.
- **Building a new screen for the web product?** Open `ui_kits/web/index.html` to see how the canonical layout chrome (sidebar, topbar, disclaimer banner, main column) composes, then lift the component you need from `components.jsx`.
- **Recreating Posteingang / Stammdaten / Umzug specifically?** Open the matching HTML in `ui_kits/web/` — these are pixel-fidelity recreations cross-referenced with the upstream code.
- **Onboarding a Claude Code agent into this style?** Point them at `SKILL.md` (or invoke the skill if it's been installed).

---

## Hard-Lines (verbatim from upstream research brief)

These are the 14 non-negotiable design rules. Every component in this system was built against them.

1. **HL-DS-1** — Source Sans 3 is justified tech-only. The word "BundesSans" never appears as a positive framing reference anywhere in code, copy, commits, or i18n.
2. **HL-DS-2** — Exactly three shadow tokens (`--ds-shadow-card`, `--ds-shadow-popover`, `--ds-shadow-modal`). No more.
3. **HL-DS-3** — One chromatic accent family (Trust-Blau, Hue 252°) + three status families (warning 80°, danger 27°, success 152°) + one Föderalismus-info-soft. Surface/border chroma ≤ 0.005.
4. **HL-DS-4** — Global `<MotionConfig reducedMotion="user">`. Animations ≥ 400 ms collapse to an opacity fade ≤ 200 ms under reduced-motion.
5. **HL-DS-5** — Reserved.
6. **HL-DS-6** — Tabular numerals mandatory for Aktenzeichen, FE-Nr, IBAN, AZR-ID, Renten-Versicherungsnummer, Frist dates.
7. **HL-DS-7** — `--ds-color-text-muted` contrast floor 5.63:1 light / 5.53:1 dark, set in V1.5.1 and never relaxed. Focus rings ≥ 3:1 against surface.
8. **HL-DS-8** — Touch targets ≥ 44 × 44 CSS-px (WCAG 2.5.5).
9. **HL-DS-9** — Inputs ≥ 48 px height.
10. **HL-DS-10** — Bund / Land / Kommune carry no colour differentiation. Text label only.
11. **HL-DS-11** — Reserved.
12. **HL-DS-12** — Wallet / mDL surfaces follow page theme. No "Wallet is always dark" exceptions.
13. **HL-DS-13** — Print stylesheet is monochrome A4 portrait with Source Sans 3 fallback to Times New Roman.
14. **HL-DS-14** — Föderalismus disclaimer uses `--ds-color-info-soft`, never the warning family.

If you find yourself wanting to break one of these to make something prettier, stop and revisit — they are explicitly the trust-anchors that distinguish a citizen tool from a SaaS dashboard.
