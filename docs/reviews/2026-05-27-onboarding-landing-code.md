---
feature: onboarding-login + landing-page
date: 2026-05-27
reviewer: code-reviewer
verdict_onboarding: APPROVE
verdict_landing: APPROVE
track: spine
build_logs_reviewed:
  - frontend-coder: 2026-05-27
  - i18n-localizer: 2026-05-27
a11y_report: docs/a11y-reports/onboarding-landing-2026-05-27.md
gates_verified:
  - tsc --noEmit: exit 0 (re-run)
  - 6-locale parity: onboarding 58/58/58/58/58/58, landing 54/54/54/54/54/54 leaves
  - all StatusBadge variants used by onboarding present (bestaetigt/aktiv/vorlage)
  - reseedForActivePersona exported from @/lib/mock-backend/index.ts
---

## Verdict
- **D1 Onboarding/Login — APPROVE.** Flow, conventions, foundation reuse, type safety and prototype honesty all hold; the one serious a11y finding (step crossfade) is GONE from the code.
- **D2 Landing — APPROVE.** RSC, token-pure, div/primitive-composed diagram, a11y PASS, zero blockers.

## Foundation contract (highest priority) — PASS both surfaces
- No re-declared tokens, no hardcoded hex/rgb/oklch in either tree (grep clean across `src/components/onboarding` and `src/components/landing`).
- Cobalt only via `text-primary` / `bg-accent-soft` / `border-primary` utilities — never literals.
- Primitives reused, none forked: `Card`, `Button`, `IconCircle`, `Avatar`, `StatusBadge`, `KeyValueRow`, `Switch`, `Footer`, `MockWatermarkBanner`, `PrototypeDisclaimerBanner`, `ThemeToggle`, `LanguageSwitcher`. `Button render={<Link/>}` is the base-ui equivalent of `asChild` (this codebase is base-ui) — not a divergence.
- Diagram is div + dashed-border + IconCircle composition (`AutopilotDiagram.tsx`) — no SVG, no bespoke drawing layer.

## Conventions (CLAUDE.md) — PASS
- Landing `/` is RSC (`getTranslations`, `force-dynamic` + next-intl@3 comment preserved at page.tsx:10-12); only client islands are the pre-existing ThemeToggle/LanguageSwitcher.
- Onboarding step machine correctly client (`page.tsx` useReducer); presentational children (OnboardingStepList, OnboardingTrustItem, OnboardingQrMock, OnboardingLegalBasis) are RSC.
- All user-facing strings via `t()` — sole exception is spec-sanctioned persona-data attribute VALUES (see NIT 1).
- mock-backend touched only via `reseedForActivePersona` from `@/lib/mock-backend`; no direct localStorage in components (grep clean).
- `@/` alias, kebab-case files, PascalCase components throughout.

## Type safety / simplicity — PASS
- Reducer uses a discriminated union (`OnboardingAction`) — exactly the pattern the spec warranted.
- No `any`, no `@ts-ignore`, no `as unknown as`, no `console.*` (grep clean both trees).
- No dead crossfade: `AnimatePresence` / `motion.` absent from the entire onboarding tree and `(auth)`. The only framer-motion import is `useReducedMotion` in `OnboardingHandshake` — the project's established convention.

## Security / correctness / honesty — PASS
- No `dangerouslySetInnerHTML`; React text-binding throughout.
- `[MOCK]` watermark preserved on Steuer-ID values (`"[MOCK] 47 113 815 421"` etc.); MaskedTaxId masks digits and keeps the prefix visible.
- Privacy-by-design genuine, not theatre: required vs optional attribute groups, optional toggles default-OFF, recipient = "nur GovTech DE (Demo)", legal basis eIDAS 2 / OZG / DSGVO Art. 6 Abs. 1 lit. a, DSGVO footer.
- Derived marital-status values are honest against persona data: Anna "ledig (Partnerschaft)", Schmidt "verheiratet", Mehmet "—" (verified against personas.json).
- Commit path sound: `handleConfirm` guards double-commit (`committing` flag + `aria-busy`), calls `reseedForActivePersona(selectedPersonaId)` then `router.push('/dashboard')`. `selectedPersonaId` presence is gated before render (page.tsx:86) and re-checked.
- `<bdi>` used correctly to isolate localized norm/brand strings on Screen D and diagram Behörden names.

## a11y — PASS (report: docs/a11y-reports/onboarding-landing-2026-05-27.md)
- Report verdict: Landing PASS, Onboarding PASS-with-followups. The single SERIOUS finding (Issue 1, step-crossfade color-contrast at page.tsx:66-74) refers to an AnimatePresence opacity tween that **no longer exists** — current `page.tsx` renders steps with plain conditionals, zero entrance animation. Verified: no AnimatePresence/motion in `(auth)` or onboarding tree. The serious finding is resolved; not a gate.
- Issue 2 (AR Latin-run bidi) is rated MODERATE and explicitly fast-follow; `<bdi>` mitigation is present. Tracked as NIT 3.

## Issues by file

(No blockers.)

### `src/components/onboarding/persona-attributes.ts`
- **L60-68** [NIT] `NATIONALITY_LABEL` ("russisch"/"deutsch"/"türkisch") and `deriveMaritalStatus` ("verheiratet"/"ledig (Partnerschaft)") emit German display text that will not localize on Screen D in non-DE locales. Spec § 4.4 explicitly derives nationality/marital values from raw persona data and assigns them no `t()` keys, so this matches architect intent and is treated as mock-data value, not UI chrome — deferrable. Fast-follow: route through small i18n maps if full attribute-value localization is later desired.

### `src/components/onboarding/OnboardingPersonaCard.tsx`
- **L6-23** [NIT] `personaId` is declared in props and passed by `OnboardingPersonaSelect` but never consumed in the component body. Drop it from the interface or use it; harmless today.

### `src/components/onboarding/OnboardingLegalBasis.tsx`
- **L19,25** [NIT] AR `recipient` / `legal_basis` carry Latin runs (eIDAS 2 / OZG / DSGVO Art. 6) inside an RTL paragraph wrapped only in `<bdi>`. a11y Issue 2 (moderate). Fast-follow: `t.rich()` with inline `<span dir="ltr">` for the Latin segments. Non-blocking.

## Spec adherence — PASS
- Onboarding flow matches spec: method (A) -> handshake (B, eID only; demo skips) -> persona (C) -> transparency/commit (D) -> /dashboard. Back paths per § 4.5. Exactly one `<h1>` per rendered step (A welcome.title / C persona.title / D transparency.title; B intentionally none).
- Landing matches spec: sticky banner (non-sticky banner + sticky nav), nav order ThemeToggle -> LanguageSwitcher -> Anmelden, single H1 "Behörden, aber auf Autopilot.", H2 per section, H3 per card, feature grid -> /onboarding, trust grid static, reused Footer with PrototypeDisclaimer long-form.

## Approval blockers
None.

## Approval nits (non-blocking)
1. persona-attributes German nationality/marital display values won't localize (spec-sanctioned).
2. `OnboardingPersonaCard` unused `personaId` prop.
3. AR Latin-run bidi: wrap with `dir="ltr"` spans (a11y Issue 2, fast-follow).
4. (carry-over) Wire `@lhci/cli` to capture spine-required Lighthouse a11y >= 95.

## Recommendation
Both surfaces are ready for spec status `shipped`. Set `status: shipped` on docs/specs/onboarding-login.md and docs/specs/landing-page.md. Track the 4 nits in a fast-follow slot; none gate the demo.
