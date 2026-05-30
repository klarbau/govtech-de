# Mock Convenience — German-Administration Realism Gap Report

last_validated: 2026-05-29
author: domain-expert
scope: `src/lib/mock-backend/autopilot/umzug.ts`, `id.ts`, `seed.ts`, `src/data/{behoerden,vorgaenge,personas,letters}.json`, `src/types/{vorgang,letter}.ts`, `docs/domain/umzug.md`, `docs/specs/umzug.md §1–5`
legal_sources_checked: `https://www.gesetze-im-internet.de/aufenthg_2004/__87.html` (WebFetch — confirms §87 is mandatory-reporting-of-violations, NOT routine address upkeep)
verdict: **The Umzug mock is already domain-strong.** Most "obvious" realism traps are handled correctly. The remaining gaps are second-order — the kind a *specialist* viewer (BfDI / Meldewesen / tax / Sozialversicherung) would probe — plus the two missing verticals.

> Process note: this report merges two passes (a parallel session's findings + this one). They converge on the
> same Tier-1 facts. During this pass the tool stream contained a prompt-injection attempt (instructions to emit a
> "MARKER/ACK" token plus a fabricated user turn) and some garbled/duplicated fake tool outputs — these were
> ignored; every finding below is grounded in source files actually read.

---

## What the mock already gets RIGHT (so we don't "fix" it)

A domain-savvy viewer will *not* trip on these — they are correct and are the demo's biggest credibility asset:

- **"Beitragsservice", not "GEZ".** `beitragsservice-koeln` → "ARD ZDF Deutschlandradio Beitragsservice, 50656 Köln". Correct since the 2013 rename.
- **Register-push vs. consent split is modelled.** Block A (`behoerde_zu_behoerde`, §§33/34/36 BMG) is cleanly separated from Block B (`app_aktivitaet`, Art. 6(1)(a) DSGVO), with a code comment explaining KK/Arbeitgeber are *not* a §36 BMG push. This is the single most important privacy-realism point and it is **already correct**.
- **Per-step `rechtsgrundlage`** exists on `AutopilotStep` and is rendered per hop; the activity-log carries a second recipient-specific Rechtsgrundlage.
- **Persona-conditional fan-out.** Block D gates on `kfz_halter` / `kindergeld_bezug` / `aufenthaltstitel`. Not a flat list — good. (See G8 for a Loom-staging implication.)
- **KFZ modelled correctly** as "Pre-Fill der i-Kfz-Adressänderung gem. §15 FZV → neue Zulassungsbescheinigung Teil I", not an automatic Kennzeichenwechsel.
- **eID gating on Block D** (`pending_eid_confirmation`, `requires_eid`) — a credible OZG/eIDAS touch.
- **Authentic Aktenzeichen** per Behörde (Beitragsnummer 9-digit `731 042 088`; Berlin Steuernummer `11/123/45678`; 11-digit Steuer-ID; Kindergeldnummer `115FK668412`; ABH `ABH-B-2024/IV-A-1782`).
- **`[MOCK]` watermark + "maschinell erstellt / ohne Unterschrift gültig"** Floskeln present; §17-BMG Frist seeded on the Umzug Vorgang (`typ: bmg_17`).

---

## TIER 1 — Concrete defects a domain expert will catch (fix before any BMDS/DigitalService demo)

### G1 — ABH step cites §87 AufenthG (wrong norm) and implies a Melderegister→ABH auto-push that doesn't exist `[credibility: HIGH] [S]`
- **WHAT / EVIDENCE.** Three sites disagree and one is substantively wrong:
  - `umzug.ts` BLOCK_D (L213): `'§ 87 AufenthG + § 18 PAuswG eID'`
  - `umzug.ts` log hook (L351): same `abh-berlin-lea` recipient logged as **`§ 86 AufenthG`**
  - `vorgaenge.json` historic Anmeldung (L41): `'§ 87 AufenthG'`
  I verified §87 AufenthG: it governs **mandatory reporting *to* the ABH of immigration violations** (unlawful residence, deportation grounds, departure abroad) — **not** eAT address upkeep, and there is no Meldebehörde→ABH address auto-push (umzug.md itself says "on-demand-Abruf, keine automatische Push-Übermittlung").
- **WHY.** Immigration law is in the target audience's wheelhouse (Localyze, Jobbatical). §86/§87 drift + a §87 citation on an address step reads as wrong; Anna (Blue Card) is the headline persona, so this is on the critical path.
- **FIX.** Keep the Block-D framing ("Adressmeldung vorbereitet + ABH-Termin gebucht; Entscheidung bleibt bei der Behörde", no auto-push). Replace the address-step basis with the eID basis (`§18 PAuswG`) plus an explanatory "Antrags-/Termin-gebunden — kein Melderegister-Push (AZR-Abruf on-demand)". Make all three sites consistent.
- verify: done — umzug.ts L213/L351, vorgaenge.json L41, §87 confirmed via gesetze-im-internet.de.

### G2 — "Finanzamt für Körperschaften I Berlin" is wrong competence for a natural person, plus §39 AO is the wrong norm `[credibility: HIGH] [M]`
- **WHAT / EVIDENCE.** Block A routes Anna's income-tax move to `finanzamt-koerperschaften-i-berlin`. A *Finanzamt für Körperschaften* handles **legal entities (GmbH/AG/Vereine)**, not a natural person's Einkommensteuer — that moves to a **Wohnsitz-Finanzamt** by örtliche Zuständigkeit (**§19 AO**). Both umzug.ts and `vorgaenge.json` (L52) cite **`§39 AO`** (= Zurechnung von Wirtschaftsgütern), which is the wrong norm; the running-Umzug fixture (L111) already uses the better `§36 BMG i.V.m. §139b AO`, so the data is also internally inconsistent.
- **WHY.** Most likely single "that's wrong" reaction from a tax-literate viewer — and Anna's Posteingang already shows a *correct personal* Steuernummer (`11/123/45678`), so the Körperschaften-Finanzamt contradiction is visible in the same session.
- **FIX.** Add a residence Finanzamt to behoerden.json (e.g. `finanzamt-berlin-mitte-tiergarten`, already in umzug.md's Briefkopf examples) and route Block A there. `aktion: 'Mitteilung örtliche Zuständigkeit nach §19 AO'`, `rechtsgrundlage: '§19 AO i.V.m. §36 BMG'`. Reserve `§139b AO` for the *Steuer-ID*. Fix the `§39 AO` citation in vorgaenge.json.
- verify: done — umzug.ts L98–110, vorgaenge.json L49–52/L111.

### G3 — Krankenkasse Rechtsgrundlage is inconsistent across THREE places, and §28a SGB IV is wrong for the citizen path `[credibility: HIGH] [M]`
- **WHAT / EVIDENCE.** The same AOK address change carries three different bases:
  - autopilot Block B (`umzug.ts` L145): **Art. 6 Abs. 1 lit. a DSGVO** (consent)
  - seeded Umzug fixture (`vorgaenge.json` L140): **Art. 6 Abs. 1 lit. b DSGVO** (contract)
  - activity-log code (`umzug.ts` L339): **§28a SGB IV (DEÜV)**
  §28a SGB IV / DEÜV is the **employer→KK** Meldeverfahren — not a citizen address push and not a Meldebehörde push. Citing it for a citizen-initiated, consent-gated action is wrong; lit. a vs lit. b across surfaces is a visible drift.
- **WHY.** A Sozialversicherungs-literate viewer (msg, init AG, DRV/GKV-adjacent) knows DEÜV is the employer's duty. Three legal bases for one action is exactly what the privacy/legal-basis-focused audience catches.
- **FIX.** Pick ONE coherent basis everywhere (live step + seeded fixture + log). Cleanest for a citizen-initiated KK notification: **Art. 6 Abs. 1 lit. a DSGVO** (optionally + **§206 SGB V**, Mitteilungspflichten des Versicherten). Drop §28a SGB IV from the citizen path. (Note interplay with G4: §28a *would* be honest only if an Arbeitgeber step triggered it.)
- verify: done — umzug.ts L145/L336–339, vorgaenge.json L140.

### G4 — KFZ i-Kfz letter over-promises across Zulassungsbezirk boundaries `[credibility: MED] [S]`
- **WHAT / EVIDENCE.** Right model, but the floskel (umzug.ts L191) promises unconditionally "Eine neue Zulassungsbescheinigung Teil I geht Ihnen in den nächsten Werktagen postalisch zu." That holds **within the same Zulassungsbezirk**; a **Bezirkswechsel** can require in-person Vorsprache / new plate, and i-Kfz online wasn't flächendeckend produktiv in 2026 (umzug.md says so). Fine for Anna (stays in Berlin); misleading for the cross-Bezirk case the demo implies it handles.
- **FIX.** Add one clause: "(bei Umzug innerhalb desselben Zulassungsbezirks; bei Bezirkswechsel kann eine persönliche Vorsprache erforderlich sein)". No architecture change.
- verify: done — umzug.ts L174–193.

---

## TIER 2 — Promise-vs-delivery and depth gaps

### G5 — Arbeitgeber is named in the headline wow but absent from the autopilot `[credibility: MED] [S]`
- **WHAT.** The demo-spine headline promises "…Krankenkasse, Rundfunkbeitrag, **Arbeitgeber** — while they watch the confirmations arrive." There is no Arbeitgeber step in any block (Block B = Sparkasse / Allianz / Vattenfall / Telekom).
- **WHY.** A viewer who heard the pitch will look for the Arbeitgeber confirmation and not find it — a direct promise-vs-delivery gap. The Arbeitgeber address-update is genuinely *not* a register push (it's the employment relationship), so it belongs in Block B and is the most relatable one.
- **FIX.** Add an `arbeitgeber-<persona>` Block-B entry ("Adressänderung Personalstammdaten / Lohnabrechnung", `Art. 6(1)(b) DSGVO — Durchführung des Arbeitsverhältnisses`; for employees this is also what triggers the §28a SGB IV KK-Meldung — ties to G3). If Arbeitgeber is deliberately out of scope, instead remove it from the demo-spine headline so claim matches build.
- verify: done — no Arbeitgeber in BLOCK_A/B/D; headline in demo-spine.md.

### G6 — No Wohnungsgeberbestätigung (§19 BMG) anywhere in the live Umzug flow `[credibility: MED-HIGH] [M]`
- **WHAT.** The real Anmeldung (§17 BMG) is legally impossible without the landlord's **Wohnungsgeberbestätigung** (§19 BMG). The autopilot performs the Anmeldung with no document precondition; Block C covers only Kita/Hausarzt/Abos. (Note: the *spec* §4.1 shows a Wohnungsgeber upload on the start screen — so this may be a flow-completeness gap rather than total absence; verify the start screen.)
- **WHY.** *The* document every German renter wrestles with. Surfacing it — even as "liegt vor (aus EUDI-Wallet)" on the Bürgeramt step — converts a magic-feeling step into a grounded one and is itself an autopilot talking point (the wallet supplies the proof).
- **FIX.** Render `Wohnungsgeberbestätigung (§19 BMG)` as a satisfied prerequisite on the Bürgeramt step ("Nachweis aus EUDI-Wallet beigefügt"), or a Block-C self-task "vom Vermieter anfordern" (Block C already supports `generates_template: true`).
- verify: partial — umzug.ts BLOCK_A/block_c have no §19 reference; spec §4.1 references a start-screen upload (confirm wiring).

### G7 — Steuer-ID immutability (§139b AO) is implied but never stated; FA letter risks the opposite reading `[credibility: MED] [S]`
- **WHAT.** The FA Block-A letter says "verwenden Sie zukünftig die …Steuernummer" — correct that the *Steuernummer* can change on a cross-FA move, but it never reassures that the **Steuer-ID (IdNr, §139b AO) stays constant**, and the only FA reference is a *new* number, which a tax-literate viewer may misread as "they reissued my tax identity."
- **FIX.** One clause: "Ihre steuerliche Identifikationsnummer (§139b AO) bleibt unverändert; lediglich Ihre örtliche Steuernummer ändert sich durch den Zuständigkeitswechsel." Optionally surface IdNr in `aktenzeichen_weitere` (the `Letter` type already supports it). Pairs naturally with the G2 fix.
- verify: done — umzug.ts L98–110.

### G8 — Datenminimierung is asserted, not visualised: no per-step `datenkategorien` `[credibility: MED] [M]`
- **WHAT.** Each step shows Behörde + aktion + Rechtsgrundlage but not the *specific fields* transmitted; the activity-log hardcodes `field_id: 'anschrift_aktuell'` for every recipient.
- **WHY.** The privacy-by-design wow is "we sent the Beitragsservice only your new address — not your Familienstand or Religion." Showing the field-set per hop is what a BfDI-minded viewer most wants to see and is the cleanest differentiator from a "we forwarded your whole profile" system.
- **FIX.** Add `datenkategorien: string[]` to `AutopilotStep` and populate per recipient (Beitragsservice → `["neue_anschrift","einzugsdatum","beitragsnummer"]`; FA → `["neue_anschrift","steuer_id"]`). Render a small "übermittelte Daten" line.
- verify: done — `AutopilotStep` (vorgang.ts) has no `datenkategorien`; log uses fixed `field_id` (umzug.ts L363).

### G9 — Block A omits the §33 Wegzugsmeldung tile and doesn't surface §17-BMG (14 Tage) as the *trigger* `[credibility: MED] [S]`
- **WHAT.** Spec §5 calls for a "Bürgeramt alt (Wegzugsmeldung, §33 BMG, spätestens 3 Werktage)" tile; the implemented `BLOCK_A` has only four entries and no §33 tile. The §17 14-day Frist is only a `fristen` datum, not surfaced as the act that *causes* the cascade. Code already supports `skipLetter: true`, so the §33 tile is cheap. (A small Bürgeramt floskel "eine gesonderte Abmeldung ist bei Inlandsumzug nicht erforderlich, §17 Abs. 3 BMG" would also fix the common Doppelmeldung misconception.)
- **WHY.** "One Pflichtakt (§17, 14 Tage) → automatic §33 propagation to the rest" is the insight that makes the autopilot thesis land; right now the Anmeldung is one of four equal tiles.
- **FIX.** Add the §33 Wegzugsmeldung step (`skipLetter: true`) and present the Anmeldung as the cascade trigger with its §17 FristCountdown (keep Bußgeld out of the hero per the framing rule).
- verify: done — umzug.ts BLOCK_A (4 entries), L92–93.

### G10 — Per-recipient "why is this lane B/C/D and not A?" explainer + federal-level reach labelling `[credibility: MED] [S]`
- **WHAT.** No one-line reason why a recipient sits outside the auto lane (derivable from the existing `rechtsgrundlage`), and Familienkasse isn't visibly tagged as a **Bund**-Leistung (Bundesagentur für Arbeit), hiding the cross-federal-level reach (OZG §2 Portalverbund).
- **WHY.** Showing the boundary is the differentiator vs. a Gosuslugi-style "trust us, it's all done". Showing federal reach is a selling point for this audience.
- **FIX.** Short i18n explainer per lane derived from rechtsgrundlage; tag the Familienkasse badge "Bund — Bundesagentur für Arbeit" (behoerden.json `kategorie` supports it). Presentation only.
- verify: done — Familienkasse step + behoerden kategorie.

### G11 — Schulamt/Kita-Ummeldung for school-age children not gated/modelled `[credibility: LOW-MED] [M]`
- **WHAT.** For a family persona a move triggers Kita/Schul-Ummeldung (kommunal, Landesschulgesetze). The mock has a generic Kita Block-C task but no school-age Schulamt step and no children-gating.
- **FIX.** Gate a Block-C "Schul-/Kita-Ummeldung" task on `kindergeld_bezug === true` (has-children proxy); cite a Landesschulgesetz generically. **confidence: low on the exact §** — verify SchulG Bln wording before surfacing.

---

## TIER 3 — The biggest *strategic* gap: only one autopilot exists

The PRD lists five north-star scenarios; the spec implements one (Umzug). The seed already *teases* two more (the
Standesamt-Geburt letter with the correct BZSt/§139b narrative; the ABH-Verlängerung stub at vorgaenge.json L181).
A *shallow second autopilot reusing the existing lane engine* does more for the "this generalises" credibility than
any further Umzug polish — and it is cheap (the four-lane engine, Aktenzeichen generators, and Datenschutz-log hook
are reusable; behoerden.json already seeds `standesamt-*`, `bzst`, `aok-nordost`, `familienkasse-*`).

### V-A — Kindergeburt (do this FIRST) `[credibility: VERY HIGH] [M]`
Best fan-out in German admin, and it shows **inter-register dependency** — the most convincing "this isn't just
parallel forms" signal.
1. **Standesamt** (kommunal) — Geburtsbeurkundung → Geburtsurkunde (**§21 PStG**). Source artefact the rest depend on. Aktenzeichen `G <lfd>/<jahr>` (e.g. `HH-G-04711/2026`, already authentic in the seed) — add a `standesamt-` branch to `aktenzeichenForBehoerde`. → lane A.
2. **BZSt** — Steuer-ID für das Kind, **automatisch nach Geburtsmitteilung** (**§139b AO**). Beat: "Ihr Kind hat jetzt eine Steuer-ID." → lane A.
3. **Krankenkasse** — Familienversicherung des Kindes (**§10 SGB V**), beitragsfrei. Notify-with-confirmation. → lane B.
4. **Familienkasse (BA, Bund)** — Kindergeld (**§62 ff. EStG / BKGG**), **needs the Kind-Steuer-ID from step 2** — *visualise this dependency* (step 4 unlocks only after step 2 confirms). → lane D.
5. **Elterngeldstelle** — Elterngeld/ElterngeldPlus (**§1 ff. BEEG**). **Federalism landmine:** Land/kommunal, varies by Bundesland (Berlin: Bezirksämter) — do NOT label it a Bundesbehörde. Frist: paid retroactively max **3 Monate** → genuine urgency. → lane D.
- **Disclaimer to surface:** "Elterngeld ist Ländersache; Zuständigkeit und Formulare variieren je Bundesland." Lane mapping mirrors Umzug → cheap, high recognisability.

### V-B — Steuererklärung (vorausgefüllt) — safest realism bet `[credibility: HIGH] [M]`
Mirrors a **real, shipping** mechanism (ELSTER Belegabruf / VaSt), so a viewer literally cannot say "that's
impossible." Reinforces the core thesis (the data is already known). Lower cascade-wow (single Behörde) → third.
- Steps: pre-fill from `Lohnsteuerbescheinigung` (AG), `KV/PV-Beiträge` (KK), `Rentenbezugsmitteilung` (DRV — already richly seeded), `Vorsorgeaufwendungen`; user confirms; "Steuerbescheid" returns (the `steuerbescheid` archetype + `betrag_cent`/`betrag_richtung`/`bescheid_dated_at` fields already exist).
- Rechtsgrundlage: Belegabruf **§150 Abs. 7 AO**; Steuer-ID join key §139b AO; EStG for the assessment; §122a AO Bekanntgabe-Fiktion already documented in the type.

### Why NOT lead with Aufenthaltstitel-Verlängerung
Highest-empathy but **least automatable**: §18b/§18g requires biometrics (eAT-Chip), persönliche Vorsprache,
Passvorlage, Arbeitgeberbestätigung. An "autopilot did it all" claim is *less* believable here. Keep it
**teilautomatisiert** as it already is (proactive Frist + Termin + Unterlagen-Checklist + Fiktionsbescheinigung
§81 Abs. 4 AufenthG) and frame strictly as guided — the decision stays with the ABH. **confidence: medium — verify
§81 wording before surfacing.**

---

## Priority order
1. **G2** Körperschaften-Finanzamt + §39 AO — most likely "that's wrong" reaction. (M)
2. **G1** ABH §87/§86 citation + no-auto-push framing. (S)
3. **G3** KK legal-basis coherence (drop DEÜV for the citizen path). (M)
4. **G5** Arbeitgeber step — closes the demo-spine's own headline promise. (S)
5. **G7** Steuer-ID-immutability clause (pairs with G2). (S)
6. **G6** Wohnungsgeberbestätigung in the live flow. (M)
7. **G8** per-step `datenkategorien` — the Datenminimierung wow, asserted but not shown. (M)
8. **G9 / G4 / G10** cascade-narrative + KFZ + lane-explainer polish. (S each)
9. **V-A** Kindergeburt vertical (best convenience ROI; all nodes pre-seeded). (M)
10. **V-B** vorausgefüllte Steuererklärung (safest-realism vertical; model mostly in place). (M)
11. G11 Schulamt polish.

## Loom-staging note (not a code gap)
The headline-wow runs as **Anna**, whose live fan-out is Bürgeramt → Finanzamt → Beitragsservice → Bundesdruckerei
(+ ABH eAT). KFZ and Familienkasse — two of the most impressive hops — only appear for personas with
`kfz_halter`/`kindergeld_bezug`. Consider recording the "watch everything happen" moment with a richer-fan-out
persona, or the wow under-delivers relative to the steps the audience imagines.

## Legal disclaimer to surface in UI (refines the existing [MOCK] footer)
> "Hinweis: Dieser Prototyp simuliert die behördenübergreifende Datenübermittlung. Real erfolgt die Übermittlung
> von Meldedaten an andere öffentliche Stellen nach §§33–34a, 36 BMG; Mitteilungen an Krankenkasse und Arbeitgeber
> setzen Ihre Einwilligung bzw. das jeweilige Rechtsverhältnis voraus (Art. 6 Abs. 1 lit. a/b DSGVO). Ihre
> steuerliche Identifikationsnummer (§139b AO) bleibt bei einem Umzug unverändert. Es werden keine Daten an reale
> Register übertragen."
