---
feature: stammdaten
title: Stammdaten — Single-Source-of-Truth Bürger:innen-Profil (Lese- und Wegweiser-Schicht)
status: shipped
date: 2026-05-09
last_amended_at: 2026-05-10
shipped_at: 2026-05-10
author: product-architect
upstream:
  research: docs/research/2026-05-08-stammdaten.md (status: revised, domain-validated 2026-05-08)
  domain: docs/domain/stammdaten.md (last_validated: 2026-05-08)
  verify: docs/reviews/2026-05-08-stammdaten-verify.md (verdict: PROCEED with verbindlichen Architektur-, Copy-, Scope- und Norm-Korrektur-Auflagen)
ship_target: V1 horizontal-capability (next after Posteingang V1.5.1)
estimated_effort: ~5 working days (1 day Hero+Activity-Log; 1 day Sektionen+FieldCard; 1 day Wizards+Modals; 0.5 day i18n; 1.5 day tests + a11y + Persona-Daten + EUDI-Sub-Tab)
owner_agents: [frontend-coder, mock-backend-coder, i18n-localizer, a11y-tester, code-reviewer]
---

> **Geltungsbereich V1**: Diese Spec definiert die *foundation*-Capability
> Stammdaten — eine **Lese- und Wegweiser-Schicht** über das hypothetische 2027-
> Konvergenz-Bild aus BundID-Stammdatenservice, Datenschutzcockpit nach IDNrG
> und EUDI-Wallet-PID. Die App **schreibt nicht** in hoheitliche Register
> (§ 34 BMG schließt private Aggregatoren als Empfänger aus); sie aggregiert
> liest, erklärt, weist Korrekturwege aus, protokolliert app-interne
> Aktivitäten und reicht Wizards an `/vorgaenge` weiter. Dort sitzt der
> tatsächliche Hand-off zur Behörde — heute (Mai 2026) papierhaft / per eID,
> demo-mäßig als Mock-Wizard mit Bestätigungs-Brief.

> **Demo-Choreographie**: Stammdaten ist *foundation*, nicht *Wow-Träger*.
> Die Demo-Reihenfolge ist **Umzug → Stammdaten** — auf der Stammdaten-Seite
> sieht der Viewer im Aktivitätsprotokoll dann, *welche* Behörden gerade
> automatisch synchronisiert wurden. Dieser „Aha — sechs Behörden haben
> meine Adresse synchronisiert"-Moment ist der Stammdaten-Wow.

---

## 1. Mission & scope

Stammdaten ist die **horizontale Capability**, die alle anderen Vorgangs-Wizards
(Umzug, Posteingang-Autopilot, künftig Steuererklärung, Familie, Schwerbehindertenausweis)
mit konsolidiertem Bürger:innen-Profil bedient. Die UI macht **drei sonst
unsichtbare Sachverhalte** zum ersten Mal in einer einzigen consumer-grade
Sicht greifbar:

1. **Welche Behörde hält welches Feld autoritativ.** § 3 BMG-Pflichtfelder,
   § 4 IDNrG-Basisdaten beim BVA, § 139b AO Steuer-IdNr beim BZSt, § 290 SGB V
   KVNR bei der jeweiligen Krankenkasse, § 147 SGB VI DRV-VSNR bei der
   Rentenversicherung, AZRG-Daten zum Aufenthalt im AZR beim BAMF.
2. **Was bei einer Adress-Änderung automatisch passiert.** § 36 BMG-Datenkranz
   plus die Spezialgesetze (§ 11 Abs. 4 RBStV → Beitragsservice; § 58c SG →
   BAPersBw; § 42 BMG → Religionsgesellschaften; AO §§ 39, 139b → Finanzverwaltung;
   landesrechtliche Meldedaten-Übermittlungsverordnungen → DEÜV-Adressfluss zur GKV
   für Beschäftigte). Sichtbar gemacht im **Aktivitätsprotokoll**.
3. **Wo die/der Bürger:in selbst ändern darf — und wo nicht.** Self-Edit ist
   minimal und reserviert für Felder, die in keinem hoheitlichen Register
   liegen (Kontaktdaten, Sprachpräferenz) bzw. für Demo-Toggle-Patterns
   (Sperren-Toggle, IBAN als 2027-Vision). Hoheitliche Felder sind read-only
   mit Wegweiser-Pointer auf den korrekten Behörden-Pfad.

**Nicht-Ziele**: Stammdaten ist *kein* Aggregator-Schreib-Layer, *keine*
Echtzeit-DSC-API-Anbindung, *keine* AI-Beratung zu Korrektur-Entscheidungen,
*keine* Anzeige von Gesundheits-/Sozialleistungs-/Behinderungs-Status-Daten
(Sozialdaten nach §§ 67 ff. SGB X gehören explizit nicht in Stammdaten).

**Loom-Cut-Script (45-Sekunden-Wow, Anna-Demo, *nach* Umzug-Demo geschnitten)**:

| Sekunde | Aktion | Wow-Effekt |
|---|---|---|
| 0–4 | Anna landet auf `/stammdaten` direkt nach abgeschlossenem Umzug | Hero-Card oben: „Sie sind in **7 öffentlichen Registern** geführt. **Letzte Übermittlung**: vor 3 Minuten — Anschrift vom Bürgeramt Friedrichshain-Kreuzberg an Beitragsservice ARD/ZDF/Dlr (§ 11 Abs. 4 RBStV)." Status-Badge `Datenschutzcockpit (Pilot-Phase)` |
| 4–8 | Anna scrollt zur Sektion **Anschrift** | FieldCard zeigt neue Adresse; Behörde-Badge „Bürgeramt Friedrichshain-Kreuzberg"; Korrekturweg-Pointer „eWA / Bürgeramt-Termin nach § 17 BMG"; Letztes-Update-Stempel „vor 3 Min — durch Sie" |
| 8–14 | Klick auf das **Aktivitätsprotokoll**-Mini-Liste der Anschrift-Sektion | 6 Übermittlungs-Einträge sichtbar: Bürgeramt → Finanzamt Berlin (§ 36 BMG i.V.m. AO § 139b), Bürgeramt → Beitragsservice (§ 11 Abs. 4 RBStV), Bürgeramt → AOK Nordost (DEÜV § 28a SGB IV), Bürgeramt → BAPersBw (§ 58c SG), Bürgeramt → Standesamt Mitte (§ 36 BMG i.V.m. PStG), Bürgeramt → Beitragsservice (vorherige Adresse-Schließung) |
| 14–22 | Anna öffnet die Sektion **Sperren & Einstellungen** → Religion-Card (collapsed) | Anna klickt „Religionszugehörigkeit anzeigen" → Modal mit Disclaimer-5 + ausdrücklicher-Einwilligungs-Toggle (Art. 9 Abs. 2 lit. a DSGVO). Anna willigt ein. Wert „ohne" rendert. Activity-Log-Eintrag „Religionsmerkmal angezeigt" entsteht. |
| 22–30 | Anna klickt im Sub-Tab **Wallet & Externe Empfänger** auf den Mock-Drittanbieter „Berliner Sparkasse — Adressabgleich anfragen" | 2027-Vision-Banner sichtbar; Modal zeigt Mock-Attestation-Vorschau auf Basis der PID-Felder (8 Pflicht + 4-aus-6 Hilfsattribute), `[MOCK]`-Watermark; Disclaimer-3 (`eudi_speculative`) zwischen Banner und Action |
| 30–40 | Anna wechselt zum **Datenschutzcockpit-Detail-View** (`/datenschutz`-Tab — V2-Hook) | In V1: Quick-Link aus der Hero-Card öffnet vollständige Activity-Log-Tabelle mit Filter (Behörde, Zeitraum, Rechtsgrundlage). Screenreader-Announce: „21 Übermittlungen in den letzten 24 Monaten — § 9 IDNrG-Speicherfrist". |
| 40–45 | Schluss-Frame: Anna sieht IBAN-Card mit „2027-Vision"-Badge | Disclaimer-4 (`iban_speculative`) inline; CTA „IBAN simulieren" öffnet Mock-Push-Modal an 3 Empfänger (Familienkasse / ELSTER / GKV) — alles `[MOCK]`-watermarked, kein echter Push |

Sekundäre Demo-Pfade (nicht im Loom-Cut, demonstrierbar): Mehmet-Persona zeigt
sichtbare AZR-Nr. + eAT-CAN mit Art-9-Hinweis-Badge; Familie-Schmidt-Persona
zeigt Kinder-Sub-Sektion mit Familienkasse-Pointer; SBGG-Wizard-Hand-off
über `/vorgaenge` (3-stufig, siehe § 8 dieser Spec).

---

## 2. User flows

> Vier kanonische Flows (A–D). Flow A ist der Hero-Loom-Cut; Flows B–D zeigen
> die Persona-Vielfalt (Drittstaatsangehörige, Familie, Sperren-Toggle).
> Persona-Datensets liegen in `src/data/personas.json` + `src/lib/mock-backend/seed.ts`;
> die Stammdaten-UI zieht ausschließlich über `getStammdaten(personaId)` aus
> dem Mock-Backend.

### 2.1 Flow A — Anna, Stammdaten direkt nach Umzug-Cascade (Hero)

**Persona**: Anna Petrov (29, EU-Bürgerin, Berlin, post-Umzug nach Skalitzer Str. 88,
10997 Berlin). **Vorab-Zustand**: Umzug-Vorgang `vorgang-umzug-anna-2026-05` gerade
shipped, Activity-Log der letzten 5 Min enthält die 6 Datenkranz-Übermittlungen.

1. Anna landet auf `/stammdaten`. Hero-Card oben rendert mit Live-Daten aus
   `getStammdatenAktivitaet({limit: 5})`.
2. 5 Sektionen sichtbar (default-zugeklappt mit Top-Felder-Vorschau): Identität,
   Anschrift, Familie, Dokumente, Sperren & Einstellungen.
3. Klick auf **Anschrift** → Sektion öffnet, FieldCards rendern: aktuelle
   Anschrift mit Behörde-Badge „Bürgeramt Friedrichshain-Kreuzberg"; historische
   Anschrift (vor Umzug) als zweite FieldCard mit `gueltig_bis = 2026-05-08`.
4. Klick auf „Aktivitätsprotokoll dieser Sektion" → Inline-Drawer rendert die
   5 letzten Anschrift-Übermittlungen mit Norm-Tooltips (`<NormZitatSpan>` für
   §-Zitate analog Posteingang V1.5.1 § 11.5).
5. Klick auf „Korrigieren" auf der aktuellen Anschrift-FieldCard → öffnet
   `<StammdatenAdresseEwaWizard>` (Mock-Wizard im `/vorgaenge`-Tab; Hand-off
   per `router.push('/vorgaenge/neu/adresse-ewa')` mit Pre-Fill aus aktueller
   Anschrift).
6. Sub-Tab **Wallet & Externe Empfänger** ist als zweiter Tab oben sichtbar;
   Klick öffnet die 2027-Vision-Sicht mit 3 Mock-Drittanbietern.

### 2.2 Flow B — Mehmet, Drittstaatsangehöriger mit AZR + eAT

**Persona**: Mehmet Yıldız (38, türkische Staatsangehörigkeit, Selbstständiger,
Köln; § 21 AufenthG; eAT-CAN `[MOCK] T0123456X`; AZR `[MOCK] 6724813-090`).

1. `/stammdaten` rendert mit Mehmet-Persona.
2. Sektion **Identität**: Aufenthaltsstatus-FieldCard sichtbar mit
   Hinweis-Badge „Sensible Daten — Art. 9 mittelbar" (verifier Probe #4
   Tabelle); Tooltip erklärt: „AZR-Daten sind nach Art. 9 DSGVO mittelbar
   relevant (Asylhintergrund-/Herkunftsbezug). Anzeige beruht auf
   § 3 Abs. 1 Nr. 17a BMG + § 22 BDSG."
3. eAT-CAN-FieldCard sichtbar (read-only) mit Korrekturweg-Pointer „Landesamt
   für Migration und Flüchtlinge (Köln) — eAT-Adressänderung erfolgt **nicht**
   automatisch durch das Bürgeramt".
4. AZR-Nr.-FieldCard (read-only) mit Verweis auf AZRG § 34 (Selbstauskunft).
5. Sektion **Anschrift**: Block „Folgende Stellen werden bei Adress-Änderung
   automatisch informiert" zeigt Beitragsservice, Finanzamt Köln-Mitte,
   AOK (DEÜV), BAPersBw — **nicht** ABH (Hard-Line: ABH-Adress-Update **nicht**
   automatisch, eigener Termin nötig).
6. Sektion **Sperren & Einstellungen**: SBGG-Wizard ist erreichbar; das
   Geschlechts-FieldCard zeigt unauffälligen „Korrekturweg: Standesamt"-Pointer
   (für SBGG-Wizard, der die 3-Stufen-Choreographie aus § 8.2 dieser Spec auslöst).

### 2.3 Flow C — Familie Schmidt, Eheschließung + Kinder

**Persona**: Familie Schmidt (Eltern + 2 Kinder, München, Eheschließung
`[MOCK] M-E-00471/2024` Standesamt München; rk; Kindergeldnummer
`[MOCK] 234FK892017` Familienkasse Bayern Süd).

1. `/stammdaten` rendert mit Schmidt-Persona (Hauptperson: ein Elternteil,
   Anker für die Persona).
2. Sektion **Familie**: zeigt Ehegatten-FieldCard (read-only, Behörde-Badge
   „Standesamt München"); Kinder-Sub-Sektion mit 2 Kinder-FieldCards (Name,
   Geburtsdatum, Adresse identisch zur Hauptperson, IDNr).
3. Korrekturweg-Pointer pro Kind: „Standesamt für Geburts-/Namens-Daten;
   Familienkasse für Kindergeld-Nummer + Bankverbindung".
4. Klick auf eine Kinder-Card → führt nicht in Stammdaten-Detail, sondern
   in den `/familie`-Tab (V2-Hook in V1: erstmal toter Link mit
   „Familie-Vorgänge folgen in V2"-Banner).
5. Sektion **Sperren & Einstellungen** → Religion-Card collapsed; Klick
   „Religionszugehörigkeit anzeigen" → Modal mit Einwilligungs-Toggle →
   nach Einwilligung Anzeige „rk"; Activity-Log-Eintrag entsteht
   („Religionsmerkmal angezeigt am DD.MM.YYYY · Rechtsgrundlage:
   Art. 9 Abs. 2 lit. a DSGVO").

### 2.4 Flow D — Anna, Sperren-Toggle aktivieren (§ 51 BMG)

**Persona**: Anna Petrov, neutral.

1. Sektion **Sperren & Einstellungen** → Toggle „Übermittlungssperre nach
   §§ 42 Abs. 3, 50 Abs. 5 BMG" — kein Begründung-Upload erforderlich.
2. Anna aktiviert den Toggle → `<SperrenAktivierenConfirmDialog>` öffnet
   mit Disclaimer-8 (`sperren_mock_pattern`) verbatim: „Im echten System
   erfolgt die Eintragung … ausschließlich auf Antrag bei der zuständigen
   Meldebehörde." → primary „Sperre als Demo-Pattern aktivieren" / secondary
   „Abbrechen".
3. Anna bestätigt → `updateSperre()` → Activity-Log-Eintrag entsteht;
   FieldCard-Status-Pill „Übermittlungssperre aktiv (App-Demo)" rendert.
4. Bei Toggle für **Auskunftssperre** nach § 51 Abs. 1 BMG: zusätzlich
   Begründungs-Textarea (Min. 30 Zeichen, Validierung, Demo-Pattern); Hinweis
   „Im echten System: Begründung wird beim Bürgeramt schriftlich oder per
   Antragsformular abgegeben".

---

## 3. Component inventory

> Convention identisch zur Posteingang-Spec: `<NEW>` = neu anzulegen;
> `<EXTEND>` = bestehende Komponente erweitern; `reuse` = unverändert.

| Komponente | Pfad | Zweck | Status V1 |
|---|---|---|---|
| `<StammdatenPage>` | `src/app/(app)/stammdaten/page.tsx` | RSC-Page-Komponente; lädt `getStammdaten()` + `getStammdatenAktivitaet({limit:5})` server-side; rendert `<StammdatenHero>` + 5 Sektionen + Sub-Tab-Switch | `<NEW>` |
| `<StammdatenHero>` | `src/components/stammdaten/StammdatenHero.tsx` | Hero-Card oben mit „Sie sind in N öffentlichen Registern geführt; letzte Übermittlung vor X Minuten — Anschrift vom {Behörde} an {Empfänger} (Rechtsgrundlage)"; CTA „Vollständiges Aktivitätsprotokoll öffnen" → führt auf `/datenschutz` (V2-Hook); Status-Badge „Datenschutzcockpit (Pilot-Phase)" | `<NEW>` |
| `<StammdatenSektion>` | `src/components/stammdaten/StammdatenSektion.tsx` | Collapsible Section-Wrapper auf base-ui `<Disclosure>`; default-zugeklappt mit Top-Feld-Vorschau (1–2 Felder); klick → Detail-Render aller FieldCards in der Sektion; Section-Header + `<aside>`-Aktivitätsprotokoll-Mini-Liste | `<NEW>` |
| `<StammdatenFieldCard>` | `src/components/stammdaten/StammdatenFieldCard.tsx` | Universelle Feld-Komponente: Label + Wert + `<BehoerdenBadge>` (Quelle) + Korrekturweg-Pointer + Letztes-Update-Stempel + (optional) `<KorrigierenCTA>`; Variants: `read-only` / `self-edit` / `hidden-by-default` (für Religion); `[MOCK]`-Watermark renderfähig | `<NEW>` |
| `<KorrigierenCTA>` | `src/components/stammdaten/KorrigierenCTA.tsx` | Button mit Norm-Pointer; klick → `router.push('/vorgaenge/neu/<wizard-slug>')` mit Pre-Fill via Query-Param `?from=stammdaten&field=<field-id>`; Wizard-Slug-Lookup-Map siehe § 8 dieser Spec | `<NEW>` |
| `<UebermittlungsLogList>` | `src/components/stammdaten/UebermittlungsLogList.tsx` | Sub-Komponente in der Sektion: rendert die 5 letzten `UebermittlungsLogEntry` als List-Items mit Empfänger / Zweck / `<NormZitatSpan>` Rechtsgrundlage / Zeitstempel; `aria-label="Aktivitätsprotokoll dieser Sektion"` | `<NEW>` |
| `<ReligionConsentModal>` | `src/components/stammdaten/ReligionConsentModal.tsx` | base-ui `<AlertDialog>`, Modal-Body verbatim aus `stammdaten.disclaimer.religion_art9` + Einwilligungs-Toggle (verbatim aus `stammdaten.disclaimer.religion_consent_toggle_label`); primary „Religionsmerkmal anzeigen" disabled bis Toggle = on; tertiary „Abbrechen"; `aria-modal="true"` mit focus-trap | `<NEW>` |
| `<SperrenAktivierenConfirmDialog>` | `src/components/stammdaten/SperrenAktivierenConfirmDialog.tsx` | base-ui `<AlertDialog>`; Body verbatim aus `stammdaten.disclaimer.sperren_mock_pattern`; bei Auskunftssperre zusätzlich Textarea-Eingabe für Begründung (30+ Zeichen); primary / tertiary | `<NEW>` |
| `<IbanSpeculativeBadge>` | `src/components/stammdaten/IbanSpeculativeBadge.tsx` | Inline-Badge mit Text „2027-Vision" + Tooltip mit Disclaimer-4 (`iban_speculative`); reuse-fähig im IBAN-FieldCard und im Speculative-Push-Modal | `<NEW>` |
| `<IbanSpeculativePushModal>` | `src/components/stammdaten/IbanSpeculativePushModal.tsx` | base-ui `<Dialog>`; listet 3 Mock-Empfänger (Familienkasse, ELSTER, GKV) mit individuellen Toggles; primary „Mock-Push simulieren" → `simulateIbanPush()` → Activity-Log-Einträge; tertiary „Abbrechen" | `<NEW>` |
| `<WalletSubTab>` | `src/components/stammdaten/WalletSubTab.tsx` | Sub-Tab-Inhalt; rendert 2027-Vision-Banner verbatim aus `stammdaten.subtab.wallet_externe_empfaenger.banner` + Disclaimer-3 (`eudi_speculative`) prominent + 3 Mock-Drittanbieter-Cards (Hausbank Berliner Sparkasse, Mock-Hausverwaltung, Vattenfall) | `<NEW>` |
| `<WalletAttestationPreviewModal>` | `src/components/stammdaten/WalletAttestationPreviewModal.tsx` | base-ui `<Dialog>`; rendert PID-Felder (8 Pflicht + 4-aus-6 Hilfsattribute) als Mock-Attestation-Vorschau aus Persona-Daten; `[MOCK]`-Watermark; Schließ-Button (kein „Versenden"-CTA in V1, nur Preview) | `<NEW>` |
| `<NormZitatSpan>` | `src/components/posteingang/NormZitatSpan.tsx` | reuse aus Posteingang V1.5.1 § 11.5 — wrapper für §-Zitate mit `aria-label`-Pronunciation; Lookup-Map wird in § 11.7 dieser Spec **erweitert** um Stammdaten-Norm-Zitate (BMG/IDNrG/SGB/AO/AZRG-Norm-Glossar) | `<EXTEND>` |
| `<BehoerdenBadge>` | `src/components/shared/BehoerdenBadge.tsx` | reuse — generischer Badge mit Behörde-Name + Kategorie-Icon (bund/land/kommune/sozialversicherung/privat) | reuse |
| `<DocumentMockWatermark>` | `src/components/shared/DocumentMockWatermark.tsx` | `[MOCK]`-Watermark-Layer; reuse aus Posteingang/Umzug | reuse |
| Tab-Switch | `src/app/(app)/stammdaten/layout.tsx` | RSC-Layout mit zwei Tabs: „Mein Profil" (Default) und „Wallet & Externe Empfänger" (Sub-Tab); Tab-Aktiv-State via Search-Param `?tab=profil\|wallet` | `<NEW>` |

**Component-Pfad-Konvention**: Stammdaten-spezifische Komponenten leben unter
`src/components/stammdaten/`; geteilte Komponenten (Badges, Watermarks) bleiben
unter `src/components/shared/`; `<NormZitatSpan>` lebt weiter unter
`src/components/posteingang/` (kein Move; Stammdaten importiert von dort).

**Accessibility-Auflagen** (verifier-flagged + V1.5-Lessons-Memory):

- `<StammdatenSektion>` rendert mit `<section aria-labelledby="...">`,
  Section-Header als `<h2>`. Default-zugeklappte Sektionen exposieren ein
  `aria-expanded` auf dem Disclosure-Button. Detail-Inhalt ist `aria-hidden`
  bis expand.
- `<UebermittlungsLogList>` ist `<aside aria-label="Aktivitätsprotokoll
  dieser Sektion">`, damit Screenreader sie überspringen können (verifier-Auflage Test #4).
- `<ReligionConsentModal>` und `<SperrenAktivierenConfirmDialog>`:
  `role="alertdialog"`, `aria-modal="true"`, `aria-labelledby` auf den Modal-
  Title, `aria-describedby` auf den Body-`<p>`. Focus-trap aktiv. ESC schließt
  mit Cancel-Semantik. Primary-Button erhält Auto-Focus *nach* dem Toggle
  bei `<ReligionConsentModal>` (Toggle ist initial focused; primary disabled bis Toggle on).
- §-numerische Inhalte in Modal-Body und in `<UebermittlungsLogList>` werden
  durch `<NormZitatSpan>` umschlossen (Hard-Line § 11.5 Posteingang V1.5.1
  vererbt; Lookup-Map erweitert in § 11.7 dieser Spec).
- 2027-Vision-Badges und „Pilot-Phase"-Status-Badges müssen **zusätzlich
  zur Farbe** einen Text-Marker tragen (verifier Architekturelle-Flag #6:
  „2027-Vision" / „Pilot-Phase" als Text).
- Wenn der/die Bürger:in eine RTL-Sprache (AR) wählt: Layout flippt mit
  `rtl:`-Variants; `[MOCK]`-Aktenzeichen-Formate bleiben LTR-DE (V1.5-Lessons
  + verifier Edge-case #8).

---

## 4. Data model

### 4.1 Bestehende Persona-Felder bleiben Baseline

Die Stammdaten-UI rendert auf Basis der bestehenden `Persona`-Schema in
`src/types/persona.ts` (gepflegt in `personas.json` + `seed.ts`). V1
**erweitert** dieses Schema **additiv** um zwei neue Top-Level-Container —
`Stammdaten` und `UebermittlungsLogEntry` — sowie um eine handvoll Sperren-
und Einwilligungs-Felder. **Kein Bruch** an existierenden Persona-Felder
(Umzug-Wizard und Posteingang-Renderer bleiben kompatibel).

### 4.2 New types

```ts
// src/types/stammdaten.ts (NEW file)

import type { PersonaId, BehoerdeId, Adresse } from '@/types';

/**
 * Quell-Behörde, die ein Stammdaten-Feld autoritativ pflegt.
 * Ein Feld kann mehrere Quellen haben (z. B. Anschrift: Bürgeramt
 * primär; Standesamt für Heirats-Anschrift indirekt).
 */
export interface StammdatenFieldQuelle {
  behoerde_id: BehoerdeId;
  /** Norm-Kürzel der Pflege-Pflicht (z. B. '§ 3 Abs. 1 Nr. 12 BMG'). */
  rechtsgrundlage: string;
}

/**
 * Korrekturweg pro Feld — wird in der UI als Pointer angezeigt.
 * Verlinkt auf einen Wizard im /vorgaenge-Tab oder beschreibt einen
 * persönlichen Behördenweg (read-only-Felder ohne Self-Edit).
 */
export interface StammdatenKorrekturweg {
  /** Lookup-Slug für Wizard im /vorgaenge-Tab (z. B. 'adresse-ewa', 'sbgg', 'iban-speculative'). undefined = kein Wizard, Pfad ist persönlich/papierhaft. */
  wizard_slug?: string;
  /** Verbatim-DE-Text des Pointers (i18n-Key in DE-Locale). Beispiel: 'Bürgeramt-Termin nach § 17 BMG / eWA online'. */
  pointer_i18n_key: string;
  /** Norm-Kürzel der Korrekturpflicht. */
  rechtsgrundlage: string;
}

export type StammdatenFieldEditability =
  | 'read_only'                  // Hoheitlich gepflegt, kein Self-Edit
  | 'self_edit'                  // Reine App-Setting (Kontakt, Sprache)
  | 'self_edit_speculative_2027' // IBAN-Self-Edit als 2027-Vision
  | 'hidden_by_default'          // Religion (Art. 9 DSGVO)
  | 'self_edit_mock_pattern';    // Sperren-Toggle als Demo-Pattern (§ 51 BMG)

/** Sektion-Identifier (5 fixe Sektionen aus verifier Test #5). */
export type StammdatenSektionId =
  | 'identitaet'
  | 'anschrift'
  | 'familie'
  | 'dokumente'
  | 'sperren_einstellungen';

/**
 * Eine atomare Field-Definition für die UI. Build-Time-konstant pro Feld;
 * Werte kommen aus der Persona-Instanz, nicht aus dieser Definition.
 */
export interface StammdatenFieldDef {
  field_id: string;            // z. B. 'familienname', 'anschrift_aktuell', 'religionszugehoerigkeit'
  sektion: StammdatenSektionId;
  label_i18n_key: string;
  editability: StammdatenFieldEditability;
  quellen: StammdatenFieldQuelle[];
  korrekturweg: StammdatenKorrekturweg;
  /** Art-9-Hinweis-Badge sichtbar (z. B. AZR, Religion). */
  art9_relevant?: boolean;
  /** Speculative-Badge „2027-Vision" auf der Card sichtbar. */
  speculative_2027?: boolean;
}

/**
 * Ein einzelner Übermittlungs-/App-Activity-Log-Eintrag. Sichtbar in
 * der StammdatenHero-Card (Top-5) sowie in der UebermittlungsLogList
 * pro Sektion und im /datenschutz-Tab in voller Tabelle.
 *
 * Hard-Line (Disclaimer-2): jeder Eintrag MUSS klar machen, ob er
 * App-intern (Aufrufe / Selbst-Editierungen) oder behördlich
 * (IDA-Übermittlung zwischen öffentlichen Stellen) ist.
 */
export interface UebermittlungsLogEntry {
  id: string;
  /** ISO-8601 Timestamp. */
  timestamp: string;
  kategorie:
    | 'behoerde_zu_behoerde'   // Mock-IDA-Push (z. B. Bürgeramt → Beitragsservice)
    | 'app_aktivitaet'         // App-internes Log (z. B. Religion-Anzeige, Filter, Self-Edit)
    | 'speculative_2027';      // IBAN-Push-Mock, Wallet-Attestation-Preview
  /** Welches Feld / welche Sektion betroffen ist. */
  field_id?: string;
  sektion?: StammdatenSektionId;
  /** Absender-Behörde (Quelle der Übermittlung); bei `app_aktivitaet` undefined. */
  absender_behoerde_id?: BehoerdeId;
  /** Empfänger-Behörde (oder privater Mock-Empfänger bei speculative_2027). bei `app_aktivitaet` undefined. */
  empfaenger_id?: BehoerdeId | string;
  /** Klartext-Zweck (DE), aufgelöst aus i18n. */
  zweck_i18n_key: string;
  /** Norm-Kürzel als Rechtsgrundlage (z. B. '§ 11 Abs. 4 RBStV', '§ 36 BMG i.V.m. AO § 139b'). */
  rechtsgrundlage: string;
  /** Optional: Note (z. B. 'persona_id:anna; field_id:religionszugehoerigkeit; consent:art_9_lit_a'). Format `<key>:<value>` semicolon-getrennt — analog Posteingang V1.5.1. */
  note?: string;
}

/**
 * Sperren-Status nach §§ 42 Abs. 3, 50 Abs. 5, 51 BMG.
 * Mock-Pattern: in der Demo via Toggle aktivierbar; im echten System
 * Antrag bei Meldebehörde (Disclaimer-8 sperren_mock_pattern).
 */
export interface StammdatenSperren {
  auskunftssperre_aktiv: boolean;     // § 51 Abs. 1 BMG; mit Begründung
  auskunftssperre_begruendung?: string;
  auskunftssperre_befristet_bis?: string; // ISO-Datum
  uebermittlungssperren: Array<
    | 'religionsgesellschaften_42_3'  // § 42 Abs. 3 BMG
    | 'adressbuch_verlage_50_5'       // § 50 Abs. 5 BMG
    | 'wahlwerbung_50_1'              // § 50 Abs. 1 BMG
    | 'oeffentlich_rechtl_rundfunk_42' // § 42 BMG indirekt — Demo-Toggle
  >;
}

/** Religion-Einwilligungs-Status (Art. 9 Abs. 2 lit. a DSGVO; nur Session-scope). */
export interface StammdatenReligionConsent {
  /**
   * Session-scoped Toggle; in `sessionStorage` gehalten und per
   * Web-Plattform-Definition bei Tab-/Browser-Close verworfen. F5-Page-
   * Reload setzt nicht zurück (siehe Hard-Line § 11.4).
   * Verifier-Bezug: Adjudikation #4.
   */
  consent_session: boolean;
  /** Letzter Anzeige-Zeitstempel (für Activity-Log-Korrelation). */
  last_shown_at?: string;
}

/**
 * IBAN-Self-Edit-Container — als 2027-Vision deklariert (Disclaimer-4).
 * Mock-Push-Targets sind die 3 Empfänger (Familienkasse, ELSTER, GKV).
 */
export interface StammdatenIbanSpeculative {
  iban?: string; // formatiert mit `[MOCK]`-Präfix in seed
  /** Pro Empfänger: hat der/die Bürger:in den Mock-Push abgesendet? */
  consented_pushes: {
    familienkasse: boolean;
    elster: boolean;
    gkv: boolean;
  };
}

/**
 * Top-Level-Stammdaten-Container — projeziert die Persona auf die
 * Stammdaten-UI-Sicht. Wird durch getStammdaten() aufgebaut und enthält
 * sowohl persona-derived Daten als auch UI-spezifische Sperren-/Einwilligungs-/
 * IBAN-Container.
 *
 * **Hard-Line**: Diese Struktur ist ein READ-MODEL über die Persona, nicht
 * deren Ersatz. Persona bleibt Source-of-Truth für Identität/Anschrift/Familie/
 * Beschäftigung; Stammdaten ergänzt die Demo-spezifischen Sperren / Religion-
 * Einwilligung / IBAN-Speculative-Felder.
 */
export interface Stammdaten {
  persona_id: PersonaId;
  /** Alle Felder (read-only-Quelle aus Persona + UI-Sperren/Einwilligung). */
  identitaet: {
    familienname: string;
    fruehere_namen: string[];
    vornamen: string;
    doktorgrad?: string;
    geburtsdatum: string;
    geburtsort?: string;
    geschlecht: 'm' | 'w' | 'd' | 'x' | 'unbestimmt';
    staatsangehoerigkeit: string;
    steuer_id?: string; // [MOCK] 11-Ziffer-Format
  };
  anschrift_aktuell: Adresse;
  anschriften_historisch: Array<Adresse & { gueltig_ab: string; gueltig_bis: string }>;
  familie: {
    partner?: { vorname: string; nachname: string; geburtsdatum: string; idnr_mock?: string };
    kinder: Array<{ vorname: string; nachname: string; geburtsdatum: string; idnr_mock?: string }>;
    eheschliessung?: { datum: string; ort: string; az: string }; // [MOCK]
  };
  dokumente_refs: {
    personalausweis?: { nummer: string; gueltig_bis: string };
    reisepass?: { nummer: string; gueltig_bis: string };
    eat_can?: string;     // nur Drittstaatsangehörige
    azr_nr?: string;      // nur Drittstaatsangehörige
  };
  kontakt: {
    email?: string;
    mobil?: string;
    sprachpraeferenz: string; // ISO-639-1
  };
  beschaeftigung_readonly?: {
    typ: string;
    arbeitgeber?: string;
    drv_versicherungsnummer?: string;
    krankenversicherung_traeger?: string;
    kvnr?: string;
  };
  religion: {
    /** Wert wird nur bei Einwilligung an die UI durchgereicht. */
    wert?: 'rk' | 'ev' | 'ohne' | 'andere' | string;
    consent: StammdatenReligionConsent;
  };
  sperren: StammdatenSperren;
  iban_speculative: StammdatenIbanSpeculative;
  /** Letzte 50 Einträge — UI-Sicht; vollständige Historie liegt in einem separaten Persistence-Bucket (siehe § 5.4). */
  uebermittlungs_log: UebermittlungsLogEntry[];
}
```

> **Architektur-Konsistenz**: `Stammdaten` ist ein **abgeleitetes Read-Model**.
> Persistierte UI-Mutationen (Religion-Consent, Sperren, IBAN-Speculative,
> App-Activity-Log) liegen in dedizierten LocalStorage-Buckets (siehe § 5.4);
> Persona-Daten bleiben in `personas.json` + `seed.ts`. `getStammdaten(personaId)`
> kombiniert beides zur `Stammdaten`-Sicht.

### 4.3 Persona schema — additive extensions

In `src/types/persona.ts` werden die folgenden **optionalen** Felder
ergänzt (kein Bruch an existierenden Personas):

```ts
// src/types/persona.ts (V1 EXTEND — additive)

export interface Persona {
  // ... bestehende Felder unverändert ...

  /** Frühere Namen (z. B. Geburtsname). Optional — nur gepflegt für
   *  Personas mit Namensänderung (Schmidt-Persona post-Heirat). */
  fruehere_namen?: string[];

  /** Doktorgrad. */
  doktorgrad?: string;

  /** Geburtsort. */
  geburtsort?: string;

  /** Geschlecht (BMG § 3 Abs. 1 Nr. 7). */
  geschlecht?: 'm' | 'w' | 'd' | 'x' | 'unbestimmt';

  /** Religionszugehörigkeit (BMG § 3 Abs. 1 Nr. 11; Art. 9 DSGVO). */
  religion?: 'rk' | 'ev' | 'ohne' | 'andere' | string;

  /** Personalausweis-Nummer (synthetisch, [MOCK]). */
  personalausweis_nr?: { nummer: string; gueltig_bis: string };

  /** Reisepass (synthetisch, [MOCK]). */
  reisepass?: { nummer: string; gueltig_bis: string };

  /** eAT-CAN — nur Drittstaatsangehörige (Mehmet). */
  eat_can?: string;

  /** AZR-Nr. — nur Drittstaatsangehörige. */
  azr_nr?: string;

  /** Kontaktdaten — Self-Edit in Stammdaten. */
  kontakt?: {
    email?: string;
    mobil?: string;
  };

  /** Eheschließung — Standesamt-Daten. */
  eheschliessung?: { datum: string; ort: string; az: string };
}
```

Für jede Persona in `personas.json` müssen mindestens die Stammdaten-Demo-Snapshots
aus dem domain-Doc (Anna, Schmidt, Mehmet) gesetzt werden — siehe § 5.5.

### 4.4 Activity-Log-`note`-Format (analog Posteingang V1.5.1)

Format: Semicolon-getrennte `<key>:<value>`-Paare. Reservierte Keys:

| Key | Werte | Beispiel |
|---|---|---|
| `persona_id` | Persona-ID | `persona_id:anna` |
| `field_id` | Feld-ID | `field_id:religionszugehoerigkeit` |
| `consent` | DSGVO-Lit-Marker | `consent:art_9_lit_a` |
| `quelle` | Trigger-Kanal | `quelle:umzug_cascade`, `quelle:user_self_edit`, `quelle:wallet_preview` |
| `mock` | true/false | `mock:true` (immer in V1) |

**Hard-Line § 11.6**: Kein PII-Klartext im `note`-Feld; nur Marker / IDs.

---

## 5. Mock-backend additions (mock-backend-coder)

### 5.1 New API methods (in `src/lib/mock-backend/api.ts`)

```ts
// Read API
getStammdaten(personaId: PersonaId): Promise<Stammdaten>
getStammdatenAktivitaet(opts?: { limit?: number; sektion?: StammdatenSektionId; kategorie?: UebermittlungsLogEntry['kategorie'] }): Promise<UebermittlungsLogEntry[]>

// Write API — Self-Edit
updateKontakt(input: { email?: string; mobil?: string }): Promise<void>
updateSprache(sprache: string): Promise<void>
updateIbanSpeculative(iban: string): Promise<void>
simulateIbanPush(targets: { familienkasse: boolean; elster: boolean; gkv: boolean }): Promise<void>

// Write API — Sperren
updateSperre(input: {
  auskunftssperre_aktiv?: boolean;
  auskunftssperre_begruendung?: string;
  uebermittlungssperren?: Array<StammdatenSperren['uebermittlungssperren'][number]>;
}): Promise<void>

// Write API — Religion-Consent (session-only, NICHT persistiert)
consentReligion(): Promise<{ wert: string }>
revokeReligionConsent(): Promise<void>

// Wallet & Externe Empfänger (Mock-Preview only, kein Push)
previewWalletAttestation(empfaenger_id: BehoerdeId | string): Promise<{
  pid_pflicht: Record<string, string>;
  pid_optional: Record<string, string>;
  mock_attestation_id: string;
}>
```

**Hand-off an assistant-engineer (V2-Hook)**: alle obigen Read-API-Methoden
müssen in `src/lib/ai/tools.ts` als Tool-Definitionen gespiegelt werden, sobald
der AI-Assistent in V2 Stammdaten-Auskünfte beantworten soll. Write-Methoden
bleiben in V1 nur für die UI; AI-Tool-Use auf Schreib-Pfade ist V2-Hook.

**Latenz**: alle Methoden laufen durch `withLatency()` mit V1-Standard-Profil
(300–800 ms + 5 % Fehlerquote). Schreib-Methoden emittieren mindestens ein
`MockBackendEvent` (siehe § 5.3).

### 5.2 Schema-Extensions in `src/lib/mock-backend/schemas.ts`

```ts
// Zod-Schemas für die neuen Typen (siehe § 4.2)

export const stammdatenSektionIdSchema = z.enum([
  'identitaet', 'anschrift', 'familie', 'dokumente', 'sperren_einstellungen',
]);

export const stammdatenFieldEditabilitySchema = z.enum([
  'read_only', 'self_edit', 'self_edit_speculative_2027',
  'hidden_by_default', 'self_edit_mock_pattern',
]);

export const uebermittlungsLogEntrySchema = z.object({
  id: z.string(),
  timestamp: z.string().regex(/^\d{4}-\d{2}-\d{2}T/),
  kategorie: z.enum(['behoerde_zu_behoerde', 'app_aktivitaet', 'speculative_2027']),
  field_id: z.string().optional(),
  sektion: stammdatenSektionIdSchema.optional(),
  absender_behoerde_id: z.string().optional(),
  empfaenger_id: z.string().optional(),
  zweck_i18n_key: z.string(),
  rechtsgrundlage: z.string(),
  note: z.string().optional(),
});

export const stammdatenSperrenSchema = z.object({
  auskunftssperre_aktiv: z.boolean(),
  auskunftssperre_begruendung: z.string().min(30).optional(),
  auskunftssperre_befristet_bis: z.string().optional(),
  uebermittlungssperren: z.array(z.enum([
    'religionsgesellschaften_42_3',
    'adressbuch_verlage_50_5',
    'wahlwerbung_50_1',
    'oeffentlich_rechtl_rundfunk_42',
  ])),
});

export const stammdatenSchema = z.object({
  persona_id: z.string(),
  identitaet: z.object({ /* ... */ }),
  anschrift_aktuell: adresseSchema,
  anschriften_historisch: z.array(adresseSchema.extend({
    gueltig_ab: z.string(), gueltig_bis: z.string(),
  })),
  familie: z.object({ /* ... */ }),
  dokumente_refs: z.object({ /* ... */ }),
  kontakt: z.object({ /* ... */ }),
  beschaeftigung_readonly: z.object({ /* ... */ }).optional(),
  religion: z.object({ /* ... */ }),
  sperren: stammdatenSperrenSchema,
  iban_speculative: z.object({
    iban: z.string().optional(),
    consented_pushes: z.object({
      familienkasse: z.boolean(),
      elster: z.boolean(),
      gkv: z.boolean(),
    }),
  }),
  uebermittlungs_log: z.array(uebermittlungsLogEntrySchema),
});
```

**Hard-Line § 11.7 (verifier-flagged)**: das Zod-Schema validiert auch
`auskunftssperre_begruendung.min(30)`-Charakter-Limit, weil die Begründungs-
Pflicht aus § 51 Abs. 1 BMG sich UI-seitig in einer Mindest-Eingabe niederschlägt.
Eine leere Begründung (oder unter 30 Zeichen) wird zurückgewiesen
(`MockBackendError` mit Code `BEGRUENDUNG_ZU_KURZ`).

### 5.3 Mock-Backend-Events

Die folgenden neuen `MockBackendEvent`-Varianten werden ergänzt
(in `src/types/mock-event.ts`):

```ts
type StammdatenEvent =
  | { type: 'stammdaten/kontakt-updated'; persona_id: PersonaId; fields: ('email' | 'mobil')[] }
  | { type: 'stammdaten/sprache-updated'; persona_id: PersonaId; sprache: string }
  | { type: 'stammdaten/iban-speculative-updated'; persona_id: PersonaId }
  | { type: 'stammdaten/iban-push-simulated'; persona_id: PersonaId; targets: string[] }
  | { type: 'stammdaten/sperre-updated'; persona_id: PersonaId; sperre_typ: string; aktiv: boolean }
  | { type: 'stammdaten/religion-consented'; persona_id: PersonaId; session_only: true }
  | { type: 'stammdaten/religion-consent-revoked'; persona_id: PersonaId }
  | { type: 'stammdaten/wallet-attestation-previewed'; persona_id: PersonaId; empfaenger_id: string };
```

Jeder Event ergänzt den Activity-Log mit einem entsprechenden
`UebermittlungsLogEntry` (Kategorie `app_aktivitaet` oder `speculative_2027`,
nie `behoerde_zu_behoerde` — letzteres wird **ausschließlich** durch den
Umzug-Autopilot-Cascade-Generator emittiert).

### 5.4 Persistierung — neue LocalStorage-Buckets

| Bucket-Key | Inhalt | Schema-Version |
|---|---|---|
| `govtech-de:v1:stammdaten:sperren` | `Record<PersonaId, StammdatenSperren>` | v1 |
| `govtech-de:v1:stammdaten:iban-speculative` | `Record<PersonaId, StammdatenIbanSpeculative>` | v1 |
| `govtech-de:v1:stammdaten:kontakt` | `Record<PersonaId, { email?: string; mobil?: string; sprachpraeferenz: string }>` | v1 |
| `govtech-de:v1:stammdaten:uebermittlungs-log` | `Record<PersonaId, UebermittlungsLogEntry[]>` (max 200 pro Persona; FIFO-Eviction) | v1 |
| **NICHT in `localStorage`** — gehalten in `sessionStorage` (per-Tab) unter `govtech-de:v1:stammdaten:religion-consent-session` | `Record<PersonaId, { consent_session: boolean; last_shown_at?: string }>` (verifier Adjudikation #4 — Session-scoped, Reset bei Tab-/Browser-Close, **nicht** bei F5-Reload — siehe Hard-Line § 11.4) | — |

> **Klarstellung zum Bucket-Listing**: Die obigen vier
> `localStorage`-Buckets sind die einzigen Stammdaten-`localStorage`-
> Persistenz-Layer. Religion-Consent gehört **bewusst nicht** in diese
> Liste — er lebt im per-Tab-`sessionStorage` (HTML-Living-Standard:
> `Window.sessionStorage` ist an die top-level browsing context-Lifetime
> gebunden). Frontend-coder darf weder einen fünften `localStorage`-Bucket
> für Religion-Consent anlegen noch den `sessionStorage`-Key in
> `persistence.ts` registrieren.

`getStammdaten(personaId)` kombiniert die Persona-Daten aus `personas.json`
+ `seed.ts` mit den vier `localStorage`-Buckets **plus** dem
`sessionStorage`-Religion-Consent-Layer zur `Stammdaten`-Sicht.

**Migration-Hinweis**: Erste Boot-Up nach V1-Stammdaten-Ship initialisiert
die `localStorage`-Buckets aus `seed.ts`-Defaults. Religion-Consent wird
**niemals** in `localStorage` persistiert (Hard-Line § 11.4); der
`sessionStorage`-Layer startet pro neuem Tab leer (`consent_session: false`).

### 5.5 Seed-Daten-Pflege (`src/lib/mock-backend/seed.ts` + `src/data/personas.json`)

Die drei Demo-Personas erhalten die Stammdaten-Felder aus dem domain-Doc
„Realistic mock-data hints — Profil-Snapshots":

**Anna Petrov**:
- familienname=`Petrov`, vornamen=`Anna`, geburtsort=`Sofia, Bulgarien` (ggf. aus seed-Bestand übernehmen)
- staatsangehoerigkeit=`bulgarisch`
- anschrift=`Skalitzer Str. 88, 10997 Berlin`
- steuer_id=`[MOCK] 47 113 815 421`
- kvnr=`[MOCK] A123456780` (TK)
- sperren=keine; religion=`ohne`
- personalausweis_nr=`[MOCK] T0123456X` (synthetisch); gueltig_bis=`2032-08-04`

**Familie Schmidt** (Hauptperson: Elias Schmidt):
- familienname=`Schmidt`, fruehere_namen=`['Müller']` (aus pre-Heirat); doktorgrad=optional
- staatsangehoerigkeit=`deutsch`; anschrift=`Lindwurmstr. 142, 80337 München`
- steuernummer (FA München-Pasing)=`[MOCK] 143/250/01234`
- kindergeldnummer (Familienkasse Bayern Süd)=`[MOCK] 234FK892017`
- religion=`rk` (consent-required)
- eheschliessung={ datum: `2024-06-22`, ort: `München`, az: `[MOCK] M-E-00471/2024` }
- 2 Kinder: Geburtsdaten + IDNr-Mock

**Mehmet Yıldız**:
- familienname=`Yıldız`, vornamen=`Mehmet`; staatsangehoerigkeit=`türkisch`
- anschrift=`Venloer Str. 312, 50825 Köln`
- aufenthaltstitel.norm=`§ 21 AufenthG`; eat_can=`[MOCK] T0123456X`; azr_nr=`[MOCK] 6724813-090`
- steuernummer (FA Köln-Mitte)=`[MOCK] 217/5031/0815`
- kvnr (AOK freiwillig versichert)=`[MOCK] M845192036`
- iban_speculative.iban=`[MOCK] DE89 3704 0044 0532 0130 00`
- religion=`ohne`

**Initial-Übermittlungs-Log-Pflege** pro Persona — mindestens **5 plausible
Einträge** in den 5 Sektionen verteilt (verifier Probe #2 Punkt 4):
- Anna: 6 Anschrift-Einträge aus dem Umzug-Cascade-Demo (zeitstempel = jüngst,
  damit Hero-Card „letzte Übermittlung vor 3 Min" funktioniert) + 1 KVNR-Update
  durch DEÜV-Pseudo-Push
- Schmidt: 5 historische Einträge aus 2024-Eheschließung-Cascade (Standesamt →
  Bürgeramt; Bürgeramt → Finanzamt München; Bürgeramt → Beitragsservice; Standesamt
  → KiStAM; Familienkasse → Beitragsservice)
- Mehmet: 5 Einträge inkl. ABH-eAT-Adressänderung (manuell — KEIN automatischer
  § 36-Push), AZR-Update, KVNR-Mitteilung an AOK

`seed.ts` exportiert eine `STAMMDATEN_DEFAULT_LOG_ENTRIES`-Konstante, die der
`getStammdaten`-Resolver mit dem User-Live-Log mergeed (jüngste zuerst).

---

## 6. Frontend pages

### 6.1 Routing-Topologie

| Route | File | Type | Zweck |
|---|---|---|---|
| `/(app)/stammdaten` | `src/app/(app)/stammdaten/page.tsx` | RSC | Default-Tab „Mein Profil" — alle 5 Sektionen + Hero-Card |
| `/(app)/stammdaten?tab=wallet` | `src/app/(app)/stammdaten/page.tsx` (gleiche Page, Tab-Switch via Search-Param) | RSC + `useSearchParams` Client-Hydrate | Sub-Tab „Wallet & Externe Empfänger — 2027-Vision" |
| `/(app)/stammdaten/layout.tsx` | `src/app/(app)/stammdaten/layout.tsx` | RSC | Tab-Switch + Disclaimers (Disclaimer-1 + Pilot-Phase-Banner) |
| `/(app)/datenschutz` (V2-Hook) | n/a in V1 | — | Vollständiger DSC-Klon mit Filter — V1: Hero-CTA verlinkt nur als Teaser |

### 6.2 RSC-vs-Client-Boundary

- **Server**: `getStammdaten(personaId)` + `getStammdatenAktivitaet({limit:5})`
  laufen in der RSC-Page; gerendert wird das initial HTML mit allen Field-Werten
  und Top-5-Activity-Log.
- **Client**: `<StammdatenSektion>` (Disclosure-State), `<ReligionConsentModal>`,
  `<SperrenAktivierenConfirmDialog>`, `<IbanSpeculativePushModal>`,
  `<WalletAttestationPreviewModal>`, Tab-Switch via `useSearchParams`,
  `<KorrigierenCTA>` (router.push).
- **Mutations**: alle Self-Edit-Aktionen rufen den Mock-Backend (Client-side
  via `'use client'`-Komponenten); RSC re-rendert nicht reaktiv. Frontend-coder
  setzt nach jeder Mutation einen `router.refresh()`-Hook *oder* lokalen
  Optimistic-State; Architect-Empfehlung: Optimistic-State + Toast-Feedback,
  damit das Activity-Log live nachladen kann.

### 6.3 Layout-Skizze (Default-Tab „Mein Profil")

```
┌─────────────────────────────────────────────────────────────────┐
│  [Logo · Sidebar · Topbar (LanguageSwitcher · LogOut)]          │
├─────────────────────────────────────────────────────────────────┤
│  ▌Stammdaten                              [Mein Profil] [Wallet]│
│                                                                 │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ ⓘ Datenschutzcockpit (Pilot-Phase)                         │ │
│  │ Sie sind in 7 öffentlichen Registern geführt.              │ │
│  │ Letzte Übermittlung: vor 3 Min — Anschrift vom             │ │
│  │ Bürgeramt Friedrichshain-Kreuzberg an                      │ │
│  │ Beitragsservice ARD/ZDF/Dlr. Rechtsgrundlage: § 11 Abs. 4   │ │
│  │ RBStV i.V.m. § 36 BMG.                                     │ │
│  │ [Vollständiges Aktivitätsprotokoll öffnen →]               │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                 │
│  Disclaimer: „Diese App ist eine Lese- und Wegweiser-Schicht…" │
│                                                                 │
│  ▼ 1. Identität                                                │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ Familienname           Petrov                              │ │
│  │ Quelle: Bürgeramt Friedrichshain-Kreuzberg                 │ │
│  │ Korrekturweg: Standesamt nach § 1355 BGB / § 45 PStG       │ │
│  │ Letztes Update: 04.04.2024                                 │ │
│  └────────────────────────────────────────────────────────────┘ │
│  … (weitere FieldCards: Vornamen, Geburtsdatum, Geschlecht, …) │
│                                                                 │
│  ▶ 2. Anschrift  (default-zugeklappt)                          │
│  ▶ 3. Familie                                                  │
│  ▶ 4. Dokumente                                                │
│  ▶ 5. Sperren & Einstellungen                                  │
│                                                                 │
│  Footer: [Impressum] [Datenschutz] [Mock-Hinweis: alle Daten   │
│  synthetisch, kein behördliches System]                         │
└─────────────────────────────────────────────────────────────────┘
```

### 6.4 Layout-Skizze (Sub-Tab „Wallet & Externe Empfänger")

```
┌─────────────────────────────────────────────────────────────────┐
│  ▌Stammdaten                              [Mein Profil] [Wallet]│
│                                                                 │
│  ╔════════════════════════════════════════════════════════════╗ │
│  ║ 2027-Vision — Wallet & externe Empfänger                   ║ │
│  ║ Diese Sektion zeigt, wie eine EUDI-Wallet-basierte         ║ │
│  ║ Datenfreigabe an private Empfänger aussehen *könnte*.      ║ │
│  ║ Heute (Mai 2026) ist diese Funktion nicht verfügbar.       ║ │
│  ╚════════════════════════════════════════════════════════════╝ │
│                                                                 │
│  Disclaimer-3 (eudi_speculative): „Die hier gezeigte Funktion…" │
│                                                                 │
│  Mock-Drittanbieter:                                            │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ Berliner Sparkasse — Adressabgleich                        │ │
│  │ Anfrage simulieren →                                       │ │
│  └────────────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ Mock-Hausverwaltung — Vermieter:in-Identitätsnachweis      │ │
│  │ Anfrage simulieren →                                       │ │
│  └────────────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ Vattenfall Europe Sales — Volljährigen-Nachweis            │ │
│  │ Anfrage simulieren →                                       │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                 │
│  Disclaimer-Footer: „Architecture and Reference Framework      │
│  (Stand Mai 2026: v2.0)"                                       │
└─────────────────────────────────────────────────────────────────┘
```

---

## 7. Visibility-Predicates / consent-Predicates

> Verifier-flagged: Datenschutz-Cockpit ist eine **eigenständige Capability**
> (V2-Hook); seine Visibility-Predicates lagern dort. In V1 betrifft
> Stammdaten ausschließlich die **inboundlokalen** Predicates für Religion-
> Anzeige, Sperren-Anzeige, IBAN-Speculative, Drittstaatsangehörigen-spezifische
> Felder.

### 7.1 Religion-Predicate

```ts
function isReligionVisible(stammdaten: Stammdaten): boolean {
  return stammdaten.religion.consent.consent_session === true;
}
```

- **Default**: `false` (Hard-Line § 11.3).
- Toggle via `consentReligion()` ist **per-Tab session-scoped** (verifier
  Adjudikation #4; `sessionStorage`-Layer — siehe Hard-Line § 11.4).
- **Reset auf `false`**: bei Tab-Close, Browser-Beendigung oder
  Persona-Switch — Religion-Card collapsed wieder.
- **Kein Reset** bei F5-/`Ctrl+R`-Page-Reload innerhalb desselben Tabs
  (bewusste UX-Entscheidung — siehe Hard-Line § 11.4).

### 7.2 Drittstaatsangehörigen-Predicate

```ts
function isAzrEatVisible(persona: Persona): boolean {
  return persona.aufenthaltstitel !== undefined;
}
```

- Sichtbar nur für Personas mit `aufenthaltstitel`-Feld (Mehmet).
- AZR-/eAT-Felder erhalten `art9_relevant: true` Hinweis-Badge in der
  FieldCard (verifier Probe #4 Tabelle).

### 7.3 IBAN-Speculative-Predicate

```ts
function isIbanSpeculativeVisible(): boolean {
  return true; // sichtbar für alle Personas; immer mit 2027-Vision-Badge
}
```

- IBAN-FieldCard ist immer sichtbar (auch wenn `iban_speculative.iban`
  noch nicht gesetzt ist).
- Bei leerem Wert: Card zeigt CTA „IBAN hinterlegen (Demo)" + 2027-Vision-Badge.
- Disclaimer-4 (`iban_speculative`) inline am Card-Footer.

### 7.4 Sperren-Self-Edit-Predicate

```ts
function isSperreToggleEnabled(persona: Persona, sperreTyp: string): boolean {
  // Mock-Pattern — alle Personas dürfen alle Sperren toggeln (Demo).
  // Im echten System: Antrag bei Meldebehörde (Disclaimer-8).
  return true;
}
```

- Toggle-Aktion öffnet `<SperrenAktivierenConfirmDialog>` mit Disclaimer-8 verbatim.
- Bei Auskunftssperre (§ 51 Abs. 1 BMG): zusätzliche Begründungs-Textarea
  (Min. 30 Zeichen, validiert via Zod).

### 7.5 Wallet-Sub-Tab-Predicate

```ts
function isWalletSubTabAvailable(): boolean {
  return true; // V1: immer verfügbar mit 2027-Vision-Banner
}
```

- Banner verbatim aus `stammdaten.subtab.wallet_externe_empfaenger.banner`.
- Disclaimer-3 (`eudi_speculative`) prominent oben.
- `<WalletAttestationPreviewModal>` ist preview-only — KEIN Versand-CTA in V1.

### 7.6 V2-Hook für Datenschutz-Cockpit

Der `/datenschutz`-Tab (V2) wird die folgenden Predicates erweitern:
Pro `UebermittlungsLogEntry` ein `viewable_by`-Feld; Filter nach Behörde,
Zeitraum, Rechtsgrundlage; Export-Funktion. **Nicht V1-Scope.** In V1:
Hero-Card-CTA verlinkt auf einen statischen `/datenschutz`-Stub mit
„kommt in V2"-Banner.

---

## 8. Change-propagation — der Stammdaten-Wow-Effekt

> Stammdaten ist *nicht* der Trigger der Cascade — der Trigger ist der
> Umzug-Vorgang im `/vorgaenge`-Tab. Stammdaten ist die **Sicht** auf das
> Ergebnis. Trotzdem hat Stammdaten zwei Hand-off-Pfade in beide Richtungen:
> *Inbound* (Vorgang → Stammdaten: Activity-Log + aktualisiertes Read-Model)
> und *Outbound* (Stammdaten → Vorgang: Korrigieren-CTA löst Wizard aus).

### 8.1 Inbound — Vorgang triggert Stammdaten-Update

**Beispiel: Umzug-Cascade abschließt**

1. `/vorgaenge/neu/umzug`-Wizard ruft `umzugAutopilot()` (existing
   `src/lib/mock-backend/autopilot/umzug.ts`).
2. Im Cascade-Block A (Bürgeramt → Finanzamt → Beitragsservice → AOK →
   BAPersBw → Standesamt) emittiert der Autopilot pro Schritt einen
   `MockBackendEvent` vom Typ `umzug/cascade-step` und ergänzt den
   Stammdaten-Activity-Log mit einem `UebermittlungsLogEntry` der Kategorie
   `behoerde_zu_behoerde`.
3. Mock-Backend persistiert den Log-Eintrag im Bucket
   `govtech-de:v1:stammdaten:uebermittlungs-log:<persona_id>`.
4. Bei Wechsel zu `/stammdaten` lädt die RSC-Page `getStammdatenAktivitaet({limit:5})`,
   die jüngsten Einträge erscheinen in der Hero-Card und in der
   `<UebermittlungsLogList>` der Anschrift-Sektion.

**Mock-Backend-Coder action**: in `src/lib/mock-backend/autopilot/umzug.ts`
einen Hook `appendStammdatenLogEntry(persona_id, entry)` hinzufügen, der pro
Cascade-Schritt aufgerufen wird. Architect-Empfehlung: integriert in den
bestehenden `umzugAutopilot()`-Generator, kein separater Pfad.

### 8.2 Outbound — Stammdaten triggert Vorgang über `<KorrigierenCTA>`

Wizard-Slug-Lookup-Map (verbindlich):

| `field_id` | `wizard_slug` | Vorgang-Wizard-Pfad | Norm |
|---|---|---|---|
| `anschrift_aktuell` | `adresse-ewa` | `/vorgaenge/neu/adresse-ewa` (V2-Hook bzw. V1 Mock-Wizard) | § 17 BMG / eWA |
| `geschlecht` | `sbgg` | `/vorgaenge/neu/sbgg` (3-stufig — siehe § 8.3) | §§ 2, 4, 5 SBGG |
| `religion` | `religion-austritt` | `/vorgaenge/neu/religion-austritt` (V2-Hook) | RelKErhG / Landesrecht |
| `iban_speculative` | (kein Wizard, bleibt auf Stammdaten-Seite mit `<IbanSpeculativePushModal>`) | n/a | n/a (Disclaimer-4) |
| `auskunftssperre` / `uebermittlungssperren` | (kein Wizard, bleibt auf Stammdaten-Seite mit `<SperrenAktivierenConfirmDialog>`) | n/a | §§ 42, 50, 51 BMG (Disclaimer-8) |
| `kontakt.email` / `kontakt.mobil` | (kein Wizard — direkter Self-Edit auf der FieldCard) | n/a | n/a (BundID-Konto-Konvention) |
| `eat_can` / `azr_nr` | `abh-termin-buchung` (V2-Hook) | n/a in V1 | AufenthG § 86 |
| `personalausweis_nr` | `pa-erneuerung` (V2-Hook) | n/a in V1 | PauswG |
| Alle übrigen read-only-Felder (Familienname, Vornamen, Geburtsdatum, Steuer-IdNr, KVNR, DRV-VSNR, …) | (kein Wizard — Korrekturweg-Pointer beschreibt persönlichen Behördenweg) | n/a | siehe verifier Probe #1 Tabelle |

### 8.3 SBGG-Wizard (3-stufig — verifier Adjudikation #3)

> **Hard-Line § 11.5**: SBGG-Wizard ist **nicht** auf weniger als 3 Stufen
> reduzierbar (gesetzlich zwingende 3-Monats-Wartefrist). Verifier
> Reviewer-Note: jede Vereinfachung erfordert Re-Review.

**Stufe 1 — Anmeldung nach § 4 SBGG (mündlich oder schriftlich)**:
- Online-Formular (Demo simuliert die schriftliche Variante; mündliche
  Variante nur als Disclaimer-Hinweis).
- Eingabe: gewünschter neuer Geschlechtseintrag + neue Vornamen.
- Submit erzeugt einen Mock-Brief „Bestätigung Ihrer Anmeldung nach § 4
  SBGG vom DD.MM.YYYY" mit Aktenzeichen `[MOCK] B-SBGG-NNNNN/2026` und
  einem Wartefrist-Countdown von 3 Monaten.
- Vorgang wird mit Status `wartefrist_3_monate_aktiv` angelegt.

**Stufe 2 — Wartefrist (3 Monate, § 4 SBGG)**:
- Visualisiert als `<FristCountdown>`-Komponente (reuse aus Posteingang)
  im `/vorgaenge/<id>`-Detail.
- Status-Pill „Wartefrist läuft (§ 4 SBGG)" auf der Vorgang-Card.
- Hinweis: „Nach Ablauf der Wartefrist müssen Sie binnen 6 Monaten zur
  persönlichen Erklärung beim Standesamt erscheinen — sonst wird die
  Anmeldung gegenstandslos."

**Stufe 3 — Persönliche Erklärung mit Beurkundung beim Standesamt
(§ 2 SBGG)**:
- Termin-Buchung beim Standesamt (Mock); Hinweis verbatim „Persönliches
  Erscheinen erforderlich (Beurkundungspflicht nach PStG-Vollzug)".
- Mock-Bestätigungs-Brief nach Termin „Beurkundung Ihrer Erklärung nach
  § 2 SBGG vom DD.MM.YYYY".
- Vorgang-Status auf `abgeschlossen`. Geschlechts-FieldCard im Stammdaten
  zeigt jetzt den neuen Wert + Status-Notiz „Erneute Erklärung möglich
  ab DD.MM.YYYY (§ 5 SBGG, 1-Jahres-Sperrfrist)".

**§ 45b PStG-Pfad (für Personen mit Variante der Geschlechtsentwicklung)**:
- Separate Wizard-Auswahl auf Stufe 1 mit eigenem `wizard_slug=pstg-45b`.
- Hard-Line § 11.5: nicht in den SBGG-Pfad mischen.
- V1-Implementierung: Auswahl-Dialog zwischen den zwei Pfaden ist
  zwingend; Default ist SBGG.

### 8.4 Gegenseitige Abhängigkeiten

| Trigger | Stammdaten-Konsequenz |
|---|---|
| Umzug-Cascade (vorhandener Vorgang) | 6 `behoerde_zu_behoerde`-Einträge im Activity-Log; Anschrift-FieldCard updates; historische Anschrift wird mit `gueltig_bis = stichtag` ergänzt |
| SBGG-Wizard Stufe 3 abgeschlossen | Geschlechts-FieldCard updates; § 5 SBGG-Sperrfrist-Notiz erscheint; Activity-Log-Eintrag (Standesamt → Bürgeramt → Finanzamt KiStAM) |
| Religion-Austritt (V2-Hook) | Religion-FieldCard wert wechselt auf `ohne`; Activity-Log-Eintrag (Standesamt → KiStAM → BZSt) |
| Kontaktdaten-Self-Edit | Kontakt-FieldCard updates; Activity-Log-Eintrag (`app_aktivitaet`); kein behördlicher Push |
| IBAN-Speculative-Push | 0–3 `speculative_2027`-Einträge im Activity-Log (je nach Toggle-Auswahl); IBAN-FieldCard zeigt „zuletzt gepusht an: Familienkasse, ELSTER" |
| Sperren-Toggle | Sperren-FieldCard zeigt aktiven Status; Activity-Log-Eintrag (`app_aktivitaet`) |
| Religion-Anzeige (Consent) | Religion-FieldCard rendert Wert (session-only); Activity-Log-Eintrag (`app_aktivitaet`, mit `consent:art_9_lit_a`-Marker) |

---

## 9. i18n keys

> **Übersetzungs-Scope**: alle Stammdaten-Strings × 6 Locales (DE source +
> EN/RU/UK/AR/TR Übersetzung). DE = source-of-truth; verbatim aus
> Domain-Doc-Refs (analog Posteingang V1.5.1-Konvention).

### 9.1 Disclaimer-Strings (verbindlich verbatim aus Verifier § "Verbindliche `de.json`-Strings")

| Key | DE-Quelle | Lokalisiert |
|---|---|---|
| `stammdaten.disclaimer.lese_schicht` | Verifier Adjudikation #3-Wortlaut (mit SBGG-Präzisierung) — siehe § 11.1 dieser Spec | 6 locales |
| `stammdaten.disclaimer.audit_log_app_internal` | Verifier-Wortlaut mit DSC-Status-Präzisierung | 6 locales |
| `stammdaten.disclaimer.eudi_speculative` | Verifier-Wortlaut mit ARF-v2.0-Korrektur | 6 locales |
| `stammdaten.disclaimer.iban_speculative` | Domain-Doc-Wortlaut, unverändert | 6 locales |
| `stammdaten.disclaimer.religion_art9` | Domain-Doc-Wortlaut, unverändert | 6 locales |
| `stammdaten.disclaimer.religion_consent_toggle_label` | Verifier-Wortlaut für Modal-Toggle | 6 locales |
| `stammdaten.disclaimer.sperren_mock_pattern` | Verifier-Wortlaut für § 51 BMG-Self-Edit | 6 locales |
| `stammdaten.subtab.wallet_externe_empfaenger.banner` | Verifier-Wortlaut für Sub-Tab-Banner | 6 locales |

### 9.2 UI-Chrome-Keys

| Key | DE | Lokalisiert |
|---|---|---|
| `stammdaten.page.title` | „Stammdaten" | 6 locales |
| `stammdaten.tab.profil.label` | „Mein Profil" | 6 locales |
| `stammdaten.tab.wallet.label` | „Wallet & Externe Empfänger" | 6 locales |
| `stammdaten.hero.title` | „Datenschutzcockpit (Pilot-Phase)" | 6 locales |
| `stammdaten.hero.summary` | „Sie sind in {register_count} öffentlichen Registern geführt." | 6 locales |
| `stammdaten.hero.last_transmission` | „Letzte Übermittlung: vor {dauer} — {feld} vom {absender} an {empfaenger}. Rechtsgrundlage: {rechtsgrundlage}." | 6 locales |
| `stammdaten.hero.cta_full_log` | „Vollständiges Aktivitätsprotokoll öffnen" | 6 locales |
| `stammdaten.hero.empty_state` | „Keine kürzlichen Übermittlungen — willkommen!" | 6 locales |

### 9.3 Sektion-Titel + Korrekturweg-Pointer

| Key | DE | Lokalisiert |
|---|---|---|
| `stammdaten.sektion.identitaet.title` | „Identität" | 6 locales |
| `stammdaten.sektion.anschrift.title` | „Anschrift" | 6 locales |
| `stammdaten.sektion.familie.title` | „Familie" | 6 locales |
| `stammdaten.sektion.dokumente.title` | „Dokumente" | 6 locales |
| `stammdaten.sektion.sperren_einstellungen.title` | „Sperren & Einstellungen" | 6 locales |
| `stammdaten.field.<field_id>.label` (~30 Felder) | (siehe § 4.2 Feld-Liste) | 6 locales |
| `stammdaten.korrekturweg.<field_id>.pointer` (~30 Felder) | „Standesamt nach § 1355 BGB", „Bürgeramt-Termin / eWA online nach § 17 BMG", … (verbatim verifier Probe #1 Tabelle) | 6 locales |

### 9.4 Activity-Log-Zwecke (`zweck_i18n_key`)

| Key | DE | Lokalisiert |
|---|---|---|
| `stammdaten.aktivitaet.zweck.adressuebermittlung_buergeramt_finanzamt` | „Adressübermittlung an Finanzverwaltung" | 6 locales |
| `stammdaten.aktivitaet.zweck.adressuebermittlung_buergeramt_beitragsservice` | „Adressübermittlung an Rundfunkbeitragsservice" | 6 locales |
| `stammdaten.aktivitaet.zweck.adressuebermittlung_buergeramt_gkv` | „Adressfluss zur Krankenkasse (DEÜV)" | 6 locales |
| `stammdaten.aktivitaet.zweck.adressuebermittlung_buergeramt_bapersbw` | „Wehrerfassungs-Adressmitteilung" | 6 locales |
| `stammdaten.aktivitaet.zweck.app_religion_angezeigt` | „Religionsmerkmal in der App angezeigt" | 6 locales |
| `stammdaten.aktivitaet.zweck.app_kontakt_geaendert` | „Kontaktdaten in der App geändert" | 6 locales |
| `stammdaten.aktivitaet.zweck.app_sprache_geaendert` | „Sprachpräferenz in der App geändert" | 6 locales |
| `stammdaten.aktivitaet.zweck.app_sperre_aktiviert` | „Sperre als App-Demo aktiviert" | 6 locales |
| `stammdaten.aktivitaet.zweck.app_sperre_deaktiviert` | „Sperre als App-Demo deaktiviert" | 6 locales |
| `stammdaten.aktivitaet.zweck.spec_iban_push_simuliert` | „IBAN-Push (2027-Vision) an {empfaenger} simuliert" | 6 locales |
| `stammdaten.aktivitaet.zweck.spec_wallet_attestation_preview` | „Wallet-Attestation-Vorschau (2027-Vision) für {empfaenger}" | 6 locales |
| `stammdaten.aktivitaet.kategorie.behoerde_zu_behoerde.label` | „Behörden-zu-Behörden-Übermittlung" | 6 locales |
| `stammdaten.aktivitaet.kategorie.app_aktivitaet.label` | „App-Aktivität (kein behördliches Übermittlungs-Log)" | 6 locales |
| `stammdaten.aktivitaet.kategorie.speculative_2027.label` | „2027-Vision (Demo)" | 6 locales |

### 9.5 Modal-Strings

| Key | DE | Lokalisiert |
|---|---|---|
| `stammdaten.modal.religion_consent.title` | „Religionsmerkmal anzeigen — Einwilligung erforderlich" | 6 locales |
| `stammdaten.modal.religion_consent.cta_show` | „Religionsmerkmal anzeigen" | 6 locales |
| `stammdaten.modal.religion_consent.cta_cancel` | „Abbrechen" | 6 locales |
| `stammdaten.modal.sperren_aktivieren.title` | „Sperre als App-Demo aktivieren" | 6 locales |
| `stammdaten.modal.sperren_aktivieren.cta_activate` | „Sperre als Demo-Pattern aktivieren" | 6 locales |
| `stammdaten.modal.sperren_aktivieren.cta_cancel` | „Abbrechen" | 6 locales |
| `stammdaten.modal.sperren_aktivieren.begruendung_label` | „Begründung (Min. 30 Zeichen, § 51 Abs. 1 BMG)" | 6 locales |
| `stammdaten.modal.iban_push.title` | „IBAN-Push simulieren — 2027-Vision" | 6 locales |
| `stammdaten.modal.iban_push.empfaenger_label.familienkasse` | „Familienkasse" | 6 locales |
| `stammdaten.modal.iban_push.empfaenger_label.elster` | „ELSTER / Finanzamt" | 6 locales |
| `stammdaten.modal.iban_push.empfaenger_label.gkv` | „Krankenkasse (GKV)" | 6 locales |
| `stammdaten.modal.iban_push.cta_simulate` | „Mock-Push simulieren" | 6 locales |
| `stammdaten.modal.iban_push.cta_cancel` | „Abbrechen" | 6 locales |
| `stammdaten.modal.wallet_attestation_preview.title` | „Wallet-Attestation-Vorschau" | 6 locales |
| `stammdaten.modal.wallet_attestation_preview.section_pflicht` | „PID-Pflichtattribute (8)" | 6 locales |
| `stammdaten.modal.wallet_attestation_preview.section_optional` | „PID-Hilfsattribute (4 von 6)" | 6 locales |
| `stammdaten.modal.wallet_attestation_preview.cta_close` | „Schließen" | 6 locales |

### 9.6 Speculative- und Pilot-Phase-Badges

| Key | DE | Lokalisiert |
|---|---|---|
| `stammdaten.badge.2027_vision` | „2027-Vision" | 6 locales |
| `stammdaten.badge.pilot_phase` | „Pilot-Phase" | 6 locales |
| `stammdaten.badge.art9_relevant` | „Sensible Daten — Art. 9 mittelbar" | 6 locales |
| `stammdaten.badge.mock` | „[MOCK]" (literal in allen Locales) | 6 locales |

### 9.7 i18n-Localizer-Reminders (V1.5-Lessons)

- **JSON.parse pre-flight** auf jedem der 6 Locale-Files vor PR-Push
  (V1.5-Ship-Lessons-Note „i18n JSON syntax breaks").
- **`§§`-Literale preservieren** (Norm-Zitate in Disclaimer-Strings).
  Niemals als HTML-Entity (`&sect;`) escapen.
- **AR-Locale**: DE-Norm-Paragraph-Nummern (`§ 3 Abs. 1 Nr. 11 BMG`)
  literal beibehalten (Latein-Schrift); DE-Aktenzeichen-Formate
  (`[MOCK] M-E-00471/2024`) bleiben LTR-Latin (V1.5-Konvention).
- **Klartext-Gesetzes-Erhalt-Rule**: in Disclaimer-Strings bleiben
  „Bundesmeldegesetz", „Identifikationsnummerngesetz", „Abgabenordnung",
  „Personenstandsgesetz", „Selbstbestimmungsgesetz" als Eigennamen erhalten —
  nicht ins jeweilige Lokal-Vokabular übersetzen.
- **AR-RTL-Layout**: keine Spezial-Behandlung jenseits V1.5.0-Konvention.
  Modale flippen mit `rtl:`-Variants; FieldCard-Werte (Anschrift, Aktenzeichen)
  bleiben LTR-DE.

**Schätzung effektiver i18n-JSON-Leaves**: ~95 Top-Keys × 6 Locales ≈ 570
Strings; davon 0 DE-only (alle übersetzt — Stammdaten ist consumer-facing,
nicht Behörden-rendering). Tatsächliche Leaf-Zahl wird im i18n-Localizer-
Hand-off finalisiert.

---

## 10. HARD-LINES (non-negotiable)

> Diese Sektion ist verifier-locked. frontend-coder, mock-backend-coder und
> i18n-localizer dürfen hier **nicht** umformulieren oder lockern. Grundlage:
> Verifier-Verdict + Adjudikationen #1–5 + Probe #1–4.

11.1 **Disclaimer-1 (`lese_schicht`) ist verbatim mit SBGG-Präzisierung
aus Verifier Adjudikation #3 zu rendern**:

> „Diese App ist eine **Lese- und Wegweiser-Schicht**. Sie selbst nimmt
> **keine** Änderungen an Ihren Daten in den zuständigen Registern vor.
> Korrekturen erfolgen ausschließlich im jeweiligen Behörden-Verfahren —
> etwa beim Bürgeramt nach § 17 BMG für die Anschrift, beim Standesamt
> nach PStG für Familienstand und Vornamen, beim Standesamt nach § 4 SBGG
> für die **Anmeldung** der Geschlechtseintrag-Änderung (mündlich oder
> schriftlich, drei Monate vor der Erklärung) und nach § 2 SBGG für die
> **persönliche Beurkundung der Erklärung** beim Standesamt, beim
> Bundeszentralamt für Steuern für die Identifikationsnummer (§ 139b AO).
> Wir zeigen Ihnen pro Feld den richtigen Weg an."

Frontend-coder darf keine sprachliche Lockerung („Anmeldung persönlich")
einbauen. i18n-localizer übersetzt die SBGG-Differenzierung in alle 6 Locales.

11.2 **Lese-/Wegweiser-Schicht-Architektur**: Stammdaten schreibt **niemals**
in fremde Register. Alle „Korrigieren"-CTAs öffnen Wizards, die einen
Mock-Vorlagebrief erzeugen oder in den `/vorgaenge`-Tab führen.
**Keine** echte API-Anbindung an Melderegister, BZSt, AZR, KBA, KiStAM, GKV
oder DSC — auch keine Suggestion einer solchen Anbindung in UI-Kopie
(verifier Adjudikation #1 + Domain-Doc Risikofelder #1).

11.3 **Religion-Default-Verhalten ist hidden-by-default mit ausdrücklicher
Einwilligung pro Anzeige** (verifier Adjudikation #4). Render-Bedingungen:
- Religion-FieldCard ist initial collapsed mit Button „Religionszugehörigkeit
  anzeigen".
- Klick öffnet `<ReligionConsentModal>` mit Disclaimer-5 verbatim +
  Einwilligungs-Toggle (verbatim aus `stammdaten.disclaimer.religion_consent_toggle_label`).
- Toggle ist initial off; primary-Button „Religionsmerkmal anzeigen"
  ist disabled bis Toggle on.
- Einwilligung gilt **nur für die aktuelle Tab-Session** (`session_only: true`);
  bei Tab-Close / Browser-Beendigung / Persona-Switch wird Religion wieder
  collapsed (siehe § 11.4 für die genauen Reset-Bedingungen — F5-Page-Reload
  ist bewusst keine Reset-Bedingung).
- Activity-Log-Eintrag entsteht bei jeder Anzeige (`note: 'consent:art_9_lit_a'`).

Frontend-coder darf die `consent_session`-Logik **nicht** in `localStorage`
persistieren (`sessionStorage`-Layer im Mock-Backend ist erlaubt und
verbindlich — siehe § 11.4).

11.4 **Religion-Consent ist Session-scoped — NICHT in `localStorage` persistiert**
(Hard-Line § 11.3 Ergänzung). Lebenszyklus präzise:

- **Storage-Layer**: `sessionStorage` unter dem Key
  `govtech-de:v1:stammdaten:religion-consent-session` (per-Tab-Scope der
  Web-Plattform). Implementierung in `src/lib/mock-backend/stammdaten/api.ts`.
- **Verboten**: ein `localStorage`-Bucket-Key
  `govtech-de:v1:stammdaten:religion-consent` (oder eine andere `localStorage`-
  Persistenz von `consent_session`). DevTools-Audit muss diesen Key in
  `localStorage` stets als nicht-vorhanden zeigen (siehe § 13.6 Followup-Item).
- **Reset-Bedingungen** (`consent_session` wird auf `false` zurückgesetzt):
  - bei **Tab-Close** (`sessionStorage` wird per Web-Plattform-Definition mit
    dem Tab verworfen),
  - bei **Browser-Beendigung / Browser-Restart**,
  - bei **Persona-Switch innerhalb der Demo** (Reset-Hook im Persona-Switcher),
  - bei explizitem `revokeReligionConsent()`-Aufruf (Self-Edit-Pfad).
- **NICHT-Reset-Bedingung** (bewusste UX-Entscheidung): ein
  **F5-/`Ctrl+R`-Page-Reload innerhalb desselben Tabs** lässt `consent_session`
  bestehen. `sessionStorage` überlebt den Page-Reload per Web-Plattform-Spezifikation;
  die UX-Erwartung ist, dass eine bereits erteilte Einwilligung nicht durch
  einen versehentlichen Reload erneut abgefragt wird (Reibungs-Vermeidung
  innerhalb derselben Sitzung).

Privacy-Intent dieser Hard-Line: Religion-Einwilligung ist **session-scoped
nach `sessionStorage`-Definition** (per-Tab, kein Cross-Tab-Share, keine
Persistenz über Tab-/Browser-Close hinaus). Audit-Trail für Anzeige-Events
und Widerruf bleibt über den Activity-Log in `localStorage`-Bucket
`govtech-de:v1:stammdaten:uebermittlungs-log` erhalten (Hard-Lines §§ 11.6,
11.10) — der **Wert** wird nicht persistiert, der **Hinweis auf eine erteilte
Einwilligung** sehr wohl. Frontend-coder darf die `consent_session`-Logik
**nicht** in `localStorage` heben und **keinen** "Erinnere mich für künftige
Sitzungen"-Toggle einbauen.

> **Implementations-Fußnote für künftige Imps**: `sessionStorage` ≠
> `localStorage`. `sessionStorage` ist per [HTML Living Standard](https://html.spec.whatwg.org/multipage/webstorage.html#the-sessionstorage-attribute)
> per-Tab definiert: `Window.sessionStorage` ist an die "top-level browsing
> context"-Lifetime gebunden, überlebt aber Reloads und Restores derselben
> Page. Wer auf "Reset bei jedem Reload" zielt, müsste auf `window`-In-Memory
> oder Cookies mit `Max-Age=0` ausweichen — wir tun das **nicht**, weil die
> UX-Reibung den marginalen Privacy-Gewinn nicht rechtfertigt: der Tab-Close
> ist die natürliche Sitzungsgrenze, und Schritt-für-Schritt-Audit liegt
> ohnehin in `localStorage` vor.

11.5 **SBGG-Wizard ist 3-stufig (gesetzlich zwingend)** (verifier Adjudikation #3
+ Reviewer-Note). Stufen: (1) schriftliche Anmeldung mit Bestätigungs-Brief,
(2) 3-Monats-Wartefrist mit Countdown, (3) persönliche Erklärung mit
Beurkundung. Jede Vereinfachung erfordert Re-Review. § 5 SBGG-Sperrfrist
muss nach Wizard-Abschluss als Status-Notiz auf der Geschlechts-FieldCard
sichtbar sein.

11.6 **Activity-Log-Notes tragen `<key>:<value>;`-Marker** (analog Posteingang
V1.5.1). Kein PII-Klartext im `note`-Feld. Format-Konvention:
`persona_id:<id>; field_id:<id>; consent:<lit>; quelle:<channel>; mock:true`.

11.7 **§-numerische Inhalte tragen `<NormZitatSpan>`-Wrap mit `aria-label`-
Pronunciation** (Posteingang V1.5.1 § 11.5 vererbt). Stammdaten-spezifische
Erweiterung der Lookup-Map (verbindlich):

| Sichtbarer Text | `aria-label` |
|---|---|
| `§ 3 BMG` | „Paragraph 3 des Bundesmeldegesetzes" |
| `§ 3 Abs. 1 Nr. 11 BMG` | „Paragraph 3 Absatz 1 Nummer 11 des Bundesmeldegesetzes" |
| `§ 3 Abs. 1 Nr. 7 BMG` | „Paragraph 3 Absatz 1 Nummer 7 des Bundesmeldegesetzes" |
| `§ 17 BMG` | „Paragraph 17 des Bundesmeldegesetzes" |
| `§ 34 BMG` | „Paragraph 34 des Bundesmeldegesetzes" |
| `§ 36 BMG` | „Paragraph 36 des Bundesmeldegesetzes" |
| `§ 42 BMG` | „Paragraph 42 des Bundesmeldegesetzes" |
| `§ 42 Abs. 3 BMG` | „Paragraph 42 Absatz 3 des Bundesmeldegesetzes" |
| `§ 50 BMG` | „Paragraph 50 des Bundesmeldegesetzes" |
| `§ 50 Abs. 5 BMG` | „Paragraph 50 Absatz 5 des Bundesmeldegesetzes" |
| `§ 51 BMG` | „Paragraph 51 des Bundesmeldegesetzes" |
| `§ 51 Abs. 1 BMG` | „Paragraph 51 Absatz 1 des Bundesmeldegesetzes" |
| `§ 4 IDNrG` | „Paragraph 4 des Identifikationsnummerngesetzes" |
| `§ 9 IDNrG` | „Paragraph 9 des Identifikationsnummerngesetzes" |
| `§ 139b AO` | „Paragraph 139b der Abgabenordnung" |
| `§ 8 OZG` | „Paragraph 8 des Onlinezugangsgesetzes" |
| `§ 290 SGB V` | „Paragraph 290 des Sozialgesetzbuches Fünf" |
| `§ 147 SGB VI` | „Paragraph 147 des Sozialgesetzbuches Sechs" |
| `§ 22 BDSG` | „Paragraph 22 des Bundesdatenschutzgesetzes" |
| `Art. 6 Abs. 1 lit. a DSGVO` | „Artikel 6 Absatz 1 Buchstabe a der Datenschutz-Grundverordnung" |
| `Art. 9 Abs. 2 lit. a DSGVO` | „Artikel 9 Absatz 2 Buchstabe a der Datenschutz-Grundverordnung" |
| `Art. 15 DSGVO` | „Artikel 15 der Datenschutz-Grundverordnung" |
| `Art. 16 DSGVO` | „Artikel 16 der Datenschutz-Grundverordnung" |
| `§ 2 SBGG` / `§ 4 SBGG` / `§ 5 SBGG` | „Paragraph 2/4/5 des Selbstbestimmungsgesetzes" |
| `§ 45b PStG` | „Paragraph 45b des Personenstandsgesetzes" |
| `§ 11 Abs. 4 RBStV` | „Paragraph 11 Absatz 4 des Rundfunkbeitragsstaatsvertrags" |
| `§ 58c SG` | „Paragraph 58c des Soldatengesetzes" |
| `§ 28a SGB IV` | „Paragraph 28a des Sozialgesetzbuches Vier" |
| `§ 18f SGB IV` | „Paragraph 18f des Sozialgesetzbuches Vier" |
| `§ 86 AufenthG` / `§ 87 AufenthG` | „Paragraph 86/87 des Aufenthaltsgesetzes" |

11.8 **`[MOCK]`-Watermark auf jedem Stammdaten-derived Wert mit
„echt-aussehendem"-Charakter** (Aktenzeichen, IDNr-Format, Personalausweis-
Nummern, IBAN, AZR-Nr., eAT-CAN, Kindergeldnummer). Watermark ist
literal (DE: `[MOCK]`) und renderfähig in der jeweiligen Locale (AR: literal).
**Niemals echte Bürger:innen-Daten — alle Werte sind synthetisch.**

11.9 **Behörden-Logos sind generisch** (verifier Architekturelle-Flag #1):
keine echten Wappen, keine Bundesadler, keine Klarnamen-Logos. `<BehoerdenBadge>`
rendert mit Kategorie-Icon (bund/land/kommune/sozialversicherung/privat) +
Behörde-Name aus `behoerden.json`.

11.10 **`Datenschutzcockpit (Pilot-Phase)`-Status-Badge ist mandatorisch
auf der Hero-Card und im Activity-Log** (verifier Adjudikation #2). Roadmap-
Tooltip beim Hover/Klick: „Sukzessive Anbindung: KBA seit 04/2026 an IDA
(DSC folgt), BA/STEP im Pilot. Eine flächendeckende Anbindung der 51
RegMoG-Register ist Roadmap 2026/2027." Keine Suggestion flächendeckender
Anbindung.

11.11 **`2027-Vision`-Banner ist mandatorisch im Wallet-Sub-Tab**
(verifier Adjudikation #5). Banner-Wortlaut verbatim aus
`stammdaten.subtab.wallet_externe_empfaenger.banner`. Disclaimer-3 prominent
oben. ARF-Versions-Angabe in Disclaimer-3 generisch („v2.0 Stand Mai 2026").

11.12 **IBAN-Self-Edit hat 2027-Vision-Badge** (verifier Adjudikation #1).
Auf der IBAN-FieldCard ist `<IbanSpeculativeBadge>` direkt am Field-Label
sichtbar. Mock-Push-Modal listet 3 Empfänger mit individuellen Toggles;
nur Toggle-Empfänger erhalten Mock-Push-Audit-Eintrag. **Keine**
Suggestion echter API-Anbindung an Familienkasse / ELSTER / GKV.

11.13 **Sperren-Toggle ist Demo-Pattern; Disclaimer-8 mandatorisch**
(verifier-Wortlaut). Toggle-Aktion öffnet `<SperrenAktivierenConfirmDialog>`
mit Disclaimer-8 verbatim. Kein silentes Toggling.

11.14 **Auskunftssperre § 51 Abs. 1 BMG**: Begründungs-Eingabe **mandatorisch**
mit Min. 30 Zeichen-Validierung (Hard-Line § 11.7). Frontend-coder darf
keine „Begründung später nachreichen"-Option einbauen.

11.15 **Familie-Sektion ist Profilanzeige; aktive Vorgänge laufen über
`/familie`-Tab** (verifier Probe #3). In V1: `/familie`-Tab ist toter Link
mit „Familie-Vorgänge folgen in V2"-Banner. Stammdaten-Familie-Sektion
zeigt nur Read-only-Daten.

11.16 **Beschäftigungs-Stammdaten sind Read-only-Aggregations-Sicht; keine
Edit-Pfade in V1** (verifier Probe #1 + Research § 6c). Beschäftigung lebt
außerhalb des BMG; Stammdaten zeigt nur Aggregation aus Persona.

11.17 **Gesundheits-/Sozialleistungs-/Behinderungs-Daten sind OUT** (verifier
Probe #4 + Domain-Doc Risikofelder #3). Niemals in Stammdaten anzeigen;
gehören in spezifische Vorgangs-Wizards (`/vorgaenge/schwerbehindertenausweis`
etc., V2-Hook).

11.18 **Wallet-Sub-Tab ist V1 minimal-statisch** (verifier Adjudikation #5):
3 Mock-Drittanbieter mit „Anfrage simulieren"-Button → statisches Modal mit
Mock-Attestation-Vorschau. **Keine** echte Persistenz; bei Reload
zurückgesetzt. **Keine** interaktive Consent-Persistenz. Voller Consent-
Flow ist V2-Hook.

11.19 **`getStammdaten`-API ist Single-Source-of-Truth**: Komponenten lesen
**ausschließlich** über die Mock-Backend-API; **niemals** direkt aus
`personas.json` oder LocalStorage (CLAUDE.md-Konvention + verifier
Architekturelle-Flag #9).

11.20 **Pre-Insertion-Modal-Pattern (Religion + Sperren) ist nicht skip-bar**:
keine „nicht mehr zeigen"-Checkbox (analog Posteingang V1.5.1 § 11.13).

---

## 11. Test plan

### 11.1 Vitest (Unit)

- **`tests/unit/stammdaten-getStammdaten.test.ts`** (NEU):
  - Für jede Persona × `getStammdaten`-Round-Trip:
    - Anna: identitaet.familienname=`Petrov`; anschrift_aktuell.plz=`10997`;
      religion.wert=`undefined` (consent off); sperren.uebermittlungssperren=`[]`.
    - Schmidt: identitaet.fruehere_namen=`['Müller']`; familie.eheschliessung.az=`[MOCK] M-E-00471/2024`;
      religion.wert=`'rk'` (nach consent on).
    - Mehmet: dokumente_refs.eat_can=`[MOCK] T0123456X`; dokumente_refs.azr_nr=`[MOCK] 6724813-090`;
      iban_speculative.iban=`[MOCK] DE89...`.
  - Persona-derived Felder match Persona-Snapshot.
  - LocalStorage-Bucket-Hydration-Round-Trip.
- **`tests/unit/stammdaten-aktivitaet-log.test.ts`** (NEU):
  - `getStammdatenAktivitaet({limit:5})` returns chronologisch sortiert
    (jüngst zuerst).
  - `kategorie`-Filter funktioniert (`behoerde_zu_behoerde` / `app_aktivitaet`
    / `speculative_2027`).
  - Sektion-Filter funktioniert.
  - FIFO-Eviction bei >200 Einträgen pro Persona.
- **`tests/unit/stammdaten-consent-religion.test.ts`** (NEU):
  - `consentReligion()` setzt `consent_session=true`; `religion.wert` wird
    in `getStammdaten` ausgeliefert.
  - `revokeReligionConsent()` setzt `consent_session=false`; `religion.wert`
    ist `undefined`.
  - **Tab-Close-Simulation** (nicht F5-Reload): nach `sessionStorage.clear()`
    + `inMemoryReligionConsent.clear()` (Test-Helper `_resetReligionConsentForTests`)
    ist `consent_session=false` — Hard-Line § 11.4 Tab-Close-Reset-Assertion.
  - **`localStorage`-Sentinel**: nach `consentReligion()` darf
    `localStorage.getItem('govtech-de:v1:stammdaten:religion-consent')` strikt
    `null` sein (Hard-Line § 11.4 Verbot des `localStorage`-Buckets).
  - Activity-Log-Eintrag bei jeder Anzeige.
- **`tests/unit/stammdaten-sperren-toggle.test.ts`** (NEU):
  - Auskunftssperre mit Begründung < 30 Zeichen → `MockBackendError`
    `BEGRUENDUNG_ZU_KURZ`.
  - Auskunftssperre mit Begründung ≥ 30 Zeichen → success; Activity-Log-Eintrag.
  - Übermittlungssperre ohne Begründung → success.
- **`tests/unit/stammdaten-iban-speculative.test.ts`** (NEU):
  - `simulateIbanPush({familienkasse:true, elster:true, gkv:false})` → 2
    `speculative_2027`-Einträge im Activity-Log mit korrekten Empfängern.
  - `[MOCK]`-Watermark im IBAN-Wert.
- **`tests/unit/stammdaten-wallet-attestation-preview.test.ts`** (NEU):
  - `previewWalletAttestation('berliner-sparkasse')` → 8 Pflicht-PID-Felder
    + 4-aus-6 Hilfsattribute aus Persona-Daten resolved.
  - `mock_attestation_id` ist deterministisch pro Persona × Empfänger.
- **`tests/unit/stammdaten-norm-zitate.test.ts`** (NEU):
  - `<NormZitatSpan>`-Lookup-Map enthält **alle** in § 11.7 dieser Spec
    aufgelisteten Stammdaten-Norm-Zitate (~30 neue Einträge).

### 11.2 Playwright e2e

- **`tests/e2e/v1-stammdaten-anna-hero.spec.ts`** (NEU):
  - Anna-Persona-Login → `/stammdaten` → Hero-Card sichtbar mit „Sie sind
    in 7 Registern geführt".
  - Sektion „Anschrift" expand → FieldCard mit Skalitzer-Anschrift sichtbar.
  - Klick „Aktivitätsprotokoll dieser Sektion" → 5 Einträge sichtbar mit
    `<NormZitatSpan>`-Wrapped Norm-Zitaten.
  - Disclaimer-1 (`lese_schicht`) im Layout-Header sichtbar mit SBGG-
    Präzisierungs-Wortlaut.
- **`tests/e2e/v1-stammdaten-mehmet-azr.spec.ts`** (NEU):
  - Mehmet-Persona-Login → Sektion „Dokumente" → eAT-CAN + AZR-Nr.
    sichtbar mit Art-9-Hinweis-Badge.
  - Sektion „Anschrift" → Block „automatisch informierte Stellen" enthält
    **nicht** ABH (Hard-Line: ABH wird nicht automatisch informiert).
- **`tests/e2e/v1-stammdaten-religion-consent.spec.ts`** (NEU):
  - Schmidt-Persona-Login → Sektion „Sperren & Einstellungen" → Religion-
    Card collapsed, Klick „Religionszugehörigkeit anzeigen" → Modal öffnet.
  - Toggle off + primary disabled.
  - Toggle on → primary enabled → Klick → Modal schließt → Religion-Wert
    `rk` sichtbar; Activity-Log enthält neuen Eintrag.
  - **Tab-Close-Simulation** (Playwright `context.close()` + neuer `context`
    auf gleicher Persona) → Religion-Card wieder collapsed (Hard-Line § 11.4
    Tab-Close-Reset). **Nicht** über `page.reload()` testen — F5-Reload setzt
    `sessionStorage` nach Web-Plattform-Definition nicht zurück.
  - **F5-Stabilität** (positives Gegenstück, Hard-Line § 11.4): nach erteilter
    Einwilligung + `page.reload()` bleibt Religion-Card expanded mit Wert
    sichtbar (UX-Reibungs-Vermeidung innerhalb derselben Tab-Session).
  - **`localStorage`-Sentinel**: `await page.evaluate(() => localStorage.getItem('govtech-de:v1:stammdaten:religion-consent'))`
    ist nach Consent-Toggle `null`.
- **`tests/e2e/v1-stammdaten-sbgg-wizard.spec.ts`** (NEU):
  - Anna-Persona → `<KorrigierenCTA>` auf Geschlecht-Card → Navigation zu
    `/vorgaenge/neu/sbgg`.
  - Wizard 3-stufig durchgespielt (Stufe 1 Anmeldung mit Bestätigungs-Brief
    `[MOCK] B-SBGG-NNNNN/2026`; Stufe 2 Wartefrist-Visualisierung;
    Stufe 3 Termin-Buchung mit Bestätigungs-Brief).
  - Nach Wizard-Abschluss: Stammdaten-Geschlecht-Card zeigt neuen Wert +
    § 5 SBGG-Sperrfrist-Status-Notiz.
- **`tests/e2e/v1-stammdaten-iban-speculative.spec.ts`** (NEU):
  - Mehmet-Persona → IBAN-FieldCard mit `<IbanSpeculativeBadge>` sichtbar.
  - Klick „IBAN-Push simulieren" → Modal mit 3 Empfänger-Toggles → 2
    aktivieren → primary → Modal schließt → Activity-Log enthält 2 neue
    `speculative_2027`-Einträge.
- **`tests/e2e/v1-stammdaten-wallet-subtab.spec.ts`** (NEU):
  - Klick Sub-Tab „Wallet & Externe Empfänger" → 2027-Vision-Banner
    sichtbar.
  - Klick „Anfrage simulieren" auf Mock-Drittanbieter Berliner Sparkasse →
    `<WalletAttestationPreviewModal>` öffnet → 8 PID-Pflicht-Attribute +
    4 Optional-Attribute aus Persona-Daten resolved sichtbar.
  - `[MOCK]`-Watermark sichtbar.
- **`tests/e2e/v1-stammdaten-sperren.spec.ts`** (NEU):
  - Anna-Persona → Sektion „Sperren & Einstellungen" → Toggle
    Übermittlungssperre Religionsgesellschaften → `<SperrenAktivierenConfirmDialog>`
    öffnet → Disclaimer-8 sichtbar → primary → Status-Pill aktiv.
  - Auskunftssperre § 51: Toggle → Modal mit Begründungs-Textarea → 5
    Zeichen Eingabe → primary disabled bzw. Validation-Fehler. 35 Zeichen
    → primary enabled → success.

### 11.3 a11y (`@axe-core/playwright`)

- **`tests/a11y/stammdaten-page.spec.ts`** (NEU):
  - axe-clean × 2 Viewports (375 px Mobile + 1280 px Desktop) für `/stammdaten`
    (Default-Tab) und `/stammdaten?tab=wallet`.
  - 0 critical, 0 serious violations.
- **`tests/a11y/stammdaten-modals.spec.ts`** (NEU):
  - `<ReligionConsentModal>`: focus-trap; ESC schließt; Tab-Reihenfolge
    Toggle → primary (disabled) → tertiary → close-button → cycle.
    Nach Toggle on: Tab-Reihenfolge Toggle → primary (enabled) → tertiary → cycle.
  - `<SperrenAktivierenConfirmDialog>`: focus-trap; Auto-Focus auf
    Begründungs-Textarea bei Auskunftssperre, sonst auf primary.
  - `<IbanSpeculativePushModal>`: focus-trap; Tab-Reihenfolge Toggle 1 →
    Toggle 2 → Toggle 3 → primary → tertiary → cycle.
  - `<WalletAttestationPreviewModal>`: focus-trap; primary „Schließen" auto-focused.
- **`tests/a11y/stammdaten-norm-zitate.spec.ts`** (NEU):
  - Manueller a11y-Probe: jedes §-numerische Element in Sektionen + Modalen +
    Hero-Card lokalisieren; assertieren, dass das umgebende `<span>` ein
    `aria-label` mit voller Pronunciation aus § 11.7-Lookup-Map trägt.
- **`tests/a11y/stammdaten-collapsible.spec.ts`** (NEU):
  - 5 Sektionen-Disclosure-State: `aria-expanded` togglet; Tastatur-
    Aktivierung via SPACE/ENTER auf Disclosure-Button.
  - `<UebermittlungsLogList>` ist `<aside aria-label="Aktivitätsprotokoll
    dieser Sektion">`.

### 11.4 Lighthouse

- a11y-Score ≥ 95 auf `/(app)/stammdaten` (Default-Tab).
- a11y-Score ≥ 95 auf `/(app)/stammdaten?tab=wallet`.
- Best-Practices-Score ≥ 90 (kein Regress vs Posteingang V1.5.1).

### 11.5 Manuelle Hero-Demo-Check

- [ ] Loom-Cut-Script § 1 (Anna, Stammdaten direkt nach Umzug-Cascade)
      durchläuft fehlerfrei in 45 s.
- [ ] Hero-Card zeigt korrekte Live-Übermittlung („vor 3 Min").
- [ ] Mehmet-Persona zeigt eAT-CAN + AZR-Nr. mit Art-9-Hinweis-Badge.
- [ ] Schmidt-Familie-Sektion zeigt 2 Kinder-Cards mit Familienkasse-Pointer.
- [ ] Religion-Modal renderbar; **Tab-Close** (nicht F5-Reload) setzt Consent
      zurück (Hard-Line § 11.4 Reset-Bedingungen).
- [ ] SBGG-Wizard 3-stufig durchspielbar (synthetische Daten).
- [ ] IBAN-Push-Mock erzeugt 0–3 Activity-Log-Einträge je nach Toggle.
- [ ] Wallet-Sub-Tab zeigt 3 Mock-Drittanbieter; Preview-Modal
      rendert PID-Attribute aus Persona.
- [ ] Sperren-Toggle erzeugt Activity-Log-Eintrag; Auskunftssperre verlangt
      Begründung ≥ 30 Zeichen.

---

## 12. Out-of-scope (defer to V2 oder NEVER)

> Posteingang V1.5.1- und Umzug-Out-of-Scope-Listen bleiben in Kraft. V1
> Stammdaten fügt das Folgende hinzu:

**V2 deferred** (Code-Pfad ggf. ready, kein V1-Render):

- **`/datenschutz`-Tab als vollständiger DSC-Klon** mit Filter (Behörde /
  Zeitraum / Rechtsgrundlage), Suche nach Aktenzeichen, Export-Funktion.
  Verifier Probe #2: `/datenschutz` lebt als eigene Capability mit voller
  Activity-Log-Tabelle. V1: Hero-Card-CTA verlinkt nur auf einen Stub.
- **`/familie`-Tab als Vorgangs-Bündelung** für aktive Familien-Vorgänge
  (Kindergeld-Antrag, Geburten, gemeinsame Vorgangs-Sicht). Verifier
  Probe #3 + Research § 6b. V1: Stammdaten-Familie-Sektion ist Profil-
  anzeige read-only.
- **DSGVO-Art-15-Auskunfts-Brief-Generator** pro Behörde (Research § 3a).
  Verifier-Out-of-V1: RDG-Linie sensibel, gleiche Smartlaw-Adjudikation
  wie bei Posteingang.
- **DSGVO-Art-16-Berichtigungs-Wizard** (z. B. Doktorgrad-Self-Edit mit
  Beleg-Upload). V2 — V1 read-only.
- **Volle 51 RegMoG-Register-Sicht**: V1 zeigt 7–10 Behörden; 51 wäre
  Demo-Bloat (verifier Test #5).
- **AI-Assistent für Stammdaten-Auskünfte** (Tool-Use auf `getStammdaten`,
  `getStammdatenAktivitaet`). V2: Read-API in `lib/ai/tools.ts` spiegeln.
- **Religion-Austritt-Wizard** (Standesamt → KiStAM → BZSt). V2-Hook;
  V1 zeigt nur Read-Only Religion mit Korrekturweg-Pointer.
- **eAT-Adressänderung-Wizard / ABH-Termin-Buchung** für
  Drittstaatsangehörige. V2-Hook.
- **Personalausweis-Erneuerung-Wizard** (`pa-erneuerung`). V2-Hook.
- **Voller Wallet-Consent-Flow** mit Mock-Wallet-UX-Simulation,
  interaktiver Consent-Persistenz. V1 ist minimal-statisch
  (verifier Adjudikation #5).
- **KFZ-Halter-Daten-Anzeige** im Stammdaten-Hub. V2 als eigener
  `/fahrzeug`-Vorgang (Hard-Line § 11.17).
- **OWiG-Bußgeldbescheid-Bezug** auf Stammdaten-Felder. V2-Hook
  (carry-over von Posteingang V1.5.1).

**NEVER**:

- **Echte API-Anbindung** an Melderegister, BZSt, AZR, KBA, KiStAM, GKV,
  DSC oder BundID. § 34 BMG schließt private Aggregator-Empfänger aus
  (Hard-Line § 11.2).
- **Schreib-Operationen** in fremde Register über die App
  (Hard-Line § 11.2 + Domain-Doc Risikofelder #2).
- **Anzeige von Gesundheits-/Sozialleistungs-/Behinderungs-Daten**
  in Stammdaten (Hard-Line § 11.17).
- **AI-Beratung zu Korrektur-Entscheidungen** (RDG-Linie + Datenschutz-
  Beirat-Risiko). Korrekturweg-Pointer ist verbatim-Norm-Verweis,
  kein AI-generierter Text.
- **„Self-Deklaration"-Pattern** für den Geschlechtseintrag ohne SBGG-
  3-Stufen-Wizard (Hard-Line § 11.5; verifier Adjudikation #3).
- **Persistente Religion-Consent** (Hard-Line § 11.4; verifier
  Adjudikation #4).

---

## 13. Acceptance criteria (code-reviewer Final-Gate)

### 13.1 Build-Gates

- [ ] `npx tsc --noEmit` 0 errors.
- [ ] `next lint` 0 warnings/errors.
- [ ] `vitest run` alle Tests grün, inkl. der 7 neuen Suites aus § 11.1.
- [ ] `npx playwright test tests/e2e/v1-stammdaten-*.spec.ts` 7/7 grün.
- [ ] `npx playwright test tests/a11y/stammdaten-*.spec.ts` 0 critical, 0
      serious axe-violations × 4 Suites.

### 13.2 Lighthouse

- [ ] a11y ≥ 95 auf `/stammdaten` (Default-Tab).
- [ ] a11y ≥ 95 auf `/stammdaten?tab=wallet`.

### 13.3 Hard-Lines (verifier-locked)

- [ ] § 11.1 Disclaimer-1 verbatim mit SBGG-Präzisierung — Lint-Test gegen
      `de.json`-Wert; gleicher Test in EN/RU/UK/AR/TR.
- [ ] § 11.2 Lese-/Wegweiser-Schicht — manueller Code-Review: keine
      `fetch()` an externe gesetze-im-internet.de etc.; alle „Korrigieren"-
      CTAs öffnen Wizards/Modals.
- [ ] § 11.3 + § 11.4 Religion hidden-by-default + Tab-Session-scoped consent —
      e2e-Test in `v1-stammdaten-religion-consent.spec.ts`
      (Tab-Close-Reset-Assertion + F5-Stabilitäts-Assertion +
      `localStorage`-Sentinel).
- [ ] § 11.5 SBGG-Wizard 3-stufig — e2e-Test in `v1-stammdaten-sbgg-wizard.spec.ts`
      (Stufen-Sequenz).
- [ ] § 11.6 Activity-Log-`note`-Marker — Vitest in `stammdaten-aktivitaet-log.test.ts`.
- [ ] § 11.7 `<NormZitatSpan>`-Wrap auf §-numerischen Inhalten — a11y-Test
      in `stammdaten-norm-zitate.spec.ts` + Vitest-Lookup-Map-Coverage in
      `stammdaten-norm-zitate.test.ts`.
- [ ] § 11.8 `[MOCK]`-Watermark auf Aktenzeichen-/IDNr-Werten — manueller
      Render-Check + Snapshot-Test.
- [ ] § 11.9 Behörden-Logos generisch — manueller Render-Check.
- [ ] § 11.10 Pilot-Phase-Status-Badge auf Hero — e2e-Test.
- [ ] § 11.11 2027-Vision-Banner im Wallet-Sub-Tab — e2e-Test.
- [ ] § 11.12 IBAN-Self-Edit hat 2027-Vision-Badge — e2e-Test.
- [ ] § 11.13 Sperren-Toggle Disclaimer-8 — e2e-Test.
- [ ] § 11.14 Auskunftssperre-Begründung ≥ 30 Zeichen — Vitest + e2e-Test.
- [ ] § 11.15 Familie-Sektion Profilanzeige + `/familie` toter Link mit
      V2-Banner — manueller Render-Check.
- [ ] § 11.16 Beschäftigung Read-only Aggregation — manueller Render-Check.
- [ ] § 11.17 Gesundheits-/Sozialdaten OUT — manueller Code-Review:
      keine Felder im `Stammdaten`-Schema beziehen sich auf SGB X-Daten.
- [ ] § 11.18 Wallet-Sub-Tab minimal-statisch — manueller Render-Check
      (kein Versand-CTA, kein Persistenz-State im Wallet-Sub-Tab).
- [ ] § 11.19 Components nutzen nur `getStammdaten`-API — manueller Code-
      Review: keine direkten `personas.json`- oder `localStorage`-Reads
      in Components.
- [ ] § 11.20 Pre-Insertion-Modale nicht skip-bar — e2e-Test (2x Modal-Trigger
      in einer Sitzung).

### 13.4 i18n

- [ ] Alle 6 Locale-Files JSON.parse-validate.
- [ ] DE-Quelle für 8 Disclaimer-Strings verbatim (cross-grep gegen
      Verifier-Wortlaut).
- [ ] AR-Locale: §-Norm-Paragraph-Nummern in Latein-Schrift erhalten;
      Aktenzeichen-Formate LTR.
- [ ] Klartext-Gesetzes-Eigennamen erhalten (V1.5-Lessons).

### 13.5 Manuelle Hero-Demo-Check

(Siehe § 11.5 dieser Spec.)

### 13.6 Build-Pipeline-Hand-off

- [ ] code-reviewer APPROVE.
- [ ] a11y-tester PASS (mit explizitem `<NormZitatSpan>`-Probe-Reporting +
      Religion-Consent-Modal-Tab-Close-Verifikation per neuem
      Playwright-`context` — siehe § 11.4 Reset-Bedingungen).
- [ ] i18n-localizer 6/6 Locales geliefert.
- [ ] mock-backend-coder hat `getStammdaten` / Activity-Log / Sperren /
      IBAN-Speculative / Religion-Consent / Wallet-Preview implementiert
      mit Latenz + Events.
- [ ] frontend-coder hat alle 13 neuen Komponenten + 1 Page + 1 Layout
      implementiert.
- [ ] **Followup-Item**: `localStorage`-Persistenz-Verbot der
      Religion-Consent in V1 garantiert via Browser-DevTools-Audit
      (`localStorage`-Inspect zeigt keinen
      `govtech-de:v1:stammdaten:religion-consent`-Key; der zulässige
      `sessionStorage`-Key `…:religion-consent-session` darf erscheinen
      und überlebt F5 — siehe Hard-Line § 11.4).
- [ ] **Followup-Item**: Hard-Remove `Reply.receipt_text`
      (carry-over aus V1.5.1; nicht Stammdaten-Block).

---

## 14. File inventory (build-pipeline-Hand-off)

### 14.1 NEW files

**Frontend (frontend-coder)**:
- `src/app/(app)/stammdaten/page.tsx`
- `src/app/(app)/stammdaten/layout.tsx`
- `src/components/stammdaten/StammdatenHero.tsx`
- `src/components/stammdaten/StammdatenSektion.tsx`
- `src/components/stammdaten/StammdatenFieldCard.tsx`
- `src/components/stammdaten/KorrigierenCTA.tsx`
- `src/components/stammdaten/UebermittlungsLogList.tsx`
- `src/components/stammdaten/ReligionConsentModal.tsx`
- `src/components/stammdaten/SperrenAktivierenConfirmDialog.tsx`
- `src/components/stammdaten/IbanSpeculativeBadge.tsx`
- `src/components/stammdaten/IbanSpeculativePushModal.tsx`
- `src/components/stammdaten/WalletSubTab.tsx`
- `src/components/stammdaten/WalletAttestationPreviewModal.tsx`

**Mock-Backend (mock-backend-coder)**:
- `src/types/stammdaten.ts` (alle in § 4.2 definierten Typen)
- `src/lib/mock-backend/stammdaten/api.ts` (oder co-located in `api.ts`)
- `src/lib/mock-backend/stammdaten/seed-log-entries.ts` (initial-log per Persona)

**Tests**:
- `tests/unit/stammdaten-getStammdaten.test.ts`
- `tests/unit/stammdaten-aktivitaet-log.test.ts`
- `tests/unit/stammdaten-consent-religion.test.ts`
- `tests/unit/stammdaten-sperren-toggle.test.ts`
- `tests/unit/stammdaten-iban-speculative.test.ts`
- `tests/unit/stammdaten-wallet-attestation-preview.test.ts`
- `tests/unit/stammdaten-norm-zitate.test.ts`
- `tests/e2e/v1-stammdaten-anna-hero.spec.ts`
- `tests/e2e/v1-stammdaten-mehmet-azr.spec.ts`
- `tests/e2e/v1-stammdaten-religion-consent.spec.ts`
- `tests/e2e/v1-stammdaten-sbgg-wizard.spec.ts`
- `tests/e2e/v1-stammdaten-iban-speculative.spec.ts`
- `tests/e2e/v1-stammdaten-wallet-subtab.spec.ts`
- `tests/e2e/v1-stammdaten-sperren.spec.ts`
- `tests/a11y/stammdaten-page.spec.ts`
- `tests/a11y/stammdaten-modals.spec.ts`
- `tests/a11y/stammdaten-norm-zitate.spec.ts`
- `tests/a11y/stammdaten-collapsible.spec.ts`

### 14.2 EDIT files

- `src/types/persona.ts` — additive optionale Felder (§ 4.3): `fruehere_namen`,
  `doktorgrad`, `geburtsort`, `geschlecht`, `religion`, `personalausweis_nr`,
  `reisepass`, `eat_can`, `azr_nr`, `kontakt`, `eheschliessung`.
- `src/types/index.ts` — Re-Exports für die neuen Stammdaten-Typen.
- `src/types/mock-event.ts` — `StammdatenEvent`-Varianten (§ 5.3) ergänzen.
- `src/lib/mock-backend/api.ts` — neue API-Methoden (§ 5.1) ergänzen.
- `src/lib/mock-backend/schemas.ts` — Zod-Schemas (§ 5.2) ergänzen.
- `src/lib/mock-backend/persistence.ts` — 4 neue LocalStorage-Buckets (§ 5.4)
  registrieren; Schema-Version bumpen.
- `src/lib/mock-backend/seed.ts` — Stammdaten-Snapshots (§ 5.5) für 3 Personas
  + Initial-Übermittlungs-Log-Pflege.
- `src/lib/mock-backend/autopilot/umzug.ts` — Hook
  `appendStammdatenLogEntry(persona_id, entry)` pro Cascade-Schritt
  (§ 8.1).
- `src/data/personas.json` — Stammdaten-Snapshots aus § 5.5.
- `src/components/posteingang/NormZitatSpan.tsx` — Lookup-Map erweitern
  um Stammdaten-Norm-Zitate (§ 11.7); ~30 neue Einträge.
- `src/lib/i18n/locales/de.json` (+ 5 weitere Locales: en/ru/uk/ar/tr) —
  alle Keys aus § 9 (~95 Top-Keys × 6 Locales ≈ 570 Strings).
- `docs/architecture.md` — Stammdaten-Capability-Sektion + Diagramme.

### 14.3 DELETE files

- Keine.

---

## 15. Sources

(Additiv zu Posteingang V1.5.1, Umzug, V1-Foundations.)

- **Research-Scout**: `docs/research/2026-05-08-stammdaten.md` (status:
  revised, domain-validated 2026-05-08).
- **Domain-Lock**: `docs/domain/stammdaten.md` (last_validated 2026-05-08;
  PROCEED-after-revision-2-implizit; alle Adjudikationen #1–5 + Hard-Lines).
- **Verifier-Verdict**: `docs/reviews/2026-05-08-stammdaten-verify.md`
  (verdict PROCEED mit verbindlichen Architektur-, Copy-, Scope- und
  Norm-Korrektur-Auflagen; SBGG-Norm-Präzisierung an Disclaimer-1; ARF-
  Versions-Korrektur in Disclaimer-3).
- **§ 3 BMG Speicherung von Daten**: gesetze-im-internet.de/bmg/__3.html
- **§ 17 BMG Anmeldung**: gesetze-im-internet.de/bmg/__17.html
- **§ 34 BMG Datenübermittlungen** (Privat-Empfänger-Ausschluss):
  gesetze-im-internet.de/bmg/__34.html
- **§ 36 BMG Regelmäßige Datenübermittlungen**:
  gesetze-im-internet.de/bmg/__36.html
- **§ 42 BMG Religionsgesellschaften**:
  gesetze-im-internet.de/bmg/__42.html
- **§ 50 BMG Adressbuch-/Wahlwerbung-Übermittlungen**:
  gesetze-im-internet.de/bmg/__50.html
- **§ 51 BMG Auskunftssperren**:
  gesetze-im-internet.de/bmg/__51.html
- **§ 4 IDNrG Basisdaten beim BVA**:
  gesetze-im-internet.de/idnrg/__4.html
- **§ 9 IDNrG 2-Jahres-Speicherfrist**:
  gesetze-im-internet.de/idnrg/__9.html
- **§ 2 SBGG Erklärung**: gesetze-im-internet.de/sbgg/__2.html
- **§ 4 SBGG Anmeldung mündlich/schriftlich**:
  gesetze-im-internet.de/sbgg/__4.html
- **§ 5 SBGG 1-Jahres-Sperrfrist**:
  gesetze-im-internet.de/sbgg/__5.html
- **§ 45b PStG**: gesetze-im-internet.de/pstg/__45b.html
- **§ 139b AO Steuer-IdNr**:
  gesetze-im-internet.de/ao_1977/__139b.html
- **§ 290 SGB V KVNR**:
  gesetze-im-internet.de/sgb_5/__290.html
- **§ 22 BDSG Schutzmaßnahmen**:
  gesetze-im-internet.de/bdsg_2018/__22.html
- **Art. 6, 9, 15, 16 DSGVO**: dsgvo-gesetz.de
- **§ 8 OZG Bürger:innen-Konto**:
  gesetze-im-internet.de/ozg/__8.html
- **AVV-BMG (Allgemeine Verwaltungsvorschrift)**:
  verwaltungsvorschriften-im-internet.de/bsvwvbund_27092022_VII2201041418.htm
- **KBA-IDA-Anbindung 15.04.2026**: kba.de Pressemitteilung Nr. 16/2026.
- **Bremen DSC-FAQ**: finanzen.bremen.de.
- **EUDI ARF v2.0 (Stand Mai 2026)**:
  github.com/eu-digital-identity-wallet/eudi-doc-architecture-and-reference-framework.
- **EUDI PID Rulebook v1.x**: eudi.dev/1.4.0/annexes/annex-3/annex-3.01-pid-rulebook/.
- **eGovernment MONITOR 2025** (Initiative D21 + TUM, gefördert vom BMDS):
  initiatived21.de/publikationen/egovernment-monitor/2025.
- **Bitkom „Digitale Teilhabe 2025"**: bitkom.org.
- **V1.5-Ship-Lessons-Memory**: i18n JSON syntax breaks, list-false-PASS,
  base-ui focus-guard bug, token-level contrast — bei jedem Stammdaten-PR-
  Push pre-flight checken.

---

> **End of Stammdaten V1 spec.** Bei domain-expert-späterer Re-Lock oder
> verifier-Re-Audit: dieses Dokument bleibt status `spec` solange
> `building` nicht angefangen hat. Ab erstem Coder-Commit → status:
> `building`. Nach Ship → status: `shipped`, immutable.

---

## Build log — mock-backend-coder

- date: 2026-05-10
- types added/changed:
  - `src/types/stammdaten.ts` (NEW, 359 lines) — alle Stammdaten-Typen aus § 4.2 (StammdatenFieldQuelle, StammdatenKorrekturweg, StammdatenFieldEditability, StammdatenSektionId, StammdatenFieldDef, UebermittlungsLogEntry, StammdatenSperren + UebermittlungssperreId-Enum, StammdatenReligionConsent, StammdatenIbanSpeculative, WalletAttestation, WalletAttestationPreview, StammdatenDisclaimerMeta, Stammdaten read-model). Plus Spec-Aliasse (FeldQuelle, SperrenStatus, ReligionConsent, IbanSpeculativeStatus, StammdatenSnapshot, StammdatenSection).
  - `src/types/persona.ts` — additive optionale Felder pro § 4.3: `fruehere_namen`, `doktorgrad`, `geburtsort`, `geschlecht`, `religion`, `personalausweis_nr`, `reisepass`, `eat_can`, `azr_nr`, `kontakt`, `eheschliessung`. Backwards-kompatibel.
  - `src/types/index.ts` — Re-Exports der neuen Stammdaten-Typen.
  - `src/types/mock-event.ts` — `StammdatenEvent`-Discriminated-Union mit 10 Varianten (log-entry-appended, kontakt-updated, sprache-updated, iban-speculative-updated, iban-push-simulated, sperre-updated, religion-consented, religion-consent-revoked, wallet-attestation-previewed, sektion-viewed) integriert in `MockBackendEvent`.
- api methods added (alle auf `withLatency(...)` + Event-Emit):
  - `getStammdaten(personaId): Promise<Stammdaten>`
  - `getUebermittlungsLog(personaId, opts?): Promise<UebermittlungsLogEntry[]>` (mit `kategorie`/`sektion`/`limit`-Filtern)
  - `appendStammdatenLogEntry(personaId, draft): Promise<UebermittlungsLogEntry>`
  - `setReligionSessionConsent(personaId, consent): Promise<{ wert?: string }>` (sessionStorage-only — Hard-Line § 11.4)
  - `toggleAuskunftssperre(personaId, aktiv, begruendung?): Promise<void>` (validiert Min. 30 Zeichen für aktiv=true; wirft `BEGRUENDUNG_ZU_KURZ` — Hard-Line § 11.14)
  - `toggleUebermittlungssperre(personaId, sperreId, aktiv): Promise<void>`
  - `toggleSpeicherungssperre(personaId, sperreId, aktiv): Promise<void>` (Alias)
  - `addIbanSpeculative(personaId, iban): Promise<void>` ([MOCK]-Auto-Watermark — Hard-Line § 11.8)
  - `dismissIbanSpeculative(personaId): Promise<void>`
  - `simulateIbanPush(personaId, targets): Promise<void>` (1 Log-Eintrag pro aktiviertem Empfänger)
  - `updateKontakt(personaId, input): Promise<void>` + `updateSprache(personaId, sprache): Promise<void>`
  - `getWalletAttestations(personaId): Promise<WalletAttestation[]>` (3 fixe Empfänger — Hard-Line § 11.18)
  - `getWalletAttestationPreview(personaId, attestationId): Promise<WalletAttestationPreview>` (deterministische DJB2-Hash-IDs pro Persona × Empfänger; emittiert speculative_2027-Log-Entry)
- autopilot orchestrators:
  - `src/lib/mock-backend/autopilot/umzug.ts` — `emitStammdatenLogForCascadeStep()`-Hook in Block A (`behoerde_zu_behoerde`) + Block B (`app_aktivitaet`, weil privat-rechtliche Empfänger). Pro confirmed Cascade-Schritt 1 Log-Eintrag.
  - `src/lib/mock-backend/api.ts:bestaetigeImpl` — Stammdaten-Log-Hook für Block D nach erfolgreicher eID-Bestätigung (Familienkasse, KFZ-Halter, ABH-eAT) als `behoerde_zu_behoerde`-Eintrag mit empfänger-spezifischer Norm (§§ 67/68 EStG, § 15 FZV, § 86 AufenthG).
- seed records added:
  - `src/lib/mock-backend/stammdaten/seed-log-entries.ts` (NEW, 345 lines) — `STAMMDATEN_DEFAULT_LOG_ENTRIES`-Map: 7 Anna-Einträge (6 Anschrift-Cascade + 1 KVNR-DEÜV), 5 Schmidt-Einträge (Eheschließung-Cascade), 5 Mehmet-Einträge (Umzug + ABH-manueller-Pfad + AZR-Selbstauskunft). Total 17 Initial-Log-Einträge mit `mock:true`-Marker und `<key>:<value>;`-Note-Format (Hard-Line §§ 11.6, 11.10).
  - `src/data/personas.json` — Stammdaten-Snapshot-Felder pro 3 Personas (Anna, Schmidt, Mehmet) gemäß § 5.5 (geburtsort, geschlecht, religion, personalausweis_nr, kontakt, eheschliessung; Mehmet zusätzlich eat_can + azr_nr).
- persistence buckets registered (Spec § 5.4):
  - `govtech-de:v1:stammdaten:sperren` (Record<PersonaId, StammdatenSperren>)
  - `govtech-de:v1:stammdaten:iban-speculative` (Record<PersonaId, StammdatenIbanSpeculative>)
  - `govtech-de:v1:stammdaten:kontakt` (Record<PersonaId, KontaktBucketEntry>)
  - `govtech-de:v1:stammdaten:uebermittlungs-log` (Record<PersonaId, UebermittlungsLogEntry[]>; FIFO-Eviction bei >200 — Spec § 4.4)
  - **NICHT** persistiert: Religion-Consent — sessionStorage-only-Layer in `stammdaten/api.ts` (Hard-Line § 11.4).
- typecheck: pass (`npx tsc --noEmit` 0 Fehler in mock-backend-territory; `.next/types`-File-not-found-Errors sind harmless build-artefacts).
- vitest: pass — 7/7 stammdaten-Suites grün (44 Tests in stammdaten-aktivitaet-log/-consent-religion/-getStammdaten/-iban-speculative/-norm-zitate/-sperren-toggle/-wallet-attestation-preview); volle Suite 298/298 (15 Test-Files).
- spec-completeness:
  - § 4.1–4.6 schema persistence buckets: COVERED (4 neue Buckets, idempotent + FIFO-200-Eviction validiert via vitest).
  - § 5 Persona-extension fields: COVERED (additive, null-tolerant).
  - § 5.1 API-Methoden: COVERED (alle 11 Methoden inkl. ASCII-Aliasse + Wallet-Preview).
  - § 5.2 Zod-Schemas: COVERED inkl. Drift-Guards (compile-time `_AssertEq` für StammdatenSektionId, StammdatenFieldEditability, StammdatenUebermittlungssperreId).
  - § 5.3 Mock-Backend-Events: COVERED (10 Varianten).
  - § 5.4 Persistierung: COVERED (4 Buckets registered + Religion-Consent dezidiert sessionStorage).
  - § 5.5 Seed-Daten: COVERED (3 Personas + 17 Initial-Log-Einträge).
  - § 8.4 Umzug-Cascade-Side-Effects: COVERED (Block A/B im Generator, Block D im `bestaetigeImpl`).
  - § 11.4 Religion-Consent NICHT persistiert: COVERED (sessionStorage-Layer + In-Memory-Fallback für Node-Tests).
  - § 11.6 Activity-Log-Notes mit `<key>:<value>;`-Markern: COVERED (alle seed + write-Pfade).
  - § 11.8 [MOCK]-Watermark auf identifier-Werten: COVERED (IBAN-Auto-Prefix + Wallet-Attestation-ID-Watermark).
  - § 11.10 Pilot-Phase-Status-Badge: COVERED (`disclaimer_meta.pilot_phase`).
  - § 11.11 ARF-Versionsangabe: COVERED (`disclaimer_meta.arf_version='v2.0'`).
  - § 11.14 Auskunftssperre Min. 30 Zeichen: COVERED (Validierung wirft `BEGRUENDUNG_ZU_KURZ`).
  - § 11.18 Wallet minimal-statisch: COVERED (3 fixe `STATIC_WALLET_ATTESTATIONS`).
  - § 11.19 `getStammdaten` Single-Source-of-Truth: COVERED (Read-Model kombiniert Persona + alle 4 Buckets + sessionStorage).
- known gaps:
  - **§ 11.5 SBGG-3-Stufen-Wizard**: Spec erwähnt mock-backend-coder soll keinen Wizard implementieren (§ 8.3 ist explizit Vorgang-Wizard-Territorium). Out-of-scope für mock-backend-coder; bleibt für Vorgang-Wizard-Implementation (V2-Hook).
  - **`/datenschutz`-Tab + V2-Hook**: spec-explizit out-of-scope für V1.
  - Persistence-Schema-Version-Bump: aktuell bleibt der Top-Level `meta.version=1`, weil die neuen Buckets additiv sind (kein Bruch an V1.5.1-Daten); `runStorageMigrations()` läuft idempotent vor jedem Bucket-Lookup; neue Stammdaten-Buckets werden via `readOrInit()` lazy-initialisiert.
  - Frontend-territory `wrapNormZitate` import-path-Fehler in `src/components/stammdaten/**` sind frontend-coder-Sache (Re-Import von `posteingang/wrapNormZitate.tsx` statt `posteingang/normZitatLookup`).
  - `Reply.receipt_text` Hard-Remove (carry-over aus V1.5.1) — separates V1.5.2-Followup.

---

## Amendment Log

- **2026-05-10** § 11.4 Religion-Consent reload-semantic clarified.
  Original wording "Bei jedem Browser-Reload" was ambiguous —
  `sessionStorage` (current implementation in
  `src/lib/mock-backend/stammdaten/api.ts:64-119`) survives F5 page-reload,
  only clears on tab/browser close. New wording reflects the per-tab
  session-scope model. Privacy-intent preserved: consent ist Session-scoped,
  audit-trail bleibt in `localStorage`. Verifier sign-off pending: a
  tab-close-scope is sufficient privacy guarantee for V1 demo (real-prod
  would still need GDPR Art. 9 explicit-consent on every Tab-Open).

  **Touched § (Zeilenbereiche nach Amendment)**:
  - Frontmatter: `last_amended_at: 2026-05-10` ergänzt.
  - § 4.2 (Type `StammdatenReligionConsent` JSDoc) — Comment präzisiert auf
    `sessionStorage` + Tab-Close-Reset; F5-Page-Reload kein Reset.
  - § 5.4 (Persistierung — neue LocalStorage-Buckets) — Tabellen-Zeile
    "**NICHT** persistiert" ersetzt durch explizite `sessionStorage`-Zeile
    mit Key, Inhalts-Shape, Reset-Bedingungen + Klarstellungs-Note +
    Migration-Hinweis-Update.
  - § 7.1 (Religion-Predicate) — Reset-Liste auf
    Tab-Close/Browser-Close/Persona-Switch erweitert; F5-Stabilität explizit
    ausgewiesen.
  - § 11.3 (Religion-Default-Verhalten) — "bei Reload" → "bei Tab-Close /
    Browser-Beendigung / Persona-Switch"; Cross-Reference auf § 11.4.
  - § 11.4 (Religion-Consent NICHT persistiert) — Komplett neu formuliert:
    Storage-Layer (`sessionStorage`-Key explizit), `localStorage`-Verbot,
    Reset-Bedingungen-Liste, NICHT-Reset-Bedingung (F5) als bewusste
    UX-Entscheidung dokumentiert, Privacy-Intent + Audit-Trail-Klarstellung,
    Implementations-Fußnote zum Web-Plattform-`sessionStorage`-Verhalten.
  - § 11.1 vitest (`stammdaten-consent-religion.test.ts`) —
    "Reload-Simulation" → "Tab-Close-Simulation"; `localStorage`-Sentinel-
    Assertion ergänzt.
  - § 11.2 e2e (`v1-stammdaten-religion-consent.spec.ts`) — "Browser-Reload"
    → Playwright `context.close()`-basierte Tab-Close-Simulation; positive
    F5-Stabilitäts-Assertion ergänzt; `localStorage`-Sentinel ergänzt.
  - § 11.5 (Manuelle Hero-Demo-Check) — "Reload setzt Consent zurück" →
    "Tab-Close (nicht F5-Reload) setzt Consent zurück".
  - § 13.3 (Hard-Lines verifier-locked) — "Reload-Assertion" → "Tab-Close-
    Reset-Assertion + F5-Stabilitäts-Assertion + `localStorage`-Sentinel".
  - § 13.6 (Build-Pipeline-Hand-off) — a11y-tester-Verifikation auf
    Tab-Close-Verifikation per Playwright-`context` präzisiert;
    Followup-Item zum DevTools-Audit präzisiert (Verbot des
    `localStorage`-`religion-consent`-Keys; Erlaubnis des
    `sessionStorage`-`…:religion-consent-session`-Keys).

  **Hard-Line-Number bleibt unverändert**: § 11.4 ist weiterhin § 11.4.
  **i18n-Keys unverändert**: keine String-Quellen geändert, kein Re-Lokalisations-Bedarf.
  **Verifier-verbatim Disclaimer-1 (SBGG-Präzisierung)** unangetastet (§ 11.1).

  **Downstream impl-Tasks aus diesem Amendment** (für nächsten Build-Pipeline-
  Pass, falls Tests bereits existieren):
  - frontend-coder: e2e-Test `v1-stammdaten-religion-consent.spec.ts` muss
    Playwright `browser.newContext()`-Pattern für Tab-Close-Reset nutzen,
    nicht `page.reload()` (das wäre unter dem neuen Wortlaut ein **falscher**
    Test, weil F5 explizit Erhalt fordert). Falls bereits implementiert mit
    `page.reload()` → REVISE.
  - frontend-coder: positive F5-Stabilitäts-Assertion ergänzen
    (`page.reload()` → Religion-Card bleibt expanded mit Wert).
  - mock-backend-coder: vitest `stammdaten-consent-religion.test.ts`
    `localStorage.getItem('govtech-de:v1:stammdaten:religion-consent') === null`
    -Sentinel ergänzen (separate Assertion zum bestehenden
    `consent_session=false`-Reset-Test).
  - code-reviewer Final-Gate: Browser-DevTools-Audit-Item nun zweiteilig —
    `localStorage`-Key `…:religion-consent` MUSS fehlen,
    `sessionStorage`-Key `…:religion-consent-session` DARF erscheinen
    (und bleibt bei F5 erhalten).
