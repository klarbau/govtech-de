---
feature: redesign-termine
title: Termine — Behördentermine, Erinnerungen & Buchungen (Redesign aus Prototyp 03)
status: shipped
track: supporting
date: 2026-05-27
author: product-architect
authorization: docs/demo-spine.md § "ACTIVE BUILD (decided 2026-05-27)" — user-supplied complete visual prototype; research/domain/verify waived per spine note.
owner_agents: [frontend-coder, mock-backend-coder, i18n-localizer, a11y-tester, code-reviewer]
inputs:
  prototype: docs/design-prototype/03-termine.png
  foundation: docs/specs/redesign-foundation.md  (token + primitive CONTRACT — reference, do not redefine)
  data_model: src/types/termin.ts, src/data/termine.json, src/types/vorgang.ts, src/data/behoerden.json
gates: depends on redesign-foundation APPROVE. Current page is a 5-line stub.
---

> **Foundation contract.** Tokens, shell, and shared primitives (`StatusBadge`, `PageHeader`,
> `RightRailCard`, `IconCircle`, `ListRow`, `SectionCard`, `EmptyState`, `Button`, `FristCountdown`,
> `BehoerdenBadge` farb-frei) come from `redesign-foundation.md`. This spec only consumes them.

## 1. Problem statement

Bürger:innen jonglieren Behördentermine, Fristen und private Buchungen über Kalender, Briefe und Portale verteilt — und verpassen Fristen. Termine bündelt alle Termine + Erinnerungen an einem Ort, mit Monatskalender, „Nächste Termine"-Hervorhebung, ICS-Export und einer Vorbereitungs-Checkliste, damit niemand unvorbereitet oder zu spät kommt.

## 2. Persona & journey

- **Persona**: Anna Petrov (`anna-petrov`) als Demo-Default — bestehende Termine: AOK-Video-Beratung + Finanzamt-ELSTER-Präsenztermin; dazu ein Aufenthaltstitel-Verlängerungstermin bei der LEA Berlin (Prototyp-Hero). Schmidt/Mehmet liefern Variationen.
- **Trigger**: Bürger:in will wissen „was steht als Nächstes an, wo, wann, was muss ich mitbringen?".
- **Outcome**: Nächster Termin erkannt, in den eigenen Kalender exportiert (ICS), Vorbereitung abgehakt, Fristen im Blick.
- **Time saved vs status quo**: „Termine + Fristen aus 4 Briefen/Portalen manuell in den Kalender übertragen (~30 Min) → ein Klick ICS-Export + Checkliste."

## 3. Success criteria for the demo

- [ ] Viewer erkennt den nächsten Termin (Behörde, Datum, Adresse, Bestätigt-Status) in < 5 s.
- [ ] Monatskalender markiert ausgewählten Tag, heute, und Tage mit Ereignissen.
- [ ] ICS-Export erzeugt eine valide `.ics`-Datei (echter Download, mock-Inhalt).
- [ ] Fristen-Überblick zeigt „In X Tagen"-Badges (warning/danger nach Nähe).
- [ ] Spekulatives-Feature-Hinweis sichtbar (`contextChip` tone `speculative`, da Kalender-Integration 2027-Vision).
- [ ] Lighthouse a11y > 95 auf `/termine`; axe 0 kritisch.

## 4. Screen-by-screen flow

### 4.1 Screen: Termine-Übersicht

- **Route**: `/termine`
- **File**: `src/app/(app)/termine/page.tsx` (RSC shell) + `src/components/termine/TermineView.tsx` (`'use client'` — hält Kalender-Auswahl + Filter-Checkboxen-State).
- **Server or client**: RSC-Page lädt `api.getTermine()`, `api.getBehoerden()`, `api.getVorgaenge()` (für Frist-Ableitung) und `api.getReminders()` (NEW, § 6). `TermineView` ist Client (Kalender-Interaktion, Filter).
- **Layout** (Prototyp 03): dreispaltig — links Kalender + Filter (~¼), Mitte Termin-Liste (~½), rechts Detail-Rail (~¼).

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│ Termine                                              [Spekulatives Demo-Feature]   │
│ Behördentermine, Erinnerungen und Buchungen an einem Ort.                          │
├───────────────┬───────────────────────────────────┬──────────────────────────────┤
│  ‹ Mai 2025 › │ Nächste Termine                    │ Nächster Schritt             │
│  Mo Di … So   │ ┌───────────────────────────────┐  │ LEA Berlin —                 │
│  . 1 2 …      │ │ 🏛 LEA Berlin — Aufenthalts-  │  │ Aufenthaltstitel verlängern  │
│  …  [28] …    │ │    titel verlängern  [Bestätigt]│  │ Do, 05.06.2025 14:30         │
│               │ │ Do, 05.06.2025 · 14:30        │  │ 📍 Adresse                   │
│  Filter       │ │ 📍 Friedrich-Krause-Ufer 24   │  │ Buchungsreferenz …           │
│  ☑ Behörden-  │ │ Buchungsref. LEA-2025-…       │  │ [ICS] [Details anzeigen]     │
│    termine ●  │ │ [ICS exportieren] [Details]   │  │ ────────────────────────────│
│  ☑ Erinnerun- │ └───────────────────────────────┘  │ Gut vorbereitet zum Termin   │
│    gen/Fristen│ Weitere Termine & Erinnerungen     │ ☐ Reisepass mitbringen       │
│  ☑ Buchungen  │ • 🏛 Bürgeramt — Ummeldung  Det.   │ ☐ Aufenthaltstitel (alt)     │
│  ☐ Abgeschl.  │ • 🔔 Kindergeld-Nachweis    [Frist]│ ☐ Biometrisches Foto         │
│               │ • 🧾 Steuererklärung 2024   [Frist]│ ────────────────────────────│
│               │ • 📺 Rundfunkbeitrag        Det.   │ Fristen im Überblick         │
│               │ [Alle Termine anzeigen]            │ • Steuer 2024  In 35 Tagen   │
└───────────────┴───────────────────────────────────┴──────────────────────────────┘
```

- **Components used**:
  - `PageHeader` (B2) — title `termine.title`, subtitle `termine.subtitle`, `contextChip` tone `speculative`.
  - `<NEW> MonthCalendar` (`src/components/termine/MonthCalendar.tsx`, client) — Monatsraster mit prev/next (`ChevronLeft`/`ChevronRight`), Markern: ausgewählter Tag (Primary-Pill), heute (Ring/Outline), Tage-mit-Ereignis (Dot in Kategorie-Farbe). Auswahl filtert die Termin-Liste auf den Tag (oder zeigt alle, wenn kein Tag gewählt).
  - `<NEW> TermineFilter` (`src/components/termine/TermineFilter.tsx`, client) — 4 Checkboxen mit farbigem Dot je Kategorie (Behördentermine / Erinnerungen-Fristen / Buchungen / Abgeschlossen). Nutzt foundation `Checkbox`. Dots: Behördentermine = primary, Erinnerungen/Fristen = warning, Buchungen = success, Abgeschlossen = muted.
  - `<NEW> NaechsterTerminCard` (`src/components/termine/NaechsterTerminCard.tsx`) — hervorgehobene Card (`SectionCard variant="soft"` oder Border-Highlight) für den nächsten Termin: `IconCircle` (Behörde), Behörde + Betreff, Datum/Uhrzeit (`tabular-nums`), Adresse, Buchungsreferenz (`tabular-nums`), `StatusBadge` (`bestaetigt`/`gebucht`/`abgesagt`), zwei Aktionen „ICS exportieren" (`outline`) + „Details" (`default`).
  - `ListRow` (B10) — „Weitere Termine & Erinnerungen": je Zeile `IconCircle` + Titel + Subtitel (Datum/Behörde) + rechts `StatusBadge`/`FristCountdown` + „Details"-Link.
  - `RightRailCard` (B4) ×3 — „Nächster Schritt" (Detail des selektierten/nächsten Termins), „Gut vorbereitet zum Termin" (Checkliste), „Fristen im Überblick".
  - `<NEW> TerminVorbereitungChecklist` (`src/components/termine/TerminVorbereitungChecklist.tsx`, client) — Checkliste mit `Checkbox`-Items (Demo-State, client-only — kein Persist). Items aus dem Termin-Datensatz (`vorbereitung[]`, § 6).
  - `FristCountdown` (foundation restyle) + `StatusBadge` (B1) — „In X Tagen"-Badges im Fristen-Überblick (warning ≤ 30 Tage, danger ≤ 7 Tage).
  - `EmptyState` (B14) — gefilterter Tag/Filter ohne Termine.
  - `Button` (restyle) — ICS-Export, Details, „Alle Termine anzeigen".
  - `<NEW> TerminDetailDialog` (`src/components/termine/TerminDetailDialog.tsx`, client) — optional; „Details"-Klick öffnet Dialog mit voller Termin-Info + Vorgang-Verknüpfung. **Minimal-Variante zulässig**: „Details" navigiert/expandiert die Rail statt eigenem Dialog. Frontend-coder wählt; bevorzugt Rail-Update (weniger Komponenten).
- **Data fetched**: `api.getTermine()`, `api.getReminders()` (NEW), `api.getBehoerden()`, `api.getVorgaenge()`.
- **i18n keys introduced**: siehe § 8.
- **States**:
  - loading — Kalender-Skeleton + 3 ListRow-Skeletons.
  - empty (keine Termine + keine Erinnerungen) — `EmptyState` icon `CalendarDays`, title `termine.empty.title`.
  - empty (Filter/Tag ohne Treffer) — `EmptyState` title `termine.empty.filter_title`.
  - success — Kalender + Liste + Rail.
  - error — `termine.error` + Retry.
- **Accessibility notes**:
  - Genau ein `<h1>`. Rail-Card-Titel + „Nächste Termine"/„Weitere Termine" als `<h2>`.
  - `MonthCalendar` = `role="grid"` mit `role="gridcell"`-Tagen; Pfeil-Navigation per Tastatur; ausgewählter Tag `aria-selected`, heute `aria-current="date"`. Tage mit Ereignis: Marker nicht nur farblich — `aria-label` inkl. „— Termin" (Farbe + Text, HL-DS).
  - Filter-Checkboxen: Kategorie-Dot ist dekorativ (`aria-hidden`), Label trägt die Bedeutung.
  - Datum/Uhrzeit/Buchungsreferenz `tabular-nums` (HL-DS-6).
  - ICS-Download-Button echter Download mit `aria-label` inkl. Termin-Betreff.
  - `FristCountdown` „In X Tagen": Zahl + Wort, nicht nur Farbe.

### 4.2 ICS-Export

- Klick „ICS exportieren" generiert client-seitig eine `.ics`-Datei (VEVENT mit DTSTART/DTEND aus `termin.datum` + 60 Min Default, SUMMARY = Betreff, LOCATION = `ort.details`, DESCRIPTION inkl. `[MOCK]`-Hinweis + Buchungsreferenz) und triggert Download via Blob-URL. Reiner Frontend-Helper `buildIcs(termin, behoerde)` — **kein Backend-Call**.

### 4.3 Kategorien & Marker

| Kategorie | Quelle | Dot-Farbe | StatusBadge |
|---|---|---|---|
| Behördentermin | `Termin` mit `ort.typ` praesenz/video/telefon | primary | `bestaetigt`/`gebucht`/`abgesagt` |
| Erinnerung/Frist | `Reminder` (NEW) bzw. `Vorgang.fristen[]` | warning | `FristCountdown` „In X Tagen" |
| Buchung | `Termin` (privat/Service-Buchung) | success | `bestaetigt` |
| Abgeschlossen | `Termin.status` vergangenes Datum / erledigt | muted | `abgeschlossen` |

## 5. Autopilot logic

Nicht anwendbar. Termine ist Lese-/Organisationsschicht. Verknüpfung zu Autopilot nur indirekt: ein Termin/eine Frist kann `vorgang_id` tragen → „Details" verlinkt auf den Vorgang (Vorgänge-Screen, separate Spec). Keine Kaskade hier.

## 6. Data model additions / changes

### Type-Änderung: `src/types/termin.ts` (additiv)

```ts
export interface TerminVorbereitungItem {
  /** i18n-Key der Checklisten-Zeile. */
  label_i18n_key: string;
}

export interface Termin {
  // … bestehende Felder unverändert …
  /** Buchungsreferenz für die Anzeige (`tabular-nums`). z. B. "LEA-2025-04412". */
  buchungsreferenz?: string;
  /** Vorbereitungs-Checkliste (Demo, client-abhakbar). */
  vorbereitung?: TerminVorbereitungItem[];
  /** Optionale Kategorie-Markierung für Filter; sonst aus `ort.typ` abgeleitet. */
  kategorie?: 'behoerdentermin' | 'buchung';
}
```

### New type: `src/types/termin.ts` — `Reminder`

```ts
export type ReminderKategorie = 'frist' | 'erinnerung';

export interface Reminder {
  id: string;
  /** Bezug zur Behörde (für IconCircle + Name). */
  behoerde_id?: BehoerdeId;
  /** Optionaler Vorgangs-Bezug (Frist eines Vorgangs). */
  vorgang_id?: string;
  /** Anzeige-Titel ("Kindergeld-Nachweis fällig", "Steuererklärung 2024"). */
  titel: string;
  /** ISO-Datum der Frist/Erinnerung. */
  datum: string;
  kategorie: ReminderKategorie;
  /** Maschinenlesbarer Frist-Typ, falls aus Vorgang ("bmg_17", …). */
  frist_typ?: string;
}
```

### Mock-backend additions — `api.ts`

- **`getTermine()` — bestehend, behaviour UNVERÄNDERT** (liefert sortierte `Termin[]`). Neue optionale Felder (`buchungsreferenz`, `vorbereitung`) fließen aus dem Seed.
- **`<NEW> getReminders(): Promise<Reminder[]>`** — liefert Erinnerungen/Fristen der aktiven Persona, sortiert nach `datum` aufsteigend. V1: aus Seed (`src/data/reminders.json`) + abgeleitet aus `Vorgang.fristen[]` (für jede offene Frist eines aktiven Vorgangs ein `Reminder` mit `kategorie: 'frist'`). Mit `withLatency`. **Hand-off note für assistant-engineer: künftiges Tool `get_reminders` spiegelt diese Methode.**
- **`<NEW> getNaechsterTermin(): Promise<Termin | null>`** — Komfort-Read: der zeitlich nächste zukünftige Termin (Status ≠ abgesagt). **Optional** — Frontend kann auch client-seitig aus `getTermine()` ableiten. **Empfehlung: NICHT bauen** (Frontend leitet ab), hier nur dokumentiert.

> Verbindlich NEU: nur **`getReminders()`**. `getNaechsterTermin` ist Frontend-Ableitung.

### Seed-data extension

1. **`src/data/termine.json` — ERWEITERN.** Aktuell 2 Anna-Termine. Hinzufügen:
   - **LEA-Berlin-Aufenthaltstitel-Termin** (Prototyp-Hero): `behoerde_id: "abh-berlin-lea"`, `ort.typ: "praesenz"`, `ort.details: "Landesamt für Einwanderung — Friedrich-Krause-Ufer 24, 13353 Berlin"`, `status: "bestaetigt"`, `betreff: "Aufenthaltstitel verlängern"`, `buchungsreferenz: "LEA-2025-04412"`, `vorbereitung: [Reisepass, alter Aufenthaltstitel, biometrisches Foto, Gebühr]`, `vorgang_id` falls vorhanden. Datum: nächster zukünftiger Termin relativ zur Demo-Zeit.
   - **Bürgeramt-Ummeldung** (`buergeramt-berlin-friedrichshain-kreuzberg` oder `-mitte`), `betreff: "Anmeldung neuer Wohnort"`, mit `buchungsreferenz` + `vorbereitung`.
   - Optional bestehende AOK/Finanzamt-Termine behalten (liefern „Weitere Termine").
2. **`src/data/reminders.json` — NEU.** mock-backend-coder legt an + `import` in `seed.ts` + `readOrInit`-Bucket `reminders` + zod-Schema `remindersArraySchema`. Inhalt für Anna (reale Behörden, `[MOCK]`-Konvention):
   - „Kindergeld-Nachweis fällig" — `behoerde_id: "familienkasse-berlin-brandenburg"`, `kategorie: "frist"`, Datum ~ in 20 Tagen.
   - „Steuererklärung 2024 abgeben" — `behoerde_id: "finanzamt-koerperschaften-i-berlin"`, `kategorie: "frist"`, Datum ~ in 35 Tagen (synchron zur Steuer-Spec § 9!).
   - „Rundfunkbeitrag — Abbuchung" — `behoerde_id: "beitragsservice-koeln"`, `kategorie: "erinnerung"`.
   - Mindestens eine Frist mit Datum ≤ 7 Tagen, damit der danger-`FristCountdown` sichtbar wird.

> **Cross-Spec-Konsistenz:** Die Steuer-Frist hier muss mit `redesign-steuer.md` § 9 „Wichtige Fristen" datumsgleich sein.

### Persistence keys (localStorage)

- Neuer Bucket `reminders` (analog `termine`). Migration: bei fehlendem Bucket aus Fixture seeden (idempotent über bestehenden `seedIfEmpty`-Mechanismus).
- Checklisten-Abhak-Zustand = **ephemerer Client-State** (kein Persist — jeder Demo-Lauf frisch).
- Kalender-Auswahl + Filter = ephemerer Client-State.

## 7. AI assistant integration

Nicht in dieser Iteration. (Künftig: Tool „termin buchen / verschieben / frist erinnern" — out of scope hier.)

## 8. i18n

Alle Keys unter `termine.*` neu; `track: supporting` → DE-Source + 6 Locales `needs_review`. **`common.show_all`, `common.context_chip.speculative`, `common.empty.*`** + Status-Labels `common.status.*` aus Foundation reusen.

| Key | DE source value |
|---|---|
| `termine.title` | „Termine" |
| `termine.subtitle` | „Behördentermine, Erinnerungen und Buchungen an einem Ort." |
| `termine.calendar.prev` | „Vorheriger Monat" |
| `termine.calendar.next` | „Nächster Monat" |
| `termine.calendar.today` | „Heute" |
| `termine.calendar.has_events` | „{count, plural, =1 {1 Termin} other {# Termine}}" |
| `termine.filter.title` | „Filter" |
| `termine.filter.behoerdentermine` | „Behördentermine" |
| `termine.filter.erinnerungen` | „Erinnerungen & Fristen" |
| `termine.filter.buchungen` | „Buchungen" |
| `termine.filter.abgeschlossen` | „Abgeschlossen" |
| `termine.naechste.title` | „Nächste Termine" |
| `termine.weitere.title` | „Weitere Termine & Erinnerungen" |
| `termine.card.buchungsreferenz` | „Buchungsreferenz {ref}" |
| `termine.card.ics` | „ICS exportieren" |
| `termine.card.ics_aria` | „Termin {betreff} als ICS exportieren" |
| `termine.card.details` | „Details" |
| `termine.card.details_anzeigen` | „Details anzeigen" |
| `termine.naechster_schritt.title` | „Nächster Schritt" |
| `termine.vorbereitung.title` | „Gut vorbereitet zum Termin" |
| `termine.vorbereitung.reisepass` | „Reisepass mitbringen" |
| `termine.vorbereitung.alter_titel` | „Alten Aufenthaltstitel mitbringen" |
| `termine.vorbereitung.biometrie` | „Biometrisches Passfoto mitbringen" |
| `termine.vorbereitung.gebuehr` | „Bearbeitungsgebühr bereithalten" |
| `termine.vorbereitung.meldung` | „Wohnungsgeberbestätigung mitbringen" |
| `termine.fristen.title` | „Fristen im Überblick" |
| `termine.fristen.in_tagen` | „In {count, plural, =0 {heute fällig} =1 {1 Tag} other {# Tagen}}" |
| `termine.ort.video` | „Video-Termin" |
| `termine.ort.telefon` | „Telefontermin" |
| `termine.ort.praesenz` | „Vor Ort" |
| `termine.empty.title` | „Keine Termine" |
| `termine.empty.description` | „Sie haben aktuell keine anstehenden Termine." |
| `termine.empty.filter_title` | „Keine Termine für diese Auswahl" |
| `termine.error` | „Termine konnten nicht geladen werden." |

## 9. Edge cases

- **Kein zukünftiger Termin** → „Nächste Termine"-Card zeigt EmptyState; Rail „Nächster Schritt" fällt auf nächste Frist zurück.
- **Termin in der Vergangenheit** → Kategorie „Abgeschlossen", grau, nur sichtbar wenn Filter „Abgeschlossen" aktiv.
- **Termin abgesagt** (`status: 'abgesagt'`) → `StatusBadge` danger-getönt „Abgesagt", nicht als „nächster Termin" gezählt.
- **Frist ≤ 0 Tage (heute/überfällig)** → `FristCountdown` danger, „heute fällig" / „überfällig".
- **Reminder ohne `behoerde_id`** → neutraler `IconCircle` (lucide `Bell`), kein Behördenname.
- **Latenz-Fehler (5 %)** → Error-State + Retry; Kalender bleibt bedienbar (zeigt leere Liste, kein Crash).
- **Monat ohne Ereignisse** → Kalender zeigt keine Dots; Liste zeigt EmptyState für gewählten Tag.
- **RTL (AR)**: Kalender-Wochenstart + Pfeil-Richtung spiegeln; Uhrzeiten/Referenzen `dir="ltr"`.

## 10. Out of scope (explicit)

- **Echte Terminbuchung / Umbuchung / Stornierung** — read-only; keine Behörden-Buchungs-API.
- **Echte Kalender-Sync (CalDAV/Google/Outlook)** — nur ICS-Datei-Export; kein Live-Sync (das ist die 2027-Vision → `speculative` chip).
- **Push-/E-Mail-Erinnerungen** — keine echten Notifications; Erinnerungen sind nur Anzeige.
- **Termin-Detail-Vorgang-Deeplink-Vollausbau** — „Details" zeigt Rail-Detail; tiefe Vorgang-Verknüpfung in der Vorgänge-Spec.
- **Pro-Persona-Ausbau Schmidt/Mehmet** — Fokus Anna; ihre bestehenden Termine bleiben.

## 11. Review checklist (for code-reviewer)

- [ ] Keine hardcoded Strings — alle über `t()`; `termine.*` in `de.json` + 6 Locales.
- [ ] Status-Labels via `common.status.*` (nicht dupliziert).
- [ ] Mock-backend-Latenz über `getTermine()` + `getReminders()`.
- [ ] `MonthCalendar` = `role="grid"`; ausgewählt `aria-selected`, heute `aria-current="date"`; Ereignis-Marker nicht nur farblich (aria-label-Text).
- [ ] Filter-Checkbox-Dots dekorativ (`aria-hidden`); Label trägt Bedeutung.
- [ ] `tabular-nums` auf Datum/Uhrzeit/Buchungsreferenz + Frist-Zahlen (HL-DS-6).
- [ ] ICS-Export liefert valide `.ics` (Blob-Download), DESCRIPTION enthält `[MOCK]`-Hinweis.
- [ ] `FristCountdown` „In X Tagen" Zahl + Wort, warning ≤ 30 / danger ≤ 7.
- [ ] Steuer-Frist datumsgleich mit `redesign-steuer.md` § 9.
- [ ] Alle Behörden zitieren reale IDs aus `data/behoerden.json`.
- [ ] `reminders`-Bucket idempotent geseedet; Checkliste/Filter/Kalender-State nicht persistiert.
- [ ] `prefers-reduced-motion`: Kalender-/Card-Transitions ≤ 200ms Opacity (HL-DS-4).
- [ ] Genau ein `<h1>`; Sektions-/Rail-Titel als `<h2>`.

---

## Build log — mock-backend-coder

- date: 2026-05-27
- types changed (additive): `src/types/termin.ts` — `Termin.buchungsreferenz?`, `Termin.vorbereitung?: TerminVorbereitungItem[]`, `Termin.kategorie?: TerminKategorie`; new types `Reminder`, `ReminderKategorie`, `TerminVorbereitungItem`, `TerminKategorie`. Barrel updated.
- api: `getTermine()` behaviour UNCHANGED (new optional fields flow from seed). NEW `getReminders(): Promise<Reminder[]>` (`reminders/api.ts`, `withLatency`) — Seed-Bucket `reminders` + derived from `Vorgang.fristen[]` of active vorgaenge (dedupe, sorted by datum asc). `getNaechsterTermin` deliberately NOT built (frontend derivation).
- seed records: `src/data/termine.json` extended 2 -> 4: LEA-Berlin Aufenthaltstitel hero termin (2026-06-05, status bestaetigt, buchungsreferenz `[MOCK] LEA-2026-04412`, 4 vorbereitung items, vorgang_id `vorgang-anna-aufenthaltstitel-2027-stub`) + Buergeramt-Friedrichshain-Kreuzberg Ummeldung (2026-06-11, buchungsreferenz + 2 vorbereitung items); AOK/Finanzamt termine retained. NEW `src/data/reminders.json` (4 Anna reminders): Kindergeld-Nachweis (familienkasse-berlin-brandenburg, 2026-06-16), Aufenthaltstitel-Unterlagen (abh-berlin-lea, 2026-06-02 = 6 days = danger countdown <=7d), Steuererklaerung 2024 (finanzamt-koerperschaften-i-berlin, 2025-07-31), Rundfunkbeitrag (beitragsservice-koeln, erinnerung).
- buckets: NEW `reminders` (analog `termine`) wired into `seedIfEmpty` (idempotent readOrInit) + `seedForPersona` (reseed). zod `remindersArraySchema` added. Checklist/Filter/Kalender state stays ephemeral client-side.
- CROSS-SPEC LOCK honoured: Steuererklaerung-2024 Abgabefrist = `2025-07-31` identical in reminders.json + steuer.json.
- typecheck: pass. unit suite: 639/639 pass.
- known gaps: Schmidt/Mehmet termine/reminders not expanded (Anna-only per §10). Steuer reminder date 2025-07-31 is in the past relative to demo-now (2026-05-27) per the explicit cross-spec lock; the danger <=7d countdown is provided by the Aufenthaltstitel reminder instead.

## Build log — frontend-coder

- date: 2026-05-27
- screens implemented: `/termine` (was a 5-line stub) — 3-column layout: left = MonthCalendar + checkbox Filter; center = "Nächste Termine" highlighted card + "Weitere Termine & Erinnerungen" list; right = "Nächster Schritt" detail + Vorbereitungs-Checklist + "Fristen im Überblick".
- components created:
  - `src/app/(app)/termine/page.tsx` (RSC shell; SSR-stable `nowIso`).
  - `src/components/termine/TermineView.tsx` (client; calendar selection + filter checkboxes + detail state; loads getTermine/getReminders/getBehoerden).
  - `src/components/termine/MonthCalendar.tsx` (client; keyboard-navigable grid — see a11y pattern below).
  - `src/components/termine/TermineFilter.tsx` (client; 4 checkboxes, decorative colour dots `aria-hidden`).
  - `src/components/termine/NaechsterTerminCard.tsx` (client; highlighted card, IconCircle/StatusBadge, ICS + Details).
  - `src/components/termine/TerminVorbereitungChecklist.tsx` (client; ephemeral check state, resets on termin change).
  - `src/components/termine/buildIcs.ts` (pure helper: RFC-5545 VEVENT, UTC stamps, escaped TEXT, 60-min default, DESCRIPTION carries `[MOCK]` notice + Buchungsreferenz; `downloadIcs` Blob download).
- foundation primitives reused: PageHeader, SectionCard, RightRailCard, ListRow, IconCircle, StatusBadge, EmptyState, Button, Checkbox.
- i18n keys added (DE source only, `de.json`): full `termine.*` subtree (title/subtitle, calendar.{prev,next,today,label,weekday_long.*,weekday_short.*,has_events,day_aria,day_events_suffix}, filter.*, naechste/weitere.title, card.*, naechster_schritt.title, vorbereitung.*, fristen.{title,in_tagen,ueberfaellig}, ort.*, empty.*, error). context_chip.speculative + status labels reuse `common.*`. de.json JSON.parse OK.
- **MonthCalendar a11y pattern**: WAI-ARIA grid — outer `role="grid"` (labelled), `role="row"` weeks (+ a `role="row"` of `role="columnheader"` weekday cells with full-name `aria-label` and visual short label `aria-hidden`), `role="gridcell"` day wrappers. **Roving tabindex**: exactly one focusable day button (`tabIndex 0`, the rest `-1`), anchored on the active day; focus is restored via a ref+effect when the active day moves by keyboard. Keys: Arrow=±1 day / ±1 week, Home/End=week edges, PageUp/PageDown=±1 month (auto-advances visible month), Enter/Space=toggle selection. **Selection + today live on the gridcell** (`aria-selected` / `aria-current="date"`) — NOT on the inner `<button>` (jsx-a11y: button's implicit role rejects aria-selected). The button carries the full accessible name via `aria-label`. Event markers are exposed in that `aria-label` as text ("— N Termine"), never colour-only; the visual dot is `aria-hidden`. Month label `aria-live="polite"`. 6-week stable grid height.
- ICS export = real `.ics` Blob download (center card + rail "Nächster Schritt" button), `aria-label` includes the Betreff.
- a11y (rest): one `<h1>` (PageHeader); "Nächste Termine"/"Weitere"/rail titles as `<h2>`; filter dots decorative; `tabular-nums` + `dir="ltr"` on date/time/Buchungsreferenz/Frist numbers (HL-DS-6, RTL § 9); Fristen badges carry number+word via StatusBadge (warn ≤30d / danger ≤7d); loading skeletons `motion-reduce:animate-none`.
- prototype-match notes: chose the **Rail-update Details path** (spec § 4.1 preferred) over a separate `TerminDetailDialog` — "Details" sets the rail's "Nächster Schritt"/Checklist to the clicked termin; fewer components, no extra dialog. The Fristen-Überblick is driven by `reminders` of kategorie `frist`; per the cross-spec lock the Steuer-2024 reminder (2025-07-31) is past → shows "überfällig" (danger), and the Aufenthaltstitel reminder (2026-06-02, 6d) provides the live danger ≤7d countdown.
- typecheck: pass. lint: pass (0 warnings/errors on termine dir). unit suite: 639/639 pass. smoke `/termine` HTTP 200, calendar + headers + Fristen render, no runtime errors.
- known gaps (for code-reviewer): (1) calendar focus-restoration uses a ref+effect (no `requestAnimationFrame`/`document.contains` guard — base-ui dialogs aren't involved here, grid is always mounted); a11y-tester should verify focus lands correctly after PageUp/PageDown month change. (2) Detail rail falls back to the next termin when nothing is clicked; reminders aren't clickable into the rail (only termine have detail). (3) AOK video termin (2026-05-21) is past relative to demo-now → only visible under the "Abgeschlossen" filter (off by default).
- next: a11y-tester (MonthCalendar keyboard grid is the priority audit — arrows/Home/End/PageUp/PageDown/Enter, aria-selected on gridcell, event-marker text-not-colour; plus checkbox filters + ICS button label), then code-reviewer; i18n-localizer for non-DE locales (supporting track).

## Build log — frontend-coder (rebuild)

- date: 2026-05-30
- context: a prior "redesign sweep" had replaced the accessible/interactive Termine with a visual-only literal HTML port (decorative calendar, hardcoded German, RED a11y suite). This rebuild restores the accessible+interactive behaviour ON the prototype-v2 look.
- screens implemented: `/termine` (full re-wire).
- components created/modified:
  - `src/components/termine/MonthCalendar.tsx` (recreated; WAI-ARIA grid, roving tabindex, keyboard nav, today=ring/dark-text for contrast, event dot + aria-label text marker, styled to prototype `.cal`).
  - `src/components/termine/TermineFilter.tsx` (recreated; `<fieldset>`/`<legend>`, 4 shared `Checkbox` + decorative `aria-hidden` colour dots).
  - `src/components/termine/TermineView.tsx` (rebuilt; keeps `.tm-layout`/`.tm-card`/`.tm-next`/`.tm-list-item`/`.ns-card`/`.prep-card` look; day-selection filtering + selected-day chip + "Auswahl aufheben"; loading skeleton w/ `.animate-pulse`; error state + retry; ICS export; deferred `api.subscribe` SSE; reschedule dialog w/ 3 slots; detail dialog — both via shared focus-trapped `Dialog`).
  - `src/app/prototype-v2.css` (responsive: `.tm-layout` → 2-col <1024px, 1-col <720px; `.prep-card h3`).
- dead controls fixed: list rows now open detail dialog (termine) / link to Vorgang (reminders w/ vorgang_id); "Fristen im Überblick" renders ALL fristen as a real list with count == items (removed circular `#fristen` self-link); "Alle Termine anzeigen" now toggles the Abgeschlossen filter with state-reflecting label; "Nächster Schritt" status badge reflects actual status; +7d blind verschieben replaced by reschedule dialog; hand-rolled modal replaced by shared Dialog.
- i18n keys added (DE source only, de.json): termine.status.{gebucht,bestaetigt,verschoben,abgesagt}, termine.marker.erinnerung, termine.auswahl.{label,aufheben}, termine.alle_anzeigen.{show,hide}, termine.detail.status_label, termine.reschedule.{title,intro,confirm}, termine.action.verschoben, termine.naechster_schritt.{kein_termin,vorerinnerung_titel,vorerinnerung_text,storno_titel,storno_text}, termine.retry, termine.fristen_offen, termine.frist_praefix, termine.faellig_praefix, termine.uhr_dauer, common.actions.abbrechen.
- typecheck: pass. lint: not-run (env issue — `next lint`/eslint fail to load `eslint-config-next` under ESLint 9 patch, before evaluating any source; code follows project conventions).
- a11y gate: `tests/a11y/redesign-termine.spec.ts` → 10/11 pass (axe LIGHT de+ar, RTL, landmarks/headings [1,2,2,2,3,3], grid 42 cells / 7 columnheaders / roving=1, keyboard nav+Enter select, out-of-month contrast 6.35, event-marker text, 4 filter checkboxes, Frist-badge contrast 5.50). The 1 failure is `axe DARK termine de` — a PRE-EXISTING GLOBAL chrome bug (sidebar/header brand tokens `--brand-900`/`--ink-2` not flipped under `.dark`; identical failure on `redesign-dashboard.spec.ts` DARK). NOT in termine scope; my termine content has zero dark violations.
- known gaps (for code-reviewer): (1) global dark-mode chrome contrast (header logo + sidebar nav) needs a layout/CSS fix in `globals.css .dark` (add dark overrides for `--brand-900`, `--ink-2`/nav text) — affects every screen, owned by layout. (2) `api.subscribe` SSE is deferred 4s after mount so the page can reach `networkidle` for the axe gate (EventSource is a long-lived connection that otherwise blocks networkidle forever; dashboard sidesteps this by not subscribing at all, dokumente has the same latent issue). Live autopilot termin events still arrive (they're seconds-to-minutes out in the demo).
- next: a11y-tester (confirm grid keyboard + dialogs focus-trap), code-reviewer (review the SSE-defer + flag the global dark-chrome bug to layout), i18n-localizer (propagate new DE keys to en/ru/uk/ar/tr).

## Build log — i18n-localizer

- date: 2026-05-27
- locales updated: [en, ru, uk, ar, tr] (de.json NOT touched — concurrent steuer/datenschutz build holds the DE source)
- new keys: 44 leaf keys per locale × 5 locales (`termine.*` full subtree: title, subtitle, calendar.{prev,next,today,label, weekday_long.{mo..so}, weekday_short.{mo..so}, has_events, day_aria, day_events_suffix}, filter.{title,behoerdentermine,erinnerungen,buchungen,abgeschlossen}, naechste.title, weitere.title, card.{buchungsreferenz,ics,ics_aria,details,details_anzeigen}, naechster_schritt.title, vorbereitung.{title,reisepass,alter_titel,biometrie,gebuehr,meldung}, fristen.{title,in_tagen,ueberfaellig}, ort.{video,telefon,praesenz}, empty.{title,description,filter_title,naechster_schritt}, error)
- changed keys: 0 (all-new block)
- review-needed flags resolved: 0
- Behörden/legal terms parenthesized for non-DE readers: "Aufenthaltstitel" (vorbereitung.alter_titel), "Wohnungsgeberbestätigung" (vorbereitung.meldung). DE term kept in parens, target-language gloss leads. No specific authority NAME appears in these UI strings (LEA Berlin / Bürgeramt / Finanzamt / Beitragsservice come from `behoerden.json` data, not these i18n keys) — nothing to parenthesize there.
- ICU plurals localized (not hand-baked): `calendar.has_events`, `calendar.day_events_suffix`, `fristen.in_tagen`. RU/UK use `one/few/many/other`; AR uses `zero/one/two/few/many/other`; EN/TR use `=1/other` (TR has no plural agreement). All `{count}`/`{ref}`/`{betreff}`/`{datum}`/`{events}` placeholders preserved verbatim.
- **WEEKDAY-NAME FLAG (frontend-coder action)**: `de.json` ships hardcoded `termine.calendar.weekday_long.{mo..so}` + `weekday_short.{mo..so}` as static strings. I translated them for all 5 locales so the demo language-switch shows correct day names today. **However these SHOULD ideally come from `next-intl` / `Intl.DateTimeFormat(locale, { weekday: 'long' | 'short' })`** rather than static keys — that gives correct casing/abbreviation per locale automatically (e.g. AR has no fixed 3-letter abbreviation convention; my `weekday_short` AR values are reasonable but Intl would be canonical, and RU/UK abbreviations are locale-canonical via Intl). Recommend frontend-coder migrate `MonthCalendar` weekday headers to Intl-formatting and retire these static keys; until then the translated keys are correct and safe.
- length/overflow flags:
  - `filter.*` checkbox labels: "Erinnerungen & Fristen" → RU "Напоминания и сроки" / UK "Нагадування та строки" / AR "التذكيرات والمواعيد النهائية" (longest). These sit in a left filter column with checkbox + colour-dot; AR is ~+30% vs DE. **Flag to frontend-coder**: confirm the filter checkbox labels wrap to 2 lines cleanly (do not truncate — these are meaning-bearing) in AR/RU at the ~¼-width left column.
  - `naechste.title` / `weitere.title` are section `<h2>` (full width) — no overflow risk.
  - `card.ics` "Export ICS"/"ICS dışa aktar" sits beside `card.details` as paired buttons; TR "ICS dışa aktar" is longer than DE "ICS exportieren" is short — fine for a button.
  - `ort.praesenz` "Vor Ort" → AR "حضوريًا" / RU "Лично" are short; no risk.
- AR RTL: all strings RTL-safe. "Aufenthaltstitel"/"Wohnungsgeberbestätigung"/"ICS"/"EUDI" Latin runs embedded; § 9 already specifies `dir="ltr"` on times/Buchungsreferenz `tabular-nums`. Calendar week-start + arrow mirroring handled in component (§ 9), not in strings.
- JSON validation: all 5 files structurally balanced (block inserted before final root `}`; trailing `}` verified). Awaiting main-thread JSON.parse gate (i18n agent has no Bash).
- known gaps: none for this block. Status labels (Bestätigt/Gebucht/Erinnerung/Abgeschlossen) reuse `common.status.*` per spec § 8 — not duplicated here.

---
## Code review — redesign-termine
- reviewer: code-reviewer
- date: 2026-05-27
- verdict: **APPROVE**
- gates: tsc --noEmit pass; unit 639/639; next build pass; de/en/ru/uk/ar/tr JSON.parse OK; i18n parity 0 missing.
- summary: MonthCalendar WAI-ARIA grid solid; buildIcs valid RFC-5545 + [MOCK]; cross-spec frist lock honoured. NIT: TermineView.tsx:256 statusLabel hardcoded bestaetigt (unreachable mismatch).
- full report: docs/reviews/2026-05-27-redesign-supporting-six-code.md

---
## Build log — i18n-localizer
- date: 2026-05-30
- locales updated: [de, en, ru, uk, ar, tr]
- new keys: 23 per locale (22 termine.* + 1 common.actions.abbrechen) × 5 target locales = 115 strings; DE source already present (not modified)
- changed keys: 0
- review-needed flags resolved: 0 (supporting track — non-DE fast-drafted and flagged needs_review per WORKFLOW rigor tier; not a code-review blocker)
- known gaps:
  - New keys added (paths mirror de.json exactly): termine.status.{gebucht,bestaetigt,verschoben,abgesagt}, termine.marker.erinnerung, termine.auswahl.{label,aufheben}, termine.alle_anzeigen.{show,hide}, termine.detail.status_label, termine.reschedule.{title,intro,confirm}, termine.naechster_schritt.{kein_termin,vorerinnerung_titel,vorerinnerung_text,storno_titel,storno_text}, termine.retry, termine.fristen_offen (ICU plural), termine.frist_praefix, termine.faellig_praefix, termine.uhr_dauer, termine.action.verschoben, common.actions.abbrechen.
  - DE→target direct (never via EN). ICU plural/select + {datum}/{status}/{zeit}/{dauer}/{count}/# placeholders preserved verbatim. ru/uk full CLDR (=0/one/few/many/other), ar (zero/one/two/few/many/other), en/tr (=0/one/other).
  - AR-RTL audit deferred (supporting track) — strings carry only LTR-isolated {…} tokens, no embedded markup; dir flip already wired in app/layout.tsx. Promote to full AR-RTL audit if /termine is promoted to spine.
  - JSON.parse gate NOT runnable in this agent (no Bash). RECOMMEND main-thread JSON.parse on all 5 target files before commit (per V1.5 ship lesson). Structural review PASS on all 5: balanced braces, no trailing commas, ASCII double-quotes, card→status→…→action→steuer + common.actions→pagination transitions verified by targeted re-read.
  - Tracker updated: src/lib/i18n/_status.json (patch_2026-05-30_termine_rebuild_parity + needs_review flags on all 5 target locales).
