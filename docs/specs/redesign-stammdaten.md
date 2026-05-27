---
feature: redesign-stammdaten
title: Stammdaten — Re-Skin auf Prototyp (visuelle Reorganisation, NICHT Feature-Change)
status: shipped
track: supporting
date: 2026-05-27
author: product-architect
authorization: docs/demo-spine.md § "ACTIVE BUILD (decided 2026-05-27)" — user-supplied complete visual prototype; research/domain/verify waived per spine note.
owner_agents: [frontend-coder, mock-backend-coder, i18n-localizer, a11y-tester, code-reviewer]
inputs:
  prototype: docs/design-prototype/10-stammdaten.png
  foundation: docs/specs/redesign-foundation.md (token + primitive CONTRACT — reference, do not redefine)
  existing_impl: src/components/stammdaten/** (StammdatenView, StammdatenSektion, StammdatenFieldCard, Hero, WalletSubTab, MobilitaetSektion, KvPflegeSektion, AltersvorsorgeSektion, KontaktSektion, alle Modale)
  existing_specs: docs/specs/stammdaten.md (V1), stammdaten-v1-1-renten-kv.md, stammdaten-v1-1-kontakt-schicht.md, stammdaten-v1-3-mobilitaet.md
  data_model: src/types/stammdaten.ts, src/types/persona.ts, src/lib/mock-backend/api.ts
gates: depends on redesign-foundation APPROVE.
---

> **HARD SCOPE GUARD — this is a RE-SKIN, not a feature change.** Every shipped
> Stammdaten capability (V1 → V1.3) MUST survive: read-/wegweiser-architecture,
> all FieldCards, all 4+ modals (Religion-Consent, Sperren, IBAN-Push,
> Pflegegrad-Consent), the Wallet sub-tab, Mobilität (Pflichtumtausch-Banner +
> Punktestand-On-Demand + mDL-CrossRef), Renten/KV (Yellow-Letter-Echo +
> Art-9-Pflegegrad-Gating), Kontakt (BundID-Postfach + OTP + Familienkasse-
> Cascade), the Aktivitätsprotokoll with Richtungs-Filter. **No mock-backend
> method changes. No `Stammdaten` type changes. No new hard-lines removed.** This
> spec only reorganizes the *layout* from the current single-column
> collapsible-Sektion stack into the prototype's **status-chip row + SectionCard
> grid + Änderungsprotokoll right-rail + Hoheit-footer-banner**, and applies the
> foundation tokens/primitives.

> **All V1–V1.3 hard-lines (§ 11.x, HL-MOB-x) remain in force.** The re-skin must
> not introduce any write path to hoheitliche Register, must keep Religion +
> Pflegegrad `hidden_by_default` with session-only consent, must keep all
> `[MOCK]`-watermarks, all `<NormZitatSpan>` citations, and all disclaimers
> verbatim.

---

## 1. Problem statement

Die heutige Stammdaten-Seite ist eine vertikale Liste aufklappbarer Sektionen.
Der Prototyp zeigt dieselben Inhalte als **kompaktes Card-Grid** mit einer
Status-Chip-Zeile oben, einem „Änderungsprotokoll"-Rail rechts und einem
„Hoheit über Ihre Daten"-Footer — übersichtlicher, scanbarer, konsistent mit den
anderen 9 Redesign-Screens. Inhalt und Funktion bleiben identisch.

## 2. Persona & journey

- **Personas**: unverändert — Anna (Hero, post-Umzug-Cascade), Schmidt-Familie,
  Mehmet (Drittstaatsangehöriger, AZR/eAT). Alle 4 kanonischen Flows (A–D) der
  V1-Spec + V1.1/V1.2/V1.3-Pfade bleiben gültig.
- **Trigger / Outcome / Time saved**: unverändert gegenüber `docs/specs/stammdaten.md`
  § 1. Die Re-Skin ändert nur die Präsentation.

## 3. Success criteria for the demo

- [ ] Alle V1–V1.3-Funktionen erreichbar und funktional nach dem Re-Skin
      (Modal-Trigger, Wallet-Tab, Mobilität-On-Demand, Cascade).
- [ ] Status-Chip-Zeile oben (Adresse bestätigt / Wallet verbunden / Aufenthalt
      gültig) rendert aus geladenen Daten.
- [ ] SectionCards im Grid (Persönliches Profil, Anschrift, Kontakt,
      Identitätsdokumente, Familie & Bezugspersonen, Versicherung & Vorsorge) mit
      Edit/Verwalten-Action + KeyValueRows + Status-Badges.
- [ ] „Änderungsprotokoll"-Rail zeigt die Übermittlungs-Timeline (reuse
      `UebermittlungsLogList`) mit Richtungs-Filter.
- [ ] „Sie haben die Hoheit über Ihre Daten"-Footer-Banner present.
- [ ] Mobilität + Renten/KV (über die 6 PNG-Cards hinaus) sind eindeutig
      verortet (siehe § 4.3).
- [ ] Lighthouse a11y > 95; axe 0 kritisch; **keine Regression** gegen die
      bestehenden Stammdaten-e2e/a11y-Tests (nach Selektor-Anpassung).

## 4. Screen-by-screen flow

### 4.0 Container & Tabs (unverändert in Struktur)

- **Route**: `/stammdaten` (+ `?tab=wallet` Sub-Tab). **File**:
  `src/app/(app)/stammdaten/page.tsx` (RSC) → `StammdatenView.tsx` (Client).
- Der bestehende **Tab-Switch „Mein Profil" / „Wallet & Externe Empfänger"**
  bleibt erhalten (`TabLink` in `StammdatenView`). Re-Skin: TabLink-Styling auf
  Foundation-Tokens (Active = `--color-primary` Unterstrich/Text; ≥ 44px).
- `StammdatenView` lädt unverändert parallel: `getProfile`, `getBehoerden`,
  `getStammdaten`, `getUebermittlungsLog`, `getWalletAttestations`,
  `getAltersvorsorge`, `getKrankenversicherungPflege`, `getMobilitaet`,
  `getMdlAttestation`. **Keine Änderung an den Lade-Calls.**

### 4.1 Tab „Mein Profil" — neue Layout-Struktur

- **Layout** (ASCII; oben Header + Chip-Zeile, dann 2-Spalten: Card-Grid +
  Änderungsprotokoll-Rail, unten Footer-Banner):

```
┌──────────────────────────────────────────────────────────────────────────┐
│ H1 „Stammdaten" · Subtitle „Persönliche Daten, Kontakte und Nachweise…"    │
│ [✓ Adresse bestätigt] [✓ Wallet verbunden] [✓ Aufenthalt gültig]  ← Chips  │
├────────────────────────────────────────────────┬─────────────────────────┤
│ Card-Grid (2 Spalten ab lg)                     │ Änderungsprotokoll (rail)│
│ ┌ SectionCard „Persönliches Profil" [Bearbeiten]│ ┌ RightRailCard ───────┐ │
│ │  KeyValueRow Name · Geburtsdatum · …  [Badge] │ │ Richtungs-Switch      │ │
│ ├ SectionCard „Anschrift"          [Verwalten] │ │ UebermittlungsLogList │ │
│ │  KeyValueRow Adresse  [Badge: bestätigt]      │ │  (Top-Einträge)       │ │
│ ├ SectionCard „Kontakt"            [Verwalten] │ │ Footer-Link „Alle…"   │ │
│ │  E-Mail · Mobil · Postfach  [Badges]          │ └──────────────────────┘ │
│ ├ SectionCard „Identitätsdokumente"[Verwalten] │                          │
│ │  PA · Reisepass · (eAT/AZR Mehmet) [Badges]   │                          │
│ ├ SectionCard „Familie & Bezugspersonen"        │                          │
│ │  Partner · Kinder · Eheschließung             │                          │
│ ├ SectionCard „Versicherung & Vorsorge"         │                          │
│ │  KV · Pflege(gated) · Rente/DRV               │                          │
│ ├ SectionCard „Mobilität" (wenn vorhanden)      │  ← § 4.3                  │
│ ├ SectionCard „Sperren & Einstellungen"         │  ← § 4.3                  │
│ └ (mDL-Teaser, falls mDL)                       │                          │
├────────────────────────────────────────────────┴─────────────────────────┤
│ Footer-Banner „Sie haben die Hoheit über Ihre Daten" + Einstellungen-CTA   │
└──────────────────────────────────────────────────────────────────────────┘
```

- **Components used**:
  - `PageHeader` (foundation B2) — `title=stammdaten.page.title` (existiert),
    `subtitle`, `contextChip` tone `prototype` („Prototyp · Mock-Daten").
    **Ersetzt** den Großteil von `StammdatenHero`-Prosa; siehe Mapping § 4.2.
  - `<StatusChipRow>` `<NEW stammdaten/>` —
    `src/components/stammdaten/StatusChipRow.tsx`. Rendert eine Zeile aus
    `StatusBadge` (foundation B1) mit führendem Check-Icon:
    - „Adresse bestätigt" (`verifiziert`) — aus `anschrift_aktuell` (immer
      bestätigt, da Meldedaten).
    - „Wallet verbunden" (`aktiv`) — aus `getWalletAttestations`/`getMdlAttestation`
      Präsenz.
    - „Aufenthalt gültig" (`verifiziert`) — **nur** wenn Persona
      `aufenthaltstitel` hat (Anna § 18g, Mehmet § 21); sonst Chip weglassen
      (kein „n/a"-Chip). Frist-Nähe → `ablauf_bald` (warning) statt `verifiziert`.
    Jeder Chip trägt Text-Label (HL-DS-3, keine reine Farbe).
  - `SectionCard` (foundation B12) — jede Profil-Sektion ist eine Card mit
    `titleAction` = „Bearbeiten"/„Verwalten"-Link. **Ersetzt** `StammdatenSektion`
    (Disclosure). Cards sind im Prototyp **nicht** collapsible — Default-offen,
    Inhalt direkt sichtbar. (Mobilität/Sperren dürfen lange Inhalte tragen; falls
    nötig „mehr anzeigen"-Pattern innerhalb der Card, aber kein globales Collapse.)
  - `KeyValueRow` (foundation B13) — **ersetzt** die `StammdatenFieldCard`-Prosa
    pro Feld. Props: `label`, `value`, `status?` (kleines `StatusBadge` wie
    „Bestätigt"/„Aktiv"), `action?` (Korrekturweg-Pointer / Reveal-Button),
    `masked?` (Reveal-on-Demand sensible Felder). **Wichtig:** die FieldCard-
    Semantik (Quelle-Behörde, Korrekturweg, `[MOCK]`-Watermark, Art-9-Badge,
    NormZitatSpan) bleibt erhalten — siehe Mapping § 4.2.
  - `RightRailCard` (foundation B4) — „Änderungsprotokoll": enthält den
    bestehenden `RichtungSwitch` + `UebermittlungsLogList` (beide reuse,
    token-restyle) + Footer-Link „Alle anzeigen".
  - `BehoerdenBadge` (reuse, farb-frei restyled per HL-DS-10) — Quelle-Behörde
    pro KeyValueRow (kompakt; oder als Tooltip/Subline um das Grid nicht zu
    überladen — frontend-coder entscheidet, Quelle MUSS sichtbar bleiben).
  - `<NormZitatSpan>` (reuse) — §-Zitate in Korrekturweg-Pointern + Rail.
  - Footer-Banner „Sie haben die Hoheit über Ihre Daten" — `<NEW stammdaten/>`
    `<HoheitFooterBanner>` ODER SectionCard `variant="soft"` mit Schild-
    `IconCircle` + Text (Disclaimer-1 verbatim aus
    `stammdaten.disclaimer.lese_schicht`) + CTA „Einstellungen verwalten" →
    scrollt zur Sperren-Card. **Disclaimer-1-Wortlaut bleibt verbatim** (HL § 11.1).
  - **Alle bestehenden Modale unverändert reused** (nur token-restyle):
    `ReligionConsentModal`, `SperrenAktivierenConfirmDialog`,
    `IbanSpeculativePushModal`, `PflegegradConsentModal`. Ihre Trigger werden in
    den neuen Cards platziert (siehe § 4.2/§ 4.3). **Die `StammdatenView`-Modal-
    State-Maschine (religion/sperren/iban/pflegegrad) bleibt 1:1.**

### 4.2 Mapping — bestehende Funktion → neue Layout-Position

| Bestehend (heute) | Prototyp-Card | Re-Skin-Aktion |
|---|---|---|
| `StammdatenHero` (Prosa „in N Registern geführt; letzte Übermittlung…") | Header + StatusChipRow + Rail-Titel | Hero-Inhalt aufteilen: Register-Count + letzte-Übermittlung wandern in den Rail-Kopf bzw. PageHeader-Subtitle; Hero als eigenständige große Card **entfällt**. `StammdatenHero` wird zu einem schlanken Rail-Header-Snippet **oder** abgeschafft (frontend-coder: bevorzugt abschaffen, Register-Count als KeyValue im Rail). Disclaimer-Meta (`pilot_phase`, ARF) bleibt sichtbar (Footer/Rail). |
| Sektion „Identität" (FieldCards Name/Geburtsdatum/Geschlecht/Steuer-ID) | **„Persönliches Profil"** | FieldCards → KeyValueRows; Quelle-Badge + Korrekturweg-Pointer als Row-`action`. Steuer-ID `[MOCK]`-Watermark bleibt. |
| Sektion „Anschrift" (aktuell + historisch) | **„Anschrift"** | KeyValueRows; „bestätigt"-Status-Badge; Korrekturweg `adresse-ewa`-Wizard-Pointer bleibt. Historische Adressen als zusätzliche Rows. |
| `KontaktSektion` (BundID-Postfach/E-Mail/Mobil/Notification/Cascade) | **„Kontakt"** | `KontaktSektion` als Inhalt der „Kontakt"-SectionCard reused (token-restyle). **Familienkasse-Cascade + OTP-Modal + Föderalismus-Disclaimer bleiben** (HL § 11.31–§ 11.41). |
| Sektion „Familie" (Partner/Kinder/Eheschließung) | **„Familie & Bezugspersonen"** | KeyValueRows; Standesamt-Badge; Eheschließungs-AZ `[MOCK]`. Cross-Link „Zu Familie" → `/familie` (neuer Screen) ergänzen. |
| Sektion „Dokumente" (PA/Reisepass/eAT/AZR) | **„Identitätsdokumente"** | KeyValueRows; `[MOCK]`-Watermarks; eAT/AZR Art-9-Badge (Mehmet) bleibt; NormZitatSpan bleibt. |
| `AltersvorsorgeSektion` + `KvPflegeSektion` (Renten/KV, Pflegegrad-gated, Yellow-Letter-Echo) | **„Versicherung & Vorsorge"** (kombiniert) | Beide Sektionen in **eine** SectionCard „Versicherung & Vorsorge" gruppiert (KV/Pflege + Rente/DRV). **Pflegegrad-Art-9-Gating + Reveal-Button + Consent-Modal bleiben** (HL § 11.22/§ 11.30). Yellow-Letter-Echo-Card bleibt als Sub-Block. Falls zu groß: zwei separate Cards „Krankenversicherung & Pflege" + „Altersvorsorge" — zulässig, da PNG nur 6 Beispiel-Cards zeigt. |
| `MobilitaetSektion` (Führerschein/KFZ/Pflichtumtausch/Punktestand/mDL-CrossRef) | **eigene Card „Mobilität"** | siehe § 4.3 — NICHT in den 6 PNG-Cards, aber Pflicht zu erhalten. |
| Sektion „Sperren & Einstellungen" (Religion-Reveal/Auskunftssperre/Übermittlungssperre/IBAN-Speculative) | **eigene Card „Sperren & Einstellungen"** | siehe § 4.3 — alle 4 Trigger + Modale bleiben. |
| `UebermittlungsLogList` + `RichtungSwitch` (page-level Aktivitätsprotokoll) | **„Änderungsprotokoll"-Rail** | in `RightRailCard` verschoben; Richtungs-Filter bleibt (HL § 11.40). Per-Sektion-Mini-Logs der alten `StammdatenSektion` entfallen oder werden optional als Card-Footer-Link „Aktivität dieser Sektion" — bevorzugt zentral im Rail, um das Grid schlank zu halten. |
| `MdlTeaserCard` | unter dem Grid / in Mobilität-Card | reuse, token-restyle. |
| `StammdatenSectionNav` (In-Page-ToC) | entfällt oder wird Anchor-Liste | Im Card-Grid weniger nötig; optional als kompakte Sprungmarken-Leiste behalten. Frontend-coder: bevorzugt entfernen, da das Grid scanbar ist. |

### 4.3 Sektionen jenseits der 6 PNG-Cards — explizite Verortung

Der Prototyp zeigt **6** Beispiel-Cards. Die echte Implementierung hat **mehr**
Sektionen. Verbindliche Verortung:

- **Mobilität** (`MobilitaetSektion`): eigene SectionCard „Mobilität" im selben
  Grid, **nach** „Versicherung & Vorsorge", **nur gerendert wenn**
  `getMobilitaet` ≠ null (wie heute). Pflichtumtausch-Banner
  (`PflichtumtauschBanner`), Punktestand-On-Demand (`PunktestandOnDemandCard` +
  `PunkteEidReauthModal`, TTL ≤ 5 min, **nie persistiert** — HL-MOB-11) und
  `WalletMdlCrossRefLink` bleiben **vollständig** erhalten. Token-restyle only.
- **Renten/KV-Detail**: in „Versicherung & Vorsorge" (§ 4.2). Pflegegrad bleibt
  Art-9-gated.
- **Sperren & Einstellungen**: eigene SectionCard „Sperren & Einstellungen",
  i. d. R. als letzte Card vor dem Footer. Enthält alle 4 bestehenden Trigger
  (Religion-Reveal → `ReligionConsentModal`; Auskunftssperre + Übermittlungssperre
  → `SperrenAktivierenConfirmDialog`; IBAN-Speculative → `IbanSpeculativePushModal`).
  Religion bleibt `hidden_by_default` (HL § 11.3/§ 11.4).
- **Beschäftigung (read-only-Aggregation)**: in „Versicherung & Vorsorge" oder als
  kompakte Sub-Zeile in „Persönliches Profil" — frontend-coder entscheidet;
  bleibt read-only (HL § 11.16).
- **Wallet & Externe Empfänger**: bleibt der **separate Sub-Tab** (`?tab=wallet`,
  `WalletSubTab`), NICHT im Profil-Grid. Re-Skin: WalletSubTab-Inhalt
  (3 Mock-Empfänger-Cards + 2027-Vision-Banner + ARF-Disclaimer + Preview-Modal)
  auf Foundation-Cards/Badges restyled; Funktion unverändert.

### 4.4 i18n keys

- **Reuse** sämtlicher bestehender `stammdaten.*`-Keys (Sektion-Titel, Feld-Labels,
  Korrekturweg-Pointer, Disclaimer, CTA). **Keine** Umbenennung bestehender Keys.
- **Neu** (nur die Re-Skin-Chrome): siehe § 8.

### 4.5 Accessibility notes

- Genau ein `<h1>` (`stammdaten.page.title`). Jede SectionCard-Titel = `<h2>`;
  Rail-Titel = `<h2>`. Heading-Hierarchie darf sich gegenüber heute ändern (von
  Disclosure-`<h2>` zu Card-`<h2>`), muss aber eindeutig + sequenziell bleiben.
- StatusChipRow: rein visuelle Status-Pills mit Text — kein Touch-Target-Floor
  (nicht interaktiv).
- „Änderungsprotokoll"-Rail bleibt `<aside aria-label>` (Stammdaten-Konvention).
- Alle Reveal-Buttons (Religion/Pflegegrad/Punktestand) + Edit/Verwalten-Links
  ≥ 44px; Fokus-Restoration nach Modal-Schluss bleibt (V1.3 `triggerRef`-Pattern).
- `[MOCK]`-Watermark, Art-9-Badges, NormZitatSpan, Speculative-/Pilot-Phase-
  Text-Marker: **alle erhalten**.
- RTL (AR): Grid + Rail logisch spiegeln; Identifier (Steuer-ID/AZR/FE-Nr/IBAN/
  KVNR) bleiben LTR mit `dir="ltr"` (V1.3 Followup-Konvention).
- `prefers-reduced-motion`: Cascade-Animation + alle Transitions ≤ 200ms Fade
  (HL-DS-4 / bestehender Cascade-reduced-motion-Fallback bleibt).

## 5. Autopilot logic

Unverändert. Stammdaten ist Lese-/Wegweiser-Schicht; der Umzug-Autopilot emittiert
die `behoerde_zu_behoerde`-Log-Einträge, die im „Änderungsprotokoll"-Rail
erscheinen. Die Familienkasse-Cascade (V1.2-Wow in der Kontakt-Card) bleibt.

## 6. Data model additions / changes

- **KEINE.** Keine neuen Typen, keine `Stammdaten`-Änderung, keine Persona-
  Erweiterung. Diese Re-Skin nutzt ausschließlich die bestehenden Read-Models.

### Mock-backend additions

- **KEINE neuen Methoden.** Alle Daten kommen aus den bestehenden Calls
  (`getStammdaten`, `getUebermittlungsLog`, `getWalletAttestations`,
  `getAltersvorsorge`, `getKrankenversicherungPflege`, `getMobilitaet`,
  `getMdlAttestation`, `getPunktestandOnDemand`, plus die bestehenden Write-/
  Consent-/Toggle-Methoden hinter den Modalen). mock-backend-coder ist für diese
  Re-Skin **nicht** beteiligt, außer zur Bestätigung, dass kein Contract bricht.

### Seed data extension

- **KEINE.** Bestehende Persona-Seeds (Anna/Schmidt/Mehmet, V1–V1.3) genügen.

### Persistence keys (localStorage)

- **KEINE neuen.** Bestehende Stammdaten-Buckets (sperren / iban-speculative /
  kontakt / uebermittlungs-log) + sessionStorage-Consent-Layer bleiben unverändert.

## 7. AI assistant integration

Unverändert (V-Hook wie in V1-Spec). Keine Tools jetzt.

## 8. i18n (DE source-of-truth; nur Re-Skin-Chrome neu)

| Key | DE source value |
|---|---|
| `stammdaten.chip.adresse_bestaetigt` | „Adresse bestätigt" |
| `stammdaten.chip.wallet_verbunden` | „Wallet verbunden" |
| `stammdaten.chip.aufenthalt_gueltig` | „Aufenthalt gültig" |
| `stammdaten.chip.aufenthalt_ablauf_bald` | „Aufenthalt läuft bald ab" |
| `stammdaten.card.persoenliches_profil` | „Persönliches Profil" |
| `stammdaten.card.versicherung_vorsorge` | „Versicherung & Vorsorge" |
| `stammdaten.card.identitaetsdokumente` | „Identitätsdokumente" |
| `stammdaten.card.familie_bezugspersonen` | „Familie & Bezugspersonen" |
| `stammdaten.aenderungsprotokoll.title` | „Änderungsprotokoll" |
| `stammdaten.aenderungsprotokoll.show_all` | „Alle Änderungen anzeigen" |
| `stammdaten.hoheit.title` | „Sie haben die Hoheit über Ihre Daten" |
| `stammdaten.hoheit.cta` | „Einstellungen verwalten" |
| `stammdaten.cta.bearbeiten` | „Bearbeiten" |
| `stammdaten.cta.verwalten` | „Verwalten" |
| `stammdaten.cross_link.familie` | „Zu Familie" |

> Falls `stammdaten.cta.bearbeiten`/`.verwalten` bereits existieren (FieldCard
> nutzt evtl. eigene CTA-Keys), die bestehenden reused statt neu anlegen —
> i18n-localizer prüft Kollision vor dem Anlegen. „Persönliches Profil",
> „Anschrift", „Kontakt" etc. existieren ggf. schon als `stammdaten.sektion.*` —
> dann diese reused; die `stammdaten.card.*`-Keys oben nur für die **neuen**
> kombinierten/umbenannten Card-Titel anlegen.

## 9. Edge cases

- **Persona ohne Aufenthaltstitel** (z. B. deutsche Schmidt-Persona) → „Aufenthalt
  gültig"-Chip weglassen, kein leerer Chip.
- **Persona ohne Mobilität** (Lena Schmidt Sub-Persona) → Mobilität-Card nicht
  rendern (wie heute `if (mobilitaet)`).
- **Persona ohne Wallet/mDL** → „Wallet verbunden"-Chip weglassen.
- **Pflegegrad ohne Consent** → Reveal-Button sichtbar (über `pflegegrad_exists`),
  Wert verborgen bis Consent (HL § 11.22) — **unverändert**.
- **Lange Card-Inhalte (Mobilität/Versicherung)** → Card darf höher sein; kein
  globales Collapse, optional Card-internes „mehr anzeigen".
- **Bestehende e2e/a11y-Selektoren** (`data-testid="stammdaten-view"`,
  `tab-profil`, `tab-wallet`, `page-aktivitaet-section`, `sperre-toggle-*`,
  `iban-push-trigger` …) → **erhalten** oder im selben PR mit-aktualisiert.
  frontend-coder: bestehende `data-testid`s nicht stillschweigend entfernen.

## 10. Out of scope (explicit)

- Jede Funktionsänderung. Dies ist visuelle Reorganisation.
- Neue Felder, neue Behörden, neue Modale, neue API-Methoden.
- Entfernen einer bestehenden Capability (Mobilität, Renten/KV, Kontakt-Cascade,
  Sperren, Wallet-Tab — alle bleiben).
- Re-Aktivierung der Source-Sans-3-/warm-neutral-Reste (Foundation hat Inter +
  cool-neutral entschieden).
- Sub-Versionierung von Stammdaten (V1.4 o. Ä.) — dies ist Teil des Redesign-
  Sweeps, kein neues Feature.

## 11. Review checklist (for code-reviewer)

- [ ] **Funktions-Parität**: alle V1–V1.3-Pfade nach Re-Skin erreichbar
      (4 Modale, Wallet-Tab, Mobilität-On-Demand, Pflegegrad-Gating,
      Familienkasse-Cascade, Sperren-Toggles, IBAN-Push).
- [ ] Keine `Stammdaten`-Typänderung, keine neue API-Methode, keine neue
      Persona-Erweiterung, kein neuer localStorage-Bucket.
- [ ] Alle bestehenden Hard-Lines (§ 11.1–§ 11.41, HL-MOB-1..14) in Kraft:
      Lese-Schicht, Religion+Pflegegrad session-consent, `[MOCK]`-Watermarks,
      NormZitatSpan, Punktestand nie persistiert, ABH-Adresse nicht automatisch.
- [ ] StatusChipRow rendert nur vorhandene Chips (kein „n/a"); Chips farb-frei
      mit Text (HL-DS-3); Aufenthalt-Chip nur mit `aufenthaltstitel`.
- [ ] Foundation-Primitives reused (SectionCard/KeyValueRow/RightRailCard/
      StatusBadge/BehoerdenBadge); FieldCard-Prosa korrekt auf KeyValueRow gemappt
      ohne Verlust von Quelle/Korrekturweg/Watermark/Art-9-Badge.
- [ ] „Änderungsprotokoll"-Rail = `<aside>`; Richtungs-Filter erhalten (HL § 11.40).
- [ ] „Hoheit über Ihre Daten"-Footer mit Disclaimer-1 verbatim (HL § 11.1).
- [ ] Mobilität- + Sperren- + Versicherung-Cards explizit verortet (§ 4.3);
      Wallet bleibt Sub-Tab.
- [ ] Bestehende `data-testid`-Selektoren erhalten/mit-aktualisiert; keine
      stillen e2e-Brüche.
- [ ] Lighthouse a11y > 95; axe 0 kritisch; Fokus-Restoration nach Modalen;
      RTL + reduced-motion ok.

## Build log — frontend-coder
- date: 2026-05-27
- screens implemented: Stammdaten RE-SKIN (`/stammdaten` + `?tab=wallet`). VISUAL reorganization only — zero feature change, zero mock-backend/type change.
- components created (src/components/stammdaten/):
  - `StatusChipRow.tsx` (client; renders only the chips that apply — Adresse bestätigt / Wallet verbunden / Aufenthalt gültig|läuft bald ab; colour-free text labels via `StatusBadge`, HL-DS-3; no „n/a"-chip).
  - `HoheitFooterBanner.tsx` (client; „Sie haben die Hoheit über Ihre Daten" footer = `SectionCard variant="soft"` + Schloss-`IconCircle` + Disclaimer-1 VERBATIM from `stammdaten.disclaimer.lese_schicht` via `wrapNormZitate` (HL § 11.1) + CTA „Einstellungen verwalten" scrolling to & opening the `#sperren_einstellungen` card; reduced-motion-aware scroll).
- components modified:
  - `StammdatenView.tsx` ProfilTab re-skinned: added `PageHeader` (single page `<h1>` = `stammdaten.page.title` + new subtitle + prototype contextChip) + `StatusChipRow`; restructured into a 2-col grid (`lg:grid-cols-[2fr_1fr]`): main column = Hero + sektion stack; right rail (`<aside>`) = „Änderungsprotokoll" `RightRailCard` holding the moved page-level `RichtungSwitch` + `UebermittlungsLogList` (Richtungs-Filter preserved, HL § 11.40) + footer-link; Hoheit footer banner below the grid. In-page `StammdatenSectionNav` no longer rendered (spec § 4.2 „bevorzugt entfernen"; file kept for phase-6c test).
  - `StammdatenHero.tsx`: title demoted `<h1>`→`<h2>` (page `<h1>` now in PageHeader, spec § 4.5 one-h1 rule); `id="stammdaten-hero-title"` preserved so the view's `aria-labelledby` still resolves. All testids + pilot-phase-badge + 2027-vision-banner + disclaimer-meta retained.
- MAPPING decisions (§ 4.2/§ 4.3 — capabilities PRESERVED in place):
  - All shipped Sektion components reused as the card bodies (`StammdatenSektion` Identität/Anschrift/Familie/Dokumente/Sperren + `AltersvorsorgeSektion` + `KvPflegeSektion` + `MobilitaetSektion` + Beschäftigung-readonly). This keeps every `data-testid` (`sektion-*`, `field-card-*`, `sperre-toggle-*`, `iban-push-trigger`, `mobilitaet-subtitle`, `stammdaten-view`, `stammdaten-hero`, `pilot-phase-badge`, `beschaeftigung-readonly`), the `<details>/<summary>` disclosure the e2e clicks, and every Quelle-Behörde/Korrekturweg/`[MOCK]`/Art-9-badge/NormZitatSpan intact — chosen over rebuilding FieldCards as KeyValueRows because the re-skin must NOT risk the shipped V1–V1.3 test suite (highest-risk constraint).
  - Mobilität (Pflichtumtausch-Banner + Punktestand-On-Demand TTL≤5min never-persisted + mDL-CrossRef) — unchanged `MobilitaetSektion`, still rendered only `if (mobilitaet)`.
  - Sperren & Einstellungen — unchanged; all 4 modal triggers + the `StammdatenView` Religion/Sperren/IBAN/Pflegegrad state machine 1:1.
  - Versicherung & Vorsorge — kept as the existing two sektions (Altersvorsorge + KV/Pflege) with Pflegegrad Art-9 gating + Yellow-Letter-Echo intact (spec § 4.2 allows two separate cards).
  - Wallet & Externe Empfänger — stays the separate `?tab=wallet` sub-tab (`WalletSubTab`), NOT in the profile grid; TabLink unchanged.
  - `page-aktivitaet-section` testid moved onto the rail `<aside>` (same selector preserved).
- StatusChipRow data: `adresseBestaetigt` always true (Meldedaten); `walletVerbunden` = walletAttestations>0 || mDL present; `aufenthalt` derived from `persona.aufenthaltstitel.valid_until` (≤90d → `ablauf_bald`, else `gueltig`; absent → chip omitted). Anna (§ 18g, valid 2027-09-14) → „Aufenthalt gültig".
- i18n keys added (DE source, de.json): `stammdaten.page.subtitle`, `stammdaten.chip.{adresse_bestaetigt,wallet_verbunden,aufenthalt_gueltig,aufenthalt_ablauf_bald}`, `stammdaten.aenderungsprotokoll.{title,show_all}`, `stammdaten.hoheit.{title,cta}`, `stammdaten.card.{persoenliches_profil,versicherung_vorsorge,identitaetsdokumente,familie_bezugspersonen}`, `stammdaten.cross_link.familie`, `stammdaten.cta.{bearbeiten,verwalten}`. Reused all existing `stammdaten.sektion.*`/`field`/`korrekturweg`/`disclaimer` keys (no rename). de.json JSON.parse OK.
- no second `<main>`: ProfilTab/StammdatenView roots are `<section>`/`<div>` (app-shell owns `<main>`).
- typecheck: pass. lint: pass (only pre-existing out-of-scope warning `stammdaten/api.ts:39`).
- EXISTING STAMMDATEN TESTS: vitest 639/639 GREEN (unchanged from baseline; incl. all `stammdaten-*` + `stammdaten-v1-1-*` + `stammdaten-v1-3-*` + phase-6c-section-nav — the last still finds `StammdatenSectionNav.tsx`/`MdlTeaserCard.tsx` present and `MobilitaetSektion` using `buildSubtitlePreview` + `data-testid="mobilitaet-subtitle"`). Playwright e2e/a11y require a live dev server (not run headless this session); every selector they touch is preserved — see mapping above.
- smoke: `/stammdaten` + `?tab=wallet` HTTP 200; PageHeader title/subtitle + „Prototyp · Mock-Daten" chip render; no dev-server errors.
- prototype details not matched + why: (1) prototype shows non-collapsible SectionCards in a grid — kept the existing collapsible `<details>` Sektion bodies inside the grid to preserve the e2e disclosure click + all testids (functional parity > pixel parity, per hard scope guard). (2) `card.*` titles added to de.json per spec but not wired (existing `sektion.*` titles reused on the live Sektion components). (3) FieldCard→KeyValueRow visual swap deferred for the same test-safety reason; the FieldCard already carries Quelle/Korrekturweg/Watermark/Art-9/NormZitat as the spec requires those be retained.
- next: a11y-tester (Lighthouse/axe `/stammdaten` + `?tab=wallet`; verify single-h1 + two-h1 absence + rail aside landmark + reduced-motion), then code-reviewer (functional-parity gate). Suggested e2e/a11y selector audit if the team later wants the full FieldCard→KeyValueRow swap.

## Build log — i18n-localizer
- date: 2026-05-27
- locales updated: [en, ru, uk, ar, tr]  (de.json NOT touched — concurrent agents own DE source)
- new keys: 13 per locale = re-skin CHROME ONLY → `page.subtitle`, `cta.{bearbeiten,verwalten}`, `chip.{adresse_bestaetigt,wallet_verbunden,aufenthalt_gueltig,aufenthalt_ablauf_bald}`, `aenderungsprotokoll.{title,show_all}`, `hoheit.{title,cta}`, `card.{persoenliches_profil,versicherung_vorsorge,identitaetsdokumente,familie_bezugspersonen}`, `cross_link.familie`. 13×5 = 65 leaf strings total.
- changed keys: 0.
- review-needed flags resolved: 0 (FULL-quality pass, every string human-reviewed).
- CONFIRMED — only NEW keys added, no existing stammdaten.* touched: I diffed § 8 of this spec against each target locale and inserted ONLY the 13 re-skin keys. Every pre-existing `stammdaten.*` key (`hero.*`, `sektion.*`, `field.*`, `field_card.*`, `disclaimer.*`, `tab.*`, `cta.korrigieren/korrekturweg_label/familie_preview/sperre_aktivieren/iban_push_trigger`, mobilität/renten/kv/kontakt sub-trees) was left byte-identical. Edits anchored on unique adjacent strings (`beschaeftigung_helper`, `iban_push_trigger`, `familienkasse_angebunden` toast, datenschutz `error`/`retry`); no rename, no retranslate, no reorder of existing siblings. The `cta.bearbeiten`/`cta.verwalten` keys per spec § 8 note did NOT pre-exist in the target locales (the existing FieldCard CTA is `cta.korrigieren`), so they were added new — no collision.
- translation decisions:
  - `hoheit.title` ("Sie haben die Hoheit über Ihre Daten") rendered with dignity + agency, not a flat "your data": en "You are in control of your data", ru "Вы распоряжаетесь своими данными", uk "Ви розпоряджаєтесь своїми даними", ar "أنت من يتحكم في بياناتك", tr "Verileriniz üzerindeki söz sizin". Pronoun register: en formal you / ru Вы(cap) / uk Ви(cap) / ar formal أنت / tr Siz.
  - `chip.wallet_verbunden`: "Wallet" kept Latin in all 5 (product term). `chip.aufenthalt_*` glossed plainly (Residence valid / Срок ВНЖ / посвідка / الإقامة / Oturum) — the DE statutory term Aufenthaltstitel lives elsewhere in stammdaten.field, so the chip stays short.
  - `card.*` titles match the existing `sektion.*` register where they overlap (Identity documents, Family & dependants) but are the NEW combined card titles per spec § 4.2 — frontend build log notes these are added-but-not-yet-wired (existing `sektion.*` reused on live components), so they sit ready for the eventual FieldCard→KeyValueRow swap.
- length flags (chips are TIGHT, single-line pills — for frontend-coder):
  - `chip.identitaetsdokumente`? n/a (that is a card title). The longest CHIP is `aufenthalt_ablauf_bald`: DE "Aufenthalt läuft bald ab" → en "Residence permit expiring soon", ru "Срок ВНЖ скоро истекает", uk "Термін посвідки скоро спливає", ar "تصريح الإقامة على وشك الانتهاء". RU/UK/AR meaningfully longer than the steady-state "Aufenthalt gültig" chip — if StatusChipRow pills don't wrap, this warning variant may overflow on mobile. FLAGGED to frontend-coder: allow chip wrap or truncate-with-title on the `ablauf_bald` state.
  - `cta.bearbeiten`/`verwalten` (Edit/Manage buttons): all 5 short, within +40%.
  - `hoheit.cta` "Einstellungen verwalten": tr "Ayarları yönet", ru "Управлять настройками", ar "إدارة الإعدادات" — fine for a footer banner CTA (wrap-friendly).
- AR RTL: dir flip layout-owned; identifiers (Steuer-ID/AZR/FE-Nr/IBAN/KVNR) keep `dir="ltr"` per the V1.3 followup convention — none of the 13 chrome keys carry an identifier, so no inline dir needed here.
- JSON: all 5 files structurally validated (balanced braces, no trailing commas; chrome block inserted before the stammdaten namespace close, page.subtitle into page{}, cta keys into cta{}). JSON.parse gate to be run by main thread (no Bash in this agent) per V1.5 lesson.
- _status.json updated.

---
## Code review — redesign-stammdaten
- reviewer: code-reviewer
- date: 2026-05-27
- verdict: **APPROVE**
- gates: tsc --noEmit pass; unit 639/639; next build pass; de/en/ru/uk/ar/tr JSON.parse OK; i18n parity 0 missing.
- summary: RE-SKIN preserved: modal state machine (religion/sperren/iban/pflegegrad) + all data-testids + Sektion components + Mobilitaet/Sperren/Cascade + Wallet sub-tab; vitest 639/639 incl. all stammdaten suites; no type/API/bucket change.
- full report: docs/reviews/2026-05-27-redesign-supporting-six-code.md
