---
target: umzug-autopilot
date: 2026-05-08
verdict: PROCEED
reviewer: concept-verifier
inputs_reviewed:
  - docs/research/2026-05-08-umzug-autopilot.md
  - docs/domain/umzug.md
  - docs/personas.md
  - CLAUDE.md
  - docs/PRD.md
independent_sources_consulted:
  - https://www.bussgeldkatalog.org/zu-spaet-umgemeldet/ (Bußgeld-Praxis)
  - https://www.finanzfrage.net/g/frage/welche-bussgelder-werden-tatsaechlich-in-berlin-bei-verspaeteter-ummeldung-zur-zeit-verhaengt (Berlin Praxis 35–1.000 €)
  - https://www.bussgeldkatalog.net/fahrzeug-zulassungsverordnung/mitteilungspflicht/ (§15 FZV Mitteilungspflicht und Meldebehörden-Klausel)
  - https://www.arbeitsagentur.de/familie-und-kinder/veraenderungen-mitteilen (Familienkasse — manuelle Veränderungsmitteilung)
  - https://www.owl-it.de/Aktuelles/OWL-IT-und-AKDB-sind-vorbereitet.php (RegMoG Stufe Meldewesen Live-Stand)
---

## Verdict
**PROCEED (with mandatory revisions to copy + cascade architecture)** — Pain, prior art, and legal basis are real and well-evidenced; the autopilot framing demonstrably tells the core thesis in 30 s; remaining risk is purely *framing risk* (Bußgeld-Marketing, Cascade-Tiefen-Bluff), which can be neutralised via the disclaimer copy and 4-block architecture specified below.

## Test-by-test analysis

### 1. User pain — PASS
Evidence is multi-source and converging:
- **Initiative D21 / TUM eGovernment MONITOR 2025**: Vertrauen in den Staat 33 % (von 38 % in 2022); 51 % machen unzureichende digitale Verwaltung mit-verantwortlich; „digitale Nutzungslücke" 33 %.[research §2; verifiable at initiatived21.de]
- **INSM Behörden-Digimeter 2026**: 11 % der OZG-Pflichtleistungen bundesweit digital nutzbar; bei aktuellem Tempo Vollausbau erst 2045.
- **Statistisches Bundesamt**: 92 % halten den bürokratischen Aufwand für (eher) zu hoch.
- **Persona-spezifisch**: Anna (Aufenthaltstitel an Adresse-im-AZR gekoppelt, ABH-Termin 4 Wochen bis 6 Monate), Schmidts (Familienkasse-Zuständigkeitswechsel ohne Auto-Push), Mehmet (KFZ-Halterumschreibung im Bezirkswechsel).
- **Verifiziert unabhängig**: Foren-Threads (gutefrage.net, finanzfrage.net) zeigen reale Verwirrung über Bußgeld-Höhe und „informiert das Meldeamt eigentlich alle anderen?" — der „Eine-Adresse-viele-Stellen-Trugschluss" aus `docs/domain/umzug.md` ist kein Strohmann, sondern dokumentierte Bürger-Realität.

Schwächste Stelle: research-scout fand *keine* harte „X Stunden pro Umzug"-Zahl — diese Lücke ist ehrlich markiert (`not found`) und torpediert die Demo nicht; qualitative Indikatoren tragen.

### 2. Legal realism — PASS mit Auflagen
- **Behörden-Cascade ist rechtlich gedeckt** für Finanzamt, Beitragsservice und Wehrverwaltung (§ 34 BMG i.V.m. § 36 BMG i.V.m. landesrechtlicher Meldedaten-Übermittlungsverordnung; § 11 Abs. 4 RBStV; § 58c SG; § 39 AO). Domain-expert hat die Norm-Kette präzise korrigiert; das ist die belastbarste Fassung.
- **Inland-Abmeldung**: §33 BMG (nicht §17 Abs. 2 — letzteres regelt nur Auslandsabmeldung). Korrektur durch domain-expert akzeptiert.
- **KFZ**: §15 FZV Abs. 5 enthält tatsächlich einen Öffnungs-Tatbestand für Meldebehörden-Übermittlung an Zulassungsstellen — *„sofern bei der Meldebehörde ein solches Verfahren eröffnet ist"* (verifiziert bussgeldkatalog.net). Bundesweit produktiv ist das **nicht**; einige Kommunen (Kassel u.a.) bieten den Komfortdienst lokal an. Eine pauschale Demo-Behauptung „erledigen wir automatisch" wäre für KFZ heute irreführend → Block-D-Architektur (s. unten) ist die richtige Antwort.
- **Familienkasse**: kein § 36 BMG-Push; § 68 EStG verlangt Mitwirkungspflicht der berechtigten Person. Verifiziert via arbeitsagentur.de „Veränderungen mitteilen". Auch hier: Block D, nicht Block A.
- **Krankenkasse**: GKV ist zwar Körperschaft d.ö.R., aber die Adresspflege ist keine im engeren Sinne öffentlich-rechtliche Pflichtaufgabe (§ 34 BMG-Erforderlichkeit nicht erfüllt); heute läuft die Adress-Aktualisierung über Versicherte oder DEÜV-Meldung des AG. Korrekt in Block B (Einwilligung).
- **Privatwirtschaft (Bank, Versicherer, AG, EVU, Telekom, PKV)**: zwingend Einwilligung (Art. 6 Abs. 1 lit. a DSGVO) — Block B. Konsens.
- **Ausländerbehörde**: § 87 AufenthG ist on-request-Norm, kein Push für reine Adressänderungen. Anna-Pain bleibt real → Block C oder D.
- **RegMoG-Stand 8. Mai 2026**: Stufe „Meldewesen" (IDNr-Aufnahme) seit 1. Nov 2024 in Kraft; weitere Verarbeitungs-Voraussetzungen seit 6. März 2026; Stufe „IDNr bei beigeschriebenen Personen" für Mai 2026 — am Stichtag entweder gerade live oder unmittelbar bevorstehend. Demo darf das *nicht* als „Vollausbau" framen — `Stand 2027` Hypothese ist erlaubt (siehe CLAUDE.md), muss aber als Spekulation kenntlich sein.

Verdict: Die Cascade-Idee ist **nicht legally impossible**. Der Schritt von „heute teilweise vorhanden" zu „2027 voll verfügbar" ist vertretbar, *wenn* die UI ehrlich kennzeichnet, was heute schon Push, was Antrag-mit-eID, und was reine Erinnerung ist.

### 3. Prior art — PASS
- **DE produktiv**: eWA (62,76 Mio. Bürger:innen, 2.500 Meldebehörden, „Einer für Alle"-Erfolg, aber Cascade endet bei PA-Adressaufkleber). Bestätigt durch domain-expert via BMDS-Quelle.
- **DE-Cascade-Beweis**: ELFE (Bremen + 11 Länder, Geburtsbündel, 36 h Bewilligung) zeigt Once-Only-Pattern ist in DE technisch möglich, gerade *nicht* nur in Estland.
- **International**: Estland (X-Road, verfassungsähnliches Once-Only-Verbot redundanter DBs), Dänemark (5-Tage-Frist, PostNord + Krankenkarte automatisch), Singapur (OSCARS), Frankreich (Multi-Mitteilung, ehrlich begrenzt).
- **Wichtige Korrektur am Diskurs**: UK „Tell Us Once" gilt **nicht** für Umzüge, nur Tod (und in SCO Geburten). Research-scout markiert das explizit — Demo darf nicht „wie UK TUO" sagen. ✓
- **Lessons learned**: Estonia is a *pattern* (single authoritative source + transparency cockpit), nicht ein „lift-and-shift". CLAUDE.md-Heuristik „It works in Estonia" wird respektiert.

### 4. Demo impact — PASS, Risiko bei Block-Inflation
- One-input → multi-Behörden-sync ist die direkteste Visualisierung der Autopilot-These. Wenn die Animation in <90 s landet (PRD §4 sagt das genau), ist der Wow garantiert für den Ziel-Viewer (DigitalService, BMDS, Tech4Germany).
- **Risiko**: 4-Block-Architektur ist aus Verifikator-Sicht legitim (siehe Adjudikation #2), aber der Viewer hat nur 30 s Aufmerksamkeit. **Mitigation**: Block A muss in den ersten 10 s landen (das ist der Wow); Block B/C/D dürfen visuell sekundär sein (unterhalb des fold im Loom-Frame, oder per Toggle „weitere Stellen anzeigen"). Die headline-Animation soll 4–6 Behörden gleichzeitig „anflammen" — nicht 12.
- **Don't-do**: keine Pop-up-Modals, keine Toast-Cascades. Die Aktion bleibt am Hero-Screen sichtbar.

### 5. Effort/value — PASS
Realistisch in <1 Woche Demo-Build umsetzbar:
- Mock-Backend-Cascade (orchestriert in `lib/mock-backend/autopilot/umzug.ts`): ~150 LOC, Latenz-getriggerte sequentielle Status-Updates.
- Frontend `<AutopilotTimeline>` mit framer-motion-Übergangen: ~1 Tag.
- Datenschutz-Cockpit-Tab: weitgehend View-only auf bereits modellierten Übermittlungsereignissen — ~1 Tag.
- Disclaimer-Copy + Tooltips mit Rechtsgrundlagen: ~0.5 Tage, blockiert nichts.

Dependencies: keine externen APIs; alles mock. AI-Assistent kann Block-C-Briefe (Hausarzt, Kita) generieren, aber das ist V2.

### 6. Misleading risk — MITIGATED durch Disclaimer + Architektur
Kritische Stellen:
- **„Erledigen wir für Sie" für KFZ/Familienkasse**: ohne Korrektur wäre das eine Lüge (s. Adjudikation #2). Block D + eID-Bestätigung löst das.
- **„Bis zu 1.000 € Bußgeld"** als Headline: Angst-Marketing ohne Bezug zur Praxis (s. Adjudikation #1). Lösung: nicht in Hero/Marketing, nur im Detail-Modal mit Praxis-Disclaimer.
- **„Stand 2027"-Spekulation vs. heute**: Demo-Tagline muss „Speculative Design — wie es 2027 aussehen *könnte*" sagen (CLAUDE.md zeile 3 verlangt das ohnehin). Auf der Autopilot-Screen reicht ein dezenter Footer-Hinweis.

## Adjudikation der Disagreements

### Disagreement #1 (mild): Bußgeld-Framing — Entscheidung: **domain-expert recht, mit Nuance**

**Begründung**: Web-verifizierte Praxis (bussgeldkatalog.org, finanzfrage.net Berlin-Praxis): typische Bußgelder 10–50 €, Berlin-Spanne 35–1.000 € *theoretisch*, Hamburg dokumentiert 68,50 € bei 9 Monaten Verspätung. Die 1.000 € sind Maximalrahmen, nicht Erwartungswert. Die 50.000 € (§54 Abs. 1) gelten ausschließlich für Falsch-/Nichtangaben — eine eigene Tatbestand-Kategorie, die Bürger nicht beim Vergessen treffen.

CLAUDE.md (zeile 16) verlangt „serious, citizen-respectful" Register. Angst-Marketing-Hebel widerspricht der Marken-Direktive.

**Per-Surface-Entscheidung**:
| Surface | Bußgeld-Erwähnung? | Begründung |
|---|---|---|
| Marketing-Hero / Landing-Page | **Nein** | Verstößt gegen „citizen-respectful" Register. |
| LinkedIn-Post / Loom-Tagline | **Nein** | Reduziert Demo auf Angst, nicht auf Komfort. |
| Autopilot-Hero-Screen | **Nein** | Lenkt vom Wow ab; Pain-Hebel ist Komfort + Vertrauen. |
| Frist-Countdown-Chip „14 Tage" | **Ja, dezent** | „Frist nach § 17 BMG" als Tooltip, ohne Bußgeld-Zahl. |
| Detail-Modal „Warum diese Frist?" | **Ja, mit Disclaimer** | Pflichtkontext für rechtsinteressierte Viewer. |
| Datenschutz-Cockpit-Tooltip | **Optional** | Verlinkung zu § 54 BMG für Recherche. |

**Pflicht-Disclaimer** (DE) bei jeder Bußgeld-Erwähnung:
> „§ 54 BMG sieht für verspätete Anmeldung einen Bußgeldrahmen bis 1.000 € vor. In der kommunalen Praxis liegen verhängte Bußgelder typischerweise zwischen 10 und 50 € — die Höhe entscheidet das jeweilige Bürgeramt im Einzelfall. Höhere Bußgelder bis 50.000 € (§ 54 Abs. 1 BMG) gelten nur für Falsch- oder Nichtangaben."

### Disagreement #2 (technisch): 3-Block vs. 4-Block Cascade — Entscheidung: **domain-expert recht — 4-Block-Architektur ist verbindlich**

**Begründung**: Block A (research-scout) mischt drei rechtliche Realitäten:
1. **Heute produktiver § 36-BMG-Push** (Finanzamt, Beitragsservice, Wehrverwaltung) — legitim.
2. **§ 33 BMG-Mechanik** (Meldebehörde alt ↔ neu, PA via § 28 PAuswG) — legitim.
3. **§ 15 FZV / Familienkasse-Zuständigkeitswechsel** — *kein* automatischer Push, weder rechtlich noch praktisch. § 15 FZV Abs. 5 kennt zwar die theoretische Meldebehörden-Klausel, ist aber *nicht* flächendeckend produktiv (verifiziert bussgeldkatalog.net + Stadt-Beispiele).

Wenn die Demo „erledigen wir automatisch" für KFZ/Familienkasse zeigt, baut sie ihren Wow auf einer **legalen Halbwahrheit** — genau die Misleading-Risk-Falle aus CLAUDE.md (Heuristik „Silent legal risk").

Der Vorschlag von domain-expert (Block D „Wir bereiten den Antrag vor — Sie bestätigen mit eID") löst das **elegant**:
- Bürger sieht weiterhin die Befreiung von Tipparbeit (Antrag ist vorgefüllt).
- Der eID-Tap als Mikro-Interaktion ist kein Cascade-Killer, sondern ein **Vertrauens-Anker** (DSGVO Art. 6 lit. a Einwilligung sichtbar).
- Animation bleibt erhalten: Block-A-Behörden „bestätigen sich selbst", Block-D-Behörden zeigen einen 1-Sekunden-eID-Pulse vor dem Häkchen.

**Risiko 4-Block für 30-s-Aufmerksamkeit**: gerechtfertigt. Ein Viewer, der Pixel zählt, sieht trotzdem nur **eine Spalte mit gestaffelten Zustandsänderungen** — die Block-Trennung muss visuell *subtil* sein (z. B. Trennstrich + Mini-Subhead, nicht vier separate Cards). Der Wow ist „viele Behörden gleichzeitig", nicht „wieviele Cluster".

**Verbindliche Architektur**:
- **Block A — „Erledigen wir automatisch"** (Rechtsgrundlage: § 33 BMG, § 34 BMG, § 36 BMG i.V.m. spezialgesetzlichen Übermittlungsnormen):
  - Einwohnermeldeamt (Anmeldung neuer Wohnort)
  - Einwohnermeldeamt alt (Wegzugsmitteilung, § 33 BMG)
  - Bundesdruckerei (PA-Adressaufkleber, § 28 PAuswG)
  - Finanzamt (örtliche Zuständigkeit, § 39 AO + § 36 BMG-Übermittlung)
  - Beitragsservice ARD/ZDF/Dlr (§ 11 Abs. 4 RBStV)
  - Wehrverwaltung (nur wenn relevant für Persona, § 58c SG) — *Persona-Schalter*

- **Block B — „Mit Ihrer Einwilligung jetzt"** (Rechtsgrundlage: Art. 6 Abs. 1 lit. a DSGVO, EUDI-Wallet-Credential):
  - Krankenkasse (GKV/PKV)
  - Bank/Sparkasse
  - Versicherer (Hausrat, KFZ-Haftpflicht, …)
  - Arbeitgeber (Personalakte)
  - EVU/Telekom

- **Block C — „Bitte selbst erledigen"** (kein realistischer Push-Pfad):
  - Kita-Anmeldung neuer Bezirk
  - Hausarztwahl
  - Schulamt-Wechsel
  - Vertragspartner-Sonderfälle (Vereine, Abos)
  - *Mehrwert*: Vorlage-Briefe aus dem Posteingang generieren.

- **Block D — „Wir bereiten den Antrag vor — Sie bestätigen mit eID"** (eID-Einzelaktion pro Empfänger; Rechtsgrundlage: § 18 PAuswG-Online-Ausweisfunktion + jeweilige Fachnorm):
  - KFZ-Zulassungsstelle (§ 15 Abs. 1 FZV) — eID + Halter-Bestätigung
  - Familienkasse (§ 67/68 EStG, Veränderungsmitteilung) — eID + Kindergeldnummer
  - Ausländerbehörde (§ 87 AufenthG, Adress-Update auf eAT) — eID + ABH-Termin-Buchung als Folge-Schritt (Persona Anna)
  - ggf. IHK / Berufsgenossenschaft (Persona Mehmet) — Persona-Schalter

**UI-Reihenfolge**: A oben (größter Wow, weitestgehend automatisch), D darunter (zeigt: Ihre Mitwirkung wird respektiert), B (Einwilligung — Zoom-fähig), C ehrlich am Ende.

## If REVISE — concrete changes required
N/A — Verdict ist PROCEED mit verbindlichen Architektur- und Copy-Vorgaben unten.

## If REJECT — alternative recommendation
N/A.

## If PROCEED — flags for product-architect

### Mandatory architecture decisions
1. **4-Block Cascade** ist verbindlich. Architektur exakt wie oben unter Disagreement #2 spezifiziert. Block A darf KFZ und Familienkasse **nicht** enthalten — diese gehören zwingend in Block D.
2. **Per Block sichtbar**: Rechtsgrundlage als kleines Tag (z. B. „§ 36 BMG", „Art. 6 lit. a DSGVO", „§ 18 PAuswG eID"), klickbar zum Detail-Modal mit voller Norm-Zitierung.
3. **Wegzugs-Behörde** muss sichtbar sein (§ 33 BMG-Mechanik), weil das den weit verbreiteten „muss ich am alten Ort abmelden?"-Trugschluss korrigiert — pädagogischer Wert für eGov-Diskurs.
4. **Persona-getriebene Block-Population**: Anna sieht ABH in Block D; Schmidts sehen Familienkasse in Block D + Wehrverwaltung *nicht*; Mehmet sieht IHK/Berufsgenossenschaft in Block D nur, wenn der Vorgang aus dem Gewerbe-Kontext kommt (Out-of-scope für Umzug-V1, aber hooks vorsehen).
5. **Latenz-Choreografie** im Mock-Backend (`lib/mock-backend/autopilot/umzug.ts`):
   - Block A: 300–800 ms je Behörde, sequenziell mit 200 ms Versatz.
   - Block D: eID-Pulse 1.5 s, dann 800–1.500 ms Bestätigung.
   - Block B: Toggle-getriggert, 400–900 ms je Empfänger.
   - Block C: keine Latenz, View-only mit Brief-Generator-Button.

### Bußgeld-Framing (verbindlich aus Adjudikation #1)
- **Niemals** in Hero, Marketing oder Loom-Tagline.
- **Nur** im Frist-Detail-Modal und Datenschutz-Cockpit, mit Pflicht-Disclaimer (siehe unten).
- **Pain-Hebel statt Bußgeld**: stattdessen „verpasste Behörden-Briefe", „Zustellungsprobleme bei KFZ-Bescheiden", „Mahnungen vom Beitragsservice", „verspätete Steuerbescheide". Das ist aus den Foren-Quellen die *tatsächlich* erlebte Bürger-Realität.

### Pflicht-Disclaimer-Copy (DE) auf der Autopilot-Screen

**Sichtbar in Footer der Autopilot-Hero unter dem Cascade-Block** (prominent, aber nicht den Wow überlagernd):

> **Hinweis zum Prototyp.** Diese Demo zeigt, wie ein Umzug 2027 mit Deutschland-Stack und EUDI Wallet aussehen *könnte*. Daten und Behörden-Antworten sind synthetisch (markiert mit `[MOCK]`).
>
> Heute (Stand Mai 2026) erledigt das Meldeamt automatisch nur einen Teil der gezeigten Schritte: die Wegzugsmitteilung an die alte Meldebehörde (§ 33 BMG), die Adress-Aktualisierung im Personalausweis (§ 28 PAuswG) sowie die regelmäßigen Übermittlungen an Finanzamt, Beitragsservice und Wehrverwaltung (§ 36 BMG i.V.m. § 11 Abs. 4 RBStV / § 39 AO / § 58c SG). Krankenkasse, Bank, Versicherer, Arbeitgeber und Energieversorger erfordern die Einwilligung der betroffenen Person (Art. 6 Abs. 1 lit. a DSGVO). KFZ-Halter:innen, Familienkasse und Ausländerbehörde benötigen jeweils eine eigene aktive Mitteilung — diese Demo simuliert eine eID-bestätigte Schnellbearbeitung, die bundesweit produktiv noch nicht verfügbar ist.

**Bußgeld-Disclaimer** (nur im Frist-Detail-Modal, wenn Nutzer auf „Warum 14 Tage?" klickt):

> § 17 BMG verpflichtet zur Anmeldung innerhalb von zwei Wochen nach dem Einzug. § 54 Abs. 2 Nr. 1 BMG sieht hierfür einen Bußgeldrahmen bis 1.000 € vor. In der kommunalen Praxis verhängen Bürgerämter typischerweise 10–50 € bei verspäteter Anmeldung; die Höhe entscheidet das jeweilige Amt im Einzelfall. Bußgelder bis 50.000 € nach § 54 Abs. 1 BMG gelten ausschließlich für Falsch- oder Nichtangaben, nicht für Verspätungen.

### Edge cases zu spezifizieren
1. **Persona Anna (§ 18g AufenthG)**: Block D muss ABH zeigen *und* einen Folge-Termin-Chip („Termin bei der ABH zur Aktualisierung der eAT-Karte buchen — Wartezeit Berlin-LEA ~4 Wochen") generieren. Das ist der Crossover zum Aufenthaltstitel-Verlängerungs-Vorgang im PRD.
2. **Wohnungsgeberbestätigung (§ 19 BMG)**: muss vor Block A im Eingabefluss erscheinen — ohne sie ist eine Anmeldung nicht möglich. Upload-Komponente mit „[MOCK] Wohnungsgeberbestätigung Lena Vogel" als Default.
3. **Wegzug ins Ausland**: Out-of-scope für Umzug-V1 (anderer Tatbestand, § 17 Abs. 2 BMG); UI darf nur den Inlands-Fall zeigen, wenn Eingabe „Auslandsadresse" → klare Fehlermeldung „Auslandsumzug erfordert separate Abmeldung — siehe Modul XY (in Vorbereitung)".
4. **Kein KFZ-Halter / Kein Kindergeld-Bezug / Kein Aufenthaltstitel**: Block D darf leer bleiben → dann ausblenden, nicht als „nichts zu tun"-Zeile zeigen (Demo-Ästhetik).
5. **§ 33 BMG-Frist „spätestens 3 Werktage"**: in Latenz-Choreografie als 3 s-„Wegzugsmeldung gesendet" sichtbar, mit Tooltip „Frist § 33 BMG: 3 Werktage" — kleines Detail, aber pädagogisch wertvoll.
6. **Datenschutzcockpit (`/datenschutz`)**: jede Übermittlung aus Block A muss dort als Eintrag landen mit Empfänger, Zweck, Rechtsgrundlage, Zeitstempel — das ist der Anti-Gosuslugi-Move, den CLAUDE.md fordert.
7. **Frist-Countdown-Chips**: Komponente `<FristCountdown>` (bereits in CLAUDE.md vorgesehen) muss unterschiedliche Typen kennen: gesetzlich (BMG 14 Tage), unverzüglich (FZV, RBStV), vertraglich (KK, Bank). Visuelle Differenzierung per Farbe oder Icon.

### Carry-forward-Korrekturen aus domain-expert
- **`docs/personas.md` Zeile 9**: Anna's Aufenthaltstitel-Norm-Zitat ist `§ 18b AufenthG`. **Verbindliche Korrektur auf `§ 18g AufenthG`** (Blue Card EU seit AufenthG-Reform 2023 in §18g; §18b betrifft heute Hochqualifizierte/Niederlassungserlaubnis-Sonderfälle). Diese Korrektur muss product-architect **vor** dem ersten Stammdaten-Mock von mock-backend-coder ausführen — andernfalls inkonsistent zwischen Persona-Doc und mock-backend-Seed.

### Sources / Norm-Linklisten für UI-Tooltips
product-architect soll die folgenden Links als Tooltip-Targets in der Komponente vorsehen (nicht als externe Links im Demo, aber als Tooltip-Footer mit Norm-Kürzel):
- § 17 BMG: gesetze-im-internet.de/bmg/__17.html
- § 33 BMG: gesetze-im-internet.de/bmg/__33.html
- § 34 BMG: gesetze-im-internet.de/bmg/__34.html
- § 36 BMG: gesetze-im-internet.de/bmg/__36.html
- § 54 BMG: gesetze-im-internet.de/bmg/__54.html
- § 15 FZV: gesetze-im-internet.de/fzv_2023/__15.html
- § 18g AufenthG: gesetze-im-internet.de/aufenthg_2004/__18g.html
- § 87 AufenthG: gesetze-im-internet.de/aufenthg_2004/__87.html
- § 28 PAuswG: gesetze-im-internet.de/pauswg/__28.html
- Art. 6 DSGVO: dsgvo-gesetz.de/art-6-dsgvo/

## Reviewer notes (für Pipeline)
- Die zwei adressierten Disagreements sind damit aus Verifikator-Sicht **abgeschlossen**. Sollte product-architect die 4-Block-Architektur oder das Bußgeld-Disclaimer-Regime in der Spec aufweichen, ist eine Re-Review erforderlich — Pipeline-Pause empfohlen.
- Der Aufwand für die obigen Auflagen ist gering (Disclaimer-Texte + ein zusätzlicher Block in der UI-Map). Die V1-Roadmap-Einschätzung „Woche 2–3" aus PRD §9 bleibt realistisch.
- Open question für späteren Pipeline-Lauf: harte „Stunden pro Umzug"-Zahl in Bitkom/eGov-MONITOR-Rohdaten — falls nicht auffindbar, ist die qualitative Pain-Argumentation tragfähig.
