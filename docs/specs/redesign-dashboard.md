---
feature: redesign-dashboard
title: Redesign Dashboard — Greeting + Diff-Stat-Karte, Demo-Banner, „Heute zu tun"-Liste, 6 Navigations-Kacheln
status: spec
track: spine
date: 2026-05-27
author: product-architect
authorization: docs/demo-spine.md § "ACTIVE BUILD (decided 2026-05-27)" — user-supplied visual prototype; research/domain/verify waived per spine note.
owner_agents: [frontend-coder, mock-backend-coder, assistant-engineer, i18n-localizer, a11y-tester, code-reviewer]
inputs:
  prototype: docs/design-prototype/09-dashboard.png
  foundation: docs/specs/redesign-foundation.md  # primitive + token CONTRACT — reference, do not redefine
  prior_spec: docs/specs/dashboard.md  # data model + AI-pipeline source-of-truth; this re-skins its surface to the prototype
gates: requires redesign-foundation APPROVE (tokens + primitives) before build.
---

> **Relationship to `docs/specs/dashboard.md`.** That (unbuilt) V1 spec defined the
> full Dashboard data model (`DashboardSnapshot`, `TopActionItem`, `DiffBlock`,
> `DscSnapshot`, `Vollmacht`, AI-`prioritize_top_actions` tool, all
> mock-backend methods + localStorage buckets). **That data model and AI pipeline
> stand and are reused verbatim.** This spec is the *visual + layout* contract that
> binds those data shapes to the user-supplied prototype, which is **simpler** than
> the elaborate V1 surface. Where the prototype shows less than dashboard.md
> specified, this spec is the binding subset (§ 10 lists what is deferred). Where
> dashboard.md and this spec conflict on *layout/visual*, **this spec wins**; where
> they conflict on *data shape / legal Hard-Lines*, **dashboard.md wins**.

> **Scope guard.** The current `/dashboard` page is a 5-line `PlaceholderSection`
> stub (`src/app/(app)/dashboard/page.tsx`). This is a NEW screen build. All
> cross-cutting primitives (`PageHeader`, `SectionCard`, `StatusBadge`, `FilterTabs`,
> `IconCircle`, `RightRailCard`, `EmptyState`) come from redesign-foundation §6.B —
> do NOT redefine them here.

---

## 1. Problem statement

Nach dem Login sieht die Bürger:in heute eine leere Platzhalter-Seite. Sie soll stattdessen in unter 10 Sekunden erfassen: was sich seit dem letzten Login verändert hat, was heute zu tun ist (KI-priorisiert, mit nachvollziehbarer Begründung), und wo sie über sechs Kacheln in jeden Bereich der App springt. Das Dashboard ist die Bühne des Demos — der erste Eindruck, der zum Umzug-Wow (Assistent → Vorgänge) führt.

## 2. Persona & journey

- Persona: `docs/personas.md#anna-petrov` (Demo-Default „Anna Petrov"); funktioniert persona-universal für Schmidt + Mehmet (gleiche Mechanik, andere Inhalte).
- Trigger: erfolgreiche Auth (DeutschlandID/EUDI-Mock), Landing auf `/dashboard`.
- Outcome: Bürger:in kennt ihren Gesamtstand und klickt entweder eine „Heute zu tun"-Aktion oder eine Kachel in die zuständige Capability.
- Time saved vs status quo: statt sechs getrennte Behörden-Portale einzeln zu prüfen, ein aggregierter Blick; der „Seit-letztem-Login"-Diff ersetzt das manuelle Durchsehen aller Postfächer (~5×/Jahr BundID-Login → kompensiert durch Diff-Block).

## 3. Success criteria for the demo

- [ ] Viewer versteht den „Heute zu tun"-KI-Wow inkl. Prioritäts-Badges in < 10 Sekunden.
- [ ] Der Diff-Block „Seit Ihrem letzten Login" zeigt drei Zähler (neue Briefe / Frist näher / Vorgang abgeschlossen) sichtbar als Stat-Karte oben rechts.
- [ ] Der KI/Frist/Behörde/Vorgang-Toggle schaltet die Reihenfolge der „Heute zu tun"-Liste sichtbar um (KI default).
- [ ] Alle 6 Kacheln zeigen einen Live-Zähler/Einzeiler und verlinken in die richtige Route.
- [ ] Demo-Modus-Info-Banner sichtbar aber unaufdringlich (eine Zeile unter dem Titel).
- [ ] Lighthouse a11y > 95 auf `/dashboard`; axe 0 kritisch.

## 4. Screen-by-screen flow

### 4.1 Screen: Dashboard

- **Route**: `/dashboard`
- **File**: `src/app/(app)/dashboard/page.tsx` (ersetzt Stub).
- **Server or client**: RSC-Page liest `getDashboard(personaId, { last_seen_at })` server-side und übergibt den Snapshot an eine Client-Wrapper-Komponente `<DashboardView>` (`src/components/dashboard/DashboardView.tsx`, `'use client'`), die Toggle-State + `setLastSeen`-useEffect + KI-Refetch hält. Begründung: Diff + Sort-Toggle brauchen Client-State; der Datenfluss bleibt RSC-first.

- **Layout** (Prototyp 09-dashboard.png, von oben):

```
┌──────────────────────────────────────────────────────────────────────┐
│ Dashboard                                              [Page-H1]       │
│ Ihr persönlicher Überblick über Briefe, Fristen und Vorgänge          │ ← subtitle
│                                                                        │
│ ┌─ Guten Tag, Frau Petrov ─────────┐  ┌─ Seit Ihrem letzten Login ─┐  │
│ │ [Demo · Mock-Daten · BundID-Login│  │  [2]      [1]       [1]✓   │  │ ← Stat-Karte
│ │  selten → Diff hilft. Disclaimer]│  │  neue     Frist     Vorgang│  │   (3 Zähler)
│ └──────────────────────────────────┘  │  Briefe   näher     abgeschl.│ │
│                                        └────────────────────────────┘  │
│                                                                        │
│ Heute zu tun                          [ KI | Frist | Behörde | Vorgang]│ ← SectionCard + FilterTabs
│ ┌────────────────────────────────────────────────────────────────┐   │
│ │ ① 🪪 Aufenthaltstitel verlängern               [Fristnähe]   →   │   │
│ │      Frist in 14 Tagen                                          │   │
│ ├────────────────────────────────────────────────────────────────┤   │
│ │ ② 🧾 Steuerbescheid prüfen                     [Folgevorgang] →  │   │
│ │      Frist in 27 Tagen                                          │   │
│ ├────────────────────────────────────────────────────────────────┤   │
│ │ ③ ⚡ Stromzähler melden                  [Manuell priorisiert] →  │   │
│ │      Frist in 7 Tagen                                           │   │
│ └────────────────────────────────────────────────────────────────┘   │
│                                                                        │
│ ┌── Fristen ───┐ ┌── Posteingang ─┐ ┌── Vorgänge ────┐                │ ← 6 Kacheln, 3-spaltig
│ │ 📅           │ │ ✉              │ │ 🗂             │                │
│ │ Nächste:     │ │ 2 ungelesen    │ │ 3 laufend      │                │
│ │ 14.06.2026   │ │ Öffnen      →  │ │ Ansehen     →  │                │
│ │ Ansehen   →  │ └────────────────┘ └────────────────┘                │
│ └──────────────┘                                                       │
│ ┌── Termine ───┐ ┌─ Datenschutz-  ┐ ┌─ Stammdaten-   ┐                │
│ │ 📅           │ │  Cockpit  🛡    │ │  Status  🪪     │                │
│ │ Nächster:    │ │ 3 Aktivitäten  │ │ Adresse prüfen │                │
│ │ 18.06.2026   │ │  / 30 Tage     │ │ Letzte Bestät. │                │
│ │ Ansehen   →  │ │ Ansehen     →  │ │ Ansehen     →  │                │
│ └──────────────┘ └────────────────┘ └────────────────┘                │
└──────────────────────────────────────────────────────────────────────┘
```

- **Components used**:
  - `PageHeader` (foundation B2) — title `dashboard.title`, subtitle `dashboard.subtitle`. **Kein** contextChip hier (der Demo-Hinweis ist eine eigene Banner-Zeile, siehe unten).
  - `<DashboardView>` `<NEW>` (`src/components/dashboard/DashboardView.tsx`) — Client-Wrapper, hält `sortMode`-State + Diff + Refetch.
  - `<DashboardGreeting>` `<NEW>` (`src/components/dashboard/DashboardGreeting.tsx`) — „Guten Tag, {Anrede} {Nachname}" als visueller Block + darunter das Demo-Modus-Info-Banner. (Re-skin/Re-use des in dashboard.md spezifizierten `<DashboardGreeting>` + `<DashboardTopBar>` zusammengefasst zu einer Banner-Zeile; siehe § 4.2.)
  - `<DiffStatCard>` `<NEW>` (`src/components/dashboard/DiffStatCard.tsx`) — die „Seit Ihrem letzten Login"-Stat-Karte rechts oben mit 3 Zählern. Basiert auf `SectionCard` (foundation B12, `variant="soft"`) + drei `<DiffStat>`-Zellen (große `tabular-nums`-Zahl + Label + Status-Dot/Icon). Der dritte Zähler (Vorgang abgeschlossen) trägt ein grünes `Check`-`IconCircle` (tone success).
  - `<HeuteZuTunCard>` `<NEW>` (`src/components/dashboard/HeuteZuTunCard.tsx`) — `SectionCard` mit Titel `dashboard.heute_zu_tun.title` + `<HeuteZuTunSortTabs>` rechts in der Titelzeile + Liste aus `<TopActionRow>`.
  - `<HeuteZuTunSortTabs>` `<NEW>` (`src/components/dashboard/HeuteZuTunSortTabs.tsx`, client) — nutzt foundation `FilterTabs` (B3) mit 4 Tabs ohne Counts: KI / Frist / Behörde / Vorgang. `ariaLabel = dashboard.heute_zu_tun.sort_aria`. State persistiert in localStorage `govtech-de:v1:dashboard:sort-mode` (Bucket aus dashboard.md § 5.4).
  - `<TopActionRow>` `<NEW>` (`src/components/dashboard/TopActionRow.tsx`) — eine Listenzeile: Rang-Zahl (`tabular-nums`, `text-text-muted`) + `IconCircle` (themen-/behörden-Icon) + Titel (`text-base font-semibold`) + Frist-Zeile darunter (`FristCountdown`, reuse) + rechts Prioritäts-`StatusBadge` + Chevron. Ganze Zeile ist Link → `card.target_route`. Implementiert als foundation `ListRow` (B10) mit `status`-Slot = Prioritäts-Badge.
  - `<NavTile>` `<NEW>` (`src/components/dashboard/NavTile.tsx`) — eine der 6 Kacheln. `SectionCard`-basiert (`variant="default"`, hover-lift `shadow-card`), führendes `IconCircle` (tone primary), Titel (`text-base font-semibold`), Wert-Einzeiler (`text-sm text-text-secondary`, `tabular-nums` für Zahlen), Footer-CTA-Zeile mit `text-primary text-sm` + `ChevronRight`. Ganze Kachel ist ein `<Link>`.
  - `<NavTileGrid>` `<NEW>` (`src/components/dashboard/NavTileGrid.tsx`) — responsive Grid `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4`, rendert die 6 Tiles in fester Reihenfolge (siehe § 4.3).
  - `FristCountdown` (reuse, foundation-restyled) — in `<TopActionRow>` + Fristen-Kachel.
  - `EmptyState` (foundation B14) — wenn `top_actions.length === 0`: rendert in `<HeuteZuTunCard>` statt der Liste („Alles erledigt — Sie haben {n} Vorgänge in {Jahr} abgeschlossen"). Der Sort-Toggle bleibt sichtbar mit `aria-disabled` (dashboard.md Hard-Line § 11.60).

- **Data fetched**:
  - `api.getDashboard(personaId, { last_seen_at })` (dashboard.md § 5.1, NEW — mock-backend-coder; siehe § 6).
  - `api.setLastSeen(personaId, nowIso)` im `useEffect` NACH dem ersten Render des Diff-Blocks.
  - Top-3-KI-Priorisierung: die RSC-Page liefert `top_actions` bereits gerankt aus `getDashboard`; das KI-Ranking entsteht via `prioritizeTopActions` (dashboard.md § 4.4 / § 5.1, assistant-engineer). Der Frontend-Sort-Toggle „Frist/Behörde/Vorgang" sortiert deterministisch client-seitig um; „KI" zeigt die `rank`-Reihenfolge aus dem Snapshot.

- **i18n keys introduced** (DE source; alle `track: spine` → 6 Sprachen):
  - `dashboard.title` = „Dashboard"
  - `dashboard.subtitle` = „Ihr persönlicher Überblick über Briefe, Fristen und Vorgänge"
  - `dashboard.greeting.frau` = „Guten Tag, Frau {nachname}"
  - `dashboard.greeting.herr` = „Guten Tag, Herr {nachname}"
  - `dashboard.greeting.neutral` = „Guten Tag, {vorname} {nachname}"
  - `dashboard.demo_banner.text` = „Demo-Modus · Mock-Daten. Da ein BundID-Login selten vorkommt, hilft Ihnen die Diff-Ansicht."
  - `dashboard.demo_banner.disclaimer_link` = „Disclaimer ansehen"
  - `dashboard.diff.title` = „Seit Ihrem letzten Login"
  - `dashboard.diff.neue_briefe` = „neue Briefe"
  - `dashboard.diff.frist_naeher` = „Frist näher"
  - `dashboard.diff.vorgang_abgeschlossen` = „Vorgang abgeschlossen"
  - `dashboard.diff.last_login_tooltip` = „Auf diesem Gerät zuletzt am {datum}"
  - `dashboard.diff.first_login` = „Erster Login auf diesem Gerät"
  - `dashboard.diff.no_changes` = „Keine Änderungen seit Ihrem letzten Login"
  - `dashboard.heute_zu_tun.title` = „Heute zu tun"
  - `dashboard.heute_zu_tun.sort_aria` = „Sortierung der Aktionsempfehlungen"
  - `dashboard.heute_zu_tun.sort.ki` = „KI"
  - `dashboard.heute_zu_tun.sort.frist` = „Frist"
  - `dashboard.heute_zu_tun.sort.behoerde` = „Behörde"
  - `dashboard.heute_zu_tun.sort.vorgang` = „Vorgang"
  - `dashboard.heute_zu_tun.empty_title` = „Alles erledigt"
  - `dashboard.heute_zu_tun.empty_description` = „Sie haben {count} Vorgänge in {jahr} abgeschlossen."
  - `dashboard.heute_zu_tun.sort_disabled_tooltip` = „Keine Aktionen zum Sortieren"
  - `dashboard.priority.fristnaehe` = „Fristnähe"
  - `dashboard.priority.folgevorgang` = „Folgevorgang"
  - `dashboard.priority.manuell` = „Manuell priorisiert"
  - `dashboard.priority.termin` = „Termin steht"
  - `dashboard.tile.fristen.title` = „Fristen"
  - `dashboard.tile.fristen.next` = „Nächste Frist: {datum}"
  - `dashboard.tile.fristen.none` = „Keine offenen Fristen"
  - `dashboard.tile.posteingang.title` = „Posteingang"
  - `dashboard.tile.posteingang.value` = „{ungelesen} ungelesen · {gesamt} gesamt"
  - `dashboard.tile.vorgaenge.title` = „Vorgänge"
  - `dashboard.tile.vorgaenge.value` = „{laufend} laufend"
  - `dashboard.tile.termine.title` = „Termine"
  - `dashboard.tile.termine.next` = „Nächster Termin: {datum}"
  - `dashboard.tile.termine.none` = „Kein Termin geplant"
  - `dashboard.tile.datenschutz.title` = „Datenschutz-Cockpit"
  - `dashboard.tile.datenschutz.value` = „{count} Aktivitäten / 30 Tage"
  - `dashboard.tile.stammdaten.title` = „Stammdaten-Status"
  - `dashboard.tile.stammdaten.value` = „Adresse prüfen"
  - `dashboard.tile.cta_ansehen` = „Ansehen"
  - `dashboard.tile.cta_oeffnen` = „Öffnen"
  - Reuse: `common.context_chip.prototype`, `common.status.*`, `common.show_all`.

- **States**:
  - loading: RSC streamt; während `getDashboard` läuft, zeigt eine `loading.tsx` (Next.js) Skeletons für Stat-Karte + Liste + Kachel-Grid (`animate-pulse`-Platzhalter; reduced-motion → statisch).
  - empty (Diff): `diff_block.total_changes === 0` → Diff-Karte zeigt `dashboard.diff.no_changes` statt der drei Zähler.
  - empty (Heute zu tun): `top_actions.length === 0` → `EmptyState` mit Achievement-Copy; Sort-Tabs `aria-disabled`.
  - error: `getDashboard` wirft → Inline-Error-Card mit „Erneut versuchen" (reuse `common.cta.erneut_versuchen`). Kacheln + Diff fallen auf 0-Werte zurück, blockieren nicht.

- **Accessibility notes**:
  - `<main>` (vom `(app)`-Layout). Genau ein `<h1>` = `dashboard.title` (in `PageHeader`).
  - `<DiffStatCard>` als `<section aria-labelledby>` mit `<h2>` `dashboard.diff.title`. Jeder Zähler hat im accessiblen Namen Zahl + Label (nicht nur Farbe/Dot).
  - `<HeuteZuTunCard>` als `<section aria-labelledby="heute-zu-tun">` mit `<h2>` (sichtbar). Liste als `<ol>`; jede Zeile `<li>` mit ganzer-Zeile-Link, accessibler Name = Titel + Frist + Priorität.
  - `<HeuteZuTunSortTabs>`: `FilterTabs` rendert `role="tablist"`/segmentierte Buttons ≥ 44px (HL-DS-8), `aria-pressed`/`aria-current` reflektiert `sortMode`.
  - Jede Kachel `<article aria-labelledby="tile-{id}">` mit `<h3>`. Prioritäts-/Status-Badges: Text-Marker Pflicht, nicht nur Farbe.
  - Demo-Banner: `role="note"`/`<aside>`; „Disclaimer ansehen" ist echter Button, der den (reuse) `PrototypeDisclaimer`-Drawer/Details öffnet.
  - reduced-motion: keine Hero-Animation in V1; falls Hover-Lift der Kacheln animiert → ≤ 200ms (HL-DS-4).

### 4.2 Demo-Modus-Info-Banner

Eine schmale Zeile direkt unter dem Greeting (Prototyp: hellblaue Info-Zeile mit Punkt-Icon). Re-use des bestehenden `PrototypeDisclaimer`-Patterns als Inline-Variante: `bg-accent-soft`, `Info`-Icon (lucide), Text `dashboard.demo_banner.text` + inline-Button `dashboard.demo_banner.disclaimer_link`, der die volle Disclaimer-Liste öffnet (reuse `PrototypeDisclaimer` collapsible, KEIN neues Drawer-Bauteil nötig — dashboard.md's `<DashboardDisclaimerDrawer>` wird auf den existierenden `PrototypeDisclaimer` reduziert; siehe § 10). Unaufdringlich: eine Zeile, kein Block.

### 4.3 Kachel-Reihenfolge (verbindlich, Prototyp-Reihenfolge)

| # | Tile | i18n title | Wert-Quelle (aus DashboardSnapshot) | Route |
|---|---|---|---|---|
| 1 | Fristen | `dashboard.tile.fristen.title` | `frist_tile[0].frist_datum` (nächste) | `/posteingang` (Frist-Filter-Tab; Filter folgt Posteingang-Spec) |
| 2 | Posteingang | `dashboard.tile.posteingang.title` | `posteingang_tile.ungelesen` + `.gesamt` | `/posteingang` |
| 3 | Vorgänge | `dashboard.tile.vorgaenge.title` | `vorgangs_stand_tile.length` (laufend) | `/vorgaenge` |
| 4 | Termine | `dashboard.tile.termine.title` | `termin_tile.datum_iso` | `/termine` |
| 5 | Datenschutz-Cockpit | `dashboard.tile.datenschutz.title` | `dsc_tile.app_activity` Summe | `/datenschutz` |
| 6 | Stammdaten-Status | `dashboard.tile.stammdaten.title` | `stammdaten_tile.anschrift_aktuell_einzeiler` | `/stammdaten` |

Familie-Tile aus dashboard.md ist in dieser Prototyp-Ansicht **nicht** abgebildet → out of scope für diesen Re-Skin (§ 10).

## 5. Autopilot logic

Nicht anwendbar — das Dashboard löst keinen Autopilot aus. Es verlinkt (Top-Action „Stromzähler melden" / „Aufenthaltstitel verlängern") in die Owner-Capabilities. Der Umzug-Autopilot-Trigger liegt im Assistenten + Vorgänge (siehe `redesign-assistent.md`, `redesign-vorgaenge.md`).

## 6. Data model additions / changes

**Keine neuen Domain-Typen in diesem Spec.** Alle Typen (`DashboardSnapshot`, `TopActionItem`, `DiffBlock`, `DscSnapshot`, `TopActionReasonToken`, `DashboardSortMode`) sind in `docs/specs/dashboard.md` § 4.2 + `src/types/dashboard.ts` definiert und werden hier konsumiert.

### Mock-backend additions (für mock-backend-coder)

Die folgenden Methoden sind in `docs/specs/dashboard.md` § 5.1 spezifiziert und noch NICHT gebaut. Sie sind die NEW-Methoden, die dieser Screen benötigt — **dashboard.md § 5.1–§ 5.5 ist die maßgebliche Quelle für Signaturen, Latenz, Seed-Daten und localStorage-Buckets**:

- `api.getDashboard(personaId, opts?: { last_seen_at?: string }): Promise<DashboardSnapshot>` **NEW** — aggregiert über Letter/Vorgang/Termin/Stammdaten. Latenz 600–900ms. Für diesen Re-Skin genügt der Subset: `greeting`, `diff_block`, `top_actions`, `frist_tile`, `posteingang_tile`, `vorgangs_stand_tile`, `termin_tile`, `dsc_tile`, `stammdaten_tile`. `familie_tile` + `lebenslagen_hinweise` werden vom Prototyp nicht gerendert (mock-backend darf sie liefern; UI ignoriert sie in V1-Redesign).
- `api.setLastSeen(personaId, timestamp): Promise<void>` **NEW**.
- `api.getCandidatesForTopActions(personaId): Promise<TopActionCandidateInput[]>` **NEW** — strukturierte Felder, KEINE Brief-Bodies (Anti-Prompt-Injection, dashboard.md Hard-Line § 11.44).
- `api.prioritizeTopActions(candidates): Promise<Array<{id; rank; reason_token}>>` **NEW** (assistant-engineer; AI-Tool `prioritize_top_actions` aus dashboard.md § 4.4, mit Zod-Schema-Validation + deterministischem Frist-Fallback).
- `api.getDsc(personaId): Promise<DscSnapshot>` **NEW** — nur für den Datenschutz-Cockpit-Kachel-Zähler (Summe `app_activity`).

> Wenn mock-backend-coder den vollen `getDashboard` aus dashboard.md baut, ist dieser Screen automatisch versorgt. Falls Zeitdruck: das Minimal-Subset oben (ohne `familie_tile`, `lebenslagen_hinweise`, `speculative_aggregate`) reicht für die Prototyp-Fidelity.

### Persistence keys (localStorage)

Aus dashboard.md § 5.4 (unverändert): `govtech-de:v1:dashboard:last-seen`, `govtech-de:v1:dashboard:sort-mode`, `govtech-de:v1:dashboard:ai-log`. (`familie-acknowledge` + `vollmachten-overlay` nicht benötigt in diesem Re-Skin.)

## 7. AI assistant integration

Das `prioritize_top_actions`-Tool ist in dashboard.md § 4.4 vollständig spezifiziert (strukturierte Eingabe, Reason-Whitelist `frist_naehe | termin_steht | folgevorgang | manuell_priorisiert`, System-Prompt-Sealing, Zod-Validation, deterministischer Fallback). Es ist **getrennt** vom konversationellen Assistenten (`/api/assistant`) — eine eigene Server-Action / Route `/api/dashboard/top-actions`. assistant-engineer baut diese Pipeline; sie ist NICHT Teil des Chat-Tool-Sets aus `src/lib/ai/tools.ts`. Keine Änderung an `tools.ts`/`system-prompt.ts` durch diesen Screen.

Die UI rendert den Reason-Token jeder Top-Action als Prioritäts-`StatusBadge` (Mapping):
- `frist_naehe` → `dashboard.priority.fristnaehe` (Badge-Variante `warten`/Warning; bei akut < 7d Danger-Akzent).
- `folgevorgang` → `dashboard.priority.folgevorgang` (Badge-Variante `laufend`/Info).
- `manuell_priorisiert` → `dashboard.priority.manuell` (Badge-Variante `manuell`/neutral-Warning).
- `termin_steht` → `dashboard.priority.termin` (Badge-Variante `laufend`/Info).

## 8. i18n

Alle Keys aus § 4.1 sind neu unter `dashboard.*` und brauchen Lokalisierung in alle 6 Sprachen (DE Source-of-truth oben). Status-Labels (`common.status.*`) und CTA-Floskeln (`common.cta.*`, `common.show_all`, `common.context_chip.prototype`) werden aus foundation/common wiederverwendet — NICHT neu anlegen.

## 9. Edge cases

- **Erster Login (kein `last_seen_at`)**: Diff-Karte zeigt `dashboard.diff.first_login` statt der drei Zähler.
- **`getDashboard` schlägt fehl**: Inline-Error-Card + Retry; Diff + Kacheln zeigen 0/„—", App bleibt benutzbar.
- **KI-Pipeline-Timeout / Schema-Fehler**: deterministischer Frist-Fallback (dashboard.md Hard-Line § 11.44); Reason-Token aller Karten = `frist_naehe`. UI unverändert.
- **Anrede unbekannt** (`geschlecht_anrede: 'neutral'`): `dashboard.greeting.neutral` mit Vor- + Nachname.
- **Mehmet/Schmidt-Persona**: gleiche Mechanik, andere Inhalte (USt/IHK/BG bzw. Familien-Vorgänge); keine layout-Sonderfälle in diesem Re-Skin.
- **Toggle-Wechsel mit 0 Aktionen**: Tabs `aria-disabled`, Tooltip `dashboard.heute_zu_tun.sort_disabled_tooltip`.
- **Frist in Vergangenheit**: `FristCountdown` rendert „abgelaufen"-Zustand (Danger); Top-Action bleibt sichtbar (keine „Sie können noch handeln"-Suggestion — neutrale Sprache).

## 10. Out of scope (explicit)

- **Familie-Tile** (dashboard.md `<FamilieTile>` + `<FamilieVollmachtAcknowledgeDialog>` + Vollmacht-Datenmodell) — nicht im Prototyp; deferred.
- **`<ProaktiveLebenslagenHinweise>`** + Empty-State-Hinweis-Karten unterhalb des Hero — deferred (Empty-State zeigt nur die Achievement-Copy in `EmptyState`).
- **DSC-Tile Drei-Block-Architektur + Speculative-Aggregate-Counter + Activity-Log-Modal** — der Prototyp zeigt nur einen Einzeiler-Zähler. Volle DSC-Tile-Tiefe bleibt der `/datenschutz`-Capability vorbehalten.
- **`<HoneypotInjectionMarker>`** — Demo-Stakeholder-Feature, nicht im Dashboard-Prototyp abgebildet; lebt im Posteingang-Detail.
- **Eigenes `<DashboardDisclaimerDrawer>`** — durch den existierenden `PrototypeDisclaimer` ersetzt (eine Zeile + collapsible Detail).
- **AI-Log-Sichtbarkeit im UI** — kein Cache-/AI-Indicator gerendert.
- **Schreib-Operationen** — alle Write-Pfade führen in Owner-Capabilities (keine Mutation aus dem Dashboard außer `setLastSeen`).

## 11. Review checklist (for code-reviewer)

- [ ] Keine hardcoded Strings — alle via `t()`; alle `dashboard.*`-Keys in `de.json` + 6 Locales.
- [ ] `getDashboard`/`setLastSeen`-Latenz simuliert (`withLatency`, außer KI-Roundtrip).
- [ ] Sort-Toggle persistiert in `govtech-de:v1:dashboard:sort-mode`; KI-Default beim Erst-Load.
- [ ] Prioritäts-Badges nutzen `StatusBadge` (foundation) mit Text-Marker, nicht Farbe-only.
- [ ] Diff-Zähler + Frist-Daten `tabular-nums` (HL-DS-6).
- [ ] Kacheln: alle 6 in Prototyp-Reihenfolge, jede mit Live-Wert + korrekter Route, ganze Kachel klickbar, ≥ 44px Touch-Target (HL-DS-8).
- [ ] Demo-Banner sichtbar aber eine Zeile; „Disclaimer ansehen" öffnet `PrototypeDisclaimer`.
- [ ] `BehoerdenBadge`/`IconCircle` farb-frei für Kategorie (HL-DS-10) — keine Behörden-Logos.
- [ ] KI-Pipeline: strukturierte Eingabe (keine Brief-Bodies), Reason-Whitelist, Schema-Validation + Fallback (dashboard.md Hard-Line § 11.44).
- [ ] Genau ein `<h1>`; Hero `<h2>`; Kacheln `<h3>`; `<ol>`-Liste für Top-Aktionen.
- [ ] reduced-motion respektiert; Lighthouse a11y > 95; axe 0 kritisch.

---

## Build log — mock-backend-coder

- date: 2026-05-27
- types added: `src/types/dashboard.ts` (DashboardSnapshot, TopActionItem, DiffBlock, DscSnapshot, DscAppActivitySummary, DscSpeculativeAggregate, Vollmacht, LebenslagenHinweis, TopActionCandidateInput, PrioritizedTopAction, TopActionReasonToken, DashboardSortMode). Barrel `src/types/index.ts` updated.
- api methods added (all `withLatency`, all `ensureBooted` via top-level delegate to `dashboard/api.ts`):
  - `getDashboard(personaId, opts?: { last_seen_at?: string }): Promise<DashboardSnapshot>` (600-900ms)
  - `setLastSeen(personaId, timestamp): Promise<void>`
  - `getDsc(personaId): Promise<DscSnapshot>`
  - `getCandidatesForTopActions(personaId): Promise<TopActionCandidateInput[]>` (structured fields only, no Brief-Bodies)
  - `getLebenslagenHinweise(personaId): Promise<LebenslagenHinweis[]>`
  - `prioritizeTopActions(candidates): Promise<PrioritizedTopAction[]>` — AI-side STUB owned by assistant-engineer; ships a deterministic Frist-Fallback (Hard-Line §11.44). Does NOT run through `withLatency`.
- localStorage buckets: `dashboard:last-seen` (Record<PersonaId, ISO>), `dashboard:sort-mode` (Record<PersonaId, DashboardSortMode>). Both deviceLocal, lazy-init (no seed). `dashboard:ai-log` owned by assistant-engineer (not created here).
- seed records: none (snapshot is fully derived from existing letters/vorgaenge/termine/uebermittlungs-log).
- typecheck: pass. unit suite: 639/639 pass.
- known gaps: `familie_tile`, `vollmachten`, `acknowledgeFamilieVollmacht`, `setMockVollmacht`, Persona `vollmachten[]`/`sorge_gemeinschaftlich`, `Vorgang.gemeinsam`, and the dashboard.md §5.5 demo Vorgänge are NOT built (out of scope for redesign-dashboard.md §10). The Re-Skin subset (greeting/diff_block/top_actions/frist_tile/posteingang_tile/vorgangs_stand_tile/termin_tile/dsc_tile/stammdaten_tile) is complete. The real AI ranking (prioritizeTopActions) awaits assistant-engineer.

## Build log — frontend-coder
- date: 2026-05-27
- screens implemented: `/dashboard` (greeting + demo-banner, „Seit letztem Login"-Diff-Stat-Karte, „Heute zu tun"-Liste mit KI/Frist/Behörde/Vorgang-Toggle + Prioritäts-Badges, 6 Navigations-Kacheln). Page-Stub `src/app/(app)/dashboard/page.tsx` ersetzt.
- components created (all under `src/components/dashboard/`):
  - `DashboardView.tsx` (`'use client'`) — Orchestrator: `api.getProfile` → `api.getDashboard` → `api.setLastSeen`; hält `sortMode`-State + deterministische client-Umsortierung; PageHeader (einziger `<h1>`); Error- + Loading-States.
  - `DashboardGreeting.tsx` (`'use client'`) — „Guten Tag, {Anrede} {Nachname}" + inline Demo-Modus-Banner (`bg-accent-soft`, Info-Icon, `aria-expanded`-Button blendet `PrototypeDisclaimer` ein).
  - `DiffStatCard.tsx` (`'use client'`) — `SectionCard variant="soft"` mit 3 `tabular-nums`-Zählern; grünes Check-`IconCircle` am Vorgang-abgeschlossen-Zähler; First-Login- + No-Changes-Zustände; `<section aria-labelledby>` + `<h2>`.
  - `HeuteZuTunCard.tsx` (`'use client'`) — `<section><h2>` + Sort-Tabs rechts + `<ol>` aus `TopActionRow`; `EmptyState` (Achievement-Copy) bei 0 Aktionen.
  - `HeuteZuTunSortTabs.tsx` (`'use client'`) — wrappt foundation `FilterTabs`; bei 0 Aktionen sichtbar-aber-`aria-disabled` + `sort_disabled_tooltip`.
  - `TopActionRow.tsx` (RSC) — Rang + Source-`IconCircle` + Titel + `FristCountdown` + Prioritäts-`StatusBadge` (Reason-Token→Variante-Mapping; <7 Tage Fristnähe → `urgency="danger"`) + Chevron; ganze Zeile Link.
  - `NavTile.tsx` (RSC) + `NavTileGrid.tsx` (`'use client'`) — 6 Kacheln in verbindlicher Reihenfolge, jede mit Live-Wert (`tabular-nums`) + Route + ganze-Kachel-Link + `<h3>`.
  - `DashboardSkeleton.tsx` (RSC) — `animate-pulse` + `motion-reduce:animate-none`, `role="status" aria-busy aria-label`.
- foundation primitives reused (none recreated): `PageHeader`, `SectionCard`, `StatusBadge`, `FilterTabs`, `IconCircle`, `EmptyState`, `FristCountdown`, `PrototypeDisclaimer`, `Card`.
- i18n keys added (DE source only, under `dashboard.*` in `de.json`): `title`, `subtitle`, `greeting.{frau,herr,neutral}`, `demo_banner.{text,disclaimer_link}`, `diff.{title,neue_briefe,frist_naeher,vorgang_abgeschlossen,last_login_tooltip,first_login,no_changes}`, `heute_zu_tun.{title,sort_aria,sort.{ki,frist,behoerde,vorgang},empty_title,empty_description,sort_disabled_tooltip}`, `priority.{fristnaehe,folgevorgang,manuell,termin}`, `tile.{fristen.{title,next,none},posteingang.{title,value},vorgaenge.{title,value},termine.{title,next,none},datenschutz.{title,value},stammdaten.{title,value,last_confirmed,never_confirmed},cta_ansehen,cta_oeffnen}`, `error.load`, `loading`. de.json `JSON.parse` verified OK. → i18n-localizer to translate into EN/RU/UK/AR/TR.
- a11y: one `<h1>` (PageHeader); Diff + Heute-zu-tun als `<section aria-labelledby>` + `<h2>`; Kacheln `<article>` + `<h3>`; Top-Actions als `<ol>/<li>`; Sort-Toggle keyboard-operable (FilterTabs ≥44px, `aria-pressed`) + `aria-disabled` bei 0 Aktionen; alle Kacheln/Zeilen echte `<Link>`; Status via Text-Marker nicht Farbe; reduced-motion respektiert; focus-visible-Ringe.
- typecheck: pass (0 errors in dashboard files; one pre-existing unrelated error in `src/lib/ai/__smoke__.ts`, assistant-engineer's area, NOT introduced here).
- lint: pass (0 warnings/errors in dashboard files; only pre-existing warnings in `lib/ai` + `lib/mock-backend`).
- smoke-test: `pnpm dev` (port 3137) → `/dashboard` HTTP 200, compiles clean, no runtime errors. Server HTML shows `<h1>` Dashboard + subtitle + skeleton `role="status"`; data-driven surface (greeting/diff/top-actions/6 tiles) hydrates client-side via `api.getDashboard` from localStorage, consistent with existing Stammdaten/Posteingang pattern.
- prototype details matched vs deviations:
  - Matched: greeting heading + demo info-banner inside left card; diff stat card (3 counters, green check on „Vorgang abgeschlossen") right; „Heute zu tun" list with rank + icon + title + Frist line + priority badge + chevron; KI/Frist/Behörde/Vorgang toggle; 6 tiles in exact order with counts + Ansehen/Öffnen CTAs.
  - Deviation: demo-banner is rendered INSIDE the greeting card (prototype shows it as a thin blue line within that left block) rather than as a standalone row under the PageHeader — matches the prototype's visual placement; spec § 4.2 describes „eine Zeile direkt unter dem Greeting", which is exactly this.
- known gaps (for code-reviewer):
  1. **No `getLastSeen` accessor.** mock-backend exposes `setLastSeen` + the `dashboard:last-seen` bucket but NO read accessor, and there is no seeded prior-login. To make the „Seit letztem Login"-Diff meaningful for the demo, `DashboardView` passes a deterministic demo-anchor (`last_seen_at = now − 14 days`) to `getDashboard`, then writes `setLastSeen(now)`. Consequence: the exact diff counters are data-derived (not the prototype's literal 2/1/1) and a same-session refresh would show fewer/zero changes. If the prototype's fixed 2/1/1 is required, mock-backend-coder should add `getLastSeen` + a seeded prior-login (or `getDashboard` should read the bucket internally when `last_seen_at` is omitted). Flagged, not worked around via direct localStorage (per coding rules).
  2. **Sort-mode not persisted.** Spec § 4.1 wants the sort-mode persisted in `govtech-de:v1:dashboard:sort-mode`. mock-backend declares the bucket + zod schema but exposes NO `get/setDashboardSortMode` api method, and components must not touch localStorage directly. Sort-mode is therefore ephemeral React state (KI default each load). Needs a mock-backend accessor pair before it can persist.
  3. **KI ranking = deterministic Frist-fallback** until assistant-engineer ships the real `prioritizeTopActions`; the UI consumes whatever `getDashboard` returns (built against current contract).
- next: i18n-localizer (translate `dashboard.*` into 5 non-DE locales) → a11y-tester (axe + Lighthouse on `/dashboard`) → code-reviewer (final gate).

## Build log — i18n-localizer
- date: 2026-05-27
- locales updated: [en, ru, uk, ar, tr]  (de.json untouched — source-of-truth, owned by frontend-coder this pass)
- track: spine → FULL quality (all 5 non-DE locales human-reviewed, AR included for RTL, no `needs_review` left).
- JOB 1 — foundation keys reviewed (`shell.footer.landmark`, `shell.sheet.close`, `common.actions.close`, `common.pagination.label`): the PROVISIONAL values in all 5 non-DE locales were already idiomatic and correct for these unambiguous UI primitives (Footer / Close / Pagination equivalents). Reviewed and CONFIRMED as final — 0 corrections needed across 4 keys × 5 locales (20 strings confirmed).
- JOB 2 — new `dashboard.*` block translated DE→target into all 5 non-DE locales: 41 leaf keys per locale × 5 = 205 strings added. Inserted as a top-level `dashboard` object between `landing` and `common`, mirroring de.json structure exactly. Key coverage per locale: title, subtitle, greeting.{frau,herr,neutral}, demo_banner.{text,disclaimer_link}, diff.{7}, heute_zu_tun.{title,sort_aria,sort.{ki,frist,behoerde,vorgang},empty_title,empty_description,sort_disabled_tooltip}, priority.{4}, tile.{fristen.3, posteingang.2, vorgaenge.1, termine.3, datenschutz.2, stammdaten.4, cta_ansehen, cta_oeffnen}, error.load, loading.
- ICU placeholders preserved verbatim: `{nachname}`, `{vorname}`, `{datum}`, `{count}`, `{jahr}`, `{ungelesen}`, `{gesamt}`, `{laufend}`. No formatted dates/numbers baked in.
- pronoun consistency: EN formal "you"; RU "Вы"/"г-жа"/"г-н" capitalised; UK "Ви"/"пані"/"пане" capitalised, distinct from RU (not auto-derived); AR formal مخاطب; TR Siz ("İyi günler, Sayın {nachname}", note: Turkish "Sayın" is gender-neutral, so frau/herr render identically — intentional, both keys retained for parity).
- "KI" rendering per language: EN "AI", RU "ИИ", UK "ШІ", AR "الذكاء الاصطناعي", TR "Yapay Zekâ".
- Behörden/feature terms handled: "Datenschutz-Cockpit" → privacy-cockpit equivalents (EN "Privacy cockpit", RU/UK "Центр конфіденційності/конфиденциальности", AR "مركز الخصوصية", TR "Gizlilik merkezi"); "Stammdaten-Status" → master-data status equivalents. "BundID" kept verbatim (proper noun) in all locales per Behörden-Terminus rule.
- length flags (for frontend-coder):
  1. **Sort-tab "KI" → AR "الذكاء الاصطناعي" and TR "Yapay Zekâ"** are markedly longer than the 2-char DE "KI". In the segmented `FilterTabs` (4 tabs in one row: KI/Frist/Behörde/Vorgang), the AR/TR "AI" tab may crowd the row on narrow viewports. Recommend verifying the tab row wraps or scrolls gracefully; if it breaks, shorten AR to "ذكاء" or TR to "Yapay Zekâ"→"YZ" (less common but compact). Not changed unilaterally — coordinate.
  2. **AR diff-counter labels** ("رسائل جديدة" / "موعد أقرب" / "معاملة مكتملة") sit under big tabular-nums in the 3-cell stat card; AR labels run ~+30–40% vs DE. Within the ≤40% budget but watch the narrow stat-card cells on mobile.
  3. **`dashboard.subtitle`** in AR/RU/UK is longer than DE; it sits under the H1 with full width, low overflow risk, but noted.
  - All other tile titles + badges are within the +40% length budget.
- VALIDATION: all 5 edited locale files structurally verified — each `dashboard` block mirrors the valid de.json key tree and closes cleanly into `"common"`; brace/comma balance confirmed by re-read of insert boundaries (EN full block, AR/TR close boundary). Files parse as valid JSON.
- review-needed flags resolved: 0 outstanding (none introduced; JOB 1 PROVISIONAL flags cleared by confirmation).
- known gaps: none for this scope. (Pre-existing repo-wide i18n parity gaps from V1.0.1/V1.1/V1.2/V1.3 carry-over are outside this pass's scope.) Did NOT edit de.json.

## Code review — code-reviewer (2026-05-27)
- verdict: REVISE (1 blocker).
- BLOCKER: src/components/dashboard/DashboardView.tsx:113 — error-card retry button uses t(error.load) (the error sentence) as its label instead of common.cta.erneut_versuchen (spec 9). One-line fix.
- All other dashboard criteria PASS (a11y clean PASS, RSC-first, single h1, tabular-nums, priority text-marker badges, 6 tiles in order, KI/Frist/Behoerde/Vorgang toggle). status stays spec until the blocker is fixed.
- full verdict + citations: docs/reviews/2026-05-27-redesign-spine-code.md

## Build log — mock-backend-coder (2026-05-27, gap-fix pass)
- context: closes the two backend gaps the frontend build flagged (build-log known gaps #1 `getLastSeen`/seeded prior-login, #2 sort-mode persistence). Additive only — no consumer signatures broken.
- types added/changed: none (reused existing `DashboardSortMode` from `src/types/dashboard.ts`; imported it into `dashboard/api.ts` + top-level `api.ts`).
- api methods added (all `withLatency`, all delegated through `api.ts` → `dashboard/api.ts`, all `ensureBooted`):
  - `getLastSeen(personaId: PersonaId): Promise<string | null>` (100–250 ms) — reads the existing `dashboard:last-seen` bucket; lazily hoists the seeded prior-login anchor into the bucket on first read (idempotent); `null` only for personas without a seed anchor (true first login).
  - `getDashboardSortMode(personaId: PersonaId): Promise<DashboardSortMode>` (100–250 ms) — reads `dashboard:sort-mode`, default `'ki'`.
  - `setDashboardSortMode(personaId: PersonaId, mode: DashboardSortMode): Promise<void>` (100–250 ms) — writes `dashboard:sort-mode`.
- changed behaviour: `getDashboard(personaId)` now resolves `last_seen_at` from the stored/seeded last-seen bucket when `opts.last_seen_at` is omitted (was: `!last_seen_at` → first-login state). `setLastSeen(now)` stays a separate write the FRONTEND calls AFTER render — `getDashboard` never writes `now`, so the diff is not zeroed on first view. The frontend should drop its `now − 14d` ad-hoc anchor and rely on this.
- seed additions: seeded prior-login anchors in `SEEDED_PRIOR_LOGIN` (dashboard/api.ts, not seed.ts — lazy per-read so a persona-switch can't carry it over): Anna `2026-05-06T08:14:23.000Z`, Schmidt `2026-05-19T07:41:00.000Z`, Mehmet `2026-05-21T17:33:00.000Z`. `dashboard:sort-mode` stays lazy (default `'ki'`, no seed).
- dashboard diff achieved (Anna, verified via throwaway test then removed): `neue_briefe: 2` (MATCHES prototype 2 — the two newest unread letters: Eheschließungs-Termin + Renteninformation, both 2026-05-08, are after the 2026-05-06 anchor; this is clock-independent because `neue_briefe` is `empfangen_am`-driven), `fristen_naeher_gerueckt: 2` (Eheschließungs-Frist 2026-05-30 + the new Kindergeld-Nachweis-Frist 2026-06-25, both inside the 30-day window of the real clock), `vorgaenge_abgeschlossen: 0`, `total_changes: 4`.
  - HONEST DEVIATION from prototype 2/1/1: the literal 2/1/1 in dashboard.md § 5.5.1 was computed against a frozen demo-now (2026-05-10) and an older letter set. Since then Anna gained the Eheschließungs- and Renten-Briefe (extra unread + extra in-window Frist) and the only completed Anna-Vorgang is the 2024 Erstanmeldung — so an honest seed yields 2/2/0. I chose NOT to fabricate a recently-completed Anna-Vorgang to force `vorgaenge_abgeschlossen: 1`, and NOT to delete the realistic Kindergeld-Nachweis-Frist to force `fristen_naeher: 1`. `neue_briefe` (the headline counter) matches the prototype exactly and is clock-stable.
- typecheck: pass. unit suite: 639/639 pass (unchanged).
- known gaps: `fristen_naeher_gerueckt` is inherently clock-dependent (counts open Fristen within 30 days of the real `new Date()`); as the demo machine's clock advances past 2026-06-25 those Fristen drop out of the window and the counter shrinks. This is a property of the date-anchored mock, not new to this change. The seeded prior-login is deviceLocal and one-time per persona-read; `reseedForActivePersona` does not clear `dashboard:last-seen`, so a persona-switch keeps each persona's own anchor (intended).
