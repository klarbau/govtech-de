---
topic: "Heirats-/Namens-Kaskade" — a SECOND inline-cascade vertical (Ehename §1355 BGB) reusing the Umzug engine
question: Can the existing InlineCascade + ValueReceipt machinery carry a name-change trigger ("ich habe geheiratet und heiße jetzt anders"), propagating the NEW Ehename through the competent registers and surfacing which Nachweise get RE-ISSUED — without rebuilding the engine and without claiming anything that's legally fantasy?
date: 2026-06-28
status: verified
confidence: high
---

## TL;DR
- **Reuse is real, not aspirational.** The Umzug cascade is already a generic block-A/B/D engine: a static recipient table (`BLOCK_A`/`BLOCK_B`/`BLOCK_D` in `umzug.ts`) → an async generator → events → a frontend-derived row view (`InlineCascade.tsx`) → ValueReceipt climax. Idea D needs a **new recipient table + new orchestrator + a new `preview_*`/`starte_*` tool pair**, not new machinery. The transport-layer / eID-gate / consent / value-receipt logic is generic.
- **The law is current and favourable.** The Namensrecht reform took effect **1 May 2025**; §1355 BGB now offers four name paths (keep both names = default, one spouse's name as common Ehename, **echter Doppelname** with/without hyphen, child double-names). Verified against BMJV + dejure.[^1][^2][^3]
- **The honest beat is "RE-ISSUED, not auto-changed."** Personalausweis and Reisepass become **invalid** with the old name and must be **re-applied in person** at the kommunale Behörde — the cascade must show them as *to-do / Nachweis wird neu ausgestellt*, never as silently mutated.[^4][^5] What genuinely propagates as a data attribute: the **Melderegister** (via Standesamt), and from there the BMG/BMeldDÜV onward-recipients (Rentenversicherung, BZSt/Finanzamt, KBA, AZR/Ausländerbehörde).[^6][^7]
- **Anchor persona = Anna Petrov.** She is `ledig`, partner is Tobias Becker (deutsch), child already carries the Doppelname "Petrov-Becker" — a clean marriage trigger. Bonus realism beat: her **Aufenthaltstitel** must reflect the new name → a genuine eID-gated ABH row (reuses the existing §18 PAuswG pattern).
- **Recommendation: PROCEED (revise scope).** Proceed as a supporting-or-spine cascade vertical, with a tight cut-list (see Implications). It is the cleanest "this is a pattern, not an Umzug one-trick" proof in the backlog.

## Findings

### Sub-question 1 — What exactly is the Umzug cascade machinery (so D reuses, not rebuilds)?

The engine has four cleanly separable layers; only the **data table** is Umzug-specific.

**(a) Recipient tables — the only genuinely domain-specific part.** `src/lib/mock-backend/autopilot/umzug.ts` holds three exported arrays of plain entries:
- `BLOCK_A` (auto, statutory): `behoerdeId`, `aktion`, `rechtsgrundlage`, `agentLabel` (delegated agent-voice DE line), `datenkategorien[]` (Datenminimierung), `latencyMs`, an optional `briefTemplate` (Absender / Betreff / Floskel / Abschluss with `{az}`,`{stichtag}`,`{neue_adresse}`,`{name}` substitution), and `visibleIf(persona)`.
- `BLOCK_B` (consent, private recipients): same shape + `visibleIf` gating (e.g. Arbeitgeber only if `angestellt`).
- `BLOCK_D` (eID-gated, persona-dependent): same shape + a `personaFlag` and a mandatory `briefTemplate`.

**(b) Orchestrator.** `umzugAutopilot()` is an async generator: it walks `BLOCK_A` → `BLOCK_D` (yields `pending_eid_confirmation`, does NOT await) → `BLOCK_B` (consent-filtered), yielding `AutopilotStep` objects (+ optional minted `Letter`). It also emits a `UebermittlungsLogEntry` per confirmed step (`behoerde_zu_behoerde` for A, `app_aktivitaet` for the private B recipients) and has a `FAILURE_RATE` 5% injection gated by a `reliable` flag. A parallel resilient "saga" engine (`orchestration/saga-defs.ts`, referenced in-file) reuses the SAME `BLOCK_A/B/D` arrays — so a new vertical's table should be authored once and consumed by both paths.

**(c) Trigger flow (confirm-gated tool pair).** In `src/lib/ai/tools.ts`:
- `preview_umzug` → `api.previewUmzug(...)` — **read-only, no confirm**, builds the `<UmzugConfirmCard>`.
- `starte_umzug` → `api.startUmzug(...)` — **confirm-gated**. The CRITICAL GATING RULE (tools.ts §7.3 comment) is that `starte_umzug` is held STRUCTURALLY by the client (`requiresConfirmation('starte_umzug')` in `tool-schemas.ts`) until the citizen clicks "Umzug starten" — not merely by prompt. `buildUmzugPreview(persona, input)` produces the preview block structure without mutating state.

**(d) Frontend view.** `src/components/autopilot/InlineCascade.tsx` subscribes to the tick stream for one `vorgangId`, derives rows purely on the frontend (`BLOCK_RANK` A→D→B, drops block C), and decorates each row from STATIC frontend maps: `TRANSPORT_LAYER` (`osci_xmeld` | `fit_connect` | `einwilligung`), `ZUKUNFT_ROWS` ([ZUKUNFT: Registermodernisierung/NOOTS] chip), a §33 Frist chip, per-row `rechtsgrundlage` micro-line. The eID-gate rows render a "Mit eID bestätigen" button → `api.bestaetigeAutopilotSchritt`. The climax: `ValueReceiptCard` (Once-Only field count + Behörden count + "ca." time saved + Stammdaten source line), a Posteingang landing counter, and a long `disclaimer_long` whenever FIT-Connect chips are present, else a short `[MOCK]` line.

**Hard-coded Umzug couplings that a second vertical must NOT inherit blindly:** these are address-specific and would have to be generalised or excluded:
- `TRANSPORT_LAYER`/`ZUKUNFT_ROWS`/`RUECKMELDUNG_BEHOERDE_ID`/`BUERGERAMT_BEHOERDE_ID`/`FIT_CONNECT_BEHOERDE_IDS` are keyed on the Umzug behoerde-ids.
- The Termin-Autopilot beat (`termin-anmeldung-${vorgangId}`, §17 BMG 14-day Anmeldefrist) is Umzug-only.
- The §17 BMG / `stichtag` / `neue_adresse` reading (`readStichtagIso`, `formatAdresse`) is move-specific.
- `MeldebestaetigungInlineBeat` (Once-Only coda) is the Umzug Meldebestätigung — name-change has its **own** re-verifiable artefact (an Eheurkunde / Namensänderungsbestätigung), not the Meldebestätigung.

### Sub-question 2 — Additivity: reusable as-is vs genuinely new

**Reusable as-is (no change):**
- The async-generator orchestration pattern, step status state machine (`in_progress`/`pending_eid_confirmation`/`confirmed`/`failed`), event emission, and `bestaetigeAutopilotSchritt` eID path.
- `InlineCascade.tsx`'s row rendering, eID button, consent-gate hint, focus-continuity, ValueReceipt mount/scroll, Posteingang counter, A→D→B ranking.
- `ValueReceiptCard`, the Once-Only counter, the Stammdaten source-line, the consent-class and eID-class visual language, the `[MOCK]` disclaimer plumbing.
- The confirm-gating mechanism (`requiresConfirmation(...)` in `tool-schemas.ts`) — just register the new tool name.

**Genuinely new (must be authored):**
1. **A new orchestrator + recipient table**, e.g. `src/lib/mock-backend/autopilot/namensaenderung.ts` with its own `BLOCK_A/B/D` arrays (Ehename-specific Behörden, Normen, Datenkategorien = `neuer_name`/`geburtsname`/`ehename`, brief templates).
2. **A new assistant tool pair** `preview_namensaenderung` / `starte_namensaenderung` in `tools.ts` (+ `tool-schemas.ts` dispatch + `requiresConfirmation`), with a name-options input (`ehename_typ`: `keiner`/`name_a`/`name_b`/`doppelname`, hyphen flag).
3. **Name-change-specific frontend decoration:** generalise `InlineCascade` to accept a vertical descriptor (transport-layer map, zukunft set, the "RE-ISSUED Nachweise" beat) OR fork a thin `NamensCascade` wrapper. The orphaned-component lesson (Stammdaten v2) argues for **generalising in place** behind a prop, not a parallel un-wired component.
4. **A "Nachweise werden neu ausgestellt" sub-beat** in the Dokumente-Vault: Personalausweis + Reisepass shown as *invalid → must be re-applied in person* (a to-do row, NOT an auto-confirmed cascade row). This is the new domain-honest payload and the demo's differentiator.
5. **Vorgang.typ `'namensaenderung'`**, persona seed touches (Anna `familienstand`, a new Eheschließung Vorgang), and i18n keys.

### Sub-question 3 — Domain realism (the make-or-break)

**§1355 BGB / Namensrecht reform — CURRENT as of 2026.** The *Gesetz zur Änderung des Ehenamens- und Geburtsnamensrechts und des Internationalen Namensrechts* took effect **1 May 2025**.[^1][^3] §1355 BGB name paths for spouses:[^2]
- **Default (no Ehename determined):** each spouse keeps their name at the time of marriage — §1355(1).
- **Common Ehename = one spouse's name:** either spouse's Geburtsname or currently-used Familienname — §1355(2).
- **Echter Doppelname (NEW since 1 May 2025):** a name combined from both spouses' names, with or without hyphen, order free (e.g. Petrov-Becker / Becker-Petrov) — and existing marriages may **retroactively** re-declare a Doppelname.[^1][^3] If a name is already composite, only one of its parts may enter the new Doppelname (no endless chains).[^1]
- The Ehename is **declared at the Standesamt** (kommunal), at marriage or later via beglaubigte Erklärung — §1355(4).[^2]

**What realistically propagates, and HOW — the federalism map:**

| Recipient | Träger-Ebene | How the new name reaches it | Cascade class |
|---|---|---|---|
| **Standesamt** | kommunal | Declares/registers the Ehename; the legal source event. NOT something "we" trigger — the citizen must marry/declare. | **out of cascade** (precondition) |
| **Melderegister / Meldebehörde** | kommunal | Standesamt notifies the Melderegister of the name change.[^6][^7] | A (statutory, auto) |
| **Personalausweis** (Bürgeramt / Personalausweisbehörde) | kommunal | Old ID is **INVALID**; must be **re-applied IN PERSON**, old one confiscated.[^4][^5] | **D-like / to-do, RE-ISSUED — NOT auto** |
| **Reisepass** (Passbehörde) | kommunal | Old passport is **INVALID**; must be **re-applied IN PERSON**.[^4][^5] | **D-like / to-do, RE-ISSUED — NOT auto** |
| **Finanzamt / Steuer-ID** | Land (FA) / Bund (BZSt) | Marriage itself flows Standesamt→BZSt→FA automatically; the **IdNr (§139b AO) stays constant**, only the name attribute + Steuerklasse update.[^7] | A (statutory, auto — name attribute only) |
| **Rentenversicherung (DRV)** | Bund | Meldebehörde transmits to the Datenstelle der Rentenversicherung under BMG/BMeldDÜV.[^6] | A (statutory, auto) |
| **Krankenkasse** | (gesetzlich, öffentlich-rechtlich) | Must be **notified**; a **new card is issued**.[^7] | B-like (consent / notification) |
| **Ausländerbehörde / Aufenthaltstitel** | Land | Meldebehörden transmit Eheschließung data (incl. names) to ABH/AZR;[^6] BUT the eAT **card** carrying the name needs a user-driven update (§18 PAuswG eID pattern) — re-use the existing Umzug ABH honesty line (no Melderegister→ABH *push* of the document itself). | **D (eID-gated)** |
| **Arbeitgeber, Bank, Versicherung** | **private — NOT Behörden** | Consent-based notification only. | B (consent) — must NOT be counted as "Behörden" |

**HONESTLY CASCADABLE vs FANTASY:**
- **Honest:** the *new-name attribute* propagating to the **Melderegister** and its statutory BMG/BMeldDÜV onward-recipients (DRV, BZSt/FA, KBA, AZR); a **list of Nachweise that must be RE-ISSUED** (Personalausweis, Reisepass — in person; new Krankenkassen-Karte); the eID-gated ABH document-update beat; consent rows for private recipients.
- **FANTASY (do NOT imply):** that **marriage itself** is auto-registered by the app (it requires Standesamt declaration — the app's trigger presupposes the marriage already happened / the Ehename already declared); that **Personalausweis/Reisepass auto-change** (they're re-issued in person, old ones invalidated); that documents in the vault silently mutate to the new name. The cut-list that already killed the Familie auto-cascade applies here: the legitimate beat is *attribute propagation + a re-issuance worklist*, not "your new passport is ready."

### Sub-question 4 — Flags for domain-expert / concept-verifier

1. **§1355 currency:** reform in force 1 May 2025; Doppelname is the headline. Confirm the i18n copy names the four paths correctly and does not over-promise the retroactive Doppelname as automatic.
2. **"Re-issued, not auto-changed" honesty line** is mandatory on the Personalausweis/Reisepass rows — these are **in-person, old-document-invalid** beats, rendered as to-dos in the Dokumente-Vault, never as `confirmed` auto rows.
3. **eID vs consent classing:** Melderegister/DRV/BZSt-FA = statutory auto (A); ABH eAT update = eID-gated (D, §18 PAuswG, reuse the existing ABH line incl. "den Vorsprachetermin vergibt die Behörde"); Krankenkasse + private recipients = consent (B). Do NOT count Arbeitgeber/Bank/Versicherung in any "X Behörden informiert" figure.
4. **`[MOCK]` / no real transmission:** reuse the existing `disclaimer`/`disclaimer_long` plumbing; nothing implies real Standesamt or register writes.
5. **Persona anchor = Anna Petrov** (`ledig`, partner Tobias Becker deutsch, child Lev Petrov-Becker already a Doppelname). The marriage→Ehename trigger is natural AND her Aufenthaltstitel gives a real eID-gated ABH row — a stronger, more differentiated demo than the already-`verheiratet` Schmidt family. Seed touch needed: a new Eheschließung Vorgang + `familienstand`/`fruehere_namen` handling.

## Implications for our demo
- **PROCEED as a second cascade vertical** — it is the best available proof that the autopilot is a *pattern*, not an Umzug one-off, with strong, current legal grounding (§1355 reform is a live 2025 story).
- **Generalise `InlineCascade` in place behind a vertical descriptor** (transport map, zukunft set, the re-issuance beat) rather than forking an un-wired `NamensCascade` — heed the orphaned Stammdaten-v2 lesson.
- **Author one recipient table** (`namensaenderung.ts` `BLOCK_A/B/D`) consumed by BOTH the generator and the saga engine, mirroring `umzug.ts`.
- **The differentiating screen is the Dokumente-Vault "Nachweise neu" sub-beat:** Personalausweis + Reisepass as *invalid → in-person re-application* to-dos; new Krankenkassen-Karte; an issued Eheurkunde/Namensänderungsbestätigung as the re-verifiable artefact (the name-change analogue of the Meldebestätigung coda).
- **Reuse the §18 PAuswG ABH eID row verbatim** for the Aufenthaltstitel-name-update — it is already domain-vetted in `umzug.ts`.
- **Hard cut-list for the architect:** no auto-registration of the marriage; no auto-changed ID documents; no counting private recipients as Behörden; ValueReceipt must distinguish "Register aktualisiert" from "Nachweise neu zu beantragen."

## Open questions
- Does the demo want a **pre-marriage** flow ("Verlobte können Ausweis/Pass vorab beantragen, sodass er am Hochzeitstag fertig ist"[^5]) as an extra beat, or only post-marriage attribute propagation? (Architect decision.)
- Exact **BMeldDÜV recipient list** for a *name-change* (vs the Eheschließung event) — the searches confirm DRV, BZSt, KBA, AZR receive regular meldebehörde transmissions, but the precise per-Anlass attribute set should be domain-expert-verified against the 2. BMeldDÜV before the recipient table is finalised.
- Whether the new-name attribute reaching the **Finanzamt** is best modelled as the same statutory beat as Umzug's §19 AO row or a distinct §139b-AO-name-attribute beat (cosmetic, but affects the brief copy).

## Sources
[^1]: [BMJV — Neues Namensrecht gilt ab dem 1. Mai: Echte Doppelnamen für Ehepaare und Kinder](https://www.bmjv.de/SharedDocs/Pressemitteilungen/DE/2025/0429_Namensrecht.html) — accessed 2026-06-28
[^2]: [§ 1355 BGB — Ehename (dejure.org)](https://dejure.org/gesetze/BGB/1355.html) — accessed 2026-06-28
[^3]: [Gesetz zur Änderung des Ehenamens- und Geburtsnamensrechts (Berlin.de / Standesamt)](https://www.berlin.de/standesamt/namensaenderung/artikel.1540218.php) — accessed 2026-06-28
[^4]: [Personalausweisportal — Muss ich einen neuen Personalausweis beantragen, wenn sich mein Name ändert?](https://www.personalausweisportal.de/SharedDocs/faqs/Webs/PA/DE/Haeufige-Fragen/1_beantragung_faq/J1_Personalausweis_Namensaenderung_1_10.html) — accessed 2026-06-28 (search-snapshot; direct fetch returned HTTP 400, content corroborated by [^5])
[^5]: [Bundesportal / Reisepass wegen Namensänderung durch Heirat neu beantragen](https://verwaltung.bund.de/leistungsverzeichnis/de/leistung/99085001012010) — accessed 2026-06-28
[^6]: [Abschnitt 5 BMG — Datenübermittlungen (buzer.de) + 2. BMeldDÜV (jurawelt.com)](https://www.buzer.de/gesetz/10628/b27570.htm) — accessed 2026-06-28
[^7]: [Steuerring / Steuerklasse Hessen — Nach der Hochzeit: Namenswechsel, Steuerklasse, Steuer-ID bleibt](https://www.steuerring.de/steuererklaerung-hilfe-news/news/nach-der-hochzeit-checkliste-fuer-namenswechsel-steuerklasse-co.html) — accessed 2026-06-28

---

## Domain validation

**Validated by:** domain-expert · **Date:** 2026-06-28 · **Verdict:** SOUND (with corrections) · **Confidence:** high

Primary sources read this pass: §1355 BGB (dejure.org, full Absatz text); §28 PAuswG + §11 PassG (Ungültigkeit on name change, re-apply in person — gesetze-im-internet / Bundesportal); 2. BMeldDÜV §§1, 6, 8, 11 (the regular onward-recipient set + per-recipient trigger norms); BZSt IdNr FAQ (§139b AO, IdNr constant on name change); eAT-Übertrag service descriptions (RLP/Düsseldorf/Hamburg).

The scout's thesis holds: the cascade is a register-attribute-propagation + re-issuance worklist, not "marriage auto-registered" or "documents silently mutated." Reuse is real. **Three precision corrections are mandatory before the recipient table is authored** — the scout was loose on the AZR trigger and slightly over-promised the ABH row as a clean register push.

### Correction 1 (load-bearing) — AZR does NOT receive the name change via 2. BMeldDÜV
The scout's row table lists "AZR" as a statutory auto-recipient of the new name. **§11 2. BMeldDÜV transmits to the Ausländerzentralregister only on Anschriftenänderung (address change) and Auskunftssperr-Eintragung/-Aufhebung (§51 BMG) — NOT on a name change.** So in a *pure name-change* Anlass, no Melderegister→AZR name push fires. The AZR is kept current on names through the **Ausländerbehörde's own AZRG-Meldepflichten** when the citizen appears to update the eAT — i.e. it is downstream of the in-person eAT-Übertrag, not a parallel auto-row. Cut "AZR" as an A/auto row in the name cascade.

### Correction 2 — the Aufenthaltstitel/eAT row is a RE-ISSUANCE TO-DO, not a clean register push
Sources confirm the eAT must be **neu ausgestellt ("Übertrag")**, applied **in person at the Ausländerbehörde with a current biometric photo**, produced by the Bundesdruckerei (several weeks), with a Fiktionsbescheinigung bridging the gap. This is materially the same honesty class as Personalausweis/Reisepass: the *document* is re-issued in person; only the **initiation/booking** can defensibly sit behind the existing §18 PAuswG eID-gated pattern (user-driven, no Melderegister→ABH push). Keep it as a **D row whose payload is explicitly "eAT neu zu beantragen (Vorsprache + Lichtbild)"**, never "eAT aktualisiert." The scout's instinct to reuse the Umzug ABH §18 line is right, but the *card* must read as a to-do, not as done.

### Correction 3 — KBA row is conditional and narrow
§8 2. BMeldDÜV → Kraftfahrt-Bundesamt fires only if the person is a **Fahrzeughalter**, and the citizen still separately needs the **Zulassungsbescheinigung (Fahrzeugschein/-brief) corrected at the Zulassungsstelle** — the KBA register update does not re-print the citizen's papers. Anna Petrov holds no vehicle → KBA row should be `visibleIf(haltereigenschaft)` and OFF for her. Do not show an unconditional KBA row.

### Confirmed as stated by the scout
- **§1355 BGB currency:** verified against full Absatz text. Default = both keep their names (Abs. 1); common Ehename = one spouse's Geburts-/Familienname (Abs. 2); echter Doppelname from both names, **with or without Bindestrich** (default hyphenated unless spouses opt out), order free (Abs. 2 S. 2). Declaration **gegenüber dem Standesamt** (kommunal). The "retroactive Doppelname for existing marriages" is a real reform feature but is itself a **fresh Standesamt-Erklärung**, not an automatic conversion — i18n must not present it as auto. **The reform's 1-May-2025 in-force date is a press/legislative claim, not something verifiable from §1355's text; cite BMJV [^1] for the date, dejure [^2] for the content.**
- **§139b AO:** IdNr stays constant on name change; only the name attribute (+ Steuerklasse, a separate FA process) updates — confirmed by BZSt. §6 2. BMeldDÜV DOES carry Familienname + frühere Namen to the BZSt, so the FA/BZSt name-attribute A row is legitimate.
- **DRV (Datenstelle der Rentenversicherung):** §4 2. BMeldDÜV onward-recipient under §150/§196 SGB VI — legitimate A row.
- **Personalausweis (§28 PAuswG) + Reisepass (§11 PassG):** invalid on name change, re-apply **in person**, old document confiscated — legitimate TO-DO rows, never auto.
- **Marriage itself is a Standesamt act** (precondition, out of cascade); **private recipients (Arbeitgeber/Bank/Versicherung) are NOT Behörden** and must not enter any Behörden counter.

### Federalism labels (per row)
Standesamt / Bürgeramt-Personalausweisbehörde / Passbehörde / Meldebehörde / KFZ-Zulassungsstelle = **kommunal**; Finanzamt = **Land** (IdNr-Vergabe via BZSt = **Bund**); DRV, BZSt, KBA, Familienkasse, Bundesamt f. Justiz, AZR = **Bund**; Ausländerbehörde = **Land/kommunal** (AZR it feeds = Bund). Krankenkasse = öffentlich-rechtliche Körperschaft (Selbstverwaltung) — a public body but NOT a Meldebehörden-onward-recipient; counts as a notification (B), not an auto register row.

### Safe v1 recipient set for Anna Petrov (the demo cut)
- **A (statutory auto, register attribute only):** Melderegister/Meldebehörde (Standesamt→Melderegister), DRV, Finanzamt/BZSt (name attribute, IdNr constant). → **3 Behörden** legitimately count in the Once-Only/Behörden figure.
- **D (eID-gated TO-DO):** Personalausweis (neu beantragen, Vorsprache), Reisepass (neu beantragen, Vorsprache), Aufenthaltstitel/eAT (Übertrag, Vorsprache + Lichtbild). → re-issuance worklist, NOT counted as "informiert/aktualisiert."
- **B (consent, not Behörden):** Krankenkasse (neue Karte), Arbeitgeber, Bank, Versicherung. → must NOT enter the Behörden counter.
- **CUT for v1:** AZR as an auto row (Correction 1); KBA (Anna holds no vehicle; keep behind `visibleIf` for a Halter persona).

The ValueReceipt must read two distinct lines: **"Register aktualisiert: 3 Behörden"** vs **"Nachweise neu zu beantragen: 3 (Personalausweis, Reisepass, Aufenthaltstitel — persönliche Vorsprache)."** Conflating them is the one move that lets a Meldewesen insider object.
