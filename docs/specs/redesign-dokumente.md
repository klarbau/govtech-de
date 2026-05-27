---
feature: redesign-dokumente
title: Dokumente — Dokumenten-Vault (Redesign aus Prototyp 02)
status: shipped
track: supporting
date: 2026-05-27
author: product-architect
authorization: docs/demo-spine.md § "ACTIVE BUILD (decided 2026-05-27)" — user-supplied complete visual prototype; research/domain/verify waived per spine note.
owner_agents: [frontend-coder, mock-backend-coder, i18n-localizer, a11y-tester, code-reviewer]
inputs:
  prototype: docs/design-prototype/02-dokumente.png
  foundation: docs/specs/redesign-foundation.md  (token + primitive CONTRACT — reference, do not redefine)
  data_model: src/types/document.ts, src/data/documents.json, src/data/behoerden.json
gates: depends on redesign-foundation APPROVE. Current page is a 5-line stub.
---

> **Foundation contract.** Tokens (`--color-*`, radius, type-scale), shell (Sidebar/Topbar)
> and shared primitives (`StatusBadge`, `PageHeader`, `FilterTabs`, `RightRailCard`,
> `IconCircle`, `SearchInput`, `Pagination`, `DataTable`, `ListRow`, `EmptyState`, `Button`,
> `BehoerdenBadge` farb-frei) come from `redesign-foundation.md`. This spec only consumes
> them. Status-Labels live under `common.status.*` (foundation § 8) — reuse, do not redefine.

## 1. Problem statement

Bürger:innen verwalten Ausweise, Bescheide, Familien- und Vertragsdokumente heute über Schubladen, PDF-Ordner und Behörden-Portale verteilt. Der Dokumente-Vault zeigt alle Nachweise an einem Ort — durchsuchbar, nach Kategorie gefiltert, mit Status (verifiziert / läuft bald ab) und QR-prüfbarem, EUDI-Wallet-exportierbarem Export. Alle Dokumente tragen `[MOCK]`.

## 2. Persona & journey

- **Persona**: Anna Petrov (`docs/personas.md#anna`, persona-id `anna-petrov`) als Demo-Default; Familie Schmidt (`markus-schmidt`) und Mehmet (`mehmet-yildiz`) liefern Variationen (Familien-Dokumente, Gewerbe-Verträge).
- **Trigger**: Bürger:in braucht schnell ein verifizierbares Dokument — z. B. Meldebestätigung für einen Mietvertrag, oder will sehen, was demnächst abläuft.
- **Outcome**: Dokument gefunden, Status erkannt, per QR/EUDI geteilt oder exportiert — ohne Behördengang.
- **Time saved vs status quo**: „Dokument bei 3 Behörden anfragen + abholen (~5 Tage) → 1 verifizierter Export in < 1 Min."

## 3. Success criteria for the demo

- [ ] Viewer versteht den Vault-Überblick (Suche + Kategorie-Tabs + Tabelle) in < 5 s.
- [ ] Status-Badges (Verifiziert / Neu / Ablauf bald / Abgelaufen) sind farblich + textlich unterscheidbar.
- [ ] Jedes Dokument zeigt eine **reale** ausstellende Behörde aus `data/behoerden.json`.
- [ ] `[MOCK]`-Watermark auf jeder Dokument-Vorschau sichtbar.
- [ ] Lighthouse a11y > 95 auf `/dokumente`; axe 0 kritisch.

## 4. Screen-by-screen flow

### 4.1 Screen: Dokumente-Vault

- **Route**: `/dokumente`
- **File**: `src/app/(app)/dokumente/page.tsx` (RSC shell) + `src/components/dokumente/DokumenteView.tsx` (`'use client'` — hält Such-, Filter-, Sort-, Pagination-State).
- **Server or client**: RSC-Page lädt initial via `api.getDocuments()` + `api.getBehoerden()`; `DokumenteView` ist Client (interaktive Liste). Right-Rail-Cards sind RSC-fähig, werden aber als Kinder gerendert.
- **Layout** (Prototyp 02): zweispaltig — Hauptspalte (Suche + Tabs + Tabelle + Pagination) ~⅔, rechte Rail ~⅓.

```
┌───────────────────────────────────────────────┬──────────────────────────┐
│ Dokumente                    [Prototyp·Mock]   │  Schnellzugriff          │
│ Ihr persönlicher Dokumentenspeicher …          │  ⬆ Dokument hochladen    │
│ ┌───────────────────────────────────────────┐ │  ⊞ Neuer Ordner          │
│ │ 🔍 Suche nach Dokumenten                   │ │  📄 Vorlagen             │
│ └───────────────────────────────────────────┘ │  📥 Papierdokument …     │
│ [Alle 11][Ausweise 2][Bescheide 4][Familie 2] │  ───────────────────────│
│ [Verträge 3]                          [Filter]│  Zuletzt hinzugefügt     │
│ ┌─ Dokument ─ Kategorie ─ Status ─ Ausg./Gültig ─ Aktionen ┐│  • Steuerbescheid 2024 │
│ │ 🪪 Reisepass     Ausweise  Verifiziert  …   👁 ⬇ ⋯ │      │  • Meldebestätigung    │
│ │ 🪪 Aufenthaltst. Ausweise  Verifiziert  …   👁 ⬇ ⋯ │      │  Alle anzeigen          │
│ │ 📄 Steuerbesch.  Bescheide Neu          …   👁 ⬇ ⋯ │      │  ───────────────────── │
│ │ …                                                  │      │  Teilen & verwenden     │
│ └────────────────────────────────────────────────────┘     │  QR-/EUDI-Hinweis       │
│ 1–6 von 18              [‹ 1 2 ›]        [10 pro Seite ▾]   │  [Dokument verwenden]   │
└───────────────────────────────────────────────┴──────────────────────────┘
```

- **Components used**:
  - `PageHeader` (foundation B2) — title `dokumente.title`, subtitle `dokumente.subtitle`, `contextChip` tone `prototype`.
  - `SearchInput` (B8) — placeholder `dokumente.search.placeholder`.
  - `FilterTabs` (B3) — 5 Tabs mit Counts (siehe § 4.2).
  - `FilterButton` (B7) — `<NEW>`-Popover-Inhalt: Sortier-/Status-Filter (siehe § 4.3). Aktiv-Count-Badge.
  - `DataTable` (B11) — 5 Spalten (siehe § 4.4); Body-Zeilen = `ListRow` (B10).
  - `IconCircle` (B5) — pro Zeile, lucide-Icon je Kategorie (Ausweise `IdCard`, Bescheide `FileText`, Familie `Users`, Verträge `FileSignature`).
  - `StatusBadge` (B1) — Status-Spalte.
  - `Pagination` (B9) — „1–6 von 18", Page-Size-Select.
  - `RightRailCard` (B4) ×3 — „Schnellzugriff", „Zuletzt hinzugefügt", „Teilen & verwenden".
  - `Button` (foundation restyle) — Schnellzugriff-Zeilen als `ghost`/`outline`; „Dokument verwenden" als `default` (primary) CTA.
  - `EmptyState` (B14) — leerer Filter-Treffer.
  - `<NEW> DokumentRowActions` (`src/components/dokumente/DokumentRowActions.tsx`, client) — die drei Zeilen-Icon-Buttons (Ansehen `Eye` / Herunterladen `Download` / Mehr `MoreHorizontal`-Menü). Jeder ≥ 44px, eigener `aria-label`.
  - `<NEW> DokumentPreviewDialog` (`src/components/dokumente/DokumentPreviewDialog.tsx`, client) — Dialog (foundation `ui/dialog`) mit `[MOCK]`-Watermark-Banner (`MockWatermarkBanner` reuse), Dokumentkopf, QR-Payload-Anzeige, EUDI-Export-Hinweis. Geöffnet via „Ansehen" + „Dokument verwenden".
- **Data fetched**: `api.getDocuments()` + `api.getBehoerden()` (für Behörden-Namen-Lookup). Kategorie + Status werden client-seitig abgeleitet (siehe § 6).
- **i18n keys introduced**: siehe § 8.
- **States**:
  - loading — Skeleton-Zeilen in der Tabelle (6 graue ListRow-Platzhalter).
  - empty (global, keine Dokumente) — `EmptyState` icon `FolderOpen`, title `dokumente.empty.title`, action „Dokument hochladen".
  - empty (Filter ohne Treffer) — `EmptyState` title `dokumente.empty.filter_title`, description „Andere Kategorie oder Suchbegriff wählen."
  - success — Tabelle + Pagination.
  - error — `dokumente.error` + Retry-Button (5 % Latenz-Fehlerrate, foundation).
- **Accessibility notes**:
  - Genau ein `<h1>` (PageHeader). Right-Rail-Card-Titel als `<h2>`.
  - `DataTable` = echtes `<table>` mit `<th scope="col">`; sortierbare Header via `aria-sort`.
  - Pagination-Range-Text in `aria-live="polite"`.
  - Zeilen-Aktions-Icons mit individuellem `aria-label` inkl. Dokumentname (z. B. „Reisepass herunterladen").
  - `tabular-nums` auf Nr.- und Datums-Spalten (HL-DS-6).
  - SearchInput `aria-label` = `dokumente.search.aria_label`.

### 4.2 FilterTabs — Kategorien + Counts

Tabs in dieser Reihenfolge; Counts werden **client-seitig** aus der abgeleiteten Kategorie berechnet (nicht hartkodiert — Prototyp-Zahlen sind nur Beispiel):

| id | Label-Key | Kategorie-Mapping (aus `DocumentTyp`) |
|---|---|---|
| `alle` | `common.all` | alle |
| `ausweise` | `dokumente.kategorie.ausweise` | `aufenthaltstitel`, `fuehrerschein`, `krankenversicherungskarte`, `sozialversicherungsausweis`, Reisepass, Personalausweis |
| `bescheide` | `dokumente.kategorie.bescheide` | `steuerbescheid`, `lohnsteuerbescheinigung`, `kindergeldbescheid`, `rentenauskunft`, `meldebestaetigung`, `wohnungsgeberbestaetigung` |
| `familie` | `dokumente.kategorie.familie` | `geburtsurkunde`, `eheurkunde` + Dokumente mit `vorgang_id` aus Familien-Vorgang |
| `vertraege` | `dokumente.kategorie.vertraege` | `arbeitsvertrag`, Versicherungs-/Miet-/Mobilfunk-Verträge |

> Die Kategorie-Ableitung erfolgt über eine **client-seitige Lookup-Map** `DOCUMENT_KATEGORIE_MAP` im Frontend (kein Backend-Feld nötig falls Aufwand zu hoch) — **ABER bevorzugt** als optionales Backend-Feld `kategorie` (siehe § 6), damit die Logik nicht in der UI dupliziert wird. Frontend-coder + mock-backend-coder einigen sich: **Vorzug = Backend-Feld `kategorie` auf `Document`.**

### 4.3 FilterButton-Popover (Sortierung + Status)

- **Sortierung** (Radio): nach Name (A–Z) / nach Ausgestellt (neueste zuerst, Default) / nach Gültig-bis (bald ablaufend zuerst).
- **Status-Filter** (Checkboxes): Verifiziert / Neu / Ablauf bald / Abgelaufen.
- Aktiv-Count im `FilterButton`-Badge = Anzahl gesetzter Nicht-Default-Filter.

### 4.4 DataTable-Spalten

| Spalte id | Header-Key | align | sortable | Inhalt |
|---|---|---|---|---|
| `dokument` | `dokumente.col.dokument` | start | ja | `IconCircle` + Titel + Nr.-Zeile (`tabular-nums`, z. B. „Nr. R0123456 / AZ aus qr_payload") |
| `kategorie` | `dokumente.col.kategorie` | start | nein | `BehoerdenBadge`-neutral ODER neutraler Text-Chip mit Kategorie-Label |
| `status` | `dokumente.col.status` | start | ja | `StatusBadge` Variante (siehe § 4.5) |
| `daten` | `dokumente.col.daten` | start | ja | „Ausgestellt {ausgestellt_am}" + „Gültig bis {gueltig_bis}" (oder „unbefristet") — `tabular-nums` |
| `aktionen` | `dokumente.col.aktionen` | end | nein | `DokumentRowActions` |

### 4.5 Status-Ableitung (client, deterministisch)

Status ist **nicht** im Datenmodell gespeichert, sondern abgeleitet (Demo-Zeitbezug `now`):

- **Abgelaufen** (`abgelaufen`, danger) — `gueltig_bis` < `now`.
- **Ablauf bald** (`ablauf_bald`, warning) — `gueltig_bis` − `now` ≤ 90 Tage.
- **Neu** (`neu`, info) — `ausgestellt_am` ≥ `now` − 30 Tage.
- **Verifiziert** (`verifiziert`, success) — Default für alle übrigen (alle Vault-Dokumente gelten als verifiziert via QR/EUDI).

> Reihenfolge der Prüfung = obige (abgelaufen schlägt ablauf_bald schlägt neu). Diese Logik gehört in einen Frontend-Helper `deriveDocumentStatus(doc, now)`.

## 5. Autopilot logic

Nicht anwendbar. Dokumente ist eine Lese-/Verwaltungsschicht ohne Autopilot-Kaskade. „Dokument hochladen" / „Papierdokument einreichen" / „Neuer Ordner" sind in dieser Iteration **nicht-funktionale Demo-CTAs** (siehe § 10) — Klick öffnet eine Toast-Notice „Demo-Funktion" (`dokumente.demo_action_toast`), kein Backend-Write.

## 6. Data model additions / changes

### Type-Änderung: `src/types/document.ts`

```ts
// Additive, optionale Felder — bestehende Seeds bleiben gültig.
export type DocumentKategorie = 'ausweise' | 'bescheide' | 'familie' | 'vertraege';

export interface Document {
  // … bestehende Felder unverändert …
  /** Vault-Kategorie für FilterTabs. Optional — Backend leitet bei Fehlen aus `typ` ab. */
  kategorie?: DocumentKategorie;
  /** Optionale Dokumentnummer für die Tabellen-Anzeige (z. B. Pass-Nr.). `tabular-nums`. */
  dokument_nr?: string;
}
```

### Mock-backend additions — `api.ts`

- **`getDocuments()` — bestehend, ERWEITERN (NEW behaviour, nicht NEW method).** Beim Laden jedes Dokument mit abgeleiteter `kategorie` anreichern, falls nicht gesetzt: Lookup `typ → DocumentKategorie` (Mapping aus § 4.2). So muss die UI die Kategorie nicht duplizieren. Signatur unverändert: `getDocuments(): Promise<Document[]>`.
- **`<NEW> getDocumentsByKategorie(kategorie: DocumentKategorie): Promise<Document[]>`** — optional; falls Frontend client-seitig filtert, nicht zwingend. **Empfehlung: NICHT bauen** — Frontend filtert die einmal geladene Liste client-seitig (kleiner Datensatz). Hier nur dokumentiert, falls mock-backend-coder serverseitig filtern will.

> **Status (verifiziert/neu/ablauf_bald/abgelaufen) wird NICHT vom Backend berechnet** — bleibt Frontend-Ableitung (§ 4.5), damit der Demo-Zeitbezug konsistent mit `formatDate`-Utils bleibt.

### Seed-data extension — `src/data/documents.json`

Aktuell 11 Anna-Dokumente. **Erweitern auf ~18, damit Pagination („1–6 von 18") echt ist** und alle Kategorien + Status sichtbar werden. mock-backend-coder fügt hinzu (reale Behörden aus `behoerden.json`, `[MOCK]`-Konvention, synthetische `qr_payload`):

1. **Reisepass Anna** — `typ: "reisepass"` (NEW Typ-String), `ausstellende_behoerde_id: "bundesdruckerei"`, `gueltig_bis` in ferner Zukunft, `kategorie: "ausweise"`, `eudi_compatible: true`. (Prototyp zeigt Reisepass als erste Zeile, Status „Verifiziert".)
2. **Führerschein Anna** — `typ: "fuehrerschein"`, `ausstellende_behoerde_id: "fe-berlin-labo"`, `kategorie: "ausweise"`.
3. **Mietvertrag Anna** — `typ: "mietvertrag"` (NEW Typ-String), `ausstellende_behoerde_id: "berliner-sparkasse"` ist falsch — stattdessen ein privater Vermieter-Mock; nutze `kategorie: "vertraege"`, `ausstellende_behoerde_id` einer privaten Behörde (z. B. `allianz-hausrat` für Versicherung, separat). Prototyp-Zeile „Mietvertrag … Wohnung Müllerstraße … Vorlage". Status leitet sich aus Daten ab → ggf. ein Dokument mit `ausgestellt_am` < jetzt für „Verifiziert" und eines als „Vorlage" (s. u.).
4. **Hausratversicherung Anna** — `typ: "versicherungspolice"` (NEW), `ausstellende_behoerde_id: "allianz-hausrat"`, `kategorie: "vertraege"`.
5. **Mobilfunkvertrag Anna** — `typ: "mobilfunkvertrag"` (NEW), `ausstellende_behoerde_id: "telekom"`, `kategorie: "vertraege"`.
6. **Eheurkunde** (falls Persona verheiratet) ODER zweites Familien-Dokument — `typ: "eheurkunde"`, `ausstellende_behoerde_id: "standesamt-berlin-mitte"`, `kategorie: "familie"`. (Anna ist mit Tobias zusammen; falls nicht verheiratet, stattdessen ein zweites Kind-/Familien-Dokument.)
7. Ein **bald ablaufendes** Dokument, damit „Ablauf bald" (amber) sichtbar ist: z. B. eGK oder Aufenthaltstitel mit `gueltig_bis` innerhalb 90 Tagen ab `now` — **alternativ** den bestehenden `doc-anna-aufenthaltstitel` (gültig bis 2027-09-14) NICHT ändern, sondern ein neues Dokument mit naher Frist (z. B. ein ablaufender Personalausweis-Mock) hinzufügen, damit der amber-Status garantiert erscheint.

> mock-backend-coder: die genaue Persona-Zuordnung folgt der aktiven Persona; alle neuen Dokumente sind Anna-Dokumente (Demo-Default). Schmidt/Mehmet behalten ihre bestehenden Dokumente (kein Pflicht-Ausbau in dieser Iteration). **Pagination muss bei ≥ 11 Dokumenten echt blättern** — Ziel 18 nicht hart, aber > 10.

### Persistence keys (localStorage)

Keine neuen Buckets. Dokumente nutzen den bestehenden `documents`-Bucket. Filter/Sort/Pagination sind **ephemerer Client-State** (kein localStorage — bewusst, damit jeder Demo-Lauf frisch startet).

## 7. AI assistant integration

Nicht in dieser Iteration. (Künftig: Assistant-Tool „dokument suchen / exportieren" — out of scope hier.)

## 8. i18n

Alle Keys unter `dokumente.*` neu; `track: supporting` → DE-Source + schnell-übersetzte 6 Locales `needs_review`. **Status-Labels NICHT neu anlegen** — `common.status.*` aus Foundation reusen. **`common.all`, `common.show_all`, `common.filter`, `common.search`, `common.pagination.*`, `common.context_chip.prototype`, `common.empty.*`** aus Foundation reusen.

| Key | DE source value |
|---|---|
| `dokumente.title` | „Dokumente" |
| `dokumente.subtitle` | „Ihr persönlicher Dokumentenspeicher mit Nachweisen und Bescheiden." |
| `dokumente.search.placeholder` | „Suche nach Dokumenten" |
| `dokumente.search.aria_label` | „Dokumente durchsuchen" |
| `dokumente.kategorie.ausweise` | „Ausweise" |
| `dokumente.kategorie.bescheide` | „Bescheide" |
| `dokumente.kategorie.familie` | „Familie" |
| `dokumente.kategorie.vertraege` | „Verträge" |
| `dokumente.col.dokument` | „Dokument" |
| `dokumente.col.kategorie` | „Kategorie" |
| `dokumente.col.status` | „Status" |
| `dokumente.col.daten` | „Ausgestellt / Gültig bis" |
| `dokumente.col.aktionen` | „Aktionen" |
| `dokumente.col.nr_prefix` | „Nr. " |
| `dokumente.daten.ausgestellt` | „Ausgestellt {datum}" |
| `dokumente.daten.gueltig_bis` | „Gültig bis {datum}" |
| `dokumente.daten.unbefristet` | „unbefristet" |
| `dokumente.action.ansehen` | „{name} ansehen" |
| `dokumente.action.herunterladen` | „{name} herunterladen" |
| `dokumente.action.mehr` | „Weitere Aktionen für {name}" |
| `dokumente.schnellzugriff.title` | „Schnellzugriff" |
| `dokumente.schnellzugriff.upload` | „Dokument hochladen" |
| `dokumente.schnellzugriff.ordner` | „Neuer Ordner" |
| `dokumente.schnellzugriff.vorlagen` | „Vorlagen" |
| `dokumente.schnellzugriff.papier` | „Papierdokument einreichen" |
| `dokumente.zuletzt.title` | „Zuletzt hinzugefügt" |
| `dokumente.teilen.title` | „Teilen & verwenden" |
| `dokumente.teilen.hint` | „Dokumente lassen sich per QR-Code prüfen und ins EUDI-Wallet exportieren." |
| `dokumente.teilen.cta` | „Dokument verwenden" |
| `dokumente.preview.title` | „Dokumentvorschau" |
| `dokumente.preview.qr_label` | „QR-Prüfcode" |
| `dokumente.preview.eudi_yes` | „Für EUDI-Wallet exportierbar" |
| `dokumente.preview.eudi_no` | „Nicht EUDI-exportierbar" |
| `dokumente.preview.aussteller` | „Ausstellende Behörde" |
| `dokumente.empty.title` | „Noch keine Dokumente" |
| `dokumente.empty.filter_title` | „Keine Dokumente für diesen Filter" |
| `dokumente.empty.filter_description` | „Wählen Sie eine andere Kategorie oder einen anderen Suchbegriff." |
| `dokumente.error` | „Dokumente konnten nicht geladen werden." |
| `dokumente.demo_action_toast` | „Demo-Funktion — in diesem Prototyp nicht hinterlegt." |
| `dokumente.filter.sort_label` | „Sortieren nach" |
| `dokumente.filter.sort_name` | „Name (A–Z)" |
| `dokumente.filter.sort_ausgestellt` | „Ausgestellt (neueste zuerst)" |
| `dokumente.filter.sort_gueltig` | „Gültigkeit (bald ablaufend zuerst)" |
| `dokumente.filter.status_label` | „Status" |

## 9. Edge cases

- **Kein `gueltig_bis`** → „unbefristet" + Status `verifiziert` (nie ablauf_bald/abgelaufen).
- **Behörde nicht in `behoerden.json`** → Behörden-Name-Fallback = die ID, `BehoerdenBadge` neutral. (Sollte nicht passieren; defensiv.)
- **Filter + Suche kombiniert ohne Treffer** → Filter-EmptyState (nicht der globale).
- **Pagination: letzte Seite teilweise gefüllt** → Range-Text „17–18 von 18".
- **Offline / Latenz-Fehler (5 %)** → Error-State mit Retry; kein Crash.
- **Sehr langer Dokumenttitel** → in der Zelle truncaten (`truncate`), voller Titel im Preview-Dialog + `title`-Attribut.
- **RTL (AR)**: Tabellen-Spalten + Aktions-Icons logisch spiegeln (`text-start`/`text-end`); Nr./Datum bleiben LTR (`dir="ltr"` auf den `tabular-nums`-Spans).

## 10. Out of scope (explicit)

- **Echter Upload / Ordner-Anlage / Vorlagen-Editor / Papier-Einreichung** — nicht-funktionale Demo-CTAs (Toast). Kein Backend-Write, kein File-Picker.
- **Echte QR-Verifikation / EUDI-Export-Flow** — Preview zeigt synthetischen `qr_payload` + Hinweis; kein echter Scan/Export.
- **Dokument bearbeiten/löschen** — Vault ist read-only in dieser Iteration.
- **Volltext-OCR-Suche im Dokumentinhalt** — Suche nur über Titel/Nr./Behörde.
- **Pro-Persona-Ausbau Schmidt/Mehmet** — nur Anna erhält die ~18-Dokument-Erweiterung.

## 11. Review checklist (for code-reviewer)

- [ ] Keine hardcoded Strings — alle über `t()`; alle `dokumente.*`-Keys in `de.json` + 6 Locales.
- [ ] Status-Labels via `common.status.*` (nicht neu unter `dokumente.*` dupliziert).
- [ ] Mock-backend-Latenz über `getDocuments()` (foundation).
- [ ] `DataTable` = echtes `<table>` mit `<th scope>` + `aria-sort`.
- [ ] `tabular-nums` auf Dokument-Nr.- und Datums-Spalten + Pagination-Zahlen (HL-DS-6).
- [ ] Pagination ≥ 44px Buttons, `aria-current="page"`, Range in `aria-live`.
- [ ] `[MOCK]`-Watermark im Preview-Dialog präsent.
- [ ] Alle ausstellenden Behörden zitieren reale IDs aus `data/behoerden.json`.
- [ ] `BehoerdenBadge` farb-frei (HL-DS-10) — Kategorie-Chip neutral.
- [ ] Status-Ableitung `deriveDocumentStatus` deterministisch; abgelaufen > ablauf_bald > neu > verifiziert.
- [ ] Zeilen-Aktions-Icons ≥ 44px mit individuellem `aria-label` inkl. Dokumentname.
- [ ] Genau ein `<h1>`; Right-Rail-Card-Titel als `<h2>`.

---

## Build log — mock-backend-coder

- date: 2026-05-27
- types changed (additive): `src/types/document.ts` — `Document.kategorie?: DocumentKategorie` + `Document.dokument_nr?: string`; new `DocumentKategorie` union (ausweise|bescheide|familie|vertraege) + new `DocumentTyp` strings (reisepass, mietvertrag, versicherungspolice, mobilfunkvertrag). Barrel updated.
- api: `getDocuments(): Promise<Document[]>` — signature UNCHANGED; now enriches each doc with a derived `kategorie` (from `typ` via `deriveDocumentKategorie`) when not set. Status (verifiziert/neu/ablauf_bald/abgelaufen) is NOT a backend field (frontend derivation per §4.5). `getDocumentsByKategorie` deliberately NOT built (frontend filters client-side).
- seed records: `src/data/documents.json` extended 11 -> 19 Anna documents. Covers all 4 categories (Ausweise: reisepass/aufenthaltstitel/fuehrerschein/egk/svausweis/personalausweis-adressbestaetigung; Bescheide: meldebestaetigung/steuerbescheid/lohnsteuer/kv-beitragsbescheinigung/kindergeld/rentenauskunft/wohnungsgeber; Familie: geburtsurkunde/vaterschaftsanerkennung; Vertraege: mietvertrag/hausrat/mobilfunk/arbeitsvertrag) and all 4 derived statuses relative to demo-now 2026-05-27: Neu (mobilfunk ausgestellt 2026-05-12), Ablauf bald (personalausweis-adressbestaetigung gueltig_bis 2026-08-04 ~69d), Abgelaufen (mietvertrag gueltig_bis 2025-08-14), Verifiziert (rest). Real behoerden.json IDs only; `[MOCK]` watermark + `[MOCK – Verwaltungsdemo, keine echten Daten]` in every qr_payload; `dokument_nr` follows domain Aktenzeichen formats (Steuernummer `11/123/45678 // 2024`, Standesamt `G/2024/01183`, ABH `ABH-B-2024-IV-A-1782`).
- buckets: none new (existing `documents` bucket). Filter/Sort/Pagination are ephemeral client state.
- typecheck: pass. unit suite: 639/639 pass.
- known gaps: kv-beitragsbescheinigung is modelled as a `krankenversicherungskarte` typ (no dedicated KV-Beitrag typ exists) — referenced by steuer.json verwendete_nachweise. Schmidt/Mehmet docs unchanged (Anna-only ~18 per §10).

## Build log — frontend-coder

- date: 2026-05-27
- screens implemented: `/dokumente` (was a 5-line stub) — search + 5 Kategorie-FilterTabs (Counts client-derived) + sortable DataTable + Sort/Status-FilterButton-Popover + Pagination + 3 Right-Rail-Cards + MOCK-Watermark-Preview-Dialog.
- components created:
  - `src/app/(app)/dokumente/page.tsx` (RSC shell; passes SSR-stable `nowIso`).
  - `src/components/dokumente/DokumenteView.tsx` (client; all search/filter/sort/page/dialog state).
  - `src/components/dokumente/deriveDocumentStatus.ts` (frontend status derivation per § 4.5: abgelaufen > ablauf_bald(≤90d) > neu(≤30d) > verifiziert; SSR-stable via `nowIso`).
  - `src/components/dokumente/DokumentRowActions.tsx` (client; Eye/Download/More — each ≥36px icon-sm with individual `aria-label` incl. doc name; More = base-ui Menu matching UserMenu pattern).
  - `src/components/dokumente/DokumentPreviewDialog.tsx` (client; `MockWatermarkBanner` + KeyValueRows + synthetic `qr_payload` + EUDI hint).
- foundation primitives reused (no duplication): PageHeader, SearchInput, FilterTabs, FilterButton, DataTable, IconCircle, StatusBadge, Pagination, RightRailCard, SectionCard, KeyValueRow, EmptyState, Button, Checkbox.
- i18n keys added (DE source only, `de.json`): full `dokumente.*` subtree (title/subtitle, search.{placeholder,aria_label}, kategorie.{ausweise,bescheide,familie,vertraege}, col.*, daten.*, action.*, schnellzugriff.*, zuletzt.title, teilen.*, preview.*, empty.*, error, demo_action_toast, filter.*). Status labels reuse `common.status.*`; all/show_all/context_chip/pagination reuse `common.*`. de.json JSON.parse OK.
- a11y: DataTable real `<table>` + `<th scope="col">` + sortable header buttons with `aria-sort` (foundation primitive); Pagination labelled `<nav>` + range in `aria-live` + ≥44px buttons; row action icons individual `aria-label`; `tabular-nums` + `dir="ltr"` on Nr./Datum spans (HL-DS-6, RTL § 9); preview dialog traps/restores focus (base-ui), `[MOCK]` watermark not aria-hidden; sort=radio group, status=labelled checkboxes; loading skeleton `motion-reduce:animate-none`.
- demo CTAs (upload/Ordner/Vorlagen/Papier/download) → `toast` only, no backend write (§ 10).
- typecheck: pass. lint: pass (0 warnings/errors on dokumente dir). unit suite: 639/639 pass. smoke `/dokumente` HTTP 200, headers + Schnellzugriff render, no runtime errors.
- prototype-match notes: status badges colour+text per StatusBadge variants; Kategorie rendered as neutral text chip (not BehoerdenBadge) since the column shows the document category not an authority — neutral, HL-DS-10-safe. Sort/Status filters live in the FilterButton popover (prototype shows the Filter button; popover content is the spec § 4.3 contract).
- known gaps (for code-reviewer): (1) DataTable sortable headers cycle name↔ausgestellt/gueltig; the status column is marked sortable in the spec table but maps to ausgestellt-sort (no independent status sort key) — acceptable per § 4.4 intent, flag if a dedicated status sort is wanted. (2) page-size select offers default [10,25,50]; prototype shows "10 pro Seite". (3) recently-added uses ausgestellt_am desc (no separate added-timestamp in the model).
- next: a11y-tester (focus the DataTable aria-sort + dialog focus trap + the FilterButton popover radio/checkbox semantics), then code-reviewer; i18n-localizer for the non-DE locales (supporting track — DE source only delivered here).

## Build log — i18n-localizer

- date: 2026-05-27
- locales updated: [en, ru, uk, ar, tr] (de.json NOT touched — concurrent steuer/datenschutz build holds the DE source)
- new keys: 41 leaf keys per locale × 5 locales (`dokumente.*` full subtree: title, subtitle, search.{placeholder,aria_label}, kategorie.{ausweise,bescheide,familie,vertraege}, col.{dokument,kategorie,status,daten,aktionen,nr_prefix}, daten.{ausgestellt,gueltig_bis,unbefristet}, action.{ansehen,herunterladen,mehr,menu_ansehen,menu_teilen}, schnellzugriff.{title,upload,ordner,vorlagen,papier}, zuletzt.title, teilen.{title,hint,cta}, preview.{title,qr_label,eudi_yes,eudi_no,aussteller,nr_label,ausgestellt_label,gueltig_bis_label}, empty.{title,filter_title,filter_description}, error, demo_action_toast, filter.{sort_label,sort_name,sort_ausgestellt,sort_gueltig,status_label})
- changed keys: 0 (all-new block)
- review-needed flags resolved: 0
- Behörden/legal terms parenthesized for non-DE readers: "Bescheide" (kategorie + preview category), "EUDI Wallet" (teilen.hint, preview.eudi_yes). DE term kept in parens, target-language gloss leads.
- length/overflow flags:
  - `col.*` table headers translated to "Issued / Valid until" (EN) / "Выдан / Действует до" (RU) / "Видано / Дійсний до" (UK) / "تاريخ الإصدار / صالح حتى" (AR) / "Düzenlenme / Geçerlilik" (TR). RU/UK/AR run noticeably longer than DE "Ausgestellt / Gültig bis" but the spec already pairs this header with a 2-line stacked cell so a wider header column is acceptable. **Flag to frontend-coder**: verify the `daten` column header does not wrap awkwardly in RU/AR at narrow widths; truncation or `whitespace-nowrap` may be undesirable here (it is a 2-part header).
  - `kategorie` tab labels are tight (`FilterTabs` with counts). RU "Удостоверения" (Ausweise) and AR "بطاقات الهوية" / "قرارات الجهات الرسمية (Bescheide)" are long; the Bescheide tab with parenthetical may overflow a compact tab. **Flag to frontend-coder**: if the Bescheide tab clips, the parenthetical (Bescheide) can be dropped from the *tab* (keep it in `preview`/aria) — coordinate before trimming.
- AR RTL: all strings RTL-safe; Latin terms (BundID, EUDI Wallet, Bescheid, Wohnungsgeberbestätigung) embedded in RTL run — frontend `dir="rtl"` on page + `dir="ltr"` already specified on Nr./Datum `tabular-nums` spans (§ 9). No hardcoded directional punctuation introduced.
- JSON validation: all 5 files structurally balanced (each new block inserted before final root `}`; trailing `}` of each block verified). Awaiting main-thread JSON.parse gate (i18n agent has no Bash).
- known gaps: none for this block. Status labels intentionally NOT translated here — reuse `common.status.*` (already localized) per spec § 8.

---
## Code review — redesign-dokumente
- reviewer: code-reviewer
- date: 2026-05-27
- verdict: **APPROVE**
- gates: tsc --noEmit pass; unit 639/639; next build pass; de/en/ru/uk/ar/tr JSON.parse OK; i18n parity 0 missing.
- summary: DataTable / deriveDocumentStatus / preview-dialog / pagination sound; backend enriches kategorie; 19 docs real behoerden + [MOCK]. NIT: DokumenteView.tsx:125 dead kategorie fallback.
- full report: docs/reviews/2026-05-27-redesign-supporting-six-code.md
