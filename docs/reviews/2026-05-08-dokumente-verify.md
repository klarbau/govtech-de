---
target: dokumente-vault
date: 2026-05-08
verdict: PROCEED
reviewer: concept-verifier
inputs_reviewed:
  - docs/research/2026-05-08-dokumente-vault.md (status: revised, domain-validated)
  - docs/domain/dokumente.md
  - docs/specs/umzug.md (precedent)
  - docs/specs/posteingang.md (precedent — referenced via verify-Doc)
  - docs/reviews/2026-05-08-posteingang-verify.md (own prior verdict, tone reference)
  - docs/reviews/2026-05-08-umzug-autopilot-verify.md
  - CLAUDE.md, docs/PRD.md
independent_sources_consulted:
  - https://www.gesetze-im-internet.de/vwvfg/__33.html (§ 33 VwVfG Wortlaut Abs. 1–4, fetched 2026-05-08)
  - https://www.gesetze-im-internet.de/vwvfg/__3a.html (§ 3a Abs. 2 VwVfG Wortlaut, fetched 2026-05-08)
  - https://www.gesetze-im-internet.de/ao_1977/__87a.html (§ 87a Abs. 4 AO Wortlaut, fetched 2026-05-08)
  - https://www.gesetze-im-internet.de/ao_1977/__147.html (§ 147 Abs. 3 AO Aufbewahrungsfristen, fetched 2026-05-08)
  - https://dsgvo-gesetz.de/art-17-dsgvo/ (Art. 17 Abs. 3 lit. b + e DSGVO, fetched 2026-05-08)
  - https://eu-digital-identity-wallet.github.io/eudi-doc-architecture-and-reference-framework/2.7.3/architecture-and-reference-framework-main/ (ARF v2.7.2/2.7.3 Inhaltsstruktur, fetched 2026-05-08)
  - https://github.com/eu-digital-identity-wallet/eudi-doc-architecture-and-reference-framework/releases (ARF Release-Liste — 2.7.x ist aktuelle Linie, nicht 2.6.0)
  - https://www.bsi.bund.de/SharedDocs/Downloads/DE/BSI/Publikationen/TechnischeRichtlinien/TR03171/BSI-TR-03171.html (TR-03171 v0.8 — Standard-Titel + Versionsstand)
  - https://www.bundesdruckerei.de/de/newsroom/pressemitteilungen/verwaltungsdokumente-mobil-verifizieren-mit-zesi-mobile-pruef-app (Pressemitteilung ZeSI mobile, herausgegeben 03.06.2025; App-Download seit 13.05.2025)
  - https://www.bundesdruckerei.de/de/innovation-hub/case-study-hamburg-faelschungssicher-und-ueberall-pruefbar (Hamburg-eWA-Kennzahlen 830/Tag, 350.000 kumuliert, 2.500 Meldebehörden, 60 Mio. Einwohner, 80 % Abdeckung; RP + SH flächendeckend)
  - https://bmds.bund.de/aktuelles/pressemitteilungen/detail/bund-startet-sandbox-fuer-eudi-wallet (BMDS-Sandbox seit 2026, Stufe 1 Anfang 2027)
  - https://www.biometricupdate.com/202601/germany-launches-eudi-wallet-sandbox-to-test-key-functions-apply-specific-use-cases (Sandbox-Berichterstattung)
  - https://www.lissi.id/blog/germanys-eudi-wallet-sandbox-is-coming-your-guide-to-getting-ready (LSP-Konsens + Sandbox-Status)
  - https://bmi.usercontent.opencode.de/eudi-wallet/eidas-2.0-architekturkonzept/content/appendix/01-qeaa-issuance-and-presentation/ (Blueprint EUDI Wallet Ecosystem in Germany — BMI/BMDS-Konzept)
  - https://www.european-digital-identity-regulation.com/Article_5a_(Regulation_EU_2024_1183).html (eIDAS 2 Art. 5a — 24-Monats-Frist Member State Wallet)
  - https://en.wikipedia.org/wiki/EU_Digital_Identity_Wallet (eIDAS 2 timeline overview)
  - https://www.digital-identity-wallet.eu/news/what-are-the-3-types-of-electronic-attestations-of-attributes-eaa/ (PuB-EAA Definition, POTENTIAL-LSP)
  - https://initiatived21.de/uploads/03_Studien-Publikationen/eGovernment-MONITOR/2025/D21-eGovMon2025.pdf (eGov-MONITOR 2025 — 12 % / 61 % / 55 % / 25 % eID)
  - https://en.wikipedia.org/wiki/DigiLocker (DigiLocker-Statistik 2025: 515 Mio User, 9,43 Mrd. Dokumente, 2.131 Issuers, 2.611 Requesters)
  - https://www.ria.ee/en/state-information-system/personal-services/eesti-app (Eesti-App, RIA, Dezember 2024 launch)
---

## Verdict
**PROCEED (mit verbindlichen Architektur-, Copy- und Scope-Auflagen)** — Pain ist robust belegt (eGov-MONITOR 2025 + 180-Tage-Falle ELSTER + DigiLocker-Größenordnung als globaler Beweis der Massentauglichkeit), Whitespace-Position ist real (kein DE-B2C-Aggregator über mehrere Lebenslagen + QR-Verifikation + EUDI-Vorbereitung), und die rechtsdogmatischen Pfeiler stehen — § 33 VwVfG hartes Verbot ist verifiziert, § 87a Abs. 4 AO ist domain-expert-korrekt formuliert (drei Pfade, nicht nur qeS), § 147 AO 10/8/6-Frist ist verifiziert, ARF-Format-Pflicht-Pfad über CIRs ist sauber ausargumentiert. **Eine relevante Sachverhalts-Korrektur**: ARF v2.6.0 ist nicht mehr die aktuelle Version — ARF v2.7.2 (bzw. 2.7.3 in jüngsten Builds) ist die zum 8. Mai 2026 publizierte Linie. Diese Version-Drift muss in Research + Domain + Spec einheitlich auf v2.7.x umgesetzt werden, ohne dass sich die Substanz der vier Attestation-Typen / SD-JWT-VC + mDoc-Praxis ändert. Verbleibende adversariale Risiken: (a) QR-Code-Authentizitäts-Theater bei Mock-Dokumenten, (b) Beglaubigungs-Erwartung der Bürger:innen darf nicht durch UI-Formulierungen geweckt werden, (c) Selective-Disclosure-Demo darf nicht den Eindruck eines produktiven PuB-EAA-Issuers in DE erwecken.

## Test-by-test analysis

### 1. User pain — PASS mit ehrlich markierter Lücke

**Belege (eigenständig re-verifiziert auf eGov-MONITOR-2025-PDF, initiatived21.de):**

- **12 %** stimmen zu, dass „der Staat den Alltag erleichtert" — bestätigt.
- **61 %** Findability-Wunsch — bestätigt.
- **55 %** Vermeidung doppelter Dateneingaben — bestätigt.
- **25 %** eID-Nutzung — bestätigt (Adoption-Lag, App-Müdigkeits-Argument).

**Indirektes-Signal-Risiko**: research-scout (und domain-expert) markieren die harte Volumen-Zahl „verlorene Bescheide pro Haushalt pro Jahr" als `not found`. Das ist intellektuell ehrlich und richtig — die Pain-Argumentation läuft über *Findability* + *180-Tage-Falle in Mein ELSTER* + *Quasi-Narrative aus Selbstauskünften*, nicht über eine Volumen-Statistik. **Concept-verifier-Befund**: das ist tragfähig, weil die Findability-Zahl 61 % zentral *exakt das Problem benennt*, das ein Tresor löst. Das ist nicht "ein Tresor, der ein Problem sucht" (CLAUDE.md-Heuristik *Faux-AI / elegantes Solution-zu-Non-Problem*) — der Pain ist breit. Aber die Demo-Copy darf **nicht** mit erfundenen Volumen-Zahlen arbeiten ("Bürger:innen verlieren X Bescheide pro Jahr") — sie muss bei der real-belegten Findability/180-Tage-Argumentation bleiben.

**Zusätzliche Triangulation**: die **180-Tage-Falle** in Mein ELSTER + 60 Tage Nach-Abruf ist eine konkrete operative Pain-Quelle (research-scout hat ELSTER-Hilfeseite zitiert, ELSTER-Hilfe-Globale): Bürger:innen verpassen das Download-Fenster und müssen § 78 AO Akteneinsicht beantragen. Das ist ein operatives Pain-Beispiel, das im Loom direkt zeigbar ist. Domain-expert hat zudem die DIVA-Programm-Verschiebung auf 01.01.2027 (opt-out) korrekt markiert — relevant, weil ab 2027 das ELSTER-Volumen automatisch wächst und der Tresor-Bedarf strukturell zunimmt.

**Verdict**: Pain belegt, Volumen-Lücke ehrlich offen, kein Schnipp-Schnapp-Gimmick. **PASS**.

### 2. Legal realism — PASS mit verbindlichen Korrekturen

Ich habe die fünf load-bearing Normen heute (2026-05-08) eigenständig auf gesetze-im-internet.de + dsgvo-gesetz.de re-verifiziert. Die Wortlaute werden hier festgehalten, damit der product-architect sie 1:1 in Tooltips/Disclaimer übernimmt:

#### § 33 VwVfG — Beglaubigung
- **Abs. 1**: „Jede Behörde ist befugt, Abschriften von Urkunden, die sie selbst ausgestellt hat, zu beglaubigen" — domain-expert verbatim korrekt; gegen *jede* private App durchsetzbar weil App keine *Behörde iSv § 1 Abs. 4 VwVfG* ist und *keinen Bediensteten + Dienstsiegel* aufbringen kann.
- **Abs. 3** (Beglaubigungsvermerk-Bestandteile): genaue Bezeichnung des Schriftstücks + Übereinstimmungs-Feststellung + Hinweis auf Verwendungszweck (falls Urschrift nicht von Behörde) + Ort + Tag + Unterschrift + Dienstsiegel. Eine private App kann den Vermerk strukturell nicht produzieren — nicht einmal mit eIDAS-qeS, weil die App keine Behörden-Bedienstete ist.
- **Abs. 4**: Geltung auf Ablichtungen + Lichtdrucke + Ausdrucke elektronischer Dokumente.

→ **Adjudikation #1 verifiziert**: hartes Verbot. Konsequenz für Spec: keine Beglaubigungs-Funktion, kein „Premium"- oder „Coming-soon"-Banner, sondern Deep-Link-Pattern zur zuständigen Behörde / Notar-App.

#### § 87a Abs. 4 AO — wesentliche Korrektur durch Wortlaut

**Wortlaut (verifiziert 2026-05-08):**
> „Eine durch Gesetz für Verwaltungsakte oder sonstige Maßnahmen der Finanzbehörden angeordnete Schriftform kann […] durch die elektronische Form ersetzt werden. Der elektronischen Form genügt ein elektronischer Verwaltungsakt, der **mit einer qualifizierten elektronischen Signatur oder einem qualifizierten elektronischen Siegel** versehen ist **oder in einem sicheren Verfahren nach Absatz 7 oder Absatz 8 übermittelt oder zum Abruf bereitgestellt wird**. Die Schriftform kann auch ersetzt werden durch Versendung einer **De-Mail-Nachricht** nach § 5 Abs. 5 De-Mail-Gesetz […]"

**Befund**: research-scout hatte „qeS als alleinige Lösung" formuliert. Domain-expert hat das auf „qeS *oder* qualifiziertes Siegel *oder* sicheres Verfahren *oder* De-Mail" revidiert. **Domain-expert ist verbatim korrekt** — die App soll bei Steuerbescheid-Anzeige **alle vier Möglichkeiten** beschreiben können, nicht nur qeS. Insbesondere wenn ein elektronischer Bescheid über § 122a Abs. 4 AO „zum Abruf bereitgestellt" wird, ist das ein „sicheres Verfahren" iSv § 87a Abs. 4 S. 2 AO, also rechtlich Schriftform-äquivalent, **auch ohne qeS auf dem PDF selbst**. Der Tresor muss die Distinction präzise spiegeln: ein „qeS-Badge" auf einem Mein-ELSTER-PDF ist **eine** mögliche Authentizitäts-Form, nicht die einzige.

#### § 147 Abs. 3 AO — Aufbewahrungsfristen
**Wortlaut verifiziert** (2026-05-08): 10 Jahre für Bücher / Aufzeichnungen / Inventare / Jahresabschlüsse / Lageberichte / Eröffnungsbilanz / Zollkodex-Unterlagen (Nr. 1 + 4a); **8 Jahre** für Buchungsbelege (Nr. 4); **6 Jahre** für sonstige in Abs. 1 aufgeführte Unterlagen (Geschäftsbriefe). Frist beginnt mit Schluss des Kalenderjahres der Entstehung (Abs. 4). Verlängerung, soweit Unterlagen für nicht-verjährte Steuerforderungen erforderlich.

**Konsequenz**: domain-expert-Persona-Differenzierung („nur Mehmet trägt 10-Jahres-Countdown, Anna + Schmidt nicht") ist *operativ* korrekt — Privatpersonen ohne Buchführungspflicht haben *keine* gesetzliche Aufbewahrungs**pflicht** (nur 6-Jahres-Empfehlung für Festsetzungsverjährung § 169 Abs. 2 AO). Der Tresor muss das in der UI **persona-spezifisch** anzeigen, nicht generisch alle Bescheide mit „10-Jahre-Frist" markieren.

#### § 3a Abs. 2 VwVfG — Schriftformersatz
**Wortlaut verifiziert** (2026-05-08): qeS / De-Mail / sichere elektronische Postfächer (beA, beBPo, identifiziertes Bürger-Postfach) / qualifiziertes elektronisches Siegel (Behörden-Seite). **Identifizierung** (nicht Pseudonymität) zwingend. Damit ist `not Schriftform-Ersatz`-möglich aus dem Tresor selbst, was domain-expert sauber feststellt.

#### DSGVO Art. 17 Abs. 3 lit. b + e — Lösch-Ausnahmen
**Wortlaut verifiziert**:
- **lit. b**: Erfüllung einer rechtlichen Verpflichtung / Wahrnehmung einer Aufgabe im öffentlichen Interesse oder in Ausübung öffentlicher Gewalt.
- **lit. e**: Geltendmachung / Ausübung / Verteidigung von Rechtsansprüchen.

**Konsequenz**: domain-expert korrekt — beide Ausnahmen schützen *die ausstellende Behörde* gegen Löschungsanträge der Bürger:innen, **nicht** die private Tresor-App. Im *eigenen* Tresor kann Bürger:in jederzeit löschen. Die UI muss das auch so framen: „Löschung im Tresor ≠ Löschung beim Aussteller." Domain-expert hat dafür einen Inline-Disclaimer vorbereitet (vor Löschen). Verbindlich übernehmen.

#### eIDAS 2 / VO 2024/1183 — Frist-Architektur
**Verifiziert**: VO 2024/1183 publiziert **30.04.2024**, in Kraft **20.05.2024**. Mitgliedstaat-Bereitstellungspflicht 24 Monate nach Inkrafttreten der ersten Implementing Acts (4.12.2024) → **Frist 31.12.2026**. Mandatory Acceptance Banken/VLOPs/Telcos 36 Monate nach IA → **Ende 2027**. Domain-expert + research-scout korrekt formuliert.

#### EUDI ARF — sachliche Korrektur Versionsnummer
**Verifiziert** (eu-digital-identity-wallet.github.io + GitHub-Releases, 2026-05-08): die *aktuelle Linie* ist **v2.7.2**, mit URL-Path-Vorhandensein für **v2.7.3** (jüngster Build). **Nicht** v2.6.0, wie research und domain-expert beide schreiben. Vier Attestation-Typen (PID, QEAA, EAA, PuB-EAA) sind unverändert; Format-Repertoire (mDoc + SD-JWT VC + W3C VC) ist unverändert. **Adjudikation #6 (Format-Mandat-Pfad über CIRs) wird durch v2.7.x bestätigt**: die ARF v2.7.x „supports" die Formate; die Pflicht für PID + (Q)EAA-Format-Profile ist in den Implementing Regulations definiert. **Korrektur-Anweisung**: alle „v2.6.0"-Referenzen in Research + Domain + Spec auf **v2.7.2** umstellen, inkl. Quellen-URL-Pfad. Substanz unverändert.

#### BSI TR-03171 v0.8 — verifiziert
**Verifiziert** (bsi.bund.de Standard-Eintrag): „TR-03171 Optisch verifizierbarer kryptographischer Schutz von Verwaltungsdokumenten (Digitale Siegel), Version 0.8". Keine Folge-Version Mai 2026 öffentlich publiziert. Domain-expert korrekt.

#### ZeSI mobile / Hamburg eWA — Daten-Verifikation

**Verifiziert** (Bundesdruckerei-Pressemitteilung + Hamburg-Case-Study, 2026-05-08):
- **Pressemitteilung-Datum**: **03.06.2025**.
- **App-Download-Verfügbarkeit**: seit **13.05.2025** in App Store / Google Play.

**Befund**: research-scout schreibt „13.05.2025" als Veröffentlichungs-Datum — das ist die *Download-Verfügbarkeit*, nicht das Pressemitteilungs-Datum. Domain-expert hat das nicht eindeutig spezifiziert. **Korrektur-Anweisung**: in Disclaimer-Copy + Research-Doc das Datum als „App seit 13.05.2025 verfügbar; Bundesdruckerei-Pressemitteilung 03.06.2025" formulieren — präzise statt einseitig.

**Hamburg-eWA-Kennzahlen verifiziert**:
- ~830 Anmeldungen/Tag (Schnitt) — bestätigt
- >350.000 kumuliert — bestätigt
- >2.500 Meldebehörden angeschlossen — bestätigt
- ~60 Mio. Einwohner abgedeckt — bestätigt (als *Reichweite*, nicht als *aktive Nutzer*; domain-expert korrekt nuanciert)
- ~80 % bundesweite Abdeckung — bestätigt
- **Rheinland-Pfalz + Schleswig-Holstein flächendeckend** — bestätigt

**Konsequenz**: research-scout-Aussagen sind **direkt belegt**. Domain-expert-Nuance „Reichweite ≠ aktive Nutzung" stimmt. Der Demo-Disclaimer sollte das spiegeln, sonst entsteht Zahlen-Marketing.

**Verdict**: Legal realism **PASS** — alle fünf load-bearing Normen verbatim verifiziert, eine Wortlaut-Korrektur § 87a Abs. 4 AO ist domain-expert-konform übernommen, eine Versions-Korrektur ARF v2.7.2 ist verbindlich.

### 3. Prior art — PASS mit Pattern-Übertragbarkeits-Befund

**Belegte Vorbilder (eigenständig verifiziert):**

- **DigiLocker (Indien)**: ~515 Mio Nutzer + ~9,43 Mrd. ausgestellte Dokumente (März 2025-Stand) + 2.131 Issuers + 2.611 Requesters. research-scout-Aussage „~570 Mio August 2025" ist plausible Hochrechnung aus dem März-2025-Stand — **akzeptabel** im Demo-Kontext, aber Loom-Skript sollte konservativ „über 500 Mio Nutzer" formulieren statt der Punkt-Schätzung. **Pattern-Übertragbarkeit**: hoch für (a) zeitbeschränkte Share-Links, (b) QR-Verifikation, (c) Issuer-Requester-Topologie. Niedrig für DE: DigiLocker basiert auf Aadhaar (zentrales 1,4-Mrd-Personenregister) — DE hat strukturell kein zentrales Bürger-Register, wir bauen über Wallet + Selective Disclosure ein **dezentrales** Pendant.

- **Estland Eesti-App** (Dezember 2024 launched, RIA): zeigt nicht *neue* digitale Dokumente, sondern *präsentiert sicher* Daten existierender Dokumente. Genau das richtige Mental-Model für unseren Tresor: **Aggregator + Forwarder, kein Aussteller**. Pattern-Übertragbarkeit hoch. Estland-Lehre-aus-CLAUDE.md ist hier *richtig angewendet*: das Pattern (eine zentrale Bürger-App, die Daten + Dokumente bündelt) ist übertragbar; die Implementierung (zentrales Personenregister) ist es nicht — domain-expert + research-scout halten sich an diese Linie.

- **Apple Wallet ID (USA)**: 14 US-Bundesstaaten + Puerto Rico, an >250 TSA-Flughäfen akzeptiert, Face/Touch-ID-Pflicht, Selective-Disclosure-Pattern (z. B. nur Birthdate). Pattern-Übertragbarkeit hoch für UX-Konventionen — aber USA hat *kein* eIDAS-Pendant, kein PID/PuB-EAA-Pflicht-Konzept. Demo darf das Pattern (Selective Disclosure, Biometrie-Bestätigung), nicht die Premise (Bundesstaat-DMV als Aussteller) übernehmen.

- **Singapur SingPass + MyInfo**: Selective-Disclosure-pro-Feld als UX-Konvention (Singpass-Pattern, in Demo-Design-Probe behandelt) — dreifach getestete UX-Konvention, in DE übertragbar. **Speziell die Per-Feld-Toggle-UX ist die richtige Wahl**, nicht nur Per-Attestation-Bundle (siehe Demo-Design-Probe unten).

- **Dänemark MitID + Digital Post**: rechtsverbindliche Multi-Plattform-Inbox mit synchronisierten Apps. Pattern (synchronisierter Posteingang) ist übertragbar; Premise (Pflicht-Inbox per Gesetz) ist es politisch nicht — der Demo-Tresor ist *opt-in*, nicht Pflicht.

- **Indien Aadhaar-Linked DigiLocker**: zeigt, dass ein staatlicher Dokumenten-Tresor bei *dramatisch* niedriger Smartphone-Penetration und multi-sprachiger Bevölkerung *trotzdem* Massen-Skalierung erreicht. Das schlägt das vermutete Adoption-Risiko in DE *unter* (DE hat höhere Smartphone-Penetration + besseres Internet) — der Tresor ist also **nicht** „zu komplex für die Bevölkerung". Adoption-Skepsis ist nicht das Hauptrisiko; **Beglaubigungs-Erwartung der Bürger:innen** ist es (siehe Risk-of-misleading unten).

**Whitespace-Bestätigung**: in DE Mai 2026 existiert kein consumer-facing Aggregator über mehrere Lebenslagen. ELSTER hat Bescheid-Speicher (180 Tage) + Aufbewahrungspflicht des Bürgers; BundID-ZBP ist *Eingangspostfach* ohne Tresor-Pattern; ZeSI ist *Verifikations-App*, nicht Speicher; Verimi ist Identitäts-Plattform, nicht Tresor. **Real white space**, nicht erfunden. **PASS**.

### 4. Demo impact — PASS mit präzisem Wow-Cut

Posteingang-Demo war 30-Sekunden-Wow „die App nimmt mir das Verstehen ab". Tresor-Demo ist 30-Sekunden-Wow **„meine Behörden-Schublade in einer App, mit Echtheits-Beweis"**.

**Vorgeschlagener Loom-Cut (für Demo-Architect-Awareness)**:

1. (5 s) Hero-Shot: Tresor-Übersicht mit ~12 Bescheiden, jeweils mit Authentizitäts-Badge (entweder „qeS gültig" oder „VDS verifiziert" oder „Speculative-2027"); Personalausweis + eAT + Steuerbescheid + Meldebestätigung + IHK-Bescheid + Krankenkassen-Bescheinigung + …
2. (8 s) Drill-down auf Meldebestätigung mit VDS-QR (Hamburg-eWA-Pattern): Mock-Verifikation „grün" mit Erklärung „BSI TR-03171 — produktiv-real seit 2025".
3. (10 s) Selective-Disclosure-Cascade: Vermieter-Mockup zeigt QR „Bitte teilen Sie nachname + age_over_18 + PLZ"; Bürger:in scannt mit Tresor-App, Wallet zeigt Datenminimierungs-Dialog („Diese Felder werden geteilt: …"; „Diese Felder *nicht*: vollständiges Geburtsdatum, Hausnummer, Aktenzeichen"), Bürger:in bestätigt mit PIN/Biometrie-Mock, Privacy-Cockpit loggt Empfänger + Rechtsbasis + Widerruf.
4. (5 s) Speculative-2027-Banner blendet ein: „Diese PuB-EAA-Cascade ist eine Vorschau — DE-Wallet öffentlich-startet Anfang 2027" — *vor* Closing-Frame.
5. (2 s) Closing: Tresor-Liste, „[MOCK]"-Watermark sichtbar.

**Wow-Plausibilität**: ja — der Selective-Disclosure-Moment ist *visuell* überraschend (Bürger:in teilt 3 Felder statt voller Adresse + Geburtsdatum), und das Privacy-Cockpit-Logging schließt den Datenschutz-Bogen. Das ist ein eigenständiges Wow neben Posteingang-Wow + Umzug-Wow — die drei Demos addieren, statt sich zu kannibalisieren.

**Generalisierungs-Test (horizontal capability, persona-agnostisch)**: Anna sieht Pass + eAT + ABH-Bescheid + Krankenkasse + Steuerbescheid + Hochschul-Urkunde; Schmidts sehen 2× PA + 2× Geburtsurkunde + Familienkasse + KFZ-Brief + Krankenkasse + Steuerbescheid; Mehmet sieht PA + Gewerbe-Anmeldung + IHK-Bescheid + Steuerbescheid + Steuer-IdNr. + Krankenkasse + DRV-Auskunft. **Jede Persona** nutzt den Tresor mit anderem Mix der ~21 Dokument-Typen — capability generalisiert sauber.

**Verbietet**: Tresor darf nicht persona-spezifisch aufgesplittet werden. Universal — und Wow ist die *Universalität* mit identischer Mechanik, anderem Inhalt.

### 5. Effort/value — PASS, V2-Disziplin verbindlich

Realistisch in <1 Woche Demo-Build:

- **`documents.json` Seed mit ~8–12 Dokumenten × 3 Personas-Filterung**: ~0,5 Tage. Domain-expert hat 21 Dokument-Typen + 12 Aktenzeichen-Formate + 5 Briefkopf-Standardphrasen vor-spezifiziert.
- **`<DocumentCard>` + `<DocumentDetail>` mit Authentizitäts-Badge (qeS / VDS / Speculative)**: ~1 Tag.
- **QR-Code-Mock-Generierung** (deterministische Hash-Visualisierung, kein produktiver Schlüssel): ~0,5 Tage. **Funktional vs. Konvention**: siehe Demo-Design-Probe #1.
- **Selective-Disclosure-UX (per-Feld-Toggle, Singpass-Pattern)**: ~1 Tag. Dies ist **die** anspruchsvollste Komponente.
- **Vermieter-Verifier-Mock** (Drittanbieter-View, der QR scannt + Selective-Disclosure-Bundle empfängt): ~0,5 Tage.
- **EUDI-Wallet-Export-Button + Mock-Issuance-Flow**: ~0,5 Tage.
- **Frist-Tracker pro Dokument** (Aktualitäts-Frist-Trugschluss-Pattern: „nicht älter als 6 Monate"-Hinweise): ~0,25 Tage. Wiederverwendung `<FristCountdown>` aus Umzug.
- **Verlust-Wegweiser pro Dokument-Typ** (Deep-Link Bürgeramt-Termin / Standesamt / BfJ-Online): ~0,5 Tage.
- **Disclaimer-Komponente** (4 verbindliche Disclaimer-Strings + 4 kontextspezifische Inline-Disclaimer): ~0,5 Tage.
- **i18n + a11y** parallel.

**Summe**: ~5–6 Tage Demo-Build, im 1-Wochen-Budget machbar.

**V2-Features (RAUS aus V1, Demo-Design-Probe-Begründung)**:

- **Drittanbieter-Verifizierung mit echter Browser-Camera** — V2. Browser-Kamera-Integration ist iOS/Android-fragmentiert; eine Mock-„Verifier-Person scannt"-Animation reicht für den Loom-Cut.
- **Cross-Persona-Familien-Tresor** (Familie-Schmidts gemeinsamer Pool) — V2. V1 ist Single-Persona-Tresor.
- **Voll-funktionale eIDAS-Trust-List-Validierung** (Adobe-Reader-Pattern) — V2. V1 zeigt Mock-Result „grün/rot".
- **Echte EUDI-Wallet-Anbindung** (an Reference-Implementation-Library) — V2 / unrealistisch ohne BMDS-Sandbox-Zugang. V1 ist Mock-Issuance-Flow.

### 6. Risk-of-misleading — MITIGATED durch Disclaimer + UI-Disziplin

Drei kritische Stellen, jeweils mit Mitigation:

#### 6a. „App suggeriert Beglaubigte Kopie"
**Risiko**: Bürger:innen erwarten von einer Tresor-App, dass sie „eine beglaubigte Kopie generiert" (häufiges Cliché). § 33 VwVfG ist hoheitlich.
**Mitigation**: domain-expert-Disclaimer #2 (`dokumente.disclaimer.beglaubigung_hoheitlich`) verbatim übernehmen. Kein „Premium"- oder „Coming-soon"-Banner. Kein Button, der den Eindruck einer eigenen Beglaubigung erwecken könnte. Stattdessen Deep-Link „Beglaubigte Kopie anfordern → Bürgeramt-Termin / Standesamt-Termin / Notar-App". **Zusätzlich** durch concept-verifier verschärft: jede Detail-Ansicht eines amtlich relevanten Dokuments muss am unteren Rand einen festen Text-Block tragen: „**Tresor ist Aggregator, kein Beglaubiger**. Für eine amtliche Beglaubigung wenden Sie sich an: [Behörde-X-Deep-Link] / [Notar-App-Deep-Link]."

#### 6b. „QR-Verifikation funktioniert produktiv"
**Risiko**: Bürger:in glaubt, der Mock-QR-Code sei mit echtem Bundesdruckerei-Schlüssel signiert. Bei Verifikation mit echter ZeSI-mobile-App würde *Treffer „unbekannt"* erscheinen — was widersprüchlich zur Demo wirkt.
**Mitigation**: domain-expert-Disclaimer #4 (`dokumente.disclaimer.qr_authenticity`) verbatim übernehmen. Zusätzlich: pro Dokument-Detail-View, *direkt unter* dem QR-Bild, ein erläuternder Mini-Disclaimer: „*Mock-Siegel — keine produktive Verifikation*. In der echten ZeSI mobile App würde dieser QR-Code „unbekannt" anzeigen." Das **demystifiziert das QR-Theater** und schützt vor späterer Reputations-Verärgerung („ich habe das mit ZeSI gescannt, das ist gar nicht echt").

#### 6c. „Selective Disclosure ist heute schon möglich"
**Risiko**: Demo zeigt PuB-EAA-Cascade, Bürger:in glaubt, das funktioniere heute schon zwischen Tresor-App und ABH/Standesamt/BZSt.
**Mitigation**: domain-expert-Disclaimer #3 (`dokumente.disclaimer.eudi_speculative`) verbatim übernehmen, **plus** prominenter Speculative-2027-Banner-Stil über jedem PuB-EAA-Workflow. **Zusätzlich** durch concept-verifier verschärft: vor jeder PuB-EAA-Demo *als interstitial Modal* (vor dem Klick „Wallet-Export starten") muss der Hinweis stehen: „**Vorschau 2027** — DE-Wallet ist Mai 2026 in Sandbox-Phase (BMDS / SPRIND); öffentlicher Stufe-1-Launch Anfang 2027. Diese Demo simuliert den Flow ohne produktiven PuB-EAA-Issuer."

**Gesamtbewertung**: bei strenger Befolgung der vier verbindlichen Disclaimer + drei concept-verifier-Verschärfungen ist das Misleading-Risiko *niedrig*. Ohne diese Disziplin ist es *hoch*. Spec muss die Verschärfungen explizit übernehmen.

## Adjudikation der 7 DISAGREEMENTS (5 + 2)

### DISAGREEMENT #1 — Beglaubigung-Hoheitlichkeit § 33 VwVfG
**Domain-expert-Position**: hartes Verbot.
**Concept-verifier-Adjudikation**: **bestätigt verbatim, plus zusätzliche UI-Härtung**. Wortlaut § 33 Abs. 1 + 3 + 4 VwVfG re-verifiziert; die App ist keine Behörde iSv § 1 Abs. 4 VwVfG, kein Bediensteter, kein Dienstsiegel. Ein Beglaubigungs-Versuch wäre rechtswidrig + verleitet Bürger:innen zur Vorlage einer formal mangelhaften Kopie → Risiko Antrags-Ablehnung mit Frist-Verlust.

**UX-Konsequenz (verschärft)**:
- Statt einer Beglaubigungs-Funktion zeigt der Tresor pro Dokument ein klares **„Beglaubigte Kopie anfordern"-CTA mit Aufklappung**, die genau drei Pfade nennt: (1) Bürgeramt-Termin (für Behörden-fremde Urkunden, § 33 Abs. 2 VwVfG), (2) Standesamt-Termin des Geburts-/Eheschließungsorts (für Personenstandsurkunden, § 55 PStG), (3) Notar-App der Bundesnotarkammer (§ 39a BeurkG, seit 29.12.2025 für eingeschränkte Anwendungsfälle).
- Kein Button, kein Tooltip, kein „Premium"- oder „Coming-soon"-Banner, der den Eindruck einer eigenen Beglaubigung erwecken könnte.
- Footer pro Detail-View: „**Tresor ist Aggregator, kein Beglaubiger.**"

### DISAGREEMENT #2 — VDS-QR auf jedem Mock-Dokument vs. nur produktiv-real
**Domain-expert-Position**: differenziert pro Dokument-Typ; zwei Authentizitäts-Badges („VDS" vs. „qeS").
**Concept-verifier-Adjudikation**: **bestätigt + Badge-Hierarchie verschärft**.

Das domain-expert-Pattern ist UX-mäßig richtig, aber muss in der Implementierung **drei** statt **zwei** Badge-Stufen tragen, sonst verwischt sich Speculative-2027 mit Heute-Real:

| Badge-Stufe | Status | Visuelles Signal | Beispiel-Dokument |
|---|---|---|---|
| **A — Live** | produktiv-real Mai 2026 | grünes Authentizitäts-Logo + „VDS prüfbar mit ZeSI mobile" oder „qeS gültig — eIDAS" | Hamburg-eWA-Meldebestätigung (VDS), Mein-ELSTER-Steuerbescheid (qeS), BfJ-Führungszeugnis (qeS) |
| **B — Pilot** | regional verfügbar / im Roll-out | gelbes Authentizitäts-Logo + „Live-Pilot in [Bundesland]" | RP- + SH-eWA-Meldebestätigung (VDS flächendeckend), Berlin-/München-Meldebestätigung (Pilot, nicht flächendeckend Mai 2026) |
| **C — Speculative 2027** | nicht-produktiv heute, Vorschau | graues Authentizitäts-Logo + Speculative-Banner | Geburts-/Eheurkunde-VDS, ABH-Bescheid-VDS, Krankenkassen-Bescheinigung-VDS |

**Begründung der Verschärfung**: domain-expert hatte „VDS-Real-Status pro Dokument-Typ" aber binäre „real / speculative"-Trennung. Das **B-Pilot-Stufe** ist load-bearing, weil Bundesland-Heterogenität der Mai-2026-Realität in DE zentral ist (RP + SH flächendeckend, andere Länder Pilot oder nicht-flächendeckend). Die UI muss diese Bundesland-spezifische Realität spiegeln, sonst entstehen Pauschal-Aussagen ("VDS funktioniert in DE"), die in NRW oder Bayern noch nicht stimmen.

**Konsequenz für die Spec**: Badge-Komponente `<AuthenticityBadge variant="live" | "pilot" | "speculative">` mit deterministischer Logic pro Dokument-Typ × Bundesland.

### DISAGREEMENT #3 — PuB-EAA Live-Status DE Mai 2026
**Domain-expert-Position**: Sandbox-Phase, jeder Wallet-Workflow Speculative-2027-Banner.
**Concept-verifier-Adjudikation**: **bestätigt mit höherer Strenge**.

BMDS-Pressemitteilung + biometricupdate.com + lissi.id: DE-EUDI-Wallet ist Mai 2026 in **Sandbox**, Stufe-1-Public-Launch **Anfang 2027** geplant. Kein produktiver PuB-EAA-Issuer in DE öffentlich publiziert (BMI-Blueprint-Repo bestätigt: „QEAA Issuance and Presentation" als Konzept-Dokument, nicht als Live-Issuer-Liste). POTENTIAL-LSP-DE-Beteiligung am Government-Use-Case (PID + mDL) bestätigt, aber kein produktives PuB-EAA-Roll-out an Bürger:innen.

**UX-Konsequenz (verschärft)**:
- Jeder PuB-EAA-Workflow trägt ein **interstitial Modal** vor Klick „Wallet-Export starten": „**Vorschau 2027** — DE-Wallet ist Mai 2026 in Sandbox-Phase (BMDS / SPRIND); öffentlicher Stufe-1-Launch Anfang 2027. Diese Demo simuliert den Flow ohne produktiven PuB-EAA-Issuer."
- Der `dokumente.disclaimer.eudi_speculative`-Banner muss am Kopf jedes EUDI-Modul-Screens stehen (sticky banner, nicht expandable).
- **Verbot**: keine Behauptungen wie „so funktioniert das schon heute" oder „Ihre ABH stellt PuB-EAA aus". Alle Aussteller-Bezeichnungen in PuB-EAA-Mock sind mit `[MOCK]` zu markieren.

### DISAGREEMENT #4 — Standalone-Vault vs. Modul innerhalb DeutschlandID
**Domain-expert-Position**: Standalone in Demo + 2027-Modul-Vision in Architektur-Doku.
**Concept-verifier-Adjudikation**: **bestätigt, mit präziserer politisch-strategischer Begründung**.

Ich stimme domain-expert zu — *aber* die Begründung muss in der Architektur-Doku noch präziser werden:

1. **Politisch-strategisch**: ein Modul innerhalb DeutschlandID/BundID ist das realistische 2027-Zielbild. eGov-MONITOR 2025: 25 % eID-Nutzung, App-Müdigkeit dokumentiert. Eine vierte Stand-alone-App birgt Adoption-Risiko.
2. **Demo-strategisch**: Standalone besser, weil (a) End-to-End-Erlebnis isoliert vom heutigen BundID-Funktionsstand zeigbar; (b) Konzept-Demo-Format ist „so könnte das Zusammenspiel aussehen", nicht Produkt-Empfehlung an BMDS; (c) Architektur-Doku benennt Re-Integration in BundID/DeutschlandID als 2027-Ziel.
3. **Strategie-Linguistik**: die Demo positioniert sich als „**Bürger-zentrische Schicht über DeutschlandID + BundID-ZBP + EUDI-Wallet**", nicht als vierter Player. UI zeigt prominent eine „Verbunden mit DeutschlandID"-Statuszeile (mock, mit Disclaimer). Konsistent mit Estland-Eesti-App-Pattern.
4. **Zusätzliche concept-verifier-Verschärfung**: in der Footer-Zeile jedes Tresor-Screens muss eine kleine Zeile stehen: „[MOCK] Konzept-Demo — nicht angeschlossen an produktives BundID/DeutschlandID/EUDI-Wallet."

### DISAGREEMENT #5 — Cloud-Backup für Art. 9-Inhalte
**Domain-expert-Position**: localStorage-only Demo, 2027-E2E-Vision im Architektur-Text, NICHT in UI.
**Concept-verifier-Adjudikation**: **bestätigt + UI-Verbot verbindlich**.

Re-verifiziert: Tresor-Inhalte sind typische Art.-9-DSGVO-Daten — Religion (Kirchensteuer + KiStAM), Sozialdaten (§ 67 SGB X — Bürgergeld + Wohngeld + ALG), indirekte rassisch/ethnische Daten (eAT), Gesundheitsdaten (Reha + AU + Krankenkassen-Beitrags-Anpassung). Cloud-Speicherung erfordert (a) ausdrückliche Einwilligung Art. 9 Abs. 2 lit. a, (b) AVV Art. 28, (c) Drittland-Transfer-SCC + TIA, (d) BSI-TR-02102-1-Verschlüsselung mit Bürger-Schlüssel-Hoheit, (e) AI-Act-Risiko-Klassifizierung.

**Konsequenz (verbindlich)**:
- **localStorage-only** in V1-Demo. Kein Cloud-Sync, kein Backup-Hinweis, kein „Cloud-Backup einrichten"-Button. Nicht einmal ein „Coming-soon"-Banner.
- **Architektur-Doku** (`docs/architecture.md`) darf die 2027-Vision als Text benennen: „E2E-verschlüsseltes Cloud-Backup mit Hardware-Backed-Key-Management (Secure Enclave / StrongBox) nach BSI TR-02102-1; Schlüssel-Recovery via Social Recovery oder eID-PIN-Reset". Aber **nicht** in der UI sichtbar.
- **Inline-Disclaimer beim Hinzufügen sensibler Dokumente**: vor dem Hinzufügen eines Bescheids mit Kirchensteuer / Sozialdaten / eAT / Gesundheitsdaten zeigt der Tresor einen Modal: „Sie fügen ein Dokument mit besonderen Datenkategorien (Art. 9 DSGVO) hinzu. **Diese Daten bleiben lokal auf Ihrem Gerät.** Kein Cloud-Sync."

### DISAGREEMENT #6 (NEU) — ARF-Format-Mandat-Beleg-Pfad
**Domain-expert-Position**: Pflicht wandert von ARF in Implementing Regulations CIRs.
**Concept-verifier-Adjudikation**: **bestätigt, mit zusätzlicher Versions-Korrektur**.

Re-verifiziert (eu-digital-identity-wallet.github.io 2.7.3-Build, fetched 2026-05-08): die ARF v2.7.x „**supports**" mDoc + SD-JWT VC + W3C VC, formuliert sie aber **nicht** als „Pflicht-Format" für PID + (Q)EAAs. Die Pflicht ergibt sich aus den **Commission Implementing Regulations** (CIR 2024/2980 für Wallet, CIR 2024/2977 für PID-Attribute, sowie nachfolgende CIRs Q3+Q4 2025 für Format-Profile). LSP-Praxis-Konsens (POTENTIAL/EWC/NOBID/DC4EU): mDoc + SD-JWT VC sind für PID + (Q)EAAs faktisch gesetzt; W3C VC für non-qualified EAAs.

**Sachverhalts-Korrektur ARF-Version**: research-scout + domain-expert beide schreiben „v2.6.0". **Aktuelle Version Mai 2026 ist v2.7.2 (mit v2.7.3-Build)**. Das ist eine 1-2-Minor-Versions-Drift, die in allen Disclaimer-Strings + Quellen-URLs + Architektur-Doku einheitlich aktualisiert werden muss. Substanz unverändert (vier Attestation-Typen, Format-Repertoire), aber Demo-Realismus erfordert die Korrektur, sonst entsteht der Eindruck, das Team habe veraltete Quellen genutzt.

**Demo-Wording (verbindlich)**:
- statt „mandatiert in ARF v2.6.0" → „**Format-Pflicht für PID + (Q)EAAs ergibt sich aus CIR 2024/2980 + den Format-Profile-CIRs Q3/Q4 2025; ARF v2.7.2 (eudi.dev/2.7.2) unterstützt mDoc + SD-JWT VC + W3C VC technisch**".
- Quellen-URL: `https://eu-digital-identity-wallet.github.io/eudi-doc-architecture-and-reference-framework/2.7.3/architecture-and-reference-framework-main/` (statt 2.6.0).
- Disclaimer #3 (`dokumente.disclaimer.eudi_speculative`) anpassen: „EU-Verordnung 2024/1183 (eIDAS 2) verpflichtet Mitgliedstaaten, **bis zum 31.12.2026** mindestens eine EUDI-Wallet bereitzustellen; private Diensteanbieter (Banken, Plattformen) müssen sie ab Ende 2027 akzeptieren." (unverändert; nur ARF-Versions-Bezug außerhalb).

### DISAGREEMENT #7 (NEU) — Aussteller (Behörde) vs. Hersteller (Bundesdruckerei) UI-Trennung
**Domain-expert-Position**: präzise Differenzierung in UI; pro-Dokument-Badge.
**Concept-verifier-Adjudikation**: **bestätigt + Footer-Hinweis ergänzend, nicht ersetzend**.

Bei PA / Reisepass / eAT / KFZ-Bescheinigung Teil I+II ist die **Bundesdruckerei** Hersteller, **nicht** Aussteller iSv eIDAS 2 Art. 3 Nr. 46 / authentic source. Aussteller (= Behörde, die den Verwaltungsakt erlässt) bleibt Bürgeramt / ABH / KFZ-Zulassungsstelle. domain-expert benennt das in der Tabelle korrekt + verlangt UI-Klarheit; concept-verifier verschärft zur Doppel-Mechanik:

**UX-Konsequenz**:
- **Pro-Dokument-Detail-View**: zwei klar getrennte Felder, beide sichtbar:
  - „**Aussteller:** Bürgeramt Berlin Mitte" (Verwaltungsakt-Erlasser, Aktenzeichen-Träger)
  - „**Hersteller (technische Produktion):** Bundesdruckerei GmbH" (nur bei PA / Pass / eAT / KFZ-Brief)
- **Footer-Hinweis pro Tresor-Liste** zusätzlich (nicht ersetzend): „Dokumente, deren technische Produktion durch die Bundesdruckerei erfolgt, sind mit einem Produktions-Badge gekennzeichnet. Aussteller bleibt rechtlich die jeweilige Behörde."

**Begründung der Doppel-Mechanik**: nur Footer reicht nicht, weil viele Bürger:innen die Liste querscrollen und Detail nicht öffnen. Nur Badge reicht nicht, weil die Wortwahl „Hersteller vs. Aussteller" für Bürger:innen ungewohnt ist und einer Erklärung bedarf. Beide kombinieren = robust.

## Probe der Demo-Design-Fragen

### Probe #1: QR-Verifikation funktional vs. Konvention
**Adversariale Challenge**: SOLL die Demo die Browser-Kamera tatsächlich anschalten + den QR scannen + Mock-Result zeigen, oder reicht eine animierte Konvention?

**Adjudikation**: **Konvention, nicht Browser-Kamera**.

Begründung:
1. **Browser-Kamera-Fragmentierung**: WebRTC `getUserMedia()` + `BarcodeDetector` API ist iOS-Safari-fragmentiert (nur seit iOS 17, mit Quirks); Mobile-Demo via Loom-Recording wäre instabil.
2. **Demo-Wow funktioniert ohne Funktionalität**: der Wow-Moment ist „Verifier scannt → grün". Eine animierte „Scan-Linie wandert über QR + grünes Häkchen blinkt nach 1,5 s" ist visuell *gleichwertig* zur echten Kamera, aber 100× zuverlässiger im Loom.
3. **Misleading-Risiko bei echter Kamera**: wenn Bürger:in eine echte ZeSI-mobile-App-Verifikation versucht, schlägt sie fehl (Mock-Schlüssel ≠ echte Bundesdruckerei-Trust-Liste). Die Konvention vermeidet diese Konfusion komplett.

**Spec-Anweisung**: `<QRVerifyAnimation>` Komponente mit deterministischem Mock-Result (immer „grün" für `[MOCK]`-Dokumente; ein „rot"-Pfad nur in einem Demo-Easter-Egg, das eine *manipulierte* Mock-Variante zeigt zur Risiko-Aufklärung).

### Probe #2: EUDI-Wallet-Export-Button — was simuliert er genau?
**Adversariale Challenge**: ein „Export an Wallet"-Button kann viel oder wenig simulieren. Was ist die richtige Simulationstiefe?

**Adjudikation**: **3-Schritt-Simulation, OpenID4VCI-Pattern**.

Pattern aus EUDI-LSP-Demos (POTENTIAL + EWC):

1. **Schritt 1 — Tresor-Seite**: Bürger:in klickt „An EUDI-Wallet exportieren" auf einem Dokument-Detail-View → Modal öffnet: „Sie exportieren als PuB-EAA-Attestation. Speculative-2027-Disclaimer."
2. **Schritt 2 — Wallet-Mock-Seite (separater Subroute oder Modal)**: simulierte EUDI-Wallet-Oberfläche (Mock-Wallet-Brand: „Deutsche EUDI-Wallet [MOCK]"); zeigt eingehende Issuance-Anfrage, Bürger:in bestätigt mit PIN-Mock (4-stellig).
3. **Schritt 3 — Privacy-Cockpit-Log**: nach Erfolg landet ein Eintrag im `/datenschutz`-Log: „PuB-EAA „Aufenthaltsstatus" ausgestellt von [MOCK ABH Berlin Mitte] an [MOCK Deutsche EUDI-Wallet] am [Datum] [Uhrzeit]."

**Begründung Tiefe**: 3 Schritte simulieren die Realität (OID4VCI-Issuance + PIN-Bestätigung + Audit-Log), ohne Komplexität für Demo-Bauer (ein Modal, ein Mock-Wallet-Screen, ein Log-Eintrag). Verifier-seitige Präsentation (`OpenID4VP` aka OID4VP) ist V2.

### Probe #3: Drittanbieter-Verifizierung (Vermieter scannt) — V1 oder V2?
**Adversariale Challenge**: ein Vermieter-Mock-View, der QR scannt + Selective-Disclosure-Bundle empfängt — Demo-Komplexität signifikant höher.

**Adjudikation**: **V1 — als statischer Vermieter-Verifier-Mock-Screen, ohne echte QR-Scan-Funktion**.

Begründung:
- Der Selective-Disclosure-Wow-Moment **braucht** den Vermieter-Sicht, sonst ist der Datenminimierungs-Effekt unsichtbar.
- Aber: V1-Implementierung ist statisch — Vermieter-View ist eine separate Subroute (`/verifier-demo`), die einen Mock-QR zeigt mit Anforderungs-Liste („nachname + age_over_18 + PLZ"); Bürger:in „klickt" auf den QR (Tresor-App-Simulation), Wallet-Modal öffnet, Bürger:in bestätigt, Vermieter-View bekommt Mock-Result eingeblendet („✓ verifiziert: nachname=Müller, age_over_18=true, PLZ=10115").
- Echter QR-Camera-Scan ist V2 (siehe Probe #1).

**Spec-Anweisung**: separate Subroute `/verifier-demo` mit deterministischem Demo-Flow; Verifier-Branding generisch („[MOCK] ImmoScout24-Vermittler"); kein Echt-QR-Scan, statt dessen „Klicken statt Scannen"-Konvention.

### Probe #4: Selective-Disclosure-UX — pro Feld vs. pro Bundle?
**Adversariale Challenge**: pro-Feld-Toggle (Singpass-Pattern) ist UX-aufwändig; pro-Bundle ist einfach, aber zeigt den Datenminimierungs-Effekt schwächer.

**Adjudikation**: **pro-Feld-Toggle (Singpass-Pattern)**.

Begründung:
1. **Wow-Moment**: das *Visuelle* der Datenminimierung ist die Kraft der Demo. Pro-Feld-Toggle macht jeden Datenpunkt einzeln sichtbar — Bürger:in sieht „Geburtsdatum: nicht teilen → age_over_18: ja teilen". Das ist der eIDAS-2-Privacy-by-Design-Beweis. Pro-Bundle würde das verwischen.
2. **Realität EUDI**: SD-JWT VC mit Salted-Hash-Disclosures arbeitet pro-Feld; pro-Bundle wäre eine Vergröberung.
3. **Effort**: ~1 Tag Implementierung mit shadcn-Switch + Animation. Im 1-Wochen-Budget.

**Spec-Anweisung**: `<SelectiveDisclosureSheet>` Komponente mit per-Feld-Switches; Default-State zeigt die Verifier-Anforderung als „angefordert: ja", Bürger:in kann einzeln deaktivieren (mit Hinweis auf konsequente Verifier-Ablehnung bei Pflichtfeldern).

### Probe #5: Wo lebt das Document-Wallet im Navigations-Baum?
**Adversariale Challenge**: oben-Level-Tab vs. Sub-Tab unter Stammdaten — Information-Architecture-Frage.

**Adjudikation**: **oben-Level-Tab `/dokumente`**.

Begründung:
1. **Mental-Model**: Bürger:innen denken „meine Dokumente" als eigene Kategorie, nicht als Sub-Property von Stammdaten. Stammdaten = wer ich bin (Name, Adresse); Dokumente = was ich nachweisen kann.
2. **Lebenslagen-Übergreifend**: Tresor wird aus mehreren Vorgängen + Posteingang befüllt. Sub-Tab unter einem einzelnen Bereich würde verstecken.
3. **CLAUDE.md-Alignment**: die Folder-Struktur in CLAUDE.md zeigt `src/app/(app)/dokumente/` als oben-Level-Route — bereits architektonisch festgelegt.

**Spec-Anweisung**: `/dokumente` als oben-Level-Sidebar-Eintrag, mit Sub-Routen `/dokumente` (Liste), `/dokumente/[id]` (Detail), `/dokumente/eudi-export` (Wallet-Export-Flow), `/dokumente/verifier-demo` (Drittanbieter-Mock).

### Probe #6: Aussteller-vs-Hersteller-Trennung in UI
**Adjudikation**: bereits in DISAGREEMENT #7 oben behandelt — **Doppel-Mechanik (pro-Dokument-Felder + Footer-Hinweis)**.

## If PROCEED → Flags für product-architect (verbindliche Auflagen)

### A. Verbindliche Disclaimer (4 Strings, verbatim aus `docs/domain/dokumente.md`)
- `dokumente.disclaimer.demo_synthetic` — global Banner auf jedem Tresor-Screen
- `dokumente.disclaimer.beglaubigung_hoheitlich` — Modal vor jedem CTA, der Beglaubigung suggerieren könnte
- `dokumente.disclaimer.eudi_speculative` — Sticky-Banner über jedem EUDI-Modul-Screen
- `dokumente.disclaimer.qr_authenticity` — Mini-Disclaimer unter jedem QR-Bild im Detail-View

### B. Verbindliche Inline-Disclaimer (4 Stück)
- vor qeS-Verifikation eines Behörden-PDF
- vor PuB-EAA-Export an Vermieter
- vor Frist-Erinnerung
- vor Löschen aus dem Tresor (Hinweis: löscht nur lokal, nicht beim Aussteller)

### C. Verbindliche Versions-Korrekturen
- ARF-Version durchgängig auf **v2.7.2** (Quellen-URL `eudi.dev/2.7.2/...` oder `2.7.3/...`) statt v2.6.0
- ZeSI-Datum präzise als „App-Download seit 13.05.2025; Bundesdruckerei-Pressemitteilung 03.06.2025"
- DigiLocker-Statistik konservativ als „über 500 Mio Nutzer (März 2025)" statt der hochgerechneten 570-Mio-Punkt-Schätzung

### D. Verbindliche UX-Komponenten
- `<AuthenticityBadge variant="live" | "pilot" | "speculative">` — drei-Stufen-Badge pro Dokument-Typ
- `<QRVerifyAnimation>` — deterministisches Mock-Result, kein echter Browser-Camera-Scan
- `<SelectiveDisclosureSheet>` — per-Feld-Toggle, Singpass-Pattern
- `<AusstellerHerstellerFields>` — Doppel-Feld in Detail-View (nur bei Bundesdruckerei-produzierten Dokumenten)
- `<MockWalletScreen>` — separate Subroute für EUDI-Export-Simulation
- `<VerifierDemoScreen>` — separate Subroute für Drittanbieter-Mock
- `<DocumentLossWizard>` — Verlust-Wegweiser pro Dokument-Typ (Deep-Links)
- `<RetentionCountdown>` — persona-spezifischer Countdown nach § 147 Abs. 3 AO (nur Mehmet 10/8/6 Jahre; Anna + Schmidt 6-Jahres-Empfehlung)

### E. Verbindliche Daten-Architektur
- **localStorage-only** in V1; kein Cloud-Sync, kein Backup-Hinweis, kein „Coming-soon"-Banner
- **Persona-Filterung der ~21 Dokument-Typen** strikt nach domain-doc-Tabelle (Anna ohne PA, mit Pass + eAT; Schmidts mit 2× PA + 2× Geburtsurkunde + Familienkasse + KFZ; Mehmet mit Gewerbe + IHK + DRV + Steuer-IdNr.)
- **`[MOCK]`-Watermark** sichtbar im Aktenzeichen + Banner-Zeile am oberen Rand jedes Detail-View
- **Aktenzeichen-Formate** strikt nach domain-doc-Tabelle (12 Formate)
- **Briefkopf-Standardphrasen** verbatim aus domain-doc

### F. Verbindliche Scope-Disziplin
- **V1-IN-Scope**: 8–12 Dokumente × 3 Personas, AuthenticityBadge × 3 Stufen, QR-Verify-Konvention, EUDI-Export-3-Schritt-Simulation, Selective-Disclosure-per-Feld-Toggle, Verifier-Demo-Mock-Screen, Verlust-Wegweiser, Retention-Countdown, 4 Disclaimer + 4 Inline-Disclaimer
- **V1-OUT-of-Scope (V2)**: echter Browser-Camera-QR-Scan, Cross-Persona-Familien-Tresor, voll-funktionale eIDAS-Trust-List-Validierung, echte EUDI-Wallet-Anbindung, Cloud-Backup, Bürger-zu-Behörde-Versand
- **Nicht-Verhandelbar (RAUS)**: jede Beglaubigungs-Funktion, jeder Auto-Versand-Flow, jede Behauptung produktiver Behörden-Anbindung, jede Pseudonymität-Andeutung im Anbringen einer eigenen qeS

### G. Verbindliche Architektur-Doku-Ergänzungen
- 2027-Modul-Vision: „Tresor als Schicht über DeutschlandID + BundID-ZBP + EUDI-Wallet"
- 2027-Cloud-Backup-Vision: „E2E-verschlüsselt, Hardware-Backed-Keystore, BSI TR-02102-1, Bürger-Schlüssel-Hoheit"
- Datenfluss-Diagramm: localStorage → Mock-API → Mock-Wallet → Verifier-Demo
- Sicherheits-Note: „Mock-Demo, nicht produktiv. Bei produktiver Implementierung wären folgende Härtungen nötig: …"

### H. i18n-Reihenfolge
- DE als Source-of-Truth (de.json)
- Sekundäre Sprachen: EN, RU, UK, AR, TR (CLAUDE.md-Reihenfolge)
- Disclaimer-Strings sind besonders prüfungsrelevant — i18n-localizer-Flag: rechtsverbindliche Wortwahl prüfen, nicht nur sprachlich

### I. a11y-Auflagen
- VDS-QR-Bilder müssen `alt`-Text mit Authentizitäts-Status tragen („VDS-Siegel — verifiziert grün — BSI TR-03171")
- Selective-Disclosure-Toggles müssen Screen-Reader-konform sein (`aria-pressed`, `aria-describedby` mit Privacy-Hinweis)
- Speculative-2027-Banner müssen prominent sichtbar + nicht-dismissable für Screen-Reader (sticky)
- Color-Contrast: drei Badge-Stufen (grün/gelb/grau) müssen WCAG 2.1 AA + auch für Farbschwache erkennbar sein (Icon + Text, nicht nur Farbe)

## Reviewer notes

- **Stärkster Punkt** der Recherche+Domain-Pipeline: die rechtsdogmatische Sauberkeit der § 33 VwVfG-Hoheitlichkeit + § 87a Abs. 4 AO-Vier-Pfade-Korrektur + § 147 AO-Persona-Differenzierung. Das ist *exakt* das Niveau, das ein DigitalService-DE-Reviewer beim ersten Vorzeigen erwarten würde — und es übersteht eine ehrliche Wortlaut-Prüfung.

- **Schwächster Punkt** (vor concept-verifier-Korrektur): die ARF-Versions-Drift v2.6.0 → v2.7.x. Beide Vorgänger-Agenten haben das übersehen. Wenn die Demo eine eudi.dev/2.6.0-URL zitiert und ein Stakeholder das öffnet, sieht er einen 404 oder eine deprecated-Version-Warnung. Das wäre ein vermeidbarer Glaubwürdigkeitsverlust. **Korrektur ist Pflicht für Spec**.

- **Demo-Risiko-Hierarchie** (von hoch zu niedrig):
  1. Beglaubigungs-Erwartung der Bürger:innen wird durch UI geweckt → Antrags-Ablehnung mit Frist-Verlust = harte Schaden-Quelle
  2. Mock-QR wird mit echter ZeSI-mobile-App gescannt → "unbekannt" = Glaubwürdigkeits-Schaden
  3. Selective-Disclosure-Demo wird als heute-möglich missverstanden → BMDS-Stakeholder-Verärgerung = Reputations-Schaden
  4. Aussteller/Hersteller-Verwischung → unscharfe Kommunikation = milder Realismus-Schaden
  5. ARF-Versions-Drift → veraltet wirkende Quellen = milder Realismus-Schaden

- **Kein Über-stamping**: ich habe die research-scout-Aussage „App generiert KEINE beglaubigte Kopie" bestätigt verbatim, und die domain-expert-Position „§ 87a Abs. 4 AO drei Pfade statt qeS-Allein" auch verbatim — *weil* die Wortlaute es so zeigen. Wenn der Wortlaut anders gewesen wäre, hätte ich gegen sie geurteilt. Der Verdict-Pass ist nicht *politische* Konsens-Leistung, sondern *empirisch* abgeleitet aus den re-verifizierten Quellen.

- **Pipeline-Befund** für künftige Vorgänge: research-scout + domain-expert + concept-verifier-Triade hat in diesem Capability-Pass besonders gut gearbeitet. Domain-expert hat zwei research-scout-Schwächen substanziell verbessert (qeS-Allein → Vier-Pfade; VDS-Pauschal → Pro-Bundesland-Differenzierung). Concept-verifier hat zwei domain-expert-Schwächen substanziell verbessert (ARF v2.6.0 → v2.7.x; Badge-Binär → Drei-Stufen-Live/Pilot/Speculative). **Drei-Augen-Prinzip funktioniert** — keine Eskalation an User nötig.

- **Hand-off**: spec ist freigegeben. product-architect kann mit dem Auflagen-Set unter „If PROCEED" beginnen. Frontend-coder + mock-backend-coder + assistant-engineer können parallel angesetzt werden, nachdem product-architect die spec-Datei `docs/specs/dokumente.md` geschrieben hat. i18n-localizer + a11y-tester müssen die Disclaimer-Strings vor Code-Reviewer-Pass prüfen.
