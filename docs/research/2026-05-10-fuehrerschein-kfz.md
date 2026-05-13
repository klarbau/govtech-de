---
topic: Führerschein + KFZ-Halter für Stammdaten V1.1
question: Wie korrekt zeigen wir FE-Nr, Fahrerlaubnisklassen, Punkte-Konto, KFZ-Halter-Daten in der Lese-/Wegweiser-Schicht — und wie maps das auf das hypothetische 2027-Konvergenz-Bild (DeutschlandID + EUDI Wallet + i-Kfz-App)?
date: 2026-05-10
status: research-pending-domain-validation
upstream-from: docs/specs/stammdaten.md (V1 shipped 2026-05-10); ergänzt Umzug-Block-D
confidence: high
---

## TL;DR

- **Zwei getrennte Register, zwei getrennte Behörden-Layer.** Fahrerlaubnis sitzt im **ZFER** (Zentrales Fahrerlaubnisregister beim KBA, seit 1999, ohne Anschrift), Punkte sitzen im **FAER** (Fahreignungsregister beim KBA, § 28 StVG, 1-2-3-Punkte-System nach § 4 StVG). Halter-Daten sitzen im **ZFZR** (Zentrales Fahrzeugregister beim KBA, § 32/33 FZV) — gespeist von kommunalen Zulassungsstellen. Kein Single-Register-Layer. [^1][^2][^3][^4]
- **Operative Zuständigkeit ist *kommunal* (Landkreis / kreisfreie Stadt) — die Fahrerlaubnisbehörde ist via § 73 FeV als untere Verwaltungsbehörde definiert; das Land ist nur Fach-/Widerspruchsaufsicht.** Korrekturwege müssen also auf konkrete kommunale Behörden zeigen, nicht ans KBA. [^5][^6]
- **i-Kfz Stufe 4 ist seit 1. Sept. 2023 live**, Adressänderung an den Halterdaten ist online möglich (>1 Mio. Vorgänge im ersten Jahr); aber der Anstoß muss vom Halter ausgehen — eine vollautomatische Synchronisierung Bürgeramt → Zulassungsstelle bei Umzug **gibt es heute nicht**. Das ist die Lücke, die unser Umzug-Autopilot Block-D speculatively schließt. [^7][^8][^9]
- **Digitaler Führerschein und digitaler Fahrzeugschein sind 2025/26 Realität geworden, aber als nationale i-Kfz-App, nicht als EUDI-mDL.** Digitaler Fahrzeugschein in i-Kfz-App seit Nov 2025 (>1 Mio. Downloads im ersten Monat); digitaler Führerschein national bis Ende 2026 angekündigt; EU-mDL in EUDI Wallet erst ab 2028 (Pflicht-Ausstellung), Direktive Adoption Q4 2025, Transposition bis H2 2027. Unser 2027-Demo-Bild liegt also **genau im Übergang**. [^10][^11][^12][^13]
- **Punkte-Auskunft ist heute schon online mit eID gebührenfrei abrufbar (FAER-Online-Registerauskunft)** — aber der Bürger muss den Vorgang aktiv anstoßen, das Ergebnis kommt als PDF. Eine *passive Anzeige* des Punktestands in einem Citizen-Layer ohne expliziten Auskunftsantrag wäre eine sensible Erweiterung — Hard-Line für unsere Lese-Schicht. [^14][^15]

---

## Findings

### 1. FE-Nummer-Format (verifier-relevant)

Die deutsche Führerscheinnummer ist **11 Zeichen lang** und folgt einer formalen Struktur (Wikipedia konsolidiert, Format wird durch FeV/FS-VwV beschrieben):

| Position | Bedeutung | Format |
|---|---|---|
| 1 | Bundesland-Kennzeichen | Buchstabe A-P (alphabetisch nach Bundesland: A=BW, B=BY, …, P=TH) |
| 2-4 | Behörden-Kennung (Landkreis / kreisfreie Stadt + Außenstellen-Ziffer) | 3 Ziffern |
| 5-9 | Lfd. Nummer | alphanumerisch (zuerst Ziffern, dann Großbuchstaben) |
| 10 | Prüfziffer | 0-9 oder X (modulo-11 über Stellen 1-9 mit Faktoren 9..1) |
| 11 | Ausfertigungsnummer | 0 = Original, 1+ = Ersatz/Folge-Schein |

Beispiel laut Wikipedia: `B0727RRE2I55` → B=Bayern, 072=Landkreis Dachau, RRE2I=lfd. Nummer, Prüfziffer 5, Ausfertigung 5. [^1]

**Lage auf der EU-Karte (seit 19. Jan 2013):** Punkt 5 auf der Vorderseite. Punkte 1-9 vorne (Name, Vorname, Geburtsdatum/-ort, Ausstellungs-/Ablaufdatum, ausstellende Behörde, FE-Nummer, Unterschrift, Anschrift, Lichtbild); Punkte 9-14 auf der Rückseite (Klassen-Tabelle mit Erteilungs-/Ablaufdatum + Schlüsselzahlen). [^16]

**Maschinenlesbarkeit:** Die EU-Kartenführerscheine seit 2013 enthalten einen 1D/2D-Code mit den Hauptdaten und (optional) RFID/Kontaktchip nach ISO 18013; ein vollwertiges MRZ wie beim PA gibt es **nicht** — der Standard ist die 2D-Barcode-Variante. [^16]

**Ältere Versionen:** Graue Lappen (vor 1986) und rosa Karten (1986–1998) hatten andere Nummerierungssysteme; heute beim Pflichtumtausch erhalten alle Halter die strukturierte 11-stellige Form sofort am Schalter. [^17]

**Pflichtumtausch-Stichtage (relevant für Frist-Logik der App):** [^17][^18]
- Geburtsjahr **vor 1953**: bis 19.01.2033
- Geburtsjahr 1953-1958: bis 19.01.2022 (abgelaufen)
- Geburtsjahr 1959-1964: bis 19.01.2023 (abgelaufen)
- Geburtsjahr 1965-1970: bis 19.01.2024 (abgelaufen)
- Geburtsjahr ab 1971: bis 19.01.2025 (abgelaufen)
- Ausstellung 1999-2001: bis 19.01.2026 (in Kürze)
- Ausstellung 2002-2004: bis 19.01.2027
- Ausstellung 2005-2007: bis 19.01.2028
- Ausstellung 2008: bis 19.01.2029
- Ausstellung 2009: bis 19.01.2030
- Ausstellung 2010: bis 19.01.2031
- Ausstellung 2011: bis 19.01.2032
- Ausstellung 2012-18.01.2013: bis 19.01.2033

→ **Demo-Hook**: ein Demo-Persona kann eine offene Umtausch-Frist sichtbar machen ("Ihr Führerschein muss bis 19.01.2027 umgetauscht werden") als Wegweiser-CTA in Stammdaten.

### 2. Fahrerlaubnis-Behörden-Zuständigkeit

Die **Fahrerlaubnisbehörde** ist nach **§ 73 Abs. 1 FeV** die jeweils **untere Verwaltungsbehörde** — d.h. **kommunal** (Landkreis / kreisfreie Stadt; in Stadtstaaten ggf. Bezirk). [^5][^6][^19]

In der Praxis ist sie meistens als Abteilung dem **Straßenverkehrsamt** des Kreises angegliedert. Die Bezeichnung "Führerscheinstelle" ist umgangssprachlich; juristisch korrekt ist "Fahrerlaubnisbehörde". [^5][^19]

**Die Länder sind Fach- und Widerspruchsaufsicht**, vergeben aber selbst keine Fahrerlaubnisse (außer ggf. in Stadtstaaten, wo Land = Kommune zusammenfallen). [^6]

**Implikation für `behoerden.json`**: Fahrerlaubnisbehörde sitzt in der `kategorie: kommune`-Bucket, **nicht** `kategorie: land`. Beispiel-Einträge:
- Berlin (Stadtstaat): "Landesamt für Bürger- und Ordnungsangelegenheiten – Abt. Fahrerlaubnisbehörde, Puttkamerstr. 16-18"
- Köln (kreisfreie Stadt): "Stadt Köln – Straßenverkehrsamt, Amt für öffentliche Ordnung – Fahrerlaubnisstelle, Hohenstaufenring 16"
- München (kreisfreie Stadt): "Kreisverwaltungsreferat München – Fahrerlaubnisbehörde, Ruppertstr. 19"

### 3. FAER (Fahreignungsregister Flensburg)

**Rechtsgrundlage**: §§ 28-30a StVG; das **1-2-3-Punkte-System** wurde zum 1. Mai 2014 eingeführt (vorher: 1-7-Punkte-System), Stand 2026 unverändert in Kraft. [^4][^20]

**Punkte-Vergabe nach § 4 StVG**:
- 1 Punkt: Ordnungswidrigkeit, die Verkehrssicherheit beeinträchtigt
- 2 Punkte: grobe OWi (mit Fahrverbot) oder Straftat ohne FE-Entzug
- 3 Punkte: Straftat mit FE-Entzug

**Maßnahmen-Stufen**:
- 1-3 Punkte: keine Maßnahme ("grüner Bereich")
- 4-5 Punkte: Ermahnung (schriftlich)
- 6-7 Punkte: Verwarnung (schriftlich)
- 8+ Punkte: Entziehung der Fahrerlaubnis

**Online-Abruf der eigenen Punkte** [^14][^15]:
- Voraussetzung: nPA mit aktivierter eID-Funktion + 6-stellige PIN + NFC-Smartphone (oder Kartenleser am PC) + AusweisApp
- Login via **BundID**
- Ergebnis: PDF-Dokument
- Kosten: gebührenfrei
- Bearbeitungszeit: sofort (Online) bzw. ca. 14 Tage (postalisch)

**Hard-Line für unsere Lese-Schicht**: Punkte werden **nicht** im PA-MRZ oder in einer "Profile-Stammdaten"-Quelle vorgehalten — sie sind ein **on-demand pull** vom KBA, der eine eID-Authentifizierung pro Abruf erfordert. Eine "Punktestand: 3"-Anzeige in Stammdaten V1.1 ohne expliziten Bürger-Trigger wäre eine **rechtsdogmatisch heikle Aggregation**: das KBA ist nicht verpflichtet, Punkte passiv an einen Aggregator zu pushen, und die Selbstauskunft ist als bewusster Akt konzipiert (mit Aktivitätsprotokoll-Logging). → siehe Empfohlener Scope.

### 4. ZFER (Zentrales Fahrerlaubnisregister)

**Bestand**: alle in Deutschland seit dem 1. Januar 1999 ausgestellten Fahrerlaubnisse mit EU-einheitlichen Klassen A-E (plus M, L, S, T bzw. seit 19.01.2013 nur L und T). [^21][^22]

**Gespeicherte Daten** (ohne Anschrift!) [^21][^22]:
- Personendaten (Name, Vorname, Geburtsdatum, -ort)
- Fahrerlaubnisklassen (A1, A2, A, B, BE, C1, C, CE, D1, D, DE, T, L)
- Auflagen und Beschränkungen (Schlüsselzahlen)
- Erteilungs- und Ablaufdatum je Klasse
- Probezeit (für Fahranfänger)
- Berechtigungen für Kraftfahrsachverständige / Prüfingenieure

**Anschrift wird im ZFER ausdrücklich NICHT gespeichert** [^21] — die Anschrift kommt aus dem Melderegister, das die Fahrerlaubnisbehörde anhand der lokalen Akte bei Bedarf abruft.

**Online-Auskunft für Bürger:innen** [^21][^23]:
- via BundID + AusweisApp + nPA-eID
- gebührenfrei
- Ergebnis als PDF

**Implikation**: In Stammdaten V1.1 muss die FE-Card **klar zwischen ZFER-Daten (Klassen, Schlüsselzahlen, Erteilungsdatum) und der Anschrift (BMG-Quelle Bürgeramt)** trennen. Die FE-Behörde ist **nur autoritativ für die Klassen-Daten und das Dokument selbst**, nicht für die Anschrift.

### 5. ZFZR (Zentrales Fahrzeugregister) + Halter-Daten

**Rechtsgrundlage**: § 32 FZV (Speicherung im örtlichen + zentralen Register), § 33 FZV (Übermittlung Zulassungsstelle → KBA), § 35 StVG (Auskunft an Behörden). [^24][^25][^26]

**Halterdaten gemäß § 6 FZV i.V.m. § 32 FZV** [^24][^25]:
- Familienname
- Geburtsname
- Vornamen
- Ordens-/Künstlername (sofern angegeben)
- Geburtsdatum + -ort
- Geschlecht
- Anschrift
- (bei Selbstständigen mit gewerblichen Kennzeichen: Beruf/Gewerbe)
- Datum der Änderung der Halterdaten
- Frühere Halter und Anzahl

**Halter-Auskunft an Bürger** [^27]:
- Selbstauskunft online via KBA-Portal mit eID
- Auskunft über aktuell auf eigenen Namen zugelassene Fahrzeuge UND letzte Halter-Position auf nicht mehr aktiven Fahrzeugen
- Behörden bekommen Auskunft nach § 35 StVG

**i-Kfz Stufe 4 (seit 1. Sept 2023)** [^7][^8][^9]:
- Voll-online An-, Ab-, Ummeldung
- Voraussetzungen: nPA mit aktivierter eID + PIN, eVB-Nr (elektronische Versicherungsbestätigung), digitale HU-Bescheinigung, SEPA-Mandat, ggf. Sicherheitscode auf ZB Teil I (zur Halterwechsel-Authentifizierung)
- Bearbeitungszeit: 10-15 Min, Kennzeichen 1-3 Werktage per Post
- Adressänderung im Halterdatensatz (innerhalb des gleichen Zulassungsbezirks oder bezirksübergreifend) ist als Online-Vorgang verfügbar; Anstoß muss aber vom Halter erfolgen, **keine automatische Synchronisierung Bürgeramt → Zulassungsstelle**

**Pflicht zur Mitteilung**: § 13 FZV — Änderungen der Halterdaten müssen "unverzüglich" (Auslegung: i.d.R. 1 Woche) der Zulassungsbehörde mitgeteilt werden. [^28]

**Demo-Implikation für Umzug-Autopilot Block-D**: Heute ist Block-D *speculative-2027*; in Realität wäre die FZV-§-13-Pflicht auf den Halter, das System würde diesen Vorgang im Citizen-Layer pre-fillen + an Zulassungsstelle als digitale i-Kfz-Anfrage transportieren — nicht "automatisch synchronisieren" im hoheitlich-rechtlichen Sinn.

### 6. Digitaler Führerschein + digitaler Fahrzeugschein (Stand Mai 2026)

**Digitaler Fahrzeugschein** (live seit Nov 2025, KBA + BMV) [^10][^11]:
- in der i-Kfz-App des Bundes (BMV-Federführung, KBA-Betrieb)
- >1 Mio. Downloads im ersten Monat
- Akzeptanz bei Polizeikontrollen: rechtlich noch in Übergangsphase, ADAC + KBA empfehlen weiterhin Papier-ZB-I parallel

**Digitaler Führerschein** [^11][^12][^29]:
- Bundeskabinettsbeschluss zum Gesetzentwurf November 2025
- Ziel: Verfügbarkeit national bis Ende 2026
- Gleiche i-Kfz-App soll Führerschein-Anzeige erhalten
- Voraussetzung: iOS 17+ / Android 12+; ältere Geräte + bestimmte Hersteller (Huawei, einige Motorola) ausgeschlossen → ADAC kritisiert Wahlfreiheit-Defizit

**Übergang zur EU-mDL über EUDI Wallet** [^12][^13][^30]:
- EU-Führerschein-Direktive (Revision der 3. FE-RL) im EU-Parlament am 21.10.2025 final beschlossen
- Adoption Q4 2025, **nationale Umsetzung bis 2. Halbjahr 2027**, **Pflicht-Anwendung ab 2. Halbjahr 2028**
- mDL-Standard: ISO/IEC 18013-5 + 18013-7 (Selective Disclosure, mdoc + SD-JWT VC)
- mDL ist als PID-Erweiterung konzipiert, in EUDI Wallet einbettbar nach ARF 2.4

**Implikation für unser 2027-Demo-Bild**: Wir liegen genau im Spannungsfeld
- *nationale i-Kfz-App* (real, 2025-2026)
- *EUDI-Wallet-mDL* (nicht-real-bis-2028)

→ Unser Demo zeigt das hypothetische Konvergenz-Bild *"DeutschlandID + Citizen-Layer + EUDI-Wallet"* mit `[MOCK]`-Watermark + 2027-Vision-Banner. Das ist konsistent mit dem speculative-design-Mandat aus PRD § 1.

### 7. Datenschutz-Hard-Lines

| Datenfeld | Quelle | Lese-Schicht V1.1 darf zeigen? | Bedingung |
|---|---|---|---|
| FE-Nummer | ZFER (eID-pulled) oder PA-Vault-Dokument | **ja** | Read-only, mit Behörde-Badge "Fahrerlaubnisbehörde {Kommune}" |
| Fahrerlaubnis-Klassen | ZFER (eID-pulled) | **ja** | Read-only, Klassen-Tabelle wie auf Karte Rückseite |
| Schlüsselzahlen | ZFER | **ja, optional collapsed** | Tooltip mit Erklärung, weil Insider-Codes (z.B. 95 = BKrFQG; 70 = Umtauschdokument) |
| Erteilungsdatum + Ablaufdatum pro Klasse | ZFER | **ja** | Frist-Banner bei nahem Ablauf (LKW-Klassen 5-Jahres-Rhythmus) |
| Pflichtumtausch-Stichtag | abgeleitet aus Geburtsjahr + Ausstellungsdatum | **ja** | als CTA-Banner mit Wegweiser zu Fahrerlaubnisbehörde |
| Punkte-Stand (FAER) | KBA on-demand mit eID | **NEIN als passive Anzeige** | nur on-demand-CTA "Punktestand abrufen" mit eID-Reauth + Activity-Log-Eintrag (analog zu Religion-Card-Modal-Pattern in Stammdaten V1) |
| Aktive Maßnahmen (Ermahnung/Verwarnung/MPU) | FAER | **NEIN in V1.1** | sensible Daten — keine Aggregation; Hinweis "Maßnahmen werden Ihnen direkt von Ihrer Fahrerlaubnisbehörde zugestellt" |
| KFZ-Halter-Status (eigene Fahrzeuge) | ZFZR (eID-pulled) | **ja** | Liste aktiver Zulassungen mit KZ, FIN-Hash, Marke/Modell, HU-Datum |
| FIN (Fahrgestellnummer) | ZFZR | **ja, masked** (Letzte-4-Stellen-Pattern wie IBAN) | Vollanzeige nur on-click, weil als Identifier-Equivalent missbrauchbar |
| Halter-Adresse | ZFZR | **ja** | mit Hinweis-Badge "Synchronisierung mit Bürgeramt-Anschrift erfolgt **nicht** automatisch — bei Umzug separat melden (§ 13 FZV)" |
| HU-/AU-Datum + nächste Frist | ZFZR + zugelassene Prüfstellen (Daten-Weitergabe nach § 33 FZV) | **ja** | Frist-Banner bei nahem Ablauf |
| Versicherungsstatus | nicht im KBA-Register direkt; Versicherer melden eVB an Zulassungsstelle | **eingeschränkt** | nur "letzte bekannte eVB" + Disclaimer "echte Versicherungsstatus-Abfrage erfolgt durch Zulassungsstelle, nicht durch diesen Layer" |

### 8. Prior Art (5+ Länder)

**Estland** [^31][^32]: Eesti.ee + Eesti äpp = nationaler Citizen-Hub mit Mobile-Pendant. Driving-License-Status ist via Eesti äpp und e-teenindus.mnt.ee einsehbar; Antrag auf FE in 5 Min einreichbar. Pattern: **single mobile super-app mit "Documents"-Sektion**, dort PA + Reisepass + FE als 3 nebeneinander stehende Kacheln. Akzeptiert von Polizei. UX-borrow-Idee: gleiches Cluster ("Identitäts-Dokumente") in Stammdaten-Sektion `/dokumente` Hand-off.

**Niederlande (RDW)** [^33][^34]: Mijn RDW über DigiD. Sehr klare Trennung "Mijn rijbewijs" vs "Mijn voertuig". Download-CTA "Download mijn gegevens" als PDF — nutzbares Pattern für unsere "Aktivitätsprotokoll als PDF exportieren"-Affordanz. Verlängerung digital seit 2014 mit DigiD-App, Photo-Upload via separater Pasfoto-Service-Integration. Separate Apps "RDW Rijbewijs" + "RDW Voertuig". Pattern: **klare Trennung von Personen-Dokumenten vs Fahrzeug-Eigentum**, beides aber unter einem Login.

**Frankreich (ANTS / France Titres)** [^35][^36]: Permis de conduire über permisdeconduire.ants.gouv.fr, FranceConnect-SSO; FranceConnect+ (= France Identité, eIDAS-LoA-High) seit 2024 verfügbar. Pattern: **Single-Sign-On-Layer (FranceConnect) zwischen mehreren Behörden-Portalen**, statt eines aggregierenden Citizen-Hubs — eher Föderation als Aggregation. Lehre für DE: BundID + Datenschutzcockpit-Choreographie geht *einen Schritt weiter* als FranceConnect, weil sie auch die Datenflüsse sichtbar macht.

**Italien (IT-Wallet via IO-App + Portale dell'Automobilista)** [^37][^38]: Patente di guida digital seit 2025 in IT-Wallet (im IO-App-Container). Ähnlich wie deutsche i-Kfz-App, aber im *generischen* Bürger-Wallet IO statt einem dedizierten Mobilitäts-Hub. Bei FE-Verlängerung: zentraler Server aktualisiert das digitale Dokument automatisch, bevor das physische Plastik im Briefkasten ist. Pattern: **digitale Vertretung wird vor dem physischen Dokument gültig**. Akzeptiert bei Polizeikontrollen. Akzeptanz-Frictions sichtbar (Forum-Threads zu "Anagrafe-Inkongruenzen").

**Norwegen (Statens vegvesen "Min Side")** [^39][^40]: Min Side mit Sektionen "Mine kjøretøy" (Fahrzeuge), "Førerkortet mitt" (Führerschein), "Mine saker" (Cases), "Mine meldinger" (Posteingang). Digitaler Führerschein als App "Førerkort" — auf der Karte sichtbar: Foto, Klassen, FE-Nr, QR-Code + dynamische "Tagesnummer" (anti-screenshot-fraud). Login via MinID/BankID, nicht MitID (MitID ist DK). Pattern: **anti-screenshot-fraud-elemente** (rotierender QR + Tagesnummer) sind ein UX-Detail, das unser Mock-Wallet-Modal in Stammdaten-Sub-Tab "Wallet & Externe Empfänger" andeuten kann.

**Dänemark (Kørekort-app via MitID)**: Dänemark hat seit 2018 eine staatliche Kørekort-App; Führerschein wird nach Akzeptanz beim Polizeiverband 2021 als Identitätsnachweis akzeptiert. Pattern: **Bürger-Akzeptanz-Building über mehrjährige Übergangsphase** — relevant für unser Demo-Narrativ "warum 2027 noch parallel zur Plastikkarte".

### 9. EU eIDAS 2.0 / EUDI Wallet PID + mDL

**Status Mai 2026** [^13][^41][^42][^43]:
- eIDAS-2.0-Verordnung (Reg. EU 2024/1183) in Kraft seit Mai 2024
- Implementing Acts veröffentlicht 24.12.2024 → 24-Monats-Frist für Member-State-Wallet-Bereitstellung läuft bis Ende Dez 2026
- ARF 2.4 ist die aktuelle technische Referenz; PID-Rulebook + mDL-Rulebook als Annexe
- mDL-Format: ISO/IEC 18013-5 (proximity, BLE/NFC) + 18013-7 (online flows) + SD-JWT VC für Backend-Issuance
- Realismus-Caveat: Biometric Update Dezember 2025 berichtet, dass mehrere Member-States (z.B. NL) den Dez-2026-Termin **nicht halten werden** [^41]

**PID-Mandatory-Attribute** (relevant für unser bestehendes Wallet-Subtab):
- given_name, family_name, birth_date, age_over_18, age_in_years (selective), nationality, place_of_birth, address (optional)

**mDL-Attribute** (zusätzlich zur PID, beim mDL-Issue):
- driving_privileges (Klassen + Bedingungen + Erteilungs-/Ablauf-Datum)
- portrait, signature_usual_mark
- issuing_authority + issuing_country + document_number (= FE-Nr)
- expiry_date, issue_date

→ **In Stammdaten V1.1 Wallet-Subtab**: Mock-Attestation-Vorschau kann analog zur PID-Vorschau (8 Pflicht + 4-aus-6 Hilfsattribute) eine **mDL-Mock-Attestation** anbieten, mit Selective-Disclosure-Toggle ("Nur Klasse B + Ablaufdatum offenbaren — nicht Foto, nicht Erteilungsdatum, nicht FE-Nr"). Das ist ein UX-Differenzierungs-Hook, den weder Estonia noch Norwegen heute zeigen.

### 10. OZG 2.0 / Single Digital Gateway (Pflicht-Online-Stellung)

**OZG-Änderungsgesetz (OZG 2.0)** in Kraft seit Juli 2024. **16 Fokusleistungen** definiert; darunter: [^44][^45]
- **Führerschein (OZG-ID 10169)** — Erstantrag, Verlängerung, Pflichtumtausch
- **i-Kfz** — alle Halter-Vorgänge
- **Wohnsitz-An-/Abmeldung** — eWA (relevant für Umzug)

**Status Jan 2026**: nur **4 Fahrerlaubnisbehörden** haben den OZG-Online-Dienst Führerschein bisher angeschlossen — extrem niedrig, deutsche kommunal-Landschaft ist hier der Engpass. [^45]

**SDG-Pflicht (EU-Verordnung 2018/1724)**: bis Ende 2027 müssen alle 21 Procedures grenzüberschreitend vollständig digital abwickelbar sein, darunter "Antrag auf Führerschein-Anerkennung" und "An-/Abmeldung Fahrzeug". → unser Demo-2027-Bild trifft genau den SDG-End-State.

### 11. Pain-Points (Bürger-Sicht)

Aus Bitkom + ADAC + BMV-Berichten 2024-2026: [^46][^47][^48]
- **48% der Bürger:innen wollen Kfz-Zulassung nicht mehr offline machen** — Nachfrage ist da. [^46]
- "Bilanz erstes Jahr i-Kfz Stufe 4: >1 Mio. digitale Vorgänge" — Umsetzung beschleunigt, aber Föderalismus-Hürden bremsen die letzten 60% der Zulassungsstellen, die Stufe-4 noch nicht voll integriert haben.
- ADAC-Kritik 2025: Digitaler Führerschein **schließt ältere Smartphones aus** (iOS<17, Android<12, Huawei-Geräte) — **Ausgrenzung statt Wahlfreiheit**.
- Allgemeine Bitkom-Forderung 2025: bindende Bearbeitungsfristen, vollständig digitale Verwaltungsverfahren, behördenübergreifender Datenaustausch (= genau unser Demo-Wert-Versprechen).
- Pflichtumtausch-Wahrnehmungslücke: 2022 ADAC-Umfrage zeigte ~30% der Betroffenen wissen nicht, dass sie umtauschen müssen — ein **klassischer "passive notification gap"**, der unser Demo-Pattern (Frist-Banner ungelesen-Style) adressiert.

---

## Implications for our demo

### Empfohlener Scope V1.1 (Sektionen-Auflistung)

V1.1 erweitert die **bestehenden 5 Sektionen** der Stammdaten-Spec V1 (Identität, Anschrift, Familie, Dokumente, Sperren & Einstellungen) um **eine 6. Sektion**:

**Sektion: Mobilität (Führerschein + Fahrzeuge)**

| Sub-Sektion | FieldCards | Quelle | Korrekturweg |
|---|---|---|---|
| Fahrerlaubnis | FE-Nr (read-only, mit Behörde-Badge), Klassen-Tabelle (collapsed default), Schlüsselzahlen (collapsed mit Tooltip), Pflichtumtausch-Frist-Banner (wenn relevant), Ablauf-Datum-Banner (LKW-Klassen) | ZFER (eID-pulled) + PA-Vault-Dokument-Cross-Ref | Fahrerlaubnisbehörde {Kommune} (`router.push('/vorgaenge/neu/fe-umtausch')`) |
| Punktestand | "On-demand abrufen"-CTA mit eID-Reauth-Trigger | FAER (eID-pulled) | KBA Online-Selbstauskunft; Aktivitätsprotokoll-Eintrag bei jedem Pull |
| Eigene Fahrzeuge (Halter) | Pro Fahrzeug Card: KZ, Marke/Modell, FIN (masked), HU-Datum, eVB-Status, Halter-Adresse-Hinweis | ZFZR (eID-pulled) | Zulassungsstelle {Kommune} (`router.push('/vorgaenge/neu/i-kfz')`) |

**Connection zu Umzug-Block-D**: Bei Adress-Änderung in Stammdaten-Sektion *Anschrift* erscheint im Aktivitätsprotokoll der Mobilität-Sektion ein neuer Eintrag "Halter-Adresse {KZ} muss aktualisiert werden — § 13 FZV-Frist 7 Tage" mit CTA "i-Kfz-Adressänderung starten" (Hand-off an `/vorgaenge/neu/i-kfz?from=stammdaten&action=adresse&kennzeichen={kz}`). Das macht die Block-D-Side-Effects sichtbar — und löst die Hard-Line auf, dass Block-D heute *speculative* ist: die App rendert die FZV-§-13-Pflicht als Citizen-Action, nicht als hoheitlich-automatischen Push.

**Wallet-Subtab-Erweiterung**: Sub-Tab "Wallet & Externe Empfänger" in V1 zeigt heute PID-Mock-Attestation. V1.1 fügt eine **mDL-Mock-Attestation** hinzu (`<WalletMdlAttestationPreviewModal>`), mit Selective-Disclosure-Toggles (Klasse-only / +Ablaufdatum / +Foto / Voll-mDL).

### Components-Hint (für product-architect)

| Komponente | Pfad-Vorschlag | Zweck |
|---|---|---|
| `<MobilitaetSektion>` | `src/components/stammdaten/MobilitaetSektion.tsx` | analog zu V1-Sektionen, Disclosure-Wrapper |
| `<FahrerlaubnisCard>` | `src/components/stammdaten/FahrerlaubnisCard.tsx` | FE-Nr + Klassen-Tabelle + Schlüsselzahlen-Lookup |
| `<KlassenTabelle>` | `src/components/stammdaten/KlassenTabelle.tsx` | Rendering der EU-Klassen wie auf Karte Rückseite |
| `<SchluesselzahlTooltip>` | `src/components/stammdaten/SchluesselzahlTooltip.tsx` | Lookup-Map für 95, 70, 78, 79, 96, ... |
| `<PflichtumtauschBanner>` | `src/components/stammdaten/PflichtumtauschBanner.tsx` | Frist-Card abgeleitet aus Geburtsjahr + Ausstellungsdatum |
| `<PunkteAbrufenCTA>` | `src/components/stammdaten/PunkteAbrufenCTA.tsx` | on-demand mit eID-Reauth-Modal-Pattern (analog Religion-Modal aus V1) |
| `<FahrzeugCard>` | `src/components/stammdaten/FahrzeugCard.tsx` | Pro-Fahrzeug-Card mit KZ + FIN-mask + HU |
| `<FinMaskedSpan>` | `src/components/stammdaten/FinMaskedSpan.tsx` | analog IBAN-Pattern, On-click vollständig |
| `<WalletMdlAttestationPreviewModal>` | `src/components/stammdaten/WalletMdlAttestationPreviewModal.tsx` | mDL-Mock mit Selective-Disclosure-Toggles |

**Reuse aus V1**: `<NormZitatSpan>` (für § 4/§28 StVG, § 32/33 FZV, § 73 FeV), `<BehoerdenBadge>`, `<DocumentMockWatermark>`, `<KorrigierenCTA>`.

### Hard-Lines, die V1.1-Spec festlegen muss (für concept-verifier)

1. **Punktestand ist niemals passive Anzeige** — immer on-demand mit eID-Reauth + Activity-Log-Eintrag. (Analog zur Religion-Card aus V1.)
2. **Aktive FAER-Maßnahmen (Ermahnung, Verwarnung, MPU-Anordnung) NICHT in V1.1** — sensible Daten, keine Aggregation; nur Hinweis "Maßnahmen erhalten Sie direkt von Ihrer Fahrerlaubnisbehörde".
3. **Halter-Adresse-Sync mit Bürgeramt erfolgt NICHT automatisch** — explizit als Bürger-Action in der UI, gerahmt durch FZV-§-13-Pflicht-Hinweis. Das ist Demo-realistisch korrekt und gleichzeitig die wow-moment-Lücke, die unser Citizen-Layer adressiert.
4. **Fahrerlaubnisbehörde ist `kategorie: kommune`** in `behoerden.json` — nicht Land. Korrekturwege zeigen auf die jeweilige kommunale Stelle.
5. **FIN ist masked-by-default** — analog IBAN-Pattern aus V1.
6. **Pflichtumtausch-Banner darf nur erscheinen, wenn Geburtsjahr + Ausstellungsdatum bekannt** — sonst stiller Hinweis "Stichtag-Berechnung benötigt Geburtsjahr-Bestätigung im Profil".
7. **mDL-Wallet-Mock muss klar als 2027-Vision gerahmt sein** — analog zum bestehenden PID-Wallet-Subtab in V1, mit `eudi_speculative`-Disclaimer.
8. **Digitaler Führerschein in i-Kfz-App ist real (Ende 2026 angekündigt) — aber wir zeigen ihn im Demo NICHT als Live-App**, sondern als Card "In der echten i-Kfz-App speicherbar — diese Demo zeigt das hypothetische Aggregations-Bild".

### Anschluss an Umzug-Block-D (existing autopilot)

Bestehender Code in `src/lib/mock-backend/autopilot/umzug.ts` mit Block-D ("KFZ-Halter-Anschrift mit FZV-Register synchronisieren") läuft heute als Mock-Schritt im Umzug-Wizard. V1.1 macht den Effekt **in Stammdaten sichtbar**:
- Aktivitätsprotokoll-Eintrag in Mobilität-Sektion: "Halter-Adresse aktualisiert via Umzug-Vorgang #{vorgang_id}"
- FieldCard "Halter-Adresse" zeigt Pre-/Post-Adresse mit Übergangsbadge
- Hard-Line bleibt: in Realität würde der Bürger den i-Kfz-Vorgang **selbst** anstoßen müssen — das macht ein Disclaimer im Block-D-Side-Effect-Banner explizit.

---

## Open questions / Risiken

1. **Schlüsselzahlen-Lookup-Datensatz**: gibt es einen offenen Datensatz mit allen ~150 Schlüsselzahlen + Beschreibungstexten DE? (Anlage 9 FeV ist autoritativ, aber als Tabelle nur als PDF im Anhang.) → für `<SchluesselzahlTooltip>`-Lookup-Map. Verifier-relevant.
2. **mDL-Attribute-Schema in ARF**: Welche genauen mDL-Attribut-Namespaces gelten in ARF 2.4? Annexe 3.1 ist PID; mDL-Annex-Status muss verifier final geklärt werden.
3. **i-Kfz-API-Schnittstelle für Aggregator-Layer**: Gibt es eine offizielle Aggregator-API (für DeutschlandID-Hub-Szenarien) oder ist i-Kfz nur über die KBA-eigene App? → das verändert das hypothetische 2027-Bild signifikant; muss als speculative annotation gerahmt werden.
4. **Punktestand-Dokumentation**: PDF-Format des FAER-Auskunft-PDFs — gibt es eine maschinenlesbare Variante (z.B. PDF/A mit Form-Fields)? Wäre ein Realismus-Hook für unser Mock.
5. **FAER-Tilgungsfristen** (Punkt-Verfall): § 29 StVG sieht 2,5 / 5 / 10 Jahre Tilgung je nach Punkt-Schwere vor. Sollten wir das im Demo zeigen (auch wenn V1.1 keine Punkte passiv anzeigt) als Tooltip am "Punkte abrufen"-CTA? domain-expert validieren.
6. **eAT-Halter-Konstellation für Mehmet**: kann ein eAT-Inhaber mit § 21 AufenthG i-Kfz Stufe 4 nutzen (Voraussetzung "eID des nPA *oder* eID-Karte *oder* eAT mit eID-Funktion")? Wenn ja, ist das ein guter persona-secondary-Hook.
7. **Familie-Schmidt-Konstellation**: Halter ist üblicherweise eine Person, nicht "Familie". Wie zeigen wir "Familienauto" — als Halter = ein Elternteil + Hinweis "auch von Partner:in genutzt"? Persona-Daten-Frage für seed.ts.
8. **Realismus-Risiko 2027-Demo**: EU-Driving-Licence-Direktive Pflicht-Anwendung erst H2 2028; unser 2027-Demo zeigt mDL als verfügbar — das ist *speculative* und muss klar gerahmt sein. Verifier wird das als Probe-Frage stellen.

---

## Recommended next-step (für domain-expert)

domain-expert-Validation-Checklist:

1. ✓ Validiere § 73 FeV → Fahrerlaubnisbehörde-Zuständigkeit kommunal; bestätige `kategorie: kommune` in `behoerden.json`.
2. ✓ Validiere § 32/33 FZV → ZFZR-Halter-Felder vollständig (oben in Findings § 5).
3. ✓ Validiere § 28-30a StVG → FAER-Maßnahmen-Stufen + § 29 StVG Tilgungsfristen.
4. ✓ Validiere § 13 FZV → 7-Tage-Frist + Mitteilungspflicht-Bürger.
5. ✓ Validiere § 4 IDNrG-Anwendbarkeit auf FE-Nr / FIN — sind diese Identifier *Basisdaten* nach § 4 IDNrG oder Spezial-Identifier außerhalb der IDNr-Konvergenz? Hard-Line für unsere Aggregations-Demo.
6. ✓ Validiere DSGVO-Hard-Lines:
   - Punktestand passive Anzeige → unzulässig?
   - mDL-Wallet-Mock → ist das *Verarbeiten* oder nur *Visualisieren* (analog zum bestehenden PID-Pattern in V1, das vom verifier akzeptiert war)?
7. ✓ Validiere EU-FE-Direktive-Stand (Adoption Q4 2025 final?) — derzeit nur über Sekundärquellen verifiziert; Primärquelle EUR-Lex prüfen.
8. ✓ Validiere ZFER-vs-FAER-Trennung: ZFER hat **keine** Anschrift, FAER hat **keine** Klassen-Daten; Korrektur-Anlauf-Stellen sind verschieden.
9. ✓ Validiere Umzug-Block-D-Wording: heute speculative → V1.1-Sichtbarmachung mit `iban_speculative`-analogem Disclaimer (z.B. `kfz_halter_adresse_speculative`).
10. ✓ Empfehle Persona-Daten-Set:
    - **Anna**: Klasse B seit 2018 (St. Petersburg ausgestellt, 2024 in DE umgeschrieben) — keine Punkte, eigenes Auto Berlin
    - **Mehmet**: Klasse B + Klasse C1 (gewerblich, kleiner Lieferwagen für Selbstständigkeit) — 1 Punkt seit 2024
    - **Familie Schmidt**: ein Elternteil als Halter, Klasse B + BE für Anhänger; Pflichtumtausch-Banner für 2027-Stichtag aktiv

---

## Sources

[^1]: [Führerscheinnummer – Wikipedia](https://de.wikipedia.org/wiki/F%C3%BChrerscheinnummer) — accessed 2026-05-10
[^2]: [Kraftfahrt-Bundesamt — Zentrales Fahrerlaubnisregister (ZFER)](https://www.kba.de/DE/Themen/ZentraleRegister/ZFER/zfer_node.html) — accessed 2026-05-10
[^3]: [KBA — Fahreignungsregister (FAER)](https://www.kba.de/DE/Themen/ZentraleRegister/FAER/faer_node.html) — accessed 2026-05-10
[^4]: [Fahreignungs-Bewertungssystem nach § 4 StVG (Bussgeldkatalog 2026)](https://www.bussgeldkatalog.org/fahreignungs-bewertungssystem/) — accessed 2026-05-10
[^5]: [Fahrerlaubnisbehörde-FAQ Ortsdienst (§ 73 FeV)](https://www.ortsdienst.de/faq-strassenverkehrsamt/ist-das-strassenverkehrsamt-eine-fahrerlaubnisbehoerde-faq4384/) — accessed 2026-05-10
[^6]: [Allgemeine Verwaltungsvorschrift FS-VwV (BMV)](https://www.verwaltungsvorschriften-im-internet.de/bsvwvbund_24032021_S31.htm) — accessed 2026-05-10
[^7]: [KBA — Digitale Fahrzeugzulassung (i-Kfz)](https://www.kba.de/DE/Themen/ZentraleRegister/Digitale_Fahrzeugzulassung/digitale_fahrzeugzulassung_node.html) — accessed 2026-05-10
[^8]: [i-Kfz Stufe 4 — Lecos GmbH (Benutzerleitfaden)](https://www.lecos.de/leistungen/i-kfz/) — accessed 2026-05-10
[^9]: [i-Kfz Adressänderung Online (ikfz.net)](https://ikfz.net/wissen/414/Adresse_online_aendern) — accessed 2026-05-10
[^10]: [BMV — Neue i-Kfz-App: Bundesregierung startet digitalen Fahrzeugschein](https://www.bmv.de/SharedDocs/DE/Pressemitteilungen/2025/057-ikfz-start-digitaler-fahrzeugschein.html) — accessed 2026-05-10
[^11]: [BMV — Kabinett beschließt gesetzliche Grundlage für digitalen Führerschein](https://www.bmv.de/SharedDocs/DE/Pressemitteilungen/2025/056-schnieder-kabinett-beschliesst-grundlage-fuer-digitalen-fuehrerschein.html) — accessed 2026-05-10
[^12]: [ADAC — Digitaler Fahrzeugschein gestartet, digitaler Führerschein folgt 2026](https://www.adac.de/verkehr/rund-um-den-fuehrerschein/aktuelles/digitaler-fuehrerschein/) — accessed 2026-05-10
[^13]: [EU Digital Identity — Mobile Driving Licence Manual](https://ec.europa.eu/digital-building-blocks/sites/spaces/EUDIGITALIDENTITYWALLET/pages/929202846/The+Mobile+Driving+License+manual) — accessed 2026-05-10
[^14]: [KBA — Online-Registerauskunft FAER (gebührenfrei)](https://www.kba.de/DE/Themen/ZentraleRegister/FAER/Auskunft/online.html) — accessed 2026-05-10
[^15]: [Personalausweisportal — FAER-Auskunft mit BundID](https://www.personalausweisportal.de/SharedDocs/anwendungen/Webs/PA/DE/Bund/bund_kba_fahreignungsregister.html) — accessed 2026-05-10
[^16]: [Das alles steht im Führerschein (führerscheine.de)](https://www.fuehrerscheine.de/fuehrerschein/fuehrerschein-erklaerung/) — accessed 2026-05-10
[^17]: [Bundesregierung — FAQ Führerschein-Umtausch](https://www.bundesregierung.de/breg-de/aktuelles/faq-fuehrerschein-umtausch-1842574) — accessed 2026-05-10
[^18]: [ADAC — Fristen Führerschein-Umtausch](https://www.adac.de/verkehr/rund-um-den-fuehrerschein/aktuelles/fristen-fuehrerschein-umtausch/) — accessed 2026-05-10
[^19]: [Führerscheinstelle — Aufgaben und Zuständigkeit](https://fuehrerscheinstelle.org/) — accessed 2026-05-10
[^20]: [Punktesystem Flensburg StVG § 4](https://www.bussgeldkatalog.org/punkte-flensburg/) — accessed 2026-05-10
[^21]: [KBA — Auskunft aus dem ZFER (Detailseite)](https://www.kba.de/DE/Themen/ZentraleRegister/ZFER/Auskunft/zfer_auskunft_inhalt.html) — accessed 2026-05-10
[^22]: [KBA — ZFER (Inhaltsseite)](https://www.kba.de/DE/Themen/ZentraleRegister/ZFER/zfer_inhalt.html) — accessed 2026-05-10
[^23]: [BMV — Online-Selbstauskünfte aus den KBA-Registern](https://www.bmv.de/SharedDocs/DE/Artikel/StV/Strassenverkehr/online-selbstauskuenfte-kba-register.html) — accessed 2026-05-10
[^24]: [§ 32 FZV — Speicherung der Halterdaten (gesetze-im-internet.de PDF)](https://www.gesetze-im-internet.de/fzv_2023/FZV.pdf) — accessed 2026-05-10
[^25]: [§ 32 FZV (freirecht.de)](https://freirecht.de/g/FZV:32) — accessed 2026-05-10
[^26]: [§ 33 FZV — Übermittlung an KBA (freirecht.de)](https://freirecht.de/g/FZV:33) — accessed 2026-05-10
[^27]: [KBA — Auskunft aus ZFZR](https://www.kba.de/DE/Themen/ZentraleRegister/ZFZR/Auskunft/zfzr_auskunft_inhalt.html) — accessed 2026-05-10
[^28]: [§ 13 FZV — Mitteilungspflichten bei Änderungen (gesetze-im-internet.de)](https://www.gesetze-im-internet.de/fzv_2023/__13.html) — accessed 2026-05-10
[^29]: [eGovernment.de — Wann kommen digitale Führerscheine?](https://www.egovernment.de/wann-kommen-digitale-fuehrerscheine-a-154b1aed922543e803d5bf4e3dd264a4/) — accessed 2026-05-10
[^30]: [ISO/IEC 18013-5/7 — Mobile Driving Licence (EReg)](https://ereg-association.eu/news-items/mobile-drivers-license-standard-published/) — accessed 2026-05-10
[^31]: [Eesti.ee — Driving Licence (Estonia)](https://www.eesti.ee/en/traffic/vehicles-and-right-to-drive/driving-licence/) — accessed 2026-05-10
[^32]: [Estonian Transport Administration — eteenindus.mnt.ee](https://eteenindus.mnt.ee/juht.jsf?lang=en) — accessed 2026-05-10
[^33]: [Mijn RDW (Netherlands)](https://mijn.rdw.nl/) — accessed 2026-05-10
[^34]: [RDW — Bekijk uw rijbewijsgegevens](https://www.rdw.nl/uw-voertuig-en-uw-gegevens/uw-gegevens-bekijken-of-veranderen/gegevens-van-uw-rijbewijs-en-uzelf-bekijken) — accessed 2026-05-10
[^35]: [ANTS / France Titres — permisdeconduire.ants.gouv.fr](https://permisdeconduire.ants.gouv.fr/) — accessed 2026-05-10
[^36]: [ANTS — Obtenir son permis numérique](https://permisdeconduire.ants.gouv.fr/demarches-en-ligne/obtenir-son-permis-numerique) — accessed 2026-05-10
[^37]: [Italy — Patente di guida digitale su IT-Wallet](https://www.6sicuro.it/blog/patente-di-guida-digitale/) — accessed 2026-05-10
[^38]: [Il Portale dell'Automobilista — Patenti](https://www.ilportaledellautomobilista.it/web/portale-automobilista/patenti) — accessed 2026-05-10
[^39]: [Statens vegvesen — Digital driving licence (Norway)](https://www.vegvesen.no/en/driving-licences/driving-licence-holders/digital-driving-licence/) — accessed 2026-05-10
[^40]: [Statens vegvesen — Min Side dashboard](https://www.vegvesen.no/en/) — accessed 2026-05-10
[^41]: [Will the EUDI Wallet be ready in 2026? (Biometric Update Dec 2025)](https://www.biometricupdate.com/202512/will-the-eudi-wallet-be-ready-in-2026-experts-say-probably-not) — accessed 2026-05-10
[^42]: [EUDI Wallet ARF 2.4 — eu-digital-identity-wallet.github.io](https://eu-digital-identity-wallet.github.io/eudi-doc-architecture-and-reference-framework/2.4.0/architecture-and-reference-framework-main/) — accessed 2026-05-10
[^43]: [EUDI ARF — PID Rulebook](https://eu-digital-identity-wallet.github.io/eudi-doc-architecture-and-reference-framework/1.4.0/annexes/annex-3/annex-3.01-pid-rulebook/) — accessed 2026-05-10
[^44]: [Digitale Verwaltung — Fokusleistungen OZG 2.0](https://www.digitale-verwaltung.de/Webs/DV/DE/onlinezugangsgesetz/das-gesetz/ozg-aenderungsgesetz/fokusleistungen/fokusleistungen.html) — accessed 2026-05-10
[^45]: [FITKO — OZG-Leistung Führerschein V1.3.1](https://www.fitko.de/fileadmin/user_upload/20231201_Prozessbez._LB_OZG-Leistung-F%C3%BChrerschein_V1.3.1.pdf) — accessed 2026-05-10
[^46]: [Bitkom — Staat 4.0: Verwaltung hinkt Bürgerwünschen hinterher](https://www.bitkom.org/Presse/Presseinformation/Staat-40-Verwaltung-hinkt-Buergerwuenschen-hinterher.html) — accessed 2026-05-10
[^47]: [Bitkom — Bürokratieentlastung 2025 Positionspapier](https://www.bitkom.org/Bitkom/Publikationen/Buerokratieentlastung-strukturell-und-nachhaltig) — accessed 2026-05-10
[^48]: [Schlüsselzahlen Führerschein (ADAC)](https://www.adac.de/verkehr/rund-um-den-fuehrerschein/klassen/schluesselzahlen/) — accessed 2026-05-10
