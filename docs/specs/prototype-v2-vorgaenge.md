---
feature: prototype-v2-vorgaenge
title: Prototype v2 — Vorgänge overview re-skin to match user sketch (2026-05-28)
status: in-progress
track: spine
date: 2026-05-28
author: frontend-coder
parent_spec: docs/specs/redesign-vorgaenge.md
sketch: C:\Users\iaiaa\Downloads\358ad930-160c-4c3b-b4d6-510355e3c572.png
scope: src/app/(app)/vorgaenge/page.tsx + src/components/vorgaenge/**
owner_agents: [frontend-coder]
i18n_lock: true   # MUST NOT edit any locale JSON; reuse existing keys only.
out_of_scope:
  - src/components/umzug/**            # owned by Umzug-Run + Identität agents
  - src/app/(app)/vorgaenge/umzug/**   # owned by Umzug-Run agent
  - shared/layout/brand tokens
---

## 1. Why another pass

The Vorgänge overview already shipped (2026-05-27) and matches the foundation
primitives, but the new user-supplied sketch reorganises the card anatomy:
- House icon (not Truck) for the Umzug headline card.
- Sub-line under title: *"Ihre Behörden werden automatisch informiert."* +
  small `Verantwortlich: Sie` line.
- Horizontal Fortschritt strip with **per-node triple line**: Behörde name +
  short status verb + date — visually echoing the Umzug-Run cascade but flatter
  (summary, not the hero).
- Footer split: clock + `Gestartet: <date>` on the left, primary outline
  *"Vorgang öffnen"* on the right.
- Small cards (Aufenthaltstitel + Kindergeld) gain a tinted **info row**
  (amber for warning, accent-soft for upcoming Frist) + a ⋯ overflow trigger.
- Right rail switches to **big-stat rows**: tinted IconCircle + large numeric
  + sub-label + `Ansehen ›` link.

## 2. Hard constraints

1. **No i18n changes.** Use existing keys only:
   - `vorgaenge.title`, `vorgaenge.subtitle`
   - `vorgaenge.filter.{alle,laufend,warten,abgeschlossen}` + `filter_aria`
   - `vorgaenge.card.{progress_label, cta_weiter, cta_kaskade, cta_unterlagen,
     cta_ansehen, unterlagen_fehlen, umzug_subtitle}`
   - `vorgaenge.card.progress` (kept available; not rendered on the headline
     strip per sketch — but used as accessible name in `<HorizontalStepper>`'s
     ICU plural-friendly summary).
   - `vorgaenge.stepper.{aria, node_done, node_active, node_pending, node_failed}`
   - `vorgaenge.rail.{title, offene_vorgaenge, offene_vorgaenge_count,
     frist_naht, frist_naht_days, warten_bestaetigung,
     warten_bestaetigung_count, cta_ansehen, alle_ansehen, empty}`
   - `vorgaenge.empty.{title, body, cta_umzug}`
   - `common.status.*`, `common.filter`, `common.show_all`,
     `common.context_chip.prototype`
   - `umzug.detail.angelegt_template` (reused as the headline-card "Gestartet" line)

2. **No touching `src/components/umzug/**` or `src/app/(app)/vorgaenge/umzug/**`.**
3. **No new dependencies.** Reuse foundation primitives + lucide + framer-motion.
4. **No commit.**

## 3. Layout

```
┌─ PageHeader: H1 "Vorgänge" / sub "Laufende und abgeschlossene …" ──────────┐
│                                                                               │
│  ┌─ Tabs row ──────────────────────────────────────────────────────────────┐ │
│  │ [Alle 6] [Laufend 3] [Warten auf Sie 2] [Abgeschlossen 1]      [Filter]│ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                                                               │
│  ┌─ MAIN (flex-1) ─────────────────────────────┐ ┌─ ASIDE (320px) ─────────┐ │
│  │ ┌─ ProcessCardHero (Umzug) ────────────────┐│ │  WasIstWichtigRail       │ │
│  │ │ [Home] Umzug                  [Laufend ●]│ │ │  ┌─────────────────────┐ │ │
│  │ │       Ihre Behörden werden auto…         │ │ │  │ [tinted] 3          │ │ │
│  │ │       Verantwortlich: Sie                │ │ │  │  offene Vorgänge    │ │ │
│  │ │                                          │ │ │  │       Ansehen ›     │ │ │
│  │ │ Fortschritt                              │ │ │  └─────────────────────┘ │ │
│  │ │ ●───●───●───◉───◌                        │ │ │  ┌─────────────────────┐ │ │
│  │ │ ✓   ✓   ✓   active pending               │ │ │  │ [tinted] 1          │ │ │
│  │ │ Bürger Finanz Beit  Bundes  AOK         │ │ │  │  Frist in 14 Tagen  │ │ │
│  │ │ amt   amt   service Druck.               │ │ │  │       Ansehen ›     │ │ │
│  │ │ Anmeld Adress Daten Ausweis  Krankenk.   │ │ │  └─────────────────────┘ │ │
│  │ │ abgesch übermit aktual in Bear inform    │ │ │  ┌─────────────────────┐ │ │
│  │ │ 27.05  28.05  29.05  30.05    —          │ │ │  │ [tinted] 2          │ │ │
│  │ │                                          │ │ │  │  Warten auf Best.   │ │ │
│  │ │ ⏱ Gestartet: 27. Mai 2025  [Vorgang öff]│ │ │  │       Ansehen ›     │ │ │
│  │ └─────────────────────────────────────────┘│ │  └─────────────────────┘ │ │
│  │                                              │ │  Alle Vorgänge ansehen › │ │
│  │ ┌─ ProcessCardSm (Auf…) ─┐ ┌─ ProcessCard… ┐│ └──────────────────────────┘ │
│  │ │ [IdCard] Aufenthalts.  │ │ [Wallet] Kind │ │                              │
│  │ │     Landesamt …        │ │     Familienk.│ │                              │
│  │ │     Verantwortlich: Sie│ │     Verantwo.│ │                              │
│  │ │             [Laufend ●]│ │   [Warten ●]  │ │                              │
│  │ │ ┌ amber-soft info ────┐│ │ ┌ amber inf ─┐│ │                              │
│  │ │ │⏱ Frist in 14 Tagen  ││ │ │⚠ Unterlag. ││ │                              │
│  │ │ │ Fällig am 12.06.    ││ │ │ Bitte lad…││ │                              │
│  │ │ └─────────────────────┘│ │ │ Seit 2 Tag.││ │                              │
│  │ │ [Weiter bearbeiten] ⋯ │ │ └──────────────┘│                              │
│  │ │                        │ │ [Unterlagen…] ⋯│                              │
│  │ └────────────────────────┘ └────────────────┘                              │
│  └──────────────────────────────────────────────┘                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

## 4. Component changes (files)

### 4.1 `src/components/vorgaenge/VorgaengeView.tsx` (existing — light edit)
- Drop `contextChip` from `PageHeader` (sketch shows clean header only).
- Add a right-aligned `FilterButton` next to `FilterTabs` (non-functional in v1 —
  opens nothing; visual parity only). It is a placeholder for future advanced
  filter; click is a no-op with `aria-disabled` and `title` hint via existing
  `common.filter` label.
- Switch the Umzug card icon from `Truck` → `Home`.
- Pass the Umzug `angelegt_am` ISO to the headline card so it can render
  `Gestartet: <de-locale date>`.
- Keep the existing data-fetch + filter-state machinery.

### 4.2 `src/components/vorgaenge/ProcessCard.tsx` (existing — restructure)
Re-shape the card to match the sketch:
- **Header row:** `IconCircle` (lg) with `Home` (passed in) + title H2 + status
  `StatusBadge` (variant `laufend|warten|abgeschlossen`, dot baked into
  StatusBadge). Sub-line under title from `subtitle` prop. Small
  `Verantwortlich-` line — rendered ONLY if `verantwortlichLabel` prop is given;
  derived from existing keys: we use `common.status.warten` as a *non-fit*, so
  instead we render a hard-coded German neutral `Verantwortlich: Sie` ONLY when
  the spec greenlights — but i18n is locked. **Decision:** OMIT the
  *"Verantwortlich: Sie"* line for the headline card and the small cards. We
  keep the design honest without inventing strings outside the locked locales.
  This is the single intentional deviation from the sketch.
- **Fortschritt strip:** `<HorizontalStepper>` with extended per-node text:
  Behörde name, short status verb (from `vorgaenge.stepper.node_*`, e.g.
  `Bürgeramt: abgeschlossen` becomes the sr-only line; the visible verb is the
  Behörde name only — see § 4.3). Connector lines and node colours unchanged.
- **Footer:** left: `Clock` icon + reused `umzug.detail.angelegt_template` with
  the `angelegt_am` rendered via date-fns/de. Right: `<Link>` styled as
  `buttonVariants({ variant: 'default' })` (cobalt filled, sketch's CTA is
  filled cobalt) → `vorgaenge.card.cta_ansehen` ("Vorgang ansehen") for the
  Umzug headline, with `ArrowRight` icon. (For non-Umzug headline use cases —
  none expected here — fall back to `cta_weiter`.)

### 4.3 `src/components/vorgaenge/HorizontalStepper.tsx` (existing — extend)
The current stepper renders Behörde + short date. The sketch also shows a
per-node **second line** ("Anmeldung abgeschlossen" / "Adressänderung
übermittelt" / "Daten aktualisiert" / "Ausweis ändern in Bearbeitung" /
"Krankenkasse informieren").
- Extend `StepperNode` with an optional `aktion` field (free-form, derived in
  `vorgang-uebersicht.ts` from `AutopilotStep.aktion`).
- Render `aktion` as a 2nd line `text-xs text-text-secondary line-clamp-2`
  under the Behörde name.
- Render `datum` as a 3rd line `text-xs text-text-muted tabular-nums`.
- Pulse animation already correct. Connectors already correct. No icon change.

### 4.4 `src/components/vorgaenge/ProcessCardSmall.tsx` (existing — restructure)
- **Header:** icon (`IdCard` for Aufenthalt, `Wallet`/`Baby`/`FolderKanban`
  fallback for Kindergeld — pass via `icon` prop) + title H3 +
  right-aligned StatusBadge.
- **Sub-line:** the Behörde name (passed in `subtitle` prop, derived from
  `beteiligte_behoerden_ids[0]`).
- **Tinted info row** (NEW): a `bg-accent-soft` or `bg-warning-soft` strip
  with an inline icon + 1–2 lines. Two sources:
  - `unterlagen_fehlen`: `bg-warning-soft text-warning` row with
    `AlertTriangle` + the `card.unterlagen_fehlen` label as the heading line.
    No sub-body line (we lack the "Bitte laden Sie…" key and "Seit 2 Tagen
    offen" key — sketch decoration only).
  - upcoming Frist: `bg-accent-soft text-text-secondary` row with `Clock3`
    icon + `FristCountdown` countdown line; we already have this.
- **Footer row:** primary outline CTA + a `MoreHorizontal` ⋯ button. The
  ⋯ button is a non-functional placeholder; it carries an `aria-label` built
  from existing `common.show_all` (which is *not* the right label) — DECISION:
  rather than mislabel, omit the ⋯ button. Sketch parity drops, accessibility
  wins. (Once an "Aktionen" key is added in a future i18n pass we can add the
  menu trigger properly.)

### 4.5 `src/components/vorgaenge/WasIstWichtigRail.tsx` (existing — restructure)
Replace the compact ListRow style with **big-stat rows**:
- Each row = `<Link>` containing `IconCircle` (lg, tinted) + a flex column with
  a **big numeric** (`text-3xl font-semibold tabular-nums`) + sub-label
  (existing `rail.offene_vorgaenge`, `rail.frist_naht`,
  `rail.warten_bestaetigung`) + `Ansehen ›` cobalt link on the right.
- Numbers come from the same deterministic derivation already in place:
  - **Offene Vorgänge** = count of `status ∉ {abgeschlossen, abgelehnt}`.
  - **Frist in den nächsten 14 Tagen** = count of upcoming Fristen ≤14 days.
    The label uses `rail.frist_naht` ("Frist nähert sich") since
    `rail.frist_naht_days` is per-row text not a header — kept honest with
    existing keys.
  - **Warten auf Bestätigung** = number of Vorgänge where
    `wartet_auf_buerger === true`.
- Footer link unchanged: `rail.alle_ansehen` → `#vorgaenge-liste`.

### 4.6 `src/components/vorgaenge/vorgang-uebersicht.ts` (existing — extend)
- Add `aktion?: string` to `StepperNode` and pass through
  `s.aktion` (translated via `t('umzug.run.step_*')` is NOT available here —
  spec uses the raw `AutopilotStep.aktion` string, which is already a
  human-readable German verb phrase in our seed data). If empty, fall back to
  `t('vorgaenge.stepper.node_*')` short form (handled in the stepper render).
- Add a `nowIso`-independent helper to compute the Behoerden-side `aktion`
  label cleanly — but to stay i18n-locked, we render the raw `aktion` string
  (which already lives in the seed data per persona) — this matches the
  sketch's per-node text exactly (e.g. "Anmeldung abgeschlossen", "Daten
  aktualisiert").

### 4.7 `src/app/(app)/vorgaenge/page.tsx` (existing — no edit)
The page just renders `<VorgaengeView />`. No change needed.

## 5. Edge cases
- **Vorgang ohne `aktion`** → stepper renders Behörde + date only (current
  behaviour).
- **`angelegt_am` missing on Umzug** → omit the "Gestartet:" footer line.
- **Filter shows zero Vorgänge** → existing `EmptyState` path unchanged.
- **Headline card not Umzug** → existing fallback to `Truck` was wrong by
  default; switch the default to `FolderKanban` and let callers pass `Home`
  explicitly for Umzug.
- **AR-RTL** → `ArrowRight` already has `rtl:-scale-x-100`. Verify no fixed
  pixel margins in the new info-row strip break RTL.
- **Reduced motion** → no new animations introduced.

## 6. Accessibility checklist
- [x] One H1 (`PageHeader`).
- [x] Each `ProcessCard` / `ProcessCardSmall` is `<article aria-labelledby>`.
- [x] `<HorizontalStepper>` keeps its `<ol aria-label>` and sr-only status
      per node; the new visible `aktion` line is decoration on top.
- [x] The rail's stat rows are real `<Link>` elements with both numeric and
      label inside the accessible name (numeric first → screen reader reads
      "3, offene Vorgänge").
- [x] Min touch target 44px for the filter button + CTA + rail row.
- [x] Focus rings preserved.

## 7. Verification
- `npx tsc --noEmit` — must pass.
- Smoke check via `pnpm dev` not required (changes are visual-only).

## 8. Known deviations from sketch (intentional)
1. **No "Verantwortlich: Sie" line** anywhere (no i18n key exists; not adding
   strings outside the locked locales).
2. **No "Bitte laden Sie die fehlenden Dokumente hoch" / "Seit 2 Tagen
   offen" sub-lines** in the Kindergeld warning row (same reason).
3. **No ⋯ overflow menu button** on the small cards (same reason — would
   require an `aria-label`).
4. **"Frist in den nächsten 14 Tagen" rail row** uses the existing
   `rail.frist_naht` ("Frist nähert sich") sub-label rather than the sketch's
   verbatim text. Big number + label remain semantically equivalent.

All four are recoverable in a follow-up i18n pass; none are visual blockers.

## Build log — frontend-coder
- date: 2026-05-28
- screen: Vorgänge overview (process list) — `/vorgaenge`
- files modified:
  - `src/components/vorgaenge/vorgang-uebersicht.ts` — added `aktion`,
    `angelegt_am`, `primary_behoerde_name`, `beteiligte_behoerden_ids` to
    `VorgangUebersicht`.
  - `src/components/vorgaenge/HorizontalStepper.tsx` — added optional `aktion`
    field on `StepperNode`; render new per-node sub-line under Behörde name,
    font weight adjusted (Behörde now `font-semibold text-text-primary`, action
    + date use the smaller `text-[0.6875rem]`).
  - `src/components/vorgaenge/ProcessCard.tsx` — headline-card restructure:
    default icon switched to `Home`; title block + status badge on row 1;
    HorizontalStepper in row 2; new footer row with `Clock` + `Angelegt
    {datum}` (reuses `umzug.detail.angelegt_template`) on the left, filled
    cobalt CTA "Vorgang ansehen" on the right (was outline „Kaskade ansehen"
    — sketch shows a filled CTA).
  - `src/components/vorgaenge/ProcessCardSmall.tsx` — added Behörde sub-line
    under title (`primary_behoerde_name`); new tinted info-row (amber-soft for
    `unterlagen_fehlen`, accent-soft for upcoming Frist, switching to
    warning-soft when ≤7d); border-t footer with right-aligned CTA only.
  - `src/components/vorgaenge/WasIstWichtigRail.tsx` — big-stat row shape:
    each `<li>` renders `IconCircle` (lg) + big numeric (`text-2xl tabular-nums`)
    + sub-label + cobalt „Ansehen ›" link. Frist row scoped to next 14 days
    (`FRIST_WINDOW_DAYS`).
  - `src/components/vorgaenge/VorgaengeView.tsx` — removed `contextChip` from
    `PageHeader`; added right-aligned `FilterButton` next to `FilterTabs`;
    default typIcon table now uses `Home` (Umzug) + `IdCard`
    (Aufenthaltstitel) + `Wallet` (Familienkasse/Kindergeburt) +
    `FolderKanban` fallback.
- files NOT touched (out of scope):
  - `src/components/umzug/**` (Umzug-Run + Identität agents)
  - `src/app/(app)/vorgaenge/umzug/**` (Umzug-Run agent)
  - `src/lib/i18n/locales/*.json` (i18n-localizer)
  - `src/app/(app)/vorgaenge/page.tsx` (no edit needed — page is a thin
    wrapper).
- typecheck: pass (`npx tsc --noEmit` clean across the repo).
- known deviations from sketch (carry over from § 8): no „Verantwortlich:
  Sie" line, no warning sub-body text on Kindergeld card, no ⋯ overflow menu,
  rail Frist label uses „Frist nähert sich" instead of „Frist in den nächsten
  14 Tagen" — all blocked by the i18n lock.
- follow-ups for next i18n pass: add `vorgaenge.card.verantwortlich`,
  `vorgaenge.card.unterlagen_fehlen_body`,
  `vorgaenge.card.seit_n_tagen_offen`, `vorgaenge.card.aktionen_aria`,
  `vorgaenge.rail.frist_window_14d`.
- next: code-reviewer (visual diff vs sketch), a11y-tester (axe on the new
  info row contrast — warning-soft + warning text should already PASS per the
  shipped DSC tokens).

