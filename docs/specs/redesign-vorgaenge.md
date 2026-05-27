---
feature: redesign-vorgaenge
title: Redesign Vorgänge — Übersicht (NEW Liste) + Re-Skin der Umzug-Timeline (horizontaler Stepper)
status: shipped
track: spine
date: 2026-05-27
author: product-architect
authorization: docs/demo-spine.md § "ACTIVE BUILD (decided 2026-05-27)" — user-supplied prototype; research/domain/verify waived per spine note.
owner_agents: [frontend-coder, mock-backend-coder, i18n-localizer, a11y-tester, code-reviewer]
inputs:
  prototype: docs/design-prototype/01-vorgaenge.png
  foundation: docs/specs/redesign-foundation.md  # primitive + token CONTRACT
  existing_impl: src/components/umzug/** (AutopilotTimeline, AutopilotStepRow, CascadeRow, BehoerdenStatusList, VorgangHeader, WizardProgress, EidConfirmDialog), src/app/(app)/vorgaenge/** (page, umzug/{start,preview,run,[id]})
  existing_specs: docs/specs/umzug.md
  data_model: src/types/vorgang.ts (Vorgang, AutopilotStep, BlockTyp, VorgangStatus)
gates: requires redesign-foundation APPROVE.
---

> **Two parts.** (1) The Vorgänge **overview** is a NEW list screen — the current
> `/vorgaenge/page.tsx` is a single-card stub linking only to the Umzug wizard.
> (2) The **Umzug timeline** (run + detail view) already exists
> (`AutopilotTimeline`/`AutopilotStepRow`, vertical block-grouped list) and is
> RE-SKINNED to the prototype's horizontal progress stepper. Existing autopilot
> mechanics (Block A/B/C/D, eID-confirm, event-stream) are PRESERVED.

> **Scope guard.** Reuse foundation primitives (`PageHeader`, `FilterTabs`,
> `SectionCard`, `RightRailCard`, `StatusBadge`, `IconCircle`, `EmptyState`,
> `FristCountdown`). The overview's process cards + horizontal stepper are NEW
> components; the timeline re-skin extends existing umzug components. No legal-line
> changes to the Umzug autopilot.

---

## 1. Problem statement

Es gibt keine Vorgänge-Übersicht — `/vorgaenge` zeigt nur eine Karte, die zum Umzug-Wizard führt. Die Bürger:in soll alle laufenden und abgeschlossenen Vorgänge auf einen Blick sehen (mit Filter Alle/Laufend/Warten auf Sie/Abgeschlossen), den Umzug-Fortschritt als horizontalen Stepper (welche Behörde fertig, welche aktiv, welche offen), und „Was ist gerade wichtig?" in einer rechten Spalte. Der Umzug-Stepper ist außerdem das visuelle Ziel des Assistent-Hero (nach „leite meinen Umzug ein").

## 2. Persona & journey

- Persona: `docs/personas.md#anna-petrov` (Demo-Default); persona-agnostisch.
- Trigger: Bürger:in öffnet `/vorgaenge` (Dashboard-Kachel / Sidebar) ODER wird vom Assistenten nach `starte_umzug` in die Run-Timeline geführt.
- Outcome: Bürger:in sieht den Stand jedes Vorgangs; bei Umzug sieht sie die Kaskade Behörde-für-Behörde fortschreiten und bestätigt eID-Schritte (Block D).
- Time saved vs status quo: statt jede Behörde einzeln nach dem Bearbeitungsstand zu fragen, ein aggregierter Fortschritts-Stepper; der Umzug-Wow (alle Behörden in einer Timeline) ist hier sichtbar.

## 3. Success criteria for the demo

- [ ] Übersicht zeigt Filter-Tabs Alle/Laufend/Warten auf Sie/Abgeschlossen mit Counts.
- [ ] Großer Vorgangs-Karten-Stepper (Umzug): horizontale Progress-Knoten (grüner Haken / aktiver Puls / offen), Behörde-Labels + Daten + „x von y abgeschlossen".
- [ ] Sekundäre Vorgangs-Karten (Aufenthaltstitel, Kindergeld mit „Unterlagen fehlen"-Warnung).
- [ ] „Was ist gerade wichtig?"-Right-Rail mit den dringendsten Items.
- [ ] Die bestehende Umzug-Kaskade (eID-Bestätigung, Event-Stream, Bestätigungsschreiben) läuft im neuen Look weiter grün.
- [ ] Lighthouse a11y > 95; axe 0 kritisch.

## 4. Screen-by-screen flow

### 4.1 Screen: Vorgänge-Übersicht (NEW)

- **Route**: `/vorgaenge`
- **File**: `src/app/(app)/vorgaenge/page.tsx` (ersetzt Stub). RSC-Page lädt `getVorgaenge()` + `getBehoerden()` server-side, übergibt an `<VorgaengeView>` (`'use client'` für Filter-State).
- **Server or client**: Page RSC; `<VorgaengeView>` Client (Filter-Tabs).

- **Layout** (Prototyp 01-vorgaenge.png):

```
┌──────────────────────────────────────────────────────────────────────┐
│ Vorgänge                                               [Page-H1]       │
│ Laufende und abgeschlossene Behördenprozesse im Überblick  subtitle    │
│                                                                        │
│ [Alle 4 | Laufend 2 | Warten auf Sie 1 | Abgeschlossen 1]  [Filter ▾]  │ ← FilterTabs + FilterButton
│                                                                        │
│ ┌─ HAUPT (links, flex-1) ───────────────────┐ ┌─ Was ist gerade ────┐ │
│ │ ┌─ Umzug ───────────────[Laufend] ───────┐│ │   wichtig?  (Rail)   │ │
│ │ │ Alle Behörden werden automatisch …      ││ │ ③ Offene Vorgänge   │ │
│ │ │ Fortschritt          4 von 6 erledigt   ││ │   Ansehen        →   │ │
│ │ │ ●───●───●───◌───◌───◌                    ││ │ ① Frist nähert sich │ │
│ │ │ ✓   ✓   ✓  aktiv off  off               ││ │   Frist in 7 Tagen  │ │
│ │ │ Bürger Finanz Beitrag Bundes  KFZ  ABH  ││ │   Ansehen        →   │ │
│ │ │ amt   amt    service  druck.            ││ │ ② Warten auf Best.  │ │
│ │ │ [01.06][02.06][02.06] …                 ││ │   Ansehen        →   │ │
│ │ │                          Verwenden? Sie ││ │ Alle Vorgänge ansehen→│ │
│ │ └─────────────────────────────────────────┘│ └──────────────────────┘ │
│ │ ┌─ Aufenthaltstitel ──┐ ┌─ Kindergeld ────┐│                          │
│ │ │ verlängern [Laufend]│ │ aktualisieren   ││                          │
│ │ │ Frist in 14 Tagen   │ │ [Unterlagen     ││                          │
│ │ │ Weiter bearbeiten   │ │  fehlen ⚠]      ││                          │
│ │ └─────────────────────┘ │ Unterlagen hochl.││                         │
│ │                         └─────────────────┘│                          │
│ └─────────────────────────────────────────────┘                        │
└──────────────────────────────────────────────────────────────────────┘
```

- **Components used**:
  - `PageHeader` (foundation B2) — title `vorgaenge.title`, subtitle `vorgaenge.subtitle`.
  - `<VorgaengeView>` `<NEW>` (`src/components/vorgaenge/VorgaengeView.tsx`, client) — Filter-State + Layout-Split (Haupt + Rail).
  - `FilterTabs` (foundation B3) — Tabs Alle/Laufend/Warten auf Sie/Abgeschlossen mit Counts. Mapping zu `VorgangStatus`:
    - „Alle" = alle.
    - „Laufend" = `status ∈ {angelegt, in_pruefung, genehmigt}` mit mind. einem nicht-finalen Schritt.
    - „Warten auf Sie" = mind. ein Schritt `status ∈ {needs_eid, pending_eid_confirmation}` ODER ein Vorgang mit fehlenden Unterlagen (siehe Kindergeld-Karte).
    - „Abgeschlossen" = `status === 'abgeschlossen'`.
  - `FilterButton` (foundation B7) — optionaler Zusatz-Filter (Typ). Kann in V1 ein dünner Platzhalter sein, wenn nur die Status-Tabs nötig sind.
  - `<ProcessCard>` `<NEW>` (`src/components/vorgaenge/ProcessCard.tsx`) — die große Vorgangs-Karte. `SectionCard`-basiert. Kopf: Titel (`text-lg font-semibold`) + Status-`StatusBadge` rechts (`laufend`/`warten`/`abgeschlossen`) + Kurzbeschreibung. Body: `<HorizontalStepper>` + „x von y erledigt"-Zeile. Footer: kontextuelle CTA („Weiter bearbeiten" / „Kaskade ansehen" → `/vorgaenge/umzug/run?vorgangId=…` oder `/vorgaenge/[id]`).
  - `<HorizontalStepper>` `<NEW>` (`src/components/vorgaenge/HorizontalStepper.tsx`) — **das Kern-Wow-Element**. Horizontale Knoten-Reihe, ein Knoten je beteiligter Behörde/Schritt:
    - confirmed → grüner gefüllter Knoten mit `Check` (success).
    - in_progress / needs_eid → aktiver Knoten mit Puls-Animation (framer-motion, unter `prefers-reduced-motion` statischer Ring, HL-DS-4).
    - pending / self_assigned → offener (outline) Knoten (`text-text-muted`).
    - failed → Danger-Knoten (`AlertCircle`).
    - Unter jedem Knoten: Behörde-Label (`text-xs`, truncate) + Datum (`tabular-nums`, `text-text-muted`). Verbindungslinien zwischen Knoten färben sich (success bis zum letzten confirmed). „x von y erledigt"-Zähler (`tabular-nums`).
    - Auf < md: der Stepper wird vertikal (fällt zurück auf die bestehende `AutopilotTimeline`-Block-Liste — siehe § 4.2; der horizontale Stepper ist die ≥ md-Darstellung der Übersichtskarte).
  - `<ProcessCardSmall>` `<NEW>` (`src/components/vorgaenge/ProcessCardSmall.tsx`) — sekundäre Vorgangs-Karten (Aufenthaltstitel, Kindergeld). `SectionCard` kompakt: Titel + Status-Badge + eine Kennzahl-Zeile (`FristCountdown` „Frist in 14 Tagen" ODER `StatusBadge` Variante `warten` „Unterlagen fehlen") + CTA („Weiter bearbeiten" / „Unterlagen hochladen"). Bei „Unterlagen fehlen": Warning-`StatusBadge` + `AlertTriangle`-`IconCircle` (tone warning).
  - `<WasIstWichtigRail>` `<NEW>` (`src/components/vorgaenge/WasIstWichtigRail.tsx`) — `RightRailCard` (foundation B4) Titel `vorgaenge.rail.title` + nummerierte Liste der dringendsten Items (abgeleitet aus den Vorgängen: offene Vorgänge / Frist nähert sich / warten auf Bestätigung), jedes mit Mini-`StatusBadge` + „Ansehen"-Link. Footer-Link „Alle Vorgänge ansehen". (Datenquelle: dieselben `getVorgaenge`-Daten, client-seitig priorisiert — KEIN AI nötig; deterministisch nach Frist/Status.)
  - `EmptyState` (foundation B14) — wenn keine Vorgänge im gewählten Filter: „Keine Vorgänge in dieser Ansicht." + (für „Alle" leer) CTA „Umzug starten" → `/vorgaenge/umzug/start`.
  - `FristCountdown` (reuse, foundation-restyled).

- **Data fetched**:
  - `api.getVorgaenge()` (bestehend) + `api.getBehoerden()` (für Behörde-Labels im Stepper).
  - KEIN neuer Backend-Call zwingend nötig (siehe § 6 für einen optionalen Komfort-Helper).

- **i18n keys introduced** (DE source; `track: spine` → 6 Sprachen):
  - `vorgaenge.title` = „Vorgänge"
  - `vorgaenge.subtitle` = „Laufende und abgeschlossene Behördenprozesse im Überblick"
  - `vorgaenge.filter.alle` = „Alle"
  - `vorgaenge.filter.laufend` = „Laufend"
  - `vorgaenge.filter.warten` = „Warten auf Sie"
  - `vorgaenge.filter.abgeschlossen` = „Abgeschlossen"
  - `vorgaenge.card.progress` = „{erledigt} von {gesamt} erledigt"
  - `vorgaenge.card.cta_weiter` = „Weiter bearbeiten"
  - `vorgaenge.card.cta_kaskade` = „Kaskade ansehen"
  - `vorgaenge.card.cta_unterlagen` = „Unterlagen hochladen"
  - `vorgaenge.card.unterlagen_fehlen` = „Unterlagen fehlen"
  - `vorgaenge.card.umzug_subtitle` = „Alle zuständigen Behörden werden automatisch informiert."
  - `vorgaenge.stepper.aria` = „Fortschritt des Vorgangs {titel}"
  - `vorgaenge.stepper.node_done` = „{behoerde}: abgeschlossen"
  - `vorgaenge.stepper.node_active` = „{behoerde}: in Bearbeitung"
  - `vorgaenge.stepper.node_pending` = „{behoerde}: ausstehend"
  - `vorgaenge.stepper.node_failed` = „{behoerde}: fehlgeschlagen"
  - `vorgaenge.rail.title` = „Was ist gerade wichtig?"
  - `vorgaenge.rail.offene_vorgaenge` = „Offene Vorgänge"
  - `vorgaenge.rail.frist_naht` = „Frist nähert sich"
  - `vorgaenge.rail.warten_bestaetigung` = „Warten auf Bestätigung"
  - `vorgaenge.rail.cta_ansehen` = „Ansehen"
  - `vorgaenge.rail.alle_ansehen` = „Alle Vorgänge ansehen"
  - `vorgaenge.empty.title` = „Keine Vorgänge in dieser Ansicht"
  - `vorgaenge.empty.cta_umzug` = „Umzug starten"
  - Reuse: `common.status.*` (laufend/warten/abgeschlossen/in_bearbeitung), `common.filter`, `common.show_all`.

- **States**: loading (Skeleton-Karten) / empty-per-filter (`EmptyState`) / empty-all (`EmptyState` + Umzug-CTA) / error (Retry-Inline) / cascade-live (auf der Run-Page, § 4.2, Stepper aktualisiert sich per Event-Stream).

- **Accessibility notes**:
  - Genau ein `<h1>` (`PageHeader`). `FilterTabs` mit Counts im accessiblen Namen, ≥ 44px.
  - Jede `<ProcessCard>` / `<ProcessCardSmall>` als `<article aria-labelledby>` mit `<h2>`/`<h3>`.
  - `<HorizontalStepper>` als `<ol aria-label={vorgaenge.stepper.aria}>`; jeder Knoten `<li>` mit Text-Status (`vorgaenge.stepper.node_*`), nicht nur Farbe. Aktiver Knoten `aria-current="step"`.
  - Puls-Animation unter `prefers-reduced-motion` → statisch (HL-DS-4).
  - „x von y erledigt" `tabular-nums`; Daten `tabular-nums`.
  - Rail als `<aside aria-label={vorgaenge.rail.title}>`.

### 4.2 Screen: Umzug-Run-Timeline (RE-SKIN)

- **Route**: `/vorgaenge/umzug/run?vorgangId=…` (bestehend) + Detail `/vorgaenge/[id]`.
- **File**: `src/app/(app)/vorgaenge/umzug/run/page.tsx` (`<EXTEND>` — Token-Restyle) + `src/components/umzug/AutopilotTimeline.tsx` + `AutopilotStepRow.tsx` (`<EXTEND>`).
- **Re-skin scope**:
  - `AutopilotStepRow`: ersetze die Ad-hoc-Status-Farben (`text-sky-600`, `text-emerald-600`, `text-violet-500` Block-Akzente) durch foundation-Tokens (`--color-primary`, `--color-success`, `--color-warning`, `--color-danger`). Status-Icon im `IconCircle`-Look; Status-Text als `StatusBadge`. `BehoerdenBadge` farb-frei (HL-DS-10). eID-CTA-Button auf Foundation-`Button` primary.
  - `AutopilotTimeline`: die vertikale Block-A/B/C/D-Gruppierung bleibt (sie trägt die rechtliche Block-Semantik). Block-Akzent-Border auf neutrale Hairline + Block-Titel als `text-sm font-semibold` (kein violett/sky-Akzent-Strich). Auf der **Übersichts-Karte** (§ 4.1) wird die Kaskade als horizontaler Stepper gezeigt; in der **Run-Timeline** bleibt die vertikale Block-Liste (mehr Detail: Aktion, Aktenzeichen, eID-CTA). Beide lesen dieselben `Vorgang.schritte`.
  - `EidConfirmDialog`, `WizardProgress`, `VorgangHeader`: Token-Angleichung (Border-first, `--radius-lg`, Crossfade HL-DS-4). Keine Strukturänderung.
- **Event-Stream**: unverändert — `api.subscribe` liefert `autopilot_step`/`letter_received`/`vorgang_status_changed`; der Stepper/die Timeline aktualisiert sich live. Realistische Delays bleiben (Backend-Choreografie pro Block).
- **eID (Block D)**: unverändert — `bestaetigeAutopilotSchritt(vorgangId, schrittId)` via `EidConfirmDialog`. Bestätigungsschreiben landen im Posteingang.

- **i18n**: bestehende `umzug.run.*`/`umzug.preview.block_*`-Keys reuse; nur Token-/Klassen-Änderungen, keine neuen Strings außer ggf. den foundation-`common.status.*`-Reuse in den Status-Labels.

## 5. Autopilot logic

### Trigger

Der Umzug-Autopilot wird NICHT von dieser Seite ausgelöst (sondern vom Assistenten `starte_umzug`, siehe `redesign-assistent.md`, ODER vom bestehenden Wizard `/vorgaenge/umzug/start`). Diese Seite **visualisiert** die laufende Kaskade.

### Steps (orchestration)

Unverändert gegenüber `docs/specs/umzug.md` + bestehendem `runAutopilotInBackground`:
1. Block A (automatisch, §§ 33/34/36 BMG) — Bürgeramt neu/alt, Bundesdruckerei, Finanzamt, Beitragsservice.
2. Block B (Einwilligung, Art. 6 Abs. 1 lit. a DSGVO) — Krankenkasse, Bank, Arbeitgeber, … (nur freigegebene).
3. Block C (Eigen-Erledigung) — Kita, Hausarzt, Vereine (Checkliste, kein Tool-Effekt).
4. Block D (eID-Bestätigung) — KFZ, Familienkasse, ABH (persona-abhängig; eID-Tap-Dialog).

### Visual narrative

- Übersichts-Karte: horizontaler Stepper, Knoten färben sich grün, sobald ein Schritt `confirmed` ist; der aktive Knoten pulst (reduced-motion → statisch). „4 von 6 erledigt".
- Run-Timeline: vertikale Block-Liste mit Aktion + Aktenzeichen + Status pro Behörde; eID-Schritte zeigen den Fingerprint-CTA.
- Pro Schritt entsteht ein synthetisches `Bestätigungsschreiben` im Posteingang (bestehend).

## 6. Data model additions / changes

**Keine neuen Domain-Typen.** `Vorgang`, `AutopilotStep`, `BlockTyp`, `VorgangStatus` (`src/types/vorgang.ts`) genügen.

### Mock-backend additions (für mock-backend-coder)

**Optional (Komfort, NICHT zwingend):**
- `api.getVorgaengeUebersicht(personaId?): Promise<VorgangUebersicht[]>` **NEW (optional)** — ein vorberechnetes View-Model je Vorgang mit `{ vorgang_id, titel, typ, status, schritte_gesamt, schritte_erledigt, naechste_frist?, wartet_auf_buerger: boolean, unterlagen_fehlen: boolean, stepper_nodes: Array<{behoerde_id, status, datum?}> }`. Spart dem Frontend die Ableitung aus `Vorgang.schritte` + `getBehoerden`. **Wenn weggelassen**, leitet das Frontend alles aus `getVorgaenge()` + `getBehoerden()` ab (beide bestehend) — das ist der Default. mock-backend-coder entscheidet; kein Blocker.
- Falls die sekundären Karten (Aufenthaltstitel, Kindergeld) Seed-Vorgänge brauchen, die noch nicht existieren: **Seed-Erweiterung** in `src/data/vorgaenge.json` (mock-backend-coder) — Aufenthaltstitel-Vorgang existiert bereits (`vorgang-anna-aufenthaltstitel-2027-stub`); ein Kindergeld-Vorgang mit `unterlagen_fehlen`-Marker (z. B. via `context.unterlagen_fehlen: true`) wäre NEW. „Unterlagen fehlen" kann über `Vorgang.context.unterlagen_fehlen?: boolean` oder einen `self_assigned`-Schritt abgebildet werden — **kein neues Top-Level-Feld nötig** (`context` ist `Record<string, unknown>`).

### Persistence keys (localStorage)

Keine neuen. (Filter-Tab-State darf in der URL liegen, analog Posteingang; kein localStorage zwingend.)

## 7. AI assistant integration

Keine. Die „Was ist gerade wichtig?"-Rail-Priorisierung ist **deterministisch** (Frist/Status-Sortierung client-seitig), nicht AI. Der einzige AI-Pfad zu dieser Seite ist der Assistent-Trigger `starte_umzug`, der hierher (Run-Timeline) führt — spezifiziert in `redesign-assistent.md`, nicht hier.

## 8. i18n

Übersicht: alle `vorgaenge.*`-Keys aus § 4.1 neu (DE Source). Run-Timeline: bestehende `umzug.*`-Keys reuse. `track: spine` → 6 Sprachen. Status-Labels aus `common.status.*` reuse.

## 9. Edge cases

- **Keine Vorgänge** → `EmptyState` mit „Umzug starten"-CTA.
- **Vorgang ohne Schritte** → Stepper zeigt 0/0; Karte rendert nur Status-Badge + CTA.
- **Schritt `failed`** → Danger-Knoten + Status-Text; Retry-Pfad (bestehend, falls im Backend vorgesehen).
- **Alle Schritte confirmed aber Status ≠ abgeschlossen** → Backend setzt `abgeschlossen` (bestehende `isVorgangFullyResolved`-Logik); Stepper voll grün.
- **„Warten auf Sie"-Filter** → zeigt Vorgänge mit Block-D-eID-pending ODER `unterlagen_fehlen`.
- **Kindergeld „Unterlagen fehlen"** → Warning-Badge + CTA „Unterlagen hochladen" (Ziel-Route: Dokumente/Vorgang-Detail; Upload-Flow selbst ist out of scope — Demo zeigt nur den Marker + CTA).
- **< md Viewport** → horizontaler Stepper fällt auf vertikale Block-Liste zurück (Run-Timeline-Darstellung).
- **RTL (AR)** → Stepper-Knoten von rechts nach links; Verbindungslinien + Chevrons spiegeln; Behörde-Labels bleiben mit LTR-Aktenzeichen-Spans.

## 10. Out of scope (explicit)

- **Umzug-Wizard-Re-Skin** (`/vorgaenge/umzug/{start,preview}`) — diese Spec re-skinnt nur Übersicht + Run-Timeline. Der Wizard kann in einem späteren Slot angeglichen werden (Token-only); seine Funktion bleibt. (Falls Zeit: Token-Angleichung der Wizard-Steps ist trivial und willkommen, aber nicht Pflicht dieser Spec.)
- **Andere Vorgangs-Typen mit eigenem Autopilot** (Kindergeburt, Aufenthalt-Verlängerung) — nur als sekundäre Übersichts-Karten (Status + CTA), kein eigener Autopilot.
- **Unterlagen-Upload-Flow** für die „Unterlagen fehlen"-Karte — nur Marker + CTA.
- **AI-Priorisierung der Rail** — deterministisch, kein AI.
- **Neue Top-Level-Felder an `Vorgang`** — `context` genügt für `unterlagen_fehlen`.

## 11. Review checklist (for code-reviewer)

- [ ] Bestehende Umzug-e2e/-unit (Run, eID, Event-Stream, Bestätigungsschreiben) bleiben grün.
- [ ] Übersicht: `FilterTabs` mit korrekten Counts + Status-Mapping; großer Stepper + 2 sekundäre Karten + Rail.
- [ ] `<HorizontalStepper>`: Knoten-Status als Text (nicht nur Farbe), aktiver Knoten `aria-current="step"`, Puls reduced-motion-safe (HL-DS-4).
- [ ] Foundation-Primitives genutzt (`PageHeader`, `FilterTabs`, `SectionCard`, `RightRailCard`, `StatusBadge`, `IconCircle`, `EmptyState`, `FristCountdown`).
- [ ] `BehoerdenBadge` farb-frei (HL-DS-10); Block-Akzent-Farbstriche der alten Timeline entfernt.
- [ ] „x von y erledigt" + Daten + Aktenzeichen `tabular-nums` (HL-DS-6).
- [ ] Run-Timeline re-skinned auf foundation-Tokens; Block-A/B/C/D-Semantik + eID-CTA unverändert.
- [ ] Keine zwingenden neuen mock-backend-Methoden (optionaler `getVorgaengeUebersicht` klar als optional markiert).
- [ ] Keine hardcoded Strings; `vorgaenge.*`-Keys in `de.json` + 6 Locales; `umzug.*` reused.
- [ ] Lighthouse a11y > 95; axe 0 kritisch; AR-RTL-Audit (Stepper spiegelt).

## Build log — frontend-coder
- date: 2026-05-27
- screens implemented: (1) Vorgänge-Übersicht (NEW Liste mit Filter-Tabs + großer Prozess-Karte mit horizontalem Stepper + sekundären Karten + „Was ist gerade wichtig?"-Rail); (2) Umzug-Run-Timeline RE-SKIN auf foundation-Tokens.
- components created (`src/components/vorgaenge/`):
  - `HorizontalStepper.tsx` (`<NEW>`, client) — das Kern-Wow-Element: `<ol aria-label>` horizontale Knoten-Reihe, je Schritt ein Knoten (done=grün+`Check`, active=`bg-accent-soft`+Primary-Ring+framer-motion-Puls, pending=outline+Nummer, failed=Danger+`AlertCircle`). Verbindungslinien färben success bis zum letzten `done`-Knoten. Status als sr-only-Text (nicht nur Farbe); aktiver Knoten `aria-current="step"`; Puls hinter `useReducedMotion()` (HL-DS-4 — statischer Ring bei reduced-motion). Behörde-Label + `tabular-nums`-Datum unter jedem Knoten.
  - `vorgang-uebersicht.ts` (`<NEW>`) — `buildVorgangUebersicht(vorgang, behoerdenById)` leitet das View-Model client-seitig aus `Vorgang.schritte` + `getBehoerden()` ab (Default-Pfad; kein `getVorgaengeUebersicht` nötig — der optionale Backend-Helper wurde NICHT gebaut, da der Frontend-Ableitungspfad genügt und mock-backend out of scope ist). `unterlagen_fehlen` aus `context.unterlagen_fehlen` ODER `self_assigned`-Schritt (kein neues Top-Level-Feld). `matchesFilter()` mappt Alle/Laufend/Warten/Abgeschlossen → `VorgangStatus` + wartet_auf_buerger.
  - `ProcessCard.tsx` (`<NEW>`) — große Karte (`SectionCard`-basiert): `IconCircle` + Titel (`text-lg`) + Status-`StatusBadge` + Fortschritts-Zeile „x von y erledigt" (`tabular-nums`) + `<HorizontalStepper>` + CTA-Link (`buttonVariants` outline; „Kaskade ansehen" für Umzug). `<article aria-labelledby>`.
  - `ProcessCardSmall.tsx` (`<NEW>`) — sekundäre Karte: Titel + Status-Badge + `FristCountdown` ODER „Unterlagen fehlen"-Warning-`StatusBadge`+`AlertTriangle`-`IconCircle` + CTA („Unterlagen hochladen"/„Weiter bearbeiten").
  - `WasIstWichtigRail.tsx` (`<NEW>`, client) — `RightRailCard`; deterministische Priorisierung (offene Vorgänge / nächste Frist / warten auf Bestätigung) aus denselben Daten, KEIN AI; Footer-Link „Alle Vorgänge ansehen" (`#vorgaenge-liste`).
  - `VorgaengeView.tsx` (`<NEW>`, client) — Orchestrator: lädt `getVorgaenge()`+`getBehoerden()` on-mount (Mock-Backend lebt in localStorage), `PageHeader`+contextChip, `FilterTabs` mit Counts, Layout-Split `lg:grid-cols-[1fr_320px]`, Skeleton/`EmptyState` (+ „Umzug starten"-CTA bei leerem „Alle").
- components re-skinned (`src/components/umzug/`):
  - `AutopilotStepRow.tsx` (`<EXTEND>`) — Ad-hoc-Farben (`text-sky-600`/`text-emerald-600`/`text-destructive`) → foundation `IconCircle`-Tones + `StatusBadge` für Status-Text; `animate-spin motion-reduce:animate-none`; `tabular-nums` auf Aktenzeichen; Hairline `border-border`. eID-CTA/Retry-Button + `umzug.run.status.*`-Labels unverändert.
  - `AutopilotTimeline.tsx` (`<EXTEND>`) — Block-Akzent-Farbstriche (emerald/violet/sky/zinc `border-l-2`) → neutrale Hairline `border-l border-border`; Block-Titel `text-text-secondary` (kein uppercase-Akzent). Block-A/B/C/D-Semantik + Reihenfolge + `aria-live` unverändert.
- page replaced: `src/app/(app)/vorgaenge/page.tsx` — Stub (eine Umzug-Karte) → RSC-Shell, die `<VorgaengeView>` rendert.
- i18n keys added (DE source, top-level `vorgaenge.*` in `de.json`): title/subtitle, `filter.{alle,laufend,warten,abgeschlossen}`, `filter_aria`, `card.{progress,progress_label,cta_weiter,cta_kaskade,cta_unterlagen,cta_ansehen,unterlagen_fehlen,umzug_subtitle}`, `stepper.{aria,node_done,node_active,node_pending,node_failed}`, `rail.{title,offene_vorgaenge,offene_vorgaenge_count,frist_naht,frist_naht_days,warten_bestaetigung,warten_bestaetigung_count,cta_ansehen,alle_ansehen,empty}`, `empty.{title,body,cta_umzug}`, `typ.*`. `umzug.*` + `common.status.*` reused. de.json JSON.parse OK.
- mock-backend additions: KEINE (optionaler `getVorgaengeUebersicht` bewusst weggelassen — Frontend-Ableitung ist der Default; mock-backend/Seed out of scope). Hinweis: Kindergeld-„Unterlagen fehlen"-Karte ist im Code unterstützt (`context.unterlagen_fehlen`/`self_assigned`-Heuristik + ProcessCardSmall-Warning-Pfad), erscheint aber nur, wenn ein entsprechender Seed-Vorgang existiert — Seed-Erweiterung liegt bei mock-backend-coder (§ 6 der Spec).
- typecheck: pass (alle vorgaenge/umzug-Dateien clean; verbleibende tsc-Fehler nur in `tests/a11y/redesign-dashboard.spec.ts` — uncommitted, anderer Agent, nicht mein Scope).
- lint: pass (clean; einzige Warnung vorbestehend `stammdaten/api.ts:39`).
- unit suite: 639/639 grün (unverändert; keine Umzug-Unit gebrochen).
- a11y (Playwright `--project=a11y`): `tests/a11y/umzug.spec.ts` 18 passed + 1 skipped — umzug-start/preview/run/detail axe 0, reduced-motion-eID-Puls-Halt, lang/RTL, Skip-Link. Re-Skin regressiert die bestehende PASS nicht.
- smoke-test: `/vorgaenge` HTTP 200; „Vorgänge"/„Laufende und abgeschlossene"/„Warten auf Sie"/„Was ist gerade wichtig" im HTML; keine Compile-/Runtime-Fehler.
- prototype details not matched (+ why):
  1. Kindergeld-„Unterlagen fehlen"-Karte: nur sichtbar, wenn ein Kindergeld-Seed-Vorgang existiert. Der Seed liegt bei mock-backend-coder (Spec § 6 markiert ihn als NEW/optional); Frontend-Render-Pfad ist fertig und greift, sobald die Daten da sind. Aktuell zeigen die Anna-Seeds: Umzug (laufend, falls per Wizard angelegt) als große Stepper-Karte + Aufenthaltstitel-Stub als sekundäre Karte + abgeschlossener Anmeldungs-Vorgang.
  2. `getVorgaengeUebersicht`-Backend-Helper nicht gebaut (Spec § 6 „optional, NICHT zwingend"); Ableitung erfolgt client-seitig.
  3. Umzug-Wizard (`/vorgaenge/umzug/{start,preview}`) nur funktional unverändert; voller Token-Re-Skin war explizit out of scope (Spec § 10) — Run-Timeline + Step-Rows sind re-skinned.
- next: a11y-tester (Übersicht + Stepper Lighthouse/axe + AR-RTL-Stepper-Spiegelung), i18n-localizer (`vorgaenge.*` → 5 Non-DE-Locales), code-reviewer; mock-backend-coder für optionalen Kindergeld-Seed.

## Build log — i18n-localizer
- date: 2026-05-27
- locales updated: [en, ru, uk, ar, tr] (de.json NICHT berührt — Source bleibt; konkurrierender dokumente/termine-Build hängt parallel an de.json an)
- new keys: 39 leaf keys × 5 Locales = 195 strings. Top-level `vorgaenge.*`: title, subtitle, filter.{alle,laufend,warten,abgeschlossen}, filter_aria, card.{progress,progress_label,cta_weiter,cta_kaskade,cta_unterlagen,cta_ansehen,unterlagen_fehlen,umzug_subtitle}, stepper.{aria,node_done,node_active,node_pending,node_failed}, rail.{title,offene_vorgaenge,offene_vorgaenge_count,frist_naht,frist_naht_days,warten_bestaetigung,warten_bestaetigung_count,cta_ansehen,alle_ansehen,empty}, empty.{title,body,cta_umzug}, typ.{umzug,kindergeburt,aufenthaltstitel-verlaengerung,eheschliessung,gewerbeanmeldung,anmeldung,sonstige}.
- changed keys: 0
- review-needed flags resolved: 0 (FULL quality, kein needs_review pro spine-Track)
- ICU: alle Plural-Platzhalter erhalten + lokalisiert. RU/UK mit `=1/few/other`-Kategorien (slawische Plural-Logik), AR mit voller `zero/one/two/few/many/other`-Leiter, EN/TR mit `=1/other`. Platzhalter-Namen (`{erledigt}`,`{gesamt}`,`{titel}`,`{behoerde}`,`{count}`,`{tage}`) unverändert.
- length flags:
  - Filter-Tab-Labels (tight): „Warten auf Sie" → EN „Waiting on you" / RU „Ждут Вас" / UK „Чекають на Вас" / AR „بانتظارك" / TR „Sizi bekleyen" — alle innerhalb +40 % bzw. kürzer. „Abgeschlossen" → RU „Завершены" / UK „Завершені" leicht kürzer; AR „مكتملة" kürzer; OK.
  - Stepper-node-Labels sind sr-only (kein Layout-Risiko), trotzdem knapp gehalten.
  - `rail.title` „Was ist gerade wichtig?" → EN „What needs attention now?" (+ leicht länger aber Rail-Header, kein Button); RU/UK/AR/TR alle ≤ Quelle.
  - `card.cta_*` als Buttons: alle kompakt; TR „Belge yükle" / AR „رفع المستندات" kürzer als „Unterlagen hochladen".
  - Keine harten Overflow-Risiken erkannt; falls AR-Filter-Tab im Layout doch eng wird, frontend-coder informieren (FilterTabs ist scrollbar/wrap-fähig laut Spec § 4.1).
- Behörden-Terminus: in diesem Block tauchen keine konkreten Agenturnamen auf (Behörde-Labels kommen zur Laufzeit aus `getBehoerden()`). TR behält gängige DE-Lehnwörter mit Klammer: `typ.umzug` „Adres değişikliği (Umzug)", `typ.gewerbeanmeldung` „… (Gewerbeanmeldung)", `typ.anmeldung` „Kayıt (Anmeldung)".
- AR-RTL: alle Strings richtungs-neutral / RTL-sicher; keine eingebetteten Latin-IDs in diesem Block. Stepper-Spiegelung ist CSS/Layout-Sache (a11y-tester § 4.1 Edge-Case RTL).
- JSON: alle 5 bearbeiteten Dateien strukturell verifiziert (Grep-bestätigte Block-Grenzen + `vorgaenge`→`stammdaten`-Übergang intakt in allen 5). Maßgeblicher JSON.parse-Gate läuft im Main-Thread.

## Code review — code-reviewer (2026-05-27)
- verdict: APPROVE
- gates: tsc PASS; lint PASS (1 pre-existing OOS warning); vitest 639/639; i18n JSON.parse 6/6 + full parity; AI gate smoke 38/38.
- full verdict + per-file citations: docs/reviews/2026-05-27-redesign-spine-code.md
- status set to shipped. Non-blocking nits tracked in the review file (no REVISE items on this screen).

## Build log — mock-backend-coder (2026-05-27, Kindergeld-Seed pass)
- context: closes frontend build-log gap #1 — the „Kindergeld aktualisieren — Warten auf Sie — Unterlagen fehlen"-Karte had a finished render path but no seed Vorgang to light it up (spec § 6 marked this seed as NEW for mock-backend-coder).
- types added/changed: none (`context.unterlagen_fehlen` is the existing free-form `Vorgang.context` marker per spec § 6 / § 10 — no new top-level field).
- seed addition: `src/data/vorgaenge.json` +1 Vorgang `vorgang-anna-kindergeld-aktualisierung-2026` (Anna):
  - typ `familienkasse`, status `in_pruefung` (active → not in the „Abgeschlossen"-Filter, renders as a „Warten auf Sie" card).
  - real Behörde `familienkasse-berlin-brandenburg` (from `behoerden.json`).
  - one `self_assigned` Block-C step (`§ 68 Abs. 1 EStG`, Nachweis-Einreichung) — both `context.unterlagen_fehlen: true` AND the `self_assigned` step trip the frontend's `buildVorgangUebersicht` „Unterlagen fehlen" / `wartet_auf_buerger` predicate (`src/components/vorgaenge/vorgang-uebersicht.ts:67-69,91`), so the Warning-Badge + „Unterlagen hochladen"-CTA render.
  - realistic Aktenzeichen `[MOCK] 115FK668412` (matches Anna's existing Familienkasse-Kindergeldnummer in `letters.json`), realistic dates (angelegt 2026-05-12, Nachweis-Frist 2026-06-25), `[MOCK]` watermark in `context.note` + `mock: true`.
  - idempotent: seeded via the existing `readOrInit('vorgaenge', …)` path (full fixture written only on a fresh/empty bucket, filtered to Anna); no migration needed.
- side effects on the overview (all additive/beneficial): Anna now shows 2 secondary cards (Aufenthaltstitel-Stub + Kindergeld), the Kindergeld-Nachweis-Frist 2026-06-25 also feeds the dashboard `frist_tile` / `top_actions` / „Was-ist-wichtig"-Rail. No legal-line change to any autopilot.
- ban-list note: the Kindergeld Vorgang lives in `vorgaenge.json` (NOT scanned by `stammdaten-v1-3-ban-list-grep.test.ts`, which only checks locales / `letters.json` / `autopilot/*.ts`); its text avoids the banned phrases regardless.
- typecheck: pass. unit suite: 639/639 pass. vorgaenge.json: parses, 3 entries.
- known gaps: the optional `getVorgaengeUebersicht` convenience helper (spec § 6) remains intentionally NOT built — the frontend's client-side derivation from `getVorgaenge()` + `getBehoerden()` is the default path and is unaffected.
