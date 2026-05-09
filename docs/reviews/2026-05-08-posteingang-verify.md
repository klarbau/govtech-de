---
target: posteingang-brief-erklaerer
date: 2026-05-08
verdict: PROCEED
reviewer: concept-verifier
inputs_reviewed:
  - docs/research/2026-05-08-posteingang-brief-erklaerer.md (status: revised, domain-validated)
  - docs/domain/posteingang.md
  - docs/specs/umzug.md (precedent)
  - docs/reviews/2026-05-08-umzug-autopilot-verify.md (own prior verdict, tone reference)
  - CLAUDE.md, docs/PRD.md
independent_sources_consulted:
  - https://www.gesetze-im-internet.de/ao_1977/__122a.html (§ 122a AO Wortlaut, fetched 2026-05-08)
  - https://www.gesetze-im-internet.de/vwvfg/__41.html (§ 41 VwVfG Wortlaut, fetched 2026-05-08)
  - https://www.gesetze-im-internet.de/vwzg_2005/__5.html (§ 5 VwZG Wortlaut, fetched 2026-05-08)
  - https://www.gesetze-im-internet.de/rdg/__2.html (§ 2 RDG Wortlaut, fetched 2026-05-08)
  - https://www.haufe.de/steuern/gesetzgebung-politik/erste-fragen-zum-digitalen-steuerbescheid-ab-2026-geklaert_168_668108.html (BMF/Bundestag-Änderung 13.11.2025, Übergangs-Datum 2026 → 2027)
  - https://www.lto.de/recht/juristen/b/bgh-urteil-izr11320-vertragsgenerator-smartlaw-keine-unzulaessige-rechtsdienstleistung-rak-hamburg-rdg-legal-tech (BGH I ZR 113/20 Smartlaw-Reasoning)
  - https://mitteilungen.rak-muenchen.de/archiv/2021/die-rak-muenchen-erste-anlaufstelle-fuer-ihre-mitglieder/aus-gesetzgebung-und-rechtsprechung/bgh-kein-rdg-verstoss-durch-smartlaw-vertragsgenerator (RAK München zu Smartlaw)
  - https://www.tomsguide.com/ai/my-apple-mail-inbox-is-a-mess-summaries-powered-by-apple-intelligence-may-help-me-tame-it (Apple Intelligence Mail-Summary Funktionsweise)
  - https://www.stoneshot.com/blog/apple-intelligence-and-the-rise-of-ai-generated-email-summaries/ (Apple Intelligence Pre-Open-Summary statt Preheader)
  - https://www.getmailbird.com/apple-mail-ai-auto-filing-priority-inbox-concerns/ (Risiken: AI-Summary statt Preheader, BBC-Headline-Fehlinterpretation)
---

## Verdict
**PROCEED (mit verbindlichen Architektur-, Copy- und Scope-Auflagen)** — Pain ist breitest belegt (Taxfix/WORTLIGA + eGov-MONITOR + Forsa/dbb), Whitespace-Position ist echt (kein DE-B2C-Player aggregiert *mehrere* Behördenbriefe + AI-Erklärung + Frist-Tracking), legal-realistische Einordnung ist durch domain-expert sauber rekonstruiert, und der horizontal-capability-Pivot ist gerechtfertigt — der Posteingang ist *strukturell* universal: jeder Bürger:innen-Profil bekommt mindestens 1–3 der 6 Archetypen. Verbleibende Risiken sind UX-Framing (AI-Summary vor Original; falsches Sicherheitsgefühl bei Frist-Anzeige) und Scope-Disziplin („Antwort vorschlagen" als RDG-Linie).

## Test-by-test analysis

### 1. User pain — PASS (höchste Konfidenz im gesamten PRD-Scope bislang)

Quantitativ stärkste Belege im gesamten Demo-Scope:
- **Taxfix/Qualtrics/WORTLIGA, n=2.039, repräsentativ** — 4 % finden Behördensprache verständlich, 20 % verstehen beim ersten Lesen, 75 % überfordert, 47 % brauchen Hilfe Dritter, 25 % erlitten finanzielle Nachteile durch Sprachschwierigkeit. Triangulation: H&H Communication Lab Ulm 2024 (9/16 Verständlichkeitspunkte), eGov-MONITOR 2025 (jede vierte Person nennt Unverständlichkeit als Hauptgrund für Unzufriedenheit; 39 % der Skeptiker:innen würden bei klarer Sprache Digital-Only akzeptieren).
- **Forsa/dbb 09/2025** sekundär: 73 % Staat-überfordert, 85 % wünschen verständlichere Gesetze, 59 % empfinden Behördenkontakt als „sehr anstrengend".
- **Universal-Bürger:in-Argument**: Posteingang trifft *jede:n*. Die Pain-Heuristik aus CLAUDE.md („citizens want this — demand at least one source") ist hier mit 3 unabhängigen Studien überfüllt. Selbst der „weiße deutsche Akademiker"-Subscope verfehlt die Verständlichkeitsschwelle (eGov-MONITOR 2025: jede vierte Person, *nicht* primär Migrant:innen).

Schwächste Stelle: keine Volumen-Zahl „X Behördenbriefe pro Haushalt". `not found` ist von domain-expert verifiziert. Tragfähig — Verständlichkeits-Pain trägt die Argumentation.

### 2. Legal realism — PASS mit verbindlichen Klarstellungen aus Web-Re-Verifikation

Ich habe die drei kritischsten Normen heute (2026-05-08) eigenständig auf gesetze-im-internet.de re-verifiziert; die Wortlaute werden hier festgehalten, damit der product-architect sie 1:1 in Tooltips/Disclaimer übernimmt:

- **§ 41 Abs. 2 VwVfG (postalisch)**: „Ein Verwaltungsakt, der schriftlich oder elektronisch übermittelt wird, gilt am vierten Tag nach der Aufgabe zur Post als bekanntgegeben". 4-Tage-Fiktion **bei Briefpost im Inland** (PostModG-Anpassung 01.01.2025).
- **§ 41 Abs. 2a VwVfG (Portal-Bereitstellung mit Einwilligung)**: „Mit Einwilligung des Beteiligten kann ein elektronischer Verwaltungsakt dadurch bekannt gegeben werden, dass er […] über öffentlich zugängliche Netze abgerufen wird. … **Der Verwaltungsakt gilt am Tag nach dem Abruf als bekannt gegeben.** Wird der Verwaltungsakt nicht innerhalb von zehn Tagen nach Absendung einer Benachrichtigung über die Bereitstellung abgerufen, wird diese beendet". Es **gibt keine** „dritter Tag nach Bereitstellung"-Fiktion in Abs. 2a — das ist eine populäre Falschaussage, die der research-scout-Entwurf gestreift hat. domain-expert hat das korrekt korrigiert.
- **§ 5 Abs. 5 + Abs. 7 VwZG (förmliche elektronische Zustellung)**: Empfänger muss Zugang eröffnet haben + qualifizierte elektronische Signatur; Zustellungs-Fiktion am **vierten Tag nach Absendung**, sofern keine Empfangsbestätigung; widerlegbar bei Nachweis späteren Zugangs.
- **§ 122a AO (Steuerbescheid Mein ELSTER)**: Abs. 1 erlaubt Datenabruf-Bekanntgabe, **Abs. 2** macht klar: „Absatz 1 ist nicht anzuwenden, wenn der Beteiligte eine einmalige oder dauerhafte postalische Bekanntgabe nach § 122 Absatz 2 beantragt hat" → strukturell **opt-out**. Abs. 4: „**am vierten Tag nach der Bereitstellung zum Abruf**".

**Wichtige Übergangs-Realität (Stand 8. Mai 2026)**: Die gesetzliche **Widerspruchslösung** (also: opt-out für jede:n, der/die per ELSTER abgibt) sollte ursprünglich ab 01.01.2026 greifen. Der Bundestag hat am **13.11.2025** die Pflichtanwendung auf **01.01.2027** verschoben. **Heute (Mai 2026) ist es daher de facto immer noch opt-in: ohne aktive Zustimmung in ELSTER Postversand**, mit aktiver Zustimmung elektronische Bekanntgabe nach § 122a Abs. 4 AO am 4. Tag nach Bereitstellung. Ab 01.01.2027 wird es Default-elektronisch (opt-out per Antrag auf postalische Bekanntgabe nach § 122a Abs. 2). Diese Nuance ist load-bearing für die Disclaimer-Copy → siehe Adjudikation #1 unten.

- **RDG § 2 + BGH I ZR 113/20 (Smartlaw, 09.09.2021)**: Smartlaw-Generator ist *keine* RDL, weil (a) keine Tätigkeit in fremden Angelegenheiten — der Anbieter macht das *Werkzeug*, der Bürger füllt es selbst aus; (b) keine Einzelfall-Rechtsprüfung — Algorithmus folgt Frage-Antwort-Schema; (c) im Vergleich zu Formularhandbuch lediglich digitalisiertes Hilfsangebot. **Übertragung auf Brief-Erklärer**: pure Zusammenfassung + Frist-Extraktion + Verfahrenshinweise (welcher Rechtsbehelf ist denkbar) sind erlaubnisfreie Information; einzelfallbezogene argumentative Antwortgenerierung („Ihr Bescheid ist nach § XY Abs. 3 falsch begründet, daher widersprechen Sie wie folgt …") überschreitet die Linie.
- **BGH VIII ZR 285/18 (wenigermiete/Lexfox, 27.11.2019)**: weite Inkasso-Auslegung — relevant für **Forderungseinziehung**. Ein Brief-Erklärer ohne Forderung gewinnt durch Inkasso-Lizenz keine zusätzliche RDL-Befugnis. **Falsche Analogie**, wenn man wenigermiete als Fallback-Pfad denkt. Adjudikation #3 bestätigt.
- **DSGVO Art. 9 + § 22 BDSG**: korrekt durch domain-expert eingeordnet — eine private Demo/App ist *kein* Träger öffentlicher Gewalt (lit. e scheidet aus), Sozialfürsorge-Tatbestand (lit. h) ebenfalls; korrekte Rechtsgrundlage = Einwilligung (Art. 6 lit. a / Art. 9 Abs. 2 lit. a). Religionsmerkmal in Steuerbescheid (Kirchensteuer) und Aufenthaltsstatus (ABH-Bescheid → indirekt rassische/ethnische Herkunft) sind Art. 9-Daten — als gesehen.
- **ZBP-Citizen-API existiert nicht** (FIT-Connect ist behörden-side). Demo darf **keine** technische Anbindung an ZBP/BundID/Mein ELSTER suggerieren — nur konzeptionelle Lese-Schicht.

Verdict: legal-realistisch bestreitbar **nicht impossible**, aber Spec muss sehr genau zwischen *was wir konzeptionell zeigen* und *was 2026 technisch/rechtlich tatsächlich geht* unterscheiden — exakt wie bei Umzug.

### 3. Prior art — PASS mit Whitespace-Befund

- **DE B2B/B2C scan**: Caya, Briefbutler, Dropscan = digitaler Briefkasten ohne Behörden-AI-Layer; Klugo = Vermittler ohne Brief-Erklärer; Conny/Flightright = Inkasso-Pfad (rechtlich anderer Tatbestand, s. Adjudikation #3). DigitalService DE arbeitet an *bürgernaher Verwaltungssprache* — der reverse Pfad (Behörden schreiben verständlicher), nicht der Erklärer-Pfad. Es gibt **keinen consumer-facing DE-Player**, der mehrere Behördenbriefe in einer Inbox aggregiert + AI-Erklärung + Frist-Tracking liefert. Echte Whitespace-Position.
- **International**:
  - Dänemark Digital Post (Pflicht ab 15, 4-Apps-Multi-Plattform, rechtsverbindlich) — pattern für „universal trust". *Aber*: Dänemark hat zentrales CPR-Register und Pflicht-Inbox per Gesetz; das skaliert *politisch* nicht 1:1 für DE.
  - Singapur SingPass-Inbox + Notify (anti-phishing-garantie für agency-Push) — pattern für „authentic provenance".
  - Estland eesti.ee Ametlikud Teadaanded (topisch organisiert) — pattern für „topic threading".
  - Norwegen Altinn-Innboks (SMS/E-Mail-Notifications, Activity Log) — pattern für „receipt log".
  - UK PTA — agency-specific (HMRC), **falsches Vorbild** für unified inbox.
- **Apple Intelligence Mail (consumer-non-gov)**: Pre-Open-Summary statt Preheader, Post-Open-Summary in der Mail, Priority Messages, Tabbed Inbox, on-device-Verarbeitung. Independent verifiziert (tomsguide, stoneshot, mailbird). **Wichtige Adversarial-Befund** dazu in Demo-Design-Probe #2 unten: Apple Intelligence hat dokumentierte Falsch-Zusammenfassungs-Pannen (BBC-Headline-Vorfall — Apple hat News-Notification-Summaries temporär abgeschaltet). Der Pre-Open-Summary ist nicht risikofrei.

CLAUDE.md-Heuristik „It works in Estonia" wird respektiert: das Pattern (topic threading, receipt log) ist übertragbar — die Implementierung (Pflicht-Inbox + zentrales Personenregister) ist das nicht. Demo darf *Pattern* nehmen, nicht *Premise*.

### 4. Demo impact — PASS, aber mit Aufmerksamkeit-Budget-Risiko

Posteingang als horizontale Capability hat **andere Demo-Ökonomie als Umzug-Autopilot**: Umzug ist ein 90-Sekunden-Wow (eine Eingabe → Cascade → fertig). Posteingang ist ein „first 3 letters in your inbox in 30 Sekunden"-Wow:
- **Wow-Moment-Hypothese**: User landet im Posteingang, sieht 3–6 Briefe sortiert nach Vorgang, jeder mit AI-Summary-Zeile + Frist-Chip. *Pre-Open-Information* macht den Posteingang sofort lesbar — Kontrast zum Status quo „PDF im ELSTER-Postfach, kein Hinweis was drin steht". In <10 s soll der Viewer „aha — die App nimmt mir das *Verstehen* ab" begreifen.
- **Risiko**: Posteingang ist passive Konsum-Surface, nicht aktive Cascade. Wenn der Viewer nur scrollt und nicht klickt, ist das Wow unter dem von Umzug. Mitigation: ein Brief MUSS im Demo-Flow den Klick *einladen* (Frist < 7 Tage, klare Pre-Open-Summary, „Antwort vorschlagen"-CTA als visueller Hook *ohne* dass die Aktion einzelfallbezogen Recht produziert).
- **Generalisierungs-Test (horizontal capability)**: Anna sieht ABH-Erinnerung + Krankenkasse + Steuerbescheid; Schmidts sehen Familienkasse + Standesamt + Beitragsservice; Mehmet sieht IHK + Berufsgenossenschaft + Finanzamt + Beitragsservice. **Jede Persona** nutzt den Posteingang mit anderem Mix der 6 Archetypen — die capability generalisiert sauber.
- **Verbietet**: Posteingang darf nicht in Persona-spezifische Storys aufgesplittet werden. Es ist universal — und das Wow ist die *Universalität* (egal ob Anna oder Schmidt oder Mehmet, dieselbe Inbox-Mechanik, andere Inhalte).

### 5. Effort/value — PASS

Realistisch in <1 Woche Demo-Build:
- **`letters.json` Seed mit 6 Archetypen × 3 Personas-Filterung**: ~0.5 Tage. Domain-Expert hat die Briefe inkl. Aktenzeichen-Formaten und Floskeln vorgeneriert.
- **`<LetterCard>` + `<LetterReader>` mit Pre-Open-Summary + Post-Open-Summary**: ~1 Tag (shadcn-Card-Komposition + framer-motion-Expand).
- **AI-Summary-Pipeline (`/api/letter-summary`)** mit Citation-Pattern (LLM-Output: `summary_de`, `extracted_frist`, `extracted_action`, `original_zitat_for_frist`): ~1 Tag (Anthropic SDK + System-Prompt-Engineering).
- **`<FristCountdown>`-Komponente** (bereits in Umzug-Spec gespeichert): ~0.25 Tage Anpassung.
- **Vorgang-Threading-View + „Sonstige"-Bucket** (Group-by-`vorgang_id` mit Fallback-AI-Vorschlag): ~0.5 Tage.
- **Disclaimer + Banner**: ~0.25 Tage.
- **i18n + a11y**: parallel.

Dependencies: Vorgang-Modell aus Umzug-Spec wiederverwendet; mock-backend `getLetters()` schon im Stub vorgesehen (CLAUDE.md). Anthropic-API ist im Demo bereits anbindbar.

V2-Features (RAUS aus V1, siehe Demo-Design-Probe #3): „Antwort vorschlagen", Upload eigener Briefe, ZBP-Pull-Simulation.

### 6. Risk-of-misleading — MITIGATED durch Disclaimer + Scope-Disziplin

Kritische Stellen:
- **„App löst Frist aus"-Falle**: viewers könnten denken, in der App „lesen" trigger den Bekanntgabe-Tag. Korrekt: Bekanntgabe ist *im amtlichen Postfach* schon erfolgt (oder noch nicht); App ist Lese-Schicht. → `posteingang.disclaimer.opening` ist die richtige Antwort, mit verfeinerter Regimes-Trennung (siehe Adjudikation #2).
- **AI-Summary-Halluzination**: BBC-Vorfall mit Apple Intelligence ist Warnung — falsche Zusammenfassung kann Frist-Verständnis verschieben. → Citation-Pattern (Original-Zitat neben Frist) ist obligatorisch; Pre-Open-Summary ≠ Ersatz für Originaltext (siehe Demo-Design-Probe #2).
- **„Antwort vorschlagen" als RDG-Grenzgang**: kein Auto-Versand, 3-Stufen-UX, expliziter „Kein Anwalt"-Disclaimer (siehe Adjudikation #3 + Probe #3).
- **Phishing-Look-Alike**: gefälschte Behörden-Optik („digitaler-post-service-fzco" o. ä.) — Demo muss aktiv signalisieren *was Authentizität bedeutet*. Heute via QR-Verify-Pattern, ab EUDI-Wallet-Sealing 2027 standard. Demo zeigt das als Konvention (Authentizitäts-Badge auf jeder Letter-Card).
- **Behörden-Logo-Markenrecht**: keine echten Wappen/Bundesadler verwenden — generische Behörden-Badges + `[MOCK]`-Watermark. Bereits CLAUDE.md-Konvention.

## Adjudikation der 3 DISAGREEMENTS

### DISAGREEMENT #1 (Mein ELSTER opt-OUT vs. opt-in) — Entscheidung: **domain-expert recht in der Sache, aber Übergangs-Datum ist load-bearing**

**Quellenlage** (web-verifiziert 2026-05-08):
- **§ 122a Abs. 2 AO Wortlaut** macht das System strukturell zum **opt-out**: „Absatz 1 ist nicht anzuwenden, wenn der Beteiligte eine einmalige oder dauerhafte postalische Bekanntgabe nach § 122 Absatz 2 beantragt hat." Domain-expert recht.
- **Aber**: die Bundestag-Änderung vom **13.11.2025** hat die Pflicht-Anwendung der Widerspruchslösung auf den **01.01.2027** verschoben (verifiziert via haufe.de „Erste Fragen zum digitalen Steuerbescheid ab 2026 geklärt"). **2026 ist de facto Übergangsphase**: ohne aktive Zustimmung in ELSTER kommt der Bescheid weiterhin per Post. Mit aktiver Zustimmung gilt der elektronische Bescheid am 4. Tag nach Bereitstellung als bekannt gegeben.
- **research-scout-Aussage** war einfach „opt-in" — das ist *für 2026* praktisch nicht ganz falsch (der Default ist Postversand mangels Zustimmung), aber für die *Norm-Logik* falsch und für die Demo-Spekulation 2027 erst recht falsch.

**Adjudikation**: domain-expert hat **dem Wortlaut nach recht**. Für die Demo (Speculative Design 2027, CLAUDE.md zeile 3) ist das richtige Framing **opt-out**, weil das die Regelung ist, die ab 01.01.2027 gilt — also der Zeitraum, den die Demo abbildet. **Aber** der Disclaimer muss heutige Bürger:innen, die die Demo 2026 sehen, nicht in die Irre führen — sondern beide Realitäten sauber benennen.

**Konsequenzen für die Disclaimer-Copy**: Der Eröffnen-Disclaimer muss spezifisch zwischen Mein-ELSTER-Regime und Postversand-Regime unterscheiden, mit Datums-Hinweis 2026/2027.

→ siehe „Final wording for the 4 mandatory disclaimer strings" unten.

### DISAGREEMENT #2 (§ 41 Abs. 2a Wortlaut + drei vs. vier Regimes) — Entscheidung: **domain-expert vollständig recht; vier Regimes verbindlich**

**Web-Verifikation** (gesetze-im-internet.de, 2026-05-08):
- **§ 41 Abs. 2 VwVfG**: „am vierten Tag nach der Aufgabe zur Post" — gilt für Briefpost UND für die elektronische Übermittlung **ohne Einwilligung** (PostModG-Anpassung 01.01.2025 angepasst von 3 auf 4 Tage).
- **§ 41 Abs. 2a VwVfG**: „**am Tag nach dem Abruf**" — *nur* bei Portal-Bereitstellung *mit Einwilligung*; bei Nicht-Abruf binnen 10 Tagen wird die Bereitstellung beendet, **ohne** dass Bekanntgabe bewirkt wäre. **Es gibt keine „dritter Tag"-Variante in Abs. 2a.** research-scout hatte das wackelig formuliert, domain-expert korrekt rekonstruiert.
- **§ 122a Abs. 4 AO**: „**am vierten Tag nach der Bereitstellung zum Abruf**" — Mein-ELSTER-Spezialregime, opt-out (s. #1).
- **§ 5 Abs. 7 VwZG**: **„am vierten Tag nach der Absendung"** — förmliche Zustellung elektronisch, widerlegbar.

**Welche Regelung gilt für den „typischsten" Behördenbrief im Posteingang?** Antwort: **es gibt keine einzelne** — und das ist die Pointe.

| Brief-Archetyp (aus posteingang.md) | Übermittlungsweg-Realität | Anwendbare Bekanntgabe-Regel |
|---|---|---|
| 1. Steuerbescheid Finanzamt | Mein ELSTER (mit Zustimmung) ODER Briefpost | § 122a Abs. 4 AO „4. Tag nach Bereitstellung" (elektronisch) ODER § 122 Abs. 2 AO 4-Tage-Fiktion (Briefpost) |
| 2. Krankenkasse Beitragsfestsetzung | Briefpost (Standard) ODER Kassen-Portal | § 41 Abs. 2 VwVfG 4-Tage-Fiktion (analog im SGB X-Verfahren) |
| 3. Beitragsservice Mahnung | Briefpost | § 41 Abs. 2 VwVfG 4-Tage-Fiktion |
| 4. ABH Verlängerungs-Erinnerung | Briefpost | § 41 Abs. 2 VwVfG 4-Tage-Fiktion |
| 5. Familienkasse Nachweis-Aufforderung | Briefpost | § 41 Abs. 2 VwVfG 4-Tage-Fiktion |
| 6. Bürgeramt Meldebestätigung | Briefpost / Direkt-Aushändigung | § 41 Abs. 2 VwVfG 4-Tage-Fiktion (informativ, keine Frist) |
| (Spec-Kategorie) Förmlich zugestellte VAs | Postzustellung gem. VwZG | § 5 Abs. 7 VwZG 4. Tag nach Absendung |
| (Spec-Kategorie) ZBP/BundID-Postfach (mit Einwilligung) | Datenabruf-Portal | **§ 41 Abs. 2a VwVfG „Tag nach Abruf"** |

**Adjudikation**: Der **Standardfall** für unsere 6 Archetypen ist **§ 41 Abs. 2 VwVfG / § 122 AO Briefpost, 4. Tag nach Aufgabe zur Post**. Das ELSTER-Regime ist Sonderfall (Steuerbescheid) und das Abs.-2a-Regime ist Spezialfall (ZBP/BundID *mit Einwilligung*).

**Konsequenz für `posteingang.disclaimer.opening`**: Die aktuelle Formulierung im Domain-Doc ist **nicht präzise genug**. Sie nennt nur die 4-Tage-nach-Bereitstellung-Regel und § 41 Abs. 2 VwVfG — verschweigt § 41 Abs. 2a (Tag-nach-Abruf) und § 5 Abs. 7 VwZG (förmliche Zustellung). Eine erweiterte Fassung folgt unten.

### DISAGREEMENT #3 (Inkasso-Lizenz wenigermiete als Pfad? Nein — Smartlaw-Linie ist relevant) — Entscheidung: **domain-expert vollständig recht**

**Web-Verifikation** (BGH-Pressemitteilung + RAK München + LTO):
- **BGH I ZR 113/20 (Smartlaw, 09.09.2021)** ist die einschlägige Linie für *Tools, die Dokumente/Texte generieren* ohne Einzelfallprüfung — exakt unser Brief-Erklärer-Use-Case.
- **BGH VIII ZR 285/18 (wenigermiete, 27.11.2019)** ist eine **Inkasso-Lizenz-Linie** (Forderungseinziehung gem. § 10 Abs. 1 S. 1 Nr. 1 RDG) — Brief-Erklärer hat keine Forderung einzuziehen, also gewinnt er durch eine Inkasso-Lizenz **nichts**. Wenn man auf wenigermiete-Pfad ginge, müsste man Forderungen abtreten und einziehen — das ist ein komplett anderes Geschäftsmodell.
- **Linie**: Smartlaw-Reasoning (a) keine Tätigkeit in fremden Angelegenheiten — wir geben *Werkzeug*, Bürger nutzt selbst; (b) keine Einzelfall-Rechts-Prüfung — Algorithmus folgt fixem Schema/System-Prompt; (c) Vergleich zum Formularhandbuch — digitalisiertes Hilfsangebot.

**Adjudikation**: domain-expert vollständig recht. wenigermiete als Backup ist **nicht** der richtige Pfad. Smartlaw-Linie ist die **einzige** verfügbare Schiene für unseren Use-Case, und sie funktioniert *nur*, wenn wir die drei Smartlaw-Kriterien einhalten:
1. **Werkzeug-Charakter**: Bürger:in steuert selbst, App ist Tool, nicht Vertretung.
2. **Keine Einzelfall-Rechts-Prüfung**: AI darf paraphrasieren, glossieren, Frist extrahieren, Verfahren beschreiben — darf *nicht* den konkreten Bescheid rechtlich bewerten („dieser Bescheid ist falsch, hier ist Ihre Argumentation").
3. **Schema-/Algorithmus-Befund**: Output folgt strukturiertem Prompt-Schema, nicht ad-hoc-juristischer Argumentation.

**Konsequenz für „Antwort vorschlagen"**: nur 3-Stufen-UX zulässig (Vorlage → Bürger-Edit → Bürger-Versand). Verbindlich beschrieben unter „flags for product-architect" → „Antwort vorschlagen Smartlaw-Guardrails".

## Probe der 4 Demo-Design-Fragen

### Probe #1: Threading nach Vorgang vs. Behörde vs. Aktenzeichen — was bei „letters before Vorgang exists"?

**Adversariale Challenge berechtigt**: research-scout sagt „Vorgang-zentriert primär, Behörde Filter, Aktenzeichen Detail". Der Einwand: ein **Steuerbescheid** kommt typischerweise *unsolicited* an — bevor irgend ein „Vorgang" im System existiert. Ebenso eine **Mahnung**, ein **ABH-Verlängerungs-Erinnerungs-Brief**, ein **Bußgeldbescheid**. Domain-Doc Tabelle bestätigt: **5 von 6 Archetypen** (1, 3, 4, 5, 6) sind *initiierende* Briefe, nicht Folgekorrespondenz. *Initial-Briefe sind die Norm*, nicht die Ausnahme.

→ Vorgang-zentriert ist als *primary view* konzeptionell elegant, aber **scheitert an der Empirie**: zum Zeitpunkt des Eingangs gibt es noch keinen passenden Vorgang.

**Entscheidung**: Hybrid-Threading mit **chronologisch-sortierter Default-View + Vorgangs-Bündelung als sekundäre Achse**:

1. **Default-View = chronologisch-sortierte Inbox** (neueste oben), **gefiltert/gruppiert nach Status** (Neu / Frist offen / Erledigt / Archiv). Das ist die Mail-App-Konvention und die Singapore/Apple-Konvention. Bürger:in versteht es ohne Lernkurve.
2. **AI-Inferred-Vorgang als Bündel-Hint** auf jeder Letter-Card: „Gehört zu Vorgang ‚Mein Umzug 2026'" als kleines Tag, klickbar → öffnet die Vorgangs-Detailansicht. Bei Initial-Briefen ohne existierenden Vorgang: Tag „Neuer Vorgang? Steuerbescheid 2024 anlegen?" als CTA.
3. **Vorgang-View als zweiter Tab** im Posteingang („Nach Vorgang gruppieren") — sekundäre Sicht, die für Cascade-Vorgänge (Umzug, Geburt, Aufenthalt) ihre Stärke ausspielt.
4. **Behörden-Filter** in der Sidebar (Top-Level-Kategorien aus posteingang.md: Bund / Land / Kommunal / Selbstverwaltung / „Privatrechtl-aber-behördenartig"). Ermöglicht „alle Briefe der Familienkasse" auf Klick.
5. **Aktenzeichen-Suchfeld** prominent — Bürger:in kennt sein Aktenzeichen oft aus dem Brief, der noch im Briefkasten liegt; das Suchfeld muss einen Aktenzeichen-Lookup über alle Briefe erlauben.

**Fallback für letters-without-Vorgang**: AI-Vorschlag in der Letter-Card („Möchten Sie einen Vorgang ‚Steuerbescheid 2024' anlegen?") + Auto-Bucket „Sonstige" wenn Bürger:in nicht zuordnet. Domain-expert + research-scout hatten das angedeutet — diese Fallback-Mechanik ist *verbindlich* für die Spec.

### Probe #2: Apple-Intelligence-Pre-Open-Summary — verletzt das den „Originaltext-ist-maßgeblich"-Geist?

**Adversariale Challenge berechtigt**: Apple Intelligence Mail überschreibt den Preheader mit AI-Summary — und es gab dokumentierte Fehler (BBC-Headline-Vorfall, Apple hat News-Notification-Summaries temporär abgeschaltet). Im **Behördenkontext** ist eine falsche Zusammenfassung dramatischer: ein vergessenes „nur" oder „nicht" verschiebt eine Frist-Bedeutung („Sie müssen bis 20.06. zahlen" vs. „Sie müssen *nicht* bis 20.06. zahlen").

**Risiko-Analyse**:
- Pre-Open-Summary ohne Original-Sicht = User skimmt, Frist wird falsch verstanden, Handlung unterbleibt oder erfolgt falsch. *Direkte Gegenposition zu „Originaltext ist maßgeblich"*.
- Pre-Open-Summary *plus* deutlicher Hinweis „Verifiziere am Original" = mitigierbar, aber Realität ist: Bürger:innen klicken nicht durch zum Original wenn Pre-Open-Summary „klar" wirkt.

**Entscheidung**: **Pre-Open + Post-Open beides JA**, aber mit klaren Guardrails, die Apple Intelligence so nicht hat:

1. **Pre-Open-Summary bleibt** (Wow-Moment der Demo, niedrigschwelliger Einstieg) — *aber strikt deskriptiv* und nicht-handlungsanweisend. Maximal 1 Zeile, 80 Zeichen, Format: „[Behörde] · [Brieftyp] · [Frist falls vorhanden]". Beispiel: „Finanzamt Berlin Mitte · Steuerbescheid 2024 · Frist: 12.06.2026 (29 Tage)". **Keine Inhalts-Interpretation** in der Pre-Open-Zeile, nur Strukturmerkmale.
2. **Frist-Chip** auf der Card mit *Original-Datum* aus dem Brief, nicht AI-berechnet. Wenn AI ein Datum extrahiert, wird es per Regex (`\d{1,2}\.\d{1,2}\.\d{4}`) gegen den Originaltext validiert; Mismatch → Hand-off „Bitte selbst prüfen".
3. **Post-Open-Summary (5–8 Bullet-Punkte)** ist *prominent* aber **immer mit Originaltext-Toggle** sichtbar. Layout: AI-Summary linke Hälfte / Original rechte Hälfte (Desktop) bzw. Tab-Switcher (Mobile). Citation-Pattern: jede Bullet zeigt das Original-Zitat als Tooltip/Footnote.
4. **Roter Hinweis-Banner über AI-Summary** (siehe `posteingang.disclaimer.original_authoritative` aus domain-doc): „Rechtsverbindlich ist der Originaltext. Bitte prüfen Sie wichtige Angaben am Original."
5. **Frist-Detail-Modal** zeigt **immer** das Original-Zitat: „Original-Satz aus dem Brief: ‚Bitte zahlen Sie bis zum 12.06.2026 …'" — die Frist hat nie *nur* die AI-extrahierte Form.

Zusammenfassend: Pre-Open-Summary ist gestattet, aber **degradiert auf Strukturmerkmale**, niemals interpretierend. Inhalts-Interpretation ist Post-Open mit Citation. Das ist *strenger* als Apple Intelligence — bewusst.

### Probe #3: „Antwort vorschlagen" — V1 oder V2?

**Adversariale Challenge berechtigt**: Antwort-Generator ist die Smartlaw-Grenzgang-Funktion. Sie verlängert die Demo-Komplexität, vergrößert die RDG-Risikoexposition, und erfordert eine 3-Stufen-UX, die in <1 Woche schwer sauber zu implementieren ist. Marginal-Demo-Mehrwert vs. Marginal-Risiko ist negativ.

**Entscheidung**: **V2** — *out of scope für V1-Demo*.

Begründung:
- **Demo-Wow** funktioniert auch ohne Antwort-Generator: Posteingang-Wow ist „die App nimmt mir das Verstehen ab" und „die App weiß, was zu tun ist und wann". Beides ist auch ohne Antwort-Generator erfüllt.
- **RDG-Linie** ist subtil. Selbst die saubere 3-Stufen-UX (Vorlage → Edit → Versand) erfordert sehr genaues Prompt-Engineering, damit die KI keine einzelfallbezogene Rechtsbewertung produziert. Das ist ein Mini-Forschungsprojekt, kein Wochenend-Build.
- **Smartlaw-Linie ist KEIN Freibrief** — der BGH I ZR 113/20 hat *Vertragsgeneratoren* abgesegnet, weil sie schematisch arbeiten. Ein „Widerspruch gegen diesen konkreten Bescheid"-Generator ist näher am Einzelfall — riskanter als Smartlaw, nicht gleich riskant.
- **Demo-Disziplin** (CLAUDE.md Heuristik „Demo bloat"): mehr Screens ≠ besseres Demo. Antwort-Generator ist ein zweiter Hauptflow neben dem Posteingang-Reading-Flow — er teilt die Aufmerksamkeit.

**V1-Posteingang-Scope** = lesen, verstehen, Frist tracken, Termin/.ics exportieren. **Nicht antworten**.

**V2-Hooks** in V1 vorsehen (damit V2 später nicht refactor heißt):
- Letter-Card hat einen **CTA-Bereich** mit „Frist im Kalender", „Originalbrief anzeigen", „Brief speichern" — Antworten-Slot bleibt frei.
- Letter-Reader hat einen **„Was kann ich tun?"-Footer** mit *informativen* Hinweisen („Mögliche Handlungen: Zahlung leisten, Einspruch einlegen, Nachweis nachreichen"). Diese Hinweise sind *erlaubnisfreie Information* (Smartlaw-konform). Aber **keine konkrete Antwortvorlage** und **kein Versand-Button** in V1.
- *Falls* V2 hinzukommt, sind die Smartlaw-Guardrails verbindlich (siehe „flags for product-architect" → „Antwort vorschlagen Smartlaw-Guardrails").

### Probe #4: Unread/Read-Status Persistence + § 41 Abs. 2a-Risiko

**Adversariale Challenge berechtigt**: in einem realen System mit Portal-Bereitstellung *mit Einwilligung* (§ 41 Abs. 2a VwVfG) könnte „Markieren als gelesen" technisch der einzige Marker für „Abruf" sein — und damit den Fristlauf-Tag-nach-Abruf triggern. *In unserer Mock-Demo* ist das *konzeptionell* das gleiche Problem.

**Analyse**:
- domain-expert hat festgestellt: Unsere App ist Lese-Schicht, **kein Postfach-Betreiber**. Die Bekanntgabe-Wirkung tritt im *amtlichen* Postfach ein (ZBP/BundID/Mein ELSTER), nicht in unserer App. Das gilt rechtlich. Aber **konzeptionell** im Demo: wir zeigen einen Posteingang, der so wirkt, als ob er das amtliche Postfach *ist*. Wenn wir „Read"-Status persistieren, kann der Viewer denken: „Aha, das Markieren als gelesen löst die Frist aus."
- Korrekt im Spec: „displayed in app" ≠ „abgerufen iSv § 41 Abs. 2a". Die Demo muss das durch Disclaimer + UX-Trennung deutlich machen.

**Entscheidung**: **Read/Unread-Status persistieren — aber mit klarer Disclaimer-Trennung**:

1. **Read/Unread = nur App-interner Lesefortschritt**, hat *keine* rechtliche Bedeutung. Visuell: dezenter Punkt-Badge / fett-Schrift bei „neu", normal bei „gelesen".
2. **Niemals „Lesebestätigung"-Floskel verwenden** (wäre rechtlich Read-Receipt-Implikation). Statt „Lesebestätigung gesendet" → „Diesen Brief als gelesen markieren" — pure UI-State-Aktion.
3. **`posteingang.disclaimer.opening`** muss explizit klarstellen: „Das Markieren als gelesen in dieser App ist *nur ein App-interner Lesefortschritt*. Es ist kein Abruf iSv § 41 Abs. 2a VwVfG / § 122a AO. Die rechtliche Bekanntgabe richtet sich nach dem Übermittlungsweg im *amtlichen* Postfach (Briefpost / Mein ELSTER / ZBP)."
4. **Activity-Log per Brief** im Datenschutz-Cockpit (Norwegen-Altinn-Pattern): „Brief in App geöffnet am [Datum, Uhrzeit]" — als Transparenz-Pflicht aus DSGVO Art. 12. *Aber* mit klarer Beschriftung, dass dies *nur App-Aktivität*, nicht Behörden-Bekanntgabe ist.
5. **Demo-spezifische Konsequenz**: kein „Read-Receipt-Pulse" zur Behörde simulieren. Auch nicht visuell.

## If REVISE — concrete changes required
N/A — Verdict ist PROCEED mit verbindlichen Architektur-, Copy- und Scope-Auflagen.

## If REJECT — alternative recommendation
N/A.

## If PROCEED — flags for product-architect

### Final adjudication der 3 DISAGREEMENTS — wer gewinnt, mit verbindlicher Wortlaut-Konsequenz

| # | Wer hat recht | Verbindliches Spec-Ergebnis |
|---|---|---|
| **1 (Mein ELSTER opt-OUT)** | domain-expert | Demo positioniert sich auf 2027-Regime = **opt-out**. Disclaimer differenziert 2026 (de facto opt-in mangels Zustimmung) vs. 2027+ (opt-out per § 122a Abs. 2 AO). Wortlaut: siehe `posteingang.disclaimer.opening` neu. |
| **2 (Vier Bekanntgabe-Regimes)** | domain-expert | Disclaimer benennt **alle vier Regimes** (Briefpost § 41 Abs. 2 / Portal-mit-Einwilligung § 41 Abs. 2a / ELSTER § 122a / förmlich VwZG § 5 Abs. 7), nicht nur eines. Demo-Briefe haben pro Archetyp einen **Regime-Indikator** in der Letter-Card. |
| **3 (Smartlaw-Linie, nicht wenigermiete)** | domain-expert | „Antwort vorschlagen" V1-out, V2 nur mit Smartlaw-Guardrails (verbatim unten). Demo positioniert sich strikt im Smartlaw-Werkzeug-Modus. Inkasso-Lizenz wird in der Spec **nicht** erwähnt. |

### Threading-Entscheidung (Probe #1, verbindlich)

- **Default-View**: chronologisch-sortierte Inbox, gruppiert nach Status (Neu / Frist offen ≤ 7 Tagen / Frist offen > 7 Tagen / Erledigt / Archiv).
- **Vorgangs-Bündel als CTA-Tag** in jeder Letter-Card; nicht primärer Sortier-Schlüssel.
- **Sekundärer Tab „Nach Vorgang"** für Cascade-Vorgänge.
- **Sidebar-Filter nach Behörden-Kategorie** (Bund / Land / Kommunal / Selbstverwaltung / „Privatrechtl-aber-behördenartig" — taxonomie aus posteingang.md).
- **Aktenzeichen-Suchfeld** prominent oben.
- **Fallback letters-without-Vorgang**: AI-Vorschlag „Neuen Vorgang ‚[Brieftyp] [Jahr]' anlegen?" + Bucket „Sonstige".

### Pre-Open vs. Post-Open AI-Summary (Probe #2, verbindlich)

- **Pre-Open** (in LetterCard, immer sichtbar): **strikt strukturell**. Format: „[Behörde] · [Brieftyp] · [Frist (Tage Countdown) oder ‚Keine Frist']". Maximal 1 Zeile, 80 Zeichen. **Keine Inhalts-Interpretation**.
- **Post-Open** (in LetterReader, nach Klick): **5–8 Bullet-Punkte** plus Original-Toggle plus Citation pro Bullet. Layout: AI-Summary links / Original rechts (Desktop), Tab-Switcher (Mobile).
- **Frist-Extraktion**: Hybrid LLM + Regex; Citation des Original-Satzes obligatorisch; bei Mismatch → „Bitte selbst prüfen".
- **Roter Hinweis-Banner** über AI-Summary mit Disclaimer-String 4 (s.u.).

### „Antwort vorschlagen" Scope-Entscheidung (Probe #3)

- **V1 OUT**. Letter-Card-CTA-Bereich enthält nur „Frist im Kalender / Originalbrief anzeigen / Brief speichern". *Optional*: ein **„Was kann ich tun?"-Footer** mit *informativen* Hinweisen aus dem Brief-Archetyp-Katalog (z. B. „Mögliche Handlungen bei Steuerbescheid: Zahlung leisten / Einspruch einlegen / Aussetzung der Vollziehung beantragen"). Diese Hinweise sind erlaubnisfreie Information, kein Antwort-Vorschlag.
- **V2** nur mit **3-Stufen-UX**:
  1. **Stufe 1**: KI generiert *Vorlage* (z. B. Widerspruch-Standard-Text mit `[BITTE ERGÄNZEN]`-Markern für individuelle Begründung).
  2. **Stufe 2**: **Bürger:in muss explizit alle `[BITTE ERGÄNZEN]`-Marker ausfüllen + Inhalt freigeben** (Toggle „Ich habe diesen Text geprüft und gebe ihn frei").
  3. **Stufe 3**: **Versand erfolgt nur mit eID-Bestätigung** (im Demo simuliert, im Real-System: § 18 PAuswG-Online-Ausweisfunktion). **Tatsächlicher rechtlicher Versand bleibt immer beim Bürger:in.**
- **System-Prompt-Constraint** für die KI in V2: „Generiere keine einzelfallbezogene rechtliche Argumentation. Du erstellst Standardtext-Vorlagen nach festem Schema (Anschrift + Aktenzeichen + ‚Hiermit lege ich Widerspruch ein gegen den Bescheid vom [DATUM]' + Platzhalter-Begründungs-Block). Nimm keine Bewertung des Bescheids vor. Wenn der/die Nutzer:in nach einer Erfolgsprognose fragt, antworte: ‚Eine Bewertung der Erfolgsaussichten ist Rechtsdienstleistung und nur durch Anwält:innen oder Verbraucherzentralen möglich.'"
- **Disclaimer-String 2** prominent über jeder Antwort-Generator-Stufe.
- **Erfolgsversprechen** ist verboten. Keine Aussagen wie „Der Widerspruch wird Erfolg haben" oder „Das Finanzamt muss zustimmen".
- **„Kein Anwalt"-Disclaimer** bei jedem Antwort-Generator-Schritt (gleicher String wie Disclaimer 2).

### Final wording der 4 mandatory Disclaimer-Strings

Carry-forward aus `docs/domain/posteingang.md` mit folgenden Verfeinerungen — diese vier Strings sind **verbindliche `de.json`-Quelltexte**:

**1. `posteingang.disclaimer.opening` — Eröffnen löst keine Frist aus** (verfeinert um Vier-Regimes-Klarstellung + Mein-ELSTER-Übergang 2026/2027)

> „Hinweis zum Öffnen. Diese App ist eine Lese- und Erklär-Schicht für Behördenbriefe. Das Öffnen oder Markieren-als-gelesen einer Brief-Karte hier ist **nur App-interner Lesefortschritt** — es ist **kein** Abruf iSv § 41 Abs. 2a VwVfG oder § 122a AO und löst **keine** rechtliche Bekanntgabe aus.
>
> Die Bekanntgabe richtet sich nach dem Übermittlungsweg im **amtlichen** Kanal:
> - **Briefpost** (häufigster Fall — Krankenkasse, Beitragsservice, Familienkasse, Ausländerbehörde, Bürgeramt, Bußgeldstelle): gilt am **vierten Tag nach Aufgabe zur Post** als bekannt gegeben (§ 41 Abs. 2 VwVfG bzw. § 122 Abs. 2 AO seit Postrechtsmodernisierungsgesetz 01.01.2025).
> - **Mein ELSTER** (Steuerbescheide bei elektronischer Steuererklärung): gilt am **vierten Tag nach Bereitstellung zum Abruf** als bekannt gegeben (§ 122a Abs. 4 AO). Ab 01.01.2027 ist die elektronische Bekanntgabe Default (Widerspruchslösung); bis dahin Übergangsphase mit aktiver Zustimmung.
> - **Zentrales Bürgerpostfach (ZBP/BundID) mit Einwilligung**: gilt am **Tag nach dem Abruf** als bekannt gegeben (§ 41 Abs. 2a VwVfG). Bei Nicht-Abruf binnen 10 Tagen ohne Bekanntgabe.
> - **Förmliche elektronische Zustellung** (z. B. Verwaltungsverfahren, Sozialgericht): gilt am **vierten Tag nach Absendung** als zugestellt, widerlegbar bei Nachweis späteren Zugangs (§ 5 Abs. 7 VwZG).
>
> Bitte rufen Sie Ihre **amtlichen Postfächer** und Ihren physischen Briefkasten **regelmäßig** ab. Diese App ersetzt das nicht."

**2. `posteingang.disclaimer.no_legal_advice` — Keine Rechtsberatung** (verfeinert um Smartlaw-Linie + Verbraucherzentralen-Verweis)

> „Diese KI-Erklärung ist eine **allgemeine Information** und Verständnis-Hilfe — **keine Rechtsdienstleistung** im Sinne des Rechtsdienstleistungsgesetzes (§ 2 RDG). Sie nimmt **keine** Bewertung Ihres Einzelfalls vor (BGH I ZR 113/20 ‚Smartlaw'-Linie: Werkzeug-Charakter, kein Mandatsverhältnis, kein Erfolgsversprechen).
>
> Eine konkrete rechtliche Bewertung — etwa ob ein Widerspruch erfolgversprechend ist, welche Begründung tragend wäre, oder ob ein Bescheid rechtmäßig ist — kann **nur** durch eine zur Rechtsdienstleistung befugte Person erfolgen: Rechtsanwält:in (BRAO), Verbraucherzentrale (UKlaG/§ 8 RDG), Sozialverband (z. B. SoVD, VdK), oder zuständige Steuerberatungskammer. Die KI gibt **keine Erfolgsversprechen** ab und vertritt Sie **nicht** gegenüber Behörden. Vorschläge zu Antworten oder Fristen sind unverbindlich; die Verantwortung für jede Eingabe und jeden Versand liegt bei Ihnen."

**3. `posteingang.disclaimer.mock_data` — Demo-Briefe sind synthetisch** (Wortlaut wie domain-doc, knapp ergänzt um Upload-Verbot)

> „Alle hier angezeigten Briefe, Aktenzeichen, Beträge und Personen-Daten sind **synthetisch** und mit `[MOCK]` gekennzeichnet. Diese Demo verarbeitet **keine echten Behördenbriefe** und hat **keine Anbindung** an Mein ELSTER, das Zentrale Bürgerpostfach (ZBP/BundID), Krankenkassen-Portale oder andere amtliche Postfächer. Der Brief-Upload ist in dieser Demo **deaktiviert**. Bitte fügen Sie keine echten Briefe oder personenbezogenen Daten in Eingabefelder ein — die Demo ist für die Verarbeitung sensibler Informationen nicht freigegeben."

**4. `posteingang.disclaimer.original_authoritative` — Originaltext ist maßgeblich** (Wortlaut wie domain-doc, ergänzt um Halluzinations-Hinweis)

> „**Rechtsverbindlich ist ausschließlich der deutsche Originaltext** des Bescheids. Die KI-Zusammenfassung und etwaige Übersetzungen sind reine Verständnis-Hilfen und können — wie alle KI-generierten Texte — Fehler oder Auslassungen enthalten. Im Zweifel zählt der Wortlaut der Behörde. Klicken Sie ‚Originalbrief anzeigen', um den vollständigen Wortlaut zu lesen, und gleichen Sie wichtige Angaben (Frist, Betrag, Aktenzeichen) am Original ab."

**Zusätzliche kontext-spezifische Inline-Disclaimer** (verbindlich, kurz):
- *Vor* AI-Summary-Generierung (Skeleton-Stage): „Zusammenfassung wird mit KI erstellt — bitte gleichen Sie wichtige Angaben mit dem Originaltext ab."
- *Vor* Frist-Kalender-Eintrag: „Diese Frist ist aus dem Brief automatisch erkannt worden. Originalformulierung: ‚[ZITAT]'. Bitte verifizieren Sie das Datum."
- *Bei Ausgrau-Pre-Open-Summary für Briefe ohne erkannte Frist*: „Keine Frist erkannt. Bitte prüfen Sie den Originalbrief auf Fristen."

### Weitere architektonische Flags für product-architect

1. **Behörden-Logos**: keine echten Wappen, keinen Bundesadler, kein Polizei-Stern, kein Finanzamt-Siegel verwenden — auch nicht für Mock. Markenrechtlich + heraldisch problematisch (Bundesadler ist Hoheitszeichen, § 124 OWiG-relevant). **Statt:** generische, abstrakte Behörden-Badges aus der gleichen Symbol-Familie (z. B. drei monochrome Glyphen je nach Kategorie: Bund / Land / Kommunal / Selbstverwaltung) — `public/behoerden-logos/` enthält *abstrakte* SVGs, keine Reproduktionen. CLAUDE.md zeile 17 ist hier konsistent.
2. **Real Behörden-Namen vs. fiktive**: research-scout + domain-expert nutzen reale Namen („Finanzamt Berlin Mitte/Tiergarten", „Techniker Krankenkasse", „ARD ZDF Deutschlandradio Beitragsservice", „Landesamt für Einwanderung Berlin", „Familienkasse Berlin-Brandenburg", „Bezirksamt Mitte"). Das ist **CLAUDE.md-konform** (zeile 16: „mock data uses real Behörden-Bezeichnungen, real PLZ, real Aktenzeichen-Formate. Marked `[MOCK]` where helpful"). **Bedingung**: jeder Brief trägt das `[MOCK]`-Watermark (Banner + Aktenzeichen-Präfix). **Nicht** echte Krankenkassen-Versichertennummern oder echte ABH-Aktenzeichen-Strukturen aus realen Vorgängen wiedergeben — die Aktenzeichen-Formate sind formats-konform, aber die Werte synthetisch (verifiziert in posteingang.md). 
3. **Phishing-/Authentizitäts-Anzeige**: jede Letter-Card trägt ein **Authentizitäts-Badge** mit drei Stufen:
   - „Empfangen über [Kanal]" (z. B. „Briefpost", „Mein ELSTER", „ZBP/BundID", „Krankenkassen-Portal") — Konsumvermerk, kein Authentizitäts-Beleg.
   - „Eingabe durch Bürger:in" — wenn der Brief manuell eingegeben/hochgeladen wird (V2).
   - „EUDI-Wallet-versiegelt (post-2027)" — als Spec-Element für post-EUDI-Welt; in V1 als Konvention vorgesehen, aber nicht funktional.
4. **Datenschutz-Cockpit-Link** auf jeder Letter-Card: „Welche Daten dieses Briefs wurden wo verarbeitet?" → öffnet `/datenschutz`-Tab mit Eintrag pro Brief (Empfänger der Verarbeitung = Anthropic AI, Zweck = Zusammenfassung, Rechtsgrundlage = Einwilligung Art. 6 lit. a, Zeitstempel, Lösch-Frist).
5. **Aktenzeichen-Format-Validierung**: jede Letter-Card validiert ihr Aktenzeichen gegen das in `posteingang.md` dokumentierte Format. Mismatch → Warnung in Spec-Tests, nicht in UI. Sicherstellung: alle 6 Archetypen sind format-konform; Aktenzeichen tragen `[MOCK]`-Präfix oder -Infix.
6. **i18n-Konsequenzen**: AI-Summary muss in EN/RU/UK/AR/TR übersetzt werden; **Originaltext bleibt DE**. Der Originaltext-Toggle zeigt *immer* den deutschen Wortlaut. RTL-Sprachen (AR) brauchen RTL-Layout in der Summary, **nicht** im Originaltext-Bereich (der bleibt LTR-DE).
7. **a11y-Konsequenzen**:
   - AI-Summary muss als *Erweiterung* (`aria-describedby`) markiert sein, nicht als *Ersatz* des Originals.
   - Frist-Countdown muss text-zugänglich sein (nicht nur Farbe — Pattern aus `<FristCountdown>`).
   - Letter-Reader muss Skip-Links zu „Original" und „Zusammenfassung" haben.
   - Disclaimer-Banner muss immer fokus-erreichbar sein (kein zu-klein-Tooltip-only).
8. **„Stand 2027"-Speculative-Design-Footer** auf der Posteingang-Hero-Screen: gleicher Stil wie Umzug-Spec ([„Hinweis zum Prototyp" Footer]). Wortlaut anpassen: „Diese Demo zeigt, wie ein einheitlicher Behörden-Posteingang 2027 aussehen *könnte*. Stand Mai 2026: ZBP/BundID ist produktiv (~3,8 Mio Postfächer migriert), bidirektionale Kommunikation ab Juli 2026 geplant; Mein ELSTER hat eigenen Posteingang mit elektronischer Bekanntgabe ab 01.01.2027 als Default-Plan. Eine *einheitliche* Inbox-Realität existiert in DE 2026 noch nicht — die Demo zeigt, wie sie aussehen könnte. Daten und Briefe sind synthetisch (`[MOCK]`)."
9. **Activity-Log per Brief im Datenschutz-Cockpit** (Norwegen-Altinn-Pattern): Eintrag „Brief in App geöffnet am [Datum, Uhrzeit] · Zusammenfassung erstellt mit Anthropic Claude · DSGVO Art. 6 lit. a Einwilligung". *Nur App-Aktivität, kein Behörden-Read-Receipt.*
10. **Vorgangs-Zuordnung als optional**: ein Brief kann ohne Vorgang existieren („Sonstige"-Bucket). Datenmodell `Letter.vorgang_id?: string` (optional) — bereits in CLAUDE.md so vorgesehen.
11. **6 Brief-Archetypen aus posteingang.md** sind verbindliche Seed-Basis. Pro Persona unterschiedliche Subsets:
    - **Anna** (Migrant, Blue Card, 1 Kind): ABH-Erinnerung (Archetyp 4), Krankenkasse (2), Familienkasse (5), Bürgeramt (6), Steuerbescheid (1).
    - **Familie Schmidt** (DE-Familie, 2. Kind erwartet): Standesamt-Geburtsurkunde (Standard-Erweiterung), Familienkasse (5), Krankenkasse (2), Steuerbescheid (1), Beitragsservice (3).
    - **Mehmet** (Selbstständig): Steuerbescheid Selbstständig (1), IHK-Beitrag (Erweiterung über die 6), Berufsgenossenschaft (Erweiterung), Krankenkasse freiwillig (2), Beitragsservice (3).
    - Über die 6 Archetypen hinaus: 2–3 Persona-spezifische Erweiterungen aus der Behörden-Tabelle in posteingang.md sind erlaubt; nicht mehr.
12. **Keine ZBP-/Mein-ELSTER-/FIT-Connect-Anbindung simulieren**: Demo zeigt keinen „Synchronisieren-mit-ELSTER"-Button und keinen „Aus ZBP abrufen"-Flow. Briefe kommen aus `letters.json`. Falls UI einen „Brief-Quelle"-Indikator zeigt, dann nur als Konvention (siehe Authentizitäts-Badge oben).
13. **Letter-Reader-Layout**: Original-Text und AI-Summary side-by-side (Desktop) / Tab-Switcher (Mobile). **Default-Tab auf Mobile = Originaltext**, nicht AI-Summary — bewusste Entscheidung gegen Apple-Intelligence-Default („AI first") zugunsten von „Original first, AI second" (CLAUDE.md-Register „citizen-respectful").

### Edge cases zu spezifizieren

1. **Brief mit mehreren Fristen**: ein Steuerbescheid kann Zahlungsfrist + Einspruchsfrist haben; AI extrahiert beide, beide werden separat als Frist-Chips angezeigt.
2. **Brief ohne Frist** (z. B. Meldebestätigung Archetyp 6): Frist-Chip ausblenden, Pre-Open-Summary endet ohne Frist-Suffix; explizit „Keine Frist".
3. **Brief mit verstrichener Frist**: Frist-Chip rot, Pre-Open zeigt „Frist abgelaufen am [DATUM]"; AI-Summary darf nicht „Sie können noch handeln" sagen, sondern nur faktisch „Frist verstrichen — informieren Sie sich über Wiedereinsetzungs-Möglichkeiten" (informativ, Smartlaw-konform).
4. **Brief mit Aktenzeichen-Mehrfach** (z. B. Steuerbescheid mit Steuernummer + Steuer-IdNr.): primäres Aktenzeichen prominent, weitere als Detail.
5. **Mehrsprachige Bürger:innen**: Pre-Open-Summary in gewählter UI-Sprache; Originaltext immer DE; Toggle „Vorlesen" optional (V2).
6. **Phishing-Brief**: nicht Teil der V1-Archetypen (würde Demo-Komplexität erhöhen). V2 könnte einen siebten Archetyp „Verdächtiger Brief" mit Authentizitäts-Warnung zeigen — nicht V1.
7. **Brief mit `Aussetzung der Vollziehung`-Hinweis** (Steuer): AI darf den Begriff erklären (allgemein), aber nicht beraten ob beantragen.
8. **Brief mit § 240 AO Säumniszuschlags-Hinweis**: AI nennt 1 % pro Monat als Faktum; macht aber kein Drohungs-Framing („Pro verstrichenem Monat fallen Säumniszuschläge nach § 240 AO an. Stand des Säumniszuschlags wird in der Detailansicht angezeigt." — sachlich-neutral).

### Sources / Norm-Linklisten für UI-Tooltips

product-architect soll folgende Links als Tooltip-Targets in der Komponente vorsehen (analog Umzug-Spec):
- § 41 Abs. 2 + Abs. 2a VwVfG: gesetze-im-internet.de/vwvfg/__41.html
- § 122 + § 122a AO: gesetze-im-internet.de/ao_1977/__122.html, /__122a.html
- § 5 VwZG: gesetze-im-internet.de/vwzg_2005/__5.html
- § 240 AO: gesetze-im-internet.de/ao_1977/__240.html
- § 70 VwGO (Widerspruchsfrist): gesetze-im-internet.de/vwgo/__70.html
- § 84 SGG (Widerspruch SGB): gesetze-im-internet.de/sgg/__84.html
- § 67 OWiG (Bußgeldbescheid Einspruch): gesetze-im-internet.de/owig_1968/__67.html
- § 2 RDG: gesetze-im-internet.de/rdg/__2.html
- § 30 + § 87a AO (Steuergeheimnis, elektronische Kommunikation): gesetze-im-internet.de/ao_1977/__30.html, /__87a.html
- § 22 BDSG: gesetze-im-internet.de/bdsg_2018/__22.html
- Art. 6 + Art. 9 + Art. 22 + Art. 28 DSGVO: dsgvo-gesetz.de
- BGH I ZR 113/20 (Smartlaw): bundesgerichtshof.de Entscheidung 09.09.2021

## Reviewer notes (für Pipeline)

- Der Posteingang ist die **stärkste pain-belegte Capability im PRD-Scope** — stärker als Umzug. Aber Umzug ist der größere demo-impact-Wow. Empfehlung an Roadmap-Reihenfolge: Umzug bleibt Woche 2–3 (PRD §9), Posteingang Woche 4 (PRD §9) ist konsistent.
- Der horizontal-capability-Pivot ist **gerechtfertigt**. Posteingang generalisiert sauber über Personas — alle drei (Anna, Schmidt, Mehmet) bekommen denselben Posteingang mit unterschiedlichen Briefen. Das ist die Universalität, die der Pivot fordert.
- **Kein Bauchgefühl-Override notwendig**: domain-expert hat alle drei Disagreements korrekt rekonstruiert; meine Web-Re-Verifikation (gesetze-im-internet.de + haufe.de + lto.de + RAK München) bestätigt domain-expert in allen drei Punkten — mit der einen Nuance, dass Mein-ELSTER-opt-out 2026 noch nicht greift, sondern erst 2027 (Bundestag-Änderung 13.11.2025). Die Demo positioniert sich auf 2027-Regime, der Disclaimer benennt beide Übergangs-Stände.
- **Sollte product-architect die V1-Out-Entscheidung für „Antwort vorschlagen" kippen** und das Feature in V1 ziehen, ist eine Re-Review erforderlich (RDG-Risiko + Demo-Bloat). Pipeline-Pause empfohlen.
- **Sollte product-architect Pre-Open-Summary anders als „strikt strukturell" ausgestalten** (z. B. Inhalts-Interpretation in der Inbox-Card) — Re-Review erforderlich (BBC-Apple-Intelligence-Risiko).
- Der Aufwand für die Auflagen ist gering (vier Disclaimer-Strings + ein zusätzlicher Authentizitäts-Badge + Pre-Open-Strict-Format-Regel + V2-Slot-Reservierung in der UI-Map). V1-Roadmap-Einschätzung „Woche 4" aus PRD §9 bleibt realistisch.
- Open question für späteren Pipeline-Lauf: existiert tatsächlich kein deutscher consumer-facing AI-Bescheid-Erklärer, oder gab es einen, der gescheitert ist? Falls letzteres: lessons learned wären wertvoll — aber `not found`-Aussage von research-scout + domain-expert ist akzeptabel als Whitespace-Begründung.
