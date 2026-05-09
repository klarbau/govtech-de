---
target: stammdaten
date: 2026-05-08
verdict: PROCEED
reviewer: concept-verifier
inputs_reviewed:
  - docs/research/2026-05-08-stammdaten.md (status: revised, domain-validated)
  - docs/domain/stammdaten.md
  - docs/specs/umzug.md (precedent)
  - docs/specs/posteingang.md (precedent)
  - docs/reviews/2026-05-08-umzug-autopilot-verify.md (own prior verdict, tone reference)
  - docs/reviews/2026-05-08-posteingang-verify.md (own prior verdict, structural template)
  - CLAUDE.md, docs/PRD.md
independent_sources_consulted:
  - https://www.gesetze-im-internet.de/idnrg/__4.html (§ 4 IDNrG Wortlaut, fetched 2026-05-08)
  - https://www.gesetze-im-internet.de/idnrg/__9.html (§ 9 IDNrG 2-Jahres-Speicherfrist, fetched 2026-05-08)
  - https://www.gesetze-im-internet.de/sbgg/__2.html (§ 2 SBGG Wortlaut, fetched 2026-05-08)
  - https://www.gesetze-im-internet.de/sbgg/__4.html (§ 4 SBGG „mündlich oder schriftlich", fetched 2026-05-08)
  - https://www.gesetze-im-internet.de/sbgg/__5.html (§ 5 SBGG 1-Jahres-Sperrfrist, fetched 2026-05-08)
  - https://www.gesetze-im-internet.de/bmg/__36.html (§ 36 BMG Wortlaut, fetched 2026-05-08)
  - https://www.gesetze-im-internet.de/bmg/__51.html (§ 51 BMG Auskunftssperre, fetched 2026-05-08)
  - https://www.gesetze-im-internet.de/sgb_5/__290.html (§ 290 SGB V KVNR, fetched 2026-05-08)
  - https://www.gesetze-im-internet.de/ao_1977/__139b.html (§ 139b AO Steuer-IdNr, fetched 2026-05-08)
  - https://www.gesetze-im-internet.de/bdsg_2018/__22.html (§ 22 BDSG Schutzmaßnahmen, fetched 2026-05-08)
  - https://dsgvo-gesetz.de/art-9-dsgvo/ (Art. 9 DSGVO Wortlaut, fetched 2026-05-08)
  - https://www.kba.de/DE/Presse/Pressemitteilungen/Allgemein/2026/pm16_2026_ida_anbindung.html (KBA-IDA-Anbindung 15.04.2026, fetched 2026-05-08)
  - https://sbgg.info/leitfaden-fuer-erklaerende-personen/ (SBGG-Leitfaden Praxis: Erklärung beurkundungspflichtig, fetched 2026-05-08)
  - https://www.berlin.de/ba-treptow-koepenick/politik-und-verwaltung/aemter/amt-fuer-buergerdienste/standesamt/artikel.1464165.php (Berlin SBGG-Praxis, fetched 2026-05-08)
  - https://stadt.muenchen.de/service/info/anpassung-des-geschlechtseintrags-und-vornamens-selbstbestimmungsgesetz/10416410/n0/ (München SBGG-Verfahren, fetched 2026-05-08)
  - https://eudi.dev/1.4.0/annexes/annex-3/annex-3.01-pid-rulebook/ (PID Rulebook v1.4 — research-cited Version, fetched 2026-05-08)
  - https://github.com/eu-digital-identity-wallet/eudi-doc-architecture-and-reference-framework (ARF v2.0 als aktueller Stand, fetched 2026-05-08)
  - https://initiatived21.de/publikationen/egovernment-monitor/2025 (eGov-MONITOR 2025, fetched 2026-05-08)
  - https://bmds.bund.de/themen/digitaler-staat/digitale-identitaeten/bundid (BundID-FAQ Mai 2026, fetched 2026-05-08)
  - https://docs.developer.singpass.gov.sg/docs/data-catalog-myinfo/catalog (Singpass MyInfo Catalog, fetched 2026-05-08)
  - https://www.finanzen.bremen.de/digitalisierung/digitalisierungsbuero/datenschutzcockpit/faq-haeufig-gestellte-fragen-zum-datenschutzcockpit/faq-zum-datenschutzcockpit-fuer-oeffentliche-stellen-seite-1-123426 (Bremen DSC-FAQ, fetched 2026-05-08)
---

## Verdict

**PROCEED (mit verbindlichen Architektur-, Copy-, Scope- und einer Norm-Korrektur-Auflage)** — Pain-Belege sind solide trianguliert (eGov-MONITOR 2025 55 % „doppelte Dateneingabe vermeiden" + Bitkom 58 % zentrale Hinterlegung + RegMoG 51 priorisierte Register), Whitespace-Position ist echt (kein DE-B2C-Player aggregiert mehrere Behörden-Stammdatenfelder + Korrekturweg-Wegweiser + Audit-Log), und der Lese-/Wegweiser-Schicht-Pivot von domain-expert ist die *einzige* legal tragfähige Architektur — § 34 BMG schließt Privat-Empfänger aus. **ABER**: Die Stammdaten-Capability ist *foundation*, nicht *wow* (anders als Umzug oder Posteingang), und domain-experts SBGG-Adjudikation enthält **eine sachliche Ungenauigkeit** (Anmeldung § 4 SBGG ist *gesetzlich* mündlich ODER schriftlich erlaubt, *nicht* zwingend persönlich — die *Erklärung* nach § 2 SBGG ist beurkundungspflichtig und damit persönlich). Die UX-Konsequenz (Read-only mit Wegweiser-Wizard) bleibt richtig, aber die Begründungs-Copy muss präzise sein. Außerdem: Research zitiert PID Rulebook v1.4 — aktueller ARF-Stand ist v2.0; PID-Schema selbst ist stabil, aber Versions-Disclaimer muss „v1.x" generisch sagen statt v1.4-festzunageln.

## Test-by-test analysis

### 1. User pain — PASS (high confidence, sauber trianguliert)

Belege halten der adversariellen Prüfung stand:

- **eGov-MONITOR 2025** (Initiative D21 + TUM + Kantar, gefördert vom BMDS): „doppelte Dateneingabe vermeiden" ist mit **55 %** einer der Top-3-Verbesserungswünsche (Triangulation: 61 % einfaches Auffinden, 56 % schnellere Bearbeitung). Die Studie ist die offiziell zitierte Verwaltungs-Bürger:innen-Befragung in DE, gefördert vom Auftraggeber-Ministerium der Demo (BMDS). Web-verifiziert auf initiatived21.de.
- **Bitkom 2025**: 58 % Bereitschaft zur einmaligen zentralen Hinterlegung. Triangulation mit eGov-MONITOR überzeugend.
- **RegMoG 51 priorisierte Register**: konkrete, zitierfähige Zahl, die das Once-Only-Prinzip in DE quantifiziert. Domain-expert hat das in der `Hürden`-Sektion sauber rekonstruiert.
- **Estland-Hochrechnung 1.345 Personenjahre/Jahr**: research-scout markiert die DE-Hochrechnung selbst als `confidence: low` — korrekt nicht für TL;DR-Zitat geeignet. Die Pain-Argumentation trägt auch ohne diese Zahl.
- **Das `not found`-Eingeständnis** (keine harte „X Stunden Mehrfacherfassung pro Bürger:in/Jahr"-DE-Zahl) ist akzeptabel, weil eGov-MONITOR + Bitkom + RegMoG ausreichen. Konfidenzbewertung im Research ist ehrlich.

Schwächste Stelle: keine konkrete Volumen-Zahl „wie oft im Jahr trägt ein:e Bürger:in dieselbe IBAN/Adresse neu ein". Das ist ein generelles DE-Statistik-Defizit, nicht ein Research-Versagen — der Pain-Block trägt auch ohne diese Zahl. **PASS**.

### 2. Legal realism — PASS mit einer Norm-Präzisierungs-Auflage

Ich habe die kritischsten Normen heute (2026-05-08) eigenständig auf gesetze-im-internet.de re-verifiziert; die Wortlaute werden hier festgehalten, damit der product-architect sie 1:1 in Tooltips/Disclaimer übernimmt:

**§ 4 IDNrG (verifiziert)**: Basisdaten beim BVA — **11 Felder in Abs. 2** (IDNr, Familienname, frühere Namen, Vornamen, Doktorgrad, Tag und Ort der Geburt, Geschlecht, Staatsangehörigkeiten, gegenwärtige/letzte bekannte Anschrift, Sterbetag, Tag des Einzugs/Auszugs) **plus** zusätzliche Daten in Abs. 3 (Auskunftssperren BMG, Datum letzter Verwaltungskontakt). Research und domain-expert beide korrekt.

**§ 9 IDNrG (verifiziert)**: Protokolldaten **2 Jahre** aufzubewahren, danach Löschung; Einsicht durch Datenschutzbehörden + Betroffene über das DSC. Domain-expert korrekt.

**§ 36 BMG (verifiziert)**: „Zulässig, soweit dies durch Bundes- oder Landesrecht bestimmt ist" — der Paragraph nennt **keine** konkreten Empfänger, sondern fungiert als Rahmenregel. Konkrete Pushes liegen in Spezialgesetzen (RBStV § 11 Abs. 4, § 58c SG, § 42 BMG, AO-Vorschriften, AZRG). Research und domain-expert beide korrekt.

**§ 51 BMG (verifiziert)**: Auskunftssperre auf 2 Jahre befristet, mit Begründungspflicht („Tatsachen, die die Annahme rechtfertigen, dass… eine Gefahr für Leben, Gesundheit, persönliche Freiheit oder ähnliche schutzwürdige Interessen erwachsen kann"). **Übermittlungssperren sind nicht in § 51, sondern in §§ 42 Abs. 3, 50 Abs. 5 BMG geregelt** — domain-expert hat das in der `Hürden`-Sektion korrekt differenziert. Research-scout hatte das initial mit „§ 51 Abs. 5 BMG, indirekt aus § 36/§ 50 Abs. 5" formuliert — formaljuristisch ungenau, aber durch domain-expert in der Adjudikation gefixt.

**§ 290 SGB V (verifiziert)**: Norm-Wortlaut nennt **keine** Stellenzahl direkt — der „1 Großbuchstabe + 8 Ziffern + Luhn-Prüfziffer = 10 sichtbare Stellen"-Befund stammt aus den GKV-Spitzenverbands-Richtlinien (ITSG/vdek). Research und domain-expert nennen den Format-Befund korrekt; korrekte Zitier-Quelle wäre die ITSG/vdek-Richtlinie, nicht § 290 SGB V allein. **Auflage**: Spec / `de.json`-String muss bei Tooltip-Norm-Verweis sagen „§ 290 SGB V i.V.m. GKV-Spitzenverbands-Richtlinie".

**§ 139b AO (verifiziert)**: 11 Ziffern + Lebenslangkeit + Nicht-Änderbarkeit folgen nicht aus Norm-Wortlaut (der nennt keine Stellenzahl), sondern aus dem Vergabeverfahren beim BZSt + § 139a AO + AStBV(St) 2025. Research-scout-Aussage ist sachlich korrekt (das ist gefestigte Praxis), Norm-Verweis ist zulässig.

**§ 2 SBGG (verifiziert)**: Erklärung „gegenüber dem Standesamt" mit zwei Versicherungen + Vornamen-Bestimmung; Norm sagt **nicht direkt** „persönlich". Aber: die Erklärung ist beurkundungspflichtig (PStG-Vollzug) — und Beurkundung erfordert in der Praxis persönliches Erscheinen. Drei Verwaltungs-Praxis-Quellen verifiziert (sbgg.info, Standesamt Berlin Treptow-Köpenick, Stadt München): „Die Erklärung selbst muss persönlich beim Standesamt abgegeben werden". Domain-experts UX-Schluss („Read-only + Wizard zum Standesamt-Termin") ist *richtig*; die zugrunde liegende Begründungs-Copy muss aber genauer sein. Siehe „Adjudikation #3" unten.

**§ 4 SBGG (verifiziert)**: Wortlaut: „Die Änderung des Geschlechtseintrags und der Vornamen ist von der erklärenden Person drei Monate vor der Erklärung nach § 2 **mündlich oder schriftlich** bei dem Standesamt anzumelden, bei dem die Erklärung abgegeben werden soll." Anmeldung wird gegenstandslos, wenn Erklärung nicht binnen 6 Monaten erfolgt. **Wichtig**: § 4 SBGG erlaubt die Anmeldung **explizit auch schriftlich** — „mündlich oder schriftlich". Domain-experts Formulierung „Persönliche Anmeldung beim Standesamt" (in der Behörden-Tabelle Spalte „Korrekturweg" + im Disclaimer-1) ist **streng genommen falsch** für die Anmeldung; korrekt ist sie nur für die Beurkundung der Erklärung. **Norm-Korrektur-Auflage** für product-architect: siehe Adjudikation #3.

**§ 5 SBGG (verifiziert)**: 1-Jahres-Sperrfrist vor erneuter Erklärung. „Vor Ablauf eines Jahres nach der Erklärung der Änderung des Geschlechtseintrags und der Vornamen kann die Person keine erneute Erklärung nach § 2 abgeben." Ausnahmen § 3 (Personen mit Variante der Geschlechtsentwicklung). Domain-expert korrekt.

**Art. 9 DSGVO (verifiziert)**: Religionsmerkmal ist **eindeutig** besondere Kategorie nach Art. 9 Abs. 1 („religiöse oder weltanschauliche Überzeugungen"). Erlaubnistatbestände Art. 9 Abs. 2 lit. a–j wie von domain-expert beschrieben. Eine private Demo-App ist *kein* Träger öffentlicher Gewalt → **Einwilligung lit. a** ist die einzig tragfähige Rechtsgrundlage für die Anzeige in der UI. Domain-expert korrekt.

**§ 22 BDSG (verifiziert)**: Schutzmaßnahmen-Katalog (TOM, Nachverfolgbarkeit, Schulung, DSB, Zugriffsbeschränkung, Pseudonymisierung, Verschlüsselung, Systemsicherheit, regelmäßige Überprüfung, Verfahrens­regelungen) gilt für besondere Kategorien. Domain-expert korrekt.

**KBA-IDA-Anbindung 15.04.2026 (verifiziert auf kba.de)**: Pressemitteilung Nr. 16/2026 bestätigt Anschluss an IDA-Verfahren des BVA. Zur DSC-Anbindung exakter Wortlaut: „In den kommenden Monaten wird es den Anschluss an das Datenschutzcockpit (DSC) als letzte Säule vornehmen." **Wichtig**: KBA hat **noch nicht** an das DSC angeschlossen — nur an IDA. Domain-experts Formulierung „KBA seit 15.04.2026 (IDA, DSC folgt)" ist korrekt. research-scouts initiale Aussage „DSC-Anbindung KBA Anfang 2026" war ungenau (es ist die IDA-Anbindung, nicht DSC). Die Adjudikation domain-experts hat das gefixt.

**EUDI ARF-Versions-Stand (web-verifiziert)**: ARF v1.4 ist nicht mehr aktueller Stand — **v2.0 ist seit 2026 die aktuelle Version** (GitHub eu-digital-identity-wallet/eudi-doc-architecture-and-reference-framework). v1.6 und v1.5 wurden überholt. Das ändert nichts an den **8 Pflicht-Attributen + 4-aus-6-Hilfsattributen**, da das PID-Schema strukturell stabil ist. **Auflage**: Spec sollte „PID Rulebook v1.x (Stand Mai 2026: v2.0)" sagen, nicht „v1.4 festnageln". Wortlaut-Konsequenz: ein Disclaimer-Copy-Fix für `stammdaten.disclaimer.eudi_speculative`. Siehe Adjudikation #5 + flags unten.

Verdict: legal-realistisch **bestreitbar nicht impossible**, aber Spec muss zwischen *was 2026 echt-möglich ist*, *was 2027-spekulativ ist*, und *was OUT-of-scope ist* sauber unterscheiden — exakt wie bei Umzug und Posteingang. Mit den drei Korrektur-Auflagen unten ist das machbar.

### 3. Prior art — PASS mit „Kritisches steal pattern, nicht premise"-Auflage

- **Estland Andmejälgija (Data Tracker)** ist das richtige Pattern für unser DSC-Klon-Frontend — citizen-facing Audit-Log über alle staatlichen Datenabrufe der letzten Jahre. Übertragbar als *Pattern*, nicht als *Premise* (Estland: 1,33 Mio. Bürger:innen, X-Road seit 2001, kulturell paper-light; DE: 84 Mio., föderal, paper-heavy). Research-scout markiert das korrekt. CLAUDE.md-Heuristik „It works in Estonia" ist eingehalten.
- **Suomi.fi-Self-Edit** für leichte Felder (E-Mail, Telefon, Sprachen, Beruf): das ist *minimaler* Self-Edit-Scope — explizit *nicht* Adresse, Geburtsdatum, Geschlecht. Übertragbar; das deckt sich mit domain-experts Lese-/Wegweiser-Schicht-Architektur.
- **Singpass MyInfo Drittanbieter-Consent** (95+ Felder, 7 Kategorien): web-verifiziert. Singapore hat seit Jahren die Consent-UX, die EUDI-Wallet erst 2027/2028 erreichen wird. Übertragbar als Pattern für Demo Flow 8.3 — aber **nur als 2027-Vision**, nicht als 2026-Bestand. Domain-expert hat das in Adjudikation #5 korrekt eingeordnet.
- **Whitespace-Befund DE 2026**: Es gibt heute **keine** consumer-facing UI in DE, die Stammdaten behördenübergreifend aggregiert + Korrekturwege anzeigt + Audit-Log liefert. Mein ELSTER ist Steuer-Slice, BundID ist Identitäts- + Kontakt-Slice, GKV-Portale sind Versicherer-Slices, Caya/Bureaucrazy/Localyze sind Dokumenten-/Mobility-orientiert. Die **Lücke** ist die *einheitliche* Sicht, nicht die *Datenhaltung* — das Melderegister hält bereits umfassend (§ 3 BMG: 19 Pflicht- + 10 Zusatz-Felder). Research-scout korrekt.
- **Pattern, das wir *nicht* stehlen sollen**: Dänemark CPR (keine Self-Edit, kein Audit-Log) und UK One Login (nur Identifikations-Layer). Research-scout korrekt.

**PASS**.

### 4. Demo impact — PASS mit Demo-Choreographie-Auflage

Stammdaten ist **nicht der Wow-Träger** der Demo. Umzug ist der Wow (eine Eingabe → Cascade → fertig in <90 s). Posteingang ist der „first 3 letters in 30 s"-Wow. Stammdaten ist *foundation* — die Capability, die *erklärt*, *warum* der Umzug-Autopilot funktionieren kann (Datenkranz §§ 34, 36 BMG sichtbar gemacht).

**Demo-Story-Hypothese in 30 Sekunden**:

> User landet auf `/stammdaten`. Hero-Card oben: „Sie sind in **7 öffentlichen Registern** geführt. **Letzte Übermittlung**: vor 3 Tagen — Adresse vom Bürgeramt Berlin-Mitte an Beitragsservice ARD/ZDF/Dlr (§ 11 Abs. 4 RBStV). Möchten Sie das Aktivitätsprotokoll ansehen?" Darunter 5 Sektionen: Identität / Anschrift / Familie / Dokumente / Sperren & Einstellungen. Pro Feld: Wert + autoritative Behörde + Korrekturweg + letzter Update-Zeitpunkt.

In 30 s soll der Viewer begreifen: „Aha — die App zeigt mir *transparent*, was der Staat von mir weiß, *wer* es pflegt, *wer* es bekommt, und *wo* ich was ändern kann."

**Risiken** für die 30-s-Wow:
- **Risiko 1 — Stammdaten ist passive Konsum-Surface**, nicht aktive Cascade. Wenn der Viewer nur scrollt und nicht klickt, ist das Wow unter Umzug. Mitigation: die **Aktivitätsprotokoll-Card oben** (Andmejälgija-Pattern) muss visuell der Hook sein — sie zeigt eine *kürzliche* Übermittlung mit konkreter Behörde + Rechtsgrundlage. Das ist die „aha — das passiert *automatisch* und ich seh es zum ersten Mal"-Geste.
- **Risiko 2 — 19+10 Felder erschlagen Bürger:innen**. Domain-expert hat das in `Hürden` adressiert (5-Sektionen-Segmentierung). Auflage: Sektionen mit Default-zugeklappter Detail-Ansicht; Hero zeigt nur Top-Felder + Aktivitätsprotokoll-Card.
- **Risiko 3 — keine echte Hand-Off-Geste zu einem Vorgang**. Mitigation: *jedes* Feld mit Korrekturweg zeigt einen CTA „Jetzt korrigieren" → öffnet Wizard im `/vorgaenge`-Tab (z. B. Adresse → eWA-Wizard, Geschlechtseintrag → SBGG-Wizard). Stammdaten ist damit *Gateway* zu Vorgängen.
- **Risiko 4 — Stammdaten kollidiert mit `/datenschutz`-Tab**. Beides hat Activity-Log-Charakter. Auflage: das App-interne Aktivitätsprotokoll lebt in **beiden Tabs**, aber mit unterschiedlicher Granularität (Stammdaten zeigt **letzten 5 Übermittlungen pro Feld** mit Quick-Link zum vollständigen DSC; Datenschutz zeigt **vollständigen DSC-Klon mit Filter/Suche**).

**PASS — aber mit Demo-Choreographie-Auflage**: Stammdaten ist nicht *Wow-Träger*, sondern *Erklär-Foundation*. In der Demo-Reihenfolge: Stammdaten **vor** Umzug platzieren („Hier sehen Sie, was der Staat von Ihnen weiß. Jetzt zeigen wir, was passiert wenn Sie umziehen.") oder **nach** Umzug („Hier sehen Sie, *wer* automatisch informiert wurde."). Letzteres ist die stärkere Choreographie.

### 5. Effort/value — PASS

Realistisch in <1 Woche Demo-Build:

- **`/stammdaten` Hero-Card mit Aktivitätsprotokoll** (Estland-Andmejälgija-Pattern): ~1 Tag (shadcn-Card + Mock-Daten aus `seed.ts`).
- **5-Sektionen-Layout** (Identität / Anschrift / Familie / Dokumente / Sperren & Einstellungen): ~1 Tag (Tabs + Collapsible-Sections).
- **Pro-Feld-Komponente** mit Wert + Behörde-Badge + Korrekturweg-Pointer + letzter-Update-Zeitstempel: ~1 Tag (komponente wiederverwendbar über alle Sektionen).
- **5 Disclaimer-Strings** in `de.json`: ~0.25 Tage.
- **Mock-Daten** für 3 Personas (Anna, Schmidt, Mehmet) in `personas.json` + `seed.ts`: ~0.5 Tage (domain-expert hat die Profil-Snapshots vorbereitet).
- **Wizard-Hand-Offs** (eWA-Adresse, SBGG-Geschlechtseintrag, Religion-Austritt, IBAN-Self-Edit): ~1 Tag (4 minimale Wizards mit Mock-Bestätigungs-Briefen).
- **Drittanbieter-Consent-Sub-Tab** (Singpass-MyInfo-Pattern, 2027-Vision): ~0.5 Tage (separater Sub-Tab unter Stammdaten, nicht Kern).
- **i18n + a11y**: parallel.

Dependencies: Vorgang-Modell aus Umzug-Spec wiederverwendet; mock-backend `getProfile()` neu, aber simpel; Anthropic-API für AI-Erklärung der Felder *optional*, V1 ohne KI-Layer machbar (rein deklarative Anzeige).

V2-Features (RAUS aus V1):
- **Echtzeit-DSC-API-Anbindung** (technisch in DE 2026 nicht möglich, weder Mock noch real).
- **EUDI-Wallet-Attestation-Issuance** für Drittanbieter (in V1 nur als statische Mock-UI im Sub-Tab).
- **Antrag-auf-Auskunft Art. 15 DSGVO** mit automatischem Brief-Generator pro Behörde — V2, weil RDG-Linie sensibel und die gleiche Smartlaw-Adjudikation wie bei Posteingang gilt.
- **Komplette 51 RegMoG-Register-Sicht**: V1 zeigt 7–10 Behörden (Auswahl); 51 wäre Demo-Bloat.

**PASS**.

### 6. Risk-of-misleading — MITIGATED durch Disclaimer + Architektur-Disziplin

Kritische Stellen:

- **„App ändert meine Stammdaten"-Falle**: viewers könnten denken, der „Korrigieren"-Button schreibt ins Melderegister. Korrekt: App ist Lese-/Wegweiser-Schicht; jede „Korrektur" generiert nur eine Vorlage / öffnet einen Wizard / verlinkt zur Behörde. → Disclaimer-1 (`stammdaten.disclaimer.lese_schicht`) ist die richtige Antwort.
- **„Aktivitätsprotokoll ist DSC"-Falle**: viewers könnten denken, das App-interne Protokoll *ist* das offizielle Datenschutzcockpit. Korrekt: App-internes Log = nur Aufrufe/Filter/Self-Edits in der App; offizielles DSC = behördliches IDA-Übermittlungs-Log nach § 9 IDNrG. → Disclaimer-2 (`stammdaten.disclaimer.audit_log_app_internal`) trennt sauber.
- **„IBAN wird automatisch an alle Behörden gepusht"-Falle**: viewers könnten denken, die App pusht IBAN an Familienkasse/ELSTER/GKV. Korrekt: heute (Mai 2026) gibt es **keinen** zentralen IBAN-Stammdatenservice in BundID. → Disclaimer-4 (`stammdaten.disclaimer.iban_speculative`) ist korrekt platziert; die Demo zeigt das als „2027-Vision".
- **„Geschlechtseintrag-Self-Edit"-Falle**: viewers könnten den SBGG-Wizard mit Self-Deklaration verwechseln. Korrekt: Anmeldung kann mündlich oder schriftlich, **Erklärung ist beurkundungspflichtig** (persönlich beim Standesamt). → Wizard muss den dreistufigen Prozess (Anmeldung → 3 Monate Wartefrist → persönliche Erklärung mit Beurkundung) zeigen + § 5 SBGG 1-Jahres-Sperrfrist sichtbar machen.
- **„EUDI-Wallet-Drittanbieter-Push ist heute Realität"-Falle**: viewers könnten denken, EUDI-Wallet sei produktiv und Banken/Vermieter würden bereits Attestations konsumieren. Korrekt: 2027/2028 ist Drittanbieter-Akzeptanz-Beginn. → Disclaimer-3 (`stammdaten.disclaimer.eudi_speculative`) + Sub-Tab-Banner „2027-Vision" trennt.
- **„Religion ist hinter Klick versteckt, also unsichtbar"-Risiko (Reverse-Falle)**: domain-expert macht Religion hidden-by-default. Risiko: Viewer denkt „die App weiß meine Religion nicht" — dabei ist sie nach § 3 Abs. 1 Nr. 11 BMG im Melderegister. → Disclaimer-5 (`stammdaten.disclaimer.religion_art9`) klärt das.
- **„Echte Behörden-Logos sind echte Anbindung"-Falle**: gleicher Punkt wie bei Posteingang. → Generische abstrakte Behörden-Badges + `[MOCK]`-Watermark; keine echten Wappen/Bundesadler.

**MITIGATED**. Die fünf Disclaimer-Strings, die domain-expert formuliert hat, sind **inhaltlich korrekt** mit einer Norm-Präzisierungs-Auflage zu Disclaimer-1 (siehe Adjudikation #3). Wortlaut ist Sie-Form, knapp, citizen-respectful — passt zum CLAUDE.md-Register.

## Adjudikation der 5 DISAGREEMENTS — wer gewinnt, mit verbindlicher Wortlaut-Konsequenz

### DISAGREEMENT #1 — IBAN-Self-Edit mit consent-driven Push als 2026-Realität oder 2027-Vision

**Position research-scout**: Self-Edit IBAN als Hero-Feature; Push an Familienkasse/ELSTER/GKV technisch via BundID-Stammdatenservice § 8 OZG machbar.

**Position domain-expert**: Heute (Mai 2026) existiert kein offizieller IBAN-Stammdatenservice in BundID; § 8 OZG nennt kein IBAN-Feld; Datenschutzerklärung id.bund.de dokumentiert nur Identitäts- + Kontaktdaten. Self-Edit IBAN ist als Demo-Feature zulässig, aber zwingend mit `iban_speculative`-Disclaimer als 2027-Vision zu kennzeichnen.

**Web-Re-Verifikation (concept-verifier, 2026-05-08)**:
- BMDS-Roadmap 2026 fokussiert auf **Bidirektionalität ab Juli 2026** (Behörden-Rückfragen + Nachreichung) und EUDI-Wallet-Anbindung — **keine** Erwähnung eines IBAN-Stammdatenservice.
- BundID-FAQ (id.bund.de): keine IBAN-Speicherung dokumentiert.
- Tagesspiegel Background BMDS-Monitoring: keine IBAN-Stammdatenservice-Ankündigung.
- Konkurrenz-Pattern Singpass MyInfo: speichert „Bank Account" (CDD-Daten) als eigene Kategorie — aber als Drittanbieter-pull, nicht als zentraler Push.

**Adjudikation**: domain-expert gewinnt. **Self-Edit IBAN als Demo-Feature ist zulässig**, aber **strikt als 2027-Vision** mit `iban_speculative`-Disclaimer und expliziter UI-Markierung „Konzept-Demo — heute nicht verfügbar". Mock-Audit-Eintrag „IBAN-Push simuliert an [Empfänger] am [Datum]" mit `[MOCK]`-Watermark genügt; **keine** Suggestion echter API-Anbindung.

**Verbindliche Wortlaut-Konsequenz**: Disclaimer-4 wie von domain-expert formuliert. Zusätzliche UI-Auflage: das IBAN-Feld trägt einen **„2027-Vision"-Badge** (gleicher Stil wie EUDI-Sub-Tab-Banner) auf der Feld-Card. Bei Klick: Modal mit Erklärung „Heute (Mai 2026) müssen Sie Ihre IBAN bei jeder Behörde separat hinterlegen. Diese Demo simuliert ein 2027-Pattern."

### DISAGREEMENT #2 — DSC-Adoption „operativ" vs. „Pilot-Phase Mai 2026"

**Position research-scout**: DSC-Frontend `datenschutzcockpit.bund.de` definiert; XÖV XDatenschutzcockpit v1.1.0 produktiv seit Sept 2024; KBA Anfang 2026 + sukzessive weitere Behörden — „technische Voraussetzungen frühestens 2026".

**Position domain-expert**: Stand 2026-04-15 hat das **KBA an das IDA-Verfahren** angeschlossen (nicht DSC); BA/STEP im IDA-Pilotvorhaben; DSC-Anbindung folgt „in den kommenden Monaten" laut KBA-Pressemitteilung 16/2026. Eine flächendeckende Bürger:innen-Nutzung der 51 RegMoG-Register ist Mai 2026 nicht erreicht.

**Web-Re-Verifikation (concept-verifier, 2026-05-08)**:
- KBA-Pressemitteilung Nr. 16/2026 (kba.de) bestätigt: KBA hat **am 15.04.2026 IDA angeschlossen**; Wortlaut zur DSC: „In den kommenden Monaten wird es den Anschluss an das Datenschutzcockpit (DSC) als letzte Säule vornehmen." → KBA hat Mai 2026 *noch nicht* an DSC angeschlossen.
- Bremen DSC-FAQ: bestätigt, dass DSC-Anbindung der Register sukzessive erfolgt + an die Anbindungsbereitschaft der einzelnen Register gekoppelt ist.
- digitale-verwaltung.de: 51 priorisierte Register, Nationale Waffenregister als erstes Pilot-Register.
- BVA-Anbindungsleitfaden DSC: zentrale Register sukzessive.
- Brandenburg-Programmstand: DSC-Anbindung der Land-Register ist Roadmap 2026/2027.

**Adjudikation**: domain-expert gewinnt vollständig. **DSC ist Mai 2026 in einer frühen produktiven Phase mit punktueller Register-Abdeckung**. Eine Demo, die dem DSC-Pattern folgt, ist legitim, **muss aber** als „Pilot-/Roadmap-Vision" gekennzeichnet werden. Keine Suggestion, dass alle 51 RegMoG-Register heute schon protokolliert sind.

**Verbindliche Wortlaut-Konsequenz**:
- UI-Label: „Datenschutzcockpit (Pilot-Phase)" auf der Aktivitätsprotokoll-Card.
- Roadmap-Tooltip: „Sukzessive Anbindung: KBA seit 04/2026 an IDA (DSC folgt), BA/STEP im Pilot. Eine flächendeckende Anbindung der 51 RegMoG-Register ist Roadmap 2026/2027."
- Disclaimer-2 (`audit_log_app_internal`) wie von domain-expert formuliert.

### DISAGREEMENT #3 — Geschlechtseintrag SBGG: Self-Edit oder Termin-Hinweis? (mit Norm-Korrektur)

**Position research-scout**: Self-Edit-Pattern mit Standesamt-Termin-Buchung erwogen; SBGG-Reform 2024 als Self-Deklarations-Weg verstanden.

**Position domain-expert**: Self-Edit-Pattern ausgeschlossen. „Persönliche Anmeldung beim Standesamt + drei-Monats-Wartefrist + persönliche Erklärung". Read-only mit Wizard zum Standesamt-Termin. § 5 SBGG 1-Jahres-Sperrfrist sichtbar machen.

**Web-Re-Verifikation (concept-verifier, 2026-05-08)**:

**Wichtige Norm-Präzisierung — domain-experts UX-Schluss bleibt richtig, aber die Begründungs-Copy ist ungenau**:

- **§ 4 SBGG Wortlaut** (verifiziert): „Die Änderung des Geschlechtseintrags und der Vornamen ist von der erklärenden Person drei Monate vor der Erklärung nach § 2 **mündlich oder schriftlich** bei dem Standesamt anzumelden, bei dem die Erklärung abgegeben werden soll." → **Anmeldung kann schriftlich erfolgen, also auch online/postalisch — nicht zwingend persönlich**.
- **§ 2 SBGG Wortlaut** (verifiziert): „Erklärung gegenüber dem Standesamt" mit zwei Versicherungen + Vornamen-Bestimmung. § 2 nennt **nicht direkt** „persönlich".
- **Praxis (drei Quellen verifiziert: sbgg.info, Standesamt Berlin Treptow-Köpenick, Stadt München)**: Die Erklärung ist **beurkundungspflichtig** (PStG-Vollzug), und Beurkundung erfordert in Praxis persönliches Erscheinen. Standesämter verschicken nach Eingang der Anmeldung einen Termin für die persönliche Beurkundung der Erklärung.
- **§ 5 SBGG Wortlaut** (verifiziert): 1-Jahres-Sperrfrist; Ausnahmen § 3 (Personen mit Variante der Geschlechtsentwicklung).

**Adjudikation**: domain-expert gewinnt **in der UX-Konsequenz** (Read-only mit Wizard zum Standesamt-Termin), **verliert aber in einem Punkt der Begründungs-Copy**: die *Anmeldung* ist *gesetzlich* schriftlich zulässig — nur die *Erklärung* ist beurkundungspflichtig.

**Verbindliche Wortlaut-Konsequenz**:

Disclaimer-1 (`stammdaten.disclaimer.lese_schicht`) muss präzise zwischen Anmeldung und Erklärung unterscheiden. **Korrektur-Wortlaut für SBGG-Passus**:

> „… beim Standesamt nach § 4 SBGG für die **Anmeldung** zur Geschlechtseintrag-Änderung (mündlich oder schriftlich, drei Monate vor der Erklärung) und nach § 2 SBGG für die **persönliche Beurkundung der Erklärung** beim Standesamt; nach § 5 SBGG ist eine erneute Erklärung erst ein Jahr nach erfolgter Beurkundung zulässig."

Wizard-Auflage:
- **Stufe 1 (Anmeldung)**: Bürger:in füllt Online-Formular aus (mündlich-Variante in der Demo nicht abbildbar; schriftlich-Variante ist die per Demo simulierte). Mock-Brief „Bestätigung Ihrer Anmeldung nach § 4 SBGG vom TT.MM.JJJJ — Ihr Termin zur persönlichen Beurkundung wird 3 bis 6 Monate nach Anmeldung vergeben" mit Aktenzeichen-Format `[MOCK] B-SBGG-NNNNN/2026`.
- **Stufe 2 (Wartefrist 3 Monate)**: Visualisierung als Countdown im `/vorgaenge`-Tab mit Status-Pill „Wartefrist läuft (§ 4 SBGG)".
- **Stufe 3 (persönliche Erklärung mit Beurkundung)**: Termin-Buchung beim Standesamt; Hinweis „Persönliches Erscheinen erforderlich (Beurkundungs­pflicht)". Mock-Bestätigungs-Brief nach Termin.
- **Sperrfrist § 5 SBGG sichtbar machen**: nach abgeschlossener Beurkundung zeigt das Geschlechtseintrag-Feld eine Status-Notiz „Erneute Erklärung möglich ab TT.MM.JJJJ (§ 5 SBGG, 1-Jahres-Sperrfrist)".
- **§ 45b PStG-Hinweis** für Personen mit Variante der Geschlechtsentwicklung: separater Pfad in der Wizard-Auswahl, nicht in den SBGG-Pfad mischen.

### DISAGREEMENT #4 — Religionsmerkmal-Anzeige (Art. 9 DSGVO)

**Position research-scout**: Anzeige des Religionsmerkmals erwogen; Art. 9 DSGVO-Sensibilität erkannt, UI-Default unklar.

**Position domain-expert**: Hidden by default. Anzeige nur auf Klick mit Art-9-Erklärung + ausdrücklicher Einwilligung pro Anzeige.

**Web-Re-Verifikation (concept-verifier, 2026-05-08)**:
- Art. 9 Abs. 1 DSGVO (verifiziert): Religionszugehörigkeit ist **eindeutig** besondere Kategorie.
- Art. 9 Abs. 2 lit. a (verifiziert): „**ausdrückliche Einwilligung** der betroffenen Person" — eine kontextfreie Default-Anzeige in einer Profil-Übersicht überschreitet die Erforderlichkeit.
- § 22 BDSG (verifiziert): Schutzmaßnahmen-Katalog gilt für besondere Kategorien.
- BfDI-Praxis: Default-Anzeige sensibler Daten ist DPIA-pflichtig; Hidden-by-default ist die DSGVO-konforme UI-Konvention.
- Vergleich mit Posteingang-Verify (eigenes prior verdict): dort wurde Art. 9 für Religionsmerkmal in Steuerbescheid-Briefen mit Citation-Pattern + roter Hinweis-Banner adressiert. Konsistente Behandlung in Stammdaten erfordert hidden-by-default.

**Adjudikation**: domain-expert gewinnt vollständig. **Hidden-by-default mit Art-9-Erklärung + Einwilligungs-Modal** ist die einzig DSGVO-konforme UX für Stammdaten.

**Verbindliche Wortlaut-Konsequenz**:
- Religionsfeld in der Sektion „Identität" oder „Sperren & Einstellungen" als **collapsed-by-default Card** mit Button „[Religionszugehörigkeit anzeigen]".
- Bei Klick: Modal mit Disclaimer-5 (`stammdaten.disclaimer.religion_art9`) und Toggle „Ich willige ausdrücklich in die Anzeige meines Religionsmerkmals in dieser App ein (Art. 9 Abs. 2 lit. a DSGVO)".
- Nach Einwilligung: Anzeige des Wertes. **Einwilligung gilt nur für die aktuelle Session**, nicht persistent — bei Reload erneute Einwilligung.
- Activity-Log-Eintrag bei jeder Anzeige: „Religionsmerkmal angezeigt am [DATUM, UHRZEIT] · Rechtsgrundlage: Einwilligung Art. 9 Abs. 2 lit. a DSGVO".
- *Optional V2*: Austritts-Wizard-Pointer („Kirchenein-/-austritt erfolgt am Standesamt" mit Mock-Wizard im `/vorgaenge`-Tab).

### DISAGREEMENT #5 — Drittanbieter-Consent über EUDI-Wallet als 2027-Sub-Tab oder OUT-V1?

**Position research-scout**: Demo Flow 8.3 als integrierter Teil der Stammdaten-UI; Singpass-MyInfo-Pattern als Vorbild.

**Position domain-expert**: Explizit als 2027-Vision in separate Sub-Sektion „Wallet-Nachweise & externe Empfänger" auslagern, nicht in den Kern-Stammdaten-Hub integrieren. § 34 BMG schließt direkten Push aus Melderegister an private Empfänger aus; Drittanbieter-Konsente laufen über EUDI-Wallet-Attestation.

**Web-Re-Verifikation (concept-verifier, 2026-05-08)**:
- ARF-Versions-Stand: aktueller Stand ist **v2.0** (2026), nicht v1.4 wie zitiert. Das ändert nichts an PID-Schema-Stabilität (8 Pflicht-Attribute + 4-aus-6 Hilfsattribute strukturell unverändert), aber Disclaimer-Copy muss „v1.x" generisch sagen.
- BMDS-Roadmap 2026: EUDI-Wallet-Anbindung Ende 2026 geplant; Drittanbieter-Akzeptanz 2027/2028.
- eIDAS-2-VO 2024/1183: Pflicht zur Bereitstellung einer EUDI-Wallet ab 2026/2027.
- PID-Schema (verifiziert): 8 Pflicht-Attribute (`family_name`, `given_name`, `birth_date`, `age_over_18`, `issuance_date`, `expiry_date`, `issuing_authority`, `issuing_country`) + 4-aus-6 Hilfsattribute (`family_name_birth`, `given_name_birth`, `gender`, `nationality`, ein Geburtsort-Feld, ein Adressfeld).
- Konkurrenz-Pattern Singpass MyInfo (web-verifiziert): seit Jahren produktiv mit Tap-Consent-UX. **Aber**: Singapur hat kein föderales System, kein DSGVO-Korsett, und die MyInfo-Architektur ist *zentral-staatlich*, nicht wallet-attestation-basiert. → Pattern übertragbar, *Premise* nicht.

**Adjudikation**: domain-expert gewinnt. **Drittanbieter-Consent als separater Sub-Tab „Wallet & Externe Empfänger" mit klarer 2027-Vision-Banner** — nicht im Kern-Stammdaten-Hub. **Optional**: könnte sogar komplett OUT-V1 sein, wenn Demo-Bloat-Risiko zu hoch (siehe Demo-Choreographie-Auflage Test #4). Empfehlung: Sub-Tab als V1 *minimal-statisch* (kein interaktiver Consent-Flow), V2 als interaktiver Wizard. Begründung: Sub-Tab transportiert die 2027-Vision-Story ohne wesentlichen Build-Aufwand; ein voller Consent-Flow erfordert Mock-Drittanbieter-Liste, Mock-Attestation-Generierung und Mock-Wallet-UX — das ist 2 weitere Tage und überspannt die V1-Roadmap.

**Verbindliche Wortlaut-Konsequenz**:
- Sub-Tab-Banner: „Wallet & Externe Empfänger — 2027-Vision".
- Disclaimer-3 (`stammdaten.disclaimer.eudi_speculative`) prominent oben im Sub-Tab.
- **Wortlaut-Korrektur** im Disclaimer-3: statt „Architecture and Reference Framework v1.x.x" sagen „Architecture and Reference Framework (Stand Mai 2026: v2.0)" — generischer und aktuell.
- V1-Inhalt des Sub-Tabs: statisches Demo-Pattern (3 Mock-Drittanbieter: Hausbank, Vermieter:in, Energieversorger; jeder mit „Anfrage simulieren"-Button, der ein statisches Modal mit Mock-Attestation-Vorschau zeigt; keine echte interaktive Consent-Persistenz).
- V2-Roadmap: voller Consent-Flow mit Wallet-UX-Simulation.

### Bestätigungen ohne Korrektur

- **§ 36 BMG-Mechanik** (verifiziert): § 36 BMG nennt keine Empfänger; Pushes liegen in Spezialgesetzen (RBStV § 11 Abs. 4, § 58c SG, § 42 BMG, AO-Vorschriften, AZRG) und der AVV-BMG (BMGVwV vom 27.09.2022). Domain-expert + research-scout korrekt.
- **§ 4 IDNrG (11 Basisdaten beim BVA)** (verifiziert): bestätigt.
- **§ 9 IDNrG (2-Jahres-Speicherfrist)** (verifiziert): bestätigt.
- **EUDI Wallet PID v1.x (8 Pflicht- + 4-aus-6 Hilfsattribute)** (verifiziert): bestätigt; ARF-Versions-Stand v2.0 ist Korrektur.
- **§ 51 BMG Auskunftssperre vs. §§ 42 Abs. 3, 50 Abs. 5 Übermittlungssperre** (verifiziert): bestätigt; domain-expert hat das in `Hürden`-Sektion sauber differenziert.
- **§ 290 SGB V (KVNR lebenslang, kassenübergreifend)** (verifiziert): bestätigt; Format aus GKV-Spitzenverbands-Richtlinie, nicht aus Norm-Wortlaut allein.
- **§ 139b AO (Steuer-IdNr lebenslang, einmalig)** (verifiziert): bestätigt; 11-Stellen-Format aus Praxis, nicht direkt aus Norm-Wortlaut.
- **DEÜV-Adressfluss zur GKV**: bestätigt für Beschäftigte; für Nicht-Beschäftigte heterogen über Landesrecht. domain-experts Differenzierung („komplett ohne Aktion" für Beschäftigte, Eigen-Mitteilung für freiwillig Versicherte/Selbstständige) ist korrekt.

## Probe der 4 Demo-Design-Fragen

### Probe #1: Editierbar vs. Read-only pro Feld — wie konkret?

**Adversariale Challenge**: Research-scout listet eine Tabelle mit ~19 Feldern + Self-Edit/Read-only-Verteilung. Domain-expert hat das durch Lese-/Wegweiser-Schicht-Architektur überlagert. Wer gewinnt im Detail?

**Antwort (verbindlich für product-architect)**:

| Feld-Kategorie | Verhalten in Demo-UI | Begründung |
|---|---|---|
| Familienname / Vornamen / Doktorgrad | **Read-only** mit Korrekturweg-Pointer „Standesamt nach § 1355/§ 1626 BGB / § 45 PStG" + „Korrektur über Doktorgrad-Antrag mit Beleg-Upload". Doktorgrad als V2-Self-Edit *möglich*, V1 read-only. | Hoheitlich gepflegt; Self-Edit würde Identitätsverifikation unterlaufen. |
| Geburtsdatum / Geburtsort / Staatsangehörigkeit | **Read-only** mit Korrekturweg-Pointer „Standesamt" / „Einbürgerungsbehörde" | Standesamt-/StAG-pflichtig. |
| **Geschlechtseintrag** | **Read-only** mit SBGG-Wizard (3-Stufen, siehe Adjudikation #3) | § 4 SBGG mündlich/schriftlich-Anmeldung + § 2 SBGG persönliche Beurkundung. |
| Steuer-IdNr | **Read-only**, nicht änderbar | § 139b AO lebenslang, einmalig. |
| **Religion** | **Hidden-by-default**, on-click-show mit Art-9-Einwilligung (siehe Adjudikation #4) | Art. 9 DSGVO, § 22 BDSG. |
| Adresse (Haupt- / Neben- / historisch) | **Read-only** mit eWA-Wizard-Pointer | § 17 BMG; eWA als digitaler Korrekturweg. |
| Familienstand / Ehegatte / Kinder | **Read-only** mit Korrekturweg-Pointer „Standesamt" + Section-Header „Familie" | Standesamt + § 45b PStG. |
| Personalausweis- / Pass- / eAT-Daten | **Read-only** mit Korrekturweg-Pointer „Bürgeramt" / „Ausländerbehörde" | Bundesdruckerei-/ABH-pflichtig. |
| AZR-Nr. (für Drittstaatsangehörige) | **Read-only** mit Hinweis „Korrekturen über Ausländerbehörde + AZRG § 34" | AZR-pflichtig. |
| **Auskunfts- / Übermittlungssperren (§ 51 BMG)** | **Self-Edit-Toggle** mit Begründungs-Upload für Auskunftssperre, ohne Begründung für Übermittlungssperre | Bestandsrecht: § 51 BMG mit Begründung; §§ 42 Abs. 3, 50 Abs. 5 BMG ohne. **Demo-Hinweis**: Toggle ist App-internes Mock-Pattern, real nur per Antrag bei Meldebehörde — Disclaimer „im echten System: Antrag bei Bürgeramt" notwendig. |
| **Kontaktdaten (E-Mail, Mobilnummer)** | **Self-Edit** | BundID-Konto-Konfiguration, kein hoheitlicher Datenfluss. |
| **IBAN für Erstattungen** | **Self-Edit mit „2027-Vision"-Badge** (siehe Adjudikation #1) | Heute kein zentraler Service; Demo simuliert 2027-Pattern. |
| **Sprachpräferenz** | **Self-Edit** | App-intern, KERN-Design-System-Konvention. |
| KVNR + Mitgliedsstatus | **Read-only**, Verweis auf Kassen-Portal | § 290 SGB V; kassenseitig gepflegt. |
| DRV-Versicherungsnummer | **Read-only**, Verweis auf DRV-Konto | § 147 SGB VI; DEÜV-pflichtig. |
| ELStAM (Steuerklasse, Freibeträge) | **Read-only**, Verweis auf Mein ELSTER | BZSt-/ELSTER-pflichtig. |
| KFZ-Halterdaten | *V1 OUT* — gehört nicht in Stammdaten-Hub, sondern in V2-Vorgang `/fahrzeug` | KFZ-Zulassung kein BMG-Stammdatum; § 36 BMG-Push existiert nicht. |

### Probe #2: Activity-Log-UX — wo lebt das Andmejälgija-Pendant?

**Adversariale Challenge**: research-scout schlägt Activity-Log auf der Stammdaten-Seite *und* im Datenschutz-Cockpit vor. Risiko: Redundanz / Verwirrung / kollidierende Disclaimer-Anforderungen.

**Antwort (verbindlich)**: **Beides, mit unterschiedlicher Granularität**:

1. **Auf der Stammdaten-Seite**: kompakte Hero-Card oben („Aktivität — Sie sind in 7 Registern geführt; letzte Übermittlung vor 3 Tagen") + per Sektion 5-letzte-Übermittlungen-Mini-Liste. Zweck: **Sichtbarkeit**, nicht Vollständigkeit. Quick-Link zum vollständigen DSC.
2. **Im `/datenschutz`-Tab**: vollständiger DSC-Klon mit Filter (Behörde / Zeitraum / Rechtsgrundlage), Suche nach Aktenzeichen, Export-Funktion. Zweck: **Vollständige Sicht**.
3. **Trennung App-internes Log vs. behördliches Log**: beides muss klar unterschieden sein. App-internes Log (Aufrufe, Filter, Self-Edits) lebt in einer separaten Sub-Sektion mit eigener Überschrift „App-Aktivität (kein behördliches Übermittlungs-Log)". Disclaimer-2 (`audit_log_app_internal`) ist auf beiden Seiten sichtbar.
4. **Mock-Daten**: 5–8 realistische Übermittlungs-Einträge pro Persona, gemischt aus IDA-Übermittlungen (Behörde→Behörde) und App-Aktivitäten (Bürger:in→App). Pro Eintrag: Empfänger / Zweck / Rechtsgrundlage (mit Norm-Tooltip) / Zeitstempel / Status.

### Probe #3: Familie / Drittanbieter-Consent — wie speculative ist Speculative?

**Adversariale Challenge**: research-scout schlägt Familie als Stammdaten-Sektion *und* eigenen `/familie`-Tab vor. Drittanbieter-Consent als integrierten Stammdaten-Bestandteil. Domain-expert lagert Drittanbieter-Consent in Sub-Tab aus.

**Antwort (verbindlich)**:

1. **Familie als Sektion im Stammdaten-Hub** (Profilanzeige der § 3 Abs. 1 Nr. 15+16 BMG-Daten: Ehegatte, minderjährige Kinder). Read-only mit Standesamt-Wegweiser.
2. **`/familie`-Tab als separate Capability** für *aktive Vorgänge* (Kindergeld-Antrag, Geburten, gemeinsame Vorgangs-Sicht). Stammdaten = Profilanzeige; Familie = Vorgangs-Bündelung. Konsistent mit research-scout-Empfehlung 6b.
3. **Drittanbieter-Consent als Sub-Tab unter Stammdaten** mit „Wallet & Externe Empfänger — 2027-Vision"-Banner (siehe Adjudikation #5). V1 minimal-statisch; V2 voller Consent-Flow.
4. **Kein integraler Bestandteil des Stammdaten-Kerns** — Drittanbieter-Consent ist UX-mäßig anderer Kontext (private Empfänger statt Behörden) und braucht eigene Disclaimer-Schicht (EUDI vs. § 34 BMG).

### Probe #4: Sensible Daten Art. 9 — opt-in oder gar nicht?

**Adversariale Challenge**: Religion ist BMG-Pflicht-Feld, aber Art-9-sensibel. Aufenthaltsstatus indirekt rassische/ethnische-Herkunft-relevant. Gesundheitsdaten gehören nicht in BMG. Wo ist die Schwelle?

**Antwort (verbindlich)**:

| Datenkategorie | Behandlung in Demo-UI | Begründung |
|---|---|---|
| **Religion** | Hidden-by-default, on-click mit Einwilligungs-Modal (Art. 9 Abs. 2 lit. a) | § 3 Abs. 1 Nr. 11 BMG-Pflicht; Art. 9 DSGVO. |
| **Aufenthaltsstatus / AZR-Nr.** | Sichtbar (für Drittstaatsangehörige relevant) **mit Hinweis-Badge** „Sensible Daten — Art. 9 mittelbar" | Mehmet-Persona braucht das. AZR-Daten sind nicht Art-9-direkt, aber mittelbar (Asylhintergrund). Ein hidden-by-default wäre für die Persona nutzungsmindernd. |
| **Geschlechtseintrag** | Sichtbar | § 3 Abs. 1 Nr. 7 BMG-Pflicht. SBGG-Verfahren ist explizit deklaratives Recht. |
| **Gesundheitsdaten / Diagnosen / ePA-Inhalte** | **OUT** — gehört nicht in Stammdaten | Nicht im BMG; SGB-X-Sozialgeheimnis. |
| **Behinderungsgrad** | **OUT** — gehört in `/vorgaenge/schwerbehindertenausweis`, nicht in Stammdaten | Sozialdaten nach SGB IX. |
| **Sozialleistungs-Status** (Bürgergeld, Wohngeld) | **OUT** — Sozialdaten nach §§ 67 ff. SGB X | Besonders schutzbedürftig. |
| **Politische Meinung / Gewerkschaft / Sexuelle Orientierung** | **OUT** — nicht im BMG, nicht in Stammdaten | Reine Art. 9-Daten ohne Verwaltungs-Erforderlichkeit. |

## If REVISE — concrete changes required

N/A — Verdict ist PROCEED mit verbindlichen Architektur-, Copy- und Scope-Auflagen.

## If REJECT — alternative recommendation

N/A.

## If PROCEED — flags for product-architect

### Final adjudication der 5 DISAGREEMENTS — Übersicht

| # | Wer hat recht | Verbindliches Spec-Ergebnis |
|---|---|---|
| **1 (IBAN-Self-Edit als 2027-Vision)** | domain-expert | Self-Edit IBAN als Demo-Feature mit `iban_speculative`-Disclaimer + „2027-Vision"-Badge. Mock-Audit-Eintrag genügt; keine echte API-Anbindung suggerieren. |
| **2 (DSC Pilot-Phase)** | domain-expert | UI-Label „Datenschutzcockpit (Pilot-Phase)" + Roadmap-Tooltip „KBA seit 04/2026 an IDA, DSC folgt". Keine Suggestion flächendeckender Anbindung. |
| **3 (SBGG: Self-Edit ausgeschlossen, aber Norm-Präzisierung in Disclaimer-1)** | domain-expert (in UX-Konsequenz); concept-verifier (in Norm-Präzisierung) | Read-only mit 3-Stufen-Wizard (mündlich/schriftliche Anmeldung → 3 Monate → persönliche Beurkundung). § 5 SBGG sichtbar. **Disclaimer-1-Wortlaut wird gemäß Korrektur unter Adjudikation #3 angepasst.** |
| **4 (Religion hidden-by-default mit ausdrücklicher Einwilligung)** | domain-expert | Collapsed-Card + Einwilligungs-Modal pro Anzeige. Activity-Log-Eintrag bei jeder Anzeige. |
| **5 (EUDI-Sub-Tab als 2027-Vision)** | domain-expert | Separater Sub-Tab „Wallet & Externe Empfänger" mit 2027-Vision-Banner. V1 minimal-statisch; V2 interaktiver Consent-Flow. **ARF-Versionsangabe in Disclaimer-3 generisch („v2.0 Stand Mai 2026") statt v1.4.** |

### Verbindliche `de.json`-Strings (5 Disclaimer + Sub-Tab-Banner + Religion-Modal-Einwilligungs-Toggle)

**1. `stammdaten.disclaimer.lese_schicht`** — domain-experts Wortlaut **mit SBGG-Präzisierung**:

> „Diese App ist eine **Lese- und Wegweiser-Schicht**. Sie selbst nimmt **keine** Änderungen an Ihren Daten in den zuständigen Registern vor. Korrekturen erfolgen ausschließlich im jeweiligen Behörden-Verfahren — etwa beim Bürgeramt nach § 17 BMG für die Anschrift, beim Standesamt nach PStG für Familienstand und Vornamen, beim Standesamt nach § 4 SBGG für die Anmeldung der Geschlechtseintrag-Änderung (mündlich oder schriftlich, drei Monate vor der Erklärung) und nach § 2 SBGG für die persönliche Beurkundung der Erklärung beim Standesamt, beim Bundeszentralamt für Steuern für die Identifikationsnummer (§ 139b AO). Wir zeigen Ihnen pro Feld den richtigen Weg an."

**2. `stammdaten.disclaimer.audit_log_app_internal`** — domain-experts Wortlaut **mit DSC-Status-Präzisierung**:

> „Das hier sichtbare Aktivitätsprotokoll erfasst ausschließlich Ihre Aktivitäten in dieser App (Aufrufe, Filter, Selbst-Editierungen). Es ist **keine** behördliche Audit-Spur. Den behördlichen Audit-Layer für IDNr-basierte Datenübermittlungen zwischen öffentlichen Stellen liefert das Datenschutzcockpit nach § 9 IDNrG mit einer Speicherfrist von 24 Monaten — abrufbar unter datenschutzcockpit.bund.de, sobald die jeweiligen Register angebunden sind. Stand Mai 2026: Pilot-Phase mit punktueller Register-Abdeckung; das Kraftfahrt-Bundesamt hat sich zum 15.04.2026 an das IDA-Verfahren angeschlossen, die DSC-Anbindung folgt. Eine flächendeckende Anbindung der 51 RegMoG-Register ist Roadmap 2026/2027."

**3. `stammdaten.disclaimer.eudi_speculative`** — domain-experts Wortlaut **mit ARF-Versions-Korrektur**:

> „Die hier gezeigte Funktion, Stammdaten als Wallet-Nachweis (Attestation) an private Empfänger — etwa Bank, Vermieter:in, Energieversorger — auf Klick freizugeben, simuliert eine **Vision für 2027**. Sie basiert auf der EUDI-Wallet-Verordnung (EU) 2024/1183 und dem Architecture and Reference Framework (Stand Mai 2026: v2.0). Die Pflicht zur Bereitstellung einer EUDI-Wallet greift in Deutschland frühestens 2026/2027; Drittanbieter-Akzeptanz, Trust-Service-Konformität und Gebührenmodelle sind noch nicht verbindlich geregelt."

**4. `stammdaten.disclaimer.iban_speculative`** — domain-experts Wortlaut, unverändert:

> „Eine zentrale IBAN-Hinterlegung mit automatischer Übergabe an Familienkasse, Finanzamt und Krankenkasse ist heute (Mai 2026) **nicht** verfügbar. Diese Demo simuliert ein 2027-Pattern. Aktuell müssen Sie Ihre Bankverbindung pro Behörde separat hinterlegen."

**5. `stammdaten.disclaimer.religion_art9`** — domain-experts Wortlaut, unverändert:

> „Die Religionszugehörigkeit ist eine besondere Kategorie personenbezogener Daten nach Art. 9 DSGVO. Sie wird hier nur auf Klick eingeblendet. Speicherung im Melderegister beruht auf § 3 Abs. 1 Nr. 11 BMG; die Verwendung zur Lohn- und Einkommensteuer auf § 51a EStG i.V.m. KiStAM (BZSt)."

**6. `stammdaten.disclaimer.religion_consent_toggle_label`** (neu, für Modal):

> „Ich willige ausdrücklich in die Anzeige meines Religionsmerkmals in dieser App ein (Art. 9 Abs. 2 lit. a DSGVO). Diese Einwilligung gilt nur für die aktuelle Sitzung."

**7. `stammdaten.subtab.wallet_externe_empfaenger.banner`** (neu, für Sub-Tab):

> „**2027-Vision** — Wallet & externe Empfänger. Diese Sektion zeigt, wie eine EUDI-Wallet-basierte Datenfreigabe an private Empfänger (Bank, Vermieter:in, Energieversorger) aussehen *könnte*. Heute (Mai 2026) ist diese Funktion nicht verfügbar."

**8. `stammdaten.disclaimer.sperren_mock_pattern`** (neu, für § 51 BMG-Self-Edit-Toggle):

> „Im echten System erfolgt die Eintragung einer Auskunfts- oder Übermittlungssperre nach § 51 BMG (mit Begründung) bzw. nach §§ 42 Abs. 3, 50 Abs. 5 BMG (ohne Begründung) ausschließlich auf Antrag bei der zuständigen Meldebehörde. Dieser App-interne Toggle ist ein Demo-Pattern und ersetzt keine behördliche Antragstellung."

### Threading- / Layout-Entscheidungen (verbindlich)

- **Hero-Card oben**: Aktivitätsprotokoll-Übersicht („Sie sind in N Registern geführt; letzte Übermittlung vor X Tagen") mit Quick-Link zum vollständigen DSC.
- **5 Sektionen**: Identität / Anschrift / Familie / Dokumente / Sperren & Einstellungen. Jede Sektion: Default-zugeklappt mit Top-Felder-Vorschau; Klick → Detail-Ansicht.
- **Pro Feld**: Label + Wert + Behörde-Badge + Korrekturweg-Pointer + letzter-Update-Zeitstempel + (optional) „Korrigieren"-CTA.
- **Sub-Tab „Wallet & Externe Empfänger"** als V1 minimal-statisch.
- **Demo-Choreographie**: Stammdaten **nach** Umzug platzieren in der Demo-Reihenfolge („Hier sehen Sie, wer automatisch informiert wurde").

### Architekturelle Flags

1. **Behörden-Logos**: weiterhin generische abstrakte Behörden-Badges, keine echten Wappen/Bundesadler. Konsistent mit Posteingang-Verify und Umzug-Verify.
2. **Reale Behörden-Namen + reale PLZ + reale Aktenzeichen-Formate**: CLAUDE.md-konform. Pro Wert `[MOCK]`-Watermark; Werte synthetisch. Aktenzeichen-Formate aus `docs/domain/stammdaten.md` Tabelle übernehmen.
3. **Datenmodell**: erweitert das bestehende `Persona`-Model um:
   - `stammdaten.identitaet` (Name, Vornamen, Doktorgrad, Geburtsdaten, Geschlecht, Staatsangehörigkeit, Steuer-IdNr — als nested Object).
   - `stammdaten.anschrift[]` (Haupt- + Neben- + historische, mit `gueltig_ab`/`gueltig_bis`).
   - `stammdaten.familie` (Ehegatte / Lebenspartner / minderjährige Kinder).
   - `stammdaten.dokumente_refs[]` (PA, Pass, eAT, AZR-Ref).
   - `stammdaten.sperren` (`auskunftssperre: boolean`, `uebermittlungssperren: string[]`, `begruendung_aufgabesperre`).
   - `stammdaten.kontakt` (E-Mail, Mobil, Sprachpräferenz).
   - `stammdaten.iban_speculative` (mit `[MOCK]`-Marker).
   - `stammdaten.religion` (mit `consent_session: boolean`-Marker für Art-9-Einwilligungs-Status).
   - `stammdaten.uebermittlungs_log[]` (Empfänger / Zweck / Rechtsgrundlage / Zeitstempel / Status).
   - Update auch `docs/architecture.md` und `src/types/persona.ts` entsprechend.
4. **mock-backend `getStammdaten(personaId)`**: einheitliche API-Funktion; weitere Funktionen `updateKontakt()`, `updateIban()`, `updateSprache()`, `updateSperre()`, `consentReligion()`, `getUebermittlungsLog(personaId, filter?)` — alle in `lib/mock-backend/api.ts`; localStorage-Persistenz.
5. **Wizard-Komponenten** (im `/vorgaenge`-Tab): `StammdatenAdresseEwaWizard`, `StammdatenSbggWizard` (3-stufig), `StammdatenReligionAustrittWizard` (V2 optional), `StammdatenIbanSpeculativeWizard`. Pro Wizard: Mock-Bestätigungs-Brief mit Aktenzeichen-Format aus `docs/domain/stammdaten.md`.
6. **a11y-Konsequenzen**:
   - Religion-Anzeige-Modal muss mit Tastatur erreichbar sein (Tab-Reihenfolge); Einwilligungs-Toggle muss Screenreader-konform announciert werden („ausdrückliche Einwilligung erforderlich").
   - Activity-Log-Mini-Liste auf der Stammdaten-Seite muss als `<aside>` mit `aria-label` markiert sein, damit Screenreader sie überspringen können.
   - 2027-Vision-Badges müssen zusätzlich zu Farbe einen Text-Marker tragen („2027-Vision").
   - Disclaimer-Modal-Auflösung in WCAG-Reading-Order: Headline → Disclaimer-Text → Toggle/Action.
7. **i18n-Konsequenzen**: alle 8 Disclaimer-/Banner-Strings + alle Korrekturweg-Pointer müssen in EN/RU/UK/AR/TR übersetzt werden; Originaltext-Aktenzeichen-Formate bleiben DE.
8. **Demo-Choreographie**: Stammdaten-Tab nach Umzug-Tab in der Demo-Reihenfolge platzieren; Demo-Loom-Skript zeigt: (1) Umzug-Cascade abgeschlossen → (2) Wechsel zu Stammdaten → (3) „Hier sehen Sie das Aktivitätsprotokoll: vor 3 Min haben 6 Behörden Ihre Adresse synchronisiert".
9. **Persona-Datenkonsistenz**: die Stammdaten-Anzeige muss konsistent mit `seed.ts`-Profil-Daten sein, die in Umzug-Wizard, Posteingang-Briefen und `/vorgaenge` verwendet werden. **Einzige Quelle der Wahrheit**: `personas.json` + `seed.ts`. Komponenten ziehen über `getStammdaten()` aus dem mock-backend, nicht direkt aus `personas.json`.
10. **Sub-Tab „Wallet & Externe Empfänger"**: V1 zeigt 3 statische Mock-Drittanbieter (Hausbank Sparkasse, Vermieter:in [Mock-Hausverwaltung], Energieversorger Vattenfall). Pro Eintrag: „Anfrage simulieren"-Button → Modal mit Mock-Attestation-Vorschau (PID-Felder Pflicht + 4-aus-6 Hilfsattribute, anhand der Persona-Daten gefüllt) + 2027-Vision-Disclaimer. Keine echte Persistenz; bei Reload zurückgesetzt.

### Edge cases zu spezifizieren

1. **Persona ohne Religionseintrag** (z. B. Anna Petrov): Religion-Card zeigt „keine Religionszugehörigkeit eingetragen" als Standard-Wert; dennoch hidden-by-default mit Einwilligungs-Modal — Konsistenz für alle Personas.
2. **Persona mit Auskunftssperre** (Demo-Variante): zeigt „Auskunftssperre aktiv (§ 51 BMG, befristet bis TT.MM.JJJJ)" als Status-Pill; Datenfreigabe-Sub-Tab zeigt Warnung „Auskunftssperre verhindert Drittanbieter-Anfragen — bitte zuerst Sperre prüfen".
3. **Mehmet als Drittstaatsangehöriger**: AZR-Nr. + eAT-CAN-Felder sichtbar (mit Art-9-Hinweis-Badge); Aufenthaltsstatus-Feld sichtbar mit § 21 AufenthG-Tooltip; SBGG-Wizard nicht zugänglich, falls aufenthaltsrechtliche Sondervorschrift greift (§ 2 Abs. 3 SBGG-Sonderregel).
4. **Familie Schmidt mit minderjährigen Kindern**: Kinder-Sub-Sektion zeigt Kinder-Stammdaten read-only; Korrekturweg-Pointer „Standesamt + Familienkasse"; bei Klick → `/familie`-Tab.
5. **IBAN-Self-Edit ohne Einwilligung**: Bürger:in setzt IBAN, Speculative-Push-Modal listet 3 Empfänger (Familienkasse, ELSTER, GKV) mit individuellen Toggles; nur Toggle-Empfänger erhalten Mock-Push-Audit-Eintrag.
6. **Activity-Log leer** (Demo-Initial-Zustand): Hero-Card zeigt „Keine kürzlichen Übermittlungen — willkommen!" mit CTA „Setzen Sie eine Sperre / Aktivieren Sie EUDI-Wallet".
7. **DSC-Pilot-Status-Wechsel**: falls Demo später als 2027 simuliert (timeshift), Banner-Wortlaut anpassen — V1 bleibt Mai-2026-konsistent.
8. **Schiefer-Fall: Bürger:in ändert Sprachpräferenz auf RTL (AR)**: Layout muss umschalten; Originaltext-Aktenzeichen-Formate bleiben LTR-DE.

### Sources / Norm-Linklisten für UI-Tooltips (analog Posteingang-Verify)

product-architect soll folgende Links als Tooltip-Targets in der Komponente vorsehen:
- § 3 BMG: gesetze-im-internet.de/bmg/__3.html
- § 17 BMG: gesetze-im-internet.de/bmg/__17.html
- § 34 BMG: gesetze-im-internet.de/bmg/__34.html
- § 36 BMG: gesetze-im-internet.de/bmg/__36.html
- § 42 BMG: gesetze-im-internet.de/bmg/__42.html
- § 50 BMG: gesetze-im-internet.de/bmg/__50.html
- § 51 BMG: gesetze-im-internet.de/bmg/__51.html
- § 4 IDNrG: gesetze-im-internet.de/idnrg/__4.html
- § 9 IDNrG: gesetze-im-internet.de/idnrg/__9.html
- § 2 SBGG / § 4 SBGG / § 5 SBGG: gesetze-im-internet.de/sbgg/__2.html (etc.)
- § 45b PStG: gesetze-im-internet.de/pstg/__45b.html
- § 139b AO: gesetze-im-internet.de/ao_1977/__139b.html
- § 290 SGB V: gesetze-im-internet.de/sgb_5/__290.html
- § 22 BDSG: gesetze-im-internet.de/bdsg_2018/__22.html
- Art. 6 + Art. 9 + Art. 15 + Art. 16 DSGVO: dsgvo-gesetz.de
- § 8 OZG: gesetze-im-internet.de/ozg/__8.html
- AVV-BMG: verwaltungsvorschriften-im-internet.de/bsvwvbund_27092022_VII2201041418.htm
- KBA-IDA-Pressemitteilung: kba.de/DE/Presse/Pressemitteilungen/Allgemein/2026/pm16_2026_ida_anbindung.html
- Bremen DSC-FAQ: finanzen.bremen.de (DSC-FAQ-Seite)
- EUDI ARF v2.0: github.com/eu-digital-identity-wallet/eudi-doc-architecture-and-reference-framework

## Reviewer notes (für Pipeline / Roadmap)

- **Stammdaten ist foundation, nicht wow-Träger**. Demo-Choreographie ist entscheidend: Stammdaten **nach** Umzug platzieren ist die stärkere Geste („Hier sehen Sie, wer automatisch informiert wurde"). PRD § 9 Roadmap-Reihenfolge bleibt: Umzug Woche 2–3, Posteingang Woche 4, Stammdaten Woche 5+ — das ist konsistent mit dem foundation-character.
- **Norm-Korrektur an Disclaimer-1 ist *die* einzige sachliche Auflage** an domain-expert. SBGG-§-4-„mündlich oder schriftlich"-Wortlaut muss in Disclaimer-1 reflektiert sein, sonst riskiert die Demo eine sachlich falsche Aussage über Recht („persönliche Anmeldung") in einem citizen-respectful-Demo. Korrigierter Wortlaut oben in Adjudikation #3 + Disclaimer-Strings.
- **ARF-Versions-Korrektur (v1.4 → v2.0 mit „Stand Mai 2026")** ist trivial, aber notwendig — Demo soll *current* wirken, nicht in Versions-Schnee von gestern feststecken. PID-Schema selbst ist stabil.
- **Domain-experts Lese-/Wegweiser-Schicht-Architektur ist die zentrale strategische Entscheidung**. Ohne sie wäre das ganze Projekt rechtlich auf Eis (§ 34 BMG schließt private Empfänger aus). Die Capability funktioniert **nur** als citizen-side-View auf eine Behörden-VVT (Art. 30 DSGVO) — *nicht* als Aggregator, der schreibt. domain-expert hat das treffend identifiziert; concept-verifier bestätigt vollständig.
- **Drittanbieter-Consent-Sub-Tab als V1 minimal-statisch ist die richtige Scope-Entscheidung**. Voller interaktiver Consent-Flow wäre 2 Tage zusätzlicher Build und überspannt die V1-Roadmap; Sub-Tab transportiert die 2027-Vision-Story ohne wesentlichen Aufwand. Falls product-architect das ändern möchte (z. B. voller Consent-Flow in V1), ist eine **Re-Review** erforderlich.
- **Sollte product-architect die Religion-hidden-by-default-Architektur kippen** und Religion default-anzeigen — Re-Review erforderlich (Art. 9 DSGVO-Risiko).
- **Sollte product-architect den SBGG-Wizard auf weniger als 3 Stufen vereinfachen** (z. B. Anmeldung + Beurkundung in einer Stufe) — Re-Review erforderlich (§ 4 SBGG 3-Monats-Wartefrist ist gesetzlich zwingend).
- **Open question für späteren Pipeline-Lauf**: Wie verhält sich Stammdaten zu zukünftigen Capabilities (`/dokumente`-Vault, `/familie`, `/steuer`)? Empfehlung: Stammdaten als *Inbound-Reference* aus diesen Capabilities (z. B. Steuer pre-fills mit `getStammdaten().identitaet.steuer_idnr`); keine Rückkopplung von Capabilities in Stammdaten (Stammdaten ist Quelle, nicht Senke).
- **Aufwandsschätzung V1 — 4–5 Tage Demo-Build** (siehe Test #5). Konsistent mit PRD-Roadmap-Slot. Disclaimer-Strings + Wizard-Hand-Offs sind die größten Posten.
- **Pain-Belege sind solide**, aber das Stammdaten-Wow ist **subtiler** als bei Umzug oder Posteingang. Die Demo-Story muss in der Loom-Aufnahme sehr bewusst auf das *Aktivitätsprotokoll* hinarbeiten, nicht auf die Feld-Anzeige selbst. Ohne den „aha — sechs Behörden synchronisierten gerade meine Adresse"-Moment fällt das Wow flach.
- **Konsistenz zu Umzug-Spec und Posteingang-Spec**: Stammdaten-Spec sollte auf bestehende Datenmodelle (Vorgang, Letter) sowie Komponenten (`<FristCountdown>`, `<BehoerdenBadge>`) zurückgreifen. product-architect: konkretisieren, was wiederverwendet wird vs. was neu ist.
