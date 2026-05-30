---
feature: wow-1-inline-cascade
date: 2026-05-30
auditor: a11y-tester
build: 27309fb (branch feat/wow-1-inline-cascade; clean working tree at audit time)
method: RUNTIME — live Chromium (Playwright a11y project) + @axe-core/playwright scoped to the inline cascade, driven through the real spine SSE-mock flow (Anna, reliable_mode) so the cascade plays in the assistant thread. Contrast also hand-computed from resolved design tokens for cross-check. ONE item (AR-RTL inline render) is STATIC + partial-runtime — see note.
verdict: PASS
---

## Verdict
**PASS** — The previously-reported contrast blocker is FIXED and confirmed live: the per-row status text now uses the semantic `STATUS_TEXT_TONE` map (text-success / text-primary / text-text-muted / text-destructive), and a whole-region axe run (wcag2a/2aa/21a/21aa) on the open cascade with rows in both confirmed and in_progress states returns **zero violations of any severity, including zero `color-contrast`**. C7 single-live-region, reduced-motion gating, text-not-colour status, keyboard focusability, and muted-text contrast all re-validated. No blockers, no nits that gate merge.

## Routes / surface tested
- `/assistent` (de) — inline cascade mounted under the `starte_umzug` ToolCallCard via the spine SSE-mock (preview_umzug → "Umzug starten" → `<InlineCascade data-testid="inline-cascade">`). **PASS**
- `/assistent` (ar, dir=rtl) — root `dir`/`lang` + UmzugConfirmCard render under RTL confirmed runtime; inline-cascade-under-RTL confirmed static (strings present, logical-property layout). **PASS**

## What ran LIVE vs STATIC (honest)
- **LIVE (Chromium + axe):** contrast (axe color-contrast + computed colours), C7 single live region, reduced-motion spinner suppression, text-not-colour row status, keyboard focusability of the posteingang `<Link>` and the kept "Kaskade ansehen" link, muted disclaimer/source contrast, whole-region multi-tag axe, AR root `dir=rtl`/`lang=ar`.
- **STATIC / partial-runtime:** AR-RTL *inline cascade* render. Root RTL attrs + the confirm card render under AR were verified live; driving the AR-localised confirm CTA to surface the inline cascade proved flaky in the test harness (accessible-name match under bidi marks), NOT a component defect. The AR inline strings exist in `ar.json` and the row layout uses flex + logical `gap` (no hardcoded directional CSS), so the DE render — which passed axe with zero violations — is structurally representative. ValueReceiptCard live-region placement (C7) verified STATIC from source: it is a sibling rendered AFTER the live `<div>` closes (`InlineCascade.tsx:303-305`), never nested; the receipt did not surface during the fast reliable-mode run so its own `aria-live` was not exercised live.

## Automated results

### axe-core — scoped to `[data-testid=inline-cascade]`, tags wcag2a/2aa/21a/21aa
Run with the cascade open and rows mid-flight (one row `confirmed`/"Bestätigt", one row `in_progress`/"Wird übermittelt"), then re-run after settle.

| Severity | Count | Sample |
|---|---|---|
| critical | 0 | — |
| serious | 0 | — |
| moderate | 0 | — |
| minor | 0 | — |

`[AXE-LATE all-ids] []` — empty violations array on every pass. `[AXE-MID violations] []` likewise. **Zero `color-contrast` violations** (`[AXE-LATE cc-count] 0`). The 5 previously-failing status-text nodes now pass.

### Lighthouse
Not run (no Lighthouse harness wired in this repo; the gate here is axe + manual rubric per the project's a11y setup). axe carries the automated load.

## Contrast — the fix, confirmed (WCAG 1.4.3 Contrast (Minimum))
Status text is `text-xs` (12px) `font-medium` → **regular text → 4.5:1 threshold applies** (not the 3:1 large-text bar). Computed runtime colours on `bg-surface` (#FFFFFF light), cross-checked by hand:

| Row state | Token | Computed colour (runtime) | Ratio vs #FFFFFF | AA (>=4.5) |
|---|---|---|---|---|
| confirmed ("Bestätigt") | `text-success` | `rgb(19,112,52)` = #137034 | **6.19:1** | PASS |
| in_progress ("Wird übermittelt") | `text-primary` | `rgb(37,99,235)` = #2563EB | **5.17:1** | PASS |
| pending ("Wartet") | `text-text-muted` | #545C69 | **6.75:1** | PASS |
| failed ("Fehlgeschlagen") | `text-destructive` | #B91C1C | **6.47:1** | PASS |

Dark mode (`bg-surface` #1A1E27) hand-computed: success #5CC98A 8.08:1, primary #5B8DEF 5.16:1, muted #9AA2B0 6.49:1, danger #F2837C 6.60:1 — all PASS.

**Regression proof:** the decorative icon tones that the status text PREVIOUSLY reused fail AA as text — `sky-600` (#0284C7) 4.10:1 and `emerald-600` (#059669) 3.77:1 on white (the spec cited 4.02/3.65; same sub-AA finding). The icon `<span>` keeps those tones but is `aria-hidden="true"`, so they are not in the accessibility tree and axe correctly ignores them. The separation (`STATUS_VIZ.tone` for the hidden icon vs `STATUS_TEXT_TONE` for the visible label) is the fix, and it holds.

## §9 checklist — pass/fail per item with evidence

**1. Exactly ONE `aria-live="polite"` region (C7)** — **PASS** (runtime).
`[LIVE-REGION] {liveExists:true, liveAttr:"polite", liveLabel:"Live: Behörden werden informiert", ariaLiveCount:1, ariaLiveTargets:["inline-cascade-live"], receiptInsideLive:false}`. Exactly one `[aria-live]` inside the inline root, on `inline-cascade-live`, labelled via `t('convenience.inline_cascade.live_region_label')`. `ValueReceiptCard` renders OUTSIDE this region (sibling after the live `<div>` closes, `InlineCascade.tsx:303-305`) and owns its own `aria-live` only in `variant="live"` — so no double-announce. WCAG 4.1.3 Status Messages satisfied.

**2. Row status by TEXT, not colour alone** — **PASS** (runtime).
`[ROW-STATUS late] [{text:"Bestätigt"...},{text:"Wird übermittelt"...}]`. Each row carries a visible localized label from `row_status.*` plus an `sr-only "Status: "` prefix (`InlineCascade.tsx:273`), mirroring `BehoerdenStatusRow`. Conveyance does not depend on colour. WCAG 1.4.1 Use of Color satisfied.

**3. Reduced motion — no ungated animation** — **PASS** (runtime).
Under `prefers-reduced-motion: reduce`: `[REDUCED-MOTION inline] {found:false, count:0, durations:[]}` — ZERO `.animate-spin` nodes inside the cascade. The `spin` flag in `InlineCascade.tsx:250-254` is gated by `!reduceMotion` (framer `useReducedMotion()`), so the spinner icon renders static. `ValueReceiptCard` count-up is independently gated (`useCountUp` honours `prefers-reduced-motion` AND `variant`). WCAG 2.3.3 / 2.2.2 satisfied.

**4. Keyboard — posteingang `<Link>` + kept "Kaskade ansehen" link focusable, no scroll-trap** — **PASS** (runtime).
`[KEYBOARD links] {href:"/posteingang", tag:"A", text:"1 Bestätigung im Posteingang"}` — a real `<a>`, focusable (`tabIndexOk:true`). `[KEYBOARD kaskade visible] true` — the kept "Kaskade ansehen" link co-exists. A global `*:focus-visible { outline: 2px solid var(--color-primary) }` rule (`globals.css:267`) paints the ring under keyboard focus (`hasFocusVisibleRule:true`); the `outline:"none"` seen via JS `.focus()` is the expected `:focus-visible` heuristic, not a missing ring. No positive tabindex; container is a normal flex column, no keyboard trap. WCAG 2.1.1 / 2.4.7 satisfied.

**5. Contrast — muted disclaimer + source line AA** — **PASS** (runtime).
`[MUTED text] color:"rgb(84,92,105)"` = #545C69 (`text-text-muted`) at 12px = **6.75:1** vs `bg-surface`. Source line uses the same token. WCAG 1.4.3 satisfied.

**6. Headings/landmarks — no new `<h1>`** — **PASS** (static + runtime).
`InlineCascade` introduces no heading; the live region is a `<div aria-label>` (not a heading). `ValueReceiptCard`'s internal `<h2>` is its own and unchanged. The host `/assistent` single-`<main>`/single-`<h1>` structure is unaffected (no axe `heading-order`/`landmark` violations in the scoped run). WCAG 1.3.1 / 2.4.6 satisfied.

**7. DE-source + 6 locales render without layout break (AR RTL)** — **PASS** (runtime root + static inline).
Runtime: `[RTL html] {dir:"rtl", lang:"ar"}` correct; AR UmzugConfirmCard renders under RTL. Inline-cascade AR strings confirmed present in `ar.json` (`convenience.inline_cascade.*` incl. full Arabic plural categories for `posteingang_landing`), row layout uses flex + logical `gap` with no hardcoded directional CSS → no RTL layout break expected. See "LIVE vs STATIC" note for why the AR inline drive was not forced live. WCAG 1.4.10 not regressed.

## Manual rubric (cross-cut)
- [x] Semantic HTML — rows are a `<ul>`/`<li>` list; links are real `<a>`; no `<div onClick>`.
- [x] Landmarks/headings — no new `<h1>`; live region is a labelled `<div>`, not a heading.
- [x] Focus visible + logical — global `:focus-visible` 2px primary ring; no positive tabindex; no trap.
- [x] Forms — n/a (inline cascade has no form inputs).
- [x] Colour contrast — status text, disclaimer, source line all >= 4.5:1 (light + dark).
- [x] Motion — spinner + count-up gated by `prefers-reduced-motion`.
- [x] Images/icons — status icons `aria-hidden="true"`; status conveyed by text.
- [x] Live regions — exactly one polite region for the inline beat; assertive not used (no errors surfaced).
- [x] Language attribute — `lang` switches with locale (`lang=ar` confirmed); `dir=rtl` for AR.
- [x] Touch targets — the posteingang + Kaskade links are inline text links within the chat thread (pointer + keyboard reachable); not a primary tap-target control, consistent with the surrounding assistant-thread link pattern.

## BITV 2.0 specifics
- Plain-language / sign-language stubs are landing/dashboard concerns, out of scope for this in-thread component.
- [x] `lang` attribute correct and locale-reactive (`lang=ar`, `dir=rtl` verified runtime).
- [x] `[MOCK]` disclaimer ("[MOCK] — simuliert; keine reale Übermittlung.") is real text in the AT tree, AA-contrast — honest "no real transmission" disclosure travels with the beat.

## Issues to fix
None. No blocker, no merge-gating nit.

## Recommendations for code-reviewer
1. **Merge-ready on a11y grounds.** The contrast blocker from the prior runtime audit is fixed and re-verified live; whole-region axe is clean across wcag2a/2aa/21a/21aa.
2. Optional, non-gating: when a future change makes the `abgeschlossen` receipt surface inline during a fast reliable-mode run, add a spine/e2e assertion that the `ValueReceiptCard` `aria-live` region is the SECOND polite region (and remains a sibling, never nested in `inline-cascade-live`) — to lock C7 against regression. Today's run did not surface the receipt (fast completion), so its live region was validated statically from source only.
3. Optional: if AR becomes a tested locale for this surface, give the inline cascade a locale-stable test hook so the AR inline render can be axe-checked live without depending on bidi accessible-name matching of the confirm CTA.

## Re-audit trigger
Re-run this audit if any of these change: `STATUS_TEXT_TONE`/`STATUS_VIZ` maps, the `--color-success`/`--color-primary`/`--color-text-muted`/`--color-danger` token values, the live-region structure in `InlineCascade.tsx`, or the `useReducedMotion` gating.

---
*Method footnote:* Driven via a throwaway Playwright probe under `tests/a11y/` reusing the spine SSE-mock (Anna, reliable_mode) — created and DELETED for this audit; test-results artifacts cleared; working tree left clean.
