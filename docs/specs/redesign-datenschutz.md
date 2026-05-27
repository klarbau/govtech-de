---
feature: redesign-datenschutz
title: Datenschutz — Datenschutz-Cockpit (Redesign, NEW screen)
status: spec
track: supporting
date: 2026-05-27
author: product-architect
authorization: docs/demo-spine.md § "ACTIVE BUILD (decided 2026-05-27)" — user-supplied complete visual prototype; research/domain/verify waived per spine note.
owner_agents: [frontend-coder, mock-backend-coder, i18n-localizer, a11y-tester, code-reviewer]
inputs:
  prototype: docs/design-prototype/07-datenschutz.png
  foundation: docs/specs/redesign-foundation.md (token + primitive CONTRACT — reference, do not redefine)
  data_model: src/types/stammdaten.ts (UebermittlungsLogEntry), src/types/behoerde.ts, src/lib/mock-backend/api.ts (getUebermittlungsLog, getBehoerden)
gates: depends on redesign-foundation APPROVE (tokens + primitives must exist first).
---

> **Scope.** Replaces the current `(app)/datenschutz` placeholder with the
> prototype's Datenschutz-Cockpit. This screen is **the** privacy-by-design
> surface of the project (CLAUDE.md mission constraint) — it must show *what is
> processed, by whom, on what legal basis*. The consent toggles are **functional
> and persisted** (real `localStorage` write path), unlike most read-only
> supporting screens. The activity timeline **reuses the existing
> `UebermittlungsLogEntry`** model — no parallel log. `track: supporting`.

> **Foundation reuse rule.** Cite primitives from `redesign-foundation.md` § 6.B.
> Screen-specific components live under `src/components/datenschutz/`.

---

## 1. Problem statement

Bürger:innen wissen heute nicht, welche Stelle wann welche ihrer Daten erhalten
hat und auf welcher Rechtsgrundlage — Auskunftsrechte nach Art. 15 DSGVO sind
papierhaft und langsam. Das Datenschutz-Cockpit macht die letzten Übermittlungen,
die erteilten Einwilligungen und die Datenquellen/Empfänger in **einer** Sicht
sichtbar und gibt der/dem Bürger:in granulare Kontrolle (Einwilligungs-Toggles).

## 2. Persona & journey

- **Persona**: Anna Petrov (Demo-Default; nach Umzug-Cascade enthält das
  Aktivitätsprotokoll behördliche Übermittlungen). Siehe `anna-petrov` im Seed.
- **Trigger**: Nutzer:in öffnet `/datenschutz` (Sidebar) oder kommt über den
  „Mehr zu Datenschutz"-Link aus Familie/Stammdaten.
- **Outcome**: Nutzer:in sieht die letzten Aktivitäten, schaltet eine
  Einwilligung um (z. B. „Krankenkasse" aus), sieht die Datenquellen-Tabelle und
  weiß, auf welcher Rechtsgrundlage welche Stelle zugreift.
- **Time saved**: Art.-15-Auskunft (Wochen, papierhaft) → Selbstauskunft in der App.

## 3. Success criteria for the demo

- [ ] „Spekulatives Demo-Feature"-Chip + dismissible „2027-Vision"-Banner sichtbar.
- [ ] „Letzte Aktivitäten"-Timeline zeigt die Übermittlungs-/App-Aktivitäts-
      Einträge mit Typ-Badge + Zeitstempel + Rechtsgrundlage.
- [ ] Einwilligungs-Toggles **funktionieren und persistieren** über Reload
      (localStorage); Umschalten erzeugt einen Activity-Log-Eintrag.
- [ ] „Datenquellen & Empfänger"-Tabelle zeigt Stelle, Zugriffsart
      (automatisch-synchronisiert / einwilligungsbasiert) und Aktualität.
- [ ] Jede Aktivität und jede Einwilligung nennt eine **Rechtsgrundlage**
      (privacy-by-design Mission).
- [ ] Lighthouse a11y > 95; axe 0 kritisch.

## 4. Screen-by-screen flow

### 4.1 Screen: Datenschutz-Cockpit

- **Route**: `/datenschutz`
- **File**: `src/app/(app)/datenschutz/page.tsx` (RSC shell) →
  `src/components/datenschutz/DatenschutzView.tsx` (Client — Toggle-State,
  Banner-Dismiss, Daten laden via `api.*`).
- **Server or client**: Page RSC; `DatenschutzView` Client.
- **Layout** (ASCII; 2-Spalten ab `lg`: links Timeline + Tabelle, rechts
  Einwilligungen-Rail; auf der Höhe des Prototyps stehen Einwilligungen oben rechts):

```
┌───────────────────────────────────────────┬──────────────────────────┐
│ H1 „Datenschutz" · Subtitle      [Chip: Spekulatives Demo-Feature]     │
│ ┌ Dismissible Banner „2027-Vision" (info) ──────────────────[× schließen]┐│
│ └────────────────────────────────────────────────────────────────────┘ │
│ ┌─ SectionCard „Letzte Aktivitäten" ───────┐ │ ┌ RightRailCard ───────┐ │
│ │ ActivityRow · Brief geöffnet   · 2h · §…  │ │ │ Einwilligungen        │ │
│ │ ActivityRow · KI-Zusammenfassung·…· §…    │ │ │ ┌ Krankenkasse  [Ein] │ │
│ │ ActivityRow · Adresse übermittelt·…· §…   │ │ │ ├ Bank          [Aus] │ │
│ │ ActivityRow · Dokument geladen ·…· §…     │ │ │ ├ Arbeitgeber   [Aus] │ │
│ │ ActivityRow · Einwilligung erteilt·…· §…  │ │ │ └ Weitere Dienste …   │ │
│ │ Footer-Link „Alle Aktivitäten anzeigen"   │ │ └──────────────────────┘ │
│ └───────────────────────────────────────────┘ │ ┌ RightRailCard ───────┐ │
│ ┌─ SectionCard „Datenquellen & Empfänger" ─┐ │ │ Datenquellen…(mirror?)│ │
│ │ DataTable: Stelle | Zugriffsart | Aktual.│ │ └──────────────────────┘ │
│ │  Bürgeramt  | automat.-synchr. | aktuell  │ │                          │
│ │  Finanzamt  | automat.-synchr. | aktuell  │ │                          │
│ │  Krankenkasse| einwilligungsb. | …        │ │                          │
│ │  Footer-Link „Alle Empfänger anzeigen"    │ │                          │
│ └───────────────────────────────────────────┘ │                          │
│ ┌─ SectionCard „Ihre Datenschutz-Kontrolle"──────────────────────────┐  │
│ │ [Zugriffsprotokoll]  [Datenexport]  [Einstellungen]  (action tiles) │  │
│ └──────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
```

> Prototyp-Treue: im PNG steht „Einwilligungen" und „Datenarten & Empfänger" in
> der rechten Spalte; „Letzte Aktivitäten" links breit; „Ihre Datenschutz-
> Kontrolle" als Aktions-Zeile unten links. Frontend-coder: gegen das PNG messen;
> die obige Anordnung ist verbindlich für die Block-Reihenfolge, nicht
> pixel-für-pixel.

- **Components used** (foundation primitives unless `<NEW datenschutz/>`):
  - `PageHeader` (B2) — `title=datenschutz.page.title`, `subtitle`,
    `contextChip` tone `speculative` (`common.context_chip.speculative`).
  - Dismissible „2027-Vision"-Banner — reuse `VisionBanner`
    (`src/components/stammdaten/kontakt/VisionBanner.tsx`, token-restyle). Muss
    dismissible sein (× schließen) + Dismiss-State persistiert (siehe § 6
    Persistence). Body verbatim aus i18n.
  - `SectionCard` (B12) — „Letzte Aktivitäten", „Datenquellen & Empfänger",
    „Ihre Datenschutz-Kontrolle".
  - `<ActivityTimelineRow>` `<NEW datenschutz/>` —
    `src/components/datenschutz/ActivityTimelineRow.tsx`. Props:
    `entry: UebermittlungsLogEntry`, `behoerdenById`. Rendert über `ListRow`
    (B10): `leading=IconCircle` (Typ-Icon: Brief→`Mail`,
    KI-Zusammenfassung→`Sparkles`, Adresse→`MapPin`/`ArrowLeftRight`,
    Dokument→`Download`, Einwilligung→`ShieldCheck`), `title`=Zweck (aus
    `zweck_i18n_key`), `subtitle`=Empfänger/Absender-Name (aus `behoerdenById`),
    `meta=[<NormZitatSpan rechtsgrundlage/>, <relativer Zeitstempel>]`,
    `status=<StatusBadge>` Typ-Badge (siehe Typ→Variant-Mapping unten).
    RSC.
  - **Typ-Badge-Mapping** (auf `UebermittlungsLogEntry.kategorie`):
    - `behoerde_zu_behoerde` → `StatusBadge variant="laufend"` Label
      „Übermittlung" (`datenschutz.activity.typ.uebermittlung`).
    - `behoerde_zu_buerger` → `variant="neu"` Label „Eingang"
      (`datenschutz.activity.typ.eingang`).
    - `app_aktivitaet` → neutral Label „App-Aktivität"
      (`datenschutz.activity.typ.app`).
    - `speculative_2027` → `tone speculative` Label „Vision"
      (`datenschutz.activity.typ.vision`).
  - `<NormZitatSpan>` — reuse `src/components/posteingang/NormZitatSpan.tsx` für
    §-Zitate (Lookup-Map bereits Stammdaten-erweitert; keine neuen Norms nötig
    außer Art. 15/Art. 6 DSGVO — falls nicht in der Map, ergänzen, siehe § 8).
  - `<ConsentToggleRow>` `<NEW datenschutz/>` (client) —
    `src/components/datenschutz/ConsentToggleRow.tsx`. Props: `id`, `label`,
    `description?`, `checked`, `rechtsgrundlage`, `onToggle`. Rendert
    `KeyValueRow`-artige Zeile + `switch` (foundation `ui/switch.tsx`, restyled).
    Aria: `switch` mit `aria-label` inkl. Label + Zustand; ≥ 44px Touch-Target.
  - `DataTable` (B11) — „Datenquellen & Empfänger": Spalten
    `Stelle | Zugriffsart | Aktualität`. Body-Zeilen via `ListRow`/`<tr>`;
    `Stelle`=`BehoerdenBadge` (farb-frei, HL-DS-10) + Name; `Zugriffsart`=
    `StatusBadge` neutral/`laufend`; `Aktualität`=Text + Datum (`tabular-nums`).
  - `<KontrollAktionTile>` `<NEW datenschutz/>` —
    `src/components/datenschutz/KontrollAktionTile.tsx`. Props: `icon`, `label`,
    `description?`, `onClick`/`href`. 3 Tiles (Zugriffsprotokoll → scrollt zur
    Timeline bzw. öffnet voll; Datenexport → Vision-Dialog; Einstellungen →
    Vision-Dialog). Tile = `Button variant="outline"`-Look ≥ 44px.
- **Data fetched** (via `lib/mock-backend/api.ts`):
  - `api.getProfile()` → aktive Persona-ID.
  - `api.getUebermittlungsLog(personaId, { limit: 20 })` → Timeline (reuse
    existing!). Für „Alle anzeigen" optional höheres Limit.
  - `api.getBehoerden()` → Namen/Kategorien für Timeline + Tabelle.
  - `api.getDatenschutzEinwilligungen(personaId)` **`<NEW api>`** → Toggle-Zustände.
  - `api.getDatenquellen(personaId)` **`<NEW api>`** → Tabellen-Zeilen
    (Stelle / Zugriffsart / Aktualität).
- **i18n keys introduced**: siehe § 8.
- **States**: loading (skeleton), empty (kein Log → `EmptyState` „Noch keine
  Aktivitäten"), success, error (retry-Button), **toggle-pending** (optimistic
  UI + `aria-busy` auf der Zeile; bei Mock-Backend-Fehler revert + `toast.error`).
- **Accessibility notes**:
  - Genau ein `<h1>`. SectionCard-Titel `<h2>`; Rail-Titel `<h2>`/`<h3>`.
  - Timeline als `<ol>`/`<ul>` mit Listen-Items (chronologisch). Relative
    Zeitstempel haben ein `<time datetime>` mit absolutem ISO-Wert.
  - Einwilligungs-Switches: jeder `switch` trägt accessiblen Namen inkl. Zustand
    („Einwilligung Krankenkasse, eingeschaltet"); Zustandswechsel via
    `aria-live="polite"`-Announce („Einwilligung Krankenkasse ausgeschaltet").
  - DataTable echtes `<table>` mit `<th scope>`; Zugriffsart-Badges tragen Text
    (nicht nur Farbe); Aktualität `tabular-nums`.
  - Dismissible Banner: `×`-Button mit `aria-label` „2027-Vision-Hinweis
    schließen"; Fokus nach Schließen sinnvoll setzen.
  - §-Zitate über `<NormZitatSpan>` (Pronunciation-aria-label).

## 5. Autopilot logic

Nicht anwendbar. Die Timeline **spiegelt** behördliche Übermittlungen, die der
Umzug-Autopilot emittiert (`behoerde_zu_behoerde`-Einträge) — sie erzeugt sie
nicht. Der Einwilligungs-Toggle erzeugt einen `app_aktivitaet`-Eintrag.

## 6. Data model additions / changes

### New types

```ts
// src/types/datenschutz.ts (NEW file)

export type EinwilligungEmpfaenger = 'krankenkasse' | 'bank' | 'arbeitgeber' | 'weitere_dienste';

export interface DatenschutzEinwilligung {
  empfaenger: EinwilligungEmpfaenger;
  /** true = erteilt (Ein), false = nicht erteilt (Aus). */
  erteilt: boolean;
  /** Rechtsgrundlage der Verarbeitung bei Einwilligung, z. B. 'Art. 6 Abs. 1 lit. a DSGVO'. */
  rechtsgrundlage: string;
  /** ISO-8601 letzter Änderungszeitpunkt. */
  geaendert_am?: string;
}

export type DatenZugriffsart = 'automatisch_synchronisiert' | 'einwilligungsbasiert';

export interface DatenquellenEintrag {
  behoerde_id: string;            // aus behoerden.json (BehoerdenBadge farb-frei)
  zugriffsart: DatenZugriffsart;  // → Badge (Text-Label, keine reine Farbe)
  /** Rechtsgrundlage des Zugriffs (z. B. '§ 36 BMG', 'Art. 6 Abs. 1 lit. a DSGVO'). */
  rechtsgrundlage: string;
  /** ISO-8601 oder 'aktuell'-Marker → UI rendert "aktuell" / Datum. */
  aktualitaet: string;
}

export interface DatenschutzCockpit {
  persona_id: string;
  einwilligungen: DatenschutzEinwilligung[];   // genau 4: krankenkasse/bank/arbeitgeber/weitere_dienste
  datenquellen: DatenquellenEintrag[];
}
```

### Mock-backend additions (mock-backend-coder)

- **`api.getDatenschutzEinwilligungen(personaId): Promise<DatenschutzEinwilligung[]>`**
  `<NEW api>` — lädt aus dem neuen localStorage-Bucket (§ Persistence); lazy-init
  aus Seed-Defaults bei erstem Aufruf. Default (Prototyp): Krankenkasse `Ein`,
  Bank `Aus`, Arbeitgeber `Aus`, Weitere Dienste `Aus`.
- **`api.setDatenschutzEinwilligung(personaId, empfaenger, erteilt): Promise<void>`**
  `<NEW api>` — persistiert den Toggle in den Bucket, setzt `geaendert_am`,
  **emittiert einen `UebermittlungsLogEntry`** (reuse `appendStammdatenLogEntry`):
  - `kategorie: 'app_aktivitaet'`, `zweck_i18n_key` =
    `datenschutz.log.einwilligung_geaendert`, `rechtsgrundlage` =
    `'Art. 6 Abs. 1 lit. a DSGVO'` (bei Erteilung) bzw.
    `'Art. 7 Abs. 3 DSGVO'` (Widerruf), `note` =
    `persona_id:<id>;empfaenger:<e>;erteilt:<bool>;mock:true`.
  - Läuft durch `withLatency()`. Diese Einträge erscheinen damit **automatisch**
    in der Timeline (gleicher Log) — schließt die Loop „Einwilligung erteilt"
    aus dem Prototyp.
- **`api.getDatenquellen(personaId): Promise<DatenquellenEintrag[]>`** `<NEW api>` —
  read-only, deterministisch abgeleitet: Bürgeramt/Finanzamt/Beitragsservice/
  Krankenkasse (aus Persona) als Zeilen; Zugriffsart = `automatisch_synchronisiert`
  für hoheitliche Meldedaten-Empfänger (§ 36 BMG), `einwilligungsbasiert` für
  Krankenkasse/Bank/Arbeitgeber (gekoppelt an `einwilligungen`). Läuft durch
  `withLatency()`. **Kein** Activity-Log (read-only).
- **Reuse, NICHT neu**: `getUebermittlungsLog`, `getBehoerden`, `getProfile`,
  `appendStammdatenLogEntry` existieren bereits.

### Seed data extension

- **`src/lib/mock-backend/seed.ts`**: Default-Einwilligungen pro Persona
  (Krankenkasse `Ein`, Rest `Aus`) als Bucket-Init. **Keine** `personas.json`-
  Änderung nötig.
- Datenquellen werden aus bestehenden Persona-Feldern + `behoerden.json`
  abgeleitet — keine neuen Behörden.
- **Timeline-Realismus (Flag an mock-backend-coder):** der Prototyp zeigt 5
  konkrete Aktivitäten (Brief geöffnet / KI-Zusammenfassung / Adresse übermittelt
  / Dokument heruntergeladen / Einwilligung erteilt). Damit die Demo ohne
  vorherigen Umzug-Lauf gefüllt ist, **seedet** `seed.ts` für Anna 4–6
  `UebermittlungsLogEntry` (gemischte Kategorien) in den bestehenden
  `govtech-de:v1:stammdaten:uebermittlungs-log`-Bucket. Nutze die bestehenden
  Zweck-i18n-Keys wo vorhanden; ergänze fehlende unter `datenschutz.log.*`.

### Persistence keys (localStorage)

| Bucket-Key | Inhalt | Version |
|---|---|---|
| `govtech-de:v1:datenschutz:einwilligungen` | `Record<PersonaId, DatenschutzEinwilligung[]>` | v1 |
| `govtech-de:v1:datenschutz:vision-banner-dismissed` | `Record<PersonaId, boolean>` | v1 |

- Aktivitäts-Log nutzt den **bestehenden** Bucket
  `govtech-de:v1:stammdaten:uebermittlungs-log` — kein neuer Log-Bucket.
- Banker-Dismiss kann alternativ component-local bleiben; für Reload-Stabilität
  bevorzugt der Bucket oben.

## 7. AI assistant integration

Nicht in dieser Iteration. `getDatenschutzEinwilligungen` / `getDatenquellen` sind
spätere AI-Read-Tool-Kandidaten (V-Hook). Keine Tools jetzt.

## 8. i18n (DE source-of-truth; alle 6 Sprachen, non-DE `needs_review`)

| Key | DE source value |
|---|---|
| `datenschutz.page.title` | „Datenschutz" |
| `datenschutz.page.subtitle` | „Einblick in Datenzugriffe, Einwilligungen und Verwaltungsvorgänge" |
| `datenschutz.vision_banner.title` | „2027-Vision" |
| `datenschutz.vision_banner.body` | „Dieses Cockpit bündelt Ihre Datenschutz-Transparenz und -Kontrolle. In der echten Welt sind diese Funktionen heute noch über mehrere Stellen verteilt." |
| `datenschutz.vision_banner.dismiss` | „2027-Vision-Hinweis schließen" |
| `datenschutz.aktivitaet.title` | „Letzte Aktivitäten" |
| `datenschutz.aktivitaet.show_all` | „Alle Aktivitäten anzeigen" |
| `datenschutz.aktivitaet.empty` | „Noch keine Aktivitäten erfasst." |
| `datenschutz.activity.typ.uebermittlung` | „Übermittlung" |
| `datenschutz.activity.typ.eingang` | „Eingang" |
| `datenschutz.activity.typ.app` | „App-Aktivität" |
| `datenschutz.activity.typ.vision` | „Vision" |
| `datenschutz.activity.brief_geoeffnet` | „Brief geöffnet" |
| `datenschutz.activity.ki_zusammenfassung` | „KI-Zusammenfassung erstellt" |
| `datenschutz.activity.adresse_uebermittelt` | „Adresse an Behörde übermittelt" |
| `datenschutz.activity.dokument_geladen` | „Dokument heruntergeladen" |
| `datenschutz.activity.einwilligung_erteilt` | „Einwilligung erteilt" |
| `datenschutz.einwilligungen.title` | „Einwilligungen" |
| `datenschutz.einwilligungen.subtitle` | „Sie entscheiden, welche Stellen auf Ihre Daten zugreifen dürfen" |
| `datenschutz.einwilligungen.krankenkasse` | „Krankenkasse" |
| `datenschutz.einwilligungen.bank` | „Bank" |
| `datenschutz.einwilligungen.arbeitgeber` | „Arbeitgeber" |
| `datenschutz.einwilligungen.weitere_dienste` | „Weitere Dienste" |
| `datenschutz.einwilligungen.ein` | „Ein" |
| `datenschutz.einwilligungen.aus` | „Aus" |
| `datenschutz.einwilligungen.rechtsgrundlage_label` | „Rechtsgrundlage" |
| `datenschutz.quellen.title` | „Datenquellen & Empfänger" |
| `datenschutz.quellen.col_stelle` | „Stelle" |
| `datenschutz.quellen.col_zugriffsart` | „Zugriffsart" |
| `datenschutz.quellen.col_aktualitaet` | „Aktualität" |
| `datenschutz.quellen.automatisch` | „automatisch synchronisiert" |
| `datenschutz.quellen.einwilligungsbasiert` | „einwilligungsbasiert" |
| `datenschutz.quellen.aktuell` | „aktuell" |
| `datenschutz.quellen.show_all` | „Alle Empfänger anzeigen" |
| `datenschutz.kontrolle.title` | „Ihre Datenschutz-Kontrolle" |
| `datenschutz.kontrolle.zugriffsprotokoll` | „Zugriffsprotokoll" |
| `datenschutz.kontrolle.datenexport` | „Datenexport" |
| `datenschutz.kontrolle.einstellungen` | „Einstellungen" |
| `datenschutz.kontrolle.vision_hint` | „Diese Funktion ist Teil der 2027-Vision dieser Demo." |
| `datenschutz.log.einwilligung_geaendert` | „Einwilligung geändert" |
| `datenschutz.toast.einwilligung_error` | „Einwilligung konnte nicht gespeichert werden." |

Context-Chip „Spekulatives Demo-Feature" reused `common.context_chip.speculative`.
Relative Zeit / „pro Seite" reused aus `common.*`.

## 9. Edge cases

- **Leeres Log** (frische Persona, kein Umzug, kein Seed) → `EmptyState`; Demo-Seed
  (§ 6) verhindert das für Anna.
- **Toggle-Fehler** (5%-Mock-Fehler) → optimistic UI revert + `toast.error`
  (`datenschutz.toast.einwilligung_error`); Switch springt zurück.
- **„Weitere Dienste" Toggle**: in dieser Iteration ein einzelner Sammel-Toggle
  (Prototyp zeigt 4 Zeilen). Kein Drill-down.
- **Datenexport / Einstellungen-Tiles**: speculative → öffnen Vision-Dialog
  („Funktion folgt"), kein echter Export. **Niemals** echte PII exportieren.
- **RTL (AR)**: Switch-Position + Tabelle logisch spiegeln; §-Zitate + Datum
  bleiben LTR (Stammdaten-Konvention).
- **Reduced motion**: Banner-Dismiss + Toggle ohne Bounce, ≤ 200ms Fade.

## 10. Out of scope (explicit)

- Echter Datenexport (Art. 20 DSGVO Portabilität) — nur Vision-Dialog.
- Granulare Pro-Behörde-Einwilligungen jenseits der 4 Prototyp-Empfänger.
- Schreibender Eingriff in hoheitliche Register (Lese-/Kontroll-Schicht).
- Voll-Tabelle mit Filter/Pagination der Übermittlungen (Stammdaten hat den
  Richtungs-Filter; Datenschutz zeigt hier nur die letzten N + „Alle anzeigen").
- AI-Tools.

## 11. Review checklist (for code-reviewer)

- [ ] Keine hardcoded Strings — alles via `t()`; alle § 8-Keys in `de.json` +
      6 Locales (non-DE `needs_review`).
- [ ] Timeline nutzt den **bestehenden** `UebermittlungsLogEntry`-Typ +
      `getUebermittlungsLog` — KEIN paralleler Log.
- [ ] Einwilligungs-Toggles persistieren in `localStorage` + erzeugen einen
      `app_aktivitaet`-Log-Eintrag mit Rechtsgrundlage (Art. 6/7 DSGVO).
- [ ] Jede Aktivität, Einwilligung und Datenquelle nennt eine Rechtsgrundlage
      (privacy-by-design Mission, CLAUDE.md).
- [ ] `BehoerdenBadge` in der Tabelle ist farb-frei (HL-DS-10); Zugriffsart- und
      Typ-Badges tragen Text-Label, nicht nur Farbe.
- [ ] Switches haben accessiblen Namen inkl. Zustand + `aria-live`-Announce;
      Touch-Targets ≥ 44px.
- [ ] DataTable ist echtes `<table>` mit `<th scope>`; Datum/Aktualität
      `tabular-nums` (HL-DS-6).
- [ ] Vision-Banner dismissible + persistiert; Datenexport/Einstellungen
      exportieren keine echte PII.
- [ ] Lighthouse a11y > 95; axe 0 kritisch; reduced-motion ok.

---

## Build log — mock-backend-coder

- date: 2026-05-27
- types added: `src/types/datenschutz.ts` (DatenschutzEinwilligung, EinwilligungEmpfaenger, DatenZugriffsart, DatenquellenEintrag, DatenschutzCockpit). Barrel updated.
- api (`datenschutz/api.ts`, all `withLatency`):
  - NEW `getDatenschutzEinwilligungen(personaId): Promise<DatenschutzEinwilligung[]>` — lazy-init from seed defaults (Krankenkasse Ein, Bank/Arbeitgeber/Weitere-Dienste Aus).
  - NEW `setDatenschutzEinwilligung(personaId, empfaenger, erteilt): Promise<void>` — persists toggle (sets geaendert_am) AND emits a `UebermittlungsLogEntry` via `appendLogEntry` into the EXISTING `stammdaten:uebermittlungs-log` bucket (kategorie app_aktivitaet, zweck `datenschutz.log.einwilligung_geaendert`, rechtsgrundlage `Art. 6 Abs. 1 lit. a DSGVO` on Erteilung / `Art. 7 Abs. 3 DSGVO` on Widerruf). Re-uses the existing log model — NO parallel log. Emits `stammdaten/log-entry-appended` so the timeline updates live.
  - NEW `getDatenquellen(personaId): Promise<DatenquellenEintrag[]>` — read-only derived: Buergeramt/Finanzamt/Beitragsservice = automatisch_synchronisiert (§ 36 BMG variants), Krankenkasse = einwilligungsbasiert (coupled to einwilligungen). No activity-log.
  - NEW `isVisionBannerDismissed(personaId)` + `dismissVisionBanner(personaId)`.
  - REUSED (not new): getUebermittlungsLog, getBehoerden, getProfile, appendStammdatenLogEntry.
- seed records: 4 Anna `UebermittlungsLogEntry` added to the EXISTING uebermittlungs-log seed (`stammdaten/seed-log-entries.ts`): Brief geoeffnet, KI-Zusammenfassung, Dokument geladen, Einwilligung erteilt — mixed app_aktivitaet, so the timeline is populated WITHOUT a prior Umzug run (the existing 7 behoerde_zu_behoerde umzug-cascade entries cover Adresse-uebermittelt). Default einwilligungen are bucket-lazy-init (NOT personas.json).
- buckets: NEW `datenschutz:einwilligungen` (Record<PersonaId, DatenschutzEinwilligung[]>) + `datenschutz:vision-banner-dismissed` (Record<PersonaId, boolean>). Both wired into seedIfEmpty (empty init) + seedForPersona (reset). zod schemas added. Activity-log uses the EXISTING `stammdaten:uebermittlungs-log` bucket.
- typecheck: pass. unit suite: 639/639 pass.
- known gaps: 4 prototype empfaenger only (no per-Behoerde drill-down). Datenexport/Einstellungen are UI-side vision-dialogs (out of scope §10). Datenquellen Krankenkasse hard-mapped to aok-nordost.

## Build log — frontend-coder
- date: 2026-05-27
- screens implemented: Datenschutz-Cockpit (`/datenschutz`) — Spekulatives-Demo-Feature-Chip + dismissible 2027-Vision-Banner, „Letzte Aktivitäten"-Timeline (typ-gebadgte `<li>`-Einträge + relativer + absoluter Zeitstempel + §-Zitat), funktionale Einwilligungen-Toggles (Krankenkasse/Bank/Arbeitgeber/Weitere Dienste), „Datenquellen & Empfänger"-DataTable (Stelle/Zugriffsart/Aktualität), „Ihre Datenschutz-Kontrolle"-Aktions-Kacheln.
- components created:
  - `src/app/(app)/datenschutz/page.tsx` (RSC, `force-dynamic`, liefert `nowIso`)
  - `src/components/datenschutz/DatenschutzView.tsx` (client; lädt `getProfile`→`getUebermittlungsLog{limit:20}`/`getBehoerden`/`getDatenschutzEinwilligungen`/`getDatenquellen`/`isVisionBannerDismissed`; loading/error/ready; abonniert `stammdaten/log-entry-appended` für Live-Timeline-Refresh)
  - `src/components/datenschutz/VisionBanner.tsx` (eigene **dismissible** Variante — NICHT die stammdaten/kontakt-VisionBanner reused, da diese an `stammdaten.kontakt.notification` gebunden und nicht dismissible ist; eigene `datenschutz.vision_banner.*`-Keys + ×-Button ≥44px)
  - `src/components/datenschutz/ActivityTimelineRow.tsx` (client; IconCircle-Typ-Icon, Typ-Badge mapping behoerde_zu_behoerde→Übermittlung/laufend, behoerde_zu_buerger→Eingang/neu, app_aktivitaet→App-Aktivität/aktiv, speculative_2027→Vision/vorlage; `<time datetime>` absoluter ISO + relativer Text)
  - `src/components/datenschutz/ConsentToggleRow.tsx` (client; base-ui `Switch` mit accessiblem Namen inkl. Zustand + sichtbarem „Ein"/„Aus"-Text + Rechtsgrundlage; min-h-44px)
  - `src/components/datenschutz/KontrollAktionTile.tsx` (client; echter `<button>` ≥44px)
- consent-toggle → log-emission behaviour OBSERVED (verified via throwaway harness test, then removed): toggling Krankenkasse OFF → `getDatenschutzEinwilligungen` returns `erteilt:false` with `rechtsgrundlage:'Art. 7 Abs. 3 DSGVO'` (persisted); `getUebermittlungsLog` length increases by exactly 1; newest entry `kategorie:'app_aktivitaet'`, `zweck_i18n_key:'datenschutz.log.einwilligung_geaendert'`; `stammdaten/log-entry-appended` event fires → the View's subscription re-fetches the log so the new entry appears at the top of the live timeline. Optimistic UI: toggle flips immediately; on a 5%-mock-error it reverts + `toast.error('datenschutz.toast.einwilligung_error')`.
- i18n keys added (DE source, `de.json` top-level `datenschutz.*`): page.{title,subtitle}, vision_banner.{heading,title,body,dismiss}, aktivitaet.{title,show_all,show_less,empty}, activity.typ.{uebermittlung,eingang,app,vision}, activity.{brief_geoeffnet,ki_zusammenfassung,adresse_uebermittelt,dokument_geladen,einwilligung_erteilt}, einwilligungen.{title,subtitle,krankenkasse,bank,arbeitgeber,weitere_dienste,ein,aus,rechtsgrundlage_label,switch_aria,announce_ein,announce_aus}, quellen.{title,col_stelle,col_zugriffsart,col_aktualitaet,automatisch,einwilligungsbasiert,aktuell,show_all}, kontrolle.{title,zugriffsprotokoll(+_desc),datenexport(+_desc),einstellungen(+_desc),vision_hint}, log.einwilligung_geaendert, toast.einwilligung_error, empty.{title,description}, error, retry. (DE only; non-DE later per `track: supporting`.)
- a11y: genau ein `<h1>` (PageHeader); SectionCard-/Rail-Titel als `<h2>`; Timeline als `<ul>` von `<li>`; Switches `role="switch"` (base-ui) + accessibler Name inkl. Zustand + `aria-live="polite"`-Announce („Einwilligung Krankenkasse ausgeschaltet"); DataTable echtes `<table>` mit `<th scope>`, Aktualität `tabular-nums`; Zugriffsart-/Typ-Badges tragen Text-Label (nicht nur Farbe); BehoerdenBadge farb-frei (HL-DS-10); Banner-×-Button `aria-label` + Fokus nach Schließen auf die „Letzte Aktivitäten"-Überschrift (tabIndex=-1); Toasts via sonner aria-live; Skeleton `motion-reduce:animate-none`.
- privacy-by-design: jede Aktivität, jede Einwilligung und jede Datenquelle nennt eine Rechtsgrundlage (§ 36 BMG / § 139b AO / RBStV / Art. 6/7 DSGVO via wrapNormZitate). Datenexport/Einstellungen exportieren KEINE echte PII (Vision-Toast).
- typecheck: pass. lint: pass (0 warnings/errors). unit suite: 639/639 pass. smoke `/datenschutz` HTTP 200, alle Marker (Datenschutz/Letzte Aktivitäten/Einwilligungen/Datenquellen/Ihre Datenschutz-Kontrolle/Spekulatives/2027-Vision) im HTML, keine Runtime-Fehler.
- prototype detail not matched: „Datenquellen…(mirror?)" Rail-Card aus dem ASCII-Wireframe NICHT dupliziert — die Datenquellen-Tabelle steht nur einmal in der Hauptspalte (das `(mirror?)` war im Spec selbst als offen markiert; eine Doppel-Anzeige wäre redundant). Datenexport/Einstellungen sind Vision-Toasts statt Vision-Dialoge (Spec erlaubt beides; Toast gewählt = weniger Komponenten, §10-konform).
- next: a11y-tester | code-reviewer | i18n-localizer (non-DE `datenschutz.*`)

## Build log — i18n-localizer
- date: 2026-05-27
- locales updated: [en, ru, uk, ar, tr]  (de.json source NOT touched — concurrent familie/stammdaten append in progress)
- new keys: 56 per locale (280 total) — full `datenschutz.*` block translated DE→target directly.
- changed keys: 0
- review-needed flags resolved: 0
- known gaps / decisions:
  - The privacy copy reads trustworthy + precise per task: vision_banner.body, einwilligungen.subtitle ("You decide which offices may access your data"), minimierung-style controls. Plain language ≤ B1, formal pronoun per language (en "you" formal, ru/uk "Вы/Ви" prописна/велика, ar formal أنت, tr siz).
  - DSGVO handling: `kontrolle.datenexport_desc` is the only key citing a norm ("Art. 20 DSGVO"). Kept the citation, glossed as GDPR (DSGVO) — en "Art. 20 GDPR (DSGVO)", tr "GDPR (DSGVO) Madde 20", ru "ст. 20 GDPR (DSGVO)", uk "ст. 20 GDPR (DSGVO)", ar "المادة 20 من اللائحة العامة لحماية البيانات (DSGVO)". Art. 6/7 DSGVO (consent legal basis) is emitted by mock-backend on toggle, NOT in these keys.
  - Recipient labels `einwilligungen.krankenkasse/bank/arbeitgeber/weitere_dienste` are generic role labels (not specific authority names) → translated as concepts; Krankenkasse parenthesized DE-Latin. The Datenquellen-table NAMES (Bürgeramt, Finanzamt, Beitragsservice, AOK Nordost) come from BehoerdenBadge/behoerden.json, NOT these keys.
  - Activity labels (`activity.brief_geoeffnet`, `ki_zusammenfassung`, `adresse_uebermittelt`, `dokument_geladen`, `einwilligung_erteilt`) + typ badges (Übermittlung/Eingang/App-Aktivität/Vision) localized as concise verb-phrases. "KI"→"AI"/"ШІ"/"ИИ"/"الذكاء الاصطناعي"/"yapay zekâ".
  - `{empfaenger}` placeholder preserved in switch_aria/announce_ein/announce_aus; word-order per language (tr "{empfaenger} onayı açıldı").
  - Length flags (tight UI): toggle labels `einwilligungen.ein`/`aus` ("On/Off") — ru "Вкл./Выкл.", uk "Увімк./Вимк.", ar "تشغيل/إيقاف", tr "Açık/Kapalı" all short and fit a switch label. Table headers `quellen.col_*` (Office/Access type/Last updated) — ar "نوع الوصول"/"آخر تحديث" and uk "Тип доступу" are within +40%; "automatically synchronised"/"automatisch synchronisiert"→ru "автоматическая синхронизация" is long but lives in a wider Zugriffsart cell, not a header. No hard overflow expected; flag to frontend-coder if the Zugriffsart badge clips on narrow mobile.
  - AR RTL-safe: switch position + table mirror handled by layout (logical props per spec § 4.1/§ 9); §-citations + dates stay LTR; Latin "DSGVO"/"GDPR"/"AOK" + `{placeholder}` render LTR via bidi isolation.
  - VALIDATION: structural review PASS for all 5 files (balanced braces, no trailing commas, key order mirrors de.json, each file 1911 lines). JSON.parse NOT runnable in this agent (no Bash) — main-thread JSON.parse gate recommended per V1.5 ship lesson.
