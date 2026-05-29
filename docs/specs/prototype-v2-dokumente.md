---
feature: prototype-v2-dokumente
title: Dokumente — Prototyp v2 Re-skin (Vault)
status: in_progress
track: supporting
date: 2026-05-28
author: frontend-coder
authorization: branch `redesign-prototype-sweep` — user-supplied new prototype sketch (`08be4002-dfd9-4ad8-8713-deb736a597db.png`). Builds on top of shipped `redesign-dokumente.md`. Scope strictly limited to `src/app/(app)/dokumente/**` + `src/components/dokumente/**`. **No commit. No i18n JSON edits. No new top-level routes.**
inputs:
  prototype: C:/Users/iaiaa/Downloads/08be4002-dfd9-4ad8-8713-deb736a597db.png
  previous_spec: docs/specs/redesign-dokumente.md (shipped 2026-05-27)
  existing_code: src/app/(app)/dokumente/page.tsx, src/components/dokumente/{DokumenteView,DokumentRowActions,DokumentPreviewDialog,deriveDocumentStatus}.tsx
gates: redesign-foundation APPROVE (already merged); shipped redesign-dokumente APPROVE.
---

> **Foundation contract.** Tokens, shell, shared primitives, status-label keys, and the
> existing `dokumente.*` i18n subtree are **frozen** for this iteration. This spec only
> re-skins the existing screen to match the new prototype sketch. No new i18n keys, no new
> shared primitives, no data-model changes.

## 1. Scope of this iteration

This is a **visual-only re-skin** of the existing Dokumente screen against a new user-supplied prototype sketch. The previous redesign (`redesign-dokumente.md`) already established the data model, mock-backend behaviour, status derivation, i18n keys, and a11y contract. Everything from § 4.5 (status derivation), § 6 (data model), § 7 (no AI), § 8 (i18n) and § 9 (edge cases) of that spec is **inherited unchanged**.

The new sketch tightens the visual language. The deltas this iteration must land:

1. **Per-Kategorie tint** for the row `IconCircle` (cobalt / amber / emerald / violet). Currently all rows render with `tone="primary"`.
2. **Kategorie column as a tinted chip** (not plain text) that matches the row icon tone.
3. **No `FilterButton`** in the tabs row — the sketch shows tabs only. Sort/Status filtering moves into sortable table headers (already wired for `dokument`, `status`, `daten`) + a small status legend implied by the badges. The popover is removed from the visible chrome.
4. **„Zuletzt hinzugefügt" right-rail card** shows the document name **and a right-aligned date** for each entry; footer link „Alle anzeigen" (`common.show_all`) navigates back to the search-cleared list.
5. **„Schnellzugriff" right-rail card** rows align tighter and use the per-action tone (Upload = cobalt/primary, Ordner = emerald, Vorlagen = amber, Papier = violet) so the rail mirrors the table icons.
6. **„Teilen & verwenden"** keeps the existing copy + primary CTA; the card uses the `soft` (cobalt-tinted) variant for visual hierarchy with the row above.

That's it. Search, tabs-with-counts, the DataTable shape, pagination, the preview dialog, the demo-toast on non-implemented actions, the status-derivation helper, and SSR-stable `nowIso` all stay.

## 2. Non-goals (explicit)

- No new i18n keys. (Hard rule from session prompt.)
- No shared layout / theme token edits.
- No new shared primitives.
- No mock-backend additions.
- No data-model changes.
- No new routes.
- No commit.
- No edits outside `src/app/(app)/dokumente/**` + `src/components/dokumente/**`.

If the sketch implies copy that does not exist as a key today (e.g. small grey sub-labels under Schnellzugriff rows like „PDF, JPG, PNG"), that copy is **dropped** for this iteration rather than hardcoded.

## 3. Files touched

| Path | Change |
|---|---|
| `src/app/(app)/dokumente/page.tsx` | none |
| `src/components/dokumente/DokumenteView.tsx` | re-skin: drop `FilterButton`/`SortFilterPopover`, tinted IconCircle + tinted kategorie chip, dated „Zuletzt hinzugefügt" list, tinted Schnellzugriff rows, soft variant on „Teilen & verwenden" |
| `src/components/dokumente/DokumentRowActions.tsx` | none |
| `src/components/dokumente/DokumentPreviewDialog.tsx` | none |
| `src/components/dokumente/deriveDocumentStatus.ts` | none |
| `src/components/dokumente/kategorieTone.ts` *(NEW, ≤ 25 lines)* | central map `DocumentKategorie → { icon-tone, chip-variant }` |

`kategorieTone.ts` is a **local module** under `src/components/dokumente/` — not a shared primitive — and is allowed by the session rules (scope is `src/components/dokumente/**`).

## 4. Visual deltas — sketch-to-code mapping

### 4.1 Row icon tone (per Kategorie)

| Kategorie | `IconCircle` tone | `Badge` variant for chip |
|---|---|---|
| `ausweise` | `primary` (cobalt) | `info` |
| `bescheide` | `warning` (amber) | `warning` |
| `familie` | `success` (emerald) | `success` |
| `vertraege` | `neutral` (purple-ish in dark, neutral in light — see § 4.2) | `neutral` |

The shared `IconCircle` accepts `tone: 'neutral' | 'primary' | 'success' | 'warning' | 'danger'`. No `violet` tone exists in the foundation. `vertraege` therefore uses `neutral` for both the icon circle and the chip — the sketch's violet hint is **not reproduced** to avoid editing shared tokens. (Acceptable deviation, documented in § 7.)

### 4.2 Kategorie column

Rendered as `<StatusBadge>`? No — `StatusBadge` is for `common.status.*` semantics. The kategorie chip is a plain `<Badge variant=…>` from `src/components/ui/badge.tsx`. Label text = `t('dokumente.kategorie.<id>')` (already in i18n).

```tsx
<Badge variant={KATEGORIE_CHIP_VARIANT[kategorie]} size="sm">
  {t(`kategorie.${kategorie}`)}
</Badge>
```

### 4.3 Tabs row

`FilterTabs` only. The `SortFilterPopover` and `FilterButton` import are removed. Sorting remains accessible via the sortable column headers (`dokument`, `status`, `daten`) — `DataTable` already exposes this via `onSort` + `aria-sort`. Status filtering is dropped from the UI surface (was a sketch-deviation in v1 anyway — the sketch does not show a status filter). If a viewer needs to narrow by status, the FilterTabs + the visible status badges in-table do that job.

### 4.4 „Zuletzt hinzugefügt"

3 entries, sorted by `ausgestellt_am DESC`. Each row:

```
[tiny IconCircle, kategorie-tinted, size="sm"]  Dokumenttitel        13.05.2026
```

The date is `formatDateDe(doc.ausgestellt_am)` with `tabular-nums` + `dir="ltr"` on the span (RTL safety). Whole row is a button that opens the preview dialog (same behaviour as today).

Footer = a single button styled as a link: text = `t('common.show_all')` + `ArrowRight` icon. Clicking it clears search + resets active tab to `alle` + resets to page 1.

### 4.5 „Schnellzugriff"

Same 4 actions, same i18n keys, same Toast behaviour. Per-action tones:

| Action | Icon | `IconCircle` tone |
|---|---|---|
| `schnellzugriff.upload` | `Upload` | `primary` |
| `schnellzugriff.ordner` | `FolderPlus` | `success` |
| `schnellzugriff.vorlagen` | `LayoutTemplate` | `warning` |
| `schnellzugriff.papier` | `Inbox` | `neutral` |

### 4.6 „Teilen & verwenden"

Switch `RightRailCard` from default to `variant="soft"` (cobalt-tinted background). Hint copy + CTA unchanged. The CTA opens the most-recent document's preview (existing behaviour).

## 5. Accessibility — invariants preserved

- Exactly one `<h1>` (`PageHeader`); right-rail card titles remain `<h2>`/`<h3>` per primitive defaults.
- `DataTable` stays a real `<table>` with `<th scope="col">` + `aria-sort` on sortable headers.
- Row-action icons keep individual `aria-label`s incl. document name.
- `tabular-nums` + `dir="ltr"` on Nr. / Datum spans (HL-DS-6).
- `Badge` for the kategorie chip is non-interactive; colour alone never carries meaning — the label text is always present.
- Status badges keep their dot/check/icon semantics (Verifiziert = success+check, Neu = info+dot, Ablauf bald = warning, Abgelaufen = danger).
- „Alle anzeigen" footer is a `<button type="button">` (it mutates client state — not a `<Link>`).
- Right-rail Schnellzugriff buttons keep ≥ 44px touch target.
- Loading skeleton retains `motion-reduce:animate-none`.

## 6. State & data — unchanged

All client state (search, activeTab, sort, page, pageSize, previewDoc, previewOpen) stays. `statusFilters` and `filterOpen` are removed (popover is gone).

Backend calls unchanged: `api.getDocuments()` + `api.getBehoerden()` on mount; `nowIso` flows from RSC for SSR-stable status derivation.

## 7. Known deviations from the sketch

| # | Sketch detail | This iteration | Reason |
|---|---|---|---|
| 1 | Verträge rows tinted violet/lilac | Rendered with `neutral` tone | No violet tone in foundation; adding one requires shared token edit (forbidden). |
| 2 | Sub-labels under Schnellzugriff rows („Aus Datei", „PDF, JPG, PNG", …) | Dropped (label only) | Would require new i18n keys (forbidden this iteration). |
| 3 | Status legend chip „Ablauf bald" with clock + „Abgelaufen" with X | Uses existing `StatusBadge` (warning + danger variants, no clock icon) | Adding a clock leading-icon for `ablauf_bald` would mutate shared `StatusBadge`; deferred. |
| 4 | Standalone „Filter" button at end of tabs row | Removed entirely | The sketch itself does NOT show a separate Filter button — v1 added the popover defensively. The sortable headers cover the same need. |
| 5 | Right-rail „Schnellzugriff" 4-row layout | Preserved | Already matches. |

## 8. Verify

- `npx tsc --noEmit` must pass cleanly across the touched files.
- `pnpm lint` not required by the session prompt but should not regress.
- Manual smoke: nav to `/dokumente`, expect tabs row without trailing Filter button, tinted row icons, tinted kategorie pills, dated „Zuletzt hinzugefügt" entries, soft-cobalt „Teilen & verwenden" card.

## 9. Follow-ups (not this iteration)

- Add a `violet` tone to `IconCircle` + a corresponding `Badge` variant if we want the Verträge row to match the sketch's lilac hue.
- Add `clock` leading-icon to `StatusBadge` `ablauf_bald` variant.
- Add `dokumente.schnellzugriff.*_sub` i18n keys for the small sub-labels.
- Reintroduce status-filter as a popover **only** if user research shows the legend/tabs are not enough.

## Build log — frontend-coder

- date: 2026-05-28
- screens implemented: `/dokumente` (re-skin only)
- components created: `src/components/dokumente/kategorieTone.ts`
- components modified: `src/components/dokumente/DokumenteView.tsx`
- i18n keys added (DE source): **none** (per session rule)
- typecheck: pass
- lint: (not run, optional)
- known gaps: see § 7 (violet tone, sub-labels, clock-icon, status-filter) — all explicit deferrals.
- next: a11y-tester (focus the new chip semantics + the Zuletzt-Card date column RTL), then code-reviewer.
