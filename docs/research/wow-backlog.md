# Wow-Backlog — der "es hat es FÜR mich getan"-Punch, priorisiert

_Synthese aus Discovery-Kandidaten (4 Linsen), Domain-Realismus-Filter und Verifier-Scores. Single source of truth für die nächste Wow-Welle._
_Stand: 2026-05-30. Maintainer: Orchestrator (main thread)._

> **Vorab-Korrektur, von der dieser Backlog abhängt:** `docs/demo-spine.md` ist VERALTET — die Status-Tabelle (Stand 2026-05-27) nennt Schritt 3 (Assistent→Autopilot) noch einen "STUB, der die Spine bricht". Der aktuelle Stand (CLAUDE.md-Snapshot + verifiziert in `src/components/assistent/ToolCallCard.tsx:90-98`, `tests/e2e/spine.spec.ts`) ist: **die Spine ist GESCHLOSSEN und demo-shipped.** Das kippt die Priorisierungslogik. Das Gate ist nicht mehr "schließe die Spine zuerst", sondern **Verstärkung vs. Zerstreuung**: vertieft ein Kandidat den bereits funktionierenden Autopilot-/Cascade-/Receipt-Helden, oder zerstreut er in disconnected Net-New-Surfaces? Der Orchestrator sollte `demo-spine.md` Zeile 23/28/59 vor dem nächsten Pipeline-Lauf aktualisieren, damit andere Agenten nicht am STUB-Status fehl-gaten.

---

## 1. These — das eine Gefühl

Der Held funktioniert schon, aber seine emotionale Auszahlung ist **über Routen FRAGMENTIERT und UNTER-DRAMATISIERT.** Der Bürger sagt einen Satz, muss dann aber auf eine andere Route (`/vorgaenge/umzug/run`) klicken, um das Wunder zu fühlen — das bricht den einen durchgehenden "Ich sprach → es handelte → ich sah zu → hier ist der Beleg"-Beat, um den die ganze Demo gebaut ist.

**Das Gefühl, das die Demo erzeugen muss:** *Erleichterung mit Beweis* — nicht "es hat schneller ein Formular ausgefüllt", sondern "ich habe einen Satz gesagt und der Staat hat sechs Lasten von mir genommen, während ich zusah, und mir am Ende eine Quittung in die Hand gedrückt." Und, als zweiter Vektor: die **Umkehr von Holschuld zu Bringschuld** — "der Staat hat einen versteckten Anspruch FÜR mich gefunden und den Antrag fertiggemacht."

**Die Spine, die das liefert (unverändert):** Login → Dashboard-Nudge → ein Satz an den Assistenten → bestätigen → Kaskade läuft → Quittung → Bestätigungen landen im Posteingang. Dieser Backlog macht diese Spine **kontinuierlich** (statt fragmentiert) und fügt **genau einen ehrlichen Entitlement-Beat** hinzu, der Pflicht in Anspruch kippt.

Querschnitts-Realismus-Disziplin, die JEDER neue Beat erbt (Domain-Filter, nicht verhandelbar):
- **Hard Rule:** alles konditional rahmen ("wenn die Register/Terminsysteme angebunden wären"), `[MOCK]`-Label, NIE implizieren, der Prototyp habe real an eine Behörde übermittelt/gebucht.
- **Alle €-Beträge** (Ansprüche wie Erstattungen) nur als "geschätzt ca." — Register kennen Wohnkosten/Vermögen/Bedarfsgemeinschaft nicht; Steuer wird erst per Bescheid festgesetzt (§155 AO).
- **Föderalismus präzise:** Elterngeld-/Wohngeld-/Grundsicherungsstelle = Land/kommunal; Familienkasse/antragsloses Kindergeld = Bund; Finanzamt = Land; Standesamt/Bürgeramt/Kfz/Kita = kommunal. Beitragsservice (Anstalt) + Arbeitgeber (privat) sind **KEINE Behörden** und zählen nicht in einen "X Behörden"-Count.
- **Nur antragsloses Kindergeld ist wirklich antragslos** (beschlossene Gesetzgebung, Steuer-ID-Trigger, 2027). Kinderzuschlag (§6a BKGG), Wohngeld (WoGG), Grundsicherung (§41 SGB XII) bleiben **antragsgebunden** → "Anspruch erkannt — wir bereiten den Antrag vor", nie "läuft schon".

---

## 2. Ranked Backlog (best first)

Reihenfolge = wow × Feasibility × Spine-Fit (Verstärkung des Helden), nach Anwendung des Realismus-Filters. Tags: **[AMPLIFY]** = schärft ein bereits existierendes Moment · **[NEW]** = neue Fähigkeit/Vertical.

---

### #1 — Kontinuierlicher Kaskaden-Moment (ein Spec, fünf gefaltete Kandidaten) · [AMPLIFY]

> **Der größte Hebel im ganzen Pool, und er ist fast gratis.** Fünf PROCEED-Kandidaten in EINEN Spec falten, damit der stärkste-aber-zerstreute Asset der Demo zu einem ungebrochenen Beat wird.

- **Bürger-Pitch:** "Sie sagen einmal *ich ziehe um*, bestätigen, und sehen die zuständigen Stellen direkt im Chat aufleuchten — die Pflichtmeldungen automatisch, die sensiblen erst auf Ihren eID-Tipp — mit einer Quittung am Ende, die zählt, was Sie NICHT tun mussten."
- **Wow-Moment (was der Zuschauer SIEHT):** Nach der Confirm-Card streamt der **Chat selbst** die Kaskade — jede Behörden-Zeile flippt Spinner → grüner Haken mit Agenten-Stimme ("Wir melden Sie beim Einwohnermeldeamt an ✓"), dann zählt die **ValueReceiptCard** hoch, jede Behörden-Zeile nennt ihre **konkrete Konsequenz** (nicht flaches "benachrichtigt"), ein **Once-Only-Zähler** ("ca. N Felder, die Sie NICHT ausfüllen mussten", N aus `value-receipt.ts` abgeleitet) + die **Stammdaten-Quellzeile** ("Quelle: Ihre Stammdaten, einmal bestätigt am …"), und Sekunden später droppen die **Bestätigungen sichtbar in den Posteingang**. Alles in dem Thread, den der Nutzer gerade ansieht.
- **Reale Pain entfernt:** Heute lebt die Auszahlung auf `/vorgaenge/umzug/run`, erreichbar nur über den "Kaskade ansehen →"-Link in `ToolCallCard.tsx:90-98` (verifiziert link-only). Der Zuschauer, der gerade einen Satz sagte, muss wegklicken, um die Magie zu fühlen — in einem 3-Min-Loom bricht das den einen kontinuierlichen "Ich sprach, es handelte"-Beat.
- **Die fünf gefalteten Kandidaten:**
  1. **Kaskade INLINE im Assistenten** (statt hinter Link) — wow 5, feas 5, PROCEED. Die EINE Änderung mit der höchsten Hebelwirkung.
  2. **Value-Receipt-Finale mit Pro-Behörde-Konsequenz** — wow 5, feas 5, PROCEED. (Finanzamt: neue örtl. Zuständigkeit; Beitragsservice: Konto läuft weiter; Kfz: Fahrzeugschein aktualisiert — gov.uk "Tell Us Once"-Pattern.)
  3. **Sichtbarer Once-Only-Zähler** ("ca. N Felder, die Sie nicht ausfüllen mussten · 0 Dokumente erneut hochgeladen") — wow 4, feas 4, PROCEED. *(2026-05-30: N wird in `value-receipt.ts` aus den tatsächlich wiederverwendeten Datenkategorien abgeleitet — keine erfundene Zahl; die frühere Schätzung „38" ist verworfen, und der „Behörden"-Zähler zählt nur echte Behörden, nicht Beitragsservice/Arbeitgeber.)*
  4. **Stammdaten-"nie zweimal getippt"-Quellzeile** am Moment der Wiederverwendung — wow 3, feas 4, PROCEED.
  5. **Bestätigungen sichtbar im Posteingang landen lassen** ("watch them land", `letter_received` wird schon emittiert) — wow 4, feas 4, PROCEED.
- **Grounding:** N/A (reine Präsentations-Re-Wire bereits-validierter Daten). Erbt die autoritativ fixierten Pro-Schritt-Normen aus `umzug-konvenienz-und-normen.md §2` (§17/§19/§§33–34a,36 BMG, §19 AO, §139b AO, §18 PAuswG, §206 SGB V, §11 Abs.4 RBStV). Once-Only = RegMoG/IDNrG/NOOTS + SDG-VO (EU) 2018/1724.
- **Landet auf:** Assistent (hero) + Posteingang. Komponenten existieren bereits: `ValueReceiptCard` (mit `variant='live'`-Animation), `UebermittlungsReceipt`, `BehoerdenStatusRow`; Backend emittiert die Events bereits.
- **Demo-Feasibility:** 5 — **keine neue Capability, kein neuer Datenfluss.** Präsentations-Re-Wire validierter Daten.
- **Verifier-Verdikt:** PROCEED (alle fünf). Verifier-Note: "Highest wow×feasibility×realism in the entire pool."
- **Effort:** **M** (ein Spec, aber mehrere koordinierte Präsentations-Änderungen über Assistent + Posteingang; Animations-Choreografie + Reduced-Motion-Pfad).
- **HARTE FLAGS:** (a) der konditionale Disclaimer "Prototyp simuliert; keine reale Übermittlung" MUSS mit der Kaskade in den Chat reisen (`umzug-konvenienz §4`) — beim Verschieben nicht verlieren. (b) Der "38 Felder"-Count MUSS aus der tatsächlich in der Demo-Kaskade wiederverwendeten Feldmenge ABGELEITET sein, nicht erfunden — "ca."-Präfix, keine Scheingenauigkeit (erster Ort, an dem ein NKR/DigitalService-Viewer "belegen Sie das" sagt). (c) Konsequenztexte exakt nach korrigierten Normen (eAT-Adresse §18 PAuswG nutzergesteuert, NICHT auto-gepusht; Steuer-IdNr bleibt §139b AO konstant, nur örtl. Steuernummer ändert sich). (d) Beitragsservice/Arbeitgeber als "Anstalt"/"private Stelle" labeln, nicht in den "sechs Behörden"-Count. (e) Bestätigungsbriefe `[MOCK]`-gelabelt.

---

### #2 — Antragsloses Kindergeld: "Es ist schon da" (zweite Vertical) · [NEW]

- **Bürger-Pitch:** "Sie bekommen ein Kind und melden die Geburt einmal; Sie beantragen nie Kindergeld — sobald Ihr Kind eine Steuer-ID hat, ist das Geld automatisch eingerichtet und Sie bestätigen nur die IBAN."
- **Wow-Moment:** Im Geburts-Flow erscheint statt eines Kindergeld-Formulars eine Card: "Kindergeld für Mia ist eingerichtet — keine Antragstellung nötig. Erste Zahlung: [Datum]. Wir brauchen nur Ihre IBAN." Eine Mini-Timeline zeigt den stillen Handoff Standesamt → BZSt (Steuer-ID) → Familienkasse, mit Value-Receipt: "~300.000 Anträge wie dieser entfallen künftig pro Jahr." Das ist der literale Estland-"24h: wohin überweisen wir das Geld?"-Move, auf echter deutscher Rechtsgrundlage.
- **Reale Pain entfernt:** Jeder neue Elternteil reicht heute den Kindergeld-Antrag in den erschöpfendsten Wochen des Lebens von Hand ein. Der Bund entfernt genau das.
- **Grounding:** **GROUNDED — beschlossene Gesetzgebung**, nicht Spekulation. Familienkasse (Bund), BZSt (Steuer-ID), Standesamt (kommunal). BMF Kabinettsbeschluss 18.03.2026, Bundesrat ohne Einwände, Inkrafttreten 2027, zweistufiger Steuer-ID-getriggerter Rollout. Der am besten belegte Bring-Prinzip-Kandidat im Pool.
- **Landet auf:** **Net-new mini-Cascade** (Standesamt→BZSt→Familienkasse), wiederverwendet aber Autopilot-Timeline + Value-Receipt-Maschinerie. Wird zur Kindergeburt-Vertical, verankert auf **Mia Schmidt = Stufe 1 exakt**.
- **Demo-Feasibility:** 4 — neue Mini-Cascade, aber reused Timeline + Receipt.
- **Verifier-Verdikt:** PROCEED. wow 5 ("inverts the entire product from 'you must apply' to 'it is already done'").
- **Effort:** **M.**
- **FLAGS:** Stufencharakter respektieren — Stufe 1 (2027) deckt nur WEITERE Kinder von bereits Kindergeld beziehenden Eltern; Mia = Schmidts 2. Kind (Felix existiert) trifft Stufe 1 exakt. **Keine universelle Erstkind-Deckung implizieren.** ~300k-Zahl als BMF-Zahl zitieren. DEDUPE: identisch mit dem LENS-2 "benefits already running, confirm IBAN"-Kandidaten — EIN Spec.

---

### #3 — Wohngeld-Treffer: der unsichtbare Anspruch nach dem Umzug · [AMPLIFY]

> Der am natürlichsten Spine-integrierte Entitlement-Beat — kettet direkt an die EXISTIERENDE Umzug-Value-Receipt (Autopilot besitzt den Move-Moment schon und kennt jetzt Miete+Adresse).

- **Bürger-Pitch:** "Direkt nachdem Ihr Umzug-Autopilot Miete und Adresse aktualisiert hat, bemerkt das System, dass Ihr neues Miete/Einkommen-Verhältnis wahrscheinlich Wohngeld auslöst — und bereitet den Antrag vor."
- **Wow-Moment:** An die bestehende Umzug-Value-Receipt gekettet: eine Folge-Card "Ihr neuer Mietvertrag könnte einen Wohngeld-Anspruch auslösen — geschätzt ca. [Betrag]/Monat." mit Wohngeld-Plus-Kontext ("Seit 2023 ~2 Mio. Haushalte berechtigt statt ~600.000 — viele wissen es nicht"). Ein Button: "Anspruch prüfen & Antrag vorbereiten."
- **Reale Pain entfernt:** Wohngeld-Plus 2023 erweiterte Berechtigung von ~600k auf ~2 Mio. Haushalte, muss aber selbst beantragt werden → hunderttausende neu Berechtigte beziehen nie. Umzug/Mietänderung ist exakt das Lebensereignis, das die Berechtigung kippt — und die Demo besitzt den Umzug-Moment schon.
- **Grounding:** Wohngeldstelle (**kommunal**, WoGG ist Bundesrecht). Wohngeldgesetz; Wohngeld-Plus-Reform 01.01.2023.
- **Landet auf:** **AMPLIFY** der bestehenden Umzug-Value-Receipt (kein disconnected Screen).
- **Demo-Feasibility:** 3.
- **Verifier-Verdikt:** REVISE → wird PROCEED mit zwei Korrekturen. Spine-Adjazenz hebt es über die standalone Radar-Beats.
- **Effort:** **M.**
- **FLAGS:** (1) Wohngeld ist antragsgebunden — "beantragen" = vorbereiten/einreichen, NICHT "läuft schon". (2) Exakte Höhe nicht registerautomatisch (Mietstufe/Haushalt/abzugsfähige Beträge) → "geschätzt ca." only. (3) Föderalismus korrekt labeln (Wohngeldstelle kommunal). → **Empfohlen als ERSTER Entitlement-Bolt-on**, weil es den Move wiederverwendet, den die Demo schon nagelt.

---

### #4 — Bring-Prinzip Posteingang-Flip: "Ihnen steht zu"-Lane · [AMPLIFY]

> Der stärkste STRATEGISCHE Reframe des ganzen Pools — kippt das Produkt von Pflicht zu Anspruch in einem Blick. Verifiziert: `reminders.json` enthält 8 Reminder, **alle Obligationen (Holschuld), null Entitlements** — die emotionale Inversion ist heute genuinely abwesend.

- **Bürger-Pitch:** "Ihr Posteingang hört auf, eine Liste dessen zu sein, was Sie der Behörde schulden, und beginnt einzuschließen, was die Behörde Ihnen schuldet — jeder Anspruch erklärt, belegt, in einem Tipp beantragbar."
- **Wow-Moment:** Die Reminder-Liste bekommt eine visuell distinkte "Ihnen steht zu"-Lane (Bringschuld) neben der bestehenden "Zu erledigen"-Lane (Holschuld). Header zitiert die Politik-Linie: "Aus Ihrer Holschuld wird die Bringschuld des Staates." Pflichten und Ansprüche nebeneinander reframen das ganze Produkt in einem Blick.
- **Reale Pain entfernt:** Jeder Reminder der Demo ist heute eine Obligation — die strukturelle Holschuld. Die emotionale Inversion (Staat liefert proaktiv) ist das benannte Bundespolitik-Ziel, fehlt aber im UI.
- **Grounding:** Aggregations-Frame, kein eigener §. Trägt sich auf RegMoG/NOOTS + die einzelnen Leistungsnormen. Politik-Linie "aus der Holschuld wird die Bringschuld des Staates" ist real (Kindergrundsicherungs-Diskurs).
- **Landet auf:** **AMPLIFY** Posteingang/Dashboard-Reminder-Liste.
- **Demo-Feasibility:** 3.
- **Verifier-Verdikt:** REVISE → PROCEED mit zwingender Differenzierung.
- **Effort:** **M.**
- **KRITISCHE FLAG (kollektiver Overclaim):** Die Lane MUSS sichtbar splitten zwischen **"eingerichtet"** (NUR antragsloses Kindergeld) vs. **"Anspruch erkannt — wir bereiten den Antrag vor"** (KiZ/Wohngeld/Grundsicherung — alle antragsgebunden). Wenn die Lane sie als "wird gezahlt" zeigt, ist es eine kollektive Fantasie, die ein Sozialrecht-Insider sofort beanstandet. **Den Frame nicht shippen, bevor mindestens ein echter Entitlement-Beat (#2 Kindergeld oder #3 Wohngeld) existiert, um ihn zu füllen** — sonst leere Hülle.

---

### #5 — Anspruchs-Radar: "Geld, das Ihnen zusteht" (Kinderzuschlag) · [NEW]

- **Bürger-Pitch:** "Sie tun nichts; das System prüft laufend die Daten, die der Staat schon über Sie hat, und sagt Ihnen, wenn Ihnen Geld zusteht, das Sie nicht beziehen — dann bereitet es den Antrag für Sie vor."
- **Wow-Moment:** Eine ruhige grüne Card: "Ihnen stehen geschätzt ca. 297 €/Monat Kinderzuschlag zu, die Sie aktuell nicht beziehen." mit Plain-Language-Warum, Rechtsgrundlage (§6a BKGG), den exakten auslösenden Datenpunkten und einem Button: "Antrag für mich vorbereiten." Counter: "Bundesweit beziehen nur ~35% der berechtigten Kinder diese Leistung."
- **Reale Pain entfernt:** KiZ erreicht nur ~35% der berechtigten Kinder; ~1,5 Mio. Kinder fallen durch, fast immer weil Familien nicht wissen, dass sie qualifizieren. Der Staat hält die Einkommens+Familien-Daten schon.
- **Grounding:** Familienkasse (Bund). §6a BKGG (live bestätigt). Non-take-up ~35% belegt.
- **Landet auf:** **NEW** Card, die die #4-Lane füllt.
- **Demo-Feasibility:** 3.
- **Verifier-Verdikt:** REVISE → mit Korrekturen "seriously strong, defensible". **Bevorzugter Flagship-Entitlement-Beat** vor Grundsicherung.
- **Effort:** **M.**
- **FLAGS:** (1) KiZ NICHT antragslos — "Antrag vorbereiten + einreichen", nie "läuft schon". (2) Exakte 297€ NICHT registerbestimmbar (hängt an Wohnkosten/Vermögen/Bedarfsgemeinschaft) → "geschätzt ca.", nie fixer Bescheid. Domain-Note: die ehrliche Version landet HÄRTER bei Insidern als ein fakes "läuft schon".

---

### #6 — Quantifizierter Brief-Erklärer + Gist auf der Briefkarte (ein Posteingang-Spec) · [AMPLIFY]

> Zwei überlappende Kandidaten zu EINEM "Posteingang-Relief"-Spec gemerged, damit sie nicht als zwei Halb-Features shippen.

- **Bürger-Pitch:** "Ihr Posteingang zeigt schon, in Klartext, was jeder Behördenbrief will und bis wann — bevor Sie ihn öffnen — denn nur 4% können das Original wirklich lesen."
- **Wow-Moment:** (a) Jede `LetterCard` trägt einen Ein-Zeilen-Klartext-Gist ("Finanzamt will 312 € bis 14.06. — Einspruch möglich") + roten Frist-Chip, sodass die Behördendeutsch-Angst sich auf einen Blick auflöst, bevor man reinklickt. (b) In der Detail-Ansicht: Split-View original Schachtelsatz neben Klartext-Umschreibung + einzelne "Das müssen Sie tun"-Aktion + leise Badge "Nur 4% finden Behördensprache verständlich."
- **Reale Pain entfernt:** Behördendeutsch — nur 4% finden es verständlich, 75% fühlen sich überfordert (Qualtrics×WORTLIGA 2024, n=2.039). Der Brief-Erklärer (`AISummaryBlock`) ist stark, lädt aber lazy NACH dem Öffnen — die Angst lebt aber auf INBOX-Ebene.
- **Grounding:** N/A (interpretiert bereits empfangene Post, kein §-Hook). Stat als Studienzahl zitieren, nicht als amtliche Statistik.
- **Landet auf:** **AMPLIFY** Posteingang (`AISummaryBlock` existiert; fügt Before/After-Pane + Card-Gist + Stat-Badge hinzu).
- **Demo-Feasibility:** 4 — Gist muss pro Brief vorberechnet/geseedet werden (kleine Daten-Form-Änderung), nicht lazy-fetched.
- **Verifier-Verdikt:** PROCEED (beide).
- **Effort:** **S–M.**
- **FLAG (Qualität, nicht Recht):** Ein fehlerhafter Ein-Zeilen-Gist auf Inbox-Ebene ist SCHÄDLICHER als im Detail, weil er Vertrauen prägt, bevor der Nutzer liest — Gists handgeprüft.

---

### #7 — Termin "Automatisch für Sie gebucht" benennen · [AMPLIFY]

- **Bürger-Pitch:** "Wir haben Ihren Ausländerbehörde-Slot für die Adressänderung schon reserviert — Datum, Zeit, was mitzubringen — Sie bestätigen oder verschieben nur."
- **Wow-Moment:** Der frisch geminteten LEA-Termin erscheint in Termine mit distinktem "Automatisch für Sie gebucht"-Banner + "Gehört zu: Umzug"-Chip + pulsierendem "neu"-Punkt, sodass die Buchung als etwas liest, das das System TAT.
- **Reale Pain entfernt:** Berlin-Termin-Knappheit (Berlin erreichte sein 14-Tage-Ziel erst März 2026 erstmals). `TermineView` mintet den LEA-Termin aus der Kaskade schon live, rendert ihn aber mit generischem "Gebucht"-Badge identisch zu selbst-gebucht — eine echte Convenience ist unsichtbar.
- **Grounding:** Reine Präsentation über bereits gemintete Daten. Buchung bleibt SIMULIERT.
- **Landet auf:** **AMPLIFY** Termine.
- **Demo-Feasibility:** 5.
- **Verifier-Verdikt:** PROCEED. wow nur 3 (Labelling-Politur), aber billig und ehrlich. **Absorbiert auch den teureren standalone "We got you the slot"-Kandidaten** (der HIGH-Overclaim-Risiko hatte).
- **Effort:** **S.**
- **FLAG:** Buchung als reserviert/simuliert rahmen ("wenn das Terminsystem angebunden wäre") — Prototyp-Disclaimer am Termin halten.

---

### #8 — Sichtbare Datenminimierung am Present-Credential-Moment (EUDI) · [AMPLIFY/NEW]

- **Bürger-Pitch:** "Wenn eine Behörde nach Ihrem Ausweis fragt, sehen Sie die drei exakten Felder, die sie will, bestätigen mit einem Tipp, und nichts sonst verlässt Ihr Wallet."
- **Wow-Moment:** Eine Consent-Card listet präzise die angefragten Felder ("Die Ausländerbehörde fragt: Name, Aufenthaltstitel-Nr., Gültigkeit. Mehr nicht.") + biometrie-artiger Confirm — Datenminimierung wird gefühlte Aktion statt Kleingedrucktes.
- **Reale Pain entfernt:** Heute = volle Dokument-Kopie überteilen. Erfüllt direkt das CLAUDE.md-Mandat "Datenminimierung sichtbar", das sonst nur Text ist.
- **Grounding:** EUDI/eIDAS 2 (VO (EU) 2024/1183 — selective disclosure ist Kerndesign), DSGVO Art. 5(1)(c)/Art. 25, PAuswG §18. Apple Digital ID (Nov 2025) als Consumer-Vorbild. **2027-Zielbild**, nicht heute-flächendeckend.
- **Landet auf:** Dokumente (Eudi-Komponenten existieren). **Könnte INNERHALB Annas Flow inszeniert werden**, statt allein zu stehen.
- **Demo-Feasibility:** 4.
- **Verifier-Verdikt:** PROCEED.
- **Effort:** **M.**
- **FLAG:** EUDI als 2027-Rollout-Ziel rahmen; gezeigte Felder müssen plausibler realer Behörden-Anfrage entsprechen (LEA: Name + eAT-Nr. + Gültigkeit korrekt).

---

### #9 — Steuer-Erstattung als Held, nicht To-Do-Liste · [AMPLIFY]

- **Bürger-Pitch:** "Sie öffnen Steuer und ein fertiger Entwurf sagt schon *Sie bekommen 847 € zurück* — aus Daten, die der Staat schon hat — mit einem Button zum Bestätigen, nicht einem Formular zum Ausfüllen."
- **Wow-Moment:** Große Erstattungszahl landet zuerst mit "Auf Basis Ihrer bereits bekannten Daten" + Quell-Chips (Arbeitgeber, Krankenkasse); Progress-Tracker zeigt Schritt 1 schon DONE.
- **Reale Pain entfernt:** Steuererklärung ist DER deutsche Admin-Pain. `SteuerView` hardcodet "3 Belege fehlen noch" und die Bereich-Actions sind tote `href='#'`-Anker — liest sich als Formular statt Geschenk.
- **Grounding:** ELSTER VaSt (vorausgefüllte Steuererklärung) ist REAL (Lohnsteuer/KV/Renten/Riester elektronisch). Finanzamt (Land).
- **Landet auf:** **AMPLIFY** Steuer.
- **Demo-Feasibility:** 4.
- **Verifier-Verdikt:** REVISE.
- **Effort:** **M.**
- **FLAGS:** (1) Erstattungszahl als **PROGNOSE/Schätzung** labeln, nie als zugesicherte Erstattung (Festsetzung erst per Bescheid §155 AO) — "das Finanzamt zahlt 847€" ist Overclaim. (2) VaSt deckt NICHT Annas Blue-Card-Auslandseinkünfte (ihre persona-eigene Pain) — keine clean auto-done Return für Anna zeigen. (3) Beleg-Count datengetrieben ("Zur Abgabe bereit" wenn keine fehlen), tote Links fixen.

---

### #10 — Antizipation: Frist bewacht + Antrag vorbereitet (Anna §18g) · [NEW]

- **Bürger-Pitch:** "90 Tage bevor Ihr Aufenthaltstitel abläuft, hat das System die Verlängerung aus Ihrem Dokumenten-Vault schon ausgefüllt — Sie bestätigen nur."
- **Wow-Moment:** Unprompted Dashboard-Nudge "Ihr Aufenthaltstitel läuft in 90 Tagen ab — wir haben den Antrag aus Ihren Dokumenten vorbereitet" mit vorausgefüllter Antrags-Vorschau.
- **Reale Pain entfernt:** Annas dokumentierte #1-Pain — nicht zu wissen, dass man 4 Monate vorher starten muss, opake ABH-Anforderungen, 5-Wochen-Termin-Wartezeiten.
- **Grounding:** ABH/LEA Berlin (kommunal/Land), AZR (BVA). §18g AufenthG (korrekt für Anna). Antizipation/Vorbefüllung = Estland/Singapur MyInfo-Pattern. **2027-Zielbild.**
- **Landet auf:** **NEW** dritte Autopilot-Vertical (Aufenthaltstitel-Verlängerung).
- **Demo-Feasibility:** 3.
- **Verifier-Verdikt:** REVISE. wow 5 für die Primär-Persona, aber **nach Kindergeld/Kindergeburt sequenzieren** (dritte Vertical).
- **Effort:** **L.**
- **FLAGS:** (1) "Termin reserviert" nur strikt konditional (kein realer LEA-Buchungs-Push). (2) Vorausgefüllter Antrag darf nicht implizieren, er sei eingereicht. (3) Aktuelle Arbeitgeberbestätigung/Gehalt brauchen Bürger-Input → "vorbereitet, Sie ergänzen", nicht "fertig".

---

### #11 — Geburts-Bündel "24 Stunden" (volle Kindergeburt-Vertical) · [NEW]

- **Wow-Moment:** Estland-Style Single-Confirmation-Screen: Geburtsurkunde ✓, Krankenversicherung ✓, Kindergeld eingerichtet ✓, Elterngeld vorbereitet ✓ → ein Feld: "Wohin dürfen wir das Geld überweisen? [IBAN]".
- **Grounding:** Plausibel mit echten Vorbildern (Österreich ALF seit 2015, Bremen ELFE inländisch). **2027-Zielbild** (ELFE ist Bremen-spezifisch, kein bundesweites 24h-Bündel heute).
- **Verifier-Verdikt:** REVISE — **überlappt #2 stark.** Entscheidung: #2 (schmaler, ehrlicher "Kindergeld ist schon da") ZUERST shippen (billiger, voll grounded); dieses fullere Bündel als STRETCH. Elterngeld = "vorbereitet ✓" nicht "bewilligt" (Bemessungszeitraum/Einkommen brauchen Input, akut für selbstständige Lena Schmidt).
- **Effort:** **L.** · **Spine-Fit:** zweite Vertical, aber redundant mit #2 — nicht beide spec'en.

---

### #12 — Proaktive Fristen-Rescue (schließendes Anspruchsfenster) · [NEW, in #2/#11 falten]

- **Wow-Moment:** "Mia wurde geboren. Wir haben Ihren Elterngeld-Antrag vorbereitet. Ohne Bestätigung in 47 Tagen verfallen 2 Monate (~1.300€)."
- **Grounding:** Elterngeld rückwirkend max. 3 Lebensmonate (**§7 Abs.1 S.2 BEEG**); Kindergeld rückwirkend max. 6 Monate (**§70 Abs.1 S.2 EStG — NICHT §66, den research-scout zitierte; §66 regelt Höhe/Zeitraum**). Elterngeldstelle = Land/kommunal.
- **Verifier-Verdikt:** REVISE. wow 5 emotional, **überlappt Kindergeburt-Vertical — dort hineinfalten.** €-Verlust "geschätzt ca.", Elterngeld "vorbereitet, Sie bestätigen + ergänzen".
- **Effort:** **M** (Teil von #2/#11).

---

### #13 — Datenschutzcockpit / Data-Tracker · [AMPLIFY]

- **Wow-Moment:** Feed der Inter-Behörden-Datenübermittlungen, jede Zeile mit Quell-/Zielregister + Zeitstempel + Rechtsgrundlage.
- **Grounding:** **Rechtlich REAL** — Datenschutzcockpit per RegMoG/IDNrG, BVA-betrieben, bis 2028. Erfüllt CLAUDE.md "Datenminimierung sichtbar". Landet bei DigitalService/BMDS-Insidern.
- **Verifier-Verdikt:** REVISE. **Kritische Korrektur:** das echte DSC protokolliert **REGISTER-zu-REGISTER-Übermittlungen** anhand der IdNr — NICHT "eine Sachbearbeiterin hat um 12:05 in deine Akte geschaut". Der research-scout-Beispieltext suggeriert Mensch-liest-Akte; als Datenübermittlung zwischen Stellen umformulieren, sonst Overclaim. Reframed → robuster PROCEED.
- **Effort:** **M.** · advanciert den Autopilot-Helden NICHT direkt → niedrigere Priorität trotz rechtlicher Solidität.

---

### #14 — Live, ehrliche Fall-Status-Leiter ("wir behalten das für Sie im Blick") · [NEW]

- **Wow-Moment:** Status-Leiter auf dem Vorgang (eingegangen → in Bearbeitung → zugewiesen → entschieden) mit ruhigem "wir behalten das für Sie im Blick".
- **Grounding:** OZG-Rahmen. **2027-Zielbild** — "Sachbearbeiter:in zugewiesen"-Granularität existiert heute fast nirgends maschinenlesbar. Anna/LEA ehrlichster Anker.
- **Verifier-Verdikt:** REVISE. "geschätzte Wartezeit"-Chip nur als "ca./Schätzung" (kein Registerwert; harte ETA wäre Fantasy). Advanciert Helden weniger direkt als Kaskade/Receipt → niedrigere Priorität.
- **Effort:** **L.**

---

### #15 — "Wir haben die zuständige Stelle gefunden" — Zuständigkeits-Pingpong beenden · [AMPLIFY]

- **Wow-Moment:** Assistenten-Zeile löst eine mehrdeutige Anfrage zu einer benannten zuständigen Behörde auf ("Zuständig ist die Familienkasse, nicht das Finanzamt"). Mappt perfekt auf Markus Schmidts dokumentierte Fehlannahme.
- **Grounding:** §25 VwVfG (Beratungspflicht) + §16/§3 VwVfG (Weiterleitung/Zuständigkeit — vor Bau verifizieren). Regelbasiert, gut im Assistenten abbildbar.
- **Verifier-Verdikt:** REVISE. Hard Rule: "zuständig wäre X, dorthin würde geleitet", NIE implizieren real weitergeleitet. Medium-Priorität — stärkt Assistenten, fügt aber keinen visuellen Wow allein hinzu.
- **Effort:** **M.**

---

### #16 — Autopilot-Katalog "demnächst"-Tiles zu glaubwürdigem Versprechen machen · [AMPLIFY]

- **Wow-Moment:** Die Katalog-Cards (Kindergeburt/Steuererklärung) zeigen echte Behörden-Chips + eine konkrete "so wird es ablaufen"-Micro-Preview, sodass der Zuschauer extrapoliert "das ist kein einzelner Trick — mein ganzes Verwaltungsleben bekommt das".
- **Grounding:** Micro-Preview darf NUR echte beteiligte Behörden + belegte Schritte zeigen, sichtbar "in Vorbereitung/Vorschau"-gelabelt.
- **Verifier-Verdikt:** PROCEED. wow 3 (Versprechen, kein gelebter Beat), aber hoher strategischer Wert für die Audience bei niedrigen Kosten — macht die Single-Vertical-Demo wie eine Plattform fühlen.
- **Effort:** **S.**

---

## 3. Cut-Liste (abgelehnt — nicht relitigieren)

| Kandidat | Ein-Zeilen-Grund |
|---|---|
| **Stille Leistung / Grundsicherung §41 SGB XII (standalone Senior-Surface)** | Größte rechtliche Landmine im Pool (§41 ist statutorisch antragsgebunden, "wird nur auf Antrag gewährt" — "claims it for you/no form" widerspricht dem Statut direkt) UND keine Persona-Verankerung (kein Rentner unter Anna/Schmidt/Mehmet). Würde-Framing-Lektion in den Anspruchs-Radar (#5) falten; standalone Screen droppen. |
| **"We got you the slot" (standalone Buchungs-Flow)** | HIGH Overclaim-Risiko (kein standardisiertes Kommune-Buchungs-API; Hard Rule). In #7 ("Automatisch für Sie gebucht"-Labelling) absorbieren — gleicher emotionaler Payoff über echte Demo-Daten, far weniger Fantasy. |
| **Cascade in Familie (Kita/Schulbezirk/Kinderarzt auto-übertragen)** | Fantasy: ein Kita-PLATZ wandert NICHT per Melderegister-Adress-Push mit (vertraglich/kommunal vergeben); Kinderarzt ist gar keine Behörde. NUR Kindergeld-Adressänderung (Familienkasse) ist ehrlich kaskadierbar — falls gebaut, hart auf diese eine Zeile + optional Schulbezirks-HINWEIS narrowen, nicht als standalone Familie-Automatik-Beat. |
| **"83% zufrieden" Relief-Proof-Tile** | wow 2 — statische Stat-Tile ist kein "1000x simpler"-Moment, sondern Credibility-Fußnote; ein Screen voller Stat-Tiles verwässert die Autopilot-Story. Provenance (eWA-Bezug) unverifiziert. Falls eine Trust-Zahl gewünscht: EINE verifizierte Zahl in die Value-Receipt/Onboarding falten, kein Net-New-Trust-Strip. |
| **Mehmet Two-Tier-Consent (Gewerbe-Vertical)** | Gute UX, aber erfordert eine ganze ungebaute Gewerbe-Vertical (neue Cascade/Screen/Consent-Maschinerie) nur um einen Toggle zu zeigen — poor effort/value, während billigere Hero-Amplifier ungebaut sind. Defer hinter Kindergeld/Kindergeburt/Aufenthalt. |

> **Keine Norm-Fantasie ungeprüft shippen:** Vor jedem Kindergeld-Fristen-Beat — 6-Monats-Rückwirkung ist **§70 EStG, nicht §66** (research-scout-Fehler). Vor jedem Entitlement-Beat — €-Beträge nur "geschätzt ca.". DSC = Register-zu-Register, nicht Mensch-liest-Akte.

---

## 4. Top-3-Empfehlung (build first)

**Bauen in dieser Reihenfolge — alle drei verstärken den Autopilot-Helden und sind auf dem Mock-Backend ohne reale Integration baubar:**

### 1. Kontinuierlicher Kaskaden-Moment (#1) — JETZT bauen
Der einzige fast-gratis maximale Wow. Der Held funktioniert schon, aber seine Auszahlung ist über Routen fragmentiert: heute muss der Bürger nach dem einen Satz auf `/vorgaenge/umzug/run` wegklicken (verifiziert `ToolCallCard.tsx:90-98` link-only), was den einen kontinuierlichen Loom-Beat bricht. Fünf PROCEED-Kandidaten in einen Spec falten (Inline-Kaskade + Konsequenz-Receipt + Once-Only-Zähler + Stammdaten-Quelle + Posteingang-Landing) konvertiert den stärksten-aber-zerstreuten Asset in einen ungebrochenen "Ich sprach → es handelte → ich sah zu → hier ist der Beleg"-Beat. **Komponenten existieren alle, Backend emittiert die Events schon — reines Präsentations-Re-Wire validierter Daten, keine neue Capability.** Höchstes wow×feasibility×realism im Pool. **Reinforces hero: maximal. Buildable on mock-backend: trivial (kein neuer Datenfluss).**

### 2. Antragsloses Kindergeld (#2) — als zweite Vertical bauen
Der eine echte "es ist schon da"-Beat, der die emotionale Inversion von Pflicht zu Anspruch liefert — und der einzige, der **beschlossene Gesetzgebung** ist (BMF Kabinettsbeschluss 03/2026, Steuer-ID-Trigger, 2027), nicht Spekulation, also unangreifbar vor genau der DigitalService/BMDS-Audience. Verankert auf Mia Schmidt = Stufe 1 exakt. Reused die Autopilot-Timeline + Value-Receipt-Maschinerie von #1, also baut #1 die Fundamente, auf denen #2 läuft. **Reinforces hero: ja (zweite Vertical desselben Autopilot-Musters). Buildable on mock-backend: ja (neue Mini-Cascade, reused Maschinerie).**

### 3. Wohngeld-Treffer (#3) — als erster Entitlement-Bolt-on bauen
Der am natürlichsten Spine-integrierte Entitlement-Beat: kettet direkt an die existierende Umzug-Value-Receipt, weil der Autopilot den Move-Moment schon besitzt und jetzt Miete+Adresse kennt — verlängert den Helden, statt einen disconnected Screen zu öffnen. Liefert den ersten echten Eintrag für die #4-Bring-Prinzip-Lane (die nicht vor einem realen Entitlement-Beat shippen sollte). Mit der antragsgebunden-Korrektur ("Antrag vorbereiten" + "geschätzt ca.") ist es ehrlicher und damit stärker bei Insidern als ein fakes "läuft schon". **Reinforces hero: ja (verlängert die Umzug-Kaskade). Buildable on mock-backend: ja.**

> **Net:** Die Demo braucht nicht mehr Screens — sie braucht ihren existierenden Helden KONTINUIERLICH gemacht (#1) und genau einen ehrlichen Entitlement-Beat, der Pflicht→Anspruch kippt (#2, dann #3). Dem langen Schwanz von Net-New-Persona-Verticals widerstehen, bis diese drei landen.
