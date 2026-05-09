---
topic: Umzug autopilot — change-of-address as a single user action that cascades to all Behörden
question: How realistic, painful, and prior-art-supported is a one-click Umzug-Cascade for the GovTech DE demo, and what legal/UX patterns can it borrow?
date: 2026-05-08
status: verified
confidence: medium
domain_validated_on: 2026-05-08
domain_validated_by: domain-expert
---

## TL;DR

- A real-world Umzug innerhalb Deutschlands triggers notifications to **8–12 separate parties** (Einwohnermeldeamt, Finanzamt, Krankenkasse, KFZ-Zulassung, Rundfunkbeitrag, Arbeitgeber, Bank, Versicherungen, ggf. Familienkasse, Kita/Schule, Strom/Gas, Telekom). Only Einwohnermeldeamt is statutorily required (within **2 weeks**, §17 BMG, bis zu 1.000 € Bußgeld nach §54 BMG).[^1][^4]
- Germany has rolled out the **Elektronische Wohnsitzanmeldung (eWA)** — but it stops at the Meldebehörde plus Personalausweis-Adressaufkleber. It does **not** cascade to Finanzamt, Krankenkasse, KFZ-Zulassung, Rundfunkbeitrag etc. Coverage as of late 2025: ~62.76 Mio Bürger:innen, ~2.500 angeschlossene Meldebehörden.[^5][^6][^11]
- Pain is well-documented: **eGovernment MONITOR 2025** finds 83 % satisfaction among those who *managed* to use eWA online, but trust in state has fallen to 33 % (von 38 % in 2022) and 51 % halten unzureichende digitale Services für mit-ursächlich. INSM Behörden-Digimeter 2026 reports only **~11 %** der OZG-Pflichtleistungen tatsächlich bundesweit digital nutzbar.[^7][^8]
- **The cascade pattern exists abroad**: Denmark (borger.dk Flytning + CPR, 5-Tage-Frist, automatische Folgeprozesse für PostNord, Krankenkarte, Hausarzt), Estonia (X-Road / Population Register, Once-Only verfassungsähnlich verankert), Singapore (MyInfo/OSCARS — eine Adressänderung bei ICA propagiert zu IRAS, SLA, HealthHub etc.), France (mon.service-public.fr — Mehrfach-Mitteilung in *einem* Formular, aber kein Echtzeit-Sync; Krankenkasse/Bank/Arbeitgeber/Schule explizit *nicht* abgedeckt). UK "Tell Us Once" deckt **nur Geburten und Sterbefälle**, nicht Umzüge — das ist ein häufiges Missverständnis.[^9][^10][^12][^13][^14]
- Legal vehicle für eine echte DE-Cascade existiert teilweise: **§§33–34 BMG** erlauben „regelmäßige Datenübermittlungen" der Meldebehörde an andere öffentliche Stellen ohne Einwilligung der betroffenen Person, sofern bundes- oder landesrechtlich geregelt. Das **Registermodernisierungsgesetz (RegMoG, 2021)** schafft die Steuer-ID als Ordnungsmerkmal und das Datenschutzcockpit; Stufen für das Meldewesen sind für **Nov 2025 / Mai 2026** vorgesehen. Privatwirtschaftliche Empfänger (Bank, Versicherung, Arbeitgeber) bleiben **außerhalb** der BMG-Datenübermittlung — diese brauchen Einwilligung (DSGVO Art. 6 Abs. 1 lit. a).[^15][^16][^17]

## Findings

### 1. Umzug-Realität heute: welche Stellen, welche Fristen

Eine vollständige Umzugskaskade umfasst typischerweise:

| Stelle | Pflicht? | Frist | Heute kanalisiert? |
|---|---|---|---|
| Einwohnermeldeamt (Anmeldung am neuen Ort) | gesetzlich, §17 Abs. 1 BMG | **2 Wochen** | persönlich oder eWA online[^1][^2][^4] |
| Personalausweis / Reisepass (Adressänderung) | gesetzlich (mit Anmeldung verknüpft) | bei Anmeldung | im eWA-Fluss enthalten — Adressaufkleber via Bundesdruckerei[^5] |
| Kfz-Zulassungsstelle (Fahrzeugschein/Brief Adresse) | gesetzlich, §13 FZV (sinngemäß) | unverzüglich | i.d.R. *nicht* im eWA — eigener Termin/Online-Dienst (i-Kfz)[^4] |
| Finanzamt | nicht zwingend, aber praktisch nötig (Steuernummer-Wechsel bei Umzug in anderes FA-Bezirk) | „zeitnah" | manuelle Mitteilung; ELSTER-Adresse ändert nicht Lohnsteuer-Daten beim AG[^4] |
| Krankenkasse (gesetzlich/privat) | vertraglich | unverzüglich | Online-Portal je Kasse, kein zentraler Push[^4] |
| Rundfunkbeitrag (Beitragsservice ARD/ZDF/Dlr) | beitragsrechtlich | unverzüglich | rundfunkbeitrag.de — **nicht** an Meldebehörde gekoppelt; Adressänderung wird *nicht* automatisch übermittelt[^4] |
| Arbeitgeber (Personalakte, Lohnsteuer) | arbeitsvertraglich | unverzüglich | manuell |
| Bank/Sparkasse | AGB-Pflicht | unverzüglich | manuell pro Bank |
| Versicherungen (Hausrat, KFZ-Haftpflicht, Privathaftpflicht, Lebens-, BU, …) | vertraglich | unverzüglich, Hausrat oft „vor Umzug" wegen Risikowechsel | manuell pro Versicherer |
| Familienkasse (bei Kindern) | bei Zuständigkeitswechsel | „zeitnah" | manuelle Mitteilung |
| Kita / Schule | organisatorisch | situativ | manuell |
| Energie-/Wasser-/Telekom-Verträge | vertraglich | situativ | manuell |

Die Liste der primären Behörden in der Aufgabenstellung (Einwohnermeldeamt, Finanzamt, KFZ-Stelle, Krankenkasse, Rundfunkbeitrag, Arbeitgeber, Bank, Versicherungen) ist **realistisch und vollständig** für die Demo — Familienkasse und Kita/Schule sind sinnvolle Erweiterungen für Personas mit Kindern (Anna, Familie Schmidt).[^4]

§17 BMG im Wortlaut (Abs. 1): „Wer eine Wohnung bezieht, hat sich innerhalb von zwei Wochen nach dem Einzug bei der Meldebehörde anzumelden." Eine separate Abmeldung am alten Ort entfällt bei Umzug innerhalb DE — die Anmeldung übernimmt die Information automatisch (§17 Abs. 2 BMG erklärt das Sonder-Szenario der Auslandsabmeldung).[^1][^2]

### 2. Pain: wie viel Aufwand kostet die Kaskade heute

- **Statistisches Bundesamt**: Bürokratiekosten gesamt liegen Ende 2024 bei ~66,6 Mrd. €, zum 31.03.2025 bei ~65,0 Mrd. € (regelmäßiger Erfüllungsaufwand). Über **92 % der Befragten** empfinden den bürokratischen Aufwand als (eher) zu hoch.[^18] Die Quelle nennt keine pro-Umzug-Stundenzahl explizit; eine offizielle Aggregat-Zahl „Stunden für eine Umzugskaskade" konnte **nicht gefunden** werden. *(`not found` für die spezifische Zahl.)*
- **eGovernment MONITOR 2025 (Initiative D21 + TUM, gefördert vom BMDS, Erhebung Kantar)**:
  - 83 % Zufriedenheit bei denen, die **online** umgemeldet haben.
  - Vertrauen in den Staat: **33 %** (2022: 38 %).
  - **51 %** sehen unzureichende digitale Verwaltungsleistungen als mit-ursächlich für Vertrauensverlust.
  - „Digitale Nutzungslücke": **33 %** erledigen Verwaltungsangelegenheiten ausschließlich offline, obwohl ein Online-Dienst existiert.[^7][^19]
- **INSM Behörden-Digimeter 2026** (IW-Köln-Studie): Nur **11 %** der laut OZG verpflichtend zu digitalisierenden Verwaltungsleistungen sind bundesweit digital verfügbar (823 von 7.509). Bei aktuellem Tempo wäre die Verwaltung erst **2045** vollständig digital.[^8][^20]
- **Hamburg-Größenordnung**: ~250.000 Umzüge/Jahr allein in Hamburg.[^11] Bundesweit wechseln gemäß Destatis-Statistiken jährlich ca. 8–9 Mio. Menschen den Wohnsitz (*confidence: single-source* — exakte Aktualität in dieser Recherche nicht verifiziert; `domain-expert validate`).

**Zusammenfassend**: harte „X Stunden pro Umzug"-Zahl ist für DE öffentlich **nicht** sauber publiziert; die qualitativen Indikatoren (Vertrauensverlust, Digital-Lücke 33 %, INSM 11 %, 92 % „Aufwand zu hoch") liefern aber konsistente Pain-Evidenz auf System-Ebene.

### 3. Prior Art in Deutschland

**Elektronische Wohnsitzanmeldung (eWA)** — entwickelt von Hamburg + BMI, „Einer für Alle" (EfA), seit 2022 schrittweise bundesweit ausgerollt:
- Coverage Nov 2025: **62,76 Mio. Bürger:innen**, **2.500 Meldebehörden** angeschlossen.[^5][^6]
- Funktionsumfang: Anmeldung am neuen Wohnort + automatischer Adressaufkleber für Personalausweis (Bundesdruckerei) + Aktualisierung im Pass.
- Voraussetzung: BundID-Konto (perspektivisch DeutschlandID), Online-Ausweisfunktion, AusweisApp.
- **Cascade-Lücke**: eWA endet beim Meldewesen + Ausweispapieren. Krankenkasse, Finanzamt, Rundfunkbeitrag, KFZ etc. werden **nicht** automatisch informiert.[^5][^11]

**Berlin Service-Konto / service.berlin.de**: Online-Anmeldung Wohnsitz, Voraussetzung BundID + eID, ca. 15 Min Prozesszeit, manipulationssichere digitale Meldebestätigung. Reicht ebenfalls *nicht* über die Meldebehörde hinaus.[^21]

**BayernPortal — Wohnsitz online anmelden**: BayernID *oder* BundID, vorausgefüllte Stammdaten, Auswahl mit-umziehender Familienmitglieder, Wohnungsgeberbestätigung als Upload. Funktional vergleichbar mit eWA, gleiche Cascade-Lücke.[^22]

**Bund.de / Verwaltungsportal**: Sammeleinstieg, leitet auf das jeweilige Landesangebot (eWA-Variante) durch.[^5]

**ELFE — „Einfach Leistungen für Eltern"** (Bremen, BMFSFJ, in elf Bundesländern): zeigt das Cascade-Prinzip *für Geburten* (Geburtsurkunde + Elterngeld + Kindergeld + Namensbestimmung in einem Antrag, Once-Only). 36 h vom Antrag zur Bewilligung im Pilot. Keine direkte Übertragbarkeit auf Umzug, aber **wichtigster DE-Beweis**, dass Once-Only mit BundID + Datenaustausch zwischen Behörden technisch funktioniert.[^23]

**FIM — Föderales Informationsmanagement** (FITKO/IT-Planungsrat): einheitliche Beschreibung von Leistungen, Prozessen, Datenfeldern (drei Bausteine). FIM-Stammdatenschemata definieren, welche Felder rechtlich erforderlich/erlaubt sind. **Fundament**, kein Endprodukt — ohne FIM-Stammdaten kann eine Cascade nicht standardisiert werden.[^24][^25]

**OZG-Änderungsgesetz / 16 Fokusleistungen**: Wohnsitzanmeldung ist eine der priorisierten Fokusleistungen.[^26] (Detail-Liste konnte aus der Quelle in dieser Recherche nicht vollständig ausgelesen werden — HTTP 400 — `domain-expert validate`.)

**Was funktioniert**: eWA als EfA-Modell ist die erste echte bundesweite OZG-Erfolgsgeschichte; ELFE zeigt Cascade-Pattern in DE; FIM und RegMoG-Cockpit sind die fehlende Klammer.

**Was nicht funktioniert**: Cascade über Meldewesen + Ausweis hinaus existiert nicht; jede weitere Stelle (KK, FA, KFZ, Rundfunk) erfordert eine separate Aktion mit ggf. eigener Authentifizierung. Heterogene Landesportale (BayernID vs. Service-Konto Berlin vs. BundID) erzeugen Identitäts-Reibung.

### 4. Internationale Referenzen für die Cascade

**Estonia — Population Register + X-Road**:
- Once-Only ist gesetzlich verankert (Verbot redundanter Datenbanken).[^9][^27]
- Adressänderung im Bevölkerungsregister wird über X-Road an alle berechtigten Register propagiert (Steuer, Gesundheit, Wahlen, Bildung etc.).
- Cross-Border-Beispiel mit Finnland: Adresswechsel zwischen den Ländern wird *automatisch* in beiden Registern aktualisiert.[^9][^27]
- *UX-Pattern zu übernehmen*: Bürger sieht in einem Datenschutz-Cockpit jede Abfrage seiner Daten durch eine Behörde — Vertrauen via Transparenz statt Einwilligungs-Pop-ups. (Analog: RegMoG „Datenschutzcockpit".)

**Denmark — borger.dk Flytning + CPR**:
- 5-Tage-Frist nach Umzug (vs. DE 14 Tage).[^10][^28]
- Eingabe via MitID + CPR-Nummer, online Self-Service.
- **Automatische Folge-Effekte**: PostNord wird benachrichtigt, neue Krankenkarte wird per Post zugeschickt, Hausarzt-Wechsel kann im selben Flow gemacht werden.[^10]
- *UX-Pattern zu übernehmen*: „Hier sind die nächsten 3 Schritte, die wir für Sie erledigt haben" — Quittungs-Screen statt Status-Email.

**UK — gov.uk**:
- „Tell Us Once" gilt **nur für Tod** (und in Schottland Geburt) — ein häufiges Missverständnis im DE-Diskurs. Es informiert HMRC, DWP, Passport Office, DVLA, Local Council etc. mit *einer* Eingabe nach dem standesamtlichen Akt.[^29][^30]
- Für Umzug existiert *kein* Tell-Us-Once-Pendant: Bürger müssen DVLA, HMRC (Personal Tax Account), Council, NHS jeweils einzeln aktualisieren — DVLA-Adressänderung des V5C (Fahrzeugschein) propagiert immerhin zur KFZ-Steuer.[^31]
- *UX-Pattern zu übernehmen*: Die *Form* von Tell Us Once (eine Eingabe → mehrere Stellen) ist das Demo-Vorbild — auch wenn UK das selbst nur für Sterbefälle anbietet. Der "Reference Number"-Mechanismus (28 Tage Gültigkeit, separate Vorlage bei jeder Behörde, falls nötig) ist eine sinnvolle Notausstiegs-Architektur.[^29]

**Singapore — MyInfo / OSCARS**:
- Adressänderung wird bei ICA (Immigration Checkpoints Authority) gemacht; via OSCARS (One-Stop Address Reporting) automatisch synchronisiert mit Singpass/MyInfo, IRAS (Steuer), SLA (Land), HealthHub und allen ICA-angebundenen Diensten.[^12]
- *UX-Pattern zu übernehmen*: ein einziges authoritatives Quellsystem (in DE wäre das die Meldebehörde via §33 BMG) und alles andere konsumiert dort.

**Frankreich — mon.service-public.fr / FranceConnect**:
- „Changement d'adresse en ligne" erlaubt Mehrfach-Mitteilung in einem Formular (Steuern, Familienleistungen CAF, Sozialversicherung CPAM, Energieversorger etc.).
- **Wichtige Realismus-Begrenzung**: Die Übermittlung ist nicht in Echtzeit; **Krankenkasse (Mutuelle), Bank, Arbeitgeber, Schulen, Hausrat-/KFZ-Versicherung sind explizit nicht abgedeckt**.[^13]
- Anmeldung kann 3 Monate vor bis 3 Monate nach Umzug erfolgen (sehr großzügiges Frist-Modell vs. DE 14 Tage).[^13]
- *UX-Pattern zu übernehmen*: ehrliche Trennung von „erledigen wir für Sie" vs. „wir erinnern Sie daran" vs. „Sie müssen selbst tun" — kein Cascade-Theater.

### 5. Rechtsmechanik einer DE-Umzug-Cascade

**Was heute schon legal möglich ist (öffentliche Stellen)**:

- **§33 BMG** — Datenübermittlung zwischen Meldebehörden (alte ↔ neue) ist automatisiert vorgeschrieben. Bei Anmeldung am neuen Ort wird die alte Behörde informiert; daher entfällt die separate Abmeldung.[^15][^32]
- **§34 BMG** — die Meldebehörde *darf* Daten an andere öffentliche Stellen (im Sinne des BDSG §2 Abs. 1–4) übermitteln, „soweit dies zur Erfüllung einer öffentlichen Aufgabe erforderlich ist". **Keine Einwilligung der betroffenen Person erforderlich.** Empfänger u. a.: Polizei, Staatsanwaltschaft, Gerichte, Nachrichtendienste, Zoll, **Steuerverwaltung**.[^17]
- **§34a BMG** — automatisierter Abruf, Personensuche, Sperrhinweise.[^33]
- **„Regelmäßige Datenübermittlungen"** (§36 BMG analog): wiederkehrende Übermittlung an bestimmte Empfänger nur, wenn bundes-/landesgesetzlich Anlass, Zweck, Empfänger und Daten festgelegt sind. **Beispiel im Bestand**: Meldebehörden übermitteln laufend Adressdaten an die **Finanzämter** (für die Steuer-ID), an den **Beitragsservice** (Rundfunkbeitrag) und an die **Wehrverwaltung**. Damit existiert die rechtliche Basis für genau zwei der heute noch manuell wirkenden Schritte (FA + Rundfunk) bereits — *die Wahrnehmung des Bürgers, „ich muss alles selbst machen", spiegelt nicht die Rechtslage*.[^15][^32] (`domain-expert validate`: exakter Stand der Rundfunkbeitrag-Meldedaten-Übermittlung.)

**Was das Registermodernisierungsgesetz (RegMoG, in Kraft seit 31.08.2023 für Art. 1, 2 und Teile von Art. 3) verändert**:
- Steuer-ID als bundesweites Ordnungsmerkmal in 51 Verwaltungsregistern.
- **Datenschutzcockpit** als Bürger-Sichtbarkeit aller Übermittlungen.
- Identitätsdatenabruf (IDA) beim BVA als technische Schicht.
- Stufen für das **Meldewesen** stehen für **November 2025 / Mai 2026** an.[^16][^34]

**Was DSGVO/Verfassungsrecht limitiert**:
- **Art. 6 Abs. 1 lit. e DSGVO**: öffentliche Aufgaben mit Rechtsgrundlage decken §34 BMG.
- **Art. 9 DSGVO** (besondere Datenkategorien — Gesundheitsdaten): Krankenkassen-Mitgliedschaft selbst ist keine Gesundheitsdatenübermittlung, *aber* der Status als Mitglied einer bestimmten Kasse kann sensitiv sein. Die Übermittlung KK-Mitgliedschaft ↔ Meldebehörde benötigt eigene Rechtsgrundlage. (`domain-expert validate`.)
- **Volkszählungsurteil 1983 + Recht auf informationelle Selbstbestimmung**: das Bundesverfassungsgericht hat 2021 das RegMoG nicht beanstandet, aber die Trennung von Datentöpfen und das Cockpit-Prinzip zur Pflicht gemacht.
- **Privatwirtschaftliche Empfänger** (Bank, Versicherung, Arbeitgeber, private Krankenkasse als Unternehmen, Telekom, EVUs) liegen **außerhalb** §34 BMG. Übermittlung nur mit **Einwilligung der betroffenen Person** (Art. 6 Abs. 1 lit. a DSGVO) — typischerweise als bewusster Klick im UI mit Widerrufbarkeit.[^17]
- **OZG-Hub / Portalverbund**: bilaterale Konnektoren zwischen Bundesportal und privatwirtschaftlichen Drittanbietern existieren konzeptionell, aber kein einheitlicher „Bank-/Versicherungs-Hub" für Adressdaten — das wäre Gegenstand einer eigenständigen Initiative bzw. einer EUDI-Wallet-basierten attestation-driven Lösung.

**Implikation**: Eine *legal saubere* Umzug-Autopilot-Demo unterscheidet zwingend zwei Datenflüsse:

1. **Behörden-Cascade** (Meldebehörde → Finanzamt, KFZ-Zulassung, Rundfunkbeitrag, Familienkasse, Wehrverwaltung): rechtlich §34 BMG + RegMoG; UI-mäßig „erledigen wir für Sie" — der Bürger sieht im Cockpit, was bei wem ankam.
2. **Privatwirtschaftliche Folgeschritte** (Bank, Versicherungen, Arbeitgeber, Energie, Telekom): Einwilligungs-Klick je Empfänger, optional EUDI-Wallet-Credential („verifizierte Adresse") als push.

## Implications for our demo

- **Hero-Screen**: ein Eingabefeld (neue Adresse + Einzugsdatum + Wohnungsgeberbestätigung-Upload), unterhalb davon eine *gesplittete* Cascade-Liste:
  - **Block A „Erledigen wir automatisch"** (Meldebehörde, Personalausweis, Finanzamt, Rundfunkbeitrag, Familienkasse, KFZ-Adresse) — gestützt auf §34 BMG; mit Live-Status-Animation und „basis-rechtlich: §34 BMG i.V.m. RegMoG".
  - **Block B „Mit Ihrer Einwilligung jetzt"** (Krankenkasse, Bank, Versicherungen, Arbeitgeber, Energie/Telekom) — Toggle pro Empfänger, EUDI-Wallet-„VerifiziertesAdress"-Credential als Push, Widerrufs-Hinweis.
  - **Block C „Bitte selbst erledigen"** (Kita-Anmeldung, Hausarztwahl, Schule) — ehrliche Restliste mit Vorlage-Briefen aus dem Posteingang generiert.
- **Reasoning visible**: jede Zeile zeigt Frist (z. B. „Anmeldung Meldebehörde: 14 Tage, BMG §17 — wir machen es jetzt"), Status (gesendet / bestätigt / Frist läuft), und Rechtsgrundlage. Das erzeugt das Vertrauen, das laut eGov-Monitor 2025 fehlt.
- **Datenschutzcockpit-Klon**: dedizierter Tab `/datenschutz` zeigt für jede Übermittlung Empfänger, Zweck, Rechtsgrundlage, Zeitstempel — direkt analog RegMoG-Cockpit. Das ist der bewusste Gegenentwurf zu Gosuslugi-Ästhetik und gleichzeitig der konkreteste Beleg für „privacy by design" im Mission-Statement.
- **Frist-Asymmetrie als UX-Feature**: 14 Tage BMG vs. „unverzüglich" KFZ vs. „idealerweise vor Umzug" Hausrat — das Demo macht die unterschiedlichen Fristen sichtbar als Countdown-Chips (dnk: `<FristCountdown>` Komponente bereits in CLAUDE.md vorgesehen).
- **Persona-Hooks**:
  - **Anna Petrov**: Aufenthaltstitel ist an die Adresse im AZR geknüpft → die Cascade muss die **Ausländerbehörde** als optionalen Empfänger anzeigen (BMG §34 deckt das, aber nicht jede ABH ruft online ab — `domain-expert validate`).
  - **Familie Schmidt**: Familienkasse + Kita-Wechsel → schöner Crossover zur Kindergeburt-Bündel-Demo (Vorgang #2).
  - **Mehmet Yıldız**: Selbstständiger → Gewerbeummeldung beim Gewerbeamt, IHK, Berufsgenossenschaft sind Teil der Cascade — Differenzierung per Persona-Profil.
- **Demo-Realismus**: in der Mock-Backend-Latenz die DE-typische Realität spiegeln (Meldebehörde 300–800 ms „bestätigt", Finanzamt 1.5–3 s, Rundfunkbeitrag 5 s mit gelegentlichem Timeout — *das* ist die Geschichte).
- **Don't claim what UK doesn't deliver**: das Demo darf nicht „wie UK Tell Us Once" sagen, weil TUO Umzüge gar nicht abdeckt — stattdessen Estonia + Denmark + Singapore als Vorbilder zitieren.

## Open questions

- Exakte aktuelle Liste aller heute schon nach §36 BMG „regelmäßig" empfangenden Stellen (Beitragsservice, Finanzämter, Wehrverwaltung — und welche weiteren?). `domain-expert validate`.
- Stand der RegMoG-Stufe „Meldewesen" zum Stichtag Mai 2026 — ist die Schnittstelle Meldebehörde ↔ Identitätsdatenabruf produktiv oder Pilot?
- Hat eWA in einem Bundesland Pilot-Cascading zu Krankenkassen/KFZ getestet? Hamburg-Roadmap erwähnt das Thema, aber kein konkretes Pilot-Ergebnis in der Recherche gefunden — `domain-expert validate`.
- Datenschutz-Wertung: Wie eng ist die Einwilligungs-Erfordernis bei Krankenkassen-Adressdaten (Art. 9 DSGVO oder reguläres Art. 6)? `domain-expert validate`.
- Konkrete Stunden/Min-Aufwand-Zahl pro Umzug für DE: in dieser Recherche `not found` — Bitkom-Umfragen oder eGov-Monitor-Rohdaten 2024/2025 prüfen.
- Statistik bundesweiter Umzüge/Jahr: Hamburg ~250.000 belegt, Bundeszahl als single-source — Destatis Wanderungsstatistik nachverifizieren.

## Hand-off to domain-expert

Folgende Aussagen sind **load-bearing** für den Concept und benötigen explizite Bestätigung/Korrektur durch domain-expert, bevor concept-verifier sie adversarial prüft:

1. **§17 BMG = 14 Tage Anmeldefrist + Bußgeld bis 1.000 € nach §54 BMG.** Bestätigung gewünscht: ist der Bußgeldrahmen aktuell gültig, wird er in der Praxis genutzt?
2. **Abmeldung am alten Ort entfällt automatisch durch Anmeldung am neuen Ort (innerhalb DE).** §17 Abs. 2 BMG.
3. **§34 BMG erlaubt Datenübermittlung von Meldebehörde an andere öffentliche Stellen ohne Einwilligung der Person**, sofern für deren öffentliche Aufgaben erforderlich. Implikation: Finanzamt, KFZ-Zulassungsstelle, Familienkasse, Wehrverwaltung dürfen heute schon automatisiert versorgt werden.
4. **§36 BMG / „regelmäßige Datenübermittlungen"** existieren produktiv für mindestens: Finanzämter (Steuer-ID), Beitragsservice (Rundfunkbeitrag), Wehrverwaltung. Welche weiteren Empfänger? Welcher Anteil der Bürger weiß das?
5. **eWA-Funktionsumfang Stand Mai 2026**: 62,76 Mio. Bürger:innen, ~2.500 Meldebehörden, *keine* automatische Cascade über Meldewesen + Personalausweis hinaus. Domain-expert: korrekt? Hat sich der Funktionsumfang in 2026 erweitert?
6. **RegMoG-Status**: Steuer-ID als Ordnungsmerkmal aktiv seit 31.08.2023, Datenschutzcockpit operativ, Stufe „Meldewesen" Nov 2025 / Mai 2026 geplant. Aktueller Live-Stand zum Stichtag dieses Dokuments?
7. **DSGVO-Klassifikation Krankenkassen-Adressübermittlung**: Art. 6 oder Art. 9? Sind GKVen öffentliche Stellen i.S.d. §34 BMG (Körperschaften des öffentlichen Rechts) — fallen sie *automatisch* unter §34 oder brauchen sie eigene Rechtsgrundlage?
8. **Privatwirtschaftliche Empfänger** (Bank, Versicherung, Arbeitgeber, PKV als Unternehmen): Übermittlung **nur** mit Einwilligung der Person nach Art. 6 Abs. 1 lit. a DSGVO. Bestätigt?
9. **Aufenthaltstitel-Adresse / Ausländerbehörde**: ist die ABH an die regelmäßigen BMG-Übermittlungen angeschlossen, oder ruft sie nur on-demand ab? Relevant für Persona Anna.
10. **OZG Fokusleistungen**: Wohnsitzanmeldung ist eine — domain-expert bitte vollständige Liste der 16 Fokusleistungen und welche bereits live, welche im Backlog für Cross-Verweis aus Dashboard.

## Sources

[^1]: [§ 17 BMG — Anmeldung, Abmeldung (gesetze-im-internet.de)](https://www.gesetze-im-internet.de/bmg/__17.html) — accessed 2026-05-08
[^2]: [§ 17 BMG (buzer.de)](https://www.buzer.de/17_BMG.htm) — accessed 2026-05-08
[^3]: [Melderecht in Deutschland — Auswärtiges Amt](https://prag.diplo.de/cz-de/service/07-aufenthaltintschechien/seite-melderecht-in-deutschland-1128100) — accessed 2026-05-08
[^4]: [Nach dem Umzug: Ummeldung & Behördengänge Checkliste 2026 (umzugsfirmen-check.de)](https://www.umzugsfirmen-check.de/nach-umzug-ummeldung-behoerdengaenge-checkliste) — accessed 2026-05-08
[^5]: [Elektronische Wohnsitzanmeldung — 55 Mio. Bundesbürger:innen können sich digital ummelden (BMDS)](https://bmds.bund.de/aktuelles/aktuelle-meldungen/detail/elektronische-wohnsitzanmeldung-55-millionen-bundesbuergerinnen-und-buerger-koennen-sich-nach-einem-umzug-digital-ummelden) — accessed 2026-05-08
[^6]: [Bundesweit ausgerollt (move-online.de)](https://www.move-online.de/k21-meldungen/bundesweit-ausgerollt/) — accessed 2026-05-08
[^7]: [eGovernment MONITOR 2025 (Initiative D21)](https://initiatived21.de/publikationen/egovernment-monitor/2025) — accessed 2026-05-08
[^8]: [INSM Behörden-Digimeter 2026 — Pressemitteilung](https://www.insm.de/aktuelles/pressemitteilungen/insm-behoerden-digimeter-2026-deutschlands-verwaltung-bleibt-digitalwueste-nur-11-prozent-der-dienstleistungen-online-moeglich) — accessed 2026-05-08
[^9]: [Estonia & Finland Population Registry — automatic data exchange via X-Road (ERR News)](https://news.err.ee/1609877785/estonia-finland-update-automatic-population-registry-data-exchange) — accessed 2026-05-08
[^10]: [How to change your Danish address on borger.dk (The Copenhagen Post)](https://cphpost.dk/2024-02-01/things-to-do/guide/how-to-change-your-danish-address-on-borger-dk/) — accessed 2026-05-08
[^11]: [Elektronische Wohnsitzanmeldung — Digitale Stadt Hamburg](https://digital.hamburg.de/digitale-stadt/urbanes-leben/elektronische-wohnsitzanmeldung-644096) — accessed 2026-05-08
[^12]: [Update Residential Address — Singpass / ICA](https://ask.gov.sg/singpass/questions/clul08v6p001mufi2ju0z5b09) — accessed 2026-05-08
[^13]: [Changement d'adresse en ligne — Service-Public.fr](https://www.service-public.gouv.fr/particuliers/vosdroits/R11193) — accessed 2026-05-08
[^14]: [Tell Us Once — gov.uk (death only)](https://www.gov.uk/tell-us-once) — accessed 2026-05-08
[^15]: [§ 33 BMG — Datenübermittlungen zwischen den Meldebehörden (juraforum.de)](https://www.juraforum.de/gesetze/bmg/33-datenuebermittlungen-zwischen-den-meldebehoerden) — accessed 2026-05-08
[^16]: [Registermodernisierungsgesetz — FAQs (BMI)](https://www.bmi.bund.de/SharedDocs/faqs/DE/themen/moderne-verwaltung/registermodernisierung/registermodernisierung-faq-liste.html) — accessed 2026-05-08
[^17]: [§ 34 BMG — Datenübermittlungen an andere öffentliche Stellen (gesetze-im-internet.de)](https://www.gesetze-im-internet.de/bmg/__34.html) — accessed 2026-05-08
[^18]: [Bürokratiekostenindex / Belastungsbarometer — Statistisches Bundesamt](https://www.destatis.de/DE/Themen/Staat/Buerokratiekosten/_inhalt.html) — accessed 2026-05-08
[^19]: [eGovernment MONITOR 2025 — Pressemitteilung „Staatsvertrauen zurückgewinnen" (Initiative D21)](https://initiatived21.de/presse/egovernment-monitor-2025-wie-die-digitale-verwaltung-helfen-kann-staatsvertrauen-zurueckzugewinnen) — accessed 2026-05-08
[^20]: [INSM Behörden-Digimeter 2026 — Volltext PDF](https://files.insm.de/uploads/2025/04/20261203_INSM-Behoerden-Digimeter-2026.pdf) — accessed 2026-05-08
[^21]: [Wohnsitz anmelden — Service Berlin](https://service.berlin.de/dienstleistung/120686/) — accessed 2026-05-08
[^22]: [Wohnsitz online anmelden — BayernPortal](https://www.bayernportal.de/dokumente/onlineservice/57884867867) — accessed 2026-05-08
[^23]: [ELFE — Einfach Leistungen für Eltern (service.bremen.de)](https://www.service.bremen.de/dienstleistungen/elfe-die-namensbestimmung-den-elterngeldantrag-und-den-kindergeldantrag-gleichzeitig-als-kombinierte-familienleistung-erledigen-180004) — accessed 2026-05-08
[^24]: [Föderales Informationsmanagement (FIM) — FITKO](https://www.fitko.de/produktmanagement/fim) — accessed 2026-05-08
[^25]: [FIM — digitale-verwaltung.de](https://www.digitale-verwaltung.de/Webs/DV/DE/onlinezugangsgesetz/ozg-grundlagen/fim/fim-node.html) — accessed 2026-05-08
[^26]: [OZG-Änderungsgesetz Fokusleistungen — digitale-verwaltung.de](https://www.digitale-verwaltung.de/Webs/DV/DE/onlinezugangsgesetz/das-gesetz/ozg-aenderungsgesetz/fokusleistungen/fokusleistungen.html) — accessed 2026-05-08 (HTTP 400 on direct fetch — content from search snippet)
[^27]: [Population Register — Estonia Ministry of Interior (Siseministeerium)](https://www.siseministeerium.ee/en/activities/population-procedures/population-register) — accessed 2026-05-08
[^28]: [Change of address — lifeindenmark.borger.dk](https://lifeindenmark.borger.dk/housing-and-moving/moving/change-address) — accessed 2026-05-08
[^29]: [Bereavement Advice Centre — How Tell Us Once works](https://www.bereavementadvice.org/topics/registering-a-death-and-informing-others/the-tell-us-once-service/) — accessed 2026-05-08
[^30]: [Report a death without a Tell Us Once reference number — gov.uk](https://www.gov.uk/after-a-death/report-without-tell-us-once) — accessed 2026-05-08
[^31]: [Tell DVLA you've changed address — gov.uk](https://www.gov.uk/tell-dvla-changed-address) — accessed 2026-05-08
[^32]: [Allgemeine Verwaltungsvorschrift zum BMG (BMGVwV) — Datenübermittlungen Kapitel](https://www.verwaltungsvorschriften-im-internet.de/bsvwvbund_27092022_VII2201041418.htm) — accessed 2026-05-08
[^33]: [§ 34a BMG — Personensuche / freie Suche im automatisierten Abruf](https://www.gesetze-im-internet.de/bmg/__34a.html) — accessed 2026-05-08
[^34]: [Was ist das Registermodernisierungsgesetz? — eGovernment Computing](https://www.egovernment.de/was-ist-das-registermodernisierungsgesetz-a-9a4ac4ba5046dc3a25e14e5353bc1eb5/) — accessed 2026-05-08

## Domain validation

Validation pass on 2026-05-08 by domain-expert. Each load-bearing claim from the "Hand-off to domain-expert" list was checked against the primary law text on gesetze-im-internet.de (and via WebSearch where the law text alone was insufficient). Verdict per claim:

1. **§17 BMG = 2 Wochen Anmeldefrist + Bußgeldrahmen bis 1.000 € nach §54 BMG.** **Confirmed.** §17 Abs. 1 BMG: „innerhalb von zwei Wochen nach dem Einzug". §54 Abs. 2 Nr. 1 BMG sieht für Verstöße gegen §17 Abs. 1 einen Bußgeldrahmen bis 1.000 € vor. Wichtige Korrektur/Ergänzung: §54 Abs. 1 BMG (Falsch- oder Nichtangaben) reicht bis **50.000 €**, nicht 1.000 €. Praxisanwendung der 1.000 €-Grenze ist regional unterschiedlich; Kommunen verhängen typischerweise 5–50 € bei verspäteter Anmeldung. confidence: high.

2. **Abmeldung am alten Ort entfällt automatisch durch Anmeldung am neuen Ort (innerhalb DE).** **Confirmed, aber Paragraphen-Zuordnung korrigiert.** Mechanisch erledigt das **§33 BMG** (Datenübermittlung zwischen Meldebehörden, „unverzüglich, spätestens drei Werktage nach Anmeldung"). §17 Abs. 2 BMG selbst regelt **nicht** den Inlands-Sonderfall, sondern die **Auslands-Abmeldepflicht** („Wer aus einer Wohnung auszieht und keine neue Wohnung im Inland bezieht"). Research-scout-Formulierung („§17 Abs. 2 erklärt das Sonder-Szenario der Auslandsabmeldung") trifft also zu — die Zitierung im TL;DR „Anmeldung übernimmt die Information automatisch (§17 Abs. 2 BMG)" ist allerdings **falsch zugeordnet**: korrekte Norm ist **§33 BMG**. confidence: high.

3. **§34 BMG erlaubt Datenübermittlung von Meldebehörde an andere öffentliche Stellen ohne Einwilligung.** **Confirmed.** §34 Abs. 1 BMG erlaubt die Übermittlung an „andere öffentliche Stellen" (i.S.d. BDSG §2) „soweit dies zur Erfüllung einer öffentlichen Aufgabe erforderlich ist", ohne Einwilligungserfordernis. §34 Abs. 4 BMG nennt zudem privilegierte Empfänger (Polizei, Staatsanwaltschaft, Gerichte, Nachrichtendienste, Zoll, Steuerverwaltung) ohne reguläre Erforderlichkeitsprüfung. confidence: high.

4. **§36 BMG „regelmäßige Datenübermittlungen" — produktiv für Finanzämter, Beitragsservice, Wehrverwaltung.** **Partially confirmed; Korrektur der Rechtsmechanik.** §36 BMG selbst nennt **keine** konkreten Empfänger, sondern verlangt nur, dass Anlass, Zweck, Empfänger und Daten „durch Bundes- oder Landesrecht" festgelegt sind. Die konkreten Empfänger ergeben sich aus separaten Spezialgesetzen / Datenübermittlungsverordnungen der Länder (z.B. **Meldedaten-Übermittlungsverordnung der Länder**, **§ 11 Abs. 4 RBStV** für Beitragsservice, **§ 58c SG** für Wehrerfassung, **§ 39 AO i.V.m. § 139b AO** für Finanzverwaltung). Research-scout-Formulierung „§36 BMG analog" ist im Ergebnis korrekt, aber die Rechtsgrundlagen-Kette muss präzise zitiert werden — siehe `docs/domain/umzug.md`. confidence: medium-high (genauer Empfängerkreis variiert pro Bundesland).

5. **eWA Stand Mai 2026: ~62,76 Mio. Bürger:innen, ~2.500 Meldebehörden, keine Cascade jenseits Melderegister + PA.** **Confirmed.** BMDS-Pressemeldung („Modernisierungsagenda konkret", Mai 2026) bestätigt 75 % Bevölkerungsabdeckung und alle Landeshauptstädte (zuletzt Saarbrücken angeschlossen). Cascade über Meldewesen + Personalausweis hinaus existiert weiterhin **nicht** als bundesweit ausgerollter Standard. confidence: high.

6. **RegMoG-Status zum 8. Mai 2026.** **Confirmed mit Präzisierung.** Recherche bestätigt: Stufe Meldewesen (IDNr-Aufnahme in den Datenkranz) ist zum **1. November 2024** in Kraft getreten; weitere technische Voraussetzungen für die Verarbeitung der IDNr durch Behörden zum **6. März 2026** in Kraft (Bekanntmachung 2. März 2026). Stufe „IDNr bei beigeschriebenen Personen" für **Mai 2026** angekündigt — zum Stichtag 8. Mai 2026 ist daher davon auszugehen, dass diese Stufe entweder gerade frisch live oder unmittelbar bevorsteht (`confidence: medium` — exakter Live-Status am Stichtag schwer aus öffentlichen Quellen zu belegen). Datenschutzcockpit (BVA-IDA + Bremen-DSC) operativ. confidence: medium-high.

7. **DSGVO-Klassifikation Krankenkassen-Adressübermittlung — Art. 6 oder Art. 9? Sind GKVen öffentliche Stellen i.S.d. §34 BMG?** **Klarstellung:** Gesetzliche Krankenkassen sind rechtsfähige Körperschaften des öffentlichen Rechts (§4 SGB V), gehören damit prinzipiell zum Adressatenkreis „öffentlicher Stellen" i.S.d. BDSG §2 / §34 BMG. **ABER**: §34 BMG fordert „Erforderlichkeit zur Erfüllung einer öffentlichen Aufgabe" — und für die GKV ist Adressdatenpflege primär eine **vertragliche** Aufgabe gegenüber Versicherten, keine im engeren Sinne öffentlich-rechtliche Pflichtaufgabe, die ohne Mitwirkung der Versicherten nicht erfüllbar wäre. Heute findet kein flächendeckender Push „Meldebehörde → GKV" statt; Adressänderung wird in der Praxis vom Versicherten oder vom Arbeitgeber per **DEÜV-Meldung (§28a SGB IV)** an die GKV gemeldet. Datenkategorisch: reine Adresse fällt **unter Art. 6 DSGVO**, nicht Art. 9 — die *Mitgliedschaft bei einer bestimmten Kasse* ist keine Gesundheitsdate per se. PKV als Privatunternehmen liegen sowieso außerhalb §34 BMG. confidence: medium-high.

8. **Privatwirtschaftliche Empfänger nur mit Einwilligung der Person nach Art. 6 Abs. 1 lit. a DSGVO.** **Confirmed.** Bank, private Versicherer, Arbeitgeber, EVU, Telekom, Vermieter und PKV als Unternehmen sind keine „öffentlichen Stellen" i.S.d. BDSG §2 / §34 BMG. Übermittlung daher nicht über §34 BMG abgedeckt; Rechtsgrundlage ist Einwilligung nach Art. 6 Abs. 1 lit. a DSGVO oder vertragliche Anzeigepflicht (Art. 6 Abs. 1 lit. b). confidence: high.

9. **Aufenthaltstitel-Adresse / Ausländerbehörde — Push oder on-demand?** **Confirmed: on-demand, kein automatischer Push.** §87 AufenthG („Übermittlungen an Ausländerbehörden") ist als **on-request**-Norm formuliert: andere öffentliche Stellen übermitteln Daten an die ABH „auf Ersuchen, soweit dies … erforderlich ist". Ausnahmen: §87 Abs. 2 AufenthG (Pflicht-Mitteilung in bestimmten Konstellationen wie Ausweisung-Indikatoren, Sozialleistungs-Anträge), aber **nicht** für reine Adressänderungen rechtmäßig aufenthaltender Drittstaatsangehöriger. Zudem: §50 AufenthG (Anzeigepflicht) gilt nur für **ausreisepflichtige** Personen (§50 Abs. 5), §82 AufenthG (Mitwirkungspflicht) ist allgemeine Auskunftspflicht ohne ausdrückliche Adress-Pflicht. Praxis: Adresse auf eAT-Karte muss durch separaten ABH-Termin aktualisiert werden — bestätigt research-scout-Befund. Anna-Pain-Pattern ist real. confidence: high.

10. **OZG Fokusleistungen — vollständige 16er-Liste.** **Teilbestätigt.** Recherche bestätigt: BMI/BMDS-Beschluss Anfang 2023, 16 priorisierte „Fokusleistungen". Wohnsitzanmeldung, Elterngeld („Elterngeld Digital"), Kindergeld, BAföG, Bauantrag, KFZ-Zulassung (i-Kfz), Arbeitslosengeld u.a. sind enthalten. Eine **vollständige offizielle Liste** ließ sich aus den freien Quellen nicht atomar bestätigen (digitale-verwaltung.de-Detail-Seite war zur Recherche-Zeit eingeschränkt; Behörden-Spiegel meldete im Januar 2025 „alle 115 priorisierten OZG-Leistungen online", was eine **breitere** Zählung als die 16-Fokus-Leistungen ist). Für die Demo reicht die Aussage „Wohnsitzanmeldung ist eine Fokusleistung". confidence: medium.

### Zusätzliche Korrekturen / Präzisierungen außerhalb der Hand-off-Liste

- **§17 Abs. 2 BMG-Zitat im TL;DR und Findings 1**: research-scout zitiert §17 Abs. 2 als Quelle für die automatische Wegzugsmeldung — korrekt ist **§33 BMG**. §17 Abs. 2 regelt die **Auslands-Abmeldepflicht**. Dies ist im Findings-Block bereits korrekt erwähnt; das TL;DR sollte beim nächsten Schliff präzisiert werden.
- **„§13 FZV (sinngemäß)" für KFZ-Adressänderung** in Tabelle Findings 1: Korrekte Norm ist **§15 Abs. 1 / Abs. 4 FZV** (Halter-Verlegung des Wohnsitzes / Sitzes — Zulassungsbescheinigung Teil I unverzüglich aktualisieren; Sanktion: Untersagung des Betriebs auf öffentlichen Straßen, Bestätigung im Verkehrsblatt mit 4-Wochen-Frist). §13 FZV regelt Format und Sicherheitsmerkmale der Zulassungsbescheinigung Teil I selbst. domain-expert hat die korrekte Norm in `docs/domain/umzug.md` aufgenommen.
- **Bezeichnung „Familienkasse"**: research-scout schreibt „Bund (bei Bundesagentur für Arbeit)" — präzise: Familienkassen sind **Dienststellen der Bundesagentur für Arbeit** (Bund). Für den öffentlichen Dienst existiert die Sonderform „Familienkasse Öffentlicher Dienst" beim BVA. Beide sind Bundesebene — Aussage stimmt, aber im UI-Text auf „Familienkasse der Bundesagentur für Arbeit" konkretisieren.
- **Persona Anna (`docs/personas.md`)**: dort ist Annas Aufenthaltstitel als „Blue Card, §18b AufenthG" geführt. Seit der AufenthG-Reform 2023 ist die Blue Card EU in **§18g AufenthG** geregelt — §18b betrifft heute Hochqualifizierte/Niederlassungserlaubnis-Sonderfälle. **Empfehlung an product-architect**: Persona-Norm-Zitat auf §18g AufenthG aktualisieren, **bevor** das Stammdaten-Mock von mock-backend-coder gesetzt wird. *(Außerhalb des Umzug-Scopes, aber unmittelbar relevant für die Kohärenz Anna ↔ Aufenthaltstitel-Verlängerungs-Vorgang.)*

### Disagreements (für concept-verifier zur Adjudikation)

Keine fundamentale Meinungsverschiedenheit zwischen domain-expert und research-scout. Alle Korrekturen sind Präzisierungen einzelner Paragraphen-Zitate, keine inhaltlichen Widersprüche. Die zwei einzigen Punkte, die concept-verifier in der adversarialen Prüfung beobachten sollte:

- **DISAGREEMENT (mild): Bußgeld-Realismus.** research-scout zitiert „bis zu 1.000 € Bußgeld nach §54 BMG" prominent als Pain-Hebel im TL;DR. domain-expert hält das für gesetzlich korrekt, aber **kommunikativ irreführend** — Praxis ist 5–50 €, harte Bußgelder (bis 50.000 € nach §54 Abs. 1 BMG) gelten für Falschangaben, nicht für Verspätung. Empfehlung für die Demo-Texte: Bußgeldrahmen nicht als Hauptmotivation des Bürgers framen, sondern den Kontroll- und Folgeschäden-Aspekt (KFZ-Zustellung, Steueranschrift, Beitragsservice-Mahnungen) hervorheben. concept-verifier sollte prüfen, ob das Demo-Storyboard hier nicht in „Angst-Marketing" rutscht.
- **DISAGREEMENT (technisch): Cascade-Tiefe vs. Erwartungsmanagement.** research-scout schlägt Block A „Erledigen wir automatisch" mit Finanzamt + Beitragsservice + KFZ + Familienkasse + Wehrverwaltung vor. domain-expert sieht KFZ und Familienkasse als rechtlich **derzeit nicht** automatisch versorgt (KFZ: §15 FZV verlangt aktive Mitteilung des Halters; Familienkasse: kein §36-BMG-Push, Zuständigkeitswechsel passiert intern bei BA-Aktenabgabe ohne reguläres Cascade-Trigger). Vorschlag: KFZ und Familienkasse in einen vierten Block „Wir bereiten den Antrag vor — Sie bestätigen mit eID" verschieben. concept-verifier soll entscheiden, wie offensiv das Demo „heute schon möglich" vs. „mit RegMoG-Vollausbau möglich" trennt — die Darstellung sollte nicht den Eindruck erwecken, eine Cascade Meldebehörde → KFZ-Zulassung sei 2026 produktiv.
