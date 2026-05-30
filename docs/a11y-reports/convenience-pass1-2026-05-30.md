---
feature: convenience-pass1
date: 2026-05-30
auditor: a11y-tester
build: 0237119 (plus uncommitted Pass-1 working tree, branch redesign-prototype-sweep)
method: STATIC source audit plus hand-computed WCAG contrast (NO live browser / axe / Lighthouse run in this env)
verdict: FAIL-with-blockers
---

## Verdict
FAIL-with-blockers. The Pass-1 a11y contract is largely honoured and well implemented: reduced-motion on the count-up, live-region discipline on the triumph banner and value receipt, the Uebermittlungs-Receipt disclosure semantics, [MOCK] as real text, and the semantic erledigt-feed all check out. Four blockers must be fixed before PASS:

- B1: EUDI export dialog has NO focus trap and does NOT restore focus to its trigger (WCAG 2.4.3 plus the aria-modal keyboard-containment contract).
- B2: Katalog demnaechst cards are dimmed via container opacity .72, dropping body text to ~3.61:1 (below 4.5:1) and conveying unavailable by dim-only, not programmatically (WCAG 1.4.3, 4.1.2).
- B3: Several NEW Pass-1 interactive controls are below the project 44x44 touch-target bar: dashboard done/snooze = 30x30; Dokumente row actions (incl. the new EUDI button) have no sizing and render ~16-24px (WCAG 2.5.5 / BITV / project rubric).
- B4: The amber badge token fails AA: amber-600 #B26B05 on amber-50 #FEF3E1 = 3.83:1 for normal-size badge text (Dokumente Ablauf-bald status badge) (WCAG 1.4.3).

> METHOD / HONESTY NOTE: next lint is broken repo-wide (ESLint 9 incompat) and I could not stand up a live browser to run axe-core/playwright or Lighthouse in this environment. Every finding is from static source review plus hand-computed WCAG contrast ratios. Anything needing a runtime confirm (real tab sweep, NVDA/VoiceOver announcement, Lighthouse score) is marked [NEEDS-RUNTIME]. This is NOT an automated PASS on the automated criteria - those did not run.

## Routes tested (static)
- /dashboard - FAIL (B2 katalog, B3 touch targets)
- /vorgaenge/umzug/run - PASS (count-up plus live receipt plus correct aria-live)
- /vorgaenge/umzug/[id] - PASS (static receipt variant; receipt disclosure correct)
- /dokumente - FAIL (B1 EUDI dialog, B3 row-action touch targets, B4 amber badge)
- /termine - PASS-with-nits (ops keyboard-OK; nested main; window.confirm)

---

## Spec section 14 acceptance criteria - verified item by item

| section 14 criterion | Result | Evidence |
|---|---|---|
| Count-ups honour prefers-reduced-motion to instant | PASS | ValueReceiptCard.tsx:105-135 useCountUp checks matchMedia prefers-reduced-motion and renders the final value with no tween; also short-circuits when animate is false (static variant). Real impl, not a claim. |
| Cascade animation reduced-motion to instant | PASS (by construction) | Detail cascade (BehoerdenStatusList/Row) is server-rendered, no entrance animation. Run-page cascade (run/page.tsx) advances off backend tick state-changes, not CSS keyframes; only the filled bar width transitions, and globals.css:271-280 forces transition-duration 0.01ms globally under reduced-motion. The framer preview (CascadePreview.tsx:62) gates its tween on useReducedMotion. prototype-v2.css:1609 also kills heute-item/erledigt-item transitions. |
| Triumph banner: aria-live polite ONLY on live arrival, static cold-open silent | PASS | TriumphBanner.tsx:34 applies aria-live polite only when variant is live. Dashboard renders variant static (DashboardView.tsx:177) so the seeded cold-open does not announce on load. |
| New-artefact arrivals do not spam SR | PASS | Dokumente/Termine live-subscribe and mutate plain lists with no live region (DokumenteView.tsx:143-155, TermineView.tsx:167-181). The neu dot is aria-hidden (DokumenteView.tsx:291). |
| Uebermittlungs-Receipt: real button aria-expanded/controls to role region, collapsed default, keyboard-operable | PASS | UebermittlungsReceipt.tsx:49-62 real button type button aria-expanded aria-controls; panel :64-69 role region id panelId plus aria-label; useState false = collapsed; native button gives Enter/Space plus global focus ring. |
| [MOCK] markers are real text (SR-readable) | PASS | EUDI badge renders literal [MOCK] text (EudiExportDialog.tsx:101); dialog title key = EUDI-Wallet-Export Vorschau [MOCK]; doc watermark is text (DokumenteView.tsx:297). None are background images. |
| Erledigt feed: semantic list; time uses time datetime plus absolute-date title | PASS | ErledigtFeed.tsx:29 ul/li; :46-51 time dateTime title. Triumph time element likewise (TriumphBanner.tsx:47-52). |
| Lighthouse a11y above 95 on Dashboard / run / Dokumente | [NEEDS-RUNTIME] - NOT RUN | Could not run Lighthouse. B1-B4 each cost axe/LH points; expect below 95 on /dashboard and /dokumente until fixed. |

---

## Blockers (must fix before PASS)

### B1 - EUDI export dialog: no focus trap, no focus restore
- File: src/components/dokumente/EudiExportDialog.tsx
- WCAG 2.4.3 Focus Order (A) plus the aria-modal keyboard-containment contract.
- Right: role dialog plus aria-modal true plus aria-labelledby (:67-69); Esc closes (:26-32); initial focus to close button on mount (:34-36).
- Broken:
  1. No focus containment. Tabbing past the last control (primary Schliessen :126) escapes to the page behind an aria-modal true dialog. No Tab/Shift+Tab wrap, no sentinel.
  2. No focus restore on close. Closing does not return focus to the triggering Wallet button (DokumenteView.tsx:355-362). The trigger element is never captured/restored; focus drops to body. WCAG 2.4.3.
  3. role dialog sits on the full-viewport click-to-close backdrop div (:65-71), not the inner panel. Make the backdrop aria-hidden decorative and move role/aria-modal onto the inner panel. Lower priority than 1-2.
- Fix: Add a focus trap - reuse the project ui/Dialog primitive (NOTE the known base-ui focus-guard bug in MEMORY - verify it) or a manual trap: capture document.activeElement on open; a Tab keydown handler cycles first to last within the panel; on unmount call the trigger focus. Move the dialog role to the panel; aria-hidden the backdrop. Re-verify with a keyboard tab sweep [NEEDS-RUNTIME].

### B2 - Katalog demnaechst cards: sub-4.5:1 body text plus state not programmatic
- Files: src/components/autopilot/AutopilotKatalogTeaser.tsx:64-99 plus prototype-v2.css:1594 (katalog-card.demnaechst opacity .72)
- WCAG 1.4.3 Contrast (Minimum) AA; 4.1.2 Name, Role, Value A.
- Broken:
  1. Contrast. The whole demnaechst card is opacity .72. Computed over the page bg, kc-desc and kc-behoerden (ink-3) land at ~3.61:1 - below 4.5:1. (kc-title ~6.31, kc-bh-label ~4.93 marginal, the eagle demnaechst badge ~3.85 after the dim also fails.) The description plus beteiligte-Stellen body text and the badge fail.
  2. State not programmatic. Unavailable is signalled only by dim plus the visible word demnaechst. There is no focusable control inside a demnaechst card (the CTA Link renders only for isLive), so nothing is aria-disabled. A SR user gets a card that reads identically to a live one minus a badge word. The spec line about disabled items being inert/announced is not satisfied.
- Fix: Do NOT dim with container opacity. Remove demnaechst opacity .72; keep text at a full-opacity AA token (ink-3 #4B5563 is ~7.5:1 on white) and signal coming-soon via the badge plus a subtle border/bg, not transparency. Associate the status with the card heading accessible name (aria-label e.g. Geburt eines Kindes - demnaechst verfuegbar). NOTE: the prefers-contrast more layer (globals.css:580) does not undo this opacity, so demnaechst stays low-contrast in HC mode - fix at source.

### B3 - Touch targets below 44x44 px on new/edited controls
- WCAG 2.5.5 (project rubric sets 44x44; the AA 2.5.8 24px minimum is met - this is the BITV/rubric gap).
- Controls:
  - Dashboard to-do done/snooze (NEW, section C4): DashboardView.tsx:236-251 to heute-actions button width 30px height 30px (prototype-v2.css:1578). 30x30.
  - Dokumente row actions incl. the NEW EUDI/Wallet export trigger (section C3): DokumenteView.tsx:348-367 to dk-actions button has NO width/height (prototype-v2.css:806-808), collapsing to the ~16-24px glyph box. The EUDI export - the headline Pass-1 affordance - sits in this row.
  - (Same pattern, pre-existing, in scope visually: pagination pg 32x32 (:813), calendar nav padding 4px (:850).)
- Fix: Give heute-actions button and dk-actions button a min 44x44 hit area (or 40x40 plus a 44px-min invisible overlay via padding / before pseudo) while keeping the glyph at 16-18px.

### B4 - Amber badge token fails AA
- File: prototype-v2.css:201 (badge.amber background amber-50, color amber-600)
- WCAG 1.4.3 Contrast (Minimum) AA.
- Measured: amber-600 #B26B05 on amber-50 #FEF3E1 = 3.83:1 (below 4.5:1 for normal-size badge text). Surfaces in Pass-1 on the Dokumente Ablauf-bald status badge (DokumenteView.tsx:328-332); icon-circle.amber uses the same pair.
- Fix: Darken the amber badge text to 4.5:1-min on amber-50. The semantic color-warning #B45309 already clears it (4.84:1) - point badge.amber at that or add an amber-700. It is specifically the prototype-v2 zip-ramp amber-600 that is too light; the Tailwind-themed color-warning is fine.

---

## Re-checked under correct backgrounds (so the reviewer does not chase ghosts)
- Triumph banner contrast - PASS. The banner gradient is green-50 to white (prototype-v2.css:1558), NOT cobalt. tr-title 14.73:1, tr-sub (ink-2) 10.66:1, tr-meta (ink-3) 6.75:1, tr-link (brand-600) underlined. All pass. (My first-pass cobalt-background assumption was wrong.)
- Value receipt contrast - PASS. Same green-50 gradient: vr-num (ink-1) 14.73:1, vr-label (ink-3) 6.75:1.

## Moderate (recommended, not PASS-blocking)
- M1 - Run-page live-feed status pips are colour-coded (run/page.tsx:455-466: done green / current brand / started mute). Each row ALSO carries a text badge so info is not colour-only - 1.4.1 satisfied. Defence-in-depth note only.

## Things checked and PASSING (do not re-litigate)
- Cobalt #2563EB: white on #2563EB = 5.17:1 (AA pass). hover #1D4FD8 = 6.7:1. Primary buttons pass.
- Other badge tones over their -50 backgrounds: eagle 7.80, green 5.87, red 5.69, brand 8.17, teal ~5.25, violet ~6.48 - all 4.5:1-plus. (amber is the exception - B4.)
- btn-danger (Termin absagen): red-700 text on white surface, well above 4.5:1.
- Semantic HTML / landmarks: layout provides one main id main-content tabIndex -1 plus skip link ((app)/layout.tsx:21-33). Single h1 per page (Dashboard:131, Dokumente:198, Termine:272, run:315); h2/h3 sections wired with aria-labelledby/id (DashboardView.tsx:260-266, ValueReceiptCard.tsx:46, BehoerdenStatusList.tsx:30). No skipped levels in the new surfaces.
- Termine ops keyboard: confirm/verschieben/absagen native button with disabled busy (TermineView.tsx:411-441); filter rows native button (:315-362). Keyboard-operable plus global focus ring.
- Forms: Dokumente search input aria-label (:217). Preview consent toggles labelled (CascadePreview.tsx:167-174). No unlabelled inputs in the new surfaces.
- Icons: decorative lucide icons aria-hidden beside text (ValueReceiptCard.tsx:43, TriumphBanner.tsx:36, ErledigtFeed.tsx:38, nav-neu-dot :291). Icon-only buttons carry aria-label.
- Language attribute and RTL: app/layout.tsx:31-33 sets html lang locale dir dir from the active next-intl locale; rtlLocales drives dir rtl (ar). Locale switch persists via setLocaleCookie then server re-render flips lang. BITV requirement met.
- Live receipt announce: ValueReceiptCard.tsx:40 aria-live polite only on live variant; run page uses live (run/page.tsx:343), detail uses static ([id]/page.tsx:135). Correct.

## Nits (optional)
- N1 - Nested main. TermineView.tsx:270 renders main className gt-content INSIDE the layout main id main-content ((app)/layout.tsx:30). Two main landmarks per page (WCAG 1.3.1 best-practice). Dashboard/Dokumente correctly use a fragment. Fix: change Termine root main to div/section.
- N2 - Termin cancel uses window.confirm (TermineView.tsx:116). Native plus keyboard-accessible but not stylable/translatable and inconsistent with the app dialog system. Acceptable for a demo.
- N3 - Dokumente table sort headers show ChevronsUpDown affordances (DokumenteView.tsx:245-263) but sorting is not wired; chevrons not aria-hidden, th has no aria-sort. Implies a non-existent control to SR users. Drop or mark decorative. (Pre-existing.)

## Issues to fix (priority order)
1. B1 - EUDI dialog focus trap plus focus restore - src/components/dokumente/EudiExportDialog.tsx (WCAG 2.4.3).
2. B2 - Katalog demnaechst contrast plus programmatic state - AutopilotKatalogTeaser.tsx plus prototype-v2.css:1594 (WCAG 1.4.3, 4.1.2).
3. B3 - 44x44 touch targets: dashboard done/snooze (prototype-v2.css:1578) plus Dokumente row actions incl. EUDI (prototype-v2.css:806) (WCAG 2.5.5 / rubric).
4. B4 - amber badge token #B26B05 on #FEF3E1 = 3.83:1 - prototype-v2.css:201 (WCAG 1.4.3).
5. N1 - nested main in TermineView.tsx:270 (WCAG 1.3.1).
6. N3 - non-functional sort headers imply interactivity - DokumenteView.tsx:244-263.

## BITV 2.0 specifics
- [x] lang/dir set on root from active locale (incl. ar to rtl).
- [x] [MOCK] conveyed as real text to AT (EUDI dialog plus watermark).
- [x] Reduced-motion honoured (count-up plus global media query plus framer useReducedMotion).
- [~] High-contrast layer exists (prefers-contrast more) but does not undo B2 demnaechst opacity - still low-contrast in HC mode.
- Plain-language toggle / sign-language stub: not introduced by Pass-1 surfaces; not assessed here.

## Recommendations for code-reviewer
- Hold merge on B1, B2, B3, B4. The section-14 functional contract (motion, live regions, disclosure semantics, MOCK-as-text, semantic feed) is otherwise met and well implemented.
- After fixes, re-run WITH A LIVE BROWSER: axe-core/playwright on /dashboard, /vorgaenge/umzug/run, /vorgaenge/umzug/[id], /dokumente, /termine; Lighthouse a11y on the three section-14 routes (target 95-plus); and a manual keyboard sweep of the EUDI dialog (open then Tab cycle stays inside then Esc then focus returns to the Wallet trigger). This report is STATIC and cannot substitute for that run.
