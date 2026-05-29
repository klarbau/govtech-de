---
feature: prototype-v2-onboarding-login
title: Prototype-v2 — Onboarding/Login welcome screen
status: in_progress
track: spine
date: 2026-05-28
author: frontend-coder
parent_spec: docs/specs/onboarding-login.md
prototype_ref: C:\Users\iaiaa\Downloads\cfdfac8e-fbab-48cf-b0bb-6440834900a2.png
scope:
  edit:
    - src/app/(auth)/layout.tsx
    - src/app/(auth)/onboarding/page.tsx
    - src/components/onboarding/OnboardingWelcome.tsx
    - src/components/onboarding/OnboardingMethodCard.tsx
    - src/components/onboarding/OnboardingStepList.tsx
    - src/components/onboarding/OnboardingTrustItem.tsx
  do_not_touch:
    - src/components/layout/**            # shared chrome (rule 1)
    - src/components/onboarding/Identitaet*  # owned by Identitaet agent (rule 3)
    - src/components/onboarding/Consent*     # owned by Identitaet agent (rule 3)
    - any token / theme / i18n JSON       # rules 1 + 2
---

## 0. Why this exists

The shipped `onboarding-login` spec describes the right *information architecture* — three steps, eID-attribute transparency, persona commit-at-end. The user's hand-drawn prototype refines the *Screen A* visual language: a single hero card on a calm grey page, two equally-weighted method tiles, a tinted-blue Demo-Modus action that reads as "secondary but obvious", a 3-column trust strip with descriptive sub-copy (not just labels), and a clearly delineated right rail with numbered steps **and** "Warum diese Anmeldung?" rows. The current implementation has most of those parts but flattens the trust strip to single labels and treats the Demo-Modus row identically to the eID tiles. This spec is purely a Screen-A refinement.

Screens B (handshake), C (persona select) and D (transparency) are out of scope — they stay as shipped.

## 1. What stays (no change)

- `src/app/(auth)/onboarding/page.tsx` step-reducer + commit logic (`reseedForActivePersona` → `/dashboard`). The current routing of Demo-Modus to persona-select is already correct (sketch's "Demo-Modus … Ohne Anmeldung testen" CTA must route to persona-picker; that is exactly what `dispatch({ type: 'selectMethod', method: 'demo' })` does — `reducer` sends `method === 'demo'` to step `'persona'`).
- `OnboardingHandshake`, `OnboardingPersonaSelect`, `OnboardingPersonaCard`, `OnboardingTransparency`, `OnboardingQrMock`, `OnboardingLegalBasis`, `persona-attributes.ts` — untouched.
- All i18n keys under `onboarding.*` — untouched.
- Foundation primitives (`IconCircle`, `Card`, `Button`) — untouched.

## 2. What changes (Screen A only)

### 2.1 `(auth)/layout.tsx` — top bar pill

Sketch shows "Anmelden" rendered as a **filled cobalt pill** with subtle weight, not a ghost link. Change:

- Wrap the existing `Anmelden ▾` anchor in a primary-tinted pill: `rounded-full bg-primary text-primary-foreground hover:bg-primary/90` while keeping the ChevronDown affordance. Minimum height stays 36px (sketch shows a compact pill, smaller than 44px touch target; we keep 40px for AA, with a 44px-effective hit area via padding). Re-uses existing `primary` / `primary-foreground` tokens — no new tokens.
- Spacer + tagline rendering stays.

Nothing else in the top bar or footer changes. No new i18n keys (the existing `onboarding.topbar.login_label` stays).

### 2.2 `OnboardingWelcome.tsx` — hero card composition

Layout structure (sketch):

```
┌──────────────────────────────────────────────────────────────┐
│  ◆ Landmark                                                   │
│                                                               │
│  Willkommen bei GovTech DE                                    │   ← h1 (stays)
│  Melden Sie sich an oder starten Sie die Demo.                │
│                                                               │
│  ┌─────────────────┐  ┌─────────────────┐                     │
│  │ 🪪 DeutschlandID │  │ 👛 EUDI Wallet  │      RIGHT RAIL    │
│  │ Sicher, einfach… │  │ Ihre digitale … │   (steps + why)    │
│  └─────────────────┘  └─────────────────┘                     │
│                                                               │
│  ┌─ tinted cobalt ─────────────────────────────────────┐ ›    │
│  │ 🧪 Demo-Modus mit Mock-Daten                          │     │
│  │   Ohne Anmeldung testen. Keine echte Behördenanbind. │     │
│  └──────────────────────────────────────────────────────┘     │
│  ─────────────────────────────────────────────────────────────│
│  ┌────────────┐ ┌────────────┐ ┌────────────┐                 │
│  │ 🔒          │ │ ✓           │ │ 🚫          │                 │
│  │ Sichere    │ │ Nur mit … │ │ Keine echte│                 │
│  │ Anmeldung   │ │ Zustimmung │ │ Behörden-…  │                 │
│  │ <2-line sub>│ │ <2-line sub>│ │ <2-line sub>│                 │
│  └────────────┘ └────────────┘ └────────────┘                 │
└──────────────────────────────────────────────────────────────┘
```

Deltas vs. current:

1. **Demo-Modus row** gets a tinted variant: `bg-accent-soft border-accent-soft` (or `border-transparent`), title text stays `text-text-primary`, helper text stays `text-text-secondary` — but the whole tile reads visually-different-from-eID. Existing `OnboardingMethodCard` learns a third variant `variant="row-accent"` (or extends `variant="row"` with an `accent` flag — chosen: extend with `tone?: 'default' | 'accent'`, default `'default'`).
2. **Trust strip** becomes a 3-column grid (`grid-cols-1 sm:grid-cols-3 gap-4`) of `OnboardingTrustItem` with an added optional `desc` prop. Description copy is **hardcoded inline German** (rule 2 forbids editing i18n JSON; per hard rule, "Hardcode German inline"):
   - Sichere Anmeldung — "Verschlüsselte Übertragung gemäß BSI-Grundschutz."
   - Nur mit Ihrer Zustimmung — "Sie entscheiden, welche Daten geteilt werden."
   - Keine echte Behördenanbindung — "Spekulativer Prototyp — sämtliche Daten sind Mock."
   These are *prototype-v2* additions; the i18n-localizer agent owns later promotion to translated keys (followup).
3. **Hero icon** stays `IconCircle Landmark tone primary size lg`.
4. **Page background**: keep `bg-surface-page` from `(auth)/layout.tsx`. The card itself stays `Card` (which already has rounded-lg + border). Adjust outer Card to `rounded-xl shadow-sm` for closer match to sketch (the sketch's main card is clearly more rounded than 8px). Choose Tailwind `rounded-xl` (12px) — matches Card-style guide ("12px radius") from CLAUDE.md.
5. **Right rail**: stays as `<aside>` with `bg-surface-page p-5 rounded-lg`. Step numbers stay cobalt-tinted circles. The "Warum diese Anmeldung?" sub-section stays with three `IconCircle size sm` + label rows.

### 2.3 `OnboardingMethodCard.tsx` — tone prop

New optional prop `tone?: 'default' | 'accent'`:

```ts
interface OnboardingMethodCardProps {
  icon: ReactNode;
  title: string;
  helper: string;
  variant: 'prominent' | 'row';
  tone?: 'default' | 'accent';   // NEW; default 'default'
  onClick: () => void;
  trailingChevron?: boolean;
}
```

When `tone === 'accent'`, swap the surface to `bg-accent-soft border-accent-soft` and hover to `hover:bg-accent-soft/80`. Text colours unchanged (`text-text-primary` / `text-text-secondary`) — verifying contrast on the existing token: `accent-soft` already passes AA against `text-primary` / `text-text-primary` in light + dark (used elsewhere in shipped surfaces). The icon-circle inside stays `tone="primary"` (cobalt fill on cobalt-soft surface is sketch-faithful).

### 2.4 `OnboardingTrustItem.tsx` — optional description

Extend props with optional `desc?: string`. When `desc` is present, render label as **semibold heading** (`font-semibold text-text-primary text-sm`) and description below (`text-xs text-text-secondary leading-snug`). Existing single-label call sites continue to work (label-only mode).

Vertical layout for the trust-item card flips from inline `<span>` to a block `<div>` when `desc` is present:

```
[icon circle (sm, neutral tone)]
[label — semibold]
[desc — caption, 2 lines]
```

This is one component that supports both the old single-label inline mode and the new card-style stacked mode; the old `<OnboardingWelcome>` call site simply passes the new `desc` to opt in.

### 2.5 `OnboardingStepList.tsx` — step number tile

Sketch shows step circles **filled cobalt** with white numeral, not the current `bg-accent-soft text-primary`. Change:

- Step number circle: `bg-primary text-primary-foreground` (filled cobalt) instead of soft-on-soft. Size stays `size-7`. Connector stays `bg-border`.

This produces the white-on-blue numerals visible in the sketch's "1 / 2 / 3" tiles.

## 3. Hardcoded German strings introduced (followup → i18n-localizer)

| Where | DE inline value | Followup key proposal |
|---|---|---|
| `OnboardingWelcome` trust strip | „Verschlüsselte Übertragung gemäß BSI-Grundschutz." | `onboarding.trust.secure_desc` |
| `OnboardingWelcome` trust strip | „Sie entscheiden, welche Daten geteilt werden." | `onboarding.trust.consent_desc` |
| `OnboardingWelcome` trust strip | „Spekulativer Prototyp — sämtliche Daten sind Mock." | `onboarding.trust.no_real_connection_desc` |

These three new strings live in `OnboardingWelcome.tsx`. They are clearly marked TODO for the i18n agent (a small inline `// TODO(i18n)` comment, but per CLAUDE.md "no comments unless WHY is non-obvious" — the WHY here is non-obvious because the strings break the no-hardcoded-strings rule on purpose under the prototype-v2 hard rule #2).

## 4. Accessibility notes

- No semantic changes. `<h1>` still lives on `OnboardingWelcome`. `<h2>` for "So einfach geht's" and "Warum diese Anmeldung?" stays.
- Trust-strip `OnboardingTrustItem` becomes a `<div>` (not a `<span>`) when in card mode — purely presentational, no role.
- Focus order unchanged.
- AR-RTL: chevrons already use `rtl:-scale-x-100`. Trust-strip grid uses `grid` (logical) — no `left-`/`right-` properties added.
- Reduced motion: no animations introduced; sketch is static.
- Colour contrast: `bg-accent-soft` + `text-text-primary` is shipped-and-audited; reused as-is.

## 5. Out of scope (explicit)

- Screens B / C / D — no changes.
- i18n JSON edits — none (rule 2).
- Shared layout chrome — none (rule 1).
- Any token / theme / dark-mode adjustment — none.
- Any new shared primitive — none.
- Identitaet* / Consent* components — none (rule 3).
- Tests — out of scope per prototype-v2 hard rule (manual visual diff against sketch only; `npx tsc --noEmit` is the verification gate).

## 6. Verification gate

- `npx tsc --noEmit` exit 0.
- Visual diff: render `/onboarding` in dev, compare to sketch. Acceptance criteria:
  - Anmelden in top bar reads as a primary-filled pill, not a ghost link.
  - DeutschlandID + EUDI tiles look identical in weight; Demo-Modus reads as visually subordinate but obvious.
  - Trust strip is 3 columns, each with bold label + 2-line description.
  - Step numbers are white-on-cobalt circles.

## 7. Followups (handed to i18n-localizer / a11y-tester)

1. Promote the three hardcoded trust descriptions to `onboarding.trust.{secure,consent,no_real_connection}_desc` across all six locales.
2. Re-run axe on `/onboarding` to confirm the tinted Demo-Modus tile (`bg-accent-soft` + `text-text-primary`) clears AA in light + dark (expected pass; primitive is already shipped).
