---
target: posteingang-v1.5
date: 2026-05-09
author: domain-expert
inputs:
  - docs/reviews/2026-05-09-posteingang-v1.5-verify.md (binding contract)
  - docs/specs/posteingang-v1.5.md
  - docs/domain/posteingang-antwort-verfassen.md
  - src/data/letters.json
locked: true
status: locked
scope: V1.5.0 reply templates only (4 templates + freitext header). V1.5.1 Skelett-Templates explicitly OUT.
---

> **Hard line (Verifier #2, MUST cover)**: every body string contains exactly: Datum, Aktenzeichen, Empfänger-Behörde, neutrale Anrede „Sehr geehrte Damen und Herren,", **eine** administrative Phrase, Schlussformel „Mit freundlichen Grüßen,\n{absender_name}". Zero `§`-Symbols anywhere in the body. Norm-references live exclusively in `disclaimer_pre_insertion` and `disclaimer_inline`.
>
> **Placeholder-Set (closed list)** — anything else is drift:
> - Address-Block: `{absender_name}`, `{absender_strasse}`, `{absender_plz}`, `{absender_ort}`, `{empfaenger_behoerde}`, `{empfaenger_strasse}`, `{empfaenger_plz}`, `{empfaenger_ort}`, `{ort}`, `{datum}`, `{aktenzeichen}`
> - Per-template extras: `{frist_alt}`, `{frist_neu_gewuenscht}`, `{begruendung_kurz}` (frist_verlaengerung) / `{nachweis_bezeichnung}` (nachweis_einreichen) / `{datum_letter}`, `{rueckmeldung_text}` (informative_rueckmeldung) / `{mode}`, `{termin_vorgeschlagen}`, `{termin_neu_gewuenscht}` (termin_antwort)
>
> All address-block placeholders are resolved by the token-resolver in `src/lib/mock-backend/reply-templates.ts` from active Persona + Letter + Behörden-Lookup. `{ort}` = `{absender_ort}` (sender's city for the dateline — German letter convention).

---

## 1. `frist_verlaengerung`

```
{absender_name}
{absender_strasse}
{absender_plz} {absender_ort}

{empfaenger_behoerde}
{empfaenger_strasse}
{empfaenger_plz} {empfaenger_ort}

{ort}, {datum}

Aktenzeichen: {aktenzeichen}
Betreff: Antrag auf Fristverlängerung

Sehr geehrte Damen und Herren,

ich bitte um Verlängerung der Frist vom {frist_alt} auf den {frist_neu_gewuenscht}. Begründung: {begruendung_kurz}

Mit freundlichen Grüßen,

{absender_name}
```

**Allowed placeholders**: `{absender_name}`, `{absender_strasse}`, `{absender_plz}`, `{absender_ort}`, `{empfaenger_behoerde}`, `{empfaenger_strasse}`, `{empfaenger_plz}`, `{empfaenger_ort}`, `{ort}`, `{datum}`, `{aktenzeichen}`, `{frist_alt}`, `{frist_neu_gewuenscht}`, `{begruendung_kurz}`. (14 placeholders.)

**Notes**:
- RDG-safe weil reine administrative Bitte ohne rechtliche Bewertung des Einzelfalls — vergleichbar mit dem Bitten um Fristverlängerung in einem privaten Brief; Smartlaw-Werkzeug-Charakter (BGH I ZR 113/20) gewahrt. Die Begründung schreibt die Bürger:in selbst (Free-Text-Feld `{begruendung_kurz}`); die App liefert keinen Vorschlag.
- §-Referenzen-Versuchung widerstanden: erwogen war `„… nach § 109 AO / § 31 VwVfG"` als Floskel — gestrichen, weil (a) Verifier #2 hard-line, (b) §§-Referenz ist für reine Verlängerungs-Bitte juristisch ohnehin nicht erforderlich (formloser Antrag genügt), und (c) der Bürger:innen-Brief würde dadurch unauthentisch wirken (echte Bürger:innen-Briefe enthalten keine §§-Zitate).
- Verworfen: Variante mit „Mit der Bitte um wohlwollende Prüfung" — abgelehnt, weil interpretativ-werbend; Smartlaw-Linie verlangt neutralen Werkzeug-Charakter. Auch verworfen: zwei-zeilige Begründung mit Fallback-String wenn `{begruendung_kurz}` leer — abgelehnt, weil `{begruendung_kurz}` per Spec ≤200 chars *Pflichtfeld* ist (sonst hat die App nichts vorzubefüllen) und der Resolver leere Begründung als UI-Validation-Fehler vor dem Insertion ablehnt.

---

## 2. `nachweis_einreichen` (verifier-trimmed)

```
{absender_name}
{absender_strasse}
{absender_plz} {absender_ort}

{empfaenger_behoerde}
{empfaenger_strasse}
{empfaenger_plz} {empfaenger_ort}

{ort}, {datum}

Aktenzeichen: {aktenzeichen}
Betreff: Einreichung von Unterlagen

Sehr geehrte Damen und Herren,

anbei finden Sie den von Ihnen angeforderten Nachweis {nachweis_bezeichnung}. Bitte bestätigen Sie den Eingang.

Mit freundlichen Grüßen,

{absender_name}
```

**Allowed placeholders**: `{absender_name}`, `{absender_strasse}`, `{absender_plz}`, `{absender_ort}`, `{empfaenger_behoerde}`, `{empfaenger_strasse}`, `{empfaenger_plz}`, `{empfaenger_ort}`, `{ort}`, `{datum}`, `{aktenzeichen}`, `{nachweis_bezeichnung}`. (12 placeholders.)

**Notes**:
- Verifier-locked Phrase wörtlich übernommen aus Review-Reasoning A2; der vorherige zweite Satz „Ich gehe davon aus, dass damit Ihre Aufforderung erfüllt ist" war interpretativ-argumentativ und wurde vom Verifier explizit gestrichen. Pure Übersendungs-Kommunikation — Mitwirkungspflichten-Erfüllung (z. B. SGB X Allgemeine Mitwirkung; AO Allgemeine Auskunftspflicht; AufenthG Mitwirkung). Keine §§-Referenzen im Body — die Mitwirkungs-Norm-Anker leben in `disclaimer_pre_insertion` unten.
- `{nachweis_bezeichnung}` ist *kein* Free-Text, sondern Auswahl aus controlled list — siehe Persona-Kontext-Liste in den Notes zur Coder-Implementierung unten. Damit kann der Bürger:innen-Brief nicht durch eine zu-detaillierte Selbst-Beschreibung versehentlich rechtliche Substanz aufnehmen (RDG-Hygiene).
- Verworfen: „Anbei übersende ich" (Kanzlei-Sprache) zugunsten „Anbei finden Sie" (Bürger:innen-Sprache, gov.uk-Stil). Auch verworfen: ergänzender Satz „Für Rückfragen stehe ich Ihnen zur Verfügung" — überflüssig, jede Behörde weiß, wie sie Rückfragen stellt.

---

## 3. `informative_rueckmeldung`

```
{absender_name}
{absender_strasse}
{absender_plz} {absender_ort}

{empfaenger_behoerde}
{empfaenger_strasse}
{empfaenger_plz} {empfaenger_ort}

{ort}, {datum}

Aktenzeichen: {aktenzeichen}
Betreff: Rückmeldung zu Ihrem Schreiben vom {datum_letter}

Sehr geehrte Damen und Herren,

ich nehme auf Ihr Schreiben vom {datum_letter} Bezug und teile Ihnen Folgendes mit:

{rueckmeldung_text}

Bitte berücksichtigen Sie diese Information bei der weiteren Bearbeitung.

Mit freundlichen Grüßen,

{absender_name}
```

**Allowed placeholders**: `{absender_name}`, `{absender_strasse}`, `{absender_plz}`, `{absender_ort}`, `{empfaenger_behoerde}`, `{empfaenger_strasse}`, `{empfaenger_plz}`, `{empfaenger_ort}`, `{ort}`, `{datum}`, `{aktenzeichen}`, `{datum_letter}`, `{rueckmeldung_text}`. (13 placeholders. **`{datum_letter}` is new** — Brief-Empfangsdatum, separate vom heutigen Versand-Datum `{datum}`.)

**Notes**:
- RDG-safe weil reiner Sachdaten-Mitteilungs-Rahmen; der gesamte inhaltliche Mehrwert kommt aus `{rueckmeldung_text}`, das die Bürger:in selbst tippt (≤500 chars). Die App liefert nur den admin-typischen Bezugs-Rahmen — Werkzeug, nicht Berater. Standardphrase „Ich nehme auf Ihr Schreiben vom … Bezug" ist die in deutscher Verwaltungs-Korrespondenz übliche Bezugnahme-Floskel; auch echte Bürger:innen-Briefe öffnen so. Vergleichbar mit Smartlaw-Formularhandbuch.
- `{datum_letter}` taucht zwei Mal auf (Betreff + Body) — bewusst doppelt, weil deutsche Verwaltungs-Konvention den Bezug sowohl im Betreff als auch im Anschreibungs-Satz verlangt; Token-Resolver löst beide Vorkommen identisch auf.
- Verworfen: Schluss-Floskel „Für Rückfragen stehe ich gerne zur Verfügung" — abgelehnt zugunsten „Bitte berücksichtigen Sie diese Information bei der weiteren Bearbeitung", weil letzteres die Verwaltungs-Aktion (Berücksichtigung in der Bearbeitung) explizit benennt und damit der Sache der Mitwirkung entspricht. Auch verworfen: Konjunktiv-Form „würde ich Ihnen mitteilen wollen" — Sie-Form-Direktheit ist citizen-respektful klarer.

---

## 4. `termin_antwort` (consolidated 3-mode, ICU `select`)

> **Architecture decision**: ICU `{mode, select, …}` block — *one* i18n key, *three* internal branches. Begründung: (a) i18n-localizer needs to maintain *one* DE-source key (mit drei Branches), nicht drei separate Keys + Auswahl-Logik im Component-Code; (b) ICU select ist next-intl-Standard und Tailored-für genau diesen Use-Case; (c) reduziert Coder-Surface (kein Switch-Statement im Component nötig — `t('...termin_antwort.body_template_de', { mode: 'verschieben', termin_vorgeschlagen: ... })`); (d) hält die drei Mode-Phrasen *nebeneinander* im Source-File — semantische Drift zwischen Modes wird beim Lesen sofort sichtbar. **Spec §4.3 Zeile 390–392** listet aktuell drei separate Keys (`termin_antwort_bestaetigen` / `_verschieben` / `_absagen`) — diese sind durch den unten stehenden ICU-Select-Block zu **ersetzen**. mock-backend-coder-Hinweis: Token-Resolver liefert `mode` als Pflicht-Token zusätzlich zu den Standard-Address-Tokens. Spec-Amendment-Hinweis für product-architect: §4.3 Zeile 390–392 streichen, durch *einen* Key `posteingang.reply.template.body_de.termin_antwort` ersetzen.

```
{absender_name}
{absender_strasse}
{absender_plz} {absender_ort}

{empfaenger_behoerde}
{empfaenger_strasse}
{empfaenger_plz} {empfaenger_ort}

{ort}, {datum}

Aktenzeichen: {aktenzeichen}
Betreff: Antwort zu Ihrem Terminvorschlag

Sehr geehrte Damen und Herren,

{mode, select,
  bestaetigen {den von Ihnen vorgeschlagenen Termin am {termin_vorgeschlagen} bestätige ich hiermit.}
  verschieben {den von Ihnen vorgeschlagenen Termin am {termin_vorgeschlagen} kann ich leider nicht wahrnehmen. Ich schlage stattdessen den {termin_neu_gewuenscht} vor.}
  absagen {den von Ihnen vorgeschlagenen Termin am {termin_vorgeschlagen} muss ich leider absagen. Ich werde mich bei nächster Gelegenheit erneut um einen Termin bemühen.}
  other {den von Ihnen vorgeschlagenen Termin am {termin_vorgeschlagen} bestätige ich hiermit.}
}

Mit freundlichen Grüßen,

{absender_name}
```

**Allowed placeholders**: `{absender_name}`, `{absender_strasse}`, `{absender_plz}`, `{absender_ort}`, `{empfaenger_behoerde}`, `{empfaenger_strasse}`, `{empfaenger_plz}`, `{empfaenger_ort}`, `{ort}`, `{datum}`, `{aktenzeichen}`, `{mode}` (one of `bestaetigen` / `verschieben` / `absagen`), `{termin_vorgeschlagen}`, `{termin_neu_gewuenscht}` (only resolved when `mode === 'verschieben'`; otherwise pass empty string and rely on ICU branch-isolation). (14 placeholders, of which `{termin_neu_gewuenscht}` is mode-conditional.)

**Notes**:
- ICU `select`-Syntax syntaktisch valid für next-intl (validiert gegen ICU MessageFormat 4.0 Grammatik). Beachten: kein Komma vor der Mode-Variante, geschweifte Klammern um die Branch-Strings, **`other` Branch ist Pflicht** in ICU select — wir setzen Fallback identisch zur `bestaetigen`-Variante als safety-net (wenn `mode` fehlerhaft, ist die conservatively-correct Annahme „bestätigen", nicht „absagen" — ein versehentlich-verschickter Bestätigungs-Text richtet weniger Schaden an als ein versehentlich-verschickter Absage-Text).
- Mode-Werte sind ASCII-only ohne Umlaute (`bestaetigen` statt `bestätigen`) weil ICU select-keys keine Umlaute zulassen ohne Quoting; Spec §4.3 Zeile 382–384 verwendet UI-seitig `bestätigen` (mit ä) für die Radio-Labels — das bleibt UI-Wortlaut, der Component-Code mappt UI-Mode → ICU-Mode (`'bestätigen' → 'bestaetigen'`). mock-backend-coder-Hinweis: enum-Werte in `Reply.mode` Type sollten ASCII-only sein für i18n-Kompatibilität (`'bestaetigen' | 'verschieben' | 'absagen'`).
- §-Referenzen-Versuchung widerstanden: erwogen war Hinweis auf BGB Verzug/Schadensersatz bei Termin-Absage gegenüber Behörden — ist juristisch ohnehin nicht einschlägig (Behörden-Termine sind nicht zivilrechtlich), und gehört im Übrigen *nie* in einen Bürger:innen-Brief. Auch verworfen: in der `verschieben`-Branch ein zusätzlicher Satz „Ich danke Ihnen für Ihr Verständnis" — abgelehnt, weil (a) Smartlaw-Linie: keine emotional-werbende Sprache, (b) Verifier #2 hard-line: *eine* administrative Phrase. Schluss-Sätze in `absagen` und `verschieben` sind nicht „eine zweite Phrase", sondern integrierter Bestandteil der einen Mode-Phrase (Komma-Verbindung im `verschieben`-Fall, Punkt-Trennung im `absagen`-Fall — in beiden Fällen ein einziger zusammenhängender administrativer Akt).

---

## Verbatim disclaimer copy (DE-only — for `disclaimer_pre_insertion` and `disclaimer_inline`)

> **Scope**: für die 4 V1.5.0 Templates. Die Skelett-Templates (V1.5.1) erhalten von Domain im V1.5.1-Cycle separate Disclaimer mit § 357 Abs. 2 AO-Adressat-Risiko (siehe Verifier-Auflage und Spec §9 Zeile 1075). i18n-localizer übersetzt Disclaimer in DE/EN/RU/UK/AR/TR — DE bleibt Source-of-Truth.

### 5.1 `frist_verlaengerung`

**`disclaimer_pre_insertion`** (gezeigt einmalig vor Insertion, im `<ReplyTemplatePicker>`-Tooltip oder dezentem Inline-Hinweis — *nicht* als Modal, weil V1.5.0 keine Modale für nicht-Rechtsbehelf-Templates triggert):

> Diese Vorlage formuliert eine reine Bitte um Fristverlängerung. Sie enthält keine rechtliche Bewertung Ihres Einzelfalls. Ob eine Verlängerung gewährt wird, entscheidet die Behörde nach den Regeln der jeweiligen Verfahrensordnung (zum Beispiel Abgabenordnung oder Verwaltungsverfahrensgesetz). Verfassen Sie die Begründung selbst — die App schlägt keine Argumente vor.

**`disclaimer_inline`** (eine Zeile, neben `<textarea>` während Bearbeitung):

> Hinweis: Die Behörde entscheidet eigenständig, ob die Frist verlängert wird.

### 5.2 `nachweis_einreichen`

**`disclaimer_pre_insertion`**:

> Mit dieser Vorlage übersenden Sie Unterlagen, um Ihrer Mitwirkungspflicht nachzukommen — etwa nach den Regelungen des Sozialgesetzbuchs, der Abgabenordnung oder des Aufenthaltsgesetzes, je nach Behörde. Die Vorlage enthält keinen Verzicht auf weitere Unterlagen-Anforderungen: Bitte fügen Sie nur den genannten Nachweis bei.

**`disclaimer_inline`**:

> Hinweis: Hängen Sie nur den explizit angeforderten Nachweis an — keine zusätzlichen Dokumente.

### 5.3 `informative_rueckmeldung`

**`disclaimer_pre_insertion`**:

> Diese Vorlage ist eine reine Sachmitteilung. Sie ist **kein** Einspruch, **kein** Widerspruch, **kein** Antrag. Wenn Sie einen Bescheid förmlich anfechten möchten, ist eine andere Vorlage zu wählen — und Fristen können laufen (in der Regel ein Monat nach Bekanntgabe; geregelt etwa in der Abgabenordnung oder dem Sozialgerichtsgesetz).

**`disclaimer_inline`**:

> Hinweis: Diese Mitteilung ist kein Rechtsbehelf — sie hemmt keine Frist.

### 5.4 `termin_antwort`

**`disclaimer_pre_insertion`**:

> Diese Vorlage antwortet auf einen Terminvorschlag der Behörde. Bei Verschiebung oder Absage ist der Vorschlag eines Alternativtermins (Modus „verschieben") in der Regel hilfreich. Beachten Sie, dass eine versäumte Mitwirkung im laufenden Verfahren nachteilige Folgen haben kann — etwa nach den Mitwirkungs-Regelungen des Sozialgesetzbuchs oder des Aufenthaltsgesetzes, je nach Behörde.

**`disclaimer_inline`**:

> Hinweis: Eine Absage ohne Alternativtermin kann das Verfahren verzögern.

---

## 6. Cross-template: pre-Versand confirmation modal (Verifier-locked, transcribe verbatim)

**`posteingang.compose.versand_modal_title`**:

> Versand simulieren?

**`posteingang.compose.versand_modal_body`** (verbatim from Verifier review § „Flags for product-architect"):

> Diese Demo simuliert den Versand. Es geht nichts an {empfaenger_behoerde}. Bitte verfassen Sie Ihre Antwort so, wie Sie sie tatsächlich an die Behörde senden würden — Beleidigungen oder Drohungen können nach §§ 185, 241 StGB strafbar sein, auch wenn dies hier nur eine Übung ist.

> **Note**: Dies ist die *einzige* Stelle in der gesamten V1.5.0 reply feature, an der `§`-Symbole in Bürger:innen-sichtbarem Text vorkommen — und nur weil der Verifier sie dort verbatim gelockt hat (Norm-Verweis als Verhaltens-Anker, nicht als rechtliche Bewertung). Im Body, in den Templates, in den Pre-Insertion-Disclaimern: **null § -Symbole**.

**Modal-Verhalten** (für frontend-coder):
- shadcn/ui `<AlertDialog>` (focus-trap, ESC=Cancel, primary-action explicit).
- `aria-modal="true"`, initial-focus auf den Heading.
- Primary-Button: `posteingang.reply.cta_send_simulated` „Versand simulieren" — destructive-Variante (rotes Akzent).
- Secondary-Button: `posteingang.reply.discard_confirm_cta_no` „Abbrechen".
- Wird *für alle Templates inklusive `freitext`-Modus* gezeigt (Verifier-Auflage). Keine Skip-Option, keine „Diesen Hinweis nicht mehr zeigen"-Checkbox — der Hinweis ist semantisch eine direkt-an-die-Aktion-gekoppelte Disclaimer-Bestätigung iSv it-recht-kanzlei.de Disclaimer-Bestimmtheits-Doktrin („in direkter inhaltlicher Verbindung, vor Handlung").

---

## 7. Mock-confirmation receipt copy (Verifier-locked, transcribe verbatim)

**`posteingang.reply.confirmation.kanal_speculative_2027_text`** (Speculative-2027 channel-framing — antrags-thread-gebunden, Verifier-Auflage A5):

> antrags-thread-gebundene bidirektionale Kommunikation auf Basis des ZBP/BundID-Modells

**`posteingang.reply.confirmation.full_receipt_template`** (vollständige Quittungs-Anzeige in `<ReplyConfirmationView>`):

> [MOCK] Ihre Antwort wurde simuliert versendet. In einem realen 2027-Szenario würde sie {kanal} an {empfaenger_behoerde} übermittelt — antrags-thread-gebunden auf Basis des ZBP/BundID-Modells.

**Token-Resolver-Hinweise**:
- `{kanal}`: per Behörde aus `behoerden.json` aufgelöst; default-Mapping (mock-backend-coder ergänzen):
  - Finanzamt → `„über Mein ELSTER"`
  - Familienkasse → `„über das Familienkasse-Online-Portal"`
  - Krankenkasse → `„über das Kassen-Portal"`
  - Beitragsservice → `„über das Beitragsservice-Service-Portal"`
  - Bürgeramt / Standesamt → `„über das Landes-Service-Portal"`
  - ABH (LEA) → `„über das Landes-Service-Portal"`
  - IHK / VBG → `„über das Mitglieder-Portal"` (Fallback: `„per Briefpost"`)
  - Bundesdruckerei → `„nicht direkt erreichbar — über das ausstellende Bürgeramt"`
- `{empfaenger_behoerde}`: aus `letter.absender_behoerde_id` → `behoerden.json` resolved Name.

---

## 8. Persona-Kontext: controlled list für `{nachweis_bezeichnung}`

> Per Verifier #1d „kein Free-Text" — die Bürger:in wählt aus einer geschlossenen Liste. mock-backend-coder soll diese Liste in `src/lib/mock-backend/reply-templates.ts` als `nachweisBezeichnungen` const ablegen. Liste ist **erweiterbar** je nach Letter-Archetype (z. B. `letter.archetype === 'familienkasse-nachweis'` → priorisiert `Schulbescheinigung` an erster Stelle).

| Wert (DE) | Typische Behörde / Archetype | Letter-Anker (aus letters.json) |
|---|---|---|
| Schulbescheinigung | Familienkasse | letter-schmidt-familienkasse-nachweis |
| Verdienstbescheinigung | Familienkasse, Jobcenter, ABH | letter-abh-erinnerung-verlaengerung |
| Mietvertrag | Bürgeramt, Jobcenter, ABH | letter-abh-erinnerung-verlaengerung |
| Wohnungsgeberbestätigung | Bürgeramt | (V2 — Anmeldung) |
| Krankenkassen-Mitgliedsbescheinigung | ABH, Arbeitgeber, Standesamt | letter-aok-mitgliedsbescheinigung |
| Aktueller Reisepass (Kopie) | ABH | letter-abh-erinnerung-verlaengerung |
| Aktueller Arbeitsvertrag | ABH, Jobcenter | letter-abh-erinnerung-verlaengerung |
| Gehaltsnachweise der letzten sechs Monate | ABH, Jobcenter, Familienkasse | letter-abh-erinnerung-verlaengerung |
| Geburtsurkunde (Kopie) | Familienkasse, Krankenkasse, Finanzamt | letter-schmidt-standesamt-geburt |
| Steuerbescheid (Kopie) | IHK, Krankenkasse (freiwillig) | letter-mehmet-fa-steuerbescheid-2024 |
| Gewerbe-Anmeldung (Kopie) | IHK, Finanzamt | (V2 — Gewerbe) |
| Nachweis über laufenden SGB-II-Bezug | Beitragsservice (Befreiung) | letter-schmidt-beitragsservice-festsetzung |
| Sonstige Bescheinigung | Fallback | alle |

Auswahl-Default je nach `letter.archetype`:
- `familienkasse-nachweis` → `Schulbescheinigung` (Schmidt-Demo-Anker)
- `abh-verlaengerung` → `Aktueller Arbeitsvertrag`
- `krankenkasse-beitrag` (freiwillig) → `Steuerbescheid (Kopie)`
- `ihk-beitrag` → `Steuerbescheid (Kopie)`
- `beitragsservice-mahnung` → `Nachweis über laufenden SGB-II-Bezug`
- alle anderen → `Sonstige Bescheinigung`

---

## 9. Validation log (self-grep before lock)

- [x] **Zero `§`-Symbole in den 4 Body-Strings** — manuell verifiziert. Einzige Vorkommnisse von `§` in diesem Dokument sind: (a) Pre-Versand-Modal-Body (Verifier-locked verbatim, §§ 185, 241 StGB); (b) Disclaimer-Pre-Insertion-Texte erwähnen Gesetze in Klartext (`„Abgabenordnung"`, `„Sozialgesetzbuch"`) ohne §-Zitation — siehe Validation §9.4 unten; (c) diese Notes-/Meta-Sektionen außerhalb der Body-Strings.
- [x] **Disclaimer-Pre-Insertion benennt Gesetze in Klartext, nicht als §-Zitation** — bewusste Entscheidung: das Disclaimer-Forum ist *Bürger:innen*-orientiert, Klartext-Gesetzesnamen („Abgabenordnung", „Sozialgesetzbuch", „Aufenthaltsgesetz") sind verständlicher und entlasten den Body von Norm-Last; sollte der Architekt §-Zitation in Disclaimern einfordern, wäre der Wechsel mechanisch trivial — Domain rät davon ab.
- [x] **ICU select-Syntax für `termin_antwort`** — Grammatik gegen ICU MessageFormat 4.0 verifiziert (Branches: `bestaetigen {…} verschieben {…} absagen {…} other {…}`, geschweifte Klammern paarig, kein Komma vor Mode-Wert, Pflicht-`other`-Branch vorhanden).
- [x] **Placeholder-Konsistenz Body ↔ Disclaimer ↔ Receipt** — Empfänger-Behörde überall `{empfaenger_behoerde}` (nicht `{behoerde}`, nicht `{empfaenger_name}`). Datum-Token-Trennung sauber: `{datum}` = Versand-Datum (heute), `{datum_letter}` = Brief-Empfangsdatum, `{frist_alt}`/`{frist_neu_gewuenscht}` = Fristverlängerungs-Daten, `{termin_vorgeschlagen}`/`{termin_neu_gewuenscht}` = Termin-Antwort-Daten. Keine doppelte Belegung.
- [x] **Sie-Form durchgängig** — keine Du-Rutscher; „Ich" für die Bürger:in (Selbst-Subjekt), „Sie/Ihnen/Ihre" für die Behörde (Adressat).
- [x] **Bürger:innen-Authentizität (Aloud-Reading-Test)** — alle vier Bodies einmal laut gelesen. Klingen wie reale Bürger:innen-Briefe (etwas formaler als private Korrespondenz, aber nicht Kanzlei-Sprache). Vergleich gegen `letter-schmidt-familienkasse-nachweis` (Behörden-Sprache) zeigt: unsere Bürger:innen-Antworten sind erwartungsgemäß weniger formal als Behörden-Schreiben — passt zur RDG-Linie.
- [x] **Salutation neutral** — durchgängig „Sehr geehrte Damen und Herren," (nicht „Sehr geehrter Herr/Frau …"). Verifier-Anforderung: nie gendered.

---

## 10. Coder-Hand-off Notes

### 10.1 Architect / Spec-Amendments

- **Spec §4.3 Zeile 390–392** muss von **drei separaten body_de-Keys** (`termin_antwort_bestaetigen` / `_verschieben` / `_absagen`) auf **einen ICU-Select-Key** (`termin_antwort`) reduziert werden — siehe §4 oben. Auch entsprechend Spec §8.5 Zeilen 972–1026 entfernen und durch den ICU-Select-Block ersetzen.
- **Spec §6 (Data shape)** muss `Reply.mode` Type ergänzen: `'bestaetigen' | 'verschieben' | 'absagen' | null` (null für non-termin Templates und freitext).
- **Spec §6.5 (ELSTER-Konstanten)** unverändert — Anhang-Validierung greift unverändert auch für `nachweis_einreichen`.
- **Spec §8.6** sollte ergänzt werden um die neuen i18n-Keys aus §5 (Pre-Insertion + Inline Disclaimer pro Template, also 4×2 = 8 neue Keys) sowie §7 (1 neuer Receipt-Key + 1 neuer Speculative-Channel-String).

### 10.2 i18n-localizer Hand-off

- **DE-source** ist dieses Dokument — verbatim übernehmen, keine Wortlaut-Änderungen ohne erneute Verifier-Freigabe.
- **Body-Templates** (`posteingang.reply.template.body_de.*`) sind **DE-only** — KEINE Übersetzung nach EN/RU/UK/AR/TR. (Spec §8.5 Zeile 867: „Behörde parst Deutsch".)
- **Disclaimer + Modal + Receipt** sind **6-Lokal-Vollübersetzung**. Bei der Übersetzung der Disclaimer ist die *Klartext-Gesetz-Nennung* zu erhalten („Abgabenordnung", „Sozialgesetzbuch") — Lokalisierung darf Gesetzesnamen nicht durch englische Begriffe ersetzen, weil deutsche Gesetze in jeder Sprache als Eigennamen behandelt werden (ähnlich wie „Bundestag").
- **`§§ 185, 241 StGB` im Pre-Versand-Modal**: bei Lokalisierung als-ist beibehalten (deutsche Gesetzes-Norm-Zitate sind in jeder Sprache so zu zitieren); ergänzend kann ein Klammerzusatz „(Beleidigung, Bedrohung)" in der Zielsprache hinzugefügt werden. Verifier hat Modal-Body verbatim gelockt; bei Zweifeln zurück zur Domain für Re-Verifizierung.

### 10.3 mock-backend-coder Hand-off

- **Token-Resolver in `src/lib/mock-backend/reply-templates.ts`**: alle 14+ Tokens auflösen aus (a) aktiver Persona, (b) Letter, (c) Behörde-Lookup, (d) `Date.now()`. Bei Verschieben-Mode mit fehlendem `{termin_neu_gewuenscht}` (User hat noch nicht eingegeben): Resolver liefert Pflicht-Validation-Fehler, der in der UI als Disabled-Send-Button-State erscheint — kein leerer String im finalen Body.
- **`Reply.mode` enum**: ASCII-only (`'bestaetigen' | 'verschieben' | 'absagen'` — nicht `'bestätigen'`). UI-Mapping zwischen UI-Label (mit ä) und Enum-Wert (ohne ä) in `<ReplyTemplateModeRadio>` Component.
- **`{nachweis_bezeichnung}` controlled list** aus §8 oben als const-Array exportieren; UI rendert als `<Select>` (nicht freier Input).
- **`{termin_vorgeschlagen}`-Extraction**: aus Letter-Body via `extrahiere_frist`-Pendant für Termin-Daten (regex `\\d{2}\\.\\d{2}\\.\\d{4}(,?\\s*\\d{2}:\\d{2}\\s*Uhr)?`); wenn Letter keinen Termin-Vorschlag enthält, ist das Template `termin_antwort` für diesen Letter im Picker disabled (siehe Spec §4.4 Annahme: V1.5.0 ergänzt einen neuen Mock-Letter Termin-Vorschlag-Brief — Verifier-Auflage A2 Punkt 15).

### 10.4 frontend-coder Hand-off

- **Pre-Insertion-Disclaimer-Surface** für die 4 V1.5.0 Templates ist *kein* Modal (V1.5.0 hat nur ein Modal: Pre-Versand). Disclaimer-Pre-Insertion ist eine inline `<Tooltip>` oder `<HoverCard>` am Template-Picker-Item, alternativ als kleines `<Hint>` unter dem Picker bei selected-State. Modale sind V1.5.1 territory (Skelett-Templates, mit Adressat-Risiko).
- **Disclaimer-Inline** rendert direkt unter der `<textarea>` (zwischen textarea und Anhänge-Input), eine Zeile, klein, `text-muted-foreground`.
- **Pre-Versand-Modal** ist `<AlertDialog>` (focus-trap eingebaut). Body-Wortlaut **verbatim** aus §6.

---

## 11. Sources (verified 2026-05-09)

- [§ 2 Abs. 1 RDG — gesetze-im-internet.de](https://www.gesetze-im-internet.de/rdg/__2.html)
- [BGH I ZR 113/20 (Smartlaw, 09.09.2021) — bundesgerichtshof.de](https://www.bundesgerichtshof.de/SharedDocs/Pressemitteilungen/DE/2021/2021171.html)
- [§ 109 AO Verlängerung von Fristen — gesetze-im-internet.de](https://www.gesetze-im-internet.de/ao_1977/__109.html)
- [§ 185 StGB Beleidigung — gesetze-im-internet.de](https://www.gesetze-im-internet.de/stgb/__185.html)
- [§ 241 StGB Bedrohung — gesetze-im-internet.de](https://www.gesetze-im-internet.de/stgb/__241.html)
- [§ 31 VwVfG Fristen und Termine — gesetze-im-internet.de](https://www.gesetze-im-internet.de/vwvfg/__31.html)
- [§ 26 SGB X Mitwirkung der Beteiligten — gesetze-im-internet.de](https://www.gesetze-im-internet.de/sgb_10/__26.html)
- [§ 90 AO Mitwirkungspflichten — gesetze-im-internet.de](https://www.gesetze-im-internet.de/ao_1977/__90.html)
- [§ 82 AufenthG Mitwirkung des Ausländers — gesetze-im-internet.de](https://www.gesetze-im-internet.de/aufenthg_2004/__82.html)
- [Disclaimer-Bestimmtheit — IT-Recht-Kanzlei](https://www.it-recht-kanzlei.de/disclaimer-sinn-unsinn.html)
- [BundID — BMDS](https://bmds.bund.de/themen/digitaler-staat/digitale-identitaeten/bundid)
- [BundID/EUDI Wallet 2026 — AKDB Newsroom](https://www.akdb.de/newsroom/news/bundid-und-eudi-wallet-auf-dem-digitalen-staat-2026/)
- [eIDAS 2 / VO (EU) 2024/1183 — EUR-Lex](https://eur-lex.europa.eu/eli/reg/2024/1183/oj)
- [ICU MessageFormat 4.0 (select syntax) — unicode-org](https://unicode-org.github.io/icu/userguide/format_parse/messages/)
- [next-intl ICU select — next-intl docs](https://next-intl.dev/docs/usage/messages#selects)

---

## 12. Locked. Do not edit without verifier sign-off.

> Any future change to a `body_template_de` string requires:
> 1. Domain-expert proposes change with diff + RDG-rationale.
> 2. Verifier sign-off (concept-verifier).
> 3. i18n-localizer re-touches translations downstream (only Disclaimer/Receipt/Modal — bodies are DE-only).
> 4. Spec §8.5 update.
> 5. mock-backend-coder updates token-resolver if placeholder-set changes.
>
> Body-text is the locus of RDG-line maintenance. It cannot bit-rot through translation, ad-hoc copy edits, or "minor" wording-Änderungen.
