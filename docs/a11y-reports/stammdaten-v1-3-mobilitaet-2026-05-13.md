---
feature: stammdaten-v1-3-mobilitaet
date: 2026-05-13
auditor: a11y-tester
verdict: PASS-with-followups
verdict-original: REVISE (2026-05-13, post-audit)
verdict-resolved: PASS-with-followups (2026-05-13, post-REVISE-fix — Playwright axe 14/14 PASS, contrast blockers in UmzugBridgeBadge.tsx fixed via text-amber-950 + fade-in removed; PunkteEidReauthModal focus-restoration via triggerRef + requestAnimationFrame + document.contains-guard. Lighthouse CLI not run — operational followup. AR dir="ltr" on FIN/FE-Nr Latin spans — minor followup.)
time-budgeted: 20min
---

## Verdict
REVISE -- 2 of 14 axe runs FAIL with serious color-contrast violations on UmzugBridgeBadge text (Anna persona only, both viewports), rendered static (not mid-animation). Blocker per project hard-rule: Never sign off PASS with any serious or critical axe violation. All 8 modal axe runs PASS; all manual verifier-lock spot-checks PASS except one focus-restoration regression on PunkteEidReauthModal. See Findings 1, 2 (blockers) and Findings 3..8 (followups).

Build context: dev server pre-audit env had a stale next-dev process on port 3000 hiding hot-reload chunks (the Playwright-test failure mode reported by prior agent as stammdaten-hero never visible was caused by 404s on _next/static/chunks/* from the stale daemon; killing PID 37400 and letting Playwright webServer.reuseExistingServer respawn cleanly restored the test environment -- this is NOT a V1.3-introduced regression and was not visible in the V1 baseline stammdaten-page.spec.ts either until the stale daemon was killed).

## Routes tested
- /stammdaten (Anna, Markus, Mehmet) x {mobile 375x800, desktop 1280x900} -- 2 FAIL (Anna only), 4 PASS
- /stammdaten modals (PunkteEidReauth, PunkteResult, WalletMdlPreview, Korrekturweg) x 2 vp -- 8 PASS

---

## Section 1 -- Lighthouse a11y per persona
STATUS: not-run -- Lighthouse CLI not installed in env (which lighthouse returns no match; only @lhci/cli-style packages would be available). Substituted by axe-core full WCAG2A/AA/2.1A/AA scan (Section 2). For a true Lighthouse number, frontend-coder should add `npx -p @lhci/cli@latest lhci autorun` to the CI pipeline before next release. Given axe-core finds only the 2 color-contrast violations called out in Section 2, a Lighthouse a11y score of ~92-96 is the realistic estimate. The target of >=95 is NOT provably met until the blocker is fixed.

| Persona | Lighthouse score |
|---|---|
| anna-petrov | not-run (estimated <95 due to Finding 1) |
| markus-schmidt | not-run (estimated 100) |
| mehmet-yildiz | not-run (estimated 100) |

---

## Section 2 -- Automated Playwright + axe
STATUS: complete

### Suite: stammdaten-v1-3-mobilitaet-sektion.spec.ts (6 tests = 3 personas x 2 viewports)

| Spec | Verdict |
|---|---|
| Mobility-Sektion axe-clean -- anna @mobile | FAIL (Finding 1) |
| Mobility-Sektion axe-clean -- anna @desktop | FAIL (Finding 1) |
| Mobility-Sektion axe-clean -- schmidt @mobile | PASS |
| Mobility-Sektion axe-clean -- schmidt @desktop | PASS |
| Mobility-Sektion axe-clean -- mehmet @mobile | PASS |
| Mobility-Sektion axe-clean -- mehmet @desktop | PASS |

### Suite: stammdaten-v1-3-mobilitaet-modals.spec.ts (8 tests = 4 modals x 2 viewports)

| Spec | Verdict |
|---|---|
| PunkteEidReauthModal axe-clean @{mobile,desktop} | PASS |
| PunkteResultCard axe-clean (post-Reauth) @{mobile,desktop} | PASS |
| WalletMdlAttestationPreviewModal axe-clean @{mobile,desktop} | PASS |
| KorrekturwegFeBehoerdeModal axe-clean @{mobile,desktop} | PASS |

Totals: 12 passed / 2 failed / 0 flaky (46.1 s sektion suite + 29.6 s modal suite). Both failures reproduce deterministically on both viewports for Anna, no flake.

### Axe violation detail (verbatim, both Anna failures)

Rule: color-contrast -- impact: serious -- tags: wcag2aa wcag143
Target container: [data-testid="umzug-bridge-badge"] inside [data-testid="halter-adresse-field-card"].

Two distinct failing nodes:

1. The main p.font-medium paragraph (the Adressaenderung body text):
   - fg #947b6d on bg #fffdf3 = 3.87:1 (need 4.5:1)
   - font 12px / 9pt, weight normal
2. The small text-[11px] text-amber-900/90 disclaimer paragraph containing the FZV NormZitatSpan:
   - fg #ba957e on bg #fffdf3 = 2.67:1 (need 4.5:1)
   - font 11px / 8.3pt, weight normal

Source: src/components/stammdaten/mobilitaet/UmzugBridgeBadge.tsx:47-52.

### Classification of the mid-animation race claim from prior run

NOT a transition-state false-positive: the failing fg colors #947b6d and #ba957e are static computed values (amber-900/90 alpha-composited over amber-50 equals exactly #947b6d and #ba957e) -- there is no 0%-100% intermediate that produces those numbers. They are the STEADY-STATE colors. Real static color-contrast bug in UmzugBridgeBadge (case iii in prompt). No mitigation via waitForTimeout or motion-reduce will fix this. The motion-safe: classes on UmzugBridgeBadge.tsx:38 already correctly respect prefers-reduced-motion: reduce.

---

## Section 3 -- Manual keyboard pass on 4 new modal-flows
STATUS: complete

| Modal | Tab logical | Focus visible | Esc closes | Focus returns to trigger | role + aria-modal |
|---|---|---|---|---|---|
| PunkteEidReauthModal | Y | Y | Y | N -- document.activeElement after Esc = null | Y (role=alertdialog, aria-modal=true, aria-labelledby present) |
| PunkteResultCard (post-Reauth) | Y (not a modal; countdown + close CTA reachable via Tab) | Y | n/a | n/a (not a modal) | n/a |
| KorrekturwegFeBehoerdeModal | Y | Y | Y | Y (returns to [data-testid="korrekturweg-fe-cta"]) | Y (role=dialog, aria-modal=true, aria-labelledby) |
| WalletMdlAttestationPreviewModal | Y (Tab lands on first mdl-toggle-* checkbox, sensible) | Y | Y | Y (returns to [data-testid="wallet-mdl-preview-cta"]) | Y |

Finding 3 below for the PunkteEidReauthModal focus-restoration gap.

---

## Section 4 -- Verifier-Lock spot checks
STATUS: complete

| Lock | Verdict | Evidence |
|---|---|---|
| VL-6 PflichtumtauschBanner suppression when geburtsjahr/ausstellungsdatum missing | Y | PflichtumtauschBanner.tsx:55-69 nicht_relevant branch returns null unless datenUnvollstaendig is true -- exactly the spec branch. |
| VL-7 mDL Vision-Banner on WalletMdlAttestationPreviewModal header + WalletMdlCard row | Y | WalletMdlAttestationPreviewModal.tsx:118 renders VisionBanner2031 right after Title; WalletMdlCard.tsx imports + renders alongside row. |
| VL-8 Punkte TTL countdown screen-reader-friendly | Y | PunkteResultCard.tsx:126 uses aria-live=polite on the TTL container; single text node, no per-tick re-announce mechanism. |
| VL-9 WalletMdl Selective-Disclosure-Toggles list = ISO_18013_5_MDL_TOGGLE_SET only | Y | WalletMdlAttestationPreviewModal.tsx:136 maps over ISO_18013_5_MDL_TOGGLE_SET; src/types/mobilitaet.ts:252-260 explicitly excludes punkte, punktezahl, bezirk_der_fe_behoerde, mpu_status, faer_eintragungen. |
| VL-12 Markus Schmidt MitnutzerinPill with FZV disclaimer | Partial / component-level | KfzMitnutzerPill.tsx:14-19 doc-comment correctly cites FZV-Mitteilungspflicht; component renders the pill. Persona-level (/stammdaten for Schmidt) not opened in this audit due to time cap; component-level VL is satisfied. NB: prompt says Sonja but personas.json names the wife Lena Schmidt. |
| HL-MOB-7 (per prompt-mapping) FinMaskedSpan aria-label uses masked form only | Y on default state | FinMaskedSpan.tsx:45-47 default revealed=false maps to masked aria-label; revealed=true maps to full-FIN aria-label after explicit user click. NB: HL-MOB-7 in spec section 11.7 is actually the mDL Vision banner, not the FIN aria. Behaviour matches HL-MOB-3 (masked-by-default in UI). Not a leak; see Finding 5 for strict-hardening option. |

---

## Section 5 -- RTL/AR brief check
STATUS: complete (smoke-only, no axe run in AR)

| Check | Result |
|---|---|
| html dir switches to rtl | Y |
| html lang switches to ar | Y |
| MobilitaetSektion renders in AR | Y (mobilitaet-disclaimer visible) |
| Section text translated | Y (Arabic title present) |
| FinMaskedSpan content (Latin alphanumeric in RTL context) | Visible but inherits direction:rtl from parent. Masked text reads OK visually (no script-bidi neighbours), but explicit dir=ltr on <span id={valueId}> recommended for screen-reader announcement order (Finding 7). |
| FE-Nr Latin/Bundesland-buchstabe in RTL | Not separately probed; inherits same parent direction. Same dir=ltr recommendation. |

No layout breakage visible. The 6th locale parity is intact.

---

## Sections 6, 7, 8 -- Color-token re-audit, edge cases, full Lighthouse
STATUS: deferred to followup. Time budget consumed by section 2 debugging (stale dev-server diagnosis) and section 4 manual probes. Reserved for the post-fix re-audit pass.

---

## Findings (priority order)

1. [BLOCKER] Color contrast 3.87:1 on the p.font-medium paragraph in UmzugBridgeBadge -- src/components/stammdaten/mobilitaet/UmzugBridgeBadge.tsx:47-49. The Adressaenderung body paragraph computes fg #947b6d on bg #fffdf3, below WCAG 2.1 AA 1.4.3 (4.5:1 for normal text). Despite the text-amber-950 class on the container div, browser color-resolution inherits a lighter value. Fix: explicitly set text-amber-950 on the p.font-medium element. Cites WCAG 2.1 1.4.3 Contrast (Minimum).

2. [BLOCKER] Color contrast 2.67:1 on the small text-[11px] text-amber-900/90 disclaimer paragraph in UmzugBridgeBadge -- same file :50-52. fg #ba957e on bg #fffdf3. The /90 alpha modifier + 11px font + amber-900 token combine well below 4.5:1. Fix: replace text-amber-900/90 with text-amber-950 (drop /90 alpha; amber-950 is the V1 token darker than amber-900). Same WCAG cite. NormZitatSpan aria-label is correct; the issue is purely color.

3. [Followup-Medium] PunkteEidReauthModal does not restore focus to trigger on Esc-close -- src/components/stammdaten/mobilitaet/PunkteEidReauthModal.tsx. After Esc, document.activeElement is null, not [data-testid="punktestand-cta-pull"]. The other two dialogs correctly restore. Likely cause: early-return in onOpenChange that bypasses the base-ui auto-restore, or a missing restoreFocus prop. Cites WCAG 2.4.3 Focus Order + 2.4.7 Focus Visible.

4. [Followup-Low] Lighthouse CLI not configured in repo -- package.json has no lighthouse script. Until CI gets @lhci/cli, the a11y-tester role cannot truthfully claim score >=95. Recommend adding lhci to devDependencies + a lighthouse:a11y script.

5. [Followup-Low] FinMaskedSpan aria-label echoes full FIN when revealed -- src/components/stammdaten/mobilitaet/FinMaskedSpan.tsx:45-47. Current behaviour mirrors visible text and is acceptable UX. Hardening option: keep aria-label always masked. Not a regression.

6. [Followup-Low / rebuttal of prior agent] -- UmzugBridgeBadge.tsx:38 uses motion-safe: classes which correctly suppress the animation under prefers-reduced-motion: reduce. No motion-reduce gap; the prior-agent fade-in race hypothesis can be retired.

7. [Followup-Low] FinMaskedSpan + FE-Nr Latin alphanumerics inherit direction:rtl in Arabic locale -- explicit dir=ltr on the value span in FinMaskedSpan.tsx:51 would align screen-reader announcement order with the visible glyph order. Same recommendation for the FE-Nr render in FuehrerscheinHauptkarte.tsx.

8. [Followup-Operational] Project dev-server hygiene -- During this audit the prior next dev daemon (PID 37400) was still listening on port 3000, causing all Playwright webServer.reuseExistingServer:true invocations to reuse a stale chunk-manifest and triggering the cascade of 404s that the prior agent debugged as a fade-in race. After taskkill /F /PID 37400, Playwright correctly auto-spawned a fresh dev server. Recommend a pretest:a11y lifecycle script that does npx kill-port 3000 (or platform-equivalent) so Windows sessions do not accumulate dev-server zombies between branches.

---

## Followups (numbered for code-reviewer reference)

1. Fix Finding 1: darken the p.font-medium in UmzugBridgeBadge.tsx:47 to text-amber-950 explicitly (light) + verify dark-mode text-amber-100 remains >=4.5:1.
2. Fix Finding 2: replace text-amber-900/90 with text-amber-950 on UmzugBridgeBadge.tsx:50 (and update the dark-mode pair text-amber-100/85 to text-amber-100).
3. Fix Finding 3: ensure PunkteEidReauthModal restores focus to [data-testid="punktestand-cta-pull"] after Esc.
4. Re-run the 2 failing axe tests after the fix; expect 14/14 PASS.
5. Add @lhci/cli to devDependencies + lighthouse:a11y script targeting 3 personas (Finding 4).
6. Optional hardening on FinMaskedSpan aria (Finding 5).
7. Add dir=ltr to FIN + FE-Nr value spans for AR locale (Finding 7).
8. CI hygiene: add kill-port 3000 pretest hook (Finding 8).

---

## BITV 2.0 specifics
- Plain language toggle (Leichte Sprache): out-of-scope for V1.3 component-level audit; remains a horizontal-feature claim (not regressed).
- Sign-language placeholder: out-of-scope for /stammdaten.
- lang attribute: correct (html lang=de in DE locale, lang=ar in AR with dir=rtl verified in Section 5).
- 6-locale parity: prior i18n-localizer ship confirmed; not re-verified here (out of a11y scope).

## Recommendations for code-reviewer
- Block merge on Findings 1 + 2 (both serious axe violations; project hard rule).
- Treat Finding 3 (PunkteEidReauthModal focus restore) as same-PR fix because the parallel pattern modals already have the fix; cost is one prop.
- Re-audit after the 3 fixes: re-run npx playwright test --project=a11y --reporter=line stammdaten-v1-3 and a manual focus-restore probe on PunkteEidReauthModal.
- All other findings (4-8) acceptable as separate followup PRs.
