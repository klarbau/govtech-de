---
vorgang: dashboard
title: Bürger:innen-Übersicht „heute zu tun"
last_validated: 2026-05-08
sources:
  - https://dsgvo-gesetz.de/art-22-dsgvo/
  - https://dsgvo-gesetz.de/art-9-dsgvo/
  - https://dsgvo-gesetz.de/art-6-dsgvo/
  - https://www.gesetze-im-internet.de/bdsg_2018/__22.html
  - https://www.gesetze-im-internet.de/bgb/__164.html
  - https://www.gesetze-im-internet.de/bgb/__1626.html
  - https://www.gesetze-im-internet.de/bgb/__1629.html
  - https://www.gesetze-im-internet.de/vwvfg/__14.html
  - https://www.gesetze-im-internet.de/vwvfg/__13.html
  - https://www.gesetze-im-internet.de/rdg/__2.html
  - https://www.gesetze-im-internet.de/rdg/__6.html
  - https://www.gesetze-im-internet.de/oziig/
  - https://initiatived21.de/publikationen/egovernment-monitor/2025
  - https://initiatived21.de/presse/egovernment-monitor-2025-wie-die-digitale-verwaltung-helfen-kann-staatsvertrauen-zurueckzugewinnen
  - https://www.dbb.de/artikel/einfacher-schneller-digitaler-das-erwarten-die-deutschen-vom-staat.html
  - https://de.statista.com/statistik/daten/studie/1477837/umfrage/registrierte-nutzer-der-bundid/
  - https://www.bva.bund.de/DE/Services/Behoerden/Verwaltungsdienstleistungen/Registermodernisierung/Informationen-Buerger/informationen_buerger_node.html
  - https://www.digitale-verwaltung.de/Webs/DV/DE/registermodernisierung/elemente/datenschutzcockpit/datenschutzcockpit-node.html
  - BGH I ZR 113/20 (09.09.2021, „Smartlaw")
---

> **Hinweis zum Geltungsbereich**
> Dies ist *keine* einzelne Vorgangs-Spezifikation, sondern eine *horizontale Capability* — ein persönliches Cockpit, das nach erfolgreicher Authentifizierung (DeutschlandID/EUDI-Wallet) den ersten Screen liefert. Die Konventionen unten gelten persona-agnostisch für jede:n Bürger:in. Sie bauen *auf* dem Posteingang (`docs/domain/posteingang.md`) und einzelnen Vorgängen (`docs/domain/umzug.md` etc.) auf, dupliziert aber bewusst keine dortigen Disclaimer — sie verweist.

## 1. Beteiligte Akteure (Tile-Typ × Datenquelle × Behörden-Realität × Demo-Konvention)

Das Dashboard rendert keine Behörden-Daten direkt; es aggregiert die Mock-State-Slices, die in den Vorgangs- und Posteingang-Modulen bereits geladen sind. Akteure sind hier folglich **Tile-Klassen** und ihre **Datenquellen** — nicht einzelne Behörden.

| Tile-Klasse | Datenquelle (Mock) | Reale Quelle (2026) | Demo-Konvention |
|---|---|---|---|
| **Frist-Tile** (anstehende Fristen) | `letters.json` + `vorgaenge.json` (extrahierte Fristen aus Brief-Body) | Mein ELSTER, ZBP/BundID-Postfach, Krankenkassen-Portal — fragmentiert; kein Aggregator | nur eigene Fristen aus eigenem Posteingang; Frist mit Original-Zitat verknüpft |
| **Posteingang-Tile** (ungelesene Briefe) | Aggregat aus `letters.json` mit `read=false` | ZBP-Postfach (BundID) plus Silos (ELSTER, KK) | nur Count + Top-1-Pre-Open-Snippet; kein Inhalts-Leak ohne Klick |
| **Vorgangs-Stand-Tile** (laufende Vorgänge) | `vorgaenge.json` (Mock-Status) | BundID-Statusmonitor (seit Okt 2025 produktiv) — nur Bund-Anträge | nur eigene Vorgänge mit eigenem Vorgangs-Az; **kein** Cross-Bürger-Vergleich, **keine** Wartezeit-Median-Behauptung |
| **Termin-Tile** (Behörden-Termine) | `termine.json` (Mock) | Online-Terminbuchung Bürgeramt/ABH/etc. (kommunal verteilt) | nur eigene Termine; .ics-Export auf Bürger-Geräte-Side; kein Push an Behörde |
| **Datenschutz-Cockpit-Tile** | App-internes Activity-Log (was *unser* Mock-System anzeigt/öffnet) | BVA-DSC mit NOOTS-Anbindung (operativ Anfang 2026; produktiv für IDNr-basierte Datenflüsse zwischen öffentlichen Stellen) | **Activity-Log über App-Aktionen**, nicht Behörden-Audit. Ein **Verlinkungs-Tile** zum echten BVA-DSC (mit Disclaimer „dort liegt die rechtsverbindliche Sicht") ist zulässig; **keine Datenkopie** der DSC-Liste in unsere App. |
| **Stammdaten-Status-Tile** | `personas.json` (eigene Stammdaten) | Melderegister (BMG §3) — Bürger sieht eigene Daten via eID-Selbstauskunft, **nicht** „welche Behörde hat welche Version" | nur Hinweise „Möchten Sie Ihre Adresse prüfen?" — **keine Sync-Status-Aussage** über Drittstellen (siehe §10 Adjudikation 5e) |
| **Familie-Tile** | `personas.json` Vollmacht-/Sorge-Modell + Mock-Vollmachts-Credential | EUDI-Wallet-Attestation (ab 2027 in eIDAS-2-Roll-out) für Vollmacht/Sorge — **2026 noch nicht im EUDI-Wallet-Pilot DE produktiv** | Tile **nur**, wenn Mock-Vollmachts-Credential vorhanden; **explizite Aktivierung** durch Bürger:in; **keine implizite Sichtbarkeit** allein aufgrund Familienstand-Stammdatum |
| **Diff-seit-letztem-Login-Block** | App-internes „lastSeenAt" + Diff über `letters/vorgaenge/termine` | nicht standard in DE-Portalen | rein Bürger-Geräte-side; kein Behörden-Datenfluss |

## 2. Beteiligte Behörden (indirekt — Tile-Inhalte zeigen auf sie)

Da die Tiles nur eigene Daten der/des Bürger:in spiegeln, sind „beteiligte Behörden" hier indirekt: jede Behörde, die in einem Brief, Vorgang, Termin auftaucht. Die taxonomische Liste lebt in `docs/domain/posteingang.md` Tabelle „Beteiligte Akteure". Föderal-Trennschärfe (Bund / Land / Kommune / Selbstverwaltung) ist im Briefkopf-Absender-Feld verankert; das Dashboard übernimmt diese Taxonomie unverändert über das `BehoerdenBadge`-Component (CLAUDE.md, `components/shared/`).

## 3. Erforderliche Rechtsgrundlagen

| Verarbeitung | DSGVO-Rechtsgrundlage (Mock) | Sozialdatenschutz / Spezialnormen | Anmerkung |
|---|---|---|---|
| Anzeige von Stammdaten (Name, Adresse, Geburt) im Dashboard | Art. 6 Abs. 1 lit. b DSGVO (Vertrag App ↔ Bürger:in) | — | App ist *keine* öffentliche Stelle iSv § 2 BDSG → lit. e DSGVO **scheidet aus** (vgl. posteingang.md). |
| Anzeige von Brief-Inhalten (Aggregat aus Posteingang) | Art. 6 Abs. 1 lit. a DSGVO (ausdrückliche Einwilligung beim Hochladen/Empfangen) | bei Sozialdaten zusätzlich **Art. 9 Abs. 2 lit. a DSGVO** + § 22 BDSG | siehe posteingang.md §3 — Dashboard übernimmt unverändert. |
| AI-Sortierung „Top-3 Aktionen heute" | Art. 6 Abs. 1 lit. a DSGVO (Einwilligung) + Art. 22 Abs. 2 lit. c DSGVO falls automatisierte Entscheidung mit rechtlicher Wirkung vorläge | — | **Architektur-Pflicht**: keine rechtliche Wirkung iSv Art. 22 Abs. 1 erzeugen (siehe §10 Adjudikation 5a). Ein zusätzlicher „menschlicher Eingriffspunkt" (Bürger:in entscheidet, ob die Aktion ausgelöst wird) ist UI-konstitutiv. |
| Übermittlung an AI-Anbieter (Anthropic) für Reasoning-Texte | Art. 28 DSGVO Auftragsverarbeitung + EU-SCC für US-Drittlandtransfer | technische Pseudonymisierung empfohlen | siehe posteingang.md §3. Dashboard sollte für die Top-3-Reasoning-Kacheln so wenig Input wie möglich an die AI senden (Briefkopf-Absender + Frist-Datum genügt; Brief-Body NICHT). |
| Familie-Tile-Anzeige (Vorgänge mit Bezug zu Partner:in/Kind) | Art. 6 Abs. 1 lit. a DSGVO Einwilligung + **BGB § 164** Vollmacht oder **§§ 1626/1629 BGB** elterliche Sorge | bei Sozialdaten Art. 9 Abs. 2 lit. a DSGVO | UI-Switch reicht **nicht** als Vollmacht. Zivilrechtliche Vollmacht/Sorge muss als Mock-Credential dargestellt werden, das die Bürger:in *aktiv* eingerichtet hat. |
| Vertretung im Verwaltungsverfahren (z.B. Mit-Bearbeiten Partner-Vorgang) | **§ 14 Abs. 1 VwVfG** (Bevollmächtigte) | RDG §§ 2, 6 (kein gewerbliches Inkasso/Rechtsdienstleistung) | Demo simuliert Vertretung *nur* im Read-only-Modus; kein automatischer Versand fremder Verfahrenshandlungen. |
| Diff-Block + lastSeenAt | Art. 6 Abs. 1 lit. b DSGVO (Vertragsleistung „Übersicht zwischen Logins") | — | Speicherort lokal (localStorage); kein Profilbildungs-Backend. |

**Wortlaut Art. 22 Abs. 1 DSGVO** (zur Adjudikation der Top-3-Frage, §10 unten):
> „Die betroffene Person hat das Recht, nicht einer ausschließlich auf einer automatisierten Verarbeitung — einschließlich Profiling — beruhenden Entscheidung unterworfen zu werden, die ihr gegenüber rechtliche Wirkung entfaltet oder sie in ähnlicher Weise erheblich beeinträchtigt."

**Wortlaut § 14 Abs. 1 VwVfG** (zur Adjudikation Familie, §10 unten):
> „Ein Beteiligter kann sich durch einen Bevollmächtigten vertreten lassen. Die Vollmacht ermächtigt zu allen das Verwaltungsverfahren betreffenden Verfahrenshandlungen … . Der Bevollmächtigte hat auf Verlangen seine Vollmacht schriftlich nachzuweisen."

**Wortlaut § 1626 Abs. 1 BGB**:
> „Die Eltern haben die Pflicht und das Recht, für das minderjährige Kind zu sorgen (elterliche Sorge). Die elterliche Sorge umfasst die Sorge für die Person des Kindes (Personensorge) und das Vermögen des Kindes (Vermögenssorge)."

**Wortlaut § 1629 Abs. 1 BGB** (Vertretung des Kindes — relevant, weil §1626 selbst die Außenvertretung nicht regelt):
> „Die elterliche Sorge umfasst die Vertretung des Kindes. Die Eltern vertreten das Kind gemeinschaftlich; ist eine Willenserklärung gegenüber dem Kind abzugeben, so genügt die Abgabe gegenüber einem Elternteil. …"

> Der research-scout-Verweis „§ 6 BGB-Vollmacht" ist **falsch** — § 6 BGB regelt die Entmündigung-Aufhebung (heute weggefallen). Die Norm ist **§ 164 BGB** (Stellvertretung). Korrektur in research-scout-Datei.

## 4. Realistische Daten-Snapshots (Tile-Inhalte mit `[MOCK]`)

Alle Snapshots sind synthetisch, mit `[MOCK]` markiert; sie referenzieren Aktenzeichen-Formate aus `docs/domain/posteingang.md` §„Aktenzeichen-Formate".

### 4.1 Frist-Tile

```
[MOCK] Anstehende Fristen (3)
─────────────────────────────
🔴 14 Tage — Aufenthaltstitel verlängern
   ABH-B-2026/IV-A-7842 · Frist 22.05.2026
🟡 27 Tage — Einspruch Steuerbescheid 2024 prüfen
   FA Berlin Mitte/Tiergarten · 11/123/45678 · Frist 04.06.2026
⚪ 53 Tage — Schulbescheinigung Kindergeld nachreichen
   Familienkasse Berlin-Brandenburg · 115FK154721 · Frist 30.06.2026
```

Regeln:
- Maximal 3 Fristen oben; weitere per Click „Alle Fristen ansehen".
- **Jede Frist trägt das Aktenzeichen + den Original-Wortlaut der Frist-Floskel** (siehe posteingang.md §„Frist-Floskeln"), abrufbar per Hover/Tooltip — Halluzinations-Schutz.
- Farbschema: rot <7 Tage, gelb <30 Tage, neutral darüber. Keine emotionale Drohrhetorik („verfällt unwiderruflich!").

### 4.2 Posteingang-Tile

```
[MOCK] Posteingang
──────────────────
3 ungelesen · 12 gesamt
Letzter Brief: Finanzamt Berlin Mitte/Tiergarten — 02.05.2026
„Bescheid für 2024 über Einkommensteuer …"
```

Regeln: Count + Behörden-Absender (kein Inhalts-Leak); Pre-Open-Snippet ≤ 120 Zeichen; Klick öffnet `posteingang/`.

### 4.3 Vorgangs-Stand-Tile

```
[MOCK] Laufende Vorgänge (2)
──────────────────────────────
Umzug Berlin → Hamburg
   Status: in Bearbeitung · letzte Bewegung 28.04.2026
   Beteiligte Behörden: 4 (siehe Detail)
Aufenthaltstitel-Verlängerung
   Status: angelegt · Antrag in Vorbereitung
```

Regeln:
- Status-Vokabular vereinheitlicht (`angelegt | in_pruefung | wartet_auf_buerger | wartet_auf_behoerde | genehmigt | abgelehnt`) — Übernahme aus CLAUDE.md Datenmodell.
- **Keine** Bearbeitungszeit-Prognose („wird voraussichtlich am … bearbeitet"). **Keine** Wartezeit-Median pro Behörde (siehe §10 Adjudikation 5b).
- Erlaubt: „letzte Bewegung vor X Tagen" (faktisch belegbar aus Mock-Statushistorie).

### 4.4 Termin-Tile

```
[MOCK] Nächster Termin
──────────────────────
Mi 13.05.2026, 09:30 Uhr
Bürgeramt Mitte (Müllerstraße 146, 13353 Berlin)
Anmeldung nach § 17 BMG
[ In Kalender (.ics) ]
```

Regeln: .ics-Export erfolgt **client-side**, kein Push an Behörden-Kalender. Wenn Online-Termin: Video-Link (Mock).

### 4.5 Datenschutz-Cockpit-Tile

```
[MOCK] Datenschutz
──────────────────
Diese App in den letzten 30 Tagen:
• 3 Briefe geöffnet
• 1 KI-Zusammenfassung erstellt
• 1 Datenfeld an Anthropic übermittelt (pseudonymisiert)

Behördlicher Datenaustausch (Bund):
→ Im offiziellen Datenschutzcockpit ansehen ↗
```

Regeln:
- **Oberer Block**: App-eigenes Activity-Log (was *wir* tun) — wir sind dafür verantwortlich + transparent.
- **Unterer Block**: **Verweis** auf BVA-DSC mit ↗-Pfeil, **keine Datenkopie**. Optional ein Aggregat-Counter „N Datenabfragen letzte 30 Tage", aber NUR wenn die Demo den BVA-DSC-API-Mock im Read-Only-Modus simuliert und das im UI als „aus dem Datenschutzcockpit gefetcht (simuliert)" gekennzeichnet ist.
- **Keine** parallelen Behörden-zu-Behörden-Datenflüsse in unserer App speichern.

### 4.6 Stammdaten-Status-Tile

```
[MOCK] Stammdaten
─────────────────
Möchten Sie Ihre Adresse prüfen?
  Anna-Louisa-Karsch-Str. 4, 10178 Berlin
  Letzte Bestätigung durch Sie: 14.04.2026
[ Adresse bestätigen ]
```

Regeln:
- **Keine Aussage** „Behörde X hat Ihre alte Adresse" (siehe §10 Adjudikation 5e).
- Erlaubt: nur **eigene Bestätigungs-Historie** („Sie haben am … bestätigt") — das ist ein App-internes Faktum, keine Drittquelle.
- Nudge-Pattern: nach Vorgangsabschluss „Adresse 14.04.2026 aktualisiert — bei Banken etc. selbst nachpflegen?" mit Checkliste, **keine** Behauptung über Behörden-Sync-Stand.

## 5. Häufige Hürden für Bürger:innen

Über Posteingang-Hürden hinaus dashboardspezifisch:

- **Aufmerksamkeits-Asymmetrie**: BundID-Login ~5×/Jahr (~0,4 Logins/Konto/Monat — 2 Mio Logins ÷ 4,86 Mio Konten, Mitte 2026); Banking-Apps werden in Größenordnungen häufiger geöffnet (DAU/MAU 30–50 % im Industrie-Schnitt). Konsequenz: jeder Login muss vollständig informieren — „Diff seit letztem Login" ist deshalb load-bearing. *(Quellen: Statista BundID 2025, eGov-MONITOR 2025; Verwaltung-vs-Banking-Frequenz-Vergleich = Triangulation, keine direkte DE-Studie — `confidence: medium` für Größenordnungs-Aussage; `high` für Verwaltungs-Login-Seltenheit.)*
- **Frist-Verpassens-Quote DE-weit**: keine offizielle Statistik. Recherche `not found` bestätigt. Konsequenz: Demo darf keine Quote zitieren. Erlaubt: qualitative Aussagen über § 240 AO Säumniszuschlag (1 % pro Monat) und § 41 Abs. 2 VwVfG / § 122a Abs. 4 AO-Bekanntgabefiktion (4. Tag nach Bereitstellung) als sachlicher Hinweis.
- **„Frist-Sterben"** (research-scout-Phänomenologie): Briefe gehen ins amtliche Postfach (ZBP/Mein-ELSTER), Bürger:in liest sie aber selten genug, dass die 4-Tage-Bekanntgabefiktion *vor* dem tatsächlichen Lesen liegt. Die Dashboard-Tile-Architektur kann das *nicht direkt heilen* (wir sind Lese-/Erklär-Schicht, keine Postfach-Replika), aber via Frist-Tile + Termin-Tile + Disclaimer „Originalpostfächer regelmäßig öffnen" sichtbar machen — siehe posteingang.md §„Disclaimer opening".
- **„Wo bin ich gerade in mehreren Vorgängen?"**: heute fragmentiert — BundID-Statusmonitor zeigt nur Bund-Anträge, Service-BW/BayernPortal/etc. zeigen nur Land/Kommune. Cross-Behörden-Aggregation existiert 2026 nicht. Demo-Wow-Punkt — aber explizit als „Aggregations-Vision auf Basis NOOTS-Ausbau RegMoG" framen.
- **„Eine Adresse, viele Stellen"-Trugschluss** (übernommen aus umzug.md, posteingang.md): Stammdaten-Status-Tile darf diesen Trugschluss nicht *bestätigen* (durch falsche Sync-Versprechen) — siehe §10 Adjudikation 5e.
- **Begriffsverwirrung Bescheid / Bestätigung / Anschreiben** (übernommen aus posteingang.md): Dashboard-Frist-Tile darf nur Briefe mit *belegbarer* Frist-Floskel anzeigen. Keine Frist-Konstruktion bei rein informativen Mitteilungen (Mitteilung der örtlichen Zuständigkeit — *kein* VA, keine Frist).

## 6. Aufmerksamkeits-Ökonomie

### 6.1 Verwaltung vs. Banking — Größenordnungs-Asymmetrie

| Kontext | typische Login-Frequenz | belastbar belegt? |
|---|---|---|
| BundID (DE Verwaltung Bund) | ~5×/Jahr/Konto (2 Mio Logins ÷ 4,86 Mio Konten/Monat) | Bund-Statista 2025, BMI-FAQ |
| RealMe (NZ Verwaltung) | ~36×/Jahr/Konto (>3 Mio Logins ÷ ~1 Mio Nutzer:innen/Monat) | govt.nz |
| Mobile Banking (US/EU Industrie-Schnitt) | täglich bis mehrfach täglich; DAU/MAU 30–50 % | UXCam Benchmarks 2025 |

**Konsequenz für UI-Pflicht**:
- *Wenig* Logins → *jeder* Login muss vollständig orientieren → „Diff seit letztem Login" + „Heute zu tun" sind Pflicht-Kacheln, nicht optional.
- *Wenige* Logins → kein „streamhafter Newsfeed", sondern **Snapshot-Pattern** (Borger.dk Mit Overblik, eesti.ee, Singpass MyICA). Dashboard ist eine *Standortbestimmung*, kein *Strom*.

### 6.2 Cognitive Load — Miller, Hick

- **Miller (7 ± 2)**: max. 7 Top-Tiles im First-View. Empfehlung 5–6 Tiles + 1 Diff-Block + 1 „Heute zu tun"-Karte = ≤8 Items, an Miller-Obergrenze.
- **Hick-Hyman**: Entscheidungszeit wächst log mit Optionen → Sticky-Top-Bar mit Anchor-Links statt Tab-Komposition; progressive disclosure für Details.
- **eGov-MONITOR-Verständlichkeit**: 75 % von Behördensprache überfordert (siehe posteingang.md §„Häufige Hürden"). Konsequenz: keine §-Verweise im Tile-Titel; §-Verweise nur in Detail-Drawern + Disclaimern. Tile-Texte in Alltagssprache, Sie-Form, ≤ 60 Zeichen Titel, ≤ 120 Zeichen Sub.

### 6.3 Belastbare eGov-MONITOR 2025-Zahlen (verifiziert gegen Initiative-D21-Original)

| Kennzahl | Wert | Quelle |
|---|---|---|
| Vertrauen in den Staat 2025 | **33 %** (2022: 38 %) | initiatived21.de Pressetext |
| „Staat macht mein Leben einfacher" | **12 %** | initiatived21.de Pressetext (verifiziert) |
| „Erwartungen an moderne digitale Verwaltung erfüllt" | **15 %** | initiatived21.de Pressetext (verifiziert) |
| Mangelnde Auffindbarkeit als Hürde | **36 %** | eGov-MONITOR 2025 PDF |
| Voraussetzung „schnell und einfach finden" | **61 %** | eGov-MONITOR 2025 PDF |
| Erwartung aktive Kommunikation | **64 %** | eGov-MONITOR 2025 PDF |
| Wunsch keine doppelten Dateneingaben | **55 %** | eGov-MONITOR 2025 PDF |
| Wunsch schnellere Bearbeitung | **56 %** | eGov-MONITOR 2025 PDF |

**Forsa/dbb 2025** (n=2.011, Erhebung 09/2025) — die research-scout-Werte 59 % „sehr anstrengend", 16 % „effizient", 23 % „aufgabenfähig", 73 % „Staat überfordert", 85 % „verständlichere Gesetze gewünscht" sind aus dem dbb-Pressetext / Forsa-Bericht 2025 ableitbar; primary verification gegen das Forsa-PDF ist im research-scout zitiert ([^29]). Übernahme **bestätigt**.

**BundID-Frequenz-Triangulation**: 2 Mio Logins/Monat ÷ 4,86 Mio Konten ≈ **0,41 Logins/Konto/Monat ≈ 4,9 Logins/Konto/Jahr**. Die Aussage „~5×/Jahr/Konto" ist zulässig; **wichtige Klarstellung**: das ist nicht „pro Bürger:in", sondern „pro **registriertem** Konto" — Nicht-Konto-Inhaber:innen sind in dieser Rechnung gar nicht enthalten. Korrektur in research-scout: Formulierung „Logins pro Bürger:in" → „Logins pro registriertem Konto".

## 7. Realistic mock-data hints — Persona-Tile-Snapshots

> Snapshots referenzieren `docs/personas.md` (Anna Petrov · Familie Schmidt · Mehmet Yıldız) und Aktenzeichen-Formate aus posteingang.md.

### 7.1 Anna Petrov (Single, Drittstaatsangehörige, 1. Steuererklärung in DE)

```
Heute zu tun (3)
1. 🔴 Aufenthaltstitel verlängern — 14 Tage
   Ihre Aufenthaltserlaubnis nach § 18g AufenthG läuft am 22.05.2026 ab.
   [ Vorgang starten ]
2. 🟡 Steuererklärung 2025 prüfen — 27 Tage
   ELSTER hat Ihre Lohnsteuerdaten vorausgefüllt.
   [ Vorausgefüllt ansehen ]
3. ⚪ Stromzähler-Endstand an EnBW — 7 Tage
   Folge aus Umzug-Vorgang vom 28.04.2026.
   [ Wert eintragen ]

Tiles aktiv: Frist · Posteingang (3 ungelesen) · Vorgänge (2 offen) · Termin (Mi 13.05.) · Datenschutz · Stammdaten
Tile NICHT angezeigt: Familie (kein Vollmachts-Credential)
```

### 7.2 Familie Schmidt (Ehepaar mit 2 Kindern, gemeinsame Umzug-Cascade)

```
Heute zu tun (3)
1. 🔴 Schulanmeldung Kind 2 — 9 Tage
   SA-NEUKÖLLN-2025/26-1142 · Schulamt Neukölln
   [ Antrag fortsetzen ]
2. 🟡 Kindergeld-Adressänderung bestätigen — 21 Tage
   Familienkasse 115FK154721 · Mitwirkungspflicht § 68 EStG
3. ⚪ Steuererklärung 2025 (Ehegatten-Splitting) — 60 Tage

Tiles aktiv: alle 6 inkl. Familie
Familie-Tile: aktiv, weil Mock-Vollmacht „Ehegatten-Vertretung in Verwaltungsangelegenheiten" + Sorge für Kind 1 + 2 (§ 1626 BGB)
```

### 7.3 Mehmet Yıldız (Selbstständig, türk. Staatsangehöriger mit Niederlassungserlaubnis)

```
Heute zu tun (3)
1. 🔴 Umsatzsteuer-Voranmeldung Q1 2026 — 3 Tage
   Frist 10.05.2026 · ELSTER · Steuernummer 11/345/67890
2. 🟡 IHK-Beitragsbescheid — 19 Tage
3. ⚪ Berufsgenossenschaft Mitgliedsbeitrag — 41 Tage

Tiles aktiv: Frist · Posteingang · Vorgänge · Termin · Datenschutz · Stammdaten (Gewerbe-Adresse separat)
Familie: nicht aktiv
Hinweis: Aufenthalt ist Niederlassungserlaubnis (§ 9 AufenthG) — kein Verlängerungs-Tile
```

## 8. Legal disclaimer to surface in UI

Vier in `de.json` zu pflegende Strings (Sie-Form, knapp, ohne Behörden-Jargon). Diese sind **zusätzlich** zu den vier Posteingang-Disclaimern (`posteingang.disclaimer.opening | no_legal_advice | mock_data | original_authoritative` — siehe posteingang.md §„Legal disclaimer to surface in UI"), die unverändert auch im Dashboard-Detail-Drawer einzublenden sind, sobald Brief-Inhalte gerendert werden.

**1. `dashboard.disclaimer.no_profiling`**

> „Die Reihenfolge in „Heute zu tun" ist eine Anzeige-Hilfe — keine automatisierte Entscheidung im Sinne von Art. 22 DSGVO. Sie behalten die volle Übersicht und entscheiden selbst, was Sie zuerst tun. Jede Empfehlung wird mit Begründung angezeigt und ist jederzeit über „Alle Aktionen anzeigen" auflösbar."

**2. `dashboard.disclaimer.wartezeit_omit`**

> „Wir zeigen keine Wartezeit-Statistiken pro Behörde. Solche Daten werden in Deutschland nicht offiziell aggregiert publiziert; eine Anzeige würde das Risiko bergen, falsche Erwartungen zu wecken. Den letzten Bearbeitungs-Stand Ihres Vorgangs sehen Sie im jeweiligen Vorgangs-Detail."

**3. `dashboard.disclaimer.familie_vollmacht`**

> „Die Familien-Übersicht setzt eine aktive Vollmacht (§ 164 BGB) oder elterliche Sorge (§ 1626 BGB) voraus. Sie sehen gemeinsame Vorgänge **nur**, wenn Sie eine entsprechende Vollmacht in Ihrem Profil hinterlegt haben. Rechtliche Vertretung im Verwaltungsverfahren richtet sich nach § 14 VwVfG; ein Schalter in dieser App ersetzt keine schriftliche Vollmacht gegenüber der Behörde."

**4. `dashboard.disclaimer.stammdaten_sync_speculative`**

> „Den aktuellen Stand Ihrer Daten bei einzelnen Behörden können wir Ihnen heute nicht anzeigen — eine Bürger-Sicht auf Behörden-Datenstände existiert in Deutschland 2026 noch nicht. Diese Anzeige zeigt deshalb nur, wann **Sie selbst** Ihre Stammdaten zuletzt bestätigt haben. Datenflüsse zwischen öffentlichen Stellen sehen Sie im offiziellen Datenschutzcockpit."

**Zusätzliche kontext-spezifische Inline-Disclaimer (kürzer):**

- *Vor* AI-Reasoning-Text in „Heute zu tun"-Karten (Tooltip): „Begründung wird mit KI erstellt — sie ist eine Empfehlung, keine Bewertung Ihres Falls."
- *Über* dem Datenschutz-Cockpit-Tile (Sub-Zeile): „Rechtsverbindliche Auskunft im Datenschutzcockpit des Bundesverwaltungsamts."
- *Bei* Familie-Tile-Erst-Aktivierung: „Bitte hinterlegen Sie eine Mock-Vollmacht — die Demo simuliert das EUDI-Wallet-Vollmachts-Credential, das ab voraussichtlich 2027 produktiv wird."

## 9. Zusätzliche Risikofelder, die der Mock vermeiden muss

1. **Profiling-Falle**: Wenn die AI mehr als nur Reihenfolge bestimmt (z.B. „diese Behörde lehnt Anträge wie Ihren häufig ab" oder „Ihr Aufenthalt ist gefährdet"), ist die Schwelle zu Art. 22 DSGVO real überschritten. **Verbot in der Demo**: keine Erfolgs-/Misserfolgs-Prognosen, keine personenbezogenen Wahrscheinlichkeits-Aussagen.
2. **Wartezeit-Datenfälschung**: Median-Bearbeitungszeiten pro Behörde gibt es offiziell nicht. Die Demo erfindet sie auch nicht — selbst mit `[MOCK]`-Watermark. Begründung: kommunal-sensitive Daten würden bei einem Portfolio-Demo durch GovTech-Stakeholder als Falschdarstellung gelesen werden, die einen unrealistischen Vergleich nahelegt.
3. **DSC-Doppelung**: Kein paralleler Datenschutz-Cockpit-Build. Wir simulieren *Verlinkung* + *App-eigenes Activity-Log* — keine Behörden-zu-Behörden-Datenfluss-Replika lokal.
4. **Familie-Implizit-Sichtbarkeit**: Familie-Tile darf nicht aufgrund Familienstand-Stammdatums automatisch gemeinsame Vorgänge zeigen. Aktive Vollmachts-Einrichtung (im Mock: Schalter „Vollmacht hinterlegen" mit Persona-Storyline) ist Pflicht.
5. **Stammdaten-Sync-Versprechen**: Keine Aussage „Behörde X hat Adresse Stand Y". Das wäre eine Behauptung ohne technisches Substrat.
6. **Phishing-Look bei AI-Reasoning**: AI-Texte in „Heute zu tun"-Karten dürfen nicht so klingen wie Behörden-Briefe (kein Briefkopf-Look, kein „Hiermit teilen wir Ihnen mit"). Stattdessen explizit App-Voice („Wir empfehlen, …").
7. **Diff-Block-Falsch-Interpretation**: „Seit Ihrem letzten Login" muss klar Bürger-Geräte-side framed sein („auf diesem Gerät zuletzt am …") — nicht als Behörden-Audit-Aussage.
8. **Bundeslogo-/Behördenlogo-Risiko** (Marken-/Hoheitszeichen-Recht, § 124 OWiG, BMI-Logo-Verordnung): keine Bundes-Adler oder offizielle Behördenlogos verwenden ohne Lizenz; Demo arbeitet mit generischen Behörden-Initial-Badges (`<BehoerdenBadge>` aus CLAUDE.md), nicht mit echten Logos. Bei der research-scout-Frage „dürfen wir Behörden-Logos zeigen?" ist die Antwort: **nein, nur generische Badges**.
9. **Kalender-Push**: .ics-Termin-Export ist client-side; **kein** Termin-Sync in echte Behörden-Buchungssysteme.

## 10. Adjudikation der Research-Disagreements

### 10.1 (a) AI-Top-3 vs. Art. 22 DSGVO + RDG → **REVISE**

**Adjudikation**: Erlaubt **nur als reine Anzeige-Sortierung** — `dashboard.disclaimer.no_profiling`-Architektur ist UI-konstitutiv.

**Begründung Art. 22**: Art. 22 Abs. 1 setzt eine *ausschließlich* automatisierte Entscheidung mit *rechtlicher Wirkung* oder *ähnlich erheblicher Beeinträchtigung* voraus. Eine reine Reihenfolge-Sortierung von Aktions-Empfehlungen, bei der die Bürger:in
- (i) die volle Liste sehen kann („Alle Aktionen anzeigen"),
- (ii) die Aktion explizit auslösen muss (kein Auto-Versand),
- (iii) eine sichtbare Begründung der Sortierung erhält,
löst keine rechtliche Wirkung aus — die Wirkung tritt erst durch die menschliche Auslösung ein. Damit liegt **kein** Anwendungsfall von Art. 22 Abs. 1 vor; eine Berufung auf Art. 22 Abs. 2 lit. c (Einwilligung) wäre als Belt-and-Suspenders-Architektur trotzdem zulässig (Art. 6 Abs. 1 lit. a + Art. 22 Abs. 2 lit. c kumulativ in der Datenschutzerklärung).

**Begründung RDG**: § 2 Abs. 1 RDG definiert Rechtsdienstleistung als „Tätigkeit in konkreten fremden Angelegenheiten, sobald sie eine rechtliche Prüfung des Einzelfalls erfordert." Eine **Aktions-Reihenfolge** auf Basis von Frist-Daten + Behörden-Absender-Klassifikation ist **keine** rechtliche Einzelfall-Prüfung. **Verbotene Grenzüberschreitungen** (siehe posteingang.md §10): „Ihr Widerspruch ist erfolgversprechend", „Diese Aktion sollten Sie *nicht* tun", „Sie haben gute Chancen, dass …" — solche Aussagen sind Rechtsdienstleistungs-nahe und in der Demo verboten. Erlaubte Formulierungen: „Frist näher als bei anderen Aktionen", „Termin bereits vereinbart", „Folgevorgang aus Umzug-Cascade".

**Konkrete Anforderungen an die Implementierung**:
- AI-Eingabe minimal halten: Briefkopf-Absender + Frist-Datum + Vorgangs-Status — **kein** Brief-Body, **keine** Sozialdaten.
- AI-Ausgabe ist eine geordnete Liste mit Begründungs-String pro Item; keine zusätzlichen Bewertungen.
- Bürger:in kann jederzeit auf manuelle Sortierung umschalten („Nach Frist" / „Nach Behörde" / „Nach Vorgang").
- Logging: jede AI-Sortierung mit Eingabe-Snapshot + Ausgabe protokolliert (für nachträgliche Erklärbarkeit).

### 10.2 (b) Wartezeit-Median-Tile → **REJECT**

**Adjudikation**: Tile **streichen**. Keine Variante mit `[Beispieldaten]`-Markierung.

**Begründung**:
- Bundesweite Aggregat-Statistik zur Bearbeitungszeit pro Behörde existiert nicht öffentlich. Eine Anzeige würde Erwartungen wecken, die in der Realität nicht eingelöst werden können.
- Kommunal-sensitive Daten: Bürgerämter mit notorischer Wartezeit-Krise (Berlin, München, Hamburg) wären adressiert; selbst eine `[MOCK]`-Markierung würde im Demo-Loom-Video wie eine reale Aussage wirken.
- **Zulässige Alternative** (in §4.3 Vorgangs-Stand-Tile bereits implementiert): „Letzte Bewegung vor X Tagen" — das ist faktisch belegbar aus dem Mock-Statushistorie und beleidigt keine Behörde. Kein „typischerweise X–Y Tage" mehr.

### 10.3 (c) DSC-Tile vs. BVA-Konkurrenz → **REVISE (architektur-spezifisch)**

**Adjudikation**: Tile **erlaubt**, aber als **Verlinkungs-Tile + App-Activity-Log**, nicht als DSC-Replika.

**Zuständigkeits-Klarstellung**:
- **BundID-Konto** (Träger: BMDS, technisch BMI/Bundesamt für Sicherheit in der Informationstechnik / DigitalService) — Identitätsmittel + Postfach (ZBP) + Statusmonitor. Stand 04/2026 ~ 4,86 Mio Konten.
- **Datenschutzcockpit (DSC)** (Träger: Bundesverwaltungsamt mit Freie Hansestadt Bremen als technischem Auftragnehmer) — Bürger-Sicht auf Daten-**Übermittlungen zwischen öffentlichen Stellen**, basiert auf IDNr (AO § 139b) als Schlüssel.
- **NOOTS** (National Once-Only Technical System) — Vermittlungs-Layer für register-übergreifenden Datenaustausch; operative erste Version Anfang 2026 inkl. erstem produktiven Nachweis-Abruf.

→ Drei **getrennte** Systeme. Unsere Demo darf nicht so tun, als würde sie eines davon ersetzen oder bündeln. Sie darf **referenzieren**.

**Konkrete Anforderungen**:
- Tile zeigt **(i)** App-eigene Aktivitäten (was wir mit den Bürger-Daten in der App tun) und **(ii)** einen Verweis ins offizielle BVA-DSC.
- **(ii)** ist als externe Verlinkung gestaltet (↗-Pfeil, kein Inline-Frame), Disclaimer „rechtsverbindliche Sicht dort".
- Optional ein **simulierter Aggregat-Counter** „N Datenabfragen in den letzten 30 Tagen" — nur, wenn die Demo das BVA-DSC explizit als Mock-API simuliert (`mock-backend/dsc.ts`) und im UI als „aus dem Datenschutzcockpit gefetcht (simuliert)" gekennzeichnet ist.
- **Verboten**: lokale Speicherung der DSC-Listendaten; das wäre eine unautorisierte Datenkopie hoheitlicher Aufzeichnungen.

**Open question für concept-verifier**: Ob die BVA-DSC-Architektur 2026 eine maschinen-lesbare Aggregat-API hat oder nur die Web-UI — `not found` in dieser Recherche, in `docs/research/2026-05-08-dashboard.md` ist die Frage offen ([^34][^35]). **Empfehlung**: Tile mit Aggregat-Counter ist als „Speculative 2027 — auf Basis künftiger BVA-DSC-API" zu framen, falls die API heute nicht existiert.

### 10.4 (d) Familie-Tile-Berechtigungsmodell → **REVISE**

**Adjudikation**: Tile **erlaubt**, aber **nur** mit explizit aktivem Vollmacht-/Sorge-Modell. Nie implizit aus Familienstand-Stammdatum.

**Rechts-Architektur**:
- **Erwachsene-Erwachsene-Vertretung**: § 164 Abs. 1 BGB i.V.m. § 14 Abs. 1 VwVfG. Vollmacht muss „auf Verlangen schriftlich nachgewiesen" werden (§ 14 Abs. 1 S. 3 VwVfG). Konkludent erteilte Vollmacht zwischen Ehepartnern existiert dogmatisch (Anscheinsvollmacht/Duldungsvollmacht), reicht aber **nicht** für hoheitliche Verfahrenshandlungen (z.B. Antrag stellen, Bescheid entgegennehmen). **Konsequenz Demo**: UI-Schalter „Mein:e Partner:in darf für mich Vorgänge sehen" reicht für die *App-interne* Sicht (Vertragsbeziehung App ↔ Bürger:in, Art. 6 Abs. 1 lit. b DSGVO). Sie reicht **nicht** für Außenwirkung gegenüber Behörden.
- **Eltern-Kind-Vertretung minderjähriger Kinder**: §§ 1626 Abs. 1, 1629 Abs. 1 BGB. Bei verheirateten Eltern: gemeinschaftliche Sorge automatisch (§§ 1626 Abs. 1, 1626a BGB i.V.m. §§ 1626c ff., abhängig von Familienstand bei Geburt). Bei Vorgängen *des* Kindes (Steuer-ID des Kindes, Krankenkasse, Schulanmeldung) ist die Sorge die Rechtsgrundlage; Demo darf das ohne Mock-Vollmachts-Credential, **wenn** Sorge im Stammdaten-Mock dokumentiert ist (`personas.json` enthält `kinder: [{...}]` + `sorge_gemeinschaftlich: true`).
- **EUDI-Wallet-Vollmachts-Credential**: ab 2027 produktiv geplant, in DE 2026 noch nicht im EUDI-Wallet-Pilot verfügbar. **Demo-Konvention**: simuliert als „Mock-Vollmachts-Credential" mit Hinweis „Speculative 2027".

**Konkrete Anforderungen**:
- Familie-Tile **nicht angezeigt** für Anna (Single, kein Kind).
- Familie-Tile **angezeigt** für Familie Schmidt nach explizit eingerichteter Mock-Vollmacht zwischen Ehepartnern + automatisch bei Sorge für Kinder.
- Tile-Inhalt: **nur Vorgänge, die explizit als gemeinsam markiert sind** (z.B. Umzug-Cascade Familie, Kindergeld). Keine Cross-Sicht in einzelne Sozial-/Steuer-Vorgänge des/der Partner:in ohne separate Vollmacht.
- Disclaimer `dashboard.disclaimer.familie_vollmacht` muss bei Tile-Aktivierung einmal explizit bestätigt werden.

### 10.5 (e) Stammdaten-Sync-Health-Tile → **REVISE (Form-Eingrenzung)**

**Adjudikation**: Tile **erlaubt nur in der eingegrenzten Form** „Sie haben Ihre Adresse zuletzt am … bestätigt — möchten Sie prüfen?". Aussagen über Behörden-Datenstände sind **verboten**.

**Begründung**:
- Citizen-side-Wissen über „welche Behörde hat welche Version meiner Adresse" existiert 2026 nicht. Das Datenschutzcockpit zeigt **Datenflüsse** (Wer hat wann welche Daten an wen übermittelt), nicht Daten-**Stände bei** den Empfängern.
- Eine Anzeige „Finanzamt: Adresse Stand 02.03.2026" wäre eine Falschbehauptung — selbst mit `[MOCK]`-Markierung. Demo-Stakeholder (DigitalService, BMDS) würden das als unrealistisch lesen.
- **Zulässige Form** (in §4.6 implementiert): nur **eigene** Bestätigungs-Historie + **Nudge-Pattern** mit Checkliste „bei welchen Stellen *Sie selbst* die Adresse aktualisieren sollten" (übernommen aus umzug.md-Hürden).

### 10.6 Neue Disagreements für concept-verifier (zusätzlich zu den 5 oben)

**(f) „Diff seit letztem Login"-Block — Datenschutz-Implikation**: Wir speichern Bürger-Geräte-side ein `lastSeenAt` + Diff-Snapshot. Zulässig auf Basis Art. 6 Abs. 1 lit. b DSGVO (vertragsmäßige Übersichts-Funktion), aber `concept-verifier` sollte adjudizieren, ob der Diff-Block in der Demo sichtbar als „auf diesem Gerät zuletzt am …" gerahmt wird, damit Bürger:in den lokalen Charakter versteht. **Adjudikations-Vorschlag**: ja, framing-Pflicht.

**(g) AI-Begründungs-Texte — Prompt-Injection-Risiko**: Wenn die AI auf Basis von Brief-Bodies sortiert, könnte ein synthetischer „Mock-Brief mit injizierter Anweisung" die Sortierung manipulieren. Auch wenn alle Briefe synthetisch sind, ist das ein UX-Failure-Mode für Demo-Loom-Aufnahmen. **Adjudikations-Vorschlag**: AI-Eingabe auf strukturierte Felder (Absender-Name, Frist-Datum, Vorgangs-Status, Behörden-Kategorie) reduzieren — keine Brief-Body-Übergabe an die AI für die Sortierung.

**(h) Behördenlogo-Verwendung**: research-scout fragt, ob myGov-/RealMe-Pattern (Logo pro Behörde) zulässig ist. **Adjudikation**: nein, nur generische Initial-Badges (`<BehoerdenBadge>` in CLAUDE.md `components/shared/`). Marken- und Hoheitszeichen-Recht ist real (BMI-Logo-Verordnung; § 124 OWiG-Nähe bei missbräuchlicher Verwendung).

**(i) Wo Disclaimer rechts-rauschen anfangen**: Wenn jeder Tile 1–2 Disclaimer trägt, untergräbt das die UX-Klarheit (Cookie-Banner-Effekt). **Adjudikations-Vorschlag**: 4 globale Dashboard-Disclaimer plus Posteingang-Verweis-Disclaimer; Tile-spezifische Mikro-Disclaimer nur als Tooltip / unter dem Tile-Titel, nicht als Banner. Concept-verifier sollte UX-/Legal-Balance prüfen.

**(j) Frequenzdaten-Generalisierung**: research-scout-Aussage „BundID 5×/Jahr/Konto" ist **belegt**, aber Aussage „Banking 5×/Tag" ist **nicht atomar belegt** (DAU/MAU 30–50 % in UXCam-Industrie-Schnitt; keine DE-Vergleichsstudie). **Adjudikations-Vorschlag**: in der Loom-Erzählung „eine Größenordnung häufiger" verwenden, nicht „5×/Tag vs. 5×/Jahr".

---

**Ende der Adjudikation**. Status-Flip in `docs/research/2026-05-08-dashboard.md`: `draft` → `revised`. Korrekturen sind oben annotiert (§-Verweis BGB §6 → BGB §164; „Logins pro Bürger:in" → „Logins pro registriertem Konto"; Banking-Frequenz auf „Größenordnung" generalisiert; Familie-Tile-Berechtigungsmodell präzisiert; DSC-Tile-Architektur als Verlinkungs-Tile gefasst).
