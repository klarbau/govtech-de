---
feature: modal-inert-containment (useInertOutsideModal hook)
date: 2026-05-30
auditor: a11y-tester
build: 5022385 (branch feat/wow-1-inline-cascade), test file uncommitted
verdict: PASS
---

## Verdict
**PASS** -- focus containment verified by a live, deterministic Tab-sweep (NOT a
scoped axe scan). The `useInertOutsideModal` hook promotes base-ui 1.5.0's
`[data-base-ui-inert]` background marker to the real `inert` DOM property; the
previously-leaking chrome (skip-link, header, sidebar) is now `inert` while a modal
is open, focus stays inside the popup, and `inert` is fully removed on close.
WCAG 2.4.3 Focus Order + 4.1.2 Name/Role/Value (BITV 2.0) satisfied.

## Method
Deterministic Playwright test: `tests/a11y/modal-inert-containment.spec.ts`
(2 tests, both PASS on two consecutive runs; ~5 s total). Run against `next dev`
on :3000.

For each modal the test: (1) opens it; (2) asserts every `[data-base-ui-inert]`
background element carries the REAL `inert` attribute and the chrome landmarks
(`header`/`aside`/`a[href="#main-content"]`) are inert, while the popup itself is
NOT inert; (3) Tab-sweeps 18x forward + 18x back (>> focusable count) asserting
`document.activeElement` is always inside the popup -- never the skip-link or any
real outside control; (4) closes and asserts `inert` is gone and the trigger is
focusable again.

NOTE on representative selection: the brief proposed `posteingang/PreVersandModal`
and a Sheet/eID dialog. On THIS branch the posteingang reply flow is unreachable in
the test env -- the reply CTA never renders (the existing `pre-insertion-modal.spec.ts`
fails identically on the same step). Root cause appears to be a mock-data
seeding/persona-switch regression on `feat/wow-1-inline-cascade` (the dokumente
table also intermittently seeds 0 rows, and the topbar stays on the default persona
despite a `meta.active_persona_id` init-script). Rather than chase a broken data
path, I picked two RELIABLY-reachable equivalents on `/dokumente` that consume the
exact same hook:
  - A. Shared-primitive **Dialog** consumer -- the document-preview dialog
       (`ui/dialog.tsx` -> base-ui Dialog), opened via a row's "<name> ansehen".
  - B. Bespoke consent **AlertDialog** -- the EUDI export dialog
       (`dokumente/EudiExportDialog.tsx`, base-ui AlertDialog gating a `[MOCK]` export).
This still covers BOTH required classes (a shared-primitive consumer AND a bespoke
AlertDialog) with the same hook wiring used by `PreVersandModal`/`PunkteEidReauthModal`.

## Routes tested
- /dokumente -- PASS (document preview Dialog)
- /dokumente -- PASS (EUDI export AlertDialog)

## Evidence (live test logs)

### A. Shared-primitive Dialog (document preview)
- open: `markedCount:10, markedNotInert:[], realInertCount:10, topPopupInsideInert:false, headerInert:true, sidebarInert:true, skipInert:true`
- Tab-sweep (36 presses): every real focus `inPopup:true`; only transient `BODY`
  (FocusGuard wrap tick) and dev-only `NEXTJS-PORTAL` outside; skip-link never hit.
- close: `realInertCount:0, headerInert:false, sidebarInert:false, skipInert:false`;
  trigger re-focusable.

### B. Bespoke AlertDialog (EUDI export)
- open: `markedCount:10, markedNotInert:[], realInertCount:10, topPopupInsideInert:false, headerInert:true, sidebarInert:true, skipInert:true`
- Tab-sweep (32 presses): all real focus on the in-popup "Schliessen"/"herunterladen"
  controls; transient `BODY`/`NEXTJS-PORTAL` only; skip-link never hit.
- close: `realInertCount:0`, all chrome `inert:false`; wallet trigger re-focusable.

Independent corroboration: the pre-existing `tests/a11y/eudi-export-dialog-a11y.spec.ts`
(focus-trap + axe) also passes on this build; its `[EUDI DOM]` log shows the skip-link
(`A`), `HEADER`, sidebar `DIV`/`SECTION` all `inert:true` while the modal's portal
container (`hasDialog:true`) is `inert:false`.

## Focus-containment per representative modal
- Shared-primitive Dialog consumer (`ui/dialog.tsx`): **PASS**
- Bespoke consent AlertDialog (`EudiExportDialog`): **PASS**

## Code-level confirmation (hook correctness)
Reviewed `src/components/ui/use-inert-outside-modal.ts`:
- (a) `inert` lands ONLY on `[data-base-ui-inert]` (the background). base-ui's
  `markOthers` marks everything OUTSIDE `[floating, ...portalNodes]`, so the popup
  and its portal are never marked -- confirmed live: `topPopupInsideInert:false`,
  `markedNotInert:[]`.
- (b) Cleanup: the effect's return clears `inert` on every element it set, and a
  `MutationObserver` (attributeFilter `data-base-ui-inert`) un-inerts any element
  that loses its marker -- confirmed live: `realInertCount:0` after close.
- (c) Nested modals: each open modal runs its own effect; the newest marker set
  excludes the newest popup, so an ancestor modal goes inert while the top modal
  stays interactive, and closing the top modal restores exactly one level. This path
  is SOUND BY CODE REVIEW; it was not exercised live here because the only nested
  flow in the app (PreVersandModal-over-ReplySheet) is on the broken posteingang
  data path. Recommend the main thread re-run this spec on a green-data branch with
  the nested case added (the test scaffold already supports a top-most-popup probe).
- SSR-safe (`typeof document` + `inert in HTMLElement.prototype` guards). Correct.

## Manual rubric (focus-containment scope only)
- [x] Background (skip-link/header/sidebar) carries REAL `inert` while modal open
- [x] Modal popup + portal never inert
- [x] Tab-sweep never escapes to skip-link or a real outside control
- [x] `inert` fully removed on close; background control focusable again
- [x] Hook lands inert only on background; cleanup on unmount/close (code-confirmed)
- [~] Nested-modal correctness -- code-confirmed; not exercised live (broken data path)

## Issues to fix
None for the inert hook -- it is correct and effective.

Out-of-scope blocker for the broader gate (NOT this hook): on
`feat/wow-1-inline-cascade` the test-env mock data does not seed reliably -- the
posteingang reply CTA never renders and `/dokumente` intermittently seeds 0 rows;
the persona-switch init-script does not flip the active persona (topbar stays
"Anna Petrov"). This breaks `tests/a11y/pre-insertion-modal.spec.ts` and makes the
nested PreVersandModal flow untestable. Flag to mock-backend-coder / frontend-coder.

## Recommendations for code-reviewer
- Inert hook focus-containment is PASS. Safe to merge from the a11y angle.
- Run `tests/a11y/modal-inert-containment.spec.ts` in the consolidated gate
  (deterministic, ~5 s, no flake over 2 runs).
- Separately triage the mock-data seeding/persona-switch regression on this branch
  before relying on posteingang-flow e2e/a11y specs.
