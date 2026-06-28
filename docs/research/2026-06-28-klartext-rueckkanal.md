---
topic: Klartext-Rückkanal → fertiger Widerspruch/Einspruch-Entwurf aus Alltagssprache
question: Should we build a plain-language free-text input under an explained Behörden-Brief that turns "what's wrong / what I want" into the CORRECT formal Rechtsbehelf-Entwurf (Widerspruch §69/§70 VwGO / Einspruch §347 AO / Widerspruch §84 SGG), shown as a DRAFT to confirm — and is that RDG-clean?
date: 2026-06-28
status: verified  # domain-expert validated 2026-06-28; → concept-verifier next
confidence: high
---

## TL;DR
- **Most of the chassis already exists.** Posteingang ships a full reply-compose system with three RDG-aware **Rechtsbehelf-Skelett** templates (`rechtsbehelf_einspruch_skelett` §AO, `rechtsbehelf_widerspruch_skelett` §VwGO/§SGG, `aussetzung_vollziehung_skelett`), correct norm-family routing per `letter.archetype`, a mandatory non-skippable **Pre-Insertion-Modal** (the RDG gate), verbatim-from-`de.json` token substitution (no free re-formulation), a "Entwurf — Sie prüfen/reichen ein" skeleton banner, a `skelett_footer_no_legal_advice` RDG line, and a Frist header sourced from `letter.fristen[].rechtsgrundlage` (never re-computed). See `src/components/posteingang/ReplyComposeContent.tsx`, `reply-templates.ts`, `reply-template-order.ts`, `PreInsertionModal.tsx`.
- **What is genuinely NEW in Idea B: the plain-language → form-fill bridge.** Today the skeleton body is a *verbatim template* with bracketed placeholders (`[kurze Begründung]`) the citizen must fill by hand, and the AI "Umformulieren" chips are **hard-disabled for skeleton templates** (`disabledForSkelett`). Idea B adds: free-text "Stimmt nicht, ich war im Mai schon umgezogen" → AI maps it into the **already-existing** skeleton's user-input slot (`begruendung_kurz`) as a fact statement, NOT new legal reasoning. This is additive, not a rebuild.
- **The RDG line is defensible for this exact framing.** Two independent legal anchors: (1) §2 Abs. 1 RDG only catches **"konkrete *fremde* Angelegenheiten"** — a citizen drafting *their own* Widerspruch is not a Rechtsdienstleistung at all.[^1][^2] (2) BGH *Smartlaw* (I ZR 113/20, 09.09.2021): a self-service question-answer document generator is a digital "Formularhandbuch", **not** an unzulässige Rechtsdienstleistung.[^5][^6] The boundary the demo must respect: schematic template-fill = erlaubnisfrei; **individualised legal assessment** ("in Ihrem Fall sollten Sie widersprechen, weil §… einschlägig ist") = Rechtsdienstleistung.[^3][^4]
- **Recommendation: PROCEED (revise scope).** Build the plain-language bridge as a *fact-capture → existing skeleton slot* feature, keep the AI strictly as a phrasing/structuring aid into the citizen's own draft, keep every existing guardrail (verbatim Frist, non-skippable modal, never-sent framing), and add hard limits so the AI never asserts a legal ground or success likelihood.

## Findings

### Sub-question 1 — Current code state: what reply/Rechtsbehelf machinery already exists

The reply system is one of the most mature surfaces in the repo. Concrete files and what each does:

- **`src/components/posteingang/ReplyComposeContent.tsx`** (~1770 lines) — the wrapper-agnostic compose body (rendered inline via `ReplyInlinePanel.tsx` or modal via `ReplyModalSheet.tsx`/`ReplySheet.tsx`). It contains: a template radio-picker, a free-text `<textarea>` for the body, attachment upload, a "send (simulated)" flow with a `PreVersandModal`, autosave-as-draft, and the **KI-Aktionen chips** (`umformulieren / kürzer / formeller / einfacher`).
- **Skeleton templates already exist.** The picker offers, when the letter qualifies: `rechtsbehelf_einspruch_skelett`, `rechtsbehelf_widerspruch_skelett`, `aussetzung_vollziehung_skelett` (plus non-Rechtsbehelf templates: `frist_verlaengerung`, `nachweis_einreichen`, `informative_rueckmeldung`, `termin_antwort`, `freitext`).
- **Norm-family routing is correct and matched to letter type**, in `src/lib/mock-backend/reply-template-order.ts → pickNormFamilie()`:
  - `steuerbescheid`, `familienkasse-nachweis` → **AO** (Einspruch, §347 AO family)
  - `krankenkasse-beitrag`, `berufsgenossenschaft-beitrag` → **SGG** (Widerspruch, §84 SGG)
  - `ihk-beitrag`, `beitragsservice-mahnung`, `abh-verlaengerung` → **VwGO** (Widerspruch, §69/§70 VwGO)
  - `aussetzung_vollziehung_skelett` → always `aussetzung_ao`
  - Unhandled archetype → **throws** (deliberate, so drift surfaces rather than landing in a wrong-norm draft — the comment explicitly calls this "RDG-relevant").
- **The skeleton is built by verbatim template substitution, NOT free generation.** `src/lib/mock-backend/reply-templates.ts → resolveReplyBodySync()` reads the body string verbatim from `de.json` (`posteingang.compose.templates.<id>.body_template_de`) and only substitutes tokens (`{absender_name}`, `{aktenzeichen}`, `{datum_bescheid}` from `letter.bescheid_dated_at`, `{frist_alt}` from `letter.fristen[0].datum`, etc.). Its header docstring locks Hard-Rule #1: *"Wir formulieren nichts neu… keine Wenn-dann-Sätze."* User-input slots (`begruendung_kurz`, `frist_neu_gewuenscht`, …) that are empty render as a visible bracketed placeholder `[kurze Begründung]` so the citizen sees what they must still fill.
- **The RDG gate already exists: `PreInsertionModal.tsx`.** Before a skeleton body is inserted, a non-skippable `role="alertdialog"` fires (Hard-Line §11.13: *never* a "don't show again" checkbox). Its body/title/CTA come from norm-family-specific i18n keys (`pre_insertion_modal.einspruch_ao` / `widerspruch_sgg` / `widerspruch_vwgo` / `aussetzung_ao`), with a mandatory extra Familienkasse-AO explainer when AO + `familienkasse-nachweis`. Every §-citation in it is wrapped by `NormZitatSpan`.
- **The free-text AI is already RDG-fenced.** In `ReplyComposeContent.tsx`, `KiAktionenChips` receives `disabledForSkelett` and the docstring states: *"RDG-sicher: bei Rechtsbehelf-Skeletten komplett gesperrt (die App formuliert keine rechtlichen Begründungen, § 2 RDG)."* So today, on a skeleton, the AID rewrite is OFF; the citizen edits the bracketed body by hand.
- **`src/data/letters.json` already carries the supporting fields:** `archetype`, `fristen[]` with `{typ: 'einspruch'|'widerspruch'|'zahlung'|…, datum, rechtsgrundlage}` (e.g. `"§ 355 AO"`, `"§ 70 VwGO"`, `"§ 84 SGG"`, `"§ 81 Abs. 4 AufenthG"`), `was_kann_ich_tun_options[]`, and `bescheid_dated_at`. The Frist shown to the citizen is the verbatim `datum` from the letter — `reply-templates.ts` formats it but never re-derives the deadline.
- **`src/lib/mock-backend/api.ts`** exposes `resolveReplyBody`, `saveReplyDraft`, `getReplyDraft`, `getRepliesForLetter`, `sendReplySimulated` (note: *simulated* — the "send" never leaves the mock backend). A separate `POST /api/reply/rewrite` route backs the rewrite chips.

**So: there is already an "Antwort verfassen" flow AND a Rechtsbehelf-Skelett generator AND it already takes free-text input in the textarea — but the free-text path is a manual editor, and the AI assist is intentionally OFF on skeletons. The plain-language → structured-fact bridge does not exist yet.**

### Sub-question 2 — Additivity: precisely new vs already built

| Capability | State | Where |
|---|---|---|
| Skeleton templates for Einspruch/Widerspruch (AO/VwGO/SGG) + Aussetzung | **Built** | `reply-templates.ts`, `de.json` template bodies |
| Norm matched to letter type (not generic) | **Built** | `reply-template-order.ts → pickNormFamilie` |
| Aktenzeichen, Anrede/Empfänger-Behörde, datum_bescheid auto-filled | **Built** | `resolveReplyBodySync` token map |
| Verbatim Frist from the letter (never re-computed) | **Built** | `{frist_alt}` ← `letter.fristen[].datum`; `FristCitedFormatHeader` cites `rechtsgrundlage` |
| Non-skippable RDG pre-insertion modal | **Built** | `PreInsertionModal.tsx` |
| "Entwurf — Sie prüfen/reichen ein" framing + RDG no-legal-advice footer | **Built** | `reply-skeleton-banner`, `skelett-footer-no-legal-advice` |
| Never auto-sent (only `sendReplySimulated`) | **Built** | `api.ts` |
| Free-text editing of the skeleton body | **Built** (manual) | the `<textarea>` |
| **Plain-language input → AI structures the citizen's facts into the skeleton's `begruendung_kurz` slot** | **NEW** | net-new |
| **AI on a skeleton at all** (today hard-disabled) | **NEW** (must be re-scoped, not just un-gated) | `disabledForSkelett` |
| **"What do you want?" intent capture** (e.g. recognise "I already moved in May" → fact, not legal claim) that helps pick *which* template the citizen likely needs | **NEW** | net-new, must stay a suggestion the citizen confirms |

**Bottom line:** Idea B is one focused addition — a plain-language fact-capture box whose output the AI maps into the *existing* skeleton's user-input slots as a neutral statement of facts, surfaced inside the existing draft + existing RDG gate. It is an *amplification* of the reply skeletons, exactly as the brief frames it.

### Sub-question 3 — Prior art

**Consumer / plain-language → formal-letter tools.**
- **Verbraucherzentrale Musterbriefe** ship as free PDF templates *and* as **interaktive Briefvorlagen** — a step-by-step generator that asks plain-language questions about the Sachverhalt and produces the finished letter (e.g. "Eine unberechtigte Forderung abwehren: interaktive Briefvorlage").[^7] This is the closest German precedent for "question/plain answer → finished letter" and it is run by a public-interest body, i.e. socially legitimate.
- **resolver.co.uk** (UK): free issue-resolution tool that keeps the case file, supplies jargon-free rights guides and email templates, and escalates to the ombudsman/regulator when needed.[^8] It is consumer-complaints, not admin-law, but it is the canonical "plain words in, structured complaint out, no legal advice" pattern.
- **GOV.UK** uses guided, plain-English step-by-step flows for appeals/complaints (e.g. benefit-decision "mandatory reconsideration") rather than free legal drafting — a model for *guided structuring without asserting legal grounds*.

**German Legal-Tech that auto-drafts Schriftsätze** (Flightright, wenigermiete/CONNY) does the drafting *as a service provider acting for the customer* under the **Inkasso/§10 RDG** registration — a different legal basis than a self-service citizen tool. We should NOT model on them, because their permission comes from being a registered Rechtsdienstleister, which the demo is not.

**The decisive precedent — BGH *Smartlaw* (I ZR 113/20, 09.09.2021).** Wolters Kluwer's document/contract generator builds letters/contracts from a question-answer catalogue for **self-service** by the user. The BGH held this is **not** an unzulässige Rechtsdienstleistung under §2 RDG — it is functionally a digital **"Formularhandbuch"** (formula handbook), because the program applies schematic rules to user inputs rather than performing an individual legal assessment of a third party's matter.[^5][^6] This is the cleanest authority that a self-service skeleton generator with question-driven fill is erlaubnisfrei.

**The §2 RDG boundary itself.**
- §2 Abs. 1 RDG: *"Rechtsdienstleistung ist jede Tätigkeit in konkreten **fremden** Angelegenheiten, sobald sie eine **rechtliche Prüfung des Einzelfalls** erfordert."*[^1][^2] Two cumulative conditions: (a) someone else's matter, (b) individual-case legal examination.
- For Idea B, condition (a) is *not even met*: the citizen is acting in **their own** Angelegenheit. A tool that helps a person help themselves is not "fremde Angelegenheit". (A registered-Rechtsdienstleister analysis only becomes necessary the moment the tool acts *for* the citizen vis-à-vis the authority.)
- The boundary jurisprudence: schematic finding/reading/reproducing/applying of norms, and template adaptation without genuine legal assessment, stays **erlaubnisfrei**; the line is crossed when the tool performs **"rechtliche Prüfung des Einzelfalls"** — e.g. concluding the Bescheid is rechtswidrig because §X applies to *these* facts.[^3][^4] The very phrasing the brief flags as forbidden ("in Ihrem Fall sollten Sie widersprechen, weil…") is exactly the individualised legal assessment that would tip it over.

### Sub-question 4 — Legal / quality flags (for domain-expert validation)

These are the hard lines Idea B must hold. The codebase already enforces most of them; the new AI bridge must inherit them.

- **(a) §2 RDG boundary — the AI must stay a *formulation/structuring* aid, never an *assessment*.**
  - ALLOWED: turn "ich war im Mai schon umgezogen" into a neutral factual sentence in the citizen's own Begründung slot ("Ich war zum Zeitpunkt des Bescheids bereits umgezogen; der zugrunde gelegte Sachverhalt trifft nicht zu."). This is restating the citizen's own facts in form-language — like Smartlaw filling a slot.
  - FORBIDDEN: the AI asserting a legal ground, naming a norm as "einschlägig in Ihrem Fall", predicting success ("Ihr Widerspruch hat gute Aussichten"), or recommending *whether* to file. Suggesting *which* template fits the letter type is OK only as a confirmable suggestion derived from `letter.archetype` (mechanical), not from a legal assessment of the citizen's facts.
  - Keep the existing `skelett_footer_no_legal_advice` line and consider strengthening it to an explicit §2 RDG / "keine Rechtsberatung, Formulierungshilfe" sentence near the plain-language box. **domain-expert must validate the exact wording.**

- **(b) Deadlines must be the verbatim German Frist from the letter — never re-computed.** Already enforced: `{frist_alt}` ← `letter.fristen[].datum`, and `FristCitedFormatHeader` cites `letter.fristen[].rechtsgrundlage` verbatim. The new feature MUST NOT let the AI compute, restate, or "estimate" a deadline (e.g. "ein Monat ab Zustellung" arithmetic). If the letter lacks a usable Frist, the skeleton path is already gated off by `hasRechtsbehelfFrist()` — keep that gate.

- **(c) Must never imply the draft was submitted/sent.** Already enforced: only `sendReplySimulated` exists; the skeleton banner says "Entwurf"; confirmation copy must keep the `[MOCK]`/"simuliert" framing. The new box's CTA must read like "Entwurf erstellen", and the success state must read "Entwurf bereit — Sie prüfen und reichen selbst ein", never "gesendet/eingelegt".

- **(d) Einspruch vs Widerspruch vs §84 SGG must be matched to the right letter type — not generic.** Already enforced by `pickNormFamilie` (AO ↔ Steuer/Familienkasse; SGG ↔ Kranken-/Berufsgenossenschaft; VwGO ↔ IHK/Beitragsservice/ABH) and by `pickFristDatumForNormFamilie` selecting the matching `fristen[].typ`. The plain-language box must **not** override this from free text — it routes through the same `letter.archetype`-driven selection. Confirm: §347 AO uses the term *Einspruch*; VwGO/SGG use *Widerspruch* (and the citizen-facing term must follow the norm, which the current per-norm i18n keys already do). Note the brief cites "§69 VwGO" for Widerspruch — the operative Form/Frist norm is **§70 VwGO** (Form und Frist des Widerspruchs); §69 VwGO opens the Vorverfahren. domain-expert should confirm which §-citation the citizen-facing copy uses; the data already uses `§ 70 VwGO` in `letters.json`.[^9][^10][^11]

## Implications for our demo
- **Build it as an additive "plain-language bridge", not a new screen.** Add a small free-text capture ("Was stimmt nicht? / Was möchten Sie?") that sits *above* or *inside* the existing skeleton compose flow. Its only job: produce a neutral fact-statement that the AI drops into the existing `begruendung_kurz` user-input slot of the already-selected skeleton template. Reuse `PreInsertionModal`, `FristCitedFormatHeader`, the skeleton banner, `sendReplySimulated`, and the norm routing untouched.
- **Re-scope, don't simply un-gate, the AI on skeletons.** Today `disabledForSkelett` blocks AI rewrite on skeletons for good RDG reasons. Idea B needs a *narrower* AI capability than the existing "umformulieren/formeller" chips: a one-shot "Aus meinen Worten einen Entwurf-Baustein machen" that is constrained by a system prompt to (i) restate the citizen's own facts, (ii) never assert legal grounds/success, (iii) never touch the Frist or the §-citation. This is a new, tightly-fenced tool — assistant-engineer territory.
- **Hero-fit:** this is a strong supporting-tier feature that amplifies the existing "Brief-Erklärer → Antwort/Rechtsbehelf" arc (PRD north-star #4). It is *not* the Umzug spine wow, but it's a credible "es hat es für mich getan" moment: explained letter → "say what's wrong in your words" → correct formal Widerspruch/Einspruch draft, deadline + Aktenzeichen + right authority already in place.
- **Copy guardrail to specify in the spec:** a visible "Formulierungshilfe, keine Rechtsberatung (§2 RDG)" line adjacent to the plain-language box, plus the existing skeleton banner. Keep DE Sie-Form.

## Open questions
- Exact RDG-safe wording of the plain-language disclaimer and the AI's fact-restatement boundary — **domain-expert + concept-verifier must lock this** before assistant-engineer writes the tool prompt.
- Should the plain-language box also *suggest which* Rechtsbehelf applies when the citizen is unsure? Safe only if the suggestion is derived purely from `letter.archetype` (mechanical) and presented as a confirmable default, not as advice. Needs a verdict.
- Does the citizen-facing copy cite §69 or §70 VwGO for the VwGO-Widerspruch? Data uses `§ 70 VwGO`; reconcile with the brief's "§69 VwGO".
- Keyless web visitors can't run the live KI turn (known repo gotcha) — the plain-language bridge needs an offline-graceful fallback (e.g. drop the raw text verbatim into the bracketed slot for manual editing), mirroring the existing rewrite-chip `source: 'fallback'` behaviour.

## Sources
[^1]: [§ 2 RDG — Begriff der Rechtsdienstleistung (dejure.org)](https://dejure.org/gesetze/RDG/2.html) — accessed 2026-06-28
[^2]: [§ 2 RDG — Einzelnorm (gesetze-im-internet.de)](https://www.gesetze-im-internet.de/rdg/__2.html) — accessed 2026-06-28
[^3]: [§ 5 RDG — erlaubte Nebenleistung (gesetze-im-internet.de)](https://www.gesetze-im-internet.de/rdg/__5.html) — accessed 2026-06-28
[^4]: [BGH baut liberale Legal-Tech-Rechtsprechung aus (Haufe)](https://www.haufe.de/recht/kanzleimanagement/legal-tech-bgh-baut-liberale-legal-tech-rechtsprechung-aus_222_569270.html) — accessed 2026-06-28
[^5]: [BGH: Vertragsgenerator Smartlaw ist zulässig — I ZR 113/20 (LTO)](https://www.lto.de/recht/juristen/b/bgh-izr11320-vertragsgenerator-smartlaw-legal-tech-keine-unzulaessige-rechtsdienstleistung-rdg-rechtsberatung) — accessed 2026-06-28
[^6]: [Wichtiges BGH-Urteil zu Legal Tech: Vertragsgenerator Smartlaw ist zulässig (WBS Legal)](https://www.wbs.legal/it-und-internet-recht/bgh-zu-legal-techdigitaler-vertragsdokumete-generator-smartlaw-ist-zulaessig-56819/) — accessed 2026-06-28
[^7]: [Alle Musterbriefe der Verbraucherzentrale (interaktive Briefvorlagen)](https://www.verbraucherzentrale.de/musterbriefe) — accessed 2026-06-28
[^8]: [Resolver — Free online tool for complaints and claims (UK)](https://www.resolver.co.uk/how-to-complain) — accessed 2026-06-28
[^9]: [§ 70 VwGO — Form und Frist des Widerspruchs (gesetze-im-internet.de)](https://www.gesetze-im-internet.de/vwgo/__70.html) — accessed 2026-06-28
[^10]: [§ 84 SGG — Frist und Form des Widerspruchs (gesetze-im-internet.de)](https://www.gesetze-im-internet.de/sgg/__84.html) — accessed 2026-06-28
[^11]: [Widerspruch einlegen — Muster + Abgrenzung Einspruch/Widerspruch (anwalt.de)](https://www.anwalt.de/rechtstipps/widerspruch-176029.html) — accessed 2026-06-28

---

## Domain validation

**Validated by:** domain-expert · **Date:** 2026-06-28 · **Verdict: SOUND (proceed with corrections + mandatory flags).**

Statutes read against primary sources this pass (verbatim quotes pulled, not paraphrased from the scout):
§ 2 Abs. 1 RDG (gesetze-im-internet.de), § 70 + § 69 VwGO (dejure), § 80 Abs. 1–2 VwGO (dejure), § 86a Abs. 1–2 SGG (dejure), § 84 SGG (dejure), § 347 / § 355 / § 361 AO (dejure). The scout's two legal anchors hold; the data norms in `letters.json` are correct; **but the scout missed the single most dangerous point — the suspensory-effect (aufschiebende Wirkung) trap on every Beitragsbescheid — which I am locking below.**

### 1) Verdict on the scout's legal anchors

- **§ 2 Abs. 1 RDG — CONFIRMED verbatim.** *"Rechtsdienstleistung ist jede Tätigkeit in konkreten fremden Angelegenheiten, sobald sie eine rechtliche Prüfung des Einzelfalls erfordert."* Two cumulative conditions (fremde Angelegenheit + Einzelfall-Prüfung). The scout's read is right: a citizen drafting their **own** Widerspruch fails condition (a) outright — it is not a Rechtsdienstleistung at all. Correct.
- **BGH *Smartlaw* I ZR 113/20 (09.09.2021) — citation correct, holding correctly characterised.** A schematic, question→document self-service generator is a digital "Formularhandbuch", not unzulässige Rechtsdienstleistung. The forbidden side the scout names ("in Ihrem Fall sollten Sie widersprechen, weil § … einschlägig ist") is exactly the individualised Einzelfall-Prüfung that tips it over. Correct. (Note for honesty: Smartlaw concerned a *commercial vendor's* generator that the BGH still cleared; our case is *a fortiori* safer because the user acts in their own matter — but Smartlaw is about the **schematic-vs-assessment line**, which is the line we must hold, so it remains the right anchor.)

### 2) RDG-safe boundary for the AI fact-restatement (LOCKED)

The AI is a **Formulierungshilfe**, not a Rechtsberater. It operates only on the citizen's own stated facts and only fills the existing skeleton's `begruendung_kurz` factual slot.

**MAY (erlaubnisfrei — neutral restatement of the citizen's own facts in proper form):**
- Restate the citizen's own assertion as a neutral first-person factual sentence: e.g. input *"stimmt nicht, ich war im Mai schon umgezogen"* → `begruendung_kurz` = *"Ich war zum Zeitpunkt des Bescheids bereits umgezogen. Der dem Bescheid zugrunde gelegte Sachverhalt trifft insoweit nicht zu."*
- Tidy grammar/structure, split run-ons, keep Sie-/Ich-form consistent, remove invective.
- Mark a gap the citizen must close as a bracketed placeholder (e.g. `[Datum des Umzugs]`) — never invent the value.
- Carry the citizen's own numbers/dates **verbatim** as the citizen stated them (it does not verify them).

**MUST NOT (would become Einzelfall-Prüfung / Rechtsdienstleistung):**
- Assess the merits ("der Bescheid ist rechtswidrig", "Ihr Einwand greift durch").
- Recommend *whether* to file ("Sie sollten Widerspruch einlegen") or predict success ("gute Erfolgsaussichten", "wird voraussichtlich abgeholfen").
- Name or apply a norm to the citizen's facts ("weil § … in Ihrem Fall einschlägig ist") or add any §-citation not already present verbatim in the letter.
- Touch, compute, restate, or "estimate" the Frist (no "ein Monat ab Zustellung" arithmetic).
- Re-route the Rechtsbehelf type from free text — the template choice stays mechanical, driven by `letter.archetype` via `pickNormFamilie`.
- Add legal conclusions, Beweisangebote characterised as legally sufficient, or Anträge beyond the verbatim template.

**Exact safe-wording pattern for the restatement (the system-prompt contract):**
> Restate ONLY the facts the user asserts, as neutral first-person Sachverhalt sentences in German (Sie-/Ich-Form), present/past tense as stated. Begin from the user's claim, not from a legal conclusion. Do not evaluate, recommend, predict, or cite any norm. If a needed fact is missing, insert a bracketed `[…]` placeholder; never invent it. Output is a factual building block for the citizen's own draft, nothing else.

A clean template for the produced sentence: *"Nach meinem Kenntnisstand trifft der zugrunde gelegte Sachverhalt nicht zu: [neutral restated fact]. Ich bitte um Überprüfung."* — assertion of the citizen's own facts, zero legal assessment.

### 3) Exact German on-screen disclaimer wording (LOCKED — i18n source = de.json, DE authoritative)

Place adjacent to the plain-language capture box AND keep the existing `skelett_footer_no_legal_advice` line:

> **Formulierungshilfe — keine Rechtsberatung.** Diese Funktion bringt **Ihre eigenen Angaben** in eine sachliche Form für Ihren Entwurf. Sie prüft Ihren Fall **nicht** rechtlich, bewertet die Erfolgsaussichten **nicht** und empfiehlt **nicht**, ob Sie einen Rechtsbehelf einlegen sollten (§ 2 RDG). Ob und was Sie einreichen, entscheiden Sie selbst.

Draft-state banner (unchanged framing, keep verbatim DE authoritative):

> **Entwurf — Sie reichen ein.** Dies ist ein Entwurf aus Ihren Worten. Er wird **nicht automatisch versendet**. Bitte prüfen Sie Text und Frist, bevor Sie ihn selbst bei der Behörde einreichen.

Frist line stays verbatim from `letter.fristen[].datum` + `rechtsgrundlage`, German authoritative, never recomputed and never translated into a recomputed deadline.

### 4) § 69 vs § 70 VwGO — REPAIRED + routing confirmed

- The brief's "§ 69 VwGO" for the Widerspruch is **the wrong operative norm.** § 69 VwGO opens the Vorverfahren (the objection procedure as such); the **Form und Frist des Widerspruchs is § 70 VwGO** (*"innerhalb eines Monats, nachdem der Verwaltungsakt … bekanntgegeben worden ist, schriftlich … zu erheben"* — confirmed verbatim). **`letters.json` is already correct: it cites `§ 70 VwGO`.** Citizen-facing copy must cite **§ 70 VwGO**, not § 69. No data change needed; correct the brief.
- **Routing confirmed against `letters.json` + verified statutes:**
  - `steuerbescheid`, `familienkasse-nachweis` → **Einspruch, § 347 AO** (statthafter Rechtsbehelf = *Einspruch*, confirmed § 347 AO; Frist § 355 AO; AdV § 361 AO). Data Frist `typ:"einspruch"` cites `§ 355 AO`. ✓ (Term must be *Einspruch*, never *Widerspruch*.)
  - `krankenkasse-beitrag`, `berufsgenossenschaft-beitrag` → **Widerspruch, § 84 SGG** (Frist 1 Monat, confirmed). Data cites `§ 84 SGG`. ✓
  - `ihk-beitrag`, `beitragsservice-mahnung`, `abh-verlaengerung` → **Widerspruch, § 70 VwGO**. Data cites `§ 70 VwGO`. ✓
  - `aussetzung_vollziehung_skelett` → § 361 AO (AO-Schiene) / § 80 Abs. 4 VwGO / § 86a Abs. 3 SGG analog — keep AO-only as built.

### 5) DANGER — suspensory effect (aufschiebende Wirkung) trap — NEW, the scout missed this

The brief flagged § 86a SGG; the real picture is **broader and hits every "Beitrag" archetype** across BOTH the SGG and the VwGO schienen. Verified verbatim:
- **§ 86a Abs. 1 SGG:** *"Widerspruch und Anfechtungsklage haben aufschiebende Wirkung."* **BUT Abs. 2 Nr. 1** removes it for *"Entscheidungen über Versicherungs-, Beitrags- und Umlagepflichten sowie der Anforderung von Beiträgen, Umlagen und sonstigen öffentlichen Abgaben"*. → For **`krankenkasse-beitrag`** and **`berufsgenossenschaft-beitrag`**, a Widerspruch does **NOT** suspend the Zahlungspflicht.
- **§ 80 Abs. 1 VwGO:** aufschiebende Wirkung is the rule; **BUT Abs. 2 Nr. 1** removes it *"bei der Anforderung von öffentlichen Abgaben und Kosten"*. → For **`ihk-beitrag`** and **`beitragsservice-mahnung`** (Rundfunk-/IHK-Beiträge = öffentliche Abgaben), a Widerspruch likewise does **NOT** suspend the payment duty. Both schienen permit a separate Aussetzungsantrag (§ 86a Abs. 3 SGG / § 80 Abs. 4 VwGO), which is why the AdV skeleton exists as a *separate* path.

**Consequence for the UI:** on any Beitragsbescheid the Widerspruch-draft path must NOT imply that filing pauses the payment. Several of these letters carry BOTH a `typ:"widerspruch"` and a `typ:"zahlung"` Frist (e.g. the berufsgenossenschaft-beitrag at lines ~1146–1158) — the payment Frist is independent and runs on. Surface a neutral, non-advisory hint and keep both Fristen visible:
> **Hinweis:** Ein Widerspruch gegen einen Beitragsbescheid hat **keine aufschiebende Wirkung** (§ 86a Abs. 2 SGG / § 80 Abs. 2 VwGO). Die Zahlungsfrist läuft unabhängig vom Widerspruch weiter. Eine Aussetzung müssten Sie gesondert beantragen.

This is a factual statutory statement (erlaubnisfrei, not Einzelfall-advice) and is *required* so the demo does not mislead.

### 6) Safe-to-ship letter set for v1

**Ship the plain-language → Begründung bridge first on the AO Einspruch path:**
- ✅ **`steuerbescheid` (Einspruch § 347/§ 355 AO)** — cleanest: own matter, Smartlaw-grade schematic fill, AdV is a known separate path, no SGG/VwGO Abgaben-suspension subtlety on the *Einspruch* itself beyond the existing Familienkasse-AO explainer. Recommended hero example.
- ✅ **`familienkasse-nachweis` (Einspruch § 347 AO)** — already has the mandatory Familienkasse-AO explainer in `PreInsertionModal`; safe with that explainer kept.

**Ship only WITH the §6-suspension hint rendered (Beitrag letters):**
- ⚠️ **`krankenkasse-beitrag`, `berufsgenossenschaft-beitrag` (§ 84 SGG)** and **`ihk-beitrag`, `beitragsservice-mahnung` (§ 70 VwGO)** — allowed in v1 only if the §86a/§80 no-suspension hint + the independent Zahlungsfrist are shown. Otherwise defer.

**Defer from this feature in v1:**
- 🚫 **`abh-verlaengerung`** — the operative action is `termin_buchen`/`antragstellung` (§ 81 Abs. 4 AufenthG Fiktionswirkung), NOT a Widerspruch. Drafting a Widerspruch here is the wrong remedy and could mislead a resident on an aufenthaltsrechtlich high-stakes deadline. Keep it OUT of the plain-language Rechtsbehelf path.
- 🚫 `standesamt-urkunde`, `renteninfo`, `buergeramt-meldung`, `sonstiges` — no Rechtsbehelf-Frist / not an anfechtbarer belastender VA in these mocks; the skeleton path is already gated off by `hasRechtsbehelfFrist()`. Keep gated.

### 7) Mandatory on-screen flags

- `[MOCK]` / **2027-speculative** watermark on the draft surface; this is a prototype, no real Behörde involved.
- Nothing may imply the authority **received, read, or is processing** anything — only `sendReplySimulated`; success copy = *"Entwurf bereit — Sie prüfen und reichen selbst ein"*, never *"gesendet/eingelegt/eingegangen"*.
- **Federalism labels precise:** Einspruch § 347 AO = bundeseinheitliches Steuerrecht (Finanzamt = Landesbehörde, Steuerrecht bundesrechtlich). Widerspruch § 70 VwGO (IHK/Rundfunk) and § 84 SGG (Kranken-/Berufsgenossenschaft) = Verwaltungs-/Sozialrechtsweg; these are not "one federal procedure" — keep the per-norm term and norm exact (Einspruch≠Widerspruch). Krankenkassen/BG = Selbstverwaltungskörperschaften, not Bundesbehörden; Rundfunkbeitrag is by the Landesrundfunkanstalten (Beitragsservice acts for them), Landesrecht (Rundfunkbeitragsstaatsvertrag) — do not label it a Bundesvorgang.
- The "Formulierungshilfe — keine Rechtsberatung (§ 2 RDG)" line is mandatory adjacent to the capture box.

### Open items handed to concept-verifier

- "Should the box suggest *which* Rechtsbehelf applies when the citizen is unsure?" — **domain answer: only as a mechanical default derived from `letter.archetype` (Smartlaw-schematic), presented as a confirmable suggestion, never as advice.** Confirm strategic priority.
- Offline-graceful fallback (keyless web) must drop the citizen's raw text **verbatim** into the bracketed slot (no silent legal phrasing) — matches existing `source:'fallback'` behaviour.

