---
feature: posteingang-v2-gap-analysis
date: 2026-05-09
author: research-scout
status: ideation
confidence: medium
revisions:
  - 2026-05-09 — addressed concept-verifier SOFT-REVISE (AV7 frame-honesty + AV8 temporal-caveat)
---

## What's already shipped

Posteingang V1 (2026-05-09) ships the receive→read loop: aggregated chronological inbox across Bund/Land/Kommunal/Selbstverwaltung/Privat, AI Pre-Open + Post-Open Summary mit Citation pro Bullet, Frist-Chip + Citation-Match-Gate, Was-kann-ich-tun-Footer (informativ, RDG-konform), Authentizitäts-Badge, Vorgangs-Bündel-Tag, .ics-Frist-Export, Datenschutz-Cockpit-Activity-Log, 18 Mock-Briefe über 9 Archetypen, sechs Locales (DE/EN/RU/UK/AR/TR), 4 Disclaimer-Strings verbatim. V1.5 (2026-05-09) ships read→reply: 4 Templates (Fristverlängerung, Nachweis einreichen, Informative Rückmeldung, Termin-Antwort mit Mode-Radio) + Freitext, ReplySheet, PreVersand-Modal mit StGB-§§ 185/241-Hinweis, ReplyConfirmationView, FilterPopover/Sheet, Sticky-Frist-CTA, RechtlicheHinweise-Collapse. **Out**: Skelett-Templates (V1.5.1), AI-Polish, Brief-Upload, Real-Versand, Read-Receipts, Multi-Persona, Auto-Archive — alle bewusst gesperrt.

---

## Gap analysis — 9 prioritized ideas

### Idea 1: Zahlungs-Rail im Brief — „Bezahlen-Button" mit SEPA-Vorbefüllung (effort: M; impact: ★★★)

**Was fehlt**: Steuerbescheid, Beitragsservice-Mahnung, IHK-Beitrag, BG-Beitrag, OWi-Bußgeldbescheid, freiwilliger KV-Beitrag — sechs der zehn Archetypen führen mit „Bitte zahlen Sie bis zum X.X.YYYY auf das untenstehende Konto" (siehe `letter-schmidt-fa-steuerbescheid-2024`, `letter-mehmet-ihk-beitrag`, `letter-mehmet-bgw-beitrag`). Die App extrahiert bereits den Frist-Typ `'zahlung'` und das Datum, aber **es gibt keinen Pfad von Brief → Zahlung**. Bürger:in muss IBAN, Verwendungszweck, Betrag manuell ins eigene Online-Banking abtippen (Top-Fehlerquelle: falscher Verwendungszweck → Aktenzeichen wird nicht zugeordnet → Mahnung trotz Zahlung).

**Bürger:innen-Schmerz**: Mehmet Yıldız bekommt einen Steuerbescheid mit Nachzahlung 4.812 €. Heute öffnet er seine Sparkasse-App, tippt 22-stelligen IBAN ab, kopiert „[MOCK] 217/5732/00088" als Verwendungszweck, vergisst beim Abtippen die letzte Ziffer, FA bucht Zahlung nicht zu — 14 Tage später Säumniszuschlag-Mahnung über § 240 AO 1 % pro Monat.

**Wow-Faktor demo**: Tap auf „Zahlung leisten" im LetterReader → vorbefüllter Sheet zeigt Empfänger / IBAN / Verwendungszweck (Aktenzeichen verbatim aus Brief) / Betrag — ein Klick „Zur Bank-App weiterleiten" (deeplink-Mock zu sparkasse://, n26://, dkb://) oder „SEPA-PaymentRequest-QR anzeigen" (EPC-QR-Code, EU-Standard). Loom-Viewer sieht: Mahnung-Risiko strukturell ausgeschaltet, App zeigt aktiv vor, was sonst Fehlerquelle ist. Datenflow ist transparent: Aktenzeichen + Betrag + IBAN sind alle aus dem Brief extrahiert, ein Citation-Marker pro Feld. Schließt den read→reply→pay-Lifecycle für zahlungsführende Bescheid-Archetypen (~40 % des Corpus, 100 % der friction-reichen Bescheide).

**Behörden-Realismus**: Echte Behörden-Bescheide drucken IBAN am Brief-Fuß; ein App-Zahlungsbutton wäre ein Mock-Deeplink (analog zu UK GOV.UK Pay als separate Plattform[^1]). EPC-QR ist EU-Standard und kann in eine Demo eingebaut werden ohne reale Bank-Anbindung. Realismus-Kaviat: ELSTER bietet *kein* eigenes Pay-Rail in 2026; Bund/Land arbeiten an einer ePayBL-Plattform der FITKO[^2] — Demo kann das als „2027 Speculative" framen. Pay-Rail addresses one-shot Bescheid-Zahlungen; recurring Beitrags-Pflichten würden in 2030+ in BundID-gespeicherte SEPA-Lastschrift-Mandate migrieren (out of V2 scope).

**Touch-points**: `src/components/posteingang/StickyFristAction.tsx` (zweiter CTA neben „Antwort verfassen"), `src/types/letter.ts` (neue `LetterPayment`-Struktur — IBAN, BIC, Empfänger, Verwendungszweck, Betrag, optional Citation-Match), `src/data/letters.json` (Payment-Daten in 6 bestehenden Briefen ergänzen), `src/lib/mock-backend/api.ts` (`postPaymentSimulated()` analog zu `sendReplySimulated()`), `src/lib/ai/tools.ts` (neues Tool `extrahiere_zahlung`).

**Suggested next agent**: domain-expert (ePayBL-Status 2026, EPC-QR-Format-Genauigkeit, RDG-Risiko von „Auto-Pay-Suggestion") → concept-verifier → product-architect.

---

### Idea 2: Bescheid-Widerspruch / Einspruch als 5. Reply-Template (defer-aus-V1.5.1) (effort: M; impact: ★★★)

**Was fehlt**: V1.5 deferred die Skelett-Templates `rechtsbehelf_skelett_einspruch` + `rechtsbehelf_skelett_widerspruch` (V1.5 spec §9 Z.1080) wegen Adressat-Risiko-Modal. Neun von 18 Mock-Briefen tragen aber eine Einspruchs- oder Widerspruchsfrist (alle Steuerbescheide, alle Beitragsservice-Festsetzungen, IHK, BG, beide KK-Beitragsbescheide). Heute kann Bürger:in nur Freitext schreiben — und die App, die alle nötigen Daten kennt (erlassende Behörde, Aktenzeichen, Datum, § 357 Abs. 2 AO / § 70 VwGO / § 84 SGG passend zum Archetyp), bietet keinen Skelett-Anker. Der Hard line ist klar (RDG: keine Begründung-Generierung), aber das **leere** Skelett (Anrede, „Hiermit lege ich gegen Ihren Bescheid vom … Az. … Einspruch ein. Begründung folgt." + Schlussformel) ist kein Rechtsdienstleistung iSv § 2 RDG.

**Bürger:innen-Schmerz**: Familie Schmidt erhält TK-Beitragsbescheid 497,29 €/Monat (`letter-schmidt-krankenkasse-beitrag`). Sie hält den Beitrag für falsch, will Widerspruch einlegen, weiß nicht *wie*. Die App zeigt zwar einen Was-kann-ich-tun-Bullet „Widerspruch einlegen" — aber keinen Versand-Pfad, kein Skelett, kein „bei welcher Behörde" (Adressat-Risiko § 357 Abs. 2 AO). Frist 1 Monat. Heute löst sie das mit copy-paste aus einem Anwalts-Blog.

**Wow-Faktor demo**: Im LetterReader-Sticky-CTA Klick „Widerspruch einlegen" → Pre-Insertion-Modal zeigt verbatim-Wortlaut „Einspruch muss bei der **erlassenden Behörde** eingelegt werden (§ 357 Abs. 2 AO). Wir haben aus dem Briefkopf '[Behörde]' übernommen — bitte prüfen Sie das selbst." (V1.5.1-spec §9 Z.1081 hat den Wortlaut bereits final). Body-Skelett ohne Argumentation. Disclaimer „Begründung müssen Sie selbst formulieren — wir generieren sie nicht (RDG)." Demo zeigt: App **kennt die Grenze** und respektiert sie sichtbar. Anti-Pattern für Smartlaw-Vibe.

**Behörden-Realismus**: § 357 AO-Adressat-Risiko ist real und scharf — ein Einspruch bei der falschen Stelle wahrt die Frist nicht (BFH X R 6/12, 2014). § 70 VwGO + § 84 SGG analog für Sozialgerichts-/Verwaltungsgerichts-Widerspruch. Wortlaut Adressat-Modal ist domain-validiert.

**Touch-points**: `src/types/letter.ts` (`ReplyTemplateId`-Union erweitern), `src/components/posteingang/PreInsertionModal.tsx` (Hülle existiert bereits, body füllen), `src/components/posteingang/ReplySheet.tsx` (Template-Picker + Modus-Hide), `src/data/letter-summaries.json` (body-Templates DE), Domain `posteingang-v1.5-template-bodies.md`.

**Suggested next agent**: domain-expert (final-Wortlaut Adressat-Modal pro Norm-Familie + § 357 AO vs § 70 VwGO vs § 84 SGG Diff) → concept-verifier → product-architect.

---

### Idea 3: Dokumente-Vault-Integration — „Nachweis aus Vault anhängen" (effort: M; impact: ★★★)

**Was fehlt**: ReplySheet kennt nur File-Picker (`accept="application/pdf,image/png,image/jpeg"`, `src/components/posteingang/ReplySheet.tsx:901`). Bürger:in lädt jeden Anhang neu hoch, auch wenn die App das Dokument bereits im Dokumente-Vault kennt (Persona Anna hat AOK-Mitgliedsbescheinigung, Aufenthaltstitel, Reisepass im Vault — alle EUDI-kompatibel pro Persona-Spec). Das Familienkasse-Nachweis-Szenario (`letter-schmidt-familienkasse-nachweis`) verlangt eine Schulbescheinigung — ein Dokument, das im 2027-Vault-Konzept bereits liegen würde.

**Bürger:innen-Schmerz**: Markus Schmidt bekommt Familienkasse-Nachweis-Aufforderung. Er weiß, er hat die Schulbescheinigung als PDF — irgendwo. Sucht 5 Minuten in Mail/Downloads/Photos. Lädt sie hoch. Hätte die App ihm direkt „Schulbescheinigung Felix Schmidt 2026/27 — gültig bis 31.07.2027" als Vorschlag anbieten können (auf Basis von `archetype: 'familienkasse-nachweis'` + `nachweis_bezeichnung: 'schulbescheinigung'`).

**Wow-Faktor demo**: Im ReplySheet → Template „Nachweis einreichen" → Anhang-Bereich zeigt **zwei** CTAs: „Datei hochladen" + **„Aus Dokumenten anhängen (3 passende)"**. Klick öffnet Sheet mit Match-Vorschlägen rangiert nach Archetyp-/Behörden-/Datum-Fit. Klick auf „Schulbescheinigung Felix" → Anhang erscheint mit `[MOCK]`-Watermark, Vault-Provenance-Tag „aus Dokumenten am 15.06.2026 angehängt" inkl. Originalaussteller-Behörde + Gültigkeit. Loom-Viewer: das ist *Datenminimierung in echt* — App zeigt nur Dokumente, die zum Brief-Archetyp passen, statt Bürger:in den ganzen Vault zu öffnen.

**Behörden-Realismus**: ELSTER Mein-Postfach erlaubt *keine* Vault-Anhänge heute (manuelle Datei-Upload-Pflicht). EUDI-Wallet-Konzept (eIDAS 2.0, in Kraft 2024) sieht selektive Disclosure-Credentials genau dafür vor — speculative-2027-konform. Realismus-Kaviat: heute würde Familienkasse die Schulbescheinigung trotzdem als PDF wollen, kein VC; Demo kann beide Wege zeigen.

**Touch-points**: `src/components/posteingang/ReplySheet.tsx:901-915` (Attachment-Picker), `src/components/dokumente/*` (existiert nicht — wird durch Dokumente-Spec gebaut, also Reihenfolge-abhängig), neuer Component `<VaultAttachmentPickerSheet>`, `src/lib/mock-backend/api.ts` (`getMatchingDocuments(letterId, archetype)`), Cross-link zu Dokumente-Spec.

**Suggested next agent**: research-scout (kurz: EUDI Wallet PID + AttestationLifecycle 2026, was selektive Disclosure für Schulbescheinigung bedeutet) → concept-verifier → product-architect — **aber blockiert auf Dokumente-Spec** (CLAUDE.md status: „Dokumente vault — awaiting product-architect").

---

### Idea 4: Frist-Risiko-Cockpit — proaktive Brief-Übersicht & Push-Reminder (effort: M; impact: ★★)

**Was fehlt**: Heute landet Bürger:in auf `/posteingang` und sieht eine Liste, in der Frist-Briefe chronologisch (nicht risiko-priorisiert) liegen. Es gibt **keine pro-aktive Übersicht** „3 Fristen in den nächsten 7 Tagen, 1 davon mit Zahlungspflicht". Der V1-Status-Filter „Frist <= 7d" hilft, sobald man ihn aktiviert — aber die Hero-Page selbst macht keinen Risiko-Anchor sichtbar. Push/E-Mail-Reminder vor Fristablauf existiert nicht; Estonia eesti.ee macht das routinemäßig (V1-Research[^3] flagged das als „nudges 7/3/1 Tag vor Frist", aber V1 implementierte nur .ics-Export).

**Bürger:innen-Schmerz**: Anna Petrov öffnet die App im Mai. Steuerbescheid hat Einspruchsfrist verstrichen am 12.04.2026 (`letter-fa-steuerbescheid-2025`, `frist.datum: '2026-04-12'`). Heute sieht sie das erst beim Aufrufen des Briefs; auf der Inbox-Hero gibt es keinen Banner „1 Frist verstrichen seit 28 Tagen". Die App weiß es, sagt es ihr aber nicht aktiv.

**Wow-Faktor demo**: Auf `/posteingang`-Hero ein „Frist-Banner" über der Liste: „**3 Fristen in den nächsten 14 Tagen** — 1× Zahlung 1.247 €, 1× Widerspruch, 1× Termin-Antwort. **1 Frist verstrichen** — letzten Bescheid vom Finanzamt prüfen." Klickbar zu gefilterter Liste. Sekundär: Reminder-Settings-Sheet (7/3/1-Tag-Reminder) mit Datenschutz-Cockpit-Eintrag „Erinnerungs-Push, Rechtsgrundlage Art. 6 Abs. 1 lit. a Einwilligung, abgeschickt 13.05.2026 09:15". Loom-Viewer sieht: App geht von **„hier ist deine Post" → „hier ist dein Risiko"**.

**Behörden-Realismus**: Push-Notifications sind app-intern — kein Read-Receipt zur Behörde, kein juristisches Bekanntgabe-Risiko (V1 § 10 Hard-line bleibt). § 122a AO Bekanntgabe-Fiktion 4. Tag bei elektronischen Bescheiden ist davon unberührt — Reminder ist UX, nicht Bekanntgabe-Trigger. Realismus-Kaviat: muss klar als „App-Aktivität" markiert sein.

**Touch-points**: `src/app/(app)/posteingang/page.tsx` (Hero-Komponente), neuer `<FristRisikoBanner>`, `src/lib/mock-backend/api.ts` (`getFristenSummary()`), Cross-link zu Dashboard-Spec (Dashboard zeigt das auch — Doppelnutzung möglich), `src/types/letter.ts` (kein Schema-Change, abgeleitet).

**Suggested next agent**: concept-verifier (gefahr: Anxiety-Pattern à la Klarna „you must act now"; brauchen citizen-respectful framing-check) → product-architect — Reminder-Settings-Persona-Datenschutz-Konsequenzen sollten domain-expert zwischen-prüfen.

---

### Idea 5: Multi-Brief-Korrespondenz-Thread innerhalb eines Vorgangs (effort: M; impact: ★★)

**Was fehlt**: V1 hat `Letter.vorgang_id` und einen `<VorgangsBuendelTag>`, V1.5 hat in-thread-Replies (Verifier #14). Aber: der **Thread-View** existiert nur als „nach-vorgang gruppieren"-Tab in der Inbox-Liste — er rendert noch keinen *zeitlich verschachtelten Mail-Faden* aus inbound Letter ↔ outbound Reply ↔ inbound Folge-Letter. Im realen Familienkasse-Verfahren ist der Ablauf typischerweise: Antrag → Nachweis-Aufforderung (Brief 1) → Antwort (Reply 1) → Bescheid (Brief 2) → ggf. Widerspruch (Reply 2) → Widerspruchsbescheid (Brief 3). Der Bürger:in versteht erst beim chronologischen Verschachteln, *warum* Brief 3 da ist.

**Bürger:innen-Schmerz**: Markus Schmidt antwortet auf den Familienkasse-Nachweis (Reply 1 versandt 12.05.2026). Drei Wochen später kommt ein Folge-Brief „Kindergeld Bewilligung" oder „weitere Mitwirkungs-Aufforderung". Er hat keine Verbindung — App zeigt es als isolierten Brief, obwohl der Aktenzeichen-Stamm `[MOCK] 234FK892017` identisch ist.

**Wow-Faktor demo**: Klick auf den Vorgangs-Bündel-Tag → Thread-View: drei Spalten/Zeilen mit Brief-Reply-Brief-Reply-Brief, mit Pfeilen + relativen Zeitstempeln, mit „dieser Brief antwortet auf Ihren vom 12.05.". Loom-Viewer: das sieht aus wie **Apple-Mail-Threading mit Behörden-Realismus**, eine Visualisierung, die heute in keiner DE-Behörden-App existiert (ELSTER zeigt Dokumente flach, nicht thread-verschachtelt).

**Behörden-Realismus**: Aktenzeichen-Stamm ist die echte Anker-Logik (Domain-Doku §3.1). Behörden-Antwort-Latenz „3-6 Wochen" für Familienkasse ist realistisch. Speculative-Frame: in-thread-bidirektional setzt ZBP/BundID-Modell voraus (V1.5 § 8.3 Banner). Realismus-Kaviat: heute (2026) gibt es kein cross-agency Thread-Modell; nur ELSTER hat in-thread innerhalb FA.

**Touch-points**: `src/components/posteingang/VorgangsGruppe.tsx` (existiert, render-Logic erweitern), neuer `<VorgangsThreadView>` (zeitlich-verschachtelt), `src/lib/mock-backend/api.ts` (`getLetterThread()` existiert schon `:1071`, Format anpassen), `src/data/letters.json` (zwei Folge-Briefe für Schmidt-Familienkasse-Vorgang ergänzen, damit der Thread-Demo nicht aus 1 Brief besteht), `src/components/vorgaenge/*` (Cross-link zur Vorgänge-Surface).

**Suggested next agent**: product-architect direkt — Thread-View ist UX-Pattern aus Apple Mail / Gmail; keine neue Domain-/Verifier-Risiko-Linie.

---

### Idea 6: Authentizitäts-Proof + Phishing-Schutz (effort: L; impact: ★★)

**Was fehlt**: V1 spec § 10 Z.1058 deferred „Phishing-Archetyp (7. Archetyp)" auf V2. Heute ist `<AuthentizitaetsBadge>` rein dekorativ — 17 von 18 Mock-Briefen haben `auth_channel: 'briefpost'`, Badge ist informationsfrei (UX-Critique Issue 1 hat das markiert). Was wirklich fehlt: ein **Verifizier-Pfad** für jeden Brief (echte Behörde? Aktenzeichen-Format passend zum Absender? Briefkopf-Adresse mit Behörden-Whitelist gematcht? EUDI-Wallet-Signatur verifiziert?). Phishing nimmt zu — Beitragsservice-Fake-Sites mit „digitaler-post-service-fzco" sind im V1-Research dokumentiert[^4]. ELSTER-Bescheide haben `§ 122a AO`-elektronische-Bekanntgabe — ein technisches Fundament für Authentizitäts-Cryptography existiert real (mTAN, qSiegel), wird aber zivilen Bürger:innen unsichtbar gemacht.

**Bürger:innen-Schmerz**: Anna Petrov bekommt einen „Beitragsservice"-Brief, der real ein Phishing-Anschreiben ist mit gefälschtem Aktenzeichen-Format und „bezahlen Sie 39,99 € hier". Heute: keine App-seitige Plausibilitäts-Prüfung, App rendert ihn wie jeden anderen Brief. Anna verlässt sich auf intuition.

**Wow-Faktor demo**: 7. Archetyp `verdaechtiger-brief` als Demo-Anker. Letter-Card zeigt **rotes** Authentizitäts-Badge „**Plausibilität nicht bestätigt** — Aktenzeichen-Format passt nicht zum Beitragsservice-Standard (9 Ziffern erwartet, 12 erhalten)". Klick → Phishing-Warn-Modal: Liste konkreter Mismatches (Aktenzeichen-Regex, Briefkopf-Domain, Bankverbindung-Whitelist). Sekundär: bei `auth_channel: 'eudi-versiegelt'` Badge in **grün** mit „qualifizierte elektronische Signatur (mock)" + Click → „Diese Signatur wurde vom (mock) D-Trust-Trust-Service-Provider am 15.04.2026 09:14 ausgestellt — Validität bis 31.12.2027". Loom-Viewer sieht: App nimmt Bürger:innen-Trust ernst, *strukturell*, nicht nur als Disclaimer.

**Behörden-Realismus**: D-Trust + Bundesdruckerei betreiben qSiegel-Trust-Services real (§ 17a VwVfG iVm eIDAS Art. 35); Beitragsservice-Aktenzeichen sind real 9-stellig (Domain §3.1 + V1 Research[^5]); Bankverbindungs-Whitelist je Behörde ist über die Behörden-Datenbank-Adressen-Stamm prüfbar. Realismus-Kaviat: Cryptographische-Validierung muss als Mock klar markiert sein; Demo darf nicht suggerieren, dass die Mock-Signatur wirklich überprüft wurde.

**Touch-points**: `src/types/letter.ts` (`LetterArchetype` erweitern, neue `verifizierung`-Struktur), `src/data/letters.json` (1 Phishing-Mock-Letter + 1 EUDI-versiegelter Letter), `src/components/posteingang/AuthentizitaetsBadge.tsx` (3-Stufen-Visual: rot/amber/grün), neuer `<PhishingWarnModal>`, `src/lib/mock-backend/api.ts` (`verifyLetter()`-Mock).

**Suggested next agent**: research-scout (eIDAS 2 qualified electronic seals + D-Trust 2026 Status, was an Mock-UI realistisch ist) → domain-expert (Phishing-Indikatoren-Liste pro Archetyp) → concept-verifier → product-architect.

---

### Idea 7: Volltext-Suche + Aktenzeichen-Fuzzy + AI-Frage „wie ging das letzte Mal?" (effort: S; impact: ★★)

**Was fehlt**: V1 hat `<AktenzeichenSearch>` (Substring-Match, `LetterListHeader.tsx:34-54`). Damit findet Bürger:in einen Brief, dessen Aktenzeichen sie *kennt*. Was fehlt: Suche im **body_de**, in der **AI-Summary**, in **Reply-Bodies**, im **Betreff**. Außerdem: kein semantischer Anker — „zeig mir alle Briefe zur Krankenkasse 2024" funktioniert heute nur über Behörden-Filter, nicht über Inhalt. UK gov.uk PTA hat keinen cross-agency Suchindex (Research[^6]); Estonia eesti.ee hat einen, aber thematisch organisiert.

**Bürger:innen-Schmerz**: Anna sucht „den Brief, in dem die Familienkasse den Bewilligungs-Bescheid für Lev geschickt hat" — sie weiß nicht das Aktenzeichen, nur das Thema. Heute: chronologisch durchscrollen, Behörden-Filter setzen, raten.

**Wow-Faktor demo**: Suchfeld mit drei Modi: (a) Aktenzeichen (heute), (b) Volltext im Brief + Body + Summary, (c) **„Frage stellen"** → AI antwortet mit Brief-Liste + Citation pro Brief: „Sie haben 2 Briefe zur Familienkasse. Der Bewilligungs-Bescheid kam am 14.01.2025 (Az. [MOCK] 115FK668412), die Nachweis-Aufforderung am 02.05.2026 (Az. [MOCK] 234FK892017)." Loom-Viewer: das ist die **AI-Assistent-Brücke** — der Posteingang lernt von der Inbox, ohne zur Recht-Beratung zu werden.

**Behörden-Realismus**: Volltext-Suche ist trivial (clientseitig auf 18 Mock-Briefe). Semantische AI-Suche braucht Tool-Use („vorschlage_relevante_briefe(query)") — ist DSGVO-konform, weil App-intern ohne externe Übermittlung außer zum AI-Provider (V1-AVV-Vermerk gilt).

**Touch-points**: `src/components/posteingang/AktenzeichenSearch.tsx` (erweitern), `src/lib/ai/tools.ts` (neues Tool), `src/lib/mock-backend/api.ts` (`searchLetters(query, mode)`), Cross-link zu `src/app/api/assistant/route.ts` (Posteingang-Mode für Assistent).

**Suggested next agent**: product-architect direkt — keine RDG-Risiko-Linie, AI-Antwort ist faktisch (Brief-Existenz, Datum, Aktenzeichen — keine Empfehlung).

---

### Idea 8: Frist-„Aussetzung der Vollziehung"-Pfad als geführte Aktion (effort: M; impact: ★★)

**Was fehlt**: Steuerbescheid-Was-kann-ich-tun-Liste hat heute `steuerbescheid.aussetzung` als informativen Bullet (V1 § 8.4 Z.967, § 361 AO). Aber: kein Versand-Pfad. Aussetzung der Vollziehung ist *die* Standard-Reaktion, wenn man Einspruch einlegt und gleichzeitig die Zahlungsfrist nicht verstreichen lassen will (§ 361 Abs. 2 AO: Aussetzung kann beantragt werden, wenn ernstliche Zweifel an der Rechtmäßigkeit bestehen). In V1.5 gibt es `nachweis_einreichen` und `frist_verlaengerung` als Templates, aber kein `aussetzung_vollziehung`-Template — obwohl es ein gut umgrenzter, wiederholbarer Brief-Typ ist (1 Satz: „Hiermit beantrage ich gem. § 361 Abs. 2 AO die Aussetzung der Vollziehung des o.g. Bescheids bis zur Entscheidung über meinen Einspruch.").

**Bürger:innen-Schmerz**: Mehmet will Einspruch einlegen gegen Steuerbescheid 4.812 € Nachzahlung (`letter-mehmet-fa-steuerbescheid-2024`), aber Zahlungsfrist 12.06.2026 läuft trotzdem. Heute: Aussetzung-Antrag ist ein separater Brief, den er selbst formulieren muss; oder er zahlt erst und versucht später Erstattung.

**Wow-Faktor demo**: ReplySheet-Template-Picker zeigt **kontextuell** (nur bei `archetype === 'steuerbescheid'` mit `frist.typ === 'einspruch' + 'zahlung'` parallel) das Template „Aussetzung der Vollziehung beantragen" mit Skelett-Body 1 Satz + Disclaimer „Aussetzung wird **nicht automatisch** gewährt — Behörde prüft. Säumniszuschläge sind ausgesetzt nur, wenn Antrag stattgegeben wird." Loom-Viewer: App zeigt einen Zwei-Schritt-Brief, den heute selbst Steuerberater:innen für Mandant:innen tippen.

**Behörden-Realismus**: § 361 AO Wortlaut + Ablehnungs-Praxis sind wohldefiniert; Skelett-Body ist 1 Satz, *keine* Begründung — RDG-konform analog zu Idee 2 (Einspruchs-Skelett).

**Touch-points**: `src/types/letter.ts` (Template-Union erweitern), `src/data/letter-summaries.json` (body_template_de), `src/components/posteingang/ReplySheet.tsx` (kontextuelle Template-Visibility), Domain `posteingang-v1.5-template-bodies.md` (neues Template-Body).

**Suggested next agent**: domain-expert (RDG-Linie für Aussetzung-Skelett vs. Begründung; § 361 AO-Schwelle „ernstliche Zweifel"-Wortlaut darf nicht in Skelett enthalten sein) → concept-verifier → product-architect — würde gut **gemeinsam mit Idee 2** in einer V1.5.1-Welle laufen (Skelett-Templates-Bündel).

---

### Idea 9: Brief-Empty-State + Onboarding für Erst-Nutzer:in (effort: S; impact: ★)

**Was fehlt**: UX-Critique Issue 13 hat den generischen Empty-State markiert. Was V1 nicht hat: ein **Onboarding-Flow** für die allererste Nutzung. Heute landet jede neu eingeloggte Persona auf einer voll-geseedeten Inbox mit 5–8 Mock-Briefen. Im Loom-Demo ist das praktisch; im Realismus-Frame fehlt aber der Moment, in dem die App **erklärt**, *warum* sie diese Briefe hat (BundID-Kopplung 2027), *wer* sie senden kann (Behörden-Whitelist), *wie* Bürger:in einen externen Brief reinbekommt (Brief-Upload V2 / EUDI-Wallet-Receive). Estonia eesti.ee macht das mit einem 30-Sekunden-Intro auf erstem Login[^7].

**Bürger:innen-Schmerz**: Recruiter klickt auf Demo, sieht voll-geseedete Inbox, denkt „ah okay, Mock-Daten" — aber versteht den **Gesamt-Frame nicht**: woher kommen diese Briefe in einem realen 2027? Das ist die *speculative narrative*, die die App vermitteln muss, sonst bleibt sie als „Inbox-Klon" wahrgenommen.

**Wow-Faktor demo**: Bei `letters.length === 0` → Empty-State zeigt drei nebeneinander: „**Empfangen via BundID-Postfach**" (mock-checkmark), „**Empfangen via EUDI-Wallet-Receive**" (speculative-2027), „**Manuell hochladen**" (V2 disabled). Bei jedem ein 1-Satz-Erklärung. Beim ersten Login (Cookie-Flag) ein Swipeable Onboarding-Sheet vor der Inbox: 3 Cards „So aggregiert die App Ihren Posteingang", „Was die KI darf", „Was die Behörde sieht (nichts)". Optional: bei 100+-Briefen-Demo-Variante (Performance-Demo) eine „Filter-Tutorial"-Bubble auf erstem Frist-Chip-Hover.

**Behörden-Realismus**: BundID-Postfach existiert real seit Sept 2023; EUDI-Wallet ist eIDAS-2-Pflicht für DE bis 2026/27; Empty-State-Texte können das speculative-frame bedienen ohne zu lügen (V1.5 § 8.3 Speculative-Banner-Wortlaut bereits domain-validiert).

**Touch-points**: `src/components/posteingang/PosteingangInbox.tsx:361-385` (empty_inbox-Branch), neuer `<OnboardingSheet>` (Cookie-Flag + Modal), Cross-link zu `(auth)/onboarding` (existiert).

**Suggested next agent**: product-architect direkt — keine Verifier-Risiken; reine UX-Polish-Welle, könnte in einen „Onboarding-Sweep" mit Stammdaten + Dokumente gebündelt werden.

---

## Recommended top 3

Given the demo's purpose (portfolio Loom video, autopilot-as-hero, citizen-respectful framing, mock-only), my prioritized picks are:

**1. Idea 1 — Zahlungs-Rail** ist das **einzige** Feature in dieser Liste, das einen *neuen*, *konkreten*, *messbaren* Citizen-Pain strukturell löst, den heute 100 % der DE-Behörden-Apps inklusive ELSTER haben. Es ist auch der einzige Pfad, der den Brief-Lifecycle wirklich schließt (heute: read + reply, nach Idea 1: read + reply + pay = 3/3). Und visuell ist EPC-QR-Code eine 5-Sekunden-Wow-Sequenz. Hard-line: die Mock-Bank-Anbindung muss klar als Mock erkennbar sein.

**2. Idee 2 + 8 als Welle (Rechtsbehelf + Aussetzung)** — beide sind Skelett-Templates mit hartem Domain-/RDG-Frame, beide sind V1.5.1-Anker (Pre-Insertion-Modal-Hülle existiert bereits), beide sind realistisch in 1 Sprint baubar nachdem domain-expert die Wortlaute final hat. Das ist die *natürliche* nächste V1.5.1-Welle laut Spec; sie erweitert das Reply-Surface ohne neue Risiko-Achse zu öffnen.

**3. Idee 4 — Frist-Risiko-Cockpit** als Brücke zum Dashboard. Es ist das einzige Feature, das die Inbox **proaktiv** macht statt reaktiv — und das ist genau der „autopilot is the hero"-Anspruch aus CLAUDE.md. Concept-verifier muss anti-anxiety-frame schärfen, aber das ist eine Wording-Linie, kein Architektur-Risiko. Der Reminder-Settings-Sheet liefert auch einen Datenschutz-Cockpit-Anchor (jeder Reminder mit Rechtsgrundlage geloggt) — das ist ein zweiter Wow-Punkt für DSGVO-affine Recruiter.

Idee 3 (Vault-Integration) ist hochwertig, aber **blockiert auf Dokumente-Spec** — sie sollte parallel laufen, nicht vor.

---

## Out-of-scope für Posteingang (gehört woanders)

- **Zentrale Frist-Übersicht über alle Surfaces** (Brief + Vorgang + Termin + Aufenthaltstitel-Ablauf) → **Dashboard-Spec**. Posteingang-Idee 4 zeigt nur Brief-Fristen; Cross-Surface-Aggregation ist Dashboard.
- **Document-Vault-CRUD + EUDI-Selektive-Disclosure-UX** → **Dokumente-Spec**. Posteingang-Idee 3 ist nur der Picker-Hook.
- **Stammdaten-Auto-Fill in Reply-Header** (Anschrift, Geburtsdatum aus Persona) → bereits geliefert in V1.5-Token-Resolver; Stammdaten-Surface-Spec besitzt CRUD.
- **Termin-Anlegen aus Brief** (Termin-Vorschlag → Eintrag in `/termine`) → **Termine-Spec**. Posteingang-Termin-Antwort-Template existiert; Kalender-Side gehört Termine-Surface.
- **Datenschutz-Cockpit-Vollausbau** (Lösch-Anträge nach Art. 17 DSGVO, Export aller Daten nach Art. 20, granulare Consent-Toggles pro Behörden-Typ) → **Datenschutz-Spec**. Posteingang loggt nur Activity-Events.

---

## Open questions for user

1. **Zahlungs-Rail Demo-Intent**: soll die Demo SEPA-Standard-XML/EPC-QR-Code zeigen (EU-spec-treu, 100 % Mock) oder Bank-App-Deeplink simulieren (sparkasse://, n26://, dkb://) — oder beide nebeneinander? Erst-Pick beeinflusst Realismus-Frame und Mock-Aufwand.

2. **V1.5.1 jetzt oder Stammdaten zuerst?** CLAUDE.md status hat Stammdaten + Dashboard + Dokumente in der Pipeline. Soll Posteingang V2 (Top-3 oben) **vor** Stammdaten gebaut werden — oder warten wir auf horizontal-layer-completion und kommen zurück?

3. **Phishing/EUDI-Authentizität (Idee 6) als eigenständiger Track?** Das ist die einzige Idee mit Crypto-Speculative-Aspekt; sie liefert einen starken visuellen Wow, hat aber den höchsten Realismus-Risiko-Score (Demo darf nicht suggerieren, dass Mock-Signaturen verifiziert wurden). Soll sie auf V3 verschoben werden, bis EUDI-Wallet-Status 2027 klarer ist — oder als deklariert-speculative-Demo-Element jetzt eingebaut werden?

---

## Sources

[^1]: [GOV.UK Pay — Take payments](https://www.payments.service.gov.uk/) — accessed 2026-05-09. Separate Payment-Rail, gekoppelt aus Letter-Inhalten via Deeplink.
[^2]: [FITKO ePayBL Status — efa.fitko.de](https://efa.fitko.de/) — referenced via V1-Research; ePayBL ist die DE-Pendant-Plattform-Initiative.
[^3]: `docs/research/2026-05-08-posteingang-brief-erklaerer.md` line 181 (Estonia eesti.ee 7/3/1-Tag-Reminder + Apple Mail Priority Messages).
[^4]: `docs/research/2026-05-08-posteingang-brief-erklaerer.md` line 102 (Beitragsservice-Phishing-Risk + „digitaler-post-service-fzco" Fake-Site).
[^5]: `docs/domain/posteingang.md` line 88 (Beitragsservice 9-stelliges Aktenzeichen-Format, rundfunkbeitrag.de-Quelle).
[^6]: `docs/research/2026-05-08-posteingang-brief-erklaerer.md` line 132 (UK gov.uk PTA Messages-Tab — agency-spezifisch HMRC, kein cross-agency).
[^7]: `docs/research/2026-05-08-posteingang-brief-erklaerer.md` line 128 (Estonia eesti.ee + Topisch-organisierte-Inbox + Onboarding-Pattern).
[^8]: [borger.dk Digital Post — National Citizen Portal](https://en.digst.dk/digital-services/borgerdk-national-citizen-portal/digital-post-on-borgerdk/) — accessed 2026-05-09. Bestätigt: in-thread Reply-Funktion existiert, aber kein cross-agency Threading-View dokumentiert.
[^9]: [GOV.UK One Login HMRC migration Feb 2026](https://www.gov.uk/log-in-register-hmrc-online-services) — accessed 2026-05-09. Kontext für UK-Inbox-Surface-Reform.
