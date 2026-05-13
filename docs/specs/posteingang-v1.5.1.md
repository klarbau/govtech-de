---
feature: posteingang-v1.5.1-rechtsbehelf-aussetzung
title: Posteingang V1.5.1 — Rechtsbehelf-Skelette + Aussetzung der Vollziehung
status: shipped
date: 2026-05-09
shipped_at: 2026-05-09
author: product-architect
upstream:
  research: docs/research/2026-05-09-posteingang-gap-analysis.md (Idea 2 + Idea 8)
  domain: docs/domain/posteingang-v1.5.1-rechtsbehelf-aussetzung.md (PROCEED-after-revision-2)
  verify: docs/reviews/2026-05-09-posteingang-v1.5.1-verify.md (REVISE → addressed in domain v2)
extends_spec: docs/specs/posteingang-v1.5.md (V1.5.0)
ship_target: V1.5.1 (next wave after V1.5.0)
estimated_effort: ~5–6 working days
owner_agents: [frontend-coder, mock-backend-coder, i18n-localizer, a11y-tester, code-reviewer]
---

> **Geltungsbereich V1.5.1**: Diese Spec **amendiert** die geshipte V1.5.0
> (`docs/specs/posteingang-v1.5.md`, status: shipped 2026-05-09). Sie ersetzt
> sie nicht. Alle V1- und V1.5.0-Hard-Lines bleiben in Kraft. V1.5.1 erweitert
> ausschließlich das Reply-Surface um drei Skelett-Templates (Einspruch nach
> AO/OWiG, Widerspruch nach SGG/VwGO, Aussetzung der Vollziehung nach § 361 AO),
> die zugehörigen Pre-Insertion-Modale, einen neuen `{datum_bescheid}`-Token
> mit eigener Quelle (`Letter.bescheid_dated_at`), die Frist-Cited-Format-Header
> im ReplySheet, das § 122a-AO-Bekanntgabe-Caveat-Collapse-Verhalten und einen
> Cross-Template-Versand-Pfad „Beide als getrennte Briefe versenden" für
> Einspruch ↔ Aussetzung.

---

## 1. Mission & scope

V1.5.1 erweitert das Reply-Surface um drei **Rumpf-Skelette** für die häufigsten Rechtsbehelfe — alle drei domain-locked verbatim, alle drei RDG-konform (Werkzeug-Charakter, **keine Begründungs-Generierung**, keine Erfolgsprognose, kein Adressat-Auto-Vorschlag). Bürger:innen erhalten:

- **`rechtsbehelf_einspruch_skelett`** für AO-Bescheide (Steuerbescheid, Familienkasse-Aufhebungs-/Ablehnungsbescheid).
- **`rechtsbehelf_widerspruch_skelett`** für SGG-Bescheide (Krankenkasse, Berufsgenossenschaft) **und** VwGO-Bescheide (IHK-Beitrag, Beitragsservice-Festsetzung, ABH-Ablehnungsbescheid).
- **`aussetzung_vollziehung_skelett`** ausschließlich für AO-Steuerbescheide mit gleichzeitiger Einspruch- und Zahlungsfrist (§ 361 AO).

Vor dem Einfügen jedes Skelettes öffnet ein **Pre-Insertion-Modal**, das die Norm-Familie (AO / SGG / VwGO / AO-Aussetzung) sichtbar macht, das Adressat-Risiko verbatim zitiert und — bei Familienkasse-Aufhebungs-/Ablehnungsbescheiden — den AO-statt-SGG-Erklärer mandatorisch rendert. Im ReplySheet-Header zeigt eine **Frist-Cited-Format-Zeile** die Norm-spezifische Frist; bei `auth_channel === 'mein-elster'` collapsed darunter ein § 122a-AO-Bekanntgabe-Caveat auf `<md` hinter ein `<details>`-Element. Beim Wechsel zwischen Einspruch-Skelett und Aussetzung-Skelett auf demselben Letter erlaubt der Switch-Dialog zusätzlich „**Beide als getrennte Briefe versenden**" — zwei `Reply`-Records, zwei Pre-Versand-Modale, ein Vorgangs-Thread.

**Loom-Cut-Script (30-Sekunden-Wow, Mehmet-FA-Demo)**:

| Sekunde | Aktion | Wow-Effekt |
|---|---|---|
| 0–5 | Mehmet öffnet `letter-mehmet-fa-steuerbescheid-2024` (FA Köln-Mitte, Nachzahlung 4.812 €, Einspruchs- + Zahlungsfrist) | LetterReader, Sticky-Action-Band „Frist 04.06.2026 — Einspruch · Frist 12.06.2026 — Zahlung" |
| 5–8 | Klick „Antwort verfassen" | ReplySheet öffnet, Frist-Cited-Format-Header zeigt verbatim „Sie haben **1 Monat** ab Bekanntgabe … **§ 355 Abs. 1 AO**. Die Frist endet am 04.06.2026."; § 122a-Caveat als `<details>` darunter |
| 8–12 | Picker zeigt Reihenfolge `[Einspruch, Aussetzung, Fristverlängerung, Informative Rückmeldung, Freitext]`; Mehmet wählt **Einspruch** | Pre-Insertion-Modal AO-Familie öffnet — Norm-Zitat „§ 357 Abs. 2 Satz 1 AO" mit `aria-label`-Wrap, Adressat-Hinweis verbatim |
| 12–16 | „Skelett einfügen" → Body wird befüllt (`{datum_bescheid}` aus `bescheid_dated_at: 2026-05-04`, NICHT `empfangen_am`) | Betreff: „Einspruch gegen den Bescheid vom 04.05.2026" — *vier Tage* vor dem Empfangsdatum, weil ELSTER-Bekanntgabe-Fiktion |
| 16–20 | Mehmet wählt im Picker direkt danach **Aussetzung der Vollziehung** | `<ReplyTemplateSwitchConfirmDialog>` rendert mit **drei** Buttons: „Beide als getrennte Briefe versenden" / „Aktuellen Entwurf verwerfen und wechseln" / „Abbrechen" |
| 20–24 | Klick auf primary „Beide als getrennte Briefe versenden" | Pre-Versand-Modal #1 (Einspruch) öffnet → Bestätigung → Pre-Versand-Modal #2 (Aussetzung) öffnet automatisch → Bestätigung |
| 24–30 | LetterReader-Thread zeigt **beide** Replies inline, beide als `[MOCK]`-Watermark, beide mit Vorgangs-Bündel-Tag | Viewer sieht: Einspruch + AdV in einem Atemzug, RDG-Hard-Line gewahrt (kein § im Body), Norm-Zitat lebt nur im Modal |

Sekundäre Demo-Pfade (nicht im Loom-Cut, aber demonstrierbar): Schmidt-Familienkasse-Aufhebungsbescheid (V2-Mock-Letter, **nicht in V1.5.1 ausgeliefert**, Demo-Pfad daher konditional); Schmidt-TK-Beitragsbescheid (SGG-Familie, Widerspruch); Mehmet-IHK-Beitrag (VwGO-Familie + Bayern-Caveat im Modal).

---

## 2. User flows

> Vier kanonische Flows (A–D). Flow A ist der Hero-Loom-Cut; B–D sind Sekundär-Demos, die Norm-Familien-Vielfalt zeigen.

### 2.1 Flow A — Mehmet, FA-Steuerbescheid: Einspruch + AdV als zwei getrennte Briefe (Hero)

**Persona**: Mehmet Yıldız, Köln. **Letter**: `letter-mehmet-fa-steuerbescheid-2024` (FA Köln-Mitte, Nachzahlung 4.812 €, `auth_channel: 'mein-elster'`, Fristen `[einspruch + zahlung]`).

1. LetterReader öffnet → Sticky-Action zeigt zwei FristChips (Einspruch 04.06.2026; Zahlung 12.06.2026) + Primary-CTA „Antwort verfassen".
2. Klick „Antwort verfassen" → `<ReplySheet>` öffnet mit:
   - Frist-Cited-Format-Header (AO-Einspruch, § 7.1 Domain-Doc, verbatim).
   - § 122a-Caveat (`auth_channel === 'mein-elster'`) als `<details>` collapsed auf `<md`, inline-visible auf `>=md`.
   - Picker mit Order `[einspruch_skelett, aussetzung_skelett, frist_verlaengerung, informative_rueckmeldung, freitext]`. Default-highlighted: `einspruch_skelett`.
3. Klick auf `einspruch_skelett` → `<PreInsertionModal>` (AO-Familie, Wortlaut `posteingang.compose.pre_insertion_modal.einspruch_ao` aus § 2.1 Domain-Doc verbatim). Familienkasse-Zusatz **nicht** gerendert (`archetype === 'steuerbescheid'`, nicht `'familienkasse-nachweis'`).
4. „Skelett einfügen" → Body-Skelett (§ 3.1 Domain-Doc verbatim) wird in textarea eingefügt mit `{datum_bescheid}` resolved aus `letter.bescheid_dated_at = '2026-05-04'` → Betreff: „Einspruch gegen den Bescheid vom 04.05.2026". Aktivitäts-Log: `reply_template_inserted` mit `note: 'template_id:rechtsbehelf_einspruch_skelett'`.
5. Mehmet klickt im Picker direkt auf `aussetzung_skelett` (ohne den Einspruch-Body zu löschen) → `<ReplyTemplateSwitchConfirmDialog>` öffnet im **3-Button-Mode** (siehe § 8 dieser Spec).
6. Klick „Beide als getrennte Briefe versenden":
   - Reply #1 (Einspruch) wird in den Pre-Versand-Modal-Flow geschoben → `<PreVersandModal>` (V1.5.0-Wortlaut, mit `{empfaenger_behoerde}: 'Finanzamt Köln-Mitte'`) → Bestätigung → `simulateSendReply()` → Activity-Log `reply_sent_simulated` mit `note: 'template_id:rechtsbehelf_einspruch_skelett; channel:mein-elster'`.
   - Sofort danach automatisch: `<ReplySheet>` re-hydratisiert mit `aussetzung_skelett`-Body (Body-Skelett § 3.3 verbatim), `<PreInsertionModal>` (AO-Aussetzung, § 2.4 verbatim) öffnet → „Skelett einfügen" → `<PreVersandModal>` öffnet erneut → Bestätigung → `simulateSendReply()` für Reply #2 → Activity-Log `reply_sent_simulated` mit `note: 'template_id:aussetzung_vollziehung_skelett; channel:mein-elster'`.
7. ReplyConfirmationView rendert beide Replies untereinander, jeweils mit `[MOCK]`-Watermark + Versand-Datum + Kanal-Realitäts-Check. Sticky-CTA wechselt zu „Erneut antworten + Bereits beantwortet am DD.MM.YYYY".

### 2.2 Flow B — Schmidt, Familienkasse-Aufhebungs-/Ablehnungsbescheid (V2-Mock-Letter — Pfad konditional)

**Hard-Note**: Der einzige Familienkasse-Letter im V1.5.0-Seed ist `letter-schmidt-familienkasse-nachweis` mit `frist.typ === 'nachweis'` (Mitwirkungs-Aufforderung, **kein** Bescheid). Master-Predicate § 5 Domain-Doc schließt Skelett-Templates für diesen Letter aus. Flow B ist daher in V1.5.1 **nicht durch ein Mock-Letter aktivierbar** — er bleibt als Code-Pfad spec'd, damit der Familienkasse-AO-Erklärer (Pre-Insertion-Modal § 2.1 Familienkasse-Zusatz) bei künftiger V2-Mock-Letter-Erweiterung (Aufhebungs-/Ablehnungsbescheid mit `frist.typ === 'einspruch'`) ohne weiteren Architect-Eingriff funktioniert.

**Verbindlichkeit**: Visibility-Matrix § 5 Domain-Doc Hard-Rule 6 ist im Picker- + PreInsertionModal-Code zu implementieren. Test-Coverage in Vitest mit synthetischem Mock-Letter (Test-Fixture, nicht im Seed).

### 2.3 Flow C — Schmidt, TK-Beitragsbescheid (SGG-Familie, Widerspruch)

**Persona**: Familie Schmidt, Hamburg. **Letter**: `letter-schmidt-krankenkasse-beitrag` (TK Hamburg, Beitragsfestsetzung 497,29 €/Monat, `auth_channel: 'briefpost'`, Frist `[widerspruch]`).

1. LetterReader → Sticky-Action „Antwort verfassen" → ReplySheet.
2. Frist-Cited-Format-Header (SGG-Widerspruch, § 7.2 Domain-Doc verbatim). § 122a-Caveat **nicht** gerendert (`auth_channel === 'briefpost'`).
3. Picker-Order `[widerspruch_skelett, frist_verlaengerung, informative_rueckmeldung, freitext]`. Default-highlighted: `widerspruch_skelett`.
4. Klick `widerspruch_skelett` → Pre-Insertion-Modal SGG-Familie (§ 2.2 Domain-Doc verbatim).
5. „Skelett einfügen" → Body § 3.2 verbatim → Disclaimer-Inline rendert + SGG-Zusatz-Disclaimer (§ 4.2 Domain-Doc verbatim, „Beiträge bleiben trotz Widerspruch fällig — § 86a Abs. 2 Nr. 1 SGG").
6. Versand-Flow wie V1.5.0.

### 2.4 Flow D — Mehmet, IHK-Beitrag (VwGO-Familie, Widerspruch + Bayern-Caveat)

**Persona**: Mehmet Yıldız, Köln. **Letter**: `letter-mehmet-ihk-beitrag` (IHK Köln, Beitragsbescheid, `auth_channel: 'briefpost'`, Frist `[widerspruch]`).

1. LetterReader → ReplySheet → Frist-Cited-Format-Header (VwGO-Widerspruch, § 7.3 Domain-Doc verbatim).
2. Picker-Order `[widerspruch_skelett, frist_verlaengerung, informative_rueckmeldung, freitext]`.
3. Pre-Insertion-Modal VwGO-Familie (§ 2.3 Domain-Doc verbatim) — enthält den **statischen** Bayern-Caveat verbatim („in einigen Bundesländern (etwa Bayern) ist das Widerspruchsverfahren in bestimmten Sachgebieten abgeschafft …"). Persona-PLZ wird *nicht* ausgewertet (Domain-Hard-Line § 9.B; PLZ-Logik ist V2-Hook).
4. Disclaimer-Inline + VwGO-Zusatz-Disclaimer (§ 4.3 Domain-Doc verbatim, „Beitrag bleibt trotz Widerspruch fällig — § 80 Abs. 2 Nr. 1 VwGO").
5. Versand-Flow wie V1.5.0.

---

## 3. Component inventory

> Convention identisch zu V1.5.0: `<NEW>` = anzulegen / erstmalig zu füllen; `<EXTEND>` = bestehende V1.5.0-Komponente erweitern; `reuse` = unverändert.

| Komponente | Pfad | Zweck | Status V1.5.1 |
|---|---|---|---|
| `<PreInsertionModal>` | `src/components/posteingang/PreInsertionModal.tsx` | base-ui `<AlertDialog>`, focus-trap, Norm-Familie-Lookup-Switch, 4 Modal-Varianten (AO / SGG / VwGO / AO-Aussetzung), Familienkasse-Zusatz-Sentence konditional, § 122a-Caveat behind `<details>` auf `<md`. **V1.5.0-Skelett wird gefüllt.** | `<NEW>` (fill skeleton) |
| `<ReplyTemplatePicker>` | `src/components/posteingang/ReplyTemplatePicker.tsx` | EXTEND um `pickerOrderByArchetype`-Lookup (siehe § 6 dieser Spec); Default-Highlight setzt sich auf `order[0]`. | `<EXTEND>` |
| `<ReplyTemplateSwitchConfirmDialog>` | `src/components/posteingang/ReplyTemplateSwitchConfirmDialog.tsx` | EXTEND: bei Switch zwischen `rechtsbehelf_einspruch_skelett` ↔ `aussetzung_vollziehung_skelett` auf demselben Letter rendert ein 3-Button-Mode (primary „Beide als getrennte Briefe versenden" / secondary „Aktuellen Entwurf verwerfen und wechseln" / tertiary „Abbrechen"). Für alle übrigen Switches bleibt der V1.5.0-2-Button-Mode (Verwerfen / Abbrechen) unverändert. | `<EXTEND>` |
| `<ReplySheet>` | `src/components/posteingang/ReplySheet.tsx` | EXTEND: Frist-Cited-Format-Header (Norm-spezifisch, § 9 dieser Spec) oberhalb des Pickers; § 122a-Caveat als `<details>` darunter (conditional `letter.auth_channel === 'mein-elster'`); `frist_abgelaufen_warnung` (§ 9 dieser Spec) konditional bei Frist-Status `frist_abgelaufen`; Skelett-Footer-Cross-Template-Hinweis (`posteingang.compose.skelett_footer_no_legal_advice`) bei jedem der drei neuen Templates; Cross-Template-Versand-Pfad (siehe § 8 dieser Spec). | `<EXTEND>` |
| `<FristCitedFormatHeader>` | `src/components/posteingang/FristCitedFormatHeader.tsx` | Einzeiler-Header oberhalb des ReplySheet-Template-Pickers; rendert verbatim aus `posteingang.compose.frist_cited_format.<norm>`-Lookup; Norm-Familie-Lookup mit `pickNormFamilie(letter, templateId)`. Norm-Zitat (z. B. „**§ 355 Abs. 1 AO**") fett gerendert. | `<NEW>` |
| `<BekanntgabeCaveatDetails>` | `src/components/posteingang/BekanntgabeCaveatDetails.tsx` | Native `<details>`-Element; `<summary>`: „Wann beginnt die Frist? Hinweise zur elektronischen Bekanntgabe"; Inhalt: verbatim aus `posteingang.compose.bekanntgabe_caveat`. Default-Open auf `>=md` via CSS (`@media (min-width: 768px) details { open: true }` über `[open]`-Attribut zur Build-Time gesetzt) bzw. einfacher: ein Effect, der `open` auf `>=md` setzt. Ohne JS muss das Caveat ausgeklappt erscheinen — verifier-locked Mobile-Collapse ist Progressive-Enhancement, kein Mandatory-Hide. | `<NEW>` |
| `<FristAbgelaufenWarnung>` | `src/components/posteingang/FristAbgelaufenWarnung.tsx` | Renderbox oberhalb des Frist-Cited-Format-Headers; verbatim aus `posteingang.compose.frist_abgelaufen_warnung`. Conditional: `letter.fristen?.[i].status === 'abgelaufen'` für die jeweilige Norm-Familien-Frist. | `<NEW>` |
| `<NormZitatSpan>` | `src/components/posteingang/NormZitatSpan.tsx` | Wrapper-Component für Norm-Zitate im Modal-Body. Rendert visuell `{children}` (z. B. „§ 357 Abs. 2 Satz 1 AO"); ergänzt `aria-label="{ariaLabel}"` (z. B. „Paragraph 357 Absatz 2 Satz 1 der Abgabenordnung"). Lookup-Map für die ~12 in V1.5.1 verwendeten Norm-Zitate aus § 11.5 dieser Spec. | `<NEW>` |
| `<PreVersandModal>` | `src/components/posteingang/PreVersandModal.tsx` | reuse aus V1.5.0; im Cross-Template-Versand-Pfad wird der Modal **zweimal** gerendert (zwischen Reply 1 und Reply 2). Wortlaut V1.5.0 unverändert. | reuse |
| `<ReplyConfirmationView>` | `src/components/posteingang/ReplyConfirmationView.tsx` | reuse; rendert beide Replies bei Cross-Template-Versand untereinander. | reuse |
| `<LetterReader>` | `src/components/posteingang/LetterReader.tsx` | reuse; konsumiert das erweiterte ReplySheet. | reuse |

**Component-Pfade** folgen V1.5.0-Konvention (kebab-case-Dateien, `PascalCase`-Components in `src/components/posteingang/`).

**Accessibility-Auflagen (verifier new-gap #5, Domain § 10.C a11y-tester-Note)**:
- `<PreInsertionModal>` rendert mit `role="alertdialog"` (base-ui `<AlertDialog>`-Default), `aria-modal="true"`, `aria-labelledby` auf den Modal-Title (`posteingang.compose.pre_insertion_modal.<norm>.title`), `aria-describedby` auf den Body-`<p>`. Focus-trap; ESC schließt mit Cancel-Semantik.
- Jedes §-numerische Norm-Zitat im Modal-Body wird durch `<NormZitatSpan>` umschlossen. Beispiel: `<NormZitatSpan ariaLabel="Paragraph 357 Absatz 2 Satz 1 der Abgabenordnung">§ 357 Abs. 2 Satz 1 AO</NormZitatSpan>`.
- `<BekanntgabeCaveatDetails>` nutzt **native** `<details>` / `<summary>` (kein `role="button"`-Override; Tastatur-Toggle automatisch).
- `<FristCitedFormatHeader>` rendert das fett-Norm-Zitat ebenfalls in `<NormZitatSpan>` mit voller `aria-label`-Pronunciation.
- `<ReplyTemplateSwitchConfirmDialog>` 3-Button-Mode: primary-Button erhält Auto-Focus; tertiary „Abbrechen" als shadcn `variant="ghost"` Text-Link-Style.
- Cross-Template-Versand-Pfad: zwischen Reply 1 und Reply 2 wird `aria-live="polite"` auf einer `sr-only`-Region angekündigt: „Reply 1 versendet. Vorbereitung Reply 2 …".

---

## 4. Data model extensions

### 4.1 New `Letter` field

```ts
// src/types/letter.ts (V1.5.1 EXTEND — additive)

export interface Letter {
  // ... bestehende V1.5.0-Felder unverändert ...

  /**
   * Erlassdatum des Bescheids (aus dem Briefkopf-Stempel der erlassenden
   * Behörde). Optional — nur bei Letter-Archetypes mit Bescheid-Charakter
   * gepflegt (Steuerbescheid, KK-Beitrag, BG-Beitrag, IHK-Beitrag,
   * Beitragsservice-Festsetzung, Familienkasse-Aufhebungs-/Ablehnungsbescheid).
   * Mitwirkungs-Aufforderungen, Bestätigungs-Schreiben, Termin-Vorschläge
   * tragen das Feld nicht.
   *
   * Format: ISO-8601 YYYY-MM-DD. Semantisch unterschieden von `empfangen_am`
   * (Inbox-Receipt-Timestamp): in der Regel 1–7 Tage VOR `empfangen_am`,
   * ausgenommen `auth_channel === 'mein-elster'` (§ 122a Abs. 4 AO
   * Bekanntgabe-Fiktion 4. Tag) — siehe Domain-Doc § 8.
   *
   * V1.5.1 Skelett-Templates lösen den `{datum_bescheid}`-Token aus diesem
   * Feld auf; bei `undefined` Fallback auf `letter.empfangen_am` (graceful
   * degradation — Domain-Doc § 3 Resolver-Hard-Rule).
   */
  bescheid_dated_at?: string;
}
```

### 4.2 Extended `ReplyTemplateId` union

```ts
// src/types/letter.ts (V1.5.1 EXTEND)

export type ReplyTemplateId =
  | 'frist_verlaengerung'
  | 'nachweis_einreichen'
  | 'informative_rueckmeldung'
  | 'termin_antwort'
  // V1.5.1 NEW (3 values):
  | 'rechtsbehelf_einspruch_skelett'
  | 'rechtsbehelf_widerspruch_skelett'
  | 'aussetzung_vollziehung_skelett';
```

> **Note**: `'freitext'` ist in V1.5.0 als `null`-Konvention modelliert (siehe `src/types/letter.ts:277-281` JSDoc); `freitext` bleibt nicht-Teil der `ReplyTemplateId`-Union. Mock-backend's `reply-templates.ts` re-exportiert allerdings einen lokalen Resolver-Union mit `'freitext'`-Variante (siehe `src/lib/mock-backend/reply-templates.ts:69-74`); diese Re-Export-Union wird ebenfalls um die 3 neuen Werte erweitert.

### 4.3 New resolver token `{datum_bescheid}`

| Token | Quelle | Resolver-Regel | Verwendung |
|---|---|---|---|
| `{datum_bescheid}` | `letter.bescheid_dated_at ?? letter.empfangen_am` (formatiert via `formatDateDe()`) | **NEUE Resolver-Branch** in `resolveReplyBodySync()`. Domain-Doc § 3 Resolver-Hard-Rule: getrennt von `datumLetter` als eigene lokale Variable. Fallback bei `undefined` graceful auf `empfangen_am`. | Ausschließlich für die drei V1.5.1-Skelett-Templates (Betreff + Body „Bescheid vom …"). |

`{datum_letter}` (V1.5.0-Token, Quelle `letter.empfangen_am`) bleibt unverändert für alle V1.5.0-Templates und wird *nicht* zugleich auch als `{datum_bescheid}` aufgelöst — strikte Trennung pro Domain-Hard-Rule.

### 4.4 Activity-log enums

V1.5.1 fügt **keine** neuen Activity-Log-Enums hinzu. Die bestehenden V1.5.0-Enums (`reply_compose_started`, `reply_template_inserted`, `reply_draft_saved`, `reply_draft_deleted`, `reply_sent_simulated`) decken alle V1.5.1-Aktionen.

**Hard-Line (verifier new-gap #4)**: das `note`-Field jedes V1.5.1-Activity-Log-Eintrags trägt verpflichtend einen `template_id:<id>`-Marker. Beispiele:

```jsonc
{ "event": "reply_template_inserted", "note": "template_id:rechtsbehelf_einspruch_skelett",   "rechtsgrundlage": "Art. 6 Abs. 1 lit. a DSGVO Einwilligung", ... }
{ "event": "reply_template_inserted", "note": "template_id:rechtsbehelf_widerspruch_skelett", "rechtsgrundlage": "Art. 6 Abs. 1 lit. a DSGVO Einwilligung", ... }
{ "event": "reply_template_inserted", "note": "template_id:aussetzung_vollziehung_skelett",   "rechtsgrundlage": "Art. 6 Abs. 1 lit. a DSGVO Einwilligung", ... }

{ "event": "reply_sent_simulated",    "note": "template_id:rechtsbehelf_einspruch_skelett; channel:mein-elster", ... }
{ "event": "reply_sent_simulated",    "note": "template_id:aussetzung_vollziehung_skelett; channel:mein-elster", ... }
```

Format-Konvention: Semicolon-getrennte `<key>:<value>`-Paare. Datenschutz-Cockpit zeigt `template_id`-Marker als „Einspruch-Skelett eingefügt" / „Widerspruchs-Skelett eingefügt" / „Aussetzungs-Skelett eingefügt" via i18n-Lookup (i18n-Keys siehe § 10 dieser Spec).

---

## 5. Mock-backend additions (mock-backend-coder)

### 5.1 `src/lib/mock-backend/reply-templates.ts`

**Erweiterungen**:

1. `ReplyTemplateId`-Union (Re-Export ab Zeile 69) erweitern um `'rechtsbehelf_einspruch_skelett' | 'rechtsbehelf_widerspruch_skelett' | 'aussetzung_vollziehung_skelett'`.
2. `resolveReplyBodySync()` (Zeile 400 ff.):
   - Nach `const datumLetter = formatDateDe(letter.empfangen_am);` (Zeile 452) eine **neue Resolver-Branch** einfügen:
     ```ts
     // {datum_bescheid}: Erlassdatum des Bescheids (V1.5.1 Skelett-Templates).
     // Fallback auf empfangen_am, falls bescheid_dated_at undefined.
     const datumBescheid = letter.bescheid_dated_at
       ? formatDateDe(letter.bescheid_dated_at)
       : datumLetter;
     ```
   - In `tokenValues` (Zeile 495 ff.) die Schlüssel-Wert-Pair `datum_bescheid: datumBescheid` ergänzen. `datum_letter`-Eintrag bleibt unverändert.
3. **Keine** zusätzlichen `nachweisBezeichnungen`-artigen Listen für die drei neuen Templates — Skelett-Templates haben keine User-Input-Token (alle 12 Placeholder pro Domain-Doc § 3.1 sind Persona/Letter/Behörden-/Datum-/Aktenzeichen-derived).

**Test-Coverage** (`tests/unit/reply-templates-skelett.test.ts`, neu): siehe § 12 dieser Spec.

### 5.2 `src/lib/mock-backend/schemas.ts`

- Zod-Schema für `Letter` erweitern um `bescheid_dated_at: z.string().optional()` (ISO-8601-Validierung optional via `.regex(/^\d{4}-\d{2}-\d{2}$/)`).
- Zod-Enum für `ReplyTemplateId` erweitern um die 3 neuen Werte.
- `_AssertEq`-Compile-Time-Guards (V1.5.0 schemas.ts:248–254 muster) entsprechend halten.

### 5.3 `src/data/letters.json`

**Pflicht-Pflege**: `bescheid_dated_at` für ~10 Letters setzen (Domain-Doc § 3 Tabelle, v2-locked):

| Letter-ID | `empfangen_am` (existing) | `bescheid_dated_at` (NEW) | Begründung (Domain-Doc § 3) |
|---|---|---|---|
| `letter-fa-steuerbescheid-2025` | 2026-03-12 | **2026-03-09** | 3 Tage Postlauf, FA Berlin → Anna Berlin |
| `letter-schmidt-fa-steuerbescheid-2024` | 2026-05-13 | **2026-05-08** | 5 Tage Postlauf, FA Köln → Schmidt Hamburg |
| `letter-mehmet-fa-steuerbescheid-2024` | 2026-05-08 | **2026-05-04** | 4 Tage `mein-elster`-Bekanntgabe-Fiktion (§ 122a Abs. 4 AO) |
| `letter-mehmet-ihk-beitrag` | (per `letters.json`) | `empfangen_am` minus 3–5 Tage | Briefpost regulär |
| `letter-mehmet-bgw-beitrag` | (per `letters.json`) | `empfangen_am` minus 3–5 Tage | Briefpost regulär |
| `letter-mehmet-krankenkasse-freiwillig` | (per `letters.json`) | `empfangen_am` minus 2–4 Tage | KK-Versand |
| `letter-mehmet-beitragsservice-mahnung` | (per `letters.json`) | `empfangen_am` minus 3–5 Tage | Briefpost Köln-Zentrale |
| `letter-schmidt-krankenkasse-beitrag` | (per `letters.json`) | `empfangen_am` minus 2–4 Tage | KK-Versand |
| `letter-schmidt-beitragsservice-festsetzung` | (per `letters.json`) | `empfangen_am` minus 3–5 Tage | Briefpost |
| `letter-beitragsservice-festsetzung` | (per `letters.json`) | `empfangen_am` minus 3–5 Tage | Briefpost |

**Cross-Check-Pflicht (Domain-Doc § 3)**: vor dem Setzen von `bescheid_dated_at` für einen Letter `body_de` grep'en nach `Bescheid vom`, `erlassen am`, `Datum:`-Zeilen — falls vorhanden, `bescheid_dated_at` mit dem dort genannten Datum übereinstimmend setzen. Domain-Audit-Result 2026-05-09: kein V1.5.0-Seed-Letter trägt eine explizite Erlassdatum-Zeile; Pflege ist stand-alone.

Letters **ohne** Bescheid-Charakter (`letter-schmidt-familienkasse-nachweis`, `letter-abh-erinnerung-verlaengerung`, `letter-aok-mitgliedsbescheinigung`, `letter-anna-standesamt-eheschliessung-termin`, sonstige Bestätigungen) bleiben mit `bescheid_dated_at: undefined`.

### 5.4 `src/lib/mock-backend/api.ts`

**Empfehlung (optional, kein Blocker)**: kleiner Helper `getRepliesByTemplate(letterId: string, templateId: ReplyTemplateId): Promise<Reply[]>` für den Cross-Template-Versand-Flow, falls UI an einer Stelle alle Replies zu einem Letter nach `template_id` filtern muss (z. B. beim ReplyConfirmationView-Render). **Kann** auch via `letter.replies[]` clientseitig gefiltert werden — Architect-Empfehlung: der Helper ist nicht zwingend erforderlich; mock-backend-coder entscheidet anhand des UI-Bedarfs.

`saveReplyDraft` / `simulateSendReply` bleiben in ihrer V1.5.0-Signatur unverändert. Cross-Template-Versand-Flow nutzt `simulateSendReply` zweimal sequenziell (siehe § 8 dieser Spec).

---

## 6. ReplySheet template-picker order spec

### 6.1 Master-Predicate (positive-allow)

Aus Domain-Doc § 5 Master-Predicate verbatim:

> Skelett-Templates erscheinen *nur*, wenn `letter.fristen[]` mindestens einen Eintrag mit `typ ∈ {'einspruch', 'widerspruch'}` enthält.

`aussetzung_vollziehung_skelett` zusätzlich gated auf:

> (`archetype === 'steuerbescheid'`) AND (`letter.fristen[]` enthält `typ === 'einspruch'`) AND (`letter.fristen[]` enthält `typ === 'zahlung'`)

(Domain-Doc § 5 Hard-Rule 1, Triple-AND.)

### 6.2 Picker-Order-Map

```ts
// src/lib/mock-backend/reply-template-order.ts (NEW or inline in reply-templates.ts)

type ArchetypeOrderKey =
  | 'steuerbescheid+einspruch+zahlung'
  | 'steuerbescheid+einspruch'
  | 'steuerbescheid+zahlung'
  | 'familienkasse-nachweis+einspruch'  // V2-Mock-Letter — Code-Pfad ready
  | 'familienkasse-nachweis+nachweis'
  | 'krankenkasse-beitrag+widerspruch'
  | 'krankenkasse-beitrag+none'
  | 'berufsgenossenschaft-beitrag+widerspruch'
  | 'ihk-beitrag+widerspruch'
  | 'beitragsservice-mahnung+widerspruch'
  | 'abh-verlaengerung+nachweis'
  | 'abh-verlaengerung+widerspruch'  // V2-Mock-Letter — Code-Pfad ready
  | 'standesamt-urkunde+antragstellung'
  | 'standesamt-urkunde+none'
  | 'buergeramt-meldung+none'
  | 'sonstiges+none'
  | 'default';

// Lookup-Map: order[0] ist default-highlighted im Picker.
// Lookup-Resolver: Build der Key aus letter.archetype + sortierte Frist-Typ-Set.
```

| ArchetypeOrderKey | Picker-Order (V1.5.1) |
|---|---|
| `steuerbescheid+einspruch+zahlung` | `[einspruch_skelett, aussetzung_skelett, frist_verlaengerung, informative_rueckmeldung, freitext]` |
| `steuerbescheid+einspruch` | `[einspruch_skelett, frist_verlaengerung, informative_rueckmeldung, freitext]` |
| `steuerbescheid+zahlung` | `[frist_verlaengerung, informative_rueckmeldung, freitext]` (kein Skelett — Master-Predicate negativ) |
| `familienkasse-nachweis+einspruch` | `[einspruch_skelett, frist_verlaengerung, informative_rueckmeldung, freitext]` (Pre-Insertion-Modal § 2.1 + Familienkasse-AO-Erklärer mandatorisch — siehe § 7 dieser Spec) |
| `familienkasse-nachweis+nachweis` | `[nachweis_einreichen, frist_verlaengerung, informative_rueckmeldung, freitext]` (V1.5.0-Default; default-highlighted: `nachweis_einreichen`) |
| `krankenkasse-beitrag+widerspruch` | `[widerspruch_skelett, frist_verlaengerung, informative_rueckmeldung, freitext]` (Pre-Insertion-Modal § 2.2 SGG; Disclaimer-Zusatz § 4.2) |
| `krankenkasse-beitrag+none` | `[informative_rueckmeldung, freitext]` (Mitgliedsbescheinigung etc. — keine Frist) |
| `berufsgenossenschaft-beitrag+widerspruch` | `[widerspruch_skelett, frist_verlaengerung, informative_rueckmeldung, freitext]` |
| `ihk-beitrag+widerspruch` | `[widerspruch_skelett, frist_verlaengerung, informative_rueckmeldung, freitext]` (Pre-Insertion-Modal § 2.3 VwGO + Bayern-Caveat statisch; Disclaimer-Zusatz § 4.3) |
| `beitragsservice-mahnung+widerspruch` | `[widerspruch_skelett, nachweis_einreichen, informative_rueckmeldung, freitext]` (Befreiungs-Nachweis bleibt sichtbar — Domain-Doc § 5 Tabelle) |
| `abh-verlaengerung+nachweis` | `[nachweis_einreichen, frist_verlaengerung, informative_rueckmeldung, freitext]` (V1.5.0-Default) |
| `abh-verlaengerung+widerspruch` | `[widerspruch_skelett, informative_rueckmeldung, freitext]` (V2-Mock-Letter — Pre-Insertion-Modal § 2.3 mit Bayern-Caveat) |
| `standesamt-urkunde+antragstellung` | `[termin_antwort, informative_rueckmeldung, freitext]` (V1.5.0-Default) |
| `standesamt-urkunde+none` | `[informative_rueckmeldung, freitext]` |
| `buergeramt-meldung+none` | `[informative_rueckmeldung, freitext]` |
| `sonstiges+none` | `[informative_rueckmeldung, freitext]` |
| `default` | `[frist_verlaengerung, nachweis_einreichen, informative_rueckmeldung, termin_antwort, freitext]` (V1.5.0-Fallback) |

**Implementierungs-Note (mock-backend-coder)**: die Funktion `getReplyTemplateOptions(letter): ReplyTemplateId[]` aus V1.5.0 wird ersetzt durch `getReplyTemplatePickerOrder(letter): ReplyTemplateId[]` mit table-driven Lookup. Reihenfolge im Output ist die UI-Render-Reihenfolge; `output[0]` ist default-highlighted.

**Future-Proofing**: kein hartes Cap auf Picker-Größe in V1.5.1 (worst case 5 Templates bei `steuerbescheid+einspruch+zahlung`). Verifier new-gap #3 flagged künftiges `>7`-Risiko (z. B. wenn V1.5.2-Zahlungs-Rail dazu kommt). Architect-Empfehlung: spec-out für V1.5.1; V1.5.2 müsste ein „Mehr Vorlagen…"-Overflow nachziehen, wenn `>7` Templates sichtbar werden.

### 6.3 Default-Highlight-Verhalten

Beim Öffnen des ReplySheets ist `pickerOrder[0]` als Radio-Button vorausgewählt. Klick auf einen anderen Radio-Button löst `<PreInsertionModal>` aus (sofern Skelett-Template) bzw. fügt direkt ein (V1.5.0-Templates ohne Modal). **Hard-Line**: Pre-Insertion-Modal feuert *nur* bei den drei V1.5.1-Skelett-Templates, niemals bei V1.5.0-Templates.

---

## 7. Pre-Insertion-Modal spec (`PreInsertionModal.tsx`)

### 7.1 Norm-Familie-Lookup (table-driven, NICHT if-cascade)

```ts
// src/components/posteingang/preInsertionModalLookup.ts (or co-located in PreInsertionModal.tsx)

export type NormFamilie = 'ao' | 'sgg' | 'vwgo' | 'aussetzung_ao' | 'owig';

interface PreInsertionModalSpec {
  /** i18n-Key der Modal-Body-String (verbatim Domain-Doc § 2). */
  modal_body_key: string;
  /** i18n-Key des Modal-Title-Strings. */
  modal_title_key: string;
  /** Optional: zusätzliche conditional-rendered Erklärer-Sentence. Nur bei AO + Familienkasse. */
  additional_explainer_key?: string;
}

/**
 * Table-driven Lookup. Domain-Doc § 1 Norm-Familie-Mapping.
 * Bei `templateId === 'aussetzung_vollziehung_skelett'` ist die Norm-Familie
 * IMMER 'aussetzung_ao' (Hard-Line Domain-Doc § 1 letztes Bullet).
 */
export function pickNormFamilie(letter: Letter, templateId: ReplyTemplateId): NormFamilie {
  if (templateId === 'aussetzung_vollziehung_skelett') return 'aussetzung_ao';

  switch (letter.archetype) {
    case 'steuerbescheid':
    case 'familienkasse-nachweis':
      return 'ao';
    case 'krankenkasse-beitrag':
    case 'berufsgenossenschaft-beitrag':
      return 'sgg';
    case 'ihk-beitrag':
    case 'beitragsservice-mahnung':
    case 'abh-verlaengerung':
      return 'vwgo';
    // OWiG: V2-Hook (Code-Pfad ready, kein Mock-Letter heute).
    default:
      // Defensive: kein Skelett-Template hat diese Code-Path-Reichweite,
      // weil Master-Predicate § 5 die übrigen Archetypes ausschließt.
      // Throw oder Fallback auf 'ao' — Architect-Empfehlung: throw mit
      // klarem Error-Message, um Drift früh zu fangen.
      throw new Error(`pickNormFamilie: unhandled archetype "${letter.archetype}" for templateId "${templateId}"`);
  }
}

export function getPreInsertionModalSpec(
  norm: NormFamilie,
  letter: Letter,
): PreInsertionModalSpec {
  const additional_explainer_key =
    norm === 'ao' && letter.archetype === 'familienkasse-nachweis'
      ? 'posteingang.compose.pre_insertion_modal.einspruch_ao_familienkasse_zusatz'
      : undefined;

  switch (norm) {
    case 'ao':
      return {
        modal_title_key: 'posteingang.compose.pre_insertion_modal.einspruch_ao.title',
        modal_body_key: 'posteingang.compose.pre_insertion_modal.einspruch_ao.body',
        additional_explainer_key,
      };
    case 'sgg':
      return {
        modal_title_key: 'posteingang.compose.pre_insertion_modal.widerspruch_sgg.title',
        modal_body_key: 'posteingang.compose.pre_insertion_modal.widerspruch_sgg.body',
      };
    case 'vwgo':
      return {
        modal_title_key: 'posteingang.compose.pre_insertion_modal.widerspruch_vwgo.title',
        modal_body_key: 'posteingang.compose.pre_insertion_modal.widerspruch_vwgo.body',
      };
    case 'aussetzung_ao':
      return {
        modal_title_key: 'posteingang.compose.pre_insertion_modal.aussetzung_ao.title',
        modal_body_key: 'posteingang.compose.pre_insertion_modal.aussetzung_ao.body',
      };
    case 'owig':
      // V2-Hook — kein V1.5.1-Render-Pfad.
      throw new Error('OWiG-Familie ist V2-Hook; kein Render in V1.5.1.');
  }
}
```

### 7.2 Modal-Render

```
┌─────────────────────────────────────────────────────────────────┐
│  {modal_title}                                            [×]   │
├─────────────────────────────────────────────────────────────────┤
│  {modal_body — verbatim Domain-Doc § 2.x mit                    │
│   {empfaenger_behoerde}-Token resolved}                         │
│                                                                 │
│  {additional_explainer — nur bei AO + Familienkasse}            │
│                                                                 │
│  {disclaimer_pre_insertion — verbatim Domain-Doc § 4.x}         │
│                                                                 │
│  [Skelett einfügen]                              [Abbrechen]    │
└─────────────────────────────────────────────────────────────────┘
```

- Norm-Zitate im `modal_body` (z. B. „§ 357 Abs. 2 Satz 1 AO") werden im Render durch `<NormZitatSpan>` umschlossen — Wrapper kennt eine statische Map von ~12 Norm-Zitat-Strings auf ihre `aria-label`-Aussprache (siehe § 11.5 dieser Spec für die Lookup-Map).
- `posteingang.compose.pre_insertion_modal.einspruch_ao.cta_continue` — „Skelett einfügen"
- `posteingang.compose.pre_insertion_modal.einspruch_ao.cta_cancel` — „Abbrechen"
- (Analog für die anderen drei Modal-Varianten — siehe § 10 i18n-Keys-Inventar.)
- Modal-Behavior: `aria-modal="true"`, focus-trap auf base-ui `<AlertDialog>`-Default; ESC = Cancel; Klick außerhalb des Modal-Bodys = Cancel; primary-Button = „Skelett einfügen" → fügt Body in textarea ein und schließt Modal; tertiary „Abbrechen" → schließt Modal ohne textarea-Mutation.

### 7.3 Familienkasse-AO-Zusatz (verbatim, mandatorisch)

Render-Bedingung (Domain-Doc § 2.1 + § 5 Hard-Rule 6): `archetype === 'familienkasse-nachweis'` UND `letter.fristen[]` enthält `typ === 'einspruch'`.

Der Zusatz-Sentence (`posteingang.compose.pre_insertion_modal.einspruch_ao_familienkasse_zusatz`) wird **innerhalb** des AO-Modal-Bodys, *unter* dem Standard-Body-`<p>`, in einem zweiten `<p>` gerendert. Verbatim-Wortlaut Domain-Doc § 2.1:

> Hinweis: Kindergeld-Bescheide werden nach den Regeln der Abgabenordnung (AO) angefochten — nicht nach dem Sozialgerichtsgesetz. Frist und Form folgen aus § 357 AO. Das gilt, weil Kindergeld eine Steuervergütung im Sinne des § 31 EStG ist (BFH III R 26/22, 2023).

**Hard-Line (verifier AV1)**: dieser Zusatz ist **mandatorisch**, nicht optional. Frontend-coder darf keine User-Toggle einbauen.

### 7.4 § 122a-Caveat-Collapse-Verhalten

Render-Bedingung: `letter.auth_channel === 'mein-elster'`. Surface: **außerhalb** des PreInsertionModals (im ReplySheet-Header, unter dem Frist-Cited-Format-Header, *nicht* im Modal selbst).

Verbatim-Inhalt aus Domain-Doc § 8 (`posteingang.compose.bekanntgabe_caveat`):

> Hinweis: Dieser Bescheid wurde elektronisch über Mein ELSTER bereitgestellt. Als Bekanntgabe-Datum gilt der **vierte Tag** nach Bereitstellung (§ 122a Abs. 4 AO). Die Frist endet entsprechend vier Tage später als bei einer Briefpost-Bekanntgabe.

Render-Verhalten (verifier AV4, Architect-Note):
- Auf `<md` (= `<768 px`): in nativem `<details>`-Element, default-collapsed; `<summary>` Wortlaut: „Wann beginnt die Frist? Hinweise zur elektronischen Bekanntgabe" (i18n-Key `posteingang.compose.bekanntgabe_caveat_summary`).
- Auf `>=md`: `<details>`-Element default-open (set `open` Attribut). Alternativ: render direkt als `<p>`, kein `<details>`-Wrapper. Architect-Empfehlung: `<details>` immer rendern, mit `open` per CSS-Effect oder server-side User-Agent-Check. Frontend-coder hat Wahl der Implementierungs-Strategie, solange das Verhalten matchet.

**Hard-Line**: das Caveat ist informational, nicht action-critical. Es darf nie das Frist-Cited-Format selbst überlagern — Frist-Cited-Format bleibt auf jeder Viewport-Breite sichtbar.

---

## 8. Cross-template state — „Beide als getrennte Briefe versenden"

### 8.1 Trigger-Bedingung

Bürger:in hat einen aktiven Draft im ReplySheet mit `template_id === 'rechtsbehelf_einspruch_skelett'` (oder `'aussetzung_vollziehung_skelett'`) auf Letter L. Bürger:in klickt im Picker auf das jeweilige andere Skelett-Template (`'aussetzung_vollziehung_skelett'` bzw. `'rechtsbehelf_einspruch_skelett'`) — Switch zwischen genau diesen zwei Template-IDs auf demselben `letter_id`.

Trigger-Logik (mock-backend-side oder client-side):

```ts
function isCompanionSkelettSwitch(
  fromTemplate: ReplyTemplateId,
  toTemplate: ReplyTemplateId,
): boolean {
  const pair = new Set([fromTemplate, toTemplate]);
  return pair.has('rechtsbehelf_einspruch_skelett') &&
         pair.has('aussetzung_vollziehung_skelett');
}
```

### 8.2 3-Button-Mode

`<ReplyTemplateSwitchConfirmDialog>` rendert dann mit drei Buttons (statt V1.5.0-2-Button-Mode):

| Button | i18n-Key | Style | Aktion |
|---|---|---|---|
| Primary | `posteingang.compose.template_switch.dual_send` — „Beide als getrennte Briefe versenden" | `variant="default"` (primary CTA) | Trigger Cross-Template-Versand-Pfad (siehe § 8.3). Auto-Focus. |
| Secondary | `posteingang.compose.template_switch.discard_and_switch` — „Aktuellen Entwurf verwerfen und wechseln" | `variant="secondary"` | V1.5.0-Behavior: löscht Draft, lädt neues Template, schließt Dialog. |
| Tertiary | `posteingang.compose.template_switch.cancel` — „Abbrechen" | `variant="ghost"` (text-link) | Schließt Dialog, behält bestehenden Draft + Template-Auswahl unverändert. |

Für **alle anderen** Template-Switches (z. B. `frist_verlaengerung` → `nachweis_einreichen`, oder `widerspruch_skelett` → `frist_verlaengerung`) bleibt der V1.5.0-2-Button-Mode unverändert (Verwerfen / Abbrechen).

### 8.3 Cross-Template-Versand-Pfad (sequenzielle Send-Operation)

Datenfluss:

1. Speichere den aktuellen Draft (Reply 1, mit dem ursprünglichen `template_id`, z. B. Einspruch) als `ReplyDraft` via `saveReplyDraft()`.
2. Öffne `<PreVersandModal>` für Reply 1. Wortlaut V1.5.0 unverändert (StGB §§ 185/241-Hinweis), `{empfaenger_behoerde}` aus `letter.absender_behoerde_id`-Lookup.
3. User bestätigt Reply 1 → `simulateSendReply(letterId)` für Reply 1. Reply 1 wird zu `Reply` mit `status: 'sent_simulated'` mit eigener `id`. Activity-Log: `reply_sent_simulated` mit `note: 'template_id:rechtsbehelf_einspruch_skelett; channel:<resolved>'`. **Latenz**: 600–1.200 ms (V1.5.0).
4. Sofort danach (innerhalb desselben Sheet-Lifecycle, ohne Sheet-Close) — automatisch:
   - Re-hydratisiere Sheet mit dem **anderen** Skelett-Template (`aussetzung_vollziehung_skelett` oder `rechtsbehelf_einspruch_skelett`, je nachdem).
   - `<PreInsertionModal>` für das neue Template feuert, weil es ein Skelett-Template-Insert ist (analog zum Standard-Picker-Flow).
   - User bestätigt im Pre-Insertion-Modal → Body wird in textarea eingefügt → `saveReplyDraft()` für Reply 2.
   - `<PreVersandModal>` für Reply 2 öffnet automatisch (ohne weitere User-Aktion). **Optional alternativ**: User klickt manuell „Versand simulieren" — Architect-Empfehlung: automatischer Open für saubere Demo-Sequenz; Frontend-coder darf manuell-Klick-Variante wählen, falls UX bei Reply 2 sonst überstürzt wirkt.
   - User bestätigt Reply 2 → `simulateSendReply(letterId)` für Reply 2 → Reply 2 als `Reply` mit `status: 'sent_simulated'`, eigene `id`. Activity-Log.
5. Sheet schließt. `<ReplyConfirmationView>` rendert mit *beiden* Replies (sortiert nach `sent_at` chronologisch).

### 8.4 Schema-Konsequenz

Beide Replies haben:
- denselben `letter_id` (= L).
- distinkte `id` (UUID-style).
- distinkte `template_id` (`rechtsbehelf_einspruch_skelett` und `aussetzung_vollziehung_skelett`).
- distinkte `sent_at` (~600–1.200 ms auseinander).
- denselben `kanal` (aus `letter.absender_behoerde_id` resolved, in der Regel `mein-elster`).

V1.5.0-Schema (`Reply.letter_id` + `LetterReplyMap = Record<letterId, Reply>`) reicht **nicht** mehr aus — eine Map mit einem Reply pro Letter würde Reply 1 durch Reply 2 überschreiben. **mock-backend-coder action**: `LetterReplyMap` zu `Record<letterId, Reply[]>` umstellen, oder `Reply[]` als Top-Level-Array persistieren.

**Architect-Empfehlung**: `Record<letterId, Reply[]>` (Array pro Letter; bei V1.5.0-Konsumenten Migration mit Single-Element-Array beim ersten Read). `getReplyForLetter(letterId)` returns `Reply | null` aus dem **letzten** Array-Element (chronologisch jüngster Reply). Neuer Helper `getRepliesForLetter(letterId): Promise<Reply[]>` für `<ReplyConfirmationView>`-Multi-Render.

**LocalStorage-Migration**:

```ts
// src/lib/mock-backend/persistence-migrations.ts (NEW oder als Branch in seed.ts)
// Beim ersten V1.5.1-Boot:
// - Read `govtech-de:v1:letter-replies` (V1.5.0-Format).
// - Wenn `sent: Record<string, Reply>` → migrate zu `sent: Record<string, Reply[]>` mit `[oldReply]` als Array.
// - Schreibe zurück, bumpe Schema-Version-Marker.
```

### 8.5 UI-Konsequenz im Sticky-CTA

Nach Cross-Template-Versand zeigt der Sticky-CTA des LetterReaders:
- Hauptbutton: „Erneut antworten" (V1.5.0-Reuse).
- Hint-Zeile: „Bereits beantwortet am DD.MM.YYYY mit 2 Antworten (Einspruch + Aussetzung)".

i18n-Key (V1.5.0-Hint-Template wird **nicht** erweitert; V1.5.1-Variant additiv):

- `posteingang.sticky_action.already_replied_dual_template` — „Bereits beantwortet am {datum} mit 2 Antworten ({template_a_label} + {template_b_label})"

(Token: `{template_a_label}` / `{template_b_label}` werden aus `posteingang.compose.templates.<id>.label`-Lookup resolved.)

---

## 9. Frist-Cited-Format & § 122a-Caveat im ReplySheet-Header

### 9.1 Render-Reihenfolge im ReplySheet-Header (top-down)

```
┌─────────────────────────────────────────────────────────────────┐
│  Antwort verfassen                                       [×]    │
│  An: {empfaenger_behoerde}                                       │
│  Bezug: {aktenzeichen}                                           │
├─────────────────────────────────────────────────────────────────┤
│  [optional: <FristAbgelaufenWarnung>]                            │
│   ↓ rendert nur, wenn frist.status === 'abgelaufen'              │
├─────────────────────────────────────────────────────────────────┤
│  <FristCitedFormatHeader>                                        │
│   z. B. „Sie haben **1 Monat** ab Bekanntgabe … § 355 Abs. 1 AO. │
│   Die Frist endet am 04.06.2026."                                │
├─────────────────────────────────────────────────────────────────┤
│  [optional: <BekanntgabeCaveatDetails>]                          │
│   ↓ rendert nur, wenn letter.auth_channel === 'mein-elster'      │
│   default-collapsed auf <md, default-open auf >=md               │
├─────────────────────────────────────────────────────────────────┤
│  <OutboundSpeculativeBanner>                                     │
│   ↓ V1.5.0-Reuse                                                 │
├─────────────────────────────────────────────────────────────────┤
│  <ReplyTemplatePicker> (mit V1.5.1-Order)                        │
│  …                                                               │
```

### 9.2 Frist-Cited-Format-Header — Wortlaute (verbatim Domain-Doc § 7)

Lookup-Funktion liefert den i18n-Key:

```ts
function pickFristCitedFormatKey(letter: Letter, templateId: ReplyTemplateId): string | null {
  const norm = pickNormFamilie(letter, templateId);
  switch (norm) {
    case 'ao':           return 'posteingang.compose.frist_cited_format.einspruch_ao';
    case 'sgg':          return 'posteingang.compose.frist_cited_format.widerspruch_sgg';
    case 'vwgo':         return 'posteingang.compose.frist_cited_format.widerspruch_vwgo';
    case 'aussetzung_ao': return 'posteingang.compose.frist_cited_format.aussetzung_ao';
    case 'owig':         return 'posteingang.compose.frist_cited_format.einspruch_owig'; // V2-Hook
    default:             return null;
  }
}
```

**Verbatim-Strings** (Domain-Doc § 7):

| Key | DE-Wert (verbatim Domain-Doc § 7) |
|---|---|
| `…einspruch_ao` (§ 7.1) | „Sie haben **1 Monat** ab Bekanntgabe des Bescheids Zeit, um Einspruch einzulegen — **§ 355 Abs. 1 AO**. Die Frist endet am {frist_datum}." |
| `…widerspruch_sgg` (§ 7.2) | „Sie haben **1 Monat** ab Bekanntgabe des Bescheids Zeit, um Widerspruch einzulegen — **§ 84 Abs. 1 SGG**. Die Frist endet am {frist_datum}." |
| `…widerspruch_vwgo` (§ 7.3) | „Sie haben **1 Monat** ab Bekanntgabe des Bescheids Zeit, um Widerspruch einzulegen — **§ 70 Abs. 1 Satz 1 VwGO**. Die Frist endet am {frist_datum}." |
| `…einspruch_owig` (§ 7.4 — V2-Hook) | „Sie haben **2 Wochen** ab Zustellung des Bußgeldbescheids Zeit, um Einspruch einzulegen — **§ 67 Abs. 1 Satz 1 OWiG**. Die Frist endet am {frist_datum}." |
| `…aussetzung_ao` (§ 7.5) | „Eine Aussetzung der Vollziehung können Sie jederzeit beantragen, solange das Einspruchsverfahren läuft — **§ 361 Abs. 2 AO**. Eine eigene Frist gibt es nicht, eine schnelle Antragstellung ist aber wichtig, weil Säumniszuschläge nach § 240 AO weiter entstehen." |

**Token `{frist_datum}`**: aufgelöst aus `letter.fristen[]` mit `typ`-Lookup je Norm-Familie:
- AO-Einspruch → `fristen[].typ === 'einspruch'`.
- SGG-/VwGO-Widerspruch → `fristen[].typ === 'widerspruch'`.
- AO-Aussetzung → `fristen[].typ === 'einspruch'` (Verweis auf den laufenden Einspruch; selbst keine Frist).

Format: `formatDateDe()` (`dd.MM.yyyy`). Bei `undefined` → kompletter Satz „Die Frist endet am {frist_datum}." weglassen (Architect-Empfehlung: zwei separate i18n-Keys mit/ohne Frist-Datum-Suffix; `{frist_datum}`-leer-State darf nicht als „Die Frist endet am ." rendern).

### 9.3 `<FristAbgelaufenWarnung>` — Wortlaut (verbatim Domain-Doc § 9.F)

Render-Bedingung: für die Frist, die der gewählten Norm-Familie entspricht (Einspruch / Widerspruch), gilt `frist.status === 'abgelaufen'` (= aktuelle Datum > `frist.datum`). Architect-Note: V1.5.0 hat keine `frist.status`-Property. Frontend-coder leitet das ab via `new Date() > new Date(frist.datum)`.

Verbatim-Wortlaut (Domain-Doc § 9.F, `posteingang.compose.frist_abgelaufen_warnung`):

> Die im Bescheid genannte Frist ist nach unseren Daten am {frist_datum} abgelaufen. Eine verspätete Einlegung ist möglich, wird aber regelmäßig als unzulässig zurückgewiesen — es sei denn, die Rechtsbehelfsbelehrung war fehlerhaft (dann gilt eine Jahres-Frist) oder die Voraussetzungen für Wiedereinsetzung in den vorigen Stand sind erfüllt. Bitte lassen Sie sich vor der Einlegung von einer Verbraucherzentrale, einem Sozialverband oder einer Anwält:in beraten.

Visual: warnende Box (`bg-amber-50 text-amber-900` o. ä.; Frontend-coder wählt Tailwind-Tokens mit Kontrast ≥ 4.5:1 pro WCAG AA).

### 9.4 Skelett-Footer-Cross-Template-Hinweis

Render-Bedingung: ein V1.5.1-Skelett-Template ist gewählt (`rechtsbehelf_einspruch_skelett` ∨ `rechtsbehelf_widerspruch_skelett` ∨ `aussetzung_vollziehung_skelett`). Surface: ReplySheet-Footer, **unter** dem `disclaimer_inline`.

Verbatim-Wortlaut (Domain-Doc § 4.5, `posteingang.compose.skelett_footer_no_legal_advice`):

> Erfolgsaussichten Ihres Rechtsbehelfs lassen Sie bitte von einer Verbraucherzentrale, einem Sozialverband oder einer Anwält:in prüfen — die App liefert dazu keine Bewertung.

---

## 10. i18n keys (i18n-localizer scope)

### 10.1 Inventory (V1.5.1 NEW = 18 keys; Domain-Doc § 13 v2-Zähler)

> **Übersetzung**: alle 18 keys × 6 locales = **108 Strings**. DE = source-of-truth (verbatim aus Domain-Doc §§ 2, 3, 4, 7, 8, 9.F entnommen). Body-Templates der drei Skelett-Templates sind **DE-only** (Behörde parst Deutsch — V1.5.0-Convention); alle übrigen Strings (Modal-Title/Body/CTAs, Disclaimer, Frist-Cited-Format, Bekanntgabe-Caveat, Frist-abgelaufen-Warnung) werden in **alle 6 Sprachen** übersetzt.

| # | i18n-Key | DE-Quelle | Lokalisierungs-Scope |
|---|---|---|---|
| 1 | `posteingang.compose.templates.rechtsbehelf_einspruch_skelett.body_template_de` | Domain-Doc § 3.1 verbatim | DE-only |
| 2 | `posteingang.compose.templates.rechtsbehelf_einspruch_skelett.label` | „Einspruch einlegen" (Architect-Default; domain-expert kann finalisieren) | 6 locales |
| 3 | `posteingang.compose.templates.rechtsbehelf_einspruch_skelett.beschreibung` | „Skelett-Brief mit Pflicht-Angaben — Begründung schreiben Sie selbst." | 6 locales |
| 4 | `posteingang.compose.templates.rechtsbehelf_einspruch_skelett.disclaimer_pre_insertion` | Domain-Doc § 4.1 verbatim | 6 locales |
| 5 | `posteingang.compose.templates.rechtsbehelf_einspruch_skelett.disclaimer_inline` | Domain-Doc § 4.1 (zweiter Block) verbatim | 6 locales |
| 6 | `posteingang.compose.templates.rechtsbehelf_widerspruch_skelett.body_template_de` | Domain-Doc § 3.2 verbatim | DE-only |
| 7 | `posteingang.compose.templates.rechtsbehelf_widerspruch_skelett.label` | „Widerspruch einlegen" | 6 locales |
| 8 | `posteingang.compose.templates.rechtsbehelf_widerspruch_skelett.beschreibung` | „Skelett-Brief mit Pflicht-Angaben — Begründung schreiben Sie selbst." | 6 locales |
| 9 | `posteingang.compose.templates.rechtsbehelf_widerspruch_skelett.disclaimer_pre_insertion` | Domain-Doc § 4.1 verbatim (identisch zu #4) | 6 locales |
| 10 | `posteingang.compose.templates.rechtsbehelf_widerspruch_skelett.disclaimer_inline` | Domain-Doc § 4.1 (zweiter Block) verbatim | 6 locales |
| 11 | `posteingang.compose.templates.rechtsbehelf_widerspruch_skelett.disclaimer_pre_insertion_zusatz_sgg` | Domain-Doc § 4.2 verbatim | 6 locales |
| 12 | `posteingang.compose.templates.rechtsbehelf_widerspruch_skelett.disclaimer_pre_insertion_zusatz_vwgo` | Domain-Doc § 4.3 verbatim | 6 locales |
| 13 | `posteingang.compose.templates.aussetzung_vollziehung_skelett.body_template_de` | Domain-Doc § 3.3 verbatim | DE-only |
| 14 | `posteingang.compose.templates.aussetzung_vollziehung_skelett.label` | „Aussetzung der Vollziehung beantragen" | 6 locales |
| 15 | `posteingang.compose.templates.aussetzung_vollziehung_skelett.beschreibung` | „§ 361 AO — Skelett-Antrag, Begründung schreiben Sie selbst." | 6 locales |
| 16 | `posteingang.compose.templates.aussetzung_vollziehung_skelett.disclaimer_pre_insertion` | Domain-Doc § 4.4 verbatim | 6 locales |
| 17 | `posteingang.compose.templates.aussetzung_vollziehung_skelett.disclaimer_inline` | Domain-Doc § 4.4 (zweiter Block) verbatim | 6 locales |
| 18 | `posteingang.compose.pre_insertion_modal.einspruch_ao.body` | Domain-Doc § 2.1 verbatim | 6 locales |

> **Note**: Die obige Tabelle listet 18 atomare DE-Quellen, mappt aber auf eine größere Zahl effektiver i18n-Keys — die Modal-Body-Strings (§ 2.1 / § 2.2 / § 2.3 / § 2.4) brauchen je `title` + `body` + `cta_continue` + `cta_cancel` (= 4 Sub-Keys × 4 Modal-Varianten = 16 Sub-Keys). Domain-Doc § 13 zählt im 18er-Set die Modal-Bodies als **eine** logische Einheit pro Norm-Familie (4 Modal-Varianten = 4 Keys aus dem 18er-Set, plus der eine Familienkasse-Zusatz-String = 5 Modal-Strings). Architect-Implementations-Konsequenz: die i18n-Localizer-Liste expandiert auf eine größere Anzahl tatsächlicher JSON-Leaves.

### 10.2 Effektive i18n-JSON-Leaves (i18n-localizer Hand-off-Tabelle)

| Effektiver i18n-Leaf | Quelle (Domain-Doc) | Lokalisiert |
|---|---|---|
| `posteingang.compose.templates.rechtsbehelf_einspruch_skelett.body_template_de` | § 3.1 | DE-only |
| `posteingang.compose.templates.rechtsbehelf_einspruch_skelett.label` | Architect-Default | 6 locales |
| `posteingang.compose.templates.rechtsbehelf_einspruch_skelett.beschreibung` | Architect-Default | 6 locales |
| `posteingang.compose.templates.rechtsbehelf_einspruch_skelett.disclaimer_pre_insertion` | § 4.1 | 6 locales |
| `posteingang.compose.templates.rechtsbehelf_einspruch_skelett.disclaimer_inline` | § 4.1 | 6 locales |
| `posteingang.compose.templates.rechtsbehelf_widerspruch_skelett.body_template_de` | § 3.2 | DE-only |
| `posteingang.compose.templates.rechtsbehelf_widerspruch_skelett.label` | Architect-Default | 6 locales |
| `posteingang.compose.templates.rechtsbehelf_widerspruch_skelett.beschreibung` | Architect-Default | 6 locales |
| `posteingang.compose.templates.rechtsbehelf_widerspruch_skelett.disclaimer_pre_insertion` | § 4.1 (identisch zu Einspruch) | 6 locales |
| `posteingang.compose.templates.rechtsbehelf_widerspruch_skelett.disclaimer_inline` | § 4.1 | 6 locales |
| `posteingang.compose.templates.rechtsbehelf_widerspruch_skelett.disclaimer_pre_insertion_zusatz_sgg` | § 4.2 | 6 locales |
| `posteingang.compose.templates.rechtsbehelf_widerspruch_skelett.disclaimer_pre_insertion_zusatz_vwgo` | § 4.3 | 6 locales |
| `posteingang.compose.templates.aussetzung_vollziehung_skelett.body_template_de` | § 3.3 | DE-only |
| `posteingang.compose.templates.aussetzung_vollziehung_skelett.label` | Architect-Default | 6 locales |
| `posteingang.compose.templates.aussetzung_vollziehung_skelett.beschreibung` | Architect-Default | 6 locales |
| `posteingang.compose.templates.aussetzung_vollziehung_skelett.disclaimer_pre_insertion` | § 4.4 | 6 locales |
| `posteingang.compose.templates.aussetzung_vollziehung_skelett.disclaimer_inline` | § 4.4 | 6 locales |
| `posteingang.compose.pre_insertion_modal.einspruch_ao.title` | „Einspruch bei der richtigen Stelle einlegen" (§ 2.1) | 6 locales |
| `posteingang.compose.pre_insertion_modal.einspruch_ao.body` | § 2.1 verbatim | 6 locales |
| `posteingang.compose.pre_insertion_modal.einspruch_ao.cta_continue` | „Skelett einfügen" | 6 locales |
| `posteingang.compose.pre_insertion_modal.einspruch_ao.cta_cancel` | „Abbrechen" | 6 locales |
| `posteingang.compose.pre_insertion_modal.einspruch_ao_familienkasse_zusatz` | § 2.1 (konditionaler Zusatz, verbatim, MANDATORISCH) | 6 locales |
| `posteingang.compose.pre_insertion_modal.widerspruch_sgg.title` | „Widerspruch bei der richtigen Stelle einlegen" (§ 2.2) | 6 locales |
| `posteingang.compose.pre_insertion_modal.widerspruch_sgg.body` | § 2.2 verbatim | 6 locales |
| `posteingang.compose.pre_insertion_modal.widerspruch_sgg.cta_continue` | „Skelett einfügen" | 6 locales |
| `posteingang.compose.pre_insertion_modal.widerspruch_sgg.cta_cancel` | „Abbrechen" | 6 locales |
| `posteingang.compose.pre_insertion_modal.widerspruch_vwgo.title` | „Widerspruch bei der richtigen Stelle einlegen" (§ 2.3) | 6 locales |
| `posteingang.compose.pre_insertion_modal.widerspruch_vwgo.body` | § 2.3 verbatim (inkl. Bayern-statisch-Caveat) | 6 locales |
| `posteingang.compose.pre_insertion_modal.widerspruch_vwgo.cta_continue` | „Skelett einfügen" | 6 locales |
| `posteingang.compose.pre_insertion_modal.widerspruch_vwgo.cta_cancel` | „Abbrechen" | 6 locales |
| `posteingang.compose.pre_insertion_modal.aussetzung_ao.title` | „Aussetzung der Vollziehung — Hinweise" (§ 2.4) | 6 locales |
| `posteingang.compose.pre_insertion_modal.aussetzung_ao.body` | § 2.4 verbatim | 6 locales |
| `posteingang.compose.pre_insertion_modal.aussetzung_ao.cta_continue` | „Skelett einfügen" | 6 locales |
| `posteingang.compose.pre_insertion_modal.aussetzung_ao.cta_cancel` | „Abbrechen" | 6 locales |
| `posteingang.compose.frist_cited_format.einspruch_ao` | § 7.1 verbatim | 6 locales |
| `posteingang.compose.frist_cited_format.widerspruch_sgg` | § 7.2 verbatim | 6 locales |
| `posteingang.compose.frist_cited_format.widerspruch_vwgo` | § 7.3 verbatim | 6 locales |
| `posteingang.compose.frist_cited_format.aussetzung_ao` | § 7.5 verbatim | 6 locales |
| `posteingang.compose.bekanntgabe_caveat` | § 8 verbatim | 6 locales |
| `posteingang.compose.bekanntgabe_caveat_summary` | „Wann beginnt die Frist? Hinweise zur elektronischen Bekanntgabe" | 6 locales |
| `posteingang.compose.frist_abgelaufen_warnung` | § 9.F verbatim | 6 locales |
| `posteingang.compose.skelett_footer_no_legal_advice` | § 4.5 verbatim | 6 locales |
| `posteingang.compose.skelett_visibility_explainer.kein_rechtsbehelf_bei_mitwirkung` | § 9.A verbatim | 6 locales |
| `posteingang.compose.template_switch.dual_send` | „Beide als getrennte Briefe versenden" (Architect-Default) | 6 locales |
| `posteingang.compose.template_switch.discard_and_switch` | „Aktuellen Entwurf verwerfen und wechseln" | 6 locales |
| `posteingang.compose.template_switch.cancel` | „Abbrechen" (V1.5.0-Reuse `posteingang.reply.discard_confirm_cta_no` möglich; Architect-Empfehlung: dedizierter Key für Klarheit im Cross-Template-Flow) | 6 locales |
| `posteingang.sticky_action.already_replied_dual_template` | „Bereits beantwortet am {datum} mit 2 Antworten ({template_a_label} + {template_b_label})" | 6 locales |

> **Activity-Log-Marker-i18n** (Datenschutz-Cockpit-Anzeige des `template_id:<id>`-Notes): die Mapping-Strings `posteingang.compose.templates.<id>.label` (oben enthalten) decken das ab. Datenschutz-Cockpit liest `note: 'template_id:rechtsbehelf_einspruch_skelett'`, parst den `<id>`, und lookt das `label` aus i18n. Kein zusätzlicher Activity-Log-Key nötig.

### 10.3 i18n-localizer Reminders (V1.5-Lessons-Memory)

- **JSON.parse pre-flight** auf jedem der 6 Locale-Files vor PR-Push (V1.5-Ship-Lessons-Note: „i18n JSON syntax breaks").
- **`§§`-Literale preservieren** (Beleidigungs/Drohungs-§§ aus V1.5.0-Pre-Versand-Modal-Wortlaut, V1.5.1-Norm-Zitate). Niemals als HTML-Entity (`&sect;`) escapen.
- **AR-Locale**: DE-Norm-Paragraph-Nummern (`§ 357 Abs. 2 Satz 1 AO`) **literal** beibehalten (Latein-Schrift), parenthetisch ergänzt um Arabische Aussprache-Glosse falls Domain-Doc das vorgibt. Architect-Empfehlung: 1:1 nach AR übertragen, weil die Norm-Paragraph-Nummern in der Behörden-Sprache stabil sind und Bürger:in das Modal als deutsch-rechtliches Artefakt erkennt.
- **AR-RTL-Layout**: keine Spezial-Behandlung jenseits V1.5.0-Konvention. Modal flippt mit `rtl:`-Variant; textarea bleibt LTR-DE.
- **Klartext-Gesetzes-Erhalt-Rule (V1.5.0 Lock § 10.2)**: in Disclaimer-Strings bleiben „Abgabenordnung", „Sozialgerichtsgesetz", „Verwaltungsgerichtsordnung", „Sozialgesetzbuch" als Eigennamen erhalten — nicht ins jeweilige Lokal-Vokabular übersetzen.

---

## 11. HARD-LINES (non-negotiable)

> Diese Sektion ist Verifier-locked. frontend-coder, mock-backend-coder, i18n-localizer dürfen hier **nicht** umformulieren oder lockern.

11.1 **Body-Skelett-Strings VERBATIM**: `posteingang.compose.templates.rechtsbehelf_einspruch_skelett.body_template_de` aus Domain-Doc § 3.1. `posteingang.compose.templates.rechtsbehelf_widerspruch_skelett.body_template_de` aus Domain-Doc § 3.2. `posteingang.compose.templates.aussetzung_vollziehung_skelett.body_template_de` aus Domain-Doc § 3.3. **Zero deviation, zero AI-Polish.**

11.2 **Zero `§`-Symbole im Body** (V1.5.0-Lock § 11.2 vererbt). `§`-Symbole leben ausschließlich in: (a) Pre-Insertion-Modal-Bodies (§ 2.1/2.2/2.3/2.4 + Familienkasse-Zusatz); (b) Disclaimer-Pre-Insertion + Disclaimer-Inline (§ 4); (c) Frist-Cited-Format (§ 7); (d) § 122a-Bekanntgabe-Caveat (§ 8); (e) Skelett-Footer-Cross-Template-Hinweis (§ 4.5); (f) Frist-abgelaufen-Warnung (§ 9.F).

11.3 **Kein „Eine Begründung reiche ich gesondert nach"**-Selbst-Bindungs-Satz im Skelett-Body (verifier AV11; Domain-Doc v2-Korrektur). Rumpf-Form ist Lock; BFH II R 90/83 trägt die Wirksamkeit.

11.4 **Familienkasse-AO-Erklärer-Render ist MANDATORISCH** wenn `archetype === 'familienkasse-nachweis'` UND `letter.fristen[].typ` enthält `'einspruch'` (verifier AV1; Domain-Doc § 5 Hard-Rule 6). Frontend-coder darf keine User-Toggle einbauen, die den Erklärer ausblendet.

11.5 **§-numerische Modal-Inhalte tragen `aria-label`-Wrap** (verifier new-gap #5; Domain-Doc § 10.C a11y-tester-Note). `<NormZitatSpan>`-Lookup-Map (verbindlich):

| Sichtbarer Text | `aria-label` |
|---|---|
| `§ 357 Abs. 2 Satz 1 AO` | „Paragraph 357 Absatz 2 Satz 1 der Abgabenordnung" |
| `§ 357 Abs. 2 Satz 4 AO` | „Paragraph 357 Absatz 2 Satz 4 der Abgabenordnung" |
| `§ 84 Abs. 2 Satz 1 SGG` | „Paragraph 84 Absatz 2 Satz 1 des Sozialgerichtsgesetzes" |
| `§ 84 Abs. 2 Satz 2 SGG` | „Paragraph 84 Absatz 2 Satz 2 des Sozialgerichtsgesetzes" |
| `§ 70 Abs. 1 Satz 1 VwGO` | „Paragraph 70 Absatz 1 Satz 1 der Verwaltungsgerichtsordnung" |
| `§ 361 Abs. 2 Satz 1 AO` | „Paragraph 361 Absatz 2 Satz 1 der Abgabenordnung" |
| `§ 361 Abs. 2 Satz 2 AO` | „Paragraph 361 Absatz 2 Satz 2 der Abgabenordnung" |
| `§ 240 AO` | „Paragraph 240 der Abgabenordnung" |
| `§ 31 EStG` | „Paragraph 31 des Einkommensteuergesetzes" |
| `§ 357 AO` | „Paragraph 357 der Abgabenordnung" |
| `§ 122a Abs. 4 AO` | „Paragraph 122a Absatz 4 der Abgabenordnung" |
| `§ 355 Abs. 1 AO` | „Paragraph 355 Absatz 1 der Abgabenordnung" |
| `§ 84 Abs. 1 SGG` | „Paragraph 84 Absatz 1 des Sozialgerichtsgesetzes" |
| `§ 80 Abs. 2 Nr. 1 VwGO` | „Paragraph 80 Absatz 2 Nummer 1 der Verwaltungsgerichtsordnung" |
| `§ 86a Abs. 2 Nr. 1 SGG` | „Paragraph 86a Absatz 2 Nummer 1 des Sozialgerichtsgesetzes" |
| `§ 67 Abs. 1 Satz 1 OWiG` (V2-Hook) | „Paragraph 67 Absatz 1 Satz 1 des Ordnungswidrigkeitengesetzes" |
| `§ 2 RDG` | „Paragraph 2 des Rechtsdienstleistungsgesetzes" |

11.6 **Visibility-Predicate ist positive-allow** (verifier AV10; Domain-Doc § 5): Skelett-Templates werden *nur* angezeigt, wenn `letter.fristen[]` mindestens einen Eintrag mit `typ ∈ {'einspruch', 'widerspruch'}` enthält. `aussetzung_vollziehung_skelett` zusätzlich gated auf das Triple-AND aus § 6.1. Niemals Skelett-Templates für Mitwirkungs-Aufforderungen / Bestätigungs-Briefe / Bewilligungs-Bescheide.

11.7 **Cross-template state für Einspruch ↔ Aussetzung muss „Beide als getrennte Briefe versenden" anbieten** (verifier AV7; § 8 dieser Spec). Für alle anderen Switches bleibt der V1.5.0-2-Button-Mode.

11.8 **§ 122a-Caveat collapses behind `<details>` auf `<md`** (verifier AV4; Domain-Doc Architect-Note AV4). Default-Open auf `>=md`, default-collapsed auf `<md`. Frist-Cited-Format selbst bleibt auf jeder Viewport-Breite sichtbar.

11.9 **`letter.bescheid_dated_at` ist die Quelle für `{datum_bescheid}` ausschließlich in Skelett-Templates** (verifier AV5; Domain-Doc v2-Korrektur § 3). V1.5.0-Templates' `{datum_letter}`-Resolution unverändert (`letter.empfangen_am`). Resolver-Branches sind **getrennt** als zwei lokale Variablen `datumLetter` und `datumBescheid` zu modellieren — keine Wiederverwendung.

11.10 **RDG-Linie**: zero Begründung-Auto-Generation, zero `§`-Citation im Body, zero AI-Polish (V1.5.0-Lock + verifier 2.9). Smartlaw-Linie BGH I ZR 113/20: Werkzeug-Charakter wahren.

11.11 **Activity-Log-Notes tragen `template_id:<id>`** für die drei neuen Templates (verifier new-gap #4; Domain-Doc § 10.C v2-Soft-Instruktionen). Format `<key>:<value>`, semicolon-getrennt für Multi-Marker (`template_id:…; channel:…`).

11.12 **Adressat-Heuristik**: App schlägt **niemals** eine andere Behörde als die Briefkopf-Adresse vor (Domain-Doc § 6 Hard-Line). Modal-Text trägt verbatim „Wir haben aus dem Briefkopf „{empfaenger_behoerde}" als Adressat übernommen — bitte prüfen Sie die Empfänger-Anschrift selbst." Bürger:in entscheidet eigenverantwortlich.

11.13 **Pre-Insertion-Modal ist nicht skip-bar**: keine „nicht mehr zeigen"-Checkbox (Domain-Doc § 2 Wortlaut-Konvention; analog V1.5.0-Pre-Versand-Modal). Modal feuert bei jedem Skelett-Template-Insert, auch beim 2., 3., n. Mal.

---

## 12. Test plan

### 12.1 Vitest (Unit)

- **`tests/unit/reply-templates-skelett.test.ts`** (NEU):
  - Für jedes der 3 neuen Templates × Persona (Anna, Schmidt, Mehmet):
    - Resolver-Round-Trip: Output enthält alle 12 Placeholder aufgelöst.
    - `{datum_bescheid}`-Token resolved aus `letter.bescheid_dated_at`.
    - Fallback bei `bescheid_dated_at: undefined` → `letter.empfangen_am`-Datum.
    - Zero `§`-Symbole im Body (regex-Assertion `/§/.test(body) === false`).
    - RDG-Cleanliness: kein Auftauchen von „Begründung reiche ich gesondert nach", „aufschiebende Wirkung", „ernstliche Zweifel", „Erfolg" etc.
- **`tests/unit/visibility-predicate.test.ts`** (NEU):
  - Truth-Table für `getReplyTemplatePickerOrder(letter)` × alle 18 Seed-Letters.
  - Master-Predicate-Asserts: kein Skelett bei Mitwirkungs-/Bestätigungs-/Bewilligungs-Letters.
  - `aussetzung_vollziehung_skelett` Triple-AND-Asserts (positive: `letter-mehmet-fa-steuerbescheid-2024`, `letter-schmidt-fa-steuerbescheid-2024`; negative: `letter-fa-steuerbescheid-2025` (Erstattung — Anna)).
- **`tests/unit/picker-order.test.ts`** (NEU):
  - `pickerOrderByArchetype`-Lookup × alle dokumentierten Archetype+Frist-Typ-Kombos aus § 6.2.
  - Default-Highlight = `output[0]`.
- **`tests/unit/cross-template-versand.test.ts`** (NEU):
  - End-to-End-Mock von `simulateSendReply` → `simulateSendReply` für Cross-Template-Flow.
  - Asserts: 2 Replies mit gleichem `letter_id`, distinkten `id`/`template_id`/`sent_at`.
  - LocalStorage-Migration `Record<letterId, Reply>` → `Record<letterId, Reply[]>` round-trip.
- **`tests/unit/norm-familie-lookup.test.ts`** (NEU):
  - `pickNormFamilie(letter, templateId)` × alle Archetype × alle drei Skelett-Templates.
  - Aussetzung immer → `'aussetzung_ao'` unabhängig vom Archetype.
  - OWiG-Pfad wirft (V2-Hook).
- **Bestehende Tests**: `tests/unit/reply-templates.test.ts` (V1.5.0, 18 Tests) bleiben grün; ergänzt um Asserts, dass `{datum_letter}` weiterhin `empfangen_am` resolves.

### 12.2 Playwright e2e

- **`tests/e2e/v1-5-1-einspruch-aussetzung.spec.ts`** (NEU):
  - Mehmet-Persona-Login → Inbox → Klick `letter-mehmet-fa-steuerbescheid-2024` → ReplySheet öffnet → Frist-Cited-Format-Header rendert AO-Wortlaut + § 122a-Caveat behind `<details>` (Mobile-Viewport 375 px assertion).
  - Picker-Order-Assert: `[einspruch_skelett, aussetzung_skelett, frist_verlaengerung, informative_rueckmeldung, freitext]`.
  - Klick Einspruch → PreInsertionModal AO öffnet → primary-Button → Body-textarea enthält Skelett mit Datum **04.05.2026** (`bescheid_dated_at`), nicht 08.05.2026 (`empfangen_am`).
  - Klick Aussetzung im Picker → 3-Button-Switch-Dialog rendert.
  - Klick „Beide als getrennte Briefe versenden" → 2 sequenzielle Pre-Versand-Modale → ReplyConfirmationView rendert beide Replies.
- **`tests/e2e/v1-5-1-familienkasse-einspruch.spec.ts`** (NEU):
  - Synthetic Mock-Letter (Test-Fixture, nicht Seed) für `archetype: 'familienkasse-nachweis'` + `frist.typ: 'einspruch'`.
  - PreInsertionModal AO öffnet → assert: Familienkasse-Zusatz-Sentence rendert sichtbar.
  - Asserts AR-Locale: Norm-Paragraph-Nummern bleiben Latin literal.
- **`tests/e2e/v1-5-1-widerspruch-sgg.spec.ts`** (NEU):
  - Schmidt → `letter-schmidt-krankenkasse-beitrag` → Picker-Order `[widerspruch_skelett, ...]` → SGG-Modal → Body + SGG-Disclaimer-Zusatz sichtbar.
- **`tests/e2e/v1-5-1-widerspruch-vwgo.spec.ts`** (NEU):
  - Mehmet → `letter-mehmet-ihk-beitrag` → VwGO-Modal mit Bayern-statisch-Caveat → VwGO-Disclaimer-Zusatz sichtbar.

### 12.3 a11y (`@axe-core/playwright`)

- **`tests/a11y/pre-insertion-modal.spec.ts`** (NEU):
  - axe-clean × 4 Modal-Varianten (AO / SGG / VwGO / AO-Aussetzung) × 2 Viewports (375 px Mobile + 1280 px Desktop).
  - 0 critical, 0 serious violations.
  - Manueller a11y-Probe: für jedes Modal das erste Norm-Zitat im Body lokalisieren (z. B. „§ 357 Abs. 2 Satz 1 AO") und assertieren, dass das umgebende `<span>` ein `aria-label`-Attribut mit voller Pronunciation trägt (z. B. `aria-label="Paragraph 357 Absatz 2 Satz 1 der Abgabenordnung"`).
  - `<details>`-Bekanntgabe-Caveat-Assert: auf Mobile-Viewport ist `<details>` collapsed (kein `open` Attribut); auf Desktop-Viewport ist `<details>` open.
  - Focus-Trap: nach Modal-Open ist Focus auf primary-Button; ESC schließt Modal; Tab-Reihenfolge primary → tertiary → close-Button → cycle.

### 12.4 Lighthouse

- a11y-Score ≥ 95 auf `/(app)/posteingang` und `/(app)/posteingang/letter-mehmet-fa-steuerbescheid-2024`.
- Best-Practices-Score ≥ 90 (kein Regress vs V1.5.0).

---

## 13. Out-of-scope (defer to V2 oder NEVER)

> V1.5.0-Out-of-Scope-Liste bleibt in Kraft. V1.5.1 fügt das Folgende hinzu:

**V2 deferred** (Code-Pfad ggf. ready, Mock-Letter / Mock-Surface fehlt):
- **OWiG-Bußgeldbescheid Mock-Letter** (Domain-Doc § 10.A.5; verifier 2.8): Modal-Wortlaut + Frist-Cited-Format § 7.4 + Norm-Familie-Lookup-Branch sind code-ready, kein Mock-Letter in V1.5.1.
- **Bayern-PLZ-Detection-Logic** (Domain-Doc § 9.B; verifier 2.2): `abh-verlaengerung`-Ablehnungsbescheid mit Persona-PLZ-abhängiger Norm-Familien-Auswahl. V2-Hook; statischer Bayern-Caveat im VwGO-Modal ist V1.5.1-Auslieferung.
- **ABH-Ablehnungsbescheid Mock-Letter** (verifier scope-cut): Mock-Letter mit `archetype: 'abh-verlaengerung'` + `frist.typ: 'widerspruch'` für Widerspruch-Skelett-Demo. V2.
- **§ 86a SGG / § 80 VwGO Aussetzungs-Pendants** (Domain-Doc § 1 letztes Bullet): „Anordnung der aufschiebenden Wirkung" hat andere Tatbestandsschwelle als § 361 AO; eigenes Domain-Lock + eigene Skelett-Body in V2.
- **`familienkasse-nachweis`-Aufhebungs-/Ablehnungsbescheid Mock-Letter**: heutiger Familienkasse-Letter ist Mitwirkungs-Aufforderung. Familienkasse-AO-Erklärer-Code-Pfad (§ 5 Hard-Rule 6) ist in V1.5.1 ready, aktiviert sich erst mit V2-Mock-Letter.
- **„Begründung-Nachreichen"-Frist-Reminder** (verifier AV11 Option a): Domain-Lock hat den Cheap-Fix gewählt (Selbst-Bindungs-Satz aus Body entfernt); Reminder-Feature wäre V2-Add.

**NEVER**:
- **Auto-Adressat-Heuristik** (Domain-Doc § 6 Hard-Line): App schlägt niemals eine andere Adresse als die Briefkopf-Adresse vor.
- **AI-Begründung-Generierung** für Rechtsbehelfe (RDG-Hard-Line, verifier 2.9): kategorisch nein. Auch keine „Argumente vorschlagen"-Buttons, keine „ähnliche erfolgreiche Einsprüche"-Vorlagen.
- **Erfolgsprognose** für Rechtsbehelfe (V1.5.0-Hard-Line vererbt): App liefert keine Erfolgs-Bewertung.

---

## 14. Acceptance criteria (code-reviewer Final-Gate)

### 14.1 Build-Gates

- [ ] `npx tsc --noEmit` 0 errors.
- [ ] `next lint` 0 warnings/errors.
- [ ] `vitest run` alle Tests grün, inkl. der 5 neuen Suites aus § 12.1.
- [ ] `npx playwright test tests/e2e/v1-5-1-*.spec.ts` 4/4 grün.
- [ ] `npx playwright test tests/a11y/pre-insertion-modal.spec.ts` 0 critical, 0 serious axe-violations.

### 14.2 Lighthouse

- [ ] a11y ≥ 95 auf `/posteingang`.
- [ ] a11y ≥ 95 auf `/posteingang/letter-mehmet-fa-steuerbescheid-2024`.

### 14.3 Hard-Lines

- [ ] § 11.1 Body-Skelette verbatim — Lint-Test gegen `posteingang.compose.templates.<id>.body_template_de`-Strings.
- [ ] § 11.2 Zero `§` im Body-Skelett — regex-Test über alle drei Skelett-Bodies.
- [ ] § 11.3 Kein „Begründung reiche ich gesondert nach" — regex-Test.
- [ ] § 11.4 Familienkasse-Erklärer rendert mandatorisch (e2e-Test in `v1-5-1-familienkasse-einspruch.spec.ts`).
- [ ] § 11.5 `<NormZitatSpan>`-Wrap auf jedem §-numerischen Modal-Inhalt (a11y-Probe).
- [ ] § 11.6 Visibility-Predicate positive-allow (Vitest `visibility-predicate.test.ts`).
- [ ] § 11.7 Cross-Template-State 3-Button-Dialog (e2e-Test in `v1-5-1-einspruch-aussetzung.spec.ts`).
- [ ] § 11.8 § 122a-Caveat collapses auf `<md` (a11y- + Playwright-Mobile-Viewport-Assert).
- [ ] § 11.9 `bescheid_dated_at` separater Resolver-Branch (Vitest `reply-templates-skelett.test.ts` + Code-Review-Read von `reply-templates.ts:datumBescheid`).
- [ ] § 11.10 RDG-Linie (manueller Code-Review).
- [ ] § 11.11 Activity-Log-Notes tragen `template_id:<id>` (Vitest + manueller Datenschutz-Cockpit-Render-Check).
- [ ] § 11.12 Adressat-Heuristik bleibt Briefkopf-Adresse (Pre-Insertion-Modal-Wortlaut verifiziert verbatim).
- [ ] § 11.13 Pre-Insertion-Modal nicht skip-bar (manueller Test: 2× Skelett-Insert auf demselben Letter → Modal feuert beide Male).

### 14.4 i18n

- [ ] Alle 6 Locale-Files JSON.parse-validate.
- [ ] DE-Quelle für 18 neue i18n-Schlüssel verbatim aus Domain-Doc-Refs (cross-grep).
- [ ] AR-Locale: §-Norm-Paragraph-Nummern in Latein-Schrift erhalten.
- [ ] DE-only Body-Templates (`*.body_template_de`) sind in EN/RU/UK/AR/TR **nicht** vorhanden (V1.5.0-Convention, Fallback auf DE).

### 14.5 Manuelle Hero-Demo-Check

- [ ] Loom-Cut-Script § 1 (Mehmet, Einspruch + AdV als getrennte Briefe) durchläuft fehlerfrei.
- [ ] Schmidt-Familienkasse-Mitwirkungs-Aufforderung zeigt **kein** Skelett-Template im Picker (Master-Predicate hält).
- [ ] Anna-Erstattungs-Steuerbescheid (`letter-fa-steuerbescheid-2025`, Rückerstattung 371 €) zeigt Einspruch-Skelett, aber **kein** Aussetzung-Skelett (Triple-AND negativ).
- [ ] Schmidt-TK-Beitrag zeigt SGG-Modal mit SGG-Zusatz-Disclaimer.
- [ ] Mehmet-IHK-Beitrag zeigt VwGO-Modal mit statischem Bayern-Caveat + VwGO-Zusatz-Disclaimer.

### 14.6 Build-Pipeline-Hand-off

- [ ] code-reviewer APPROVE.
- [ ] a11y-tester PASS (mit explizitem `<NormZitatSpan>`-Probe-Reporting).
- [ ] i18n-localizer 6/6 locales geliefert.
- [ ] Followup-Item aus V1.5.0 (Hard-Remove `Reply.receipt_text` aktuell `optional+@deprecated`): **bleibt offen, nicht V1.5.1-Block**; in V1.5.2 oder im V1.5.1-Aufräum-PR.

---

## 15. File inventory (build-pipeline-Hand-off)

### 15.1 NEW files

- `src/components/posteingang/FristCitedFormatHeader.tsx`
- `src/components/posteingang/BekanntgabeCaveatDetails.tsx`
- `src/components/posteingang/FristAbgelaufenWarnung.tsx`
- `src/components/posteingang/NormZitatSpan.tsx`
- `src/components/posteingang/preInsertionModalLookup.ts` (oder co-located)
- `src/lib/mock-backend/reply-template-order.ts` (oder co-located in `reply-templates.ts`)
- `src/lib/mock-backend/persistence-migrations.ts` (für `LetterReplyMap`-Migration; oder Branch in `seed.ts`)
- `tests/unit/reply-templates-skelett.test.ts`
- `tests/unit/visibility-predicate.test.ts`
- `tests/unit/picker-order.test.ts`
- `tests/unit/cross-template-versand.test.ts`
- `tests/unit/norm-familie-lookup.test.ts`
- `tests/e2e/v1-5-1-einspruch-aussetzung.spec.ts`
- `tests/e2e/v1-5-1-familienkasse-einspruch.spec.ts`
- `tests/e2e/v1-5-1-widerspruch-sgg.spec.ts`
- `tests/e2e/v1-5-1-widerspruch-vwgo.spec.ts`
- `tests/a11y/pre-insertion-modal.spec.ts`

### 15.2 EDIT files

- `src/types/letter.ts` — `Letter.bescheid_dated_at?: string` ergänzen; `ReplyTemplateId`-Union um 3 Werte erweitern.
- `src/lib/mock-backend/reply-templates.ts` — `ReplyTemplateId`-Re-Export erweitern; `datumBescheid`-Resolver-Branch + Token-Map-Eintrag; ggf. `pickerOrderByArchetype`-Lookup integrieren.
- `src/lib/mock-backend/schemas.ts` — Zod-Schema für `Letter.bescheid_dated_at`; Enum-Erweiterung `replyTemplateIdSchema`.
- `src/lib/mock-backend/api.ts` — `LetterReplyMap` → `Record<letterId, Reply[]>` Migration; `getRepliesForLetter()`-Helper; `getReplyForLetter()` returns chronologisch jüngsten Reply.
- `src/data/letters.json` — `bescheid_dated_at` für die 10 Letters aus § 5.3 setzen.
- `src/components/posteingang/PreInsertionModal.tsx` — V1.5.0-Skelett füllen mit Norm-Familie-Lookup-Switch + 4 Modal-Varianten + Familienkasse-Zusatz-Conditional + `<NormZitatSpan>`-Wrap.
- `src/components/posteingang/ReplyTemplatePicker.tsx` — `pickerOrderByArchetype`-Lookup einbinden; Default-Highlight auf `output[0]`.
- `src/components/posteingang/ReplyTemplateSwitchConfirmDialog.tsx` — 3-Button-Mode für Einspruch ↔ Aussetzung-Switch.
- `src/components/posteingang/ReplySheet.tsx` — `<FristCitedFormatHeader>` + `<BekanntgabeCaveatDetails>` + `<FristAbgelaufenWarnung>` + `<SkelettFooterCrossTemplateHinweis>` einbinden; Cross-Template-Versand-Pfad orchestrieren.
- `src/lib/i18n/locales/de.json` (+ 5 weitere Locales: en/ru/uk/ar/tr) — 18 neue Top-Keys gemäß § 10.2 effektiver Leaves-Tabelle (~46 effektive JSON-Leaves × 6 Locales = ~276 Strings, davon 3 DE-only = 273 zu übersetzen).
- `src/lib/mock-backend/persistence.ts` — Schema-Version bumpen für `LetterReplyMap`-Migration.

### 15.3 DELETE files

- Keine.

---

## 16. Sources

(Additiv zu V1 und V1.5.0-Sources.)

- **Domain-Lock**: `docs/domain/posteingang-v1.5.1-rechtsbehelf-aussetzung.md` (status: domain-locked-v2; verdict PROCEED-after-revision-2; date 2026-05-09).
- **Verifier-Verdict**: `docs/reviews/2026-05-09-posteingang-v1.5.1-verify.md` (verdict REVISE — v1; revisions adressiert in domain v2; v2-PROCEED implizit durch Domain-Hand-off § 13).
- **Research-Scout**: `docs/research/2026-05-09-posteingang-gap-analysis.md` (Idea 2 + Idea 8).
- **§ 357 AO Adressat-Pflicht**: gesetze-im-internet.de/ao_1977/__357.html (verifiziert 2026-05-09 via Domain-Doc).
- **§ 361 AO Aussetzung der Vollziehung**: gesetze-im-internet.de/ao_1977/__361.html.
- **§ 84 SGG Widerspruchsfrist**: gesetze-im-internet.de/sgg/__84.html.
- **§ 70 VwGO Form/Frist Widerspruch**: gesetze-im-internet.de/vwgo/__70.html.
- **§ 122a AO Bekanntgabe-Fiktion 4. Tag**: gesetze-im-internet.de/ao_1977/__122a.html.
- **BFH II R 90/83** (Urt. v. 27.11.1985, BStBl II 1986, 243): Einspruch ohne Begründung wirksam — domain-doc-zitiert.
- **BFH III R 26/22** (Beschluss v. 17.08.2023): Familienkasse → AO-Verfahrensrecht — domain-doc-zitiert.
- **V1.5-Ship-Lessons-Memory**: i18n JSON syntax breaks, list-false-PASS, base-ui focus-guard bug, token-level contrast — bei jedem V1.5.1-PR-Push pre-flight checken.

---

> **End of V1.5.1 spec.** Bei domain-expert-späterer Re-Lock oder verifier-Re-Audit: dieses Dokument bleibt status `spec` solange `building` nicht angefangen hat. Ab erstem Coder-Commit → status: `building`. Nach Ship → status: `shipped`, immutable.
