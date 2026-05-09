---
feature: posteingang
date: 2026-05-09
auditor: a11y-tester
verdict: FAIL
spec: docs/specs/posteingang.md
follow_up: docs/reviews/2026-05-09-posteingang-code.md
---

# Posteingang a11y Audit — 2026-05-09

**Verdict: FAIL** — one serious axe violation plus four spec-contract gaps. Inbox auto-pass blocked. Reader code-review pass; reader axe scan unverifiable (dev-server build cache corruption on Windows).

## Routes tested

- `/posteingang` (inbox) — FAIL (axe: 1 serious + spec contract gaps)
- `/posteingang/[id]` (LetterReader) — code review only (axe scan blocked by stale Next webpack cache: `.next/cache` EPERM rename loop crashing the `[id]` route into `<html id="__next_error__">`. New `tests/a11y/posteingang.spec.ts` is in place; rerun after cache clear.)

## Tooling

- **Playwright + `@axe-core/playwright`**: spec written at `tests/a11y/posteingang.spec.ts` modeled on `umzug.spec.ts`. Inbox + RTL passed runtime; reader test fails to render due to Windows webpack cache corruption.
- **Lighthouse**: NOT INSTALLED locally. Per task brief, gap documented. Spec §3 target ≥ 95 cannot be verified by audit; frontend-coder must run `npx lighthouse http://localhost:3000/posteingang --only-categories=accessibility` after fixes.

## axe-core results (inbox)

| Severity | Count | Sample |
|---|---|---|
| critical | 0 | — |
| serious | 1 (2 nodes) | `color-contrast` on overdue `<FristChip>` (#e7000b on #fde6e7, ratio 4.0, expected 4.5) |
| moderate | 0 | — |
| minor | 0 | — |

## WCAG 2.1 AA per criterion

| Criterion | Verdict | Notes |
|---|---|---|
| 1.3.1 Info and Relationships | FAIL | Spec §4.1 contract: `<main role="main" aria-labelledby="posteingang-hero-title">` and `<ol role="list" id="letter-list" aria-live="polite">`. Actual: page wraps content in `<section>` (PosteingangInbox.tsx:251); `id="letter-list"` is on a `<div>` (PosteingangInbox.tsx:356) not `<ol>`/`<ul>`, has no role/aria-live; the live regions live one level deeper on each LetterListGroup `<ul>` (LetterListGroup.tsx:38–42). Per spec, the *outer* list is the live region. |
| 1.4.3 Contrast (Minimum) | FAIL | Overdue FristChip palette `bg-destructive/10 text-destructive` (FristChip.tsx:58) renders #e7000b on #fde6e7 = 4.0:1 (axe), under 4.5:1. Hits BITV "Frist-chip encodes urgency by colour and text" — text fails AA contrast on the very chip whose redness conveys urgency. |
| 2.1.1 Keyboard | PASS (with caveat) | Card link is keyboard-reachable. Caveat: a regular mouse click on the LetterCard is intercepted by the inner `<p class="font-mono">` (LetterCard.tsx:145) and the `Mail` icon (line 149) because the `<a>` cover sits at `z-0` (line 113) while siblings are `z-10`. Keyboard fine, pointer-event blocking is poor UX. |
| 2.4.3 Focus Order | PASS | Tab order: skip-link → topbar → filter sidebar → search → tab-switcher → letter cards. Logical. No positive `tabindex`. |
| 2.4.6 Headings and Labels | PASS | Single `<h1>` per page (PosteingangInbox.tsx:256, LetterReader.tsx:244). `<h2>`/`<h3>` levels descend correctly. |
| 2.4.7 Focus Visible | PASS | LetterCard cover-link has `focus-visible:ring-2 focus-visible:ring-ring/60`. FristChip/CitationFootnote also OK. |
| 3.3.2 Labels or Instructions | PASS | Filter checkboxes `<label htmlFor>` paired. `<fieldset>`/`<legend>` for kategorie + status groups. Search input has `aria-label`. |
| 4.1.2 Name, Role, Value | FAIL | Spec §4.1 line 142: search input must be `<input role="combobox" aria-expanded>` with `role="listbox"` trefferliste. Actual: plain `<Input type="search">` with `aria-label` only (LetterListHeader.tsx:38–46). No `role="combobox"`, no `aria-expanded`, no listbox. Spec §4.1 line 139: filter checkboxes need `aria-controls="letter-list"`. Actual: checkboxes have no `aria-controls` (BehoerdenKategorieFilterSidebar.tsx:136–140, 160–164). |
| 4.1.3 Status Messages | PARTIAL | Loading skeletons set `aria-busy="true"` correctly. Outer letter-list div lacks `aria-live` (spec contract gap). Multiple `aria-live="polite"` regions are nested (LetterListGroup level), which can cause SR double-announcements when filters change. Spec wants ONE live region: the outer `#letter-list` ordered list. |

## BITV 2.0 specifics

- **German-language landmarks** — PASS for the inbox section/header. FAIL spec contract: no `<main>` *inside* the route (the only `<main>` is the app shell). Spec §4.1 explicitly requires a page-level `<main>`.
- **Screen-reader announcements in DE** — PASS. All `aria-label`/`sr-only` text is German via `next-intl` (FristChip.tsx:49–55 `srLabel`; LetterCard.tsx:125–127; AuthentizitaetsBadge similarly).
- **Frist-chip colour-AND-text rule** — PARTIAL. Text label `"Einspruchsfrist · abgelaufen am 12.04.2026"` is present (good — colour is not the only signal). But the colour itself fails 1.4.3 minimum contrast, so a low-vision user reading the *text* on the *red chip* literally cannot pass WCAG AA on the very chip whose redness encodes urgency. **BITV killer.**
- **`<html lang>` switching + `dir="rtl"` on AR** — PASS. AR cookie flips `<html dir="rtl" lang="ar">`. However at audit time, AR locale threw `MISSING_MESSAGE` for `posteingang.*` keys (since fixed by i18n-localizer 2026-05-09).
- **`<OriginaltextBlock dir="ltr" lang="de">`** — PASS (OriginaltextBlock.tsx:73–74). Originaltext stays LTR in AR-RTL UI, per spec §4.3 line 337.

## Issues to fix (priority order, line-specific)

1. **[SERIOUS — WCAG 1.4.3]** `src/components/posteingang/FristChip.tsx:58` — `bg-destructive/10 text-destructive` on overdue chips renders #e7000b on #fde6e7 = 4.0:1. Replace with palette that meets ≥ 4.5:1.
2. **[SERIOUS — spec §4.1 contract — WCAG 4.1.2]** `src/components/posteingang/LetterListHeader.tsx:38–46` — search input must be `role="combobox"` with `aria-expanded`, plus a `role="listbox"` results panel for Aktenzeichen-Suche autocomplete.
3. **[MODERATE — spec §4.1 contract — WCAG 1.3.1 / 4.1.3]** `src/components/posteingang/PosteingangInbox.tsx:356` — `<div className="flex flex-col gap-6" id="letter-list">` should be a single semantic `<ol role="list" aria-live="polite">` per spec §4.1 line 141, and the per-group `<ul aria-live="polite">` in `LetterListGroup.tsx:38–42` should drop their `aria-live` to avoid nested live regions. The filter `<Checkbox>` controls in `BehoerdenKategorieFilterSidebar.tsx:136–140` and `:160–164` then need `aria-controls="letter-list"`.
4. **[MODERATE — spec §4.1 contract]** `src/components/posteingang/PosteingangInbox.tsx:251` — outer wrapper is `<section aria-labelledby="posteingang-hero-title">`. Spec calls for `<main role="main">`. App layout already provides one `<main>`. Two-`<main>` is invalid; pick one. Recommendation: keep the layout-level `<main>` and update spec §4.1 a11y notes accordingly.
5. **[MODERATE — spec §4.1 line 144]** Inbox lacks the spec-required skip-link "Zum Brief-Listen-Bereich springen". `LetterReader.tsx:197–210` correctly implements `skip_link.zur_zusammenfassung` / `skip_link.zum_original` for the reader. Inbox needs an analogous `<a href="#letter-list">` near the top of `PosteingangInbox.tsx`.
6. **[MODERATE — UX/keyboard, not strict WCAG]** `src/components/posteingang/LetterCard.tsx:113` — cover-link sits at `z-0` while content sits at `z-10` (lines 116, 156, 163). Mouse clicks on the aktenzeichen `<p>` and the `<Mail>` icon are not intercepted by the link.
7. **[MINOR — spec §4.3 line 334]** `src/components/posteingang/CitationFootnote.tsx:38–48` — trigger uses shadcn `<Tooltip>` (hover/focus tooltip), not the spec's `aria-haspopup="dialog" aria-controls="citation-popover-{n}"` button-popover with focus trap.
8. **[MINOR — i18n gap, not strictly a11y]** AR locale throws `MISSING_MESSAGE` for `posteingang.*` keys at audit time. **Resolved 2026-05-09 by i18n-localizer.**

## Manual rubric

- [x] Semantic HTML — `<section>`, `<header>`, `<nav aria-label="Filter">`, `<fieldset>`/`<legend>`, `<dl>`/`<dt>`/`<dd>` (LetterReader.tsx:247–260).
- [ ] Landmarks — single `<main>` in app shell only; spec wants page-level `<main>`.
- [x] Focus visible + logical — `focus-visible:ring-*` consistently applied; tab order matches visual flow.
- [ ] Forms — search input not a combobox per spec; checkboxes lack `aria-controls`.
- [ ] Color contrast — overdue FristChip fails AA.
- [x] Motion — `useReducedMotion` honored in AISummaryBlock.tsx:90, 167–171.
- [x] Images — all `lucide-react` icons have `aria-hidden="true"`.
- [ ] Live regions — multiple nested aria-live, plus the canonical outer letter-list lacks one.
- [x] `lang` attribute — set by middleware; `OriginaltextBlock` overrides to `lang="de"` in RTL UI.
- [x] Headings — h1/h2/h3 hierarchy clean.
- [x] Touch targets — all buttons ≥ 44×44 (shadcn Button defaults).
- [ ] Skip-links — global skip-to-main present; Posteingang-specific skip-to-list missing.

## Recommendations

- Block merge until issues 1, 2, 3 are fixed (1 = WCAG-blocking; 2, 3 = spec-contract).
- Re-run `npx playwright test tests/a11y/posteingang.spec.ts --project=a11y` after fixes; the inbox test must reach 0 serious/critical.
- Clear `.next/cache` before re-running so the reader axe scan can complete (Windows `EPERM` on webpack pack-file rename).
- Run `npx lighthouse http://localhost:3000/posteingang --only-categories=accessibility --view` and `…/<letter-id>` to confirm spec §3 ≥ 95 score.

## Files referenced

- `src/components/posteingang/FristChip.tsx`
- `src/components/posteingang/LetterListHeader.tsx`
- `src/components/posteingang/PosteingangInbox.tsx`
- `src/components/posteingang/LetterListGroup.tsx`
- `src/components/posteingang/BehoerdenKategorieFilterSidebar.tsx`
- `src/components/posteingang/LetterCard.tsx`
- `src/components/posteingang/CitationFootnote.tsx`
- `src/app/(app)/layout.tsx`
- `tests/a11y/posteingang.spec.ts` (newly added)
