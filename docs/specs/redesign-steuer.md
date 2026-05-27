---
feature: redesign-steuer
title: Steuer — Vorausgefüllte Steuererklärung aus bekannten Daten (Redesign aus Prototyp 04)
status: shipped
track: supporting
date: 2026-05-27
author: product-architect
authorization: docs/demo-spine.md § "ACTIVE BUILD (decided 2026-05-27)" — user-supplied complete visual prototype; research/domain/verify waived per spine note.
owner_agents: [frontend-coder, mock-backend-coder, i18n-localizer, a11y-tester, code-reviewer]
inputs:
  prototype: docs/design-prototype/04-steuer.png
  foundation: docs/specs/redesign-foundation.md  (token + primitive CONTRACT — reference, do not redefine)
  data_model: src/types/persona.ts, src/data/personas.json, src/data/behoerden.json, src/types/document.ts
gates: depends on redesign-foundation APPROVE. Current page is a 5-line stub.
---

> **Foundation contract.** Tokens, shell, and shared primitives (`StatusBadge`, `PageHeader`,
> `RightRailCard`, `IconCircle`, `DataTable`, `ListRow`, `KeyValueRow`, `SectionCard`, `EmptyState`,
> `Button`, `FristCountdown`, `RechtsgrundlageTag`, `BehoerdenBadge` farb-frei) come from
> `redesign-foundation.md`. This spec only consumes them.

## 1. Problem statement

Die Steuererklärung ist für viele die unbeliebteste Behördeninteraktion — obwohl Finanzamt, Arbeitgeber und Krankenkasse die meisten Daten bereits kennen. Steuer zeigt eine **vorausgefüllte** Übersicht: voraussichtliche Erstattung, Datenquellen, ein 3-Schritt-Fortschritt und eine Bereichs-Tabelle (geprüft / ergänzen / nicht vorhanden) — mit transparenter Rechtsgrundlage und Datenminimierung pro Datenquelle.

## 2. Persona & journey

- **Persona**: Anna Petrov (`anna-petrov`) als Demo-Default — angestellt bei Mittelstand Software GmbH, ein Kind (Lev), AOK-Nordost, Steuer-ID vorhanden. Liefert Lohnsteuer + Kind + Krankenkasse als Datenquellen.
- **Trigger**: Bürger:in will die Steuererklärung erledigen, ohne bei Null anzufangen.
- **Outcome**: Erstattung gesehen, vorausgefüllte Bereiche geprüft, fehlende Belege ergänzt, Abgabe vorbereitet — transparent, welche Daten woher kommen.
- **Time saved vs status quo**: „Belege aus 4 Quellen sammeln + Formular von Grund auf (~3–4 h) → vorausgefüllte Übersicht prüfen + ergänzen (~15 Min)."

## 3. Success criteria for the demo

- [ ] Viewer erkennt den Wow („371,00 € voraussichtliche Erstattung, automatisch vorausgefüllt") in < 5 s.
- [ ] Datenquellen-Tiles zeigen, **welche Daten von welcher Stelle** kommen (Datenminimierung sichtbar).
- [ ] 3-Schritt-Stepper kommuniziert den Stand (Daten geprüft → Belege ergänzen → Zur Abgabe bereit).
- [ ] Bereichs-Tabelle zeigt Status (Geprüft / Ergänzen / Nicht vorhanden) + Aktion-Link je Bereich.
- [ ] Datenschutz-Hinweis nennt Rechtsgrundlage + verarbeitete Daten (Projekt-Mission „privacy-by-design").
- [ ] „Entwurf"-Badge + Mock-Hinweis sichtbar; keine echte Abgabe.
- [ ] Lighthouse a11y > 95 auf `/steuer`; axe 0 kritisch.

## 4. Screen-by-screen flow

### 4.1 Screen: Steuer-Übersicht

- **Route**: `/steuer`
- **File**: `src/app/(app)/steuer/page.tsx` (RSC shell) + `src/components/steuer/SteuerView.tsx` (client nur wo nötig — Bereichs-Tabelle-Aktionen, Beleg-Ergänzen-Toggle).
- **Server or client**: RSC-Page lädt `api.getSteuerUebersicht(steuerjahr)` (NEW, § 6) + `api.getBehoerden()`. Tabelle/Stepper sind weitgehend RSC; nur „Belege ergänzen"-Interaktion + ggf. ein Detail-Dialog sind Client.
- **Layout** (Prototyp 04): zweispaltig — Hauptspalte (Hero + Stepper + Bereichs-Tabelle) ~⅔, rechte Rail ~⅓.

```
┌───────────────────────────────────────────────┬──────────────────────────┐
│ Steuer                          [Prototyp·Mock]│  Wichtige Fristen         │
│ Vorausgefüllte Steuererklärung aus … Daten.    │  • Abgabefrist 2024       │
│ ┌─ Steuerjahr 2024  [Entwurf] ──────────────┐ │    31.07.2025  [In 35 T.] │
│ │ Voraussichtliche Erstattung               │ │  • Einspruchsfrist …      │
│ │   371,00 €                                 │ │  ───────────────────────│
│ │ Datenquellen:                              │ │  Verwendete Nachweise     │
│ │ [Lohnsteuer][Kind][Krankenkasse][Bekannt] │ │  • Lohnsteuerbesch. 2024  │
│ └───────────────────────────────────────────┘ │  • Kindergeldbescheid     │
│ Fortschritt                                    │  • Beitragsbescheinigung  │
│ ① Daten geprüft —②— Belege ergänzen —③— Abgabe │  • Meldebestätigung       │
│ Übersicht der Steuerbereiche                   │  ───────────────────────│
│ ┌ Bereich ─ Betrag ─ Status ─ Aktion ┐        │  🔒 Datenschutz-Hinweis   │
│ │ Einkommen     32.400 € Geprüft  Ansehen│     │  Verarbeitet: Lohndaten,  │
│ │ Werbungskosten 1.230 € Ergänzen Ergänzen│    │  KV-Beiträge, Kind.       │
│ │ Vorsorgeaufw.  4.870 € Geprüft  Ansehen│     │  Rechtsgrundlage: § 150   │
│ │ Außergewöhnl.  —       Nicht vorh. Hinzuf.│   │  AO i.V.m. § 31 EStG      │
│ └────────────────────────────────────────┘    │  Mehr zu Datenschutz →    │
│ [Alle Bereiche anzeigen]                       │                          │
└───────────────────────────────────────────────┴──────────────────────────┘
```

- **Components used**:
  - `PageHeader` (B2) — title `steuer.title`, subtitle `steuer.subtitle`, `contextChip` tone `prototype`.
  - `<NEW> SteuerHeroCard` (`src/components/steuer/SteuerHeroCard.tsx`) — Card mit Steuerjahr + `StatusBadge` Variante `vorlage`/Entwurf, großer Erstattungsbetrag (`tabular-nums`, primary/success), darunter Datenquellen-Tiles.
  - `<NEW> DatenquelleTile` (`src/components/steuer/DatenquelleTile.tsx`) — kleine Kachel: `IconCircle` + Quelle-Name + „von {Behörde/Arbeitgeber}" + `StatusBadge` `verifiziert`. 4 Tiles: Lohnsteuer / Kind / Krankenkasse / Bereits bekannte Daten.
  - `<NEW> FortschrittStepper` (`src/components/steuer/FortschrittStepper.tsx`) — 3-Schritt-Stepper (Daten geprüft = done/success, Belege ergänzen = aktiv/warning, Zur Abgabe bereit = pending). Horizontal mit verbindenden Linien + Schritt-Icons (`Check`/`Circle`).
  - `DataTable` (B11) — „Übersicht der Steuerbereiche", 4 Spalten (siehe § 4.2); Body = `ListRow`.
  - `StatusBadge` (B1) — Bereichs-Status (`geprueft`/`ergaenzen`(=warten/in_bearbeitung-Variante)/`nicht_vorhanden`(neutral)).
  - `Button` (restyle) — Aktion-Links je Zeile (`link`/`ghost`); „Alle Bereiche anzeigen".
  - `RightRailCard` (B4) ×3 — „Wichtige Fristen", „Verwendete Nachweise", „Datenschutz-Hinweis".
  - `FristCountdown` (restyle) — „In X Tagen"-Badge in „Wichtige Fristen".
  - `KeyValueRow` (B13) — Datenschutz-Hinweis-Zeilen (Verarbeitet / Rechtsgrundlage / Empfänger).
  - `RechtsgrundlageTag` + `NormTooltip` (restyle) — Norm-Zitate (`§ 150 AO`, `§ 31 EStG`, `§ 139b AO` Steuer-ID).
  - `ListRow` (B10) — „Verwendete Nachweise" (mit Bezug zu `documents.json`-Dokumenten).
  - `EmptyState` (B14) — kein Steuerjahr-Entwurf vorhanden.
  - `<NEW> BelegErgaenzenDialog` (`src/components/steuer/BelegErgaenzenDialog.tsx`, client) — optional Dialog für „Ergänzen"/„Hinzufügen"-Aktion. **Minimal-Variante**: Klick zeigt Toast „Demo — Beleg-Ergänzung nicht hinterlegt" (`steuer.demo_action_toast`). Frontend-coder wählt; bevorzugt Toast (weniger Komponenten), da kein echter Upload (Out of scope § 10).
- **Data fetched**: `api.getSteuerUebersicht(steuerjahr)` (NEW), `api.getBehoerden()`, optional `api.getDocuments()` (für „Verwendete Nachweise"-Verknüpfung).
- **i18n keys introduced**: siehe § 8.
- **States**:
  - loading — Hero-Skeleton + Tabellen-Skeleton.
  - empty — kein Entwurf für das Jahr → `EmptyState` icon `Receipt`, title `steuer.empty.title`.
  - success — Hero + Stepper + Tabelle + Rail.
  - error — `steuer.error` + Retry.
- **Accessibility notes**:
  - Genau ein `<h1>`. „Fortschritt", „Übersicht der Steuerbereiche", Rail-Titel als `<h2>`.
  - `FortschrittStepper` = `<ol>` mit `aria-current="step"` auf dem aktiven Schritt; Schritt-Status nicht nur farblich (Icon + Text „abgeschlossen/aktiv/offen").
  - `DataTable` = echtes `<table>`, `<th scope>`, Betrags-Spalte `text-end tabular-nums`.
  - Erstattungsbetrag mit zugänglichem Kontext (`aria-label` „Voraussichtliche Erstattung 371,00 Euro").
  - Datenschutz-Hinweis als `<dl>` (KeyValueRow); Norm-Tooltips per Tastatur erreichbar.
  - Alle Beträge `tabular-nums` (HL-DS-6).

### 4.2 DataTable-Spalten (Steuerbereiche)

| Spalte id | Header-Key | align | sortable | Inhalt |
|---|---|---|---|---|
| `bereich` | `steuer.col.bereich` | start | nein | `IconCircle` + Bereich-Name + kurze Erläuterung |
| `betrag` | `steuer.col.betrag` | end | nein | Betrag `tabular-nums` (oder „—" bei nicht vorhanden) |
| `status` | `steuer.col.status` | start | nein | `StatusBadge` (geprüft / ergänzen / nicht vorhanden) |
| `aktion` | `steuer.col.aktion` | end | nein | Link „Ansehen" (geprüft) / „Ergänzen" (ergänzen) / „Hinzufügen" (nicht vorhanden) |

Bereiche (Demo-Inhalt): Einkommen / Werbungskosten / Vorsorgeaufwendungen / Außergewöhnliche Belastungen / Kinder / Sonderausgaben (≥ 5, damit „Alle Bereiche anzeigen" Sinn ergibt).

### 4.3 Status-Mapping Steuerbereiche

| Status | StatusBadge-Variante | Bedeutung | Aktion |
|---|---|---|---|
| `geprueft` | `geprueft` (success) | Daten von Behörde/Arbeitgeber übernommen + bestätigt | „Ansehen" |
| `ergaenzen` | `warten`/`in_bearbeitung` (warning) | Bürger:in muss Beleg ergänzen | „Ergänzen" |
| `nicht_vorhanden` | neutral (kein Soft-bg) | kein Datensatz | „Hinzufügen" |

## 5. Autopilot logic

Nicht anwendbar als Kaskade. Der „Wow" ist das **Pre-Fill** selbst: das Backend hat die Erklärung aus bekannten Daten (Lohnsteuerbescheinigung, Kindergeldbescheid, KV-Beitragsbescheinigung, Stammdaten) vorbefüllt. Es gibt keine Multi-Behörden-Timeline hier. Eine echte „Abgabe"-Aktion ist **out of scope** (§ 10) — Stepper bleibt bei „Belege ergänzen"; „Zur Abgabe bereit" ist visuell pending.

## 6. Data model additions / changes

### New types: `src/types/steuer.ts` (NEU)

```ts
import type { BehoerdeId } from './behoerde';

export type SteuerBereichStatus = 'geprueft' | 'ergaenzen' | 'nicht_vorhanden';

export interface SteuerBereich {
  id: string;
  /** i18n-Key des Bereich-Namens (z. B. "steuer.bereich.einkommen"). */
  name_i18n_key: string;
  /** Betrag in Euro-Cent (Integer, `tabular-nums`-Formatierung im UI). undefined = "—". */
  betrag_cent?: number;
  status: SteuerBereichStatus;
}

export interface SteuerDatenquelle {
  id: string;
  /** i18n-Key ("steuer.quelle.lohnsteuer" …). */
  label_i18n_key: string;
  /** Herkunft: Behörde-ID oder Klartext-Arbeitgeber-Name. */
  herkunft: string;
  /** Optional: Bezug zu einem Dokument in documents.json. */
  document_id?: string;
}

export interface SteuerFrist {
  /** i18n-Key ("steuer.frist.abgabe" / "steuer.frist.einspruch"). */
  label_i18n_key: string;
  /** ISO-Datum. */
  datum: string;
}

export interface SteuerDatenschutz {
  /** Liste verarbeiteter Datenarten (i18n-Keys). */
  verarbeitete_daten_i18n_keys: string[];
  /** Rechtsgrundlage als Norm-String (z. B. "§ 150 AO i.V.m. § 31 EStG"). */
  rechtsgrundlage: string;
  /** Empfänger-Behörde (Finanzamt). */
  empfaenger_behoerde_id: BehoerdeId;
}

export interface SteuerUebersicht {
  steuerjahr: number;
  /** "entwurf" | "eingereicht" — V1 immer "entwurf". */
  status: 'entwurf' | 'eingereicht';
  /** Voraussichtliche Erstattung in Euro-Cent (positiv = Erstattung). */
  voraussichtliche_erstattung_cent: number;
  datenquellen: SteuerDatenquelle[];
  /** 3-Schritt-Fortschritt: index 0–2, welcher Schritt aktiv ist. */
  fortschritt_aktiver_schritt: 0 | 1 | 2;
  bereiche: SteuerBereich[];
  fristen: SteuerFrist[];
  verwendete_nachweise_document_ids: string[];
  datenschutz: SteuerDatenschutz;
  watermark: '[MOCK]';
}
```

### Mock-backend additions — `api.ts`

- **`<NEW> getSteuerUebersicht(steuerjahr: number): Promise<SteuerUebersicht>`** — liefert die vorausgefüllte Steuer-Übersicht der aktiven Persona für ein Jahr (V1: nur 2024). Aus Seed (`src/data/steuer.json`). Mit `withLatency`. Wirft `MockBackendError(STEUER_JAHR_NOT_FOUND)` bei fehlendem Jahr. **Hand-off note für assistant-engineer: künftiges Tool `get_steuer_uebersicht` spiegelt diese Methode.**
- **`<NEW> getSteuerjahre(): Promise<number[]>`** — optional; liefert verfügbare Steuerjahre. **Empfehlung: NICHT bauen** in V1 (nur 2024); Frontend hardcodet das Jahr aus der Übersicht. Nur dokumentiert.

> Verbindlich NEU: nur **`getSteuerUebersicht(steuerjahr)`**.

### Seed-data extension — `src/data/steuer.json` (NEU)

mock-backend-coder legt an + `import` in `seed.ts` + `readOrInit`-Bucket `steuer` + zod-Schema `steuerUebersichtMapSchema` (`Record<personaId, Record<steuerjahr, SteuerUebersicht>>` oder Array). Inhalt für Anna 2024 (reale Behörde `finanzamt-koerperschaften-i-berlin`, `[MOCK]`):
- `voraussichtliche_erstattung_cent: 37100` (371,00 €).
- `status: "entwurf"`, `fortschritt_aktiver_schritt: 1` (Belege ergänzen).
- **datenquellen** (4): Lohnsteuer (Herkunft „Mittelstand Software GmbH", `document_id: "doc-anna-lohnsteuerbescheinigung-2025"` — analog 2024-Variante), Kind (Herkunft `familienkasse-berlin-brandenburg`, `document_id: "doc-anna-kindergeldbescheid-lev"`), Krankenkasse (Herkunft `aok-nordost`), Bereits bekannte Daten (Herkunft `finanzamt-koerperschaften-i-berlin`).
- **bereiche** (≥ 5): Einkommen (geprueft, ~32.400 €), Werbungskosten (ergaenzen, ~1.230 €), Vorsorgeaufwendungen (geprueft, ~4.870 €), Kinder (geprueft, Lev), Außergewöhnliche Belastungen (nicht_vorhanden, betrag undefined), Sonderausgaben (geprueft).
- **fristen** (2): Abgabefrist 2024 = `2025-07-31` **(muss datumsgleich mit `redesign-termine.md` § 6 Steuer-Reminder sein — beide referenzieren dasselbe Datum; falls Termine-Spec „in 35 Tagen" ab Demo-Zeit nutzt, hier identisches ISO-Datum eintragen)**, Einspruchsfrist (Beispiel).
- **verwendete_nachweise_document_ids**: Lohnsteuerbescheinigung, Kindergeldbescheid, KV-Beitragsbescheinigung (ggf. NEU in documents.json — siehe Querverweis), Meldebestätigung.
- **datenschutz**: `verarbeitete_daten_i18n_keys` = [Lohndaten, KV-Beiträge, Kinderdaten], `rechtsgrundlage: "§ 150 AO i.V.m. § 31 EStG"`, `empfaenger_behoerde_id: "finanzamt-koerperschaften-i-berlin"`.

> **Cross-Spec:** Falls „Beitragsbescheinigung" als Nachweis referenziert wird, mock-backend-coder ergänzt ggf. ein KV-Beitragsbescheinigungs-Dokument in `documents.json` (koordiniert mit `redesign-dokumente.md` § 6 — kein Doppelanlegen).

### Persistence keys (localStorage)

- Neuer Bucket `steuer` (analog `termine`/`reminders`). Idempotent über `seedIfEmpty`.
- Beleg-Ergänzen-State / „Alle Bereiche"-Expand = ephemerer Client-State (kein Persist).

## 7. AI assistant integration

Nicht in dieser Iteration. (Künftig: Tool „steuererklärung vorausfüllen / einreichen" — out of scope hier.)

## 8. i18n

Alle Keys unter `steuer.*` neu; `track: supporting` → DE-Source + 6 Locales `needs_review`. **`common.show_all`, `common.context_chip.prototype`, `common.empty.*`, `common.status.*`** aus Foundation reusen. Beträge/Daten über bestehende `formatCurrency`/`formatDate`-Utils.

| Key | DE source value |
|---|---|
| `steuer.title` | „Steuer" |
| `steuer.subtitle` | „Vorausgefüllte Steuererklärung aus bereits vorhandenen Daten." |
| `steuer.hero.steuerjahr` | „Steuerjahr {jahr}" |
| `steuer.hero.entwurf_badge` | „Entwurf" |
| `steuer.hero.erstattung_label` | „Voraussichtliche Erstattung" |
| `steuer.hero.erstattung_aria` | „Voraussichtliche Erstattung {betrag}" |
| `steuer.hero.datenquellen_label` | „Datenquellen" |
| `steuer.quelle.lohnsteuer` | „Lohnsteuer" |
| `steuer.quelle.kind` | „Kind" |
| `steuer.quelle.krankenkasse` | „Krankenkasse" |
| `steuer.quelle.bekannt` | „Bereits bekannte Daten" |
| `steuer.quelle.herkunft` | „von {herkunft}" |
| `steuer.fortschritt.title` | „Fortschritt" |
| `steuer.fortschritt.geprueft` | „Daten geprüft" |
| `steuer.fortschritt.ergaenzen` | „Belege ergänzen" |
| `steuer.fortschritt.abgabe` | „Zur Abgabe bereit" |
| `steuer.fortschritt.schritt_aria` | „Schritt {n} von 3: {label}" |
| `steuer.bereiche.title` | „Übersicht der Steuerbereiche" |
| `steuer.col.bereich` | „Bereich" |
| `steuer.col.betrag` | „Betrag" |
| `steuer.col.status` | „Status" |
| `steuer.col.aktion` | „Aktion" |
| `steuer.status.geprueft` | „Geprüft" |
| `steuer.status.ergaenzen` | „Ergänzen" |
| `steuer.status.nicht_vorhanden` | „Nicht vorhanden" |
| `steuer.aktion.ansehen` | „Ansehen" |
| `steuer.aktion.ergaenzen` | „Ergänzen" |
| `steuer.aktion.hinzufuegen` | „Hinzufügen" |
| `steuer.bereich.einkommen` | „Einkünfte aus nichtselbständiger Arbeit" |
| `steuer.bereich.werbungskosten` | „Werbungskosten" |
| `steuer.bereich.vorsorge` | „Vorsorgeaufwendungen" |
| `steuer.bereich.kinder` | „Kinder" |
| `steuer.bereich.aussergewoehnlich` | „Außergewöhnliche Belastungen" |
| `steuer.bereich.sonderausgaben` | „Sonderausgaben" |
| `steuer.fristen.title` | „Wichtige Fristen" |
| `steuer.frist.abgabe` | „Abgabefrist Steuererklärung {jahr}" |
| `steuer.frist.einspruch` | „Einspruchsfrist letzter Bescheid" |
| `steuer.frist.in_tagen` | „In {count, plural, =0 {heute} =1 {1 Tag} other {# Tagen}}" |
| `steuer.nachweise.title` | „Verwendete Nachweise" |
| `steuer.datenschutz.title` | „Datenschutz-Hinweis" |
| `steuer.datenschutz.verarbeitet_label` | „Verarbeitete Daten" |
| `steuer.datenschutz.daten.lohn` | „Lohn- und Gehaltsdaten" |
| `steuer.datenschutz.daten.kv` | „Krankenversicherungsbeiträge" |
| `steuer.datenschutz.daten.kind` | „Daten zu Kindern (Kindergeld)" |
| `steuer.datenschutz.rechtsgrundlage_label` | „Rechtsgrundlage" |
| `steuer.datenschutz.empfaenger_label` | „Empfänger" |
| `steuer.datenschutz.minimierung_hint` | „Es werden nur die für die Steuererklärung erforderlichen Daten verarbeitet." |
| `steuer.datenschutz.mehr` | „Mehr zu Datenschutz" |
| `steuer.empty.title` | „Kein Steuer-Entwurf vorhanden" |
| `steuer.empty.description` | „Für dieses Steuerjahr liegen noch keine vorausgefüllten Daten vor." |
| `steuer.error` | „Steuer-Übersicht konnte nicht geladen werden." |
| `steuer.demo_action_toast` | „Demo-Funktion — Beleg-Ergänzung in diesem Prototyp nicht hinterlegt." |
| `steuer.alle_bereiche` | „Alle Bereiche anzeigen" |

## 9. Edge cases

- **Negative Erstattung (Nachzahlung)** → Label `steuer.hero.erstattung_label` bleibt; Betrag in danger/warning-Ton + „Voraussichtliche Nachzahlung" (für Mehmet-Variante künftig). V1 Anna = positive Erstattung.
- **Bereich `nicht_vorhanden` mit `betrag_cent: undefined`** → „—" in Betrag-Spalte, neutraler Status, Aktion „Hinzufügen".
- **Abgabefrist überschritten** → `FristCountdown` danger „überfällig"; Einspruchsfrist ggf. relevant.
- **Datenquelle ohne `document_id`** → Tile zeigt Quelle ohne Dokument-Link (z. B. „Bereits bekannte Daten").
- **Latenz-Fehler (5 %)** → Error-State + Retry.
- **Verwendeter Nachweis nicht in `documents.json`** → ListRow zeigt Titel ohne Deeplink (defensiv).
- **RTL (AR)**: Tabelle + Stepper logisch spiegeln; Beträge/Norm-Zitate `dir="ltr"` (`tabular-nums`-Spans).

## 10. Out of scope (explicit)

- **Echte Steuer-Abgabe / ELSTER-Übermittlung** — Stepper bleibt bei „Belege ergänzen"; „Zur Abgabe bereit" ist visuell pending, kein Submit.
- **Echte Beleg-Erfassung / Upload / OCR** — „Ergänzen"/„Hinzufügen" = Demo-Toast.
- **Steuerberechnung / Editierbare Beträge** — alle Beträge sind vorausgefüllte Mock-Werte, read-only.
- **Mehrere Steuerjahre / Jahres-Wechsler** — V1 nur 2024.
- **Pro-Persona-Ausbau Schmidt/Mehmet** — Fokus Anna; Mehmet-Selbständigen-Variante (EÜR, Nachzahlung) ist eine spätere Iteration.
- **Detaillierte Bereich-Unterseiten** — „Ansehen"/„Alle Bereiche" zeigen die Tabelle; keine Drill-Down-Formulare.

## 11. Review checklist (for code-reviewer)

- [ ] Keine hardcoded Strings — alle über `t()`; `steuer.*` in `de.json` + 6 Locales.
- [ ] `common.status.*` reused wo passend; Steuer-spezifische Status (`ergaenzen`/`nicht_vorhanden`) sauber unter `steuer.status.*`.
- [ ] Mock-backend-Latenz über `getSteuerUebersicht()`.
- [ ] `DataTable` = echtes `<table>` mit `<th scope>`; Betrags-Spalte `text-end tabular-nums`.
- [ ] `FortschrittStepper` = `<ol>` mit `aria-current="step"`; Status nicht nur farblich (Icon + Text).
- [ ] Alle Beträge + Frist-Zahlen `tabular-nums` (HL-DS-6).
- [ ] Erstattungsbetrag mit `aria-label`-Kontext.
- [ ] Datenschutz-Hinweis nennt verarbeitete Daten + Rechtsgrundlage + Empfänger (privacy-by-design, Projekt-Mission).
- [ ] `[MOCK]`-Watermark / „Entwurf"-Badge sichtbar; keine echte Abgabe.
- [ ] Empfänger-/Quellen-Behörden zitieren reale IDs aus `data/behoerden.json`.
- [ ] Abgabefrist datumsgleich mit `redesign-termine.md` § 6.
- [ ] `steuer`-Bucket idempotent geseedet; Beleg-/Expand-State nicht persistiert.
- [ ] Genau ein `<h1>`; Sektions-/Rail-Titel als `<h2>`.
- [ ] `prefers-reduced-motion`: Stepper-/Card-Transitions ≤ 200ms Opacity (HL-DS-4).

---

## Build log — mock-backend-coder

- date: 2026-05-27
- types added: `src/types/steuer.ts` (SteuerUebersicht, SteuerBereich, SteuerBereichStatus, SteuerDatenquelle, SteuerFrist, SteuerDatenschutz). Barrel updated.
- api: NEW `getSteuerUebersicht(personaId, steuerjahr): Promise<SteuerUebersicht>` (`steuer/api.ts`, `withLatency`) — reads `steuer` bucket; throws `MockBackendError(STEUER_JAHR_NOT_FOUND)` for missing year. `getSteuerjahre` deliberately NOT built (V1 only 2024).
- seed records: NEW `src/data/steuer.json` shape `Record<personaId, Record<steuerjahr, SteuerUebersicht>>`. Anna 2024: erstattung 37100 cent (371,00 EUR), status entwurf, fortschritt_aktiver_schritt 1, 4 datenquellen (Lohnsteuer/Mittelstand Software GmbH+doc-anna-lohnsteuerbescheinigung-2025, Kind/familienkasse-berlin-brandenburg+doc-anna-kindergeldbescheid-lev, Krankenkasse/aok-nordost+doc-anna-kv-beitragsbescheinigung-2024, Bereits-bekannt/finanzamt-koerperschaften-i-berlin), 6 bereiche (Einkommen geprueft, Werbungskosten ergaenzen, Vorsorge geprueft, Kinder geprueft, Aussergewoehnlich nicht_vorhanden, Sonderausgaben geprueft), 2 fristen (Abgabe 2025-07-31, Einspruch 2026-04-15), datenschutz rechtsgrundlage `§ 150 AO i.V.m. § 31 EStG` empfaenger finanzamt-koerperschaften-i-berlin, watermark `[MOCK]`.
- buckets: NEW `steuer` wired into `seedIfEmpty` + `seedForPersona`. zod `steuerBucketSchema` added. Beleg-/Expand-state ephemeral.
- CROSS-SPEC LOCK honoured: Abgabefrist 2024 = `2025-07-31` identical in steuer.json + reminders.json. KV-Beitragsbescheinigung doc `doc-anna-kv-beitragsbescheinigung-2024` added to documents.json (coordinated, no double-anlegen).
- typecheck: pass. unit suite: 639/639 pass.
- known gaps: only Anna 2024 (Mehmet EUER/Nachzahlung deferred per §10). No Steuerberechnung/Editierbarkeit (read-only mock).

## Build log — frontend-coder
- date: 2026-05-27
- screens implemented: Steuer (`/steuer`) — Hero (Steuerjahr + Entwurf-Badge + großer Erstattungsbetrag + 4 Datenquellen-Tiles), 3-Schritt FortschrittStepper, „Übersicht der Steuerbereiche"-DataTable (Bereich/Betrag/Status/Aktion + „Alle Bereiche anzeigen"-Expand), Right-Rail ×3 (Wichtige Fristen mit FristCountdown, Verwendete Nachweise, Datenschutz-Hinweis mit Rechtsgrundlage/Empfänger/Datenminimierung).
- components created:
  - `src/app/(app)/steuer/page.tsx` (RSC, `force-dynamic`, liefert `nowIso` + `steuerjahr=2024`)
  - `src/components/steuer/SteuerView.tsx` (client; lädt `getProfile`→`getSteuerUebersicht`/`getBehoerden`/`getDocuments`; loading/empty/error/ready-States; Aktions-Links + „Alle Bereiche" → Toast)
  - `src/components/steuer/SteuerHeroCard.tsx` (Euro-Format via `Intl.NumberFormat('de-DE')`, Erstattung success / Nachzahlung danger mit aria-label, tabular-nums)
  - `src/components/steuer/DatenquelleTile.tsx` (IconCircle + Quelle + „von {Herkunft}" + Verifiziert-Badge)
  - `src/components/steuer/FortschrittStepper.tsx` (`<ol>`, aria-current="step" auf aktivem Schritt, Status als sr-only-Text „abgeschlossen/aktiv/offen", nicht nur Farbe)
- i18n keys added (DE source, `de.json` top-level `steuer.*`): hero.{steuerjahr,entwurf_badge,erstattung_label,erstattung_aria,nachzahlung_label,nachzahlung_aria,datenquellen_label}, quelle.{lohnsteuer,kind,krankenkasse,bekannt,herkunft}, fortschritt.{title,geprueft,ergaenzen,abgabe,schritt_aria,status_done,status_active,status_pending}, bereiche.title, col.{bereich,betrag,status,aktion}, status.{geprueft,ergaenzen,nicht_vorhanden}, aktion.{ansehen,ergaenzen,hinzufuegen,*_aria}, bereich.{einkommen,werbungskosten,vorsorge,kinder,aussergewoehnlich,sonderausgaben}, fristen.title, frist.{abgabe,einspruch,in_tagen,ueberfaellig}, nachweise.title, datenschutz.{title,verarbeitet_label,daten.{lohn,kv,kind},rechtsgrundlage_label,empfaenger_label,minimierung_hint,mehr}, empty.{title,description}, error, retry, demo_action_toast, alle_bereiche, weniger_bereiche. (DE only; non-DE handled later per `track: supporting`.)
- a11y: genau ein `<h1>` (PageHeader); „Fortschritt"/„Übersicht der Steuerbereiche"/Rail-Titel als `<h2>`; FortschrittStepper `<ol>` + aria-current="step" + sr-only-Status; DataTable echtes `<table>` mit `<th scope>`, Betrags-Spalte `text-end tabular-nums`; Erstattungsbetrag `aria-label`-Kontext; Datenschutz-Hinweis als `<dl>` (KeyValueRow); §-Zitate via `wrapNormZitate`; alle Beträge/Frist-Zahlen `tabular-nums`; Skeleton `motion-reduce:animate-none`.
- privacy-by-design: Datenschutz-Hinweis nennt verarbeitete Daten + Rechtsgrundlage (`§ 150 AO i.V.m. § 31 EStG` via wrapNormZitate) + Empfänger (Finanzamt); Datenminimierungs-Hinweis explizit; Datenquellen-Tiles zeigen welche Daten von welcher Stelle. „Entwurf"-Badge sichtbar, keine echte Abgabe.
- typecheck: pass. lint: pass (0 warnings/errors). unit suite: 639/639 pass. smoke `/steuer` HTTP 200, alle Marker (Steuer/Vorausgefüllte/Fortschritt/Übersicht der Steuerbereiche/Wichtige Fristen/Datenschutz-Hinweis/Prototyp) im HTML, keine Runtime-Fehler.
- prototype detail not matched: Bereichs-Aktions-Links sind Demo-Toasts (kein Drill-Down, kein Upload — Out-of-scope §10). „Zur Abgabe bereit"-Schritt bleibt visuell pending (kein Submit, §10).
- next: a11y-tester | code-reviewer | i18n-localizer (non-DE `steuer.*`)

## Build log — i18n-localizer
- date: 2026-05-27
- locales updated: [en, ru, uk, ar, tr]  (de.json source NOT touched — concurrent familie/stammdaten append in progress)
- new keys: 60 per locale (300 total) — full `steuer.*` block translated DE→target directly.
- changed keys: 0
- review-needed flags resolved: 0
- known gaps / decisions:
  - Behörden/Steuer-Fachbegriffe parenthesized with DE Latin for non-DE readers: Lohnsteuer, Krankenkasse, Werbungskosten, Vorsorgeaufwendungen, außergewöhnliche Belastungen, Sonderausgaben. `steuer.bereich.einkommen` ("Einkünfte aus nichtselbständiger Arbeit") rendered as plain-language "income from employment"/"Доходи від роботи за наймом" etc. (B1, no Behörden-jargon kept since the concept maps cleanly).
  - Recipient/source authority NAMES (Finanzamt, Familienkasse, AOK Nordost, Mittelstand Software GmbH) come from data/behoerden.json + seed `herkunft`, NOT from these keys — `steuer.quelle.herkunft` is only the "von {herkunft}" wrapper, localized per language word-order (tr: "{herkunft} kaynağından").
  - Rechtsgrundlage string "§ 150 AO i.V.m. § 31 EStG" is seed data (`steuer.json` datenschutz.rechtsgrundlage), rendered via wrapNormZitate — NOT an i18n key; no translation needed (kept verbatim per rule 2/3).
  - ICU: `steuer.frist.in_tagen` plural localized — ru one/few/many, uk one/few/many, ar zero/one/two/few/many, en/tr one/other. `{jahr}`, `{betrag}`, `{n}`, `{bereich}`, `{herkunft}`, `{label}`, `{count}` placeholders preserved.
  - Length flags (tight cells): table headers `col.*` (Category/Amount/Status/Action), tile labels `quelle.*`, status `status.*` and action `aktion.*` links — all within +40% of DE source in all 5 locales; AR/RU "Nicht vorhanden"→"غير متوفّر"/"Отсутствует" and "Voraussichtliche Erstattung"→longer but fit hero (not a tight cell). No hard overflow expected; flag to frontend-coder if `status.ergaenzen` ("To complete"/"Bحاجة إلى استكمال") wraps a narrow status column on mobile.
  - AR RTL-safe: Latin Behörden-Begriffe + `{placeholder}` tokens render LTR via bidi isolation; betrag/jahr already `dir="ltr"` tabular-nums spans per spec § 4.1/§ 9.
  - VALIDATION: structural review PASS for all 5 files (balanced braces, no trailing commas, key order mirrors de.json, each file 1911 lines). JSON.parse NOT runnable in this agent (no Bash) — main-thread JSON.parse gate recommended per V1.5 ship lesson.

---
## Code review — redesign-steuer
- reviewer: code-reviewer
- date: 2026-05-27
- verdict: **APPROVE**
- gates: tsc --noEmit pass; unit 639/639; next build pass; de/en/ru/uk/ar/tr JSON.parse OK; i18n parity 0 missing.
- summary: Pre-fill hero + stepper <ol>/aria-current + privacy-by-design rail; demo CTAs are toasts; abgabefrist date-locked to reminders.json. NIT: SteuerHeroCard.tsx:100 snake_case helper cn_amount.
- full report: docs/reviews/2026-05-27-redesign-supporting-six-code.md
