---
feature: redesign-familie
title: Familie — „Mein Haushalt" (Redesign, NEW screen)
status: spec
track: supporting
date: 2026-05-27
author: product-architect
authorization: docs/demo-spine.md § "ACTIVE BUILD (decided 2026-05-27)" — user-supplied complete visual prototype; research/domain/verify waived per spine note.
owner_agents: [frontend-coder, mock-backend-coder, i18n-localizer, a11y-tester, code-reviewer]
inputs:
  prototype: docs/design-prototype/05-familie.png
  foundation: docs/specs/redesign-foundation.md (token + primitive CONTRACT — reference, do not redefine)
  data_model: src/types/persona.ts, src/data/personas.json, src/lib/mock-backend/api.ts
gates: depends on redesign-foundation APPROVE (tokens + primitives must exist first).
---

> **Scope.** This screen replaces the current `(app)/familie` placeholder
> (`src/app/(app)/familie/page.tsx` → `<PlaceholderSection navKey="familie">`)
> with the prototype's „Mein Haushalt" view. It is a **read/wegweiser layer** over
> existing Persona data (partner + Kinder), consistent with the Stammdaten
> read-model architecture (HL § 11.2 Stammdaten: no write into hoheitliche
> Register). No new autopilot. `track: supporting` → DE source-of-truth, other
> 5 locales fast-drafted `needs_review`, a11y PASS still mandatory.

> **Foundation reuse rule.** Every visual building block in § 4 below cites a
> primitive from `redesign-foundation.md` § 6.B. Do not re-implement
> Card/Badge/Row/Avatar. If a block is not covered by a foundation primitive it
> is marked `<NEW familie/>` and lives under `src/components/familie/`.

---

## 1. Problem statement

Eltern führen heute pro Familienmitglied getrennte Vorgänge bei getrennten Stellen
(Familienkasse, Krankenkasse, Kita-Träger) und müssen Nachweise und
Vertretungsrechte manuell zusammenhalten. „Mein Haushalt" zeigt in **einer** Sicht,
wer im Haushalt lebt, welche gemeinsamen Vorgänge laufen, welche Nachweise und
Vertretungsrechte bestehen — und **was wen betrifft**.

## 2. Persona & journey

- **Persona**: Anna Petrov (Haushalts-Anker) mit Partner Lev und Kind. Siehe
  `src/data/personas.json` → `anna-petrov`.
  - **Daten-Hinweis (an mock-backend-coder + frontend-coder):** der Prototyp
    beschriftet die zweite Mitglied-Card „Lev Petrov" als erwachsenes Mitglied
    (Geburtsjahr 2024 im PNG-Detail ist ein Prototyp-Platzhalter). Das **echte**
    Seed-Modell hat `familie.partner = Tobias Becker` und `familie.kinder = [Lev
    Petrov-Becker, geb. 2024]`. **Verbindlich: die UI rendert aus dem Seed**, nicht
    aus den PNG-Labels. Das Layout (zwei Mitglied-Cards: Anna als „Mutter", ein
    zweites Mitglied) bleibt; das zweite Mitglied ist der **Partner** mit Rolle
    `partner` und das Kind erscheint als dritte Card mit Rolle `kind`. Die
    Card-Anordnung des PNG (2 große oben) bleibt der Default; weitere Mitglieder
    fließen in dasselbe responsive Grid.
- **Trigger**: Nutzer:in öffnet `/familie` aus der Sidebar, um den
  Familienkontext zu überblicken (z. B. „läuft das Kindergeld noch?").
- **Outcome**: Nutzer:in sieht alle Haushaltsmitglieder, den Status der
  gemeinsamen Vorgänge, vorhandene Nachweise/Vertretungen und pro Person die
  Zählung der sie betreffenden Objekte.
- **Time saved vs. status quo**: 3 Portale + Papierordner → 1 Sicht; das
  „Was-betrifft-wen"-Mapping spart die manuelle Zuordnung über mehrere Behörden.

## 3. Success criteria for the demo

- [ ] Viewer versteht „ein Haushalt, mehrere Personen, geteilte Vorgänge" in < 8 s.
- [ ] Alle Haushaltsmitglieder aus dem Persona-Seed werden als Member-Cards
      gerendert (Monogramm-Avatar + Rollen-Badge).
- [ ] Jede gemeinsame Vorgangs-Zeile zeigt die betroffenen Mitglieder als
      Monogramm-Chips + einen `StatusBadge`.
- [ ] „Was betrifft wen?"-Rail zählt pro Person korrekt
      (Vorgänge/Dokumente/Nachweise/Vertretungen) aus den geladenen Daten.
- [ ] „Spekulatives Demo-Feature"-Disclaimer sichtbar (Vertretung/Vollmachten
      sind 2027-Vision); „Sicher & geschützt"-Footer present.
- [ ] Lighthouse a11y > 95; axe 0 kritisch.

## 4. Screen-by-screen flow

### 4.1 Screen: Familie — „Mein Haushalt"

- **Route**: `/familie`
- **File**: `src/app/(app)/familie/page.tsx` (RSC shell) → rendert
  `src/components/familie/FamilieView.tsx` (Client; lädt via `api.*` analog
  `StammdatenView`).
- **Server or client**: Page RSC; `FamilieView` Client (Datenladen + Banner-
  Dismiss-State).
- **Layout** (ASCII, 2-Spalten ab `lg`: Hauptspalte + rechte Rail):

```
┌───────────────────────────────────────────────┬──────────────────────┐
│ H1 „Familie"  · Subtitle               [Haushalt│  Was betrifft wen?   │
│  „Haushalt, Bezugspersonen…"            verwalten]│  ┌──────────────────┐ │
│ ┌─ SectionCard „Mein Haushalt" (N Personen)──┐ │  │ (AP) Anna Petrov │ │
│ │ ┌ MemberCard ─────┐  ┌ MemberCard ───────┐ │ │  │  Vorgänge   3    │ │
│ │ │ (AP) Anna Petrov│  │ (LB) Lev / Partner│ │ │  │  Dokumente  5    │ │
│ │ │  Rolle: Mutter  │  │  Rolle: Partner   │ │ │  │  Nachweise  2    │ │
│ │ └─────────────────┘  └───────────────────┘ │ │  │  Vertretungen 1  │ │
│ │ (weitere Mitglieder im selben Grid …)       │ │  └──────────────────┘ │
│ │ ┌ Info-Banner: „Vertretung" (speculative) ┐ │ │  ┌──────────────────┐ │
│ │ └──────────────────────────────────────────┘ │ │  │ (LP) Lev …       │ │
│ └─────────────────────────────────────────────┘ │  │  …counts…        │ │
│ ┌─ SectionCard „Gemeinsame Vorgänge" ─────────┐ │  └──────────────────┘ │
│ │ ListRow Kindergeld  · chips(AP,LP) · Status │ │                       │
│ │ ListRow Krankenkasse· chips      · Status   │ │                       │
│ │ ListRow Kita        · chips      · Status   │ │                       │
│ │ Footer-Link „Alle gemeinsamen Vorgänge…"    │ │                       │
│ └─────────────────────────────────────────────┘ │                       │
│ ┌─ SectionCard „Nachweise & Berechtigungen" ──┐ │                       │
│ │ ListRow Geburtsurkunde      · Status         │ │                       │
│ │ ListRow Sorge-Vollmacht     · Status(specul) │ │                       │
│ │ ListRow Vertretungsrechte   · Status(specul) │ │                       │
│ │ ListRow Verknüpfungen       · Status         │ │                       │
│ └─────────────────────────────────────────────┘ │                       │
├───────────────────────────────────────────────┴──────────────────────┤
│ Footer-Banner „Sicher & geschützt" (full width) + „Mehr zu Datenschutz"│
└─────────────────────────────────────────────────────────────────────────┘
```

- **Components used** (foundation primitives unless marked `<NEW familie/>`):
  - `PageHeader` (foundation B2) — `title=familie.page.title`,
    `subtitle=familie.page.subtitle`, `actions=` ein `Button` „Haushalt verwalten"
    (`familie.cta.haushalt_verwalten`, opens `<HaushaltVerwaltenDialog>` —
    speculative, see edge cases), `contextChip` tone `speculative`.
  - `SectionCard` (foundation B12) — 3× (Mein Haushalt / Gemeinsame Vorgänge /
    Nachweise & Berechtigungen).
  - `<MemberCard>` `<NEW familie/>` — `src/components/familie/MemberCard.tsx`.
    Props: `name`, `rolle` (Rollen-Badge), `geburtsdatum?`, `meta?` (z. B.
    „Hauptperson"), `avatarTone?`. Internals: `Avatar` (foundation B6, monogram) +
    `StatusBadge`-artiges Rollen-Pill (use `StatusBadge` neutral variant — Rolle ist
    **keine** Status-Farbe; render as neutral pill with text label only, kein
    Farbcode per HL-DS-3). RSC.
  - Info-Banner „Vertretung" — reuse `VisionBanner`
    (`src/components/stammdaten/kontakt/VisionBanner.tsx`, restyle-only via
    foundation tokens) ODER `EmptyState` tone `speculative` falls leichter;
    bevorzugt `VisionBanner` für Konsistenz mit Stammdaten.
  - `ListRow` (foundation B10) — Gemeinsame-Vorgänge-Zeilen + Nachweise-Zeilen.
    `leading=IconCircle` (themen-icon), `title`, `subtitle`,
    `meta=[<MemberChips/>]`, `status=<StatusBadge/>`.
  - `<MemberChips>` `<NEW familie/>` — `src/components/familie/MemberChips.tsx`.
    Props: `members: {name; initials}[]`, `max?` (overflow „+N"). Rendert
    overlapping monogram `Avatar size="sm"` chips. RSC.
  - `RightRailCard` (foundation B4) — „Was betrifft wen?": pro Person eine
    Sub-Card mit `<PersonCountList>`.
  - `<PersonCountList>` `<NEW familie/>` —
    `src/components/familie/PersonCountList.tsx`. Props:
    `counts: { vorgaenge; dokumente; nachweise; vertretungen }`. Rendert 4
    `KeyValueRow`-Zeilen (foundation B13) mit `tabular-nums` (HL-DS-6) auf den
    Zahlen.
  - `IconCircle` (foundation B5) — Themen-Icons (Kindergeld → `Baby`/`HandCoins`,
    Krankenkasse → `HeartPulse`, Kita → `School`).
  - Footer-Banner „Sicher & geschützt" — reuse `FoederalismusCardDisclaimer`-Stil
    ODER `<NEW familie/>` `<SicherGeschuetztBanner>` falls Copy abweicht;
    bevorzugt eine dünne SectionCard `variant="soft"` mit Schloss-`IconCircle` +
    Text + Footer-Link „Mehr zu Datenschutz" → `/datenschutz`.
- **Data fetched** (alle über `lib/mock-backend/api.ts`, alle `await`):
  - `api.getProfile()` → Persona (Haushalts-Anker, partner, kinder).
  - `api.getFamilie(personaId)` **`<NEW api>`** → konsolidierter Haushalt-View
    (Member-Liste mit Rollen, gemeinsame Vorgänge, Nachweise, per-Person-Counts).
    Siehe § 6.
  - `api.getBehoerden()` → für Behörden-Bezeichnungen in den Vorgangs-Zeilen.
  - Fallback ohne `getFamilie`: nicht zulässig — `getFamilie` ist die einzige
    Datenquelle dieser Sicht, sodass Counts und Vorgänge deterministisch sind.
- **i18n keys introduced** (DE source — siehe § 8):
  - `familie.page.title`, `familie.page.subtitle`
  - `familie.haushalt.title`, `familie.haushalt.count`
  - `familie.rolle.mutter`, `familie.rolle.vater`, `familie.rolle.partner`,
    `familie.rolle.kind`, `familie.rolle.hauptperson`
  - `familie.vertretung_banner.*`, `familie.vorgaenge.*`, `familie.nachweise.*`,
    `familie.was_betrifft_wen.*`, `familie.sicher.*`, `familie.cta.*`
- **States**: loading (skeleton in `FamilieView`), empty (Persona ohne Familie →
  `EmptyState` „Kein Haushalt hinterlegt"), success, error (`getFamilie` reject →
  retry-Button wie `StammdatenView`).
- **Accessibility notes**:
  - Genau ein `<h1>` (`familie.page.title`). Jede `SectionCard`-Titel = `<h2>`;
    Rail-Person-Cards = `<h3>`.
  - „Was betrifft wen?"-Rail als `<aside aria-label>` (eigene Landmark, Screen-
    reader-skippbar) analog Stammdaten-Aktivitätsprotokoll.
  - MemberChips: jede Chip-Gruppe trägt einen accessiblen Text („Betrifft: Anna
    Petrov, Lev Petrov") via `aria-label`; Avatare `aria-hidden`, Text trägt den Namen.
  - Counts in `<dl>/<dt>/<dd>` (KeyValueRow), Zahlen `tabular-nums`.
  - Speculative-Badges + Vertretungs-Banner tragen **Text** „Spekulatives
    Demo-Feature" zusätzlich zur Farbe (Stammdaten-HL-Konvention).
  - Touch-Targets ≥ 44px; Vorgangs-Zeilen sind Links/Buttons mit eigenem Namen.

## 5. Autopilot logic

Nicht anwendbar. Familie ist eine Lese-/Wegweiser-Sicht. Gemeinsame-Vorgänge-Zeilen
verlinken (V-Hook) auf `/vorgaenge?member=<id>`; in dieser Iteration genügt der
Footer-Link „Alle gemeinsamen Vorgänge anzeigen" → `/vorgaenge`. Kein Cascade.

## 6. Data model additions / changes

### New types

```ts
// src/types/familie.ts (NEW file)
export type HaushaltRolle = 'hauptperson' | 'partner' | 'kind' | 'mutter' | 'vater';

export interface HaushaltMitglied {
  persona_ref_id: string;       // PersonaId oder Kind/Partner-Sub-ID aus Seed
  vorname: string;
  nachname: string;
  geburtsdatum: string;         // ISO
  rolle: HaushaltRolle;
  ist_hauptperson: boolean;
  /** Pro-Person-Zählung für die "Was betrifft wen?"-Rail. */
  counts: { vorgaenge: number; dokumente: number; nachweise: number; vertretungen: number };
}

export interface GemeinsamerVorgang {
  id: string;                   // z. B. 'familie-vorgang-kindergeld'
  thema: 'kindergeld' | 'krankenkasse' | 'kita' | string;
  titel_i18n_key: string;
  behoerde_id?: string;         // aus behoerden.json (Familienkasse, Krankenkasse, …)
  betroffene_member_ids: string[];
  status: 'laufend' | 'genehmigt' | 'warten' | 'abgeschlossen' | string; // → StatusBadge variant
  /** [MOCK] Aktenzeichen falls vorhanden. */
  aktenzeichen?: string;
}

export type NachweisTyp =
  | 'geburtsurkunde' | 'sorge_vollmacht' | 'vertretungsrechte' | 'verknuepfungen';

export interface FamilieNachweis {
  typ: NachweisTyp;
  titel_i18n_key: string;
  status: 'vorhanden' | 'verifiziert' | 'speculative' | 'fehlt' | string;
  /** true = 2027-Vision (Sorge-Vollmacht, Vertretungsrechte) → speculative-Marker. */
  speculative?: boolean;
}

export interface HaushaltView {
  persona_id: string;
  mitglieder: HaushaltMitglied[];
  gemeinsame_vorgaenge: GemeinsamerVorgang[];
  nachweise: FamilieNachweis[];
  /** true = Vertretungs-/Vollmacht-Funktionen sind 2027-Vision. */
  vertretung_speculative: boolean;
}
```

### Mock-backend additions (mock-backend-coder)

- **`api.getFamilie(personaId: PersonaId): Promise<HaushaltView>`** `<NEW api>`
  - Baut den View **aus der bestehenden Persona** auf (`familie.partner` →
    Mitglied Rolle `partner`/`mutter`/`vater` je nach `geschlecht`;
    `familie.kinder[]` → Mitglieder Rolle `kind`; Anker-Persona = `hauptperson`,
    Rolle abgeleitet aus `geschlecht`).
  - `gemeinsame_vorgaenge`: deterministisch aus Persona-Flags abgeleitet:
    - `kindergeld_bezug === true` und Kinder vorhanden → Kindergeld-Zeile
      (`behoerde_id` = Familienkasse aus `behoerden.json`, Status `laufend`,
      `aktenzeichen` = Kindergeldnummer-Mock falls im Seed).
    - Krankenkasse-Zeile aus `krankenversicherung.traeger` + familienversicherte
      Kinder (`familienversichert_ueber`) → betroffene = Anker + mitversicherte Kinder.
    - Kita-Zeile nur wenn mind. ein Kind < 7 Jahre → Status `warten`
      (speculative platform note).
  - `nachweise`: feste 4 Einträge (Geburtsurkunde `verifiziert`, Sorge-Vollmacht
    `speculative`, Vertretungsrechte `speculative`, Verknüpfungen `vorhanden`).
  - `counts` pro Mitglied: zählt aus den oben abgeleiteten Listen
    (Vorgänge = Anzahl gemeinsamer Vorgänge, die das Mitglied betreffen;
    Dokumente = Anzahl Persona-Dokument-Refs falls vorhanden, sonst 0;
    Nachweise = Anzahl Nachweise, die das Mitglied betreffen; Vertretungen =
    speculative, 1 für Eltern, 0 für Kinder).
  - **Read-only.** Keine Write-Methode. Läuft durch `withLatency()`.
  - **Kein** neuer Activity-Log-Eintrag (keine Mutation). Konsistent mit
    Stammdaten-Architektur (Lese-Schicht emittiert nur bei expliziter Aktion).
- **`api.getFamilieMitglieder(personaId)`** — NICHT separat anlegen; `getFamilie`
  enthält die Mitglieder. (Explizit out of scope, um die API schmal zu halten.)

### Seed data extension (`src/data/personas.json` + `seed.ts`)

- **Keine Pflicht-Erweiterung** — `getFamilie` leitet alles aus den bestehenden
  Persona-Feldern ab. **Optionale** Ergänzung (falls Realismus gewünscht):
  - Anna-Persona: bereits `kindergeld_bezug: true`, Partner + Kind vorhanden →
    keine Änderung nötig.
  - **Flag (mock-backend-coder):** falls eine Kindergeldnummer als `aktenzeichen`
    angezeigt werden soll, ein `[MOCK]`-Feld `kindergeld_nr` an der Anker-Persona
    ergänzen (additiv, optional) — sonst Aktenzeichen weglassen, **niemals**
    erfinden ohne Seed-Quelle.
- Behörden: Familienkasse + Krankenkasse existieren bereits in `behoerden.json`
  (`familienkasse-berlin-brandenburg`, `aok-nordost`). Kita-Träger ist kein
  Behörden-Eintrag → Kita-Zeile nutzt einen i18n-Label-String, keinen
  `behoerde_id`.

### Persistence keys (localStorage)

- **Keine.** Familie ist eine reine Lese-Projektion über Persona + abgeleitete
  Listen. Banner-Dismiss-State (Vertretungs-Vision-Banner) lebt component-local
  (kein Persistenz-Key nötig in dieser Iteration).

## 7. AI assistant integration

Nicht in dieser Iteration. `getFamilie` ist read-only und kann später als
AI-Tool gespiegelt werden (V-Hook, analog Stammdaten-Read-API). Keine Tools,
keine System-Prompt-Änderung jetzt.

## 8. i18n (DE source-of-truth; alle 6 Sprachen, `needs_review` für non-DE)

| Key | DE source value |
|---|---|
| `familie.page.title` | „Familie" |
| `familie.page.subtitle` | „Haushalt, Bezugspersonen und gemeinsame Vorgänge auf einen Blick" |
| `familie.haushalt.title` | „Mein Haushalt" |
| `familie.haushalt.count` | „{count} Personen" |
| `familie.rolle.mutter` | „Mutter" |
| `familie.rolle.vater` | „Vater" |
| `familie.rolle.partner` | „Partner:in" |
| `familie.rolle.kind` | „Kind" |
| `familie.rolle.hauptperson` | „Hauptperson" |
| `familie.cta.haushalt_verwalten` | „Haushalt verwalten" |
| `familie.vertretung_banner.title` | „Vertretung" |
| `familie.vertretung_banner.body` | „Sie können Vorgänge für Mitglieder Ihres Haushalts vertretungsweise bearbeiten." |
| `familie.vorgaenge.title` | „Gemeinsame Vorgänge" |
| `familie.vorgaenge.kindergeld` | „Kindergeld" |
| `familie.vorgaenge.krankenkasse` | „Krankenversicherung" |
| `familie.vorgaenge.kita` | „Kita-Platz" |
| `familie.vorgaenge.betrifft` | „Betrifft: {names}" |
| `familie.vorgaenge.show_all` | „Alle gemeinsamen Vorgänge anzeigen" |
| `familie.nachweise.title` | „Nachweise & Berechtigungen" |
| `familie.nachweise.geburtsurkunde` | „Geburtsurkunde" |
| `familie.nachweise.sorge_vollmacht` | „Sorge-Vollmacht" |
| `familie.nachweise.vertretungsrechte` | „Vertretungsrechte" |
| `familie.nachweise.verknuepfungen` | „Verknüpfungen" |
| `familie.was_betrifft_wen.title` | „Was betrifft wen?" |
| `familie.was_betrifft_wen.subtitle` | „Übersicht pro Person" |
| `familie.was_betrifft_wen.vorgaenge` | „Vorgänge" |
| `familie.was_betrifft_wen.dokumente` | „Dokumente" |
| `familie.was_betrifft_wen.nachweise` | „Nachweise" |
| `familie.was_betrifft_wen.vertretungen` | „Vertretungen" |
| `familie.sicher.title` | „Sicher & geschützt" |
| `familie.sicher.body` | „Familiendaten werden nur im erforderlichen Umfang verarbeitet. Vertretungsrechte sind eine 2027-Vision dieser Demo." |
| `familie.sicher.more` | „Mehr zu Datenschutz" |
| `familie.empty.title` | „Kein Haushalt hinterlegt" |
| `familie.empty.body` | „Für dieses Profil sind keine Haushaltsmitglieder erfasst." |

Status-Labels (`Laufend`/`Genehmigt`/`Warten auf Sie`/`Abgeschlossen`/`Verifiziert`)
**nicht neu anlegen** — `common.status.*` aus der Foundation reused. Context-Chip
„Spekulatives Demo-Feature" reused `common.context_chip.speculative`.

## 9. Edge cases

- **Persona ohne Partner/Kinder** (z. B. Single-Persona) → nur die Anker-Card +
  `EmptyState` in „Gemeinsame Vorgänge". Kein Fehler.
- **`Haushalt verwalten`-CTA**: in dieser Iteration speculative — öffnet einen
  Dialog (`<HaushaltVerwaltenDialog>` `<NEW familie/>`) mit Vision-Hinweis
  „Funktion folgt" + Schließen. **Kein** echter Mutationspfad (konsistent mit
  Lese-Schicht). Falls knapp: CTA als disabled-mit-Tooltip ausführen, aber
  bevorzugt der Vision-Dialog.
- **Kind ohne `familienversichert_ueber`** → Krankenkasse-Zeile betrifft nur den
  Anker; Kind erscheint nicht in den Chips dieser Zeile.
- **Kindergeldnummer fehlt im Seed** → Kindergeld-Zeile ohne Aktenzeichen
  rendern, niemals Aktenzeichen erfinden.
- **Lange Namen / Locale-Expansion (RU/AR)** → Member-Card-Namen truncaten;
  RTL: Grid/Chips logisch spiegeln (`border-s/e`), Monogramm-Avatare LTR-neutral.
- **Reduced motion** → keine Eintritts-Animationen, höchstens ≤ 200ms Fade.

## 10. Out of scope (explicit)

- Echte Vertretungs-/Vollmacht-Workflows (digitale Sorge-Vollmacht ist 2027-Vision).
- Bearbeiten von Haushaltsmitgliedern (Add/Remove) — nur Anzeige.
- Pro-Mitglied-Detail-Seiten / Drill-down auf einzelne Vorgänge.
- AI-Tools für Familie.
- Neue Behörden-Einträge (Kita-Träger bleibt Label, kein `behoerde_id`).
- Mobilität/Renten o. Ä. — gehören in Stammdaten, nicht in Familie.

## 11. Review checklist (for code-reviewer)

- [ ] Keine hardcoded Strings — alles via `t()`; alle § 8-Keys in `de.json` +
      6 Locales (non-DE `needs_review`).
- [ ] Member-Cards rendern aus Persona-Seed, NICHT aus PNG-Labels (Tobias/Lev-Mapping).
- [ ] Foundation-Primitives reused (Card/Avatar/ListRow/StatusBadge/RightRailCard/
      KeyValueRow/IconCircle); keine duplizierten Implementierungen.
- [ ] `getFamilie` ist read-only, leitet alles aus Persona ab, läuft durch
      `withLatency()`, emittiert KEINEN Activity-Log-Eintrag.
- [ ] Rollen-Badges sind farb-frei (neutral, Text-Label) — HL-DS-3/10.
- [ ] Speculative-Elemente (Vertretung/Sorge-Vollmacht) tragen Text-Marker
      „Spekulatives Demo-Feature", nicht nur Farbe.
- [ ] „Was betrifft wen?"-Rail ist eigene `<aside>`-Landmark; Counts in `<dl>`
      mit `tabular-nums` (HL-DS-6).
- [ ] „Sicher & geschützt"-Footer + Link auf `/datenschutz` present.
- [ ] Lighthouse a11y > 95; axe 0 kritisch; Touch-Targets ≥ 44px; reduced-motion ok.

---

## Build log — mock-backend-coder

- date: 2026-05-27
- types added: `src/types/familie.ts` (HaushaltView, HaushaltMitglied, HaushaltRolle, GemeinsamerVorgang, FamilieNachweis, NachweisTyp). Barrel updated.
- api: NEW `getFamilie(personaId): Promise<HaushaltView>` (`familie/api.ts`, `withLatency`) — READ-ONLY, derived entirely from existing Persona; emits NO activity-log entry (consistent with Stammdaten lese-schicht). `getFamilieMitglieder` deliberately NOT built (getFamilie carries members).
- rendering follows the SEED, not the PNG labels: Anna = Hauptperson (rolle mutter via geschlecht w); `familie.partner` Tobias Becker -> rolle `partner` (NOT modelled as adult-Lev); `familie.kinder` Lev Petrov-Becker (geb. 2024-11-03) -> rolle `kind`. Gemeinsame Vorgaenge derived from flags: Kindergeld (kindergeld_bezug + kinder -> familienkasse-berlin-brandenburg, laufend, NO erfundenes Aktenzeichen), Krankenkasse (aok-nordost, genehmigt, betrifft Anker + familienversicherte Kinder), Kita (kind < 7 -> warten, label-only, kein behoerde_id). 4 fixed Nachweise (Geburtsurkunde verifiziert, Sorge-Vollmacht speculative, Vertretungsrechte speculative, Verknuepfungen vorhanden). Per-Person counts: vorgaenge=betreffende, dokumente=0 (no per-member doc refs in seed), nachweise=haushaltsweit, vertretungen=1 fuer Eltern/0 fuer Kinder. vertretung_speculative=true.
- seed records: none (fully derived). No personas.json change.
- buckets: none (banner-dismiss is component-local per §6).
- typecheck: pass. unit suite: 639/639 pass.
- known gaps: no Kindergeldnummer in seed -> Kindergeld-Zeile renders without Aktenzeichen (per §9, never invent). HaushaltVerwaltenDialog / Vertretungs-Workflows are UI-side speculative (out of scope §10).

## Build log — frontend-coder
- date: 2026-05-27
- screens implemented: Familie — „Mein Haushalt" (`/familie`), replacing the `PlaceholderSection`.
- components created (src/components/familie/):
  - `FamilieView.tsx` (client; loads via `api.getProfile` → `api.getFamilie` + `api.getBehoerden`; loading/empty/error states; renders from the SEED).
  - `MemberCard.tsx` (Avatar monogram + neutral colour-free role pill per HL-DS-3/10).
  - `MemberChips.tsx` (overlapping monogram Avatars; group `role="img"` + `aria-label` „Betrifft: …"; avatars decorative).
  - `PersonCountList.tsx` (4 `KeyValueRow`s, `tabular-nums` numbers, HL-DS-6).
  - `HaushaltVerwaltenDialog.tsx` (speculative vision dialog; no mutation; Base-UI focus trap + restore).
  - `src/app/(app)/familie/page.tsx` rewired to `<FamilieView/>`.
- foundation primitives reused (no duplication): `PageHeader`, `SectionCard`, `RightRailCard`, `ListRow`, `IconCircle`, `StatusBadge`, `EmptyState`, `Avatar`, `KeyValueRow`, `Badge`.
- SEED-vs-PNG: Anna = Hauptperson (Mutter); Tobias Becker rendered as `partner` MemberCard; Lev Petrov-Becker as `kind` MemberCard — NOT modelling Lev as an adult (PNG labels ignored as instructed).
- status mapping: Vorgang `genehmigt`→`bestaetigt`, `laufend`→`laufend`, `warten`→`warten`, `abgeschlossen`→`abgeschlossen`; Nachweis `verifiziert`→`verifiziert`, `vorhanden`→`aktiv`, `speculative`→`vorlage` (+ text marker „Spekulatives Demo-Feature"), `fehlt`→`manuell`. Status labels reuse `common.status.*`.
- a11y: one `<h1>` (PageHeader); SectionCard titles `<h2>`; „Was betrifft wen?" is `<aside aria-label>` with per-person `<h3>` rail cards; Vertretung banner `role="note"` carries text marker (not colour-only); counts in `<dl>` (KeyValueRow) tabular-nums; member chips carry the names as text via group aria-label.
- i18n keys added (DE source, de.json): full `familie.*` tree per § 8 (`page.{title,subtitle}`, `haushalt.{title,count}`, `rolle.*`, `cta.haushalt_verwalten`, `verwalten_dialog.{title,body,close}`, `vertretung_banner.*`, `vorgaenge.{title,kindergeld,krankenkasse,kita,kita_traeger,betrifft,show_all}`, `nachweise.*`, `was_betrifft_wen.*`, `sicher.*`, `empty.*`). Added `vorgaenge.kita_traeger` (Kita subtitle when no behoerde_id) + `verwalten_dialog.*` beyond § 8 for the speculative dialog. de.json JSON.parse OK.
- no second `<main>`: FamilieView root is `<div>` (app-shell layout already owns the canonical `<main>`).
- typecheck: pass. lint: pass (only pre-existing out-of-scope warning `stammdaten/api.ts:39`). unit: 639/639. smoke: `/familie` HTTP 200, PageHeader + speculative chip render, no dev-server errors.
- known gaps: data-dependent content (member cards / vorgänge / counts) loads client-side post-hydration and was not exercised via curl SSR; Playwright e2e for Familie not added this session (none existed). next: a11y-tester (Lighthouse/axe on `/familie`), then code-reviewer.

## Build log — i18n-localizer
- date: 2026-05-27
- locales updated: [en, ru, uk, ar, tr]  (de.json NOT touched — concurrent agents own DE source)
- new keys: 36 per locale = full `familie.*` block (page, haushalt, rolle×5, cta.haushalt_verwalten, verwalten_dialog×3, vertretung_banner×2, vorgaenge×7 incl. kita_traeger, nachweise×5, was_betrifft_wen×6, sicher×3, empty×2) → 36×5 = 180 leaf strings total.
- changed keys: 0 (additive only).
- review-needed flags resolved: 0 (FULL-quality pass — every string human-reviewed before commit; track is `supporting` but demo switches languages app-wide so familie was translated to full quality, not fast-draft).
- translation decisions:
  - DE→target direct, never via EN. Behörden/legal terms parenthesized with DE Latin for the non-DE reader: Kindergeld, Kita / Kita-Träger, Geburtsurkunde, Sorge-Vollmacht, Vertretung / Vertretungsrechte. `familie.vorgaenge.krankenkasse` = generic "Health insurance / Med. страхування / …" (DE source is "Krankenversicherung", not an org name → no paren).
  - Pronoun consistency: en formal "you"; ru "Вы" (cap); uk "Ви" (cap); ar formal مخاطب (يمكنك / أنت); tr "Siz". Vertretung-banner + verwalten-dialog phrased in that register in all 5.
  - ICU: `familie.vorgaenge.betrifft` = "{names}" placeholder preserved verbatim in all 5 (en "Concerns: {names}", ru "Касается: {names}", uk "Стосується: {names}", ar "يخصّ: {names}", tr "İlgili kişiler: {names}"). `familie.haushalt.count` = "{count}" count-noun phrase; DE source is flat "{count} Personen" (no MessageFormat plural categories), so targets mirror the flat form (en "{count} people", ru "{count} чел.", uk "{count} осіb"→"осіб", ar "{count} أشخاص", tr "{count} kişi"). FLAG: if a true grammatical plural is wanted (ru/uk one/few/many, ar zero/one/two/few/many), product-architect must add ICU select/plural in de.json source first — i18n must not hand-bake plurals nor diverge from a flat source.
  - "Sicher & geschützt" footer rendered with dignity in all 5; the 2027-Vision caveat on Vertretungsrechte kept (matches the speculative-marker requirement).
- length flags (role badges / chips / tight UI — for frontend-coder):
  - `rolle.partner`: DE "Partner:in" → en "Partner", ru "Партнёр", uk "Партнер", ar "الشريك", tr "Eş / partner" (tr longest, still short).
  - `was_betrifft_wen.vertretungen` count label: ru "Представительства" / uk "Представництва" / ar "حالات التمثيل" run longest in the per-person count rail — verify the `KeyValueRow` label column does not clip at narrow rail widths (RU/UK ~16 chars vs DE "Vertretungen" 12). No hard overflow expected; flagged for visual check.
  - `vorgaenge.kindergeld`/`kita`/`kita_traeger` carry parenthesised DE term → longer than DE label; these are ListRow titles/subtitles (wrap-friendly), not buttons — low risk.
- AR RTL: dir flip is layout-owned (`app/layout.tsx` per locale). Latin tokens (Wallet, BundID, Kindergeld, Kita, Geburtsurkunde, Sorge-Vollmacht, Vertretungsrechte) + `{names}`/`{count}` render LTR within RTL via Unicode bidi; no manual markup needed. Monogram avatars are LTR-neutral per spec § 9.
- JSON: all 5 files structurally validated (balanced braces, no trailing commas, familie block closes into root at line 1998; edits anchored on unique sibling strings). JSON.parse gate to be run by main thread (this agent has no Bash) per the V1.5 lesson.
- _status.json updated.
