---
topic: Kontakt-Schicht (E-Mail/Telefon/SMS-Opt-In/Postfach) für Stammdaten V1.1
question: Welche kanonischen Behörde→Bürger:in-Kontaktkanäle existieren in DE 2026, und wie sollen sie in Stammdaten V1.1 gemappt werden?
date: 2026-05-10
status: draft
confidence: medium
upstream-from: docs/specs/stammdaten.md (V1 shipped 2026-05-10)
downstream: domain-expert (legal validation), concept-verifier (adversarial), product-architect (V1.1 spec)
---

# Executive Summary

- **Stammdaten V1** macht hoheitliche Felder (BMG, IDNrG, AZRG, …) sichtbar — aber **kein Kontakt-Layer**, also keine Verbindung Posteingang↔Autopilot↔Behörde-Notification.
- 2026 ist DE in einem **Kanal-Übergang**: DE-Mail wird Ende 2026 abgeschaltet (in Verwaltung bereits seit 31.08.2024 ausser Betrieb)[^demail-shutdown][^demail-techbook]; **BundID-Postfach** mit „bidirektionaler Kommunikation" wird 2026 zum De-facto-Standard-Kanal[^adhoc-bundid]; **EUDI-Wallet** kommt Ende 2026 als zweite Säule[^eudi-rollout]; **DeutschlandID** als geplantes Rebranding nach OZG § 12 (Datum offen)[^wikipedia-bundid].
- Die kanonischen 2026/27-Kontakt-Kanäle Behörde→Bürger:in sind: **(1) BundID-Postfach** (rechtsverbindliche Bekanntgabe per § 41 Abs. 2a VwVfG), **(2) E-Mail-Notification** (informatorisch, „Sie haben Post im Postfach"), **(3) Postanschrift** aus dem Melderegister (BMG § 3) als rechtssicherer Default-Fallback, **(4) Mobilfunk-Nummer** als optionaler 2FA-Träger.
- 76 % der Bürger:innen wollen digital mit Behörden kommunizieren (Bitkom 2024)[^bitkom-digital]; aber 59 % empfinden Behördenkontakt heute als „sehr anstrengend" (eGov Monitor 2025)[^d21-monitor25] — der Pain-Point ist **Kanal-Fragmentierung und fehlende Notification-Schicht**, genau das Lücken-Bild, das V1.1 adressieren kann.
- **Empfohlener V1.1-Scope**: Read-Layer für 4 Kanal-Cards (Postfach, E-Mail, Mobilfunk, Postanschrift) + 1 Notification-Präferenz-Sektion (welcher Kanal je Vorgangs-Typ) + Aktivitätsprotokoll-Erweiterung „eingehende Nachricht aus Posteingang".

# Geltende Rechtsgrundlagen

## OZG 2.0 (in Kraft 24.07.2024) — Postfach-Pflicht für Bund
- OZG-Änderungsgesetz wurde am 14.06.2024 vom Bundesrat verabschiedet, in Kraft 24.07.2024[^ozg2-bundesrat][^ozg2-cosinex].
- Ziel: vollständig digitale Kommunikation (Antrag→Bescheid) über das **BundID-integrierte Postfach** für Bundesleistungen[^ozg2-digitale-verwaltung].
- Bund verpflichtet sich, innerhalb von 2 Jahren bundesweit technische Vorgaben + Schnittstellen festzulegen; **ab 2026 technisch bereitgestellt, ab 2028 verpflichtend für Kommunen**[^ozg2-bundesdruckerei].
- Übergangsfrist 3 Jahre: Länder-Konten wie Service-BW, Mein Servicekonto Berlin etc. dürfen weiter genutzt werden bis 2027/28[^ozg2-bundesdruckerei].

## § 41 VwVfG — elektronische Bekanntgabe via Postfach
- § 41 Abs. 2a VwVfG: „Mit Einwilligung des Beteiligten kann ein elektronischer Verwaltungsakt durch Bereitstellung zum Abruf bekannt gegeben werden"[^vwvfg-41].
- Authentifizierung des Empfängers ist Pflicht (z.B. via eID-Funktion, BundID)[^vwvfg-41].
- → **Implikation V1.1**: Das BundID-Postfach ist *rechtsverbindlich* nur dann, wenn der/die Bürger:in den Postfach-Dienst aktiviert UND eingewilligt hat. Stammdaten muss diesen Status sichtbar machen.

## § 3 BMG — authoritative Postanschrift
- § 3 Abs. 1 BMG listet Pflichtangaben: aktuelle Anschriften, frühere Anschriften, Status Haupt-/Nebenwohnung[^bmg-3].
- Die Meldebehörde (kommunal nach Landesrecht designiert) ist **die einzige authoritative Quelle** für die Postanschrift einer natürlichen Person in DE[^bmg-3].
- BundID kann selbst-eingegebene oder eID-übernommene Anschriften halten; sie sind aber **nur in dem Moment der Übernahme** synchron, danach driften sie ohne Re-Sync auseinander.
- → **Implikation V1.1**: Postanschrift-Card im Kontakt-Layer ist read-only; die einzige Wegweiser-Korrektur ist „Bürgeramt / eWA". Stammdaten V1 hat das schon im Anschrift-Sektion, V1.1 braucht **keine zweite Postanschrift-Card im Kontakt-Layer** — sondern einen Cross-Reference-Pointer.

## DSGVO Art. 13/14 — Pflicht-Transparenz bei Kontaktdaten-Erhebung
- Art. 13 DSGVO bei Direkterhebung (z.B. Bürger:in trägt E-Mail in Stammdaten ein): Verantwortlicher, DSB, Zweck, Rechtsgrundlage, Empfänger, Drittland-Übermittlung, Speicherdauer, Betroffenenrechte[^dsgvo-13].
- Art. 14 DSGVO bei Indirekterhebung (z.B. Postanschrift wurde aus Melderegister synchronisiert): zusätzlich Quelle der Daten[^dsgvo-14].
- Bei Behörden gilt: ohne Pflicht-Information ist Verarbeitung formal rechtswidrig[^dsgvo-13].
- → **Implikation V1.1**: Jede Kanal-Card muss Disclaimer-Marker tragen. Jeder Erhebungs-Akt (z.B. „E-Mail bestätigen") muss vor dem Speichern Art. 13-Hinweis zeigen. Wir haben das Disclaimer-Pattern aus V1 schon (Disclaimer-Marker mit Art-9-Hinweis-Badge); V1.1 dehnt es aus.

## eIDAS 2 / EUDI-Wallet — kommt 2026/27, aber kein Notification-Kanal-Standard
- Commission Implementing Regulation (EU) 2024/2980 (28.11.2024): Notifikations-Regeln im Wallet-Ökosystem zwischen Mitgliedstaaten und Kommission, **nicht zwischen Behörde und Bürger:in**[^eidas-2024-2980].
- Commission Implementing Regulation (EU) 2025/848: Pflicht-Infos für Wallet-Relying-Parties an nationale Register[^eidas-relying-party].
- PID-Schema (ARF 2.x) listet Pflicht- und optionale Personenattribute (Name, Vorname, Geburtsdatum, Geburtsort, …); **es gibt KEIN standardisiertes Pflicht-Attribut „verifizierte E-Mail" oder „verifizierte Mobilnummer"** im PID-Rulebook[^pid-rulebook]. Mitgliedsstaaten dürfen domestic namespaces erweitern (z.B. SteuerID, KVNR).
- → **Implikation V1.1**: Die EUDI-Wallet bringt 2026/27 KEIN „Behörde→Bürger:in"-Push-Channel mit — sie ist Identity-Provider + Attestation-Träger, kein Messaging-Layer. Das BundID-Postfach bleibt in DE der einzig nationale Notification-Layer. **V1.1 darf hier nichts überversprechen.**

# Existing-Register-Layer — Wo liegen Kontakt-Daten heute?

| Datum | Authoritative Quelle | Status 2026 | Sync zu BundID |
|---|---|---|---|
| Postanschrift (Wohnort) | Melderegister (§ 3 BMG, kommunal)[^bmg-3] | authoritative | bei eID-Login einmalig übernommen, kein Re-Sync ohne Bürger-Aktion |
| E-Mail | **keine staatliche Quelle** (selbst-attestiert in BundID, optional in Provider-Konten wie ELSTER) | self-attested + verified-by-link | BundID stellt Verifizierungs-Mail beim Erstellen[^bundid-faq] |
| Mobilfunknummer | **keine staatliche Quelle** (selbst-attestiert in BundID, optional als 2FA bei Steuerportal/Familienportal) | self-attested, optional | BundID-Felder zeigen sie „freiwillig"[^bundid-felder] |
| DE-Mail-Adresse | DE-Mail-Anbieter (FP-DBS letzter, schliesst 31.12.2026)[^demail-techbook] | aussterbend | nicht relevant — Verwaltung seit 31.08.2024 nicht mehr nutzend[^demail-shutdown] |
| BundID-Postfach | BundID selbst — kein authoritative-externes Register | aktiv, aber **opt-in pro Account** | trivial (ist BundID-eigenes Feature) |
| eAT-CAN / Aufenthaltstitel-Korrespondenzfeld | AZR, Ausländerbehörde lokal | authoritative | nicht über BundID |

**Schlüssel-Befund**: Es gibt in DE **keine zentrale „authoritative E-Mail/Telefonnummer"-Datenbank** wie bei Anschrift via Melderegister. Jeder Bürger hat eine BundID-E-Mail (verified-by-link), aber Drittbehörden haben darauf keinen direkten Read-Zugang — sie schicken nur „Sie haben Post im Postfach"-Notification AN diese E-Mail.

# Echte Behörden-Prozesse — wer nutzt welchen Kanal?

| Kanal | Wer nutzt es | Pflicht oder opt-in? |
|---|---|---|
| **Postbrief** | Default für Bescheide, weil rechtssicher (§ 41 Abs. 2 VwVfG: Zugang fingiert nach 4 Tagen) | Default-Fallback, kein Opt-out möglich, solange Postfach nicht aktiv |
| **BundID-Postfach** | Behörden mit BundID-Anbindung (über 1.600 Onlinedienste 2026)[^bundid-vertrauensniveau]; Bekanntgabe rechtsverbindlich nach § 41 Abs. 2a VwVfG | opt-in, mit Postfach-Aktivierung + Einwilligung |
| **E-Mail (klartext)** | Bürger-Anfragen, informatorisch, **nie Verwaltungsakt-Bekanntgabe** wegen § 41 VwVfG-Form | informatorisch, Bürger:in initiiert |
| **SMS/mTAN** | ELSTER (mTAN als 2FA), Familienportal/Familienkasse-Online (TAN-Verifikation), einige Bundesländer-Onboarding | nur Authentifizierung, nie Verwaltungsakt |
| **App-Push** | IO-App (IT) ist Vorbild — DE: BundID hat **noch keinen produktiven Push-Channel auf Mobile-App-Ebene**, nur E-Mail-Notification dass Postfach-Nachricht eingegangen ist[^bundid-push] |
| **DE-Mail** | Quasi tot — Verwaltung nutzt seit 31.08.2024 nicht mehr; Service endet 31.12.2026[^demail-techbook] |
| **Telefon** | Bürgerservice 115, Behörden-Hotline; primär Inbound vom Bürger | informatorisch, kein Bescheid |

**Kernerkenntnis**: 2026/27 hat DE **keinen App-Push-Channel** auf BundID-Niveau. Die einzige offizielle Notification-Mechanik ist **„E-Mail an die hinterlegte Adresse, wenn Postfach-Nachricht eingegangen"**[^bundid-push]. Das ist der Stand, den V1.1 abbilden muss — und gleichzeitig die Lücke, die unsere Speculative-2027-Vision schliessen darf (mit Disclaimer).

# Auto-fill-Möglichkeiten aus existing Stammdaten V1

Was V1 schon hat (und V1.1 daher nicht neu erheben muss):

- **Postanschrift** (Anschrift-Sektion, eWA-Pointer, Korrekturweg)
- **Mobilfunk?** — V1 listet sie nicht als eigenes Feld
- **E-Mail?** — V1 listet sie nicht als eigenes Feld
- **BundID-Postfach-Status?** — nicht in V1 sichtbar

Was V1.1 NEU sichtbar machen muss:

1. **Verifizierte BundID-E-Mail** (Default-Notification-Adresse für Postfach-Eingänge)
2. **Optionale Mobilfunknummer** (für 2FA + zukünftige SMS-Notification)
3. **Postfach-Status** (aktiv / nicht aktiv / teilaktiviert) inkl. Einwilligungs-Toggle für § 41 Abs. 2a VwVfG
4. **Notification-Präferenzen pro Vorgangs-Typ** (welcher Kanal: Postfach, E-Mail, Brief, SMS — pro Behörde-Kategorie)
5. **EUDI-Wallet-Verknüpfung** als Sub-Tab (nur Read, mit Speculative-2027-Disclaimer — wir haben das Pattern in V1 schon)

# Prior Art — Was machen andere Länder?

## UK — gov.uk Notify (zentraler Notification-Hub)
- Zentraler Service der GDS (Government Digital Service): E-Mail, SMS, **physischer Brief** (Print-and-Mail) aus einer einzigen API[^govuk-notify-features][^govuk-notify-using].
- Über 12 Mrd. Nachrichten versendet seit 2016 (Stand 2025)[^govuk-notify].
- Zugang nur für central government, local authorities, NHS — kein Bürger-zu-Behörde-Channel.
- **UX-Pattern für uns**: Behörden setzen Templates (mit gov.uk-Branding); Bürger erhalten konsistente E-Mail/SMS-Stimme über alle Behörden. Kein „jede Behörde gestaltet selbst" — das ist die De-facto-Realität in DE und der Hauptgrund für Wahrnehmung „chaotisch".

## Estland — eesti.ee
- Jeder Bürger erhält bei ID-Card-Ausstellung automatisch eine `vorname.nachname@eesti.ee`-Adresse, die Mails an bis zu 5 reale E-Mails weiterleitet[^eesti-email].
- Mobile-ID + Smart-ID als Verifikations-Mechanismus (separate Smart-Cards, nicht auf SIM gebunden)[^eesti-mobileid].
- Bürger kann in eesti.ee-Portal Notification-Vorlieben (E-Mail-Adressen) selbst pflegen[^eesti-mobileid].
- **UX-Pattern für uns**: „Forwarding"-Modell — staatlicher Identifier (`@eesti.ee`-Adresse) ist konstant, persönliche Mail-Adressen wechseln, der Bürger kontrolliert.

## Dänemark — Digital Post (borger.dk)
- **100 % obligatorisch** seit 2014 für alle Bürger ≥ 15 J.; Befreiung nur in Härtefällen[^dk-mandatory].
- MitID (3. Generation 2022) als Login; SMS- und E-Mail-Notification konfigurierbar (SMS 10–18 Uhr, E-Mail 8–18 Uhr)[^dk-notifications].
- Resultat: Dänemark global Top in OECD-DGI-Index[^dk-leader].
- **UX-Pattern für uns**: explizite Notification-Zeitfenster (nicht 24/7 SMS) als Bürger-Schutz vor Überstimulation. Pflicht-Modell ist für DE politisch vermutlich chancenlos — wir bleiben bei opt-in.

## Niederlande — MijnOverheid + Berichtenbox + DigiD-App
- Berichtenbox (zentraler Posteingang) öffnet sich nur, wenn die DigiD-App auf demselben Gerät installiert ist; PIN-Code der DigiD-App entsperrt Berichtenbox[^nl-berichtenbox].
- Push-Notification über Mobile-OS (iOS/Android) → „Sie haben neue Post" — Folge: weniger verpasste Behördenpost[^nl-berichtenbox].
- E-Mail-Notification optional, in „Instellingen" konfigurierbar[^nl-berichtenbox].
- DigiD: 550 Mio. Logins 2024[^nl-digid].
- **UX-Pattern für uns**: Push-via-existing-Identity-App (DigiD = unser BundID-App-Äquivalent). Das ist genau das Pattern, das BundID 2026/27 erst aufbauen müsste; es existiert noch nicht produktiv. **Speculative-2027-Vision-Material für unsere Demo.**

## Frankreich — FranceConnect+
- FranceConnect+ seit Anfang 2025 mit verstärkter 2FA-Stufe[^fc-plus].
- Identity-Pivot liefert: Geburtsname, Vornamen, Geschlecht, Geburtsdatum, Geburtsort + **verifizierte E-Mail** vom Identitäts-Provider[^fc-attributes].
- Ab April 2025: Aufenthaltstitel-Verlängerung und Einbürgerung **erfordern FranceConnect+**[^fc-plus].
- **UX-Pattern für uns**: E-Mail wird als Identity-Attribut behandelt, nicht als Profil-Feld — das macht „verifizierte E-Mail" zu einem strukturellen Bestandteil der Identität, nicht zu einer Profile-Setting-Option.

## Italien — IO-App
- Zentrale App-First-Strategie; Login mit SPID oder CIE; Push-Notifications direkt aus dem OS[^it-io-app].
- IO-App ist „one-stop shop" für Behörden-Nachrichten + PagoPA-Zahlungen + Bürgerbonus-Verwaltung[^it-io-app].
- SPID wird in 2-3 Jahren auslaufen, CIE bleibt als einzige Identity[^it-spid-phaseout].
- **UX-Pattern für uns**: konsolidierter Mobile-First-Ansatz. DE wäre weit davon entfernt, aber als Nordstern-Vision für 2027 sehr brauchbar.

# BundID / DeutschlandID / EUDI Integration Points

## Was BundID *heute* (2026) wirklich kann
- Verifikation einer **E-Mail-Adresse** beim Account-Anlegen via Bestätigungslink[^bundid-faq].
- Optional: **Telefonnummer** als freiwilliges Feld[^bundid-felder].
- Postanschrift wird aus eID übernommen (bei Vertrauensniveau „hoch") oder freiwillig eingetragen[^bundid-felder].
- **Postfach** speichert Behörden-Bescheide; Bürger:in wird per E-Mail an die hinterlegte Adresse benachrichtigt, wenn neue Nachricht eingeht[^bundid-push].
- 3 Vertrauensniveaus: Basisregistrierung (Username/Passwort, 720 Min Session), Substanziell (ELSTER-Zertifikat, 120 Min Session), Hoch (eID Online-Ausweis, 30 Min Session)[^bundid-vertrauensniveau].
- Über 1.600 Online-Dienste integriert (Stand 2026)[^bundid-vertrauensniveau].

## Was 2026/27 NEU kommt
- **Bidirektionale Kommunikation 2026**: Rückfragen der Verwaltung + Nachreichung über BundID[^bundid-bidirectional].
- **Datenschutzcockpit-Integration in BundID** (geplant, schrittweise; nächste Stufe 11/2025 + 05/2026)[^datenschutzcockpit-2026].
- **DeutschlandID** (Rebranding nach OZG § 12, Datum offen, abhängig von Funktionsausbau)[^wikipedia-bundid].
- **EUDI-Wallet** Ende 2026 mindestens 1 Wallet pro Mitgliedstaat[^eudi-rollout]; PID-Schema ohne native Contact-Channel-Attribute[^pid-rulebook].

## Was V1.1 daher hypothetisieren darf (mit Speculative-Marker)
- **App-Push-Channel** über BundID-App (heute nicht produktiv — könnte 2027 kommen, vgl. NL/IT-Pattern). → Disclaimer-Marker `bundid_push_speculative`.
- **EUDI-Wallet-Push** über Wallet-Notification-API — heute kein eIDAS-2-Standard. → Disclaimer-Marker `eudi_push_speculative`.
- **Cross-Channel-Routing** (Bürger:in: „bei Steuersachen will ich E-Mail, bei Aufenthalt SMS, bei Standesamt Brief") — heute nicht möglich, wäre echte UX-Innovation. → Speculative, aber demonstrierbar.

# Empfohlener Scope V1.1 (Vorschlag, lock muss product-architect setzen)

## Sektionen

1. **Sektion „Kontakt-Kanäle"** (zwischen V1-Sektion „Anschrift" und „Familie")
   - Card 1: **Postfach (BundID)** — Status: aktiv/nicht aktiv; Einwilligung § 41 Abs. 2a VwVfG-Toggle; Letzte Nachricht-Stempel; Cross-Link auf `/posteingang`.
   - Card 2: **Verifizierte E-Mail** — read-only (kommt aus BundID-Account); Verifikations-Status-Badge; CTA „im BundID-Konto ändern" (Wegweiser, kein Self-Edit).
   - Card 3: **Mobilfunknummer** — optional, mit Verifikations-Status (verifiziert/unverifiziert); Hinweis „nur für 2FA, nicht für Bescheid-Bekanntgabe"; Self-Edit erlaubt (kein hoheitliches Register hält dies).
   - Card 4: **Postanschrift** — *Cross-Reference* zur V1-Anschrift-Sektion (kein Doppel-Display); Hinweis „Authoritative Quelle: Melderegister § 3 BMG".

2. **Sektion „Notification-Präferenzen"** (neu)
   - Pro Vorgangs-Kategorie (Bürgeramt, Finanzamt, BAMF/Ausländerbehörde, Familienkasse, Sozialleistungen, Sonstige) ein **Kanal-Vorzugs-Picker** (Postfach / E-Mail-Notification / SMS / Brief).
   - Default: Postfach + E-Mail-Notification (entspricht heutiger BundID-Realität).
   - Speculative-Marker `cross_channel_routing_speculative` an der Sektion.
   - Aktivitätsprotokoll-Eintrag bei jeder Änderung der Präferenz (Datum, Vorher/Nachher, ohne PII).

3. **Aktivitätsprotokoll-Erweiterung**
   - Neuer Event-Typ: `posteingang.eingegangen` mit Behörde + Aktenzeichen (referenziert).
   - Neuer Event-Typ: `notification.gesendet` mit Kanal (E-Mail/SMS/Push-Mock) + Empfänger-Maskierung.
   - Filter erweitern: zusätzlich „Kanal" als Filter-Dimension.

## Components-Hint (für product-architect/frontend-coder)

- `<KontaktChannelCard>` (variant: postfach | email | mobile | postanschrift-cross-ref) — analog zu V1 `<FieldCard>`.
- `<NotificationPreferencePicker>` (per Vorgangs-Kategorie) — neu.
- `<VerifizierungBadge>` (verifiziert / nicht verifiziert / abgelaufen) — neu, parallel zu V1-Behörde-Badge.
- `<ChannelStatusBadge>` (aktiv / inaktiv / teilaktiviert) — neu.
- Disclaimer-Marker neu: `bundid_push_speculative`, `eudi_push_speculative`, `cross_channel_routing_speculative` (zusätzlich zu V1-existing `eudi_speculative`, `iban_speculative`).

## Hard-Lines, die V1.1-Spec festschreiben muss

1. **DE-Mail wird NICHT als Kanal-Card gezeigt** (sterbender Service; in der Demo eher verwirrend; eventuell als „abgekündigt"-Footnote in einer Info-Box).
2. **App-Push und Cross-Channel-Routing sind speculative** — Disclaimer-Marker an JEDER Card. Keine real-erscheinenden Mock-Push-Notifications senden, die mit echten Push-Permissions kollidieren könnten.
3. **Postfach-Aktivierung ist Schreib-Operation, NICHT Self-Edit** — Aktivierung muss durch Wegweiser-Pointer auf `id.bund.de/de/postfach` führen, NICHT als Toggle in unserer App. Wir simulieren nur die *Anzeige* des Status, nicht die Aktivierung.
4. **E-Mail bleibt read-only** in V1.1 (kommt aus BundID-Konto; Änderung nur dort möglich). Self-Edit ausschliesslich für: Mobilfunk, Notification-Präferenzen, Sprachpräferenz.
5. **Kein Sozialdaten-Routing** — Krankenkasse-Notifications bleiben aus dem Notification-Layer raus (SGB X §§ 67 ff.).
6. **Mehmet-Persona-Spezial**: Aufenthaltstitel-Korrespondenz (BAMF / Ausländerbehörde) hat eigene Norm-Welt — V1.1 darf nicht suggerieren, dass die Kanal-Wahl dort bestimmt, wie der eAT-Bescheid kommt. Hard-Line: dort steht „Postanschrift" als Pflicht-Default.
7. **GDPR-Inline-Hinweise (Art. 13)** an jeder Self-Edit-Card vor dem Speichern (analog zu V1-Religion-Modal-Pattern).

# Open Questions / Risiken (für domain-expert + concept-verifier)

## Für domain-expert (Legal-Realism)
1. **Stimmt die Aussage „BundID-E-Mail ist verifiziert-by-link, aber NICHT authoritative-für-Behörde"?** — Heisst: darf eine Behörde X die BundID-E-Mail eines Bürgers für Steuerbescheid-Notification nutzen, ohne separate Einwilligung des Bürgers?
2. **§ 41 Abs. 2a VwVfG** verlangt Einwilligung. Ist die Aktivierung des BundID-Postfachs *automatisch* eine Einwilligung für ALLE Behörden, oder pro-Behörde?
3. **DEÜV-Adressfluss zur GKV** (Anschrift-Sektion V1) — gibt es ein Pendant für Kontaktdaten? Wahrscheinlich nein, aber bestätigen.
4. **Mobilfunknummer-2FA bei BundID** — ist das produktiv oder nur App-basiert via TOTP? V1.1-Mock muss korrekt sein.

## Für concept-verifier (Adversarial)
1. **Risiko 1: Notification-Präferenzen-UI suggeriert Kontrolle, die der Bürger nicht hat.** Heute kann man bei der Behörde X nicht sagen „bitte SMS statt Brief". V1.1 muss klar markieren: das ist Demo-Speculative, KEIN aktueller Status.
2. **Risiko 2: Demo-Wow-Loss.** V1 hatte den 6-Behörden-Sync-Wow. V1.1 ist reine Datenkanal-Sichtbarkeit ohne klassischen Wow-Moment. Empfehlung: Wow-Träger sollte das Aktivitätsprotokoll-Erweiterung sein („als Sie umgezogen sind, hat das System alle Notification-Adressen an die richtige Stelle gespiegelt").
3. **Risiko 3: Scope-Creep durch Notification-Präferenzen pro Behörde.** Wenn man pro Vorgangs-Typ konfigurieren kann, wird die UI schnell ein Cockpit, das niemand verstehen will. Empfehlung: max. 4-5 Kategorien (nicht pro einzelner Behörde).

## Speculative-Annahmen, die noch keiner produktiven Quelle entsprechen
- Push-Notification über BundID-App (NL/IT-Pattern, in DE 2026 nicht produktiv).
- Cross-Channel-Routing durch Bürger-Präferenz (kein Pendant gefunden).
- EUDI-Wallet-basiertes Messaging (eIDAS-2-Implementing-Acts adressieren dies nicht).
- Notification-Routing pro Vorgangs-Typ (heute Behörden-zentriert, nicht Bürger-zentriert).

# Recommended next-step

1. **domain-expert** validiert die Legal-Annahmen (vor allem § 41 Abs. 2a VwVfG-Einwilligungs-Granularität und DSGVO-Art-13-Erforderlichkeit der Inline-Hinweise).
2. **concept-verifier** bewertet adversarisch: ist der V1.1-Scope korrekt eingehegt (Risiken 1-3) oder droht Versprechensbruch?
3. Bei PROCEED: **product-architect** schreibt Spec mit den Hard-Lines (1)-(7) als nicht-verhandelbar. Loom-Cut für V1.1 sollte den Aktivitätsprotokoll-Wow zeigen, NICHT die Notification-Präferenzen-Konfiguration.
4. Demo-Persona-Choice: **Anna** ist gut (post-Umzug, Notification-Adressen müssen mit-umziehen); **Mehmet** zeigt den BAMF-Postanschrift-Pflicht-Hard-Lock (Risiko 6).

# Sources

[^demail-shutdown]: [Bundesregierung kündigt Ende von De-Mail in der Verwaltung an — heise online](https://www.heise.de/news/Bundesregierung-kuendigt-Ende-von-De-Mail-in-der-Verwaltung-an-9180138.html) — accessed 2026-05-10
[^demail-techbook]: [De-Mail wird 2026 endgültig abgeschaltet — techbook.de](https://www.techbook.de/mobile-lifestyle/de-mail-ende) — accessed 2026-05-10
[^adhoc-bundid]: [BundID wird 2026 zum Pflichtwerkzeug für Bürger — ad-hoc-news.de](https://www.ad-hoc-news.de/boerse/news/ueberblick/bundid-wird-2026-zum-pflichtwerkzeug-fuer-buerger/68444056) — accessed 2026-05-10
[^eudi-rollout]: [eIDAS 2.0 Digital Identity Wallet: Compliance 2026 — Yousign](https://yousign.com/blog/eidas-2-0-digital-identity-wallet-compliance-requirements) — accessed 2026-05-10
[^wikipedia-bundid]: [BundID — Wikipedia](https://de.wikipedia.org/wiki/BundID) — accessed 2026-05-10
[^d21-monitor25]: [eGovernment MONITOR 2025 — Initiative D21](https://initiatived21.de/publikationen/egovernment-monitor/2025) — accessed 2026-05-10
[^bitkom-digital]: [Drei von vier Deutschen wollen digital mit Behörden kommunizieren — Bitkom](https://www.bitkom.org/Presse/Presseinformation/Deutsche-wollen-digital-mit-Behoerden-kommunizieren) — accessed 2026-05-10
[^ozg2-bundesrat]: [Vermittlungsverfahren zum Onlinezugangsgesetz abgeschlossen — Bundesrat](https://www.bundesrat.de/SharedDocs/pm/2024/020.html) — accessed 2026-05-10
[^ozg2-cosinex]: [OZG-Änderungsgesetz durchläuft Vermittlungsausschuss — cosinex Blog](https://blog.cosinex.de/2024/06/14/vermittlungsausschuss-beschliesst-onlinezugangsgesetz-2-0/) — accessed 2026-05-10
[^ozg2-digitale-verwaltung]: [OZG-Änderungsgesetz: Paket für die digitale Verwaltung — digitale-verwaltung.de](https://www.digitale-verwaltung.de/Webs/DV/DE/onlinezugangsgesetz/das-gesetz/ozg-aenderungsgesetz/ozg-aenderungsgesetz-node.html) — accessed 2026-05-10
[^ozg2-bundesdruckerei]: [Onlinezugangsgesetz (OZG) 2.0 — Bundesdruckerei](https://www.bundesdruckerei.de/de/innovation-hub/ozg-2-0-fakten-zum-onlinezugangsgesetz) — accessed 2026-05-10
[^vwvfg-41]: [§ 41 VwVfG — gesetze-im-internet.de](https://www.gesetze-im-internet.de/vwvfg/__41.html) — accessed 2026-05-10
[^bmg-3]: [§ 3 BMG Speicherung von Daten — gesetze-im-internet.de](https://www.gesetze-im-internet.de/bmg/__3.html) — accessed 2026-05-10
[^dsgvo-13]: [Art. 13 DSGVO — dsgvo-gesetz.de](https://dsgvo-gesetz.de/art-13-dsgvo/) — accessed 2026-05-10
[^dsgvo-14]: [Transparenz- und Informationspflichten Art. 13/14 DSGVO — LfD Niedersachsen](https://www.lfd.niedersachsen.de/startseite/wir_uber_uns/informationspflichten_nach_der_dsgvo/transparenz-und-informationspflichten-nach-artikel-13-und-artikel-14-datenschutz-grundverordnung-164720.html) — accessed 2026-05-10
[^eidas-2024-2980]: [eIDAS Implementing Acts — Entrust](https://www.entrust.com/resources/learn/eidas-implementing-acts) — accessed 2026-05-10
[^eidas-relying-party]: [Understanding Relying Party Obligations Under eIDAS 2.0 — eID Easy](https://www.eideasy.com/blog/eid-easy-conversations-relying-party-eidas-2-0) — accessed 2026-05-10
[^pid-rulebook]: [ANNEX 3.1 — PID Rulebook — EUDI Wallet](https://eu-digital-identity-wallet.github.io/eudi-doc-architecture-and-reference-framework/1.4.0/annexes/annex-3/annex-3.01-pid-rulebook/) — accessed 2026-05-10
[^bundid-faq]: [Hilfreiche Informationen — BundID FAQ](https://id.bund.de/de/faq) — accessed 2026-05-10
[^bundid-felder]: [BundID — Anwenderdokumentation MACH formsolutions](https://wiki.form-solutions.de/wiki/docwiki/view/Main/09_Schnittstellen/02_Konten/BundID/) — accessed 2026-05-10
[^bundid-vertrauensniveau]: [The "BundID": secure access to all online services — Federal Employment Agency](https://www.arbeitsagentur.de/en/bundid) — accessed 2026-05-10
[^bundid-push]: [BundID — Bundesportal Postfach Notification](https://id.bund.de/de) — accessed 2026-05-10
[^bundid-bidirectional]: [BundID wird 2026 zum Pflichtwerkzeug — ad-hoc-news.de](https://www.ad-hoc-news.de/boerse/news/ueberblick/bundid-wird-2026-zum-pflichtwerkzeug-fuer-buerger/68444056) — accessed 2026-05-10
[^datenschutzcockpit-2026]: [Registermodernisierungsgesetz — d.velop](https://www.d-velop.de/blog/compliance/registermodernisierungsgesetz/) — accessed 2026-05-10
[^govuk-notify]: [GOV.UK Notify — UK Government](https://www.notifications.service.gov.uk/) — accessed 2026-05-10
[^govuk-notify-features]: [Features — GOV.UK Notify](https://www.notifications.service.gov.uk/features) — accessed 2026-05-10
[^govuk-notify-using]: [Using Notify — GOV.UK Notify](https://www.notifications.service.gov.uk/using-notify) — accessed 2026-05-10
[^eesti-email]: [@eesti.ee e-mail address — ID.ee](https://www.id.ee/en/article/eesti-ee-e-mail-address/) — accessed 2026-05-10
[^eesti-mobileid]: [State Portal eesti.ee — ID.ee](https://www.id.ee/en/article/state-portal-eesti-ee/) — accessed 2026-05-10
[^dk-mandatory]: [Digital Post — Lifeindenmark.dk](https://lifeindenmark.borger.dk/apps-and-digital-services/Digital-Post) — accessed 2026-05-10
[^dk-notifications]: [Om Digital Post — borger.dk](https://www.borger.dk/hjaelp-og-vejledning/hvad-har-du-brug-for-hjaelp-til/digital-post/Post) — accessed 2026-05-10
[^dk-leader]: [How Denmark Became a Digital Government Global Leader — Queue-it](https://queue-it.com/blog/government-digital-transformation-denmark/) — accessed 2026-05-10
[^nl-berichtenbox]: [Berichtenbox — Apps on Google Play](https://play.google.com/store/apps/details?id=nl.rijksoverheid.mbb.pub) — accessed 2026-05-10
[^nl-digid]: [Gebruik DigiD stijgt naar 550 miljoen inlogs in 2024 — Digitale Overheid](https://www.digitaleoverheid.nl/nieuws/gebruik-digid-stijgt-naar-550-miljoen-inlogs-in-2024/) — accessed 2026-05-10
[^fc-plus]: [Securing online approaches: FranceConnect+ integrates France Identity — Service Public](https://www.service-public.gouv.fr/particuliers/actualites/A17558?lang=en) — accessed 2026-05-10
[^fc-attributes]: [API FranceConnect — data.gouv.fr](https://www.data.gouv.fr/dataservices/api-franceconnect) — accessed 2026-05-10
[^it-io-app]: [How to use the IO app for Italian government services — facil.guide](https://facil.guide/en/guide/use-io-app/) — accessed 2026-05-10
[^it-spid-phaseout]: [Italy pushes citizens to adopt CIE as SPID digital ID is phased out — Biometric Update](https://www.biometricupdate.com/202604/italy-pushes-citizens-to-adopt-cie-as-spid-digital-id-is-phased-out) — accessed 2026-05-10
