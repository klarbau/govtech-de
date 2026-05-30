---
vorgang: umzug-konvenienz-und-normen
title: Umzug — Konvenienz-Bezugszahlen & korrigierte Rechtsnormen (Zitierquelle für die UI)
last_validated: 2026-05-29
status: verified
gates: on-screen claims for the Umzug convenience build (Wertquittung, per-step Rechtsgrundlagen, Datenkategorien, Loom-Staging)
supersedes_partial: docs/domain/umzug.md (Bearbeitungszeiten dort bleiben gültig; hier konsolidiert für die Wertquittung)
based_on: docs/reviews/mock-convenience-gaps-realism.md (G1–G10)
sources:
  - https://www.gesetze-im-internet.de/ao_1977/__19.html        # §19 AO örtl. Zuständigkeit nat. Personen — LIVE VERIFIZIERT 2026-05-29
  - https://www.gesetze-im-internet.de/ao_1977/__139b.html      # §139b AO Steuer-IdNr unveränderlich — LIVE VERIFIZIERT 2026-05-29
  - https://www.gesetze-im-internet.de/pauswg/__18.html         # §18 PAuswG elektr. Identitätsnachweis (eID), Kategorie "Anschrift/Wohnort-ID" — LIVE VERIFIZIERT 2026-05-29
  - https://www.gesetze-im-internet.de/sgb_5/__206.html         # §206 SGB V Auskunfts-/Mitteilungspflichten Versicherte — LIVE VERIFIZIERT 2026-05-29 (Wortlaut bestätigt)
  - https://www.gesetze-im-internet.de/aufenthg_2004/__87.html  # §87 AufenthG (Übermittlungen AN ABH bei Verstößen — NICHT Adresspflege) — LIVE VERIFIZIERT 2026-05-29
  - https://www.gesetze-im-internet.de/aufenthg_2004/__86.html  # §86 AufenthG (Datenerhebung durch ABH) — LIVE VERIFIZIERT 2026-05-29
  - https://www.gesetze-im-internet.de/bmg/__17.html            # §17 BMG Meldepflicht (umzug.md)
  - https://www.gesetze-im-internet.de/bmg/__19.html            # §19 BMG Wohnungsgeberbestätigung — LIVE VERIFIZIERT 2026-05-29 (nur Wohnungsgeber/beauftragte Person)
  - https://www.bva.bund.de/DE/Das-BVA/Aufgaben/A/Auslaenderzentralregister/azr_node.html  # AZR-Datenanlieferung (BVA)
  - https://initiatived21.de/publikationen/egovernment-monitor/2025   # eGovernment-MONITOR 2025: Behördengang Ø 2h21min
confidence_session_note: >
  In dieser Session live nachgeprüft (gesetze-im-internet.de / dejure.org / sozialgesetzbuch-sgb.de via WebFetch +
  WebSearch, 2026-05-29): §19 AO (Wohnsitzfinanzamt für nat. Personen), §139b AO (Nummer einmalig + unveränderlich),
  §206 SGB V (Versicherte melden Änderungen unverzüglich — Wortlaut Abs. 1 Nr. 2 + Abs. 2 verbatim bestätigt),
  §18 PAuswG (eID, Kategorie Anschrift/Wohnort-ID), §87 AufenthG (Übermittlungen AN die ABH bei Verstößen — NICHT
  Adresspflege), §86 AufenthG (Erhebung durch ABH). §19 BMG live nachgeprüft → Bestätigung nur durch Wohnungsgeber
  oder eine von ihm beauftragte Person (Eigentümer nur, wenn zugleich Wohnungsgeber); Mitwirkungspflicht mit
  Tenant-Notify-Remedy, NICHT absolute Anmeldungs-Sperre (Korrektur ggü. Gap-Report, siehe D4 + §5).
  BMG/FZV/§17 aus docs/domain/umzug.md (last_validated 2026-05-08). Jede Norm trägt unten einen Confidence-Vermerk.
---

# Umzug — Konvenienz-Bezugszahlen & korrigierte Rechtsnormen

> **Zweck.** Single source für (1) die exakten Zahlen der Wertquittung und (2) die korrigierten Rechtsnormen
> D1–D7 und (3) das Loom-Staging. Coder ziehen **verbatim** aus §1 (Zahlen), §2 (Normen), §3 (Staging).
> Keine Zahl auf den Schirm, die nicht in §1 steht; kein § auf den Schirm, der nicht in §2 steht.
> Zielgerichtet lesen — nicht das ganze Dokument.

> **Framing-Hard-Rule.** Der Prototyp übermittelt NICHT an reale Behörden/Register. Alle Kaskaden-Texte
> konditional: „Wenn die Register angebunden wären, …" / „Der Prototyp simuliert die Übermittlung." Siehe §4.
> Dieses Dokument ersetzt die falschen Normen im Code (`src/lib/mock-backend/autopilot/umzug.ts`, siehe
> „Entfernen"-Zeilen in §2) und konsolidiert die im Gap-Report identifizierten Korrekturen (G1–G3, G7).

---

## 1. Zeitersparnis-Bezugszahlen (Headline-Wertquittung)

**Leitprinzip: konservativ + verteidigbar.** Lieber unterschätzen — ein zu hoher Wert ist die erste Stelle,
an der ein fachkundiger Betrachter (NKR, DigitalService) „belegen Sie das" sagt. Alle Werte mit `ca.` / `bis zu`.
Quellenlage je Zeile im Confidence-Vermerk. Keine umstrittene nationale Makro-Statistik als *Quelle* — die Zahlen
sind bottom-up aus der Pro-Schritt-Realität gebaut; eine eGovernment-MONITOR-Zahl dient nur als Korroboration (1d).

### 1a. Die exakten UI-Werte (verbatim rendern)

| Kennzahl | UI-Text (verbatim) | Reasoning / Quelle | Confidence |
|---|---|---|---|
| Beteiligte Stellen (Obergrenze) | **„bis zu 8 Stellen"** | Vollbeladener Umzug: Einwohnermeldeamt, Finanzamt, Kfz-Zulassung, Krankenkasse, Beitragsservice, Familienkasse, Arbeitgeber, Ausländerbehörde. Eine einzelne Person trifft nie alle 8 (kfz/Kind/eAT sind bedingt). „bis zu" = ehrliche Obergrenze; typisch beladen 6–7. | hoch |
| Anna live (Loom) | **„6 Behörden"** | Annas konkreter Live-Fan-out mit empfohlenem Flag-Stand (§3). | hoch |
| Formulare / Meldungen klassisch | **„ca. 7 Meldungen"** | 5 Immer-Stellen + ~2 bedingte, je eigene Meldung/Antrag (Meldeformular §17 BMG, Kfz §15 FZV, KK, Beitragsservice, Arbeitgeber, ggf. Finanzamt, ggf. Familienkasse). Zählung von Meldeakten, keine Zeitstudie. | hoch |
| Aufwand klassisch | **„ca. 8 Stunden"** | Konservative Summe Wege + Warten + Bearbeitung über mehrere Wochen (Herleitung 1b; korroboriert durch eGov-MONITOR Ø 2h21min je Behördengang, 1d). | mittel |
| Aufwand mit Autopilot | **„ca. 15 Minuten"** | Ein eID-gestützter Bestätigungsvorgang; danach läuft die Kaskade ohne weitere Bürgeraktion. Beschreibt die Demo-Aktion selbst. | hoch |
| Behördengänge / Wege klassisch | **„bis zu 4 Behördengänge"** | Getrennte physische/Termin-Wege: Bürgeramt, Kfz-Zulassung, ggf. ABH-eAT-Termin, ggf. eine weitere Vorsprache. Konservativ gedeckelt. | mittel |
| Behördengänge mit Autopilot | **„0 Behördengänge"** | Beschreibt die Demo-Aktion selbst. | hoch |

**Approved Ein-Satz-Wertaussage:**
> „Statt ca. 7 Meldungen bei bis zu 8 Stellen und ca. 8 Stunden über mehrere Wochen — einmal per Online-Ausweis
> bestätigen, ca. 15 Minuten, 0 Behördengänge."

### 1b. Herleitung „ca. 8 Stunden" (für Nachfragen offenlegen)

Konservative Bausteine, am unteren Rand der Realität (Termin-**Wartezeiten** NICHT eingerechnet — die würden die
Zahl ins Unseriöse treiben; vgl. umzug.md: Bürgeramt-Terminvorlauf 3–6 Wochen):

- Bürgeramt-Anmeldung inkl. Hin-/Rückweg + Wartezeit vor Ort: ca. 2 Std *(eGov-MONITOR-Ankerwert je Behördengang: 2h21min)*
- Wohnungsgeberbestätigung beschaffen/nachhalten: ca. 0,5 Std
- Kfz-Adressänderung inkl. Weg + Vorsprache: ca. 1,5 Std
- Krankenkasse + Beitragsservice + Arbeitgeber je 0,5–1 Std Schriftverkehr/Online: ca. 2 Std
- Finanzamt/Sonstiges + Recherche „wer muss überhaupt informiert werden": ca. 2 Std
- **Summe ca. 8 Std** (gerundet, ohne Termin-Wartezeiten).

> **Rundungsregel für die UI:** Stunden auf **ganze Stunden** (abgerundet); Behörden/Formulare/Wege auf **ganze
> Zahlen**; Autopilot-Aufwand auf **5-Minuten-Schritte**. Niemals Nachkommastellen oder Scheingenauigkeit
> („7,5 Behörden", „8 h 12 min"). Immer `ca.` / `bis zu` voranstellen. „Stellen" (max 8, inkl. Arbeitgeber +
> Beitragsservice) ≠ „Behörden" (der reine Behörden-Fan-out, §3) — auf dem Schirm NICHT synonym verwenden.

> **Anti-Overclaim-Regel:** NICHT „spart Wochen" behaupten (Termin-Wartezeiten löst der Autopilot nicht). Ehrliche
> Aussage: **aktiver Bürgeraufwand** sinkt von ca. 8 Std auf ca. 15 Min — nicht die behördliche Durchlaufzeit.

### 1d. Korroborierender Anker (NICHT die On-Screen-Quelle)

eGovernment-MONITOR 2025 (Initiative D21): der durchschnittliche Behördengang dauert **2 h 21 min** (57 min
Anfahrt + 48 min Warten + 36 min Bearbeitung) und nutzt eine Umzugs-Persona, deren Umzug „normalerweise mehrere
Behördengänge erfordert — Adresse ummelden, Auto am neuen Ort anmelden, Familienkasse informieren". Korroboriert
die Pro-Besuch-Minuten + das Multi-Stellen-Framing. Confidence: hoch für die 2-h-21-min-Zahl (direkt berichtet).

> **KEIN nationaler „X Stunden pro Jahr für Behördengänge"-Makro-Wert auf dem Schirm** — methodenabhängig und im
> Live-Demo leicht angreifbar. Das Pro-Umzug-Bottom-up-Framing oben trägt ohne ihn.

---

## 2. Korrigierte Rechtsnormen D1–D7 (autoritative Form)

Jede §-Stelle am 2026-05-29 auf gesetze-im-internet.de / dejure.org / sozialgesetzbuch-sgb.de gelesen (wo „live
verifiziert" vermerkt). Pro Eintrag: zu verwendende Norm, was zu ENTFERNEN ist, Code-Fundstelle, Confidence.
D1–D3/D5–D7 setzen G1–G3/G5/G7/G8 aus dem Gap-Report um.

### D0 — Einwohnermeldeamt (Ummeldung, Anker, feuert immer)
- **Verwenden:** **§ 17 Abs. 1 BMG** (Meldepflicht bei Einzug, binnen zwei Wochen). Voraussetzung:
  Wohnungsgeberbestätigung § 19 BMG (D4).
- **Confidence:** hoch (unverändert aus umzug.md; korrekt).

### D1 — Einkommensteuer → Wohnsitz-Finanzamt, **§ 19 AO**
- **Verwenden:** `§ 19 AO` (örtliche Zuständigkeit für Steuern vom Einkommen/Vermögen **natürlicher Personen** —
  zuständig ist das Finanzamt des **Wohnsitzes** bzw. gewöhnlichen Aufenthalts), optional i.V.m. `§ 36 BMG`
  (Meldedaten-Übermittlung als Auslöser). `rechtsgrundlage: '§ 19 AO'`.
- **Entfernen:** `§ 39 AO` (= Zurechnung von Wirtschaftsgütern — sachfremd; umzug.ts L99/L100) **und** das Routing
  an ein **Finanzamt für Körperschaften** (umzug.ts L98/L104/L109 `finanzamt-koerperschaften-i-berlin` — nur für
  juristische Personen, NICHT für Annas Einkommensteuer). Ziel: ein **Wohnsitz-Finanzamt**
  (z. B. `finanzamt-berlin-mitte-tiergarten`, in umzug.md bereits als Briefkopf-Beispiel).
- **Aktion-Text:** „Mitteilung über die örtliche Zuständigkeit nach § 19 AO".
- **Confidence:** **hoch** — §19 AO live verifiziert (Heading „Steuern vom Einkommen und Vermögen natürlicher
  Personen"; Wortlaut „…in dessen Bezirk der Steuerpflichtige seinen Wohnsitz … hat").

### D2 — eAT-Adressaktualisierung → eID-Basis **§ 18 PAuswG**, kein Melderegister→ABH-Push
- **Verwenden:** `§ 18 PAuswG` (elektronischer Identitätsnachweis / Online-Ausweisfunktion — Übermittlung der
  definierten Kategorien inkl. **Anschrift/Wohnort-ID** mit PIN + Berechtigungszertifikat + Einwilligung) als Basis
  des vorbereiteten Adress-Schritts. Ergänzender Hinweis: „Der eAT-Adressabgleich erfolgt **nutzergesteuert** über
  die eID-Funktion; das AZR wird von vielen Stellen (auch Meldebehörden) beliefert, die eAT-Kartenanschrift aber in
  einem separaten, von der/dem Inhaber:in angestoßenen ABH-Akt aktualisiert — **kein** automatischer
  Melderegister→Ausländerbehörde-Push."
- **Entfernen:** `§ 87 AufenthG` als Basis des Adress-Schritts (umzug.ts L213) — **live verifiziert falsch**: §87
  regelt **Übermittlungen *an* die ABH bei ausländerrechtlichen Sachverhalten** (unrechtmäßiger Aufenthalt,
  Ausweisungsgründe, Ausreise) durch *andere öffentliche Stellen* — Strafverfolgungs-/Aufsichtskanal, NICHT
  Adresspflege. Ebenso `§ 86 AufenthG` (= ABH *darf* Daten *erheben*) an der zweiten Fundstelle (umzug.ts L351,
  Log-Hook) entfernen. **Alle Fundstellen (umzug.ts L213, L351; vorgaenge.json L41) auf § 18 PAuswG
  vereinheitlichen** — §86/§87 nebeneinander ist zudem in sich widersprüchlich.
- **Framing-Pflicht:** „Adressmeldung vorbereitet + ABH-Termin angeboten; die Kartenaktualisierung **bleibt bei der
  Behörde** — termin-/antragsgebunden, kein Auto-Push." (umzug.ts L222-Brieftext ist bereits korrekt; nur die
  `rechtsgrundlage` ist falsch.)
- **Confidence:** §18 PAuswG = **hoch** (live verifiziert; Kategorie „Anschrift/Wohnort-ID" bestätigt). §87/§86
  AufenthG-Fehlzuordnung = **hoch** (live verifiziert). „Kein automatischer Push der eAT-Kartenanschrift" =
  **mittel** (etablierte Praxis + AZRG-Anlieferungsmodell; keine einzelne zitierbare Klausel) — siehe §5.

### D3 — Krankenkasse-Adressänderung → **eine** Basis: `Art. 6 Abs. 1 lit. a DSGVO + § 206 SGB V`
- **Verwenden:** durchgängig (Live-Schritt + Seed-Fixture + Datenschutz-Log) **`Art. 6 Abs. 1 lit. a DSGVO`**
  (Einwilligung) ergänzt um **`§ 206 SGB V`** (Auskunfts-/Mitteilungspflichten der Versicherten). **Wortlaut
  verbatim verifiziert** (Abs. 1 Nr. 2): Versicherte haben „Änderungen in den Verhältnissen, die für die
  Feststellung der Versicherungs- und Beitragspflicht erheblich sind und nicht durch Dritte gemeldet werden,
  unverzüglich mitzuteilen" — deckt eine Anschrift-/Wohnsitz-Änderung. umzug.ts L145 (Block B AOK) ist bereits
  korrekt `lit. a` — der Drift sitzt in vorgaenge.json L140 (`lit. b`) und im Log-Hook umzug.ts L339 (`§ 28a SGB IV`).
- **Entfernen:** `§ 28a SGB IV` / DEÜV (umzug.ts L339) — das ist das **Arbeitgeber→Krankenkasse**-Meldeverfahren,
  **kein** bürgerinitiierter Adress-Push. Ebenso die `lit. a`/`lit. b`-Drift beseitigen (überall `lit. a`).
- **Confidence:** **hoch** — §206 SGB V live verifiziert (Überschrift „Auskunfts- und Mitteilungspflichten der
  Versicherten"; Wortlaut Abs. 1 Nr. 2 + Abs. 2 bestätigt); DEÜV als Arbeitgeberpflicht ist eindeutig.

### D4 — Wohnungsgeberbestätigung **§ 19 BMG** (Voraussetzung, kein Kaskaden-Schritt)
- **Verwenden:** **§ 19 BMG** — Mitwirkungspflicht des Wohnungsgebers; Bestätigung des Einzugs schriftlich oder
  elektronisch innerhalb der Frist des § 17 Abs. 1 BMG (zwei Wochen). Die meldepflichtige Person legt sie vor.
- **Wer darf ausstellen (live verifiziert, § 19 Abs. 3 BMG):** **nur der Wohnungsgeber oder eine von ihm
  beauftragte Person.** Eine beauftragte Hausverwaltung / Vertretung ist zulässig. Der bloße **Eigentümer** darf
  **nicht eigenständig** ausstellen, **es sei denn, er ist zugleich der Wohnungsgeber** (selbstvermietend oder
  selbstgenutztes Eigentum). Ist der Wohnungsgeber nicht der Eigentümer, muss die Bestätigung zusätzlich den
  **Namen des Eigentümers** enthalten (§ 19 Abs. 3 S. 2).
- **Korrektur ggü. Gap-Report (live verifiziert):** §19 BMG ist eine **Mitwirkungspflicht**, KEINE absolute
  „Anmeldung ist sonst rechtlich unmöglich"-Sperre. Der gesetzliche Remedy bei fehlender Bestätigung ist die
  **Pflicht der meldepflichtigen Person, der Meldebehörde das Nicht-Vorliegen unverzüglich mitzuteilen** — nicht
  eine automatische Anmeldungs-Sperre. Daher rendern als **„erforderliche Voraussetzung, die die Demo erfüllt"**,
  NICHT als „ohne sie ist die Anmeldung rechtlich unmöglich".
- **Darstellung (Empfehlung):** als **erfüllte Voraussetzung am Bürgeramt-Schritt** — „Wohnungsgeberbestätigung
  (§19 BMG) — **Nachweis aus EUDI-Wallet beigefügt**" (zeigt den Autopilot-Vorteil: die Wallet liefert den
  Nachweis). Alternativ Block-C-Task „vom Vermieter anfordern" (`generates_template: true`). **Nicht** stillschweigend
  überspringen — das verstecken eine echte Mitwirkungspflicht. (Aktuell fehlt §19 BMG in BLOCK_A + Block C.)
- **Frist Wohnungsgeber:** zwei Wochen; Verstoß Bußgeld bis 1.000 € (§ 54 Abs. 2 Nr. 3 i.V.m. Abs. 3 BMG).
- **Confidence:** hoch (§19 BMG live verifiziert — Ausstellungsbefugnis + Eigentümernennung + Remedy).

### D5 — Steuer-IdNr **unveränderlich, § 139b AO** (nur örtliche Steuernummer ändert sich)
- **Verwenden:** `§ 139b AO` ausschließlich für die **steuerliche Identifikationsnummer** und deren
  Unveränderlichkeit aktiv klarstellen („Eine natürliche Person darf nicht mehr als eine Identifikationsnummer
  erhalten. Jede Identifikationsnummer darf nur einmal vergeben werden." → lebenslang konstant, ändert sich NICHT
  beim Umzug; §139b Abs. 8: Meldebehörden melden Datenänderungen *unter Angabe der* IdNr — die Nummer selbst bleibt).
- **Pflicht-Floskel im FA-Brief (gegen Fehllesart „neue Steuer-Identität"):** „Ihre steuerliche
  Identifikationsnummer (§ 139b AO) bleibt unverändert; lediglich Ihre **örtliche Steuernummer** ändert sich durch
  den Zuständigkeitswechsel." (An umzug.ts L108-Floskel anhängen.)
- **Confidence:** **hoch** — §139b AO live verifiziert (Nummer einmalig + unveränderlich; ändert sich nicht beim Umzug).

### D6 — Arbeitgeber-Benachrichtigung → **Art. 6 Abs. 1 lit. b DSGVO**, privatrechtlicher Schritt
- **Verwenden:** `Art. 6 Abs. 1 lit. b DSGVO` (Durchführung des Arbeitsverhältnisses / Personalstammdaten).
- **Einordnung:** **privatrechtlich / app-assistiert** (Block B) — **kein Behörden-Push.** Auf dem Schirm als
  „private Stelle" badgen, NICHT als „Behörde". Im Headline-Wow genannt, fehlt aber bislang im Autopilot (G5;
  BLOCK_B hat nur Sparkasse, Allianz, Vattenfall, Telekom — umzug.ts L141–172). Aufnehmen oder aus dem Headline
  streichen, damit Claim = Build. Hinweis: beim Arbeitnehmer löst der Arbeitgeber seinerseits die
  §28a-SGB-IV-/DEÜV-Meldung an die KK aus — genau der Pfad, der NICHT zum Bürger-Schritt D3 gehört.
- **Zählung:** in „bis zu 8 Stellen" enthalten, NICHT im „X Behörden"-Count (§3).
- **Confidence:** hoch (DSGVO-Standardnorm).

### D7 — Datenkategorien je Schritt (Datenminimierung sichtbar machen, G8)
Pro Empfänger die **minimal tatsächlich übermittelten** Kategorien — NICHT das ganze Profil. BfDI-/Datenschutz-
Beweispunkt (Art. 5 Abs. 1 lit. c DSGVO). Heute hardcodet der Log-Hook `field_id: 'anschrift_aktuell'` für alle
(umzug.ts L364). Empfohlene `datenkategorien`-Werte (genau diese rendern):

| Empfänger | Übermittelte Datenkategorien (minimal) | NICHT übermitteln |
|---|---|---|
| Einwohnermeldeamt (D0) | Name, Geburtsdatum, alte + neue Anschrift, Einzugsdatum, Wohnungsgeberbestätigung | — (Vollmeldesatz nur ggü. Meldebehörde) |
| Finanzamt (D1) | Name, Steuer-IdNr, neue Anschrift | Familienstand, Religion, Einkommen |
| Ausländerbehörde (D2) | Name, eAT-/Dokumentennummer, neue Anschrift | Beschäftigungsdetails, Familienstand |
| Krankenkasse (D3) | Name, Versichertennummer, neue Anschrift | Familienstand, Arbeitgeber, Diagnosen |
| Beitragsservice | **nur** Name + neue Anschrift + Einzugsdatum (+ Beitragsnummer als Bezug) | **Familienstand, Religion, Geburtsdatum, Versichertennr.** |
| Kfz-Zulassung | Name, Kennzeichen, neue Anschrift (Halteranschrift) | Steuer-IdNr, Familienstand |
| Familienkasse (nur Kindergeldbezug) | Name, Kindergeldnummer/Steuer-IdNr, neue Anschrift | volle Geburtsdaten der Kinder, Einkommen |
| Arbeitgeber (D6, privat) | Name, Personalnummer, neue Anschrift | Geburtsdatum, Familienstand, Steuer-IdNr |

- **Beitragsservice = der Vorzeige-Beat:** „An den Beitragsservice ging **nur** Ihre neue Anschrift — **nicht** Ihr
  Familienstand oder Ihre Konfession." (Hinweis: der reale Adress-Feed für den Rundfunkbeitrag läuft rechtlich über
  § 11 Abs. 4 RBStV i.V.m. § 36 BMG; die gezeigten Datenkategorien bleiben dennoch der Minimalsatz oben.)
- **Confidence:** hoch (Minimalsatz je Aufgabe fachlich abgeleitet, nicht je Empfänger einzeln normativ belegt).

---

## 3. Loom-Staging-Notiz — Personas-Flags für „sechs Behörden"

Die Narration sagt „**sechs Behörden**". **Annas tatsächlicher Flag-Stand** (gelesen aus `src/data/personas.json`,
anna-petrov, 2026-05-29):

| Flag | Wert bei Anna | Schaltet Block-D-Schritt frei |
|---|---|---|
| `aufenthaltstitel` | gesetzt (`§ 18g AufenthG`, L52–57) | Ausländerbehörde (eAT, D2) — **feuert** |
| `kindergeld_bezug` | **`true`** (L123) | Familienkasse — **feuert** |
| `kfz_halter` | **`false`** (L122) | Kfz-Zulassung — **feuert NICHT** |

(snake_case; Block-D-Gates in umzug.ts L184/L200/L215 lesen exakt `p.kfz_halter`, `p.kindergeld_bezug`,
`p.aufenthaltstitel`.)

**„Behörde" vs „Stelle" für den Count:** Arbeitgeber (privat) und Beitragsservice (Anstalt d. ö. R.,
Beitragseinzug) sind **keine** Behörden im engen Sinn. Für eine ehrliche „sechs Behörden"-Narration nur öffentliche
Stellen zählen und den Rest auf dem Schirm als „private Stelle" / „Anstalt" labeln.

**Datenkonsistenz-Nebenbefund (regardless of Loom):** Anna trägt ein vollständiges `mobilitaet.halter`-Fahrzeug
(Kennzeichen `B-AP 4711`, L157–169), aber `kfz_halter: false`. Das ist widersprüchlich — `kfz_halter: true` zu
setzen macht die Persona in sich stimmig.

### Empfohlenes Staging (sauberes „sechs Behörden")

Flags setzen: **`kfz_halter: true`**, **`kindergeld_bezug: true`** (bleibt), **`aufenthaltstitel`** (bleibt).
Annas Live-Fan-out liefert dann **sechs öffentliche Behörden** zum Narrieren, in Lauf-Reihenfolge:

1. **Einwohnermeldeamt** (Bürgeramt Berlin-Mitte) — D0
2. **Finanzamt** (Wohnsitz-FA, § 19 AO) — D1
3. **Kfz-Zulassungsstelle** (LABO Berlin) — Block D
4. **Krankenkasse** (AOK Nordost — Körperschaft d. ö. R.; als „Behörde" narrierbar) — Block B
5. **Familienkasse** (Bundesagentur für Arbeit — **Bund**) — Block D
6. **Ausländerbehörde** (LEA Berlin) — Block D

→ **„sechs Behörden" narrieren.** Zusätzlich auf dem Schirm, aber NICHT im Count, gelabelt „private Stelle /
Anstalt": **Beitragsservice** + **Arbeitgeber** (+ optionale Block-B-Privatempfänger Bank/Versicherung/Strom/Telekom,
die der/die Nutzer:in zuschaltet). Bundesdruckerei ist ein Unter-Schritt der Anmeldung (Adressaufkleber), keine
eigene Behörde für den Count.

> **Alternative (ohne ABH im Hero):** `kfz_halter: true`, `kindergeld_bezug: true`, `aufenthaltstitel` *entfernt* →
> sechs = Einwohnermeldeamt, Finanzamt, Kfz, Krankenkasse, Familienkasse, **Beitragsservice** (Anstalt mitzählen).
> Aber Annas Headline-Story IST die Blue-Card-Inhaberin — die ABH-Variante oben ist stärker und on-brand. **Eine**
> Inszenierung wählen und die Narration darauf festnageln.

- **Confidence:** hoch — Annas Flags + Block-D-Gates direkt aus personas.json + umzug.ts gelesen (2026-05-29).

---

## 4. Legal disclaimer to surface in UI

> „Hinweis: Dieser Prototyp simuliert die behördenübergreifende Datenübermittlung. Es findet **keine** echte
> Übermittlung an Behörden oder Register statt. Real erfolgt die Übermittlung von Meldedaten an andere öffentliche
> Stellen nach §§ 33–34a, 36 BMG; die Mitteilung an die Krankenkasse setzt Ihre Einwilligung (Art. 6 Abs. 1 lit. a
> DSGVO, § 206 SGB V), die an den Arbeitgeber das Arbeitsverhältnis (Art. 6 Abs. 1 lit. b DSGVO) voraus. Die
> Einkommensteuer-Zuständigkeit richtet sich nach dem Wohnsitz (§ 19 AO); Ihre steuerliche Identifikationsnummer
> (§ 139b AO) bleibt unverändert. Die Adresse auf der elektronischen Aufenthaltskarte wird nicht durch das Meldeamt
> aktualisiert — die Aktualisierung erfolgt nutzergesteuert über die eID-Funktion (§ 18 PAuswG); kein automatischer
> Melderegister→Ausländerbehörde-Push. Außerdem gelten die Meldepflicht binnen zwei Wochen (§ 17 Abs. 1 BMG) und die
> Wohnungsgeberbestätigung (§ 19 BMG). Alle Aktenzeichen, Briefe und Zeitangaben sind synthetisch und mit `[MOCK]`
> gekennzeichnet. Die genannten Zeitersparnis-Werte sind konservative Schätzungen des aktiven Bürgeraufwands, keine
> behördlichen Durchlaufzeiten."

---

## 5. Offen / nicht abschließend bestätigt (confidence: low/medium)

- **AZR / Melderegister→Ausländerbehörde-Auto-Push (D2):** confidence **mittel**. Der nutzergesteuerte
  eID-Mechanismus (§ 18 PAuswG, Kategorie „Anschrift/Wohnort-ID") ist per Statut bestätigt. Das *Fehlen* eines
  generellen automatischen Push der eAT-Kartenanschrift ist etablierte Praxis (BVA-AZRG-Anlieferungsmodell), keine
  einzelne zitierbare Klausel. Auf dem Schirm konservativ formulieren („nutzergesteuert über die eID-Funktion"); kein
  absolutes „es gibt keinen Push".
- **„ca. 8 Stunden" klassischer Aufwand:** confidence **mittel** — Bottom-up-Schätzung (1b), korroboriert durch den
  eGov-MONITOR-Pro-Besuch-Wert (2h21min, confidence hoch), kein gemessener Gesamtwert. Mit „ca." und ganzstündiger
  Granularität rendern; nicht als gemessene Zahl präsentieren.
- **§ 19 BMG „harte Sperre":** der Gap-Report rahmte die Wohnungsgeberbestätigung als absolute Voraussetzung. Das
  Statut rahmt sie als **Mitwirkungspflicht** mit Tenant-Notify-Remedy bei Nicht-Vorliegen. In D4 korrigiert — als
  „erforderliche Voraussetzung, die die Demo erfüllt" rendern, NICHT „Anmeldung ohne sie rechtlich unmöglich".
