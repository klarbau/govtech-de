---
feature: posteingang-v1.5
date: 2026-05-09
reviewer: code-reviewer
verdict: APPROVE
prior_review: docs/reviews/2026-05-09-posteingang-v1.5-code.md (REVISE)
spec: docs/specs/posteingang-v1.5.md
domain: docs/domain/posteingang-v1.5-template-bodies.md (locked 2026-05-09)
baseline:
  typecheck: green (exit 0)
  lint: green (No ESLint warnings or errors)
  vitest: 126/126 PASS (aktenzeichen 97 + reply-templates 18 + reply-roundtrip 11)
---

# Code review re-check — Posteingang V1.5 fix-wave

**Verdict: APPROVE** — V1.5 code-side is shippable. Outstanding gate: a11y-tester re-audit.

## Previous blocker re-attest

| # | Blocker | Status | Evidence |
|---|---|---|---|
| 1 | `ReplySheet.tsx:317` `window.confirm()` | **resolved** | New `<ReplyTemplateSwitchConfirmDialog>` rendered at `src/components/posteingang/ReplySheet.tsx:823-834`, driven by `templateSwitchTarget` state. Component at `src/components/posteingang/ReplyTemplateSwitchConfirmDialog.tsx:48-64` surfaces all 4 i18n keys (title/body/cta_yes/cta_no). `aria-modal="true"` at L41; `<AlertDialog.Close>` for ESC + Cancel handler at L55-61; `useStripBaseUiFocusGuardAriaHidden(open)` at L30. Keys verified present in 6 locales. Only remaining `window.confirm` reference in the file is a JSDoc comment (L20) — non-executable. |
| 2 | `ReplyConfirmationView.tsx:131-133` hardcoded `Empfänger:` sr-only span | **resolved** | File now 137 lines; the sr-only span gone. Receipt prose at L45-48 derives from `t('full_receipt_template', { kanal_speculative_2027_text: t('kanal_speculative_2027_text'), empfaenger_behoerde })`. Timestamp at L38-43 uses `formatDateDe(reply.sent_at)` + `formatTimeDe(reply.sent_at)` + `t('sent_at_template', { datum, uhrzeit })`. Zero `reply.receipt_text` reads remain. |
| 3 | `api.ts:1395` hardcoded German `receiptText` storage | **resolved** | `src/lib/mock-backend/api.ts:1397-1421` — `receiptText` const deleted; rationale comment at L1400-1405 cites Domain §7. The persisted `Reply` carries no `receipt_text` field. `saveReplyDraft` at L1265 also stops writing the field. Activity-log entry preserved with `note: 'template:<id>;kanal:<kanal>'` at L1444-1446 (Datenschutz-Cockpit V2 read-side intact). |
| 4 | `ReplySheet.tsx:295-300` missing `<Select>` for `nachweis_bezeichnung` | **resolved** | `ReplySheet.tsx:656-693` renders an unconditional `<Select>` for `nachweis_einreichen`, populated from `nachweisBezeichnungen` (`src/lib/mock-backend/reply-templates.ts:104-118`). Selection invokes `onNachweisChange` (L362-366) → `loadTemplateBody('nachweis_einreichen', null, value)` (L341-343) → `api.resolveReplyBody({ ..., userInput: { nachweis_bezeichnung: nachweisNext } })` (L319-321). Resolver substitutes `[Nachweis-Bezeichnung]` placeholder via `userInputOrPlaceholder` at `reply-templates.ts:480-481`. End-to-end RDG-Drift-Schutz preserved. |

## Previous nit status

| # | Nit | Status |
|---|---|---|
| 1 | 5 WHAT-comments in `ReplySheet.tsx` | resolved — file rewritten; no WHAT-comments at L124/132/180/200/283 |
| 2 | duplicate local `TemplateChoice` union | resolved at component boundary — `ReplySheet.tsx:29` aliases via `type ReplyTemplateId as TemplateChoice`. Two same-named `ReplyTemplateId` types still exist across `letter.ts:277-281` (4-arm storage shape) and `reply-templates.ts:69-74` (5-arm resolver-input shape) — deliberate boundary distinction, deferred |
| 3 | `as unknown as` casts | deferred — same two locations (`reply-templates.ts:130`, `api.ts:219`); both module-internal |
| 4 | `extractTerminVorgeschlagen` heuristic | deferred — outside fix-wave scope |
| 5 | `PreInsertionModal.tsx:23` TODO without ticket | deferred — spec §11.3 pre-approves the stub |
| 6 | `ActiveFilterChips.tsx` redundant span+hook | resolved — file at 73 lines; single `<h2 id="active-filter-heading" sr-only>` at L40-42; both `tFilter` and `tInbox` referenced |
| 7 | `de.json:600 template_loading` DE-only, unused | deferred — frontend-coder build-log cites parallel-agent territory; punt to next i18n pass |
| 8 | AR `versand_modal.body` § preservation | resolved — `ar.json:622` reads `§§ 185, 241 StGB (الإهانة، التهديد)` verbatim with parenthetical Arabic gloss, per Domain §10.2 |
| 9 | `Reply.kanal: string \| null` discriminated union | deferred — V2 territory |

## Targeted re-review checklist

1. **All four blockers genuinely resolved** — yes; see table above.

2. **`useStripBaseUiFocusGuardAriaHidden` audit** (`src/components/ui/use-strip-base-ui-focus-guard-aria-hidden.ts`):
   - SSR-safe (L23 `if (typeof document === 'undefined') return`).
   - Observer disconnects on unmount (L43 `return () => observer.disconnect()`).
   - Targets only `[data-base-ui-focus-guard][aria-hidden="true"]` (L26-28); `attributeFilter: ['aria-hidden', 'data-base-ui-focus-guard']` (L41) keeps observer narrow.
   - Active-gating at L22 `if (!active) return`.
   - JSDoc at L5-19 has 10+ lines of WHY-rationale citing the V1.5 a11y audit Issue #3 and that `@base-ui/react@1.4.1` is verified-latest. TODO(post-V1.5) tagged.
   - Anti-pattern check ("no fallbacks for scenarios that can't happen"): this is a workaround for an *active* upstream bug — not a defensive hypothetical. CLAUDE.md compliant.

3. **`Reply.receipt_text` deprecated-but-present pattern**:
   - `letter.ts:364-374` carries `@deprecated Seit V1.5.1 entfernt …` JSDoc with full rationale.
   - `schemas.ts:411-422` JSDoc + L440-444 field comment both mark deprecated.
   - Build-log at `docs/specs/posteingang-v1.5.md:1406-1436` documents the optional+deprecated decision and planned hard-removal follow-up.
   - vitest test 5 of reply-roundtrip explicitly asserts `expect(sent.receipt_text).toBeUndefined()`. Storage proof.
   - Acceptable.

4. **Domain §7 `{kanal}` → `{kanal_speculative_2027_text}` rename — collision check**:
   - All 6 locales carry both new keys at `posteingang.compose.confirmation.full_receipt_template` and `…kanal_speculative_2027_text`.
   - Resolver in `reply-templates.ts` has zero `{kanal}` placeholder occurrences (grep clean) — uses different token names for the per-Behörde channel string. No collision.

5. **Cleanup correctness**: 5 WHAT-comments removed; duplicate local `TemplateChoice` aliased via import; `ActiveFilterChips` redundant span+hook gone. typecheck/lint/vitest green.

6. **Spec compliance — V1.5 §11 hard rules + §12 checklist**:

| Hard line | Status |
|---|---|
| §11.1 Pre-Versand-Modal verbatim | PASS |
| §11.2 Body templates ZERO `§` | PASS |
| §11.3 4 templates + freitext, no Skelett | PASS |
| §11.4 No real send | PASS |
| §11.5 No AI polish | PASS |
| §11.7 5 reply_* events with Rechtsgrundlage | PASS |
| §11.8 `[MOCK]` watermark | PASS — now structural in i18n template across 6 locales (was accidental in V1.5.0; deliberate in V1.5.1) |
| §11.9 No "Neue Nachricht" CTA | PASS (grep clean) |
| §11.10 Speculative-2027 framing | PASS (verbatim "antrags-thread-gebunden auf Basis des ZBP/BundID-Modells" in receipt template DE + 5 translations) |
| §11.12 Reply-textarea LTR-DE | PASS |
| §12 line 1190 Datenschutz-Cockpit consumes reply_* | DEFERRED (cockpit V2; activity-log writes correct) |
| §12 line 1210 Lighthouse a11y > 95 | **DEFERRED to a11y-tester re-audit** — all coded fixes verified in place: file-input `aria-label`, AuthentizitaetsBadge sr-only sibling, `aria-modal="true"` everywhere, color-contrast token `text-foreground/85`, focus-guard hook strip across 6 call-sites, sr-only h2, Playwright Tab-trap test |

7. **New findings (NITs only)**:
   - `ReplySheet.tsx:658-664` TODO(post-V1.5) for dedicated `nachweis_einreichen.bezeichnung_label` / `_placeholder` i18n keys. Has rationale (parallel-agent territory). Not blocker.
   - `useStripBaseUiFocusGuardAriaHidden(true)` literal in `dialog.tsx:51` and `sheet.tsx:69` instead of `open`-prop gating. Acceptable; tightening would mirror sibling call-sites. Not blocker.
   - Build-log at `docs/specs/posteingang-v1.5.md:1430-1432` flags two file:line locations as awaiting frontend-coder; frontend-coder cleared both — flag is now stale. Consider strike-through.

## Security review

- No `dangerouslySetInnerHTML` introduced. No XSS. No API key exposure. No localStorage access outside `lib/mock-backend/persistence.ts`. Activity-log stores `template:<id>;kanal:<kanal>` only — no Bürger:innen-Body-Inhalt verbatim. Privacy-by-design preserved.

## Convention adherence

- File placement, imports via `@/`, Server Components by default, mock-backend access via `api.*` only, no new dependencies, naming consistent with siblings.
- i18n discipline restored — three new keys in 6 locales; AR §§ preservation fixed.

## Approval blockers

None.

## Recommendation

- **Verdict**: APPROVE for code-side V1.5.1 fix wave.
- **Spec status**: advance V1.5.0 from `spec` → `shipped` once a11y-tester posts a re-audit confirming the prior FAIL is lifted.
- **Next step**: route to a11y-tester for V1.5 re-audit (spec floor: Lighthouse a11y ≥ 95, axe 0 critical / 0 serious). Code side is approved.
- **No further code review pass needed** unless the a11y re-audit surfaces a new blocker.
