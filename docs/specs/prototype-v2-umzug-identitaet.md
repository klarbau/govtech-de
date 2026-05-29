---
feature: prototype-v2-umzug-identitaet
title: Identität bestätigen — pre-autopilot consent (Umzug)
status: spec
track: supporting
date: 2026-05-28
author: frontend-coder (parallel session)
owner_agents: [frontend-coder]
inputs:
  prototype_png: C:\Users\iaiaa\Downloads\076ebb22-642f-497b-aea6-583bf1caf44b.png
  existing_run_page: src/app/(app)/vorgaenge/umzug/run/page.tsx
  existing_preview_page: src/app/(app)/vorgaenge/umzug/preview/page.tsx
  cascade_owner_spec: docs/specs/autopilot-run-hero.md
not_required_agents:
  mock-backend-coder: no backend touched
  assistant-engineer: no AI involved
  i18n-localizer: hardcoded DE inline per parallel-session ground rules
---

> **Scope guard.** Pure presentation surface. NO new backend, NO new types, NO i18n-file edits, NO touching of cascade-run components (`AutopilotCascade*`, `AutopilotHeroBanner`, `AutopilotLiveFeed`, `UmzugUebersichtCard`, `behoerdeIcon`, `cascadeTypes`, `stepStatusViz`, `AutopilotStepRow`). All new files prefixed `Identitaet*` under `src/components/umzug/`.

## 1. Problem & opportunity

The Umzug-Autopilot already ships the most visible wow (the cascade). What is missing is the *moment of trust* directly before — the citizen sees, in plain German, **which identity sources speak for them** (DeutschlandID + EUDI Wallet), **which 6 attributes leave their wallet**, **which 4 Behörden receive data on a legal basis** (no consent), and **which 4 parties require an explicit Einwilligung**. This is the privacy-by-design narrative made visible.

The screen renders the citizen-respectful tone of gov.uk + DigitalService DE: generous whitespace, no marketing language, every status in text + badge, calm cobalt accent.

## 2. Where it lives in the flow

Current Umzug wizard:

```
/vorgaenge/umzug/start    (Adresse + Wohnungsgeber)
       ↓
/vorgaenge/umzug/preview  (Vorschau: Block A/D/B/C)
       ↓
/vorgaenge/umzug/run      (Cascade läuft)
```

This spec inserts a parallel surface at `/vorgaenge/umzug/identitaet` — a self-contained route that the citizen can reach from the dashboard (as a deep-link to a demo scene) and from the preview screen's secondary CTA "Identität prüfen". It is the **conceptual** pre-autopilot consent step.

Decision: **NEW ROUTE, not splitting `/run`**. Rationale:
- The run page owns the live cascade and is actively under another agent's polish.
- Splitting `/run` would force the run agent to coordinate consent state into the cascade boot.
- A standalone route can be linked from the Loom walkthrough as a clean scene.

Forward navigation from the new screen lands on `/vorgaenge/umzug/preview` (the existing flow). The CTA wording "Mit eID bestätigen und Autopilot vorbereiten" reflects *prepare*, not *start*.

## 3. Route & file inventory

- **New route**: `src/app/(app)/vorgaenge/umzug/identitaet/page.tsx` (Client; uses `useState` for collapsibles).
- **New components** (all in `src/components/umzug/`, `Identitaet*` prefix to avoid collision with the run agent):
  - `IdentitaetSourceCard.tsx` — DeutschlandID / EUDI Wallet hero card (top row of two).
  - `IdentitaetDatenRow.tsx` — one attribute row (icon + label + sub + status badge + chevron).
  - `IdentitaetDatenCard.tsx` — left main card "Ihre verfügbaren Daten" containing 6 rows.
  - `IdentitaetFreigabeRow.tsx` — one Freigabe row (icon + label + sub + status text).
  - `IdentitaetFreigabenCard.tsx` — right main card "Freigaben für diesen Vorgang" with two groups (automatic + consent).
  - `IdentitaetSpekulativeNote.tsx` — bottom blue info banner.
- **No edits** to: `AutopilotCascade*`, `AutopilotHeroBanner`, `AutopilotLiveFeed`, `UmzugUebersichtCard`, `behoerdeIcon`, `cascadeTypes`, `stepStatusViz`, `AutopilotStepRow`, the run page, the preview page, the start page, `i18n/locales/*`, `mock-backend`.

Reused primitives: `PageHeader`, `IconCircle`, `StatusBadge`, `Card`, `CardContent`, `Button`, `PrototypeDisclaimer` — no fork.

## 4. Screen layout (matches sketch)

```
┌────────────────────────────────────────────────────────────────────────┐
│ Identität bestätigen                                                    │  ← PageHeader (h1)
│ Bitte prüfen Sie, welche Daten verwendet werden, bevor der               │
│ Umzug-Autopilot gestartet wird.                                          │
├────────────────────────────────────────────────────────────────────────┤
│ ┌────────────────────────────┐  ┌────────────────────────────┐         │
│ │ (🛡)  DeutschlandID         │  │ (👛) EUDI Wallet            │         │   ← top row
│ │ Staatliches Online-Identitäts│  │ Europäische digitale Brief-│         │     2 source cards
│ │ konto · ✓ Verbunden          │  │ tasche · ✓ Bereit          │         │
│ │                  [Verifiziert]│  │                  [Bereit]   │         │
│ └────────────────────────────┘  └────────────────────────────┘         │
│                                                                          │
│ ┌──────────────────────────────┐  ┌────────────────────────────────────┐│
│ │ Ihre verfügbaren Daten        │  │ Freigaben für diesen Vorgang       ││  ← main row
│ │ (collapsible-style rows)      │  │ Welche Stellen welche Daten erhalten││     2 main cards
│ │  • Name           [Bestätigt] │  │                                     ││
│ │  • Geburtsdatum   [Bestätigt] │  │ Automatischer Behördenabgleich      ││
│ │  • Anschrift      [Bestätigt] │  │  (gesetzlich erlaubt)               ││
│ │  • Familienstand  [Verfügbar] │  │   • Bürgeramt        Wird autom. ✓ ││
│ │  • Aufenthaltstit.[Verfügbar] │  │   • Finanzamt        Wird autom. ✓ ││
│ │  • Dokumente      [Optional ] │  │   • Beitragsservice  Wird autom. ✓ ││
│ │ ────────────────────────────  │  │   • Bundesdruckerei  Wird autom. ✓ ││
│ │ DSGVO-Hinweis · Mehr erfahren │  │                                     ││
│ └──────────────────────────────┘  │ Einwilligungsbasierte Freigaben     ││
│                                   │  (Ihre Zustimmung erforderlich)     ││
│                                   │   • Krankenkasse   Zustimmung erf. ›││
│                                   │   • Bank           Zustimmung erf. ›││
│                                   │   • Arbeitgeber    Zustimmung erf. ›││
│                                   │   • Versicherer    Zustimmung erf. ›││
│                                   └────────────────────────────────────┘│
│                                                                          │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │ (ℹ) Hinweis: Dies ist eine spekulative Demo                          │ │
│ │ Reale DeutschlandID-/EUDI-Integrationen sind nicht aktiv. Alle Daten │ │
│ │ sind synthetisch und werden ausschliesslich lokal verarbeitet.        │ │
│ │ Mehr erfahren ›                                                       │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
│                                                                          │
│                       [Abbrechen]  [Mit eID bestätigen und Autopilot     │
│                                     vorbereiten ›]                       │
└────────────────────────────────────────────────────────────────────────┘
```

### 4.1 Source cards (top row)
Each `IdentitaetSourceCard` shows:
- `IconCircle` `tone="primary"` left (DeutschlandID: `ShieldCheck`, EUDI: `Wallet`).
- Title `text-base font-semibold` ("DeutschlandID" / "EUDI Wallet").
- Subtitle `text-sm text-text-secondary`.
- Connection state: small inline "✓ Verbunden" / "✓ Bereit" beneath subtitle, success colour.
- Right side: `StatusBadge variant="verifiziert"` for DeutschlandID, `variant="bestaetigt"` for EUDI.

Cards are non-interactive (no hover affordance — they are status surfaces).

### 4.2 Daten card (left main)
Six attribute rows. Each `IdentitaetDatenRow`:
- `IconCircle size="sm" tone={statusTone}` left.
- Label + sub stacked.
- `StatusBadge` right + chevron icon (`ChevronRight`) — purely visual; the chevron implies "details available" but the row itself is a `<button>` that toggles expanded detail copy beneath.
- The 6 rows + their data:
  1. **Name** — "Anna Margarete Petrov" → `Bestätigt` (variant `verifiziert`, tone `success`, icon `User`).
  2. **Geburtsdatum** — "12.04.1992" → `Bestätigt` (`verifiziert`, success, icon `CalendarDays`).
  3. **Aktuelle Anschrift** — "Müllerstr. 12, 13353 Berlin" → `Bestätigt` (`verifiziert`, success, icon `MapPin`).
  4. **Familienstand** — "ledig" → `Verfügbar` (variant `neu` — info-blue dot, tone `primary`, icon `Heart`).
  5. **Aufenthaltstitel** — "§ 18g AufenthG (gültig bis 14.08.2029)" → `Verfügbar` (`neu`, primary, icon `BadgeCheck`).
  6. **Dokumente** — "3 Nachweise im Wallet" → `Optional` (variant `vorlage` neutral, tone `neutral`, icon `Files`).

Expanded detail (collapsible): a short DE prose line explaining the source ("Quelle: DeutschlandID-Selbstauskunft" or "Wallet-Attestation"). Toggle via `aria-expanded`; `<button>` wraps the row content.

Footer of the card: small italic prose "Ihre Daten werden sicher übertragen und gemäß DSGVO verarbeitet." + a "Mehr erfahren" link to `/datenschutz`.

### 4.3 Freigaben card (right main)
Two grouped lists.

**Group A — Automatischer Behördenabgleich** (subtitle: "gesetzlich erlaubt"):
- Bürgeramt — § 33 BMG → "Wird automatisch abgeglichen ✓" (success text).
- Finanzamt — § 39e EStG → same.
- Beitragsservice — § 14 RBStV → same.
- Bundesdruckerei — § 18 PAuswG → same.

**Group B — Einwilligungsbasierte Freigaben** (subtitle: "Ihre Zustimmung erforderlich"):
- Krankenkasse — Mitteilung neue Anschrift → "Zustimmung erforderlich" (warning text) + trailing `ChevronRight`.
- Bank — Kontaktdaten-Aktualisierung → same.
- Arbeitgeber — Lohnsteuermerkmale → same.
- Versicherer — Vertragsdaten → same.

Group A rows are visually decorated with a small success-tone dot at left (`IconCircle size="sm" tone="success"` with `Landmark`); Group B with a primary-tone dot (`IconCircle size="sm" tone="primary"` with `Building2`).

Each row is a `<button>` on Group B (could open a future consent modal — not wired in this spec; clicking is a no-op with a console-free placeholder). On Group A, rows are static `<div>`s (no action available — the abgleich is automatic).

### 4.4 Speculative-demo note (bottom banner)
A soft blue `Card` (`bg-accent-soft border-transparent`) with `IconCircle Info` left, title "Hinweis: Dies ist eine spekulative Demo", body explaining the speculative nature, and a "Mehr erfahren" link to the dashboard's project context (`/datenschutz`).

### 4.5 Sticky action bar
A bottom `div` with `Abbrechen` (outline, navigates back to `/dashboard`) and primary CTA "Mit eID bestätigen und Autopilot vorbereiten" with trailing `ArrowRight`. The primary CTA navigates to `/vorgaenge/umzug/preview` (the existing next-step) — *without* mutating any state, since this surface is a pure scene.

The sketch shows a sticky cobalt CTA in the bottom-right; we mirror this as a non-sticky bottom bar (sticky on mobile only, regular flow on `≥ md`). HL-DS-8 ≥ 44px target.

## 5. Component shapes (no TSX)

### 5.1 `IdentitaetSourceCard`
```
props:
  icon: ReactNode
  title: string
  subtitle: string
  connectionLabel: string   // e.g. "Verbunden" / "Bereit"
  status: 'verifiziert' | 'bestaetigt'   // → StatusBadge variant
  statusLabel: string       // "Verifiziert" / "Bereit"
```

### 5.2 `IdentitaetDatenRow`
```
props:
  icon: ReactNode
  iconTone: IconCircle tone
  label: string
  sub: string
  status: 'verifiziert' | 'neu' | 'vorlage'
  statusLabel: string
  expandedBody: string  // shown when row expanded
```
The row renders as `<li>` containing a `<button type="button" aria-expanded={...}>`. Toggling sets local state; expanded body is `<p>` beneath the row in the same `<li>`.

### 5.3 `IdentitaetDatenCard`
Container: `SectionCard title="Ihre verfügbaren Daten" as="h2"` with `<ul>` of `IdentitaetDatenRow`s. Footer prose + DSGVO link.

### 5.4 `IdentitaetFreigabeRow`
```
props:
  icon: ReactNode
  iconTone: IconCircle tone
  label: string
  sub: string
  kind: 'automatic' | 'consent'
  trailingLabel: string  // "Wird automatisch abgeglichen" / "Zustimmung erforderlich"
```
If `kind === 'consent'`: render as `<li><button>`, trailing `ChevronRight`, no real action (placeholder — open a future modal).
If `kind === 'automatic'`: render as `<li>` only.

### 5.5 `IdentitaetFreigabenCard`
Container: `SectionCard title="Freigaben für diesen Vorgang" as="h2"`. Two `<section aria-labelledby>` blocks, each with an `<h3>` subheading and a `<ul>` of `IdentitaetFreigabeRow`s.

### 5.6 `IdentitaetSpekulativeNote`
A `Card` with `bg-accent-soft border-transparent`, `IconCircle Info tone="primary"`, title `<h2>` ("Hinweis: Dies ist eine spekulative Demo"), body prose, "Mehr erfahren" link.

## 6. Accessibility

- Exactly one `<h1>` (PageHeader). Card titles are `<h2>`. Group subheaders inside the Freigaben card are `<h3>`.
- All rows are semantic `<li>`s inside `<ul>`s. Expandable Daten rows use `<button aria-expanded>` and `aria-controls` pointing at the inline expanded `<p>`.
- Status NEVER conveyed by colour alone — every badge and every Freigabe row carries an explicit DE label.
- Touch targets ≥ 44px (rows have `min-h-[3rem]`, padding `py-3`).
- Focus rings: rely on the global focus-visible token (`ring-2 ring-primary`).
- `prefers-reduced-motion`: no entrance animations introduced; chevron rotation on row expand uses a CSS transition that respects motion-reduce.
- Dark mode: all tokens (`bg-card`, `text-text-primary`, `bg-accent-soft`) work in both schemes — no custom hex.
- AR-RTL: rows use logical properties (`gap`, `flex` — no `ml-*` / `mr-*` direction-locked); chevrons rotate via `rtl:rotate-180`.

## 7. States

- **Default**: all rows collapsed.
- **Expanded row**: chevron rotated 90°, inline body shown beneath.
- **Loading**: not applicable — the screen is fully static.
- **Error**: not applicable — no async.

## 8. i18n

**Hardcoded German inline** per parallel-session ground rules (no `t()` calls, no `de.json` edits). Source-of-truth strings live in the components.

All strings use Sie-Form and are factual. Behörden names are real. Legal norms (§ 33 BMG etc.) appear as short tags next to the row, in `font-mono text-[11px]`.

## 9. Verify checklist

- [ ] `npx tsc --noEmit` passes.
- [ ] Route `/vorgaenge/umzug/identitaet` renders the sidebar shell (sketch shows sidebar).
- [ ] Exactly one `<h1>`; card titles `<h2>`; group sub-titles `<h3>`.
- [ ] All 6 Daten rows expand/collapse via keyboard.
- [ ] All 8 Freigabe rows render in two groups with correct trailing affordance.
- [ ] No cascade-run component edited (`git diff` clean on `AutopilotCascade*`, `AutopilotHeroBanner`, `AutopilotLiveFeed`, `UmzugUebersichtCard`, `behoerdeIcon`, `cascadeTypes`, `stepStatusViz`, `AutopilotStepRow`, run page).
- [ ] No i18n JSON file touched.
- [ ] No commit created.

## 10. Out of scope

- Wiring real consent state — the Freigabe-consent buttons are visual placeholders; they navigate nowhere and store nothing.
- Modifying the existing preview / run / start pages.
- Translating the new strings to EN/RU/UK/AR/TR (intentional per parallel-session rules — flagged as a followup).
- Adding the screen to the wizard `WizardProgress` ordinal (would require editing `WizardProgress.tsx` and i18n; out of scope).

## 11. Follow-ups (handed to next session)

- Localize the new DE strings to the 5 non-DE locales.
- Decide whether `Identität bestätigen` becomes a 4th wizard step (currently 3 — adresse/vorschau/autopilot). If yes, update `WizardProgress` ordinal labels.
- Wire a real consent modal for Group B rows.
- Optionally: link the preview screen's secondary CTA to this route ("Identität prüfen").
