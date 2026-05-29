# Prototype v2 — Datenschutz-Cockpit re-skin

Scope: bring `/datenschutz` back into alignment with the user's prototype sketch
(`C:\Users\iaiaa\Downloads\f4e8d407-765c-4f69-9102-e62fda542be8.png`).

Branch: `redesign-prototype-sweep` (do NOT commit). Track: spine-supporting.
Rigor: prototype-grade DE strings inline where they are new and not yet keyed;
i18n extraction is a separate later pass. **No locale JSON edits in this pass.**

## 1. Why this re-skin

The shipped `redesign-datenschutz` view is correct in structure and behaviour
(consent toggles persist; activity log uses the real `UebermittlungsLogEntry`
bucket; data sources table renders), but its **visual register** drifts from
the prototype. Concretely:

- The right rail only carries *one* card (Einwilligungen). The sketch has
  **two** stacked right-rail cards: Einwilligungen on top, Datenquellen &
  Empfänger below it.
- The Datenquellen table currently sits in the **main column** as a wide
  `<table>`. The sketch puts it in the **right rail** as a compact stack of
  rows (logo + label, two-line meta: status pill + date, trailing chevron).
- "Letzte Aktivitäten" rows are visually flat (neutral grey icon circle, badge
  inline with the title, no right-aligned date column). The sketch shows
  kategorie-tinted IconCircles **per row** (Posteingang→cobalt, KI-Funktion→
  violet, Übermittlung→amber, Download→teal, Einwilligung→emerald) and a
  right-aligned 2-line meta (`HH:mm · Heute|Gestern` over a small pill).
- "Ihre Datenschutz-Kontrolle" tiles are full-width horizontal rows today
  (icon left, label + 1-line description, no border weight). The sketch has
  three **equal-width** outline buttons in a row, icon **above** label,
  centred — visually closer to a quick-action triplet than a list.
- "Einwilligungen" rows currently render text-only (label + Rechtsgrundlage
  microcopy + right-aligned Ein/Aus + switch). The sketch shows a
  kategorie-tinted **leading IconCircle** + bold label + 1-line sub
  ("Datenfreigabe nach Art. 6 DSGVO"), and Weitere Dienste renders a
  **"Verwalten ›"** link instead of a switch (it gates a future drill-down,
  not a single binary).
- Each "Letzte Aktivitäten" and "Datenquellen" card carries a footer "Alle …
  anzeigen ›" link in the sketch; Einwilligungen carries
  "Einwilligungshistorie anzeigen ›". These exist partially today (timeline
  has a Show-all toggle; Einwilligungen has no history link).
- The cobalt "Spekulatives Demo-Feature" header pill and the dismissible blue
  "2027-Vision" banner already render correctly — kept as-is.

Behaviour, data, persistence, and privacy invariants are **unchanged**.

## 2. Page layout (top to bottom)

```
[ PageHeader: h1 Datenschutz + subtitle + cobalt pill ]

[ DatenschutzVisionBanner (dismissible, persisted) ]

[ Two-column grid: 2fr / 1fr on lg ]
  LEFT column:
    SectionCard "Letzte Aktivitäten" (Clock icon)
      - ActivityTimelineRow x N (default 5)
          * leading IconCircle (kategorie-tinted: cobalt|violet|amber|teal|emerald|slate)
          * title (semibold) on row 1
          * subtitle (Behörde / partner) on row 2
          * right column (stacked, end-aligned):
              - "HH:mm" "Heute" or "Gestern · HH:mm" or `formatDateDe`
              - kategorie pill ("Posteingang"|"KI-Funktion"|"Übermittlung"|"Download"|"Einwilligung")
      - footer link "Alle Aktivitäten anzeigen ›" (toggle Show-all/less)

    SectionCard "Ihre Datenschutz-Kontrolle" (Shield icon)
      - 1-line subtitle
      - 3-column grid (responsive: 1 col on mobile, 3 on sm+) of
        KontrollAktionTile
          * icon centred on top, label centred below, optional 1-line
            description, outline button look, ≥ 44px tall

  RIGHT rail:
    RightRailCard "Einwilligungen" (Shield icon)
      - 1-line subtitle
      - ConsentToggleRow x 4 (Krankenkasse / Bank / Arbeitgeber / Weitere Dienste)
          * leading IconCircle (kategorie-tinted: emerald|cobalt|amber|slate)
          * label (semibold) + 1-line sub ("Datenfreigabe nach Art. 6 DSGVO")
          * trailing slot: `<Switch>` for Krankenkasse|Bank|Arbeitgeber;
            `<Verwalten ›>` link for Weitere Dienste
      - footer link "Einwilligungshistorie anzeigen ›" (no-op vision toast)

    RightRailCard "Datenquellen & Empfänger" (Database icon)
      - 1-line subtitle
      - DatenquellenRailRow x N (default 4)
          * leading BehoerdenBadge monogram (existing, colour-free)
          * title (semibold) on row 1: Behördenname
          * right column (stacked, end-aligned):
              - kategorie pill ("Automatisch synchronisiert" success-soft
                | "Einwilligungsbasiert" info-soft)
              - small `tabular-nums` date string or "aktuell"
          * trailing chevron (decorative)
      - footer link "Alle Datenquellen anzeigen ›" (no-op vision toast)
```

Loading uses the existing skeleton path. Error uses the existing
`EmptyState` + retry. Empty-log path renders the existing "Noch keine
Aktivitäten" inside the left card.

## 3. Component inventory

### Reused (no change)

- `@/components/shared/PageHeader`
- `@/components/shared/SectionCard`
- `@/components/shared/RightRailCard`
- `@/components/shared/IconCircle`
- `@/components/shared/StatusBadge`
- `@/components/shared/BehoerdenBadge`
- `@/components/shared/EmptyState`
- `@/components/ui/switch`, `@/components/ui/button`, `@/components/ui/card`
- `@/components/datenschutz/VisionBanner` (already dismissible, token-clean)

### Re-skinned in place (no new file, swap layout / props)

- `src/components/datenschutz/DatenschutzView.tsx`
  - Swap from 2fr/1fr where main column carried Timeline + Datenquellen +
    Kontrolle → 2fr/1fr where main column carries Timeline + Kontrolle, and
    right rail carries Einwilligungen + **new** Datenquellen rail card.
  - Pass `Activity`-tinted props down to ActivityTimelineRow.
  - Remove the `DataTable` rendering for Datenquellen; render the new
    `DatenquellenRailRow` list inside a `RightRailCard`.
  - Add footer links per card (existing show-all toggle for Timeline; new
    vision-toast handlers for Einwilligungs-Historie and "Alle Datenquellen").
  - Keep all `api.*` calls, subscribe loop, dismiss flow, toggle behaviour.

- `src/components/datenschutz/ActivityTimelineRow.tsx`
  - Replace neutral IconCircle with **kategorie-tinted** IconCircle (tone
    derived from `kategorie`, sketch palette: Posteingang→cobalt,
    KI-Funktion→violet, Übermittlung→amber, Download→teal, Einwilligung→
    emerald, fallback→slate).
  - Replace inline-after-title StatusBadge with right-aligned **stacked meta
    column**: 2-line block — "Heute · HH:mm" (or "Gestern · HH:mm" or
    `formatDateDe`) above the kategorie pill.
  - Keep `<time datetime>` for the absolute ISO timestamp.
  - Keep `wrapNormZitate` on `rechtsgrundlage` for the small footnote.

- `src/components/datenschutz/ConsentToggleRow.tsx`
  - Add a leading kategorie-tinted `IconCircle` (Heart for Krankenkasse,
    Landmark for Bank, Briefcase for Arbeitgeber, Boxes for Weitere Dienste).
  - Drop the right-aligned "Ein"/"Aus" text label (the switch + sub already
    communicate state; sub-text becomes the visible Rechtsgrundlage).
  - Add a `trailing?: ReactNode` slot so Weitere Dienste can render
    "Verwalten ›" link instead of a switch.

- `src/components/datenschutz/KontrollAktionTile.tsx`
  - Switch layout from horizontal-row to **vertical-tile**: icon centred on
    top, label centred below, optional 1-line description below.
  - Keep `<button>` semantics + 44px min target + outline border.

### New (this re-skin)

- `src/components/datenschutz/DatenquellenRailRow.tsx`
  - Right-rail row for one Datenquellen entry. Mirrors `ListRow` shape but
    optimised for the narrow rail: leading `BehoerdenBadge`-monogram, title
    + stacked meta column (kategorie pill on top, date string under it),
    trailing chevron.
  - Props: `behoerde: Behoerde | null`, `eintrag: DatenquellenEintrag`.

- `src/components/datenschutz/activityKategorieStyle.ts`
  - Pure lookup: `kategorie` → `{ tone: IconCircleTone, badgeVariant:
    StatusVariant, labelKey }`. Lives alongside the row component so the
    row stays a focused presentational unit.

## 4. Behaviour preserved (verify after re-skin)

- `api.getProfile() → getUebermittlungsLog / getBehoerden /
  getDatenschutzEinwilligungen / getDatenquellen / isVisionBannerDismissed`
  load sequence unchanged.
- Live timeline refresh on `stammdaten/log-entry-appended` unchanged.
- Toggle handler unchanged: optimistic update, `setDatenschutzEinwilligung`,
  re-fetch `getDatenquellen` (because Krankenkasse couples), revert + toast
  on error.
- VisionBanner dismiss + persistence unchanged; focus moves to the
  "Letzte Aktivitäten" heading.
- Datenexport / Einstellungen / Einwilligungs-Historie / "Alle Datenquellen"
  all open the existing `tKontrolle('vision_hint')` toast — no real PII
  export, ever (HL CLAUDE.md).
- All `<th>`-scope, `<time datetime>`, `<ul>`/`<li>`, `<h2>`/`<h3>` semantics
  preserved.

## 5. Strings (inline DE, not extracted this pass)

- New strings added inline (no JSON edit, per re-skin policy):
  - `"Verwalten"` (Weitere Dienste trailing link)
  - `"Einwilligungshistorie anzeigen"` (right-rail footer link)
  - `"Alle Datenquellen anzeigen"` — actually already exists as
    `datenschutz.quellen.show_all` → use the existing key.
  - Activity kategorie labels — reuse existing
    `datenschutz.activity.typ.{uebermittlung,eingang,app,vision}`. Sketch
    shows "Posteingang"/"KI-Funktion"/"Übermittlung"/"Download"/"Einwilligung"
    — these are *content-level* labels per row, **derived from the
    `zweck_i18n_key`/`kategorie` pair**, not free strings, so the existing
    keys cover them under their semantic names. Sketch wording is honoured
    via kategorie palette (cobalt/violet/amber/teal/emerald) rather than
    new labels.

i18n-localizer follow-up: keys for "Verwalten" and "Einwilligungshistorie
anzeigen" to be extracted in a later sweep.

## 6. Out of scope (explicit)

- No mock-backend changes. No new `api.*` methods. No new persistence keys.
- No new locale JSON. No DE source value re-wording for the existing keys.
- No drill-down screen behind "Verwalten" / "Einwilligungshistorie" /
  "Alle Datenquellen" — vision toast only.
- No `BehoerdenBadge` colourisation (HL-DS-10 still enforces colour-free).
- No new `<table>` for Datenquellen — explicit downgrade to rail-row list to
  match the sketch's compact stacked layout.

## 7. Verification

- `npx tsc --noEmit` clean.
- Smoke: `/datenschutz` renders Header pill + dismissible banner + Timeline
  with tinted IconCircles + Kontrolle tiles in a 3-column grid +
  Einwilligungen rail with tinted IconCircles + Weitere-Dienste "Verwalten" +
  Datenquellen rail with status pills + date + chevron + footer link.
- Manual toggle: Krankenkasse `Ein → Aus` flips switch; aria-live announce
  fires; a new "Einwilligung geändert" row appears at the top of the
  timeline (subscribe loop); Datenquellen Krankenkasse aktualität updates.
- Reload after toggle: state persists.

## 8. Known follow-ups (post-re-skin, separate sweep)

- i18n-localizer: extract DE inline strings `"Verwalten"` and
  `"Einwilligungshistorie anzeigen"` into `datenschutz.einwilligungen.*` and
  mirror across en/ru/uk/ar/tr.
- a11y-tester: re-run axe on the new layout (right-rail Datenquellen list +
  vertical Kontrolle tiles). Token contrast unchanged.
- Optional later: render the "Heute"/"Gestern"/`formatDateDe` segmenting
  via a tiny shared helper if Termine/Posteingang need the same shape.
