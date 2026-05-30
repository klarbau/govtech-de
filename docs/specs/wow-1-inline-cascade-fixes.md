# Spec — Wow #1 Inline-Cascade FIXES (eID-Consent-Gate + visible-set + completion)

```yaml
track: spine
status: ready-to-build
parent: docs/specs/wow-1-inline-cascade.md   # this is a corrective patch, not a re-spec
source: audit 2026-05-30 (InlineCascade never reaches the climax for Anna)
domain:  docs/research/wow-backlog.md §1 + §2 (Föderalismus/Realismus-Filter)
owners:  mock-backend-coder (§2.4 + §2.1.D), frontend-coder (§2.1 + §2.2), assistant-engineer (§2.3 path-audit), i18n-localizer (§5)
gate:    tests/e2e/spine.spec.ts MUST stay green; ADD the §3 completion assertions
```

> **One-sentence pitch (unchanged):** "Sie sagen *ich ziehe um*, vier Behörden leuchten automatisch grün — dann **bestätigen Sie selbst** die zwei sensiblen Stellen mit Ihrem Ausweis, zwei weitere laufen mit Ihrer Einwilligung, und am Ende zählt eine Quittung, was Sie NICHT tun mussten."
>
> The fix turns the broken "spins forever / no climax" cascade into the project's **only honest consent-gate** — the moment that answers the loss-of-control critique on camera.

---

## §1 — Problem restatement (root cause, verified in code)

The inline hero from `wow-1-inline-cascade.md` shipped, but for the default demo persona **Anna (`anna-petrov`)** the Vorgang **never reaches `abgeschlossen`**, so the climax (`ValueReceiptCard` + Once-Only counter + Stammdaten-Quellzeile) never renders, and the two most sensitive rows read as **data transmission WITHOUT consent**. Three compounding defects:

| # | Defect | Verified at |
|---|---|---|
| **P1** | Block-D steps are yielded with `status: 'pending_eid_confirmation'`, `requires_eid: true`, and the generator **deliberately does not wait** — the contract is that the UI calls `api.bestätigeAutopilotSchritt(vorgangId, stepId)`. **No component anywhere calls it.** So Block-D hangs forever. | `umzug.ts:614–634` (yield + comment); grep: zero callers of `bestätigeAutopilotSchritt` outside `api.ts`/`client.ts`/`dispatch.ts` plumbing. |
| **P2** | `InlineCascade`'s `STATUS_LABEL_KEY` maps `pending_eid_confirmation → 'in_progress'` → the row shows **"Wird übermittelt"** with a spinner — i.e. it reads as *the state is transmitting Anna's data to Familienkasse/ABH right now, no consent asked.* Honest framing inversion. | `InlineCascade.tsx:72–80, 250–254, 272–275` |
| **P3** | Cascade-node derivation does `.slice(0, 5)`. Anna's visible non-C set, A→D→B sorted, is: 4× Block-A (Bürgeramt, Finanzamt, Beitragsservice, Bundesdruckerei) + Familienkasse(D) + **ABH(D)** + AOK(B) + Arbeitgeber(B). The slice shows the 4 A-steps + Familienkasse and **hides ABH + both Block-B rows.** The hidden ABH step is one Anna MUST eID-confirm for completion → the slice cap **actively blocks both the affordance and `abgeschlossen`.** | `InlineCascade.tsx:207–223`; BLOCK ordering `umzug.ts:107–301` |

**Why completion is otherwise wired and ready:** `bestaetigeImpl` (`api.ts:1317–1468`) is fully implemented — it validates the Block-D step, transitions `pending_eid_confirmation → in_progress → (800–1500 ms) → confirmed`, mints the `[MOCK]` confirmation letter + ripple docs, and calls `changeVorgangStatus(…, 'abgeschlossen')` once `isVorgangFullyResolved` (`api.ts:576–583`: every step `confirmed|failed|self_assigned`). `InlineCascade` already fetches the receipt only when `vorgang.status === 'abgeschlossen'` (`:187–203`). **The only missing link is a UI affordance that calls `bestätigeAutopilotSchritt`** + making ABH/Block-B visible + an honest terminal label. This is the same "presentation re-wire of already-validated data" posture as the parent spec — plus ONE one-line norm fix in `bestaetigeImpl`.

**Anna's flags (confirmed `personas.json:52,122–123`):** `aufenthaltstitel` set → ABH(D); `kindergeld_bezug: true` → Familienkasse(D); `kfz_halter: false` → no KFZ(D); `beschaeftigung.typ: 'angestellt'` + `krankenversicherung.traeger: AOK Nordost` → AOK(B) + Arbeitgeber(B) eligible.

---

## §2 — Locked decisions & exact contracts

### Decision A — the eID-confirm affordance (frontend-coder owns the component; mock-backend owns the call target — already exists)

**Locked shape: per-step button, NOT a bulk "alle bestätigen".** Rationale: §18 PAuswG is a *nutzergesteuerter*, per-document eID act — bundling Familienkasse + ABH behind one tap would misrepresent the legal reality (each is a distinct credential presentation) and weaken the "you, in control, one tap per sensitive recipient" beat. Two taps on camera is the *point*, not friction. (If a future supporting surface wants a convenience "alle nacheinander" affordance, that is out of scope here.)

**The row state machine (what the user sees per Block-D step):**

```
pending_eid_confirmation   →  row shows:  Fingerprint icon (NOT spinner) + honest label
  "Ihre Bestätigung nötig"  + a <button>"Mit eID bestätigen"</button>
        │  user clicks button → component calls
        │  api.bestätigeAutopilotSchritt(vorgangId, step.id)
        │  (button: disabled + aria-busy while the promise is in flight)
        ▼
in_progress  →  row shows: spinner + "Wird übermittelt"
        │  (driven by the `autopilot_step` event bestaetigeImpl emits via upsertStep)
        ▼
confirmed    →  row shows: green Check + "Bestätigt"   (button gone)

on rejection (MockBackendError, ~5% in non-reliable):
  → row returns to pending_eid_confirmation, shows inline error text
    "Bestätigung fehlgeschlagen. Bitte erneut versuchen." + the button re-enabled (retryable).
```

**Critical honesty fix (P2):** the terminal label for `pending_eid_confirmation` / `needs_eid` **MUST NOT be "Wird übermittelt"**. It must read as *awaiting YOUR eID confirmation*, never as in-flight transmission. Add a new status bucket:

- `STATUS_LABEL_KEY['pending_eid_confirmation'] = 'needs_eid'` (was `'in_progress'`).
- `STATUS_LABEL_KEY['needs_eid'] = 'needs_eid'` (was `'in_progress'`).
- New label key `convenience.inline_cascade.row_status.needs_eid` = **"Ihre Bestätigung nötig"** (§5).
- Icon for these two states stays `Fingerprint` (already in `STATUS_VIZ`), and **must NOT spin** — fix the `spin` predicate at `InlineCascade.tsx:250–254` to spin **only** for `in_progress` (remove `needs_eid` + `pending_eid_confirmation` from the spin condition). The fingerprint is a *call to action*, not a busy indicator.

**The button contract (new, inside `InlineCascade.tsx`):**

```ts
// New per-node state in the component:
const [confirmingStepId, setConfirmingStepId] = useState<string | null>(null);
const [confirmError, setConfirmError] = useState<Record<string, boolean>>({});

async function onConfirmEid(stepId: string) {
  setConfirmingStepId(stepId);
  setConfirmError((e) => ({ ...e, [stepId]: false }));
  try {
    await api.bestätigeAutopilotSchritt(vorgangId, stepId);
    // The `autopilot_step` events emitted by upsertStep (in_progress → confirmed)
    // flow through the existing subscription (:151–184) and flip the row.
    // Do NOT optimistically setVorgang here — let the event stream be the source of truth.
  } catch {
    setConfirmError((e) => ({ ...e, [stepId]: true }));
  } finally {
    setConfirmingStepId(null);
  }
}
```

- Render the button **only** when `node.status === 'pending_eid_confirmation' || node.status === 'needs_eid'`.
- Button is `disabled={confirmingStepId === node.stepId}` and sets `aria-busy` accordingly; while disabled it shows a small spinner + `t('eid_confirming')` ("Wird bestätigt …").
- The button label = `t('eid_confirm_cta')` = **"Mit eID bestätigen"**. Give it an accessible name that includes the Behörde so the two buttons are distinguishable to a screen reader: `aria-label={t('eid_confirm_cta_aria', { behoerde: node.behoerdeName })}` → "Mit eID bestätigen: {behoerde}".
- On error show `t('eid_confirm_error')` as `sr-only`-plus-visible inline text under the row, `role="alert"`. Button re-enables (retryable).
- Use the existing `Fingerprint` lucide icon inside the button (already imported). Style with the existing primary-button tokens already used for the kept "Kaskade ansehen" affordance (do not invent a new button primitive; a styled `<button>` matching `text-primary`/border conventions is fine, or reuse the shared `Button` if already imported elsewhere in the card — frontend-coder's call, must be keyboard-operable + AA contrast).

**Trust micro-copy (consent-gate framing — the loss-of-control answer):** above the Block-D rows (only when ≥1 Block-D row is `pending_eid_confirmation`), render one muted line `t('eid_gate_hint')` = **"Die folgenden zwei Stellen verlangen Ihre ausdrückliche Bestätigung mit dem Ausweis — nichts wird ohne Ihren Tipp übermittelt."** This is the sentence a DigitalService/BMDS viewer needs to hear. Render it inside the live region, once, conditionally.

**File:line touch-list — Decision A:**
- `src/components/autopilot/InlineCascade.tsx` (frontend): `STATUS_LABEL_KEY` remap (:72–80); `spin` predicate (:250–254); per-row button + states + `onConfirmEid`; `eid_gate_hint` line; error `role="alert"`. **No prop signature change** (still `{ vorgangId, variant?, className? }`).
- `src/lib/mock-backend/api.ts` (mock-backend): **no change for the call target** — `bestätigeAutopilotSchritt` / `bestaetigeAutopilotSchritt` (`:1507` / `:832` / `:1812–1816`) already wraps `bestaetigeImpl` with latency. (One norm fix lives in Decision D below.)

---

### Decision B — visible-set: REMOVE the `.slice(0, 5)` cap for the inline hero (frontend-coder owns)

**Locked: remove the cap. Show ALL non-C steps** (block-A → D → B sorted). Justification:
- The cap currently *hides the ABH eID step that completion depends on* (P3) — keeping it would mean the hero can never complete for Anna without also re-ordering, which is more fragile.
- For Anna the full non-C set is **8 rows** (4 A + 2 D + 2 B). That is the honest "sechs Stellen + zwei private/Anstalt" narrative the Loom needs; 8 compact rows is acceptable thread length (each row is ~2 lines). Block-C (the silently-skipped/duplicate steps) stays filtered — that exclusion is correct and stays.
- **Do NOT touch `run/page.tsx`.** Its `.slice(0, 5)` and its `.cascade-cards .cas-card` DOM stay byte-identical (C2 from parent spec; the spine asserts exactly 4 confirmed cards there). The inline component already *duplicates* the derivation (`InlineCascade.tsx:205–223`, comment says "DUPLICATED … Do NOT refactor run/page.tsx to share this") — so dropping `.slice(0, 5)` in `InlineCascade` only changes the inline DOM, not the run page.

**Exact change:** delete the `.slice(0, 5)` line at `InlineCascade.tsx:216`. Keep the `filter(block !== 'C')` and the `BLOCK_RANK` A→D→B sort. Nothing else in the derivation changes.

**File:line touch-list — Decision B:**
- `src/components/autopilot/InlineCascade.tsx:216` (frontend): remove `.slice(0, 5)`.

---

### Decision C — Block-B consent in the demo trigger path (assistant-engineer audits; NO new code expected)

**Finding (verified): the demo path ALREADY passes Block-B consent honestly — do not add auto-injection.** In the spine/preview flow:
- The mock SSE emits only `preview_umzug` (`spine.spec.ts:144–151`, no `block_b_consent`).
- `proposalFromPreview` (`AssistentView.tsx:636–642`) derives `blockBConsent = preview.umzugPreview.block_b.map(s => s.behoerde_id)` — for Anna that is `['aok-nordost', 'arbeitgeber-mittelstand-software']` (both `visibleIf`-eligible per `umzug.ts:179–197`).
- On confirm, `dispatchStarteUmzug` passes `consents: blockBConsent` → `api.startUmzug` → the Block-B loop runs for exactly those two (`umzug.ts:636–639`, `consents.has(...)` gate).

So **for the confirm-card-driven demo (spine + live), Block-B already appears.** The consent is real (derived from the preview the user saw and confirmed), not invented — honoring the "Block-B is consent-gated by design" guardrail (`tools.ts:73`).

**The ONE residual gap (live-LLM path only):** if the model ever emits `starte_umzug` *directly* (skipping the preview→confirm card), `buildProposalFromStarteUmzug` (`AssistentView.tsx:645–664`) only honors `input.block_b_consent` and defaults to `[]` when absent. The `starte_umzug` tool already `required: ['…','block_b_consent']` (`tools.ts:117`) and its description tells the model to ask first (`tools.ts:73`) — so this is contract-correct. **Decision: no code change.** Add a system-prompt smoke note (below) so the demo never silently drops Block-B.

**Assistant-engineer action (audit + 1 doc/test assertion, no behavior change):**
- Confirm `proposalFromPreview` still maps the full `block_b` set (regression guard). Add to `src/lib/ai/__smoke__.ts` an assertion that the spine's preview→proposal path yields `blockBConsent.length >= 2` for Anna **OR** document that the spine e2e (§3) covers it end-to-end. (The e2e is the stronger guard — prefer it.)
- **Do NOT** hardcode consents into `dispatchStarteUmzug` or the seed. Block-B stays consent-derived.

**File:line touch-list — Decision C:** none required (audit-only). Optional: `src/lib/ai/__smoke__.ts` (+1 assertion).

---

### Decision D — completion → receipt semantics + the §86→§18 PAuswG norm fix (mock-backend-coder owns)

**Completion is already correct** once Block-D is confirmed: after the last `bestätigeAutopilotSchritt`, `bestaetigeImpl` re-checks `isVorgangFullyResolved(after)` and calls `changeVorgangStatus(vorgangId, 'abgeschlossen')` (`api.ts:1462–1467`). That emits `vorgang_status_changed`, the inline subscription updates `vorgang.status` (`InlineCascade.tsx:164–169`), the receipt-fetch effect fires (`:187–203`), and the climax renders. **No change needed to the completion machinery.** Confirm this holds for the assistant-triggered run (it does — `runAutopilotInBackground` persists Block-D steps as `pending_eid_confirmation`, and `bestaetigeImpl` reads/writes the same localStorage Vorgang).

**Required norm fix (realism guardrail — privacy/legal):** `bestaetigeImpl`'s Block-D activity-log emit hardcodes the ABH recipient's `rechtsgrundlage` as **`'§ 86 AufenthG i.V.m. § 36 BMG'`** (`api.ts:1427–1428`). This is wrong and the codebase already corrected it everywhere else: the BLOCK_D ABH entry (`umzug.ts:282–286`) uses **`'§ 18 PAuswG'`** with the explicit comment *"§87/§86 AufenthG entfernt (Strafverfolgungs-/Erhebungskanal, NICHT Adresspflege). Kein Melderegister→ABH-Push."* §86 AufenthG is a data-*collection-for-enforcement* basis, not address-maintenance — using it here implies exactly the automatic Melderegister→ABH push the spec forbids. The eID affordance reflects "nutzergesteuert" (§18 PAuswG); the log must match.

**Exact change (`api.ts:1422–1436`):** in the `rechtsgrundlage` ternary, replace the `abh-berlin-lea` branch value `'§ 86 AufenthG i.V.m. § 36 BMG'` with **`'§ 18 PAuswG'`** (the user-driven eID basis; do NOT append `§ 36 BMG` — there is no Melderegister push for ABH). Leave Familienkasse (`§§ 67/68 EStG i.V.m. § 36 BMG`) and KFZ (`§ 15 FZV i.V.m. § 36 BMG`) branches unchanged. The `zweck_i18n_key` for ABH can stay as-is (it points to a generic Adressübermittlung key) unless mock-backend prefers a §18-specific key — out of scope to add one.

**Regression guard (mock-backend adds):** a unit test asserting that after confirming an ABH Block-D step, **no emitted activity-log entry or letter contains the string `§ 86 AufenthG` or `§ 87 AufenthG`** for `abh-berlin-lea` (ban-list test). This locks the corrected norm against drift.

**Receipt content (already specified in parent spec §5, unchanged):** `once_only_fields` = sum of `step.datenkategorien.length` over all confirmed steps (incl. Block-D + Block-B once confirmed). With Anna's full set confirmed, the number grows past the Block-A-only 9 — e.g. + Familienkasse(2) + ABH(2) + AOK(3) + Arbeitgeber(2) = **18** total. Rendered "ca. 18". Deterministic, defensible. `behoerden_count` still excludes Anstalt/private (Beitragsservice, Arbeitgeber) per parent C5 — unchanged.

**File:line touch-list — Decision D:**
- `src/lib/mock-backend/api.ts:1427–1428` (mock-backend): `§ 86 AufenthG i.V.m. § 36 BMG` → `§ 18 PAuswG` for `abh-berlin-lea`.
- `src/lib/mock-backend/**` test (mock-backend): ban-list test for `§ 86/§ 87 AufenthG` on ABH confirm path.

---

## §3 — Acceptance criteria

**Functional (Anna, reliable mode):**
- [ ] After confirm, the inline cascade shows **all 8 non-C rows** (4 Block-A auto-confirming + Familienkasse + ABH + AOK + Arbeitgeber). No row hidden by a slice cap.
- [ ] Block-A rows auto-progress to **"Bestätigt"** (green) without user action.
- [ ] Block-D rows (Familienkasse, ABH) sit at **"Ihre Bestätigung nötig"** with a non-spinning Fingerprint icon and a **"Mit eID bestätigen"** button — **never** "Wird übermittelt" while unconfirmed.
- [ ] Clicking each "Mit eID bestätigen" → row goes spinner/"Wird übermittelt" → "Bestätigt"; button disabled+`aria-busy` in flight.
- [ ] Block-B rows (AOK, Arbeitgeber) progress to "Bestätigt" via their own (consent-based) flow — no eID button on them.
- [ ] Once **all** Block-A confirmed, both Block-D eID-confirmed, and Block-B resolved → `isVorgangFullyResolved` → status `abgeschlossen` → `ValueReceiptCard` + Once-Only counter ("ca. N …") + Stammdaten-Quellzeile render **inline in the thread**.
- [ ] `[MOCK]` disclaimer + `eid_gate_hint` consent line present.

**Legal/realism:**
- [ ] No emitted log/letter for `abh-berlin-lea` contains `§ 86`/`§ 87 AufenthG`; ABH log shows `§ 18 PAuswG` (ban-list test green).

**Gates:**
- [ ] `npx tsc --noEmit` exit 0; all 6 locales `JSON.parse`-valid; unit suite green; `next build` green.
- [ ] a11y: exactly ONE `aria-live="polite"` region in `InlineCascade` (unchanged from parent C7); the new buttons are keyboard-operable, have distinct accessible names ("Mit eID bestätigen: {behoerde}"), error text is `role="alert"`; reduced-motion → fingerprint never spins.

**e2e assertion to ADD (`tests/e2e/spine.spec.ts`) — additive, do not weaken existing:**

Insert AFTER the existing Step 4b inline-visibility block (`spine.spec.ts:243–252`), BEFORE the `kaskadeLink.click()` navigation (`:255`). Drive the eID confirmation in-thread and assert the climax:

```ts
/* ── Step 4c: user eID-confirms the two sensitive Block-D rows INLINE ──
 * Proves the consent-gate: nothing for Familienkasse/ABH completes until
 * the citizen taps "Mit eID bestätigen". Then the run reaches abgeschlossen
 * and the value receipt + Once-Only counter render in the thread (the climax
 * the audit found was never reached for Anna). */
const eidButtons = inlineCascade.getByRole('button', { name: /Mit eID bestätigen/ });
await expect(eidButtons).toHaveCount(2, { timeout: 20_000 }); // Familienkasse + ABH
// Confirm both (click first repeatedly as the count shrinks).
await eidButtons.first().click();
await expect(eidButtons).toHaveCount(1, { timeout: 15_000 });
await eidButtons.first().click();
await expect(eidButtons).toHaveCount(0, { timeout: 15_000 });

// Climax: the value receipt + Once-Only counter now render inline.
await expect(
  inlineCascade.getByText(/Felder, die Sie nicht ausfüllen mussten/i),
).toBeVisible({ timeout: 30_000 });
await expect(
  inlineCascade.getByText(/Quelle:\s*Ihre Stammdaten/i),
).toBeVisible();
// C1 regression guard unchanged: kept link still present.
await expect(kaskadeLink).toBeVisible();
```

> Note for e2e author: the existing Step-5 `/run` assertion of "exactly 4 confirmed cards" stays valid because `/run` keeps its `.slice(0,5)` and the 5th card (first Block-D) may still be pending there when navigated — that assertion is about the RUN page, independent of the inline confirmations. Do NOT change Step 5. If clicking the inline eID buttons before navigating makes `/run` show 5 confirmed, relax ONLY if the existing assertion goes red — prefer navigating to `/run` *without* depending on inline confirmation order; the simplest safe path is to keep the inline-confirm block self-contained and let Step 5 assert `>= 4` instead of exactly 4 **only if** it flakes. Flag to code-reviewer rather than pre-emptively loosening.

---

## §4 — Loom narrative outline (Wave 7 writes the script; this is the beat map)

The fix makes the honest consent story land **entirely in the chat thread**, replacing the old `/vorgaenge/umzug/run` detour:

1. **"Ich ziehe um."** — one sentence to the assistant. Confirm card surfaces; tap **Umzug starten**.
2. **"Vier Behörden, automatisch."** — Bürgeramt, Finanzamt, Beitragsservice, Bundesdruckerei flip Spinner → grün, each with its agent-voice line. Voiceover: *"Das läuft automatisch — Rechtsgrundlage § 36 BMG, die Meldebehörde darf das."* (Block A.)
3. **"Die zwei sensiblen bestätige ICH."** — camera lands on the `eid_gate_hint` line + the two Fingerprint rows (Familienkasse, Ausländerbehörde) sitting at **"Ihre Bestätigung nötig"** with a button each. Voiceover: *"Hier übermittelt nichts ohne mich. Ich bestätige Familienkasse und Ausländerbehörde mit meinem Ausweis — § 18 PAuswG, nutzergesteuert."* Tap, tap → both turn grün. **This is the loss-of-control answer, on camera.**
4. **"Zwei weitere mit meiner Einwilligung."** — AOK + Arbeitgeber flip grün (Block B, Art. 6 (1) a DSGVO, consent the user gave in the confirm card). Voiceover names them as *Krankenkasse* + *private Stelle* — explicitly NOT counted as Behörden.
5. **"Der Beleg."** — `ValueReceiptCard` counts up, Once-Only counter "ca. 18 Felder, die Sie nicht ausfüllen mussten", Stammdaten-Quellzeile, Bestätigungen-im-Posteingang line. Voiceover: *"Ich habe einen Satz gesagt und einmal bestätigt — und hier ist die Quittung über alles, was der Staat für mich getan hat."*
6. **`[MOCK]`-Disclaimer** stays in frame throughout (honesty).

Beat shape unchanged from the pitch: *ich sprach → es handelte (4) → ich bestätigte selbst (2) → es lief mit Einwilligung (2) → hier der Beleg.* The "4 + 2 + 2" structure is the realism spine of the whole demo.

---

## §5 — New i18n keys (i18n-localizer owns — DE source, mirror to en/ru/uk/ar/tr)

**Namespace:** `convenience.inline_cascade.*` (extends the existing block from the parent spec). Add to `src/lib/i18n/locales/de.json` inside `convenience.inline_cascade`, then mirror into all 6 locales. Coders REFERENCE via `t(...)`; coders must NOT edit locale JSON.

| Key | DE source value |
|---|---|
| `convenience.inline_cascade.row_status.needs_eid` | `Ihre Bestätigung nötig` |
| `convenience.inline_cascade.eid_confirm_cta` | `Mit eID bestätigen` |
| `convenience.inline_cascade.eid_confirm_cta_aria` | `Mit eID bestätigen: {behoerde}` |
| `convenience.inline_cascade.eid_confirming` | `Wird bestätigt …` |
| `convenience.inline_cascade.eid_confirm_error` | `Bestätigung fehlgeschlagen. Bitte erneut versuchen.` |
| `convenience.inline_cascade.eid_gate_hint` | `Die folgenden zwei Stellen verlangen Ihre ausdrückliche Bestätigung mit dem Ausweis — nichts wird ohne Ihren Tipp übermittelt.` |

**New-key count: 6** (namespace `convenience.inline_cascade.*`), × 6 locales = 36 strings.

**Notes for i18n-localizer:**
- `eid_confirm_cta_aria` keeps the `{behoerde}` placeholder in every locale (the component injects the Behörde name; do not translate the injected value).
- `eid_gate_hint` is the consent/trust sentence — translate for tone (formal Sie-Form / equivalent register), preserve the "nothing transmitted without your tap" meaning exactly. AR RTL: renders in card body, wraps; no LTR-token issue.
- **Reuse existing keys, do NOT duplicate:** `convenience.inline_cascade.row_status.{in_progress,confirmed,pending,failed}`, `live_region_label`, `once_only_label`, `source_line`, `posteingang_landing`, `disclaimer`, and `convenience.value_receipt.ca_prefix` all exist from the parent spec — leave byte-identical.
- The existing `row_status.in_progress` ("Wird übermittelt") is now used ONLY for the genuine `in_progress` state (during the real `bestaetigeImpl` write) — its meaning is finally honest. No value change.

---

## §6 — Build order

1. **mock-backend-coder** (Decision D): §86→§18 PAuswG one-liner in `bestaetigeImpl` + ban-list test. (Smallest, unblocks realism gate.)
2. **frontend-coder** (Decisions A + B): `InlineCascade.tsx` — `STATUS_LABEL_KEY` remap, spin-predicate fix, per-step "Mit eID bestätigen" button + states + error, `eid_gate_hint` line, remove `.slice(0,5)`. References §5 keys.
3. **i18n-localizer** (§5): 6 keys × 6 locales.
4. **assistant-engineer** (Decision C): audit-only — confirm `proposalFromPreview` maps full `block_b`; optional `__smoke__` assertion. No behavior change.
5. **e2e + a11y** (§3): add Step-4c inline-confirm + climax assertions; verify single live region, button names, reduced-motion. Run full gate (tsc + JSON.parse + unit + spine + build).
6. **code-reviewer:** P1–P3 fixed, ABH norm = §18, `/run` byte-stable + its spine assertions green, single live region preserved.

## §7 — Out of scope (do NOT build here)
- No change to `/vorgaenge/umzug/run/page.tsx` DOM or its `.slice(0,5)` (parent C2). Inline-only.
- No bulk "alle mit eID bestätigen" affordance (Decision A locks per-step).
- No hardcoded Block-B consent / seed injection (Decision C — stays consent-derived).
- No new MockBackendEvent; `bestaetigeImpl` already emits `autopilot_step` + `vorgang_status_changed`.
- No new ValueReceipt fields (parent §5 already shipped `once_only_fields` + `stammdaten_bestaetigt_am`).
- No prop-signature change to `InlineCascade`.

## Build log — frontend-coder
- date: 2026-05-30
- screens implemented: none (component-level fix on the inline hero)
- components created/modified: `src/components/autopilot/InlineCascade.tsx` (Decisions A + B + Flags #1–#3)
- i18n keys added (DE source, `convenience.inline_cascade.*`): `eid_confirm_cta`, `eid_confirm_cta_aria`, `eid_confirming`, `eid_confirm_error`, `eid_gate_hint`, `row_status_sr_prefix`, `row_status.needs_eid`
- typecheck: pass (`npx tsc --noEmit` exit 0)
- lint: BLOCKED by environment — `next lint`/`eslint` fail repo-wide ("Failed to patch ESLint", ESLint 9 + `@rushstack/eslint-patch` vs `eslint-config-next@15.5.18`); pre-existing, not introduced by this change. Code follows existing component conventions; no `any`/`@ts-ignore`.
- implementation notes:
  - eID call uses the ASCII alias `api.bestaetigeAutopilotSchritt` (the umlaut form is not on the `MockBackendApi` type surface; both resolve to the same impl via the client Proxy).
  - Decision A: per-step button only for `needs_eid`/`pending_eid_confirmation`; per-step state `Record<stepId,'idle'|'confirming'|'error'>`; in-flight = disabled + `aria-busy` + spinner + `eid_confirming`; error = `role="alert"` retryable; no optimistic mutation (event stream drives rows).
  - P2: `STATUS_LABEL_KEY` remaps both gate states to new `needs_eid` bucket; spin predicate is now `in_progress`-only.
  - Decision B: `.slice(0,5)` removed in InlineCascade only (run/page.tsx untouched).
  - Flag #1: per-row muted `step.rechtsgrundlage` micro-line on every row (data-driven, verbatim — no new copy).
  - Flag #2: `eid_gate_hint` rendered once above the first Block-D row, only while ≥1 Block-D row is in a gate state; copy scoped to "diese zwei" (NOT a global claim).
  - Flag #3: `scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'nearest' })` on receipt mount.
  - single `aria-live="polite"` region preserved (button + error inside it; receipt outside); `/posteingang` quiet link unchanged.
- known gaps: lint gate unrunnable in this env (see above) — code-reviewer should run lint in a working env.
- next: i18n-localizer (mirror the 7 DE keys to en/ru/uk/ar/tr), then a11y-tester + code-reviewer.
