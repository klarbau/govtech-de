---
feature: autopilot-run-hero
title: Autopilot-Run "Hero" — die Live-Umzug-Kaskade (Spine-Schritte 5–6 sichtbar)
status: spec
track: spine
date: 2026-05-27
author: product-architect
owner_agents: [frontend-coder, i18n-localizer, a11y-tester, code-reviewer]
authorization: research/domain/verify WAIVED — user-supplied prototype; docs/demo-spine.md "ACTIVE BUILD (decided 2026-05-27)". This is a pure FRONTEND redesign of an already-shipped, verified backend flow (Umzug-Autopilot, shipped 2026-05-08). No upstream research/domain/verify is required because no new concept, behaviour, legal claim, or data is introduced — only the presentation layer of the existing live-run changes.
inputs:
  foundation: docs/specs/redesign-foundation.md  # §6 tokens + shared primitives + HL-DS hard-lines
  prototype: docs/design-prototype (image #5 — Autopilot-Run; described verbatim in §4)
  current_run_page: src/app/(app)/vorgaenge/umzug/run/page.tsx
  current_components: src/components/umzug/{AutopilotTimeline,AutopilotStepRow,EidConfirmDialog}.tsx
  backend_generator: src/lib/mock-backend/autopilot/umzug.ts  # REUSED UNCHANGED
  step_type: src/types/vorgang.ts  # AutopilotStep — exact field names
not_required_agents:
  mock-backend-coder: NOT required — the mock-backend data flow (api.getVorgang / api.subscribe / api.getBehoerden / api.bestaetigeAutopilotSchritt / api.cancelUmzug), the AutopilotStep type, the seed data, and the latency choreography are COMPLETE and REUSED UNCHANGED. This spec specs ZERO backend/type/seed change.
  assistant-engineer: NOT required — this surface has no AI/tool/SSE involvement. The assistant→autopilot handoff (spine step 3) is a separate spec.
---

> **Scope guard.** This is a **pure frontend redesign** of the EXISTING live-run experience at
> `src/app/(app)/vorgaenge/umzug/run/page.tsx` + the `src/components/umzug/**` components.
> The mock-backend, types, seed data, and latency choreography are COMPLETE and must be REUSED
> UNCHANGED. **mock-backend-coder AND assistant-engineer are NOT required for this spec.**
> The only files this spec authorizes editing: the run page + components under
> `src/components/umzug/**` + `de.json` (new `autopilotRun.*` namespace). Foundation primitives
> (`IconCircle`, `StatusBadge`, `SectionCard`, `RightRailCard`, `Card`, `Button`, `EmptyState`)
> are REUSED, never forked.

---

## 1. Problem statement

Nachdem Anna ihren Umzug bestätigt hat, ist der Moment, in dem das System *für sie* arbeitet, der emotionale Kern der gesamten Demo (Spine-Schritte 5–6). Die heutige Live-Run-Seite zeigt diese Kaskade als nüchterne, vertikal block-gruppierte Liste — funktional, aber ohne das „die Behörden werden gerade benachrichtigt"-Gefühl. Diese Spec gestaltet genau diesen Bildschirm neu: eine horizontal verbundene Kaskade, in der jede zuständige Behörde sichtbar nacheinander „aufleuchtet", während die echten Backend-Events über die Zeit eintreffen — bis am Ende „Alle Behörden informiert" steht.

## 2. Persona & journey

- **Persona**: Anna Petrov (`docs/personas.md#anna`) — Demo-Default. Daten-getrieben: der Bildschirm rendert exakt die Schritte, die der Autopilot-Generator für die aktive Persona erzeugt (Anna: Block A 4 Behörden + Block B AOK Nordost; Block D nur, wenn die Persona kfz_halter/kindergeld_bezug/aufenthaltstitel trägt).
- **Trigger**: Die Person hat in der Vorschau „Autopilot starten" bestätigt; die App navigiert nach `/vorgaenge/umzug/run?vorgangId=…`, der Generator läuft bereits, Events strömen ein.
- **Outcome**: Die Person sieht zu, wie jede zuständige Stelle die Adressänderung „empfängt", bestätigt eID-pflichtige Schritte mit einem Tipp, und steht am Ende vor einem klaren „Alle Behörden informiert"-Erfolgszustand mit Übersicht und Live-Protokoll.
- **Time saved vs status quo**: 1 Bestätigung → bis zu 5+ zuständige Stellen automatisch benachrichtigt; statt ~5–7 separater Meldungen/Anträge (~3 h Behördengänge) ein einziger, beobachtbarer Vorgang von ~30 s. (Diese Kennzahl ist bereits im bestehenden Umzug-Flow etabliert; hier wird sie nur sichtbarer gemacht.)

## 3. Success criteria for the demo

- [ ] Der Betrachter versteht den Autopilot-Wow innerhalb von **< 8 Sekunden** (die erste Behörde leuchtet binnen ~900 ms auf, der aktive Knoten pulst sichtbar).
- [ ] Alle für die Persona erzeugten **beteiligten Behörden** erscheinen sichtbar als Knoten und wechseln über die Zeit von „Ausstehend" → „In Bearbeitung" → „Abgeschlossen".
- [ ] Der Hero-Status-Banner kippt am Ende sichtbar von „Kaskade wird ausgeführt" auf „Alle Behörden informiert" (grüner Erfolgszustand).
- [ ] Die `[MOCK]`/Prototyp-Disclaimer-Zeile ist sichtbar, aber unaufdringlich (bestehende `PrototypeDisclaimer` bleibt).
- [ ] Lighthouse a11y > 95 auf der Run-Route; axe 0 kritische Verstöße.
- [ ] Status wird IMMER in Text + Badge vermittelt, nie über Farbe allein.
- [ ] Unter `prefers-reduced-motion`: kein Puls, keine Connector-Animation, keine gestaffelte Einblendung — der jeweils aktuelle Zustand wird sofort gerendert. Das zeitliche „Aufleuchten" über echte Backend-Events bleibt (das ist keine zu unterdrückende Animation).

## 4. Screen-by-screen flow

### 4.1 Screen: Autopilot-Run (Hero)

- **Route**: `/vorgaenge/umzug/run?vorgangId=<id>`
- **File**: `src/app/(app)/vorgaenge/umzug/run/page.tsx` (EDIT — Layout/Markup neu; Load+Subscribe+eID-Maschinerie unverändert übernehmen)
- **Server or client**: Client (`'use client'`) — bleibt, weil `useSearchParams`, `useState`, `api.subscribe`-Effekt nötig. Bleibt in `<Suspense>` gewrappt wie heute.
- **Beibehaltene Maschinerie (NICHT umbauen — nur das Markup darum herum ändert sich)**:
  - `vorgangId = useSearchParams().get('vorgangId')`; bei `null` → `router.replace('/vorgaenge/umzug/start')` (bestehender Redirect, Null-Guard bleibt).
  - Initial-Load `api.getVorgang(vorgangId)` → `vorgang`-State.
  - `api.subscribe`-Effekt rekonstruiert `vorgang.schritte` aus `autopilot_step`-Events (idx-Merge), trackt `lettersById` aus `letter_received`, und setzt `vorgang.status` aus `vorgang_status_changed`.
  - `behoerdenById` via `api.getBehoerden` (der bestehende `BehoerdenLoader`-Helfer bleibt; `behoerde_id → {name_de, kategorie}`).
  - eID: `eidStepId`-State → `EidConfirmDialog` (REUSE unverändert) → `api.bestaetigeAutopilotSchritt(vorgangId, eidStepId)`.
  - Cancel: `cancelOpen`-State → bestehender Bestätigungs-`Dialog` → `api.cancelUmzug(vorgangId)`.
- **Layout** (Wireframes in §4.2 running / §4.3 completed / §4.4 mobile).
- **Components used**:
  - `PageHeader` von `src/components/shared/PageHeader.tsx` — H1 + Subtitle + `contextChip` (Prototyp-Hinweis). REUSE.
  - `AutopilotHeroBanner` `<NEW>` von `src/components/umzug/AutopilotHeroBanner.tsx` — Hero-Status-Banner (running ↔ completed).
  - `AutopilotCascade` `<NEW>` von `src/components/umzug/AutopilotCascade.tsx` — die horizontale verbundene Knoten-Reihe.
  - `AutopilotCascadeNode` `<NEW>` von `src/components/umzug/AutopilotCascadeNode.tsx` — eine Knoten-Card + Connector-Marker.
  - `UmzugUebersichtCard` `<NEW>` von `src/components/umzug/UmzugUebersichtCard.tsx` — linke „Ihr Umzug – Übersicht"-Card.
  - `AutopilotLiveFeed` `<NEW>` von `src/components/umzug/AutopilotLiveFeed.tsx` — rechte „Live-Aktivitäten"-Card.
  - `IconCircle`, `StatusBadge` von `src/components/shared/**` — REUSE in allen NEW-Komponenten.
  - `SectionCard` (linke Übersicht) + `RightRailCard` (rechtes Live-Feed) von `src/components/shared/**` — REUSE als Card-Container.
  - `Card`, `CardContent`, `Button`, `Dialog*` von `src/components/ui/**` — REUSE (Loading-Skeleton, Error, Cancel-Dialog, Footer-Buttons).
  - `EidConfirmDialog` von `src/components/umzug/EidConfirmDialog.tsx` — REUSE UNCHANGED.
  - `PrototypeDisclaimer` von `src/components/shared/PrototypeDisclaimer.tsx` — REUSE.
- **AutopilotTimeline reuse decision** (siehe §5.4): die bestehende `AutopilotTimeline`/`AutopilotStepRow` werden **NICHT auf der Run-Seite verwendet** (durch `AutopilotCascade` ersetzt) und bleiben unverändert für andere Konsumenten (z. B. Vorgang-Detail). Begründung in §5.4.
- **Data fetched**: keine neuen Calls. `api.getVorgang(vorgangId)`, `api.getBehoerden()`, `api.subscribe(...)`, `api.bestaetigeAutopilotSchritt(...)`, `api.cancelUmzug(...)` — alle bereits im File, unverändert.
- **i18n keys introduced**: neue Top-Level-Namespace `autopilotRun.*` (vollständige Tabelle in §8). Reuse: `umzug.run.eid_dialog.*`, `umzug.run.cancel_dialog.*`, `umzug.run.cta_to_vorgang`, `umzug.run.cta_cancel`, `umzug.run.aktenzeichen_label`, `umzug.run.status.*`, `umzug.run.vorgang_label`, sowie `common.status.*`, `common.cta.*` (siehe §8 „Reuse").
- **States**: loading (Skeleton) / error / running (Kaskade läuft, ≥ 1 Knoten in_progress|pending_eid_confirmation) / awaiting-eID (Block-D-Knoten erfordert Bestätigung) / completed (alle Knoten confirmed/failed-final, kein in_progress) / partial-failure (≥ 1 Knoten failed). Es gibt KEINEN echten „empty"-Zustand mit Daten — ohne `vorgangId` greift der Redirect.
- **Accessibility notes**: §6 (zusammengefasst): genau ein `<h1>` (PageHeader); `aria-live="polite"` auf Kaskade + Live-Feed; Status in Text+Badge; tabular-nums auf Zeitstempel/Aktenzeichen; eID-CTA/Cancel/Knoten-Fokus tastaturbedienbar; Fokus-Ring sichtbar; Touch-Targets ≥ 44px.

### 4.2 Wireframe — RUNNING state (≥ md)

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  Umzug auf Autopilot                                   [Prototyp · Mock-Daten] │  ← PageHeader (h1 + chip)
│  Sie bestätigen einmal – das System koordiniert die nächsten Schritte.         │
├──────────────────────────────────────────────────────────────────────────────┤
│ ┌────────────────────────────────────────────────────────────────────────┐   │
│ │ (✦)  Kaskade wird ausgeführt                          ● In Bearbeitung  │   │  ← AutopilotHeroBanner (running)
│ │      Ihre Angaben werden sicher an die zuständigen Behörden übermittelt. │   │
│ └────────────────────────────────────────────────────────────────────────┘   │
│                                                                                │
│   ✓━━━━━━━━━●━━━━━━━━━○─ ─ ─ ─ ○─ ─ ─ ─ ○         (connector + marker row)    │
│  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐                        │
│  │ (🏛)    │ │ (🧾)    │ │ (📡)    │ │ (🪪)    │ │ (🩺)    │   ← AutopilotCascade  │
│  │Bürgeramt│ │Finanzamt│ │Beitrags-│ │Bundes-  │ │AOK      │     (node cards)    │
│  │Adresse  │ │Zuständig│ │service  │ │druckerei│ │Nordost  │                    │
│  │übermit. │ │keit best│ │Adresse  │ │Aufkleber│ │Übermit- │                    │
│  │         │ │ätigt    │ │aktual.  │ │wird ers.│ │tlung gp.│                    │
│  │10:24 Uhr│ │10:24 Uhr│ │— —      │ │— —      │ │— —      │  ← timestamp        │
│  │✓Abgeschl│ │●In Bearb│ │○Ausste. │ │○Ausste. │ │○Ausste. │  ← StatusBadge      │
│  └────────┘ └════════┘ └────────┘ └────────┘ └────────┘                        │
│             ↑ active node = blue border + pulsing ring marker                  │
│                                                                                │
│ ┌─────────────────────────────────┐  ┌──────────────────────────────────────┐ │
│ │ (🏠) Ihr Umzug – Übersicht       │  │ (📋) Live-Aktivitäten                 │ │  ← 2-col grid
│ │ Neue Adresse                     │  │ ● Finanzamt — Zuständigkeit … 10:24  │ │     (SectionCard |
│ │   Müllerstr. 12, 13353 Berlin    │  │ ✓ Bürgeramt — Adresse über.  10:24   │ │      RightRailCard)
│ │ Einzugsdatum  01.06.2026         │  │ ✦ Autopilot gestartet        10:24   │ │
│ │ ── Autopilot-Bereich · [5 Behörd]│  │   Ihre Angaben wurden geprüft …      │ │
│ │   ✓ Bürgeramt  ✓ Finanzamt …     │  │                                      │ │
│ │ ┌─ accent-soft ───────────────┐  │  │                                      │ │
│ │ │ (🛡) Ihre Daten sind geschützt│ │  │                                      │ │
│ │ │ Übermittlung verschlüsselt … ›│ │  │                                      │ │
│ │ └──────────────────────────────┘ │  │                                      │ │
│ └─────────────────────────────────┘  └──────────────────────────────────────┘ │
│                                                                                │
│  [Abbrechen]                                                   [Zum Vorgang]   │  ← footer actions (bestehend)
│  Hinweis zum Prototyp …                                                        │  ← PrototypeDisclaimer
└──────────────────────────────────────────────────────────────────────────────┘
```

### 4.3 Wireframe — COMPLETED state (≥ md)

Identisches Layout; nur der Hero-Banner und alle Knoten flippen:

```
│ ┌────────────────────────────────────────────────────────────────────────┐   │
│ │ (✓)  Alle Behörden informiert                           ✓ Abgeschlossen │   │  ← AutopilotHeroBanner (completed)
│ │      Alle 5 zuständigen Stellen haben Ihre Adressänderung erhalten.      │   │     IconCircle tone=success
│ └────────────────────────────────────────────────────────────────────────┘   │
│                                                                                │
│   ✓━━━━━━━━━✓━━━━━━━━━✓━━━━━━━━━✓━━━━━━━━━✓         (all green solid)           │
│  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐                        │
│  │…✓Abgeschl│…✓Abgeschl│…✓Abgeschl│…✓Abgeschl│…✓Abgeschl│  (all confirmed)      │
```

Bei `prefers-reduced-motion` ist der completed-Zustand identisch, nur ohne den Übergangs-Fade.

### 4.4 Wireframe — MOBILE (< md): vertical stack

5+ Knoten passen horizontal nicht auf mobile. **Verbindlich: < md vertikaler Stack** mit vertikalem Connector links der Knoten-Cards (kein horizontales Scrollen — Scroll versteckt den Wow). Der Hero-Banner und die beiden unteren Cards stapeln (1 Spalte).

```
┌──────────────────────────┐
│ Umzug auf Autopilot       │
│ Sie bestätigen einmal …   │
│ [Prototyp · Mock-Daten]   │
├──────────────────────────┤
│ ┌──────────────────────┐ │
│ │(✦) Kaskade wird ausg.│ │
│ │    … ● In Bearbeitung│ │
│ └──────────────────────┘ │
│                          │
│  ✓  ┌───────────────────┐│   ← vertical connector
│  │  │(🏛) Bürgeramt      ││     (marker left of card)
│  │  │ Adresse übermittelt││
│  │  │ 10:24 · ✓Abgeschl. ││
│  ●  └───────────────────┘│   ← active marker pulses
│  │  ┌───────────────────┐│
│  │  │(🧾) Finanzamt      ││
│  ⋮  └───────────────────┘│
│                          │
│ ┌──────────────────────┐ │
│ │(🏠) Ihr Umzug – Über. │ │
│ └──────────────────────┘ │
│ ┌──────────────────────┐ │
│ │(📋) Live-Aktivitäten  │ │
│ └──────────────────────┘ │
│ [Abbrechen][Zum Vorgang] │
│ Hinweis zum Prototyp …   │
└──────────────────────────┘
```

Responsive-Regel: `< md` → vertikaler Stack, Connector wird vertikal (Marker links jeder Card). `≥ md` → horizontale verbundene Reihe. Bei sehr vielen Knoten ≥ md (> 5) darf die Reihe in eine zweite Zeile umbrechen (flex-wrap) ODER innerhalb des Content-Bereichs horizontal scrollen — **bevorzugt: flex-wrap auf md, das den Connector pro Zeile neu zeichnet** (kein erzwungenes horizontales Scrollen auf Desktop). Für die V1-Demo (Anna: 5 Knoten) passt die einzeilige Reihe; die wrap/stack-Regel ist die Absicherung.

## 5. Autopilot logic (presentation only — backend UNCHANGED)

> Die gesamte Orchestrierung (Block-A/B/C/D, Latenz-Choreografie, 5%-Fehlerrate, `?reliable=1`, Bestätigungsschreiben) lebt unverändert in `src/lib/mock-backend/autopilot/umzug.ts` + `api.ts`. Diese Sektion beschreibt NUR, wie der Frontend die einlaufenden Events visualisiert.

### 5.1 Trigger
Die Seite lädt mit `?vorgangId=…`; der Generator läuft bereits (vom Vorschau-Screen gestartet). Events strömen über `api.subscribe` ein.

### 5.2 Cascade order (data-driven, NOT hardcoded)
Die Knoten werden aus `vorgang.schritte` gerendert. **Reihenfolge**: Block A zuerst, dann Block D, dann Block B (entspricht der Run-Reihenfolge des Generators in `umzug.ts`: A → D → B; Block C erzeugt keinen Cascade-Knoten — Self-Tasks). Innerhalb eines Blocks die Array-Reihenfolge beibehalten. Sortier-Schlüssel:
1. Block-Rang: A=0, D=1, B=2 (C wird herausgefiltert — `step.block === 'C'` erzeugt keinen Knoten).
2. innerhalb des Blocks: Einfüge-/Array-Reihenfolge aus `vorgang.schritte`.

Die Beispiel-Happy-Path-Reihenfolge für Anna (Bürgeramt → Finanzamt → Beitragsservice → Bundesdruckerei → AOK Nordost) ergibt sich daraus automatisch — sie wird NICHT hartcodiert.

### 5.3 Steps → visual narrative
Das zeitliche „Aufleuchten" ist **bereits durch die Backend-Latenz-Choreografie real** (Bürgeramt 900 ms, Finanzamt 1400 ms, Beitragsservice 1100 ms, Bundesdruckerei 1700 ms; Block B 400–900 ms). Die Knoten wechseln ihren Zustand, sobald die `autopilot_step`-Events eintreffen. **Es ist KEINE CSS-Choreografie nötig, um „lebendig" zu wirken** — der einzige echte Animationszusatz ist der Puls-Ring am aktiven Knoten + optionaler ≤ 200 ms State-Transition-Fade.

Pro Schritt:
1. `status === 'in_progress'` → Knoten ist „aktiv": blauer Card-Border, pulsierender Ring am Marker, StatusBadge `laufend` („In Bearbeitung"). Der Connector-Abschnitt davor ist grün (vorheriger Knoten fertig), der danach grau-gestrichelt.
2. `status === 'pending_eid_confirmation'` (Block D) → Knoten zeigt StatusBadge `warten` mit Label „Bestätigung erforderlich" + Inline-CTA-Button „Mit eID bestätigen" (öffnet `EidConfirmDialog`). Marker = solider blauer Ring (kein Puls — wartet auf Nutzer). Nach Bestätigung → `confirmed`-Animation wie die anderen.
3. `status === 'confirmed'` → grüner Card-Akzent, grüner ✓-Marker, Connector-Abschnitt grün-solide, StatusBadge `abgeschlossen` („Abgeschlossen"), Zeitstempel aus `completed_at` (HH:mm).
4. `status === 'failed'` → danger-Knoten (roter Akzent), StatusBadge `abgelaufen`-Variante mit Label „Fehlgeschlagen", `failure_reason` als Text, Connector-Abschnitt rot. Siehe Edge-Case §9.
5. `status === 'pending' | 'self_assigned'` (vor Eintreffen) → Knoten „Ausstehend": grauer Card, leerer Ring-Marker, gestrichelter Connector, StatusBadge `in_bearbeitung`-grau mit Label „Ausstehend".

Beim Erreichen des completed-Zustands (kein Knoten mehr in_progress/pending_eid_confirmation und `vorgang.status === 'abgeschlossen'` ODER alle Knoten confirmed/failed-final) flippt der Hero-Banner auf den Erfolgszustand.

### 5.4 AutopilotTimeline reuse decision (justified)
Der Brief verlangt eine Entscheidung. **Entscheidung: NEUE Cascade-Komponenten neben den bestehenden bauen, `AutopilotTimeline` NICHT auf der Run-Seite verwenden.**

Begründung:
- `AutopilotTimeline`/`AutopilotStepRow` sind **block-gruppiert + vertikal** (jeder Block eine eigene `<section>` mit Heading, `border-l`-Spalte). Der Prototyp #5 verlangt eine **block-agnostische, horizontal verbundene Knoten-Reihe** mit Connector-Linie + Markern — eine grundlegend andere Geometrie. Ein „Layout-Variant"-Flag auf `AutopilotStepRow` würde zwei inkompatible Render-Pfade in eine Komponente zwängen (Anti-Pattern; erhöht Test-/Wartungslast).
- `AutopilotTimeline` wird mit hoher Wahrscheinlichkeit von der Vorgang-Detail-Screen-Spec weiter benötigt (die block-gruppierte Ansicht ist dort die passende Darstellung). Sie unverändert zu lassen vermeidet Regressionen an einem anderen, nicht in dieser Spec liegenden Konsumenten.
- Die **kleinste gemeinsame Logik** (Status → Icon/Tone/Badge-Mapping) wird als gemeinsamer Helfer extrahiert und von beiden genutzt — siehe §6.5 `stepStatusViz`. So gibt es trotzdem keine duplizierte Status-Logik.

Reuse-Bilanz: `IconCircle`, `StatusBadge`, `EidConfirmDialog`, `BehoerdenBadge`-freie Behördennamen, und der extrahierte `stepStatusViz`-Helfer werden geteilt; nur die Layout-Geometrie ist neu.

### 5.5 Visual narrative — disclaimer
Bestätigungsschreiben („Bestätigungsschreiben erscheint im Posteingang") werden auf DIESER Seite nicht neu angezeigt — sie werden bereits vom Backend erzeugt und landen im Posteingang (Spine-Schritt 6, separate Surface). Der Live-Feed referenziert pro confirmed-Schritt das Aktenzeichen (aus `lettersById[step.letter_id]`), wenn vorhanden.

## 6. Component inventory (props as shapes — NO TSX)

> Alle NEW-Komponenten unter `src/components/umzug/`, `'use client'` nur wo State/Effekt nötig
> (die Cascade-/Banner-/Card-Komponenten sind reine Präsentation und können RSC-kompatibel sein,
> werden aber von der Client-Run-Seite gerendert — sie brauchen selbst kein `'use client'`, außer
> sie verwenden `useReducedMotion`; der Puls-Ring tut das → `AutopilotCascadeNode` ist Client).

### 6.1 Foundation primitives REUSED (no fork)
| Primitive | Quelle | Verwendung hier |
|---|---|---|
| `PageHeader` | `shared/PageHeader.tsx` | H1 „Umzug auf Autopilot" + Subtitle + `contextChip={{ tone: 'prototype' }}` |
| `IconCircle` | `shared/IconCircle.tsx` | Behörden-/Themen-Icon je Knoten, Hero-Banner-Icon, Übersicht-/Feed-Icons; `tone` ∈ neutral/primary/success/warning/danger |
| `StatusBadge` | `shared/StatusBadge.tsx` | Knoten-Status, Hero-Banner-Badge, Feed-Einträge; Varianten unten |
| `SectionCard` | `shared/SectionCard.tsx` | linke „Ihr Umzug – Übersicht"-Card (`title`, `icon`, `as="h2"`) |
| `RightRailCard` | `shared/RightRailCard.tsx` | rechte „Live-Aktivitäten"-Card (`title`, `icon`, `as="h2"`) |
| `Card`/`CardContent` | `ui/card.tsx` | Knoten-Cards, Loading-Skeleton, Error |
| `Button` | `ui/button.tsx` | eID-Inline-CTA, Abbrechen, Zum Vorgang, Retry |
| `Dialog*` | `ui/dialog.tsx` | Cancel-Bestätigung (bestehend) |
| `EmptyState` | `shared/EmptyState.tsx` | optional für Error-Fallback (sonst bestehende Error-Card) |
| `PrototypeDisclaimer` | `shared/PrototypeDisclaimer.tsx` | Fuß-Disclaimer |
| `EidConfirmDialog` | `umzug/EidConfirmDialog.tsx` | eID-Bestätigung — UNCHANGED |

**StatusBadge variant mapping** (REUSE bestehende Varianten — KEINE neuen Varianten):
| Step-Status | StatusBadge variant | Label-Key |
|---|---|---|
| `pending` / `self_assigned` | `in_bearbeitung` (grau-warning) ODER neutral | `autopilotRun.node.status.ausstehend` |
| `in_progress` | `laufend` (blau, Dot) | `common.status.in_bearbeitung` → „In Bearbeitung" |
| `pending_eid_confirmation` / `needs_eid` | `warten` (amber, Dot) | `autopilotRun.node.status.eid_required` → „Bestätigung erforderlich" |
| `confirmed` | `abgeschlossen` (success-muted, Check) | `common.status.abgeschlossen` → „Abgeschlossen" |
| `failed` | `abgelaufen` (danger) | `autopilotRun.node.status.failed` → „Fehlgeschlagen" |

> Hinweis: „Ausstehend" als sichtbares Label fehlt heute unter `common.status.*` (dort gibt es nur „In Bearbeitung"). Daher liegt `ausstehend` unter `autopilotRun.node.status.ausstehend`. Die übrigen Labels reusen `common.status.*` wo vorhanden.

### 6.2 `AutopilotHeroBanner` `<NEW>` — `src/components/umzug/AutopilotHeroBanner.tsx`
RSC-kompatibel (kein State). Full-width Card.
- **Props**:
  - `state: 'running' | 'completed' | 'partial_failure'`
  - `behoerdenCount: number` (Anzahl Cascade-Knoten, für die completed-Subtitle)
- **Layout**: `Card` full-width, `flex items-center justify-between`. Links `IconCircle` (running: `tone="primary"`, Icon `Sparkles`/`Wand2`; completed: `tone="success"`, Icon `CheckCircle2`; partial_failure: `tone="warning"`, Icon `AlertTriangle`) + Titel (`text-lg font-semibold`) + Subtitle (`text-sm text-text-secondary`). Rechts `StatusBadge`:
  - running → variant `laufend`, Label `common.status.in_bearbeitung` („In Bearbeitung", blauer Dot)
  - completed → variant `abgeschlossen`, Label `common.status.abgeschlossen` („Abgeschlossen", grüner Check)
  - partial_failure → variant `warten`/`abgelaufen`, Label `autopilotRun.banner.status_partial`
- **Strings**: `autopilotRun.banner.running_title`, `running_subtitle`, `completed_title`, `completed_subtitle` (ICU mit `{count}`), `partial_title`, `partial_subtitle`.
- **a11y**: Titel als `<h2>` (`aria-live="polite"`-Wrapper, damit der Wechsel running→completed angesagt wird). Icon dekorativ.

### 6.3 `AutopilotCascade` `<NEW>` — `src/components/umzug/AutopilotCascade.tsx`
Client (rendert `AutopilotCascadeNode`, die `useReducedMotion` nutzen). Container der verbundenen Knoten-Reihe.
- **Props**:
  - `nodes: CascadeNodeData[]` (bereits sortiert + Block-C-gefiltert vom Parent — siehe §6.7 Datenmapping)
  - `onConfirmEid: (stepId: string) => void`
  - `onRetry?: (stepId: string) => void`
- **Layout**: `≥ md` `flex flex-row` (oder `flex-wrap` bei > 5) mit Connector-Linie; `< md` `flex flex-col` mit vertikalem Connector. Connector ist KEINE eigene Komponente — er wird per Pseudo-/Border-Element zwischen Knoten gezeichnet (Marker-Reihe oberhalb der Cards ≥ md, links der Cards < md). Connector-Segment-Farbe pro Knoten aus dessen Status (grün = der Knoten ist confirmed; blau-solide = aktiv; grau-gestrichelt = pending).
- **a11y**: `<ol aria-live="polite" aria-label={autopilotRun.cascade.aria_label}>`. Jeder Knoten ein `<li>`. Die Connector-Linie/Marker sind `aria-hidden` (rein dekorativ — der Status steht im Knoten-Text).

### 6.4 `AutopilotCascadeNode` `<NEW>` — `src/components/umzug/AutopilotCascadeNode.tsx`
Client (`useReducedMotion` für den Puls). Eine Knoten-Card + zugehöriger Connector-Marker.
- **Props**:
  - `node: CascadeNodeData` (siehe §6.7)
  - `onConfirmEid?: () => void`
  - `onRetry?: () => void`
  - `isActive: boolean` (genau der erste `in_progress`-Knoten — bekommt blauen Border + Puls)
- **Layout**: oben (≥ md) / links (< md) der Marker (Kreis: ✓ grün confirmed / solider blauer Punkt aktiv / leerer Ring pending / roter danger failed). Darunter/daneben die `Card`:
  - `IconCircle` (Behörden-Icon, `tone` aus Status — confirmed=success, active=primary, pending=neutral, failed=danger)
  - Behörden-Name (`text-base font-semibold`, aus `node.behoerdeName`)
  - Aktions-Zeile (`text-sm text-text-secondary`, aus `node.actionLabel` — kurze Phrase, siehe §6.8 Action-Label-Mapping)
  - Zeitstempel (`text-xs text-text-muted tabular-nums`, aus `node.timestamp` HH:mm; bei pending Platzhalter „—")
  - `StatusBadge` (Variante/Label per §6.1-Tabelle)
  - optional Aktenzeichen (`font-mono text-[11px] tabular-nums`, `umzug.run.aktenzeichen_label` + `node.aktenzeichen`) wenn vorhanden
  - bei `pending_eid_confirmation`: Inline-`Button` „Mit eID bestätigen" (`umzug.run.eid_dialog.cta_confirm` ODER `autopilotRun.node.eid_cta`) → `onConfirmEid`
  - bei `failed`: `node.failureReason` als `text-danger` (role="alert") + optional Retry-`Button` (`common.cta.erneut_versuchen`) → `onRetry` (Edge-Case §9)
- **Animation (HL-DS-4)**: der Puls-Ring am aktiven Marker ist die EINZIGE Dauer-Animation. `const reduced = useReducedMotion();` → wenn `reduced` ODER `!isActive`: kein Puls (statischer solider Marker). Optionaler State-Transition-Fade ≤ 200 ms beim Knoten-Statuswechsel, unter reduced-motion = 0 ms. Keine gestaffelte Entrance-Animation. Kein Konfetti/Audio (HL-DS-5).
- **a11y**: Card als `<li>`-Inhalt; Status in Text+Badge (nie Farbe allein); Marker `aria-hidden`. eID-/Retry-Buttons ≥ 44px, eigener `aria-label` falls Icon-only (hier Text-Buttons). Knoten selbst nicht klickbar (kein Link) — nur die Buttons sind interaktiv.

### 6.5 Extracted helper `stepStatusViz` `<NEW>` — `src/components/umzug/stepStatusViz.ts`
Reine TS-Map (kein React), geteilt zwischen `AutopilotCascadeNode` und dem bestehenden `AutopilotStepRow` (Refactor: `AutopilotStepRow` importiert die Map statt sie lokal zu halten — vermeidet duplizierte Status-Logik, §5.4).
- **Shape**: `Record<AutopilotStepStatus, { iconTone, badgeVariant, statusLabelKey, markerKind: 'check' | 'active' | 'pending' | 'failed' | 'eid' }>`.
- Hinweis für coder: dieser Refactor berührt `AutopilotStepRow.tsx` nur als Import-Umstellung; die `AutopilotTimeline`-Render-Geometrie bleibt unverändert.

### 6.6 `UmzugUebersichtCard` `<NEW>` — `src/components/umzug/UmzugUebersichtCard.tsx`
RSC-kompatibel. Linke Card im 2-Spalten-Grid. Verwendet `SectionCard` als Container.
- **Props**:
  - `neueAdresse: string` (formatiert; der bestehende `formatRunSubtitle`-Helfer liefert `adresse` + `stichtag` aus `vorgang.context` — wiederverwenden)
  - `stichtag: string` (formatiert)
  - `behoerden: { name: string; confirmed: boolean }[]` (aus den Cascade-Knoten abgeleitet)
- **Layout**: `IconCircle` Home-Icon + `KeyValueRow`-artige Zeilen „Neue Adresse" / „Einzugsdatum"; Sub-Block „Autopilot-Bereich" mit `StatusBadge`/Chip „{n} Behörden" + Liste der Behörden mit `Check`-Icons (grün wenn confirmed); Fuß-Card `variant="soft"` (accent-soft): `IconCircle` Schild-Icon + „Ihre Daten sind geschützt" + „Übermittlung verschlüsselt, nur an zuständige Stellen." + optionaler Chevron-Link nach `/datenschutz`.
- **Strings**: `autopilotRun.uebersicht.title`, `neue_adresse_label`, `einzugsdatum_label`, `autopilot_bereich_label`, `behoerden_count` (ICU `{count}`), `schutz_title`, `schutz_subtitle`, `schutz_link`.
- **a11y**: Titel `<h2>`; Adress-/Datums-Zeilen als `<dl>` bevorzugt; Behördenliste als `<ul>`; Schutz-Link echter `<a>`/`Link` ≥ 44px.

### 6.7 `AutopilotLiveFeed` `<NEW>` — `src/components/umzug/AutopilotLiveFeed.tsx`
RSC-kompatibel. Rechte Card. Verwendet `RightRailCard` als Container.
- **Props**:
  - `entries: LiveFeedEntry[]` (chronologisch, neueste zuerst — vom Parent abgeleitet aus `vorgang.schritte` sortiert nach `completed_at ?? started_at` absteigend, plus der synthetische erste Eintrag)
- **`LiveFeedEntry` shape**: `{ id, iconTone, behoerdeName, actionLabel, timestamp (HH:mm), badgeVariant, badgeLabel, isSynthetic? }`. Der synthetische Eintrag „Autopilot gestartet" hat `isSynthetic: true`, `iconTone: 'primary'` (Sparkles), Subtitle `autopilotRun.feed.started_subtitle`, Timestamp aus `vorgang.angelegt_am` ODER dem frühesten `started_at`.
- **Layout**: vertikale Liste mit Timeline-Dots (kleiner `IconCircle` je Eintrag) + Behördenname + Aktions-Zeile + `tabular-nums`-Timestamp + `StatusBadge`. Neueste oben.
- **Strings**: `autopilotRun.feed.title`, `started_title`, `started_subtitle`. (Behördennamen + Aktions-Labels kommen aus den Knoten-Daten, nicht aus eigenen Keys.)
- **a11y**: Titel `<h2>`; `<ol aria-live="polite">`, damit jede neue Bestätigung angesagt wird; Timestamps `tabular-nums`.

### 6.8 Data-mapping — which `AutopilotStep` field drives which UI element

`CascadeNodeData` (Parent baut sie pro Schritt; reine Ableitung, kein neuer Backend-State):

| UI-Element | Quelle (`AutopilotStep` / Context) |
|---|---|
| Knoten-Existenz/Reihenfolge | `step.block` (C herausgefiltert) → Block-Rang A/D/B; innerhalb Block = Array-Reihenfolge |
| Behörden-Name | `behoerdenById[step.behoerde_id].name_de` (Fallback `step.behoerde_id`) |
| Behörden-Icon (`IconCircle` Icon) | per `step.behoerde_id`-Prefix-Map (siehe Icon-Tabelle unten) — rein presentational |
| Knoten-Status (Border/Marker/Tone/Badge) | `step.status` → `stepStatusViz` (§6.5) |
| Aktiver Knoten (Border+Puls) | der erste Schritt mit `status === 'in_progress'` |
| Aktions-Zeile (kurze Phrase) | per `step.behoerde_id`-Prefix → `autopilotRun.action.*`-Key (Tabelle §8); NICHT `step.aktion` (das ist die lange juristische Phrase) |
| Zeitstempel | `format(parseISO(step.completed_at ?? step.started_at), 'HH:mm')`; bei pending → „—" |
| Aktenzeichen | `lettersById[step.letter_id]?.aktenzeichen` (wenn vorhanden) |
| eID-CTA sichtbar | `step.status === 'pending_eid_confirmation' || step.status === 'needs_eid'` |
| Fehlertext | `step.failure_reason` (bei `status === 'failed'`) |
| Hero-Banner state | abgeleitet: `running` solange ≥ 1 Knoten in_progress/pending_eid_confirmation/pending; `completed` wenn alle confirmed; `partial_failure` wenn alle final aber ≥ 1 failed |
| Hero `behoerdenCount` | Anzahl Cascade-Knoten (nach C-Filter) |
| Übersicht „Neue Adresse"/„Einzugsdatum" | `vorgang.context.neue_adresse` / `vorgang.context.stichtag` via bestehendem `formatRunSubtitle` |
| Übersicht Behördenliste + checkmarks | Cascade-Knoten: `name` + `status === 'confirmed'` |
| Live-Feed Einträge | `vorgang.schritte` sortiert `completed_at ?? started_at` DESC + synthetischer Start-Eintrag |

**Behörden-Icon-Map (presentational, lucide; per `behoerde_id`-Prefix; nicht backend-relevant)**:
| Prefix / id | lucide Icon | tone bei active |
|---|---|---|
| `buergeramt-*` | `Landmark` | primary |
| `finanzamt-*` | `Receipt` / `Landmark` | primary |
| `beitragsservice-*` | `RadioTower` / `Tv` | primary |
| `bundesdruckerei` | `IdCard` | primary |
| `aok-*` / Krankenkasse | `HeartPulse` / `Stethoscope` | primary |
| `kfz-*` | `Car` | primary |
| `familienkasse-*` | `Users` | primary |
| `abh-*` | `FileText` | primary |
| Fallback | `Building2` | primary |

> Diese Icon-Zuordnung ist rein visuell; wenn der coder ein Icon näher am PNG identifiziert, ist das eine Vergleichsfrage, kein Spec-Bruch. Keine Farbe trägt Status-Bedeutung allein.

## 7. AI assistant integration

**Nicht anwendbar.** Diese Surface hat keine AI-/Tool-/SSE-Beteiligung. **assistant-engineer ist NICHT erforderlich.** Der Assistent→Autopilot-Handoff (Spine-Schritt 3) ist eine separate Spec.

## 8. i18n

`track: spine` → volle 6-Sprachen-Lokalisierung durch i18n-localizer (de = Source-of-truth, alle 6 Sprachen). **Neue Keys ausschließlich unter dem neuen Top-Level-Namespace `autopilotRun.*`** — bestehende `umzug.*`-Keys werden NICHT verändert oder umsortiert.

### 8.1 Reused existing keys (NICHT neu anlegen)
| Reused key | DE-Wert | Verwendung hier |
|---|---|---|
| `common.status.in_bearbeitung` | „In Bearbeitung" | aktiver Knoten-Badge + Hero running-Badge |
| `common.status.abgeschlossen` | „Abgeschlossen" | confirmed Knoten-Badge + Hero completed-Badge |
| `common.cta.abbrechen` | „Abbrechen" | Footer-Cancel (alternativ `umzug.run.cta_cancel`) |
| `common.cta.erneut_versuchen` | „Erneut versuchen" | Retry-Button bei failed |
| `umzug.run.cta_to_vorgang` | „Zum Vorgang" | Footer-Primär-Button |
| `umzug.run.cta_cancel` | „Abbrechen" | Footer-Cancel |
| `umzug.run.vorgang_label` | „Vorgang #{id}" | optionale Vorgangs-ID-Zeile (falls beibehalten) |
| `umzug.run.aktenzeichen_label` | „Aktenzeichen" | Aktenzeichen-Präfix im Knoten/Feed |
| `umzug.run.eid_dialog.*` | (bestehend) | `EidConfirmDialog` UNCHANGED |
| `umzug.run.cancel_dialog.*` | (bestehend) | Cancel-Bestätigungs-Dialog UNCHANGED |
| `common.context_chip.prototype` | „Prototyp · Mock-Daten" | PageHeader-contextChip |

### 8.2 NEW keys — `autopilotRun.*` (DE source-of-truth)

| Key | DE-Wert |
|---|---|
| `autopilotRun.title` | „Umzug auf Autopilot" |
| `autopilotRun.subtitle` | „Sie bestätigen einmal – das System koordiniert die nächsten Schritte." |
| `autopilotRun.banner.running_title` | „Kaskade wird ausgeführt" |
| `autopilotRun.banner.running_subtitle` | „Ihre Angaben werden sicher an die zuständigen Behörden übermittelt." |
| `autopilotRun.banner.completed_title` | „Alle Behörden informiert" |
| `autopilotRun.banner.completed_subtitle` | „Alle {count, plural, =1 {zuständige Stelle hat} other {# zuständigen Stellen haben}} Ihre Adressänderung erhalten." |
| `autopilotRun.banner.partial_title` | „Fast geschafft" |
| `autopilotRun.banner.partial_subtitle` | „Die meisten Stellen wurden informiert. Bei einzelnen Schritten ist ein erneuter Versuch nötig." |
| `autopilotRun.banner.status_partial` | „Teilweise abgeschlossen" |
| `autopilotRun.cascade.aria_label` | „Fortschritt der Behörden-Benachrichtigung" |
| `autopilotRun.node.status.ausstehend` | „Ausstehend" |
| `autopilotRun.node.status.eid_required` | „Bestätigung erforderlich" |
| `autopilotRun.node.status.failed` | „Fehlgeschlagen" |
| `autopilotRun.node.eid_cta` | „Mit eID bestätigen" |
| `autopilotRun.node.timestamp_pending` | „—" |
| `autopilotRun.node.aktenzeichen_prefix` | „Az." |
| `autopilotRun.action.buergeramt` | „Adresse übermittelt" |
| `autopilotRun.action.finanzamt` | „Zuständigkeit bestätigt" |
| `autopilotRun.action.beitragsservice` | „Adresse aktualisiert" |
| `autopilotRun.action.bundesdruckerei` | „Aufkleber wird erstellt" |
| `autopilotRun.action.krankenkasse` | „Übermittlung geplant" |
| `autopilotRun.action.kfz` | „Verifizierung läuft" |
| `autopilotRun.action.familienkasse` | „Zuständigkeit wird übernommen" |
| `autopilotRun.action.auslaenderbehoerde` | „Aktualisierung vorbereitet" |
| `autopilotRun.action.fallback` | „Adresse übermittelt" |
| `autopilotRun.uebersicht.title` | „Ihr Umzug – Übersicht" |
| `autopilotRun.uebersicht.neue_adresse_label` | „Neue Adresse" |
| `autopilotRun.uebersicht.einzugsdatum_label` | „Einzugsdatum" |
| `autopilotRun.uebersicht.autopilot_bereich_label` | „Autopilot-Bereich" |
| `autopilotRun.uebersicht.behoerden_count` | „{count, plural, =1 {1 Behörde} other {# Behörden}}" |
| `autopilotRun.uebersicht.schutz_title` | „Ihre Daten sind geschützt" |
| `autopilotRun.uebersicht.schutz_subtitle` | „Übermittlung verschlüsselt, nur an zuständige Stellen." |
| `autopilotRun.uebersicht.schutz_link` | „Mehr zum Datenschutz" |
| `autopilotRun.feed.title` | „Live-Aktivitäten" |
| `autopilotRun.feed.started_title` | „Autopilot gestartet" |
| `autopilotRun.feed.started_subtitle` | „Ihre Angaben wurden geprüft und die Kaskade gestartet." |

**Anzahl neuer `autopilotRun.*`-Keys: 35** (alle 6 Sprachen). Aktions-Labels (`action.*`) sind die kurzen Knoten-Phrasen; die langen juristischen `step.aktion`-Texte aus dem Backend werden NICHT angezeigt.

> i18n-localizer: alle 35 in en/ru/uk/ar/tr übersetzen. ICU-`plural` in `banner.completed_subtitle` + `uebersicht.behoerden_count` beachten. AR-RTL: „Az."/Aktenzeichen + HH:mm-Timestamps latein/`dir="ltr"`-isoliert halten. „eID", „MOCK", Behördennamen bleiben latein/bidi-neutral.

## 9. Edge cases

- **Schritt schlägt fehl (5% pro Block-A/B-Schritt)**: Der Knoten zeigt den danger-Zustand (roter Akzent, `StatusBadge` „Fehlgeschlagen", `step.failure_reason` als `role="alert"`-Text). **Empfehlung: graziöser Fehlzustand + Retry-Affordance NUR wenn das Backend ein Retry unterstützt.** Der bestehende `AutopilotTimeline`/`AutopilotStepRow`-Pfad führt einen `onRetry`-Prop, aber das aktuelle `api` exponiert keine dedizierte Retry-Funktion für einen fehlgeschlagenen Cascade-Step (der Generator läuft sequentiell durch). **Verbindlich für diese Spec: failed-Knoten zeigt einen ehrlichen Fehlzustand + Text; KEIN Retry-Button verdrahten, solange keine Backend-Retry-Funktion existiert** (kein toter Button). Stattdessen Hinweis auf `?reliable=1` als Demo-Schalter: der Banner kippt dann auf `partial_failure`. Für saubere Loom-Aufnahmen wird die Demo mit `?reliable=1` gefahren (erzwingt 0% Fehlerrate — bereits im Backend implementiert). `onRetry` bleibt als optionaler Prop im Komponenten-Interface reserviert, aber unverdrahtet — dokumentierter Future-Hook.
- **Kein `vorgangId`**: bestehender `router.replace('/vorgaenge/umzug/start')` greift (Null-Guard bleibt).
- **Landung MITTEN in der Kaskade** (einige Schritte bereits confirmed, persistiert): `api.getVorgang` liefert `vorgang.schritte` mit gemischten Status; die Kaskade rendert den korrekten Mid-State (frühere Knoten grün, aktiver blau, spätere grau). Der Live-Feed zeigt die bereits-bestätigten Einträge sofort. Kein Sonderpfad nötig — rein daten-getrieben.
- **Block-D eID-pending, wartet auf Bestätigung**: Knoten zeigt „Bestätigung erforderlich" + eID-CTA; Marker solider blauer Ring OHNE Puls (wartet auf Nutzer, nicht auf System). Nach `api.bestaetigeAutopilotSchritt` → `confirmed`-Event → Knoten flippt grün.
- **Alle bestätigt (completed)**: Hero kippt auf „Alle Behörden informiert"; alle Connector-Segmente grün; `aria-live` sagt den Banner-Wechsel an.
- **Viele Knoten auf schmalem Viewport**: `< md` vertikaler Stack (Connector vertikal), `≥ md` einzeilige Reihe; bei > 5 Knoten ≥ md `flex-wrap` (Connector pro Zeile neu) — kein erzwungenes horizontales Scrollen (§4.4).
- **Error beim Initial-Load**: bestehende Error-Card (`role="alert"`) bleibt; alternativ `EmptyState tone="neutral"`.
- **Reduced motion**: kein Puls, kein Connector-Anim, keine Entrance-Staffelung; aktueller Zustand sofort. Das zeitliche Aufleuchten über echte Events bleibt (keine Animation i.S.v. HL-DS-4).

## 10. Out of scope (explicit)

- **JEGLICHE mock-backend-/Type-/Seed-/Latenz-Änderung** — verboten. Der Backend-Flow ist komplett und wird unverändert wiederverwendet. mock-backend-coder NICHT erforderlich.
- **AI-/Assistent-/Tool-/SSE-Logik** — separate Hero-Spec. assistant-engineer NICHT erforderlich.
- **Vorschau-Screen** (`umzug/preview`) und **Start-Screen** (`umzug/start`) — nicht Teil dieser Spec.
- **Vorgang-Detail-Screen** (`vorgaenge/umzug/[id]`) — die `AutopilotTimeline` bleibt für diesen (anderen) Konsumenten unverändert.
- **Posteingang-Darstellung der Bestätigungsschreiben** (Spine-Schritt 6) — eigene Surface; hier wird nur das Aktenzeichen im Knoten/Feed referenziert.
- **Echte Retry-Funktion** im Backend — Future-Hook, in dieser Spec nicht verdrahtet (§9).
- **Neue StatusBadge-Varianten / neue Farbfamilien** — REUSE bestehende (HL-DS-3).
- **`WizardProgress`-Header** — der bestehende `WizardProgress`-Schritt-Indikator ist optional; der Prototyp #5 zeigt ihn nicht prominent. Coder-Entscheidung: entfernen ODER dezent beibehalten; nicht spec-kritisch.

## 11. Review checklist (for code-reviewer)

- [ ] Keine mock-backend-/Type-/Seed-/Latenz-Datei berührt (`git diff` zeigt nur `vorgaenge/umzug/run/page.tsx`, `components/umzug/**`, `de.json` + 5 Locale-Files). mock-backend-coder + assistant-engineer NICHT eingebunden.
- [ ] Load+Subscribe+eID-Maschinerie (`api.getVorgang`/`api.subscribe`/`api.getBehoerden`/`api.bestaetigeAutopilotSchritt`/`api.cancelUmzug`) unverändert übernommen; Null-Guard auf `vorgangId` bleibt.
- [ ] Kaskade ist DATEN-GETRIEBEN aus `vorgang.schritte` (Block A→D→B, C herausgefiltert) — KEINE hartcodierte Behörden-Reihenfolge.
- [ ] Keine hardcoded Strings — alles via `t()`; alle 35 `autopilotRun.*`-Keys in `de.json` + 5 weitere Locales; bestehende `umzug.*`-Keys unverändert.
- [ ] Hero-Banner kippt sichtbar running → completed; `behoerdenCount` korrekt.
- [ ] Status IMMER in Text + Badge, nie Farbe allein (jeder Knoten: Marker + Badge + Label).
- [ ] `aria-live="polite"` auf Kaskade (`<ol>`) UND Live-Feed (`<ol>`) UND Hero-Banner-Wrapper.
- [ ] HL-DS-4 reduced-motion: `useReducedMotion()`-Guard auf dem Puls-Ring; unter reduced-motion kein Puls/Connector-Anim/Entrance-Staffelung; State sofort. `MotionConfig reducedMotion="user"` (root-layout) vorausgesetzt.
- [ ] HL-DS-5: kein Glassmorphism/backdrop-blur, kein Konfetti/Audio.
- [ ] HL-DS-6: `tabular-nums` auf allen Zeitstempeln (HH:mm) + Aktenzeichen.
- [ ] HL-DS-7: blauer aktiver Knoten, grüner Erfolgs-Marker/-Badge, grauer pending-Zustand, roter failed — alle Kontrast-Floor bestanden (Token-basiert, kein Custom-Farbwert).
- [ ] HL-DS-8: eID-CTA, Retry (falls je), Abbrechen, Zum-Vorgang, Schutz-Link ≥ 44px Touch-Target.
- [ ] Genau ein `<h1>` (PageHeader); Banner/Übersicht/Feed-Titel als `<h2>`; korrekte Heading-Hierarchie.
- [ ] Foundation-Primitives REUSED (`IconCircle`/`StatusBadge`/`SectionCard`/`RightRailCard`/`Card`/`Button`/`EmptyState`) — kein Fork von Tokens/Primitives.
- [ ] `AutopilotTimeline`/`AutopilotStepRow` unverändert (außer der Import-Umstellung auf den extrahierten `stepStatusViz`-Helfer) — keine Regression am Vorgang-Detail-Konsumenten.
- [ ] Responsive: `< md` vertikaler Stack mit vertikalem Connector; `≥ md` horizontale verbundene Reihe (flex-wrap bei > 5).
- [ ] failed-Knoten zeigt ehrlichen Fehlzustand + `failure_reason`; KEIN toter Retry-Button (kein Backend-Retry).
- [ ] `[MOCK]`/PrototypeDisclaimer sichtbar, unaufdringlich; `common.context_chip.prototype` im PageHeader.
- [ ] Dark Mode via Tokens korrekt (kein Custom-Hex in den Komponenten).
- [ ] Lighthouse a11y > 95 auf der Run-Route; axe 0 kritisch (a11y-tester).

## Build log — frontend-coder
- date: 2026-05-27
- screens implemented: Autopilot-Run (Hero) — running ↔ completed ↔ partial_failure, data-driven cascade
- components created:
  - `src/components/umzug/AutopilotHeroBanner.tsx` (running/completed/partial banner, `<h2>` in `aria-live` wrapper)
  - `src/components/umzug/AutopilotCascade.tsx` (`<ol aria-live="polite">`, derives per-node connector tone + active node)
  - `src/components/umzug/AutopilotCascadeNode.tsx` (Client; marker + card; useReducedMotion-guarded pulse ring on the active node only)
  - `src/components/umzug/UmzugUebersichtCard.tsx` (SectionCard; `<dl>` address/date, `<ul>` behoerden w/ checkmarks, datenschutz link ≥44px)
  - `src/components/umzug/AutopilotLiveFeed.tsx` (RightRailCard; `<ol aria-live="polite">`, newest first + synthetic start entry)
  - `src/components/umzug/stepStatusViz.ts` (extracted shared status→{iconTone,badgeVariant,statusLabelKey,markerKind} map)
  - `src/components/umzug/behoerdeIcon.tsx` (presentational behoerde_id-prefix → lucide icon + action-label key)
  - `src/components/umzug/cascadeTypes.ts` (`CascadeNodeData`, `LiveFeedEntry` shapes)
- components modified:
  - `src/app/(app)/vorgaenge/umzug/run/page.tsx` (presentation rewrite; ALL data machinery — getVorgang/subscribe/getBehoerden/bestaetigeAutopilotSchritt/cancelUmzug, idx-merge, null-guard redirect, Suspense — preserved verbatim; WizardProgress + Vorgang-#id line dropped per §4.1/§10 coder-discretion)
  - `src/components/umzug/AutopilotStepRow.tsx` (import-only refactor to consume `stepStatusViz` for tone+badge; rendered output/labels unchanged — `umzug.run.status.*` keys + Icon/spin kept local)
- AutopilotTimeline reuse decision: implemented per §5.4 — built NEW cascade components alongside; `AutopilotTimeline` left untouched (Vorgang-Detail consumer); only shared status logic extracted into `stepStatusViz` and consumed by both `AutopilotStepRow` and `AutopilotCascadeNode`.
- i18n keys added (DE source): new top-level `autopilotRun.*` namespace — 36 leaf keys (spec headline says "35"; the spec's own §8.2 table lists 36 distinct keys, all implemented verbatim, values byte-matched to the table). No existing key modified/reordered.
- typecheck: pass (`tsc --noEmit` exit 0)
- lint: pre-existing environment failure only (`next lint` / direct eslint both fail at config-load: "Cannot read config file … eslint-config-next/index.js — Failed to patch ESLint" under ESLint 9.39.4 — documented pre-existing, not introduced by this change; tsc covers type/import correctness)
- unit suite: 639/639 pass (no regression; no unit test asserts the old timeline DOM)
- build: `next build` exit 0; `/vorgaenge/umzug/run` compiles (10.8 kB / 324 kB first load)
- manual cascade: drove real start→preview→run with `?reliable=1` (headless Chromium, throwaway script removed). Observed: H1 "Umzug auf Autopilot"; RUNNING banner "Kaskade wird ausgeführt" immediately; 6+ nodes render in data-driven order A→D→B (Bürgeramt→Finanzamt→Beitragsservice→Bundesdruckerei→Familienkasse→ABH) and flip to "Abgeschlossen" as backend events arrive (Az. "[MOCK] BD-P…" shown); Block-D eID nodes show "Bestätigung erforderlich" + working eID CTA → EidConfirmDialog → flip green; COMPLETED banner flips to "Alle Behörden informiert" after both eID confirmations; 13 confirmed badges incl. Block B; Übersicht + Live-Aktivitäten present.
- known gaps (for code-reviewer):
  1. e2e `tests/e2e/spine.spec.ts` (step 5) asserts the OLD timeline DOM: `#run-block-A-title`, `section[aria-labelledby="run-block-A-title"]`, and label text "bestätigt" (`umzug.run.status.confirmed`). The redesign removes the block-grouped structure and uses `autopilotRun.*` labels ("Abgeschlossen"). This spec assertion will fail and needs updating to the new cascade structure (e.g. `ol[aria-label="Fortschritt der Behörden-Benachrichtigung"]` + "Abgeschlossen"). NOT edited per instructions — flagged for owner.
  2. `tests/a11y/umzug.spec.ts` scans `/vorgaenge/umzug/run` WITHOUT a `?vorgangId` → hits the null-guard redirect to `/start` (unchanged behavior; the run-hero a11y is exercised on the started flow).
- ambiguity resolved: spec §8.2 says "35 keys" but the table enumerates 36 — implemented all 36 (the byte-exact table is authoritative over the headline count). Connector geometry: built as decorative `aria-hidden` border/bg spans inside the node (no separate component) per §6.3; horizontal marker-row ≥md, vertical marker-column <md; `md:flex-wrap` safety for >5 nodes. Block-B private entities (Sparkasse/Allianz/Vattenfall/Telekom) map to `action.fallback` + `Building2` icon (no dedicated prefix in §6.8 table).
- next: a11y-tester | code-reviewer | i18n-localizer

## Build log — i18n-localizer
- date: 2026-05-27
- locales updated: [en, ru, uk, ar, tr] (de = unchanged source-of-truth)
- new keys: 36 `autopilotRun.*` leaf keys per locale × 5 = 180 strings added
- changed keys: 0 (no DE value changed; no existing namespace touched)
- review-needed flags resolved: n/a (spine track → translated to full quality directly, no `needs_review` shortcuts)
- track: spine → FULL localization (6 locales human-quality, AR-RTL verified)
- known gaps: none. All 36 keys present in all 5 non-DE locales; ICU plurals preserved + locale-correct CLDR categories added (RU/UK few/other, AR =2/few/other).
