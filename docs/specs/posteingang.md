---
feature: posteingang
title: Aggregierter Behörden-Posteingang mit AI-Brief-Erklärer
status: shipped
shipped_at: 2026-05-09
owner_agents: [frontend-coder, mock-backend-coder, assistant-engineer, i18n-localizer, a11y-tester, code-reviewer]
inputs:
  research: docs/research/2026-05-08-posteingang-brief-erklaerer.md
  domain: docs/domain/posteingang.md
  verify: docs/reviews/2026-05-08-posteingang-verify.md
outputs:
  a11y_initial: docs/a11y-reports/posteingang-2026-05-09.md
  a11y_recheck: docs/a11y-reports/posteingang-2026-05-09-recheck.md
  code_review: docs/reviews/2026-05-09-posteingang-code.md
---

## 1. Problem statement

Behördensprache ist für die überwiegende Mehrheit der Bürger:innen strukturell unverständlich: nur **4 %** finden sie verständlich, **75 %** fühlen sich überfordert, **47 %** brauchen Hilfe Dritter, **25 %** erlitten finanzielle Nachteile durch Sprachschwierigkeiten (Taxfix/Qualtrics/WORTLIGA, n=2.039, repräsentativ). eGov-MONITOR 2025 bestätigt: jede vierte Person nennt Unverständlichkeit als Hauptgrund für Unzufriedenheit; **39 %** der Digital-Skeptiker:innen würden bei klarer Sprache Digital-Only akzeptieren. Forsa/dbb 09/2025 sekundär: **73 %** Staat-überfordert, **85 %** wünschen verständlichere Gesetze, **59 %** empfinden Behördenkontakt als „sehr anstrengend". Bürger:innen erleben heute zudem **vier verschiedene Bekanntgabe-Regimes** parallel (§ 41 Abs. 2 VwVfG / § 41 Abs. 2a VwVfG / § 122a AO / § 5 Abs. 7 VwZG) und unterscheiden nicht zwischen Verwaltungsakt mit Frist (Bescheid) und reiner Information (Anschreiben). Es gibt **keinen consumer-facing DE-Player**, der Briefe mehrerer Behörden in einer Inbox aggregiert, AI-erklärt und Fristen trackt — echter Whitespace.

## 2. Persona-agnostic Bürger:innen-Journey

> Persona-agnostisch: die Capability greift für **jede:n** Bürger:in. Persona-spezifische Brief-Subsets werden ausschließlich in §6 (Seed-Daten) instanziiert. Hero/Inbox/Reader-Screens sprechen durchgehend „Bürger:in" an, niemals einen Vornamen.

- **Trigger** (3 typische Eintrittsszenen):
  1. **Push-Trigger Frist**: Bürger:in öffnet die App auf dem Handy, sieht im Dashboard „1 neuer Brief, Frist in 6 Tagen" → tippt → landet im Posteingang.
  2. **Pull-Trigger Verständnis**: Bürger:in hat einen Papierbrief erhalten, sucht in der App nach dem Aktenzeichen ([MOCK] 11/123/45678) → Aktenzeichen-Suche oben → Brief erscheint.
  3. **Lateral-Trigger Vorgang**: Bürger:in klickt im laufenden Vorgang („Umzug 2026") auf „4 Briefe zu diesem Vorgang" → Posteingang-Filter `?vorgang=…` ist vorausgewählt.
- **3 typische Inbox-Szenen** (Demo-Walkthrough deckt sie ab):
  1. **Inbox-Scan in 30 s**: Bürger:in landet im Posteingang, sieht 4–6 Briefe, jeder mit Pre-Open-Zeile „[Behörde] · [Brieftyp] · Frist {N} Tage". Frist-Chips kodieren Dringlichkeit farblich + textuell. Bürger:in erkennt in <30 s den dringendsten Brief.
  2. **Brief-Verständnis in 30 s**: Klick auf den dringendsten Brief → LetterReader. AI-Summary-Bullets links, Originaltext rechts (Desktop) bzw. Tab-Switcher mit **Default-Tab Originaltext** (Mobile). Bürger:in liest 5–8 Bullet-Punkte, prüft Frist gegen Citation, klickt „Frist im Kalender".
  3. **Sammeln über alle Vorgänge**: Bürger:in wechselt auf Tab „Nach Vorgang gruppieren" → sieht Cluster „Umzug 2026 (4 Briefe)", „Aufenthaltstitel-Verlängerung (2 Briefe)", „Sonstige (3 Briefe)". Klick auf Cluster filtert die Liste. Initial-Briefe ohne Vorgang zeigen CTA „Neuer Vorgang? [Brieftyp] [Jahr] anlegen?".
- **Outcome**: Bürger:in versteht in <60 s, was die Behörde will, welche Frist gilt und welche Handlungsmöglichkeiten bestehen — ohne den Originaltext zu ersetzen. Frist landet im Kalender (.ics), Brief ist als gelesen markiert (rein App-intern, **kein** rechtlicher Abruf), Datenschutz-Cockpit dokumentiert die KI-Verarbeitung.
- **Time saved vs Status quo**: Status quo = 5–10 min PDF-Lesen + Begriffs-Recherche pro Brief × N Briefe pro Monat; viele Bürger:innen lassen Briefe ungelesen liegen oder bezahlen externe Hilfe (~75 €/Brief Verbraucherzentrale). Posteingang-Capability: 30 s Pre-Open + 60 s Post-Open je Brief, Frist automatisch im Kalender. Quelle Pain-Größenordnung: research-scout 2026-05-08 (Taxfix/WORTLIGA + eGov-MONITOR + Forsa/dbb).

## 3. Success criteria for the demo

- [ ] Viewer versteht den Posteingang-Wow innerhalb **30 Sekunden** im Loom-Video (Inbox-Scan: 4–6 Briefe mit Pre-Open-Zeile + Frist-Chip sichtbar, dringendster Brief erkennbar ohne zu klicken).
- [ ] **Default-Tab auf Mobile = Originaltext**, nicht AI-Summary (citizen-respectful, gegen Apple-Intelligence-Default).
- [ ] Auf Desktop sind AI-Summary (links) und Originaltext (rechts) **gleichzeitig** ohne Scrollen sichtbar.
- [ ] **Citation pro Bullet** im Post-Open-Summary obligatorisch — jeder AI-Bullet hat im Tooltip/Footnote den Original-Satz.
- [ ] **Frist-Chip** zeigt Datum aus Original-Zitat, nicht AI-Berechnung. Mismatch (LLM ≠ Regex) → Hand-off „Bitte selbst prüfen".
- [ ] Alle **vier** mandatory Disclaimer-Strings (`opening`, `no_legal_advice`, `mock_data`, `original_authoritative`) sind in der App referenzierbar; **`opening`** ist auf Posteingang-Hero und in jedem LetterReader sichtbar; **`original_authoritative`** als roter Banner über jedem AI-Summary-Block.
- [ ] **`[MOCK]`-Watermark** in jedem Brief-Body (Banner) **und** im Aktenzeichen-String (Präfix/Infix).
- [ ] **Authentizitäts-Badge** auf jeder LetterCard mit Stufe „Empfangen über [Kanal]" (V1 nur diese Stufe funktional).
- [ ] **Datenschutz-Cockpit-Link** auf jeder LetterCard öffnet `/datenschutz` mit gefilterter Eintrags-Liste pro Brief.
- [ ] Pro Persona zeigt der Demo-Walkthrough 5–7 Briefe aus mind. 4 verschiedenen Brief-Archetypen — die Capability generalisiert sauber über alle drei Personas.
- [ ] „Antwort vorschlagen" ist **NICHT** in V1 implementiert (RDG-Linie). „Was kann ich tun?"-Footer zeigt nur informative, nicht-handlungsanweisende Listen.
- [ ] Lighthouse Accessibility > 95 auf `/(app)/posteingang` und `/(app)/posteingang/[id]`.
- [ ] „Stand 2027"-Speculative-Design-Footer auf Posteingang-Hero sichtbar (Wortlaut aus verifier).
- [ ] Alle 6 Sprachen (DE, EN, RU, UK, AR, TR) per `next-intl` aufrufbar; **AI-Summary** wird übersetzt; **Originaltext** bleibt DE; AR-RTL nur im Summary-Bereich, Originaltext-Bereich bleibt LTR-DE.
- [ ] Alle 6 Brief-Archetypen + Persona-Erweiterungen sind in `letters.json` instanziiert; existierende 8 Anna-Briefe aus Umzug-Phase bleiben erhalten (Extend, nicht Replace).

## 4. Screen-by-screen flow

### 4.1 Screen: Posteingang-Inbox (chronologisch + Status-Gruppierung)

- **Route**: `/(app)/posteingang`
- **File**: `src/app/(app)/posteingang/page.tsx`
- **Server or client**: **RSC** für initiale Liste; **Client** sub-tree für Filter/Suche/Tabs (siehe Komponenten).
- **Layout** (ASCII):

  ```
  ┌──────────────────────────────────────────────────────────────────────┐
  │  Posteingang                                       [Sprache ▾] [👤] │
  │  Stand 2027 — Aggregierter Behörden-Posteingang (Speculative Design) │
  ├──────────────────────────────────────────────────────────────────────┤
  │ ┌─Filter──────────────┐  ┌──Suche─────────────────────────────────┐ │
  │ │ Kategorie            │  │ 🔍 Aktenzeichen oder Behörde …        │ │
  │ │ ☐ Bund               │  └────────────────────────────────────────┘ │
  │ │ ☐ Land               │                                              │
  │ │ ☐ Kommunal           │  [ Chronologisch ] [ Nach Vorgang gruppieren ] │
  │ │ ☐ Selbstverwaltung   │                                              │
  │ │ ☐ Privatrechtl…      │  ─── Neu (2) ───                            │
  │ │                      │  ┌──────────────────────────────────────┐   │
  │ │ Status               │  │ ⬤ Finanzamt Berlin Mitte             │   │
  │ │ ☐ Neu                │  │   Steuerbescheid · Frist 29 Tage     │   │
  │ │ ☐ Frist ≤ 7 Tage     │  │   [MOCK] 11/123/45678 · [Vorgang ↗] │   │
  │ │ ☐ Frist > 7 Tage     │  │   [Bund · Empfangen über Briefpost]  │   │
  │ │ ☐ Erledigt           │  └──────────────────────────────────────┘   │
  │ │ ☐ Archiv             │  ┌──────────────────────────────────────┐   │
  │ │                      │  │ ⬤ Familienkasse Berlin-Brandenburg   │   │
  │ │ [Alle zurücksetzen]  │  │   Nachweis · Frist 8 Tage            │   │
  │ └──────────────────────┘  │   [MOCK] 115FK154721                 │   │
  │                            │   [+ Neuer Vorgang anlegen?]         │   │
  │                            └──────────────────────────────────────┘   │
  │                            ─── Frist ≤ 7 Tage (1) ───               │
  │                            ┌──────────────────────────────────────┐   │
  │                            │ ⬤ Beitragsservice Köln  ⚠ 5 Tage    │   │
  │                            └──────────────────────────────────────┘   │
  │                            ─── Erledigt (2) ───   …                 │
  │                                                                       │
  │  ┌─ Hinweis zum Prototyp ─────────────────────────────────────────┐  │
  │  │  Diese Demo zeigt … (posteingang.disclaimer.mock_data)         │  │
  │  └────────────────────────────────────────────────────────────────┘  │
  └──────────────────────────────────────────────────────────────────────┘
  ```

- **Components used**:
  - `<PosteingangHero>` `<NEW>` from `src/components/posteingang/` — H1 + Speculative-Design-Footer-Banner mit „Stand 2027"-Wortlaut.
  - `<LetterListHeader>` `<NEW>` from `src/components/posteingang/` — Tab-Switcher „Chronologisch" / „Nach Vorgang gruppieren" + Aktenzeichen-Suchfeld.
  - `<AktenzeichenSearch>` `<NEW>` from `src/components/posteingang/` — debounced (250 ms) Eingabe-Feld mit Trefferliste; ruft `api.searchLettersByAktenzeichen(query)`.
  - `<BehoerdenKategorieFilterSidebar>` `<NEW>` from `src/components/posteingang/` — Sidebar mit 5 Kategorie-Checkboxes (Bund / Land / Kommunal / Selbstverwaltung / Privatrechtl-aber-behördenartig) + 5 Status-Checkboxes; ruft `api.getLettersByBehoerdenKategorie(kategorie)`.
  - `<LetterListGroup>` `<NEW>` from `src/components/posteingang/` — Status-Gruppen-Header (Neu / Frist ≤ 7d / Frist > 7d / Erledigt / Archiv) mit Count-Badge.
  - `<LetterCard>` (REPLACE existierende minimal-LetterCard) from `src/components/posteingang/` — siehe Komponenten-Inventar §5.
  - `<VorgangsBuendelTag>` `<NEW>` from `src/components/posteingang/` — kleines Tag „Gehört zu Vorgang ‚{title}'" oder bei Initial-Briefen „Neuer Vorgang? [Brieftyp] [Jahr] anlegen?"; klickbar.
  - `<AuthentizitaetsBadge>` `<NEW>` from `src/components/posteingang/` — 3-Stufen-Badge („Empfangen über [Kanal]" / „Eingabe durch Bürger:in" V2 / „EUDI-Wallet-versiegelt" V1-Konvention).
  - `<DatenschutzCockpitLink>` (already exists in `src/components/shared/`) — extend: pro-Brief-Filter (`?letter={id}`).
  - `<FristCountdown>` (already exists in `src/components/shared/`) — wiederverwenden für Frist-Chip.
  - `<PrototypeDisclaimer>` (already exists in `src/components/shared/`) — Posteingang-spezifischen Wortlaut über `posteingang.disclaimer.mock_data` ergänzen.
- **Data fetched** (RSC): `api.getLetters()` (alle Briefe der aktiven Persona, sortiert chronologisch desc). Client-Sub-Trees rufen zusätzlich `api.searchLettersByAktenzeichen(query)` und `api.getLettersByBehoerdenKategorie(kategorie)`.
- **i18n keys introduced**:
  - `posteingang.hero.title` — „Posteingang"
  - `posteingang.hero.subtitle` — „Alle Behörden-Briefe an einem Ort. Verstehen statt verzweifeln."
  - `posteingang.hero.speculative_footer` — siehe §8 verbatim.
  - `posteingang.list.tab_chronologisch`, `posteingang.list.tab_nach_vorgang`
  - `posteingang.list.group.neu`, `posteingang.list.group.frist_unter_7d`, `posteingang.list.group.frist_ueber_7d`, `posteingang.list.group.erledigt`, `posteingang.list.group.archiv`
  - `posteingang.list.empty_inbox` — „Keine Briefe im Posteingang."
  - `posteingang.list.empty_filter` — „Keine Briefe für die gewählten Filter."
  - `posteingang.search.placeholder` — „Aktenzeichen oder Behörde suchen …"
  - `posteingang.search.hits_count_template` — „{count} Treffer"
  - `posteingang.filter.kategorie.title` — „Behörden-Kategorie"
  - `posteingang.filter.kategorie.bund`, `…land`, `…kommunal`, `…selbstverwaltung`, `…privatrechtl_behoerdenartig`
  - `posteingang.filter.status.title`, `…neu`, `…frist_unter_7d`, `…frist_ueber_7d`, `…erledigt`, `…archiv`
  - `posteingang.filter.cta_reset` — „Alle Filter zurücksetzen"
  - `posteingang.card.aktenzeichen_label`, `posteingang.card.frist_label`, `posteingang.card.frist_keine`, `posteingang.card.frist_abgelaufen_template`, `posteingang.card.brieftyp_label`
  - `posteingang.card.vorgang_tag_template` — „Gehört zu Vorgang ‚{title}'"
  - `posteingang.card.vorgang_anlegen_template` — „Neuer Vorgang? {brieftyp} {jahr} anlegen?"
  - `posteingang.card.markiere_gelesen` — „Diesen Brief als gelesen markieren" (NIE „Lesebestätigung")
  - `posteingang.card.cta_open` — „Brief öffnen"
  - `posteingang.card.authentizitaet.empfangen_template` — „Empfangen über {kanal}"
  - `posteingang.card.authentizitaet.eingabe_buerger` — „Eingabe durch Bürger:in"
  - `posteingang.card.authentizitaet.eudi_versiegelt` — „EUDI-Wallet-versiegelt"
  - `posteingang.card.datenschutz_link` — „Welche Daten dieses Briefs wurden wo verarbeitet?"
  - `posteingang.disclaimer.opening`, `posteingang.disclaimer.no_legal_advice`, `posteingang.disclaimer.mock_data`, `posteingang.disclaimer.original_authoritative` — siehe §8 verbatim.
- **States**:
  - **loading**: 6 Skeleton-LetterCards (shimmer), `aria-busy="true"`.
  - **empty**: keine Briefe → `posteingang.list.empty_inbox` mit illustration-free Hint-Text.
  - **success**: Liste gerendert.
  - **error**: `api.getLetters` wirft → `<ErrorState>` mit Retry-Button (5%-Mock-Fehlerquote).
  - **filtered-empty**: Filter aktiv aber 0 Treffer → `posteingang.list.empty_filter` mit „Filter zurücksetzen"-Button.
- **Accessibility notes**:
  - Page-Content lebt im `<main id="main-content">` der App-Layout-Shell (`src/app/(app)/layout.tsx`); innerhalb des Inbox-Trees wird der Inbox-Bereich mit `<section aria-labelledby="posteingang-hero-title">` gerahmt. **Kein zweites `<main>`** auf der Seite — invalid HTML, Auflage a11y-tester 2026-05-09.
  - Sidebar als `<nav aria-label="Filter">`; Checkboxen mit `aria-controls="letter-list"`.
  - Tab-Switcher als `<div role="tablist">` mit `role="tab"` und `aria-selected`.
  - Liste als `<div id="letter-list" role="region" aria-live="polite" aria-relevant="additions removals" aria-label="…">` (Filter-Updates werden angekündigt). **Hinweis** (a11y-tester 2026-05-09): die ursprüngliche Variante `<ol role="list">` ist inkompatibel mit den per-Status-`<section>`-Gruppen darin (`aria-required-children`); die Letter-Items selbst leben in den `<ul>`-Children der `LetterListGroup`-Sections.
  - Aktenzeichen-Suche: `<input role="combobox" aria-expanded` mit Trefferliste als `role="listbox"`.
  - Frist-Countdown text-zugänglich (nicht nur Farbe — `<span class="sr-only">` für „Frist in {N} Tagen", farb-codierte Klassen sekundär).
  - Skip-Link „Zum Brief-Listen-Bereich springen" (Hauptnavigation überspringen).
  - Disclaimer-Banner immer fokus-erreichbar (kein `tabindex="-1"`).
  - RTL-Layout (AR): Filter-Sidebar wechselt auf rechte Seite; Tailwind `rtl:` logical properties.

### 4.2 Screen: Posteingang Tab „Nach Vorgang gruppieren" (sekundärer Tab)

- **Route**: `/(app)/posteingang?tab=nach-vorgang` (gleiche Route, Query-Param)
- **File**: derselbe `page.tsx` wie 4.1; Tab-State per `useSearchParams()` ausgelesen.
- **Server or client**: **Client** sub-tree (Tab-Switcher + Group-Rendering).
- **Layout** (ASCII, abweichend von 4.1):

  ```
  │  [ Chronologisch ] [ Nach Vorgang gruppieren ●]                       │
  │                                                                       │
  │  ┌─ Vorgang: Umzug 2026 (4 Briefe) ───────────────────┐              │
  │  │ ⬤ Bürgeramt Mitte — Meldebestätigung               │              │
  │  │ ⬤ Finanzamt — Mitteilung Zuständigkeit             │              │
  │  │ ⬤ Beitragsservice — Adressänderung                 │              │
  │  │ ⬤ Bundesdruckerei — PA-Aufkleber                   │              │
  │  └────────────────────────────────────────────────────┘              │
  │                                                                       │
  │  ┌─ Vorgang: Aufenthaltstitel-Verlängerung 2027 (1) ──┐              │
  │  │ ⬤ ABH Berlin LEA — Erinnerung Verlängerung         │              │
  │  └────────────────────────────────────────────────────┘              │
  │                                                                       │
  │  ┌─ Sonstige (3) ─────────────────────────────────────┐              │
  │  │ ⬤ Familienkasse — Nachweis-Aufforderung            │              │
  │  │  [+ Neuer Vorgang? Familienkasse 2026 anlegen?]    │              │
  │  │ ⬤ AOK Nordost — Beitragsfestsetzung                │              │
  │  │ ⬤ Beitragsservice — Festsetzung Rundfunk           │              │
  │  └────────────────────────────────────────────────────┘              │
  ```

- **Components used**:
  - `<LetterListHeader>` (mit Tab `nach-vorgang` aktiv).
  - `<VorgangsGruppe>` `<NEW>` from `src/components/posteingang/` — Header mit Vorgang-Titel + Brief-Count + Aufklapp-/Zuklapp-Toggle (`<details><summary>` für Progressive Enhancement); Body listet `<LetterCard>` (kompakt).
  - `<SonstigeGruppe>` — Variante von `<VorgangsGruppe>` für Briefe ohne `vorgang_id`; CTA „Neuer Vorgang anlegen" pro Brief.
- **Data fetched**: `api.getLetters()` + Client-seitig per `vorgang_id` gruppieren; bei Bedarf `api.getLetterThread(vorgangId)` für Sortier-Stabilität.
- **i18n keys introduced** (Erweiterung):
  - `posteingang.gruppe.titel_template` — „Vorgang: {titel} ({count})"
  - `posteingang.gruppe.sonstige_titel_template` — „Sonstige ({count})"
  - `posteingang.gruppe.aufklappen` — „Aufklappen"
  - `posteingang.gruppe.zuklappen` — „Zuklappen"
- **States**: wie 4.1 plus `gruppe_collapsed` (lokaler State).
- **Accessibility notes**: jede `<VorgangsGruppe>` als `<section aria-labelledby="gruppe-{vorgangId}-title">`; Toggle-Button mit `aria-expanded`. Tab-Wechsel ändert URL via `router.push` ohne Page-Reload — `aria-live`-Region kündigt Tab-Wechsel an.

### 4.3 Screen: LetterReader (Pre-Open + Post-Open mit Original-Toggle + Citation)

- **Route**: `/(app)/posteingang/[id]`
- **File**: `src/app/(app)/posteingang/[id]/page.tsx`
- **Server or client**: **RSC** für initial fetch + statisches Layout; **Client** sub-tree für Tab-Switcher (Mobile), Collapse-Toggles, „Frist im Kalender"-Action.
- **Layout Desktop** (ASCII, side-by-side):

  ```
  ┌──────────────────────────────────────────────────────────────────────────────┐
  │  ◀ Zurück zum Posteingang                                                    │
  ├──────────────────────────────────────────────────────────────────────────────┤
  │  [MOCK – Verwaltungsdemo, keine echten Daten]                                │
  ├──────────────────────────────────────────────────────────────────────────────┤
  │  Finanzamt Berlin Mitte/Tiergarten                       [Bund · Empfangen   │
  │  Bescheid für 2024 über Einkommensteuer …                 über Briefpost]    │
  │  Aktz: [MOCK] 11/123/45678  ·  Steuer-IdNr: [MOCK] 47 113 815 421            │
  │  Empfangen am 12.05.2026  ·  Vorgang ‚Steuer 2024'  ·  [Datenschutz-Cockpit] │
  ├──────────────────────────────────────────────┬───────────────────────────────┤
  │ ⓘ Zusammenfassung wird mit KI erstellt —     │  Originaltext (rechtsverbind- │
  │   bitte gleichen Sie wichtige Angaben mit    │  lich)                        │
  │   dem Originaltext ab.                       │                               │
  │ ⚠ Rechtsverbindlich ist der Originaltext.    │  [MOCK – Verwaltungsdemo]     │
  │   Bitte prüfen Sie wichtige Angaben.         │                               │
  │                                              │  Finanzamt Berlin             │
  │ Zusammenfassung (KI)                         │  Mitte/Tiergarten             │
  │ • Sie haben **1.247,00 €** zu zahlen.   [⌖] │  Postfach 31 09 50            │
  │ • Zahlungsfrist: **12.06.2026** (29 Tage)[⌖]│  10639 Berlin                 │
  │ • Einspruchsfrist: 1 Monat ab Bekannt-       │                               │
  │   gabe (spätestens 12.06.2026)         [⌖]   │  Sehr geehrte/r …             │
  │ • Säumniszuschlag bei Verspätung: 1 %        │                               │
  │   pro Monat (§ 240 AO)                 [⌖]   │  Sie haben noch 1.247,00 €    │
  │ • Aussetzung der Vollziehung möglich         │  zu zahlen. Bitte zahlen Sie  │
  │   (§ 361 AO) — Begriff erklärt unten   [⌖]   │  bis zum 12.06.2026 …         │
  │                                              │                               │
  │ Frist-Chips:                                 │  Gegen diesen Bescheid kann   │
  │ [Zahlung 29 Tage]  [Einspruch 29 Tage]       │  innerhalb eines Monats nach  │
  │                                              │  Bekanntgabe Einspruch ein-   │
  │ ─── Was kann ich tun? ───                    │  gelegt werden …              │
  │ Mögliche Handlungen (informativ, keine       │                               │
  │ Rechtsberatung):                             │  Mit freundlichen Grüßen      │
  │  • Zahlung leisten                           │  Az. [MOCK] 11/123/45678      │
  │  • Einspruch einlegen                        │                               │
  │  • Aussetzung der Vollziehung beantragen     │                               │
  │  ⓘ posteingang.disclaimer.no_legal_advice    │                               │
  │                                              │                               │
  │ [ Frist in Kalender (.ics) ]                 │                               │
  │ [ Originalbrief anzeigen (PDF) ]             │                               │
  │ [ Brief speichern (Dokumenten-Vault) ]       │                               │
  │ [ Diesen Brief als gelesen markieren ]       │                               │
  ├──────────────────────────────────────────────┴───────────────────────────────┤
  │  ┌─ Hinweis zum Prototyp ────────────────────────────────────────────────┐  │
  │  │  posteingang.disclaimer.opening                                        │  │
  │  └────────────────────────────────────────────────────────────────────────┘  │
  └──────────────────────────────────────────────────────────────────────────────┘
  ```

  Legend: `[⌖]` = `<CitationFootnote>`-Marker; click → öffnet Tooltip/Popover mit dem Original-Satz.

- **Layout Mobile** (Tab-Switcher; Default-Tab = Originaltext):

  ```
  ┌──────────────────────────────────┐
  │  ◀ Zurück                         │
  │  [MOCK – Verwaltungsdemo]         │
  │  Finanzamt Berlin Mitte           │
  │  Bescheid 2024                    │
  ├──────────────────────────────────┤
  │  [ Originaltext ●][ Zusammenfassung ] │
  ├──────────────────────────────────┤
  │  ⚠ Rechtsverbindlich ist der      │
  │    Originaltext.                  │
  │                                   │
  │  Sehr geehrte/r …                 │
  │  Sie haben noch 1.247,00 € zu     │
  │  zahlen. Bitte zahlen Sie bis     │
  │  zum 12.06.2026 …                 │
  │                                   │
  │  [Frist in Kalender]              │
  │  [Brief als gelesen markieren]    │
  └──────────────────────────────────┘
  ```

- **Components used**:
  - `<LetterReaderHeader>` `<NEW>` from `src/components/posteingang/` — Behörden-Name, Betreff, Aktenzeichen-Liste (primär + weitere als Detail), Empfangsdatum, Vorgang-Tag, Authentizitäts-Badge, Datenschutz-Cockpit-Link. Watermark-Banner `[MOCK]` immer oben.
  - `<MockWatermarkBanner>` `<NEW>` from `src/components/shared/` — schmaler dauerhafter Banner „[MOCK – Verwaltungsdemo, keine echten Daten]" (für Letters und Documents wiederverwendbar).
  - `<LetterReaderLayout>` `<NEW>` from `src/components/posteingang/` — Container mit Desktop side-by-side Grid und Mobile Tabs (`useMediaQuery` für Breakpoint; default `originaltext` auf Mobile).
  - `<AISummaryBlock>` `<NEW>` from `src/components/posteingang/` — links/oben; rendert Bullet-Liste aus `Letter.ai_summary_post_open[].text` mit `<CitationFootnote>` pro Bullet; oben enthält 2 Inline-Disclaimer (Skeleton-Hint + roter `original_authoritative`-Banner). `aria-describedby` der zugehörigen `<OriginaltextBlock>`-id.
  - `<OriginaltextBlock>` `<NEW>` from `src/components/posteingang/` — rechts/Tab; rendert `Letter.body_de` als pre-formatted text mit Briefkopf-Strukturanker (`<address>`, Anrede, Body, Schlussformel, Az). **Immer DE, auch bei AR-RTL-UI** (`dir="ltr"` lokal).
  - `<CitationFootnote>` `<NEW>` from `src/components/posteingang/` — Inline-Marker `[⌖N]`; auf Click/Hover öffnet Popover mit Original-Zitat-Satz aus `LetterCitation.original_zitat` und Highlight-Anker im `<OriginaltextBlock>` (Scrollen + Scrub-Highlight 1500 ms).
  - `<FristChip>` (extend existing `<FristCountdown>`) — bei Mehrfach-Fristen werden mehrere Chips nebeneinander gerendert (Zahlung / Einspruch / Sonstige), jeder mit `chip_typ`-Label.
  - `<FristDetailModal>` (already exists) — extend mit Citation-Pflicht: zeigt das Original-Zitat oben + Frist-Datum + Kalender-Export-Button (.ics download).
  - `<NeuerVorgangAusBriefModal>` `<NEW>` from `src/components/posteingang/` — Dialog (shadcn `<Dialog>`), Bürger:in bestätigt Vorgangs-Erstellung aus Brief; Ruft `api.erstelleVorgangAusBrief(letterId, vorgangsTyp)`.
  - `<WasKannIchTunFooter>` `<NEW>` from `src/components/posteingang/` — informative Liste pro Brief-Archetyp aus Domain-Katalog (Steuerbescheid → Zahlung leisten / Einspruch einlegen / Aussetzung der Vollziehung beantragen). Direkt darunter Disclaimer `posteingang.disclaimer.no_legal_advice`. **Keine Antwort-Generator-CTA in V1.** Slot bleibt frei für V2-„Antwort vorschlagen".
  - `<NormTooltip>` `<NEW>` from `src/components/shared/` — wraps a Norm-Kürzel (z. B. „§ 240 AO", „§ 41 Abs. 2 VwVfG") und öffnet Popover mit kurzer Erklärung + externem Link (`gesetze-im-internet.de` URLs aus §11 Sources-Liste). Wird auch von Umzug-Spec `<RechtsgrundlageTag>` semantisch ergänzt — Unterschied: `<NormTooltip>` ist für **inline** Norm-Erwähnungen (z. B. in AI-Bullets oder Disclaimer-Texten) gedacht; `<RechtsgrundlageTag>` für Block-Header.
  - `<DatenschutzCockpitLink>` (existiert) — pro-Brief-Variante.
  - `<PrototypeDisclaimer>` (existiert) — `posteingang.disclaimer.opening` als Footer.
- **Data fetched**:
  - RSC: `api.getLetter(id)` + `api.getBehoerde(letter.absender_behoerde_id)` parallel.
  - Side-effect on mount: `api.markiereLetterGelesen(id)` (App-intern, keine Lesebestätigung-Floskel; siehe i18n-Key `posteingang.card.markiere_gelesen`).
  - Wenn `letter.ai_summary_post_open` fehlt: lazy-trigger `api.extrahiereAktion(letterId)` in einem Suspense-Boundary mit Skeleton-Bullets + Inline-Disclaimer „Zusammenfassung wird mit KI erstellt".
- **i18n keys introduced**:
  - `posteingang.reader.zurueck` — „Zurück zum Posteingang"
  - `posteingang.reader.empfangen_am_template` — „Empfangen am {datum}"
  - `posteingang.reader.aktenzeichen_primaer_label`, `posteingang.reader.aktenzeichen_weitere_label`
  - `posteingang.reader.tab_originaltext`, `posteingang.reader.tab_zusammenfassung`
  - `posteingang.reader.summary_heading` — „Zusammenfassung (KI)"
  - `posteingang.reader.summary_skeleton_hint` — siehe §8 verbatim (Inline-Disclaimer Skeleton).
  - `posteingang.reader.summary_authoritative_banner` — siehe §8 verbatim (`original_authoritative`).
  - `posteingang.reader.frist_chip_zahlung_template` — „Zahlung {tage_template}"
  - `posteingang.reader.frist_chip_einspruch_template` — „Einspruch {tage_template}"
  - `posteingang.reader.frist_chip_sonstige_template` — „{label} {tage_template}"
  - `posteingang.reader.frist_chip_keine` — „Keine Frist"
  - `posteingang.reader.frist_chip_abgelaufen_template` — „Frist abgelaufen am {datum}"
  - `posteingang.reader.was_kann_ich_tun.heading` — „Was kann ich tun?"
  - `posteingang.reader.was_kann_ich_tun.helper` — „Mögliche Handlungen (informativ, keine Rechtsberatung):"
  - `posteingang.reader.actions.kalender` — „Frist in Kalender (.ics)"
  - `posteingang.reader.actions.original_pdf` — „Originalbrief anzeigen (PDF)"
  - `posteingang.reader.actions.speichern` — „Brief speichern (Dokumenten-Vault)"
  - `posteingang.reader.actions.markiere_gelesen` — „Diesen Brief als gelesen markieren"
  - `posteingang.reader.citation.popover_title` — „Originalformulierung"
  - `posteingang.reader.citation.scroll_to_original` — „Im Originaltext anzeigen"
  - `posteingang.reader.citation.mismatch_warning` — siehe §8 verbatim (Inline-Disclaimer Mismatch).
  - `posteingang.reader.skip_link.zur_zusammenfassung` — „Zur Zusammenfassung springen"
  - `posteingang.reader.skip_link.zum_original` — „Zum Originaltext springen"
  - `posteingang.reader.frist_modal.title` — „Frist-Detail"
  - `posteingang.reader.frist_modal.zitat_label` — „Originalformulierung im Brief:"
  - `posteingang.reader.frist_modal.kalender_cta` — „In Kalender eintragen"
  - `posteingang.reader.frist_modal.disclaimer` — siehe §8 verbatim (Inline-Disclaimer Frist-Kalender).
  - `posteingang.reader.neuer_vorgang.title_template` — „Neuen Vorgang aus diesem Brief anlegen?"
  - `posteingang.reader.neuer_vorgang.body_template` — „Wir schlagen den Vorgangstyp ‚{typ}' vor. Sie können den Titel anpassen."
  - `posteingang.reader.neuer_vorgang.cta_anlegen`, `posteingang.reader.neuer_vorgang.cta_abbrechen`
  - Pro Brief-Archetyp ein Set von „Was kann ich tun?"-Optionen (siehe §8).
- **States**:
  - **loading**: Skeleton mit Header + 6 Bullet-Skeletons + Originaltext-Skeleton.
  - **empty**: id ungültig → 404-Page mit Link zurück.
  - **success**: voll gerendert.
  - **error**: `api.getLetter` wirft → Error-Boundary mit Retry.
  - **summary-loading**: Post-Open-Summary noch nicht extrahiert → Skeleton-Bullets + Inline-Disclaimer; nach `api.extrahiereAktion` resolved → bullets fade-in (framer-motion, `prefers-reduced-motion` respektiert).
  - **summary-error**: AI-Aufruf fehlgeschlagen → Hinweis „Zusammenfassung temporär nicht verfügbar — Originaltext rechts ist maßgeblich" + Retry.
  - **frist-mismatch**: Citation-Pattern erkennt Mismatch zwischen LLM-Frist und Regex → Frist-Chip rot mit Inline-Hinweis `posteingang.reader.citation.mismatch_warning`.
  - **frist-abgelaufen**: Frist-Datum < heute → Chip rot, AI-Summary darf nicht „Sie können noch handeln" enthalten (System-Prompt-Constraint, siehe §7); informative Wiedereinsetzungs-Möglichkeiten erlaubt.
- **Accessibility notes**:
  - Skip-Links **oben** (`skip_link.zur_zusammenfassung`, `skip_link.zum_original`) — vor dem Content.
  - `<AISummaryBlock id="summary">` mit `aria-labelledby="summary-heading"`; **`aria-describedby`** verweist auf `<OriginaltextBlock id="original">` — Erweiterung, nicht Ersatz.
  - Citation-Footnote-Marker als `<button aria-haspopup="dialog" aria-controls="citation-popover-{n}">[⌖{n}]</button>`; Popover als `role="dialog" aria-modal="false"` mit Fokus-Trap.
  - Frist-Chip text-zugänglich via `<span class="sr-only">` „Zahlungsfrist {datum}, {N} Tage verbleibend" (kein Farbe-only).
  - Tab-Switcher (Mobile) als `role="tablist"`/`role="tab"`/`role="tabpanel"` mit `aria-selected`; **`originaltext`-Tab hat `aria-selected="true"` initial** (Default Mobile).
  - `<OriginaltextBlock dir="ltr" lang="de">` — auch in AR-RTL-UI immer LTR-DE.
  - `aria-live="polite"` auf Summary-Container (Lazy-Load wird angekündigt).
  - Disclaimer-Banner immer im Tab-Stop, nicht ausschließbar.

### 4.4 Modals

#### 4.4.1 `<FristDetailModal>` (extend existing)

Existierende Komponente aus Umzug-Spec. **Erweiterung**:
- Header: Frist-Typ (Zahlung / Einspruch / Sonstige) + Datum.
- Body: **Originalzitat** aus dem Brief (`LetterCitation.original_zitat`) als blockquote. **Pflicht** — kein Modal ohne Zitat.
- Frist-Datum prominent + Countdown.
- CTA „In Kalender eintragen" → triggert `.ics`-Download (`generateIcs(letter, frist)` Utility in `src/lib/utils/ics.ts`).
- Inline-Disclaimer `posteingang.reader.frist_modal.disclaimer`.
- **Bußgeld-Wortlaut bleibt isoliert** auf `<FristDetailModal>` mit `data-bussgeld-context` (siehe Umzug-Spec, gleiche Audit-Regel).

#### 4.4.2 `<NeuerVorgangAusBriefModal>` `<NEW>`

- Trigger: Klick auf VorgangsBuendelTag bei Initial-Brief ohne `vorgang_id`.
- Body: vorgeschlagener Vorgangs-Typ (aus `Letter.archetype` ableitbar — z. B. `steuerbescheid` → Vorgang-Typ `steuer-jahr`); Titel-Eingabefeld vorausgefüllt.
- CTA „Vorgang anlegen" → ruft `api.erstelleVorgangAusBrief(letterId, vorgangsTyp)`; nach Erfolg: Toast + URL ändert auf `/(app)/vorgaenge/{neueId}`.
- CTA „Abbrechen" → schließt Modal.
- ARIA: `role="dialog" aria-modal="true"` + Fokus-Trap.

## 5. Component inventory

> Convention: `<NEW>` = anzulegen durch frontend-coder; sonst wiederverwenden.

| Komponente | Pfad | Zweck | Status |
|---|---|---|---|
| `<PosteingangHero>` | `src/components/posteingang/PosteingangHero.tsx` | H1 + Speculative-Design-Footer-Banner | `<NEW>` |
| `<LetterListHeader>` | `src/components/posteingang/LetterListHeader.tsx` | Tab-Switcher Chronologisch / Nach Vorgang + Suchfeld | `<NEW>` |
| `<AktenzeichenSearch>` | `src/components/posteingang/AktenzeichenSearch.tsx` | Debounced Suche (250 ms) | `<NEW>` |
| `<BehoerdenKategorieFilterSidebar>` | `src/components/posteingang/BehoerdenKategorieFilterSidebar.tsx` | Sidebar mit Kategorie- + Status-Filtern | `<NEW>` |
| `<LetterListGroup>` | `src/components/posteingang/LetterListGroup.tsx` | Status-Gruppen-Header mit Count | `<NEW>` |
| `<LetterCard>` | `src/components/posteingang/LetterCard.tsx` | Einzel-Brief-Card; **REPLACE** existing minimal version | `<REPLACE>` |
| `<VorgangsGruppe>` | `src/components/posteingang/VorgangsGruppe.tsx` | Tab „Nach Vorgang" Gruppen-Container | `<NEW>` |
| `<SonstigeGruppe>` | `src/components/posteingang/SonstigeGruppe.tsx` | Variante für Briefe ohne `vorgang_id` | `<NEW>` |
| `<VorgangsBuendelTag>` | `src/components/posteingang/VorgangsBuendelTag.tsx` | Tag „Gehört zu Vorgang ‚…'" oder „Neuer Vorgang? …" | `<NEW>` |
| `<AuthentizitaetsBadge>` | `src/components/posteingang/AuthentizitaetsBadge.tsx` | 3-Stufen-Badge | `<NEW>` |
| `<LetterReaderHeader>` | `src/components/posteingang/LetterReaderHeader.tsx` | Header des Reader-Screens | `<NEW>` |
| `<LetterReaderLayout>` | `src/components/posteingang/LetterReaderLayout.tsx` | Desktop side-by-side / Mobile Tabs | `<NEW>` |
| `<AISummaryBlock>` | `src/components/posteingang/AISummaryBlock.tsx` | Bullet-Liste mit Citation pro Bullet | `<NEW>` |
| `<OriginaltextBlock>` | `src/components/posteingang/OriginaltextBlock.tsx` | DE-Originaltext mit Anchor-Targets | `<NEW>` |
| `<CitationFootnote>` | `src/components/posteingang/CitationFootnote.tsx` | Marker `[⌖N]` + Popover + Scroll-to-Original | `<NEW>` |
| `<FristChip>` | (extend) `src/components/shared/FristCountdown.tsx` | Mehrfach-Chip-Variante; `chip_typ`-Prop | `<EXTEND>` |
| `<WasKannIchTunFooter>` | `src/components/posteingang/WasKannIchTunFooter.tsx` | Informative Handlungs-Liste | `<NEW>` |
| `<NeuerVorgangAusBriefModal>` | `src/components/posteingang/NeuerVorgangAusBriefModal.tsx` | Modal Vorgangs-Erstellung | `<NEW>` |
| `<MockWatermarkBanner>` | `src/components/shared/MockWatermarkBanner.tsx` | „[MOCK – Verwaltungsdemo …]"-Banner | `<NEW>` |
| `<NormTooltip>` | `src/components/shared/NormTooltip.tsx` | Inline-Norm-Tooltip mit Link auf gesetze-im-internet.de | `<NEW>` |
| `<DatenschutzCockpitLink>` | `src/components/shared/DatenschutzCockpitLink.tsx` | Per-Brief-Variante (Query `?letter={id}`) | `<EXTEND>` |
| `<FristDetailModal>` | `src/components/shared/FristDetailModal.tsx` | Original-Zitat als Pflicht; .ics-Export | `<EXTEND>` |
| `<FristCountdown>` | `src/components/shared/FristCountdown.tsx` | Grund-Countdown | `reuse` |
| `<PrototypeDisclaimer>` | `src/components/shared/PrototypeDisclaimer.tsx` | Wortlaut-Erweiterung um `posteingang.disclaimer.*` | `<EXTEND>` |
| `<RechtsgrundlageTag>` | `src/components/shared/RechtsgrundlageTag.tsx` | Block-Header-Norm-Tag | `reuse` |

**Behörden-Logos** (Verifier-Auflage #1): in `public/behoerden-logos/` ausschließlich **abstrakte SVGs** in einer einheitlichen 3-Glyphen-Symbol-Familie pro Kategorie:
- `bund.svg` — generisches geometrisches Glyph für Bundes-Stellen
- `land.svg` — generisches geometrisches Glyph für Landes-Stellen
- `kommune.svg` — generisches geometrisches Glyph für kommunale Stellen
- `selbstverwaltung.svg` — Glyph für Krankenkassen / IHK / DGUV / DRV
- `privatrechtl-behoerdenartig.svg` — Glyph für private Krankenversicherer
- **Verboten**: Bundesadler, Polizei-Stern, Finanzamt-Siegel, Wappen, echte Logos. `<BehoerdenBadge>` darf nur diese 5 SVGs laden.

## 6. Mock-data shapes & mock-backend additions

### 6.1 New / extended types

```ts
// src/types/letter.ts (EXTEND existing — additive only)

/** Verfügbare Authentizitäts-Stufen einer LetterCard (Verifier-Auflage #3). */
export type LetterAuthChannel =
  | 'briefpost'             // Default für 5/6 Archetypen
  | 'mein-elster'           // Steuerbescheid (mit ELSTER-Zustimmung)
  | 'zbp-bundid'            // ZBP/BundID-Postfach (mit Einwilligung)
  | 'krankenkassen-portal'  // Krankenkassen-eigenes Postfach
  | 'eingabe-buerger'       // V2: Bürger:in-Upload — V1 not used
  | 'eudi-versiegelt';      // post-2027 Konvention — V1 not functional

/** Brief-Archetyp aus posteingang.md §6 Brief-Archetypen. */
export type LetterArchetype =
  | 'steuerbescheid'         // Archetyp 1 (Finanzamt)
  | 'krankenkasse-beitrag'   // Archetyp 2
  | 'beitragsservice-mahnung' // Archetyp 3
  | 'abh-verlaengerung'      // Archetyp 4
  | 'familienkasse-nachweis' // Archetyp 5
  | 'buergeramt-meldung'     // Archetyp 6
  | 'ihk-beitrag'            // Persona-Erweiterung Mehmet
  | 'berufsgenossenschaft-beitrag' // Persona-Erweiterung Mehmet
  | 'standesamt-urkunde'     // Persona-Erweiterung Schmidt (Geburtsurkunde)
  | 'sonstiges';             // Fallback

/** Frist-Typ — ein Brief kann mehrere Fristen haben (Edge case #1). */
export type LetterFristTyp =
  | 'zahlung'
  | 'einspruch'
  | 'widerspruch'
  | 'klage'
  | 'nachweis'
  | 'antragstellung'
  | 'sonstige';

export interface LetterFrist {
  typ: LetterFristTyp;
  /** ISO-Datum YYYY-MM-DD. */
  datum: string;
  /**
   * Original-Zitat-Satz aus body_de, der diese Frist belegt (Citation-Pattern).
   * Pflicht — ohne Zitat keine Frist (Hand-off „Bitte selbst prüfen").
   */
  original_zitat: string;
  /**
   * War die LLM-Datums-Extraktion deckungsgleich mit dem Regex-Match
   * (`\d{1,2}\.\d{1,2}\.\d{4}`)? Mismatch → UI zeigt Warnung.
   */
  citation_match: boolean;
  /** Optional: Norm-Kürzel der Frist-Rechtsgrundlage (z. B. „§ 70 VwGO"). */
  rechtsgrundlage?: string;
}

/** Citation-Eintrag pro AI-Bullet (Post-Open-Summary). */
export interface LetterCitation {
  /** Bullet-Index, 0-basiert. */
  bullet_index: number;
  /** Original-Satz aus body_de. */
  original_zitat: string;
  /**
   * Optional: Char-Offset-Range im body_de für Highlight-Anker
   * (start, end). Wenn nicht ermittelbar → undefined; UI fällt auf
   * Substring-Suche zurück.
   */
  body_offset?: { start: number; end: number };
}

/** Post-Open-Summary mit Bullets + Citations. */
export interface LetterAiSummaryPostOpen {
  /** 5–8 Bullets, ein Satz pro Bullet, max 200 Zeichen. */
  bullets: Array<{
    /** Bullet-Text (UI-Sprache; AI-tool generiert pro Locale). */
    text: string;
  }>;
  /** Pro Bullet eine Citation. */
  citations: LetterCitation[];
  /** ISO-Timestamp der KI-Generierung. */
  generated_at: string;
  /** Modellbezeichnung (z. B. 'claude-haiku-4-5-20251001'). */
  model: string;
}

/** Pre-Open-Summary — strikt strukturell, 1 Zeile, 80 Zeichen. */
export interface LetterAiSummaryPreOpen {
  /** Format: „[Behörde] · [Brieftyp] · [Frist-Suffix]". */
  text: string;
  /** Generated_at iso. */
  generated_at: string;
}

/**
 * Erweiterung des bestehenden Letter-Interfaces. Bestehende Felder
 * (id, absender_behoerde_id, empfaenger_persona_id, aktenzeichen, betreff,
 * body_de, ai_summary, required_action, status, empfangen_am, vorgang_id)
 * bleiben unverändert. Neu hinzu:
 */
export interface LetterPosteingangFields {
  /** Brief-Archetyp aus posteingang.md. */
  archetype: LetterArchetype;
  /** Authentizitäts-Kanal (V1: 'briefpost' für 5/6 Archetypen + 'mein-elster' Variante). */
  auth_channel: LetterAuthChannel;
  /**
   * Mehrfach-Aktenzeichen (Edge case #4). Erstes Element = primär.
   * Bei Steuerbescheid z. B.: ['[MOCK] 11/123/45678', '[MOCK] 47 113 815 421'].
   */
  aktenzeichen_weitere?: string[];
  /** Mehrere Fristen möglich (Edge case #1). Leeres Array → keine Frist. */
  fristen: LetterFrist[];
  /** Strikt strukturelle Pre-Open-Zeile. */
  ai_summary_pre_open?: LetterAiSummaryPreOpen;
  /** Lazy-loaded Post-Open-Bullets + Citations. */
  ai_summary_post_open?: LetterAiSummaryPostOpen;
  /**
   * IDs der Was-kann-ich-tun-Optionen aus dem Archetyp-Katalog (siehe §8).
   * z. B. ['steuerbescheid.zahlung', 'steuerbescheid.einspruch', 'steuerbescheid.aussetzung'].
   */
  was_kann_ich_tun_options?: string[];
}

// Letter-Interface wird per Intersection erweitert:
export type Letter = /* existing fields */ & LetterPosteingangFields;

// LetterFilter EXTEND
export interface LetterFilter {
  unread?: boolean;
  vorgang_id?: string;
  /** Sucht in aktenzeichen + aktenzeichen_weitere; case-insensitive. */
  aktenzeichen_query?: string;     // NEW
  /** Filter nach Behörden-Kategorie (Bund/Land/Kommunal/Selbstverwaltung/Privatrechtl-aber-behördenartig). */
  behoerden_kategorie?: BehoerdeKategorie;  // NEW
  /** Filter nach Brief-Archetyp. */
  archetype?: LetterArchetype;     // NEW
  /** Status-Filter (mehrfach möglich). */
  status?: Array<LetterStatus | 'frist_abgelaufen' | 'frist_unter_7d' | 'frist_ueber_7d'>;  // NEW
}
```

> **`BehoerdeKategorie` Erweiterung**: bestehender Type erlaubt `bund | land | kommune | sozialversicherung | privat`. Spec verwendet die Verifier-Taxonomie „Bund / Land / Kommunal / Selbstverwaltung / Privatrechtl-aber-behördenartig" — Mapping: `bund→bund`, `land→land`, `kommune→kommunal`, `sozialversicherung→selbstverwaltung`, `privat→privatrechtl-behoerdenartig`. mock-backend-coder benennt die Enum-Werte wahlweise um (Migration in allen `behoerden.json`-Einträgen) **oder** lässt sie und mappt nur in der UI — empfohlen: **lassen** (additive change), Mapping in `<BehoerdenKategorieFilterSidebar>`.

### 6.2 New / extended mock-backend API methods

`src/lib/mock-backend/api.ts` — die folgenden Methoden ergänzen, ohne bestehende zu brechen:

```ts
// READ
getLetters(filter?: LetterFilter): Promise<Letter[]>;            // EXTEND filter
extrahiereAktion(letterId: string): Promise<{
  ai_summary_post_open: LetterAiSummaryPostOpen;
  fristen: LetterFrist[];
  was_kann_ich_tun_options: string[];
}>;                                                              // NEW
getLetterThread(vorgangId: string): Promise<Letter[]>;           // NEW (alias for getLetters({ vorgang_id }) sortiert chronologisch)
searchLettersByAktenzeichen(query: string): Promise<Letter[]>;   // NEW
getLettersByBehoerdenKategorie(
  kategorie: BehoerdeKategorie
): Promise<Letter[]>;                                            // NEW

// WRITE
markiereLetterGelesen(id: string): Promise<void>;                // EXISTS — verbatim wiederverwenden
erstelleVorgangAusBrief(
  letterId: string,
  vorgangsTyp: 'steuer-jahr' | 'familienkasse' | 'aufenthaltstitel-verlaengerung' | 'sonstige'
): Promise<{ vorgangId: string }>;                               // NEW
```

**Implementierungs-Notizen für mock-backend-coder**:
- `extrahiereAktion(letterId)` — V1-Demo-Variante: liest pre-baked `LetterAiSummaryPostOpen` aus `letters.json` (siehe §6.4). **Kein** echter Anthropic-Aufruf vom Mock-Backend; der echte Aufruf läuft über `/api/assistant`-SSE und ist Tool-getrieben (siehe §7). Diese Methode liefert die *im Demo-Seed gespeicherte* Summary mit **simulierter Latenz** 1.500–3.500 ms (LLM-feel). Wenn `letter.ai_summary_post_open` bereits gesetzt ist, gibt sie das Cache zurück mit ~200 ms; sonst lädt sie aus einer flachen Map `letterId → LetterAiSummaryPostOpen` aus `src/data/letter-summaries.json` `<NEW>`.
- `searchLettersByAktenzeichen(query)` — case-insensitive Substring-Match auf `aktenzeichen` + `aktenzeichen_weitere`; min 3 Zeichen; limit 20.
- `getLettersByBehoerdenKategorie(kategorie)` — joinet Letters mit Behörden-Tabelle; sortiert chronologisch desc.
- `erstelleVorgangAusBrief(letterId, vorgangsTyp)` — legt einen `Vorgang` an, setzt `Letter.vorgang_id` auf neue ID, gibt `{ vorgangId }` zurück. Vorgangs-Typ aus Mapping:
  - `steuerbescheid` → `steuer-jahr`
  - `familienkasse-nachweis` → `familienkasse`
  - `abh-verlaengerung` → `aufenthaltstitel-verlaengerung`
  - sonst → `sonstige`
- **Aktenzeichen-Format-Validierung** (Verifier-Auflage #5): mock-backend-coder schreibt einen Test (`tests/unit/aktenzeichen-format.test.ts`), der jeden Letter im Seed gegen das Format-Lookup aus `posteingang.md` validiert. **Mismatch → Test rot, nicht UI-Warnung.**

### 6.3 Persistence keys (localStorage)

Keine neuen Top-Level-Keys nötig — alle Posteingang-Daten passen in bestehende Keys aus `architecture.md`:
- `govtech-de:v1:letters` — extended pro Letter mit `archetype`, `auth_channel`, `fristen[]`, `ai_summary_pre_open`, `ai_summary_post_open`, `aktenzeichen_weitere`, `was_kann_ich_tun_options` (alle optional, Migration auf älteren Seeds: defaults, kein Schema-Mismatch).
- `govtech-de:v1:vorgaenge` — extended (kein Schema-Change; `erstelleVorgangAusBrief` schreibt einen neuen Vorgang).
- **NEU**: `govtech-de:v1:letter-activity-log` — pro Brief Activity-Log-Einträge (Verifier-Auflage #9, Norwegen-Altinn-Pattern). Schema:
  ```ts
  type LetterActivityLog = Record<string, Array<{
    timestamp: string;            // ISO
    aktion: 'opened_in_app' | 'summary_generated' | 'frist_added_to_calendar' | 'marked_read';
    rechtsgrundlage?: string;     // z. B. 'DSGVO Art. 6 lit. a Einwilligung'
    note?: string;                // z. B. 'Zusammenfassung erstellt mit Anthropic Claude'
  }>>;
  ```
  Sichtbar in `/datenschutz?letter={id}`. **Klar als reine App-Aktivität markiert** — niemals „Lesebestätigung" oder „Read-Receipt zur Behörde".

### 6.4 Seed data extension — **EXTEND, NICHT REPLACE**

> Spec-Anweisung an mock-backend-coder: die existierenden 8 Anna-Briefe in `src/data/letters.json` (Steuerbescheid, AOK Zuzahlungs, Beitragsservice Festsetzung, ABH Erinnerung, Familienkasse Bewilligung, Bürgeramt Erstanmeldung, Bundesdruckerei PA-Aufkleber, AOK Mitgliedsbescheinigung) **bleiben erhalten**. Sie werden nur um die neuen optionalen Felder (`archetype`, `auth_channel`, `fristen[]`, `ai_summary_pre_open`, `ai_summary_post_open`, `aktenzeichen_weitere`, `was_kann_ich_tun_options`) angereichert (Migration in einer einmaligen seed-Aktualisierung). Bei Überschneidung mit dem 6-Archetypen-Set (z. B. `letter-fa-steuerbescheid-2025` ist bereits Archetyp 1) → **dedupliziert**: einen kanonischen Brief pro Archetyp + Persona behalten, KEINE Duplikate erzeugen.

#### 6.4.1 Persona-Subsets (Verifier-Auflage #11)

| Persona | Existierende Briefe (anreichern) | Hinzuzufügen | Brief-Count nach Extension |
|---|---|---|---|
| **Anna Petrov** (Migrant, Blue Card, 1 Kind) | 8 (siehe oben) | — (alle 5 Anna-Slots aus Verifier sind bereits vorhanden, da existierende Briefe Archetyp 1, 2, 3, 4, 5, 6 abdecken) | 8 |
| **Familie Schmidt** (Hamburg, 2. Kind erwartet) | 0 | 5 neu: Standesamt-Geburtsurkunde (Erweiterung), Familienkasse-Nachweis (5), Krankenkasse-Beitrag (2), Steuerbescheid (1), Beitragsservice (3) | 5 |
| **Mehmet Yıldız** (Köln, Selbstständig) | 0 | 5 neu: Steuerbescheid Selbstständig (1), IHK-Beitrag (Erweiterung), Berufsgenossenschaft-Beitrag (Erweiterung), Krankenkasse freiwillig (2), Beitragsservice (3) | 5 |

**Total nach Extension**: 18 Briefe (8 Anna + 5 Schmidt + 5 Mehmet). 2-3 Persona-spezifische Erweiterungen erlaubt; nicht mehr.

#### 6.4.2 Vollständige Aktenzeichen + Briefkopf-Phrasen pro neuem Brief

> Aktenzeichen-Formate **verbatim** aus `docs/domain/posteingang.md` Tabelle „Aktenzeichen-Formate (verifiziert)". Briefkopf-Phrasen aus posteingang.md §"Briefkopf-Standardphrasen pro Behördentyp". Beträge synthetisch.

**Schmidt-1 — Standesamt Hamburg, Geburtsurkunde**
- `id`: `letter-schmidt-standesamt-geburt`
- `archetype`: `standesamt-urkunde`
- `auth_channel`: `briefpost`
- Absender-Behörde: Standesamt Hamburg-Eimsbüttel
- Aktenzeichen: `[MOCK] HH-G-04711/2026`
- Betreff: „Geburtsurkunde Ihrer Tochter [MOCK] Mia Schmidt — Az [MOCK] HH-G-04711/2026"
- Body-Auszug: „[MOCK – Verwaltungsdemo, keine echten Daten]\n\nStandesamt Hamburg-Eimsbüttel, Grindelberg 66, 20144 Hamburg\n\nSehr geehrte Familie Schmidt, in oben genannter Angelegenheit übersenden wir Ihnen die Geburtsurkunde Ihrer Tochter Mia Schmidt, geboren am 02.05.2026 in Hamburg. Die Urkunde gilt als Nachweis für die Krankenkasse, die Familienkasse sowie die Steuer-IdNr.-Vergabe nach § 139b AO. Mit freundlichen Grüßen, Standesamt Hamburg-Eimsbüttel, Az. [MOCK] HH-G-04711/2026"
- Fristen: keine
- Pre-Open: „Standesamt Hamburg-Eimsbüttel · Geburtsurkunde · Keine Frist"
- Status: `ungelesen`

**Schmidt-2 — Familienkasse, Nachweis-Aufforderung Schulbescheinigung**
- `id`: `letter-schmidt-familienkasse-nachweis`
- `archetype`: `familienkasse-nachweis`
- `auth_channel`: `briefpost`
- Aktenzeichen: `[MOCK] 234FK892017`
- Betreff: „Ihr Kindergeld — Kindergeldnummer [MOCK] 234FK892017"
- Body: „… Zur weiteren Prüfung Ihres Kindergeldanspruchs für Felix Schmidt bitten wir um Vorlage einer aktuellen Schulbescheinigung für das Schuljahr 2026/27. Bitte reichen Sie die Unterlagen bis zum 15.06.2026 ein. … Sollten Sie nicht innerhalb der Frist antworten, können wir Ihren Anspruch nach § 67 Abs. 1 EStG i.V.m. § 68 Abs. 1 EStG ggf. ab dem 01.07.2026 vorläufig einstellen."
- Fristen: `[{ typ: 'nachweis', datum: '2026-06-15', original_zitat: 'Bitte reichen Sie die Unterlagen bis zum 15.06.2026 ein.', citation_match: true, rechtsgrundlage: '§ 68 EStG' }]`

**Schmidt-3 — Krankenkasse Beitragsfestsetzung**
- `id`: `letter-schmidt-krankenkasse-beitrag`
- `archetype`: `krankenkasse-beitrag`
- Aktenzeichen: `[MOCK] M845192036`
- Absender: Techniker Krankenkasse, Bramfelder Straße 140, 22305 Hamburg
- Betreff: „Festsetzung des Beitrags zur Kranken- und Pflegeversicherung — Versicherungsnummer [MOCK] M845192036"
- Fristen: `[{ typ: 'widerspruch', datum: '2026-06-15', original_zitat: 'Gegen diesen Bescheid kann innerhalb eines Monats nach Bekanntgabe Widerspruch erhoben werden.', citation_match: true, rechtsgrundlage: '§ 84 SGG' }]`

**Schmidt-4 — Finanzamt Hamburg Steuerbescheid 2024**
- `id`: `letter-schmidt-fa-steuerbescheid-2024`
- `archetype`: `steuerbescheid`
- Aktenzeichen primär: `[MOCK] 22/345/12345` (Hamburg-Format)
- Aktenzeichen-weitere: `['[MOCK] 86 295 102 749']` (Steuer-IdNr.)
- Absender: Finanzamt Hamburg-Eimsbüttel
- Fristen: `[{ typ: 'zahlung', datum: '2026-06-12', …, rechtsgrundlage: '§ 240 AO' }, { typ: 'einspruch', datum: '2026-06-12', …, rechtsgrundlage: '§ 355 AO' }]`
- `auth_channel`: `briefpost` (Schmidt-Familie ohne ELSTER-Zustimmung 2026)

**Schmidt-5 — Beitragsservice Festsetzungsbescheid**
- `id`: `letter-schmidt-beitragsservice-festsetzung`
- `archetype`: `beitragsservice-mahnung`
- Aktenzeichen: `[MOCK] 624 188 905`
- Fristen: `[{ typ: 'widerspruch', datum: '2026-06-12', original_zitat: 'Gegen diesen Bescheid kann innerhalb eines Monats nach Bekanntgabe Widerspruch eingelegt werden.', citation_match: true }]`

**Mehmet-1 — Finanzamt Köln Steuerbescheid Selbstständig 2024**
- `id`: `letter-mehmet-fa-steuerbescheid-2024`
- `archetype`: `steuerbescheid`
- Aktenzeichen: `[MOCK] 217/5732/00088`
- Aktenzeichen-weitere: `['[MOCK] 47 982 113 660']`
- Absender: Finanzamt Köln-Mitte
- Body: „… Sie haben noch 4.812,00 € zu zahlen. Bitte zahlen Sie bis zum 12.06.2026 …"
- `auth_channel`: `mein-elster` (Mehmet als Selbstständiger nutzt ELSTER)
- Fristen: `[{ typ: 'zahlung', datum: '2026-06-12', … }, { typ: 'einspruch', datum: '2026-06-12', original_zitat: 'Gegen diesen Bescheid kann innerhalb eines Monats nach Bekanntgabe Einspruch eingelegt werden.', citation_match: true, rechtsgrundlage: '§ 355 AO' }]`

**Mehmet-2 — IHK Köln Beitragsbescheid**
- `id`: `letter-mehmet-ihk-beitrag`
- `archetype`: `ihk-beitrag`
- Aktenzeichen: `[MOCK] IHK-K-2026/MITGLIED-77418`
- Absender: IHK Köln, Unter Sachsenhausen 10–26, 50667 Köln
- Body: „… Wir setzen Ihren IHK-Beitrag für das Beitragsjahr 2026 wie folgt fest: Grundbeitrag 195,00 €, Umlage 0,21 % vom Gewerbeertrag … Gegen diesen Bescheid kann innerhalb eines Monats nach Bekanntgabe Widerspruch erhoben werden …"
- Fristen: `[{ typ: 'widerspruch', datum: '2026-06-12', … }]`

**Mehmet-3 — Berufsgenossenschaft Verwaltungs-BG Beitragsbescheid**
- `id`: `letter-mehmet-bgw-beitrag`
- `archetype`: `berufsgenossenschaft-beitrag`
- Aktenzeichen: `[MOCK] BG-VBG-2026-MITGLIED-04711`
- Absender: Verwaltungs-Berufsgenossenschaft, Deelbögenkamp 4, 22297 Hamburg

**Mehmet-4 — Krankenkasse freiwillig Beitragsfestsetzung**
- `id`: `letter-mehmet-krankenkasse-freiwillig`
- `archetype`: `krankenkasse-beitrag`
- Aktenzeichen: `[MOCK] Q672013485`
- Absender: AOK Rheinland/Hamburg
- Body: „… Wir setzen Ihren freiwilligen Beitrag zur Kranken- und Pflegeversicherung ab dem 01.06.2026 wie folgt fest: KV 421,17 €/Monat, PV 76,12 €/Monat. … Bitte beachten Sie, dass die Beiträge auch dann zu zahlen sind, wenn Sie Widerspruch eingelegt haben (aufschiebende Wirkung gemäß § 86a SGG entfällt insoweit)."

**Mehmet-5 — Beitragsservice Festsetzungsbescheid Mahnung**
- `id`: `letter-mehmet-beitragsservice-mahnung`
- `archetype`: `beitragsservice-mahnung`
- Aktenzeichen: `[MOCK] 731 042 088` (re-use Beitragsnummer-Format; deduplizieren mit Anna-Brief, falls Persona-Switch global → mock-backend-coder filtert per `empfaenger_persona_id`)

#### 6.4.3 `src/data/letter-summaries.json` `<NEW>`

Pre-baked `LetterAiSummaryPostOpen` für jeden der 18 Briefe. Datenstruktur:

```json
{
  "letter-schmidt-fa-steuerbescheid-2024": {
    "bullets": [
      { "text": "Sie haben **1.247,00 €** zu zahlen." },
      { "text": "Zahlungsfrist: **12.06.2026** (29 Tage)." },
      { "text": "Einspruchsfrist: 1 Monat ab Bekanntgabe (spätestens 12.06.2026)." },
      { "text": "Säumniszuschlag bei Verspätung: 1 % pro Monat (§ 240 AO)." },
      { "text": "Aussetzung der Vollziehung kann beantragt werden (§ 361 AO)." }
    ],
    "citations": [
      { "bullet_index": 0, "original_zitat": "Sie haben noch 1.247,00 € zu zahlen." },
      { "bullet_index": 1, "original_zitat": "Bitte zahlen Sie bis zum 12.06.2026 auf das untenstehende Konto." },
      { "bullet_index": 2, "original_zitat": "Gegen diesen Bescheid kann innerhalb eines Monats nach Bekanntgabe Einspruch eingelegt werden." },
      { "bullet_index": 3, "original_zitat": "" },
      { "bullet_index": 4, "original_zitat": "" }
    ],
    "generated_at": "2026-05-08T08:00:00.000Z",
    "model": "claude-haiku-4-5-20251001"
  }
  // … 17 weitere
}
```

> Bullets 3 + 4 haben leere `original_zitat`-Strings, weil sie informative Norm-Kontextualisierung (§ 240 AO, § 361 AO) sind, **nicht** aus dem Brief stammen. UI rendert solche Bullets ohne `[⌖]`-Marker, sondern mit `<NormTooltip>` auf `§ 240 AO` / `§ 361 AO`.

#### 6.4.4 `src/data/behoerden.json` Erweiterung

Neue Behörden-Einträge (`<NEW>`):
- `standesamt-hamburg-eimsbuettel` — kategorie `kommune` (Kommunal)
- `finanzamt-hamburg-eimsbuettel` — kategorie `land`
- `tk-hamburg` — kategorie `sozialversicherung` (Selbstverwaltung)
- `finanzamt-koeln-mitte` — kategorie `land`
- `ihk-koeln` — kategorie `sozialversicherung` (Selbstverwaltung)
- `vbg-hamburg` — kategorie `sozialversicherung` (Selbstverwaltung)
- `aok-rheinland-hamburg` — kategorie `sozialversicherung`

Alle mit realen Adressen + PLZ; alle Aktenzeichen synthetisch + `[MOCK]`. (Bestehende 13 Behörden aus Umzug-Phase bleiben erhalten.)

#### 6.4.5 Datenschutz-Cockpit-Activity-Log Seed

Pro Brief mind. 1 Eintrag:
```json
{
  "letter-schmidt-fa-steuerbescheid-2024": [
    { "timestamp": "2026-05-13T14:22:00Z", "aktion": "opened_in_app", "rechtsgrundlage": "DSGVO Art. 6 lit. a Einwilligung", "note": "Brief in App geöffnet" },
    { "timestamp": "2026-05-13T14:22:08Z", "aktion": "summary_generated", "rechtsgrundlage": "DSGVO Art. 6 lit. a Einwilligung + Art. 28 AVV mit Anthropic", "note": "Zusammenfassung erstellt mit Anthropic Claude (claude-haiku-4-5-20251001)" }
  ]
}
```

## 7. AI/Assistant integration

### 7.1 Three new tool definitions for `src/lib/ai/tools.ts`

> Vorbedingung: existierende 5 Tools (`starte_umzug`, `lese_posteingang`, `hole_vorgang`, `hole_profil`, `liste_termine`) bleiben unverändert. Neue Tools werden ans Ende der `tools`-Array angehängt; `TOOL_NAMES` wird erweitert.

**Tool 6: `erklaere_brief`**

```ts
{
  name: 'erklaere_brief',
  description: [
    'Erstellt die Post-Open-Zusammenfassung eines Behördenbriefs als 5–8 strukturelle Bullets MIT Citation-Pflicht.',
    '',
    'Ablauf: lädt den Letter aus dem Mock-Backend, extrahiert je Bullet einen Original-Satz aus body_de als Citation. Output bleibt deskriptiv und nicht-handlungsanweisend; gibt KEINE einzelfallbezogene Rechtsbewertung ab (Smartlaw-Linie BGH I ZR 113/20).',
    '',
    'Ergebnis enthält pro Bullet einen `original_zitat`-Beleg. Wenn ein Bullet rein Norm-Kontext ist (z. B. „§ 240 AO Säumniszuschlag 1 % pro Monat"), bleibt `original_zitat` leer und der Bullet wird im UI mit Norm-Tooltip statt Citation-Marker gerendert.',
    '',
    'Sprache des Outputs richtet sich nach UI-Locale (de/en/ru/uk/ar/tr); Originaltext bleibt DE.',
  ].join('\n'),
  input_schema: {
    type: 'object',
    properties: {
      letterId: { type: 'string', description: 'Brief-ID aus dem Mock-Backend (z. B. "letter-schmidt-fa-steuerbescheid-2024").' },
      locale: {
        type: 'string',
        enum: ['de', 'en', 'ru', 'uk', 'ar', 'tr'],
        description: 'Ziel-Sprache der Bullets. Default: de.',
      },
    },
    required: ['letterId'],
  },
}
```

**Output-Shape** (für client-side dispatch über `api.extrahiereAktion`):
```json
{
  "ai_summary_post_open": { /* LetterAiSummaryPostOpen */ },
  "fristen": [/* LetterFrist[] */],
  "was_kann_ich_tun_options": ["steuerbescheid.zahlung", "steuerbescheid.einspruch", "steuerbescheid.aussetzung"]
}
```

**Tool 7: `extrahiere_frist`**

```ts
{
  name: 'extrahiere_frist',
  description: [
    'Extrahiert ALLE Fristen aus einem Behördenbrief (Mehrfach-Fristen möglich) MIT Citation-Pflicht.',
    '',
    'Hybrid-Pipeline: LLM (Verständnis: Frist-Typ "zahlung" / "einspruch" / "widerspruch" / "klage" / "nachweis" / "antragstellung" / "sonstige") + Regex (`\\d{1,2}\\.\\d{1,2}\\.\\d{4}` Datums-Match im body_de). Pro Frist obligatorisch ein `original_zitat`-Satz. Wenn LLM-Datum NICHT im Regex-Match → `citation_match: false`; UI zeigt Hand-off „Bitte selbst prüfen".',
    '',
    'Wenn Brief keine Frist hat: leeres `fristen`-Array.',
  ].join('\n'),
  input_schema: {
    type: 'object',
    properties: {
      letterId: { type: 'string' },
    },
    required: ['letterId'],
  },
}
```

**Output**: `{ fristen: LetterFrist[] }` — verbatim Schema aus §6.1.

**Tool 8: `vorschlage_naechsten_schritt`**

```ts
{
  name: 'vorschlage_naechsten_schritt',
  description: [
    'Liefert eine INFORMATIVE Liste möglicher Handlungen pro Brief-Archetyp — KEIN Antwort-Generator (V1 out-of-scope), KEIN Versand-Button.',
    '',
    'Output ist eine fixe Liste aus dem Brief-Archetyp-Katalog (z. B. Steuerbescheid → ["steuerbescheid.zahlung", "steuerbescheid.einspruch", "steuerbescheid.aussetzung"]). Die UI rendert die Liste mit dem Disclaimer `posteingang.disclaimer.no_legal_advice`.',
    '',
    'Smartlaw-Konformität: Optionen sind allgemeine Verfahrens-Beschreibung, keine einzelfallbezogene Rechtsbewertung. Wenn Nutzer:in nach „Wird mein Einspruch Erfolg haben?" o. ä. fragt, antwortet der Assistent NICHT mit einer Erfolgs-Prognose, sondern verweist auf Verbraucherzentrale / Anwält:in.',
  ].join('\n'),
  input_schema: {
    type: 'object',
    properties: {
      letterId: { type: 'string' },
    },
    required: ['letterId'],
  },
}
```

**Output**: `{ options: string[] }` — z. B. `["steuerbescheid.zahlung", "steuerbescheid.einspruch", "steuerbescheid.aussetzung"]`.

**Was-kann-ich-tun-Optionen-Katalog** (i18n-key Mapping in §8):
- `steuerbescheid.*`: zahlung / einspruch / aussetzung / saeumniszuschlag_info
- `krankenkasse-beitrag.*`: zahlung / widerspruch / befreiung_pruefen
- `beitragsservice-mahnung.*`: zahlung / widerspruch / befreiung_pruefen
- `abh-verlaengerung.*`: termin_buchen / nachweise_sammeln / fiktionsbescheinigung_info
- `familienkasse-nachweis.*`: nachweis_einreichen / fristverlaengerung_pruefen
- `buergeramt-meldung.*`: keine_aktion / folgeprozesse_pruefen
- `ihk-beitrag.*`: zahlung / widerspruch / abweichende_festsetzung_pruefen
- `berufsgenossenschaft-beitrag.*`: zahlung / widerspruch
- `standesamt-urkunde.*`: keine_aktion / folge_familienkasse / folge_krankenkasse / folge_steueridnr

### 7.2 System-prompt deltas (`src/lib/ai/system-prompt.ts`)

Im gecachten `BASE_SYSTEM_PROMPT` ergänzen:

> „Sie können Bürger:innen helfen, Behördenbriefe zu **verstehen**. Verfügbare Tools: `erklaere_brief` (5–8 Bullets mit Citation-Pflicht), `extrahiere_frist` (Fristen mit Original-Zitat), `vorschlage_naechsten_schritt` (informative Handlungs-Liste pro Archetyp).
>
> **Smartlaw-Linie (BGH I ZR 113/20) verbindlich**: Sie geben **allgemeine Information** und **Verfahrens-Beschreibung**, **keine** einzelfallbezogene Rechtsbewertung. Wenn die Nutzer:in fragt „Wird mein Einspruch Erfolg haben?" oder „Ist dieser Bescheid rechtmäßig?", antworten Sie: ‚Eine Erfolgs-Prognose ist Rechtsdienstleistung im Sinne des § 2 RDG und kann nur durch Rechtsanwält:innen, Verbraucherzentralen oder Sozialverbände erfolgen.' Verweisen Sie konkret auf Verbraucherzentrale, Sozialverband (SoVD/VdK), Anwält:in.
>
> **Citation-Pflicht**: jede Frist und jeder Bullet, der eine konkrete Aussage aus dem Brief reformuliert, MUSS mit einem Original-Satz aus `body_de` belegt sein. Norm-Kontextualisierung (§ 240 AO Säumniszuschlag, § 361 AO Aussetzung der Vollziehung) ist informativ und braucht keine Citation, wird aber als solche markiert.
>
> **Frist-Disclaimer**: Bei verstrichener Frist NIEMALS „Sie können noch handeln" formulieren. Sachlich „Frist verstrichen am [DATUM]" + informativer Hinweis auf Wiedereinsetzungs-Möglichkeiten (§ 110 AO / § 32 VwVfG). Bei § 240 AO Säumniszuschlag: 1 % pro Monat als Faktum, neutral, **kein** Druck-Framing.
>
> **Originaltext ist maßgeblich**: weisen Sie immer darauf hin, dass die Zusammenfassung Verständnis-Hilfe ist und der deutsche Originaltext rechtsverbindlich bleibt. Nutzen Sie hierzu den i18n-Schlüssel `posteingang.disclaimer.original_authoritative` (an UI delegiert).
>
> **Pre-Open-Format strikt strukturell**: wenn nach einer „kurzen Zusammenfassung für die Inbox-Liste" gefragt → genau ein Satz: „[Behörde] · [Brieftyp] · [Frist (N Tage Countdown) oder ‚Keine Frist']", max 80 Zeichen. KEINE Inhalts-Interpretation."

**Prompt-Cache-Strategie**: alle drei Tools + System-Prompt-Erweiterung gehen in den **gleichen** `cache_control: { type: 'ephemeral' }`-Block wie die existierenden 5 Tools (siehe Umzug-Spec §7). Cache-Treffer wird per `cache_read_input_tokens` gemessen.

### 7.3 Sample dialogues

**Dialog A — Brief verstehen (Tool-Chain `erklaere_brief`)**

> User: „Ich habe einen Brief vom Finanzamt. Ich verstehe nicht, was ich tun muss."
>
> Assistant: *(tool_use `lese_posteingang` `{"filter":{"absender":"finanzamt"}}`)* *(tool_result: 1 Brief, id `letter-schmidt-fa-steuerbescheid-2024`)*
>
> Assistant: *(tool_use `erklaere_brief` `{"letterId":"letter-schmidt-fa-steuerbescheid-2024","locale":"de"}`)*
>
> Assistant: „Ihr Steuerbescheid 2024 vom Finanzamt Hamburg-Eimsbüttel besagt zusammengefasst:
> - Sie haben **1.247,00 €** zu zahlen.
> - Zahlungsfrist: **12.06.2026** (29 Tage). Originalformulierung: „Bitte zahlen Sie bis zum 12.06.2026 …"
> - Einspruchsfrist: 1 Monat ab Bekanntgabe (spätestens 12.06.2026). Originalformulierung: „Gegen diesen Bescheid kann innerhalb eines Monats nach Bekanntgabe Einspruch eingelegt werden."
> - Säumniszuschlag bei Verspätung: 1 % pro Monat (§ 240 AO, allgemeine Norm).
> - Aussetzung der Vollziehung kann nach § 361 AO beantragt werden (allgemeiner Hinweis).
>
> Rechtsverbindlich ist der deutsche Originaltext des Bescheids; bitte gleichen Sie wichtige Angaben am Original ab. Eine Bewertung der Erfolgsaussichten eines Einspruchs ist Rechtsdienstleistung und kann nur durch Rechtsanwält:innen oder Verbraucherzentralen erfolgen."

**Dialog B — Frist-Extraktion (Tool-Chain `extrahiere_frist`)**

> User: „Welche Frist hat der ABH-Brief?"
>
> Assistant: *(tool_use `lese_posteingang` `{"filter":{"absender":"abh"}}`)* *(tool_result: letter-abh-erinnerung-verlaengerung)*
>
> Assistant: *(tool_use `extrahiere_frist` `{"letterId":"letter-abh-erinnerung-verlaengerung"}`)*
>
> Assistant: „Der Brief der Ausländerbehörde Berlin LEA enthält eine Antrags-Frist:
> - Empfehlung: Termin zur Verlängerung mindestens **vier Monate vor Ablauf** des Aufenthaltstitels buchen — also spätestens **14.05.2027**.
> - Originalformulierung: „Wir empfehlen, mindestens vier Monate vorher einen Termin zur Verlängerung … zu vereinbaren."
>
> Hinweis: dies ist **keine** gesetzliche Frist iSv § 70 VwGO, sondern eine Verwaltungs-Empfehlung. Soll ich die Frist in Ihren Kalender eintragen?"

**Dialog C — Verbotener Use-Case (Erfolgs-Prognose)**

> User: „Wird mein Einspruch gegen den Steuerbescheid Erfolg haben?"
>
> Assistant: „Eine Bewertung der Erfolgsaussichten eines Einspruchs ist Rechtsdienstleistung im Sinne des § 2 RDG und kann nur durch zur Rechtsdienstleistung befugte Personen erfolgen — Rechtsanwält:innen (BRAO), Verbraucherzentralen oder Steuerberatungskammern. Ich kann Ihnen die formale Frist und das Verfahren erklären (Einspruch innerhalb eines Monats nach Bekanntgabe, schriftlich oder elektronisch beim Finanzamt einzulegen, § 357 AO), aber keine Erfolgs-Prognose abgeben."

## 8. i18n keys

> Alle Schlüssel hierarchisch unter `posteingang.*` (feature-spezifisch) und `common.*` (cross-feature). DE = Source-of-Truth. Übersetzung durch i18n-localizer in **DE, EN, RU, UK, AR, TR**. AI-Summary-Bullets sind **nicht** in `de.json`, sondern in `letter-summaries.json` pro Sprache (mock-backend lädt locale-spezifisch). Originaltext bleibt **immer DE**, auch in AR/RU/UK-UI.

### 8.1 Mandatory Disclaimer-Strings — verbatim aus verifier (NICHT umformulieren)

**`posteingang.disclaimer.opening`** — Eröffnen löst keine Frist aus (Vier-Regimes inkl. Briefpost § 41 Abs. 2 / Mein ELSTER § 122a / ZBP § 41 Abs. 2a / VwZG § 5 Abs. 7 + 2026/2027-Übergang):

> „Hinweis zum Öffnen. Diese App ist eine Lese- und Erklär-Schicht für Behördenbriefe. Das Öffnen oder Markieren-als-gelesen einer Brief-Karte hier ist **nur App-interner Lesefortschritt** — es ist **kein** Abruf iSv § 41 Abs. 2a VwVfG oder § 122a AO und löst **keine** rechtliche Bekanntgabe aus.
>
> Die Bekanntgabe richtet sich nach dem Übermittlungsweg im **amtlichen** Kanal:
> - **Briefpost** (häufigster Fall — Krankenkasse, Beitragsservice, Familienkasse, Ausländerbehörde, Bürgeramt, Bußgeldstelle): gilt am **vierten Tag nach Aufgabe zur Post** als bekannt gegeben (§ 41 Abs. 2 VwVfG bzw. § 122 Abs. 2 AO seit Postrechtsmodernisierungsgesetz 01.01.2025).
> - **Mein ELSTER** (Steuerbescheide bei elektronischer Steuererklärung): gilt am **vierten Tag nach Bereitstellung zum Abruf** als bekannt gegeben (§ 122a Abs. 4 AO). Ab 01.01.2027 ist die elektronische Bekanntgabe Default (Widerspruchslösung); bis dahin Übergangsphase mit aktiver Zustimmung.
> - **Zentrales Bürgerpostfach (ZBP/BundID) mit Einwilligung**: gilt am **Tag nach dem Abruf** als bekannt gegeben (§ 41 Abs. 2a VwVfG). Bei Nicht-Abruf binnen 10 Tagen ohne Bekanntgabe.
> - **Förmliche elektronische Zustellung** (z. B. Verwaltungsverfahren, Sozialgericht): gilt am **vierten Tag nach Absendung** als zugestellt, widerlegbar bei Nachweis späteren Zugangs (§ 5 Abs. 7 VwZG).
>
> Bitte rufen Sie Ihre **amtlichen Postfächer** und Ihren physischen Briefkasten **regelmäßig** ab. Diese App ersetzt das nicht."

**`posteingang.disclaimer.no_legal_advice`** — Keine Rechtsberatung (Smartlaw-Linie + Verbraucherzentralen-Verweis):

> „Diese KI-Erklärung ist eine **allgemeine Information** und Verständnis-Hilfe — **keine Rechtsdienstleistung** im Sinne des Rechtsdienstleistungsgesetzes (§ 2 RDG). Sie nimmt **keine** Bewertung Ihres Einzelfalls vor (BGH I ZR 113/20 ‚Smartlaw'-Linie: Werkzeug-Charakter, kein Mandatsverhältnis, kein Erfolgsversprechen).
>
> Eine konkrete rechtliche Bewertung — etwa ob ein Widerspruch erfolgversprechend ist, welche Begründung tragend wäre, oder ob ein Bescheid rechtmäßig ist — kann **nur** durch eine zur Rechtsdienstleistung befugte Person erfolgen: Rechtsanwält:in (BRAO), Verbraucherzentrale (UKlaG/§ 8 RDG), Sozialverband (z. B. SoVD, VdK), oder zuständige Steuerberatungskammer. Die KI gibt **keine Erfolgsversprechen** ab und vertritt Sie **nicht** gegenüber Behörden. Vorschläge zu Antworten oder Fristen sind unverbindlich; die Verantwortung für jede Eingabe und jeden Versand liegt bei Ihnen."

**`posteingang.disclaimer.mock_data`** — Demo-Briefe sind synthetisch (Upload deaktiviert):

> „Alle hier angezeigten Briefe, Aktenzeichen, Beträge und Personen-Daten sind **synthetisch** und mit `[MOCK]` gekennzeichnet. Diese Demo verarbeitet **keine echten Behördenbriefe** und hat **keine Anbindung** an Mein ELSTER, das Zentrale Bürgerpostfach (ZBP/BundID), Krankenkassen-Portale oder andere amtliche Postfächer. Der Brief-Upload ist in dieser Demo **deaktiviert**. Bitte fügen Sie keine echten Briefe oder personenbezogenen Daten in Eingabefelder ein — die Demo ist für die Verarbeitung sensibler Informationen nicht freigegeben."

**`posteingang.disclaimer.original_authoritative`** — Originaltext ist maßgeblich (Halluzinations-Hinweis):

> „**Rechtsverbindlich ist ausschließlich der deutsche Originaltext** des Bescheids. Die KI-Zusammenfassung und etwaige Übersetzungen sind reine Verständnis-Hilfen und können — wie alle KI-generierten Texte — Fehler oder Auslassungen enthalten. Im Zweifel zählt der Wortlaut der Behörde. Klicken Sie ‚Originalbrief anzeigen', um den vollständigen Wortlaut zu lesen, und gleichen Sie wichtige Angaben (Frist, Betrag, Aktenzeichen) am Original ab."

### 8.2 Inline-Disclaimer (verbatim aus verifier — kontext-spezifisch, kurz)

- **`posteingang.reader.summary_skeleton_hint`** *(vor AI-Summary-Generierung, Skeleton-Stage)*: „Zusammenfassung wird mit KI erstellt — bitte gleichen Sie wichtige Angaben mit dem Originaltext ab."
- **`posteingang.reader.frist_modal.disclaimer`** *(vor Frist-Kalender-Eintrag)*: „Diese Frist ist aus dem Brief automatisch erkannt worden. Originalformulierung: ‚{zitat}'. Bitte verifizieren Sie das Datum."
- **`posteingang.reader.citation.mismatch_warning`** *(bei Pre-Open ohne erkannte Frist oder LLM-Regex-Mismatch)*: „Keine Frist erkannt. Bitte prüfen Sie den Originalbrief auf Fristen."

### 8.3 Speculative-Design-Footer (verbatim aus Verifier-Auflage #8)

**`posteingang.hero.speculative_footer`**:

> „Diese Demo zeigt, wie ein einheitlicher Behörden-Posteingang 2027 aussehen *könnte*. Stand Mai 2026: ZBP/BundID ist produktiv (~3,8 Mio Postfächer migriert), bidirektionale Kommunikation ab Juli 2026 geplant; Mein ELSTER hat eigenen Posteingang mit elektronischer Bekanntgabe ab 01.01.2027 als Default-Plan. Eine *einheitliche* Inbox-Realität existiert in DE 2026 noch nicht — die Demo zeigt, wie sie aussehen könnte. Daten und Briefe sind synthetisch (`[MOCK]`)."

### 8.4 Was-kann-ich-tun-Optionen — Katalog (DE, Sie-Form)

| Key | DE-Wert |
|---|---|
| `posteingang.was_kann_ich_tun.steuerbescheid.zahlung` | „Zahlung leisten" |
| `posteingang.was_kann_ich_tun.steuerbescheid.einspruch` | „Einspruch einlegen (innerhalb 1 Monat, § 355 AO)" |
| `posteingang.was_kann_ich_tun.steuerbescheid.aussetzung` | „Aussetzung der Vollziehung beantragen (§ 361 AO)" |
| `posteingang.was_kann_ich_tun.steuerbescheid.saeumniszuschlag_info` | „Hinweis: ab Fälligkeit fallen Säumniszuschläge an (§ 240 AO, 1 % pro Monat)" |
| `posteingang.was_kann_ich_tun.krankenkasse-beitrag.zahlung` | „Beitrag zahlen" |
| `posteingang.was_kann_ich_tun.krankenkasse-beitrag.widerspruch` | „Widerspruch erheben (innerhalb 1 Monat, § 84 SGG)" |
| `posteingang.was_kann_ich_tun.krankenkasse-beitrag.befreiung_pruefen` | „Beitragsbefreiung / Härtefall prüfen" |
| `posteingang.was_kann_ich_tun.beitragsservice-mahnung.zahlung` | „Rückstand zahlen" |
| `posteingang.was_kann_ich_tun.beitragsservice-mahnung.widerspruch` | „Widerspruch einlegen (innerhalb 1 Monat)" |
| `posteingang.was_kann_ich_tun.beitragsservice-mahnung.befreiung_pruefen` | „Befreiungsantrag prüfen (z. B. SGB-II-Bezug)" |
| `posteingang.was_kann_ich_tun.abh-verlaengerung.termin_buchen` | „Termin zur Verlängerung buchen" |
| `posteingang.was_kann_ich_tun.abh-verlaengerung.nachweise_sammeln` | „Nachweise zusammenstellen (Pass, Krankenversicherung, Beschäftigungsnachweis, Wohnungsgeberbestätigung)" |
| `posteingang.was_kann_ich_tun.abh-verlaengerung.fiktionsbescheinigung_info` | „Hinweis: bei rechtzeitigem Antrag gilt Fortbestands-Fiktion (§ 81 Abs. 4 AufenthG)" |
| `posteingang.was_kann_ich_tun.familienkasse-nachweis.nachweis_einreichen` | „Geforderte Nachweise einreichen" |
| `posteingang.was_kann_ich_tun.familienkasse-nachweis.fristverlaengerung_pruefen` | „Fristverlängerung schriftlich beantragen" |
| `posteingang.was_kann_ich_tun.buergeramt-meldung.keine_aktion` | „Keine Aktion erforderlich (informative Bestätigung)" |
| `posteingang.was_kann_ich_tun.buergeramt-meldung.folgeprozesse_pruefen` | „Folgeprozesse prüfen (KFZ, Krankenkasse, Bank)" |
| `posteingang.was_kann_ich_tun.ihk-beitrag.zahlung` | „Beitrag zahlen" |
| `posteingang.was_kann_ich_tun.ihk-beitrag.widerspruch` | „Widerspruch erheben" |
| `posteingang.was_kann_ich_tun.ihk-beitrag.abweichende_festsetzung_pruefen` | „Antrag auf abweichende Festsetzung prüfen (Härtefall)" |
| `posteingang.was_kann_ich_tun.berufsgenossenschaft-beitrag.zahlung` | „Beitrag zahlen" |
| `posteingang.was_kann_ich_tun.berufsgenossenschaft-beitrag.widerspruch` | „Widerspruch erheben (innerhalb 1 Monat)" |
| `posteingang.was_kann_ich_tun.standesamt-urkunde.keine_aktion` | „Keine Aktion erforderlich (Urkunde aufbewahren)" |
| `posteingang.was_kann_ich_tun.standesamt-urkunde.folge_familienkasse` | „Kindergeld-Antrag bei der Familienkasse stellen" |
| `posteingang.was_kann_ich_tun.standesamt-urkunde.folge_krankenkasse` | „Kind bei der Krankenkasse anmelden (Familienversicherung)" |
| `posteingang.was_kann_ich_tun.standesamt-urkunde.folge_steueridnr` | „Steuer-IdNr. wird automatisch vom BZSt vergeben" |

### 8.5 Norm-Tooltip-Targets

`<NormTooltip>`-Komponente liefert pro Norm-Kürzel: kurze Erklärung + externer Link. URLs aus Verifier-Section "Sources / Norm-Linklisten":

| Norm-Kürzel | URL | Tooltip-Text-Key |
|---|---|---|
| `§ 41 Abs. 2 VwVfG` | `https://www.gesetze-im-internet.de/vwvfg/__41.html` | `posteingang.normtooltip.vwvfg_41_2` |
| `§ 41 Abs. 2a VwVfG` | `https://www.gesetze-im-internet.de/vwvfg/__41.html` | `posteingang.normtooltip.vwvfg_41_2a` |
| `§ 122 AO` | `https://www.gesetze-im-internet.de/ao_1977/__122.html` | `posteingang.normtooltip.ao_122` |
| `§ 122a AO` | `https://www.gesetze-im-internet.de/ao_1977/__122a.html` | `posteingang.normtooltip.ao_122a` |
| `§ 5 VwZG` | `https://www.gesetze-im-internet.de/vwzg_2005/__5.html` | `posteingang.normtooltip.vwzg_5` |
| `§ 240 AO` | `https://www.gesetze-im-internet.de/ao_1977/__240.html` | `posteingang.normtooltip.ao_240` |
| `§ 70 VwGO` | `https://www.gesetze-im-internet.de/vwgo/__70.html` | `posteingang.normtooltip.vwgo_70` |
| `§ 84 SGG` | `https://www.gesetze-im-internet.de/sgg/__84.html` | `posteingang.normtooltip.sgg_84` |
| `§ 67 OWiG` | `https://www.gesetze-im-internet.de/owig_1968/__67.html` | `posteingang.normtooltip.owig_67` |
| `§ 2 RDG` | `https://www.gesetze-im-internet.de/rdg/__2.html` | `posteingang.normtooltip.rdg_2` |
| `§ 30 AO` | `https://www.gesetze-im-internet.de/ao_1977/__30.html` | `posteingang.normtooltip.ao_30` |
| `§ 87a AO` | `https://www.gesetze-im-internet.de/ao_1977/__87a.html` | `posteingang.normtooltip.ao_87a` |
| `§ 22 BDSG` | `https://www.gesetze-im-internet.de/bdsg_2018/__22.html` | `posteingang.normtooltip.bdsg_22` |
| `Art. 6 DSGVO` | `https://dsgvo-gesetz.de/art-6-dsgvo/` | `posteingang.normtooltip.dsgvo_6` |
| `Art. 9 DSGVO` | `https://dsgvo-gesetz.de/art-9-dsgvo/` | `posteingang.normtooltip.dsgvo_9` |
| `Art. 22 DSGVO` | `https://dsgvo-gesetz.de/art-22-dsgvo/` | `posteingang.normtooltip.dsgvo_22` |
| `Art. 28 DSGVO` | `https://dsgvo-gesetz.de/art-28-dsgvo/` | `posteingang.normtooltip.dsgvo_28` |
| `BGH I ZR 113/20` | `https://www.bundesgerichtshof.de/SharedDocs/Pressemitteilungen/DE/2021/2021167.html` | `posteingang.normtooltip.bgh_smartlaw` |

Tooltip-Text-Keys liefern eine 1-Satz-Erklärung in DE (i18n-localizer übersetzt). Beispiel:
- `posteingang.normtooltip.ao_240` — „§ 240 AO: Säumniszuschlag — 1 % pro angefangenem Monat auf nicht entrichtete Steuerschulden, ab Fälligkeit."

### 8.6 Übrige `posteingang.*`-Keys

(Alle in §4 referenzierten `posteingang.list.*`, `posteingang.search.*`, `posteingang.filter.*`, `posteingang.card.*`, `posteingang.gruppe.*`, `posteingang.reader.*`, `posteingang.normtooltip.*` mit DE-Source-Werten — konsolidierte Tabelle siehe inline in §4.1, §4.2, §4.3 und §8.5.)

### 8.7 `common.*`-Erweiterungen

| Key | DE-Wert |
|---|---|
| `common.posteingang.label` | „Posteingang" |
| `common.frist.zahlung` | „Zahlungsfrist" |
| `common.frist.einspruch` | „Einspruchsfrist" |
| `common.frist.widerspruch` | „Widerspruchsfrist" |
| `common.frist.klage` | „Klagefrist" |
| `common.frist.nachweis` | „Nachweisfrist" |
| `common.frist.antragstellung` | „Antrags-Frist" |

## 9. Edge cases (alle 8 aus Verifier — verbindlich)

1. **Mehrere Fristen pro Brief** (z. B. Steuerbescheid: Zahlungs- + Einspruchs-Frist): AI extrahiert beide via `extrahiere_frist`; `Letter.fristen[]` enthält 2 Einträge mit unterschiedlichem `typ`. UI rendert je einen `<FristChip>` (Layout: Chips horizontal nebeneinander). `<FristDetailModal>` zeigt **alle** Fristen mit eigenem Original-Zitat pro Frist.
2. **Brief ohne Frist** (z. B. Bürgeramt Meldebestätigung, Standesamt-Geburtsurkunde): `Letter.fristen` = `[]`. UI: Frist-Chip ausblenden, Pre-Open-Format ohne Frist-Suffix; explizit `posteingang.card.frist_keine` „Keine Frist". Was-kann-ich-tun-Optionen sind dann `keine_aktion` / `folgeprozesse_pruefen`.
3. **Verstrichene Frist**: `Letter.fristen[i].datum < heute`. UI: `<FristChip>` rot mit `posteingang.card.frist_abgelaufen_template` „Frist abgelaufen am {datum}". AI-Summary darf **nicht** „Sie können noch handeln" formulieren (System-Prompt-Constraint §7.2). Erlaubt: „Frist verstrichen — informieren Sie sich über Wiedereinsetzungs-Möglichkeiten (§ 110 AO / § 32 VwVfG)" als informativer Hinweis.
4. **Mehrfach-Aktenzeichen** (Steuerbescheid mit Steuernummer + Steuer-IdNr.): primäres Az prominent in Header; `aktenzeichen_weitere` als kleinere Zeile darunter mit `posteingang.reader.aktenzeichen_weitere_label` „Weitere Aktenzeichen". `<AktenzeichenSearch>` durchsucht beide Felder.
5. **Mehrsprachige Bürger:innen**: Pre-Open-Summary + Post-Open-Summary in UI-Sprache (locale-resolver aus existing `src/lib/ai/language.ts`); Originaltext **immer DE** (`<OriginaltextBlock dir="ltr" lang="de">`). „Vorlesen" optional (V2). AR-RTL: Summary-Bereich `dir="rtl"`, Originaltext-Bereich `dir="ltr"` lokal überschrieben.
6. **Phishing-Brief**: V1 explizit **out-of-scope** (Verifier-Auflage). Kein 7. Archetyp „Verdächtiger Brief" in V1. V2-Erweiterung: Authentizitäts-Badge mit Stufe „EUDI-Wallet-versiegelt" + Phishing-Warn-UI.
7. **„Aussetzung der Vollziehung"-Hinweis** (Steuerbescheid): AI **erklärt** den Begriff allgemein (§ 361 AO: „Aussetzung der Vollziehung kann beantragt werden, wenn ernstliche Zweifel an der Rechtmäßigkeit bestehen oder Vollziehung unbillige Härte wäre"). AI **berät nicht**, ob Bürger:in beantragen sollte. Was-kann-ich-tun-Option `steuerbescheid.aussetzung` ist informativ.
8. **§ 240 AO Säumniszuschlag-Hinweis**: AI nennt **1 % pro Monat** als Faktum, neutral, **kein** Druck-Framing („Pro verstrichenem Monat fallen Säumniszuschläge nach § 240 AO an. Stand des Säumniszuschlags wird in der Detailansicht angezeigt."). Was-kann-ich-tun-Option `steuerbescheid.saeumniszuschlag_info` rendert diesen Faktentext mit `<NormTooltip>` auf § 240 AO.

**Zusätzliche technische Edge cases**:

9. **AI-Summary-Generierung fehlgeschlagen** (Tool `erklaere_brief` wirft / Anthropic-Quota): UI zeigt Hinweis „Zusammenfassung temporär nicht verfügbar — der Originaltext rechts ist maßgeblich" + Retry-Button. Originaltext-Block bleibt voll funktional. Datenschutz-Cockpit-Eintrag wird **nicht** geschrieben (kein „summary_generated" ohne erfolgreiche Generierung).
10. **LLM-Regex-Mismatch bei Frist** (`citation_match: false`): UI markiert betroffenen `<FristChip>` mit Warn-Icon + Tooltip `posteingang.reader.citation.mismatch_warning`. „Frist im Kalender"-CTA ist **deaktiviert**, bis Bürger:in das Datum manuell verifiziert (Modal mit Datums-Input).
11. **`prefers-reduced-motion`**: Bullet-Fade-In + Citation-Popover-Animation deaktiviert; Status-Übergänge ohne Animation.
12. **Offline mid-flow**: Mock-Backend ist in-process (keine Netzwerk-Abhängigkeit für Read-Operationen); `extrahiereAktion` lädt aus `letter-summaries.json` Seed → funktioniert offline. Echter AI-Tool-Aufruf via `/api/assistant` benötigt Netz; bei Offline zeigt Assistant Fehler-Toast.

## 10. Out of scope (explicit)

V1 **OUT**:
- **Antwort-Generator („Antwort vorschlagen")** — RDG-Smartlaw-Linie. V2-Hook: Letter-Card-CTA-Slot bleibt **frei** (nicht mit anderen Buttons gefüllt) für späteres 3-Stufen-UX (Vorlage → Bürger-Edit + Freigabe → Versand mit eID-Bestätigung). System-Prompt für V2 muss „keine einzelfallbezogene rechtliche Argumentation, nur Standardtext-Vorlage" als Constraint enthalten. Erfolgs-Prognose verboten.
- **Brief-Upload durch Bürger:in** (`auth_channel: 'eingabe-buerger'`) — V1 deaktiviert; UI zeigt höchstens „Coming soon"-Platzhalter mit `posteingang.disclaimer.mock_data`-Hinweis.
- **ZBP-/Mein-ELSTER-/FIT-Connect-Anbindung simulieren** — Demo zeigt **keinen** „Synchronisieren-mit-ELSTER"-Button und **keinen** „Aus ZBP abrufen"-Flow. Briefe kommen ausschließlich aus `letters.json`. `auth_channel`-Anzeige ist reine Konvention/Beschriftung, kein technischer Pull.
- **Phishing-Archetyp** (7. Archetyp „Verdächtiger Brief"): V2.
- **Vorlesen** der AI-Summary (TTS): V2.
- **Stand-Update Säumniszuschlag** in Echtzeit (Berechnung tagaktuell): V1 zeigt nur „1 % pro Monat" als Faktum, kein dynamischer Stand.
- **Sortierung-Toggle** „Älteste zuerst" / „Behörde A–Z": V2.
- **Brief-Archiv-Aktion** (Bürger:in archiviert manuell): V1 zeigt Status `archiv` nur passiv (auto-Move bei `status: 'erledigt'` + Alter > 90 Tage); manuelles Archivieren V2.
- **Brief-Export** als PDF / EML: V1 zeigt nur „Originalbrief anzeigen (PDF)"-CTA, der ein Mock-PDF rendert; echter Download wird in V2 implementiert.
- **Mehrere Personas in einer Inbox** (Familienverbund): V2 (analog zu Umzug-Spec).
- **Datenschutz-Cockpit-Vollausbau**: Cockpit zeigt für jeden Brief das Activity-Log; Vollausbau (Filter, Suche, Export, Lösch-Anträge) ist eigener Spec.

## 11. Risks & mitigations

| Risiko | Mitigation |
|---|---|
| **RDG-Linie überschritten**: AI gibt Erfolgs-Prognose oder einzelfallbezogene Rechtsbewertung | System-Prompt-Constraint §7.2 verbietet das explizit; Verbraucherzentralen-Verweis verbindlich; Disclaimer `no_legal_advice` immer sichtbar; „Antwort vorschlagen" V1-out; Refusal-Pattern in `src/lib/ai/safety.ts` erweitert um „Erfolgsprognose"-Trigger |
| **AI-Halluzination bei Frist** (Apple-Intelligence-BBC-Vorfall) | Citation-Pflicht pro Frist; Hybrid LLM + Regex-Validierung; Mismatch → Hand-off „Bitte selbst prüfen"; `<FristDetailModal>` zeigt **immer** das Original-Zitat; Frist-Chip leitet aus Original-Datum, nicht AI-berechnet |
| **Frist-Confusion** (Widerspruch / Klage / Antrag durcheinander) | `LetterFristTyp`-Enum trennt sauber; pro Typ eigener Chip + i18n-Label; `<NormTooltip>` auf § 70 VwGO / § 84 SGG / § 67 OWiG erklärt das Verfahren; AI-System-Prompt nennt korrekte Norm pro Typ |
| **„App löst Frist aus"-Falle** (User denkt Markieren-als-gelesen = Bekanntgabe) | `posteingang.disclaimer.opening` differenziert vier Regimes ausführlich; UI-Action heißt **„Diesen Brief als gelesen markieren"** (NIE „Lesebestätigung"); Activity-Log explizit als „App-Aktivität, nicht Behörden-Read-Receipt" markiert |
| **Phishing-Risiko** (gefälschte Behörden-Optik) | V1: Authentizitäts-Badge mit `auth_channel`-Beschriftung („Empfangen über Briefpost") als reine Konsum-Markierung. V2: EUDI-Wallet-Sealing als kryptografischer Authentizitäts-Beleg (Konvention bereits in V1 vorgesehen, nicht funktional) |
| **Behörden-Logo-Markenrecht** (Bundesadler etc.) | `public/behoerden-logos/` enthält **nur** abstrakte SVGs in 5-Glyphen-Symbol-Familie; kein echtes Wappen, kein Bundesadler, kein Polizei-Stern. `<BehoerdenBadge>` darf nur diese 5 SVGs laden (Audit-Regel: import-Whitelist in Komponente) |
| **DSGVO Art. 9 (Sozial-/Aufenthaltsdaten) bei AI-Übermittlung** | Korrekte Rechtsgrundlage `Art. 6 lit. a + Art. 9 Abs. 2 lit. a DSGVO Einwilligung` (NICHT lit. e/h — App ist privat). AVV mit Anthropic (Art. 28 DSGVO) als Spec-Vermerk; Mock simuliert keinen echten Transfer; Datenschutz-Cockpit-Eintrag dokumentiert die Verarbeitung pro Brief |
| **Pre-Open-Summary-Fehler** (Strukturmerkmale falsch interpretiert) | Pre-Open ist **strikt strukturell**, nur „[Behörde] · [Brieftyp] · [Frist]"; **keine Inhalts-Interpretation** in der Inbox-Card. AI-System-Prompt verbietet das. Inhalts-Interpretation nur Post-Open mit Citation |
| **Mismatch-Risiko bei Aktenzeichen-Format** | mock-backend-test `tests/unit/aktenzeichen-format.test.ts` validiert jeden Letter im Seed gegen `posteingang.md`-Format-Tabelle; rote Tests blocken Merge |

## 12. Review checklist (für code-reviewer)

- [ ] Keine hardgecodeten Strings — alle über `t('posteingang.*')` oder `t('common.*')`. `next-intl` `useTranslations()` in Client Components, `getTranslations()` in RSC.
- [ ] Mock-Backend-Latenz simuliert: `getLetters` 300–800 ms; `extrahiereAktion` 1.500–3.500 ms (LLM-feel); `searchLettersByAktenzeichen` 200–400 ms (Suche-Feel); `erstelleVorgangAusBrief` 500–1.000 ms.
- [ ] Citation-Popover-/Bullet-Animationen respektieren `prefers-reduced-motion`.
- [ ] **Disclaimer `posteingang.disclaimer.opening`** ist auf der Inbox-Hero und im LetterReader-Footer sichtbar; Wording matcht **verbatim** §8.1.
- [ ] **Disclaimer `posteingang.disclaimer.original_authoritative`** ist als roter Banner über jedem `<AISummaryBlock>` sichtbar; Wording verbatim §8.1.
- [ ] **Disclaimer `posteingang.disclaimer.no_legal_advice`** ist im `<WasKannIchTunFooter>` sichtbar; Wording verbatim §8.1.
- [ ] **Disclaimer `posteingang.disclaimer.mock_data`** ist im Inbox-Footer sichtbar; Wording verbatim §8.1.
- [ ] Inline-Disclaimer (`summary_skeleton_hint`, `frist_modal.disclaimer`, `citation.mismatch_warning`) verbatim §8.2.
- [ ] „Stand 2027"-Speculative-Footer verbatim §8.3 sichtbar auf Inbox-Hero.
- [ ] Aktenzeichen in **allen 18 Seed-Briefen** folgen Formaten aus `docs/domain/posteingang.md` (Steuernummer länderspezifisch, Steuer-IdNr. 11 Ziffern, KVNR `[A-Z]\d{9}`, KG-Nr 11 Zeichen, Beitragsservice 9 Ziffern, ABH `ABH-B-YYYY/RB-X-NNNN`, Bürgeramt frei lokal, Standesamt `<Stadt>-<Buchstabe>-NNNN/JJJJ`).
- [ ] **Aktenzeichen-Format-Test** `tests/unit/aktenzeichen-format.test.ts` exit 0.
- [ ] `[MOCK]`-Watermark als **Banner oben** in jedem `<LetterReader>` UND als **Präfix/Infix in jedem Aktenzeichen-String**.
- [ ] **Pre-Open-Format strikt strukturell** — `[Behörde] · [Brieftyp] · [Frist]`, max 80 Zeichen, **keine Inhalts-Interpretation**. Lint-Regel: `letter-summaries.json` Pre-Open-Strings ≤ 80 Zeichen.
- [ ] **Default-Tab Mobile = Originaltext** (NICHT AI-Summary). Test: `<LetterReaderLayout>` rendert auf Viewport < 768px `aria-selected="true"` auf Originaltext-Tab.
- [ ] **Citation pro Bullet** — jeder `LetterAiSummaryPostOpen.bullets[i]` hat einen passenden `citations[i]` (mit `bullet_index === i`); Bullets ohne Citation (Norm-Kontext) explizit mit `original_zitat: ""` und im UI als `<NormTooltip>` gerendert.
- [ ] **Frist-Chip-Datum aus Original-Zitat**, nicht AI-berechnet — Test: `LetterFrist.datum` matcht den Regex-Treffer aus `original_zitat`.
- [ ] **`citation_match: false`** → UI deaktiviert „Frist im Kalender"-CTA bis manuelle Verifikation.
- [ ] **Authentizitäts-Badge** auf jeder LetterCard mit `auth_channel`-Beschriftung; nur 5 SVGs aus `public/behoerden-logos/` werden verwendet (Import-Whitelist-Audit).
- [ ] **Datenschutz-Cockpit-Link** auf jeder LetterCard öffnet `/datenschutz?letter={id}`; Activity-Log-Eintrag pro Brief existiert.
- [ ] **„Antwort vorschlagen" NICHT implementiert** — kein Versand-Button, keine Antwort-Vorlage. `<WasKannIchTunFooter>` rendert nur Optionen-Liste mit Disclaimer.
- [ ] **System-Prompt-Constraint** „keine Erfolgs-Prognose" ist in `src/lib/ai/system-prompt.ts` ergänzt und Teil des gecachten Prompts; `src/lib/ai/safety.ts` Refusal-Pattern erweitert um „Erfolgsprognose".
- [ ] AI-Tools `erklaere_brief`, `extrahiere_frist`, `vorschlage_naechsten_schritt` sind in `tools.ts` registriert; `TOOL_NAMES` erweitert.
- [ ] **Read/Unread-Persistierung** in `localStorage` funktioniert; UI-Action heißt **„Diesen Brief als gelesen markieren"** (NIE „Lesebestätigung").
- [ ] **Skip-Links** zu „Zusammenfassung" und „Originaltext" auf LetterReader sind tab-erreichbar und funktional.
- [ ] AI-Summary-Block als **`aria-describedby`** des Originaltext-Blocks (Erweiterung, nicht Ersatz).
- [ ] AR-Locale: Summary-Bereich `dir="rtl"`, Originaltext-Bereich `dir="ltr" lang="de"`.
- [ ] Frist-Countdown text-zugänglich (`<span class="sr-only">` für „Frist in N Tagen") — kein Farbe-only.
- [ ] Lighthouse a11y > 95 auf `/(app)/posteingang` und `/(app)/posteingang/[id]`.
- [ ] Alle 6 Sprachen (`de`, `en`, `ru`, `uk`, `ar`, `tr`) haben vollständige `posteingang.*`-Schlüssel; Falsy-Detection rot im Dev-Build.
- [ ] **Persona-Subsets**: Schmidt sieht 5 Briefe aus Mix (Standesamt + FK + KK + FA + BS), Mehmet sieht 5 Briefe aus Mix (FA + IHK + BG + KK + BS), Anna behält ihre 8 Bestands-Briefe — Demo-Walkthrough zeigt alle drei mit demselben Posteingang-UI.
- [ ] Existierende 8 Anna-Briefe bleiben **erhalten** (Extend, nicht Replace); kein Schema-Mismatch beim Reseed.
- [ ] **Letter Activity-Log** wird pro Brief-Öffnung + Summary-Generierung geschrieben; im `/datenschutz`-Cockpit pro Brief abrufbar.
- [ ] `MockBackendEvent`-Subscription in der Inbox-Screen wird beim Unmount sauber abgemeldet (kein Memory-Leak).
- [ ] 5 %-Error-Injection respektiert `?reliable=1` (für Loom-Aufzeichnung).
- [ ] `<NormTooltip>` rendert externe Links mit `target="_blank" rel="noopener noreferrer"`.
- [ ] Behörden-Kategorie-Filter unterstützt **alle 5** Verifier-Kategorien (Bund / Land / Kommunal / Selbstverwaltung / Privatrechtl-aber-behördenartig); Mapping zur existierenden `BehoerdeKategorie`-Enum dokumentiert.
- [ ] Keine Anbindung an ZBP / Mein ELSTER / FIT-Connect simuliert (kein „Sync"-Button, kein „Pull"-Flow).

## Build log — i18n-localizer

- date: 2026-05-09
- locales updated: [en, ru, uk, ar, tr]
- new keys: 195 per locale (full `posteingang.*` namespace mirrored from DE source)
- changed keys: 0 (DE source unmodified — translation-only pass)
- review-needed flags resolved: n/a (initial translation pass for this namespace)
- known gaps:
  - Pre-existing `common.frist.*` deltas (zahlung/einspruch/widerspruch/klage/nachweis/antragstellung/sonstige) and `common.posteingang.label` are present in DE source but absent in all 5 target locales — out of scope for this pass; flag back to product-architect.
  - RU style guide diverges from existing `umzug.*` register: per current i18n-localizer brief, `вы` is now lowercase (conversational-respectful) for new posteingang strings, while existing umzug strings still capitalise `Вы`. Mixed register inside the same RU file should be reconciled in a follow-up sweep.
  - Disclaimer strings (`opening`, `no_legal_advice`, `mock_data`, `original_authoritative`) carry an explicit "the German original is authoritative" suffix per non-DE locale, as mandated by the brief — this is a deliberate addition, not a paraphrase of the DE source content.
  - AR plural forms for `frist_chip_days_template` / `frist_sr_open_template` use full ICU CLDR categories (zero/one/two/few/many/other); requires next-intl AR locale data to be loaded (verify in frontend-coder pass).

## Build log — mock-backend-coder (review-fix pass 2026-05-09)

- date: 2026-05-09
- scope: backend half of code-reviewer 2026-05-09 follow-up; review issues #3, #4, #5.
- types added/changed:
  - `src/types/letter.ts`: added `LetterActivityAktion` alias of `LetterActivityEvent`; doc-string explains drift-guard chain to `schemas.ts`.
  - `src/types/index.ts`: re-export `LetterActivityAktion`.
- schema hardening (`src/lib/mock-backend/schemas.ts`):
  - extracted canonical `letterActivityAktionSchema` (zod-enum, 5 values: `opened_in_app | summary_generated | frist_added_to_calendar | marked_read | archived`); `letterActivityLogEntrySchema.event` now references it.
  - compile-time drift guard `_AssertEq<z.infer<typeof letterActivityAktionSchema>, LetterActivityAktion>` — any future change to either side breaks `tsc`.
- api methods added/changed (`src/lib/mock-backend/api.ts`):
  - `getLetterById(id): Promise<Letter | null>` — non-throwing variant for UI null-paths (existing `getLetter` keeps throw-on-miss semantics).
  - `markLetterAsRead(letterId): Promise<void>` — English alias delegating to `markiereLetterGelesen` (already auto-logs `marked_read`).
  - `protokolliereLetterAktivitaet`: added runtime `letterActivityAktionSchema.safeParse(event)` boundary; rejects legacy values (e.g. `'opened'`) with a `MockBackendError(code: 'INVALID_ACTIVITY_EVENT')` instead of silently writing-then-failing on next read.
- seed data audit:
  - `src/data/letters.json`, `src/data/letter-summaries.json`, `src/lib/mock-backend/seed.ts` checked for pre-seeded activity-log entries with legacy `'opened'` / non-canonical values — none found. Seed initialises `letter-activity-log` as `{}`.
  - all 18 seed letters carry `[MOCK]` literal in both `aktenzeichen` and `body_de`; all 18 have a matching `letter-summaries.json` entry.
- tests added:
  - `tests/unit/aktenzeichen-format.test.ts` (vitest) — 92 assertions covering primary aktenzeichen format per behörde+archetype, secondary `aktenzeichen_weitere` per archetype (Steuer-IdNr / Pass-Nr), `[MOCK]` watermark presence, summary cross-referencing, and orphan-summary check.
  - `vitest.config.ts` — `tests/unit/**/*.test.ts`, node env, alias `@ → src`.
  - `package.json`: new script `test:unit` (`vitest run`); devDependency `vitest@^4.1.5`.
- typecheck: pass (only pre-existing frontend error in `PosteingangInbox.tsx:463` re: `PrototypeDisclaimer` not yet imported — owned by frontend-coder, out of scope).
- lint: pass (same single frontend error, plus one pre-existing unused-disable warning in `WasKannIchTunFooter.tsx:113`; no backend-side warnings).
- unit tests: 1 file, 92 tests, all green.
- known gaps:
  - English aliases (`getLetterById`, `markLetterAsRead`) are additive — frontend continues to use the spec-canonical German names. If they remain unused after frontend-coder's wrapper-deletion pass, they're cheap to remove in a follow-up sweep.
  - Activity-log runtime parse rejects legacy `'opened'` at the boundary; once `src/components/posteingang/posteingang-api.ts` is deleted and `LetterReader.tsx` switches to `'opened_in_app'`, this guard becomes dormant for happy-path usage but stays as a regression fence.

## Build log — frontend-coder (a11y/review revision pass 2026-05-09)

- date: 2026-05-09
- scope: a11y-tester + code-reviewer 2026-05-09 punch list (§A1–A7, §B1, §B2, §B6, §C cleanup).
- screens touched: `/posteingang` (PosteingangInbox) and `/posteingang/[id]` (LetterReader).
- components created:
  - `src/components/posteingang/AktenzeichenSearch.tsx` — WAI-ARIA APG combobox + listbox, debounced 250 ms, wired to `api.searchLettersByAktenzeichen`. Replaces the plain `<Input>` in `LetterListHeader`.
  - `src/components/posteingang/utils/parse-bold-norms.ts` — shared tokenizer used by `AISummaryBlock` + `WasKannIchTunFooter` (no more React-element introspection / duplicated regex).
- components modified:
  - `FristChip.tsx` — overdue palette now `bg-red-50 text-red-900` (≥ 4.5:1, axe 0).
  - `RoterHinweisBanner.tsx`, `AISummaryBlock.tsx`, `PosteingangInbox.tsx` — error/banner colours moved off `text-destructive` (failed contrast) onto `red-50/red-900` parity.
  - `AISummaryBlock.tsx` — bullet entry-animation no longer goes through `opacity 0→1` (caused mid-animation contrast violations); only Y-translate remains.
  - `CitationFootnote.tsx` — Tooltip → base-ui `Popover` with `aria-haspopup="dialog"`, `role="dialog"`, focus-trap, Esc/outside-click close, explicit `id="citation-popover-{n}"`.
  - `LetterListHeader.tsx` — slots `<AktenzeichenSearch>` instead of bare `<Input>`.
  - `LetterListGroup.tsx` — dropped per-group `aria-live`; outer `#letter-list` region carries the single live-region.
  - `BehoerdenKategorieFilterSidebar.tsx` — every checkbox carries `aria-controls="letter-list"`.
  - `PosteingangInbox.tsx` — new `<a href="#letter-list">` skip-link; Hero now shows collapsible `posteingang.disclaimer.opening` banner; footer uses extended `<PrototypeDisclaimer messageKey="posteingang.disclaimer.mock_data" titleKey="…mock_data_title">`; `#letter-list` is a stable `role="region" aria-live="polite"` wrapper present in every state (loading, empty, list) so `aria-controls` always resolves; replaced inner `<ol>` (had `<section>` children → invalid) with plain `<div>` containers.
  - `LetterCard.tsx` — non-actionable inner blocks marked `pointer-events-none`; interactive `VorgangsBuendelTag*` and the new `<DatenschutzCockpitLink>` re-enable `pointer-events-auto`. Click on aktenzeichen text now navigates.
  - `DatenschutzCockpitLink.tsx` — converted from RSC (`getTranslations`) to client (`useTranslations`); new `letterId` prop emits `?letter={id}`; new `variant` prop selects label key (Umzug call-site keeps default).
  - `PrototypeDisclaimer.tsx` — accepts `messageKey` + `titleKey` props for namespace-agnostic reuse (default behaviour unchanged).
  - `LetterReader.tsx` — switched to `import { api } from '@/lib/mock-backend'`; activity log enum aligned to `'opened_in_app'`; removed dead `lettersIdRef`; `document.getElementById('original')` replaced by ref method `originalRef.current?.scrollIntoView()`; redundant top-level activity-log write for `summary_generated` removed (mock-backend writes it internally); `<DatenschutzCockpitLink letterId={letter.id} variant="posteingang-card">`.
  - `OriginaltextBlock.tsx` — removed nested `<MockWatermarkBanner>` (kept once at LetterReader level); added `scrollIntoView()` method via `useImperativeHandle`.
  - `LetterDetailLoader.tsx` — replaced dynamic `await import('@/lib/mock-backend')` with static import; routed via `api` directly.
  - `NeuerVorgangAusBriefModal.tsx` — switched to `api.erstelleVorgangAusBrief` directly.
  - `WasKannIchTunFooter.tsx` — uses `useMessages()` + safe key lookup (no try/catch), warns in dev when a key is missing instead of silently rendering the id; bullet rendering uses shared `parseBoldAndNorms` helper.
  - `VorgangsGruppe.tsx` — stray `<input type="hidden" data-vorgang-id>` removed; metadata moved onto the `<ul>` itself.
- files deleted:
  - `src/components/posteingang/posteingang-api.ts` (169-line wrapper with the `as unknown as Record<string, unknown>` cast — every call-site now imports `api` from `@/lib/mock-backend` directly).
- i18n keys added (DE source, mirrored to EN/RU/UK/AR/TR):
  - `posteingang.skip_link.zur_brief_liste` (new top-level skip-link key)
  - `posteingang.list.region_label` (label for the new `<div role="region">` wrapper)
- spec edits: §4.1 a11y note rewrote `<main>`-collision line into the explicit „page content lives inside layout's `<main>`; inbox uses `<section aria-labelledby='posteingang-hero-title'>`" guidance (per A4).
- typecheck: pass (`tsc --noEmit` 0 errors).
- lint: pass (`next lint` 0 warnings).
- a11y harness: `npx playwright test tests/a11y/posteingang.spec.ts --project=a11y` — 3/3 passed; inbox 0 violations, reader 0 violations, AR-RTL flip OK. Both summary lines `[A11Y posteingang-inbox-summary] []` and `[A11Y posteingang-reader-summary] []`.
- Lighthouse a11y on `/posteingang` (headless, dev server): score 95 (matches threshold ≥ 95).
- known gaps: none new. The `extrahiereAktion` mock-backend latency (1.5–3.5 s) means the lazy-loaded summary is briefly absent on slow runs — this is inherent demo behaviour, not a frontend defect.
- next: code-reviewer.
