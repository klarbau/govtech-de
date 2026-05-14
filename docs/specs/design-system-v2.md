---
feature: design-system-v2
title: Design-System v2 — Tokens, Type, Motion, Print, Hochkontrast, 3 Wow-Patterns
status: spec
date: 2026-05-14
author: product-architect
upstream:
  research: docs/research/2026-05-14-design-direction-premium-minimal.md (Iteration 2, status: verifier-PROCEED)
  audits:
    - docs/research/2026-05-09-posteingang-ux-critique.md
    - "Layout-Shell + Onboarding + Vorgaenge UX-Audit (referenced inline; cite when committed)"
    - "Stammdaten V1.3 UX-Audit (referenced inline; cite when committed)"
inherits_from:
  - docs/specs/posteingang.md (V1, shipped)
  - docs/specs/posteingang-v1.5.md (shipped)
  - docs/specs/posteingang-v1.5.1.md (shipped)
  - docs/specs/stammdaten.md (V1, shipped)
  - docs/specs/stammdaten-v1-1-renten-kv.md (V1.1, shipped)
  - docs/specs/stammdaten-v1-1-kontakt-schicht.md (V1.2, shipped)
  - docs/specs/stammdaten-v1-3-mobilitaet.md (V1.3, shipped)
naming-verifier-locked: design-system-v2
hard-lines-count: 14
estimated_effort: ~5 phases × 1–2 working days each = ~8 working days total, parallelisable across 3 frontend-coder + 3 migration-coder slots
owner_agents: [frontend-coder, mock-backend-coder, i18n-localizer, a11y-tester, code-reviewer]
---

> **Verhältnis zu V1.0–V1.3 (shipped)**: Diese Spec ändert **keine** semantischen
> Features, **keine** Schemata, **keine** Hard-Lines aus den geshippten
> Slices. Sie definiert die visuell-/typografisch-/motion-/print-Schicht neu
> und migriert die Tokens **additiv**. Jede V1.x-Hard-Line (NormZitat-Lookup,
> Cross-Template-Versand, FAER-TTL, mDL-closed-list, Block-D-Wording,
> Sticky-Footer, V1.5.1 `--muted-foreground` 5.63/5.53, V1.3 `text-amber-950`
> auf 5 Sites) bleibt unverändert in Kraft und ist hier nochmal in § 4 +
> § 11 als „nicht brechen"-Marker aufgeführt.

> **Verifier-Verhältnis**: Diese Spec übernimmt die 14 Hard-Lines HL-DS-1..14
> aus `docs/research/2026-05-14-design-direction-premium-minimal.md` § "Hard-Lines"
> verbatim. Frontend-coder, mock-backend-coder, i18n-localizer und
> a11y-tester dürfen daran **nicht** umformulieren.

---

## 1. Mission & Scope

Design-System v2 ist der Polish-Pass auf den geshippten V1.0–V1.3-Slices. Ziel: aus „shadcn-Defaults + Inter + 6 Shadow-Tokens" wird ein kohärenter, citizen-respectful Polish-Acker im Geist „DigitalService DE × Linear-Restraint × Apple-Wallet-für-mDL". Kein neues Feature, kein neuer Vorgang, kein neues Vertikal-Autopilot. Ausschließlich Typography (Source Sans 3 + GOV.UK-Scale), Color (warm-neutral OKLCH, Chroma ≤ 0.005), Motion (4 Easings, kein Overshoot), Shadow-Reduktion (6 → 3 Tokens), Border-Radius-Konsolidierung, drei domain-kalibrierte Wow-Patterns (Autopilot-Handoff, Yellow-Letter-Outline, Wallet-Reveal), Print-Stylesheet, BITV-2.0-Hochkontrast-Modus, und ein primitive-component-Refactor in `src/components/ui/` (Button, Card, Input, Badge, Dialog, Table). Dark Mode wird über `prefers-color-scheme` aktiv geehrt, **ohne** UI-Toggle.

**In-Scope**:
- Token-Layer 1 (Type, Spacing-additiv, Color OKLCH light+dark, Shadow, Border-Radius, Motion) in `src/app/globals.css`
- Token-Layer 2 (Print, `prefers-contrast: more`, `prefers-color-scheme: dark`)
- Primitive-Komponenten-Refactor in `src/components/ui/` (Button, Card, Input, Badge, Dialog, Sheet, Table)
- Drei Wow-Patterns: Autopilot-Handoff (Timeline), Yellow-Letter-Outline (Bridge-Card), Wallet-Reveal-Crossfade (MaskedField)
- Domain-Patterns Beibehalt: `FoederalismusCardDisclaimer` (V1.2), `StickyFristAction` (V1.5.1), `BehoerdenBadge` (color-frei)
- Per-Screen-Redesign-Briefs für 3 parallele frontend-coder-Tasks (Layout-Shell + Onboarding + Vorgänge-Wizard / Posteingang / Stammdaten V1.0–V1.3)

**Out-of-Scope (siehe § 14)**:
- UI-Toggle für Dark-Mode (V2 oder später)
- `shadow-*`-Migration der ~90 bestehenden V1-Sites (eigener V2.x Refactor-Slot)
- Neue Vorgänge (Geburt, Heirat, Aufenthalt-Verlängerung, Steuer)
- Vertikal-Autopiloten jenseits Umzug
- Assistent-UI / Tool-Use
- Brand/Logo/Wortmarke

---

## 2. Hard-Lines HL-DS-1..14 (verifier-locked, verbatim)

Diese 14 Hard-Lines sind 1:1 aus `docs/research/2026-05-14-design-direction-premium-minimal.md` § "Hard-Lines" übernommen. Frontend-coder, mock-backend-coder, i18n-localizer dürfen nicht umformulieren. Jede Hard-Line trägt einen konkreten Test, den a11y-tester / code-reviewer als Acceptance-Gate ausführt.

---

**HL-DS-1**: Das Wort "BundesSans" taucht **nirgends als positive Framing-Referenz** auf — nicht in i18n-JSON, nicht in `/src`-Code, nicht in Git-Commits, nicht in Test-Beschreibungen, nicht in Spec-Marketing-Texten. Erlaubte Ausnahme: Forschungsbriefe + Spec-Hard-Lines, die das Verbot **dokumentieren**.

_Test_: grep-deny CI-Script (Bash + PowerShell)
```bash
# Must produce 0 hits.
grep -rEn "BundesSans" src/ public/ tests/ 2>&1 | grep -v "^Binary file" || true
# In docs/specs/design-system-v2.md and docs/research/2026-05-14-*.md, occurrences are documenting the ban
# and are excluded from the lint scope.
```
Vitest-Test in `tests/unit/design-system-bundessans-ban.test.ts` enumeriert dasselbe + locale-JSON-Tree.

---

**HL-DS-2**: Max 3 Shadow-Tokens (`--shadow-card`, `--shadow-popover`, `--shadow-modal`). Plus `--shadow-none` als expliziter No-Shadow-State. Keine 4./5./6. Stufe.

_Test_: Vitest-Test `tests/unit/design-system-shadow-token-count.test.ts` parst `src/app/globals.css` und zählt `--shadow-*`-Declarations innerhalb `:root` / `.dark` / `@media`-Blöcke; assert count ≤ 4 (incl. `--shadow-none`). Plus grep-deny:
```bash
grep -rEn "(--shadow-(sm|md|lg|xl|2xl|inner))" src/app/ src/components/ui/ || true
# Must produce 0 hits for new components after Phase 5c migration.
```

---

**HL-DS-3**: 1 chromatischer Akzent (`--color-accent`, Trust-Blau) + 3 Status-Familien (warning gelb, danger rot, success grün). Plus `--color-info-soft` für Föderalismus. **Keine** zusätzliche Brand-Farbe.

_Test_: Vitest-Test `tests/unit/design-system-color-family-cap.test.ts` enumeriert alle `--color-*`-Tokens und assertet Familie-Mapping (`accent`, `warning`, `danger`, `success`, `info-soft`, plus Surface/Border/Text neutrals). Jede neue chromatische Familie = Code-Review-Block.

---

**HL-DS-4**: `MotionConfig reducedMotion="user"` global gewrappt (`src/app/layout.tsx`). Animationen ≥ 400 ms **müssen** unter `prefers-reduced-motion: reduce` durch einen Opacity-Fade ≤ 200 ms ersetzt werden.

_Test_: Playwright-a11y-Test `tests/a11y/design-system-reduced-motion.spec.ts` setzt `emulateMedia({ reducedMotion: 'reduce' })`, triggert Autopilot-Handoff in Umzug-Vorgang, misst Animation-Duration via `page.evaluate(() => getComputedStyle(el).animationDuration)`; assert ≤ 200 ms. Plus grep für `MotionConfig` in `src/app/layout.tsx`.

---

**HL-DS-5**: Kein Glassmorphism, kein Liquid-Glass, kein Audio, kein Konfetti. (Trust-Anker-Bruch.)

_Test_: grep-deny
```bash
grep -rEn "(backdrop-blur|backdrop-filter|<audio|new Audio\(|canvas-confetti|react-confetti)" src/ || true
# Must produce 0 hits. (Note: existing `supports-backdrop-filter:backdrop-blur-xs`
# in dialog overlay is permitted as a graceful enhancement, not a glassmorphism feature.
# Whitelist exception documented in the test.)
```

---

**HL-DS-6**: `font-variant-numeric: tabular-nums` Pflicht für Aktenzeichen, FE-Nr, IBAN, AZR-ID, Renten-Versicherungsnummer, Frist-Daten, Kfz-Kennzeichen.

_Test_: Vitest-Test `tests/unit/design-system-tabular-nums.test.ts` rendert die 7 listed Komponenten (`AktenzeichenSpan`, `FeNrSpan`, `IbanSpan`, `AzrIdSpan`, `RvNrSpan`, `FristCountdown`, `KennzeichenSpan`) und assertet `getComputedStyle(el).fontVariantNumeric === 'tabular-nums'`. Plus Playwright-Visual-Diff snapshot at 1×.

---

**HL-DS-7**: BITV 4.5:1 normal-text, 3:1 large-text + UI — V1.5.1-Härtung 5.63:1 light / 5.53:1 dark für `--muted-foreground` **nicht lockern**. V1.3-shipped `text-amber-950` auf Surface-Warning-Soft **nicht brechen**.

_Test_: Vitest-Test `tests/unit/design-system-contrast-floor.test.ts` parst `--muted-foreground` Light + Dark OKLCH-Werte aus `globals.css`, konvertiert nach sRGB, berechnet Kontrast gegen `--background` / `--card`; assert Light ≥ 5.63 und Dark ≥ 5.53. Plus grep-keep für `text-amber-950` auf den 5 V1.3-Sites:
```bash
grep -rEn "text-amber-950" src/components/ | wc -l
# Must remain ≥ 5 (FoederalismusCardDisclaimer, PflichtumtauschBanner,
# UmzugBridgeBadge × 2, plus one in Mobilität-Sektion).
```

---

**HL-DS-8**: Touch-Target ≥ 44 × 44 CSS-px (WCAG 2.5.5). Alle interaktiven Elemente (Button, Link-Button, Icon-Button, Checkbox-Hitbox, Radio-Hitbox, Toggle, Tab).

_Test_: Playwright-Test `tests/a11y/design-system-touch-target.spec.ts`:
```ts
const interactiveSelectors = ['button', 'a[role="button"]', '[role="tab"]', 'input[type="checkbox"]', 'input[type="radio"]', '[role="switch"]'];
for (const sel of interactiveSelectors) {
  const elems = await page.locator(sel).all();
  for (const el of elems) {
    const box = await el.boundingBox();
    expect(box.width, `${sel} width`).toBeGreaterThanOrEqual(44);
    expect(box.height, `${sel} height`).toBeGreaterThanOrEqual(44);
  }
}
```

---

**HL-DS-9**: Input-Höhe ≥ 48 px.

_Test_: Playwright-Test `tests/a11y/design-system-input-height.spec.ts`, identisch zu HL-DS-8 aber Selector `input:not([type="checkbox"]):not([type="radio"]), select, textarea` und Mindesthöhe 48.

---

**HL-DS-10**: Behörden-Kategorien (Bund/Land/Kommune) tragen **keine** eigene Farbe — nur Text-Label.

_Test_: Vitest-Test `tests/unit/design-system-behoerden-badge-no-color.test.ts` rendert `BehoerdenBadge` mit `kategorie='bund'`, `'land'`, `'kommune'` und assertet, dass die computed background-color, border-color und text-color zwischen den drei Varianten **identisch** sind. Plus grep:
```bash
grep -rEn "kategorie.*?bg-(blue|green|red|amber|purple)" src/components/shared/BehoerdenBadge* || true
# Must produce 0 hits.
```

---

**HL-DS-11**: Yellow-Letter-Highlight ist **statisches Outline für 1 s mit Fade-out**, **kein** loopender Pulse, **kein** Repeat.

_Test_: Playwright-Test `tests/a11y/design-system-yellow-letter-outline.spec.ts` rendert `YellowLetterEchoCard`, wartet 1.5 s, assertet `getComputedStyle(el).outlineColor === 'transparent'`. Plus grep-deny:
```bash
grep -rEn "(animate-pulse|@keyframes pulse|animation-iteration-count:\s*infinite)" src/components/stammdaten/ src/components/posteingang/ || true
# Must produce 0 hits in YellowLetter*/Bridge-Card files.
```

---

**HL-DS-12**: Wallet-mDL-Card folgt strikt dem Page-Theme. Keine Mode-Bruch-Sonderlocke „Wallet ist immer dunkel".

_Test_: Playwright-Test `tests/a11y/design-system-wallet-page-theme.spec.ts` emuliert beide Color-Schemes, screenshot-diff vs. baseline; plus DOM-Assertion: `WalletMdlCard` hat keinen `data-force-theme="dark"` Marker und keinen hartkodierten `bg-zinc-900` o.ä. Grep-deny:
```bash
grep -rEn "(bg-(zinc|gray|slate|black)-9(0|5)0|data-force-theme)" src/components/stammdaten/wallet/ || true
# Must produce 0 hits.
```

---

**HL-DS-13**: `@media print` Stylesheet für LetterReader, Vorgangs-Zusammenfassung und Bescheid-Detail-Views ist Pflicht (schwarz auf weiß, A4 portrait, Source Sans 3, tabular-nums, QR-Block + Verify-URL-Footer).

_Test_: Playwright-Test `tests/a11y/design-system-print.spec.ts` setzt `emulateMedia({ media: 'print' })`, navigiert zu Posteingang-LetterReader / Umzug-Vorgangs-Zusammenfassung / Bescheid-Detail, screenshot-diff vs. baseline (schwarz auf weiß), plus DOM-Assertion: `[data-print="hide"]` Elemente haben `display: none`, `.print-footer` ist sichtbar, `.print-qr` ist sichtbar.

---

**HL-DS-14**: Föderalismus-Disclaimer-Card (V1.2) und Sticky-Footer-Action (V1.5.1) sind domain-eigene Patterns und bleiben in Spec/Code erhalten.

_Test_: grep-keep
```bash
grep -rEn "FoederalismusCardDisclaimer" src/components/ | wc -l
# Must remain ≥ 1 (component file + at least one consumer).
grep -rEn "StickyFristAction" src/components/ | wc -l
# Must remain ≥ 1.
```
Plus Vitest-Snapshot-Tests `tests/unit/design-system-domain-patterns-keep.test.ts`, die jeweils ein verbatim-Render gegen einen V1.2/V1.5.1-Snapshot vergleichen.

---

## 3. Token-Tabellen (Layer 1: Primitives)

Alle Tokens leben in `src/app/globals.css` innerhalb von `@theme { … }` (Tailwind v4-Konvention) und CSS-Variablen-Blocks in `:root` (light) / `.dark`-Klasse-Block / `@media (prefers-color-scheme: dark)` (siehe § 9).

### 3.1 Typography

**Font-Stack** (Source Sans 3 via `next/font/google`, geladen in `src/app/layout.tsx`):

```css
/* Default + DE/EN/RU/UK/TR (Lateinisch + Kyrillisch) */
--font-sans: 'Source Sans 3', -apple-system, BlinkMacSystemFont,
             'Segoe UI', 'Roboto', 'Helvetica Neue', Arial, sans-serif;

/* AR-Locale (RTL): Source Sans 3 hat eingeschränkte arabische Glyphen */
[lang="ar"] {
  --font-sans: 'Source Sans 3', 'Noto Sans Arabic', 'Segoe UI',
               system-ui, -apple-system, sans-serif;
}
```

**Type-Scale** (GOV.UK 16/19/24/36/48 mit 5-px-Line-Heights — Werte verbatim aus Research § "Typography"):

> **Ratification 2026-05-14 (Drift 1)**: Alle Layer-1-Primitive-Tokens tragen den `--ds-*`-Prefix, um Kollision mit Tailwind-v4-Auto-Utility-Generation (`--color-*`, `--font-*`, `--spacing-*`) zu vermeiden. Tailwind v4 prunt `--ds-*` als unbenutzt, was intendiert ist — diese sind reine Primitives, nicht Tailwind-Utility-Sources.

| Token | Size (≥640 px) | Size (<640 px) | Line-height | Weight | Tailwind-Mapping |
|---|---|---|---|---|---|
| `--ds-text-display` | 48 px | 32 px | 50 / 35 px | 700 | `text-5xl` (override) |
| `--ds-text-h1` | 36 px | 27 px | 40 / 30 px | 700 | `text-4xl` (override) |
| `--ds-text-h2` | 24 px | 21 px | 30 / 25 px | 600 | `text-2xl` |
| `--ds-text-body-l` | 24 px | 21 px | 30 / 25 px | 400 | `text-xl` (lead body) |
| `--ds-text-body` | 19 px | 19 px | 25 / 25 px | 400 | `text-lg` |
| `--ds-text-body-s` | 16 px | 16 px | 20 / 20 px | 400 | `text-base` |
| `--ds-text-caption` | 14 px | 14 px | 18 / 18 px | 500 | `text-sm` — nur Labels, niemals Body |

Korrespondierende `--ds-line-*`-Tokens (line-height) folgen demselben Prefix-Schema (`--ds-line-display`, `--ds-line-h1`, …, `--ds-line-caption`) mit den Werten der "Line-height"-Spalte oben.

**Tabular-Nums-Pflicht** (HL-DS-6): Aktenzeichen, Frist-Daten, FE-Nr, Kfz-Kennzeichen, IBAN, AZR-IDs, Renten-Versicherungsnummer. Implementation als Utility-Klasse `.tabular { font-variant-numeric: tabular-nums; }` plus existierende Span-Komponenten (`AktenzeichenSpan` etc.) erhalten diese Klasse.

### 3.2 Spacing — Option A (additiv, kein Tailwind-Override)

Tailwind-4-pt-Default bleibt unangetastet. Bestehende `p-1`/`p-2`/`p-4`-Sites rendern weiterhin 4/8/16 px. GOV.UK-5-px-Vertikalrhythmus lebt **ausschließlich** in `--ds-line-*` CSS-Variablen plus einem additiven `--ds-space-fixed-N`-Layer für neue Komponenten:

```css
@theme {
  --ds-space-fixed-5: 5px;
  --ds-space-fixed-10: 10px;
  --ds-space-fixed-15: 15px;
  --ds-space-fixed-20: 20px;
  --ds-space-fixed-25: 25px;
  --ds-space-fixed-30: 30px;
  --ds-space-fixed-40: 40px;
  --ds-space-fixed-50: 50px;
  --ds-space-fixed-60: 60px;
}
```

Verwendung in neuen Komponenten via Tailwind v4 arbitrary value: `p-(--ds-space-fixed-15)` oder via Inline-`style`.

### 3.3 Color (OKLCH-Notation, Chroma ≤ 0.005 für Surface/Border)

Werte verbatim aus Research § "Color". Light + Dark sind 1:1 in OKLCH + Hex-Fallback (für `@supports`-Block, siehe § 3.6).

| Token | Light hex | Light OKLCH | Dark hex | Dark OKLCH | Verwendung |
|---|---|---|---|---|---|
| `--color-surface` | `#FFFFFF` | `oklch(100% 0 0)` | `#0F1115` | `oklch(15% 0.004 250)` | Page background |
| `--color-surface-raised` | `#FAFAF8` | `oklch(98% 0.002 80)` | `#161A20` | `oklch(20% 0.005 250)` | Card background (Warm-Tone Chroma 0.002) |
| `--color-surface-muted` | `#F2F1ED` | `oklch(95% 0.003 80)` | `#1C2128` | `oklch(24% 0.006 250)` | Section dividers |
| `--color-border` | `#DCDAD3` | `oklch(86% 0.004 80)` | `#2B2F38` | `oklch(32% 0.008 250)` | 1-px Hairlines |
| `--color-border-strong` | `#9F998D` | `oklch(65% 0.005 80)` | `#4A5060` | `oklch(45% 0.01 250)` | Focus rings, dividers |
| `--color-text-primary` | `#1A1D23` | `oklch(20% 0.005 250)` | `#ECEEF2` | `oklch(94% 0.004 250)` | Body text (≥ 14:1) |
| `--color-text-secondary` | `#4A5060` | `oklch(42% 0.012 250)` | `#B4BAC4` | `oklch(78% 0.008 250)` | Captions (≥ 7:1) |
| `--color-text-muted` | `#6B7280` | `oklch(55% 0.015 250)` | `#8A93A0` | `oklch(64% 0.012 250)` | Disabled — **HL-DS-7 floor**: light 5.63:1 / dark 5.53:1 |
| `--color-accent` | `#1A4D8F` | `oklch(40% 0.12 252)` | `#6FA8FF` | `oklch(72% 0.13 252)` | Trust-Blau (HL-DS-3 einziger Akzent) |
| `--color-accent-soft` | `#E8F0FA` | `oklch(95% 0.025 252)` | `#1F3A5C` | `oklch(32% 0.05 252)` | Hover/active background |
| `--color-warning` | `#946400` | `oklch(55% 0.13 80)` | `#E5B547` | `oklch(78% 0.13 80)` | Frist/Achtung |
| `--color-warning-soft` | `#FFF8E1` | `oklch(97% 0.04 90)` | `#3A2D0E` | `oklch(28% 0.05 80)` | Banner background — V1.3 `text-amber-950` bleibt kompatibel (HL-DS-7) |
| `--color-danger` | `#B3261E` | `oklch(48% 0.18 27)` | `#F2837C` | `oklch(72% 0.13 27)` | Fehler/abgelaufen |
| `--color-success` | `#2D6B3F` | `oklch(45% 0.12 152)` | `#6FCB8B` | `oklch(76% 0.11 152)` | Erfolg/sync_ok |
| `--color-info-soft` | `#E6EEF7` | `oklch(94% 0.018 245)` | `#1F2C3E` | `oklch(28% 0.04 245)` | Föderalismus-Disclaimer-Card (V1.2) |

### 3.4 Shadow (max 3 Tokens + None — HL-DS-2)

```css
@theme {
  --shadow-none: none;
  --shadow-card:    0 1px 2px 0 rgb(0 0 0 / 0.04),
                    0 1px 3px 0 rgb(0 0 0 / 0.06);
  --shadow-popover: 0 4px 8px -2px rgb(0 0 0 / 0.06),
                    0 8px 16px -4px rgb(0 0 0 / 0.08);
  --shadow-modal:   0 12px 24px -6px rgb(0 0 0 / 0.10),
                    0 20px 48px -12px rgb(0 0 0 / 0.14);
}
```

Default-Hierarchie ist **border-first**, Shadow nur wenn Layering erforderlich. Cards (Default) tragen Border + No-Shadow; nur Modals und Popover-Layer dürfen Shadow nutzen.

### 3.5 Border-Radius (6 Stufen + none)

```css
@theme {
  --radius-none: 0;
  --radius-xs: 2px;    /* Inline-Badges, Tags, NormZitatSpan */
  --radius-sm: 4px;    /* Input, Button, Checkbox */
  --radius-md: 8px;    /* Card, Popover */
  --radius-lg: 12px;   /* Modal, large Card */
  --radius-card: 14px; /* Wallet-Card, mDL — Apple-Pass-Referenz */
  --radius-full: 9999px;
}
```

**Migration-Hinweis**: shadcn-Default `--radius-sm` ist `calc(0.625rem * 0.6) = ~6 px`; wir senken auf 4 px. Visual-Mini-Shift in Button-Corners. Acceptance siehe § 13 OQ.

### 3.6 Motion (4 Easings + 5 Durations + globaler MotionConfig)

> **Ratification 2026-05-14 (Drift 2 + Drift 3)**:
> - Alle Motion-Tokens tragen `--ds-*`-Prefix (Drift 1, oben).
> - `--ds-ease-out-quart` ist auf **canonical Penner** `cubic-bezier(0.25, 1, 0.5, 1)` gesetzt (industry-standard motion.dev / Framer Motion / Stripe), nicht auf hand-tuned Werte.
> - `--ds-ease-standard` bleibt auf `cubic-bezier(0.65, 0, 0.35, 1)` — verifier-locked als **Autopilot-Handoff-Curve** (kein Overshoot). Impl ist konform.
> - Duration-Werte sind auf impl-Skala (`150/250/400/600/800 ms`) ratifiziert (geometrisch geordnet, nützlicher Range). `--ds-duration-print: 0 ms` wird in Phase 5e (Print-CSS) separat ergänzt; in Phase 5a/b/c nicht erforderlich.

```css
@theme {
  --ds-ease-out-quart:    cubic-bezier(0.25, 1, 0.5, 1);    /* canonical Penner ease-out-quart */
  --ds-ease-in-out-quart: cubic-bezier(0.76, 0, 0.24, 1);   /* canonical Penner ease-in-out-quart */
  --ds-ease-out-quint:    cubic-bezier(0.22, 1, 0.36, 1);   /* canonical Penner ease-out-quint */
  --ds-ease-standard:     cubic-bezier(0.65, 0, 0.35, 1);   /* Autopilot-Handoff-Curve (verifier-locked, kein Overshoot) */

  --ds-duration-fast:      150ms;
  --ds-duration-base:      250ms;
  --ds-duration-base-plus: 400ms;
  --ds-duration-slow:      600ms;
  --ds-duration-page:      800ms;
  /* --ds-duration-print: 0ms — wird in Phase 5e (Print) ergänzt, siehe § 10 + § 7 */
}
```

| Token | Curve + Duration | Verwendung |
|---|---|---|
| `--ds-ease-out-quart` @ `--ds-duration-base` (250 ms) | Enter (Modal open, Toast in, Bridge-Badge fade-in) |
| `--ds-ease-out-quart` @ `--ds-duration-fast` (150 ms) | Exit (Modal close, Toast out) |
| `--ds-ease-in-out-quart` @ `--ds-duration-base` (250 ms) | Layout-Shifts, AutopilotTimeline-Sync, Familienkasse-Cascade |
| `--ds-ease-standard` @ `--ds-duration-base-plus` (400 ms) | **Nur** AI-/Autopilot-Handoff-Moments (verifier-locked Curve). Kein Bounce, kein Spring. |

**Global wrap** (HL-DS-4) in `src/app/layout.tsx`:

```tsx
import { MotionConfig } from 'framer-motion';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <MotionConfig reducedMotion="user">
          {children}
        </MotionConfig>
      </body>
    </html>
  );
}
```

### 3.7 OKLCH-Browser-Fallback (PostCSS-Plugin)

```js
// postcss.config.mjs
export default {
  plugins: {
    '@tailwindcss/postcss': {},
    '@csstools/postcss-oklab-function': {
      preserve: true,
      subFeatures: { displayP3: false },
    },
  },
};
```

Plugin generiert `@supports not (color: oklch(0% 0 0))` Fallback-Block mit Hex-Werten zur Build-Zeit. Acceptance: manueller Smoke-Test in Edge 108 + Firefox 120 + Safari 16.

---

## 4. Token-Migration-Tabelle (Layer 2 → Layer 1)

Migration-Strategie für jeden Token: **additiv parallel** (neuer Token + Alias auf existierendem) / **rename-alias** (Wert gleich, Name neu) / **value-replace** (Wert ändert sich). Sites-Counts aus Research § "Token-Migration-Mapping".

| Neuer Token | Existierender Token | Sites | Strategie | Pflicht-Erhalt-Marker |
|---|---|---|---|---|
| `--color-surface` | `--background` | ~108 Files (`bg-background`) | additiv: alias `--background: var(--color-surface)` | — |
| `--color-surface-raised` | `--card` | ~80 Sites (`bg-card`) | additiv: alias `--card: var(--color-surface-raised)` | — |
| `--color-surface-muted` | `--muted` | ~50 Sites (`bg-muted`) | additiv: alias `--muted: var(--color-surface-muted)` | — |
| `--color-border` | `--border` | global (`* { @apply border-border }`) | rename-alias | — |
| `--color-border-strong` | **neu** | 0 | additiv neu | — |
| `--color-text-primary` | `--foreground` | global (`text-foreground`) | rename-alias | — |
| `--color-text-secondary` | **neu** | 0 | additiv neu | — |
| `--color-text-muted` | `--muted-foreground` | ~120 Sites | rename-alias | **V1.5.1 Härtung 5.63 light / 5.53 dark non-negotiable (HL-DS-7)** |
| `--color-accent` | `--primary` + `--color-brand-500/600/700` | shadcn-Primary + brand-Tokens | rename-alias | — |
| `--color-accent-soft` | **neu** | 0 | additiv neu | — |
| `--color-warning` | **neu** als Token | 5 Sites `text-amber-950` | additiv neu; `text-amber-950`-Sites bleiben | **V1.3 `text-amber-950` auf 5 Sites bleibt unverändert (HL-DS-7)** |
| `--color-warning-soft` | **neu** | 0 | additiv neu | Föderalismus-Banner kompatibel |
| `--color-danger` | `--destructive` | shadcn-destructive | rename-alias | — |
| `--color-success` | **neu** | 0 | additiv neu | — |
| `--color-info-soft` | **neu** | 0 | additiv neu | **V1.2 Föderalismus-Disclaimer-Pattern bleibt (HL-DS-14)** |
| `--shadow-card` | `--shadow-sm`/`--shadow-md` | ~50 Sites | additiv parallel; **kein flag-day** | — |
| `--shadow-popover` | `--shadow-lg` | ~30 Sites | additiv parallel | — |
| `--shadow-modal` | `--shadow-xl`/`--shadow-2xl` | ~10 Sites | additiv parallel | — |
| `--font-sans` | `--font-sans` (Inter) | 1 Stelle | value-replace: Inter → Source Sans 3 | — |
| `--radius-sm` (4 px) | `--radius-sm` (6 px) | shadcn-Default | value-replace; Visual-Mini-Shift | — |
| `--radius-md` (8 px) | `--radius-md` (8 px) | shadcn-Default | value-confirm (gleich) | — |
| `--radius-lg` (12 px) | `--radius-lg` (10 px) | shadcn-Default | value-replace; Visual-Mini-Shift | — |
| `--radius-card` (14 px) | **neu** | 0 | additiv neu | — |
| `--ds-ease-*` (4 Easings, canonical Penner) + `--ds-duration-*` (5 Durations: 150/250/400/600/800 ms; `print: 0 ms` in Phase 5e) | **neu** | 0 | additiv neu | `--ds-ease-standard` verifier-locked auf `cubic-bezier(0.65, 0, 0.35, 1)` für Autopilot-Handoff |
| `--ds-space-fixed-5..60` | **neu** | 0 | additiv neu; **NICHT** `--spacing-*`-Override | — |
| `--ds-line-display/h1/h2/body-l/body/body-s/caption` | **neu** | 0 | additiv neu | — |
| `--ds-text-display/h1/h2/body-l/body/body-s/caption` | **neu** | 0 | additiv neu; `--ds-*`-Prefix gegen Tailwind-v4-Auto-Utility-Kollision | — |

**Pflicht-Erhalt-Marker — die roten Linien des Migrations-Pass**:

1. **V1.5.1 `--muted-foreground` Härtung**: Kontrastwerte 5.63 light / 5.53 dark sind das **Floor**, nicht das Target. Wenn neuer OKLCH-Wert für `--color-text-muted` die Kontrastrechnung gegen `--color-surface` / `--color-surface-raised` knapper macht, wird er **abgelehnt**. (HL-DS-7)
2. **V1.3 `text-amber-950`**: 5 Sites in `FoederalismusCardDisclaimer.tsx`, `PflichtumtauschBanner.tsx`, `UmzugBridgeBadge.tsx` (× 2), plus 1 in Mobilität-Sektion. Diese Tailwind-Klassen bleiben verbatim — nicht durch `--color-warning` ersetzen. Tailwind-Amber-Skala ist von unseren OKLCH-Tokens unabhängig. (HL-DS-7)
3. **V1.2 Föderalismus-Disclaimer-Card-Pattern**: `FoederalismusCardDisclaimer.tsx` bleibt strukturell unverändert; nur Token-Werte (Background) wandern zu `--color-info-soft`. Pattern darf NICHT zu Tooltip / Hover-Hinweis „vereinfacht" werden. (HL-DS-14)
4. **V1.5.1 Sticky-Footer-Action**: `StickyFristAction.tsx` bleibt strukturell unverändert; fixed-bottom auf allen Breakpoints. Pattern darf NICHT zu Floating-Action-Button (FAB) „modernisiert" werden. (HL-DS-14)

---

## 5. Primitive Komponenten-Refactor (Layer 2)

Refactor-Scope für `src/components/ui/`. Pro Komponente: aktueller Stand → Ziel-Stand → Migration-Risiko → Test-Acceptance.

### 5.1 `Button` (`src/components/ui/button.tsx`)

**Aktueller Stand**: `cva`-Varianten (default/outline/secondary/ghost/destructive/link) + Sizes (xs/sm/default/lg/icon/icon-xs/icon-sm/icon-lg). Default-Size ist `h-8` (32 px) — bricht HL-DS-8 (44) und HL-DS-9 (48).

**Ziel-Stand**:
- `size="default"` → `min-h-[48px]` (HL-DS-9 für Form-Buttons)
- `size="sm"` → `min-h-[44px]` (HL-DS-8 Floor — kleinster akzeptierter Wert)
- `size="lg"` → `min-h-[56px]`
- `size="icon"` → `size-[44px]` (HL-DS-8)
- `size="icon-sm"` → `size-[44px]` (Floor kann nicht unterschritten werden)
- `size="xs"` / `size="icon-xs"` werden **entfernt** (verletzen HL-DS-8)
- Type-Scale: `text-base` (16 px) für `default`/`lg`, `text-sm` (14 px) **nur** für `sm` als Caption-Use
- `--radius-sm` (4 px) für default; `--radius-md` (8 px) für lg

**Migration-Risiko**: mittel — `size="xs"` ist in V1.3 PunkteEidReauthModal verwendet. Refactor muss Konsumenten zu `size="sm"` migrieren.

**Test-Acceptance**:
- HL-DS-8 / HL-DS-9 Playwright-Tests grün
- Vitest: rendering jeder Size, assert `clientHeight` ≥ 44 / 48
- Visual-Diff: alle 7 Button-Varianten × 2 Themes screenshot

### 5.2 `Card` (`src/components/ui/card.tsx`)

**Aktueller Stand**: `ring-1 ring-foreground/10` + kein expliziter Shadow + `rounded-xl` (= 14 px).

**Ziel-Stand**:
- Border-first: `border border-[--color-border]` statt `ring-1`
- Default-Shadow: `--shadow-none` (Linear-Restraint)
- Default-Radius: `--radius-md` (8 px) für Standard-Cards
- Variante `variant="wallet"`: `--radius-card` (14 px) + `--shadow-card`
- Variante `variant="elevated"`: explizit Opt-in, `--shadow-card`

**Migration-Risiko**: niedrig — Border-vs-Ring ist visuell ähnlich; Radius wandert von 14 → 8 px Default (Wallet bleibt 14). Visual-Diff erwartet, aber kein A11y-Bruch.

**Test-Acceptance**:
- Vitest: render mit / ohne Variante; assertet computed `border-width: 1px` (Default) und `box-shadow: none` (Default)
- Visual-Diff: Card-Default vs Card-Wallet × 2 Themes

### 5.3 `Input` (`src/components/ui/input.tsx`)

**Aktueller Stand**: `h-8` (32 px) — bricht HL-DS-9. `text-base md:text-sm` — bricht Type-Scale (Body = 16 px, kein Shrink).

**Ziel-Stand**:
- `min-h-[48px]` (HL-DS-9)
- `text-base` (16 px) ohne Mobile-Shrink (verhindert iOS-Auto-Zoom)
- Focus-Ring: `focus-visible:ring-3 focus-visible:ring-[--color-border-strong]/50` mit 2-px-Outline (HL-DS-7 UI-Komponenten ≥ 3:1)
- Padding: `px-3 py-2` (12 / 8 px für visuelle Konsistenz mit 48-px-Höhe)
- Border: `border-[--color-border]`, Hover: `border-[--color-border-strong]`

**Migration-Risiko**: mittel — alle Forms (Posteingang-Reply-Composer, Stammdaten-Edit-Modals, Onboarding) erben höhere Inputs. Layout-Shift in dichten Modals erwartet — siehe § 11.1.

**Test-Acceptance**:
- HL-DS-9 Playwright-Test grün
- Vitest: render assert `clientHeight ≥ 48`
- iOS-Safari-Smoke: `text-base` (16 px) verhindert Auto-Zoom

### 5.4 `Badge` (NEW — `src/components/ui/badge.tsx`)

**Aktueller Stand**: existiert noch nicht als eigene Primitive; `BehoerdenBadge` ist domain-spezifisch unter `src/components/shared/`.

**Ziel-Stand**: Neue UI-Primitive mit Varianten:
- `variant="outline"` (Default): `border border-[--color-border]`, `bg-transparent`, `text-[--color-text-secondary]`
- `variant="info-soft"`: `bg-[--color-info-soft]`, `text-[--color-accent]` (Föderalismus, V1.2-Pattern)
- `variant="warning-soft"`: `bg-[--color-warning-soft]`, **text-amber-950** (HL-DS-7 — V1.3-Kompatibel)
- **Niemals** Behörden-Kategorie-Color-Variants (HL-DS-10)
- Radius: `--radius-xs` (2 px) für Inline-Use, `--radius-full` für Pill-Use

**Migration-Risiko**: niedrig — neue Primitive ersetzt nichts existierendes. `BehoerdenBadge` konsumiert die neue Badge mit `variant="outline"`.

**Test-Acceptance**:
- HL-DS-10 Vitest: `BehoerdenBadge` mit `kategorie='bund'|'land'|'kommune'` rendert identische computed background/border/text-color
- Visual-Diff: 3 Varianten × 2 Themes

### 5.5 `Dialog` (`src/components/ui/dialog.tsx`)

**Aktueller Stand**: Base-UI-Dialog mit `bg-popover ring-1 ring-foreground/10`, `rounded-xl`, animated `data-open:zoom-in-95`.

**Ziel-Stand**:
- Border-first: `border border-[--color-border]` statt Ring
- Radius: `--radius-lg` (12 px)
- Shadow: `--shadow-modal`
- Animation: Open via `--ds-ease-out-quart` @ `--ds-duration-base` (250 ms), Close via `--ds-ease-out-quart` @ `--ds-duration-fast` (150 ms)
- **Zoom-Effekt entfernen** (`zoom-in-95` → reine Opacity-Crossfade), Trust-Anker (kein Spring/Pop)
- Mobile-Sheet-Variant via separater `<Sheet>`-Primitive (siehe 5.6)
- Focus-Trap bleibt (Base-UI nativ)
- `useStripBaseUiFocusGuardAriaHidden`-Hook bleibt (V1.5.1-Lesson)

**Migration-Risiko**: mittel — Zoom-Animation in V1.3 PunkteEidReauthModal optisch sichtbar; Refactor zu Crossfade ist visueller Bruch aber a11y-Verbesserung (axe-Sampling-Issue aus V1.3-Audit).

**Test-Acceptance**:
- HL-DS-4 Playwright reduced-motion-Test
- Vitest: render Modal, assert `animationDuration ≤ 200ms`

### 5.6 `Sheet` (NEW — `src/components/ui/sheet.tsx`)

**Aktueller Stand**: `sheet.tsx` existiert bereits (shadcn). Refactor analog zu Dialog 5.5.

**Ziel-Stand**:
- Mobile-Sheet-Variant für Dialogs auf <640 px: slide-up from bottom, `--ds-ease-out-quart` @ `--ds-duration-base` (250 ms)
- Border-first, `--shadow-modal`
- Radius: oberer Edge `--radius-lg`, unten `0`
- Drag-handle (4 px × 40 px) auf top-center

**Test-Acceptance**: Playwright in mobile-viewport rendert Sheet statt Dialog, Drag-handle sichtbar.

### 5.7 `Table` (NEW domain-shared — `src/components/shared/BescheidTable.tsx`)

**Aktueller Stand**: keine wiederverwendbare Tabelle; ad-hoc `<table>` in V1.x.

**Ziel-Stand** (Werte aus Research § "Tabellen-Pattern für Bescheide"):

```css
@theme {
  --table-row-height: 40px;
  --table-row-padding-y: 8px;
  --table-row-padding-x: 12px;
  --table-summary-border-top: 2px solid var(--color-border-strong);
  --table-summary-font-weight: 600;
}
```

- Row-height ≥ 40 px
- Numerik-Spalten **immer** right-aligned + `tabular-nums` (HL-DS-6)
- **KEIN Zebra** (Print-Kompatibilität)
- Summenzeile: `font-weight: 600` + Top-Border 2 px
- Header-Cells: `font-weight: 500`, `text-[--color-text-secondary]`

**Migration-Risiko**: niedrig — neue Komponente.

**Test-Acceptance**:
- Print-Snapshot zeigt Tabelle ohne Zebra
- Vitest: numerische Spalte hat `text-align: right` + `font-variant-numeric: tabular-nums`

### 5.8 `StickyFooterAction` — Domain-Pattern-Beibehalt (V1.5.1)

**Aktueller Stand**: `src/components/posteingang/StickyFristAction.tsx` — fixed-bottom, Surface-raised, Top-Border, Frist-Countdown links + Primary-Button rechts.

**Ziel-Stand**: Token-Migration only — Background → `--color-surface-raised`, Border → `--color-border`, Shadow → `--shadow-card` (Top-only via `box-shadow: 0 -1px 2px 0 rgb(0 0 0 / 0.04)`). **Struktur unverändert** (HL-DS-14).

**Test-Acceptance**: HL-DS-14 grep-keep Test grün + Vitest-Snapshot.

### 5.9 `FoederalismusDisclaimerCard` — Domain-Pattern-Beibehalt (V1.2)

**Aktueller Stand**: `src/components/stammdaten/FoederalismusCardDisclaimer.tsx` — blaue Info-Soft-Card mit Lucide-`Info`-Icon.

**Ziel-Stand**: Token-Migration only — Background → `--color-info-soft`, Text → `--color-text-secondary`, Icon-Color → `--color-accent`. **Struktur unverändert** (HL-DS-14).

**Test-Acceptance**: HL-DS-14 grep-keep + Vitest-Snapshot.

---

## 6. Wow-Patterns (3 specced)

### 6.1 Pattern A: Autopilot-Handoff-Transition

**Wo eingesetzt**: `src/components/autopilot/AutopilotTimeline.tsx` — Übergang zwischen Block A → Block B (Stammdaten-Sync), Block B → Block C, etc.

**Selector / Komponente**: `<AutopilotStepCard data-state="handoff">`

**CSS-Code-Snippet**:
```css
.autopilot-step-card {
  transition:
    opacity var(--ds-duration-base-plus) var(--ds-ease-standard),
    border-color var(--ds-duration-base-plus) var(--ds-ease-standard);
}
.autopilot-step-card[data-state="handoff-from"] {
  opacity: 0.6;
}
.autopilot-step-card[data-state="handoff-to"] {
  opacity: 1;
  border-color: var(--color-accent);
}
```

**Mechanik (verbatim aus Research § "Pattern 1")**:
- 0–120 ms: aktuelle Step-Card fade auf Opacity 0.6 (KEINE Scale-Reduktion)
- 120–300 ms: 1-px Border-Highlight in `--color-accent` wandert von Step N zu Step N+1
- 300–400 ms: Step N+1 Opacity 1.0
- Total: 400 ms mit `cubic-bezier(0.65, 0, 0.35, 1)` (`--ds-ease-standard`, verifier-locked, kein Overshoot)

**Reduced-motion-Fallback** (HL-DS-4):
```css
@media (prefers-reduced-motion: reduce) {
  .autopilot-step-card {
    transition: opacity var(--ds-duration-fast) var(--ds-ease-out-quart);
  }
  /* Kein Border-Travel, nur Opacity-Crossfade ≤ 200 ms (150 ms fast) */
}
```

**Trust-Test-Statement** (für Loom + Pitch): „Die Animation hat keinen Spring/Bounce/Scale-Pop. Sie ist eine 400-ms Opacity-Crossfade plus ein 1-px-Linien-Travel mit ease-in-out-quart — dieselbe Curve, die Material Design 3 für 'standard easing' verwendet."

---

### 6.2 Pattern B: Yellow-Letter-Outline-Highlight

**Wo eingesetzt**: `src/components/stammdaten/YellowLetterEchoCard.tsx` — wenn ein gelber Brief in Stammdaten „ankommt" und ein Feld populates (V1.1 Pflegegrad, V1.2 Familienkasse).

**Selector / Komponente**: `<div data-yellow-highlight="active">`

**CSS-Code-Snippet** (verbatim aus Research § "Pattern 2"):
```tsx
const [highlighted, setHighlighted] = useState(true);

useEffect(() => {
  const timer = setTimeout(() => setHighlighted(false), 1000);
  return () => clearTimeout(timer);
}, []);

return (
  <div
    style={{
      outline: highlighted ? '2px solid var(--color-warning)' : '2px solid transparent',
      outlineOffset: '2px',
      borderRadius: 'var(--radius-md)',
      transition: 'outline-color var(--ds-duration-base-plus) var(--ds-ease-out-quart)',
    }}
  >
    {/* field content */}
  </div>
);
```

**Mechanik**:
- 0–1000 ms: Outline statisch sichtbar in `--color-warning` (2 px)
- 1000–1400 ms: Outline-Color fadet zu `transparent`
- **Kein Pulse, kein Loop, kein Repeat** (HL-DS-11)

**Reduced-motion-Fallback**:
- Outline bleibt 1 s, verschwindet dann instant (kein Color-Fade)
- Aria-live `role="status"` announcement bleibt unverändert: „Pflegegrad-Feld aus Brief XY aktualisiert"

**Trust-Test-Statement**: „Das Highlight ist statisch 1 Sekunde sichtbar wie ein Print-Highlight-Marker — keine Bewegung, kein Loop. Es lokalisiert, wo neue Information eingetroffen ist, dann verschwindet es."

---

### 6.3 Pattern C: Wallet-Reveal-Crossfade

**Wo eingesetzt**: `src/components/shared/MaskedField.tsx`, `src/components/stammdaten/wallet/WalletMdlCard.tsx` — alle Reveal-on-Demand Sensible-Felder (FE-Nr, AZR-ID, Renten-Vers-Nr, FIN).

**Selector / Komponente**: `<MaskedField data-revealed="true|false">`

**CSS-Code-Snippet**:
```css
.masked-field-char {
  transition: opacity var(--ds-duration-base) var(--ds-ease-out-quart);
  opacity: 1;
}
.masked-field[data-revealed="false"] .masked-field-char[data-mask="true"] {
  opacity: 0;
}
.masked-field-char-mask {
  transition: opacity var(--ds-duration-base) var(--ds-ease-out-quart);
}
```

**Mechanik (verbatim aus Research § "Pattern 3", Iteration 2 mit Theme-Klausel)**:
- Default: Feld zeigt `••• ••• 247` (letzte 3 Zeichen sichtbar)
- „Anzeigen"-Button (HL-DS-8 ≥ 44 px) löst Reveal aus
- Reveal: 250 ms ease-out, jeder Maskenpunkt cross-fadet zu echtem Zeichen (right-to-left, staggered 20 ms)
- Auto-Re-Mask nach 30 s (UI-Timeout) oder Tab-Blur (whichever first)
- Aria-live announcement: „FE-Nummer angezeigt — auto-verbergen in 30 Sekunden"
- **HL-DS-12**: Wallet-Card folgt strikt Page-Theme (kein `bg-zinc-900`-Sonderlocke)

**Reduced-motion-Fallback**:
- Reveal instant (kein Stagger), Re-Mask instant
- Aria-Announcement bleibt

**Trust-Test-Statement**: „Datenschutz-by-Design ist Pflicht. Sensible Felder sind in EUDI-Wallet-Logik 'attestation-data-on-request'. Das Reveal-on-Demand-Pattern macht die Datenschutz-Entscheidung sichtbar und re-mask-bar — wie ein Bankschalter-Schiebeschalter."

---

## 7. Print-Stylesheet (HL-DS-13)

**Datei**: `src/app/globals.css`, eigener `@media print { … }`-Block (verbatim aus Research § "Print-Stylesheet").

```css
@media print {
  :root {
    --color-surface: #ffffff;
    --color-surface-raised: #ffffff;
    --color-surface-muted: #ffffff;
    --color-text-primary: #000000;
    --color-text-secondary: #000000;
    --color-text-muted: #444444;
    --color-border: #000000;
    --color-border-strong: #000000;
    --color-accent: #000000;
    --color-accent-soft: #ffffff;
    --color-warning: #000000;
    --color-warning-soft: #ffffff;
    --color-danger: #000000;
    --color-success: #000000;
    --color-info-soft: #ffffff;
    --shadow-card: none;
    --shadow-popover: none;
    --shadow-modal: none;
  }

  @page { size: A4 portrait; margin: 20mm 18mm 22mm 18mm; }

  html {
    font-family: 'Source Sans 3', 'Times New Roman', serif;
    font-size: 11pt;
    line-height: 1.4;
    color: #000;
    background: #fff;
  }

  .tabular, [data-tabular], th, td {
    font-variant-numeric: tabular-nums;
  }

  nav, aside, [role="navigation"],
  .sidebar, .topbar, .footer-nav,
  [data-print="hide"],
  button:not([data-print="show"]),
  .sticky-frist-action,
  [data-popover], [data-modal] {
    display: none !important;
  }
  [data-print="show"] { display: block !important; }

  .letter-card, .bescheid-section, .vorgang-step {
    page-break-inside: avoid;
    break-inside: avoid;
  }
  h1, h2, h3 { page-break-after: avoid; break-after: avoid; }

  .print-footer {
    position: fixed; bottom: 10mm; left: 18mm; right: 18mm;
    border-top: 1pt solid #000;
    padding-top: 4mm; font-size: 9pt; color: #000;
  }
  .print-qr { display: block; width: 22mm; height: 22mm; }

  a[href]::after {
    content: " (" attr(href) ")";
    font-size: 9pt; color: #444;
  }
  a[href^="#"]::after, a[href^="javascript:"]::after { content: ""; }
}
```

**Routen, die Print-Test brauchen** (HL-DS-13 Acceptance):
- `/posteingang/[letterId]` — LetterReader-Detail
- `/vorgaenge/umzug/[vorgangId]/zusammenfassung` — Umzug-Run-Report
- `/posteingang/[letterId]/bescheid` — Steuer/Renten/Pflege/Kfz-Steuer-Bescheid-Detail
- (Optional) `/stammdaten/wallet/mdl/preview` — mDL-Attestation-Backup-Print

---

## 8. Hochkontrast-Modus (BITV 2.0 § 1.4.6 AAA)

**Strategie**: `prefers-contrast: more` Token-Layer-Block in `src/app/globals.css`. **Kein UI-Toggle in V1** — wer Hochkontrast will, setzt es im OS.

**Ziel-Kontraste**:
- Text auf Surface: ≥ 7:1 (WCAG 1.4.6 AAA)
- UI-Komponenten (Border, Focus-Ring): ≥ 4.5:1 (statt 3:1)
- Disabled/Placeholder: ≥ 4.5:1

**CSS-Block** (verbatim aus Research § "BITV 2.0 Hochkontrast"):

```css
@media (prefers-contrast: more) {
  :root {
    --color-text-primary: oklch(0% 0 0);
    --color-text-secondary: oklch(15% 0 0);
    --color-text-muted: oklch(30% 0 0);
    --color-border: oklch(40% 0 0);
    --color-border-strong: oklch(20% 0 0);
    --color-accent: oklch(28% 0.18 252);
    --color-warning: oklch(30% 0.15 80);
    --color-danger: oklch(30% 0.2 27);
    --color-success: oklch(30% 0.13 152);
  }

  @media (prefers-color-scheme: dark) {
    :root {
      --color-text-primary: oklch(100% 0 0);
      --color-text-secondary: oklch(92% 0 0);
      --color-text-muted: oklch(80% 0 0);
      --color-border: oklch(70% 0 0);
      --color-border-strong: oklch(85% 0 0);
      --color-accent: oklch(85% 0.13 252);
    }
  }

  *:focus-visible {
    outline-width: 3px !important;
    outline-offset: 3px !important;
  }
}
```

**Acceptance**: a11y-tester via Playwright `emulateMedia({ forcedColors: 'none' })` plus manueller Edge „Use High Contrast"-Mode-Smoke. axe muss 0/0/0/0 reporten. Screenshot-Diff vs. baseline (siehe § 12).

---

## 9. Dark Mode (V1: prefers-color-scheme aktiv, kein UI-Toggle)

**Strategie** (Option B aus Research § "Dark Mode — Entscheidung Option B"):
- `prefers-color-scheme: dark` wird ab Tag 1 aktiv geehrt
- Kein UI-Toggle in V1
- Kein `<html data-theme="light">`-Hardcode
- Existierender `.dark`-Class-Selector (shadcn) bleibt als Override-Pfad für Storybook / Tests

**Block in `src/app/globals.css`**:

```css
:root {
  color-scheme: light dark;
  /* Light tokens as default (verbatim aus § 3.3) */
  --color-surface: oklch(100% 0 0);
  /* … */
}

@media (prefers-color-scheme: dark) {
  :root {
    --color-surface: oklch(15% 0.004 250);
    --color-text-primary: oklch(94% 0.004 250);
    /* … verbatim aus § 3.3 Dark-Spalte */
  }
}

.dark {
  /* Same as @media block — explicit override for testing */
  --color-surface: oklch(15% 0.004 250);
  /* … */
}
```

### 9.1 Acceptance-Matrix (Persona × Route × Mode)

Vor Token-Migration-Merge: **alle V1.0–V1.3-Routen × beide Modi axe-PASS**.

| Persona | Route | Light | Dark |
|---|---|---|---|
| Anna Petrov | `/dashboard` | axe 0/0/0/0 | axe 0/0/0/0 |
| Anna Petrov | `/posteingang` | axe 0/0/0/0 | axe 0/0/0/0 |
| Anna Petrov | `/posteingang/[letterId]` | axe 0/0/0/0 | axe 0/0/0/0 |
| Anna Petrov | `/stammdaten` | axe 0/0/0/0 | axe 0/0/0/0 |
| Anna Petrov | `/vorgaenge/umzug` | axe 0/0/0/0 | axe 0/0/0/0 |
| Markus Schmidt | `/posteingang` | axe 0/0/0/0 | axe 0/0/0/0 |
| Markus Schmidt | `/stammdaten` | axe 0/0/0/0 | axe 0/0/0/0 |
| Markus Schmidt | `/vorgaenge/umzug` | axe 0/0/0/0 | axe 0/0/0/0 |
| Mehmet Yıldız | `/posteingang` | axe 0/0/0/0 | axe 0/0/0/0 |
| Mehmet Yıldız | `/stammdaten` | axe 0/0/0/0 | axe 0/0/0/0 |
| Mehmet Yıldız | `/vorgaenge/umzug` | axe 0/0/0/0 | axe 0/0/0/0 |

→ 33 axe-runs total (3 Personas × 11 Routes); Dark verdoppelt auf 66. Playwright nutzt `page.emulateMedia({ colorScheme: 'dark' })` für Dark-Runs.

**Akzeptierte Trade-offs**:
- Doppel-axe-Audit-Last (66 statt 33 Runs) — investment in 2026-Baseline
- Dark-Token-Kontraste 1:1 gegen V1.5.1 5.63/5.53 messen (HL-DS-7)

---

## 10. Migration-Phasen (5-stufig, jede axe-gated)

Jede Phase ist ein eigenständiger PR; jede Phase muss vor Merge die axe-/HL-Tests aus § 12 passieren. Rollback-Strategie ist „revert PR" — additive Token-Strategie garantiert, dass kein Revert bricht.

### Phase 5a: Tokens + Font (1 working day)

**Deliverables**:
- `next/font/google` Source Sans 3 in `src/app/layout.tsx`
- Type-Scale-CSS-Vars (`--ds-text-*`, `--ds-line-*`) in `globals.css` `@theme`
- `MotionConfig reducedMotion="user"` global wrap (HL-DS-4)
- `.tabular { font-variant-numeric: tabular-nums; }` Utility-Klasse
- `--ds-space-fixed-N`-Tokens (parallel, nicht override)
- `--ds-ease-*` (4 Easings, canonical Penner) + `--ds-duration-*` (5 Durations: 150/250/400/600/800 ms) in `@theme`

**Test-Gates**:
- Lighthouse a11y ≥ 95 auf 11 V1-Routes × 3 Personas
- HL-DS-1 grep-deny PASS
- HL-DS-4 MotionConfig-presence-grep PASS
- HL-DS-6 Vitest tabular-nums PASS für 7 Span-Komponenten

**Rollback**: Revert PR; alte Inter-Font und shadcn-Defaults restoren sich.

---

### Phase 5b: Color (2 working days)

**Deliverables**:
- Neue OKLCH-Tokens parallel zu shadcn-defaults in `globals.css :root` + Dark-Mode-Block
- Aliases: `--background: var(--color-surface)`, `--card: var(--color-surface-raised)`, etc.
- `--color-text-muted` migration mit 5.63/5.53-Kontrast-Re-Audit (HL-DS-7)
- `prefers-color-scheme: dark` Block (§ 9)
- `@csstools/postcss-oklab-function` in `postcss.config.mjs`

**Canary**: `src/components/posteingang/LetterCard.tsx` opt-in (1 Komponente konsumiert neue Token via `bg-[--color-surface-raised]`-Inline-Class). Visual-Approval von Product Owner / Stakeholder vor Roll-out auf andere Komponenten.

**Test-Gates**:
- HL-DS-3 Color-Family-Cap Vitest PASS
- HL-DS-7 Contrast-Floor Vitest PASS (5.63 / 5.53)
- HL-DS-7 grep-keep `text-amber-950` count ≥ 5 PASS
- HL-DS-10 BehoerdenBadge Vitest PASS
- Dark-Mode-Acceptance-Matrix § 9.1 (66 axe-Runs) PASS
- OKLCH-Fallback Smoke: Edge 108 + Firefox 120 + Safari 16 manuell

**Rollback**: Revert PR; Tailwind-defaults restoren sich. Canary-LetterCard fällt zurück.

---

### Phase 5c: Shadow (1 working day)

**Deliverables**:
- 3 Shadow-Tokens (`--shadow-card/popover/modal`) in `globals.css`
- 6 shadcn-Tokens (`--shadow-sm/md/lg/xl/2xl/inner`) bleiben als Aliases auf neue (`--shadow-sm → --shadow-card`, `--shadow-xl → --shadow-modal`); **kein** flag-day-Cutover
- HL-DS-2 grep-deny CI-Check on new components (existing V1 Sites whitelisted bis V2.x)
- **Cleanup (Ratification 2026-05-14)**: Phase 5a hat zwei separate `html { … }`-Blöcke in `src/app/globals.css` hinterlassen (Zeile ~86 `@apply font-sans` + Zeile ~92 explicit `font-family`-Stack). Phase 5c squasht diese in einen einzigen Block (entweder beide via `@apply` + custom-property-override, oder Drop `@apply font-sans` zugunsten des expliziten Stacks). Kein A11y-Impact, reiner Code-Cleanup.

**Test-Gates**:
- HL-DS-2 Vitest Shadow-Token-Count ≤ 4 PASS (`--shadow-none` + 3)
- HL-DS-2 grep-deny on `src/components/ui/` + new components PASS
- Diff-test pro refactored Primitive: visual screenshot diff
- Custom-shadow-values (`box-shadow: 0 1px …` inline in components) = Code-Review-Block

**Rollback**: Revert PR; Tailwind-Default-Shadows ersetzen wieder die Aliases.

---

### Phase 5d: Wow-Patterns (2 working days)

**Deliverables in dieser Reihenfolge** (niedrigstes Risiko zuerst):
1. **Wallet-Reveal-Crossfade** (§ 6.3) in `MaskedField.tsx` + `WalletMdlCard.tsx`
2. **Autopilot-Handoff-Transition** (§ 6.1) in `AutopilotTimeline.tsx`
3. **Yellow-Letter-Outline-Highlight** (§ 6.2) in `YellowLetterEchoCard.tsx`

**Test-Gates**:
- HL-DS-4 reduced-motion Playwright-Tests PASS (alle 3 Patterns)
- HL-DS-11 grep-deny `animate-pulse` in Yellow-Letter-Files PASS
- HL-DS-12 grep-deny `data-force-theme` in Wallet-Files PASS
- Visual-Diff: 3 Patterns × 2 Themes screenshot vs baseline
- 3 Trust-Test-Statements (§ 6.1/6.2/6.3) als Comment-Header in Component-Files

**Rollback**: Revert PR; V1.x-Animationen (V1.3 fade-in, V1.1 Pflegegrad-reveal) bleiben unverändert weil sie nicht migriert werden.

---

### Phase 5e: Print + Hochkontrast (1 working day)

**Deliverables**:
- `@media print { … }` Block in `globals.css` (§ 7)
- `@media (prefers-contrast: more) { … }` Block (§ 8)
- `<PrintFooter />` Component für die 3 Print-Routes (LetterReader, Umzug-Zusammenfassung, Bescheid-Detail) mit QR + Verify-URL
- `data-print="hide"` / `data-print="show"` Attribute auf Layout-Shell-Elemente
- **`--ds-duration-print: 0ms`** Token-Ergänzung (Ratification 2026-05-14) — innerhalb `@media print { :root { … } }` als Override, damit alle Transition-References auf 0 ms kollabieren und Print-Output keine Animation-Reste zeigt

**Test-Gates**:
- HL-DS-13 Print Playwright-Test PASS (3 Routes)
- Hochkontrast Playwright-Test PASS (forced-contrast emulation)
- axe forced-contrast 0/0/0/0

**Rollback**: Revert PR; Print/Hochkontrast-Default-Browser-Rendering kommt zurück (degradiert aber funktional).

---

## 11. Per-Screen Redesign-Briefs

Drei parallele frontend-coder-Tasks. Jeder Brief listet Audit-Top-5-Probleme, Files, Tokens/Patterns, Hard-Lines die NICHT gebrochen werden dürfen, Acceptance.

> **Hinweis zu Audit-Reports**: Der Posteingang-Audit liegt vor (`docs/research/2026-05-09-posteingang-ux-critique.md`). Die zwei anderen UX-Audits (Layout-Shell + Onboarding + Vorgänge / Stammdaten V1.3) sind noch nicht commit. Diese Spec referenziert deren erwartete Top-5 inline auf Basis der bekannten V1.x Followups (CLAUDE.md `Status`-Sektion); konkrete Audit-Befunde werden vor Phase-5a-Coder-Start ergänzt. OQ-1 in § 13.

---

### 11.1 Layout-Shell + Onboarding + Vorgänge-Wizard

**Top-5-Probleme** (aus CLAUDE.md V1-Followup-Tracking + Design-Direction-Brief, Audit noch nicht commit):
1. **Sidebar-Topbar-Density**: aktuelle Layout-Shell (App-Router-Default) bietet keine konsolidierte Navigation; Vorgänge-Wizard hat keinen einheitlichen Step-Header-Pattern.
2. **Onboarding-Authentizität-Bruch**: Mock-DeutschlandID-Login zeigt unrealistische Loading-States, kein Authentication-Trust-Indicator.
3. **Vorgangs-Wizard-Step-Indicator** ist heterogen (V1 Umzug verwendet eigenen Tracker, andere Vorgänge sind noch nicht specced).
4. **Globale Skip-Link** + Focus-Order auf Layout-Shell-Ebene fehlen / unklar (BITV 2.5.3).
5. **Topbar-Sprachenwechsler** (5 + DE) hat keine konsistente Position / Touch-Target-Konformität.

**Files / Komponenten anzufassen**:
- `src/app/layout.tsx` (RootLayout — MotionConfig wrap, Source-Sans-3-Loader, color-scheme-meta)
- `src/app/(app)/layout.tsx` (App-Shell)
- `src/components/layout/Sidebar.tsx`, `Topbar.tsx`, `Footer.tsx`, `LanguageSwitcher.tsx`
- `src/components/layout/SkipLink.tsx` (NEW)
- `src/components/vorgaenge/VorgangWizardStepHeader.tsx` (NEW konsolidiert)
- `src/components/vorgaenge/ProgressTracker.tsx` (V1 Umzug — refactor zur shared component)
- `src/app/(auth)/onboarding/page.tsx` + Children
- `src/components/onboarding/DeutschlandIDLoginMock.tsx`

**Tokens / Patterns anzuwenden**:
- § 3.1 Type-Scale (h1 36 / h2 24 / body 19 / caption 14)
- § 3.3 Color (Topbar = `--color-surface-raised` + `--color-border` bottom; Sidebar = `--color-surface`)
- § 3.4 Shadow: Topbar nutzt **keinen** Shadow (Border-first)
- § 5.1 Button (Touch-Target 44/48)
- § 5.7 BescheidTable (für Vorgangs-Summary-Tabellen)
- § 5.8 StickyFooterAction (Vorgangs-Wizard primary CTA — bleibt unverändert in Struktur)
- § 6.1 Autopilot-Handoff-Transition (Vorgangs-Wizard Schritt-Übergänge)
- § 7 Print-CSS für `/vorgaenge/*/zusammenfassung`

**Hard-Lines die NICHT gebrochen werden dürfen**:
- HL-DS-1 (BundesSans-Verbot) — gilt auch für Onboarding-Disclaimer-Text
- HL-DS-3 (1 Akzent + 3 Status) — Vorgangs-Wizard-States dürfen keine zusätzliche Brand-Farbe
- HL-DS-4 (reduced-motion) — Step-Transitions
- HL-DS-8 / HL-DS-9 (44 / 48 px) — Sidebar-Items, Sprache-Switcher
- HL-DS-14 (Sticky-Footer-Action / Föderalismus-Disclaimer bleiben)
- V1.0 Umzug ARF v2.0 disclaimer-meta wording unverändert (CLAUDE.md V1)
- V1.0 Umzug-Block-D Wording „§ 15 FZV / Pre-Fill" bleibt (V1.3 VL-14 / HL-MOB-13)
- V1.5.1 Cross-Template-Versand-Pfad in Posteingang-Reply-Composer (wird in Layout-Shell nicht angefasst, aber Sticky-Footer bleibt)

**Acceptance-Criteria**:
- Playwright: 3 Personas × `/`, `/onboarding`, `/dashboard`, `/vorgaenge/umzug/*` (alle 5 Wizard-Schritte) — axe 0/0/0/0 in Light + Dark
- Lighthouse a11y ≥ 95 auf Onboarding-Landing + Dashboard + Vorgangs-Wizard
- Visual-Diff: Topbar / Sidebar / Footer screenshots
- Vitest: HL-DS-8/9 Touch-Target / Input-Height Tests in Wizard
- Manual: Skip-Link via Tab funktional auf jeder App-Route

---

### 11.2 Posteingang (V1.0 + V1.5 + V1.5.1)

**Top-5-Probleme** (aus `docs/research/2026-05-09-posteingang-ux-critique.md` und CLAUDE.md V1.5.1 Followups):
1. **LetterCard hat 6 Icons sichtbar** (Behörde, Frist, Status, Auth-Badge, Aktion, Sprache) — Linear-Critique Issue 1: zu hohe Icon-Dichte.
2. **Filter-Popover-Trigger** ist visuell-isoliert vom Filter-Status (Active-Filter-Pills oben fehlen).
3. **AI-Summary-Card-Hierarchy**: Summary konkurriert mit Original-Letter um Aufmerksamkeit (Linear-Critique „don't compete for attention you haven't earned").
4. **Reply-Composer-Modal-Density**: 4 Templates + Freitext + Cross-Template-Versand-Pfad in einem dichten Modal — Input-Höhen unter 48 px brechen HL-DS-9.
5. **Rechtsbehelf-Skelette-Modals** (V1.5.1) haben dichte Form-Stacks; `--muted-foreground`-Härtung muss bei Token-Migration erhalten bleiben.

**Files / Komponenten anzufassen**:
- `src/app/(app)/posteingang/page.tsx` + `[letterId]/page.tsx`
- `src/components/posteingang/LetterCard.tsx` (Icon-Reduktion auf 2–3, Rest in Detail)
- `src/components/posteingang/LetterReader.tsx` (Print-Target — HL-DS-13)
- `src/components/posteingang/AISummaryCard.tsx`
- `src/components/posteingang/ReplyComposerModal.tsx` (Input-Höhen + Sticky-Footer-Action)
- `src/components/posteingang/StickyFristAction.tsx` (Token-Migration only, Struktur bleibt — HL-DS-14)
- `src/components/posteingang/EinspruchSkelett.tsx`, `WiderspruchSkelett.tsx`, `AussetzungVollziehungSkelett.tsx` (V1.5.1)
- `src/components/posteingang/FilterPopover.tsx` + neuer `ActiveFilterPills.tsx` (NEW)
- `src/components/posteingang/CrossTemplateVersandPath.tsx` (V1.5.1 — Struktur bleibt unverändert)

**Tokens / Patterns anzuwenden**:
- § 3.1 Type-Scale + Tabular-Nums Pflicht für Aktenzeichen (HL-DS-6)
- § 3.3 Color: AI-Summary-Card nutzt `--color-info-soft`; Original-Letter nutzt `--color-surface-raised`
- § 3.4 Shadow: LetterCard ist Border-first, kein Shadow
- § 5.1 Button (Reply-Templates Buttons 48 px Höhe)
- § 5.3 Input (Reply-Composer Textarea ≥ 48 px)
- § 5.5 Dialog (Cross-Template-Versand-Modal — Zoom-Effekt raus)
- § 5.6 Sheet (Mobile Reply-Composer)
- § 5.8 StickyFooterAction (StickyFristAction Token-Migration)
- § 7 Print-CSS auf LetterReader (HL-DS-13)

**Hard-Lines die NICHT gebrochen werden dürfen**:
- **V1.5/V1.5.1 Cross-Template-Versand-Pfad** („Beide als getrennte Briefe versenden" + ReplyConfirmationView multi-reply stack + StickyFristAction dual-template hint) bleibt strukturell verbatim — Token-Migration nur
- **V1.5.1 `--muted-foreground` Härtung** 5.63 light / 5.53 dark (HL-DS-7) — vor Color-Migration-Merge Re-Audit
- **V1.5.1 Rechtsbehelf-Skelette** (Einspruch AO + Widerspruch SGG/VwGO + Aussetzung der Vollziehung § 361 AO) — Wording 1:1, kein UI-Refactor
- HL-DS-6 tabular-nums auf Aktenzeichen (V1 NormZitatSpan-Komponente)
- HL-DS-10 BehoerdenBadge ohne Farbe
- HL-DS-13 Print-CSS für LetterReader
- HL-DS-14 StickyFristAction-Pattern

**Acceptance-Criteria**:
- Playwright: 3 Personas × `/posteingang`, `/posteingang/[letterId]`, `/posteingang/[letterId]/bescheid` — axe 0/0/0/0 in Light + Dark + Print + High-Contrast (4 Modi)
- Lighthouse a11y ≥ 95 auf Liste + Detail
- Vitest: AI-Summary-Card Hierarchy-Test (Summary-Card hat niedrigere visual weight als Original — z-stacking/font-weight checks)
- Visual-Diff: 5 Modi (light/dark/print/high-contrast/RTL) × LetterCard + LetterReader
- Existing V1.5.1 Cross-Template-Versand e2e bleibt grün

---

### 11.3 Stammdaten V1.0 + V1.1 + V1.2 + V1.3

**Top-5-Probleme** (aus CLAUDE.md V1.0/V1.1/V1.2/V1.3 Followups + Design-Direction-Brief, V1.3 Audit noch nicht commit):
1. **Sektionen-Count-Inkonsistenz**: V1.2 spec § 3 sagt 10, Runtime hat 11 (Beschäftigung extra) — semantische Drift, aber kein DS-v2-Concern; bleibt V1.2.1-Followup.
2. **Hero-Card-Visual-Weight**: aktuell Top-of-Page mit großem Padding; Wow-Wert „familie × postfach = 8 Briefe/Jahr, 4 Tage" konkurriert mit den 11 Sektionen visuell.
3. **YellowLetterEchoCard** verwendet `animate-pulse` in V1.1 (Pflegegrad) — bricht **HL-DS-11**; muss in Phase 5d zu statischem Outline migriert werden.
4. **WalletMdlCard** + **PunkteEidReauthModal** (V1.3) haben Modal-Zoom-Animation aus shadcn-Default — bricht HL-DS-4 wenn ≥ 400 ms; Dialog-Refactor § 5.5 fixt das.
5. **NormZitatSpan** auf 34 Norm-Zitaten — tabular-nums fehlt aktuell partiell; HL-DS-6 erzwingt.

**Files / Komponenten anzufassen**:
- `src/app/(app)/stammdaten/page.tsx` + Sub-Pages
- `src/components/stammdaten/StammdatenView.tsx`
- `src/components/stammdaten/HeroCard.tsx` (Wow-Wert visuelle Hierarchy)
- `src/components/stammdaten/SektionCard.tsx` (alle 11 Sektionen erben)
- `src/components/stammdaten/FoederalismusCardDisclaimer.tsx` (V1.2 — Token-Migration only, Struktur bleibt HL-DS-14)
- `src/components/stammdaten/YellowLetterEchoCard.tsx` (V1.1 — Pulse → Outline-Highlight, HL-DS-11)
- `src/components/stammdaten/Aktivitaetsprotokoll.tsx` (V1.2 4-Kategorie + Richtungsfilter)
- `src/components/stammdaten/WalletSubTab.tsx` (V1 PID + V1.3 mDL)
- `src/components/stammdaten/wallet/WalletMdlCard.tsx` (V1.3 — § 6.3 Reveal + HL-DS-12)
- `src/components/stammdaten/mobilitaet/PunkteEidReauthModal.tsx` (V1.3 — § 5.5 Dialog-Refactor)
- `src/components/stammdaten/mobilitaet/PunktestandOnDemandCard.tsx` (V1.3)
- `src/components/stammdaten/mobilitaet/UmzugBridgeBadge.tsx` (V1.3 — `text-amber-950` bleibt HL-DS-7)
- `src/components/stammdaten/mobilitaet/PflichtumtauschBanner.tsx` (V1.3 — `text-amber-950` bleibt)
- `src/components/shared/MaskedField.tsx` (§ 6.3 Reveal-Crossfade)
- `src/components/shared/NormZitatSpan.tsx` (tabular-nums HL-DS-6)
- `src/components/shared/RechtsprechungZitatSpan.tsx` (V1.1)
- `src/components/shared/BehoerdenBadge.tsx` (HL-DS-10 color-frei)

**Tokens / Patterns anzuwenden**:
- § 3.1 Type-Scale (Hero h1 36 / Sektion h2 24 / body 19)
- § 3.3 Color (Sektion-Card `--color-surface-raised`, Föderalismus `--color-info-soft`)
- § 3.4 Shadow: alle Sektionen Border-first, kein Default-Shadow
- § 5.2 Card (Wallet-Variant für mDL/PID, Default für andere Sektionen)
- § 5.5 Dialog (PunkteEidReauthModal, Pflegegrad-Modal, alle V1.x-Modals)
- § 6.2 Yellow-Letter-Outline (YellowLetterEchoCard — Pulse raus)
- § 6.3 Wallet-Reveal-Crossfade (MaskedField + WalletMdlCard)
- § 5.4 Badge `variant="warning-soft"` für `text-amber-950`-Sites (HL-DS-7 Kompatibilität)

**Hard-Lines die NICHT gebrochen werden dürfen**:
- **V1.0 ARF v2.0 disclaimer-meta**: NormZitatSpan auf 34 §-Zitaten, persona-Migration idempotent
- **V1.1 11/11 Art-9-Linie DECIDED + EuGH C-184/20 Zitat**: RechtsprechungZitatSpan bleibt
- **V1.1 Yellow-Letter-Bridge**: 5 § 109 Abs. 3 Pflicht-Inhalte verbatim bleiben
- **V1.2 Familienkasse-Wechsel-Cascade**: prefers-reduced-motion-Fallback bleibt (cascade-reduced-motion.spec.ts)
- **V1.2 Föderalismus-Card-Disclaimer-Pattern**: 35 Behörden mit `bundid_postfach_anbindung`-Werten unverändert (HL-DS-14)
- **V1.2 § 9 OZG primary norm + 4-Kategorie Aktivitätsprotokoll** bleiben
- **V1.3 mDL closed-list** ISO/IEC 18013-5 Annex B (14 Attribute) bleibt (HL-MOB-9)
- **V1.3 FAER on-demand TTL ≤ 5 min, never written to localStorage** (HL-MOB-8)
- **V1.3 FE-Nr-Format-Validator + ban-list** (HL-MOB-10, HL-MOB-13)
- **V1.3 Block-D Wording** „§ 15 FZV / Pre-Fill der i-Kfz-Adressänderung / unverzüglich" (HL-MOB-14)
- **V1.3 `text-amber-950`** auf 5 Sites bleibt (HL-DS-7)
- HL-DS-11 Yellow-Letter: Pulse-Animation aus V1.1 muss raus
- HL-DS-12 Wallet-Page-Theme: WalletMdlCard
- HL-DS-6 tabular-nums auf NormZitatSpan + FE-Nr + Kennzeichen + Renten-Nr

**Acceptance-Criteria**:
- Playwright: 3 Personas × `/stammdaten` (alle 11 Sektionen + 4 V1.x Modals: Pflegegrad, MobilOtpMock, SaveConfirm, PunkteEidReauth) — axe 0/0/0/0 in Light + Dark + High-Contrast
- Lighthouse a11y ≥ 95 auf `/stammdaten` für 3 Personas
- Vitest: HL-DS-6 tabular-nums Tests grün für NormZitatSpan / FeNrSpan / KennzeichenSpan / RvNrSpan
- Vitest: HL-DS-11 grep-deny `animate-pulse` in YellowLetterEcho-Files
- Vitest: HL-DS-12 grep-deny `data-force-theme` in wallet/-Folder
- Existing V1.3 Playwright 14/14 axe runs bleiben grün
- Visual-Diff: 11 Sektionen × 2 Themes screenshot vs baseline

---

## 12. Test-Plan

### 12.1 Vitest (Unit-Tests)

Datei-Pfade unter `tests/unit/`:

| Test | Hard-Line | Datei |
|---|---|---|
| BundesSans-grep-deny | HL-DS-1 | `design-system-bundessans-ban.test.ts` |
| Shadow-Token-Count ≤ 4 | HL-DS-2 | `design-system-shadow-token-count.test.ts` |
| Color-Family-Cap | HL-DS-3 | `design-system-color-family-cap.test.ts` |
| MotionConfig-presence | HL-DS-4 | `design-system-motion-config-presence.test.ts` |
| No Glassmorphism/Audio/Confetti | HL-DS-5 | `design-system-trust-anchor-ban.test.ts` |
| Tabular-Nums Pflicht-Liste | HL-DS-6 | `design-system-tabular-nums.test.ts` |
| Contrast-Floor 5.63/5.53 + text-amber-950 keep | HL-DS-7 | `design-system-contrast-floor.test.ts` |
| BehoerdenBadge color-frei | HL-DS-10 | `design-system-behoerden-badge-no-color.test.ts` |
| Yellow-Letter Pulse-deny | HL-DS-11 | `design-system-yellow-letter-no-pulse.test.ts` |
| Wallet Page-Theme | HL-DS-12 | `design-system-wallet-page-theme.test.ts` |
| Domain-Patterns Keep | HL-DS-14 | `design-system-domain-patterns-keep.test.ts` |

Total: **11 dedizierte HL-DS-Tests** + Bestand 575 V1-Tests bleibt grün.

### 12.2 Playwright a11y

Datei-Pfade unter `tests/a11y/`:

| Test | Hard-Line | Datei |
|---|---|---|
| Reduced-motion ≤ 200 ms | HL-DS-4 | `design-system-reduced-motion.spec.ts` |
| Touch-Target ≥ 44 px | HL-DS-8 | `design-system-touch-target.spec.ts` |
| Input-Height ≥ 48 px | HL-DS-9 | `design-system-input-height.spec.ts` |
| Yellow-Letter outline 1 s + fade | HL-DS-11 | `design-system-yellow-letter-outline.spec.ts` |
| Wallet Page-Theme screenshot-diff | HL-DS-12 | `design-system-wallet-page-theme.spec.ts` |
| Print: A4 + monochrome + footer | HL-DS-13 | `design-system-print.spec.ts` |
| Hochkontrast forced-contrast | § 8 | `design-system-high-contrast.spec.ts` |

**Acceptance-Matrix** (§ 9.1 Dark-Mode-Matrix-Erweiterung):

- 3 Personas (Anna / Markus / Mehmet) × 3 Hauptroutes (Posteingang / Stammdaten / Vorgänge-Umzug) × 4 Modi (Light, Dark, Print, High-Contrast) = **36 axe-runs total**
- Pro Run: axe 0/0/0/0 required

### 12.3 Lighthouse

- a11y ≥ 95 pro Route × Persona (33 Runs Light, plus 33 Dark = 66)
- Score-Capture via `@lhci/cli` (V1.3 followup — sollte als Pre-Phase-5a-Setup landen)

### 12.4 Manual

- **AR RTL render** in DevTools `Application → User Agent → Locale: ar` + `dir="ltr"` auf FIN/FE-Nr-Latin-Spans verifizieren (V1.3 followup)
- **prefers-contrast: more** in Edge „Use High Contrast"-Mode-Smoke + screenshot diff vs. baseline
- **OKLCH-Fallback** Smoke in Edge 108 + Firefox 120 + Safari 16 (HL-DS-13-adjacent — Browser-Support-Sektion)
- **Print-Preview** in Chrome + Firefox: 3 Routes, schwarz auf weiß, QR + Footer sichtbar

---

## 13. Open Questions (Architect liefert nicht alleine)

> Max 5 OQs. Diese müssen vor Phase-5a-Coder-Start product-architect / domain-expert / a11y-tester eskaliert werden.

**OQ-1 (für product-architect + a11y-tester)**: Soll `--radius-sm` (shadcn-Default ~6 px) auf 4 px gesenkt werden, oder akzeptieren wir Visual-Mini-Shift in 100+ Buttons als Cost vs. konsistente 4-px-Skala? Empfehlung: **value-replace auf 4 px**, Visual-Diff pro Button-Variante als Acceptance. Cost ist ein 1-Pixel-Shift, kein A11y-Bruch.

**OQ-2 (für a11y-tester)**: Touch-Target Hard-Floor — 44 vs 45 px. 44 ist WCAG 2.5.5 AAA Mindestmaß; 45 wäre durch 5 (Vertikalrhythmus) und 3 (Tailwind-Skala 36/40/44/48) teilbar. Empfehlung: **44 hardlocked** (WCAG-Wert), Grid-Snap ist sekundär.

**OQ-3 (für product-architect + DevOps)**: OKLCH-Fallback via PostCSS-Plugin (`@csstools/postcss-oklab-function`) oder via manueller `@supports`-Block? Empfehlung: **PostCSS** (Plugin existiert, build-time, kein Drift-Risiko). Manual `@supports` skaliert nicht auf 30+ Tokens × 2 Themes × Hochkontrast-Override.

**OQ-4 (für product-architect)**: Die 2 fehlenden UX-Audits (Layout-Shell + Onboarding + Vorgänge / Stammdaten V1.3) — sollen wir Phase 5b/5c blockieren bis die Audits commit'd sind, oder die Per-Screen-Briefs § 11.1 / § 11.3 in PR-Form ergänzen wenn Audits ankommen? Empfehlung: **nicht blocking** — § 11.1/§ 11.3 enthalten genug Top-5-Annahmen aus V1.x-Followups, Audits liefern Verfeinerung, kein Refactor.

**OQ-5 (für a11y-tester + Hosting)**: Lighthouse-CLI `@lhci/cli` als Pre-Phase-5a-Setup (V1.3-Followup) — soll das in Phase 5a integriert werden, oder als separater Setup-PR davor? Empfehlung: **separater Setup-PR vor Phase 5a**, damit Phase 5a saubere Lighthouse-Baseline-Captures liefern kann.

---

### Info-Notiz (Ratification 2026-05-14)

- **Vitest-Baseline V1.3**: CLAUDE.md-Status notiert `vitest 575/578` (3 pre-existing failures). Während Phase 5a-Implementation sind diese 3 Tests jetzt grün; aktuelle Baseline ist **578/578**. § 15 Review-Checklist-Zeile „Existing V1.0–V1.3 e2e + a11y + Vitest 575/578 bleiben grün" gilt weiterhin als untere Schwelle; coder-agents dürfen aber 578/578 als ist-Stand reporten. Kein Action-Item für architect.

---

## 14. Out-of-Scope (V2 oder später)

- **UI-Toggle für Dark-Mode** (V2 — separate Spec mit User-Preference-Persistence + Cookies/localStorage)
- **Shadow-Migration-V2.x Backlog**: ~90 existing V1-Sites die `shadow-sm`/`shadow-md`/`shadow-lg` nutzen werden NICHT in Phase 5c migriert. Sie bleiben als Aliases auf neue Shadow-Tokens und werden in einem separaten V2.x-Refactor-Slot ge-replatformt.
- **Vertikal-Autopiloten** (Geburt / Heirat / Aufenthaltstitel-Verlängerung / Steuererklärung) — separate Specs nach Design-System-v2-Ship
- **Assistent-UI / Tool-Use** — separate Spec (Status CLAUDE.md: not yet researched)
- **Brand / Logo / Wortmarke / Domain-Naming** — PRD § 8 open question
- **Behörden-Logo-Strategie** für `public/behoerden-logos/` — Research-Empfehlung war „generische Initial-Badges in `--color-accent-soft`", aber Asset-Pflege ist separater Slot
- **Eigene Sprache-Custom-Font** für AR/RU jenseits Source Sans 3 + Noto Sans Arabic — wenn Reviewer mehr arabische Diakritika-Coverage will, separate Spec
- **Visual-Regress-Test-Infrastruktur** (Percy / Chromatic) — Spec verlangt Screenshot-Diffs, aber nicht eine bestimmte Visual-Regress-Service-Integration; bleibt manuell oder via Playwright-Snapshot in V1
- **`shadow-*`-Sites die in V1-Code custom inline-styles haben** (`box-shadow: 0 1px …` outside `@theme`) — Code-Review-Block in Phase 5c, aber Refactor-PR ist separat

---

## 15. Review-Checklist (für code-reviewer)

- [ ] HL-DS-1..14 Vitest-/Playwright-/grep-Tests alle grün
- [ ] Token-Migration-Tabelle § 4: jede Zeile umgesetzt; Pflicht-Erhalt-Marker (V1.5.1 muted-foreground / V1.3 text-amber-950 / V1.2 Föderalismus / V1.5.1 Sticky-Footer) verifiziert
- [ ] Phase 5a-5e: jede Phase axe-PASS-gated und in eigenständigem PR
- [ ] Per-Screen-Briefs § 11.1/11.2/11.3: alle drei Coder haben in ihrem PR die Acceptance-Criteria abgehakt
- [ ] § 9.1 Acceptance-Matrix 66 axe-Runs vor Color-Merge PASS
- [ ] § 12 Test-Plan: 11 Vitest + 7 Playwright + 36 axe-Matrix + Lighthouse-Runs alle grün
- [ ] Existing V1.0–V1.3 e2e + a11y + Vitest 575/578 bleiben grün
- [ ] Print-Snapshot für 3 Routes (LetterReader / Umzug-Zusammenfassung / Bescheid-Detail) verifiziert
- [ ] Hochkontrast-Snapshot für 3 Routes verifiziert
- [ ] OKLCH-Fallback in Edge 108 / Firefox 120 / Safari 16 smoke-tested
- [ ] i18n parity: keine neuen UI-Strings introduced (Design-System-Spec ist visuell-/CSS-only) — sollte sich automatisch ergeben, aber Vitest-Test `i18n-parity` läuft
- [ ] CLAUDE.md Status-Sektion bekommt einen `[x] Design-System v2 — …` Eintrag mit ship-date + Test-Counts
