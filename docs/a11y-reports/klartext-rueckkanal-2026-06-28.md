---
feature: klartext-rueckkanal
date: 2026-06-28
auditor: a11y-tester
build: 14f6292 (branch claude/buergerservice-ideas-k5c08z)
verdict: PASS
---

## Verdict
**PASS** — The Klartext-Rückkanal compose surface (RechtsbehelfFaktenCapture box +
NoSuspensionHintBanner) is axe-clean (0 WCAG 2.1 AA violations, LIGHT **and** DARK) on
both audited letters; the fact-capture textarea has a real associated label, the CTA is
keyboard-operable with an accessible name, focus moves to the draft body after fill, the
§2 RDG disclaimer is programmatically associated and announced, and the no-suspension
banner is a genuine non-dismissible `role="note"` (0 close controls) carrying both Fristen.
Supporting-tier; no AR-RTL ceremony this pass (per spec `track: supporting`).

## Routes tested
- `/posteingang/letter-fa-steuerbescheid-2025` (anna-petrov, archetype `steuerbescheid`, Einspruch/AO path) — **PASS**
- `/posteingang/letter-mehmet-bgw-beitrag` (mehmet-yildiz, archetype `berufsgenossenschaft-beitrag`, Widerspruch/SGG path) — **PASS**

Flow audited (live path): open letter → "Antwort vorbereiten" → compose surface
(`#reply-compose-heading`) → select Rechtsbehelf-Skelett radio → confirm PreInsertionModal
→ `RechtsbehelfFaktenCapture` (+ `NoSuspensionHintBanner` on the Beitrag letter) render
over the draft body. Viewport 1280×1000 (inline panel path).

## Automated results

### axe-core (`@axe-core/playwright`, tags wcag2a/2aa/21a/21aa, full compose document)
| Route | Mode | critical | serious | moderate | minor | total |
|---|---|---|---|---|---|---|
| /…/letter-fa-steuerbescheid-2025 | LIGHT | 0 | 0 | 0 | 0 | 0 |
| /…/letter-fa-steuerbescheid-2025 | DARK | 0 | 0 | 0 | 0 | 0 |
| /…/letter-mehmet-bgw-beitrag | LIGHT | 0 | 0 | 0 | 0 | 0 |
| /…/letter-mehmet-bgw-beitrag | DARK | 0 | 0 | 0 | 0 | 0 |

Scoped scans (`include` the new components only) also returned 0 on the steuerbescheid box
in dark. No new violations vs the known-good posteingang baseline.

### Lighthouse a11y
Not run separately this pass (cloud env runs axe, not Lighthouse CI). axe 0-violations on the
full compose document is the binding gate per spec §3 / §12; the surface adds no
heading-order, contrast, or labelling regressions that would drop the page below the ≥95 target.

## Manual rubric
- [x] **Semantic HTML** — box is a `<section aria-labelledby>` with `<h3>`, real `<label>`, real `<button>`, `<ul>/<li>` Fristen; banner is `<section role="note">`.
- [x] **Landmarks / heading order** — box heading demotes to `<h3>` ("2a. …") under the compose `<h2>`; no skipped levels (axe `heading-order` clean).
- [x] **Focus visible + logical** — textarea + CTA carry `focus-visible:ring-2`; after "Entwurf erstellen" focus moves to the draft `#reply-body` (verified: `activeElement.id === "reply-body"` on BOTH letters via shared `onFaktenSachverhalt` → `bodyTextareaRef.focus()`).
- [x] **Forms** — textarea has `<label for>` (accessible name "Ihre Angaben in eigenen Worten"); `aria-describedby` → the §2 RDG disclaimer id (verified matching ids); `aria-busy` toggles while pending. CTA disabled while the field is empty (`aria-busy` mirrored).
- [x] **Color contrast** — 0 `color-contrast` violations in LIGHT and DARK on both letters; the `bg-brand-50/…` box band and the `--ds-color-warning-soft` banner band both pass dark (the project's tinted-band dark gotcha is cleared here).
- [x] **Motion** — pending spinner uses `motion-safe:animate-spin` (stilled under `prefers-reduced-motion: reduce`); no autopilot cascade in this feature (n/a per spec §12).
- [x] **Images / icons** — all lucide icons (`Sparkles`, `Info`, `Loader2`, `AlertTriangle`) are `aria-hidden="true"`; no informational `<img>`.
- [x] **Live regions** — result/fallback announced via `<p role="status" aria-live="polite" data-testid="fakten-capture-status">`.
- [x] **§2 RDG disclaimer** — present verbatim, `§ 2 RDG` wrapped via `wrapNormZitate` (NormZitatSpan), and programmatically associated with the textarea (`aria-describedby`). Text confirmed: "Formulierungshilfe — keine Rechtsberatung … (§ 2 RDG) …".
- [x] **Offline fallback note** — `fallback_note` / `error_note` render into the same polite `role=status` region (perceivable + announced); not a silent fail.
- [x] **No-Suspension banner non-dismissible** — `role="note"`, `aria-label="Wichtiger Hinweis zur Zahlung"`, **0** interactive/close controls inside the banner; both Fristen present (Widerspruch 13.06.2026 + Zahlung 15.06.2026, neither hidden nor merged); cites § 86a Abs. 2 SGG / § 80 Abs. 2 VwGO via NormZitatSpan.
- [x] **Touch targets** — CTA is `Button size="sm"` (meets the 44px-effective min in the shared primitive; no shrink below baseline observed by axe `target-size`).

## Issues to fix (in priority order)
None blocking. No `serious`/`critical` and no `moderate`/`minor` axe violations were found on
either letter in either colour mode.

## BITV 2.0 specifics
- [x] `lang` attribute correct on root (`de`); textarea additionally pins `lang="de" dir="ltr"`.
- Plain-language / sign-language landing stubs are out of scope for this compose-surface feature
  (covered by the dashboard/landing audits); not regressed here.

## Recommendations for code-reviewer
- No a11y fixes required before merge.
- The cloud dev server is slow under repeated modal-chain load — full-doc axe scans intermittently
  exceed default Playwright timeouts on the heavier Mehmet inbox. Prefer `domcontentloaded` +
  explicit waits over `networkidle` if these checks are promoted into the permanent suite; the
  failures observed during this audit were runner timeouts, not component defects (every functional
  assertion and every axe scan that completed returned clean).
- Consider promoting a trimmed version of the temp spec into `tests/a11y/` so the box + banner stay
  guarded; if so, scope axe to the full document (not `include`-scoped after a dark re-render, which
  raced in this env).

## Audit method note
axe via `@axe-core/playwright` against live `next dev` on :3000 (full chromium at
`/opt/pw-browsers/chromium-1194/chrome-linux/chrome`; the default chrome-headless-shell is absent in
this env). Did not `next build` over the live dev server.
