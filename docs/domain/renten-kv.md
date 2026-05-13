---
vorgang: stammdaten-v1.1-renten-kv
title: Renteninformation + KV-Status für Stammdaten V1.1 (Domain-Validation)
last_validated: 2026-05-10
upstream-research: docs/research/2026-05-10-renten-kv.md
verdict: VALIDATED-WITH-CORRECTIONS (research-scout PROCEED, sofern fünf Korrekturen unten eingearbeitet werden)
sources-primary:
  - https://www.gesetze-im-internet.de/sgb_6/__109.html (§ 109 SGB VI Renteninformation)
  - https://www.gesetze-im-internet.de/sgb_6/__2.html (§ 2 SGB VI pflichtversicherte Selbstständige)
  - https://www.gesetze-im-internet.de/sgb_5/__342.html (§ 342 SGB V ePA-Pflicht-Anlage)
  - https://www.gesetze-im-internet.de/sgb_5/__343.html (§ 343 SGB V ePA-Informationspflicht)
  - https://www.gesetze-im-internet.de/sgb_5/__290.html (§ 290 SGB V KVNR)
  - https://www.gesetze-im-internet.de/sgb_5/__10.html (§ 10 SGB V Familienversicherung)
  - https://www.gesetze-im-internet.de/sgb_11/__18c.html (§ 18c SGB XI 25-Tage-Frist)
  - https://dejure.org/gesetze/DSGVO/9.html (Art. 9 DSGVO)
  - EuGH 01.08.2022 — C-184/20 (OT v. Vyriausioji): weite Auslegung Art. 9 DSGVO (indirekte Offenbarung)
  - https://zfdr-vorsorgeeinrichtungen.drv-bund.de/ (ZfDR Vorsorgeeinrichtungen-Portal)
  - BMF-Monatsbericht 04/2025 — Digitale Rentenübersicht: ~137 Mio Anwartschaften, 700+ Einrichtungen
  - Haufe / vdek / TK 2026 — Bezugsgröße 3 955 € / Familienversicherungs-Grenze 565 € + 603 € Minijob
---

## Verdict (Domain-Expert)

**VALIDATED-WITH-CORRECTIONS** — die Researchstruktur trägt, vier von fünf Säulen stehen sauber. Vor product-architect-Übergabe **fünf** legal-realism-Korrekturen einarbeiten:

1. ePA-Norm-Zitat fehlt § 342 → muss ergänzt werden (Research-scout zitiert nur § 343, das ist die *Info*-Pflicht; die Anlage-Pflicht steht in **§ 342 Abs. 1 Satz 2 SGB V**).
2. ZfDR-Zahl korrigieren — Research-Scout sagt „288 angeschlossene Vorsorgeeinrichtungen", BMF 2025 nennt **~700 Einrichtungen / ~137 Mio Anwartschaften**. Die 288 stammt vermutlich aus älterer Quelle 2023/24.
3. § 109 SGB VI — Pflicht-Inhalte sind **fünf** Punkte (nicht vier). Research-scout vergisst Nr. 1 „Angaben über die **Grundlage der Rentenberechnung**". Beitragszeit-Hürde „≥ 5 Jahre" steht nicht im Wortlaut von § 109 — sie folgt aus den **allgemeinen Wartezeiten** (§ 50 SGB VI: allgemeine Wartezeit 5 Jahre). Diese Trennung muss saubrer sein.
4. Versorgungswerke + Beamtenversorgung sind **NICHT** an die ZfDR pflicht-angebunden (BMF). Mehmet-Track muss das transparent machen.
5. EuGH-Linie zu Art. 9 (C-184/20 OT v. Vyriausioji, Urteil 01.08.2022) — **„weite Auslegung"**: alles, woraus auf Gesundheits-, Religions-, Orientierungs-Daten *durch gedanklichen Schluss* geschlossen werden kann, fällt unter Art. 9. Diese Rechtsprechung kippt zwei der research-scout-Annahmen (PKV-Tarif-Name, Beihilfe-Berechtigung) — siehe Tabelle unten.

Confidence-Update: research-scout schreibt `medium`. Nach Domain-Validierung: **high für 90 % des Scopes**, `medium` nur noch für die zwei Grenzfälle PKV-Tarif-Name + Beihilfe (siehe Open Questions unten — concept-verifier muss finalisieren).

---

## Confirmed (research-scout korrekt, keine Korrektur nötig)

- **§ 290 SGB V KVNR-Aufbau**: zwei-Teile-Modell (unveränderbarer + veränderbarer Teil) korrekt; konkrete Ziffern-Aufteilung (1 Buchstabe + 8 Ziffern + Prüfziffer) ist **GKV-Spitzenverband-Richtlinie**, nicht Gesetz — research-scout-Zitat in `stammdaten.md` (V1) bleibt gültig, das ist nur Visualisierungs-Hinweis.
- **§ 18c SGB XI** 25-Arbeitstage-Frist: korrekt; Begutachtung erfolgt durch *Medizinischer Dienst* (für GKV) bzw. *MEDICPROOF* (für PKV-Pflichtversicherte) — der Gesetzeswortlaut nennt nur „Medizinischer Dienst oder beauftragte Gutachter:innen", die PKV/GKV-Trennung ergibt sich aus § 23 SGB XI + organisationsrechtlicher Praxis. Korrekt für die UI ist: zeigen, **welche** Begutachtungs-Stelle zuständig ist (deterministisch aus KV-Typ ableitbar).
- **§ 10 SGB V Familienversicherung 2026**: 565 €/Monat allgemein (= 1/7 von Bezugsgröße 3 955 €) und 603 €/Monat Minijob — bestätigt durch Haufe + vdek + TK. Alters-Grenzen 18/23/25 (Studium/Ausbildung) und unbegrenzt bei Behinderung — korrekt.
- **§ 109 SGB VI Saisonalität + jährlich + ab 27** — korrekt; Rentenauskunft (ausführlicher) **alle 3 Jahre ab 55** korrekt; elektronischer Bezug (eservice-drv.de) korrekt.
- **Yellow-Letter-Demo-Vehicle** als Bridge ist legal-tragfähig: §§ 33, 34, 36 BMG erlauben den Brief, eine private App spiegelt nur den Inhalt (keine Schreib-Operation); Activity-Log-Eintrag ist app-internes Mock — saubere Linie.
- **DEÜV-Adressfluss zur GKV** (Bürgeramt → Datenstelle DRV → Kasse) — hier ist `stammdaten.md` (V1) bereits vorsichtig formuliert; V1.1 darf sich darauf stützen.
- **rentenuebersicht.de als Wegweiser-Ziel** (kein eigener Kontostand) — korrekt; ZfDR ist Organisationseinheit der DRV Bund nach RentÜG.

---

## Corrections (research-scout muss vor product-architect nachziehen)

### Correction 1 — ePA-Norm-Zitat: § 342 statt § 343 SGB V

Research-scout (Zeile 277): „2025-01-15 — ePA automatisch eingerichtet (§ 343 SGB V — vorbehaltlich domain-expert-Verifizierung der genauen Norm)".

**Korrektur**: Die Anlage-Pflicht steht in **§ 342 Abs. 1 Satz 2 SGB V**:
> „Ab dem 15. Januar 2025 sind die Krankenkassen verpflichtet, jedem Versicherten, der nach vorheriger Information gemäß § 343 der Einrichtung einer elektronischen Patientenakte gegenüber der Krankenkasse nicht innerhalb einer Frist von sechs Wochen widersprochen hat..."

§ 343 SGB V ist **nur die Informationspflicht** der Kassen *vor* der Anlage (Inhalt der Aufklärung über Widerspruchsrecht etc.). Beide Normen muss V1.1 zitieren — Activity-Log-Eintrag korrekt: „§ 342 Abs. 1 S. 2 i.V.m. § 343 SGB V". Sechs-Wochen-Frist statt nur Existenz-Hinweis ist relevant für Tooltip.

### Correction 2 — ZfDR-Zahl: 700+ Einrichtungen / 137 Mio Anwartschaften

Research-scout: „288 angeschlossene Vorsorgeeinrichtungen Stand 2026" — vermutlich aus 2023-Quelle.

**Korrektur (BMF-Monatsbericht 04/2025)**: ~**137 Mio Anwartschaften** bei **>700 Vorsorgeeinrichtungen**, Stand April 2025. **Pflicht-Anbindung seit 31.12.2024** für alle Einrichtungen mit jährlicher Standmitteilung und ≥ 1 000 Anwartschaften.

**Wichtige Ausnahmen** (NICHT pflicht-angebunden — V1.1 muss das ehrlich nennen):
- **Versorgungswerke** (Kammerberufe — Ärzte, Anwälte, Architekten, Apotheker)
- **Beamten-/Richter-/Soldatenversorgung**
- **Direktzusagen** der bAV ohne Standmitteilung
- Einrichtungen mit < 1 000 Anwartschaften
- (PKV-Renten-Tarife sind angebunden, sofern jährliche Standmitteilung; Lebensversicherer mehrheitlich angebunden.)

UI-Konsequenz: Wegweiser-Card auf rentenuebersicht.de braucht **Ehrlichkeits-Disclaimer** „Nicht alle Einrichtungen sind angebunden — Versorgungswerke und Beamtenversorgung melden separat".

### Correction 3 — § 109 SGB VI: fünf Pflicht-Inhalte (nicht vier) + Wartezeit-Quelle

Research-scout führt vier Pflicht-Inhalte (EM, Regelalter, Anpassung, Beiträge). **Wortlaut § 109 Abs. 3 SGB VI hat fünf**:

1. **Angaben über die Grundlage der Rentenberechnung** (← fehlt im Research-Output)
2. Angaben über die Höhe einer Rente wegen verminderter Erwerbsfähigkeit (EM-Rente)
3. eine Prognose über die Höhe der zu erwartenden Regelaltersrente
4. Informationen über die Auswirkungen künftiger Rentenanpassungen
5. eine Übersicht über die Höhe der Beiträge

**„≥ 5 Jahre Beitragszeit"** ist *nicht* aus § 109 ableitbar — die Prognose-Pflicht entfällt erst, wenn die **allgemeine Wartezeit** (§ 50 Abs. 1 SGB VI: 5 Jahre) noch nicht erfüllt ist (denn ohne Wartezeit-Erfüllung gibt es keine Anwartschaft auf Regelaltersrente, und die Prognose ist sinnlos). DRV-Praxis: Versand erst, wenn die 5-Jahres-Schwelle absehbar erreicht oder überschritten ist. Saubere V1.1-Formulierung im UI: „Voraussetzung: Mindestversicherungszeit nach § 50 SGB VI erfüllt".

UI-Konsequenz: Renteninformation-FieldCard zeigt **fünf** Eckwert-Felder (oder Punkt 1 = „Versicherungsverlauf-Kurzauszug" als generischer Tooltip), nicht vier. Mock-Letter-Beispielwerte in `letters.json` müssen alle fünf abbilden.

### Correction 4 — Mehmet als Selbstständiger: drei Tracks, nicht ein Track

Research-scout (Open Question 2): „Türkische Staatsangehörigkeit + Köln + Selbstständig — fällt er unter freiwillige GRV oder unter Versorgungswerk oder gar nichts?"

**Domain-Klärung — § 2 SGB VI listet 9 Pflicht-Selbstständigen-Gruppen**:

1. **Lehrer:innen / Erzieher:innen** ohne versicherungspflichtige Beschäftigte
2. **Pflegepersonen** in Kranken-/Wochen-/Säuglings-/Kinderpflege
3. **Hebammen / Entbindungspfleger**
4. **Seelotsen** (Binnenschifffahrt)
5. **Künstler / Publizist:innen** (über KSVG-Künstlersozialkasse)
6. **Hausgewerbetreibende**
7. **Küstenschiffer / Küstenfischer** (≤ 4 versicherte Beschäftigte)
8. **Handwerker** (mit Eintragung in Handwerksrolle, sofern zulassungspflichtiges Handwerk)
9. **Selbstständige mit nur einem Auftraggeber** (auf Dauer und im Wesentlichen, ohne versicherungspflichtige Beschäftigte)

**Drei Tracks für die Persona-Modellierung**:
- **Track A — Pflicht in GRV** nach § 2 SGB VI: bekommt Yellow Letter wie Angestellte (sobald Wartezeit erreicht)
- **Track B — Versorgungswerk** (Kammerberuf: Ärztin, Anwalt, Architektin, Steuerberater, Apothekerin, Notar): GRV-befreit nach § 6 Abs. 1 Nr. 1 SGB VI, **kein** § 109-Brief; Versorgungswerk schickt eigene jährliche Standmitteilung; ZfDR-Anbindung freiwillig
- **Track C — Privat-Vorsorge-only** (kein Pflicht-System, keine freiwillige GRV): bekommt **gar keinen** Yellow Letter

**Mehmet-Persona-Empfehlung**: Track C ist demonstrativ am stärksten (zeigt die *Lücke*, die V1.1 als speculative-design adressiert). UI-Pattern: leerer Renten-Slot + Informations-Card „Sie haben aktuell keine Renteninformation, weil Sie nicht in der GRV pflichtversichert sind. Optionen: 1. freiwillige GRV-Versicherung (§ 7 SGB VI), 2. Privatvorsorge prüfen, 3. Falls Sie zu einem Pflichtversicherten-Beruf nach § 2 SGB VI gehören (z. B. Handwerksrolle), Pflichtversicherung beantragen". Wegweiser-Link auf eservice-drv.de.

Wenn Track A gewünscht: Mehmet als „Selbstständiger Werbetexter mit nur einem Auftraggeber" → § 2 Nr. 9 SGB VI → Pflicht in GRV → Yellow Letter; das ist demonstrativ aber unauffälliger.

**Empfehlung**: Track C als Mehmet-Default (speculative-design-stärker), Track A als Persona-Variante optional.

### Correction 5 — Art-9-Linie nach EuGH C-184/20: zwei Felder kippen

Research-scout argumentiert (richtigerweise) im Geist der **engen** Lesart: Beihilfe und PKV-Tarif-Name als „grenzwertig". EuGH **01.08.2022 C-184/20 (OT v. Vyriausioji)** — „**weite Auslegung**" — hat das verschärft:

> Sensitive Daten iSv Art. 9 DSGVO sind alle Daten, **aus denen durch gedanklichen Schluss oder Vergleich** Informationen über die geschützten Kategorien (Gesundheit, Sexualität, Religion, Politik) ableitbar sind. Auch eine **indirekte** Offenbarung genügt. (Rn. 117–128 sinngemäß; bestätigt für Gesundheitsdaten konkret durch BAG, BFH und LDA-Bayern in Folgeentscheidungen.)

**Konsequenz für V1.1**:
- **PKV-Tarif-Name** (z. B. „Premium-Komfort", „Risiko-Tarif", „Beamten-Tarif") — **eher Art-9 in Grenzfällen**: Sobald der Tarif-Name den Versicherungsstatus über das hinaus indiziert, was eine universelle GKV-Mitgliedschaft offenbart (z. B. Risiko-Klassen-Hinweise), greift die EuGH-Linie. Empfehlung **V1.1: Tarif-Name komplett aus Scope streichen** — nur „PKV bei [Versicherer]" reicht.
- **Beihilfe-Berechtigung** (Beamt:innen) — research-scout sagt „streichen, falls bei Domain-Validierung kritisch". Domain-Verdict: **STREICHEN aus V1.1-Scope**. Beihilfe-Status ist *Sozial-/Beamtenstatus* + impliziert Krankheits-Abrechnungs-Kontext; in Kombination mit Pflegegrad oder Diagnose-Hinweisen wäre das eindeutig Art-9. Saubere V1-Linie ist „nur GKV/PKV-Binär + Kassenname/Versicherer + KVNR — keine Beihilfe-Card in V1.1". Beamten-Versorgungs-Wegweiser bleibt (das ist kein Krankheits-, sondern Renten-Wegweiser).

Pflegegrad bleibt klar Art-9 (Modal-Pattern). ePA-Existenz bleibt **nicht** Art-9 (organisations-bezogene Tatsache, da seit 15.01.2025 universal angelegt für alle GKV-Versicherten — die *Existenz* offenbart nichts Individuelles mehr; das war vor 01/2025 anders).

---

## Hard-Lines (verbindlich für product-architect + frontend-coder)

1. **Keine Renten-Berechnung in V1.1.** Spiegel-only aus dem letzten Yellow Letter; Tooltip „Werte stammen aus Ihrer Renteninformation vom DD.MM.YYYY und werden vom DRV-Träger berechnet (§ 109 SGB VI)".
2. **Keine ePA-Inhalte.** Nur Status (eingerichtet ja/nein, Widerspruch gesetzt ja/nein) + Wegweiser-Link auf Kassen-ePA-App.
3. **Kein Pflegegrad-Default-Render.** Modal-Pattern wie Religion in V1 (Art-9-Disclaimer + Einwilligungs-Toggle + Activity-Log-Eintrag „Pflegegrad angezeigt"). Hintergrund-Norm: Art. 9 DSGVO + EuGH C-184/20.
4. **Kein PKV-Tarif-Detail** (Selbstbehalt, Risikozuschlag, Tarif-Name).
5. **Keine Beihilfe-Card** in V1.1 (Art-9-Risiko nach EuGH-weiter-Lesart).
6. **Kein Beitragssatz-Detail.** Beitragssätze sind Vertragstatsache, aber gehören als Lohnabrechnungs-Kontext in die Beschäftigungs-Sektion (V1) — in der KV-Sektion **nicht** wiederholen, sonst Doppelung + indirekte Krankheits-Indikation bei PKV.
7. **Kein direkter API-Eindruck** zu DRV / GKV / gematik / ZfDR. Alle Daten aus `personas.json` + `seed.ts`. Wegweiser-Links auf externe Portale (eservice-drv.de, rentenuebersicht.de, Kassen-Online-Filiale, gematik-E-Rezept-App) werden visuell als externe Pointer markiert.
8. **Yellow-Letter-Bridge ist info-only — kein „Autopilot"-Frame.** Anders als Umzug: hier gibt es nichts zu *tun*. Primary CTA = „Werte in meinen Stammdaten ablegen", Secondary CTA = „Im DRV-Kundenportal öffnen". Keine Frist-Pille (info-only).
9. **Familienversicherten-Status** ist Vertrags-/Sozialdatum, **kein** Art-9. Direkt sichtbar in der Stammversicherten-FieldCard mit Status-Pill „Familienversichert über [Stammversicherte] — bis längstens MM/JJJJ" — Datum aus § 10 Abs. 2 SGB V (Alter 25 mit Studium/Ausbildung).
10. **Mehmet-Track-C-Disclaimer**: Wenn Persona keinen Yellow Letter bekommt (Track C), zeige eine Informations-Card statt leeren Slot — niemals leere Skelett-UI suggerieren, dass „die App den Brief noch nicht geladen hat".

---

## Art-9-Linie pro Feld (Tabelle mit Begründung)

Diese Tabelle ist die zentrale Output-Sektion für concept-verifier (auf dessen Adversarial-Pass dann die UI-Default-Logik zementiert wird).

Legende: **A9** = Modal-Pattern wie Religion in V1 (default-collapsed + Disclaimer + Toggle + Activity-Log-Eintrag); **direkt** = Default sichtbar.

| Feld | Art-9? | Default-Pattern | Begründung |
|---|---|---|---|
| GKV-Mitgliedschaft (Krankenkasse-Name, z. B. „AOK Nordost") | **nein** | direkt | Reine Vertragstatsache. ~88 % aller Bürger:innen sind GKV-pflichtversichert (§ 5 SGB V); die *Existenz* einer GKV-Mitgliedschaft offenbart kein individuelles Gesundheitsmerkmal. EuGH C-184/20 setzt voraus, dass *durch Schluss* eine Art-9-Information ableitbar ist — bei universaler Pflichtversicherung greift das nicht. **Confidence: high.** |
| KVNR (10-stellig nach § 290 SGB V) | **nein** | direkt | Technische ID; § 290 SGB V GKV-SV-Richtlinien erlauben kassenübergreifende Lebenslang-Nutzung. Kein Art-9-Schluss daraus möglich. **Confidence: high.** |
| Familienversicherten-Status (mit Stamm­versicherten-Verweis + Bis-Datum) | **nein** | direkt | Vertragstatsache nach § 10 SGB V; der Status sagt nichts über Gesundheit aus. Der *Stamm­versicherte* ist ein Familien-Datum (Art. 8 GRCh + Art. 6 DSGVO), kein Art-9-Datum. **Confidence: high.** |
| GKV/PKV-Status (Binär: gesetzlich / privat) | **nein**, aber sensibel | direkt mit Tooltip | PKV-Mitgliedschaft korreliert statistisch mit Einkommen (§ 6 Abs. 1 Nr. 1 SGB V Versicherungspflichtgrenze 2026 ~73 800 €) und Beruf (Beamtinnen). EuGH C-184/20: keine **Art-9**-Schlussfolgerung möglich; aber Art. 6/Art. 4 Nr. 1 DSGVO greift. **Confidence: high.** |
| ePA-Existenz (eingerichtet ja/nein) | **nein** | direkt mit Status-Pill | Seit 15.01.2025 ist ePA-Anlage Standard für alle GKV-Versicherten (§ 342 Abs. 1 Satz 2 SGB V). Die *Existenz* der Akte ist daher universal und offenbart nichts. **Vor 01/2025 wäre das anders gewesen** (damals opt-in → Existenz hätte Gesundheits-Engagement indiziert). EuGH-Linie greift bei universaler Pflicht nicht. **Confidence: high (nach 15.01.2025).** |
| ePA-Widerspruch gesetzt (Boolean) | **grenzwertig** | direkt **mit Hinweis-Banner** | Der *Widerspruch* selbst ist organisations-/Konsens-Datum. Aber: aus Widerspruch lässt sich indirekt schließen, dass die Person sensibel mit Gesundheits-Daten umgeht — *Art-9-Schluss möglich*? Domain-Verdict: **knapp nicht**, da der Widerspruch eine reine Konsens-Erklärung ist und keine Diagnose offenbart. UI-Empfehlung: Status direkt sichtbar mit knapper Erklärung „Sie haben der Anlage einer ePA widersprochen (§ 342 Abs. 1 Satz 2 SGB V). Sie können den Widerspruch jederzeit zurücknehmen". **Confidence: medium.** |
| ePA-Inhalt (Befunde, Verordnungen, Medikationsplan) | **ja, Art-9** | nicht in V1.1 | Klar Art-9 (Diagnosen/Medikation). Auch wenn V1.1 ePA-Inhalt nie zeigen würde — UI darf nicht einmal *suggerieren*, dass App ePA lesen kann. **Confidence: high.** |
| eRezept-Bezugsmodus (App / eGK / Papierausdruck) | **nein** | direkt | Kommunikations-Präferenz (analog Brief vs E-Mail). Sagt nichts über Gesundheit. **Confidence: high.** |
| eGK-Generation + Ausstellungsdatum + Lichtbild | **nein** | direkt | Karten-Metadatum nach § 291 SGB V. Kein Krankheits-Schluss. **Confidence: high.** |
| Pflegegrad (1–5) | **ja, Art-9** | **A9** (Modal wie Religion) | Pflegegrad ist nach § 14 SGB XI eine Bewertung der **Selbstständigkeit** in 6 Lebensbereichen, immer mit Krankheits-/Behinderungs-Bezug. EuGH C-184/20 weite Lesart: Pflegegrad offenbart eindeutig Gesundheits- bzw. Behinderungsstatus. **Confidence: high.** |
| MD-/MEDICPROOF-Begutachtungs-Bericht | **ja, Art-9** | nicht in V1.1 | Klar Art-9 (Befund-Detail). **Confidence: high.** |
| PKV-Tarif-Name (z. B. „Premium-Komfort") | **grenzwertig**, eher Art-9 in EuGH-weiter-Lesart | nicht in V1.1 (Hard-Line) | Tarif-Namen können Risiko-Klassen, Vorerkrankungs-Hinweise, Berufsgruppen indizieren („Beamten-Tarif" → Beamten-Status; „Senioren-Tarif" → Alter; „Risiko-Tarif" → Vorerkrankung). EuGH C-184/20: indirekter Schluss reicht. **Verdict V1.1: streichen.** **Confidence: medium** — strenge Lesart sagt Art-9, lockere sagt nur sensibel. |
| PKV-Risikozuschlag (Höhe) | **ja, Art-9** | nicht in V1.1 | Höhe des Risikozuschlags impliziert direkt Vorerkrankung/Risiko-Faktor (Tarif-Aufschlag bei z. B. Bluthochdruck, Diabetes). EuGH-Linie eindeutig. **Confidence: high.** |
| Beihilfe-Berechtigung (Beamt:in) | **grenzwertig**, in V1.1 streichen | nicht in V1.1 (Hard-Line) | Research-scout-Tendenz: argumentierbar Art-9 wegen Krankheits-Abrechnungs-Kontext. EuGH-Linie + Beamten-Status-Indikation: **streichen**. Beamten-Status erscheint in V1 schon in Beschäftigung-Sektion, das reicht. **Confidence: medium-low** — Beihilfe selbst ist eher Vertrags-/Beamten-Datum, aber Kombi mit anderen Feldern macht Art-9-Schluss leicht. Domain-Verdict konservativ: **raus**. |
| Beitragssatz GKV/PKV (Prozentsatz) | **nein** | nicht in V1.1 (Doppelung mit Beschäftigung-Sektion) | Vertragstatsache; aber: bei PKV ist der Tarif individualisiert und enthält Risikozuschlag — siehe oben. Bei GKV ist der Beitragssatz universal (14,6 % + Zusatzbeitrag), kein Art-9. **V1.1: nicht zeigen, da Lohnabrechnungs-Kontext zu Beschäftigung gehört.** **Confidence: high.** |
| Pflegekasse-Mitgliedschaft (= GKV-Kasse) | **nein** | direkt (deterministisch aus GKV) | Pflicht aus § 20 SGB XI; universal. Kein Art-9-Schluss. **Confidence: high.** |
| Versorgungswerk (Kammerberuf-Renten-Träger) | **grenzwertig**, eher nein | direkt | Indikation des Berufs (Arzt/Anwalt/Architekt). Beruf ist nach Art. 9 nicht geschützt; Versorgungswerk-Mitgliedschaft offenbart nicht mehr als der Beruf selbst, der ohnehin Vertrags-/Stammdatum ist. **Confidence: medium-high.** |
| Renten-Eckwerte aus Yellow Letter (5 Felder § 109 Abs. 3) | **nein** | direkt | Renten-Höhe-Prognose ist Sozial-/Vertragsdatum (§ 109 SGB VI), kein Art-9 (kein Gesundheits-/Religions-Schluss). EM-Renten-Höhe ist Prognose-Wert, kein Tatsache, dass EM-Rente bezogen wird. **Confidence: high.** |
| Anrechnungszeit Kindererziehung (3 EP pro Kind § 56 SGB VI) | **nein** | direkt | Universal; kein Art-9. Familien-Datum überlappt mit Familie-Sektion. **Confidence: high.** |
| Anrechnungszeit Pflege (§ 3 SGB VI) | **grenzwertig**, eher Art-9 | A9 (Modal) | Pflege-Anrechnungszeit indiziert, dass Person Angehörige *gepflegt* hat — nicht Person selbst krank, aber **Gesundheit eines Familien-Mitglieds** ist nach EuGH-weiter-Lesart auch geschützt. UI-Empfehlung: nur unter Pflegegrad-Modal-Toggle anzeigen, weil semantisch verwandt. **Confidence: medium.** |
| Anrechnungszeit Wehr-/Zivildienst | **nein** | direkt | Beschäftigungs-/Status-Datum; kein Art-9. **Confidence: high.** |
| EM-Rente-Bezug (sofern aktuell laufend, nicht Prognose) | **ja, Art-9** | nicht in V1.1 | Eine *bestehende* EM-Rente ist klarer Krankheits-Schluss (volle/teilweise Erwerbsminderung iSv § 43 SGB VI). EuGH-weiter-Lesart eindeutig. **Aber**: in V1.1 zeigen wir nur die *Prognose-Höhe* aus dem Yellow Letter (Pflicht-Inhalt § 109 Abs. 3 Nr. 2), nicht den Bezugs-Status. Confidence: high. |

---

## Auto-fill / Quellregister-Verfügbarkeit (V1.1-spezifisch)

| Feld | Quellregister | Heute (Mai 2026) verfügbar? | Was bräuchte es? |
|---|---|---|---|
| DRV-Träger (Bund / Regional / KBS) | aus VSNR-Bereichsnummer (Stellen 1-2) deterministisch | ja, lokal ableitbar | nichts — UI-Mapping |
| Renten-Eckwerte (5 Felder § 109 Abs. 3) | DRV-Konto + jährlicher Brief | nur über eservice-drv.de (eID/AusweisApp) oder Papier-Brief | API-Spiegelung DRV → BundID; nicht implementiert (RegMoG-Roadmap) |
| Entgeltpunkte aktuell + Prognose | DRV | nur via DRV-Kundenportal | s. o. |
| Krankenkasse-Name + KVNR | jeweilige Kasse | nur Kassen-Online-Filiale | EUDI-Wallet-Attestation „GKV-Mitgliedsnachweis" — ARF-Roadmap; SOLID-PASS-Patterns einzelner Kassen |
| Familienversicherten-Status | Kasse | Kassen-Filiale | s. o. |
| ePA eingerichtet ja/nein + Widerspruch | gematik (TI) + Kasse | Kassen-ePA-App | gematik-API für Status-Read; politisch sensibel |
| Pflegegrad (1–5) | Pflegekasse (= GKV-Kasse) bzw. PKV-Pflichtversicherer | Kassen-Filiale + Bescheid per Post | API-Spiegelung; bei V1.1 Mock-only mit Art-9-Modal |
| eRezept-Bezugsmodus | gematik | gematik-App / Kassen-App | Selbst-Editierbar (Präferenz) — kein API nötig |
| Versorgungswerk-Mitgliedschaft | jeweiliges Versorgungswerk | Versorgungswerk-Portal | freiwillige ZfDR-Anbindung; pro Werk unterschiedlich |

**V1.1-Diff zu V1**: 4 neue Persona-Felder zwingend (`renteninformation_eckdaten[5]`, `epa_status`, `pflegegrad`, `familienversicherte_personen[]`); 2-3 weitere optional (`anrechnungszeiten[]`, `versorgungswerk`, `eRezept_modus`). Schema-Änderung in `src/types/persona.ts` + `src/data/personas.json` + `src/lib/mock-backend/seed.ts`.

---

## Zuständigkeit (Behörden-Mapping pro Persona)

| Persona | DRV-Träger | Krankenkasse + KVNR | Pflegekasse | ePA-Anbieter | Yellow-Letter-Track |
|---|---|---|---|---|---|
| **Anna Petrov** (29, EU-via-RU, Berlin, Senior SWE) | DRV Berlin-Brandenburg (Friedrich-Ebert-Str. 34, 14469 Potsdam) | AOK Nordost — KVNR `[MOCK] M845192036` | AOK Nordost-Pflegekasse | AOK-ePA „eAkte" | **Track A — Pflicht-GRV**, ≥ 5 Jahre Beitragszeit erfüllt → Yellow Letter erwartet (Mock-Brief Mai 2026) |
| **Familie Schmidt** (Eltern + 2 Kinder, München) | DRV Bayern Süd (Am Alten Viehmarkt 2, 84028 Landshut) | TK (Vater Pflicht), TK (Mutter familien­versichert über Vater oder Pflicht je nach Beschäftigung), Kinder familien­versichert | TK-Pflegekasse | TK-ePA „TK-Safe" | Beide Eltern Track A; Mutter mit Kindererziehungs-EP nach § 56 SGB VI (2 × 3 EP = 6 EP); Pflegegrad-Card als optionale Demo (Kind oder Mutter, nur in V1.1 Show-Variante mit Modal-Pattern) |
| **Mehmet Yıldız** (38, TR-Selbstständig, Köln) | DRV Rheinland (Königsallee 71, 40215 Düsseldorf) — falls freiwillig versichert; sonst keiner | AOK Rheinland/Hamburg (freiwillig versichert) — KVNR `[MOCK] Q672013485` | AOK Rheinland-Pflegekasse | AOK-ePA | **Track C — Privat-Vorsorge-only** (default) — kein Yellow Letter; Stammdaten zeigt Informations-Card; *alternativ* Track A wenn Persona-Beruf zu § 2 Nr. 9 SGB VI (Selbstständig mit nur 1 Auftraggeber) konkretisiert wird |

**Quellen Behörden-Adressen** (Stand 2026): drv-berlin-brandenburg.de, drv-bayernsued.de, drv-rheinland.de — alle realen Standorte; in `behoerden.json` zu hinterlegen.

**Aktenzeichen-Format DRV-Brief Renteninformation**: Die DRV verwendet die VSNR selbst als Hauptidentifier („Versicherungsnummer 65 170395 P 042"), zusätzlich oft eine interne Vorgangs-Nr. „RI-JJJJ-NNNN" oder „RI/JJJJ-Bereichsnummer-Sequenz". Beispiel-Mock-Aktenzeichen: `[MOCK] 65 170395 P 042 / RI-2026` (research-scout-Vorschlag korrekt).

**Beispiel-Krankenkassen-Auswahl**: 3 große Kassen mit echter Marktbedeutung — TK (~12 Mio Versicherte), AOK-Verbund (~27 Mio), Barmer (~9 Mio). DAK und IKK ebenfalls plausibel. Keine echten Kassen-Logos in der UI ohne `[MOCK]`-Disclaimer (Markenrechts-Vorsicht; Hinweis aus `posteingang.md` carry-over).

**GKV-Spitzenverband (Berlin) + gematik (Berlin)** treten im V1.1-Scope **nicht direkt als Brief-Absender** auf — sie sind System-Betreiber, nicht Bürger:innen-Korrespondenten. Wenn überhaupt erwähnt, dann nur in Disclaimer-Footnote zu KVNR-Aufbau (GKV-SV-Richtlinien § 290 SGB V).

---

## Realistic Mock-Letter (Anpassungen am research-scout-Vorschlag)

```
Absender: Deutsche Rentenversicherung Berlin-Brandenburg
          Friedrich-Ebert-Str. 34
          14469 Potsdam
Aktenzeichen: [MOCK] 65 170395 P 042 / RI-2026
Betreff: Ihre Renteninformation 2026 (§ 109 Abs. 1 SGB VI)
Frist: keine — info-only

AISummary (5 Punkte gemäß § 109 Abs. 3 SGB VI — *fünf*, nicht vier):
  1. Grundlage der Berechnung: Beitragszeiten 01/2018 – 12/2025 (8,1 Jahre);
     6,8 Entgeltpunkte erworben.
  2. Bei sofortiger voller Erwerbsminderung: 312,21 €/Monat.
  3. Prognose Regelaltersrente bei Erreichen Regelaltersgrenze 67 (ohne weitere
     Beiträge): 743,99 €/Monat.
  4. Wirkung künftiger Anpassungen: bei jährlicher Anpassung von durchschn.
     2 % steigt der prognostizierte Wert um ca. 1 100 €/Monat bis zum
     Renteneintritt.
  5. Beitragsübersicht 2025: 8 414,52 € gesamt
     (davon Sie: 4 207,26 €; Arbeitgeber: 4 207,26 €).

Standardphrase (Briefkopf):
  „Sehr geehrte Frau Petrov,
   diese Renteninformation gibt Ihnen einen Überblick über Ihre bisher
   erworbenen Anwartschaften aus der gesetzlichen Rentenversicherung sowie
   eine Prognose Ihrer voraussichtlichen Regelaltersrente. Sie wird Ihnen
   gemäß § 109 Sozialgesetzbuch Sechstes Buch (SGB VI) jährlich übersandt."

Hinweis-Floskel:
  „Diese Mitteilung ist maschinell erstellt und auch ohne Unterschrift
   gültig. Bei Fragen zu Ihrer Rente nutzen Sie bitte unser
   Online-Kundenportal eservice-drv.de oder vereinbaren einen Termin in
   einer unserer Beratungsstellen."

Required action: lesen + ablegen — keine Frist, keine Antwort erforderlich
Primary CTA: „Werte in meinen Stammdaten ablegen"
             → router.push('/stammdaten#altersvorsorge')
Secondary CTA: „Im DRV-Kundenportal öffnen"
             → externer Link mit Mock-Disclaimer-Modal
```

**Aktivitätsprotokoll-Eintrag (app-intern)**:
```
[2026-05-10 14:32] Renteninformation eingelesen
  Quelle: Posteingang (Brief letter-renteninfo-anna-2026-05)
  Norm: § 109 Abs. 1 + Abs. 3 SGB VI
  Felder aktualisiert: entgeltpunkte_aktuell, em_rente_prognose,
                       regelalter_prognose, anpassungs_wirkung,
                       beitragsuebersicht_2025
  Sichtbar in: Sektion Altersvorsorge
  Hinweis: § 50 SGB VI Wartezeit (5 Jahre) erfüllt — Prognose ist daher
           möglich.
```

---

## Open Questions (concept-verifier muss finalisieren)

1. **PKV-Tarif-Name in Scope?** Domain-Verdict empfiehlt **streichen** (EuGH-weiter-Lesart). Concept-verifier: ist der Trade-off „Tarif-Name = sensible Indikation" gegen „Demo-Realismus für Mehmet" tragbar? Mein Vote: streichen — Mehmet-Track-C macht den PKV-Punkt eh trivial (kein Tarif sichtbar, weil Demo zeigt die Lücke).
2. **Beihilfe-Berechtigung**: Streichen oder als reines Beamten-Status-Datum (ohne Krankheits-Kontext) drinlassen? Mein Vote: streichen für V1.1 (sauber bleiben); falls in V2 Beamten-Persona dazukommt, separate Card mit eigenem Disclaimer.
3. **Mehmet-Track**: Track C (Privat-Vorsorge-only — speculative-design-stark, zeigt die Lücke) vs. Track A (§ 2 Nr. 9 SGB VI Solo-Auftraggeber — demonstrativer Yellow Letter)? Mein Vote: Track C, da der „leere Slot mit Erklärung" ein **stärkeres** speculative-design-Statement ist als „auch Mehmet bekommt seinen Brief". Concept-verifier kann anders entscheiden, wenn Demo-Choreografie das fordert.
4. **Pflegegrad in welcher Persona?** Schmidt-Mutter (Pflegegrad-1-Demo der älteren Person) oder Schmidt-Kind (Pflegegrad-2-Demo der frühkindlichen Behinderung)? Bei Kind-Demo wäre eine zweite Art-9-Linie auf Familie-Sektion zu prüfen (Pflegegrad eines Kindes ist Art-9 für Eltern als Sorgeberechtigte; Modal-Pattern muss „über Mein-Kind"-Frame anbieten). Mein Vote: **Mutter** — sauberer (eine Art-9-Beziehung, nicht zwei); falls Kind, dann mit zusätzlichem Familie-Sektion-Modal.
5. **Renteninformation-Versand-Mock — ist „Mai 2026" plausibel?** Domain-Antwort: **ja**; § 109 sagt jährlich, kein Monat festgelegt; DRV-Praxis verteilt nach VSNR-Bereich + Geburtsdatum-Stelle 3-8 — Anna mit VSNR-Bereich 65 (DRV Berlin-Brandenburg) und Geburtsdatum 17.03.1995 fällt typischerweise in Q2-Versand. Ist plausibel.
6. **ZfDR-Wegweiser-CTA**: nur Link-Out oder Mock-OAuth-Flow simulieren (V2-Hook)? Domain-Verdict: V1.1 nur Link-Out + Disclaimer; OAuth-Simulation ist V2/V3-Stoff (würde Mock-eID-Flow erfordern, das ist eigene Capability).
7. **Familien­versicherten-Modellierung**: V1-Persona-Schema hat `familie.partner` und `familie.kinder` — V1.1 muss `familienversichert_ueber: PersonaID | null` ergänzen + `familienversichert_bis: Date | null` (für 25-Jahre-Studienende). Schema-Diff: 2 neue Felder pro `familie.partner`-und-`familie.kinder`-Eintrag. Product-architect-Aufgabe.

---

## Hard-Caps für V1.1-Scope (Was muss raus)

Falls V1.1-Scope-Druck steigt, in dieser Reihenfolge streichen:

1. **eRezept-Card** — geringster pädagogischer Mehrwert (Bezugsmodus-Präferenz ist trivial); kann ohne Verlust nach V1.2 verschoben werden.
2. **Anrechnungszeiten-Liste** als separater Slot — kann in Renten-Eckwerten-Card als Tooltip aufgehen, statt eigene Card zu sein.
3. **Versorgungswerk-Wegweiser-Card** für Personas, die kein Versorgungswerk haben (Anna, Schmidt) — nur sichtbar bei Mehmet-Variante-A oder Schmidt-Vater-Anwalt-Variante.
4. **Pflegegrad-Demo** in V1.1 — wenn Modal-Pattern-Logik nicht stabil aus V1-Religion-Pattern wiederverwendbar ist, dann nach V1.2 verschieben. Besser keine Pflegegrad-Card als eine, die Art-9-Modal nicht sauber erzwingt.
5. **Mehmet-Track-A-Variante** (mit Yellow Letter) — Track C reicht; A wäre nur Demo-Vielfalt.

**Was NICHT raus darf** (Demo-Kern):
- Yellow-Letter-Bridge mit fünf Eckwerten
- Krankenkasse + KVNR + Familienversicherten-Status
- ePA-Status + Widerspruch-Anzeige (mit § 342-Norm-Tooltip)
- Mehmet-Track-C-Erklärungs-Card (zeigt die Lücke)
- Drei separate DRV-Träger pro Persona (Berlin-Brandenburg / Bayern Süd / Rheinland)

---

## Legal disclaimer to surface in UI (V1.1-spezifisch, ergänzend zu V1)

Vier neue Disclaimer-Strings für `de.json`:

**6. „Renteninformation ist info-only" — `stammdaten.disclaimer.renteninfo_info_only`**
> „Die hier gezeigten Werte stammen aus Ihrer Renteninformation vom DD.MM.YYYY und werden vom DRV-Träger berechnet (§ 109 SGB VI). Diese App führt **keine** eigenen Renten-Berechnungen durch und schreibt **nicht** in Ihr DRV-Konto. Korrekturen Ihres Versicherungsverlaufs erfolgen ausschließlich beim DRV-Träger über eservice-drv.de oder einen Beratungstermin."

**7. „Pflegegrad ist Art-9-Datum" — `stammdaten.disclaimer.pflegegrad_art9`**
> „Der Pflegegrad ist eine besondere Kategorie personenbezogener Daten nach Art. 9 DSGVO (Gesundheitsdaten — vgl. EuGH 01.08.2022, C-184/20). Die Anzeige erfolgt nur auf Ihre ausdrückliche Einwilligung (Art. 9 Abs. 2 lit. a DSGVO). Speicherung im Mock-Datensatz beruht auf § 14 SGB XI; die Begutachtung erfolgt durch den Medizinischen Dienst (für GKV-Versicherte) bzw. MEDICPROOF (für PKV-Pflichtversicherte). Pflegekassen müssen über Anträge innerhalb von 25 Arbeitstagen entscheiden (§ 18c SGB XI)."

**8. „ePA Anlage-Pflicht + Widerspruch" — `stammdaten.disclaimer.epa_anlage_widerspruch`**
> „Seit 15.01.2025 sind die Krankenkassen verpflichtet, allen GKV-Versicherten eine elektronische Patientenakte einzurichten, sofern nicht innerhalb von sechs Wochen nach Information widersprochen wird (§ 342 Abs. 1 Satz 2 i.V.m. § 343 SGB V). Diese App zeigt nur den **Status** Ihrer ePA (eingerichtet/widersprochen) und einen **Wegweiser** zur App Ihrer Krankenkasse — sie liest **keine** ePA-Inhalte (Befunde, Verordnungen, Medikationsplan)."

**9. „rentenuebersicht.de zeigt nicht alles" — `stammdaten.disclaimer.zfdr_unvollstaendig`**
> „Die Digitale Rentenübersicht (rentenuebersicht.de) der ZfDR zeigt Ihre Anwartschaften aus angeschlossenen Vorsorgeeinrichtungen — Stand April 2025 sind das über 700 Einrichtungen mit ca. 137 Mio Anwartschaften. **Nicht angebunden** sind: berufsständische Versorgungswerke (Ärzte, Anwälte, Architekten u. a.), die Beamten-/Richter-/Soldaten-Versorgung, Direktzusagen der bAV ohne Standmitteilung sowie Einrichtungen mit weniger als 1 000 Anwartschaften. Prüfen Sie die einzelnen Träger-Portale, falls Ihre Vorsorge dort liegt."

---

## Cross-Reference

- Carry-over aus `docs/domain/stammdaten.md` (V1): Hard-Lines „Lese- und Wegweiser-Schicht", `stammdaten.disclaimer.lese_schicht`, Audit-Log-Pattern, Religion-Modal-Pattern (Vorbild für Pflegegrad-Modal).
- Carry-over aus `docs/domain/posteingang.md`: BehoerdenBadge-Pattern, AISummary-Pattern, Aktenzeichen-Formate, NormZitatSpan-Tooltip-Pattern.
- Forward-link nach product-architect: Persona-Schema-Diff (4 neue Felder + 2 Familienversicherten-Verweis-Felder); 4 neue `de.json`-Disclaimer-Strings; 2 neue Sektionen in `<StammdatenPage>`; 1 neuer Mock-Letter (`letter-renteninfo-anna-2026-05`); 3 neue Behörden-Einträge in `behoerden.json` (DRV BB / DRV Bayern Süd / DRV Rheinland).

