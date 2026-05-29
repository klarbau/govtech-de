---
feature: landing-page (prototype-v2 redesign pass)
title: Landing — match user sketch (horizontal autopilot fan-out)
status: in-progress
track: spine
date: 2026-05-28
author: frontend-coder
inputs:
  sketch: C:\Users\iaiaa\Downloads\d0c5625a-afa1-440e-a7af-df4813352485.png
  prior_spec: docs/specs/landing-page.md   # base spec, content + tokens unchanged
  current_files:
    - src/app/page.tsx
    - src/components/landing/LandingNav.tsx
    - src/components/landing/LandingHero.tsx
    - src/components/landing/AutopilotDiagram.tsx
    - src/components/landing/LandingFeatureGrid.tsx
    - src/components/landing/LandingFeatureCard.tsx
---

> **Scope guard.** This is a visual second pass on the existing landing build to
> bring the autopilot diagram, the badge placement, the trust line, and the feature
> grid tile language closer to the user-supplied prototype sketch. Content (copy,
> i18n keys, links, structure) is **unchanged** from `docs/specs/landing-page.md`.
> No new i18n keys, no token forks, no commit.

## 1. What the sketch actually shows (delta against current build)

Reading the sketch left-to-right, top-to-bottom:

1. **Top nav** — current build matches: brand "GovTech DE · Verwaltung neu gedacht.", center nav row of 5 links, right cluster `ThemeToggle / LanguageSwitcher / Anmelden`. **No change required.**
2. **Hero LEFT column** — pill badge ("✨ Die Verwaltung, die mitdenkt."), giant H1 ("Behörden, aber auf Autopilot."), subtitle, two CTAs ("Demo starten ›" cobalt + "Mehr erfahren ›" outline), shield trust line. **No change required** (current build matches).
3. **Hero RIGHT column — autopilot diagram** — this is the place the current build deviates:
   - Sketch shows a **2-panel horizontal composition** inside one card:
     - **Inner LEFT panel** ("Sie als Bürger:in"): person icon + label at top, white-tinted inner card with "Einmal angeben — Wir verstehen Ihr Anliegen und bereiten alles vor.", then **central cobalt sparkle bubble labelled "Autopilot"** with sub-line ("Vorgang vorbereiten · Daten vorausfüllen · Nächsten Schritt erklären") sitting at the bottom of this left panel as a bridge node.
     - **Inner RIGHT panel** ("Ihre Behörden"): vertical stack of three small Behörde-cards (Einwohnermeldeamt / Ausländerbehörde / Finanzamt), each with bank-style icon + name + 2-line status.
     - **Three dashed connector lines** fan out **horizontally from the Autopilot sparkle node on the left → to each of the three Behörde-cards on the right.**
   - **Bottom of card** — full-width green trust bar ("✓ Sie behalten jederzeit den Überblick und die Kontrolle.") spanning under both inner panels.
   - **Current build renders this vertically** (panel-then-panel down a single column with a single dashed line), which is functionally correct but visually flat and does not communicate the parallel-Behörden fan-out that is the whole point.
4. **Feature grid rows 1+2 — 8 tiles, 2 rows × 4 cols** — current build matches: rounded card + circular icon chip + title + 2-line description, hover ChevronRight on linked variants. **No change required.**
5. **Footer + prototype banner** — current build matches.

## 2. Out of scope for this pass

- Top nav, hero text column, feature grid cards, footer, prototype banner, i18n
  catalog, token palette, shared primitives — **all unchanged**.
- No new `landing.*` keys. No mock-backend, no AI integration.
- No SVG illustration (HL-DS-3): the fan-out is still composed from divs + Tailwind
  borders + foundation tokens, just laid out horizontally on `md+`.
- Mobile (`< md`) stays vertical and behaviourally identical to the current build
  — the sketch is desktop-first, mobile stacks below.

## 3. Target diagram structure (md+)

Single bordered Card. Inside the card, the diagram is two columns wrapping a
center connector layer:

```
┌────────────────────────────────────────────────────────────────────┐
│                                                                    │
│  ┌──────────────────────────────┐    ┌──────────────────────────┐  │
│  │ Sie als Bürger:in            │    │ Ihre Behörden            │  │
│  │                              │    │                          │  │
│  │  ┌────────────────────────┐  │    │  ┌────────────────────┐  │  │
│  │  │ Einmal angeben         │  │    │  │ 🏛 Einwohnermelde- │  │  │
│  │  │ Wir verstehen ...      │  │    │  │    amt             │  │  │
│  │  └────────────────────────┘  │ ╲  │  │ Adresse aktual.    │  │  │
│  │                              │  ╲ │  └────────────────────┘  │  │
│  │       ╭───────╮              │   ╲│  ┌────────────────────┐  │  │
│  │       │   ✦   │  Autopilot   │────│  │ 🏛 Ausländerbeh.   │  │  │
│  │       ╰───────╯  Vorgang …   │   ╱│  │ Antrag bearbeiten  │  │  │
│  │                              │  ╱ │  └────────────────────┘  │  │
│  │                              │ ╱  │  ┌────────────────────┐  │  │
│  │                              │    │  │ 🏛 Finanzamt       │  │  │
│  │                              │    │  │ Bescheid erhalten  │  │  │
│  │                              │    │  └────────────────────┘  │  │
│  └──────────────────────────────┘    └──────────────────────────┘  │
│                                                                    │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ ✓ Sie behalten jederzeit den Überblick und die Kontrolle.   │   │
│  └─────────────────────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────────────────┘
```

The three dashed connectors are CSS-positioned (`absolute`) inside an
overlay layer that spans the gap between the two inner panels. Each
connector is a single 1px dashed line; the origin is the right edge of the
Autopilot bubble, the destination is the left edge of one of the three
right-stack cards. Token: `border-border-strong` dashed.

### Mobile (`< md`)

The card collapses to a single vertical flow, identical to the current
build: input card → vertical dashed line → Autopilot bubble → vertical
dashed line → 3 stacked Behörde-cards → trust bar. No diagonal connectors
on mobile (they cannot be made meaningful in a 1-col layout).

## 4. Concrete CSS strategy for the connectors

- Wrap the two inner panels + connector layer in a parent `relative` container
  (`md:grid md:grid-cols-2 md:gap-12 md:relative`).
- The connector layer is **one `<div aria-hidden>` per Behörde-card, absolutely
  positioned, only visible on `md+`** (`hidden md:block`). Each connector:
  - origin: tied to the Autopilot bubble's vertical center (use a known
    pixel height layout — bubble vertically centered in left panel's lower
    third — and absolute pixel offsets via Tailwind arbitrary classes are
    avoided; instead position with `top-[var(--ds-…)]` not needed — use
    flex math: connector layer sits inside left panel right-edge anchored,
    with three child connectors at `top` 14%/50%/86% (approximate vertical
    midpoints of the three right-stack cards).
  - line: a single thin element `h-px w-full bg-transparent border-t border-dashed border-border-strong`, rotated via `rotate-[…deg]` for the
    top and bottom connectors; the middle connector is horizontal (no rotation).
  - Origin anchor: the LEFT panel reserves a small "anchor column" on its
    right edge (`md:pr-0`, the Autopilot bubble centered there).
- Acceptable simplification: since exact pixel math is fragile across
  locales, the connector layer may use **three slightly fanned `border-t border-dashed` strips inside a flex column** sitting in the visual gap
  between the two panels:
  - top connector: `-rotate-12 origin-left`
  - middle connector: no rotation
  - bottom connector: `rotate-12 origin-left`
  - each line `w-24 md:w-32 lg:w-40 h-px border-t border-dashed border-border-strong`.

The exact angle is cosmetic — the requirement is "three visible dashed lines
fanning from the Autopilot node to the three Behörde cards on the right".

## 5. a11y

- Connector layer entirely `aria-hidden="true"` (decorative).
- `<figure>` wraps the whole diagram; `<figcaption class="sr-only">` keeps
  the existing `landing.diagram.sr_summary` (unchanged) — the screen-reader
  flow stays correct regardless of how the visual lines are drawn.
- Touch targets: nothing inside the diagram is interactive. Untouched.
- `prefers-reduced-motion`: no entrance animation. The dashed lines are
  static. Untouched.

## 6. File changes

| File | Change |
|---|---|
| `src/components/landing/AutopilotDiagram.tsx` | Restructure to 2-column md+ layout with horizontal fan-out connectors. Mobile stays vertical. Content + i18n keys unchanged. |
| `src/app/page.tsx` | No change. |
| `src/components/landing/LandingNav.tsx` | No change. |
| `src/components/landing/LandingHero.tsx` | No change. |
| `src/components/landing/LandingFeatureGrid.tsx` | No change. |
| `src/components/landing/LandingFeatureCard.tsx` | No change. |
| i18n catalogs | No change. |
| tokens / shared primitives | No change. |

## 7. Verify

- `npx tsc --noEmit` exit 0.
- Manual visual diff against the sketch on `/` at `md+` (desktop) and
  `< md` (mobile narrow).
- Light + dark mode both render correctly through tokens.
- Page-level a11y (axe + Lighthouse) is not re-run here — content and
  semantics did not change, only the visual layout of decorative elements.

## 8. Known deviations + follow-ups

- The three connectors are CSS-rotated dashed strips, not pixel-perfect
  bezier arcs. Acceptable for the demo register; an SVG path with curves
  would be more polished but is explicitly excluded by HL-DS-3 ("no SVG
  illustration") and by the foundation contract.
- On very narrow desktop widths (between `md` and `lg`), the connectors
  may be visually short; this is acceptable.
- Mobile flow does not show fan-out (single column does not support it);
  the screen-reader summary preserves the meaning.
