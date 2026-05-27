---
feature: redesign-foundation
date: 2026-05-27
reviewer: code-reviewer
verdict: REVISE
track: spine
build_logs_reviewed:
  - frontend-coder: 2026-05-27
  - i18n-localizer: 2026-05-27
  - a11y-tester: 2026-05-27 (inline; gate redesign-foundation-shell.spec.ts 7/7 PASS)
a11y_report: inline (no report file; re-run gate PASS; 4 contrast blockers + 2 sub-blockers fixed, verified by re-pinned color-token test)
gates:
  tsc: pass
  lint: pass (only pre-existing out-of-scope warning stammdaten/api.ts:39)
  unit: 635/635 pass
  repinned_tests: color-tokens 15/15, print-stylesheet 12/12
---

## Verdict
**REVISE** - Token consolidation, shadcn re-pointing, and primitive APIs are clean and type-safe; five foundation-contract issues must land before 10 screens build on them.

## Spec compliance
- [x] 6.A ONE consolidated token set; --ds-color-* kept as var(--color-*) aliases (no warm OKLCH left)
- [x] 6.A shadcn aliases re-pointed; no broken --ds-* leak; @theme inline self-reference is the standard shadcn+tw-v4 idiom (base literal #2563EB breaks the apparent cycle)
- [x] 6.A --font-sans = Inter; focus-ring on --color-primary 2px+2px, prefers-contrast 3px
- [x] 4.A Sidebar w-60, Landmark header, nav order (Stammdaten #3 IdCard), flat accent-soft active pill (no 4px leiste), Hilfe/Abmelden footer + divider
- [x] 4.B Topbar backdrop-blur removed; brand left; controls right via ms-auto; UserMenu Avatar+Name+Chevron
- [x] 4.A MobileNav Sheet side=inline-start width=nav; closes on route + md-resize
- [x] 6.B all 15 new primitives exist exactly once
- [x] HL-DS-10 BehoerdenBadge genuinely colour-free
- [x] HL-DS-4/5/6/7 honoured (text-muted darkened, blur removed, tabular-nums, reduced-motion global block)
- [ ] 11/6.B mandated guard test design-system-behoerden-badge-no-color.test.ts MISSING - REVISE
- [ ] 6.A radius: standard Card/Dialog render 14px (rounded-xl), spec mandates 12px - REVISE
- [ ] 11 cross: hardcoded a11y strings in Footer/Dialog/Sheet - REVISE
- [ ] B7 FilterButton 36px below HL-DS-8 44px floor - REVISE
- [ ] 3 nav order duplicated in MobileNav instead of importing exported navItems - REVISE

## Issues by file

### src/components/layout/Footer.tsx
- L15 [REVISE] aria-label="Footer" hardcoded SR landmark name. Route through t(); needs a footer landmark key in 6 locales. track:spine = full rigor.

### src/components/ui/dialog.tsx
- L78 [REVISE] sr-only "Close" hardcoded English SR string, rendered on every Dialog (10 screens). Route through t() e.g. common.cta.close.
- L116 [REVISE] "Close" literal in DialogFooter close button.
- L59 [REVISE] rounded-xl (=14px) - spec 6.A Modal = --radius-lg 12px. Use rounded-lg.

### src/components/ui/sheet.tsx
- L75 [REVISE] closeAriaLabel default "Sheet schliessen" hardcoded German SR string for any Sheet omitting the prop. Require the prop (no default) or supply t()-sourced default per call-site. MobileNav passes shell.sidebar.close correctly; the unsafe default is the issue.

### src/components/ui/card.tsx
- L21 [REVISE] default rounded-xl (14px) / wallet rounded-2xl (16px). Spec 6.A: standard 12px (rounded-lg), wallet 14px (rounded-xl). Both one step too round. RightRailCard/SectionCard wrap this Card, so every card on 10 screens inherits the wrong radius.

### src/components/layout/MobileNav.tsx
- L37-64 [REVISE] Re-declares nav array + i18nKey union + isActive() + Hilfe/Abmelden footer, duplicating Sidebar.tsx which already exports navItems (arrays byte-identical). Import the shared navItems (static module const, safe across RSC/client boundary). Spec criterion = one nav order / one source-of-truth (3, 11); the duplicate is a drift hazard.

### src/components/shared/FilterButton.tsx
- L33 [REVISE] size="sm" resolves to min-h-[36px] (button.tsx L26), below 44px. Spec B7 requires >=44px (HL-DS-8). SelectTrigger sm is 44px so LanguageSwitcher is fine; only Button sm is 36px. Use size="default" or explicit min-h-[44px].

### src/components/shared/KeyValueRow.tsx
- L28-40 [NIT] Emits dt/dd as direct children of a plain div. Valid HTML requires dt/dd inside a dl (or a div that is itself a child of dl). JSDoc acknowledges the consuming screen must wrap; as written the primitive emits invalid markup unless 4+ screens remember the implicit contract. Prefer rendering its own dl wrapper. Graceful -> NIT.

### src/components/shared/Pagination.tsx
- L50 [NIT] nav aria-label labels the landmark "Seite N" (uses the per-page-button key) - the landmark name changes per page and reads oddly in SR landmark nav. Add common.pagination.label for the nav landmark.

### src/components/shared/BehoerdenBadge.tsx
- L11 [NIT] kategorie prop in interface but never read (only showKategorie+kategorieLabel used). Kept for source-compat per build-log; drop once call-sites migrate.

## Security review
- [x] No dangerouslySetInnerHTML in footprint
- [x] No localStorage/sessionStorage in components (mock-backend boundary respected)
- [x] No API keys / PII in foundation layer
- [x] LanguageSwitcher persists via server action setLocaleCookie, not client storage

## Type safety
- [x] No any, no @ts-ignore/@ts-expect-error, no "as unknown as" in any footprint file
- [x] Discriminated string-unions over boolean flags throughout (StatusVariant 16, Badge BaseVariant, IconCircle/Avatar, SectionCard, Sheet side)
- [x] tsc --noEmit clean
- [x] StatusBadge unknown-variant -> neutral fallback (never colourless) handled (edge case 9)

## Convention adherence
- [x] File placement matches CLAUDE.md (shared/ vs ui/, layout/)
- [x] kebab-case files, PascalCase components, @/ alias
- [x] Server-by-default; use-client only where interactive; Sidebar/Topbar/Footer stay RSC; SidebarNavItem passes lucide icon as ReactNode across boundary (correct RSC pattern)
- [x] i18n 38 new keys hierarchical, de.json + 5 locales (per i18n build log)
- [~] 4 leftover SR-facing literals (Footer/Dialog x2/Sheet) - see blockers

## Re-pinned test review
- [x] color-tokens.test.ts properly re-pointed: recomputes WCAG contrast from actual hex (not snapshot-only), gates HL-DS-7 (>=5.6:1 muted vs surface AND surface-muted both modes), the 4 a11y blockers, text-primary >=12:1, + hex drift snapshot. Genuine guard, APPROVE the re-pin.
- [x] print-stylesheet.test.ts 12/12 against consolidated token names (HL-DS-13). APPROVE.

## Build-unblocking call-site edits (verified)
- [x] posteingang/ReplySheet.tsx xs->sm renders; no removed-variant refs anywhere in src
- [x] umzug/EidConfirmDialog.tsx ds-primary/ds -> default; confirm button cobalt-primary 44px, cancel outline; both functional

## Approval blockers
1. Hardcoded SR strings -> t(): Footer.tsx:15, dialog.tsx:78, dialog.tsx:116, sheet.tsx:75 (default value).
2. Card/Dialog radius: card.tsx:21 default rounded-xl->rounded-lg (12px) + wallet rounded-2xl->rounded-xl (14px); dialog.tsx:59 rounded-xl->rounded-lg.
3. Nav source-of-truth: MobileNav.tsx:37-64 import exported navItems from Sidebar.tsx instead of redeclaring.
4. FilterButton touch-target: FilterButton.tsx:33 raise to >=44px (HL-DS-8 / B7).
5. Add tests/unit/design-system-behoerden-badge-no-color.test.ts (HL-DS-10 regression guard, spec 6.B + 11).

## Approval nits (non-blocking)
1. KeyValueRow.tsx render own dl wrapper or pin the contract.
2. Pagination.tsx:50 add common.pagination.label for the nav landmark.
3. BehoerdenBadge.tsx:11 drop dead kategorie prop once call-sites migrate.

## Recommendation
REVISE. frontend-coder addresses blockers 1-4 (small localized edits) + adds the HL-DS-10 guard test (blocker 5); i18n-localizer adds 1-2 new SR-string keys (footer landmark, close, pagination landmark) across 6 locales. Nits deferrable. Then re-request review - no full a11y re-run needed (contrast unaffected); a quick axe re-check on a primitive-demo route is advisable since FilterButton height + card radius change rendered geometry. This gate stays closed for the 10 screen-builds until these land.
