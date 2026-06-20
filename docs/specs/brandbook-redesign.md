# Brandbook Redesign — GovTech-DE „Waldgrün" v1.0

> **track: spine** · branch `feat/brandbook-redesign` · worktree `C:\Users\iaiaa\govtech-redesign`
> Source of truth: the user-supplied **Brandbook v1.0 (Mai 2025)** + 7 screen mockups.
> This file is the textual transcription of those images (agents cannot see them).
> **All data stays mocked. No real Behörden integration.** Sie-Form, BITV 2.0 / WCAG 2.1 AA.

This is a **rebrand**, not a rewrite. The live app is colored by token *values* in
`src/app/globals.css` (`--color-primary` + the parallel `--brand-*` ramp) and styled by
page classes in `src/app/prototype-v2.css`. Swapping the token values recolors every
screen at once; the structural changes (top-nav shell, landing, new screens) come on top.

---

## 1. Design tokens (Brandbook §03 Farbpalette)

Exact hex from the brandbook swatches. Map onto the existing token names so the whole
app inherits the new look without a per-site flag-day.

| Brandbook name | Hex | Role | Maps onto |
|---|---|---|---|
| **Waldgrün** (Primär) | `#0F3D2E` | buttons, links, active nav, brand, completed steps, progress fill | `--color-primary`, `--brand-600/700`, `--brand-fill` family |
| **Tintenblau** (Text/Headline) | `#0B1220` | headings + body text | `--color-text-primary`, `--ink` |
| **Warmweiß** (Hintergrund) | `#FAFAF8` | page background | `--color-surface-page`, `--bg` |
| **Graugrün** (Oberflächen) | `#E7ECE7` | muted fills, hover rows, inactive pills, tinted surfaces | `--color-surface-muted`, `--surface-muted`, `--brand-50` tint family |
| **Neutralgrau** (Hilfetext/Linien) | `#A3A8AD` | **hairlines / borders / decorative icon hints only** | `--color-border` direction (NOT body text — see a11y note) |
| **Signalrot** (Akzent/Fehler) | `#E2534B` | error fills, danger accents, expired Fristen | `--color-danger` family |

Farbverwendung (usage ratio, §03): 60 % Warmweiß · 20 % Tintenblau · 10 % Graugrün ·
7 % Waldgrün · 2 % Neutralgrau · 1 % Signalrot. → Green is an **accent**, used sparingly
on CTAs/active state, not flooding surfaces. Surfaces stay warm-white + graugrün.

### Derived ramp (build a coherent Waldgrün ramp — keep AA)
- White text on `#0F3D2E` = 11.7:1 ✓ (primary button text fine).
- **Waldgrün ramp** (for `--brand-50…900`): tint `#0F3D2E` toward Warmweiß:
  `--brand-50 ≈ #ECF1EE` (active-nav pill bg, soft surfaces) ·
  `--brand-100 ≈ #D6E1DB` (pill borders) ·
  `--brand-600 = #0F3D2E` (primary) · `--brand-700 ≈ #0C3325` (hover) ·
  `--brand-900 = #0B1220` (wordmark, = Tintenblau).
  `--accent-soft ≈ #ECF1EE` (info chips, AI bubble).
- **Active-nav text/icon** on the `--brand-50` pill must clear AA: use `#0F3D2E` on `#ECF1EE` ≈ 10:1 ✓.
- **Status families stay distinct from primary** (Brandbook §06 Status Chips: Erfolgreich green,
  In Bearbeitung amber, Fehler rot):
  - success = a **medium** green (keep ≈ `#137034` text on `#E7F6EC` soft) — readable and
    clearly lighter than the dark forest primary, so „abgeschlossen" ≠ „brand".
  - warning = amber (keep `#B45309` / soft `#FEF3DA`).
  - danger = Signalrot. Fill/border `#E2534B`; **text-on-light darker** (`≈ #C0392F`/keep `#B91C1C`)
    to hold AA (`#E2534B` on white is ~3.5:1 — fine for icons/fills/borders, not body text).
- **Muted text**: Neutralgrau `#A3A8AD` is a **line/hint** color (≈2.6:1 on white — FAILS as text).
  Keep the existing AA-safe muted text token (`#545C69`-class, ≥ 5.6:1). Do NOT lower it.
  Borders/hairlines may move toward Neutralgrau (`--color-border ≈ #DDE1DE` warm, `--border-strong ≈ #C4C9C5`).

### Dark mode
Keep the existing dark elevation ladder; re-point the brand hue from cobalt to a
**lifted Waldgrün** (e.g. primary `#4CA88A`/`#5FB89A` so white-on-fill and tint-on-dark both
clear AA — the foundation agent calibrates, mirroring how the current file documents each
contrast ratio inline). Text/surface/border dark values unchanged.

### Radii / shadow / grid (Brandbook §07/§08)
- Radii unchanged: `--r-sm 8` · `--r-md 10` · `--r-lg 14` · `--r-pill 999`. Icons rounded ~2px.
- Shadows: keep the three soft tiers. Border-first, shadow-second (brandbook cards are quiet).
- Grid: container **max-width 1200px**, 12 columns, **24px** gutters + margins, 8-pt spacing raster.

---

## 2. Typography (Brandbook §04)

**Schriftsystem: Inter** (body) + **Inter Tight** (display/headings).

| Role | Font | Weight | Size/line |
|---|---|---|---|
| H1 / hero | **Inter Tight** | 700 Bold | 44 / 52 (hero may go larger, ~56) |
| H2 / section | **Inter Tight** | 600 Semibold | 28 / 36 |
| H3 / card title | Inter | 600 | ~18–20 |
| Body | Inter | 400 | 16 / 24 |
| Caption / meta | Inter | 400–500 | 12–14 / 16–20 |
| Eyebrow (UPPERCASE, tracking 0.06em) | Inter | 600 | ~12 |

Wire **Inter Tight** via `next/font/google` in `src/app/layout.tsx` → CSS var `--font-display`.
Apply `--font-display` to: hero `h1`, `.gt-page-head h1`, `.text-display`, `.text-3xl`,
section `h2`, and big KPI numerals. Body/`--font-sans` stays Inter.
Tabular numerals stay mandatory for Aktenzeichen/Frist/IBAN/€ (HL-DS-6).

---

## 3. Logo / brand mark (Brandbook §02)

New mark = a **filled rounded square in Waldgrün `#0F3D2E`** containing a **white angular
corner-bracket** glyph (a „⌐"-like open square bracket / quote-mark, 2 strokes meeting at a
right angle, upper-left). Wordmark **„GovTech-DE"** in Inter Tight/Inter bold, Tintenblau,
to the right. Variants in the brandbook: full-color (green square, white mark), monochrom
(dark square), favicon (white mark on green).

Replace `src/components/layout/ParthenonCrest.tsx`'s SVG with this new mark (self-colored:
green rounded-rect `rx≈6` + white bracket strokes), so the mark updates **everywhere** it's
used (Topbar, Sidebar, landing, footer). Keep the export name `ParthenonCrest` (or add a
`LogoMark` alias) to avoid breaking imports. The wordmark text reads **„GovTech-DE"** (hyphen).

---

## 4. Screen: Landing `/` (Brandbook mockups #1 + #7) — PHASE 1

`src/app/page.tsx` (static DE, no i18n — keep that). Marketing portal with **top nav**,
not the app sidebar. Replace the current page + its `.landing-*` CSS in `prototype-v2.css`.
Container max-width 1200px, generous whitespace, warm-white bg.

### 4.1 Header (sticky, white, 1px bottom border)
- Left: **logo mark** (green square) + wordmark **„GovTech-DE"**.
- Center nav (links): **Lösungen** · **Lebenslagen** · **Sicherheit & Datenschutz** ·
  **Ressourcen** · **Über uns**. (Lösungen/Ressourcen may carry a ChevronDown caret.)
  Targets for the demo: Lösungen→`#leistungen`, Lebenslagen→`/lebenslagen` (Phase 2 route;
  for now `#leistungen`), Sicherheit & Datenschutz→`/datenschutz`, Ressourcen→`#`, Über uns→`#`.
- Right: **ThemeToggle** (moon) + **„Anmelden"** primary green button (User icon) → `/onboarding`.

### 4.2 Hero (3-column grid on desktop; stacks on mobile)
**Left column (~38%):**
- Small pill badge: **„Ein Portal. Alle Ämter."** (graugrün bg, ink text). _(from #7)_
- **H1** (Inter Tight Bold, ~48–56px, Tintenblau, 2 lines): **„Verwaltung, die vorausdenkt."**
- Sub (body, secondary): „Ein Portal. Alle Ämter. GovTech-DE bereitet Vorgänge vor, übermittelt
  Angaben sicher an zuständige Stellen und erklärt jeden nächsten Schritt verständlich."
- CTAs: **„Demo erleben →"** (primary green, → `/onboarding`) + **„Ablauf ansehen →"** (secondary outline, → `#leistungen`).
- Trust line under CTAs: ShieldCheck + **„Sicher. Transparent. Für Sie gemacht."**

**Center column (the signature artefact) — process-flow diagram** in a bordered, rounded card:
- Eyebrow (UPPERCASE, tracking): **„EIN ANTRAG. KOORDINIERT UND SICHER."**
- Node A (left): rounded box, **User** icon, **„Bürgerin oder Bürger"**, sub „Ein Antrag / eine Angabe".
- Arrow `→`.
- Node B (center): rounded box with the **logo mark**, **„GovTech-DE"**, sub „Vorgang vorbereiten ·
  Daten prüfen · Routen bestimmen".
- A **green circle with a white Lock** icon (the secure hand-off hub).
- Fan-out connectors (each a short line with a small **green check** at its start) to **6 destination chips**
  (bordered rounded pills, icon + label): **Einwohnermeldeamt** (Building), **Finanzamt** (FileText),
  **Ausländerbehörde** (Users), **Krankenkasse** (ShieldCheck), **Rentenversicherung** (Landmark),
  **Weitere Stellen** (MoreHorizontal).
- Dashed return line along the bottom with caption: **„Status & nächste Schritte immer im Blick"**.
- The whole figure is one `role="group"` with an `aria-label` describing the flow; icons `aria-hidden`.

**Right column (~20%) — stats card** (bordered), 3 KPIs stacked, divider between, each = icon-circle + big numeral + label + sub:
1. **Clock** · **„8+ Std."** / „gespart" — sub „Durch intelligente Vorbereitung und direkte Übermittlung".
2. **Building2** · **„6"** „Behörden informiert" — sub „Automatisch die richtigen Stellen zur richtigen Zeit".
3. **Eye** · **„24/7"** „im Blick" — sub „Transparenter Status und klare nächste Schritte".
   (Big numerals in Inter Tight, tabular-nums.)

### 4.3 Lebenslagen quick-row (5 cards, equal width)
Each card: icon-circle + title + one-line description + ArrowRight, links to the route:
- **Umzug** (Home → `/vorgaenge/umzug/run`): „Adresse ändern und Behörden informieren – in einem Vorgang."
- **Geburt** (Baby/Stroller → `/dashboard`): „Geburt registrieren und wichtige Stellen benachrichtigen."
- **Aufenthaltstitel** (IdCard → `/vorgaenge`): „Verlängerung oder Änderung sicher beantragen."
- **Steuer** (Euro → `/steuer`): „Unterlagen übermitteln und Fristen im Blick behalten."
- **Posteingang** (Mail → `/posteingang`): „Nachrichten von Behörden sicher empfangen."

### 4.4 Trust-principles band (3 items on a graugrün surface band)
- **Lock** — **„Private Empfänger nur mit Einwilligung"** / „Ihre Daten werden nur an private Stellen
  weitergegeben, wenn Sie zustimmen."
- **ShieldCheck** — **„Sensibler Schritt nur mit eID-Bestätigung"** / „Für kritische Vorgänge ist Ihre
  Identität immer sicher und eindeutig bestätigt."
- **Landmark** — **„Keine Daten ohne Rechtsgrundlage"** / „Wir verarbeiten Daten ausschließlich auf Basis
  gesetzlicher Grundlagen."

### 4.5 Footer trust bar
- Left: small shield + **„Vertrauen durch Standards"** (or „Sicher. Transparent. Für Sie gemacht.").
- Badges row (icon + label): **DeutschlandID** (Fingerprint) · **EUDI Wallet** (EU-stars/Box) ·
  **FIT-Connect** (Share2) · **DSGVO-konform** (ShieldCheck) · **BITV-konform** (Accessibility).
- Keep a `[MOCK]` prototype-disclaimer line (synthetic data, no real Behörde).

### 4.6 a11y
One `<h1>`, section `<h2>`s, nav is `<nav>` with label, footer badges are text (no color-only meaning),
focus-visible rings on every link/button, all decorative icons `aria-hidden`. Must be axe-clean light+dark.

---

## 5. PHASE 2 (next workflow — after the landing direction is confirmed)

### 5.1 Global top-nav shell (replaces the sidebar)
All `(app)` screens move from the `.gt-sidebar` shell to a **top navigation bar** identical to the
landing header: logo + nav (Lösungen ▾ · Lebenslagen · Sicherheit & Datenschutz · Ressourcen ▾ · Über uns)
+ ThemeToggle + **user pill** („AP Anna Petrov ▾" with monogram avatar) / Anmelden. Add a breadcrumb row
under the header on detail screens („Startseite › Vorgänge › Vorgangsdetail"). Rework `(app)/layout.tsx`,
`Topbar.tsx`, retire/repurpose `Sidebar.tsx`/`MobileNav.tsx`. Preserve nav a11y (current/aria-current,
keyboard, mobile drawer). Content column centers at max-width ~1200px.

### 5.2 Dashboard (mockup #4) — `/dashboard`
„Guten Morgen, {Name}" + „Hier ist Ihr Überblick für heute." · **Heute wichtig** 3-card row (icon, title,
sub, „Fällig bis …" in amber, arrow) + „Alle anzeigen →" · **Automatisch erledigt (4)** list with green
„Erledigt" badges + timestamps · **Ihr Umzug im Überblick** card with a **progress ring (78%)** + „6 von 8
Stellen", „Zeit gespart 6", „Nächster Schritt … Fällig bis …" + primary „Zum Umzug gehen →" · **Nächster
Termin** card (Bestätigt badge, address, „Details ansehen"/„In Kalender") · **Aktivitäten** feed. Right rail:
**Posteingang 3** · **Offene Vorgänge 3** · **Fristen 2** · **Ihre Kontrolle** (Datenschutz link). Footer trust bar.

### 5.3 Posteingang (mockup #3) — `/posteingang`
Three columns: (a) inbox folder rail — „Nachricht schreiben" primary, Posteingang/Entwürfe/Gesendet/Papierkorb/
Archiv, **Ordner** (Steuern/Rundfunkbeitrag/Finanzamt/Krankenkasse/Ausländerbehörde/Rentenversicherung/Weitere),
**Filter** (Behörde/Kategorie/Datum/Status/Frist fällig, „Nur ungelesen"); (b) message list with tabs
**Alle 12 · Ungelesen 3 · Mit Frist 4 · Wichtig 1**, search, „Filter", each row = sender + betreff + snippet +
Frist chip + unread dot + star, pagination; (c) letter detail — sender + verified check, Herunterladen/Drucken,
meta row (Eingegangen/Behörde/Kategorie/Aktenzeichen/Frist), tabs **Original · Anhänge · Verlauf**, **„Einfach
erklärt"** KI-Erklärer card („KI-Erklärer" pill) with „Worum geht es? / Wie hoch ist der Betrag? / Bis wann
muss ich zahlen?", **„Was bedeutet das für Sie?"** + **„Nächste Schritte"** with action buttons (Antwort
vorbereiten / Frist merken / Zahlung ausführen), „Fragen zum Bescheid?" → „Weitere Fragen stellen".

### 5.4 Vorgangsdetail / Umzug (mockup #5) — `/vorgaenge/umzug` (detail)
Big **„Umzug"** hero (Home icon circle) + „Melden Sie Ihren Wohnsitz um …" + Vorgangsnummer + „In Bearbeitung"
badge. Top-right: **Gesamtfortschritt** segmented bar (4/6) + **Voraussichtliche Fertigstellung 2–3 Tage**.
Main: **step timeline (1–6)** — Einwohnermeldeamt ✓ · Finanzamt ✓ · Krankenkasse ✓ · **Rundfunkbeitrag**
(amber „Bestätigung erforderlich" + „Bestätigung erteilen" primary + inline notice) · Kfz-Zulassung (blue „In
Prüfung") · Arbeitgeber (gray „Ausstehend" + „Dokument hochladen"). Each row: numbered node, icon, title, sub,
status chip, „Übermittelt am …", „Details ansehen ▾". Right rail: **Vorgang im Überblick** (Lebenslage/Nr/
Erstellt/Status), **Rechtsgrundlage & Berechtigungen** (§ 17 BMG, „An 6 Behörden", Einwilligungen), **Nächster
Schritt** card + primary CTA. Honest per-row Rechtsgrundlage. Footer „Vertrauen durch Standards" badges.

### 5.5 Datenschutz & Einwilligungen (mockup #2) — `/datenschutz`
Breadcrumb „Startseite". H1 „Datenschutz & Einwilligungen" + sub. 3 stat cards (Einwilligungen aktiv **3**
von 6 · Anfragen (30 Tage) **4** · Letzte Aktivität „Heute, 09:42"). **Einwilligungen für Datenweitergabe**
table (Empfänger/Kategorie · Zweck · Datenkategorien · Status · **Einwilligung toggle** · chevron) for
Krankenkasse/Arbeitgeber/Familienkasse (Aktiv) + Private Empfänger (Inaktiv); „Einwilligungs-Historie ansehen".
**Audit-Log** table (Zeitpunkt · Ereignis · Empfänger · **Rechtsgrundlage** (DSGVO Art. 6 …) · Details ansehen).
Right rail **„Vertrauen durch Prinzipien"** (Keine Daten ohne Rechtsgrundlage / Private Empfänger nur mit
Einwilligung / Transparenz & Kontrolle). Footer „Ihre Daten. Sicher geschützt." + security badges.

### 5.6 Leistungskatalog / Lebenslagen (mockup #6) — NEW route `/lebenslagen`
H1 „Leistungen finden." + „Einfach. Schnell. Verständlich." Big **search bar** („Leistung suchen, z. B.
‚Kindergeld beantragen'"). Category filter chips: **Alle Themen · Familie · Wohnen · Arbeit · Migration ·
Steuern · Mehr ▾**. „128 Leistungen gefunden" + Sortieren-Dropdown. **Service-card grid** (icon-circle, title,
description, frequency chip „Sehr häufig"/„Häufig", arrow): Umzug melden · Geburt anmelden · Aufenthaltstitel
verlängern · Kindergeld aktualisieren · Steuererklärung vorausfüllen · Reisepass beantragen · Studium & BAföG ·
Pflege & Gesundheit · Wohngeld beantragen. „Weitere Leistungen anzeigen ▾". Right rail **„Beliebt für Sie"**
(relevance chips „Sehr relevant"/„Relevant") + „Ihre Daten sind sicher". Footer badges.

---

## 6. Guardrails
- Sie-Form, no emoji, no exclamation marks, no marketing gradients, solid backgrounds, Lucide icons only.
- Every screen with personal data shows what's processed, by whom, on what Rechtsgrundlage.
- Tabular numerals for IDs/Fristen/€. WCAG 2.1 AA + BITV 2.0. 6-locale parity is a Phase-2 concern for new keys;
  the landing stays DE-only by design.
- Keep all existing functionality (autopilot, assistant, mock-backend, i18n wiring) intact — this is a re-skin.

---

## Build log — frontend-coder
- date: 2026-06-18
- screens implemented: Leistungskatalog / Lebenslagen (`/lebenslagen`, mockup #6, §5.6)
- components created/modified:
  - `src/app/(app)/lebenslagen/page.tsx` (new — server component, Breadcrumb + view)
  - `src/components/lebenslagen/LebenslagenView.tsx` (new — client view: search filter, category chips, sort, show-more, service grid, right rail, trust line)
  - `src/components/layout/TopNav.tsx` (Lebenslagen center-nav link `/vorgaenge` → `/lebenslagen`; Phase-2a TODO removed)
  - `src/components/layout/MobileNav.tsx` (added reachable Lebenslagen link to the mobile drawer)
  - `src/app/prototype-v2.css` (new page-scoped `.lk-*` block after the breadcrumb block)
- i18n keys added (DE source + 5 locales, full parity): `lebenslagen.*` namespace (title/subtitle, search, categories, results_count, sort, frequency, relevance, rail_*, trust_title, 9× `services.<id>.{title,description}`). Long service descriptions kept as DE fallback in non-DE locales per supporting-surface allowance; all headings/labels properly translated (en/ru/uk/ar/tr).
- data: static in-file list (9 services, 3 popular) — no mock-backend; catalog links to existing routes (Umzug→/vorgaenge/umzug/run, Steuer→/steuer, others→/vorgaenge|/dashboard).
- typecheck: pass (only the 2 pre-existing ajv errors in `src/lib/fit-connect/schema.ts`)
- lint: not run (pnpm/lint broken through the worktree node_modules junction — known constraint)
- i18n JSON: all 6 locales validated parse-clean (`node -e require`)
- a11y self-confirm: one h1, `<nav>` breadcrumb landmark, labelled `role="search"` input + submit, category chips in a labelled `role="group"` with aria-pressed, aria-label on sort select, `aria-live="polite"` result count, all decorative icons `aria-hidden`, visible focus rings via tokens.
- known gaps: search/submit/sort are client-side filter only (no backend, by design); „Mehr"-Kategorie acts as „Alle" (no extra catalog data); right rail collapses to a 2-up row 1080–560px then stacks.
- next: a11y-tester (axe sweep light/dark + keyboard) | code-reviewer

## Build log — frontend-coder
- date: 2026-06-18
- screens implemented: Datenschutz & Einwilligungen (`/datenschutz`, mockup #2, §5.5) — re-skin only
- components created/modified:
  - `src/components/datenschutz/DatenschutzView.tsx` (re-skinned to mockup #2: 3 stat cards, consent table-list with preserved `role=switch` toggles, compact „Letzte Aktivitäten" ul, Audit-Log table, „Vertrauen durch Prinzipien" rail, trust footer with security badges; all data wiring + dialogs + export + live-region announcement preserved; banner upgraded to `role=note` + focus-to-H2 on dismiss + persists `dismissVisionBanner`)
  - `src/app/(app)/datenschutz/page.tsx` (added shared `Breadcrumb` Startseite → Datenschutz & Einwilligungen)
  - `src/app/prototype-v2.css` (new page-scoped `.ds2-*` block appended after the old `datenschutz.html` block; old `.ds-*` block left intact for the dialog rows it still styles)
- i18n keys added (DE source + 5 locales, full parity): `datenschutz.page.{title,subtitle}` updated to mockup copy; new `datenschutz.stats.*`, `datenschutz.weitergabe.*` (table headers + per-receiver zweck/kategorien + status + widerruf note), `datenschutz.audit.*` (table headers + details link), `datenschutz.rail.*` (3 principles), `datenschutz.footer.*` (title + 4 security badges)
- data: NO mock-backend change — keeps the 4 existing receivers (krankenkasse/bank/arbeitgeber/weitere_dienste); the mockup's „Familienkasse/Private Empfänger" labels are mapped onto these via copy. Audit-Log + recent-activity both render the existing `uebermittlungs-log`.
- typecheck: pass (only the 2 pre-existing ajv errors in `src/lib/fit-connect/schema.ts`)
- a11y: `tests/a11y/redesign-datenschutz.spec.ts` 10/10 PASS (axe light/dark/RTL 0 serious-critical; one main+one h1; no skipped levels; 4 `role=switch`+aria-label+aria-checked; toggle flips+announces+„Einwilligung geändert" tops the timeline; banner dismiss → focus H2; `main table` th[scope]=6 + timeline `ul`; reduced-motion skeleton)
- i18n JSON: all 6 locales validated parse-clean (`node -e require`)
- known gaps: spine e2e could NOT be run green in this worktree — every route that bundles the shared server-action flight entry (incl. `fit-connect.ts` → `ajv/dist/2020`) 500s under `next dev` because `ajv/dist/2020` is unresolvable in the junctioned node_modules (the pre-existing ajv constraint; `next build` is likewise blocked per task). This is environmental + unrelated to the Datenschutz re-skin (the a11y suite served the route 200 before a dual-dev-server `.next` corruption surfaced the ajv miss). Spine touches dashboard/assistent/posteingang, not `/datenschutz`.
- next: a11y-tester (independent axe sweep) | code-reviewer

## Build log — frontend-coder
- date: 2026-06-18
- screens implemented: Dashboard (`/dashboard`, mockup #4, §5.2) — re-skin/polish only
- components created/modified:
  - `src/components/dashboard/DashboardView.tsx` — page head now greeting-as-H1 (Inter Tight) + sub line („Hier ist Ihr Überblick für heute …"); added dedicated **Nächster Termin** card (CalendarClock icon, „Bestätigt" badge, betreff + date/time + Ort, „Details ansehen"/„In Kalender" CTAs) sourced from `termin_tile`; dropped the duplicated pending-termin row from the Erledigt-Feed (now its own card); wired `umzugFristDatum` (nearest open Frist) into the Umzug card. All data wiring, stat-tile hrefs, todo dismiss/snooze handlers, and the spine-critical headings preserved.
  - `src/components/dashboard/TriumphBanner.tsx` — reshaped the §B2 white card into **„Ihr Umzug im Überblick"** with a **circular SVG progress ring** in Waldgrün (`--brand-600` fill on `--brand-50` track, `stroke-dasharray`, big tabular-nums % in Inter Tight centre, `role="img"` + `aria-label` so the value is not colour-/shape-only); facts „{done} von {total} Stellen informiert" + „Zeit gespart"; „Nächster Schritt … Fällig bis {datum}" amber chip; primary „Zum Umzug gehen →". Percent computed honestly from `value_receipt.behoerden_count / klassische_schritte`.
  - `src/app/prototype-v2.css` — dashboard block: greeting `.dash-head`/`.dash-greeting`/`.dash-greeting-sub`; umz-hero block reworked to `.umz-overview`/`.umz-ring`/`.umz-fact`/`.umz-next` + new `.nt-card` (Nächster Termin); removed dead `.umz-stat-*`/`.umz-hero-stats`/`.umz-hero-body` rules; ring transition behind `prefers-reduced-motion`.
- i18n keys added (DE source + 5 locales, full parity): `dashboard.greeting.sub`; `dashboard.greeting.guten_tag` → „Guten Morgen, {name}"; `dashboard.triumph.{overview_title,ring_label,ring_aria,stellen_informiert,naechster_schritt_label,naechster_schritt_wert,naechster_schritt_frist,zum_umzug}`; new `dashboard.naechster_termin.{titel,badge_bestaetigt,details,kalender,none,praesenz,video,telefon}`. ICU-format-validated across all 6 locales.
- spine-guard note: kept `dashboard.heute.titel` = „Was heute Ihre Aufmerksamkeit braucht" and the `kacheln.posteingang/vorgaenge.titel` headings unchanged (spine e2e asserts them verbatim); greeting heading still contains the surname → matches `/Petrov/i`.
- typecheck: pass (only the 2 pre-existing ajv errors in `src/lib/fit-connect/schema.ts`)
- i18n JSON: all 6 locales validated parse-clean (`node -e require`) + zero keys removed vs HEAD
- a11y self-confirm (static reasoning — not run, ajv blocks dev/build in this worktree): one `<h1>` (greeting); DOM-order heading sequence 1·2·2·3·3·3·3·3·3·2 → no skipped levels (matches `redesign-dashboard.spec.ts` landmark test); stat-tile hrefs unchanged `[/posteingang,/posteingang,/termine,/vorgaenge]`; ring is `role="img"`+aria-label with redundant visible % numeral (not colour-only); amber Frist + green badges reuse the AA-safe light-chip tokens (`amber-50`/`amber-700`, `green-50`/`green-700`) that hold in dark mode; all decorative icons `aria-hidden`.
- known gaps: ring percent reflects informed-vs-total from the value-receipt (not a per-step saga read), so it shows the completed-run figure; „Aktivitäten" feed = the existing „Automatisch erledigt für Sie" timeline (no separate data source). spine e2e + axe NOT run here (pre-existing ajv constraint blocks `next dev`/`next build` in the junctioned worktree).
- next: a11y-tester (axe sweep light/dark + RTL + keyboard) | code-reviewer
