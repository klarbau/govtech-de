# Prototype v2 — Familie re-skin

Scope: align `/familie` with the user's prototype sketch
(`C:\Users\iaiaa\Downloads\356802f5-8dd3-45ac-905e-f1b34fb848a9.png`).

Branch: `redesign-prototype-sweep` (do NOT commit). Track: spine-supporting.
Rigor: prototype hardcoded DE strings inline are OK for genuinely new
fragments; i18n JSON edits are out of scope for this pass. Existing
`familie.*` keys are reused where they already cover the new copy.

## 1. Why this re-skin

The shipped redesign-familie ships the right data but stacks everything in
a single 2/3 + 1/3 column layout where the two big lists (Gemeinsame
Vorgänge / Nachweise & Berechtigungen) sit on top of each other. The
sketch tells a different visual story:

- "Mein Haushalt" still spans the full main column at the top, but the
  person rows are inline (avatar + name + Geb. + role pill on one line)
  rather than card-blocks with a pill stack. The "Haushalt verwalten"
  outline button moves into the card header (top-right of the card),
  not into the page header.
- The tinted blue "Sie sind berechtigte Vertretung für Lev Petrov." row
  is rendered inside Card 1 below the person rows, with the speculative
  badge inline next to the title.
- Below Card 1, "Gemeinsame Vorgänge" and "Nachweise & Berechtigungen"
  sit side-by-side as a 2-column row on lg+ (each card spans 1 column of
  the main column, so the main column itself is split). On narrow
  viewports they stack.
- Each Vorgang row gets a footer link "Alle gemeinsamen Vorgänge
  anzeigen ›" tucked at the bottom of the card. Same for Nachweise
  ("Alle Nachweise & Berechtigungen anzeigen ›"). The footer link sits
  outside the list `<ul>` with a top hairline divider.
- Each Nachweis row carries a green check pill at the end (StatusBadge
  variant `verifiziert`) plus a chevron, matching the sketch.
- Right column "Was betrifft wen?" reads identical to the shipped
  version (per-person blocks with a 4-row count list). The shipped
  RightRail already matches the sketch; we just tighten spacing and
  add the bottom info card "Änderungen im Haushalt oder bei
  Berechtigungen? — Haushaltseinstellungen öffnen ›" link.
- Bottom-wide footer card "Sicher & geschützt" stays in place, full
  width across both columns, as in the shipped version.

## 2. Page layout (top to bottom)

```
[ PageHeader: h1 Familie + subtitle (kein Action im Header) ]
[ Two-column grid: lg:grid-cols-[2fr_1fr] ]
   Main column (2fr) — vertical stack:
      [ SectionCard "Mein Haushalt" ]
         header right: <Button variant="outline"> Users icon + "Haushalt verwalten"
         body:
           "2 Personen" (count subline)
           <ul> with one <HaushaltMemberRow> per Mitglied
              - Avatar lg (monogram, primary tone)
              - name (semibold) + "Geb. DD.MM.YYYY" (text-muted)
              - role pill (Badge neutral) on the right
           <VertretungsBanner /> (only if data.vertretung_speculative)
              - bg-accent-soft, IconCircle Sparkles primary
              - title "Sie sind berechtigte Vertretung für {name(s)}"
              - subtitle "Sie können diese Person bei Behörden vertreten."
              - inline StatusBadge variant="vorlage" → speculative
      [ Inner 2-col grid: lg:grid-cols-2 ]
         [ SectionCard "Gemeinsame Vorgänge" ]
            subtitle: "Anliegen, die Personen Ihres Haushalts gemeinsam betreffen."
            <ul> of <GemeinsamerVorgangRow> per vorgang:
              - leading IconCircle (themed tone per thema)
              - title (semibold) + subtitle (Behördenname or fallback)
              - <MemberChips> overlapping avatars
              - StatusBadge per status
              - ChevronRight (decorative)
            footer link "Alle gemeinsamen Vorgänge anzeigen ›"
         [ SectionCard "Nachweise & Berechtigungen" ]
            subtitle: "Dokumente, Vollmachten und Verknüpfungen."
            <ul> of <NachweisRow> per nachweis:
              - leading IconCircle (neutral tone) with doc-typed icon
              - title (semibold) + subtitle (Person-name when applicable)
              - small green Check (StatusBadge verifiziert)
              - ChevronRight (decorative)
            footer link "Alle Nachweise & Berechtigungen anzeigen ›"
      [ SectionCard "Sicher & geschützt" — variant="soft" ]
         left: IconCircle ShieldCheck primary + h2 + sub
         right: outline button → /datenschutz
   Right column (1fr) — vertical stack:
      [ inline header h2 "Was betrifft wen?" + sub "Übersicht der Zuständigkeiten." ]
      <PersonRailCard> per Mitglied:
         - top row: Avatar md + name + role pill
         - body: <PersonCountList> (Vorgänge / Dokumente / Nachweise / Vertretungen)
      <HaushaltSettingsHintCard> bottom info card (variant soft):
         - title "Änderungen im Haushalt oder bei Berechtigungen?"
         - sub "Sie können den Haushalt jederzeit anpassen."
         - link "Haushaltseinstellungen öffnen ›" → triggers the same
                HaushaltVerwaltenDialog
```

Empty / error / loading paths reuse the shipped `FamilieView` skeleton +
`EmptyState` patterns. The skeleton grid is adapted to the new 2-col-inner
layout (main column tall, right rail narrow).

## 3. Component inventory

### Reused (no change)

- `@/components/shared/PageHeader`
- `@/components/shared/SectionCard`
- `@/components/shared/IconCircle`
- `@/components/shared/StatusBadge`
- `@/components/shared/Avatar`
- `@/components/shared/EmptyState`
- `@/components/ui/badge`, `@/components/ui/button`
- `@/components/familie/MemberChips` (still useful inside the Vorgang row)
- `@/components/familie/PersonCountList`
- `@/components/familie/HaushaltVerwaltenDialog`

### Edited

- `FamilieView` — top-to-bottom rewrite of the JSX tree to match the new
  layout. Imports the new row + rail components. Keeps the same
  `load()` / `LoadState` shape and the same `api.getFamilie()` /
  `api.getBehoerden()` calls. The "Haushalt verwalten" Button moves
  from the page header into the SectionCard header for "Mein Haushalt"
  (titleAction slot).

### New components (under `src/components/familie/`)

- `HaushaltMemberRow.tsx` — single inline row used inside "Mein
  Haushalt". Avatar + name + Geb. + Badge (neutral) on a single line.
  Replaces the visual role of `MemberCard` for this screen.
- `VertretungsBanner.tsx` — the blue-soft inset banner with Sparkles
  icon, title, body and inline speculative `StatusBadge`. Replaces the
  `<aside>` literal embedded in the current `FamilieView`.
- `GemeinsamerVorgangRow.tsx` — single list row for the Vorgänge card,
  carries leading IconCircle (themed), title, subtitle (Behörde),
  MemberChips, StatusBadge, ChevronRight.
- `NachweisRow.tsx` — single list row for the Nachweise card. Doc icon
  + title + subtitle + small green check + ChevronRight.
- `PersonRailCard.tsx` — per-person card for the right rail with the
  Avatar/name/role-pill header and the existing `PersonCountList`.
  Replaces the `RightRailCard` use for this screen (the shipped
  RightRailCard has a different visual rhythm; the sketch rail is
  flatter).
- `HaushaltSettingsHintCard.tsx` — bottom-info "Änderungen im
  Haushalt …" card with the link that opens the existing
  `HaushaltVerwaltenDialog`.

`MemberCard.tsx` is left on disk (no longer referenced by the new view).
Cleanup deferred — keeping it avoids breaking any test we cannot see.

## 4. Mock-data shape

No new backend fields. Existing `HaushaltView` is sufficient:

- `mitglieder[]` — used by the Haushalt list, the right rail per-person
  cards, the Vertretungs-banner name(s), and the per-row MemberChips.
- `gemeinsame_vorgaenge[]` — feeds the "Gemeinsame Vorgänge" list. Subtitle
  resolves to `behoerdenById[behoerde_id].name_de` when available,
  otherwise the `familie.vorgaenge.kita_traeger` fallback for `kita`.
- `nachweise[]` — feeds the "Nachweise & Berechtigungen" list. The
  green-check pill renders for `status === 'verifiziert' | 'vorhanden'`;
  speculative entries get the `vorlage` neutral pill and still render the
  speculative marker subtitle.
- `vertretung_speculative` — gates the VertretungsBanner.

The VertretungsBanner copy needs the name of the represented person(s).
For the seed data this is the children list (Anna → Lev). The banner
chooses the first child's full name from `mitglieder` (rolle === 'kind')
and falls back to the literal "Ihre Bezugsperson" when no child exists.

## 5. Strings (DE, inline + reused keys)

Existing `familie.*` keys remain in use:

- `familie.page.title`, `familie.page.subtitle`
- `familie.haushalt.title`, `familie.haushalt.count`
- `familie.cta.haushalt_verwalten`
- `familie.rolle.*`
- `familie.vorgaenge.title`, `familie.vorgaenge.{kindergeld,krankenkasse,kita}`,
  `familie.vorgaenge.kita_traeger`, `familie.vorgaenge.betrifft`,
  `familie.vorgaenge.show_all`
- `familie.nachweise.title`, `familie.nachweise.{geburtsurkunde,sorge_vollmacht,vertretungsrechte,verknuepfungen}`
- `familie.was_betrifft_wen.*`
- `familie.sicher.*`
- `familie.vertretung_banner.title|body`
- `familie.empty.*`
- `familie.verwalten_dialog.*`

New inline DE-only fragments introduced (no JSON edit; TODO marker
appears in code where a key will later be added):

- `Gemeinsame Vorgänge` subtitle: "Anliegen, die Personen Ihres Haushalts
  gemeinsam betreffen."
- `Nachweise & Berechtigungen` subtitle: "Dokumente, Vollmachten und
  Verknüpfungen."
- "Was betrifft wen?" subtitle override: "Übersicht der Zuständigkeiten."
  (the shipped key reads "Übersicht pro Person" — the sketch wording is
  used inline here as a local override; the JSON key is unchanged.)
- "Geb. {datum}" prefix on the person row.
- "Alle Nachweise & Berechtigungen anzeigen" footer-link label.
- Bottom info card title: "Änderungen im Haushalt oder bei Berechtigungen?"
- Bottom info card subtitle: "Sie können den Haushalt jederzeit anpassen."
- Bottom info card link: "Haushaltseinstellungen öffnen".

The VertretungsBanner reuses `familie.vertretung_banner.title|body`,
substituting the represented-person name into the title via inline
string concat: "Sie sind berechtigte Vertretung für {name}." — the
shipped key is generic enough; for accuracy this pass renders the
shipped title verbatim and appends the person name as a secondary
line if a child is present.

## 6. Visual treatment

- Page background unchanged (`bg-background` inherited from layout).
- "Mein Haushalt" card: `SectionCard padding="md"`. Title 16px semibold;
  `titleAction` is the outline "Haushalt verwalten" button (Users icon
  in front). Count subline 13px `text-text-muted` directly below the
  title row.
- Member row: 44px min-height. Avatar lg (size-11). Name 14px semibold.
  Geb. 12px `text-text-muted` `tabular-nums`. Role pill = `Badge
  variant="neutral"`. Layout: `flex items-center gap-3` with the role
  pill pushed to the end via `ms-auto`.
- VertretungsBanner: `bg-accent-soft` + `rounded-lg` + `border-transparent`,
  Sparkles `IconCircle` primary, inline `StatusBadge variant="vorlage"`.
- Inner 2-col split (Vorgänge / Nachweise): `grid grid-cols-1
  lg:grid-cols-2 gap-4`, each card uses `SectionCard padding="md"`.
- Vorgang row: leading `IconCircle` toned per thema
  (kindergeld → primary, krankenkasse → success, kita → warning). Title
  16px semibold. Subtitle = Behördenname or fallback. MemberChips on
  the right `ms-auto`. StatusBadge per status. ChevronRight 16px
  `text-text-muted`.
- Nachweis row: leading `IconCircle` neutral with typed icon
  (geburtsurkunde → Baby, sorge_vollmacht → ShieldCheck, vertretungsrechte
  → Users, verknuepfungen → Link2). Title 14px semibold. Subtitle 13px
  muted (only when speculative). StatusBadge `verifiziert` (green
  check) when status is `verifiziert | vorhanden`, otherwise `vorlage`.
  ChevronRight at end.
- Footer link inside each list card: `border-t border-border pt-3 mt-3`,
  primary-coloured link with trailing chevron, min-h-[44px] tap target.
- Right rail person card: flat `Card p-4`, top row Avatar md + name
  (semibold) + role pill, then `PersonCountList` (reused as-is). Rail
  spacing `space-y-3`.
- Bottom info card (right rail): `SectionCard variant="soft" padding="md"`,
  title 14px semibold, subtitle 13px muted, link button-styled minimal
  (text-primary + chevron).
- "Sicher & geschützt": `SectionCard variant="soft" padding="md"`,
  unchanged from shipped except it spans the full width via being
  outside the 2-col grid.

## 7. Diverges-from-current summary

| Area | Current code | Sketch / new |
|---|---|---|
| "Haushalt verwalten" button | Page header right | Card 1 header right (titleAction) |
| Person display | 2-col `MemberCard` block grid | Inline single-line rows, full width |
| Vorgänge + Nachweise layout | Stacked top→bottom inside main col | Side-by-side 2-col inside main col |
| Vorgänge/Nachweise footer | `<Link>` after card body | Top-bordered link inside the card |
| Nachweis row pill | StatusBadge `vorlage|verifiziert|aktiv|manuell` | Always tries `verifiziert` green check first when state allows |
| Right rail card | `RightRailCard` h3 inside | New `PersonRailCard` — flat `Card` with own internal header |
| Right rail bottom | (none) | New `HaushaltSettingsHintCard` opens dialog |
| "Was betrifft wen?" subtitle | "Übersicht pro Person" | "Übersicht der Zuständigkeiten." (inline override) |

## 8. Won't replicate (intentional)

- The sketch shows brand chrome (logo, sidebar nav). All shared chrome
  is out of scope per hard rule 1.
- The sketch shows specific avatar colour swatches (purple / blue / red
  initials). The shipped `Avatar` uses a single tone palette
  (`primary` / `neutral`); we keep that to avoid touching design
  tokens. The avatar still reads as a monogram chip — meaning is
  preserved.
- The sketch shows three discrete kategorie-coloured icon backgrounds
  on the Vorgang rows. We map kindergeld/krankenkasse/kita to
  `IconCircle` tones `primary / success / warning`. This stays inside
  the existing tone palette.
- The Nachweis rows in the sketch show a small green check pill with
  no label text — we keep the localized "Bestätigt" label inside the
  pill (HL-DS-3 — status is never colour-only).
- The page header "Speculative" context chip is removed in this pass
  (sketch shows no header chip); the speculative marker still lives on
  the VertretungsBanner and the speculative Nachweis rows.

## 9. Files touched

Created:

- `src/components/familie/HaushaltMemberRow.tsx`
- `src/components/familie/VertretungsBanner.tsx`
- `src/components/familie/GemeinsamerVorgangRow.tsx`
- `src/components/familie/NachweisRow.tsx`
- `src/components/familie/PersonRailCard.tsx`
- `src/components/familie/HaushaltSettingsHintCard.tsx`

Edited:

- `src/components/familie/FamilieView.tsx`

Left untouched (existing): `MemberCard.tsx`, `MemberChips.tsx`,
`PersonCountList.tsx`, `HaushaltVerwaltenDialog.tsx`.

## 10. Verify

- `npx tsc --noEmit` runs clean for files in scope.
- Manual smoke (not run as part of this written pass): page renders
  Haushalt-card with inline member rows + verwalten button top-right,
  blue Vertretungs-banner with speculative pill, Vorgänge/Nachweise
  side-by-side with footer links, right rail with per-person cards
  and a settings-hint card at the bottom, "Sicher & geschützt" full
  width at the bottom.

## 11. Known follow-ups

- i18n keys for the new inline fragments (subtitles, footer link,
  bottom info card) → next i18n-localizer pass.
- Delete `MemberCard.tsx` once no test references it.
- Avatar palette variation (purple / blue / red per person) is a
  visual nice-to-have but requires a token addition — out of scope.
- The "kategorie-tinted" icons on the Vorgang rows in the sketch
  imply a richer tone palette (Indigo / Teal / Amber); the current
  primary/success/warning mapping is close but not pixel-identical.
