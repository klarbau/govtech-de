---
feature: wow-1-inline-cascade-eid
date: 2026-05-30
auditor: a11y-tester
build: 000d97e (feat/wow-1-inline-cascade; eID affordance commit)
verdict: PASS-with-fixes
---

## Verdict
PASS-with-fixes. The eID-confirm affordance is keyboard-operable, correctly named, AA-contrast in light + dark, single-polite-region compliant, and reduced-motion safe. One non-blocking issue: focus drops to the document body when the confirmed button unmounts (recoverable, non-trapping). No serious/critical defect. Authoritative source: code-level audit of a small (~430-line) component.

## Scope and method
- Code-level audit (authoritative): src/components/autopilot/InlineCascade.tsx read in full; token hexes resolved from src/app/globals.css; contrast ratios computed (WCAG relative-luminance, sRGB) for every NEW text node in both light and dark themes; i18n keys verified present in de.json.
- Live axe pass: deliberately SKIPPED. InlineCascade has no standalone route -- it mounts only inside the assistant thread after a live SSE-driven Umzug autopilot trigger. Driving axe over it needs the exact long live-server + spine-flow session that crashed the prior attempt. Per the audit brief the code audit is authoritative for a component this small; I did not loop on live retries. Recommend the axe assertion be added to the existing in-thread e2e (tests/e2e/spine.spec.ts Step 4c) rather than a fresh long session -- see Recommendations.

## Routes / surfaces tested
- Assistant thread inline-cascade (src/components/autopilot/InlineCascade.tsx) -- PASS-with-fixes; reached via convenience.inline_cascade.* after starte_umzug confirm.

## Criterion-by-criterion

### 2.1.1 Keyboard -- PASS
- Real button type=button (InlineCascade.tsx:355-364), natively focusable + Enter/Space operable. No div onClick.
- onClick -> onConfirmEid(node.stepId) (:357); keyboard activation uses the same handler.
- Focus order is DOM order: the ul (:310) renders A->D->B sorted nodes, each button inline in its row content column (:354). Visual order equals source order; the up-to-8-row list adds no positive tabindex, no CSS reorder, no trap. Trailing Link to /posteingang (:414) and the receipt follow in DOM, matching visual position.
- disabled while in flight (:358) removes the button from the tab ring during the write, then it returns (idle/error).

### 4.1.2 Name, Role, Value -- PASS
- Accessible name: aria-label=t(eid_confirm_cta_aria, behoerde) -> Mit eID bestaetigen: {Behoerde} (:360-362). The two Block-D buttons (Familienkasse, ABH) get DISTINCT names. Key eid_confirm_cta_aria present in de.json with the behoerde placeholder preserved.
- aria-busy: aria-busy=confirming (:359) true exactly while the promise is in flight, alongside disabled.
- Not by color/icon alone: every row has a VISIBLE text status label (:391-394) with an sr-only Status: prefix (t(row_status_sr_prefix), :392). Status icon span aria-hidden (:336); in-button icons aria-hidden (:369, :375). Honest remap: pending_eid_confirmation/needs_eid -> row_status.needs_eid (Ihre Bestaetigung noetig) via STATUS_LABEL_KEY (:78-86), NOT Wird uebermittelt. Confirmed in de.json.

### C7 / 4.1.3 single live region -- PASS
- Exactly ONE aria-live=polite region: wrapper at :303-308 (data-testid=inline-cascade-live, aria-label=t(live_region_label)).
- The rows ul, eID button, once-only counter, source line, and Posteingang link all render INSIDE that one region (:309-419). No nested/duplicate polite region.
- The retry error is the ONLY assertive announcement: role=alert (:381-386), scoped to the failing row; no redundant explicit aria-live.
- ValueReceiptCard keeps its OWN region OUTSIDE the polite wrapper: rendered after the live region closing div (:423-427) and, in variant=live, sets its own aria-live=polite on its section (ValueReceiptCard.tsx:40). Two siblings, never nested. Correct per C7.

### 1.4.3 Contrast (AA) -- PASS
All NEW text uses AA-clearing SEMANTIC tokens; sub-AA raw text-sky-600/text-emerald-600 tones are confined to the aria-hidden decorative icons (STATUS_VIZ :43-54) and never used as text. STATUS_TEXT_TONE (:61-69) maps every status to a semantic text token. Computed ratios (sRGB, on actual rendered background):

| New element | Token (light/dark) | Background | Light | Dark | AA 4.5 |
|---|---|---|---|---|---|
| rechtsgrundlage micro-line (:348) | text-text-muted #545C69 / #9AA2B0 | bg-surface #FFF / #1A1E27 | 6.75 | 6.49 | PASS |
| eID gate-hint (:328) | text-text-muted on bg-muted/50 | composited #F7F8FA / #1F242E | 6.35 | 6.05 | PASS |
| row primary line (:342) | text-text-primary | surface | 16.49 | 14.47 | PASS |
| status needs_eid/in_progress (:391) | text-primary #2563EB / #5B8DEF | surface | 5.17 | 5.16 | PASS |
| status confirmed (:391) | text-success #137034 / #5CC98A | surface | 6.19 | 8.08 | PASS |
| error alert (:383) | text-destructive #B91C1C | surface | 6.47 | clears 4.5 | PASS |
| button label (:363) | primary-foreground on bg-primary | -- | 5.17 | 5.85 | PASS |

Note: bg-muted/50 is --color-surface-muted at 50% alpha, composited over the white/dark parent -> #F7F8FA (light) / #1F242E (dark); ratio computed on the composited value, not the nominal token hex. Lowest new-text ratio across both themes is 6.05:1, well above 4.5:1.

### 2.3 / reduced motion -- PASS
- Row spinner: spin = not(reduceMotion) AND status==in_progress (:316); useReducedMotion() from framer-motion (:111). Fingerprint on eID-gate states never spins regardless (P2 honesty fix).
- In-button spinner: cn(size-4, not(reduceMotion) AND animate-spin) (:367-368), same hook.
- scrollIntoView on receipt mount: behavior reduceMotion ? auto : smooth (:240).
- Belt-and-braces: globals.css:272-281 global @media (prefers-reduced-motion: reduce) forces animation-duration 0.01ms + scroll-behavior auto, so a stale hook value still cannot leave motion on.

### 3.3.1 Error identification -- PASS
- On api.bestaetigeAutopilotSchritt rejection, onConfirmEid catch sets confirmState[stepId]=error (:139-141); the row renders role=alert t(eid_confirm_error) (Bestaetigung fehlgeschlagen. Bitte erneut versuchen. -- present in de.json) at :380-387. Assertively announced.
- Control stays operable: button only disabled while confirming; in the error state it is enabled and retryable (no lock-out). Matches spec Decision A retryable.

### Focus visibility (2.4.7) -- PASS
- Explicit ring: focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary (:363). No outline:none without replacement.
- Global fallback: *:focus-visible draws a 2px solid var(--color-primary) outline (globals.css:267-270).

## Issue (non-blocking) -- focus continuity on button unmount
FOCUS-CONTINUITY (advisory, WCAG 3.2.5 / 2.4.3 adjacent): src/components/autopilot/InlineCascade.tsx:353 -- when a Block-D row goes pending_eid_confirmation -> in_progress -> confirmed (driven by the event stream after the tap), isEidGate becomes false and the button UNMOUNTS. The user just activated it, so it held focus; on unmount React drops focus to the document body. This is NOT a keyboard trap and NOT a failure (the activation succeeded and the result is announced in the polite region), but a keyboard/screen-reader user loses their place mid-list and a subsequent Tab restarts from document top.
- Severity: minor / advisory. Does not block PASS.
- Suggested fix (frontend-coder): on successful confirm, move focus to a stable in-row anchor before the button unmounts -- e.g. the row status span (:391) made focusable (tabIndex=-1 + ref) and .focus() once the row reaches confirmed; OR focus the next remaining eID button if one exists (which also smooths the two-tap demo flow). Keep the moved-to target inside the polite region so the status change is still read.

## BITV 2.0 specifics
- N/A as separate surfaces here (no language toggle, sign-language stub, or lang-switch in this component -- those are shell/landing concerns).
- Document-language indicator (DE->EN lang on translated summaries): N/A -- this component renders only DE-source convenience.inline_cascade.* via next-intl; no inline foreign-language span.
- All copy is t(...)-sourced (no hardcoded strings); de.json keys verified present including the 6 new eID keys. 6-locale parity is the i18n-localizer gate, not this audit.

## Manual rubric
- [x] Semantic HTML (button, ul/li, p, Link)
- [x] Focus visible (explicit ring + global fallback)
- [x] Focus logical / no trap / no positive tabindex
- [ ] Focus continuity on dynamic unmount -- advisory fix above (non-blocking)
- [x] Accessible names distinct per button
- [x] aria-busy on in-flight disabled button
- [x] Status conveyed by text, not color/icon alone (sr prefix + visible label)
- [x] Single polite region; assertive only on error; receipt region outside
- [x] Color contrast AA (light + dark, computed)
- [x] Reduced motion (hook + global CSS kill-switch)
- [x] Error announced (role=alert) + control retryable

## Recommendations for code-reviewer
1. Ship as PASS. No serious/critical defect; all stated criteria pass.
2. Track the focus-continuity advisory (InlineCascade.tsx:353) as a polish follow-up for frontend-coder; do not block merge. Focusing the next eID button on confirm would also improve the on-camera keyboard story for the Loom.
3. Add an axe assertion to the EXISTING in-thread e2e (spine.spec.ts Step 4c, which already drives the two eID taps) instead of a new long live session -- run AxeBuilder analyze scoped to [data-testid=inline-cascade] after the eID buttons render and again after the receipt climax. Closes the live-axe gap without the crash-prone standalone session.
4. The DE eid_gate_hint value in de.json reads ...diese zwei uebermitteln nichts ohne Ihren Tipp vs the spec ...nichts wird ohne Ihren Tipp uebermittelt -- same meaning, no a11y impact; flag to i18n-localizer only if exact spec wording matters.


---

# Wave-3 regression re-audit (appended 2026-05-30)

auditor: a11y-tester · build: feat/wow-1-inline-cascade (working tree, uncommitted termine + globals.css changes) · method: live axe-core + Playwright keyboard, dev server on :3000

Two scoped regression-fix confirmations. Live runs succeeded on the first cold start (no flake; server warmed in ~10s). PIPESTATUS read directly per project memory.

## Verification 1 — dark-mode chrome contrast fix — PASS (for chrome)

**Verdict: PASS.** The `.dark` chrome-token overrides in `src/app/globals.css:270-276` are confirmed independently. Zero serious/critical contrast violations on the Topbar (`header`) and sidebar (`aside`) chrome in dark mode on `/dashboard` and `/posteingang` (scoped axe-core `include('header')` / `include('aside')`, WCAG 2.1 AA tags).

Independently computed ratios (live, getComputedStyle on rendered nodes, dark theme):

| Chrome element | fg | bg (rendered) | Ratio | claimed | AA 4.5 / AAA 7 |
|---|---|---|---|---|---|
| Active nav pill label (`--brand-700`) | #9DBBFF | #1B2740 (rgb 27,39,64) | **7.79:1** | ~7.2 | PASS / PASS |
| Active nav pill icon (`--brand-600`) | #9DBBFF | #1B2740 | **7.79:1** | ~7.2 | PASS / PASS |
| Inactive nav label (`--ink-2`) | #C4CBD8 | #1A1E27 surface | **10.23:1** | ~10.1 | PASS / PASS |
| Logo wordmark "GovTech DE" (`--brand-900`) | #AFC4FF | #1A1E27 surface | **9.66:1** | ~9.5 | PASS / PASS |
| Header subtitle | #B6BDC9 | #1A1E27 | 8.83:1 | — | PASS / PASS |
| Header lang button "EN" (`--ink-2`) | #C4CBD8 | #1A1E27 | 10.23:1 | — | PASS / PASS |

All measured ratios match (or slightly exceed) the frontend-coder's computed figures. The pre-fix FAIL values (logo 1.06:1, nav 1.41:1) are fully resolved. WCAG 1.4.3 Contrast (AA) and 1.4.11 Non-text Contrast satisfied for chrome. The undeclared `--surface-2` (resolves transparent) is pre-existing and out of scope — not a regression.

### Verification-1 caveat — chrome PASS, but two NON-chrome dark-mode contrast regressions surfaced (the fix has a token-overload side-effect)

The chrome is clean, but a full-page dark axe pass on `/dashboard` and `/termine` flags a **serious** violation introduced *by this very fix's token choice*:

1. **`.btn-primary` solid button — 1.91:1 (serious, WCAG 1.4.3).** `src/app/prototype-v2.css:181` — `.btn-primary { background: var(--brand-600); color: #fff; }`. The chrome fix set `.dark { --brand-600: #9DBBFF }` because the active-nav pill uses `--brand-600` as a *light-tint icon/text colour on a dark pill* (correct, 7.79:1). But `.btn-primary` consumes the same `--brand-600` as a *solid button background* with hardcoded white text → #FFF on #9DBBFF = **1.91:1**. One token, two opposite roles. Repro: `/dashboard` ("Umzug starten" CTA, `a.btn.btn-primary`) and `/termine` (9 `.btn-primary` nodes). NOT in the header/aside, so Verification 1's chrome scope still PASSes — but this is a real serious defect that the fix caused and should not ship.
2. **`/termine` "Fristen im Überblick" inset card — 1.02:1 (serious, WCAG 1.4.3).** `src/components/termine/TermineView.tsx:894` — inline `style={{ background: 'var(--green-50)' }}`. `--green-50: #E6F6EC` is declared only in `:root` with no `.dark` override, so it stays light-mint in dark mode while its text inherits dark `--color-text-primary #ECEFF4` → **1.02:1** (heading, 6 Frist rows, muted count). Pre-existing latent bug (the static-tint inline style predates the chrome fix), surfaced now because the rest of the page went dark. Out of scope for both verifications but a real serious defect on /termine dark.
3. (Transient) dashboard EmptyState "Data could not be loaded." uses `--red-600 #B62121` on dark page bg = 2.78:1 — only shows on the mock-backend 5% error path; lower priority.

These do not change Verification 1's chrome PASS, but the auditor cannot sign a clean dark-mode bill of health for the affected pages.

## Verification 2 — Termine MonthCalendar keyboard (goToMonth clamp) — PASS

**Verdict: PASS.** `tests/a11y/redesign-termine.spec.ts` ran 11 tests: 10 passed (the 1 failure is the unrelated `axe DARK termine de` page-content contrast bug catalogued above, NOT the calendar). Every keyboard/roving-tabindex assertion passed:

- `MonthCalendar is a grid … roving tabindex`: `rovingFocusable: 1`, cellCount 42, columnheaders 7, gridLabelled true, hasTodayCell true — PASS.
- `keyboard navigation moves focus and selects with Enter`: ArrowRight moves focus (Sa 30 Mai → So 31 Mai), Enter selects (1 aria-selected cell), ArrowDown + PageDown keep exactly one focusable button — PASS. (PageDown exercises the keyboard month-page path via `moveActive`.)

I added a dedicated post-**chevron**-paging check (the specific fix path: chevron click → `goToMonth`, which `moveActive`/PageDown does not cover). Result:

- Before: visible month "Mai 2026", roving button = "Samstag, 30. Mai 2026", focusable count = 1.
- After clicking the next-month chevron: visible month "Juni 2026", roving button = "**Dienstag, 30. Juni 2026**" (day-of-month 30 correctly preserved/clamped into the new month), focusable count = **1**.
- `focusedInGrid = true`: `.focus()` on the roving button lands inside the grid with tabIndex=0 — the grid is keyboard-reachable after paging.

This confirms the `goToMonth` clamp (`MonthCalendar.tsx:99-107`): `isSameMonth(activeDay, month)` false after paging → `activeDay` reset to `min(prevDom, lastDomOfNewMonth)` so a rendered cell always carries `tabIndex=0`. WCAG 2.1.1 Keyboard satisfied; no keyboard trap; roving tabindex invariant (exactly one tabbable day) holds across chevron paging. The existing spec already covered keyboard paging via PageDown; the chevron path is now additionally verified. No spec edit required — frontend-coder may optionally fold the chevron-Tab check into the spec for permanent coverage (described, not added, per scope).

## Wave-3 must-fix summary (for code-reviewer)

- **MUST-FIX (serious, caused by this branch's chrome fix):** `src/app/prototype-v2.css:181` — `.btn-primary` is #FFF on `--brand-600` (=#9DBBFF in dark) = 1.91:1. Token-overload: `--brand-600` now serves both as nav-pill icon/text (light tint, correct) and as solid-button background (now too light). Fix: give `.btn-primary` its own dark background (e.g. keep the saturated cobalt `--primary #5B8DEF` or a dedicated `--brand-btn-bg` token) instead of reusing `--brand-600` as a fill; verify #FFF/foreground clears 4.5:1. Affects /dashboard, /termine, likely every screen with a primary CTA in dark mode.
- **SHOULD-FIX (serious, pre-existing, /termine dark):** `src/components/termine/TermineView.tsx:894` — inline `background: var(--green-50)` has no dark override; text inside is 1.02:1. Fix: use a semantic token that flips (e.g. `--color-success-soft`) or add a `.dark` value for the inset, and ensure the inner text token pairs to ≥4.5:1.
- **LOW:** dashboard error EmptyState `--red-600` 2.78:1 in dark (transient 5%-error path).
- **PASS, ship:** chrome dark-mode fix (Verification 1 chrome scope) and MonthCalendar chevron-paging keyboard reachability (Verification 2).
