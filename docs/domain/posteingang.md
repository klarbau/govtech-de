---
vorgang: posteingang
title: Aggregierter Behörden-Posteingang mit AI-Brief-Erklärer
last_validated: 2026-05-08
sources:
  - https://www.gesetze-im-internet.de/vwvfg/__41.html
  - https://dejure.org/gesetze/VwVfG/41.html
  - https://www.gesetze-im-internet.de/ao_1977/__122.html
  - https://dejure.org/gesetze/AO/122a.html
  - https://www.gesetze-im-internet.de/vwzg_2005/__5.html
  - https://www.gesetze-im-internet.de/rdg/__2.html
  - https://www.gesetze-im-internet.de/rdg/__6.html
  - https://www.gesetze-im-internet.de/rdg/__10.html
  - https://www.gesetze-im-internet.de/bdsg_2018/__22.html
  - https://www.gesetze-im-internet.de/ao_1977/__30.html
  - https://www.gesetze-im-internet.de/sgb_5/__290.html
  - https://dsgvo-gesetz.de/art-9-dsgvo/
  - https://docs.fitko.de/fit-connect/docs/organisation-tasks/buergerpostfach-entscheider/
  - https://www.elster.de/eportal/helpGlobal?themaGlobal=help_bescheiddaten
  - BGH I ZR 113/20 (09.09.2021, "Smartlaw")
  - BGH VIII ZR 285/18 (27.11.2019, "Lexfox/wenigermiete.de")
---

> **Hinweis zum Geltungsbereich**
> Dies ist *keine* Vorgangs-Spezifikation, sondern eine *horizontale Capability* — ein einheitlicher Posteingang, der prinzipiell jeden Behördenbrief annimmt, unabhängig von Zielgruppe oder Vorgang. Die Konventionen unten gelten daher pauschal für jede:n Bürger:in, nicht nur für eine Persona.

## Beteiligte Akteure (statt einer einzelnen Behörde: Kategorien)

Da der Posteingang prinzipiell **alle** Briefe aggregiert, ist die Liste taxonomisch — jede:r Bürger:in trifft typischerweise auf eine Teilmenge davon.

| Ebene | Behörde / Stelle | Typisches Schreiben | Föderale Ebene |
|---|---|---|---|
| Bund | Familienkasse (bei Bundesagentur für Arbeit) | Kindergeldbescheid, Nachweis-Aufforderung | Bund |
| Bund | ARD ZDF Deutschlandradio Beitragsservice (Anstalt d.ö.R., Staatsvertrag) | Festsetzungsbescheid, Mahnung, Anmeldebestätigung | Länder (RBStV-Staatsvertrag) |
| Bund | Bundesamt für Migration und Flüchtlinge (BAMF) | Anhörungsladung, Asyl-/Schutzbescheid, Integrationskurs-Bescheinigung | Bund |
| Bund | Bundeszentralamt für Steuern (BZSt) | Steuer-IdNr.-Mitteilung, Kirchensteuer-Mitteilung (KiStAM) | Bund |
| Bund | Bundesdruckerei | PA-/Reisepass-Versandbestätigung, eAT-Versand | Bund (öff.-rechtl. Anstalt im Auftrag) |
| Bund | Deutsche Rentenversicherung (DRV) | Rentenkonto-Auskunft, Renteninformation, V0100/V0410-Vordrucke | Bund / Selbstverwaltung |
| Bund | Jobcenter / Agentur für Arbeit | Bürgergeld-Bescheid (SGB II), ALG-I-Bescheid (SGB III), Eingliederungsvereinbarung | Bund |
| Bund | Zoll / Hauptzollamt | KFZ-Steuer-Bescheid (seit 2014), Einfuhrumsatzsteuer | Bund |
| Land | Finanzamt | Steuerbescheid, Zuständigkeits-Mitteilung, Vollstreckungsankündigung | Land |
| Land | Polizei (Verwarn-/Bußgeldstelle) | Anhörungsbogen, Verwarn-/Bußgeldbescheid (OWiG) | Land |
| Land | Landesamt für Steuern (z.B. NRW LBV) | Beihilfe-Bescheid, Besoldungs-Mitteilung (für Beamt:innen) | Land |
| Land | Schulamt / staatliches Schulamt | Schulanmeldebestätigung, Schulpflicht-Mitteilung | Land |
| Land | Justizbehörden (Amtsgericht, Mahngericht) | Mahnbescheid (§§ 688 ff. ZPO), Erbschaftssteuermitteilung-Begleitschreiben | Land |
| Kommunal | Bürgeramt / Einwohnermeldeamt | Meldebestätigung, Anschreiben zur Wahlberechtigung, Volkszählungs-Aufforderung | Kommune (Vollzug Land) |
| Kommunal | Standesamt | Eheurkunde, Geburtsurkunde, Sterbeurkunde, Vaterschaftsanerkennung | Kommune |
| Kommunal | Schulamt (kommunal) | Schulplatz-Zuweisung, Lernmittelbescheid | Kommune |
| Kommunal | Jugendamt | Unterhaltsvorschuss-Bescheid, Kita-Platzbescheid, Beistandschaft-Mitteilung | Kommune |
| Kommunal | KFZ-Zulassungsstelle | Zulassungsbescheinigung Teil I + II, Außerbetriebsetzungs-Bestätigung | Kommune |
| Kommunal | Ausländerbehörde (LEA / ABH) | Aufenthaltstitel-Verlängerungs-Aufforderung, Versagung, Auflagen-Bescheid | Land/Kommune |
| Kommunal | Ordnungsamt | Bußgeldbescheid (Hund, Müll, OWi), Gewerbe-Untersagung | Kommune |
| Kommunal | Sozialamt | Wohngeld-Bescheid (SGB II/SGB XII), Grundsicherungs-Bescheid | Kommune |
| Kommunal | Stadtwerke / kommunaler Versorger (öff.-rechtl., aber privatrechtlich agierend) | Abrechnungen — meist **außerhalb** Behördenposteingang | Kommune (privatrechtlich) |
| Selbstverwaltung | Gesetzliche Krankenkassen (TK, AOK, BARMER, …) | Beitragsfestsetzung, Befreiungs-Bescheid, Familienversicherungs-Bestätigung | Selbstverwaltung (öff.-rechtl. Körperschaft) |
| Selbstverwaltung | Berufsgenossenschaft (DGUV) | Unfall-Bescheid, Beitragsbescheid (gewerbl.) | Selbstverwaltung |
| Selbstverwaltung | IHK / HWK | Beitragsbescheid, Eintragungs-/Berufs-Bescheid | Selbstverwaltung |
| „Privatrechtlich, aber behördenartig" | Private Krankenversicherer | Tarif-Anpassungs-Mitteilung, Beitragsanpassung | Privatrecht (VVG) |

> **Wichtige Federalismus-Klarstellung**: Bürgergeld (SGB II) ist Bundesleistung mit kommunaler Mitfinanzierung; Wohngeld (SGB XII / WoGG) ist *Land/kommunal*; Sozialhilfe (SGB XII) ist *kommunal*. Steuern sind *Land* (Vollzug) auch wenn das Recht *Bund* ist. Der Posteingang muss diese Unterscheidung anhand des Absenders, nicht anhand des Themas, abbilden.

## Erforderliche Rechtsgrundlagen für die Verarbeitung

| Datenkategorie | DSGVO-Rechtsgrundlage (Mock) | DSGVO-Rechtsgrundlage (echt-prod) | BDSG-Spezialnorm |
|---|---|---|---|
| Stammdaten der/des Bürger:in (Name, Adresse, Geburtsdatum) | Art. 6 Abs. 1 lit. b DSGVO (vertragl. Nutzungsverhältnis App ↔ Bürger:in) | Art. 6 Abs. 1 lit. b DSGVO + Einwilligung Art. 6 Abs. 1 lit. a für Aggregation | — |
| Inhalt eines Behördenbriefs (regelmäßig „normale" pers. Daten) | Art. 6 Abs. 1 lit. a DSGVO (ausdrückliche Einwilligung beim Hochladen/Empfangen) | Art. 6 Abs. 1 lit. a DSGVO (Einwilligung) | — |
| Inhalt eines Behördenbriefs mit Sozialdaten (Bürgergeld, Wohngeld, Krankenkassen-Bescheid, ABH-Bescheid → Aufenthaltsstatus, Sozialhilfe) | Art. 9 Abs. 2 lit. a DSGVO (**ausdrückliche** Einwilligung) — *nicht* lit. h, da private App keine medizinisch/sozial-fürsorgerische Stelle iSv lit. h ist | Art. 9 Abs. 2 lit. a DSGVO + § 22 Abs. 1 Nr. 1 lit. a BDSG (Sozialschutz-Rechte ausüben) + § 22 Abs. 2 BDSG (technisch-organisatorische Maßnahmen) | § 22 BDSG |
| Religionsmerkmal in Steuerbescheid (Kirchensteuer KiStAM) | Art. 9 Abs. 2 lit. a DSGVO (Einwilligung) | Art. 9 Abs. 2 lit. a DSGVO | § 22 BDSG |
| Gesundheitsdaten (Krankenkassen-Bescheid mit Diagnose-Bezug, AU-Bescheinigung, Reha-Bescheid) | Art. 9 Abs. 2 lit. a DSGVO (Einwilligung); on-server-Verarbeitung durch AI-Anbieter NUR mit AVV (Art. 28 DSGVO) inkl. EU-SCC | wie Mock plus § 22 Abs. 2 BDSG | § 22 BDSG |
| Übermittlung an AI-Anbieter (Anthropic) zur Zusammenfassung | Art. 28 DSGVO Auftragsverarbeitungsvertrag + EU-Standardvertragsklauseln (SCC) für Drittland-Transfer (Anthropic ist US-Unternehmen mit EU-Inferenz-Kapazität, aber Konzern-Sitz US) | wie Mock; ggf. zusätzlich technische Pseudonymisierung vor Übertragung | — |

> **Hoheitlich vs. Private**
> Art. 6 Abs. 1 lit. e DSGVO (öffentliche Aufgabe / hoheitliche Gewalt) gilt **nur**, wenn die App *selbst* eine öffentliche Stelle iSv § 2 BDSG ist oder im Auftrag einer solchen handelt. Eine private Demo/App, die ein:e Bürger:in zur eigenen Briefverwaltung nutzt, ist *kein* Träger öffentlicher Gewalt — die korrekte Rechtsgrundlage ist **immer** lit. a (Einwilligung) bzw. lit. b (Vertrag), nicht lit. e.

## Realistische Briefkopf-Phrasen + Aktenzeichen-Formate

> Alle Beispiele sind synthetisch und mit `[MOCK]` zu kennzeichnen; Format-Konventionen folgen Real-Behörden.

### Aktenzeichen-Formate (verifiziert gegen primäre/sekundäre Quellen)

| Behörde | Format | Beispiele (synthetisch, [MOCK]) | Quelle |
|---|---|---|---|
| Finanzamt — Steuernummer (länderspezifisch, alt) | NN/BBB/UUUUP (Berlin), NNNN/BBBB/UUUUP (NRW), NNN/BBB/UUUUP (BY) | `[MOCK] 11/123/45678` (Berlin), `[MOCK] 5333/2891/0815` (NRW Düsseldorf), `[MOCK] 143/250/01234` (BY Pasing) | ELSTER-Hilfe |
| Finanzamt — Steuer-IdNr. (bundeseinheitlich, AO §139b) | 11 Ziffern | `[MOCK] 47 113 815 421`, `[MOCK] 86 295 102 749` | AO §139b |
| Bundeszentralamt für Steuern (BZSt, KiStAM) | wie Steuer-IdNr. + Kirchensteuermerkmal-Code | `[MOCK] KiStAM-Mitteilung 47 113 815 421 / rk` | BZSt |
| Familienkasse — Kindergeldnummer | 3 Ziffern (FK-Bezirk) + "FK" + 6 Ziffern + 1 Ziffer (Auszahltermin) = 11 Zeichen | `[MOCK] 115FK154721`, `[MOCK] 234FK892017`, `[MOCK] 087FK445033` | kindergeld.org-Auswertung; BA-Familienkasse |
| ARD ZDF Deutschlandradio Beitragsservice | 9 Ziffern (Beitragsnummer) | `[MOCK] 731 042 088`, `[MOCK] 624 188 905` | rundfunkbeitrag.de |
| BAMF (Asyl/Schutz) | 7 Ziffern + "-" + 3 Ziffern (Herkunftsland-Code) | `[MOCK] 6724813-475` (475 = Syrien), `[MOCK] 5018932-423` (423 = Afghanistan), `[MOCK] 7332108-438` (438 = Irak) | Wikipedia BAMF |
| Ausländerbehörde (Berlin LEA) | "ABH-B-JJJJ/RB-X-NNNN" | `[MOCK] ABH-B-2026/IV-A-7842`, `[MOCK] LEA-B-2026/II-C-1023` | Berliner LEA-Praxis |
| Ausländerbehörde (München KVR-II/3) | "KVR-II/3-NNNNN/JJJJ" | `[MOCK] KVR-II/3-04711/2026` | München KVR-Praxis |
| eAT-CAN-Nummer (Card Access Number, Aufenthaltskartenkennung) | 1 Buchstabe + 7 Ziffern + Prüfziffer (Format auf Karte) | `[MOCK] T0123456X`, `[MOCK] L9876543K` | BAMF-eAT-Doku |
| Krankenkasse — Krankenversichertennummer (KVNR, § 290 SGB V) | 10-stellig sichtbar = 1 Großbuchstabe (kein Umlaut) + 8 Ziffern + 1 Prüfziffer (Luhn) | `[MOCK] A123456780`, `[MOCK] M845192036`, `[MOCK] Q672013485` | § 290 SGB V; ITSG-Vertrauensstelle |
| Rentenversicherung — Versicherungsnummer | 12 Stellen: 2 Bereich + 6 Geburtsdatum (TTMMJJ) + 1 Buchstabe (1. Buchstabe Geburtsname) + 2 Ziffern + 1 Prüfziffer | `[MOCK] 65 170395 P 042`, `[MOCK] 12 251182 K 071` | DRV |
| Polizei OWi (Bußgeldstelle, kommunal/Land — Format variiert!) | Az `NNNNN/JJ/JJJJ` oder `OWi NNNN/JJJJ` | `[MOCK] OWi 04711/2026`, `[MOCK] 12345/26/2026` (BG-Nr.), `[MOCK] BG-B-2026-04711` | Wikipedia Aktenzeichen |
| Bürgeramt / Einwohnermeldeamt (rein lokal, kein Standard) | freies kommunales Aktenzeichen | `[MOCK] BA-MITTE/EWA-2026-04-0083421`, `[MOCK] KZ-EIM/UM-2026-117/8842` | Hamburg KZ; Berlin BA-Praxis |
| Standesamt | "<Stadtkürzel>-<Buchstabe>-NNNN/JJJJ" | `[MOCK] B-G-04711/2026` (Geburt), `[MOCK] HH-E-00892/2026` (Ehe), `[MOCK] M-S-01133/2026` (Sterbe) | StAG-Vollzug; lokal |
| Schulamt (kommunal) | "<Schulamt>-NNNN/<Schuljahr>" | `[MOCK] SA-NEUKÖLLN-2025/26-1142`, `[MOCK] SchA-PA-2026-0817` | Schulamtspraxis Berlin/Bayern |
| Jugendamt — Unterhaltsvorschuss | "UVG-NNNN/JJJJ" oder freies Az | `[MOCK] UVG-04711/2026`, `[MOCK] JA-B-2026/UVG-2289` | Jugendamtspraxis |
| KFZ-Zulassungsstelle | kein zentrales Az — Bezug über Kennzeichen + VIN | `[MOCK] B-KFZ-2026-04711-Halter`, `[MOCK] HH-ZUL/2026/22-045088` | FZV-Vollzug |

### Briefkopf-Standardphrasen pro Behördentyp

**Finanzamt — Steuerbescheid mit Nachzahlung**
- Absender: „Finanzamt Berlin Mitte/Tiergarten — Postfach 31 09 50, 10639 Berlin"
- Betreff: „Bescheid für 2024 über Einkommensteuer, Solidaritätszuschlag und Kirchensteuer — Steuernummer [MOCK] 11/123/45678"
- Standardphrase: „Sie haben noch ___ Euro zu zahlen. Den Gesamtbetrag entnehmen Sie bitte dem Abrechnungsteil. Bitte zahlen Sie bis zum [DATUM] auf das untenstehende Konto."
- Rechtsbehelfsbelehrung: „Gegen diesen Bescheid kann innerhalb eines Monats nach Bekanntgabe Einspruch eingelegt werden. Der Einspruch ist bei dem oben bezeichneten Finanzamt schriftlich einzureichen, zur Niederschrift zu erklären oder elektronisch zu übermitteln."
- Maschinen-Floskel: „Dieser Bescheid ist maschinell erstellt und auch ohne Unterschrift gültig."
- Bekanntgabe-Floskel (Mein-ELSTER-Variante): „Dieser Bescheid wird Ihnen zum Datenabruf in Mein ELSTER bereitgestellt. Er gilt am vierten Tag nach Bereitstellung als bekannt gegeben (§ 122a Abs. 4 AO)."

**Krankenkasse — Beitragsfestsetzung (freiwillig/Selbstständige:r)**
- Absender: „Techniker Krankenkasse — Bramfelder Straße 140, 22305 Hamburg" (oder konkrete Geschäftsstelle)
- Betreff: „Festsetzung des Beitrags zur Kranken- und Pflegeversicherung — Versicherungsnummer [MOCK] A123456780"
- Standardphrase: „Wir setzen Ihren Beitrag ab dem [DATUM] wie folgt fest: …"
- Rechtsbehelfsbelehrung: „Gegen diesen Bescheid kann innerhalb eines Monats nach Bekanntgabe Widerspruch erhoben werden. Der Widerspruch ist schriftlich oder zur Niederschrift bei der Techniker Krankenkasse … einzulegen."
- Hinweis-Floskel: „Bitte beachten Sie, dass die Beiträge auch dann zu zahlen sind, wenn Sie Widerspruch eingelegt haben (aufschiebende Wirkung gemäß § 86a SGG entfällt insoweit)."

**ARD ZDF Deutschlandradio Beitragsservice — Mahnung / Festsetzungsbescheid**
- Absender: „ARD ZDF Deutschlandradio Beitragsservice, 50656 Köln"
- Betreff: „Festsetzungsbescheid — Beitragsnummer [MOCK] 731 042 088"
- Standardphrase: „Trotz mehrfacher Aufforderung haben Sie den Rundfunkbeitrag in Höhe von ___ Euro bislang nicht entrichtet. Wir setzen den rückständigen Beitrag hiermit förmlich fest."
- Rechtsbehelfsbelehrung: „Gegen diesen Bescheid kann innerhalb eines Monats nach Bekanntgabe Widerspruch eingelegt werden. Der Widerspruch ist schriftlich oder elektronisch beim ARD ZDF Deutschlandradio Beitragsservice einzureichen oder zur Niederschrift zu erklären."
- Hinweis: „Dieser Bescheid ist ein vollstreckbarer Titel iSv § 9 RBStV i.V.m. dem jeweiligen Landesvollstreckungsgesetz."

**Ausländerbehörde — Verlängerungs-Erinnerung Aufenthaltstitel**
- Absender: „Landesamt für Einwanderung Berlin — Friedrich-Krause-Ufer 24, 13353 Berlin"
- Betreff: „Ihr Aufenthaltstitel nach § 18g AufenthG — Aktenzeichen [MOCK] ABH-B-2026/IV-A-7842"
- Standardphrase: „Wir weisen Sie darauf hin, dass Ihre Aufenthaltserlaubnis nach § 18g AufenthG am [DATUM] abläuft. Bitte stellen Sie spätestens [DATUM minus 8 Wochen] einen Antrag auf Verlängerung."
- Hinweis-Floskel: „Beachten Sie Ihre Mitwirkungspflichten nach § 82 AufenthG. Erforderliche Nachweise: gültiger Pass, Krankenversicherungsnachweis, Beschäftigungsnachweis (Arbeitsvertrag oder Verdienstabrechnungen der letzten 3 Monate), Mietvertrag oder Wohnungsgeberbestätigung."

**Familienkasse — Nachweis-Aufforderung**
- Absender: „Familienkasse Berlin-Brandenburg — 14460 Potsdam"
- Betreff: „Ihr Kindergeld — Kindergeldnummer [MOCK] 115FK154721"
- Standardphrase: „Zur weiteren Prüfung Ihres Kindergeldanspruchs bitten wir um Vorlage folgender Nachweise: aktuelle Schul-/Studienbescheinigung des Kindes [Name] für den Zeitraum [DATUM]–[DATUM]. Bitte reichen Sie die Unterlagen bis zum [DATUM] ein."
- Hinweis: „Sollten Sie nicht innerhalb der Frist antworten, können wir Ihren Anspruch nach § 67 Abs. 1 EStG i.V.m. § 68 Abs. 1 EStG ggf. ab dem [DATUM] vorläufig einstellen."

**Bürgeramt — Termin-Bestätigung / Meldebestätigung**
- Absender: „Bezirksamt Mitte von Berlin — Bürgeramt Müllerstraße"
- Betreff: „Ihre Anmeldung nach § 17 BMG vom TT.MM.JJJJ — Aktenzeichen [MOCK] BA-MITTE/EWA-2026-04-0083421"
- Standardphrase: „Hiermit bestätigen wir Ihren Wohnsitz unter folgender Anschrift mit Wirkung zum [DATUM]: …"
- Hinweis: „Diese Meldebestätigung ersetzt nicht die Wohnungsgeberbestätigung nach § 19 BMG."

## Häufige Hürden für Bürger:innen

Über die makro-Befunde der research-scout-Datei (75 % überfordert, 47 % brauchen Hilfe) hinaus gibt es **strukturelle Verständnis-Hürden**, die der Posteingang konkret adressieren muss:

- **Begriffsverwirrung Bescheid / Bestätigung / Anschreiben**: Bürger:innen unterscheiden nicht zwischen einem **Verwaltungsakt mit Regelungswirkung** (Bescheid → Frist, Rechtsbehelf) und einer **bloßen Information** (Anschreiben → keine Frist, kein Rechtsbehelf). Beispiel: „Mitteilung der örtlichen Zuständigkeit" Finanzamt = informative Mitteilung, kein VA, keine Widerspruchsfrist; „Steuerbescheid 2024" = VA mit 1-Monats-Einspruchsfrist.
- **Frist-Konfusion Widerspruch / Klage / Antrag**: drei rechtlich völlig verschiedene Institute mit unterschiedlichen Fristen — Widerspruch = 1 Monat (§ 70 VwGO bzw. § 84 SGG), Klage zum VG = 1 Monat (§ 74 VwGO), Antrag (z.B. auf Wiedereinsetzung) = 2 Wochen (§ 32 VwVfG) oder 1 Monat (§ 67 SGG). Bürger:innen verwechseln diese permanent.
- **Anlagen-Pflicht-Unklarheit**: Welche Nachweise *müssen* mit einem Antrag/Widerspruch eingereicht werden, welche werden auf Verlangen nachgereicht? Die Mitwirkungspflichten (§ 26 SGB X, § 82 AufenthG, § 90 AO) sind vielfältig und nicht standardisiert beschriftet.
- **Mehrsprachigkeit faktisch ausgeschlossen**: § 23 Abs. 1 VwVfG legt fest „Die Amtssprache ist deutsch". Bescheide werden grundsätzlich nicht mehrsprachig erlassen; nur in Ausnahmefällen sind fremdsprachige Eingaben möglich (§ 23 Abs. 2 VwVfG: Übersetzung auf Verlangen / Kostenfolge). Migrant:innen mit niedrigem Deutsch-Niveau sind strukturell benachteiligt — *genau hier* setzt der AI-Erklärer an, *aber*: Originaltext bleibt rechtsverbindlich.
- **Rückläufer-Risiko bei Adresswechsel**: Bei verspäteter Ummeldung (§ 17 BMG, 2 Wochen) oder fehlender KFZ-Halter-Adressierung (§ 15 FZV) kommen Bescheide an die alte Adresse, gelten dort aber nach § 41 Abs. 2 VwVfG / § 122 Abs. 2 AO am 4. Tag als bekanntgegeben — selbst wenn nie geöffnet. Das löst Fristen aus, die *de facto* ungenutzt verstreichen.
- **„Eine Adresse, viele Stellen"-Trugschluss** (übernommen aus umzug.md): Bürger:innen glauben, das Meldeamt informiere alle Stellen. Realität: nur ein Teil (Finanzamt, Beitragsservice, Wehrverwaltung) per § 36 BMG; KFZ-Stelle, Krankenkasse, Bank, Arbeitgeber, ABH erhalten *keine* automatische Push-Mitteilung.
- **§ 41 Abs. 2a VwVfG-Falle**: Wer einmal in das ZBP/BundID-Postfach oder Mein ELSTER eingewilligt hat, bekommt VAs dort *rechtsverbindlich* zugestellt. Wenn dann das ZBP/Mein ELSTER nicht aktiv genutzt wird, beginnt mit der Bereitstellung-Benachrichtigung trotzdem der Frist-Lauf (§ 122a Abs. 4 AO: 4. Tag nach Bereitstellung) — **auch ohne tatsächliches Lesen**.
- **„Fiktion vs. tatsächlicher Zugang"**: Selbst wenn der Brief erst Tage später tatsächlich gelesen wird, bleibt die rechtliche Bekanntgabe-Fiktion am 4. Tag wirksam, sofern nicht „im Zweifel die Behörde den Zugang und den Zeitpunkt des Zugangs nachzuweisen" hat (§ 41 Abs. 2 S. 3 VwVfG). Konsequenz: Fristen *fühlen sich kürzer an als sie sind*, weil die Bekanntgabe-Fiktion vor dem tatsächlichen Lesen liegen kann.
- **Mahnkosten- und Säumniszuschlags-Eskalation**: § 240 AO (Säumniszuschlag) und § 9 RBStV (Vollstreckung Beitragsservice) führen zu schnell anwachsenden Zusatzkosten — 1 % pro Monat (§ 240 Abs. 1 AO) auf nicht entrichtete Steuerschulden, ohne Kappung — was die Wahrnehmung „eine verpasste Frist kostet schnell richtig viel" objektiv stützt.
- **Phishing-Risiko bei Behörden-Look**: gefälschte Schreiben (z.B. fingierte Bußgeldbescheide, gefälschter „Digitaler Post Service FZCO" für Beitragsservice-Ummeldung 39,99 €) imitieren Behörden-Optik. Der Posteingang muss eine Authentizitäts-Anzeige bieten, die in der echten Verwaltung erst mit EUDI-Wallet-Sealing (post-2027) standard wird.

## Auto-fill / Automation-Potenzial

Was kann das System *zuverlässig* extrahieren — und was kann es als nächste Aktion *vorschlagen*?

| Brief-Typ | Extraktions-Technik (LLM vs. Regex vs. Hybrid) | Was auto-extrahierbar | Was vorschlagbar als Aktion |
|---|---|---|---|
| Steuerbescheid Finanzamt | Hybrid: LLM (Verständnis) + Regex (Steuernummer NN/BBB/UUUUP, Beträge `\d+,\d{2}\s*€`, Daten `\d{2}\.\d{2}\.\d{4}`) | Steuernummer, Steuerjahr, Nachzahlung/Erstattung-Betrag, Zahlungsfrist, Einspruchsfrist (1 Monat ab Bekanntgabe) | Frist in Kalender; Betrag im Stammdaten-Cashflow; Vorschlag „Einspruch prüfen" → Disclaimer-Schwelle (RDG, siehe unten) |
| Krankenkassen-Beitragsbescheid | Hybrid: LLM + Regex (KVNR `[A-Z]\d{9}`, Beitrag) | KVNR, Beitragshöhe, Beitragszeitraum, Widerspruchsfrist (1 Monat) | Frist; Beitrag in Cashflow; Daueraufgabe Anpassung |
| Beitragsservice Mahnung/Festsetzungsbescheid | Hybrid: Regex Beitragsnummer (9-stellig), LLM für Mahn-Stufe | Beitragsnummer, Rückstand, Frist | Frist; Vorschlag „Befreiungsantrag prüfen" (z.B. SGB-II-Bezug) — Disclaimer |
| ABH Verlängerungs-Erinnerung | LLM (Aufenthaltstitel-Typ §-Verweis), Regex (Az-Format, Datum) | Aufenthaltstitel-§, Ablaufdatum, Empfehlung-Antragsdatum | Frist Antragstellung; Termin-Vorschlag bei Online-Terminbuchung; Nachweis-Checkliste |
| Familienkasse Nachweis-Aufforderung | LLM (Nachweis-Typ), Regex (Kindergeldnummer 11 Zeichen, Datum) | Kindergeldnummer, geforderte Nachweise, Frist | Frist; Vorschlag „Nachweis hochladen" (Mock); Erinnerung |
| Bürgeramt Termin-/Meldebestätigung | Regex genügt | Anschrift, Wirksamkeitsdatum | Stammdaten-Update-Vorschlag; Folgeprozesse triggern (KFZ, Beitragsservice etc.) |
| Polizei Bußgeldbescheid (OWi) | Hybrid | Az, Bußgeldhöhe, Verwarnungs-/Bußgeldfrist (2 Wochen Verwarn-, 2 Wochen Einspruch nach § 67 OWiG), Tatvorwurf-Code | Frist; Vorschlag „Einspruch prüfen" (Standard-Disclaimer); Zahlung |
| Standesamt Urkunde | Regex | Urkundenart, Datum, Az | Stammdaten-Update; Folge-Vorgänge (Krankenkasse, Familienkasse bei Geburt) |

**Wichtig zur Halluzinations-Vermeidung**: Jedes extrahierte Datum/Frist *muss* mit dem Original-Zitat aus dem Brief belegt werden („Original-Satz neben extrahierter Frist"). Wenn die LLM eine Frist nennt, die im Original-Text per Regex nicht auffindbar ist → Hand-off „Bitte selbst prüfen, automatische Erkennung unsicher". Dieses Pattern ist in der research-scout-Datei korrekt als „Citation-RAG-Pattern" identifiziert.

## Realistic mock-data hints

### 6 Brief-Archetypen für Seed-Daten

> Jeder Brief im Mock trägt das Watermark `[MOCK – Verwaltungsdemo, keine echten Daten]` *sichtbar* in einer Banner-Zeile am oberen Rand des `LetterReader`-Komponents UND in der `LetterCard` als kleines Badge. Aktenzeichen tragen den Präfix `[MOCK]` *innerhalb* des Aktenzeichen-Strings, damit auch beim Copy-Paste sichtbar.

**1. Steuerbescheid Finanzamt mit Nachzahlung + Widerspruchsfrist**
- Absender: „Finanzamt Berlin Mitte/Tiergarten — Postfach 31 09 50, 10639 Berlin"
- Betreff: „Bescheid für 2024 über Einkommensteuer, Solidaritätszuschlag und Kirchensteuer — Steuernummer [MOCK] 11/123/45678"
- Aktenzeichen: `[MOCK] 11/123/45678` + Steuer-IdNr. `[MOCK] 47 113 815 421`
- Body-Auszug: „Sie haben noch 1.247,00 € zu zahlen. Bitte zahlen Sie bis zum 12.06.2026 auf das untenstehende Konto. Gegen diesen Bescheid kann innerhalb eines Monats nach Bekanntgabe Einspruch eingelegt werden …"
- Anlagen: Berechnungsblatt, Einspruchs-Hinweis
- Frist-Floskel: „innerhalb eines Monats nach Bekanntgabe"

**2. Krankenkasse Beitragsfestsetzung (freiwillig versichert / Selbstständige:r)**
- Absender: „Techniker Krankenkasse — Bramfelder Straße 140, 22305 Hamburg"
- Betreff: „Festsetzung des Beitrags zur Kranken- und Pflegeversicherung — Versicherungsnummer [MOCK] A123456780"
- Aktenzeichen: `[MOCK] A123456780`
- Body-Auszug: „Wir setzen Ihren Beitrag ab dem 01.06.2026 wie folgt fest: KV 421,17 €/Monat, PV 76,12 €/Monat. Gegen diesen Bescheid kann innerhalb eines Monats nach Bekanntgabe Widerspruch erhoben werden …"
- Anlagen: Berechnungsblatt, Widerspruchs-Hinweis
- Frist-Floskel: „innerhalb eines Monats nach Bekanntgabe"

**3. Beitragsservice Rundfunk Mahnung**
- Absender: „ARD ZDF Deutschlandradio Beitragsservice, 50656 Köln"
- Betreff: „Festsetzungsbescheid — Beitragsnummer [MOCK] 731 042 088"
- Aktenzeichen: `[MOCK] 731 042 088`
- Body-Auszug: „Trotz mehrfacher Aufforderung haben Sie den Rundfunkbeitrag in Höhe von 109,80 € bislang nicht entrichtet. Wir setzen den rückständigen Beitrag hiermit förmlich fest …"
- Anlagen: Zahlungsaufforderung, Vollstreckungs-Hinweis
- Frist-Floskel: „binnen vier Wochen nach Zustellung"

**4. ABH Verlängerungs-Erinnerung Aufenthaltstitel**
- Absender: „Landesamt für Einwanderung Berlin — Friedrich-Krause-Ufer 24, 13353 Berlin"
- Betreff: „Ihr Aufenthaltstitel nach § 18g AufenthG — Aktenzeichen [MOCK] ABH-B-2026/IV-A-7842"
- Aktenzeichen: `[MOCK] ABH-B-2026/IV-A-7842` + eAT-CAN `[MOCK] T0123456X`
- Body-Auszug: „Wir weisen Sie darauf hin, dass Ihre Aufenthaltserlaubnis nach § 18g AufenthG am 30.09.2026 abläuft. Bitte stellen Sie spätestens am 04.08.2026 einen Antrag auf Verlängerung. Beachten Sie Ihre Mitwirkungspflichten nach § 82 AufenthG …"
- Anlagen: Nachweis-Checkliste, Hinweisblatt § 82 AufenthG
- Frist-Floskel: „spätestens am [DATUM]"

**5. Familienkasse Nachweis-Aufforderung**
- Absender: „Familienkasse Berlin-Brandenburg — 14460 Potsdam"
- Betreff: „Ihr Kindergeld — Kindergeldnummer [MOCK] 115FK154721"
- Aktenzeichen: `[MOCK] 115FK154721`
- Body-Auszug: „Zur weiteren Prüfung Ihres Kindergeldanspruchs bitten wir um Vorlage einer aktuellen Schulbescheinigung Ihrer Tochter [Name] für das Schuljahr 2026/27. Bitte reichen Sie die Unterlagen bis zum 30.06.2026 ein …"
- Anlagen: Vordruck KG-Nachweis
- Frist-Floskel: „bis zum [DATUM]"

**6. Bürgeramt Termin-Bestätigung / Meldebestätigung**
- Absender: „Bezirksamt Mitte von Berlin — Bürgeramt Müllerstraße"
- Betreff: „Ihre Anmeldung nach § 17 BMG vom 02.05.2026 — Aktenzeichen [MOCK] BA-MITTE/EWA-2026-04-0083421"
- Aktenzeichen: `[MOCK] BA-MITTE/EWA-2026-04-0083421`
- Body-Auszug: „Hiermit bestätigen wir Ihren Wohnsitz unter folgender Anschrift mit Wirkung zum 01.05.2026: Musterstraße 12, 10115 Berlin. Diese Meldebestätigung ersetzt nicht die Wohnungsgeberbestätigung nach § 19 BMG …"
- Anlagen: Hinweisblatt § 33–34 BMG, Datenblatt Datenübermittlung
- Frist-Floskel: keine — rein informative Bestätigung

### Frist-Floskeln zur Extraktion (Regex-Anker)

Wiederkehrende Phrasen, die die LLM/Regex-Pipeline reliable identifiziert:

- „innerhalb eines Monats nach Bekanntgabe" (Standard Widerspruch/Einspruch — VwGO § 70, AO § 355, SGG § 84)
- „innerhalb eines Monats nach Zustellung" (Variante Zustellung iSv VwZG)
- „binnen vier Wochen" (vor allem Beitragsservice, Krankenkasse-Selbstverwaltung)
- „bis zum [DATUM]" (Frist ohne festes Schema; sehr verbreitet bei Nachweis-Aufforderungen, Zahlungsaufforderungen)
- „spätestens am [DATUM]" (Variante)
- „innerhalb von zwei Wochen" (Bußgeldverfahren OWiG § 67 Einspruch; Wiedereinsetzung VwVfG § 32)
- „mit Wirkung zum [DATUM]" (rückwirkende Geltung von Bescheiden)
- „am Tag nach dem Abruf" (§ 41 Abs. 2a VwVfG-Wortlaut bei Portal-Zustellung)
- „am vierten Tag nach …" (§ 41 Abs. 2 VwVfG / § 122 Abs. 2 AO / § 122a Abs. 4 AO Bekanntgabefiktion)

### Watermark `[MOCK]`-Konvention

- Im Brief-Header (visuell als Banner): `[MOCK – Verwaltungsdemo, keine echten Daten]`
- Im Aktenzeichen (string): `[MOCK]` als Präfix oder Infix, z.B. `[MOCK] 11/123/45678`
- In Beträgen: keine Markierung nötig (synthetisch klar erkennbar)
- In Personen-/Adressdaten: keine zusätzliche Markierung; Persona-Daten sind bereits über `personas.json` als synthetisch deklariert
- In allen LLM-Antworten zur Brief-Erklärung: System-Prompt enthält Hinweis „Dies ist ein synthetischer Mock-Brief; gib keine konkrete rechtliche Bewertung, sondern allgemeine Information."

## Legal disclaimer to surface in UI

Vier kurze, in `de.json` zu platzierende Strings (deutsch, Sie-Form, knapp):

**1. „Eröffnen löst keine Frist aus" — `posteingang.disclaimer.opening`**

> „Hinweis zum Öffnen: Diese App ist eine Lese- und Erklär-Schicht. Das Öffnen einer Brief-Karte hier löst **keine** rechtliche Bekanntgabe aus. In Ihrem amtlichen Postfach (z. B. Mein ELSTER, ZBP/BundID, Krankenkassen-Portal) gilt jedoch: Bescheide gelten dort regelmäßig am **vierten Tag nach Bereitstellung** als bekannt gegeben (§ 122a Abs. 4 AO bzw. § 41 Abs. 2 VwVfG) — unabhängig davon, ob Sie sie tatsächlich gelesen haben. Bitte rufen Sie Ihre amtlichen Postfächer regelmäßig ab."

**2. „Keine Rechtsberatung" — `posteingang.disclaimer.no_legal_advice`**

> „Diese KI-Erklärung ist eine **allgemeine Information**, keine Rechtsberatung im Sinne des Rechtsdienstleistungsgesetzes (§ 2 RDG). Sie dient ausschließlich dem Verständnis. Eine konkrete rechtliche Bewertung Ihres Einzelfalls — etwa ob ein Widerspruch erfolgversprechend ist — kann nur durch eine zur Rechtsdienstleistung befugte Person (Anwält:in, registrierte Inkassodienstleister:in, Verbraucherzentrale, Sozialverband) erfolgen. Vorschläge zu Antworten oder Fristen sind unverbindlich; die Verantwortung für jede Eingabe und jeden Versand liegt bei Ihnen."

**3. „Demo-Briefe sind synthetisch" — `posteingang.disclaimer.mock_data`**

> „Alle hier angezeigten Briefe, Aktenzeichen und Personen-Daten sind synthetisch und mit `[MOCK]` gekennzeichnet. Diese Demo verarbeitet keine echten Behördenbriefe. Bitte fügen Sie keine echten Briefe oder personenbezogenen Daten ein — die Demo ist für die Verarbeitung sensibler Informationen nicht freigegeben."

**4. „Originaltext ist maßgeblich" — `posteingang.disclaimer.original_authoritative`**

> „Rechtsverbindlich ist ausschließlich der deutsche Originaltext des Bescheids. Die KI-Zusammenfassung und etwaige Übersetzungen sind reine Verständnis-Hilfen. Im Zweifel zählt der Wortlaut der Behörde — nicht die KI-Wiedergabe. Klicken Sie „Originalbrief anzeigen", um den vollständigen Wortlaut zu lesen."

**Zusätzliche kontext-spezifische Disclaimer (kürzer, inline):**

- *Vor* AI-Summary-Generierung: „Zusammenfassung wird mit KI erstellt — bitte gleichen Sie wichtige Angaben mit dem Originaltext ab."
- *Vor* einer „Antwort vorschlagen"-Aktion: „Der Antwortvorschlag ist eine Vorlage. Bitte prüfen Sie Inhalt und Empfänger vor dem Versand. Versand erfolgt nicht automatisch."
- *Vor* einer „Frist in Kalender eintragen"-Aktion: „Diese Frist ist aus dem Brief automatisch erkannt worden. Originalformulierung: „[ZITAT]". Bitte verifizieren Sie das Datum."

## Zusätzliche Risikofelder, die der Mock vermeiden muss

1. Keine Suggestion einer technischen Anbindung an ZBP, BundID, Mein ELSTER, FIT-Connect, einer Krankenkassen-API oder eines Behörden-Portals. Alle Briefe stammen aus `letters.json` und tragen die `[MOCK]`-Markierung. Eine Aussage „wir holen Ihren Steuerbescheid von Mein ELSTER" wäre rechtlich (§ 87a AO) und faktisch (keine Citizen-API) falsch.
2. Keine Speicherung gescannter echter Briefe — der `letterUpload`-Flow ist im Demo-Scope **deaktiviert oder rein synthetisch**. (Wenn ein Upload-Feld gezeigt wird, dann nur als „Coming soon"-Platzhalter mit Disclaimer.)
3. Keine Auto-Versand-Funktion für Antworten. Jeder „Antwort vorschlagen"-Pfad endet in einer 3-Schritt-UX (Vorlage → Bürger:in-Edit → Versand-Button mit eID-Bestätigung) — siehe research-scout 4e. Dieser Pfad ist Smartlaw/BGH-I-ZR-113/20-konform, aber die Demo macht den letzten Schritt **bewusst nicht funktional**, sondern simuliert ihn.
4. Keine Aussage „Frist verpasst = Geld verloren" als Drohnotation. Säumniszuschläge sind real (§ 240 AO: 1 % pro Monat) und der Hinweis darauf ist sachlich gerechtfertigt — er muss aber als Information formuliert sein, nicht als Druck.
