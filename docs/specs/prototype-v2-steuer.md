# Prototype v2 — Steuer re-skin

Scope: bring `/steuer` back into alignment with the user's prototype sketch
(`C:\Users\iaiaa\Downloads\c880f1f6-f790-407f-8660-48eaf3160d67.png`).

Branch: `redesign-prototype-sweep` (do NOT commit). Track: spine-supporting.
Rigor: prototype uses hardcoded DE inline strings for sketch-only labels
that don't have an existing i18n key (sub-labels, trust line, "Stand:"
prefix, three-tile data-source captions). All existing keys under
`steuer.*` are reused. No locale JSON edits in this pass.

## 1. Why this re-skin

The shipped redesign-steuer renders the Steuer screen as a vertical stack of
three independent cards: a hero (Steuerjahr + Erstattung + 4 Datenquellen as
2-column tiles), a separate horizontal stepper, and a 4-column table — and a
right rail of three "RightRailCard"s (Fristen, Verwendete Nachweise,
Datenschutz). The user's sketch tells a different visual story:

- One **wide hero card** with two-column body: a LEFT cluster
  (label + huge cobalt amount + green-check trust line) and a RIGHT cluster
  (small "Datenquellen" label + horizontal 3-tile inline strip + one wide
  "Bereits bekannte Daten" tile spanning the row below). The "Stand:" line
  sits inline next to the cobalt "Entwurf" pill at the top right of the card.
- "Ihr Fortschritt" stepper is its own card, but each step has a fuller
  text body (label + sub-line) and a true horizontal connector between
  circles. The current step gets a cobalt circle, the done step a green
  check circle, the pending step a grey outlined circle.
- The "Übersicht der Steuerbereiche" card stays a 4-column table but each
  Bereich row gets a small subtitle below the name (e.g. "Bruttoarbeitslohn,
  Lohnsteuer, Solidaritätszuschlag"), and the trailing action becomes a
  text-link with a chevron.
- Right rail keeps only TWO cards: "Wichtige Fristen" and "Verwendete
  Nachweise". The Datenschutz card moves off-screen (link surface lives in
  the page footer / Datenschutz-Cockpit) per sketch.
- Fristen card: each entry = icon + title + ISO date + cobalt "In X Tagen"
  pill (not the muted FristCountdown text).
- Nachweise card: each entry = small doc icon + title + 1-line subtitle +
  status pill ("Verwendet" green / "Optional" amber) + … overflow button.

Everything else (PageHeader, SectionCard, StatusBadge variants, IconCircle
tones, RightRailCard primitive, `getSteuerUebersicht` API contract, the
`SteuerUebersicht` type) reads correctly against the sketch and is reused
as-is.

## 2. Page layout (top to bottom)

```
[ PageHeader: h1 "Steuer" + subtitle ]
[ Two-column grid: 2fr / 1fr on lg, single column below ]
  LEFT COLUMN (wide):
    [ SteuerHeroCard ]
      - header row:
          "Steuerjahr 2024"  ............  [Entwurf pill]   small "Stand: 28.05.2025"
      - body grid (2 cols on md+):
          LEFT (col 1):
            small label "Voraussichtliche Erstattung"
            huge cobalt amount "371,00 €"   (text-4xl/5xl, font-bold, tabular-nums)
            green-check trust line "Auf Basis Ihrer bereits bekannten Daten"
          RIGHT (col 2):
            small label "Datenquellen"
            inline 3-tile strip (Lohnsteuer / Kind / Krankenkasse) — each tile
              IconCircle + label + tiny count line ("3 Quellen" / "2 Kinder" /
              "Gesetzlich")
            below: one wide "Bereits bekannte Daten" tile (FileText icon
              + label + subtitle "Finanzamt, Arbeitgeber, Behörden")

    [ Fortschritt card ]
      - h2 "Ihr Fortschritt"
      - 3-step horizontal stepper with hairline connector segments between
        circles. Each step:
          * Step 1: green solid circle + Check icon
                    title "Daten geprüft"
                    sub "Daten vollständig geprüft am 24.05.2025"
          * Step 2: cobalt solid circle + "2"  (aria-current="step")
                    title "Belege ergänzen"  (text-text-primary)
                    sub "3 Belege fehlen noch"
                    inline cobalt link "Anzeigen"
          * Step 3: grey outlined circle + "3"
                    title "Zur Abgabe bereit" (text-text-muted)
                    sub "Prüfung abschließen und Erklärung abgeben"

    [ Bereiche card ]
      - h2 "Übersicht der Steuerbereiche"
      - 4-col table: Bereich | Betrag | Status | Aktion
          * Bereich cell: IconCircle (neutral, sm) + name (semibold) + tiny
            subtitle line below
          * Betrag cell: tabular-nums, end-aligned
          * Status cell: StatusBadge (geprueft|warten|vorlage)
          * Aktion cell: text-link Button with chevron, end-aligned
      - footer: "Alle Bereiche anzeigen ›" text-link

  RIGHT COLUMN (narrow):
    [ Wichtige Fristen card — RightRailCard ]
      - h2 "Wichtige Fristen"
      - per entry: IconCircle (primary tone, sm) + title + ISO date +
        cobalt "In X Tagen" pill (`Badge variant="info"`)
      - footer link "Alle Fristen anzeigen ›" → /termine

    [ Verwendete Nachweise card — RightRailCard ]
      - h2 "Verwendete Nachweise"
      - per entry: ListRow with FileText IconCircle + doc title + subtitle
        (issuing Behörde + Aktenzeichen fallback) + status pill
        ("Verwendet" StatusBadge variant="geprueft" /
         "Optional" StatusBadge variant="warten") + … MoreHorizontal icon
        button (aria-labelled, demo-toast handler)
      - footer link "Alle Nachweise anzeigen ›" → /dokumente
```

The Datenschutz-Hinweis card from V1 is intentionally dropped from this
re-skin (sketch has no slot for it). The Datenschutz-Cockpit link
remains accessible from the global sidebar.

Empty / error / loading paths reuse the existing `EmptyState` and
loading-skeleton from `SteuerView`; the skeleton is adapted to the
2/3 + 1/3 hero layout.

## 3. Component inventory

### Reused (no change)

- `@/components/shared/PageHeader`
- `@/components/shared/SectionCard`
- `@/components/shared/RightRailCard`
- `@/components/shared/IconCircle`
- `@/components/shared/StatusBadge`
- `@/components/shared/DataTable` (4-col mode)
- `@/components/shared/EmptyState`
- `@/components/shared/ListRow`
- `@/components/ui/badge` (for the "In X Tagen" cobalt pill)
- `@/components/ui/button`

### Removed

- `@/components/steuer/DatenquelleTile` — replaced by two new sketch-faithful
  shapes (compact horizontal tile + wide row tile) inlined in the new hero.
- The Datenschutz `RightRailCard` block in `SteuerView` — sketch has no slot.

### New / rewritten under `src/components/steuer/`

- `SteuerHeroCard.tsx` — rewritten to match sketch (two-column hero body,
  inline 3-tile strip + wide "Bereits bekannte Daten" tile, inline "Stand:"
  next to the Entwurf pill).
- `FortschrittStepper.tsx` — rewritten to render 3 vertically-rich steps with
  horizontal connector segments and per-step sub-lines.
- `BereichRow.tsx` — new helper that builds the DataTable row content for a
  single `SteuerBereich` (subtitle resolution + status mapping + action
  link).
- `FristenList.tsx` — new tiny list component for the right rail (icon +
  title + ISO date + cobalt "In X Tagen" pill).
- `NachweisRow.tsx` — new list-row helper for the Verwendete Nachweise
  card (icon + title + subtitle + status pill + overflow button).
- `SteuerView.tsx` — orchestrator: data load + layout grid.

## 4. Data model & API

No changes. The page consumes the existing `SteuerUebersicht` read model
via `api.getSteuerUebersicht(personaId, steuerjahr)`. The seed in
`src/data/steuer.json` is sufficient:

- `voraussichtliche_erstattung_cent: 37100` → renders "371,00 €".
- `fortschritt_aktiver_schritt: 1` → step 2 active, step 1 done, step 3
  pending.
- `bereiche[]` → table rows; the per-Bereich subtitle is derived locally
  from a small lookup map keyed by `bereich.id` (no seed change).
- `datenquellen[]` length is 4 in the seed. The first three render as
  the inline 3-tile strip (lohnsteuer / kind / krankenkasse), the fourth
  (`steuer.quelle.bekannt`) renders as the wide "Bereits bekannte Daten"
  tile below. The sub-count line on each tile is derived locally from
  `behoerdeName` + persona context (or a static caption when no count is
  meaningful, e.g. "Gesetzlich" for the KV tile).
- `fristen[]` already carries the two entries the sketch shows. The
  "In X Tagen" pill is computed from `frist.datum` vs `nowIso` using
  `differenceInCalendarDays`.
- `verwendete_nachweise_document_ids[]` → 3 first rows used; the rest fall
  into "Alle Nachweise anzeigen ›". Status mapping: the first two seeded
  docs render as "Verwendet" (geprueft), the third as "Optional" (warten);
  the mapping is local to the screen, not a seed property.

## 5. i18n

No `de.json` (or other locale) edits in this re-skin. The following
existing keys are reused exactly:

- `steuer.title`, `steuer.subtitle`
- `steuer.hero.steuerjahr`, `steuer.hero.entwurf_badge`,
  `steuer.hero.erstattung_label`, `steuer.hero.erstattung_aria`,
  `steuer.hero.nachzahlung_label`, `steuer.hero.nachzahlung_aria`,
  `steuer.hero.datenquellen_label`
- `steuer.quelle.lohnsteuer`, `steuer.quelle.kind`,
  `steuer.quelle.krankenkasse`, `steuer.quelle.bekannt`
- `steuer.fortschritt.title`, `steuer.fortschritt.geprueft`,
  `steuer.fortschritt.ergaenzen`, `steuer.fortschritt.abgabe`,
  `steuer.fortschritt.schritt_aria`, `steuer.fortschritt.status_done`,
  `steuer.fortschritt.status_active`, `steuer.fortschritt.status_pending`
- `steuer.bereiche.title`, `steuer.col.bereich`, `steuer.col.betrag`,
  `steuer.col.status`, `steuer.col.aktion`, `steuer.status.*`,
  `steuer.aktion.*`, `steuer.bereich.*`
- `steuer.fristen.title`, `steuer.frist.abgabe`,
  `steuer.frist.einspruch`, `steuer.frist.in_tagen`,
  `steuer.frist.ueberfaellig`
- `steuer.nachweise.title`, `steuer.alle_bereiche`,
  `steuer.weniger_bereiche`, `steuer.empty.*`, `steuer.error`,
  `steuer.retry`, `steuer.demo_action_toast`

Sketch-only labels (inline DE strings, accepted prototype tradeoff):

- "Stand: 28.05.2025"
- "Auf Basis Ihrer bereits bekannten Daten" (trust line)
- "3 Quellen" / "2 Kinder" / "Gesetzlich" (tile sub-counts)
- "Finanzamt, Arbeitgeber, Behörden" ("Bereits bekannte Daten" subtitle)
- "Daten vollständig geprüft am 24.05.2025" / "3 Belege fehlen noch" /
  "Prüfung abschließen und Erklärung abgeben" (stepper sub-lines)
- Bereich subtitles ("Bruttoarbeitslohn, Lohnsteuer …", "Pendlerpauschale,
  Arbeitsmittel", "Altersvorsorge, Krankenversicherung …", "Spenden, …",
  "Krankheitskosten, …")
- "Verwendet" / "Optional" (Nachweis-Status), "Alle … anzeigen"
- "In {n} Tagen" / "Überfällig" / "Heute"

These will be promoted to i18n keys in the localisation pass.

## 6. Accessibility notes

- Hero "huge cobalt amount" carries a programmatic label via
  `aria-label={t('hero.erstattung_aria', { betrag })}` so screen readers
  hear "Voraussichtliche Erstattung 371,00 €", not just "371,00 €".
- Stepper stays an `<ol>` with `aria-current="step"` on the active item;
  state remains expressed in sr-only text in addition to colour
  (HL-DS-4 — no colour-only conveyance).
- "In X Tagen" pills are decorative; the full date is in a sibling `<time>`
  element so the deadline is reachable without colour.
- "…" overflow button on Nachweise rows has `aria-label="Optionen für
  {title}"` and is a real `<button>`; the demo handler fires a toast.
- Connector hairlines between stepper circles are `aria-hidden`.
- Hero amount uses `tabular-nums`.
- All target sizes are ≥44×44 on touch (table rows, list rows, "…" button).

## 7. Out of scope

- No new top-level routes.
- No i18n JSON edits.
- No locale-aware date formatting beyond the existing `date-fns/de` setup.
- No mock-backend API changes.
- No Datenschutz card on this screen (link surface lives in sidebar).
- No persistence of "showAllBereiche" state across reloads.
- No Loom-specific copy tuning.

## 8. Verify

- `npx tsc --noEmit` — must pass.
- Visual diff against sketch: ratio, columns, spacing, pill colours.
- Manual smoke: Anna persona renders the hero amount, 3 stepper rows,
  6 Bereich rows (with "Alle anzeigen" collapse), 2 Fristen, 3 Nachweise.

## 9. Build log — frontend-coder

- date: 2026-05-28
- screens implemented: /steuer (re-skin)
- components created/modified:
  - `src/app/(app)/steuer/page.tsx` (unchanged signature, prop pass-through)
  - `src/components/steuer/SteuerView.tsx` (rewritten layout)
  - `src/components/steuer/SteuerHeroCard.tsx` (rewritten body)
  - `src/components/steuer/FortschrittStepper.tsx` (rewritten visual)
  - `src/components/steuer/BereichRow.tsx` (new)
  - `src/components/steuer/FristenList.tsx` (new)
  - `src/components/steuer/NachweisRow.tsx` (new)
  - `src/components/steuer/DatenquelleTile.tsx` (deleted — replaced inline)
- i18n keys added (DE source): none in this pass
- typecheck: pass
- lint: not run (scope rule — prototype branch)
- known gaps: inline DE strings for sketch-only labels (see § 5); to be
  promoted by i18n-localizer
- next: code-reviewer
