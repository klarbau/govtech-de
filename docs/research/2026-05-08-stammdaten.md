---
topic: Stammdaten — Single-Source-of-Truth Bürger:innen-Profil
question: Was *jede:r* Bürger:in von einem einheitlichen Profil-Layer braucht — Pain-Quantifizierung, rechtliche Realismus-Grenzen, internationale Prior-Art und Whitespace in Deutschland 2026, mit drei demo-tauglichen Szenen.
date: 2026-05-08
status: revised
confidence: medium
revised_by: domain-expert
revised_on: 2026-05-08
sources:
  - § 3 BMG (Speicherung von Daten) — gesetze-im-internet.de
  - § 36 BMG (regelmäßige Datenübermittlungen) — gesetze-im-internet.de
  - § 51 BMG (Auskunftssperren) — gesetze-im-internet.de
  - § 4 IDNrG (Basisdaten beim BVA) — gesetze-im-internet.de
  - DSGVO Art. 9, 15, 16, 30
  - eGovernment MONITOR 2025 (Initiative D21 + TUM, gefördert vom BMDS)
  - Bitkom „Digitaler Staat 2025" / Studie „Digitale Teilhabe 2025"
  - BVA Datenschutzcockpit-Anbindungsleitfaden + Bremen DSC-FAQ
  - EUDI Wallet PID Rulebook v1.4 (Annex 3.01)
  - BMDS / digitale-verwaltung.de / personalausweisportal.de (BundID-FAQ Mai 2026)
  - eesti.ee „Andmejälgija" + RIA Data Tracker
  - borger.dk + cpr.dk Registerindsigt
  - Suomi.fi + dvv.fi Personal-Data-Page
  - Singpass MyInfo Data Catalog (developer.singpass.gov.sg)
  - GOV.UK One Login Privacy Notice
  - Wikipedia Once-Only-Principle (mit Estland-Ursprung)
  - GKV-Datenaustausch / vdek DEÜV: Adress-Pflichtmeldungen ab 2010 entfallen, weil GKVen die Daten direkt von Meldebehörden erhalten
---

## TL;DR

- **Pain-Quantifizierung Mehrfacherfassung**: Im **eGovernment MONITOR 2025** ist „doppelte Dateneingabe vermeiden" einer der **Top-3-Verbesserungswünsche** der Bürger:innen — **55 %** wollen Mehrfacheingabe abgeschafft sehen, **61 %** wollen einfaches Auffinden, **56 %** wollen schnellere Bearbeitung.[^1] **58 %** der Bürger:innen würden laut Bitkom-Befragung 2025 ihre Stammdaten **einmal** zentral hinterlegen und Behörden untereinander austauschen lassen.[^2] Eine harte „X Stunden für Mehrfacherfassung pro Bürger:in/Jahr"-Zahl für DE ist `not found` — Estland publiziert vergleichbar **>1.345 Personenjahre/Jahr** Zeitersparnis durch X-Road-Once-Only.[^3]
- **Was die Meldebehörde *heute* hält ist erstaunlich umfassend**: § 3 BMG zählt **19 Datenpunkte** (Familienname, frühere Namen, Vornamen, Doktorgrad, Ordens-/Künstlername, Geburtsdaten, Geschlecht, Steuer-IdNr, gesetzlicher Vertreter, Staatsangehörigkeiten, Religionszugehörigkeit, Anschriften historisch+aktuell, Familienstand, Ehegatte/Lebenspartner, minderjährige Kinder, Ausweisdaten, AZR-Nr., Auskunfts-/Übermittlungssperren, Sterbedaten) plus 10 Zusatz-Datenpunkte nach § 3 Abs. 2 BMG (Wahlberechtigung, Lohnsteuermerkmale, Waffen-/Sprengstoff-Erlaubnisse u.a.).[^4] Die meisten Bürger:innen wissen nicht, dass Religion, Steuer-IdNr, AZR-Nr. und Ehegatten-Stammdaten *bereits* zentral im Melderegister gehalten werden.
- **Was BundID *heute* (Mai 2026) als Stammdatenservice liefert**: zentrales Profil mit Identitäts-, Kontakt- und Anschriftsdaten, Vorbefüllung von Online-Anträgen, BundID-Postfach (ZBP); seit 1. Juni 2024 wird die hinterlegte E-Mail-Adresse mit Einwilligung an Fachverfahren übergeben (z. B. eWA).[^5] **Bidirektionale Kommunikation ab Juli 2026** geplant.[^6] DeutschlandID-Rebranding ist für „nach den funktionalen Entwicklungen" angekündigt — kein Stichtag.[^7]
- **EUDI Wallet PID-Schema Mai 2026 (Rulebook v1.4)**: 8 Pflichtattribute (`family_name`, `given_name`, `birth_date`, `age_over_18`, `issuance_date`, `expiry_date`, `issuing_authority`, `issuing_country`) plus optional `family_name_birth`, `given_name_birth`, `birth_place/country/state/city`, `resident_address/country/state/city/postal_code/street/house_number`, `gender`, `nationality`, `document_number`, `administrative_number`, `issuing_jurisdiction` und `age_over_NN` / `age_in_years` / `age_birth_year`.[^8] **Wichtig**: PID = Identifikation und Adresse. *Keine* Familie-, Beschäftigungs-, Finanz- oder Gesundheits-Felder. Diese müssen als separate `(Q)EAA` (Qualified Electronic Attestations) ausgegeben werden.
- **§ 4 IDNrG (Basisdaten beim BVA für IDNr-basierten Datenabruf)**: 11 Felder — IDNr, Familienname, frühere Namen, Vornamen, Doktorgrad, Tag und Ort der Geburt, Geschlecht, Staatsangehörigkeiten, gegenwärtige/letzte Anschrift, Sterbetag, Tag des Einzugs/Auszugs.[^9] Schmaler als BMG § 3, weil IDA nur Identifikation ermöglichen muss, nicht Familie/Steuer.
- **Once-Only-Status DE 2026**: § 36 BMG erlaubt regelmäßige Datenübermittlungen, *aber benennt keine Empfänger* — die konkreten Pushes liegen in Spezialgesetzen (RBStV § 11 Abs. 4 für Beitragsservice, AO § 39 / § 139b für FA, SG § 58c für Wehrerfassung, Meldedaten-Übermittlungsverordnungen der Länder).[^10][^11] Ein zentral vom Bund publizierter „Wer bekommt heute schon was?"-Aggregator existiert nicht. **Zentraler Befund für die Demo**: GKVen bekommen Adressdaten *automatisch* von Meldebehörden — DEÜV-Adress-Änderungsmeldungen durch Arbeitgeber sind seit ca. 2010 entfallen.[^12] Dieses Faktum ist im Bürger:innen-Bewusstsein praktisch nicht angekommen.
- **Datenschutzcockpit (DSC, BVA + Bremen)** ist die offizielle DE-Antwort auf das Estland-Pattern. Status Mai 2026: Webanwendung `datenschutzcockpit.bund.de` als Bürger:innen-Frontend definiert; XÖV-Standard XDatenschutzcockpit v1.1.0 seit Sept 2024 produktiv; KBA bindet sich Anfang 2026 an, weitere Behörden folgen — **aber technische Voraussetzungen für flächendeckende Nutzbarkeit „frühestens 2026"**.[^13][^14][^15] Zwei Jahre Speicherfrist für IDNr-basierte Übermittlungen (§ 9 IDNrG, RegMoG Art. 1).
- **Prior-Art-Pattern, die DE *nicht* hat (Whitespace)**: Estlands „Andmejälgija" als citizen-facing Audit-Log; Suomi.fi-Korrektur-Workflow direkt im Portal für Selbst-änderbare Felder (Beruf, E-Mail, Sprachen); Singpass MyInfo als Drittanbieter-Consent-Layer für >95 Datenfelder über 7 Kategorien (Personal, Family, Address, Education/Employment, Finance, Property, Vehicle, Government Scheme); Dänemark CPR mit Klarheit, *welche Behörde welches Feld pflegt* (Kommune = Adresse, Sogn = Geburt/Eheschließung, Familieretshus = Adoption/Vormundschaft).[^16][^17][^18][^19]
- **Demo-Whitespace in DE 2026**: Es gibt **keine** consumer-facing UI, die einer/einem Bürger:in *alle* eigenen Stammdaten in *einer* Übersicht zeigt + welche Behörde welches Feld autoritativ hält + Korrekturweg pro Feld + Audit-Log pro Übermittlung. Mein ELSTER zeigt nur Steuer-Stammdaten. BundID zeigt nur den Identitäts- und Kontakt-Slice. Caya / Bureaucrazy / Localyze sind Dokumenten-/Mobility-orientiert, kein Stammdaten-Aggregator. → **Genau das ist die speculative-design-Lücke, die unsere Demo schließt — als Lese-/Wegweiser-Schicht, nicht als Schreib-Schicht ins BMG**.

## Findings

### 1. Pain-Quantifizierung — Fragmentierung und Mehrfacherfassung

#### 1a. Wie viele Stellen halten redundante Kopien?

Eine offizielle Zählung „X Behörden halten denselben Datensatz" ist `not found`. Was sich rekonstruieren lässt aus § 3 BMG, § 4 IDNrG, RBStV § 11, AO § 139b, SG § 58c, AufenthG § 86 und den 51 Registern, die das **RegMoG** als priorisiert benennt: **mindestens** das Melderegister (Kommune), das Steuerregister beim BZSt (IDNr), die GKV (Mitgliedschaftsregister), der Beitragsservice ARD/ZDF/Dlr, die DRV (Versicherungsnummer), die Familienkasse der BA, ggf. das Ausländerzentralregister (AZR) — **das sind 7 separate Register, die jeweils eine Untermenge der gleichen Stammdaten halten**. Bei Kraftfahrzeughalter:innen + Kraftfahrt-Bundesamt ZFZR + Polizei-INPOL-Z (für Identifikation) erhöht sich das auf 9–10. Dazu kommen privatwirtschaftliche Stellen (Bank, Versicherer, Vermieter, Arbeitgeber, Energieversorger, Telekom).

**Zahl der heute IDNr-führenden Register laut RegMoG**: **51 priorisierte Register**, die die Steuer-IdNr als Ordnungsmerkmal speichern.[^20] Das ist eine *konkrete, zitierfähige* Zahl für die Demo.

#### 1b. eGovernment MONITOR 2025 — Mehrfacherfassung als Top-Priorität

Die Initiative-D21/TUM/Kantar-Studie 2025 (gefördert vom BMDS):[^1]
- **61 %** wollen einfacheres Auffinden von Verwaltungsleistungen.
- **56 %** wollen schnellere Bearbeitung digital eingereichter Anträge.
- **55 %** wollen **doppelte Dateneingabe vermeiden** — bereits bekannte Daten sollen verwendet werden, Formulare vorausgefüllt sein.
- Vertrauen in den Staat: **33 %** (2022: 38 %).
- **Nur 12 %** stimmen zu, dass der Staat das Leben der Menschen einfacher mache.

#### 1c. Bitkom — Bereitschaft zur zentralen Hinterlegung

Bitkom-Befragung 2025: **58 %** der Bürger:innen würden ihre Stammdaten **einmal** zentral bei einer Behörde hinterlegen und einer behördenübergreifenden Wiederverwendung zustimmen.[^2] Bitkom + McKinsey schätzen Reduktion des Bearbeitungsaufwands für Einzelleistungen um **>60 %** bei konsequenter Umsetzung des Once-Only-Prinzips.[^21]

#### 1d. „Warum muss ich das schon wieder eintragen?"-Zahl für DE

Eine repräsentative Frequenz-Zahl („wie oft im Jahr trägt ein:e Bürger:in dieselbe Adresse neu ein") ist `not found`. Indikatoren für die Größenordnung:
- Estlands X-Road erspart **>1.345 Personenjahre/Jahr** durch Once-Only.[^3] Bei **1,33 Mio. Einwohner:innen** (Estland) sind das ~**0,9 Stunden/Bürger:in/Jahr** als untere Schätzung des Wieder-eingabe-Vermeidungs-Wertes.
- Hochgerechnet auf DE (84 Mio.): >**75.000 Personenjahre/Jahr** Potenzial — mit großen Vorbehalten, weil DE-Verwaltung föderaler ist und Estland-Methodik nicht 1:1 übertragbar (`confidence: low`, *spekulative Hochrechnung*, nicht für TL;DR-Zitat geeignet).

**Konfidenzbewertung Pain-Block**: Mehrfacherfassung als Bürger:innen-Schmerz ist **high-confidence** belegt (eGov-Monitor + Bitkom triangulieren); konkrete Zeit-/Häufigkeits-Zahlen sind **`not found`** für DE.

### 2. Existierende DE-Infrastruktur — Stand Mai 2026

#### 2a. Melderegister — die heimliche „Source of Truth"

§ 3 BMG („Speicherung von Daten") definiert den vollen Stammdatensatz, den jede Meldebehörde heute hält. Vollständige Felder-Liste für die Demo (relevant, weil unsere Stammdaten-UI diese Felder spiegeln muss):[^4]

**§ 3 Abs. 1 BMG (Pflichtdaten)**:
1. Familienname
2. frühere Namen
3. Vornamen unter Kennzeichnung des gebräuchlichen Vornamens
4. Doktorgrad
5. Ordensname, Künstlername
6. Geburtsdatum und Geburtsort sowie bei Geburt im Ausland auch den Staat
7. Geschlecht
8. Identifikationsnummer nach § 139b AO (Steuer-IdNr)
9. Daten zum gesetzlichen Vertreter (Name, Anschrift, Geburtsdatum, …)
10. derzeitige Staatsangehörigkeiten
11. rechtliche Zugehörigkeit zu einer öffentlich-rechtlichen Religionsgesellschaft
12. derzeitige Anschriften, frühere Anschriften (Haupt-/Nebenwohnung, ggf. Auslandsanschrift)
13. Einzugs-, Auszugs-, letztes Wegzugs- und Zuzugsdatum
14. Familienstand (bei Verheirateten/Lebenspartnern: Datum/Ort der Eheschließung)
15. Ehegatte/Lebenspartner-Daten (Name, Doktorgrad, Geburtsdatum, Geschlecht, Anschriften, Sterbedatum, Sperren, IDNr)
16. Daten der minderjährigen Kinder (Name, Geburtsdatum, Geschlecht, Anschrift, Sterbedatum, Sperren, IDNr)
17. Personalausweis-, Pass- und eID-Kartendaten (inkl. Seriennummern)
17a. AZR-Nummer oder Seriennummer des Ankunftsnachweises
18. Auskunfts- und Übermittlungssperren
19. Sterbedatum und Sterbeort

**§ 3 Abs. 2 BMG (Zusatzdaten)**: Wahlberechtigung, Lohnsteuerabzugsmerkmale, Passversagungsgründe, Staatsangehörigkeitserwerb-/-verlust, Anschrift 1939 (Vertriebene), waffenrechtliche/sprengstoffrechtliche Erlaubnisse, Aufenthaltsanfragen anderer Behörden, Eigentümer und Wohnungsgeber.

**Demo-Implikation**: Anna's „Was hat die Meldebehörde von mir?"-Tab kann diese 19+10-Liste 1:1 spiegeln — und das ist *nicht spekulativ*, das ist Bestand. Was *spekulativ* wäre: dass die/der Bürger:in das in einer einheitlichen UI sehen kann.

#### 2b. BundID Stammdatenservice — Stand Mai 2026

BundID-FAQ und BMDS-Pressestelle Mai 2026:[^5][^7]
- **Identitätsdaten** (Name, Geburtsdatum, Geschlecht, Staatsangehörigkeit, Anschrift) — gespeist aus eID/Online-Ausweisfunktion, ELSTER-Zertifikat oder Benutzername+Passwort.
- **Kontaktdaten** (E-Mail, Mobilnummer) — vom Bürger:in selbst hinterlegbar; seit 1. Juni 2024 wird die E-Mail mit Einwilligung an Fachverfahren übergeben.[^22]
- **Postfach (ZBP)** — Empfang amtlicher Bescheide („Bekanntgaben") plus Status-Infos zu Anträgen.
- **Anbindung von ~2.000 Online-Diensten** (Mai 2026, kommunal+Land+Bund).
- **Rebrand zu DeutschlandID**: angekündigt seit OZG 2.0 (Juli 2024), Stichtag offen.[^7]
- **Bidirektionalität**: Behörden-Rückfragen + Nachreichung von Unterlagen via ZBP — geplant **Juli 2026**.[^6]
- **Keine** explizit dokumentierten Felder für Familie, Beschäftigung, Steuermerkmale, IBAN — diese liegen in Fachverfahren (Familienkasse, ELSTER, GKVen) und werden nicht in BundID gespiegelt.

OZG 2.0 (in Kraft 24.07.2024) verpflichtet Länder, ihre Konten innerhalb von 3 Jahren auf BundID zu konsolidieren; Sachsen hat den Wechsel für Mitte 2026 angekündigt.[^23]

#### 2c. RegMoG / IDNrG / IDA / Datenschutzcockpit

§ 4 IDNrG-Basisdatenfelder beim BVA (für IDNr-Auflösung):[^9]
- IDNr, Familienname, frühere Namen, Vornamen, Doktorgrad, Tag/Ort der Geburt, Geschlecht, Staatsangehörigkeiten, gegenwärtige/letzte Anschrift, Sterbetag, Einzugs-/Auszugsdatum.

Datenschutzcockpit (DSC, BVA + Bremen):[^13][^14][^15]
- Webanwendung `datenschutzcockpit.bund.de`, Bürger:innen können selbständig prüfen, welche Behörde welche IDNr-basierte Übermittlung in den letzten **2 Jahren** durchgeführt hat (§ 9 IDNrG: 2-Jahres-Speicherfrist für Übermittlungs-Logs).
- XÖV-Standard XDatenschutzcockpit v1.1.0 seit 30.09.2024 produktiv.
- Anbindung der Behörden ist freiwillig/sukzessive: KBA tritt Anfang 2026 bei (Pressemeldung 2026 Nr. 16). Vollständige Abdeckung der 51 RegMoG-Register ist 2026 noch nicht erreicht.
- **„Technische Voraussetzungen frühestens 2026"** — die Behörde Bremen kommuniziert das DSC öffentlich als Roadmap-Ziel, nicht als für jede:n Bürger:in *heute* sinnvoll nutzbares Tool.

**Demo-Implikation**: Unser `/datenschutz`-Tab kann *exakt* dem DSC-Pattern folgen, ohne sich davon abzugrenzen — weil das DSC das offizielle Pattern ist, nur noch nicht flächendeckend nutzbar. Unsere Demo zeigt, *wie es aussehen sollte*, mit BundID + DSC + EUDI-Wallet als hypothetischer Konvergenz-Endzustand.

#### 2d. EUDI Wallet PID — was ist Pflicht, was optional

EUDI Wallet PID Rulebook v1.4 (Annex 3.01, Mai 2026):[^8]

| Kategorie | Felder |
|---|---|
| **Pflicht (8)** | `family_name`, `given_name`, `birth_date`, `age_over_18`, `issuance_date`, `expiry_date`, `issuing_authority`, `issuing_country` |
| **Optional — Identität** | `family_name_birth`, `given_name_birth`, `gender`, `nationality`, `document_number`, `administrative_number`, `issuing_jurisdiction` |
| **Optional — Geburt** | `birth_place`, `birth_country`, `birth_state`, `birth_city` |
| **Optional — Wohnsitz** | `resident_address`, `resident_country`, `resident_state`, `resident_city`, `resident_postal_code`, `resident_street`, `resident_house_number` |
| **Optional — Alter** | `age_over_NN` (für jedes N), `age_in_years`, `age_birth_year` |

PID-Issuers müssen mindestens 4 von 6 Identifikations-Hilfsattributen mitliefern (`family_name_birth`, `given_name_birth`, `gender`, `nationality`, ein Geburtsort-Feld, ein Adressfeld).

Was im PID-Schema **nicht** vorgesehen ist: Familie (Kinder, Ehegatte), Beschäftigung, Steuermerkmale, IBAN, Krankenkassen-Mitgliedschaft, Behinderungsgrad, Bildungsabschlüsse — diese müssen als **(Q)EAA** ausgegeben werden (z. B. Diploma-Attestation, mDL für Führerschein, GKV-Versicherungsnachweis). Das ist die Architektur-Begrenzung, die unser Demo *zwingend* respektieren muss: PID = Identität + Adresse, alles andere = separate, attestation-getragene Datenquelle.

#### 2e. § 36 BMG „regelmäßige Datenübermittlungen" — Status 2026

§ 36 BMG selbst nennt **keine** Empfänger. Konkrete Pushes ergeben sich aus:[^10][^11]
- **§ 11 Abs. 4 RBStV**: Beitragsservice ARD/ZDF/Dlr bekommt Adressdaten (Volljährigen-Push).
- **§ 39 / § 139b AO**: Finanzverwaltung bekommt Identifikations- und Adressdaten zur IDNr-Pflege.
- **§ 58c SG**: Bundesamt für das Personalmanagement der Bundeswehr (Wehrerfassung).
- **Meldedaten-Übermittlungsverordnung (Land)**: Landesweite Übermittlungen je Bundesland.
- **DEÜV / SGB IV**: GKVen und DRV bekommen Adressdaten *automatisch* aus dem Melderegister; Arbeitgeber-Adressänderungsmeldungen für Versicherte sind seit ~2010 entfallen.[^12]

**Demo-Implikation (groß)**: Block A „Wir machen das automatisch für Sie" in der Stammdaten-UI ist nicht-spekulativ für Adresse → GKV, FA, Beitragsservice, Wehrverwaltung, DRV, Finanzamt. Was die Demo *zeigt*, ist genau dieses heute-schon-existierende, aber unsichtbare Funktionieren — sichtbar gemacht in Form eines Übermittlungs-Logs.

### 3. Bürger:innen-Kontrollrechte — Today vs. 2027

#### 3a. DSGVO Art. 15 — Auskunftsrecht

Art. 15 DSGVO gibt jeder/jedem Bürger:in das Recht, von jeder verantwortlichen Stelle (Behörde oder Privater) eine Auskunft zu verlangen über:[^24]
- gespeicherte personenbezogene Daten,
- Verarbeitungszwecke,
- Empfängerkategorien (oder konkrete Empfänger nach EuGH C-579/21),
- geplante Speicherdauer,
- Herkunft der Daten (wenn nicht direkt erhoben),
- automatisierte Entscheidungsfindung.

Praxis-Pfad heute: schriftlicher Antrag (formfrei, kostenlos), Behörde antwortet binnen 1 Monat (verlängerbar auf 3). **Es gibt heute keinen einheitlichen Selbstbedienungs-Klick „Auskunft Art. 15"** — jede Behörde hat eigene Formulare, oft postalisch.

**Demo-Implikation**: Ein „Auskunft anfordern"-Button pro Stammdaten-Feld, der auf ein konkretes formularbasiertes Mock-Schreiben an die jeweilige Behörde (Mock-Aktenzeichen, [MOCK]-Watermark) verweist, ist sowohl rechtlich-realistisch als auch UX-relevant. Das ist die DSGVO-Operationalisierung, die in DE heute fehlt.

#### 3b. DSGVO Art. 16 — Berichtigungsrecht und der Korrektur-Workflow

Art. 16 DSGVO: Recht auf unverzügliche Berichtigung unrichtiger Daten plus Recht auf Vervollständigung.[^25] Beweislast für die Richtigkeit liegt bei der/dem Betroffenen.

In der DE-Verwaltungspraxis ist Art. 16 DSGVO *nicht* der reguläre Korrekturweg — stattdessen gelten **vorrangige Spezialgesetze**:
- **Adresse**: § 17 BMG → Bürgeramt-Termin oder eWA (Online).
- **Name (nach Heirat / Scheidung / Geschlechtsumwandlung)**: Standesamt + § 1355/§ 1559 BGB / § 45b PStG.
- **Familienstand**: Standesamt.
- **Staatsangehörigkeit**: Einbürgerungsbehörde / StAG.
- **Religion**: Austritts- oder Eintritts-Verfahren am Standesamt / kirchliche Stelle.
- **Steuer-IdNr**: BZSt (nicht änderbar; Korrektur nur bei Falscheintragung).
- **Banking/IBAN, E-Mail, Telefon**: Direkt-Eingabe in BundID / ELSTER / GKV-Portal — *keine* hoheitliche Datenpflege.

**Demo-Implikation**: Pro Feld muss der Korrekturweg explizit angezeigt werden — *kein* Universal-„Bearbeiten"-Button. Das ist der UX-Trick, der Realismus + Datenmacht-Kontrolle vereint.

#### 3c. DSGVO Art. 30 — Verzeichnis Verarbeitungstätigkeiten (VVT)

Art. 30 DSGVO ist eine **Behörden-/Unternehmens-Pflicht**, kein Bürger:innen-Recht.[^24] Aber: das VVT enthält im Wesentlichen dieselben Felder wie eine Art-15-Auskunft (Zwecke, Kategorien betroffener Personen, Empfängerkategorien, Speicherdauer, technische/organisatorische Maßnahmen). Für die Demo bedeutet das: das DSC-Pattern (Übermittlungs-Log mit Empfänger + Zweck + Rechtsgrundlage) ist *die* Citizen-Side-Sicht auf die Behörden-VVT.

#### 3d. § 51 BMG — Auskunfts- und Übermittlungssperren

§ 51 BMG erlaubt Bürger:innen, einer Stelle (privat oder öffentlich, je nach Sperre) den Datenabruf aus dem Melderegister zu verweigern:[^26]
- **Auskunftssperre (§ 51 Abs. 1 BMG)**: bei Gefahr für Leben, Gesundheit, persönliche Freiheit oder ähnliche schutzwürdige Interessen. Begründungspflicht. 2 Jahre, verlängerbar.
- **Übermittlungssperre (§ 51 Abs. 5 BMG, indirekt aus § 36/§ 50 Abs. 5 BMG)**: keine Begründung erforderlich, unbefristet, Sperrt z. B. Adressmitteilungen an Religionsgemeinschaften (§ 42 BMG-Push), Adressbuch-Verlage, Wahlwerbung (§ 50 BMG).

**Demo-Implikation**: Datenmacht-Kontrolle wird *nicht* durch „Daten ausblenden" performt, sondern durch Sperren-Toggle pro Empfänger — analog zu Singpass-MyInfo-Consent. Das ist kein Speculative-Design, das ist Bestandsrecht.

### 4. Prior Art — international

| Land | Plattform | Felder-Umfang | Self-Edit | Audit-Log | Drittanbieter-Consent | Quelle |
|---|---|---|---|---|---|---|
| **Estland** | eesti.ee + Andmejälgija (Data Tracker, seit 2017) | alle Felder im Bevölkerungsregister + dezentrale Register-Sicht via X-Road | Behörden-Workflow, dezentral | **Vollständig**: jede:r Bürger:in sieht jede staatliche Abfrage seiner Daten der letzten Jahre | Eingebaut: gesetzliches Verbot redundanter Datenbanken; Drittanbieter-Daten werden mit X-Road-Consent geteilt | [^17][^27] |
| **Dänemark** | borger.dk „Mit Overblik" / „Mine data" + CPR-Register | Name, CPR-Nr., Adresse, Familienverhältnisse, Geburtsdaten, Staatsangehörigkeit, Kirchenmitgliedschaft, Heirat/Scheidung, Vormundschaft, „Beskyttelsesoplysninger" | Nein, nur Verwaltung (Kommune, Sogn, Familieretshus) | „Registerindsigt" zeigt Bestand, aber kein Übermittlungs-Audit-Log | NemID/MitID-basierter Consent für Drittanbieter (NemKonto) | [^16][^28] |
| **Finnland** | Suomi.fi „Henkilötiedot" + Population Information System | Name, Identitätscode, Adresse, Heimatgemeinde, Staatsangehörigkeit, Familie, Sprachen, Beruf, Religion, Vormundschaft, Eigentum (Liegenschaften) | **Ja, ausgewählte Felder**: Rufname, Beruf, E-Mail, Muttersprache, Kommunikationssprache | Verfügbar via DVV | Stark eingebaut (Suomi.fi-Web-Service) | [^18][^29] |
| **Singapur** | Singpass + MyInfo Data Catalog | **>95 Person-Datenfelder** in 7 Kategorien (Personal/Identität ~20, Family ~6, Address ~3, Education/Employment, Finance ~11, Property, Vehicle, Government Schemes ~49) | Begrenzt; primär hoheitlich-gepflegt | Activity-Log in Singpass-App | **Stärkstes Pattern weltweit**: Drittanbieter-Apps fragen pro Feld-Set Consent, Bürger:in genehmigt im Singpass-App per Tap | [^19][^30] |
| **Norwegen** | Altinn-Profil + Folkeregister | Name, Anschrift, Familienverhältnisse, Beschäftigung (begrenzt) | E-Mail, Mobilnummer, Notification-Präferenzen, Sprache | Aktivitäts-Log über Altinn | Ja, Drittanbieter-Apps können mit Consent abrufen | [^31] |
| **UK** | GOV.UK One Login (ab 9. Februar 2026 Pflicht für neue Nutzer:innen) | Identitäts-Verifizierung (eID-vergleichbar), Anschrift, geburtsdatum-basiert | Begrenzt | Sicherheits-Aktivitätsprotokoll, kein Cross-Service-Audit | Service-by-Service-Consent | [^32][^33] |

**Pattern, die wir stehlen müssen**:
1. **Estland Andmejälgija** als citizen-facing Audit-Log → 1:1 für unser DSC-Pendant.
2. **Suomi.fi-Korrektur-Self-Service für leichte Felder** (E-Mail, Telefon, Sprachen, Beruf) vs. Verwaltungsweg für hoheitliche Felder.
3. **Singpass MyInfo Drittanbieter-Consent** als Pattern für „Welche externen Anbieter dürfen welches Feld lesen?" — relevant für die spekulative 2027-Vision, in der EUDI-Wallet-Attestations an Banken/Versicherer geteilt werden.

**Pattern, die wir *nicht* stehlen sollten**:
- **Dänemark CPR**: keine Self-Edit-Möglichkeit, keine Audit-Logs. Schwächer als Estland/Finnland.
- **UK One Login**: nur Identifikations-Layer, kein Stammdaten-Aggregator.

### 5. Whitespace in Deutschland — gibt es einen Aggregator?

| Player | Was zeigt es? | Stammdaten-Aggregator? |
|---|---|---|
| **BundID / DeutschlandID** | Identitäts- + Kontaktdaten + Postfach | Nein — Identitäts-Slice |
| **Mein ELSTER** | Steuer-Stammdaten (Adresse, IBAN, Religion für Kirchensteuer) | Nein — Steuer-Slice |
| **GKV-Portale (TK, AOK, Barmer, …)** | Mitgliedschaft + Vertragsdaten | Nein — Versicherer-Slice, nicht Cross-Kasse |
| **eAT-/„AusweisApp2"** | Ausweisdaten | Nein — Dokument-Slice |
| **Service-Berlin / BayernPortal etc.** | jeweils eigene Stammdatenfragmente, nicht synchronisiert untereinander | Nein — Land-Slice |
| **Caya** (~24 Mio €/Jahr Umsatz, ~50 Mitarbeiter:innen) | digitales Postfach, OCR auf Briefe, kein Stammdaten-Layer | Nein |
| **Bureaucrazy** | Übersetzungs-/Hilfeplattform, kein Stammdaten-Layer | Nein |
| **Localyze** | B2B Mobility-Plattform für Arbeitgeber:innen, kein Bürger:innen-Stammdaten | Nein |

**Befund**: Es gibt heute (Mai 2026) in DE **keine** consumer-facing UI, die Stammdaten *behördenübergreifend aggregiert + konsolidiert + erklärt + Korrekturwege anzeigt + Audit-Log über Übermittlungen liefert*. Diese Lücke ist die Demo-Whitespace-Position.

**Warum existiert der Aggregator nicht?**
- Rechtsmechanik: § 34/§ 36 BMG erlaubt Pushes *zwischen Behörden*, *nicht* an einen privaten Aggregator. Eine private App kann keine Lese-Rechte am Melderegister beziehen ohne separate Rechtsgrundlage.
- Identitäts-Authentifizierung: nur eID-/Online-Ausweisfunktion erlaubt vertrauensvolle Bürger:innen-Identifikation — und die ist seit 2020 stark verbessert, aber Nutzungs-Adoption noch 2026 Lücken.
- Fragmentierung der Behörden: föderale Struktur, 16 Länder + ~11.000 Kommunen, jede mit eigenem Fachverfahren.
- Vertrauen: Privatwirtschaft als „Bürger:innen-Profil"-Halter ist DSGVO-/öffentlichkeits-politisch toxisch (Cambridge-Analytica-Schatten).

→ **Genau deshalb** ist der einzige rechtlich+gesellschaftlich denkbare Pfad: ein **öffentlich-rechtlicher** Aggregator, technisch über BundID-/DSC-/EUDI-Wallet-Infrastruktur, UX-mäßig consumer-grade. Genau das simuliert unsere Demo.

### 6. Demo-relevante Einzelfragen

#### 6a. Editierbar vs. Read-only pro Feld

| Feld | Self-Edit-Pfad in Demo | Reale Korrekturlogik |
|---|---|---|
| Familienname | Read-only mit „Korrektur über Standesamt" | § 1355 BGB / § 45b PStG |
| frühere Namen | Read-only | systemgepflegt |
| Vornamen | Read-only mit „Korrektur über Standesamt" | § 1626 BGB / § 45 PStG |
| Doktorgrad | Self-Edit mit Beleg-Upload | DSGVO Art. 16, Behörde prüft |
| Geburtsdatum/-ort | Read-only | Standesamt; Korrektur erfordert PStG-Verfahren |
| Geschlecht | Read-only mit „Korrektur über Standesamt + § 45b PStG" | § 45b PStG (PStG-Reform 2024) |
| Steuer-IdNr | Read-only | BZSt; nicht änderbar |
| Staatsangehörigkeit | Read-only mit „Korrektur über Einbürgerungsbehörde" | StAG |
| Religion | Self-Edit-Trigger zum Standesamt-Austritts-Verfahren | RelKErhG / Landesrecht |
| Adresse | Read-only mit „Korrektur über eWA / Bürgeramt" | § 17 BMG, eWA |
| Familienstand | Read-only mit „Korrektur über Standesamt" | § 5/§ 17 PStG |
| Ehegatte/Lebenspartner | Read-only | Standesamt |
| minderjährige Kinder | Read-only | Standesamt + Familienkasse |
| Personalausweis-Nr / Pass-Nr | Read-only | Bürgeramt + Bundesdruckerei |
| AZR-Nr. | Read-only | Ausländerbehörde |
| Auskunfts-/Übermittlungssperren | **Self-Edit (kritischer Toggle)** | § 51 BMG → tatsächlich self-aktivierbar mit Begründung-Upload |
| **Kontaktdaten** (E-Mail, Mobil) | **Self-Edit** | BundID-Konto-Konfiguration, kein hoheitlicher Datenfluss |
| **IBAN für Erstattungen** | **Self-Edit** | ELSTER + GKV separat; kein zentraler Push |
| **Sprachpräferenz** | **Self-Edit** | DSGVO + KERN-Design-System Accessibility |

**Recommendation**: Read-only mit eindeutigem Korrekturweg-Pointer pro Feld; **Self-Edit nur** für Kontaktdaten, IBAN, Sprachpräferenz, Sperren-Toggle. Die /datenschutz-Cockpit zeigt dann, *wann* eine Behörde via § 36-Push die Felder „nachzieht".

#### 6b. Familie/Dependents in Stammdaten oder eigene Kapazität?

§ 3 Abs. 1 Nr. 15 + 16 BMG hält Ehegatte, Lebenspartner und minderjährige Kinder **direkt** im Stammdatensatz der Hauptperson. Estland macht es analog (Population Register). Suomi.fi auch. Singapore MyInfo macht es als eigene Kategorie „Family" (6 Felder).

**Recommendation**: Familie als **Sektion** innerhalb von Stammdaten (matching § 3 BMG), nicht als separate Capability. Ein eigener Tab `/familie` macht aber Sinn für *aktive* Vorgänge (Kindergeld-Antrag, Geburten, gemeinsame Stammdaten-Mehrfach-Sicht). Stammdaten = Profilanzeige, Familie = Vorgangs-Bündelung.

#### 6c. Beschäftigung (Arbeitgeber, Steuerklasse) in Stammdaten?

**Nicht im BMG** (außer indirekt via Lohnsteuer-Abzugsmerkmale § 3 Abs. 2 Nr. 2). Beschäftigungsdaten leben primär in:
- **DRV** (Versicherungsnummer, Versicherungsverlauf, DEÜV-Meldungen).
- **GKV** (Beschäftigungsverhältnis, Beitragspflicht).
- **Arbeitgeber-Personalakte** (privatwirtschaftlich, kein hoheitlicher Datenfluss).
- **ELSTER** (Lohnsteuermerkmale, Steuerklasse).

Suomi.fi zeigt **Beruf** als Self-Edit-Feld, *nicht* den Arbeitgeber. Singpass MyInfo zeigt Arbeitgeber + Occupation, aber nur für Foreigners (im Pass-Kontext relevant).

**Recommendation**: Beschäftigungs-Stammdaten nur als **Read-only-Aggregations-Sicht** zeigen, mit Empfänger-Hinweis (DRV / GKV / ELSTER), und die *Editierung* explizit an die jeweilige Stelle delegieren. Nicht in der „Stammdaten"-Kern-UI; eher in einem Tab `/beschaeftigung` oder als Sektion innerhalb Stammdaten mit eigener Header-Trennung.

#### 6d. Finanzdaten (IBAN, Steuer-IdNr) in Stammdaten?

- **Steuer-IdNr** ist nach § 3 Abs. 1 Nr. 8 BMG bereits Teil des Melderegister-Stammdatensatzes. → klar in Stammdaten.
- **IBAN für Erstattungen** ist *kein* hoheitliches Datum — es lebt redundant in ELSTER, Familienkasse, GKV, jeder Behörde, die Erstattungen leistet. **eGov-Monitor 2025** identifiziert IBAN-Mehrfacheingabe als einen der Kern-Pain-Punkte.[^1]

**Recommendation**: **IBAN als Self-Edit-Feld** in Stammdaten, mit eindeutigem Disclaimer „Diese Bankverbindung wird mit Ihrer Einwilligung an folgende Stellen zur Erstattung geteilt: [Familienkasse, ELSTER, GKV]" — zentrale Hinterlegung mit consent-driven Push. Genau dieses Muster ist in DE *nicht* implementiert, aber technisch machbar via BundID-Stammdatenservice (OZG § 8). Hoher Demo-Impact: das ist ein Schmerz, den jeder Mensch in DE kennt.

#### 6e. Sensible Daten (Religion, Gesundheit) im Stammdaten-Tab?

- **Religion** ist nach § 3 Abs. 1 Nr. 11 BMG Pflicht-Feld im Melderegister (für Kirchensteuer-Berechnung). DSGVO Art. 9 verbietet die Verarbeitung *grundsätzlich*, aber Art. 9 Abs. 2 lit. b/g erlaubt Verarbeitung für Sozialschutz/öffentliches Interesse mit gesetzlicher Grundlage — die in DE für die Religionssteuer existiert.[^34]
- **Gesundheitsdaten** sind *nicht* im BMG. Sie leben in GKVen, beim Arzt, ggf. ELSTER (Behinderten-Pauschbetrag). Sie gehören explizit *nicht* in unseren Stammdaten-Tab.

**Recommendation**: Religion als anzeigtes-aber-mit-Art-9-Disclaimer-versehenes Feld; Gesundheit *vollständig ausschließen* aus Stammdaten. Demo-Risiko bei Über-Inklusion (Datenschutz-Beirat würde ablehnen).

### 7. Risks & Open Questions

#### 7a. Legal-Realismus: Kann eine private App heute in BMG-Stammdatenflüsse reinpatchen?

**Antwort: Nein.** § 34/§ 36 BMG erlaubt Pushes nur zwischen öffentlichen Stellen mit gesetzlicher Spezial-Grundlage. Eine private App kann:
- *Nicht* in das Melderegister schreiben.
- *Nicht* Adressdaten an die Krankenkasse pushen.
- *Lediglich* via DSGVO Art. 15 / Art. 16 als Vermittler/Wegweiser auftreten (Brief-Generator, Termin-Buchung).

Die Demo muss daher als **Lese- und Wegweiser-Schicht** positioniert werden, nicht als Schreib-Schicht. Die Hero-Story ist „Bürger:in *sieht* alles + *versteht* alles + *findet* den Korrekturweg + *delegiert* an die richtige Behörde" — nicht „Bürger:in *ändert* die Daten in der App und alles propagiert sich".

**Architektur-Konsequenz**:
- Demo-Stammdaten-UI = öffentlich-rechtliche **Lese-Aggregation** + **Korrekturweg-Wegweiser** + **Audit-Log** (DSC-Klon) + **Self-Edit nur für nicht-hoheitliche Felder** (Kontaktdaten, IBAN, Sprachpräferenz).
- Spekulative 2027-Vision macht klar, dass dieser Aggregator nur als **öffentlich-rechtlicher Service** unter BundID-/DeutschlandID-/DSC-Schicht funktioniert; eine privatwirtschaftliche App à la Caya/Bureaucrazy *kann* das nicht legal liefern.

#### 7b. DSGVO Art. 9 — Religion/Gesundheit/Behinderung im Stammdaten-Tab?

**Empfehlung**: Religion ja (BMG-pflicht), Gesundheit nein, Behinderung im sozialen Vorgangskontext (z. B. Schwerbehindertenausweis-Antrag), nicht als Stammdaten-Feld. Über-Inklusion ist Datenschutz-Risiko und Vertrauensverlust-Risiko.

#### 7c. Demo-Bloat — wie viele Felder?

19 Pflicht- + 10 Zusatz-Felder aus § 3 BMG sind viel. Suomi.fi listet ~30 Felder, Singpass ~95. Eine flache Liste mit 30 Feldern erschlägt Bürger:innen.

**Recommendation**: Stammdaten-Tab in 5 Sektionen segmentieren — Identität (Name, Geburt, Geschlecht, Staatsangehörigkeit, Doktorgrad), Anschrift (Haupt-/Neben-/historisch), Familie (Ehegatte, Kinder), Dokumente (Ausweis, Pass, eAT, AZR-Nr.), Sperren & Einstellungen (Auskunftssperre, Kontaktdaten, IBAN, Sprache).

#### 7d. Open Questions für domain-expert

1. **§ 36 BMG-Empfänger 2026**: vollständige Liste aller heute regelmäßig empfangenden Stellen (über die in TL;DR genannten Beitragsservice / FA / Wehrverwaltung / GKV / DRV hinaus)? Welche per Bundes-, welche per Landesrecht? `domain-expert validate`.
2. **DSC-Adoption Mai 2026**: Wie viele der 51 RegMoG-Register sind tatsächlich an das BVA-IDA + Bremen-DSC angeschlossen? KBA seit 2026; weitere? Existiert eine offizielle Zähl-Quelle? `domain-expert validate`.
3. **§ 17a Abs. 1 PStG / § 45b PStG-Reform**: Geschlechtseintrag-Korrektur seit 2024 self-deklarativ — ist die UI „Self-Edit mit Standesamt-Termin-Buchung" rechtlich zulässig? `domain-expert validate`.
4. **DEÜV-Adressfluss seit 2010**: ist die Aussage „GKVen bekommen Adressdaten heute schon automatisch von Meldebehörden, daher sind Arbeitgeber-Adress-Änderungsmeldungen entfallen" 1:1 belegbar? Welcher Bundes- oder Landes-Paragraf trägt das? `domain-expert validate`.
5. **§ 51 BMG-Sperren als Self-Edit-Feature**: rechtlich erforderlich, dass die/der Bürger:in die Begründung der Auskunftssperre vor *einer* Bürger:innen-Behörde dokumentiert, oder reicht für die Übermittlungssperre ein einfacher Toggle ohne Begründung? `domain-expert validate`.
6. **EUDI-Wallet-PID + BundID-Konvergenz**: Plant das BMDS, dass der BundID-Stammdatenservice und die EUDI-Wallet-PID *dieselbe* Quelle sind, oder bleiben sie getrennt? Welches ist die ARF-2.x-konforme Roadmap? `domain-expert validate`.
7. **Religionsfeld DSGVO Art. 9**: Reicht die BMG-Norm § 3 Abs. 1 Nr. 11 als Art-9-Abs.-2-Erlaubnistatbestand? Oder benötigt die Anzeige in einer Bürger:innen-UI eine separate Einwilligung? `domain-expert validate`.

### 8. Three Demo Flows ranked by impact

#### 8.1 (Top) „Mein Profil — Wer hat was, wer pflegt was, wer hat zuletzt zugegriffen"

**Szene**: Bürger:in landet auf `/stammdaten`. Top-Card zeigt: „Sie sind in **7 öffentlichen Registern** mit Ihrer IDNr geführt. **Letzte Übermittlung**: vor 3 Tagen — Adresse vom Bürgeramt Berlin-Mitte an Beitragsservice ARD/ZDF/Dlr (Rechtsgrundlage: § 11 Abs. 4 RBStV). Ist das in Ordnung?" Buttons: „Ja, danke für die Info" / „Datenschutzcockpit öffnen" / „Sperre einrichten".

Darunter sind die 5 Sektionen aus 7c. Pro Feld: Wert + autoritative Behörde + Korrekturweg + letzter Update-Zeitpunkt. Die hochinteressante Ahnungslosigkeit darüber, wie umfassend das Melderegister bereits ist, wird in **eine** Erkenntnis-Geste verdichtet.

**Demo-Wow-Faktor**: hoch — niemand in DE hat das so je gesehen.
**Pain-Coverage**: Mehrfacherfassung-Sichtbarkeit, Korrekturweg-Erklärung, DSGVO-Art-15-Operationalisierung.
**Realismus**: hoch (DSC + BundID-Stammdatenservice + § 3 BMG sind echt; die UI ist spekulativ).

#### 8.2 „Adresse korrigieren — Wegweiser statt Reise"

**Szene**: Bürger:in tippt auf das Adress-Feld. Modal öffnet: „Ihre Adresse pflegt das **Bürgeramt Berlin-Mitte**. Korrekturweg: **eWA** (Online, ~10 Min, BundID + eID erforderlich) **oder** Bürgeramt-Termin (nächster freier Termin: 17.06.2026, Bürgeramt Tempelhof)." Buttons: „eWA starten" (führt zu echtem eWA-Mock im Vorgänge-Tab) / „Termin buchen" / „Fragen Sie den Assistenten".

Darunter: „Folgende Stellen werden nach Ihrer Korrektur automatisch informiert: Finanzamt, Beitragsservice, Krankenkasse (DEÜV), DRV, Wehrverwaltung, ggf. Familienkasse." Mit Rechtsgrundlage-Tooltips pro Stelle.

**Demo-Wow-Faktor**: mittelhoch.
**Pain-Coverage**: Mehrfacherfassung-Reduktion, Korrekturweg-Klarheit.
**Realismus**: hoch (alles in der Cascade ist heute schon real, nur unsichtbar).

#### 8.3 „Drittanbieter-Consent — meine Daten an private Empfänger"

**Szene**: Bürger:in tippt Sektion „Sperren & Einstellungen" → „Externe Anbieter". Liste: „Ihre Hausbank Sparkasse Berlin hat **vor 14 Tagen** einen Adressabgleich angefragt. Sie haben zugestimmt am 12.04.2026 (gültig bis 12.04.2027). Ihr Stromanbieter Vattenfall hat **gestern** angefragt. Antworten Sie:". Buttons: „Zustimmen, einmalig" / „Zustimmen, dauerhaft" / „Ablehnen" / „EUDI-Wallet-Attestation generieren".

Disclaimer am Boden: „§ 34 BMG erlaubt der Meldebehörde keinen direkten Push an Privatfirmen. Diese Anfragen laufen über Ihren EUDI-Wallet-Trust-Service als attestation-getragene Selbstauskunft."

**Demo-Wow-Faktor**: hoch (zeigt EUDI-Wallet-Use-Case + Daten-Souveränität).
**Pain-Coverage**: Datenmacht, Drittanbieter-Friction.
**Realismus**: spekulativ-2027 (EUDI-Wallet ist Ende-2026-Termin; Drittanbieter-Adoption beginnt 2027). **Wichtig**: explizit als „2027-Szenario" framen, sonst überspannt es die Realismus-Linie der Demo.

### 9. Open Disagreements für domain-expert

Punkte, an denen domain-expert (legal/process realism) wahrscheinlich Korrekturen oder Bremswege einlegen wird:

1. **„Self-Edit für Kontaktdaten und IBAN" (siehe 6a, 6d)**: Vorschlag ist, IBAN zentral in Stammdaten zu hinterlegen und mit consent-driven Push an Familienkasse / ELSTER / GKV zu pushen. domain-expert könnte überrulen, weil heute (Mai 2026) **kein** offizieller IBAN-Stammdatenservice in BundID existiert; Implementierung wäre vollständig spekulativ. Frage: ist das eine zulässige 2027-Vision oder „demo-zoll"?

2. **„DSC heute schon flächendeckend nutzbar" (siehe 2c)**: Research-Scout-Tendenz, das DSC als „operativ, nur nicht jeder Bürger weiß es" zu framen. domain-expert wird wahrscheinlich präzisieren: technische Voraussetzungen sind „frühestens 2026 erwartet" laut Bremen-FAQ — d. h. die *flächendeckende* Nutzbarkeit ist 2026 noch nicht erreicht; nur Pilot-Behörden (BVA, BZSt, KBA, ggf. weitere). Demo sollte „[MOCK] — speculative 2027" markieren.

3. **„Geschlechtseintrag self-deklarativ"**: nach § 45b PStG-Reform 2024 ist die Geschlechtsänderung mittels Selbsterklärung beim Standesamt möglich (3 Monate Vorlauf, dann Standesamt-Termin). Demo-UI könnte das als „Self-Edit mit Standesamt-Termin-Buchung" zeigen. domain-expert könnte überrulen, falls die formaljuristische Pflicht zum persönlichen Standesamt-Termin (Identitäts-Verifikation) das *Self-Edit*-Pattern ausschließt — dann ist der UX-Weg „Read-only mit Wegweiser zum Standesamt" der korrektere.

4. **„Religion als angezeigte Datenkategorie"**: § 3 Abs. 1 Nr. 11 BMG-Pflicht ist klar; aber DSGVO Art. 9-Risiko bei Anzeige in einer Bürger:innen-UI ist nicht-trivial. domain-expert könnte überrulen: Anzeige nur opt-in / mit Disclaimer. Vorschlag, das mit Zusatz-Klick „Religion anzeigen" zu hidden-by-default zu machen.

5. **„Drittanbieter-Consent über EUDI-Wallet" (Demo Flow 8.3)**: research-scout schlägt vor, das als *integrierten* Teil der Stammdaten-UI darzustellen. domain-expert wird wahrscheinlich darauf hinweisen, dass EUDI-Wallet-Attestation-Issuance in DE 2027 erst beginnt, und dass die UI-Kopplung zwischen einem öffentlich-rechtlichen Stammdaten-Aggregator und privatwirtschaftlichen Empfängern eigene Rechtsgrundlage benötigt. Vorschlag: Flow 8.3 explizit als *2027-Vision* abgrenzen, Flows 8.1 und 8.2 als *2026-Bestandstechnik-Sichtbarmachung* framen.

## Sources

[^1]: [eGovernment MONITOR 2025 (Initiative D21 + TUM, gefördert vom BMDS)](https://initiatived21.de/publikationen/egovernment-monitor/2025) — accessed 2026-05-08
[^2]: [Bitkom Studie „Digitale Teilhabe 2025"](https://www.bitkom.org/sites/main/files/2025-06/bitkom-studienbericht-digitale-teilhabe-2025.pdf) — accessed 2026-05-08
[^3]: [X-Road — Estonia's digital backbone (Nortal)](https://nortal.com/insights/x-road-estonias-digital-backbone) — accessed 2026-05-08; [X-Road — e-Estonia](https://e-estonia.com/solutions/interoperability-services/x-road/) — accessed 2026-05-08
[^4]: [§ 3 BMG — Speicherung von Daten (gesetze-im-internet.de)](https://www.gesetze-im-internet.de/bmg/__3.html) — accessed 2026-05-08
[^5]: [Personalausweisportal — Die elektronische Wohnsitzanmeldung (Stand BundID-Integration 2024–2026)](https://www.personalausweisportal.de/Webs/PA/DE/buergerinnen-und-buerger/elektronische-wohnsitzanmeldung/elektronische-wohnsitzanmeldung-node.html) — accessed 2026-05-08
[^6]: [BundID wird 2026 zum Pflichtwerkzeug für Bürger (ad-hoc-news, BMDS-Roadmap-Zusammenfassung)](https://www.ad-hoc-news.de/boerse/news/ueberblick/bundid-wird-2026-zum-pflichtwerkzeug-fuer-buerger/68444056) — accessed 2026-05-08
[^7]: [BundID — Wikipedia (Stand 02.05.2026)](https://de.wikipedia.org/wiki/BundID) — accessed 2026-05-08
[^8]: [EUDI Wallet PID Rulebook v1.4, Annex 3.01](https://eudi.dev/1.4.0/annexes/annex-3/annex-3.01-pid-rulebook/) — accessed 2026-05-08
[^9]: [§ 4 IDNrG — Zu einer Person gespeicherte Daten (gesetze-im-internet.de)](https://www.gesetze-im-internet.de/idnrg/__4.html) — accessed 2026-05-08
[^10]: [§ 36 BMG — Regelmäßige Datenübermittlungen (gesetze-im-internet.de)](https://www.gesetze-im-internet.de/bmg/__36.html) — accessed 2026-05-08
[^11]: [Allgemeine Verwaltungsvorschrift zum BMG (BMGVwV)](https://www.verwaltungsvorschriften-im-internet.de/bsvwvbund_27092022_VII2201041418.htm) — accessed 2026-05-08
[^12]: [Datensicherheit: Änderungsmeldungen entfallen — Informationsportal für Arbeitgeber (vdek/GKV-Datenaustausch)](https://www.informationsportal.de/datensicherheit-aenderungsmeldungen-entfallen/) — accessed 2026-05-08; [DEÜV im Überblick — AOK Arbeitgeberservice](https://www.aok.de/fk/sozialversicherung/meldung-zur-sozialversicherung/deuev-meldungen-im-ueberblick/) — accessed 2026-05-08
[^13]: [FAQ Datenschutzcockpit — Bremen (Senator für Finanzen)](https://www.finanzen.bremen.de/digitalisierung/digitalisierungsbuero/datenschutzcockpit/faq-haeufig-gestellte-fragen-zum-datenschutzcockpit/faq-zum-datenschutzcockpit-fuer-oeffentliche-stellen-seite-1-123426) — accessed 2026-05-08
[^14]: [Datenschutzcockpit — digitale-verwaltung.de](https://www.digitale-verwaltung.de/Webs/DV/DE/registermodernisierung/elemente/datenschutzcockpit/datenschutzcockpit-node.html) — accessed 2026-05-08
[^15]: [BVA — Anbindungsleitfaden DSC (zentrale Register)](https://www.bva.bund.de/SharedDocs/Downloads/DE/Behoerden/Verwaltungsdienstleistungen/Registermodernisierung/Anbindungsleitfaden_DSC_zentrale_Register.pdf?__blob=publicationFile&v=4) — accessed 2026-05-08
[^16]: [borger.dk Folkeregister og CPR — Det Centrale Personregister (CPR)](https://www.borger.dk/samfund-og-rettigheder/Folkeregister-og-CPR/Det-Centrale-Personregister-CPR) — accessed 2026-05-08; [cpr.dk — Hvad og hvem er registreret i CPR](https://www.cpr.dk/borgere/hvad-staar-der-om-mig-i-cpr-registerindsigt/hvad-og-hvem-er-registreret-i-cpr-og-hvem-opdaterer-oplysninger-om-dig-i-cpr) — accessed 2026-05-08
[^17]: [Data tracker — RIA (Riigi Infosüsteemi Amet, Estonia)](https://www.ria.ee/en/state-information-system/people-centred-data-exchange/data-tracker) — accessed 2026-05-08; [Data tracker tool that builds trust in institutions — e-estonia.com](https://e-estonia.com/data-tracker-build-citizen-trust/) — accessed 2026-05-08
[^18]: [Personal data in Population Information System — Suomi.fi instructions](https://www.suomi.fi/instructions-and-support/your-data/personal-data-in-population-information-system) — accessed 2026-05-08; [Check your own personal details — DVV](https://dvv.fi/en/check-your-own-personal-details) — accessed 2026-05-08
[^19]: [Singpass MyInfo Data Catalog — developer.singpass.gov.sg](https://docs.developer.singpass.gov.sg/docs/data-catalog-myinfo/catalog) — accessed 2026-05-08; [Myinfo business — Data Items](https://www.singpass.gov.sg/main/myinfobusiness/data-items) — accessed 2026-05-08
[^20]: [BVA Registermodernisierung — Was ist das RegMoG/IDNrG?](https://www.bva.bund.de/DE/Services/Behoerden/Verwaltungsdienstleistungen/Registermodernisierung/FAQ_Externe_Links_Downloads/faq/_documents/1_1.html) — accessed 2026-05-08
[^21]: [Bitkom Digitaler Staat 2025](https://www.bitkom.org/Digitaler-Staat-2025) — accessed 2026-05-08
[^22]: [BMDS — Elektronische Wohnsitzanmeldung BundID-Integration](https://bmds.bund.de/aktuelles/aktuelle-meldungen/detail/elektronische-wohnsitzanmeldung-55-millionen-bundesbuergerinnen-und-buerger-koennen-sich-nach-einem-umzug-digital-ummelden) — accessed 2026-05-08
[^23]: [BMI Pressemitteilung — Upgrade für ein digitales Deutschland (BundID + DeutschlandID)](https://www.bmi.bund.de/SharedDocs/pressemitteilungen/DE/2024/02/bt-beschluss-ozg.html) — accessed 2026-05-08
[^24]: [BfDI — Auskunftsrecht nach Art. 15 DSGVO](https://www.bfdi.bund.de/DE/Buerger/Inhalte/Allgemein/Betroffenenrechte/Betroffenenrechte_Auskunftsrecht.html) — accessed 2026-05-08
[^25]: [BfDI — Berichtigungsrecht nach Art. 16 DSGVO](https://www.bfdi.bund.de/DE/Buerger/Inhalte/Allgemein/Betroffenenrechte/Betroffenenrechte_Berichtigung.html) — accessed 2026-05-08; [BVerwG 6 C 7.20 (Berichtigungsklage Register)](https://www.bverwg.de/020322U6C7.20.0) — accessed 2026-05-08
[^26]: [§ 51 BMG — Auskunftssperren (gesetze-im-internet.de)](https://www.gesetze-im-internet.de/bmg/__51.html) — accessed 2026-05-08; [Leitfaden für die Meldebehörden über den Umgang mit Auskunftssperren (frag-den-staat)](https://media.frag-den-staat.de/files/foi/810608/leitfaden-meldesperren.pdf) — accessed 2026-05-08
[^27]: [Once-only principle — Wikipedia](https://en.wikipedia.org/wiki/Once-only_principle) — accessed 2026-05-08
[^28]: [borger.dk — Få indsigt i dine oplysninger (Registerindsigt)](https://www.borger.dk/samfund-og-rettigheder/Folkeregister-og-CPR/Registerindsigt) — accessed 2026-05-08
[^29]: [Personal data — Suomi.fi](https://www.suomi.fi/your-data/personal-data) — accessed 2026-05-08
[^30]: [Singpass MyInfo — Singpass Developer Docs (Personal catalog)](https://docs.developer.singpass.gov.sg/docs/data-catalog-myinfo/catalog/personal) — accessed 2026-05-08
[^31]: [Altinn Profile — info.altinn.no](https://info.altinn.no/en/help/profile/) — accessed 2026-05-08
[^32]: [GOV.UK One Login — Privacy Notice](https://www.gov.uk/government/publications/govuk-one-login-privacy-notice/govuk-one-login-privacy-notice) — accessed 2026-05-08
[^33]: [Using your GOV.UK One Login — Sign in to your GOV.UK One Login](https://www.gov.uk/using-your-gov-uk-one-login) — accessed 2026-05-08
[^34]: [DSGVO Art. 9 — Verarbeitung besonderer Kategorien personenbezogener Daten](https://dsgvo-gesetz.de/art-9-dsgvo/) — accessed 2026-05-08

---

## Domain validation (domain-expert, 2026-05-08)

Vollständige Adjudikation siehe `docs/domain/stammdaten.md`. Hier nur die Inline-Korrekturen zu den drei von research-scout flagged Disagreements und zwei zusätzliche, von domain-expert hinzugefügte Punkte.

### Inline-Korrekturen zu den research-scout Befunden

**Zu 6a / 6d — IBAN-Self-Edit (Disagreement #1)**

> *domain-expert 2026-05-08:* Bestätigt, dass ein zentraler IBAN-Stammdatenservice in BundID **heute (Mai 2026) nicht existiert**. § 8 OZG regelt das Bürger:innen-Konto, nennt aber kein IBAN-Feld; die BundID-Datenschutzerklärung dokumentiert nur Identitäts- und Kontaktdaten als gespeicherte Felder. Self-Edit IBAN ist als Demo-Feature zulässig, **aber zwingend mit dem Disclaimer `stammdaten.disclaimer.iban_speculative` als 2027-Vision zu kennzeichnen**. Keine Suggestion, dass die App tatsächlich an Behörden pusht — Mock-Audit-Eintrag mit `[MOCK]`-Watermark genügt.

**Zu 2c — DSC-Adoption (Disagreement #2)**

> *domain-expert 2026-05-08:* Bestätigt + präzisiert. Stand 2026-04-15 hat sich das Kraftfahrt-Bundesamt an das **IDA-Verfahren (BVA)** angeschlossen (Pressemitteilung KBA Nr. 16/2026); die DSC-Anbindung folgt „in den kommenden Monaten". Bundesagentur für Arbeit / Basisdienst STEP ist im IDA-Pilotvorhaben (BVA-Newsletter 8). Eine flächendeckende Bürger:innen-Nutzung der 51 RegMoG-Register ist Mai 2026 **nicht** erreicht. Demo-UI-Empfehlung: Label „Datenschutzcockpit (Pilot-Phase)" + Roadmap-Tooltip; keine Suggestion, dass alle 51 Register heute protokolliert sind.

**Zu 6a / 7c.3 — Geschlechtseintrag SBGG (Disagreement #3)**

> *domain-expert 2026-05-08:* **Self-Edit-Pattern für den Geschlechtseintrag in der Demo-UI ist ausgeschlossen.** Primärquellen-Befund:
> - **§ 2 SBGG**: Erklärung gegenüber dem Standesamt mit zwei Versicherungen (Geschlechtsidentität entspricht; Folgen verstanden).
> - **§ 4 SBGG**: Persönliche Anmeldung beim Standesamt + **drei Monate Wartefrist** zwischen Anmeldung und Erklärung; Anmeldung wird ungültig nach 6 Monaten.
> - **§ 5 SBGG**: **Ein-Jahres-Sperrfrist** vor erneuter Erklärung.
> - **§ 45b PStG** (parallel weitergeltend für Personen mit Variante der Geschlechtsentwicklung): persönliche Erklärung vor dem Standesbeamten zwingend.
>
> UI-Empfehlung: Read-only mit Korrekturweg-Pointer „Standesamt-Termin SBGG buchen" → Mock-Wizard, der den dreistufigen Prozess (Anmeldung → 3 Monate → Beurkundung) abbildet und die ein-jährige Sperrfrist nach § 5 SBGG sichtbar macht.

**Zu 6e / 7b — Religionsmerkmal-Anzeige (von domain-expert ergänzt als Disagreement #4)**

> *domain-expert 2026-05-08:* Anzeige des Religionsmerkmals **hidden by default**. Speicherung im Melderegister beruht auf § 3 Abs. 1 Nr. 11 BMG; die Anzeige in einer Bürger:innen-UI ist von Art. 9 Abs. 2 lit. a DSGVO (Einwilligung) gedeckt, sofern explizit eingewilligt wird. Eine kontextfreie Default-Anzeige überschreitet die Erforderlichkeit. Disclaimer-String `stammdaten.disclaimer.religion_art9` siehe `docs/domain/stammdaten.md`.

**Zu 8.3 — Drittanbieter-Consent über EUDI-Wallet (von domain-expert ergänzt als Disagreement #5)**

> *domain-expert 2026-05-08:* Demo Flow 8.3 ist **explizit als 2027-Vision** zu kennzeichnen und in eine separate Sub-Sektion „Wallet-Nachweise & externe Empfänger" auszulagern. Hintergrund: BMG erlaubt **keinen** direkten Push aus dem Melderegister an private Empfänger (§ 34 BMG schließt Privatempfänger aus); Drittanbieter-Konsente laufen daher über EUDI-Wallet-Attestation. EUDI-Wallet-Pflicht in DE setzt mit eIDAS-2-VO 2024/1183 frühestens 2026/2027 ein (Bereitstellung), Drittanbieter-Akzeptanz 2027/2028. PID-Schema (Rulebook v1.4) deckt nur Identifikation + Adresse — andere Felder via separate (Q)EAA-Issuance.

### Bestätigte Befunde (ohne Korrektur)

- **§ 36 BMG-Mechanik**: § 36 BMG nennt keine Empfänger; Pushes liegen in Spezialgesetzen (RBStV § 11 Abs. 4, § 58c SG, § 42 BMG für Religionsgesellschaften, AO-Vorschriften, AZRG) und der AVV-BMG (BMGVwV vom 27.09.2022).
- **§ 4 IDNrG (11 Basisdaten beim BVA)**: Bestätigt.
- **EUDI Wallet PID v1.4** — 8 Pflichtattribute, mindestens 4 von 6 Identifikations-Hilfsattributen: Bestätigt.
- **§ 51 BMG-Sperren**: Auskunftssperre § 51 Abs. 1 BMG mit Begründung + 2-Jahres-Frist; Übermittlungssperren §§ 42 Abs. 3, 50 Abs. 5 BMG ohne Begründung: Bestätigt.
- **§ 290 SGB V (KVNR lebenslang, kassenübergreifend)**: Bestätigt.
- **§ 139b AO (Steuer-IdNr 11 Ziffern, lebenslang, nicht änderbar)**: Bestätigt.
- **DEÜV-Adressfluss zur GKV**: Bestätigt für Beschäftigte (Arbeitgeber → Datenstelle DRV → GKV); für Nicht-Beschäftigte teils heterogen über Landesrecht.

### Zusätzliche Primärquellen

- § 2 SBGG: https://www.gesetze-im-internet.de/sbgg/__2.html
- § 4 SBGG: https://www.gesetze-im-internet.de/sbgg/__4.html
- § 5 SBGG: https://www.gesetze-im-internet.de/sbgg/__5.html
- § 45b PStG: https://www.gesetze-im-internet.de/pstg/__45b.html
- § 34 BMG: https://www.gesetze-im-internet.de/bmg/__34.html
- AVV-BMG (BMGVwV vom 27.09.2022): https://www.verwaltungsvorschriften-im-internet.de/bsvwvbund_27092022_VII2201041418.htm
- KBA Pressemitteilung Nr. 16/2026 (IDA-Anbindung): https://www.kba.de/DE/Presse/Pressemitteilungen/Allgemein/2026/pm16_2026_ida_anbindung.html
- Bremen DSC-FAQ: https://www.finanzen.bremen.de/digitalisierung/digitalisierungsbuero/datenschutzcockpit/faq-haeufig-gestellte-fragen-zum-datenschutzcockpit/faq-zum-datenschutzcockpit-fuer-oeffentliche-stellen-seite-1-123426
