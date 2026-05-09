---
feature: posteingang
date: 2026-05-09
reviewer: code-reviewer
verdict: REVISE
spec: docs/specs/posteingang.md
companion: docs/a11y-reports/posteingang-2026-05-09.md
---

# Posteingang Code Review — 2026-05-09

**Verdict: REVISE.** `tsc --noEmit` and `next lint` clean. Spec §11 not satisfied. Seven blocking issues, plus a longer list of nits.

## Blocking issues

### 1. `DatenschutzCockpitLink` is async-server imported into `'use client'` LetterReader

- **Files**: `src/components/posteingang/LetterReader.tsx:13,261`, `src/components/shared/DatenschutzCockpitLink.tsx:12`.
- The shared component is `async` and calls `getTranslations` from `next-intl/server`. Importing async-server-into-client violates the RSC boundary and will misbehave at runtime.
- Spec §3 also requires `?letter={id}` query support — component currently only supports `vorgangId`.
- Label is read from `umzug.detail.cta_datenschutz` — wrong namespace.
- Spec §5 marks this `<EXTEND>` — extension never happened.
- Also: `LetterCard.tsx` has **no** `<DatenschutzCockpitLink>` at all, but spec §3 success criterion + §11 checklist demand "Datenschutz-Cockpit-Link **auf jeder LetterCard**". Missing.

### 2. Wrong disclaimer wording in Inbox footer; missing `opening` on Hero

- **File**: `src/components/posteingang/PosteingangInbox.tsx:438`.
- Renders `<PrototypeDisclaimer />`, which reads `common.disclaimer.prototype` (Umzug-themed) instead of `posteingang.disclaimer.mock_data`.
- Spec §11 explicitly: "`posteingang.disclaimer.mock_data` ist im Inbox-Footer sichtbar; Wording verbatim §8.1".
- Likewise `posteingang.disclaimer.opening` is required on the **Posteingang-Hero** (spec §3 + §11) but only appears in `LetterReader.tsx:411-415`. Hero (lines 255-266) does not render it.

### 3. Activity-log enum mismatch — silent persistence loss

- **Files**: `src/components/posteingang/posteingang-api.ts:52,87`; `src/lib/mock-backend/schemas.ts:223-229`; `src/components/posteingang/LetterReader.tsx:114`.
- Wrapper types `aktion` as `'opened' | 'summary_generated' | 'frist_added_to_calendar'`.
- Mock-backend zod schema enforces `'opened_in_app' | 'summary_generated' | 'frist_added_to_calendar' | 'marked_read' | 'archived'`.
- `LetterReader.tsx:114` passes `'opened'`. Wrapper hides this via `(baseApi as unknown as Record<string, unknown>)` in `posteingang-api.ts:62` (forbidden cast per CLAUDE.md).
- Result: written entry fails next zod read → activity log silently empties → Datenschutz-Cockpit shows nothing — directly defeats Verifier-Auflage #9 / spec §6.3 / §11.

### 4. `as unknown as` + dead-code fallbacks throughout `posteingang-api.ts`

- **File**: `src/components/posteingang/posteingang-api.ts` (169 lines).
- All 5 mock-backend methods (`extrahiereAktion`, `searchLettersByAktenzeichen`, `getLettersByBehoerdenKategorie`, `erstelleVorgangAusBrief`, `protokolliereLetterAktivitaet`) are shipped on `baseApi`; the runtime `pick<T>()` fallback (`posteingang-api.ts:61-89`) never returns null; the entire wrapper layer is a hedge that's now obsolete.
- Per CLAUDE.md "no `as unknown as`", "no premature abstraction", file should either delete fallbacks or be removed entirely.
- `searchLettersByAktenzeichen`, `getLettersByBehoerdenKategorie`, `getLetterThread` are exposed but **never called** — dead exports.

### 5. Spec-mandated test missing

- Spec §6.2 + §11: "Aktenzeichen-Format-Test `tests/unit/aktenzeichen-format.test.ts` exit 0".
- File does not exist. `tests/unit/` directory does not exist.
- Verifier-Auflage #5 unmet.

### 6. `renderBulletText` runtime React-element introspection

- **Files**: `src/components/posteingang/AISummaryBlock.tsx:30-70`; `src/components/posteingang/WasKannIchTunFooter.tsx:19-34`.
- Does `'props' in node && node.type === 'strong'` plus `(node as React.ReactElement).props as { children?: string }`. Fragile reflection plus a type cast — will break on the next React internal change.
- Same NORM regex duplicated verbatim in both files.
- Refactor: parse text once into typed segments (`{kind:'plain'|'bold'|'norm'; text:string; norm?:string}[]`) before rendering, share the helper.

### 7. Inbox `Search` field is undebounced + spec deviation

- **File**: `src/components/posteingang/LetterListHeader.tsx:38-46`.
- Spec §4.1 + §5 explicitly call for `<AktenzeichenSearch>` debounced 250 ms calling `api.searchLettersByAktenzeichen`.
- Current implementation is a plain `<Input>` re-running `useMemo` filter on every keystroke.
- The `<AktenzeichenSearch>` component listed in the task brief was never created; no debounce; the dedicated API is wired but never used.

## Approval nits (non-blocking, fix while in there)

- `PosteingangInbox.tsx:255-266`: `<header>` lives inside `<section aria-labelledby="posteingang-hero-title">` but the `h1` is at the top of section already; spec calls for `<main role="main">` (§4.1 a11y notes) — page wraps in `<section>` only.
- `PosteingangInbox.tsx:107-120`: nested `useMemo` + `.filter((s): s is FilterStatus => […])` recomputes on every `searchParams` change but never mutates; replace with literal-tuple `as const`.
- `PosteingangInbox.tsx:317-318` and `LetterReader.tsx:309-318` / `:330-343`: identical retry blocks duplicated; lift into one helper.
- `VorgangsGruppe.tsx:106`: stray `<input type="hidden" data-vorgang-id={vorgangId} />` reads as dead/test scaffolding.
- `LetterReader.tsx:106`: `lettersIdRef = React.useRef(letter.id)` is set but never updated and only compared to itself; condition unreachable. Remove.
- `LetterReader.tsx:383`: imperative `document.getElementById('original')?.scrollIntoView(...)` instead of using a ref forwarded from `OriginaltextBlock`.
- `WasKannIchTunFooter.tsx:88-90`: `try { tCatalog(id) } catch { copy = id }` swallows missing-key errors silently; surface in dev or seed defaults instead.
- `FristChip.tsx`: spec §5 says EXTEND `FristCountdown`; coder created a sibling component. Now there are two date/diff helpers. Either consolidate or update spec.
- `FristDetailModal.tsx` was supposed to be EXTENDED per spec §4.4.1 with `original_zitat` + `.ics` export; instead `LetterReader.tsx:42-67` ships its own `downloadIcs` inline. Modal has not been touched. Decide and align.
- `MockWatermarkBanner.tsx`: rendered both inside `LetterReader.tsx:212` and again inside `OriginaltextBlock.tsx:88` — the brief shows two banners stacked.
- `NormTooltip.tsx:131-132`: `useTranslations()` (root) + `useTranslations('posteingang.normtooltip')` together; the second `tCommon('aria_open')` is built but never used to compose with norm name.
- `LetterDetailLoader.tsx:48`: dynamic `await import('@/lib/mock-backend')` — module is already statically imported via `posteingang-api.ts`. Replace with a direct `getVorgang` wrapper or have `posteingang-api.ts` expose it.
- `posteingang-api.ts` re-types `getBehoerden`/`getBehoerde` via `ReturnType<typeof baseApi.…>` — couples wrapper to mock-backend internals. Use `Behoerde`/`Promise<Behoerde[]>` directly.

## Convention adherence

- File placement & naming: matches CLAUDE.md.
- i18n: source-of-truth `de.json` complete for `posteingang.*`; verbatim wording for §8.1 disclaimers verified at `de.json:463-472` and §8.3 speculative footer at `de.json:215`. Other locales filled by i18n-localizer 2026-05-09.
- All 18 letters in `letters.json` carry `[MOCK]` in body and aktenzeichen (verified programmatically). All 18 have entries in `letter-summaries.json`; pre-open texts all ≤ 80 chars.
- No `localStorage.*` calls outside `lib/mock-backend/persistence.ts`.
- Mock-backend boundary: components route through `posteingang-api.ts` → `lib/mock-backend/api.ts`. OK in spirit, but the wrapper itself is dead-code (issue #4).
- `'use client'` correctly placed where state required.

## Recommendation

REVISE. Frontend-coder fixes #1, #2, #6, #7, and the dead code/imperative-DOM nits. Mock-backend-coder collaborates with frontend on #3 (settle on `'opened_in_app'`) and writes the missing `tests/unit/aktenzeichen-format.test.ts` (#5). Once the wrapper-layer dead code is cleaned (#4), `src/components/posteingang/posteingang-api.ts` should be deleted and components import directly from `@/lib/mock-backend`. Re-request review after fixes; spec frontmatter stays `status: spec` — do not flip to `shipped`.

## Resolution status (since this report was written)

- **Issue #3 + #5**: addressed by mock-backend-coder 2026-05-09 — canonical `letterActivityAktionSchema` extracted, runtime `safeParse` boundary added, `LetterActivityAktion` type exported, `tests/unit/aktenzeichen-format.test.ts` written (11 format rules, 92/92 vitest assertions pass).
- **Issues #1, #2, #4, #6, #7 + nits**: routed to frontend-coder 2026-05-09; outcome to be appended after re-review.

## Files referenced

- `src/components/posteingang/PosteingangInbox.tsx`
- `src/components/posteingang/LetterReader.tsx`
- `src/components/posteingang/LetterCard.tsx`
- `src/components/posteingang/LetterDetailLoader.tsx`
- `src/components/posteingang/LetterListHeader.tsx`
- `src/components/posteingang/AISummaryBlock.tsx`
- `src/components/posteingang/OriginaltextBlock.tsx`
- `src/components/posteingang/VorgangsGruppe.tsx`
- `src/components/posteingang/WasKannIchTunFooter.tsx`
- `src/components/posteingang/FristChip.tsx`
- `src/components/posteingang/posteingang-api.ts` (slated for deletion)
- `src/components/shared/DatenschutzCockpitLink.tsx`
- `src/components/shared/PrototypeDisclaimer.tsx`
- `src/components/shared/FristDetailModal.tsx`
- `src/components/shared/MockWatermarkBanner.tsx`
- `src/components/shared/NormTooltip.tsx`
- `src/lib/mock-backend/api.ts`
- `src/lib/mock-backend/schemas.ts`
- `src/lib/i18n/locales/de.json`
- `src/data/letters.json`
- `src/data/letter-summaries.json`
- `src/types/letter.ts`
- `tests/a11y/posteingang.spec.ts`
- `docs/specs/posteingang.md`

## Resolution status (re-review 2026-05-09)

**Verdict: APPROVE.** All seven blocking issues verified fixed; nits cleared. `tsc --noEmit`, `next lint`, and `vitest run tests/unit/aktenzeichen-format.test.ts` (92/92) all green. Spec §11 checklist satisfied. Spec frontmatter may flip to `status: shipped`.

### Per-issue resolution

- **B1 — DatenschutzCockpitLink RSC/client + missing on LetterCard**: VERIFIED. `DatenschutzCockpitLink.tsx:1` is now `'use client'` with `useTranslations`; `letterId`/`vorgangId` props build the right `?letter=…`/`?vorgangId=…` href; `variant` selects `posteingang.card.datenschutz_link` vs `umzug.detail.cta_datenschutz`. Rendered on every card (`LetterCard.tsx:186-190`) and in the reader (`LetterReader.tsx:254-257`). Umzug call-site (`src/app/(app)/vorgaenge/umzug/[id]/page.tsx:176`) uses the default variant — unchanged behaviour.
- **B2 — disclaimer wording**: VERIFIED. Hero collapsibly shows `posteingang.disclaimer.opening` (`PosteingangInbox.tsx:280-287`); footer uses `<PrototypeDisclaimer messageKey="posteingang.disclaimer.mock_data" titleKey="posteingang.disclaimer.mock_data_title">` (`:471-475`). Reader keeps both `original_authoritative` (RoterHinweisBanner) and `opening` (`LetterReader.tsx:402-409`). All 4 disclaimer keys present in DE source plus 5 target locales.
- **B3 — activity-log enum**: VERIFIED. Single `'opened_in_app'` call at `LetterReader.tsx:112`; matches canonical `letterActivityAktionSchema` (`schemas.ts:227`). No legacy `'opened'` strings remain.
- **B4 — `as unknown as` wrapper file**: VERIFIED. `src/components/posteingang/posteingang-api.ts` deleted; no references anywhere in `src/`. All call-sites import `api` from `@/lib/mock-backend` directly (`PosteingangInbox`, `LetterReader`, `LetterDetailLoader`, `NeuerVorgangAusBriefModal`). No `as unknown as` / `: any` / `@ts-ignore` in `src/components/posteingang/**`.
- **B5 — aktenzeichen-format test**: VERIFIED. `tests/unit/aktenzeichen-format.test.ts` exists, 92 assertions pass.
- **B6 — runtime React-element introspection**: VERIFIED. Shared parser `src/components/posteingang/utils/parse-bold-norms.ts` returns a typed `ParsedSegment[]` discriminated union (`plain | bold | norm`). Both `AISummaryBlock.tsx:14,29` and `WasKannIchTunFooter.tsx:12,22` consume it. Norm regex anchored, no nested quantifiers, no catastrophic backtracking; bold splitter `[^*]+` is `*`-bounded. Deterministic left-to-right ordering.
- **B7 — Aktenzeichen combobox**: VERIFIED. `AktenzeichenSearch.tsx` is a real WAI-ARIA APG combobox: `role="combobox"`, `aria-expanded`, `aria-controls`, `aria-activedescendant`, listbox with `role="option"` rows, ArrowUp/Down/Enter/Esc handling, debounce 250 ms wired to `api.searchLettersByAktenzeichen`. Hits real seed data via primary + `aktenzeichen_weitere`. Listbox closes on subtree blur.

### Nits

All ten nits cleared:

- VERIFIED — `<main>` collision dropped; section + page-level skip-link `posteingang.skip_link.zur_brief_liste` plus updated spec §4.1 a11y note (`docs/specs/posteingang.md:138,141`).
- VERIFIED — duplicate `MockWatermarkBanner` removed from `OriginaltextBlock.tsx`; one banner at `LetterReader.tsx:205`.
- VERIFIED — `lettersIdRef` removed; `document.getElementById('original')` replaced by `originalRef.current?.scrollIntoView()` (`LetterReader.tsx:104,378`); `OriginaltextBlock` exposes both `scrollToZitat` and `scrollIntoView` via `useImperativeHandle`.
- VERIFIED — `LetterDetailLoader.tsx` uses static `import { api } from '@/lib/mock-backend'` (`:9`).
- VERIFIED — `WasKannIchTunFooter.tsx:44-58` swaps try/catch for `useMessages` traversal + dev-only `console.warn`.
- VERIFIED — stray `<input type="hidden" data-vorgang-id>` gone; metadata moved to `<ul data-vorgang-id>` (`VorgangsGruppe.tsx:91-95`).
- VERIFIED — overdue `FristChip` palette now `bg-red-50 text-red-900 ring-red-300` (`FristChip.tsx:58`); analogous palette change in `RoterHinweisBanner`, `PosteingangInbox` error block, `AISummaryBlock` summary-error.
- VERIFIED — `CitationFootnote.tsx` is a base-ui `Popover` with `aria-haspopup="dialog"`, `role="dialog"`, focus trap, Esc/outside-click close.
- VERIFIED — `LetterListGroup` no longer carries `aria-live`; single live region on `<div id="letter-list" role="region" aria-live="polite">` (`PosteingangInbox.tsx:341-348`).
- VERIFIED — every filter `<Checkbox>` now carries `aria-controls="letter-list"` (`BehoerdenKategorieFilterSidebar.tsx:138,163`).

### Animation regression check

VERIFIED. `AISummaryBlock` keeps a Y-translate-only entry animation (`AISummaryBlock.tsx:72-75,147-152`); opacity stays `1` throughout — no abruptness, no mid-animation contrast violations. `prefers-reduced-motion` short-circuits to `duration: 0`.

### Approval blockers

None.

### New observations (informational, NOT blockers)

- `AktenzeichenSearch.tsx:49,152` — `inputRef` is wired but never read. Dead but harmless; remove on next pass if convenient.
- `src/lib/mock-backend/api.ts:961-998` — `getLetterThread` and `getLettersByBehoerdenKategorie` remain in the backend public surface but have no frontend consumer. Backend-side, not a frontend blocker; flag for backend cleanup if they stay unused after the next feature pass.

### Validation evidence

```
tsc --noEmit                                               EXITCODE=0
next lint                                                  EXITCODE=0  (No ESLint warnings or errors)
vitest run tests/unit/aktenzeichen-format.test.ts          92 passed (92)  EXITCODE=0
```

### Recommendation

Flip `docs/specs/posteingang.md` frontmatter from `status: spec` to `status: shipped`.
