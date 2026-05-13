---
topic: Kontakt-Schicht — domain-expert legal-realism validation
date: 2026-05-10
upstream: docs/research/2026-05-10-kontakt-schicht.md
status: revise-needed
last_validated: 2026-05-10
sources:
  - https://www.gesetze-im-internet.de/ozg/__2.html
  - https://www.gesetze-im-internet.de/ozg/__9.html
  - https://www.gesetze-im-internet.de/vwvfg/__41.html
  - https://www.gesetze-im-internet.de/ao_1977/__122a.html
  - https://www.gesetze-im-internet.de/bmg/__3.html
  - https://www.gesetze-im-internet.de/bmg/__33.html
  - https://www.gesetze-im-internet.de/bmg/__34.html
  - https://dsgvo-gesetz.de/art-13-dsgvo/
  - https://dsgvo-gesetz.de/art-14-dsgvo/
  - https://www.bundesrat.de/SharedDocs/pm/2024/020.html
  - https://www.heise.de/news/Bundesregierung-kuendigt-Ende-von-De-Mail-in-der-Verwaltung-an-9180138.html
  - https://www.techbook.de/mobile-lifestyle/de-mail-ende
  - https://www.haufe.de/oeffentlicher-dienst/digitalisierung-transformation/vermittlungsverfahren-zur-reform-des-ozg-abgeschlossen_524786_625014.html
  - https://eu-digital-identity-wallet.github.io/eudi-doc-architecture-and-reference-framework/1.4.0/annexes/annex-3/annex-3.01-pid-rulebook/
  - https://www.gesetze-im-internet.de/sgb_x/__67.html
  - https://www.gesetze-im-internet.de/aufenthg_2004/__82.html
---

# Verdict

**REVISE-RESEARCH (vor Verifier-Hand-off).**

Die research-scout Stoßrichtung ist tragfähig — vier Kontakt-Cards plus
Notification-Präferenzen ist ein realistisch eingegrenzter horizontaler Layer,
und die Risiken-1-bis-3 sind richtig benannt. **Aber** drei rechtliche Aussagen
sind schief und müssen vor dem concept-verifier-Hand-off korrigiert werden,
sonst beruht die ganze Spec auf einem falschen Norm-Anker:

1. Die rechtliche Hauptnorm für die elektronische Bekanntgabe per Postfach
   ist **§ 9 OZG (idF OZG-Änderungsgesetz, in Kraft 24.07.2024)**, nicht
   pauschal § 41 Abs. 2a VwVfG. § 9 OZG ist die *lex specialis* für
   Postfach-Verwaltungsakte, und sie hat eine **andere Einwilligungs-Konstruktion**
   (Opt-Out) und eine **andere Bekanntgabe-Fiktion** (4. Tag) als die allgemeine
   § 41 Abs. 2a VwVfG (Tag-nach-Abruf).
2. Die Aussage „BundID-Postfach wird 2026 zum De-facto-Standard-Kanal" stimmt
   politisch, aber das **konkrete Pflicht-Datum** „ab 2026 Bund / ab 2028
   Kommunen" konnte ich in der Bundesdruckerei-Quelle nicht verifizieren —
   die research-scout-Quelle ist hier zu schwach für eine Spec-Hard-Line.
   Es bleibt: 4-Jahres-Anspruchsfrist nach Gesetzesverkündung 24.07.2024,
   also **24.07.2028** als spätester Rechtsanspruch auf digitale Bundesleistungen.
3. Die research-scout-Aussage „pauschale BundID-Postfach-Aktivierung
   = Einwilligung für ALLE Behörden" ist (a) genau das, was § 9 OZG mit der
   Opt-Out-Konstruktion **erreicht**, aber (b) sie ist **enger** als das klingt:
   die Einwilligungs-Fiktion entsteht **„im Rahmen der Inanspruchnahme einer
   elektronischen Verwaltungsleistung"**, also pro-Verfahren bei der
   konkreten Online-Antragstellung, nicht „ein Klick gilt für alle 1.600
   BundID-Onlinedienste forever". Das muss in der UI sauber abgebildet werden.

Sobald research-scout diese drei Punkte korrigiert hat (oder die Spec sie
als Hard-Lines übernimmt), ist die V1.1-Vision aus realismus-Sicht freigegeben.
Die EUDI-Notification-Lücke und die DE-Mail-Timeline sind sauber recherchiert.

# Confirmed Realism (from research-scout)

Die folgenden research-scout-Behauptungen sind rechtlich/prozessual korrekt
und können 1:1 in die V1.1-Spec übernommen werden:

## R-1. DE-Mail-Timeline ist exakt richtig

- Verwaltung nutzt DE-Mail seit **31.08.2024** nicht mehr (Auslaufen des
  Rahmenvertrags mit FP Digital Business Solutions, Ankündigung Markus Richter,
  Staatssekretär BMI).
- FP-DBS als letzter Anbieter stellt operativen Betrieb zum **31.12.2026** ein.
- Anfang 2027: 3 Monate Nur-Lese-Modus.
- → DE-Mail darf in der V1.1-UI **nicht als aktiver Kanal** auftauchen. Eine
  Footnote „abgekündigt" wäre verzerrend (Anna/Mehmet/Schmidt sind
  Demo-2026-Personen, sie hätten DE-Mail nie verbindlich genutzt) — Empfehlung:
  einfach komplett auslassen, keine Pseudo-Vollständigkeit vortäuschen.

## R-2. § 41 Abs. 2a VwVfG existiert und greift — aber als Auffang-Norm, nicht als Hauptnorm

- Wortlaut bestätigt: „Mit Einwilligung des Beteiligten kann ein elektronischer
  Verwaltungsakt dadurch bekannt gegeben werden, dass er vom Beteiligten oder
  von seinem Bevollmächtigten über öffentlich zugängliche Netze abgerufen wird.
  […] Der Verwaltungsakt gilt am Tag nach dem Abruf als bekannt gegeben."
- Authentifizierungs-Pflicht ist verankert.
- Aber: § 41 Abs. 2a VwVfG ist die **allgemeine** Norm für „Abruf über
  öffentlich zugängliche Netze" (jede Form von eGov-Portal, mit oder ohne
  zentrales Postfach). Für **Postfach-im-Nutzerkonto** ist § 9 OZG die
  speziellere Norm — siehe C-1 unten.

## R-3. EUDI-Wallet hat keinen standardisierten Notification-Channel

- PID-Rulebook (ARF 1.4.0 / 2.x) listet im Pflicht- und Optional-Schema
  **keinen** Contact-Channel-Attribut-Typ. Mitgliedstaaten dürfen domestic
  namespaces erweitern, aber das bringt kein Push-Channel-Standard.
- Commission Implementing Regulation 2024/2980 + 2025/848 regeln
  Notification-Pfade *zwischen Trust-Service-Providern, Mitgliedstaaten,
  Kommission* — **nicht** Behörde→Bürger:in.
- → Die V1.1-Vision „EUDI als Push-Kanal" ist genuin speculative-2027 und
  muss überall als solche gemarkert werden (`eudi_push_speculative`).

## R-4. Es gibt kein staatliches authoritative-Register für E-Mail oder Mobilfunk

- Melderegister speichert nach § 3 Abs. 1 Nr. 7 BMG „gegenwärtige und
  frühere Anschriften" — KEINE elektronische Adresse, kein Mobilfunk.
  (§ 3 Nr. 13 BMG erlaubt seit RegMoG die Speicherung der Steuer-IdNr; das ist
  KEIN Kontaktdatum.)
- BundID hält selbst-attestierte Adresse + Mobilfunk; Verifikation der E-Mail
  per Magic-Link beim Anlegen.
- → V1.1 muss klar machen: E-Mail und Mobilfunk haben **kein hoheitliches
  Vorbild-Register**. Self-attested + verifiziert ist die maximale Stufe.

## R-5. Risiko-1-bis-3 (Demo-Wow-Loss, Notification-Präferenz-Suggestion, Scope-Creep)

Stimmt alles. Insbesondere Risiko-1 (Notification-Präferenzen-UI suggeriert
Kontrolle, die der Bürger nicht hat) ist das gefährlichste — concept-verifier
muss hier scharf prüfen, ob die Speculative-Marker stark genug sind oder ob
diese Sektion komplett out-of-scope V1.1 gehört.

# Corrections Needed

## C-1. § 9 OZG ist die Hauptnorm für Postfach-Bekanntgabe, nicht § 41 Abs. 2a VwVfG

Research-scout zitiert § 41 Abs. 2a VwVfG als zentrale Rechtsgrundlage. Korrekt
ist:

- **§ 9 OZG (in der Fassung des OZG-Änderungsgesetzes, in Kraft 24.07.2024)**
  ist die spezielle Norm für „Bekanntgabe des Verwaltungsaktes durch Bereitstellung
  zum Abruf über ein Postfach im Sinne des § 2 Abs. 7 OZG".
- Wortlaut Schlüsselsätze (`gesetze-im-internet.de/ozg/__9.html`):
  - „Mit Einwilligung des Nutzers kann ein elektronischer Verwaltungsakt
    dadurch bekannt gegeben werden, dass er vom Nutzer oder von seinem
    Bevollmächtigten über ein Postfach im Sinne des § 2 Absatz 7 über
    öffentlich zugängliche Netze abgerufen wird."
  - **„Die Einwilligung nach Satz 1 gilt als erteilt, sofern der Nutzer nicht
    im Rahmen der Inanspruchnahme einer elektronischen Verwaltungsleistung
    eine elektronische Bekanntgabe über ein Postfach im Sinne des § 2 Absatz 7
    ausschließt."** ← Opt-Out-Konstruktion!
  - „Der Verwaltungsakt gilt am vierten Tag nach der Bereitstellung zum Abruf
    als bekannt gegeben." ← **4-Tage-Fiktion**, identisch zu § 122a Abs. 4 AO,
    NICHT „Tag nach Abruf" wie in § 41 Abs. 2a VwVfG.
- **Konsequenz für die Spec**: Postfach-Card und Notification-Modul müssen
  § 9 OZG zitieren, nicht § 41 Abs. 2a VwVfG. § 41 Abs. 2a VwVfG bleibt der
  Auffang-Tatbestand für Behörden, die ihren elektronischen Verwaltungsakt
  *nicht* über das BundID-Postfach, sondern über ein eigenes Portal
  bereitstellen (z.B. ELSTER, Sozialportal-DRV).
- **Verhältnis zu § 122a Abs. 4 AO** (Anna's Steuerbescheid in V1.5.1):
  Steuerbehörden haben mit § 122a AO ihre eigene lex specialis — sie nutzen
  **nicht** das BundID-Postfach für Steuerbescheide, sondern den ELSTER-Posteingang
  („Mein ELSTER"). Die 4-Tage-Fiktion ist in beiden Welten (§ 9 OZG, § 122a
  Abs. 4 AO) wortgleich, aber die rechtliche Anker-Norm ist eine andere. Die
  V1.1-Spec muss diese Trennung sauber halten — sonst suggeriert die Demo,
  dass Steuerbescheide ins BundID-Postfach kommen, was sie 2026/27 nicht tun.

## C-2. Einwilligungs-Granularität ist „pro-Inanspruchnahme einer Verwaltungsleistung", nicht pauschal

Research-scout fragt offen: „Ist die Aktivierung des BundID-Postfachs
*automatisch* eine Einwilligung für ALLE Behörden, oder pro-Behörde?"

Antwort aus § 9 OZG Wortlaut:

- Die Einwilligung gilt **pro-Antrag-Akt** als erteilt — d.h. wenn der Bürger
  einen Online-Antrag (z.B. Wohngeld online, BAföG online) stellt und in dieser
  Antrags-Maske die elektronische Bekanntgabe über Postfach **nicht aktiv
  ausschließt**, dann ist sie für *diesen* konkreten Verwaltungsakt erteilt.
- Die Einwilligung ist **nicht** pauschal ein Lifetime-Opt-In für alle künftigen
  Verwaltungsakte aller Behörden, die BundID nutzen.
- Praktisch heißt das: ein Bürger kann sehr wohl bei der Familienkasse via
  BundID-Postfach Bescheide bekommen, aber bei der Ausländerbehörde Brief
  präferieren — vorausgesetzt, die ABH ist überhaupt an BundID angebunden.
- **UI-Implikation V1.1**: Die Postfach-Card darf NICHT als globaler
  Master-Toggle „Ich willige ein, alle Behörden dürfen mir digital bekanntgeben"
  dargestellt werden. Sie zeigt den **Status** des Postfachs (aktiv / inaktiv)
  und einen Wegweiser-Pointer zu `id.bund.de`. Die einzelne Einwilligung pro
  Verfahren passiert **im Antrags-Wizard der jeweiligen Behörde**, nicht in
  unserer Stammdaten-App.

## C-3. „BundID-E-Mail authoritative für Behörden" — präziser

Research-scout fragt: „Darf eine Behörde X die BundID-E-Mail eines Bürgers
für Steuerbescheid-Notification nutzen?"

Korrekte Differenzierung:

- Die in BundID hinterlegte E-Mail ist **self-attested mit Magic-Link-Verifikation**
  beim Account-Anlegen. Verifikations-Stufe ist „verifiziert" im Sinne von
  „Adresse existiert und der Account-Inhaber hat Zugriff zum Verifikations-Zeitpunkt".
- Sie ist **nicht** ein attestiertes hoheitliches Identitäts-Attribut (im
  Gegensatz zu Name/Anschrift, die bei Vertrauensniveau „hoch" via eID aus dem
  Personalausweis übernommen werden).
- Drittbehörden, die an BundID angebunden sind, dürfen die hinterlegte E-Mail
  als **Notification-Adresse** nutzen, um den Bürger über *Postfach-Eingänge*
  zu informieren („Sie haben eine Nachricht im Postfach"). Das ist die
  Standard-Funktion des BundID-Postfachs.
- Sie dürfen die E-Mail **nicht** als Bekanntgabe-Kanal nutzen (eine E-Mail-
  Klartext-Zustellung wäre kein wirksamer Verwaltungsakt nach § 41 Abs. 2a
  VwVfG/§ 9 OZG, weil die Authentifizierungs-Pflicht nicht erfüllt ist —
  E-Mail kennt keinen verbindlichen Authentifizierungs-Schritt).
- Bundesländer und Kommunen, die *nicht* an BundID angebunden sind (was 2026
  noch sehr verbreitet ist — Service-BW, Mein Servicekonto Berlin, NRW-Konto,
  HH-Servicekonto sind eigene Konten parallel zu BundID), nutzen die BundID-
  E-Mail **nicht** — sie haben eigene Postfächer und eigene E-Mail-Felder.
- → **V1.1-UI-Implikation**: Die E-Mail-Card darf nicht suggerieren, dass die
  BundID-E-Mail bei *jeder* Behörde ankommt. Disclaimer-Marker
  `bundid_email_only_for_bundid_attached_behoerden` ist ratsam.

## C-4. SMS-OTP / Mobilfunk: nur Authentifizierung, keine Bekanntgabe

Research-scout fragt offen: „Ist Mobilfunknummer-2FA bei BundID produktiv?"
und „Ist SMS-OTP ausreichend für SMS-Bekanntgabe-Fiktion?"

- BundID-2FA: SMS-TAN/mTAN ist **nicht** das primäre 2FA-Verfahren; primär
  ist die eID-Funktion des Personalausweises (Vertrauensniveau hoch) oder
  ELSTER-Zertifikat (Vertrauensniveau substanziell). SMS-TAN war historisch
  in einigen Bundesländer-Konten (z.B. ELSTER hatte mTAN) — bei BundID selbst
  ist es **nicht** zentrales Element.
- Ein **Verwaltungsakt per SMS** ist rechtlich nicht möglich:
  - § 41 Abs. 2a VwVfG verlangt Authentifizierung des Empfängers — SMS bietet
    diese nicht.
  - § 9 OZG verlangt Postfach-Mechanik — SMS ist kein Postfach.
  - § 3a Abs. 2 VwVfG (Schriftform-Ersatz) verlangt qualifizierte elektronische
    Signatur oder vergleichbare Sicherheit — SMS hat keine.
- SMS taugt also rein als **Notification-Kanal** („Sie haben Post im Postfach"),
  niemals als Bekanntgabe-Kanal. Das deckt sich mit research-scout, aber die
  Spec muss diesen Hard-Lock explizit zitieren.

## C-5. Das „bidirektionale BundID-Postfach 2026" ist Plan, nicht in-Kraft-Norm

Research-scout zitiert ad-hoc-news.de und schließt: „bidirektionale Kommunikation
2026 → BundID-Postfach 2026 zum De-facto-Standard". Das ist halb richtig:

- **Geplant** ist Bidirektionalität (Rückfragen der Behörde + Nachreichung des
  Bürgers via Postfach) — das BMI hat dies für 2026 angekündigt (Quelle: BMI-
  Aussagen, Haufe.de, ad-hoc-news.de).
- **In-Kraft-gesetzt** ist OZG 2.0 seit 24.07.2024. Die technische Umsetzung
  der Bidirektionalität läuft bei der FITKO/Bundesdruckerei.
- Ein **Pflicht-Datum** „ab 2026 müssen alle Bundesbehörden bidirektional
  Postfach betreiben" ist **nicht aus dem Gesetzestext belegbar**. Was im
  OZG 2.0 steht: 4-Jahres-Anspruchsfrist auf digitale Bundesleistungen
  (Stand-Frist: **24.07.2028**), Übergangsregelung 3 Jahre für Länder-Konten.
- → **Spec-Implikation**: V1.1 darf das Bidirektionalitäts-Feature in den
  Kontakt-Cards **nicht als Pflicht-Standard 2026** darstellen, sondern als
  „technisch im Aufbau, geplant 2026/27" — mit Speculative-Marker.

## C-6. § 41 Abs. 2a VwVfG vs. § 122a Abs. 4 AO: keine doppelte Bekanntgabe-Fiktion in der UI

Research-scout fragt: „Wie verhält sich § 41 Abs. 2a VwVfG zu § 122a Abs. 4 AO
(Anna's Steuerbescheid V1.5.1)?"

- Beide sind **rechtlich nicht äquivalent**, sondern **lex-specialis-Pendants**
  in unterschiedlichen Verfahrens-Welten:
  - § 41 Abs. 2a VwVfG → allgemeines Verwaltungsverfahrensrecht des Bundes;
    Tag-nach-Abruf-Fiktion.
  - § 9 OZG → speziell für Postfach-Bekanntgabe in BundID/Nutzerkonto;
    4-Tage-nach-Bereitstellung-Fiktion.
  - § 122a AO → speziell für Steuerverwaltung/ELSTER-Posteingang;
    4-Tage-nach-Bereitstellung-Fiktion.
- Die V1.1-Spec sollte **keine** der drei Normen verstecken; sie sollte aber
  pro Behörden-Typ die **richtige** Norm ausweisen:
  - Steuerbescheide (Finanzamt, BZSt) → § 122a Abs. 4 AO (ELSTER-Posteingang)
  - Sozialleistungsbescheide via BundID-Postfach → § 9 OZG
  - Sonstige Bundesleistungen via BundID-Postfach → § 9 OZG
  - Sonstige elektronische Bekanntgabe (Behörden-Portal, kein Postfach) →
    § 41 Abs. 2a VwVfG
- → **V1.1-UI-Implikation**: NormZitatSpan-Lookup-Map muss alle drei Normen
  enthalten; FieldCard pro Notification-Präferenz zeigt die zutreffende Norm
  je Vorgangs-Kategorie. Konsistenz mit Posteingang V1.5.1 ist Pflicht (dort
  ist § 122a AO bereits verbaut).

## C-7. § 3 BMG Postanschrift authoritative — V1-Cross-Reference ist korrekt

Research-scout fragt: „Ist BMG-Anschrift authoritative für ALL behördliche
Korrespondenz, oder gibt es Spezialregister (z.B. Steuer-Adresse via § 8 AO)?"

- § 3 Abs. 1 Nr. 7 BMG ist **die** authoritative Quelle für die
  Wohnsitz-Anschrift einer natürlichen Person.
- Behörden bekommen die Anschrift via § 36 BMG-Datenkranz oder via
  Einzel-Datenübermittlungen § 33/34 BMG; sie führen sie *konsequenterweise*
  in ihren eigenen Akten, aber bei Adress-Konflikten ist **Melderegister
  authoritative**.
- § 8 AO regelt nicht die Adresse, sondern den **Wohnsitz** im
  steuerrechtlichen Sinn (Wo hat der Steuerpflichtige seinen Wohnsitz?). Das
  ist ein materiell-rechtlicher Anknüpfungspunkt, kein konkurrierendes
  Adress-Register.
- Sonderfall „Korrespondenz-Anschrift" (Postfach-Adresse, abweichende
  Zustellanschrift): Existiert in einigen Verwaltungs-Verfahren als Bürger-
  Wahl (z.B. Familienkasse erlaubt abweichende Korrespondenz-Adresse), ist
  aber **kein eigenes Register**, sondern verwaltungsinternes Feld der
  jeweiligen Akte.
- → **V1.1-UI-Implikation**: Die Postanschrift-Card im Kontakt-Layer ist
  korrekt als Cross-Reference zur V1-Anschrift-Sektion, **nicht** als zweite
  Adress-Card. Eine optionale „Abweichende Korrespondenz-Anschrift"-Sub-Card
  könnte als V1.1-Feature drin sein, aber: pro Behörde unterschiedlich, keine
  zentrale Speicherung — ist eher Scope-Creep. Empfehlung: **out-of-scope V1.1**.

## C-8. SGB X §§ 67 ff. Sozialgeheimnis: der Hard-Lock greift weiter, als research-scout schreibt

Research-scout schreibt: „Kein Sozialdaten-Routing — Krankenkasse-Notifications
bleiben aus dem Notification-Layer raus (SGB X §§ 67 ff.)."

Das stimmt im Kern, ist aber zu eng formuliert:

- SGB X §§ 67 ff. (Sozialgeheimnis) gilt für **alle Sozialleistungsträger**:
  GKV/PKV (SGB V), Rentenversicherung (SGB VI), Pflegeversicherung (SGB XI),
  Arbeitslosengeld I/Bürgergeld (SGB II/III), Familienkasse-Kindergeld bei
  BA-Familienkasse (BKGG, materiell), Elterngeld (BEEG), Wohngeld (WoGG),
  Sozialhilfe (SGB XII), Jugendhilfe (SGB VIII), BAföG (BAföG), Unterhaltsvorschuss.
- Sobald ein Verwaltungsakt sozialleistungsbezogen ist, greift das
  Sozialgeheimnis als spezielle Datenschutz-Norm. Die Bekanntgabe per
  Postfach ist davon nicht direkt verboten (denn der Adressat ist die
  betroffene Person selbst), aber **die Notification-Inhalte dürfen keine
  Sozialdaten an Dritte preisgeben** — heißt: SMS „Bürgergeld-Bescheid liegt
  vor" wäre problematisch, weil schon der Sachverhalt sensibel ist.
- → **V1.1-UI-Implikation**: Der Hard-Lock muss präziser: „Die Notification-
  Präferenz darf für Sozialleistungs-Vorgänge keine inhaltliche Information im
  SMS/Push-Text zeigen — nur generisches ‚Sie haben Post im Postfach‘."
  Quelle: § 35 SGB I i.V.m. SGB X § 67a-d.

## C-9. Mehmet-Persona / AufenthG: Mitwirkungs-Pflicht ist § 82 AufenthG, nicht generisch

Research-scout schreibt: „Aufenthaltstitel-Korrespondenz hat eigene Norm-Welt".
Konkretisierung:

- § 82 Abs. 1 AufenthG: Mitwirkungspflicht des Ausländers bei Geltendmachung
  geltender Tatsachen.
- § 82 Abs. 4 AufenthG: erscheinens- und persönliche-Anhörungs-Pflicht.
- Adress-Mitteilung: § 86 AufenthG (Datenerhebung durch Ausländerbehörden) +
  § 87 AufenthG (Übermittlungen an andere Behörden) + AZRG-Vorschriften.
- **Kein automatischer § 36-BMG-Push an Ausländerbehörde** — der Bürger muss
  selbst die ABH informieren (Hard-Lock). V1.1-Mehmet-Persona muss diesen
  Hard-Lock genauso zeigen wie V1-Stammdaten („Anschrift-Update geht nicht
  automatisch an die ABH").

# Hard-Lines für V1.1 Spec (verifier-locked candidates)

Diese Hard-Lines sind aus der Norm-Sicht zwingend; product-architect muss sie
in der Spec als nicht-verhandelbar verbuchen.

## § H-1. Postfach-Norm-Anker ist § 9 OZG, mit Cross-Reference zu § 41 Abs. 2a VwVfG und § 122a Abs. 4 AO

- Postfach-Card: Norm-Pointer = `§ 9 OZG (idF OZG-Änderungsgesetz, in Kraft
  24.07.2024)`.
- Notification-Präferenzen-Picker pro Vorgangs-Kategorie: zeigt pro Kategorie
  die spezifische Bekanntgabe-Norm:
  - Bürgeramt / Sonstige Bundesleistungen via BundID-Postfach → § 9 OZG
  - Finanzamt / BZSt (ELSTER-Posteingang) → § 122a Abs. 4 AO
  - DRV / GKV (eigene Portale, kein BundID) → § 41 Abs. 2a VwVfG i.V.m.
    § 36a SGB I (elektronische Kommunikation Sozialverwaltung)
  - Standesamt / Ausländerbehörde / KFZ → kein elektronischer Bekanntgabe-
    Standard, weiterhin Postbrief (§ 41 Abs. 2 VwVfG); Hard-Lock-Hinweis.

## § H-2. Einwilligung „pro Inanspruchnahme einer Verwaltungsleistung", kein App-Master-Toggle

- Postfach-Card darf **keinen** Toggle „§ 9-OZG-Einwilligung pauschal erteilen"
  bieten.
- Stattdessen: Status-Badge (Postfach aktiv / inaktiv) + Wegweiser-Pointer
  „Aktivierung im BundID-Konto unter `id.bund.de`" + erläuternder Text:
  „Die elektronische Bekanntgabe wird im jeweiligen Online-Antrag jeder
  Behörde aktiviert (§ 9 Abs. 1 S. 2 OZG: Opt-Out im Antrag möglich)."
- Self-Edit der Einwilligung in unserer App ist nicht zulässig — wir sind
  privater Aggregator, nicht Träger öffentlicher Gewalt (carry-over aus
  V1-Spec-Vermerk Trennung hoheitlich ↔ privat).

## § H-3. SMS-/Push-Kanal niemals als Bekanntgabe-Kanal darstellen

- In der Notification-Präferenz-UI sind die Kanäle SMS und Push **nur als
  „Notification über Postfach-Eingang"** darstellbar, nie als „Bescheid-Kanal".
- Disclaimer-Marker `sms_push_only_notification` an jedem Kanal.
- Hard-Lock: Wenn der Bürger SMS-Präferenz wählt, zeigt die UI explizit:
  „Bescheide werden weiterhin im Postfach bereitgestellt; per SMS erhalten Sie
  nur einen Hinweis auf neue Post."

## § H-4. Bekanntgabe-Fiktionen in der UI vereinheitlicht zitieren

- 4-Tage-Fiktion erscheint in zwei Welten: § 9 OZG (BundID-Postfach) und
  § 122a Abs. 4 AO (ELSTER). UI-Text: „Der Bescheid gilt am vierten Tag nach
  Bereitstellung als bekannt gegeben."
- Tag-nach-Abruf-Fiktion: nur § 41 Abs. 2a VwVfG (Behörden-Eigenportal). Wenn
  in der V1.1-Demo nicht abgebildet, kann sie weggelassen werden — sonst
  korrekt zitieren.
- Konsistenz-Check: Posteingang V1.5.1 zitiert in Anna's Steuerbescheid-
  Szenario bereits § 122a Abs. 4 AO; das muss V1.1 nicht-widersprüchlich halten.

## § H-5. EUDI-Wallet ist Identity/Attestation-Träger, kein Notification-Layer

- EUDI-Sub-Tab in V1 zeigt PID-Felder als Attestation-Vorschau. V1.1 darf
  daran **nichts** ändern — kein „EUDI-Notification" als realer Kanal.
- Bei jeder Mention von EUDI-Push: Disclaimer-Marker `eudi_push_speculative`.
- Norm-Anker: Implementing Regulation (EU) 2024/2980 (Notifications zwischen
  Mitgliedstaaten/Kommission, **nicht** Behörde→Bürger).

## § H-6. DE-Mail wird in der UI nicht als Kanal-Card gezeigt

- Sterbender Service (Verwaltung raus 31.08.2024, Vollabschaltung 31.12.2026,
  Read-Only Q1 2027) — kein Demo-Mehrwert, hohe Verwirrungsgefahr.
- Falls historische Korrespondenz noch in Anna's mock-letters auftaucht, darf
  das einen DE-Mail-Briefkopf haben, aber in den **aktiven Kanal-Cards** keine
  DE-Mail-Karte.

## § H-7. Sozialdaten-Hard-Lock: Notification-Inhalte dürfen keine Sozialdaten an Dritte offenlegen

- Erweitert über research-scout-Hard-Line-5 hinaus: Wenn Bürger SMS-Präferenz
  für „Sozialleistungen" wählt, zeigt die UI einen Disclaimer:
  „Aus Datenschutzgründen (§ 35 SGB I, § 67a SGB X) enthält die SMS keine
  inhaltlichen Angaben — nur einen Hinweis auf neue Post im Postfach."
- Disclaimer-Marker `sozialdaten_notification_redaction`.

## § H-8. AufenthG-Hard-Lock: Aufenthaltsbescheide kommen nicht ins BundID-Postfach

- Mehmet-Persona zeigt für Vorgangs-Kategorie „Aufenthalt / ABH": **Postbrief
  als Pflicht-Default**; Notification-Präferenz für ABH ist deaktiviert mit
  Hinweis: „Die Ausländerbehörden sind 2026 noch nicht an das BundID-Postfach
  angebunden. Bescheide nach §§ 86, 87 AufenthG erfolgen weiterhin per
  Postbrief (§ 41 Abs. 2 VwVfG)."
- Quelle: keine ABH-BundID-Anbindung in der Bundesdruckerei-Liste der 1.600
  Onlinedienste; AufenthG enthält keine Postfach-Bekanntgabe-Norm.

## § H-9. Notification-Präferenzen sind Speculative-2027, kein heutiger Stand

- Cross-Channel-Routing pro Vorgangs-Kategorie ist heute (2026) **nirgends**
  in DE produktiv — Bürger:in kann bei Behörde X heute nicht „bitte SMS
  statt Brief" einstellen.
- Disclaimer-Marker `cross_channel_routing_speculative` an der gesamten
  Sektion, nicht nur einzelnen Cards.
- Loom-Cut-Drehbuch sollte den Speculative-Charakter explizit ansprechen
  („In einer 2027-Vision könnte der Bürger pro Vorgangs-Kategorie wählen…").

## § H-10. DSGVO Art. 13 Inline-Hinweis bei jedem Self-Edit-Akt

- Self-Edit-Felder in V1.1 (laut research-scout): Mobilfunk, Notification-
  Präferenzen, Sprachpräferenz.
- Vor dem Speichern: Modal mit Verantwortlicher (Demo-App-Trägerschaft;
  Disclaimer „nicht-hoheitlich"), Zweck (Demo), Rechtsgrundlage (Art. 6
  Abs. 1 lit. a DSGVO — Einwilligung), Speicherdauer („nur localStorage in
  Ihrem Browser"), Betroffenenrechte (Hinweis auf Reset-Funktion).
- Pattern carry-over aus V1-Religion-Modal.

# Realistic Auto-fill from existing Stammdaten V1

| Feld V1.1 | Quelle | Wirklich verfügbar? | Kommentar |
|---|---|---|---|
| Postanschrift (Cross-Reference) | V1 Anschrift-Sektion (BMG-Daten) | ja | Read-only Cross-Reference, kein Doppel-Display |
| Verifizierte E-Mail | V1 Persona-Daten (`bundid_email`) — heute nicht im V1 sichtbar als Feld | ja, V1.1 macht es nur sichtbar | Keine Erhebung, nur Read-Mapping |
| Mobilfunknummer | V1 Persona-Daten (`bundid_mobil`) — heute nicht im V1 sichtbar | partiell — nur wenn Persona sie hat | Self-Edit erlaubt (kein hoheitliches Register hält dies); SMS-Magic-Link-Verifikation als Mock-Flow |
| Postfach-Status | V1 Persona-Daten (`bundid_postfach_aktiv: bool`) — neu in Persona-Schema | nein, neu zu erheben | Aus Persona-Seed: Anna aktiv, Mehmet inaktiv (zeigt ABH-Hard-Lock), Schmidt teilaktiv |
| Notification-Präferenzen pro Vorgangs-Kategorie | nirgends — komplett neu | nein | Speculative-2027; nur Mock-State in localStorage |
| EUDI-Wallet-Verknüpfung | V1 Sub-Tab Wallet (PID) | reuse | Keine Erweiterung in V1.1, höchstens Pointer auf den V1-Sub-Tab |

**Persona-Schema-Erweiterung-Vorschlag** (für mock-backend-coder):

```ts
// src/types/persona.ts erweitern
type Persona = {
  // ... V1 Felder
  kontakt: {
    bundid_email: { wert: string; verifiziert_am: ISODate };
    bundid_mobil?: { wert: string; verifiziert_am?: ISODate };
    bundid_postfach: {
      status: 'aktiv' | 'inaktiv' | 'teilaktiviert';
      aktiviert_am?: ISODate;
    };
    notification_praeferenzen: {
      buergeramt: 'postfach' | 'email' | 'sms' | 'brief';
      finanzamt: 'elster_posteingang' | 'email' | 'brief';
      sozialleistungen: 'postfach' | 'brief';
      familienleistungen: 'postfach' | 'email' | 'brief';
      auslaenderbehoerde: 'brief';   // hard-locked, kein Picker
      sonstige: 'postfach' | 'brief';
    };
  };
};
```

# Behörden-Zuständigkeit (authoritative pro Datum)

| Datum | Authoritative Stelle | 2026er Realität |
|---|---|---|
| Postanschrift | Meldebehörde (Bürgeramt / Einwohnermeldeamt), kommunal nach Landesrecht designiert | § 3 Abs. 1 Nr. 7 BMG; Update via § 17 BMG persönlich oder eWA |
| BundID-E-Mail | BundID-Trägerin: Bundesagentur für Arbeit für die ID-Authentifizierungs-Komponente; FITKO Verwaltung; technisch Bundesdruckerei-Plattform | self-attested + Magic-Link-verifiziert |
| Mobilfunk | keine staatliche Quelle; BundID-Self-Attestation | optional, freiwillig |
| BundID-Postfach (Inhalt) | jeweils anbindende Behörde (Familienkasse, Wohngeldbehörde, …) bestimmt was hineingelegt wird | § 9 OZG für Bekanntgabe, § 2 Abs. 7 OZG für Postfach-Definition |
| ELSTER-Posteingang | jeweiliges Finanzamt; technisch BZSt-Plattform | § 122a AO |
| Sozialleistungs-Postfächer (DRV, GKV) | jeweilige Sozialversicherungsträger; eigene Portale, **kein** BundID | § 36a SGB I i.V.m. § 41 Abs. 2a VwVfG |
| AufenthG-Korrespondenz | jeweilige Ausländerbehörde (kommunal/Land), Mehmet-Persona zugeordnete LEA Köln | postalisch, § 41 Abs. 2 VwVfG |
| Standesamt-Korrespondenz | jeweiliges Standesamt | postalisch, lokales StAG-Recht |

# Open Questions für concept-verifier

Folgende Punkte sind aus Norm-Sicht jetzt klar genug für einen Verifier-Hand-off,
aber konzeptionell offen — concept-verifier sollte sie scharf prüfen:

## V-1. Demo-Wow-Loss in V1.1

Stammdaten V1 lebt von der „6-Behörden-Sync-Cascade nach Umzug"-Wow-Sequenz.
V1.1 ist demgegenüber rein Read-Layer für Kontakt-Schicht — Risiko: kein
neuer Wow. Research-scout schlägt vor: Wow durch Aktivitätsprotokoll-Erweiterung
(„Notification-Adresse mit-umgezogen"). Ist das stark genug? Oder muss V1.1
ein zusätzliches Wow-Element bekommen (z.B. eine **konkrete Demo: Anna
wechselt Notification-Präferenz „Familienkasse: Brief → Postfach", und das
Aktivitätsprotokoll zeigt sofort den nächsten Bescheid im Postfach statt
Brief")?

## V-2. Notification-Präferenz-Speculative: zeigen oder weglassen?

Hard-Line-9 sagt: Cross-Channel-Routing ist Speculative-2027. Frage an
verifier: Ist das Demonstrieren *trotz* Speculative-Charakter wertvoll
(Vision-Träger), oder gefährlich (suggeriert Kontrolle, die nicht existiert)?
Falls letzteres: Sektion komplett out-of-scope V1.1, V1.1 reduziert sich auf
4 Read-Cards.

## V-3. Persona-Spread reicht?

Anna (post-Umzug, alle Kanäle aktiv), Mehmet (ABH-Hard-Lock), Schmidt
(Familienkasse, teilaktiv). Reicht das? Oder fehlt eine Persona für „Kein
BundID, nur Länder-Konto" (z.B. fiktive Persona „Berlin-Senior, nur
Mein-Servicekonto-Berlin")? Letzteres wäre realistisch (BundID-Quote 2026
ist nicht 100 %), aber Scope-Aufwand.

## V-4. Konsistenz mit Posteingang V1.5.1

Posteingang zitiert § 122a AO. Stammdaten V1.1 zitiert § 9 OZG, § 41 Abs. 2a
VwVfG, § 122a AO. Sind die Norm-Zitate über alle Vorgangs-Demo-Pfade
konsistent? Verifier soll prüfen: ist die NormZitatSpan-Lookup-Map im
gemeinsamen Bestand, oder driften die Tabellen auseinander?

## V-5. Föderalismus-Realismus: Service-BW / Mein-Servicekonto-Berlin

OZG 2.0 erlaubt 3-Jahres-Übergang für Länder-Konten. Heißt: 2026 existieren
parallel zu BundID die Konten Service-BW (BW), Mein-Servicekonto-Berlin (BE),
NRW-Konto, HH-Servicekonto, Servicekonto Bayern, etc. Soll V1.1 das
abbilden (Anna hat zusätzlich Mein-Servicekonto-Berlin)? Oder reicht die
BundID-Vereinfachung? Realismus-Pflicht: mindestens ein Disclaimer „Neben
BundID existieren Länder-Konten; in dieser Demo abstrahieren wir auf
BundID".

# Recommended Hard-Caps für Scope V1.1

V1.1 sollte Folgendes **nicht** tun, um sauber abgegrenzt zu bleiben:

## Out-of-scope V1.1

- ❌ **Abweichende Korrespondenz-Anschriften** pro Behörde (Familienkasse-
  Postfach-Adresse o.ä.) — kein zentrales Register, ist verwaltungsinternes
  Aktenfeld. Scope-Creep ohne Demo-Mehrwert.
- ❌ **Postfach-Aktivierung als Self-Edit-Akt in unserer App** — wir sind kein
  Träger öffentlicher Gewalt, dürfen § 9-OZG-Einwilligung nicht selbst
  einsammeln. Nur Status anzeigen + Wegweiser auf id.bund.de.
- ❌ **EUDI-Wallet als Notification-Layer demonstrieren** — kein eIDAS-2-
  Standard, würde Versprechensbruch sein.
- ❌ **App-Push-Notification über echte Mobile-OS-Push-API** — kollidiert mit
  Mock-Charakter, würde echte Berechtigungs-Anfragen auslösen. Push nur als
  visueller Mock im UI, nie als echter `Notification`-API-Call.
- ❌ **Echte E-Mail-Verifikation per Magic-Link** — kein Backend für
  Mail-Versand. E-Mail bleibt read-only aus Persona-Seed.
- ❌ **SMS-OTP echt versenden** — kein SMS-Provider. Mobilfunk-Verifikation
  ist Mock-Flow (zeigt OTP im UI als „[MOCK] OTP: 124857").
- ❌ **Sozialdaten-Inhalt in Mock-SMS** — Hard-Lock H-7 verbietet auch im
  Mock-Modus inhaltliche Sozialdaten in Nicht-Postfach-Kanälen.
- ❌ **Pflicht-Aktivierung des Postfachs als Demo-Choreographie** — Postfach-
  Aktivierung ist freiwillig (§ 9 Abs. 1 OZG). Demo darf nicht „du musst das
  aktivieren"-Druck aufbauen.
- ❌ **Notification-Präferenz pro einzelner Behörde** (nicht pro Kategorie)
  — UI-Cockpit-Falle, würde Risiko-3 verstärken. Maximal 6 Kategorien:
  Bürgeramt, Finanzamt, Sozialleistungen, Familienleistungen, Ausländerbehörde
  (hard-locked Brief), Sonstige.

## Eindeutig in-Scope V1.1

- ✅ 4 Kontakt-Cards (Postfach, E-Mail, Mobilfunk, Postanschrift-Cross-Ref)
- ✅ 1 Notification-Präferenz-Sektion mit 6 Vorgangs-Kategorien
- ✅ Aktivitätsprotokoll-Erweiterung (`posteingang.eingegangen`,
  `notification.gesendet`, `notification_praeferenz.geaendert`)
- ✅ NormZitatSpan-Lookup-Map-Erweiterung (§ 9 OZG, § 2 Abs. 7 OZG, § 36a
  SGB I, § 35 SGB I, § 67a SGB X, § 86 + § 87 AufenthG)
- ✅ DSGVO-Art-13-Inline-Hinweise bei Self-Edit (Mobilfunk + Präferenzen)
- ✅ 3 neue Disclaimer-Marker: `bundid_push_speculative`,
  `eudi_push_speculative`, `cross_channel_routing_speculative`
- ✅ 2 weitere Disclaimer-Marker neu: `sms_push_only_notification`,
  `sozialdaten_notification_redaction`
- ✅ Persona-Schema-Erweiterung um `kontakt`-Block (siehe Auto-fill-Tabelle)

# Final Note für concept-verifier

Die Vision ist legal-realistisch tragfähig, **wenn die Hard-Lines H-1 bis H-10
ohne Abstriche in die Spec eingehen**. Insbesondere § H-1 (Norm-Anker § 9 OZG),
§ H-2 (keine Pauschal-Einwilligung in unserer App), § H-3 (SMS niemals
Bekanntgabe-Kanal) und § H-9 (Cross-Channel-Routing als Speculative gemarkert)
sind die nicht-verhandelbaren Linien. Wenn der Verifier Abweichungen
identifiziert, eskaliert er bitte vor dem product-architect-Hand-off.
