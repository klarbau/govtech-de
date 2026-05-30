# Loom-Skript — GovTech DE (3 Minuten)

> Dieses Skript folgt der **Demo-Spine** (`docs/demo-spine.md`): Login → Dashboard „heute zu tun" → Assistent öffnen → „leite meinen Umzug ein" → Bestätigungskarte → Autopilot-Kaskade **inline im Assistenten-Verlauf** (mit eID-Bestätigung für die sensiblen Stellen) → Wert-Beleg + Once-Only-Zähler → Bestätigungen landen im Posteingang.
>
> **Vorbereitung vor der Aufnahme:**
> - `?reliable=1` an die URL hängen (schaltet simulierte Backend-Fehler/Latenz ab).
> - Gültigen `ANTHROPIC_API_KEY` setzen (für den natürlichsprachigen Umzug-Turn).
> - Als **Anna Petrov** anmelden (Demo-Default, der Umzug-Flow ist auf sie zugeschnitten).
> - Sprache auf **Deutsch**, Light-Mode, Browser-Zoom 100 %.
> - Sprechtempo ruhig und sachlich — Register: gov.uk / DigitalService. Nie hypig.
>
> **Gesamtlänge:** ~3:00. Die Cold-Open-Variante (unten) ersetzt bei Bedarf Szene 0+1 für aufmerksamkeitsknappe Zuschauer.

---

## Szene 0 — Einstieg & Problem  ·  [0:00–0:20]

**[WHAT TO SAY]**
„Ein Umzug in Deutschland ist kein Vorgang — es sind viele. Einwohnermeldeamt, Finanzamt, Beitragsservice, Krankenkasse, Arbeitgeber, dazu je nach Lebenslage die Familienkasse oder die Ausländerbehörde. Viele Stellen für ein einziges Lebensereignis, das der Staat ohnehin schon kennt. Das hier ist ein Entwurf, wie das auch gehen könnte."

**[WHAT TO SHOW]**
Landing-/Login-Screen (`(auth)/onboarding`). Ruhig stehen lassen, kein Klicken. Optional kurze Maus-Geste über das DeutschlandID-/EUDI-Wallet-Element.

**[~timing]** 20 s

---

## Szene 1 — Login  ·  [0:20–0:35]

**[WHAT TO SAY]**
„Ich melde mich an — hier mit DeutschlandID und EUDI Wallet. Alles in dieser Demo ist erfunden, keine echte Behörde ist angebunden. Ich logge mich als Anna ein, eine Fachkraft aus St. Petersburg, die in Berlin lebt."

**[WHAT TO SHOW]**
Persona-Auswahl → Anna Petrov antippen. Fake-QR / Biometrie-Tap kurz zeigen, dann die Weiterleitung ins Dashboard.

**[~timing]** 15 s

---

## Szene 2 — Dashboard „heute zu tun"  ·  [0:35–1:00]

**[WHAT TO SAY]**
„Das Dashboard zeigt nicht alles auf einmal, sondern *was heute zählt*: offene Briefe, Fristen, anstehende Aufgaben — KI-sortiert nach Dringlichkeit. Oben sehe ich einen Anstoß: ein Umzug steht an. Statt jetzt sechs Behörden abzuklappern, gehe ich zum Assistenten."

**[WHAT TO SHOW]**
Dashboard. Kurz über „Heute zu tun" fahren (Aufenthaltstitel, Steuerbescheid, Stromzähler). Die Status-Badges („Erledigt", „Manuell prüfen") andeuten. Dann in der Sidebar auf **Assistent** klicken.

**[~timing]** 25 s

---

## Szene 3 — Assistent: der Auslöser  ·  [1:00–1:25]

**[WHAT TO SAY]**
„Der Assistent begrüßt mich mit einem kurzen Lage-Überblick. Ich sage ihm einfach in natürlicher Sprache, was ich vorhabe — kein Formular, kein Behördendeutsch."

*(In das Eingabefeld tippen und absenden:)* **„leite meinen Umzug ein"**

„Er fragt das Nötige nach: die neue Adresse, den Stichtag, und für welche Empfänger ich eine Einwilligung gebe."

**[WHAT TO SHOW]**
Assistent-Screen. Begrüßungs-Bubble + die drei Quick-Action-Chips kurz zeigen. Dann in den Composer tippen „leite meinen Umzug ein", senden. Die Rückfrage des Assistenten streamen lassen. Antworten, z. B.: „Müllerstr. 142a, 13353 Berlin, zum 1. Juni. Krankenkasse und Arbeitgeber ja."

**[~timing]** 25 s

---

## Szene 4 — Die Bestätigungskarte  ·  [1:25–1:50]

**[WHAT TO SAY]**
„Und jetzt der entscheidende Punkt: bevor irgendetwas passiert, zeigt mir das System genau, *wer* informiert wird — gestaffelt nach Rechtsgrundlage. Pflichtmeldungen laufen automatisch nach dem Meldegesetz; besonders sensible Stellen übermittle ich erst mit einer eID-Bestätigung; private Empfänger nur mit meiner Einwilligung. Erst wenn ich hier auf ‚Umzug starten' klicke, beginnt die Kaskade. Nichts geschieht hinter meinem Rücken."

**[WHAT TO SHOW]**
Die `UmzugConfirmCard` im Chat: neue Adresse, Stichtag, Empfänger gestaffelt nach Rechtsgrundlage (automatisch / eID-Bestätigung / Einwilligung) mit den (farb-freien) Behörden-Badges, plus die Consent-Notiz (Art. 6 Abs. 1 lit. a DSGVO). Maus auf „Umzug starten" halten — noch nicht klicken, kurz wirken lassen.

**[~timing]** 25 s

---

## Szene 5 — Die Autopilot-Kaskade  ·  [1:50–2:25]

**[WHAT TO SAY]**
„Ich bestätige — und jetzt arbeitet das System *für mich*, direkt hier im Verlauf. Vier Stellen werden automatisch auf gesetzlicher Grundlage informiert: das Einwohnermeldeamt nach dem Meldegesetz, das Finanzamt, der Beitragsservice und die Bundesdruckerei für den Ausweis. Zwei besonders sensible — die Familienkasse und die Ausländerbehörde — übermittelt das System *nicht* von selbst: hier bestätige ich aktiv mit meinem Ausweis, der eID. *(beide ‚Mit eID bestätigen' antippen)* Und zwei weitere, Krankenkasse und Arbeitgeber, laufen nur, weil ich vorhin eingewilligt habe. Das ist der Gedanke: nicht die Bürgerin koordiniert die Behörden — die Verwaltung koordiniert sich selbst, und über die sensiblen Schritte behalte ich die Kontrolle. Diese Schicht vermittelt nur; die Daten bleiben in den Registern der jeweiligen Stelle."

**[WHAT TO SHOW]**
„Umzug starten" klicken — die Kaskade läuft jetzt **inline im Chat-Verlauf** (`InlineCascade`), nicht auf einer Extra-Seite. Die vier automatischen Zeilen wechseln nacheinander auf „Bestätigt" / grün. Bei den zwei eID-Zeilen (Familienkasse, Ausländerbehörde) die **‚Mit eID bestätigen'-Schaltfläche tatsächlich antippen** — sie wechseln von „Ihre Bestätigung nötig" auf „Bestätigt". Danach erscheinen inline der Once-Only-Zähler („ca. N Felder, die Sie nicht ausfüllen mussten"), die Quellzeile (Stammdaten) und der Wert-Beleg. Ruhig zusehen — das ist der Wow-Moment.

**[~timing]** 35 s

---

## Szene 6 — Bestätigungen im Posteingang  ·  [2:25–2:45]

**[WHAT TO SAY]**
„Und das Ergebnis kommt zurück, wo ich es erwarte: im Posteingang. Jede Bestätigung mit einer KI-Zusammenfassung in Klartext, einem Echtheits-Hinweis und — falls nötig — der einen Handlung, die noch von mir kommt. Kein Amtsdeutsch zum Selbstübersetzen."

**[WHAT TO SHOW]**
In der Sidebar auf **Posteingang**. Die neu eingetroffenen Bestätigungsschreiben zeigen. Einen Brief öffnen → die KI-Zusammenfassung + „Authentisch"-Badge + erforderliche Handlung kurz vorlesen.

**[~timing]** 20 s

---

## Szene 7 — Glaubwürdigkeit & Disclaimer  ·  [2:45–3:00]

**[WHAT TO SAY]**
„Das Ganze ist barrierefrei nach WCAG und BITV, in sechs Sprachen — inklusive Arabisch mit Rechts-nach-links —, und jeder Screen zeigt, welche Daten auf welcher Rechtsgrundlage verarbeitet werden. Wichtig: das ist *kein* neues Zentralregister — die Daten bleiben in den Registern der zuständigen Stellen; diese Schicht vermittelt nur und ruft sie bei Bedarf ab, im Sinne von Once-Only über NOOTS. Zur Ehrlichkeit: ein Speculative-Design-Prototyp für 2027, alle Daten sind erfunden, keine echte Behörde ist angebunden. Es ist eine Vision — und ein Gesprächsangebot. Danke fürs Zuschauen."

**[WHAT TO SHOW]**
Schneller Schwenk: LanguageSwitcher auf **AR** umstellen (RTL-Layout 1–2 s zeigen), zurück auf DE. Dann kurz **Datenschutz**-Screen (Einwilligungen + Aktivitätsprotokoll). Abschließend wieder Dashboard oder Landing als ruhiges Schlussbild.

**[~timing]** 15 s

---

## Cold-Open-Variante (20–30 s) — führt mit dem Wow

> Für aufmerksamkeitsknappe Zuschauer voranstellen. Ersetzt Szene 0+1; danach springt man zu Szene 2 (oder direkt in Szene 3, wenn man die ganze Demo komprimiert).

**[WHAT TO SAY]**
„Stellen Sie sich vor, Sie ziehen um — und sagen das genau einmal."

*(In den Assistenten tippen:)* **„leite meinen Umzug ein"** → Bestätigen.

„Und dann informiert das System die zuständigen Stellen für Sie — die Pflichtmeldungen automatisch, die sensiblen erst auf Ihren eID-Tipp, private nur mit Ihrer Einwilligung. Ein Satz statt vieler Behördengänge. So könnte deutsche Verwaltung 2027 aussehen. Schauen wir's uns an."

**[WHAT TO SHOW]**
Direkt auf dem Assistenten starten (vorab eingeloggt). „leite meinen Umzug ein" tippen → Bestätigungskarte → „Umzug starten" → die Kaskade **inline im Verlauf** anlaufen lassen (eine eID-Zeile kurz bestätigen, damit der Wert-Beleg erscheint). Harter Schnitt auf den Titel / das Logo, dann Übergang in die volle Demo ab Szene 2.

**[~timing]** 20–30 s

---

## Regie-Notizen

- **Der Wow gehört Szene 5.** Dort langsamer werden und die Kaskade *inline im Verlauf sehen lassen* — nicht auf eine andere Seite navigieren. **Pflicht-Beat:** die zwei ‚Mit eID bestätigen'-Tipps tatsächlich ausführen — der Wert-Beleg + Once-Only-Zähler erscheinen erst, wenn alle Schritte abgeschlossen sind. Vergisst man den eID-Tipp, bleibt die Kulmination aus.
- **Einmal sagen, nie wiederholen:** „ein Satz statt vieler Behördengänge" ist die Kernbotschaft. In Szene 5 platzieren, nicht in jeder Szene neu aufwärmen.
- **Register:** sachlich, bürger-respektvoll, ruhig. Keine Superlative, kein Verkaufston.
- **Bei Aufnahme-Pannen** (Assistent antwortet ungewollt langsam / Stream stockt): `?reliable=1` prüfen und Key-Verfügbarkeit; notfalls den Umzug-Turn neu absenden. Die Bestätigungskarte ist strukturell gegated — `starte_umzug` feuert nie ohne den expliziten Klick, das ist auch im Demo-Flow die Sicherheitsschicht.
- **Disclaimer-Beat ist Pflicht** (Szene 7): „erfunden / keine echte Behörde angebunden / Speculative Design für 2027". Nie so tun, als sei es live.
