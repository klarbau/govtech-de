---
vorgang: dokumente
title: Dokumenten-Tresor mit QR-Verifikation und EUDI-Wallet-Export
last_validated: 2026-05-08
sources:
  - https://www.gesetze-im-internet.de/vwvfg/__33.html
  - https://www.gesetze-im-internet.de/vwvfg/__3a.html
  - https://www.gesetze-im-internet.de/vwvfg/__41.html
  - https://www.gesetze-im-internet.de/ao_1977/__87a.html
  - https://www.gesetze-im-internet.de/ao_1977/__122a.html
  - https://www.gesetze-im-internet.de/ao_1977/__147.html
  - https://www.gesetze-im-internet.de/ao_1977/__169.html
  - https://www.gesetze-im-internet.de/pauswg/__9.html
  - https://www.gesetze-im-internet.de/aufenthg_2004/__78.html
  - https://www.gesetze-im-internet.de/sgb_5/__290.html
  - https://www.gesetze-im-internet.de/sgb_10/__67.html
  - https://www.gesetze-im-internet.de/pstg/__54.html
  - https://www.gesetze-im-internet.de/pstg/__55.html
  - https://dsgvo-gesetz.de/art-9-dsgvo/
  - https://dsgvo-gesetz.de/art-17-dsgvo/
  - https://eur-lex.europa.eu/eli/reg/2024/1183/oj
  - https://eudi.dev/2.6.0/architecture-and-reference-framework-main/
  - https://www.bsi.bund.de/DE/Themen/Unternehmen-und-Organisationen/Standards-und-Zertifizierung/Technische-Richtlinien/TR-nach-Thema-sortiert/tr03171/TR-03171_node.html
  - https://www.bsi.bund.de/SharedDocs/Downloads/DE/BSI/Publikationen/TechnischeRichtlinien/TR02102/BSI-TR-02102.html
  - https://www.bundesdruckerei.de/de/newsroom/pressemitteilungen/verwaltungsdokumente-mobil-verifizieren-mit-zesi-mobile-pruef-app
  - https://www.bundesdruckerei.de/de/innovation-hub/case-study-hamburg-faelschungssicher-und-ueberall-pruefbar
  - https://bmds.bund.de/themen/digitaler-staat/digitale-identitaeten/eudi-wallet
  - https://www.elster.de/eportal/helpGlobal?themaGlobal=help_diva
---

> **Hinweis zum Geltungsbereich**
> Dies ist *keine* einzelne Vorgangs-Spezifikation, sondern eine **horizontale Capability** — ein persönlicher, lokal gespeicherter Dokumenten-Tresor, der über alle Lebenslagen einer/eines Bürger:in hinweg Behörden-Dokumente bündelt, ihre Echtheit (soweit produktiv möglich) sichtbar macht und 2027-speculative an eine EUDI-Wallet anbindet. Persona-agnostisch — die Konventionen unten gelten für jede:n Bürger:in.

## Beteiligte Akteure (statt einer einzelnen Behörde: Aussteller-Tabelle)

Der Tresor ist *Aggregator + Verifier + Forwarder*, niemals *Beglaubiger*. Aussteller bleibt die jeweilige Behörde / authentic source iSv eIDAS 2 Art. 3 Nr. 46. Beziehbarkeit-Wege bei Verlust sind als Disclaimer in der Detail-Ansicht zu spiegeln.

| Dokument-Typ | Aussteller (authentic source) | Föderale Ebene | Aufbewahrungs-Empfehlung Privatperson | Wiederbeschaffung bei Verlust |
|---|---|---|---|---|
| Personalausweis / Reisepass | Bürgeramt (Antrag) → Bundesdruckerei (Produktion) | Bund (Recht) / kommunal (Vollzug) | Lebenslang bis Ablauf; Ablaufdatum 6 / 10 Jahre | Bürgeramt-Termin, Verlustanzeige Polizei, Neu-Antrag (37,00 € PA / 70,00 € Pass — Stand 2026) |
| Meldebestätigung | Meldebehörde / eWA (Bürgeramt) | kommunal (Vollzug Land) | Anlassbezogen (Vermieter, Vertragsabschluss); Ausstellungsdatum bestimmt aktuell-Charakter | § 18 Abs. 1 BMG-Auskunft beim Bürgeramt; in Hamburg eWA-Re-Issuance digital |
| Geburtsurkunde | Standesamt (Geburtsregister) | kommunal | Lebenslang relevant; Ausstellungsdatum oft erforderlich „nicht älter als 6 Monate" | Standesamt des Geburtsortes, § 55 PStG-Urkunde gegen Gebühr (idR 12,00 €) |
| Eheurkunde | Standesamt (Eheregister) | kommunal | Lebenslang relevant | Standesamt des Eheschließungsorts, § 55 PStG |
| Sterbeurkunde | Standesamt (Sterberegister) | kommunal | für Erbfall + Renten-/Versicherungs-Abwicklung | Standesamt des Sterbeortes |
| Steuerbescheid (ESt) | Finanzamt | Land (Vollzug) | Empfehlung 6 Jahre (Festsetzungsverjährung § 169 Abs. 2 S. 1 Nr. 2 AO); 10 Jahre bei Steuerhinterziehung (§ 169 Abs. 2 S. 2 AO) | Mein-ELSTER-Posteingang **180 Tage** Bereitstellung + 60 Tage nach erstem Abruf; danach Antrag Akteneinsicht § 78 AO |
| Steuer-IdNr.-Mitteilung | Bundeszentralamt für Steuern (BZSt) | Bund | Lebenslang (IdNr. ist nach § 139b AO bundeseinheitlich + lebenslang) | BZSt-Online-Service oder schriftlich (4–6 Wochen Postversand) |
| KiStAM-Mitteilung (Kirchensteuermerkmal) | Bundeszentralamt für Steuern (BZSt) | Bund | rolling — wird jährlich neu | BZSt; Sperrvermerk-Antrag Art. 9 DSGVO + § 51a EStG |
| eAT (elektronischer Aufenthaltstitel) | Ausländerbehörde (Antrag, Bescheid) → Bundesdruckerei (Produktion) | kommunal/Land | Bis Ablauf (Aufenthaltserlaubnis idR 1–4 Jahre, Niederlassungserlaubnis unbefristet) | ABH-Termin, § 78 AufenthG; bei Verlust Anzeige + Neu-Ausstellung |
| Krankenkassen-Mitgliedsbescheinigung | gesetzliche/private Krankenkasse | Selbstverwaltung (öff.-rechtl. Körperschaft) bzw. Privatrecht | rolling — pro Anfrage neu, idR 12 Monate gültig | Kassen-App (TK, AOK, BARMER, Barmer …) oder telefonisch / Online-Antrag |
| eGK (elektronische Gesundheitskarte) | gesetzliche Krankenkasse | Selbstverwaltung | bis Ablauf / Folge-Karte | Kassen-Anruf, Sperrung + Neu-Ausstellung; bis dahin elektronische Ersatzbescheinigung (eEB) |
| Rentenkonto-Auskunft / Renteninformation | Deutsche Rentenversicherung (DRV Bund / Regional) | Bund / Selbstverwaltung | jährlich neu (ab 27. Lebensjahr automatisch); Aufbewahrung empfohlen für Rentenantrag | DRV-Online-Konto / V0100 / V0410-Vordruck; telefonische Servicehotline 0800 1000 4800 |
| ALG-I- / Bürgergeld-Bescheid | Agentur für Arbeit (SGB III) / Jobcenter (SGB II) | Bund / kommunale Mit-Trägerschaft | Bis 2 Jahre nach Bezugsende für Nachweise | jobcenter.digital / Akteneinsicht § 25 SGB X |
| Wohngeld-Bescheid | Wohngeldstelle (kommunal) | kommunal (Vollzug Land) | Bewilligungszeitraum + 2 Jahre | Wohngeldstelle, Akteneinsicht § 25 SGB X |
| Zulassungsbescheinigung Teil I (KFZ-Schein) | KFZ-Zulassungsstelle → Bundesdruckerei (Produktion) | kommunal | Bis Halterwechsel / Außerbetriebsetzung | KFZ-Zulassungsstelle, Verlustanzeige + Eidesstattliche Versicherung; Ersatz idR 13,00 € |
| Zulassungsbescheinigung Teil II (Fahrzeugbrief) | KFZ-Zulassungsstelle → Bundesdruckerei | kommunal | Lebenslang Fahrzeugakte; bei Verkauf an Käufer:in | KFZ-Zulassungsstelle, Aufgebotsverfahren bei Verlust (kostspielig — bis 100 €) |
| Schulzeugnis (Abschluss / Halbjahr) | Schule, im Landesauftrag | Land | Lebenslang relevant (Bewerbungen) | Schule (Schul-Archiv 50 Jahre); danach Schulamt / Landesarchiv |
| Hochschul-Abschluss-Urkunde + Zeugnis | Universität / Fachhochschule | Land (öff.-rechtl. Körperschaft) | Lebenslang | Hochschul-Studierendensekretariat / Universitäts-Archiv |
| Berufsabschluss-Zeugnis (IHK / HwK) | IHK / HwK | Selbstverwaltung | Lebenslang | IHK / HwK, idR Zweitschriften gegen Gebühr 50–100 € |
| Erweitertes / einfaches Führungszeugnis | Bundesamt für Justiz (BfJ) | Bund | 3–6 Monate Aktualitäts-Frist (Empfänger-Vorgabe; nicht kodifiziert) | BfJ-Online-Antrag (führungszeugnis.bund.de) oder Bürgeramt-Antrag, 13,00 € |
| Auszug aus dem Bundeszentralregister (BZR) | Bundesamt für Justiz (BfJ) | Bund | Anlassbezogen | analog Führungszeugnis |
| Gewerbeanmeldung / Gewerbeschein | Gewerbeamt (kommunal) | kommunal | Bis Gewerbe-Abmeldung; § 147 AO ggf. 10 Jahre als Buchführungs-Anlage | Gewerbeamt, Zweitschrift idR 15–25 € |
| Bauantrags-Bescheid | Bauaufsichtsbehörde | kommunal/Land | Mind. bis Bauwerks-Bestand; 30+ Jahre empfohlen | Bauamt-Akteneinsicht; Bauakt liegt im Bauaktenarchiv |

**Wichtige Klarstellung Aussteller vs. Hersteller**: Bei Personalausweis, Reisepass, eAT und KFZ-Bescheinigung Teil I/II ist die **Bundesdruckerei** lediglich technische Hersteller-/Produktions-Stelle, **nicht** Aussteller iSv eIDAS 2 / PuB-EAA. Aussteller bleibt rechtlich die Bürger-/Ausländer-/KFZ-Behörde. Diese Unterscheidung muss in jeder UI-Aussage präzise sein, sonst entstünde der Eindruck, eine Bundes-Privatrechts-AG sei hoheitlich entscheidend — was sie nicht ist.

## Erforderliche Rechtsgrundlagen

### Verarbeitung im Tresor

| Datenkategorie | DSGVO-Rechtsgrundlage (Mock, lokal) | DSGVO-Rechtsgrundlage (echt-prod) | Spezialnorm |
|---|---|---|---|
| Allgemeine Behörden-Bescheide (Stammdaten, Aktenzeichen, Inhalt) | Art. 6 Abs. 1 lit. a DSGVO (Einwilligung beim Import) + lit. b (Vertrag App ↔ Bürger:in) | Art. 6 Abs. 1 lit. a + lit. b | — |
| Steuerbescheid mit Kirchensteuer-Anteil → Religionsmerkmal | Art. 9 Abs. 2 lit. a DSGVO (**ausdrückliche** Einwilligung) | Art. 9 Abs. 2 lit. a + § 22 Abs. 1 Nr. 1 lit. a BDSG + § 22 Abs. 2 BDSG | § 22 BDSG |
| Bürgergeld-/Wohngeld-/ALG-Bescheid (Sozialdaten iSv § 67 SGB X) | Art. 9 Abs. 2 lit. a DSGVO (Einwilligung); App ist **keine** Sozialleistungs-Stelle iSv lit. h, deshalb ist lit. h **unzulässig** | Art. 9 Abs. 2 lit. a DSGVO + § 22 Abs. 1 Nr. 1 lit. a BDSG | § 67 SGB X (Sozialgeheimnis bleibt für ausstellende Stelle wirksam) |
| eAT / ABH-Bescheid (Aufenthaltsstatus → indirekt rassisch/ethnisch iSv Art. 9) | Art. 9 Abs. 2 lit. a DSGVO (Einwilligung) | Art. 9 Abs. 2 lit. a + § 22 BDSG | § 86 ff. AufenthG (Datenübermittlung) bleibt Behörden-intern |
| Gesundheitsdaten (Reha-Bescheid, AU-Bescheinigung, Krankenkassen-Beitrags-Anpassung mit Diagnose-Bezug) | Art. 9 Abs. 2 lit. a DSGVO (Einwilligung) + AVV nach Art. 28 DSGVO bei jeder AI-Verarbeitung | Art. 9 Abs. 2 lit. a + § 22 Abs. 1 Nr. 1 lit. b BDSG (nicht öffentliche Stelle Beschäftigtendaten — *nicht* einschlägig hier) → faktisch lit. a | § 35 SGB I (Sozialgeheimnis) bleibt für Krankenkasse |

### Was die App **nicht** darf

- **Amtliche Beglaubigung erstellen** — § 33 VwVfG ist hoheitlich. „Jede Behörde darf Abschriften von Urkunden, die sie selbst ausgestellt hat, beglaubigen" (§ 33 Abs. 1 VwVfG); zusätzlich dürfen Behörden des Bundes oder Landes fremde Urkunden beglaubigen, *soweit die Urkunde von einer Behörde stammt oder zur Vorlage bei einer Behörde benötigt wird* (§ 33 Abs. 2 VwVfG). Eine **private App** ist keine Behörde iSv § 1 Abs. 4 VwVfG und kann den Beglaubigungsvermerk nach § 33 Abs. 4 VwVfG (Bezeichnung der Urschrift, Übereinstimmungs-Feststellung, Ort und Tag, Unterschrift, **Dienstsiegel**) nicht rechtswirksam erstellen — selbst wenn sie ein eIDAS-Siegel anbringen würde, fehlt ihr die Legitimation iSv § 1 Abs. 4 VwVfG.
- **Beglaubigung durch Notar simulieren** — § 39a BeurkG (elektronische Beglaubigung) ist Notar:innen vorbehalten; seit 29.12.2025 über die Notar-App der Bundesnotarkammer für eingeschränkte Anwendungsfälle (GmbH-Gründung, einfache Beglaubigung) möglich.
- **Schriftform automatisiert ersetzen** — § 3a Abs. 2 VwVfG erlaubt Schriftformersatz nur durch (a) qualifizierte elektronische Signatur, (b) De-Mail nach § 5 Abs. 5 De-Mail-Gesetz, (c) Übermittlung über sichere elektronische Postfächer (beA, beBPo, identifiziertes Bürger-Postfach). Die App kann *anzeigen*, dass eine eingehende Behörden-PDF eine qeS / qualifiziertes Siegel trägt — sie kann **nicht** im Namen der/des Bürger:in eine qeS anbringen, weil die App keinen QSCD (Qualified Signature Creation Device) iSv eIDAS bereitstellt.
- **An ein amtliches Postfach senden** — kein § 87a-AO- oder § 36a-SGB-I-Pfad, keine FIT-Connect-Anbindung. Versand an Behörde bleibt Bürger:innen-Aufgabe via Mein ELSTER, BundID, Behörden-Portal.

### Aufbewahrungs- und Beweismittel-Recht

- **Privatpersonen ohne Buchführungspflicht**: keine gesetzliche Aufbewahrungs-**Pflicht**. Empfehlung 6 Jahre (Festsetzungsverjährung § 169 Abs. 2 S. 1 Nr. 2 AO). 10 Jahre relevant, falls Steuerhinterziehungs-Verdacht (§ 169 Abs. 2 S. 2 AO).
- **Selbstständige / Kaufleute** (Mehmet-Persona): § 147 Abs. 3 S. 1 AO — **10 Jahre** für Bücher, Aufzeichnungen, Jahresabschlüsse und Unterlagen nach Abs. 1 Nr. 1 + 4a; **8 Jahre** für Buchungsbelege (Abs. 1 Nr. 4); **6 Jahre** für sonstige Unterlagen (Geschäftsbriefe etc.). Frist beginnt mit Schluss des Kalenderjahrs der Entstehung. Parallel § 257 HGB. Die App muss diese Frist-Logik **persona-spezifisch** anzeigen.
- **DSGVO Art. 17 Abs. 3 lit. e**: Anspruch auf Löschung gegen die *ausstellende Behörde* greift nicht, soweit Daten „zur Geltendmachung, Ausübung oder Verteidigung von Rechtsansprüchen" erforderlich sind. Im *eigenen privaten Tresor* gilt diese Schranke nicht — Bürger:in kann lokal jederzeit löschen.
- **DSGVO Art. 17 Abs. 3 lit. b**: Schutz für Behörden bei Erfüllung rechtlicher Verpflichtungen / öffentlich-rechtlicher Aufgaben — *nicht* übertragbar auf eine private Tresor-App.

### Verschlüsselungs-Standard

- **BSI TR-02102-1** Version 2026-01: AES-256 / AES-128 in zugelassenen Modi (GCM, EAX, CCM); für Speicher-Verschlüsselung empfohlen. Demo speichert lokal (`localStorage`); Produktiv-Empfehlung wäre Hardware-Backed-Keystore (Secure Enclave / StrongBox) + AES-256-GCM.
- **BSI TR-03171** „Optisch verifizierbarer kryptographischer Schutz von Verwaltungsdokumenten (Digitale Siegel)", **aktuelle Version 0.8** (BSI-Veröffentlichung; Stand Mai 2026 keine Folge-Version bestätigt — die research-scout-Aussage „Standard ab 2025" ist korrekt). Stützt sich auf TR-03137-1 (JAB-Code / Data-Matrix-Strukturen).

## Realistische Briefkopf-Phrasen + Aktenzeichen-Formate

> Alle Beispiele sind synthetisch und mit `[MOCK]` markiert. Format-Konventionen folgen real-existierenden Behörden-Praxis.

### Aktenzeichen-Formate (nicht im Posteingang-Set bereits enthalten)

| Aussteller | Format | Beispiele (synthetisch) | Quelle |
|---|---|---|---|
| Standesamt — Geburtsurkunde (Registernr. § 21 PStG) | „G NNNN/JJJJ" innerhalb des Standesamt-Bezirks | `[MOCK] G 04711/2026` (Berlin Mitte), `[MOCK] HH-G 00892/2018` | StAG-Vollzug, Standesamt-Praxis |
| Standesamt — Eheurkunde | „E NNNN/JJJJ" | `[MOCK] E 00342/2024`, `[MOCK] M-E 01133/2025` | StAG-Vollzug |
| Standesamt — Sterbeurkunde | „S NNNN/JJJJ" | `[MOCK] S 00128/2026` | StAG-Vollzug |
| Bundesamt für Justiz — Führungszeugnis (Belegart-Nr.) | 9-stellig + Buchstabencode | `[MOCK] 824 591 037 / N` (einfach), `[MOCK] 824 591 037 / E` (erweitert) | BfJ-Praxis |
| Deutsche Rentenversicherung — Versicherungsnr. | AANNNNNNNAANN (12 Stellen) — s. posteingang.md | `[MOCK] 65 170395 P 042` | DRV |
| Krankenkassen — KVNR § 290 SGB V | Großbuchstabe + 9 Ziffern (10 Zeichen) — s. posteingang.md | `[MOCK] A123456780` | § 290 SGB V |
| KFZ-ZulBesch Teil I — Dokumentennr. | „A" + 8 Ziffern (Bundesdruckerei-Serie) | `[MOCK] A12345678`, `[MOCK] A98765432` | FZV-Anlage 6 |
| KFZ-ZulBesch Teil II — Dokumentennr. | „D" + 8 Ziffern | `[MOCK] D87654321` | FZV-Anlage 7 |
| eAT-Karte — CAN (Card Access Number) | 1 Buchstabe + 7 Ziffern + 1 Prüfbuchstabe | `[MOCK] T0123456X` | BAMF-eAT-Doku |
| eAT-Karte — Seriennr. | „L" / „T" + 8 Stellen alphanumerisch | `[MOCK] L01X23456` | BAMF-eAT-Doku |
| IHK — Berufsabschluss-Zeugnis | „IHK-<Stadt>-<JJ>-<NNNNN>" | `[MOCK] IHK-B-25-04711`, `[MOCK] IHK-M-23-08823` | IHK-Praxis |
| HwK — Gesellen-/Meister-Brief | „HwK-<Region>-NNNNN/JJ" | `[MOCK] HwK-OB-04711/25` | HwK-Praxis |
| Hochschul-Urkunde | „<HS-Kürzel>-<Studiengang>-NNNN/JJJJ" | `[MOCK] HU-MA-Inf-0883/2024`, `[MOCK] TUM-BA-WI-1142/2025` | HRG-Vollzug |
| Gewerbeschein (Bezirk-Aktenzeichen) | „GE-<Stadt>-NNNNNN/JJ" | `[MOCK] GE-B-2026/04711`, `[MOCK] GE-M-2026/08823` | GewO-Vollzug |
| ZeSI VDS-Siegel-ID (siegel-spezifischer Hash, Demo-Mock) | „VDS-<Aussteller-Kürzel>-<32-Hex>" | `[MOCK] VDS-BA-MITTE-9f3a4c…b82e` | BSI TR-03171 / ZeSI-ad |

### Briefkopf-Standardphrasen

**Standesamt — Geburtsurkunde (Auszug)**
- Absender: „Standesamt Berlin Mitte — Parochialstraße 1–3, 10179 Berlin"
- Kopf-Phrase: „Geburtsurkunde — Auszug aus dem Geburtenregister Nr. [MOCK] G 04711/2026"
- Standard-Floskeln: „Geburt der/des: …" / „Geboren am: …" / „Geboren in: …" / „Eltern: …" / „Geburtenregister Band X Blatt Y"
- Schluss: „Ausgestellt von: [Name], Standesbeamte:r — Berlin, [Datum] — Dienstsiegel"
- Hinweis Speculative-2027 (mock): „QR-Code zur Verifikation gem. BSI TR-03171 — Echtheit prüfbar mit ZeSI mobile."

**Standesamt — Eheurkunde**
- Absender: „Standesamt München — Ruppertstraße 11, 80337 München"
- Kopf-Phrase: „Eheurkunde — Auszug aus dem Eheregister Nr. [MOCK] M-E 01133/2025"
- Standard-Floskeln: „Die Ehe wurde geschlossen am: …" / „Ehegatten: …" / „Eheregister Band X Blatt Y"
- Hinweis: „Ausstellung gem. § 55 PStG"

**Bundesamt für Justiz — Führungszeugnis**
- Absender: „Bundesamt für Justiz — Adenauerallee 99–103, 53113 Bonn"
- Kopf-Phrase: „Führungszeugnis — Belegart [MOCK] 824 591 037 / N"
- Standard-Floskel: „Inhalt: Keine Eintragung." (häufigster Fall) / oder Liste Eintragungen
- Hinweis: „Dieses Führungszeugnis wurde elektronisch erstellt und ist mit qualifiziertem elektronischem Siegel versehen (§ 30 Abs. 5 BZRG)."

**Deutsche Rentenversicherung — Renteninformation**
- Absender: „Deutsche Rentenversicherung Bund — Ruhrstraße 2, 10709 Berlin" (oder regional: DRV Berlin-Brandenburg, Rheinland, Bayern Süd …)
- Kopf-Phrase: „Renteninformation — Versicherungsnummer [MOCK] 65 170395 P 042"
- Standard-Floskel: „Stand Ihres Rentenkontos: …" / „Hochrechnung Ihrer Rente bei Eintritt der Regelaltersgrenze (67 Jahre): …" / „Die folgenden Beiträge sind aktuell gespeichert: …"
- Hinweis: „Diese Information wird einmal jährlich automatisch versandt (§ 109 SGB VI)."

**Krankenkasse — Mitgliedsbescheinigung**
- Absender: „Techniker Krankenkasse — Bramfelder Straße 140, 22305 Hamburg"
- Kopf-Phrase: „Bescheinigung über den Versicherungsschutz — Versicherungsnummer [MOCK] A123456780"
- Standard-Floskel: „Hiermit bestätigen wir, dass Sie bei uns seit dem [Datum] in der gesetzlichen Krankenversicherung pflichtversichert / freiwillig versichert / familienversichert sind. Diese Bescheinigung gilt für [Zweck/Empfänger]."

**KFZ-Zulassungsstelle — Zulassungsbescheinigung Teil I (Auszug für Halter:innen-Vorlage)**
- Absender: „Landesamt für Bürger- und Ordnungsangelegenheiten — KFZ-Zulassung, [Adresse]"
- Inhalt: Halter, Fahrzeug-Identifizierungsnummer (VIN, 17 Stellen), amtliches Kennzeichen, Zulassungsdatum, technische Daten
- Hinweis: „Diese Bescheinigung ersetzt nicht die im Fahrzeug mitzuführende Originalbescheinigung Teil I (§ 11 Abs. 6 FZV)."

### ZeSI-VDS-spezifische Phrasen

Auf Dokumenten, die heute (Mai 2026) bereits einen VDS tragen oder 2027-speculative tragen sollen, gehört in den Fußbereich:

- „QR-Code/Data-Matrix gem. BSI TR-03171 — Visible Digital Seal."
- „Echtheit prüfbar mit der kostenlosen App **ZeSI mobile** (Bundesdruckerei) — App Store / Google Play."
- „Bei Verifikations-Treffer „grün" sind Aussteller, Inhalt und Ausstellungsdatum bestätigt; Manipulation an Inhalt würde zu Treffer „rot" führen."

## Häufige Hürden für Bürger:innen

- **„Wo lag das nochmal?"-Phänomen** — fragmentierte Ablage zwischen Schublade, Mein-ELSTER-Postfach (180 Tage Bereitstellung + 60 Tage Nach-Abruf), Krankenkassen-App, BundID-ZBP, jobcenter.digital, eMail. Niemand hat einen einzigen Aggregator. *Genau hier* setzt der Tresor an.
- **Original vs. Beglaubigte Kopie vs. einfache Kopie — die Verwirrungs-Achse**: Bürger:innen unterscheiden meist nicht zwischen (a) **Original** mit höchster Beweiskraft, (b) **amtlicher Beglaubigung nach § 33 VwVfG** durch Behörde mit Dienstsiegel, (c) **öffentlicher Beglaubigung nach § 39a BeurkG** durch Notar:in, (d) **einfacher (unbeglaubigter) Kopie**. Vermieter und Arbeitgeber akzeptieren idR (d); Behörden verlangen je nach Vorgang (a), (b) oder (d).
- **„Beglaubigung schnell selbst" — App-Erwartung**: Weil Bürger:innen die hoheitliche Natur von § 33 VwVfG nicht präsent haben, erwarten sie von einer Tresor-App, „eine beglaubigte Kopie zu generieren". Das ist rechtlich **nicht möglich**. Der Tresor muss diese Erwartung explizit umlenken auf Bürgeramt-Termin / Standesamt-Termin / Notar-App.
- **„Kreisende Beweispflicht"** zwischen Behörden — Behörde X verlangt Bescheid von Behörde Y, dieser wiederum verlangt Nachweis von Behörde Z. Ein Tresor allein löst das nicht (Behörden fordern weiterhin Vorlage), reduziert aber die Lookup-Friction. EUDI-PuB-EAA wird das ab 2027 strukturell auflösen.
- **„Verlustverfahren je Dokument"** — bei Personalausweis: Verlustanzeige Polizei + Bürgeramt-Antrag (37,00 €); bei Aufenthaltstitel: ABH-Termin + Verlustanzeige; bei KFZ-Brief Teil II: Aufgebotsverfahren beim Amtsgericht (kostspielig); bei Standesurkunde: Standesamt-Antrag mit Identitätsnachweis (12,00 €). Der Tresor sollte pro Dokumenten-Typ einen „Verlust-Wegweiser" anbieten.
- **„Aktualitäts-Frist"-Trugschluss** — viele Empfänger (Vermieter, Arbeitgeber) verlangen Dokumente „nicht älter als 6 Monate" (Meldebestätigung, Führungszeugnis). Diese Frist ist **nicht kodifiziert**, sondern Empfänger-Praxis. Der Tresor kann pro Dokument die Praxis-Frist anzeigen + nahtloses „Aktualisierung anfordern" (Deep-Link Bürgeramt-Termin / BfJ-Online).
- **„180-Tage-Falle in Mein ELSTER"** — Steuerbescheide werden im ELSTER-Posteingang nur 180 Tage bereitgestellt + 60 Tage nach Erst-Abruf; danach gelöscht. Bürger:innen verpassen das Download-Fenster und müssen über § 78 AO Akteneinsicht beim Finanzamt beantragen. Ab 1.1.2027 (DIVA-Programm) wird die elektronische Bekanntgabe **opt-out**; das Volumen wird entsprechend wachsen — Tresor-Bedarf steigt.
- **Pseudonyme Authentifizierung wenig bekannt** — § 9 Abs. 5 PAuswG („dienste- und kartenspezifisches Kennzeichen") ist nahezu unbekannt; nur ~5 % aller Online-Ausweis-Nutzungen erfolgen pseudonym. Bürger:innen offenbaren mehr als nötig, weil sie das Pseudonym-Pattern nicht kennen.
- **Doppelung Bundesdruckerei vs. Behörde**: viele glauben „die Bundesdruckerei stellt mein Aufenthaltstitel aus". Korrekt: ABH erlässt Verwaltungsakt; Bundesdruckerei produziert die Karte. Hat Praxis-Folgen bei Reklamation (immer ABH ansprechen, nicht Bundesdruckerei).

## Auto-fill / EUDI-Wallet-Patterns

### Heute (Mai 2026) realistisch

| Aktion | Quelle / Mechanismus | Konfidenz |
|---|---|---|
| Stammdaten aus Personalausweis-eID auslesen (Vorname, Nachname, Geburtsdatum, Adresse) | § 18 PAuswG / AusweisApp / eID-Service | hoch — produktiv |
| VDS-QR-Code auf Hamburg-eWA-Meldebestätigung verifizieren | BSI TR-03171 / ZeSI mobile (Bundesdruckerei) seit 13.05.2025 | hoch — produktiv |
| Steuerbescheid-PDF aus Mein ELSTER importieren (180-Tage-Fenster) | manueller Download | hoch — produktiv |
| Krankenkassen-Mitgliedsbescheinigung aus Kassen-App importieren | manueller Download (kein Cross-Kassen-Standard) | hoch — produktiv |
| qeS / qualifiziertes Siegel an einem Behörden-PDF verifizieren | EU-LotL (List of Trusted Lists) gegen eIDAS-Trust-Anchors | hoch — produktiv (Adobe Reader, eIDAS-Validierungs-Dienste) |
| Pseudonym-Login bei Diensteanbieter mit BfJ-Berechtigung | § 9 Abs. 5 PAuswG | hoch — produktiv, aber wenig genutzt |

### 2027-speculative (EUDI-Wallet)

| Aktion | Mechanismus / ARF-Referenz | Konfidenz |
|---|---|---|
| **Selective Disclosure: age_over_18, age_over_21** | SD-JWT VC mit Salted-Hash-Disclosures | hoch — Pflicht-Pattern in EUDI ARF v2.6.0 |
| **Selective Disclosure: nur Postleitzahl statt voller Adresse** | SD-JWT VC | hoch |
| **PuB-EAA „Aufenthaltsstatus = gültig"** an Vermieter teilen | Public-Body-Authentic-Source EAA, Aussteller ABH | mittel — DE-EUDI-Wallet zum 8.5.2026 in Sandbox; produktiv ab Stufe 1 Anfang 2027; Behörden-Anbindung pro PuB-EAA-Issuer separat |
| **PuB-EAA „Steuer-IdNr."** an Arbeitgeber | Aussteller BZSt | mittel — speculative; BZSt nicht bestätigt als angeschlossener Issuer Mai 2026 |
| **PuB-EAA „Personenstand"** (Geburts-/Eheurkunde-Äquivalent) | Aussteller Standesamt | niedrig — keine bestätigte Standesamt-Anbindung Mai 2026; Standesämter sind technisch nicht zentral angebunden, kommunal-fragmentiert |
| **mDoc-Führerschein** in Wallet (analog Apple-Wallet-mDL US-Pattern) | ISO/IEC 18013-5 | mittel — DE-Roadmap ab 2027 (Stufe 1 EUDI-Wallet) |
| **Online-Vorzeige (Remote Flow)** mit Wallet → Verifier | OpenID4VP (OID4VP) / SIOPv2 | hoch — Pflicht-Pattern |
| **Proximity-Vorzeige (NFC, BLE, QR)** zur physischen Kontrolle | mDoc + ISO 18013-5 Device-Engagement | hoch — Pflicht-Pattern |

### EUDI ARF v2.6.0 — gesicherte Eckdaten

- **Vier Attestation-Typen**: PID (Person Identification Data), QEAA (Qualified EAA), PuB-EAA (Public-Body Authentic-Source EAA), EAA (non-qualified EAA). Bestätigt direkt aus eudi.dev/2.6.0.
- **Pflicht-Formate**: Die ARF v2.6.0 selbst formuliert die Format-Mandate weicher als research-scout das nahelegt — sie *unterstützt* mDoc (ISO/IEC 18013-5), SD-JWT VC und W3C VC, und die *konkrete Pflicht* ergibt sich aus den Implementing Regulations CIR 2024/2980 (Wallet) und 2025/1546 (für PID/QEAA-Format-Profile). **Praxis-Konsens** in den LSPs (POTENTIAL/EWC/NOBID/DC4EU): mDoc + SD-JWT VC sind für PID + (Q)EAAs faktisch gesetzt; W3C VC bleibt für non-qualified EAAs offen. **research-scout-Aussage „W3C VC nur optional für non-qualified EAAs" ist substanziell korrekt, aber die Formulierung „mandatiert in ARF v2.6.0" ist zu hart — die Pflicht wandert in CIRs**. Adjudikation siehe Disagreement #6.
- **Mandatory PID-Felder**: Family name, given name, birth date, age over 18 (boolean). Optional: birth place, nationality, current address, gender. Quelle: EUDI ARF Implementing Regulation 2024/2977 PID Attribute Schema (`pid_attribute_schema`).

### UX-Pattern „Selective Disclosure" — Demo-Skript

1. Verifier (Vermieter-/Arbeitgeber-View) zeigt QR-Code: „Bitte teilen Sie: nachname + vorname + age_over_18 + adresse_postleitzahl".
2. Bürger:in scannt mit Tresor-App (im EUDI-Modul).
3. Wallet zeigt Datenminimierungs-Dialog:
   - „Diese Daten werden geteilt: Müller, Anna, age_over_18 = true, PLZ = 10115."
   - „Diese Daten werden **nicht** geteilt: vollständiges Geburtsdatum, Hausnummer, Aktenzeichen."
   - „Empfänger: ImmoScout24 Vermittler (relying-party-id 0815). Rechtsbasis: Art. 6 Abs. 1 lit. b DSGVO + Bonitätsprüfung."
4. Bürger:in bestätigt mit PIN/Biometrie (eIDAS 2 Art. 5a Abs. 5).
5. Wallet erstellt SD-JWT VC; Verifier validiert gegen EU-Trust-List.
6. Privatsphäre-Cockpit (`/datenschutz`-Tab) loggt: was, an wen, wann, Rechtsbasis, Widerrufs-Option.

## Realistic mock-data hints — Dokument-Snapshots der drei Personas

### Anna (eAT-Verlängerung, Aufenthalts-fokussiert)

- **Personalausweis nicht zutreffend** — Anna hat polnische / drittstaatliche Staatsangehörigkeit; statt Personalausweis trägt sie ihren Reisepass + eAT.
- Reisepass (Polen): „PL-Pass [MOCK] AA0123456" — *kein* DE-Aktenzeichen, illustrativ
- eAT-Karte: Aussteller LEA Berlin, CAN [MOCK] T0123456X, Aufenthaltszweck § 18g AufenthG, gültig bis 30.09.2026
- ABH-Erteilungsbescheid: [MOCK] ABH-B-2025/IV-A-7842 (mit qeS-Badge in Demo)
- Krankenkassen-Mitgliedsbescheinigung TK: [MOCK] A123456780, ausgestellt 12.04.2026 (Vorlage für ABH-Verlängerung)
- Meldebestätigung Bürgeramt Mitte: [MOCK] BA-MITTE/EWA-2026-04-0083421, mit VDS-QR-Code (Hamburg-eWA-Pattern auf Berlin extrapoliert — als „Speculative 2027" zu markieren, da Berlin Mai 2026 nicht flächendeckend VDS-stellt)
- Steuerbescheid 2024: [MOCK] 11/123/45678, Einkommensteuer + Solidaritätszuschlag (kein Kirchensteuer-Anteil — Sperrvermerk gesetzt)
- Hochschul-Abschluss: [MOCK] HU-MA-Inf-0883/2024, Master of Science Informatik

### Familie Schmidt (Geburt + Schulanmeldung)

- Personalausweis Mutter + Vater (Doppel-Eintrag): [MOCK] L01ABCD123 / L01EFGH456
- Geburtsurkunde Tochter Marie (geb. 02.03.2024): Standesamt Hamburg-Mitte, [MOCK] HH-G 00892/2024
- Geburtsurkunde Sohn Felix (geb. 17.10.2018): Standesamt Hamburg-Mitte, [MOCK] HH-G 04471/2018
- Familienkasse-Bescheid: [MOCK] 115FK154721 (Kindergeld 2 Kinder)
- Schul-Anmeldebestätigung Felix: [MOCK] SchA-HH-2025/26-0317 (kommunales Schulamt Hamburg)
- Steuerbescheid 2024: [MOCK] 22/345/67890 (Hamburg), Steuerklasse III + V, Kirchensteuer ev (Datenkategorie Art. 9 → Disclaimer)
- Krankenkassen-Mitgliedsbescheinigung BARMER: [MOCK] M845192036 (Familienversicherung der Kinder)
- KFZ-Zulassungsbescheinigung Teil I: [MOCK] A12345678, Kennzeichen HH-MS 1234

### Mehmet (Selbstständig, IHK, Steuer-Pflicht)

- Personalausweis: [MOCK] L01XYZQ789
- Gewerbeanmeldung: [MOCK] GE-M-2024/04711, Gewerbeart „IT-Dienstleistungen / Beratung", Eintrag 12.06.2024
- IHK-Mitgliedsbescheinigung München-Oberbayern: [MOCK] IHK-M-24-08823
- Berufsabschluss IHK: [MOCK] IHK-M-15-04432, Fachinformatiker:in Anwendungsentwicklung
- Steuerbescheid 2024: [MOCK] 143/250/01234 (FA München-Pasing), Einkommen + Umsatzsteuer
- Steuer-IdNr.-Mitteilung BZSt: [MOCK] 47 113 815 421
- Krankenkassen-Beitragsbescheid (freiwillig versichert) TK: [MOCK] Q672013485, Beitrag 421,17 €/Monat
- Rentenversicherungs-Auskunft DRV Bayern Süd: [MOCK] 12 251182 K 071
- **Aufbewahrungsfristen-Banner**: bei Mehmet zeigt Tresor pro Steuer-/IHK-/Buchungs-Dokument den 10-Jahres-Countdown nach § 147 Abs. 3 AO; bei Anna + Schmidt nicht.

## Legal disclaimer to surface in UI (verbatim, `de.json`-bereit)

**1. `dokumente.disclaimer.demo_synthetic`**

> „Hinweis: Alle hier gezeigten Dokumente, Aktenzeichen, QR-Codes und Personen-Daten sind synthetisch und mit `[MOCK]` gekennzeichnet. Diese Demo verarbeitet keine echten Behördendokumente. Hinter den abgebildeten QR-Codes stehen keine produktiven kryptographischen Schlüssel; eine Verifikation mit der echten ZeSI-mobile-App (Bundesdruckerei) würde Treffer „unbekannt" ergeben. Bitte fügen Sie keine echten Dokumente oder personenbezogenen Daten hinzu."

**2. `dokumente.disclaimer.beglaubigung_hoheitlich`**

> „Beglaubigte Kopien können wir Ihnen technisch **nicht** ausstellen. Die amtliche Beglaubigung von Dokumenten ist nach § 33 VwVfG hoheitlich vorbehalten — nur eine Behörde mit Dienstsiegel oder eine Notar:in (§ 39a BeurkG) darf eine Kopie als „mit dem Original übereinstimmend" beglaubigen. Bitte vereinbaren Sie für eine Beglaubigung einen Termin bei Ihrem Bürgeramt, beim ausstellenden Standesamt oder bei einer Notar:in (Notar-App der Bundesnotarkammer)."

**3. `dokumente.disclaimer.eudi_speculative`**

> „Vorschau 2027: Der Export an die deutsche EUDI-Wallet ist eine Vision für 2027. Grundlage ist die EU-Verordnung 2024/1183 (eIDAS 2), die Mitgliedstaaten verpflichtet, **bis zum 31.12.2026** mindestens eine EUDI-Wallet bereitzustellen; private Diensteanbieter (Banken, Plattformen) müssen sie ab Ende 2027 akzeptieren. In Deutschland befindet sich die EUDI-Wallet zum 8. Mai 2026 in der **Sandbox-Phase** (BMDS / SPRIND); ein öffentlicher Stufe-1-Launch ist für Anfang 2027 geplant. Diese Demo simuliert den Export inklusive Selective Disclosure (SD-JWT VC), ohne an einen produktiven Issuer angebunden zu sein."

**4. `dokumente.disclaimer.qr_authenticity`**

> „QR-Code-Echtheitsprüfung: Die hier dargestellten QR-Codes folgen dem Visible-Digital-Seal-Schema nach **BSI TR-03171** (Standardpapier, Version 0.8). Produktiv geprüft werden solche Siegel mit der kostenlosen App **ZeSI mobile** der Bundesdruckerei (verfügbar seit 13.05.2025). Live-Anwendung in Deutschland heute (Mai 2026): elektronische Meldebestätigungen aus Hamburgs eWA-Verfahren (~830 Anmeldungen/Tag, ~350.000 Meldungen kumuliert; flächendeckend produktiv u. a. in Rheinland-Pfalz und Schleswig-Holstein). Für andere Dokument-Typen (Geburtsurkunde, ABH-Bescheid, Krankenkassen-Bescheinigung, KFZ-Brief) ist VDS-Siegelung Mai 2026 **noch nicht produktiv**; die Demo zeigt diese als Speculative-2027-Pattern."

**Zusätzliche kontextspezifische Inline-Disclaimer**

- *Vor* qeS-Verifikation eines Behörden-PDF (z. B. ELSTER-Bescheid): „Diese qualifizierte elektronische Signatur wird gegen die EU-Trust-List (LotL) geprüft. Die Demo simuliert die Prüfung — produktiv erfolgt sie via eIDAS-Validation-Service."
- *Vor* PuB-EAA-Export an Vermieter: „Die geteilte PuB-EAA „Aufenthaltsstatus = gültig" ist 2027-speculative. Heute existiert kein produktiver PuB-EAA-Issuer für ABH-Daten in Deutschland."
- *Vor* Frist-Erinnerung (z. B. eAT-Ablauf): „Frist automatisch erkannt aus Dokument [Dokument-Titel], Original-Wortlaut: „[ZITAT]". Bitte verifizieren Sie das Datum vor Verlass auf die Erinnerung."
- *Vor* Löschen aus dem Tresor: „Diese Löschung betrifft nur Ihren persönlichen Tresor. Das Original im amtlichen Postfach (Mein ELSTER, BundID-ZBP, Kassen-App) bleibt erhalten — dort gelten die Aufbewahrungsregeln der jeweiligen Behörde."

## Zusätzliche Risikofelder, die der Mock vermeiden muss

1. **Keine Andeutung produktiver Behörden-Anbindungen** — keine Aussage „wir holen Ihren Steuerbescheid aus Mein ELSTER", „wir importieren Ihre Krankenkassen-Bescheinigung über die TK-API", „wir lesen Ihre eAT-Daten aus dem AZR". Alle Importe sind manuell + synthetisch.
2. **Keine eigene Beglaubigungs-Funktion** — auch nicht als „Premium-Feature" oder „Coming soon"-Banner. § 33 VwVfG ist hoheitlich, jede Andeutung verleitet Bürger:innen zu falschen Annahmen.
3. **Keine Auto-Versand-Funktion** — der Tresor verschickt nichts an Behörden / Vermieter / Arbeitgeber automatisch. Jeder Share-Flow endet in „Sie teilen jetzt diese Daten mit X — bitte bestätigen mit PIN/Biometrie", und der Versand ist im Mock simuliert (kein echter HTTP-Call).
4. **Keine Cloud-Backup-Suggestion** — Mai 2026 ist die Mock-Architektur ausschließlich `localStorage`. Bei der Architektur-Doku darf die 2027-Vision (E2E-verschlüsseltes Cloud-Backup nach BSI TR-02102-1 mit hardware-backed Key-Management) erwähnt werden, in der UI selbst **nicht**, weil der Eindruck eines aktiven Cloud-Sync für Art.-9-Inhalte (Religion via Kirchensteuer, Sozialdaten via Bürgergeld, Aufenthalts-/Gesundheitsdaten) entstehen könnte. Adjudikation siehe Disagreement #5.
5. **Watermark-Pflicht** — `[MOCK]` sichtbar im Aktenzeichen + Banner-Zeile am oberen Rand jedes Dokument-Detail-Views: „[MOCK – Verwaltungsdemo, keine echten Daten]".
6. **Klarheit Aussteller vs. Hersteller**: bei Personalausweis/eAT/KFZ-Brief ist die Bundesdruckerei Hersteller, nicht Aussteller. UI-Texte müssen das präzise spiegeln, sonst entsteht ein verschwommener Eindruck der hoheitlichen Verantwortung.
7. **Pseudonym-Funktion sichtbar machen** — bei jedem eID-Login zeigt die Demo, dass ein dienstespezifisches Kennzeichen nach § 9 Abs. 5 PAuswG erzeugt wird (Cross-Anbieter-Profilbildung verhindert). Das ist heute schon Realität, kein Speculative.

## Adjudikation der fünf Research-Disagreements + neu

### Disagreement #1 — „Beglaubigte Kopie selbst generieren?"

**Adjudikation: research-scout korrekt — App generiert KEINE beglaubigte Kopie.** Begründung im Wortlaut:

§ 33 Abs. 1 VwVfG: „Jede Behörde ist befugt, Abschriften von Urkunden, die sie selbst ausgestellt hat, zu beglaubigen." Abs. 2 erweitert auf Bundes-/Landesbehörden für fremde Urkunden, *soweit die Urkunde von einer Behörde stammt oder zur Vorlage bei einer Behörde benötigt wird*. § 33 Abs. 4 VwVfG verlangt einen Beglaubigungsvermerk mit Bezeichnung der Urschrift, Übereinstimmungs-Feststellung, **Ort und Tag**, **Unterschrift des zuständigen Bediensteten** und **Dienstsiegel**; bei elektronischer Form ersetzt eine qeS oder ein qualifiziertes elektronisches Siegel die Unterschrift (§ 33 Abs. 4 S. 4 VwVfG i.V.m. § 3a Abs. 2 VwVfG). Eine private App ist keine Behörde iSv § 1 Abs. 4 VwVfG; sie hat keine Bediensteten und kein Dienstsiegel. Ein Beglaubigungs-Versuch wäre rechtlich unwirksam und verleitete Bürger:innen zur Vorlage einer formal mangelhaften Kopie → Risiko der Antrags-Ablehnung mit Frist-Verlust.

**UX-Konsequenz**: Statt einer Beglaubigungs-Funktion zeigt der Tresor pro Dokument einen klaren Deep-Link „Beglaubigte Kopie anfordern → Bürgeramt-Termin / Standesamt-Termin / Notar-App". Kein Button, der den Eindruck einer eigenen Beglaubigung erwecken könnte.

### Disagreement #2 — VDS-QR-Code auf jedem Mock-Dokument vs. nur auf produktiv-realen

**Adjudikation: differenziert — QR-Code auf jedem Dokument darstellen, aber pro Dokument-Typ klar markieren, ob heute (Mai 2026) produktiv-real, Pilot oder 2027-speculative.**

| Dokument-Typ | VDS-Real-Status Mai 2026 | Demo-Marker |
|---|---|---|
| Hamburg-eWA-Meldebestätigung | **produktiv** seit 2025 | „Live-Pattern" — kein Speculative-Disclaimer nötig, aber `[MOCK]`-Watermark |
| Berlin-/München-Meldebestätigung | nicht flächendeckend (RP + SH ja, andere Länder Stand Mai 2026 partiell) | „Speculative 2027 — wird gemäß ZeSI-Roadmap eingeführt" |
| Steuerbescheid (Mein ELSTER) | qeS / qualifiziertes Siegel real, aber kein VDS — Validierung über EU-Trust-List | „qeS-Badge" — *kein* VDS-QR-Code, sondern „qeS verifiziert" |
| Geburts-/Eheurkunde | kein VDS produktiv (Stand Mai 2026 — digitale Personenstandsurkunde noch nicht im Echtbetrieb) | „Speculative 2027" — VDS-QR als Vorschau |
| Führungszeugnis (BfJ) | qualifiziertes Siegel ja (§ 30 Abs. 5 BZRG), VDS nein | „qeS-Badge" + „Speculative 2027" für VDS-Erweiterung |
| ABH-Bescheid / eAT-Karte selbst | kein VDS auf Karte; Karten-Authentizität via Chip + ePass-Standard | „kein VDS — Karten-Authentizität über Chip" |
| Krankenkassen-Mitgliedsbescheinigung | kein VDS, Selbstverwaltungs-Stelle nicht im ZeSI-Verbund | „Speculative 2027 — selbstverwaltungs-spezifisches Siegel-Schema offen" |

**Begründung**: research-scout-Vorschlag „QR auf jedem mit Speculative-Tag" ist halb richtig — aber verwischt die Trennlinie zwischen (a) VDS-Pattern und (b) qeS-am-PDF. Beide existieren parallel, sind technisch unterschiedlich (VDS = Data-Matrix mit eingebetteten Daten + Signatur; qeS = PAdES-Inline-Signature), und Bürger:innen müssen die Differenzierung mental nicht auflösen — die UI muss das aber sauber kennzeichnen. **Konsequenz für den Mock**: zwei Authentizitäts-Badges („VDS prüfbar mit ZeSI mobile" vs. „qeS gültig — eIDAS"), und beide als separate visuelle Signale.

### Disagreement #3 — PuB-EAA-Live-Status DE Mai 2026

**Adjudikation: Sandbox bestätigt; KEIN produktiver PuB-EAA-Issuer in DE Mai 2026.**

Quelle BMDS / EUDI-Wallet-Themenseite (www.eudi-wallet.gov.de + bmds.bund.de): Sandbox seit Anfang 2026 für PID-Tests gestartet, im Verlauf 2026 erweitert um Test-EAAs. **Public-Launch Stufe 1 Anfang 2027** geplant. Bezeichnungen wie „Personenidentifizierungsdaten (PID) bereits in Tests" sind durch BMDS direkt belegt. Eine konkrete öffentliche Liste angeschlossener PuB-EAA-Issuer (welche Behörde, welche Attestation) ist Mai 2026 **nicht öffentlich publiziert**; im LSP-Konsortium POTENTIAL hat DE-Beteiligung am Government-Use-Case (PID + mDL), aber kein produktives PuB-EAA-Roll-out an Bürger:innen.

**Konsequenz**: Jeder PuB-EAA-Workflow in der Demo trägt das `dokumente.disclaimer.eudi_speculative`-Banner. Behauptungen wie „so funktioniert das schon heute" wären realismusverletzend.

### Disagreement #4 — Standalone-Vault-App vs. Modul innerhalb DeutschlandID

**Adjudikation: für die Demo Standalone, mit klar artikulierter „Modul-Vision".**

Begründung:
- **Politisch-strategisch** ist ein Modul innerhalb DeutschlandID/BundID das realistische 2027-Zielbild — eine vierte separate App birgt Adoption-Risiko (eGov-MONITOR 2025: 25 % eID-Nutzung, App-Müdigkeit dokumentiert).
- **Demo-strategisch** ist Standalone besser, weil (a) der Demo das Recht hat, das End-to-End-Erlebnis isoliert vom heutigen BundID-Funktionsstand zu zeigen, ohne in BundID-Trade-offs gefangen zu sein; (b) das Konzept-Demo-Format ohnehin als „so könnte das Zusammenspiel aussehen" präsentiert wird, nicht als Produkt-Empfehlung an BMDS; (c) die Architektur-Doku die Re-Integration in BundID/DeutschlandID als 2027-Ziel sauber benennen kann.
- **Domain-expert-Empfehlung**: die Demo positioniert sich als **„Bürger-zentrische Schicht über DeutschlandID + BundID-ZBP + EUDI-Wallet"**, nicht als vierter Player. UI zeigt prominent eine „Verbunden mit DeutschlandID"-Statuszeile (mock, mit Disclaimer). Das ist konsistent mit dem Estland-Eesti-App-Pattern (eine zentrale Bürger-App, nicht eine separat lebende vierte Identität).

### Disagreement #5 — Cloud-Backup für Art. 9-Inhalte

**Adjudikation: research-scout korrekt — `localStorage`-only in Demo; kein Cloud-Backup-Hinweis in UI.**

Begründung:
- Im Tresor liegen typische Art.-9-DSGVO-Inhalte: Religion (via Kirchensteuer-Anteil im Steuerbescheid + KiStAM-Mitteilung), Sozialdaten (§ 67 SGB X — Bürgergeld, Wohngeld, ALG), indirekte rassisch/ethnische Daten (Aufenthaltsstatus eAT), Gesundheitsdaten (Reha-Bescheid, AU-Bescheinigung). Cloud-Speicherung dieser Inhalte erfordert (a) **ausdrückliche Einwilligung** nach Art. 9 Abs. 2 lit. a DSGVO, (b) AVV Art. 28 DSGVO mit Cloud-Provider, (c) bei Drittland-Transfer (US-Hyperscaler) Standard Contractual Clauses + Transfer Impact Assessment, (d) BSI-TR-02102-1-konforme Verschlüsselung mit Bürger-kontrollierten Schlüsseln, (e) im EU-AI-Act-Kontext keine zusätzliche Triggerung von Hochrisiko-Klassifikationen.
- Eine Mock-Demo hat keinen Bedarf, dieses Komplexitäts-Knäuel auch nur anzudeuten — `localStorage` löst die Demo-Anforderung vollständig.
- **Architektur-Doku (separater Pfad)** darf die 2027-Vision als „E2E-verschlüsseltes Cloud-Backup mit Hardware-Backed-Key-Management (Secure Enclave / StrongBox) nach BSI TR-02102-1; Schlüssel-Recovery via Social Recovery oder eID-PIN-Reset" benennen — aber neutral, nicht als Demo-Feature.

### Neu: Disagreement #6 — „mDoc + SD-JWT VC sind in ARF v2.6.0 mandatiert"

**Adjudikation: Formulierung präzisieren.** ARF v2.6.0 selbst (eudi.dev/2.6.0) listet mDoc, SD-JWT VC, W3C VC als unterstützte Formate; die *konkrete Pflicht* für PID + (Q)EAAs steht in den Implementing Regulations (CIR 2024/2980 Wallet, sowie nachfolgende CIRs Q3+Q4 2025 für Format-Profile). LSP-Praxis-Konsens (POTENTIAL/EWC/NOBID/DC4EU): PID + (Q)EAAs werden in mDoc + SD-JWT VC ausgegeben; W3C VC bleibt für non-qualified EAAs eine Option. **research-scout-Aussage „W3C VC nur optional für non-qualified EAAs" ist substanziell richtig, aber „mandatiert in ARF v2.6.0" ist nicht der saubere Beleg-Pfad — die Pflicht wandert in CIRs**. Die Demo darf weiterhin „mDoc-Pflicht-Format + SD-JWT-VC-Pflicht-Format" sagen, sollte aber nicht ARF v2.6.0 als alleinige Quelle zitieren, sondern eIDAS 2 + CIRs.

### Neu: Disagreement #7 — „Aussteller vs. Hersteller (Bundesdruckerei)"

**Adjudikation: Tresor-UI muss präzise differenzieren.** Bei PA / Reisepass / eAT / KFZ-Brief Teil I+II ist die **Bundesdruckerei nur Hersteller**, nicht Aussteller iSv eIDAS 2 Art. 3 Nr. 46 / authentic source. Aussteller (= Behörde, die den Verwaltungsakt erlässt) bleibt Bürgeramt / ABH / KFZ-Zulassungsstelle. research-scout schreibt das in der Tabelle korrekt; UI-Texte sollten die Trennung explizit halten — besonders im Kontext PuB-EAA, weil eine PuB-EAA-Authentic-Source eben **nicht** „Bundesdruckerei", sondern die jeweilige hoheitliche Stelle ist. Wichtige Klarstellung für Behörden-Realismus.
