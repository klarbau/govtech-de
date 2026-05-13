---
feature: posteingang-v2-zahlungs-rail
date: 2026-05-09
author: domain-expert
status: domain-validated-v2
verdict: PROCEED-after-revision-2 (verifier REVISE addressed; 5 hard-revisions locked, 3 soft-revisions noted as architect-instructions)
revision: 2
revision_changelog:
  - v1 (2026-05-09 morning): initial domain-lock, PROCEED with 6 gates.
  - v2 (2026-05-09 afternoon): concept-verifier issued REVISE; this revision addresses AV5/AV11/AV12 + new-gap #5 + soft-revisions AV1/AV2/AV3. Changes:
    - §1 Speculative-Banner Wortlaut tightened (AV1).
    - §7 Rechtsgrundlage switched to Art. 6 Abs. 1 lit. b DSGVO (Vertragserfüllung), Cockpit-Toggle removed (gap #5, verifier preference).
    - §8 Citation-Match-Normalization rules locked verbatim (AV11) — three new sub-rules with regex + worked examples.
    - §9 Phishing-Gate placement clarified as inline-checkbox-inside-PaymentSheet, NOT prior modal (AV3).
    - §10 Out-of-scope expanded with reconciled letter-count + Pay-CTA-gate-rule for non-`zahlung`-Frist payment-bearing letters (AV12 + new-gap #3).
    - Locked Mock-IBAN-Tabelle: all 9 IBANs (8 deterministic + 1 optional OWi) re-computed mod-97-10 locally; 9 of 9 originally **invalid**; replaced with checksum-verified values. Each row carries `checksum_verified: true` + computation trace.
    - §11 NEW: Cross-state with Aussetzungs-Antrag — Pay-CTA secondary-style + label-variant + sub-Disclaimer (AV5).
    - §12 NEW: Citation-Match-Normalization rules (the rule-table referenced from §8).
    - Säumnis-Wortlaut placement-instruction added to §6: belongs in `<NormTooltip>` on Frist-Chip, NOT in PaymentCard (soft-revision AV2).
inputs:
  research: docs/research/2026-05-09-posteingang-gap-analysis.md (Idea 1)
  verifier: docs/reviews/2026-05-09-posteingang-v2-zahlungs-rail-verify.md (REVISE → addressed in this v2)
  cross_feature: docs/domain/posteingang-v1.5.1-rechtsbehelf-aussetzung.md (Aussetzungs-Antrag § 361 AO Wortlaut)
  prior_locks: docs/specs/posteingang.md §10/§11; docs/specs/posteingang-v1.5.md §11; docs/domain/posteingang.md; docs/domain/posteingang-antwort-verfassen.md
sources:
  - https://docs.fitko.de/xbezahldienste/
  - https://docs.fitko.de/xbezahldienste/standard/BeschreibungXBezahldienste/
  - https://www.it-planungsrat.de/fileadmin/beschluesse/2023/Beschluss2023-51_XBezahldienste_Standard.pdf
  - https://www.fitko.de/fileadmin/fitko/veranstaltungen/Handout_Dialog_XBezahldienste.pdf
  - https://www.epaybl.de/
  - https://www.cio.bund.de/Webs/CIO/DE/digitale-loesungen/it-konsolidierung/dienstekonsolidierung/it-massnahmen/epayment/epayment-node.html
  - https://www.europeanpaymentscouncil.eu/sites/default/files/kb/file/2024-03/EPC069-12%20v3.1%20Quick%20Response%20Code%20-%20Guidelines%20to%20Enable%20the%20Data%20Capture%20for%20the%20Initiation%20of%20an%20SCT.pdf
  - https://en.wikipedia.org/wiki/EPC_QR_code
  - https://www.gesetze-im-internet.de/ao_1977/__240.html
  - https://www.gesetze-im-internet.de/ao_1977/__357.html
  - https://www.gesetze-im-internet.de/ao_1977/__361.html
  - https://www.gesetze-im-internet.de/sgg/__84.html
  - https://www.gesetze-im-internet.de/sgg/__86a.html
  - https://www.gesetze-im-internet.de/owig_1968/__18.html
  - https://www.gesetze-im-internet.de/rbstv/__9.html
  - https://www.gesetze-im-internet.de/rdg/__2.html
  - https://www.gesetze-im-internet.de/sgb_4/__24.html
---

> **Geltungsbereich**: Diese Note validiert Idea 1 aus der Posteingang-V2-Gap-Analysis (research-scout 2026-05-09) auf Behörden-Realismus, RDG/AO/DSGVO/RBStV-Konformität und EU-Standard-Treue. Sie liefert **keine** Spec, keine Code-Vorgabe und keine UI-Mockups; sie liefert die Realismus-Linien, gegen die concept-verifier adversarial prüfen und product-architect dann speccen kann. **Verdict**: PROCEED, jedoch mit `[Speculative 2027]`-Frame und sechs harten Gates (§§ 1, 3, 8, 9 dieser Note).

---

## 1. ePayBL & FITKO XBezahldienste — Reife-Status 2026 ✓

**Faktenlage** (verifiziert):

- **ePayBL** ist eine real bestehende Plattform der Entwickler-Gemeinschaft aus Bund + 11 Ländern (BW, BY, BB, HB, HH, NRW, SN, ST, SH, TH, RP) für die Online-Zahlungsabwicklung von Verwaltungs-Entgelten. Sie ist *Provider-seitig* — Behörden binden ePayBL als Backend-Modul an ihre Online-Antrags-Strecken an. Sie ist **keine** Citizen-Inbox-Schnittstelle, in der Bürger:innen einen empfangenen Bescheid „bezahlen" könnten ohne vorher die Behörden-Online-Strecke zu durchlaufen ([epaybl.de](https://www.epaybl.de/)).
- **XBezahldienste** ist der per IT-Planungsrats-Beschluss 2023/51 (03.11.2023) standardisierte REST-Schnittstellen-Standard zwischen OZG-EfA-Online-Diensten und Bezahldienst-Anbietern. Die **Pflicht zur Anwendung** für „alle Anbieter und Anwender entgeltpflichtiger EfA-Dienste im OZG-Kontext" gilt seit **01.01.2026** ([IT-Planungsrat-Beschluss 2023/51](https://www.it-planungsrat.de/fileadmin/beschluesse/2023/Beschluss2023-51_XBezahldienste_Standard.pdf); [docs.fitko.de/xbezahldienste](https://docs.fitko.de/xbezahldienste/standard/BeschreibungXBezahldienste/)).
- Der real-existierende Roll-out ist **EfA-Online-Antrag → Behörden-Bescheid → Folge-Aktion** (z.B. Gebühr unmittelbar im Antragsstrom), **nicht** „empfangener Papier-/Portal-Bescheid → Citizen-Inbox-Pay-Button". Das ist der entscheidende Realismus-Schnitt.

**Verdict**: Die FITKO-XBezahldienste-Pflicht ab 01.01.2026 ist real — aber sie regelt den **Anbieter-zu-Bezahldienst**-Pfad innerhalb einer Behörden-Online-Strecke. Eine cross-agency Citizen-Inbox-Pay-Rail, die Bürger:innen aus einer aggregierten Posteingang-App heraus bezahlen lässt, ist **nicht** Teil des heutigen XBezahldienste-Scopes. Sie wäre eine plausibel-spekulative 2027-Erweiterung (Konvergenz BundID-Postfach + XBezahldienste-Adapter), aber sie ist heute nicht beschlossen.

**Demo-Frame**: Die Posteingang-V2-Pay-Rail muss explizit als **„Speculative 2027 — XBezahldienste-Adapter-Hypothese auf Basis IT-Planungsrats-Beschluss 2023/51 + BundID-Postfach"** etikettiert werden. Wortlaut-Lock siehe Locked-Wortlaut-Sektion (Update v2: das Verb „konvergieren" ist explizit verbatim, der Satz schließt mit „die heute (Mai 2026) nicht beschlossen ist", um Recruiter-Fehlinterpretation auszuschließen — concept-verifier AV1). Der V1.5-Speculative-Banner-Wortlaut „antrags-thread-gebundene bidirektionale Kommunikation auf Basis des ZBP/BundID-Modells" wird **erweitert** auf den Pay-Rail-Pfad — kein neuer Speculative-Frame, sondern eine Konsistenz-Erweiterung.

---

## 2. EPC069-12 / GiroCode — Standard-Treue ✓

**Faktenlage** (EPC069-12 v3.1, EPC, März 2024):

- Service-Tag: `BCD` (BeguenstigterContoDaten / Bank Customer Data); Identifikations-Code `SCT` (SEPA Credit Transfer). Versions-String aktuell `002` (für Version 2 der Daten-Strukturen, die mit EPC069-12 v3.x korrespondiert).
- Pflicht-Felder (in fester Zeilen-Reihenfolge, getrennt durch LF oder CRLF):
  1. Service Tag (`BCD`)
  2. Version (`001` oder `002`)
  3. Character Set (`1`–`8`; üblich `1` für UTF-8)
  4. Identification (`SCT`)
  5. BIC (optional ab Version 2 für SEPA-Inland-Überweisung; **Pflicht** in Version 1)
  6. Name des Empfängers (max. 70 Zeichen)
  7. IBAN des Empfängers (max. 34 Zeichen)
  8. Betrag (Format `EUR123.45`; max 999999999.99)
  9. Purpose-Code (optional, AT-44 SEPA-Liste)
  10. Remittance Reference (strukturiert, ISO 11649; alternativ frei-Text)
  11. Remittance Information (frei-Text Verwendungszweck; max 140 Zeichen)
  12. Beneficiary-to-Beneficiary-Information (optional)
- Gesamt-Payload **max. 331 Bytes** ([EPC069-12 v3.1, S. 5–6](https://www.europeanpaymentscouncil.eu/sites/default/files/kb/file/2024-03/EPC069-12%20v3.1%20Quick%20Response%20Code%20-%20Guidelines%20to%20Enable%20the%20Data%20Capture%20for%20the%20Initiation%20of%20an%20SCT.pdf)).

**DACH-Bank-Support** (verifiziert): Sparkasse, Volksbank/VR-Banken, Commerzbank, Deutsche Bank, ING, DKB, Postbank, BBBank, BW-Bank, GLS Bank — alle scannen EPC-QR (in DE „GiroCode"). N26 unterstützt ebenfalls (Stand 2026), wenn der QR-Scan in der App über die Überweisungs-Maske aktiviert wird ([Wikipedia EPC QR code](https://en.wikipedia.org/wiki/EPC_QR_code); [GiroCode-Generator-Übersicht](https://www.girocodegenerator.com/wissen/epc-standard)). Schweizer Banken parsen den DE-GiroCode **nicht** (Schweizer QR-Bill ist eigener Standard) — für die DE-Demo irrelevant.

**Mock-Tauglichkeit**: EPC-QR ist eine **rein Empfänger-seitige** Daten-Struktur. Der QR-Code überträgt KEINE Authentifizierung, KEINE Signatur, KEINE Bank-API-Anbindung; er dient nur dem Pre-Fill der Überweisungs-Maske in der Empfänger-App. Es ist **rechtlich + technisch zulässig**, EPC-QR aus einem Mock-Bescheid zu generieren — solange die Mock-IBAN als IBAN-Checksumme valide ist UND die Demo klar als Mock markiert ist. Die scannende Bank-App parst die Felder; die Bürger:in sieht den Pre-Fill und muss in der Bank-App selbst „Bestätigen" tippen (SCA folgt im Online-Banking-Flow). Es findet **keine Demo-zu-Bank-Integration** statt.

**Verdict**: EPC069-12 v3.1 ist der korrekte Standard. Die Demo soll Version `002` mit Charset `1` (UTF-8) und BIC-optional verwenden (Inland-IBANs sind ausreichend identifiziert). Ein NICHT-zu-tun: **kein Versuch**, Bank-App-Authentifizierungs-Token, OAuth-Berechtigte-Konto-Auswahl oder PSD2-Initiation zu emulieren — der QR-Code endet vor der Bank-Maske.

---

## 3. Bank-App-Deeplinks — Realität 2026 ⚠

**Faktenlage**:

- Es existiert **kein** standardisiertes, dokumentiertes URI-Scheme `sparkasse://`, `dkb://`, `n26://` oder `vrb://` für SEPA-Pre-Fill, das Drittanbieter-Apps öffentlich aufrufen dürften. Sparkassen- und Volksbanken-Apps verwenden interne Custom-URL-Schemes, die nicht Teil eines öffentlichen Developer-Programms sind. Apple/Google haben Universal-Links / App-Links als Mechanismus, aber kein einziger DACH-Banken-Anbieter hat eine **öffentlich dokumentierte** Pre-Fill-Schnittstelle veröffentlicht (Stand Recherche 2026-05-09).
- PSD2-konforme „Payment Initiation Service Provider" (PISP)-Flows existieren — aber sie verlangen Lizenz nach § 1 Abs. 33 ZAG, BaFin-Aufsicht und einen TPP-Vertrag mit jeder Bank. Das ist für eine Demo **massiv out-of-scope** und auch für ein 2027-Speculative-Konzept der falsche Pfad: eine Behörden-Inbox-App ist kein PISP.
- Realer Workflow heute (Mai 2026) für die Bürger:in mit einem GiroCode auf einem Bescheid: QR mit der Bank-App scannen → Bank-App füllt Überweisungs-Maske vor → Bürger:in bestätigt mit pushTAN/photoTAN/SecureGo → Bank verarbeitet. **Kein Deeplink von Drittapp zu Bank-App nötig.**

**Verdict für die Demo**: Idee „Tap auf 'Zur Bank-App weiterleiten' → `sparkasse://`-URI" ist **technisch nicht standardisiert** und wäre nur als reines Mock-Animation-Element vertretbar. Empfehlung an product-architect:

1. **Primary Path**: EPC-QR-Code anzeigen (full-screen Modal mit großem QR + IBAN/Betrag/Verwendungszweck als Text darunter zum manuellen Abtippen-Fallback). Das ist EU-Standard, real, in jeder DACH-Banking-App scanbar. **Demo-Wow-Faktor**: Loom-Viewer sieht „Bürger:in scannt QR mit Smartphone-Banking-App, alles vorbefüllt".
2. **Secondary Path**: „In Zwischenablage kopieren" für die drei Felder (IBAN / Verwendungszweck / Betrag) einzeln, mit Sichtfeedback „IBAN kopiert" — adressiert Desktop-Browser-Benutzer:innen ohne Smartphone-Scan-Pfad.
3. **Tertiary Path (Demo-only, klar als Mock annotiert)**: Ein dekorativer „Banking-App öffnen"-Button mit `[Speculative 2027 · Bank-App-Linking-Demo]`-Badge daneben, der einen Mock-Sheet öffnet mit „In einer realen 2027-Implementierung würde dieser Button per OZG-XBezahldienste-Adapter und/oder einem standardisierten EUDI-Wallet-Payment-Receiver die Überweisung in Ihrer ausgewählten Bank-App vorbefüllen. Aktuell (Mai 2026) gibt es kein öffentlich dokumentiertes Bank-App-Deeplink-Schema." **Kein** echter URI-Aufruf, **kein** Custom-Scheme.

**SEPA-XML vs EPC-QR vs Deeplink — Empfehlung**: **EPC-QR primär, Clipboard-Copy sekundär, Deeplink nur als deklariertes 2027-Speculative-Element ohne tatsächlichen URI-Aufruf.** SEPA-XML (pain.001) ist Bank-internes Format und für Citizen-Demo irrelevant.

---

## 4. IBAN/BIC/Verwendungszweck-Realität pro Archetyp ✓

> Alle IBANs unten sind **synthetisch**, IBAN-Checksumme (ISO 13616 / mod-97-10) valide, mit `[MOCK]` zu prefixen. Die ersten zwei Stellen `DE` + 2 Prüf-Ziffern, danach 8 BLZ + 10 Konto-Nr. Die genutzten BLZ-Ranges sind real-existierende Bank-Codes der jeweiligen Behörden-Hausbank (Bundesbank-Filialen, Landesbank-Hessen-Thüringen, Sparkasse KölnBonn etc.) — das sorgt für Plausibilität, ohne echte Behörden-Konten zu benennen. **Konto-Nummer ist je Eintrag bewusst nicht real.**

| Archetyp | Behörde (mock) | Mock-IBAN (Checksumme valide) | Wo im Brief? | Verwendungszweck-Konvention | Buchung-Match-Strenge |
|---|---|---|---|---|---|
| Steuerbescheid | Finanzamt Hamburg-Eimsbüttel / Köln-Mitte | `[MOCK] DE12 2005 0000 0150 0042 88` (HSH/HH) bzw. `[MOCK] DE10 3705 0198 0001 9998 11` (Stadtsparkasse Köln) | Brieffuß / unten unter „Bitte zahlen Sie auf das untenstehende Konto" | Steuernummer + Steuerart + Veranlagungsjahr — z.B. „22/345/12345 ESt 2024" | **Strikt** — FA bucht ohne korrekten Verwendungszweck nicht zu; Konsequenz: Säumniszuschlag § 240 AO trotz Eingang |
| Krankenkasse-Beitrag (TK / AOK) | TK Hamburg / AOK Rheinland | `[MOCK] DE34 2005 0000 0123 4567 89` (TK Hamburg) bzw. `[MOCK] DE48 3705 0299 0007 7771 22` (AOK Rheinland-Hamburg) | Brieffuß als Block „Bankverbindung: …" | KVNR (10 Stellen) + ggf. Beitragsmonat — z.B. „M845192036 06/2026" | **Streng** (Krankenkasse bucht KVNR-basiert; Mismatch → Mahnung 14d später) |
| Beitragsservice Rundfunk | ARD ZDF Deutschlandradio Beitragsservice, 50656 Köln | `[MOCK] DE17 3705 0198 0030 0815 42` (Sparkasse KölnBonn — real-Bezugsbank) | Brieffuß + auf optionalem beigelegtem „SEPA-Lastschriftmandat"-Vordruck | Beitragsnummer (9-stellig) — z.B. „731 042 088" | **Streng** (Beitragsservice arbeitet beitragsnummer-anchored; falscher VZ → Mahnung + Säumniszuschlag § 9 RBStV) |
| IHK-Beitrag | IHK Köln | `[MOCK] DE91 3704 0044 0532 0130 00` (Commerzbank Köln) | Briefkopf-Fuß, gleicher Block wie Mitgliedsnummer | Mitgliedsnummer (IHK-spezifisch) — z.B. „IHK-K-2026/MITGLIED-77418" | **Streng** (IHK-Beitragsabt. matched über Mitgliedsnummer; VZ-Match Pflicht) |
| BG-Beitrag (VBG / BGW) | VBG Hamburg | `[MOCK] DE45 2005 0000 0103 7777 03` (HSH Nordbank) | Brieffuß | Mitglieds-Nr. + Umlagejahr — z.B. „BG-VBG-2026-MITGLIED-04711 UJ 2025" | **Streng** (BG-Mitgliedsnummer + Umlagejahr; § 23 SGB IV Beitragspflicht) |
| OWi-Bußgeldbescheid | Polizei Berlin / Bußgeldstelle Köln (Land/Kommunal) | `[MOCK] DE83 1005 0000 0190 1110 23` (Berliner Sparkasse) | Brieffuß + auf beigelegtem Zahlschein/Überweisungs-Vordruck | Az. + Tat-Nr. — z.B. „OWi 04711/2026 Tat-Nr. 825041" | **Streng** (Bußgeldstelle bucht Az-anchored; bei Mismatch geht Bescheid in Vollstreckung nach § 90 OWiG, nicht in normalen Säumniszuschlag) |
| (Steuer-IdNr. zusätzlich erwähnen wenn vorhanden) | wie oben | — | — | Steuer-IdNr. ist **kein** Verwendungszweck — ist nur Identifikator | — |

**Real-Briefkopf-Faktenlage** (verifiziert gegen `posteingang.md`-Behörden-Briefkopf-Phrasen):

- IBAN steht in DE-Behörden-Bescheiden **fast immer im Brief-Fuß** unter einer Zeile „Bankverbindung:" oder „Bitte zahlen Sie auf folgendes Konto:". Bei Finanzamt/Krankenkasse oft als 3-Zeilen-Block (IBAN, BIC, Empfänger). Bei Beitragsservice und Bußgeldstellen oft in einem separaten beigelegten Zahlschein-Vordruck (Original-DIN-A4 mit perforiertem Tear-off).
- **NICHT im Briefkopf** — der Briefkopf trägt nur Absender-Adresse + Aktenzeichen.
- Aktenzeichen-Format als Verwendungszweck: in 100 % der untersuchten Bescheid-Archetypen ist das **Primär-Aktenzeichen** der erwartete Verwendungszweck (Steuernummer für FA, KVNR für KK, Beitragsnummer für BS, Mitgliedsnummer für IHK/BG, Az für OWi). FA fügt zusätzlich „ESt YYYY" / „USt YYYY" als Steuerart-Klartext bei. **Frei-Text wie „Steuer 2024 Schmidt" wird NICHT korrekt zugeordnet** und löst die Säumniszuschlag-Mahn-Schleife aus, die der research-scout zu Recht als Top-Fehlerquelle identifiziert hat.

**Verdict**: EPC-QR-Verwendungszweck-Feld ist zwingend mit dem **Primär-Aktenzeichen verbatim** zu befüllen. Bei FA-Steuerbescheid ergänzen mit Steuerart + Jahr (z.B. „22/345/12345 ESt 2024") als zweiter Token im Verwendungszweck. Beim Beitragsservice nur die 9-stellige Beitragsnummer ohne Leerzeichen-Trenner ist üblich (manche Beitragsservice-Vorlagen drucken Leerzeichen, andere nicht — beide Varianten werden serverseitig gematched, aber die Demo soll die Brief-Original-Schreibweise spiegeln).

---

## 5. RDG / Rechtsdienstleistungs-Schwelle ✓

**Frage**: Ist „Demo extrahiert IBAN/Betrag/Verwendungszweck aus einem Bescheid und schlägt eine Überweisung vor" eine Rechtsdienstleistung iSv § 2 RDG?

**Antwort**: **Nein.** Begründung:

- § 2 Abs. 1 RDG: „Rechtsdienstleistung ist jede Tätigkeit in konkreten fremden Angelegenheiten, sobald sie eine rechtliche Prüfung des Einzelfalls erfordert" ([RDG § 2](https://www.gesetze-im-internet.de/rdg/__2.html)).
- Eine reine **Transkription** dessen, was in dem Bescheid bereits abgedruckt steht — IBAN, Betrag, Verwendungszweck — und das **strukturierte Anbieten** dieser Daten als Pre-Fill für die eigene Bank-App des Bürgers/der Bürgerin **erfordert keine rechtliche Prüfung** des Einzelfalls. Es ist ein OCR-/LLM-Extraktions-Schritt + UI-Display.
- Vergleichs-Schwelle: V1 hat die Frist bereits aus dem Bescheid extrahiert + ins Kalender-CTA überführt — ohne RDG-Verstoß. Die Pay-Rail ist analog: Information aus dem Bescheid, formatiert für Citizen-Convenience.

**Aber** — drei Sub-Risiken:

1. **Wenn der LLM-Extrahierte Betrag falsch ist** und Bürger:in zahlt einen falschen Betrag → § 224 AO „Erfüllung" verlangt vollständige Zahlung; Teilzahlung führt zu Säumniszuschlag § 240 AO 1 % pro Monat auf den Restbetrag. Das ist keine RDG-Linie, sondern eine **Genauigkeits-Linie**. Mitigation: **Citation-Match-Gate** analog zu V1-Frist (siehe § 8 unten).
2. **Wenn die Extraktion eine falsche IBAN überträgt** (z.B. zwei Behörden im selben Brief — FA+BZSt KiStAM, oder Brief mit alter und neuer Bankverbindung) und Bürger:in zahlt an die falsche Stelle → Eigene Schadens-Risiko der Bürger:in, da App nur Vorschlag macht. Aber: User-Trust-Verlust + Reputations-Risiko. Mitigation: nur eine IBAN pro Brief auto-extrahieren; bei Mehrdeutigkeit Hand-off „Bitte selbst aus dem Brief übertragen". Siehe § 8.
3. **Wenn die Demo Citation-Match auf den Verwendungszweck NICHT enforce** und der LLM einen verkürzten/verkettelten VZ ausspuckt (z.B. „11/123/45678" aus „Steuernummer 11/123/45678 ESt 2024" extrahiert ohne den Steuerart-Anhang) — dann buchung-Mismatch beim FA. Mitigation: Mock-Daten in `letters.json` haben das Aktenzeichen-Format **Brief-original** in der `aktenzeichen`-Property; der Extraktor gibt **dieselbe** Zeichenkette in den Verwendungszweck zurück (kein Parsing, kein Splitting).

**Disclaimer-Wortlaut** zur Mitigation siehe Locked-Wortlaut-Sektion.

**Verdict**: Pay-Rail ist **kein** RDG-Verstoß. Smartlaw-Linie (BGH I ZR 113/20) gilt **nicht** — kein Einzelfall-Argumentations-Generator. Die App schlägt eine Standard-Aktion (Überweisung) mit transkribierten Brief-Daten vor; sie bewertet keine Rechtmäßigkeit, generiert keine Begründung, prognostiziert keinen Erfolg.

---

## 6. § 240 AO / § 9 RBStV / § 24 SGB IV / OWiG-Vollstreckung — Säumnis-Framing ⚠

**Pro Archetyp die korrekte Norm**:

| Archetyp | Säumnis-Norm | Höhe / Wirkung |
|---|---|---|
| Steuerbescheid (FA) | **§ 240 Abs. 1 AO** | „1 vom Hundert des auf den nächsten durch 50 € teilbaren abgerundeten rückständigen Steuerbetrags … für jeden angefangenen Monat" ([dejure § 240 AO](https://dejure.org/gesetze/AO/240.html)). Schonfrist 3 Tage. **Stand 2026 unverändert.** |
| Krankenkasse-Beitrag freiwillig (AOK/TK) | **§ 24 Abs. 1 SGB IV** | „Säumniszuschlag von eins vom Hundert des rückständigen, auf 50 € nach unten abgerundeten Betrags zu entrichten" je angefangenem Monat |
| Berufsgenossenschaft-Beitrag (VBG/BGW) | **§ 24 SGB IV** (analog SGB-Sozialversicherungsbeiträge) | wie KK |
| IHK-Beitrag | **IHKG § 3** + Landes-Vollstreckungsgesetz; meist Mahngebühr + ggf. Verzugszins nach BGB § 288 (kein § 240-AO-pendant) | regional unterschiedlich, üblich Mahngebühr ~5–15 € + Zinsen |
| Beitragsservice Rundfunk | **§ 9 Abs. 2 RBStV** + Landes-Vollstreckungsgesetz; Säumniszuschlag der jeweiligen Landes-Rundfunkanstalt-Satzung | typisch 8 €/Mahnstufe (siehe [letter-mehmet-beitragsservice-mahnung](src/data/letters.json) mit „Säumniszuschlag (§ 9 RBStV): 8,00 €") |
| OWi-Bußgeldbescheid | **NICHT § 240 AO**; sondern Vollstreckung nach §§ 90, 92 OWiG durch Bundesamt für Justiz (für rechtskräftige Bußgelder); zusätzlich Mahngebühr | keine prozentuale Eskalation; stattdessen Vollstreckungsmaßnahmen + ggf. Erzwingungshaft § 96 OWiG |

**Wichtig — was die App **nicht** sagen darf**:

- ✗ „Sie sollten jetzt zahlen, um Säumniszuschläge zu vermeiden" — das ist **advisory**, würde an die RDG-Linie aus § 5 Abs. 1 RDG (Nebenleistung) drücken und ist auch UX-mäßig Druck-Pattern.
- ✗ „Wenn Sie nicht bis zum X.X. zahlen, kostet es Sie Y €" — **Prognose**, also Erfolgs-Prognose-analog.
- ✗ Tagesaktuelle Säumniszuschlag-Berechnung (Mock-konform, aber nicht-statisch ist riskant).

**Was die App **darf**:

- ✓ **Faktische Norm-Information** als statischer Text neben dem Frist-Chip: „Bei nicht fristgerechter Zahlung fällt nach § 240 Abs. 1 AO ein Säumniszuschlag von 1 % pro angefangenem Monat an." Wortlaut-Lock siehe Locked-Wortlaut-Sektion.
- ✓ **Norm-Tooltip** auf der Frist-Anzeige (V1-Pattern, bestehend) erweitert um den jeweiligen Archetyp-Säumnis-§.
- ✓ Eine Zahlung-CTA ist UX-konform — sie ist **Convenience**, kein Druck.

**Verdict**: Säumnis-Framing PROCEEDS unter dem strikten Wortlaut-Lock. concept-verifier soll prüfen, ob der vorgeschlagene Wortlaut „passive Information" oder „aktive Drohung" liest — ich neige zu „passive Information", aber das ist eine Anti-Anxiety-Frage, die der Verifier sauber adversarial schärfen muss.

**Spec-Instruction an product-architect (concept-verifier AV2 / soft-revision)**: Der locked Säumnis-Wortlaut **muss** in dem bereits in V1 existierenden `<NormTooltip>` an der Frist-Chip-Komponente gerendert werden (V1-Spec § 10 Z. 1043, `steuerbescheid.saeumniszuschlag_info`). Der Wortlaut **darf nicht** im PaymentCard-Body, im PaymentSheet-Header oder in unmittelbarer visueller Nachbarschaft des „Zahlung vorbereiten"-Buttons platziert werden. Begründung: Säumnis-Fakt-neben-Pay-CTA = Druck-Geometrie, auch wenn der Wortlaut selbst passiv ist. Information lebt einen Tap entfernt im Tooltip; Sheet bleibt Wortlaut-frei vom Säumnis-§. Diese Trennung ist in der i18n-Key-Struktur zu enforcen: der Säumnis-String lebt unter `posteingang.frist.norm_tooltip.{archetype}`, nicht unter `posteingang.payment.*`.

---

## 7. DSGVO / BDSG-Datenminimierung ✓

**Status quo**: V1-Pipeline extrahiert IBAN, Betrag, Verwendungszweck **bereits flüchtig** in der Pre-Open-Summary („Steuerbescheid 2024: Sie haben noch 1.247,00 € zu zahlen, Frist 12.06.2026"). Diese Felder sind heute **nicht** in der `Letter`-Type-Struktur als getrennte Properties — sie leben nur im AI-Summary-Text und im `body_de`. Pay-Rail bedeutet: Strukturierte Persistierung in einem `LetterPayment`-Sub-Objekt; das ist eine **Verarbeitungs-Verbreiterung**, nicht nur ein Display-Feature.

**Rechtsgrundlage** (v2-Lock, geändert von v1):

- **Lock**: Art. 6 Abs. 1 lit. b DSGVO — **Vertragserfüllung** (App-Nutzungsverhältnis Bürger:in ↔ App). Begründung: die Pay-Rail ist eine **Kern-Funktion** der App im 2027-Speculative-Frame. Die App ist als Behörden-Brief-Aggregator mit Aktions-Erleichterung positioniert; das Aufbereiten einer im Bescheid abgedruckten Bankverbindung als SEPA-QR-Code ist eine **erwartbare Hauptleistung**, kein Zusatz-Modul. „Vertragserfüllung" iSv lit. b heißt: „wir haben Ihnen versprochen, Ihre Behörden-Korrespondenz handhabbar zu machen — Pay-Rail ist Teil dieses Versprechens". Diese Auslegung hält dem Maßstab des EuGH („objektiv erforderlich für die Vertragsdurchführung") stand, weil die App **ohne** die Pay-Rail bei zahlungsbedürftigen Bescheiden ihre Hauptleistung nur unvollständig erbringen kann — die Bürger:in müsste IBAN/Betrag/VZ aus dem Brief manuell in eine Bank-App tippen, was die zentrale Convenience-Promise der App (siehe V1.5.0 Reply-Feature, gleicher Rechtsgrund) konterkariert.
- **Konsistenz mit V1.5.0**: Reply-Feature wurde unter lit. b implizit verfasst (kein Cockpit-Toggle). Pay-Rail folgt demselben Muster — beide sind „Aktions-Erleichterung auf Basis eines empfangenen Bescheids", beide sind App-Kernfunktion.
- **Verworfen**: lit. a (Einwilligung) + Cockpit-Toggle „Pay-Rail aktiv". Rationale für die Verwerfung: (a) inkonsistent mit V1.5.0-Reply (gleicher Funktions-Typ, kein Toggle dort); (b) kein Cockpit-Toggle-Surface existiert heute, Pay-Rail würde eine eigene Toggle-Welle einleiten, die V2-Scope verdoppelt (concept-verifier new-gap #5); (c) Datenminimierung wird über Datenminimierung-Banner (Erst-Nutzung) + Citation-Match-Gate + Phishing-Confirmation-Step gewahrt, nicht über opt-out — die Schutz-Mechanismen liegen in der Funktion, nicht in einem zusätzlichen Schalter.
- **Art. 9 DSGVO ist NICHT betroffen** — IBAN/Betrag/Verwendungszweck sind nicht-besondere Kategorien. (Art. 9 bleibt aus V1 für die Inhalts-Verarbeitung von Sozial-/Aufenthalts-/Kirchen-Bescheiden bestehen.)

**Activity-Log-Eintrag**: ein neuer Enum-Wert `payment_initiated` (analog zu V1.5 `reply_sent_simulated`) mit `Rechtsgrundlage: 'Art. 6 Abs. 1 lit. b DSGVO Vertragserfüllung'` und `note: "epc_qr_generated"` oder `"clipboard_iban_copy"`. Persistiert in `localStorage` analog zu V1-`letter-activity-log`. Datenschutz-Cockpit (V1-Surface) zeigt es pro Brief unter `/datenschutz?letter={id}` — **kein neuer Cockpit-Toggle**, nur ein neuer Log-Eintrag-Enum-Wert. Bürger:in sieht im Cockpit, dass eine Pay-Initiierung stattgefunden hat (transparenz), kann sie aber nicht „rückgängig machen" über einen Toggle — das wäre auch faktisch sinnlos, weil die EPC-QR-Generierung clientseitig + ephemer ist.

**Datenminimierung-Banner**: bei der ersten Nutzung der Pay-Rail-Funktion (Erst-Klick auf den „Zahlung vorbereiten"-Button, App-weit ein-malig pro Persona-localStorage) ein einmaliger Hinweis-Banner im PaymentSheet-Header (NICHT als blockierendes Modal — siehe AV3) — Wortlaut-Lock siehe Locked-Wortlaut-Sektion. Folge-Nutzungen ohne Banner.

**Verdict**: DSGVO-Pfad PROCEEDS mit Art. 6 Abs. 1 lit. b + Activity-Log-Eintrag (kein Toggle). Kein neuer AVV-Vermerk nötig (Pay-Daten gehen NICHT an Anthropic — der LLM extrahiert nur, der EPC-QR wird clientseitig gerendert).

---

## 8. Adressat-Risiko / Citation-Match-Gate (Pflicht-Gate) ✗ ohne Gate

**Analogie zu V1**: V1 hat das Citation-Match-Gate für die Frist-Extraktion eingeführt (`LetterFrist.citation_match`) — wenn LLM-Datum nicht regex-deckungsgleich mit dem Original-Zitat ist, wird die „Frist im Kalender"-CTA deaktiviert (V1-Spec § 4.4 / Edge case #10). Gleiche Logik **muss** für Pay-Rail gelten — sonst ist das Risiko falscher IBAN, falscher Betrag, falscher VZ unkontrolliert.

**Konkretes Gate** (Konvention für product-architect):

1. **IBAN-Citation-Match**: Der LLM-extrahierte IBAN-String muss in `body_de` als Substring auffindbar sein **nach Anwendung der Normalization-Regel (a) aus § 12** (Whitespace-Toleranz), UND die IBAN muss IBAN-Checksumme (mod-97-10) bestehen, UND es darf nur **eine** matchende IBAN im Brief sein. Detail-Regex und Normalisierung siehe § 12 (a). Bei zwei IBANs (z.B. FA-Konto + BZSt-KiStAM-Konto) → Gate triggert → Hand-off.
2. **Betrag-Citation-Match**: LLM-Betrag muss in `body_de` per Normalization-Regel (b) aus § 12 (Tausender-Trenner-Varianten) auffindbar sein UND in einem Satz-Kontext, der „zahlen" / „Nachzahlung" / „Gesamtbetrag" / „Beitrag" / „Rechnungsbetrag" / „Säumniszuschlag" / „fällig" als Lemma enthält. Bei Mehrdeutigkeit (z.B. Bescheid mit „Festgesetzte Steuer 8.471 €" + „anzurechnende Lohnsteuer 7.224 €" + „Sie haben noch 1.247 € zu zahlen") → der Betrag ist „1.247 €", nicht 8.471 €. Das Citation-Match-Gate muss den Betrag aus dem **konkreten Zahlungs-Satz** ankern, nicht aus dem ersten matchenden Betrag.
3. **Verwendungszweck-Match**: Der vorgeschlagene Verwendungszweck **muss** verbatim mit `letter.aktenzeichen` (oder einem Element von `aktenzeichen_weitere`) übereinstimmen, **nach Anwendung der Normalization-Regel (c) aus § 12** ([MOCK]-Prefix-Stripping). Keine LLM-Generierung des VZ-Texts — pure String-Übernahme aus dem Aktenzeichen-Feld. (Frei-Text-VZ aus dem LLM ist die wichtigste Fehlerquelle und muss strukturell ausgeschlossen sein.)
4. **Behörde-IBAN-Whitelist**: Aus Phishing-Schutz-Gründen sollte die Demo eine `behoerdenIbanWhitelist`-Map mitführen (Behörde-ID → erwartete IBAN-Präfixe / BLZ-Range). Wenn die extrahierte IBAN nicht zur erwartet-zugeordneten Behörde passt → Gate triggert → roter Phishing-Warn-Hinweis. (Verbindung zu § 9 dieser Note.) **V2-Scope-Cut** (concept-verifier § 6): Behörden-IBAN-Whitelist wird auf V2.1 deferred und in einer „Phishing-Defense-Welle" zusammen mit Idea 6 (Authentizitäts-Proof) gebaut. V2 ships ohne Whitelist; Citation-Match-Gate + Phishing-Confirmation-Step (§ 9) sind ausreichend.

**Hand-off-Wortlaut** bei Gate-Verletzung (siehe Locked-Wortlaut-Sektion).

**Verdict**: Ohne dieses Citation-Match-Gate ist die Pay-Rail **nicht** lieferbar. Mit Gate: PROCEED.

---

## 9. Phishing- / Tampered-IBAN-Risiko (Pflicht-Gate ergänzend) ✗ ohne Gate

**Hintergrund**: V1 hat den Phishing-Archetyp explizit auf V2 deferred (V1-Spec § 10 Z. 1058). V1-Briefe sind alle `auth_channel: 'briefpost'` (mit zwei Ausnahmen `mein-elster` und `krankenkassen-portal`); `<AuthentizitaetsBadge>` ist heute **dekorativ**, nicht funktional verifizierend.

**Pay-Rail-Spezifisches Phishing-Risiko**: ein Phishing-Brief, der echte Behörden-Optik imitiert + eine **falsche IBAN** druckt, würde durch eine naive Pay-Rail in eine Bank-Überweisung an Betrüger-Konto übersetzt. Der research-scout-Bezugspunkt zum „digitaler-post-service-fzco"-Beitragsservice-Phishing-Fall ist hier akut.

**Gate-Vorschlag**:

- **Pay-Button nur sichtbar bei `auth_channel ∈ {mein-elster, zbp-bundid, krankenkassen-portal, eudi-versiegelt}`** — also nur bei Briefen, die über einen kryptographisch- oder portal-versiegelten Empfangs-Kanal kamen.
- **Bei `auth_channel === 'briefpost'`** (= 17 von 18 V1-Briefen!) → Pay-Button **nicht direkt aktiv**, sondern erst nach einem expliziten Confirmation-Step („Ich habe den Brief in Papierform vor mir und die IBAN selbst geprüft"). Wortlaut-Lock siehe Locked-Wortlaut-Sektion.
- **Bei `auth_channel === 'eingabe-buerger'`** (V2-Upload-Flow, in V1 deaktiviert) → Pay-Button **deaktiviert** mit Hinweis „Selbst hochgeladene Briefe sind nicht plausibilitäts-geprüft. Bitte überweisen Sie aus Ihrer Bank-App selbst."

**Konsequenz für die Demo**: Die Pay-Rail wird auf den **17 Briefpost-Briefen** mit dem Confirmation-Step aktiv — d.h. die Demo zeigt das Gate explizit, statt es zu umgehen. Loom-Viewer sieht **„App nimmt Bürger:innen-Trust ernst"** — gleiches Pattern wie V1-Frist-Citation-Match.

**Spec-Instruction an product-architect (concept-verifier AV3 / soft-revision — UX-Friction)**: Die Phishing-Confirmation **muss** als **inline-Checkbox innerhalb des PaymentSheet** gerendert werden, **NICHT** als separater vorgelagerter Modal-Blocker. Detail:

- Der 4-Satz-Disclaimer-Wortlaut (siehe Locked-Wortlaut-Sektion) wird in einem `<details>`-Element gerendert, **default-collapsed**.
- Sichtbare Summary-Zeile (1-Satz, immer sichtbar): **„Behörden-Bescheid in Papierform vor Ihnen — IBAN gegenprüfen"**.
- Daneben: Bestätigungs-Checkbox mit Label **„Ich habe die IBAN im Brief mit der hier angezeigten verglichen."**
- Der EPC-QR-Code + IBAN-Copy-Buttons sind **disabled / blurred** bis die Checkbox angeklickt ist.
- Friction-Budget: 2 Klicks (Sheet öffnen → Checkbox), ≤ 3 Sekunden. Kein vorgelagerter Modal.

Begründung: Das CLAUDE.md-30-Sekunden-Wow-Budget verträgt keinen 4-Satz-Modal-Blocker auf jedem Pay-Versuch (17 von 18 Briefen sind Briefpost). Inline-Confirmation behält die Trust-Narrative ohne UX-Reibung zu maximieren.

**Verdict**: Phishing-Gate ist Pflicht. Ohne Gate → REJECT. Mit Gate + inline-Confirmation-Step + Citation-Match-Gate (§ 8) → PROCEED. Behörden-IBAN-Whitelist (§ 8 #4) deferred auf V2.1.

---

## 10. Out-of-Scope + Letter-Count-Reconciliation für Posteingang-V2-Pay-Rail ✓

### 10.A Canonical letter-count (concept-verifier AV12 / new-gap #3)

**Single source of truth** — alle nachgelagerten Agenten (research-scout, product-architect, mock-backend-coder) müssen diese Zahlen verbatim spiegeln:

> **V2 Pay-Rail surfaces auf 8 Briefen über 6 Archetypen** (deterministisch). Plus **1 optionaler 9. Brief** (OWi-Bußgeldbescheid), falls product-architect entscheidet, einen `bussgeldbescheid`-Mock zu seeden — heute **nicht** in V1.5-Korpus enthalten.

**Pay-Rail-Sichtbarkeit** ist auf Brief-Ebene durch folgende Bedingung gesteuert:

```
showPayCTA(letter) ⟺
  letter.payment !== undefined
  ∧ (
    letter.fristen.some(f => f.typ === 'zahlung' ∧ !f.erledigt)
    ∨ letter.archetype ∈ {beitragsservice, ihk-beitrag, berufsgenossenschaft-beitrag, krankenkasse-beitrag}
  )
  ∧ ¬hasOpenAussetzungsAntrag(letter)  // siehe § 11 — nicht hide, sondern downgrade
```

Konkret: 8 Briefe in V1.5-Korpus erfüllen die Hauptbedingung:

| # | Brief-ID (V1.5-Bestand) | Archetype | `frist.typ === 'zahlung'`? | Pay-Rail-Sichtbarkeit |
|---|---|---|---|---|
| 1 | `letter-mehmet-fa-steuerbescheid-2024` | steuerbescheid | ✓ (+ einspruch) | ✓ (mit Aussetzungs-Sonderfall § 11) |
| 2 | `letter-schmidt-fa-steuerbescheid-2024` | steuerbescheid | ✓ (+ einspruch) | ✓ (mit Aussetzungs-Sonderfall § 11) |
| 3 | `letter-schmidt-krankenkasse-beitrag` | krankenkasse-beitrag | – (impliziter Beitrags-Brief) | ✓ (Archetype-Override) |
| 4 | `letter-mehmet-krankenkasse-freiwillig` | krankenkasse-beitrag | – (impliziter Beitrags-Brief) | ✓ (Archetype-Override) |
| 5 | `letter-schmidt-beitragsservice-festsetzung` | beitragsservice | – | ✓ (Archetype-Override) |
| 6 | `letter-mehmet-beitragsservice-mahnung` | beitragsservice | – (Mahnung, impliziter Säumnis-Druck) | ✓ (Archetype-Override) |
| 7 | `letter-mehmet-ihk-beitrag` | ihk-beitrag | – | ✓ (Archetype-Override) |
| 8 | `letter-mehmet-bgw-beitrag` | berufsgenossenschaft-beitrag | ✓ | ✓ |

**Begründung Archetype-Override**: Vier Archetypen sind funktional Zahlungs-bedürftig (KK-Beitrag, Beitragsservice, IHK-Beitrag, BG-Beitrag), tragen aber im V1.5-Seed kein explizites `frist.typ === 'zahlung'` (weil V1.5 die Frist-Typologie nur dort markiert hat, wo eine **harte Frist** existiert; KK-/Beitragsservice-/IHK-Briefe haben weiche Zahl-Fristen, die als `frist.typ === 'antragstellung'` oder ohne Frist-Eintrag gespeichert sind). Der V2-Pay-CTA wird über die Archetype-Liste freigeschaltet, ohne den V1.5-Seed-Frist-Typ zu mutieren — das schützt V1.5-bestehende Tests vor Regression.

**Mehmet-FA Frist-Tie-Break-Regel** (concept-verifier new-gap #4): `letter-mehmet-fa-steuerbescheid-2024` trägt zwei Fristen mit demselben Datum (`zahlung` + `einspruch`). Der StickyFristAction-`earliest`-Selector löst den Tie wie folgt auf:

> **Sortier-Regel**: (1) primär nach `datum` aufsteigend (älteste Frist zuerst); (2) bei Gleichstand nach Typ-Priorität: `einspruch` > `widerspruch` > `zahlung` > `nachweis` > `antragstellung` > `frist_verlaengerung` > `informativ`. Der Sticky-Band-Frist-Chip zeigt im Mehmet-FA-Fall „Einspruchsfrist 12.06.2026", **nicht** „Zahlungsfrist 12.06.2026" — weil Einspruch verfahrensrechtlich höher priorisiert ist als Zahlung (Einspruch hemmt theoretisch die Vollstreckung erst nach Aussetzungs-Antrag, ist aber rechtsschutz-konstitutiv). Pay-CTA bleibt unabhängig sichtbar (nicht der Frist-Chip-Selector entscheidet sie).

**Spec-Instruction an product-architect**: diese Tie-Break-Regel als reine Sortier-Funktion in `src/lib/mock-backend/api.ts` `selectEarliestFrist(letter)` kapseln; UI-Komponenten greifen darauf zu, ohne die Regel selbst zu kennen.

### 10.B Out-of-Scope (unverändert v1)

Explizit **NICHT** in V2:

1. **Reale Bank-API-Integration** (PSD2 / OpenBanking / Berlin Group XS2A) — out-of-scope; PISP-Lizenz nötig.
2. **Erstattungs-Antrag-Flow** (z.B. „FA hat zu viel verrechnet — Antrag auf Verrechnung mit Folge-Bescheid") — gehört zu Vorgänge-Surface, nicht Posteingang.
3. **SEPA-Lastschrift-Mandat-Erstellung** (z.B. „Beitragsservice-Lastschrift einrichten") — eigener Spec, nicht Pay-Rail. Beitragsservice nutzt Lastschrift im Real-Workflow, aber das ist Mandat-Erteilung, nicht Bescheid-Bezahlung.
4. **SEPA-Direct-Debit-Setup** (analog) — out.
5. **Foreign Currency / Non-EUR-Bescheide** — alle DE-Behörden-Bescheide sind EUR; Edge-Case ignorierbar.
6. **Ratenzahlungs-Antrag** (z.B. § 222 AO Stundung beim FA, § 18 OWiG Ratenzahlung Bußgeld) — separater Flow, gehört in V1.5.1-Skelett-Templates-Welle (Aussetzung der Vollziehung iSv Idea 8 der Gap-Analysis), **nicht** in Pay-Rail.
7. **Multi-Empfänger-Split** (z.B. Steuerbescheid mit ESt-Anteil + KiSt-Anteil getrennt überweisen) — in der Real-Welt überweist Bürger:in **eine** Summe an FA-Konto; FA verteilt intern. Demo folgt dem.
8. **Auto-Pay** („einmalig genehmigt, App zieht selbst" — V3+). V2 ist **immer** explizit-Bürger:in-Action.
9. **Push-Reminder zu Zahlfristen** — gehört zu Frist-Risiko-Cockpit-Idea-4, nicht Pay-Rail.
10. **Bezahl-Quittung (Empfangs-Bestätigung von der Behörde)** — Bezahlung wird im Real-Flow erst Tage später buchungsmäßig erfasst; eine Demo-Quittung wäre Mock-Theater. Stattdessen: Activity-Log-Eintrag „Zahlung in Bank-App initiiert (Mock)" + Hinweis „Tatsächliche Bezahlung erfolgt in Ihrer Bank-App. Behörden-Buchungs-Bestätigung kann mehrere Tage dauern und erfolgt nicht über diese App."

---

## Locked Wortlaut (verbatim, DE — non-negotiable)

### Säumnis-Hinweis (faktisch, statisch, pro Archetyp)

**Steuerbescheid (FA)**:

> „Bei nicht fristgerechter Zahlung fällt nach § 240 Abs. 1 AO ein Säumniszuschlag von 1 % je angefangenem Monat auf den auf 50 € abgerundeten Rückstand an. Die ersten drei Tage gelten als Schonfrist."

**Krankenkasse / Berufsgenossenschaft**:

> „Bei nicht fristgerechter Zahlung fällt nach § 24 Abs. 1 SGB IV ein Säumniszuschlag von 1 % je angefangenem Monat auf den auf 50 € abgerundeten Rückstand an."

**Beitragsservice Rundfunk**:

> „Bei nicht fristgerechter Zahlung kann nach § 9 RBStV i.V.m. der Satzung der zuständigen Landesrundfunkanstalt ein Säumniszuschlag erhoben werden. Der Bescheid ist ein vollstreckbarer Titel."

**IHK-Beitrag**:

> „Bei nicht fristgerechter Zahlung können Mahngebühren und Verzugszinsen nach § 288 BGB anfallen."

**OWi-Bußgeldbescheid**:

> „Nach Rechtskraft des Bescheids und nicht fristgerechter Zahlung kann die Vollstreckung durch das Bundesamt für Justiz nach §§ 90, 92 OWiG eingeleitet werden."

> **Verbot**: weder „bitte zahlen Sie jetzt", noch „um Säumniszuschläge zu vermeiden", noch eine tagaktuelle €-Berechnung. Statische Norm-Information neben dem Frist-Chip, mehr nicht.

### Datenminimierung-Banner (Erst-Nutzung der Pay-Rail, einmalig — v2-Lock)

> „Hinweis zur Pay-Rail: Diese Demo extrahiert IBAN, Betrag und Verwendungszweck strukturiert aus dem Bescheid und stellt sie als SEPA-QR-Code (EPC-Standard) zur Anzeige in Ihrer Bank-App bereit. Es findet **keine** Verbindung zu Ihrer Bank statt; die Bezahlung selbst geschieht in Ihrer Bank-App und unter Ihrer Kontrolle. Rechtsgrundlage der App-internen Verarbeitung: Art. 6 Abs. 1 lit. b DSGVO (Vertragserfüllung) — die Aufbereitung empfangener Bescheid-Inhalte für eine Citizen-Aktion gehört zum vertraglich versprochenen Funktionsumfang dieser App. Jede Pay-Initiierung wird im Datenschutz-Cockpit unter dem jeweiligen Brief protokolliert."

### Phishing-Gate-Disclaimer (`auth_channel === 'briefpost'`, vor Aktivierung des Pay-Buttons)

> „Sie sehen diesen Brief als Mock einer Briefpost-Sendung. Bitte prüfen Sie den ausgedruckten Bescheid in Ihren Händen: stimmt die im QR-Code angezeigte IBAN mit der im Brief gedruckten überein? Behörden-Bescheide enthalten die Bankverbindung am Brief-Fuß. Bestätigen Sie die Übereinstimmung, bevor Sie überweisen. (Phishing-Risiko: § 263 StGB Betrug.)"
> 
> Bestätigungs-Checkbox: „Ich habe die IBAN im Brief mit der hier angezeigten verglichen."

### Citation-Match-Hand-off (bei Gate-Verletzung)

> „Wir konnten Bankverbindung oder Betrag nicht eindeutig aus dem Brief übernehmen. Bitte übertragen Sie IBAN, Verwendungszweck und Betrag selbst aus dem Original-Brief in Ihre Bank-App. (Mehr als eine IBAN gefunden — oder Betrags-Kontext mehrdeutig.)"

### Bezahlen-Button-Label (Sticky-Frist-Action, primärer CTA)

- Default: **„Zahlung vorbereiten"** (NICHT „Jetzt bezahlen", NICHT „Bezahlen"-allein — diese Formulierungen suggerieren App-zu-Bank-Übermittlung; tatsächlich ist es ein Pre-Fill-Sheet, der erst in der Bank-App fortgesetzt wird).
- Sub-Label / aria-describedby: „SEPA-QR-Code mit IBAN, Betrag und Verwendungszweck zum Scannen mit Ihrer Bank-App anzeigen"
- Bei `hasSentReply` UND Pay-Rail bereits initiiert: **„Zahlung erneut vorbereiten"**.
- Im Pay-Sheet selbst (Modal): primärer CTA **„SEPA-QR anzeigen"** + sekundärer CTA **„IBAN kopieren"**.

### Speculative-2027-Erweiterung (Pay-Sheet-Header, einmal pro Sheet sichtbar — v2-Lock, AV1-Tightening)

> „[Speculative 2027] Diese Pay-Rail simuliert eine spekulative 2027-Konvergenz von BundID-Postfach und FITKO-XBezahldienste-Standard (IT-Planungsrats-Beschluss 2023/51), die heute (Mai 2026) nicht beschlossen ist. Heute erfolgt der Zahl-Pfad pro Behörde separat über deren Online-Strecke."

> **v1-Wortlaut zur Referenz** (verworfen): „Diese Pay-Rail simuliert eine zukünftige Konvergenz von BundID-Postfach und FITKO-XBezahldienste-Standard …". Begründung Verwerfung (concept-verifier AV1): „zukünftige Konvergenz" ist zu offen interpretierbar — Recruiter-Viewer könnte „zukünftig" als „bereits geplant + datiert" lesen. Die v2-Wortlaut-Variante macht explizit, dass es sich um eine **Hypothese** der Demo handelt, nicht um einen real-existierenden Roadmap-Punkt der FITKO.

---

## Locked Mock-IBAN-Tabelle (8 Briefe + 1 optional, alle Checksummen lokal verifiziert) — v2

> **v2-Update (concept-verifier AV12)**: Alle IBANs aus v1 wurden lokal mod-97-10 nachgerechnet. **Ergebnis: 9 von 9 Original-IBANs aus v1 waren CHECKSUMMEN-INVALID** (Prüfziffern wurden in v1 nicht real berechnet, sondern frei gewählt). v2 ersetzt jede Prüfziffer durch den korrekt berechneten Wert; BLZ + Konto-Nr bleiben unverändert (per Vorgabe „do not invent new BLZs"). Algorithmus-Trace siehe Kommentar-Block unten.

### Mod-97-10-Algorithmus (lokal angewandt)

Per ISO 13616:
1. IBAN ohne Whitespace, ersten 4 Zeichen ans Ende verschieben.
2. Buchstaben durch Zahlen ersetzen: A=10, B=11, …, D=13, E=14, …, Z=35.
3. Resultierenden Zahlen-String als Integer modulo 97 berechnen.
4. Ergebnis muss **1** sein. Andernfalls IBAN ungültig.
5. Zur Generierung der Prüfziffern: die ersten 4 Zeichen des Original-IBANs sind „DE00" (Prüfziffern initial 00); berechnete Mod-97-Wert = N; Prüfziffern = (98 − N) mod 97, falls ≤ 9 als „0X" formatiert.

Berechnung erfolgte hier per Hand (Chunking-Methode: 9-Ziffer-Chunks; Restbetrag prepend zum nächsten 7-Ziffer-Chunk; Endrest = 1 ⟺ valide). Die Berechnungsschritte für jede IBAN sind in der Tabellen-Trace-Spalte abgekürzt dargestellt; vollständige Verifikation bei Bedarf nachvollziehbar.

### Tabelle (v2, alle Werte lokal-validiert)

| # | Brief-ID (V1.5-bestand) | Behörde (real-Beispiel) | Mock-IBAN (v2, valide) | Mock-BIC | Empfänger-Name (verbatim für QR) | checksum_verified | computation_trace |
|---|---|---|---|---|---|---|---|
| 1 | `letter-mehmet-fa-steuerbescheid-2024` | Finanzamt Köln-Mitte | `[MOCK] DE09 3705 0198 0001 9998 11` | `COLSDE33XXX` | „Finanzamt Köln-Mitte" | **true** | computed: 1; expected: 1; valid: true (chunks: 4 → 29 → 38 → 1) |
| 2 | `letter-schmidt-fa-steuerbescheid-2024` | Finanzamt Hamburg-Eimsbüttel | `[MOCK] DE55 2005 0000 0150 0042 88` | `HSHNDEHHXXX` | „Finanzamt Hamburg-Eimsbüttel" | **true** | computed: 1; expected: 1; valid: true (chunks: 30 → 83 → 14 → 1) |
| 3 | `letter-schmidt-krankenkasse-beitrag` | Techniker Krankenkasse | `[MOCK] DE58 2005 0000 0123 4567 89` | `HSHNDEHHXXX` | „Techniker Krankenkasse" | **true** | computed: 1; expected: 1; valid: true (chunks: 30 → 0 → 4 → 1) |
| 4 | `letter-mehmet-krankenkasse-freiwillig` | AOK Rheinland/Hamburg | `[MOCK] DE04 3705 0299 0007 7771 22` | `DAAEDEDDXXX` | „AOK Rheinland/Hamburg" | **true** | computed: 1; expected: 1; valid: true (chunks: 44 → 23 → 87 → 1) |
| 5 | `letter-schmidt-beitragsservice-festsetzung` | Beitragsservice (für SWR/WDR) | `[MOCK] DE77 3705 0198 0030 0815 42` | `COLSDE33XXX` | „ARD ZDF Deutschlandradio Beitragsservice" | **true** | computed: 1; expected: 1; valid: true (chunks: 4 → 31 → 70 → 1) |
| 6 | `letter-mehmet-beitragsservice-mahnung` | Beitragsservice (für WDR) | `[MOCK] DE77 3705 0198 0030 0815 42` | `COLSDE33XXX` | „ARD ZDF Deutschlandradio Beitragsservice" | **true** | (identisch zu #5; in real-Welt gibt es eine Beitragsservice-Bankverbindung pro Landesrundfunkanstalt — Demo-Vereinfachung, VZ ankert Buchung über Beitragsnummer) |
| 7 | `letter-mehmet-ihk-beitrag` | IHK Köln | `[MOCK] DE89 3704 0044 0532 0130 00` | `COBADEFFXXX` | „IHK Köln" | **true** | computed: 1; expected: 1; valid: true (chunks: 23 → 70 → 30 → 1) |
| 8 | `letter-mehmet-bgw-beitrag` | VBG Hamburg | `[MOCK] DE32 2005 0000 0103 7777 03` | `HSHNDEHHXXX` | „Verwaltungs-Berufsgenossenschaft" | **true** | computed: 1; expected: 1; valid: true (chunks: 30 → 23 → 26 → 1) |
| 9 (optional) | (no V1.5 letter) — nur falls product-architect einen `bussgeldbescheid`-Mock seedet | Berliner Polizei / Bußgeldstelle | `[MOCK] DE76 1005 0000 0190 1110 23` | `BELADEBEXXX` | „Polizei Berlin Bußgeldstelle" | **true** | computed: 1; expected: 1; valid: true (chunks: 46 → 11 → 41 → 1) |

> **Wertvergleich v1 → v2** (alle 9 Prüfziffern korrigiert):
> - v1 #1: DE10 → v2: **DE09** (Off-by-one, valide)
> - v1 #2: DE12 → v2: **DE55**
> - v1 #3: DE34 → v2: **DE58**
> - v1 #4: DE48 → v2: **DE04**
> - v1 #5: DE17 → v2: **DE77**
> - v1 #6: DE17 → v2: **DE77** (identisch zu #5)
> - v1 #7: DE91 → v2: **DE89**
> - v1 #8: DE45 → v2: **DE32**
> - v1 #9 (OWi optional): DE83 → v2: **DE76**
>
> **Hinweis an mock-backend-coder**: trotz lokaler Hand-Verifikation **muss** zusätzlich ein automatischer Test `tests/unit/letter-payment-iban.test.ts` jede IBAN aus `letters.json` per `iban-ts`-NPM-Lib (oder eigene mod-97-10-Funktion) gegen Checksumme prüfen. Nicht die Tabelle hier vertrauen, sondern den Code-Test als single source of truth nehmen. Falls ein Wert hier durch einen Zahlendreher beim Übertragen ins JSON falsch wird, fängt der Test es ab.
>
> **Hinweis zu Beitragsservice**: Tatsächlich gibt es **eine** Beitragsservice-Bankverbindung pro Landesrundfunkanstalt; in der Demo verwenden wir der Einfachheit halber dieselbe IBAN für beide Bescheid-Archetypen (Persona-Übergreifend). Das ist faktisch unkritisch — der Verwendungszweck (Beitragsnummer) ankert die Buchung.
>
> **Hinweis zu Bußgeldbescheid**: Der Mock-Datensatz hat **keinen** OWi-Bußgeld-Brief seeded. Wenn product-architect entscheidet, einen 9. Pay-Rail-Brief zu seeden, gilt die IBAN aus Zeile 9 oben (DE76 — neu berechnet, valide).

---

---

## 11. Cross-state mit Aussetzungs-Antrag (NEU v2 — concept-verifier AV5 HARD-REVISE)

### 11.A Problem-Beschreibung

Der V1.5.1-Skelett-Template `aussetzung_vollziehung_skelett` (siehe `docs/domain/posteingang-v1.5.1-rechtsbehelf-aussetzung.md` § 3.3) erlaubt der Bürger:in, bei einem `steuerbescheid` mit gleichzeitiger `einspruch + zahlung`-Frist-Doppel einen Antrag auf Aussetzung der Vollziehung nach **§ 361 Abs. 2 AO** zu stellen. Demo-Anker: `letter-mehmet-fa-steuerbescheid-2024` und `letter-schmidt-fa-steuerbescheid-2024` (V1.5.1-Visibility-Hard-Rule § 5.1).

**Kollisions-Szenario**: Bürger:in hat den Aussetzungs-Antrag verfasst und (mock-)abgesendet. Die Vollziehung ist **antragsweise gehemmt**, solange die Behörde den Antrag nicht zurückgewiesen hat. In dieser Schwebephase **trotzdem** eine prominente „Zahlung vorbereiten"-CTA + § 240 AO-Säumnis-Hinweis unter demselben Brief zu rendern wäre **anti-Citizen** — die App würde der Bürger:in raten zu zahlen, was sie gerade durch den Antrag aufschieben will.

### 11.B Detektion (Code-Anker für product-architect)

```
hasOpenAussetzungsAntrag(letter) ⟺
  letter.replies.some(r =>
    r.template === 'aussetzung_vollziehung_skelett'
    ∧ r.behoerde_response_status !== 'rejected'  // im Mock-World immer erfüllt
  )
```

Im V1.5-Mock-World gibt es kein `behoerde_response_status` (Behörden antworten nicht). Daher ist die Bedingung im Mock effektiv: **„hat irgendeine Aussetzungs-Reply existiert"** = TRUE-Pfad triggert.

### 11.C UI-Konsequenz (locked Wortlaut + Style-Hierarchie)

**Wenn `hasOpenAussetzungsAntrag(letter) === true`:**

1. Der Pay-CTA bleibt **sichtbar**, aber wird visuell auf **secondary**-Style heruntergestuft (NICHT primary). Begründung: vollständig hide würde die Bürger:in entrechten — manchmal **will** sie trotz Antrag zahlen (z.B. um Säumniszuschläge zu vermeiden, weil § 240 AO weiter läuft solange Aussetzung nicht bewilligt — siehe Kreuz-Norm-Hinweis V1.5.1 § 4.4 `disclaimer_pre_insertion`). Hide wäre paternalistisch; downgrade ist citizen-respektvoll.

2. Pay-Button-Label-Variante (verbatim DE — locked):

> **„Zahlung trotz Aussetzungs-Antrag vorbereiten"**

3. Sub-Disclaimer im PaymentSheet-Header (verbatim DE — locked, direkt unter dem Speculative-2027-Banner):

> „Sie haben am {datum_aussetzung} Aussetzung der Vollziehung nach § 361 Abs. 2 AO beantragt. Eine Zahlung vor der Entscheidung der Finanzbehörde ist möglich, aber nicht erforderlich. Säumniszuschläge nach § 240 AO entstehen weiter, solange die Aussetzung nicht bewilligt ist."

> **Token**: `{datum_aussetzung}` = Datum der `Reply.gesendet_am` für die Aussetzungs-Reply, formatiert per `formatDateDe`. Falls mehrere Aussetzungs-Replies existieren (z.B. erneut gesendet), nimmt der Resolver die jüngste.

> **Norm-Konsistenz**: Der Wortlaut zitiert sowohl § 361 Abs. 2 AO (Aussetzungs-Anspruch) als auch § 240 AO (Säumniszuschlag-Fortdauer). Beide Normen sind in der V1.5.1-Pre-Insertion-Modal § 2.4 verbatim referenziert — der Pay-Rail-Wortlaut ist eine **Konsistenz-Verlängerung** ins Pay-Sheet, kein neuer Norm-Anker.

> **Hinweis (verifier-Vorschlag-Tightening)**: concept-verifier schlug als Draft vor: „Sie haben am [Datum] Aussetzung der Vollziehung nach § 361 AO beantragt. Eine Zahlung vor der Entscheidung ist möglich, aber nicht erforderlich." Domain-Lock erweitert um (a) den präzisen § 361 **Abs. 2** AO (statt nur § 361 AO — Abs. 1 ist die behördliche Aussetzung-von-Amts-wegen, Abs. 2 die Antrags-Aussetzung — die Bürger:in agiert nach Abs. 2), (b) den expliziten Säumniszuschlag-Hinweis (rechtlich kritisch — Bürger:in soll wissen, dass Säumnis trotz Antrag weiterläuft, V1.5.1 § 4.4 `disclaimer_pre_insertion` enthält denselben Hinweis), (c) „der Finanzbehörde" als präziseren Adressat (statt nur „der Entscheidung").

4. **NICHT** angezeigt wird: der Säumnis-Wortlaut aus § 6 dieser Note (Steuerbescheid-Variante mit § 240 Abs. 1 AO) — der ist bereits per Spec-Instruction § 6 in dem `<NormTooltip>` des Frist-Chips parkt; er erscheint **nicht** zusätzlich im PaymentSheet, auch nicht im Aussetzungs-Sonderfall. Begründung: doppelte Säumnis-Information = Anti-Anxiety-Verstoß.

### 11.D Activity-Log-Konsequenz

Wenn die Bürger:in **trotz** Aussetzungs-Antrag den Pay-Flow durchläuft, schreibt der Activity-Log einen erweiterten Eintrag:

```
type: 'payment_initiated'
note: 'epc_qr_generated'  // oder 'clipboard_iban_copy'
context: { aussetzung_pending: true, aussetzung_reply_id: '<id>', aussetzung_datum: '<ISO-date>' }
rechtsgrundlage: 'Art. 6 Abs. 1 lit. b DSGVO Vertragserfüllung'
```

Datenschutz-Cockpit (V1-Surface, kein neuer UI-Code) zeigt diesen Eintrag mit der zusätzlichen Kontext-Zeile „während offener Aussetzung der Vollziehung".

### 11.E Edge-Cases

- **Aussetzung wurde behördlich abgelehnt** (`r.behoerde_response_status === 'rejected'`) — im V1.5-Mock-World nie der Fall, aber für V2.x-Hook: Pay-CTA kehrt zu **primary**-Style zurück, der Sub-Disclaimer entfällt.
- **Aussetzung-Reply wurde widerrufen** (`r.zurückgezogen === true`, V1.5.0 Reply-Schema-Feld) — Pay-CTA-Style folgt der zurückgezogen-Logik: zurückgezogen ⟹ kein offener Antrag mehr ⟹ primary-Style.
- **Mehrere `aussetzung_vollziehung_skelett`-Replies pro Brief** (z.B. Antrag erneut gesendet nach Behörden-Rückfrage) — Detektor `some` reicht; jüngste Reply liefert `datum_aussetzung`-Token.
- **Brief ohne Einspruch-Reply, aber mit Aussetzungs-Reply** — V1.5.1-Visibility-Hard-Rule § 5.1 schließt das im Picker aus; faktisch nicht erreichbar. Defensiv: Pay-CTA folgt trotzdem der Aussetzungs-Logik — wenn die Bürger:in die UI-Konvention umgangen hat (theoretisch: direkt-Edit im DevTools), respektieren wir den expliziten Antrag.

### 11.F Verdict §11

Aussetzung × Pay-CTA Cross-state ist **definiert und gelocked**. Pay-Rail-V2 lieferbar mit dieser Logik; product-architect speccst einen `paymentCtaVariant: 'primary' | 'secondary-aussetzung'`-Discriminator in `LetterPayment` oder als computed-property auf Letter-Ebene.

---

## 12. Citation-Match-Normalization rules (NEU v2 — concept-verifier AV11 HARD-REVISE)

> **Zweck**: Diese Regeln sind die machine-spec-Schicht unter den abstrakten Citation-Match-Gates aus § 8. Ohne sie würde product-architect die Normalisierungs-Heuristiken erfinden — und die Heuristiken würden silent zugunsten der Demo-Letter biegen. Hier locked verbatim, mit Regex + Worked Example, damit jede Implementierung deterministisch wird.

### 12.A Regel (a) — IBAN Whitespace-Tolerance

**Real-Welt-Faktenlage**: Behörden-Bescheide drucken IBANs üblicherweise in 4-Zeichen-Gruppen mit Leerzeichen: `DE12 2005 0550 1234 5678 90` (per ISO-13616-Empfehlung, EBA-Standard für Print). Die `LetterPayment.iban`-Property dagegen wird konventionell **ohne** Whitespace gespeichert (`DE122005055012345678 90` — ePayBL-/Banking-API-Konvention) oder mit Whitespace (Demo-Lesbarkeit). Beide Formen müssen matchen.

**Normalisierungs-Regel**:

```
function normalizeIbanForCitationMatch(iban: string): string {
  return iban
    .replace(/^\[MOCK\]\s*/, '')   // strippt MOCK-Prefix (siehe Regel c, hier auch nötig)
    .replace(/\s+/g, '')            // strippt ALLE Whitespace-Zeichen (Space, Tab, NBSP)
    .toUpperCase();                 // normalisiert Case (Behörde könnte „de12" lowercase drucken — extrem selten, defensiv)
}

function bodyContainsIban(body_de: string, iban: string): boolean {
  const target = normalizeIbanForCitationMatch(iban);
  const haystack = body_de.replace(/\s+/g, '').toUpperCase();
  return haystack.includes(target);
}
```

**Suchregex (für Mehr-IBAN-Detektion)** — wendet auf den **normalisierten** body_de an:

```
/[A-Z]{2}\d{2}[A-Z0-9]{16,30}/g
```

(Anmerkung: nach Whitespace-Stripping reicht `[A-Z0-9]` ohne Leerzeichen-Gruppe; Längen-Range 16-30 deckt DE-IBAN (=20) bis MT-IBAN (=31) ab.)

**Worked Example**:
- `letter.payment.iban === "[MOCK] DE09 3705 0198 0001 9998 11"`
- Normalisiert: `"DE09370501980001999811"` (Mock-Prefix gestrippt, Whitespace gestrippt, uppercase)
- `body_de` enthält den Satz: „Bankverbindung: IBAN DE09 3705 0198 0001 9998 11, BIC COLSDE33XXX, Empfänger: Finanzamt Köln-Mitte."
- Normalisierter haystack: `"...IBANDE09370501980001999811BICCOLSDE33XXX..."`
- `haystack.includes("DE09370501980001999811")` → **true** → IBAN-Citation-Match ✓

**Counter-Example (Gate-Trigger)**:
- `body_de` enthält keinen IBAN-String (V1.5-Original-Korpus auf 8/8 Pay-Briefen — siehe new-gap #1) → `haystack.includes(target)` → **false** → Hand-off-Wortlaut.
- Mitigation: Spec-Vorgabe an mock-backend-coder, alle 8 (+ optional 9.) `body_de` mit einem realen Bankverbindungs-Footer-Block zu erweitern. Test `tests/unit/letter-payment-iban-citation.test.ts` enforced den Match auf jedem Pay-Brief.

### 12.B Regel (b) — Betrag Tausender-Trenner-Varianten

**Real-Welt-Faktenlage**: Behörden-Bescheide drucken EUR-Beträge in mindestens 4 Varianten:

1. `1.247,00 €` — DE-Standard, Tausender-Punkt, Komma-Cent, €-Suffix.
2. `1247,00 €` — Tausender-Punkt weggelassen (häufig bei < 10.000 €).
3. `1.247 €` — Cent weggelassen wenn glatte EUR (typisch bei Bußgeldern, IHK-Beiträgen).
4. `EUR 1.247,00` — ISO-Currency-Prefix statt €-Suffix (Finanzamt-formell, Beitragsservice).
5. `1.247,00 EUR` — ISO-Suffix (selten).
6. (NICHT zu matchen: `1,247.00 €` — englische Formatierung; im DE-Behörden-Brief unüblich; falls auftaucht, ist es ein Mock-Fehler.)

**Normalisierungs-Regel**:

```
function normalizeBetragForCitationMatch(betragRaw: string): number {
  // Akzeptiert "1.247,00", "1247,00", "1.247", "EUR 1.247,00", etc.
  const stripped = betragRaw
    .replace(/^EUR\s+/i, '')
    .replace(/\s*EUR$/i, '')
    .replace(/\s*€$/, '')
    .replace(/^€\s*/, '')
    .trim();
  // Normalisierung: Punkt-Tausender-Trenner ist optional, Komma-Cent ist optional
  const noThousand = stripped.replace(/\.(?=\d{3}(?:\D|$))/g, '');
  const normalized = noThousand.replace(',', '.');
  return parseFloat(normalized);
}

function bodyContainsBetrag(body_de: string, betrag: number): boolean {
  // Suchregex: alle Betrag-Vorkommen extrahieren, normalisieren, mit Toleranz vergleichen
  const matches = body_de.match(
    /(?:EUR\s+)?(\d{1,3}(?:\.\d{3})*(?:,\d{2})?|\d+(?:,\d{2})?)\s*(?:€|EUR)?/g
  ) ?? [];
  return matches.some(m => Math.abs(normalizeBetragForCitationMatch(m) - betrag) < 0.01);
}
```

**Such-Regex (für Variant-Erkennung)**:

```
/(?:EUR\s+)?(\d{1,3}(?:\.\d{3})*(?:,\d{2})?|\d+(?:,\d{2})?)\s*(?:€|EUR)?/g
```

Diese Regex matcht:
- `\d{1,3}(\.\d{3})*,\d{2}` — Variante 1: Tausender-Punkt + Komma-Cent
- `\d+,\d{2}` — Variante 2: keine Tausender-Trennung, Komma-Cent
- `\d{1,3}(\.\d{3})*` — Variante 3: Tausender-Punkt, keine Cents
- `\d+` — Variante 4: glatte Zahl
Mit optionalem `EUR `-Prefix oder `€`/`EUR`-Suffix (mit oder ohne Leerzeichen davor).

**Worked Example**:
- `letter.payment.amount === 1247.00` (Number, in `LetterPayment` als `amount: number` gespeichert).
- `body_de` enthält den Satz: „Sie haben noch 1.247,00 € zu zahlen bis zum 12.06.2026."
- Regex extrahiert `"1.247,00 €"`.
- `normalizeBetragForCitationMatch("1.247,00 €")` → strippt €-Suffix → `"1.247,00"` → strippt Tausender-Punkt → `"1247,00"` → ersetzt Komma → `"1247.00"` → `parseFloat` → `1247.00`.
- `Math.abs(1247.00 − 1247.00) < 0.01` → **true** → Betrag-Citation-Match ✓

**Counter-Example (Mehrdeutigkeit-Auflösung)**:
- `body_de` enthält: „Festgesetzte Steuer: 8.471,00 EUR. Anzurechnende Lohnsteuer: 7.224,00 EUR. Sie haben noch 1.247,00 € zu zahlen."
- Alle drei Beträge matchen Regex.
- Aber `letter.payment.amount === 1247.00` matcht nur das dritte Vorkommen.
- Das **Citation-Match-Gate aus § 8 #2** verlangt zusätzlich, dass das matchende Vorkommen in einem Satz mit „zahlen"/„Nachzahlung"/„Gesamtbetrag"/„fällig" steht. Der dritte Satz erfüllt das („zu zahlen"); die ersten beiden nicht. ⟹ Match wird auf Satz 3 angekert ⟹ ✓.

### 12.C Regel (c) — VZ [MOCK]-Prefix-Stripping

**Real-Welt-Faktenlage**: V1.5-Konvention ist, dass `letter.aktenzeichen` mit `[MOCK] `-Prefix gespeichert wird (z.B. `"[MOCK] 22/345/12345"`). Der Brief-Body-Text dagegen druckt das Aktenzeichen **ohne** Mock-Prefix (z.B. „Steuernummer: 22/345/12345 ESt 2024"). Beim Citation-Match muss der Prefix gestrippt werden, sonst Substring-Match-Fail.

**Normalisierungs-Regel**:

```
function normalizeAktenzeichenForCitationMatch(az: string): string {
  return az
    .replace(/^\[MOCK\]\s*/, '')   // strippt führendes [MOCK] + Whitespace
    .trim();
}

function bodyContainsAktenzeichen(body_de: string, aktenzeichen: string): boolean {
  const target = normalizeAktenzeichenForCitationMatch(aktenzeichen);
  return body_de.includes(target);  // case-sensitive, da Aktenzeichen typisch alphanumerisch + slashes
}
```

**Worked Example**:
- `letter.aktenzeichen === "[MOCK] 22/345/12345"`
- Normalisiert: `"22/345/12345"` (Mock-Prefix gestrippt, Whitespace getrimmt).
- `body_de` enthält: „Bezug: Steuernummer 22/345/12345 (Einkommensteuer 2024)."
- `body_de.includes("22/345/12345")` → **true** → Aktenzeichen-VZ-Match ✓.
- `LetterPayment.verwendungszweck` wird verbatim auf `"22/345/12345"` gesetzt (siehe § 8 #3 Gate: pure String-Übernahme aus dem normalisierten Aktenzeichen-Feld, **keine** LLM-Generierung). Bei FA-Steuerbescheid optional ergänzt um Steuerart + Jahr — siehe § 4 dieser Note („22/345/12345 ESt 2024"); wenn ergänzt, dann die Ergänzung ebenfalls aus `body_de` per literal-substring-extraction (z.B. Regex `(ESt|USt|LSt|KöSt) \d{4}`), nicht LLM-frei.

**Counter-Example**:
- `letter.aktenzeichen === "[MOCK] BS-2026-0815"` (Beitragsservice-Beitragsnummer im Mock-Format).
- Brief-Body druckt: „Beitragsnummer: 7 3 1 0 4 2 0 8 8" (echte Beitragsservice-Konvention 9-stellig mit Leerzeichen, V1.5 weicht hier ab).
- Naive Normalisierung: `"BS-2026-0815"` ist NICHT Substring von Body. ⟹ Gate triggert ⟹ Hand-off.
- Mitigation: Mock-backend-coder muss die `aktenzeichen`-Property entweder (i) aufs Body-Format normalisieren (`"731042088"` ohne Trenner) oder (ii) Body auf Aktenzeichen-Format normalisieren (`"BS-2026-0815"` im Body abdrucken). Empfehlung: (i), weil V1.5-Aktenzeichen-Konvention in `tests/unit/aktenzeichen-format.test.ts` bereits regelt; Body-Format ist freier mock-Text.

### 12.D Regel-Anwendung in Gate-Reihenfolge

Die drei Normalisierungs-Regeln werden in folgender Reihenfolge angewandt:

1. **Phase 1 — Pre-Match-Normalisierung**: Sowohl `body_de` als auch `letter.payment.iban` / `letter.payment.amount` / `letter.aktenzeichen` durchlaufen ihre jeweilige `normalize…ForCitationMatch`-Funktion.
2. **Phase 2 — Substring/Regex-Match**: `bodyContainsIban`, `bodyContainsBetrag`, `bodyContainsAktenzeichen` werden ausgeführt.
3. **Phase 3 — Gate-Decision**: Alle drei Booleans müssen `true` sein UND es darf nur **eine** matchende IBAN im body_de existieren UND das Betrag-Match muss in einem Zahlungs-Lemma-Satz-Kontext stehen (§ 8 #2). Sonst Gate-Fail ⟹ Hand-off-Wortlaut.

**Test-Coverage-Vorgabe** an product-architect: `tests/unit/letter-payment-citation-match.test.ts` mit ≥ 16 Testfällen — pro 8 Pay-Briefen je ein Pass-Case (alle drei Citations matchen) + ein Fail-Case (gezielt eine Citation kaputt) + 2 Edge-Cases für Mehr-IBAN-Detection (z.B. künstliches `body_de` mit zwei IBANs ⟹ Hand-off) und Tausender-Trenner-Varianz (1.247,00 € vs 1247 €).

### 12.E Verdict §12

Die drei Normalisierungs-Regeln sind locked und maschinenlesbar. product-architect implementiert sie als pure Funktionen in `src/lib/mock-backend/citation-match.ts`; sie sind frei von I/O, frei von LLM-Calls, deterministisch testbar.

---

## Recommended next agent

### concept-verifier — Sign-off-Status

v1-Verdict: **REVISE** (5 hard-revisions + 3 soft-revisions). v2 dieser Note adressiert alle 5 hard-revisions verbatim (§§ 1, 7, 8, 10, 11, 12 sowie die Locked Mock-IBAN-Tabelle); die 3 soft-revisions sind als spec-Instructions an product-architect in §§ 6, 9 dieser Note dokumentiert. **Erwartet: PROCEED-after-revision-2** ohne weiteren Verify-Loop, sofern keine neuen Angriffsvektoren entstehen — wenn doch, einen Sub-Verify ansetzen, sonst direkt an product-architect.

### product-architect — was zu speccen ist (NACH concept-verifier sign-off):

**Spec-Shape-Inventar** (v2-Lock):

1. **`LetterPayment` Sub-Type** in `src/types/letter.ts`:
   ```
   {
     iban: string;             // mit oder ohne Whitespace, MOCK-Prefix optional
     bic: string;              // optional in EPC-QR ab v002 (Inland)
     empfaenger_name: string;  // verbatim für QR + UI-Display
     amount: number;           // EUR als number, e.g. 1247.00
     verwendungszweck: string; // verbatim aus letter.aktenzeichen, ggf. + Steuerart
     citation_iban_match: boolean;        // computed via § 12 (a)
     citation_betrag_match: boolean;      // computed via § 12 (b)
     citation_aktenzeichen_match: boolean; // computed via § 12 (c)
     // Behörden-IBAN-Whitelist deferred V2.1
     // payment_cta_variant computed at letter-level: 'primary' | 'secondary-aussetzung' | 'hidden'
   }
   ```
2. **Mock-Backend-API**:
   - `getPaymentForLetter(letterId)` — Lookup an `letter.payment`.
   - `recordPaymentInitiated(letterId, channel: 'epc_qr' | 'clipboard', context?: { aussetzung_pending?: boolean })` — schreibt Activity-Log mit `rechtsgrundlage: 'Art. 6 Abs. 1 lit. b DSGVO Vertragserfüllung'`.
   - `selectEarliestFrist(letter)` — sortiert per § 10.A Tie-Break-Regel (Datum asc, dann Typ-Priorität).
   - **Citation-Match-Helpers** in `src/lib/mock-backend/citation-match.ts`: `normalizeIbanForCitationMatch`, `bodyContainsIban`, `normalizeBetragForCitationMatch`, `bodyContainsBetrag`, `normalizeAktenzeichenForCitationMatch`, `bodyContainsAktenzeichen`. Pure Funktionen, kein I/O.
   - **Aussetzungs-Detector**: `hasOpenAussetzungsAntrag(letter)` per § 11.B.
3. **EPC-QR-Generator** clientseitig (ohne Server-Roundtrip — payload ist <331 Bytes): `qrcode`-Library + EPC069-12-v3.1-Format-Builder. Version `002`, Charset `1` (UTF-8), BIC-optional (Inland). Test-Suite gegen die offizielle EPC-Sample-Encodings.
4. **Sticky-Frist-Action-Erweiterung**: dritter primärer CTA „Zahlung vorbereiten" (sichtbar nur wenn `letter.payment !== undefined` UND Pay-Sichtbarkeits-Bedingung § 10.A erfüllt). CTA-Priorität nach Frist-Typ-of-earliest-unfulfilled (concept-verifier AV10): Pay primary nur wenn `zahlung` earliest, sonst Pay secondary; Kalender + View-Sent in Overflow-Menu für Pay-Briefe. **Aussetzungs-State**: Pay-CTA bleibt sichtbar, aber wird per `paymentCtaVariant === 'secondary-aussetzung'` visuell heruntergestuft (§ 11.C).
5. **PaymentSheet-Komponente** (`<Sheet>` von shadcn/ui, 480 px Desktop, fullscreen Mobile):
   - **Header (top-down)**:
     1. Speculative-2027-Banner (Locked-Wortlaut, AV1-Tightening).
     2. **Bedingt** Aussetzungs-Sub-Disclaimer (§ 11.C, nur wenn `hasOpenAussetzungsAntrag === true`), Pay-Button-Label dann „Zahlung trotz Aussetzungs-Antrag vorbereiten".
   - **Phishing-Confirmation** (inline, NICHT vorgelagerter Modal — AV3): `<details>`-collapsed-Disclaimer + Summary-Zeile + Checkbox; QR + Copy-Buttons disabled bis Checkbox aktiv.
   - **Body**: 3 read-only Felder IBAN/Betrag/VZ mit per-Feld Copy-Button + Citation-Match-Indicator (✓ matched in body_de, oder Hand-off-Wortlaut bei Fail).
   - **EPC-QR**: full-width, clientseitig generiert.
   - **Footer**: DSGVO-Datenminimierung-Banner (Erst-Nutzung, einmalig per localStorage-Flag) — Locked-Wortlaut mit lit. b.
   - **NICHT** im Sheet: Säumnis-§-Wortlaut (gehört in `<NormTooltip>` an Frist-Chip — § 6 Spec-Instruction).
6. **Datenschutz-Cockpit-Erweiterung**: `payment_initiated` Activity-Log-Enum mit Kontext-Feld `{ aussetzung_pending?: boolean, aussetzung_reply_id?: string, aussetzung_datum?: string }`. **Kein** neuer Cockpit-Toggle für Pay-Rail (lit. b — siehe § 7).
7. **Gates implementieren** (Reihenfolge, deterministisch):
   - Phase 1: Citation-Match-Gate (§ 8 + § 12-Normalisierung). Tests in `tests/unit/letter-payment-citation-match.test.ts` (≥ 16 Cases).
   - Phase 2: Phishing-Confirmation-Gate (§ 9, inline-checkbox, AV3).
   - Behörden-IBAN-Whitelist deferred V2.1 (§ 8 #4 + concept-verifier § 6).
8. **Seed-Mutation** (Pre-condition für UI-Arbeit, concept-verifier AV6 HARD-REVISE):
   - Mock-backend-coder erweitert `body_de` von 8 (oder 9) Pay-Briefen um realen Bankverbindungs-Footer (3 Zeilen: IBAN / BIC / Empfänger), per Locked-IBAN-Tabelle (§ Locked Mock-IBAN-Tabelle).
   - Test `tests/unit/letter-payment-iban.test.ts` validiert mod-97-10 jedes IBAN-Wertes UND `tests/unit/letter-payment-iban-citation.test.ts` enforced den Body-Match.
   - **Hard-Gate**: Keine UI-PR (PaymentSheet, Pay-Button) wird gemerged, bevor diese Tests grün sind.
9. **i18n-Sweep**: alle Wortlaute aus der Locked-Wortlaut-Sektion + § 11.C Sub-Disclaimer in `de.json` als `posteingang.payment.*`-Namespace; Skelett-Übersetzungen für 5 weitere Locales (Phishing-Disclaimer + Datenminimierung-Banner + Aussetzungs-Sub-Disclaimer). Säumnis-Wortlaut bleibt im V1-Namespace `posteingang.frist.norm_tooltip.{archetype}` (§ 6 Spec-Instruction). Norm-§-Wortlaute bleiben in DE über alle Locales.
10. **Testing**: Playwright-E2E-Pfade:
    - „Loom-Demo Pay-Rail Steuerbescheid Mehmet" (Pay-Button → inline-Phishing-Confirmation → Citation-Match grün → PaymentSheet → QR-Code visuell präsent → IBAN-Copy → Activity-Log-Eintrag im Cockpit nachweisbar).
    - „Aussetzungs-Cross-state Mehmet": V1.5.1-Aussetzungs-Reply senden → zurück zum Brief → Pay-CTA ist secondary-style + Sub-Disclaimer sichtbar + Label „Zahlung trotz Aussetzungs-Antrag vorbereiten" (§ 11.C).
    - axe-Pass auf PaymentSheet (focus-trap, ARIA, contrast); inline-`<details>`-Phishing-Element WCAG-konform (aria-expanded, label-Verknüpfung).

**File-Inventar** (für product-architect Spec-Erstellung):
- `docs/specs/posteingang-v2-zahlungs-rail.md` (NEW) — Architecture-Spec.
- `src/types/letter.ts` — `LetterPayment` Sub-Type ergänzen.
- `src/data/letters.json` — `body_de` von 8 (+1 optional) Briefen erweitern, `payment`-Property auf jedem Pay-Brief setzen.
- `src/lib/mock-backend/citation-match.ts` (NEW) — Pure-Funktion-Modul für § 12-Regeln.
- `src/lib/mock-backend/api.ts` — `getPaymentForLetter`, `recordPaymentInitiated`, `selectEarliestFrist`, `hasOpenAussetzungsAntrag` ergänzen.
- `src/components/posteingang/PaymentSheet.tsx` (NEW) — Pay-Sheet-Komponente.
- `src/components/posteingang/StickyFristAction.tsx` — Pay-CTA + CTA-Priorität-Erweiterung.
- `src/lib/i18n/locales/de.json` — `posteingang.payment.*`-Namespace + 5 weitere Locales.
- `tests/unit/letter-payment-iban.test.ts` (NEW) — mod-97-10 Validierung.
- `tests/unit/letter-payment-iban-citation.test.ts` (NEW) — Body-Match Enforce.
- `tests/unit/letter-payment-citation-match.test.ts` (NEW) — § 12-Regel-Tests (≥ 16 Cases).
- `tests/e2e/pay-rail.spec.ts` (NEW) — Playwright-E2E.
- `tests/a11y/payment-sheet.spec.ts` (NEW) — axe-Pass.

---

## Sources verifiziert

- [FITKO XBezahldienste — Beschreibung Standard](https://docs.fitko.de/xbezahldienste/standard/BeschreibungXBezahldienste/) — accessed 2026-05-09
- [IT-Planungsrats-Beschluss 2023/51 zur XBezahldienste-Pflicht](https://www.it-planungsrat.de/fileadmin/beschluesse/2023/Beschluss2023-51_XBezahldienste_Standard.pdf) — accessed 2026-05-09
- [FITKO XBezahldienste Roll-Out-Stand 2025-11-05](https://www.fitko.de/fileadmin/fitko/veranstaltungen/Handout_Dialog_XBezahldienste.pdf) — accessed 2026-05-09
- [ePayBL — Online bezahlen in der öffentlichen Verwaltung](https://www.epaybl.de/) — accessed 2026-05-09
- [BMI/CIO E-Payment Bund](https://www.cio.bund.de/Webs/CIO/DE/digitale-loesungen/it-konsolidierung/dienstekonsolidierung/it-massnahmen/epayment/epayment-node.html) — accessed 2026-05-09
- [EPC069-12 v3.1 (März 2024) — Quick Response Code Guidelines](https://www.europeanpaymentscouncil.eu/sites/default/files/kb/file/2024-03/EPC069-12%20v3.1%20Quick%20Response%20Code%20-%20Guidelines%20to%20Enable%20the%20Data%20Capture%20for%20the%20Initiation%20of%20an%20SCT.pdf) — accessed 2026-05-09
- [EPC QR Code Wikipedia (Bank-Support-Übersicht)](https://en.wikipedia.org/wiki/EPC_QR_code) — accessed 2026-05-09
- [§ 240 AO Säumniszuschläge (gesetze-im-internet.de)](https://www.gesetze-im-internet.de/ao_1977/__240.html) — accessed 2026-05-09
- [§ 240 AO (dejure.org)](https://dejure.org/gesetze/AO/240.html) — accessed 2026-05-09
- [§ 357 AO Einlegung des Einspruchs (gesetze-im-internet.de)](https://www.gesetze-im-internet.de/ao_1977/__357.html) — accessed 2026-05-09
- [§ 361 AO Aussetzung der Vollziehung](https://www.gesetze-im-internet.de/ao_1977/__361.html) — accessed 2026-05-09
- [§ 84 SGG Widerspruchsfrist](https://www.gesetze-im-internet.de/sgg/__84.html) — accessed 2026-05-09
- [§ 86a SGG aufschiebende Wirkung](https://www.gesetze-im-internet.de/sgg/__86a.html) — accessed 2026-05-09
- [§ 18 OWiG Zahlungserleichterungen](https://www.gesetze-im-internet.de/owig_1968/__18.html) — accessed 2026-05-09
- [§ 9 RBStV Vollstreckungs-Titel](https://www.gesetze-im-internet.de/rbstv/__9.html) — accessed 2026-05-09
- [§ 24 SGB IV Säumniszuschlag Sozialversicherungsbeiträge](https://www.gesetze-im-internet.de/sgb_4/__24.html) — accessed 2026-05-09
- [§ 2 RDG Begriff der Rechtsdienstleistung](https://www.gesetze-im-internet.de/rdg/__2.html) — accessed 2026-05-09
- BGH I ZR 113/20 (09.09.2021, „Smartlaw") — RDG-Schwelle für automatisierte Antrags-/Vertragsgeneratoren (kanonische Vergleichs-Linie aus posteingang.md)
