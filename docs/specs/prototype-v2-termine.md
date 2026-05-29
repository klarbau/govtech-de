# Prototype v2 — Termine re-alignment

- **Date:** 2026-05-28
- **Branch:** `redesign-prototype-sweep` (no commit)
- **Track:** supporting (single-screen redesign sweep; behaviour preserved)
- **Reference sketch:** `C:\Users\iaiaa\Downloads\68bfb7b4-d1ba-420d-a7f1-2003ea42178a.png`
- **Files touched:** `src/app/(app)/termine/**` + `src/components/termine/**` only.

## 1. Why this re-alignment

The 2026-05-27 full-sweep redesign brought Termine onto the unified cobalt
design system but the layout still reads as a flat three-column grid with
identical card chrome on every card. The user's sketch tells a richer
story:

1. The **left column** stays as month-calendar + filter, but the day-state
   visuals invert: **today** is a *filled cobalt circle* and the
   **selected day** is a *cobalt outline circle* (current code is opposite).
   Event dots are a faint cobalt under in-month days.
2. The **center column** has a **featured "Nächste Termine"** card with a
   distinctive **cobalt left-edge accent strip** (4 px), then a single
   "Weitere Termine und Erinnerungen" card grouping rows with a footer
   "Alle Termine anzeigen" outline button.
3. The **right column** has three small cards: a **"Nächster Schritt"**
   recap of the same upcoming termin (calendar icon + title + Bestätigt
   pill + date/time/location/Buchungsreferenz + two CTAs), a calmer
   **"Gut vorbereitet zum Termin"** card with **three informational
   bullet rows** (`Bringen Sie bitte mit` / `Planen Sie genug Zeit ein`
   / `Nicht wahrnehmen?`) instead of the current abhakbare checklist,
   and a compact **"Fristen im Überblick"** card with one check-icon row
   and a "Fristen anzeigen ›" link CTA.
4. The **filter swatch colour mapping changes**: Erinnerungen-Fristen =
   *green* (currently warning amber), Buchungen = *amber* (currently
   success green). Behördentermine = cobalt and Abgeschlossen = grey
   remain.

Everything else (page header, status pills, IconCircle, behoerden lookup,
ICS download path, mock-backend wiring) is reused as-is.

## 2. Non-goals

- No new i18n keys. All strings reused from the existing `termine.*`
  namespace; sketch-only labels (the three vorbereitung bullets,
  "Fristen anzeigen ›", "Alle Termine anzeigen") are hardcoded inline DE
  per the sweep convention (`prototype-v2-dashboard.md` § 5).
- No mock-backend changes. `api.getTermine`, `api.getReminders`,
  `api.getBehoerden` calls stay identical.
- No type changes. The existing `Termin.vorbereitung?:
  TerminVorbereitungItem[]` field stays on the type (so we don't break
  seed data); it is simply not rendered in the redesigned right column.
  The new `Gut vorbereitet` card is a static 3-row info block.
- No changes to `buildIcs` or the `.ics` download path.
- No locale-JSON edits across any locale.

## 3. Screen architecture (≥ lg, 3-column)

```
[ PageHeader: h1 Termine + subtitle + speculative chip ]
┌───────────────────┬─────────────────────────────┬───────────────────┐
│ Left col (18rem)  │ Center col (flex 1)         │ Right col (20rem) │
│                   │                             │                   │
│ ┌───────────────┐ │ h2 Nächste Termine          │ ┌───────────────┐ │
│ │ MonthCalendar │ │                             │ │ Nächster      │ │
│ │ Mai 2026 ‹ ›  │ │ ┌─────────────────────────┐ │ │ Schritt       │ │
│ │ Mo Di … So    │ │ ║▌  📅  LEA Berlin —     │ │ │ 📅 …          │ │
│ │ 1  2 …        │ │ ║▌      Aufenthaltstitel │ │ │ Bestätigt     │ │
│ │ ●28           │ │ ║▌      verlängern       │ │ │ Datum         │ │
│ │ (event dots)  │ │ ║▌      [✓ Bestätigt]    │ │ │ Uhrzeit       │ │
│ └───────────────┘ │ ║▌      📅 Donnerstag    │ │ │ Adresse       │ │
│                   │ ║▌      🕘 14:30 (60 m)  │ │ │ Buch.ref.     │ │
│ ┌───────────────┐ │ ║▌      📍 Friedrich-…   │ │ │ [ICS] [Det.]  │ │
│ │ Filter        │ │ ║▌      Buchungsref.     │ │ └───────────────┘ │
│ │ ● Behördent.  │ │ ║▌      [ICS] [Details ›]│ │                   │
│ │ ● Erinner.    │ │ └─────────────────────────┘ │ ┌───────────────┐ │
│ │ ● Buchungen   │ │                             │ │ Gut vorber.   │ │
│ │ ○ Abgeschl.   │ │ h3 Weitere Termine &        │ │ 🎒 Bringen…   │ │
│ └───────────────┘ │    Erinnerungen             │ │ ⏰ Planen…    │ │
│                   │ ┌─────────────────────────┐ │ │ ✖  Nicht…     │ │
│                   │ │ 🏛 Bürgeramt — …   [›]  │ │ └───────────────┘ │
│                   │ │ 🔔 Kindergeld …  [Erin] │ │                   │
│                   │ │ 🎓 Steuererkl …  [Erin] │ │ ┌───────────────┐ │
│                   │ │ ─────────────────────── │ │ │ ✓ Fristen     │ │
│                   │ │   [ Alle Termine ▢ ]    │ │ │   im Überbl.  │ │
│                   │ └─────────────────────────┘ │ │ Fristen ›     │ │
│                   │                             │ └───────────────┘ │
└───────────────────┴─────────────────────────────┴───────────────────┘
```

Layout grid: `lg:grid-cols-[18rem_minmax(0,1fr)_20rem]` (same as current).
On `< lg` viewports the columns stack vertically: calendar+filter, then
nächste/weitere, then right-rail. Mobile (`< md`) hides nothing — all
content remains accessible.

## 4. Component inventory

### Reused (no change)

- `@/components/shared/PageHeader`
- `@/components/shared/SectionCard`
- `@/components/shared/EmptyState`
- `@/components/shared/IconCircle`
- `@/components/shared/StatusBadge`
- `@/components/ui/{button,card,checkbox}`
- `@/components/termine/buildIcs` (ICS download path unchanged)

### Edited

- `MonthCalendar.tsx` — swap today / selected visual:
  - **today (in-month)**: `bg-primary text-primary-foreground` (filled)
  - **selected (different day)**: `ring-1 ring-inset ring-primary
    text-primary` (cobalt outline)
  - **selected === today**: filled cobalt (today wins; selected-state
    inferred from `aria-current`).
  - Event dots: faint cobalt under in-month days only
    (`bg-primary/60`), `bg-text-muted` for out-of-month, hidden when the
    day is the filled-today cell (dot would be invisible on the same
    cobalt; aria announcement preserves the "events" info).
- `TermineFilter.tsx` — change swatch colours:
  - erinnerungen → `bg-success` (green)
  - buchungen → `bg-warning` (amber)
  - behoerdentermine → `bg-primary` (cobalt, unchanged)
  - abgeschlossen → `bg-text-muted` (grey, unchanged)
- `NaechsterTerminCard.tsx` — add a **cobalt left-edge accent strip**:
  a 4 px `bg-primary` rule running the full card height on the start
  edge (`ltr:rounded-l-lg rtl:rounded-r-lg` to clip with the card
  radius). The remainder of the card content layout matches the sketch:
  - Calendar icon (cobalt soft `IconCircle` size `lg`)
  - Behörde name (small, secondary) + Betreff (h3, semibold)
  - Bestätigt status badge on the right
  - `dl` rows: 📅 Donnerstag, 5. Juni 2026 / 🕘 14:30 (60 Min.) / 📍 Adresse
    / Buchungsreferenz (tabular-nums, dir=ltr)
  - Two equal-width CTAs side-by-side via `grid-cols-2`:
    "ICS exportieren" (outline) and "Details ›" (primary).
- `TerminVorbereitungChecklist.tsx` — **kept on disk** but no longer
  rendered. Comment at top notes the deprecation for a follow-up
  cleanup pass. (Matches `DiffStatCard` precedent in v2-dashboard.)
- `TermineView.tsx` — re-wires the right column:
  - Removes the `RightRailCard` "Nächster Schritt" detail block.
  - Renders the new `<NaechsterSchrittCard>`.
  - Removes the vorbereitung-checklist branch.
  - Renders the new `<GutVorbereitetCard>`.
  - Replaces the inline `fristen` listing with a compact
    `<FristenUeberblickCard>`.
  - Removes the implicit "header" of "Weitere Termine & Erinnerungen"
    (h2) and instead wraps the further-items list + "Alle Termine
    anzeigen" footer inside a `<SectionCard title="Weitere Termine &
    Erinnerungen">`. The current top-of-list `h2` was unnecessarily
    duplicated.

### New components (under `src/components/termine/`)

- `NaechsterSchrittCard.tsx` — right-rail recap of the next termin.
  Renders the same data as `NaechsterTerminCard` in a more compact
  shape: top row with calendar icon + Behörde-Betreff stacked + small
  Bestätigt pill; dl rows for date / time-duration / location /
  Buchungsreferenz; two stacked CTAs (ICS exportieren / Details
  anzeigen). No left-edge strip (right column is a thin rail).
- `GutVorbereitetCard.tsx` — static three-row informational card.
  Hardcoded DE inline:
  - 🎒 **Bringen Sie bitte mit** — Reisepass, alten Aufenthaltstitel,
    biometrisches Passfoto und Bearbeitungsgebühr.
  - ⏰ **Planen Sie genug Zeit ein** — Rechnen Sie mit ca. 60 Minuten
    inklusive Wartezeit vor Ort.
  - ✖ **Nicht wahrnehmen?** — Stornieren oder verschieben Sie den
    Termin bitte spätestens 24 Stunden vorher.
- `FristenUeberblickCard.tsx` — compact card: check-icon + one-line
  summary ("{n} offene Frist(en) — nächste {label}") + an outline
  link-style button "Fristen anzeigen ›" (hardcoded DE inline) that
  routes to `/dashboard?focus=fristen`. When there are no fristen the
  card shows "Keine offenen Fristen." with no CTA.

`TerminListRow` / `ReminderListRow` are kept as local helpers inside
`TermineView.tsx`. The footer "Alle Termine anzeigen" is also a local
button (hardcoded DE) on the inside of the new `SectionCard` wrapper.

## 5. Mock-data shape

No new fields. Reused as-is:

- `Termin.{id, behoerde_id, datum, ort, status, betreff, buchungsreferenz,
  kategorie}` — all already populated in `src/data/termine.json`.
- `Termin.vorbereitung` — present in seeds (the LEA + Bürgeramt entries
  have items). The redesign no longer renders this field; the seeds
  stay valid.
- `Reminder.{id, behoerde_id, titel, datum, kategorie, frist_typ}` —
  unchanged.
- `Behoerde.name_de` — unchanged.

The chronologically-next non-cancelled future termin remains the
"Nächste Termine" featured card. When a day is selected on the
calendar, the further-items list filters to that day (existing
behaviour — preserved). When no termin exists at all, the existing
`EmptyState` is shown in place of the featured card.

## 6. Visual treatment

- **Featured next-termin card (center)**:
  `relative overflow-hidden border bg-card p-5 gap-4`. A 4 px cobalt
  strip is rendered as `<span aria-hidden class="absolute inset-y-0
  start-0 w-1 bg-primary" />`. Card content has `ps-3` left-padding to
  clear the strip.
- **Calendar today cell**: `bg-primary text-primary-foreground
  font-semibold`. **Calendar selected (not today) cell**: `ring-1
  ring-inset ring-primary text-primary`. **Calendar event dot**:
  `size-1 rounded-full bg-primary/70` (out-of-month: `bg-text-muted/40`).
- **Filter swatches**: `size-2.5 rounded-full` with the colour mapping
  above. `aria-hidden` (label carries the meaning).
- **Right-rail "Nächster Schritt" card**: standard `Card` chrome
  (`border bg-card p-5`), no left strip. Calendar IconCircle (primary
  soft, lg), title block, dl rows, two stacked buttons (`grid grid-cols-1
  gap-2`).
- **"Gut vorbereitet zum Termin" card**: standard `Card` chrome. Three
  rows each: small IconCircle (neutral tone, size `md`) + `<div>` with
  bold title + secondary-text body. Adequate row separation via
  `space-y-3`.
- **"Fristen im Überblick" card**: standard `Card` chrome. One row:
  `IconCircle` with check (success tone, size `md`) + small summary
  text; below: outline link to /dashboard.

## 7. Diverges-from-current summary

| Area | Current code | Sketch / new |
|---|---|---|
| Calendar today | Cobalt ring (outline) | Filled cobalt (`bg-primary`) |
| Calendar selected | Filled cobalt | Cobalt outline (`ring-1 ring-primary`) |
| Calendar event dot | `bg-primary` solid | `bg-primary/70` softer; muted for OOM days |
| Filter swatch erinnerungen | `bg-warning` amber | `bg-success` green |
| Filter swatch buchungen | `bg-success` green | `bg-warning` amber |
| Featured card accent | None | 4 px cobalt left strip |
| Featured card CTAs | `flex-wrap gap-2` | Two equal-width `grid-cols-2` |
| "Weitere" wrapper | bare h2 + bare `<ul>` | wrapped in `SectionCard` with footer button |
| Right-rail "Nächster Schritt" | Slim `RightRailCard` with subset | New `NaechsterSchrittCard` mirroring featured shape |
| Right-rail vorbereitung | Abhakbare checklist | Static 3-row info card `GutVorbereitetCard` |
| Right-rail fristen | Long list | Compact `FristenUeberblickCard` + link |

## 8. Won't replicate (intentional)

- Sketch shows "Mai 2025" — month label is driven by the visible month
  state (`date-fns` formats with `de`). The first render snaps to the
  month containing today/selected, which on the seeded demo date is
  "Mai 2026". Matching the literal sketch label would require hard-pinning
  the visible month and is out of scope.
- Sketch shows duration ("60 Min.") next to the time. We do not store
  duration on `Termin`; we render the local string `"60 Min."` as a
  default hint per the buildIcs `DEFAULT_DURATION_MIN` constant.
- Sketch's right-rail cards repeat the same icon (calendar) on the
  "Nächster Schritt" block — matched. The featured card uses a
  Landmark (Behörde) icon for differentiation; the spec keeps a
  CalendarDays icon on both to mirror the sketch exactly.
- The sketch shows static "Bestätigt" pills on both blocks — we drive
  the pill from `termin.status` via the existing `StatusBadge` mapping
  (`gebucht` → bestaetigt variant). When the seed has `gebucht` we
  still render the bestaetigt label via `STATUS_TO_VARIANT`.

## 9. Files touched

Created:

- `src/components/termine/NaechsterSchrittCard.tsx`
- `src/components/termine/GutVorbereitetCard.tsx`
- `src/components/termine/FristenUeberblickCard.tsx`

Edited:

- `src/components/termine/MonthCalendar.tsx`
- `src/components/termine/TermineFilter.tsx`
- `src/components/termine/NaechsterTerminCard.tsx`
- `src/components/termine/TermineView.tsx`

Left untouched (existing): `TerminVorbereitungChecklist.tsx` (no longer
rendered; cleanup deferred — same precedent as `DiffStatCard.tsx` in
`prototype-v2-dashboard.md` § 9). `buildIcs.ts` unchanged.
`src/app/(app)/termine/page.tsx` unchanged.

## 10. Verify

- `npx tsc --noEmit` runs clean.
- Manual smoke (not in scope for this written pass): the page renders
  with the filled-today cell, the outline-selected cell, the cobalt
  left strip on the featured card, two equal-width CTAs, the new
  three-row "Gut vorbereitet" card, and the compact "Fristen im
  Überblick" card with the "Fristen anzeigen ›" CTA.

## 11. Follow-ups (post this pass)

- i18n extraction of the inline-hardcoded DE strings ("Alle Termine
  anzeigen", "Fristen anzeigen ›", "60 Min.", and the three
  `GutVorbereitetCard` bullets) into `termine.*` keys + parity across
  5 non-DE locales.
- Decision on `TerminVorbereitungChecklist.tsx`: delete the file once
  the new info card is accepted (it carries `vorbereitung[]` rendering
  logic now unreachable from the screen).
- Optional: surface `vorbereitung[]` content inside the new
  `GutVorbereitetCard` "Bringen Sie bitte mit" row when the termin has
  per-termin items (currently this row is static).
