---
feature: onboarding-login + landing-page
date: 2026-05-27
auditor: a11y-tester
build: pre-commit (live dev server :3000, current working tree)
routes: ["/", "/onboarding"]
verdict_landing: PASS
verdict_onboarding: PASS-with-followups
---

## Verdict

- **`/` (Landing) — PASS.** axe 0 serious / 0 critical in DE-light, DE-dark, EN-light, AR-RTL. One `<h1>`, clean heading hierarchy, `<figure role="group">` + sr-only `<figcaption>` carries diagram meaning, touch targets >= 44px, primary CTA + 4 feature links reachable with visible focus, contrast tokens pass.
- **`/onboarding` — PASS-with-followups.** Every settled step (A method, C persona, D transparency) is axe-clean in light AND dark. Flow is fully keyboard-operable through all four steps; eID handshake announced via `role="status"` `aria-live="polite"`; reduced-motion stills the spinner and instant-settles. Two non-blocking follow-ups: (1) a transient serious `color-contrast` from axe is a mid-animation sampling artifact of the step opacity-crossfade in `page.tsx` (settled colors all pass); (2) AR `legal_basis` latin tokens not wrapped in `dir="ltr"` spans.

No serious/critical axe violation exists in any SETTLED state of either route.

## Routes tested
- `/` — PASS (DE light, DE dark, EN light, AR RTL)
- `/onboarding` — PASS-with-followups
  - Step A (method) — PASS (light + dark + AR RTL)
  - Step B (handshake) — PASS (status announced; reduced-motion instant-settle; no h1 by design, spec 4.3)
  - Step C (persona) — PASS settled (transient crossfade artifact, Issue 1)
  - Step D (transparency) — PASS settled, light AND dark (transient crossfade artifact, Issue 1)

## Tooling note
- Lighthouse a11y score NOT captured: `@lhci/cli` absent, no Lighthouse CLI in runtime (matches V1.3.1 follow-up). Verdict relies on @axe-core/playwright (axe 4.11, wcag2a/2aa/21a/21aa) + manual keyboard/contrast/RTL/reduced-motion checks.
- A stale dev daemon held :3100 (HTTP 500 — would be a false read). Audited :3000, verified serving the CURRENT build (landing H1 "Behoerden, aber auf Autopilot.", onboarding H1 "Willkommen bei GovTech DE", figure role=group, skip-link #main-content, method cards with aria-describedby) — not an error/stale page.

## Automated results — axe-core (WCAG 2.1 AA)

### Landing `/`
| View | critical | serious | moderate | minor |
|---|---|---|---|---|
| DE light | 0 | 0 | 0 | 0 |
| DE dark | 0 | 0 | 0 | 0 |
| EN light | 0 | 0 | 0 | 0 |
| AR RTL | 0 | 0 | 0 | 0 |

### Onboarding — SETTLED (after ~600ms crossfade settle)
| View | critical | serious | moderate | minor |
|---|---|---|---|---|
| Step A method DE light | 0 | 0 | 0 | 0 |
| Step A method DE dark | 0 | 0 | 0 | 0 |
| Step A method AR RTL | 0 | 0 | 0 | 0 |
| Step C persona DE light | 0 | 0 | 0 | 0 |
| Step D transparency DE light | 0 | 0 | 0 | 0 |
| Step D transparency DE dark | 0 | 0 | 0 | 0 |

### Onboarding — DURING crossfade (axe sampled mid-transition)
| View | serious | note |
|---|---|---|
| Step C persona (immediate) | 1 color-contrast, 3 nodes | avatar `bg-accent-soft text-primary` blended by opacity<1 -> 2.75:1; settled 4.56:1 |
| Step D transparency dark (immediate) | 1 color-contrast, 9 nodes | accent-soft chip, success-soft badges, Optional badge, dsgvo footer, primary button; all pass settled |
| Step C/D reduced-motion (immediate) | 1 each | framer reducedMotion="user" still animates opacity, artifact persists transiently |

> All "during crossfade" numbers drop to 0 serious / 0 critical once opacity reaches 1 (verified with 600ms settle). Failing samples are blended fg/bg colours produced while the AnimatePresence opacity tween (page.tsx 66-74, 0.18s) is in flight — not the actual token combinations.

## Measured contrast (settled, in-browser)
| Element | fg | bg | ratio | floor | result |
|---|---|---|---|---|---|
| Landing outline-CTA text | rgb(26,31,42) | #FFF | 16.49:1 | 4.5 | PASS |
| Cobalt primary white text | #FFF | #2563EB | ~4.6:1 | 4.5 | PASS (token) |
| accent-soft pill (text-primary on bg-accent-soft) | #2563EB | #EAF1FE | 4.56:1 | 4.5 | PASS (thin) |
| persona avatar monogram settled | #2563EB | #EAF1FE | 4.56:1 | 4.5 | PASS |
| success bar (text-success on bg-success-soft) | #137034 | #E7F6EC | 5.54:1 | 4.5 | PASS |
| text-text-muted on white | #545C69 | #FFF | 6.75:1 | 5.63 (HL-DS-7) | PASS |
| StatusBadges dark settled | — | — | axe-clean | — | PASS |

> The accent-soft / primary-on-accent-soft pairing sits at exactly 4.56:1 — passing with almost no headroom; it is the single combination the crossfade tips below AA.

## Manual rubric
- [x] Semantic HTML — header/main/footer/nav, figure+figcaption, ul/li, real button for method+persona cards, dl/dt/dd for attribute rows.
- [x] Landmarks — one main each; labelled nav; auth layout header+main+footer.
- [x] Focus visible + logical — 2px outline-primary on CTAs, method/persona cards, login link; skip-link first (verified #main-content).
- [x] Keyboard — FULL onboarding flow exercised keyboard-only: DeutschlandID Enter -> handshake (role=status announces "Verbindung zu DeutschlandID ...") -> auto-advance -> Anna Enter -> transparency -> confirm visible. Demo-mode skips handshake (verified). Landing CTAs + 4 feature links reachable.
- [x] Exactly one h1 per rendered view — landing 1; onboarding A/C/D each 1; B none by design (spec 4.3).
- [x] Heading hierarchy — landing [1,2,3,3,3,3,2,3,3,3,3] no skips.
- [x] Live region — handshake role=status aria-live=polite; connecting -> confirmed.
- [x] Color contrast (settled) — all sampled combos pass light + dark.
- [ ] Motion — reduced-motion stills handshake spinner (0 spinning SVGs) + instant-settle. BUT step crossfade opacity still animates under reduced-motion -> transient contrast artifact. See Issue 1.
- [x] Decorative icons aria-hidden — diagram icons/connectors, chevrons, spinner, trust icons, brand all aria-hidden; diagram meaning in sr-only figcaption (226 chars verified).
- [x] Touch targets — ThemeToggle 44x44, LanguageSwitcher h44, Anmelden h44; onboarding login min-h-44; transparency toggle labels [44,44]; method/persona cards min-h-44.
- [x] Language attribute — html lang=ar dir=rtl verified both routes; lang switches with locale.
- [ ] RTL bidi tokens — dir/layout fine; chevrons mirror via rtl:-scale-x-100. BUT AR latin/legal tokens (eIDAS 2, OZG, DSGVO Art.6, Behoerden names) NOT wrapped in dir=ltr spans. See Issue 2.
- [x] Masked sensitive data — Steuer-ID masked with [MOCK] prefix + reveal (aria-pressed, aria-label), tabular-nums, dir=ltr.

## Issues to fix (priority order)

1. **[serious — transient] Step crossfade trips axe color-contrast on onboarding C + D (light and dark).**
   `src/app/(auth)/onboarding/page.tsx` lines 66-74 — the AnimatePresence motion.div animates opacity 0->1 (0.18s) on every step change. While opacity<1, axe samples blended colours below 4.5:1 (avatar 2.75:1, dark transparency chip 3.06:1, dark primary button 3.39:1). All pass once opacity=1 (avatar 4.56:1, dark badges/buttons clean). Same class the codebase already removed for V1.3 ("fade-in entfernt da axe-Mid-Animation-Sampling"). WCAG 1.4.3. Fix: (a) drop the opacity crossfade (matches landing which has zero entrance animation, landing spec 9), or (b) explicitly gate opacity tween to duration 0 when useReducedMotion() — framer reducedMotion="user" does NOT cover opacity. After fix re-run tests/a11y/onboarding-landing.spec.ts; the two failing tests assert 0 blockers immediately (no settle wait).

2. **[moderate — bidi] AR legal_basis + Behoerden/brand latin tokens not wrapped in dir=ltr.**
   `src/components/onboarding/OnboardingLegalBasis.tsx` line 22 renders t('legal_basis') as a plain <p>; AR string carries latin runs (eIDAS 2 / OZG / DSGVO Art.6) with neutral chars inside RTL and renders with 0 dir=ltr spans (verified, p dir=null). Also onboarding.transparency.recipient, handshake.connecting {method}, landing diagram.behoerde*_name / trust.* brand titles in AR. WCAG 1.3.2. Frontend build log already flagged (note #2). Fix (frontend-coder + i18n-localizer): t.rich() with <span dir="ltr"> for latin segments, or dir=ltr + unicode-bidi:isolate on latin inline spans. Lower priority than #1 — strings present and mostly legible — but explicitly requested RTL hardening for spine.

3. **[advisory] accent-soft / primary-on-accent-soft at 4.56:1 has near-zero AA headroom.**
   `src/components/shared/Avatar.tsx` tone="primary" + landing hero pill. Passes today but is the exact pairing the crossfade tips under AA. Flag for design system; do not nudge accent-soft/primary.

## BITV 2.0 specifics
- [x] lang attribute correct + switches per locale (de/ar verified; dir=rtl for AR).
- [x] Mock/Prototype honesty on every onboarding step + landing banner/footer.
- [n/a] Leichte-Sprache toggle / sign-language stub — not in scope for these surfaces (dashboard + autopilot results own them); not regressed.
- [~] dir=ltr bidi spans for legal/brand latin — see Issue 2 (BITV RTL hardening gap, non-blocking).

## Recommendations for code-reviewer
- Landing `/` is clean — no a11y blocker to gate merge.
- Onboarding `/onboarding`: require Issue 1 fixed (drop or reduced-motion-gate the step crossfade) before sign-off — reproducible serious axe finding when sampled during the transition, with V1.3 precedent to remove such fades. Issue 2 (AR bidi) can ship as fast-follow but must be tracked.
- Re-run tests/a11y/onboarding-landing.spec.ts after fixes; the two failing tests ("onboarding full keyboard flow + axe each step", "axe onboarding D dark") are the regression guards for Issue 1.
- Wire @lhci/cli to capture the spine-required Lighthouse a11y >=95 (carry-over from V1.3.1).
