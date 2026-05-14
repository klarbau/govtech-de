# UX-Audit: Stammdaten V1.3

**Datum**: 2026-05-14
**Auditor**: Explore-Agent (inline-report)
**Zweck**: Eingangs-Daten für `docs/specs/design-system-v2.md` § 11.3 und Phase 6c frontend-coder

## Top-7 schwerwiegendste Probleme

### 1. Hero-Sektion als Disclaimer-Wand statt Trust-Center
`StammdatenHero.tsx:155–188`: Hero öffnet mit zwei verschachtelten `<details>`-Elementen ("Lese-Schicht", "Audit-Log-Apparat") als erste sichtbare Inhalte nach Pilotphase-Badge. Nutzer sieht nicht sofort den Wow ("alle Daten aus realen Registern"), sondern muss erst zwei Legaltext-Dropdowns klappen. 2027-Vision-Banner kommt zu spät (Z. 155).

**Hebel**: Vision-Banner oben, Disclaimer-`<details>` nach unten.

### 2. 40+ Datenfelder, 7 Sektionen, keine ToC
`StammdatenView.tsx`: Hero → Aktivitätsprotokoll → 8 `<StammdatenSektion>` (Identität, Adresse, Familie, Altersvorsorge, KV/Pflege, Mobilität, Dokumente, Sperren, + Beschäftigung readonly). Nur Identität default-open. Nutzer muss 7× klappen.

**Hebel**: In-Page-ToC mit Jump-Links, oder Sticky-Tab-Leiste mit Section-Names auf Mobile.

### 3. Plotnost pro Field-Card — 4+ Elemente pro Zeile
`StammdatenFieldCard.tsx:93–149`: Titel + optional 3 Badges (Art9, Mock, 2027) + Wert + optional Quelle-Behörde + ggf. Korrekturweg-Pointer + optional Trailing-Button. Bei schmalem Viewport oder Dark Mode → Inline-Chaos.

**Hebel**: Responsive Grid (2-Spalten auf >768px) oder Flex-Stack erzwingen; Badges in separater Zeile wenn Value lang.

### 4. Pflichtumtausch-Banner für Schmidt sichtbar, aber nicht prominent
`PflichtumtauschBanner.tsx:79–115`: bei Schmidt-Vater (FE 2002, Stichtag 19.01.2027) rendert amber-50-Banner unter FuehrerscheinHauptkarte. Aber in Sektion-Collapsed-View kein "Preview" sichtbar (Spec § 3 fordert preview-Text auf CollapsedSummary).

**Hebel**: Preview-Text in `<MobilitaetSektion>` subtitle einbauen, oder FE-Hauptkarte immer expanded.

### 5. mDL-Wallet-Card als "eine von vielen" — keine Wow-Platzierung
`WalletMdlCard.tsx:54–93` + `WalletSubTab.tsx:46–100`: mDL-Innovation versteckt sich im Wallet-Sub-Tab hinter 3 PID-Drittel-Attestationen. Kein Banner auf Profil-Tab. Mobile-Nutzer übersehen Sub-Tabs.

**Hebel**: mDL-Teaser im Mobilität-Sektion-Header, oder Sub-Tab-Navigation prominenter.

### 6. UmzugBridgeBadge Farb-Kontrast (A11y-Blocker — bereits in V1.3-Followups, aber noch nicht resolved)
`UmzugBridgeBadge.tsx:46–51`: per a11y-Report `text-amber-950/90` zeigt 2.67:1 Kontrast statt 4.5:1 wegen Alpha-Komposition.

**Hebel**: `text-amber-950` ohne Alpha. **Aber HL-DS-Migration zu `--color-warning`-Palette**: muss in Phase 5b berücksichtigt werden.

### 7. Aktivitätsprotokoll zu weit unten in Page-Hierarchy
`StammdatenView.tsx:454–474`: Aktivitätsprotokoll (mit Richtung-Filter) sitzt auf Page-Level **vor** den Sektionen. Aber Nutzer wollen Aktivität zu einem Feld nach Klick. Per-Sektion-Logs sind kollabiert in `<aside>`. Paradox: globales Log prominent, lokale Logs versteckt.

**Hebel**: Lokale Logs an Sektionen klebrig machen (Tab über Details), oder globales Log unter Sektionen.

## Quick Wins

- A11y Fix: UmzugBridgeBadge text-Farbe darken — 5 Min (in Phase 5b koordiniert).
- PunkteEidReauthModal focus-restore via triggerRef + requestAnimationFrame — 10 Min.
- `dir="ltr"` auf FinMaskedSpan + FE-Nr Latin-Spans für AR-Locale — 5 Min.
- Mobilität-Sektion preview-Text: "Fahrerlaubnis: Klasse B, Punkte: …" — 15 Min.
- mDL-Teaser-Card im Profil-Tab Hero oder Kontakt-Sektion — 30 Min.

## Strukturelle Probleme (Redesign-Anforderung)

1. **IA: Sektion-Navigation nicht skalierbar** — 8 Sektionen = 2–3 Min Scroll-Marathon. Lösung: Tab-Leiste mit Section-Buttons (wie Posteingang-Kategorien) oder Sticky Sidebar auf Desktop.

2. **Hero-Funktion unklar**: Trust-Center oder Disclaimer-Sammelstelle? Spec § 3 sagt "Pilot-Phase-Badge + ARF v2.0 + Letzte Übermittlung", User Story fehlt: "Als Anna will ich in 3 Sekunden verstehen, was meine Daten bedeuten."

3. **Responsive auf 375px**: Sektionen werden Akkordeons, aber Sub-Tabs (Wallet) sind Text-Links. Bei mDL-Wallet unklar, ob mobile Nutzer das finden.

4. **Field-Card Density**: Badges + Wert + Buttons auf einer Zeile = visuelle Überladung. Entweder minimaler Badge-Stack oder 2-spaltig auf >768px.

## Was funktioniert und behalten werden muss

- **`<StammdatenSektion>` Pattern** (native `<details>`, semantic `<section aria-labelledby>`) — a11y-konform.
- **Modal-Pattern-Konsistenz**: Religion, Sperre, Punkte-Reauth, Wallet-Preview — alle focus-management + esc-close.
- **i18n-Wortlaut-Verifier-Locks** (verbatim-Banner, Hard-Line-Zitate) — nicht brechen.
- **Aktivitätsprotokoll-Filterung** (Richtung-Switch) — gut platziert.
- **mDL + mDL-Wallet-Isolation** (ISO_18013_5_MDL_TOGGLE_SET whitelist) — korrekt.
- **Altersvorsorge + KV/Pflege Sektionen** (Yellow-Letter-Echo, Anrechnungszeiten, ePA-Status) — keep as-is.

## Persona-spezifische Risiken

### Anna Petrov (§ 18g Blue-Card, viel im Pilot)
- mDL-Fahrerlaubnis (Klasse B, 2024). Wallet-Sub-Tab relevant → muss discoverable sein.
- ePA eingerichtet (2025-01-15), eRezept-App. KV-Sektion textreich.
- Keine KFZ-Halter → Mobilität nur FE + Punkte-on-demand. Übersichtlich.
- **Risiko**: Wallet-Innovation versteckt; Anna findet mDL nicht weil Sub-Tab unsichtbar.

### Markus Schmidt (Familie, Halter mit FE 2002, Pflichtumtausch)
- FE-Geburtsjahr 1968 → Stichtag 2033 (oder 2034) → Banner "frist_aktiv".
- **Risiko**: Banner unter aufgeklappter Mobilität-Sektion; collapsed → Markus sieht Pflichtumtausch nicht. Preview-Text fehlt.
- 4 KFZ als Halter → 4 KFZ-Halter-Karten + Lena (Ehefrau) + 1 Kind → Familie auch dicht. Ges. ~30 Felder.
- **Risiko**: Sperren-Sektion zeigt IBAN-Speculative; Markus könnte verwirrt sein (Badge hilft, aber nicht visible-first).

### Mehmet Yıldız (Selbstständig, Türk, eAT, Gewerbe geplant)
- eAT-CAN vorhanden → Art9-Badge sichtbar. Mehrere "nicht vorhanden"-Zustände.
- **Risiko**: Empty-States repetitiv. Track-C-Altersvorsorge zeigt "Sie haben keine Renteninformation … PKV-Bereich hat keinen zentralen Aggregator." Zu lang für Empty-State.
- Gewerbe-Notation in Beschäftigung verwirrend (readonly "Selbstständig" ohne Gewerbe-Nummer-Feld).

## Konkrete Files für Phase 6c frontend-coder

**Must-Fix (vor Release oder in Phase 5b koordiniert)**:
- `src/components/stammdaten/mobilitaet/UmzugBridgeBadge.tsx:46–51` — text-Farbe via `--color-warning-strong`
- `src/components/stammdaten/mobilitaet/PunkteEidReauthModal.tsx` — focus-restore on Esc
- `src/components/stammdaten/mobilitaet/FinMaskedSpan.tsx:51` + `FuehrerscheinHauptkarte.tsx` — `dir="ltr"`

**Should-Fix (Phase 6c)**:
- `src/components/stammdaten/StammdatenView.tsx` — In-Page-ToC / Section Jump Nav
- `src/components/stammdaten/mobilitaet/MobilitaetSektion.tsx` — preview-text for collapsed state
- `src/components/stammdaten/wallet/WalletMdlCard.tsx` + `StammdatenHero.tsx` — mDL teaser / banner
- `src/components/stammdaten/StammdatenView.tsx:442` — Hero reorder (Vision-Banner first)
- `src/components/stammdaten/StammdatenFieldCard.tsx:93–149` — responsive density

## Hard-Lines aus V1.0–V1.3 (NICHT brechen)

- Privacy-Disclaimer-Meta (Spec § 3): ARF v2.0 Wording, Lese-Schicht-Hinweise, § 3 BMG. Verbatim.
- ARF v2.0 Wording: "Datenschutzcockpit (Pilot-Phase)" Badge exakt.
- FAER on-demand TTL (HL-MOB-11): Punktestand niemals persistieren, nur 5 Min component-local.
- mDL-Attribute-closed-list (VL-9): nur ISO_18013_5_MDL_TOGGLE_SET.
- Halter-Adresse-ban-list (HL-MOB-13 + HL-MOB-14): Phrase "Halter-Adresse aktualisiert" und "automatische Synchronisierung" niemals.
- Block-D-wording (Spec § 11.19): Beschäftigung readonly.
- Wallet-Sub-Tab-Pattern (Hard-Line § 11.18): exakt 3 fixe Mock-Attestationen.
- Verifier-Locks (VL-6, VL-7, VL-8): PflichtumtauschBanner Render-Logic, mDL Vision-Banner auf Preview, TTL Countdown aria-live.

## Fazit

V1.3 **ist nicht Premium-but-Minimal**, weil:
- Information nicht hierarchisiert (Hero = Disclaimer-Wand).
- Navigation nicht skaliert (40+ Felder, 8 Sektionen, keine ToC/Tabs).
- Innovationen versteckt (mDL im Wallet-Tab hinter anderen Cards).
- Responsive Dichte (Field-Cards kanten mobile).

**Premium-but-Minimal-Ziel für Phase 6c**:
- Hero in 2 Sekunden: "Sie sind in 6 Registern. Letzte Abfrage 2h. Vollständiges Protokoll →"
- Section-Tabs oder Sidebar → direkter Zugriff auf Mobilität, KV, Altersvorsorge.
- mDL-Teaser im Hero oder Mobilität-Header.
- Field-Cards: Titel + Wert auf einer Zeile, Badges unter Wert oder auf Hover.
