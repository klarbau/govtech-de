# Prototype v2 — Dashboard re-skin

Scope: bring `/dashboard` back into alignment with the user's prototype sketch
(`C:\Users\iaiaa\Downloads\059c4f65-2a69-4230-92e1-9837a69a6f72.png`).

Branch: `redesign-prototype-sweep` (do NOT commit). Track: spine-supporting.
Rigor: prototype hardcoded DE strings inline; i18n extraction is a separate
later pass. No locale JSON edits in this pass.

## 1. Why this re-skin

The shipped redesign-dashboard split the hero band into two equal-width cards
(`DashboardGreeting` on the left, a single `DiffStatCard` on the right) and
buried the "Letzter Login" timestamp inside the diff card's subtitle. The
sketch tells a different visual story:

- A wide left-leaning greeting card with the meta line `Letzter Login: ... -
  auf diesem Gerät` directly under the greeting, and the Demo-Modus banner
  rendered as an inline pill at the bottom of the greeting card.
- Three independent inline stat cards on the right (or wrapping below on
  narrow viewports) — one per diff counter — not a single combined card.
- A numbered, blue circular rank badge on each "Heute zu tun" row (the
  current code uses a small muted-text number).
- The 3x2 nav-tile grid below stays close to current shape (icon chip + title
  + sub + "Ansehen >" link), with a hairline divider above the CTA in each
  tile per sketch.

Everything else (sort tabs, FristCountdown, IconCircle, status pills) reads
correctly against the sketch and is reused as-is.

## 2. Page layout (top to bottom)

```
[ PageHeader: h1 Dashboard + subtitle ]
[ Greeting hero band ]
   left col (2/3 on lg):  Greeting card
                          - h2 "Guten Tag, Frau Petrov"
                          - meta: "Letzter Login: 14.05.2026 - auf diesem Gerät"
                          - inline DemoModusPill (blue soft, Info icon,
                            "Demo-Modus * Mock-Daten * Da ein BundID-Login
                             selten vorkommt, hilft Ihnen die Diff-Ansicht."
                            with "Disclaimer ansehen" link)
   right col (1/3 on lg): Stat strip (3 stacked-on-narrow,
                                      inline-row-on-lg)
                          - 3 x DiffStatTile
                            * neue Briefe (Inbox icon, primary tone)
                            * Frist näher gerückt (Clock icon, warning tone)
                            * Vorgang abgeschlossen (Check icon, success tone)
[ HeuteZuTunCard ]
   - h2 "Heute zu tun" + FilterTabs (KI/Frist/Behörde/Vorgang) on right
   - ordered list of TopActionRow (max 3)
       * RankBadge (blue solid circle, white "1"/"2"/"3", size 28)
       * Source IconCircle (existing primary tone)
       * Title (text-base, semibold)
       * FristCountdown (when frist_datum set)
       * StatusBadge (Fristnähe/Folgevorgang/Manuell priorisiert/Termin steht)
       * ChevronRight
[ NavTileGrid - 3 cols on lg, 2 on sm, 1 on mobile ]
   - 6 tiles in fixed order: Fristen, Posteingang, Vorgänge,
     Termine, Datenschutz-Cockpit, Stammdaten-Status
   - tile body: IconCircle + h3 title + 1-line value
   - hairline divider, then footer CTA "Ansehen >" (primary colour)
```

Empty / error / loading paths reuse `DashboardSkeleton` and the existing error
view in `DashboardView`. The skeleton grid is adapted to the new 2/3 + 1/3
hero layout.

## 3. Component inventory

### Reused (no change)

- `@/components/shared/PageHeader`
- `@/components/shared/SectionCard`
- `@/components/shared/IconCircle`
- `@/components/shared/StatusBadge`
- `@/components/shared/FristCountdown`
- `@/components/shared/FilterTabs`
- `@/components/shared/EmptyState`
- `@/components/shared/PrototypeDisclaimer`
- `@/components/dashboard/HeuteZuTunSortTabs`
- `@/components/dashboard/HeuteZuTunCard` (light internals tweak — pass
  `<TopActionRow>` the new `RankBadge`)
- `@/components/dashboard/NavTile`, `NavTileGrid`
- `@/components/dashboard/DashboardView` (light tweak — pass a new
  `lastLoginIso` to the greeting and render the new `DiffStatStrip` instead
  of `DiffStatCard`)
- `@/components/dashboard/DashboardSkeleton` (light tweak — 2/3 + 1/3 hero)

### Edited

- `DashboardGreeting` — now also renders the meta line "Letzter Login: ..."
  and embeds an inline `<DemoModusPill>`. Receives `lastLoginIso?: string`.
- `TopActionRow` — replaces the plain number span with a new
  `<RankBadge position={n} />` (blue solid circle, white text).
- `DashboardView` — hero layout becomes `grid lg:grid-cols-3`: greeting
  spans `lg:col-span-2`, stat strip spans `lg:col-span-1`. Passes
  `lastLoginIso` (derived from `snapshot.last_login_at` ?? prior-login
  anchor) into the greeting.
- `DashboardSkeleton` — same 2/3 + 1/3 hero shape.

### New components (under `src/components/dashboard/`)

- `DiffStatStrip.tsx` — renders three inline `<DiffStatTile>` items, falls
  back to the first-login / no-changes copy when applicable. Replaces the
  visual role of `DiffStatCard`.
- `DiffStatTile.tsx` — single small card (icon chip + big number +
  one-line label). Tone-driven (primary / warning / success).
- `DemoModusPill.tsx` — inline blue-soft pill with Info icon, banner text
  and the "Disclaimer ansehen" toggle that opens the existing
  `PrototypeDisclaimer`.
- `RankBadge.tsx` — 28px circular blue (`bg-primary`) badge with white
  semibold tabular numeral, used in `<TopActionRow>`.

`DiffStatCard.tsx` is kept on disk (it's still referenced from tests via
its module path? No — checked, only `DashboardView` imports it) and would
be deleted in a follow-up. For this prototype pass we replace its usage in
`DashboardView` only; the file is left so we don't accidentally break a
test file we can't see.
Update on a second pass: `DashboardView` is the only consumer
(`Grep "DiffStatCard"`). We will leave the file in place for now and not
delete it; explicit removal can happen in the next reviewer/cleanup pass.

## 4. Mock-data shape

No new backend fields. We use the existing `DashboardSnapshot`:

- `snapshot.last_login_at` — when present, drives the greeting meta line.
  When absent, the greeting meta line is hidden and the diff strip shows
  the first-login fallback.
- `snapshot.diff_block.{neue_briefe, fristen_naeher_gerueckt,
   vorgaenge_abgeschlossen, total_changes, last_seen_at}` — same semantics
  as today; the new `<DiffStatStrip>` reads `total_changes === 0` to render
  the "no changes" fallback and `last_seen_at === undefined` for the
  first-login fallback.
- `snapshot.top_actions` — unchanged.
- `snapshot.frist_tile / posteingang_tile / termin_tile / dsc_tile /
   vorgangs_stand_tile / stammdaten_tile` — unchanged; consumed by the
  existing `NavTileGrid`.

`DashboardView` already anchors a prior-login 14 days before "now" for the
demo. We will surface that same value as `last_login_at` on the snapshot
(`api.getDashboard` already sets `last_login_at: opts.last_seen_at`, see
mock-backend). When the snapshot's `last_login_at` is undefined we hide the
greeting meta line.

## 5. Strings (DE, inline — hardcoded for this pass)

Existing `dashboard.*` keys remain in use. New strings introduced inline
(only inside the dashboard components, no i18n JSON edit):

- Greeting meta: `Letzter Login: {datum} · auf diesem Gerät`
  (the `{datum}` is formatted via `date-fns` with `dd.MM.yyyy`).
- Demo-modus pill text and "Disclaimer ansehen" link — already in
  `dashboard.demo_banner.*`, reused.
- Stat-tile labels reuse `dashboard.diff.neue_briefe`,
  `dashboard.diff.frist_naeher`, `dashboard.diff.vorgang_abgeschlossen`.

No new locale-JSON keys are added. The single new hardcoded German fragment
("Letzter Login: {datum} · auf diesem Gerät") is annotated with a TODO
in the source for the later i18n pass.

## 6. Visual treatment

- Background: page sits on `bg-background` (light) / `bg-muted` (dark
  inherits from theme). Cards remain `Card` (`bg-card`).
- Hero greeting card: `SectionCard padding="md"`, h2 18px semibold,
  meta line 13px `text-text-muted`, demo-modus pill at the bottom inside
  a `mt-4` block with `bg-accent-soft` and `rounded-md`.
- Stat tiles: `Card` variant with `p-4`, `gap-2`, icon chip via
  `IconCircle size="sm"`, number `text-2xl font-bold tabular-nums`,
  label `text-xs text-text-secondary`. Stack vertically on the right
  column at `lg`; collapse to a 3-column inline strip at `sm` and below `lg`.
- RankBadge: `size-7 rounded-full bg-primary text-primary-foreground
  text-sm font-semibold tabular-nums inline-flex items-center justify-center`.
- NavTile: existing component reused; we add a thin top border above the
  CTA span (`border-t border-border pt-3`) to match the sketch's hairline
  divider above the "Ansehen >" link.

## 7. Diverges-from-current summary

| Area | Current code | Sketch / new |
|---|---|---|
| Hero band layout | 2 equal cards (greeting / diff) | 2/3 greeting + 1/3 stat strip |
| Diff visualisation | Single `<DiffStatCard>` | Three inline `<DiffStatTile>` cards (`<DiffStatStrip>`) |
| "Letzter Login" meta | Inside diff-card subtitle | Inline meta under the greeting h2 |
| Demo-modus banner | Inside greeting card body (single line) | Same place but rendered as a `<DemoModusPill>` |
| Heute-zu-tun rank | Plain muted numeral | Blue circular `<RankBadge>` |
| NavTile CTA | No divider above CTA | Hairline `border-t` above the CTA span |

## 8. Won't replicate (intentional)

- The sketch shows a logo + product wordmark in the page header area;
  that lives in `Topbar` (shared chrome) and is out of scope.
- The sketch shows the left sidebar with "Dashboard" highlighted; sidebar
  ordering / highlighting is shared chrome and out of scope.
- The sketch's tile icons differ slightly (e.g. a clipboard for Vorgänge
  vs the current folder); the existing `lucide-react` choices already
  selected by the redesign-dashboard spec are kept to avoid icon churn.
- We do not change the sort-tabs visual or behaviour — the sketch shows
  identical pill tabs.

## 9. Files touched

Created:

- `src/components/dashboard/DiffStatStrip.tsx`
- `src/components/dashboard/DiffStatTile.tsx`
- `src/components/dashboard/DemoModusPill.tsx`
- `src/components/dashboard/RankBadge.tsx`

Edited:

- `src/components/dashboard/DashboardView.tsx`
- `src/components/dashboard/DashboardGreeting.tsx`
- `src/components/dashboard/TopActionRow.tsx`
- `src/components/dashboard/NavTile.tsx`
- `src/components/dashboard/DashboardSkeleton.tsx`

Left untouched (existing): `DiffStatCard.tsx` (no longer referenced after
this pass; cleanup deferred). `HeuteZuTunCard.tsx` keeps its props.

## 10. Verify

- `npx tsc --noEmit` runs clean for files in scope.
- Manual smoke (not run as part of this written pass): page renders with
  three stat tiles, blue rank badges, meta line under the greeting, hairline
  divider above each tile CTA.
