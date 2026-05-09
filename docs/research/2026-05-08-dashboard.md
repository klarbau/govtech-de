---
topic: Dashboard — Bürger:innen-Übersicht „heute zu tun" — die persönliche Aggregations-Startseite nach Login
question: For any citizen (horizontal capability, persona-agnostic), what overview do they need on the first screen after login, and what evidence-based UX, frequency, and prior-art patterns must our Dashboard borrow or avoid to make „in 10 Sekunden sehen, was heute auf dem Tisch liegt" the demo's wow-moment?
date: 2026-05-08
status: revised
confidence: medium
---

> **Domain validation 2026-05-08** (Quelle: `docs/domain/dashboard.md`)
> - § 8 Punkt „§6 BGB-Vollmacht" ist **falsch** — die Norm ist **§ 164 BGB** (Stellvertretung); § 6 BGB regelt Entmündigung-Aufhebung (heute weggefallen). Korrekturen unten in §9d annotiert.
> - § 1c Frequenz-Aussage „~5 Logins pro Bürger:in pro Jahr" ist **präzisiert** zu „~5 Logins pro **registriertem Konto** pro Jahr". Bürger:innen ohne BundID-Konto gehen in die Berechnung nicht ein.
> - Banking-Frequenz-Aussage ist auf **„Größenordnungs-Asymmetrie"** generalisiert (keine atomare Belegung „Banking 5×/Tag").
> - eGov-MONITOR-Zahlen 33 % / 12 % / 15 % / 36 % / 61 % / 64 % / 55 % / 56 % gegen Initiative-D21-Original-Pressetext + PDF **verifiziert**. Übernahme ohne Korrektur.
> - Adjudikation der 5 flagged Disagreements + 5 neuer (f-j): siehe `docs/domain/dashboard.md` §10.
> - Kurzfassung: (a) AI-Top-3 → REVISE (Reihenfolge ja, keine Erfolgs-Prognosen; AI-Eingabe auf strukturierte Felder reduzieren); (b) Wartezeit-Median-Tile → REJECT (streichen, Alternative „letzte Bewegung vor X Tagen"); (c) DSC-Tile → REVISE (Verlinkungs-Tile + App-Activity-Log, kein DSC-Replika); (d) Familie-Tile → REVISE (nur mit explizit aktivem Vollmacht-/Sorge-Modell, BGB §164 + §1626/§1629 + VwVfG §14); (e) Stammdaten-Sync-Tile → REVISE (Form-Eingrenzung: nur eigene Bestätigungs-Historie, keine Behörden-Stand-Aussagen).

## TL;DR

- **Citizen pain is structural and quantified**: only **12 %** der Deutschen sagen, der Staat mache ihnen das Leben einfacher; **15 %** sehen ihre Erwartungen an eine moderne digitale Verwaltung erfüllt; **59 %** empfinden Behördenkontakt als „sehr anstrengend"; **16 %** halten Verwaltung für effizient. Vertrauen in den Staat liegt bei **33 %** (2022: 38 %).[^1][^2][^3] **36 %** nennen mangelnde Auffindbarkeit explizit als Hürde; **61 %** machen ihre Zustimmung zur „modernen digitalen Verwaltung" davon abhängig, dass Leistungen schnell und einfach gefunden werden — die meistgenannte Voraussetzung überhaupt.[^1][^4] Dashboards-Pain-Hauptbefund: heute *fragmentiert über N Portale*, keine zentrale Antwort auf „Was hat sich seit letztem Login geändert?".
- **Frequenz-Daten zeigen das Aufmerksamkeits-Asymmetrie-Problem**: BundID-Logins liegen bei **~2 Mio./Monat** Mitte 2026 (vs. ~1 Mio./Monat 2024 — Verdopplung) bei **~4,86 Mio. Konten** (Aug 2025; nach Bereinigung von ~Hunderttausend Inaktiven), d. h. **<1 Login pro Konto pro Monat**.[^5][^6][^7] Banking-Apps werden um **eine Größenordnung** häufiger geöffnet (US-Daten: 65 % nutzen Mobile-Banking *regelmäßig*, branchenübliche DAU/MAU-Ratio 30–50 %).[^8] Eine konkrete „Logins pro Bürger pro Jahr"-Zahl für DE-Verwaltung ist **`not found`** in öffentlichen Quellen — wir nutzen die Konten/Logins-Ratio + qualitative eGov-MONITOR-Evidenz als Triangulation.
- **Prior Art ist klar — wir kopieren Borger.dk + eesti.ee + GOV.UK One Login**: **Borger.dk Mit Overblik** (≥5 explizit benannte Themenbereiche: Steuer, offene Schulden, BAföG, Wohnen, Leistungen + laufende Vorgänge; „upcoming agreements and deadlines" als horizontaler Streifen) ist das *direkteste* Vorbild — gleiche Föderal-Komplexität, gleiches Once-Only-Erbe.[^9][^10] **eesti.ee** organisiert die persönliche Seite topisch nach Lebensbereichen (Health/Education/Housing/Family) + persönlichem Postfach — und liefert mit dem **Data Tracker** das Datenschutz-Cockpit-Pattern, das Vertrauen *durch Sichtbarkeit* erzeugt.[^11][^12][^13] **GOV.UK One Login** + **Singpass „MyICA"** sind das *Tile-Pattern* für „personalisierte e-Service-Karten je nach Status" (Pass läuft bald aus → Karte priorisiert).[^14][^15][^16]
- **Cognitive-Load-Constraints**: Miller's Law (7 ± 2) und Hick's Law sind UI-Forschungs-Schwergewichte — sie schreiben Dashboards mit **≤7 simultan sichtbaren Top-Karten** vor; Chunking + progressive disclosure sind die mit ihnen sichergestellten Werkzeuge.[^17][^18] eGov-MONITOR 2025 dokumentiert, dass *Verständlichkeit* und *Auffindbarkeit* die Top-Stellschrauben für Akzeptanz sind — nicht Feature-Zahl.[^1][^4]
- **Wow-Pattern-Familien zum Ausleihen**: (a) **Apple Smart Stack** — kontext-getriebene Karten-Rotation („wir zeigen, was *jetzt* relevant ist", nicht „wir zeigen alles");[^19] (b) **GTD/Linear/Notion „Today + Next"** — getrennte Trögchen für „heute zu tun" vs. „in Bearbeitung" vs. „erledigt";[^20] (c) **Banking-App-Ledger-Pattern** — Saldo + letzte Bewegungen + Auffälligkeit-Tile (übertragen: „letzte Behörden-Bewegungen + Frist-Saldo + auffällige Datenabfrage").[^8][^21]
- **Disagreement-Felder für domain-expert** (5 markiert): *(a)* AI-priorisierte Top-3-Action — Risiko Art. 22 DSGVO (kein „Profiling", da die App im Auftrag der Person handelt; aber „Erfolgsversprechen"-Linie); *(b)* „Wartezeit-Median pro Behörde" — solche Daten gibt es nicht offiziell, wir würden sie *erfinden*; *(c)* „Datenschutz-Cockpit-Tile" — wir dürfen kein paralleles Konkurrenz-Cockpit zum BVA-DSC bauen; *(d)* „Familie"-Tile — Berechtigungen/Vollmachten regelt §6 BGB-Vollmacht / §1626 BGB Sorge — UI-Berechtigung ≠ Rechtsgrundlage [**domain-expert 2026-05-08: §6 BGB ist falsch — Norm ist § 164 BGB; § 1626 + § 1629 BGB für elterliche Sorge/Vertretung; § 14 VwVfG für Verfahrenshandlungen**]; *(e)* „Stammdaten-Sync-Health"-Tile — die Frage „welche Stelle hat veraltete Adresse" setzt voraus, dass wir das *wissen* — heute nicht der Fall.

## Findings

### 1. Citizen pain — was Bürger:innen heute beim „Übersicht-Bekommen" erleben

#### 1a. „Was hat sich seit meinem letzten Blick verändert?" — heute unbeantwortbar

Es gibt **keinen** zentralen Bürger-side Aggregator über alle Behörden hinweg in DE. Drei Beobachtungen:

- **BundID-Konto-Übersicht** (Stand Mai 2026): „Mein Profil" zeigt Stammdaten, Einwilligungs-Verwaltung („welche Behörde welche Information abfragen will"), und über das integrierte **Zentrale Bürgerpostfach (ZBP)** rechtssichere Bescheide. Der **Statusmonitor** (seit Aug 2024 Pilot, seit Okt 2025 voll produktiv) gibt Übersicht über laufende Anträge.[^22][^23][^24] **Aber**: BundID aggregiert *nicht* Mein-ELSTER, *nicht* Krankenkassen-Inboxes, *nicht* Beitragsservice, *nicht* kommunale Vorgangs-Stände. Der „Was hat sich verändert?"-Blick erfordert weiterhin parallele Logins.
- **Mein ELSTER** hat **eigenen** Posteingang für Steuerbescheide; Bereitstellungs-E-Mail nach Posteingang; ab **Juli 2026** erlaubt MeinELSTER+ App automatisches Erstellen einfacher Steuererklärungen 2025.[^25] Mein-ELSTER ist eine *agency-spezifische* Instanz — wie HMRC PTA in UK — und damit *nicht* das richtige Vorbild für eine *unified* Übersicht.
- **Service-BW** (Land Baden-Württemberg) liefert pro Bürger:in eine „Aufgabenliste" mit Status laufender Vorgänge.[^26] Pendants existieren in BayernPortal, Berlin Service, Service-Hessen — alle landes-/kommunal-eigene Insellösungen.
- **Behördenfinder Deutschland** ist seit 30. April 2024 abgeschaltet, ersetzt durch **servicesuche.bund.de** — ein Service-Katalog ohne persönliche Übersicht. Eine Verbindung zu BundID-Konten ist „geplant", noch nicht produktiv.[^27][^28]

**Fazit**: Es gibt 2026 in DE keinen Bürger-side Cross-Behörden-Aggregator mit „Was ist neu seit letztem Blick"-Pattern. Genau das ist das Whitespace, das das Demo besetzt.

#### 1b. Vertrauens- und Aufmerksamkeits-Defizit (eGov-MONITOR 2025 + Forsa/dbb 2025)

eGovernment MONITOR 2025 (Initiative D21 + TUM, gefördert vom BMDS, Erhebung Kantar):[^1][^2][^4]

| Befund | Wert |
|---|---|
| Vertrauen in den Staat | **33 %** (2022: 38 %) |
| „Staat macht mein Leben einfacher" | **12 %** |
| „Erwartungen an moderne digitale Verwaltung erfüllt" | **15 %** |
| Mangelnde Auffindbarkeit als Hürde | **36 %** |
| Voraussetzung „schnell und einfach finden" für positive Bewertung | **61 %** |
| Erwartung „aktive Kommunikation digitaler Services durch den Staat" | **64 %** |
| Wunsch: keine doppelten Dateneingaben | (Top-3 Verbesserungswunsch) |

Forsa/dbb-Bürgerbefragung Juli 2025 (n=2.011):[^3][^29]

| Befund | Wert |
|---|---|
| Behördenkontakt als „sehr anstrengend" | **59 %** |
| Verwaltung als „effizient" | **16 %** |
| Öffentlicher Dienst als aufgabenfähig | **23 %** |
| Gute/sehr gute Erfahrungen mit Online-Verwaltung | **42 %** |
| Schlechte Erfahrungen | **30 %** |
| Erwarten Leistungsverbesserung durch Digitalisierung | **53 %** |
| Glauben nicht, dass sich unter neuer Bundesregierung etwas ändert | **70 %** |

**Implikation für Dashboard**: Der erste Screen muss in <10 Sekunden zwei Dinge tun: *(i)* Bürger:in das Gefühl geben „mein Leben wird einfacher" (12 %-Indikator) und *(ii)* die Auffindbarkeits-Hürde zerschneiden (36 %-Hürde, 61 %-Voraussetzung). Das ist *die* Wirkungsachse.

#### 1c. Frequenz: wie oft öffnet ein:e Bürger:in eine Verwaltungs-App?

**Belegte BundID-Zahlen**:
- ~6 Mio. Konten (März 2025) → ~4,86 Mio. (August 2025) nach Bereinigung von ~Hunderttausend Inaktiven (24-Monats-Inaktivitäts-Löschung).[^5][^6]
- Monatliche Anstieg ~154.000 neue Konten/Monat.[^5]
- Logins/Monat: **~2 Mio.** Mitte 2026 (vs. ~1 Mio./Monat 2024).[^5][^7]
- ~1.800 angeschlossene Online-Dienste, Plattformen und Portale.[^5]

**Berechnete Frequenz**: 2 Mio. Logins / 4,86 Mio. Konten = **~0,4 Logins pro Konto pro Monat** = **~5 Logins pro Bürger:in pro Jahr** (gerechnet über die Konto-Inhaberschaft, nicht über die Bevölkerung). [**domain-expert 2026-05-08**: Formulierung präzisieren — „pro **registriertem Konto** pro Jahr"; Bürger:innen ohne BundID-Konto sind nicht abgedeckt. In Loom-Erzählung „eine Größenordnung seltener als Banking-Apps" verwenden, nicht „5×/Jahr vs. 5×/Tag" — letztere Banking-Frequenz ist nicht atomar belegt.]

**Vergleich Banking-Apps**: Allgemeine Mobile-Banking-Apps werden in der Industrie mit **DAU/MAU-Ratios von 30–50 %** und mehrfacher Login-Frequenz pro Woche zitiert; in den USA nutzen >65 % regelmäßig Mobile-Banking.[^8] Eine direkte DE-Verwaltung-vs-Banking-Frequenz-Statistik aus einer Studie ist **`not found`** — die Größenordnungs-Asymmetrie (Verwaltung ~1×/Quartal, Banking ~1×/Tag) ist aus den triangulierbaren Zahlen *plausibel*, aber nicht atomar belegt. `confidence: medium-low` für die Banking-vs-Verwaltung-Quantifizierung; **high** für die Verwaltungs-Login-Seltenheit selbst.

**Implikation für Dashboard**: Wenn Bürger:innen ~5×/Jahr einloggen, muss *jeder* Login eine vollständige Übersicht „was hat sich seit letztem Mal verändert" liefern. „Smart Stack"-Pattern (kontext-relevante Karten) ist deshalb passender als statische Tab-Komposition.

#### 1d. Frist-Sterben — wenn der Bürger merkt, dass etwas durchgerutscht ist

Eine harte Statistik „X % verpassen Widerspruchsfristen" ist **`not found`**. Belegbar:[^30][^31]
- Widerspruchsfrist generell: **1 Monat** ab Bekanntgabe (§70 Abs. 1 VwGO).
- Wiedereinsetzung in den vorigen Stand: 2 Wochen VwVfG / 1 Monat SGG ab Wegfall des Hindernisses; absolute Grenze 1 Jahr.
- Säumniszuschlag Steuern: **1 % pro Monat** auf den nicht entrichteten Betrag (§240 AO), kappungsfrei.

**Implikation**: Frist-Tile am Dashboard ist nicht „nice-to-have", sondern messbarer finanzieller Schadensschutz. Countdown + absolutes Datum + Nudges (7d / 3d / 1d) — Pattern aus eesti.ee + Outlook Calendar.

### 2. Existing infrastructure — DE-Status Mai 2026

#### 2a. BundID-Konto-Übersicht — was sie heute zeigt

Stand Mai 2026 nach allen verfügbaren Quellen:[^22][^23][^24][^32]
- **Mein Profil**: Stammdaten (Name, Adresse, Geburtsdatum, Steuer-ID falls hinterlegt), Authentifizierungsstärken (Benutzername+Passwort / ELSTER-Zertifikat / Online-Ausweisfunktion / EU eID).
- **Einwilligungsmanagement**: Welche Behörde welche Information abfragen will → Einwilligungen widerrufbar.
- **Postfach (ZBP)**: rechtssichere Bescheid-Zustellung; Migration ~3,8 Mio. BundID-Postfächer 2024; bidirektionale Kommunikation (Rückfragen, Nachreichen) für **Juli 2026** geplant.
- **Statusmonitor**: seit Okt 2025 voll produktiv; transparenter Überblick über laufende Anträge (Antragsstand, Verfahrensschritt, Handlungsbedarf).
- **Antragshistorie**: lokal gespeicherte Formulardaten für Wieder-Verwendung.

**Was fehlt** (relevant für unsere Demo):
- Keine **Frist-Aggregation** über Behörden hinweg (Steuerbescheid + KFZ-Hauptuntersuchung + Aufenthaltstitel-Verlängerung sind in 3 verschiedenen Welten).
- Keine **„Was hat sich verändert seit Login"**-Karte.
- Kein **AI-Layer** für Action-Priorisierung oder Brief-Erklärung (Posteingang-Spec liefert das parallel).
- Keine **Kalender-Integration** (.ics-Export für Termine ist `not found` als BundID-Feature).
- Keine **Familie/Vollmacht**-Sicht (joint Vorgänge mit Partner:in / Kindern).
- Keine **Datenschutz-Cockpit-Inline-Sicht** — das DSC ist *separates* Produkt beim BVA, nicht im BundID-Dashboard verlinkt (Stand 2026).

**Wichtig**: BundID wird laut ad-hoc-news ab 2026 zum „Pflichtwerkzeug" für Bürger:innen für den Behördenkontakt-Aufbau.[^33] Das gibt unserer Demo einen *plausiblen* Distribution-Anker („auf der Basis BundID/DeutschlandID gebaut").

#### 2b. Mein ELSTER Übersicht

ELSTER hat **agency-spezifischen** Posteingang.[^25] Daten 180 Tage abrufbar; ab 2027 elektronische Bekanntgabe als Default; Juli 2026 MeinELSTER+ App mit automatischer einfacher Steuererklärung 2025. Mein-ELSTER ist *Silo* — eine echte Bürger-Übersicht müsste es aggregieren (read-only, via Verlinkung) oder zumindest Status-Tile („Ihr Steuerbescheid 2025 wurde am 12.04.2026 in Mein ELSTER eingestellt") zeigen.

#### 2c. Datenschutzcockpit (BVA / Bremen)

**Status Mai 2026**:[^34][^35][^36]
- BVA + Freie Hansestadt Bremen (FHB) als Auftragnehmer haben das DSC entwickelt.
- Erste Pilotphase 2022 abgeschlossen.
- **Anfang 2026**: erfolgreicher Start der ersten funktionalen NOOTS-Version (National Once-Only Technical System) + erster Nachweis-Abruf mit echten Daten.
- Bürger:innen können einsehen, welche Daten zwischen welchen öffentlichen Stellen *unter Verwendung der IDNr* in den letzten **2 Jahren** ausgetauscht wurden.
- Folgephase: direkter Zugriff auf in den Registern gespeicherte Stammdaten.

**Implikation für Dashboard**: Wir bauen *kein* paralleles DSC. Wir bauen eine **DSC-Tile** — ein 1-Klick-Verweis: „2 Datenabfragen in den letzten 30 Tagen — Details im Datenschutzcockpit". Das ist der bewusste Gegenentwurf zu Gosuslugi-Ästhetik („Trust durch Transparenz statt durch Versprechen") und gleichzeitig der konkreteste Beleg für „privacy by design" im Mission-Statement (CLAUDE.md).

#### 2d. OZG/EfA: Was Bürger:innen heute „one-stop" finden

**Servicesuche.bund.de** (seit Mai 2024 Nachfolger von Behördenfinder Deutschland) ist ein Service-Katalog, kein persönliches Konto.[^27][^28] Personalisierung & Anbindung der Service-Konten von Bund + Ländern ist „in Entwicklung". Erforschungs-Punkt: kein einziges DE-Portal liefert 2026 die *persönliche, behörden-übergreifende, frist-gewichtete Übersicht*, die Borger.dk seit Jahren liefert. Das ist die Lücke.

#### 2e. Gibt's einen Behördenfindern (Bürger-Aggregator) heute?

**Nein.** Der namensgleiche „Behördenfinder Deutschland" war ein Service-Katalog (zuständige Behörde/Leistung finden), keine persönliche Übersicht. Die persönliche Übersicht lebt fragmentiert in BundID-Statusmonitor (Bund) + Service-BW/BayernPortal/Berlin Service-Konto/etc. (Land/Kommune) + Mein-ELSTER (Steuer) + Krankenkassen-Apps (KK) + Einzel-Portale Beitragsservice/Familienkasse/Bafög etc. *Niemand* aggregiert.

### 3. Citizen mental models — „Heute zu tun" als Zentrum-Metapher

#### 3a. Inbox vs. Vorgangs-Liste vs. „Heute zu tun"

Drei dominante Metaphern aus Productivity-Forschung:[^20][^37]
- **Inbox-Metapher** (Mail/Slack/Linear): „Was ist *neu* angekommen?" Eingehender Strom, oben neueste. Stark für Briefe + Bescheide; schwach für lang laufende Vorgänge.
- **Project/Vorgangs-Liste-Metapher** (Asana, Notion, GTD-Projects): „Was ist *in Bearbeitung*?" Zustandsorientiert, mit Phasen/Schritten. Stark für Umzug, Aufenthalts-Verlängerung; schwach für eingehende Einzelmitteilungen.
- **„Today + Next Actions"-Metapher** (GTD, Things, OmniFocus, Reclaim, Motion): „Was ist *heute* die einzige nächstbeste Handlung?" Aktionsorientiert. Stark für Frist-getriebene Verwaltung — *exakt* der Pain-Hauptbefund (Auffindbarkeit + nächste Aktion).

**Recommendation**: **„Heute zu tun"-Metapher als Zentrum**, mit „Posteingang" und „Vorgänge" als sekundäre Tabs/Tiles. Das matcht: (a) eGov-MONITOR-Pain (Auffindbarkeit + nächste Handlung); (b) seltene Login-Frequenz (1 Login = vollständiger „what's next" statt „alle 47 Items"); (c) GTD-Pattern-Adoption als kulturell etabliert in Productivity-Tools.

#### 3b. „Done" vs. „Ongoing"-Trennung

GTD klassifiziert in fünf Kategorien: *Inbox* (uncategorized) → *Next Action* (heute) → *Project* (in Bearbeitung, mehrstufig) → *Waiting For* (auf andere) → *Someday/Maybe* (später). Plus *Reference* (abgeschlossen, archiviert).[^20]

**Übertragung auf Verwaltung**:
- *Inbox* = Posteingang ungelesen.
- *Next Action* = „Heute zu tun" (Frist binnen 7 Tagen, oder klar identifizierte einzelne Handlung).
- *Project* = Vorgang in Bearbeitung (Umzug-Cascade, Aufenthalt-Verlängerung).
- *Waiting For* = Vorgang in Behörden-Bearbeitung („Ihr Antrag liegt beim Finanzamt seit 12 Tagen").
- *Reference/Archive* = abgeschlossene Vorgänge.

**Recommendation**: erledigte Vorgänge **persistent sichtbar** (Achievement-Pattern, Productivity-Apps zeigen „13 abgeschlossene Vorgänge in 2026" als Vertrauens-Anker), aber **ausgegraut/sekundär** (Productivity-Pattern, nicht im Way der „Heute zu tun"-Hauptaktion). Anti-Pattern: alle abgeschlossenen Vorgänge nach 30 Tagen löschen — das nimmt der Bürger:in den Beleg ihrer eigenen Aktivität.

#### 3c. Frist-Heuristik

Die Aussage „Bürger:innen reagieren auf rote Countdown-Chips besser als auf Listen-Icons" ist eine **plausible UX-Heuristik**, aber direkt-belegt **`not found`**. Anekdotische Evidenz: Outlook Calendar, gov.uk PTA, Estonia eesti.ee setzen Countdown + absolutes Datum nebeneinander; A/B-Tests dazu in öffentlichen Quellen nicht auffindbar. *(`confidence: low` für Wirkungsstärke; `high` für die Verbreitung als Pattern.)*

**Recommendation**: Frist als Countdown-Chip (rot bei <7 Tagen, gelb bei <30 Tagen, neutral bei >30 Tagen) **plus** absolutes Datum direkt daneben. Defaults aus Posteingang-Spec (`<FristCountdown>` Komponente bereits in CLAUDE.md vorgesehen).

### 4. Prior art — international

#### 4a. Borger.dk Mit Overblik (Dänemark) — direktestes Vorbild

**Was Mit Overblik zeigt** nach erfolgreichem MitID-Login:[^9][^10]

- **≥5 Themenbereiche** (mindestens explizit benannt): Steuer · offene Schulden gegenüber öffentlichen Stellen · Studienförderung (BAföG-Pendant SU) · Wohnen · Leistungen + laufende Vorgänge.
- **Horizontaler Streifen**: „upcoming agreements and deadlines" — anstehende Termine + Fristen.
- **Personalisierung**: nach Lebensphase (Student/Berufstätig/Rentner) leicht unterschiedliche Tile-Auswahl.
- **Single Source of Truth**: das Ziel ist explizit „all relevant information public authorities hold on them in one place" — *ein* Login, keine Sub-Logins.
- **Roll-out-Plan 2019–2026** in Stufen — d. h. das funktioniert auch in einer komplexen Föderal-Struktur (Dänemark ist nicht föderal wie DE, aber mit Kommunal-/Region-/Staats-Ebene durchaus mehr-stufig).

**Beobachtung**: Mit Overblik ist *nicht* aktion-orientiert („heute zu tun"), sondern bereich-orientiert (Themen). Unsere Differenzierung: wir packen Aktion *darüber*, Themen *darunter*.

#### 4b. eesti.ee + Data Tracker (Estland)

**Was eesti.ee nach ID-card/Mobile-ID/Smart-ID-Login zeigt**:[^11][^12]
- Persönliche Daten aus dem Bevölkerungsregister.
- Hausarzt-Information.
- Inbox (Postfach für Pflichtmitteilungen + offizielle E-Mails).
- E-Service-Kategorien topisch (8+ Bereiche: Health/Prescriptions, Education, Family, Housing, Vehicles, Tax, Pension, Documents).

**Data Tracker** (seit 2017):[^13]
- Bürger:in sieht im eigenen Konto die *vollständige Liste* der Anfragen an die eigenen Personendaten — wer, wann, warum, aus welcher Behörde.
- Vier Kern-Datenbanken sind durch das Tracking abgedeckt; 479 Institutionen + Unternehmen nutzen X-Road insgesamt.
- Limit: Privatunternehmen außerhalb X-Road (Meta, Google) sind *nicht* abgedeckt.

**Pattern zum Klauen**:
- Topische Bereich-Gliederung (≥7, ≤9 ist eGov-MONITOR-konform; Estland 8 ist Goldstandard).
- Data-Access-Tile als sichtbarer Vertrauens-Anker („3 Datenabfragen in den letzten 30 Tagen").

#### 4c. GOV.UK One Login (UK)

**Status Mai 2026**:[^14][^38][^39]
- **9. Februar 2026**: HMRC live für Neukunden (Erst-Anlage über One Login statt Government Gateway).
- **Oktober 2025**: Companies House WebFiling pflichtweise via One Login.
- **>50 angeschlossene Services**, weiter wachsend.
- **Dashboard-Pattern**: Liste „Your services" mit Karte je angeschlossenem Service; bei Click in den Service-Bereich.
- **Mobile App**: separater One-Login-Container (App Store + Google Play).

**Pattern zum Klauen**:
- „Your services"-Tile-Layout (statt monolithischem Inbox-Block).
- Konsequente single-sign-on mit klar getrennten Service-Welten.
- 1-Click „Sign out everywhere"-Pattern (für Vertrauen + Datenschutz).

#### 4d. Singpass „MyICA" + SingPass Inbox (Singapur)

**Was MyICA nach Singpass-2FA-Login zeigt**:[^15]
- Dashboard mit personalisierten Notifications (Pass läuft bald aus → priorisierte Karte).
- Application-Status-Übersicht (z. B. SC/PR-Antrag).
- Personalisierte e-Services nach Residency-Status.

**Pattern zum Klauen**: **Status-getriebene Karten-Priorisierung** — Pass läuft aus = Karte oben. Aufenthaltstitel läuft aus = Karte oben. Steuerbescheid neu = Karte oben. Das ist genau das „heute zu tun"-Pattern.

#### 4e. Suomi.fi (Finnland)

Finnland zeigt im Suomi.fi-Web-Service nach Identifikation:[^40]
- **Persönliche Daten** aus dem Bevölkerungs-Informationssystem.
- **Eigentum + Fahrzeuge + Bildung** in eigenen Sub-Bereichen.
- Aktualisierungs-Status („haben Sie eine Adresse gemeldet, ist sie schon eingetragen?").

**Pattern zum Klauen**: **Sync-Health-Sicht** — kleine Health-Kacheln pro Datenbestand mit „last verified" Timestamp und „push update" Button. Sehr eGov-MONITOR-konform (Top-Wunsch: keine doppelten Dateneingaben).

#### 4f. Altinn-Innboks (Norwegen)

Altinn:[^41]
- **Activity Log** je Nachricht: wer hat erstellt, geöffnet, signiert; ob SMS/E-Mail-Notification gesendet.
- Inbox + Archiv + Papierkorb klar getrennt.
- Erweiterte Suche mit Filter (Status, Zeitraum).

**Pattern zum Klauen**: Activity-Log als **Datenschutz-Beleg** — „Ihr Bescheid wurde von Behörde X am 12.05. erstellt, von Ihnen am 14.05. geöffnet". Das ist Beweis-Sicherheit von Bekanntgabe-Wirkung im UI sichtbar gemacht.

#### 4g. myGov (Australien) + RealMe (Neuseeland)

myGov:[^42]
- **Tile-Layout**: jede angeschlossene Behörde (Medicare, Centrelink, ATO, DVA, My Aged Care, IHI) als separates Tile auf der Home-Seite.
- Linking-Workflow für jede Behörde.

RealMe:[^43]
- >1 Mio. Nutzer:innen, **>3 Mio. Logins/Monat** — d. h. ~3 Logins pro Konto pro Monat. NZ ist deutlich aktiver als BundID-DE (~0,4 Logins/Konto/Monat). Hint: Single-Sign-On mit attraktiveren Services (IRD/ACC/Work&Income) erhöht die Nutzungsfrequenz.

**Pattern**: **Tile-Layout pro Behörde/Service** ist das gemeinsame Prinzip — und genau das, was wir als „Linked Authorities"-Sektion am Dashboard bauen sollten.

### 5. Wow- und Demo-Patterns aus Consumer-Welten

#### 5a. Apple iOS Today View / Smart Stack

Smart Stack:[^19]
- Bis zu 10 gestapelte Widgets, automatische Rotation nach Tageszeit, Routine-Lernen, Kontext (Standort, Aktivität).
- iOS 18: free-form placement, AI-priorisiert.

**Übertragung auf Verwaltung**:
- **Smart Stack-Karte am Dashboard-Top**: morgens „heute Termin Bürgeramt 09:30"; nach dem Termin „Bestätigung — Sie können den Tag jetzt mit Erledigt-Status abhaken"; abends „Frist Aufenthaltstitel-Verlängerung in 14 Tagen — jetzt Vorgang starten?".
- **Kontext = Frist + Termin + neue Briefe**, nicht nur Tageszeit.

#### 5b. Notion Dashboard / Linear Inbox

Linear / Notion / GTD-Style:[^20]
- **Today-View** mit „Due today + overdue + due-this-week" Klassifikation.
- **Weekly Review-Pattern**: 1×/Woche „was hat sich geändert".

**Suche „what changed since"-Pattern**: Linear/Notion-Spezifika *ohne* direkten Treffer in WebSearch (`not found` für die exakte Pattern-Beschreibung). Plausibles Vorbild: Linear Inbox + GitHub PR-Review-Inbox („since you last visited"). Das **konkrete Pattern** ist ein „Diff-Block" oben am Dashboard: „Seit Ihrem letzten Login (vor 23 Tagen): 2 neue Briefe, 1 Frist näher gerückt, 1 Vorgang abgeschlossen". `confidence: medium` für die Übertragbarkeit.

#### 5c. Banking-Apps (N26 / Revolut / Sparkasse)

Pattern aus Banking-App-UX:[^8][^21]
- **Saldo-Top-Karte**: zentrale Größe oben, alles andere darunter.
- **Letzte Transaktionen** in chronologischer Liste mit Kategorie-Icons.
- **„Auffällige Ausgabe"**-Tile (Revolut Insights, Sparkasse Finanzplaner): Out-of-Pattern-Erkennung.
- **Push-Notification je Transaktion** (Echtzeit-Trust).

**Übertragung auf Verwaltung**:
- **„Saldo"-Karte** = „Ihre Verwaltungslage": Anzahl offener Vorgänge + nächste Frist + ungelesene Briefe — wie Konto-Saldo + nächste Buchung + ungelesene Mitteilungen.
- **„Auffällige Datenabfrage"**: Out-of-Pattern-Datenzugriffe (DSC-Tile-Verschmelzung).
- **Push-Notification je Behörden-Bewegung**: nicht nur „neuer Brief", sondern „Frist näher gerückt", „Vorgangsstatus geändert", „neue Datenabfrage durch Behörde X".

#### 5d. Productivity-Apps Reclaim / Motion „Nächste Aktion"

Reclaim / Motion-Pattern: AI priorisiert Tasks nach Frist + Kalender-Verfügbarkeit + Energy-Pattern. Übertragbar auf „Heute zu tun"-Karte: AI priorisiert die *eine* nächste Aktion mit höchstem Folge-Schadens-Risiko (Frist + Konsequenz). **Aber**: das ist die DSGVO-Art-22-Linie — siehe §8.

### 6. Aufmerksamkeit & Cognitive Load

#### 6a. Hick-Hyman + Miller — UI-Implikationen

Hick's Law: Entscheidungszeit wächst logarithmisch mit Anzahl der Optionen.[^17][^18] Miller's Law: 7 (± 2) Items in Working Memory; Chunking als Lösung.

**Recommendation**:
- **≤7 Top-Karten** im First View (Above-the-Fold Desktop / Above-the-Scroll Mobile).
- **Chunking** in Sektionen: „Heute zu tun" (3 Karten) + „Übersicht" (4–5 Karten Themen) + „Nichts zu tun heute" (Empty-Sektion mit positiver Botschaft).
- **Progressive Disclosure**: Sub-Tasks (z. B. Stammdaten-Sync-Details) nur per Click.

#### 6b. F-Pattern / Z-Pattern Reading

Auf textlastigen Pages (gov.uk-typisch) dominiert F-Pattern; auf Card-Grids dominiert Z-Pattern (mit Hot-Spots in den vier Ecken). Dashboard-Implikation: **wichtigste Karte oben links** (Z-Anfang), **CTA oben rechts** (Z-zweiter Punkt), **Fußleiste mit „weniger wichtig"** (Z-Ende). Kein direkter `confidence: high`-Beleg in dieser Recherche; Standard-UX-Heuristik. Quelle: NN/g, jakob.com.

#### 6c. eGov-MONITOR Verständlichkeits-Defizit

eGov-MONITOR 2025 + Posteingang-Recherche: 75 % von Behördensprache überfordert.[^1][^44] Implikation für Dashboard: **kein Behörden-Jargon im UI-Text**. Statt „Verwaltungsakt mit Wirkung zum 14.05." → „Ihr Wohnsitz ist seit dem 14. Mai amtlich am neuen Ort". Der Posteingang-Spec (parallel) liefert die AI-Übersetzungs-Layer; der Dashboard *zitiert* diese.

### 7. Speculative 2027 — was unser Demo-Dashboard zeigen kann, das heute kein DE-Portal zeigt

**Nicht jeder Punkt ist domain-expert-clean** — ich markiere offene Linien explizit.

#### 7a. „Heute zu tun"-Karte mit AI-priorisierter Top-3-Action

- AI wählt aus offenen Briefen + Vorgängen + Fristen die 3 Aktionen mit höchstem nächste-Schritt-Wert.
- Reasoning sichtbar: „Diese Aktion zuerst, weil Frist morgen / weil Folge-Schaden Mahngebühr".
- **Domain-expert-Risiko**: Art. 22 DSGVO — siehe §8 Disagreement.

#### 7b. „Mein Status"-Tile (Vorgangs-Saldo)

- „3 Vorgänge offen, davon 1 bei Ihnen, 2 bei Behörden — gemeinsam **8 Tage** bis nächste Aktion".
- Pattern aus Banking-App-Saldo (eine Zahl, klare Bedeutung).

#### 7c. „Datenschutz-Cockpit"-Tile (DSC-Aggregat)

- „2 Datenabfragen in den letzten 30 Tagen — Details ansehen" → Verlinkung in BVA-DSC (read-only) + lokale Anzeige der letzten Behörden-Bewegungen via Posteingang.
- **Wichtig**: kein Parallel-DSC-Build.

#### 7d. „Familie"-Tile (gemeinsame Vorgänge)

- Persona-spezifisch: Anna / Familie Schmidt sehen Mit-Berechtigte → gemeinsame Vorgänge (Umzug-Cascade Familie, Kindergeld, Kita-Anmeldung).
- Vollmachts-/Sorge-Modell ist `domain-expert validate` (siehe §8).

#### 7e. „Stammdaten-Sync"-Tile

- Pro Datenfeld (Adresse, Bankverbindung, Telefon): „bei welcher Behörde wann zuletzt verifiziert".
- **Vorbild**: Suomi.fi Sync-Health.
- **Aber**: heute ist das Wissen, „welche Stelle hat veraltete Adresse", *nicht* automatisch verfügbar — wir müssen es als „Speculative 2027" framen, nicht als „heute schon möglich".

#### 7f. „Termine"-Tile (Behörden-Termine + .ics-Export)

- Anstehende Termine bei Bürgeramt / ABH / ELSTER-Webinar / Beratung.
- 1-Klick „In meinen Kalender" (.ics-Download) — Pattern aus Eventbrite, gov.uk Termin-Buchung.

#### 7g. „Was ist neu seit letztem Login"-Diff-Block

- Linear-Inbox-Pattern: oben am Dashboard ein narrativer Streifen.
- „Seit Ihrem letzten Login vor 23 Tagen: 2 Briefe, 1 Frist näher, 1 Vorgang abgeschlossen". Klick darauf → expandiert Detail.

### 8. Demo-Konzept-Fragen — Architektur-Entscheidungen

#### 8a. Single-Page-Scroll vs. Tab-Komposition

**Single-Page-Scroll (Notion-Style)**:
- Pro: alle Information in einem Blick, mobile-friendly, simple mental model.
- Contra: Above-the-Fold ist hart (Cognitive-Load), bei vielen Items unübersichtlich.

**Tab-Komposition (Apple Today + iCal-Tabs)**:
- Pro: jede Sektion eigene Konzentration; Above-the-Fold sauber.
- Contra: Bürger:in muss switchen, "zentrale Ansicht" verloren.

**Recommendation**: **Hybrid** — *eine* lange Scroll-Page als Default, mit *Sticky-Top-Bar* die zu Sektionen springt (Anchor-Links). Above-the-Fold zeigt: „Heute zu tun" (3 Karten) + „Diff seit letztem Login" + „Schnell-Aktionen". Below-the-Fold: Themen-Bereiche (à la Borger.dk, ≤7).

#### 8b. AI-Assistent: prominent oben oder Floating-Widget?

**Prominent oben (gov.uk-Pattern)**: ein Search-/Chat-Field als zentrales Element.
**Floating-Widget (DigitalServiceLab-Pattern)**: kleines „Assistent fragen"-Pill rechts unten.

**Recommendation**: **Floating-Widget rechts unten** (Bürger findet selbst, was er sucht; Assistent ist *Begleiter*, nicht *Hauptperson*). Begründung: eGov-MONITOR-Top-Wunsch ist „findability" + „nicht doppelt eingeben" — nicht „Dialog mit KI". Der Assistent ist Spezial-Werkzeug für komplexe Vorgänge (Aufenthaltstitel-Verlängerung), nicht für „Heute zu tun".

#### 8c. Erledigte Vorgänge persistent oder ausgegraut?

**Recommendation**: **persistent sichtbar, aber sekundär** (Achievement-Pattern: „13 Vorgänge in 2026 abgeschlossen" als Vertrauens-Anker; Click → Archiv). Anti-Pattern: Auto-Löschen nach 30 Tagen.

#### 8d. Empty-State („leerer" Dashboard)

Bürger:in ohne offene Vorgänge sieht heute in BundID einen quasi leeren Bildschirm. **Recommendation**:[^45]
- Celebratory empty state: „Alles erledigt!" mit Hero-Illustration.
- Sub-Karten: „Bei diesen Themen war zuletzt etwas zu tun" (Vergangenheits-Liste mit „heute geprüft, alles ok").
- Proaktive Tile: „Wussten Sie? Sie können jetzt Ihre Steuererklärung 2025 vorausfüllen lassen" (Lebenslagen-Hinweis).
- Datenschutz-Tile bleibt sichtbar — Bürger:in soll auch "im leeren Zustand" sehen, dass das Datenschutz-Cockpit aktiv ist.

#### 8e. Frist-Aggregation: nach Datum oder nach Vorgang?

**Recommendation**: **nach Datum global sortiert als primärer View** (chronologisch, nächste Frist zuerst — Borger.dk-Pattern „upcoming agreements and deadlines"). **Sekundär**: Filter-Toggle „nach Vorgang gruppieren" (Vorgang-zentriert wie Posteingang-Spec). Begründung: Frist ist *zeitkritisch*, Vorgang ist *thematisch* — Zeit gewinnt im "heute zu tun"-Frame.

### 9. Disagreement-prone areas — to flag for domain-expert

Ich nenne fünf Punkte, bei denen domain-expert (legal/process-realism) **wahrscheinlich Korrektur oder Begrenzung** verlangen wird. Concept-verifier sollte diese Liste explizit adjudizieren.

#### 9a. AI-priorisierte Top-3-Action — Art. 22 DSGVO + RDG

**Wir schlagen vor**: AI ranked die 3 wichtigsten Handlungen für „heute zu tun" basierend auf Frist + Schaden + Aufwand.

**Domain-expert-Risiko**:
- **Art. 22 DSGVO** (automatisierte Entscheidung im Einzelfall, einschl. Profiling): AI „entscheidet" hier *für* die Bürger:in, was sie als nächstes tun soll. Wenn die *rechtliche Wirkung* sich aus dem Folge-Verhalten ergibt (Frist verpasst, weil AI sie weggepriorisiert hat), könnte das in §22-Nähe rutschen.[^46][^47]
- **Mitigation**: AI ist *Empfehlungsmaschine*, nicht *Entscheidungsmaschine*. Bürger:in hat immer den vollen Listen-View; AI-Top-3 ist ein *Vorschlag* mit „Warum?"-Tooltip. Klar als „Empfehlung" markiert. Reasoning sichtbar: „Wir empfehlen X, weil Frist näher als Y". Damit liegt menschliche Endkontrolle vor → Art. 22 nicht einschlägig.[^46]
- **RDG**: Wenn AI-Empfehlung „widersprechen Sie diesem Bescheid" lautet, nähert sie sich der RDG-Linie aus Posteingang-Spec. Hier nur „Schauen Sie sich diesen Brief an" / „Termin in 14 Tagen — vorbereiten?" — keine Rechtsempfehlung.

`domain-expert validate`: Wo zieht man die Linie zwischen „algorithmische Aufgaben-Sortierung" (zulässig wie Mail-Inbox-Sortierung) und „Rechtsdienstleistung" / „automatisierte Entscheidung"?

#### 9b. „Wartezeit-Median pro Behörde"-Tile

**Wir schlagen vor**: Tile zeigt „Ihre Behörde X bearbeitet typischerweise Anträge in 12–18 Tagen".

**Domain-expert-Einwand erwartet**: Solche Daten sind **kommunal-sensitiv**, gibt's nirgends offiziell publiziert. Bundesweite Aggregat-Statistiken zur Bearbeitungszeit pro Antragstyp gibt es nicht öffentlich. **Wir würden Daten erfinden** — mit `[MOCK]`-Watermark schon, aber das wirft ein realistisches Erwartungs-Bild auf, das in der Realität nicht eingelöst werden kann.

**Mitigation-Optionen**:
1. Tile streichen.
2. Statt Median „Ihr aktueller Vorgang läuft seit X Tagen, mediane Bearbeitung ähnlicher Anträge dieser Behörde lag bei Y Tagen *(Beispieldaten)*" — explizit als Beispiel markiert.
3. Statt Wartezeit „letzter Status-Update vor X Tagen" zeigen — das ist *belegbar* aus dem BundID-Statusmonitor.

`domain-expert validate`: Welche der drei Optionen ist real-akzeptabel?

#### 9c. „Datenschutz-Cockpit-Tile" — Verhältnis zum BVA-DSC

**Wir schlagen vor**: Tile mit „2 Datenabfragen in den letzten 30 Tagen — Details" als Inline-Sicht im Dashboard.

**Domain-expert-Risiko**: Wir dürfen kein **paralleles, konkurrierendes** Cockpit zum offiziellen BVA-DSC bauen. Die Aussage „letzte 30 Tage" muss aus dem **echten** BVA-DSC kommen (read-only API). Eine selbst-gepflegte Liste lokal in unserer App wäre redundant + datenschutzrechtlich heikel (Datenkopie).

**Mitigation**: Tile ist „Verlinkungs-Tile" mit *aggregiertem* Counter (read-only, gefetcht aus BVA-DSC bei Bedarf), kein eigener Speicher. Im Mock: simulieren wir genau diesen Read-only-Aggregator.

`domain-expert validate`: ist das aus DSC-Architektur-Sicht ok? Gibt es im BVA-DSC eine API für „Anzahl Datenabfragen letzte 30 Tage", oder nur die volle Listen-Sicht?

#### 9d. „Familie"-Tile (joint Vorgänge)

**Wir schlagen vor**: Bürger:in sieht in einem Tile gemeinsame Vorgänge mit Partner:in / Kindern.

**Domain-expert-Risiko**:
- **Vollmacht** (BGB §164 ff.): bedarf einer schriftlichen oder konkludent-erteilten Vollmacht der erwachsenen Partner:in. UI-Switch „Familie" reicht nicht. [**domain-expert 2026-05-08**: konkludente Vollmacht zwischen Ehepartnern (Anscheins-/Duldungsvollmacht) reicht **nicht** für hoheitliche Verfahrenshandlungen — § 14 Abs. 1 S. 3 VwVfG verlangt schriftlichen Nachweis auf Verlangen. App-interne Sicht ja (Art. 6 Abs. 1 lit. b DSGVO), Außenwirkung gegenüber Behörden nein.]
- **Elterliche Sorge** (§§1626 ff. BGB): bei minderjährigen Kindern automatisch durch beide Eltern. Aber: für Vorgänge des Kindes gibt's eigene Stammdaten-Realitäten (Steuer-ID des Kindes, Krankenkasse etc.).
- **EUDI-Wallet-Attestations** ab 2027: Vollmacht als verifizierbares Credential möglich — d. h. UI-Switch könnte gestützt werden auf „verifizierte Vollmacht-Attestation in der Wallet".

**Mitigation**: Tile zeigt „Familie" *nur*, wenn entsprechende Vollmacht-/Sorge-Credentials vorliegen (im Mock: vorbefüllt für Familie-Schmidt-Persona). Für Anna (Single, kein Kind): Tile wird *nicht* gezeigt → Persona-spezifisches Empty-State.

`domain-expert validate`: Welches rechtliche Modell trägt das Tile? Können wir eine Joint-Vorgang-Sicht ohne expliziten EUDI-Wallet-Vollmacht-Credential anbieten?

#### 9e. „Stammdaten-Sync-Health"-Tile

**Wir schlagen vor**: pro Datenbestand (Adresse / Bank / Telefon) eine kleine Health-Tile mit „last verified".

**Domain-expert-Risiko**: Das Wissen „Behörde X hat Ihre alte Adresse" setzt voraus, dass wir *bidirektional* mit X sprechen können. Heute (2026): nur das **Datenschutzcockpit** (BVA) gibt einen begrenzten Einblick auf Daten-Übermittlungen *zwischen* öffentlichen Stellen — *nicht* auf Daten-Stand *bei* einer Behörde. Das Sync-Health-Tile macht ein *Versprechen*, das wir technisch nicht einlösen können — auch nicht in 2027 ohne weiteren RegMoG-Ausbau.

**Mitigation**: Tile als **„Speculative 2027"** markiert. Im Mock: simulieren wir „letzte Verifikation bei Meldebehörde am 14.04.2026, bei Finanzamt am 02.03.2026, Bank: nicht abgefragt — dort müssten Sie selbst aktualisieren". Das macht die rechtlich-technische Lücke *im UI sichtbar*, statt sie zu kaschieren.

`domain-expert validate`: ist die transparente Speculative-Markierung akzeptabel, oder muss das Tile streichen?

## Implications for our demo

- **Hero-Layout** *(„heute zu tun" als Zentrum-Metapher)*:
  1. **Above-the-Fold Top-Bar**: kurze Begrüßung („Guten Morgen, [Vorname]"), „letzte Anmeldung vor X Tagen", Sprache + Logout.
  2. **„Diff-Block seit letztem Login"** *(narrativ, 1 Zeile)*: „2 neue Briefe, 1 Frist näher, 1 Vorgang abgeschlossen — Details unten."
  3. **„Heute zu tun"-Karte** (max. 3 Aktionen, AI-priorisiert mit Reasoning, jede mit Frist + Behörde + 1-Klick-CTA).
  4. **„Übersicht"-Tile-Grid** (≤6 Tiles, Borger.dk-Pattern): *Posteingang* (X ungelesene), *Vorgänge* (Y offen), *Termine* (.ics-fähig), *Stammdaten* (Sync-Health), *Datenschutzcockpit* (Z Abfragen letzten 30 Tagen), *Familie* (sofern Vollmacht/Sorge vorliegt).
  5. **Below-the-Fold Themen-Sektionen** (à la Borger.dk Mit Overblik): Steuer · Wohnen · Aufenthalt · Familie · Soziales · Mobilität (KFZ).
  6. **Floating Assistent-Widget rechts unten**.

- **Empty-State als bewusste Designaufgabe**: Nicht „nichts zu tun" als Text, sondern Celebratory-Pattern + proaktive Lebenslagen-Vorschläge + permanente DSC-Tile.

- **Datenschutz-Cockpit-Tile** als bewusster Gegenentwurf zu Gosuslugi-Ästhetik: Verlinkung auf das offizielle BVA-DSC, Aggregat-Counter inline.

- **Persona-spezifische Tile-Komposition**:
  - **Anna Petrov**: Aufenthaltstitel-Frist-Karte oben (15 Tage vor Ablauf rot), „Familie"-Tile **ausgeblendet**, „Steuer"-Tile sichtbar (1. Steuererklärung in DE).
  - **Familie Schmidt**: „Familie"-Tile aktiv (gemeinsame Umzug-Cascade, Kita-Anmeldung); Steuererklärung-Tile mit „Ehegatten-Splitting"-Hinweis.
  - **Mehmet Yıldız**: Selbstständigen-Tiles (Gewerbe, IHK, Berufsgenossenschaft, Umsatzsteuer-Voranmeldung-Frist). Gewerbe-Adresse als separates Sync-Health-Item.

- **Reasoning visible** überall: jede priorisierte Karte zeigt „Warum oben?" — Transparenz statt Black-Box-AI.

- **„Heute zu tun"-Top-3 als Demo-Wow-Moment**: Aufzeichnung Loom-Video — Anna loggt ein, AI sagt „heute: Aufenthaltstitel verlängern (Frist 15 Tage), Stromzähler-Stand für Endabrechnung an EnBW (Umzug-Cascade-Folge), Steuererklärung 2025 vorausgefüllt prüfen". Der Viewer versteht in **<10 Sekunden** den Wert.

- **Login-Frequenz-Pattern entwerfen**: Da Bürger:innen ~5×/Jahr einloggen, jeder Login muss vollständig informieren. „Diff seit letztem Login"-Block ist deshalb *load-bearing* für die Demo.

- **Cognitive-Load-Discipline**: max 7 Tiles im First View. Restliche Funktionen progressiv.

- **Don't claim what BundID doesn't deliver**: BundID-Statusmonitor zeigt *Anträge*, kein Frist-Aggregat oder Diff-Block. Wir müssen das Demo als „auf Basis BundID/DeutschlandID denkbar" framen, nicht als „BundID kann das schon".

- **Mock-Backend-Hint** für mock-backend-coder:
  - Datenmodell `DashboardSnapshot` (timestamp + diff-since-last-login + top3-actions).
  - Mock-API `getDashboard(persona, lastLoginAt)` → returns snapshot.
  - Latency 300–800 ms (CLAUDE.md-konform).

## Open questions

- **Banking-vs-Verwaltungs-Frequenz für DE**: konkrete DE-Studie zur Login-Frequenz von Banking-Apps vs. BundID — `not found`. Bitkom-Banking-Reports oder BaFin-Statistiken könnten triangulieren — `domain-expert validate`.
- **„Frist verpassen"-Statistik DE**: keine bundesweite Quote für versäumte Widerspruchsfristen — `not found` in dieser Recherche.
- **BVA-DSC-API**: gibt es eine maschinen-lesbare Aggregat-Schnittstelle (Count Abfragen letzte 30 Tage), oder nur die Listen-Sicht? `domain-expert validate`.
- **A/B-Tests Countdown-Chip vs. absolutes Datum** in DE-Verwaltungs-UI: keine öffentlich publizierten Studien gefunden — `not found`.
- **Mein-ELSTER + Krankenkassen-Aggregations-Möglichkeit**: gibt's API/Standard, der Read-only-Inbox-Status aus diesen Silos in eine externe App pullen könnte? — Wahrscheinlich nicht; `domain-expert validate`.
- **Vollmacht/Sorge-Credentials in EUDI-Wallet 2027**: ist die deutsche Wallet-Implementierung darauf vorbereitet, eine Eltern-/Vollmacht-Attestation darzustellen? `domain-expert validate`.
- **DigitalService-DE-Forschung**: gibt es publizierte User-Research zu "What citizens want on their dashboard"? Erste Suche `not found` für dezidierte Dashboard-Studien aus dem DigitalService-Bund-Blog. Direkt-Anfrage / Tieferes Crawling sinnvoll.
- **Linear-Inbox-„what changed since"-Pattern Citation**: konnte nicht direkt belegt werden — `confidence: medium`.
- **Frist-Heuristik (Countdown vs. Listen-Icon)**: keine direkte Studie — `not found` / heuristisch.

## Hand-off to domain-expert

Folgende Aussagen benötigen explizite Bestätigung/Korrektur:

1. **Art. 22 DSGVO + Top-3-AI-Empfehlung**: ist die Architektur „AI empfiehlt, Bürger entscheidet, Reasoning sichtbar" ausreichend, um aus Art. 22 herauszufallen? Welche Disclaimer / Logging-Anforderungen gelten?
2. **Wartezeit-Median-Tile**: streichen oder mit `[Beispieldaten]`-Markierung zulässig?
3. **DSC-Tile-Architektur**: Aggregat-Counter inline + Verlinkung in BVA-DSC — gibt es eine technisch saubere Read-only-Pfad? Ist „Datenkopie lokal" verboten?
4. **Familie-Tile-Berechtigungsmodell**: BGB-Vollmacht / §1626 Sorge / EUDI-Vollmacht-Credential — welches Modell trägt das Tile aus 2026er-Sicht? Was ist „Speculative 2027"?
5. **Stammdaten-Sync-Health-Tile**: technisch möglich heute? Falls nicht, ist „Speculative 2027 mit transparenter Markierung" ok?
6. **„Diff seit letztem Login"-Block**: aus rechtlicher Sicht ok, dass wir Bürger:innen-side mitführen, was sie zuletzt gesehen haben? Datenschutz-Implikationen?
7. **„Heute zu tun"-Empfehlung mit Reasoning**: dürfen wir konkrete Behörden-Aktionen empfehlen („Widerspruch in Vorbereitung — möchten Sie?"), oder ist das RDG-Linie?
8. **eGov-MONITOR-Zahlen-Triangulation**: 33 % Vertrauen, 12 % „Staat einfacher", 36 % Auffindbarkeits-Hürde, 61 % „schnell finden"-Voraussetzung, 64 % „aktive Kommunikation" — alle aus eGov-MONITOR 2025. Bestätigung der exakten Werte vs. Original-PDF.
9. **BundID-Frequenz-Berechnung**: 2 Mio. Logins / 4,86 Mio. Konten = ~0,4 Logins/Konto/Monat. Aktuelle offizielle BMDS-Pressezahlen 2026?
10. **Linked-Authority-Tile (Tile pro Behörde)**: dürfen wir das myGov-/RealMe-Pattern Behörden-Logos zeigen, oder ist das Marken-/Hoheitszeichen-Risiko?

## Sources

[^1]: [eGovernment MONITOR 2025 — Initiative D21](https://initiatived21.de/publikationen/egovernment-monitor/2025) — accessed 2026-05-08
[^2]: [eGovernment MONITOR 2025 — Wie die digitale Verwaltung helfen kann, Staatsvertrauen zurückzugewinnen (Initiative D21)](https://initiatived21.de/presse/egovernment-monitor-2025-wie-die-digitale-verwaltung-helfen-kann-staatsvertrauen-zurueckzugewinnen) — accessed 2026-05-08
[^3]: [dbb Bürgerbefragung öffentlicher Dienst 2025 — Forsa für dbb](https://www.dbb.de/artikel/einfacher-schneller-digitaler-das-erwarten-die-deutschen-vom-staat.html) — accessed 2026-05-08
[^4]: [eGovernment Monitor 2025: Fortschritt sieht anders aus (egovernment.de)](https://www.egovernment.de/egovernment-monitor-2025-fortschritt-sieht-anders-aus-a-162c77609c803533266ed7e6584e5638/) — accessed 2026-05-08
[^5]: [BundID — registrierte Nutzer bis 2025 (Statista)](https://de.statista.com/statistik/daten/studie/1477837/umfrage/registrierte-nutzer-der-bundid/) — accessed 2026-05-08
[^6]: [Hunderttausende inaktive BundID-Konten sind gelöscht (heise online)](https://www.heise.de/en/news/After-one-off-payment-Thousands-of-inactive-BundID-accounts-are-deleted-10617317.html) — accessed 2026-05-08
[^7]: [BMI BundID FAQ — Was ist ein BundID-Konto](https://www.bmi.bund.de/SharedDocs/faqs/DE/buergerservice/tabellen-faq/was-ist-ein-bundid-konto-und-wie-lege-ich-es-an.html) — accessed 2026-05-08
[^8]: [Mobile App Engagement Benchmarks by Industry 2025 (UXCam)](https://uxcam.com/blog/mobile-app-engagement-benchmarks/) — accessed 2026-05-08
[^9]: [Mit Overblik (My Overview) on borger.dk — Digitaliseringsstyrelsen](https://en.digst.dk/digital-services/borgerdk-national-citizen-portal/mit-overblik/) — accessed 2026-05-08
[^10]: [Mit Overblik på Borger.dk — Gentofte Kommune](https://gentofte.dk/borgerservice/kontakt-og-raadgivning/mit-overblik-paa-borgerdk/) — accessed 2026-05-08
[^11]: [State Portal eesti.ee — id.ee](https://www.id.ee/en/article/state-portal-eesti-ee/) — accessed 2026-05-08
[^12]: [State Portal eesti.ee — RIA](https://www.ria.ee/en/state-information-system/personal-services/state-portal-eestiee) — accessed 2026-05-08
[^13]: [Data Tracker — RIA Estonia](https://www.ria.ee/en/state-information-system/people-centred-data-exchange/data-tracker) — accessed 2026-05-08
[^14]: [GOV.UK One Login — about.account.gov.uk](https://home.account.gov.uk/services-using-one-login) — accessed 2026-05-08
[^15]: [Launch of MyICA — Singapore High Commission Brunei](https://brunei.mfa.gov.sg/mission-updates/launch-of-myica-29-jun-2018/) — accessed 2026-05-08
[^16]: [Singapore's ICA launches MyICA web portal — OpenGov Asia](https://opengovasia.com/2018/07/02/singapores-ica-launches-secure-web-portal-for-citizen-centric-e-services/) — accessed 2026-05-08
[^17]: [Hick's Law and UX Design (Dovetail)](https://dovetail.com/ux/hicks-law/) — accessed 2026-05-08
[^18]: [Miller's Law — Laws of UX](https://lawsofux.com/millers-law/) — accessed 2026-05-08
[^19]: [How to add and edit widgets on iPhone — Apple Support](https://support.apple.com/en-us/118610) — accessed 2026-05-08
[^20]: [Getting Things Done (GTD) — Todoist](https://www.todoist.com/productivity-methods/getting-things-done) — accessed 2026-05-08
[^21]: [Top 15 Banking Apps with Exceptional UX Design 2026 (wavespace)](https://www.wavespace.agency/blog/banking-app-ux) — accessed 2026-05-08
[^22]: [BundID erklärt: So funktioniert das neue Bürgerkonto (Münchener Blatt 2025)](https://muenchener-blatt.de/2025/11/bundid-erklaert-so-funktioniert-das-neue-buergerkonto-anmeldung-postfach-probleme/11748/) — accessed 2026-05-08
[^23]: [Deutscher Bundestag — Bürokratieabbau: Statusmonitor-Entwicklung abgeschlossen](https://www.bundestag.de/presse/hib/kurzmeldungen-1166970) — accessed 2026-05-08
[^24]: [Bureaucratic jungle: Status monitor for BundID — heise online](https://www.heise.de/en/news/Bureaucratic-jungle-Status-monitor-for-BundID-to-relieve-the-economy-11272430.html) — accessed 2026-05-08
[^25]: [ELSTER Privatpersonen — Posteingang](https://www.elster.de/elsterweb/infoseite/privatpersonen) — accessed 2026-05-08
[^26]: [Service-BW Wikipedia](https://de.wikipedia.org/wiki/Service-bw) — accessed 2026-05-08
[^27]: [Behördenfinder Deutschland (Wikipedia, Abschaltung 2024)](https://de.wikipedia.org/wiki/Beh%C3%B6rdenfinder_Deutschland) — accessed 2026-05-08
[^28]: [servicesuche.bund.de — Bundesportal](https://servicesuche.bund.de/) — accessed 2026-05-08
[^29]: [dbb Bürgerbefragung 2025 PDF (Forsa)](https://www.dbb.de/fileadmin/user_upload/globale_elemente/pdfs/2025/250903_foersa_buergerbefragung_oeffentlicher_dienst_dauptbefragung.pdf) — accessed 2026-05-08
[^30]: [Widerspruchsfrist (Juraforum)](https://www.juraforum.de/lexikon/widerspruchsfrist) — accessed 2026-05-08
[^31]: [Widerspruchsfrist verpasst (Kanzlei Herfurtner)](https://kanzlei-herfurtner.de/widerspruchsfrist-verpasst/) — accessed 2026-05-08
[^32]: [BundID — Wikipedia](https://de.wikipedia.org/wiki/BundID) — accessed 2026-05-08
[^33]: [BundID wird 2026 zum Pflichtwerkzeug für Bürger (ad-hoc-news)](https://www.ad-hoc-news.de/boerse/news/ueberblick/bundid-wird-2026-zum-pflichtwerkzeug-fuer-buerger/68444056) — accessed 2026-05-08
[^34]: [Datenschutzcockpit — Digitale Verwaltung](https://www.digitale-verwaltung.de/Webs/DV/DE/registermodernisierung/elemente/datenschutzcockpit/datenschutzcockpit-node.html) — accessed 2026-05-08
[^35]: [BVA — Informationen für Bürgerinnen und Bürger (Registermodernisierung)](https://www.bva.bund.de/DE/Services/Behoerden/Verwaltungsdienstleistungen/Registermodernisierung/Informationen-Buerger/informationen_buerger_node.html) — accessed 2026-05-08
[^36]: [Datenschutzcockpit — Senator für Finanzen Bremen](https://www.finanzen.bremen.de/digitalisierung/digitalisierungsbuero/datenschutzcockpit-107106) — accessed 2026-05-08
[^37]: [Notion GTD Setup Guide (Samuel Thomas Davies)](https://www.samuelthomasdavies.com/how-to-set-up-gtd-in-notion/) — accessed 2026-05-08
[^38]: [GOV.UK One Login for HMRC — GDS Blog April 2026](https://gds.blog.gov.uk/2026/04/28/gov-uk-one-login-for-hmrc-how-we-made-it-happen-and-what-comes-next/) — accessed 2026-05-08
[^39]: [HMRC introduces GOV.UK One Login for new customers](https://www.gov.uk/government/news/hmrc-introducesgovukonelogin-for-new-customers) — accessed 2026-05-08
[^40]: [Personal data — Suomi.fi](https://www.suomi.fi/your-data/personal-data) — accessed 2026-05-08
[^41]: [Altinn Innboks — Norge](https://info.altinn.no/hjelp/innboks/innboks/) — accessed 2026-05-08
[^42]: [myGov Australia Link Services](https://my.gov.au/en/about/help/mygov-website/link-services-to-your-account) — accessed 2026-05-08
[^43]: [RealMe — New Zealand Government](https://www.govt.nz/organisations/realme/) — accessed 2026-05-08
[^44]: [Posteingang research file — internal docs/research/2026-05-08-posteingang-brief-erklaerer.md] — accessed 2026-05-08
[^45]: [Empty State UX Examples (Eleken)](https://www.eleken.co/blog-posts/empty-state-ux) — accessed 2026-05-08
[^46]: [Art. 22 DSGVO — Automatisierte Entscheidungen einschl. Profiling (dsgvo-gesetz.de)](https://dsgvo-gesetz.de/art-22-dsgvo/) — accessed 2026-05-08
[^47]: [KI und automatisierte Entscheidungen Art. 22 DSGVO (Fieldfisher)](https://www.fieldfisher.com/de-de/insights/kuenstliche-intelligenz-und-automatisierte-entscheidungen-im-einzelfall) — accessed 2026-05-08

## Summary

**Top 3 pain quantifications**: (1) **12 % der Deutschen sagen „Staat macht mein Leben einfacher"**, **15 % sehen Erwartungen an moderne digitale Verwaltung erfüllt** — der „warum überhaupt Dashboard"-Treiber [eGov-MONITOR 2025]; (2) **36 % nennen mangelnde Auffindbarkeit als Hürde**, **61 % machen positive Bewertung an „schnell finden" fest** — die meistgenannte Voraussetzung überhaupt, exakt das Pain das ein Dashboard löst [eGov-MONITOR 2025]; (3) **BundID-Login-Frequenz ~0,4 Logins/Konto/Monat (~5×/Jahr)** vs. Banking-Apps Größenordnungen häufiger — das Aufmerksamkeits-Asymmetrie-Problem, das jeder einzelne Login vollständig informieren muss [Statista BundID + UXCam Banking].

**Top 3 prior-art Patterns to steal**: (1) **Borger.dk Mit Overblik** als Themen-Bereich-Architektur (Steuer/Wohnen/Schuld/Studie/Leistungen + „upcoming agreements & deadlines"-Streifen); (2) **eesti.ee Data Tracker** als Datenschutz-Cockpit-Tile-Pattern (Trust durch Sichtbarkeit, kein Versprechen); (3) **Singpass MyICA + Apple Smart Stack** als status-getriebene Top-Karten-Priorisierung („Pass/Aufenthaltstitel läuft aus → diese Karte zuerst").

**Top 3 open disagreements for domain-expert**: (1) **AI-priorisierte Top-3-Action vs. Art. 22 DSGVO + RDG** — wo verläuft die Linie zwischen „algorithmische Sortierung" und „automatisierte Entscheidung mit rechtlicher Wirkung"; (2) **„Wartezeit-Median pro Behörde"-Tile** — Daten existieren nicht offiziell, wir würden sie erfinden — streichen oder mit Beispiel-Markierung zulässig; (3) **„Stammdaten-Sync-Health"-Tile** — die Wissensbasis (welche Behörde hat veraltete Daten) existiert 2026 technisch nicht — Speculative-Markierung akzeptabel oder muss streichen.
