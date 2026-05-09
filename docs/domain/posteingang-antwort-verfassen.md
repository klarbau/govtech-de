---
vorgang: posteingang-antwort-verfassen
title: Posteingang V1.5 — „Antwort verfassen" (Bürger:in selbst, mit Templates)
last_validated: 2026-05-09
status: domain-validated
inputs:
  spec_v1: docs/specs/posteingang.md
  domain_v1: docs/domain/posteingang.md
  letters_seed: src/data/letters.json
sources:
  - https://www.gesetze-im-internet.de/rdg/__2.html      # § 2 RDG Begriff Rechtsdienstleistung
  - https://www.gesetze-im-internet.de/rdg/__5.html      # § 5 RDG Nebenleistungen
  - https://www.gesetze-im-internet.de/rdg/__6.html      # § 6 RDG Unentgeltliche Rechtsdienstleistungen
  - https://www.gesetze-im-internet.de/rdg/__10.html     # § 10 RDG registrierte Personen
  - https://www.bundesgerichtshof.de/SharedDocs/Pressemitteilungen/DE/2021/2021171.html  # BGH I ZR 113/20 Smartlaw
  - https://www.gesetze-im-internet.de/ao_1977/__357.html  # § 357 AO Einlegung Einspruch (Form)
  - https://www.gesetze-im-internet.de/ao_1977/__361.html  # § 361 AO Aussetzung der Vollziehung
  - https://www.gesetze-im-internet.de/vwvfg/__69.html   # § 69 VwVfG Form Widerspruch
  - https://www.gesetze-im-internet.de/sgg/__84.html     # § 84 SGG Widerspruch
  - https://www.gesetze-im-internet.de/owig_1968/__67.html # § 67 OWiG Einspruch Bußgeld
  - https://www.gesetze-im-internet.de/eigovg/__9.html   # § 9 eGovG Schriftformerfordernis ersetzen (Bund)
  - https://bmds.bund.de/themen/digitaler-staat/digitale-identitaeten/bundid  # BundID-Postfach Stand 2026
  - https://www.bundesdruckerei.de/de/innovation-hub/ozg-2-0-fakten-zum-onlinezugangsgesetz  # OZG 2.0
---

> **Geltungsbereich**: V1.5-Erweiterung der bestehenden Posteingang-Capability. Keine neue Vorgangs-Spezifikation, sondern eine **outbound-Erweiterung** des bestehenden inbound-only Posteingangs (V1 shipped 2026-05-09). Bürger:in verfasst die Antwort **selbst** in einem `<textarea>`. Die App liefert *optional* ein neutral vorbefülltes Skelett (Header, Aktenzeichen, Empfänger, Datum) für administrative Routine-Aktionen. RDG-Linie: das System ist Werkzeug, keine Beratungsleistung.

---

## 1. Executive summary (für product-architect)

- **Pure Selbst-Antwort (textarea ohne Template) ist nicht RDG.** Es ist *Eigenkommunikation* der Bürger:in in eigener Sache (§ 2 Abs. 1 RDG verlangt „**fremde** Angelegenheit"). Diese Funktion ist sicher.
- **Stammdaten-Prefill (Name, Adresse, Aktenzeichen, Empfänger, Datum) ist nicht RDG.** Es sind reine Sachdaten ohne rechtliche Bewertung. Sicher.
- **Templates ohne inhaltliche Begründung (administrative Skelette) sind nicht RDG**, sofern der Werkzeug-Charakter im Sinne BGH I ZR 113/20 („Smartlaw") gewahrt ist: standardisierter Textbaustein, keine einzelfallbezogene rechtliche Prüfung. Anwendbar auf: Fristverlängerung, Nachweis-Begleittext, Adressänderung, Termin (bestätigen/verschieben/absagen), informative Rückmeldung, **leere** Einspruch-/Widerspruch-/Aussetzungs-Skelette.
- **Templates MIT inhaltlicher Argumentation/Begründung (z.B. „Ich bestreite Punkt 3, weil …") sind RDG-RISIKO.** Sobald der Generator argumentative Bausteine zur Erfolgswahrscheinlichkeit eines Rechtsbehelfs liefert, kippt der Werkzeug-Charakter (BGH I ZR 113/20: „rechtliche Prüfung des Einzelfalls"). **V1.5 NICHT anbieten.**
- **AI-„Formulierung verbessern"-Button ist GREY.** Stil-/Grammatik-Lektorat ist erlaubt, aber die Linie ist schmal: sobald die KI argumentative Substanz hinzufügt oder rechtliche Gründe erfindet, ist die Linie überschritten. Empfehlung: in V1.5 **nicht** ausliefern; V2-Hook mit hartem System-Prompt-Constraint („nur Stil, nie Substanz, nie neue Rechtsbehauptung").
- **Kanal-Realismus 2026 ≠ 2027-Ideal.** Heute existiert kein einheitlicher Antwort-Kanal — BundID-Postfach ist inbound aktiv, **bidirektionale Kommunikation startet ausgebaut Sommer 2026**. Empfehlung: Speculative-Design-Frame „Stand 2027 — einheitliches BundID-Postfach + EUDI-Wallet-Signatur" beibehalten, **deutlich** als Speculative markieren, parallel den heutigen Flickenteppich als Tooltip dokumentieren.
- **Aus den 18 Mock-Briefen sind 5 antwort-erforderlich, 9 antwort-möglich, 4 antwort-nicht-sinnvoll.** Verteilung tragfähig für die Demo; eine zusätzliche „Termin-verschieben"-Vorlage fehlt, ein „Adressänderung-Mitteilung"-Brief würde das Template-Set komplettieren.

---

## 2. RDG-Tabelle für die A2-Templates

> **Norm-Anker**: § 2 Abs. 1 RDG: „Rechtsdienstleistung ist jede Tätigkeit in **konkreten fremden Angelegenheiten**, sobald sie eine **rechtliche Prüfung des Einzelfalls** erfordert." Beide Tatbestandsmerkmale müssen kumulativ erfüllt sein. Die Bürger:in handelt in *eigener* Sache → Merkmal „fremde Angelegenheit" entfällt strukturell. Dadurch liegt für die Bürger:in selbst *nie* eine RDG vor, egal welches Template sie nutzt. Die RDG-Frage stellt sich nur für **uns** als App-Anbieter: betreiben wir „im Hintergrund" einen Generator, der einzelfallbezogene rechtliche Prüfung leistet?
> **Smartlaw-Linie (BGH I ZR 113/20, 09.09.2021)**: Standardisierter Textbaustein-Generator ohne Berücksichtigung individueller Umstände jenseits typisierter Fallkategorien = **kein RDG**, weil „Werkzeug-Charakter wie ein Formularhandbuch". Sobald der Generator eine einzelfallspezifische Argumentation generiert, kippt das.

| Template | Klassifizierung | Begründung | Empfehlung V1.5 |
|---|---|---|---|
| **Fristverlängerung beantragen** (Behörde anschreiben mit Bitte um Verlängerung) | **SAFE** | Reiner administrativer Antrag; standardisierte Phrase „Ich bitte um Verlängerung der Frist bis zum …". Keine rechtliche Prüfung des Einzelfalls. Bürger:innen schreiben das täglich selbst per Brief. Vergleichbar mit „Formularhandbuch" iSv BGH I ZR 113/20. | **JA, anbieten.** |
| **Nachweis nachreichen** (Dokument anhängen + Begleittext) | **SAFE** | Pure Mitwirkungspflicht-Erfüllung (§ 26 SGB X, § 90 AO, § 82 AufenthG). Begleittext ist Übersendungs-Anschreiben („beigefügt finden Sie die angeforderte Schulbescheinigung"). Keine rechtliche Bewertung. | **JA, anbieten.** |
| **Adressänderung mitteilen** (informative Mitteilung) | **SAFE** | Sachdaten-Mitteilung, kein Antrag, kein Rechtsbehelf. Erfüllt ggf. eine Mitwirkungspflicht (z.B. § 17 BMG für Bürgeramt — aber Anmeldung ≠ Mitteilung). Standardisiert. | **JA, anbieten.** |
| **Termin bestätigen / verschieben / absagen** (rein administrativ) | **SAFE** | Organisatorische Kommunikation. Keine rechtliche Prüfung. | **JA, anbieten.** Empfohlen: drei Untertemplates. |
| **Einspruch einlegen — leeres Skelett** (Datum, Aktenzeichen, „Hiermit lege ich Einspruch ein gegen den Bescheid vom […]". OHNE Begründung) | **SAFE (mit Disclaimer)** | § 357 Abs. 1 AO: „Der Einspruch ist schriftlich einzureichen, zur Niederschrift zu erklären oder elektronisch zu übermitteln." Ein Einspruch ist auch **ohne** Begründung wirksam (BFH-Rspr. ständig). Das leere Skelett enthält nur Pflichtangaben (Adressat, Aktenzeichen, Erklärung „Einspruch"). Keine Einzelfall-Prüfung — entspricht Werkzeug-Charakter. | **JA, anbieten** mit harter UI-Trennung („nur Skelett, Begründung müssen Sie selbst formulieren — Verbraucherzentrale / Anwält:in beraten") + Disclaimer `disclaimer.no_legal_advice`. |
| **Einspruch einlegen — MIT vorgeschlagener Begründung** aus AI-Summary („Ich bestreite den Sachverhalt unter Punkt 3 …") | **RDG-RISIKO — RAUS** | KI generiert *konkrete einzelfallbezogene Argumentation* aus Brief-Inhalt. Das ist „rechtliche Prüfung des Einzelfalls" iSv § 2 Abs. 1 RDG. Smartlaw-Werkzeug-Charakter ist *nicht* gewahrt, weil keine standardisierten Bausteine, sondern fall-individuelle Substanz. Auch erhöhtes Erfolgsversprechen-Risiko. | **NEIN. V2-Hook bewusst leer lassen.** |
| **„Bescheid ist unzutreffend, ich bitte um Korrektur"** (kein förmlicher Rechtsbehelf, sondern formloser Korrektur-Wunsch) | **GREY** | Klingt harmlos, aber: § 129 AO (offenbare Unrichtigkeit) und § 173 AO (nachträgliche Tatsachen) sind eigenständige Korrektur-Institute mit anderen Fristen als Einspruch. Bürger:innen verwechseln das mit Einspruch und verpassen die 1-Monats-Frist. **Die App würde durch das Anbieten eines „Korrektur"-Templates fälschlich suggerieren, dies sei ein Rechtsbehelf.** Werkzeug-Charakter formal gewahrt, aber **inhaltlich irreführend**. | **NEIN. RAUS.** Ersetzen durch „Informative Rückfrage" (siehe unten). |
| **Aussetzung der Vollziehung beantragen — leeres Skelett** | **GREY (mit starkem Disclaimer)** | § 361 AO: AdV ist eigenständiger Antrag (nicht Bestandteil des Einspruchs!). Form: schriftlich. Skelett-Inhalt ist standardisiert: „Ich beantrage die Aussetzung der Vollziehung des Bescheids vom […], Aktenzeichen […]." Werkzeug-Charakter prinzipiell gewahrt. **Aber**: AdV ohne Einspruch ist sinnlos — die App müsste das wissen und kombinieren, was wieder Einzelfall-Bewertung wäre. | **GRENZWERTIG.** Empfehlung: in V1.5 **NICHT** als eigenständiges Template anbieten; nur als Erinnerungs-Hinweis im Reader (existiert bereits via `<NormTooltip>` § 361 AO). |
| **Aussetzung der Vollziehung beantragen — MIT Begründung** | **RDG-RISIKO** | Wie Einspruch-mit-Begründung: § 361 Abs. 2 AO setzt „ernstliche Zweifel an der Rechtmäßigkeit" oder „unbillige Härte" voraus. Eine vorgeschlagene Begründung ist Einzelfall-Bewertung. | **NEIN.** |
| **Antwort auf Nachfrage / informative Rückmeldung** | **SAFE** | Bürger:in beantwortet eine Behörden-Frage mit eigenen Sachangaben. Mitwirkungspflichten. Keine rechtliche Prüfung. | **JA, anbieten.** Default-Template für „informative Rückfrage" / „Nachweis-Begleittext". |
| **Widerspruch einlegen — leeres Skelett** (parallel zu Einspruch — § 84 SGG, § 70 VwGO) | **SAFE (mit Disclaimer)** | Analog Einspruch: § 84 SGG / § 70 VwGO erlauben Widerspruch ohne Begründung. Skelett ist standardisiert. | **JA, anbieten** als Variante des Einspruch-Skeletts (Behörden-abhängig: Krankenkasse → Widerspruch, Finanzamt → Einspruch). |

### Zusammenfassung Template-Set für V1.5

**Whitelist (8 Templates):**
1. `frist_verlaengerung` — Fristverlängerung beantragen
2. `nachweis_einreichen` — Begleittext zu Anlagen
3. `adresse_aktualisieren` — Adress-Mitteilung
4. `termin_bestaetigen`
5. `termin_verschieben`
6. `termin_absagen`
7. `rechtsbehelf_skelett_einspruch` — leeres Einspruch-Skelett (Finanzamt-Briefe)
8. `rechtsbehelf_skelett_widerspruch` — leeres Widerspruch-Skelett (Krankenkasse, Beitragsservice, IHK, BG, ABH)
9. `informative_rueckmeldung` — generischer Antwort-Rahmen

**Blacklist (V1.5 explizit OUT):**
- Begründete Einspruch-/Widerspruchs-/AdV-Templates
- „Bescheid-Korrektur"-Templates (irreführend bzgl. Frist-Regime)
- AdV-eigenständig (Smartlaw-Linie zu schmal)
- AI-„Formulierung verbessern"-Funktion (siehe §3 unten)

### A1 — Pure Selbst-Antwort ohne Template

**SAFE — keine Rechtsdienstleistung.** Bürger:in handelt in eigener Sache → § 2 Abs. 1 RDG nicht erfüllt („fremde Angelegenheit" fehlt strukturell). Vergleichbar mit dem Verfassen eines privaten Briefes. Die App ist hier reine Übermittlungs-Plattform. **V1.5 standardmäßig anbieten** als „Eigenen Text verfassen"-Modus.

### A3 — Stammdaten-Prefill

**SAFE.** Vorname, Nachname, Postanschrift, Aktenzeichen (aus Brief-Eingang), Empfänger-Behörde (aus Brief-Absender), Datum (heute) sind reine Sachdaten. Keine rechtliche Bewertung. Die Bürger:in könnte diese Daten auch manuell aus dem Brief abschreiben — die App spart nur Tipp-Arbeit. **V1.5 standardmäßig prefillen.** Sichtbar, editierbar, mit Tooltip „Aus Stammdaten/Brief übernommen, bitte prüfen".

### A4 — AI-„Formulierung verbessern"

**Linie**: Stil-/Rechtschreib-/Grammatik-Lektorat ohne Substanz-Veränderung ist kein RDG. Sobald die KI argumentative Substanz, neue Rechtsbehauptungen oder fall-spezifische Inhalte hinzufügt, kippt es in „rechtliche Prüfung des Einzelfalls" (§ 2 Abs. 1 RDG).

**Praktisches Problem**: Diese Linie ist mit einem System-Prompt-Constraint allein **nicht** zuverlässig zu halten. LLMs neigen dazu, beim „Verbessern" implizit Argumente hinzuzufügen oder Formulierungen rechtlich-aufwertend umzuschreiben („Ich finde das unfair" → „Ich beanstande die Festsetzung als rechtswidrig"). Das ist materiell eine Rechtsbehauptung.

**Empfehlung V1.5**: **NICHT ausliefern.** Risiko-Nutzen-Verhältnis ungünstig — der Stil-Mehrwert ist gering, das RDG-Risiko und das Risiko, dem/der Bürger:in eine fragwürdige Argumentation in den Mund zu legen, ist hoch.

**V2-Hook**: Hard-constrained „Stilcheck" mit Diff-Modus (Bürger:in sieht jede Änderung einzeln und akzeptiert/verwirft sie). System-Prompt-Constraint: „Du bist Lektor:in für Sprache, nicht für Inhalt. Du darfst keine Rechtsbehauptungen, Sachargumente oder Fakten einfügen, ändern oder weglassen. Ergebnis-Validierung per Token-Diff: keine semantischen Tokens hinzugefügt." Plus prominenter Bürger:innen-Disclaimer.

---

## 3. Behörden-Kanal-Matrix (B1)

> **Stichtag**: Mai 2026. Quellen: BMDS-BundID-Seite, OZG-2.0-Inkrafttreten 07/2024, Bundesdruckerei OZG-2.0-Faktenblatt, Branchenpresse zu BundID bidirektional Sommer 2026.

| Behörden-Kategorie | Realistische Antwort-Kanäle 2026 | OZG-2.0-Roadmap (2026–2028) | Briefpost-only? |
|---|---|---|---|
| **Finanzamt (Land)** | **Mein ELSTER** Postfach (Steuerbescheide bidirektional, Einspruch elektronisch via § 357 Abs. 1 AO „elektronisch zu übermitteln" zulässig); **De-Mail** (rückläufig, kaum genutzt); Briefpost; Niederschrift bei der Behörde | Ab 01.01.2027 elektronische Bekanntgabe Default in Mein ELSTER (§ 122a AO); Mein ELSTER bleibt steuer-spezifischer Hauptkanal. BundID-Anbindung perspektivisch, aber kein Termin. | Nein |
| **Familienkasse (Bund, BA)** | **Familienkasse-Online** (eigenes Portal mit Upload + Nachrichten); BundID-Postfach (für SGB-II/SGB-III-Bescheide perspektivisch); Briefpost | BundID bidirektional ab Sommer 2026 ausgebaut → Familienkasse als priorisierte OZG-Leistung wahrscheinlich angebunden. Stand 05/2026: noch nicht flächendeckend. | Nein, Online-Portal aktiv. |
| **Beitragsservice (Anstalt d.ö.R.)** | **rundfunkbeitrag.de Service-Portal** (Login per Beitragsnummer, Upload-Funktion, Befreiungsantrag, Adressänderung); E-Mail an `service@rundfunkbeitrag.de` (im Einzelfall); Briefpost; Widerspruch schriftlich oder elektronisch | Keine BundID-Anbindung geplant (privatrechtsähnliche Anstalt, eigene Infrastruktur). | Nein, Service-Portal aktiv. |
| **Ausländerbehörde (LEA Berlin etc., Land/Kommune)** | **Service-Berlin / LEA-Online** (Berlin), **service-bw** (BW), **BayernPortal**; ABH-spezifische Portale je Bundesland; teils E-Mail; Briefpost | OZG-2.0-Priorität, je Land unterschiedlich. Berlin: digitales Antragsportal aktiv. Stand 05/2026: kein einheitlicher Bundes-Kanal. | Häufig Briefpost-only für komplexe Vorgänge. |
| **Bürgeramt (Kommune)** | **Service-Portale der Bundesländer** (service.berlin.de, service-bw.de, BayernPortal, Hamburg Online-Dienste); kommunale Bürgerportale; OZG-Postkorb (uneinheitlich); Briefpost; Vor-Ort-Termin | BundID-SSO bei kommunalen Portalen ausgebaut; bidirektionale Kommunikation Sommer 2026 priorisiert. | Nein, aber heterogen. |
| **Krankenkasse (Selbstverwaltung)** | **Kassen-eigene App / Mein-AOK / Meine TK / Meine BARMER** (mit Beitrags-Widerspruch-Funktion); E-Mail; Briefpost | Keine direkte BundID-Anbindung (Selbstverwaltung), aber TI-Anbindung über eGK 2.0. Eigene Kassen-Portale dominieren weiter. | Nein, Apps gut etabliert. |
| **Bundesdruckerei** | **Keine direkte Bürger:innen-Kommunikation** — alle Vorgänge laufen über Bürgeramt zurück. Bundesdruckerei sendet Versand-Bestätigungen. | Bleibt indirekt. | n/a |
| **Standesamt (Kommune)** | **Service-Portal Bundesland**; Vor-Ort; Briefpost. Antrag auf Folge-Urkunden meist über Bürger-Portal möglich. | OZG-Priorität, je Land heterogen. | Häufig Briefpost. |
| **Finanzamt für Selbstständige + IHK + BG** | **ELSTER** (Finanzamt); **IHK-Portale** (jede IHK eigenes Portal, kein Bundes-Hub); **BG-Online** (DGUV-Mitgliederportal); Briefpost. Widerspruch i.d.R. schriftlich. | IHKs/BGs sind Selbstverwaltung — keine BundID-Anbindung absehbar. | Nein, eigene Portale. |
| **Polizei / Bußgeldstelle (Land/Kommune)** | **Bußgeldportal** des Bundeslandes (uneinheitlich); E-Mail an Bußgeldstelle; Briefpost; Niederschrift. Einspruch nach § 67 OWiG: „schriftlich oder zur Niederschrift". | Heterogen, OZG-Anbindung schleppend. | Häufig. |
| **Jobcenter (SGB II)** | **jobcenter.digital** (BA-Portal mit Upload + Nachrichten + eAntrag); Briefpost; Vor-Ort | jobcenter.digital ausgebaut, perspektivisch BundID-Integration. | Nein, Portal aktiv. |

### B2 — Speculative-Design-Frame: Empfehlung

**Empfehlung: Speculative-Design-Frame „Stand 2027 — einheitliches BundID-Postfach + EUDI-Wallet-Signatur" beibehalten.** Begründung:

1. Das ist die **zentrale These der Demo** (siehe `CLAUDE.md`: „Citizen-first interaction layer for German public administration … on top of DeutschlandID + EUDI Wallet + Deutschland-Stack"). Zurück zum Flickenteppich würde die These verwässern.
2. Es ist **realistisch projiziert**: BundID bidirektionale Kommunikation ist offiziell für Sommer 2026 ausgebaut angekündigt; OZG 2.0 gilt seit 07/2024; EUDI-Wallet-Frist EU-weit Q4/2026. Bis 2027 ist das Frame plausibel.
3. Der bestehende Spec-Footer (§8.3) in `posteingang.md` macht das Frame **explizit transparent**: „Eine *einheitliche* Inbox-Realität existiert in DE 2026 noch nicht — die Demo zeigt, wie sie aussehen könnte." Diese Linie konsequent fortführen.

**ABER**: Für outbound-Kommunikation muss das Frame **detaillierter** werden. Empfehlung:
- Outgoing-Disclaimer-Banner über jedem Antwort-Compose: „Stand 2027 — Speculative Design. In dieser Demo simulieren wir den Versand über das einheitliche BundID-Postfach mit EUDI-Wallet-Signatur. Heute (Mai 2026) müssten Sie je Behörde unterschiedliche Portale nutzen."
- `<KanalRealitaetsCheck>`-Tooltip auf der Versand-Bestätigung, der pro Behörde den **heutigen** Kanal nennt (z.B. „Heute: Mein ELSTER + Briefpost. 2027 (vermutet): BundID-Postfach.").

### B3 — `Kanal`-Werte für ausgehende Antworten

Vorgeschlagene Erweiterung des `LetterAuthChannel`-Typs (oder neuer `OutboundChannel`-Typ, falls semantisch separat gehalten):

```typescript
type OutboundChannel =
  | 'bundid-postfach'      // 2027-Speculative: einheitlicher Kanal
  | 'mein-elster'          // 2026-real: Steuerbehörden
  | 'krankenkassen-portal' // 2026-real: GKV-spezifisch
  | 'service-portal-land'  // 2026-real: service-berlin/bw/Bayern
  | 'briefpost-simuliert'  // Fallback für Behörden ohne digitalen Kanal
```

UI-Badge-Wortlaut (Vorschlag — i18n-Keys):

| Kanal | DE-Wortlaut Badge | Kontext-Tooltip |
|---|---|---|
| `bundid-postfach` | „Versand über BundID-Postfach" | „Stand 2027 (Speculative Design). Authentifiziert via EUDI Wallet, signiert über BundID." |
| `mein-elster` | „Versand über Mein ELSTER" | „Bundesweit etablierter Kanal für Finanzamt-Kommunikation (§ 122a AO)." |
| `krankenkassen-portal` | „Versand über Kassen-Portal" | „Eigenes Portal Ihrer Krankenkasse (Mein AOK / Meine TK / Meine BARMER)." |
| `service-portal-land` | „Versand über Landes-Service-Portal" | „Heterogener Stand 2026: service.berlin.de / service-bw.de / BayernPortal je nach Land." |
| `briefpost-simuliert` | „Versand per Brief (simuliert)" | „Diese Behörde ist Stand 2026 nur per Brief erreichbar. Die Demo simuliert den Versand." |

### B4 — Authentizitäts-Stufe outbound (Pendant zum inbound-Badge)

**Ja, ein Pendant ist nötig** — sonst entsteht UI-Asymmetrie zwischen „Empfangen über Briefpost" (klar markiert) und einem unbeschrifteten Versand. Empfehlung:

- **Outbound-Authentizitäts-Badge** mit 2-Zeilen-Anzeige:
  - Zeile 1 (Kanal): „Versand über BundID-Postfach"
  - Zeile 2 (Authentifizierung): „Signatur: EUDI Wallet" (Speculative-2027) bzw. „Signatur: simuliert" (Demo-explizit)
- **§ 9 eGovG-Hinweis** als Tooltip: „Schriftform kann durch elektronische Form mit qualifizierter elektronischer Signatur (qeS) oder De-Mail mit Absenderbestätigung ersetzt werden." Das macht klar, *warum* die Signatur überhaupt relevant ist.
- **2027-Frame realistisch**: EUDI Wallet bringt qualifizierte Signaturen für Bürger:innen massentauglich. Heute (2026) schreitet das voran (eIDAS 2 / VO (EU) 2024/1183), ist aber noch nicht flächendeckend. Demo bleibt damit Speculative aber plausibel.

---

## 4. Antwortbarkeit der 18 Mock-Briefe + Template-Vorschläge

> Klassifizierung: **Erforderlich** (Behörde fragt aktiv etwas und droht mit Konsequenz) / **Möglich** (Bürger:in könnte Rechtsbehelf einlegen, ist aber nicht verpflichtet) / **Nicht sinnvoll** (Bestätigungs-/Informations-Schreiben).

### 4.1 Anna Petrov — 8 Briefe

| ID | Behörde / Archetyp | Antwortbarkeit | Bestes Template | Begründung |
|---|---|---|---|---|
| `letter-fa-steuerbescheid-2025` | Finanzamt — Steuerbescheid (Erstattung 371 €) | **Möglich** (Einspruch theoretisch, aber sinnlos bei Erstattung) | Keines anbieten / `informative_rueckmeldung` | Erstattung läuft automatisch. Einspruch wirtschaftlich sinnlos. |
| `letter-aok-rechnung-zuzahlung` | AOK — Zuzahlungs-Übersicht | **Nicht sinnvoll** | Keines | Reine Information, Belastungsgrenze nicht erreicht. |
| `letter-beitragsservice-festsetzung` | Beitragsservice — Festsetzungsbescheid (regulär) | **Möglich** (Befreiung wenn Sozialleistungs-Bezug, Widerspruch wenn nicht beitragspflichtig) | `rechtsbehelf_skelett_widerspruch` (mit starkem Disclaimer „Erfolgsaussichten lassen Sie bitte von einer Verbraucherzentrale prüfen") | Standard-Festsetzung ohne erkennbaren Anlass — Widerspruch nicht naheliegend, aber rechtlich offen. |
| `letter-abh-erinnerung-verlaengerung` | LEA Berlin — Verlängerungs-Erinnerung | **Erforderlich** (Termin buchen, Nachweise sammeln) | `informative_rueckmeldung` ODER besser: kein Antwort-Template, sondern **Termin-Buchungs-Flow** (eigener Vorgang) | Briefkarakter eher Erinnerung — Antwort nicht das natürliche Mittel. |
| `letter-familienkasse-bewilligung` | Familienkasse — Kindergeld bewilligt | **Nicht sinnvoll** | Keines | Bewilligungs-Bestätigung. |
| `letter-buergeramt-meldebestaetigung-anmeldung` | Bürgeramt — Anmeldung bestätigt | **Nicht sinnvoll** | Keines | Bestätigung. |
| `letter-bundesdruckerei-pa-aufkleber` | Bundesdruckerei — Versandbestätigung | **Nicht sinnvoll** | Keines | Versand-Info. **Bundesdruckerei ist nicht direkt antwortbar** (siehe Kanal-Matrix). |
| `letter-aok-mitgliedsbescheinigung` | AOK — Mitgliedsbescheinigung | **Nicht sinnvoll** | Keines | Bescheinigungs-Info. |

### 4.2 Familie Schmidt — 4 Briefe

| ID | Behörde / Archetyp | Antwortbarkeit | Bestes Template | Begründung |
|---|---|---|---|---|
| `letter-schmidt-standesamt-geburt` | Standesamt — Geburtsurkunde Mia | **Nicht sinnvoll** | Keines | Urkunden-Übersendung. |
| `letter-schmidt-familienkasse-nachweis` | Familienkasse — Schulbescheinigung Felix bis 15.06.2026 | **Erforderlich** (Konsequenz bei Nicht-Antwort: Einstellung Kindergeld) | **`nachweis_einreichen`** (mit Anlage Schulbescheinigung) — Hauptdemo-Fall! Optional: `frist_verlaengerung` falls Schulbescheinigung noch nicht da. | Lehrbuch-Fall für „Antwort verfassen". |
| `letter-schmidt-krankenkasse-beitrag` | TK Hamburg — Beitragsfestsetzung 497,29 €/Monat | **Möglich** (Widerspruch innerhalb 1 Monat, § 84 SGG) | `rechtsbehelf_skelett_widerspruch` (mit Hinweis: Beiträge bleiben fällig, § 86a SGG) | Klassischer Widerspruchs-Fall. |
| `letter-schmidt-fa-steuerbescheid-2024` | Finanzamt Hamburg — Nachzahlung 1.247 € | **Möglich** (Einspruch + ggf. AdV; Zahlung erforderlich) | `rechtsbehelf_skelett_einspruch` (Disclaimer: AdV separat); ggf. `frist_verlaengerung` für Zahlung | Klassischer Einspruchs-Fall mit Zahlungsdruck. |
| `letter-schmidt-beitragsservice-festsetzung` | Beitragsservice — 63,08 € Mahnung | **Möglich** (Widerspruch; Vollstreckungs-Hinweis) | `rechtsbehelf_skelett_widerspruch` (starker Disclaimer: Vollstreckung läuft trotz Widerspruch); ODER schlicht zahlen | Eskalation, Bürger:innen brauchen klaren Pfad. |

### 4.3 Mehmet Yıldız — 5 Briefe

| ID | Behörde / Archetyp | Antwortbarkeit | Bestes Template | Begründung |
|---|---|---|---|---|
| `letter-mehmet-fa-steuerbescheid-2024` | Finanzamt Köln-Mitte — Nachzahlung 4.812 € (Selbstständig) | **Möglich** (Einspruch + AdV besonders relevant bei hoher Nachzahlung) | `rechtsbehelf_skelett_einspruch` + `frist_verlaengerung` für Zahlung | Hochbetrags-Fall mit AdV-Relevanz. **Aber AdV-Begründungs-Template bleibt OUT.** |
| `letter-mehmet-ihk-beitrag` | IHK Köln — 507,40 € | **Möglich** (Widerspruch bei abweichendem Gewerbeertrag) | `rechtsbehelf_skelett_widerspruch` (Disclaimer: Erfolgsaussichten von IHK-Steuerberater:in / Verbraucherzentrale prüfen lassen) | Klassischer Selbstständigen-Widerspruch. |
| `letter-mehmet-bgw-beitrag` | VBG — 142 € Mindestbeitrag | **Möglich** (Widerspruch) | `rechtsbehelf_skelett_widerspruch` | Niedrigschwellig — fast immer rechtmäßig festgesetzt. |
| `letter-mehmet-krankenkasse-freiwillig` | AOK Rheinland — 497,29 €/Monat freiwillig | **Möglich** (Widerspruch wegen Beitrags-Bemessung) | `rechtsbehelf_skelett_widerspruch` | Selbstständige zahlen oft zu hoch festgesetzt — Standardfall. |
| `letter-mehmet-beitragsservice-mahnung` | Beitragsservice — 63,08 € Mahnung | **Möglich** (Widerspruch) | `rechtsbehelf_skelett_widerspruch` | Wie Schmidt-Variante. |

### 4.4 Verteilung & Empfehlungen für Seed-Daten

**Verteilung gut?** Ja, im Wesentlichen tragfähig:
- **3 Erforderlich-Briefe**: Familienkasse-Nachweis Schmidt, ABH-Erinnerung Anna (eingeschränkt — eher Termin als Antwort), und implizit alle Steuer-Nachzahlungen mit Zahlungsdruck.
- **9 Möglich-Briefe**: 5× Widerspruch (Krankenkassen, Beitragsservice, IHK, BG), 3× Einspruch (Steuerbescheide), 1× Befreiungs-Antrag (Beitragsservice regulär).
- **6 Nicht-sinnvoll-Briefe**: Bestätigungen, Bewilligungen, Urkunden.

Die Demo-Erzählung kann den „Antwort verfassen"-Flow in **4 Kontexten** zeigen:
1. **Nachweis nachreichen** (Schmidt-Familienkasse) — der primäre, niedrigschwellige Demo-Fall.
2. **Widerspruch-Skelett** (Schmidt-TK oder Mehmet-AOK) — zeigt den Rechtsbehelfs-Fall mit Disclaimer-UX.
3. **Fristverlängerung** (Mehmet-Steuerbescheid Zahlung) — zeigt ein anderes Template.
4. **Termin-Antwort** — siehe unten Empfehlung.

**Lücken / Empfehlung 2 zusätzliche Mock-Briefe**:

1. **Termin-Vorschlag-Brief** (z.B. Standesamt Berlin → Anna für Eheschließungs-Termin oder Bürgeramt → Anna für Persowechsel-Termin). **Begründung**: Aktuell hat kein Brief einen klaren „Termin verschieben/absagen"-Anlass — die 3 Termin-Templates verwaisen sonst.
2. **Adressänderungs-Aufforderung** (z.B. KFZ-Zulassungsstelle → Mehmet „Bitte teilen Sie uns Ihre aktuelle Halter-Adresse mit"). **Begründung**: Demonstriert das `adresse_aktualisieren`-Template + zeigt, dass die App Stammdaten direkt vorbefüllen kann (Wow-Effekt).

Beide würden den Vorgangs-Bezug auch um KFZ und Standesamt erweitern, was die Posteingang-Capability breiter macht.

---

## 5. Risk-Register (D1, D2)

### D1 — RDG-Angriffspunkte (3 größte)

| # | Angriffspunkt | Wahrscheinlichkeit | Schaden | Kompensation |
|---|---|---|---|---|
| **R1** | **AI generiert Begründung** für Einspruch/Widerspruch — auch versehentlich, weil System-Prompt nicht hart genug | **Hoch** (LLMs neigen zu „helpful overreach") | Hoch (Kammer-LinkedIn-Vorwurf RDG-Verstoß; Demo wird als Legal-Tech-Negativbeispiel zitiert) | (a) **Keine Begründungs-Templates in V1.5.** (b) Bürger:innen-Textarea ohne KI-Hilfe als Default (auch nach Skelett-Insertion). (c) System-Prompt für `vorschlage_naechsten_schritt` und alle Tools explizit: „Du erstellst keine Begründungen, keine Argumente, keine Erfolgs-Prognosen, keine Rechtsbewertung des Einzelfalls." (d) Refusal-Pattern in `src/lib/ai/safety.ts` für Begründungs-Anfragen. |
| **R2** | **Versand-Button** wirkt rechtsverbindlich (Bürger:in glaubt, App reicht Einspruch wirklich ein → Frist verstreicht) | **Mittel** (Demo-Kontext mildert) | **Sehr hoch** (Frist verloren = echter materieller Schaden, falls Demo produktiv missverstanden) | (a) **Versand ist Mock** — wird nicht real ausgeführt (siehe `domain/posteingang.md` §X.3). (b) Versand-Bestätigungs-Modal sehr explizit: „Diese Demo simuliert den Versand. Es wird nichts an die Behörde gesendet. In der Praxis müssten Sie Ihren Einspruch über [aktueller Kanal pro Behörde] einlegen." (c) `[MOCK]`-Watermark im Versand-Output. (d) `posteingang.disclaimer.mock_data` über Compose-Screen sichtbar. |
| **R3** | **Templates für Skelett-Einspruch suggerieren Erfolg** (durch ihre bloße Existenz: „die App rät mir doch, Einspruch zu machen") | Mittel | Mittel (Vertrauensverlust + RDG-Streifen) | (a) Templates **nur als Antwort auf explizite Auswahl** anbieten, nicht als Default-CTA. (b) Pre-Insertion-Modal: „Sie nutzen das Einspruchs-Skelett. Diese Vorlage enthält nur Pflicht-Angaben (Datum, Aktenzeichen, Erklärung). Die **Begründung** müssen Sie selbst formulieren — die App liefert dazu keine Vorschläge. Erfolgsaussichten lassen Sie bitte von einer **Verbraucherzentrale** oder **Anwält:in** prüfen." (c) `was_kann_ich_tun_options`-Liste bleibt informativ-neutral (existiert bereits). |

### D1 zusätzlich (Anwaltskammer-LinkedIn-Test)

Empfohlene Verteidigungs-Linie für den Loom-Voiceover oder README:

> „Diese Demo respektiert konsequent die Smartlaw-Linie des BGH (I ZR 113/20): Das System ist Werkzeug, nicht Berater. Bürger:innen verfassen ihre Antworten **selbst** — die App liefert ausschließlich administrative Skelette mit Pflichtangaben (Aktenzeichen, Datum, Empfänger). **Keine** Begründungs-Generierung, **keine** Erfolgs-Prognose, **keine** einzelfallbezogene rechtliche Bewertung. Für solche Fragen verweist die App ausdrücklich auf Verbraucherzentralen, Sozialverbände und Anwält:innen."

### D2 — Datenschutz / Activity-Log

Bestehender `LetterActivityAktion`-Enum (in `src/types/letter.ts`):
```typescript
type LetterActivityAktion =
  | 'opened_in_app'
  | 'summary_generated'
  | 'frist_added_to_calendar'
  | 'marked_read'
  | 'archived'
```

**Erweiterung für V1.5**:
```typescript
type LetterActivityAktion =
  | ... (bestehend)
  | 'reply_compose_started'    // Bürger:in öffnet Antwort-Compose-Screen
  | 'reply_template_inserted'  // Template-Skelett ins textarea eingefügt
  | 'reply_draft_saved'        // Draft persistiert (localStorage)
  | 'reply_sent_simulated'     // „Versand" geklickt — Mock-Send ausgeführt
```

**Datenschutz-Cockpit-Anzeige**:
- Pro Brief zeigt das Cockpit nun zusätzlich Outbound-Events
- Neuer Brief-Status: `beantwortet` (zusätzlich zu `gelesen`/`erledigt`)
- Anzeige: „Antwort verfasst am [Datum] · Versand simuliert über [Kanal]"
- **Rechtsgrundlage** für Activity-Log-Einträge: `Art. 6 Abs. 1 lit. a DSGVO` (Einwilligung). KEINE neue Rechtsgrundlage nötig — bestehende AVV-Klausel mit Anthropic deckt KI-Verarbeitung ab; die Antwort-Erstellung selbst ist client-seitig (textarea), keine zusätzliche AI-Übermittlung in V1.5 (da AI-„Verbessern" out).

**PII-Modellierung**:
- Antwort-Draft enthält Stammdaten (Name, Adresse) + Aktenzeichen + Behörden-Adresse + Datum + Bürger:innen-Text.
- **Persistierung**: localStorage, key `govtech-de:v1:letter-replies` (analog `:letter-activity-log`).
- **Datenschutz-Cockpit zeigt**: was im Draft steht (gekürzt) + Versand-Status (simuliert) + Activity-Trail.
- **Lösch-Pfad**: Bürger:in kann Draft jederzeit löschen → eigenes Activity-Event `reply_draft_deleted` (optional, falls Datenschutz-Cockpit Lösch-Anträge in V2 ausbaut).

---

## 6. Empfehlungen für product-architect (was MUSS in der Spec stehen)

### Must-Have

1. **Template-Whitelist hart in der Spec verankern** (siehe §2 oben): 9 Templates, keine Begründung-Templates, keine AdV-mit-Begründung. **Begründung jeder Whitelist-Entscheidung mit § 2 RDG / Smartlaw-Argumentation**, damit code-reviewer und concept-verifier die Linie nicht versehentlich aufweichen.

2. **AI-„Formulierung verbessern" explizit V1.5-OUT.** V2-Hook in der Spec dokumentieren, aber V1.5 bewusst leer lassen.

3. **Versand ist immer simuliert** — kein realer HTTP/Mail-Versand. Spec muss das in `<Versand-Bestätigung>`-Modal-Wortlaut verankern: „Versand simuliert. Es geht nichts an [Behörde] raus."

4. **Outbound-Authentizitäts-Badge** (B4): zwei Zeilen (Kanal + Signatur). i18n-Keys: `posteingang.outbound.kanal_template`, `posteingang.outbound.signatur_template`, `posteingang.outbound.signatur_speculative_2027`, `posteingang.outbound.signatur_simuliert`.

5. **Pre-Insertion-Modal für Skelett-Templates**: erklärt RDG-Linie für Bürger:in (kein Jargon, aber klar): „Diese Vorlage enthält nur Pflicht-Angaben. Die Begründung schreiben Sie selbst — wir helfen Ihnen dabei nicht inhaltlich, weil das **Rechtsdienstleistung** im Sinne § 2 RDG wäre und nur Anwält:innen / Verbraucherzentralen leisten dürfen." i18n-Key: `posteingang.compose.template_disclaimer.skelett`.

6. **Activity-Log-Erweiterung** (siehe §5.D2): 4 neue Enum-Werte, konsistent in `letter.ts` + `schemas.ts` + `mock-backend/persistence.ts`.

7. **Stammdaten-Prefill mit Edit-Möglichkeit + Tooltip**: Felder wie `vorname`, `nachname`, `strasse_hausnummer`, `plz_ort` aus `personas.json` ins Compose-Form vorbefüllen; Aktenzeichen + Behörden-Adresse aus dem Letter; Datum aus `new Date()`. Tooltip auf jedem Feld: „Aus Ihren Stammdaten / dem Brief übernommen — bitte prüfen."

8. **Speculative-Design-Footer auch auf Compose-Screen** sichtbar (siehe `posteingang.spec.md` §8.3 — gleiche Sprache, leichte Anpassung für Outbound). Wortlaut-Anker: „Stand 2027 — wir simulieren den Versand über das einheitliche BundID-Postfach mit EUDI-Wallet-Signatur. Heute (2026) wären je Behörde unterschiedliche Portale nötig."

9. **Pro Brief-Archetyp die Template-Vorschläge in die Spec übernehmen** (siehe §4 oben). Tabelle wird Quelle für `getReplyTemplateOptions(letter)` im mock-backend.

10. **Templates als Daten, nicht Code**: i18n-JSON unter `posteingang.compose.templates.<template_id>.body_de` (und Übersetzungen). Erlaubt es i18n-localizer, Templates zu warten, ohne Code anzufassen.

### Should-Have

11. **2 zusätzliche Mock-Briefe seeden** (siehe §4.4): Termin-Vorschlag + Adressänderungs-Aufforderung. Sonst bleiben 3 der 9 Templates ohne Demo-Anker.

12. **Compose-Screen-Default-State**: bei Brief-Klick „Antwort verfassen" → Modal mit Template-Auswahl + „Ohne Template starten" Option. Default ist **keine** Template-Auswahl (Bürger:in wählt aktiv).

13. **Disclaimer-Strings konsolidieren** mit bestehenden V1-Disclaimern: kein neuer Disclaimer erforderlich, sondern Wiederverwendung von `posteingang.disclaimer.no_legal_advice` (für Skelett-Templates) und `posteingang.disclaimer.mock_data` (für Versand-Modal). **Neu**: `posteingang.disclaimer.outbound_speculative` (für Outbound-Banner) und `posteingang.compose.template_disclaimer.skelett` (siehe Must-Have #5).

### Could-Have / V2-Hooks

14. **Diff-Modus für AI-„Formulierung verbessern"** (V2): Token-Diff zwischen Original und KI-Vorschlag, Bürger:in akzeptiert/verwirft jede Änderung. Feature-Flag `feature.replyAIPolish` initial `false`.

15. **Versand-Validierung gegen Frist-Daten** (V2): Wenn Bürger:in ein Widerspruchs-Skelett 33 Tage nach Bekanntgabe verfasst, App weist auf abgelaufene Frist hin (informativ, nicht blockierend; Wiedereinsetzungs-Hinweis § 110 AO / § 32 VwVfG).

16. **Mehrsprachiger Compose** (V2-Hook): Bürger:in tippt in EN/RU/UK/AR/TR, App übersetzt vor Versand nach DE (mit Side-by-Side-Review). Heikel: § 23 VwVfG „Amtssprache deutsch" — Übersetzung ist Bürger:innen-Verantwortung, App liefert Werkzeug. RDG-Risiko mittel (Übersetzung ist nicht Rechtsdienstleistung, aber Inhalts-Verschiebungen möglich). Eigene RDG-Prüfung in V2 nötig.

### Hard Constraints (Non-Negotiable)

- **Kein Versand-an-real-Behörde** (auch nicht via Mock-Email). Nur localStorage-Persistierung + UI-Bestätigung.
- **Keine AI-Begründung** in keinem Template, nirgends im System-Prompt erwartbar.
- **Keine Erfolgs-Prognose** — System-Prompt-Refusal-Pattern (existiert bereits in `src/lib/ai/safety.ts`) erweitert um Compose-Kontext.
- **Templates editierbar** — Bürger:in kann jeden Template-Text frei verändern, auch löschen. Kein „Pflichtfeld"-Lock.
- **`[MOCK]`-Watermark** auch im Outbound-Output (Versand-Bestätigung, Datenschutz-Cockpit-Anzeige).
- **Originaltext-Verweis** in der Antwort-Vorlage: „Bezug: Ihr Schreiben vom [Datum], Aktenzeichen [Az]" — verhindert, dass Bürger:in den Bescheid-Bezug verliert.

---

## 7. Quellen verifiziert

- **§ 2 Abs. 1 RDG**: „Rechtsdienstleistung ist jede Tätigkeit in konkreten **fremden** Angelegenheiten, sobald sie eine **rechtliche Prüfung des Einzelfalls** erfordert." → Eigenkommunikation der Bürger:in fällt strukturell raus. (gesetze-im-internet.de, verifiziert 2026-05-09)
- **§ 5 RDG**: Nebenleistungen — nicht einschlägig, da App keine Haupttätigkeit hat, zu der Rechtsdienstleistung Nebenleistung wäre.
- **§ 6 RDG**: Unentgeltliche Rechtsdienstleistung — irrelevant, da App ohnehin kein RDG erbringen will.
- **BGH I ZR 113/20** (09.09.2021, „Smartlaw"): Werkzeug-Charakter ohne einzelfallbezogene rechtliche Prüfung = kein RDG. Standardisierte Textbausteine wie Formularhandbuch erlaubt. (BGH Pressemitteilung 2021/171 + Volltext PDF auf bundesgerichtshof.de, verifiziert 2026-05-09)
- **§ 357 Abs. 1 AO**: „Der Einspruch ist schriftlich einzureichen, zur Niederschrift zu erklären oder elektronisch zu übermitteln." Ohne Begründungspflicht. → leeres Skelett rechtswirksam.
- **§ 84 SGG / § 70 VwGO / § 67 OWiG**: analoge Form-Anforderungen für Widerspruch / VG-Klage / OWi-Einspruch.
- **§ 9 eGovG**: elektronische Schriftform-Ersetzung mit qeS — Grundlage für 2027-EUDI-Frame.
- **§ 122a AO** + **§ 41 Abs. 2/2a VwVfG** + **§ 5 Abs. 7 VwZG**: 4 Bekanntgabe-Regimes, bereits in V1-Spec dokumentiert; bleiben für outbound-Bestätigungen relevant (z.B. Eingangs-Bestätigung der Behörde am 4. Tag → eigene Frist).
- **OZG 2.0** (in Kraft 07/2024): Rechtsgrundlage für BundID + bidirektionale Kommunikation Sommer 2026 — Realismus-Frame.
- **eIDAS 2 / VO (EU) 2024/1183**: EUDI Wallet bis Q4 2026 — Realismus-Frame für 2027-Speculative.

---

## 8. Legal disclaimer (zur Übernahme in `de.json`)

**`posteingang.compose.template_disclaimer.skelett`** (vor Insertion eines Einspruchs-/Widerspruchs-Skeletts):

> „Diese Vorlage enthält nur **Pflichtangaben** (Datum, Aktenzeichen, Empfänger und die Erklärung „Hiermit lege ich Einspruch / Widerspruch ein"). Eine **Begründung** schreiben Sie bitte selbst — die App schlägt keine Argumente vor, weil die Bewertung Ihres Einzelfalls **Rechtsdienstleistung** im Sinne des § 2 RDG ist und nur durch Anwält:innen, registrierte Personen, Verbraucherzentralen oder Sozialverbände erfolgen darf. Erfolgsaussichten Ihres Rechtsbehelfs lassen Sie bitte von einer dieser Stellen prüfen."

**`posteingang.compose.outbound_speculative`** (Banner über Compose-Screen):

> „**Stand 2027 — Speculative Design.** In dieser Demo simulieren wir den Versand Ihrer Antwort über ein einheitliches BundID-Postfach mit EUDI-Wallet-Signatur. **Heute (Mai 2026)** wäre der Antwort-Kanal je nach Behörde unterschiedlich: Mein ELSTER für das Finanzamt, das Kassen-Portal für Krankenkassen, ein Landes-Service-Portal für Bürger- und Ausländerbehörden, häufig noch der Briefweg. Es wird nichts an [Behörde] gesendet."

**`posteingang.compose.versand_modal_title`** + **`posteingang.compose.versand_modal_body`**:

> Titel: „Versand simulieren?"
> Body: „Diese Demo simuliert den Versand. Es geht nichts an [Behörde] raus. Ihr Entwurf wird in der App gespeichert und im Datenschutz-Cockpit dokumentiert. In der Praxis müssten Sie Ihre Antwort über [aktueller Kanal] einreichen."
