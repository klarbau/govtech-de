---
feature: posteingang-v2-zahlungs-rail
title: Posteingang V2 — Zahlungs-Rail (EPC-QR + Citation-Match-Gate + Phishing-Confirmation)
status: spec
date: 2026-05-09
author: product-architect
amends: docs/specs/posteingang.md, docs/specs/posteingang-v1.5.md
phase: v2
upstream:
  research: docs/research/2026-05-09-posteingang-gap-analysis.md (Idea 1, revised post-AV7+AV8)
  domain: docs/domain/posteingang-v2-zahlungs-rail.md (PROCEED-after-revision-2)
  verify: docs/reviews/2026-05-09-posteingang-v2-zahlungs-rail-verify.md (REVISE → all 5 hard-revisions addressed in domain v2)
  cross_feature: docs/domain/posteingang-v1.5.1-rechtsbehelf-aussetzung.md (Aussetzungs-Antrag § 361 AO Wortlaut)
ship_target: V2 (post-V1.5.1)
estimated_effort: ~6 working days
owner_agents: [mock-backend-coder, frontend-coder, i18n-localizer, a11y-tester, code-reviewer]
---

> **Geltungsbereich V2**: Diese Spec **amendiert** die geshipte V1 (`docs/specs/posteingang.md`) und V1.5 (`docs/specs/posteingang-v1.5.md`); sie ersetzt sie nicht. V1/V1.5-Komponenten, V1/V1.5-Datenmodell, V1/V1.5-Disclaimer-Strings (Wortlaut), V1.5-Reply-Templates bleiben in Kraft, sofern hier nicht explizit ergänzt. Pay-Rail ist eine **rein additive** Erweiterung: ein neuer dritter primärer CTA in der bestehenden `<StickyFristAction>`, ein neues `<PaymentSheet>`, neue `LetterPayment`-Sub-Type, neue Activity-Log-Enum-Werte, ein neues `citation-match.ts`-Pure-Modul, eine Seed-Mutation auf 8 bestehenden Briefen.

---

## 1. Mission & Speculative Frame

### 1.1 Elevator pitch

Bürger:innen erhalten regelmäßig Zahl-Bescheide (Steuerbescheid, Krankenkasse, Beitragsservice, IHK, BG, optional OWi-Bußgeld). Heute (Mai 2026) müssen sie IBAN, Betrag und Verwendungszweck **manuell** aus dem Brief in ihre Bank-App abtippen — die häufigste Fehlerquelle ist ein verkürzter Verwendungszweck (Aktenzeichen ohne Steuerart-Suffix), der zur Nicht-Zuordnung der Buchung führt und 14 Tage später eine Säumnis-Mahnung nach § 240 AO auslöst, obwohl tatsächlich gezahlt wurde. V2 schließt den read→reply→**pay**-Lifecycle für zahlungsbedürftige Bescheid-Archetypen (~40 % des Korpus, 100 % der friction-reichen Bescheide): Tap auf „Zahlung vorbereiten" im LetterReader → `<PaymentSheet>` zeigt verbatim aus dem Brief extrahiertes IBAN/Betrag/Verwendungszweck als read-only Kopier-Felder + EPC-QR-Code (EU-Standard, in jeder DACH-Bank-App scanbar) — Bürger:in scannt mit ihrer Bank-App, bestätigt dort mit pushTAN. Die App **initiiert keine Bezahlung**; sie bereitet sie nur vor.

### 1.2 Speculative-2027-Banner (verbatim, DE — non-negotiable; domain §1 + AV1-Tightening)

Im `<PaymentSheet>`-Header rendert der Banner exakt diesen Wortlaut:

> „**[Speculative 2027]** Diese Pay-Rail simuliert eine spekulative 2027-Konvergenz von BundID-Postfach und FITKO-XBezahldienste-Standard (IT-Planungsrats-Beschluss 2023/51), die heute (Mai 2026) nicht beschlossen ist. Heute erfolgt der Zahl-Pfad pro Behörde separat über deren Online-Strecke."

i18n-Key: `posteingang.payment.speculative_banner` (DE-Source-of-Truth verbatim oben; i18n-localizer übersetzt in EN/RU/UK/AR/TR — § 10).

### 1.3 Loom-cut-script (30 Sekunden)

| Sekunde | Screen | Aktion | Was der Viewer sieht |
|---|---|---|---|
| 0–3 | `/posteingang` | Bürger:in (Mehmet) scrollt zu Steuerbescheid 2024 mit Frist 12.06.2026 | LetterCard mit FristChip „Frist 12.06.2026 (29 Tage)" |
| 3–6 | `/posteingang/letter-mehmet-fa-steuerbescheid-2024` | Klick öffnet LetterReader | Sticky-Band unten zeigt FristChip + drei CTAs: **„Zahlung vorbereiten"** primary, „Antwort verfassen" secondary, Overflow-Kebab |
| 6–10 | LetterReader | Klick „Zahlung vorbereiten" | `<PaymentSheet>` slidet von rechts ein. Speculative-Banner sichtbar. Phishing-Confirmation-Checkbox sichtbar mit 1-Satz-Summary + collapsed `<details>` |
| 10–14 | PaymentSheet | Klick auf Phishing-Checkbox „Ich habe die IBAN im Brief mit der hier angezeigten verglichen" | EPC-QR + 3 Copy-Buttons werden unblurred / aktiviert |
| 14–22 | PaymentSheet | Bürger:in scannt EPC-QR mit Smartphone-Sparkasse-App | Sparkasse-App füllt Überweisungs-Maske vor: Empfänger „Finanzamt Köln-Mitte", IBAN „[MOCK] DE09 3705 0198 0001 9998 11", Betrag „4.812,00 €", Verwendungszweck „22/345/12345 ESt 2024" |
| 22–26 | PaymentSheet | Bürger:in tippt im Sheet zusätzlich „IBAN kopieren" als Backup | Toast „IBAN in Zwischenablage kopiert"; im Hintergrund Activity-Log-Eintrag `payment_initiated` geschrieben |
| 26–30 | LetterReader | Sheet schließt | Sticky-Band-CTA bleibt — Pay ist „initiiert", aber **nicht** als „bezahlt" markiert (Domain §10 #10: App sieht keine Bank-Antwort) |

**Hero-Persona**: Mehmet Yıldız (Selbstständiger) mit Steuerbescheid 4.812 € Nachzahlung. Auf seiner 5-Brief-Inbox tragen 3 Briefe Pay-Intent → 60 % Surface der Persona — der demo-Anker.

---

## 2. User flow (Mehmet, Steuerbescheid 4.812 €)

### 2.1 Glücksflow (kein Aussetzungs-Antrag, alle Citation-Matches grün)

1. Mehmet öffnet `/posteingang/letter-mehmet-fa-steuerbescheid-2024`.
2. Sticky-Band zeigt FristChip „Einspruchsfrist 12.06.2026" mit `<NormTooltip>` (Säumnis-§-240-AO-String, V1-Mechanik). Der Frist-Chip-Selector löst die zwei gleich-datierten Fristen `einspruch + zahlung` zugunsten `einspruch` auf (Tie-Break-Regel domain §10.A.c).
3. Drei CTAs im Sticky-Band, da `letter.payment !== undefined ∧ earliest-unfulfilled-Frist.typ === 'zahlung'` für die Pay-Sichtbarkeitsprüfung **nach Filter auf `unfulfilled`**: „Zahlung vorbereiten" **primary**, „Antwort verfassen" **secondary**, Kalender + View-Sent + Save + Original im Overflow-Kebab.

   > **Hinweis zur Tie-Break-Asymmetrie**: Der FristChip-Label-Selector (`selectEarliestFrist`) nutzt die volle Typ-Priorität (`einspruch > widerspruch > zahlung > nachweis > antragstellung > frist_verlaengerung > informativ`) und zeigt deshalb „Einspruchsfrist". Die CTA-Priorität dagegen prüft nur, ob es **eine** unerfüllte `zahlung`-Frist gibt — der primäre CTA ist „Zahlung vorbereiten", weil der zahlungsbedürftige Pfad konkret-aktionierbar ist. Diese Asymmetrie ist Absicht (domain §10.A): Frist-Chip-Label spiegelt Verfahrens-Hierarchie, CTA-Prio spiegelt Bürger:innen-Aktion.
4. Klick auf „Zahlung vorbereiten" öffnet `<PaymentSheet>` (shadcn/ui `<Sheet>`, 480 px Desktop / fullscreen Mobile, von rechts; AR-RTL flippt zu links via `rtl:`-Variant).
5. Im Sheet sichtbar (top-down):
   - Header mit Titel „Zahlung vorbereiten" + Close-Button (`aria-label="Zahlung-Vorbereiten-Sheet schließen"`)
   - Speculative-2027-Banner (§ 1.2)
   - Phishing-Confirmation-Block (Mehmet-FA hat `auth_channel: 'briefpost'`): 1-Satz-Summary („Behörden-Bescheid in Papierform vor Ihnen — IBAN gegenprüfen") + `<details>` collapsed mit 4-Satz-Disclaimer + Bestätigungs-Checkbox („Ich habe die IBAN im Brief mit der hier angezeigten verglichen.")
   - **Vor Aktivierung der Checkbox**: 3 Citation-Rows + EPC-QR + 2 Copy-Buttons sind `disabled` (CSS: `opacity-50 pointer-events-none aria-disabled="true"`); QR ist gerendert, aber halbtransparent als visueller Anker.
6. Mehmet klickt die Checkbox → die 3 Citation-Rows + EPC-QR + Copy-Buttons werden interaktiv. Activity-Log schreibt `payment_phishing_confirmed` (note: `letter_id`).
7. Drei `<PaymentCitationRow>` zeigen verbatim:
   - **IBAN**: `DE09 3705 0198 0001 9998 11` (mit Citation-Match-Indicator ✓ — Substring im normalisierten body_de matcht; § 4 Spec § 12.A)
   - **Betrag**: `4.812,00 €` (Citation-Match-Indicator ✓ — Match in Zahlungs-Lemma-Satz; § 12.B)
   - **Verwendungszweck**: `22/345/12345 ESt 2024` (Citation-Match-Indicator ✓ — Aktenzeichen-Substring + ESt-Suffix; § 12.C)
8. EPC-QR wird full-width gerendert (Version `002`, Charset `1` UTF-8, BIC optional bleibt aber drin: `COLSDE33XXX`, EPC069-12 v3.1 payload <331 Bytes, clientseitig per `qrcode`-Lib).
9. DSGVO-Datenminimierung-Banner unten (Erst-Nutzung einmalig per localStorage-Flag `govtech-de:v1:payment:datenmini-banner-seen`).
10. Mehmet scannt den QR mit Sparkasse-App (außerhalb der Demo) ODER tippt auf „IBAN kopieren" → Toast „IBAN in Zwischenablage kopiert" (`role="status"`, `aria-live="polite"`).
11. Activity-Log-Eintrag `payment_initiated` wird geschrieben **on first interactive trigger**: entweder erstem Copy-Click ODER QR-Scan-State (impossibe to detect — fallback: on Sheet-Open nach Phishing-Checkbox-Confirmation). Domain §7 + §11.D Vorgabe.
12. Sheet bleibt offen; Bürger:in schließt ihn manuell. Kein „Bezahlt"-Status — die App sieht keine Bank-Antwort.

### 2.2 Edge case: Aussetzungs-Antrag offen (Cross-state, domain §11)

Wenn `letter.replies.some(r => r.template === 'aussetzung_vollziehung_skelett' ∧ r.behoerde_response_status !== 'rejected')` (im Mock-World immer true bei vorhandener Aussetzungs-Reply):

- Pay-CTA bleibt **sichtbar**, aber visuell auf **secondary**-Style heruntergestuft (`variant="outline"` in shadcn/ui-Notation, mit muted-Farb-Token statt primary).
- Pay-CTA-Label ändert sich von „Zahlung vorbereiten" zu **„Zahlung trotz Aussetzungs-Antrag vorbereiten"** (verbatim, domain §11.C).
- Im PaymentSheet-Header **direkt unter** dem Speculative-Banner erscheint ein zusätzlicher Sub-Disclaimer (verbatim, domain §11.C):

  > „Sie haben am {datum_aussetzung} Aussetzung der Vollziehung nach § 361 Abs. 2 AO beantragt. Eine Zahlung vor der Entscheidung der Finanzbehörde ist möglich, aber nicht erforderlich. Säumniszuschläge nach § 240 AO entstehen weiter, solange die Aussetzung nicht bewilligt ist."

- Token `{datum_aussetzung}` = `formatDateDe(latest-aussetzung-Reply.gesendet_am)`.
- Activity-Log-Eintrag `payment_initiated` trägt zusätzlich `context: { aussetzung_pending: true, aussetzung_reply_id: '<id>', aussetzung_datum: '<ISO>' }`.

### 2.3 Edge case: Archetype nicht in canonical-list

Wenn `showPayCTA(letter) === false` (Brief ist z. B. `familienkasse-nachweis`, `standesamt-urkunde`, `buergeramt-meldung`, oder `letter.payment === undefined`):

- Pay-CTA wird **nicht gerendert** (kein grayed-out Button, AV9). Der Sticky-Band-Render-Tree fällt auf den V1.5-Zustand zurück (Kalender + Reply als die zwei sichtbaren CTAs).

### 2.4 Edge case: Citation-Match-Gate verletzt

Wenn nach Phase-1+2 der Normalisierung (§ 12) **eine** der drei Citation-Matches `false` ist (z. B. zwei IBANs im body_de gefunden, Betrag-Lemma-Kontext mehrdeutig, Aktenzeichen-Format weicht ab):

- `<PaymentCitationRow>` für die fehlgeschlagene Citation rendert **nicht** den ✓-Indikator + Copy-Button, sondern eine **Hand-off-Zeile** mit Wortlaut (verbatim, domain §8 Hand-off):

  > „Wir konnten Bankverbindung oder Betrag nicht eindeutig aus dem Brief übernehmen. Bitte übertragen Sie IBAN, Verwendungszweck und Betrag selbst aus dem Original-Brief in Ihre Bank-App. (Mehr als eine IBAN gefunden — oder Betrags-Kontext mehrdeutig.)"

- EPC-QR wird **nicht** gerendert (Pflicht-Gate, da QR ohne validate IBAN unschein-übertragend wäre).
- „IBAN kopieren"/„VZ kopieren" Buttons bleiben sichtbar **nur** für die Citations, die GRÜN sind; rote Citations zeigen kein Copy-Button.

---

## 3. Component Inventory

> Folder layout per CLAUDE.md: components in `src/components/posteingang/<file>.tsx` (kebab-case). Alle hier neuen Komponenten sind `'use client'`, weil sie interactive State (Phishing-Checkbox, Copy-Button-Klicks, QR-render-on-mount) tragen.

### 3.1 NEW `src/components/posteingang/payment-sheet.tsx`

- **Purpose**: Modal-Sheet, der die gesamte Pay-Vorbereitungs-UX umfasst. Open-Trigger: „Zahlung vorbereiten"-Klick in `StickyFristAction`.
- **Underlying primitive**: shadcn/ui `<Sheet>` (von `@/components/ui/sheet`) — analog zu `<ReplySheet>` aus V1.5. Side `right` Default; AR-RTL flippt zu `left` via Tailwind `rtl:`-variants in der Sheet-Konfiguration.
- **Width**: 480 px Desktop (md+), `fullscreen` Mobile (sm).
- **Props shape** (TypeScript-Signatur, Implementation by frontend-coder):
  ```ts
  interface PaymentSheetProps {
    letter: Letter;          // includes letter.payment populated
    open: boolean;
    onOpenChange: (open: boolean) => void;
    isAussetzungOpen: boolean;          // result of api.hasOpenAussetzungsAntrag(letter)
    aussetzungDatum: string | null;     // ISO from latest aussetzung reply, or null
    citationMatchResult: { iban: boolean; betrag: boolean; vz: boolean }; // from api.matchAllPaymentCitations
    onPaymentInitiated: () => void;     // called once on first interactive trigger (copy/qr render trigger)
    onPhishingConfirmed: () => void;    // called once on checkbox-toggle
    isFirstPaymentEver: boolean;        // for one-time DSGVO-Datenminimierung-Banner
  }
  ```
- **Internal state**:
  - `phishingConfirmed: boolean` — local; default `false`. Toggle persisted to component-state only; `onPhishingConfirmed` fires the side-effect (Activity-Log).
  - `paymentInitiatedFired: boolean` — local; ensures `onPaymentInitiated` is fired once-per-Sheet-Session (idempotent on re-trigger).
- **Internal sub-components** (children of PaymentSheet):
  - `<PaymentSheetHeader>` — Titel + Speculative-Banner + (conditional) Aussetzungs-Sub-Disclaimer + Phishing-Confirmation-Block.
  - `<PaymentSheetBody>` — 3 `<PaymentCitationRow>` + `<EpcQrCode>`.
  - `<PaymentSheetFooter>` — DSGVO-Datenminimierung-Banner (conditional, einmalig).
- **Accessibility**:
  - `aria-modal="true"`, `aria-labelledby="payment-sheet-title"`.
  - Focus-trap: shadcn/ui `<Sheet>` liefert nativ; verifier: ESC-dismiss reicht zurück zu `<StickyFristAction>` „Zahlung vorbereiten"-Button.
  - Phishing-Checkbox erreichbar via Tab; QR + Copy-Buttons werden mit `aria-disabled="true"` annotiert solange `phishingConfirmed === false` (sondern: gar nicht im Tab-Order — `tabIndex={-1}`).
  - Screen-Reader: nach Phishing-Checkbox-Klick `aria-live="polite"` mit Text „Bezahl-Daten freigegeben".

### 3.2 NEW `src/components/posteingang/payment-citation-row.tsx`

- **Purpose**: Eine Zeile im PaymentSheet-Body — read-only Label + Wert + Copy-Button + Citation-Match-Indicator.
- **Layout** (ASCII):
  ```
  ┌─────────────────────────────────────────────────────────────────┐
  │  IBAN                                              ✓             │
  │  DE09 3705 0198 0001 9998 11                  [📋 Kopieren]      │
  └─────────────────────────────────────────────────────────────────┘
  ```
  Bei Citation-Match-Fail:
  ```
  ┌─────────────────────────────────────────────────────────────────┐
  │  IBAN                                              ⚠             │
  │  Wir konnten die IBAN nicht eindeutig aus dem Brief übernehmen.  │
  │  Bitte aus dem Original-Brief abtippen.                          │
  └─────────────────────────────────────────────────────────────────┘
  ```
- **Props shape**:
  ```ts
  interface PaymentCitationRowProps {
    label: string;                  // i18n: posteingang.payment.row.iban_label etc.
    value: string;                  // verbatim aus LetterPayment (oder leer wenn fail)
    citationMatch: boolean;         // controls indicator + Copy-Button visibility
    handoffMessage: string;         // verbatim Wortlaut wenn fail (i18n: posteingang.payment.handoff)
    onCopy: () => void;             // wraps clipboard.writeText + Activity-Log + Toast
    disabled: boolean;              // true wenn Phishing-Checkbox noch nicht geklickt
    fieldKey: 'iban' | 'betrag' | 'verwendungszweck';
  }
  ```
- **Accessibility**:
  - `role="group"` mit `aria-labelledby` auf den Label-Span.
  - Copy-Button hat `aria-label="{label} in Zwischenablage kopieren"`.
  - Citation-Match-Indicator: `<span aria-label="Aus Brief übernommen">✓</span>` (success) oder `<span aria-label="Hand-off — bitte selbst übertragen">⚠</span>` (fail).
  - `aria-disabled="true"` wenn `disabled`.
  - On copy success: `aria-live="polite"` toast in shared region (vom Sheet-Parent gehostet).

### 3.3 NEW `src/components/posteingang/epc-qr-code.tsx`

- **Purpose**: Client-side EPC-QR-Renderer; nimmt `LetterPayment` + `empfaenger_name`, generiert EPC069-12 v3.1 payload, rendert als inline-SVG.
- **Library recommendation (locked)**: **`qrcode` (npm)** Version ^1.5.x. Begründung: lightweight (~30 KB minified gzipped), browser-runnable, keine externen Fetches, supports SVG-Output natively (`QRCode.toString(payload, { type: 'svg' })`). Alternative `qr-code-styling` ist 3× schwerer; `qrcode-generator` hat keine Type-Defs. Lock auf `qrcode`.
- **Bundle impact**: ~30 KB additional gzipped on the LetterReader-route (acceptable; only loaded via dynamic import: `const QR = await import('qrcode')`).
- **Props shape**:
  ```ts
  interface EpcQrCodeProps {
    payment: LetterPayment;        // iban / bic / empfaenger / betrag_cents / verwendungszweck
    sizePx?: number;               // default 280; min 200 for EPC scanner-reliability
    disabled: boolean;             // true wenn Phishing-Checkbox noch nicht geklickt → render mit reduced opacity, aria-hidden
  }
  ```
- **Internal logic**:
  - Build EPC payload (12 lines, LF-separated, UTF-8, ≤331 Bytes — § 8 unten).
  - Async-load `qrcode` lib; render to inline SVG string; insert via React.
  - On failure (payload >331 Bytes — should not happen given seed limits): fallback to text-only display with `role="alert"` and i18n key `posteingang.payment.qr_error`.
- **Accessibility**:
  - `role="img"` on the wrapper SVG.
  - `aria-label="EPC-QR-Code (SEPA-Überweisung) — Empfänger {empfaenger}, Betrag {betrag_formatted}, Verwendungszweck {vz}"`.
  - `aria-hidden="true"` wenn `disabled === true` (Phishing-Checkbox not yet clicked).
  - SVG itself: `focusable="false"` (default in modern browsers; explicit anyway for IE-edge).

### 3.4 NEW `src/components/posteingang/phishing-confirmation-checkbox.tsx`

- **Purpose**: Inline-Checkbox-Block im PaymentSheet-Header — ersetzt den prior-Modal-Pattern (verifier AV3 / domain §9 hard-line).
- **Layout** (ASCII):
  ```
  ┌─────────────────────────────────────────────────────────────────┐
  │  ⚠ Behörden-Bescheid in Papierform vor Ihnen — IBAN gegenprüfen │
  │  ▸ Mehr Informationen                                            │
  │                                                                   │
  │  ☐ Ich habe die IBAN im Brief mit der hier angezeigten verglichen│
  └─────────────────────────────────────────────────────────────────┘
  ```
  Expanded `<details>`:
  ```
  ▾ Mehr Informationen
    Sie sehen diesen Brief als Mock einer Briefpost-Sendung. Bitte
    prüfen Sie den ausgedruckten Bescheid in Ihren Händen: stimmt die
    im QR-Code angezeigte IBAN mit der im Brief gedruckten überein?
    Behörden-Bescheide enthalten die Bankverbindung am Brief-Fuß.
    Bestätigen Sie die Übereinstimmung, bevor Sie überweisen.
    (Phishing-Risiko: § 263 StGB Betrug.)
  ```
- **Props shape**:
  ```ts
  interface PhishingConfirmationCheckboxProps {
    confirmed: boolean;
    onConfirmedChange: (next: boolean) => void;
    summaryText: string;        // i18n: posteingang.payment.phishing.summary
    detailsText: string;        // i18n: posteingang.payment.phishing.details (4-sentence verbatim)
    checkboxLabel: string;      // i18n: posteingang.payment.phishing.checkbox_label
    detailsToggleLabel: string; // i18n: posteingang.payment.phishing.details_toggle ("Mehr Informationen")
  }
  ```
- **Accessibility**:
  - Native `<details>` for collapse — Tastatur Space/Enter on `<summary>`.
  - Native `<input type="checkbox">` mit explizitem `<label htmlFor>` Verknüpfung.
  - Summary-Zeile bleibt **immer sichtbar**, auch bei collapsed `<details>` (1-Satz default).
  - Visible 24×24 px Touch-Target für Checkbox; fokus-ring contrast ≥ 3:1.
  - Conditional: nur gerendert wenn `letter.auth_channel === 'briefpost'`. Bei `'mein-elster'`/`'zbp-bundid'`/`'krankenkassen-portal'`/`'eudi-versiegelt'` → Komponente returns `null`, Checkbox-Logik wird übersprungen, `phishingConfirmed` startet auto-`true`.

### 3.5 EXTEND `src/components/posteingang/sticky-frist-action.tsx`

- **Existing shape**: V1.5 `StickyFristAction` (siehe `src/components/posteingang/StickyFristAction.tsx:48–183`) trägt FristChip + (optional Kalender) + (optional View-Sent) + Reply-Button + Overflow-Kebab.
- **V2 additions**:
  - **Pay-CTA-Render**: zwischen FristChip-Reihe und CTA-Reihe ein dritter primärer Button „Zahlung vorbereiten" (oder Aussetzungs-Variant-Label), gerendert nur wenn `showPayCTA(letter) === true`.
  - **CTA-priority recompute** (§ 9 unten): basierend auf `selectEarliestUnfulfilledFrist(letter).typ`:
    - `typ === 'zahlung'` UND `letter.payment !== undefined` → **Pay primary**, Reply secondary, Kalender + View-Sent in Overflow.
    - sonst (typ `einspruch`/`widerspruch`/`nachweis`/`antragstellung`/`frist_verlaengerung`/`informativ`) → Reply primary (V1.5-Status-quo); Pay sekundär als secondary-button neben Reply (wenn Pay sichtbar) ODER nicht gerendert.
  - **Aussetzungs-State**: wenn `hasOpenAussetzungsAntrag(letter) === true` → Pay-CTA bleibt **sichtbar**, aber `variant="outline"` (= secondary-Style) und Label-Variant „Zahlung trotz Aussetzungs-Antrag vorbereiten".
- **New props**:
  ```ts
  interface StickyFristActionProps {
    // existing V1.5 props ...
    payment: LetterPayment | null;            // null wenn Brief nicht zahlungsbedürftig
    earliestUnfulfilledFristTyp: LetterFristTyp | null;  // for CTA-priority compute
    isAussetzungOpen: boolean;
    onPay: () => void;                         // open PaymentSheet
  }
  ```
- **i18n keys (new) — see § 10**.
- **Accessibility note**: max 3 sichtbare Hauptbuttons im Sticky-Band (Pay + Reply + Overflow-Kebab) — verifier AV10. Wenn vier sichtbar wären, wandert Kalender ins Overflow.

### 3.6 EXTEND `src/components/shared/NormTooltip.tsx` (V1, REUSE)

- Säumnis-Wortlaut pro Archetyp lebt in V1's existierendem `<NormTooltip>` an `<FristChip>`. **V2 fügt KEINE neue Komponente hinzu**; V2 ergänzt nur die i18n-Keys `posteingang.frist.norm_tooltip.{archetype}.saeumniszuschlag_info` für die 4 fehlenden Archetypes (KK, Beitragsservice, IHK, BG, OWi-optional) — siehe § 10. Steuerbescheid-Variant existiert bereits.
- **HARD-LINE**: Säumnis-String darf **nicht** im PaymentSheet, **nicht** in PaymentCitationRow, **nicht** in visueller Adjazenz zum „Zahlung vorbereiten"-Button platziert werden. Nur im NormTooltip am Frist-Chip (AV2). Spec-Lint enforced via § 11.5.

### 3.7 NICHT geändert (Komponenten bleiben V1.5-Status quo)

- `<LetterReader>` — hostet `<PaymentSheet>` als Client-Sub-Tree; passt `letter` via Props durch.
- `<LetterCard>` — keine Pay-Visualisierung auf Card-Ebene (Pay ist Reader-only).
- `<FristChip>` — kein Visual-Change.
- `<AISummaryBlock>` — KI-Summary darf optional einen Pay-Hinweis erwähnen („Sie haben noch X € zu zahlen") wie V1.5 es bereits tut, aber **kein Citation-Match-Indicator** auf Summary-Ebene (Citation-Match lebt nur im PaymentSheet).
- `<DatenschutzCockpitLink>` — V1-Surface zeigt `payment_initiated`-Activity-Log-Eintrag automatisch (kein neues Cockpit-UI).

---

## 4. Data model extensions

### 4.1 NEW interface `LetterPayment` in `src/types/letter.ts`

```ts
/**
 * Pay-Rail-Sub-Type. Existiert nur für Briefe der canonical-list (§ 6 / domain §10.A).
 * IBAN/Empfaenger/Verwendungszweck sind verbatim aus letter.body_de (Citation-Match-Pflicht).
 *
 * Persistierungsformat: integer cents (avoid float-rounding); UI-Render formatiert als 'EUR 1.247,00'.
 */
export interface LetterPayment {
  /** IBAN in electronic format, no whitespace, NO [MOCK]-prefix. ISO-13616 mod-97-10 valide.
   *  Ein Substring im normalisierten body_de matcht (per § 12.A normalize+haystack).
   *  Beispiel: "DE09370501980001999811" */
  iban: string;
  /** Optional BIC; EPC-QR Field 5 (optional ab Version 002). Beispiel: "COLSDE33XXX" */
  bic?: string;
  /** Empfänger-Name verbatim aus Briefkopf. EPC-QR Field 6 (max 70 chars). */
  empfaenger_name: string;
  /** Betrag in integer cents — vermeidet float-Rundungsfehler. Beispiel: 481200 = 4.812,00 €. */
  betrag_cents: number;
  /** Currency. V2 immer 'EUR'. */
  waehrung: 'EUR';
  /** Verwendungszweck verbatim aus letter.aktenzeichen (per § 12.C normalize); ggf. + Steuerart-Suffix.
   *  EPC-QR Field 11 (max 140 chars). KEINE LLM-Generierung. */
  verwendungszweck: string;
}

/** Erweiterung der bestehenden Letter-Interface in src/types/letter.ts. */
export interface Letter {
  // ... V1+V1.5 fields bleiben unverändert ...
  /** Pay-Rail-Daten; nur gesetzt für Briefe der canonical-list (§ 6). undefined → Pay-CTA versteckt. */
  payment?: LetterPayment;
}
```

> **Hinweis**: `citation_iban_match` / `citation_betrag_match` / `citation_aktenzeichen_match`-Felder sind **NICHT** persistiert in `LetterPayment`. Sie werden **at runtime** über `api.matchAllPaymentCitations(letter)` (§ 5) berechnet — pure Funktion gegen `body_de`. Begründung: silent persistence-rot würde dazu führen, dass ein body_de-Edit ohne Re-Match grünes ✓ behält. Runtime-compute ist deterministisch und billig.

### 4.2 Activity-log enum extension in `src/types/letter.ts`

```ts
export type LetterActivityEvent =
  | 'opened_in_app'
  | 'summary_generated'
  | 'frist_added_to_calendar'
  | 'marked_read'
  | 'archived'
  | 'reply_compose_started'
  | 'reply_template_inserted'
  | 'reply_draft_saved'
  | 'reply_draft_deleted'
  | 'reply_sent_simulated'
  // V2 — Pay-Rail (domain §7 + §11.D):
  | 'payment_phishing_confirmed'   // Bürger:in hat Phishing-Checkbox geklickt (one-shot per Sheet-Session)
  | 'payment_initiated';            // EPC-QR scan-bereit oder erste Copy-Aktion ausgeführt
```

> **HARD-LINE Datenminimierung (§ 11.12)**: `note` für `payment_initiated` enthält **nur** `archetype:<archetype>` + `betrag_cents:<n>` + optional `channel:'epc_qr'|'clipboard'`. **NIEMALS** die IBAN, niemals den Empfänger-Namen, niemals den vollen Verwendungszweck im note-String. Beispiel: `note: "channel:epc_qr; archetype:steuerbescheid; betrag_cents:481200"`.

> **HARD-LINE**: KEIN Cockpit-Toggle für Pay-Rail (lit. b nicht lit. a; domain §7). Activity-Log-Einträge tragen `rechtsgrundlage: 'Art. 6 Abs. 1 lit. b DSGVO Vertragserfüllung'` (verschieden zu V1.5-Reply, das `lit. a Einwilligung` trägt — bewusste Inkonsistenz, weil V1.5-Reply kein Toggle aber lit. a verwendet hat; V2-Pay setzt lit. b und ist damit konsistenter mit Domain-v2).

### 4.3 NICHT geändert

- `Letter.fristen[]` — V1.5-Frist-Schema bleibt; Pay-CTA-Visibility nutzt Archetype-Override (§ 6) für die 4 impliziten-Zahl-Archetypen, die in V1.5 keine `frist.typ === 'zahlung'`-Frist tragen.
- `Reply` / `ReplyDraft` — V1.5-Schema bleibt; `r.template === 'aussetzung_vollziehung_skelett'` ist V1.5.1-Ergänzung (nicht in V2-Scope; aber V2 reagiert via `hasOpenAussetzungsAntrag` auf das Template-Vorhandensein).

---

## 5. Mock-backend additions (mock-backend-coder)

### 5.1 NEW pure module `src/lib/mock-backend/citation-match.ts`

```ts
// Pure functions — no I/O, no LLM-calls, deterministic. Verbatim implementation per domain §12.

export function normalizeIbanForCitationMatch(iban: string): string;
export function bodyContainsIban(body_de: string, iban: string): boolean;

export function normalizeBetragForCitationMatch(betragRaw: string): number;
export function bodyContainsBetrag(body_de: string, betragCents: number): boolean;

export function normalizeAktenzeichenForCitationMatch(az: string): string;
export function bodyContainsAktenzeichen(body_de: string, aktenzeichen: string): boolean;

/** Aggregator — wendet alle drei Citation-Gates an + zählt mehrfach-IBAN-Match (§ 8 #1) und
 *  Betrag-Lemma-Kontext (§ 8 #2). Returns boolean per field. */
export function matchAllPaymentCitations(
  letter: Letter
): { iban: boolean; betrag: boolean; vz: boolean };
```

**Implementation rules (verbatim from domain §12, mock-backend-coder darf nicht abweichen)**:

- **§ 12.A IBAN normalize**: strip `^\[MOCK\]\s*`, strip ALL whitespace (`\s+`), `.toUpperCase()`. Search-regex on normalized haystack: `/[A-Z]{2}\d{2}[A-Z0-9]{16,30}/g`. Mehr-IBAN-Detection: wenn Regex-Match-Count auf normalized haystack > 1 distinct IBANs → `iban: false` (Hand-off).
- **§ 12.B Betrag normalize**: strip currency-prefix/suffix (`EUR `, ` EUR`, `€`, ` €`), strip thousand-separator (`.` zwischen 3-Ziffer-Gruppen via `\.(?=\d{3}(?:\D|$))`), replace `,` → `.`, parseFloat. Vergleich gegen `betrag_cents / 100` mit `Math.abs(diff) < 0.01`. Lemma-Kontext-Filter: das matchende Vorkommen muss in einem Satz mit einem dieser Lemmata stehen: `zahlen`, `Zahlung`, `Nachzahlung`, `Gesamtbetrag`, `Beitrag`, `Rechnungsbetrag`, `Säumniszuschlag`, `fällig`. Mehrere Beträge im body_de: nur das Vorkommen in einem Lemma-Satz akzeptieren.
- **§ 12.C VZ normalize**: strip `^\[MOCK\]\s*`, `.trim()`. Substring-Match case-sensitive (Aktenzeichen ist alphanumerisch + slashes/Bindestriche).
- **Phase-3 Gate-Decision** (in `matchAllPaymentCitations`): `iban && betrag && vz && IBAN-Match-Count === 1 && Betrag-Lemma-Kontext === true`. Bei Verletzung: einzelne Booleans bleiben false.

### 5.2 NEW api methods in `src/lib/mock-backend/api.ts`

```ts
/** Wraps letter.payment with simulated 300-800ms latency.
 *  Returns null wenn letter.payment === undefined. */
export async function getPaymentForLetter(letterId: string): Promise<LetterPayment | null>;

/** Schreibt Activity-Log-Eintrag mit context-Feld. Throttle: einmal pro Sheet-Session (frontend
 *  ruft per ref-flag idempotent). Kein Re-Throttle hier; mock-backend schreibt jeden Aufruf.
 *  Frontend-coder muss Throttle implementieren analog V1.5 reply_draft_saved.
 *  HARD-LINE: note-String enthält KEINE IBAN, NUR archetype + betrag_cents (+ optional channel).
 *  rechtsgrundlage: 'Art. 6 Abs. 1 lit. b DSGVO Vertragserfüllung'. */
export async function recordPaymentInitiated(
  letterId: string,
  channel: 'epc_qr' | 'clipboard',
  context?: { aussetzung_pending?: boolean; aussetzung_reply_id?: string; aussetzung_datum?: string }
): Promise<void>;

/** Schreibt einmaligen `payment_phishing_confirmed`-Activity-Log-Eintrag.
 *  Frontend ruft idempotent (ref-flag); mock-backend schreibt jeden Call. */
export async function recordPaymentPhishingConfirmed(letterId: string): Promise<void>;

/** Tie-Break-Regel domain §10.A.c: primary nach datum asc, sekundär nach Typ-Priorität.
 *  Gibt nur unerfüllte Fristen zurück (für CTA-Priority-Compute).
 *  Returns null wenn fristen.length === 0 oder alle erledigt. */
export function selectEarliestUnfulfilledFrist(letter: Letter): LetterFrist | null;

/** Detector: hat dieser Brief eine offene Aussetzungs-Antrag-Reply?
 *  Nutzt: letter.replies.some(r => r.template === 'aussetzung_vollziehung_skelett'
 *           && r.status === 'sent_simulated'  // im Mock: keine Behörden-Antwort, daher equiv to "open")
 *  Im V1.5-Mock-Welt gibt es kein behoerde_response_status — Bedingung effektiv: irgendeine
 *  Aussetzungs-Reply mit status 'sent_simulated' existiert. */
export function hasOpenAussetzungsAntrag(letter: Letter): boolean;

/** Zentrale Visibility-Funktion. Implementiert verbatim § 6 Predikat:
 *  letter.payment !== undefined
 *    && (letter.fristen.some(f => f.typ === 'zahlung' && !f.erledigt)
 *        || letter.archetype ∈ {beitragsservice, ihk-beitrag, berufsgenossenschaft-beitrag,
 *                                krankenkasse-beitrag, beitragsservice-mahnung}) */
export function showPayCTA(letter: Letter): boolean;
```

> **`recordPaymentInitiated` Activity-log-Schema (verbatim Note-Format, mock-backend-coder enforcet)**:
> ```
> note: `channel:${channel}; archetype:${letter.archetype}; betrag_cents:${letter.payment.betrag_cents}`
> rechtsgrundlage: 'Art. 6 Abs. 1 lit. b DSGVO Vertragserfüllung'
> by: 'app_internal'
> at: ISO-Timestamp
> // when context !== undefined: serialize as additional note suffix:
> // note += `; aussetzung_pending:true; aussetzung_reply_id:${id}; aussetzung_datum:${iso}`
> ```

### 5.3 zod-Schema-Sync in `src/lib/mock-backend/schemas.ts`

- `letterActivityLogEntrySchema.shape.event` Union erweitern um `'payment_initiated'` und `'payment_phishing_confirmed'`.
- `letterPaymentSchema` neu definieren mit `iban: z.string().regex(/^[A-Z]{2}\d{2}[A-Z0-9]{16,30}$/)`, `bic: z.string().optional()`, `empfaenger_name: z.string().min(1).max(70)`, `betrag_cents: z.number().int().positive().lte(99999999999)` (max EUR 999.999.999,99 per EPC-Spec), `waehrung: z.literal('EUR')`, `verwendungszweck: z.string().min(1).max(140)`.
- `letterSchema.shape.payment = letterPaymentSchema.optional()`.
- `_AssertEq`-Drift-Guards (V1-Pattern aus posteingang.md § 6) bleiben in Kraft — TypeScript-Type ↔ zod-Schema sync.

### 5.4 NICHT geändert

- `getLetters()`, `getLetter(id)`, `protokolliereLetterAktivitaet` (V1) — bleiben unverändert; Pay-Rail nutzt sie via Wrapper.
- `getReplyForLetter(letterId)`, `simulateSendReply` (V1.5) — bleiben unverändert.

---

## 6. Seed-data rewrite (HARD precondition)

> **HARD-PRECONDITION** (verifier AV6 + § 11.8): Diese Seed-Mutation ist ein **Hard-Gate** vor jedem PaymentSheet-PR-Merge. `tests/unit/letter-payment-iban.test.ts` und `tests/unit/letter-payment-citation-match.test.ts` müssen grün sein, bevor frontend-coder den ersten Pay-CTA-Render committen darf.

### 6.1 Bankverbindung-Footer-Block-Format (verbatim für jeden der 8 Briefe)

Mock-backend-coder ergänzt am **Ende** von `body_de` jedes der 8 Pay-Briefe einen Bankverbindungs-Footer-Block in **exakt diesem Format** (4-Zeilen-Block, vorangestellt durch eine Leerzeile + `--- Bankverbindung ---`-Trenner):

```

--- Bankverbindung ---
Empfänger: [Behörde verbatim]
IBAN: [IBAN mit 4-Zeichen-Gruppen-Trenner durch Spaces, e.g. "DE09 3705 0198 0001 9998 11"]
BIC: [BIC]
Verwendungszweck: [Aktenzeichen ohne MOCK-Prefix, ggf. + Steuerart-Suffix]
```

> **Hinweis zum [MOCK]-Watermark**: Der V1-Hard-Line-`[MOCK – Verwaltungsdemo, keine echten Daten]`-Watermark steht am Brief-**Top** (V1-Konvention). Der Bankverbindungs-Footer-Block ist **per se** Mock — die Spec verlangt **keine** zusätzliche `[MOCK]`-Inline-Markierung im Footer-Block. Die IBAN selbst ist `[MOCK]`-prefix-frei in `body_de` (per § 12.A erforderlich, damit der Substring-Match auf normalized haystack greift); die `LetterPayment.iban`-Property ist auch prefix-frei (Konvention der Persistierungsschicht). Das `[MOCK]`-Provenance-Label am Brief-Top + der erweiterte Brief-Disclaimer im PaymentSheet-DSGVO-Footer-Banner reichen aus.

### 6.2 Canonical letter-list (verbatim aus domain §10.A.B)

| # | Brief-ID | Archetype | Behörde (verbatim Empfänger-Name) | Mock-IBAN (electronic format, in `LetterPayment.iban`) | BIC | Verwendungszweck | Betrag (cents) | Body-Footer-Form (für `body_de`-Mutation) |
|---|---|---|---|---|---|---|---|---|
| 1 | `letter-mehmet-fa-steuerbescheid-2024` | `steuerbescheid` | „Finanzamt Köln-Mitte" | `DE09370501980001999811` | `COLSDE33XXX` | `22/345/12345 ESt 2024` | `481200` (= 4.812,00 €) | IBAN als „DE09 3705 0198 0001 9998 11" |
| 2 | `letter-schmidt-fa-steuerbescheid-2024` | `steuerbescheid` | „Finanzamt Hamburg-Eimsbüttel" | `DE55200500000150004288` | `HSHNDEHHXXX` | `[Schmidt-spezifische Steuernummer aus letter.aktenzeichen + ESt 2024]` | `[Schmidt-spezifischer Betrag aus body_de]` | IBAN als „DE55 2005 0000 0150 0042 88" |
| 3 | `letter-schmidt-krankenkasse-beitrag` | `krankenkasse-beitrag` | „Techniker Krankenkasse" | `DE58200500000123456789` | `HSHNDEHHXXX` | `[KVNR aus letter.aktenzeichen + Beitragsmonat]` | `[Betrag aus body_de]` | IBAN als „DE58 2005 0000 0123 4567 89" |
| 4 | `letter-mehmet-krankenkasse-freiwillig` | `krankenkasse-beitrag` | „AOK Rheinland/Hamburg" | `DE04370502990007777122` | `DAAEDEDDXXX` | `[KVNR aus letter.aktenzeichen + Beitragsmonat]` | `[Betrag aus body_de]` | IBAN als „DE04 3705 0299 0007 7771 22" |
| 5 | `letter-schmidt-beitragsservice-festsetzung` | `beitragsservice` (= V1.5-`beitragsservice-mahnung`-Archetype) | „ARD ZDF Deutschlandradio Beitragsservice" | `DE77370501980030081542` | `COLSDE33XXX` | `[9-stellige Beitragsnummer aus letter.aktenzeichen, ohne Spaces]` | `[Betrag aus body_de]` | IBAN als „DE77 3705 0198 0030 0815 42" |
| 6 | `letter-mehmet-beitragsservice-mahnung` | `beitragsservice-mahnung` | „ARD ZDF Deutschlandradio Beitragsservice" | `DE77370501980030081542` (identisch #5) | `COLSDE33XXX` | `[Mehmet-Beitragsnummer]` | `[Betrag aus body_de]` | IBAN als „DE77 3705 0198 0030 0815 42" |
| 7 | `letter-mehmet-ihk-beitrag` | `ihk-beitrag` | „IHK Köln" | `DE89370400440532013000` | `COBADEFFXXX` | `[Mitgliedsnummer aus letter.aktenzeichen]` | `[Betrag aus body_de]` | IBAN als „DE89 3704 0044 0532 0130 00" |
| 8 | `letter-mehmet-bgw-beitrag` | `berufsgenossenschaft-beitrag` | „Verwaltungs-Berufsgenossenschaft" | `DE32200500000103777703` | `HSHNDEHHXXX` | `[Mitgliedsnummer + Umlagejahr]` | `[Betrag aus body_de]` | IBAN als „DE32 2005 0000 0103 7777 03" |

> **Hinweis #6 vs #5**: Die Beitragsservice-IBAN ist demo-vereinfacht für beide Bescheide identisch. Realität: 1 IBAN pro Landesrundfunkanstalt; Mock-Konvention rechtfertigt das (siehe domain §10.B Hinweis zu Beitragsservice).

> **Optional 9. Brief**: `bussgeldbescheid` ist heute **nicht** im V1.5-Korpus — V2 seedet ihn **nicht**. Wenn ein zukünftiger Sprint einen `letter-mehmet-owi-bussgeld` ergänzt, gilt IBAN `DE76100500000190111023` / BIC `BELADEBEXXX` / Empfänger „Polizei Berlin Bußgeldstelle". V2-Scope: nur die 8 Briefe oben.

### 6.3 LetterPayment-Property setzen (mock-backend-coder)

Für jeden der 8 Briefe in `src/data/letters.json` — eine neue `payment`-Property anlegen mit den verbatim Werten aus § 6.2. Beispiel `letter-mehmet-fa-steuerbescheid-2024`:

```json
{
  "id": "letter-mehmet-fa-steuerbescheid-2024",
  ...
  "payment": {
    "iban": "DE09370501980001999811",
    "bic": "COLSDE33XXX",
    "empfaenger_name": "Finanzamt Köln-Mitte",
    "betrag_cents": 481200,
    "waehrung": "EUR",
    "verwendungszweck": "22/345/12345 ESt 2024"
  }
}
```

> **Schmidt + andere Persona-Briefe**: Mock-backend-coder liest die Original-`body_de` jedes Briefs, extrahiert Steuernummer / KVNR / Mitgliedsnummer aus `letter.aktenzeichen` (V1-Stand), und setzt `verwendungszweck` verbatim auf den extrahierten Wert (per § 12.C — kein LLM, pure String-Übernahme). Steuerart-Suffixe wie „ESt 2024" sind aus dem Original-`body_de` per Regex `/(ESt|USt|LSt|KöSt) \d{4}/` zu extrahieren und an den Verwendungszweck anzuhängen, falls gefunden — **nicht** vom LLM zu generieren.

### 6.4 Body-de-Mutation (Beispiel für #1 Mehmet-FA)

Existierender V1.5-`body_de`-Schwanz von `letter-mehmet-fa-steuerbescheid-2024` endet mit:
> „… Bitte zahlen Sie bis zum 12.06.2026 auf das untenstehende Konto."

Mock-backend-coder hängt **direkt nach** diesem Satz an (mit voraangestellter Leerzeile):

```

--- Bankverbindung ---
Empfänger: Finanzamt Köln-Mitte
IBAN: DE09 3705 0198 0001 9998 11
BIC: COLSDE33XXX
Verwendungszweck: 22/345/12345 ESt 2024
```

Identisches Pattern für die anderen 7 Briefe — IBAN und BIC und Empfänger und Verwendungszweck verbatim aus § 6.2.

### 6.5 ai_summary-Update (optional, KEINE Hard-Pflicht)

Mock-backend-coder darf — aber muss nicht — die `ai_summary.post_open.bullets` der 8 Briefe um einen zusätzlichen Bullet ergänzen, der den Pay-Anker erwähnt:

> „Bankverbindung im Brief-Fuß: Finanzamt Köln-Mitte, IBAN DE09 3705 0198 0001 9998 11, Verwendungszweck 22/345/12345 ESt 2024."

mit korrespondierendem Citation-Eintrag (`original_zitat` = der Bankverbindungs-Footer-Block-Inhalt). **Dies ist optional**, weil Pay-Rail-UX nicht vom Summary-Bullet abhängt; die Citation-Match-Gates greifen direkt auf `body_de`. **Empfehlung**: Summary-Bullet ergänzen für Mehmet-FA und Schmidt-FA (Demo-Anker-Briefe), die übrigen 6 lassen wie V1.5.

### 6.6 NICHT geändert

- V1.5-`body_de`-Inhalt (= alles vor dem neuen Footer-Block) bleibt verbatim erhalten.
- V1.5-`fristen[]` bleibt unverändert (keine neue `frist.typ === 'zahlung'`-Frist auf den 4 Archetype-Override-Briefen #3, #4, #5, #6, #7).
- V1.5-`aktenzeichen` bleibt mit `[MOCK] `-Prefix erhalten (V1-Watermark-Hard-Line). Pay-Rail's Citation-Match (§ 12.C) strippt den Prefix at runtime.
- V1.5-`required_action` (Legacy-Single-Action-Feld) bleibt unverändert.
- Activity-Log-Persistierung-Schema (V1-`govtech-de:v1:letter-activity-log`) bleibt; nur Enum-Werte erweitert.

---

## 7. PaymentSheet UX spec (canonical)

### 7.1 Open-Trigger

`<PaymentSheet>` wird vom `<LetterReader>` (Client-Sub-Tree) gehostet. Ein Klick auf den primary CTA „Zahlung vorbereiten" (oder Aussetzungs-Variant „Zahlung trotz Aussetzungs-Antrag vorbereiten") in `<StickyFristAction>` setzt einen Sheet-Open-State im Reader-Parent. Sheet-Open-Bedingung muss bereits beim CTA-Render-Zeitpunkt erfüllt sein:

```
showPayCTA(letter) === true
∧ selectEarliestUnfulfilledFrist(letter)?.typ === 'zahlung'  // for primary-style
   ODER
   showPayCTA(letter) === true && earliest-typ !== 'zahlung'   // for secondary-style
```

### 7.2 Layout (top-to-bottom — verbatim Order)

1. **Header**:
   - Titel „Zahlung vorbereiten" (i18n: `posteingang.payment.sheet_title`); bei Aussetzungs-State: „Zahlung trotz Aussetzungs-Antrag vorbereiten" (i18n: `posteingang.payment.sheet_title_aussetzung`).
   - Close-Button rechts (`aria-label="Sheet schließen"`).
2. **Speculative-2027-Banner** (verbatim § 1.2; full-width amber/orange-background-hint, body-Text in primary-foreground; subtle border).
3. **Aussetzungs-Sub-Disclaimer** *conditional* — nur wenn `isAussetzungOpen === true`. Verbatim Wortlaut § 2.2 (mit Token `{datum_aussetzung}`).
4. **Phishing-Confirmation-Block** — `<PhishingConfirmationCheckbox>` *conditional* — nur wenn `letter.auth_channel === 'briefpost'`. Andernfalls überspringen + `phishingConfirmed = true` initial.
5. **Body — drei `<PaymentCitationRow>`**:
   - Row 1: IBAN (Label „IBAN", value `formatIban(payment.iban)` = mit 4-Zeichen-Gruppen, Copy-Button).
   - Row 2: Betrag (Label „Betrag", value `formatBetragDe(payment.betrag_cents)` = „4.812,00 €", Copy-Button copies the same formatted string).
   - Row 3: Verwendungszweck (Label „Verwendungszweck", value `payment.verwendungszweck` verbatim, Copy-Button).
   - Order ist verbindlich: IBAN → Betrag → Verwendungszweck (mirror der EPC-QR-Field-Order).
   - Disabled-State (vor Phishing-Confirmation): siehe § 3.2.
6. **EPC-QR-Code** (`<EpcQrCode>`) — full-width, zentriert, sizePx=280 default; min 200 px für Scanner-Reliability; Card-Background subtle.
7. **DSGVO-Datenminimierung-Banner** *conditional* — nur bei Erst-Nutzung (`isFirstPaymentEver === true`); danach via localStorage-Flag `govtech-de:v1:payment:datenmini-banner-seen` ausgeblendet. Verbatim Wortlaut domain Locked-Wortlaut-Sektion (siehe § 10 i18n key `posteingang.payment.datenmini_banner`).

### 7.3 Cross-state behavior (Aussetzungs-Antrag)

Siehe § 2.2 + § 3.5. Pay-CTA in StickyFristAction wird `secondary`-Style (`variant="outline"`); Label ändert sich; Sub-Disclaimer rendert im Sheet-Header **direkt unter** Speculative-Banner und **direkt über** Phishing-Confirmation.

### 7.4 Disabled-States (Phishing-Confirmation-Pflicht)

- Vor Klick auf Phishing-Checkbox (nur wenn `auth_channel === 'briefpost'`):
  - `<PaymentCitationRow>`-Copy-Buttons: `aria-disabled="true"`, `tabIndex={-1}`, visuell `opacity-50 pointer-events-none`.
  - `<EpcQrCode>`: visuell mit `opacity-40` overlay; `aria-hidden="true"`; Klick auf den QR-Bereich macht nichts.
  - Citation-Match-Indicator (✓/⚠) bleibt **sichtbar** (Bürger:in soll wissen, was nach Confirmation geschieht).
- Nach Klick: Komponenten werden interaktiv, Activity-Log `payment_phishing_confirmed` wird einmalig geschrieben.

### 7.5 Close-Behavior

- ESC-Press → Sheet schließt; State `phishingConfirmed` wird **nicht** persistiert across re-opens (jedes Sheet-Open re-asks-confirmation pro § 9 Pflicht).
- `paymentInitiated` wenn bereits gefired bleibt im Activity-Log (irreversibel).
- Re-Open: alle States werden auf Initial-Werten neu initialisiert.

### 7.6 Accessibility (verbatim Pflichten)

- `aria-modal="true"`, `aria-labelledby="payment-sheet-title"`, focus-trap, ESC dismisses, focus returns to triggering Pay-CTA-Button on close.
- Phishing-Checkbox keyboard-reachable (Tab-Order: Close → Speculative-Banner-Text (passive) → Phishing-Summary (passive) → `<details>`-Toggle → Checkbox → Citation-Rows-Copy-Buttons → QR (focusable=false) → Footer).
- Toast-Region (für „IBAN kopiert"-Feedback): `aria-live="polite"` `role="status"`, gehosted vom Sheet-Parent in einer `sr-only`-Sibling-Region oder shadcn `<Toaster>` (V1.5-Konvention).
- `prefers-reduced-motion`: Sheet-Slide-Animation auf Fade reduzieren oder instant.
- AR-RTL: `<Sheet>` flippt zu `left`-Edge; Citation-Row-Werte (IBAN/Betrag/VZ) bleiben **LTR** (Latin-Schrift); EPC-QR ist sprach-agnostisch.

---

## 8. EPC-QR generation (client-side)

### 8.1 Library lock

**`qrcode` (npm)** Version `^1.5.x`, dynamic-imported on first PaymentSheet-render (avoids initial-bundle cost). Import-Pattern:

```ts
const QRCodeLib = await import('qrcode');
const svgString = await QRCodeLib.toString(payload, { type: 'svg', errorCorrectionLevel: 'M', margin: 2 });
```

### 8.2 EPC069-12 v3.1 Payload-Schema (verbatim — 12 Zeilen, LF-getrennt, UTF-8)

| Zeile | Feld | Wert (für Mehmet-FA Beispiel) | Constraint |
|---|---|---|---|
| 1 | Service Tag | `BCD` | konstant |
| 2 | Version | `002` | locked V2 |
| 3 | Character Set | `1` | UTF-8 |
| 4 | Identification | `SCT` | konstant |
| 5 | BIC | `COLSDE33XXX` | optional ab V002, hier immer befüllen |
| 6 | Empfänger-Name | `Finanzamt Köln-Mitte` | max 70 chars |
| 7 | IBAN | `DE09370501980001999811` | max 34, electronic format (no spaces) |
| 8 | Betrag | `EUR4812.00` | format `EUR{n}.{cc}`; max EUR 999999999.99 |
| 9 | Purpose-Code | `` (empty line) | optional, V2 leer |
| 10 | Remittance Reference | `` (empty line) | optional ISO 11649; V2 leer |
| 11 | Remittance Information | `22/345/12345 ESt 2024` | max 140 chars; verbatim aus `payment.verwendungszweck` |
| 12 | Beneficiary-to-Beneficiary | `` (empty line) | optional, V2 leer |

**Total payload size constraint**: ≤331 Bytes (UTF-8). EPC069-12 v3.1 Spec, S. 5–6.

### 8.3 Builder-Funktion (NEW `src/lib/mock-backend/epc-qr-payload.ts`)

```ts
export function buildEpcQrPayload(payment: LetterPayment): string;
```

Implementation:
```
const lines = [
  'BCD',
  '002',
  '1',
  'SCT',
  payment.bic ?? '',
  payment.empfaenger_name,                // max 70 chars; Spec §8.2 enforced via zod
  payment.iban,                            // electronic format
  `EUR${(payment.betrag_cents / 100).toFixed(2)}`,
  '',                                      // Purpose-Code
  '',                                      // Remittance Reference
  payment.verwendungszweck,                // max 140 chars
  '',                                      // Beneficiary-to-Beneficiary
];
const payload = lines.join('\n');
if (new TextEncoder().encode(payload).length > 331) throw new Error('EPC payload exceeds 331 bytes');
return payload;
```

> **Test** (mock-backend-coder): `tests/unit/epc-qr-payload.test.ts` enforced (a) jedes der 8 Pay-Briefe payload ≤ 331 Bytes; (b) Zeilen 1–4 sind verbatim `BCD/002/1/SCT`; (c) Zeile 8 hat exakt das Format `EUR\d+\.\d{2}`; (d) Zeile 7 matcht IBAN-Regex `/^[A-Z]{2}\d{2}[A-Z0-9]{16,30}$/` (electronic, no spaces).

### 8.4 SVG-Render

`<EpcQrCode>` ruft `QRCode.toString(payload, { type: 'svg', errorCorrectionLevel: 'M', margin: 2, width: sizePx })`, dann `dangerouslySetInnerHTML` ins Wrapper-Div. Performance: Builder + QR-Generation < 10 ms auf modernem Gerät; einmalige Berechnung pro Sheet-Open (memoized via `useMemo`).

### 8.5 Privacy-Hard-line (§ 11.13)

EPC-QR-Generation ist **client-only**. Keine Server-Roundtrip; kein external CDN-Fetch (außer `qrcode`-Lib, die im Bundle gepackt ist). DSGVO: keine Übermittlung der IBAN an Anthropic, keine Übermittlung an einen QR-Generierungs-Service.

---

## 9. StickyFristAction CTA-priority extension

### 9.1 V1.5-Status quo (Recap)

`<StickyFristAction>` rendert (siehe `src/components/posteingang/StickyFristAction.tsx`):
- FristChip (mit Frist-Label aus `selectEarliestFrist(letter)`-Tie-Break, V1.5-Mechanik)
- Optional „Frist im Kalender (.ics)"-Button (nur wenn `earliest && earliest.citation_match !== false`)
- Optional „Versendete Antwort anzeigen"-Button (nur wenn `hasSentReply && !hasDraft`)
- Primary „Antwort verfassen" / „Entwurf weiter schreiben" / „Erneut antworten"-Button
- Overflow-Kebab (3 Items: Speichern / Originaltext-PDF / als gelesen markieren)

### 9.2 V2-Erweiterung (verbatim)

- **Sichtbarkeit Pay-CTA**: nur wenn `showPayCTA(letter) === true` (siehe § 5.2). Sonst NICHT gerendert (kein grayed-out, AV9).
- **CTA-Priorität-Berechnung** basierend auf `const earliestUnfulfilled = selectEarliestUnfulfilledFrist(letter)`:

| Bedingung | Pay-CTA | Reply-CTA | Kalender | View-Sent |
|---|---|---|---|---|
| `earliestUnfulfilled?.typ === 'zahlung'` UND `letter.payment` UND **NICHT** `hasOpenAussetzungsAntrag` | **Primary** „Zahlung vorbereiten" | Secondary („Antwort verfassen"-Button mit `variant="outline"`) | Overflow-Kebab | Overflow-Kebab |
| `earliestUnfulfilled?.typ === 'zahlung'` UND `letter.payment` UND `hasOpenAussetzungsAntrag` | **Secondary** „Zahlung trotz Aussetzungs-Antrag vorbereiten" (`variant="outline"`) | Primary („Antwort verfassen") | Overflow | Overflow |
| `earliestUnfulfilled?.typ ∈ {einspruch, widerspruch, nachweis, antragstellung, frist_verlaengerung, sonstige}` UND `letter.payment` | Secondary („Zahlung vorbereiten", `variant="outline"`) | Primary | Sichtbar (V1.5-Status quo) | Sichtbar (V1.5-Status quo) |
| `letter.payment === undefined` (Brief ist nicht zahlungsbedürftig) | NICHT gerendert | Primary (V1.5-Status quo) | Sichtbar | Sichtbar |

### 9.3 Tie-Break-Regel für FristChip-Label (verbatim domain §10.A.c)

`selectEarliestFrist(letter)` (V1.5-Funktion, gibt FristChip-Label-Frist zurück) sortiert:

1. primär nach `datum` aufsteigend (älteste zuerst);
2. bei Gleichstand nach Typ-Priorität: `einspruch` > `widerspruch` > `zahlung` > `nachweis` > `antragstellung` > `frist_verlaengerung` > `informativ`/`sonstige`.

`selectEarliestUnfulfilledFrist(letter)` (V2-Funktion für CTA-Priorität) wendet **dieselbe** Sortier-Regel an, filtert aber zusätzlich auf `!frist.erledigt` (V1.5-Status-Field ist `frist.erledigt: boolean | undefined`; treat `undefined` as `false`, also nicht erledigt).

### 9.4 Aussetzungs-State Detection-Hook

Frontend-coder ruft `api.hasOpenAussetzungsAntrag(letter)` (synchron, da pure auf `letter.replies`) im RSC-Parent (`/posteingang/[id]/page.tsx`) und passt `<StickyFristAction>` per Prop `isAussetzungOpen` an.

> **NICHT** in V2-Scope: V1.5.1-Aussetzungs-Reply-Template-Implementation. V2 nimmt nur an, dass V1.5.1 **vor** V2 ausgeliefert wird (siehe ship_target frontmatter). Wenn V1.5.1 noch nicht shipped: `r.template === 'aussetzung_vollziehung_skelett'` ist nie true → `hasOpenAussetzungsAntrag` returns immer `false` → keine Aussetzungs-Cross-state-UI sichtbar. V2-Code ist forward-compatible.

---

## 10. i18n keys

> DE = Source-of-Truth (verbatim Wortlaute aus domain doc oder von product-architect formuliert). Übersetzung durch i18n-localizer in **DE, EN, RU, UK, AR, TR**. Schätzung neuer Keys: **~22 neue Keys** + Erweiterung `posteingang.frist.norm_tooltip.{archetype}` um 4–5 neue Archetype-Säumnis-Strings = ~28 keys × 6 locales = **~168 zu übersetzende Strings** + 5 DE-only Säumnis-§-Strings (Norm-Texte bleiben in DE über alle Locales — analog V1-Konvention).

> **Translation-Note für i18n-localizer**: für AR-RTL bleiben (a) IBAN-Werte LTR, (b) Aktenzeichen LTR, (c) §-Norm-Referenzen DE-only. Phishing-Disclaimer + Datenminimierung-Banner + Aussetzungs-Sub-Disclaimer + Speculative-Banner werden voll übersetzt. Pay-Button-Label „Zahlung vorbereiten" wird übersetzt; Pay-Sub-Label (`aria-describedby`) wird übersetzt.

### 10.1 Sticky-Action-CTAs (Erweiterung `posteingang.sticky_action.*`)

| Key | DE-Source-Wert |
|---|---|
| `posteingang.sticky_action.cta_pay` | „Zahlung vorbereiten" |
| `posteingang.sticky_action.cta_pay_describedby` | „SEPA-QR-Code mit IBAN, Betrag und Verwendungszweck zum Scannen mit Ihrer Bank-App anzeigen" |
| `posteingang.sticky_action.cta_pay_aussetzung` | „Zahlung trotz Aussetzungs-Antrag vorbereiten" |
| `posteingang.sticky_action.cta_pay_again` | „Zahlung erneut vorbereiten" *(wenn `payment_initiated`-Activity-Log bereits existiert; optional/nice-to-have V2.1)* |

### 10.2 PaymentSheet (`posteingang.payment.*` — neu)

| Key | DE-Source-Wert |
|---|---|
| `posteingang.payment.sheet_title` | „Zahlung vorbereiten" |
| `posteingang.payment.sheet_title_aussetzung` | „Zahlung trotz Aussetzungs-Antrag vorbereiten" |
| `posteingang.payment.sheet_close_label` | „Sheet schließen" |
| `posteingang.payment.speculative_banner` | „**[Speculative 2027]** Diese Pay-Rail simuliert eine spekulative 2027-Konvergenz von BundID-Postfach und FITKO-XBezahldienste-Standard (IT-Planungsrats-Beschluss 2023/51), die heute (Mai 2026) nicht beschlossen ist. Heute erfolgt der Zahl-Pfad pro Behörde separat über deren Online-Strecke." |
| `posteingang.payment.aussetzung_sub_disclaimer_template` | „Sie haben am {datum_aussetzung} Aussetzung der Vollziehung nach § 361 Abs. 2 AO beantragt. Eine Zahlung vor der Entscheidung der Finanzbehörde ist möglich, aber nicht erforderlich. Säumniszuschläge nach § 240 AO entstehen weiter, solange die Aussetzung nicht bewilligt ist." |
| `posteingang.payment.phishing.summary` | „Behörden-Bescheid in Papierform vor Ihnen — IBAN gegenprüfen" |
| `posteingang.payment.phishing.details_toggle` | „Mehr Informationen" |
| `posteingang.payment.phishing.details` | „Sie sehen diesen Brief als Mock einer Briefpost-Sendung. Bitte prüfen Sie den ausgedruckten Bescheid in Ihren Händen: stimmt die im QR-Code angezeigte IBAN mit der im Brief gedruckten überein? Behörden-Bescheide enthalten die Bankverbindung am Brief-Fuß. Bestätigen Sie die Übereinstimmung, bevor Sie überweisen. (Phishing-Risiko: § 263 StGB Betrug.)" |
| `posteingang.payment.phishing.checkbox_label` | „Ich habe die IBAN im Brief mit der hier angezeigten verglichen." |
| `posteingang.payment.row.iban_label` | „IBAN" |
| `posteingang.payment.row.betrag_label` | „Betrag" |
| `posteingang.payment.row.verwendungszweck_label` | „Verwendungszweck" |
| `posteingang.payment.row.copy_button_template` | „{label} in Zwischenablage kopieren" |
| `posteingang.payment.row.copied_toast_template` | „{label} in Zwischenablage kopiert" |
| `posteingang.payment.row.citation_match_label` | „Aus Brief übernommen" *(`aria-label` des ✓-Indikators)* |
| `posteingang.payment.row.handoff_label` | „Hand-off — bitte selbst übertragen" *(`aria-label` des ⚠-Indikators)* |
| `posteingang.payment.handoff` | „Wir konnten Bankverbindung oder Betrag nicht eindeutig aus dem Brief übernehmen. Bitte übertragen Sie IBAN, Verwendungszweck und Betrag selbst aus dem Original-Brief in Ihre Bank-App. (Mehr als eine IBAN gefunden — oder Betrags-Kontext mehrdeutig.)" |
| `posteingang.payment.qr.aria_label_template` | „EPC-QR-Code (SEPA-Überweisung) — Empfänger {empfaenger}, Betrag {betrag}, Verwendungszweck {vz}" |
| `posteingang.payment.qr.fallback_error` | „QR-Code konnte nicht generiert werden. Bitte aus dem Original-Brief abtippen." |
| `posteingang.payment.datenmini_banner` | „Hinweis zur Pay-Rail: Diese Demo extrahiert IBAN, Betrag und Verwendungszweck strukturiert aus dem Bescheid und stellt sie als SEPA-QR-Code (EPC-Standard) zur Anzeige in Ihrer Bank-App bereit. Es findet **keine** Verbindung zu Ihrer Bank statt; die Bezahlung selbst geschieht in Ihrer Bank-App und unter Ihrer Kontrolle. Rechtsgrundlage der App-internen Verarbeitung: Art. 6 Abs. 1 lit. b DSGVO (Vertragserfüllung) — die Aufbereitung empfangener Bescheid-Inhalte für eine Citizen-Aktion gehört zum vertraglich versprochenen Funktionsumfang dieser App. Jede Pay-Initiierung wird im Datenschutz-Cockpit unter dem jeweiligen Brief protokolliert." |

### 10.3 NormTooltip Säumnis-Strings (Erweiterung `posteingang.frist.norm_tooltip.{archetype}.saeumniszuschlag_info`)

| Key | DE-Source-Wert (Norm-Text bleibt DE über alle Locales) |
|---|---|
| `posteingang.frist.norm_tooltip.steuerbescheid.saeumniszuschlag_info` | *(V1, EXISTS — V1-Wortlaut; V2 darf unverändert bleiben oder verbatim auf domain §6 Steuerbescheid-Wortlaut harmonisieren — Empfehlung: domain-Wortlaut)* „Bei nicht fristgerechter Zahlung fällt nach § 240 Abs. 1 AO ein Säumniszuschlag von 1 % je angefangenem Monat auf den auf 50 € abgerundeten Rückstand an. Die ersten drei Tage gelten als Schonfrist." |
| `posteingang.frist.norm_tooltip.krankenkasse-beitrag.saeumniszuschlag_info` *(NEW V2)* | „Bei nicht fristgerechter Zahlung fällt nach § 24 Abs. 1 SGB IV ein Säumniszuschlag von 1 % je angefangenem Monat auf den auf 50 € abgerundeten Rückstand an." |
| `posteingang.frist.norm_tooltip.berufsgenossenschaft-beitrag.saeumniszuschlag_info` *(NEW V2)* | „Bei nicht fristgerechter Zahlung fällt nach § 24 Abs. 1 SGB IV ein Säumniszuschlag von 1 % je angefangenem Monat auf den auf 50 € abgerundeten Rückstand an." |
| `posteingang.frist.norm_tooltip.beitragsservice.saeumniszuschlag_info` *(NEW V2)* | „Bei nicht fristgerechter Zahlung kann nach § 9 RBStV i.V.m. der Satzung der zuständigen Landesrundfunkanstalt ein Säumniszuschlag erhoben werden. Der Bescheid ist ein vollstreckbarer Titel." |
| `posteingang.frist.norm_tooltip.beitragsservice-mahnung.saeumniszuschlag_info` *(NEW V2 — = beitragsservice-Wortlaut)* | „Bei nicht fristgerechter Zahlung kann nach § 9 RBStV i.V.m. der Satzung der zuständigen Landesrundfunkanstalt ein Säumniszuschlag erhoben werden. Der Bescheid ist ein vollstreckbarer Titel." |
| `posteingang.frist.norm_tooltip.ihk-beitrag.saeumniszuschlag_info` *(NEW V2)* | „Bei nicht fristgerechter Zahlung können Mahngebühren und Verzugszinsen nach § 288 BGB anfallen." |

> **i18n-localizer-Note**: Diese Säumnis-Strings sind **keinem** Reply-Template body_de zuzuordnen (V1.5-Hard-Line: Body-Templates enthalten ZERO §-Referenzen). Sie leben **ausschließlich** im NormTooltip am Frist-Chip — § 11.5.

### 10.4 NICHT geändert

- V1-Disclaimer-Strings (`posteingang.disclaimer.*`) bleiben verbatim.
- V1-Was-kann-ich-tun-Strings (`posteingang.was_kann_ich_tun.*`) bleiben verbatim. Steuerbescheid-Was-kann-ich-tun-Liste (V1) hat bereits einen `aussetzung`-Bullet (V1 § 8.4 Z.967, § 361 AO, informativ); kein Edit nötig.
- V1.5-Reply-Templates / Filter-Keys / Disclaimer-Restructure-Keys bleiben verbatim.

---

## 11. HARD-LINES (citation: which agent / which test enforces)

> **Diese Sektion ist non-negotiable.** Wortlaut + Scope kommen verbatim aus domain doc + verifier-review. Frontend-coder, mock-backend-coder, i18n-localizer, a11y-tester dürfen hier **nicht** umformulieren.

### 11.1 Keine reale Bank-API-Integration

**Quelle**: domain §10 #1; verifier scope-cut.
**Enforcement**: code-reviewer prüft, dass kein Code-Pfad einen `fetch`-Call gegen `*.dkb.de`, `*.sparkasse.de`, `psd2.*`, `xs2a.*` macht. PSD2-PISP-Flow blockiert.

### 11.2 Keine `sparkasse://`/`dkb://`/`n26://` Deeplink-Mock

**Quelle**: verifier § 6 scope-cut; domain §3 explicit.
**Enforcement**: code-reviewer + spec-grep `\b(sparkasse|dkb|n26|vrb)://`. Optionaler dekorativer „Banking-App öffnen"-Button (domain §3.3) ist **gecuttet** — V2 ships ohne diesen Button.

### 11.3 Keine Behörden-IBAN-Whitelist in V2

**Quelle**: verifier § 6 scope-cut; domain §8 #4.
**Enforcement**: keine `behoerdenIbanWhitelist`-Map, kein BLZ-Range-Check. Defer V2.1 (Phishing-Defense-Welle gemeinsam mit Idea 6).

### 11.4 Kein Cockpit-Toggle für Pay-Rail (lit. b nicht lit. a)

**Quelle**: domain §7 v2-Lock; verifier new-gap #5.
**Enforcement**: keine neue Toggle-UI im `/datenschutz`-Surface. Activity-Log-Einträge tragen `Art. 6 Abs. 1 lit. b DSGVO Vertragserfüllung`. Code-reviewer + grep-Test gegen `lit\.\s*a` in `payment_initiated`-context.

### 11.5 Säumnis-String NUR im NormTooltip

**Quelle**: verifier AV2; domain §6 Spec-Instruction.
**Enforcement**:
- i18n-Schlüssel `*.saeumniszuschlag_info` leben unter `posteingang.frist.norm_tooltip.{archetype}` — niemals unter `posteingang.payment.*`.
- code-reviewer grep-test: `saeumniszuschlag_info` darf nicht in `<PaymentSheet>` / `<PaymentCitationRow>` / `<PaymentSheetHeader>`-Komponenten verwendet werden.
- a11y-tester prüft visuell: NormTooltip-Inhalt erscheint **nicht** im PaymentSheet-DOM (axe-Snapshot diff).

### 11.6 Phishing-Confirmation als inline-checkbox (KEIN prior modal)

**Quelle**: verifier AV3; domain §9 Spec-Instruction.
**Enforcement**:
- Component `<PhishingConfirmationCheckbox>` ist **inline-Block** im `<PaymentSheetHeader>`, **nicht** ein `<AlertDialog>`/`<Dialog>`.
- code-reviewer prüft: kein `<Dialog>`/`<AlertDialog>` Top-Level-Wrapper wird vor PaymentSheet-Open getriggert.
- 4-Satz-Disclaimer ist `<details>`-collapsed (default-collapsed), nicht ein modal-blocker.
- Friction-Budget: max 2 Klicks (Sheet-Open → Checkbox), ≤ 3 Sekunden (Loom-cut prüft).

### 11.7 Citation-Match-Gate ist real string-search gegen body_de

**Quelle**: verifier AV6; domain §8 + §12.
**Enforcement**:
- `matchAllPaymentCitations(letter)` muss **`letter.body_de`** als Primärquelle verwenden — niemals einen `letter.bankverbindung`-Shortcut.
- Test `tests/unit/letter-payment-iban-citation.test.ts` enforced: für jeden der 8 Pay-Briefe matcht `bodyContainsIban(letter.body_de, letter.payment.iban) === true`.
- Wenn ein zukünftiger PR `body_de` ohne Bankverbindungs-Block ändert, bricht der Test.

### 11.8 Body_de seed-rewrite ist HARD precondition

**Quelle**: verifier AV6 + § 11.8; domain §12.A counter-example.
**Enforcement**:
- Mock-backend-coder commits Seed-Mutation **vor** frontend-coder den ersten PaymentSheet-Render committet.
- code-reviewer rejected jeden PR, der `<PaymentSheet>` einführt, ohne dass `tests/unit/letter-payment-iban.test.ts` und `tests/unit/letter-payment-iban-citation.test.ts` grün sind.
- CI-Gate: PaymentSheet-PR muss test:unit + test:citation green-light haben.

### 11.9 9 IBANs MÜSSEN `checksum_verified: true` haben

**Quelle**: verifier AV12; domain Locked Mock-IBAN-Tabelle.
**Enforcement**:
- Test `tests/unit/letter-payment-iban.test.ts`: für jeden IBAN aus `letters.json` `LetterPayment.iban` runs ISO-13616 mod-97-10 lokal. Test fails wenn ein IBAN-Wert ungültig.
- Spec-Wert-Tabelle § 6.2 ist Single Source of Truth, aber **der Test ist die letzte Wahrheit**. Bei Zahlendreher beim JSON-Übertragen → Test catches.

### 11.10 IBAN/Betrag/VZ Normalization rules verbatim

**Quelle**: verifier AV11; domain §12.
**Enforcement**:
- Implementation in `src/lib/mock-backend/citation-match.ts` muss verbatim die Regex + Normalization-Schritte aus domain §12 spiegeln.
- Test `tests/unit/citation-match.test.ts` ≥ 16 Cases: pro Regel (a/b/c) ≥ 5 positive + ≥ 3 negative + 2 Edge-Cases (Mehr-IBAN; Tausender-Trenner-Varianten).
- code-reviewer: keine Eigen-Heuristiken außer den 3 Regeln; pure Funktionen.

### 11.11 [MOCK]-Watermark im Brief-Top bleibt sichtbar

**Quelle**: V1 § 12 Hard-Line; AV-coverage-Erinnerung.
**Enforcement**: V1-Banner unverändert; Bankverbindungs-Footer-Block enthält **keinen** redundanten `[MOCK]`-Inline-Marker (würde die Citation-Match-Regex stören). DSGVO-Footer-Banner im PaymentSheet macht den Mock-Charakter explizit.

### 11.12 Activity-Log `payment_initiated`-Note OHNE IBAN

**Quelle**: domain §7 + § 11.D Datenminimierung.
**Enforcement**:
- Test `tests/unit/payment-activity-log.test.ts`: schreibt `payment_initiated`-Eintrag, liest Activity-Log, assertet `note` enthält **nicht** den IBAN-String und **nicht** den `empfaenger_name`-String.
- Format verbatim: `note: "channel:epc_qr; archetype:steuerbescheid; betrag_cents:481200"` (oder mit `clipboard`-channel).

### 11.13 EPC-QR rendered client-side, no external fetch

**Quelle**: domain §2 (Mock-Tauglichkeit) + Privacy-by-Design.
**Enforcement**:
- `<EpcQrCode>` ruft nur `qrcode`-Lib (im Bundle); kein `<img src="https://...">`.
- code-reviewer: grep `qrserver\.com|chart\.googleapis\.com|<img src="https?://` in `<EpcQrCode>`.
- Privacy: keine IBAN-Übermittlung an externe Hosts.

---

## 12. Test plan

### 12.1 Vitest (mock-backend-coder + frontend-coder)

#### `tests/unit/letter-payment-iban.test.ts` (NEW; mock-backend-coder owns)

- **Pre-condition test**: blockiert UI-Arbeit (§ 11.8).
- Für jeden der 8 Briefe in `letters.json` mit `letter.payment !== undefined`:
  - assert `letter.payment.iban` matcht Regex `/^[A-Z]{2}\d{2}[A-Z0-9]{16,30}$/` (electronic format, no spaces).
  - assert `letter.payment.iban` passes ISO-13616 mod-97-10 checksum (`computeIbanCheck(iban) === 1`).
  - assert `letter.payment.bic` (wenn gesetzt) matcht Regex `/^[A-Z]{4}DE[A-Z0-9]{2}([A-Z0-9]{3})?$/` (BIC-Format DE).
  - assert `letter.payment.empfaenger_name.length` ≤ 70 (EPC-QR Field 6 Constraint).
  - assert `letter.payment.verwendungszweck.length` ≤ 140 (EPC-QR Field 11).
  - assert `letter.payment.betrag_cents > 0 && betrag_cents <= 99999999999` (EPC-QR Field 8 EUR ≤ 999.999.999,99).

#### `tests/unit/letter-payment-iban-citation.test.ts` (NEW; mock-backend-coder owns)

- Für jeden der 8 Briefe: assert `bodyContainsIban(letter.body_de, letter.payment.iban) === true` (§ 11.7 enforcement).
- Für jeden der 8 Briefe: assert `bodyContainsBetrag(letter.body_de, letter.payment.betrag_cents) === true`.
- Für jeden der 8 Briefe: assert `bodyContainsAktenzeichen(letter.body_de, letter.aktenzeichen) === true`.

#### `tests/unit/citation-match.test.ts` (NEW; mock-backend-coder owns)

- ≥ 16 Cases, gruppiert per § 12-Regel:
  - **Regel (a) IBAN**: 5+ positive (verschiedene Formatierungen: mit Spaces, ohne Spaces, lower-case, mit `[MOCK] `-Prefix), 3+ negative (kein IBAN-String im body, zwei IBANs im body, IBAN-Length out-of-range).
  - **Regel (b) Betrag**: 5+ positive (Tausender-Punkt vs nicht, Cent-suffix vs nicht, EUR-prefix vs €-suffix), 3+ negative (Betrag im Body aber NICHT in Lemma-Satz; mehrere Betrag-Kandidaten ohne Lemma-Disambiguierung; englische Formatierung `1,247.00` → no match).
  - **Regel (c) VZ**: 5+ positive (Aktenzeichen mit/ohne MOCK-Prefix; mit/ohne Steuerart-Suffix; alphanumerisch + slashes), 3+ negative (Aktenzeichen-Format weicht vom Body ab; Trenner-Varianten).

#### `tests/unit/epc-qr-payload.test.ts` (NEW; mock-backend-coder owns)

- Für jeden der 8 Pay-Briefe:
  - assert `buildEpcQrPayload(letter.payment).length` ≤ 331 Bytes (UTF-8-Encoding).
  - assert `lines[0..3] === ['BCD', '002', '1', 'SCT']`.
  - assert `lines[7]` matcht Regex `/^EUR\d+\.\d{2}$/`.
  - assert `lines[6]` matcht IBAN-Regex (electronic format, no spaces).

#### `tests/unit/payment-cta-visibility.test.ts` (NEW; frontend-coder + mock-backend-coder co-own)

- Truth-Tabelle für `showPayCTA(letter)` predicate:
  - 8 Pay-Briefe → alle `true`.
  - V1.5-Briefe ohne `payment`-Property (10 weitere) → alle `false`.
  - Künstlicher Test-Letter: `payment` set + alle Fristen erledigt + Archetype nicht in Override-Liste → `false`.
  - Künstlicher Test-Letter: `payment` set + Archetype `beitragsservice` + keine Frist → `true` (Archetype-Override).

#### `tests/unit/payment-activity-log.test.ts` (NEW; mock-backend-coder owns)

- Schreibt `payment_initiated`-Entry via `recordPaymentInitiated('letter-mehmet-fa-steuerbescheid-2024', 'epc_qr')` → liest Log → assertet:
  - `event === 'payment_initiated'`.
  - `rechtsgrundlage === 'Art. 6 Abs. 1 lit. b DSGVO Vertragserfüllung'`.
  - `note` enthält **nicht** die IBAN-String `DE09370501980001999811`.
  - `note` enthält **nicht** den `empfaenger_name`-String `Finanzamt Köln-Mitte`.
  - `note` enthält `archetype:steuerbescheid; betrag_cents:481200; channel:epc_qr` (Reihenfolge frei, alle drei Tokens präsent).

### 12.2 Playwright e2e (frontend-coder owns)

#### `tests/e2e/pay-rail.spec.ts` (NEW)

- **Hero-Flow** (Mehmet, kein Aussetzungs-Antrag):
  1. Login als Mehmet → `/posteingang` → Klick auf `letter-mehmet-fa-steuerbescheid-2024`.
  2. Sticky-Band hat „Zahlung vorbereiten" als primary CTA (CSS-Snapshot: `data-variant="default"` statt `data-variant="outline"`).
  3. Klick → PaymentSheet öffnet (verify `[role=dialog][aria-modal=true]`, `aria-labelledby="payment-sheet-title"`).
  4. Speculative-Banner sichtbar mit verbatim-Text (assert text contains „die heute (Mai 2026) nicht beschlossen ist").
  5. Phishing-Checkbox sichtbar; Citation-Rows sind disabled (verify `aria-disabled="true"`).
  6. Klick auf Phishing-Checkbox → Citation-Rows + QR werden aktiv.
  7. Alle 3 Rows zeigen ✓-Indicator (verify `aria-label` contains „Aus Brief übernommen").
  8. EPC-QR ist gerendert als `<svg>` (verify `[role=img][aria-label*="EPC-QR"]` in DOM).
  9. Klick „IBAN kopieren" → Toast „IBAN in Zwischenablage kopiert" (verify `[role=status][aria-live=polite]`).
  10. Activity-Log: `/datenschutz?letter=letter-mehmet-fa-steuerbescheid-2024` zeigt zwei neue Einträge (`payment_phishing_confirmed` + `payment_initiated`); beide mit Rechtsgrundlage „Art. 6 Abs. 1 lit. b DSGVO Vertragserfüllung".

- **Aussetzungs-Cross-state-Flow**:
  1. Login als Mehmet → **erst** V1.5.1-Aussetzungs-Antrag-Reply für Steuerbescheid 2024 senden (oder im Setup-Step localStorage manipulieren, V1.5.1-`reply.template === 'aussetzung_vollziehung_skelett'` mit `status: 'sent_simulated'`).
  2. Zurück zu `/posteingang/letter-mehmet-fa-steuerbescheid-2024`.
  3. Sticky-Band-Pay-CTA ist **secondary**-Style (verify `data-variant="outline"`); Label ist „Zahlung trotz Aussetzungs-Antrag vorbereiten".
  4. Klick → PaymentSheet öffnet → Sheet-Header zeigt Aussetzungs-Sub-Disclaimer mit `{datum_aussetzung}`-Token aufgelöst.

- **Citation-Match-Fail-Flow** (synthetic):
  1. Setup-Step: temporär `letter.body_de` mutieren auf einen Body, der zwei IBANs enthält → `bodyContainsIban` returns false (Mehr-IBAN-Detection).
  2. Open PaymentSheet → IBAN-Row zeigt Hand-off-Wortlaut statt Wert; EPC-QR ist NICHT gerendert.
  3. Reset.

#### `tests/e2e/pay-rail-non-pay-letter.spec.ts` (NEW)

- Brief ohne `payment` (z. B. `letter-schmidt-familienkasse-nachweis`): Sticky-Band rendert **keinen** Pay-CTA (verify `getByText('Zahlung vorbereiten').count() === 0`).

### 12.3 a11y (a11y-tester owns)

#### `tests/a11y/payment-sheet.spec.ts` (NEW)

- axe-clean (0 critical / 0 serious) auf folgenden States:
  - Sheet closed (Sticky-Band sichtbar): kein neuer a11y-Issue ggü. V1.5.
  - Sheet open, Phishing-Checkbox unchecked: focus-trap aktiv; QR `aria-hidden="true"`; Copy-Buttons `aria-disabled="true"`.
  - Sheet open, Phishing-Checkbox checked: alle Citation-Rows + QR + Copy-Buttons im Tab-Order; Citation-Match-Indicators als `aria-label`-decorierte SVGs.
  - Aussetzungs-State Sheet open: Sub-Disclaimer ist im Heading-Hierarchie sauber (h2 → h3-Kette nicht broken).
- Keyboard-only nav: Tab-Sequence reaches Close-Button → Speculative-Banner-Text (passive, aria-label "Speculative Frame Hinweis") → Phishing-Summary (passive) → details-Toggle → Checkbox → Row1-Copy → Row2-Copy → Row3-Copy → Footer-Banner.
- Lighthouse a11y ≥ 95 auf `/posteingang/letter-mehmet-fa-steuerbescheid-2024` (Sheet closed).
- Color-Contrast: ✓-Indicator-Text, ⚠-Indicator-Text, Pay-Button-primary, Pay-Button-secondary alle ≥ 4.5:1 in default + dark + AR-RTL.
- `prefers-reduced-motion`: Sheet-Slide-Animation reduziert auf Fade.

### 12.4 Vitest-Regression-Schutz

- V1.5-Tests (126/126) bleiben unverändert green; PaymentSheet-Implementation darf keinen V1.5-Test brechen. CI prüft.
- V1-Tests bleiben green.

---

## 13. Out-of-scope (defer)

> **Explizite Out-of-Scope-Liste — V2 ships ohne diese**. Defer-Targets sind annotiert.

1. **Bank-App-Deeplink-Mock** (`sparkasse://`, `dkb://`, `n26://`, dekorativer „Banking-App öffnen"-Button) → **gecuttet** (verifier § 6 scope-cut). Argument bei recruiter: „öffentliches Schema existiert nicht, EPC-QR ist EU-Standard und in jeder DACH-Bank-App scanbar".
2. **Behörden-IBAN-Whitelist + 3-stufiges Authentizitäts-Badge** → **V2.1 (Phishing-Defense-Welle, gemeinsam mit Idea 6 Authentizitäts-Proof)**.
3. **PSD2-PISP-Flow / Payment Initiation Service Provider** → **V3+** (BaFin-Lizenz, TPP-Vertrag — strukturell out für Demo).
4. **SEPA-Lastschrift-Mandat-Erteilung** (`Beitragsservice-Lastschrift einrichten` als App-Flow) → **V3+** (tracks 2030+ Migration per research-scout AV8 caveat).
5. **Ratenzahlungs-Antrag** (§ 222 AO Stundung beim FA, § 18 OWiG Ratenzahlung Bußgeld) → **V3+** (separater Skelett-Template-Spec).
6. **Erstattungs-Antrag-Flow** (FA hat zu viel verrechnet) → **V3+** (gehört in Vorgänge-Surface, nicht Posteingang).
7. **Auto-Pay** (App zieht selbst nach einmaliger Genehmigung) → **V3+**. V2 ist immer explizit-Bürger:innen-Aktion.
8. **Push-Reminder zu Zahlfristen** → V2.x als Teil von Idea 4 (Frist-Risiko-Cockpit), nicht Pay-Rail.
9. **Bezahl-Quittung von der Behörde** (Empfangs-Bestätigung) → **strukturell out** (App sieht keine Bank-Antwort; Behörden-Buchungs-Bestätigung dauert Tage). Stattdessen: Activity-Log-Eintrag „Zahlung in Bank-App initiiert (Mock)".
10. **OWi-Bußgeldbescheid 9. Pay-Brief** → V2.x optional (Mock-Letter-Add). V2 ships mit 8 Briefen.
11. **AI-Summary-Citation-Match-Indicator für Pay-Bullet** → V2.x optional. V2 lebt nur im PaymentSheet.
12. **Multi-Empfänger-Split** (FA mit ESt + KiSt getrennt überweisen) → **out** (Real-Welt: eine Summe an FA-Konto; FA verteilt intern).
13. **Foreign Currency / Non-EUR-Bescheide** → **out** (alle DE-Behörden-Bescheide sind EUR).
14. **„Zahlung erneut vorbereiten"-Label** wenn `payment_initiated` bereits geloggt → V2.1 nice-to-have. V2 zeigt immer „Zahlung vorbereiten" (Aussetzungs-Variant ausgenommen).

---

## 14. Acceptance criteria (gate before "shipped")

### 14.1 Code-Qualität

- [ ] `npm run typecheck` green (0 errors); strict TypeScript.
- [ ] `npm run lint` green (0 warnings).
- [ ] `npm run test:unit` green (alle V1+V1.5+V2 vitest cases pass).
- [ ] `tests/unit/letter-payment-iban.test.ts` green (8 IBANs alle mod-97-10 valide; § 11.9).
- [ ] `tests/unit/letter-payment-iban-citation.test.ts` green (8 Briefe alle 3 Citations matchen; § 11.7).
- [ ] `tests/unit/citation-match.test.ts` green (≥ 16 Cases per § 12 Regeln; § 11.10).
- [ ] `tests/unit/epc-qr-payload.test.ts` green (8 payloads ≤ 331 Bytes; EPC-Format korrekt).
- [ ] `tests/unit/payment-cta-visibility.test.ts` green (Truth-Tabelle § 6 + Archetype-Override).
- [ ] `tests/unit/payment-activity-log.test.ts` green (note enthält keine IBAN; § 11.12).

### 14.2 e2e + a11y

- [ ] `tests/e2e/pay-rail.spec.ts` green (Hero-Flow + Aussetzungs-Cross-state + Citation-Fail-Flow).
- [ ] `tests/e2e/pay-rail-non-pay-letter.spec.ts` green.
- [ ] `tests/a11y/payment-sheet.spec.ts` axe-clean (0 critical / 0 serious) auf 4 States (closed, open-unchecked, open-checked, aussetzungs-state).
- [ ] Lighthouse a11y ≥ 95 auf `/posteingang/letter-mehmet-fa-steuerbescheid-2024` (gemessen mit Pay-CTA visible).
- [ ] V1.5-Lighthouse-Niveau (100/100 auf `/posteingang` und `/posteingang/[id]`) bleibt erhalten — keine Regression.

### 14.3 i18n

- [ ] Alle 22 neuen `posteingang.payment.*`-Keys + 5 neuen `posteingang.frist.norm_tooltip.*`-Keys + 4 neuen `posteingang.sticky_action.*`-Keys sind in `de.json` (Source-of-Truth) verbatim aus § 10.
- [ ] Alle 5 weiteren Locales (EN/RU/UK/AR/TR) haben vollständige Übersetzungen für alle Sheet-Wortlaute.
- [ ] AR-RTL: Sheet flippt zu links; IBAN/Aktenzeichen/§-Norm bleiben LTR/DE.
- [ ] Säumnis-§-Strings bleiben DE über alle Locales (V1-Konvention, AV5-Coverage).

### 14.4 Manual review (Loom-Demo)

- [ ] Loom-Cut-Script § 1.3 funktioniert in <30 Sekunden auf einem mittelschnellen Laptop.
- [ ] EPC-QR ist scannable von Sparkasse-Test-App (manuelle Verifikation gegen die offizielle EPC-Sample-Encoding-Spec).
- [ ] Bei jedem der 8 Briefe: Pay-Flow rendert korrekt — alle 3 Citations grün ✓, EPC-QR generiert, Activity-Log-Eintrag korrekt geschrieben.

### 14.5 Cross-agent review

- [ ] code-reviewer: APPROVE (verifier hard-revisions adressiert; spec-Lint-Checks alle grün).
- [ ] a11y-tester: PASS (axe-clean + keyboard-only).
- [ ] i18n-localizer: alle 6 Locales komplett ohne Lücken.

### 14.6 Documentation

- [ ] `CLAUDE.md` status-section: `[x] Posteingang V2 — Zahlungs-Rail (shipped YYYY-MM-DD: a11y PASS, code review APPROVE, vitest N/N, Lighthouse a11y X/100)`.
- [ ] `docs/architecture.md`: `LetterPayment`-Sub-Type + 2 neue Activity-Log-Enums + `citation-match.ts`-Modul-Erwähnung im Datenmodell-Abschnitt.
- [ ] Spec-Status-Frontmatter wechselt von `spec` auf `shipped` nach allen Acceptance-Criteria green; ship-artifacts-Block ergänzt.

---

## 15. Cross-feature dependencies + sequencing

### 15.1 Pre-conditions

- **V1.5 ist shipped**: `<StickyFristAction>`, `<NormTooltip>`, `<FristChip>`, V1.5-`Reply`-Schema → erfüllt (status `shipped 2026-05-09`).
- **V1.5.1 sollte vor V2 shippen**: Aussetzungs-Antrag-Skelett-Template aus `docs/domain/posteingang-v1.5.1-rechtsbehelf-aussetzung.md` etabliert das `r.template === 'aussetzung_vollziehung_skelett'`-Vorhandensein. Wenn V1.5.1 noch offen: V2-`hasOpenAussetzungsAntrag` returns konstant `false`, Aussetzungs-Cross-state-UI ist nicht testbar im e2e-Flow, aber V2-Code ist forward-compatible.
- **Seed-Mutation grün**: § 11.8 Hard-Gate.

### 15.2 Parallel-Executable-Coding-Waves (post-spec sign-off)

Nach diesem Spec können drei Coding-Waves **parallel** starten:

1. **Wave A — mock-backend-coder** (~2 Tage): Seed-Mutation (§ 6) + `LetterPayment`-Type (§ 4) + `citation-match.ts` (§ 5.1) + neue api-Methods (§ 5.2) + zod-Schema-Sync (§ 5.3) + alle 5 Vitest-Test-Suites (§ 12.1).
2. **Wave B — frontend-coder** (~3 Tage): `<PaymentSheet>` + `<PaymentCitationRow>` + `<EpcQrCode>` + `<PhishingConfirmationCheckbox>` (§ 3.1–3.4) + `<StickyFristAction>`-Erweiterung (§ 3.5, § 9) + Playwright-e2e (§ 12.2). **Blockiert nur auf Wave A's grünen letter-payment-iban.test.ts** (§ 11.8).
3. **Wave C — i18n-localizer** (~1 Tag): alle 22+5+4 Keys aus § 10 in DE/EN/RU/UK/AR/TR. Kann parallel zu A+B laufen, weil Source-of-Truth-DE-Wortlaute hier verbatim gelistet sind. Coordination-Hand-off zu frontend-coder via PR-Review (i18n-keys ergänzt → frontend-coder importiert).

### 15.3 Final-Gate (a11y-tester + code-reviewer)

Nach Wave A + B + C green: a11y-tester + code-reviewer parallel. Beide müssen approven für `status: shipped`.

---

## 16. Review checklist (für code-reviewer + a11y-tester)

> Verbatim aus § 11 + § 14 zusammengeführt; code-reviewer prüft jede Box.

### Spec-Compliance

- [ ] § 11.1 Keine reale Bank-API: 0 fetch-Calls gegen Bank-Hosts.
- [ ] § 11.2 Keine `*://`-Deeplinks: grep-clean.
- [ ] § 11.3 Keine Behörden-IBAN-Whitelist: keine `behoerdenIbanWhitelist`-Map.
- [ ] § 11.4 Lit. b nicht lit. a: Activity-Log-Rechtsgrundlage `Art. 6 Abs. 1 lit. b DSGVO Vertragserfüllung`.
- [ ] § 11.5 Säumnis-String nur in NormTooltip: grep-clean in `<PaymentSheet>`-Tree.
- [ ] § 11.6 Phishing inline-checkbox: kein prior `<Dialog>`/`<AlertDialog>`-Trigger.
- [ ] § 11.7 Citation-Match real string-search auf body_de: kein `letter.bankverbindung`-Shortcut.
- [ ] § 11.8 Seed-Mutation precondition: tests/unit/letter-payment-iban.test.ts grün VOR PaymentSheet-PR.
- [ ] § 11.9 8 IBANs mod-97-10 valide.
- [ ] § 11.10 Normalisierung verbatim aus domain §12.
- [ ] § 11.11 [MOCK]-Watermark Brief-Top sichtbar.
- [ ] § 11.12 `payment_initiated`-Note ohne IBAN.
- [ ] § 11.13 EPC-QR client-side, no external fetch.

### Wortlaut-Verbatim-Compliance

- [ ] Speculative-Banner-Wortlaut matcht § 1.2 verbatim (`die heute (Mai 2026) nicht beschlossen ist`).
- [ ] Aussetzungs-Sub-Disclaimer-Wortlaut matcht § 2.2 / § 10.2 verbatim (`§ 361 Abs. 2 AO`, nicht `§ 361 AO`).
- [ ] Phishing-Confirmation-Wortlaut matcht § 10.2 verbatim (4-Sätze; `(Phishing-Risiko: § 263 StGB Betrug.)` als finaler Klammer).
- [ ] DSGVO-Datenminimierung-Wortlaut matcht § 10.2 verbatim (`Art. 6 Abs. 1 lit. b DSGVO (Vertragserfüllung)`).
- [ ] Hand-off-Wortlaut matcht § 10.2 verbatim.
- [ ] Pay-CTA-Label „Zahlung vorbereiten" (NICHT „Bezahlen", NICHT „Jetzt bezahlen"); Aussetzungs-Variant „Zahlung trotz Aussetzungs-Antrag vorbereiten".
- [ ] Säumnis-§-Strings § 10.3 stimmen mit domain §6 verbatim überein.

### Funktionale Vollständigkeit

- [ ] `<PaymentSheet>` hostet alle 6 Sektionen (Header / Speculative / [Aussetzungs] / Phishing / Body / Footer).
- [ ] CTA-Priority-Tabelle § 9.2 implementiert (4 Bedingungs-Pfade).
- [ ] `<EpcQrCode>` rendert SVG inline; `qrcode`-Lib dynamic-imported.
- [ ] EPC-Payload § 8.2 verbatim (12 Zeilen, Order, leere Zeilen für 9/10/12).
- [ ] Activity-Log-Enum erweitert um 2 Werte; zod-Schema synchron; `_AssertEq`-Drift-Guard greift.
- [ ] `LetterPayment` zod-Schema validiert alle Constraints (max 70 chars empfaenger, max 140 chars VZ, betrag_cents range).
- [ ] AR-RTL flippt Sheet zu links; IBAN/Aktenzeichen LTR.
- [ ] `prefers-reduced-motion`: Slide-Animation reduziert.

### a11y-tester-Pflichten

- [ ] axe-clean auf 4 PaymentSheet-States (§ 12.3).
- [ ] Keyboard-only nav reaches alle interaktiven Elemente in stabiler Tab-Order.
- [ ] Color-Contrast aller neuen Elemente ≥ 4.5:1.
- [ ] Lighthouse a11y ≥ 95 auf `/posteingang/letter-mehmet-fa-steuerbescheid-2024`.
- [ ] V1.5-Lighthouse-Niveau erhalten (`/posteingang`, `/posteingang/[id]` ohne Pay-CTA).

---

## 17. Sources verifiziert

- domain `docs/domain/posteingang-v2-zahlungs-rail.md` v2 (PROCEED-after-revision-2)
- verifier `docs/reviews/2026-05-09-posteingang-v2-zahlungs-rail-verify.md` (REVISE → addressed in domain v2)
- research `docs/research/2026-05-09-posteingang-gap-analysis.md` (Idea 1, revised)
- prior specs `docs/specs/posteingang.md` (V1, shipped) + `docs/specs/posteingang-v1.5.md` (V1.5, shipped)
- cross-feature `docs/domain/posteingang-v1.5.1-rechtsbehelf-aussetzung.md` (Aussetzungs-Skelett)
- type baseline `src/types/letter.ts` (V1.5-Stand)
- component baseline `src/components/posteingang/StickyFristAction.tsx` (V1.5-Stand)

EPC069-12 v3.1 / FITKO XBezahldienste / IT-Planungsrat 2023/51 / EPC-QR-Code Wikipedia / § 240 AO / § 357 AO / § 361 AO / § 84 SGG / § 86a SGG / § 18 OWiG / § 9 RBStV / § 24 SGB IV / § 2 RDG — verbatim Quellen-Liste in domain doc § Sources verifiziert.
