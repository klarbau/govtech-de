---
feature: posteingang-v1.5.1-rechtsbehelf-aussetzung
date: 2026-05-09
author: domain-expert
status: domain-locked-v2
verdict: PROCEED-after-revision-2
revision: v2 (2026-05-09, post concept-verifier REVISE)
extends: docs/domain/posteingang-v1.5-template-bodies.md
inputs:
  - docs/specs/posteingang-v1.5.md (§ 9 Z.1080–1081, § 11.2)
  - docs/research/2026-05-09-posteingang-gap-analysis.md (Idea 2 + Idea 8)
  - docs/domain/posteingang-v1.5-template-bodies.md
  - docs/domain/posteingang-antwort-verfassen.md
  - docs/reviews/2026-05-09-posteingang-v1.5.1-verify.md (REVISE verdict)
  - src/data/letters.json
  - src/types/letter.ts
  - src/lib/mock-backend/reply-templates.ts
sources:
  - https://www.gesetze-im-internet.de/ao_1977/__357.html       # § 357 AO Einlegung des Einspruchs
  - https://www.gesetze-im-internet.de/ao_1977/__355.html       # § 355 AO Einspruchsfrist
  - https://www.gesetze-im-internet.de/ao_1977/__347.html       # § 347 AO Statthaftigkeit Einspruch
  - https://www.gesetze-im-internet.de/ao_1977/__361.html       # § 361 AO Aussetzung der Vollziehung
  - https://www.gesetze-im-internet.de/ao_1977/__240.html       # § 240 AO Säumniszuschläge
  - https://www.gesetze-im-internet.de/ao_1977/__122a.html      # § 122a AO Bekanntgabefiktion 4. Tag
  - https://www.gesetze-im-internet.de/sgg/__84.html            # § 84 SGG Widerspruchsfrist + Adressat
  - https://www.gesetze-im-internet.de/sgg/__86a.html           # § 86a SGG aufschiebende Wirkung
  - https://www.gesetze-im-internet.de/vwgo/__70.html           # § 70 VwGO Form/Frist Widerspruch
  - https://www.gesetze-im-internet.de/vwgo/__68.html           # § 68 VwGO Vorverfahren
  - https://www.gesetze-im-internet.de/owig_1968/__67.html      # § 67 OWiG Einspruch Bußgeldbescheid
  - https://www.gesetze-im-internet.de/sgb_1/__60.html          # § 60 SGB I Mitwirkungspflicht
  - https://www.gesetze-bayern.de/Content/Document/BayAGVwGO-12 # Art. 12 BayAGVwGO Widerspruchsverfahren
  - https://www.bundesfinanzhof.de/en/entscheidungen/entscheidungen-online/decision-detail/STRE202310204/ # BFH III R 26/22 (2023, Familienkasse)
  - https://www.bundesfinanzhof.de/de/entscheidung/entscheidungen-online/detail/pdf/STRE201510201   # BFH III R 26/14 (2015, E-Mail-Einspruch wirksam ohne Begründung)
  # BFH II R 90/83 (Urteil v. 27.11.1985, BStBl II 1986, 243): Einspruch ohne Begründung wirksam — wird im Text zitiert.
---

## Changelog v2 (2026-05-09)

> Diese v2-Fassung adressiert die drei [domain-expert]-Pflicht-Revisionen aus dem Verifier-Verdikt vom 2026-05-09 (`docs/reviews/2026-05-09-posteingang-v1.5.1-verify.md` § 4) sowie vier Architect-Instruktionen.

**Pflicht-Revisionen (HARD):**

1. **`{datum_bescheid}` als eigener Token mit eigener Quelle** (Verifier AV5 / § 4 Revision 1, **Option A** gewählt). Skelett-Templates lösen die "Bescheid vom …"-Phrase nicht mehr aus `letter.empfangen_am` (= Brief-Empfangsdatum) auf, sondern aus einem neuen optionalen Letter-Feld `bescheid_dated_at` (Erlassdatum aus dem Briefkopf). Fallback bei `undefined` → `letter.empfangen_am`. V1.5.0-Templates bleiben unverändert (sie tragen "Schreiben vom" und referenzieren weiter `{datum_letter}` ← `letter.empfangen_am`).
2. **Selbst-Bindungs-Satz "Eine Begründung reiche ich gesondert nach" entfernt** (Verifier AV11 / § 4 Revision 2). § 3.1 (`rechtsbehelf_einspruch_skelett`) und § 3.2 (`rechtsbehelf_widerspruch_skelett`) tragen jetzt die reine Rumpf-Form. Begründung: Einspruch ohne Begründung ist nach BFH II R 90/83 (Urt. v. 27.11.1985, BStBl II 1986, 243) wirksam — ein App-eingeengtes Versprechen erzeugt eine implizite Folge-Pflicht, die V1.5.1 nicht trackt (§ 364b AO Frist-Setzung, § 367 AO Entscheidung als unbegründet). BFH III R 26/14 (2015) bestätigt zudem, dass selbst formfreie Einspruchs-Erklärungen (E-Mail, ohne Signatur) wirksam sind, wenn Einspruchs-Führer:in und VA erkennbar sind.
3. **Familienkasse-AO-Erklärer ist verbindlich**, nicht mehr "empfohlen" (Verifier AV1 / § 4 Revision 3). § 2.1 (Pre-Insertion-Modal AO-Familie) trägt jetzt einen *konditionalen Zusatz-Satz*, der genau dann (und nur dann) gerendert wird, wenn `archetype === 'familienkasse-nachweis'`. § 5 Visibility-Matrix führt das Flag.

**Architect-Instruktionen (SOFT, hier dokumentiert, nicht im Domain-Lock UI-spezifiziert):**

- **AV4** — § 122a-Caveat (§ 8) collapses auf `<md` viewport in einem `<details>`-Element. Frist-Cited-Format selbst bleibt sichtbar; Caveat ist informational. Spec-Anweisung an product-architect.
- **AV6** — `ReplyTemplatePicker` ordnet Templates per archetype-keyed Intent-Likelihood-Order. Für `steuerbescheid` + `einspruch` + `zahlung`: `rechtsbehelf_einspruch_skelett` (1, default-highlighted), `aussetzung_vollziehung_skelett` (2), `frist_verlaengerung` (3), `informative_rueckmeldung` (4), `freitext` (5). Spec-Anweisung an product-architect.
- **AV7** — Cross-template state: beim Switch zwischen `rechtsbehelf_einspruch_skelett` ↔ `aussetzung_vollziehung_skelett` auf demselben Letter erlaubt der `<ReplyTemplateSwitchConfirmDialog>` zusätzlich die Option "Beide als getrennte Briefe versenden" (zwei `Reply`-Records, zwei Versand-Modale, beide im Vorgangs-Thread). Spec-Anweisung an product-architect.
- **AV10** — Visibility-Predicate ist *positive-allow* (`typ ∈ {einspruch, widerspruch}`), nicht negative-deny. § 5 ist entsprechend umformuliert.

Body-Bytes-Differenz gegenüber v1: § 3.1 + § 3.2 jeweils −47 Zeichen (Selbst-Bindungs-Satz raus); § 3 Token-Mapping-Tabelle erweitert; § 2.1 + § 5 erweitert um Familienkasse-Flag; § 11 Validation-Log und § 12 Lock-Notes auf v2 aktualisiert.

---

> **Geltungsbereich**: V1.5.1 Skelett-Templates für Posteingang-Reply-Funktion. Drei neue `ReplyTemplateId`-Werte: `rechtsbehelf_einspruch_skelett`, `rechtsbehelf_widerspruch_skelett`, `aussetzung_vollziehung_skelett`. Ergänzt das V1.5.0-Set (`frist_verlaengerung`, `nachweis_einreichen`, `informative_rueckmeldung`, `termin_antwort` + `freitext`). RDG-Linie identisch zu V1.5.0: Werkzeug-Charakter, kein RDG iSv § 2 Abs. 1 RDG, Smartlaw-konform (BGH I ZR 113/20). Jede Bürger:innen-Begründung wird *nicht* generiert.
>
> **Hard line (übernommen aus V1.5.0-Lock § 11.2)**: jeder Body enthält Datum, Aktenzeichen, Empfänger-Behörde, Anrede „Sehr geehrte Damen und Herren,", **EINE** administrative Phrase, Schlussformel. **Zero `§`-Symbole im Body.** Norm-Verweise leben ausschließlich in `disclaimer_pre_insertion_modal` (Adressat-Risiko), `disclaimer_inline` und `frist_cited_format` (ReplySheet-Header). Diese drei neuen Templates folgen dem Lock — die einzige sichtbare `§`-Häufung gegenüber V1.5.0 ist der Norm-Zitat-Block im Pre-Insertion-Modal (Verifier-Auflage).

---

## 1. Norm-Familie-Mapping (Letter-Archetype → Rechtsbehelf-Norm)

> Quelle pro Zelle: gesetze-im-internet.de bzw. gesetze-bayern.de + Behörden-Selbstauskunft. Verifiziert 2026-05-09.

| Archetype (`letter.archetype`) | Erlassende Behörde (Beispiele) | Rechtsbehelf | Frist | Adressat-Behörde (Hard-Anker) | Norm + Citation |
|---|---|---|---|---|---|
| `steuerbescheid` | Finanzamt (Land) | **Einspruch** | **1 Monat** ab Bekanntgabe | **die erlassende Finanzbehörde** (i. d. R. das Finanzamt aus dem Briefkopf); die zur Erteilung des Steuerbescheids zuständige Behörde ist als alternativ-zulässige Stelle ausdrücklich genannt | § 347 Abs. 1 Nr. 1 AO + § 355 Abs. 1 AO + § 357 Abs. 2 AO |
| `familienkasse-nachweis` *bei Ablehnungs-/Aufhebungsbescheid* (z. B. Ablehnung Kindergeld, Rückforderung) | Familienkasse (BA / Bundesbehörde) | **Einspruch (nicht Widerspruch!)** | **1 Monat** ab Bekanntgabe | **die erlassende Familienkasse** (Briefkopf-Adresse) | Kindergeld ist seit 1996 als Steuervergütung iSv § 31 EStG geregelt → **AO-Verfahrensrecht** (§§ 347 ff. AO) gilt, **nicht SGG**. § 347 Abs. 1 Nr. 1 AO + § 357 Abs. 2 AO. (BFH III R 26/22, Beschluss v. 17.08.2023 — Familienkassen-Rechtsbehelfsbelehrung) |
| `krankenkasse-beitrag` (gesetzlich: AOK, TK, BARMER, …) | Krankenkasse (Selbstverwaltung, Sozialversicherungsträger) | **Widerspruch** | **1 Monat** ab Bekanntgabe; **3 Monate**, wenn Bescheid im Ausland bekannt gegeben | **die Stelle, die den Verwaltungsakt erlassen hat** (i. d. R. die Krankenkasse selbst); zulässig auch eine andere inländische Behörde, ein Versicherungsträger, eine deutsche Konsularbehörde (Weiterleitungspflicht) | § 84 Abs. 1, 2 SGG. **Achtung**: Widerspruch hat keine aufschiebende Wirkung bei Beitragspflichten (§ 86a Abs. 2 Nr. 1 SGG) — Beiträge bleiben fällig. |
| `berufsgenossenschaft-beitrag` (BG, VBG, BGW — Träger der gesetzlichen Unfallversicherung) | Berufsgenossenschaft (Selbstverwaltung, Sozialversicherungsträger) | **Widerspruch** | **1 Monat** ab Bekanntgabe; 3 Monate Auslands-Bekanntgabe | **die erlassende BG** | § 84 Abs. 1 SGG (analog Krankenkasse). Keine aufschiebende Wirkung für Beitragsfestsetzung (§ 86a Abs. 2 Nr. 1 SGG). |
| `ihk-beitrag` | Industrie- und Handelskammer (Körperschaft des öffentlichen Rechts) | **Widerspruch** | **1 Monat** ab Bekanntgabe | **die erlassende IHK** (Briefkopf-Adresse) | § 68, § 70 Abs. 1 VwGO + § 80 Abs. 2 Nr. 1 VwGO (keine aufschiebende Wirkung bei öffentlichen Abgaben — Beitrag bleibt fällig). |
| `beitragsservice-mahnung` (Festsetzungsbescheid Rundfunkbeitrag, „GEZ") | Landesrundfunkanstalt (RBB / NDR / WDR / …, vertreten durch den ARD ZDF Deutschlandradio Beitragsservice) | **Widerspruch** | **1 Monat** ab Bekanntgabe | **die für die zuständige Landesrundfunkanstalt handelnde Stelle** — d. h. der **Beitragsservice** als verwaltungstechnische Anlaufstelle, der den Widerspruch der zuständigen Rundfunkanstalt zuleitet (Adresse aus dem Briefkopf, regelmäßig 50656 Köln) | § 70 Abs. 1 VwGO i. V. m. dem Rundfunkbeitragsstaatsvertrag (RBStV) und den jeweiligen Landes-AG-VwGO-Regelungen. Klage zum Verwaltungsgericht nach § 68 VwGO; kein bundesweit einheitliches Vorverfahren-Regime, in einigen Ländern fakultativ (siehe § 9 unten). |
| `abh-verlaengerung` (Aufenthaltstitel-Bescheid, LEA / ABH) | Ausländerbehörde (Land/Kommune) | **Widerspruch** (sofern im jeweiligen Bundesland nicht abgeschafft) **oder direkt Anfechtungsklage** | **1 Monat** ab Bekanntgabe (Widerspruch) bzw. 1 Monat ab Bekanntgabe (Klage, falls Widerspruchsverfahren nicht statthaft) | **die erlassende ABH** (Briefkopf); Adressat-Risiko hoch wegen Föderalismus-Delta (siehe § 9.B) | § 68, § 70 Abs. 1 VwGO. **Bundesland-spezifisch**: in einigen Ländern (u. a. Bayern, NRW, Niedersachsen) ist das Widerspruchsverfahren in Aufenthaltsrechtssachen weitgehend abgeschafft (Art. 12 BayAGVwGO i. V. m. den fachgesetzlichen Spezialregeln) — dort direkt Anfechtungsklage. |
| `bussgeldbescheid` (OWi, Polizei, Bußgeldstelle) — *kein heutiger Mock-Letter, V2-Hook* | Verwaltungsbehörde (Polizei-Bußgeldstelle, Stadt) | **Einspruch** | **2 Wochen** ab Zustellung | **die Verwaltungsbehörde, die den Bußgeldbescheid erlassen hat** | § 67 Abs. 1, 2 OWiG. Form: schriftlich oder zur Niederschrift bei der Behörde. Mit fristgerechtem Einspruch geht der Vorgang zum Amtsgericht (§ 68 OWiG). |
| `standesamt-urkunde` (Geburts-/Eheurkunden-Übersendung) | Standesamt | **Kein Rechtsbehelf** (es ist eine Bestätigung/Urkunde, kein belastender VA) | n/a | n/a | n/a — keine Rechtsbehelf-Templates anbieten. |
| `buergeramt-meldung` (Meldebestätigung) | Bürgeramt | **Kein Rechtsbehelf** (Bestätigung, kein belastender VA) | n/a | n/a | n/a |
| `sonstiges` (z. B. Bundesdruckerei-Versandbestätigung) | Bundesdruckerei / Sonstige | **Kein Rechtsbehelf** | n/a | n/a | n/a |

> **Norm-Familie-Cluster** (drei Cluster, die das Pre-Insertion-Modal-Wording bestimmen):
> - **AO-Familie** (Einspruch, 1 Monat): `steuerbescheid`, `familienkasse-nachweis`. Adressat-Risiko: Einspruch bei der erlassenden Behörde.
> - **SGG-Familie** (Sozial-Widerspruch, 1 Monat): `krankenkasse-beitrag`, `berufsgenossenschaft-beitrag`. Adressat-Risiko: bei der erlassenden Stelle, Weiterleitungspflicht durch andere Behörden.
> - **VwGO-Familie** (Allgemein-Widerspruch, 1 Monat): `ihk-beitrag`, `beitragsservice-mahnung`, `abh-verlaengerung`. Adressat-Risiko: bei der erlassenden Behörde **oder** bei der Widerspruchs-Behörde (i. d. R. die übergeordnete Aufsichts-Behörde).
> - **OWiG-Familie** (Einspruch Bußgeld, 2 Wochen): `bussgeldbescheid` — V2-Hook (kein Mock-Letter heute).

> **Aussetzung der Vollziehung** ist Norm-übergreifend, wird aber demoseitig auf **AO-Familie** beschränkt:
> - § 361 AO für Einspruch nach AO (Steuerbescheid, Familienkasse-Bescheid). **Hard-line: nur dort als Template anbieten.**
> - § 86a Abs. 3 SGG für Sozial-Widerspruch (Anordnung der aufschiebenden Wirkung) — **OUT in V1.5.1**, weil andere Begriffsbildung („Anordnung der aufschiebenden Wirkung") und andere Tatbestandsschwelle.
> - § 80 Abs. 4 VwGO für Allgemein-Widerspruch — **OUT in V1.5.1** aus gleichem Grund.
> Begründung Hard-Line: Eine Aussetzung-Skelett-Vorlage über alle drei Familien hinweg würde RDG-Risiko erhöhen (Bürger:in könnte das falsche Institut wählen). Demo zeigt § 361 AO sauber, V2-Hook für SGG/VwGO-Pendants.

---

## 2. Adressat-Modal-Wortlaut (Pre-Insertion-Modal — verbatim DE, Verifier-Auflage)

> **Verhalten** (für frontend-coder): vor dem Einfügen eines Skelett-Templates öffnet sich ein `<AlertDialog>` (focus-trap, ESC = abbrechen). Body-Text ist genau einer der vier folgenden Strings, ausgewählt nach **Norm-Familie** des Letter-Archetyps (Lookup-Tabelle aus § 1). Primary-Action: „Skelett einfügen" — secondary: „Abbrechen". Der Modal ist **nicht skip-bar** (keine „nicht mehr zeigen"-Checkbox; Verifier-Linie analog Pre-Versand-Modal V1.5.0).
>
> **Wortlaut-Konvention**: drei Sätze maximal, Sie-Form, Norm-Zitat **verbatim** (mit `§`-Symbol), schließt mit Eigen-Verifizierungs-Aufforderung. Token `{empfaenger_behoerde}` wird zur Anzeige durch den Briefkopf-Namen ersetzt.

### 2.1 AO-Familie (`rechtsbehelf_einspruch_skelett` für `steuerbescheid` + `familienkasse-nachweis`)

**Modal-Title**: „Einspruch bei der richtigen Stelle einlegen"

**Modal-Body** (`posteingang.compose.pre_insertion_modal.einspruch_ao`, verbatim):

> Ein Einspruch ist bei der Behörde einzulegen, deren Verwaltungsakt angefochten wird (§ 357 Abs. 2 Satz 1 AO). Wir haben aus dem Briefkopf „{empfaenger_behoerde}" als Adressat übernommen. Bitte prüfen Sie die Empfänger-Anschrift selbst — ein Einspruch bei einer falschen Stelle wahrt die Frist nur dann, wenn er die zuständige Behörde noch innerhalb der Frist erreicht (§ 357 Abs. 2 Satz 4 AO).

**Konditionaler Zusatz-Satz für Familienkasse-Bescheide** (verbindlich gerendert *unter* dem Standard-Body, **nur** wenn `letter.archetype === 'familienkasse-nachweis'` und `letter.fristen[].typ` enthält `'einspruch'` — siehe § 5 Visibility-Matrix Hard-Rule 6):

`posteingang.compose.pre_insertion_modal.einspruch_ao_familienkasse_zusatz`, verbatim:

> Hinweis: Kindergeld-Bescheide werden nach den Regeln der Abgabenordnung (AO) angefochten — nicht nach dem Sozialgerichtsgesetz. Frist und Form folgen aus § 357 AO. Das gilt, weil Kindergeld eine Steuervergütung im Sinne des § 31 EStG ist (BFH III R 26/22, 2023).

> **Begründung der Verbindlichkeit** (nicht im UI sichtbar; Domain-Note für product-architect): Die Familienkasse ist an die Bundesagentur für Arbeit angegliedert (BA = SGB-Behörde für Bürgergeld, Arbeitslosengeld). Bürger:innen vermuten daher intuitiv, dass Bescheide der Familienkasse dem Sozialgerichtsgesetz folgen — das ist falsch. Der Erklärer schließt diese Verwechslung explizit aus und ist deshalb mandatory, nicht optional.

### 2.2 SGG-Familie (`rechtsbehelf_widerspruch_skelett` für `krankenkasse-beitrag` + `berufsgenossenschaft-beitrag`)

**Modal-Title**: „Widerspruch bei der richtigen Stelle einlegen"

**Modal-Body** (`posteingang.compose.pre_insertion_modal.widerspruch_sgg`, verbatim):

> Ein Widerspruch in einer sozialversicherungsrechtlichen Sache ist bei der Stelle einzulegen, die den Bescheid erlassen hat (§ 84 Abs. 2 Satz 1 SGG). Wir haben aus dem Briefkopf „{empfaenger_behoerde}" als Adressat übernommen. Bitte prüfen Sie die Empfänger-Anschrift selbst — eine Einlegung bei einer anderen inländischen Behörde wahrt die Frist nur, weil diese Behörde den Widerspruch unverzüglich an die zuständige Stelle weiterleiten muss (§ 84 Abs. 2 Satz 2 SGG).

### 2.3 VwGO-Familie (`rechtsbehelf_widerspruch_skelett` für `ihk-beitrag` + `beitragsservice-mahnung` + `abh-verlaengerung`)

**Modal-Title**: „Widerspruch bei der richtigen Stelle einlegen"

**Modal-Body** (`posteingang.compose.pre_insertion_modal.widerspruch_vwgo`, verbatim):

> Ein Widerspruch ist bei der Behörde einzulegen, die den angefochtenen Verwaltungsakt erlassen hat (§ 70 Abs. 1 Satz 1 VwGO). Wir haben aus dem Briefkopf „{empfaenger_behoerde}" als Adressat übernommen. Bitte prüfen Sie die Empfänger-Anschrift selbst — in einigen Bundesländern (etwa Bayern) ist das Widerspruchsverfahren in bestimmten Sachgebieten abgeschafft; dann ist statt des Widerspruchs unmittelbar die Klage zum Verwaltungsgericht zu erheben.

### 2.4 AO-Aussetzung (`aussetzung_vollziehung_skelett`, nur für `steuerbescheid` + `familienkasse-nachweis`)

**Modal-Title**: „Aussetzung der Vollziehung — Hinweise"

**Modal-Body** (`posteingang.compose.pre_insertion_modal.aussetzung_ao`, verbatim):

> Die Aussetzung der Vollziehung ist bei der Finanzbehörde zu beantragen, die den angefochtenen Bescheid erlassen hat (§ 361 Abs. 2 Satz 1 AO). Sie wird **nicht automatisch** gewährt — die Behörde gewährt die Aussetzung nur, wenn ernstliche Zweifel an der Rechtmäßigkeit bestehen oder die Vollziehung eine unbillige Härte bedeuten würde (§ 361 Abs. 2 Satz 2 AO). Säumniszuschläge nach § 240 AO entstehen weiter, solange die Aussetzung nicht bewilligt ist; die Aussetzung setzt überdies einen bereits eingelegten Einspruch voraus.

### 2.5 OWiG-Familie (`rechtsbehelf_einspruch_skelett` für `bussgeldbescheid`) — V2-Hook, **nicht** in V1.5.1-UI sichtbar

**Hinweis**: Die Norm-Familie ist hier vollständigkeitshalber dokumentiert, aber kein Mock-Letter trägt heute `archetype: 'bussgeldbescheid'`. V1.5.1 zeigt diesen Modal nicht. Bei V2-Erweiterung um einen OWi-Bußgeldbescheid-Mock-Letter wäre der Wortlaut:

**Modal-Body (für V2-Cycle, nicht in V1.5.1 ausliefern)**:

> Der Einspruch gegen einen Bußgeldbescheid ist innerhalb von zwei Wochen ab Zustellung bei der Verwaltungsbehörde einzulegen, die den Bußgeldbescheid erlassen hat (§ 67 Abs. 1 Satz 1 OWiG). Wir haben aus dem Briefkopf „{empfaenger_behoerde}" als Adressat übernommen. Bitte prüfen Sie die Empfänger-Anschrift selbst — der Einspruch geht im Erfolgsfall an das zuständige Amtsgericht (§ 68 OWiG).

---

## 3. Body-Skelett-Wortlaute (RDG-clean, verbatim DE)

> **Konvention**: identisch zu V1.5.0-Lock — Address-Block oben, Empfänger-Block, Datum, Betreff, Anrede, **EINE** administrative Phrase, Schlussformel. **Zero `§`-Symbole im Body.**
>
> **v2-Korrektur (Verifier AV5)**: Die Skelett-Templates anchorn ihre "Bescheid vom …"-Phrase auf das **Erlassdatum** des Bescheids (Briefkopf-gestempelt), nicht auf das Brief-Empfangsdatum (App-Inbox-Eingangs-Timestamp). Diese beiden Daten weichen real um 1–7 Tage ab (Postlaufzeit, ELSTER-Bekanntgabe-Fiktion). V1.5.0-Templates ("Schreiben vom …") bleiben unberührt — sie meinen tatsächlich den eingehenden Brief, nicht einen Bescheid-Akt.
>
> **Token-Mapping** (für `src/lib/mock-backend/reply-templates.ts` Resolver-Erweiterung):
>
> | Token | Quelle | Resolver-Regel | Verwendung |
> |---|---|---|---|
> | `{absender_name}` | Persona | unverändert (V1.5.0) | beide Wellen |
> | `{absender_strasse}` | Persona | unverändert | beide |
> | `{absender_plz}` | Persona | unverändert | beide |
> | `{absender_ort}` | Persona | unverändert | beide |
> | `{empfaenger_behoerde}` | `behoerden.json` via `letter.absender_behoerde_id` | unverändert; Pre-Insertion-Modal-Hinweis bleibt verbindlich | beide |
> | `{empfaenger_strasse}` | `behoerden.json` | unverändert | beide |
> | `{empfaenger_plz}` | `behoerden.json` | unverändert | beide |
> | `{empfaenger_ort}` | `behoerden.json` | unverändert | beide |
> | `{ort}` | = `{absender_ort}` | unverändert | beide |
> | `{datum}` | `new Date()` formatDateDe | unverändert (heutiges Versand-Datum) | beide |
> | `{aktenzeichen}` | `letter.aktenzeichen` | unverändert; siehe § 6 für Norm-spezifische Erläuterung | beide |
> | `{datum_letter}` | `letter.empfangen_am` formatDateDe | **unverändert**; semantisch "Brief-Empfangs-Datum" | nur V1.5.0-Templates ("Schreiben vom …") |
> | `{datum_bescheid}` | **NEU** `letter.bescheid_dated_at ?? letter.empfangen_am` formatDateDe | **NEUE Resolver-Branch**; semantisch "Erlassdatum des Bescheids"; Fallback bei fehlendem Feld auf `empfangen_am` (graceful degradation) | nur V1.5.1-Skelett-Templates ("Bescheid vom …") |
>
> **Resolver-Hard-Rule (für mock-backend-coder)**: Die zwei Token-Branches müssen *getrennt* aufgelöst werden — nicht durch Wiederverwendung derselben Variable. Kommentar-Konvention im Resolver-Code:
> ```ts
> // {datum_letter}: Brief-Empfangsdatum (V1.5.0 — "Schreiben vom" usage).
> const datumLetter = formatDateDe(letter.empfangen_am);
> // {datum_bescheid}: Erlassdatum des Bescheids (V1.5.1 — "Bescheid vom" usage).
> // Fallback auf empfangen_am, falls bescheid_dated_at undefined (z. B. für
> // nicht-Bescheid-Letter, die das Skelett aber trotzdem rendern könnten).
> const datumBescheid = letter.bescheid_dated_at
>   ? formatDateDe(letter.bescheid_dated_at)
>   : datumLetter;
> ```
>
> **Schema-Impact**: `Letter.bescheid_dated_at?: string` wird zu `src/types/letter.ts` hinzugefügt (ISO-8601 YYYY-MM-DD-Datum, optional). mock-backend-coder pflegt das Feld in `src/data/letters.json` für die folgenden Bescheide (nicht-erschöpfende Liste, basiert auf Briefkopf-Realismus):
>
> | Letter-ID | Empfangs-Datum (`empfangen_am`) | Erlass-Datum (`bescheid_dated_at`, vorgeschlagen) | Begründung |
> |---|---|---|---|
> | `letter-fa-steuerbescheid-2025` | 2026-03-12 | 2026-03-09 | 3 Tage Postlauf, FA Berlin → Anna Berlin innerstädtisch |
> | `letter-schmidt-fa-steuerbescheid-2024` | 2026-05-13 | 2026-05-08 | 5 Tage Postlauf, FA Köln → Schmidt Köln (lokale Zustellung, ggf. Wochenende) |
> | `letter-mehmet-fa-steuerbescheid-2024` | 2026-05-08 | 2026-05-04 | 4 Tage `mein-elster`-Bekanntgabe-Fiktion (§ 122a Abs. 4 AO) |
> | `letter-mehmet-ihk-beitrag` | (per `letters.json`) | empfangen_am minus 3-5 Tage | Briefpost regulär |
> | `letter-mehmet-bgw-beitrag` | (per `letters.json`) | empfangen_am minus 3-5 Tage | Briefpost regulär |
> | `letter-mehmet-krankenkasse-freiwillig` | (per `letters.json`) | empfangen_am minus 2-4 Tage | KK-Versand |
> | `letter-mehmet-beitragsservice-mahnung` | (per `letters.json`) | empfangen_am minus 3-5 Tage | Briefpost Köln-Zentrale |
> | `letter-schmidt-krankenkasse-beitrag` | (per `letters.json`) | empfangen_am minus 2-4 Tage | KK-Versand |
> | `letter-schmidt-beitragsservice-festsetzung` | (per `letters.json`) | empfangen_am minus 3-5 Tage | Briefpost |
> | `letter-beitragsservice-festsetzung` | (per `letters.json`) | empfangen_am minus 3-5 Tage | Briefpost |
>
> Für nicht-Bescheid-Letter (Mitwirkungs-Aufforderungen wie `letter-schmidt-familienkasse-nachweis`, `letter-abh-erinnerung-verlaengerung`; Termin-Bestätigungen; Bewilligungs-Bescheide ohne anfechtbaren VA-Charakter wie `letter-aok-mitgliedsbescheinigung`) bleibt `bescheid_dated_at` `undefined`. Das ist konsistent mit § 5 Visibility-Matrix — diese Letter rendern keine Skelett-Templates.
>
> **mock-backend-coder Cross-Check-Pflicht**: Vor dem Setzen von `bescheid_dated_at` für einen Letter den `body_de`-String grep'en — falls darin bereits eine "Bescheid vom DD.MM.YYYY"- oder "Datum: …"-Zeile steht, muss `bescheid_dated_at` mit dem dort genannten Datum übereinstimmen. Ergebnis Seed-Audit (2026-05-09): kein V1.5.0-Seed-Letter trägt heute eine solche explizite Erlassdatum-Zeile im body_de — `bescheid_dated_at` wird also stand-alone gepflegt; eine Inkonsistenz-Quelle entsteht nicht.
>
> **i18n-Impact**: Die Token-Bezeichnung im Body-Template ändert sich für die drei Skelett-Templates von `{datum_letter}` (v1) auf `{datum_bescheid}` (v2). i18n-localizer muss die drei Templates entsprechend anpassen (5 Strings: §3.1 Betreff + §3.1 Body + §3.2 Betreff + §3.2 Body + §3.3 Body — alle "Bescheid vom"-Vorkommen).

### 3.1 `rechtsbehelf_einspruch_skelett`

```
{absender_name}
{absender_strasse}
{absender_plz} {absender_ort}

{empfaenger_behoerde}
{empfaenger_strasse}
{empfaenger_plz} {empfaenger_ort}

{ort}, {datum}

Aktenzeichen: {aktenzeichen}
Betreff: Einspruch gegen den Bescheid vom {datum_bescheid}

Sehr geehrte Damen und Herren,

hiermit lege ich gegen Ihren Bescheid vom {datum_bescheid} mit dem oben genannten Aktenzeichen Einspruch ein.

Mit freundlichen Grüßen,

{absender_name}
```

**Allowed placeholders**: `{absender_name}`, `{absender_strasse}`, `{absender_plz}`, `{absender_ort}`, `{empfaenger_behoerde}`, `{empfaenger_strasse}`, `{empfaenger_plz}`, `{empfaenger_ort}`, `{ort}`, `{datum}`, `{aktenzeichen}`, `{datum_bescheid}`. (12 placeholders — `{datum_bescheid}` ersetzt v1's `{datum_letter}` für alle drei Skelett-Templates; siehe § 3 Token-Mapping.)

**RDG-Cleanliness-Check**:
- Zero `§`-Symbole im Body ✓
- Keine Begründung, keine Argumentation ✓
- Genau **eine** administrative Phrase („Hiermit lege ich … Einspruch ein.") — Rumpf-Form. ✓
- **v2-Korrektur (Verifier AV11)**: der frühere Satz „Eine Begründung reiche ich gesondert nach." wurde gestrichen. Ein Einspruch ohne Begründung ist nach § 357 AO ausdrücklich wirksam — BFH II R 90/83, Urt. v. 27.11.1985 (BStBl II 1986, 243); zudem BFH III R 26/14, Urt. v. 13.05.2015 (Wirksamkeit auch bei einfacher E-Mail ohne Signatur, sofern Einspruchs-Führer:in und VA erkennbar sind). Die App pusht die Bürger:in damit nicht in eine selbst-bindende Folge-Pflicht (§ 364b AO Frist-Setzung; § 367 AO Entscheidung als unbegründet), die V1.5.1 weder trackt noch reminded. Wer freiwillig eine Begründung nachreichen möchte, kann das jederzeit per separatem Schreiben tun. ✓
- Verifier AV5 (Datum-Token-Semantik) ist durch Wechsel auf `{datum_bescheid}` adressiert. ✓

### 3.2 `rechtsbehelf_widerspruch_skelett`

```
{absender_name}
{absender_strasse}
{absender_plz} {absender_ort}

{empfaenger_behoerde}
{empfaenger_strasse}
{empfaenger_plz} {empfaenger_ort}

{ort}, {datum}

Aktenzeichen: {aktenzeichen}
Betreff: Widerspruch gegen den Bescheid vom {datum_bescheid}

Sehr geehrte Damen und Herren,

hiermit lege ich gegen Ihren Bescheid vom {datum_bescheid} mit dem oben genannten Aktenzeichen Widerspruch ein.

Mit freundlichen Grüßen,

{absender_name}
```

**Allowed placeholders**: identisch zu § 3.1 (12 placeholders, inkl. `{datum_bescheid}` statt v1's `{datum_letter}`).

**RDG-Cleanliness-Check**: identisch zu § 3.1.
- **v2-Korrektur (Verifier AV11)**: Selbst-Bindungs-Satz „Eine Begründung reiche ich gesondert nach." gestrichen. Der Widerspruch ist nach § 84 SGG / § 70 VwGO formal an die identischen Mindest-Angaben gebunden wie der Einspruch (§ 357 AO); ein Widerspruch ohne Begründung ist wirksam. Die SGG-/VwGO-Rumpf-Linie folgt der BFH-Rspr. (BFH II R 90/83, BStBl II 1986, 243) analog — die SGG-Praxis und VwGO-Lehrbuchsystematik akzeptieren eine begründungslose Widerspruchs-Einlegung gleichermaßen, eine spätere Begründungs-Aufforderung nach § 357 AO-Analogie ist Behörden-Standard.
- **v2-Korrektur (Verifier AV5)**: `{datum_bescheid}` ersetzt `{datum_letter}` für die "Bescheid vom"-Phrase. ✓

### 3.3 `aussetzung_vollziehung_skelett`

```
{absender_name}
{absender_strasse}
{absender_plz} {absender_ort}

{empfaenger_behoerde}
{empfaenger_strasse}
{empfaenger_plz} {empfaenger_ort}

{ort}, {datum}

Aktenzeichen: {aktenzeichen}
Betreff: Antrag auf Aussetzung der Vollziehung

Sehr geehrte Damen und Herren,

hiermit beantrage ich die Aussetzung der Vollziehung des oben genannten Bescheids vom {datum_bescheid} bis zur Entscheidung über meinen Einspruch.

Mit freundlichen Grüßen,

{absender_name}
```

**Allowed placeholders**: identisch zu § 3.1 (12 placeholders, inkl. `{datum_bescheid}` statt v1's `{datum_letter}`).

**RDG-Cleanliness-Check**:
- Zero `§`-Symbole im Body ✓
- Eine administrative Phrase, ohne Begründungs-Vorschlag ✓
- Bürger:in muss separat einen Einspruch eingelegt haben — *die App weist darauf im Pre-Insertion-Modal hin* (§ 2.4), aber das Skelett selbst enthält keine Bewertung der Aussetzungs-Voraussetzungen (ernstliche Zweifel / unbillige Härte). Skelett-Charakter gewahrt. ✓
- **v2-Korrektur (Verifier AV5)**: `{datum_bescheid}` ersetzt `{datum_letter}` für die "Bescheids vom"-Phrase. ✓
- **Visibility-Constraint** (siehe § 5): Template wird *nur* angezeigt, wenn `letter.archetype === 'steuerbescheid'` **und** `letter.fristen[]` einen `typ === 'einspruch'` enthält **und** `letter.fristen[]` einen `typ === 'zahlung'` enthält (Verifier-AV3-locked Triple-AND). Damit ist sichergestellt, dass die Bürger:in das Aussetzungs-Skelett nicht versehentlich für einen sozialrechtlichen Bescheid wählt (wo „Anordnung der aufschiebenden Wirkung" das richtige Institut wäre, § 86a SGG); nicht für einen Erstattungs-Bescheid, der nichts auszusetzen hat; und nicht für einen Bescheid ohne Einspruch-Frist (was unter § 347 AO ohnehin nicht existiert).

---

## 4. Disclaimer-Strings (verbatim DE)

> **Surface** (für frontend-coder): zwei Disclaimer-Slots pro Skelett-Template, identisch zur V1.5.0-Konvention:
> - `disclaimer_pre_insertion`: gerendert *innerhalb* des Pre-Insertion-Modals unterhalb des Adressat-Hinweises (in einer separaten `<p>`, kleinere Schriftgröße `text-muted-foreground`).
> - `disclaimer_inline`: gerendert *unter* der `<textarea>` während der Bearbeitung, eine Zeile, klein.

### 4.1 `rechtsbehelf_einspruch_skelett` und `rechtsbehelf_widerspruch_skelett`

**`disclaimer_pre_insertion`** (`posteingang.compose.templates.rechtsbehelf_einspruch_skelett.disclaimer_pre_insertion` bzw. `…widerspruch_skelett…`, verbatim, identisch für beide Skelett-Templates):

> Diese Vorlage enthält nur die Pflicht-Angaben (Datum, Aktenzeichen, Empfänger und die Erklärung des Rechtsbehelfs). Eine **Begründung schreiben Sie selbst** — die App schlägt keine Argumente vor, weil die Bewertung Ihres Einzelfalls eine Rechtsdienstleistung im Sinne des § 2 RDG ist und nur durch Anwält:innen, registrierte Personen, Verbraucherzentralen oder Sozialverbände erfolgen darf.

**`disclaimer_inline`** (eine Zeile):

> Hinweis: Die Begründung schreiben Sie selbst — die App generiert sie nicht.

### 4.2 SGG-spezifischer Zusatz (nur bei `rechtsbehelf_widerspruch_skelett` + Norm-Familie SGG)

**`disclaimer_pre_insertion_zusatz_sgg`** (zusätzlich, gerendert *unter* dem Standard-Pre-Insertion-Disclaimer, nur für `archetype ∈ {krankenkasse-beitrag, berufsgenossenschaft-beitrag}`):

> Bei einem Bescheid einer Sozialversicherung ist der **Widerspruch** der richtige Rechtsbehelf — nicht der Einspruch (§ 84 SGG). Beachten Sie außerdem: Beiträge bleiben trotz Widerspruch fällig (§ 86a Abs. 2 Nr. 1 SGG).

### 4.3 VwGO-spezifischer Zusatz (nur bei `rechtsbehelf_widerspruch_skelett` + Norm-Familie VwGO und nur bei `archetype === 'ihk-beitrag' OR 'beitragsservice-mahnung'`)

**`disclaimer_pre_insertion_zusatz_vwgo`** (zusätzlich, nur für die genannten Archetypes):

> Beachten Sie: Auch ein Widerspruch hat in Beitrags-Sachen keine aufschiebende Wirkung (§ 80 Abs. 2 Nr. 1 VwGO) — die Forderung bleibt trotz Widerspruch fällig.

> **Hinweis zu `abh-verlaengerung`**: kein eigener Zusatz, weil der föderale Flickenteppich (siehe § 9.B) bereits im Adressat-Modal § 2.3 angerissen wird. Ein zweiter Zusatz würde die Bürger:in überfordern; der Modal-Hinweis ist ausreichend.

### 4.4 `aussetzung_vollziehung_skelett`

**`disclaimer_pre_insertion`**:

> Die Aussetzung wird **nicht automatisch** gewährt — die Behörde prüft jeden Antrag eigenständig (§ 361 Abs. 2 AO). Säumniszuschläge nach § 240 AO entstehen weiter, solange die Aussetzung nicht bewilligt ist. Diese Vorlage setzt voraus, dass Sie bereits einen Einspruch eingelegt haben oder gleichzeitig einlegen.

**`disclaimer_inline`**:

> Hinweis: Aussetzung wird nicht automatisch gewährt — Säumniszuschläge entstehen weiter, bis die Behörde entschieden hat.

### 4.5 Cross-template guard-rail (für ReplySheet-Footer, *unter* dem Disclaimer-Inline)

**`posteingang.compose.skelett_footer_no_legal_advice`** (verbatim, gerendert für *alle drei* Skelett-Templates im ReplySheet-Footer):

> Erfolgsaussichten Ihres Rechtsbehelfs lassen Sie bitte von einer Verbraucherzentrale, einem Sozialverband oder einer Anwält:in prüfen — die App liefert dazu keine Bewertung.

---

## 5. Template-Visibility-Matrix (welche Templates erscheinen wann im ReplySheet-Picker?)

> **Implementierung** (für mock-backend-coder): die existierende `getReplyTemplateOptions(letter)`-Funktion (V1.5.0) wird um drei neue Branches erweitert. Auswahl-Logik ist Tabelle-driven, nicht Code-mit-if-Kaskaden.
>
> **Lese-Konvention**: ✓ = Template wird angezeigt; — = nicht angezeigt; (default) = Template ist im Picker als pre-selected markiert.

| Archetype | `frist[].typ` | Norm-Familie | `frist_verlaengerung` | `nachweis_einreichen` | `informative_rueckmeldung` | `termin_antwort` | `freitext` | `rechtsbehelf_einspruch_skelett` | `rechtsbehelf_widerspruch_skelett` | `aussetzung_vollziehung_skelett` |
|---|---|---|---|---|---|---|---|---|---|---|
| `steuerbescheid` | `einspruch` only | AO | ✓ | — | ✓ | — | ✓ | ✓ | — | — |
| `steuerbescheid` | `einspruch + zahlung` | AO | ✓ | — | ✓ | — | ✓ | ✓ | — | ✓ |
| `steuerbescheid` | `zahlung` only | AO | ✓ | — | ✓ | — | ✓ | — | — | — |
| `familienkasse-nachweis` (Mitwirkungs-Aufforderung) | `nachweis` | — | ✓ | ✓ (default) | ✓ | — | ✓ | — | — | — |
| `familienkasse-nachweis` (Aufhebungs-/Ablehnungsbescheid) — V2 | `einspruch` | AO | ✓ | — | ✓ | — | ✓ | ✓ | — | — |
| `krankenkasse-beitrag` | `widerspruch` | SGG | ✓ | — | ✓ | — | ✓ | — | ✓ | — |
| `krankenkasse-beitrag` (ohne Frist, z. B. Mitgliedsbescheinigung) | — | SGG | — | — | ✓ | — | ✓ | — | — | — |
| `berufsgenossenschaft-beitrag` | `widerspruch` (+ ggf. `zahlung`) | SGG | ✓ | — | ✓ | — | ✓ | — | ✓ | — |
| `ihk-beitrag` | `widerspruch` | VwGO | ✓ | — | ✓ | — | ✓ | — | ✓ | — |
| `beitragsservice-mahnung` | `widerspruch` | VwGO | ✓ | ✓ (Befreiung-Nachweis) | ✓ | — | ✓ | — | ✓ | — |
| `abh-verlaengerung` | `nachweis` (Mitwirkungs-Erinnerung) | — | ✓ | ✓ (default) | ✓ | — | ✓ | — | — | — |
| `abh-verlaengerung` (Ablehnungs-Bescheid) — V2 | `widerspruch / klage` | VwGO | — | — | ✓ | — | ✓ | — | ✓ (Bayern-Caveat im Modal) | — |
| `standesamt-urkunde` (Termin-Vorschlag) | `antragstellung` | — | — | — | ✓ | ✓ (default) | ✓ | — | — | — |
| `standesamt-urkunde` (Urkunden-Übersendung) | — | — | — | — | ✓ | — | ✓ | — | — | — |
| `buergeramt-meldung` | — | — | — | — | ✓ | — | ✓ | — | — | — |
| `sonstiges` (z. B. Bundesdruckerei-Versandbestätigung) | — | — | — | — | ✓ | — | ✓ | — | — | — |

> **Visibility-Hard-Rules** (verifier-relevant; v2 affirmative-allow per Verifier AV10):
>
> **Master-Predicate (positive-allow)**: Skelett-Templates erscheinen *nur*, wenn `letter.fristen[]` mindestens einen Eintrag mit `typ ∈ {'einspruch', 'widerspruch'}` enthält. Alle anderen Briefe (Mitwirkungs-Aufforderungen mit `'nachweis'` / `'antragstellung'` / `'termin_buchen'` / `'zahlung'`-only / Bestätigungen ohne Frist) erhalten **keine** Skelett-Templates im Picker — affirmative deny by absence-of-allow.
>
> 1. `aussetzung_vollziehung_skelett` ist **nur sichtbar**, wenn (a) `archetype === 'steuerbescheid'` *und* (b) `letter.fristen[]` enthält `typ === 'einspruch'` *und* (c) `letter.fristen[]` enthält *zusätzlich* `typ === 'zahlung'` (sonst gibt es nichts auszusetzen). Alle drei Bedingungen kumulativ. Demo-Anker: `letter-schmidt-fa-steuerbescheid-2024` (Schmidt, Nachzahlung 1.247 €), `letter-mehmet-fa-steuerbescheid-2024` (Mehmet, Nachzahlung 4.812 €).
> 2. `rechtsbehelf_einspruch_skelett` und `rechtsbehelf_widerspruch_skelett` sind **mutually exclusive** pro Archetype — niemals beide gleichzeitig im Picker. Die Norm-Familie aus § 1 ist die deterministische Auswahl: AO-Familie → Einspruch; SGG-/VwGO-Familie → Widerspruch.
> 3. **Master-Predicate-Konsequenz**: bei `familienkasse-nachweis` mit `frist.typ === 'nachweis'` (Mitwirkungs-Aufforderung) — kein `'einspruch'`/`'widerspruch'`-Frist-Eintrag — werden Skelett-Templates **nicht angezeigt**. Der richtige Pfad ist `nachweis_einreichen` (V1.5.0). Bürger:in nimmt der Mitwirkungs-Pflicht nach (§ 60 SGB I für SGB-Behörden bzw. § 90 AO für Steuerbehörden), legt keinen Rechtsbehelf ein (es gibt nichts anzufechten — der Brief ist eine Aufforderung, kein Bescheid).
> 4. **Master-Predicate-Konsequenz**: bei `abh-verlaengerung` mit `frist.typ ∈ {'nachweis', 'antragstellung'}` (Verlängerungs-Erinnerung) wird **kein** Skelett-Template angezeigt — analog Familienkasse-Nachweis. Mitwirkung nach § 82 AufenthG. (Erst ein zukünftiger ABH-Ablehnungsbescheid mit `frist.typ === 'widerspruch'`/`'klage'` erhielte ein Widerspruch-Skelett — siehe § 9.B V2-Hook.)
> 5. **Master-Predicate-Konsequenz**: Niemals Skelett-Templates für Bestätigungs-/Bewilligungs-Briefe (`familienkasse-bewilligung`, `buergeramt-meldung`, `standesamt-urkunde`-Urkunde, `bundesdruckerei`-Versand, `letter-aok-mitgliedsbescheinigung`). Diese tragen entweder keine `fristen[]` oder nur informationelle Fristen ohne `'einspruch'`/`'widerspruch'`-Charakter — Master-Predicate hält sie automatisch raus, kein einzelner Deny-Branch nötig.
> 6. **Familienkasse-AO-Erklärer-Trigger** (Verifier AV1, neu in v2): wenn `archetype === 'familienkasse-nachweis'` *und* `letter.fristen[]` enthält `typ === 'einspruch'` (= Aufhebungs-/Ablehnungsbescheid, V2-Mock-Letter-Variante; nicht in V1.5.1-Mock-Daten ausgeliefert), zeigt das Pre-Insertion-Modal § 2.1 *zusätzlich* zum Standard-AO-Body den verbindlichen Familienkasse-Zusatz-Satz aus § 2.1 (`einspruch_ao_familienkasse_zusatz`). Verbindlich, nicht optional. Spec-Anweisung an product-architect: Norm-Familie-Lookup gibt nicht nur den Modal-Body-Key zurück, sondern auch ein optional `additional_explainer_key`-Feld pro Archetype.

---

## 6. Aktenzeichen- und Adressat-Resolution per Norm-Familie

> **Implementierung** (für mock-backend-coder): der existierende `resolveReplyBodySync(...)`-Resolver löst `{aktenzeichen}` aus `letter.aktenzeichen` und `{empfaenger_behoerde / empfaenger_strasse / empfaenger_plz / empfaenger_ort}` aus `letter.absender_behoerde_id → behoerden.json`. Diese Logik bleibt **unverändert** — alle vier Norm-Familien lösen das `{aktenzeichen}` und die Empfänger-Anschrift aus dem Briefkopf. Die Adressat-Risiko-Heuristik liegt **ausschließlich** im Pre-Insertion-Modal (§ 2), nicht im Resolver.

| Norm-Familie | Was wird `{aktenzeichen}` (im Body)? | Was wird `{empfaenger_behoerde}` (im Body + Modal)? | Risiko |
|---|---|---|---|
| AO (Einspruch) | Steuernummer aus dem Briefkopf des Bescheids (`letter.aktenzeichen`, primär). Bei Familienkasse-Bescheid: Kindergeld-Nummer (auch in `letter.aktenzeichen`). | Erlassende Finanzbehörde (Briefkopf), exakt wie auf dem Bescheid abgedruckt. | Niedrig: § 357 Abs. 2 Satz 4 AO heilt fehlgeleiteten Einspruch, sofern fristgerechte Weiterleitung. |
| SGG (Sozial-Widerspruch) | Versicherungsnummer + Bescheid-Nummer aus Briefkopf (`letter.aktenzeichen`). | Erlassende Sozialversicherung (Krankenkasse / BG), Briefkopf-Adresse. | Niedrig: § 84 Abs. 2 Satz 2 SGG verlangt Weiterleitungspflicht durch andere inländische Behörden. |
| VwGO (Allgemein-Widerspruch) | Aktenzeichen aus Briefkopf. | Erlassende Behörde (IHK / Beitragsservice / ABH), Briefkopf-Adresse. **Kein** Auto-Vorschlag der übergeordneten Aufsichtsbehörde — Hard-Line. | Mittel: föderaler Flickenteppich; Bayern hat in vielen Sachgebieten Widerspruchsverfahren abgeschafft. Modal-Hinweis (§ 2.3) ist Pflicht. |
| OWiG (Bußgeld-Einspruch) — V2 | Aktenzeichen aus Briefkopf des Bußgeldbescheids. | Erlassende Verwaltungsbehörde (Polizei-Bußgeldstelle, Stadt). | Mittel: § 67 OWiG kennt keine Heilungsregel; falsche Adressat-Wahl kann die 2-Wochen-Frist verfehlen. |

> **Hard-Line gegen Adressat-Auto-Heuristik**: Wir schlagen *niemals* eine andere Adresse als die Briefkopf-Adresse vor — auch wenn aus § 357 Abs. 2 Satz 1 Halbsatz 2 AO ableitbar wäre, dass z. B. für die Anfechtung von Steuerbescheiden auch die für die Erteilung des Steuerbescheids zuständige Behörde alternativ-zulässig ist. Die App ist Werkzeug, nicht Berater — die Auswahl der korrekten Adressat-Behörde ist Bürger:innen-Verantwortung. Das Modal (§ 2) macht das durch den Verifizierungs-Aufruf sichtbar.

---

## 7. Frist-Cited-Format (ReplySheet-Header, verbatim)

> **Surface**: Im ReplySheet, *oberhalb* des Template-Pickers, ein einzeiliger Frist-Hinweis im Stil der V1.5.0-`<FristCountdown>`-Komponente. Quell-Norm wird in **fett** angezeigt; Frist-Datum stammt aus `letter.fristen[].datum`.

Verbatim-Strings (i18n-keys unter `posteingang.compose.frist_cited_format.<norm>`):

### 7.1 AO-Einspruch (`steuerbescheid`, `familienkasse-nachweis`-Bescheid)

> Sie haben **1 Monat** ab Bekanntgabe des Bescheids Zeit, um Einspruch einzulegen — **§ 355 Abs. 1 AO**. Die Frist endet am {frist_datum}.

### 7.2 SGG-Widerspruch (`krankenkasse-beitrag`, `berufsgenossenschaft-beitrag`)

> Sie haben **1 Monat** ab Bekanntgabe des Bescheids Zeit, um Widerspruch einzulegen — **§ 84 Abs. 1 SGG**. Die Frist endet am {frist_datum}.

### 7.3 VwGO-Widerspruch (`ihk-beitrag`, `beitragsservice-mahnung`, `abh-verlaengerung`-Bescheid)

> Sie haben **1 Monat** ab Bekanntgabe des Bescheids Zeit, um Widerspruch einzulegen — **§ 70 Abs. 1 Satz 1 VwGO**. Die Frist endet am {frist_datum}.

### 7.4 OWiG-Einspruch (`bussgeldbescheid`) — V2-Hook

> Sie haben **2 Wochen** ab Zustellung des Bußgeldbescheids Zeit, um Einspruch einzulegen — **§ 67 Abs. 1 Satz 1 OWiG**. Die Frist endet am {frist_datum}.

### 7.5 AO-Aussetzung (`aussetzung_vollziehung_skelett`)

> Eine Aussetzung der Vollziehung können Sie jederzeit beantragen, solange das Einspruchsverfahren läuft — **§ 361 Abs. 2 AO**. Eine eigene Frist gibt es nicht, eine schnelle Antragstellung ist aber wichtig, weil Säumniszuschläge nach § 240 AO weiter entstehen.

> **Token**: `{frist_datum}` wird vom Resolver aus `letter.fristen[]` aufgelöst (erste passende Frist nach `typ`-Lookup; Fallback leerer String, dann wird der ganze Satz „Die Frist endet am …" weggelassen). UI-Implementierung: Conditional-Render via i18n-Plural-Mechanik oder zwei separate Keys; mock-backend-coder entscheidet.

---

## 8. § 122a AO Bekanntgabe-Fiktion-Caveat (`auth_channel === 'mein-elster'`)

> **Hintergrund**: Bei elektronisch via ELSTER (oder „Mein Postfach") bekanntgegebenen Bescheiden gilt der **4. Tag nach Bereitstellung** als Bekanntgabe-Fiktion (§ 122a Abs. 4 AO). Das verschiebt die Frist-Berechnung gegenüber Briefpost-Bescheiden — die Bürger:in muss das wissen, weil der Frist-Counter im Posteingang sonst falsch wirkt.

**Verbatim-Hinweis-String** (`posteingang.compose.frist_cited_format.bekanntgabe_fiktion_elster`, gerendert *unter* dem Frist-Cited-Format aus § 7, *nur* wenn `letter.auth_channel === 'mein-elster'`):

> Hinweis: Dieser Bescheid wurde elektronisch über Mein ELSTER bereitgestellt. Als Bekanntgabe-Datum gilt der **vierte Tag** nach Bereitstellung (§ 122a Abs. 4 AO). Die Frist endet entsprechend vier Tage später als bei einer Briefpost-Bekanntgabe.

> **Mock-Daten-Konsequenz** (für mock-backend-coder): bei `auth_channel === 'mein-elster'` muss die Frist-Berechnung in `letters.json` bereits den 4. Tag berücksichtigen — andernfalls sieht die Bürger:in widersprüchliche Daten (Frist-Hinweis sagt „4 Tage später", aber das `letter.fristen[].datum` ist anders gerechnet). Demo-Letters mit `auth_channel === 'mein-elster'`: `letter-fa-steuerbescheid-2025` (Anna), `letter-schmidt-fa-steuerbescheid-2024` (Schmidt), `letter-mehmet-fa-steuerbescheid-2024` (Mehmet). Bei der Seed-Erweiterung in V1.5.1 ist sicherzustellen, dass die Datums-Differenz konsistent ist.
>
> **Prüf-Pfad**: in V1.5.0 sind die drei oben genannten Briefe mit `auth_channel: 'mein-elster'` markiert. Frist-Datum heute z. B. „2026-04-12" für `letter-fa-steuerbescheid-2025` — wir sagen *nicht*, dass die Frist „2026-04-08" sei (Briefpost-Annahme + 4-Tage-Bekanntgabe-Fiktion = identische Endfrist, weil das Datum in den Mock-Daten bereits das tatsächliche Frist-Ende ist). Caveat: das ist die Domain-Linie, mock-backend-coder erbt sie.

---

## 9. Edge cases — wann Skelett-Templates *nicht* angeboten werden

### 9.A Mitwirkungsaufforderung (§ 60 SGB I, § 90 AO, § 82 AufenthG) — kein Rechtsbehelf

Wenn die Behörde *keinen Bescheid* erlässt, sondern eine **Mitwirkungs-Aufforderung** schickt (z. B. „Bitte reichen Sie die Schulbescheinigung bis 15.06.2026 ein"), gibt es **nichts anzufechten**. Der Bescheid kommt erst, wenn die Mitwirkung verweigert oder nicht fristgerecht geleistet wird (Aufhebungs-/Ablehnungsbescheid).

**Hard-Rule**: bei `letter.fristen[].typ === 'nachweis'` *ohne* zusätzlichen `'einspruch'` oder `'widerspruch'` werden Skelett-Templates **nicht angezeigt**. Demo-Anker:
- `letter-schmidt-familienkasse-nachweis` (Mitwirkungs-Aufforderung) → kein Skelett.
- `letter-abh-erinnerung-verlaengerung` (Verlängerungs-Erinnerung) → kein Skelett.

Verbatim-Hinweis im ReplySheet-Footer (für genau diese Fall-Konfiguration; *nicht* generell):

**`posteingang.compose.skelett_visibility_explainer.kein_rechtsbehelf_bei_mitwirkung`**:

> Hinweis: Dieser Brief ist eine Mitwirkungs-Aufforderung, kein Bescheid. Sie können hier (noch) keinen Rechtsbehelf einlegen — bitte reichen Sie den angeforderten Nachweis ein oder bitten Sie um Fristverlängerung.

### 9.B `abh-verlaengerung`-Ablehnungsbescheid: Föderalismus-Delta zwischen Bundesländern

> **Realität**: § 70 VwGO setzt Widerspruchsverfahren grundsätzlich voraus, *aber* die Bundesländer können in Spezialgesetzen (z. B. Landes-AGVwGO) das Vorverfahren abschaffen. Berlin: Widerspruchsverfahren in Aufenthaltsrechtssachen *grundsätzlich erhalten* (§ 68 VwGO + Landesrecht greift). Bayern: Widerspruchsverfahren in den meisten Sachgebieten **abgeschafft** (Art. 12 BayAGVwGO i. V. m. Spezialgesetzen) — Bürger:in muss direkt Anfechtungsklage erheben. NRW, Niedersachsen: ähnlich differenziert.

**Demo-Empfehlung**: V1.5.1-Mock-Daten-Set enthält bisher *keinen* ABH-Ablehnungsbescheid (nur die Verlängerungs-Erinnerung `letter-abh-erinnerung-verlaengerung`, die Mitwirkungs-Pflicht ist und keinen Rechtsbehelf trägt). **Konsequenz**: V1.5.1 muss das Bayern-Delta **nicht aktiv handhaben** — der einzige sichtbare Hinweis bleibt das Pre-Insertion-Modal § 2.3, das den Föderalismus-Caveat verbatim trägt.

V2-Hook: Wenn ein ABH-Ablehnungsbescheid als Mock-Letter ergänzt wird (z. B. für Mehmet, der in Hamburg wohnt → Hamburg hat Widerspruchsverfahren grundsätzlich erhalten), muss die Persona-PLZ in die Norm-Familien-Auswahl-Logik einfließen. Konkret: pro Persona-PLZ den Land-Code ableiten, daraus eine 16-Bundesländer-Lookup-Tabelle „Widerspruchsverfahren in ABH-Sachen statthaft (ja/nein/teilweise)". Hard-Line für V2: bei „nein" → Widerspruch-Skelett **ausblenden**, ersetzen durch separates `klage_skelett`-Template (das wäre RDG-Risiko-Mehrfeld und braucht eigene Domain-Verifikation).

**V1.5.1-Decision**: das Pre-Insertion-Modal § 2.3 trägt den Hinweis verbatim. Bürger:in muss selbst prüfen. Damit ist die Demo nicht irreführend, aber auch nicht überpräzise.

### 9.C Beitragsservice-Mahnung: kein Rechtsbehelf gegen reine Mahnung

Eine Mahnung des Beitragsservice (z. B. `letter-mehmet-beitragsservice-mahnung`, `letter-schmidt-beitragsservice-festsetzung`) kann *zwei Charaktere* haben:
- **Festsetzungs-Bescheid** (mit Rechtsbehelfsbelehrung) → `frist.typ === 'widerspruch'` → Skelett anbieten.
- **Reine Zahlungs-Mahnung** ohne neue Festsetzung (Wiederholungs-Aufforderung) → kein eigenständiger VA → **kein** Rechtsbehelf-Skelett.

Die Mock-Daten-Set heute: alle drei Beitragsservice-Letters haben `frist.typ === 'widerspruch'` → es sind Festsetzungs-Bescheide, Skelett wird angeboten. **Keine** UI-Differenzierung in V1.5.1 nötig; die Letter-Daten unterscheiden bereits korrekt.

### 9.D Krankenkasse-Brief ohne Frist (Mitgliedsbescheinigung, Zuzahlungsübersicht)

`letter-aok-mitgliedsbescheinigung` und `letter-aok-rechnung-zuzahlung` sind **keine Bescheide**, sondern Bestätigungs-/Informations-Schreiben. Kein Rechtsbehelf, kein Skelett. Visibility-Matrix § 5 trägt das bereits („`krankenkasse-beitrag` (ohne Frist) → kein Skelett-Template").

### 9.E Doppelte Frist-Typen (Steuerbescheid mit `einspruch + zahlung`)

Bei `letter-schmidt-fa-steuerbescheid-2024` und `letter-mehmet-fa-steuerbescheid-2024` enthält `letter.fristen[]` *zwei* Einträge: `typ: 'zahlung'` und `typ: 'einspruch'`. Visibility-Matrix § 5 zeigt die Auflösung: **alle drei** Pfade sind sichtbar (`frist_verlaengerung` für die Zahlungs-Frist, `rechtsbehelf_einspruch_skelett` für die Einspruchs-Frist, `aussetzung_vollziehung_skelett` als Brücke zwischen beiden).

Bei der Auswahl von `aussetzung_vollziehung_skelett` muss die Bürger:in im Pre-Insertion-Modal § 2.4 lesen, dass die Aussetzung „setzt voraus, dass Sie bereits einen Einspruch eingelegt haben oder gleichzeitig einlegen". Demo-Erzählung: das ist genau der Mehmet-/Schmidt-Demo-Flow — Einspruch + AdV in einem Atemzug.

### 9.F Frist verstrichen — Skelett trotzdem anbieten?

**Hard-Rule (Domain-locked)**: ja, anbieten. Begründung:
1. Eine verspätete Einlegung ist nicht *unwirksam*, sie wird nur als unzulässig zurückgewiesen — die App weiß nicht, ob die Bürger:in eine Wiedereinsetzung in den vorigen Stand (§ 110 AO / § 32 VwVfG) anstrebt.
2. Bei fehlerhafter oder fehlender Rechtsbehelfsbelehrung verlängert sich die Frist auf **ein Jahr** (§ 356 Abs. 2 AO; § 70 Abs. 2 i. V. m. § 58 Abs. 2 VwGO; analog SGG) — die App kann das nicht prüfen.
3. Hindern wäre paternalistisch.

**UI-Konsequenz**: bei Frist-Status `frist_abgelaufen` zeigt die ReplySheet einen zusätzlichen Hinweis im Header:

**`posteingang.compose.frist_abgelaufen_warnung`** (verbatim, gerendert oberhalb von § 7):

> Die im Bescheid genannte Frist ist nach unseren Daten am {frist_datum} abgelaufen. Eine verspätete Einlegung ist möglich, wird aber regelmäßig als unzulässig zurückgewiesen — es sei denn, die Rechtsbehelfsbelehrung war fehlerhaft (dann gilt eine Jahres-Frist) oder die Voraussetzungen für Wiedereinsetzung in den vorigen Stand sind erfüllt. Bitte lassen Sie sich vor der Einlegung von einer Verbraucherzentrale, einem Sozialverband oder einer Anwält:in beraten.

---

## 10. Recommended next agent + open questions

### 10.A Direct hand-off recommendation

**Next agent**: **concept-verifier** (adversarial second opinion before product-architect kicks off the spec).

**Specific attack vectors für concept-verifier zu prüfen**:

1. **SGG-vs-VwGO-Mapping für `abh-verlaengerung`**: Ist der Norm-Familien-Cluster (VwGO für ABH) realistisch genug? Der föderale Flickenteppich (Bayern keine Vorverfahren, Berlin/Hamburg ja) ist im Modal § 2.3 verbatim vermerkt — ist das Demo-tauglich oder müssen wir die Norm-Familien-Auswahl persona-PLZ-abhängig machen? Domain-Empfehlung: V1.5.1 keine PLZ-Logik (siehe § 9.B); concept-verifier soll prüfen, ob der Modal-Hinweis als Disclaimer ausreicht.

2. **Familienkasse → Einspruch nach § 347 AO (statt Widerspruch nach SGG)**: nicht offensichtlich für Bürger:innen, weil Familienkasse eine SGB-affine Behörde ist (BA = Bundesagentur für Arbeit, im Übrigen für Bürgergeld nach SGB II zuständig). Der Demo zeigt das *richtig* (AO statt SGG), aber concept-verifier soll prüfen, ob das Reise-Erlebnis in der Demo verständlich ist. Empfehlung: bei `archetype === 'familienkasse-nachweis'` *zusätzlich* zum Standard-Einspruchs-Disclaimer einen einzeiligen Erklärer rendern: „Hinweis: Kindergeld-Bescheide werden nach den Regeln der Abgabenordnung (AO) angefochten — nicht nach dem Sozialgerichtsgesetz." (§ 31 EStG i. V. m. § 67 EStG: Kindergeld als Steuervergütung).

3. **Aussetzungs-Skelett-Visibility-Logik (§ 5 Hard-Rule 1)**: ist die Drei-Bedingungen-AND (`steuerbescheid` + `einspruch`-Frist + `zahlung`-Frist) zu eng oder zu weit? Concept-verifier soll prüfen, ob z. B. ein Steuerbescheid mit nur Einspruchs-Frist (ohne Zahlung) das Aussetzungs-Skelett verdient. Domain-Position: nein — wenn keine Zahlung anfällt, ist Aussetzung sinnlos. Demo zeigt das im Zahlungs-Druck-Fall.

4. **§ 122a-AO-Caveat-Visibility**: Wird der Bekanntgabe-Fiktion-Hinweis (§ 8) den Frist-Counter für die Bürger:in inkonsistent erscheinen lassen? Concept-verifier soll auf Mobile-Layout-Edge-Cases prüfen (Hinweis fügt eine zweite Zeile zum ReplySheet-Header hinzu — Sticky-CTA-Sichtbarkeit?).

5. **OWiG-Familie als V2-Hook nicht ausgeliefert**: ist das ein Loom-Demo-Loch (kein Bußgeldbescheid-Demo)? Domain-Empfehlung: ja, aber V2 — V1.5.1-Scope ist auf bestehende 18 Mock-Letters begrenzt, kein neuer Mock-Letter.

### 10.B Open questions (no domain confidence)

- **Beitragsservice-Hinweis im Modal**: Beitragsservice ist verwaltungstechnische Anlaufstelle für die Landesrundfunkanstalt. Domain hat das in § 1 Tabelle so vermerkt — wenn die Bürger:in den Widerspruch direkt an „Rundfunk Berlin-Brandenburg, Anstalt des öffentlichen Rechts" schickt, müsste das auch zulässig sein. Aber: die Briefkopf-Adresse ist Beitragsservice Köln. Für die Demo bleibt der Briefkopf der Adressat — aber concept-verifier sollte das prüfen. **Domain-confidence: medium**.

- **§ 86a SGG „Anordnung der aufschiebenden Wirkung" als V2-Hook**: ist das in V2 als separates Skelett-Template gewünscht? Domain hat das in V1.5.1 explizit OUT gestellt (siehe § 1 letztes Kommentar-Bullet). Bei V2-Erweiterung wäre eine zweite Domain-Lock-Runde erforderlich.

- **Adressat-Auto-Heuristik für AO-Familie (§ 357 Abs. 2 Satz 1 Halbsatz 2 AO — alternative zuständige Behörde)**: Domain-Hard-Line ist „nein, niemals Auto-Vorschlag". Concept-verifier kann das herausfordern — aber Domain-Empfehlung bleibt: Werkzeug-Charakter wahren, Bürger:in entscheidet.

### 10.C Follow-on bei product-architect (nach concept-verifier-Sign-off)

product-architect-Inputs (v2):
1. Spec § 6 (Reply-Schema): `ReplyTemplateId`-Union erweitern um drei neue Werte (`rechtsbehelf_einspruch_skelett`, `rechtsbehelf_widerspruch_skelett`, `aussetzung_vollziehung_skelett`).
2. Spec § 4.x (ReplySheet): neuer `<PreInsertionModal>`-Slot wird mit Body gefüllt; Modal-Body-Auswahl per Norm-Familie-Lookup (siehe § 5). Lookup-Funktion gibt zurück: `{ modal_body_key, additional_explainer_key? }` — letzteres für Familienkasse-Sonder-Erklärer (§ 2.1, v2-neu).
3. Spec § 6 (`getReplyTemplateOptions(letter)`): Visibility-Matrix § 5 als Code-Anker; **Master-Predicate ist positive-allow** (`typ ∈ {einspruch, widerspruch}`).
4. Spec § 6.x (Schema): `Letter.bescheid_dated_at?: string` (ISO-8601, optional) wird zu `src/types/letter.ts` hinzugefügt; `replyTemplateResolver` erhält neue `datumBescheid`-Branch (siehe § 3 Resolver-Hard-Rule).
5. Spec § 8.x (i18n-Keys, v2-Zähler): 3 neue Body-Templates + 4 Pre-Insertion-Modal-Strings + **1 konditionaler Familienkasse-Zusatz-String (v2-neu)** + 4 Frist-Cited-Format-Strings + 1 Bekanntgabe-Fiktion-String + 4 Disclaimer-Strings (pro Skelett-Template Pre-Insertion + Inline) + 2 Norm-Familien-Zusätze (SGG + VwGO) + 1 Footer-Cross-Template-String + 1 Visibility-Explainer + 1 Frist-abgelaufen-Warnung. **Zähler v2: 18 neue i18n-Keys** (v1 war 17, +1 für `pre_insertion_modal.einspruch_ao_familienkasse_zusatz`).
6. Spec § 11 (Hard Constraints): § 11.2 (Body-Template-Hard-Line) wird unverändert übernommen — Skelett-Templates folgen identisch der Zero-`§`-Body-Regel.

**v2 Architect-Soft-Instruktionen** (im Spec zu pinnen, nicht im Domain-Lock UI-spezifiziert):
- **AV4 § 122a-Caveat collapses on `<md`**: `<details>`-Element auf Mobile (375 px), aufgeklappt auf Desktop. Frist-Cited-Format selbst bleibt sichtbar.
- **AV6 ReplyTemplatePicker-Order per Archetype**: Spec definiert pro `(archetype, fristen[].typ-Set)`-Kombi ein `order: ReplyTemplateId[]` Array. Für `steuerbescheid` + `einspruch` + `zahlung`: `[rechtsbehelf_einspruch_skelett, aussetzung_vollziehung_skelett, frist_verlaengerung, informative_rueckmeldung, freitext]`. Erstes Element ist default-highlighted.
- **AV7 Cross-Template-State**: Switch zwischen `rechtsbehelf_einspruch_skelett` ↔ `aussetzung_vollziehung_skelett` auf demselben Letter erlaubt im `<ReplyTemplateSwitchConfirmDialog>` zusätzlich „Beide als getrennte Briefe versenden". Resultat: zwei `Reply`-Records (parallel auf demselben `letter_id`), zwei Versand-Modale, beide im Vorgangs-Thread sichtbar. Existierende Schema-Schicht trägt das per `letter.replies[]`-Array (V1.5.0-Domain).
- **AV10 Visibility-Predicate**: positive-allow `typ ∈ {einspruch, widerspruch}` — siehe § 5 Master-Predicate. Spec-Code-Anker eindeutig affirmativ.
- **Activity-Log `note`-Feld**: `template_id` muss in `note` mitgeliefert werden, damit Datenschutz-Cockpit „Einspruch-Skelett eingefügt" rendern kann (V1.5.0 Domain-Lock § 10.3).
- **a11y-tester (post-build)**: `<PreInsertionModal>`-Norm-Zitate (`§ 357 Abs. 2 Satz 1 AO` etc.) brauchen `<span aria-label="Paragraph 357 Absatz 2 Satz 1 der Abgabenordnung">…</span>`-Wrap, sonst spricht der Screen-Reader das Symbol-Wirrwarr unverständlich aus.

---

## 11. Validation log (self-grep before lock)

- [x] **Zero `§`-Symbole in den drei Body-Strings** — manuell verifiziert. § 3.1, § 3.2, § 3.3 enthalten in der „Hiermit lege ich … ein"-/„Hiermit beantrage ich …"-Zeile kein `§`-Symbol. Einzige `§`-Vorkommnisse in diesem Dokument: (a) Modal-Body-Strings (§ 2; verbatim Norm-Zitat-Anker); (b) Disclaimer-Strings (§ 4; Klartext-Norm-Hinweis); (c) Frist-Cited-Format (§ 7; Norm-Zitat); (d) § 122a-AO-Caveat (§ 8); (e) Visibility-Explainer (§ 5/9); (f) Notes/Meta-Sektionen.
- [x] **Token-Set v2** — drei Skelett-Templates tragen je 12 Placeholder; Set besteht aus V1.5.0-Tokens (`absender_*`, `empfaenger_*`, `ort`, `datum`, `aktenzeichen`) plus `{datum_bescheid}` (v2-neu). `{datum_letter}` aus V1.5.0 ist *nicht* mehr Teil der Skelett-Token-Sets — das stellt die semantische Trennung „Schreiben vom" (V1.5.0) vs. „Bescheid vom" (V1.5.1) auf Token-Ebene sicher (Verifier AV5).
- [x] **Resolver-Hard-Rule v2 dokumentiert** — § 3 Token-Mapping verbietet Wiederverwendung derselben Variable für `datumLetter` und `datumBescheid`; Code-Snippet im Domain-Lock zeigt die Pflicht-Form.
- [x] **Selbst-Bindungs-Satz entfernt (v2)** — § 3.1 + § 3.2 nicht mehr „Eine Begründung reiche ich gesondert nach." Begründung BFH II R 90/83, Urt. v. 27.11.1985, BStBl II 1986, 243 (Einspruch ohne Begründung wirksam) zitiert. ✓ Verifier AV11.
- [x] **Familienkasse-AO-Erklärer mandatorisch (v2)** — § 2.1 trägt konditionalen Zusatz-Satz; § 5 Hard-Rule 6 deklariert Trigger-Logik. ✓ Verifier AV1.
- [x] **Visibility-Predicate affirmativ-allow (v2)** — § 5 Master-Predicate `typ ∈ {einspruch, widerspruch}` ist die kanonische Form; alle anderen Bedingungen sind absence-of-allow Konsequenzen. ✓ Verifier AV10.
- [x] **Disclaimer-Strings folgen V1.5.0-Konvention** — Klartext-Gesetzes-Nennung („Abgabenordnung", „Sozialgerichtsgesetz", „Verwaltungsgerichtsordnung") als Eigenname, kein Übersetzungsersatz. Pre-Insertion-Modal-Strings tragen verbatim Norm-Zitate (Verifier-Auflage).
- [x] **Sie-Form durchgängig** — keine Du-Rutscher; „ich" für Bürger:in (Selbst-Subjekt), „Sie/Ihnen/Ihre" für Behörde (Adressat). „Sie" für die Bürger:in im Disclaimer-Text (Anrede).
- [x] **Norm-Familien-Mapping verifiziert gegen Originalnorm** — § 357 AO, § 84 SGG, § 70 VwGO, § 67 OWiG, § 361 AO, § 240 AO, § 122a AO via gesetze-im-internet.de WebFetch verifiziert (siehe Sources im Frontmatter).
- [x] **Familienkasse-Sondernorm verifiziert** — Kindergeld als Steuervergütung iSv § 31 EStG → AO-Verfahrensrecht (§ 347 ff. AO, nicht SGG). Quelle: BFH III R 26/22 (2023) + steuertipps.de (verifiziert 2026-05-09).
- [x] **Begründungs-Wirksamkeit-Sondernorm verifiziert (v2-neu)** — BFH II R 90/83, Urt. v. 27.11.1985 (BStBl II 1986, 243) als Leitentscheidung zur Wirksamkeit eines unbegründeten Einspruchs zitiert; BFH III R 26/14, Urt. v. 13.05.2015, sekundär bestätigt formfreie E-Mail-Einlegung (Quelle: bundesfinanzhof.de, verifiziert 2026-05-09 via WebSearch).
- [x] **Bayern-Föderalismus-Delta verifiziert** — Art. 12 BayAGVwGO Widerspruchsverfahren in vielen Sachgebieten abgeschafft; landesanwaltschaft.bayern.de Bundesland-Übersicht (verifiziert 2026-05-09).
- [x] **Salutation neutral** — durchgängig „Sehr geehrte Damen und Herren," in allen drei Bodies. Verifier-Anforderung gewahrt.
- [x] **Bürger:innen-Authentizität (Aloud-Reading-Test, v2-re-run)** — alle drei Bodies in v2-Rumpf-Form einmal laut gelesen. Klingen wie reale Bürger:innen-Briefe (etwas formaler als private Korrespondenz, aber nicht Kanzlei-Sprache; vergleiche `letter-schmidt-fa-steuerbescheid-2024` Behörden-Sprache mit Skelett-Body — letzteres ist erwartungsgemäß weniger formal). Ohne den selbst-bindenden Begründungs-Satz wirkt der Body knapper, aber nicht ungelassen — entspricht der real-Bürger:innen-Praxis, die Begründung später separat als „ergänzendes Schreiben zum Einspruch" einzureichen. Pass.
- [x] **Visibility-Matrix vollständig** — alle 18 Mock-Letters in § 5 Tabelle erfasst (per Archetyp-Bucket). Master-Predicate + Hard-Rules § 5.1–6 schließen Edge-Cases (Mitwirkungs-Aufforderung, Bestätigungen, doppelte Fristen, Familienkasse-Erklärer-Trigger).
- [x] **Seed-Data-Audit (v2-neu)** — `letters.json` cross-gegrep't auf `Bescheid vom`, `erlassen am`, `Datum:`-Zeilen im body_de: **kein V1.5.0-Seed-Letter trägt heute eine explizite Erlassdatum-Zeile**. mock-backend-coder pflegt `bescheid_dated_at` deshalb stand-alone; eine Inkonsistenz mit existierendem body_de-Text kann nicht auftreten.

---

## 12. Locked v2. Do not edit without verifier sign-off.

> v2 wurde nach concept-verifier REVISE (2026-05-09) erstellt. Drei HARD-Revisionen + vier SOFT-Architect-Instruktionen sind im Changelog (Top-of-File) und in den jeweiligen §§ einzeln getrackt.
>
> Any future change to a `body_template_de` string requires:
> 1. Domain-expert proposes change with diff + RDG-rationale.
> 2. concept-verifier sign-off.
> 3. i18n-localizer re-touches translations downstream (only Disclaimer/Modal/Frist-Cited-Format — bodies are DE-only).
> 4. Spec § 8.x i18n-keys-table update (v2-Zähler: 18 keys).
> 5. mock-backend-coder updates token-resolver if placeholder-set changes — v2 erweitert das V1.5.0-Set um genau einen Token (`{datum_bescheid}`) mit eigener Resolver-Branch und neuem Letter-Feld `bescheid_dated_at`.
>
> The Pre-Insertion-Modal-Strings (§ 2) are the **§-citation-locus** for V1.5.1; they replace the V1.5.0-`§`-isolation-rule for skelett-templates only. Body-text is the locus of RDG-line maintenance — same rule as V1.5.0. Skelett-template bodies cannot bit-rot through translation, ad-hoc copy edits, or "minor" wording-Änderungen, because the Smartlaw-line (BGH I ZR 113/20) lives precisely in the body-text discipline.

---

## 13. Hand-off to product-architect — v2 PROCEED

**Verdict v2: PROCEED.** Die drei [domain-expert]-blockierenden Revisionen aus dem Verifier-Verdikt § 4 sind adressiert (Token-Token-Trennung mit `{datum_bescheid}` + neuem Letter-Feld; Selbst-Bindungs-Satz entfernt; Familienkasse-Erklärer mandatorisch). Vier Architect-Soft-Instruktionen sind im Domain-Lock dokumentiert (§ 10.C v2-Soft-Instruktionen-Block) und warten auf Implementation im Spec.

### Spec-shape (für `docs/specs/posteingang-v1.5.1.md`)

1. **`ReplyTemplateId`-Union erweitern** auf 8 Werte (5 V1.5.0 + 3 V1.5.1: `rechtsbehelf_einspruch_skelett`, `rechtsbehelf_widerspruch_skelett`, `aussetzung_vollziehung_skelett`).
2. **`Letter`-Schema-Erweiterung**: `bescheid_dated_at?: string` (ISO-8601), siehe § 3 Token-Mapping.
3. **Token-Resolver-Erweiterung**: zwei separate Branches `datumLetter` und `datumBescheid` mit den jeweiligen Quell-Feldern; siehe Resolver-Hard-Rule § 3.
4. **`<PreInsertionModal>`-Slot** mit Norm-Familie-Lookup (§ 1 + § 2). Lookup-Output: `{ modal_body_key, additional_explainer_key? }`.
5. **`getReplyTemplateOptions(letter)` mit positive-allow Master-Predicate** (§ 5).
6. **Picker-Order pro Archetype** (Architect AV6, § 10.C v2-Soft-Instruktionen).
7. **Cross-Template-State** zwischen `rechtsbehelf_einspruch_skelett` ↔ `aussetzung_vollziehung_skelett` (Architect AV7).
8. **§ 122a-Caveat collapse on `<md`** in `<details>` (Architect AV4).
9. **Activity-Log `note`-Feld** trägt `template_id` für die drei neuen Templates.
10. **a11y-tester Modal-`aria-label`-Wrap** für Norm-Zitate.

### File inventory (architect-spec wird folgendes anfassen oder erzeugen)

- **NEU**: `docs/specs/posteingang-v1.5.1.md` (architect-erzeugt)
- **EDIT**: `src/types/letter.ts` — `Letter` interface (`bescheid_dated_at?: string`); `ReplyTemplateId`-Union (3 neue Werte).
- **EDIT**: `src/lib/mock-backend/reply-templates.ts` — neue Resolver-Branch, neue Template-Bodies, `getReplyTemplateOptions(letter)` Visibility-Logik.
- **EDIT**: `src/lib/mock-backend/schemas.ts` — Zod-Schema für neue `Letter.bescheid_dated_at` und neue ReplyTemplateId-Werte.
- **EDIT**: `src/data/letters.json` — `bescheid_dated_at` für ~10 seed Letters (siehe § 3 Tabelle).
- **NEU**: `src/components/posteingang/PreInsertionModal.tsx` — `<AlertDialog>`-Wrapper, focus-trap, Norm-Familie-Lookup-Switch.
- **EDIT**: `src/components/posteingang/ReplyTemplatePicker.tsx` — archetype-keyed Order, Default-Highlight.
- **EDIT**: `src/components/posteingang/ReplySheet.tsx` — Frist-Cited-Format-Header, § 122a-Caveat `<details>`-Collapse, Cross-Template-State-Branch in `<ReplyTemplateSwitchConfirmDialog>`.
- **EDIT**: `src/lib/i18n/locales/de.json` (+ 5 weitere Locales) — 18 neue Keys (siehe § 10.C.5 v2).
- **EDIT**: `tests/e2e/posteingang-rechtsbehelf-aussetzung.spec.ts` (neu) — Skelett-Pfad-Tests, Modal-a11y-Audit, Cross-Template-State.

### i18n-Keys (v2-Zähler: 18)

Unter `posteingang.compose.*`:

1. `templates.rechtsbehelf_einspruch_skelett.body_template_de` (§ 3.1)
2. `templates.rechtsbehelf_einspruch_skelett.disclaimer_pre_insertion` (§ 4.1)
3. `templates.rechtsbehelf_einspruch_skelett.disclaimer_inline` (§ 4.1)
4. `templates.rechtsbehelf_widerspruch_skelett.body_template_de` (§ 3.2)
5. `templates.rechtsbehelf_widerspruch_skelett.disclaimer_pre_insertion` (§ 4.1, identisch mit #2 — separater Key wegen Picker-spezifischer i18n-Anchor)
6. `templates.rechtsbehelf_widerspruch_skelett.disclaimer_inline` (§ 4.1)
7. `templates.rechtsbehelf_widerspruch_skelett.disclaimer_pre_insertion_zusatz_sgg` (§ 4.2)
8. `templates.rechtsbehelf_widerspruch_skelett.disclaimer_pre_insertion_zusatz_vwgo` (§ 4.3)
9. `templates.aussetzung_vollziehung_skelett.body_template_de` (§ 3.3)
10. `templates.aussetzung_vollziehung_skelett.disclaimer_pre_insertion` (§ 4.4)
11. `templates.aussetzung_vollziehung_skelett.disclaimer_inline` (§ 4.4)
12. `pre_insertion_modal.einspruch_ao` (§ 2.1)
13. `pre_insertion_modal.einspruch_ao_familienkasse_zusatz` (§ 2.1, **v2-neu** — mandatorisch konditional)
14. `pre_insertion_modal.widerspruch_sgg` (§ 2.2)
15. `pre_insertion_modal.widerspruch_vwgo` (§ 2.3)
16. `pre_insertion_modal.aussetzung_ao` (§ 2.4)
17. `frist_cited_format.einspruch_ao` (§ 7.1) — gerendert für AO-Familie
18. `frist_cited_format.widerspruch_sgg` (§ 7.2) — gerendert für SGG-Familie

Plus weitere bereits in V1.5.0-Inventar gepflegte Strings, die nicht neu sind (z. B. `frist_cited_format.widerspruch_vwgo`, `frist_cited_format.bekanntgabe_fiktion_elster`, `frist_abgelaufen_warnung`, `skelett_footer_no_legal_advice`, `skelett_visibility_explainer.kein_rechtsbehelf_bei_mitwirkung`); architect entscheidet, ob V1.5.0-Lokalisierungs-Wave die schon gedeckt hat oder ob sie zum V1.5.1-Wave dazu kommen. Domain hat sie als „in dieser Domain-Lock-Datei verbatim definiert, lokalisierungs-pflichtig" markiert.

### Hand-off

Domain-Lock v2 ist sign-off-bereit für **concept-verifier-Re-Audit**. Bei verifier-PROCEED kickt **product-architect** off mit den 10 Spec-Items + 18 i18n-Keys. **mock-backend-coder** wartet auf Spec-Sign-off und pflegt parallel `bescheid_dated_at` für die ~10 Seed-Letters. **i18n-localizer** wartet auf Spec § 8.x.
