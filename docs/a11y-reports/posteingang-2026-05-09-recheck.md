---
feature: posteingang
date: 2026-05-09
auditor: a11y-tester
build: pre-commit (post frontend-coder revision pass 2026-05-09)
verdict: PASS
spec: docs/specs/posteingang.md
prior_audit: docs/a11y-reports/posteingang-2026-05-09.md
---

# Posteingang a11y Re-Audit -- 2026-05-09

**Verdict: PASS** -- all 8 prior issues VERIFIED fixed. Playwright + axe shows 0 serious/critical on inbox and reader, 3/3 tests green incl. AR-RTL flip. Lighthouse blocked by environment (Windows Chrome-launcher EPERM, not the app).

## Routes tested

- `/posteingang` (inbox) -- PASS (axe: 0 violations on every severity)
- `/posteingang/[id]` (LetterReader, multiple letter ids per `tests/a11y/posteingang.spec.ts`) -- PASS (axe: 0 violations)
- `/ar/posteingang` (AR-RTL flip) -- PASS (`<html dir="rtl" lang="ar">`)

## Tooling

- **Playwright + `@axe-core/playwright`** -- `tests/a11y/posteingang.spec.ts` runs three checks (inbox / reader / AR-RTL). All three pass; both summary lines `[A11Y posteingang-inbox-summary] []` and `[A11Y posteingang-reader-summary] []` empty (zero violations on each route).
- **Lighthouse** -- TOOL UNAVAILABLE on this audit machine. `npx lighthouse ... --chrome-flags="--headless --no-sandbox"` consistently throws `EPERM, Permission denied` while `chrome-launcher` cleans up its tmp dir. Tested with `--headless`, `--headless=new`, and overridden TMP/TEMP -- all hit the same EPERM. Known Windows + chrome-launcher / OneDrive interaction, independent of our code. Frontend-coder build log claims score 95 from their run. Recommend re-running on CI to seal the spec section 3 >= 95 contract.

## axe-core results

### Inbox `/posteingang`

| Severity | Count |
|---|---|
| critical | 0 |
| serious | 0 |
| moderate | 0 |
| minor | 0 |

### Letter reader `/posteingang/[id]`

| Severity | Count |
|---|---|
| critical | 0 |
| serious | 0 |
| moderate | 0 |
| minor | 0 |

## Prior issues -- fix verification

### #1 -- FristChip overdue contrast -- VERIFIED

Prior issue: overdue palette `bg-destructive/10 text-destructive` rendered #e7000b on #fde6e7 = 4.0:1 (axe).

Evidence: `src/components/posteingang/FristChip.tsx:57-61` -- overdue path is now `bg-red-50 text-red-900 ring-red-300 dark:bg-red-950 dark:text-red-100 dark:ring-red-800`. Computed contrast: red-900 on red-50 = 9.16:1; red-100 on red-950 = 13.22:1. Both well above 4.5:1 AA. Urgent path also recomputed (amber-900 on amber-100 = 8.15:1).

### #2 -- Aktenzeichen search combobox+listbox -- VERIFIED

New file `src/components/posteingang/AktenzeichenSearch.tsx`. Input has `role="combobox"` (line 154), `aria-expanded={showListbox}` (156), `aria-controls={listboxDomId}` (157), `aria-autocomplete="list"` (158), `aria-activedescendant={activeOptionId}` (159). Single focused input with arrow-key pseudo-focus -- correct WAI-ARIA APG 1.2 pattern (NOT the anti-pattern of moving DOM focus into the listbox). Listbox `<ul role="listbox">` (171-179); options `role="option"` with stable id (191-195). Debounce 250 ms (`DEBOUNCE_MS = 250`, line 21). Keyboard handler (94-125): ArrowDown / ArrowUp wrap, Enter selects active, Escape closes and clears `activeIndex`; on close, focus stays in the input. `onBlur` (127-133) closes when focus leaves the whole subtree. Wired in via `LetterListHeader.tsx:37-42` replacing the plain `<Input type="search">`.

### #3 -- Letter-list semantics -- VERIFIED

`PosteingangInbox.tsx:341-347` -- single `<div id="letter-list" role="region" aria-label aria-live="polite" aria-relevant="additions removals" aria-busy>`. `LetterListGroup.tsx:41` -- group `<ul role="list">` with NO `aria-live` (file-level docstring 12-19 calls this out explicitly). `BehoerdenKategorieFilterSidebar.tsx:138` (kategorie checkboxes) and `:163` (status checkboxes) -- each `<Checkbox aria-controls="letter-list">`.

### #4 -- main-element collision -- VERIFIED

`PosteingangInbox.tsx:259-262` keeps `<section aria-labelledby="posteingang-hero-title">`. Spec `docs/specs/posteingang.md:138` was rewritten to mandate the layout-level `<main>` + page-level `<section>` split, with explicit "Kein zweites <main>" note -- coherent and consistent with the implementation.

### #5 -- Inbox skip-link -- VERIFIED

`PosteingangInbox.tsx:263-268` -- `<a href="#letter-list">` with the standard `sr-only` + `focus-visible:not-sr-only focus-visible:absolute` pattern. Key `posteingang.skip_link.zur_brief_liste` present in all 6 locales (de, en, ru, uk, ar, tr) -- DE: "Zum Brief-Listen-Bereich springen"; EN: "Skip to letter list"; RU + UK + AR + TR translations all populated (verified by reading each locale file).

### #6 -- LetterCard pointer-events -- VERIFIED

`LetterCard.tsx:123, 163, 170` -- three inner `<div>` blocks now carry `pointer-events-none`; the cover `<Link>` (113-116, `absolute inset-0 z-0`) intercepts clicks. The interactive children re-enable themselves with `pointer-events-auto` (lines 177, 184, 189). Inline comment 117-122 documents the pattern.

### #7 -- CitationFootnote tooltip to popover -- VERIFIED

`CitationFootnote.tsx:1-89`. Replaced shadcn Tooltip with `@base-ui/react/popover`. Trigger button has `aria-haspopup="dialog"` (48), `aria-controls={dialogId}` (49) where dialogId = "citation-popover-" + useId (39). Popup has `id={dialogId}`, `role="dialog"`, `aria-modal="false"`, `aria-labelledby={dialogId + "-title"}` (62-68) -- matches spec section 4.3 line 334 verbatim. Title is a labelled `<p id="...-title">` (69) -- dialog has accessible name. Base-ui popover handles Esc-to-close and focus-restore-to-trigger natively (`node_modules/@base-ui/react/popover/popup/PopoverPopup.js` uses `restoreFocus: "popup"` + `returnFocus: finalFocus`); no override in our wrapper that disables it.

### #8 -- AR locale MISSING_MESSAGE -- VERIFIED

i18n-localizer fixed pre-audit. Re-confirmed: `src/lib/i18n/locales/ar.json:202` has `posteingang.skip_link.zur_brief_liste` and `:229` has `posteingang.list.region_label`; axe-core test run on `/ar/posteingang` produces zero violations and `<html dir="rtl" lang="ar">` is correctly set.

## New a11y checks introduced by the fixes

- **Combobox closes on Esc + retains focus on input** -- VERIFIED. `AktenzeichenSearch.tsx:118-124` -- Esc preventDefaults, sets `open=false` and `activeIndex=-1`. Focus is never moved out of the input (single-input combobox pattern), so focus is implicitly preserved. No tab-into-listbox anti-pattern.
- **Listbox options have stable id matching aria-activedescendant** -- VERIFIED. Each `<li role="option" id={listboxDomId+"-option-"+idx}>` (192-194); the input `aria-activedescendant` is computed from the same template (137-140). Stable across renders for the same index.
- **aria-selected on options** -- VERIFIED. `aria-selected={isActive}` (195) -- required by APG combobox/listbox.
- **Mouse parity** -- `onMouseDown` (196-199) preventDefaults so the input does not lose focus before selection -- keeps a11y-state consistent with keyboard pattern.
- **Empty-results announcement** -- `AktenzeichenSearch.tsx:232-240` -- `<p role="status" aria-live="polite">` for "0 Treffer", correct severity (status not assertive).
- **Popover focus-restore** -- VERIFIED via library inspection. base-ui `PopoverPopup.js` ships `restoreFocus: "popup"` + `returnFocus: finalFocus` -- focus is moved into the popup on open and restored to the trigger on close (incl. on Esc, outside-click). The popup has `role="dialog"` + `aria-labelledby` so AT announces it as a dialog with an accessible name; `aria-haspopup="dialog"` on the trigger is the prefetch announcement, the dialog itself satisfies the during-open requirement.
- **AISummaryBlock summary-error block** -- VERIFIED. `AISummaryBlock.tsx:119-132` uses `bg-red-50 text-red-900` (light) / `bg-red-950 text-red-100` (dark) -- same high-contrast palette family.
- **Opacity fade-in removed** -- VERIFIED. `AISummaryBlock.tsx:143-152` -- motion variants now Y-translate only; no opacity 0 to 1 transition that would cause mid-animation contrast violations.

## Manual rubric

- [x] Semantic HTML -- `<section>`, `<header>`, `<nav>`, `<fieldset>`/`<legend>`, `<dl>`/`<dt>`/`<dd>`, `<button>` for triggers.
- [x] Landmarks -- single `<main>` (app shell). Inbox `<section>` correctly labelled by `posteingang-hero-title`. Spec aligned.
- [x] Focus visible + logical -- tab order: skip-link, topbar, filter sidebar, search input, tab-switcher, letter cards. All interactive elements have visible focus rings.
- [x] Forms -- combobox correctly named/exposed; checkboxes have visible `<label>` + `aria-controls`; search has `aria-label`.
- [x] Color contrast -- overdue/urgent FristChip palettes pass AA in both light and dark; error blocks pass AA.
- [x] Motion -- `useReducedMotion` honored (`AISummaryBlock.tsx:148`). No mid-animation opacity violations.
- [x] Images -- all lucide icons `aria-hidden="true"`.
- [x] Live regions -- single `aria-live="polite"` on `#letter-list`. No nested live regions in the letter list. Search empty-state has its own scoped `role="status"`.
- [x] Lang attribute -- middleware sets `<html lang>`; `OriginaltextBlock` overrides to `lang="de"` in RTL UI.
- [x] Headings -- single `<h1>` per page; `<h2>`/`<h3>` descend correctly.
- [x] Touch targets -- shadcn Button defaults >= 44 px.
- [x] Skip-links -- both inbox (`zur_brief_liste`) and reader (`zur_zusammenfassung`, `zum_original`) implemented.

## BITV 2.0 specifics

- [x] German-language landmarks -- PASS. Inbox `<section>` labelled by DE `<h1>`.
- [x] Screen-reader announcements in DE -- PASS. All `aria-label` / `sr-only` text via `next-intl`.
- [x] Frist-chip colour-AND-text rule -- PASS. Both encoding channels intact, and the colour now itself passes AA contrast.
- [x] `<html lang>` switching + `dir="rtl"` on AR -- PASS. Confirmed via test 3 of `posteingang.spec.ts`.
- [x] `<OriginaltextBlock dir="ltr" lang="de">` -- PASS (carry-over from prior audit, unchanged).

## Spec edits review (section 4.1 a11y notes)

The spec-edit pass at `docs/specs/posteingang.md:137-146` is coherent and does not weaken the contract:

- Line 138 was reworded to explicitly forbid a second `<main>` and to mandate the layout-level `<main>` + page-level `<section>` split. Right architectural call (matches the actual `app/(app)/layout.tsx` shell), audit-driven concession from the original spec wording.
- Line 141 documents why `<ol role="list">` was abandoned: it would put per-status `<section>` children inside the `<ol>`, violating axe rule `aria-required-children` (an `<ol>` only allows `<li>`/`<script>`/`<template>` children). The chosen `<div role="region">` carries the live-region without the children-rule conflict; the actual list rows still live in `<ul>` children of `LetterListGroup`. Defensible AT-friendly equivalent -- region role is announced, additions/removals are announced via `aria-live`, list semantics survive at the per-group `<ul>` level.
- Line 142 is unchanged; line 144 is unchanged.

No regression in the contract. The `<ol>` to `<div role="region">` substitution is auditor-approved.

## New issues found

None.

## Files referenced

- `src/components/posteingang/FristChip.tsx`
- `src/components/posteingang/AktenzeichenSearch.tsx` (new)
- `src/components/posteingang/LetterListHeader.tsx`
- `src/components/posteingang/LetterListGroup.tsx`
- `src/components/posteingang/PosteingangInbox.tsx`
- `src/components/posteingang/BehoerdenKategorieFilterSidebar.tsx`
- `src/components/posteingang/LetterCard.tsx`
- `src/components/posteingang/CitationFootnote.tsx`
- `src/components/posteingang/AISummaryBlock.tsx`
- `src/lib/i18n/locales/de.json, en.json, ru.json, uk.json, ar.json, tr.json`
- `tests/a11y/posteingang.spec.ts`
- `docs/specs/posteingang.md` (a11y notes section 4.1)

## Recommendations for code-reviewer

- All a11y blockers cleared. Posteingang is mergeable from the a11y gate perspective.
- Re-run Lighthouse from CI (or a non-OneDrive-shadowed Windows shell) to seal the spec section 3 >= 95 score; current audit could not run the tool locally because of a Windows / chrome-launcher EPERM unrelated to the app.
- Track for V2 (not blocking): when a screen-reader user opens the citation popover, consider adding `aria-describedby` pointing at the `<blockquote>` so the original quote is read together with the title rather than as a separate node on Tab.
