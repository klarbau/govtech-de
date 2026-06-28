---
feature: klartext-rueckkanal
title: Klartext-Rückkanal → fertiger Widerspruch/Einspruch-Entwurf aus Alltagssprache
status: shipped   # 2026-06-28: live in ReplyComposeContent; gates green (concept-verifier PROCEED, code-review APPROVE, a11y PASS light+dark 0 violations, tsc, 63 unit tests, 6-locale parity, next build, spine e2e 2/2).
track: supporting   # amplifies the Posteingang Brief-Erklärer → Antwort/Rechtsbehelf arc; NOT the Umzug spine. Reduced rigor tier (DE-source i18n + a11y PASS), no AR-RTL ceremony, no sub-versioning.
owner_agents: [frontend-coder, mock-backend-coder, assistant-engineer, i18n-localizer]
inputs:
  research: docs/research/2026-06-28-klartext-rueckkanal.md
  domain: docs/research/2026-06-28-klartext-rueckkanal.md#domain-validation   # domain validation is inlined in the research doc, "## Domain validation" (validated 2026-06-28)
  verify: PROCEED (supporting-tier) — verdict + 10 mandatory corrections carried inline in the build brief 2026-06-28; no standalone reviews/*.md emitted
---

> **Reuse-not-rebuild posture.** ~90 % of this feature already ships in the Posteingang reply machinery
> (`ReplyComposeContent`, `ReplyInlinePanel`/`ReplyModalSheet`, `PreInsertionModal`, `reply-template-order.ts →
> pickNormFamilie`, `reply-templates.ts → resolveReplyBodySync`, `sendReplySimulated`). Idea B adds **exactly
> three** things: (1) a plain-language fact-capture box, (2) one new tightly-fenced AI restatement tool that fills
> the EXISTING skeleton's `begruendung_kurz` slot, (3) a non-skippable no-suspension hint on Beitrag letters.
> Everything else is wired through untouched. **Do not rebuild the compose flow, the norm routing, the Frist
> header, or the Pre-Insertion modal.**

---

## 1. Problem statement

Ein:e Bürger:in erhält einen belastenden Bescheid, versteht nach dem Brief-Erklärer *was* er bedeutet — scheitert
dann aber am leeren Begründungsfeld: „Was schreibe ich da rein?". Die Rechtsbehelf-Skelette füllen heute Adressat,
Aktenzeichen, Datum und Frist verbatim — die Begründung muss die Person als bracketed Platzhalter `[kurze
Begründung]` von Hand schreiben. Idea B schließt genau diese Lücke: die Person sagt in eigenen Worten, *was nicht
stimmt*, und bekommt daraus einen sachlichen Sachverhalt in den **bestehenden** Entwurf gesetzt — als Entwurf, den
sie selbst prüft und selbst einreicht.

## 2. Persona, Wow & Journey

- **Persona:** [Anna Petrov](../personas.md#anna) (Steuerbescheid mit zu niedrig angesetztem Werbungskosten-Pauschbetrag) als Hero; [Mehmet](../personas.md#mehmet) (IHK-/Beitrags-Bescheide) für den Beitrag-Pfad.
- **Trigger:** Bürger:in öffnet einen erklärten Bescheid in Posteingang, wählt das vorausgewählte Rechtsbehelf-Skelett, steht vor dem leeren `[kurze Begründung]`-Slot.
- **Outcome:** Ein fertiger Rechtsbehelf-**Entwurf** mit ihrem eigenen Sachverhalt in sachlicher Form — Frist, Aktenzeichen, richtige Behörde bereits gesetzt. Sie prüft, korrigiert, reicht selbst ein (simuliert).
- **Wow (supporting-tier, kein Spine):** „Erklärter Brief → in eigenen Worten sagen, was nicht stimmt → korrekter formaler Entwurf, Frist+AZ+Behörde schon drin." Es hat den lästigsten Teil — die Formulierung — für mich getan, ohne mir Recht zu raten.
- **Zeitersparnis vs. Status quo:** leeres Begründungsfeld + Formfragen (Sie-/Ich-Form, sachlich bleiben, kein Geschimpfe) → ~20–30 min Grübeln/Recherche reduziert auf einen Satz Klartext + Prüfung, ~2 min.

## 3. Erfolgskriterien für die Demo

- [ ] Betrachter:in versteht in < 15 s: Klartext rein → sachlicher Sachverhalt im Entwurf-Slot.
- [ ] Der Entwurf ist **niemals** als gesendet/eingelegt/eingegangen dargestellt — nur `sendReplySimulated`, Erfolg = „Entwurf bereit — Sie prüfen und reichen selbst ein".
- [ ] Auf **jedem** Beitragsbescheid rendert der nicht-wegklickbare No-Suspension-Hinweis mit der gleichen Verbindlichkeit wie das PreInsertionModal; beide Fristen (Widerspruch + Zahlung) sichtbar.
- [ ] „Formulierungshilfe — keine Rechtsberatung (§ 2 RDG)" steht sichtbar neben der Capture-Box.
- [ ] `[MOCK]`/2027-Wasserzeichen auf der Entwurfsfläche sichtbar, aber unaufdringlich.
- [ ] Lighthouse a11y > 95 / axe 0 WCAG 2.1 AA violations auf der Compose-Fläche.

## 4. Screen-by-Screen-Flow

Kein neuer Screen. Alles lebt **innerhalb des bestehenden Compose-Bodys** (`ReplyComposeContent`), gerendert
entweder inline (`ReplyInlinePanel`, ≥1100 px) oder modal (`ReplyModalSheet`). Route unverändert:
`/(app)/posteingang` → Brief öffnen → „Antwort verfassen".

### 4.1 Bestehende Compose-Sektionen (UNVERÄNDERT, Kontext)

- **Route:** `/posteingang` (Inbox) → Reply-Panel
- **File:** `src/components/posteingang/ReplyComposeContent.tsx` (client)
- Template-Picker (Sektion 1), Entwurf-Body-`<textarea>` (Sektion 2), KI-Aktionen-Chips (Sektion 3, `disabledForSkelett` bleibt an — siehe §7), Anhänge (Sektion 4), `FristCitedFormatHeader`, `skelett-footer-no-legal-advice`.
- **Norm-Vorauswahl (mechanisch):** der Picker highlightet `output[0]` aus `getReplyTemplatePickerOrder(letter)` — das ist die confirmable Default-Vorauswahl, getrieben von `letter.archetype` via `pickNormFamilie`. **Correction #5: die Vorauswahl ist immer mechanisch aus dem `archetype`, NIE aus dem Freitext der Bürger:in inferiert.**

### 4.2 NEW — `RechtsbehelfFaktenCapture` (die einzige neue Frontend-Komponente)

- **File:** `src/components/posteingang/RechtsbehelfFaktenCapture.tsx` `<NEW>` (client)
- **Wo:** rendert **nur** wenn `isSkelettTemplate(formState.template) === true` (also `rechtsbehelf_einspruch_skelett` oder `rechtsbehelf_widerspruch_skelett`), **direkt über** dem Entwurf-Body-`<textarea>` (Sektion 2), nach dem Frist-Header. Bei Nicht-Skelett-Templates rendert sie nichts.
- **Layout (ASCII):**
  ```
  ┌─ Sektion 2a · Was stimmt nicht? (nur bei Rechtsbehelf-Skelett) ──────────┐
  │  Sagen Sie in eigenen Worten, was am Bescheid nicht stimmt.              │
  │  ┌────────────────────────────────────────────────────────────────────┐ │
  │  │ [textarea] z. B. „stimmt nicht, ich war im Mai schon umgezogen"     │ │
  │  └────────────────────────────────────────────────────────────────────┘ │
  │  [ Entwurf erstellen ]   (offline → „Text übernehmen")                   │
  │                                                                          │
  │  ⓘ Formulierungshilfe — keine Rechtsberatung. … (§ 2 RDG)   ← Corr. #6   │
  └──────────────────────────────────────────────────────────────────────────┘
            │ on success: setzt userInput.begruendung_kurz, re-resolved body
            ▼
  ┌─ Sektion 2 · Entwurf (bestehender textarea) ────────────────────────────┐
  │  … {begruendung_kurz} jetzt mit dem sachlichen Sachverhalt gefüllt …     │
  └──────────────────────────────────────────────────────────────────────────┘
  ```
- **Components used:**
  - `RechtsbehelfFaktenCapture` `<NEW>` — orchestriert Box + CTA + Disclaimer + Aufruf des neuen AI-Tools.
  - `Button` from `src/components/ui/button` — CTA „Entwurf erstellen".
  - `NormZitatSpan` / `wrapNormZitate` from `src/components/posteingang/wrapNormZitate` — wraps `§ 2 RDG` im Disclaimer.
  - `Info`/`Sparkles` (lucide) — Disclaimer/Tool-Affordance-Icon, `aria-hidden`.
- **Data flow:**
  - Input: Freitext der Bürger:in (controlled state, lokal in der Komponente; **kein** Auto-Persist des Rohtexts in den Draft — nur das Ergebnis landet via `userInput.begruendung_kurz`).
  - On „Entwurf erstellen": ruft das neue AI-Tool (§7) → erhält `sachverhalt` + `source` → der Parent (`ReplyComposeContent`) setzt `formState.userInput.begruendung_kurz = sachverhalt` und re-resolved den Body via `resolveReplyBody(...)` (bestehender Pfad). **Keine** neue Body-Generierung — nur der bestehende Slot wird befüllt.
- **States:** idle / typing / pending (Spinner auf dem CTA, `aria-busy`) / success (Sachverhalt im Slot, polite-Ankündigung „Entwurf aktualisiert") / fallback (offline — Rohtext verbatim übernommen, sichtbarer Hinweis) / error (Tool-Fehler — Rohtext-Fallback angeboten, nie stiller Fail).
- **a11y:** textarea mit sichtbarem `<label>`; CTA `aria-busy` während pending; Ergebnis-Ankündigung via `role="status" aria-live="polite"`; Disclaimer programmatisch mit der Box assoziiert (`aria-describedby`).

### 4.3 No-Suspension-Hinweis (Correction #2 — non-skippable, nur Beitrag-Letter)

- **Wo:** bei jedem Letter mit `archetype ∈ {krankenkasse-beitrag, berufsgenossenschaft-beitrag, ihk-beitrag, beitragsservice-mahnung}`, sobald ein Rechtsbehelf-Skelett aktiv wird.
- **Verbindlichkeit (Correction #2, nicht verhandelbar):** dieser Hinweis hat **dieselbe nicht-wegklickbare Gewichtung wie das `PreInsertionModal`** — es ist eine Mislead-Prevention-Control, **keine** dismissible Deko. Implementierung: er ist als zusätzlicher, fest gerenderter Absatz **im `PreInsertionModal`-Body** (für die `sgg`- und `vwgo`-Norm-Familien, wenn `archetype` ein Beitrag ist) zu führen — analog zur bestehenden `additional_explainer_key`-Mechanik (siehe `getPreInsertionModalSpec`, die heute schon den Familienkasse-Zusatz konditional einhängt). Da das Modal nicht-skip-bar ist und keine „nicht mehr zeigen"-Checkbox kennt (Hard-Line § 11.13), erbt der Hinweis dieselbe Verbindlichkeit. Zusätzlich bleibt er als sichtbare Banderole über dem Entwurf-Body stehen, solange das Skelett aktiv ist (damit er nach dem Modal nicht verschwindet).
- **Verbatim DE (Correction #2):**
  > Ein Widerspruch gegen einen Beitragsbescheid hat keine aufschiebende Wirkung (§ 86a Abs. 2 SGG / § 80 Abs. 2 VwGO). Die Zahlungsfrist läuft unabhängig vom Widerspruch weiter. Eine Aussetzung müssten Sie gesondert beantragen.
  Jedes §-Zitat via `NormZitatSpan` gewrappt.
- **Beide Fristen sichtbar:** der `FristCitedFormatHeader` zeigt weiterhin sowohl die `typ:"widerspruch"`- als auch die `typ:"zahlung"`-Frist verbatim aus `letter.fristen[]` (z. B. berufsgenossenschaft-beitrag trägt beide). Keine der beiden darf ausgeblendet oder zusammengefasst werden. **Wenn dieser Hinweis nicht oder nur dismissible rendert, darf das Feature nicht shippen.**

### 4.4 Entwurf-Preview & Send (UNVERÄNDERT)

- Der gefüllte Body steht im bestehenden Entwurf-`<textarea>` (editierbar) unter dem bestehenden Skelett-Banner „Entwurf — Sie reichen ein. … wird nicht automatisch versendet."
- Versand ausschließlich über `sendReplySimulated` → `PreVersandModal` → `ReplyConfirmationView`. **Correction #7:** CTA der Capture-Box = „Entwurf erstellen"; Erfolgskopie = „Entwurf bereit — Sie prüfen und reichen selbst ein"; nie „gesendet/eingelegt/eingegangen". `[MOCK]`/2027-Wasserzeichen auf der Entwurfsfläche.

## 5. Autopilot-Logik

**Nicht zutreffend — Idea B ist kein Kaskaden-/Autopilot-Feature.** Es gibt keine Behörden-Timeline, keine
Multi-Step-Orchestrierung, keine Bestätigungsschreiben im Posteingang. Der einzige „aktive" Schritt ist ein
**ein-shot** AI-Restatement-Turn (§7), confirm-gated durch das bestehende `PreInsertionModal` vor dem Einfügen.
Diese Sektion existiert nur, um die Abwesenheit explizit zu machen.

## 6. Datenmodell-Ergänzungen / -Änderungen

### Keine neuen Types nötig

Der `begruendung_kurz`-Slot existiert bereits in `ReplyDraft.userInput` (siehe `reply-templates.ts` Zeilen
~513–516 / `resolveReplyBodySync`). Das neue Tool schreibt in genau diesen Slot — **keine** Type-Erweiterung,
**keine** neue Persistence-Key. Der Draft persistiert über den bestehenden `api.saveReplyDraft(letterId,
{ userInput })`-Pfad.

### Mock-backend-Ergänzungen (mock-backend-coder)

- **Kein neuer `api.*`-Endpoint für die Persistenz** — `saveReplyDraft` / `resolveReplyBody` / `sendReplySimulated` werden unverändert wiederverwendet.
- Das neue AI-Tool (§7) hat seinen Dispatch-Eintrag in der client-side Tool-Dispatch-Tabelle (Approach B, siehe `src/lib/ai/tools.ts` Header). Da das Restatement reine Sprach-/Form-Arbeit ist und **keine** mock-state-Mutation auslöst, ist der Dispatch ein dünner Pass-through: er reicht den vom Modell gelieferten `sachverhalt` an den Frontend-Callback (kein `localStorage`-Write bis zum normalen Draft-Save).

### letters.json-Touches (Correction #2, #10)

- **Keine neuen Letter** in v1; das v1-Set existiert bereits (siehe §10).
- **Pro Beitrag-Letter:** prüfen, dass der No-Suspension-Hinweis-Text als i18n-getriebener Block rendert (siehe §8). Falls ein Letter-spezifischer Daten-Flag gebraucht wird, um den Hinweis zu triggern, reicht der bestehende `archetype` + die `fristen[].typ`-Kombination — **kein neues Letter-Feld nötig.** Verifizieren, dass `krankenkasse-beitrag`, `berufsgenossenschaft-beitrag`, `ihk-beitrag`, `beitragsservice-mahnung` je eine `typ:"widerspruch"`- **und** eine `typ:"zahlung"`-Frist tragen (berufsgenossenschaft-beitrag ~Zeilen 1146–1158 hat bereits beide); fehlt die `zahlung`-Frist bei einem der vier, ergänzt mock-backend-coder sie verbatim aus dem Brieftext, damit beide Fristen sichtbar bleiben.

### Persistence-Keys

- Keine neuen. (Rohtext der Capture-Box ist ephemeral component-state und wird **nicht** persistiert.)

## 7. AI-Assistant-Integration — der neue fenced Restatement-Tool

> **FLAG für assistant-engineer & code-reviewer:** Dies ist ein **NEUES, eng eingezäuntes Tool** — es ist
> **NICHT** ein Un-Gaten der `disabledForSkelett`-Rewrite-Chips. Die bestehenden KI-Aktionen-Chips
> (`umformulieren/kürzer/formeller/einfacher`) bleiben auf Skeletten **hart deaktiviert** (`disabledForSkelett`
> bleibt `true`, der `disabled_skelett_hint` bleibt). Das neue Tool ist eine separate, einmalige, strikter
> kontrahierte Fähigkeit, die ausschließlich die `RechtsbehelfFaktenCapture`-Box aufruft.

### 7.1 Tool-Definition (`src/lib/ai/tools.ts`)

- **Tool-Name:** `formuliere_sachverhalt` — neu in `TOOL_NAMES` + `tools[]` aufnehmen + Dispatch-Eintrag.
- **Zweck (DE-Beschreibung):** „Bringt die eigenen Tatsachen-Angaben der Bürger:in in eine sachliche, neutrale Form (Ich-/Sie-Form) für den Begründungs-Slot eines bereits ausgewählten Rechtsbehelf-Entwurfs. Bewertet nichts, empfiehlt nichts, nennt keine Norm, rührt die Frist nicht an."
- **Input-Schema:**
  ```
  {
    type: 'object',
    properties: {
      rohtext:       { type: 'string', description: 'Die eigenen Worte der Bürger:in — was am Bescheid nicht stimmt.' },
      norm_familie:  { type: 'string', enum: ['ao','sgg','vwgo'], description: 'Mechanisch aus letter.archetype via pickNormFamilie — NUR damit der Restatement-Ton (Einspruch/Widerspruch) zur Anrede passt; NIE zum Inferieren des Rechtsbehelfs aus dem Rohtext.' }
    },
    required: ['rohtext','norm_familie']
  }
  ```
- **Output-Schema (Tool-Result, vom Client erzeugt/validiert):**
  ```
  {
    sachverhalt: string,   // neutraler, sachlicher Sachverhalt fürs begruendung_kurz-Slot
    source: 'ki' | 'fallback'
  }
  ```

### 7.2 System-Prompt-Boundary (Correction #4 — VERBATIM in den System-Prompt locken)

In `src/lib/ai/system-prompt.ts` einen dedizierten, gecachten Boundary-Block ergänzen, der **nur** für
`formuliere_sachverhalt` gilt:

- **MAY:** restate the citizen's own facts as a neutral first-person Sachverhalt (German, Sie-/Ich-Form, tense as stated); tidy grammar / split run-ons / remove invective; mark a missing fact as a bracketed `[…]` placeholder (never invent it); carry the citizen's own numbers/dates **verbatim** as stated (no verification).
- **MUST NOT:** assess the merits; recommend whether to file; predict success; name or apply a norm to the facts; add any §-citation not already verbatim in the letter; touch / compute / restate / estimate the Frist; re-route the remedy from the free text.
- **Clean output template (Correction #4):**
  > „Nach meinem Kenntnisstand trifft der zugrunde gelegte Sachverhalt nicht zu: [restated fact]. Ich bitte um Überprüfung."
- **Contract sentence (verbatim, aus der Domain-Validierung):** „Restate ONLY the facts the user asserts, as neutral first-person Sachverhalt sentences in German (Sie-/Ich-Form), present/past tense as stated. Begin from the user's claim, not from a legal conclusion. Do not evaluate, recommend, predict, or cite any norm. If a needed fact is missing, insert a bracketed `[…]` placeholder; never invent it. Output is a factual building block for the citizen's own draft, nothing else."

### 7.3 Offline-/keyless Fallback (Correction #9)

Wenn kein `ANTHROPIC_API_KEY` deployed ist (keyless web visitor) oder der KI-Turn fehlschlägt: das Tool
**droppt den Rohtext der Bürger:in VERBATIM** in den `begruendung_kurz`-Slot, `source: 'fallback'` — spiegelt
das bestehende Rewrite-Chip-`source:'fallback'`-Verhalten. **Niemals** stille legale Formulierung offline; die
Box zeigt sichtbar „Text unverändert übernommen — bitte selbst in Form bringen."

### 7.4 Sample-Dialoge (Tool-Verhalten, keine Chat-Turns nötig — das Tool läuft aus der Capture-Box)

1. In: „stimmt nicht, ich war im mai schon umgezogen" → Out: „Nach meinem Kenntnisstand trifft der zugrunde gelegte Sachverhalt nicht zu: Ich war zum Zeitpunkt des Bescheids bereits umgezogen. Ich bitte um Überprüfung." (`source:'ki'`)
2. In: „die haben meine werbungskosten von 1840 euro nicht angesetzt" → Out: „Nach meinem Kenntnisstand trifft der zugrunde gelegte Sachverhalt nicht zu: Werbungskosten in Höhe von 1.840 Euro wurden nicht berücksichtigt. Ich bitte um Überprüfung." (Zahl verbatim getragen, keine Norm, keine Bewertung.)
3. In (offline): „bin doch befreit" → Out (`source:'fallback'`): „bin doch befreit" verbatim im Slot + Hinweis „Text unverändert übernommen".

## 8. i18n (DE source-of-truth — supporting-tier, alle 6 Locales via i18n-localizer)

Neue Keys unter `posteingang.compose.fakten_capture.*` und Ergänzungen am Pre-Insertion-Modal/Skelett-Block:

| Key | DE-Wert (Auszug / Verweis) |
|---|---|
| `posteingang.compose.fakten_capture.heading` | „Was stimmt nicht?" |
| `posteingang.compose.fakten_capture.intro` | „Sagen Sie in eigenen Worten, was am Bescheid nicht stimmt. Wir bringen Ihre Angaben in eine sachliche Form für Ihren Entwurf." |
| `posteingang.compose.fakten_capture.textarea_label` | „Ihre Angaben in eigenen Worten" |
| `posteingang.compose.fakten_capture.textarea_placeholder` | „z. B. „stimmt nicht, ich war im Mai schon umgezogen"" |
| `posteingang.compose.fakten_capture.cta` | „Entwurf erstellen" |
| `posteingang.compose.fakten_capture.cta_fallback` | „Text übernehmen" |
| `posteingang.compose.fakten_capture.pending` | „Wird in Form gebracht …" |
| `posteingang.compose.fakten_capture.success_announce` | „Entwurf bereit — Sie prüfen und reichen selbst ein." |
| `posteingang.compose.fakten_capture.fallback_note` | „Text unverändert übernommen — bitte selbst in Form bringen." |
| `posteingang.compose.fakten_capture.error_note` | „Übernahme fehlgeschlagen. Ihr Text wurde unverändert eingesetzt." |
| `posteingang.compose.fakten_capture.disclaimer` | **(Correction #6, verbatim)** „Formulierungshilfe — keine Rechtsberatung. Diese Funktion bringt Ihre eigenen Angaben in eine sachliche Form für Ihren Entwurf. Sie prüft Ihren Fall nicht rechtlich, bewertet die Erfolgsaussichten nicht und empfiehlt nicht, ob Sie einen Rechtsbehelf einlegen sollten (§ 2 RDG). Ob und was Sie einreichen, entscheiden Sie selbst." |
| `posteingang.compose.no_suspension_hint.beitrag` | **(Correction #2, verbatim)** „Ein Widerspruch gegen einen Beitragsbescheid hat keine aufschiebende Wirkung (§ 86a Abs. 2 SGG / § 80 Abs. 2 VwGO). Die Zahlungsfrist läuft unabhängig vom Widerspruch weiter. Eine Aussetzung müssten Sie gesondert beantragen." |

- **Behalten / nicht ändern:** `posteingang.compose.skelett_footer_no_legal_advice` (bleibt zusätzlich), `posteingang.compose.disabled_skelett_hint` (Chips bleiben gesperrt), die bestehenden `pre_insertion_modal.*`-Keys. Die vorhandenen `disclaimer_pre_insertion_zusatz_sgg/_vwgo`-Zeilen sind partielle No-Suspension-Hinweise — sie werden vom neuen verbatim `no_suspension_hint.beitrag` als die maßgebliche, vollständige Fassung **ergänzt** (nicht ersetzt), damit der Wortlaut aus Correction #2 exakt erscheint.
- **Einspruch ≠ Widerspruch (Correction #8):** AO-Pfad-Kopien sagen „Einspruch (§ 347 AO)", SGG/VwGO-Pfad „Widerspruch"; die bestehenden per-Norm-Keys halten das bereits — neue Kopien dürfen das nicht vermischen.
- **§ 70 VwGO, nicht § 69 (Correction #1):** in allen bürger:innenseitigen Kopien — `letters.json` ist bereits korrekt; keine neue Kopie darf § 69 einführen.

## 9. Edge cases

- **Leerer Rohtext + „Entwurf erstellen":** CTA disabled bis ≥ ein nicht-leeres Zeichen; kein Tool-Aufruf.
- **Letter ohne Rechtsbehelf-Frist:** `hasRechtsbehelfFrist()` gated das Skelett ohnehin aus → Capture-Box rendert nicht. Unverändert.
- **`abh-verlaengerung` (Correction #3):** **ausgeschlossen** vom Skelett-/Capture-Pfad in v1 — falscher Rechtsbehelf (§ 81 Abs. 4 AufenthG Terminbuchung/Antrag, high-stakes). Verifizieren, dass kein v1-Mock-Letter mit `archetype: abh-verlaengerung` eine `widerspruch`-Frist trägt, die das Skelett (und damit die Box) sichtbar machen würde; falls doch, ist das ein Daten-Bug, der vor Ship zu beheben ist.
- **Beitrag-Letter ohne No-Suspension-Hinweis:** harter Block — Feature shipt nicht (Correction #2).
- **Offline mid-flow:** Fallback (§7.3), nie stiller Fail, nie stille Rechtsformulierung.
- **Bürger:in editiert nach Restatement von Hand:** voll erlaubt — der Slot ist normaler editierbarer Draft-Text; ein erneutes „Entwurf erstellen" überschreibt den Slot (mit polite-Ankündigung), nicht den ganzen Body.
- **Tool nennt doch eine Norm / bewertet (Prompt-Leak):** code-reviewer prüft Sample-Outputs gegen die MUST-NOT-Liste; bei Leak ist der System-Prompt-Block nachzuschärfen, das Feature nicht zu shippen.

## 10. v1-Letter-Set (Correction #10)

- **Hero — `steuerbescheid` (Einspruch § 347 / § 355 AO):** sauberster Pfad, eigene Angelegenheit, Smartlaw-schematischer Fill, AdV als bekannter separater Pfad.
- **`familienkasse-nachweis` (Einspruch § 347 AO):** mit dem **bestehenden** Familienkasse-AO-Erklärer im `PreInsertionModal` (unverändert behalten).
- **Beitrag-Letter — `krankenkasse-beitrag`, `berufsgenossenschaft-beitrag` (§ 84 SGG) + `ihk-beitrag`, `beitragsservice-mahnung` (§ 70 VwGO):** **nur MIT** dem No-Suspension-Hinweis aus Correction #2 gerendert. Ohne den Hinweis: defer.
- **Defer:** `abh-verlaengerung` (Correction #3, ausgeschlossen), `standesamt-urkunde`, `renteninfo`, `buergeramt-meldung`, `sonstiges` (kein anfechtbarer belastender VA / keine Rechtsbehelf-Frist — bereits gated).

## 11. Out of scope (explizit)

- Un-Gaten der `disabledForSkelett`-Rewrite-Chips (umformulieren/formeller/…) — bleiben gesperrt.
- Jegliche Bewertung von Erfolgsaussichten, Norm-Anwendung auf den Fall, Empfehlung ob einreichen.
- Frist-Berechnung/-Schätzung/-Umformulierung durch die KI.
- Rechtsbehelf-Routing aus Freitext (bleibt mechanisch via `pickNormFamilie`).
- `abh-verlaengerung`-Pfad.
- Echter Versand / „eingelegt/eingegangen"-Status — nur `sendReplySimulated`.
- AR-RTL-Audit, Sub-Versioning, volle Sechs-Locale-Ceremony über die DE-Source + i18n-Parität hinaus (supporting-tier).
- Aussetzung-Skelett-Änderungen (separater bestehender Pfad, unangetastet).

## 12. Review-Checkliste (für code-reviewer)

- [ ] Keine hardcoded Strings — alles via `t()`.
- [ ] `formuliere_sachverhalt` ist ein NEUES Tool, NICHT ein Un-Gaten von `disabledForSkelett` (Chips bleiben gesperrt, `disabled_skelett_hint` bleibt).
- [ ] System-Prompt-Boundary aus §7.2 verbatim drin; Sample-Outputs verletzen keine MUST-NOT-Zeile (keine Norm, keine Bewertung, keine Frist, keine Empfehlung).
- [ ] No-Suspension-Hinweis (Correction #2) rendert auf JEDEM der vier Beitrag-Letter mit `PreInsertionModal`-Verbindlichkeit (nicht-skip-bar, keine „nicht mehr zeigen"); beide Fristen (widerspruch + zahlung) sichtbar.
- [ ] § 70 VwGO (nicht § 69) in allen bürger:innenseitigen Kopien; Einspruch ≠ Widerspruch ≠ § 84 SGG korrekt getrennt.
- [ ] Disclaimer (Correction #6) verbatim neben der Box; `skelett_footer_no_legal_advice` zusätzlich erhalten.
- [ ] CTA „Entwurf erstellen", Erfolg „Entwurf bereit — Sie prüfen und reichen selbst ein"; nie gesendet/eingelegt/eingegangen; nur `sendReplySimulated`; `[MOCK]`/2027-Wasserzeichen.
- [ ] Offline-Fallback droppt Rohtext verbatim (`source:'fallback'`), keine stille Rechtsformulierung.
- [ ] `abh-verlaengerung` aus dem Pfad ausgeschlossen.
- [ ] Frist verbatim aus `letter.fristen[].datum`/`rechtsgrundlage` — von KI nie berührt.
- [ ] Federalismus-Labels präzise: Finanzamt (Landesbehörde, Steuerrecht bundesrechtlich); Krankenkassen/BG = Selbstverwaltungskörperschaften; Rundfunkbeitrag = Landesrecht — kein „Bundesvorgang".
- [ ] Autopilot-Timeline-/Reduced-Motion-Anforderungen n/a (kein Kaskaden-Feature); Box-Pending-Spinner respektiert `prefers-reduced-motion`.
- [ ] axe 0 WCAG 2.1 AA violations auf der Compose-Fläche (inline + modal).

**frontend-coder self-confirm (2026-06-28)** — runtime-verified on live :3000 (code-reviewer remains final gate):
- ✔ Keine hardcoded Strings — alle sichtbaren Strings via `t()`.
- ✔ `formuliere_sachverhalt`/Capture-Box ist eine separate Fähigkeit; `disabledForSkelett`-Chips bleiben gesperrt, `disabled_skelett_hint` bleibt (verified: „Umformulieren" chip `disabled` on skeleton).
- ✔ No-Suspension-Hinweis rendert auf dem Beitrag-Letter mit `role="note"`, NICHT wegklickbar (0 Buttons im Banner); beide Fristen (widerspruch 13.06.2026 + zahlung 15.06.2026) sichtbar.
- ✔ Disclaimer (Corr. #6) verbatim neben der Box, §2 RDG gewrappt; `skelett_footer_no_legal_advice` zusätzlich erhalten.
- ✔ CTA „Entwurf erstellen"; Erfolg/Fallback nie „gesendet/eingelegt"; Versand weiter nur `sendReplySimulated`; `[MOCK]`/2027-Framing auf der Fläche (Header `[MOCK]` AZ + Secure-Banner „Stand 2027").
- ✔ Offline-Fallback droppt Rohtext verbatim (`source:'fallback'` → „Text unverändert übernommen"), keine stille Rechtsformulierung.
- ✔ `aussetzung_vollziehung_skelett` aus dem Capture-Pfad ausgenommen; `abh-verlaengerung` trägt keine widerspruch-Frist (mock-backend verified) → Skelett/Box rendern dort nicht.
- ⏳ axe (inline + modal) → a11y-tester. ⏳ Norm-Trennung Einspruch/Widerspruch/§84 SGG/§70 VwGO über alle Locales → i18n-localizer/code-reviewer.

## Build log — mock-backend-coder
- date: 2026-06-28
- scope: data + backend-plumbing for the no-suspension hint (Correction #2) + Frist-pair verification (Corrections #1, #3, #10). Did NOT touch components, `src/lib/ai/**`, i18n locales, or types.
- types added/changed: none (no schema/type change needed — `LetterFrist` already carries `typ`/`rechtsgrundlage`/`cta_label`).
- api methods added: none. Wiring rides the existing `getPreInsertionModalSpec` → `additional_explainer_key` mechanism.
- backend logic: `src/lib/mock-backend/reply-template-order.ts` — `getPreInsertionModalSpec` now sets `additional_explainer_key = NO_SUSPENSION_HINT_BEITRAG_KEY` for `norm ∈ {sgg,vwgo}` AND `archetype ∈ {krankenkasse-beitrag, berufsgenossenschaft-beitrag, ihk-beitrag, beitragsservice-mahnung}` (new `BEITRAG_NO_SUSPENSION_ARCHETYPES` set). Same non-skippable weight as the Familienkasse-AO explainer (disjoint AO vs sgg/vwgo branches). New exported const `NO_SUSPENSION_HINT_BEITRAG_KEY = 'posteingang.compose.no_suspension_hint.beitrag'` (re-exported from `index.ts`) so the persistent over-draft Banderole can reference the same key. **Locale copy owned by i18n-localizer — not written here.**
- i18n key referenced (not authored): `posteingang.compose.no_suspension_hint.beitrag`.
- letters.json zahlung-Frist additions (each Beitrag letter that carries a `widerspruch` Frist now also carries an independent `zahlung` Frist; `original_zitat` verbatim from body, body extended with one Fälligkeit line where it lacked an explicit due-date):
  - `letter-schmidt-krankenkasse-beitrag` (krankenkasse-beitrag, §84 SGG): added zahlung 2026-06-15 (§ 23 Abs. 1 SGB IV) + body Fälligkeit line.
  - `letter-mehmet-krankenkasse-freiwillig` (krankenkasse-beitrag, §84 SGG): added zahlung 2026-06-15 (§ 23 Abs. 1 SGB IV) + body Fälligkeit line.
  - `letter-mehmet-bgw-beitrag` (berufsgenossenschaft-beitrag, §84 SGG): already had BOTH (zahlung 2026-06-15 + widerspruch 2026-06-13) — unchanged.
  - `letter-mehmet-ihk-beitrag` (ihk-beitrag, §70 VwGO): added zahlung 2026-06-08 (§ 3 Abs. 7 IHKG i.V.m. Beitragsordnung), quoting existing body line "Fälligkeit: 30 Tage nach Bekanntgabe."
  - `letter-beitragsservice-festsetzung` (beitragsservice-mahnung, Anna, §70 VwGO): added zahlung 2026-01-15 (§ 7 Abs. 3 RBStV), quoting existing body "Fälligkeit: vierteljährlich zum 15."
  - `letter-schmidt-beitragsservice-festsetzung` (beitragsservice-mahnung, §70 VwGO): added zahlung 2026-05-26 (§ 7 Abs. 3 RBStV) + body Fälligkeit line.
  - `letter-mehmet-beitragsservice-mahnung` (beitragsservice-mahnung, §70 VwGO): added zahlung 2026-05-26 (§ 7 Abs. 3 RBStV) + body Fälligkeit line.
  - (krankenkasse-beitrag letters WITHOUT a widerspruch Frist — `letter-aok-rechnung-zuzahlung` (fristen []), `letter-aok-mitgliedsbescheinigung` (fristen []) — do not trigger the Skelett, so no zahlung Frist required.)
- Correction #1 (§70 VwGO not §69): verified — all VwGO widerspruch Fristen carry "§ 70 VwGO"; no "§ 69" introduced anywhere. Pre-existing data was already correct.
- Correction #3 (abh-verlaengerung excluded): verified — both abh-verlaengerung letters (`letter-abh-erinnerung-verlaengerung` = `antragstellung` Frist only; `letter-umzug2026-abh-bestaetigung` = fristen []) carry NO `widerspruch` Frist, so the Skelett/Capture path never renders for them. No data bug, no change. `pickNormFamilie` still maps abh-verlaengerung→vwgo as a defensive V2-hook, but it is unreachable in v1 because the Master-Predicate gates it out; the no-suspension hint is NOT applied to abh-verlaengerung (not in the Beitrag set).
- pickNormFamilie routing confirmed: steuerbescheid/familienkasse-nachweis→ao (§347/§355 AO); krankenkasse-beitrag/berufsgenossenschaft-beitrag→sgg (§84 SGG); ihk-beitrag/beitragsservice-mahnung→vwgo (§70 VwGO). Correct, unchanged.
- tests: extended `tests/unit/norm-familie-lookup.test.ts` — updated the SGG-modal assertion (now expects the no-suspension key for a Beitrag letter) + new describe block covering all four Beitrag archetypes (sgg+vwgo) get the key and AO/abh-verlaengerung do NOT.
- validation: `JSON.parse(letters.json)` OK; `tsc --noEmit` clean (exit 0); `norm-familie-lookup.test.ts` 36/36 pass.
- known gaps: persistent over-draft Banderole render (Spec §4.3 second paragraph) is frontend territory — key is exported for the frontend-coder to consume. Locale copy for `no_suspension_hint.beitrag` is i18n-localizer's. 4 pre-existing CSS-token unit failures (design-system-v2-*) are unrelated (no CSS touched).

## Build log — frontend-coder
- date: 2026-06-28
- screens implemented: none new — feature lives inside the existing Posteingang reply compose body (`/posteingang` → Brief → „Antwort vorbereiten" → inline panel ≥1100px / modal Sheet <1100px), per §4.
- components created:
  - `src/components/posteingang/RechtsbehelfFaktenCapture.tsx` (§4.2) — plain-language fact-capture box; renders ONLY when `isSkelettTemplate(formState.template)` (NOT for the recommended-but-unconfirmed split, NOT for `aussetzung_vollziehung_skelett`). Confirmable remedy line (`remedy_confirm` + per-norm `remedy_label.{ao,sgg,vwgo}`), labeled textarea, „Entwurf erstellen" CTA, polite `role=status` result/fallback line, disclaimer (§2 RDG, wrapped via `wrapNormZitate`, `aria-describedby`). Wires to `requestSachverhalt(rohtext, normFamilie)` from `@/lib/ai/sachverhalt-client`; on result sets the skeleton's `begruendung_kurz` slot via the parent and re-resolves the body; `source==='fallback'` → „Text unverändert übernommen" note (offline-graceful, Corr. #9). Does NOT un-gate the rewrite chips.
  - `src/components/posteingang/NoSuspensionHintBanner.tsx` (§4.3 / Corr. #2) — persistent, non-dismissible `role="note"` banner over the draft for the four Beitrag archetypes; renders the verbatim hint via the re-exported `NO_SUSPENSION_HINT_BEITRAG_KEY` plus BOTH Fristen (widerspruch + zahlung) from `letter.fristen[]`. No close control.
- components modified:
  - `src/components/posteingang/ReplyComposeContent.tsx` — added `begruendungKurz` to `FormState`; threaded `userInput.begruendung_kurz` into `resolveReplyBody` for skeleton templates (new optional `begruendungOverride` arg on `loadTemplateBody`); derived `faktenNormFamilie` mechanically via `pickNormFamilie` (Corr. #5); `onFaktenSachverhalt` re-resolves body + focuses the draft textarea (`bodyTextareaRef`); rendered the banner + capture box directly above the §2 draft textarea; KI rewrite chips remain `disabledForSkelett`.
- i18n keys ADDED to de.json (DE source — i18n-localizer to port to en/ru/uk/ar/tr):
  - `posteingang.compose.fakten_capture.remedy_label.{ao,sgg,vwgo}` = „Einspruch (§ 347 AO)" / „Widerspruch (§ 84 SGG)" / „Widerspruch (§ 70 VwGO)" (needed for the `remedy_confirm` `{remedy}` param; mechanical, never inferred).
  - `posteingang.compose.no_suspension_hint.{banner_title, widerspruch_frist_template, zahlung_frist_template}` (banner heading + both Frist lines).
  - **Template-body change (load-bearing):** added `\n\nBegründung: {begruendung_kurz}` to BOTH `posteingang.compose.templates.rechtsbehelf_einspruch_skelett.body_template_de` and `…rechtsbehelf_widerspruch_skelett.body_template_de`. The skeletons previously had NO `{begruendung_kurz}` slot, so the capture-box fill had nowhere to land (spec §1/§6 assumed the slot existed). i18n-localizer must mirror this one-line insertion into the same two template bodies in the other 5 locales (where they carry localized skeleton bodies).
- keys referenced (not authored): the pre-existing `fakten_capture.*` set (heading/intro/textarea_*/cta/cta_fallback/pending/success_announce/fallback_note/error_note/remedy_confirm/disclaimer), `no_suspension_hint.beitrag`, `skelett_footer_no_legal_advice` (kept), `disabled_skelett_hint` (chips stay gated).
- did NOT touch: `src/lib/ai/**`, `src/lib/mock-backend/**`, `src/data/**`, `src/types/**`.
- contract note: `requestSachverhalt` returns `source: 'ki' | 'fallback'` (the assistant client uses `'ki'`, not `'ai'`); the capture box treats anything ≠ `'fallback'` as success.
- typecheck: pass (`tsc --noEmit` exit 0). lint: BLOCKED in this cloud env — `@eslint/eslintrc` is not installed (`eslint.config.mjs` import fails), `next lint` deprecated; not a code issue. code-reviewer to run lint where the dep resolves.
- unit: `reply-templates.test.ts` 18/18 + `norm-familie-lookup.test.ts` 36/36 pass (template-body change did not break the persona-fill assertions).
- runtime verification (live :3000, Playwright + cached full chromium, screenshots inspected):
  - Anna `letter-fa-steuerbescheid-2025` (AO): capture box renders; remedy line „Einspruch (§ 347 AO) — stimmt das?"; disclaimer with §2 RDG; „Entwurf erstellen" + offline (no key) → fallback note „Text unverändert übernommen…", body slot filled VERBATIM (contains „1840"); KI „Umformulieren" chip stays DISABLED.
  - Mehmet `letter-mehmet-bgw-beitrag` (SGG Beitrag): no-suspension banner `role="note"`, 0 close buttons, „keine aufschiebende Wirkung" / §86a; BOTH Fristen visible — Widerspruch 13.06.2026 + Zahlung 15.06.2026 (independent).
- known gaps / for reviewer: (1) lint not runnable in this env (dep missing) — re-run elsewhere. (2) i18n-localizer must port the 6 new DE keys AND mirror the `{begruendung_kurz}` slot insertion into the two skeleton bodies in en/ru/uk/ar/tr. (3) a11y-tester: run axe on the compose surface (inline + modal) for both letters; capture box has a real `<label>`, banner is a labelled `role=note` region, CTA keyboard-operable, focus moves to the draft textarea on fill.
- next: i18n-localizer (6 new keys + 2 template-body mirrors) → a11y-tester → code-reviewer.

## Build log — i18n-localizer
- date: 2026-06-28
- track: supporting (per §8) — DE-source-first parity; the two load-bearing legal strings (`fakten_capture.disclaimer` = Correction #6 verbatim, `no_suspension_hint.beitrag` = Correction #2 verbatim) were translated human-quality + carefully in every locale and are NOT flagged `needs_review`; the routine-chrome keys are fast-drafted and flagged.
- locales updated: [en, ru, uk, ar, tr] (de = source, authored by frontend-coder, NOT touched by i18n)
- new keys: 19 leaf keys mirrored per target locale × 5 = 95 strings. Under existing `posteingang.compose.*` nesting (no parallel tree): `fakten_capture.{heading,intro,textarea_label,textarea_placeholder,cta,cta_fallback,pending,success_announce,fallback_note,error_note,remedy_confirm,disclaimer}` (12) + `fakten_capture.remedy_label.{ao,sgg,vwgo}` (3) + `no_suspension_hint.{beitrag,banner_title,widerspruch_frist_template,zahlung_frist_template}` (4). Inserted at the identical anchor in all 6 (between `compose.ai_rewrite.disabled_skelett_hint` close and `compose.outbound_speculative`).
- changed keys: 0 (DE source pre-existed; i18n added only the missing target-locale mirrors).
- review-needed flags resolved: 0 added-and-resolved; 14 fast-draft chrome keys flagged `needs_review` per locale (disclaimer + beitrag deliberately NOT flagged — human-quality).
- ICU/verbatim discipline: `{remedy}` (fakten_capture.remedy_confirm) + `{datum}` (frist templates) preserved verbatim in all 6. `remedy_label.{ao,sgg,vwgo}` VALUES kept GERMAN verbatim incl. AR ("Einspruch (§ 347 AO)" / "Widerspruch (§ 84 SGG)" / "Widerspruch (§ 70 VwGO)") — they feed `{remedy}` and are passed-in, not localized; Einspruch≠Widerspruch (Correction #8) held. All §-citations (§ 2 RDG, § 86a Abs. 2 SGG, § 80 Abs. 2 VwGO, § 347 AO, § 84 SGG, § 70 VwGO) kept LTR source-form in every locale incl. AR.
- terms kept German-with-gloss (Behörden-/Rechts-Terminus convention): RDG → "(§ 2 RDG, German Legal Services Act)" / "(§ 2 RDG — Закон об оказании юридических услуг)" / "(§ 2 RDG — Закон про надання юридичних послуг)" / "(§ 2 RDG — قانون الخدمات القانونية)" / "(§ 2 RDG — Hukuki Hizmetler Kanunu)"; `Bescheid` kept Latin in remedy_confirm/intro for ru/uk/ar/tr; `Widerspruch` kept Latin in no_suspension_hint + frist templates for ru/uk/ar/tr; TR additionally glosses `Beitragsbescheid`, `Rechtsbehelf`.
- AR (RTL): supporting track → NO formal AR-RTL layout audit this pass (deferred to spine promotion). Strings are bidi-safe — §-citations, German remedy_label values, `{remedy}`/`{datum}`, Bescheid/Widerspruch glosses are LTR tokens that bidi-render under `html dir="rtl"` (already wired in `src/app/layout.tsx` per locale). Flagged in `_status.json` ar.review_needed.
- known gaps: 14 chrome keys per locale fast-drafted (needs_review) — promote to FULL quality + AR-RTL audit if/when the /posteingang compose Rechtsbehelf surface is promoted to spine. The `de_fallback` note in `_status.json` (`posteingang.compose.*` DE-fallback) remains for any OTHER compose leaf keys still DE-only (not the keys added here, which are now at 6-locale parity).
- verification: JSON.parse + 6-locale parity gate NOT runnable in this agent (no Bash). Structural review PASS on all 6 (balanced braces; `remedy_label` object closes `},` before `disclaimer`; `disclaimer` is the last `fakten_capture` key → `},`; `zahlung_frist_template` is the last `no_suspension_hint` key → `},`; no trailing comma at any block close; ASCII double-quote keys; ai_rewrite→fakten_capture→no_suspension_hint→outbound_speculative seam re-read in every locale). RECOMMEND main-thread run before commit: `node -e "['de','en','ru','uk','ar','tr'].forEach(l=>JSON.parse(require('fs').readFileSync('src/lib/i18n/locales/'+l+'.json','utf8')))"` + `JSON.parse(_status.json)`.
