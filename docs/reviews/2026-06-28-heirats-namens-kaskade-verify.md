# concept-verifier verdict — Idea D "Heirats-/Namens-Kaskade"

_Date: 2026-06-28 · Verdict: **REVISE** (defer to STRETCH after Pass-2 A/B) · Filed by orchestrator (verifier's Write was tool-blocked)._

## Verdict: REVISE — ship D as a STRETCH vertical AFTER Pass-2 A/B (Kindergeld, Wohngeld), not now

Concept is the soundest "autopilot is a pattern, not an Umzug one-trick" proof in the backlog and the law (§1355 BGB reform, in force 1 May 2025) is current and favourable — but it **fails the demo-impact gate as a now-bet** on two grounds: it queue-jumps the spine's own named next bet, and the load-bearing honesty split it depends on does not yet exist in the shared receipt component. Right idea, wrong slot; the receipt must be re-engineered first.

### The four hard questions
- **(a) Amplify or dilute?** Amplifies the thesis, disperses the timing. One cascade can land viscerally in a 3-min Loom; a second full slow-down beat dilutes it — and the 2026-05-30 weak-points audit shows the FIRST cascade's narrative wasn't yet airtight. Ship D later as a short pattern-reveal coda, not cascade #2 now.
- **(b) Is the "re-issued, not auto-changed" split airtight?** Not yet — `ValueReceiptCard.tsx` renders a SINGLE `behoerden_count` stat. The mandated "Register aktualisiert: 3 Behörden" vs "Nachweise neu zu beantragen: 3 — persönliche Vorsprache" split is a new slot in a shared spine component + a `ValueReceipt` type change + 6-locale i18n. Without it, D re-introduces the "documents auto-change" fantasy the cut-list exists to kill.
- **(c) Generalise in place vs fork?** Generalise `InlineCascade` in place (orphaned-component lesson) — but that is a refactor of a SHIPPED spine component (Umzug couplings: `TRANSPORT_LAYER`, `ZUKUNFT_ROWS`, §17 BMG Termin beat, `MeldebestaetigungInlineBeat`), requiring mandatory Umzug spine-e2e + a11y regression after.
- **(d) Biggest insider attack:** *"You're showing me that getting married auto-renews my passport."* No German authority re-issues Perso/Pass/eAT without in-person biometrics. Only defence = the two-line split, which doesn't exist yet.

### requiredCorrections[] (the spec MUST carry these — when D is eventually built)
1. **Sequence after Pass-2 A/B.** Do not enter the pipeline ahead of Kindergeld/Wohngeld. Promoting D ahead of them is a **spine-bet change that must be made in `demo-spine.md` FIRST — escalation, not a verifier call.**
2. **Build the two-line ValueReceipt split BEFORE the cascade** (extend `ValueReceiptCard` + `ValueReceipt` type + 6-locale i18n); Behörden count = exactly 3 (Melderegister, DRV, Finanzamt/BZSt); re-issuance count = 3 (Perso, Pass, eAT), never summed into the Behörden figure. Re-run Umzug spine e2e + a11y after.
3. **Three domain corrections verbatim:** no AZR auto-row (§11 BMeldDÜV = address-only); eAT = D-row "eAT neu zu beantragen (Vorsprache + Lichtbild)", booking-only behind §18 PAuswG, never "aktualisiert"; KBA behind `visibleIf(haltereigenschaft)`, OFF for Anna.
4. **Dokumente-Vault "Nachweise neu" beat** renders Perso/Pass/eAT as TO-DO rows (in-person, old document invalid), structurally distinct from confirmed cascade rows; new Krankenkassen-Karte = consent (B), not Behörde.
5. **i18n:** name the four §1355 paths correctly; cite the 1-May-2025 date to BMJV (not §-text); retroactive Doppelname = fresh Standesamt-Erklärung, never automatic; copy must not imply the app registers the marriage.
6. **Generalise `InlineCascade` in place** behind a vertical descriptor; enumerate + parameterise the Umzug couplings; require spine-regression verification.
7. **Reconcile the persona seed FIRST.** `personas.md:7-13` has Anna partnered (DE partner) + child born 2024-11-03; the research's `ledig` + Tobias Becker + Lev Petrov-Becker is a NEW state not in the persona doc. Confirm canonical state + update `personas.md`/`personas.json` before the spec hard-codes names.
8. **Resolve the 2. BMeldDÜV recipient set** (pure name-change vs Eheschließung-event) with domain-expert before authoring the table — confirm A-row set is exactly {Melderegister, DRV, BZSt/FA}.

### spineImpact
POSITIVE as a post-A/B stretch; NEGATIVE as a now-bet (queue-jumps Kindergeld/Wohngeld; piles onto a not-yet-airtight first-cascade Loom; touches shared spine components, carrying hero-regression risk).

### biggestRisk
Blurring the 3 auto-updated registers with the 3 re-issued credentials → the whole cascade reads as fantasy to a Meldewesen insider. Defence = the airtight two-line split (does not exist today) + the cut-list (no AZR/unconditional-KBA auto-row).

---

_Grounding + domain validation: `docs/research/2026-06-28-heirats-namens-kaskade.md`. Decision pending user escalation (spine-bet change)._
