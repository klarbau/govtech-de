---
vorgang: stammdaten
title: Single-Source-of-Truth Bürger:innen-Profil
last_validated: 2026-05-08
sources:
  - https://www.gesetze-im-internet.de/bmg/__3.html
  - https://www.gesetze-im-internet.de/bmg/__34.html
  - https://www.gesetze-im-internet.de/bmg/__34a.html
  - https://www.gesetze-im-internet.de/bmg/__36.html
  - https://www.gesetze-im-internet.de/bmg/__42.html
  - https://www.gesetze-im-internet.de/bmg/__50.html
  - https://www.gesetze-im-internet.de/bmg/__51.html
  - https://www.verwaltungsvorschriften-im-internet.de/bsvwvbund_27092022_VII2201041418.htm
  - https://www.gesetze-im-internet.de/idnrg/__4.html
  - https://www.gesetze-im-internet.de/idnrg/__9.html
  - https://www.gesetze-im-internet.de/sbgg/__2.html
  - https://www.gesetze-im-internet.de/sbgg/__4.html
  - https://www.gesetze-im-internet.de/sbgg/__5.html
  - https://www.gesetze-im-internet.de/pstg/__45b.html
  - https://www.gesetze-im-internet.de/ao_1977/__139b.html
  - https://www.gesetze-im-internet.de/ozg/__8.html
  - https://www.gesetze-im-internet.de/aufenthg_2004/__86.html
  - https://www.gesetze-im-internet.de/aufenthg_2004/__87.html
  - https://www.gesetze-im-internet.de/azrg/
  - https://www.gesetze-im-internet.de/sgb_5/__290.html
  - https://www.gesetze-im-internet.de/sgb_4/__18f.html
  - https://www.gesetze-im-internet.de/bdsg_2018/__22.html
  - https://dsgvo-gesetz.de/art-9-dsgvo/
  - https://dsgvo-gesetz.de/art-15-dsgvo/
  - https://dsgvo-gesetz.de/art-16-dsgvo/
  - https://eudi.dev/1.4.0/annexes/annex-3/annex-3.01-pid-rulebook/
  - https://www.kba.de/DE/Presse/Pressemitteilungen/Allgemein/2026/pm16_2026_ida_anbindung.html
  - https://www.finanzen.bremen.de/digitalisierung/digitalisierungsbuero/datenschutzcockpit/faq-haeufig-gestellte-fragen-zum-datenschutzcockpit/faq-zum-datenschutzcockpit-fuer-oeffentliche-stellen-seite-1-123426
---

> **Hinweis zum Geltungsbereich**
> Dies ist *keine* Vorgangs-Spezifikation, sondern eine *horizontale Capability* — ein einheitliches Bürger:innen-Profil, das Felder aus mehreren öffentlichen Registern aggregiert anzeigt und pro Feld den korrekten Korrekturweg ausweist. Die Demo ist eine **Lese- und Wegweiser-Schicht**, keine Schreib-Schicht. § 34/§ 36 BMG erlauben Datenflüsse ausschließlich zwischen öffentlichen Stellen mit gesetzlicher Spezialgrundlage; eine private App kann nicht in das Melderegister schreiben oder fremde Behörden auf Bürger:innen-Wunsch automatisch beliefern. Die Konventionen unten gelten persona-agnostisch für jede:n Bürger:in.

## Beteiligte Akteure (Tabelle: Behörde — Stammdaten — Korrekturweg)

| Behörde / Stelle | Welche Stammdaten | Korrekturweg | Föderale Ebene | Rechtsgrundlage |
|---|---|---|---|---|
| Meldebehörde (Bürgeramt / Einwohnermeldeamt) | 19 Pflicht- + 10 Zusatz-Datenpunkte nach § 3 BMG (Name, Geburts-, Anschrift-, Familienstand-, Ehegatten-, Kinder-, Ausweis-, Sperrdaten, Religion, Staatsangehörigkeit, AZR-Nr., Lohnsteuermerkmale u.a.) | Persönliche Anmeldung § 17 BMG; eWA online (sofern angeschlossen, eID erforderlich); Standesamt für Folgeeinträge (Heirat, Geburt, Sterbefall, § 45b PStG) | kommunal (Vollzug Land) | § 3, § 17 BMG |
| Standesamt | Geburts-, Ehe-, Lebenspartnerschafts-, Sterbeurkunden; Geschlechts-/Vornamen-Änderung nach SBGG | Persönlich beim zuständigen Standesamt; bei SBGG: persönliche Anmeldung 3 Monate vorab + persönliche Erklärung (§ 4 SBGG) | kommunal | PStG, BGB §§ 1303 ff., SBGG, § 45b PStG (für Personen mit Variante der Geschlechtsentwicklung) |
| Bundeszentralamt für Steuern (BZSt) | Steuer-Identifikationsnummer (§ 139b AO), Religionsmerkmal-Datenbank (KiStAM) | IdNr nicht änderbar; Korrektur fehlerhafter Speicherung über Antrag beim BZSt; Religionsmerkmal über Standesamt (Kirchen­ein-/-austritt) → KiStAM-Update | Bund | § 139b AO; § 51a EStG i.V.m. KiStAM-VO |
| Finanzamt | Steuernummer (länderspezifisch), Lohnsteuerabzugsmerkmale (ELStAM), Bankverbindung für Erstattungen, Steuerklasse | Mein ELSTER (online); ELSTER-Antrag auf Lohnsteuerermäßigung; bei Bezirkswechsel automatische Aktenabgabe via § 36 BMG-Push | Land (Vollzug); Recht Bund | AO §§ 30, 87a, 139b; EStG § 39 ELStAM |
| Familienkasse (bei Bundesagentur für Arbeit) | Kindergeldnummer, Kind-Stammdaten, Bankverbindung für Kindergeld | Online-Antrag auf „Mein Familienportal" / „Kindergeld online"; Mitteilungspflicht § 68 EStG | Bund (BA) | EStG §§ 62 ff., § 68 EStG |
| Krankenkasse (gesetzlich) | Krankenversichertennummer (KVNR § 290 SGB V), Mitgliedsstatus, beitragsrelevante Stammdaten | Direkt im Kassen-Portal; KVNR ist lebenslang und kassenübergreifend (§ 290 Abs. 1 S. 2 SGB V) | Selbstverwaltung (öff.-rechtl. Körperschaft) | § 290 SGB V; SGB IV; SGB V |
| Krankenkasse (privat) | Versicherungsnummer, Vertragsdaten | Direkt beim PKV-Unternehmen | Privatrecht (VVG) | Versicherungsvertrag |
| Deutsche Rentenversicherung (DRV) | Versicherungsnummer (12-stellig, § 147 SGB VI), Versicherungsverlauf | Adressänderung läuft idR über Arbeitgeber-DEÜV-Meldung (§ 28a SGB IV); direkter Antrag bei DRV möglich | Selbstverwaltung (Bund) | § 147 SGB VI, § 18f SGB IV, DEÜV |
| Ausländerbehörde (LEA / ABH / KVR-Ausländeramt) | Aufenthaltsstatus, eAT-CAN-Nummer, Auflagen, AZR-Daten (im AZR beim BAMF gespeichert) | Persönlicher ABH-Termin (eAT-Adress-Update erfolgt nicht automatisch durch Meldeamt); Mitwirkungspflicht § 82 AufenthG | kommunal/Land | AufenthG §§ 86, 87; AZRG; AZRG-DV |
| BAMF | Asyl-/Schutz-Akte, AZR-Stammdatensatz | Anhörungs-/Bescheidverfahren; Mitteilungspflicht ABH leitet weiter | Bund | AsylG, AZRG |
| Bundeswehr / BAPersBw | Wehrerfasste Personen — Name, Anschrift, Geburtsdatum (Erfassung) | Automatischer § 36-BMG-Push aus Melderegister | Bund | § 58c SG i.V.m. § 36 BMG |
| ARD ZDF Deutschlandradio Beitragsservice | 9-stellige Beitragsnummer, Wohnungs-Adresse | Automatischer § 36-BMG-Push (Adresse); An-/Ab-/Ummeldung der Beitragspflicht direkt beim Beitragsservice | Länder (Staatsvertrag) | § 11 Abs. 4 RBStV i.V.m. § 36 BMG |
| Religionsgesellschaft (öff.-rechtl. Körperschaft) | Religionszugehörigkeit, Adresse | § 42 BMG-Push der Meldebehörde an Kirchen; Eintritt/Austritt am Standesamt → KiStAM | Selbstverwaltung | § 42 BMG; Landeskirchensteuergesetze |
| BVA — IDA / Datenschutzcockpit | Basisdaten zur IDNr-Auflösung (§ 4 IDNrG: 11 Felder); 2-Jahres-Übermittlungsprotokoll (§ 9 IDNrG) | Korrektur in den jeweiligen Quell-Registern; DSC ist Lese-/Audit-Layer, keine Korrektur-Schicht | Bund | IDNrG §§ 4, 9; RegMoG |
| BundID / DeutschlandID-Konto | Identitäts- + Kontaktdaten + Postfach (siehe § 8 OZG) | Felder aus eID/ELSTER-Zertifikat sind nach Speicherung gesperrt; Kontaktdaten (E-Mail, Mobil) sind self-edit | Bund | § 8 OZG; § 9 OZG |
| KFZ-Zulassungsstelle / KBA | Halter-Anschrift, Kennzeichen, VIN | Mitteilung des Halters § 15 FZV; **kein** automatischer § 36-BMG-Push | kommunal (Vollzug Land); KBA Bund | § 15 FZV; FZV-Register beim KBA |

> **Föderalismus-Hinweis**: Steuerverwaltung ist *Land* (Vollzug) auch wenn das materielle Recht *Bund* ist — daher erscheint das Finanzamt als Land-Stelle, aber die Steuer-IdNr (§ 139b AO) liegt beim *bundesweiten* BZSt. Die KFZ-Zulassung ist *kommunal* (Vollzug) auf Basis der bundesrechtlichen FZV; der KBA-Bestand ist *Bund*.

## Erforderliche Rechtsgrundlagen

| Datenkategorie | DSGVO-Art. (Mock: privatrechtliche Demo-App) | DSGVO-Art. (echt-prod: öffentlich-rechtlicher Aggregator) | BDSG / Spezialnorm |
|---|---|---|---|
| Stammdaten der/des Bürger:in (Name, Anschrift, Geburtsdatum, Familienstand, Familie) | Art. 6 Abs. 1 lit. a (Einwilligung) + lit. b (Vertrag App ↔ Bürger:in) | Art. 6 Abs. 1 lit. e (öffentliche Aufgabe) i.V.m. § 8 OZG (Nutzerkonto) und § 3 BMG | § 3 Abs. 2 BDSG, § 22 BDSG |
| Steuer-Identifikationsnummer (§ 139b AO) | Art. 6 Abs. 1 lit. a (Einwilligung) | Art. 6 Abs. 1 lit. c + lit. e i.V.m. § 139b AO | AO §§ 30, 139b; IDNrG §§ 4, 5 |
| Religionszugehörigkeit (§ 3 Abs. 1 Nr. 11 BMG) | Art. 9 Abs. 2 lit. a (**ausdrückliche** Einwilligung) | Art. 9 Abs. 2 lit. b (Sozialschutz) i.V.m. KiStAM, § 51a EStG, Landeskirchensteuergesetze | § 22 BDSG; nur Anzeige unter Art-9-Schutzmaßnahmen |
| Aufenthaltsstatus / AZR-Nummer | Art. 9 Abs. 2 lit. a (mittelbar Art-9-relevant: zeigt Herkunft/Asylhintergrund) | Art. 6 Abs. 1 lit. e + AZRG | § 22 BDSG; AZRG; AufenthG § 86 |
| KVNR + Versicherungsstatus | Art. 9 Abs. 2 lit. a (sofern Diagnose-/Krankheitsbezug); sonst Art. 6 lit. a/b | Art. 9 Abs. 2 lit. h (Sozialschutz, GKV); SGB V § 290; SGB X §§ 67 ff. | § 22 BDSG; SGB X (Sozialgeheimnis) |
| Bankverbindung / IBAN | Art. 6 Abs. 1 lit. a (Einwilligung) | Art. 6 Abs. 1 lit. e (sofern Behörde Erstattungen leistet) | — |
| Geschlecht / Geschlechtsidentität (§ 3 Abs. 1 Nr. 7 BMG, § 22 PStG, SBGG) | Art. 9 Abs. 2 lit. a (Einwilligung; Geschlechtsidentität ist nach BfDI/EDPB Art-9-relevant) | Art. 9 Abs. 2 lit. g (öffentl. Interesse) i.V.m. PStG, SBGG | § 22 BDSG |
| Audit-Log (Übermittlungsprotokoll) | Art. 6 Abs. 1 lit. a + lit. f | Art. 6 Abs. 1 lit. c + lit. e i.V.m. § 9 IDNrG (2-Jahres-Speicherfrist) | IDNrG § 9 |

> **Hoheitlich vs. Private**
> Eine Demo-App, die Bürger:innen freiwillig nutzen, ist **kein** Träger öffentlicher Gewalt iSv § 2 BDSG. Die korrekte Rechtsgrundlage ist daher **immer** lit. a (Einwilligung) bzw. lit. b (Vertrag), **nicht** lit. e. Erst die hypothetische, von Bund/Ländern betriebene 2027-Vision (BundID-Stammdatenservice + DSC) kann auf lit. e + Spezialgesetz zurückgreifen. Diese Trennung ist in jeder UI-Erklärung sauber zu wahren.

## Realistische Briefkopf-Phrasen + Aktenzeichen-Formate

> Carry-over aus `docs/domain/posteingang.md` für die Standard-Empfänger; ergänzt um Stammdaten-spezifische Anlassbriefe. Alle Beispiele sind synthetisch und mit `[MOCK]` markiert.

### Aktenzeichen / Identifier-Formate (verifiziert)

| Behörde | Format | Beispiel (synthetisch, [MOCK]) | Quelle |
|---|---|---|---|
| BZSt — Steuer-Identifikationsnummer | 11 Ziffern (§ 139b AO) | `[MOCK] 47 113 815 421` | AO § 139b |
| Finanzamt — Steuernummer (länderspezifisch) | NN/BBB/UUUUP (Berlin), NNNN/BBBB/UUUUP (NRW), NNN/BBB/UUUUP (BY) | `[MOCK] 11/123/45678` (Berlin), `[MOCK] 5333/2891/0815` (Düsseldorf), `[MOCK] 143/250/01234` (BY Pasing) | ELSTER-Hilfe |
| GKV — Krankenversichertennummer (KVNR) | 1 Großbuchstabe + 8 Ziffern + 1 Prüfziffer (Luhn), 10 Stellen sichtbar | `[MOCK] A123456780`, `[MOCK] M845192036`, `[MOCK] Q672013485` | § 290 SGB V; ITSG |
| DRV — Versicherungsnummer | 12 Stellen: 2 Bereich + 6 Geburtsdatum (TTMMJJ) + 1 Buchstabe (1. Buchstabe Geburtsname) + 2 Ziffern + 1 Prüfziffer | `[MOCK] 65 170395 P 042`, `[MOCK] 12 251182 K 071` | § 147 SGB VI |
| Familienkasse — Kindergeldnummer | 3-stelliger FK-Bezirk + "FK" + 6 Ziffern + 1 Auszahltermin = 11 Zeichen | `[MOCK] 115FK154721`, `[MOCK] 234FK892017` | BA-Familienkasse |
| Beitragsservice — Beitragsnummer | 9 Ziffern | `[MOCK] 731 042 088`, `[MOCK] 624 188 905` | rundfunkbeitrag.de |
| BAMF / AZR — AZR-Nummer | 7 Ziffern + "-" + 3 Ziffern (Herkunftsland-Code) | `[MOCK] 6724813-475` (475 = Syrien) | AZRG |
| ABH — eAT-CAN | 1 Buchstabe + 7 Ziffern + 1 Prüfbuchstabe (auf Karte) | `[MOCK] T0123456X`, `[MOCK] L9876543K` | BAMF-eAT-Doku |
| Bürgeramt / Einwohnermeldeamt | freies kommunales Az | `[MOCK] BA-MITTE/EWA-2026-04-0083421`, `[MOCK] KZ-EIM/UM-2026-117/8842` | Berlin BA / Hamburg KZ-Praxis |
| Standesamt — Geburts-/Ehe-/Sterbeurkunde | "<Stadtkürzel>-<Buchstabe>-NNNN/JJJJ" | `[MOCK] B-G-04711/2026` (Geburt), `[MOCK] HH-E-00892/2026` (Ehe), `[MOCK] M-S-01133/2026` (Sterbe) | StAG-Vollzug; lokal |
| Standesamt — Erklärung nach SBGG | "<Stadtkürzel>-SBGG-NNNN/JJJJ" | `[MOCK] B-SBGG-00118/2026` | SBGG § 4-Vollzug, Praxis-Annahme |
| BVA — IDA / DSC-Übermittlung | „IDA-Vorgangskennung" technisch (XÖV) | `[MOCK] IDA-2026-NRW-0044129` | RegMoG, IDNrG |

### Briefkopf-Standardphrasen pro Stammdaten-Anlass

**BZSt — Mitteilung der Steuer-Identifikationsnummer**
- Absender: „Bundeszentralamt für Steuern — An der Küppe 1, 53225 Bonn"
- Betreff: „Mitteilung Ihrer Identifikationsnummer nach § 139b der Abgabenordnung"
- Standardphrase: „Hiermit teilen wir Ihnen Ihre persönliche Identifikationsnummer mit. Sie gilt lebenslang und ist bei jedem Schriftverkehr mit den Finanzbehörden anzugeben. Identifikationsnummer: [MOCK] 47 113 815 421."
- Hinweis-Floskel: „Diese Mitteilung ist maschinell erstellt und auch ohne Unterschrift gültig."

**Bürgeramt — Meldebestätigung mit Datenkranz-Übermittlungsblatt**
- Absender: „Bezirksamt Mitte von Berlin — Bürgeramt Müllerstraße"
- Betreff: „Ihre Anmeldung nach § 17 BMG vom TT.MM.JJJJ — Aktenzeichen [MOCK] BA-MITTE/EWA-2026-04-0083421"
- Standardphrase: „Hiermit bestätigen wir Ihren Wohnsitz unter folgender Anschrift mit Wirkung zum [DATUM]: …"
- Datenkranz-Floskel: „Ihre Meldedaten werden nach §§ 33, 34, 36 BMG i.V.m. der Bundesmeldedaten-Übermittlungsverordnung sowie der Meldedaten-Übermittlungsverordnung des Landes Berlin regelmäßig an folgende Stellen übermittelt: Finanzamt, ARD ZDF Deutschlandradio Beitragsservice, Bundesamt für das Personalmanagement der Bundeswehr (sofern wehrerfasst), Religionsgesellschaft (sofern eingetragen)."

**Standesamt — Erklärung nach § 2 SBGG (Geschlechtseintrag) + Anmeldung § 4 SBGG**
- Absender: „Standesamt Berlin Mitte — Parochialstr. 1–3, 10179 Berlin"
- Betreff: „Ihre Anmeldung nach § 4 SBGG vom TT.MM.JJJJ — Aktenzeichen [MOCK] B-SBGG-00118/2026"
- Standardphrase: „Sie haben gegenüber dem Standesamt mündlich/schriftlich die Anmeldung zur Erklärung nach § 2 SBGG abgegeben. Die Erklärung kann frühestens drei Monate nach Anmeldung und spätestens sechs Monate nach Anmeldung persönlich beurkundet werden (§ 4 SBGG). Wir laden Sie zur persönlichen Beurkundung ein."
- Hinweis: „Eine erneute Erklärung nach § 2 SBGG ist gemäß § 5 SBGG erst ein Jahr nach erfolgter Beurkundung zulässig."

**BVA — Datenschutzcockpit-Auskunft**
- Absender: „Bundesverwaltungsamt — Barbarastr. 1, 50735 Köln"
- Betreff: „Ihre Anfrage zum Datenschutzcockpit — Vorgangskennung [MOCK] IDA-2026-NRW-0044129"
- Standardphrase: „In den letzten 24 Monaten wurden zu Ihrer Identifikationsnummer folgende Datenübermittlungen zwischen öffentlichen Stellen protokolliert (§ 9 IDNrG): …"
- Hinweis: „Diese Auskunft umfasst ausschließlich Übermittlungen von und an Register, die an das Verfahren Identitätsdatenabruf (IDA) angebunden sind. Andere Datenflüsse zwischen Behörden sind nicht hier protokolliert."

## Häufige Hürden für Bürger:innen

- **„Eine Adresse, viele Stellen"-Trugschluss** (carry-over aus `umzug.md` und `posteingang.md`): Bürger:innen glauben, das Meldeamt informiere alle Stellen. Realität: §§ 34, 36 BMG i.V.m. den Spezialnormen (RBStV § 11 Abs. 4, § 58c SG, § 19 BMG, AO § 139b, KiStAM-VO sowie landesrechtliche Meldedaten-Übermittlungsverordnungen) erfassen Finanzverwaltung, Beitragsservice, Wehrverwaltung, Religionsgesellschaften und teils GKV. **Nicht** automatisch erfasst sind: KFZ-Zulassungsstelle, Ausländerbehörde (eAT-Karte), private Krankenversicherung, Bank, Arbeitgeber, Versicherer, Vermieter.
- **DEÜV-Adressfluss zur GKV** ist ein Sonderfall: GKVen erhalten Versicherten-Adressänderungen über den DEÜV-Meldefluss (Arbeitgeber → Datenstelle der Träger der Rentenversicherung → KK) bzw. — bei Nicht-Beschäftigten — über den Push der Meldebehörden gemäß landesrechtlichen Übermittlungsvorschriften. Ob ein „direkter automatischer Push aus dem Melderegister an die GKV" besteht, ist je nach Versichertenkonstellation und Bundesland heterogen; Bürger:innen sollten die Adressänderung im Zweifel **aktiv** im Krankenkassen-Portal nachvollziehen. *(Anmerkung zur research-scout-Aussage: GKVen erhalten Adressdaten heute zuverlässig — die Behauptung „komplett ohne Aktion" ist im Regelfall korrekt für Beschäftigte; für freiwillig Versicherte und Selbstständige bleibt eine Eigen-Mitteilung empfehlenswert.)*
- **Begriffsverwirrung autoritative Quelle**: Bürger:innen wissen nicht, dass das Melderegister 19 Pflichtfelder hält (§ 3 BMG), aber **nicht** Steuerklasse, Bankverbindung oder Beschäftigungsdaten. ELStAM ist beim BZSt zentral, materielle Steuerakten sind beim Finanzamt; KVNR liegt bei der jeweiligen Krankenkasse, bleibt aber kassenübergreifend lebenslang gleich (§ 290 Abs. 1 S. 2 SGB V).
- **„IBAN ist überall hinterlegt"-Frust**: IBAN für Steuererstattung, Kindergeld, Krankengeld, BAföG, Wohngeld, Elterngeld muss heute pro Behörde separat hinterlegt werden. Es gibt **keinen** zentralen IBAN-Stammdatenservice in BundID (Stand 2026-05-08).
- **Religionsmerkmal-Update-Fall** (§ 3 Abs. 1 Nr. 11 BMG): Kirchenein-/-austritt erfolgt am Standesamt (Land); KiStAM beim BZSt wird über elektronische Schnittstelle aktualisiert; Lohnsteuerabzug zieht erst zum Folge-Veranlagungszeitraum nach. Bürger:innen erwarten Sofortwirkung — die ist nicht gegeben.
- **§ 51 BMG-Sperren-Verwirrung**: Auskunftssperre (§ 51 Abs. 1 BMG, mit Begründung, 2 Jahre) und Übermittlungssperren (z.B. §§ 42 Abs. 3, 50 Abs. 5 BMG, ohne Begründung, unbefristet) werden im Volksmund beide „Auskunftssperre" genannt — sind aber rechtlich unterschiedliche Institute mit unterschiedlichen Voraussetzungen.
- **eAT-Karten-Adresse bleibt veraltet**: Die Anschrift auf der elektronischen Aufenthaltskarte wird **nicht** durch die Meldebehörde aktualisiert. Drittstaatsangehörige müssen einen separaten ABH-Termin buchen — Pain-Pattern aus `umzug.md`.
- **Bekanntgabe-Fiktion auch bei BundID-Postfach** (§ 41 Abs. 2a VwVfG, § 122a Abs. 4 AO): Wer einmal in das ZBP/BundID-Postfach eingewilligt hat, riskiert, dass Verwaltungsakte am 4. Tag nach Bereitstellung als bekanntgegeben gelten — auch ohne tatsächliches Lesen.
- **Geschlechtseintrag SBGG**: Verbreitet wird angenommen, der Eintrag könne online oder auf Selbst-Erklärung sofort geändert werden. Realität (seit 01.11.2024): zwingend persönliche **Anmeldung** beim Standesamt + drei-Monats-Wartefrist + persönliche **Erklärung** (§§ 2, 4 SBGG); danach **ein Jahr Sperrfrist** für eine erneute Erklärung (§ 5 SBGG).

## Auto-fill / Automation-Potenzial

| Feld | Quellregister (autoritativ) | Heute verfügbar? | Was bräuchte es? |
|---|---|---|---|
| Name, Geburtsdaten, Geschlecht, Staatsangehörigkeit, Adresse | Melderegister (BMG § 3) | Bürger:in-Sicht: nur über Meldebescheinigung-Antrag oder § 10 BMG-Selbstauskunft | DSC-Frontend mit erweiterter Datenkranz-Sicht; Anbindung der Meldebehörden an IDA + DSC |
| Steuer-IdNr | BZSt | Bürger:in-Sicht: per Brief; in BundID nicht systematisch eingebunden | RegMoG-Anbindung BZSt → DSC; dauerhafte Spiegelung als „read-only badge" in BundID-Profil |
| ELStAM (Steuerklasse, Freibeträge, Religionsmerkmal) | BZSt-ELStAM | ja, über Mein ELSTER und Lohnabrechnung Arbeitgeber | direkte API-Spiegelung BZSt → BundID-Profil — nicht implementiert |
| KVNR + Mitgliedsstatus | jeweilige Krankenkasse | nur im Kassen-Portal | EUDI-Wallet-Attestation „GKV-Mitgliedsnachweis" → portierbar; ARF-Roadmap 2027+ |
| DRV-Versicherungsnummer + Versicherungsverlauf | DRV | Versicherungsverlauf-Auskunft auf Antrag (§ 109 SGB VI); online im DRV-Konto | API-Spiegelung DRV → BundID; nicht implementiert |
| Aufenthaltsstatus + AZR-Nr. | AZR (BAMF) | Bürger:in-Sicht: Selbstauskunft AZR § 34 AZRG, schriftlich/postalisch | DSC-Anbindung AZR; politisch sensibel (Sozialdatenschutz) |
| Familienverbund (Ehegatte, Kinder) | Melderegister + Standesamt | nur über Meldebescheinigung; Familienkasse hält Kind-Stammdaten | DSC-Sicht „Familie"; Verknüpfung Melderegister ↔ Familienkasse |
| Bankverbindung (IBAN für Erstattungen) | dezentral pro Behörde | nein, jede Behörde separat | **Spekulative 2027-Vision**: zentraler IBAN-Stammdatenservice in BundID mit consent-driven Push pro Behörde — gesetzlich heute (Mai 2026) nicht vorgesehen |
| Religionszugehörigkeit | Melderegister + KiStAM (BZSt) | im Steuerbescheid / Lohnabrechnung sichtbar | Art-9-konformer Anzeige-Slot (hidden by default mit Disclaimer) |
| Audit-Log Datenübermittlungen | DSC (BVA + Bremen, § 9 IDNrG) | Pilot-Betrieb, sukzessive Anbindung; KBA-IDA-Anbindung seit 15.04.2026 | Anbindung weiterer Register (RegMoG-Roadmap); Bürger:innen-Frontend `datenschutzcockpit.bund.de` |
| Auskunfts-/Übermittlungssperren (§§ 51, 42 Abs. 3, 50 Abs. 5 BMG) | Melderegister | persönlicher Antrag bei Meldebehörde; in Berlin teils online | Self-Service-Toggle in Melderegister-Schnittstelle; technisch realisierbar, rechtlich heute Antrag erforderlich |

## Realistic mock-data hints — Profil-Snapshots

> Maximal 5 Beispiel-Felder pro Persona, alle synthetisch und mit `[MOCK]` markiert.

### Anna Petrov (29, EU-Bürgerin, Berlin)
- Familienname: Petrov · Vornamen: Anna
- Anschrift: `[MOCK]` Skalitzer Str. 88, 10997 Berlin (autoritativ: Bürgeramt Friedrichshain-Kreuzberg)
- Steuer-IdNr: `[MOCK] 47 113 815 421` (BZSt)
- KVNR (TK): `[MOCK] A123456780` (§ 290 SGB V)
- Auskunfts-/Übermittlungssperren: keine; Religionszugehörigkeit: ohne

### Familie Schmidt (Eltern + 2 Kinder, München)
- Eheschließung: `[MOCK] M-E-00471/2024` Standesamt München
- Steuernummer (FA München-Pasing): `[MOCK] 143/250/01234`
- Kindergeldnummer: `[MOCK] 234FK892017` (Familienkasse Bayern Süd)
- Anschrift: `[MOCK]` Lindwurmstr. 142, 80337 München
- Religionszugehörigkeit: rk (beide Eltern); KiStAM-Mitteilung BZSt `[MOCK] KiStAM 47 113 815 421 / rk`

### Mehmet Yıldız (38, Selbstständiger, Drittstaatsangehöriger, Köln)
- Anschrift: `[MOCK]` Venloer Str. 312, 50825 Köln
- Aufenthaltstitel § 21 AufenthG; eAT-CAN `[MOCK] T0123456X`; AZR-Nr. `[MOCK] 6724813-090`
- Steuernummer (FA Köln-Mitte): `[MOCK] 217/5031/0815`
- KVNR (freiwillig versichert AOK): `[MOCK] M845192036`
- IBAN für Steuererstattung (self-edit BundID-Profil): `[MOCK] DE89 3704 0044 0532 0130 00`

## Legal disclaimers to surface in UI

Mindestens drei verbindliche `de.json`-Strings (Sie-Form, knapp). Diese sind verbatim in `de.json` zu übernehmen; weitere kontext-spezifische Disclaimer in `posteingang.md` bleiben unberührt.

**1. „Lese- und Wegweiser-Schicht" — `stammdaten.disclaimer.lese_schicht`**

> „Diese App ist eine **Lese- und Wegweiser-Schicht**. Sie selbst nimmt **keine** Änderungen an Ihren Daten in den zuständigen Registern vor. Korrekturen erfolgen ausschließlich im jeweiligen Behörden-Verfahren — etwa beim Bürgeramt nach § 17 BMG für die Anschrift, beim Standesamt nach PStG für Familienstand und Vornamen, beim Standesamt nach § 4 SBGG für den Geschlechtseintrag, beim Bundeszentralamt für Steuern für die Identifikationsnummer (§ 139b AO). Wir zeigen Ihnen pro Feld den richtigen Weg an."

**2. „Aktivitätsprotokoll ist app-intern" — `stammdaten.disclaimer.audit_log_app_internal`**

> „Das hier sichtbare Aktivitätsprotokoll erfasst ausschließlich Ihre Aktivitäten in dieser App (Aufrufe, Filter, Selbst-Editierungen). Es ist **keine** behördliche Audit-Spur. Den behördlichen Audit-Layer für IDNr-basierte Datenübermittlungen zwischen öffentlichen Stellen liefert das Datenschutzcockpit nach § 9 IDNrG mit einer Speicherfrist von 24 Monaten — abrufbar unter datenschutzcockpit.bund.de, sobald die jeweiligen Register angebunden sind."

**3. „EUDI-Wallet-Drittanbieter-Consent ist 2027-Vision" — `stammdaten.disclaimer.eudi_speculative`**

> „Die hier gezeigte Funktion, Stammdaten als Wallet-Nachweis (Attestation) an private Empfänger — etwa Bank, Vermieter:in, Energieversorger — auf Klick freizugeben, simuliert eine **Vision für 2027**. Sie basiert auf der EUDI-Wallet-Verordnung (EU) 2024/1183 und dem Architecture and Reference Framework v1.x.x. Die Pflicht zur Bereitstellung einer EUDI-Wallet greift in Deutschland frühestens 2026/2027; Drittanbieter-Akzeptanz, Trust-Service-Konformität und Gebührenmodelle sind noch nicht verbindlich geregelt."

**4. Zusatz-Disclaimer (kürzer, inline) — `stammdaten.disclaimer.iban_speculative`**

> „Eine zentrale IBAN-Hinterlegung mit automatischer Übergabe an Familienkasse, Finanzamt und Krankenkasse ist heute (Mai 2026) **nicht** verfügbar. Diese Demo simuliert ein 2027-Pattern. Aktuell müssen Sie Ihre Bankverbindung pro Behörde separat hinterlegen."

**5. Zusatz-Disclaimer Religion — `stammdaten.disclaimer.religion_art9`**

> „Die Religionszugehörigkeit ist eine besondere Kategorie personenbezogener Daten nach Art. 9 DSGVO. Sie wird hier nur auf Klick eingeblendet. Speicherung im Melderegister beruht auf § 3 Abs. 1 Nr. 11 BMG; die Verwendung zur Lohn- und Einkommensteuer auf § 51a EStG i.V.m. KiStAM (BZSt)."

## Zusätzliche Risikofelder, die der Mock vermeiden muss

1. **Keine Suggestion einer technischen Anbindung an Melderegister, BZSt-IdNr-Datenbank, AZR, KBA-FZV-Register, KiStAM, GKV-Spitzenverband oder DSC.** Alle Profil-Felder werden aus `personas.json` und `seed.ts` befüllt. Eine Aussage wie „wir holen Ihre Adresse aus dem Melderegister Berlin" wäre rechtlich (§ 34 BMG: keine privaten Empfänger) und faktisch (keine Citizen-API) falsch.
2. **Keine Schreib-Operation in fremde Register.** Self-Edit ist nur für Felder zulässig, die ohnehin in keinem hoheitlichen Register liegen (Kontaktdaten, Sprachpräferenz, Sperren-Toggle als App-internes Mock-Pattern, IBAN als spekulative 2027-Funktion mit klarem Speculative-Disclaimer).
3. **Keine Anzeige von Gesundheits-Stammdaten** (Diagnosen, Behinderungsgrad-Details, ePA-Inhalte, AU-Bescheinigungen). Diese sind nicht im BMG-Datenkranz und gehören nicht in die Stammdaten-Capability. Schwerbehinderten-Status ist im Vorgangs-Kontext (`/vorgaenge/schwerbehindertenausweis`) zu zeigen, nicht im Stammdaten-Hub.
4. **Keine Anzeige von Sozialleistungs-Status als Stammdatum** (Bürgergeld-Bezug, Wohngeld-Bezug, Asylstatus-Kategorie). Diese sind Sozialdaten nach §§ 67 ff. SGB X mit besonderem Schutz.
5. **Keine Aussage „Ihr Geschlechtseintrag wurde geändert"** ohne expliziten Hinweis auf SBGG-Verfahren (Anmeldung + Wartefrist + persönliche Beurkundung). Ein „Self-Edit"-UI-Pattern für den Geschlechtseintrag ist nicht zulässig.
6. **Keine Auto-Versand-Funktion für Korrektur-Anträge** (Art. 16 DSGVO, § 51 BMG-Sperren). Der Pfad endet immer in „Antrag-Vorlage erzeugt — bitte selbst absenden / mit eID einreichen / Termin buchen".
7. **Keine Klarnamen-Behörden-Logos** ohne Disclaimer, dass es sich um Mock-Briefe handelt — weiterhin `[MOCK – Verwaltungsdemo, keine echten Daten]`-Banner gemäß `posteingang.md`.
8. **Keine Drittanbieter-Sichtbarkeit von Daten ohne explizit eingeholte Einwilligung im Demo-Flow** (auch im Mock). Singpass-MyInfo-Pattern darf simuliert werden, aber jeder Consent-Schritt muss mit `[MOCK]`-EUDI-Disclaimer versehen sein.

## Adjudikation der Research-Disagreements

### DISAGREEMENT #1 — IBAN-Self-Edit mit consent-driven Push an FA / Familienkasse / GKV

**Position research-scout**: Self-Edit IBAN in der Demo-Stammdaten-UI mit consent-driven Push an Empfänger als Hero-Feature; Bürger:in-Pain hoch; technisch via BundID-Stammdatenservice (§ 8 OZG) machbar.

**Position domain-expert (Mai 2026)**:
- **§ 8 OZG** regelt das Bürger:innen-Konto und seine Vorbefüllungs-Funktion, nennt aber keine IBAN-Stammdatenfunktion.
- **BundID-Profil 2026** speichert Identitätsdaten (Name, Geburtsdatum, Anschrift) sowie Kontaktdaten (E-Mail, Mobilnummer); **kein IBAN-Feld** ist offiziell dokumentiert. Die Datenschutzerklärung von id.bund.de erwähnt keine Bankverbindungs-Speicherung.
- **Empfänger-seitig**: Familienkasse, ELSTER und GKVen pflegen IBAN je in ihren eigenen Verfahren. Eine API für Drittanbieter-Push aus BundID heraus ist gesetzlich nicht vorgezeichnet.

**Adjudikation**: Self-Edit IBAN ist als Demo-Feature **zulässig**, aber zwingend mit dem `stammdaten.disclaimer.iban_speculative`-Disclaimer zu kennzeichnen. UI-Etikett: „2027-Vision" oder „Konzept-Demo — heute nicht verfügbar". **Keine** Suggestion, dass die App tatsächlich an Behörden pusht; im Mock erscheint nach Klick lediglich ein Audit-Eintrag „IBAN-Push simuliert an [Empfänger] am [Datum]" mit `[MOCK]`-Watermark.

**Quellen**: § 8 OZG; BundID-FAQ und Datenschutzerklärung id.bund.de; Datenschutzcockpit-FAQ Bremen.

---

### DISAGREEMENT #2 — DSC-Adoption als „operativ" vs. „frühestens 2026"

**Position research-scout**: DSC ist „technische Voraussetzungen frühestens 2026 erwartet" — flächendeckende Nutzbarkeit unsicher.

**Position domain-expert (Mai 2026, Primärquellen-Prüfung)**:
- **Stand 2026-04-15**: Das Kraftfahrt-Bundesamt hat sich an das **IDA-Verfahren** (Identitätsdatenabruf, BVA) angeschlossen — Pressemitteilung Nr. 16/2026 des KBA. Die DSC-Anbindung wird „in den kommenden Monaten als finalen Pfeiler" nachgezogen.
- **Bundesagentur für Arbeit / Basisdienst STEP**: gemeinsames Pilotvorhaben „bis Ende 2025" für IDA-Anbindung; DSC-Anbindung „im weiteren Projektverlauf" (BVA-Newsletter 8).
- **Bremen-FAQ**: bestätigt, dass die DSC-Anbindung der Register sukzessive erfolgt und an die Anbindungsbereitschaft der einzelnen Register gekoppelt ist; eine flächendeckende Bürger:innen-Nutzung der 51 RegMoG-Register ist Mai 2026 **nicht** erreicht.
- **XDatenschutzcockpit v1.1.0**: produktiv seit 30.09.2024.

**Adjudikation**: Das DSC ist Mai 2026 in einer **frühen produktiven Phase mit punktueller Register-Abdeckung** — KBA seit 15.04.2026 (IDA, DSC folgt), BA-STEP im Pilot-Anschluss. Eine Demo, die dem DSC-Pattern folgt, ist legitim, **muss aber** als „Pilot-/Roadmap-Vision" gekennzeichnet werden. Empfehlung: in der UI „Datenschutzcockpit (Pilot-Phase)"-Label und im Disclaimer `stammdaten.disclaimer.audit_log_app_internal` plus Roadmap-Tooltip „Sukzessive Anbindung: KBA seit 04/2026, weitere Register folgen". Keine Suggestion, dass alle 51 RegMoG-Register heute schon protokolliert sind.

**Quellen**: KBA-Pressemitteilung Nr. 16/2026 (15.04.2026); BVA-Aktuelles Newsletter 8 zum BA-Pilotvorhaben; Bremen-FAQ Datenschutzcockpit; XÖV XDatenschutzcockpit-Spezifikation.

---

### DISAGREEMENT #3 — Geschlechtseintrag SBGG: Self-Edit oder Termin-Hinweis?

**Position research-scout**: Self-Edit-Pattern mit Standesamt-Termin-Buchung erwogen; § 45b PStG/SBGG-Reform 2024 als Self-Deklarations-Weg verstanden.

**Position domain-expert (Mai 2026, Primärquellen-Prüfung)**:
- **§ 2 SBGG**: Erklärung erfolgt **gegenüber dem Standesamt** mit zwei Versicherungen (Geschlechtsidentität entspricht; Folgen verstanden). Mit der Erklärung sind die zukünftigen Vornamen zu bestimmen.
- **§ 4 SBGG**: Persönliche **Anmeldung** mündlich oder schriftlich beim Standesamt; **drei Monate Wartefrist** zwischen Anmeldung und Erklärung; Anmeldung wird ungültig, wenn nicht binnen 6 Monaten Erklärung folgt.
- **§ 5 SBGG**: **Ein-Jahres-Sperrfrist** vor erneuter Erklärung.
- **§ 45b PStG** (für Personen mit Variante der Geschlechtsentwicklung; nicht durch SBGG ersetzt, sondern parallel weitergeltend): Erklärungen sind **persönlich vor dem Standesbeamten** abzugeben und zu beurkunden.

**Adjudikation**: **Self-Edit-Pattern für den Geschlechtseintrag in der Demo-UI ist ausgeschlossen**, da:
1. die Erklärung formaljuristisch persönlich vor dem Standesamt abzugeben ist (§ 4 SBGG; § 45b PStG),
2. eine drei-Monats-Wartefrist zwingend zwischen Anmeldung und Erklärung liegt (§ 4 SBGG),
3. eine Selbsterklärung in einer App den Identitäts-Verifikationsanspruch der Standesämter unterläuft.

UI-Empfehlung: **Read-only** für das Feld „Geschlechtseintrag" mit Korrekturweg-Pointer „Standesamt-Termin SBGG buchen" → führt zu einem Mock-Wizard, der den dreistufigen Prozess (1) Anmeldung beim Standesamt, (2) drei Monate Wartefrist, (3) persönliche Erklärung in einem Termin-Bestätigungsbrief abbildet. Disclaimer: „Persönliche Erklärung beim Standesamt ist nach § 4 SBGG zwingend." Sperrfrist § 5 SBGG sichtbar machen.

**Quellen**: §§ 2, 4, 5 SBGG (gesetze-im-internet.de, Stand 2024-11-01 in Kraft); § 45b PStG.

---

### DISAGREEMENT #4 (neu durch domain-expert) — Religionsmerkmal-Anzeige (Art. 9 DSGVO)

**Beobachtung**: Research-scout schlägt Anzeige des Religionsmerkmals vor; die Sensibilität nach Art. 9 DSGVO ist erkannt, aber das UI-Default-Verhalten unklar.

**Adjudikation**: **Hidden by default**. Anzeige nur auf Klick (`[Religionszugehörigkeit anzeigen]`-Button mit kurzer Art-9-Erklärung). Hintergrund: § 3 Abs. 1 Nr. 11 BMG erlaubt die Speicherung im Melderegister; die Anzeige in einer Bürger:innen-UI ist von Art. 9 Abs. 2 lit. a DSGVO (Einwilligung) gedeckt, sofern explizit eingewilligt wird. Eine kontextfreie Default-Anzeige in der Stammdaten-Übersicht überschreitet die Erforderlichkeit. Disclaimer-String `stammdaten.disclaimer.religion_art9` siehe oben.

---

### DISAGREEMENT #5 (neu durch domain-expert) — Drittanbieter-Consent über EUDI-Wallet (Demo Flow 8.3)

**Beobachtung**: Research-scout erwägt das Drittanbieter-Consent-Pattern als integralen Stammdaten-Bestandteil; Singpass-MyInfo dient als Pattern-Vorbild.

**Adjudikation**: Demo Flow 8.3 ist **explizit als 2027-Vision** zu kennzeichnen und in eine **separate Sub-Sektion** „Wallet-Nachweise & externe Empfänger" auszulagern, nicht in den Kern-Stammdaten-Hub zu integrieren. Begründung:
- EUDI-Wallet-Pflicht in DE setzt mit eIDAS-2-VO 2024/1183 frühestens 2026/2027 ein (Bereitstellung) und 2027/2028 (Drittanbieter-Akzeptanz).
- PID-Schema (Rulebook v1.4) deckt nur Identifikation + Adresse, nicht Familie/Finanzen/Status — andere Felder benötigen separate (Q)EAA-Issuance.
- BMG erlaubt **keinen** direkten Push aus dem Melderegister an private Empfänger; Drittanbieter-Konsente laufen daher zwingend über Wallet-Attestation, nicht über BundID-Stammdatenservice.

UI-Konsequenz: Sub-Tab `Wallet & Externe Empfänger` mit klarer „2027-Vision"-Banner, ohne Vermischung mit Bestand-Realität; Disclaimer `stammdaten.disclaimer.eudi_speculative` zwingend.

---

### Bestätigungen ohne Korrektur

- **§ 36 BMG-Mechanik**: Bestätigt — § 36 BMG selbst nennt keine Empfänger; konkrete Pushes liegen in Spezialgesetzen (RBStV § 11 Abs. 4, § 58c SG, § 42 BMG für Religionsgesellschaften, AO-Vorschriften) und der AVV-BMG (BMGVwV vom 27.09.2022).
- **§ 4 IDNrG (11 Basisdaten beim BVA)**: Bestätigt.
- **EUDI Wallet PID v1.4 — 8 Pflichtattribute**: Bestätigt; PID-Issuer müssen mindestens 4 von 6 Identifikations-Hilfsattributen mitliefern.
- **§ 51 BMG (Auskunfts- und Übermittlungssperren)**: Bestätigt — Auskunftssperre § 51 Abs. 1 BMG mit Begründungspflicht und 2-Jahres-Frist; Übermittlungssperren nach §§ 42 Abs. 3, 50 Abs. 5 BMG ohne Begründung.
- **§ 290 SGB V (KVNR lebenslang, kassenübergreifend)**: Bestätigt.
- **§ 139b AO (Steuer-IdNr 11 Ziffern, lebenslang, nicht änderbar)**: Bestätigt.
- **DEÜV-Adressfluss zur GKV**: Bestätigt für Beschäftigte (Adress-Änderungsmeldung durch Arbeitgeber an Datenstelle der Träger der Rentenversicherung, von dort an GKV); für Nicht-Beschäftigte ist der Fluss heterogener und teils landesrechtlich über Meldedaten-Übermittlungsverordnungen geregelt.
