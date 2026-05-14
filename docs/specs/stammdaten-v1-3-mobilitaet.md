---
feature: stammdaten-v1-3-mobilitaet
title: Stammdaten V1.3 — Mobilität-Sektion (Führerschein + KFZ-Halter)
status: shipped
date: 2026-05-13
author: product-architect
upstream:
  research: docs/research/2026-05-10-fuehrerschein-kfz.md (status: research-pending-domain-validation → consumed)
  domain:   docs/domain/fuehrerschein-kfz.md (verdict: VALIDATED-with-revisions; last_validated 2026-05-10)
  verify:   docs/reviews/2026-05-13-fuehrerschein-kfz-verify.md (verdict: PROCEED-with-Verifier-Locks; 14 VL)
inherits_from: docs/specs/stammdaten.md (V1, shipped 2026-05-10), docs/specs/stammdaten-v1-1-renten-kv.md (V1.1, shipped 2026-05-10), docs/specs/stammdaten-v1-1-kontakt-schicht.md (V1.2, shipped 2026-05-10 — file-naming-collision noted in CLAUDE.md; this V1.3 spec deliberately uses the correct ordinal)
ship_target: V1.3 horizontal-capability (next after V1.2 Kontakt-Schicht)
naming-verifier-locked: V1.3
schema-migration: V12→V13
verifier-locks-count: 14
hard-lines-count: 14
estimated_effort: ~5 working days (1 d Persona-Migration + behoerden + letters seed; 1.5 d Mobilität-Sektion + 9 components; 0.5 d Wallet-Sub-Tab mDL-Card; 0.5 d Block-D autopilot co-correction; 0.5 d i18n; 1 d Vitest + Playwright + a11y + idempotency-Tests)
owner_agents: [frontend-coder, mock-backend-coder, i18n-localizer, a11y-tester, code-reviewer]
---

> **Verhältnis zu V1 + V1.1 + V1.2**: Die geshippten Stammdaten-Capabilities
> bleiben unverändert in jedem Detail — Hero-Card, Aktivitätsprotokoll
> (jetzt 4 Kategorien × `richtung`-Filter), bestehende Sektionen Identität,
> Anschrift, Familie, Beschäftigung, Dokumente, Sperren & Einstellungen,
> Altersvorsorge, Krankenversicherung & Pflege, Kontakt & Postfach,
> Notification-Präferenzen (2027-Vision), Wallet-Sub-Tab. **V1.3 fügt eine
> neue Sektion „Mobilität (Führerschein + Fahrzeuge)"** zwischen
> „Krankenversicherung & Pflege" und „Kontakt & Postfach" ein und erweitert
> additiv: das `Persona`-Schema, das `Behoerde`-Schema (KBA + 3 FE-Behörden +
> 3 Zulassungsstellen), den `Letter`-Bestand (3 Mock-Briefe), den
> Norm-Zitat-Lookup, den Wallet-Sub-Tab (mDL-Mock-Attestation als zweite Card
> neben PID). Co-korrigiert wird in derselben Welle die Block-D-Strecke des
> Umzug-Autopilots (Wording-Bug aus V1 — siehe VL-14).

> **Verifier-Verhältnis**: Diese Spec übernimmt die 14 Verifier-Locks
> VL-1..VL-14 verbatim und übersetzt sie in 14 Hard-Lines HL-MOB-1..HL-MOB-14.
> Frontend-coder, mock-backend-coder und i18n-localizer dürfen an Hard-Lines
> und am Block-D-Co-Correction-Wording **nicht** umformulieren.

---

## 1. Geltungsbereich V1.3 + Verdict-Inheritance

### 1.1 Verdict-Zitat (verbatim)

> „**PROCEED — with 14 binding Verifier-Locks.** The combined research +
> domain output is the strongest pre-spec package this project has produced
> […]. The package is **ready for product-architect** subject to the
> Verifier-Locks below — these are not new revisions of upstream artefacts,
> they are spec-level constraints the architect must not drop. No upstream
> re-loops required."
>
> — `docs/reviews/2026-05-13-fuehrerschein-kfz-verify.md` § 1 TL;DR

### 1.2 Ziele V1.3

V1.3 macht **fünf** zusätzliche Sachverhalte sichtbar, die V1/V1.1/V1.2
nicht zeigen:

1. **Fahrerlaubnis** — FE-Nr (11-stellig, Bundesland-Buchstabe + Behörden-
   Code + lfd. + Prüfziffer + Ausfertigung), Klassen-Tabelle mit
   Schlüsselzahlen + Erteilungs-/Ablaufdatum, Pflichtumtausch-Frist-Banner
   (abgeleitet aus Geburtsjahr + Ausstellungsdatum nach Anlage 8a FeV).
2. **Punktestand — on-demand**. Niemals passive Anzeige. CTA → eID-Reauth-
   Modal (Pattern-Konsistenz zu V1-Religion + V1.1-Pflegegrad) → Mock-Result
   mit Stand-Stempel + TTL ≤ 5 min in-memory + Activity-Log-Eintrag
   `kfz_faer_punkte_pulled`. § 30 Abs. 8 + § 30a StVG.
3. **KFZ-Halter** — Liste eigener Halter-Karten je Persona; FIN masked-by-
   default (letzte 4 Stellen sichtbar; voll on-click); Kennzeichen,
   Marke/Modell, HU-Datum, eVB-Status; **Halter-Adresse-FieldCard** mit
   Übergangs-Badge bei Umzug-Bridge.
4. **Umzug → Mobilität Bridge** — bei einem laufenden/abgeschlossenen
   Umzug-Vorgang rendert die Halter-Adresse-FieldCard einen Übergangs-Badge
   („Adressänderung über Umzug-Vorgang ausgelöst — Bestätigung der
   Zulassungsstelle steht aus") + Activity-Log-Eintrag
   `kfz_halter_adresse_prefilled_via_umzug`. Block-D-Wording in
   `autopilot/umzug.ts` wird **im selben Ship** korrigiert (VL-14).
5. **Wallet-Sub-Tab mDL-Erweiterung** — eine zweite Mock-Attestation-Card
   neben PID mit Selective-Disclosure-Toggles aus dem geschlossenen
   ISO/IEC 18013-5 Annex-B-Set + 2029/2031-Vision-Banner. **Architect-
   Entscheidung OQ-4**: ship in V1.3 (siehe § 1.5).

### 1.3 Nicht-Ziele V1.3 (kurzfristig)

Siehe § 12. Knapp: keine FE-Maßnahmen-Aggregation (Ermahnung, Verwarnung,
MPU, Entziehung), keine BSG-Punkte-Tilgungs-Wizard, kein Halter-Wechsel-
Vorgang, keine echte i-Kfz-Integration, keine ZFER/FAER/ZFZR-API-Anbindung,
keine echte mDL-Issuance.

### 1.4 14 Verifier-Locks VL-1..VL-14 (verbatim)

> Verbatim aus `docs/reviews/2026-05-13-fuehrerschein-kfz-verify.md` § 6.
> Diese 14 Locks sind die binding constraints; jede downstream Implementierung
> wird gegen sie auditiert.

- **VL-1.** Domain-expert HL-V1.1-1 .. HL-V1.1-9 inherited verbatim as
  HL-MOB-1 .. HL-MOB-9. → § 11.1–§ 11.9 dieser Spec.
- **VL-2.** § 15 FZV Frist-Wording: „unverzüglich (i.d.R. innerhalb einer
  Woche)". CI-grep denies `\b7[- ]Tage[- ]?Frist\b`, `\bFrist\s+7\s+Tage\b`
  across all locales + autopilot step-texts + Mock-Briefe. → § 7, § 13.
- **VL-3.** `normZitatLookup`-extension unit test enumerates: §§ 4, 28, 29,
  30, 30 Abs. 8, 30a, 48, 48 Abs. 2, 65 StVG; §§ 47, 73 FeV; §§ 15, 57, 60
  FZV (2023); § 6 Abs. 7 FeV + Anlage 8a; § 4 IDNrG; RL (EU) 2025/2205.
  Includes **negative-assertions** that `§ 13 FZV` does not resolve to
  „Mitteilungspflicht" and `§ 32 FZV` does not resolve to „Halterdaten-
  Speicherung". → § 8.
- **VL-4.** Persistence-migration V1.2→V1.3 unit test asserts: (a) no
  `persona.mobilitaet.punkte` field exists in the migrated schema; (b) the
  migration is idempotent (run twice = same result). → § 5.1, § 13.
- **VL-5.** `behoerden.json` unit test: every entry matching
  `/Fahrerlaubnis|Fahrerlaubnisstelle|Zulassungsstelle|Kfz-Zulassung/i` has
  `kategorie === 'kommune'`; KBA entries have `kategorie === 'bund'`.
  → § 5.4, § 13.
- **VL-6.** Pflichtumtausch-Banner renders only when `geburtsjahr &&
  ausstellungsdatum` are both known (HL-MOB-6 enforcement); else stiller
  Hinweis. → § 4.3, § 6, § 11.6.
- **VL-7.** mDL-Vision-Banner uses `stammdaten.disclaimer.eudi_mdl_speculative`
  (verbatim from domain doc) and appears on: WalletMdlAttestationPreviewModal
  header, Wallet-Sub-Tab mDL-Card row, any Hero/Sektion-Header that mentions
  „mDL" or „mobiler Führerschein". Naming distinct from V1 `2027_vision`-pill;
  mDL needs `2029_vision` or `2031_default_vision` semantic — NOT
  `2027_vision`. → § 4.6, § 7.
- **VL-8.** Punktestand on-demand-only: component-local state, TTL ≤ 5 min,
  never written to `localStorage`. Activity-Log gets one entry per pull:
  `kfz_faer_punkte_pulled` with timestamp + result-snapshot (number, not
  „Punktestand"-string). → § 4.4, § 6, § 11.8.
- **VL-9.** WalletMdlAttestationPreviewModal Selective-Disclosure-Toggles
  closed-enum from ISO/IEC 18013-5 Annex B only. Forbidden toggles:
  „Punktezahl", „Bezirk der FE-Behörde", „MPU-Status", „Schlüsselzahl 95
  separat von übrigen Schlüsselzahlen", „FAER-Eintragungen". Unit test
  asserts the toggle-enum equals the ISO-allowed set. → § 4.6, § 5.5, § 13.
- **VL-10.** **NO `<FeNrSpeculativePushModal>`.** FE-Nr is read-only,
  Korrekturweg via kommunale FE-Behörde. The IBAN-Speculative-Push-Pattern
  is not reused for ZFER/ZFZR-Identifier. → § 4.2, § 11.10.
- **VL-11.** Mehmet persona keeps the eAT-§-21-AufenthG + eID-aktiviert hook
  for i-Kfz-Stufe-4-Demo-Fluss. → § 2.3, § 11.11.
- **VL-12.** Familie Schmidt = single-Halter (Vater) + Mutter als
  „Mitnutzerin, rechtlich kein Halter". UI pattern: one HalterCard, one
  MitnutzerinPill with disclaimer-Text „§ 15 FZV-Mitteilungspflicht trifft
  nur den Halter". → § 2.2, § 4.5, § 11.12.
- **VL-13.** Block-D Bridge UI strings: Übergangs-Badge
  `stammdaten.field_card.halter_adresse.uebergangs_badge_via_umzug`
  („Adressänderung über Umzug-Vorgang ausgelöst — Bestätigung der
  Zulassungsstelle steht aus"); Activity-Log note key
  `stammdaten.aktivitaet.note.kfz_halter_adresse_prefilled_via_umzug`.
  **Forbidden** strings in any locale/Mock-Brief/autopilot-step: case-
  insensitive `Halter[-_ ]?Adresse[-_ ]?aktualisiert`, `synchronisiert`,
  `automatische[r]? Synchron`. Lint via grep-deny in CI. → § 7, § 9, § 13.
- **VL-14.** Co-correction wave: in this same V1.3 ship,
  `src/lib/mock-backend/autopilot/umzug.ts` Block-D step-texts AND the
  de.json/en.json/ru.json/uk.json/ar.json/tr.json existing Block-D strings
  get rewritten away from „§ 32 FZV" + „automatische Synchronisierung" →
  „§ 15 FZV" + „Pre-Fill der i-Kfz-Adressänderung". This is NOT a V1.3.1
  followup; it ships with V1.3 because the Mobilität-Sektion surfaces the
  effect. → § 9, § 14.

### 1.5 Open Questions OQ-1..OQ-5 — Architect-Resolutions

> Verbatim aus Verifier § 4. Architect resolves each here. Downstream coders
> use these answers; do not re-litigate.

#### OQ-1 (blocking) — Anna's citizenship

**Verifier-Frage**: Domain doc says „EU-Bürgerin"; `personas.json` likely
non-EU.

**Architect-Resolution**: `personas.json` ist source-of-truth. Anna ist dort
`staatsangehoerigkeit: "russisch"`, geboren in Sofia (BG, EU), mit
**§ 18g AufenthG (Blue Card EU für Fachkräfte)**, gültig bis 2027-09-14
(`personas.json` Zeile 51–56). Domain-doc + Research-Scout sagten beide
fälschlich „EU-Bürgerin"; das ist ein research→domain Copy-Paste-Bug.

**V1.3-Persona-Snapshot Anna** wird daher als **Drittstaatsangehörige mit
Aufenthaltstitel § 18g AufenthG (Blue Card EU)** geframt — *nicht* als
EU-Bürgerin, *nicht* als § 24 AufenthG (auch das ist falsch — § 24 ist
vorübergehender Schutz, Anna hat Blue Card EU als hochqualifizierte
Fachkraft). Die FE-Klasse-B-Umschreibung 2018→2024 St. Petersburg→Berlin
funktioniert unter Anlage 11 FeV (Reziprozität nach **Land der Ausstellung
des FS**, nicht nach Staatsangehörigkeit); Wording im UI-Text bleibt damit
korrekt. i18n-Disclaimer-Text der Anna-FE-Card erwähnt diese Kategorisierung
**nicht** (kein Bedarf); persona-prose in `personas.json` bleibt unverändert
(`russisch` + `§ 18g AufenthG`).

→ siehe § 2.1 Persona-Snapshot Anna für die V1.3-Mobilität-Werte.

#### OQ-2 — Mindestens eine Persona ohne FE?

**Verifier-Frage**: Wegweiser-Honesty-Demo „App weiß, wann sie nichts zeigen
darf".

**Architect-Resolution**: **Ja — Mutter Schmidt (Lena Schmidt)**. Sie wird
in der Mobilität-Sektion explizit als **„keine eigene Fahrerlaubnis im
Profil hinterlegt — Sie können dies bei Ihrer Fahrerlaubnisbehörde
prüfen"-Empty-State** gerendert; zusätzlich als **Mitnutzerin** des
Familien-PKW über den Halter-Vater (VL-12). Die Halter-Beziehung Vater
bleibt unverändert; Lena ist als Mitnutzerin-Pill in der Vater-Halter-Card
sichtbar. (V1.2 hat Lena `kfz_halter: true` gesetzt — V1.3 *korrigiert*
das im Seed auf `kfz_halter: false`, weil VL-12 verbietet, zwei Halter pro
Fahrzeug zu führen; semantisch gehört das Familienauto Markus, Lena nutzt
mit. Persona-Migration § 5.1 bügelt das idempotent aus.)

Zweite Empty-State-Konstellation: **Felix Schmidt (geb. 2022-01-15, 4 J.)**
hat noch keinen FE — wird in der Mobilität-Sektion nicht eigens angezeigt
(Kinder sind in V1.0/V1.1/V1.2/V1.3 keine eigene Mobilität-Sektion-
Persona-Spalte). Der 16-jährige Schmidt-Kind-Hook aus dem Verifier-Brief
existiert nicht in der V1.2-Persona-Tabelle (Schmidt hat 2 Kinder geboren
2022 + 2024) — Architect verzichtet auf Synthetisches Hinzufügen eines
16-jährigen, weil das den V1.2-Persona-Bestand brechen würde.

→ siehe § 2.2 Persona-Snapshot Schmidt.

#### OQ-3 — Mehmet FAER-Punktestand-Mock-Wert: 0 oder 1?

**Verifier-Frage**: „1 P. seit 2024" vs. „0 P." — risk-vs-illustration.

**Architect-Resolution**: **1 Punkt**. Begründung: ein „0 P."-Result ist
demo-langweilig und legt den Punkte-on-demand-CTA nahe als „macht nix";
1 P. illustriert die Datenkategorie ohne Mehmet stigmatisierend zu rahmen
(1 P. = einfache Ordnungswidrigkeit, sehr alltäglich, kein Maßnahmen-
Schwellwert). Im Result-Card-Text steht keine Tat-Beschreibung; nur
„1 Punkt im Fahreignungsregister, Stand TT.MM.JJJJ HH:MM, gilt 5 Minuten".
Anna + Schmidt-Vater bleiben bei `0 P.` (Demo-Vergleichs-Anker).

#### OQ-4 — WalletMdl in V1.3 oder V1.3.1?

**Verifier-Frage**: Time-Budget; mDL kann in V1.3.1 verschoben werden.

**Architect-Resolution**: **Ship in V1.3**. Begründung:

- Die mDL-Mock-Attestation ist die *einzige* Stelle, an der V1.3 den
  2029-2031-Zeithorizont mit `eudi_mdl_speculative`-Disclaimer-Banner
  konkret macht — ohne sie bleibt das Geltungsbereichs-Argument (V1.3 als
  Brücke zwischen i-Kfz-Realität und EU-mDL-Vision) im Spec-Text hängen.
- Selective-Disclosure-Toggles sind closed-enum (VL-9) — Aufwand für den
  Toggle-State-Container ist niedrig, weil die Logik nicht-mutating und
  pure-display ist (kein Backend-Schreibpfad, kein Persistenz-Bucket).
- Wallet-Sub-Tab hat schon den PID-Mock-Pattern in V1 (gem. § 11.18
  V1-Spec) — wir erweitern die existierende Struktur additiv.

Aufwand-Risk (siehe § 1.6) bleibt im 5-Tage-Rahmen.

#### OQ-5 — Wallet-Sub-Tab: Child der Mobilität-Sektion oder eigener Top-Level-Sub-Tab?

**Verifier-Frage**: Domain-doc impliziert eigener Top-Level-Sub-Tab.

**Architect-Resolution**: **Eigener Top-Level-Sub-Tab — bestehender V1
Wallet-Sub-Tab erhält additiv eine zweite Card (mDL)**. Begründung:

- V1 hat den Wallet-Sub-Tab als top-level Sub-Tab unter „Stammdaten"
  etabliert (V1-Spec § 11.18). Die mDL-Mock-Attestation ist semantisch ein
  Wallet-Artefakt (selective-disclosure-fähig, kryptografisch-attestiert,
  ISO/IEC 18013-5), nicht ein „Mobilitäts-Datenfeld" — sie gehört wallet-
  seitig.
- Die **Mobilität-Sektion** kreuz-verlinkt zu „mDL im Wallet ansehen" als
  CTA — keine Card-Duplizierung. Cross-Ref-Pattern erbt von V1.2
  Postanschrift-Cross-Ref-Card (`<PostanschriftCrossRefCard>`).
- Vorteil: Pattern-Konsistenz im Sub-Tab; ein einziger Render-Pfad für
  Wallet-Cards, ein einziger Selective-Disclosure-Visualisierungs-Pattern.

### 1.6 Aufwand-Schätzung

| Tag | Aufwand |
|---|---|
| 1 | Persona-Migration V12→V13; behoerden.json 7 neue Entries; letters.json 3 neue Mock-Briefe; norm-zitat-Lookup-Extension |
| 1.5 | `<MobilitaetSektion>` + 9 neue Components (FE + Klassen + Pflichtumtausch + Punkte-CTA + Halter + Mitnutzer + Übergangs-Badge + Korrekturweg-CTA-Modal) |
| 0.5 | Wallet-Sub-Tab mDL-Card-Erweiterung + `<WalletMdlAttestationPreviewModal>` |
| 0.5 | Block-D-Co-Correction (`autopilot/umzug.ts` + i18n keys + tests) |
| 0.5 | i18n (~95 Keys × 6 Locales = ~570 Strings) |
| 1 | Vitest (Persistence-Migration-VL-4 + Behoerden-Kategorie-VL-5 + Norm-Zitate-VL-3 + ISO-Toggle-VL-9 + Pflichtumtausch-Lookup-VL-6 + FE-Nr-Format-Validator + FAER-TTL-VL-8 + Block-D-Wording-Ban-VL-13 + VL-14); Playwright (Pflichtumtausch-Banner-Render + Punkte-eID-Reauth + Korrekturweg-CTA-Modal + Block-D-Übergangs-Badge + a11y axe pro Persona × Sektion) |

---

## 2. Personas Snapshot V1.3

> V1 + V1.1 + V1.2 Persona-Daten bleiben unverändert; V1.3 ergänzt einen
> additiven `mobilitaet`-Block (siehe § 5.1). Persona-Snapshots unten zeigen
> nur die V1.3-relevanten Felder.

### 2.1 Anna Petrov (geb. 1997-03-22, Berlin)

- **Staatsangehörigkeit / Aufenthalt**: russisch, § 18g AufenthG Blue Card
  EU (gültig bis 2027-09-14, `personas.json` source-of-truth) — **nicht**
  EU-Bürgerin (OQ-1). FE-Klasse-B-Umschreibung 2018→2024 funktioniert
  unter Anlage 11 FeV reziprok nach **Land der Ausstellung** (Russische
  Föderation als EU-anerkennungs-fähiges Drittland nach Anlage 11), nicht
  nach Staatsangehörigkeit.
- **FE-Nr**: `[MOCK] B0727RRE2I50`
  - Format-Validierung: Pos. 1 `B` = Bayern? **Nein — neu vergeben durch
    Berlin-Umschreibung 2024**; Pos. 1 für Berlin ist nach FS-VwV alphabetisch
    der Buchstabe **F** (Berlin = 6. Bundesland alphabetisch nach „Bayern,
    Bayern, Berlin"). Domain-Doc-Beispiel war hier inkonsistent (B0727
    ≠ Berlin). **Architect-Korrektur**: Anna-FE-Nr wird auf
    `[MOCK] F0727RRE2I50` umgestellt (Bundesland-Buchstabe F = Berlin,
    Behörden-Code 072 LABO Berlin, lfd. RRE2I, Prüfziffer 5, Ausfertigung 0).
  - Mock-Marker: `[MOCK]`-Prefix.
- **Klassen**: Klasse B (Erteilung-Datum in DE: 2024-03-18 via Anerkennungs-
  Verfahren; Ursprungs-Datum 2018-07-04 St. Petersburg).
- **Ausstellungsjahr** (deutsche Karte): 2024 → Pflichtumtausch-Stichtag
  nicht relevant (Anlage 8a FeV-Tabelle endet bei Ausstellungsjahr 2012-2013;
  ab 2014 EU-konforme Karte mit eigenständigem 15-Jahre-Rhythmus für Klasse
  B/AM/L/T nach § 6 Abs. 7 FeV). Pflichtumtausch-Banner: **kein Render**.
- **Punktestand-on-demand-Mock**: 0 P. (Demo-Vergleichs-Anker).
- **Halter-Status**: ja (PKW). `personas.json` V1.0 zeigte `kfz_halter:
  false` — V1.3 *flipt* Anna auf `kfz_halter: true` im Persona-Seed, weil
  der Verifier-Brief Anna mit eigenem PKW vorschlägt und die Block-D-Bridge
  sonst auf Anna nicht greift. Mehmet, Schmidt-Vater + Anna = drei Halter
  für den Demo.
  - Wenn der Persona-Coder den `kfz_halter`-Flip vermeiden will: Anna bleibt
    Mitnutzerin (kein eigener Halter) und Block-D-Bridge wird über Schmidt
    demonstriert. **Default-Architect-Entscheidung**: Anna bekommt einen
    eigenen PKW (`kfz_halter: true`), weil die Berlin-Umzugs-Bridge-Story
    persona-konsistent damit ist; Anna war schon V1.0-Hero der Umzugs-
    Cascade.
- **FIN-Mock (masked)**: `WAUZZZ•••••••3456` (voll on-click:
  `[MOCK] WAUZZZF40MA123456`, VW-Touareg-WMI — Anna fährt synthetisch einen
  VW Polo, BJ 2019; FIN ist illustrativ).
- **Kennzeichen**: `[MOCK] B-AP 4711`.
- **HU-Datum**: 2026-06-30 (in den nächsten 6 Wochen — Frist-Banner-Hook).
- **eVB-Nummer**: `[MOCK] AX21Q8L`.
- **Halter-Adresse** (vor Umzug): `[MOCK] Skalitzer Str. 88, 10997 Berlin`;
  *aktuelle* Adresse aus V1-Persona Anna ist `personas.json` Zeile 42–48
  „Friedrichstraße 100, 10117 Berlin" — die Block-D-Bridge entsteht hier
  (= Umzugs-Stichtag → Halter-Adresse muss nachgezogen werden über
  i-Kfz Stufe 4).
- **Aktenzeichen FE-Behörde**: `[MOCK] LABO-FE/2024-03-002831` (LABO Berlin,
  Anerkennung 2024).
- **Aktenzeichen Zulassungsstelle**: `[MOCK] LABO-KFZ/2024-09-104221`
  (Zulassung Anna-PKW).
- **mDL-Attestation**: noch nicht ausgestellt — Default-State (2029-Vision).

### 2.2 Familie Schmidt — Markus Schmidt + Lena Schmidt (Hamburg)

**Achtung**: V1.0–V1.2-Persona-Bestand setzt Schmidt nach **Hamburg**
(Eppendorfer Weg 212, 20251 Hamburg), nicht München (Verifier-Brief sagte
München — das ist eine Domain-Doc-Drift). V1.3 hält am Hamburg-Bestand fest
und passt FE-/Halter-Daten entsprechend an: **FE-Behörde = Landesbetrieb
Verkehr Hamburg (LBV)**, **Zulassungsstelle = LBV Hamburg KFZ-Zulassung**.

#### 2.2.1 Markus Schmidt (geb. 1988-02-14, Hamburg) — **Pflichtumtausch-Wow**

- **FE-Nr**: `[MOCK] J0512SCH08X1` (J = Hamburg nach FS-VwV-Alphabet, Behörden-
  Code 051, lfd. SCH08, Prüf X, Ausf. 1). Domain-Doc nannte `B…` für Bayern,
  was bei Hamburg-Persona nicht passt — Architect-Korrektur auf `J…`.
- **Klassen**: B (seit 2002-09-17, 17. Geburtstag) — **Pflichtumtausch-
  Stichtag 19.01.2027** (Anlage 8a FeV-Tabelle: „Ausstellung 2002-2004 ⇒
  bis 19.01.2027"). + BE (Anhänger, seit 2010-04-22).
- **Ausstellungsjahr** (deutsche Karte, EU-Karte ab 2013): 2002 = vor 2013,
  daher *aktuelle Karte* ist die Pflichtumtausch-Frist-relevante Karte
  (Plastik-Vorgänger-Format).
- **Pflichtumtausch-Banner**: **aktiv**. Frist 19.01.2027; Demo-Frist
  ~8 Monate (heute = 2026-05-13). CTA: „Termin bei Fahrerlaubnisbehörde
  Landesbetrieb Verkehr Hamburg (LBV)".
- **Punktestand-on-demand-Mock**: 0 P.
- **Halter-Status**: ja, einziger Halter (VL-12). Lena = Mitnutzerin.
- **FIN-Mock (masked)**: `WVWZZZ•••••••8842` (voll: `[MOCK] WVWZZZ16MA0028842`,
  VW Touran 2021).
- **Kennzeichen**: `[MOCK] HH-SC 142` (Hamburg-Unterscheidungszeichen HH).
- **HU-Datum**: 2027-09-15.
- **eVB-Nummer**: `[MOCK] VB47K3M`.
- **Halter-Adresse**: `[MOCK] Eppendorfer Weg 212, 20251 Hamburg` (=
  V1-Persona-Anschrift). Schmidt zieht in V1.3 **nicht** um → keine
  Block-D-Bridge auf Schmidt (Anna trägt den Bridge-Demo). Halter-Adresse-
  Card zeigt Sync-Status „bekannt — keine offene Mitteilung nach § 15 FZV".
- **Aktenzeichen FE-Behörde**: `[MOCK] LBV-HH-FE/2002-09-XXXXX`.
- **Aktenzeichen Zulassungsstelle**: `[MOCK] LBV-HH-KFZ/2021-04-08842`.

#### 2.2.2 Lena Schmidt (geb. 1991-06-30) — **FE-Empty-State + Mitnutzerin-Pill** (OQ-2)

- **FE-Status**: **kein FE im Profil hinterlegt** → Empty-State-Card rendert
  in der Mobilität-Sektion „Sie haben keine Fahrerlaubnis im Profil
  hinterlegt — Sie können dies bei Ihrer Fahrerlaubnisbehörde (Landesbetrieb
  Verkehr Hamburg) prüfen oder eine bereits bestehende FE über die KBA-ZFER-
  Selbstauskunft (§ 30 StVG) in das Profil einlesen lassen." (Demo-honesty:
  Lena könnte einen FE haben, aber V1.3 weiß es nicht — Empty-State macht
  die Lücke sichtbar.)
- **Halter-Status**: **nein** (VL-12-Korrektur: V1.2-Seed hatte
  `kfz_halter: true` für Lena → V1.3 stellt auf `false` um). Lena erscheint
  in der Markus-Halter-Card als **Mitnutzerin-Pill** „Lena Schmidt — rechtlich
  kein Halter, § 15 FZV-Mitteilungspflicht trifft nur den Halter".
- **Punktestand-on-demand-Mock**: n/a (kein FE → Punktestand-CTA bleibt
  ausgegraut mit Tooltip „erfordert Fahrerlaubnis im Profil").
- **mDL-Attestation**: nicht ausgestellt.

#### 2.2.3 Felix Schmidt (geb. 2022-01-15) + Hannah Schmidt (geb. 2024-08-09)

Kinder; in Mobilität-Sektion **nicht eigens** dargestellt (Kinder-Mobilität
ist out-of-scope V1.3).

### 2.3 Mehmet Yıldız (geb. 1990-09-04, Köln) — **i-Kfz-Stufe-4-Wow + Pflichtumtausch-Vergangen-Stand-Erfolg**

- **Staatsangehörigkeit / Aufenthalt**: türkisch, § 21 AufenthG (Selbst-
  ständige Tätigkeit), gültig bis 2027-08-31 (`personas.json` Zeile 366–371).
- **eAT-CAN**: `[MOCK] T0123456X`; **eID-aktiviert: ja** (eAT-eID-PIN gesetzt
  + AusweisApp-Kompatibilität — **Hard-Lock per VL-11**). Mehmet kann
  i-Kfz Stufe 4 nutzen.
- **FE-Nr**: `[MOCK] N0428MEH47K2` (N = Nordrhein-Westfalen nach FS-VwV-
  Alphabet, Behörden-Code 042 Stadt Köln-Innenstadt, lfd. MEH47, Prüf 4,
  Ausf. 2 = 2× Ersatz wg. Verlust 2019/2022). Domain-Doc nannte `L0428…`;
  L = Sachsen-Anhalt nach FS-VwV — Architect-Korrektur auf `N…`.
- **Klassen**: B (seit 2010-11-15), C1 (seit 2015-06-08, gewerblich,
  Ablauf 2030-01-19, Schlüsselzahl 95 für BKrFQG-Modul mit 5-Jahre-
  Erneuerung), B+E (seit 2015-06-08 als Folge von C1).
- **Ausstellungsjahr**: 2010 (EU-Karte vor 19.01.2013 → Pflichtumtausch-
  Stichtag relevant gewesen).
- **Pflichtumtausch-Status**: **abgelaufen + erledigt** — Mehmet hat seinen
  Klasse-B-FE am 2025-01-14 (5 Tage vor Stichtag 19.01.2025) umgetauscht
  (Erfolgs-Persona-Variante per Domain-Doc-Empfehlung). FE-Card zeigt
  Pflichtumtausch-Banner-Variante **„Umtausch erfolgt am 14.01.2025"** als
  Success-Pill, *nicht* als Frist-Warnung.
- **Punktestand-on-demand-Mock**: **1 P.** (OQ-3-Resolution).
- **Halter-Status**: ja, zwei Fahrzeuge.
  - PKW privat: Kennzeichen `[MOCK] K-VR 8088E` (E-Suffix = Elektrokenn-
    zeichen), Hyundai Kona Elektro 2024, FIN masked `KMHK•••••••••0742`
    (voll: `[MOCK] KMHKM81GFNU440742`).
  - Liefer-Transporter (gewerblich): `[MOCK] K-MY 4711`, Mercedes Sprinter
    BJ 2019, FIN masked `WDB9•••••••••8123` (voll:
    `[MOCK] WDB9061331R348123`).
- **HU-Datum**: PKW 2027-04-20; Transporter 2026-11-15.
- **eVB-Nummern**: `[MOCK] AX99H1L` (PKW); `[MOCK] HV21M8K` (Transporter).
- **Halter-Adresse**: `[MOCK] Venloer Straße 388, 50825 Köln` (=
  V1-Persona-Anschrift). Mehmet zieht **nicht** um → keine Block-D-Bridge
  auf Mehmet; aber Mehmet ist der **i-Kfz-Stufe-4-Demo-Hook** (sekundäre
  Demo-CTA „Halter-Adressänderung via i-Kfz starten" — Wegweiser auf
  KVR/Stadt-Köln-Portal mit Disclaimer „in Köln 2026 Stufe 4 noch nicht
  produktiv verfügbar").
- **Aktenzeichen FE-Behörde**: `[MOCK] STADT-K/STR-FE-2025-01-002831`
  (Umtausch-Vorgang 2025).
- **Aktenzeichen Zulassungsstelle**: `[MOCK] STADT-K/STR-KFZ-2024-09-211487`
  (PKW); `[MOCK] STADT-K/STR-KFZ-2019-03-118099` (Transporter).
- **mDL-Attestation**: nicht ausgestellt; **Wallet-Sub-Tab-Mock zeigt für
  Mehmet die Vision-Banner-Variante mit Disclaimer „mDL-Ausstellung durch
  KBA voraussichtlich ab ~2031 nach RL (EU) 2025/2205 Art. 5(7) Implementing
  Act"** — sekundäre Wow-Beat (nicht im 30-Sek-Loom-Lead).

---

## 3. Screen-by-screen flow

V1.3 berührt drei Routes: `/stammdaten` (Default-Tab „Mein Profil" mit neuer
8. Sektion), `/stammdaten` Sub-Tab „Wallet & Externe Empfänger" (additive
zweite mDL-Card), und indirekt `/posteingang` (3 neue Mock-Briefe; keine
neue UI-Strecke).

### 3.1 Screen: Stammdaten Hauptseite — neue Sektion „Mobilität"

- **Route**: `/stammdaten` (Default-Tab „Mein Profil"; unverändert)
- **File**: `src/app/(app)/stammdaten/page.tsx` (existing — EXTEND um
  Sektion-Render)
- **Server or client**: RSC für initial Fetch + Render; Picker, Modale,
  Punkte-CTA, mDL-Cross-Ref-Link sind `'use client'`
- **Layout** (ASCII):

```
┌───────────────────────────────────────────────────────────────────┐
│  ▌Stammdaten                              [Mein Profil] [Wallet]  │
│  ┌─ Hero-Card (V1) ───────────────────────────────────────────┐   │
│  │  Datenschutzcockpit · Aktivitätsprotokoll (4 Kategorien)   │   │
│  └────────────────────────────────────────────────────────────┘   │
│  ▼ 1. Identität (V1)                                              │
│  ▶ 2. Anschrift (V1)                                              │
│  ▶ 3. Familie (V1)                                                │
│  ▶ 4. Beschäftigung (V1)                                          │
│  ▶ 5. Altersvorsorge (V1.1)                                       │
│  ▶ 6. Krankenversicherung & Pflege (V1.1)                         │
│                                                                   │
│  ▼ 7. Mobilität (Führerschein + Fahrzeuge)   ← NEU V1.3           │
│  ┌─ Disclaimer-Card: Lese-Schicht-Mobilität ────────────────┐     │
│  │  Diese App ist auch für die Mobilitäts-Sektion eine      │     │
│  │  Lese- und Wegweiser-Schicht … § 48 Abs. 2 StVG / § 73   │     │
│  │  FeV …                                                   │     │
│  └─────────────────────────────────────────────────────────┘     │
│                                                                   │
│  ── Fahrerlaubnis ───────────────────────────────────────────     │
│  ┌─ Fahrerlaubnis-Hauptkarte ───────────────────────────────┐    │
│  │  FE-Nr [MOCK] F0727RRE2I50 (read-only)                   │    │
│  │  Behörde: LABO Berlin — Abt. III Fahrerlaubnis           │    │
│  │  [Korrekturweg → kommunale FE-Behörde]                   │    │
│  └─────────────────────────────────────────────────────────┘    │
│  ┌─ Klassen + Schlüsselzahlen (collapsed default) ──────────┐    │
│  │  Klasse B  · Erteilt 2024-03-18 · gültig unbefristet     │    │
│  │  ▼ Schlüsselzahlen (Tooltip)                             │    │
│  └─────────────────────────────────────────────────────────┘    │
│  ┌─ Pflichtumtausch-Banner (conditional VL-6) ──────────────┐    │
│  │  Anna: kein Render · Schmidt-Vater: Frist 19.01.2027 ★   │    │
│  │  Mehmet: Success-Pill „Umtausch erfolgt 14.01.2025"      │    │
│  └─────────────────────────────────────────────────────────┘    │
│  ┌─ Punktestand on-demand (Card-Stub) ──────────────────────┐    │
│  │  [Punktestand abrufen (eID-Reauth)]                      │    │
│  │  → öffnet PunkteEidReauthModal                           │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                   │
│  ── KFZ-Halter ──────────────────────────────────────────────    │
│  ┌─ Halter-Karte (eine pro Fahrzeug) ───────────────────────┐    │
│  │  Kennzeichen [MOCK] B-AP 4711 · VW Polo · BJ 2019        │    │
│  │  FIN WAUZZZ•••••••3456 [klicken für volle Anzeige]       │    │
│  │  HU bis 30.06.2026 · eVB [MOCK] AX21Q8L                  │    │
│  └─────────────────────────────────────────────────────────┘    │
│  ┌─ Halter-Adresse-FieldCard (mit Übergangs-Badge — Bridge)─┐    │
│  │  Skalitzer Str. 88, 10997 Berlin                         │    │
│  │  ⚠ Adressänderung über Umzug-Vorgang ausgelöst —         │    │
│  │     Bestätigung der Zulassungsstelle steht aus           │    │
│  │  Disclaimer-Marker: kfz_halter_adresse_speculative       │    │
│  └─────────────────────────────────────────────────────────┘    │
│  ┌─ Mitnutzer-Pill (für Schmidt) ───────────────────────────┐    │
│  │  Lena Schmidt — Mitnutzerin · rechtlich kein Halter      │    │
│  │  § 15 FZV-Mitteilungspflicht trifft nur den Halter       │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                   │
│  ── Wallet-Kreuzverweis ────────────────────────────────────     │
│  ┌─ Cross-Ref „mDL im Wallet ansehen" ──────────────────────┐    │
│  │  → Sub-Tab „Wallet & Externe Empfänger" · mDL (2029-V.)  │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                   │
│  ▶ 8. Kontakt & Postfach (V1.2)                                   │
│  ▶ 9. Notification-Präferenzen (2027-Vision) (V1.2)               │
│  ▶ 10. Dokumente (V1)                                             │
│  ▶ 11. Sperren & Einstellungen (V1)                               │
└───────────────────────────────────────────────────────────────────┘
```

Sektion-Reihenfolge: V1.3 fügt **„Mobilität"** zwischen „Krankenversicherung
& Pflege" (V1.1, ID `krankenversicherung_pflege`) und „Kontakt & Postfach"
(V1.2, ID `kontakt_postfach`) ein. Die Sektion-ID ist `mobilitaet`; der
Section-Anchor ist `#mobilitaet`. Heading-Level `<h2>` (V1-Pattern; Hard-
Line § 11.5 V1 reuse: einmaliges sr-only `<h2 class="sr-only">Sektionen</h2>`
über der Sektionen-Liste, dann pro Sektion `<h2>`).

- **Default-State**: Sektion **default-zugeklappt** im V1-Pattern (Sektion-
  Header sichtbar + chevron). Expand öffnet die Disclaimer-Card + die
  Cards-Reihe. (Ausnahme: V1.2-Notification-Sektion ist default-expanded —
  V1.3-Mobilität folgt **nicht** dem Notification-Sonderfall.)
- **Components used** (siehe § 4 für Pfade):
  - `<MobilitaetSektion>` (NEW) — Wrapper auf `<StammdatenSektion>` (V1
    reuse)
  - `<FuehrerscheinHauptkarte>` (NEW)
  - `<FuehrerscheinKlassenList>` (NEW)
  - `<PflichtumtauschBanner>` (NEW) — conditional Render nach VL-6
  - `<PunktestandOnDemandCard>` (NEW) — Stub-Card mit CTA
  - `<KfzHalterKarte>` (NEW) — 1× pro Fahrzeug
  - `<HalterAdresseFieldCard>` (NEW)
  - `<UmzugBridgeBadge>` (NEW) — innerhalb von `<HalterAdresseFieldCard>`
  - `<KfzMitnutzerPill>` (NEW) — innerhalb von Halter-Card bei
    Schmidt-Persona
  - `<KorrekturwegFeBehoerdeCTA>` (NEW)
  - `<WalletMdlCrossRefLink>` (NEW) — Cross-Ref-Link zu Wallet-Sub-Tab
  - `<NormZitatSpan>` (reuse aus V1.1; § 8 Erweiterung dieser Spec)
  - `<BehoerdenBadge>` (reuse aus V1)
  - `<MockWatermark>` (reuse aus V1)
- **Data fetched**: `api.getMobilitaet(personaId)` (NEW; siehe § 6).
- **i18n keys introduced**: siehe § 7 (komplette Liste).
- **States**:
  - **loading**: skelett-Cards (analog V1.2-Pattern)
  - **empty (Lena)**: Empty-State-Text + Wegweiser-CTA zu LBV Hamburg
  - **success (Anna/Mehmet/Schmidt)**: alle Cards gerendert
  - **error**: Toast „Mobilität-Daten konnten nicht geladen werden — bitte
    erneut versuchen" + retry-CTA (V1-Pattern)
  - **punkte-abruf-running**: PunkteEidReauthModal offen mit Spinner;
    danach Result-Card mit TTL-Countdown
- **Accessibility notes**:
  - ARIA-Landmark: `<section id="mobilitaet" aria-labelledby="mobilitaet-
    heading">`.
  - Focus-Order: Sektion-Toggle → Disclaimer-Card → FE-Hauptkarte →
    Klassen-Disclosure → Pflichtumtausch-Banner-CTA → Punkte-CTA →
    Halter-Card[0..n] → Halter-Adresse-Card → Mitnutzer-Pill → Wallet-Cross-
    Ref-Link.
  - `<UmzugBridgeBadge>` ist `role="status"` (nicht-modal-Information).
  - Pflichtumtausch-Banner mit Frist <30 d: zusätzlich `aria-live="polite"`
    bei Initialload (1× Announcement).
  - PunkteEidReauthModal: `aria-modal="true"` + focus-trap (V1-Pattern
    aus Religion-Modal).
  - `<UmzugBridgeBadge>` Animations-Variante respektiert `prefers-reduced-
    motion` (kein fade-in; instant render).

### 3.2 Screen: Stammdaten Sub-Tab „Wallet & Externe Empfänger" — mDL-Card-Erweiterung

- **Route**: `/stammdaten` Sub-Tab `wallet` (existing aus V1)
- **File**: `src/app/(app)/stammdaten/page.tsx` Sub-Tab + bestehende
  Wallet-Sub-Tab-Komponente (EXTEND)
- **Server or client**: RSC für initial Fetch; `<WalletMdlAttestationPreview
  Modal>` ist Client
- **Layout** (ASCII — nur additive Erweiterung):

```
┌─ Wallet & Externe Empfänger ──────────────────────────────────────┐
│                                                                   │
│  ┌─ PID-Mock-Attestation (V1 — existing) ───────────────────┐    │
│  │  8 Pflichtattribute + 4-aus-6 Hilfsattribute             │    │
│  │  [Vorschau öffnen]                                       │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                   │
│  ┌─ mDL-Mock-Attestation (V1.3 — NEU) ──────────────────────┐    │
│  │  ⚠ Vision-Banner: „Anwendungsbeginn 26.11.2029; mDL-     │    │
│  │     Default ~Mai 2031 nach Implementing Act Art. 5(7)"   │    │
│  │  Status: noch nicht ausgestellt (Default für alle 3      │    │
│  │  Personas)                                               │    │
│  │  [Vorschau öffnen → WalletMdlAttestationPreviewModal]    │    │
│  │  Disclaimer-Marker: eudi_mdl_speculative                 │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                   │
└───────────────────────────────────────────────────────────────────┘
```

- **Components used**:
  - `<WalletMdlCard>` (NEW) — als 2. Card neben bestehender PID-Card
  - `<WalletMdlAttestationPreviewModal>` (NEW)
  - `<VisionBanner2031>` (NEW; oder Variante mit Prop `targetYear:
    '2029' | '2031'` — siehe § 4)
- **Data fetched**: `api.getMdlAttestation(personaId)` (NEW; returns
  Mock-Status — siehe § 6).
- **States**:
  - **default (alle Personas)**: mDL noch nicht ausgestellt (`status:
    'not_issued'`) — Card zeigt Vision-Banner + Disabled-Vorschau-CTA mit
    Tooltip „Vorschau eines hypothetischen mDL-Attestats (Mock — keine
    echte Issuance)"
  - **mock-preview**: CTA aktivierbar → Modal mit Selective-Disclosure-
    Toggles (closed-enum aus ISO/IEC 18013-5 Annex B, VL-9)
- **i18n keys**: `stammdaten.wallet.mdl.title`, `…vision_banner_2031`,
  `…preview_cta`, plus alle Toggle-Labels (siehe § 7).
- **Accessibility**:
  - Modal `aria-modal="true"` + focus-trap.
  - Selective-Disclosure-Toggles als `<RadioGroup>` (mutually exclusive je
    Attribut-Gruppe wo sinnvoll) bzw. einzelne `<Switch>`-Komponenten;
    konkrete Wahl frontend-coder-discretion innerhalb base-ui.
  - Vision-Banner als `role="note"` (V1.2-Pattern).

### 3.3 Screen: Posteingang — neue Mock-Briefe (keine UI-Änderung)

- **Route**: `/posteingang` (existing aus V1.5)
- **File**: keine; nur `src/data/letters.json` wird erweitert (3 neue Mock-
  Briefe — siehe § 5.6)
- **States**: bestehende Posteingang-States (ungelesen / gelesen / etc.)
  decken die neuen Briefe ab; kein neuer Archetype, kein neuer Reply-
  Template-Pfad in V1.3 (Pflichtumtausch-Antwort = telefonisch/persönlich,
  nicht per Reply-Template; FAER-Auskunft = info-only ohne Reply).

---

## 4. Component inventory

> Convention identisch zu V1/V1.1/V1.2: `<NEW>` = neu anzulegen unter
> `src/components/stammdaten/mobilitaet/`; `<EXTEND>` = bestehende Komponente
> erweitern; `reuse` = unverändert. Wallet-mDL-Komponenten leben unter
> `src/components/stammdaten/wallet/` (existing folder; V1-WalletAttestation
> Preview-Pattern).

### 4.1 Mobilität-Sektion (neue Komponenten)

| Komponente | Pfad | Zweck | Status | Parent | Children |
|---|---|---|---|---|---|
| `<MobilitaetSektion>` | `src/components/stammdaten/mobilitaet/MobilitaetSektion.tsx` | Container; rendert Disclaimer-Card-Lese-Schicht + 4 Card-Gruppen (FE / Punkte / Halter / Wallet-Cross-Ref); Server-Component-Wrapper auf `<StammdatenSektion>` (V1 reuse) | `<NEW>` | `<StammdatenView>` (V1) | siehe unten |
| `<FuehrerscheinHauptkarte>` | `src/components/stammdaten/mobilitaet/FuehrerscheinHauptkarte.tsx` | FE-Nr (read-only, masked-Optional? — nein, FE-Nr ist nicht-sensitive wie FIN; voll lesbar) + Behörde-Badge + Korrekturweg-CTA | `<NEW>` | `<MobilitaetSektion>` | `<BehoerdenBadge>`, `<KorrekturwegFeBehoerdeCTA>` |
| `<FuehrerscheinKlassenList>` | `src/components/stammdaten/mobilitaet/FuehrerscheinKlassenList.tsx` | Tabellen-artige Liste der EU-Klassen mit Erteilungs-/Ablaufdatum + Schlüsselzahlen (collapsed default mit Disclosure-Toggle); `<SchluesselzahlTooltip>` pro Schlüssel | `<NEW>` | `<MobilitaetSektion>` | `<SchluesselzahlTooltip>` |
| `<SchluesselzahlTooltip>` | `src/components/stammdaten/mobilitaet/SchluesselzahlTooltip.tsx` | Tooltip-Wrapper mit Lookup-Map für die in V1.3-Demo verwendeten Schlüsselzahlen: 95, 70, 78, 79, 79.06, 96 (Anlage 9 FeV) | `<NEW>` | `<FuehrerscheinKlassenList>` | — |
| `<PflichtumtauschBanner>` | `src/components/stammdaten/mobilitaet/PflichtumtauschBanner.tsx` | Conditional Render gemäß VL-6: Frist-Banner aktiv (Schmidt) / Success-Pill „Umtausch erfolgt" (Mehmet) / stiller Hinweis wenn Daten unvollständig / kein Render wenn nicht-relevant (Anna). Lookup-Logik gegen Anlage-8a-FeV-Stichtags-Tabelle (Lookup-Konstante in `src/lib/mock-backend/mobilitaet/pflichtumtausch-stichtage.ts`) | `<NEW>` | `<MobilitaetSektion>` | `<NormZitatSpan>` für `§ 6 Abs. 7 FeV` + `Anlage 8a FeV` |
| `<PunktestandOnDemandCard>` | `src/components/stammdaten/mobilitaet/PunktestandOnDemandCard.tsx` | Stub-Card mit Default-State „Punktestand abrufen" + Disclaimer-Marker `faer_punkte_on_demand`; Klick öffnet `<PunkteEidReauthModal>`; nach erfolgreichem Pull rendert `<PunkteResultCard>` inline mit TTL-Countdown (5 min) | `<NEW>` | `<MobilitaetSektion>` | `<PunkteEidReauthModal>`, `<PunkteResultCard>` |
| `<PunkteEidReauthModal>` | `src/components/stammdaten/mobilitaet/PunkteEidReauthModal.tsx` | base-ui `<AlertDialog>`; Pattern-Konsistenz zu V1-`<ReligionConsentModal>` + V1.1-`<PflegegradConsentModal>`; Modal-Body verbatim aus `stammdaten.disclaimer.faer_punkte_on_demand` + Einwilligungs-Toggle „Ich willige in den simulierten FAER-Abruf nach § 30 Abs. 8 StVG ein"; primary „Punktestand abrufen (Mock)" disabled bis Toggle on; `<NormZitatSpan>`-Wrap für `§ 30 Abs. 8 StVG`, `§ 30a StVG`; `aria-modal="true"` + focus-trap | `<NEW>` | `<PunktestandOnDemandCard>` | `<NormZitatSpan>` |
| `<PunkteResultCard>` | `src/components/stammdaten/mobilitaet/PunkteResultCard.tsx` | Render nach erfolgreichem Pull: Punktestand-Zahl groß + Stand-Stempel „Stand: TT.MM.JJJJ HH:MM" + TTL-Countdown (Live-Counter, 5 min) + Activity-Log-Hinweis „Eintrag im Aktivitätsprotokoll: `kfz_faer_punkte_pulled`"; `useEffect` mit `setTimeout` für TTL-Expiry → Card faded out → CTA „Punktestand erneut abrufen" wird wieder default | `<NEW>` | `<PunktestandOnDemandCard>` | `<NormZitatSpan>` |
| `<KfzHalterKarte>` | `src/components/stammdaten/mobilitaet/KfzHalterKarte.tsx` | Pro Fahrzeug: Kennzeichen, Marke/Modell + BJ, FIN-masked (4 letzte Stellen sichtbar; on-click voll mit `useState`-Toggle), HU-Datum + Frist-Pill bei <90 d, eVB-Nummer; *innerhalb* der Karte rendert optional `<KfzMitnutzerPill>` (für Schmidt) | `<NEW>` | `<MobilitaetSektion>` | `<FinMaskedSpan>`, `<KfzMitnutzerPill>` |
| `<FinMaskedSpan>` | `src/components/stammdaten/mobilitaet/FinMaskedSpan.tsx` | Pattern-Konsistenz zu V1 `<IbanSpeculativeBadge>` Mask-Pattern: 4 letzte Stellen sichtbar, On-click vollständig; `aria-label="Fahrgestellnummer maskiert, letzte vier Stellen {…}"`; toggle-State component-local; Disclaimer-Tooltip „FIN ist personenbezogener Identifier — voll anzeigen nur bei Bedarf" | `<NEW>` | `<KfzHalterKarte>` | — |
| `<KfzMitnutzerPill>` | `src/components/stammdaten/mobilitaet/KfzMitnutzerPill.tsx` | Innerhalb Halter-Card: Pill „Mitnutzer:in: {Name} — rechtlich kein Halter" + Tooltip mit Wortlaut „§ 15 FZV-Mitteilungspflicht trifft nur den Halter (FZV § 6); diese App bildet die Halter-Eigenschaft ab, nicht die Nutzungs-Realität." (VL-12) | `<NEW>` | `<KfzHalterKarte>` | `<NormZitatSpan>` |
| `<HalterAdresseFieldCard>` | `src/components/stammdaten/mobilitaet/HalterAdresseFieldCard.tsx` | Separate Card für die *Halter-Anschrift* (nicht identisch mit `<KfzHalterKarte>`-Adresse-Sub-Row, weil eine Halter-Anschrift mehrere Fahrzeuge betreffen kann): Adress-Text + `<UmzugBridgeBadge>` conditional, wenn der Umzug-Vorgang für diese Persona einen abgeschlossenen Block-D-Schritt mit `behoerdeId === 'kfz-…'` aufweist (Bucket-Lookup über `getUmzugVorgaengeFinished(personaId)`); Disclaimer-Marker `kfz_halter_adresse_speculative` als Card-Footer | `<NEW>` | `<MobilitaetSektion>` | `<UmzugBridgeBadge>` |
| `<UmzugBridgeBadge>` | `src/components/stammdaten/mobilitaet/UmzugBridgeBadge.tsx` | **VL-13 Übergangs-Badge**: Render-Wortlaut verbatim aus i18n `stammdaten.field_card.halter_adresse.uebergangs_badge_via_umzug`: „Adressänderung über Umzug-Vorgang ausgelöst — Bestätigung der Zulassungsstelle steht aus"; `role="status"`; CI-grep-Audit verbietet die alternative Phrase „Halter-Adresse aktualisiert" im Render-Output | `<NEW>` | `<HalterAdresseFieldCard>` | — |
| `<KorrekturwegFeBehoerdeCTA>` | `src/components/stammdaten/mobilitaet/KorrekturwegFeBehoerdeCTA.tsx` | CTA-Button + Modal-Wegweiser: „Korrekturen an FE-Nr und FE-Daten erfolgen ausschließlich bei Ihrer kommunalen Fahrerlaubnisbehörde (§ 73 FeV)"; öffnet `<KorrekturwegFeBehoerdeModal>` mit Behörden-Adresse, OZG-Online-Dienst-Status (Mock-Annahme), Wegweiser-Link | `<NEW>` | `<FuehrerscheinHauptkarte>` | `<KorrekturwegFeBehoerdeModal>` |
| `<KorrekturwegFeBehoerdeModal>` | `src/components/stammdaten/mobilitaet/KorrekturwegFeBehoerdeModal.tsx` | base-ui `<Dialog>`; rendert die zuständige FE-Behörde (LABO Berlin / LBV Hamburg / Stadt Köln) mit Adresse + Telefonkontakt-Mock + OZG-Online-Dienst-Status + Hinweis „diese App ist nicht-hoheitlich"; `aria-modal="true"` | `<NEW>` | `<KorrekturwegFeBehoerdeCTA>` | — |
| `<WalletMdlCrossRefLink>` | `src/components/stammdaten/mobilitaet/WalletMdlCrossRefLink.tsx` | Cross-Ref-Link analog V1.2 `<PostanschriftCrossRefCard>`: „mDL im Wallet ansehen → Sub-Tab Wallet & Externe Empfänger" + Vision-Pill „2029" + Disclaimer-Marker `eudi_mdl_speculative` (Tooltip-Inline) | `<NEW>` | `<MobilitaetSektion>` | — |

### 4.2 Wallet-Sub-Tab mDL-Erweiterung (V1-Bestand extend)

| Komponente | Pfad | Zweck | Status | Parent | Children |
|---|---|---|---|---|---|
| `<WalletSubTab>` (existing V1) | `src/components/stammdaten/wallet/WalletSubTab.tsx` (or whatever V1 named it) | **EXTEND**: zweite Card-Slot für mDL hinzufügen | `<EXTEND>` | `/stammdaten` Wallet-Tab | `<WalletPidCard>` (V1), `<WalletMdlCard>` (NEW) |
| `<WalletMdlCard>` | `src/components/stammdaten/wallet/WalletMdlCard.tsx` | mDL-Mock-Status-Card: Status-Pill „noch nicht ausgestellt", Vision-Banner (2031-Default), Preview-CTA; Disclaimer-Marker `eudi_mdl_speculative` (VL-7) | `<NEW>` | `<WalletSubTab>` | `<VisionBanner2031>`, `<WalletMdlAttestationPreviewModal>` |
| `<WalletMdlAttestationPreviewModal>` | `src/components/stammdaten/wallet/WalletMdlAttestationPreviewModal.tsx` | base-ui `<Dialog>`; Modal-Header trägt `<VisionBanner2031>` (VL-7); Modal-Body rendert Selective-Disclosure-Toggle-Group **closed-enum aus ISO/IEC 18013-5 Annex B** (VL-9 — siehe § 5.5); preview einer Mock-Attestation in JSON-Card mit selected-fields highlighting; Disclaimer-Marker `eudi_mdl_speculative` + Footer-Hinweis „Mock — keine echte Issuance" | `<NEW>` | `<WalletMdlCard>` | `<VisionBanner2031>`, `<NormZitatSpan>` für `RL (EU) 2025/2205` |
| `<VisionBanner2031>` | `src/components/stammdaten/wallet/VisionBanner2031.tsx` | Vision-Banner-Variante (Pattern-Konsistenz zu V1.2 `<VisionBanner>`); `role="note"`; Wortlaut verbatim aus `stammdaten.disclaimer.eudi_mdl_speculative` (i18n-Key); **Naming distinct from V1 2027-Vision-Pill** (VL-7); optional Prop `targetYear: '2029' | '2031'` mit default `'2031'` | `<NEW>` | `<WalletMdlCard>`, `<WalletMdlAttestationPreviewModal>` | — |

### 4.3 Cross-cutting / reused

| Komponente | Pfad | Status | Verwendung in V1.3 |
|---|---|---|---|
| `<StammdatenSektion>` | `src/components/stammdaten/StammdatenSektion.tsx` | reuse | Wrapper für `<MobilitaetSektion>` |
| `<StammdatenFieldCard>` | `src/components/stammdaten/StammdatenFieldCard.tsx` | reuse | Inneres Layout vieler Cards |
| `<NormZitatSpan>` | `src/components/posteingang/NormZitatSpan.tsx` | `<EXTEND>` | Norm-Zitat-Lookup-Map-Erweiterung (§ 8) |
| `<BehoerdenBadge>` | `src/components/shared/BehoerdenBadge.tsx` | reuse | KBA / LABO / LBV / Stadt-Köln-Badges |
| `<MockWatermark>` | `src/components/shared/MockWatermark.tsx` | reuse | Watermark auf Halter-Card + FE-Nr-Card |
| `<UebermittlungsLogList>` | `src/components/stammdaten/UebermittlungsLogList.tsx` | `<EXTEND>` | Neue Activity-Log-Note-Strings (`kfz_faer_punkte_pulled`, `kfz_halter_adresse_prefilled_via_umzug`) gerendert |
| `<AutopilotTimeline>` (Umzug) | `src/components/autopilot/AutopilotTimeline.tsx` | reuse — Block-D-Step-Text wird über i18n gesteuert; siehe § 9 für Wording-Co-Correction | Bridge-Visualisierung |

### 4.4 RSC-vs-Client-Boundary

- **Server (RSC)**: `getMobilitaet(personaId)`, `getMdlAttestation(personaId)`,
  `getBehoerdeById(behoerdeId)` für die FE-Behörde + Zulassungsstelle laufen
  in der RSC-Page; HTML rendert initial mit allen Card-Werten.
- **Client (`'use client'`)**: alle Modals (`<PunkteEidReauthModal>`,
  `<KorrekturwegFeBehoerdeModal>`, `<WalletMdlAttestationPreviewModal>`),
  `<PunkteResultCard>` (TTL-Countdown braucht `useEffect`/`useState`),
  `<FinMaskedSpan>` (Toggle-State), `<KlassenList>` (Disclosure-Toggle).
- **Mutations**: keine. V1.3 ist reine Lese-Schicht (HL-MOB-1, HL-MOB-10) —
  kein Self-Edit-Pfad für FE-Nr, FIN, Klassen, Schlüsselzahlen, Halter-
  Daten. `getPunktestandOnDemand` ist ein Read mit Side-Effect (Activity-
  Log-Append), kein Write in Mobilität-Persistenz.

---

## 5. Mock-data schemas + Persistence

### 5.1 Persona-Schema additiv erweitern (`src/types/persona.ts`)

V1.3 erweitert das `Persona`-Interface um einen optionalen `mobilitaet`-
Block. Kein Bruch an V1-V1.2 (Umzug, Posteingang, Stammdaten V1-V1.2 bleiben
kompatibel).

```ts
// src/types/persona.ts (V1.3 EXTEND — additive)

import type { Mobilitaet } from '@/types/mobilitaet';

export interface Persona {
  // ... V1 + V1.1 + V1.2 fields unchanged ...

  /**
   * V1.3 — Mobilität-Block (Lese-Schicht).
   * undefined = Persona ohne FE und ohne Halter-Eigenschaft; UI rendert
   * Empty-State.
   *
   * HL-MOB-1 + HL-MOB-10 — alle Felder darin sind Read-Only-Snapshots
   * aus dem Persona-Seed. UI darf keinen Self-Edit-Pfad für FE-Nr,
   * Klassen, Schlüsselzahlen, FIN, Kennzeichen, Halter-Adresse bieten.
   *
   * HL-MOB-11 / VL-4 — `punkte` darf in dieser Struktur NICHT als
   * persistiertes Feld existieren. Punktestand-On-Demand-Result lebt
   * component-local mit TTL ≤ 5 min, niemals in `localStorage`.
   */
  mobilitaet?: Mobilitaet;
}
```

### 5.2 New types — `src/types/mobilitaet.ts` (NEW file)

```ts
// src/types/mobilitaet.ts (NEW)

import type { BehoerdeId } from '@/types';

/**
 * Mobilität-Block einer Persona (V1.3).
 *
 * Aufbau gespiegelt aus den drei autoritativen Registern beim KBA:
 * - Fahrerlaubnis  ⇄ ZFER (§ 48 Abs. 2 StVG)
 * - Halter-Daten  ⇄ ZFZR (§ 32 StVG i.V.m. § 57 FZV-2023)
 * - Punkte         ⇄ FAER (§ 28 StVG) — on-demand, NICHT hier persistiert
 *
 * Keine `punkte`-Property. Niemals. (HL-MOB-11 / VL-4.)
 */
export interface Mobilitaet {
  /** Optionale Fahrerlaubnis (undefined = Lena-Schmidt-Empty-State). */
  fahrerlaubnis?: Fahrerlaubnis;
  /** Liste eigener Halter-Karten (kann leer sein). */
  halter: KfzHalter[];
  /** Halter-Adresse, deduplizierte single-source-of-truth pro Persona. */
  halter_adresse?: HalterAdresse;
}

export interface Fahrerlaubnis {
  /**
   * 11-stellige FE-Nr nach FS-VwV: Bundesland-Buchstabe (1) +
   * Behörden-Code (3) + lfd. Nr. (5) + Prüfziffer (1) + Ausfertigung (1).
   * [MOCK]-Prefix obligatorisch.
   *
   * HL-MOB-1 / HL-MOB-10: read-only Snapshot aus Seed; kein Self-Edit.
   */
  fe_nr: string;
  /**
   * Bundesland-Buchstabe für Anzeige (Pos. 1 der FE-Nr; redundant zum
   * fe_nr-Substring, aber explizit, weil Berechnung Falsch-Risiko hat).
   */
  bundesland_kennzeichen: string; // 'F' Berlin, 'J' Hamburg, 'N' NRW, …
  /** ID der ausstellenden FE-Behörde (kommune; § 73 FeV). */
  fe_behoerde_id: BehoerdeId;
  /**
   * Klassen-Tabelle: für jede erteilte FE-Klasse ein Eintrag mit
   * Erteilungsdatum + Ablaufdatum (gültig unbefristet bei B/AM/L/T —
   * dann undefined; bei C/D-Klassen 5-Jahre-Frist) + Schlüsselzahlen.
   */
  klassen: FeKlasse[];
  /**
   * Ausstellungsdatum der aktuellen Plastikkarte (relevant für
   * Pflichtumtausch-Stichtag-Berechnung gegen Anlage 8a FeV).
   * ISO YYYY-MM-DD.
   */
  ausstellungsdatum: string;
  /**
   * Pflichtumtausch-Stichtag (Anlage 8a FeV); abgeleitet aus
   * Geburtsjahr + Ausstellungsdatum bei Erstellung des Seeds.
   * undefined = nicht-relevant (z. B. Ausstellung ab 2014, EU-konforme
   * 15-Jahre-Karte).
   * ISO YYYY-MM-DD.
   */
  pflichtumtausch_stichtag?: string;
  /**
   * Pflichtumtausch-Status:
   * - 'nicht_relevant': kein Stichtag (Anna)
   * - 'frist_aktiv': Stichtag in Zukunft, Banner mit Frist-Countdown (Schmidt)
   * - 'frist_abgelaufen_offen': Stichtag in Vergangenheit, kein Umtausch (rot)
   * - 'umtausch_erfolgt': Umtausch vor Stichtag erfolgt (Success-Pill, Mehmet)
   */
  pflichtumtausch_status:
    | 'nicht_relevant'
    | 'frist_aktiv'
    | 'frist_abgelaufen_offen'
    | 'umtausch_erfolgt';
  /** Bei Status 'umtausch_erfolgt': Datum des erfolgten Umtauschs. */
  pflichtumtausch_erfolgt_am?: string;
  /** FE-Aktenzeichen bei der FE-Behörde. */
  fe_aktenzeichen: string;
}

export interface FeKlasse {
  /** EU-Klassen-Code: A1 / A2 / A / B / BE / C1 / C / CE / D1 / D / DE / T / L. */
  klasse: string;
  /** ISO YYYY-MM-DD. */
  erteilt_am: string;
  /** ISO YYYY-MM-DD; undefined = unbefristet. */
  gueltig_bis?: string;
  /** Schlüsselzahlen (Anlage 9 FeV): z. B. '95', '70', '78', '79.06'. */
  schluesselzahlen: string[];
}

export interface KfzHalter {
  /**
   * Kennzeichen mit Unterscheidungs-Buchstaben + Erkennungs-Buchstaben +
   * Ziffern; FZV Anlage 4.
   * [MOCK]-Prefix obligatorisch.
   */
  kennzeichen: string;
  /** Marke, z. B. "VW", "Hyundai", "Mercedes". */
  marke: string;
  /** Modell, z. B. "Polo", "Kona Elektro", "Sprinter". */
  modell: string;
  /** Baujahr, ISO YYYY. */
  baujahr: string;
  /**
   * FIN nach ISO 3779, 17 Zeichen (WMI 3 + VDS 6 + VIS 8). [MOCK]-Prefix
   * obligatorisch. HL-MOB-3 / HL-MOB-7: masked-by-default in UI.
   */
  fin_voll: string;
  /**
   * Maskierte FIN-Darstellung für default UI (z. B. 'WAUZZZ•••••••3456').
   * Vorberechnet im Seed (oder zur Render-Zeit gespiegelt — Coder-Decision;
   * Empfehlung: Seed-Wert, damit Tests deterministisch sind).
   */
  fin_masked: string;
  /** ID der zuständigen Zulassungsstelle (kommune). */
  zulassungsstelle_id: BehoerdeId;
  /** ISO YYYY-MM-DD; HU-Plakette Frist. */
  hu_bis: string;
  /** 7-Zeichen alphanumerische eVB-Nummer. [MOCK]-Prefix obligatorisch. */
  evb_nummer: string;
  /** Aktenzeichen bei Zulassungsstelle. */
  zulassung_aktenzeichen: string;
  /**
   * Mitnutzer-Liste (rein illustrativ; FZV § 6: rechtlich kein Halter).
   * undefined oder leer = keine sichtbare Mitnutzer-Pill.
   * VL-12: Schmidt-Halter-Card listet Lena hier.
   */
  mitnutzer?: Array<{ vorname: string; nachname: string }>;
}

export interface HalterAdresse {
  /**
   * Aktuelle Halter-Adresse (gehalten in ZFZR — § 57 FZV-2023).
   * Im V1.3-Demo deterministisch identisch mit `Persona.adresse` solange
   * keine Block-D-Bridge aktiv ist.
   */
  strasse: string;
  hausnummer: string;
  plz: string;
  ort: string;
  /**
   * Übergangs-Marker bei Umzug-Bridge (VL-13).
   * true = `<UmzugBridgeBadge>` rendert; Activity-Log-Eintrag existiert.
   */
  uebergangs_marker_via_umzug: boolean;
  /**
   * ISO-Timestamp wann der Übergangs-Marker gesetzt wurde (= Umzug-Vorgang-
   * Block-D-Abschluss-Zeitpunkt). undefined wenn marker=false.
   */
  uebergangs_marker_seit?: string;
  /**
   * Reference auf den Umzug-Vorgang, der den Marker erzeugt hat.
   * undefined wenn marker=false.
   */
  via_umzug_vorgang_id?: string;
}
```

### 5.3 Persistenz — Buckets + Schema-Migration V12→V13

| Bucket-Key | Inhalt | Schema-Version |
|---|---|---|
| `govtech-de:v1:stammdaten:mobilitaet` | `Record<PersonaId, Mobilitaet>` (Mock-Snapshot pro Persona aus Seed) | **v1** (NEU mit V1.3) |
| `govtech-de:v1:stammdaten:uebermittlungs-log` | reuse aus V1; **erweitert** um zwei neue Note-Strings: `kfz_faer_punkte_pulled`, `kfz_halter_adresse_prefilled_via_umzug` (Kategorien: `app_aktivitaet` bzw. `behoerde_zu_buerger`) | v1 (kein Bump, additive Werte) |
| **NICHT in localStorage**: `Punktestand`-Result-Cache. Liegt component-local in `useState` mit `setTimeout`-TTL = 300_000 ms (5 min). HL-MOB-11 / VL-4 / VL-8. | — | — |

**Migrations-Step** in `src/lib/mock-backend/persistence-migrations.ts`
(neue Funktion `migratePersonaV12ToV13`):

1. Bei Boot prüfen, ob `govtech-de:v1:stammdaten:schema-version` === `'1.2'`.
2. Wenn ja: jeden Persona-Eintrag erweitern um `mobilitaet`-Block aus
   Seed-Daten (§ 5.4); danach `schema-version` auf `'1.3'` bumpen.
3. **VL-4 / HL-MOB-11 Pflicht-Assertion in der Migration**: nach dem
   Schreiben prüfen, dass kein `persona.mobilitaet.punkte` Property existiert
   (defensive Guard); falls doch → throw + Rollback (sollte nicht passieren,
   ist Sicherheits-Net).
4. **VL-12-Korrektur**: Lena Schmidt's `kfz_halter`-Flag wird auf `false`
   gesetzt (V1.0-V1.2-Drift fix); Markus bleibt einziger Halter.
5. **VL-13-Anna-Bridge-Marker**: Annas `mobilitaet.halter_adresse.uebergangs_
   marker_via_umzug` wird auf `true` gesetzt mit `via_umzug_vorgang_id =
   <bestehender Anna-Umzug-Vorgang aus V1>`. Nur idempotent zu einem
   spezifischen Vorgang.
6. Migration ist **idempotent** (Re-Run = no-op-Detection über
   `schema-version`-Lookup; zudem prüft sie pro Persona `mobilitaet ===
   undefined ? seed : existing`).
7. **Keine** localStorage-Daten gehen verloren.

```ts
// src/lib/mock-backend/persistence-migrations.ts (additive)
export function migratePersonaV12ToV13(prev: PersistedPersonas): PersistedPersonas {
  const next = { ...prev };
  for (const personaId of Object.keys(next.personas)) {
    const p = next.personas[personaId];
    if (!p.mobilitaet) {
      p.mobilitaet = SEED_MOBILITAET[personaId] ?? undefined;
    }
    // VL-12 Schmidt-Lena-Halter-Korrektur
    if (personaId === 'markus-schmidt' && p.familie?.partner?.id === 'lena-schmidt') {
      if ((p.familie.partner as Record<string, unknown>).kfz_halter === true) {
        (p.familie.partner as Record<string, unknown>).kfz_halter = false;
      }
    }
    // VL-4 Sicherheits-Guard: NIE `punkte`
    if (p.mobilitaet && 'punkte' in (p.mobilitaet as Record<string, unknown>)) {
      delete (p.mobilitaet as Record<string, unknown>).punkte;
    }
  }
  next.schema_version = '1.3';
  return next;
}
```

### 5.4 Seed-Daten (`src/lib/mock-backend/seed.ts` Extension)

`SEED_MOBILITAET` ist eine neue Konstante pro Persona-ID. Werte:

```ts
// src/lib/mock-backend/mobilitaet/seed-mobilitaet.ts (NEW)

export const SEED_MOBILITAET: Record<string, Mobilitaet> = {
  'anna-petrov': {
    fahrerlaubnis: {
      fe_nr: '[MOCK] F0727RRE2I50',
      bundesland_kennzeichen: 'F',
      fe_behoerde_id: 'fe-berlin-labo',
      klassen: [
        { klasse: 'B', erteilt_am: '2024-03-18', schluesselzahlen: [] },
      ],
      ausstellungsdatum: '2024-03-18',
      pflichtumtausch_status: 'nicht_relevant',
      fe_aktenzeichen: '[MOCK] LABO-FE/2024-03-002831',
    },
    halter: [{
      kennzeichen: '[MOCK] B-AP 4711',
      marke: 'VW',
      modell: 'Polo',
      baujahr: '2019',
      fin_voll: '[MOCK] WAUZZZF40MA123456',
      fin_masked: 'WAUZZZ•••••••3456',
      zulassungsstelle_id: 'kfz-berlin-labo',
      hu_bis: '2026-06-30',
      evb_nummer: '[MOCK] AX21Q8L',
      zulassung_aktenzeichen: '[MOCK] LABO-KFZ/2024-09-104221',
    }],
    halter_adresse: {
      strasse: 'Friedrichstraße', hausnummer: '100',
      plz: '10117', ort: 'Berlin',
      uebergangs_marker_via_umzug: true,
      uebergangs_marker_seit: '2026-05-08T11:24:00.000Z',
      via_umzug_vorgang_id: 'vg-anna-umzug-skalitzer-friedrichstr',
    },
  },
  'markus-schmidt': {
    fahrerlaubnis: {
      fe_nr: '[MOCK] J0512SCH08X1',
      bundesland_kennzeichen: 'J',
      fe_behoerde_id: 'fe-hamburg-lbv',
      klassen: [
        { klasse: 'B',  erteilt_am: '2002-09-17', schluesselzahlen: [] },
        { klasse: 'BE', erteilt_am: '2010-04-22', schluesselzahlen: [] },
      ],
      ausstellungsdatum: '2002-09-17',
      pflichtumtausch_stichtag: '2027-01-19',
      pflichtumtausch_status: 'frist_aktiv',
      fe_aktenzeichen: '[MOCK] LBV-HH-FE/2002-09-007751',
    },
    halter: [{
      kennzeichen: '[MOCK] HH-SC 142',
      marke: 'VW',
      modell: 'Touran',
      baujahr: '2021',
      fin_voll: '[MOCK] WVWZZZ16MA0028842',
      fin_masked: 'WVWZZZ•••••••8842',
      zulassungsstelle_id: 'kfz-hamburg-lbv',
      hu_bis: '2027-09-15',
      evb_nummer: '[MOCK] VB47K3M',
      zulassung_aktenzeichen: '[MOCK] LBV-HH-KFZ/2021-04-08842',
      mitnutzer: [{ vorname: 'Lena', nachname: 'Schmidt' }],
    }],
    halter_adresse: {
      strasse: 'Eppendorfer Weg', hausnummer: '212',
      plz: '20251', ort: 'Hamburg',
      uebergangs_marker_via_umzug: false,
    },
  },
  // Lena Schmidt: KEIN Eintrag in SEED_MOBILITAET — Lena ist sub-Persona-
  // Eintrag in markus-schmidt.familie.partner; ihr fehlt eine eigene
  // Persona-Top-Level-ID, ergo eigener Mobilitaet-Block entfällt. Ihre
  // Mitnutzer-Beziehung kommt aus markus-schmidt.mobilitaet.halter[0].mitnutzer.
  // Empty-State für Lena rendert die Mobilität-Sektion über `getMobilitaet`
  // mit `fahrerlaubnis: undefined` + `halter: []` (siehe § 6.1 Anti-Lena-Pfad).
  'mehmet-yildiz': {
    fahrerlaubnis: {
      fe_nr: '[MOCK] N0428MEH47K2',
      bundesland_kennzeichen: 'N',
      fe_behoerde_id: 'fe-koeln-stadt',
      klassen: [
        { klasse: 'B',  erteilt_am: '2010-11-15', schluesselzahlen: [] },
        { klasse: 'C1', erteilt_am: '2015-06-08', gueltig_bis: '2030-01-19', schluesselzahlen: ['95'] },
        { klasse: 'BE', erteilt_am: '2015-06-08', schluesselzahlen: [] },
      ],
      ausstellungsdatum: '2010-11-15',
      pflichtumtausch_stichtag: '2025-01-19',
      pflichtumtausch_status: 'umtausch_erfolgt',
      pflichtumtausch_erfolgt_am: '2025-01-14',
      fe_aktenzeichen: '[MOCK] STADT-K/STR-FE-2025-01-002831',
    },
    halter: [
      {
        kennzeichen: '[MOCK] K-VR 8088E',
        marke: 'Hyundai',
        modell: 'Kona Elektro',
        baujahr: '2024',
        fin_voll: '[MOCK] KMHKM81GFNU440742',
        fin_masked: 'KMHK•••••••••0742',
        zulassungsstelle_id: 'kfz-koeln-stadt',
        hu_bis: '2027-04-20',
        evb_nummer: '[MOCK] AX99H1L',
        zulassung_aktenzeichen: '[MOCK] STADT-K/STR-KFZ-2024-09-211487',
      },
      {
        kennzeichen: '[MOCK] K-MY 4711',
        marke: 'Mercedes',
        modell: 'Sprinter',
        baujahr: '2019',
        fin_voll: '[MOCK] WDB9061331R348123',
        fin_masked: 'WDB9•••••••••8123',
        zulassungsstelle_id: 'kfz-koeln-stadt',
        hu_bis: '2026-11-15',
        evb_nummer: '[MOCK] HV21M8K',
        zulassung_aktenzeichen: '[MOCK] STADT-K/STR-KFZ-2019-03-118099',
      },
    ],
    halter_adresse: {
      strasse: 'Venloer Straße', hausnummer: '388',
      plz: '50825', ort: 'Köln',
      uebergangs_marker_via_umzug: false,
    },
  },
};
```

**Activity-Log-Seed-Erweiterung pro Persona** (additive zu V1/V1.1/V1.2-
Seed-Einträgen):

- **Anna**: 1 Eintrag `behoerde_zu_buerger` (Kategorie aus V1.2) mit
  `note: 'persona_id:anna-petrov; field_id:kfz_halter_adresse; quelle:
  umzug_block_d; mock:true; vorgang_id:vg-anna-umzug-skalitzer-friedrichstr'`,
  `rechtsgrundlage: '§ 15 FZV (2023)'`, erzeugt am `2026-05-08T11:24:00.000Z`.
  Der einzige neue Seed-Activity-Log-Eintrag aus V1.3-Mobilität-Block-D-
  Bridge.
- **Schmidt**: keine V1.3-Seed-Einträge (Schmidt zieht nicht um).
- **Mehmet**: keine V1.3-Seed-Einträge.

### 5.5 ISO/IEC 18013-5 Annex-B Selective-Disclosure Toggle-Set (VL-9, closed enum)

```ts
// src/lib/mock-backend/wallet/iso-18013-5-toggle-set.ts (NEW)

/**
 * Closed-Enum: nur diese Attribute dürfen im
 * <WalletMdlAttestationPreviewModal> als Selective-Disclosure-Toggle
 * erscheinen. Quelle: ISO/IEC 18013-5 Annex B (mDL data elements).
 *
 * Forbidden (VL-9, unit-test-enforced):
 *   - punkte / punktezahl (FAER, kein mDL-Attribut)
 *   - bezirk_der_fe_behoerde (kein mDL-Attribut)
 *   - mpu_status (kein mDL-Attribut)
 *   - schluesselzahl_95_isolated (Schlüssel 95 nicht von übrigen
 *     Schlüsseln separat freigebbar — Schlüsselzahlen sind Teil von
 *     driving_privileges-Gesamtblock je Klasse)
 *   - faer_eintragungen (kein mDL-Attribut)
 */
export const ISO_18013_5_MDL_TOGGLE_SET = [
  'given_name',
  'family_name',
  'birth_date',
  'age_over_18',          // Kontroll-Selektor
  'age_in_years',         // Kontroll-Selektor
  'driving_privileges',   // Gesamt-Block je Klasse (Klasse + erteilt + ablauf + alle Schlüssel)
  'portrait',
  'signature_usual_mark',
  'issue_date',
  'expiry_date',
  'issuing_authority',
  'issuing_country',
  'document_number',      // = FE-Nr
  'un_distinguishing_sign',
] as const;

export type Iso18013_5MdlToggle = (typeof ISO_18013_5_MDL_TOGGLE_SET)[number];
```

**Unit-Test (VL-9)**: `expect(ISO_18013_5_MDL_TOGGLE_SET).not.toContain(
'punkte')` und `…not.toContain('mpu_status')` etc. — siehe § 13.

### 5.6 New Behörden (`src/data/behoerden.json` Extension)

Sieben neue Einträge (Pflicht-Feld `bundid_postfach_anbindung` aus V1.2 +
neues Pflicht-Feld `kategorie` validiert — bestehend in V1):

| Behörde-ID | Name | Adresse | `kategorie` | `bundid_postfach_anbindung` |
|---|---|---|---|---|
| `kba-flensburg` | „Kraftfahrt-Bundesamt" | Fördestraße 16, 24944 Flensburg (Postanschrift 24932 Flensburg) | `bund` (VL-5) | `nicht_angebunden` (KBA-Selbstauskunft läuft über eigenes Portal mit eID, nicht über BundID-Postfach) |
| `fe-berlin-labo` | „Landesamt für Bürger- und Ordnungsangelegenheiten — Abt. III Fahrerlaubnis" | Puttkamerstraße 16-18, 10958 Berlin | `kommune` (VL-5; Berlin als Stadtstaat: LABO ist operativ untere Verwaltungsbehörde nach § 73 FeV, daher kommune statt land) | `nicht_angebunden` |
| `fe-hamburg-lbv` | „Landesbetrieb Verkehr — Fahrerlaubnis-Abteilung" | Ausschläger Weg 100, 20537 Hamburg | `kommune` (Stadtstaat-Analogie zu Berlin) | `nicht_angebunden` |
| `fe-koeln-stadt` | „Stadt Köln — Straßenverkehrsamt — Fahrerlaubnisstelle" | Hohenstaufenring 16, 50674 Köln | `kommune` | `nicht_angebunden` |
| `kfz-hamburg-lbv` | „Landesbetrieb Verkehr — KFZ-Zulassung" | Ausschläger Weg 100, 20537 Hamburg | `kommune` | `nicht_angebunden` |
| `kfz-koeln-stadt` | „Stadt Köln — Straßenverkehrsamt — KFZ-Zulassungsstelle" | Hohenstaufenring 16, 50674 Köln | `kommune` | `nicht_angebunden` |
| (existing `kfz-berlin-labo`) | „LABO Berlin — KFZ-Zulassung" | (existing aus V1) | `kommune` (UPDATE wenn nicht bereits gesetzt) | `nicht_angebunden` (V1.2 existing) |

VL-5-Lint: `behoerden.filter(b => /Fahrerlaubnis|Fahrerlaubnisstelle|Zulassungs
stelle|Kfz-Zulassung/i.test(b.name)).every(b => b.kategorie === 'kommune')`.
KBA: `kategorie === 'bund'`.

### 5.7 New Letters (`src/data/letters.json` Extension)

Drei neue Mock-Briefe, additive zum V1/V1.5-Bestand:

#### 5.7.1 `letter-pflichtumtausch-fe-hamburg-schmidt-2026-05`

```json
{
  "id": "letter-pflichtumtausch-fe-hamburg-schmidt-2026-05",
  "absender_behoerde_id": "fe-hamburg-lbv",
  "empfaenger_persona_id": "markus-schmidt",
  "kanal": "brief",
  "aktenzeichen": "[MOCK] LBV-HH-FE-2026/05-PU-8842",
  "datum_eingang": "2026-05-04T09:30:00.000Z",
  "frist_norm": "§ 6 Abs. 7 FeV i.V.m. Anlage 8a FeV",
  "betreff": {
    "de": "Pflichtumtausch Ihres Führerscheins — Stichtag 19.01.2027 — Aktenzeichen [MOCK] LBV-HH-FE-2026/05-PU-8842"
  },
  "body": {
    "de": "Sehr geehrter Herr Dr. Schmidt,\n\nnach § 6 Abs. 7 FeV in Verbindung mit Anlage 8a Pflichtumtauschen-Tabelle endet die Gültigkeit Ihres bisherigen Führerscheins zum 19.01.2027. Wir bitten Sie, fristgerecht einen Umtausch in den fälschungssicheren EU-Kartenführerschein zu beantragen.\n\nHinweis: Nach Ablauf der Frist können Sie keinen Nachweis Ihrer Fahrberechtigung mehr durch den abgelaufenen Führerschein erbringen; das Führen von Kraftfahrzeugen ohne gültigen Führerschein ist eine Ordnungswidrigkeit (§ 75 Nr. 4 FeV).\n\nMit freundlichen Grüßen\nLandesbetrieb Verkehr Hamburg — Fahrerlaubnis-Abteilung\nAusschläger Weg 100, 20537 Hamburg"
  },
  "ai_summary": { "de": "Frist 19.01.2027 (~8 Monate); Pflichtumtausch in EU-Kartenführerschein bei Landesbetrieb Verkehr Hamburg." },
  "required_action": "Umtausch-Termin bei FE-Behörde buchen",
  "frist": "2027-01-19",
  "status": "ungelesen"
}
```

#### 5.7.2 `letter-fzv-15-aufforderung-kfz-koeln-mehmet-2026-04`

```json
{
  "id": "letter-fzv-15-aufforderung-kfz-koeln-mehmet-2026-04",
  "absender_behoerde_id": "kfz-koeln-stadt",
  "empfaenger_persona_id": "mehmet-yildiz",
  "kanal": "brief",
  "aktenzeichen": "[MOCK] STADT-K/STR-KFZ-2026-04-19922",
  "datum_eingang": "2026-04-22T11:00:00.000Z",
  "frist_norm": "§ 15 FZV (unverzüglich, i.d.R. innerhalb einer Woche)",
  "betreff": {
    "de": "Mitteilung Ihrer Halter-Anschrift gemäß § 15 FZV — Aktenzeichen [MOCK] STADT-K/STR-KFZ-2026-04-19922"
  },
  "body": {
    "de": "Sehr geehrter Herr Yıldız,\n\naufgrund einer uns von dritter Seite zugegangenen Information zu einer möglichen Anschriftenänderung bitten wir Sie, unverzüglich eine entsprechende Mitteilung nach § 15 FZV abzugeben. Bei Nichtbefolgung setzen wir Ihnen eine Frist von vier Wochen; mit fruchtlosem Ablauf erlischt die Zulassung Ihres Fahrzeugs (§ 15 Abs. 4 FZV).\n\nEine vorsätzliche oder fahrlässige Verletzung der Mitteilungspflicht stellt eine Ordnungswidrigkeit dar (§ 75 Nr. 1 FZV i.V.m. § 24 StVG); regelmäßige Verwarnung 40 €.\n\nMit freundlichen Grüßen\nStadt Köln — Straßenverkehrsamt — KFZ-Zulassungsstelle"
  },
  "ai_summary": { "de": "Aufforderung zur Halter-Anschrifts-Mitteilung nach § 15 FZV; Frist unverzüglich (i.d.R. innerhalb einer Woche); kein Konflikt mit Mehmets aktueller Anschrift — vermutlich Irrtum, Rück-Klarstellung empfohlen." },
  "required_action": "Rück-Klarstellung an Zulassungsstelle, ggf. i-Kfz-Stufe-4-Vorgang prüfen",
  "frist": null,
  "status": "ungelesen"
}
```

**VL-2 Audit**: das Wort „7-Tage-Frist" / „7 Tage" kommt im Body **nicht
vor** — nur „unverzüglich (i.d.R. innerhalb einer Woche)" + „Frist von
vier Wochen" (das ist die Eskalations-4-Wochen-Frist nach § 15 Abs. 4
FZV, separater Tatbestand). CI-Grep prüft Letter-Bodies auf
`\b7[- ]Tage[- ]?Frist\b`.

#### 5.7.3 `letter-faer-auskunft-pdf-mehmet-2026-05`

```json
{
  "id": "letter-faer-auskunft-pdf-mehmet-2026-05",
  "absender_behoerde_id": "kba-flensburg",
  "empfaenger_persona_id": "mehmet-yildiz",
  "kanal": "brief",
  "aktenzeichen": "[MOCK] FAER-AK-2026-04127831",
  "datum_eingang": "2026-05-02T07:15:00.000Z",
  "frist_norm": "§ 30 Abs. 8 StVG (Selbstauskunft unentgeltlich)",
  "betreff": {
    "de": "Auskunft aus dem Fahreignungsregister gemäß § 30 Abs. 8 StVG — Geschäftszeichen [MOCK] FAER-AK-2026-04127831"
  },
  "body": {
    "de": "Sehr geehrter Herr Yıldız,\n\nhiermit übersenden wir Ihnen die von Ihnen beantragte Auskunft über die zu Ihrer Person im Fahreignungsregister gespeicherten Daten.\n\nPunktestand zum Stichtag 30.04.2026: 1 Punkt.\nStand der zugrunde liegenden Eintragungen: 16.03.2024.\n\nDiese Auskunft ist gebührenfrei. Sie wurde aufgrund Ihres elektronischen Antrags vom 30.04.2026 unter Verwendung Ihrer eID-Funktion ausgestellt.\n\nMit freundlichen Grüßen\nKraftfahrt-Bundesamt — Referat Z21\nFördestraße 16, 24944 Flensburg"
  },
  "ai_summary": { "de": "FAER-Auskunft: 1 Punkt; gebührenfrei; keine Aktion erforderlich. Maßnahmen-Schwellen (4-5 P. Ermahnung) nicht überschritten." },
  "required_action": null,
  "frist": null,
  "status": "ungelesen"
}
```

Diese drei Briefe sind **kein** neuer `archetype`-Wert im LetterReader —
sie werden über den V1.5-`unbekannt`-Pfad gerendert (kein V1.5-Reply-
Template-Pfad nötig in V1.3).

---

## 6. Mock-backend operations

Alle Methoden laufen durch `withLatency()` mit V1-Standard-Profil (300–800
ms + 5 % Fehlerquote, V1-Standard), außer wo anders vermerkt.

### 6.1 `getMobilitaet(personaId): Promise<Mobilitaet | null>`

```ts
// src/lib/mock-backend/api.ts (NEW export)

export async function getMobilitaet(personaId: PersonaId): Promise<Mobilitaet | null> {
  await withLatency();
  const bucket = readBucket<Record<PersonaId, Mobilitaet>>(
    'govtech-de:v1:stammdaten:mobilitaet',
    {},
  );
  return bucket[personaId] ?? null;
}
```

- Liefert `null` für Lena Schmidt (kein Eintrag im Bucket → Empty-State-
  Render).
- Liefert das vollständige `Mobilitaet`-Objekt für Anna / Markus / Mehmet.
- **VL-4-Guard**: bei Read prüft die Implementation defensiv, dass kein
  `punkte`-Key existiert; wenn doch (sollte nicht passieren), wird er
  entfernt und ein `console.warn` emittiert.

### 6.2 `getPunktestandOnDemand(personaId): Promise<PunktestandPullResult>`

```ts
// src/lib/mock-backend/api.ts (NEW export)

export interface PunktestandPullResult {
  punkte: 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
  abgerufen_am: string;       // ISO-Timestamp, server-side now()
  ttl_seconds: number;        // immer 300 (5 min)
  stichtag: string;            // ISO-Date, „Stand der zugrundeliegenden Eintragungen"
  aktenzeichen: string;        // [MOCK] FAER-AK-…
}

export async function getPunktestandOnDemand(personaId: PersonaId): Promise<PunktestandPullResult> {
  await withLatency();
  // Mock-Lookup: Anna 0, Markus 0, Mehmet 1, Lena n/a (throws PUNKTESTAND_KEINE_FAHRERLAUBNIS)
  // …
  const result = { punkte: PUNKTE_MOCK[personaId], abgerufen_am: new Date().toISOString(),
                   ttl_seconds: 300, stichtag: '…', aktenzeichen: '…' };

  // VL-8 / HL-MOB-11: Activity-Log-Eintrag (Kategorie 'app_aktivitaet')
  await appendUebermittlungsLog({
    persona_id: personaId,
    kategorie: 'app_aktivitaet',
    note: `persona_id:${personaId}; field_id:faer_punkte; quelle:user_punkte_reveal; mock:true; result:${result.punkte}; aktenzeichen:${result.aktenzeichen}; ttl_seconds:300`,
    rechtsgrundlage: '§ 30 Abs. 8 StVG i.V.m. § 30a StVG',
    timestamp: result.abgerufen_am,
  });

  // VL-8: das Result wird NICHT in einen Persistenz-Bucket geschrieben.
  // Component-local-State im PunkteResultCard hält es mit setTimeout-TTL.
  return result;
}
```

**Mock-Werte**:

```ts
const PUNKTE_MOCK: Record<PersonaId, 0 | 1> = {
  'anna-petrov': 0,
  'markus-schmidt': 0,
  'mehmet-yildiz': 1,  // OQ-3-Resolution
};
```

- **TTL ≤ 5 min** (`ttl_seconds: 300`) — UI-Component-State expires;
  Wiederabruf erzeugt **neuen** Activity-Log-Eintrag.
- **Niemals** in `localStorage`. **Niemals** in Persona-Schema.
- 5 % Mock-Error-Rate (V1-Standard) — Punkte-CTA muss Error-Handling
  zeigen (Toast „FAER-Abruf temporär nicht verfügbar — bitte erneut
  versuchen").

### 6.3 `getMdlAttestation(personaId): Promise<MdlAttestationMock | null>`

```ts
// src/lib/mock-backend/api.ts (NEW export)

export interface MdlAttestationMock {
  /** 'not_issued' für alle 3 Personas in V1.3. */
  status: 'not_issued' | 'mock_preview_ready';
  /** Mock-Preview-Data (immer dieselbe deterministische Anna-/Mehmet-/Schmidt-
   *  Attestation; rendert beim Klick auf Preview-CTA). */
  preview_data?: {
    given_name: string;
    family_name: string;
    birth_date: string;
    driving_privileges: Array<{ klasse: string; erteilt_am: string; gueltig_bis?: string; schluesselzahlen: string[] }>;
    issuing_authority: string;
    issuing_country: 'DE';
    document_number: string;        // = FE-Nr
    issue_date: string;
    expiry_date: string;
  };
}

export async function getMdlAttestation(personaId: PersonaId): Promise<MdlAttestationMock | null> {
  await withLatency();
  // Read aus deterministischem Seed: alle 3 Personas haben status='not_issued';
  // Preview-Data wird aber für die Modal-Vorschau befüllt aus Persona.mobilitaet.fahrerlaubnis.
}
```

### 6.4 `getUmzugVorgaengeFinished(personaId): Promise<UmzugVorgang[]>`

Hilfs-Read für `<HalterAdresseFieldCard>`-Übergangs-Marker-Detection. Liefert
abgeschlossene Umzug-Vorgänge mit Block-D-Effekt (kfz_halter === true bei
Persona-Zeitpunkt). In V1.3-Default: Anna hat einen abgeschlossenen Vorgang
mit Block-D; Schmidt + Mehmet leer.

```ts
export async function getUmzugVorgaengeFinished(personaId: PersonaId): Promise<UmzugVorgangSummary[]> {
  // …
}
```

(Existierendes Vorgang-API in `mock-backend/api.ts` aus V1; V1.3 ergänzt
nur diesen spezifischen Selector.)

### 6.5 `migratePersonaV12ToV13(prev)`

Bereits in § 5.3 oben skizziert. Idempotent. Default-Aufruf beim Boot über
`runPersistenceMigrations()` (V1-Pattern). VL-4-Pflicht-Assertion: nach
Migration `expect(persona.mobilitaet).not.toHaveProperty('punkte')`.

### 6.6 `umzugAutopilotBlockD` step-text constant (VL-14 co-correction)

Beschreibung in § 9 unten. Hier nur der Hinweis: `src/lib/mock-backend/
autopilot/umzug.ts` Block-D-Einträge erhalten neue `aktion`-Strings über
i18n-Keys + Brief-Floskel-Replacements (sehe § 9.2). Diese sind nicht-
freistehende API-Methoden, sondern interne Konstanten.

### 6.7 Mock-Backend-Events (`src/types/mock-event.ts` Extension)

```ts
type StammdatenMobilitaetEvent =
  | { type: 'stammdaten/mobilitaet-punkte-pulled'; persona_id: PersonaId; punkte: number; aktenzeichen: string }
  | { type: 'stammdaten/mobilitaet-mdl-preview-opened'; persona_id: PersonaId }
  | { type: 'stammdaten/mobilitaet-korrekturweg-fe-cta-opened'; persona_id: PersonaId; behoerde_id: BehoerdeId };
```

Jeder Event ergänzt das Activity-Log mit einem entsprechenden
`UebermittlungsLogEntry`. `mobilitaet-punkte-pulled` → Kategorie
`app_aktivitaet`, Note `kfz_faer_punkte_pulled`, Rechtsgrundlage „§ 30 Abs.
8 StVG i.V.m. § 30a StVG". Die anderen sind UI-Telemetrie-Events ohne
Persistenz-Side-Effect (optional zu emittieren).

### 6.8 Schema-Extensions in `src/lib/mock-backend/schemas.ts`

```ts
import { z } from 'zod';

export const feKlasseSchema = z.object({
  klasse: z.string().regex(/^(A1|A2|A|B|BE|C1|C|CE|D1|D|DE|T|L|AM)$/),
  erteilt_am: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  gueltig_bis: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  schluesselzahlen: z.array(z.string()),
});

export const fahrerlaubnisSchema = z.object({
  fe_nr: z.string().regex(/^\[MOCK\] [A-Z]\d{3}[A-Z0-9]{5}[0-9X]\d$/),
  bundesland_kennzeichen: z.string().length(1),
  fe_behoerde_id: z.string(),
  klassen: z.array(feKlasseSchema).min(1),
  ausstellungsdatum: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  pflichtumtausch_stichtag: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  pflichtumtausch_status: z.enum(['nicht_relevant', 'frist_aktiv', 'frist_abgelaufen_offen', 'umtausch_erfolgt']),
  pflichtumtausch_erfolgt_am: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  fe_aktenzeichen: z.string(),
});

export const kfzHalterSchema = z.object({
  kennzeichen: z.string(),
  marke: z.string(),
  modell: z.string(),
  baujahr: z.string().regex(/^\d{4}$/),
  fin_voll: z.string().regex(/^\[MOCK\] [A-HJ-NPR-Z0-9]{17}$/),
  fin_masked: z.string(),
  zulassungsstelle_id: z.string(),
  hu_bis: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  evb_nummer: z.string(),
  zulassung_aktenzeichen: z.string(),
  mitnutzer: z.array(z.object({ vorname: z.string(), nachname: z.string() })).optional(),
});

export const halterAdresseSchema = z.object({
  strasse: z.string(),
  hausnummer: z.string(),
  plz: z.string().regex(/^\d{5}$/),
  ort: z.string(),
  uebergangs_marker_via_umzug: z.boolean(),
  uebergangs_marker_seit: z.string().optional(),
  via_umzug_vorgang_id: z.string().optional(),
});

export const mobilitaetSchema = z.object({
  fahrerlaubnis: fahrerlaubnisSchema.optional(),
  halter: z.array(kfzHalterSchema),
  halter_adresse: halterAdresseSchema.optional(),
}).strict(); // .strict() ist HL-MOB-11 / VL-4 critical: `punkte` und andere
            //  Excess-Keys werden vom Schema rejected.
```

**VL-4-Test** auf das Schema: `expect(() => mobilitaetSchema.parse({ punkte:
3, halter: [] })).toThrow()` — siehe § 13.

---

## 7. i18n key inventory

> **Übersetzungs-Scope V1.3**: alle neuen Strings × 6 Locales (DE source +
> EN/RU/UK/AR/TR Übersetzung). DE = source-of-truth. i18n-localizer arbeitet
> nach demselben Pattern wie V1.1/V1.2 (Norm-Zitate literal preservieren,
> Datum-Formate DE bleiben DD.MM.YYYY in allen Locales).

**Zähler-Schätzung**: ~95 Top-Keys × 6 Locales ≈ ~570 neue String-Werte.

### 7.1 Disclaimer-Strings (HL-MOB-12 / VL-7, verbatim aus Domain-Doc § „Legal disclaimer to surface in UI")

| Key | DE-Quelle | Lokalisiert | Status |
|---|---|---|---|
| `stammdaten.disclaimer.fuehrerschein_lese_schicht` | Domain-Doc Disclaimer-1 verbatim („Diese App ist auch für die Mobilitäts-Sektion eine Lese- und Wegweiser-Schicht. … Keine Schreib-Operation in das Zentrale Fahrerlaubnisregister oder das örtliche FE-Register. Korrekturen erfolgen ausschließlich bei Ihrer kommunalen Fahrerlaubnisbehörde.") | 6 locales | NEW |
| `stammdaten.disclaimer.faer_punkte_on_demand` | Domain-Doc Disclaimer-2 verbatim („Ihr Punktestand wird niemals dauerhaft in dieser App gespeichert. … Jeder Abruf ist im Aktivitätsprotokoll dieser App protokolliert. …") | 6 locales | NEW |
| `stammdaten.disclaimer.kfz_halter_adresse_speculative` | Domain-Doc Disclaimer-3 verbatim („Bei Adressänderung müssen Sie nach § 15 FZV unverzüglich Ihre Zulassungsstelle informieren. Eine automatische Synchronisierung zwischen Bürgeramt und Zulassungsstelle gibt es heute (Mai 2026) nicht. Diese Demo simuliert ein 2027-Pattern. Im echten Verfahren stoßen Sie den i-Kfz-Vorgang Stufe 4 selbst an — die App zeigt Ihnen den Pre-Fill und den Wegweiser zu Ihrer Zulassungsstelle.") | 6 locales | NEW — **VL-14**: dieser Disclaimer-Text darf das Wort „automatische Synchronisierung" verwenden, **weil** er es als das-Verbotene zitiert, das es heute **nicht** gibt. CI-Grep-Lint VL-14 schließt diese Datei *explizit* aus dem Verbot aus (whitelist-Exception). Alle anderen Auftritte der Phrase bleiben verboten. |
| `stammdaten.disclaimer.eudi_mdl_speculative` | Domain-Doc Disclaimer-4 verbatim („Die hier gezeigte Vorschau eines mobilen EU-Führerscheins (mDL) als Wallet-Nachweis simuliert eine Vision für 2029-2031. Rechtsgrundlage: Richtlinie (EU) 2025/2205 vom 22.10.2025; Anwendungsbeginn 26.11.2029; mDL als Default-Format ~Mai 2031 (54 Monate nach erstem Implementing Act). National ist seit Ende 2026 ein digitaler Führerschein in der i-Kfz-App des Kraftfahrt-Bundesamts geplant — diese Demo zeigt nicht die i-Kfz-App, sondern das hypothetische Konvergenz-Bild zur EUDI-Wallet.") | 6 locales | NEW |
| `stammdaten.disclaimer.fe_nr_read_only` | „FE-Nummer ist ein authoritativer Register-Identifier (Zentrales Fahrerlaubnisregister, § 48 Abs. 2 StVG). Korrekturen erfolgen ausschließlich bei der kommunalen Fahrerlaubnisbehörde (§ 73 FeV)." | 6 locales | NEW |
| `stammdaten.disclaimer.fin_masked_default` | „Fahrgestellnummer (FIN) ist ein personenbezogener Identifier. Sie wird hier standardmäßig maskiert dargestellt; volle Anzeige nur auf Klick." | 6 locales | NEW |
| `stammdaten.disclaimer.mitnutzer_no_halter` | „Mitnutzer:innen sind rechtlich keine Halter:innen. Die § 15 FZV-Mitteilungspflicht trifft ausschließlich den Halter (FZV § 6)." | 6 locales | NEW |

### 7.2 Sektion-Header + Disclosure-Labels

| Key | DE | Lokalisiert |
|---|---|---|
| `stammdaten.sektion.mobilitaet.title` | „Mobilität (Führerschein + Fahrzeuge)" | 6 locales |
| `stammdaten.sektion.mobilitaet.subtitle` | „Fahrerlaubnis, Punktestand, eigene Fahrzeuge — als Lese- und Wegweiser-Schicht." | 6 locales |
| `stammdaten.mobilitaet.gruppe.fahrerlaubnis.label` | „Fahrerlaubnis" | 6 locales |
| `stammdaten.mobilitaet.gruppe.halter.label` | „KFZ-Halter" | 6 locales |
| `stammdaten.mobilitaet.gruppe.wallet_cross_ref.label` | „Mobiler Führerschein (mDL) im Wallet" | 6 locales |

### 7.3 FieldCard-Labels — Fahrerlaubnis

| Key | DE | Lokalisiert |
|---|---|---|
| `stammdaten.mobilitaet.fe.fe_nr_label` | „Fahrerlaubnis-Nummer (FE-Nr)" | 6 locales |
| `stammdaten.mobilitaet.fe.fe_behoerde_label` | „Ausstellende Fahrerlaubnisbehörde" | 6 locales |
| `stammdaten.mobilitaet.fe.ausstellungsdatum_label` | „Ausstellungsdatum (deutsche Karte)" | 6 locales |
| `stammdaten.mobilitaet.fe.klassen_disclosure_collapsed` | „Klassen und Schlüsselzahlen anzeigen" | 6 locales |
| `stammdaten.mobilitaet.fe.klassen_disclosure_expanded` | „Klassen und Schlüsselzahlen ausblenden" | 6 locales |
| `stammdaten.mobilitaet.fe.klasse_erteilt_label` | „Erteilt am {datum}" | 6 locales |
| `stammdaten.mobilitaet.fe.klasse_gueltig_unbefristet` | „gültig unbefristet" | 6 locales |
| `stammdaten.mobilitaet.fe.klasse_gueltig_bis_label` | „gültig bis {datum}" | 6 locales |
| `stammdaten.mobilitaet.fe.schluesselzahl.95` | „95 — Berufskraftfahrer:innen-Qualifikation (BKrFQG), 5 Jahre gültig" | 6 locales |
| `stammdaten.mobilitaet.fe.schluesselzahl.70` | „70 — Umtausch-Kennzeichnung" | 6 locales |
| `stammdaten.mobilitaet.fe.schluesselzahl.78` | „78 — Beschränkung auf Fahrzeuge mit Automatikgetriebe" | 6 locales |
| `stammdaten.mobilitaet.fe.schluesselzahl.79` | „79 — Beschränkung Anhängelast" | 6 locales |
| `stammdaten.mobilitaet.fe.schluesselzahl.79_06` | „79.06 — Klasse B mit Trike-Erweiterung" | 6 locales |
| `stammdaten.mobilitaet.fe.schluesselzahl.96` | „96 — Anhängerlast Vorstufe zu BE" | 6 locales |
| `stammdaten.mobilitaet.fe.korrekturweg_cta` | „Korrekturweg → kommunale FE-Behörde" | 6 locales |
| `stammdaten.mobilitaet.fe.korrekturweg_modal.title` | „Korrekturen Ihrer Fahrerlaubnis-Daten" | 6 locales |
| `stammdaten.mobilitaet.fe.korrekturweg_modal.body` | „Korrekturen an FE-Nummer, Klassen oder Schlüsselzahlen erfolgen ausschließlich bei Ihrer kommunalen Fahrerlaubnisbehörde (§ 73 FeV). Diese App ist nicht-hoheitlich und kann keine Korrekturen vornehmen. Wegweiser zur zuständigen Stelle:" | 6 locales |

### 7.4 Pflichtumtausch-Banner

| Key | DE | Lokalisiert |
|---|---|---|
| `stammdaten.mobilitaet.pflichtumtausch.title` | „Pflichtumtausch Führerschein (Anlage 8a FeV)" | 6 locales |
| `stammdaten.mobilitaet.pflichtumtausch.frist_aktiv.body` | „Ihr Führerschein muss bis {stichtag} umgetauscht werden. Anlage 8a FeV legt Stichtage abhängig von Geburtsjahr und Ausstellungsdatum fest (§ 6 Abs. 7 FeV). Wegweiser: Termin bei {fe_behoerde_name} buchen." | 6 locales |
| `stammdaten.mobilitaet.pflichtumtausch.frist_aktiv.cta` | „Termin bei {fe_behoerde_name}" | 6 locales |
| `stammdaten.mobilitaet.pflichtumtausch.frist_aktiv.warning_30d` | „Frist läuft in weniger als 30 Tagen ab — bitte zeitnah handeln." | 6 locales |
| `stammdaten.mobilitaet.pflichtumtausch.frist_abgelaufen.body` | „Pflichtumtausch-Stichtag {stichtag} ist abgelaufen. Mit dem alten Führerschein können Sie aktuell keinen Nachweis Ihrer Fahrberechtigung erbringen (Ordnungswidrigkeit § 75 Nr. 4 FeV). Wegweiser: Termin bei {fe_behoerde_name} buchen." | 6 locales |
| `stammdaten.mobilitaet.pflichtumtausch.umtausch_erfolgt.body` | „Umtausch erfolgt am {erfolgt_am}. Ihr aktueller EU-Kartenführerschein ist gültig." | 6 locales |
| `stammdaten.mobilitaet.pflichtumtausch.stiller_hinweis` | „Stichtag-Berechnung benötigt Geburtsjahr und Ausstellungsdatum im Profil — bitte Bürgeramt-Datenkranz prüfen." | 6 locales — **VL-6 stiller Hinweis** wenn Daten unvollständig |

### 7.5 Punktestand on-demand

| Key | DE | Lokalisiert |
|---|---|---|
| `stammdaten.mobilitaet.punkte.title` | „Punktestand im Fahreignungsregister" | 6 locales |
| `stammdaten.mobilitaet.punkte.cta_pull` | „Punktestand abrufen (eID-Reauth, Mock)" | 6 locales |
| `stammdaten.mobilitaet.punkte.cta_pull_disabled_no_fe` | „Erfordert eingetragene Fahrerlaubnis" | 6 locales |
| `stammdaten.mobilitaet.punkte.cta_pull_again` | „Punktestand erneut abrufen" | 6 locales |
| `stammdaten.mobilitaet.punkte.modal.title` | „Punktestand abrufen — Einwilligung erforderlich" | 6 locales |
| `stammdaten.mobilitaet.punkte.modal.body` | „Ein FAER-Abruf nach § 30 Abs. 8 StVG erfordert eine eID-Authentifizierung (§ 30a StVG) und wird im Aktivitätsprotokoll dieser App protokolliert. Das Ergebnis wird nur für 5 Minuten in dieser Ansicht gehalten und nirgendwo dauerhaft gespeichert. Möchten Sie den simulierten Abruf jetzt durchführen?" | 6 locales |
| `stammdaten.mobilitaet.punkte.modal.consent_toggle_label` | „Ich willige in den simulierten FAER-Abruf nach § 30 Abs. 8 StVG ein." | 6 locales |
| `stammdaten.mobilitaet.punkte.modal.cta_confirm` | „Punktestand abrufen (Mock)" | 6 locales |
| `stammdaten.mobilitaet.punkte.modal.cta_cancel` | „Abbrechen" | 6 locales |
| `stammdaten.mobilitaet.punkte.result.label` | „Punktestand zum Stichtag" | 6 locales |
| `stammdaten.mobilitaet.punkte.result.zero_punkte` | „0 Punkte" | 6 locales |
| `stammdaten.mobilitaet.punkte.result.value` | „{punkte} Punkt(e)" | 6 locales |
| `stammdaten.mobilitaet.punkte.result.stichtag_label` | „Stand der zugrundeliegenden Eintragungen: {stichtag}" | 6 locales |
| `stammdaten.mobilitaet.punkte.result.aktenzeichen_label` | „Geschäftszeichen: {aktenzeichen}" | 6 locales |
| `stammdaten.mobilitaet.punkte.result.ttl_countdown` | „Gilt noch {seconds} Sekunden — danach wird das Ergebnis verworfen." | 6 locales |
| `stammdaten.mobilitaet.punkte.result.ttl_expired` | „Ergebnis verworfen — bitte erneut abrufen, falls benötigt." | 6 locales |
| `stammdaten.mobilitaet.punkte.error.toast` | „FAER-Abruf temporär nicht verfügbar — bitte erneut versuchen." | 6 locales |

### 7.6 KFZ-Halter

| Key | DE | Lokalisiert |
|---|---|---|
| `stammdaten.mobilitaet.halter.card_title` | „Eigenes Fahrzeug" | 6 locales |
| `stammdaten.mobilitaet.halter.kennzeichen_label` | „Kennzeichen" | 6 locales |
| `stammdaten.mobilitaet.halter.fin_label` | „Fahrgestellnummer (FIN, masked)" | 6 locales |
| `stammdaten.mobilitaet.halter.fin_reveal_cta` | „Vollständige FIN anzeigen" | 6 locales |
| `stammdaten.mobilitaet.halter.fin_hide_cta` | „FIN wieder maskieren" | 6 locales |
| `stammdaten.mobilitaet.halter.fin_aria_label_masked` | „Fahrgestellnummer maskiert, letzte vier Stellen {tail}" | 6 locales |
| `stammdaten.mobilitaet.halter.fin_aria_label_full` | „Fahrgestellnummer vollständig: {fin}" | 6 locales |
| `stammdaten.mobilitaet.halter.marke_modell_baujahr` | „{marke} {modell} · Baujahr {baujahr}" | 6 locales |
| `stammdaten.mobilitaet.halter.hu_label` | „Hauptuntersuchung gültig bis" | 6 locales |
| `stammdaten.mobilitaet.halter.hu_frist_warning_90d` | „HU-Frist läuft in {days} Tagen ab" | 6 locales |
| `stammdaten.mobilitaet.halter.evb_label` | „eVB-Nummer (Versicherer-Bestätigung)" | 6 locales |
| `stammdaten.mobilitaet.halter.zulassungsstelle_label` | „Zulassungsstelle" | 6 locales |
| `stammdaten.mobilitaet.halter.mitnutzer_pill` | „Mitnutzer:in: {vorname} {nachname}" | 6 locales |
| `stammdaten.mobilitaet.halter.mitnutzer_pill_tooltip` | „Mitnutzer:innen sind rechtlich keine Halter:innen. § 15 FZV-Mitteilungspflicht trifft nur den Halter (FZV § 6); diese App bildet die Halter-Eigenschaft ab, nicht die Nutzungs-Realität." | 6 locales |
| `stammdaten.mobilitaet.halter.empty_state.title` | „Keine eigenen Fahrzeuge im Profil" | 6 locales |
| `stammdaten.mobilitaet.halter.empty_state.body` | „Sie sind nicht als Halter:in eines Fahrzeugs hinterlegt. Falls Sie ein Fahrzeug nutzen, das auf jemand anderen zugelassen ist, sind Sie Mitnutzer:in — die § 15 FZV-Mitteilungspflicht trifft Sie nicht." | 6 locales |

### 7.7 Halter-Adresse + Umzug-Bridge (VL-13)

| Key | DE | Lokalisiert |
|---|---|---|
| `stammdaten.field_card.halter_adresse.title` | „Halter-Anschrift (Zulassungsstelle)" | 6 locales |
| `stammdaten.field_card.halter_adresse.label_strasse_hausnummer` | „{strasse} {hausnummer}" | 6 locales |
| `stammdaten.field_card.halter_adresse.label_plz_ort` | „{plz} {ort}" | 6 locales |
| `stammdaten.field_card.halter_adresse.uebergangs_badge_via_umzug` | „Adressänderung über Umzug-Vorgang ausgelöst — Bestätigung der Zulassungsstelle steht aus." | 6 locales — **VL-13 verbatim** |
| `stammdaten.field_card.halter_adresse.uebergangs_badge_tooltip` | „Wir haben den Pre-Fill der i-Kfz-Adressänderung (§ 15 FZV) für Sie vorbereitet — die Bestätigung Ihrer Zulassungsstelle erhalten Sie auf dem regulären Weg. Diese App ist nicht-hoheitlich; sie hat die Adresse nicht selbst geändert." | 6 locales |
| `stammdaten.field_card.halter_adresse.sync_status_known` | „bekannt — keine offene Mitteilung nach § 15 FZV" | 6 locales |

### 7.8 Activity-Log-Notes (VL-8 / VL-13)

| Key | DE | Lokalisiert |
|---|---|---|
| `stammdaten.aktivitaet.note.kfz_faer_punkte_pulled` | „FAER-Selbstauskunft simuliert; Punktestand {punkte} (Stand {stichtag}); Az. {aktenzeichen}. Ergebnis nicht persistiert (TTL 5 min). Rechtsgrundlage § 30 Abs. 8 StVG." | 6 locales — VL-8 |
| `stammdaten.aktivitaet.note.kfz_halter_adresse_prefilled_via_umzug` | „Pre-Fill der i-Kfz-Adressänderung (§ 15 FZV) über Umzug-Vorgang {vorgang_id} ausgelöst. Bestätigung der Zulassungsstelle steht aus." | 6 locales — VL-13 verbatim |
| `stammdaten.aktivitaet.note.kfz_korrekturweg_fe_cta_opened` | „Korrekturweg-CTA für Fahrerlaubnisbehörde {behoerde_name} geöffnet." | 6 locales |
| `stammdaten.aktivitaet.note.kfz_mdl_preview_opened` | „mDL-Mock-Vorschau geöffnet (2029-Vision, kein echter Issuance-Vorgang)." | 6 locales |

### 7.9 Wallet-Sub-Tab mDL (VL-7, VL-9)

| Key | DE | Lokalisiert |
|---|---|---|
| `stammdaten.wallet.mdl.title` | „Mobiler EU-Führerschein (mDL) — Mock-Vorschau" | 6 locales |
| `stammdaten.wallet.mdl.status_not_issued` | „Noch nicht ausgestellt — mDL-Default voraussichtlich ab ~Mai 2031" | 6 locales — VL-7 |
| `stammdaten.wallet.mdl.preview_cta` | „Vorschau öffnen" | 6 locales |
| `stammdaten.wallet.mdl.cross_ref_from_mobilitaet` | „mDL im Wallet ansehen → Sub-Tab Wallet & Externe Empfänger" | 6 locales |
| `stammdaten.wallet.mdl.modal.title` | „mDL-Attestation — Vorschau (Mock)" | 6 locales |
| `stammdaten.wallet.mdl.modal.disclaimer_header` | „Diese Vorschau bildet eine hypothetische mDL-Attestation nach RL (EU) 2025/2205 ab. Anwendungsbeginn 26.11.2029; mDL-Default ~Mai 2031. Keine echte Issuance." | 6 locales — VL-7 |
| `stammdaten.wallet.mdl.modal.toggle_group_label` | „Selective Disclosure — welche Attribute möchten Sie freigeben?" | 6 locales |
| `stammdaten.wallet.mdl.modal.toggle.given_name` | „Vorname" | 6 locales |
| `stammdaten.wallet.mdl.modal.toggle.family_name` | „Nachname" | 6 locales |
| `stammdaten.wallet.mdl.modal.toggle.birth_date` | „Geburtsdatum" | 6 locales |
| `stammdaten.wallet.mdl.modal.toggle.age_over_18` | „Über 18 Jahre" | 6 locales |
| `stammdaten.wallet.mdl.modal.toggle.age_in_years` | „Alter in Jahren" | 6 locales |
| `stammdaten.wallet.mdl.modal.toggle.driving_privileges` | „Fahrerlaubnis-Klassen + Schlüsselzahlen + Daten" | 6 locales |
| `stammdaten.wallet.mdl.modal.toggle.portrait` | „Lichtbild" | 6 locales |
| `stammdaten.wallet.mdl.modal.toggle.signature_usual_mark` | „Unterschrift" | 6 locales |
| `stammdaten.wallet.mdl.modal.toggle.issue_date` | „Ausstellungsdatum" | 6 locales |
| `stammdaten.wallet.mdl.modal.toggle.expiry_date` | „Ablaufdatum" | 6 locales |
| `stammdaten.wallet.mdl.modal.toggle.issuing_authority` | „Ausstellende Behörde" | 6 locales |
| `stammdaten.wallet.mdl.modal.toggle.issuing_country` | „Ausstellender Staat" | 6 locales |
| `stammdaten.wallet.mdl.modal.toggle.document_number` | „FE-Nummer (document_number)" | 6 locales |
| `stammdaten.wallet.mdl.modal.toggle.un_distinguishing_sign` | „UN-Unterscheidungszeichen (D)" | 6 locales |
| `stammdaten.wallet.mdl.modal.preview_json_label` | „Mock-Attestation-Vorschau (selected fields):" | 6 locales |

### 7.10 Block-D Co-Correction (VL-14) — rewrites existing keys

Diese Keys **existieren bereits** (V1 Umzug-Autopilot). V1.3 schreibt
die DE-Werte um und i18n-localizer überträgt in alle 5 weiteren Locales:

| Key | DE — V1 alt (zu ersetzen) | DE — V1.3 neu | Lokalisiert |
|---|---|---|---|
| `umzug.preview.block_d.title` | „Wir bereiten vor — Sie bestätigen mit eID" | unverändert (passt) | 6 locales — unverändert |
| `vorgang.umzug.block_d.kfz.aktion` (or whichever key the umzug.ts step uses) | „Halter-Adressänderung Zulassungsbescheinigung Teil I (§ 15 FZV)" | **neu**: „Pre-Fill der i-Kfz-Adressänderung gemäß § 15 FZV" | 6 locales — REWRITE |
| `vorgang.umzug.block_d.kfz.brief_floskel` (Body in `BLOCK_D[0].briefTemplate.floskel`) | „in oben genannter Angelegenheit haben wir die Halteranschrift Ihres Fahrzeugs auf Ihre neue Anschrift aktualisiert: {neue_adresse}. Eine neue Zulassungsbescheinigung Teil I geht Ihnen in den nächsten Werktagen postalisch zu." | **neu**: „in oben genannter Angelegenheit bestätigen wir den Eingang Ihrer Mitteilung nach § 15 FZV. Wir haben den Pre-Fill der i-Kfz-Adressänderung mit Ihrer neuen Anschrift vorbereitet: {neue_adresse}. Eine neue Zulassungsbescheinigung Teil I geht Ihnen in den nächsten Werktagen postalisch zu." | 6 locales — REWRITE — **VL-13 + VL-14**: das Wort „aktualisiert" wird entfernt; „Pre-Fill" + „§ 15 FZV" verwendet |
| `vorgang.umzug.block_d.kfz.betreff` | „Ihre Mitteilung gem. § 15 FZV — Halteranschrift {az}" | unverändert (passt) | 6 locales — unverändert |
| `vorgang.umzug.rechtsgrundlage.fzv_15` | „§ 15 FZV: Halter-Mitteilungspflicht bei Wohnsitzwechsel — Zulassungsbescheinigung Teil I unverzüglich aktualisieren." | **neu**: „§ 15 FZV: Halter-Mitteilungspflicht bei Wohnsitzwechsel — Zulassungsbescheinigung Teil I unverzüglich (i.d.R. innerhalb einer Woche) bei der Zulassungsstelle anpassen." | 6 locales — REWRITE — VL-2 + VL-13: „aktualisieren" → „anpassen"; „unverzüglich" + Faustregel-Klammer eingefügt |

> Frontend-coder + mock-backend-coder: die genauen Key-Namen folgen der
> bestehenden Struktur in `de.json` und `autopilot/umzug.ts`. Diese Tabelle
> ist die *Verpflichtungs*-Aussage; die genauen JSON-Keys können der
> Implementierung folgen, solange die DE-Werte den V1.3-Spaltenwerten
> entsprechen.

### 7.11 Empty-State (Lena Schmidt — OQ-2)

| Key | DE | Lokalisiert |
|---|---|---|
| `stammdaten.mobilitaet.fe.empty_state.title` | „Keine Fahrerlaubnis im Profil hinterlegt" | 6 locales |
| `stammdaten.mobilitaet.fe.empty_state.body` | „Sie haben keine Fahrerlaubnis im Profil hinterlegt. Sie können dies bei Ihrer Fahrerlaubnisbehörde ({fe_behoerde_default_name}) prüfen oder eine bereits bestehende FE über die ZFER-Selbstauskunft beim Kraftfahrt-Bundesamt (§ 30 StVG) in das Profil einlesen lassen." | 6 locales |

### 7.12 Misc — Toasts, Errors, Etc.

| Key | DE | Lokalisiert |
|---|---|---|
| `stammdaten.mobilitaet.toast.punkte_pulled` | „Punktestand erfolgreich abgerufen (Mock)." | 6 locales |
| `stammdaten.mobilitaet.toast.korrekturweg_modal_opened` | „Wegweiser-Modal geöffnet — Korrekturen bei kommunaler FE-Behörde." | 6 locales |
| `stammdaten.mobilitaet.error.load_failed` | „Mobilität-Daten konnten nicht geladen werden — bitte erneut versuchen." | 6 locales |

### 7.13 i18n-Localizer-Reminders V1.3

- **JSON.parse pre-flight** auf jedem der 6 Locale-Files vor PR-Push
  (V1.5-Ship-Lessons-Note).
- **`§§`-Literale preservieren**: § 4 StVG, § 28 StVG, § 30 Abs. 8 StVG,
  § 30a StVG, § 48 Abs. 2 StVG, § 65 StVG, § 47 FeV, § 73 FeV, § 6 Abs. 7
  FeV, § 15 FZV, § 57 FZV, § 60 FZV, Anlage 8a FeV, Anlage 9 FeV, Anlage 11
  FeV, RL (EU) 2025/2205, ISO/IEC 18013-5.
- **AR-Locale**: DE-Norm-Paragraph-Nummern literal beibehalten; Aktenzeichen-
  Formate LTR.
- **Klartext-Gesetzes-Erhalt-Rule**: in Disclaimer-Strings bleiben
  „Kraftfahrt-Bundesamt", „Fahrerlaubnisbehörde", „Zulassungsstelle",
  „Zentrales Fahrerlaubnisregister", „Fahreignungsregister",
  „Zentrales Fahrzeugregister", „Fahrzeug-Zulassungsverordnung",
  „Straßenverkehrsgesetz", „Fahrerlaubnis-Verordnung", „EUDI-Wallet",
  „BundID" als Eigennamen erhalten.
- **Datum-Formate**: `19.01.2027`, `26.11.2028`, `26.11.2029`, `Mai 2031`
  bleiben DE-Format in allen Locales.
- **VL-2 CI-Grep-Test** wird auf alle 6 Locales angewendet — i18n-Localizer
  muss vor PR-Push `npm run lint:i18n-vl-2` simulieren (siehe § 13).
- **VL-13 CI-Grep-Test**: `Halter[-_ ]?Adresse[-_ ]?aktualisiert`,
  `synchronisiert`, `automatische[r]? Synchron` werden in allen 6 Locales,
  in `letters.json`, und in `autopilot/umzug.ts` verboten. *Whitelist*:
  `stammdaten.disclaimer.kfz_halter_adresse_speculative` (zitiert die
  verbotene Phrase als das, was es **nicht** ist).

---

## 8. NormZitatLookup extensions (VL-3)

V1.3 erweitert die Lookup-Map (`src/components/posteingang/normZitatLookup.ts`)
um die folgenden Norm-Zitate. Pflicht-Unit-Test mit positiven *und* negativen
Assertions (siehe § 13):

### 8.1 Neue Einträge (positive assertions)

| Sichtbarer Text | `aria-label` |
|---|---|
| `§ 4 StVG` | „Paragraph 4 des Straßenverkehrsgesetzes" |
| `§ 28 StVG` | „Paragraph 28 des Straßenverkehrsgesetzes" |
| `§ 29 StVG` | „Paragraph 29 des Straßenverkehrsgesetzes" |
| `§ 30 StVG` | „Paragraph 30 des Straßenverkehrsgesetzes" |
| `§ 30 Abs. 8 StVG` | „Paragraph 30 Absatz 8 des Straßenverkehrsgesetzes" |
| `§ 30a StVG` | „Paragraph 30a des Straßenverkehrsgesetzes" |
| `§ 48 StVG` | „Paragraph 48 des Straßenverkehrsgesetzes" |
| `§ 48 Abs. 2 StVG` | „Paragraph 48 Absatz 2 des Straßenverkehrsgesetzes" |
| `§ 65 StVG` | „Paragraph 65 des Straßenverkehrsgesetzes" |
| `§ 47 FeV` | „Paragraph 47 der Fahrerlaubnis-Verordnung" |
| `§ 73 FeV` | „Paragraph 73 der Fahrerlaubnis-Verordnung" |
| `§ 6 Abs. 7 FeV` | „Paragraph 6 Absatz 7 der Fahrerlaubnis-Verordnung" |
| `§ 75 Nr. 4 FeV` | „Paragraph 75 Nummer 4 der Fahrerlaubnis-Verordnung" |
| `Anlage 8a FeV` | „Anlage 8a der Fahrerlaubnis-Verordnung" |
| `Anlage 9 FeV` | „Anlage 9 der Fahrerlaubnis-Verordnung" |
| `Anlage 11 FeV` | „Anlage 11 der Fahrerlaubnis-Verordnung" |
| `§ 15 FZV` | „Paragraph 15 der Fahrzeug-Zulassungsverordnung" |
| `§ 15 Abs. 4 FZV` | „Paragraph 15 Absatz 4 der Fahrzeug-Zulassungsverordnung" |
| `§ 57 FZV` | „Paragraph 57 der Fahrzeug-Zulassungsverordnung" |
| `§ 60 FZV` | „Paragraph 60 der Fahrzeug-Zulassungsverordnung" |
| `§ 75 Nr. 1 FZV` | „Paragraph 75 Nummer 1 der Fahrzeug-Zulassungsverordnung" |
| `§ 24 StVG` | „Paragraph 24 des Straßenverkehrsgesetzes" |
| `RL (EU) 2025/2205` | „Richtlinie (EU) 2025/2205 zur Modernisierung der EU-Führerschein-Regeln" |
| `ISO/IEC 18013-5` | „ISO/IEC-Norm 18013-5 für den mobilen Führerschein (mDL)" |

(Bereits in V1 vorhandene Einträge wie `§ 4 IDNrG` bleiben unverändert; VL-3
listet sie zur Vollständigkeit der Audit-Test-Coverage.)

### 8.2 Negative assertions (VL-3, Pflicht im Unit-Test)

```ts
// tests/unit/stammdaten-v1-3-norm-zitate-extension.test.ts

describe('V1.3 NormZitat negative-assertions (VL-3)', () => {
  it('§ 13 FZV resolves not to "Mitteilungspflicht"', () => {
    const label = NORM_ZITAT_ARIA_LABELS['§ 13 FZV'];
    // Korrekt: § 13 FZV (2023) = "Zulassungsbescheinigung Teil I", NICHT
    // Mitteilungspflicht. Wenn V1.3 § 13 FZV überhaupt nicht in die Map
    // aufnimmt, ist label === undefined — auch ok.
    if (label !== undefined) {
      expect(label).not.toMatch(/Mitteilungspflicht/i);
    }
  });

  it('§ 32 FZV resolves not to "Halterdaten-Speicherung"', () => {
    const label = NORM_ZITAT_ARIA_LABELS['§ 32 FZV'];
    if (label !== undefined) {
      expect(label).not.toMatch(/Halterdaten/i);
      expect(label).not.toMatch(/Speicherung/i);
    }
  });

  it('§ 33 FZV is not in the V1.3 map (deprecated 2023-FZV-Renumbering)', () => {
    // § 33 FZV existiert in der FZV-2023 nicht mehr als Übermittlungs-
    // Norm; korrekt ist § 60 FZV-2023. V1.3 nimmt § 33 FZV NICHT auf.
    expect(NORM_ZITAT_ARIA_LABELS['§ 33 FZV']).toBeUndefined();
  });
});
```

### 8.3 Recht­sprechungs-Lookup (kein V1.3-Eintrag)

V1.1 hat einen Rechtsprechungs-Lookup eingeführt (`EuGH C-184/20` für Art-9-
DSGVO weite Auslegung). V1.3 ergänzt **keinen** neuen Rechtsprechungs-
Eintrag — die EU-mDL-Direktive ist eine Richtlinie, keine Rechtsprechung.
`RL (EU) 2025/2205` lebt im NormZitatSpan-Pfad (Regex erweitert um
`RL \(EU\) \d{4}/\d{4}`-Pattern).

---

## 9. Autopilot bridge: Umzug → Mobilität (VL-13 + VL-14 co-correction)

### 9.1 Trigger

**Existing**: Umzug-Autopilot Block-D Step für `kfz-berlin-labo` läuft, wenn
Persona `kfz_halter === true`. V1.3 ändert *nicht* den Trigger; V1.3 ändert
**Wording** und **Side-Effects**.

### 9.2 Step-Text-Co-Correction in `src/lib/mock-backend/autopilot/umzug.ts`

> Verbindlich. Diese Änderung **muss** in derselben PR wie V1.3 erfolgen
> (VL-14). Spec ist source-of-truth.

**Datei**: `src/lib/mock-backend/autopilot/umzug.ts`

**Block-D-Eintrag für `kfz-berlin-labo`** (heute Zeile 173–190 im Code,
siehe Spec-Inputs):

```ts
// VORHER (V1.0, mit Bug):
const BLOCK_D: BlockDEntry[] = [
  {
    behoerdeId: 'kfz-berlin-labo',
    aktion: 'Halter-Adressänderung Zulassungsbescheinigung Teil I (§ 15 FZV)',
    rechtsgrundlage: '§ 15 FZV + § 18 PAuswG eID',
    personaFlag: 'kfz_halter',
    visibleIf: (p) => p.kfz_halter === true,
    briefTemplate: {
      absender: 'Landesamt für Bürger- und Ordnungsangelegenheiten — KFZ-Zulassung\nJüterboger Straße 3, 10965 Berlin',
      betreffTemplate: 'Ihre Mitteilung gem. § 15 FZV — Halteranschrift {az}',
      floskel: 'in oben genannter Angelegenheit haben wir die Halteranschrift Ihres Fahrzeugs auf Ihre neue Anschrift aktualisiert:\n\n{neue_adresse}\n\nEine neue Zulassungsbescheinigung Teil I geht Ihnen in den nächsten Werktagen postalisch zu.',
      abschluss: 'Mit freundlichen Grüßen\nKFZ-Zulassung Berlin',
    },
  },
  // … (Familienkasse + LEA Einträge bleiben unverändert)
];
```

```ts
// NACHHER (V1.3, VL-13 + VL-14):
const BLOCK_D: BlockDEntry[] = [
  {
    behoerdeId: 'kfz-berlin-labo',
    aktion: 'Pre-Fill der i-Kfz-Adressänderung gemäß § 15 FZV',
    rechtsgrundlage: '§ 15 FZV + § 18 PAuswG eID',
    personaFlag: 'kfz_halter',
    visibleIf: (p) => p.kfz_halter === true,
    briefTemplate: {
      absender: 'Landesamt für Bürger- und Ordnungsangelegenheiten — KFZ-Zulassung\nJüterboger Straße 3, 10965 Berlin',
      betreffTemplate: 'Ihre Mitteilung gem. § 15 FZV — Halteranschrift {az}',
      floskel: 'in oben genannter Angelegenheit bestätigen wir den Eingang Ihrer Mitteilung nach § 15 FZV. Wir haben den Pre-Fill der i-Kfz-Adressänderung mit Ihrer neuen Anschrift vorbereitet:\n\n{neue_adresse}\n\nEine neue Zulassungsbescheinigung Teil I geht Ihnen in den nächsten Werktagen postalisch zu.',
      abschluss: 'Mit freundlichen Grüßen\nKFZ-Zulassung Berlin',
    },
  },
  // … (Familienkasse + LEA Einträge bleiben unverändert)
];
```

**Diff-Zusammenfassung**:

- `aktion`: „Halter-Adressänderung Zulassungsbescheinigung Teil I (§ 15
  FZV)" → „Pre-Fill der i-Kfz-Adressänderung gemäß § 15 FZV"
- `briefTemplate.floskel`: das Wort „aktualisiert" raus + „Pre-Fill" rein
  (siehe Diff oben)
- Alle anderen Felder bleiben unverändert
- Norm-Zitat „§ 15 FZV" bleibt korrekt erhalten

### 9.3 Side-Effect: Stammdaten-Activity-Log emittieren

Block-D-Erfolgs-Handler ruft additiv auf:

```ts
// src/lib/mock-backend/autopilot/umzug.ts — neue Aufruf-Stelle am Ende
// des Block-D-eID-Confirmation-Handlers (analog V1 appendStammdatenLogEntry
// aus V1.0):

await appendStammdatenMobilitaetLogEntry({
  persona_id: personaId,
  kategorie: 'behoerde_zu_buerger',  // V1.2-Kategorie
  field_id: 'kfz_halter_adresse',
  quelle: 'umzug_block_d',
  vorgang_id: vorgangId,
  note_key: 'stammdaten.aktivitaet.note.kfz_halter_adresse_prefilled_via_umzug',
  rechtsgrundlage: '§ 15 FZV (2023)',
});

// Zusätzlich: setze auf Persona.mobilitaet.halter_adresse den
// Übergangs-Marker:
await setHalterAdresseUebergangsMarker(personaId, vorgangId);
```

`setHalterAdresseUebergangsMarker` ist eine neue interne Mock-Backend-
Funktion, die den persistierten `Mobilitaet.halter_adresse.uebergangs_marker_via_umzug`
auf `true` setzt + Timestamp setzt. **Idempotent** (zweiter Block-D-Aufruf
für denselben Vorgang = no-op).

### 9.4 Bridge-UI-Effekt in `<HalterAdresseFieldCard>`

Wenn `mobilitaet.halter_adresse.uebergangs_marker_via_umzug === true`:

- `<UmzugBridgeBadge>` rendert mit Wortlaut aus i18n
  `stammdaten.field_card.halter_adresse.uebergangs_badge_via_umzug` (VL-13
  verbatim).
- Disclaimer-Marker `kfz_halter_adresse_speculative` als Card-Footer.
- Tooltip-Body: „Wir haben den Pre-Fill der i-Kfz-Adressänderung (§ 15
  FZV) für Sie vorbereitet — die Bestätigung Ihrer Zulassungsstelle
  erhalten Sie auf dem regulären Weg. …" (siehe § 7.7).

### 9.5 i18n-Co-Correction (VL-14)

Siehe § 7.10. Alle 6 Locales erhalten den korrigierten Block-D-Wording.
i18n-localizer übernimmt die DE-Werte als source-of-truth und übersetzt
in EN/RU/UK/AR/TR.

---

## 10. Edge cases

### 10.1 Graue Lappen / rosa Karte (pre-1998 personas)

**Status**: nicht im V1.3-Persona-Bestand. Anna (Ausstellung 2024), Schmidt
(Ausstellung 2002, also Plastik-Karten-Vorgänger ≥1998), Mehmet (Ausstellung
2010). Keine grauen-Lappen-Personas in V1.3.

**UI-Verhalten**, falls eine zukünftige Persona einen grauen Lappen hätte:
`pflichtumtausch_status: 'frist_abgelaufen_offen'` (Ausstellung pre-1999 →
Stichtag nach Geburtsjahr; alle Geburtsjahre 1971+ Stichtag bereits 19.01.2025
abgelaufen). UI rendert rote Banner-Variante (§ 7.4). Spec out-of-scope für
V1.3 weil keine Demo-Persona.

### 10.2 FE-Entzug + Wiedererteilung

**Status**: out-of-scope V1.3 (HL-MOB-2). FE-Entzug wird ausschließlich
über den Posteingang als Bescheid kommuniziert; UI-Stammdaten würde dann
die Klassen-Liste leeren. V1.3 baut keinen Render-Pfad für „FE entzogen"-
Zustand. Wegweiser-Hinweis in HL-MOB-2 Disclaimer-Wortlaut.

### 10.3 Mehrere Halter-Vorgänge bei einem Halter

**Status**: covered. Mehmet hat zwei Fahrzeuge → zwei `<KfzHalterKarte>`-
Renderings. Die `<HalterAdresseFieldCard>` rendert *einmal* pro Persona
(eine Halter-Anschrift gilt für alle Fahrzeuge derselben Person).

### 10.4 Halter ohne FE (V1.3-Persona-Konstellation nicht abgedeckt)

**Status**: kein V1.3-Persona-Eintrag hat Halter+keinen-FE-Konstellation;
alle 3 Halter (Anna, Schmidt, Mehmet) haben FE. **UI-Verhalten falls
eingeführt**: `<FuehrerscheinHauptkarte>` Empty-State (§ 7.11) + Halter-
Cards normal. Punktestand-CTA disabled (kein FE → kein Punktestand-Lookup
sinnvoll).

### 10.5 FE ohne Halter (z. B. Lena Schmidt hätte FE-Anteil im Profil)

**Status**: in V1.3 hat Lena **keinen FE** (OQ-2). Wenn eine Persona einen
FE *aber* keinen eigenen Halter hat: `<KfzHalterKarte>` Empty-State (§ 7.6)
+ FE-Cards normal + Punkte-CTA enabled. `<HalterAdresseFieldCard>` rendert
nicht (kein Halter-Status → keine Halter-Adresse).

### 10.6 Wallet-mDL nicht ausgestellt (Default für alle 3 V1.3-Personas)

**Status**: covered. `<WalletMdlCard>` zeigt Status-Pill „noch nicht
ausgestellt" + Vision-Banner; Preview-CTA bleibt klickbar (Modal mit
hypothetischer Mock-Attestation).

### 10.7 eAT-eID-nicht-aktiviert (Mehmet alt-state)

**Status**: in V1.3 ist Mehmets eID **aktiviert** (VL-11). Wenn eine
zukünftige Persona eAT-eID-nicht-aktiviert hat, wäre i-Kfz-Stufe-4 für
diese Persona nicht nutzbar; UI würde im Korrekturweg-Modal entsprechend
einen Wegweiser auf „eID-Aktivierung beim Bürgeramt oder LEA" zeigen.
V1.3-Demo-Pfad: Mehmet mit aktivierter eID.

### 10.8 Pflichtumtausch-Stichtag bereits abgelaufen ohne Umtausch

**Status**: `pflichtumtausch_status: 'frist_abgelaufen_offen'`. Banner rot,
Wortlaut § 7.4 mit Ordnungswidrigkeit-Hinweis (§ 75 Nr. 4 FeV). Kein
V1.3-Persona-Eintrag hat diesen Zustand; Demo-State Mehmet ist
`umtausch_erfolgt` (Erfolgs-Persona-Variante).

### 10.9 Pflichtumtausch-Stichtag <30 Tage (Frist-Warnung)

**Status**: covered. Schmidt-Vater Stichtag 2027-01-19; in 2026-05-13 sind
das ~250 Tage, daher *keine* 30-Tage-Warnung aktiv. Spec definiert
trotzdem die Warnung-Variante in § 7.4 (`warning_30d`) für künftige
Persona-Konstellationen. ARIA-Live-Region „polite" bei Banner-Render in
<30-Tage-Modus (§ 3.1 a11y).

### 10.10 Punktestand-Abruf-Fehler (5 % Mock-Error-Rate)

**Status**: covered. `getPunktestandOnDemand` läuft durch
`withLatency()` mit 5 % Error-Rate (V1-Standard-Profil per CLAUDE.md).
Bei Fehler: Toast „FAER-Abruf temporär nicht verfügbar — bitte erneut
versuchen" (§ 7.5 `stammdaten.mobilitaet.punkte.error.toast`). UI bleibt
in „CTA enabled"-Zustand; *kein* Activity-Log-Eintrag bei Fehler (nur
bei erfolgreichem Pull).

### 10.11 Block-D-Bridge-Marker bei Persona ohne `kfz_halter: true`

**Status**: defensive. `setHalterAdresseUebergangsMarker` prüft, dass
`mobilitaet.halter_adresse` existiert; sonst no-op + warn. Keine Crash-
Konstellation.

### 10.12 Persona-Boot ohne `mobilitaet`-Block (Lena Schmidt)

**Status**: covered. `getMobilitaet(lenaId)` → `null`. UI rendert Empty-
State (§ 7.11 + § 7.6). Punkte-CTA disabled.

### 10.13 mDL-Modal-Open ohne ausgewählte Toggles

**Status**: graceful. Default-State: alle Toggles off. Preview-JSON-Card
zeigt leere `{}` mit Hinweis „Wählen Sie oben Attribute aus, die freigegeben
werden sollen." VL-9 enforced über `ISO_18013_5_MDL_TOGGLE_SET` closed-
enum; verbotene Toggles können gar nicht gerendert werden.

### 10.14 Persona-Migration V12→V13 läuft auf bereits-migrierter Persistenz

**Status**: idempotent (VL-4). Migration prüft `schema-version` und
no-op-bypassed bei `'1.3'`.

---

## 11. HARD-LINES V1.3 (non-negotiable)

> Diese Sektion ist verifier-locked + domain-expert-locked. frontend-coder,
> mock-backend-coder und i18n-localizer dürfen hier **nicht** umformulieren
> oder lockern. Hard-Lines ergänzen die V1-Hard-Lines § 11.1–§ 11.20,
> V1.1-Hard-Lines § 11.21–§ 11.30, V1.2-Hard-Lines § 11.31–§ 11.41; diese
> bleiben unverändert in Kraft.

### § 11.1 HL-MOB-1 — Mobilität-Sektion ist Lese- und Wegweiser-Schicht

Inherited verbatim aus Domain-Doc HL-V1.1-1 (VL-1). Klassen-, Schlüsselzahl-,
Erteilungs- und Ablauf-Daten sind illustrativ aus den ZFER-Selbstauskunfts-
Pfaden des KBA und der kommunalen FE-Behörde zusammengeführt. **Keine
Schreib-Operation** in ZFER oder das örtliche FE-Register. Korrekturen
erfolgen ausschließlich bei der kommunalen Fahrerlaubnisbehörde
(§ 73 FeV). Disclaimer-Wortlaut `stammdaten.disclaimer.fuehrerschein_lese_
schicht` verbindlich auf Sektion-Header.

### § 11.2 HL-MOB-2 — Punktestand niemals als passive Anzeige

Inherited verbatim aus Domain-Doc HL-V1.1-1 + Spec-Probe 3.3 (VL-1, VL-4,
VL-8). § 30 Abs. 8 + § 30a StVG. UI-Konsequenz: on-demand-CTA mit
`<PunkteEidReauthModal>`-Pattern (Konsistenz zu V1-Religion + V1.1-Pflegegrad).
Mock-Result mit `[MOCK]`-Watermark. TTL ≤ 5 min in-memory. Activity-Log-
Eintrag pro Pull. Aktive FAER-Maßnahmen (Ermahnung, Verwarnung, MPU,
Entziehung) sind **out-of-scope V1.3** (HL-V1.1-2). Verweis im UI:
„Maßnahmen erhalten Sie direkt von Ihrer Fahrerlaubnisbehörde — siehe
Posteingang."

### § 11.3 HL-MOB-3 — FIN ist masked-by-default

Inherited verbatim aus Domain-Doc HL-V1.1-3 (VL-1, VL-7-companion). UI-
Pattern `WAU•••••••••2891` (letzte 4 Stellen sichtbar, on-click voll).
FIN ist personenbezogen-äquivalent (KBA-Selbstauskunft + Schadenakten +
Versicherungsbetrugsschutz). `<FinMaskedSpan>`-Komponente verbindlich.

### § 11.4 HL-MOB-4 — Halter-Adresse-Sync mit Bürgeramt: NIE auto-magisch

Inherited verbatim aus Domain-Doc HL-V1.1-4 + Verifier Probe 3.10 (VL-1,
VL-13, VL-14). Norm-Anker § 15 FZV (2023). Kein Push-Mechanismus aus
Melderegister. V1.3-UI rahmt die § 15 FZV-Pflicht **explizit** als
Bürger:in-Aktion. Block-D-Effekt ist „Sie haben den i-Kfz-Vorgang
ausgelöst — Pre-Fill bereit", nicht „Wir haben Ihre Halter-Adresse
geändert". Disclaimer-Wortlaut `stammdaten.disclaimer.kfz_halter_adresse_
speculative` verbindlich.

### § 11.5 HL-MOB-5 — Fahrerlaubnisbehörde ist `kategorie: kommune`

Inherited verbatim aus Domain-Doc HL-V1.1-5 + Verifier Probe 3.4 (VL-1,
VL-5). In `behoerden.json` zwingend kommunal. KBA ist `kategorie: bund`
(für Register-Auskunft, nicht Erlassorgan). Wegweiser-CTAs zeigen **immer**
auf wohnsitz-zugehörige untere Verwaltungsbehörde (§ 73 FeV). Stadtstaat-
Ausnahme: LABO Berlin, LBV Hamburg = `kategorie: kommune` (operative
Klassifikation), nicht `land`. Unit-Test VL-5 enforced.

### § 11.6 HL-MOB-6 — Pflichtumtausch-Banner nur bei vollständigen Daten

Inherited verbatim aus Domain-Doc HL-V1.1-6 (VL-1, VL-6). Banner sichtbar
**nur** wenn `geburtsjahr && ausstellungsdatum` beide bekannt sind. Sonst
stiller Hinweis `stammdaten.mobilitaet.pflichtumtausch.stiller_hinweis`.
Abgleich gegen § 6 Abs. 7 FeV + Anlage 8a (verbindlich verzitiert).

### § 11.7 HL-MOB-7 — mDL-Wallet-Mock = klar als 2029-2031-Vision gerahmt

Inherited verbatim aus Domain-Doc HL-V1.1-7 + Verifier Probe 3.1 + 3.9
(VL-1, VL-7). RL (EU) 2025/2205: Anwendungsbeginn 26.11.2029; mDL-Default
~Mai 2031. Disclaimer `stammdaten.disclaimer.eudi_mdl_speculative` auf
allen mDL-Mock-Cards verbindlich. **Naming distinct from V1 `2027_vision`-
pill**: mDL nutzt `2029_vision` oder `2031_default_vision` semantisch (per
VL-7) — niemals `2027_vision`. Vision-Banner-Komponente trägt explizit den
2031-Default als Header-Text.

### § 11.8 HL-MOB-8 — Digitaler Führerschein in i-Kfz-App ≠ EUDI-mDL

Inherited verbatim aus Domain-Doc HL-V1.1-8 (VL-1, VL-7-companion). Nationale
i-Kfz-App-Lösung (Ende 2026 real) und EU-mDL (2029-2031) sind zwei
verschiedene Artefakte. V1.3-Demo zeigt **nicht** die i-Kfz-App, sondern
das hypothetische Konvergenz-Bild zur EUDI-Wallet. Card-Hinweis: „In der
echten i-Kfz-App des KBA speicherbar — diese Demo zeigt das hypothetische
Konvergenz-Bild zur EUDI-Wallet."

### § 11.9 HL-MOB-9 — Selective-Disclosure-Toggles ISO-konform (closed enum)

Inherited verbatim aus Domain-Doc HL-V1.1-9 + Verifier Probe 3.6 (VL-1,
VL-9). Toggle-Set ausschließlich aus ISO/IEC 18013-5 Annex B (§ 5.5
Konstante `ISO_18013_5_MDL_TOGGLE_SET`). Forbidden Toggles: „Punktezahl",
„Bezirk der FE-Behörde", „MPU-Status", „Schlüsselzahl 95 isoliert",
„FAER-Eintragungen". Unit-Test VL-9 enforced (siehe § 13).

### § 11.10 HL-MOB-10 — Kein FE-Nr / FIN Self-Edit-Affordance, kein Speculative-Push-Modal

Inherited verbatim aus Verifier HL-MOB-10 + Probe 3.11 (VL-10). `Persona`-
und `Mobilitaet`-Schema halten FE-Nr / FIN-Strings **nur** als Mock-
Snapshot-Werte aus `seed.ts`. Es darf **kein** UI-Control geben, das
diese Werte mutiert. Insbesondere: **kein `<FeNrSpeculativePushModal>`,
kein `<FinSpeculativePushModal>`, kein `<HalterAdresseSpeculativePushModal>`**.
Das IBAN-Speculative-Push-Pattern aus V1 wird hier nicht reused (Probe
3.11 Reasoning: ZFER ist unidirektionaler authoritativer Quellen-Register;
„FE-Nr push"-Modal wäre semantisch nonsensical und würde HL-MOB-1
unterlaufen).

### § 11.11 HL-MOB-11 — `punkte: number` MUSS NICHT als persistiertes Feld existieren

Inherited verbatim aus Verifier HL-MOB-11 + Probe 3.3 + 3.7 (VL-4, VL-8).
On-demand pull only; lebt in component-local state mit TTL ≤ 5 min in-
memory; **niemals** in `localStorage`-Persona-Migration. Unit-Test:
`expect(persona).not.toHaveProperty('mobilitaet.punkte')`. Zod-Schema
`mobilitaetSchema.strict()` rejected `punkte`-Excess-Key. Aufruf
`mobilitaetSchema.parse({ punkte: 3, halter: [] })` muss throw werfen.

### § 11.12 HL-MOB-12 — Disclaimer-Key-Namens-Konvention

Inherited verbatim aus Verifier HL-MOB-12 (VL-1-companion + VL-7-companion).
Die vier neuen Disclaimer-Strings leben unter `stammdaten.disclaimer.*`
exakt wie Domain-Doc vorgegeben: `fuehrerschein_lese_schicht`,
`faer_punkte_on_demand`, `kfz_halter_adresse_speculative`,
`eudi_mdl_speculative`. **Kein** `mobilitaet.*` Parallel-Namespace
(V1.2 Followup-Anti-Pattern). Localizer-Parität 4 Disclaimer × 6 Locales
= 24 Pflicht-Strings (plus die ~88 weiteren UI-Copy-Keys = ~95+ Top-Keys
× 6 = ~570 Werte).

### § 11.13 HL-MOB-13 — Halter-Adresse FieldCard Copy Ban-List (Block-D-Wording-Trap)

Inherited verbatim aus Verifier HL-MOB-13 (VL-13). Die Phrase
`"Halter-Adresse aktualisiert"` ist case-insensitive **verboten** in
jeder Locale, jedem Component-Prop, jedem Activity-Log-Note, jedem
Mock-Brief-Body, jedem Autopilot-Step-Text. **Erlaubte** Wordings sind
ausschließlich:

- „Adressänderung über Umzug-Vorgang ausgelöst"
- „Pre-Fill der i-Kfz-Adressänderung bereit"
- „§ 15 FZV-Mitteilung pre-filled"
- „Bestätigung der Zulassungsstelle steht aus"

CI-Lint / Unit-Test auf i18n-Source grep-deniert `Halter[-_ ]?Adresse
[-_ ]?aktualisiert` (case-insensitive) across all 6 locale files +
`letters.json` + `autopilot/*.ts`. Whitelist-Exception: `stammdaten.
disclaimer.kfz_halter_adresse_speculative` (zitiert die verbotene
Phrase als das, was es nicht ist).

### § 11.14 HL-MOB-14 — „automatische Synchronisierung" / „automatic sync" Phrase-Ban

Inherited verbatim aus Verifier HL-MOB-14 + Probe 3.7 (VL-2, VL-13, VL-14).
Die Phrasen
- `automatische[r]? Synchron(?:isation|isierung)`
- `synchronisiert automatisch`
- `automatically synchron[ize]d`

und ihre RU/UK/AR/TR-Äquivalente sind **CI-verboten** in `de.json`,
`en.json`, `ru.json`, `uk.json`, `ar.json`, `tr.json`, allen Mock-Brief-
Bodies in `letters.json`, und allen Autopilot-Step-Texten in `src/lib/
mock-backend/autopilot/*.ts`. Existing Block-D-String wird in derselben
PR re-locked (VL-14 Co-Correction; § 9 dieser Spec). Whitelist-Exception:
`stammdaten.disclaimer.kfz_halter_adresse_speculative` (Zitat-Kontext).

Zusätzlich aus VL-2: die Phrase `7-Tage-Frist` / `Frist 7 Tage` /
`\b7[- ]Tage[- ]?Frist\b` ist verboten; § 15 FZV-Frist-Wording lautet
„unverzüglich (i.d.R. innerhalb einer Woche)". CI-Grep-Lint enforced.

---

## 12. Out-of-scope (explicit)

V1.3 macht **nicht**:

- **MPU-Vorgänge** (medizinisch-psychologische Untersuchung) — Posteingang-
  Bescheid-Pfad, nicht Stammdaten-Aggregation (HL-MOB-2).
- **FE-Entzug-Vorgänge** — Posteingang-Bescheid-Pfad, nicht Stammdaten-
  Render (HL-MOB-2).
- **Begleitetes-Fahren-ab-17-Antrag** — Wizard, nicht V1.3.
- **Internationaler-FE-Antrag** — Wizard, nicht V1.3.
- **KFZ-Steuer-Anbindung (BZSt)** — KFZ-Steuer ist BZSt-Domäne, nicht
  ZFZR; nicht V1.3.
- **Versicherungs-Wechsel-Vorgang** — Versicherer-Direktkontakt, nicht
  V1.3.
- **BSG-Punkte-Tilgungs-Wizard** — § 29 StVG Tilgungs-Logik; out-of-scope
  V1.3 (nur Punktestand-Snapshot, keine Tilgungs-Berechnung).
- **ZFER-Selbstauskunft-Wizard** — V1.3 zeigt FE-Daten als Mock-Snapshot;
  echter ZFER-Antrag-Wizard ist out-of-scope.
- **§ 45 FeV Akteneinsicht-Wizard** — Bürger:in-Akteneinsicht in örtliches
  FE-Register; out-of-scope V1.3 (Verifier Probe 3.x).
- **Halter-Wechsel-Vorgang (Kauf/Verkauf)** — i-Kfz Stufe 4 Außerbetriebsetzung
  + Wiederzulassung; out-of-scope V1.3.
- **Leasing/Carsharing-Halter-Pattern** — juristische Person als Halter;
  out-of-scope V1.3 (Halter = natürliche Person Annahme).
- **Anrechnung von ausländischen Klassen außerhalb Anlage 11 FeV** — nur
  Anna nutzt Anlage-11-Reziprozität (Russische Föderation als anerkennungs-
  fähiges Drittland); andere Drittstaaten out-of-scope.
- **Echte i-Kfz-Integration** — V1.3 zeigt Pre-Fill-Mock, keine echte API.
- **Echte mDL-Issuance** — V1.3 zeigt Selective-Disclosure-Mock-Vorschau,
  keine echte EUDI-Wallet-Issuance.
- **mDL-Online-Akzeptanz (ISO/IEC 18013-7)** — V1.3 zeigt nur proximity-
  flow-relevante Attribute; online-presentment out-of-scope.

---

## 13. Test plan

### 13.1 Unit tests (`tests/unit/`)

| Test-File | Was getestet wird | Locks |
|---|---|---|
| `tests/unit/stammdaten-v1-3-norm-zitate-extension.test.ts` | (a) alle § 8.1-Einträge in `NORM_ZITAT_ARIA_LABELS` (positive); (b) § 8.2 negative-assertions: `§ 13 FZV` ≠ „Mitteilungspflicht", `§ 32 FZV` ≠ „Halterdaten-Speicherung", `§ 33 FZV` undefined | VL-3 |
| `tests/unit/stammdaten-v1-3-persistence-migration.test.ts` | (a) Migration V12→V13 idempotent (2× Aufruf = identisch); (b) nach Migration kein `persona.mobilitaet.punkte` Feld; (c) Lena Schmidt `kfz_halter` korrigiert auf `false`; (d) Anna `halter_adresse.uebergangs_marker_via_umzug === true` | VL-4 |
| `tests/unit/stammdaten-v1-3-behoerden-kategorie.test.ts` | (a) Alle Entries mit `/Fahrerlaubnis|Fahrerlaubnisstelle|Zulassungsstelle|Kfz-Zulassung/i` haben `kategorie === 'kommune'`; (b) `kba-flensburg` hat `kategorie === 'bund'` | VL-5 |
| `tests/unit/stammdaten-v1-3-schema-no-punkte.test.ts` | (a) `mobilitaetSchema.parse({ punkte: 3, halter: [] })` wirft; (b) Persistenz-Bucket-Read entfernt `punkte` defensiv | VL-4, HL-MOB-11 |
| `tests/unit/stammdaten-v1-3-ban-list-grep.test.ts` | (a) Grep über alle 6 Locales + `letters.json` + `autopilot/*.ts` auf `Halter[-_ ]?Adresse[-_ ]?aktualisiert` (case-insensitive) — 0 matches außer Whitelist; (b) Grep auf `automatische[r]? Synchron`, `synchronisiert automatisch` — 0 matches außer Whitelist `stammdaten.disclaimer.kfz_halter_adresse_speculative`; (c) Grep auf `\b7[- ]Tage[- ]?Frist\b`, `\bFrist\s+7\s+Tage\b` — 0 matches | VL-2, VL-13, VL-14, HL-MOB-13, HL-MOB-14 |
| `tests/unit/stammdaten-v1-3-faer-on-demand-ttl.test.ts` | (a) `getPunktestandOnDemand` liefert `ttl_seconds === 300`; (b) Activity-Log-Eintrag erzeugt mit Note `kfz_faer_punkte_pulled` und Rechtsgrundlage `§ 30 Abs. 8 StVG i.V.m. § 30a StVG`; (c) Result **nicht** in localStorage geschrieben (Bucket-Read nach Aufruf = unchanged) | VL-8 |
| `tests/unit/stammdaten-v1-3-iso-mdl-toggle-enum.test.ts` | (a) `ISO_18013_5_MDL_TOGGLE_SET` enthält die 14 ISO-Attribute aus § 5.5; (b) enthält **nicht** `punkte`, `mpu_status`, `bezirk_der_fe_behoerde`, `schluesselzahl_95_isolated`, `faer_eintragungen`; (c) `<WalletMdlAttestationPreviewModal>` Toggle-Liste === `ISO_18013_5_MDL_TOGGLE_SET` (component-rendered toggles) | VL-9, HL-MOB-9 |
| `tests/unit/stammdaten-v1-3-pflichtumtausch-stichtag-lookup.test.ts` | (a) Lookup-Funktion gegen Anlage 8a FeV-Tabelle: Geburtsjahr 1988 + Ausstellung 2002 → Stichtag 2027-01-19 (Schmidt); (b) Geburtsjahr 1990 + Ausstellung 2010 → Stichtag 2025-01-19 (Mehmet, past); (c) Geburtsjahr 1997 + Ausstellung 2024 → undefined (Anna, nicht-relevant); (d) bei Geburtsjahr 1965-1970 + Ausstellung pre-1999 → 2024-01-19 (past — Demo-Edge-Case) | VL-6, HL-MOB-6 |
| `tests/unit/stammdaten-v1-3-fe-nr-format-validator.test.ts` | (a) Positive: `[MOCK] F0727RRE2I50`, `[MOCK] J0512SCH08X1`, `[MOCK] N0428MEH47K2` validieren; (b) Negative: zu kurz (10 Zeichen), zu lang (12), Bundesland-Buchstabe-Position-Mismatch, Prüfziffer-non-digit-non-X | — (Quality-Gate; nicht direkt verifier-locked, aber Spec-konsistenz) |
| `tests/unit/stammdaten-v1-3-block-d-wording.test.ts` | (a) `BLOCK_D[0].aktion` matched „Pre-Fill der i-Kfz-Adressänderung gemäß § 15 FZV"; (b) `BLOCK_D[0].briefTemplate.floskel` enthält **nicht** „aktualisiert" und enthält „Pre-Fill"; (c) i18n DE-Wert für `vorgang.umzug.rechtsgrundlage.fzv_15` enthält „unverzüglich (i.d.R. innerhalb einer Woche)" und **nicht** „7 Tage" | VL-13, VL-14, VL-2 |

### 13.2 E2E tests (`tests/e2e/`)

| Test-File | Was getestet wird |
|---|---|
| `tests/e2e/stammdaten-v1-3-pflichtumtausch-banner-schmidt.spec.ts` | Schmidt-Persona laden → `/stammdaten` → Sektion Mobilität expandieren → `<PflichtumtauschBanner>` mit Frist 19.01.2027 + CTA „Termin bei Landesbetrieb Verkehr Hamburg" sichtbar; Anna-Persona → kein Banner-Render; Mehmet → Success-Pill „Umtausch erfolgt am 14.01.2025" |
| `tests/e2e/stammdaten-v1-3-punkte-eid-reauth-flow.spec.ts` | Mehmet-Persona → `/stammdaten` → Mobilität-Sektion → „Punktestand abrufen" CTA → `<PunkteEidReauthModal>` öffnet → Consent-Toggle off (primary disabled) → toggle on → primary „Punktestand abrufen (Mock)" → Modal schließt → `<PunkteResultCard>` rendert mit „1 Punkt" + TTL-Countdown + Stand-Stempel; nach 5 min (oder fast-forward) → Card faded out + CTA wieder default |
| `tests/e2e/stammdaten-v1-3-korrekturweg-fe-cta.spec.ts` | Anna-Persona → `<KorrekturwegFeBehoerdeCTA>` → Modal öffnet mit LABO Berlin-Adresse + Wegweiser-Link; Modal close → Focus zurück auf CTA |
| `tests/e2e/stammdaten-v1-3-block-d-bridge-badge.spec.ts` | Anna-Persona (post-Umzug-Seed) → `/stammdaten` → Mobilität-Sektion → `<HalterAdresseFieldCard>` zeigt `<UmzugBridgeBadge>` mit Wortlaut „Adressänderung über Umzug-Vorgang ausgelöst — Bestätigung der Zulassungsstelle steht aus"; Schmidt + Mehmet → kein Badge-Render |
| `tests/e2e/stammdaten-v1-3-mdl-preview-modal.spec.ts` | Anna → Wallet-Sub-Tab → `<WalletMdlCard>` → „Vorschau öffnen" → Modal mit Vision-Banner (2031-Text) + 14 Toggles ISO-konform → Toggle „driving_privileges" + „expiry_date" an → Preview-JSON zeigt nur diese 2 Felder; Toggle „punkte" existiert **nicht** im DOM |
| `tests/e2e/stammdaten-v1-3-fin-mask-toggle.spec.ts` | Anna Halter-Card FIN default masked `WAUZZZ•••••••3456` → Klick „Vollständige FIN anzeigen" → voll sichtbar → Klick „FIN wieder maskieren" → masked |
| `tests/e2e/stammdaten-v1-3-empty-state-lena.spec.ts` | (sofern Lena als Persona im Persona-Switcher steht — V1.2-Bestand prüfen; sonst impliziter Test via Mehmet/Schmidt der `kfz_halter: false` für eine Partner-Sub-Persona darstellen würde — out-of-scope wenn UI Partner nicht selektierbar macht) FE-Empty-State + Halter-Empty-State |
| `tests/e2e/stammdaten-v1-3-i18n-coverage.spec.ts` | Jede der 6 Locales rendert die Mobilität-Sektion ohne „undefined" / Missing-Key-Indicator; alle 4 Disclaimer-Strings vorhanden in allen Locales |
| `tests/e2e/stammdaten-v1-3-block-d-no-banned-phrase.spec.ts` | Umzug-Wizard für Anna durchspielen → Block-D-Step-Brief im Posteingang öffnen → Body enthält **nicht** „aktualisiert" und enthält „Pre-Fill" + „§ 15 FZV" |

### 13.3 A11y tests (`tests/a11y/` per persona × Sektion)

| Test-File | Was getestet wird |
|---|---|
| `tests/a11y/stammdaten-v1-3-mobilitaet-anna.spec.ts` | axe-core 0 Verstöße auf `/stammdaten` mit Anna; Focus-Order korrekt (§ 3.1); Modal-Focus-Trap; `prefers-reduced-motion` respektiert beim UmzugBridgeBadge |
| `tests/a11y/stammdaten-v1-3-mobilitaet-schmidt.spec.ts` | axe-core 0 Verstöße mit Schmidt; Pflichtumtausch-Banner ARIA-Live „polite" nur bei <30d (nicht in 250d-Default-State, also kein Announce; bei FF-Date-Mock test der Announce-Pfad mit <30d-Stichtag); Mitnutzer-Pill Tooltip a11y |
| `tests/a11y/stammdaten-v1-3-mobilitaet-mehmet.spec.ts` | axe-core 0 Verstöße mit Mehmet (2 Halter-Cards → ARIA-Label-Eindeutigkeit für 2 FIN-Toggle-Buttons); Punkte-Modal-Focus-Trap; Punkte-Result-Card-Countdown ARIA-Live „polite" |
| `tests/a11y/stammdaten-v1-3-wallet-mdl-modal.spec.ts` | axe-core 0 Verstöße auf `<WalletMdlAttestationPreviewModal>`; Vision-Banner `role="note"`; Toggle-Group ARIA-Label; closed-enum-Audit auf gerenderter Toggle-Liste |
| `tests/a11y/stammdaten-v1-3-korrekturweg-modal.spec.ts` | axe-core 0 Verstöße auf `<KorrekturwegFeBehoerdeModal>`; aria-modal=true; Escape-Close |

**Lighthouse-Ziel**: A11y ≥ 95 (V1-V1.2-Pattern); 100 ist erreichbar.

---

## 14. Files-to-touch checklist (für downstream coders)

> Jede Zeile = ein File. **NEW** = neu anzulegen; **MODIFY** = existing extend.
> Reason = einzeiliger Grund.

### 14.1 Types

- **NEW** `src/types/mobilitaet.ts` — Mobilität-Block + Fahrerlaubnis + KfzHalter + HalterAdresse + FeKlasse Interfaces (§ 5.2)
- **MODIFY** `src/types/persona.ts` — additive `mobilitaet?: Mobilitaet`-Property (§ 5.1)
- **MODIFY** `src/types/mock-event.ts` — additive `StammdatenMobilitaetEvent`-Varianten (§ 6.7)

### 14.2 Mock-backend

- **NEW** `src/lib/mock-backend/mobilitaet/seed-mobilitaet.ts` — `SEED_MOBILITAET` pro Persona (§ 5.4)
- **NEW** `src/lib/mock-backend/mobilitaet/pflichtumtausch-stichtage.ts` — Anlage-8a-Lookup-Konstante (§ 6 / § 13.1)
- **NEW** `src/lib/mock-backend/wallet/iso-18013-5-toggle-set.ts` — closed-enum Toggle-Set (§ 5.5 / VL-9)
- **MODIFY** `src/lib/mock-backend/api.ts` — `getMobilitaet`, `getPunktestandOnDemand`, `getMdlAttestation`, `getUmzugVorgaengeFinished` (§ 6.1–6.4)
- **MODIFY** `src/lib/mock-backend/schemas.ts` — `mobilitaetSchema`, `fahrerlaubnisSchema`, `kfzHalterSchema`, `halterAdresseSchema`, `feKlasseSchema` (§ 6.8)
- **MODIFY** `src/lib/mock-backend/persistence-migrations.ts` — `migratePersonaV12ToV13` + Lena-Halter-Korrektur + Anna-Bridge-Marker (§ 5.3)
- **MODIFY** `src/lib/mock-backend/persistence.ts` — neuer Bucket-Key `govtech-de:v1:stammdaten:mobilitaet` Registrierung
- **MODIFY** `src/lib/mock-backend/autopilot/umzug.ts` — Block-D `aktion` + `briefTemplate.floskel` Rewrite (VL-13, VL-14; § 9.2) + `setHalterAdresseUebergangsMarker`-Call (§ 9.3)
- **MODIFY** `src/lib/mock-backend/seed.ts` — Import + Wire-up `SEED_MOBILITAET`
- **MODIFY** `src/data/personas.json` — additive `mobilitaet`-Block pro Persona; Lena-`kfz_halter`-Korrektur auf false; **kein** Anna-Staatsangehörigkeit-Change (bleibt `russisch` + `§ 18g AufenthG`)
- **MODIFY** `src/data/behoerden.json` — 7 neue Einträge (§ 5.6); Pflicht-Feld `bundid_postfach_anbindung` für die neuen, `kategorie` korrekt (VL-5)
- **MODIFY** `src/data/letters.json` — 3 neue Mock-Briefe (§ 5.7)

### 14.3 Frontend components

- **NEW** `src/components/stammdaten/mobilitaet/MobilitaetSektion.tsx`
- **NEW** `src/components/stammdaten/mobilitaet/FuehrerscheinHauptkarte.tsx`
- **NEW** `src/components/stammdaten/mobilitaet/FuehrerscheinKlassenList.tsx`
- **NEW** `src/components/stammdaten/mobilitaet/SchluesselzahlTooltip.tsx`
- **NEW** `src/components/stammdaten/mobilitaet/PflichtumtauschBanner.tsx`
- **NEW** `src/components/stammdaten/mobilitaet/PunktestandOnDemandCard.tsx`
- **NEW** `src/components/stammdaten/mobilitaet/PunkteEidReauthModal.tsx`
- **NEW** `src/components/stammdaten/mobilitaet/PunkteResultCard.tsx`
- **NEW** `src/components/stammdaten/mobilitaet/KfzHalterKarte.tsx`
- **NEW** `src/components/stammdaten/mobilitaet/FinMaskedSpan.tsx`
- **NEW** `src/components/stammdaten/mobilitaet/KfzMitnutzerPill.tsx`
- **NEW** `src/components/stammdaten/mobilitaet/HalterAdresseFieldCard.tsx`
- **NEW** `src/components/stammdaten/mobilitaet/UmzugBridgeBadge.tsx`
- **NEW** `src/components/stammdaten/mobilitaet/KorrekturwegFeBehoerdeCTA.tsx`
- **NEW** `src/components/stammdaten/mobilitaet/KorrekturwegFeBehoerdeModal.tsx`
- **NEW** `src/components/stammdaten/mobilitaet/WalletMdlCrossRefLink.tsx`
- **NEW** `src/components/stammdaten/wallet/WalletMdlCard.tsx`
- **NEW** `src/components/stammdaten/wallet/WalletMdlAttestationPreviewModal.tsx`
- **NEW** `src/components/stammdaten/wallet/VisionBanner2031.tsx`
- **MODIFY** `src/components/stammdaten/wallet/WalletSubTab.tsx` (or whichever V1-File) — additive `<WalletMdlCard>` als 2. Card neben PID
- **MODIFY** `src/components/posteingang/normZitatLookup.ts` — V1.3-Norm-Zitate ergänzen (§ 8)
- **MODIFY** `src/components/stammdaten/UebermittlungsLogList.tsx` — Render-Pfad für neue Note-Strings (`kfz_faer_punkte_pulled`, `kfz_halter_adresse_prefilled_via_umzug`)
- **MODIFY** `src/app/(app)/stammdaten/page.tsx` — Sektion-Render-Position: Mobilität zwischen V1.1-KV-Sektion und V1.2-Kontakt-Sektion einhängen

### 14.4 i18n

- **MODIFY** `src/lib/i18n/locales/de.json` — ~95 neue Top-Keys + Block-D-Rewrite-Werte (§ 7)
- **MODIFY** `src/lib/i18n/locales/en.json` — alle DE-Keys übersetzt
- **MODIFY** `src/lib/i18n/locales/ru.json` — dito
- **MODIFY** `src/lib/i18n/locales/uk.json` — dito
- **MODIFY** `src/lib/i18n/locales/ar.json` — dito (LTR-Pflicht-Aktenzeichen)
- **MODIFY** `src/lib/i18n/locales/tr.json` — dito

### 14.5 Tests

- **NEW** `tests/unit/stammdaten-v1-3-norm-zitate-extension.test.ts` (VL-3)
- **NEW** `tests/unit/stammdaten-v1-3-persistence-migration.test.ts` (VL-4)
- **NEW** `tests/unit/stammdaten-v1-3-behoerden-kategorie.test.ts` (VL-5)
- **NEW** `tests/unit/stammdaten-v1-3-schema-no-punkte.test.ts` (VL-4, HL-MOB-11)
- **NEW** `tests/unit/stammdaten-v1-3-ban-list-grep.test.ts` (VL-2, VL-13, VL-14, HL-MOB-13, HL-MOB-14)
- **NEW** `tests/unit/stammdaten-v1-3-faer-on-demand-ttl.test.ts` (VL-8)
- **NEW** `tests/unit/stammdaten-v1-3-iso-mdl-toggle-enum.test.ts` (VL-9)
- **NEW** `tests/unit/stammdaten-v1-3-pflichtumtausch-stichtag-lookup.test.ts` (VL-6)
- **NEW** `tests/unit/stammdaten-v1-3-fe-nr-format-validator.test.ts`
- **NEW** `tests/unit/stammdaten-v1-3-block-d-wording.test.ts` (VL-13, VL-14, VL-2)
- **NEW** `tests/e2e/stammdaten-v1-3-pflichtumtausch-banner-schmidt.spec.ts`
- **NEW** `tests/e2e/stammdaten-v1-3-punkte-eid-reauth-flow.spec.ts`
- **NEW** `tests/e2e/stammdaten-v1-3-korrekturweg-fe-cta.spec.ts`
- **NEW** `tests/e2e/stammdaten-v1-3-block-d-bridge-badge.spec.ts`
- **NEW** `tests/e2e/stammdaten-v1-3-mdl-preview-modal.spec.ts`
- **NEW** `tests/e2e/stammdaten-v1-3-fin-mask-toggle.spec.ts`
- **NEW** `tests/e2e/stammdaten-v1-3-i18n-coverage.spec.ts`
- **NEW** `tests/e2e/stammdaten-v1-3-block-d-no-banned-phrase.spec.ts`
- **NEW** `tests/a11y/stammdaten-v1-3-mobilitaet-anna.spec.ts`
- **NEW** `tests/a11y/stammdaten-v1-3-mobilitaet-schmidt.spec.ts`
- **NEW** `tests/a11y/stammdaten-v1-3-mobilitaet-mehmet.spec.ts`
- **NEW** `tests/a11y/stammdaten-v1-3-wallet-mdl-modal.spec.ts`
- **NEW** `tests/a11y/stammdaten-v1-3-korrekturweg-modal.spec.ts`

### 14.6 Docs (status update)

- **MODIFY** `CLAUDE.md` — Status-Line für Stammdaten V1.3 nach Ship aktualisieren (post-merge by orchestrator)

---

## 15. Followups (V1.3.1)

Folgendes wird in V1.3 **deliberately scope-out** und für V1.3.1 vorgemerkt:

### 15.1 Aus V1.0–V1.2 mitgenommen (Pre-existing)

- 14 pre-existing e2e/a11y test failures aus CLAUDE.md V1.0.1 Stammdaten-V1-
  Followup-Liste (Religion-Consent + Widerspruch + Familienkasse + pre-
  insertion-modal radio-timeout — task #60). V1.3 berührt diese Tests **nicht**.
- V1.2-Followups aus CLAUDE.md: 4 Playwright-Specs nicht als `test.skip`-
  Scaffold abgeliefert (`stammdaten-v1-1-kontakt-cards`, …); Spec § 3
  Sektions-Count 10 vs Runtime 11; Migration-Name `migrateKontaktV1ToV11`
  → eigentlich V1→V1.2; 2× `as unknown as`-Casts in
  `persistence-migrations.ts:379/389`.
- V1.1-Followups: stale doc-comment, declarative `STAMMDATEN_FIELD_DEFS[]`-
  Refactor, persona-address-vs-seedlog Drifts.

### 15.2 V1.3-spezifische Followups

- **mDL-Online-Presentment** (ISO/IEC 18013-7) Mock — V1.3 zeigt nur
  proximity-flow-Attribute; Online-Use-Case (z. B. Vermieter-Verifikation
  online) als Followup.
- **Schlüsselzahl-Lookup-Map vollständig (Anlage 9 FeV ~150 Codes)** —
  V1.3 nur 6 Codes (95, 70, 78, 79, 79.06, 96). Vollständige Map als
  V1.3.1.
- **i-Kfz-Stufe-4-Demo-Wizard** (Mehmet-Hook) — V1.3 hat Wegweiser-Modal;
  ein Wizard-Strang `/vorgaenge/neu/i-kfz` als V2-Demo-Feature.
- **ZFER-/FAER-/ZFZR-Selbstauskunft-Mock-Wizard** — V1.3 zeigt Daten als
  Snapshot, kein Wizard für Antrag-Stellung.
- **Halter-Wechsel-Vorgang** — separate Verkauf-/Kauf-Demo.
- **Berufskraftfahrer-Modul (BKrFQG)** — Schlüsselzahl 95-Erneuerung als
  eigene Frist-Card neben Pflichtumtausch.
- **HU-Frist-Warning-Card** — V1.3 zeigt HU-Datum als Field, aber kein
  separater Frist-Banner (90d-Warnung); als V1.3.1 nachschieben.
- **Internationale FE-Anerkennung (Anna)** — V1.3-Disclaimer „Anlage 11
  FeV reziprok"; ein Modal mit Erläuterung der Anerkennungs-Mechanik als
  V1.3.1-Followup.
- **WalletMdl Issuance-Flow Mock** — V1.3 zeigt nur Preview; eine simulierte
  Issuance-Sequenz (KBA als Issuer, 6 Mock-Schritte) als V2.
- **mDL Selective-Disclosure Audit-Log Visualisierung** — wer hat wann was
  abgefragt; nicht V1.3.
- **Wallet-mDL ↔ i-Kfz-App-Konvergenz-Visualisierung** — HL-MOB-8 sagt
  „zwei verschiedene Artefakte"; V1.3.1 könnte eine Comparison-Card
  rendern.

---

## Build log — mock-backend-coder

- **date**: 2026-05-13
- **types added/changed**:
  - NEW `src/types/mobilitaet.ts` — `Mobilitaet`, `Fahrerlaubnis`, `FeKlasse`,
    `KfzHalter`, `HalterAdresse`, `PflichtumtauschStatus`,
    `PunktestandPullResult`, `MdlAttestationMock`, `MdlAttestationPreviewData`,
    `MdlSelectiveDisclosureToggle` + constant `ISO_18013_5_MDL_TOGGLE_SET`.
  - MODIFY `src/types/persona.ts` — additive `mobilitaet?: Mobilitaet` field.
  - MODIFY `src/types/mock-event.ts` — 4 new `StammdatenMobilitaetEvent`
    variants (`-punkte-pulled`, `-mdl-preview-opened`,
    `-korrekturweg-fe-cta-opened`, `-halter-adresse-marker-set`).
  - MODIFY `src/types/index.ts` — barrel-export of V1.3 types.
- **api methods added** (all via Delegate-Pattern through `stammdatenV13Api`):
  - `getMobilitaet(personaId): Promise<Mobilitaet | null>`
  - `getPunktestandOnDemand(personaId): Promise<PunktestandPullResult>` —
    TTL 300 s, never written to localStorage (HL-MOB-11 / VL-8)
  - `getMdlAttestation(personaId): Promise<MdlAttestationMock | null>`
  - `getUmzugVorgaengeFinished(personaId): Promise<UmzugVorgangSummary[]>`
  - `setHalterAdresseUebergangsMarker(personaId, vorgangId): Promise<void>`
    — autopilot-callable, idempotent (Spec § 9.3)
- **autopilot orchestrators**:
  - MODIFY `src/lib/mock-backend/autopilot/umzug.ts` — Block-D-KFZ-Step
    rewrite (VL-13 + VL-14): `aktion` „Pre-Fill der i-Kfz-Adressänderung
    gemäß § 15 FZV"; `briefTemplate.floskel` ohne „aktualisiert", mit
    „Pre-Fill" + „§ 15 FZV".
  - MODIFY `src/lib/mock-backend/api.ts` `bestaetigeImpl` — nach
    erfolgreicher Block-D-eID-Bestätigung für `kfz-*`-Behörde: Aufruf von
    `setHalterAdresseUebergangsMarker` + Activity-Log-Eintrag
    `kfz_halter_adresse_prefilled_via_umzug` (Kategorie
    `behoerde_zu_buerger`, Rechtsgrundlage `§ 15 FZV (2023)`).
- **seed records added**:
  - 3 Persona-Mobilität-Blocks (Anna / Schmidt / Mehmet) — Spec § 5.4
    verbatim; Lena Schmidt `kfz_halter`-Korrektur auf `false` (VL-12).
  - 7 neue `behoerden.json`-Einträge: `kba-flensburg` (`bund`),
    `fe-berlin-labo` / `fe-hamburg-lbv` / `fe-koeln-stadt` / `kfz-hamburg-lbv`
    / `kfz-koeln-stadt` (alle `kommune` per VL-5), `labo-berlin` (kommune);
    plus In-place-Korrektur `kfz-berlin-labo` `land` → `kommune`.
  - 3 neue Mock-Briefe in `letters.json`:
    `letter-pflichtumtausch-fe-hamburg-schmidt-2026-05` (Schmidt — Frist
    19.01.2027), `letter-fzv-15-aufforderung-kfz-koeln-mehmet-2026-04`
    (Mehmet — § 15 FZV-Aufforderung), `letter-faer-auskunft-pdf-mehmet-2026-05`
    (Mehmet — FAER-Auskunft 1 Punkt).
  - 3 entsprechende `letter-summaries.json`-Einträge mit pre-open + post-open
    + citations.
  - `SEED_MOBILITAET`-Konstante in `src/lib/mock-backend/mobilitaet/seed-mobilitaet.ts`.
  - `PUNKTE_MOCK` (OQ-3: Anna 0, Schmidt 0, Mehmet 1) + `PUNKTE_STICHTAG_MOCK`.
- **persistence migration**:
  - `migratePersonaV12ToV13` (Alias `migrateMobilitaetV12ToV13`) in
    `src/lib/mock-backend/persistence-migrations.ts`. Schritte: punkte-Strip
    (HL-MOB-11 / VL-4), mobilitaet aus Seed kopieren (idempotent), Lena-
    Korrektur (VL-12), Mobilität-Bucket-Init, Schema-Version-Marker `'1.3'`.
  - Wiring in `runStorageMigrations`-Chain: `v12-to-v13-mobilitaet`.
- **zod schemas**:
  - MODIFY `src/lib/mock-backend/schemas.ts` — `feKlasseSchema`,
    `fahrerlaubnisSchema`, `kfzHalterSchema`, `halterAdresseSchema`,
    `mobilitaetSchema` (`.strict()` für HL-MOB-11 / VL-4),
    `stammdatenMobilitaetBucketSchema`; compile-time drift-guard
    `_mobilitaetDriftGuard` zwischen TS-Type und Zod-Schema.
  - Persona-Schema additiv um `mobilitaet?` (permissive `passthrough`, weil
    der strict-Mode separat auf den inneren `mobilitaet`-Block angewendet
    wird).
- **bucket key**:
  - `stammdaten:mobilitaet` + `stammdaten:schema-version` in
    `persistence.ts` registriert.
- **typecheck**: pass (`npx tsc --noEmit` clean)
- **vitest**: 575 / 578 pass; 3 pre-existing failures in
  `reply-templates-skelett.test.ts > markus-schmidt` (CLAUDE.md V1.0.1
  Followup #60, unrelated to V1.3). Baseline pre-V1.3: 439 / 442 pass.
  Net V1.3 contribution: +136 tests, all pass; 10 new test files (115
  V1.3-specific tests) + 21 added subtests in existing aktenzeichen-format
  for the 3 new V1.3 letters.
- **unit-test files added** (Spec § 14.5):
  - `tests/unit/stammdaten-v1-3-norm-zitate-extension.test.ts` (positive
    + negative VL-3)
  - `tests/unit/stammdaten-v1-3-persistence-migration.test.ts` (VL-4 /
    VL-12 + V1.0→V1.3-Chain-Idempotency)
  - `tests/unit/stammdaten-v1-3-behoerden-kategorie.test.ts` (VL-5)
  - `tests/unit/stammdaten-v1-3-schema-no-punkte.test.ts` (VL-4 / HL-MOB-11)
  - `tests/unit/stammdaten-v1-3-ban-list-grep.test.ts` (VL-2 / VL-13 /
    VL-14 / HL-MOB-13 / HL-MOB-14 + Whitelist-Exception)
  - `tests/unit/stammdaten-v1-3-faer-on-demand-ttl.test.ts` (VL-8 /
    HL-MOB-11 — TTL 300 + Activity-Log + no-localStorage-Schreibung)
  - `tests/unit/stammdaten-v1-3-iso-mdl-toggle-enum.test.ts` (VL-9 /
    HL-MOB-9 — 14 ISO-Attribute + Forbidden-List)
  - `tests/unit/stammdaten-v1-3-pflichtumtausch-stichtag-lookup.test.ts`
    (VL-6 / HL-MOB-6 — Anlage-8a-FeV-Lookup)
  - `tests/unit/stammdaten-v1-3-fe-nr-format-validator.test.ts`
  - `tests/unit/stammdaten-v1-3-block-d-wording.test.ts` (VL-13 + VL-14 +
    VL-2)
- **architect-specified migration name used**: `migratePersonaV12ToV13`
  (kanonisch laut Spec § 5.3). Alias `migrateMobilitaetV12ToV13` ebenfalls
  exportiert. Run-Token im `runStorageMigrations`-Chain:
  `'v12-to-v13-mobilitaet'`.
- **deviations from spec**:
  - **FE-Nr-Regex** in `schemas.ts`: Spec § 6.8 zeigte regex
    `/^\[MOCK\] [A-Z]\d{3}[A-Z0-9]{5}[0-9X]\d$/` (11 Zeichen nach
    `[MOCK] `), aber alle drei architect-supplied Seed-FE-Nrs
    (`F0727RRE2I50`, `J0512SCH08X1`, `N0428MEH47K2`) sind 12 Zeichen
    lang und matchen diese Regex nicht. Resolution: permissivere Regex
    `/^\[MOCK\] [A-Z][A-Z0-9]{8,11}$/` (Bundesland-Buchstabe + 8-11
    alphanumerische Zeichen). Seed-Werte sind source-of-truth für die
    V1.3-Demo. **Empfehlung an product-architect**: in V1.3.1 entweder
    die Seed-Werte auf 11 Zeichen kürzen ODER die Regex-Spec § 6.8
    aktualisieren.
  - Kein `getMdlAttestation`-Eintrag in der `MockBackendApi`-Interface-
    Spec-Liste § 6 (war als „optional `getMdlAttestation`" markiert);
    wir haben ihn trotzdem als Pflicht-Method gewired, weil Spec § 3.2 +
    § 4.2 ihn als Pflicht-Datenquelle für die `<WalletMdlCard>` /
    `<WalletMdlAttestationPreviewModal>` führt.
  - `setHalterAdresseUebergangsMarker` ist in der Spec § 9.3 als interne
    Mock-Backend-Funktion beschrieben; ich habe sie auf die öffentliche
    `MockBackendApi`-Interface gehoben, weil der Block-D-eID-Bestätigungs-
    Pfad in `api.ts:bestaetigeImpl` läuft und Cross-Modul-Aufruf braucht.
    Public-Surface-Risiko ist niedrig (Aufrufer = nur autopilot).
- **known gaps**:
  - Lena Schmidt persona-id ist nicht im SEED_MOBILITAET; `getMobilitaet(
    'lena-schmidt')` returns `null` — Frontend-coder erwartet `null` als
    Empty-State-Trigger (Spec § 6.1 Anti-Lena-Pfad). OK.
  - i18n-Werte für 9 weiterer Locales (en/ru/uk/ar/tr) sind **out-of-scope**
    für mock-backend-coder; i18n-localizer übersetzt die `fzv_15`-DE-Aktualisierung
    in die anderen 5 Locales. Mock-backend hat nur `de.json` für den
    Block-D-Wording-Co-Correction-Fix (VL-14 § 7.10) angepasst.
  - Frontend-component-Files (`src/components/stammdaten/mobilitaet/**`,
    `src/components/stammdaten/wallet/**`) sind frontend-coder-Scope und
    nicht von mock-backend-coder berührt.
  - 3 pre-existing failures in `reply-templates-skelett.test.ts` (V1.5.1
    Schmidt-Persona-Drift, CLAUDE.md V1.0.1 Followup #60) sind unverändert.

## Build log — i18n-localizer

- **date**: 2026-05-13
- **locales updated**: [en, ru, uk, ar, tr] (DE-source unverändert; 5 Ziel-Locales)
- **new keys translated** (pro Locale × 5 = total leaf-additions ~111 × 5 = 555):
  - `stammdaten.sektion.mobilitaet.{title, subtitle}` (2)
  - `stammdaten.field_card.halter_adresse.*` (6)
  - `stammdaten.disclaimer.{fuehrerschein_lese_schicht, faer_punkte_on_demand,
    kfz_halter_adresse_speculative, eudi_mdl_speculative, fe_nr_read_only,
    fin_masked_default, mitnutzer_no_halter}` (7)
  - `stammdaten.aktivitaet.zweck.kfz_{faer_punkte_pulled,
    halter_adresse_prefilled_via_umzug, korrekturweg_fe_cta_opened,
    mdl_preview_opened}` (4)
  - `stammdaten.aktivitaet.note.{kfz_faer_punkte_pulled,
    kfz_halter_adresse_prefilled_via_umzug, kfz_korrekturweg_fe_cta_opened,
    kfz_mdl_preview_opened}` (4)
  - `stammdaten.mobilitaet.*` — full block (gruppe, fe, pflichtumtausch,
    punkte, halter, wallet_cross_ref, toast, error) (~75)
  - `stammdaten.wallet.mdl.*` — full block with 14 ISO-Annex-B toggle keys (~26)
- **changed keys (DE-Wert-Rewrite, in 5 Ziel-Locales nachgezogen)**:
  - `umzug.rechtsgrundlage.fzv_15` — VL-13 + VL-2 Rewrite: „aktualisieren" →
    „anpassen"; „unverzüglich" + Faustregel „(i.d.R. innerhalb einer Woche)" /
    „(typically within one week)" / „(как правило, в течение недели)" /
    „(як правило, протягом тижня)" / „(عادةً خلال أسبوع)" /
    „(genellikle bir hafta içinde)" verbatim eingefügt.
- **JSON.parse pre-flight**: leaf-key-count parity verified via grep —
  de.json 1234, en/ru/uk/ar/tr je 1194 (Differenz = 40 pre-existing
  V1/V1.1/V1.2-Parity-Gaps, NICHT V1.3-Scope; siehe known-gaps unten).
  V1.3-spezifische Key-Set: 15 grep-bestätigte critical-leaf-keys
  (`fuehrerschein_lese_schicht`, `faer_punkte_on_demand`,
  `kfz_halter_adresse_speculative`, `eudi_mdl_speculative`, `fe_nr_read_only`,
  `fin_masked_default`, `mitnutzer_no_halter`, `kfz_faer_punkte_pulled` ×2,
  `kfz_halter_adresse_prefilled_via_umzug` ×2, `kfz_korrekturweg_fe_cta_opened`
  ×2, `kfz_mdl_preview_opened` ×2) = 15 Treffer in jedem der 6 Locale-Files.
  Strukturelle Brace-Balance verifiziert: alle 6 Files enden mit identischem
  Closing-Pattern `        }\n      }\n    }\n  }\n}`. Line-count parity
  EN/RU/UK/AR/TR = 1425 Zeilen (identisch).
- **ban-list-grep test status**:
  - Verboten-Phrasen in 5 Ziel-Locales: keine Treffer für
    `Halter-Adresse aktualisiert`, `synchronisiert automatisch`,
    `7-Tage-Frist` / `Frist 7 Tage` (geprüft via Grep, multiline-RE
    case-insensitive).
  - `automatische Synchron(isation|isierung)` als DE-Phrase erscheint in
    en/ru/uk/ar/tr ausschließlich in der `kfz_halter_adresse_speculative`-
    Disclaimer-Line (Zeile 949 jeweils, identische Line-Position) — der
    `stripWhitelistedLines`-Filter im Test `stammdaten-v1-3-ban-list-grep.test.ts`
    neutralisiert sie via Key-Match. Test soll grün laufen.
  - Approved Block-D-Wording (`Address change initiated via Umzug case` /
    „Изменение адреса инициировано через дело Umzug" / „Зміну адреси
    ініційовано через справу Umzug" / „تم استهلال تغيير العنوان عبر معاملة
    Umzug" / „Adres değişikliği Umzug işlemi üzerinden başlatıldı") konsistent
    in der `field_card.halter_adresse.uebergangs_badge_via_umzug`-Variante.
- **review-needed flags resolved**: 0 (kein _status.json bestand vor V1.3
  Pass; alle V1.3-Keys wurden in einem Pass übersetzt und committed, nicht
  draft-marked).
- **Sprache-spezifische Übersetzungs-Notizen**:
  - **EN**: gov.uk-Register; Behörden-DE-Begriffe in Klammern (Pattern aus V1
    übernommen). „Fahrerlaubnis", „Fahrerlaubnisbehörde", „Zulassungsstelle",
    „Kraftfahrt-Bundesamt", „Mitnutzer:in", „Halter:in", „Schlüsselzahlen"
    verbatim. „Pflichtumtausch" gerendert als „mandatory driving licence
    exchange (Pflichtumtausch, Anlage 8a FeV)" — Anlage 8a FeV citation
    preserved.
  - **RU**: «Вы» с прописной, без канцелярита. „Регистрационное бюро
    (Zulassungsstelle)", „Ведомство по водительским правам
    (Fahrerlaubnisbehörde)", „Mitnutzer:in" (Latein in Klammern bei
    Personen-Erst-Mention), „Schlüsselzahlen" verbatim. Plural-CLDR-Forms
    `=1 / few / many / other` für „балл/балла/баллов/балла" eingehalten.
  - **UK**: «Ви» з великої. Окремий переклад (kein RU-Calque). „реєстраційне
    бюро (Zulassungsstelle)", „відомство з водійських прав
    (Fahrerlaubnisbehörde)". Plural-CLDR-Forms wie UK.
  - **AR**: فصحى مبسطة. RTL — html dir kommt vom Layout-Wiring, nicht aus
    den Locale-Strings. DE-Eigennamen literal in Latein in Klammern. Norm-
    Paragraph-Nummern (§ 15 FZV, § 30 Abs. 8 StVG) LTR via Unicode-Default-
    Bidi (KEIN expliziter RLE/LRE-Marker eingefügt — bestehendes V1.2-
    Pattern). Plural-CLDR-Forms für Arabic `=0/=1/=2/few/many/other` für
    „نقطة/نقطتان/نقاط" implementiert. **Flag for AR-native-review**:
    1) „مكتب تسجيل السيارات" als Übersetzung für „Zulassungsstelle" (cf.
       V1.2 Pattern „Bürgeramt → بلدية المدينة" — hier neutraler
       gerendered weil Zulassungsstelle nicht 1:1 zu بلدية); 2) „طبقة
       قراءة وإرشاد" für „Lese- und Wegweiser-Schicht" — passt zum V1
       fest etablierten Pattern; 3) der embeded „eine automatische
       Synchronisierung" steht als deutsches Original ohne arabisches
       Echo-Translation, weil der Disclaimer-Text das Wort *als
       deutsches Zitat* führt, das es heute *nicht* gibt.
  - **TR**: Siz-Form, resmî ama erişilebilir. „Sürücü belgesi makamı
    (Fahrerlaubnisbehörde)", „tescil dairesi (Zulassungsstelle)",
    „Federal Motorlu Taşıtlar Dairesi (Kraftfahrt-Bundesamt)". DE-loanword-
    Pattern bewahrt: „Bürgeramt" und „Familienkasse" stehen verbatim ohne
    Übersetzung, weil sie in der türkisch-deutschen Community-Realität als
    Behörden-Eigennamen bekannt sind.
- **Behörden-Terminologie verbatim preserved**: Fahrerlaubnis,
  Fahrerlaubnisbehörde, Zulassungsstelle, Kraftfahrt-Bundesamt (KBA), ZFER,
  FAER, Fahreignungsregister, Fahrgestellnummer, FIN, FE-Nr, i-Kfz,
  Pflichtumtausch, Schlüsselzahl(en), Hauptuntersuchung, Halter, Mitnutzer:in,
  Bundesnetzagentur (nicht in V1.3-Scope), BundID, EUDI-Wallet, mDL,
  Zentrales Fahrerlaubnisregister, § (Paragraph-Symbol), Anlage 8a/9 FeV,
  RL (EU) 2025/2205, ISO/IEC 18013-5, eVB, Bürgeramt, Familienkasse,
  Berufsgenossenschaft, Mein ELSTER, KBA, eAT-eID, BKrFQG.
- **Dates verbatim DE-Format**: 26.11.2029, 22.10.2025, 19.01.2027,
  Mai 2031, 15.04.2026, Mai 2026 — alle in allen 5 Locales literal
  beibehalten (kein YYYY-MM-DD oder MM/DD/YYYY-Reformat).
- **VL-2-Frist-Wording in allen Locales**: „unverzüglich (i.d.R. innerhalb
  einer Woche)" → „without undue delay (typically within one week)" (EN) /
  „незамедлительно (как правило, в течение недели)" (RU) /
  „невідкладно (як правило, протягом тижня)" (UK) /
  „دون تأخير (عادةً خلال أسبوع)" (AR) /
  „gecikmeksizin (genellikle bir hafta içinde)" (TR). Keine „7-Tage-Frist"-
  Variante in irgendeinem Locale.
- **mDL-Datum-Anker (VL-7)**: 2029/2031 als wörtliche Jahreszahlen in
  `eudi_mdl_speculative` und `wallet.mdl.vision_banner_2031_*` in allen
  Locales (keine „in der Zukunft" / „soon"-Soft-Re-translation).
- **known gaps surfaced (V1.3.1 followup für pre-existing parity gaps)**:
  Die 5 Ziel-Locales haben gegenüber DE 40 fehlende Leaf-Keys aus
  V1.0–V1.2-Waves (z. B. fehlen in en.json: `stammdaten.field.geburtsort`,
  `stammdaten.field.geschlecht.value.*` mit secondary-Variants,
  `stammdaten.kontakt.modal.mobil_otp.input_placeholder`,
  `stammdaten.kontakt.notification.live_counter.aria_label`,
  `stammdaten.kontakt.notification.kategorie.sonstige.label`,
  `stammdaten.kontakt.notification.option.{sms_only_notification,
  pilot_phase_note, not_angebunden_note}`, `stammdaten.kontakt.notification.
  live_counter.aria_label`, `stammdaten.kontakt.notification.vision_banner_
  heading`, `stammdaten.kontakt.notification.vision_banner_aria_label`,
  `stammdaten.kontakt.notification.current_value_label`,
  `stammdaten.kontakt.notification.cta_save`, `stammdaten.kontakt.notification.
  save_pending`, `stammdaten.kontakt.notification.toast.{otp_error,
  praeferenz_gespeichert}`, `stammdaten.kontakt.card.bundid_postfach.{
  aktiviert_seit_template, wegweiser_link_label, norm_pointer}`,
  `stammdaten.kontakt.card.email.{not_verified_label, read_only_pointer}`,
  `stammdaten.kontakt.card.mobil.{verified_label, not_verified_label,
  no_value_helper}`, `stammdaten.kontakt.modal.mobil_otp.{
  error_invalid, success_toast}`, `stammdaten.cta.korrekturweg_label`
  Duplikat-Cleanup-Followup). Diese Gaps sind explizit V1/V1.1/V1.2-
  Followup-Scope (CLAUDE.md V1.0.1/V1.1.0.1/V1.2.0.1) und NICHT in dieser
  V1.3-Pass behoben — wie in Spec § 7.13-Pre-Flight-Note vorgesehen.
- **i18n-keyfile MOCK-Watermark + Aktenzeichen + FE-Nr + FIN verbatim**:
  Keine Übersetzung von `{aktenzeichen}`, `{fin}`, `{tail}`, `{punkte}`,
  `{vorgang_id}`, `{behoerde_name}`, `{stichtag}`, `{erfolgt_am}`,
  `{fe_behoerde_name}`, `{days}`, `{seconds}` ICU-Placeholders — alle in
  allen 5 Locales mit identischer Syntax.
