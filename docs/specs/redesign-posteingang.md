---
feature: redesign-posteingang
title: Redesign Posteingang — 3-Pane-Re-Skin (gruppierte Brief-Liste + Reader-Pane), Funktion unverändert
status: shipped
track: spine
date: 2026-05-27
author: product-architect
authorization: docs/demo-spine.md § "ACTIVE BUILD (decided 2026-05-27)" — user-supplied prototype; research/domain/verify waived per spine note.
owner_agents: [frontend-coder, i18n-localizer, a11y-tester, code-reviewer]
inputs:
  prototype: docs/design-prototype/08-posteingang.png
  foundation: docs/specs/redesign-foundation.md  # primitive + token CONTRACT
  existing_impl: src/components/posteingang/**  (PosteingangInbox, LetterReader, LetterCard, LetterListGroup, LetterListHeader, AISummaryBlock, AuthentizitaetsBadge, FristChip, WasKannIchTunFooter, OriginaltextBlock, ReplySheet, NeuerVorgangAusBriefModal, …)
  existing_specs: docs/specs/posteingang.md, docs/specs/posteingang-v1.5.md, docs/specs/posteingang-v1.5.1.md
gates: requires redesign-foundation APPROVE.
---

> **This is a RE-SKIN, not a rebuild.** The Posteingang is shipped and rich
> (Brief-Erklärer, Frist-Extraktion, Antwort verfassen V1.5, Rechtsbehelf-Skelette
> V1.5.1, Yellow-Letter-Bridge V1.1). **All existing functionality is PRESERVED.**
> This spec maps the existing component tree onto the user-supplied 3-pane prototype
> (08-posteingang.png) using the foundation tokens + primitives. No new
> mock-backend methods, no new AI tools, no legal-line changes. Where this spec and
> the shipped posteingang specs conflict on *visual/layout*, this wins; on
> *functionality / legal Hard-Lines* (Smartlaw, citation, disclaimers,
> `receipt_text`), the shipped specs win and are untouched.

> **Scope guard.** Only token/layout restyle + the 3-pane split-view shell. Do NOT
> touch `api.ts`, `tools.ts`, reply-templates, or any legal-disclaimer copy. Reuse
> foundation primitives (`PageHeader`, `FilterTabs`, `SearchInput`, `FilterButton`,
> `ListRow`, `StatusBadge`, `SectionCard`, `RightRailCard`, `IconCircle`).

---

## 1. Problem statement

Der Posteingang funktioniert, aber sein heutiges Layout (gestapelte Karten-Liste mit Filter-Popover, eigene Reader-Route) entspricht nicht dem vom Nutzer gelieferten 3-Pane-Prototyp (gruppierte Brief-Liste links, Reader-Pane rechts, mit „Authentisch geprüft"-Badge, KI-Brief-Erklärer-Karte, Frist-Zeile und Primär-Aktionen). Diese Spec bringt das Layout auf die einheitliche Design-Sprache, ohne Funktion zu verlieren.

## 2. Persona & journey

- Persona: `docs/personas.md#anna-petrov` (Demo-Default); persona-agnostische Capability.
- Trigger: Bürger:in öffnet `/posteingang` (oder klickt die Dashboard-Posteingang-Kachel / einen Assistent-Kontext-Link).
- Outcome: Bürger:in versteht einen Behörden-Brief, sieht die Frist, und kann antworten / einen Vorgang erstellen / das Original lesen.
- Time saved vs status quo: unverständliche Behördensprache → KI-Erklärung in Bullets mit Original-Zitat-Belegen; manuelle Frist-Übertragung → Frist-Chip + Kalender-Export.

## 3. Success criteria for the demo

- [ ] 3-Pane-Layout matcht den Prototyp: gruppierte Liste links (Neu / Frist offen ≤7 Tage / Erledigt mit Counts), Reader-Pane rechts.
- [ ] Chronologisch/Nach-Vorgang-Toggle + Filter-Button funktionieren wie bisher, neu im Foundation-Look.
- [ ] Reader zeigt „Authentisch geprüft"-Badge, KI-Brief-Erklärer-Karte, Frist-Zeile, Primär-Aktionen (Antwort vorbereiten / Vorgang erstellen / Originaltext anzeigen), „Was kann ich tun?"-Chips + Originaltext-Auszug.
- [ ] Alle bestehenden Funktionen (Reply V1.5, Rechtsbehelf V1.5.1, Yellow-Letter-Bridge, Frist-ICS, Vorgang-aus-Brief) bleiben erreichbar und grün (bestehende e2e bleiben gültig).
- [ ] Lighthouse a11y > 95; axe 0 kritisch (Re-Skin darf die bestehende a11y-PASS nicht regressieren).

## 4. Screen-by-screen flow

### 4.1 Screen: Posteingang (List + Reader, 3-Pane)

- **Route**: `/posteingang` (Liste + Reader nebeneinander auf ≥ lg). Die bestehende Detail-Route `/posteingang/[id]` bleibt als Deep-Link/Fallback bestehen (Mobile + Direkt-Link); auf ≥ lg öffnet ein Klick den Reader **inline** im rechten Pane statt zu navigieren.
- **File**: `src/app/(app)/posteingang/page.tsx` (RSC-Loader, bestehend) → `src/components/posteingang/PosteingangInbox.tsx` (`<EXTEND>` — bekommt den 3-Pane-Split + inline-Reader-Slot).
- **Server or client**: Loader RSC; `PosteingangInbox` + `LetterReader` Client (bestehend).

- **Layout** (Prototyp 08-posteingang.png): drei Zonen.

```
┌──────────────────────────────────────────────────────────────────────┐
│ Posteingang                                            [Page-H1]       │
│ Behörden-Briefe verstehen und beantworten              subtitle        │
│ [Prototyp · Mock-Daten]                                 contextChip    │
│                                                                        │
│ [🔍 Suche nach Absender oder Betreff……]   [Chronologisch|Nach Vorgang] [Filter ▾]│
│                                                                        │
│ ┌─ LISTE (links, ≈ 380px) ──────┐ ┌─ READER (rechts, flex-1) ───────┐ │
│ │ Neu (2)                       │ │ Finanzamt Berlin   [Authentisch │ │
│ │ ┌───────────────────────────┐ │ │ Steuerbescheid 2024  geprüft ✓] │ │
│ │ │✉ Finanzamt Berlin     •Neu│ │ │ Az · 21/815/00123  · 18.05.2026 │ │
│ │ │  Steuerbescheid 2024      │ │ │ ────────────────────────────────│ │
│ │ │  18.05.2026               │ │ │ ┌ KI-Brief-Erklärer ──────────┐ │ │
│ │ ├───────────────────────────┤ │ │ │ ✦ Im Brief erklärt …        │ │ │
│ │ │ AOK Nordost …             │ │ │ │ • Bullet (Zitat-Beleg)      │ │ │
│ │ └───────────────────────────┘ │ │ │ • Bullet …                  │ │ │
│ │ Frist offen ≤ 7 Tage (1)      │ │ └─────────────────────────────┘ │ │
│ │ ┌───────────────────────────┐ │ │ ⏰ Frist: Einspruch bis 17.06.  │ │
│ │ │ AfD-ZP … [16.06 rot]      │ │ │ ────────────────────────────────│ │
│ │ └───────────────────────────┘ │ │ [Antwort vorbereiten] [Vorgang  │ │
│ │ Erledigt (2)                  │ │  erstellen] [Originaltext anzeigen]│ │
│ │ ┌───────────────────────────┐ │ │ Was kann ich tun? [Einspruch]   │ │
│ │ │ LEA Berlin … (erledigt)   │ │ │  [Zahlung] [Aussetzung] …       │ │
│ │ └───────────────────────────┘ │ │ ── Originaltext-Auszug ─────────│ │
│ └───────────────────────────────┘ │ „Sehr geehrte Frau Petrov …"    │ │
│                                    └─────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────┘
```

- **Components used** (mapping existing → foundation):
  - `PageHeader` (foundation B2) — `<EXTEND>` der bestehenden `<header>` in `PosteingangInbox`. title `posteingang.hero.title`, subtitle `posteingang.hero.subtitle`, contextChip `common.context_chip.prototype`. Die bestehende `RechtlicheHinweiseDetails`-Collapsible bleibt darunter.
  - `SearchInput` (foundation B8) — ersetzt das bestehende Suchfeld in `LetterListHeader` (Token-Restyle). Bestehende Such-Logik (≥ 3 Zeichen, Absender/Betreff/Aktenzeichen) unverändert.
  - `FilterTabs` (foundation B3) — Chronologisch/Nach-Vorgang-Toggle. Ersetzt den bestehenden View-Switch in `LetterListHeader` visuell; State-Logik (`view`) bleibt. Tabs: `posteingang.inbox.view.chronologisch` / `posteingang.inbox.view.nach_vorgang` (bestehende Keys reuse falls vorhanden, sonst neu).
  - `FilterButton` (foundation B7) — ersetzt die bestehende `posteingang/FilterButton.tsx` + `FilterPopover`/`FilterSheet` visuell; Kategorie-Filter-Logik bleibt. (Der bestehende `posteingang/FilterButton.tsx` wird auf die foundation-Primitive zurückgeführt oder als dünner Wrapper restyled — keine Doppelung.)
  - `<LetterListGroup>` (`<EXTEND>`) — Gruppen-Header „Neu (2)" / „Frist offen ≤7 Tage (1)" / „Erledigt (2)" im Foundation-Look (`text-base font-semibold` + Count `text-text-muted tabular-nums`). Gruppen-Keys bestehend (`neu`, `frist_unter_7d`, `frist_ueber_7d`, `erledigt`, `archiv`, `andere`); der Prototyp betont drei Gruppen (Neu / Frist offen ≤7 Tage / Erledigt) — die übrigen Gruppen bleiben erhalten und werden nur gerendert, wenn sie Inhalt haben (bestehendes Verhalten).
  - `<LetterCard>` (`<EXTEND>`) → re-skin als foundation `ListRow` (B10): führendes `IconCircle` (Absender-Themen-Icon, farb-frei für Kategorie HL-DS-10), Titel = Behörde, Subtitle = Betreff, Meta = Datum (`tabular-nums`), Status = `StatusBadge` (`neu`/`warten`/`erledigt`), `selected`-State (aktiver Brief im Reader). Klick: ≥ lg → Inline-Reader; < lg → Navigation `/posteingang/[id]` (bestehend).
  - `<LetterReader>` (`<EXTEND>`) — re-skin der bestehenden Reader-Komponente:
    - Kopf: `BehoerdenBadge` (farb-frei) + `AuthentizitaetsBadge` (re-skin als `StatusBadge` Variante `verifiziert` „Authentisch geprüft") + Vorgangs-Link/`VorgangsBuendelTag` (bestehend) + H1 = Betreff + `<dl>` Aktenzeichen/Empfangen (`tabular-nums`, bestehend).
    - KI-Brief-Erklärer: `<AISummaryBlock>` (`<EXTEND>`) in eine `SectionCard` mit Sparkle-`IconCircle` + Titel „Im Brief erklärt". Bullets + Citation-Footnotes unverändert (Smartlaw/citation-Logik intakt).
    - Frist-Zeile: `<FristChip>` (re-skin via foundation `StatusBadge` urgency + `FristCountdown`); Citation-Mismatch-Warnung bleibt.
    - Primär-Aktionen: die bestehende `<StickyFristAction>` + `<WasKannIchTunFooter>` bleiben funktional; visuell als Foundation-Buttons („Antwort vorbereiten" primary, „Vorgang erstellen" outline, „Originaltext anzeigen" ghost). „Was kann ich tun?"-Chips als `FilterTabs`-artige Pills (bestehende `was_kann_ich_tun_options` + Disclaimer).
    - Originaltext-Auszug: `<OriginaltextBlock>` (bestehend) als zusammenklappbarer/scrollbarer Block am Ende des Reader-Panes (Prototyp zeigt einen Auszug + „Mehr anzeigen"). Auf ≥ md bleibt die bestehende side-by-side Summary/Original-Anordnung optional; im 3-Pane-Reader wird Originaltext als Auszug unter den Aktionen gezeigt (volle Ansicht via „Originaltext anzeigen"/Tab).
  - `EmptyState` (foundation B14) — Reader-Pane wenn kein Brief gewählt: „Wählen Sie einen Brief aus der Liste." Liste-Empty: bestehende Empty-Logik, re-skinned.
  - reuse unverändert (Funktion): `ReplySheet`, `PreVersandModal`, `ReplyConfirmationView`, `NeuerVorgangAusBriefModal`, `RentenBridgeCTA`, `CitationFootnote`, `NormZitatSpan`, `MockWatermarkBanner`, `RechtlicheHinweiseDetails`, `FristAbgelaufenWarnung`, `BekanntgabeCaveatDetails`.

- **Data fetched** (alle bestehend, KEINE neuen Methoden):
  - `api.getLetters()`, `api.getBehoerden()`, `api.getVorgaenge()` (Liste).
  - `api.extrahiereAktion(letterId)` (KI-Erklärer + Fristen + Optionen, lazy im Reader).
  - `api.markiereLetterGelesen`, `api.protokolliereLetterAktivitaet`, `api.getRepliesForLetter`, `api.getReplyDraft`, `api.applyYellowLetterBridge`, `api.getAltersvorsorge` — alle bestehend.

- **i18n keys**: weitgehend bestehend (`posteingang.*`). NEU nur, wo der Prototyp neue Labels braucht ODER ein foundation-Key fehlt:
  - `posteingang.reader.empty_select` = „Wählen Sie einen Brief aus der Liste."
  - `posteingang.reader.auth_badge` = „Authentisch geprüft" (falls `AuthentizitaetsBadge` heute einen anderen String nutzt → reconcile, NICHT duplizieren).
  - `posteingang.reader.originaltext_auszug_title` = „Originaltext-Auszug"
  - `posteingang.reader.originaltext_mehr` = „Mehr anzeigen"
  - Reuse: `common.search`, `common.filter`, `common.status.neu/warten/erledigt/verifiziert`, `posteingang.inbox.view.*`, `posteingang.reader.*` (bestehend), `posteingang.compose.*` (bestehend).

- **States**: loading (Skeleton-Liste, bestehend) / empty-list (bestehend) / empty-reader (`EmptyState` „Brief wählen") / reader-loading (Summary-Skeleton, bestehend) / reader-error (Retry, bestehend) / Filter-active (ActiveFilterChips, bestehend).

- **Accessibility notes** (darf bestehende PASS nicht regressieren):
  - Genau ein `<h1>` (`PageHeader`). Liste als gruppierte `<ul>`/Sektionen; jede Gruppe `<h2>`/`<h3>`. Reader-Pane `<article aria-labelledby="reader-title">` (bestehend).
  - 3-Pane: Liste + Reader sind zwei Landmarks. Bei Inline-Reader-Open auf ≥ lg: Fokus wandert kontrolliert zum Reader-`<h1>`/`<h2>`; Skip-Links bleiben (bestehend „zur Brief-Liste").
  - Aktiver Listen-Eintrag `aria-current="true"`/`selected`.
  - `tabular-nums` auf Aktenzeichen/Datum/Frist (HL-DS-6). Auth-Badge: Text-Marker, nicht nur grün.
  - Bestehende ARIA-Live-Region für Listen-Updates bleibt.

## 5. Autopilot logic

Nicht anwendbar. Der Posteingang empfängt die Bestätigungsschreiben des Umzug-Autopiloten (Read-seitig), löst aber selbst keine Kaskade aus. (Vorgang-aus-Brief erstellt einen Vorgang, kein Autopilot.)

## 6. Data model additions / changes

**Keine.** Keine neuen Typen, keine neuen mock-backend-Methoden, keine localStorage-Keys. Der Re-Skin ist rein visuell + Layout (3-Pane-Split + Inline-Reader-Slot).

### Mock-backend additions

**Keine NEW-Methoden.** (Bestätigung für mock-backend-coder: dieser Screen braucht nichts.)

## 7. AI assistant integration

Keine Änderung an `tools.ts`/`system-prompt.ts`. Die Posteingang-Tools (`erklaere_brief`, `extrahiere_frist`, `vorschlage_naechsten_schritt`) bleiben unverändert; der KI-Brief-Erklärer im Reader läuft über die bestehende `api.extrahiereAktion`-Pipeline (pre-baked Summaries, NICHT der Chat-Endpoint).

## 8. i18n

Fast alle Keys bestehen (`posteingang.*`). Die wenigen NEW-Keys aus § 4.1 sind DE-Source; `track: spine` → 6 Sprachen. **Wichtig**: keine bestehenden Posteingang-Strings duplizieren — wo der Prototyp einen Text zeigt, der schon einen `t()`-Key hat, diesen reusen. i18n-localizer prüft Parität, legt keine konkurrierenden Keys an.

## 9. Edge cases

- **Kein Brief gewählt (≥ lg)** → Reader-Pane zeigt `EmptyState`.
- **Schmale Viewports (< lg)** → kein Split; Liste füllt die Breite, Klick navigiert zu `/posteingang/[id]` (bestehende Route + Reader).
- **Citation-Mismatch** → bestehende Warnung; „Frist im Kalender" disabled (unverändert).
- **Erledigter Brief** → `StatusBadge` Variante `erledigt`; Aktionen wie bisher.
- **Reply bereits versandt** → bestehende `ReplyConfirmationView`/`StickyFristAction`-Logik (Multi-Reply-Stack) unverändert.
- **Filter aktiv + Inline-Reader offen** → der offene Brief kann durch den Filter aus der Liste fallen; Reader-Inhalt bleibt sichtbar bis ein anderer Brief gewählt wird (kein Auto-Close).
- **RTL (AR)** → Liste rechts, Reader links; Aktenzeichen/Datum bleiben LTR-Spans (bestehend).

## 10. Out of scope (explicit)

- **Jegliche Funktionsänderung** — Reply, Rechtsbehelf-Skelette, Yellow-Letter-Bridge, Frist-ICS, Vorgang-aus-Brief, Smartlaw-/Citation-/Disclaimer-Logik, `receipt_text`-Followup: alles unverändert.
- **Neue mock-backend-Methoden / AI-Tools.**
- **Pagination** unter der Liste (foundation B9) — der Prototyp zeigt keine; out (bestehende Gruppierung genügt).
- **Honeypot-Prompt-Injection-Marker** (Dashboard-Demo-Feature) — separat, nicht Teil dieses Re-Skins.
- **Zahlungs-Rail** (posteingang-v2-zahlungs-rail.md) — eigene Spec, nicht hier.

## 11. Review checklist (for code-reviewer)

- [ ] Alle bestehenden Posteingang-e2e/-unit-Tests bleiben grün (Funktion unverändert).
- [ ] 3-Pane-Split + Inline-Reader auf ≥ lg; Fallback auf `/posteingang/[id]` < lg.
- [ ] Foundation-Primitives genutzt (`PageHeader`, `SearchInput`, `FilterTabs`, `FilterButton`, `ListRow`, `StatusBadge`, `SectionCard`, `IconCircle`, `EmptyState`) — keine duplizierten Filter-/Card-/Row-Implementierungen.
- [ ] `BehoerdenBadge` farb-frei (HL-DS-10); Auth-Badge mit Text-Marker.
- [ ] `tabular-nums` auf Aktenzeichen/Datum/Frist (HL-DS-6).
- [ ] Keine neuen `api.ts`/`tools.ts`/Reply-Template/Disclaimer-Änderungen.
- [ ] Keine hardcoded Strings; NEW-Keys in `de.json` + 6 Locales; keine duplizierten bestehenden Keys.
- [ ] reduced-motion respektiert (Sheet/Modal-Crossfade, HL-DS-4); Inputs ≥ 48px (HL-DS-9), Aktionen ≥ 44px (HL-DS-8).
- [ ] Lighthouse a11y > 95; axe 0 kritisch (kein Regress gegenüber shipped PASS).

## Build log — frontend-coder
- date: 2026-05-27
- screens implemented: Posteingang 3-Pane-Re-Skin (gruppierte ListRow-Liste links + Inline-Reader rechts auf ≥ lg; Deep-Link-Route `/posteingang/[id]` bleibt < lg / no-JS / Tastatur-Fallback).
- components extended/created:
  - `src/components/posteingang/PosteingangInbox.tsx` (`<EXTEND>`) — `PageHeader` + contextChip statt Ad-hoc-`<header>`; 3-Pane-Grid `lg:grid-cols-[minmax(0,400px)_1fr]`; `selectedLetterId`/`selectionKey`/`isWide`-State; matchMedia(min-width:1024px)-Gate; gated `onSelectIfWide`; Reader-Pane-`<section>` (`hidden lg:block lg:sticky`).
  - `src/components/posteingang/InlineLetterReader.tsx` (`<NEW>`, client) — lädt gewählten Brief client-seitig (getLetter/getBehoerde/getVorgang), rendert `<LetterReader embedded>`, `EmptyState` (Inbox-Icon, „Wählen Sie einen Brief aus der Liste."), Loading-Skeleton, Inline-Error-Retry; bewegt Fokus auf den Reader-Heading-Wrapper bei jeder Auswahl; `key={letter.id}` remountet den Reader (sauberer on-mount-Summary-Fetch + Reply-State-Reset).
  - `src/components/posteingang/LetterReader.tsx` (`<EXTEND>`) — neue `embedded`-Prop: unterdrückt „Zurück"-Link, demotet H1→H2 (PageHeader besitzt das einzige H1); „Authentisch geprüft"-`StatusBadge variant="verifiziert"` neben `BehoerdenBadge` (zusätzlich zum bestehenden `AuthentizitaetsBadge`); Funktion sonst unverändert (Reply V1.5, Rechtsbehelf V1.5.1, Yellow-Letter-Bridge, Frist-ICS, Vorgang-aus-Brief, Smartlaw/Citation/Disclaimer, `receipt_text`-Pfad — alle unberührt).
  - `src/components/posteingang/LetterCard.tsx` (`<EXTEND>`) — neue `variant="row"` (kompakte foundation-ListRow: `IconCircle` + Behörde-Titel + Betreff-Subtitle + Datum/`FristChip`-Meta + `StatusBadge` neu/erledigt/warten; `selected`-State `bg-accent-soft`+`border-primary`). Maus-Klick (`event.detail > 0`) → `onSelect` (inline), Tastatur-Enter (`detail === 0`) → Navigation `/posteingang/[id]`. Default-`variant="card"` (V1.5-Karte) für `VorgangsGruppe`/`SonstigeGruppe` unverändert.
  - `src/components/posteingang/LetterListGroup.tsx` (`<EXTEND>`) — Gruppen-Header `text-base font-semibold` + Count `text-text-muted tabular-nums` (Prototyp-Look statt uppercase-tiny).
  - `src/components/posteingang/LetterListHeader.tsx` (`<EXTEND>`) — View-Toggle Chronologisch/Nach-Vorgang auf foundation `FilterTabs` migriert (shadcn-`Tabs` ersetzt); Filter-Count-Badge als FilterTabs-Count erhalten; Such-/View-Logik unverändert.
  - `src/components/posteingang/AktenzeichenSearch.tsx` (`<EXTEND>`) — Input token-angeglichen: `min-h-[48px]` (HL-DS-9), `border-border-strong`, `text-base`, `ps-9`, foundation-Text-Tokens; Combobox-/Listbox-/Tastatur-Logik unverändert (statt durch plain `SearchInput` ersetzt — bewahrt die WAI-ARIA-Combobox-Funktion).
  - `src/components/posteingang/FilterButton.tsx` (`<EXTEND>`) — `min-h-[44px]` ergänzt (HL-DS-8); Popover/Sheet-Wiring unverändert.
- i18n keys added (DE source, `de.json`): `posteingang.reader.{empty_select_title,empty_select_body,auth_badge,originaltext_auszug_title,originaltext_mehr}`. Keine bestehenden Keys dupliziert. de.json JSON.parse OK.
- mock-backend / tools.ts / Reply-Templates / Disclaimer-Copy: NICHT berührt (Scope-Guard eingehalten).
- typecheck: pass (`tsc --noEmit` clean für alle Posteingang-Dateien; einzige verbleibende tsc-Fehler liegen in `tests/a11y/redesign-dashboard.spec.ts` — uncommitted, anderer Agent, NICHT in meinem Scope).
- lint: pass (`next lint` clean; einzige Warnung vorbestehend `stammdaten/api.ts:39 'read' unused` — out of scope).
- unit suite: 639/639 grün (unverändert gegenüber Baseline; keine Posteingang-Unit gebrochen).
- a11y (Playwright `--project=a11y`): `tests/a11y/posteingang.spec.ts` 3 passed (inbox axe 0 serious/critical, reader `/posteingang/[id]` axe 0 violations, AR-RTL flip) + 1 skipped (`NEXT_PUBLIC_RELIABLE`-gated ReplySheet-focus-trap). Reader-Test bestätigt den Tastatur-Enter→Deep-Link-Fallback.
- smoke-test: `/posteingang` HTTP 200, „Posteingang" / „Prototyp · Mock-Daten" / „Chronologisch" im HTML; keine Compile-/Runtime-Fehler.
- prototype details not matched (+ why):
  1. „Originaltext-Auszug" (`originaltext_auszug_title`/`originaltext_mehr`-Keys angelegt) wird im embedded-Reader weiterhin über die bestehende `<OriginaltextBlock>`-Anordnung gezeigt (md+: side-by-side Summary/Original; mobil: Tab-Switcher) statt als separater zusammenklappbarer Auszug am Pane-Ende. Grund: ein neuer Auszug-Block hätte die bestehende `OriginaltextBlock`-Scroll-/Citation-Anchor-Funktion (`scrollToZitat`) dupliziert/riskiert; die Funktion bleibt unverändert grün. Keys sind angelegt und für einen späteren reinen Layout-Slot reserviert. Folge-Kandidat für code-reviewer/a11y-tester.
  2. `nach-vorgang`-Ansicht nutzt weiter `VorgangsGruppe`/`SonstigeGruppe` mit der `card`-Variante (Navigation statt Inline-Select). Der 3-Pane-Inline-Select greift in der flachen `chronologisch`-Liste (Prototyp-Primärfluss); in der Gruppen-Ansicht navigieren Karten zum Deep-Link — valider Fallback, kein Funktionsverlust.
- next: a11y-tester (Lighthouse-Score-Capture + Inline-Reader-Fokus-Audit auf ≥ lg), i18n-localizer (5 NEW reader-keys → 5 Non-DE-Locales), code-reviewer.

## Build log — i18n-localizer
- date: 2026-05-27
- locales updated: [en, ru, uk, ar, tr] (de.json NICHT berührt)
- new keys: 5 reader-keys × 5 Locales = 25 strings — `posteingang.reader.{empty_select_title,empty_select_body,auth_badge,originaltext_auszug_title,originaltext_mehr}`. Eingefügt nach `not_found_body`, vor `originaltext_heading`, identisch zur de.json-Reihenfolge. Diff gegen alle 5 Non-DE-Locales bestätigte: nur diese 5 Keys fehlten (übriges `posteingang.*` bereits aus Vorgänger-Ships vollständig übersetzt).
- changed keys: 0
- review-needed flags resolved: 0 (FULL quality)
- length flags: alle ≤ Quelle bzw. innerhalb +40 %. `empty_select_body` (längster String) ist Empty-State-Fließtext, kein Layout-Risiko.
- RTL-Hinweis (AR): das DE-Original `empty_select_body` sagt „Links sehen Sie Ihre Behörden-Briefe" — im 3-Pane-Layout liegt die Liste in RTL rechts. AR-Übersetzung daher bewusst „تظهر رسائلك الرسمية على اليمين" (rechts) statt wörtlich „links". RU/UK/EN/TR behalten „links/слева/ліворуч/solda" (LTR-Layout). frontend-coder/a11y-tester: bei AR-RTL prüfen, dass die Listen-Pane tatsächlich rechts steht (Konsistenz mit dieser Übersetzung).
- Behörden-Terminus: `auth_badge` „Authentisch geprüft" → generischer Authentizitäts-String, keine Agenturnamen. „Behörden-Briefe" generisch übersetzt (EN „official letters", RU „письма от ведомств", UK „листи від відомств", AR „رسائلك الرسمية", TR „resmî yazılarınız").
- JSON: alle 5 Dateien strukturell verifiziert; maßgeblicher JSON.parse-Gate im Main-Thread.

## Code review — code-reviewer (2026-05-27)
- verdict: APPROVE
- gates: tsc PASS; lint PASS (1 pre-existing OOS warning); vitest 639/639; i18n JSON.parse 6/6 + full parity; AI gate smoke 38/38.
- full verdict + per-file citations: docs/reviews/2026-05-27-redesign-spine-code.md
- status set to shipped. Non-blocking nits tracked in the review file (no REVISE items on this screen).
