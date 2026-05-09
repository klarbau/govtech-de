---
feature: posteingang-v1.5
date: 2026-05-09
auditor: a11y-tester
verdict: FAIL
prior_audit: docs/a11y-reports/posteingang-v1.5-2026-05-09.md (FAIL — 1 critical + 4 serious + 2 moderate + 1 minor)
spec: docs/specs/posteingang-v1.5.md
lighthouse:
  /posteingang: 100/100 ✓ (≥ 95)
  /posteingang/letter-anna-standesamt-eheschliessung-termin: 100/100 ✓
remaining:
  - 1 SERIOUS color-contrast on destructive button (regressed from prior #4-bis; token-level)
---

# Posteingang V1.5 a11y RECHECK — Final Report

**Verdict: FAIL** — 1 SERIOUS color-contrast violation remains on `<Button variant="destructive">` inside `<ReplyDiscardConfirmDialog>` (WCAG 1.4.3). Per agent hard rules, no PASS while serious axe violation exists on the V1.5 surface.

## Routes tested

| Route × State | Locale | Viewport | axe-core (c/s/m/n) |
|---|---|---|---|
| /posteingang (idle) | DE | 1280×800 | 0/0/0/0 |
| /posteingang + FilterPopover open | DE | 1280×800 | 0/0/0/0 |
| /posteingang | DE | 375×667 | 0/0/0/0 |
| /posteingang + FilterSheet open | DE | 375×667 | 0/0/0/0 |
| /posteingang | AR (RTL) | 1280×800 | 0/0/0/0 |
| /posteingang + FilterPopover | AR | 1280×800 | 0/0/0/0 |
| /posteingang/letter-001 | DE | 1280×800 | 0/0/0/0 |
| /posteingang/letter-002 | DE | 1280×800 | 0/0/0/0 |
| /posteingang/letter-anna-standesamt-eheschliessung-termin (idle) | DE | 1280×800 | 0/0/0/0 |
| ReplySheet × `frist_verlaengerung` | DE | 1280×800 | 0/0/0/0 |
| ReplySheet × `nachweis_einreichen` (incl. Select dropdown probe) | DE | 1280×800 | 0/0/0/0 |
| ReplySheet × `informative_rueckmeldung` | DE | 1280×800 | 0/0/0/0 |
| ReplySheet × `termin_antwort` | DE | 1280×800 | 0/0/0/0 |
| ReplySheet × `freitext` | DE | 1280×800 | 0/0/0/0 |
| **ReplyDiscardConfirmDialog open** | DE | 1280×800 | **0/1/0/0 — color-contrast** |
| PreVersandModal open | DE | 1280×800 | 0/0/0/0 |
| ReplyTemplateSwitchConfirmDialog open | DE | 1280×800 | 0/0/0/0 |

## Lighthouse a11y

| Page | Score | Spec floor |
|---|---|---|
| `/posteingang` | **100 / 100** | ≥ 95 ✓ |
| `/posteingang/letter-anna-standesamt-eheschliessung-termin` | **100 / 100** | ≥ 95 ✓ |

## Per-issue resolution status (vs prior audit)

| Prev # | Severity | Status |
|---|---|---|
| 1 (file input label) | CRITICAL | **FIXED** — `aria-label={t('add_button')}` at `ReplySheet.tsx:902`; ReplySheet axe 0/0 across all 5 templates. |
| 2 (`aria-prohibited-attr` on AuthentizitaetsBadge) | SERIOUS | **FIXED** — `AuthentizitaetsBadge.tsx:71-82` now plain `<span>` (no aria-label), inner `aria-hidden` short label + sibling `sr-only` full channel name. |
| 3 (`aria-hidden-focus` on base-ui focus-guard) | SERIOUS | **FIXED** — `useStripBaseUiFocusGuardAriaHidden` MutationObserver wired into Sheet, Dialog, FilterPopover, PreVersandModal, ReplyDiscardConfirmDialog, ReplyTemplateSwitchConfirmDialog. |
| 4 (template-picker selected-description contrast) | SERIOUS | **FIXED** — `text-foreground/85` for checked variant at `ReplySheet.tsx:613`. |
| **4-bis (destructive button contrast in ReplyDiscardConfirmDialog)** | **SERIOUS** | **NOT FIXED** — see Issue A below. |
| 5 (ReplySheet focus-trap leak) | SERIOUS | **FIXED** — `modal` prop on Root, `aria-modal="true"` on Popup, focus-guard strip; Playwright assertion in `tests/a11y/posteingang.spec.ts:101-135`. |
| 6 (heading order) | MODERATE | **FIXED** — `<h2 sr-only>` + `aria-labelledby` at `PosteingangInbox.tsx:355,361`. |
| 7 (touch target on VorgangsBuendelTag) | MODERATE | **FIXED** — `min-h-6 py-1` confirmed on both variants at `VorgangsBuendelTag.tsx:36,64`. |
| 8 (aria-modal missing) | MINOR | **FIXED** — present on Sheet, Dialog, PreVersandModal, ReplyDiscardConfirmDialog, ReplyTemplateSwitchConfirmDialog. |
| 9 (literal i18n key) | MINOR | **FIXED** — `RechtlicheHinweiseDetails` reads `posteingang.disclaimer.rechtliche_hinweise_summary`; key in all 6 locales. |

## Manual rubric — new components

### `<Select>` for `nachweis_bezeichnung` (PASS)
- `<button id="reply-nachweis-bezeichnung" role="combobox" aria-haspopup="listbox" aria-expanded="false" aria-label="Nachweis einreichen">` ✓
- `<label htmlFor>` association ✓
- Keyboard reachable via Tab ✓
- Enter opens listbox; ArrowDown + Enter selects; trigger updates ✓
- 13 controlled options enumerated correctly ✓
- Free-text input intentionally blocked per Domain §8 (RDG-Drift-Schutz) ✓
- axe scan: 0/0/0/0 ✓

### `<ReplyTemplateSwitchConfirmDialog>` (PASS)
- `role="alertdialog"`, `aria-modal="true"` on Popup ✓
- Title + Description via base-ui primitives ✓
- Cancel (`variant="outline"`) + confirm (default variant) — destructive style intentionally NOT used (body-overwrite confirm is not destructive) ✓
- focus-guard strip hook fires on `open` ✓
- ESC dismiss inherited ✓
- axe scan: 0/0/0/0 ✓

### `<ReplyDiscardConfirmDialog>` (FAIL color-contrast)
- `role="alertdialog"`, `aria-modal="true"`, focus-guard strip, ESC dismiss — all in place ✓
- Cancel button (`variant="outline"`) ✓
- **Confirm button uses `<Button variant="destructive">` → `bg-destructive/10 text-destructive`** ✗
- axe-core selector: `.bg-destructive\\/10`. Destructive-red foreground on 10%-opacity destructive-red background does not reach 4.5:1.
- Regressed from previous audit (was flagged under Issue #4 "color-contrast on … destructive button"); fix wave addressed only the template-picker description.

## BITV 2.0

- [x] `<html lang="de">` correct on DE; switches to `lang="ar" dir="rtl"` on AR.
- [x] Reply textarea `dir="ltr" lang="de"` (verified empirically in DE; AR static-confirmed via code review + standalone RTL test).
- [n/a] Plain-language toggle / sign-language placeholder out of V1.5 scope.
- [ ] BITV 2.0 9.1.4.3 (= WCAG 1.4.3) failed by Issue A.

## Issue A — SERIOUS color-contrast on destructive `<Button>`

- **WCAG**: 2.1 SC 1.4.3 Contrast (Minimum)
- **Root**: `src/components/ui/button.tsx:18-19` (variant `destructive`).
- **Rendered at**: `src/components/posteingang/ReplyDiscardConfirmDialog.tsx:56` `<Button type="button" variant="destructive" onClick={onConfirm}>`.
- **axe sample**: `target=[".bg-destructive\\/10"]`.
- **Token-level fix recommended** (do NOT apply per agent rules):
  - Bump background opacity OR change to a higher-contrast pairing (e.g. `bg-destructive text-destructive-foreground` for solid destructive).
  - Verify dark-mode pair (`dark:bg-destructive/20`) clears 4.5:1 too.
  - Alternative: keep light bg + darken foreground via dedicated `--destructive-text` token.

## Auditor caveats

1. **False-PASS risk on inbox renders.** `seedIfEmpty()` only runs in browser context; fresh Playwright contexts yielded empty inbox even after 20s warm-up. The 0/0/0/0 inbox scans confirm chrome cleanliness; AuthentizitaetsBadge × 9 cards × 6 configs is statically-verified-safe but not bulletproof empirical proof. **Recommendation**: stable Playwright preseed mechanism (`addInitScript` injection + test-only flag).
2. **AR ReplySheet open** could not be empirically scanned (same root-cause). Static review + standalone RTL test confirm correctness.

## Out-of-scope follow-up

- Duplicate translation key `posteingang.reader_extra.rechtliche_hinweise_summary` (line 670 in each locale file) is never read by any component. The canonical key is `posteingang.disclaimer.rechtliche_hinweise_summary` (line 501). Consider deleting the orphan.

## Recommendation

1. **BLOCK MERGE** until Issue A (destructive button color-contrast) is resolved. Token-level fix in `src/components/ui/button.tsx` so all future `variant="destructive"` callers inherit passing contrast.
2. After fix, re-scan only the ReplyDiscardConfirmDialog open state — the rest is already green.

**Verdict: FAIL — fix Issue A, then PASS expected.**
