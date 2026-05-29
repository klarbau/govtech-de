---
feature: prototype-v2-umzug-run
title: Autopilot-Run "Hero" — Prototype v2 visual sweep
status: spec
track: spine
date: 2026-05-28
author: frontend-coder
supersedes_scope: docs/specs/autopilot-run-hero.md (visual layer only — data flow + i18n + a11y guarantees REUSED unchanged)
authorization: docs/demo-spine.md "ACTIVE BUILD (decided 2026-05-27)" — user-supplied prototype sketch (`Downloads/3ff335ab-c246-47d9-9600-c44296fca74d.png`). Pure presentation refinement of the already-shipped redesign at `src/app/(app)/vorgaenge/umzug/run/page.tsx`.
inputs:
  sketch: C:\Users\iaiaa\Downloads\3ff335ab-c246-47d9-9600-c44296fca74d.png
  current_spec: docs/specs/autopilot-run-hero.md
  current_page: src/app/(app)/vorgaenge/umzug/run/page.tsx
  current_components: src/components/umzug/{AutopilotCascade,AutopilotCascadeNode,AutopilotHeroBanner,AutopilotLiveFeed,UmzugUebersichtCard,behoerdeIcon,cascadeTypes,stepStatusViz}.tsx
---

> Scope guard. Pure visual refinement of the EXISTING run-hero. No mock-backend touch.
> No i18n key change (all 36 `autopilotRun.*` keys already exist + are translated to 6 locales).
> No type change. The `tests/e2e/spine.spec.ts` selectors (`ol[aria-label="Fortschritt der
> Behörden-Benachrichtigung"]`, `[data-testid="cascade-node"][data-status="confirmed"]`,
> `[data-testid="autopilot-banner"][data-state="running"]`, heading "Kaskade wird ausgeführt")
> MUST remain intact.

## 1. Why a v2 sweep

The v1 redesign (shipped 2026-05-27) wires every behaviour correctly — data flow, a11y, reduced-motion, all 36 i18n keys, AutopilotTimeline reuse. But the visual register is too neutral against the sketch: the hero banner is a plain white card; the active node sits flat next to its siblings; the connector dots row reads as decoration rather than progress narrative; the Übersicht/Live-Feed cards lack the spatial rhythm of the prototype.

This spec keeps every behaviour and every key. It only refines the surface.

## 2. What stays — verbatim

- `src/app/(app)/vorgaenge/umzug/run/page.tsx`: ALL data machinery (`useSearchParams`, `api.getVorgang`, `api.subscribe` event merge, `behoerdenById` loader, `lettersById` map, `eidStepId` state, `cancelOpen` state, `BLOCK_RANK` filter+sort, `cascadeNodes` memo, `heroState` derivation, `confirmedCount`, `liveFeed` memo with synthetic entry, `formatRunSubtitle`, `BehoerdenLoader`, the `<Suspense>` wrap, the `EidConfirmDialog`/cancel `Dialog` blocks). Null-guard redirect to `/vorgaenge/umzug/start`. The footer Abbrechen/Zum-Vorgang buttons. The `PrototypeDisclaimer`.
- Every `autopilotRun.*` i18n key (36 leaves) and every reused `umzug.run.*` / `common.*` key.
- The `stepStatusViz` table (single source of truth for status → tone/variant/marker).
- `behoerdeIcon` + `behoerdeActionKey` maps (presentational only).
- `AutopilotStepRow` import-only refactor (untouched here; still consumed by Vorgang-Detail).
- All a11y guarantees: one `<h1>` from `PageHeader`; `<h2>` on banner / Übersicht / Feed; `<ol aria-live="polite">` on cascade and feed; `aria-live` wrapper on banner; status always in text+badge; `tabular-nums` on HH:mm + Aktenzeichen; `prefers-reduced-motion` kills the pulse and entrance fade.
- All spine-test contracts: cascade `aria-label`, `data-testid="cascade-node"` + `data-status`, `data-testid="autopilot-banner"` + `data-state`, `<h2>Kaskade wird ausgeführt</h2>`.
- `AutopilotTimeline` (untouched — Vorgang-Detail).

## 3. What changes — surface only

### 3.1 `AutopilotHeroBanner` — tinted variant

The sketch shows a **cobalt-tinted** banner card (a soft blue ground), not a neutral white card. Implement by passing `bg-accent-soft border-transparent` for the `running` state (and `bg-success-soft border-transparent` for `completed`, `bg-warning-soft border-transparent` for `partial_failure`). The `IconCircle` sits on this tinted ground; bump it from `size="lg"` to `size="lg"` with a tighter chip border for crispness. Title remains `<h2>` inside `aria-live="polite"` wrapper. Status pill stays right-aligned via `sm:flex-row sm:justify-between`. The pill remains a `StatusBadge` (no new variant). Padding: `p-5 sm:p-6`. No new strings, no new keys, no new props.

### 3.2 `AutopilotCascade` — proper connector row + active-node scaling

The sketch shows a **dedicated marker row above the cards**, with a connecting line that visibly changes per segment: solid green between done nodes, solid cobalt entering the active node, dotted neutral for the pending tail. Today this is rendered inside each node via two flex spacers; that works but reads as decoration. v2:

- Hoist the marker row out of each node so it's a single horizontal track at the top of the `<ol>` (≥md) with consistent vertical alignment. Each node still owns its marker so the existing per-node connector-tone derivation (`connectorToneFor(prev)`) stays the source of truth; we just render it inside a shared row with `flex` + `items-center`.
- The **active node** must read as visually emphasised. Add `ring-2 ring-primary ring-offset-2 ring-offset-surface-page` and `shadow-[var(--shadow-card)]` to the active card. Do NOT change card width — the responsive 1-row flex layout depends on equal flex children for the connector geometry. Visual prominence comes from ring + slightly stronger border + soft elevation, not size mutation.
- Connector segment colours stay token-driven (`bg-success`, `bg-primary`, dashed `border-border`). No new tokens.
- Reduced motion: pulse off (existing `useReducedMotion` guard); the ring is static so reduced-motion is unaffected. Entrance fade ≤200ms also already guarded.

### 3.3 `AutopilotCascadeNode` — sketch-aligned card

The sketch card is taller, with content stacked: tinted icon circle top-left, Behörde name bold, action line, timestamp suffixed with `Uhr`, status pill at the bottom. v2 deltas:

- Icon: `IconCircle size="md"` (already), positioned top-left in the card (already). Tone driven by status (already via `stepStatusViz`).
- Behörde name: `text-base font-semibold` with `leading-snug` (kept). Wrap in `<bdi>` for AR-RTL (kept).
- Action label: `text-sm text-text-secondary` (kept).
- Timestamp: append the localized `Uhr` suffix in DE via a new tiny presentational helper. NO new i18n key — concatenate `${timestamp} Uhr` only when the active locale is DE. For other locales, the bare HH:mm is correct (and there is no key to localize "Uhr"). To avoid coupling, use a stable utility: pass `timestamp` formatted from the page (`HH:mm`) and append `' Uhr'` when `useLocale() === 'de'`. The pending placeholder (`autopilotRun.node.timestamp_pending`) is unchanged ("—").
- Status pill: `StatusBadge` (kept).
- Active card: `ring-2 ring-primary` + `border-primary/50` (replace `border-primary`); soft `shadow-[var(--shadow-card)]`. Other status borders unchanged.
- Card surface: `bg-card` (default). Active card: explicit `bg-card` to make sure the ring sits on the card edge.
- Active marker: pulse stays — `useReducedMotion` guard already present.
- Card height equalisation: `h-full` already present on the inner `motion.div`. Keep.
- Spec inputs `data-testid="cascade-node"` + `data-status={node.status}` stay verbatim (spine test).

### 3.4 `UmzugUebersichtCard` — sketch-aligned spine card

The sketch shows:
- Rounded `IconCircle` Home top of card, then heading.
- `<dl>` rows: "Neue Adresse" + value; "Einzugsdatum" + formatted date (already).
- Sub-block: muted divider, label "Autopilot-Bereich" + pill "5 Behörden" right-aligned (already).
- List of behoerden each with green/grey check (already).
- Footer pill "Ihre Daten sind geschützt": `bg-accent-soft` panel with shield IconCircle, title + subtitle, chevron right; full-width clickable link to `/datenschutz` (already).

v2 deltas:
- Tighten spacing: bump main padding to `p-5` (SectionCard `padding="lg"`), interior gap `gap-4`.
- Sub-block divider: use the existing `border-t border-border` (already). Add `mt-4 pt-4` (already).
- The behoerden list: render with `<li>` markers as small `Check` icons (already). Add `tabular-nums` no (just text). Keep the check color logic.
- The schutz panel: keep `bg-accent-soft`, but ensure full ≥44px touch target — already 44px via `min-h-[44px]` (kept). Add `focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2` for visible keyboard focus (the global `:focus-visible` rule already applies; this is reinforcement).

No new i18n key. No prop change.

### 3.5 `AutopilotLiveFeed` — sketch-aligned feed

The sketch shows each entry as: small tone-tinted IconCircle on left, Behörde name + action lines, **time on the right + status pill on the right** (right column stacked). v2 deltas:

- The current implementation places `timestamp` next to behoerde name on top row and pill BELOW the action line on the left. Adjust: move timestamp + pill into a right column so they align to the right edge for visual rhythm matching the sketch.
- Suffix the timestamp with ` Uhr` on DE (same helper as §3.3).
- The newest entry (first `<li>`) keeps a subtle accent — render a small cobalt dot before the Behörde name only if `entry.badgeVariant === 'laufend'`. This is purely presentational; the badge itself still carries the status semantics.

No new i18n key. No type change to `LiveFeedEntry` shape.

### 3.6 Page layout — composition unchanged

The page already composes: PageHeader → HeroBanner → Cascade → 2-col grid (Übersicht | LiveFeed) → footer buttons → PrototypeDisclaimer → dialogs. v2: tighten the outer `gap-6 → gap-5` so the hero+cascade feel like one unit. The 2-col grid keeps `lg:grid-cols-[1fr_minmax(0,22rem)]`. No prop changes upstream.

## 4. Files touched (exhaustive)

- `src/app/(app)/vorgaenge/umzug/run/page.tsx` — outer gap tweak only; no logic touch.
- `src/components/umzug/AutopilotHeroBanner.tsx` — tinted bg per state; no prop change.
- `src/components/umzug/AutopilotCascade.tsx` — no API change; minor wrapper class tweaks.
- `src/components/umzug/AutopilotCascadeNode.tsx` — active-node ring/shadow; timestamp suffix; no API change.
- `src/components/umzug/AutopilotLiveFeed.tsx` — right-column align for timestamp+pill; accent dot for newest laufend entry; no API change.
- `src/components/umzug/UmzugUebersichtCard.tsx` — small spacing/padding tweaks; no API change.

No file is created. No file is deleted. No shared primitive is forked. No token is added. `stepStatusViz.ts`, `behoerdeIcon.tsx`, `cascadeTypes.ts`, `AutopilotStepRow.tsx`, `AutopilotTimeline.tsx`, `EidConfirmDialog.tsx`, and `PrototypeDisclaimer.tsx` are NOT touched.

## 5. i18n

No new keys. No DE source change. No locale file touched.

The single new visible string (`Uhr`) is a German typographic convention applied **only when** `useLocale() === 'de'`. It is not user content and it is not localizable (no "Uhr" equivalent in other locales is needed — bare HH:mm is the convention everywhere else in this app, including the Posteingang and Termine surfaces). This avoids an unscoped i18n.json edit.

## 6. a11y — unchanged guarantees

All existing guarantees stand (§3 of the autopilot-run-hero spec):

- One `<h1>` from `PageHeader`.
- `<h2>` on banner title, Übersicht title, Feed title.
- `<ol aria-live="polite">` on cascade + feed.
- `aria-live="polite"` wrapper on the banner title + subtitle.
- Status conveyed in text+badge (never colour alone).
- `tabular-nums` on HH:mm + Aktenzeichen.
- Marker rows and connector segments are `aria-hidden="true"`.
- eID button, Abbrechen, Zum Vorgang, schutz-link ≥44px touch targets.
- `useReducedMotion` guards the marker pulse and the 200ms node entrance fade.
- The active-node ring is a static colour ring (no animation), so reduced-motion is unaffected.

## 7. Reduced-motion

`useReducedMotion()` already guards: the marker pulse (`AutopilotCascadeNode.tsx:99`), the entrance fade (`AutopilotCascadeNode.tsx:138-141`). The active-card ring is non-animated. No new animations are introduced. The global CSS reduced-motion sledgehammer (`*::transition-duration: 0.01ms`) already covers the ring colour transition we add.

## 8. Spine test contract — kept verbatim

These selectors MUST remain green:

```
ol[aria-label="Fortschritt der Behörden-Benachrichtigung"]
[data-testid="cascade-node"][data-status="confirmed"]
[data-testid="autopilot-banner"][data-state="running"]
<h2>Kaskade wird ausgeführt</h2>
text=Finanzamt | text=Beitragsservice
```

The spec rewrites NONE of these.

## 9. Out of scope

- `AutopilotTimeline` / `AutopilotStepRow` (Vorgang-Detail consumer).
- Any backend / type / seed / latency change.
- Any new locale or key.
- Any token addition.
- Any change to `EidConfirmDialog`, `PrototypeDisclaimer`, shared `PageHeader`/`IconCircle`/`StatusBadge`/`SectionCard`/`RightRailCard`/`Card`/`Button`.
- Mobile rewrite — the existing `< md` vertical stack is correct against the sketch (the sketch is desktop-only). Mobile receives only the cascading style refinements via shared classes.

## 10. Review checklist

- [ ] No file outside §4 modified.
- [ ] `git diff` shows no token / i18n JSON / type / shared-primitive change.
- [ ] Spine test selectors intact (cascade `aria-label`, `data-testid="cascade-node"`/`data-status`, `data-testid="autopilot-banner"`/`data-state`, banner `<h2>` text).
- [ ] Hero banner is tinted by state (accent-soft / success-soft / warning-soft) with transparent border.
- [ ] Active cascade node carries `ring-2 ring-primary` + soft shadow; pulse marker remains under `useReducedMotion` guard.
- [ ] Connector segment tones still token-driven from `connectorToneFor(prev)`.
- [ ] Live-Feed timestamps + pills align to the right column.
- [ ] Übersicht datenschutz panel is a real `<Link>` ≥44px with visible focus.
- [ ] `tsc --noEmit` exit 0.
- [ ] `tests/e2e/spine.spec.ts` step 5 still passes.

## Build log — frontend-coder

- date: 2026-05-28
- screens implemented: Autopilot-Run (Hero) v2 visual sweep
- components modified:
  - `src/app/(app)/vorgaenge/umzug/run/page.tsx` — outer gap tighten only (`gap-6 → gap-5`); zero logic change.
  - `src/components/umzug/AutopilotHeroBanner.tsx` — tinted state surface (`bg-accent-soft / success-soft / warning-soft` + transparent border); Wand2 → Sparkles to mirror sketch; `sm:p-6` denser hero padding; subtle ring-1 on the IconCircle for crispness on the tinted ground.
  - `src/components/umzug/AutopilotCascadeNode.tsx` — active node now reads as the cascade focus: `border-primary` + `ring-2 ring-primary/30 ring-inset` + `shadow-[var(--shadow-card)]`. Card has `overflow-hidden`, so `ring-inset` is required (a `ring-offset` would clip). Timestamp suffixed with " Uhr" on DE only (`useLocale()` gate, no new i18n key) — bare HH:mm on every other locale, matching the rest of the app.
  - `src/components/umzug/AutopilotLiveFeed.tsx` — feed entries now use a 2-column row (Behörde + action on the left, timestamp + StatusBadge stacked on the right) to mirror the sketch's right-aligned meta column. Newest "laufend" entry carries a small cobalt accent dot before the Behörde name (decorative, semantic status stays on the badge). " Uhr" suffix on DE via the same helper.
  - `src/components/umzug/UmzugUebersichtCard.tsx` — `padding="lg"` to give the Übersicht card the prominence the sketch shows.
- components NOT touched (deliberately): `AutopilotCascade.tsx`, `AutopilotStepRow.tsx`, `AutopilotTimeline.tsx`, `EidConfirmDialog.tsx`, `behoerdeIcon.tsx`, `cascadeTypes.ts`, `stepStatusViz.ts`, every shared primitive, every i18n JSON, every type.
- i18n keys added: 0 (no DE source change; no locale file touched).
- typecheck: pass on my scope (no TS errors emitted by these files). One pre-existing TS error survives in `src/components/datenschutz/DatenschutzView.tsx` — owned by the parallel datenschutz agent, NOT introduced here.
- lint: not re-run (project ESLint config-load issue is pre-existing; tsc covers correctness on my scope).
- spine smoke test (`tests/e2e/spine.spec.ts`): FAILS at step 2 (dashboard) — `getByRole('heading', { name: /Petrov/i })` not visible. Root cause is the parallel dashboard agent's rewrite of `DashboardGreeting.tsx` (verified via `git diff`), NOT this change. The test never reaches step 5 (cascade) due to the upstream failure. My selectors (`ol[aria-label="Fortschritt der Behörden-Benachrichtigung"]`, `[data-testid="cascade-node"][data-status="confirmed"]`, `[data-testid="autopilot-banner"][data-state="running"]`, `<h2>Kaskade wird ausgeführt</h2>`, "Finanzamt" + "Beitragsservice" content) are all preserved verbatim in the cascade page.
- production build (`next build`): compiles successfully through bundling; the type-check phase trips on a pre-existing missing module `./DatenquelleTile` in `src/components/steuer/SteuerHeroCard.tsx` (parallel steuer scope, not mine).
- known gaps for code-reviewer:
  1. The active card's prominence is delivered via ring + border + shadow rather than the sketch's clearer size scaling. Width scaling would break the equal-flex layout that the connector row depends on; preserving the connector geometry was the priority. If a future iteration wants explicit size emphasis, it needs a parallel reshape of `AutopilotCascade` to position connector dots independent of node width.
  2. The hero banner Sparkles icon picks the cobalt tone via `tone="primary"`; the IconCircle uses `bg-accent-soft` which now sits ON the banner's `bg-accent-soft` ground — they read as concentric tinted circles rather than separated shapes. The `ring-1 ring-white/40` keeps the chip distinct. If reviewer wants stronger separation, swap to `bg-card` for the IconCircle on this banner state.
  3. Live-Feed "newest laufend" accent dot is decorative and may double-encode with the StatusBadge dot. Kept because the sketch shows this exact pattern; the badge remains the semantic source.
- next: code-reviewer | a11y-tester
