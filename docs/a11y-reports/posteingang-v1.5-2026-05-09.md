---
feature: posteingang-v1.5
date: 2026-05-09
auditor: a11y-tester
verdict: FAIL
spec: docs/specs/posteingang-v1.5.md
baseline_v1: docs/a11y-reports/posteingang-2026-05-09-recheck.md (axe 0/0 PASS)
lighthouse:
  /posteingang: 91/100 (FAIL — spec floor 95)
  /posteingang/letter-anna-standesamt-eheschliessung-termin: 100/100 (PASS)
---

## Verdict: **FAIL**

The Posteingang V1.5 surface has **multiple serious + 1 critical axe-core violations**, regressing the V1 baseline of 0/0. Lighthouse a11y on `/posteingang` is **91 / 100** (spec floor 95). The ReplySheet focus-trap leaks. Cannot sign off PASS while serious/critical violations exist (per hard rules + spec §11).

## Routes tested

| Route | Viewport | Locale | Verdict |
|---|---|---|---|
| `/posteingang` | 1280×800 | DE | **FAIL** — 9 serious aria-prohibited-attr |
| `/posteingang` (FilterPopover open) | 1280×800 | DE | **FAIL** — 9 + 4 serious (aria-hidden-focus from base-ui guards) |
| `/posteingang` | 375×667 | DE | **FAIL** — 9 serious aria-prohibited-attr |
| `/posteingang` (FilterSheet open mobile) | 375×667 | DE | **FAIL** — 9 serious |
| `/posteingang` | 1280×800 | AR (RTL) | **FAIL** — 9 serious; html dir=rtl ✓ |
| `/posteingang` (FilterPopover) | 1280×800 | AR | **FAIL** — 9 + 4 serious |
| `/posteingang/letter-001` | 1280×800 | DE | PASS — 0 violations (legacy archetype) |
| `/posteingang/letter-002` | 1280×800 | DE | PASS — 0 violations (legacy archetype) |
| `/posteingang/letter-anna-standesamt-eheschliessung-termin` | 1280×800 | DE | PASS — 0 violations on reader idle |
| `/posteingang/letter-anna-…` (ReplySheet open, freitext) | 1280×800 | DE | **FAIL** — 1 critical + 1 serious |
| `/posteingang/letter-anna-…` (ReplySheet open, termin_antwort) | 1280×800 | DE | **FAIL** — 1 critical + 1 serious |
| `/posteingang/letter-anna-…` (ReplyDiscardConfirmDialog open) | 1280×800 | DE | **FAIL** — 2 serious (color-contrast) |
| `/posteingang/letter-anna-…` | 1280×800 | AR | PASS — reader idle, ReplySheet not opened in test |

## Automated axe-core results

| Route × Locale | critical | serious | moderate | minor | Sample |
|---|---|---|---|---|---|
| /posteingang DE | 0 | **9** | 0 | 0 | `aria-prohibited-attr` on `<span aria-label="Empfangen über Briefpost">` (no role) |
| /posteingang DE + FilterPopover | 0 | **13** | 0 | 0 | + `aria-hidden-focus` on 4 `[data-base-ui-focus-guard]` sentinels |
| /posteingang mobile DE | 0 | **9** | 0 | 0 | same as desktop |
| /posteingang mobile DE + FilterSheet | 0 | **9** | 0 | 0 | same |
| /posteingang AR | 0 | **9** | 0 | 0 | same (Arabic aria-label) |
| /posteingang AR + FilterPopover | 0 | **13** | 0 | 0 | same + 4 focus-guard |
| /posteingang/letter-001 DE | 0 | 0 | 0 | 0 | — |
| /posteingang/letter-002 DE | 0 | 0 | 0 | 0 | — |
| /posteingang/letter-anna-standesamt-… DE | 0 | 0 | 0 | 0 | — |
| ReplySheet (freitext) DE | **1** | 1 | 0 | 0 | `label` on `#reply-attachments` (file input) + `color-contrast` on muted description |
| ReplySheet (termin_antwort) DE | **1** | 1 | 0 | 0 | same |
| ReplyDiscardConfirmDialog DE | 0 | 2 | 0 | 0 | `color-contrast` on selected template description + destructive button |
| Reader/ReplySheet AR | 0 | 0 | 0 | 0 | (sheet did not open in test — AR locale missing button label match) |

## Lighthouse a11y

| Page | Score | Spec floor | Pass? |
|---|---|---|---|
| `/posteingang` | **91 / 100** | ≥ 95 | **FAIL** |
| `/posteingang/letter-anna-standesamt-…` | **100 / 100** | ≥ 95 | PASS |

Lighthouse-only audits also fired (axe in WCAG-2.1-AA mode didn't fire these):
- `heading-order` — V1.5 status group `<h3>` elements skip the `<h2>` level under the page `<h1>`.
- `target-size` — at least one button (340 × 21.7 px) on the LetterCard has insufficient touch target height.

## Issues (priority order)

### 1. **CRITICAL — `label` violation on file input** (WCAG 4.1.2, 1.3.1)

**Location**: `src/components/posteingang/ReplySheet.tsx:800-808`

```tsx
<input
  ref={inputRef}
  type="file"
  multiple
  accept={LETTER_ATTACHMENT_LIMITS.ALLOWED_MIME.join(',')}
  onChange={onAdd}
  className="sr-only"
  id="reply-attachments"
/>
```

The `<input type="file" id="reply-attachments">` has no associated `<label htmlFor="reply-attachments">` and no `aria-label` / `aria-labelledby`. The wrapping `<fieldset><legend>` does not satisfy the input-label requirement for individual form fields.

**axe id**: `label` — *Form elements must have labels*
**Fix**: add `aria-label={t('add_button')}` directly on the `<input>`, or render a sibling `<label htmlFor="reply-attachments" className="sr-only">{t('label')}</label>`.

### 2. **SERIOUS — `aria-prohibited-attr` on AuthentizitaetsBadge `tiny-icon-only`** (WCAG 4.1.2)

**Location**: `src/components/posteingang/AuthentizitaetsBadge.tsx:71-82`

A `<span>` with no role is a *generic* element. axe forbids `aria-label` on generics because there's no name-recipient role; the label is silently ignored by ATs. **9 nodes per page** × 6 inbox-render configurations.

**Fix** (pick one):
- (A) Promote wrapper to `<span role="img" aria-label={ariaLabel}>`.
- (B) Drop wrapper `aria-label`, expose channel name via inner `<span className="sr-only">{ariaLabel}</span> <span aria-hidden="true">{shortLabel}</span>`.
- (C) Convert to `<button type="button">` if click should open tooltip — changes V1.5 spec contract.

### 3. **SERIOUS — `aria-hidden-focus` on base-ui focus-guard sentinels** (WCAG 4.1.2)

**Location**: emitted by `@base-ui/react/popover` runtime. 4 nodes per popover-open render. Selectors: `span[data-base-ui-focus-guard][aria-hidden="true"][tabindex="0"]`.

**Root cause**: base-ui's Popover injects two pairs of focus sentinels marked `aria-hidden="true"` *and* `tabindex="0"`. WAI-ARIA practice forbids focusable elements being aria-hidden.

**Fix recommendation** (foundation-level decision):
- (A) Upgrade `@base-ui/react` if a newer release ships a fix.
- (B) Replace base-ui Popover/Sheet/Dialog with shadcn/Radix primitives.
- (C) `useEffect` to strip `aria-hidden` from `[data-base-ui-focus-guard]` after mount (hack).

Same root cause potentially affects every base-ui dialog/popover/menu in the app.

### 4. **SERIOUS — `color-contrast` on selected template-picker description** (WCAG 1.4.3)

**Location**: `src/components/posteingang/ReplySheet.tsx:574-576`

When the template card is `checked`, parent gets `bg-muted`. `text-muted-foreground` over `bg-muted` is below 4.5:1.

**Fix**: replace `text-muted-foreground` with `text-foreground/85` for the *checked* variant only.

### 5. **SERIOUS — ReplySheet focus-trap leaks** (WCAG 2.4.3, 2.1.2)

**Location**: `src/components/posteingang/ReplySheet.tsx` + `src/components/ui/sheet.tsx`.

Manual Tab cycle: Tab 12 = focus-guard → **Tab 13–17 = focus escapes to BODY → "Zum Hauptinhalt springen" → sidebar nav links**. Hard WCAG 2.4.3 fail.

**Fix**:
- Add `aria-modal="true"` on SheetContent.
- Audit base-ui `<Dialog>` initial-focus + final-focus configuration.
- Add Playwright test asserting Tab 0..30 keeps `document.activeElement` inside `[data-slot="sheet-content"]`.

### 6. **MODERATE — Heading order skip on inbox** (WCAG 1.3.1)

Page renders `<h1>Posteingang</h1>` then jumps to `<h3>` for "Neu", "Frist ≤ 7 Tage" without intervening `<h2>`.

**Fix**: add `<h2 className="sr-only">{t('list_heading')}</h2>` above list, or demote group headers to `<h2>`.

### 7. **MODERATE — Touch target too small on V1.5 LetterCard button** (WCAG 2.5.8)

**Location**: V1.5 "Vorgang erstellen / verknüpfen" CTA inside LetterCard utility row. Width 340.1 × **height 21.7 px**. WCAG 2.5.8 requires ≥ 24 × 24 px.

**Fix**: bump height to ≥ 24 px (`h-6`) or add `py-1`.

### 8. **MINOR — `aria-modal` missing on AlertDialog and Sheet popups**

PreVersandModal, ReplyDiscardConfirmDialog, ReplySheet render with `role="alertdialog"`/`role="dialog"` but without `aria-modal="true"`. Spec §11 explicitly requires it.

**Fix**: pass `aria-modal="true"`. Combined with #5 also tightens focus-trap.

### 9. **MINOR — Missing translation key fallback**

Visible on inbox: literal string `posteingang.reader.rechtliche_hinweise_summary` rendered. Likely a key-resolution bug in `RechtlicheHinweiseDetails`.

**Fix**: add the key under the right namespace.

## BITV 2.0

- [x] `<html lang="de">` correct on DE; switches to `lang="ar"`+`dir="rtl"` on AR.
- [x] Reply body forced to `dir="ltr" lang="de"` regardless of UI locale.
- [n/a] Plain-language toggle / sign-language video — out of V1.5 scope.
- [ ] BITV 2.0 implicitly inherits WCAG 2.1 AA. The blockers above all map to BITV 2.0 9.4.1.2 + 9.1.4.3 + 9.4.1.2 + 9.3.3.2.

## Recommendations

1. **Block merge** until Issues #1, #2, #4, #5 resolved.
2. Issue #3 (base-ui focus-guard) needs strategy decision — upgrade base-ui or migrate to Radix-based shadcn primitives.
3. Issues #6 + #7 are quick wins.
4. After fixes, re-run `npm run dev` with `NEXT_PUBLIC_RELIABLE=1`, then `npx playwright test --project=a11y tests/a11y/posteingang.spec.ts`.

## Tooling note

- `seedIfEmpty()` only writes localStorage from browser context. Without warm-up + reliable mode, axe scans run against pages with no letter cards, hiding the `aria-prohibited-attr` blocker entirely.
- Recommend marking `tests/a11y/posteingang.spec.ts` `test.skip(!process.env.NEXT_PUBLIC_RELIABLE, …)`.

**Final verdict: FAIL** — fix Issues #1 (critical), #2, #3, #4, #5 (serious) before merge. Per agent hard-rules: cannot sign off PASS while serious or critical axe violations exist on the new V1.5 surface.
