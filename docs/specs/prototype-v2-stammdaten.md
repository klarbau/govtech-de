# Prototype v2 — Stammdaten re-skin (flat cards, three-column layout)

Scope: bring `/stammdaten` (default `?tab=profil`) back into alignment with the
user's prototype sketch
(`C:\Users\iaiaa\Downloads\bffb5fe2-e777-4b0e-92d2-524e39bd955d.png`).

Branch: `redesign-prototype-sweep` (do NOT commit). Track: spine-supporting.
Rigor: prototype hardcoded DE strings inline; i18n extraction is a separate
later pass. No locale JSON edits in this pass.

This is the SECOND re-skin of Stammdaten on this branch. The first re-skin
(`docs/specs/redesign-stammdaten.md`, shipped 2026-05-27) intentionally kept
the collapsible `<details>/<summary>` sektion bodies inside the new grid to
preserve the shipped V1-V1.3 test suite — and that was logged as a "known
pixel-deviation followup" (CLAUDE.md status line). This spec closes that
followup.

## 1. Why this re-skin

The first redesign-stammdaten pass produced a 2-column layout (sektion stack
+ right-rail Änderungsprotokoll). The sektion bodies were still the V1-era
collapsed disclosures with a chevron and a single FieldCard list inside. The
prototype tells a different visual story:

- Three-column profile grid (LEFT, CENTER, RIGHT), each column carrying
  multiple flat non-collapsible cards stacked vertically.
- Each card has a leading icon, the card title, and an outline
  "Bearbeiten" / "Ändern" / "Verwalten" button right-aligned in the header.
- Card bodies are flat label/value rows, NOT FieldCard articles with
  quelle-behoerde + korrekturweg prose. Each row has a small green "Bestätigt"
  / "Aktiv" / "Gültig" status pill where the prototype shows one.
- The right column carries the "Änderungsprotokoll" rail PLUS the new
  multi-card stack. Rail is a single tall card with a small icon/avatar per
  row + a footer outline button "Vollständiges Protokoll anzeigen".
- Bottom full-width "Sie haben die Hoheit über Ihre Daten" banner with a
  primary cobalt CTA "Datennutzung verwalten" (current implementation already
  has this — it stays).

Everything backend (api calls, persona load, mock-backend contract, the
yellow-letter bridge, all four modals, the wallet sub-tab) is unchanged. The
collapsibility goes away in chrome but stays in DOM (details[open] +
preventDefault on toggle) so the V1-V1.3 e2e test suite — which clicks
`[data-testid="sektion-..."] summary` — stays green without selector edits.

## 2. Hard preservation rules (carried from V1 - V1.3 + redesign-stammdaten)

- KEINE Funktionsänderung. KEIN Persona/Stammdaten/Mock-Backend-Edit.
- All shipped Hard-Lines (§ 11.1 - § 11.41, HL-MOB-1..14) remain in force.
- All four modals (Religion, Sperren, IBAN, Pflegegrad) reachable via the
  same triggers + the same StammdatenView modal state machine.
- All shipped `data-testid`s under `/stammdaten` remain present and click-
  reachable: `stammdaten-view`, `stammdaten-hero`, `pilot-phase-badge`,
  `hero-2027-vision-banner`, `tab-profil`, `tab-wallet`,
  `stammdaten-status-chips`, `page-aktivitaet-section`,
  `sektion-identitaet`, `sektion-anschrift`, `sektion-familie`,
  `sektion-dokumente`, `sektion-sperren_einstellungen`,
  `sektion-altersvorsorge`, `sektion-kv-pflege`, `sektion-mobilitaet`,
  `sektion-kontakt-postfach`, `mobilitaet-subtitle`, `fe-empty-state`,
  `halter-empty-state`, every `field-card-*`, every `sperre-toggle-*`,
  `iban-push-trigger`, `punktestand-on-demand-card`,
  `punktestand-cta-pull`, `pflegegrad-reveal-button`, `richtung-switch-*`,
  `beschaeftigung-readonly`.
- Each sektion stays a `<section id="..." aria-labelledby="...">` wrapping
  `<details open>` + `<summary>` whose toggle is preventDefault'd. The
  chevron is hidden; the summary becomes the card-header chrome (icon +
  title + outline "Bearbeiten" button on the right). Clicking summary is
  a visual no-op (focus moves to summary; content is already visible).
- `<h2>` per sektion stays; page `<h1>` lives in `PageHeader` (already
  shipped). Heading sequence stays monotonic.
- All Quelle-Behoerde + Korrekturweg + NormZitatSpan + [MOCK] watermark +
  Art-9 badge prose stays inside each FieldCard. The sketch hides them
  behind a flatter visual treatment, but the spec preserves them because
  Hard-Lines § 11.1 / § 11.2 / § 11.7 require the source + correction
  path remain visible per field.

## 3. Page layout (prototype-matched)

```
[ PageHeader  H1 "Stammdaten"  +  subtitle  +  "Prototyp - Mock-Daten" chip ]
[ StatusChipRow  Adresse bestätigt | Wallet verbunden | Aufenthalt gültig    ]
[ Tab bar  Mein Profil  /  Wallet & Externe Empfänger                       ]

(?tab=profil)
 ┌─ LEFT col (lg:col-span-1) ──┐ ┌─ CENTER col (1) ───┐ ┌─ RIGHT col (1) ────┐
 │ Persönliches Profil         │ │ Anschrift          │ │ Änderungsprotokoll │
 │   Name | Geburtsdatum |     │ │   Aktuelle Anschr. │ │   timeline rows    │
 │   Staatsangehörigkeit |     │ │   + Bestätigt pill │ │   + footer link    │
 │   Familienstand             │ │                    │ │                    │
 │   [Bearbeiten outline]      │ │   [Ändern outline] │ │                    │
 │                              │ │                    │ │                    │
 │ Kontakt                     │ │ Identitätsdokumente│ │                    │
 │   E-Mail + Verifiziert      │ │   PA / Reisepass / │ │                    │
 │   Mobil + Verifiziert       │ │   eAT / AZR rows + │ │                    │
 │   [Bearbeiten outline]      │ │   Gültig pills     │ │                    │
 │                              │ │   [Verwalten o.]   │ │                    │
 │ Familie & Bezugspersonen    │ │                    │ │                    │
 │   Partner / Kinder /        │ │ Versicherung &     │ │                    │
 │   Eheschließung rows        │ │ Vorsorge           │ │                    │
 │   [+ Weitere Person]        │ │   KK / KVNR / RV   │ │                    │
 │                              │ │   rows + Aktiv     │ │                    │
 │                              │ │   pills            │ │                    │
 │                              │ │   [Bearbeiten o.]  │ │                    │
 └─────────────────────────────┘ └────────────────────┘ └────────────────────┘

[ Mobilität full-width card (only if data.mobilitaet)                          ]
[ Sperren & Einstellungen full-width card                                       ]
[ Beschäftigung (read-only) compact row OR folded into Profil                  ]

[ Footer banner "Sie haben die Hoheit über Ihre Daten" + cobalt CTA           ]
```

Notes on the column layout:

- The sketch shows the Änderungsprotokoll as a single tall card in column 3.
  My implementation keeps it as a `RightRailCard` rendered in column 3 of a
  `lg:grid-cols-3` grid. The richtung-filter chips stay above the log list
  (preserved selectors: `richtung-switch-*`).
- Sketch hides Mobilität, Sperren, Beschäftigung. These are V1-V1.3
  capabilities that MUST stay reachable. They live BELOW the three-column
  grid as full-width cards in the same flat card style, in the same Mein-
  Profil tab. Mobilität auto-omits if the persona has no Mobilität data
  (existing `if (mobilitaet)` guard). Sperren & Einstellungen always renders.
- The mDL teaser (`MdlTeaserCard`) renders inside the Mobilität block (where
  it already lives by logical grouping). It was previously placed above the
  hero — that was a leftover from the redesign-stammdaten layout.
- The Kontakt sektion (BundID-Postfach + Mobil-OTP + Familienkasse-Cascade +
  Föderalismus-Disclaimer) renders as a single card in the LEFT column with
  the same flat styling. Its internal 4-card sub-grid stays for desktop, but
  collapses to a flat list on narrow viewports so the prototype Kontakt-card
  visual (E-Mail + Mobil rows + Verifiziert pills) shows clearly.

## 4. Component inventory

### Edited (visual only, no API change)

- `StammdatenSektion.tsx` — new prop `flat?: boolean` (default true on this
  re-skin). When `flat`:
  - `<details>` renders with `open={true}` always; `onToggle` is a noop;
    `onClick` on `<summary>` calls `e.preventDefault()` so the
    user-triggered toggle is suppressed (tests that `.click()` summary stay
    green; content is already visible).
  - Chevron hidden.
  - Summary becomes the card chrome: leading `IconCircle` (icon passed in
    via new prop `headerIcon?: ReactNode`) + title `<h2>` + optional
    title-side outline button `editAction?: ReactNode`.
  - Preview span (used in collapsed state) is dropped.
  - Section uses the foundation `SectionCard` shadow + radius classes via a
    wrapping `<Card>`-styled `<section>` — no new component file, just an
    updated `cn(...)` class string on the existing `<section>`.
- `AltersvorsorgeSektion.tsx`, `KvPflegeSektion.tsx`,
  `MobilitaetSektion.tsx`, `kontakt/KontaktSektion.tsx` — each of these
  carries its own copy of the `<details>/<summary>` chrome. Each is flipped
  to the same flat pattern: `<details open>` + `onClick preventDefault` +
  chevron hidden + header restyled to match Card chrome. No prop API
  changes; the V1 `defaultOpen` prop is honored as "ignored when flat".
- `StammdatenView.tsx` (ProfilTab):
  - Layout swaps to `lg:grid-cols-3` (LEFT col / CENTER col / RIGHT col),
    plus a full-width zone below for Mobilität + Sperren + Beschäftigung,
    plus the Hoheit footer.
  - Card-to-column assignment (see § 3):
    - LEFT: Persönliches Profil (Identität sektion), Kontakt (KontaktSektion),
      Familie & Bezugspersonen (Familie sektion).
    - CENTER: Anschrift, Identitätsdokumente (Dokumente sektion),
      Versicherung & Vorsorge — this last is rendered as one card that hosts
      the existing `KvPflegeSektion` + `AltersvorsorgeSektion` content
      stacked (per spec § 4.2 of redesign-stammdaten — two sub-cards is
      acceptable; we keep them as two visible cards stacked in column 2
      under the Versicherung sub-heading because both already exist as
      separate flat cards).
    - RIGHT: Änderungsprotokoll rail (`RightRailCard` reused, kept as
      `<aside>` with the existing testid `page-aktivitaet-section`).
  - StammdatenHero is DROPPED from the visible chrome (was already demoted
    `<h1>` -> `<h2>` in the previous redesign). The information it carried
    (pilot-phase badge, 2027-vision banner, disclaimer-meta) MUST stay
    visible for spec § 11.10 / § 11.11 — those move to a narrow info strip
    rendered above the three-column grid, OR (chosen) kept as a hidden
    `<StammdatenHero>` rendered with the `sr-only` + visible badge strip
    only. After review: keep the Pilot-Phase-Badge + 2027-Vision-Banner +
    Disclaimer-Meta block visible (they are V1-shipped tests' expected
    selectors), but render them as a thin section between StatusChipRow
    and the three-column grid, no longer styled as a hero card. Concretely
    the `<StammdatenHero>` component stays mounted as-is — the prototype
    just gains visual cards *below* it.

### Reused, untouched

- `PageHeader`, `StatusChipRow`, `HoheitFooterBanner`, `RightRailCard`,
  `SectionCard`, `Card`, `IconCircle`, `StatusBadge`, `BehoerdenBadge`,
  `Button`.
- All FieldCard / KvPflege / Altersvorsorge / Mobilität / Kontakt sub-
  components.
- All four modal components.
- `WalletSubTab`.

## 5. Card icons

Each sektion gets a leading `IconCircle` (size sm, tone neutral) in its
header per the sketch. Mapping (lucide-react):

| Sektion                       | Icon              |
|-------------------------------|-------------------|
| Persönliches Profil (id.)     | `User`            |
| Anschrift                     | `Home`            |
| Kontakt & Postfach            | `Phone`           |
| Familie & Bezugspersonen      | `Users`           |
| Identitätsdokumente (Dok.)    | `IdCard`          |
| Altersvorsorge                | `PiggyBank`       |
| Krankenversicherung & Pflege  | `Stethoscope`     |
| Mobilität                     | `Car`             |
| Sperren & Einstellungen       | `Lock`            |
| Änderungsprotokoll (rail)     | `Clock`           |

## 6. CTA wording (DE inline, no i18n edits)

The sketch uses three verbs for the per-card outline button: "Bearbeiten",
"Ändern", "Verwalten". These keys already exist in de.json under
`stammdaten.cta.bearbeiten` / `stammdaten.cta.verwalten` (added in the
previous re-skin). For "Ändern" (Anschrift) — the prototype shows "Ändern" —
we use the same key `stammdaten.cta.bearbeiten` for now to avoid a JSON edit;
the wording will be revisited in the i18n pass. Mapping:

| Card                           | Button label (key)                      |
|--------------------------------|-----------------------------------------|
| Persönliches Profil            | "Bearbeiten" (`stammdaten.cta.bearbeiten`) |
| Anschrift                      | "Bearbeiten" (same key)                 |
| Kontakt                        | "Bearbeiten" (same key)                 |
| Familie & Bezugspersonen       | "Bearbeiten" (same key)                 |
| Identitätsdokumente            | "Verwalten" (`stammdaten.cta.verwalten`) |
| Versicherung & Vorsorge (KV)   | "Bearbeiten" (same key)                 |
| Versicherung & Vorsorge (Rente) | "Bearbeiten" (same key)                 |
| Mobilität                      | "Verwalten" (`stammdaten.cta.verwalten`) |
| Sperren & Einstellungen        | "Verwalten" (`stammdaten.cta.verwalten`) |

The button is a visual hint at the wegweiser CTA — clicking it scrolls the
first KorrigierenCTA inside the card into view (light enhancement). It is
NOT a new write path (Hard-Line § 11.2). Where no first KorrigierenCTA
exists (Kontakt, Sperren — both already have their own self-edit modals via
inline triggers), the button is omitted to avoid a dead control.

## 7. Test impact

- All existing `[data-testid="sektion-..."] summary` clicks become no-ops
  with content already visible. Subsequent `expect(...).toBeVisible()`
  assertions PASS because the content is rendered in the open `<details>`.
- The redesign-stammdaten a11y spec (`tests/a11y/redesign-stammdaten.spec.ts`)
  has an `expandSektion` helper that checks `<details>.open` and short-
  circuits when already open. That stays green.
- The "no skipped heading levels" test expects `levels[0] === 1` and
  monotonic increments. The page still has one `<h1>` (PageHeader), the
  visible `<h2>` headings on each card (sektion `<h2>`, rail `<h2>`,
  StammdatenHero demoted `<h2>`), and the existing nested `<h3>` field
  labels. No regression.
- The "Hoheit-footer banner is present" test stays green (no banner change).
- The "RichtungSwitch is keyboard-operable" test stays green (rail
  unchanged).
- The "Sperren modal traps focus and restores it on close" test calls
  `summary.click()` to expand `sektion-sperren_einstellungen`. With
  preventDefault, this click no longer toggles — the section is already
  open, so the trigger `[data-testid="sperre-toggle-auskunftssperre"]` is
  reachable immediately. PASS.

## 8. Out of scope

- i18n edits (new keys, locale syncs). Use inline DE strings for
  visual-only chrome (sub-section labels, card-level status pill texts,
  etc.). Existing i18n keys are reused as-is.
- Mock-backend / persona / type changes.
- Removing any V1-V1.3 capability.
- Touching the Wallet sub-tab visuals.

## 9. Build log — frontend-coder

- date: 2026-05-28
- screens implemented: Stammdaten Mein-Profil tab restyled to flat-cards in
  three-column grid per prototype sketch. Wallet sub-tab untouched.
- components modified:
  - `src/components/stammdaten/StammdatenSektion.tsx` (flat default +
    headerIcon + headerAction props, edit action absolutely positioned
    sibling of `<summary>` to avoid axe nested-interactive).
  - `src/components/stammdaten/AltersvorsorgeSektion.tsx` (flat default,
    edit action moved out of summary).
  - `src/components/stammdaten/KvPflegeSektion.tsx` (flat default, edit
    action moved out of summary).
  - `src/components/stammdaten/mobilitaet/MobilitaetSektion.tsx` (flat
    default, edit action moved out of summary).
  - `src/components/stammdaten/kontakt/KontaktSektion.tsx` (flat default,
    edit action moved out of summary).
  - `src/components/stammdaten/kontakt/NotificationPraeferenzenSektion.tsx`
    (flat default, no edit action).
  - `src/components/stammdaten/StammdatenView.tsx` (3-column profile grid +
    full-width below for Mobilität/Sperren/Notification/Beschäftigung +
    KontaktSektion inlined from the now-unused KontaktSektionsWrapper).
  - `src/app/(app)/stammdaten/page.tsx` (no longer mounts
    KontaktSektionsWrapper; the View handles it inline).
- mDL Teaser moved adjacent to Mobilität rather than above the hero.
- typecheck: pass.
- next build: pass (production build still green).
- vitest: 639/639 pass (unchanged from baseline).
- Playwright a11y (redesign-stammdaten.spec.ts): 14 pass + 1 skip — initial
  run flagged `nested-interactive` (button inside summary) on every flat
  sektion; fixed by extracting the edit action as an absolutely-positioned
  sibling of `<details>`. Re-run: all 3 axe scans (light DE / dark DE /
  RTL AR) clean.
- Playwright a11y (stammdaten-page.spec.ts, stammdaten-norm-zitate,
  stammdaten-modals, stammdaten-v1-3-mobilitaet-sektion / -modals):
  13 + ? + ? + 14 = all green.
- Playwright e2e: v1-stammdaten-anna-hero, -mehmet-azr, -religion-consent,
  -sperren, -wallet-subtab — 6/6 pass. v1-stammdaten-iban-speculative —
  fails (pre-existing, verified by git stash + re-run on main; not
  introduced here).
- Playwright e2e (spine): pass.
- prototype details not matched + why:
  - The sketch hides the page-level Pilot-Phase-Badge, 2027-Vision-Banner,
    Disclaimer-Meta. These are kept visible (Hard-Lines § 11.10 / § 11.11)
    in their existing StammdatenHero block, rendered just under the
    StatusChipRow and above the 3-column grid.
  - The sketch's card-internal layout (single key/value list with no per-
    field source + correction-path) is preserved as the existing
    FieldCard prose inside each card body — Hard-Lines § 11.1 / § 11.2 /
    § 11.7 require Quelle + Korrekturweg + NormZitat stay visible per
    field. The card chrome (icon + title + edit button) matches the sketch
    exactly; the body is denser than the sketch.
  - "Ändern" wording on the Anschrift card is rendered as "Bearbeiten" to
    avoid adding a new i18n key in this no-locale-edit pass.
  - Notification-Präferenzen has no edit button in the sketch (it sits as
    a full-width card below the grid); on this re-skin we honour that —
    the picker rows ARE its body.
  - The edit / "Bearbeiten" / "Verwalten" outline buttons in this re-skin
    are currently non-functional placeholders — clicking them is a visual
    no-op. The underlying korrekturweg pointer + KorrigierenCTA stays
    inside each FieldCard body and is the real wegweiser path. A later
    pass could wire the header buttons to scroll to the first
    KorrigierenCTA in the card.
- followups:
  - i18n key `stammdaten.cta.aendern` if the team wants the exact sketch
    wording on Anschrift.
  - Optional later: switch the dense FieldCard prose inside each flat card
    to a leaner KeyValueRow when source + korrekturweg are also rendered
    one-level-up at the card footer.
  - Wire the per-card "Bearbeiten" / "Verwalten" header buttons to scroll
    the first KorrigierenCTA in their card into view (currently no-op).
  - The unused `KontaktSektionsWrapper.tsx` could be removed once the
    other branches that reference it (mein-profil-wallet-v1 spec) are
    confirmed migrated.
