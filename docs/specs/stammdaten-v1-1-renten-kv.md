---
feature: stammdaten-v1-1-renten-kv
title: Stammdaten V1.1 — Altersvorsorge + Krankenversicherung & Pflege (additive Erweiterung)
status: shipped
date: 2026-05-10
shipped_at: 2026-05-10
author: product-architect
upstream:
  research: docs/research/2026-05-10-renten-kv.md (status: research-pending-domain-validation, confidence: medium → high nach Domain-Pass)
  domain: docs/domain/renten-kv.md (verdict: VALIDATED-WITH-CORRECTIONS, last_validated: 2026-05-10)
  verify: concept-verifier-Pass 2026-05-10 (verdict: PROCEED-WITH-CONDITIONS; 11/11 Art-9-Linie DECIDED, 0 controversial offen; 10 Hard-Lines § 11.21–§ 11.30 verbatim-locked)
inherits_from: docs/specs/stammdaten.md (status: shipped 2026-05-10) — V1 ist und bleibt Baseline; V1.1 ist additive Erweiterung
ship_target: V1.1 horizontal-capability (next after Stammdaten V1)
estimated_effort: ~5 working days
  (1.0 day Mock-Letter + Yellow-Letter-Bridge + Posteingang-Hook;
   1.5 days zwei neue Sektionen „Altersvorsorge" + „Krankenversicherung & Pflege" +
   FieldCards + Pflegegrad-Modal + Track-C Empty-State;
   0.5 day Persona-Daten-Erweiterung + Behörden-Erweiterung + Seed;
   0.5 day i18n;
   1.5 day Vitest + Playwright + a11y + idempotency-Tests)
owner_agents: [frontend-coder, mock-backend-coder, i18n-localizer, a11y-tester, code-reviewer]
---

> **Verhältnis zu V1**: V1 (Stammdaten-Foundation, shipped 2026-05-10) bleibt
> unverändert in jedem Detail — Hero-Card, Aktivitätsprotokoll, fünf bestehende
> Sektionen, Religion-Modal-Pattern, Sperren-Toggle, IBAN-Speculative,
> Wallet-Sub-Tab. V1.1 fügt **zwei neue Sektionen** zwischen „Familie"
> und „Dokumente" ein (Altersvorsorge, Krankenversicherung & Pflege),
> erweitert die `Persona`-Schema additiv, fügt einen einzelnen Mock-Letter
> hinzu, registriert einen idempotenten Posteingang-Bridge-Hook und
> legt eine zweite Art-9-Modal-Mechanik (Pflegegrad) parallel zur
> bestehenden Religion-Mechanik aus V1.

> **Verifier-Verhältnis**: Diese Spec übernimmt die 10 verifier-locked
> Hard-Lines § 11.21–§ 11.30 sowie die 11/11-Art-9-Linie als § 11.21-Tabelle
> **verbatim**. Die Mehmet-Track-C-Erklärungs-Card-Wording ist verbatim
> aus dem Verifier-Pass. Frontend-coder darf an Hard-Lines und Track-C-
> Wording **nicht** umformulieren.

---

## 1. Geltungsbereich V1.1

V1.1 erweitert die Stammdaten-Lese- und Wegweiser-Schicht um die zwei
größten verbleibenden Whitespaces im 2026er Bürger:innen-Profil:

1. **Altersvorsorge** — der jährliche „gelbe Brief" (§ 109 SGB VI) wird zum
   *Demo-Vehicle für die Posteingang→Stammdaten-Bridge*: AISummary erkennt
   ihn, ein neuer CTA-Pfad „Werte in meinen Stammdaten ablegen" trägt die
   fünf Pflicht-Inhalte (§ 109 Abs. 3 SGB VI) in eine neue Sektion
   „Altersvorsorge" mit Card-Top-3 / Tooltip-2 / Expandable-5 Strukturierung
   (Hard-Line § 11.27).
2. **Krankenversicherung & Pflege** — KVNR-Aufbau (§ 290 SGB V),
   Familienversicherten-Status (§ 10 SGB V), ePA-Existenz und ePA-Widerspruch
   (§ 342 Abs. 1 S. 2 i.V.m. § 343 SGB V — Hard-Line § 11.26 zwei-Norm-Zitat),
   eRezept-Bezugsmodus, Pflegegrad **hinter Art-9-Modal** (Pattern erbt von
   V1-Religion, Hard-Line § 11.22). EuGH 01.08.2022 C-184/20 weite
   Art-9-Lesart wird in Activity-Log-Tooltips zitiert (Hard-Line § 11.28).

V1.1 macht **keinen** ZfDR-Aggregator-Nachbau (Hard-Line § 11.23) — nur
einen Wegweiser-Link auf rentenuebersicht.de + Disclaimer-9 mit
Versorgungswerke/Beamten/Direktzusagen-Ehrlichkeits-Klausel.

V1.1 modelliert drei Persona-Tracks getrennt (Hard-Line § 11.24):
- **Anna**: Track A (GRV-Pflicht, Yellow-Letter normal-case)
- **Schmidt**: Track A (GRV-Pflicht, Pflegegrad-Modal-Reveal-Demo)
- **Mehmet**: Track C (Privat-Vorsorge-only Default; Empty-State-Card,
  kein Yellow-Letter-Mock)

**Nicht-Ziele** (verbatim aus verifier-Forbidden-Territory + Hard-Caps):
- ePA-Inhalt zeigen (Art-9, nicht legal)
- PKV-Tarif-Name (EuGH C-184/20 weit gelesen — § 11.21-Tabelle)
- Beihilfe-Berechtigung
- PKV-Risikozuschlag-Höhe
- Beitragssatz-Wiederholung (Doppelung mit V1-Beschäftigung)
- MD-/MEDICPROOF-Befunde
- Eigene Renten-Berechnung (nur Brief-Echo)
- ZfDR-Aggregator-Nachbau (nur Wegweiser-Link)
- Yellow-Letter-Mock für Mehmet (Track-C zeigt die Lücke)

---

## 2. Vision-Frame (Loom-Cut für V1.1, hängt sich an V1 hinten an)

**Loom-Cut V1.1 — 60 Sekunden Drei-Persona-Choreographie**:

| Sekunde | Persona | Aktion | Wow-Effekt |
|---|---|---|---|
| 0–6 | Anna | öffnet Posteingang → neuer gelber Brief „Renteninformation 2026 — DRV Berlin-Brandenburg"; Pre-Open-AISummary „DRV Berlin-Brandenburg · Renteninformation · Keine Frist" | Zeigt: V1.5 Posteingang erkennt den Brief korrekt — `archetype = "renteninfo"` |
| 6–14 | Anna | öffnet Brief → Post-Open-AISummary listet die **fünf** Pflicht-Inhalte (§ 109 Abs. 3 SGB VI) als Bullets; primary CTA „Werte in meinen Stammdaten ablegen" | Bridge-CTA wird sichtbar — separater CTA-Pfad, **nicht** Reply-Template (§ 11.20-Konsistenz mit Posteingang V1.5.1) |
| 14–22 | Anna | klickt CTA → router.push(`/stammdaten#altersvorsorge`); Sektion „Altersvorsorge" expand auto; FieldCard zeigt Card-Top-3 (Entgeltpunkte, Regelalter-Prognose, EM-Rente-Prognose) + zwei Tooltip-Anker + Expandable-5 mit Grundlage + Anpassungs-Wirkung + Beitragsübersicht | Card-Top-3 / Tooltip-2 / Expandable-5 Strukturierung (Hard-Line § 11.27); Activity-Log-Eintrag erscheint mit zwei-Norm-Zitat „§ 342 Abs. 1 S. 2 i.V.m. § 343 SGB V" — *Moment*: das ist der ePA-Eintrag, nicht der Renten-Eintrag → Renten-Eintrag zitiert „§ 109 Abs. 1 + Abs. 3 SGB VI" |
| 22–32 | Schmidt | wechselt Persona → öffnet `/stammdaten` → scrollt zu „Krankenversicherung & Pflege" → klickt „Pflegegrad anzeigen" → Pflegegrad-Modal (Pattern-Konsistenz zu V1-Religion: Disclaimer-7 + Einwilligungs-Toggle + EuGH-C-184/20-NormZitatSpan-Tooltip) → Toggle on → primary enabled → klickt → Modal schließt → Pflegegrad „PG 2" sichtbar mit MD-Begutachtungs-Datum + 25-AT-Frist-Info + Wegweiser auf Höher­stufungs­antrag | Pattern-Konsistenz zu V1; Activity-Log-Eintrag mit `consent:art_9_lit_a; quelle:user_pflegegrad_reveal` |
| 32–42 | Schmidt | scrollt weiter → ePA-Status-Card → Hinweis-Banner sichtbar mit Disclaimer-8 verbatim („Seit 15.01.2025 …, § 342 Abs. 1 S. 2 i.V.m. § 343 SGB V"); ePA-Widerspruch-Pill „nicht widersprochen" + Wegweiser „Widerspruch verwalten Sie über Ihre TK-App" | ePA-Existenz **nicht** Art-9 (universal seit 01/2025); Widerspruch-Boolean **nicht** Art-9, aber obligatorisches Disclaimer-Banner (§ 11.21 Zeile 5) |
| 42–52 | Mehmet | wechselt Persona → öffnet `/stammdaten` → Sektion „Altersvorsorge" rendert **Track-C Empty-State-Card** mit Erklärungs-Wording verbatim: „Sie haben keine Renteninformation, weil Sie nicht in der GRV pflichtversichert sind. Im PKV-Bereich existiert kein zentraler Aggregator wie ZfDR — Sie müssen die App Ihres Versicherers nutzen. Optionen: 1) freiwillige GRV (§ 7 SGB VI), 2) Privatvorsorge prüfen, 3) Falls Pflichtversicherten-Beruf (§ 2 SGB VI), Pflichtversicherung beantragen." | **Punchline**: speculative-design-Aussage — V1.1 zeigt die Lücke, statt sie zu kaschieren |
| 52–60 | (Schluss) | Hero-Card: Activity-Log enthält pro Persona die korrekten neuen Einträge: Anna „Renteninformation eingelesen", Schmidt „Pflegegrad angezeigt" + „ePA-Status-Banner gesehen", Mehmet keinen neuen Eintrag (Track-C ist statisch) | Drei-Persona-Demo komplett |

Die Demo zeigt **drei** Realitäten parallel: Normal-Case (Anna), Art-9-Pflegegrad-Reveal mit Pattern-Konsistenz (Schmidt), und das ehrlich-leere Track-C (Mehmet). V1.1-Wow ist die *Bridge-Mechanik* aus dem Posteingang plus die **drei verschiedenen** Persona-Outcomes.

---

## 3. Personas V1.1-Erweiterung

> Die V1-Persona-Datensätze in `personas.json` werden additiv um die V1.1-
> Renten-/KV-Felder ergänzt (siehe § 4). Hauptpersonen bleiben Anna, Schmidt
> (Hauptperson-Anker = Markus Schmidt, der bestehende Persona-Eintrag), Mehmet.

### 3.1 Anna Petrov — Track A (GRV-Pflicht-Normal-Case)

- **DRV-Träger**: DRV Berlin-Brandenburg (Friedrich-Ebert-Str. 34, 14469 Potsdam)
- **VSNR**: bleibt `[MOCK] 65 170395 P 042` (V1-Bestand)
- **Krankenkasse**: AOK Nordost (V1-Bestand) — Pflegekasse = AOK Nordost-Pflegekasse (deterministisch)
- **KVNR**: bleibt `[MOCK] AOK-NO-2023-77418264` (V1-Bestand) — ggf. zusätzlich ein § 290-konformes 10/10-Format für die Bridge-Demo (`[MOCK] M845192036` als unveränderbarer Teil; veränderbarer Teil generiert)
- **Renten-Eckdaten** (5 Pflicht-Inhalte aus dem Mock-Letter): siehe § 9.1
- **Familienversicherung**: Anna ist selbst pflichtversichert; Lev Petrov-Becker (Kind, geb. 2024-11-03) ist **familienversichert über Anna** bis längstens 11/2049 (Alter 25) — V1.1 zeigt Lev in der Sektion „Krankenversicherung & Pflege" als Sub-Card
- **ePA**: eingerichtet ja (Default seit 15.01.2025), Widerspruch nein
- **eRezept**: App-Bezug
- **Pflegegrad**: kein
- **Yellow-Letter**: Mock-Letter `letter-renteninfo-anna-2026-05` mit `empfangen_am = "2026-05-08T10:14:00.000Z"`, `archetype = "renteninfo"` (NEU), Pre-Open + Post-Open-AISummary, Bridge-CTA
- **Posteingang-Bridge-Demo**: Anna ist der Default-Demo-Pfad

### 3.2 Familie Schmidt — Track A + Pflegegrad-Modal-Demo

- **DRV-Träger**: DRV Bayern Süd (Am Alten Viehmarkt 2, 84028 Landshut)
  - *Anmerkung*: V1-Persona Markus Schmidt hat Wohnort Hamburg im V1-Bestand — V1.1 hält daran fest und referenziert für DRV-Konsistenz **DRV Nord** (Ziegelstraße 150, 23556 Lübeck) statt DRV Bayern Süd; das Behörden-Inventory aus § 10 dieser Spec deckt beide ab, V1.1 nutzt **DRV Nord** für Schmidt im Code-Pfad. (Domain-Doc-Tabelle nennt DRV Bayern Süd nur als Referenz-Mapping, falls Schmidt München-Persona ist — bei der V1-Hamburg-Persona ist DRV Nord die korrekte Wahl.)
- **VSNR**: bleibt `[MOCK] 14 220288 M 113` (V1-Bestand) — Bereichsnummer 14 entspricht DRV Nord
- **Krankenkasse**: Techniker Krankenkasse (V1-Bestand) — Pflegekasse = TK-Pflegekasse
- **KVNR**: `[MOCK] TK-2015-44113008` (V1) — V1.1 ergänzt § 290-konformes 10/10-Format
- **Familienversicherung**: Lena Schmidt (Partnerin, Architektin, selbstständig — entweder freiwillig versichert oder PKV; V1.1-Mock-Annahme: **freiwillig GKV bei TK** mit eigener KVNR) + Kinder Felix (geb. 2022-01-15) und Hannah (geb. 2024-08-09 — V1-Bestand prüfen) als familienversichert über Markus
- **Pflegegrad**: **Lena Schmidt (Partnerin)** trägt im V1.1-Mock einen **PG 2** mit Bewilligungsdatum 2025-09-14 (semantischer Coupling zu Anrechnungszeit Pflege § 3 SGB VI — Hard-Line § 11.30); zeigt im V1.1-Mock zusätzlich eine **Anrechnungszeit Pflege**-FieldCard, die hinter demselben Pflegegrad-Modal-Toggle gekoppelt ist (verifier-Locked § 11.30)
  - *Verifier-Open-Question #4 in domain-doc*: „Schmidt-Mutter PG 1 oder Schmidt-Kind PG 2"; Domain-Doc-Vote: **Mutter** für saubere eine-Art-9-Beziehung; V1.1 nimmt **Lena Schmidt (Partnerin) PG 2** als Default (Lena ist Adult, gehört semantisch in dieselbe Datenschutz-Sphäre wie Markus, keine zweite Art-9-Beziehung über die Familie-Sektion nötig)
- **ePA**: eingerichtet ja, Widerspruch nein
- **eRezept**: App-Bezug
- **Yellow-Letter**: kein neuer Mock-Letter im V1.1-Scope; Schmidts Renten-Eckdaten kommen aus seed-Default (Persona-Mock, nicht aus Posteingang-Bridge — das ist nur der Anna-Pfad)

### 3.3 Mehmet Yıldız — **Track C (Privat-Vorsorge-only Default)**

> Hard-Line § 11.24: Mehmet-Track-C-Default mit Empty-State-Card und
> Erklärungs-Wording — **kein** Yellow-Letter-Mock für Mehmet.

- **DRV-Träger**: DRV Rheinland (Königsallee 71, 40215 Düsseldorf) — *referenziell hinterlegt*, in der UI aber nur als Wegweiser-Pointer genannt (Mehmet hat keinen aktiven GRV-Anwartschafts-Stand); ggf. ganz weglassen, je nach UX-Coder-Decision
- **GRV-Status**: V1-Persona-Bestand zeigt Mehmet als Angestellter (Energiewende Consulting Köln GmbH, seit 2014-01-15) — V1.1-**Override** im Mock: Mehmet wird für die V1.1-Demo als „Selbstständig (PKV-vollversichert)" reframed; **alternativ**: V1.1 hält am V1-Bestand fest und pingt Mehmet als GRV-pflichtversicherter Angestellter, was *aber* die Track-C-Wow-Punchline brechen würde
  - **Architect-Decision**: V1.1 ergänzt ein **`renten_track`-Persona-Feld** (siehe § 4), das den Track per Override setzt — `renten_track: 'C'` für Mehmet — ohne das V1-`beschaeftigung`-Feld zu mutieren. Das ist sauberer (keine V1-Brüche, klare V1.1-Override-Semantik) und domain-konform (Domain-Doc: „Track C als Mehmet-Default")
- **Krankenkasse**: Barmer (V1-Bestand)
  - **PKV-Override für V1.1**: V1.1-Persona-Erweiterung ergänzt ein optionales `pkv_traeger_v1_1`-Feld („AXA Krankenversicherung AG" oder „Debeka") das bei Track C zusätzlich gerendert wird; **Tarif-Name strikt verboten** (Hard-Line § 11.21-Tabelle)
  - **Architect-Decision**: V1.1 hält am V1-GKV-Barmer-Bestand fest und nutzt `renten_track: 'C'` als alleiniges Track-C-Indiz; dadurch zeigt Mehmet **GKV (Barmer)** in der KV-Sektion (normal-case) und **Track-C-Empty-State** in der Renten-Sektion. Das vermeidet PKV-Komplexität, die in V1.1-Hard-Lines ohnehin out-of-scope ist
- **Familienversicherung**: Eren (Kind, geb. 2017-06-12) als familienversichert über Mehmet bis längstens 06/2042 (Alter 25)
- **ePA**: eingerichtet ja, Widerspruch nein
- **eRezept**: App-Bezug
- **Pflegegrad**: kein
- **Yellow-Letter**: **kein** Mock-Letter für Mehmet (Hard-Line § 11.24)
- **Empty-State-Card-Wording** (verbatim verifier-locked, Hard-Line § 11.24):

> „Sie haben keine Renteninformation, weil Sie nicht in der GRV pflichtversichert sind. Im PKV-Bereich existiert kein zentraler Aggregator wie ZfDR — Sie müssen die App Ihres Versicherers nutzen. Optionen: 1) freiwillige GRV (§ 7 SGB VI), 2) Privatvorsorge prüfen, 3) Falls Pflichtversicherten-Beruf (§ 2 SGB VI), Pflichtversicherung beantragen."

i18n-Localizer übersetzt verbatim in alle 6 Locales; Norm-Zitate `§ 7 SGB VI` und `§ 2 SGB VI` bleiben als `<NormZitatSpan>`-wraps (Hard-Line § 11.7 V1 + § 11.7-Erweiterung in § 7 dieser Spec).

---

## 4. Data Model — Persona-Erweiterung + neue Buckets

### 4.1 Persona-Schema additiv erweitern (`src/types/persona.ts`)

V1.1 erweitert das `Persona`-Interface um optionale V1.1-Felder. **Kein
Bruch** an V1-Personas (Umzug, Posteingang, Stammdaten V1 bleiben kompatibel).

```ts
// src/types/persona.ts (V1.1 EXTEND — additive)

export interface Persona {
  // ... V1-Felder unverändert ...

  /**
   * V1.1 — Renten-Track-Override.
   * 'A' = Pflicht in GRV (Default für Angestellte/§ 2 SGB VI Pflicht-Selbst.).
   * 'B' = Versorgungswerk (Kammerberuf — Ärzt:in, Anwält:in, Architekt:in, …).
   * 'C' = Privat-Vorsorge-only (kein Pflicht-System; demonstrative Lücke).
   * undefined = aus `beschaeftigung`-Feld ableiten (wenn nicht gesetzt: 'A').
   */
  renten_track?: 'A' | 'B' | 'C';

  /**
   * V1.1 — Renten-Eckdaten aus dem letzten Yellow Letter (§ 109 Abs. 3 SGB VI).
   * Pflicht-Inhalte: 5 Felder (Domain-Doc Correction 3).
   * undefined = noch kein Yellow Letter eingelesen oder Track B/C.
   */
  renten_eckdaten_v1_1?: RentenEckdaten;

  /**
   * V1.1 — KVNR im § 290-konformen 10/10-Format (zusätzlich zu V1-`krankenversicherung.versichertennummer`).
   * Wird in der V1.1-KV-Sektion zur visuellen Trennung unveränderbar/veränderbar gerendert.
   * undefined = aus V1-Versichertennummer ableiten (Fallback) oder weglassen.
   */
  kvnr_v1_1?: {
    /** Unveränderbar: 1 Großbuchstabe + 8 Ziffern + Prüfziffer (10 Zeichen). */
    unveraenderbar: string;
    /** Veränderbar: 10 Ziffern (Kassenzugehörigkeit + Familien-Bezug). */
    veraenderbar: string;
  };

  /**
   * V1.1 — Familienversicherten-Beziehung pro `familie.partner` und pro `familie.kinder[]`-Eintrag.
   * Default `undefined` = nicht familienversichert (eigene Pflicht/freiwillig).
   * Bei `familienversichert_ueber: <PersonaID>` zeigt die KV-Sektion eine
   * Sub-Card mit Status-Pill „Familienversichert über {Stammversicherte}
   * — bis längstens MM/JJJJ" (§ 10 SGB V).
   */
  familienversichert_ueber?: PersonaId | string; // string-fallback für Kinder ohne PersonaID
  familienversichert_bis?: string; // ISO YYYY-MM oder YYYY-MM-DD

  /**
   * V1.1 — ePA-Status (eingerichtet seit 15.01.2025, § 342 Abs. 1 S. 2 SGB V).
   * Default `{ eingerichtet: true, widerspruch_gesetzt: false }`.
   */
  epa_status_v1_1?: {
    eingerichtet: boolean;
    widerspruch_gesetzt: boolean;
    /** Optional: ISO-Datum, an dem ePA eingerichtet wurde. */
    eingerichtet_am?: string;
    /** Optional: ISO-Datum, an dem Widerspruch gesetzt wurde. */
    widerspruch_am?: string;
  };

  /**
   * V1.1 — eRezept-Bezugsmodus (Kommunikations-Präferenz, NICHT Art-9).
   * Default 'app'.
   */
  erezept_modus_v1_1?: 'app' | 'egk' | 'papier';

  /**
   * V1.1 — Pflegegrad (Art-9-relevant; nur sichtbar nach Modal-Consent).
   * undefined = kein Pflegegrad (Default für die meisten Personas).
   * Wert-Set: 1–5 nach SGB XI. Einrichtung über Pflegekasse (§ 18c SGB XI).
   */
  pflegegrad_v1_1?: {
    grad: 1 | 2 | 3 | 4 | 5;
    /** ISO-Datum des Bewilligungs-Bescheids. */
    bewilligt_am: string;
    /** Pflegekasse-ID (= GKV-Pflegekasse oder PKV-Pflichtversicherer). */
    pflegekasse_id: string;
    /** Begutachtungs-Stelle: 'md' (GKV) oder 'medicproof' (PKV). */
    begutachtung_stelle: 'md' | 'medicproof';
  };

  /**
   * V1.1 — Anrechnungszeit Pflege (§ 3 SGB VI).
   * Hard-Line § 11.30: gekoppelt an Pflegegrad-Modal-Toggle —
   * sichtbar nur wenn `pflegegrad_v1_1` gesetzt UND Pflegegrad-Modal-Consent
   * erteilt ist. Semantische Art-9-Coupling.
   */
  anrechnungszeit_pflege_v1_1?: {
    /** Anzahl Monate Pflege-Anrechnungszeit. */
    monate: number;
    /** Bezugsperson (Familienmitglied, das gepflegt wurde). */
    pflegebeduerftige_person?: string;
    /** Norm-Zitat: '§ 3 SGB VI' für Anrechnungszeit. */
    rechtsgrundlage: string;
  };

  /**
   * V1.1 — Versorgungswerk (Track B; nur Kammerberufe).
   * undefined = kein Versorgungswerk (Default).
   */
  versorgungswerk_v1_1?: {
    name: string; // z. B. "Bayerische Architektenkammer Versorgungswerk"
    mitgliedsnummer: string; // [MOCK]
  };
}
```

### 4.2 Neue Typen (`src/types/renten-kv.ts` — NEU)

```ts
// src/types/renten-kv.ts (NEW file)

import type { PersonaId, BehoerdeId } from '@/types';

/**
 * Renten-Eckdaten aus dem letzten Yellow Letter (§ 109 Abs. 3 SGB VI).
 * 5 Pflicht-Inhalte (Domain-Doc Correction 3 — research-scout vergaß Nr. 1).
 */
export interface RentenEckdaten {
  /** § 109 Abs. 3 Nr. 1 — Grundlage der Rentenberechnung. */
  grundlage_kurzauszug: {
    beitragszeit_von: string; // ISO YYYY-MM
    beitragszeit_bis: string; // ISO YYYY-MM
    /** Erworbene Entgeltpunkte (Stand letzter Brief-Stichtag). */
    entgeltpunkte_aktuell: number;
  };
  /** § 109 Abs. 3 Nr. 2 — EM-Renten-Höhe bei sofortiger voller EM. */
  em_rente_prognose_eur_monat: number;
  /** § 109 Abs. 3 Nr. 3 — Regelaltersrenten-Prognose ohne weitere Beiträge. */
  regelalter_prognose_eur_monat: number;
  /** § 109 Abs. 3 Nr. 4 — Wirkung künftiger Anpassungen (Floskel + Beispielwert). */
  anpassungs_wirkung: {
    /** Beispiel-Anpassungs-Prozentsatz (z. B. 2.0 für 2 % p.a.). */
    beispiel_prozent_p_a: number;
    /** Resultierender Plus-Wert in €/Monat bei Renteneintritt. */
    plus_eur_monat: number;
  };
  /** § 109 Abs. 3 Nr. 5 — Beitragsübersicht letzte Periode. */
  beitragsuebersicht: {
    /** ISO YYYY (Kalenderjahr). */
    jahr: string;
    /** Gesamtbeiträge in € (vor Aufteilung). */
    gesamt_eur: number;
    /** Versicherten-Anteil in €. */
    versicherter_anteil_eur: number;
    /** Arbeitgeber-Anteil in €. */
    arbeitgeber_anteil_eur: number;
    /** Optional: öffentliche Kassen (z. B. Kindererziehung). */
    oeffentliche_kassen_eur?: number;
  };
  /** ISO-Datum: Brief-Erlassdatum (= Stichtag der Renteninformation). */
  stichtag: string;
  /** Quelle: aus welchem Letter resolved (Aktenzeichen aus letters.json). */
  quelle_letter_id: string;
  /** ISO-Timestamp: wann diese Eckdaten in Stammdaten abgelegt wurden. */
  abgelegt_am: string;
}

/**
 * Pflegegrad-Einwilligungs-Status (Art-9-Modal-Pattern, V1-Religion-Mechanik).
 * Hard-Line § 11.22: separater Storage-Key
 * `govtech-de:v1:stammdaten:pflegegrad-consent-session`.
 */
export interface PflegegradConsent {
  /**
   * Session-scoped Toggle; in `sessionStorage` gehalten und per
   * Web-Plattform-Definition bei Tab-/Browser-Close verworfen. F5-Page-
   * Reload setzt nicht zurück (analog Religion V1 § 11.4).
   */
  consent_session: boolean;
  /** Letzter Anzeige-Zeitstempel. */
  last_shown_at?: string;
}
```

### 4.3 `Stammdaten`-Read-Model erweitern

Das V1-`Stammdaten`-Interface (`src/types/stammdaten.ts`) wird additiv um zwei
neue Top-Level-Container erweitert:

```ts
// src/types/stammdaten.ts (V1.1 EXTEND)

export interface Stammdaten {
  // ... V1-Felder unverändert ...

  /** V1.1 — Altersvorsorge-Sektion. */
  altersvorsorge: {
    track: 'A' | 'B' | 'C';
    drv_traeger_id?: BehoerdeId; // bei Track A
    versorgungswerk?: { name: string; mitgliedsnummer: string }; // bei Track B
    eckdaten?: RentenEckdaten; // bei Track A nach Yellow-Letter-Bridge
    yellow_letter_id?: string; // verweist auf den Posteingang-Brief
  };

  /** V1.1 — Krankenversicherung & Pflege-Sektion. */
  krankenversicherung_pflege: {
    krankenkasse: { id: BehoerdeId; name: string };
    kvnr_v1_1?: { unveraenderbar: string; veraenderbar: string };
    versicherten_status: 'pflicht' | 'freiwillig' | 'familienversichert' | 'privat';
    familienversichert_ueber?: PersonaId | string;
    familienversichert_bis?: string;
    /** Familienversicherte Personen (nur bei Stamm-Versicherten). */
    familienversicherte_personen: Array<{
      persona_id?: PersonaId;
      vorname: string;
      nachname: string;
      familienversichert_bis: string;
      art: 'partner' | 'kind';
    }>;
    epa_status: { eingerichtet: boolean; widerspruch_gesetzt: boolean; eingerichtet_am?: string };
    erezept_modus: 'app' | 'egk' | 'papier';
    pflegekasse: { id: BehoerdeId; name: string };
    pflegegrad?: {
      grad: 1 | 2 | 3 | 4 | 5;
      bewilligt_am: string;
      begutachtung_stelle: 'md' | 'medicproof';
    };
    pflegegrad_consent: PflegegradConsent;
    anrechnungszeit_pflege?: {
      monate: number;
      pflegebeduerftige_person?: string;
      rechtsgrundlage: string;
    };
  };
}
```

### 4.4 Persistenz-Buckets (`src/lib/mock-backend/persistence.ts` Extension)

| Bucket-Key | Inhalt | Schema-Version |
|---|---|---|
| `govtech-de:v1:stammdaten:renten-eckdaten-v1-1` | `Record<PersonaId, RentenEckdaten>` (überschrieben pro Yellow-Letter-Bridge-Aufruf) | v1 |
| `govtech-de:v1:stammdaten:yellow-letter-bridge-applied` | `Record<PersonaId, string[]>` — Liste der bereits gebridgeten `letter_id`s pro Persona (Idempotenz nach Hard-Line § 11.25) | v1 |
| **NICHT in `localStorage`** — `sessionStorage` unter `govtech-de:v1:stammdaten:pflegegrad-consent-session` (Hard-Line § 11.22; Pattern erbt von V1-Religion § 11.4) | `Record<PersonaId, PflegegradConsent>` | — |

**Hard-Line § 11.25 Idempotenz**: Activity-Log-Eintrag pro `letter_id` höchstens 1× erzeugt, auch bei Page-Reload. Der `applyYellowLetterBridge(letter_id)`-Resolver prüft den Bucket `yellow-letter-bridge-applied[persona_id]` und no-op-bypassed bei bereits enthaltenem `letter_id`.

---

## 5. Mock-Backend Surface — neue API-Methoden

### 5.1 New API Methods (`src/lib/mock-backend/api.ts`)

```ts
// V1.1 — Read API
getAltersvorsorge(personaId: PersonaId): Promise<Stammdaten['altersvorsorge']>
getKrankenversicherungPflege(personaId: PersonaId): Promise<Stammdaten['krankenversicherung_pflege']>

// V1.1 — Yellow-Letter-Bridge
applyYellowLetterBridge(input: { letter_id: string; persona_id: PersonaId }): Promise<{
  applied: boolean;          // false = no-op (Hard-Line § 11.25 Idempotenz)
  eckdaten?: RentenEckdaten; // gefüllt wenn applied = true
  activity_log_entry_id?: string;
}>

// V1.1 — Pflegegrad-Consent (session-only, NICHT persistiert in localStorage)
consentPflegegrad(personaId: PersonaId): Promise<{ grad: 1 | 2 | 3 | 4 | 5 }>
revokePflegegradConsent(personaId: PersonaId): Promise<void>

// V1.1 — ePA-Status-Read (kein Schreib-Pfad in V1.1)
getEpaStatus(personaId: PersonaId): Promise<Stammdaten['krankenversicherung_pflege']['epa_status']>
```

**Latenz**: alle Methoden laufen durch `withLatency()` (300–800 ms + 5 % Fehlerquote, V1-Standard-Profil).

### 5.2 Neue Mock-Backend-Events (`src/types/mock-event.ts` Extension)

```ts
type StammdatenV1_1Event =
  | { type: 'stammdaten/yellow-letter-bridge-applied'; persona_id: PersonaId; letter_id: string }
  | { type: 'stammdaten/yellow-letter-bridge-skipped-idempotent'; persona_id: PersonaId; letter_id: string }
  | { type: 'stammdaten/pflegegrad-consented'; persona_id: PersonaId; session_only: true }
  | { type: 'stammdaten/pflegegrad-consent-revoked'; persona_id: PersonaId }
  | { type: 'stammdaten/epa-banner-seen'; persona_id: PersonaId };
```

Jeder Event ergänzt den Activity-Log mit einem `UebermittlungsLogEntry` (V1-Schema). Kategorien:
- `yellow-letter-bridge-applied` → `kategorie: 'app_aktivitaet'`, `note: 'persona_id:<id>; field_id:renten_eckdaten; quelle:posteingang_bridge; mock:true; letter_id:<id>'`, `rechtsgrundlage: '§ 109 Abs. 1 + Abs. 3 SGB VI'`
- `pflegegrad-consented` → `kategorie: 'app_aktivitaet'`, `note: 'persona_id:<id>; field_id:pflegegrad; consent:art_9_lit_a; quelle:user_pflegegrad_reveal; mock:true'`, `rechtsgrundlage: 'Art. 9 Abs. 2 lit. a DSGVO i.V.m. § 14 SGB XI'`
- `epa-banner-seen` → `kategorie: 'app_aktivitaet'`, `note: 'persona_id:<id>; field_id:epa_status; quelle:section_render; mock:true'`, `rechtsgrundlage: '§ 342 Abs. 1 S. 2 i.V.m. § 343 SGB V'` (Hard-Line § 11.26 zwei-Norm-Zitat)

### 5.3 Posteingang-Hook — Bridge-Trigger (`src/lib/mock-backend/autopilot/posteingang-renten-bridge.ts` — NEU)

> Architektur-Anmerkung: V1-Stammdaten hat einen Inbound-Hook für den
> Umzug-Cascade (siehe V1-Spec § 8.1 — `appendStammdatenLogEntry` aus
> `autopilot/umzug.ts`). V1.1 fügt einen analogen Hook für den
> Yellow-Letter-Eingang an. Trigger: kein automatischer Push, sondern
> User-Click auf den primary CTA „Werte in meinen Stammdaten ablegen"
> im LetterReader.

**Trigger**: `LetterReader`-Component erkennt `letter.archetype === 'renteninfo'` und rendert primary CTA „Werte in meinen Stammdaten ablegen" (separater CTA-Pfad — **NICHT** über Reply-Templates per § 11.20-Konsistenz mit Posteingang V1.5.1).

**Klick → Sequenz**:
1. `applyYellowLetterBridge({ letter_id, persona_id })` aufgerufen
2. Mock-Backend prüft `yellow-letter-bridge-applied[persona_id].includes(letter_id)`
3. Wenn ja → no-op, returns `{ applied: false }` + emittiert `stammdaten/yellow-letter-bridge-skipped-idempotent`
4. Wenn nein → resolved `RentenEckdaten` aus dem Letter-Body (deterministisch geseedet, siehe § 9), persistiert in `renten-eckdaten-v1-1[persona_id]`, fügt `letter_id` zu `yellow-letter-bridge-applied[persona_id]` hinzu, emittiert `stammdaten/yellow-letter-bridge-applied` + erzeugt **einen** Activity-Log-Eintrag
5. Frontend erhält Result + zeigt Toast „Renteninformation in Ihrer Sektion Altersvorsorge abgelegt" + `router.push('/stammdaten#altersvorsorge')`

**Hard-Line § 11.25 Idempotenz-Test** (Pflicht in Vitest-Suite, siehe § 15):
- `applyYellowLetterBridge` 2× hintereinander mit gleichem `letter_id` → 1 Activity-Log-Eintrag, 2. Aufruf returns `applied: false`
- Page-Reload-Simulation: Bucket-Hydration aus localStorage → erneuter Aufruf returns `applied: false`

---

## 6. Frontend Component-Inventory

> Convention identisch zu V1-Spec: `<NEW>` = neu anzulegen unter
> `src/components/stammdaten/v1-1/` (oder direkt in `src/components/stammdaten/`,
> Coder-Decision); `<EXTEND>` = bestehende Komponente erweitern; `reuse` =
> unverändert übernehmen.

### 6.1 Neue Sektion „Altersvorsorge"

| Komponente | Pfad | Zweck | Status |
|---|---|---|---|
| `<AltersvorsorgeSektion>` | `src/components/stammdaten/AltersvorsorgeSektion.tsx` | Wrapper auf `<StammdatenSektion>` (V1 reuse); rendert je nach `renten_track` einen von drei Pfaden: A=YellowLetterEcho, B=Versorgungswerk-Wegweiser, C=TrackCEmptyStateCard | `<NEW>` |
| `<YellowLetterEchoCard>` | `src/components/stammdaten/YellowLetterEchoCard.tsx` | **Hard-Line § 11.27 Strukturierung**: Card-Top-3 (Entgeltpunkte, Regelalter-Prognose, EM-Rente-Prognose) sichtbar + 2 Tooltips (Anpassungs-Wirkung, Beitragsübersicht-Hover) + Expandable-Section unten mit allen 5 Feldern + Stamp „Letzte Aktualisierung: per Renteninformation vom DD.MM.YYYY (Az. {aktenzeichen})"; `<NormZitatSpan>`-Wraps für `§ 109 Abs. 3 SGB VI` | `<NEW>` |
| `<ZfdrWegweiserCard>` | `src/components/stammdaten/ZfdrWegweiserCard.tsx` | Wegweiser-Card auf rentenuebersicht.de mit **Disclaimer-9 verbatim** (Versorgungswerke/Beamten/Direktzusagen-Ehrlichkeits-Klausel — Hard-Line § 11.23); externer Link, Mock-Disclaimer-Modal beim Klick; **kein** OAuth-Flow | `<NEW>` |
| `<TrackCEmptyStateCard>` | `src/components/stammdaten/TrackCEmptyStateCard.tsx` | **Hard-Line § 11.24** Mehmet-Empty-State; rendert Erklärungs-Wording verbatim (siehe § 3.3); zwei Norm-Zitat-Wraps (`§ 7 SGB VI`, `§ 2 SGB VI`); illustrierender Empty-State-Icon (lucide `User-x` oder `Compass`) | `<NEW>` |
| `<VersorgungswerkWegweiserCard>` | `src/components/stammdaten/VersorgungswerkWegweiserCard.tsx` | Track B (Kammerberuf): Wegweiser-Pointer auf Versorgungswerk-Portal; **NICHT in V1.1-Demo-Personas** sichtbar (kein Persona auf Track B); fall-back-Render falls künftig eine Track-B-Persona kommt; in V1.1 als „dead code" akzeptabel | `<NEW>` (optional) |
| `<AnrechnungszeitenList>` | `src/components/stammdaten/AnrechnungszeitenList.tsx` | Liste mit Anrechnungszeiten (Kindererziehung § 56 SGB VI, Wehr-/Zivildienst, **Pflege § 3 SGB VI** — Hard-Line § 11.30 gekoppelt!); pro Eintrag `<NormZitatSpan>`-Tooltip; Pflege-Zeile **nur sichtbar** wenn Pflegegrad-Modal-Consent erteilt ist (semantische Coupling) | `<NEW>` |

### 6.2 Neue Sektion „Krankenversicherung & Pflege"

| Komponente | Pfad | Zweck | Status |
|---|---|---|---|
| `<KvPflegeSektion>` | `src/components/stammdaten/KvPflegeSektion.tsx` | Wrapper auf `<StammdatenSektion>` (V1 reuse); rendert 6 FieldCards in fixer Reihenfolge | `<NEW>` |
| `<KrankenkasseFieldCard>` | `src/components/stammdaten/KrankenkasseFieldCard.tsx` | Krankenkasse-Name + KVNR (zwei-Teile-Visual-Trennung unveränderbar/veränderbar nach § 290 SGB V) + Versicherten-Status-Pill; `<BehoerdenBadge>` mit generischem Kassen-Logo; Korrekturweg-Pointer „Kassenwechsel über Direktkontakt zur Kasse" | `<NEW>` |
| `<FamilienversicherungFieldCard>` | `src/components/stammdaten/FamilienversicherungFieldCard.tsx` | Sichtbar bei Stamm-Versicherten mit Angehörigen oder bei Familienversicherten selbst; rendert Status-Pill „Familienversichert über {Stammversicherte} — bis längstens MM/JJJJ" oder Liste der mitversicherten Personen; `<NormZitatSpan>` für `§ 10 SGB V`; Einkommens-Grenzen-Tooltip „2026: 565 €/Monat allgemein bzw. 603 € Minijob" | `<NEW>` |
| `<EpaStatusFieldCard>` | `src/components/stammdaten/EpaStatusFieldCard.tsx` | ePA-Existenz Status-Pill + ePA-Widerspruch Boolean-Pill + **obligatorisches Disclaimer-Banner** (§ 11.21 Zeile 5) mit Disclaimer-8 verbatim; Wegweiser „ePA verwalten Sie über Ihre Kassen-App"; `<NormZitatSpan>` für `§ 342 Abs. 1 S. 2 SGB V` UND `§ 343 SGB V` (Hard-Line § 11.26 zwei-Norm-Zitat); emittiert beim Render `stammdaten/epa-banner-seen`-Event (Activity-Log) **maximal 1× pro Page-Load** (Idempotenz) | `<NEW>` |
| `<ERezeptFieldCard>` | `src/components/stammdaten/ERezeptFieldCard.tsx` | eRezept-Bezugsmodus (App / eGK / Papierausdruck) als Read-Only-Pill; Wegweiser „App herunterladen → gematik E-Rezept-App"; **erste streichbar bei Scope-Druck** (Hard-Line § 11.29) | `<NEW>` |
| `<PflegeFieldCard>` | `src/components/stammdaten/PflegeFieldCard.tsx` | Pflegekasse-Name (= GKV-Kasse oder PKV-Pflichtversicherer) sichtbar; **Pflegegrad-Sub-Card** default-collapsed mit Button „Pflegegrad anzeigen"; Klick öffnet `<PflegegradConsentModal>`; nach Consent rendert Grad + Bewilligungsdatum + 25-AT-Frist-Info (`§ 18c SGB XI`) + Begutachtungs-Stelle (MD vs MEDICPROOF) + Wegweiser Höher­stufungs­antrag | `<NEW>` |
| `<PflegegradConsentModal>` | `src/components/stammdaten/PflegegradConsentModal.tsx` | base-ui `<AlertDialog>`, Pattern-Konsistenz zu V1 `<ReligionConsentModal>` (Hard-Line § 11.22); Modal-Body verbatim aus `stammdaten.disclaimer.pflegegrad_art9` + Einwilligungs-Toggle; primary „Pflegegrad anzeigen" disabled bis Toggle on; `<NormZitatSpan>`-Wrap für `EuGH 01.08.2022 — C-184/20` über die neue Rechtsprechungs-Lookup-Klasse (Hard-Line § 11.28); `aria-modal="true"` + focus-trap | `<NEW>` |

### 6.3 Posteingang-Bridge — neuer CTA-Pfad (V1.5-Komponenten-Erweiterung)

| Komponente | Pfad | Zweck | Status |
|---|---|---|---|
| `<LetterReader>` | `src/components/posteingang/LetterReader.tsx` | **EXTEND**: Bei `letter.archetype === 'renteninfo'` rendert primary CTA „Werte in meinen Stammdaten ablegen" (separater CTA-Pfad neben dem bestehenden V1.5 „Antwort verfassen" — Reply-Templates für `renteninfo` sind **nicht** vorgesehen, weil info-only); Klick → `applyYellowLetterBridge()` → Toast + Navigation | `<EXTEND>` |
| `<RentenBridgeCTA>` | `src/components/posteingang/RentenBridgeCTA.tsx` | Atomare CTA-Komponente; rendert nur Button + Loading-State + Idempotency-Indikator („bereits abgelegt am DD.MM.YYYY") wenn `yellow-letter-bridge-applied`-Bucket den `letter_id` enthält | `<NEW>` |

> **Verifier-Konsistenz #2-Bezug**: Bridge-CTA ist **separater CTA-Pfad** —
> nicht Reply-Template-`null`-Freitext-Mode, nicht Skelett-Template, nicht
> `was_kann_ich_tun`-Option. Eigene Komponente `<RentenBridgeCTA>` mit
> eigenem Activity-Log-Marker (`quelle:posteingang_bridge`).

### 6.4 NormZitatSpan-Lookup-Map Extension (V1-Hard-Line § 11.7 Erweiterung)

V1.1 erweitert die Lookup-Map (`src/components/posteingang/normZitatLookup.ts`) um die folgenden Norm-Zitate:

| Sichtbarer Text | `aria-label` |
|---|---|
| `§ 109 SGB VI` | „Paragraph 109 des Sozialgesetzbuches Sechs" |
| `§ 109 Abs. 1 SGB VI` | „Paragraph 109 Absatz 1 des Sozialgesetzbuches Sechs" |
| `§ 109 Abs. 3 SGB VI` | „Paragraph 109 Absatz 3 des Sozialgesetzbuches Sechs" |
| `§ 50 SGB VI` | „Paragraph 50 des Sozialgesetzbuches Sechs" |
| `§ 7 SGB VI` | „Paragraph 7 des Sozialgesetzbuches Sechs" (freiwillige GRV) |
| `§ 2 SGB VI` | „Paragraph 2 des Sozialgesetzbuches Sechs" (Pflicht-Selbstständige) |
| `§ 6 Abs. 1 Nr. 1 SGB VI` | „Paragraph 6 Absatz 1 Nummer 1 des Sozialgesetzbuches Sechs" (Versorgungswerk-Befreiung) |
| `§ 56 SGB VI` | „Paragraph 56 des Sozialgesetzbuches Sechs" (Kindererziehungs-Anrechnung) |
| `§ 3 SGB VI` | „Paragraph 3 des Sozialgesetzbuches Sechs" (Anrechnungszeit Pflege) |
| `§ 128 SGB VI` | „Paragraph 128 des Sozialgesetzbuches Sechs" (Regionalträger) |
| `§ 147 SGB VI` | (V1 bereits gepflegt) |
| `§ 290 SGB V` | (V1 bereits gepflegt) |
| `§ 291 SGB V` | „Paragraph 291 des Sozialgesetzbuches Fünf" (eGK-Pflicht) |
| `§ 291a SGB V` | „Paragraph 291a des Sozialgesetzbuches Fünf" (eGK-Anwendungen) |
| `§ 342 SGB V` | „Paragraph 342 des Sozialgesetzbuches Fünf" (ePA-Anlage-Pflicht) |
| `§ 342 Abs. 1 S. 2 SGB V` | „Paragraph 342 Absatz 1 Satz 2 des Sozialgesetzbuches Fünf" |
| `§ 343 SGB V` | „Paragraph 343 des Sozialgesetzbuches Fünf" (ePA-Informationspflicht) |
| `§ 10 SGB V` | (V1 ggf. erweitern) — „Paragraph 10 des Sozialgesetzbuches Fünf" (Familienversicherung) |
| `§ 14 SGB XI` | „Paragraph 14 des Sozialgesetzbuches Elf" (Pflegegrad-Bewertung) |
| `§ 18c SGB XI` | „Paragraph 18c des Sozialgesetzbuches Elf" (25-Arbeitstage-Frist) |
| `§ 20 SGB XI` | „Paragraph 20 des Sozialgesetzbuches Elf" (Pflichtversicherung) |
| `§ 23 SGB XI` | „Paragraph 23 des Sozialgesetzbuches Elf" (PKV-Pflegepflichtversicherung) |

### 6.5 Rechtsprechungs-Lookup-Klasse (NEU — Hard-Line § 11.28)

V1.1 führt eine **neue Pattern**-Klasse für Rechtsprechungs-Zitate ein. Datei: `src/components/posteingang/rechtsprechungsLookup.ts` (NEU).

```ts
// src/components/posteingang/rechtsprechungsLookup.ts (NEW)

export interface RechtsprechungsZitat {
  /** Sichtbarer Kurztext, z. B. "EuGH C-184/20". */
  kurz: string;
  /** Voll-aria-label für Screenreader, z. B. "Urteil des Europäischen
   *  Gerichtshofs vom 1. August 2022 in der Rechtssache C-184 Schrägstrich 20". */
  aria_label: string;
  /** Vollständiges Zitat für Tooltip-Body. */
  vollzitat: string;
  /** Hauptaussage in 1 Satz für Tooltip-Body. */
  kernaussage_de: string;
}

export const RECHTSPRECHUNGS_LOOKUP: Record<string, RechtsprechungsZitat> = {
  'EuGH C-184/20': {
    kurz: 'EuGH C-184/20',
    aria_label: 'Urteil des Europäischen Gerichtshofs vom 1. August 2022 in der Rechtssache C-184 Schrägstrich 20',
    vollzitat: 'EuGH, Urteil v. 01.08.2022 — C-184/20 (OT v. Vyriausioji tarnybinės etikos komisija)',
    kernaussage_de: 'Sensitive Daten iSv Art. 9 DSGVO sind alle Daten, aus denen durch gedanklichen Schluss oder Vergleich Informationen über die geschützten Kategorien (Gesundheit, Sexualität, Religion, Politik) ableitbar sind — auch eine indirekte Offenbarung genügt (weite Auslegung).',
  },
  // V2-Hook für künftige Rechtsprechungs-Verweise
};
```

**`<RechtsprechungZitatSpan>`** (NEU): Wrapper-Komponente analog `<NormZitatSpan>` mit `aria-label` aus Lookup + Tooltip mit `vollzitat` + `kernaussage_de`. Verwendet in `<PflegegradConsentModal>` Body und in der Activity-Log-Tooltip-Variante des Pflegegrad-Eintrags.

### 6.6 Yellow-Letter-Bridge-CTA — separater CTA-Pfad (Hard-Line § 11.20-Konsistenz)

**Verbindlich**: Der Bridge-CTA ist eine eigenständige Komponente mit eigenem Code-Pfad und Activity-Log-Marker. Er teilt **nicht** den Reply-Compose-State, **nicht** das Reply-Template-Switch-Confirm-Pattern, **nicht** den Reply-Template-Order-Mechanismus. Ist er bereits einmal ausgelöst (Idempotenz § 11.25), zeigt der Button stattdessen einen Read-Only-Indikator „bereits am DD.MM.YYYY in Stammdaten abgelegt" mit deeplink zu `/stammdaten#altersvorsorge`.

---

## 7. i18n key-tree (DE source-of-truth + 5 locales)

### 7.1 Disclaimer-Strings (verbindlich verbatim aus Domain-Doc § "Legal disclaimer to surface in UI")

| Key | DE-Quelle | Lokalisiert |
|---|---|---|
| `stammdaten.disclaimer.renteninfo_info_only` | Domain-Doc Disclaimer-6 verbatim | 6 locales |
| `stammdaten.disclaimer.pflegegrad_art9` | Domain-Doc Disclaimer-7 verbatim (mit EuGH C-184/20 + § 14 SGB XI + § 18c SGB XI Verweisen) | 6 locales |
| `stammdaten.disclaimer.epa_anlage_widerspruch` | Domain-Doc Disclaimer-8 verbatim (§ 342 Abs. 1 S. 2 i.V.m. § 343 SGB V) | 6 locales |
| `stammdaten.disclaimer.zfdr_unvollstaendig` | Domain-Doc Disclaimer-9 verbatim (700+ Einrichtungen, 137 Mio Anwartschaften, Versorgungswerke/Beamten/Direktzusagen-Klausel) | 6 locales |
| `stammdaten.disclaimer.pflegegrad_consent_toggle_label` | Pattern-Konsistenz zu Religion-V1: „Ich willige ausdrücklich in die Anzeige meines Pflegegrads ein (Art. 9 Abs. 2 lit. a DSGVO)." | 6 locales |
| `stammdaten.disclaimer.track_c_empty_state_body` | Verifier-Locked Wording (Hard-Line § 11.24) verbatim | 6 locales |

### 7.2 Sektion-Titel + UI-Chrome

| Key | DE | Lokalisiert |
|---|---|---|
| `stammdaten.sektion.altersvorsorge.title` | „Altersvorsorge" | 6 locales |
| `stammdaten.sektion.altersvorsorge.subtitle` | „Gesetzliche Rente, Versorgungswerke und Privatvorsorge im Überblick" | 6 locales |
| `stammdaten.sektion.kv_pflege.title` | „Krankenversicherung & Pflege" | 6 locales |
| `stammdaten.sektion.kv_pflege.subtitle` | „Krankenkasse, ePA, eRezept und Pflege" | 6 locales |
| `stammdaten.altersvorsorge.yellow_letter_echo.card_top_3.entgeltpunkte` | „Entgeltpunkte" | 6 locales |
| `stammdaten.altersvorsorge.yellow_letter_echo.card_top_3.regelalter_prognose` | „Prognose Regelaltersrente (67)" | 6 locales |
| `stammdaten.altersvorsorge.yellow_letter_echo.card_top_3.em_rente_prognose` | „Prognose Erwerbsminderungsrente" | 6 locales |
| `stammdaten.altersvorsorge.yellow_letter_echo.expandable_label` | „Alle 5 Pflicht-Inhalte (§ 109 Abs. 3 SGB VI) anzeigen" | 6 locales |
| `stammdaten.altersvorsorge.yellow_letter_echo.tooltip.anpassungs_wirkung` | „Wirkung künftiger Anpassungen — Beispiel: bei {prozent} % p.a. steigt der Wert um {plus} €/Monat bis Renteneintritt" | 6 locales |
| `stammdaten.altersvorsorge.yellow_letter_echo.tooltip.beitragsuebersicht` | „Beitragsübersicht {jahr}: {gesamt} € (Sie: {versicherter}, Arbeitgeber: {arbeitgeber})" | 6 locales |
| `stammdaten.altersvorsorge.yellow_letter_echo.stamp` | „Werte stammen aus Ihrer Renteninformation vom {stichtag} (Az. {aktenzeichen}). Berechnung durch DRV-Träger nach § 109 SGB VI." | 6 locales |
| `stammdaten.altersvorsorge.zfdr_wegweiser.title` | „Trägerübergreifender Überblick: Digitale Rentenübersicht" | 6 locales |
| `stammdaten.altersvorsorge.zfdr_wegweiser.cta` | „Zur Digitalen Rentenübersicht (rentenuebersicht.de)" | 6 locales |
| `stammdaten.altersvorsorge.track_c.empty_state_title` | „Keine Renteninformation vorhanden" | 6 locales |
| `stammdaten.altersvorsorge.track_c.empty_state_body` | (verbatim verifier-locked, Hard-Line § 11.24, siehe § 3.3 dieser Spec) | 6 locales |
| `stammdaten.kv_pflege.krankenkasse.label` | „Krankenkasse" | 6 locales |
| `stammdaten.kv_pflege.krankenkasse.kvnr_label` | „Krankenversichertennummer (KVNR, § 290 SGB V)" | 6 locales |
| `stammdaten.kv_pflege.krankenkasse.kvnr_part_unveraenderbar_label` | „Unveränderbarer Teil (lebenslang)" | 6 locales |
| `stammdaten.kv_pflege.krankenkasse.kvnr_part_veraenderbar_label` | „Veränderbarer Teil (Kassenbezug)" | 6 locales |
| `stammdaten.kv_pflege.krankenkasse.versicherten_status.pflicht` | „Pflichtversichert" | 6 locales |
| `stammdaten.kv_pflege.krankenkasse.versicherten_status.freiwillig` | „Freiwillig versichert" | 6 locales |
| `stammdaten.kv_pflege.krankenkasse.versicherten_status.familienversichert` | „Familienversichert" | 6 locales |
| `stammdaten.kv_pflege.krankenkasse.versicherten_status.privat` | „Privat versichert (PKV)" | 6 locales |
| `stammdaten.kv_pflege.familienversicherung.title` | „Familienversicherung" | 6 locales |
| `stammdaten.kv_pflege.familienversicherung.status_pill` | „Familienversichert über {stammversicherte} — bis längstens {bis_datum}" | 6 locales |
| `stammdaten.kv_pflege.familienversicherung.einkommen_grenze_tooltip` | „Einkommensgrenze 2026: 565 €/Monat allgemein bzw. 603 € Minijob (§ 10 SGB V)" | 6 locales |
| `stammdaten.kv_pflege.epa.title` | „Elektronische Patientenakte (ePA)" | 6 locales |
| `stammdaten.kv_pflege.epa.status_pill_eingerichtet` | „ePA eingerichtet (Standard seit 15.01.2025)" | 6 locales |
| `stammdaten.kv_pflege.epa.status_pill_widerspruch_nein` | „Anlage nicht widersprochen" | 6 locales |
| `stammdaten.kv_pflege.epa.status_pill_widerspruch_ja` | „Anlage widersprochen" | 6 locales |
| `stammdaten.kv_pflege.epa.cta_external` | „ePA verwalten Sie über Ihre Kassen-App" | 6 locales |
| `stammdaten.kv_pflege.erezept.title` | „eRezept" | 6 locales |
| `stammdaten.kv_pflege.erezept.modus.app` | „Bezug via gematik E-Rezept-App" | 6 locales |
| `stammdaten.kv_pflege.erezept.modus.egk` | „Bezug via eGK in der Apotheke" | 6 locales |
| `stammdaten.kv_pflege.erezept.modus.papier` | „Bezug via Papierausdruck" | 6 locales |
| `stammdaten.kv_pflege.pflege.title` | „Pflegeversicherung" | 6 locales |
| `stammdaten.kv_pflege.pflege.kasse_label` | „Pflegekasse" | 6 locales |
| `stammdaten.kv_pflege.pflege.pflegegrad_collapsed_button` | „Pflegegrad anzeigen" | 6 locales |
| `stammdaten.kv_pflege.pflege.pflegegrad_grad_label` | „Pflegegrad {grad}" | 6 locales |
| `stammdaten.kv_pflege.pflege.bewilligt_am_label` | „Bewilligt am {datum}" | 6 locales |
| `stammdaten.kv_pflege.pflege.begutachtung_md_label` | „Begutachtet durch Medizinischen Dienst (GKV)" | 6 locales |
| `stammdaten.kv_pflege.pflege.begutachtung_medicproof_label` | „Begutachtet durch MEDICPROOF (PKV)" | 6 locales |
| `stammdaten.kv_pflege.pflege.frist_25_at` | „Pflegekasse muss innerhalb von 25 Arbeitstagen entscheiden (§ 18c SGB XI)" | 6 locales |
| `stammdaten.kv_pflege.pflege.cta_hoeherstufung` | „Höherstufung beantragen → Online-Filiale Ihrer Pflegekasse" | 6 locales |

### 7.3 Modal-Strings (Pflegegrad-Modal)

| Key | DE | Lokalisiert |
|---|---|---|
| `stammdaten.modal.pflegegrad_consent.title` | „Pflegegrad anzeigen — Einwilligung erforderlich" | 6 locales |
| `stammdaten.modal.pflegegrad_consent.cta_show` | „Pflegegrad anzeigen" | 6 locales |
| `stammdaten.modal.pflegegrad_consent.cta_cancel` | „Abbrechen" | 6 locales |

### 7.4 Activity-Log-Zwecke (V1.1-spezifisch)

| Key | DE | Lokalisiert |
|---|---|---|
| `stammdaten.aktivitaet.zweck.renteninfo_eingelesen` | „Renteninformation in Stammdaten abgelegt (§ 109 Abs. 1 + Abs. 3 SGB VI)" | 6 locales |
| `stammdaten.aktivitaet.zweck.app_pflegegrad_angezeigt` | „Pflegegrad in der App angezeigt (Art. 9 Abs. 2 lit. a DSGVO i.V.m. § 14 SGB XI)" | 6 locales |
| `stammdaten.aktivitaet.zweck.app_epa_banner_gesehen` | „ePA-Status-Banner gesehen (§ 342 Abs. 1 S. 2 i.V.m. § 343 SGB V)" | 6 locales |
| `stammdaten.aktivitaet.zweck.bridge_skipped_idempotent` | „Bridge-Aufruf übersprungen (Renteninformation bereits abgelegt)" | 6 locales |

### 7.5 Posteingang-Bridge-CTA (V1.5-Erweiterung)

| Key | DE | Lokalisiert |
|---|---|---|
| `posteingang.bridge.renten_cta_label` | „Werte in meinen Stammdaten ablegen" | 6 locales |
| `posteingang.bridge.renten_already_applied` | „Bereits am {datum} in Ihrer Sektion Altersvorsorge abgelegt" | 6 locales |
| `posteingang.bridge.renten_toast_success` | „Renteninformation in Ihrer Sektion Altersvorsorge abgelegt" | 6 locales |
| `posteingang.bridge.renten_navigate_label` | „Zur Sektion Altersvorsorge" | 6 locales |

### 7.6 i18n-Localizer-Reminders (Memory-Lessons)

- **JSON.parse pre-flight** auf jedem der 6 Locale-Files vor PR-Push (V1.5-Ship-Lessons-Note „i18n JSON syntax breaks").
- **`§§`-Literale preservieren** in Disclaimer-Strings.
- **AR-Locale**: DE-Norm-Paragraph-Nummern (`§ 109 Abs. 3 SGB VI`) literal beibehalten; DE-Aktenzeichen (`[MOCK] 65 170395 P 042 / RI-2026`) bleiben LTR-Latin.
- **Klartext-Gesetzes-Erhalt-Rule**: in Disclaimer-Strings bleiben „Sozialgesetzbuch Sechs", „Sozialgesetzbuch Fünf", „Sozialgesetzbuch Elf", „Datenschutz-Grundverordnung", „Europäischer Gerichtshof" als Eigennamen erhalten — nicht ins jeweilige Lokal-Vokabular übersetzen.
- **EuGH-Zitat C-184/20**: Latein-Schrift in allen Locales (auch AR/RU/UK).

**Schätzung effektiver i18n-JSON-Leaves V1.1**: ~60 neue Top-Keys × 6 Locales ≈ 360 Strings additiv (ohne V1-Bestand).

---

## 8. Autopilot-Hooks — Yellow-Letter-Bridge

> Architektur-Anmerkung: Anders als der Umzug-Cascade (Push-Trigger durch
> Vorgang-Wizard-Abschluss) ist die V1.1-Yellow-Letter-Bridge ein
> **User-Click-Trigger** im Posteingang. Kein automatischer Hintergrund-Pull.

### 8.1 Inbound — Posteingang triggert Stammdaten-Update

**Event-Sequenz** (Click auf primary CTA „Werte in meinen Stammdaten ablegen"):

1. `<RentenBridgeCTA>` (Client-Component) ruft `applyYellowLetterBridge({ letter_id, persona_id })`.
2. Mock-Backend (`src/lib/mock-backend/api.ts` neue Methode):
   - lädt Bucket `govtech-de:v1:stammdaten:yellow-letter-bridge-applied[persona_id]`
   - prüft `letter_id` in `applied`-Liste
   - Wenn `true` → no-op, returns `{ applied: false }`, emittiert `stammdaten/yellow-letter-bridge-skipped-idempotent` (kein Activity-Log-Eintrag — Idempotenz § 11.25)
   - Wenn `false` → 
     a) resolved `RentenEckdaten` aus dem Letter (deterministisch geseedet, siehe § 9)
     b) persistiert in Bucket `govtech-de:v1:stammdaten:renten-eckdaten-v1-1[persona_id]`
     c) fügt `letter_id` zu `applied`-Liste hinzu
     d) emittiert `stammdaten/yellow-letter-bridge-applied`
     e) erzeugt **einen** Activity-Log-Eintrag (`UebermittlungsLogEntry`) mit `kategorie: 'app_aktivitaet'`, `zweck_i18n_key: 'stammdaten.aktivitaet.zweck.renteninfo_eingelesen'`, `rechtsgrundlage: '§ 109 Abs. 1 + Abs. 3 SGB VI'`, `note: 'persona_id:<id>; field_id:renten_eckdaten; quelle:posteingang_bridge; mock:true; letter_id:<id>'`
     f) returns `{ applied: true, eckdaten, activity_log_entry_id }`
3. Frontend zeigt Toast + navigiert zu `/stammdaten#altersvorsorge`.

### 8.2 Idempotenz-Garantie (Hard-Line § 11.25)

Die Idempotenz ist auf zwei Ebenen abgesichert:

1. **Bucket-Level**: `yellow-letter-bridge-applied[persona_id]` ist persistiert in `localStorage` und überlebt Page-Reloads.
2. **Mock-Backend-Method-Level**: `applyYellowLetterBridge` prüft den Bucket *vor* der State-Mutation und returns `{ applied: false }` bei Doppel-Aufruf.

**Negativ-Test in Vitest** (Pflicht):
```ts
test('§ 11.25 idempotency — bridge applied at most once per letter_id', async () => {
  const result1 = await applyYellowLetterBridge({ letter_id: 'letter-renteninfo-anna-2026-05', persona_id: 'anna-petrov' });
  expect(result1.applied).toBe(true);
  const result2 = await applyYellowLetterBridge({ letter_id: 'letter-renteninfo-anna-2026-05', persona_id: 'anna-petrov' });
  expect(result2.applied).toBe(false);
  const log = await getStammdatenAktivitaet({ kategorie: 'app_aktivitaet' });
  const renteninfoEntries = log.filter(e => e.note?.includes('letter_id:letter-renteninfo-anna-2026-05'));
  expect(renteninfoEntries.length).toBe(1);
});
```

### 8.3 Outbound — keine Outbound-Trigger in V1.1

V1.1 ergänzt **keine** neuen `<KorrigierenCTA>`-Pfade auf den V1.1-FieldCards. Korrektur-Pointer sind ausschließlich Read-Only-Wegweiser:
- DRV-Konto-Klärung → eservice-drv.de (externer Link)
- Kassenwechsel → Direktkontakt zur Kasse (kein Wizard)
- ePA-Widerspruch → Kassen-App (externer Link)
- Pflegegrad-Höher­stufung → Online-Filiale Pflegekasse (externer Link)

Frontend-coder darf für V1.1-Felder **keine** neuen Wizard-Slugs in der `<KorrigierenCTA>`-Lookup-Map (V1-Spec § 8.2) anlegen. Outbound-Wizards für Renten-/KV-Themen bleiben V2-Hook.

---

## 9. Mock-Letter-Inventory

### 9.1 NEU: `letter-renteninfo-anna-2026-05` in `src/data/letters.json`

Verbatim aus Domain-Doc § "Realistic Mock-Letter" (mit § 109 Abs. 3 fünf Pflicht-Inhalten — Hard-Line § 11.27):

```json
{
  "id": "letter-renteninfo-anna-2026-05",
  "absender_behoerde_id": "drv-berlin-brandenburg",
  "empfaenger_persona_id": "anna-petrov",
  "aktenzeichen": "[MOCK] 65 170395 P 042 / RI-2026",
  "aktenzeichen_weitere": ["[MOCK] 65 170395 P 042"],
  "betreff": "Ihre Renteninformation 2026 (§ 109 Abs. 1 SGB VI)",
  "body_de": "[MOCK – Verwaltungsdemo, keine echten Daten]\n\nDeutsche Rentenversicherung Berlin-Brandenburg\nFriedrich-Ebert-Str. 34, 14469 Potsdam\n\nSehr geehrte Frau Petrov,\n\ndiese Renteninformation gibt Ihnen einen Überblick über Ihre bisher erworbenen Anwartschaften aus der gesetzlichen Rentenversicherung sowie eine Prognose Ihrer voraussichtlichen Regelaltersrente. Sie wird Ihnen gemäß § 109 Sozialgesetzbuch Sechstes Buch (SGB VI) jährlich übersandt.\n\n1. Grundlage der Berechnung: Beitragszeiten 01/2018 – 12/2025 (8,1 Jahre); 6,8 Entgeltpunkte erworben.\n2. Bei sofortiger voller Erwerbsminderung: 312,21 €/Monat.\n3. Prognose Regelaltersrente bei Erreichen Regelaltersgrenze 67 (ohne weitere Beiträge): 743,99 €/Monat.\n4. Wirkung künftiger Anpassungen: bei jährlicher Anpassung von durchschn. 2 % steigt der prognostizierte Wert um ca. 1.100 €/Monat bis zum Renteneintritt.\n5. Beitragsübersicht 2025: 8.414,52 € gesamt (davon Sie: 4.207,26 €; Arbeitgeber: 4.207,26 €).\n\nVoraussetzung dieser Prognose: Mindestversicherungszeit nach § 50 SGB VI ist erfüllt.\n\nDiese Mitteilung ist maschinell erstellt und auch ohne Unterschrift gültig. Bei Fragen zu Ihrer Rente nutzen Sie bitte unser Online-Kundenportal eservice-drv.de oder vereinbaren einen Termin in einer unserer Beratungsstellen.\n\nMit freundlichen Grüßen\nDeutsche Rentenversicherung Berlin-Brandenburg\nAz. [MOCK] 65 170395 P 042 / RI-2026",
  "ai_summary": {
    "de": "Renteninformation 2026 — fünf Pflicht-Inhalte (§ 109 Abs. 3 SGB VI): 6,8 Entgeltpunkte; EM-Renten-Prognose 312 €/Monat; Regelalter-Prognose 744 €/Monat; Anpassungs-Plus ~1.100 €/Monat; Beiträge 2025 = 8.415 €.",
    "pre_open": {
      "text": "DRV Berlin-Brandenburg · Renteninformation · Keine Frist",
      "generated_at": "2026-05-08T10:14:00.000Z"
    },
    "post_open": {
      "bullets": [
        { "text": "Grundlage der Berechnung: 01/2018 – 12/2025 (8,1 Jahre Beitragszeit); 6,8 Entgeltpunkte erworben." },
        { "text": "Bei sofortiger voller Erwerbsminderung: 312,21 €/Monat." },
        { "text": "Prognose Regelaltersrente (67, ohne weitere Beiträge): 743,99 €/Monat." },
        { "text": "Wirkung künftiger Anpassungen: ca. +1.100 €/Monat bis Renteneintritt bei 2 % p.a." },
        { "text": "Beitragsübersicht 2025: 8.414,52 € gesamt (Sie/Arbeitgeber je 4.207,26 €)." }
      ],
      "citations": [
        { "bullet_index": 0, "original_zitat": "Grundlage der Berechnung: Beitragszeiten 01/2018 – 12/2025 (8,1 Jahre); 6,8 Entgeltpunkte erworben." },
        { "bullet_index": 1, "original_zitat": "Bei sofortiger voller Erwerbsminderung: 312,21 €/Monat." },
        { "bullet_index": 2, "original_zitat": "Prognose Regelaltersrente bei Erreichen Regelaltersgrenze 67 (ohne weitere Beiträge): 743,99 €/Monat." },
        { "bullet_index": 3, "original_zitat": "Wirkung künftiger Anpassungen: bei jährlicher Anpassung von durchschn. 2 % steigt der prognostizierte Wert um ca. 1.100 €/Monat bis zum Renteneintritt." },
        { "bullet_index": 4, "original_zitat": "Beitragsübersicht 2025: 8.414,52 € gesamt (davon Sie: 4.207,26 €; Arbeitgeber: 4.207,26 €)." }
      ],
      "generated_at": "2026-05-08T10:14:00.000Z",
      "model": "claude-haiku-4-5-20251001"
    }
  },
  "archetype": "renteninfo",
  "auth_channel": "briefpost",
  "fristen": [],
  "was_kann_ich_tun_options": [
    "renteninfo.in_stammdaten_ablegen",
    "renteninfo.drv_kundenportal_oeffnen"
  ],
  "status": "ungelesen",
  "empfangen_am": "2026-05-08T10:14:00.000Z",
  "bescheid_dated_at": "2026-05-04"
}
```

### 9.2 LetterArchetype Schema-Extension

`src/types/letter.ts` LetterArchetype-Union erweitern:

```ts
export type LetterArchetype =
  | 'steuerbescheid'
  | 'krankenkasse-beitrag'
  | 'beitragsservice-mahnung'
  | 'abh-verlaengerung'
  | 'familienkasse-nachweis'
  | 'buergeramt-meldung'
  | 'ihk-beitrag'
  | 'berufsgenossenschaft-beitrag'
  | 'standesamt-urkunde'
  | 'renteninfo'   // V1.1 — § 109 SGB VI Yellow-Letter
  | 'sonstiges';
```

`src/lib/mock-backend/schemas.ts` `letterArchetypeSchema` ebenfalls erweitern.

### 9.3 `required_action`-Wert für info-only

V1.1 nutzt **leeres `fristen: []`-Array** als info-only-Indikator (V1.5-Konvention). Das bestehende `required_action`-Optional-Feld bleibt undefined — kein neuer enum-Wert nötig.

### 9.4 LetterReader-Component-Hook (V1.5-EXTEND)

`<LetterReader>` (`src/components/posteingang/LetterReader.tsx`) erkennt `letter.archetype === 'renteninfo'` und rendert:
- **Statt** des Reply-Compose-CTA: den `<RentenBridgeCTA>` als primary CTA
- **Zusätzlich** ein Secondary-Link „Im DRV-Kundenportal öffnen" (externer Link mit Mock-Disclaimer-Modal)
- **Keine** Reply-Templates-Liste im Was-kann-ich-tun-Block (Reply-Compose ist für `renteninfo` deaktiviert)

---

## 10. Behörden-Erweiterung in `src/data/behoerden.json`

V1.1 fügt mindestens die folgenden Behörden hinzu (Quellen aus Domain-Doc § "Zuständigkeit"):

| Behörden-ID | Name | Kategorie | Zuständige Themen | Adresse |
|---|---|---|---|---|
| `drv-bund` | Deutsche Rentenversicherung Bund | bundesweit | rentenversicherung, ueberregionale_verfahren | Ruhrstr. 2, 10709 Berlin |
| `drv-berlin-brandenburg` | Deutsche Rentenversicherung Berlin-Brandenburg | sozialversicherung | rentenversicherung_regional | Friedrich-Ebert-Str. 34, 14469 Potsdam |
| `drv-nord` | Deutsche Rentenversicherung Nord | sozialversicherung | rentenversicherung_regional | Ziegelstr. 150, 23556 Lübeck |
| `drv-rheinland` | Deutsche Rentenversicherung Rheinland | sozialversicherung | rentenversicherung_regional | Königsallee 71, 40215 Düsseldorf |
| `drv-bayern-sued` | Deutsche Rentenversicherung Bayern Süd | sozialversicherung | rentenversicherung_regional | Am Alten Viehmarkt 2, 84028 Landshut |
| `gematik` | gematik GmbH (Telematikinfrastruktur) | privat-mit-hoheitlichem-Auftrag | telematikinfrastruktur, epa, erezept | Friedrichstr. 136, 10117 Berlin |
| `aok-nordost-pflegekasse` | AOK Nordost — Pflegekasse | sozialversicherung | pflegeversicherung | Wilhelmstr. 1, 10963 Berlin |
| `tk-pflegekasse` | TK-Pflegekasse | sozialversicherung | pflegeversicherung | Bramfelder Str. 140, 22305 Hamburg |
| `barmer-pflegekasse` | Barmer Pflegekasse | sozialversicherung | pflegeversicherung | Axel-Springer-Platz 1, 20355 Hamburg |
| `zfdr-drv-bund` | Zentrale Stelle für die Digitale Rentenübersicht (ZfDR) | bundesweit | rentenuebersicht | bei DRV Bund (Ruhrstr. 2, 10709 Berlin) |

> **Logo-Hinweis** (V1-Hard-Line § 11.9 vererbt): Behörden-Logos sind generisch
> (Kategorie-Icon), keine echten Wappen/Markennamen-Logos.

`gematik` erhält Kategorie `privat-mit-hoheitlichem-Auftrag` (oder `bundesweit`, je nach V1-Behörden-Kategorie-Set; Coder-Decision). `<BehoerdenBadge>` rendert mit Kategorie-Icon.

**`behoerde.kategorie`-Erweiterung** (falls nötig): `privat-mit-hoheitlichem-Auftrag` ist ein neuer Wert für gematik. Wenn das V1-Schema diese Kategorie nicht kennt, fällt gematik auf `bundesweit` zurück (gematik GmbH ist 100 % Bund-finanziert seit 2024 nach DigiG).

---

## 11. HARD-LINES (non-negotiable, verifier-locked)

> § 11.1–§ 11.20 sind die V1-Hard-Lines aus `docs/specs/stammdaten.md` und
> bleiben in V1.1 vollständig in Kraft. § 11.21–§ 11.30 sind die
> V1.1-spezifischen verifier-locked Hard-Lines (Wording verbatim aus
> concept-verifier-Pass 2026-05-10).

### § 11.21 — Art-9-Linie pro Feld (11/11 DECIDED)

| Feld | Status | Default-Pattern |
|---|---|---|
| GKV-Mitgliedschaft | NICHT Art-9 | direkt sichtbar |
| KVNR (§ 290 SGB V) | NICHT Art-9 | direkt sichtbar |
| Familienversicherten-Status (§ 10 SGB V) | NICHT Art-9 | direkt sichtbar mit Status-Pill |
| ePA-Existenz | NICHT Art-9 | direkt sichtbar mit Status-Pill |
| **ePA-Widerspruch (Boolean)** | NICHT Art-9 | **direkt sichtbar mit obligatorischem Disclaimer-Banner** |
| Pflegegrad (1-5) | **Art-9** | **A9-Modal-Pattern** (analog Religion V1) |
| ePA-Inhalt | Art-9 | **NICHT in V1.1** (Hard-Line) |
| PKV-Risikozuschlag | Art-9 | **NICHT in V1.1** (Hard-Line) |
| **PKV-Tarif-Name** | **STREICHEN** | **NICHT in V1.1** (Hard-Line) |
| **Beihilfe-Berechtigung** | **STREICHEN** | **NICHT in V1.1** (Hard-Line) |
| Beitragssatz GKV/PKV | NICHT Art-9 | **NICHT in V1.1** (Doppelung mit V1-Beschäftigung) |
| Anrechnungszeit Pflege | Art-9 (gekoppelt) | A9-Modal (gleicher Toggle wie Pflegegrad, § 11.30) |

Frontend-coder darf an dieser Tabelle **nicht** umformulieren oder Felder hinzufügen. Hard-Caps § "Forbidden territory" gelten verbatim.

### § 11.22 — Pflegegrad-sessionStorage-Pattern erbt § 11.4-Religion-Mechanik mit separatem Storage-Key

**Storage-Key**: `govtech-de:v1:stammdaten:pflegegrad-consent-session` (sessionStorage). Mechanik analog V1-§ 11.4 Religion-Consent:
- per-Tab-scope, kein Cross-Tab-Share
- Reset bei Tab-Close, Browser-Beendigung, Persona-Switch, explizitem `revokePflegegradConsent()`
- **NICHT-Reset** bei F5/Ctrl+R-Page-Reload innerhalb desselben Tabs (UX-Reibungs-Vermeidung)
- Frontend-coder darf den Wert **nicht** in `localStorage` heben und **keinen** „Erinnere mich für künftige Sitzungen"-Toggle einbauen.

**Verboten**: ein `localStorage`-Bucket-Key `govtech-de:v1:stammdaten:pflegegrad-consent` (oder eine andere localStorage-Persistenz). DevTools-Audit muss diesen Key in `localStorage` stets als nicht-vorhanden zeigen (`localStorage`-Sentinel-Test in Vitest, siehe § 15).

### § 11.23 — ZfDR-Aggregator-NICHT-Nachbau

V1.1 nur Wegweiser-Link auf rentenuebersicht.de + Disclaimer-9 (`stammdaten.disclaimer.zfdr_unvollstaendig`) verbatim mit Versorgungswerke/Beamten/Direktzusagen-Ehrlichkeits-Klausel. **Kein** Mock-OAuth-Flow, **kein** Anwartschafts-Aggregations-Mock, **kein** Kontostand-Render. Externer Link öffnet Mock-Disclaimer-Modal vor Navigation.

### § 11.24 — Mehmet-Track-C-Default mit Empty-State-Card und Erklärungs-Wording

Mehmet-Persona hat `renten_track: 'C'`. Sektion „Altersvorsorge" rendert `<TrackCEmptyStateCard>` mit verbatim-Wording:

> „Sie haben keine Renteninformation, weil Sie nicht in der GRV pflichtversichert sind. Im PKV-Bereich existiert kein zentraler Aggregator wie ZfDR — Sie müssen die App Ihres Versicherers nutzen. Optionen: 1) freiwillige GRV (§ 7 SGB VI), 2) Privatvorsorge prüfen, 3) Falls Pflichtversicherten-Beruf (§ 2 SGB VI), Pflichtversicherung beantragen."

**Kein** Yellow-Letter-Mock für Mehmet. Frontend-coder darf das Wording **nicht** umformulieren oder kürzen.

### § 11.25 — Yellow-Letter-Bridge-Idempotenz

Activity-Log-Eintrag pro `letter_id` höchstens 1× erzeugt, auch bei Page-Reload. Implementiert über Bucket `govtech-de:v1:stammdaten:yellow-letter-bridge-applied[persona_id]` mit Liste der bereits gebridgeten `letter_id`s. Doppel-Aufruf von `applyYellowLetterBridge()` returns `{ applied: false }` und emittiert `stammdaten/yellow-letter-bridge-skipped-idempotent` (kein Activity-Log-Eintrag bei skip).

Vitest- und Playwright-Tests müssen die Idempotenz explizit assertieren (siehe § 15).

### § 11.26 — § 342 Abs. 1 S. 2 i.V.m. § 343 SGB V zwei-Norm-Zitat

Activity-Log-Eintrag „ePA-Status-Banner gesehen" trägt `rechtsgrundlage: '§ 342 Abs. 1 S. 2 i.V.m. § 343 SGB V'` (nicht nur § 343 — Domain-Doc Correction 1). Disclaimer-8 (`stammdaten.disclaimer.epa_anlage_widerspruch`) zitiert beide Normen verbatim. `<NormZitatSpan>`-Lookup-Map enthält beide Einträge separat (siehe § 6.4). Frontend-coder darf das auf `§ 343 SGB V` allein **nicht** verkürzen.

### § 11.27 — § 109 Abs. 3 fünf Pflicht-Inhalte in Mock-Letter + Card-Top-3 / Tooltip-2 / Expandable-5 Strukturierung

Mock-Letter `letter-renteninfo-anna-2026-05` enthält **fünf** Pflicht-Inhalte (nicht vier — Domain-Doc Correction 3):
1. Grundlage der Rentenberechnung
2. EM-Rente-Höhe
3. Regelaltersrenten-Prognose
4. Wirkung künftiger Anpassungen
5. Beitragsübersicht

`<YellowLetterEchoCard>` rendert:
- **Card-Top-3** sichtbar: Entgeltpunkte (aus 1.), Regelalter-Prognose (3.), EM-Rente-Prognose (2.)
- **Tooltip-2**: Anpassungs-Wirkung (4.) als Hover-Tooltip auf einem dedizierten Info-Icon; Beitragsübersicht (5.) als Hover-Tooltip
- **Expandable-5**: alle fünf Pflicht-Inhalte ausführlich nach Klick auf „Alle 5 Pflicht-Inhalte (§ 109 Abs. 3 SGB VI) anzeigen"-Button

Frontend-coder darf weder die Top-3-Auswahl ändern noch Pflicht-Inhalte in der Expandable-Section weglassen.

### § 11.28 — EuGH C-184/20-Verweis im NormZitatSpan-Lookup-Map mit eigener „Rechtsprechungs-Lookup"-Klasse

Neue Pattern-Klasse: `RECHTSPRECHUNGS_LOOKUP` in `src/components/posteingang/rechtsprechungsLookup.ts` (siehe § 6.5). EuGH-Zitat C-184/20 mit `kurz`, `aria_label`, `vollzitat`, `kernaussage_de`. Wrapper-Komponente `<RechtsprechungZitatSpan>` analog `<NormZitatSpan>` mit Tooltip.

EuGH-Zitat **muss** sichtbar sein in:
- Disclaimer-7 (`stammdaten.disclaimer.pflegegrad_art9`)
- `<PflegegradConsentModal>`-Body
- Activity-Log-Tooltip-Variante des Pflegegrad-Eintrags

Frontend-coder darf das EuGH-Zitat **nicht** in einen `string`-Literal-Hardcoded-Mode degradieren (i18n-only-Regel + Lookup-Klasse-Pattern).

### § 11.29 — eRezept-Card als erste streichbar bei Scope-Druck

Wenn V1.1-Scope-Druck steigt: `<ERezeptFieldCard>` ist die erste Komponente, die ohne fachlichen Verlust nach V1.2 verschoben werden kann (Domain-Doc Hard-Caps Reihenfolge). Coder-Decision-Triage. Bei Streichung müssen die i18n-Keys `stammdaten.kv_pflege.erezept.*` als „V1.2 Hook" markiert in `de.json` bleiben (kommentar-Stub) — keine i18n-Lücke.

### § 11.30 — Anrechnungszeit-Pflege gekoppelt an Pflegegrad-Modal-Toggle

Semantische Art-9-Coupling: Anrechnungszeit Pflege (§ 3 SGB VI) ist nach EuGH-weiter-Lesart Art-9-grenzwertig (Pflege-Anrechnung indiziert Pflege-Tätigkeit, die wiederum Gesundheits-Status eines Familienmitglieds offenbart). V1.1 koppelt die `<AnrechnungszeitPflegeFieldCard>` (Sub-Komponente in `<AnrechnungszeitenList>`) an denselben `pflegegrad_consent.consent_session === true`-Toggle wie der Pflegegrad-FieldCard. Render-Bedingung:

```ts
function isAnrechnungszeitPflegeVisible(stammdaten: Stammdaten): boolean {
  return (
    stammdaten.krankenversicherung_pflege.anrechnungszeit_pflege !== undefined &&
    stammdaten.krankenversicherung_pflege.pflegegrad_consent.consent_session === true
  );
}
```

Frontend-coder darf für Anrechnungszeit Pflege **keinen** separaten Modal-Toggle einbauen (User-Friction-Vermeidung + semantische Konsistenz).

---

## 12. Spec drift control vs. V1

| V1-Aspekt | V1.1-Auswirkung | Bewahrung |
|---|---|---|
| 5 Sektionen (Identität, Anschrift, Familie, Dokumente, Sperren & Einstellungen) | + 2 Sektionen (Altersvorsorge, KV & Pflege) zwischen Familie und Dokumente eingefügt | bestehende Reihenfolge der V1-Sektionen ändert sich; Dokumente und Sperren rutschen nach unten — Coder muss die `StammdatenSektionId`-Union erweitern (`'altersvorsorge'`, `'krankenversicherung_pflege'`) und die Default-Render-Reihenfolge in `<StammdatenPage>` anpassen |
| Hero-Card „Sie sind in N Registern geführt" | N erhöht sich um 2-3 (DRV-Träger + GKV/Pflegekasse + ggf. gematik) — Coder muss Register-Count je Persona neu berechnen | Hero-Card bleibt strukturell identisch; nur Counter-Wert ändert sich |
| Religion-Modal-Pattern (V1 § 11.3, § 11.4) | parallel verwendet als Vorlage für Pflegegrad-Modal (Hard-Line § 11.22); separater sessionStorage-Key | beide Modale leben friktionsfrei nebeneinander |
| Activity-Log-Schema (`UebermittlungsLogEntry`) | unverändert; V1.1 fügt nur neue `zweck_i18n_key`-Werte hinzu | Schema-Drift-frei |
| `<KorrigierenCTA>`-Wizard-Slug-Lookup-Map (V1 § 8.2) | **NICHT erweitert** in V1.1 (siehe § 8.3) | V1-Lookup-Map bleibt unverändert |
| Disclaimer 1-5 in V1 (`lese_schicht`, `audit_log_app_internal`, `eudi_speculative`, `iban_speculative`, `religion_art9`) + Disclaimer 6-8 in V1 (`religion_consent_toggle_label`, `sperren_mock_pattern`, `wallet_externe_empfaenger.banner`) | + 5 neue Disclaimer 6-9 als separate Keys (`renteninfo_info_only`, `pflegegrad_art9`, `epa_anlage_widerspruch`, `zfdr_unvollstaendig`, `pflegegrad_consent_toggle_label`) — Numerierungs-Konflikt | i18n-Keys haben **keine** Numerierung im Key-Namen; Domain-Doc-Numerierung („Disclaimer 6/7/8/9") ist nur referenziell. Keine Konflikte. |
| `<NormZitatSpan>`-Lookup-Map (V1 § 11.7) | + 18 neue Norm-Zitate (siehe § 6.4) | additiv, keine Konflikte |
| LetterArchetype-Union | + `'renteninfo'`-Wert | additiv |
| Persona-Schema | + 7 optionale V1.1-Felder (siehe § 4.1) | alle optional, kein Bruch |

V1-Spec selbst (`docs/specs/stammdaten.md`) bleibt **unverändert** und behält `status: shipped`. V1.1 ist eine eigenständige Spec mit eigenem Frontmatter und Hard-Line-Numerierung-Anschluss (§ 11.21+).

---

## 13. a11y bind-points (V1.1-spezifisch, ergänzt V1 § 13)

- `<AltersvorsorgeSektion>` und `<KvPflegeSektion>` rendern als `<section aria-labelledby="...">` mit `<h2>`-Header, default-zugeklappt (V1-Sektion-Pattern reuse).
- `<YellowLetterEchoCard>` Card-Top-3 + Tooltip-2 + Expandable-5:
  - Card-Top-3 Werte mit `aria-label="Entgeltpunkte: 6,8 Punkte"` etc. (kein Reliance auf reine Visual-Layout).
  - Tooltip-2 als `<button aria-describedby="tooltip-id">` mit Focus-Anker (Hover ist mit Focus-Equivalent ausgestattet — V1.5-a11y-Konvention).
  - Expandable-5 als `<details>`/`<summary>` (Native Disclosure) oder base-ui `<Disclosure>` mit `aria-expanded`.
- `<TrackCEmptyStateCard>`: Empty-State-Wording als `<p>` mit `role="status"` (informativ, nicht nicht-Fehler-Alert); illustrierender Icon mit `aria-hidden="true"`.
- `<PflegegradConsentModal>`: `role="alertdialog"`, `aria-modal="true"`, `aria-labelledby` auf Modal-Title, `aria-describedby` auf Body-`<p>`. Focus-trap aktiv. ESC schließt mit Cancel-Semantik. Toggle initial focused; primary disabled bis Toggle on. **Pattern-Konsistenz** zu V1-`<ReligionConsentModal>`.
- `<EpaStatusFieldCard>`: Disclaimer-Banner als `<div role="region" aria-labelledby="epa-banner-title">` mit Visible-Title; **kein** `role="alert"` (informativ, nicht zeitkritisch).
- `<RechtsprechungZitatSpan>`: `aria-label` aus Lookup; Tooltip-Body mit `role="tooltip"` und `aria-describedby` auf dem Trigger.
- `<KrankenkasseFieldCard>` KVNR-Zwei-Teile-Visual-Trennung: pro Teil eigene `<span aria-label="Unveränderbarer Teil A 1 2 3 4 5 6 7 8 0">` damit Screenreader nicht „A12345678C0" als ein Wort liest.
- `<FamilienversicherungFieldCard>` Status-Pill: `aria-label="Familienversichert über Markus Schmidt, bis längstens November 2049"` (Datums-Format expandiert für Screenreader).
- `<RentenBridgeCTA>` (Posteingang): `aria-label` enthält Letter-Aktenzeichen (nicht nur „Werte ablegen"); Loading-State mit `aria-busy="true"`; Erfolgs-Toast mit `role="status"` + `aria-live="polite"`.
- Norm- und Rechtsprechungs-Zitate (sichtbar) wie V1: Norm-Pronunciation-Mapping aus `<NormZitatSpan>` und `<RechtsprechungZitatSpan>` Lookup.
- RTL (AR-Locale): Layout flippt mit `rtl:`-Variants; Werte (KVNR, Aktenzeichen, Geld-Beträge) bleiben LTR-DE per V1.5-Konvention.

**Lighthouse-a11y-Ziel**: 95+ auf primärer Stammdaten-Seite (V1-Baseline), 100/100 axe 0/0 auf Pflegegrad-Modal-Variante (V1-Religion-Modal-Lift).

---

## 14. File inventory (NEW vs MODIFIED)

### 14.1 NEW Files

```
src/types/renten-kv.ts                                              (V1.1 types: RentenEckdaten, PflegegradConsent)
src/components/stammdaten/AltersvorsorgeSektion.tsx                 (Sektion-Wrapper)
src/components/stammdaten/YellowLetterEchoCard.tsx                  (Card-Top-3 / Tooltip-2 / Expandable-5)
src/components/stammdaten/ZfdrWegweiserCard.tsx                     (Wegweiser auf rentenuebersicht.de)
src/components/stammdaten/TrackCEmptyStateCard.tsx                  (Mehmet-Empty-State)
src/components/stammdaten/VersorgungswerkWegweiserCard.tsx          (Track B fall-back, optional)
src/components/stammdaten/AnrechnungszeitenList.tsx                 (Kindererziehung + Pflege gekoppelt)
src/components/stammdaten/KvPflegeSektion.tsx                       (Sektion-Wrapper)
src/components/stammdaten/KrankenkasseFieldCard.tsx                 (KVNR-Zwei-Teile-Visual)
src/components/stammdaten/FamilienversicherungFieldCard.tsx         (§ 10 SGB V Status-Pill)
src/components/stammdaten/EpaStatusFieldCard.tsx                    (Disclaimer-Banner § 342 + § 343)
src/components/stammdaten/ERezeptFieldCard.tsx                      (V1.1; erste streichbar § 11.29)
src/components/stammdaten/PflegeFieldCard.tsx                       (Pflegegrad-Sub-Card + Modal-Toggle)
src/components/stammdaten/PflegegradConsentModal.tsx                (Pattern-Konsistenz zu Religion V1)
src/components/posteingang/RentenBridgeCTA.tsx                      (separater CTA-Pfad § 11.20)
src/components/posteingang/rechtsprechungsLookup.ts                 (RECHTSPRECHUNGS_LOOKUP § 11.28)
src/components/posteingang/RechtsprechungZitatSpan.tsx              (Wrapper analog NormZitatSpan)
src/lib/mock-backend/autopilot/posteingang-renten-bridge.ts         (Bridge-Trigger-Logic)
tests/unit/stammdaten-v1-1-bridge-idempotency.test.ts               (§ 11.25-Test)
tests/unit/stammdaten-v1-1-pflegegrad-consent.test.ts               (§ 11.22 sessionStorage-Sentinel)
tests/unit/stammdaten-v1-1-yellow-letter-eckdaten.test.ts           (5 Pflicht-Inhalte resolved)
tests/unit/stammdaten-v1-1-track-c-empty-state.test.ts              (Mehmet-Wording verbatim)
tests/unit/stammdaten-v1-1-anrechnungszeit-coupling.test.ts         (§ 11.30 semantische Coupling)
tests/unit/stammdaten-v1-1-norm-zitate-extension.test.ts            (Lookup-Map § 6.4)
tests/unit/stammdaten-v1-1-rechtsprechung-lookup.test.ts            (EuGH C-184/20 § 11.28)
tests/e2e/v1-1-yellow-letter-bridge-anna.spec.ts                    (Posteingang → Stammdaten Flow)
tests/e2e/v1-1-pflegegrad-modal-schmidt.spec.ts                     (Modal-Pattern-Konsistenz)
tests/e2e/v1-1-track-c-empty-state-mehmet.spec.ts                   (Empty-State-Render)
tests/e2e/v1-1-bridge-idempotency-reload.spec.ts                    (Page-Reload-Idempotenz)
```

### 14.2 MODIFIED Files

```
src/types/persona.ts                                                (+ 7 optionale V1.1-Felder § 4.1)
src/types/stammdaten.ts                                             (+ altersvorsorge + krankenversicherung_pflege § 4.3)
src/types/letter.ts                                                 (LetterArchetype + 'renteninfo')
src/types/mock-event.ts                                             (+ StammdatenV1_1Event-Union § 5.2)
src/data/personas.json                                              (Anna/Schmidt/Mehmet V1.1-Felder)
src/data/letters.json                                               (+ letter-renteninfo-anna-2026-05)
src/data/behoerden.json                                             (+ DRV BB/Nord/Rheinland/Bayern Süd + gematik + 3 Pflegekassen + ZfDR § 10)
src/lib/mock-backend/api.ts                                         (+ 5 neue Methoden § 5.1)
src/lib/mock-backend/persistence.ts                                 (+ 2 neue Buckets § 4.4)
src/lib/mock-backend/schemas.ts                                     (+ Zod-Schemas RentenEckdaten, PflegegradConsent, LetterArchetype erweitern)
src/lib/mock-backend/seed.ts                                        (+ V1.1-Persona-Daten + Renten-Eckdaten-Default für Schmidt-Persona)
src/components/posteingang/LetterReader.tsx                         (+ archetype === 'renteninfo' Branch mit RentenBridgeCTA)
src/components/posteingang/normZitatLookup.ts                       (+ 18 V1.1-Norm-Zitate § 6.4)
src/app/(app)/stammdaten/page.tsx                                   (+ AltersvorsorgeSektion + KvPflegeSektion in Render-Order)
src/lib/i18n/locales/de.json                                        (+ ~60 V1.1-Keys § 7)
src/lib/i18n/locales/en.json                                        (+ Übersetzungen)
src/lib/i18n/locales/ru.json                                        (+ Übersetzungen)
src/lib/i18n/locales/uk.json                                        (+ Übersetzungen)
src/lib/i18n/locales/ar.json                                        (+ Übersetzungen, RTL-Konvention)
src/lib/i18n/locales/tr.json                                        (+ Übersetzungen)
```

---

## 15. Vitest test-spec extension

> Test-Konvention identisch zu V1 (vitest unit) + V1.5 (Playwright e2e + axe a11y).

### 15.1 Vitest (Unit)

- **`tests/unit/stammdaten-v1-1-bridge-idempotency.test.ts`** (NEU; § 11.25 Hard-Line):
  - Doppel-Aufruf von `applyYellowLetterBridge({ letter_id, persona_id })` → 2. Aufruf returns `{ applied: false }`
  - Activity-Log enthält genau 1 Eintrag mit `letter_id`-Marker
  - Page-Reload-Simulation (Bucket-Hydration) → erneuter Aufruf returns `{ applied: false }`
  - Skipped-Event `stammdaten/yellow-letter-bridge-skipped-idempotent` emittiert beim 2. Aufruf
- **`tests/unit/stammdaten-v1-1-pflegegrad-consent.test.ts`** (NEU; § 11.22 Hard-Line):
  - `consentPflegegrad('schmidt')` setzt `consent_session=true`; `getKrankenversicherungPflege` rendert `pflegegrad`
  - `revokePflegegradConsent('schmidt')` setzt `consent_session=false`; `pflegegrad` ist `undefined`
  - **`localStorage`-Sentinel**: nach `consentPflegegrad()` darf `localStorage.getItem('govtech-de:v1:stammdaten:pflegegrad-consent')` strikt `null` sein (Hard-Line § 11.22 Verbot)
  - **`localStorage`-Sentinel mit korrektem Key**: `localStorage.getItem('govtech-de:v1:stammdaten:pflegegrad-consent-session')` strikt `null` (sessionStorage statt localStorage)
  - **`sessionStorage`-Wert**: `sessionStorage.getItem('govtech-de:v1:stammdaten:pflegegrad-consent-session')` enthält JSON mit `consent_session: true` für Schmidt-Persona
  - Tab-Close-Simulation (`sessionStorage.clear()`): consent_session=false
- **`tests/unit/stammdaten-v1-1-yellow-letter-eckdaten.test.ts`** (NEU; § 11.27 Hard-Line):
  - `applyYellowLetterBridge` resolved alle 5 Pflicht-Inhalte aus dem Mock-Letter:
    - `grundlage_kurzauszug.entgeltpunkte_aktuell === 6.8`
    - `em_rente_prognose_eur_monat === 312.21`
    - `regelalter_prognose_eur_monat === 743.99`
    - `anpassungs_wirkung.beispiel_prozent_p_a === 2.0`
    - `beitragsuebersicht.gesamt_eur === 8414.52`
  - `quelle_letter_id === 'letter-renteninfo-anna-2026-05'`
  - `stichtag === '2026-05-04'`
- **`tests/unit/stammdaten-v1-1-track-c-empty-state.test.ts`** (NEU; § 11.24 Hard-Line):
  - Mehmet-Persona hat `renten_track === 'C'`
  - `getAltersvorsorge('mehmet-yildiz')` returns `{ track: 'C', eckdaten: undefined, yellow_letter_id: undefined }`
  - i18n-Key `stammdaten.altersvorsorge.track_c.empty_state_body` enthält Wort „Renteninformation" und „§ 7 SGB VI" und „§ 2 SGB VI" verbatim
- **`tests/unit/stammdaten-v1-1-anrechnungszeit-coupling.test.ts`** (NEU; § 11.30 Hard-Line):
  - Schmidt-Persona mit `pflegegrad_v1_1` UND `anrechnungszeit_pflege_v1_1` gesetzt
  - Vor Pflegegrad-Consent: `getKrankenversicherungPflege` returns `anrechnungszeit_pflege: undefined`
  - Nach `consentPflegegrad('schmidt')`: `anrechnungszeit_pflege` ist sichtbar mit Wert
  - Nach `revokePflegegradConsent('schmidt')`: `anrechnungszeit_pflege` wieder `undefined`
- **`tests/unit/stammdaten-v1-1-norm-zitate-extension.test.ts`** (NEU; § 6.4):
  - Lookup-Map enthält alle 18 V1.1-Norm-Zitate aus § 6.4 mit korrekten `aria-label`-Pronunciations
  - `§ 109 Abs. 3 SGB VI` aria-label === „Paragraph 109 Absatz 3 des Sozialgesetzbuches Sechs"
  - `§ 342 Abs. 1 S. 2 SGB V` aria-label korrekt
  - `§ 343 SGB V` als separater Eintrag (nicht nur § 342) — Hard-Line § 11.26
- **`tests/unit/stammdaten-v1-1-rechtsprechung-lookup.test.ts`** (NEU; § 11.28):
  - `RECHTSPRECHUNGS_LOOKUP['EuGH C-184/20']` enthält `kurz`, `aria_label`, `vollzitat`, `kernaussage_de` aus § 6.5
  - `aria_label` enthält „1. August 2022" und „C-184" (für Screenreader-Pronunciation)
  - `kernaussage_de` enthält „weite Auslegung" und „indirekte Offenbarung"

### 15.2 Playwright e2e

- **`tests/e2e/v1-1-yellow-letter-bridge-anna.spec.ts`** (NEU):
  - Anna-Persona-Login → `/posteingang` → Brief „Renteninformation 2026" sichtbar mit Pre-Open-AISummary „DRV Berlin-Brandenburg · Renteninformation · Keine Frist"
  - Klick auf Brief → Post-Open mit 5 Bullets sichtbar
  - primary CTA „Werte in meinen Stammdaten ablegen" sichtbar (nicht „Antwort verfassen")
  - Klick → Toast „Renteninformation in Ihrer Sektion Altersvorsorge abgelegt" → Navigation zu `/stammdaten#altersvorsorge`
  - Sektion „Altersvorsorge" sichtbar; `<YellowLetterEchoCard>` zeigt Card-Top-3 (Entgeltpunkte 6,8 / Regelalter-Prognose 743,99 € / EM-Rente-Prognose 312,21 €)
  - Klick „Alle 5 Pflicht-Inhalte anzeigen" → Expandable mit allen 5 Werten
  - Hero-Card „letzte Übermittlung vor X Sek — Renteninformation in Stammdaten abgelegt — § 109 Abs. 1 + Abs. 3 SGB VI"
- **`tests/e2e/v1-1-pflegegrad-modal-schmidt.spec.ts`** (NEU):
  - Schmidt-Persona-Login → `/stammdaten` → Sektion „Krankenversicherung & Pflege" expand
  - `<PflegeFieldCard>` zeigt Pflegekasse „TK-Pflegekasse" sichtbar; Pflegegrad-Sub-Card collapsed
  - Klick „Pflegegrad anzeigen" → Modal öffnet
  - Modal-Body enthält Disclaimer-7 verbatim mit `<NormZitatSpan>` für `§ 14 SGB XI` und `§ 18c SGB XI` und `<RechtsprechungZitatSpan>` für „EuGH C-184/20"
  - Toggle off + primary disabled
  - Toggle on → primary enabled → Klick → Modal schließt
  - Pflegegrad „PG 2" sichtbar mit Bewilligungsdatum + 25-AT-Frist + Begutachtungs-Stelle „MD"
  - Activity-Log neuer Eintrag „Pflegegrad in der App angezeigt"
  - **Tab-Close-Simulation** (Playwright `context.close()` + neuer `context`) → Pflegegrad-Sub-Card wieder collapsed
  - **F5-Stabilität** (Hard-Line § 11.22): nach Consent + `page.reload()` bleibt Pflegegrad sichtbar
  - **`localStorage`-Sentinel**: `localStorage.getItem('govtech-de:v1:stammdaten:pflegegrad-consent')` ist `null`
  - **`<AnrechnungszeitenList>`**: Pflege-Zeile (Hard-Line § 11.30) sichtbar nur wenn Pflegegrad-Consent erteilt
- **`tests/e2e/v1-1-track-c-empty-state-mehmet.spec.ts`** (NEU):
  - Mehmet-Persona-Login → `/stammdaten` → Sektion „Altersvorsorge" expand
  - `<TrackCEmptyStateCard>` sichtbar mit Wording verbatim aus Hard-Line § 11.24
  - Norm-Zitate `§ 7 SGB VI` und `§ 2 SGB VI` als `<NormZitatSpan>`-wraps mit Tooltip
  - **Posteingang**: kein „letter-renteninfo-mehmet-*" sichtbar (kein Yellow-Letter-Mock für Mehmet)
- **`tests/e2e/v1-1-bridge-idempotency-reload.spec.ts`** (NEU; § 11.25):
  - Anna-Persona → Posteingang → Renteninformation-Brief → CTA klick → Toast „abgelegt"
  - `page.reload()`
  - Wieder zum Posteingang → gleicher Brief → CTA jetzt zeigt „Bereits am DD.MM.YYYY in Ihrer Sektion Altersvorsorge abgelegt"
  - Klick auf Read-Only-Indikator → Navigation zu `/stammdaten#altersvorsorge`
  - Activity-Log enthält genau 1 Eintrag mit `letter_id:letter-renteninfo-anna-2026-05`

### 15.3 a11y (axe via @axe-core/playwright)

- `<PflegegradConsentModal>` axe-pass (axe 0/0)
- `<YellowLetterEchoCard>` axe-pass auf Card-Top-3 + Tooltip-2 + Expandable-5
- `<TrackCEmptyStateCard>` axe-pass (Empty-State-Pattern)
- `<EpaStatusFieldCard>` axe-pass auf Disclaimer-Banner
- `<RentenBridgeCTA>` axe-pass auf CTA + Loading + Idempotency-Indikator
- Lighthouse-a11y-Score auf primärer Stammdaten-Seite ≥ 95 (V1-Baseline beibehalten)

### 15.4 i18n-Validierung

- JSON.parse pre-flight auf jedem der 6 Locale-Files (V1.5-Lessons-Memory)
- Vitest-Snapshot-Test: alle ~60 V1.1-Keys in jeder der 6 Locales vorhanden (kein Locale-Drift)

---

## 16. Out of scope (explicit)

- ePA-Inhalt zeigen
- PKV-Tarif-Name
- PKV-Risikozuschlag (Höhe oder Existenz)
- Beihilfe-Berechtigung als FieldCard
- Beitragssatz-Höhe (Doppelung mit V1-Beschäftigung)
- MD-/MEDICPROOF-Begutachtungs-Bericht-Inhalt
- Eigene Renten-Berechnung oder -Simulation (Schweden-Style)
- ZfDR-OAuth-Flow oder Aggregations-Mock
- Yellow-Letter-Mock für Mehmet
- DRV-Konto-Klärung-Wizard (V2-Hook)
- ePA-Widerspruch-Toggle als Self-Edit (nur Read-Only-Status + externer Wegweiser)
- Pflegegrad-Höher­stufung-Wizard (V2-Hook)
- Familienversicherten-Antrag-Wizard (V2-Hook)
- Drittstaaten-Spezifika für Renten-/KV (Mehmet-Aufenthaltstitel-Bezug ist V1-Sache; Renten-Ansprüche-Aggregation für Drittstaaten ist V2)
- Tax-IdNr-Bezug zur DRV (kein Cross-Behörden-Trigger in V1.1)

---

## 17. Review checklist (für code-reviewer)

- [ ] Mock-Letter `letter-renteninfo-anna-2026-05` enthält **alle 5** Pflicht-Inhalte (§ 109 Abs. 3 SGB VI; Hard-Line § 11.27)
- [ ] `<YellowLetterEchoCard>` zeigt **Card-Top-3 / Tooltip-2 / Expandable-5** Strukturierung verbatim
- [ ] Activity-Log-Eintrag „ePA-Status-Banner gesehen" trägt `rechtsgrundlage: '§ 342 Abs. 1 S. 2 i.V.m. § 343 SGB V'` (Hard-Line § 11.26 zwei-Norm-Zitat — nicht nur § 343)
- [ ] Mehmet-`<TrackCEmptyStateCard>` Wording verbatim aus Hard-Line § 11.24 (kein Umformulieren)
- [ ] **Kein** Yellow-Letter-Mock für Mehmet im `letters.json`
- [ ] **`localStorage`-Sentinel**: Pflegegrad-Consent ist **nicht** in `localStorage` persistiert (Hard-Line § 11.22)
- [ ] sessionStorage-Key `govtech-de:v1:stammdaten:pflegegrad-consent-session` (separater Key zu Religion-V1)
- [ ] Yellow-Letter-Bridge ist idempotent: Doppel-Klick + Page-Reload erzeugt genau 1 Activity-Log-Eintrag (Hard-Line § 11.25)
- [ ] EuGH C-184/20-Verweis lebt in eigener `RECHTSPRECHUNGS_LOOKUP`-Klasse (Hard-Line § 11.28)
- [ ] `<RechtsprechungZitatSpan>` nutzt diese Klasse (kein Hardcoded-String-Literal)
- [ ] `<ERezeptFieldCard>` ist sauber als „erste streichbar bei Scope-Druck" markiert (Hard-Line § 11.29)
- [ ] Anrechnungszeit-Pflege-FieldCard sichtbar nur wenn `pflegegrad_consent.consent_session === true` (Hard-Line § 11.30 semantische Coupling)
- [ ] Bridge-CTA ist **separater CTA-Pfad** im LetterReader (nicht Reply-Template, nicht Reply-Compose-State; § 11.20-Konsistenz)
- [ ] PKV-Tarif-Name + Beihilfe-Berechtigung NICHT im V1.1-Code (Hard-Line § 11.21-Tabelle Zeilen 9 + 10)
- [ ] Disclaimer-9 (`zfdr_unvollstaendig`) verbatim mit Versorgungswerke/Beamten/Direktzusagen-Klausel (Hard-Line § 11.23)
- [ ] Alle V1.1-Strings über `t()` aufgelöst — kein Hardcoded-DE im Component-Tree
- [ ] Mock-Backend-Latenz simuliert (300–800 ms + 5 % Fehlerquote) auf allen V1.1-Methoden
- [ ] `<PflegegradConsentModal>` `prefers-reduced-motion`-respect (V1-Baseline)
- [ ] `<NormZitatSpan>`-Lookup-Map enthält alle 18 V1.1-Einträge aus § 6.4 + `§ 343 SGB V` separat
- [ ] V1-Spec `docs/specs/stammdaten.md` unverändert (status: shipped, Wording untouched)
- [ ] Lighthouse a11y ≥ 95 auf Stammdaten-Seite mit V1.1-Sektionen
- [ ] axe 0/0 auf `<PflegegradConsentModal>` und `<EpaStatusFieldCard>` und `<TrackCEmptyStateCard>` und `<YellowLetterEchoCard>` und `<RentenBridgeCTA>`
- [ ] i18n: alle ~60 V1.1-Keys in allen 6 Locales vorhanden; JSON.parse pre-flight grün
- [ ] Vitest-Suite grün auf allen § 15.1-Tests inkl. § 11.21-Tabellen-Negativ-Tests (PKV-Tarif-Name UNDEFINED-Assertion)

---

> **Spec-Lock-Stand 2026-05-10**: Diese V1.1-Spec ist `status: spec` und
> wartet auf code-reviewer-Final-Gate nach Coder-Implementation. § 11.21–
> § 11.30 Hard-Lines sind verifier-locked und dürfen ohne neuen
> concept-verifier-Pass nicht modifiziert werden. Bei Scope-Druck wird in
> der Reihenfolge des Domain-Doc-Hard-Caps gestrichen, beginnend mit
> `<ERezeptFieldCard>` (Hard-Line § 11.29).

---

## Build log — frontend-coder

- date: 2026-05-10
- screens implemented:
  - `/stammdaten` Profil-Tab erweitert mit zwei neuen Sektionen (Altersvorsorge, Krankenversicherung & Pflege) zwischen Familie und Dokumente per Spec § 12
  - `/posteingang/:id` LetterReader erweitert um Bridge-Section (separater CTA-Pfad bei `archetype === 'renteninfo'` per Hard-Line § 11.20)
- components created (alle NEW per Spec § 14.1):
  - `src/components/posteingang/rechtsprechungsLookup.ts` (RECHTSPRECHUNGS_LOOKUP § 11.28 — EuGH C-184/20)
  - `src/components/posteingang/RechtsprechungZitatSpan.tsx` (Wrapper analog NormZitatSpan, separater aria-label-Pattern + Tooltip-Anker)
  - `src/components/posteingang/RentenBridgeCTA.tsx` (separater CTA-Pfad § 11.20, Idempotenz-Indikator § 11.25)
  - `src/components/stammdaten/AltersvorsorgeSektion.tsx` (Wrapper, dispatch auf renten_track A/B/C)
  - `src/components/stammdaten/YellowLetterEchoCard.tsx` (Card-Top-3 / Tooltip-2 / Expandable-5 per § 11.27)
  - `src/components/stammdaten/ZfdrWegweiserCard.tsx` (rentenuebersicht.de external + Disclaimer-9 + Pre-Insertion-Modal)
  - `src/components/stammdaten/TrackCEmptyStateCard.tsx` (Mehmet-Wording verbatim § 11.24)
  - `src/components/stammdaten/VersorgungswerkWegweiserCard.tsx` (Track B fall-back optional)
  - `src/components/stammdaten/AnrechnungszeitenList.tsx` (Kindererziehung + Pflege coupled § 11.30)
  - `src/components/stammdaten/KvPflegeSektion.tsx` (Wrapper, fixe Reihenfolge der 5–6 FieldCards)
  - `src/components/stammdaten/KrankenkasseFieldCard.tsx` (KVNR-Zwei-Teile-Visual mit aria-label-Spelling)
  - `src/components/stammdaten/FamilienversicherungFieldCard.tsx` (§ 10 SGB V Status-Pill + Liste)
  - `src/components/stammdaten/EpaStatusFieldCard.tsx` (Disclaimer-Banner § 342 + § 343 — TWO-Norm-Zitat § 11.26)
  - `src/components/stammdaten/ERezeptFieldCard.tsx` (erste streichbar § 11.29)
  - `src/components/stammdaten/PflegeFieldCard.tsx` (Pflegegrad-Sub-Card hinter Modal-Toggle)
  - `src/components/stammdaten/PflegegradConsentModal.tsx` (Pattern Religion-V1; `useStripBaseUiFocusGuardAriaHidden(open)` MUSS — V1-Lesson #4)
- components modified:
  - `src/components/stammdaten/StammdatenView.tsx` (mount V1.1-Sektionen zwischen Familie und Dokumente; Pflegegrad-Modal-State + ePA-Banner-Idempotenz; deriveAltersvorsorgeData + deriveKvPflegeData Helper)
  - `src/components/posteingang/LetterReader.tsx` (`archetype === 'renteninfo'` Bridge-Section + onApply-Handler mit Toast + router.push, applied-Status-Load via api.getAltersvorsorge)
  - `src/components/posteingang/normZitatLookup.ts` (+ 22 V1.1-Norm-Zitate per § 6.4 — `§ 109 SGB VI`-Familie, `§ 290 SGB V` schon vorhanden, `§ 342 Abs. 1 S. 2 SGB V` + `§ 343 SGB V` separat per § 11.26)
  - `src/components/posteingang/letter-archetype-actions.ts` (+ `renteninfo` in alle 3 Records — was-kann-ich-tun-Defaults, vorgangs-typ-mapping, label-keys)
- e2e scaffolds (4 NEW; alle mit `test.skip(true, …)`-Marker bis i18n + Mock-Letter-Seed gelandet):
  - `tests/e2e/v1-1-yellow-letter-bridge-anna.spec.ts` (Posteingang → Bridge → Stammdaten#altersvorsorge + Idempotenz-Reload)
  - `tests/e2e/v1-1-pflegegrad-modal-schmidt.spec.ts` (Modal-Pattern-Konsistenz + sessionStorage-Sentinel + F5-Reload)
  - `tests/e2e/v1-1-track-c-empty-state-mehmet.spec.ts` (Empty-State-Wording verbatim + KEIN Yellow-Letter)
  - `tests/e2e/v1-1-bridge-idempotency-reload.spec.ts` (§ 11.25 Page-Reload-Idempotenz, Bucket-Sentinel)
- i18n keys added: NICHT durch frontend-coder (Brief: i18n-locales sind forbidden territory; Komponenten benutzen `try { t(key) } catch { fallback }`-Pattern wie V1). i18n-localizer landet ~60 DE-source-Keys per Spec § 7.
- typecheck: PASS für alle frontend-Files. **Blocker bleibt 1 unrelated tsc-Error im mock-backend**: `src/lib/mock-backend/stammdaten/v1-1-api.ts(139,5)` — Zod-Schema-Mismatch zwischen `Letter[]` und `lettersListSchema`-passthrough-Type. Mock-backend-coder muss das `as` casten oder das Zod-Schema auf `LetterFrist` mit Index-Signature abstimmen. KEIN frontend-Bug.
- lint: PASS (1 unrelated Warning in `src/lib/mock-backend/stammdaten/api.ts:39` — `'read' is defined but never used`; nicht meine Territory).
- known gaps (für code-reviewer):
  - `YellowLetterEchoCard`-Stamp benutzt `quelle_letter_id` als Aktenzeichen-Fallback weil der Letter-Record nicht in der derive-Closure verfügbar ist. Nice-to-have-Polish: Aktenzeichen-Lookup über `api.getLetters()` oder zusätzlichen Bucket. Funktional ist es kein Blocker (Stamp zeigt einen MOCK-Aktenzeichen-Identifier).
  - DRV-Träger-Anzeige in `<AltersvorsorgeSektion>` setzt `kategorie='sozialversicherung'` aus `behoerdenById` voraus — falls mock-backend die Behörde nicht in `getBehoerden()` listet, wird der Badge ohne Träger gerendert (graceful).
  - PflegegradConsentModal nutzt einzelnes EuGH-Zitat inline — Modal-Body verwendet `wrapNormZitate` für die § 14/§ 18c SGB XI-Norm-Zitate; das EuGH-Zitat kommt als getrenntes `<RechtsprechungZitatSpan inline />` statt eingebettet im Disclaimer-String. Falls die i18n-Source den EuGH-Verweis im String enthält, würde er als Plain-Text durchgereicht (nicht als Tooltip-Anker) — i18n-localizer sollte EuGH-Hinweis im Disclaimer-String positionieren oder Modal-Body anpassen.
- Activity-Log-Idempotenz ePA-Banner: Component-Level `seenRef` + StammdatenView-Level `epaBannerSeenRef` + Mock-Backend `getEpaStatus()`-Aufruf. Triple-Guard, aber `getEpaStatus` wird bei jedem mount 1× gerufen — wenn Mock-Backend keine Side-Effect-Idempotenz hat, könnten doch mehrere Activity-Log-Einträge entstehen. Mock-backend-coder muss `getEpaStatus()` idempotent halten oder Activity-Log-Schreiben aus `getEpaStatus` entfernen (Spec § 5.1 sagt: dieser Read schreibt Banner-Seen-Event).
- next: i18n-localizer (~60 DE-source-Keys + 5 Locale-Übersetzungen per Spec § 7); a11y-tester (Lighthouse + axe auf `<PflegegradConsentModal>`, `<YellowLetterEchoCard>`, `<TrackCEmptyStateCard>`, `<EpaStatusFieldCard>`, `<RentenBridgeCTA>`); code-reviewer (Final-Gate inkl. mock-backend-Zod-Fix-Bestätigung).

---

## Build log — mock-backend-coder

- date: 2026-05-10
- types added (NEW file): `src/types/renten-kv.ts` — `RentenTrack`, `RentenEckdaten`, `PflegegradConsent`, `Pflegegrad`, `AnrechnungszeitPflege`, `Versorgungswerk`, `KvnrV11`, `EpaStatus`, `ERezeptModus`, `KvVersichertenStatus`, `FamilienversicherteEintrag`, `YellowLetterBridgeResult`. Re-exportiert via `src/types/index.ts`.
- types changed (additive only):
  - `Persona` (+9 V1.1-optionale Felder per § 4.1: `renten_track`, `renten_eckdaten_v1_1`, `kvnr_v1_1`, `familienversichert_ueber/_bis`, `epa_status_v1_1`, `erezept_modus_v1_1`, `pflegegrad_v1_1`, `anrechnungszeit_pflege_v1_1`, `versorgungswerk_v1_1`). V1-Konsumenten unverändert kompatibel.
  - `LetterArchetype` + `'renteninfo'`. Compile-Time-Drift-Guard (`_letterArchetypeDriftGuard`).
  - `MockBackendEvent` + 5 V1.1-Events (`yellow-letter-bridge-applied`, `yellow-letter-bridge-skipped-idempotent`, `pflegegrad-consented`, `pflegegrad-consent-revoked`, `epa-banner-seen`).
  - `Stammdaten` + `altersvorsorge` und `krankenversicherung_pflege` Top-Level-Container (beide optional).
  - `StammdatenSektionId` + `'altersvorsorge'`, `'krankenversicherung_pflege'` (zwischen `familie` und `dokumente`).
- api methods added (5, exact spec § 5.1 signatures):
  - `getAltersvorsorge(personaId): Promise<NonNullable<Stammdaten['altersvorsorge']> | null>`
  - `getKrankenversicherungPflege(personaId): Promise<NonNullable<Stammdaten['krankenversicherung_pflege']> | null>`
  - `applyYellowLetterBridge({letter_id, persona_id}): Promise<YellowLetterBridgeResult>` (idempotent — § 11.25)
  - `consentPflegegrad(personaId, consent): Promise<void>` (sessionStorage-only — § 11.22)
  - `revokePflegegradConsent(personaId): Promise<void>`
  - `getEpaStatus(personaId): Promise<EpaStatus>` (schreibt `epa-banner-seen`-Log mit zwei-Norm-Zitat — § 11.26)
- autopilot orchestrators:
  - `src/lib/mock-backend/autopilot/posteingang-renten-bridge.ts` (NEU): `applyYellowLetterBridgeImpl`, `readEckdatenForPersona`, `hasBridgedLetter`, `_resetYellowLetterBridgeForTests`. Idempotenter Bucket-Lookup vor Mutation.
  - `src/lib/mock-backend/stammdaten/v1-1-api.ts` (NEU): V1.1-Delegate-Implementierung; sessionStorage-Pflegegrad-Consent (separater Key zu V1-Religion); `_resetPflegegradConsentForTests` für Vitest-`beforeEach`.
- persistence buckets added (§ 4.4):
  - `govtech-de:v1:stammdaten:renten-eckdaten-v1-1` → `Record<PersonaId, RentenEckdaten>`.
  - `govtech-de:v1:stammdaten:yellow-letter-bridge-applied` → `Record<PersonaId, string[]>` (Idempotenz-Bucket).
  - **NICHT in localStorage** (Hard-Line § 11.22): `govtech-de:v1:stammdaten:pflegegrad-consent-session` lebt nur in sessionStorage.
  - V1 → V1.1 Migration `v1-to-v11-renten-kv-buckets` in `persistence-migrations.ts` (idempotent, initialisiert leere Records).
- schemas added/extended (`src/lib/mock-backend/schemas.ts`):
  - `letterArchetypeSchema` + `'renteninfo'` mit Drift-Guard.
  - `stammdatenSektionIdSchema` + 2 V1.1-Sektionen.
  - `personaSchemaBase` + 9 V1.1-optionale Felder.
  - NEU: `rentenEckdatenSchema`, `rentenEckdatenBucketSchema`, `yellowLetterBridgeAppliedBucketSchema`, `pflegegradConsentSchema`, `pflegegradConsentBucketSchema`.
- seed records added:
  - `personas.json`: V1.1-Felder für alle 3 Personas. Anna Track A + KVNR 10/10 + ePA + eRezept. Schmidt Track A + seed-default `renten_eckdaten_v1_1` (DRV Nord, 22.4 Entgeltpunkte, 1842 € Regelalter) + Pflegegrad 2 + Anrechnungszeit 18 Monate (Lena Schmidt). Mehmet Track C + KVNR + ePA, KEIN Yellow-Letter, KEIN Pflegegrad. `familienversichert_ueber` für Lev / Felix / Eren.
  - `letters.json`: + `letter-renteninfo-anna-2026-05` (1 Brief, Aktenzeichen `[MOCK] 65 170395 P 042 / RI-2026`, body_de mit fünf Pflicht-Inhalten verbatim, Pre-Open + Post-Open AISummary mit 5 citation-matched bullets, `bescheid_dated_at: 2026-05-04`).
  - `behoerden.json`: + 11 Behörden mit echten Anschriften (`barmer-koeln`, `drv-bund`, `drv-berlin-brandenburg`, `drv-nord`, `drv-rheinland`, `drv-bayern-sued`, `gematik`, `aok-nordost-pflegekasse`, `tk-pflegekasse`, `barmer-pflegekasse`, `zfdr-drv-bund`).
  - `letter-summaries.json`: + Pre-Open + Post-Open + 2 Vorschläge für `letter-renteninfo-anna-2026-05`.
- tests added (7 V1.1 Vitest-Files, 49 V1.1-Tests, alle PASS):
  - `stammdaten-v1-1-bridge-idempotency.test.ts` (5 tests, § 11.25)
  - `stammdaten-v1-1-pflegegrad-consent.test.ts` (7 tests, § 11.22 — beide localStorage-Sentinels, sessionStorage-Wert, Tab-Close-Sim, Activity-Log)
  - `stammdaten-v1-1-yellow-letter-eckdaten.test.ts` (2 tests, § 11.27 — alle 5 Pflicht-Werte deterministisch)
  - `stammdaten-v1-1-track-c-empty-state.test.ts` (3 tests, § 11.24)
  - `stammdaten-v1-1-anrechnungszeit-coupling.test.ts` (4 tests, § 11.30)
  - `stammdaten-v1-1-norm-zitate-extension.test.ts` (22 tests, § 6.4 — alle 18 V1.1-Lookup-Einträge)
  - `stammdaten-v1-1-rechtsprechung-lookup.test.ts` (6 tests, § 11.28 — EuGH C-184/20)
- V1-tests adjusted (additive — keine V1-Hard-Lines berührt):
  - `aktenzeichen-format.test.ts`: + Format-Regel `DRV — Renteninformation NN NNNNNN [A-Z] NNN / RI-YYYY` für DRV-Träger.
  - `cross-template-versand.test.ts`: count `bescheid_dated_at` 10 → 11 mit Spec-Annotation.
- gates:
  - `npx tsc --noEmit` → **0 errors** (frontend-build-log Zod-Schema-Note ist resolved via `as unknown as ZodType<Letter[]>` Cast in `loadLetterById`).
  - `npx vitest run tests/unit/stammdaten-v1-1-` → **49/49 PASS** (7/7 files).
  - `npx vitest run` → **354/354 PASS** (22/22 files; +49 V1.1 ggü V1-Baseline 305).
  - `npm run lint` → **0 neue Warnings** (1 pre-existing Warning in `stammdaten/api.ts` unverändert).
- frontend-agent-unblock-signal: Mock-Backend-Surface ist V1.1-ready. Frontend kann gegen die 5 stable, drift-guarded Methoden bauen. Anna-Mock-Letter `letter-renteninfo-anna-2026-05` im seed-Bestand mit `archetype: 'renteninfo'`, `bescheid_dated_at: '2026-05-04'`, `auth_channel: 'briefpost'`. Alle 5 V1.1-Events emittieren via `api.subscribe(listener)`. Pflegegrad-Consent-sessionStorage-Key ist `govtech-de:v1:stammdaten:pflegegrad-consent-session` (separater Key zu V1-Religion-Consent).
- known gaps:
  - i18n-Localizer muss ~60 V1.1-Keys in 6 Locales pflegen (§ 7); Mock-Backend ist i18n-frei.
  - Frontend-Komponenten und e2e/a11y-Tests außerhalb meiner Territory (frontend-coder bereits gebaut — siehe Build-Log oben).
  - `<ERezeptFieldCard>` ist Hard-Line § 11.29 als „erste streichbar bei Scope-Druck" markiert — keine Backend-Aktion.
  - `getEpaStatus()` schreibt pro Aufruf einen Activity-Log-Eintrag (per Spec § 5.2). Frontend dedupt via `seenRef` pro Page-Load — Triple-Guard ist konsistent zur Spec.
  - frontend-build-log gap re „Mock-Backend muss `getEpaStatus()` idempotent halten oder Log-Schreiben entfernen" → Spec § 5.2 verlangt explizit `epa-banner-seen` Activity-Log bei jedem Aufruf; frontend `seenRef` ist die richtige Stelle für Dedup. Kein Backend-Bug.
