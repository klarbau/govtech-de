---
feature: posteingang-v1.5.1-rechtsbehelf-aussetzung
date: 2026-05-09
verifier: concept-verifier
verdict: REVISE
upstream:
  research: docs/research/2026-05-09-posteingang-gap-analysis.md (Idea 2 + 8)
  domain: docs/domain/posteingang-v1.5.1-rechtsbehelf-aussetzung.md (PROCEED)
inputs_reviewed:
  - docs/research/2026-05-09-posteingang-gap-analysis.md
  - docs/domain/posteingang-v1.5.1-rechtsbehelf-aussetzung.md
  - docs/domain/posteingang-v1.5-template-bodies.md
  - docs/specs/posteingang-v1.5.md
  - src/data/letters.json (18 seed letters)
  - src/lib/mock-backend/reply-templates.ts (token-resolver)
  - https://www.gesetze-im-internet.de/ao_1977/__122a.html (independent re-verify)
---

## 1. Verdict + Summary

**REVISE.** The domain lock is high-quality and the RDG-line is defensible, but the package ships a **silent semantic bug in the `{datum_letter}` token** (the Skelett's "Bescheid vom …" will print the receipt-timestamp, not the Bescheid-Erlass-date — a citizen-respectful violation in the **central Betreff** of every Einspruch). Two further mid-weight gaps need addressing before architect kicks off: a UX-bloat risk in the picker (5 templates simultaneously on Steuerbescheid + zahlung+einspruch), and a missing follow-up-Frist for the "Begründung reiche ich gesondert nach" obligation. None of the issues are RDG-fatal, but shipping as-is would create a Loom moment where Mehmet's Einspruch reads "Bescheid vom 13.05.2026" three days *after* the citizen received the letter — which is the date the app received the brief, not the date stamped on the brief. This is exactly the citizen-pain the demo is supposed to *eliminate*.

## 2. Attack-vector-by-attack-vector verdict

### 2.1 Attack-vector 1 — Familienkasse → AO (not SGG): **PASS with caveat**
Domain-expert's BFH III R 26/22 cite is correct (Kindergeld = Steuervergütung iSv § 31 EStG → AO-Verfahren). Domain's own § 10.A.2 already proposes a one-line explainer for the Familienkasse-archetype: "Kindergeld-Bescheide werden nach den Regeln der AO angefochten — nicht nach dem SGG." That explainer is **conditional in the domain doc, not yet a hard requirement**. PASS *if* product-architect makes that line a mandatory render whenever `archetype === 'familienkasse-nachweis'` AND `frist.typ === 'einspruch'`. SOFT-REVISE if architect treats it as optional.

### 2.2 Attack-vector 2 — Bayern-VwGO-Delta: **PASS — accept as named risk**
Domain-expert chose static disclaimer over PLZ-detection. Defensible because (a) the only VwGO-archetype seeded that triggers the Widerspruch-Skelett with a Bescheid is `ihk-beitrag` (Mehmet, Hamburg) — Bavaria-Klage-Pflicht does not apply to IHK-Pflichtmitgliedschafts-Beiträge in Bayern (Art. 12 BayAGVwGO carve-outs are for Sozialhilfe/Aufenthalt/Schulrecht primarily); (b) the only ABH-archetype seeded is a Mitwirkungs-Aufforderung (`letter-abh-erinnerung-verlaengerung`, frist.typ === 'antragstellung'/'nachweis'), which Visibility-Matrix § 5 row 11 correctly **excludes** from the Skelett. So no Bavaria-resident persona today actually sees a Widerspruch-Skelett that Bayern would reject. **Risk is theoretically present but not in any V1.5.1 demo path.** Document this in spec under "Known limitations" so a future Bayern-ABH-Ablehnungsbescheid mock-letter doesn't sneak past the Modal-only safety net.

### 2.3 Attack-vector 3 — Aussetzung-Triple-AND: **PASS**
The conjunction (`steuerbescheid` AND `einspruch`-Frist AND `zahlung`-Frist) is correctly strict. Verified against seed: `letter-fa-steuerbescheid-2025` (Anna) has only `einspruch`-Frist because it's an Erstattungs-Bescheid (371 € Rückzahlung an die Bürger:in) — there is literally nothing to suspend. `letter-schmidt-fa-steuerbescheid-2024` and `letter-mehmet-fa-steuerbescheid-2024` both carry `einspruch + zahlung` and rightfully see Aussetzung. The matrix matches reality. The "too narrow" worry would only bite if a Steuerbescheid had `zahlung` without `einspruch`, which is a contradictio in adiecto under § 347 AO. PASS.

### 2.4 Attack-vector 4 — § 122a-Caveat mobile layout: **SOFT-REVISE**
ReplySheet-Header at 375×667 already carries: Frist-Cited-Format string (e.g., 1 line ≈ 95 chars) → wraps to 3 lines on 375 px. Adding the § 122a-Caveat (140 chars verbatim) below adds another 3-4 lines. Then `frist_abgelaufen_warnung` (a third conditional § 9.F string, 380 chars) can fire on top. Worst case the header alone consumes 35-40 % of viewport height before the Pre-Insertion-Modal even fires, pushing the template-picker below the fold. **REVISE**: Architect must spec that § 122a-Caveat collapses behind an inline `<details>` ("Wann beginnt die Frist? Hinweise zur elektronischen Bekanntgabe") on `<md`. Frist-cited-format itself stays visible. The Caveat is informational, not action-critical.

### 2.5 Attack-vector 5 — Token-set silent bug: **HARD-REVISE — central blocking issue**
The domain doc explicitly says (§ 3 token-mapping): "`{datum_bescheid}` ist semantisch identisch zu `{datum_letter}` — Resolver wiederverwendet `{datum_letter}`." Reading `src/lib/mock-backend/reply-templates.ts:452`: `const datumLetter = formatDateDe(letter.empfangen_am);`. Reading V1.5.0 lock § 3 token-table: `{datum_letter}` = "Brief-Empfangsdatum, separate vom heutigen Versand-Datum". Reading the seed: `letter-mehmet-fa-steuerbescheid-2024.empfangen_am === "2026-05-08T06:30:00.000Z"`. **A Bescheid is dated by the issuing authority's `Erlassdatum` ("Bescheid vom …"), not by the date your inbox received it.** For Familie Schmidt, the Erlassdatum is whatever's printed on the FA-Köln-Mitte-Brief — typically 1-7 days before the Bürger receives it via Post. The Skelett's Betreff "Einspruch gegen den Bescheid vom 13.05.2026" therefore makes a public, authority-facing **factual claim** that may be wrong by days. In the worst case the Erlass was 09.05.2026 and the citizen, copying the Skelett to actual paper, sends a misdated Einspruch — a real Behörde could pedantically reject this, or a real recruiter on the Loom may spot it.

This is *exactly* the kind of silent legal-impacting bug the verifier exists to catch. Token-set strictness was claimed but the mapping `{datum_letter} ← letter.empfangen_am` is NOT semantically valid for Skelett-Templates' "Bescheid vom"-Betreff.

**Required fix** (one of):
- Add a real `letter.bescheid_dated_at?: string` field to seed data (15 of 18 letters, where applicable) and resolve `{datum_letter}` from it for Skelett-Templates only — fall back to `empfangen_am` for V1.5.0 templates' "Schreiben vom" usage (which is semantically about the inbound letter, not a Bescheid claim).
- OR: change the Skelett body to use a different anchor — "Einspruch gegen den oben bezeichneten Bescheid (Aktenzeichen {aktenzeichen})" without any datum reference. This also matches BFH-Praxis (Aktenzeichen + "den o.g. Bescheid" is sufficient under § 357 AO).

Domain-expert must decide and re-lock. mock-backend-coder must add the field-or-removal. This is the single hardest revision in this review.

### 2.6 Attack-vector 6 — Picker-Bloat (5 templates on Steuerbescheid + einspruch+zahlung): **SOFT-REVISE**
Visibility-Matrix § 5 row 2 surfaces: `frist_verlaengerung`, `informative_rueckmeldung`, `freitext`, `rechtsbehelf_einspruch_skelett`, `aussetzung_vollziehung_skelett` = **5 templates** for `letter-mehmet-fa-steuerbescheid-2024`. Current ReplyTemplatePicker is a flat card-stack. On mobile (375 px), 5 cards push the most-likely action (Einspruch, since Mehmet contests the 4.812 € Nachzahlung in the demo flow) below the fold; user must scroll to find it. **REVISE**: Architect must order the picker by *intent-likelihood* per archetype — for Steuerbescheid+einspruch+zahlung, the order should be `rechtsbehelf_einspruch_skelett` first (default-highlighted), `aussetzung_vollziehung_skelett` second (the natural pairing), `frist_verlaengerung` third, `informative_rueckmeldung` fourth, `freitext` last. Domain-expert's Visibility-Matrix already has a `(default)` column convention; extend it to a numeric `order` per archetype. This is a UX revision, not a domain revision.

### 2.7 Attack-vector 7 — Cross-template state on Einspruch+Aussetzung: **HARD-REVISE**
Today's `<ReplyTemplateSwitchConfirmDialog>` discards the draft on switch. But Einspruch + Aussetzung are **deliberately companion-Anträge** — Pre-Insertion-Modal § 2.4 verbatim says "Diese Vorlage setzt voraus, dass Sie bereits einen Einspruch eingelegt haben oder gleichzeitig einlegen." If the user fills Einspruch, switches to Aussetzung, and is asked "discard draft?" — this contradicts the modal's own copy and the demo's Mehmet-flow ("Einspruch + AdV in einem Atemzug" per § 9.E). **REVISE**: Architect must spec that switching between `rechtsbehelf_einspruch_skelett` and `aussetzung_vollziehung_skelett` on the *same letter* allows "Beide als getrennte Briefe versenden" — two separate Reply records, one Versand-Modal each, both showing in the Vorgangs-Thread. This is a new flow but small (it's 2 Replies, not 1, with the Versand-Modal already present). Without this, the Loom Mehmet-demo lies about the most realistic FA-flow there is.

### 2.8 Attack-vector 8 — OWiG-V2-Hook not in seed: **PASS — defer**
Domain documented OWiG cleanly with a forward-compatible Modal-Wortlaut. The cost of adding 1 OWi-Mock-Letter (e.g., a Polizei-Bußgeldstelle-Berlin-Bescheid for Anna, 80 €, falsches Parken) is small (~1 letter object + 1 ai_summary). However: adding it *now* expands V1.5.1 scope from 3 templates to 3 templates + 1 new mock-letter + an OWiG-specific Frist-Cited-Format (2-Wochen-statt-1-Monat — already verbatim drafted in § 7.4). It also creates a new archetype (`bussgeldbescheid`) which propagates into Visibility-Matrix, Activity-Log, ai-tools (if any), tests. Recommend deferring strictly to V2 as Domain proposed. **PASS** — but flag in spec: "OWiG-Familie ist Code-pfad-bereit (Norm-Familie-Lookup kennt sie); fehlt nur das Mock-Letter."

### 2.9 Attack-vector 9 — RDG-line "§ in Modal okay, § in Body verboten": **PASS**
Defensible. The Modal is a **disclaimer-surface** that names the legal anchor for the citizen's own verification ("ist bei der erlassenden Behörde einzulegen — § 357 Abs. 2 AO"). The Body is a **Bürger:innen-document** that goes to the authority — citizens who write Einsprüche **never** cite §§ in their own letter, that's a Kanzlei-tic. The split is not unprincipled: it tracks *who is the audience* (Modal: citizen; Body: authority). Smartlaw / BGH I ZR 113/20 distinguishes Werkzeug-Charakter (form-helper, Bürger:in fills) from Rechtsdienstleistung (legal evaluation in Bürger:in's name). Modal-§§ are pedagogical ("here is what the law requires you to verify"), Body-§§ would be argumentative-legal-content. PASS.

### 2.10 Attack-vector 10 — Mitwirkungsaufforderung exclusion + seed correctness: **PASS**
Verified against seed: `letter-schmidt-familienkasse-nachweis.fristen[0].typ === 'nachweis'` ✓; `letter-abh-erinnerung-verlaengerung.fristen[0].typ === 'antragstellung'` (and `meta.typ === 'termin_buchen'`) — neither carries einspruch/widerspruch. Visibility-Matrix § 5 rows 4 + 11 correctly hide Skelett-Templates here. **However**, the matrix uses `frist[].typ === 'nachweis'` as the trigger — but `letter-abh-erinnerung-verlaengerung` carries `'antragstellung'`, not `'nachweis'`. Domain doc § 9.A says "Hard-Rule: bei `letter.fristen[].typ === 'nachweis'` *ohne* zusätzlichen `'einspruch'` oder `'widerspruch'` werden Skelett-Templates **nicht angezeigt**" — but the rule should also encompass `'antragstellung'`/`'termin_buchen'`/`'zahlung'`-only. **SOFT-REVISE the visibility predicate**: change from "hide if typ === nachweis" to "show only if typ ∈ {einspruch, widerspruch}". This is the correct affirmative-allow predicate; the negative-deny version misses edge-cases like AOK-Mitgliedsbescheinigung (no `fristen` at all — currently handled by separate row, but a single positive predicate is more robust).

### 2.11 Attack-vector 11 — "Begründung reiche ich gesondert nach" follow-up obligation: **HARD-REVISE**
Citizen sends Einspruch with this Skelett → makes a binding administrative promise to the Behörde to submit Begründung. Domain doc § 3.1 RDG-Cleanliness-Check claims "BFH-Rspr.: Einspruch ohne Begründung ist wirksam" — true, but the citizen has now *self-bound* via this sentence to file one. If they don't, the Behörde will (a) decide on the rumpf-Einspruch as unbegründet under § 367 AO, or (b) issue a Frist-Setzung nach § 364b AO. **The app, having pushed the citizen into making this promise, has a duty-of-care to surface a follow-up Frist-Reminder.** Otherwise the Skelett actively makes the citizen's position worse than if they had written freitext.

**Two fixes possible**:
- (a) Add a Reminder-Frist (e.g., 14 days from Versand) into `Reply` schema; Dashboard / Posteingang surfaces it as "Begründung zum Einspruch nachreichen — Frist 27.05.2026". This is a follow-up-task feature → out of V1.5.1 scope.
- (b) **Cheaper fix**: change body-skelett to drop "Eine Begründung reiche ich gesondert nach." Replace with nothing (Einspruch ohne Begründung *ist* wirksam, no need to announce future Begründung). The citizen can still send a Begründung later if they want — but the App didn't engineer them into a self-bound promise.

**Recommend (b).** Domain re-locks the body-string to the rumpf form. This is a 1-line fix and removes a real legal-realism risk. HARD-REVISE.

### 2.12 Attack-vector 12 — Rechtsbehelfs-Belehrung Validity: **PASS — defer to known-limitations**
Domain § 9.F already covers this verbatim ("bei fehlerhafter oder fehlender Rechtsbehelfsbelehrung verlängert sich die Frist auf ein Jahr"). The Frist-abgelaufen-Warnung-string (§ 9.F) is the right surface — it fires when frist_status === 'abgelaufen' and names the 1-Jahres-Möglichkeit. PASS. Architect should add the corresponding `posteingang.compose.frist_abgelaufen_warnung` key into the i18n list for localizer.

### 2.13 Attack-vector 13 — 17 i18n keys + namespacing: **PASS**
Domain enumerates 17 (§ 10.C.4). Naming follows V1.5.0 convention (`posteingang.compose.templates.<id>.body_template_de` / `…disclaimer_pre_insertion` / `…disclaimer_inline`; pre-insertion-modal under `posteingang.compose.pre_insertion_modal.<norm-family>`; frist-cited-format under `posteingang.compose.frist_cited_format.<norm>`; cross-template under `posteingang.compose.skelett_*`). Stable. 17 × 6 = 102 string-translations is consistent with V1.5.0 wave's localizer effort and **falls within "feedback_v15_ship_lessons" warning-zone** (memory note: "i18n JSON syntax breaks") but does not exceed it. Architect must call out the Klartext-Gesetz-Erhalt-Rule (V1.5.0 lock § 10.2) for localizer one more time. PASS.

### 2.14 Attack-vector 14 — Two-agent consensus: **REVISE-not-VETO**
Research-scout proceeded, domain-expert proceeded. I **REVISE**, not VETO. Items 2.5, 2.7, 2.11 are blocking but achievable in current sprint without re-running upstream agents — domain-expert can address all three in a single re-lock pass (one body-string edit, one token-resolution clarification, one cross-template UX-state addition). Items 2.4, 2.6, 2.10 are architect-fixable in spec without domain-revisit. No escalation to user needed.

## 3. New gaps the upstream agents missed entirely

1. **Schmidt-Demo's `letter-schmidt-fa-steuerbescheid-2024` carries `auth_channel: 'briefpost'` (not `mein-elster`)** — so § 122a-Caveat will *not* fire for the Schmidt Steuerbescheid demo, only Mehmet's. This is OK, but architect must ensure the Loom-script picks Mehmet for the AdV demo if § 122a is intended as a wow-element. Domain doc § 8 lists three `mein-elster`-letters — only Mehmet's is a Steuerbescheid with both Frist-Typen.

2. **No `bescheid_dated_at` field exists in `Letter` type today** — even the body_de strings of FA-letters in the seed don't consistently print a "Bescheid vom DD.MM.YYYY" anywhere I can grep cleanly (the headers say "Bredtschneiderstraße 5, 14057 Berlin" but no Erlassdatum line). This is the deepest structural fix needed by the package: the seed data does not even *contain* the date the Skelett wants to cite. mock-backend-coder owns this.

3. **`<ReplySheet>` cap on visible templates**: V1.5.0 ships 4+freitext = 5 templates max; V1.5.1 adds up to 3 → 8 max in worst-archetype case. Spec § 4.x of V1.5 does not declare a max-N. If steuerbescheid+einspruch+zahlung surfaces 5 templates today and V1.5.2 adds Zahlungs-Rail (research-scout's Idea 1 top pick), that becomes 6+. Architect must spec a hard "max-N visible cards" + "More …" overflow before this becomes unbounded.

4. **Activity-Log enums for the 3 new templates** are not enumerated in domain doc — V1.5.0 introduced 5 new enums (`reply_compose_started`, `reply_template_inserted`, `reply_draft_saved`, `reply_draft_deleted`, `reply_sent_simulated`). V1.5.1 templates ride those, fine — but the `note`-field per Domain V1.5.0-lock § 10.3 must include `template_id` so Datenschutz-Cockpit shows "Einspruch-Skelett eingefügt" not just "Template eingefügt". Spec should pin this.

5. **No mention of `<PreInsertionModal>` accessibility** for the AlertDialog with norm-citation (`§ 357 Abs. 2 Satz 1 AO`). Screen-reader users hearing "Paragraph drei-fünf-sieben Absatz zwei Satz eins A-O" need a `<span aria-label="Paragraph 357 Absatz 2 Satz 1 der Abgabenordnung">§ 357 Abs. 2 Satz 1 AO</span>` wrap. V1.5 a11y memory note lists "list-false-PASS" and "token-level contrast" — this is a similar accessible-numeric-content gap. a11y-tester must audit the Modal copy specifically.

## 4. Required revisions before PROCEED

- **(domain-expert owns)** Resolve `{datum_letter}` semantic conflict for Skelett-Templates (attack-vector 5). Either rename to `{datum_bescheid}` and add new field to Letter type, or remove the date-of-Bescheid claim from Body and rely on Aktenzeichen alone. Re-lock §3.1/3.2/3.3 bodies and §3 token-mapping.
- **(domain-expert owns)** Drop "Eine Begründung reiche ich gesondert nach." from Skelett § 3.1 + § 3.2 bodies (attack-vector 11). Rumpf-Einspruch is wirksam under BFH-Rspr. without the self-binding sentence.
- **(domain-expert owns)** Make Familienkasse-AO-explainer **mandatory** (not "recommended") for `archetype === 'familienkasse-nachweis'` + `frist.typ === 'einspruch'` (attack-vector 1).
- **(product-architect owns)** Spec the picker-order per archetype (intent-likelihood ranking, attack-vector 6). Domain's `(default)` column extends to numeric order.
- **(product-architect owns)** Spec a "Beide als getrennte Briefe versenden" affordance for Einspruch ↔ Aussetzung switch on same letter (attack-vector 7). Two Replies, two Versand-Modals, single Vorgangs-Thread.
- **(product-architect owns)** Spec § 122a-Caveat collapse-by-default behind `<details>` on `<md` viewport (attack-vector 4).
- **(product-architect owns)** Change Visibility-Predicate from "hide if typ === nachweis" to "allow only if typ ∈ {einspruch, widerspruch}" (attack-vector 10). Affirmative-allow is more robust.
- **(product-architect owns)** Pin `template_id` into Activity-Log `note` field for Skelett-Templates (new-gap 4).
- **(mock-backend-coder owns)** Add `letter.bescheid_dated_at` field (or alternative per domain re-lock) to all 5 seed-letters that surface Skelett-Templates (`letter-fa-steuerbescheid-2025`, `letter-schmidt-fa-steuerbescheid-2024`, `letter-mehmet-fa-steuerbescheid-2024`, `letter-mehmet-ihk-beitrag`, `letter-mehmet-bgw-beitrag`, `letter-mehmet-krankenkasse-freiwillig`, `letter-mehmet-beitragsservice-mahnung`, `letter-schmidt-krankenkasse-beitrag`, `letter-schmidt-beitragsservice-festsetzung`, `letter-beitragsservice-festsetzung`). Cross-check `body_de` strings to see if they already contain a Bescheid-date line; populate from there if so.
- **(a11y-tester owns, post-build)** Audit `<PreInsertionModal>` `aria-label`-wrapping for §-numeric content (new-gap 5).

## 5. Risks accepted-but-named (Known Limitations in spec)

- **Bayern-VwGO-Delta is disclaimer-only.** Future ABH-Ablehnungsbescheid mock-letter would re-open this — must be re-verified before V2 ships such a letter.
- **Adressat-Auto-Heuristik is intentionally absent.** App never proposes anything other than the Briefkopf-Adresse. Citizens with sophisticated cases (Konzern-Steuern, mehrstufige Behördenlandschaft) get the wrong Adressat unless they verify.
- **Beitragsservice ↔ Landesrundfunkanstalt-Adressat-Frage is medium-confidence in domain doc § 10.B.** Briefkopf-Adresse (Beitragsservice Köln) is what the app uses; a Widerspruch directly to RBB AöR would also be zulässig. Demo accepts the Briefkopf-default.
- **§ 86a SGG / § 80 VwGO Aussetzung-Pendants are V2-only** — citizens with KK-Beitrags-Bescheid have the same financial-pressure-during-Widerspruch problem as Steuer-Bürger, but V1.5.1 doesn't help them. Demo-walkthrough should not narrate "you can suspend payment for KK-Beitrag" — it cannot, in V1.5.1.
- **Frist-extension on missing Rechtsbehelfsbelehrung (§ 356 AO) is text-only in § 9.F warning** — app never asserts which Frist applies; user must verify.

## 6. Recommended scope-cut

- **Defer OWiG-Familie strictly to V2** (no new mock-letter in V1.5.1). Confirmed by domain § 10.A.5 and reaffirmed.
- **Do NOT add ABH-Ablehnungsbescheid mock-letter in V1.5.1** — Bayern-PLZ-logic risk + 16-Bundesländer-table = scope-creep > 1 week. V2-Hook only.
- **Defer "Beide als getrennte Briefe versenden" to V1.5.1**? — No, keep IN. It's a ~6h frontend-coder task (parallel Reply records on same letter, existing schema supports it via `letter.replies[]`, Versand-Modal fires twice). Without it, the demo-flow lies about Mehmet's case.
- **Defer Begründung-Nachreichen Frist-Reminder feature** to V2. Replace with the cheap fix (drop the self-binding sentence from body).

## 7. Recommendation to product-architect (post-revision PROCEED)

When domain-expert returns the re-locked V1.5.1 doc with (a) corrected datum-Token mapping, (b) trimmed Skelett-bodies (no "Begründung reiche ich gesondert nach"), and (c) mandatory Familienkasse-AO-explainer, **product-architect produces `docs/specs/posteingang-v1.5.1.md`** with: ReplyTemplateId-Union extension to 8 values; PreInsertionModal-Slot wired to Norm-Familie-Lookup (table-driven, not if-cascade); ReplyTemplatePicker with archetype-keyed `order` array (Steuerbescheid+einspruch+zahlung → einspruch_skelett first, aussetzung second); Visibility-Predicate as `typ ∈ {einspruch, widerspruch}` allow-list (not nachweis-deny-list); Cross-template state preserves draft when switching between einspruch_skelett ↔ aussetzung_vollziehung_skelett on same letter and surfaces "Beide als getrennte Briefe versenden" CTA; § 122a-Caveat behind `<details>` on `<md`; Activity-Log notes carry `template_id`; new `letter.bescheid_dated_at` field on Letter type; a11y-tester gets explicit Modal-`aria-label`-wrap requirement. Mock-backend-coder updates seed for the 9 affected letters in the same wave. i18n-localizer waits for spec sign-off; localizer-pass is on the order of V1.5.0 (102 strings). Total effort: ~5-6 working days, fitting in current sprint.

**Verdict: REVISE.** Do not let architect kick off until domain-expert has re-locked the three named items.
