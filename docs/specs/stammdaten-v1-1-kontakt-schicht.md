---
feature: stammdaten-v1-1-kontakt-schicht
title: Stammdaten V1.2 — Kontakt-Schicht (BundID-Postfach, E-Mail, Mobilfunk, Notification-Präferenzen — 2027-Vision)
status: shipped
date: 2026-05-10
shipped_at: 2026-05-10
author: product-architect
upstream:
  research: docs/research/2026-05-10-kontakt-schicht.md (status: revise-needed → orchestrator-locked)
  domain: docs/domain/kontakt-schicht.md (last_validated: 2026-05-10; verdict: REVISE-RESEARCH; C-1/C-2/C-5 binding)
  verify: orchestrator-decided 2026-05-10 (D1–D5; verifier REVISE → 5 P0/P1 concerns resolved by orchestrator)
ship_target: V1.1 incremental on top of V1 Stammdaten (shipped 2026-05-10)
estimated_effort: ~5 working days (1 d Persona-Migration + Mock-Backend; 1 d Kontakt-Cards + Föderalismus-Disclaimer; 1.5 d Notification-Präferenzen + Familienkasse-Wechsel-Wow-Cascade; 0.5 d i18n; 1 d Tests + a11y + Loom-Cut)
owner_agents: [frontend-coder, mock-backend-coder, i18n-localizer, a11y-tester, code-reviewer]
---

> **Geltungsbereich V1.1**: Diese Spec erweitert die in V1 (`docs/specs/stammdaten.md`,
> shipped 2026-05-10) etablierte Lese- und Wegweiser-Schicht um eine **Kontakt-
> Schicht**. V1.1 macht zum ersten Mal sichtbar: (1) welcher BundID-Kanal pro
> Behörde technisch verfügbar ist (`bundid_postfach_anbindung`), (2) welche
> Kontaktdaten BundID hält (E-Mail verifiziert, Mobilfunk self-attested, Postfach-
> Aktivierungs-Status), (3) wie eine 2027-Vision von **Notification-Präferenzen
> pro Vorgangs-Kategorie** aussehen *könnte* (in Deutschland heute nicht
> existent — explizit als Speculative gemarkert).

> **Demo-Wow-Träger V1.1**: Die **Familienkasse-Wechsel-Cascade** — Anna ändert
> in der Notification-Präferenz „Familie / Kindergeld" den Kanal von „Brief"
> auf „Postfach"; ein Live-Counter zeigt die Zeitersparnis (8 Briefe/Jahr,
> 4 Tage Bekanntgabe-Frist je Bescheid); im nächsten Frame rendert das
> Posteingang-Demo eine Familienkasse-Bewilligung als Postfach-Nachricht statt
> als Brief. Same Wow-Mechanik wie V1-Umzug-Cascade („eine Aktion → eine
> konkrete Zeitersparnis-Aussage → eine sichtbare Konsequenz"), transposiert
> auf Kanal-Wahl statt Adress-Sync.

---

## 1. Mission & scope V1.1

V1.1 fügt der V1-Stammdaten-Capability **eine sechste Sektion** „Kontakt &
Postfach" und **eine siebte Sektion** „Notification-Präferenzen (2027-Vision)"
hinzu. Beide Sektionen sind unter dem Default-Tab „Mein Profil" — kein neuer
Top-Level-Tab. Der V1-Sub-Tab „Wallet & Externe Empfänger" bleibt unverändert.

V1.1 macht **drei zusätzliche Sachverhalte** zum ersten Mal sichtbar:

1. **Welcher Behörden-Kanal pro Behörde technisch verfügbar ist.** Per-Behörde-
   Feld `bundid_postfach_anbindung` ∈ {`angebunden` | `nicht_angebunden` |
   `in_pilotierung`} — UI-Cards zeigen den Status, Picker werden conditional
   enabled/locked. Persona-realistisch: Familienkasse Berlin-Brandenburg
   `angebunden`; LEA Berlin `nicht_angebunden` (Mehmet Hard-Lock); Bürgeramt
   Friedrichshain-Kreuzberg `in_pilotierung`.
2. **Was BundID heute (2026) wirklich an Kontaktdaten hält.** Verifizierte
   E-Mail (Magic-Link-bestätigt beim Account-Anlegen), optionale Mobilfunknummer
   (self-attested, kein hoheitliches Register), Postfach-Aktivierungs-Status
   (per-Account opt-in unter id.bund.de) — mit klarer Trennung „authoritative-
   hoheitlich" vs. „self-attested".
3. **Wie eine 2027-Vision von Cross-Channel-Routing aussehen könnte.** Bürger:in
   wählt **pro Vorgangs-Kategorie** (max. 5 Kategorien) den präferierten Kanal.
   Diese Funktion existiert in DE 2026 nicht; OZG 2.0 (in Kraft 24.07.2024)
   sieht sie bis 24.07.2028 nicht vor. Vision-Modus mit erneutem Save-Confirm
   pro Mutation.

**Nicht-Ziele V1.1** (carry-over aus V1 + V1.1-spezifisch):
- Keine Postfach-Aktivierung **in unserer App** (domain-expert H-2; private
  Aggregator dürfen § 9-OZG-Einwilligung nicht selbst einsammeln). Wegweiser
  auf `id.bund.de`.
- Keine echte E-Mail-Verifikation (kein Backend, kein SMTP-Provider).
- Keine echte SMS-OTP (kein SMS-Provider).
- Keine DE-Mail-Card (sterbender Service, Verwaltung raus seit 31.08.2024;
  domain-expert H-6).
- Keine Notification-Präferenz pro **einzelner** Behörde (max 5 Kategorien;
  verifier-Hard-Cap; sonst Cockpit-Falle).
- Keine EUDI-Wallet als Notification-Layer (kein eIDAS-2-Standard;
  domain-expert H-5).
- Kein Sozialdaten-Inhalt in Mock-SMS-/Push-Renderings (SGB X §§ 67ff.;
  domain-expert H-7).
- Keine eigene NormZitat-Lookup-Map in `src/components/stammdaten/` —
  V1.1 erweitert die geshippte Map in `src/components/posteingang/normZitatLookup.ts`
  (orchestrator-decision D5).

**Loom-Cut-Drehbuch** (45-Sekunden-Wow, Anna-Demo, *nach* Umzug-Demo
geschnitten, ersetzt **nicht** den V1-Aktivitätsprotokoll-Wow — V1.1 ergänzt
einen *zweiten* Wow-Slot für Cross-Channel-Routing): siehe § 8.

---

## 2. Vision-Frame & Föderalismus-Disclaimer

V1.1 trägt zwei strukturelle Frames, die V1 nicht trug:

### 2.1 Vision-Frame für Notification-Präferenzen-Sektion

Die gesamte Notification-Präferenzen-Sektion (§ 6.4) ist mit einem
**bildschirm-übergreifenden Vision-Banner** überschrieben (orchestrator-decision
D2 Variante A):

> „**2027-Vision** — diese Funktion existiert in Deutschland heute nicht.
> OZG 2.0 (in Kraft 24.07.2024) sieht eine bürger:innenseitige Kanal-Wahl
> pro Vorgangs-Kategorie bis zum 24.07.2028 (4-Jahres-Anspruchsfrist) nicht
> vor. Sie können in dieser Demo Präferenzen einstellen — in der heutigen
> Realität ändert das nichts."

Jeder einzelne Save-Akt in dieser Sektion löst einen erneuten
**Save-Confirm-Dialog** aus, der den Vision-Charakter wiederholt:

> „Sie haben eben 2027-Vision-Daten geändert. In der heutigen Realität
> ändert das nichts. Möchten Sie diese Demo-Präferenz dennoch speichern?"

Hard-Line § 11.36 codifiziert diesen Doppel-Disclaimer.

### 2.2 Föderalismus-Card-Disclaimer

Auf der **Sektion-Ebene** „Kontakt & Postfach" — *nicht* als Footer-Footnote —
trägt die Sektion ein prominentes Disclaimer-Card (orchestrator-decision D3):

> „In der 2026-Realität existieren neben **BundID** mindestens fünf Länder-
> Konten parallel: Service-BW (Baden-Württemberg), Mein Servicekonto Berlin,
> NRW-Konto, BayernID und HH-Servicekonto. Diese Demo abstrahiert auf
> BundID; OZG 2.0 sieht eine Konvergenz bis 24.07.2028 (4-Jahres-Anspruchs-
> frist) vor, ist aber nicht als feste Pflicht-Migrations-Frist im Gesetzes-
> text belegt."

Hard-Line § 11.34 codifiziert die prominente Card-Ebene-Position.

### 2.3 Vision-Modus vs. Heute-Stand-Trennung

Innerhalb V1.1 unterscheiden wir konsistent zwei Frames:
- **Heute-Stand-Frame** (Sektion „Kontakt & Postfach", Cards 1–4): zeigt
  was BundID 2026 produktiv hält. Disclaimer auf Sektions-Ebene
  (Föderalismus). Pro-Card-Disclaimer-Marker je nach Inhalt
  (`bundid_email_only_for_bundid_attached_behoerden`,
  `mobil_self_attested_no_authoritative_register` etc.).
- **2027-Vision-Frame** (Sektion „Notification-Präferenzen"): explizit
  speculative; Banner auf Sektions-Ebene; Save-Confirm-Doppel-Disclaimer
  pro Mutation; eigene Aktivitätsprotokoll-Kategorie `speculative_2027`.

---

## 3. Personas V1.1-Erweiterung

V1 hat drei Personas eingeführt (Anna, Familie Schmidt, Mehmet). V1.1
erweitert die Persona-Daten um den `kontakt`-Block (siehe § 4) und macht
pro Persona einen **distinkten V1.1-Demo-Pfad** sichtbar.

### 3.1 Anna Petrov — Hero-Persona für Familienkasse-Wechsel-Wow

**Vorab-Zustand**: Post-Umzug nach Skalitzer Str. 88, 10997 Berlin; Familienkasse-
Bewilligungsbescheid für ihre Tochter Mia (geb. 02.05.2026) liegt seit
2026-05-08 als **Brief** im Posteingang (`letter-familienkasse-bewilligung`,
existing seed). BundID-Postfach `aktiv` (sie hat es beim Umzugs-Antrag
aktiviert). Notification-Präferenz für Familie/Kindergeld initial `brief`
(Default für noch-nicht-konfigurierte Kategorie nach erstem Boot).

**V1.1-Demo-Pfad** (Hero):

1. Anna landet auf `/stammdaten` → scrollt zur Sektion „Notification-
   Präferenzen (2027-Vision)" → Vision-Banner sichtbar oben (§ 2.1).
2. Familienkasse-Card zeigt aktuell `brief`; Picker bietet Optionen
   `postfach` / `email_pilot` / `sms_pilot` / `brief`.
3. Anna wählt `postfach` → **Live-Counter rendert** unterhalb des Pickers:
   „Sie sparen voraussichtlich **8 Briefe pro Jahr** (≈ 1 Bescheid je 6 Wo
   bei Folge-Antrags-Zyklus) und **4 Tage Bekanntgabe-Frist je Bescheid**
   (§ 9 OZG-Postfach-Fiktion vs. § 41 Abs. 2 VwVfG-Postbrief-Fiktion)".
4. Anna klickt „Speichern" → Save-Confirm-Dialog erscheint (§ 2.1
   Doppel-Disclaimer) → Anna bestätigt.
5. **Cascade-Effekt** rendert in den nächsten 1.4 s:
   - Toast „Familienkasse Berlin-Brandenburg ist `angebunden` — Präferenz
     übernommen (Demo)".
   - Im V1-Aktivitätsprotokoll erscheint ein neuer Eintrag
     `notification_praeferenz.geaendert` (Kategorie `speculative_2027`).
   - **Vorher-Frame**: ein Stapel-Visual zeigt den Familienkasse-Brief als
     Papier-Brief (existing seed `letter-familienkasse-bewilligung` mit
     `kanal: 'brief'`).
   - **Nachher-Frame**: ein Mock-Postfach-Eingang rendert eine
     **synthetische Folgenachricht** der Familienkasse als Postfach-
     Nachricht (`letter-familienkasse-bewilligung-postfach-followup`,
     siehe § 9), mit § 9 OZG-Norm-Pointer und 4-Tage-Bekanntgabe-Fiktion.

Anna sieht in einer einzigen visuellen Bewegung: Aktion (Picker-Wechsel) →
quantifizierte Zeitersparnis (Live-Counter) → sichtbare Konsequenz
(Brief→Postfach-Übergang).

### 3.2 Familie Schmidt — Standard-Pfad

**Vorab-Zustand**: Eltern + 2 Kinder, München, Familienkasse Bayern Süd
(`[MOCK] 234FK892017`). BundID-Postfach `teilaktiviert` (V1 Schmidt-Snapshot).

**V1.1-Demo-Pfad**:

1. Sektion „Kontakt & Postfach" sichtbar mit allen 4 Cards.
2. Postfach-Card zeigt Status `teilaktiviert` mit Wegweiser-Pointer.
3. Verifizierte E-Mail-Card zeigt `[MOCK] elias.schmidt@example.de`
   (verifiziert am `2024-09-12`, BundID-Magic-Link).
4. Mobilfunk-Card zeigt self-attested-Status, kein Verifikations-Datum
   (Schmidt hat Nummer eingetragen, aber nicht verifiziert) — CTA
   „Mobilfunk verifizieren (Mock-OTP)" sichtbar (§ 6.5).
5. Notification-Präferenzen-Sektion: alle 5 Kategorien initial `brief`;
   Schmidt darf optional eine Kategorie umschalten. Demo-Pfad endet hier
   ohne Cascade.

### 3.3 Mehmet Yıldız — Selbstständigen-Disclaimer + ABH-Hard-Lock

**Vorab-Zustand**: Selbstständig (Köln), § 21 AufenthG, eAT-CAN
`[MOCK] T0123456X`, AZR `[MOCK] 6724813-090`. BundID-Postfach `inaktiv`
(V1 Mehmet-Snapshot).

**V1.1-Demo-Pfad** (zeigt zwei spezifische Mehmet-Hard-Locks):

1. Sektion „Kontakt & Postfach" sichtbar.
2. **Verifizierte E-Mail-Card trägt zusätzlichen Mehmet-Disclaimer** (siehe
   § 6.4.B + Hard-Line § 11.40):
   > „Hinweis: ELSTER, Krankenkasse und Berufsgenossenschaft halten ggf.
   > abweichende Kontaktdaten — diese Demo zeigt nur die BundID-Daten."

   Disclaimer-Marker `bundid_email_selbststaendig_caveat`. Sichtbar nur,
   wenn `persona.beschaeftigung?.typ === 'selbstaendig'`.
3. Notification-Präferenzen-Sektion → Kategorie „Aufenthalt / ABH"
   ist **hard-locked auf `brief`** mit Tooltip:
   > „Die LEA Berlin / ABH Köln sind 2026 nicht an das BundID-Postfach
   > angebunden (`bundid_postfach_anbindung: 'nicht_angebunden'`).
   > Bescheide nach §§ 86, 87 AufenthG erfolgen weiterhin per Postbrief
   > (§ 41 Abs. 2 VwVfG)."

   Disclaimer-Marker `abh_brief_hardlock`. Picker disabled; Wert
   nicht änderbar.
4. Postfach-Card zeigt Status `inaktiv` mit Wegweiser-Pointer auf
   `id.bund.de/de/postfach`.

### 3.4 Persona-Spread-Begründung (verifier V-3-Antwort)

Drei Personas reichen für V1.1. Eine vierte Persona „Berlin-Senior, nur
Mein-Servicekonto-Berlin" wäre Föderalismus-realistisch, ist aber bereits
über den Föderalismus-Card-Disclaimer (§ 2.2) abstrahiert; eine eigene
Persona dafür wäre Scope-Creep. Out-of-V1.1 (siehe § 12).

---

## 4. Data model V1.1

### 4.1 Persona-Schema-Migration: `kontakt` von V1-shape zu V1.1-shape

**Strategie**: **Full rename** (Option a aus Orchestrator-Brief). Sauberer als
Alias-Strategie, weil V1 `kontakt`-Block ohnehin nur in einer Place konsumiert
wird (V1 Stammdaten-Read-Model in `getStammdaten`) und keine externen Konsumenten
existieren.

**V1-Shape** (existing in `src/types/persona.ts`):

```ts
kontakt?: {
  email?: string;
  mobil?: string;
};
```

**V1.1-Shape** (siehe § 4.2 für Type-Definition):

```ts
kontakt?: {
  bundid_email: { value: string; verified: boolean; quelle: 'bundid'; verifiziert_am?: string };
  bundid_mobil?: { value: string; verified: boolean; quelle: 'bundid_self_attested'; verifiziert_am?: string };
  bundid_postfach: { aktiviert: boolean; status: 'aktiv' | 'inaktiv' | 'teilaktiviert'; aktiviert_am?: string };
  notification_praeferenzen: NotificationPraeferenzen;
};
```

**Migrations-Step** in `src/lib/mock-backend/persistence-migrations.ts`:

- Bei Boot wird der LocalStorage-Bucket `govtech-de:v1:stammdaten:kontakt`
  geprüft; wenn `schema_version < 2` (V1-shape), läuft eine
  `migrateKontaktV1ToV11`-Funktion, die jeden Persona-Eintrag in den neuen
  Shape überführt:
  - `email` → `bundid_email.value` (verified=true wenn Wert existiert,
    sonst Card collapsed); fallback `''` mit verified=false.
  - `mobil` → `bundid_mobil.value` (verified=false als Default;
    `quelle: 'bundid_self_attested'`); wenn `mobil` undefined: das ganze
    `bundid_mobil`-Sub-Objekt undefined.
  - `bundid_postfach` initial-default `{ aktiviert: false, status: 'inaktiv' }`;
    Persona-Seeds (§ 4.5) überschreiben pro Persona.
  - `notification_praeferenzen` initial-default `5×'brief'` (Hard-Line § 11.34
    Default-Brief-Fallback).
- Schema-Version bumpt auf `2`.
- Migration ist **idempotent** (Re-Run bei verschiedenen Buckets ohne Daten-Loss).
- **Keine** `localStorage`-Daten gehen verloren — Migration ist additiv.

**Persona-Schema-Erweiterung** in `src/types/persona.ts`:

```ts
// EDIT — V1 'kontakt' wird ersetzt durch V1.1 'kontakt' (full rename)
export interface Persona {
  // ... existing V1 fields unchanged ...

  /** V1.1 — replaces V1 kontakt: Kontakt-Schicht (BundID-Postfach + Notification). */
  kontakt?: PersonaKontakt;
}

export interface PersonaKontakt {
  bundid_email: BundIdEmail;
  bundid_mobil?: BundIdMobil;
  bundid_postfach: BundIdPostfach;
  notification_praeferenzen: NotificationPraeferenzen;
}
```

### 4.2 New types — `src/types/persona-kontakt.ts` (NEW file)

```ts
/**
 * BundID-verifizierte E-Mail-Adresse. Quelle ist BundID self-service: Magic-Link-
 * Verifikation beim Account-Anlegen (verifier-confirmed Realism R-4).
 *
 * Hard-Line: NICHT als hoheitlich-attestiertes Identitäts-Attribut darstellen —
 * verified=true heißt nur „Adresse existierte zum Verifikations-Zeitpunkt und
 * Account-Inhaber hatte Zugriff". Drittbehörden, die NICHT an BundID angebunden
 * sind (Service-BW, Mein-Servicekonto-Berlin, NRW-Konto), nutzen diese E-Mail
 * NICHT — Disclaimer-Marker `bundid_email_only_for_bundid_attached_behoerden`.
 */
export interface BundIdEmail {
  value: string;          // [MOCK] Format
  verified: boolean;      // true = Magic-Link bestätigt
  quelle: 'bundid';
  verifiziert_am?: string; // ISO-8601
}

/**
 * Self-attested Mobilfunknummer. KEIN hoheitliches Register hält Mobilfunknummern
 * in DE (research-scout R-4 + verifier C-3-Differenzierung). 2FA-Verfahren bei
 * BundID ist primär eID, nicht SMS-OTP — Mobilfunk hier ist nur „bequemer
 * Notification-Träger", keine Bekanntgabe-Authentifizierung (§§ 41 Abs. 2a
 * VwVfG / 9 OZG verlangen Authentifizierung, die SMS nicht bietet —
 * domain-expert C-4 + Hard-Line § 11.37).
 */
export interface BundIdMobil {
  value: string;          // [MOCK] Format
  verified: boolean;      // true = Mock-OTP-Flow durchlaufen
  quelle: 'bundid_self_attested';
  verifiziert_am?: string; // ISO-8601
}

/**
 * BundID-Postfach-Status. Drei Zustände möglich:
 * - aktiv: Bürger:in hat Postfach unter id.bund.de aktiviert
 * - inaktiv: Postfach noch nicht aktiviert (per Account opt-in nach § 9 OZG;
 *   Aktivierung erfolgt im id.bund.de-Konto, NICHT in unserer App)
 * - teilaktiviert: Aktivierung läuft (Account-Sync-Mock; Demo-Pattern)
 *
 * Hard-Line § 11.32: Aktivierung wird in unserer App NICHT angeboten. Wegweiser-
 * Pointer auf id.bund.de/de/postfach (orchestrator-decision D2 + verifier H-2).
 */
export interface BundIdPostfach {
  aktiviert: boolean;     // shorthand für status === 'aktiv'
  status: 'aktiv' | 'inaktiv' | 'teilaktiviert';
  aktiviert_am?: string;  // ISO-8601
}

/**
 * Notification-Präferenz pro Vorgangs-Kategorie. **Speculative-2027** — diese
 * Funktion existiert in DE 2026 nicht (verifier H-9; orchestrator-decision D2).
 *
 * **Genau 5 Kategorien** (verifier-Hard-Cap, sonst Cockpit-Falle); domain-expert
 * empfahl 6 (inkl. ABH separate), aber die ABH-Kategorie ist hard-locked auf
 * 'brief' und kann unter 'sonstige' co-existieren — siehe Hard-Line § 11.34.
 */
export interface NotificationPraeferenzen {
  steuer: NotificationKanal;       // Finanzamt / BZSt → Norm: § 122a Abs. 4 AO
  sozial: NotificationKanal;       // DRV / GKV / Bürgergeld → Norm: § 36a SGB I + § 41 Abs. 2a VwVfG
  familie: NotificationKanal;      // Familienkasse / Elterngeld / Wohngeld → Norm: § 9 OZG
  verkehr: NotificationKanal;      // KFZ / Bußgeld / Führerschein → Norm: noch postalisch (§ 41 Abs. 2 VwVfG); Picker zeigt Disclaimer
  sonstige: NotificationKanal;     // Bürgeramt / sonstige Bundesleistungen → Norm: § 9 OZG (BundID-Postfach) wenn `bundid_postfach_anbindung === 'angebunden'`
}

/**
 * Notification-Kanal pro Vorgangs-Kategorie. SMS und Push sind NIE als
 * Bescheid-Kanal darstellbar — sie sind reine Notification-über-Postfach-
 * Eingang-Kanäle (Hard-Line § 11.37; verifier H-3, domain-expert C-4).
 *
 * Sozialdaten-Inhalt darf NIE in SMS/Push-Renderings rendern (Hard-Line
 * § 11.38; verifier H-7, domain-expert C-8).
 */
export type NotificationKanal =
  | 'postfach'        // BundID-Postfach via § 9 OZG (4-Tage-Bekanntgabe-Fiktion)
  | 'email_pilot'     // BundID-E-Mail-Notification (informatorisch, kein Bescheid)
  | 'sms_pilot'       // SMS als Notification-Hinweis (nie als Bekanntgabe)
  | 'brief';          // Postbrief via § 41 Abs. 2 VwVfG (rechtssicher Default)
```

### 4.3 Behoerde-Schema-Erweiterung — `bundid_postfach_anbindung`

In `src/types/behoerde.ts` wird das `Behoerde`-Type um ein **Pflicht-Feld**
ergänzt (orchestrator-decision D4 + Hard-Line § 11.35):

```ts
// EDIT — additive non-optional Pflicht-Feld
export interface Behoerde {
  // ... existing V1 fields unchanged ...

  /**
   * BundID-Postfach-Anbindungs-Status der Behörde (Stand Mai 2026).
   * - 'angebunden': Bürger:in kann Postfach-Notification wählen
   * - 'nicht_angebunden': hard-locked auf Brief/Eigenportal
   * - 'in_pilotierung': Picker mit "Pilot-Phase"-Disclaimer-Note
   *
   * Werte sind Mock-Annahmen für Demo-Realismus; in der echten 2026er Welt ist
   * die Liste der ~1.600 BundID-Onlinedienste pro Behörde dynamisch und nicht
   * direkt einsehbar (research-scout-Note + verifier-Föderalismus-Disclaimer).
   */
  bundid_postfach_anbindung: 'angebunden' | 'nicht_angebunden' | 'in_pilotierung';
}
```

**Pflicht-Feld** (kein `?`) — alle ~14 existing Behörden in
`src/data/behoerden.json` müssen das Feld erhalten. Mock-Annahmen pro
Behörde stehen in § 10 unten.

### 4.4 Activity-Log — vierter Typ `behoerde_zu_buerger`

V1 hat `UebermittlungsLogEntry.kategorie` mit drei Werten:
`behoerde_zu_behoerde` | `app_aktivitaet` | `speculative_2027`. V1.1
**ergänzt einen vierten Wert** `behoerde_zu_buerger` (orchestrator-decision
C-6 + Hard-Line § 11.40):

```ts
// EDIT in src/types/stammdaten.ts (UebermittlungsLogEntry kategorie-Discriminator)
kategorie:
  | 'behoerde_zu_behoerde'   // Mock-IDA-Push (V1)
  | 'app_aktivitaet'         // App-internes Log (V1)
  | 'speculative_2027'       // IBAN-Push, Wallet-Preview (V1) + Notification-Präferenz-Mutation (V1.1)
  | 'behoerde_zu_buerger';   // V1.1 NEU: Notification.gesendet, Posteingang.eingegangen
```

**Verwendung**: Wenn Familienkasse einen Bescheid ins Postfach legt, entsteht
ein Eintrag `behoerde_zu_buerger` (Absender Familienkasse, Empfänger
`persona_id`, Zweck `posteingang.eingegangen`). Bei Notification-SMS (Mock-Render
ohne echten SMS-Versand) ebenso.

**Bucket-Decision**: Same Bucket wie V1 (`govtech-de:v1:stammdaten:uebermittlungs-log`)
mit Pflicht-Filter „Richtung" — orchestrator-decision C-6. Kein neuer Bucket;
neuer 4. Filter-Wert in der Aktivitätsprotokoll-UI (siehe § 6.7).

### 4.5 Persona-Seed-Pflege V1.1

Die drei V1-Personas erhalten `kontakt`-Block (Persona-Schema § 4.1):

**Anna Petrov**:
```ts
kontakt: {
  bundid_email: { value: '[MOCK] anna.petrov@example.de', verified: true, quelle: 'bundid', verifiziert_am: '2025-11-04' },
  bundid_mobil: { value: '[MOCK] +49 30 12345678', verified: true, quelle: 'bundid_self_attested', verifiziert_am: '2026-04-15' },
  bundid_postfach: { aktiviert: true, status: 'aktiv', aktiviert_am: '2026-05-08' }, // beim Umzug aktiviert
  notification_praeferenzen: { steuer: 'brief', sozial: 'brief', familie: 'brief', verkehr: 'brief', sonstige: 'brief' },
  // → Hero-Demo: Anna wechselt familie auf 'postfach' während des Loom-Cuts
}
```

**Familie Schmidt** (Hauptperson Elias Schmidt):
```ts
kontakt: {
  bundid_email: { value: '[MOCK] elias.schmidt@example.de', verified: true, quelle: 'bundid', verifiziert_am: '2024-09-12' },
  bundid_mobil: { value: '[MOCK] +49 89 87654321', verified: false, quelle: 'bundid_self_attested' }, // self-attested, nicht verifiziert
  bundid_postfach: { aktiviert: false, status: 'teilaktiviert', aktiviert_am: '2026-03-21' },
  notification_praeferenzen: { steuer: 'brief', sozial: 'brief', familie: 'brief', verkehr: 'brief', sonstige: 'brief' },
}
```

**Mehmet Yıldız**:
```ts
kontakt: {
  bundid_email: { value: '[MOCK] mehmet.yildiz@example.de', verified: true, quelle: 'bundid', verifiziert_am: '2025-08-30' },
  bundid_mobil: { value: '[MOCK] +49 221 5550199', verified: true, quelle: 'bundid_self_attested', verifiziert_am: '2025-08-30' },
  bundid_postfach: { aktiviert: false, status: 'inaktiv' }, // ABH-Hard-Lock-Realismus
  notification_praeferenzen: { steuer: 'brief', sozial: 'brief', familie: 'brief', verkehr: 'brief', sonstige: 'brief' },
}
```

### 4.6 Activity-Log seed-Erweiterung V1.1

Pro Persona werden in `seed.ts` zusätzlich zu V1-Einträgen folgende V1.1-relevant
Mock-Einträge hinterlegt:

- **Anna**: 1 Eintrag `behoerde_zu_buerger` aus 2026-05-08 (Familienkasse →
  Anna, Zweck „Bewilligungsbescheid Kindergeld"). Nach dem Loom-Cut entstehen
  zur Laufzeit weitere Einträge: 1 `speculative_2027` (Präferenz-Wechsel) + 1
  `behoerde_zu_buerger` (Postfach-Followup-Nachricht).
- **Schmidt**: 2 Einträge `behoerde_zu_buerger` aus 2024-2025 (Standesamt →
  Eheschließung-Bestätigung; Familienkasse Bayern Süd → Kindergeld-Folge-
  Bescheid).
- **Mehmet**: 1 Eintrag `behoerde_zu_buerger` aus 2025-2026 (LEA Köln → eAT-
  Verlängerungs-Hinweis), explizit als `kanal: 'brief'` (ABH nicht
  angebunden — siehe § 4.4).

### 4.7 Disclaimer-Marker-Erweiterung V1.1

Folgende neue Disclaimer-Marker werden in das V1-Disclaimer-System aufgenommen
(verifier H-9 + domain-expert):

| Marker | Sichtbarkeit | Disclaimer-Typ |
|---|---|---|
| `cross_channel_routing_speculative` | Sektion „Notification-Präferenzen" Banner | Vision-Banner (§ 2.1) |
| `bundid_push_speculative` | Email-Pilot- und SMS-Pilot-Picker-Optionen | Pro-Option-Tooltip |
| `eudi_push_speculative` | (bereits in V1; reuse, kein neuer Marker) | reuse |
| `sms_push_only_notification` | Auf jeder gewählten SMS-Pilot-Option | Pro-Option-Tooltip |
| `sozialdaten_notification_redaction` | Picker-Option für Kategorie `sozial` × Kanal `sms_pilot` | Pro-Option-Tooltip |
| `bundid_email_only_for_bundid_attached_behoerden` | E-Mail-Card | Card-Footer |
| `bundid_email_selbststaendig_caveat` | E-Mail-Card *nur* bei `beschaeftigung.typ === 'selbstaendig'` | Card-Footer (Mehmet-Disclaimer) |
| `mobil_self_attested_no_authoritative_register` | Mobilfunk-Card | Card-Footer |
| `abh_brief_hardlock` | Picker-Card *nur* wenn Persona drittstaatsangehörig + ABH-Behörde nicht_angebunden | Pro-Picker-Tooltip |
| `foederalismus_card_disclaimer` | Sektions-Ebene „Kontakt & Postfach" | Card-Banner (§ 2.2) |

---

## 5. Mock-backend additions V1.1

### 5.1 New API methods (in `src/lib/mock-backend/api.ts`)

```ts
// Read API
getKontakt(personaId: PersonaId): Promise<PersonaKontakt>
getNotificationPraeferenzen(personaId: PersonaId): Promise<NotificationPraeferenzen>
getBehoerdeAnbindung(behoerdeId: BehoerdeId): Promise<'angebunden' | 'nicht_angebunden' | 'in_pilotierung'>

// Write API — Self-Edit
toggleNotificationPraeferenz(input: {
  kategorie: keyof NotificationPraeferenzen;
  kanal: NotificationKanal;
}): Promise<{ counter: { briefe_pro_jahr_gespart: number; tage_frist_gespart: number } }>
// → emittiert StammdatenEvent 'stammdaten/notification-praeferenz-changed'
// → erzeugt 1 Activity-Log-Eintrag Kategorie 'speculative_2027'
// → bei Familie-Kategorie + Kanal 'postfach' liefert counter mit { 8, 4 } für Hero-Demo;
//   bei anderen Kombinationen counter aus § 5.5-Lookup-Tabelle

simulatePostfachAktivierung(personaId: PersonaId): Promise<void>
// → Demo-Only: setzt status auf 'teilaktiviert' → nach 1.4s auf 'aktiv'
// → in V1.1 NICHT im UI als CTA verfügbar (Hard-Line § 11.32 — nur via DevTools/Test-Helper)

simulateMobilOtpFlow(personaId: PersonaId, code: string): Promise<{ verified: boolean }>
// → Mock-OTP, kein echter SMS-Versand
// → akzeptiert immer Code '124857' (Demo-Pattern), wirft 'OTP_INVALID' bei anderen Werten
// → bei verified=true: Activity-Log Kategorie 'app_aktivitaet'

updateBundidEmail(personaId: PersonaId, value: string): Promise<void>
// → in V1.1 NICHT im UI als CTA verfügbar (E-Mail bleibt read-only — research-scout Hard-Line 4)
// → existiert nur als Test-Helper für seed-Migration

simulateFamilienkasseFollowupLetter(personaId: PersonaId): Promise<{ letter_id: string }>
// → Hero-Demo-Specific: erzeugt nach Familie-Kategorie-Wechsel auf 'postfach' eine
//   Mock-Postfach-Nachricht der Familienkasse als Bridge zum Posteingang
// → fügt einen seeded Letter (`letter-familienkasse-bewilligung-postfach-followup`) zum
//   `letters`-Bucket hinzu, mit kanal='postfach'
// → 1 Activity-Log-Eintrag Kategorie 'behoerde_zu_buerger'
```

**Latenz**: alle Methoden laufen durch `withLatency()` mit V1-Standard-Profil
(300–800 ms + 5 % Fehlerquote). `simulateFamilienkasseFollowupLetter` zusätzlich
mit deterministischer 800 ms-Verzögerung für die Loom-Cut-Choreographie (siehe § 8).

### 5.2 Schema-Extensions in `src/lib/mock-backend/schemas.ts`

```ts
export const notificationKanalSchema = z.enum([
  'postfach', 'email_pilot', 'sms_pilot', 'brief',
]);

export const notificationPraeferenzenSchema = z.object({
  steuer: notificationKanalSchema,
  sozial: notificationKanalSchema,
  familie: notificationKanalSchema,
  verkehr: notificationKanalSchema,
  sonstige: notificationKanalSchema,
});

export const bundIdEmailSchema = z.object({
  value: z.string().min(1),
  verified: z.boolean(),
  quelle: z.literal('bundid'),
  verifiziert_am: z.string().regex(/^\d{4}-\d{2}-\d{2}/).optional(),
});

export const bundIdMobilSchema = z.object({
  value: z.string().min(1),
  verified: z.boolean(),
  quelle: z.literal('bundid_self_attested'),
  verifiziert_am: z.string().regex(/^\d{4}-\d{2}-\d{2}/).optional(),
});

export const bundIdPostfachSchema = z.object({
  aktiviert: z.boolean(),
  status: z.enum(['aktiv', 'inaktiv', 'teilaktiviert']),
  aktiviert_am: z.string().regex(/^\d{4}-\d{2}-\d{2}/).optional(),
});

export const personaKontaktSchema = z.object({
  bundid_email: bundIdEmailSchema,
  bundid_mobil: bundIdMobilSchema.optional(),
  bundid_postfach: bundIdPostfachSchema,
  notification_praeferenzen: notificationPraeferenzenSchema,
});

// EDIT: behoerdeSchema erweitern um Pflicht-Feld
export const behoerdeSchema = z.object({
  // ... existing
  bundid_postfach_anbindung: z.enum(['angebunden', 'nicht_angebunden', 'in_pilotierung']),
});

// EDIT: uebermittlungsLogEntrySchema kategorie-enum erweitern um 'behoerde_zu_buerger'
export const uebermittlungsLogEntrySchema = z.object({
  // ... existing
  kategorie: z.enum([
    'behoerde_zu_behoerde', 'app_aktivitaet', 'speculative_2027', 'behoerde_zu_buerger',
  ]),
});
```

### 5.3 Mock-Backend-Events V1.1

Die folgenden neuen `MockBackendEvent`-Varianten werden ergänzt
(in `src/types/mock-event.ts`):

```ts
type StammdatenKontaktEvent =
  | { type: 'stammdaten/notification-praeferenz-changed'; persona_id: PersonaId; kategorie: keyof NotificationPraeferenzen; vorher: NotificationKanal; nachher: NotificationKanal; counter: { briefe_pro_jahr_gespart: number; tage_frist_gespart: number } }
  | { type: 'stammdaten/postfach-activation-simulated'; persona_id: PersonaId; new_status: BundIdPostfach['status'] }
  | { type: 'stammdaten/bundid-mobil-otp-verified'; persona_id: PersonaId }
  | { type: 'stammdaten/bundid-mobil-otp-failed'; persona_id: PersonaId }
  | { type: 'stammdaten/familienkasse-followup-letter-simulated'; persona_id: PersonaId; letter_id: string };
```

Jeder Event ergänzt den Activity-Log mit einem entsprechenden
`UebermittlungsLogEntry`. Die `notification-praeferenz-changed`-Event ist
**stets** Kategorie `speculative_2027`. Die `familienkasse-followup-letter-simulated`-
Event ist Kategorie `behoerde_zu_buerger`.

### 5.4 Persistierung V1.1 — Bucket-Erweiterung

| Bucket-Key | Inhalt | Schema-Version |
|---|---|---|
| `govtech-de:v1:stammdaten:kontakt` | `Record<PersonaId, PersonaKontakt>` (V1.1-shape) | **v2** (bumpt von v1 — Migration § 4.1) |
| `govtech-de:v1:stammdaten:uebermittlungs-log` | `Record<PersonaId, UebermittlungsLogEntry[]>` (max 200 pro Persona; FIFO-Eviction; **erweiterte kategorie-Werte um `behoerde_zu_buerger`**) | v1 (kein Bump, additiver Wert) |
| `govtech-de:v1:posteingang:letters` | (bereits in V1; reuse für Hero-Demo `letter-familienkasse-bewilligung-postfach-followup`) | reuse |

**Migrations-Schritt** (siehe § 4.1) läuft genau einmal beim ersten V1.1-Boot
nach Persona-Migration; `persistence-migrations.ts` neue Funktion
`migrateKontaktV1ToV11` registriert sich auf Schema-Version-Bump.

### 5.5 Lookup-Tabelle für Familienkasse-Wechsel-Counter

Die genauen Werte des Live-Counters (§ 6.5) werden aus einer Tabelle in
`src/lib/mock-backend/notification/savings-lookup.ts` (NEW) abgeleitet:

```ts
// Briefe/Jahr-Hochrechnungen aus Behörden-typischer Korrespondenz-Frequenz
// (Mock-Annahmen für Demo; nicht echt-belegt)
export const SAVINGS_LOOKUP: Record<keyof NotificationPraeferenzen, Record<NotificationKanal, { briefe_pro_jahr_gespart: number; tage_frist_gespart: number }>> = {
  steuer: {
    postfach: { briefe_pro_jahr_gespart: 4, tage_frist_gespart: 4 },     // Steuer-Folgejahr-Bescheide; § 122a Abs. 4 AO
    email_pilot: { briefe_pro_jahr_gespart: 0, tage_frist_gespart: 0 },  // Notification-only, kein Bekanntgabe-Wechsel
    sms_pilot: { briefe_pro_jahr_gespart: 0, tage_frist_gespart: 0 },
    brief: { briefe_pro_jahr_gespart: 0, tage_frist_gespart: 0 },
  },
  sozial: {
    postfach: { briefe_pro_jahr_gespart: 6, tage_frist_gespart: 4 },     // DRV/GKV-Folgebescheide
    email_pilot: { briefe_pro_jahr_gespart: 0, tage_frist_gespart: 0 },
    sms_pilot: { briefe_pro_jahr_gespart: 0, tage_frist_gespart: 0 },
    brief: { briefe_pro_jahr_gespart: 0, tage_frist_gespart: 0 },
  },
  familie: {
    postfach: { briefe_pro_jahr_gespart: 8, tage_frist_gespart: 4 },     // HERO-WERT: Familienkasse-Folgezyklus
    email_pilot: { briefe_pro_jahr_gespart: 0, tage_frist_gespart: 0 },
    sms_pilot: { briefe_pro_jahr_gespart: 0, tage_frist_gespart: 0 },
    brief: { briefe_pro_jahr_gespart: 0, tage_frist_gespart: 0 },
  },
  verkehr: {
    postfach: { briefe_pro_jahr_gespart: 0, tage_frist_gespart: 0 },     // KFZ-Behörden noch nicht angebunden
    email_pilot: { briefe_pro_jahr_gespart: 0, tage_frist_gespart: 0 },
    sms_pilot: { briefe_pro_jahr_gespart: 0, tage_frist_gespart: 0 },
    brief: { briefe_pro_jahr_gespart: 0, tage_frist_gespart: 0 },
  },
  sonstige: {
    postfach: { briefe_pro_jahr_gespart: 2, tage_frist_gespart: 4 },
    email_pilot: { briefe_pro_jahr_gespart: 0, tage_frist_gespart: 0 },
    sms_pilot: { briefe_pro_jahr_gespart: 0, tage_frist_gespart: 0 },
    brief: { briefe_pro_jahr_gespart: 0, tage_frist_gespart: 0 },
  },
};
```

`toggleNotificationPraeferenz` liest aus dieser Tabelle und gibt
`{ counter }` zurück — die UI rendert den Counter inline (siehe § 6.5).

---

## 6. Frontend Component-Inventory V1.1

> Convention identisch zu V1: `<NEW>` = neu anzulegen; `<EXTEND>` = bestehende
> Komponente erweitern; `reuse` = unverändert. V1.1-Komponenten leben unter
> `src/components/stammdaten/kontakt/`.

| Komponente | Pfad | Zweck | Status V1.1 |
|---|---|---|---|
| `<KontaktSektion>` | `src/components/stammdaten/kontakt/KontaktSektion.tsx` | 6. Sektion auf der Stammdaten-Page; Container für die 4 Cards + Föderalismus-Card-Disclaimer (§ 2.2) auf Sektions-Ebene | `<NEW>` |
| `<FoederalismusCardDisclaimer>` | `src/components/stammdaten/kontakt/FoederalismusCardDisclaimer.tsx` | prominentes Card-Banner mit Wortlaut aus § 2.2; ARIA-Role `note`; `<NormZitatSpan>`-Wraps für „§ 9 OZG" und „24.07.2028" | `<NEW>` |
| `<BundidPostfachCard>` | `src/components/stammdaten/kontakt/BundidPostfachCard.tsx` | Card 1: Status-Badge (aktiv / inaktiv / teilaktiviert) + Wegweiser-Pointer auf id.bund.de + § 9 OZG-Norm-Pointer + Aktivierungs-Datum (wenn vorhanden) | `<NEW>` |
| `<VerifizierteEmailCard>` | `src/components/stammdaten/kontakt/VerifizierteEmailCard.tsx` | Card 2: BundID-E-Mail read-only mit Verifikations-Badge + Verifikations-Datum + Disclaimer-Marker `bundid_email_only_for_bundid_attached_behoerden` als Card-Footer + (conditional Mehmet-Caveat) | `<NEW>` |
| `<MobilfunkSelfEditCard>` | `src/components/stammdaten/kontakt/MobilfunkSelfEditCard.tsx` | Card 3: Mobilfunk read+self-edit; Verifikations-Status (verifiziert / nicht verifiziert) + CTA „Verifizieren (Mock-OTP)" → öffnet `<MobilOtpMockModal>` | `<NEW>` |
| `<MobilOtpMockModal>` | `src/components/stammdaten/kontakt/MobilOtpMockModal.tsx` | base-ui `<Dialog>`; Mock-OTP-Flow; akzeptiert `[MOCK] OTP: 124857` (Demo-Pattern); Disclaimer „kein echter SMS-Versand" verbatim | `<NEW>` |
| `<PostanschriftCrossRefCard>` | `src/components/stammdaten/kontakt/PostanschriftCrossRefCard.tsx` | Card 4: **Cross-Reference** zur V1-Anschrift-Sektion (kein Doppel-Display); Link „Anschrift in der Sektion ‚Anschrift'" + Norm-Pointer „§ 3 BMG"; Hinweis „Authoritative Quelle: Melderegister" | `<NEW>` |
| `<PersonaSelbststaendigCaveat>` | `src/components/stammdaten/kontakt/PersonaSelbststaendigCaveat.tsx` | Conditional Disclaimer-Block, sichtbar nur bei `beschaeftigung.typ === 'selbstaendig'`; Wortlaut § 3.3; Marker `bundid_email_selbststaendig_caveat` | `<NEW>` |
| `<NotificationPraeferenzenSektion>` | `src/components/stammdaten/kontakt/NotificationPraeferenzenSektion.tsx` | 7. Sektion auf der Stammdaten-Page; Container für Vision-Banner (§ 2.1) + 5 Picker-Cards | `<NEW>` |
| `<VisionBanner>` | `src/components/stammdaten/kontakt/VisionBanner.tsx` | bildschirm-übergreifender Vision-Banner mit Wortlaut aus § 2.1; ARIA-Role `note`; Marker `cross_channel_routing_speculative` | `<NEW>` |
| `<NotificationPraeferenzPicker>` | `src/components/stammdaten/kontakt/NotificationPraeferenzPicker.tsx` | base-ui `<RadioGroup>` mit 4 Optionen (postfach / email_pilot / sms_pilot / brief); Pro-Option-Tooltip mit Disclaimer-Markern (§ 4.7); conditional disabled wenn ABH-Hard-Lock greift; conditional „Pilot-Phase"-Note bei `bundid_postfach_anbindung === 'in_pilotierung'`; Save-Trigger öffnet `<SaveConfirmDialog>` | `<NEW>` |
| `<SaveConfirmDialog>` | `src/components/stammdaten/kontakt/SaveConfirmDialog.tsx` | base-ui `<AlertDialog>`; Doppel-Disclaimer-Wortlaut aus § 2.1; primary „Demo-Präferenz speichern" / tertiary „Abbrechen" | `<NEW>` |
| `<LiveCounter>` | `src/components/stammdaten/kontakt/LiveCounter.tsx` | Live-Counter „Sie sparen voraussichtlich {N} Briefe pro Jahr und {M} Tage Bekanntgabe-Frist je Bescheid"; rendert nach erfolgreichem Save unterhalb des Pickers; `<NormZitatSpan>` für „§ 9 OZG" und „§ 41 Abs. 2 VwVfG" | `<NEW>` |
| `<FamilienkasseWechselCascade>` | `src/components/stammdaten/kontakt/FamilienkasseWechselCascade.tsx` | **Hero-Wow-Component**: orchestriert die 1.4 s-Animation Vorher-Frame (Brief) → Nachher-Frame (Postfach) nach Save in Kategorie `familie` × Kanal `postfach`; respektiert `prefers-reduced-motion` (siehe § 13); ruft `simulateFamilienkasseFollowupLetter()` auf; Toast-Feedback | `<NEW>` |
| `<RichtungSwitch>` | `src/components/stammdaten/kontakt/RichtungSwitch.tsx` | Filter-Switch oberhalb des V1-Aktivitätsprotokolls; 4 Werte: alle / eingehend / ausgehend / intern; default „alle"; updated `<UebermittlungsLogList>`-Filter | `<NEW>` |
| `<UebermittlungsLogList>` | `src/components/stammdaten/UebermittlungsLogList.tsx` | reuse aus V1, **erweitert** um `richtung`-Prop + Rendering der neuen `behoerde_zu_buerger`-Kategorie-Visual (Pfeil-Icon nach unten) | `<EXTEND>` |
| `<NormZitatSpan>` | `src/components/posteingang/NormZitatSpan.tsx` | reuse, **erweitert** um Stammdaten-V1.1-spezifische Norm-Zitate (siehe § 11.39 Hard-Line) — orchestrator-decision D5: KEINE parallel-map | `<EXTEND>` |
| `<BehoerdenBadge>` | `src/components/shared/BehoerdenBadge.tsx` | reuse | reuse |

**Layout-Skizze** der erweiterten Stammdaten-Page (Default-Tab „Mein Profil"):

```
┌───────────────────────────────────────────────────────────────────┐
│  ▌Stammdaten                              [Mein Profil] [Wallet]  │
│  ┌─ Hero-Card (V1) ───────────────────────────────────────────┐   │
│  │  Datenschutzcockpit (Pilot-Phase) — N Register, last Übermitt│   │
│  └────────────────────────────────────────────────────────────┘   │
│  Disclaimer-1 (V1 Lese-Schicht)                                   │
│                                                                   │
│  ▼ 1. Identität (V1)                                             │
│  ▶ 2. Anschrift (V1, default-zugeklappt)                         │
│  ▶ 3. Familie (V1)                                               │
│  ▶ 4. Dokumente (V1)                                             │
│  ▶ 5. Sperren & Einstellungen (V1)                               │
│                                                                   │
│  ▼ 6. Kontakt & Postfach   ← NEU V1.1                            │
│  ┌─ Föderalismus-Card-Disclaimer ─────────────────────────────┐   │
│  │  In der 2026-Realität existieren neben BundID …            │   │
│  └────────────────────────────────────────────────────────────┘   │
│  ┌─ BundID-Postfach (Card 1) ────────────────────────────────┐    │
│  │  Status: aktiv (seit 08.05.2026) · § 9 OZG · Wegweiser    │    │
│  └───────────────────────────────────────────────────────────┘    │
│  ┌─ Verifizierte E-Mail (Card 2) ────────────────────────────┐    │
│  │  [MOCK] anna.petrov@example.de · verifiziert 04.11.2025   │    │
│  │  Disclaimer: Nur BundID-angebundene Behörden …            │    │
│  └───────────────────────────────────────────────────────────┘    │
│  ┌─ Mobilfunk (Card 3) ──────────────────────────────────────┐    │
│  │  [MOCK] +49 30 12345678 · verifiziert · [Verifizieren]    │    │
│  └───────────────────────────────────────────────────────────┘    │
│  ┌─ Postanschrift (Card 4 — Cross-Ref) ──────────────────────┐    │
│  │  → Siehe Sektion „Anschrift" · § 3 BMG                    │    │
│  └───────────────────────────────────────────────────────────┘    │
│                                                                   │
│  ▼ 7. Notification-Präferenzen (2027-Vision)   ← NEU V1.1        │
│  ┌─ Vision-Banner ───────────────────────────────────────────┐    │
│  │  2027-Vision — diese Funktion existiert in DE heute nicht…│    │
│  └───────────────────────────────────────────────────────────┘    │
│  Steuer:  ( ) postfach ( ) email_pilot ( ) sms_pilot (●) brief    │
│  Sozial:  ( ) postfach ( ) email_pilot ( ) sms_pilot (●) brief    │
│  Familie: (●) postfach ( ) email_pilot ( ) sms_pilot ( ) brief    │
│            ↳ Sie sparen voraussichtlich 8 Briefe/Jahr + 4 Tage…   │
│  Verkehr: ( ) postfach ( ) email_pilot ( ) sms_pilot (●) brief    │
│  Sonstige:( ) postfach ( ) email_pilot ( ) sms_pilot (●) brief    │
│                                                                   │
│  ┌─ Aktivitätsprotokoll (V1) ───────────────────────────────┐     │
│  │  [Richtung: alle ▾]  ← NEU V1.1 Filter                   │     │
│  │  · Familienkasse → Anna · Bewilligungsbescheid (Postfach)│     │
│  │  · Anna → Notification-Präferenz Familie geändert (Spec) │     │
│  │  · Bürgeramt → Beitragsservice (V1 Umzug-Cascade)        │     │
│  │  …                                                       │     │
│  └──────────────────────────────────────────────────────────┘     │
└───────────────────────────────────────────────────────────────────┘
```

### 6.1 RSC-vs-Client-Boundary

- **Server**: `getKontakt()` + `getNotificationPraeferenzen()` +
  `getBehoerdeAnbindung()` für jede beteiligte Behörde laufen in der
  RSC-Page; gerendert wird das initial HTML mit allen Card-Werten.
- **Client**: alle Picker, Modale, `<FamilienkasseWechselCascade>`,
  `<RichtungSwitch>`, `<MobilOtpMockModal>` — `'use client'`.
- **Mutations**: Self-Edit über Mock-Backend; nach Mutation `router.refresh()`
  *oder* Optimistic-State + Toast (Architect-Empfehlung wie V1: Optimistic-State).

### 6.2 Sektion „Kontakt & Postfach" — Sektions-Ebene-Layout

Die 6. Sektion ist eine V1-`<StammdatenSektion>` (reuse) mit ID
`kontakt_postfach`. Sektion-Header `<h2>Kontakt & Postfach</h2>`; default
**zugeklappt** im V1-Stil; expand öffnet Föderalismus-Disclaimer + 4 Cards.

Sektion-spezifische Aktivitätsprotokoll-Mini-Liste rendert die letzten 5
`behoerde_zu_buerger`-Einträge, die diese Sektion betreffen (Notification-
Sendungen, Postfach-Eingänge).

### 6.3 Card 1 — `<BundidPostfachCard>`

Layout-Logik:
- **Status-Badge** trägt zusätzlich Text-Marker (Hard-Line § 11.34 vererbt
  aus V1):
  - `aktiv` → grüner Badge „Postfach aktiv"
  - `teilaktiviert` → gelber Badge „Postfach in Aktivierung"
  - `inaktiv` → grauer Badge „Postfach nicht aktiviert"
- **Wegweiser-Pointer**: Link „Aktivierung im BundID-Konto unter
  `id.bund.de/de/postfach`" — `target="_blank"`, `rel="noopener noreferrer"`;
  Wegweiser-Norm-Pointer „§ 9 Abs. 1 S. 2 OZG: Opt-Out im jeweiligen Antrag möglich".
- **Hard-Line-Inforced**: Card hat **keinen** Aktivierungs-Toggle (Hard-Line
  § 11.32 + § 11.33). UI-Test asseriert das (siehe § 15).
- **Aktivierungs-Datum** sichtbar wenn `aktiviert_am` vorhanden.

### 6.4 Card 2 — `<VerifizierteEmailCard>`

Layout-Logik:
- E-Mail-Wert **read-only** (Hard-Line: research-scout R-4 + verifier C-3).
  Self-Edit nur via id.bund.de — Wegweiser-Hinweis am Card-Footer.
- Verifikations-Badge „verifiziert via BundID-Magic-Link am DD.MM.YYYY".
- **Card-Footer-Disclaimer** (immer sichtbar):
  > „Nur Behörden, die an BundID angebunden sind, nutzen diese E-Mail-Adresse
  > als Notification-Adresse. Bundesländer-Konten (Service-BW, Mein-Service-
  > konto-Berlin, NRW-Konto u.a.) und Drittbehörden halten ggf. abweichende
  > Adressen."

  Marker `bundid_email_only_for_bundid_attached_behoerden`.

#### 6.4.B Conditional Mehmet-Caveat

Wenn `persona.beschaeftigung?.typ === 'selbstaendig'`:
- Sub-Component `<PersonaSelbststaendigCaveat>` rendert unterhalb des Card-
  Footer-Disclaimers:
  > „Hinweis: ELSTER, Krankenkasse und Berufsgenossenschaft halten ggf.
  > abweichende Kontaktdaten — diese Demo zeigt nur die BundID-Daten."

  Marker `bundid_email_selbststaendig_caveat`. Hard-Line § 11.40.

### 6.5 Card 3 — `<MobilfunkSelfEditCard>`

Layout-Logik:
- Mobilfunk-Wert **read+edit** (einziger Self-Edit in V1.1 — research-scout R-4).
- Wenn nicht vorhanden: CTA „Mobilfunk hinterlegen (Demo)" → Inline-Edit-
  Field; nach Submit: Wert gespeichert mit `verified=false`.
- Wenn vorhanden + nicht verifiziert: CTA „Verifizieren (Mock-OTP)" →
  öffnet `<MobilOtpMockModal>`. Mock-OTP-Code ist `124857` (Demo-Pattern,
  immer akzeptiert). Disclaimer-Banner im Modal: „Kein echter SMS-Versand
  — alle OTP-Codes sind Mock-Daten."
- Card-Footer-Disclaimer:
  > „Mobilfunknummer ist self-attested. Es gibt in Deutschland kein staatliches
  > authoritative-Register für Mobilfunknummern. § 3 BMG enthält Mobilfunknummer
  > nicht."

  Marker `mobil_self_attested_no_authoritative_register`.
- **Hard-Line § 11.37 enforced**: Card zeigt explizit „**Nur** für Notification
  über Postfach-Eingang nutzbar — niemals als Bekanntgabe-Kanal" (verifier H-3).

### 6.6 Card 4 — `<PostanschriftCrossRefCard>`

Layout-Logik:
- **Kein Doppel-Display** der Anschrift. Card zeigt nur einen Hinweis-Block:
  > „Ihre Postanschrift wird in der Sektion „Anschrift" angezeigt.
  > Authoritative Quelle: Melderegister (§ 3 BMG).
  > Korrekturweg: Bürgeramt-Termin / eWA online (§ 17 BMG)."
- Klick auf den Hinweis-Link scrollt zur V1-Sektion „Anschrift" (Section-
  Anchor + `aria-label="Zur Anschrift-Sektion"`).
- Marker am Card-Footer (none — nur Wegweiser).

### 6.7 Notification-Präferenzen-Sektion — Sektions-Layout

Die 7. Sektion ist eine V1-`<StammdatenSektion>` (reuse) mit ID
`notification_praeferenzen`. Sektion-Header `<h2>Notification-Präferenzen
(2027-Vision)</h2>`; default **expanded** (im Gegensatz zu allen anderen
Sektionen — V1.1 Demo-Wow-Träger; Hard-Line § 11.36 enforced).

**Sektions-Inhalt**:
1. `<VisionBanner>` ganz oben (Wortlaut § 2.1; Marker
   `cross_channel_routing_speculative`).
2. 5 `<NotificationPraeferenzPicker>` (eine pro Kategorie); jede Picker-Card
   ist eine `<StammdatenFieldCard>`-Variant.
3. Pro Picker: bei Save-Klick öffnet sich `<SaveConfirmDialog>`; nach
   Bestätigung rendert `<LiveCounter>` inline; bei Familie × Postfach (Hero):
   `<FamilienkasseWechselCascade>` läuft an.

### 6.8 Picker-Card-Logik pro Kategorie

| Kategorie | Default-Wert | Picker-Optionen | Conditional-Locks |
|---|---|---|---|
| `steuer` | `brief` | postfach / email_pilot / sms_pilot / brief | `postfach` zeigt zusätzlich Note „Steuer-Bescheide laufen über ELSTER-Posteingang (§ 122a Abs. 4 AO), nicht BundID-Postfach" |
| `sozial` | `brief` | postfach / email_pilot / sms_pilot / brief | `sms_pilot` öffnet zusätzlich Disclaimer-Tooltip mit Marker `sozialdaten_notification_redaction` (Hard-Line § 11.38) |
| `familie` | `brief` | postfach / email_pilot / sms_pilot / brief | **Hero-Cascade-Trigger** bei Wechsel auf `postfach` |
| `verkehr` | `brief` | postfach / email_pilot / sms_pilot / brief | `postfach` zeigt Note „KFZ-Behörden sind 2026 nicht an BundID-Postfach angebunden — heute weiterhin Postbrief"; Picker bleibt einstellbar (Speculative), aber kein Live-Counter > 0 |
| `sonstige` | `brief` | postfach / email_pilot / sms_pilot / brief | für Mehmet (drittstaatsangehörig + ABH) zeigt zusätzliche Picker-Note „Aufenthalts-Bescheide nach §§ 86, 87 AufenthG kommen weiterhin per Postbrief" mit Marker `abh_brief_hardlock`; Picker für ABH-Aspekt **deaktiviert** in der Sub-Card |

**ABH-Hard-Lock-Behandlung** (Mehmet-Persona): Die Kategorie `sonstige`
rendert für drittstaatsangehörige Personas eine zusätzliche Sub-Picker-
Card „Aufenthalt / ABH" mit Wert `brief` und disabled-State + Tooltip
(siehe § 3.3). Dies ist die **einzige** Picker-Variant in V1.1, die
`disabled` ist (alle anderen sind speculative-aber-toggle-bar).

### 6.9 Live-Counter-Render-Logik

Nach erfolgreichem Save (also nach `<SaveConfirmDialog>`-primary-Bestätigung
und `toggleNotificationPraeferenz()`-API-Response) rendert
`<LiveCounter>` unterhalb des betroffenen Pickers für 7 Sekunden mit
fade-in/fade-out-Animation. Inhalt:

> „Sie sparen voraussichtlich **{briefe_pro_jahr_gespart} Briefe pro Jahr**
> und **{tage_frist_gespart} Tage Bekanntgabe-Frist je Bescheid** (§ 9 OZG-
> Postfach-Fiktion vs. § 41 Abs. 2 VwVfG-Postbrief-Fiktion)."

Wenn `briefe_pro_jahr_gespart === 0` (z. B. Wechsel auf `email_pilot`):
LiveCounter rendert stattdessen:

> „Diese Einstellung erspart Ihnen **keine Briefe** — sie ändert nur die
> Notification-Adresse, nicht den Bekanntgabe-Kanal. Bescheide kommen
> weiterhin per Postbrief (§ 41 Abs. 2 VwVfG)."

`prefers-reduced-motion`-Respect: ohne Animation, dauerhaft sichtbar bis
nächste Änderung.

### 6.10 Familienkasse-Wechsel-Cascade-Component

`<FamilienkasseWechselCascade>` orchestriert die Loom-Cut-Hero-Animation
(siehe § 8 Drehbuch). Trigger: Save-Confirm Klick auf primary für
Kategorie `familie` × Kanal `postfach`.

Component-State-Maschine:
1. `idle` (initial)
2. `counter_visible` (LiveCounter rendert + Toast „Familienkasse Berlin-
   Brandenburg ist `angebunden`")
3. `vorher_frame_visible` (Brief-Visual rendert für 800 ms)
4. `transitioning` (Cross-fade Brief → Postfach für 600 ms)
5. `nachher_frame_visible` (Postfach-Letter-Card rendert; Toast „Folge-
   Bescheid jetzt im Postfach")
6. `done` (Component bleibt eingebettet bis nächste Sektions-Interaktion)

**Side-Effects** im State-Übergang `idle → counter_visible`:
- `simulateFamilienkasseFollowupLetter(personaId)` API-Call.
- Activity-Log-Eintrag `behoerde_zu_buerger` erscheint im Aktivitätsprotokoll.

`prefers-reduced-motion`-Respect: keine Cross-fade; stattdessen sofortiger
Switch auf `nachher_frame_visible` mit screenreader-Announce
„Folge-Bescheid wurde im Postfach abgelegt".

### 6.11 Aktivitätsprotokoll-Richtung-Filter

`<RichtungSwitch>` rendert oberhalb der V1-`<UebermittlungsLogList>` (sowohl
auf Hero-Card-Mini-Liste-Ebene als auch auf Sektions-Mini-Liste-Ebene).
Optionen:

| Wert | Filter |
|---|---|
| `alle` (default) | keine Filter |
| `eingehend` | Kategorie `behoerde_zu_buerger` |
| `ausgehend` | Kategorie `behoerde_zu_behoerde` (V1 Umzug-Cascade) + `speculative_2027` (V1 IBAN-Push) |
| `intern` | Kategorie `app_aktivitaet` |

Hard-Line § 11.40: Bucket bleibt **derselbe**
(`govtech-de:v1:stammdaten:uebermittlungs-log`); nur UI-Filter erweitert.
Kein neuer Bucket.

---

## 7. i18n keys V1.1

> **Übersetzungs-Scope V1.1**: alle neuen Strings × 6 Locales (DE source +
> EN/RU/UK/AR/TR Übersetzung). DE = source-of-truth.

### 7.1 Disclaimer-Strings (verbatim aus § 2 dieser Spec)

| Key | DE-Quelle | Lokalisiert |
|---|---|---|
| `stammdaten.kontakt.foederalismus_card_disclaimer` | § 2.2 verbatim | 6 locales |
| `stammdaten.kontakt.notification.vision_banner` | § 2.1 verbatim | 6 locales |
| `stammdaten.kontakt.notification.save_confirm_body` | § 2.1 Save-Confirm verbatim | 6 locales |
| `stammdaten.kontakt.email.disclaimer_only_for_bundid_attached` | § 6.4 Card-Footer verbatim | 6 locales |
| `stammdaten.kontakt.email.disclaimer_selbststaendig` | § 3.3 + § 6.4.B verbatim | 6 locales |
| `stammdaten.kontakt.mobil.disclaimer_self_attested` | § 6.5 Card-Footer verbatim | 6 locales |
| `stammdaten.kontakt.mobil.hardlock_only_notification` | § 6.5 Hard-Line-Hinweis verbatim | 6 locales |
| `stammdaten.kontakt.postfach.wegweiser_pointer` | § 6.3 Wegweiser-Wortlaut | 6 locales |
| `stammdaten.kontakt.postanschrift.cross_ref_pointer` | § 6.6 Cross-Ref-Wortlaut | 6 locales |
| `stammdaten.kontakt.notification.option.sms_pilot.disclaimer_redaction` | Hard-Line § 11.38 Wortlaut | 6 locales |
| `stammdaten.kontakt.notification.option.abh_hardlock_tooltip` | § 3.3 ABH-Hard-Lock-Wortlaut | 6 locales |
| `stammdaten.kontakt.notification.option.kfz_hint` | § 6.8 verkehr-Note | 6 locales |
| `stammdaten.kontakt.notification.option.steuer_hint_elster` | § 6.8 steuer-Note | 6 locales |
| `stammdaten.kontakt.notification.live_counter.savings` | § 6.9 LiveCounter-Wortlaut | 6 locales |
| `stammdaten.kontakt.notification.live_counter.no_savings` | § 6.9 LiveCounter-no-savings-Wortlaut | 6 locales |

### 7.2 UI-Chrome-Keys

| Key | DE | Lokalisiert |
|---|---|---|
| `stammdaten.sektion.kontakt_postfach.title` | „Kontakt & Postfach" | 6 locales |
| `stammdaten.sektion.notification_praeferenzen.title` | „Notification-Präferenzen (2027-Vision)" | 6 locales |
| `stammdaten.kontakt.card.bundid_postfach.title` | „BundID-Postfach" | 6 locales |
| `stammdaten.kontakt.card.bundid_postfach.status.aktiv` | „Postfach aktiv" | 6 locales |
| `stammdaten.kontakt.card.bundid_postfach.status.inaktiv` | „Postfach nicht aktiviert" | 6 locales |
| `stammdaten.kontakt.card.bundid_postfach.status.teilaktiviert` | „Postfach in Aktivierung" | 6 locales |
| `stammdaten.kontakt.card.email.title` | „Verifizierte E-Mail (BundID)" | 6 locales |
| `stammdaten.kontakt.card.email.verified_label` | „Verifiziert via BundID am {datum}" | 6 locales |
| `stammdaten.kontakt.card.mobil.title` | „Mobilfunk" | 6 locales |
| `stammdaten.kontakt.card.mobil.cta_verify` | „Verifizieren (Mock-OTP)" | 6 locales |
| `stammdaten.kontakt.card.mobil.cta_add` | „Mobilfunk hinterlegen (Demo)" | 6 locales |
| `stammdaten.kontakt.card.postanschrift.title` | „Postanschrift" | 6 locales |
| `stammdaten.kontakt.card.postanschrift.cross_ref_link_label` | „Zur Anschrift-Sektion" | 6 locales |
| `stammdaten.kontakt.notification.kategorie.steuer.label` | „Steuer (Finanzamt / BZSt)" | 6 locales |
| `stammdaten.kontakt.notification.kategorie.sozial.label` | „Sozialleistungen (DRV / GKV / Bürgergeld)" | 6 locales |
| `stammdaten.kontakt.notification.kategorie.familie.label` | „Familie (Familienkasse / Elterngeld)" | 6 locales |
| `stammdaten.kontakt.notification.kategorie.verkehr.label` | „Verkehr (KFZ / Bußgeld / Führerschein)" | 6 locales |
| `stammdaten.kontakt.notification.kategorie.sonstige.label` | „Sonstige (Bürgeramt / Aufenthalt / sonstige)" | 6 locales |
| `stammdaten.kontakt.notification.kanal.postfach.label` | „BundID-Postfach" | 6 locales |
| `stammdaten.kontakt.notification.kanal.email_pilot.label` | „E-Mail-Notification (Pilot)" | 6 locales |
| `stammdaten.kontakt.notification.kanal.sms_pilot.label` | „SMS-Notification (Pilot)" | 6 locales |
| `stammdaten.kontakt.notification.kanal.brief.label` | „Postbrief (Default)" | 6 locales |
| `stammdaten.kontakt.notification.save_confirm.cta_save` | „Demo-Präferenz speichern" | 6 locales |
| `stammdaten.kontakt.notification.save_confirm.cta_cancel` | „Abbrechen" | 6 locales |
| `stammdaten.aktivitaet.kategorie.behoerde_zu_buerger.label` | „Behörde-zu-Bürger:in (Notification / Postfach-Eingang)" | 6 locales |
| `stammdaten.aktivitaet.richtung.alle.label` | „Alle Richtungen" | 6 locales |
| `stammdaten.aktivitaet.richtung.eingehend.label` | „Eingehend (Behörde → Bürger:in)" | 6 locales |
| `stammdaten.aktivitaet.richtung.ausgehend.label` | „Ausgehend (Bürger:in → Behörden)" | 6 locales |
| `stammdaten.aktivitaet.richtung.intern.label` | „Intern (App-Aktivität)" | 6 locales |

### 7.3 Modal- und Toast-Strings

| Key | DE | Lokalisiert |
|---|---|---|
| `stammdaten.kontakt.modal.mobil_otp.title` | „Mobilfunk verifizieren — Mock-OTP" | 6 locales |
| `stammdaten.kontakt.modal.mobil_otp.input_label` | „6-stelliger Mock-OTP-Code" | 6 locales |
| `stammdaten.kontakt.modal.mobil_otp.demo_hint` | „Demo-Pattern: Code 124857 wird akzeptiert. Kein echter SMS-Versand." | 6 locales |
| `stammdaten.kontakt.modal.mobil_otp.cta_verify` | „Verifizieren" | 6 locales |
| `stammdaten.kontakt.modal.save_confirm.title` | „2027-Vision-Daten speichern?" | 6 locales |
| `stammdaten.kontakt.toast.familienkasse_followup` | „Folge-Bescheid jetzt im Postfach (Demo)" | 6 locales |
| `stammdaten.kontakt.toast.familienkasse_angebunden` | „Familienkasse Berlin-Brandenburg ist BundID-angebunden — Präferenz übernommen (Demo)" | 6 locales |

### 7.4 i18n-Localizer-Reminders V1.1 (V1 + V1.5-Lessons)

- **JSON.parse pre-flight** auf jedem der 6 Locale-Files vor PR-Push
  (V1.5-Ship-Lessons-Note „i18n JSON syntax breaks").
- **`§§`-Literale preservieren** (Norm-Zitate in Disclaimer-Strings: § 9 OZG,
  § 41 Abs. 2 VwVfG, § 3 BMG, §§ 86, 87 AufenthG, § 122a Abs. 4 AO).
- **AR-Locale**: DE-Norm-Paragraph-Nummern literal beibehalten; DE-Aktenzeichen-
  Formate LTR (V1.5-Konvention).
- **Klartext-Gesetzes-Erhalt-Rule**: in Disclaimer-Strings bleiben „BundID",
  „Onlinezugangsgesetz", „Bundesmeldegesetz", „Verwaltungsverfahrensgesetz",
  „Aufenthaltsgesetz", „Sozialgesetzbuch Eins/Zehn", „Sozialgesetzbuch
  Erstes/Zehntes Buch", „Abgabenordnung" als Eigennamen erhalten.
- **Datum-Formate**: `24.07.2024` und `24.07.2028` bleiben DE-Format
  (DD.MM.YYYY) in allen Locales.

**Schätzung effektiver i18n-JSON-Leaves V1.1**: ~55 neue Top-Keys × 6 Locales
≈ 330 neue Strings.

---

## 8. Loom-Cut-Drehbuch — Familienkasse-Wechsel-Cascade (V1.1 Wow)

> **Hero-Sequenz V1.1**, Anna-Demo. Kann *nach* dem V1-Loom-Cut (Anna direkt
> nach Umzug-Cascade) als zweiter, eigenständiger 30-Sekunden-Cut geschnitten
> oder als verlängerter Schluss des V1-Cuts angehängt werden. Empfehlung:
> separater 30-s-Cut für eigenes „V1.1-Vision"-Framing.

### 8.1 Pre-roll Setup

- Persona Anna, post-Umzug. BundID-Postfach `aktiv`.
- 1 Familienkasse-Brief (`letter-familienkasse-bewilligung`) im Posteingang —
  nach existing seed-Daten.
- Notification-Präferenzen alle initial `brief`.

### 8.2 Sec-für-Sec-Drehbuch

| Sekunde | Aktion (UI) | Voice-over (DE; optional) | Wow-Effekt |
|---|---|---|---|
| 0–2 | Anna scrollt von der Anschrift-Sektion runter zur 6. Sektion „Kontakt & Postfach" | „Anna hat ihr BundID-Postfach beim Umzug aktiviert — die Bescheid-Folge bleibt aber per Brief." | Sektion expandiert; Föderalismus-Card-Disclaimer sichtbar oben |
| 2–4 | Kamera schwenkt zur 7. Sektion „Notification-Präferenzen (2027-Vision)" | „Hier die 2027-Vision — eine Funktion, die heute in Deutschland nicht existiert." | Vision-Banner full-width sichtbar |
| 4–7 | Anna klickt auf den Picker für Kategorie „Familie" und wechselt von `brief` auf `postfach` | „Anna präferiert ab sofort Postfach für Familienkasse-Bescheide." | Picker-State wechselt; Save-Button rendert |
| 7–9 | Anna klickt „Speichern" | — | `<SaveConfirmDialog>` öffnet mit Doppel-Disclaimer-Wortlaut (§ 2.1) |
| 9–11 | Anna klickt im Save-Confirm-Dialog primary „Demo-Präferenz speichern" | „Save-Confirm bestätigt — wir wechseln in den Cascade-Modus." | Modal schließt; Toast „Familienkasse Berlin-Brandenburg ist `angebunden` — Präferenz übernommen" |
| 11–14 | `<LiveCounter>` rendert unterhalb des Pickers mit Fade-in | „Sie sparen voraussichtlich 8 Briefe pro Jahr — und **vier Tage** Bekanntgabe-Frist je Bescheid." | Counter-Wortlaut mit `<NormZitatSpan>`-Wraps für „§ 9 OZG" und „§ 41 Abs. 2 VwVfG" sichtbar |
| 14–17 | **Vorher-Frame**: rechts neben dem Picker rendert eine Karten-Stapel-Visual; oben der existierende Familienkasse-Brief mit Brief-Symbol + Zustellungs-Datum „08.05.2026 (Postbrief)" | „Vorher: ein Brief, der über Postzustellung kommt — Bekanntgabe-Fiktion am vierten Tag." | Brief-Visual mit Postbrief-Stempel |
| 17–20 | **Cross-fade-Animation**: Brief verblasst; ein Postfach-Icon mit BundID-Logo (generisch) verblasst ein | — | 600 ms Cross-fade; respektiert `prefers-reduced-motion` (siehe § 13) |
| 20–23 | **Nachher-Frame**: ein neuer Letter-Card rendert mit `kanal: 'postfach'` und Aktenzeichen `[MOCK] FK-NACHWEIS-892017/2026-Q3` (Followup-Bescheid für Q3) | „Nachher: derselbe Bescheid, jetzt im Postfach — bekannt gegeben am vierten Tag nach Bereitstellung, § 9 OZG." | Letter-Card mit § 9 OZG-Norm-Pointer + 4-Tage-Bekanntgabe-Fiktion-Hinweis |
| 23–25 | Toast „Folge-Bescheid jetzt im Postfach (Demo)" rendert oben rechts | — | Activity-Log-Eintrag `behoerde_zu_buerger` sichtbar im V1-Aktivitätsprotokoll |
| 25–28 | Anna scrollt zur Aktivitätsprotokoll-Sektion; klickt auf den `<RichtungSwitch>` und wählt „Eingehend" | „Auch das ist neu in V1.1 — die Aktivitätsprotokoll-Sicht filtert jetzt nach Richtung der Übermittlung." | Filter rendert nur die `behoerde_zu_buerger`-Einträge: 1 Familienkasse-Eingang vom 08.05.2026 + 1 neu erzeugter Followup-Eingang |
| 28–30 | Schluss-Frame: Side-by-side-Darstellung Live-Counter (links) + neue Postfach-Nachricht (rechts) | „Eine Aktion. Quantifizierte Zeitersparnis. Sichtbare Konsequenz. Das ist die Wow-Mechanik." | freeze-frame; Watermark `[MOCK]` sichtbar |

**Sekundäre Demo-Pfade** (nicht im Loom-Cut, demonstrierbar):
- Mehmet-Persona zeigt das ABH-Hard-Lock-Tooltip auf der Sub-Picker-Card
  „Aufenthalt / ABH" — Picker disabled, Tooltip sichtbar (§ 3.3).
- Schmidt-Persona zeigt den Mobilfunk-Mock-OTP-Flow (Code `124857`).

### 8.3 Cinematic-Notes für Loom-Cut

- Maus-Pointer-Animationen mit subtilen Schatten (V1-Konvention).
- Toasts unterhalb der Topbar; Auto-dismiss nach 4 s; aria-live="polite".
- Cross-fade über `framer-motion` `<AnimatePresence>` mit `mode="wait"`;
  600 ms Duration; Easing `easeInOut`. Bei `prefers-reduced-motion`:
  duration=0, no fade, screenreader-Announce „Folge-Bescheid wurde im
  Postfach abgelegt" (Hard-Line § 11.36 Cascade-Animation Rules).

---

## 9. Mock-Letter-Bridge V1.1

V1.1 ergänzt einen einzigen neuen Letter im `letters`-Bucket — die Bridge
zwischen Stammdaten-V1.1-Wow und Posteingang-V1-Render.

### 9.1 NEW Letter — `letter-familienkasse-bewilligung-postfach-followup`

In `src/data/letters.json` (additiv):

```json
{
  "id": "letter-familienkasse-bewilligung-postfach-followup",
  "absender_behoerde_id": "familienkasse-berlin-brandenburg",
  "empfaenger_persona_id": "anna",
  "kanal": "postfach",
  "kanal_norm": "§ 9 OZG",
  "aktenzeichen": "[MOCK] FK-NACHWEIS-892017/2026-Q3",
  "datum_eingang": "(seed-time + 1.4s, gesetzt durch simulateFamilienkasseFollowupLetter)",
  "frist_bekanntgabe_norm": "§ 9 Abs. 1 S. 3 OZG (4-Tage-Bekanntgabe-Fiktion)",
  "betreff": {
    "de": "Folgebescheid Kindergeld — Quartalsabrechnung Q3 2026 (Demo-Postfach-Bridge)"
  },
  "body": {
    "de": "Sehr geehrte Frau Petrov, im Anschluss an unseren Bewilligungsbescheid vom 08.05.2026 (Aktenzeichen [MOCK] FK-892017) erhalten Sie hier den Folgebescheid für das dritte Quartal 2026. Nach § 9 OZG erfolgt die Bekanntgabe durch Bereitstellung in Ihrem BundID-Postfach. Der Bescheid gilt am vierten Tag nach der Bereitstellung als bekannt gegeben. (Demo-Hinweis: Diese Nachricht wurde durch Ihre Notification-Präferenz-Wechsel automatisch als Postfach-Eingang generiert.)"
  },
  "ai_summary": {
    "de": "Quartalsabrechnung Q3 2026 für Mia (geb. 02.05.2026); identisch zur Q2-Abrechnung. Keine Aktion erforderlich."
  },
  "required_action": null,
  "frist": null,
  "status": "ungelesen"
}
```

**Hard-Line**: dieser Letter wird **nicht** im seed initial gepflegt;
er wird **nur** zur Laufzeit von `simulateFamilienkasseFollowupLetter()`
hinzugefügt (siehe § 5.1). Im Letter-Schema existiert das Feld `kanal`
bereits in V1; V1.1 ergänzt nur den additiven `kanal: 'postfach'`-Wert
(falls in V1 noch `kanal` nicht existiert: Schema-Erweiterung in
`src/types/letter.ts` mit additivem optional Feld).

### 9.2 Existing Letter Update — `letter-familienkasse-bewilligung`

Der V1-bereits-vorhandene `letter-familienkasse-bewilligung` (siehe `letters.json`
Zeile 118) erhält einen additiven `kanal: 'brief'`-Marker (Vorher-Frame
für die Cascade). **Kein Bruch** an existing V1.5-Posteingang-Logik —
`kanal`-Feld ist optional; Default-Render bleibt „Brief".

---

## 10. Behörden-Erweiterung — `bundid_postfach_anbindung` Pflicht-Feld

Alle existierenden Behörden in `src/data/behoerden.json` erhalten das
neue Pflicht-Feld. Mock-Annahmen (orchestrator-decision D4 + Persona-
Realismus):

| Behörde-ID | Name | `bundid_postfach_anbindung` | Begründung |
|---|---|---|---|
| `buergeramt-berlin-mitte` | Bürgeramt Müllerstraße | `in_pilotierung` | 2026 Berlin-Pilot-Phase laut Senatsverwaltung-Aussagen — Mock-Annahme |
| `buergeramt-berlin-friedrichshain-kreuzberg` | Bürgeramt Schlesische Straße | `in_pilotierung` | gleiche Begründung |
| `finanzamt-koerperschaften-i-berlin` | Finanzamt Körperschaften I Berlin | `nicht_angebunden` | Steuer-Bekanntgabe läuft über ELSTER-Posteingang (§ 122a Abs. 4 AO), nicht BundID |
| `kfz-berlin-labo` | LABO KFZ-Zulassung Berlin | `nicht_angebunden` | KFZ-Behörden 2026 nicht an BundID |
| `aok-nordost` | AOK Nordost | `nicht_angebunden` | GKV-Träger eigene Portale (§ 36a SGB I), kein BundID |
| `beitragsservice-koeln` | ARD ZDF Deutschlandradio Beitragsservice | `nicht_angebunden` | Beitragsservice eigenes Portal, kein BundID |
| `familienkasse-berlin-brandenburg` | Familienkasse BB | `angebunden` | **Hero-Demo-Voraussetzung** (Anna-Wow-Cascade); Familienkasse als BA-Bestandteil ist BundID-Pionier |
| `abh-berlin-lea` | LEA Berlin | `nicht_angebunden` | ABH 2026 nicht an BundID; AufenthG-Bescheide weiterhin postalisch (§ 41 Abs. 2 VwVfG) |
| `bundesdruckerei` | Bundesdruckerei GmbH | `nicht_angebunden` | privatrechtlich, kein hoheitlicher Bekanntgabe-Träger |
| `berliner-sparkasse` | Berliner Sparkasse | `nicht_angebunden` | privat, kein BundID |
| `allianz-hausrat` | Allianz Hausrat | `nicht_angebunden` | privat |
| `vattenfall-strom` | Vattenfall Europe Sales | `nicht_angebunden` | privat |
| `telekom` | Telekom Deutschland | `nicht_angebunden` | privat |
| `standesamt-hamburg-eimsbuettel` | Standesamt Hamburg-Eimsbüttel | `nicht_angebunden` | Standesamt 2026 nicht an BundID-Postfach |
| `standesamt-berlin-mitte` | Standesamt Mitte von Berlin | `nicht_angebunden` | gleiche Begründung |

**Mehmet-Specific** (sekundäre Behörden für Mehmet-Persona; falls in
behoerden.json nicht enthalten, müssen sie ergänzt werden):
- ABH Köln / Landesamt für Migration und Flüchtlinge Köln → `nicht_angebunden`.
- Familienkasse Bayern Süd → `angebunden` (für Schmidt-Persona; analog
  Familienkasse Berlin-Brandenburg).
- Finanzamt Köln-Mitte → `nicht_angebunden`.
- AOK Bayern (für Schmidt) → `nicht_angebunden`.

`behoerden.json`-Erweiterung ist **kein Bruch** an bestehenden Konsumenten,
weil V1-V1.5.1 das Feld nicht lesen.

---

## 11. HARD-LINES V1.1 (non-negotiable)

> Diese Sektion ist orchestrator-decided + verifier-locked + domain-expert-
> locked. frontend-coder, mock-backend-coder und i18n-localizer dürfen hier
> **nicht** umformulieren oder lockern. Hard-Lines ergänzen die V1-Hard-Lines
> § 11.1–§ 11.20; V1-Hard-Lines bleiben unverändert in Kraft.

### § 11.31 Familienkasse-Wechsel-Cascade als V1.1-Wow-Mechanik

V1.1 hat **eine** Hero-Wow-Sequenz: die Familienkasse-Wechsel-Cascade
(Anna-Persona, Kategorie `familie` × Kanal `postfach`). Die Cascade folgt
dem Pattern „eine Aktion → eine konkrete Zeitersparnis-Aussage → eine
sichtbare Konsequenz" (orchestrator-decision D1):

> Anna ändert die Notification-Präferenz von 'Brief' zu 'Postfach' → Live-
> Counter zeigt 'Sie sparen voraussichtlich 8 Briefe pro Jahr und 4 Tage
> Bekanntgabe-Frist je Bescheid' → in der nächsten Demo-Sekunde rendert eine
> Mock-Postfach-Nachricht der Familienkasse, die im Vorher-Frame noch als
> Brief auf dem Tisch lag.

Frontend-coder darf die Cascade weder simplifizieren noch durch eine
andere Wow-Variante ersetzen. Sec-für-Sec-Drehbuch ist § 8 verbatim.
Live-Counter-Wert für Familie × Postfach ist **8 Briefe / 4 Tage**
(seed-Default in `SAVINGS_LOOKUP`).

### § 11.32 § 9 OZG primary norm für BundID-Postfach-Bekanntgabe

§ 9 OZG (idF OZG-Änderungsgesetz, in Kraft 24.07.2024) ist die Hauptnorm
für die elektronische Bekanntgabe per BundID-Postfach. § 41 Abs. 2a VwVfG
bleibt der **Auffang-Tatbestand** (allgemeine Norm für „Abruf über
öffentlich zugängliche Netze"); § 122a Abs. 4 AO bleibt die **Steuer-lex-
specialis** (ELSTER-Posteingang).

UI-Norm-Pointer pro Kontext:
- Postfach-Card → „§ 9 OZG"
- Notification-Präferenzen-Picker × Kategorie `steuer` → „§ 122a Abs. 4 AO"
- Notification-Präferenzen-Picker × Kategorie `sozial` → „§ 36a SGB I i.V.m.
  § 41 Abs. 2a VwVfG"
- Notification-Präferenzen-Picker × Kategorie `familie/sonstige` → „§ 9 OZG"
- LiveCounter (vs. Postbrief) → „§ 41 Abs. 2 VwVfG"
- Postfach-Bekanntgabe-Fiktion → „§ 9 Abs. 1 S. 3 OZG (4-Tage-Bekanntgabe-Fiktion)"

Die Aussage „BundID-Postfach 2026 zum De-facto-Standard-Kanal" wird in der
UI **nicht** gemacht. Stattdessen: Föderalismus-Card-Disclaimer (§ 11.34)
mit Hard-Date 24.07.2028 als 4-Jahres-Anspruchsfrist.

### § 11.33 Einwilligung pro Verwaltungsleistung — niemals Master-Toggle

§ 9 OZG-Einwilligung ist „pro Inanspruchnahme einer Verwaltungsleistung"
(§ 9 Abs. 1 S. 2 OZG: Opt-Out im Antrag möglich; verifier C-2 + domain-expert
H-2). V1.1 darf **niemals** einen Master-Toggle „Ich willige ein, alle
Behörden dürfen mir digital bekanntgeben" anbieten. UI-Texte explizit:

> „Die elektronische Bekanntgabe wird im jeweiligen Online-Antrag jeder
> Behörde aktiviert (§ 9 Abs. 1 S. 2 OZG: Opt-Out im Antrag möglich).
> Diese App ist nicht-hoheitlich und kann keine § 9-OZG-Einwilligung
> einsammeln."

Postfach-Card hat **keinen** Aktivierungs-Toggle (nur Wegweiser-Pointer
auf id.bund.de). Notification-Präferenzen sind explizit **Demo-Speculative**,
keine echte Einwilligungs-Mechanik.

### § 11.34 Föderalismus-Card-Disclaimer prominent — niemals Footer-Footnote

Der Föderalismus-Disclaimer (§ 2.2) rendert **auf Sektions-Ebene** als
prominentes Card-Banner zwischen Sektion-Header und 4 Cards. Wortlaut
verbatim aus § 2.2 (orchestrator-decision D3). i18n-Schlüssel
`stammdaten.kontakt.foederalismus_card_disclaimer`. Alle 5+ Länder-Konten
namentlich genannt: Service-BW, Mein-Servicekonto-Berlin, NRW-Konto,
BayernID, HH-Servicekonto. Hard-Date `24.07.2028` mit Erläuterung
„4-Jahres-Anspruchsfrist nach OZG-Verkündung 24.07.2024" — **keine**
Pflicht-Migrations-Frist behaupten (verifier C-5 + domain-expert C-5).

### § 11.35 Per-Behörde `bundid_postfach_anbindung` Pflicht-Feld

`Behoerde.bundid_postfach_anbindung` ist Pflicht-Feld (orchestrator-decision
D4). UI-Picker und Cards lesen ausschließlich aus diesem Feld:
- `angebunden` → Picker enabled, kein zusätzlicher Disclaimer
- `in_pilotierung` → Picker enabled mit Note „Pilot-Phase"
- `nicht_angebunden` → Picker hard-locked auf `brief` mit Reason-Tooltip

Persona-realistische Werte siehe § 10. Familienkasse Berlin-Brandenburg
ist verbindlich `angebunden` (Hero-Demo-Voraussetzung); LEA Berlin und ABH
Köln verbindlich `nicht_angebunden` (Mehmet-Hard-Lock); Bürgerämter
Berlin verbindlich `in_pilotierung`.

### § 11.36 Vision-Modus mit erneutem Save-Confirm pro Mutation

Die gesamte Sektion „Notification-Präferenzen" trägt:
1. **Sektions-Banner** mit Wortlaut aus § 2.1 (orchestrator-decision D2
   Variante A; Marker `cross_channel_routing_speculative`).
2. **Save-Confirm-Dialog** bei jedem einzelnen Save-Akt (Doppel-Disclaimer
   verbatim aus § 2.1).

Frontend-coder darf den Save-Confirm-Dialog **nicht** als skip-bar
implementieren (kein „nicht mehr zeigen"-Toggle — analog V1 Hard-Line
§ 11.20). `<FamilienkasseWechselCascade>` läuft erst NACH der Save-Confirm-
primary-Bestätigung an, niemals ohne sie.

`<FamilienkasseWechselCascade>` respektiert `prefers-reduced-motion`:
keine Cross-fade; sofortiger State-Wechsel auf `nachher_frame_visible`
mit screenreader-Announce.

### § 11.37 SMS/Push niemals als Bekanntgabe-Kanal

SMS und Push (`sms_pilot`, `email_pilot`-mit-Push-Visualisierung) sind
in V1.1 **nur** als Notification-Hinweis-Kanäle darstellbar (verifier H-3 +
domain-expert C-4). UI-Texte explizit pro `sms_pilot`-Picker-Option:

> „Bescheide werden weiterhin im BundID-Postfach bereitgestellt. Per SMS
> erhalten Sie nur einen Hinweis auf neue Post."

Marker `sms_push_only_notification`. Mobil-Card-Footer trägt zusätzlich
die Hard-Lock-Aussage „Mobilfunknummer ist niemals als Bekanntgabe-Kanal
nutzbar — § 41 Abs. 2a VwVfG / § 9 OZG verlangen Authentifizierung, die
SMS nicht bietet."

`updateBundidEmail` ist **nicht** im UI als CTA verfügbar — E-Mail bleibt
read-only (research-scout R-4 + verifier C-3).

### § 11.38 SGB X §§ 67ff Sozialdaten-Hard-Lock — keine inhaltlichen Sachverhalte in SMS/Push

Wenn der/die Bürger:in in Kategorie `sozial` den Kanal `sms_pilot` wählt,
muss die UI explizit anzeigen (verifier H-7 + domain-expert C-8):

> „Aus Datenschutzgründen (§ 35 SGB I, § 67a SGB X) enthält die SMS keine
> inhaltlichen Angaben — nur einen generischen Hinweis ‚Sie haben Post im
> Postfach'. Bürgergeld-, Krankengeld-, BAföG- oder Jugendhilfe-Bezugs-
> Sachverhalte werden NIEMALS in SMS/Push-Renderings angezeigt."

Marker `sozialdaten_notification_redaction`. In der V1.1-Mock-UI gibt es
**kein** SMS-Render mit Sozialdaten-Inhalt — nicht einmal als Mock-Visual.
Das umfasst: SGB V (GKV/PKV), SGB VI (DRV), SGB XI (Pflege), SGB II/III
(Bürgergeld/Arbeitslosengeld), BKGG (Familienkasse-Kindergeld), BEEG
(Elterngeld), WoGG (Wohngeld), SGB XII (Sozialhilfe), SGB VIII (Jugendhilfe),
BAföG, Unterhaltsvorschuss.

### § 11.39 NormZitatSpan-Lookup extends shipped — kein parallel-map

V1.1 erweitert die geshippte `<NormZitatSpan>`-Lookup-Map in
`src/components/posteingang/normZitatLookup.ts` (orchestrator-decision D5).
**Verboten**: parallel-map in `src/components/stammdaten/kontakt/`.

Neue Norm-Einträge (Pflicht):

| Sichtbarer Text | `aria-label` |
|---|---|
| `§ 9 OZG` | „Paragraph 9 des Onlinezugangsgesetzes" |
| `§ 9 Abs. 1 OZG` | „Paragraph 9 Absatz 1 des Onlinezugangsgesetzes" |
| `§ 9 Abs. 1 S. 2 OZG` | „Paragraph 9 Absatz 1 Satz 2 des Onlinezugangsgesetzes" |
| `§ 9 Abs. 1 S. 3 OZG` | „Paragraph 9 Absatz 1 Satz 3 des Onlinezugangsgesetzes" |
| `§ 2 Abs. 7 OZG` | „Paragraph 2 Absatz 7 des Onlinezugangsgesetzes" |
| `§ 41 Abs. 2 VwVfG` | „Paragraph 41 Absatz 2 des Verwaltungsverfahrensgesetzes" |
| `§ 41 Abs. 2a VwVfG` | „Paragraph 41 Absatz 2a des Verwaltungsverfahrensgesetzes" |
| `§ 36a SGB I` | „Paragraph 36a des Sozialgesetzbuches Eins" |
| `§ 35 SGB I` | „Paragraph 35 des Sozialgesetzbuches Eins" |
| `§ 67a SGB X` | „Paragraph 67a des Sozialgesetzbuches Zehn" |
| `§ 67 SGB X` | „Paragraph 67 des Sozialgesetzbuches Zehn" |
| `§ 122a AO` | „Paragraph 122a der Abgabenordnung" |
| `§ 122a Abs. 4 AO` | „Paragraph 122a Absatz 4 der Abgabenordnung" |
| `Art. 13 DSGVO` | „Artikel 13 der Datenschutz-Grundverordnung" |
| `Art. 14 DSGVO` | „Artikel 14 der Datenschutz-Grundverordnung" |

Plus Regex-Branch-Erweiterung um `VwVfG` Kürzel — current Regex Zeile 107
(siehe `normZitatLookup.ts`) listet SGB-Familie aber NICHT VwVfG. Frontend-
coder erweitert die Regex additiv (kein Bruch an V1.5/V1.5.1-Konsumenten,
weil VwVfG-Norm-Zitate in jenen Specs nicht zentral verbaut wurden).

### § 11.40 Aktivitätsprotokoll-Bucket Richtung-Filter — same Bucket, additive 4. Kategorie

Same Bucket wie V1 (`govtech-de:v1:stammdaten:uebermittlungs-log`).
**Kein neuer Bucket** für `behoerde_zu_buerger`. Stattdessen:
- additiver 4. `kategorie`-Wert in `UebermittlungsLogEntry` (siehe § 4.4),
- additiver Pflicht-Filter „Richtung" in der Aktivitätsprotokoll-UI
  (siehe § 6.11),
- Mehmet-Persona: bei Filter „Eingehend" sichtbar mindestens 1 LEA-Köln-
  Brief-Eintrag mit `kanal: 'brief'`-Marker (ABH-Hard-Lock-Visualisierung).

`getStammdatenAktivitaet({richtung: 'eingehend'})` filtert nach
`kategorie === 'behoerde_zu_buerger'`. `richtung: 'ausgehend'` filtert
nach `kategorie === 'behoerde_zu_behoerde' || kategorie === 'speculative_2027'`.
`richtung: 'intern'` filtert nach `kategorie === 'app_aktivitaet'`.
`richtung: 'alle'` ist Default und filtert nicht.

### § 11.41 Mehmet-Selbstständigen-Disclaimer auf E-Mail-Card

Die Verifizierte-E-Mail-Card rendert für Personas mit
`beschaeftigung?.typ === 'selbstaendig'` einen zusätzlichen Disclaimer-Block
(verifier C-7; Wortlaut § 3.3):

> „Hinweis: ELSTER, Krankenkasse und Berufsgenossenschaft halten ggf.
> abweichende Kontaktdaten — diese Demo zeigt nur die BundID-Daten."

Marker `bundid_email_selbststaendig_caveat`. Conditional-Rendering ist
**Pflicht** für Mehmet-Persona; nicht-selbstständige Personas (Anna,
Schmidt) sehen diesen Disclaimer **nicht**.

---

## 12. Spec drift control vs. V1

V1 (`docs/specs/stammdaten.md`, status: shipped 2026-05-10) bleibt in Kraft
und **immutable**. V1.1 ist eine reine Erweiterung; folgende Konsistenz-
Regeln gelten:

### 12.1 Was V1.1 NICHT ändert an V1

- V1-Sektionen 1–5 (Identität / Anschrift / Familie / Dokumente / Sperren &
  Einstellungen) bleiben wortwörtlich gleich. Keine Umstrukturierung.
- V1-Hard-Lines § 11.1–§ 11.20 bleiben in Kraft. V1.1-Hard-Lines § 11.31–
  § 11.41 sind additiv.
- V1-Disclaimer-1 bis -8 bleiben verbatim. V1.1 ergänzt neue Disclaimer-
  Marker (§ 4.7), ändert keine V1-Wortlaute.
- V1-`getStammdaten`-API-Signature bleibt gleich; das zurückgelieferte
  `Stammdaten`-Read-Model bekommt einen erweiterten `kontakt`-Block
  (V1.1-shape) — V1-Konsumenten brechen nicht, weil sie nur V1-Felder lesen.
- V1-Loom-Cut-Drehbuch (§ 1 in `stammdaten.md`) bleibt in Kraft. V1.1-Loom-
  Cut ist ein **separater 30-Sekunden-Cut** (oder verlängerter Schluss von
  V1; siehe § 8).
- V1-`<NormZitatSpan>`-Lookup-Map-Einträge bleiben unverändert; V1.1 ergänzt
  ~16 neue Einträge (siehe § 11.39).
- V1-Bucket-Layout (§ 5.4 in `stammdaten.md`) bleibt; V1.1 bumpt
  `govtech-de:v1:stammdaten:kontakt` von Schema-Version v1 auf v2 mit
  Migration § 4.1.

### 12.2 Was V1.1 ergänzt

- Neue Sektionen 6 + 7 unter `(app)/stammdaten/page.tsx`.
- Neuer 4. `kategorie`-Wert `behoerde_zu_buerger` im Aktivitätsprotokoll.
- Neue Persona-Schema-Erweiterung (§ 4.1) mit Migrations-Step.
- Neues Behörde-Pflicht-Feld `bundid_postfach_anbindung`.
- Neue API-Methoden (§ 5.1).
- Neuer Letter `letter-familienkasse-bewilligung-postfach-followup` (§ 9.1).
- Neue Disclaimer-Marker (§ 4.7).

### 12.3 V1-Loom-Cut-Sequenz-Reihenfolge

Empfohlene Demo-Reihenfolge für die Loom-Aufnahme:
1. V1 Umzug-Cascade (existing, ~60 s).
2. V1 Stammdaten-Hero (existing, ~45 s) — Aktivitätsprotokoll-Wow nach Umzug.
3. **V1.1 Familienkasse-Wechsel-Cascade (~30 s)** — direkter Anschluss an V1
   Stammdaten-Hero; Anna scrollt aus der V1-Hero-Card runter zu Sektion 7.

---

## 13. a11y bind-points V1.1

V1.1 erbt die V1-a11y-Auflagen (§ 3 Component inventory + § 11.3
„`<NormZitatSpan>`-Wrap" + V1.5-Lessons). V1.1-spezifische Auflagen:

### 13.1 Vision-Banner

- `<VisionBanner>` rendert mit `role="note"` und `aria-label="2027-Vision-
  Banner — Notification-Präferenzen sind Speculative".
- Kontrast: ≥ 4.5:1 für Banner-Text gegen Hintergrund (V1.5.1-Lesson:
  Token-Level-Contrast).
- Banner ist **screenreader-pflicht-gelesen** beim ersten Sektions-Expand.

### 13.2 Save-Confirm-Dialog

- `<SaveConfirmDialog>` rendert als `role="alertdialog"`, `aria-modal="true"`,
  `aria-labelledby` auf Modal-Title, `aria-describedby` auf den Doppel-
  Disclaimer-Body.
- Focus-trap aktiv; ESC schließt mit Cancel-Semantik. Primary-Button
  „Demo-Präferenz speichern" erhält Auto-Focus.
- §-numerische Inhalte im Body-Text werden durch `<NormZitatSpan>`
  umschlossen.

### 13.3 Cascade-Animation respektiert `prefers-reduced-motion`

`<FamilienkasseWechselCascade>`:
- Bei `prefers-reduced-motion: reduce`: keine Cross-fade-Animation;
  sofortiger State-Wechsel auf `nachher_frame_visible`; screenreader-
  Announce „Folge-Bescheid wurde im Postfach abgelegt" via
  `aria-live="polite"`-Region.
- Bei `prefers-reduced-motion: no-preference`: 600 ms Cross-fade;
  screenreader-Announce identisch.

### 13.4 Picker-Card a11y

- `<NotificationPraeferenzPicker>` rendert als base-ui `<RadioGroup>` mit
  `role="radiogroup"`, `aria-labelledby` auf Kategorie-Label.
- Disabled-Picker (ABH-Hard-Lock) trägt `aria-disabled="true"` und
  `aria-describedby` auf den Tooltip-Text (Marker
  `abh_brief_hardlock`).
- Pilot-Phase-Note bei `in_pilotierung`-Behörden: zusätzliche
  `aria-describedby`-Verknüpfung auf den „Pilot-Phase"-Text.

### 13.5 Live-Counter a11y

- `<LiveCounter>` rendert als `<output aria-live="polite">`-Region.
- Bei `prefers-reduced-motion: reduce`: dauerhaft sichtbar, keine Fade-
  Animation.
- §-numerische Inhalte (z. B. „§ 9 OZG") werden durch `<NormZitatSpan>`
  umschlossen.

### 13.6 Föderalismus-Card-Disclaimer a11y

- `<FoederalismusCardDisclaimer>` rendert als `<aside role="note"
  aria-label="Föderalismus-Disclaimer — Länder-Konten-Realität">`.
- Datum `24.07.2028` rendert als `<time datetime="2028-07-24">`.
- Norm-Zitat „§ 9 OZG" durch `<NormZitatSpan>` umschlossen.

### 13.7 RTL-Layout (AR-Locale)

- V1.5.1-Konvention beibehalten: Layout flippt mit `rtl:`-Variants;
  `[MOCK]`-Aktenzeichen-Formate bleiben LTR-DE; Norm-Zitate (§ 9 OZG etc.)
  bleiben Latein-Schrift.

### 13.8 Lighthouse-Targets

- a11y ≥ 95 auf `/stammdaten` (Default-Tab) — kein Regress vs. V1.
- Best-Practices ≥ 90 — kein Regress.
- 0 critical, 0 serious axe-violations × 4 Suites
  (kontakt-cards / notification-praeferenzen / save-confirm-modal /
  familienkasse-cascade).

---

## 14. File inventory V1.1 (build-pipeline-Hand-off)

### 14.1 NEW files

**Frontend (frontend-coder)**:
- `src/components/stammdaten/kontakt/KontaktSektion.tsx`
- `src/components/stammdaten/kontakt/FoederalismusCardDisclaimer.tsx`
- `src/components/stammdaten/kontakt/BundidPostfachCard.tsx`
- `src/components/stammdaten/kontakt/VerifizierteEmailCard.tsx`
- `src/components/stammdaten/kontakt/MobilfunkSelfEditCard.tsx`
- `src/components/stammdaten/kontakt/MobilOtpMockModal.tsx`
- `src/components/stammdaten/kontakt/PostanschriftCrossRefCard.tsx`
- `src/components/stammdaten/kontakt/PersonaSelbststaendigCaveat.tsx`
- `src/components/stammdaten/kontakt/NotificationPraeferenzenSektion.tsx`
- `src/components/stammdaten/kontakt/VisionBanner.tsx`
- `src/components/stammdaten/kontakt/NotificationPraeferenzPicker.tsx`
- `src/components/stammdaten/kontakt/SaveConfirmDialog.tsx`
- `src/components/stammdaten/kontakt/LiveCounter.tsx`
- `src/components/stammdaten/kontakt/FamilienkasseWechselCascade.tsx`
- `src/components/stammdaten/kontakt/RichtungSwitch.tsx`

**Mock-Backend (mock-backend-coder)**:
- `src/types/persona-kontakt.ts` (alle in § 4.2 definierten Typen)
- `src/lib/mock-backend/notification/savings-lookup.ts` (§ 5.5)
- `src/lib/mock-backend/persistence-migrations.ts` (extend if exists; new
  `migrateKontaktV1ToV11`-Funktion)

**Tests (siehe § 15)**:
- `tests/unit/stammdaten-v1-1-kontakt-migration.test.ts`
- `tests/unit/stammdaten-v1-1-toggle-notification.test.ts`
- `tests/unit/stammdaten-v1-1-savings-lookup.test.ts`
- `tests/unit/stammdaten-v1-1-otp-mock.test.ts`
- `tests/unit/stammdaten-v1-1-richtung-filter.test.ts`
- `tests/e2e/v1-1-kontakt-anna-familienkasse-cascade.spec.ts`
- `tests/e2e/v1-1-kontakt-mehmet-abh-hardlock.spec.ts`
- `tests/e2e/v1-1-kontakt-schmidt-mobil-otp.spec.ts`
- `tests/e2e/v1-1-kontakt-foederalismus-disclaimer.spec.ts`
- `tests/a11y/stammdaten-v1-1-kontakt-cards.spec.ts`
- `tests/a11y/stammdaten-v1-1-notification-praeferenzen.spec.ts`
- `tests/a11y/stammdaten-v1-1-save-confirm-modal.spec.ts`
- `tests/a11y/stammdaten-v1-1-cascade-reduced-motion.spec.ts`

### 14.2 EDIT files

- `src/types/persona.ts` — `kontakt`-Feld auf neuen Shape (§ 4.1 full rename;
  Migrations-Step in `persistence-migrations.ts`).
- `src/types/behoerde.ts` — neues Pflicht-Feld `bundid_postfach_anbindung`
  (§ 4.3).
- `src/types/stammdaten.ts` — `UebermittlungsLogEntry.kategorie` um
  4. Wert `behoerde_zu_buerger` erweitern (§ 4.4).
- `src/types/letter.ts` — additives optionales Feld `kanal: 'brief' |
  'postfach' | 'email_pilot'` (§ 9), wenn nicht bereits in V1 vorhanden.
- `src/types/index.ts` — Re-Exports der neuen Persona-Kontakt-Typen.
- `src/types/mock-event.ts` — `StammdatenKontaktEvent`-Varianten ergänzen
  (§ 5.3).
- `src/lib/mock-backend/api.ts` — neue API-Methoden ergänzen (§ 5.1).
- `src/lib/mock-backend/schemas.ts` — Zod-Schemas ergänzen (§ 5.2).
- `src/lib/mock-backend/persistence.ts` — Bucket
  `govtech-de:v1:stammdaten:kontakt` Schema-Version-Bump auf v2 (§ 5.4);
  Migrations-Hook registrieren.
- `src/lib/mock-backend/seed.ts` — Persona-Kontakt-Snapshots § 4.5 +
  Activity-Log-Erweiterung § 4.6.
- `src/data/personas.json` — `kontakt`-Block pro Persona
  ergänzen (§ 4.5; full rename).
- `src/data/behoerden.json` — `bundid_postfach_anbindung` pro Behörde (§ 10).
- `src/data/letters.json` — additives Feld `kanal: 'brief'` auf
  `letter-familienkasse-bewilligung` (§ 9.2).
- `src/components/posteingang/normZitatLookup.ts` — Lookup-Map-Erweiterung
  um ~16 neue Einträge (Hard-Line § 11.39); Regex-Branch-Erweiterung um
  `VwVfG`-Kürzel.
- `src/components/stammdaten/UebermittlungsLogList.tsx` — `richtung`-Prop
  + Render-Variant für `behoerde_zu_buerger`-Kategorie (§ 6.11).
- `src/app/(app)/stammdaten/page.tsx` — Sektionen 6 + 7 einbinden.
- `src/lib/i18n/locales/de.json` (+ 5 weitere Locales: en/ru/uk/ar/tr) —
  alle Keys aus § 7 (~55 Top-Keys × 6 Locales ≈ 330 neue Strings).
- `docs/architecture.md` — V1.1 Kontakt-Schicht-Sektion + Diagramme.

### 14.3 DELETE files

- Keine. (V1 bleibt immutable; V1.1 ist additiv.)

---

## 15. Vitest test-spec extension V1.1

### 15.1 Vitest (Unit)

- **`tests/unit/stammdaten-v1-1-kontakt-migration.test.ts`** (NEU):
  - V1-shape-Persona (`kontakt: { email: 'x', mobil: 'y' }`) wird durch
    `migrateKontaktV1ToV11` korrekt in V1.1-shape überführt:
    - `bundid_email.value === 'x'`, `verified === true`,
      `quelle === 'bundid'`.
    - `bundid_mobil.value === 'y'`, `verified === false`,
      `quelle === 'bundid_self_attested'`.
    - `bundid_postfach === { aktiviert: false, status: 'inaktiv' }`.
    - `notification_praeferenzen === { steuer: 'brief', sozial: 'brief',
      familie: 'brief', verkehr: 'brief', sonstige: 'brief' }`.
  - V1-shape mit `email` undefined: `bundid_email.value === ''`,
    `verified === false`.
  - Idempotenz: `migrateKontaktV1ToV11` bei Re-Run auf bereits-V1.1-shape
    ändert nichts.
  - Schema-Version bumpt von 1 auf 2.

- **`tests/unit/stammdaten-v1-1-toggle-notification.test.ts`** (NEU):
  - `toggleNotificationPraeferenz({ kategorie: 'familie', kanal: 'postfach' })`
    auf Anna-Persona → returnt `{ counter: { briefe_pro_jahr_gespart: 8,
    tage_frist_gespart: 4 } }`.
  - Activity-Log-Eintrag mit Kategorie `speculative_2027` entsteht.
  - `vorher: 'brief'`, `nachher: 'postfach'` korrekt im Event.
  - 5 Kategorien × 4 Kanäle = 20 Permutationen — alle returnen Counter-Werte
    aus `SAVINGS_LOOKUP`.

- **`tests/unit/stammdaten-v1-1-savings-lookup.test.ts`** (NEU):
  - `SAVINGS_LOOKUP.familie.postfach === { briefe_pro_jahr_gespart: 8,
    tage_frist_gespart: 4 }`.
  - `SAVINGS_LOOKUP.verkehr.postfach === { briefe_pro_jahr_gespart: 0,
    tage_frist_gespart: 0 }` (KFZ-Behörden-Realismus).
  - Alle 20 Kombinationen sind definiert (kein `undefined` im Lookup).

- **`tests/unit/stammdaten-v1-1-otp-mock.test.ts`** (NEU):
  - `simulateMobilOtpFlow(personaId, '124857')` → `{ verified: true }`.
  - `simulateMobilOtpFlow(personaId, '000000')` → wirft `OTP_INVALID`.
  - Bei verified=true: Activity-Log Kategorie `app_aktivitaet`.

- **`tests/unit/stammdaten-v1-1-richtung-filter.test.ts`** (NEU):
  - `getStammdatenAktivitaet({richtung: 'eingehend'})` filtert nur
    `kategorie === 'behoerde_zu_buerger'`.
  - `richtung: 'ausgehend'` filtert
    `kategorie === 'behoerde_zu_behoerde' || === 'speculative_2027'`.
  - `richtung: 'intern'` filtert `kategorie === 'app_aktivitaet'`.
  - `richtung: 'alle'` (default) filtert nicht.
  - Persona Mehmet: bei `richtung: 'eingehend'` mindestens 1 LEA-Köln-
    Brief-Eintrag mit `kanal: 'brief'`-Marker (ABH-Hard-Lock-Visualisierung).

### 15.2 Playwright e2e

- **`tests/e2e/v1-1-kontakt-anna-familienkasse-cascade.spec.ts`** (NEU; HERO):
  - Anna-Persona-Login → `/stammdaten` → Sektion 6 expand → 4 Cards
    sichtbar; Föderalismus-Card-Disclaimer prominent oben sichtbar.
  - Sektion 7 expand → Vision-Banner sichtbar.
  - Picker für Kategorie `familie` von `brief` auf `postfach` wechseln →
    Save-Klick → `<SaveConfirmDialog>` öffnet → primary-Klick.
  - `<LiveCounter>` rendert mit Wortlaut „8 Briefe pro Jahr und 4 Tage
    Bekanntgabe-Frist".
  - Toast „Familienkasse Berlin-Brandenburg ist `angebunden`" sichtbar.
  - Vorher-Frame Brief-Visual rendert; Cross-fade zu Nachher-Frame
    Postfach-Letter-Card mit Aktenzeichen `[MOCK] FK-NACHWEIS-892017/2026-Q3`.
  - Activity-Log mit `<RichtungSwitch>` auf „Eingehend" → mindestens 1
    `behoerde_zu_buerger`-Eintrag mit Familienkasse-Absender sichtbar.

- **`tests/e2e/v1-1-kontakt-mehmet-abh-hardlock.spec.ts`** (NEU):
  - Mehmet-Persona-Login → Sektion 6 expand → Verifizierte-E-Mail-Card
    zeigt zusätzlichen Selbstständigen-Disclaimer (`bundid_email_selbststaendig_caveat`).
  - Postfach-Card zeigt Status `inaktiv` mit Wegweiser-Pointer.
  - Sektion 7 expand → Picker-Card „Sonstige" zeigt Sub-Card „Aufenthalt /
    ABH" disabled mit Tooltip `abh_brief_hardlock`.
  - Versuch Picker-Klick auf disabled Sub-Card → keine Mutation (verifier
    via API-Spy).

- **`tests/e2e/v1-1-kontakt-schmidt-mobil-otp.spec.ts`** (NEU):
  - Schmidt-Persona-Login → Sektion 6 expand → Mobilfunk-Card zeigt
    Wert `[MOCK] +49 89 87654321` mit Status „nicht verifiziert".
  - CTA „Verifizieren (Mock-OTP)" → `<MobilOtpMockModal>` öffnet.
  - Eingabe `124857` → primary-Klick → Modal schließt → Card zeigt
    Status „verifiziert".
  - Eingabe `000000` (negativer Pfad) → Toast „OTP ungültig"; Modal bleibt
    offen.

- **`tests/e2e/v1-1-kontakt-foederalismus-disclaimer.spec.ts`** (NEU):
  - Anna-Persona → Sektion 6 expand → `<FoederalismusCardDisclaimer>`
    sichtbar mit Wortlaut aus § 2.2; alle 5 Länder-Konten namentlich
    sichtbar; Datum 24.07.2028 sichtbar.
  - Disclaimer-Card ist im Layout **zwischen** Sektion-Header und 4 Cards
    positioniert (NICHT footer; Hard-Line § 11.34).

### 15.3 a11y (`@axe-core/playwright`)

- **`tests/a11y/stammdaten-v1-1-kontakt-cards.spec.ts`** (NEU):
  - axe-clean × 2 Viewports auf `/stammdaten` mit expandierter Sektion 6.
  - 0 critical, 0 serious violations.

- **`tests/a11y/stammdaten-v1-1-notification-praeferenzen.spec.ts`** (NEU):
  - axe-clean × 2 Viewports auf `/stammdaten` mit expandierter Sektion 7.
  - Vision-Banner ist screenreader-pflicht-gelesen via `role="note"` +
    `aria-label`.
  - Picker-RadioGroup hat korrekten `aria-labelledby`.
  - Disabled Mehmet-Sub-Picker hat `aria-disabled="true"` + `aria-describedby`.

- **`tests/a11y/stammdaten-v1-1-save-confirm-modal.spec.ts`** (NEU):
  - `<SaveConfirmDialog>`: focus-trap; ESC schließt mit Cancel-Semantik.
  - `aria-modal="true"`, `aria-labelledby`, `aria-describedby` korrekt.
  - Tab-Reihenfolge primary → tertiary → close-button → cycle.

- **`tests/a11y/stammdaten-v1-1-cascade-reduced-motion.spec.ts`** (NEU):
  - `<FamilienkasseWechselCascade>`: bei Browser mit
    `prefers-reduced-motion: reduce` keine Cross-fade-Animation.
  - Sofortiger State-Wechsel auf `nachher_frame_visible` beobachtbar.
  - Screenreader-Announce „Folge-Bescheid wurde im Postfach abgelegt"
    via `aria-live="polite"`-Region.

### 15.4 Lighthouse

- a11y ≥ 95 auf `/stammdaten` (Default-Tab; Sektionen 6 + 7 expanded).
- Best-Practices ≥ 90 — kein Regress.

### 15.5 Manuelle V1.1-Hero-Demo-Check

- [ ] Loom-Cut-Drehbuch § 8 (Anna, Familienkasse-Wechsel-Cascade)
      durchläuft fehlerfrei in 30 s.
- [ ] LiveCounter zeigt korrekt „8 Briefe pro Jahr und 4 Tage" für
      Familie × Postfach.
- [ ] Vorher/Nachher-Frame-Cross-fade rendert; respektiert
      `prefers-reduced-motion`.
- [ ] Mehmet-Persona zeigt ABH-Hard-Lock + Selbstständigen-Disclaimer.
- [ ] Schmidt-Persona zeigt Mock-OTP-Flow für Mobilfunk.
- [ ] Föderalismus-Card-Disclaimer prominent auf Sektions-Ebene
      (nicht footer).
- [ ] `<RichtungSwitch>` filtert Aktivitätsprotokoll korrekt × 4 Werte.
- [ ] Persona-Schema-Migration läuft fehlerfrei beim ersten Boot
      (DevTools-Audit: V1-shape → V1.1-shape).

### 15.6 Acceptance criteria (code-reviewer Final-Gate)

- [ ] `npx tsc --noEmit` 0 errors (incl. Persona-Schema-Migration).
- [ ] `next lint` 0 warnings/errors.
- [ ] `vitest run` alle Tests grün, inkl. der 5 neuen V1.1-Suites aus § 15.1.
- [ ] `npx playwright test tests/e2e/v1-1-kontakt-*.spec.ts` 4/4 grün.
- [ ] `npx playwright test tests/a11y/stammdaten-v1-1-*.spec.ts` 0 critical,
      0 serious axe-violations × 4 Suites.
- [ ] Lighthouse a11y ≥ 95 auf `/stammdaten` (mit Sektionen 6 + 7 expanded).
- [ ] Hard-Lines § 11.31–§ 11.41 erfüllt (siehe pro Hard-Line zugeordnete
      Tests).
- [ ] i18n-localizer hat 6/6 Locale-Files JSON.parse-validiert.
- [ ] Alle 5+ Länder-Konten in Föderalismus-Card-Disclaimer namentlich
      sichtbar (lint-test gegen `de.json`-Wert; gleicher Test in EN/RU/UK/AR/TR).
- [ ] Persona-Schema-Migration ist idempotent (Re-Run-Test).
- [ ] `bundid_postfach_anbindung` Pflicht-Feld in allen Behörden gesetzt
      (Zod-Validation am `behoerden.json`-Boot).
- [ ] mock-backend-coder hat `getKontakt`, `getNotificationPraeferenzen`,
      `getBehoerdeAnbindung`, `toggleNotificationPraeferenz`,
      `simulatePostfachAktivierung`, `simulateMobilOtpFlow`,
      `simulateFamilienkasseFollowupLetter` implementiert mit Latenz +
      Events.
- [ ] frontend-coder hat alle 15 neuen Komponenten implementiert.

### 15.7 Followup-Items (V1.2 oder hinaus)

- [ ] `Reply.receipt_text` hard-remove (carry-over aus V1.5/V1.5.1) — nicht
      V1.1-Block.
- [ ] e2e-extension assert post-versand multi-reply + dual-template sticky
      (carry-over aus V1.5.1).
- [ ] extract duplicated `wrapNormZitate` helper (carry-over aus V1.5.1).
- [ ] remove dead `crossSendStage === 'done'` transition (carry-over aus
      V1.5.1).
- [ ] `bundid_postfach_anbindung` als dynamic Mock-Toggle in DevTools-
      Sidebar (V1.2-Verbesserung; ermöglicht Demo-Steuerung „was wäre
      wenn LEA Berlin angebunden wäre").

---

## Build log — mock-backend-coder

- date: 2026-05-10
- spec § coverage: § 4.1, § 4.2, § 4.3, § 4.4, § 4.5, § 4.6, § 4.7, § 5.1
  (alle 7 API-Methoden), § 5.2 (Zod-Schemas), § 5.3 (Events), § 5.4 (Bucket-
  Bump V1 → V1.2), § 5.5 (SAVINGS_LOOKUP), § 9.1 + § 9.2 (Letter-Bridge mit
  `kanal`-Feld), § 10 (alle 35 Behörden mit `bundid_postfach_anbindung`),
  Hard-Lines § 11.31–§ 11.41.
- types added/changed:
  - NEW `src/types/persona-kontakt.ts` (`BundIdEmail`, `BundIdMobil`,
    `BundIdPostfach`, `BundidPostfachAnbindung`, `NotificationKanal`,
    `NotificationPraeferenzen`, `VorgangsKategorie`, `PersonaKontakt`,
    `KontaktState` alias, `FamilienkasseCascade`,
    `ToggleNotificationPraeferenzResult`, `MOCK_OTP_DEMO_CODE` const).
  - EDIT `src/types/persona.ts` — `kontakt?: PersonaKontakt` (full rename
    aus V1 `{email?, mobil?}`).
  - EDIT `src/types/behoerde.ts` — Pflicht-Feld
    `bundid_postfach_anbindung: BundidPostfachAnbindung` (§ 4.3).
  - EDIT `src/types/stammdaten.ts` — `UebermittlungsLogEntry.kategorie`
    additiv um `'behoerde_zu_buerger'` (§ 4.4).
  - EDIT `src/types/letter.ts` — additives optionales
    `kanal?: 'brief' | 'postfach' | 'email_pilot'` (§ 9).
  - EDIT `src/types/mock-event.ts` — 5 `StammdatenKontaktEvent`-Varianten
    (notification-praeferenz-changed, postfach-activation-simulated,
    bundid-mobil-otp-verified/failed, familienkasse-followup-letter-simulated).
  - EDIT `src/types/index.ts` — Re-Exports der V1.2-Persona-Kontakt-Types.
- api methods added (Spec § 5.1, alle verbatim):
  - `getKontakt(personaId): Promise<PersonaKontakt>`
  - `getNotificationPraeferenzen(personaId): Promise<NotificationPraeferenzen>`
  - `getBehoerdeAnbindung(behoerdeId): Promise<BundidPostfachAnbindung>`
  - `toggleNotificationPraeferenz(personaId, kategorie, kanal): Promise<ToggleNotificationPraeferenzResult>`
  - `simulatePostfachAktivierung(personaId): Promise<{ aktiviert_am: string }>`
  - `simulateMobilOtpFlow(personaId, { code }): Promise<{ verified: boolean }>`
  - `simulateFamilienkasseFollowupLetter(personaId): Promise<Letter>`
  - Delegate-Pattern (V1 + V1.1 + V1.2): Implementation in
    `src/lib/mock-backend/stammdaten/v1-2-api.ts`; `api.ts` re-exportiert.
- autopilot orchestrators: keine (V1.2 ist kein Vertical — Hero-Cascade
  läuft als 2-Phasen-Sequenz `toggleNotificationPraeferenz` →
  `simulateFamilienkasseFollowupLetter` ohne dedizierte Autopilot-Datei).
- migrations:
  - NEW `migrateKontaktV1ToV11` in `persistence-migrations.ts` —
    idempotent V1 → V1.2 Persona-Block-Rename; lossless. Persona-spezifische
    Snapshots (Anna postfach=aktiv; Schmidt postfach=teilaktiviert; Mehmet
    postfach=inaktiv) gemäß § 4.5 hardcoded.
  - NEW `migrateBehoerdenAnbindungDefault` — additive `bundid_postfach_anbindung`
    auf jedem Behörden-Eintrag im localStorage-Bucket (Default
    `nicht_angebunden`; Whitelist Familienkasse=angebunden / Berliner
    Bürgerämter=in_pilotierung / DRV=angebunden / BZSt=angebunden).
- Bucket-Bump: NEW `stammdaten:notification-praeferenzen` (V1.2-Schema-v2);
  V1 `stammdaten:kontakt` bleibt für `sprachpraeferenz` erhalten (additive,
  kein Bruch).
- seed records added:
  - 3 Personas × V1.2-`kontakt`-Block in `personas.json` (Anna, Schmidt, Mehmet).
  - 35 Behörden × Pflicht-Feld `bundid_postfach_anbindung` in `behoerden.json`.
  - 1 Letter `letter-familienkasse-bewilligung` mit additivem `kanal: 'brief'`
    (Vorher-Frame-Anker).
  - 4 V1.2-`behoerde_zu_buerger`-Activity-Log-Einträge in seed-log-entries.ts
    (Anna×1 Familienkasse, Schmidt×2 Standesamt + Familienkasse, Mehmet×1
    ABH-Köln-Brief).
- runtime artefacts (durch API-Aufruf erzeugt, nicht initial-geseedt):
  - `letter-familienkasse-bewilligung-postfach-followup` (Hero-Cascade-
    Bridge, `kanal: 'postfach'`).
- typecheck: pass (`npx tsc --noEmit` → 0 errors).
- vitest: 442/442 pass (357 baseline + 85 neue V1.2-Tests across 5 Suites:
  kontakt-migration, toggle-notification, savings-lookup, otp-mock,
  richtung-filter).
- lint: 0 NEW warnings (1 pre-existing `read` unused-import in
  `stammdaten/api.ts` unchanged; nicht V1.2-Verantwortung).
- known gaps:
  - Frontend-Stub `NotificationPraeferenzenSektion.tsx` hat einen
    `handleSelect`-Compile-Error (frontend-territory, nicht V1.2-mock-backend
    -Verantwortung — wird beim frontend-coder-Pass gefixt).
  - V1-Read-Model `Stammdaten.kontakt.email/mobil` mappt jetzt auf
    `persona.kontakt.bundid_email.value` / `.bundid_mobil.value` (V1-UI-
    Konsumenten lesen V1.2-Werte transparent). Self-Edit-Bucket
    `stammdaten:kontakt` bleibt für `sprachpraeferenz` aktiv.
- frontend unblock signal: alle 7 V1.2-API-Methoden sind über
  `import { api } from '@/lib/mock-backend'` aufrufbar; alle V1.2-Types
  über `import { PersonaKontakt, NotificationKanal, … } from '@/types'`;
  `MOCK_OTP_DEMO_CODE = '124857'` als Const-Export.

## 16. Sources V1.1

(Additiv zu Stammdaten V1, V1.5.1.)

- **Research-Scout**: `docs/research/2026-05-10-kontakt-schicht.md`
  (status: revise-needed → orchestrator-locked).
- **Domain-Lock**: `docs/domain/kontakt-schicht.md` (last_validated
  2026-05-10; verdict REVISE-RESEARCH; Hard-Lines H-1 bis H-10 verbindlich).
- **Verifier-Verdict**: orchestrator-decided 2026-05-10 (D1–D5; Verifier
  REVISE → 5 P0/P1 concerns durch Orchestrator-Decisions resolved).
- **§ 9 OZG (idF OZG-Änderungsgesetz)**: gesetze-im-internet.de/ozg/__9.html
- **§ 2 Abs. 7 OZG (Postfach-Definition)**: gesetze-im-internet.de/ozg/__2.html
- **§ 41 Abs. 2 + 2a VwVfG**: gesetze-im-internet.de/vwvfg/__41.html
- **§ 122a Abs. 4 AO**: gesetze-im-internet.de/ao_1977/__122a.html
- **§ 36a SGB I**: gesetze-im-internet.de/sgb_1/__36a.html
- **§ 35 SGB I (Sozialgeheimnis)**: gesetze-im-internet.de/sgb_1/__35.html
- **§ 67 + § 67a SGB X**: gesetze-im-internet.de/sgb_10/__67.html,
  gesetze-im-internet.de/sgb_10/__67a.html
- **§ 86 + § 87 AufenthG**: gesetze-im-internet.de/aufenthg_2004/__86.html,
  gesetze-im-internet.de/aufenthg_2004/__87.html
- **§ 3 Abs. 1 Nr. 7 BMG**: gesetze-im-internet.de/bmg/__3.html
- **Art. 13/14 DSGVO**: dsgvo-gesetz.de
- **OZG-Änderungsgesetz Bundesratsbeschluss 14.06.2024**:
  bundesrat.de/SharedDocs/pm/2024/020.html
- **DE-Mail-Auslauf 31.08.2024**: heise.de/news/Bundesregierung-kuendigt-
  Ende-von-De-Mail-in-der-Verwaltung-an-9180138.html
- **DE-Mail-Vollabschaltung 31.12.2026**: techbook.de/mobile-lifestyle/
  de-mail-ende
- **EUDI Implementing Regulation (EU) 2024/2980**: entrust.com/resources/
  learn/eidas-implementing-acts (Notifications zwischen Mitgliedstaaten,
  nicht Behörde→Bürger)
- **EUDI PID Rulebook v1.x**: eu-digital-identity-wallet.github.io/eudi-doc-
  architecture-and-reference-framework/1.4.0/annexes/annex-3/
  annex-3.01-pid-rulebook/
- **BundID FAQ + Vertrauensniveau**: id.bund.de/de/faq;
  arbeitsagentur.de/en/bundid
- **bidirektionale BundID-Postfach-Roadmap 2026**: ad-hoc-news.de/boerse/
  news/ueberblick/bundid-wird-2026-zum-pflichtwerkzeug-fuer-buerger/68444056
- **GOV.UK Notify (Vergleichs-Pattern)**: notifications.service.gov.uk/features
- **Estland eesti.ee-Adresse + Mobile-ID**: id.ee/en/article/eesti-ee-e-mail-
  address/, id.ee/en/article/state-portal-eesti-ee/
- **Niederlande MijnOverheid + Berichtenbox**: play.google.com/store/apps/
  details?id=nl.rijksoverheid.mbb.pub
- **Italien IO-App**: facil.guide/en/guide/use-io-app/
- **V1-Spec-Anker**: `docs/specs/stammdaten.md` (shipped 2026-05-10).
- **V1-Persona-Schema**: `src/types/persona.ts` (V1-`kontakt`-shape vor
  Migration).
- **V1.5-Ship-Lessons-Memory**: i18n JSON syntax breaks, list-false-PASS,
  base-ui focus-guard bug, token-level contrast, downstream-consumer-tracing —
  bei jedem V1.1-PR-Push pre-flight checken.

---

> **End of Stammdaten V1.1 Kontakt-Schicht spec.** Bei domain-expert-späterer
> Re-Lock oder verifier-Re-Audit: dieses Dokument bleibt status `spec` solange
> `building` nicht angefangen hat. Ab erstem Coder-Commit → status:
> `building`. Nach Ship → status: `shipped`, immutable.
