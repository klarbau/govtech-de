---
vorgang: fuehrerschein-kfz
title: Stammdaten V1.1 — Mobilität-Sektion (Führerschein + KFZ-Halter)
last_validated: 2026-05-10
upstream-from: docs/research/2026-05-10-fuehrerschein-kfz.md (status: research-pending-domain-validation)
verdict: VALIDATED-with-revisions
sources:
  - https://www.gesetze-im-internet.de/stvg/__28.html        # § 28 StVG — FAER (Fahreignungsregister beim KBA)
  - https://www.gesetze-im-internet.de/stvg/__29.html        # § 29 StVG — Tilgungsfristen FAER (2,5 / 5 / 10 Jahre)
  - https://www.gesetze-im-internet.de/stvg/__30.html        # § 30 StVG Abs. 8 — Selbstauskunft FAER unentgeltlich, schriftlich/elektronisch
  - https://www.gesetze-im-internet.de/stvg/__30a.html       # § 30a StVG — Automatisierter Abruf FAER, Logging
  - https://www.gesetze-im-internet.de/stvg/__32.html        # § 32 StVG — Zweckbestimmung der Fahrzeugregister
  - https://www.gesetze-im-internet.de/stvg/__35.html        # § 35 StVG — Übermittlung Fahrzeug-/Halterdaten an Behörden, Versicherer, Hersteller
  - https://www.gesetze-im-internet.de/stvg/__48.html        # § 48 StVG — Örtliches FE-Register + ZFER beim KBA
  - https://www.gesetze-im-internet.de/stvg/__65.html        # § 65 StVG — Übergangsbestimmungen ZFER (Datenmigration aus örtlichen Registern)
  - https://www.gesetze-im-internet.de/stvg/__4.html         # § 4 StVG — Fahreignungs-Bewertungssystem (1-2-3-Punkte, Maßnahmenstufen)
  - https://www.gesetze-im-internet.de/fev_2010/__73.html    # § 73 FeV — Zuständigkeit untere Verwaltungsbehörde
  - https://www.gesetze-im-internet.de/fev_2010/__47.html    # § 47 FeV — Verfahren bei Entziehung / Aushändigung FE
  - https://www.gesetze-im-internet.de/fzv_2023/__15.html    # § 15 FZV (2023) — Mitteilungspflichten bei Änderungen ("unverzüglich")
  - https://www.gesetze-im-internet.de/fzv_2023/__57.html    # § 57 FZV (2023) — Erhebung + Speicherung Fahrzeugdaten ZFZR
  - https://www.bussgeldkatalog.net/fahrzeug-zulassungsverordnung/mitteilungspflicht/  # § 15 FZV Verwarnungsgeld 40 € + 4-Wochen-Eskalation
  - https://www.kba.de/DE/Themen/ZentraleRegister/FAER/Auskunft/online.html  # FAER Online-Selbstauskunft gebührenfrei via eID
  - https://www.kba.de/DE/Themen/ZentraleRegister/FAER/Auskunft/faer_auskunft_inhalt.html
  - https://www.kba.de/DE/Themen/ZentraleRegister/Digitale_Fahrzeugzulassung/digitale_fahrzeugzulassung_node.html
  - https://eur-lex.europa.eu/eli/dir/2025/2205/oj/eng       # RL (EU) 2025/2205 — neue FE-Direktive, OJ 05.11.2025
  - https://transport.ec.europa.eu/news-events/news/modernised-eu-rules-driving-licences-and-driving-disqualifications-enter-force-2025-11-25_en
  - https://www.bundesregierung.de/breg-de/aktuelles/digitaler-fuehrerschein-2392320  # Bundestag-Beschluss digitaler Führerschein 26.03.2026
  - https://www.bundesregierung.de/breg-de/aktuelles/fahrzeugschein-digital-2392706
  - https://eu-digital-identity-wallet.github.io/eudi-doc-architecture-and-reference-framework/2.4.0/architecture-and-reference-framework-main/
  - https://www.bundesregierung.de/breg-de/aktuelles/faq-fuehrerschein-umtausch-1842574  # Pflichtumtausch-Stichtage
  - https://www.adac.de/verkehr/rund-um-den-fuehrerschein/aktuelles/fristen-fuehrerschein-umtausch/
  - https://ozg.sachsen-anhalt.de/news-detail/neuer-status-fokusleistung-fuehrerschein  # OZG-Anschlussstand Fahrerlaubnisbehörden
---

> **Geltungsbereich**: Validation der Research-Scout-Vorlage `docs/research/2026-05-10-fuehrerschein-kfz.md` für die geplante Stammdaten V1.1 — Mobilität-Sektion (Führerschein + KFZ-Halter) inkl. mDL-Wallet-Subtab und Anschluss an den bestehenden Umzug-Autopilot Block-D. Diese Capability bleibt eine **Lese- und Wegweiser-Schicht** im Sinne von `docs/domain/stammdaten.md` § "Hinweis zum Geltungsbereich"; sie nimmt keine Schreib-Operationen in fremde Register vor und stellt keine Anbindung an ZFER/FAER/ZFZR/i-Kfz/EUDI-Wallet her.

## Verdict

**VALIDATED-with-revisions.** Die zentralen Aussagen der Research-Vorlage sind belastbar — drei Register beim KBA, kommunale Fahrerlaubnisbehörde, on-demand-FAER-Auskunft mit eID, § 15 FZV-Mitteilungspflicht, EU-mDL-Spannungsfeld. **Zwingend zu korrigieren** sind sechs Norm-Zitate (§ 47 FeV, § 32/33/13 FZV, „§ 32 FZV-Zweck", „H2 2028 Pflicht-Anwendung mDL"), eine numerische Behauptung (7-Tage-Frist) und eine Datums-Zuordnung der EU-Direktive. Hard-Lines aus V1 (Read-Only, Speculative-Disclaimer, Art-9-Behandlung) übertragen sich vollständig — drei zusätzliche Hard-Lines kommen hinzu (FAER-Aktive-Maßnahmen, FIN-Masking, Block-D-Sichtbarmachung-ohne-Auto-Push).

## Korrigierte Norm-Zitate (HARD — pflichtmäßig in Spec / UI / Disclaimer zu übernehmen)

| # | Research-Scout-Zitat | Status | Korrekt | Quelle |
|---|---|---|---|---|
| K1 | „§ 47 FeV (ZFER)" | **falsch** | ZFER-Rechtsgrundlage ist **§ 48 Abs. 2 StVG** (Bestand des KBA-Registers) i. V. m. **§§ 48-65 StVG** und der FeV-Anlagen. § 47 FeV regelt das Verfahren bei Entziehung/Aushändigung der FE — nicht das Register selbst. | gesetze-im-internet.de § 48 StVG; § 47 FeV |
| K2 | „§ 28 StVG (FAER)" | **bestätigt** | Korrekt. FAER beim KBA, Inhalt + Zweckbestimmung in § 28 StVG; Punkte-Bewertungssystem in § 4 StVG. | § 28, § 4 StVG |
| K3 | „§ 32 StVG / § 32 FZV (ZFZR)" | **teilweise falsch** | § 32 StVG regelt die **Zweckbestimmung** der Fahrzeugregister (örtlich + zentral) — korrekt zitierbar. § 32 FZV (2023) existiert in der seit **01.09.2023 geltenden FZV** **nicht mehr** als Halterdaten-Speichervorschrift. **Korrekte Norm**: **§ 57 FZV (2023)** (Erhebung + Speicherung Fahrzeugdaten im ZFZR) + **§ 60 FZV (2023)** (Übermittlung an KBA) + **§ 35 StVG** (Übermittlung an Behörden / Versicherer). | § 32 StVG; FZV-2023 §§ 57, 60; § 35 StVG |
| K4 | „§ 13 FZV — Mitteilungspflicht 7-Tage-Frist" | **doppelt falsch** | (a) § 13 FZV (2023) regelt nicht die Mitteilungspflicht, sondern die **Zulassungsbescheinigung Teil I**. **Korrekte Norm**: **§ 15 FZV (2023)** „Mitteilungspflichten bei Änderungen". (b) § 15 FZV nennt **keine 7-Tage-Frist**, sondern „**unverzüglich**" (= ohne schuldhaftes Zögern); kommentar-rechtlich gilt 1 Woche als Faustregel, ist aber **kein Gesetzesfristtatbestand**. Bei Eskalation (Aufforderung-Nichtbefolgung) setzt die Behörde eine 4-Wochen-Frist; danach erlischt die Zulassung. Verstoß: **Verwarnungsgeld 40 €** (Bußgeldkatalog). | FZV-2023 § 15; bussgeldkatalog.net Mitteilungspflicht |
| K5 | „§ 33 FZV — Übermittlung Zulassungsstelle → KBA" | **falsch** | Veraltete Nummerierung. **Korrekte Norm**: **§ 60 FZV (2023)** (Übermittlung an das Kraftfahrt-Bundesamt). | FZV-2023 § 60 |
| K6 | „EU-mDL — Adoption Q4 2025, Pflicht-Anwendung H2 2028" | **falsch** | **RL (EU) 2025/2205** im Amtsblatt 05.11.2025; Inkrafttreten 25.11.2025. **Umsetzungsfrist: 26.11.2028** (Adoption + Veröffentlichung im nationalen Recht). **Anwendungsbeginn: 26.11.2029**. **mDL als Default-Format**: 54 Monate **ab erstem Implementing Act gemäß Art. 5(7)** — Inkrafttreten frühestens ~Mai/Juni 2031. „H2 2028 Pflicht-Anwendung" ist falsch — die Anwendung beginnt H2 2029, mDL-Default ~2031. | EUR-Lex 32025L2205; transport.ec.europa.eu News 25.11.2025 |
| K7 | „digitaler Führerschein Bundeskabinettsbeschluss November 2025" | **bestätigt + erweitert** | Kabinett 11.2025; **Bundestag-Beschluss 26.03.2026**; Verfügbarkeit national „Ende 2026". Forciert vor EU-mDL (~2030). | bundestag.de KW13/2026; bundesregierung.de digitaler-fuehrerschein-2392320 |
| K8 | „nur 4 Fahrerlaubnisbehörden online angeschlossen (Stand Jan 2026)" | **bestätigt für Anschlussstart, jetzt erweitert** | Jan 2026: 4 Fahrerlaubnisbehörden produktiv mit OZG-Online-Dienst Führerschein; weitere 3 in Anschlussvorbereitung. Für i-Kfz Stufe 4 (Halter-Vorgänge): Jan 2026 zusätzlich Mansfeld-Südharz + LH Magdeburg neu. Föderal weiterhin Engpass. OZG-2.0 macht Anschluss ab Juli 2024 zur Pflicht, **kein harter Stichtag** — Pflicht zur Bereitstellung „unverzüglich, soweit möglich". | OZG Sachsen-Anhalt News Jan 2026 |
| K9 | „§ 4 IDNrG-Anwendbarkeit auf FE-Nr / FIN" | **klarstellend ergänzt** | § 4 IDNrG listet 11 Basisdaten — **FE-Nr und FIN sind dort nicht enthalten**. Sie sind register-spezifische Identifier, **nicht** Teil der IDNr-Konvergenz. Eine Aggregation in unserem Lese-Layer ist daher rechtlich nur über die jeweilige Register-Selbstauskunft (§ 30 StVG für FAER, § 30a für automatisierten Abruf, FZV-Selbstauskunft für ZFZR) und nicht über das DSC denkbar. Hard-Line. | IDNrG § 4 |

## Bestätigte Aussagen ohne Korrektur

- **Drei-Register-Trennung beim KBA**: ZFER (Klassen/Erteilungsdaten/keine Anschrift) — FAER (Punkte/Maßnahmen) — ZFZR (Halterdaten + Fahrzeugdaten + Versicherung + HU) sind **drei rechtlich getrennte zentrale Register beim KBA**. ZFER speichert ausdrücklich **keine Anschrift** (§ 48 StVG i. V. m. den FeV-Anlagen); Anschrift kommt aus dem Melderegister oder dem örtlichen Führerschein-Register der Fahrerlaubnisbehörde. **Cross-Register-Pflicht-Synchronisation existiert nicht** zwischen den drei KBA-Registern selbst — sie sind getrennte Datenbestände mit getrennten Zuständigkeiten. Wechselseitige Auskünfte erfolgen über § 35 StVG (für ZFZR-Halterdaten an Behörden) und über § 30/30a StVG (für FAER-Punkte an Behörden, Bürger:in-Selbstauskunft).
- **§ 73 FeV → kommunale Fahrerlaubnisbehörde**: bestätigt. Die FE-Behörde ist die nach Landesrecht zuständige **untere Verwaltungsbehörde** (Landkreis / kreisfreie Stadt; in Stadtstaaten ggf. Bezirk). Land = Fach-/Widerspruchsaufsicht; KBA = zentrales Register, kein Erlassorgan. Spezialfälle: **Berufskraftfahrer / BKrFQG-Module** laufen über die FE-Behörde + IHK-Prüfungsausschüsse; **Soldaten** haben eine Sonder-Wehrführerschein-Schiene über das BAPersBw, die aber bei zivilem Umtausch wieder bei der kommunalen FE-Behörde landet; **Diplomaten** haben Sonderregelungen über das Auswärtige Amt + örtliche FE-Behörde des Dienst-/Wohnortes. Alle führen letztlich zur **kommunalen FE-Behörde** zurück — Korrekturwege in V1.1 zeigen daher korrekt auf `kategorie: kommune` (nicht `land`, nicht `bund`).
- **§ 30 Abs. 8 StVG — FAER-Selbstauskunft unentgeltlich**: bestätigt. Online-Auskunft mit eID + BundID + AusweisApp ist gebührenfrei (KBA-Seite "Online-Registerauskunft - schnell - digital - gebührenfrei"). Postalisch ebenfalls unentgeltlich. Ergebnis als PDF.
- **§ 4 StVG — Punktesystem**: bestätigt. 1-2-3-Punkte-System seit 01.05.2014; Maßnahmenstufen 4-5 (Ermahnung), 6-7 (Verwarnung), ab 8 (Entziehung). Tilgungsfristen § 29 StVG: 2,5 / 5 / 10 Jahre je nach Schwere.
- **i-Kfz Stufe 4 seit 01.09.2023 live + Adressänderung als Online-Vorgang**: bestätigt. Anstoß durch Halter erforderlich; **keine automatische Synchronisierung Bürgeramt → Zulassungsstelle** durch Meldewesen-Push.
- **FE-Nummer-Format 11-stellig (Bundesland-Buchstabe + Behörden-Code + lfd. Nr. + Prüfziffer + Ausfertigung)**: bestätigt nach FS-VwV.
- **Pflichtumtausch-Stichtage 2022-2033**: bestätigt nach Bundesregierung-FAQ + ADAC. Klassen-Tabelle in der Research-Vorlage korrekt; relevant für Demo-Persona-Datierung. **Norm**: 3. EU-FE-Richtlinie 2006/126/EG (Art. 7 Abs. 2) i. V. m. § 6 Abs. 7 FeV-Anlage 8 (Pflicht zur Erneuerung alle 15 Jahre für Klassen A/B/M/L/T) und Anlage 8a (Stichtags-Tabelle Bestandsfahrer:innen).
- **EUDI-Wallet-PID-Schema (8 Pflichtattribute, 4-aus-6 Hilfsattribute)**: bestätigt nach ARF 2.4 PID-Rulebook (Annex 3.01). mDL-Rulebook ist im ARF 2.4 angelegt, der direkte Annex-Pfad (`annex-3.05-mdl-rulebook`) liefert HTTP 404 — ARF 2.4 enthält den mDL-Rulebook-Stub aktuell als **eigenständige Manual-Seite** (`929202846/The+Mobile+Driving+License+manual` auf der EUDI-Building-Blocks-Confluence), Status: **draft, technische Spezifikation läuft**. Die in der Research-Vorlage angegebenen mDL-Attribute (driving_privileges, portrait, signature_usual_mark, issuing_authority, issuing_country, document_number, expiry_date, issue_date) entsprechen **ISO/IEC 18013-5 Annex B** und sind technisch korrekt; ihre Aufnahme in das EUDI-mDL-Rulebook ist erwartet, aber Mai 2026 nicht final.

## Hard-Lines V1.1 (zwingend in Spec aufzunehmen)

> Diese Hard-Lines übersteigen die V1-Hard-Lines aus `docs/domain/stammdaten.md` § "Zusätzliche Risikofelder" und ergänzen sie. Sie sind in der V1.1-Spec wortwörtlich zu erwähnen.

### HL-V1.1-1 — Punktestand niemals als passive Anzeige
**Begründung**: § 30 Abs. 8 StVG fordert Antrag der betroffenen Person; § 30a StVG verlangt qualifizierte elektronische Identifikation + Logging jedes Abrufs. Eine Default-Anzeige in einer Citizen-UI würde das Antragserfordernis unterlaufen und ggfs. Sozialdaten-/Strafregister-ähnliche Daten ungeprüft aggregieren. **DSGVO-Sortierung**: Punkte sind **keine Art-9-DSGVO-Daten** (keine Gesundheits-, ethnische, religiöse, biometrische Daten), aber **§ 28 BDSG-Kategorie nicht direkt einschlägig** (§ 28 BDSG behandelt Forschungs-/Statistikzwecke). Einschlägig sind Art. 10 DSGVO (Daten zu strafrechtlichen Verurteilungen) **partiell** für Straftat-Einträge; ansonsten Art. 6 DSGVO mit hohem Sensibilitätsgrad. **UI-Konsequenz**: on-demand-CTA „Punktestand abrufen" → eID-Reauth-Modal-Pattern (analog Religion-Card V1) → Mock-Result mit `[MOCK]`-Watermark → Activity-Log-Eintrag im app-internen Aktivitätsprotokoll (kein behördlicher Audit-Layer). Disclaimer-Wortlaut: siehe § "Legal disclaimer to surface in UI" unten.

### HL-V1.1-2 — Aktive FAER-Maßnahmen NICHT in V1.1
Ermahnung (4-5 P.), Verwarnung (6-7 P.), MPU-Anordnung, Entziehung (≥8 P.) — **keine Aggregation in der Citizen-UI**. Diese Akte werden vom Bürger:in **per Brief von der Fahrerlaubnisbehörde** zugestellt; das gehört in den Posteingang (`/posteingang`), nicht in den Stammdaten-Hub. Verlinkung erlaubt: „Maßnahmen erhalten Sie direkt von Ihrer Fahrerlaubnisbehörde — siehe Posteingang."

### HL-V1.1-3 — FIN ist masked-by-default (Hash-Pattern)
Analog zur IBAN-Maskierung in V1. UI-Pattern: `WAU•••••••••••2891` (letzte 4 Stellen sichtbar, on-click voll); FIN ist personen-bezogen-äquivalent (KBA-Selbstauskunft + Schadenakten + Versicherungsbetrugsschutz).

### HL-V1.1-4 — Halter-Adresse-Sync mit Bürgeramt: NIE auto-magisch
**Norm-Anker**: § 15 FZV (2023) — Halter-Mitteilungspflicht „unverzüglich"; **kein Push-Mechanismus aus dem Melderegister**. Die V1.1-UI muss die FZV-§-15-Pflicht **explizit** als Bürger:in-Aktion rahmen — nicht als Behörden-Automatik. Block-D im Umzug-Autopilot zeigt diesen Effekt als „Sie haben den i-Kfz-Vorgang ausgelöst" (Mock), nicht als „Wir haben Ihre Halter-Adresse geändert". Disclaimer-Wortlaut: siehe `stammdaten.disclaimer.kfz_halter_adresse_speculative` unten.

### HL-V1.1-5 — Fahrerlaubnisbehörde ist `kategorie: kommune`
In `behoerden.json` zwingend als kommunal-Stelle führen; **nie** als Land. KBA ist bundesweit (für Register-Auskunft), aber nicht Erlassorgan einer FE-Maßnahme. Wegweiser-CTAs zeigen **immer** auf die wohnsitz-zugehörige untere Verwaltungsbehörde (§ 73 FeV).

### HL-V1.1-6 — Pflichtumtausch-Banner nur bei vollständigen Daten
Nur sichtbar, wenn Geburtsjahr **und** Ausstellungsdatum bekannt sind. Sonst stiller Hinweis: „Stichtag-Berechnung benötigt Geburtsjahr-Bestätigung im Profil — bitte Bürgeramt-Datenkranz prüfen." Abgleich mit § 6 Abs. 7 FeV + Anlage 8a.

### HL-V1.1-7 — mDL-Wallet-Mock = klar als 2031-Vision gerahmt
Anwendungsbeginn der RL (EU) 2025/2205 = **26.11.2029**, mDL-Default-Format = ~2031. Eine 2027-Demo, die mDL als „verfügbar" zeigt, ist speculative-design — Disclaimer `stammdaten.disclaimer.eudi_mdl_speculative` (siehe unten). Wallet-Subtab führt mDL-Mock parallel zur PID-Mock, mit Selective-Disclosure-Toggle, **ohne** Verwechslung mit der bereits realen i-Kfz-App.

### HL-V1.1-8 — Digitaler Führerschein in i-Kfz-App ≠ EUDI-mDL
Die nationale Lösung „digitaler Führerschein in der i-Kfz-App" (Bundestag 26.03.2026, Verfügbarkeit Ende 2026) und die EU-mDL über EUDI-Wallet (RL 2025/2205, Anwendung ab 11/2029, Default ab ~2031) sind **zwei verschiedene Artefakte**. Konflikt-Risiko: nationale i-Kfz-App soll bis EU-Pflicht weitergeführt werden, später EU-mDL-konvergent werden. UI muss diese Trennung sichtbar halten — **wir zeigen nicht „die i-Kfz-App in unserer Demo"**, sondern eine **hypothetische Aggregations-Vision**. Card-Hinweis: „In der echten i-Kfz-App des KBA speicherbar — diese Demo zeigt das hypothetische Konvergenz-Bild zur EUDI-Wallet."

### HL-V1.1-9 — Selective-Disclosure-Toggles müssen ISO-konform sein
Der mDL-Wallet-Mock darf nur Felder einzeln offenlegen, die nach **ISO/IEC 18013-5 Annex B** als selektiv freigebbar definiert sind:
- given_name, family_name, birth_date, age_over_18, age_in_years (Kontroll-Selektoren)
- driving_privileges (gesamt **oder** je Klasse einzeln)
- portrait
- issue_date, expiry_date
- issuing_authority, issuing_country, document_number
- un_distinguishing_sign

Eine Selective-Disclosure-Option „Nur Klasse B + Ablaufdatum, ohne Foto, ohne Erteilungsdatum, ohne FE-Nr" ist ISO-konform; eine Option „Nur Punkteanzahl" wäre **nicht ISO-konform** (Punkte sind kein mDL-Attribut, sondern FAER) — ist also auszuschließen.

## Auto-fill / Automation-Potenzial

| Feld | Quellregister (autoritativ) | Heute verfügbar (Citizen-Sicht)? | Was bräuchte es? |
|---|---|---|---|
| FE-Nr, Klassen, Schlüsselzahlen, Erteilungs-/Ablaufdatum | ZFER (KBA, § 48 StVG) | ja, Online-Selbstauskunft mit eID + BundID, gebührenfrei, PDF-Output | API-Spiegelung ZFER → Citizen-Layer; politisch heikel (KBA-Datenfluss zu privatem Aggregator unzulässig). Nur über DSC-Hub-Anbindung in 2027-Vision sinnvoll |
| Punktestand | FAER (KBA, § 28 StVG) | ja, on-demand mit eID, gebührenfrei, PDF-Output (§ 30 Abs. 8 StVG) | gleichbleibend on-demand bleiben — keine Hintergrund-Spiegelung. Push-Pattern wäre rechtsdogmatisch und datenschutzrechtlich heikel |
| Aktive FAER-Maßnahmen | FE-Behörde-Bescheid + FAER-Eintrag | nein, kommt per Brief; FAER-Auskunft listet historische Eintragungen | bleibt im Posteingang-Layer, **nicht** im Stammdaten-Hub |
| Halter-Daten (eigene Fahrzeuge: KZ, FIN, HU, eVB-Status) | ZFZR (KBA, § 32 StVG i. V. m. § 57 FZV) | ja, KBA-Selbstauskunft mit eID; teils auch über kommunale i-Kfz-Portale | API-Spiegelung ZFZR + Versicherungs-eVB-Status. **Block-D-Sichtbarmachung**: Adressänderung muss aktiv über i-Kfz Stufe 4 ausgelöst werden — Demo simuliert das Pre-Fill |
| Halter-Anschrift (eigene + Empfangsbevollmächtigte) | ZFZR (§ 57 FZV) | nicht im Bürgeramt-Datenkranz aufgelöst; muss separat gemeldet werden (§ 15 FZV) | hypothetischer Bürgeramt → ZFZR-Push (existiert nicht); Block-D macht das als Citizen-Action sichtbar |
| HU-/AU-Datum, Versicherung-Status (eVB) | TÜV/Dekra → Zulassungsstelle → ZFZR; Versicherer → ZFZR | im KBA-Selbstauskunft-Datensatz teilweise enthalten; aktueller eVB-Status liegt bei der Zulassungsstelle | Mock zeigt nur „letzte bekannte eVB" mit Disclaimer „echte Status-Abfrage erfolgt durch Zulassungsstelle" |
| mDL-Attestation (driving_privileges + portrait + Klassen-Selektor) | EUDI-Wallet (PID-Issuer + mDL-Issuer beim KBA in 2031+ angedacht) | **nicht real-2026**; nationale i-Kfz-App ist Vorläufer | EUDI-mDL-Issuance bei KBA gemäß RL 2025/2205 + ARF 2.4 mDL-Rulebook (final) — frühestens 2029-2031 |

## Zuständigkeit (Behörde — Daten — Korrekturweg)

| Behörde | Welche Mobilitäts-Stammdaten | Korrekturweg | Föderale Ebene | Rechtsgrundlage |
|---|---|---|---|---|
| Fahrerlaubnisbehörde (kommunal: Landkreis / kreisfreie Stadt; in Stadtstaaten ggf. Bezirk) | FE-Akte (örtliches FE-Register), Klassen, Schlüsselzahlen, Erteilungs-/Ablaufdaten, Pflichtumtausch-Anträge, Maßnahmen-Vollzug | Persönlicher Termin oder OZG-Online-Dienst Führerschein (Anschluss erst bei wenigen Behörden) | kommunal (Vollzug Land) | § 73 FeV; § 48 Abs. 1 StVG (örtliches Register) |
| KBA (Bund, Flensburg) | ZFER (zentral, ohne Anschrift), FAER, ZFZR | Selbstauskunft ZFER/FAER/ZFZR mit eID + BundID; FAER online gebührenfrei; KBA selbst ändert keine Stammdaten — Korrekturen laufen über die Quell-Behörde (FE-Behörde / Zulassungsstelle / Gericht) | Bund | § 48 Abs. 2 StVG (ZFER); § 28 StVG (FAER); § 32 StVG i. V. m. § 57 FZV (ZFZR); § 30, § 30a StVG (Auskunft) |
| KFZ-Zulassungsstelle (kommunal) | Halter-Daten + Fahrzeug-Stamm; eVB-Annahme | i-Kfz Stufe 4 online (sofern angeschlossen) oder persönlicher Termin; § 15 FZV-Mitteilungspflicht „unverzüglich" | kommunal (Vollzug Land) | § 15, § 60 FZV (2023); § 33 StVG |
| Versicherer (privat oder öff.-rechtl. PKV) | eVB-Nr, Versicherungs-Vertragsdaten | direkt beim Versicherer; eVB läuft elektronisch zur Zulassungsstelle | Privatrecht | VVG; FZV § 23 (eVB-Verfahren) |
| TÜV / DEKRA / GTÜ (PI / TP) | HU-/AU-Plakette, Hauptuntersuchungs-Bescheinigung | Termin bei Prüfstelle; Mitteilung an Zulassungsstelle | Privatrecht (Beleihung) | StVZO § 29; FZV (HU-Verweise) |
| BAPersBw (Bund, Wehrführerschein) | Wehrführerscheine, Sonder-FE der Soldat:innen | bei zivilem Umtausch über kommunale FE-Behörde | Bund | § 73 FeV i. V. m. SoldatenG / WStG |
| Auswärtiges Amt + örtliche FE-Behörde (für Diplomaten / Konsulatsangehörige) | FE bei Diplomaten | siehe örtliche FE-Behörde am Dienstsitz | Bund / kommunal | Wiener Übereinkommen i. V. m. FeV |

## Realistic mock-data hints

### Aktenzeichen / Identifier-Formate (verifiziert + synthetisch markiert)

| Behörde / Register | Format | Beispiel (synthetisch, [MOCK]) | Quelle |
|---|---|---|---|
| FE-Nummer (EU-Karte seit 2013) | 11 Zeichen: Bundesland-Buchstabe (1) + Behörden-Code (2-4) + lfd. Nr. (5-9) + Prüfziffer (10) + Ausfertigung (11) | `[MOCK] B0727RRE2I50` (B=Bayern, 072=LK Dachau, RRE2I=lfd, Prüfziffer 5, Ausf. 0) | FS-VwV; KBA |
| Kfz-Kennzeichen | 1-3 Buchstaben Unterscheidungszeichen + 1-2 Buchstaben + 1-4 Ziffern | `[MOCK] B-AP 4711`, `[MOCK] M-XY 23`, `[MOCK] K-VR 8088E` (E = Elektrokennzeichen) | FZV Anlage 4 |
| FIN (Fahrgestellnummer) | 17 Zeichen ISO 3779 (WMI 3 + VDS 6 + VIS 8) | `[MOCK] WAUZZZF40MA123456` (Audi-WMI; voll), `WAU•••••••••3456` (masked default) | ISO 3779 |
| KBA-FAER-Auskunft-Aktenzeichen | KBA-internes Az; auf PDF-Auskunft typischerweise „FAER-AK-2026-XXXXXXXX" / „Geschäftszeichen 21X" | `[MOCK] FAER-AK-2026-04127831`, `[MOCK] KBA-Az 21-FAER-2026/4711823` | KBA-Form-Vordruck FormularFAER_09_2022 |
| KBA-ZFER-Auskunft-Aktenzeichen | ZFER-Selbstauskunft-Az auf PDF | `[MOCK] ZFER-AK-2026-08442713` | KBA-ZFER-Selbstauskunft |
| Kommunale Fahrerlaubnisbehörde — Az | freies kommunales Az (analog `BA-MITTE/EWA-…`) | Berlin: `[MOCK] LABO-FE/2026-04-002831` (LABO = Landesamt für Bürger- und Ordnungsangelegenheiten); Köln: `[MOCK] STADT-K/STR-FE-2026-117/8842`; München: `[MOCK] KVR-MUC/FE-2026-08-04472` (KVR = Kreisverwaltungsreferat) | Kommunal-Praxis |
| Kommunale KFZ-Zulassungsstelle — Az | freies kommunales Az | Berlin: `[MOCK] LABO-KFZ/2026-04-104221`; Köln: `[MOCK] STADT-K/STR-KFZ-2026-211/00871`; München: `[MOCK] KVR-MUC/KFZ-2026-12-08812` | Kommunal-Praxis |
| eVB-Nummer | 7 Zeichen alphanumerisch (Versicherer-vergeben) | `[MOCK] VB47K3M`, `[MOCK] AX21Q8L` | GDV-Standard |
| Schlüsselzahlen-Beispiele (Anlage 9 FeV) | 2-3 Stellen je Code | `95` (BKrFQG-Modul, 5 Jahre gültig), `78` (Schaltgetriebe-Beschränkung), `79.06` (B mit Trike-Erweiterung), `70` (Umtausch-Kennzeichnung), `96` (Anhängerlast B+E-Vorstufe) | FeV Anlage 9; ADAC Schlüsselzahlen-Übersicht |

### Behörden-Adressen (synthetisch-verbatim für `behoerden.json`)

- **KBA Flensburg**: „Kraftfahrt-Bundesamt, Fördestraße 16, 24944 Flensburg" — kategorie: bund; zuständige_themen: ZFER-Auskunft, FAER-Auskunft, ZFZR-Auskunft. Anschrift Bestandsadresse für FAER-Schriftverkehr: **24932 Flensburg** (Postanschrift Hauptpostfach).
- **Berlin**: „Landesamt für Bürger- und Ordnungsangelegenheiten — Abt. III Fahrerlaubnis, Puttkamerstraße 16-18, 10958 Berlin" (Stadtstaat: Land = Kommune; LABO ist hier untere Verwaltungsbehörde nach § 73 FeV).
- **Köln**: „Stadt Köln — Straßenverkehrsamt, Amt für öffentliche Ordnung — Fahrerlaubnisstelle, Hohenstaufenring 16, 50674 Köln".
- **München**: „Kreisverwaltungsreferat München — HA II Fahrerlaubnisse und Fahrlehrerwesen, Ruppertstraße 19, 80337 München".

### Briefkopf-Standardphrasen (Mobilität-Anlässe)

**KBA-FAER-Auskunft (Punktestand-PDF)**
- Absender: „Kraftfahrt-Bundesamt — Fördestraße 16, 24944 Flensburg — Referat Z21"
- Betreff: „Auskunft aus dem Fahreignungsregister gemäß § 30 Abs. 8 StVG — Geschäftszeichen [MOCK] FAER-AK-2026-04127831"
- Standardphrase: „Hiermit übersenden wir Ihnen die von Ihnen beantragte Auskunft über die zu Ihrer Person im Fahreignungsregister gespeicherten Daten. Punktestand zum Stichtag TT.MM.JJJJ: X Punkt(e). Stand der zugrunde liegenden Eintragungen: TT.MM.JJJJ."
- Hinweis-Floskel: „Diese Auskunft ist gebührenfrei. Sie wurde aufgrund Ihres elektronischen Antrags vom TT.MM.JJJJ unter Verwendung Ihrer eID-Funktion ausgestellt."

**Kommunale FE-Behörde — Aufforderung zum Pflichtumtausch**
- Absender: „Stadt Köln — Straßenverkehrsamt — Fahrerlaubnisstelle — Hohenstaufenring 16, 50674 Köln"
- Betreff: „Pflichtumtausch Ihres Führerscheins — Stichtag 19.01.2027 — Aktenzeichen [MOCK] STADT-K/STR-FE-2026-117/8842"
- Standardphrase: „Nach § 6 Abs. 7 FeV i. V. m. Anlage 8a Pflichtumtauschen-Tabelle endet die Gültigkeit Ihres bisherigen Führerscheins zum 19.01.2027. Wir bitten Sie, fristgerecht einen Umtausch in den fälschungssicheren EU-Kartenführerschein zu beantragen."
- Hinweis-Floskel: „Nach Ablauf der Frist können Sie keinen Nachweis Ihrer Fahrberechtigung mehr durch den abgelaufenen Führerschein erbringen; das Führen von Kraftfahrzeugen ohne gültigen Führerschein ist eine Ordnungswidrigkeit (§ 75 Nr. 4 FeV)."

**Kommunale Zulassungsstelle — Aufforderung Halter-Adressänderung**
- Absender: „Kreisverwaltungsreferat München — HA II/3 Kfz-Zulassung — Ruppertstraße 19, 80337 München"
- Betreff: „Änderung Ihrer Halter-Anschrift gemäß § 15 FZV — Aktenzeichen [MOCK] KVR-MUC/KFZ-2026-12-08812"
- Standardphrase: „Aufgrund einer uns von Dritter Seite zugegangenen Information zur Anschriftenänderung bitten wir Sie, unverzüglich eine entsprechende Mitteilung nach § 15 FZV abzugeben. Bei Nichtbefolgung setzen wir Ihnen eine Frist von vier Wochen; mit fruchtlosem Ablauf erlischt die Zulassung Ihres Fahrzeugs (§ 15 Abs. 4 FZV)."
- Hinweis-Floskel: „Eine vorsätzliche oder fahrlässige Verletzung der Mitteilungspflicht stellt eine Ordnungswidrigkeit dar (§ 75 Nr. 1 FZV i. V. m. § 24 StVG); regelmäßige Verwarnung 40 €."

### Persona-Snapshots V1.1

> Maximal 5 Mobilität-Felder pro Persona, alle synthetisch und mit `[MOCK]` markiert. Übernommen aus Research-Vorlage, mit Korrekturen.

**Anna Petrov (29, EU-Bürgerin, Berlin)**
- FE-Nr: `[MOCK] B0727RRE2I50` (umgeschrieben 2024 in Berlin, 2018 in St. Petersburg ausgestellt — Klasse B reziproke Anerkennung gemäß Anlage 11 FeV)
- Klassen: B (seit 2018; Erteilung über Anerkennungs-Verfahren 2024 in Berlin)
- Punktestand: 0 (Mock zeigt CTA „Punktestand abrufen" → Reauth-Modal → 0 P. — Activity-Log-Eintrag)
- Eigenes Fahrzeug: KZ `[MOCK] B-AP 4711`, FIN masked `WAU•••••••••3456` (VW Polo, BJ 2019), HU bis 06/2026, eVB `[MOCK] AX21Q8L`
- Halter-Anschrift: identisch mit Bürgeramt-Anschrift Skalitzer Str. 88, 10997 Berlin (Hinweis-Badge „Synchronisierung mit Bürgeramt erfolgte über Umzug-Vorgang #BA-MITTE/EWA-2026-04-0083421 — § 15 FZV-Mitteilung am TT.MM.JJJJ ausgelöst")

**Mehmet Yıldız (38, Selbstständiger, Drittstaatsangehöriger, Köln)**
- FE-Nr: `[MOCK] L0428MEH47K2` (L=NRW, 042=LK Köln-Innenstadt, MEH47=lfd, Prüf 4, Ausf 2 — 2x Ersatz wg. Verlust 2019/2022)
- Klassen: B (seit 2010), C1 (seit 2015, gewerblich, Ablauf 19.01.2030, Schlüsselzahl 95 für BKrFQG-Modul)
- Punktestand: 1 P. (mock — wenn abgerufen, on-demand-Pattern)
- Eigene Fahrzeuge: zwei Halter-Karten — Privat-PKW `[MOCK] K-VR 8088E` (Hyundai Kona Elektro 2024), Liefer-Transporter `[MOCK] K-MY 4711` (Mercedes Sprinter, gewerblich)
- Halter-Anschrift: Venloer Str. 312, 50825 Köln; Pflichtumtausch-Banner: Klasse B Pflicht-Frist abgelaufen 19.01.2025 — **HARD-Konflikt**: wenn Persona-Geburtsjahr 1988 und FE 2010 ausgestellt, müsste Mehmet bereits umgetauscht haben. Demo-State **muss** entweder „Umtausch erfolgt 14.01.2025" zeigen (Erfolgs-Persona) oder als „rote-Risiko-Persona" gerahmt sein (CTA „Umtausch jetzt nachholen — keine Fahrberechtigung mit altem Schein"). Domain-expert empfiehlt **Erfolgs-Persona-Variante** (Mehmet ist als gut-organisierter Selbstständiger geframt).

**Familie Schmidt (Eltern + 2 Kinder, München)**
- FE-Nr Halter (Vater): `[MOCK] B0512SCH08X1` (Bayern, 051=München-Stadt, lfd SCH08, Prüf X, Ausf. 1)
- Klassen: B (seit 2002, Pflichtumtausch-Stichtag 19.01.2027 aktiv), BE (Anhänger, seit 2010)
- Eigenes Fahrzeug: KZ `[MOCK] M-SC 142`, FIN masked, FIN-volle nur on-click, VW Touran 2021, HU bis 09/2027
- Pflichtumtausch-Banner aktiv: „Ihr Führerschein muss bis 19.01.2027 umgetauscht werden — Termin in der Fahrerlaubnisstelle KVR München buchen". Pre-Frist 8 Monate sichtbar.
- mDL-Wallet-Subtab: Mock-Card „mDL-Attestation noch nicht ausgestellt — EU-Anwendungsbeginn 26.11.2029 / mDL-Default ~2031" als Speculative-Hinweis.

## Legal disclaimer to surface in UI (zwingend in `de.json` aufzunehmen)

> Vier neue Disclaimer-Strings als Erweiterung der V1-Disclaimer-Familie. Sie übersetzen 1:1 in `en/ru/uk/ar/tr.json`. Sie-Form, knapp.

**1. `stammdaten.disclaimer.fuehrerschein_lese_schicht`**

> „Diese App ist auch für die Mobilitäts-Sektion eine **Lese- und Wegweiser-Schicht**. Klassen-, Schlüsselzahl- und Ablauf-Daten sind hier illustrativ aus den Selbstauskunfts-Pfaden des Kraftfahrt-Bundesamts (ZFER, § 48 Abs. 2 StVG) und Ihrer kommunalen Fahrerlaubnisbehörde (§ 73 FeV) zusammengeführt. **Keine Schreib-Operation** in das Zentrale Fahrerlaubnisregister oder das örtliche FE-Register. Korrekturen erfolgen ausschließlich bei Ihrer kommunalen Fahrerlaubnisbehörde."

**2. `stammdaten.disclaimer.faer_punkte_on_demand`**

> „Ihr Punktestand wird **niemals dauerhaft** in dieser App gespeichert. Auf Ihren ausdrücklichen Klick rufen wir gemäß § 30 Abs. 8 StVG eine Selbstauskunft beim Kraftfahrt-Bundesamt simuliert ab — die echte Auskunft wäre gebührenfrei und nutzt Ihre eID. Jeder Abruf ist im Aktivitätsprotokoll dieser App protokolliert. Maßnahmen Ihrer Fahrerlaubnisbehörde (Ermahnung, Verwarnung, MPU-Anordnung, Entziehung) erhalten Sie ausschließlich per Bescheid und werden nicht in dieser Übersicht aggregiert."

**3. `stammdaten.disclaimer.kfz_halter_adresse_speculative`**

> „Bei Adressänderung müssen Sie nach § 15 FZV unverzüglich Ihre Zulassungsstelle informieren. Eine **automatische Synchronisierung** zwischen Bürgeramt und Zulassungsstelle gibt es heute (Mai 2026) **nicht**. Diese Demo simuliert ein 2027-Pattern. Im echten Verfahren stoßen Sie den i-Kfz-Vorgang Stufe 4 selbst an — die App zeigt Ihnen den Pre-Fill und den Wegweiser zu Ihrer Zulassungsstelle."

**4. `stammdaten.disclaimer.eudi_mdl_speculative`**

> „Die hier gezeigte Vorschau eines mobilen EU-Führerscheins (mDL) als Wallet-Nachweis simuliert eine Vision für **2029-2031**. Rechtsgrundlage: Richtlinie (EU) 2025/2205 vom 22.10.2025; Anwendungsbeginn 26.11.2029; mDL als Default-Format ~Mai 2031 (54 Monate nach erstem Implementing Act). National ist seit Ende 2026 ein digitaler Führerschein in der i-Kfz-App des Kraftfahrt-Bundesamts geplant — diese Demo zeigt **nicht** die i-Kfz-App, sondern das hypothetische Konvergenz-Bild zur EUDI-Wallet."

## Block-D Connection (Umzug-Autopilot)

Der bestehende Block-D im Umzug-Autopilot (`src/lib/mock-backend/autopilot/umzug.ts`) ist heute mit „§ 32 FZV"-Zitat im Body kommentiert — **das ist falsch nach FZV-2023-Nummerierung**. Korrektur-Auftrag an mock-backend-coder: ersetze in den Block-D-Step-Texten und in den `de.json`-Strings:
- „§ 32 FZV (KFZ-Halter-Anschrift-Sync)" → **„§ 15 FZV (Mitteilungspflicht Halter-Anschrift)"**.
- „automatische Synchronisierung" → **„Pre-Fill der i-Kfz-Adressänderung"** (§ 15 FZV erfordert Halter-Aktion).

V1.1-UI-Sichtbarmachung des Block-D-Effekts (in `<MobilitaetSektion>`):
- Aktivitäts-Log-Eintrag (app-internal, nicht behördlich): „Halter-Adresse `[MOCK]` `K-VR 8088E` über Umzug-Vorgang #VG-XXXXX als § 15 FZV-Mitteilung pre-filled."
- Halter-Adresse-FieldCard mit Übergangs-Badge „Adressänderung über Umzug-Vorgang ausgelöst — Bestätigung der Zulassungsstelle steht aus".
- Disclaimer `stammdaten.disclaimer.kfz_halter_adresse_speculative` direkt unter dem Effekt.

## Open questions (an product-architect / verifier)

1. **eAT-Halter-Konstellation**: Die Research-Vorlage fragt, ob ein eAT-Inhaber mit § 21 AufenthG i-Kfz Stufe 4 nutzen kann. **Antwort domain-expert**: ja, sofern der eAT die **eID-Funktion aktiviert hat** (eID auf eAT seit 2011 möglich). Voraussetzung: PIN gesetzt + AusweisApp-Kompatibilität. Mehmet ist also als persona-secondary-Hook für i-Kfz-Stufe-4-Demo-Fluss korrekt.
2. **Familie-Schmidt-Halter-Konstellation**: Halter ist *eine Person*, nicht „Familie" (FZV § 6). UI-Pattern: Halter = ein Elternteil (z. B. Vater); zweites Elternteil als „Mitnutzer:in" mit Hinweis „rechtlich kein Halter — keine Mitteilungspflicht § 15 FZV". Erlaubt ist auch Halter = juristische Person (Leasing, Carsharing) — aus Demo-Scope ausgeklammert.
3. **§ 45 FeV Akteneinsicht (Bürger:in-Akteneinsicht in örtliches FE-Register)**: könnte eine wow-moment-Erweiterung sein (Citizen sieht eigene FE-Akte bei der Kommune); domain-expert-Empfehlung: **out-of-scope V1.1**, weil Akteneinsicht heute nicht digital, sondern persönlich beim Termin erfolgt.
4. **§ 4 IDNrG-Konvergenz für Mobilitäts-Identifier**: FE-Nr und FIN sind *nicht* in den 11 Basisdaten — sie können in V1.1 nicht als „IDNr-konvergente Spiegelung" dargestellt werden. Ggf. langfristig per RegMoG-Erweiterung (politisch heute nicht angedacht).
5. **mDL-Akzeptanz-Frictions in 2027-Demo**: Italien zeigt Anagrafe-Inkongruenzen, Norwegen Anti-Screenshot-Patterns. Empfehlung domain-expert: V1.1 **nicht** ein „mDL-Akzeptanz-Reibungsfeld" zeigen — das verwässert die Demo-Aussage. Beschränkung auf Selective-Disclosure als wow-moment.
6. **Konflikt nationaler digitaler Führerschein vs. EU-mDL**: Der nationale Schein in i-Kfz-App ab Ende 2026 ist eine **Brückenlösung**, die bei EU-mDL-Anwendung (26.11.2029) entweder konvergent fortgeführt oder durch EUDI-mDL ersetzt wird. Politische Entscheidung steht aus. UI-Konsequenz: keine Vermischung der zwei Artefakte.

## Was concept-verifier besonders jagen sollte

1. **mDL-Datierung**: Wenn die Spec irgendwo „2028 Pflicht" oder „H2 2028" stehen lässt, ist das falsch. Korrekt sind 26.11.2028 (Umsetzung), 26.11.2029 (Anwendung), ~2031 (mDL-Default). Verifier-Probe: jede Demo-Card mit „mDL ist verfügbar 2027" muss ein `eudi_mdl_speculative`-Disclaimer-Banner tragen.
2. **§-Nummerierung FZV**: Jede Erwähnung von „§ 13 FZV" / „§ 32 FZV (Halterdaten)" / „§ 33 FZV" in Spec/Code/i18n ist ein Bug. Korrekt sind §§ 15, 57, 60 FZV (2023). `<NormZitatSpan>` muss auf die richtigen Anker zeigen.
3. **Punkte als „Profile-Stammdaten"**: Wenn die Spec irgendwo ein Profile-Feld `punkte: number` einführt, ist das Hard-Line-Verstoß. Punkte gehören niemals als persistentes Profil-Attribut in das App-State; sie sind ausschließlich on-demand-Result mit kurzem TTL (Mock: 5 Minuten in-memory) und Activity-Log-Eintrag.
4. **`kategorie: land`-Eintrag für Fahrerlaubnisbehörde**: In `behoerden.json` muss die Fahrerlaubnisbehörde `kategorie: kommune` sein. Verifier-Probe: jede Demo-Card mit „Fahrerlaubnisbehörde Berlin (Land)" oder „Fahrerlaubnisbehörde Bayern (Land)" ist falsch.
5. **Block-D-Wording**: Wenn das Block-D-UI „wir haben Ihre Halter-Adresse aktualisiert" suggeriert, ist das § 15 FZV-Hard-Line-Verstoß. Korrekt ist „Sie haben den i-Kfz-Vorgang ausgelöst — Pre-Fill bereit".
6. **Selective-Disclosure-Toggles**: Wenn ein Toggle ein Feld anbietet, das nicht ISO/IEC 18013-5-konform ist (z. B. „Punktezahl", „Bezirk der FE-Behörde", „MPU-Status"), ist das Hard-Line-Verstoß HL-V1.1-9.
7. **„automatische Synchronisierung"-Floskel**: in keiner UI / keinem Disclaimer / keinem Mock-Brief darf die Phrase „die App synchronisiert automatisch mit dem KBA / der Zulassungsstelle / der FE-Behörde" auftauchen — egal ob auf Deutsch oder in Übersetzungen. Stets Wegweiser-Wording.
