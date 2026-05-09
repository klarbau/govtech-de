---
topic: Dokumente — QR-verifizierter Dokumenten-Tresor mit speculative-2027 EUDI-Wallet-Export
question: For any citizen (horizontal capability, persona-agnostic), how realistic and prior-art-supported is a unified Behörden-Dokumenten-Tresor with QR-Verifikation und EUDI-Wallet-Export, and which legal, technical und UX-Patterns must we borrow oder vermeiden?
date: 2026-05-08
status: revised
confidence: medium
domain_validated_by: domain-expert
domain_validated_on: 2026-05-08
---

> **domain-expert 2026-05-08 — Status-Flip-Begründung**
> Status auf `revised` gesetzt. Die zehn load-bearing Aussagen sind grundsätzlich tragfähig; sechs benötigen Präzisierungen, eine ist neu hinzugekommen (Aussteller vs. Hersteller bei Bundesdruckerei-Produkten). Adjudikation der fünf flagged Disagreements + zwei neu identifizierten Punkte siehe `docs/domain/dokumente.md` Abschnitt 10. Inline-Annotationen in dieser Datei sind mit „**domain-expert 2026-05-08:**" markiert.

## TL;DR

- **Document-shock is real but quantitatively under-published in DE**: the consumer-facing pain („wo lag noch mal mein eAT-Bescheid / mein letzter Steuerbescheid / die Meldebestätigung von 2023?") ist im eGov-Diskurs konsistent dokumentiert über die abgeleiteten Indikatoren — nur **12 %** finden, der Staat erleichtere ihren Alltag (eGov-MONITOR 2025), **59 %** empfinden Behördenkontakt als „sehr anstrengend", **61 %** wünschen primär „uncomplicated findability" und **55 %** „Vermeidung doppelter Dateneingaben" (eGov-MONITOR 2025). Eine harte Statistik „verlorene Bescheide pro Haushalt pro Jahr" konnten wir **nicht** finden — `not found` und ehrlich so markieren.[^1][^2]
- **Die DE-Infrastruktur kommt — und sie ist ZeSI-zentriert**: Bundesdruckerei hat am **13. Mai 2025** die kostenlose Bürger-App **ZeSI mobile** in App Store + Google Play veröffentlicht; sie scannt Visible-Digital-Seal-QR-Codes (BSI TR-03171) auf Verwaltungsdokumenten und gibt einen sofortigen grün/rot-Echtheits-Bescheid. **Hamburgs eWA-Meldebestätigung trägt diese Siegel ab 2025** (~830 elektronische Anmeldungen/Tag, > 60 Mio. Bürger:innen abgedeckt). Das ist die wichtigste DE-Realität für unseren Tresor — wir müssen *nicht* eine Konvention erfinden, sondern eine produktive Infrastruktur sichtbar machen. ZeSI generator + ZeSI ad sind 2025/26 als zweite und dritte Komponente in der Pipeline.[^3][^4][^5]
> **domain-expert 2026-05-08:** ZeSI-mobile-Datum 13.05.2025 + BSI TR-03171 (Standard-Titel + Version 0.8) + Hamburg-eWA-Live-Status verifiziert. Kennzahlen-Präzisierung: ~830 Anmeldungen/Tag + ~350.000 kumulierte Meldungen + >2.500 angeschlossene Meldebehörden + ~80% bundesweite Abdeckung; **flächendeckende Ausstattung produktiv** in Rheinland-Pfalz und Schleswig-Holstein bestätigt; Berlin/München Mai 2026 nicht flächendeckend VDS-stellend. Aussage „>60 Mio. Bürger:innen abgedeckt" ist Reichweiten-Indikator (Einwohner in angeschlossenen Behörden), nicht aktive Nutzung. ZeSI generator + ZeSI ad: Bundesdruckerei-Pressemitteilung kündigt sie für 2025 an; Live-Verfügbarkeit zum 8.5.2026 nicht eindeutig öffentlich bestätigt — `not verified`.
- **EUDI-Wallet kommt 2026/27 als zweite Schicht über ZeSI**: Verordnung (EU) 2024/1183 verpflichtet Member States, **bis 31.12.2026** mindestens eine EUDI-Wallet bereitzustellen; mandatory acceptance durch private Relying Parties bis Ende 2027. Deutschland: BMDS+SPRIND-Sandbox seit Anfang 2026 live für PID-Tests, im Verlauf 2026 mit (Q)EAA-Tests erweitert; Public-Launch in Stufe 1 **Anfang 2027** geplant. ARF v2.6.0 (Stand 2026) standardisiert 4 Attestation-Typen (**PID**, **QEAA**, **EAA**, **PuB-EAA**) und mandatiert **mDoc (ISO 18013-5)** + **SD-JWT VC** als Pflichtformate; W3C VC nur optional für non-qualified EAAs. **Selective Disclosure** ist Pflicht-Feature.[^6][^7][^8][^9][^10]
> **domain-expert 2026-05-08:** Vier-Attestation-Typologie + Selective-Disclosure-Pflicht bestätigt direkt aus eudi.dev/2.6.0. Formulierung „ARF v2.6.0 mandatiert mDoc + SD-JWT VC" leicht zu hart — die ARF *unterstützt* die Formate; die *Pflicht* für PID + (Q)EAAs ergibt sich aus Implementing Regulations (CIR 2024/2980 + Format-Profile-CIRs Q3/Q4 2025). LSP-Konsens (POTENTIAL/EWC/NOBID/DC4EU) bestätigt mDoc + SD-JWT-VC als faktischen Standard. Substanziell korrekt, Beleg-Pfad in domain-Note präzisiert.
- **Prior Art beweist Massentauglichkeit**: **DigiLocker** (Indien) hat im **August 2025 ~570 Mio. registrierte Nutzer:innen und ~9,9 Mrd. ausgestellte Dokumente** — der größte Behörden-Dokumenten-Tresor weltweit, mit zeitbeschränkten Share-Links, QR-Verifikation und 1.936 Issuers + 2.407 Requesters (März 2025). **Estland Eesti-App** (2025 launched) bündelt ID-Karte/Pass/Führerschein als digitale Originale und ist der Vorläufer der estnischen EUDI-Wallet. **Apple Wallet ID** (USA) liefert seit 2022 ein produktives mDL-Pattern: 14 Bundesstaaten + Puerto Rico, an > 250 TSA-Flughäfen akzeptiert, Face/Touch-ID-Pflicht, Selective Disclosure (z. B. nur Birthdate, nicht Adresse). **Dänemark MitID + Digital Post** zeigt rechtsverbindliche Multi-Plattform-Inbox-Realität (synchronisiert über alle 4 Apps). **SCHUFA-BonitätsCheck** mit ImmoScout24-Verifikations-Code (60 Tage) ist das *deutschsprachige Lehrbuch-Pattern* für „QR-Code → Verifier scannt → bestätigt".[^11][^12][^13][^14][^15][^16]
- **Whitespace bleibt riesig**: Es existiert in DE Mai 2026 **kein consumer-facing Aggregator**, der eAT-Bescheid + Meldebestätigung + Steuerbescheid + ALG-Bescheid + Krankenversicherungsbescheinigung + KFZ-Brief + Geburtsurkunde in *einem* Tresor sammelt + QR-verifizierbar exportierbar macht. ELSTER hat eigenen Bescheid-Speicher (PDF-Download nach 180 Tagen verfügbar, Aufbewahrungspflicht des Bürgers selbst); BundID-ZBP hat Bescheid-Zustellung, aber kein Tresor-Pattern; Bundesdruckerei ZeSI ist eine *Verifikations*-App (nicht Speicher); DigiD-NL und Verimi sind angrenzend, aber kein „alle eigenen Behörden-Bescheide an einem Ort"-Player. **Genau das ist die Demo-Position**.[^17][^18][^19][^20]
- **Die kritischen Disagreement-Punkte für domain-expert** sind: (a) **Beglaubigung** — eine private App kann *keine* amtliche Beglaubigung nach § 33 VwVfG erstellen, hoheitlich vorbehalten; (b) **Selektives Offenlegen** — funktioniert in EUDI 2027, *heute* (Mai 2026) sind Bescheide Voll-PDFs ohne SD-JWT-Schichtung; (c) **§ 87a Abs. 4 AO + qeS** — ein elektronischer Steuerbescheid trägt heute eine *qualifizierte elektronische Signatur des Finanzamtes*, nicht ein Bürger-portables Wallet-Credential — die Demo darf hier den Unterschied „qeS am Bescheid (Behörde→Bürger)" vs. „Wallet-Attestation (Bürger→Dritter)" nicht verwischen. **Concept-verifier muss prüfen**, ob die 2027-Speculative-Annahmen klar markiert sind.[^21][^22]

## Findings

### 1. Citizen pain — „wo lag mein Dokument?"

#### 1a. Fragmentierungs-Realität

Ein:e durchschnittliche:r Bundesbürger:in trägt potenziell 8–15 verschiedene Behörden-/Quasi-Behörden-Dokumente, die sich über Lebensjahrzehnte ansammeln und in *unterschiedlichen* Postfächern, Ordnern und Schubladen leben. Eine indikative Liste:

| Dokument | Aussteller | Heute typisch abgelegt in |
|---|---|---|
| Personalausweis / Reisepass | Bürgeramt (Bundesdruckerei produziert) | Geldbörse, Schublade |
| Meldebestätigung | Meldebehörde / eWA | PDF in BundID + ggf. Email |
| Steuerbescheid (ESt/USt) | Finanzamt | Mein-ELSTER-Postfach (180 Tage Abrufbarkeit), Briefpost-Original, ggf. Steuerberater-Cloud[^17] |
| Krankenversicherungsbescheinigung | gesetzliche/private KK | Email/App der jeweiligen Kasse[^23] |
| Elektronische Gesundheitskarte (eGK) + Bescheinigungen | gesetzliche KK | Plastikkarte; eEB in Kassen-App[^23] |
| eAT (elektronischer Aufenthaltstitel) | Ausländerbehörde + Bundesdruckerei | Plastikkarte + Adress-Aufkleber + PIN-Brief[^24] |
| ALG-I- / Bürgergeld-Bescheid | Agentur für Arbeit / Jobcenter | Briefpost; teils JobCenter.Digital |
| KFZ-Schein (Zulassungsbescheinigung Teil I/II) | Zulassungsstelle (Bundesdruckerei) | Schublade |
| Geburts-/Heirats-/Sterbeurkunde | Standesamt | Briefpost; *digitale Personenstandsurkunde existiert noch nicht* (Stand 2026)[^25] |
| Schul-/Hochschul-Zeugnisse | Schule / Universität | Original in Schublade, Bewerbungs-PDF im Mailfach |
| Mietvertrag / Mietnachweis | Vermieter | Hausbesitz-Ordner |
| SCHUFA-Auskunft / BonitätsCheck | SCHUFA | PDF auf eigenem Rechner; gültig 60 Tage[^16] |
| Rentenbescheid | Deutsche Rentenversicherung | Briefpost |
| Gewerbeanmeldung | Gewerbeamt | Briefpost; teils Bundesportal |
| Bauantrags-Bescheid | Bauaufsichtsbehörde | Briefpost |

Diese Fragmentierung produziert ein klassisches **„kreisende Beweispflicht"-Pattern**: Behörde X (z. B. ABH bei Aufenthaltstitel-Verlängerung) verlangt einen aktuellen Krankenversicherungs-Nachweis, den die Krankenkasse ausstellen muss; Behörde Y (z. B. Vermieter) verlangt Meldebestätigung + SCHUFA + Einkommensnachweis. Jeder Nachweis muss *einzeln* angefordert, *einzeln* gedruckt, *einzeln* übermittelt werden. Eine zentrale offizielle Statistik „X Stunden pro Bürger:in pro Jahr für Dokumenten-Beschaffung" konnten wir **nicht finden** — `not found`.

#### 1b. Pain-Indikatoren auf System-Ebene

**eGovernment MONITOR 2025** (Initiative D21 + TUM, Erhebung Kantar, gefördert vom BMDS):[^1][^2]
- **12 %** stimmen zu, dass „der Staat den Alltag erleichtert" — der härteste Negativbefund der Studie.
- **61 %** wünschen primär „uncomplicated findability" der Verwaltungs­dienste.
- **55 %** wünschen „Vermeidung doppelter Dateneingaben" — das genaue Versprechen eines Tresors mit Once-Only.
- **59 %** empfinden Behördenkontakt als „sehr anstrengend".
- **51 %** halten unzureichende digitale Verwaltung für mit-ursächlich für sinkendes Staatsvertrauen.
- **33 %** Vertrauen in den Staat (2022: 38 %) — sinkend.
- **25 %** nutzen die Online-Ausweisfunktion (eID) — Voraussetzung für die meisten heutigen Behördenportale.

**INSM Behörden-Digimeter 2026**: nur **11 %** der OZG-Pflichtleistungen bundesweit digital nutzbar. (Bereits in Umzug-Recherche zitiert.)

**Konfidenz**: System-Pain ist hoch belegt; spezifischer „Dokumente-Pain" wird *abgeleitet* aus Findability- und Doppel-Eingabe-Indikatoren. Eine harte Volumen-Zahl ist `not found`.

#### 1c. Original vs. Beglaubigung vs. Kopie — die Verwirrungs-Achse

Die deutsche Verwaltungspraxis kennt drei Stufen, die Bürger:innen typischerweise verwechseln:

- **Original**: das ausgestellte Dokument selbst (z. B. Geburtsurkunde-Papierdokument vom Standesamt). Hat höchste Beweiskraft, kann nicht digital ersetzt werden, *außer* der Aussteller produziert ein digitales Original mit qeS (s. § 87a Abs. 4 AO für Steuerbescheide).[^21]
- **Amtliche Beglaubigung (§ 33 VwVfG)**: Eine Behörde bestätigt mit Beglaubigungsvermerk + Dienstsiegel + Unterschrift, dass eine Kopie mit dem Original übereinstimmt. „Jede Behörde ist berechtigt, Abschriften von Urkunden, die sie selbst ausgestellt hat, zu beglaubigen." Andere Urkunden dürfen Bürgerämter beglaubigen, wenn das Original von einer Behörde stammt oder die Kopie für eine Behörde benötigt wird.[^22] **Wichtig**: Standesämter haben *Sonderkompetenz* für Personenstandsurkunden; private Apps können das **nicht** ersetzen — hoheitliche Aufgabe.
- **Öffentliche Beglaubigung (§ 39a BeurkG, durch Notar)**: höhere Form, für gesellschaftsrechtliche Vorgänge, GmbH-Gründung, etc. Seit **29. Dezember 2025** sind Online-Beurkundungen / elektronische Präsenz-Beurkundungen über die **Notar-App der Bundesnotarkammer** möglich — ein wichtiger digitaler Meilenstein, aber *nicht* das, was unsere Demo zeigt.[^26]
- **Einfache (unbeglaubigte) Kopie**: die meisten Vorlagen im Alltag (Mietbewerbung, Personalakte) — Vermieter und Arbeitgeber akzeptieren typischerweise einfache Kopien.

**Implikation**: Eine Bürger-App kann *nicht* amtlich beglaubigen. Sie kann aber:
1. **Originale digital** anzeigen, *wenn* der Aussteller sie als digitales Original mit qeS ausgestellt hat (z. B. ELSTER-Bescheid mit qeS).
2. **Echtheit verifizieren**, wenn das Dokument einen VDS-QR-Code (BSI TR-03171, ZeSI) trägt (z. B. Hamburg-Meldebestätigung).
3. **Wallet-Attestationen weiterreichen**, wenn EUDI-Wallet 2027 + (Q)EAA / PuB-EAA produktiv sind.

Die App ist also *Aggregator + Verifier + Forwarder*, niemals *Beglaubiger*. Das ist die scharfe Linie, an die sich auch die Demo halten muss.

### 2. DE-Infrastruktur — was 2026 bereits real ist

#### 2a. ZeSI (Zentrale Siegelinfrastruktur) — der DE-Anker

**ZeSI mobile** (Bundesdruckerei GmbH, veröffentlicht 13. Mai 2025):[^3][^4]
- Kostenlose App für Bürger:innen, iOS + Android.
- Scannt **Visible Digital Seals (VDS)** — typischerweise als Data-Matrix- oder QR-2D-Barcode auf Verwaltungsdokumenten (digital als PDF *oder* gedruckt auf Papier).
- Implementiert **BSI TR-03171** „Optisch verifizierbarer kryptographischer Schutz von Verwaltungsdokumenten (Digitale Siegel)".
- Ergebnis: grün (echt + unverändert) / rot (manipuliert oder unbekannter Aussteller).
- Sicherheitsmechanismus: Dokument-Daten sind *im* VDS encodiert + durch elektronisches Siegel (eIDAS) signiert. Beweissicherheit der Herkunft.
- **Barrierefreiheit**: in Beratung mit Sozialhelden e.V. entwickelt — wichtig für unsere BITV-2.0-Konformität.

**Hamburger Meldebestätigung als Live-Anwendung** (ab 2025):[^4]
- Alle ~2.500 angeschlossenen Meldebehörden im EfA-eWA-Verbund stellen die digitale Meldebestätigung mit Data-Matrix-VDS aus.
- Workflow: Bürger:in meldet sich online um → erhält PDF mit Siegel → druckt aus *oder* leitet als Datei weiter → Empfänger (Bank, Vermieter, Arbeitgeber, Behörde) scannt mit ZeSI mobile → grün.
- Volumen: ~830 elektronische Anmeldungen/Tag, > 60 Mio. Bürger:innen abgedeckt.
- *Das ist die wichtigste real-existierende DE-Referenz für unsere Demo.*

**ZeSI generator + ZeSI ad** (geplant 2025, Stand Mai 2026 nicht alle Komponenten öffentlich verifiziert):[^3]
- **Generator**: für Behörden + Unternehmen, erstellt VDS auf Dokumenten.
- **Ad** (Auskunftsdienst): Datenbank mit Profilen + Zertifikaten für die Verifikation. Quasi PKI-Trust-Liste für VDS-Issuer.
- *Bemerkung*: Die spezifische Live-Verfügbarkeit von Generator und Ad zum Stichtag 8. Mai 2026 ist aus den verfügbaren Quellen nicht eindeutig ableitbar — `domain-expert validate` empfohlen.

**Implikation für Demo**: ZeSI ist *der* DE-Standard für Echtheitsprüfung 2025–2027. Unsere Demo soll deshalb VDS-QR-Codes auf den Mock-Bescheiden zeigen + einen Mock-Verify-Workflow simulieren („so würde die ZeSI-Prüf-App das scannen"). Wir simulieren *nicht* echte Bundesdruckerei-Schlüssel — nur die UX-Konvention. Der Mock-Watermark `[MOCK]` bleibt sichtbar.

#### 2b. § 87a Abs. 4 AO + qeS — der elektronische Bescheid mit Beweiskraft

**Rechtsmechanik**:[^21]
- § 87a Abs. 4 AO (gespiegelt zu Abs. 3 für umgekehrte Richtung): „Eine durch Gesetz für Verwaltungsakte oder sonstige Maßnahmen der Finanzbehörden angeordnete Schriftform kann, soweit gesetzlich nicht etwas anderes bestimmt ist, durch die elektronische Form ersetzt werden. Der elektronischen Form genügt ein elektronischer Verwaltungsakt, der mit einer qualifizierten elektronischen Signatur oder einem qualifizierten elektronischen Siegel versehen ist."
- Heißt: Ein digital ausgestellter Steuerbescheid ist Schriftform-äquivalent, wenn das Finanzamt eine **qeS** (qualifizierte elektronische Signatur) oder ein **qualifiziertes elektronisches Siegel** anbringt. Mein-ELSTER-Bescheide tragen typischerweise diese Siegel.[^17]
- § 36a SGB I + § 3a VwVfG sind die Pendants im Sozialrecht / allgemeinen Verwaltungsrecht.[^27]
- **Seit 1. Januar 2024** kann die Schriftform zusätzlich über **beA** (besonderes elektronisches Anwaltspostfach) ohne qeS ersetzt werden — irrelevant für Bürger:innen direkt, aber relevant, wenn Anwält:innen für Bürger:innen Schriftsätze einreichen.[^27]

**Implikation für Tresor**: Wenn die App einen elektronischen Steuerbescheid speichert, sollte sie sichtbar machen, dass dieser eine qeS trägt — z. B. mit einem Badge „qeS verifiziert (eIDAS-konform)". Beim Export kann der PDF *mit* qeS weitergegeben werden — die Empfänger-Seite kann es dann selbst gegen die EU-LotL (List of Trusted Lists) prüfen.

#### 2c. Mein ELSTER Bescheid-Speicher — ein Silo, das wir spiegeln müssen

[^17][^28]
- ELSTER hat eigenen Posteingang, in dem PDF-Bescheide **180 Tage** abrufbar sind; nach Abruf weitere **60 Tage**; ohne Abruf werden sie nach 180 Tagen gelöscht.
- Bürger:innen müssen den Bescheid selbst **lokal speichern**, wenn sie ihn länger benötigen.
- Ab **1. Januar 2027** (DIVA-Programm) wird die elektronische Bereitstellung **opt-out** statt heute opt-in: Steuerbescheide kommen automatisch elektronisch, sofern Bürger:in nicht aktiv widerspricht.
- **Aufbewahrungspflicht für Privatpersonen**: *keine gesetzliche Pflicht*. Steuerexperten empfehlen 6 Jahre (Festsetzungsverjährung § 169 Abs. 2 AO). 10 Jahre sind die Pflichtfrist nach § 147 AO / § 257 HGB für **Unternehmer**, nicht für Privatpersonen.[^29]

**Implikation**: Ein Tresor löst das ELSTER-180-Tage-Problem indirekt — Bürger:in lädt Bescheid einmal aus ELSTER runter, legt ihn im Tresor ab, hat ihn dort jahrzehntelang inkl. qeS-Validation und Frist-Tracking.

#### 2d. BundID-Postfach + ZBP — Bescheid-Zustellung, aber kein „Tresor"

[^18][^30]
- BundID hat integriertes Postfach (Zentrales Bürgerpostfach, ZBP), in dem Behörden Bescheide rechtssicher zustellen können (mit Einwilligung der Bürger:in).
- Funktion „bereits eingereichte Anträge, empfangene Nachrichten und digitale Dokumente einsehen + speichern" ist beschrieben.
- **Aufbewahrungs-Frist im ZBP** ist nicht öffentlich klar dokumentiert (Stand Mai 2026) — `not found` mit `domain-expert validate` empfohlen.
- ZBP ist *kein* Tresor im Sinne „organisiere meine eigenen Dokumente in Mappen, exportiere als QR-Card, teile zeitlich begrenzt mit Vermieter": es ist ein **Eingangspostfach**.
- **Bidirektionalität (Rückkanal)** ist erst für **Juli 2026** geplant (BMDS-Roadmap, bereits in Posteingang-Recherche zitiert).

**Implikation**: Tresor ist *parallel* zu ZBP, nicht *Konkurrenz*. ZBP ist der Eingang; Tresor ist die persönliche Ablage + Export-Schicht.

#### 2e. eAT — die Karte selbst transportiert wenig

[^24]
- Plastik-Karte mit Chip; speichert Personenstammdaten, biometrische Merkmale, Nebenbestimmungen.
- Adresse: nicht auf dem Chip aktualisierbar bei Umzug — wird über **Adress-Aufkleber** auf der Kartenoberfläche realisiert (analog zum dt. Personalausweis); Aufkleber wird beim Bürgeramt nach Anmeldung am neuen Wohnort angebracht.
- Online-Ausweisfunktion: identisch zum eID-Pattern (BSI-Pattern). Pseudonym-Funktion analog § 9 PAuswG (s. unten 2g).
- PIN-Brief separat zur Karte versendet.
- **Implikation**: Im Tresor ist „mein eAT-Aufkleber-Foto + meine PIN-Quittung + meine ABH-Erteilungsbescheid-PDF" eine sinnvolle Bündelung. Anna wäre die Persona-Demo.

#### 2f. eGK + Krankenversicherungsbescheinigung

[^23]
- Elektronische Gesundheitskarte (eGK) ist physisch; ab Generation G2/G2.1 mit NFC für ePA / E-Rezept.
- **Versicherungsbescheinigung allgemein** kann typischerweise in Krankenkassen-App (z. B. „Meine AOK", TK-App) generiert werden — als PDF-Download.
- **Elektronische Ersatzbescheinigung (eEB)** ersetzt vorübergehend die Karte, wenn diese nicht zur Hand.
- Heute: jede Kasse hat eigene App, kein Cross-Kassen-Standard.
- **Implikation**: Tresor importiert Krankenversicherungs-PDFs aus Kassen-App; in 2027 könnte die EUDI-Wallet eine standardisierte „Mitgliedschaftsbescheinigung-EAA" enthalten (NOBID/POTENTIAL-LSP-Inspiration).

#### 2g. Pseudonyme Authentifizierung (§ 9 PAuswG)

[^31]
- **Diensteanbieter- und kartenspezifisches Kennzeichen**: kryptographisch abgeleiteter String, der pro Diensteanbieter einmalig ist. Re-Identifikation des/r selben Bürger:in beim selben Anbieter möglich, **Cross-Anbieter-Profilbildung verhindert**.
- Anbieter muss eine BfJ-Berechtigung (Berechtigungs-CA) haben, um die Pseudonym-Funktion lesen zu dürfen.
- Pattern: „Login mit eID, ohne Klarnamen-Übermittlung".
- **EUDI-Pendant**: SD-JWT-VC mit Pseudonym-Attribut; in EUDI-ARF v2.6.0 als optionales Pattern unterstützt. Selective Disclosure ist die Verallgemeinerung.[^10]
- **Implikation für Tresor-Export**: „nur age_over_18, nicht Geburtsdatum" + „nur Gemeinde, nicht volle Adresse" + „nur ABH-Status: gültig, nicht Aktenzeichen" sind die UX-Patterns für Vermieter-/Arbeitgeber-Demos.

### 3. EUDI-Wallet — speculative-2027 zweite Schicht

#### 3a. eIDAS-2-Verordnung 2024/1183 + Implementing Acts 2025/2026

[^7][^8]
- Verordnung **(EU) 2024/1183** veröffentlicht **30. April 2024**, in Kraft **20. Mai 2024**.
- Member States müssen **bis 31.12.2026** mindestens eine EUDI-Wallet bereitstellen (24 Monate ab Inkrafttreten der ersten Implementing Acts; diese kamen am 4. Dezember 2024 → Frist Ende Dezember 2026).
- **Mandatory Acceptance** durch Banken, Telcos, VLOPs (Very Large Online Platforms / Gatekeeper) etc. **bis Ende 2027**.
- Implementing Regulations 2025: **CIR 2025/1569** (QEAA/EAA von Public Sector Bodies), **2025/1570** (QSCD-Notifikation), **2025/1571** (annual reports), **2025/1572** (qualified trust services initiation), **2025/1929** (qualified electronic time stamps), **2025/1942** (qualified validation services for QES + Q-Seals), **2025/1943** (reference standards QES certificates), **2025/1946** (referenced in ARF v2.6.0).[^32]

#### 3b. ARF v2.x — Attestations-Topologie

EUDI-ARF v2.6.0 (Stand 2026) standardisiert:[^10][^33]

| Attestation-Typ | Aussteller | Beispiele |
|---|---|---|
| **PID** (Person Identification Data) | Member-State-zertifizierte PID-Provider | Vorname, Nachname, Geburtsdatum, Geburtsort, Staatsangehörigkeit, ggf. Adresse — in DE ausgestellt durch Staat, gestützt auf Personalausweis-Daten |
| **QEAA** (Qualified Electronic Attestation of Attributes) | Qualified Trust Service Provider (QTSP) | rechtsäquivalent zu Papier-Attestaten, höchste Beweiskraft |
| **PuB-EAA** (Public-Body Authentic-Source EAA) | öffentliche Stelle, die selbst eine authentische Quelle führt | Meldebehörde → Adress-Attestation, Standesamt → Personenstand-Attestation, ABH → Aufenthaltsstatus-Attestation, Finanzamt → Steueridentifikations-Attestation, KFZ-Stelle → Halter-Attestation |
| **EAA** (non-qualified Electronic Attestation of Attributes) | beliebige Anbieter | Hochschule → Studienbescheinigung, Arbeitgeber → Beschäftigungs-EAA, Verein → Mitgliedschaft |

**Pflicht-Formate** (mandatiert in CIR 2024/2980 und ARF v2.x):[^9][^34]
- **mDoc** (ISO/IEC 18013-5): Pflicht. Optimiert für Proximity-Präsentation (NFC, BLE, QR), offline-fähig. Ursprünglich aus Mobile-Driving-License-Standard.
- **SD-JWT VC** (IETF Draft draft-ietf-oauth-sd-jwt-vc): Pflicht. Optimiert für Online-Präsentation, web-protokoll-freundlich, Selective Disclosure als Erst-Klasse-Feature.
- **W3C VC Data Model v2.0**: optional, nur für non-qualified EAAs erlaubt. **Nicht** für PID / QEAA / PuB-EAA.

#### 3c. Selective Disclosure — UX-Pattern

[^35]
- **age_over_18 statt birth_date**: Wallet erzeugt kryptographischen Beweis „Bürger ist über 18", ohne Geburtsdatum zu offenbaren. Verifier sieht *nur* den Booleschen Beweis.
- **Postleitzahl statt voller Adresse** für Vermieter, Versicherer.
- **Aufenthalts-Status: gültig (ja/nein) + gültig bis: TT.MM.JJJJ** statt komplette eAT-Kopie + Aktenzeichen + § 18g AufenthG-Detail.
- UX-Flow Standard: (1) Verifier zeigt QR-Code („ich brauche age_over_18") → (2) Bürger:in scannt mit Wallet → (3) Wallet zeigt „Diese Daten werden geteilt: age_over_18 = true" → (4) Bürger:in bestätigt mit PIN/Biometrie → (5) Verifier erhält cryptographic proof + verifiziert über Trust-List.
- **Privacy-by-design**: Verifier erfährt nicht mehr als nötig; Wallet-Provider erfährt nicht, *welcher* Dienst nachfragt (Unobservability — eIDAS 2 Art. 5a Abs. 14).

#### 3d. Large-Scale-Pilots — was funktioniert hat

[^36][^37]
- Vier Konsortien (2023–2025), > 550 Organisationen, 26 EU-Mitgliedstaaten + Norwegen, Island, Ukraine, > 46 Mio. € EU-Förderung. Final Reports Januar 2026 (Meeco Report).
- **POTENTIAL**: 6 Sektoren — government, banking, telco, mDL, eSignature, health.
- **EWC** (EU Wallet Consortium): Digital Travel Credentials, EU-internal travel.
- **NOBID** (Nordic-Baltic + Italy + Germany): Payment-Authorization mit Wallet (zahlungsauslösender Faktor).
- **DC4EU**: Education + Social Security cross-border (z. B. portable EU-Studienbescheinigung).
- Validated Formats: SD-JWT VC + mDL + ausgewählte W3C-VC-Profile (für EAAs).

#### 3e. DE-EUDI-Wallet — Stand Mai 2026

[^6][^38]
- BMDS + SPRIND treiben Wallet voran; Bundesdruckerei in interdisziplinärem Team.
- **Sandbox**: Anfang 2026 für PID-Tests gestartet; 2026er-Erweiterung um (Q)EAA-Tests.
- **Public Launch Stufe 1: Anfang 2027** geplant (digitaler Personalausweis + erste Credentials wie Führerschein).
- Marktreife / Rollout: Frühjahr 2027.
- Verimi und ggf. weitere private Wallet-Hersteller arbeiten parallel an interoperablen Lösungen mit EUDI-Gateway.[^19]

**Implikation**: Demo positioniert sich **ehrlich** — „so wäre 2027 die Realität". Wir simulieren PID-Login, PuB-EAA-Bescheinigung-Storage und Selective-Disclosure-Export. Aber wir markieren klar, dass DE-EUDI-Wallet zum Demo-Zeitpunkt im Sandbox-Status ist.

### 4. QR-Verifikations-Pattern und Trust-Architekturen

#### 4a. ZeSI (DE) — bereits oben in 2a beschrieben

#### 4b. Apple Wallet ID / mDL (USA) — produktive 4-Jahres-Erfahrung

[^14][^39]
- 14 US-Bundesstaaten + Puerto Rico (Stand Q1 2026): Maryland (Mai 2022, erste), Colorado (2022), Georgia (2023), Hawaii, Iowa, California, Illinois, West Virginia (Oktober 2025) etc.
- Akzeptiert an > 250 TSA-Flughäfen.
- **Trust-Architektur**: ISO 18013-5 mDoc, signiert vom State DMV, validiert durch TSA-Reader gegen DMV-CA-Trust-List.
- **Privacy-Pattern**: Face/Touch-ID vor jeder Präsentation; Selective Disclosure (age_over_21 für Bars; Birthdate-only für Pharma; volle Daten für TSA).
- **Erfahrung**: hohe Akzeptanz; Adoption-Limit ist *State-Issuance*, nicht Bürger-Akzeptanz.

#### 4c. DigiLocker (Indien) — Massen-Tresor-Beweis

[^11][^40][^41]
- Aug 2025: ~570 Mio. Nutzer, ~9,9 Mrd. Dokumente, 1.936 Issuers + 2.407 Requesters.
- Aadhaar-Integration: Bürger linkt Aadhaar (mit OTP-bestätigter Mobilnummer); UIDAI stellt digitales Aadhaar automatisch in DigiLocker bereit.
- **Share-Pattern**: zeitbeschränkter Link oder QR-Code; Empfänger validiert per QR-Scan in der DigiLocker-App oder über Verify-Portal (`verify.digilocker.gov.in`).
- **Verifikation**: Digital Signature (PDF) ODER QR-Scan in App ODER Online-Verify-Utility.
- **Lehre**: ein einziger Tresor mit ~ 2.000 Issuers ist staatlich machbar, wenn der Issuer-Onboarding-Prozess standardisiert ist (DigiLocker hat XML-Schema für Issuer-Connect).
- **DE-Übertragbarkeit**: technisch ja; politisch braucht es eine Trägerinstanz (BMDS / Bundesdruckerei). Kein DigiLocker-Pendant existiert in DE Mai 2026.

#### 4d. Estland — Eesti-App + EUDI-Wallet

[^12][^42]
- Estonian ID-Card seit 2002 (digital signature seit 2002).
- **Eesti-App** (2025): bündelt Personalausweis, Pass, Führerschein als digitale Originale. Citizen-controlled, RIA-betrieben.
- **EUDI-Wallet**: Estland baut auf Eesti-App auf, RIA verantwortlich.
- 600+ e-Services für Bürger, 2.400+ für Unternehmen.
- **Trust-Pattern**: X-Road als Daten-Bus; Bürger sieht in `eesti.ee/data-tracker` jede Behörden-Abfrage seiner Daten.
- **DE-Übertragbarkeit**: X-Road-Pendant ist *FIT-Connect + IDA + Datenschutzcockpit* — bereits konzeptionell aufgesetzt durch RegMoG.

#### 4e. Singapur — SingPass App + MyInfo

[^13]
- > 4,2 Mio. Nutzer:innen der SingPass-App (von ~5,9 Mio. Bevölkerung).
- **MyInfo**: Pre-Fill-Service. Bürger:in stimmt einmal zu, Daten fließen in Antragsformulare.
- **App-Funktionen**: Login, Identitätsnachweis am Schalter, digitale Unterschrift, Profil mit CPF-Saldo, Pass-Nr., HDB-Details immer abrufbar.
- *Kein* expliziter „MyDocs"-Tab gefunden; Ablage ist eher Profil + Pre-Fill als Mappen-Tresor.
- **Lehre**: Profil-zentriertes Pattern (Stammdaten + abgeleitete Werte), nicht Mappen-zentriert. Komplementär zu DigiLocker.

#### 4f. Dänemark — MitID + Digital Post

[^15]
- **MitID**: nationaler eID, Pflicht für Erwachsene; Login + qualified electronic signature.
- **Digital Post**: Multi-Plattform (borger.dk, e-Boks, mit.dk, App) — alle 4 sehen *gleichen* Posteingang. Synchronisiert bidirektional.
- **Mit Overblik**: Citizen-Übersicht über die eigenen Daten in öffentlichen Datenbanken.
- *Kein* expliziter „Document Folder", aber Digital-Post ist *de facto* Tresor — alle Behördenpost ist dort und bleibt dort.
- **Lehre**: Multi-Plattform-Synchronität ist Erwartungs-Norm in DK; eine Einzel-App wäre dort unter-engineered.

#### 4g. SCHUFA-BonitätsCheck + ImmoScout24 — DE-natives QR-Scan-Pattern

[^16][^43]
- Bürger:in zahlt 29,95 € (Stand Q4 2025) und erhält PDF + Verifikations-Code.
- Vermieter prüft Code auf SCHUFA-Webseite — 60 Tage gültig.
- **Pattern-Wert**: das ist exakt das UX-Muster, das wir für unseren Tresor-Export brauchen — *zeitbeschränkte Verify-Links*. SCHUFA ist privatwirtschaftlich, aber das UX-Mental-Model „QR scannen, online prüfen, kommt grün" ist im DE-Markt etabliert.

### 5. Datenschutz, Aufbewahrung, Löschung

#### 5a. Aufbewahrungsfristen für Privatpersonen

[^29][^44]
- **Privatpersonen**: keine gesetzliche Pflicht, Bescheide aufzubewahren. Empfehlung Steuerexperten: 6 Jahre (Festsetzungsverjährung § 169 Abs. 2 AO; 10 Jahre bei grober Fahrlässigkeit / Steuerhinterziehung).
- **Selbstständige + Kaufleute**: 10 Jahre nach § 147 AO + § 257 HGB für Buchhaltungs-Unterlagen, 8 Jahre für Buchungsbelege (seit 2025), 6 Jahre für Geschäftsbriefe.
- **Mietverträge**: während Laufzeit + 3 Jahre (Verjährungsfrist mietrechtlicher Ansprüche).
- **Schulzeugnisse**: lebenslang relevant für Bewerbungen.
- **Geburtsurkunden**: lebenslang; jederzeit beim Standesamt neu beziehbar (Geburtsurkunde altert nicht).

**Implikation**: Tresor-Default „lebenslang aufbewahren" ist für die meisten Privat-Dokumente angemessen; nur Zeit-begrenzte Bescheinigungen (SCHUFA: 60 Tage; Krankenversicherungs-Bescheinigung: rolling) sollten auto-archivieren.

#### 5b. DSGVO Art. 17 — Recht auf Löschung mit Ausnahmen

[^45]
- Art. 17 Abs. 1: Bürger:in hat Anspruch auf unverzügliche Löschung, wenn Daten nicht mehr erforderlich, Einwilligung zurückgezogen, unrechtmäßig verarbeitet etc.
- Art. 17 Abs. 3 lit. e: Ausnahme „zur Geltendmachung, Ausübung oder Verteidigung von Rechtsansprüchen" — d. h. Behörden-Bescheide als Beweismittel sind *nicht* löschbar, solange Rechtsanspruch besteht.
- Art. 17 Abs. 3 lit. b: Ausnahme „zur Erfüllung einer rechtlichen Verpflichtung" oder „Wahrnehmung einer Aufgabe im öffentlichen Interesse oder in Ausübung öffentlicher Gewalt" — schützt Behörden-Akten in der ausstellenden Behörde.

**Implikation für Tresor**: Bürger:in kann *im eigenen Tresor* jederzeit löschen — die App speichert privat, Art. 17 erlaubt das *gegen den App-Anbieter* uneingeschränkt. Aber: das Original im *amtlichen* Postfach (ZBP, ELSTER) bleibt unter Art. 17 Abs. 3 lit. b *nicht* automatisch löschbar.

#### 5c. Verschlüsselung at rest — BSI TR-02102-1

[^46]
- Aktuelle Version: **BSI TR-02102-1 Version 2026-01**.
- AES-256 / AES-128 (mit zugelassenen Block-Modi wie GCM, EAX, CCM) sind empfohlen.
- TLS 1.3 für Transport (TR-02102-2 Version 2025-x).
- **Implikation für Tresor**: Mock-Backend speichert in `localStorage` (das ist Konvention der Demo, nicht ernsthaft); für die Speculative-2027-Architektur-Doku der echten Implementierung ist BSI TR-02102-1 + Wallet-Hardware-Backed-Keystore (Secure Enclave / Strongbox) die richtige Begründung.

#### 5d. Kirchensteuer / Religion — Art. 9 DSGVO

(In Posteingang-Recherche bereits dokumentiert; relevant für Tresor weil:) Steuerbescheide zeigen Kirchensteuer-Anteile, was Religion impliziert (Art. 9). Im Tresor sind sie, wenn lokal verschlüsselt, kein Verarbeitungs-Problem für die App; bei Cloud-Backup würde Art. 9 Abs. 2 lit. a Einwilligung greifen müssen.

### 6. Whitespace-Analyse DE Mai 2026

| Player | Anteil der Tresor-Funktion abgedeckt |
|---|---|
| **BundID-ZBP** | Eingangspostfach für Bundes-/Landes-/Kommunalbescheide. Kein Mappen-System, kein Export-Workflow, kein QR-Verify im Bürger-UI. |
| **Mein ELSTER Posteingang** | Steuer-only. 180-Tage-Limit. PDF-Download, Bürger:in selbst speichern. |
| **Krankenkassen-Apps (TK, AOK, Barmer …)** | Krankenkassen-only. Versicherungsbescheinigungen + eEB. Kein Cross-Player-Export. |
| **Bundesdruckerei ZeSI mobile** | Verifikations-App, kein Speicher. |
| **eAT-App / AusweisApp2** | Pseudonyme Auth, Online-Ausweisfunktion. Kein Dokumenten-Speicher. |
| **Verimi ID-Wallet** | Privatwirtschaftlich; KYC-fokussiert (Bank, Versicherung, Telco-Onboarding). Hat Wallet-Approach, aber nicht Behörden-Bescheid-Tresor. EUDI-Gateway.[^19] |
| **Yoti, Polyteia** | Polyteia ist B2G für Kommunen (Datenanalyse), kein B2C-Wallet — `not found` als Tresor-Player. Yoti hat Wallet-Approach, aber DE-Adoption marginal — `not found` als breit-relevanter DE-Aggregator. |
| **Caya, Briefbutler, Dropscan** | Brief-Scanning-Service (in Posteingang-Recherche zitiert). Kein Behörden-Aggregator. |
| **Schweden BankID, Niederlande DigiD, Dänemark MitID** | nationale eID, kein DE-Player. |
| **DigiLocker (IN), Apple Wallet ID (US), Eesti-App (EE)** | int. Vorbilder; kein DE-Pendant. |

**Verdict**: Mai 2026 gibt es in DE **kein** Consumer-Tool, das *alle eigenen Behörden-Dokumente in einem Tresor* sammelt, organisiert, QR-verifizierbar exportiert. Das ist die echte Whitespace-Position. Ab 2027 wird die EUDI-Wallet ein Teil davon — aber sie ist Wallet (Credential-Träger), nicht Mappen-Aggregator.

### 7. Demo-relevante UX-Entscheidungen

| Frage | Empfehlung | Begründung |
|---|---|---|
| Original-PDF + beglaubigte Kopie generieren? | **Original-Anzeige ja, beglaubigte Kopie NEIN** — App zeigt „Beglaubigte Kopie kann nur durch Behörde / Bürgeramt / Notar erstellt werden — hier finden Sie Ihr Bürgeramt" + Online-Termin-Link. | § 33 VwVfG ist hoheitlich; private App darf das nicht ersetzen. Plain Information ist Smartlaw-konform. |
| QR-Code-Verifikation funktional in Demo (Browser camera) oder als Konvention markiert? | **Hybrid**: ein Mock-VDS-QR-Code wird auf jedem Bescheid angezeigt + Demo-Verify-Page „so würde ZeSI mobile das prüfen". Browser-Camera-Scan in der eigentlichen Demo nicht zwingend (Vermieter-Demo kann ein Mock-Verifier-View sein). | Realismus + Demo-Komplexität-Balance. ZeSI-Pattern als Vorbild. |
| EUDI-Wallet-Export-Button — was simuliert er? | **Selective-Disclosure-Dialog** zeigt: welche Attribute werden geteilt? An wen? Auf welcher Rechtsbasis? Mit welcher Gültigkeitsdauer? Dann „PIN bestätigen" + animierter QR-Code für den Verifier. | Spiegelt EUDI-LSP-Demo-Pattern (POTENTIAL/EWC-Verifier-App). UX-Goldstandard für Datenminimierung. |
| Vermieter-Verifizierung simulieren? | **Ja, als zweite Demo-Persona** — „Vermieter-View" zeigt eingehenden QR-Scan + welche Felder enthüllt + Echtheit grün/rot. | Erzählerisch wertvoll für die Demo: zeigt nicht nur das Ich-Eigentümer-, sondern auch das Verifier-Pattern. Zwei-Persona-Storytelling. |
| Mappen-Logik | **„Lebenslagen + Auto-Tag"** — Mappen wie „Identität", „Wohnen", „Arbeit", „Steuer", „Gesundheit", „Familie", „Mobilität" + Auto-Zuordnung beim Import. Vorgang-zentriertes Threading wie im Posteingang nutzen — `Document.vorgang_id` als optionaler Schlüssel. | Citizen-Mental-Model passt zu Lebenslagen, nicht zu Behörden-Hierarchie. Spiegelt das Posteingang-Vorgang-Pattern. |
| Default-Aufbewahrung | **„immer behalten"** + Frist-Chip für ablaufende Dokumente (SCHUFA 60 Tage, eAT-Card 10 Jahre, …). | Privatpersonen haben keine Aufbewahrungspflicht; aber Frist-Tracking ist UX-Mehrwert. |
| Cloud-Backup vs. lokal | **lokal** (`localStorage`), kein Backend für die Mock-Demo. „Erinnerung: in einer echten Implementierung würde Daten end-to-end verschlüsselt gespeichert (BSI TR-02102-1 / AES-256)." | DSGVO Art. 9 wäre für Cloud-Backup ein eigenes Datenschutz-Kapitel; Demo umgeht es sauber. |

### 8. Implications for our demo

- **Hero-Workflow**: ein Tresor mit 7 Lebenslagen-Mappen, vorgefüllt mit ~12–15 Mock-Dokumenten pro Persona. Jedes Dokument hat: Mock-VDS-QR-Code, qeS-Badge (wenn Behörden-PDF), Frist-Chip (wenn ablaufend), Aussteller-Info, „Teilen via EUDI-Wallet"-Button, „Echtheit prüfen"-Button.
- **Speculative-2027-Markierung**: jeder EUDI-Wallet-Export-Screen zeigt einen klaren Hinweis-Banner: *„Vorschau 2027 — die deutsche EUDI-Wallet befindet sich Mai 2026 in der Sandbox-Phase."* + Link zu BMDS-Quelle. Demo lügt nicht.
- **Verifier-Demo als zweite Persona-View**: ein „Vermieter-Modus" oder „Arbeitgeber-Modus", in dem die App zur Verify-App wird und einen geteilten QR scannt. Zeigt Cross-Side des Patterns.
- **Privacy-Cockpit**: Tab `/datenschutz` zeigt für jeden Export: was wurde geteilt, mit wem, wann, auf welcher Rechtsbasis (PuB-EAA, Selective Disclosure SD-JWT VC, …), mit welcher Widerrufs-Option. Spiegelt Estland-X-Road- und Datenschutzcockpit-Pattern.
- **a11y**: ZeSI-Pattern ist mit Sozialhelden e.V. entwickelt; wir spiegeln das (TalkBack/VoiceOver-Tests, hoher Kontrast, klare Mappen-Labels in B1-Sprache).
- **Original-Anzeige**: jedes Dokument ist primär *als PDF* sichtbar (echtes Dokument), darüber AI-Summary-Card (analog Posteingang-Pattern). Original ist *immer* einen Klick weg.
- **„Beglaubigung benötigt?"-Hinweis-Pattern**: wenn Bürger:in Bescheid „beglaubigt teilen" will, leitet die App zum Online-Bürgeramt-Termin oder Notar-App weiter. Wir behaupten *nicht*, beglaubigen zu können.
- **eID-Pseudonym vs. EUDI-SD**: bei Login mit eID dem Bürger:innen erklären, dass ein dienste-spezifisches Pseudonym verwendet wird — Cross-Site-Profilbildung verhindert. Das ist Trust-Architektur, die heute schon real existiert (PAuswG § 9), nicht Speculative.
- **Personas-Hooks**: Anna braucht eAT-Bescheid + ABH-Erteilungsbescheid + Krankenversicherungsbescheinigung griffbereit (Aufenthaltsverlängerung); Familie Schmidt braucht Geburtsurkunden der Kinder + Familienkasse-Bescheid + Schul-Anmeldung; Mehmet braucht Gewerbeanmeldung + IHK-Mitgliedsbescheinigung + Steuerbescheid.

### 9. Disagreement-prone areas to flag for domain-expert

Die folgenden 5 Punkte sind die wahrscheinlichen Reibungspunkte zwischen research-scout-Vorschlag und domain-expert-Realismus-Filter. Sie sollten *vor* concept-verifier-Adversarial-Review explizit geklärt werden:

1. **DISAGREEMENT (likely): „Wir generieren beglaubigte Kopien"-Funktion** — research-scout schlägt vor, *keine* Beglaubigungs-Funktion in der App zu zeigen. domain-expert wird vermutlich dafür plädieren, im Gegenteil sehr deutlich darauf hinzuweisen, dass nur Bürgerämter / Standesämter / Notare nach § 33 VwVfG / § 39a BeurkG amtliche Beglaubigung leisten dürfen. Die Demo soll *aktiv* zum Bürgeramt-Termin oder Notar-App durchverlinken, statt eine eigene Funktion zu suggerieren. **Beide Positionen führen zum gleichen UX-Ergebnis**, aber die Begründung ist klärungsbedürftig.
> **domain-expert 2026-05-08:** Adjudikation in `docs/domain/dokumente.md` Abschnitt 10 #1. **Bestätigt — keine eigene Beglaubigungs-Funktion.** Wortlaut § 33 Abs. 1, 2, 4 VwVfG belegt: Beglaubigungs-Befugnis ist hoheitlich; Beglaubigungs-Vermerk verlangt Dienstsiegel + Unterschrift des zuständigen Bediensteten (bzw. qeS / qualifiziertes Siegel + Behörden-Eigenschaft iSv § 1 Abs. 4 VwVfG). Private App erfüllt diese Voraussetzungen nicht. UX-Pattern: Deep-Link zu Bürgeramt-Termin / Standesamt-Termin / Notar-App der BNotK statt eigener Button.

2. **DISAGREEMENT (technisch, mittel): „QR-Code auf jedem Mock-Bescheid"** — research-scout schlägt vor, einen Mock-VDS-Code auf *jedem* Bescheid in der Demo zu zeigen, weil ZeSI mobile sowieso 2025+ produktiv ist. domain-expert könnte einwenden: heute (Mai 2026) trägt nicht jeder Behörden-Bescheid einen VDS — nur Hamburger eWA-Meldebestätigungen + ggf. einige andere Pilotanwendungen. Konsequenz: die Demo soll bei Bescheiden ohne VDS-Realität (z. B. Geburtsurkunde, ABH-Bescheid) den QR-Code als „Speculative 2027 — gemäß ZeSI-Roadmap" markieren, nicht universal. concept-verifier soll prüfen, ob die Differenzierung deutlich genug.
> **domain-expert 2026-05-08:** Adjudikation in `docs/domain/dokumente.md` Abschnitt 10 #2. **Differenziert.** UI zeigt zwei Authentizitäts-Badges: (a) „VDS prüfbar mit ZeSI mobile" (BSI TR-03171, Data-Matrix mit eingebetteten Daten + Signatur) — produktiv für Hamburg-eWA + flächendeckend RP/SH; speculative für Berlin/München-eWA, Geburts-/Eheurkunde, ABH-Bescheid; (b) „qeS gültig — eIDAS" (PAdES-Inline-Signatur am PDF, validiert gegen EU-LotL) — produktiv für Mein-ELSTER-Steuerbescheide, BfJ-Führungszeugnis. Kein universal-VDS-Pattern; pro Dokument-Typ Status-Marker (siehe Tabelle).

3. **DISAGREEMENT (rechtlich, mittel): „Verifizierte Kopie" via Wallet-Attestation** — research-scout schlägt vor, dass Bürger:in via EUDI-Wallet eine PuB-EAA „Aufenthaltsstatus = gültig" generiert und an Vermieter teilt. domain-expert könnte einwenden: PuB-EAAs in DE setzen voraus, dass die jeweilige Behörde (hier: ABH) als authentic source angeschlossen ist und kryptographische Trust-Anchors veröffentlicht. Stand Mai 2026 ist *keine* DE-Behörde live als PuB-EAA-Issuer (Sandbox-Phase). Demo muss klar 2027-speculative markieren, nicht „so funktioniert das schon heute".
> **domain-expert 2026-05-08:** Adjudikation in `docs/domain/dokumente.md` Abschnitt 10 #3. **Bestätigt — Sandbox-Phase, kein produktiver PuB-EAA-Issuer in DE Mai 2026.** BMDS-Quelle direkt: PID-Tests laufen, EAA-Tests im Verlauf 2026 erweitert; Public-Launch Stufe 1 Anfang 2027. Konkrete öffentliche Liste angeschlossener PuB-EAA-Issuer existiert Mai 2026 nicht. Jeder Wallet-Export-Workflow trägt das `dokumente.disclaimer.eudi_speculative`-Banner.

4. **DISAGREEMENT (UX, mittel): Multi-Plattform-Erwartung** — research-scout schlägt eine eigene App vor (analog DigiLocker, Eesti, Apple Wallet). domain-expert könnte einwenden: in DE ist die Zwei-Welten-Realität (BundID-ZBP für Eingang, AusweisApp / EUDI-Wallet für Identitäts-Funktion, ELSTER für Steuer) bereits etabliert — eine *vierte* App birgt Adoption-Risiko. Alternative: Tresor als *Modul* innerhalb BundID/DeutschlandID (analog Mit-Overblik in DK). concept-verifier soll prüfen, ob die Demo realistische DE-Marktposition annimmt oder auf grüner-Wiese-Annahme beruht.
> **domain-expert 2026-05-08:** Adjudikation in `docs/domain/dokumente.md` Abschnitt 10 #4. **Standalone für die Demo, mit klar artikulierter Modul-Vision für 2027.** Begründung: politisch-strategisch ist Modul innerhalb DeutschlandID das realistische 2027-Zielbild; demo-strategisch ist Standalone besser, weil End-to-End-Erlebnis isoliert vom heutigen BundID-Funktionsstand zeigbar ist. UI zeigt prominent „Verbunden mit DeutschlandID"-Statuszeile (Mock + Disclaimer); Architektur-Doku benennt Modul-Re-Integration als 2027-Vision.

5. **DISAGREEMENT (privacy, niedrig-mittel): „Tresor-Cloud-Backup für End-User"** — research-scout schlägt für die echte Implementierung Cloud-Backup mit BSI-TR-02102-konformer E2E-Verschlüsselung vor. domain-expert könnte einwenden: Art. 9 DSGVO-Gehalt (Religion via Kirchensteuer, Sozialdaten in Bürgergeld-Bescheiden) plus Beweismittel-Verantwortung machen Cloud-Backup zu einem rechtlich heiklen Feature, das in der Mock-Demo besser *gar nicht* angedeutet werden soll. Empfehlung: Demo bleibt bei localStorage; Architektur-Dokument zeigt 2027-Speculation neutral.
> **domain-expert 2026-05-08:** Adjudikation in `docs/domain/dokumente.md` Abschnitt 10 #5. **Bestätigt — `localStorage`-only in Demo, kein Cloud-Backup-Hinweis in UI.** Tresor-Inhalte enthalten Art.-9-DSGVO-Daten (Religion via Kirchensteuer, Sozialdaten § 67 SGB X, indirekte rassisch/ethnische Daten via Aufenthaltsstatus, Gesundheitsdaten via Reha-/AU-Bescheid). Cloud-Speicherung erfordert ausdrückliche Einwilligung Art. 9 Abs. 2 lit. a + AVV Art. 28 + ggf. SCC + BSI-TR-02102-1 + EU-AI-Act-Bewertung — aus Mock-Scope ausgeschlossen. Architektur-Doku darf 2027-Vision (E2E-verschlüsseltes Backup mit Hardware-Key-Management) nennen, UI nicht.

## Open questions

- **ZeSI generator + ZeSI ad** — produktiver Live-Status zum 8. Mai 2026? Die Bundesdruckerei-Pressemeldung (Mai 2025) kündigt beide für 2025 an, aber eine Bestätigung der GA-Verfügbarkeit zum Stichtag der Recherche ist `not verified` — `domain-expert validate`.
- **Welche DE-Behörden** sind 2026 bereits als PuB-EAA-Issuer in der EUDI-Sandbox angeschlossen? Liste konnte aus den verfügbaren Quellen nicht atomar bestätigt werden — Recherche endet bei „Sandbox läuft, PID + EAA-Tests erweitert". `domain-expert validate`.
- **BundID-Postfach Aufbewahrungs-Frist** für Anlagen — gibt es eine offizielle Doku, wie lange Bescheide im ZBP gespeichert werden? In der Recherche `not found`. `domain-expert validate`.
- **Hat eine deutsche Krankenkasse** eine API für Drittanbieter, die Versicherungs-Bescheinigungen abrufen lässt (etwa über § 305 SGB V Auskunftsanspruch)? `not found` in den Quellen. Wahrscheinlich nicht — proprietäre Apps. `domain-expert validate`.
- **Digitale Geburtsurkunde** — Stand Mai 2026 ist die elektronische Personenstandsbescheinigung *nicht* möglich (Bürger erhält Urkunden weiterhin in Papierform). Gibt es Roadmap-Datum für die digitale Urkunde? Das wäre Schlüssel-Pattern für PuB-EAA-Standesamt. `domain-expert validate`.
- **§ 87a Abs. 4 AO** — sind alle ELSTER-Bescheide ab 2025 mit qeS oder qualifiziertem Siegel versehen, oder ist Variabilität pro Finanzamt? Praxis-Detail wichtig für Demo-Realismus.
- **ZBP-Citizen-API** — bestätigt aus Posteingang-Recherche: existiert nicht. Implikation für Tresor: Bürger:in muss manuell aus ZBP exportieren + in Tresor importieren. Demo soll diesen Lift-Punkt sichtbar machen.

## Hand-off to domain-expert

Bitte prüfe insbesondere die folgenden zehn load-bearing Aussagen, bevor concept-verifier sie adversarial bewertet:

1. **§ 33 VwVfG — amtliche Beglaubigung ist hoheitlich und kann nicht durch eine private App ersetzt werden.** Bestätigt, dass „beglaubigte Kopie" ausschließlich durch Bürgeramt / Standesamt / Notar erteilt werden kann?
2. **§ 87a Abs. 4 AO + qeS** — elektronischer Steuerbescheid mit qeS / qualifiziertem Siegel ist Schriftform-äquivalent. Sind tatsächlich alle aktuellen ELSTER-Bescheide so signiert, oder ist das Pflicht für die Behörde, aber Praxis-Variabilität?
3. **§ 9 PAuswG Pseudonym-Funktion** — pro Diensteanbieter unterschiedliches Pseudonym, BfJ-Berechtigung erforderlich. Bestätigt? Welche Bürger:innen-Wahrnehmung der Pseudonym-Funktion?
4. **EUDI-ARF v2.x — vier Attestation-Typen (PID, QEAA, EAA, PuB-EAA), zwei Pflicht-Formate (mDoc + SD-JWT VC), W3C VC nur optional für non-qualified EAAs.** Bestätigt? Aktualität zum 8. Mai 2026?
5. **eIDAS 2 Verordnung 2024/1183 — Frist 31.12.2026 Member-State-Wallet, 2027 mandatory acceptance privatwirtschaftlich.** Bestätigt?
6. **DE-EUDI-Wallet-Status Mai 2026 — Sandbox seit Anfang 2026, PID-Tests laufen, EAA-Tests im Verlauf 2026, Public-Launch Anfang 2027.** Bestätigt?
7. **ZeSI mobile Live-Status** — bestätigt 13. Mai 2025 in App Stores; Hamburg-eWA produktiv mit VDS. ZeSI generator + ZeSI ad zum 8. Mai 2026 Live-Status — Klärung erbeten.
8. **BSI TR-03171** — bestätigt als Standard für „Optisch verifizierbarer kryptographischer Schutz von Verwaltungsdokumenten (Digitale Siegel)"?
9. **DSGVO Art. 17 Abs. 3 lit. b + e** — Behörden-Bescheide mit Beweismittel-Charakter sind im *amtlichen* Postfach nicht ohne weiteres löschbar; im *privaten* Tresor des/der Bürger:in dagegen jederzeit löschbar. Klärung erbeten?
10. **Aufbewahrungspflicht Privatperson** — keine gesetzliche Pflicht, Empfehlung 6 Jahre (Festsetzungsverjährung); 10 Jahre nur für Selbstständige nach § 147 AO. Bestätigt?

Wenn diese zehn Punkte verifiziert sind, kann concept-verifier die Argumentation adversarial prüfen — primär die Trennlinie „heute schon machbar (ZeSI / qeS)" vs. „2027-speculative (EUDI-PuB-EAA)" und die Frage, ob eine eigenständige Tresor-App vs. Modul in DeutschlandID die realistischere Marktposition ist.

## Domain validation (domain-expert 2026-05-08)

Status der zehn load-bearing Aussagen, jeweils gegen primary sources geprüft. Vollständige Begründungen in `docs/domain/dokumente.md`.

| # | Claim | Status | Anmerkung |
|---|---|---|---|
| 1 | § 33 VwVfG — amtliche Beglaubigung hoheitlich, keine private App | **bestätigt** | Wortlaut Abs. 1 + 2 + 4 verifiziert (gesetze-im-internet.de). Beglaubigungs-Vermerk verlangt Dienstsiegel + Unterschrift bzw. qeS + Behörden-Eigenschaft iSv § 1 Abs. 4 VwVfG. |
| 2 | § 87a Abs. 4 AO — qeS / qualifiziertes Siegel ersetzt Schriftform | **bestätigt mit Präzisierung** | Wortlaut: qeS *oder* qualifiziertes Siegel *oder* sicheres Verfahren nach Abs. 7/8 (De-Mail, Abrufbereitstellung). ELSTER-Praxis: nicht zwingend qeS pro Bescheid (Praxis-Variabilität pro Finanzamt + Bescheid-Typ); Mein-ELSTER-Bescheide werden idR mit qualifiziertem elektronischem Siegel des Landes-Finanzverwaltung versehen. UI sollte „qeS oder qualifiziertes Siegel" sagen, nicht „qeS". |
| 3 | § 9 PAuswG Pseudonym-Funktion — dienste-/karten-spezifisch + BfJ-Berechtigung | **bestätigt** | § 9 Abs. 5 PAuswG; BfJ-Berechtigungs-CA produktiv. Adoption gering (~5 % der eID-Nutzungen) — Tresor-UI sollte das Pattern aktiv sichtbar machen. |
| 4 | EUDI ARF v2.6.0 — vier Attestation-Typen + zwei Pflicht-Formate | **bestätigt mit Präzisierung** | Vier Typen + Selective-Disclosure-Pflicht direkt aus eudi.dev/2.6.0. Format-Pflicht wandert technisch von ARF in Implementing Regulations (CIR 2024/2980 + Format-Profile Q3/Q4 2025). LSP-Konsens: mDoc + SD-JWT VC für PID + (Q)EAAs. Aussage substanziell richtig, Beleg-Pfad: eIDAS 2 + CIRs, nicht ARF allein. |
| 5 | eIDAS 2 VO 2024/1183 — Frist 31.12.2026 + 2027 mandatory acceptance | **bestätigt** | Verordnung in Kraft 20.05.2024; Member-State-Wallet-Pflicht 31.12.2026; Mandatory Acceptance privatwirtschaftlich Ende 2027. |
| 6 | DE-EUDI-Wallet — Sandbox 2026, PID-Tests laufen, EAA-Tests im Verlauf 2026, Public-Launch Anfang 2027 | **bestätigt** | BMDS-Quelle: Sandbox seit Anfang 2026, PID-Tests laufen, EAA-Tests in Erweiterung, Stufe-1-Launch Anfang 2027. **Keine** öffentliche Liste angeschlossener PuB-EAA-Issuer Mai 2026 — `not verified`. |
| 7 | ZeSI mobile Live-Status 13.05.2025 + Hamburg eWA produktiv | **bestätigt mit Präzisierung** | App-Release 13.05.2025 verifiziert (Bundesdruckerei-Pressemitteilung). Hamburg-eWA produktiv 2025+ mit ~830 Anmeldungen/Tag, ~350.000 kumuliert, >2.500 angeschlossene Meldebehörden, ~80 % bundesweite Abdeckung; flächendeckend produktiv in RP + SH bestätigt. ZeSI generator + ZeSI ad: für 2025 angekündigt; Live-Verfügbarkeit Mai 2026 nicht öffentlich bestätigt — `not verified`. |
| 8 | BSI TR-03171 — Standard für VDS auf Verwaltungsdokumenten | **bestätigt mit Präzisierung** | Titel: „Optisch verifizierbarer kryptographischer Schutz von Verwaltungsdokumenten (Digitale Siegel)". Aktuelle Version: **0.8** (Stand Mai 2026; keine Folge-Version öffentlich). Stützt sich auf TR-03137-1 (JAB-Code / Data-Matrix). |
| 9 | DSGVO Art. 17 Abs. 3 lit. b + e — Behörde nicht löschpflichtig, Bürger lokal jederzeit | **bestätigt** | Wortlaut lit. b („rechtliche Verpflichtung … Wahrnehmung einer Aufgabe im öffentlichen Interesse oder in Ausübung öffentlicher Gewalt") + lit. e („Geltendmachung, Ausübung oder Verteidigung von Rechtsansprüchen") direkt verifiziert. Im *eigenen privaten Tresor* greift die Schranke nicht — Bürger kann lokal jederzeit löschen. Original im amtlichen Postfach unterliegt der ausstellenden Behörde. |
| 10 | Aufbewahrungspflicht Privatperson — keine gesetzliche Pflicht; 6 Jahre Empfehlung; 10 Jahre § 147 AO nur Selbstständige | **bestätigt mit Präzisierung** | § 147 Abs. 3 S. 1 AO: 10 Jahre für Bücher / Aufzeichnungen / Jahresabschlüsse / Unterlagen Abs. 1 Nr. 1 + 4a; **8 Jahre** für Buchungsbelege (Abs. 1 Nr. 4); **6 Jahre** für sonstige Unterlagen (z. B. Geschäftsbriefe). Frist beginnt mit Schluss des Kalenderjahrs der Entstehung. § 169 AO Festsetzungsverjährung 4 Jahre Standard / 5 Jahre leichtfertig / 10 Jahre hinterzogen. Tresor zeigt persona-spezifischen Frist-Countdown (nur bei Mehmet als Selbstständigem). |

**Zusätzlich identifiziert:**

- **DISAGREEMENT #6 (neu, ARF-Format-Mandat-Beleg-Pfad)** — Adjudikation in `docs/domain/dokumente.md` Abschnitt 10 #6.
- **DISAGREEMENT #7 (neu, Aussteller vs. Hersteller bei Bundesdruckerei-Produkten)** — Adjudikation in `docs/domain/dokumente.md` Abschnitt 10 #7. UI-Texte müssen präzise zwischen ausstellender Behörde (= authentic source iSv eIDAS 2 / PuB-EAA-Kandidat) und Hersteller (Bundesdruckerei = nur technische Produktions-Stelle) trennen.

**Handover-Empfehlung an concept-verifier**: research-Argumentation ist tragfähig. Adversarial-Schwerpunkte sollten sein: (a) Trennschärfe „heute produktiv (ZeSI / qeS)" vs. „2027-speculative (EUDI / PuB-EAA)" durchgängig in jeder UI-Komponente; (b) Standalone-vs.-Modul-Strategie als Risiko-Position halten; (c) Art.-9-DSGVO-Inhalte im Tresor + `localStorage`-only-Linie nicht aufweichen; (d) Beglaubigungs-Linie absolut hart halten, keine UX-Kompromisse à la „Premium-Beglaubigung".

## Sources

[^1]: [eGovernment MONITOR 2025 — Initiative D21 + TUM, Erhebung Kantar](https://initiatived21.de/publikationen/egovernment-monitor/2025) — accessed 2026-05-08
[^2]: [eGovernment MONITOR 2025 — Pressemitteilung „Staatsvertrauen zurückgewinnen"](https://initiatived21.de/presse/egovernment-monitor-2025-wie-die-digitale-verwaltung-helfen-kann-staatsvertrauen-zurueckzugewinnen) — accessed 2026-05-08
[^3]: [Bundesdruckerei: Verwaltungsdokumente mobil verifizieren — ZeSI mobile Prüf-App in App Stores (Pressemitteilung 13.05.2025)](https://www.bundesdruckerei.de/de/newsroom/pressemitteilungen/verwaltungsdokumente-mobil-verifizieren-mit-zesi-mobile-pruef-app) — accessed 2026-05-08
[^4]: [Bundesdruckerei Innovation Hub — Case Study Hamburg: Fälschungssicher und überall prüfbar](https://www.bundesdruckerei.de/de/innovation-hub/case-study-hamburg-faelschungssicher-und-ueberall-pruefbar) — accessed 2026-05-08
[^5]: [Bundesdruckerei: ZeSI mobile in App Stores — OTS-Pressemeldung 03.06.2025](https://www.ots.at/presseaussendung/OTS_20250603_OTS0037/verwaltungsdokumente-mobil-verifizieren-bundesdruckerei-bringt-zesi-mobile-pruef-app-in-app-stores) — accessed 2026-05-08
[^6]: [BMDS — EUDI-Wallet Themenseite + Sandbox-Pressemitteilung](https://bmds.bund.de/themen/digitaler-staat/digitale-identitaeten/eudi-wallet) — accessed 2026-05-08
[^7]: [European Digital Identity Regulation — EU Digital Identity Wallet Hub](https://ec.europa.eu/digital-building-blocks/sites/spaces/EUDIGITALIDENTITYWALLET/pages/915931811/The+European+Digital+Identity+Regulation) — accessed 2026-05-08
[^8]: [The EU Digital Identity Wallet moves toward mandatory rollout by end-2026 — shepherdgazette.com](https://tech.shepherdgazette.com/eu-digital-identity-wallet-mandatory-rollout-2026/) — accessed 2026-05-08
[^9]: [EUDI Wallet credential formats overview — iGrant.io DevDocs (mDL/mdoc, SD-JWT VC, W3C VC mandate)](https://docs.igrant.io/concepts/eudi-wallet-verifiable-credential-formats/) — accessed 2026-05-08
[^10]: [EUDI Architecture and Reference Framework v2.6.0 — eudi.dev](https://eudi.dev/2.6.0/architecture-and-reference-framework-main/) — accessed 2026-05-08
[^11]: [DigiLocker — Wikipedia + 360 Analytika 2018–2025-Übersicht (~570 Mio. Nutzer Aug 2025)](https://360analytika.com/statistical-insight-on-digilocker-in-india/) — accessed 2026-05-08
[^12]: [Digital wallet, EU Digital Identity Wallet (RIA Estonia)](https://www.ria.ee/en/state-information-system/electronic-identity-eid-and-trust-services/eudi-wallet) — accessed 2026-05-08
[^13]: [Singpass + MyInfo — Singpass Developer Docs / Factsheet](https://docs.developer.singpass.gov.sg/docs/products/singpass-myinfo) — accessed 2026-05-08
[^14]: [Apple Wallet ID / mDL: 14 US-Bundesstaaten, TSA > 250 Flughäfen (MacRumors + Apple Support 118237)](https://support.apple.com/en-us/118237) — accessed 2026-05-08
[^15]: [Digital Post / borger.dk + MitID — lifeindenmark.borger.dk](https://lifeindenmark.borger.dk/apps-and-digital-services/Digital-Post) — accessed 2026-05-08
[^16]: [SCHUFA-BonitätsCheck für Vermieter — schufa.de](https://www.schufa.de/newsroom/bonitaet/schufa-auskunft-vermieter-schnell-einfach/) — accessed 2026-05-08
[^17]: [ELSTER Hilfe — Bescheiddaten Posteingang (180-Tage-Verfügbarkeit, PDF-Download)](https://www.elster.de/eportal/helpGlobal?themaGlobal=help_diva) — accessed 2026-05-08
[^18]: [BundID Postfach + Anlagen — Bundesportal id.bund.de + Wikipedia](https://id.bund.de/de/faq) — accessed 2026-05-08
[^19]: [Verimi — Digitale Identitäten und EUDI-Wallets 2025 + Verimi-Yes-Merger](https://verimi.de/blog/digitale-identitaeten-und-eudi-wallets-2025/) — accessed 2026-05-08
[^20]: [Bundesdruckerei eGovernment + ZeSI Übersicht (Bundesdruckerei.de/eGovernment EN)](https://www.bundesdruckerei.de/en/fields-of-use/egovernment) — accessed 2026-05-08
[^21]: [§ 87a AO — Elektronische Kommunikation (gesetze-im-internet.de + dejure.org)](https://dejure.org/gesetze/AO/87a.html) — accessed 2026-05-08
[^22]: [§ 33 VwVfG — Beglaubigung von Dokumenten (gesetze-im-internet.de)](https://www.gesetze-im-internet.de/vwvfg/__33.html) — accessed 2026-05-08
[^23]: [Elektronische Gesundheitskarte (eGK), Versicherungsbescheinigung — AOK / KKH / KVBB](https://www.aok.de/pk/versichertenservice/elektronische-gesundheitskarte-egk/) — accessed 2026-05-08
[^24]: [Elektronischer Aufenthaltstitel (eAT) — Personalausweisportal + Bundesregierung-Publikation](https://www.personalausweisportal.de/Webs/PA/DE/buergerinnen-und-buerger/elektronischer-aufenthaltstitel/elektronischer-aufenthaltstitel-node.html) — accessed 2026-05-08
[^25]: [Geburtsurkunde Online beantragen — Bundesportal + Standesamt.online (Stand 2026: PDF-Personenstandsurkunde noch nicht möglich)](https://verwaltung.bund.de/leistungsverzeichnis/de/leistung/99027002012000) — accessed 2026-05-08
[^26]: [BMJV-Pressemitteilung 16.07.2025 — Elektronische Beurkundungen + Notar-App der Bundesnotarkammer (29.12.2025 in Kraft)](https://www.bmjv.de/SharedDocs/Pressemitteilungen/DE/2025/0716_Praesenzbeurkundung.html) — accessed 2026-05-08
[^27]: [§ 3a VwVfG / § 36a SGB I — Elektronische Kommunikation, Schriftformersatz; beA-Update 01.01.2024 (BRAK + Haufe)](https://www.brak.de/newsroom/newsletter/nachrichten-aus-berlin/2024/ausgabe-2-2024-v-2412024/schriftformersatz-durch-bea-versand-jetzt-auch-gegenueber-behoerden-moeglich/) — accessed 2026-05-08
[^28]: [Elektronischer Steuerbescheid ab 2027 (DIVA): Widerspruch jetzt möglich — steuertipps.de](https://www.steuertipps.de/finanzamt-formalitaeten/steuerbescheid-elektronische-bekanntgabe-wird-standard) — accessed 2026-05-08
[^29]: [Aufbewahrungsfristen für Steuerunterlagen und Steuerbescheide — Mammut-Aktenvernichtung + Lexware](https://www.mammut-aktenvernichtung.de/bl/allgemein/aufbewahrungsfristen-steuerunterlagen-steuerbescheide/) — accessed 2026-05-08
[^30]: [BundID — BMDS Themenseite (Postfach + Statusmonitor)](https://bmds.bund.de/themen/digitaler-staat/digitale-identitaeten/bundid) — accessed 2026-05-08
[^31]: [Pseudonym-Funktion des Personalausweises — die-eid-funktion.de + die-online-ausweisfunktion.de + § 9 PAuswG (gesetze-im-internet.de)](https://www.die-eid-funktion.de/funktionen-des-personalausweises/pseudonym-funktion-des-personalausweises/) — accessed 2026-05-08
[^32]: [EUDI ARF GitHub Repository — implementing regulation tracker](https://github.com/eu-digital-identity-wallet/eudi-doc-architecture-and-reference-framework) — accessed 2026-05-08
[^33]: [EUDI Wallet — Attestation Formats (DeepWiki)](https://deepwiki.com/eu-digital-identity-wallet/eudi-doc-architecture-and-reference-framework/6.3-attestation-formats) — accessed 2026-05-08
[^34]: [EUDI Wallet — Attestation Formats / iGrant.io](https://docs.igrant.io/concepts/eudi-wallet-verifiable-credential-formats/) — accessed 2026-05-08
[^35]: [EU Age Verification Manual + Selective Disclosure (EUDI Wallet) — ec.europa.eu + ageverification.dev](https://ec.europa.eu/digital-building-blocks/sites/spaces/EUDIGITALIDENTITYWALLET/pages/930450954/The+Age+Verification+Manual) — accessed 2026-05-08
[^36]: [EUDI Large Scale Pilots Final Report — Meeco Report Januar 2026](https://media.meeco.me/public-assets/reports/Meeco_Report_EUDI_Large_Scale_Pilots.pdf) — accessed 2026-05-08
[^37]: [Was sind die Large Scale Pilot Projects (POTENTIAL, EWC, NOBID, DC4EU) — EU Digital Identity Wallet Hub](https://ec.europa.eu/digital-building-blocks/sites/spaces/EUDIGITALIDENTITYWALLET/pages/694487808/What+are+the+Large+Scale+Pilot+Projects) — accessed 2026-05-08
[^38]: [BMDS Pressemitteilung — Bund startet Sandbox für EUDI-Wallet 2026](https://bmds.bund.de/aktuelles/pressemitteilungen/detail/bund-startet-sandbox-fuer-eudi-wallet) — accessed 2026-05-08
[^39]: [Mobile Driver's License Issuing-State Tracker 2026 — Credence ID](https://credenceid.com/resources/blog/us-mobile-drivers-license-mdl-state-tracker) — accessed 2026-05-08
[^40]: [DigiLocker FAQ + About — digilocker.gov.in](https://www.digilocker.gov.in/web/about/faq) — accessed 2026-05-08
[^41]: [DigiLocker Verify Portal — verify.digilocker.gov.in](https://verify.digilocker.gov.in/) — accessed 2026-05-08
[^42]: [Estonian Identity Card + Eesti App + Biometric Update Estonia 2024](https://www.biometricupdate.com/202405/a-digital-wallet-is-the-first-step-how-estonia-built-its-digital-state) — accessed 2026-05-08
[^43]: [SCHUFA für Wohnungsbewerbung — bonitaetscheck.immobilienscout24.de + Sparkasse](https://bonitaetscheck.immobilienscout24.de/) — accessed 2026-05-08
[^44]: [§ 147 AO — Aufbewahrungsfristen (gesetze-im-internet.de)](https://www.gesetze-im-internet.de/ao_1977/__147.html) — accessed 2026-05-08
[^45]: [Art. 17 DSGVO — Recht auf Löschung („Recht auf Vergessenwerden") + Ausnahmen Abs. 3 lit. b + e (dsgvo-gesetz.de + dejure.org)](https://dsgvo-gesetz.de/art-17-dsgvo/) — accessed 2026-05-08
[^46]: [BSI TR-02102-1 „Kryptographische Verfahren: Empfehlungen und Schlüssellängen" Version 2026-01](https://www.bsi.bund.de/SharedDocs/Downloads/DE/BSI/Publikationen/TechnischeRichtlinien/TR02102/BSI-TR-02102.html) — accessed 2026-05-08

## Summary

**Top 3 Pain-Quantifizierungen** (alle aus eGov-MONITOR 2025): nur 12 % stimmen zu, der Staat erleichtere ihren Alltag; 61 % wünschen *uncomplicated findability* der Verwaltungsdienste als Top-Verbesserung; 55 % wünschen Vermeidung doppelter Dateneingaben — exakt das Once-Only-Versprechen eines Tresors. Eine harte Volumen-Zahl „verlorene Dokumente pro Haushalt pro Jahr" ist `not found`; das System-Pain-Argument trägt auf Indikatoren-Ebene.

**Top 3 Prior-Art-Patterns** zum direkten Übernehmen: (1) **DigiLocker-Indien-Pattern** für zeitbeschränkte Share-Links + QR-Verifikation auf Massen-Skala (~570 Mio. Nutzer Aug 2025); (2) **Bundesdruckerei-ZeSI-mobile-Pattern** als der DE-native Verifikations-Standard (BSI TR-03171, Hamburg-eWA produktiv ab 2025) — wir spiegeln *kein* fremdes Pattern, sondern bauen auf der DE-Realität auf; (3) **Apple-Wallet-ID-Pattern** mit Selective Disclosure + Face/Touch-ID-Geste — produktiver Beleg für 4-Jahres-Adoption in 14 US-Bundesstaaten und > 250 TSA-Flughäfen, mit klaren UX-Konventionen.

**Top 3 offene Disagreements für domain-expert**: (1) **Beglaubigung-Verbot** — App darf nicht beglaubigen (§ 33 VwVfG hoheitlich); muss aktiv zu Bürgeramt / Standesamt / Notar-App durchverlinken — research-scout und domain-expert vermutlich einig, aber UX-Linie scharf zu ziehen; (2) **VDS-QR-Code auf jedem Mock-Bescheid** vs. nur dort, wo heute (Mai 2026) tatsächlich Realität — research-scout schlägt universal mit „Speculative 2027"-Tag vor, domain-expert wird vermutlich differenzierte Markierung verlangen; (3) **PuB-EAA-Live-Status DE Mai 2026** — research-scout markiert als Sandbox-Phase, domain-expert prüft Genauigkeit dieser Markierung pro Behörde, weil bei „so funktioniert das schon heute"-Lesart die Demo Realismus verliert.
