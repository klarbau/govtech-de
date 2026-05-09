---
target: posteingang-v1.5
date: 2026-05-09
verdict: REVISE
reviewer: concept-verifier
inputs_reviewed:
  - docs/domain/posteingang-antwort-verfassen.md
  - docs/research/2026-05-09-posteingang-v1.5.md
  - docs/research/2026-05-09-posteingang-ux-critique.md
  - docs/specs/posteingang.md (V1, shipped 2026-05-09)
  - CLAUDE.md
independent_sources_consulted:
  - https://bmds.bund.de/themen/digitaler-staat/digitale-identitaeten/bundid (BundID-Status 05/2026; bidirektional Sommer 2026 Regelbetrieb, antragsbezogen, kein Free-Form)
  - https://www.haufe.de/id/kommentar/schwarzpahlkekess-ao-357-einlegung-des-einspruchs-23-adressat-des-einspruchs-357-abs2-ao-HI2067016.html (§ 357 Abs. 2 AO Adressat-Pflicht — Einspruch an falsche Behörde = keine fristwahrende Wirkung)
  - https://www.haufe.de/id/kommentar/schwarzpahlkekess-ao-357-einlegung-des-einspruchs-211-schriftform-elektronische-form-oder-erklaerung-zur-niederschrift-HI6757587.html (§ 357 Abs. 1 AO Form: kein Originalunterschriften-Erfordernis, Begründung optional)
  - https://www.bundesfinanzhof.de/de/entscheidung/entscheidungen-online/detail/pdf/STRE201510201 (BFH III R 26/14: einfache E-Mail genügt § 357 Abs. 1 AO ohne qeS)
  - https://www.it-recht-kanzlei.de/disclaimer-sinn-unsinn.html (Disclaimer-Bestimmtheit: in direkter inhaltlicher Verbindung, vor Handlung, klar formuliert)
---

## Verdict

**REVISE — domain & research are mostly sound; six concrete revisions are required before product-architect locks the V1.5 contract.** Reply-feature legal frame is defensible (textarea-only as Werkzeug per BGH I ZR 113/20 Smartlaw), template whitelist is mostly right, and UX restructure has clear ROI. But: (1) the 9-template list contains two flawed entries (§ 357 Abs. 2 AO Adressat-Risiko on the Einspruchs-Skelett with auto-prefill; "adresse_aktualisieren" is structurally a wrong fit for a reply-to-letter model); (2) the disclaimer-consolidation in UX-critique conflicts with the V1 spec § 12 review checklist on three line items and must be reconciled before banners are touched; (3) the speculative-2027 frame for "BundID-bidirektional with EUDI-signature" is realistic in *direction* but is being mocked as if it includes free-form mail — the 2026 reality, even forward-projected, is **antragsbezogene strukturierte Formulare** per BMDS, which contradicts the textarea-as-primary architecture; (4) i18n explosion for 9 templates × 6 locales is materially larger than research-scout assumed and must be phased; (5) the freeform-textarea-content-policy gap (challenge A4) is genuinely unaddressed by domain-expert; (6) the V1.5.0 vs V1.5.1 split must be locked before the architect writes one line. The features are buildable; the contract isn't yet tight enough for a portfolio-grade demo.

## Required revisions before product-architect writes the spec

1. **domain-expert addendum** (`docs/domain/posteingang-antwort-verfassen.md`) — add four sections:
   - **§ 357 Abs. 2 AO Adressat-Risiko**: when `rechtsbehelf_skelett_einspruch` auto-prefills `Empfänger-Behörde` from `letter.absender_behoerde_id`, this is *almost always* correct (Einspruch goes to the issuing Behörde) — but for letters that are passed-through (Familienkasse → BA-Bezirksstelle, or Zoll-Erbschaftsteuer at FA Kassel etc.) the prefill could be wrong and the citizen would lose Frist. Recommend: pre-insertion modal explicitly says "Einspruch muss an die **erlassende Behörde** gerichtet sein. Wir haben aus dem Briefkopf '[Behörde]' übernommen — bitte selbst verifizieren, weil Einreichung bei falscher Stelle die Frist nicht wahrt (§ 357 Abs. 2 AO)." Adressat is *editable* in the form. This is a real legal-realism point that domain currently glosses.
   - **Drop `adresse_aktualisieren` from the reply-set**: a citizen-initiated address update is a *new outbound Vorgang* (Bürgeramt-Anmeldung § 17 BMG, plus parallel Mitteilungen an Krankenkasse/Steuer/Bank). It is *not* a reply to an inbound letter. Forcing it into the reply-template list creates a fake demo flow and dilutes the feature. Either move it to a "Mitteilung verfassen" CTA on `/stammdaten` (separate Vorgang) or defer entirely.
   - **Termin-Templates (3) — verify all three are reply-mode-appropriate**: "Termin bestätigen" makes sense as a reply (e.g. ABH-Termin-Vorschlag-Brief). "Termin verschieben" and "Termin absagen" are *replies if the Behörde proposed the time*; otherwise they're new requests. Domain says "drei Untertemplates" but does not differentiate reply-to-proposed-Termin vs. ad-hoc-Termin-Änderung. Add the distinction or collapse to one `termin_antwort` template with mode-radio (bestätigen/verschieben/absagen) inside it. Reduces template count from 9 to 7, simplifies i18n, no semantic loss.
   - **Content-policy for the freeform textarea (challenge A4)**: domain currently says nothing about what happens when the citizen types abusive content, defamation, or PII of third parties into the textarea before "Versand simulieren" is clicked. The Versand is mock — but the draft is persisted in `localStorage`, the activity log records `reply_draft_saved`, and the [MOCK]-watermarked output is shown back to the user as if it were a Behörden-bound letter. For a portfolio demo this *will* end up screen-recorded by a curious recruiter who types `"Ich werde Ihre Behörde verklagen, …"` and the screenshot lands on Bluesky. Recommend: (a) no client-side moderation (citizen-respectful), (b) before "Versand simulieren" a single confirmation step "Ihre Antwort verlässt diese Demo nicht. Sie würde aber, wenn echt versandt, an [Behörde] gehen — bitte verfassen Sie sie so, wie Sie sie tatsächlich an die Behörde schicken würden. Beleidigungen oder Drohungen können strafbar sein (§ 185 StGB / § 241 StGB)." This shifts framing from "publishing platform" to "Werkzeug für Bürger:innen-Eigenkommunikation" without playing content-cop.

2. **research-scout addendum** (`docs/research/2026-05-09-posteingang-v1.5.md`) — add two sections:
   - **BundID 2026 Realismus-Korrektur**: research currently cites "ZBP bidirectional 2026" as single-source from `ad-hoc-news.de` (footnote 14). Independent verification (BMDS BundID page, AKDB Newsroom 2026, opencode forums) confirms (a) bidirektional in Regelbetrieb Mitte/Sommer 2026, *but* (b) **antragsbezogen** — citizens can only reply *to existing applications*, not initiate free-form mail to authorities. This is **fundamental** for our 2027-speculative frame: even projected forward, the realistic 2027 model is "antrags-thread-gebunden", not "open mailbox". Means our V1.5 reply UX must show the reply *anchored to the inbound letter's Aktenzeichen+Vorgang*, never as a freeform "Neue Nachricht an Behörde" — which research-scout *did* recommend (Axis-1 recommendation #1: "Neue Nachricht an Behörde verfassen" CTA). **Drop that fallback CTA**. Replies are *always* in-thread to a specific letter; full stop.
   - **HEY-Imbox-Toggle reality-check**: research-scout's recommendation to add "Bescheide / Anschreiben / Alle" toggle (Axis-2 recommendation #4) sounds elegant but conflates with the existing `letter.archetype` *and* with the V1 status-grouping. We already have visual urgency cues (FristChip colour, status-grouping, status-dot). Adding a third taxonomy axis ("transactional vs informational") is bloat unless it replaces one of the others. Verifier-position: cut from V1.5; revisit after the disclaimer/filter cleanup ships and we can measure scan-time on the cleaner inbox.

3. **UX-critique reconciliation with V1 spec checklist**:
   - Spec § 12 mandates **`disclaimer.opening`** "auf Posteingang-Hero und in jedem LetterReader sichtbar"; **`disclaimer.original_authoritative`** "als roter Banner über jedem AI-Summary-Block"; **`disclaimer.no_legal_advice`** "im WasKannIchTunFooter sichtbar"; **`disclaimer.mock_data`** "im Inbox-Footer sichtbar"; plus `[MOCK]`-watermark "als Banner oben in jedem LetterReader". UX-critique recommends collapsing four of these into a single "Hinweise zum Brief"-`<details>` group. **This violates the V1 contract.** Resolution: V1.5 is allowed to *reorganize* but not *collapse-into-collapsed* the four mandatory disclaimers. Specifically: (a) `disclaimer.original_authoritative` (roter Banner) must remain always-visible — it is the truthfulness anchor against AI-Halluzination and is the demo's Apple-Intelligence-distinction-statement; (b) `[MOCK]`-watermark stays always-visible (UX-critique already concedes this in Out-of-Scope #4); (c) `disclaimer.opening` and `disclaimer.no_legal_advice` MAY be moved into one `<details>` group titled "Rechtliche Hinweise" — both are legal-context, not active warnings; (d) `disclaimer.mock_data` stays in the footer as the truthfulness anchor for the inbox itself. Net: 5 visible banners → 2 visible (`[MOCK]` + `original_authoritative`) + 1 collapsed `<details>` + footer. That is a defensible 60% reduction without breaking V1 contract.
   - Spec § 3 mandates "**Authentizitäts-Badge** auf jeder LetterCard" — UX-critique demoting it to icon-only is fine *visually* but the spec word "Badge" is content-bearing, not visual. Resolution: badge stays as a tiny inline element (icon + 1-word label, e.g. "Brief"), keeps `aria-label` with the full kanal-string. Demoting to hover-only-tooltip violates the spec because a screen-reader-user does not get the channel info on first-pass.
   - **`Datenschutz-Cockpit-Link`** UX-critique wants this off the LetterCard. Spec § 3 mandates it. Resolution: keep on card but as 16px-shield-icon-only (UX-critique's "discreet shield-icon button"), with `aria-label="…"`. Spec contract preserved, visual weight reduced.

4. **i18n phasing — `9 templates × 6 locales` is real and underestimated**. Each template needs minimally: `name`, `description`, `body_template_de` (only DE-source for the German letter body), `disclaimer_pre_insertion`, `disclaimer_inline`. That is **5 keys × 9 templates = 45 template-keys**, of which 4 (`name`, `description`, `disclaimer_pre_insertion`, `disclaimer_inline`) need full 6-locale × 45 = **180 + 45 = 225 translations**, plus the body-template which is **DE-only** (per realism — Behörde parses German). On top of that the UX-restructure adds active-filter-chip-strings, BescheidVsAnschreiben-toggle (research-scout, V1.5-cut per #2 above), drafts-group-header, side-sheet-A11y-strings — call it ~40 more keys × 6 = 240 translations. **Total ≈ 465 new translations vs. ~292 baseline.** This is a 1.6× expansion, not the "~25 keys" research-scout flagged in implication-list. **Lock template count to 5–6 in V1.5.0 phase.**

5. **V1.5.0 / V1.5.1 split — must be locked**. User-proposed split (V1.5.0 = restructure + 3 templates + side-Sheet UX, V1.5.1 = remaining templates + content-policy/edge cases) is **approximately correct but underspecifies which templates**. Verifier-recommended split:
   - **V1.5.0** (deliver in <1 week of demo work):
     - UX restructure: filter-button+chip-row (drop sidebar), disclaimer-consolidation (per #3 above), suppress group-headers when status-filter active, sticky-right-rail Frist-CTA on desktop / bottom-sheet on mobile.
     - Reply feature: `ReplySheet` side-sheet, *4 templates* — `frist_verlaengerung`, `nachweis_einreichen`, `informative_rueckmeldung`, `termin_antwort` (single template with bestätigen/verschieben/absagen radio per #1c). Plus `freitext` mode (textarea without template).
     - Mock-backend: `Reply` + `ReplyDraft` types, 4 new activity-log enums (with naming nit — see C2 below).
     - Content-policy confirmation modal (per #1d).
   - **V1.5.1** (defer; might never land if demo is filmed first):
     - `rechtsbehelf_skelett_einspruch` + `rechtsbehelf_skelett_widerspruch` — these have the highest RDG/§ 357 Abs. 2 risk and need the Adressat-Risiko-Modal (#1a) plus extra disclaimers. They are also not the *primary demo wow* — that's Schmidt's `nachweis_einreichen` flow.
     - 2 additional Mock-Briefe (Termin-Vorschlag-Brief + Adressänderungs-Aufforderung). The latter is dropped per #1b; the former is needed to make `termin_antwort` demoable, so move it forward to V1.5.0 if `termin_antwort` is included.
     - HEY-style Bescheide/Anschreiben toggle — out per #2.
     - Mobile reply-UX edge cases (per challenge B5).
   - **Drop adresse_aktualisieren**, **drop adresse-änderungs-Aufforderungs-Brief** (per #1b — saves 1 template + 1 mock letter + ~10 i18n keys × 6 locales = 60 translations).

6. **Activity-log enum naming nit (challenge C2)**: `reply_template_inserted` should NOT carry the template id as part of the enum. Recommend:
   - Enum stays as 4 values: `reply_compose_started`, `reply_template_inserted`, `reply_draft_saved`, `reply_sent_simulated`.
   - Add a sibling `note?: string` field (already optional in `letterActivityLogEntrySchema:240`) carrying the template_id (e.g. `note: "template:nachweis_einreichen"`). This avoids enum-explosion (4 enum values × 9 templates = 36 enum values would be horrible) and keeps schema stable as templates evolve. Compile-time drift-guard at `schemas.ts:251` already handles this cleanly — just extend the enum + start using `note` field.
   - Recommend one additional event: `reply_draft_deleted` (domain-expert mentioned it as "optional, V2"). For Datenschutz-Cockpit completeness (Lösch-Pfad), **make it V1.5.0 mandatory**, not V2. Bürger:in must be able to delete a draft and see the deletion in the activity log — that is core to the "Privacy-by-design" mission constraint in CLAUDE.md.

## Reasoning per challenge axis

### A1 — RDG-Werkzeug-Charakter for our infrastructure: **VERIFIED ok with one caveat**

Domain-expert's analysis is correct that *prefill of metadata* (Aktenzeichen, Empfänger, Datum) is not RDG — it is Sachdaten-Übermittlung in the citizen's own affairs. Smartlaw's Werkzeug-Charakter (BGH I ZR 113/20) holds. **Caveat**: the Adressat-Prefill on `rechtsbehelf_skelett_einspruch` is the closest the design comes to crossing the line — § 357 Abs. 2 AO requires submission to the *erlassende Behörde* and our auto-prefill from `letter.absender_behoerde_id` is correct in 95% of cases but failure-mode is a blown Frist for the citizen. This is *not* RDG (still Sachdaten), but it is a **liability-shaped legal-realism risk**. Mitigation per #1a: pre-insertion modal that says "Verifizieren Sie selbst — falsche Behörde = keine Fristwahrung." Push back on auto-attached §-references in the template body: domain explicitly excludes this in Whitelist §2 and the Hard Constraint "Keine AI-Begründung" — verified ok, but the architect must make sure the body-template truly contains zero §-references, not even pre-formatted. Example: a bad template would render `"Hiermit lege ich Einspruch ein gem. § 355 AO"` — the `§ 355 AO` is a Pflichtangabe-aspect we should NOT auto-include because (a) `§ 357 AO` is the correct norm for "Einlegung", `§ 355 AO` is the Frist-norm, and confusing them in a template is a credibility-killer; (b) including any §-reference at all moves the template from "Pflichtangaben-Skelett" toward "rechtliche Argumentation". **Hard line: template body contains date, Aktenzeichen, Empfänger, "Hiermit lege ich Einspruch / Widerspruch ein gegen den Bescheid vom […]." — and nothing else.** Architect must verify in spec.

### A2 — 9-template whitelist verification: **FLAGGED for revision**

Per-template scrutiny:
- `frist_verlaengerung` — VERIFIED ok. Pure administrative request.
- `nachweis_einreichen` — FLAGGED. Domain mentions "Anbei der angeforderte Nachweis. Ich gehe davon aus, dass damit Ihre Aufforderung erfüllt ist" — the second sentence is interpretation/argument and should be cut. Trim cover-text to: "Anbei finden Sie den von Ihnen angeforderten Nachweis [Bezeichnung]. Bitte bestätigen Sie den Eingang." Pure übermittlung-text.
- `adresse_aktualisieren` — REJECTED per #1b. Wrong fit for reply-to-letter model.
- `termin_bestaetigen` / `termin_verschieben` / `termin_absagen` — FLAGGED. Collapse to one `termin_antwort` template per #1c.
- `rechtsbehelf_skelett_einspruch` — FLAGGED per #1a (Adressat-Risiko). Architecturally valid, but defer to V1.5.1 with the Adressat-Modal.
- `rechtsbehelf_skelett_widerspruch` — same as above; defer to V1.5.1.
- `informative_rueckmeldung` — VERIFIED ok.

Net: V1.5.0 templates = 4 (`frist_verlaengerung`, `nachweis_einreichen` trimmed, `informative_rueckmeldung`, `termin_antwort` consolidated). V1.5.1 = 2 (`rechtsbehelf_skelett_einspruch`, `rechtsbehelf_skelett_widerspruch`). Net cut: 9 → 6 templates total, 4 in V1.5.0.

### A3 — Disclaimer-modal vs. permanent banner: **VERIFIED ok with WCAG addendum**

Modal-before-action is the right pattern per German disclaimer-Bestimmtheit doctrine (it-recht-kanzlei.de, juraforum.de): "in direkter inhaltlicher Verbindung, vor Handlung, klar formuliert." A permanent banner is *worse* per disclaimer-fatigue research and per Issue 4 in UX-critique. **WCAG/BITV implication**: the modal must trap focus (`aria-modal="true"`, focus to first heading, return focus to triggering button on close), be Escape-dismissible (cancels insertion), have a clear primary action ("Vorlage einfügen") and secondary action ("Abbrechen"), and the disclaimer text must be in the modal body as readable prose (not link-out). Architect to use shadcn/ui `<AlertDialog>` (which has these built-in) rather than `<Dialog>` (which does not enforce primary-action). **One gap in domain-expert's recommendation**: the modal must be shown *only* for the two Skelett-Templates (Einspruch + Widerspruch), not for all templates — a citizen filling `frist_verlaengerung` does not need to see "Sie nutzen das Einspruchs-Skelett. Diese Vorlage enthält nur Pflicht-Angaben…" That would be disclaimer-spam. Architect must scope the modal to `template.kategorie === 'rechtsbehelf'`.

### A4 — Content policy for textarea: **FLAGGED — domain currently silent**

This is the gap I called out in revision #1d. Domain-expert covers RDG (the App's risk) but not StGB (the citizen's risk if they type a defamation/threat into the textarea and click "Versand simulieren" — even though the Versand is mock, the demo *teaches* the citizen the workflow they would use in reality). Mitigation: pre-Versand confirmation step with neutral framing — not moderation, not censorship, just "behave as if real." Spec must include the modal copy (verbatim) and the architect must specify it as a hard step.

### A5 — Speculative-2027 frame: **VERIFIED ok with realism caveat per #2**

CLAUDE.md explicitly authorizes "speculative-design prototype: how a citizen-first interaction layer for German public administration could look in 2027." The 2027 frame is justified. **However**: research-scout's footnote-14 single-source for "2026 ZBP bidirektional flächendeckend" is materially wrong on the *direction* of the projection. Independent verification (BMDS, AKDB Newsroom 2026): bidirektional is **antragsbezogen** — closed-thread, not open-mail. Forward-projecting that to 2027, the realistic model is *still* antragsbezogen. So our V1.5 design must show replies as in-thread to a specific letter (Aktenzeichen-anchored), never as freeform "Neue Nachricht an Behörde". Drop research-scout's Axis-1 recommendation #1 fallback CTA. Disclaimer copy must not say "einheitliches BundID-Postfach mit EUDI-Wallet-Signatur" in a way that suggests free-form messaging — must say "antrags-thread-gebundene bidirektionale Kommunikation auf Basis des ZBP/BundID-Modells." Domain-expert §3 B2 already partially captures this; tighten the copy in `posteingang.compose.outbound_speculative`.

### B1 — Top-5 ROI ranking validation: **PARTIALLY OK, partially FLAGGED**

The UX-critique ranking is roughly right but two items need swapping:
- Issue #1 (5+ disclaimers) and Issue #3 (LetterCard 6-concepts) are *both* high ROI but #3 is more impactful per BITV/scan-time because the LetterCard is rendered ~6 times per inbox-render = 6 × 6 concepts = 36 visual elements per scan. The disclaimers render once per page. Per cognitive-load research (Nielsen), 36 vs 5 elements is the bigger drag. **Re-rank: LetterCard simplification = #1, disclaimer-consolidation = #2.**
- "Suppress per-status group headers when filter active" vs. "Delete filter checkbox row entirely" — research-scout's "delete the row entirely" wins for the UX-restructure (single source of truth: status grouping in the chronological view), and the verifier picks this. UX-critique's Issue 2 fix ("conditionally suppress headers") is the second-best because it leaves the filter present, which still adds ~80px of vertical clutter. **Pick: delete filter checkbox row, keep group headers as scaffold.**
- "Sticky right-rail action panel on desktop" — does NOT conflict with spec § 4.3's side-by-side: the side-by-side is the *content* (AI-Summary left, Originaltext right); the action-rail can be *below* the side-by-side as a sticky footer band, not as a third column. Or for ≥xl breakpoints, the action-rail can be a 4th column on the right edge with `sticky top-N`. Architect to pick desktop breakpoint behavior.

### B2 — Banner consolidation reconciliation: **FLAGGED — see revision #3**

UX-critique's "1 always-on + 1 collapsible 'Hinweise' group" violates V1 spec § 12 on three line-items (`disclaimer.opening` visible, `disclaimer.original_authoritative` as red banner, `disclaimer.no_legal_advice` in WasKannIchTunFooter). Resolution per #3 above: keep `[MOCK]`-watermark + `original_authoritative` always-visible (these are truthfulness anchors); group `disclaimer.opening` + `disclaimer.no_legal_advice` into one collapsed `<details>` titled "Rechtliche Hinweise"; keep `disclaimer.mock_data` in inbox footer. Net: 5→2 visible + 1 collapsed + footer.

### B3 — Status-filter vs. group-headers redundancy: **VERIFIED redundant — UX-critique correct**

They encode the same dimension. The "power-user vs casual" distinction the user proposes is theoretical: a casual user does not need the filter (group-headers do the job); a power user does not need group-headers (their query is more specific than what status-grouping offers). Cut the filter row. Keep group-headers. (Filter for `Behörden-Kategorie` stays — that's a different dimension.) Verifier sides with research-scout on this one over UX-critique.

### B4 — Vorgang-tab × Status-filter collision fix: **FLAGGED — pick "(N filtered of M)" counts, not auto-clear**

User intuition is right: silently mutating user state (auto-clear filters on tab switch) is invasive and breaks the *citizen-respectful* mission constraint. Showing "(3 filtered of 8)" in each `<VorgangsGruppe>` header is informative; the user sees the filter is active and can clear it themselves. UX-critique offered both options and asked verifier to pick — picking option (b) "(N filtered of M)" counts. Rationale: aligns with CLAUDE.md "citizen-respectful, gov.uk / DigitalService DE-style minimalism" — DigitalService's pattern is *transparency, not paternalism*. Also: with #B3 resolution (delete status-filter row), this issue partially auto-resolves — the only remaining filter is `Behörden-Kategorie`, which makes sense to keep across tab-switches anyway.

### B5 — Mobile reply UX reconciliation: **FLAGGED — research-scout's pattern wins**

Three sources, three positions:
- UX-critique: drops Vorgang-tab on mobile (issue #3 fix). Doesn't address reply-UX.
- Research-scout: collapse sidebar to filter-button + chip-row mobile (Axis-2 #1); reply sheet becomes full-screen-route on mobile (Axis-1 #6).
- Domain-expert: silent on mobile.

Reconciliation (verifier-position): on mobile, (a) drop the sidebar entirely (sidebar → filter-button only, opens bottom-sheet), (b) keep the Vorgang-tab as a tab — mobile users *do* benefit from the tab; UX-critique's "drop on mobile" is too aggressive, (c) reply-sheet is full-screen on mobile (research-scout). Net: mobile = single chronological list with Vorgang-tab + filter-button + reply-as-fullscreen-route. Architect to confirm in mobile-section of spec.

### C1 — i18n explosion: **FLAGGED — see revision #4**

User's intuition (~324 leaves per template × 6 locales) is the wrong unit. Real number: 5 keys per template (name, description, body_template_de DE-only, disclaimer_pre, disclaimer_inline) × 6 (4 fully-translated + 1 DE-only body) = ~25 translation-strings per template, × 9 templates = 225 + ~240 from UX-restructure i18n = ~465 new translations. The pipeline (i18n-localizer is one agent, ~3-5 minutes per file × 6 files for full pass) handles it but it is a *meaningful* expansion. Phasing per revision #5 brings V1.5.0 down to ~150 translations, which is comfortable.

### C2 — Activity-log enum naming: **VERIFIED ok with addendum**

Names are clean and consistent with existing `opened_in_app` / `summary_generated` / `marked_read` style. Don't carry template-id in enum (would explode) — use `note` field. Add `reply_draft_deleted` per revision #6. The drift-guard at `schemas.ts:248-254` makes the change low-risk.

### C3 — V1.5.0 / V1.5.1 split: **FLAGGED — see revision #5**

User's proposed split is *almost* right but should drop `adresse_aktualisieren`, consolidate the 3 termin-templates, and defer the 2 Skelett-Templates to V1.5.1. V1.5.0 = restructure + 4 templates + content-policy modal + side-sheet UX + 1 new mock-letter (Termin-Vorschlag for `termin_antwort` to have a demo-anchor).

### C4 — `/ar/posteingang` 404: **OUT-OF-SCOPE for V1.5 — non-bug**

Verifier checked: `src/i18n/routing.ts` defines locales but there is **no `middleware.ts` in the project** (Glob `**/middleware.ts` → no files found). The `next-intl` setup uses cookie-based locale switching, not URL-prefix routing. So `/ar/posteingang` correctly returns 404 because that URL does not exist; the AR locale is served at `/posteingang` with `<html lang="ar" dir="rtl">`. The a11y recheck passed AR-RTL on `/posteingang`. **This is a curl test artefact, not a bug.** UX-critique already half-flagged this ("locale routing for AR likely needs a re-check ... may be a pre-existing middleware behaviour outside this critique's scope"). Verdict: do not include in V1.5. If we want URL-prefix locales (e.g. for sharing AR-language deep-links to recruiters), that's a separate spec — out of scope here.

## What product-architect MUST cover in the V1.5 spec

1. **Template count locked to 4 in V1.5.0** (frist_verlaengerung, nachweis_einreichen-trimmed, informative_rueckmeldung, termin_antwort-consolidated). 2 Skelett-Templates deferred to V1.5.1 with explicit dependency on Adressat-Risiko-Modal copy.

2. **Hard-line no-§-references in template bodies** (verbatim wording in spec): `body_template_de` for every template contains *only* date, Aktenzeichen, Empfänger-Behörde, salutation, the administrative phrase ("Ich bitte um …" / "Anbei finden Sie …" / "Hiermit lege ich Einspruch ein gegen den Bescheid vom […].") and a closing. Zero §-references in body. References live in pre-insertion modal text (`disclaimer_pre`) and in the inline `disclaimer_inline`.

3. **`AlertDialog`-based pre-insertion modal scoped to `kategorie === 'rechtsbehelf'`** templates only (V1.5.1 territory). Modal copy verbatim from `posteingang.compose.template_disclaimer.skelett` (domain §8). Includes Adressat-Risiko warning per revision #1a.

4. **Pre-Versand confirmation modal** with content-policy framing (revision #1d copy, verbatim). Architect to add `posteingang.compose.versand_modal_*` keys.

5. **Disclaimer-restructure**: keep `[MOCK]`-watermark + `original_authoritative` always-visible; group `opening` + `no_legal_advice` into one collapsed `<details>` titled "Rechtliche Hinweise"; keep `mock_data` in inbox footer. Spec § 12 review checklist line items 1086–1089 must be re-written to reflect this — architect must explicitly note in the spec that V1.5 amends V1 § 12 on these four lines, with the V1 wording preserved-but-superseded.

6. **Filter cleanup**: delete the Status-checkbox row entirely from sidebar. Sidebar reduces to 5-Kategorie-checkboxes (or 3 if Selbstverwaltung+Privatrechtl merge per UX-critique #7) → collapses to filter-button on desktop ≤ md and on mobile. Active-filter-chip-row above the list (MOJ pattern). Group headers in the chronological view stay (they ARE the status-scaffold).

7. **Vorgang-tab × Kategorie-filter coexistence**: render `(N gefiltert von M)` suffix in each `<VorgangsGruppe>` header when filter is active. Do not auto-clear.

8. **Sticky Frist-action**: on desktop ≥ md, "Frist in Kalender" promoted to sticky right-rail bottom band (or 4th column on ≥ xl). On mobile, fixed bottom-sheet "Frist-CTA". Demote "Brief speichern" + "Originaltext anzeigen" to overflow kebab-menu.

9. **LetterCard simplification** (Issue #1 of UX-critique, verifier-promoted to top ROI): card renders `[Status-dot] [FristChip] | [Behörde-Badge] [Brieftyp] | [Aktenzeichen]` + utility row with shield-icon-only Datenschutz-link + tiny-icon Authentizitäts-Badge with `aria-label`. Spec contract preserved (badge + cockpit-link present); visual weight reduced.

10. **`Reply` + `ReplyDraft` types** in `src/types/letter.ts` per research-scout Axis-1 #5 + ELSTER constants for attachments (20 files / 10 MB / 36 MB total / PDF+PNG+JPG only). `localStorage` key `govtech-de:v1:letter-replies`.

11. **Activity-log extension**: 5 new enum values (`reply_compose_started`, `reply_template_inserted`, `reply_draft_saved`, `reply_draft_deleted`, `reply_sent_simulated`). Template-id carried via existing `note` field, not enum. Drift-guard at `schemas.ts:248-254` covers compile-time consistency.

12. **Side-sheet UX**: shadcn/ui `<Sheet>` from right edge, 480px desktop / fullscreen mobile. Auto-flip to left in AR-RTL via Tailwind `rtl:` variants. Reply textarea stays LTR-DE (Behörde parses German) regardless of UI locale — spec must mention this.

13. **Speculative-2027 banner copy** (verbatim, single source-of-truth in domain §8 + restated in spec): "antrags-thread-gebundene bidirektionale Kommunikation" framing per revision #2. NOT "free-form mailbox."

14. **No "Neue Nachricht an Behörde" CTA** anywhere — replies are always in-thread. Drop research-scout's Axis-1 fallback recommendation #1.

15. **One new mock-letter required**: `letter-anna-standesamt-eheschließung-termin` (or similar) → Termin-Vorschlag-Brief that demoes `termin_antwort`. Without it, template is orphaned.

## What product-architect should NOT cover

1. **HEY-style "Bescheide / Anschreiben / Alle" toggle** — out per revision #2. Adds taxonomy without measurable scan-time benefit; revisit post-V1.5 ship.

2. **`adresse_aktualisieren` template** — out per revision #1b. Wrong fit for reply-to-letter; belongs as a future Stammdaten-initiated-Vorgang (own spec).

3. **Address-änderungs-Aufforderung mock letter** — out (no template to anchor it to in V1.5).

4. **`rechtsbehelf_skelett_einspruch` + `rechtsbehelf_skelett_widerspruch`** — defer to V1.5.1. Require Adressat-Risiko-Modal that domain has not yet written. Filming the demo without these is fine; primary wow is `nachweis_einreichen` for Schmidt-Familienkasse.

5. **AI "Formulierung verbessern"** — confirmed V1.5-OUT by domain (+verifier). V2-Hook stays in spec as feature-flag `feature.replyAIPolish: false`.

6. **`/ar/posteingang` URL-prefix routing** — non-bug per challenge C4. Out of V1.5.

7. **Real Versand to any channel** (mail, http, ELSTER, BundID) — confirmed Hard Constraint by domain §6. Spec must restate.

8. **Read-receipts on sent replies** — already redlined in V1 spec as `posteingang.card.markiere_gelesen` is "NIE Lesebestätigung". Architect must NOT add "Behörde hat geöffnet" or similar to outbound surface.

9. **Auto-archive after N days** — explicitly out per V1 spec § 10 (citizen-respectful framing).

10. **Multi-persona shared inbox / family Vorgangs-shared replies** — V2 territory.

## Flags for product-architect (UX-safeguards must-haves if PROCEED after revision)

- The pre-Versand confirmation modal copy must not moralize. Verifier-recommended: "Diese Demo simuliert den Versand. Es geht nichts an [Behörde]. Bitte verfassen Sie Ihre Antwort so, wie Sie sie tatsächlich an die Behörde senden würden — Beleidigungen oder Drohungen können nach §§ 185, 241 StGB strafbar sein, auch wenn dies hier nur eine Übung ist." 1 sentence, neutral, fact-stating, no scolding.
- The Adressat-Risiko-Modal (V1.5.1) for Skelett-Templates must say verbatim "Einspruch muss bei der **erlassenden Behörde** eingelegt werden (§ 357 Abs. 2 AO). Wir haben aus dem Briefkopf '[Behörde]' übernommen — bitte prüfen Sie das selbst, weil eine Einreichung bei einer falschen Stelle die Frist NICHT wahrt." Adressat-field is editable.
- The shield-icon-only Datenschutz-Cockpit-Link must have a visible focus ring (≥ 2px outline contrast 3:1) and an `aria-label` longer than 1 word — "Datenschutz-Cockpit für diesen Brief öffnen" or similar. BITV requires it.
- Side-sheet `<Sheet>` close-action must persist the draft via debounced auto-save (research-scout's Axis-1 #5 — 2s idle), not on close-click. Closing without explicit "Verwerfen" preserves work. Important for citizen-respectful framing.
- Activity-log entries for `reply_*` events must include `Rechtsgrundlage: 'Art. 6 Abs. 1 lit. a DSGVO Einwilligung'` per domain §5.D2. Datenschutz-Cockpit must surface them per-letter.
- The 4 V1.5.0 templates' bodies should be drafted by domain-expert (not the architect), reviewed by verifier (not by frontend-coder), and locked verbatim before i18n-localizer takes them. Body-text is the locus of RDG-line maintenance; we cannot let it bit-rot through translation.
- LetterCard simplification must keep the FristChip color-contrast ≥ 4.5:1 in both default and overdue states (V1 a11y-recheck verified `bg-red-50 text-red-900` works; V1.5 must not regress).

## Sources

- [BundID — BMDS](https://bmds.bund.de/themen/digitaler-staat/digitale-identitaeten/bundid)
- [§ 357 AO Adressat — Schwarz/Pahlke/Keß bei Haufe](https://www.haufe.de/id/kommentar/schwarzpahlkekess-ao-357-einlegung-des-einspruchs-23-adressat-des-einspruchs-357-abs2-ao-HI2067016.html)
- [§ 357 AO Form — Schwarz/Pahlke/Keß bei Haufe](https://www.haufe.de/id/kommentar/schwarzpahlkekess-ao-357-einlegung-des-einspruchs-211-schriftform-elektronische-form-oder-erklaerung-zur-niederschrift-HI6757587.html)
- [BFH III R 26/14 — Einspruch per einfacher E-Mail](https://www.bundesfinanzhof.de/de/entscheidung/entscheidungen-online/detail/pdf/STRE201510201)
- [Disclaimer Bestimmtheit — IT-Recht-Kanzlei](https://www.it-recht-kanzlei.de/disclaimer-sinn-unsinn.html)
- [BundID/EUDI Wallet 2026 — AKDB](https://www.akdb.de/newsroom/news/bundid-und-eudi-wallet-auf-dem-digitalen-staat-2026/)
