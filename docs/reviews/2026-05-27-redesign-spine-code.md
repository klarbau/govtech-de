---
feature: redesign-spine (dashboard + assistent + posteingang + vorgaenge)
date: 2026-05-27
reviewer: code-reviewer
track: spine
verdict: REVISE (1 blocker, dashboard) -- assistent/posteingang/vorgaenge APPROVE
build_logs_reviewed:
  - mock-backend-coder (dashboard): 2026-05-27
  - assistant-engineer (assistent + dashboard AI path): 2026-05-27
  - frontend-coder (all four screens): 2026-05-27
  - i18n-localizer: 2026-05-27
a11y_reports:
  - docs/a11y-reports/redesign-dashboard-2026-05-27.md (PASS)
  - assistent: PASS with one moderate non-blocking nit (ChatComposer attach button)
  - posteingang + umzug: existing suites green (no regression)
gates:
  - tsc --noEmit: PASS (exit 0)
  - next lint --dir src: PASS (1 pre-existing out-of-scope warning: stammdaten/api.ts:39)
  - vitest run: 639/639 PASS
  - i18n: JSON.parse 6/6 OK; full parity assistent(64)/dashboard(47)/vorgaenge(40) + posteingang reader(5) across 6 locales
  - AI gate smoke (__smoke__.ts): 38/38 PASS incl. requiresConfirmation true ONLY for starte_umzug
---

## Verdict

- Dashboard -- REVISE (1 blocker: retry button shows the error sentence as its own label).
- Assistent (HERO) -- APPROVE. Irreversible starte_umzug write is structurally gated; prompt caching intact; no API key reaches the client; keyless degrades cleanly. One confirmed non-blocking a11y nit (attach button).
- Posteingang re-skin -- APPROVE. Functionality + legal lines preserved; token/layout only.
- Vorgaenge re-skin + Umzug timeline -- APPROVE. Autopilot/eID/event-stream preserved; horizontal stepper a11y-correct.

The batch ships once the single dashboard blocker is fixed. One-line key swap; everything else is NIT-tier.

---

## HERO must-checks (all PASS)

(a) starte_umzug is structurally gated -- cannot fire without the confirm click.
- AssistentView.handleToolUses (src/components/assistent/AssistentView.tsx:281) checks requiresConfirmation(tu.name) FIRST and continues -- the tool is held, never dispatched, and dispatchReadTool is never called for it.
- dispatch-tool.ts:98-166 has NO starte_umzug case in the read dispatcher; default branch errors. The only path to api.startUmzug is dispatchStarteUmzug (dispatch-tool.ts:206), called ONLY from onConfirmUmzug (AssistentView.tsx:416) on the Umzug-starten click.
- Even if the model streams starte_umzug directly, the held block is satisfied with an awaiting_user_confirmation tool_result (AssistentView.tsx:342-351) and the loop does NOT continue (AssistentView.tsx:361). requiresConfirmation is true only for starte_umzug (tool-schemas.ts:242 + smoke test). Structural gate, not prompt-only. PASS.

(b) Prompt caching stays enabled. route.ts:131-142 sets cache_control ephemeral on both system blocks; dashboard-prioritize.ts:214-220 the same. preview_umzug invalidates the cache once (accepted per spec 7.2). PASS.

(c) No API key reaches a client component. getAnthropicClient/ANTHROPIC_API_KEY/process.env appear in NO client component. Key read lazily server-side only in client.ts, consumed by two Node-runtime routes. The unused client bridge dashboard-prioritize-client.ts value-imports only deterministicRank and is never imported anywhere, so it never enters a bundle. PASS.

(d) Offline/keyless degrades without crashing. route.ts maps a missing key to a clean 500 assistant_unavailable (no stack/key leak); refusal turns stream static safety copy with NO Anthropic call; chat UI shows assistent.error.stream + partial bubble (AssistentView.tsx:250-259). Dashboard AI path falls back to deterministicRank (HTTP 200). PASS.

---

## Issues by screen/file

### Dashboard

#### src/components/dashboard/DashboardView.tsx
- L113 [REVISE -- BLOCKER] The error-card retry Button label is t(error.load) = "Das Dashboard konnte nicht geladen werden." -- the error SENTENCE is reused as the button text. L111 already shows that sentence, so the button duplicates the error rather than offering a retry. Per spec 9 the retry must reuse common.cta.erneut_versuchen ("Erneut versuchen"). Fix: add tCommon = useTranslations(common); set the button label to tCommon(cta.erneut_versuchen); keep t(error.load) only on the message line.

Everything else on the dashboard is clean: RSC-first wrapper, sortItems deterministic, setLastSeen write-after-render via ref-guard, single h1 via PageHeader, TopActionRow aria-hides the rank + StatusBadge text labels + tabular-nums, NavTile full-card link with aria-labelledby to h3. a11y PASS (axe 0/0 x 4 locale/theme).

### Assistent (HERO)

#### src/components/assistent/ChatComposer.tsx
- L57-64 [NIT -- confirmed a11y nit, non-blocking] base-ui TooltipTrigger receives disabled + aria-label. A genuinely disabled trigger is removed from the AT tab order, so the tooltip explaining WHY the attach button is disabled (assistent.composer.attach_disabled) is unreachable by keyboard/AT -- same class as the V1.5 base-ui focus-guard bug. CONFIRMED. Non-blocking (button disabled-by-design, V1 OUT per spec 10). Fix: render the disabled paperclip with aria-disabled=true + onClick no-op (stays focusable so the tooltip is reachable), or move the explanation to aria-describedby on an always-focusable element.

#### src/components/assistent/UmzugConfirmCard.tsx
- L129-134 [NIT] When the proposal resolves to started, the card renders t(cta_start) ("Umzug starten") as a static resolved-state label -- reads as if still actionable. Meaning not lost (adjacent ToolCallCard shows tool.umzug_started), buttons correctly removed. Consider a dedicated umzug_confirm.started key.

Otherwise the HERO is excellent: confirm gate structural, consent note cites Art. 6 Abs. 1 lit. a DSGVO + jederzeit widerruflich, Datenminimierung surfaced in KontextRail, BehoerdenBadge colour-free, Block A/B/C/D grouping correct, greeting UI-only (never pushed to apiMessagesRef), streaming + spinner behind useReducedMotion, SR announce coarse-grained, Send >=44px, textarea min-h-48px.

### Posteingang re-skin

- [x] No legal-line changes: git diff LetterReader.tsx shows zero touches to disclaimer/smartlaw/citation/zitat/receipt/rechtsbehelf/einspruch/widerspruch/RDG copy -- token classes only.
- [x] api.ts/tools.ts/reply-templates untouched (api.ts diff is the additive dashboard block; the one getDocuments line is a reformat, function intact at api.ts:1438). ReplySheet.tsx single change is size xs to sm (foundation reconciliation -- xs removed from the button primitive).
- [x] InlineLetterReader.tsx (NEW): EmptyState, focus-to-heading on selection, key letter.id remount, error+retry inline. No hardcoded strings, no any/casts.
- [x] BehoerdenBadge colour-free (HL-DS-10): monogram bg-surface-muted regardless of kategorie.
- [x] 5 new reader keys present in all 6 locales.
- DEFERRED (acceptable): Originaltext-Auszug collapsible not built; existing OriginaltextBlock retained to avoid duplicating scrollToZitat/citation-anchor logic. Keys reserved. Agree -- no functional loss.

### Vorgaenge re-skin + Umzug timeline

#### src/components/vorgaenge/VorgaengeView.tsx
- L189-198 [NIT] The error state renders FilterTabs + an error box with only a link to /vorgaenge/umzug/start labelled tStart(title) -- NO error message and NO real retry (it navigates away). Spec 9 says error -> Retry-Inline. Minor (demo path is loaded/empty, app stays usable). Consider an error sentence + a common.cta.erneut_versuchen button that re-runs the load.

#### src/components/umzug/AutopilotStepRow.tsx + BehoerdenStatusRow.tsx
- AutopilotStepRow.tsx:118 / BehoerdenStatusRow.tsx:78 [NIT -- pre-existing] Hardcoded sr-only "Status: " not via t(). git diff confirms NOT introduced by this token-only re-skin, so out of this batch REVISE scope, but should be migrated to a common.* key in a cleanup pass.

Otherwise the re-skin is correct: ad-hoc colours (sky/emerald/violet/destructive) replaced by foundation IconCircle tones + StatusBadge; HorizontalStepper conveys status via sr-only text (not colour-only), aria-current step on active node, pulse behind useReducedMotion, tabular-nums dates; block A/B/C/D semantics + eID-CTA + event-stream preserved (umzug.spec.ts 18 passed). 639/639 unit green = no autopilot regression.
- DEFERRED (acceptable): Kindergeld Unterlagen-fehlen card needs a seed Vorgang (confirmed absent from seed.ts). Render path built, gated on context.unterlagen_fehlen/self_assigned. Mock-backend-coder followup. Agree.

---

## Security review
- [x] No API key in any client component (grep clean; server-only client.ts is the sole reader).
- [x] No dangerouslySetInnerHTML anywhere in src/. Chat markdown-lite uses React text binding.
- [x] No PII in error responses: route.ts returns generic assistant_unavailable; tool_result error strings go to the model (not UI), no key/stack.
- [x] No localStorage outside the persistence module in reviewed components (all backend access via lib/mock-backend/api.ts; assistent thread is in-memory React state).
- [x] Prompt-injection sealing on the dashboard AI path: candidates fenced as DATA, structured-fields-only (no Brief bodies), Zod-validated + whitelist tokens + id-membership + rank-permutation (dashboard.md Hard-Line 11.44).
- [x] starte_umzug confirm gate is structural, not prompt-dependent.

## Type safety
- [x] No any, ts-ignore, ts-nocheck in any reviewed component or AI module.
- [x] No as-unknown-as in components. Two server-side as-unknown-as Anthropic.TextBlockParam[] (route.ts:149, dashboard-prioritize.ts:225) are the documented SDK-0.32 cache_control wire-vs-type gap with WHY comments -- established narrowly-scoped pattern; alternative is dropping prompt caching (a Hard-Line). Acceptable; consolidate (nit 5).
- [x] Discriminated unions used (InlineLetterReader state, PrioritizeOutcome, validateUmzugToolInput result).

## Convention adherence
- [x] File placement matches CLAUDE.md (components live under src/components/assistent/**, not the spec src/components/assistant/** -- consistent with the assistent.* i18n namespace + route /assistent; harmless, not a defect).
- [x] Naming consistent.
- [x] i18n hierarchical, all via t(), full 6-locale parity (JSON.parse + leaf-key diff).
- [x] Foundation primitives reused; no duplicated filter/card/row primitives.
- [x] RSC-vs-client boundary correct: pages are RSC shells; interactive views are use client.

## Approval blockers
1. Dashboard -- src/components/dashboard/DashboardView.tsx:113 retry button uses t(error.load) (the error sentence) instead of common.cta.erneut_versuchen. Frontend-coder: swap to tCommon(cta.erneut_versuchen), re-request review.

## Approval nits (non-blocking)
1. ChatComposer.tsx:57-64 -- base-ui disabled TooltipTrigger makes attach_disabled tooltip unreachable by AT (confirmed). Use aria-disabled instead of disabled.
2. UmzugConfirmCard.tsx:133 -- resolved-started state reuses cta_start; add an umzug_confirm.started key.
3. VorgaengeView.tsx:189-198 -- error state lacks an error message + real retry; currently only a navigate-away link.
4. AutopilotStepRow.tsx:118 + BehoerdenStatusRow.tsx:78 -- pre-existing hardcoded sr-only "Status: "; migrate to a common.* key.
5. Consolidate the two as-unknown-as Anthropic.TextBlockParam[] cache_control casts into one typed helper.
6. dashboard-prioritize-client.ts built but wired nowhere (intentional one-line hand-off per build log). KI sort uses the deterministic mock-backend stub. Acceptable; wire when promoting the real AI ranking.

## Deferred items (agreed acceptable, do NOT block)
- Posteingang Originaltext-Auszug collapsible (keys reserved; existing OriginaltextBlock retained).
- Vorgaenge Kindergeld Unterlagen-fehlen card needs a seed Vorgang (render path built; mock-backend followup).
- Dashboard diff numbers data-derived (no getLastSeen accessor) + sort-mode not persisted (no get/setDashboardSortMode). Both need mock-backend accessors; tracked in build log.

## Recommendation
- Assistent, Posteingang, Vorgaenge: APPROVE -- set spec status: shipped.
- Dashboard: REVISE -- frontend-coder fixes the one blocker (DashboardView.tsx:113), then re-request; everything else is APPROVE-ready and a11y is a clean PASS.
- Pre-deploy (out of this batch scope, flagged by a11y-tester): the next build /404 Html prerender error blocks next start + Lighthouse-CI. No custom not-found.tsx/global-error.tsx exists in src/app -- investigate before Vercel deploy; not a spine code blocker.
