---
feature: umzug
date: 2026-05-08
reviewer: code-reviewer
verdict: REVISE
build_logs_reviewed:
  - frontend-coder: 2026-05-08
  - mock-backend-coder: 2026-05-08
  - assistant-engineer: 2026-05-08
  - i18n-localizer: 2026-05-08
a11y_report: docs/a11y-reports/umzug-2026-05-08.md
---

## Verdict

**REVISE** — Two blockers must be cleared before this build can be marked `shipped`. The first is a hard CLAUDE.md / role-card rule violation (`as unknown as` shim that the spec build log itself flags as removable now that `getBehoerden` is on the public surface, present in three pages). The second is a `pnpm lint --max-warnings=0` failure: `_input` is an unused parameter in `src/lib/mock-backend/api.ts:477`, which the role file explicitly lists as an automatic REVISE pattern. Everything else (spec compliance, a11y, i18n parity, security, autopilot architecture) is in good shape.

## Spec compliance

- [x] §4.1 Start screen at `src/app/(app)/vorgaenge/umzug/start/page.tsx` — form, `<AdresseInput>`, `<WohnungsgeberUpload>`, `<DatePicker>` (native `<input type="date">`), `<PrototypeDisclaimer>`, all i18n-driven.
- [x] §4.2 Preview screen at `src/app/(app)/vorgaenge/umzug/preview/page.tsx` — `<CascadePreview>` with all 4 blocks, persona-aware Block D, prototype disclaimer.
- [x] §4.3 Run screen at `src/app/(app)/vorgaenge/umzug/run/page.tsx` — `<AutopilotTimeline>`, `<EidConfirmDialog>`, cancel dialog, prototype disclaimer.
- [x] §4.4 Vorgang detail at `src/app/(app)/vorgaenge/umzug/[id]/page.tsx` — RSC, `<VorgangHeader>`, `<AdresseDiff>`, `<BehoerdenStatusList>`, `<TerminCard>`, `<DatenschutzCockpitLink>`, `<FristDetailModal>` trigger, prototype disclaimer.
- [x] §5 Autopilot 4-block architecture intact in `src/lib/mock-backend/autopilot/umzug.ts`. Block A (lines 71–129) contains exactly Bürgeramt, Finanzamt, Beitragsservice, Bundesdruckerei — KFZ / Familienkasse / ABH live in Block D (lines 164–210) gated by `kfz_halter` / `kindergeld_bezug` / `aufenthaltstitel`. Each successful Block A step generates a Bestätigungsschreiben via `buildLetter()` (lines 345–356).
- [x] §5 Block D is yielded *before* Block B in the generator (lines 374–393 vs 395–446) — matches spec narrative ordering on Run screen.
- [x] §6 Data model — `BlockTyp` (`src/types/vorgang.ts:4`), `Adresse` with PLZ regex documented (`src/types/adresse.ts`), `Persona.kfz_halter` / `kindergeld_bezug` / `wehrerfasst` are required booleans (`src/types/persona.ts:60–64`), `Behoerde.kategorie` includes `'privat'` (`src/types/behoerde.ts:9–14`).
- [~] §6 `UmzugInput` field naming drift — spec table calls the field `stichtag_iso` and `block_b_consent`; `src/types/umzug.ts:16,22` uses `stichtag` and `consents`. This is internally consistent (autopilot, api, store all use `stichtag` / `consents`) and the tool schema correctly bridges via `stichtag_iso` for the model — but the spec §6 prose should be updated next pass. NIT.
- [x] §7 Tool `starte_umzug` registered at `src/lib/ai/tools.ts:42–97` with `neue_adresse` / `stichtag_iso` / `block_b_consent` schema. Description references the four-block model and DSGVO consent rules.
- [x] §7 Prompt cache enabled — `cache_control: { type: 'ephemeral' }` on both system blocks at `src/app/api/assistant/route.ts:108–119`.
- [x] §7 Mandatory disclaimer rule baked into system prompt at `src/lib/ai/system-prompt.ts:60–65` with literal `MANDATORY_DISCLAIMER_DE` and instruction to translate for non-DE turns.
- [x] §8 i18n parity — all 6 locales (de/en/ru/uk/ar/tr) carry exactly **139** leaf keys, **0 missing / 0 extra** vs `de.json` (verified with a tree walk).
- [x] §11 review checklist — Bußgeld key referenced exclusively in `src/components/shared/FristDetailModal.tsx:53`; `data-bussgeld-context="frist-detail-modal"` only at line 46 of the same file. Hero/preview/run never render the Bußgeld text.
- [x] §11 [MOCK] watermark present in autopilot Bestätigungsschreiben (`MOCK_FOOTER` on `src/lib/mock-backend/autopilot/umzug.ts:30–31` is the first line of every generated body), seed `documents.json`, seed `letters.json`, and seed `personas.json`.
- [x] §11 Persona Anna §18g correction in place — `src/data/personas.json:18` (`"§ 18g AufenthG"`) and `docs/personas.md:9` carry the correction note.
- [x] §11 framer-motion users gate on `useReducedMotion()`: `src/components/umzug/AutopilotStepRow.tsx:58` and `src/components/umzug/EidConfirmDialog.tsx:32` are the only `framer-motion` consumers and both call the hook + short-circuit `initial`, `transition.duration`, and `repeat`.

## Issues by file

### `src/app/(app)/vorgaenge/umzug/preview/page.tsx`

- **L165** [REVISE] `const maybeApi = api as unknown as { getBehoerden?: () => Promise<Behoerde[]> };` — `MockBackendApi` already declares `getBehoerden(): Promise<Behoerde[]>` at `src/lib/mock-backend/api.ts:272`, and the implementation is wired at line 407. Frontend-coder's own build log (spec §"Build log — frontend-coder", "known gaps") explicitly says "switch to a direct `api.getBehoerden()` call once the public type exposes it" — that condition is now met. Drop the cast and the `typeof … === 'function'` guard; call `api.getBehoerden()` directly. Also remove the trailing comment at **L148** (`{/* When mock-backend lands, populate behoerdenById from api.getBehoerden(). */}`) — stale, references a now-completed work item, violates the role-card rule against "comment referencing the current task or PR". Frontend-coder.

### `src/app/(app)/vorgaenge/umzug/run/page.tsx`

- **L272** [REVISE] Same `as unknown as` shim as above. Replace with a direct call. Frontend-coder.
- **L61, L116, L126** [NIT] hardcoded fallback `'Fehler'` in `setError(err instanceof Error ? err.message : 'Fehler')`. The mock-backend throws `MockBackendError` instances with translatable messages, but the literal fallback should still go through `tCommon('cta.erneut_versuchen')` adjacent or a new `common.error.generic` key. Frontend-coder, defer.

### `src/app/(app)/vorgaenge/umzug/[id]/page.tsx`

- **L86** [REVISE] Same `as unknown as` shim. Replace with `await api.getBehoerden()`. Frontend-coder.

### `src/lib/mock-backend/api.ts`

- **L477** [REVISE] **`pnpm lint --max-warnings=0` blocker.** `previewUmzug: (_input) => …` uses an underscored unused parameter. Despite the underscore convention, the project's `@typescript-eslint/no-unused-vars` rule still flags it; the role-card lists `pnpm lint` failures as automatic REVISE (`Specific anti-patterns to flag` → unhandled lint). Either drop the parameter (the implementation does not use `input`), use `_input: unknown` with an underscore-prefixed pattern that the rule already permits, or thread `input` through (it carries `neue_adresse` and `stichtag` which are technically available but unused for the current persona-only preview). Mock-backend-coder.

### `src/components/umzug/WohnungsgeberUpload.tsx`

- **L89** [NIT] `{isDemo ? '' : ''}` — both branches return the empty string. Dead code; either render a small "Beispiel"-Pill when `isDemo` is true or drop the ternary. Frontend-coder.

### `src/components/layout/Footer.tsx`

- **L15** [NIT] `aria-label="Footer"` — already documented by a11y-tester (P3 advisory). Move to an i18n key (e.g. `footer.nav_label` → "Footer-Navigation"). Frontend-coder, defer.

### `src/components/umzug/AutopilotStepRow.tsx`

- **L110** [NIT] `<span className="sr-only">Status: </span>` — visually-hidden but screen-reader-visible string. Move to an i18n key (e.g. `umzug.run.status.sr_label`). Frontend-coder, defer.

### `src/lib/mock-backend/seed.ts`

- **L45–L50** [NIT] six `as unknown as Behoerde[] / Persona[] / …` casts on raw JSON imports. Defensible because TypeScript's `resolveJsonModule` infers loose types and the schemas validate at runtime via `zod`, but a cleaner pattern is to type the `import` with a narrow inline type and let `zod` parse give you the real shape. Mock-backend-coder, defer.

### `src/app/api/assistant/route.ts`

- **L126, L205, L208** [NIT] three `as unknown as …` casts, each with a one-line comment explaining the SDK 0.32 type gap. Acceptable per the role-card's "with rationale" carve-out (the assistant-engineer build log calls these out). Re-evaluate when SDK upgrades. Assistant-engineer, defer.

## Security review

- [x] No `ANTHROPIC_API_KEY` in client-bundled code. `Grep` confirms reference exists only in `src/lib/ai/client.ts:36–39` (server-only module — assistant-engineer build log: "no imports of `@/lib/ai/**` from `src/app/(app)/**`").
- [x] No `dangerouslySetInnerHTML` anywhere in `src/`.
- [x] No `console.log` in committed code under `src/`.
- [x] No `localStorage` access outside `src/lib/mock-backend/{persistence,latency}.ts` (`latency.ts:30` reads `meta` for reliable-mode flag — mock-backend-private use, not component access; acceptable).
- [x] No `fetch('/api/...')` to mock backend.
- [x] `Wohnungsgeber`-Upload only stores `filename` + `isDemo` (no Base64) — PII-hygiene posture, deliberate. README does not currently document this (frontend-coder build log recommended adding it). NIT.

## Convention adherence

- [x] File placement matches `CLAUDE.md` folder map.
- [x] Naming: `kebab-case.tsx` files (with the App Router `[id]` exception), `PascalCase` components, `camelCase` functions.
- [x] All user-facing strings go through `t()` — single grep hit on `>[A-ZÄÖÜ][\w ]{4,}<` in `src/app/(app)/**` returns zero matches; `aria-label="…"` returns the single Footer hit already noted.
- [x] Components are Server Components by default; client components have a clear interactive justification.
- [x] Mock-backend boundary respected: components never reach into `localStorage`.
- [x] `[MOCK]` watermark on every generated Bestätigungsschreiben body and seed document.
- [~] Comment hygiene: one stale "When mock-backend lands…" comment at `preview/page.tsx:148` (REVISE per role-card "comment referencing the current task or PR"). Bundled into the §preview page REVISE item.

## A11y carry-forward

a11y-tester verdict was **PASS-WITH-NOTES** (zero serious/critical axe violations on all seven Umzug routes, full manual rubric green). The five advisory items are catalogued here for completeness:

1. **Touch targets `Button h-8 / h-7 / size-6`** — meets WCAG 2.2 AA 24px floor; falls short of 2.5.5 AAA 44×44. NIT for this iteration; bump primary CTAs to `h-10`/`h-11` before public Loom recording.
2. **BITV plain-language toggle (Leichte Sprache)** — explicit future-work per role file.
3. **BITV sign-language video stub** — explicit future-work per role file.
4. **`aria-label="Footer"` hardcoded** at `src/components/layout/Footer.tsx:15` — listed above as NIT.
5. **Empty locale stubs** — resolved by i18n-localizer (139/139 across all six locales).

## Spec carry-forward and orphans

- i18n-localizer flagged that frontend-coder added keys beyond the §8 spec table (`umzug.run.cancel_dialog.*`, `umzug.run.vorgang_label`, `common.frist_detail.*`, `umzug.start.error.felder_unvollstaendig`, `umzug.start.wohnungsgeber.demo_filename`, `umzug.start.wohnungsgeber.selected_template`, `umzug.preview.error`, `umzug.preview.loading`). All present and translated in all six locales; translations are sensible and consistent. **APPROVE these as additions; NIT to amend §8 in the next product-architect pass.**
- Wohnungsgeber-Upload-filename-only flow is in the mock-backend-coder build log under "known gaps" but **not** documented in `README.md`. NIT — frontend-coder or whoever next touches the README should add a one-liner under "Demo-Hinweise" noting that the upload is metadata-only by design.
- `personas.md` Anna §18b → §18g correction is in place at `docs/personas.md:9` and propagated to `src/data/personas.json:18`.

## Approval blockers

1. `src/app/(app)/vorgaenge/umzug/preview/page.tsx:165` — `as unknown as` shim for `getBehoerden`. Frontend-coder.
2. `src/app/(app)/vorgaenge/umzug/preview/page.tsx:148` — stale `{/* When mock-backend lands, … */}` comment. Frontend-coder.
3. `src/app/(app)/vorgaenge/umzug/run/page.tsx:272` — `as unknown as` shim for `getBehoerden`. Frontend-coder.
4. `src/app/(app)/vorgaenge/umzug/[id]/page.tsx:86` — `as unknown as` shim for `getBehoerden`. Frontend-coder.
5. `src/lib/mock-backend/api.ts:477` — unused-vars lint warning blocks `eslint --max-warnings=0`. Mock-backend-coder.

## Approval nits (non-blocking, fix when convenient)

1. §6 spec field-name drift — `stichtag_iso` / `block_b_consent` in spec vs `stichtag` / `consents` in `UmzugInput`; tool schema bridges. Update spec §6 prose next pass. (product-architect)
2. `src/components/umzug/WohnungsgeberUpload.tsx:89` — dead `{isDemo ? '' : ''}` ternary. (frontend-coder)
3. `src/components/layout/Footer.tsx:15` — `aria-label="Footer"` hardcoded; move to i18n. (frontend-coder)
4. `src/components/umzug/AutopilotStepRow.tsx:110` — `<span className="sr-only">Status: </span>` hardcoded. (frontend-coder)
5. `src/app/(app)/vorgaenge/umzug/run/page.tsx:61, 116, 126` — `'Fehler'` literal fallback. Use a `common.error.generic` key. (frontend-coder)
6. `src/lib/mock-backend/seed.ts:45–50` — six JSON-import `as unknown as` casts. Refactor to typed imports + `zod parse`. (mock-backend-coder)
7. Touch targets — bump primary CTA `<Button>` height to `h-10` before public Loom recording. (frontend-coder)
8. README — document the metadata-only Wohnungsgeber upload posture. (frontend-coder)
9. §8 i18n table — extend to cover `cancel_dialog.*`, `vorgang_label`, `common.frist_detail.*`, additional `start.error.*` and `wohnungsgeber.*` keys that ship in this build. (product-architect)
10. `src/lib/ai/tools.ts:83` and `src/types/umzug.ts:16` — align field name (`stichtag_iso` vs `stichtag`) when next touching either. (assistant-engineer, mock-backend-coder)

## Recommendation

**REVISE.** Frontend-coder addresses blockers #1–#4 (drop three shim usages + delete one stale comment, ~6 line edits). Mock-backend-coder addresses blocker #5 (single line). After the lint warning clears and `as unknown as` cast count for `getBehoerden` drops to zero, re-request review — the rest of the build (autopilot, i18n parity, a11y, prompt-cache, security posture) is already in good shape and should clear in the next pass without further changes.

## Re-review verdict (2026-05-08)

**APPROVE.** All five prior-pass blockers are resolved; tooling and anti-pattern greps are clean. Spec frontmatter flipped `status: spec` → `status: shipped`.

### Resolved blockers

1. ✅ `src/app/(app)/vorgaenge/umzug/preview/page.tsx:148` — stale `{/* When mock-backend lands … */}` comment removed (prior position now contains the live `<BehoerdenLoader>` JSX).
2. ✅ `src/app/(app)/vorgaenge/umzug/preview/page.tsx:164` — `as unknown as { getBehoerden?: … }` shim replaced with direct `await api.getBehoerden()` inside the `<BehoerdenLoader>` `useEffect`.
3. ✅ `src/app/(app)/vorgaenge/umzug/run/page.tsx:272` — same shim removed; direct `await api.getBehoerden()` call.
4. ✅ `src/app/(app)/vorgaenge/umzug/[id]/page.tsx:86` — same shim removed; direct `await api.getBehoerden()` call inside `try`-block (graceful `[]` fallback preserved).
5. ✅ `src/lib/mock-backend/api.ts:477` — `previewUmzug: (input) => withLatency(() => buildUmzugPreview(loadProfile(), input))` resolves the unused-vars warning by taking Option A: `buildUmzugPreview` now accepts an optional `Pick<UmzugInput, 'neue_adresse' | 'stichtag'>` and threads `{plz} {ort}` + `zum DD.MM.YYYY` into Block-A `aktion` strings, sets `persona_flag` on Block-D drafts and `requires_consent: true` on Block-B drafts. `buildUmzugPreview` return type is now `UmzugPreview` directly, so the `as UmzugPreview` cast at the call site is also gone.

### Verification commands

- `npx tsc --noEmit` — exit 0.
- `npx eslint src/ --max-warnings=0` — exit 0.
- `Grep "as unknown as" src/app/(app)/vorgaenge/umzug/` — zero hits.
- `Grep "bussgeld_frist_modal" src/` outside `FristDetailModal.tsx` — only i18n locale data files (acceptable: data layer, not consumer code). Single consumer remains `src/components/shared/FristDetailModal.tsx:53`.
- `Grep "localStorage" src/` outside `persistence.ts` — only `latency.ts:30` (mock-backend-internal `meta` read, accepted in prior pass), `seed.ts:5`/`schemas.ts:2` (comments only). Component layer is clean.
- `Grep "console.log" src/` — zero hits.
- `Grep "ANTHROPIC_API_KEY" src/` outside `client.ts` — zero hits.

### New-change regression check

- **DE-string leak risk on Block-A `aktion` suffixes** — `aktion` is typed as `string` on `AutopilotStep` (`src/types/vorgang.ts:24`) and `AutopilotStepDraft` (`src/types/umzug.ts:30`); spec §6 treats it as ground-truth Behörden-content (alongside `rechtsgrundlage` strings such as `§ 17 BMG`), not UI chrome. Conformant with the project's i18n contract — German content here is the data, the UI labels around it (block headers, status badges) remain `t()`-driven. **No regression.**
- **`persona_flag` field consumption** — exported from `src/types/umzug.ts:36` (typed `string` rather than the narrower `'kfz_halter' | 'kindergeld_bezug' | 'aufenthaltstitel'` union — small NIT, see below). Populated by `buildUmzugPreview` at `src/lib/mock-backend/autopilot/umzug.ts:550` from `BLOCK_D[*].personaFlag`. Currently surfaced in the preview payload but not read by frontend components yet; that's expected — the field is forward-looking and unblocks the future "explain why this Block-D step appears" UI without changing today's render. **No regression.**
- **`requires_consent: true` on Block-B drafts** — `src/lib/mock-backend/autopilot/umzug.ts:514` matches the existing `AutopilotStep.requires_consent` boolean on the persisted output (see `vorgang.ts:35`); no schema drift. **No regression.**

### Remaining nits (non-blocking, deferred — unchanged from prior pass)

All 10 NITs from the prior verdict carry forward unchanged (spec §6 field-name drift, `WohnungsgeberUpload.tsx:89` dead ternary, `Footer.tsx:15` `aria-label`, `AutopilotStepRow.tsx:110` sr-only literal, `run/page.tsx` `'Fehler'` fallbacks, `seed.ts:45–50` JSON cast cluster, touch-target heights, README upload posture, §8 i18n table extension, `stichtag` ↔ `stichtag_iso` field-name alignment in `tools.ts`). One additional minor NIT introduced by the REVISE pass:

11. `src/types/umzug.ts:36` — `persona_flag?: string` could be narrowed to `persona_flag?: 'kfz_halter' | 'kindergeld_bezug' | 'aufenthaltstitel'` to align with `Persona` boolean field names and prevent typos at construction sites. (mock-backend-coder, defer.)

### Status flip

`docs/specs/umzug.md` frontmatter: `status: spec` → `status: shipped`. Final-code-review one-liner appended in the spec's `## Final code review` section.
