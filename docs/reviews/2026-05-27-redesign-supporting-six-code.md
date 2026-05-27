---
feature: redesign-supporting-six (dokumente, termine, steuer, familie, datenschutz, stammdaten-reskin)
date: 2026-05-27
reviewer: code-reviewer
verdict: APPROVE
track: supporting (REDUCED rigor tier per WORKFLOW.md - full correctness/security/a11y; locale parity NOT gold-plated, but verified complete here)
gates:
  tsc_noEmit: pass (exit 0)
  unit: 639/639 pass
  next_build: pass (exit 0, all 6 supporting + spine routes, all dynamic)
  i18n_json_parse: de/en/ru/uk/ar/tr all OK
  i18n_parity: 0 missing supporting keys across en/ru/uk/ar/tr; 0 missing stammdaten chrome keys
a11y: PASS (per task - all 6 audited axe 0 serious/critical, light/dark/ar). Not re-audited here (role boundary).
---

## Verdict
**APPROVE** - all six supporting screens are correct, idiomatic, secure, and spec-compliant. Build-infra pragmatics are acceptable demo-engineering with documented justification. Only NITs remain (deferrable).

## Per-screen verdict
| Screen | Verdict | Note |
|---|---|---|
| Dokumente | APPROVE | DataTable / `deriveDocumentStatus` / preview / pagination sound; backend enriches `kategorie`; 19 docs real behoerden + `[MOCK]`. |
| Termine | APPROVE | `MonthCalendar` WAI-ARIA grid solid; `buildIcs` valid RFC-5545 + `[MOCK]`; cross-spec frist lock honoured. |
| Steuer | APPROVE | Pre-fill hero, stepper `<ol>`+`aria-current`, privacy-by-design rail; demo CTAs are toasts. |
| Familie | APPROVE | Renders from seed: Tobias Becker = partner, Lev Petrov-Becker (geb. 2024) = kind; `getFamilie` read-only, no log. |
| Datenschutz | APPROVE | Consent persists via `api.setDatenschutzEinwilligung`; correct `app_aktivitaet` log (Art.6 / Art.7 Abs.3 DSGVO); live timeline; no real PII in note. |
| Stammdaten re-skin | APPROVE | Modal state machine + all `data-testid`s + Sektion components + Mobilitaet/Sperren/Cascade preserved; 639/639 incl. stammdaten suites. |

## Verified per task instruction (each with file:line)
- [x] Datenschutz consent persistence goes through `api.setDatenschutzEinwilligung` (persistence-module `write()`, NOT direct localStorage in the component) - `src/lib/mock-backend/datenschutz/api.ts:194-237`, `:70-72`.
- [x] Log-emission correct: `kategorie: 'app_aktivitaet'`, `zweck_i18n_key: 'datenschutz.log.einwilligung_geaendert'`, `rechtsgrundlage` Art.6 lit.a (grant) / Art.7 Abs.3 (revoke), appended to the EXISTING uebermittlungs-log bucket via `appendLogEntry`, emits `stammdaten/log-entry-appended` for live timeline - `datenschutz/api.ts:203-236`. Note string is a role enum + synthetic id (`mock:true`) - no real PII.
- [x] Familie renders Tobias Becker as partner + Lev as child (not adult) - `personas.json:58-90` -> `familie/api.ts:182-204` maps `familie.partner` -> rolle `partner`, `familie.kinder` -> rolle `kind`. UI reads seed, ignores PNG labels.
- [x] `deriveDocumentStatus` sound: abgelaufen > ablauf_bald (<=90d) > neu (<=30d) > verifiziert; SSR-stable via `nowIso`; calendar-day diffs - `deriveDocumentStatus.ts`.
- [x] Stammdaten re-skin did not break the shipped state machine/modals: religion/sperren/iban/pflegegrad states (`StammdatenView.tsx:98-113`) + all `data-testid`s preserved; data-loading calls unchanged (`:122-145`); vitest 639/639.
- [x] Demo CTAs (upload/Beleg/export/Ordner/Vorlagen/Papier/download) are genuine no-op toasts - no fake backend writes: `DokumenteView.demoToast`, `SteuerView.onDemoAction`, datenschutz `handleVisionAction`, `HaushaltVerwaltenDialog` (no mutation path).

## Build-infra read (acceptable demo-pragmatism - none block; user-facing assessment)
1. `src/pages/_error.tsx` coexisting with App Router - ACCEPTABLE. Works around the Next 15.5.18 built-in `/_error` static-export bug ("<Html> should not be imported outside pages/_document") that otherwise aborts `next build`; `getInitialProps` forces a non-static error page. Inline-styled, App-Router-only project; real errors served by `app/not-found` + `app/global-error`. Low risk; revisit if the upstream bug is fixed.
2. `export const dynamic = 'force-dynamic'` on all app routes + page + not-found - ACCEPTABLE for a mock-demo. The app is localStorage/cookie-locale driven and not statically prerenderable under next-intl@3 + Next 15.5; force-dynamic is the honest setting. Build confirms all routes are dynamic. No SEO/scale concern for a portfolio demo.
3. `next.config.ts` `eslint.ignoreDuringBuilds: true` - ACCEPTABLE with caveat. Justified by the eslint-config-next + ESLint-9 incompatibility; lint runs as a separate gate (`pnpm lint`). CAVEAT: this only holds while the standalone lint gate is actually run pre-ship - the build no longer catches lint regressions. Keep `pnpm lint` mandatory in CI.
4. `next.config.ts` `outputFileTracingRoot` pinned - ACCEPTABLE / GOOD. Fixes wrong workspace-root inference from a parent-dir lockfile that could duplicate bundled modules. Correct, scoped fix.
5. `global-error.tsx` inline-styled hardcoded German strings outside the intl provider - ACCEPTABLE, documented exception. global-error renders its own html/body below the provider tree, so `t()` is unavailable; inline styles avoid a CSS-load dependency at crash time. Strings are German (primary locale) and dignified. This is the one sanctioned no-`t()` spot; `_error.tsx` shares the rationale.
6. `src/i18n/request.ts` try/catch -> defaultLocale - ACCEPTABLE / GOOD. `cookies()`/`headers()` throw during build-time prerender; falling back to defaultLocale instead of bubbling an undefined-messages error is the correct guard. Narrowly scoped.

## NITs (non-blocking, deferrable)
1. `src/lib/mock-backend/datenschutz/api.ts:156-160` - tautological ternary `traeger === 'AOK Nordost' ? 'aok-nordost' : 'aok-nordost'` (both branches identical). Dead branch; simplify to the literal or implement the real Krankenkasse lookup.
2. `src/components/datenschutz/ActivityTimelineRow.tsx:80` - `nowIso` prop is `void`-ed and unused; relative time uses live `new Date()` via date-fns, so it is NOT actually SSR-stable despite the prop's doc-comment. Either pass nowIso as the formatDistance base, or drop the prop + comment.
3. `src/components/steuer/SteuerHeroCard.tsx:100` - local helper `cn_amount` is snake_case; project convention is camelCase for functions (e.g. `amountClass`).
4. `src/components/termine/TermineView.tsx:256` - `NaechsterTerminCard` statusLabel hardcoded `tStatus('bestaetigt')`; the badge variant is derived from `termin.status` but the text is not. Mismatch is unreachable today (next-termin filter excludes abgesagt; seed termin is bestaetigt), but a `gebucht` termin would render the text "Bestaetigt". Derive the label from `termin.status`.
5. `steuer/api.ts:22`, `familie/api.ts:29`, `datenschutz/api.ts:87` - `as unknown as import('zod').ZodType<...>` schema casts; same pattern already flagged repo-wide as a V1.0.1 followup (extract a typed-schema helper). Pre-existing convention, not a logic type-hole.
6. `src/components/dokumente/DokumenteView.tsx:125` - `kategorieOf` fallback to `'bescheide'` is effectively dead (backend always enriches `kategorie` via `deriveDocumentKategorie` in `getDocuments`). Harmless defensive default.

## Notes
- Pre-existing guarded `console.error` calls in `stammdaten/*` (StammdatenView, kontakt/*, PunktestandOnDemandCard:58) are NOT introduced by this work and are already a tracked V1.3.1 followup; the re-skin correctly left them untouched.
- a11y FAIL would force REVISE; the task states all six PASS (axe 0 serious/critical, light/dark/ar). Not re-audited here per role boundary.

## Recommendation
All six specs -> status: `shipped`. Address NITs when convenient. Keep the standalone `pnpm lint` gate mandatory in CI given `eslint.ignoreDuringBuilds: true`.
