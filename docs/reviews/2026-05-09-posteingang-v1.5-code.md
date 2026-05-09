---
feature: posteingang-v1.5
date: 2026-05-09
reviewer: code-reviewer
verdict: REVISE
spec: docs/specs/posteingang-v1.5.md
domain: docs/domain/posteingang-v1.5-template-bodies.md (locked 2026-05-09)
build_logs_reviewed:
  - frontend-coder: 2026-05-09 (ReplySheet + 13 sibling components)
  - mock-backend-coder: 2026-05-09 (api.ts reply methods + reply-templates.ts + schemas.ts + letters.json + behoerden.json)
  - i18n-localizer: 2026-05-09 (de.json source + 5 translations + curly-quote repair)
a11y_report: NONE FOUND for V1.5 (only V1: docs/a11y-reports/posteingang-2026-05-09-recheck.md)
baseline:
  typecheck: green
  lint: green
  vitest: 126/126 green (incl. 18/18 reply-templates.test.ts + 11/11 reply-roundtrip.test.ts)
---

## Verdict

**REVISE** — backend resolver is correct against the locked Domain bodies and the RDG hard line is honoured (zero `§` in body strings; ICU `select` parser handles missing/invalid mode → `other` fallback). Type discipline is clean and tests are comprehensive. Blockers are concentrated at the **rendering surface**: hardcoded German user-visible strings that bypass `t()`, a `window.confirm()` that bypasses the i18n template-switch dialog keys, the missing `<Select>` for `nachweis_bezeichnung`, and the absence of any V1.5 a11y audit. Each is a CLAUDE.md anti-pattern and at least one (the receipt text) directly violates the i18n discipline that the rest of the feature carefully observes.

## Spec compliance (V1.5 §11 hard rules + §12 checklist)

- [x] §11.1 Pre-Versand-Modal Wortlaut verbatim — `de.json:638` matches Verifier-locked text.
- [x] §11.2 Body-Templates ZERO `§` references — all 4 bodies in `de.json:568,573,578,583` clean; only allowed `§` occurrences are in the locked Pre-Versand modal body and in `disclaimer_pre_insertion` legal-name *prose* (Klartext, not §-citation).
- [x] §11.3 Templates V1.5.0: 4 + freitext + `<PreInsertionModal>` stub returning `null` for V1.5.1 reservation.
- [x] §11.4 No real send — confirmed (only localStorage + UI confirmation).
- [x] §11.5 No AI polish — feature flag absent from compose flow, no LLM call from `<ReplySheet>`.
- [x] §11.7 All 5 `reply_*` activity-log entries carry `Rechtsgrundlage: 'Art. 6 Abs. 1 lit. a DSGVO Einwilligung'` — verified at `api.ts:1290,1304,1313,1340`.
- [x] §11.8 `[MOCK]` watermark in receipt + Aktenzeichen — confirmed (`api.ts:1395` body contains `[MOCK – …]`; new letter Aktenzeichen `[MOCK] B-E-04711/2026`).
- [x] §11.9 No "Neue Nachricht an Behörde" CTA anywhere — `grep -r 'Neue Nachricht\|new_message\|neue_nachricht'` returns 0 hits in `src/`.
- [x] §11.10 Speculative-2027 framing verbatim — `outbound_speculative` key at `de.json:528` matches.
- [x] §11.12 Reply-textarea is `dir="ltr" lang="de"` always — `ReplySheet.tsx:625-626`.
- [x] §12 line 1186 — zod activity-log enum extended with 5 values; compile-time `_AssertEq`-Drift-Guard at `schemas.ts:259-262` holds.
- [x] §12 line 1188 — `reply_template_inserted.note: "template:<id>"` shape preserved; no per-template enum explosion (`api.ts:1305`).
- [x] §12 line 1194 — `<BehoerdenKategorieFilterSidebar>` deleted from filesystem.
- [x] §12 line 1202 — new mock letter + `standesamt-berlin-mitte` Behörde (`letters.json:500`, `behoerden.json:241`).
- [x] §12 line 1211 — `body_template_de` strings DE-only (verified script: 0 occurrences in en/ru/uk/ar/tr).
- [x] §12 line 1213 — `aktenzeichen-format.test.ts` extended; 97 tests green.
- [ ] §12 line 1190 — Datenschutz-Cockpit zeigt `reply_*`-Events. Cockpit is still a `<PlaceholderSection>` at `src/app/(app)/datenschutz/page.tsx`. Activity-log writes happen and validate, so consumption is purely a future read; not blocking V1.5 because the cockpit is V2-territory.
- [ ] §12 line 1210 — Lighthouse a11y > 95. **No V1.5 a11y report exists** (`docs/a11y-reports/` only has V1 entries). Per "A11y FAIL = code REVISE": absent audit on new components is treated as not-yet-passed.

## Issues by file

### `src/components/posteingang/ReplySheet.tsx`

- **L317** [BLOCKER] `window.confirm(t('template_switch_confirm_body'))` bypasses the i18n keys `template_switch_confirm_title`, `template_switch_confirm_cta_yes`, `template_switch_confirm_cta_no` (defined in `de.json:608-611` for exactly this purpose). Native `window.confirm` (a) renders an OS-level dialog whose chrome is browser-locale, not app-locale; (b) shows only `body`, dropping the `title`; (c) shows only browser-default OK/Cancel labels, dropping `cta_yes/no`; (d) is synchronously blocking, which axe-core flags on `dialog` patterns. **Suggested fix**: render an `<AlertDialog>` (mirror `<ReplyDiscardConfirmDialog>`) that surfaces all four i18n keys and resolves a `Promise<boolean>`. Anti-pattern: "Imperative DOM access … when React state suffices" + "Hardcoded user-visible string (not via `t()`)".
- **L295-300** [BLOCKER] `api.resolveReplyBody({ personaId, letterId, templateId, mode })` is **never called with `userInput`**. The resolver therefore always renders bracketed German placeholders (`[gewünschte neue Frist]`, `[kurze Begründung]`, `[Nachweis-Bezeichnung]`, `[Ihre Rückmeldung]`, `[gewünschter Alternativtermin]`) and the citizen is expected to manually find-and-replace these inside the textarea. Spec §1399 + Domain §10.3 + §8 explicitly mandate a `<Select>` UI for `nachweis_bezeichnung` ("UI rendert als `<Select>` (nicht freier Input)") — the controlled list is exported from `reply-templates.ts:104-118` precisely for this and is unused in `src/components/`. The `<Select>` was specified to *prevent* free-text RDG drift; the textarea-only fallback regresses that protective layer. **Suggested fix**: in the `nachweis_einreichen` branch, render a `<Select>` populated from `nachweisBezeichnungen`, store the selection in component state, and pass it as `userInput.nachweis_bezeichnung` to `resolveReplyBody`. The other four fields can stay as bracketed-edit-in-textarea UX for V1.5.0, but the controlled list one must not.
- **L41** [NIT] `type TemplateChoice = ReplyTemplateId | 'freitext'` duplicates the same shape that `reply-templates.ts:69-74` exports as `ReplyTemplateId`. Two diverging types of the same union (`Reply.template_id` is `ReplyTemplateId | null`, resolver's `ReplyTemplateId` includes `'freitext'`). Consider unifying.
- **L124, L132, L180, L200, L283** [NIT] WHAT-comments (`// RelTime-Tick`, `// Profile + ggf. existing draft beim Öffnen laden.`, `// Reset on close.`, `// Debounced auto-save: 2s nach …`, `// Profile-Load noch nicht durch — defer`). Per CLAUDE.md "code with good identifiers needs no comments. Flag every comment that explains WHAT (not WHY)."

### `src/components/posteingang/ReplyConfirmationView.tsx`

- **L131-133** [BLOCKER] Hardcoded German string `Empfänger: {empfaengerBehoerde}` in an `sr-only` span. Anti-pattern: "Hardcoded user-visible string (not via `t()`)". **Suggested fix**: add `posteingang.compose.confirmation.empfaenger_label_template` to all 6 locales (or reuse `recipient_label_template` which already exists in compose namespace) and call `t(...)`. Note also that the `<header>` block at L50-66 (with `aria-labelledby="reply-confirmation-heading"`) and the metadata `<dl>` at L68-104 already convey recipient context — the span may simply be removable.
- **L130** [NIT] WHAT-comment `{/* Hidden recipient/empfaenger label for SR-clarity. */}` — the label is redundant per the point above.

### `src/lib/mock-backend/api.ts`

- **L1395** [BLOCKER] `const receiptText = \`Versand simuliert über ${kanal} am ${now}. [MOCK – Verwaltungsdemo, keine echte Übermittlung]\`;` — hardcoded German user-visible string, persisted into `Reply.receipt_text`, then rendered raw at `ReplyConfirmationView.tsx:107` (`{reply.receipt_text ?? ''}`). For non-DE UI locales, the citizen sees a German receipt embedded in an otherwise-translated confirmation view. CLAUDE.md: "Strings: never hardcoded. Always via `t('key.path')` from `next-intl`." Domain §7 anchor specifies the verbatim wording as `posteingang.reply.confirmation.full_receipt_template` ("[MOCK] Ihre Antwort wurde simuliert versendet. In einem realen 2027-Szenario würde sie {kanal} an {empfaenger_behoerde} übermittelt — antrags-thread-gebunden auf Basis des ZBP/BundID-Modells.") — neither the key nor the wording landed in `de.json`. **Suggested fix**: add Domain §7's two keys (`full_receipt_template`, `kanal_speculative_2027_text`) to all 6 locales; have the backend store *raw kanal + sent_at + letterId* and let `<ReplyConfirmationView>` interpolate via `t()` at render time. Bonus: the raw `${now}` ISO timestamp is shown literally to users; format with a German-civilian helper (`formatDateDe` + `HH:mm 'Uhr'`).
- **L219** [NIT] `letterRepliesMapSchema as unknown as import('zod').ZodType<LetterReplyMap>` — accumulates with `reply-templates.ts:130` as another `as unknown as` cast. Defensible individually; consider a single shared type alias.

### `src/lib/mock-backend/reply-templates.ts`

- **L130-138** [NIT] `as unknown as { posteingang?: { compose?: { templates?: Record<string, DeTemplateBlock>; }; }; }` — defensible (JSON-import literal type doesn't match the loose record we want to read). Lift to a module-level `DeLocaleShape` interface and cast once.
- **L218-225** [NIT] `extractTerminVorgeschlagen` heuristic ("prefer match with `:`, else `matches[1]`, else `matches[0]`") works for the single Anna-Standesamt anchor, but the `matches.length >= 5` early break is dead defensive code (no plausible Letter has 5 dates) and the "second match" assumption is brittle. The current resolver test only exercises the Anna letter; either widen the test or simplify to "first regex match with a time component, else first match".
- **L322-336** [INFO] `pickSelectBranch` correctly maps `mode === undefined` and an invalid `mode` string to `other` (Domain §4 conservative fallback). Verified by tests `mode missing` + `mode is invalid string`.
- **L24, L57-61, L353-365** [INFO] `console.warn` / `console.error` paths are dev-guarded or true error reporters. CLAUDE.md anti-pattern table only flags `console.log`; these are acceptable.

### `src/components/posteingang/PreInsertionModal.tsx`

- **L23-24** [NIT] `// TODO(V1.5.1): …` lacks owner + ticket reference per CLAUDE.md anti-pattern. The spec pre-approves this stub (§11.3 + §1178), so it is below the bar for a blocker.

### `src/components/posteingang/ActiveFilterChips.tsx`

- **L29, L72-75** [NIT] `const t = useTranslations('posteingang')` is declared at L29 but used only at L74 for an `sr-only` span that duplicates the `<h2 id="active-filter-heading">` at L41. The h2 already labels the region via `aria-labelledby="active-filter-heading"`. The second `sr-only` span is redundant. **Suggested fix**: drop L72-75 and the L29 hook; keep only the labelled `<h2>` heading.

### `src/lib/i18n/locales/de.json`

- **L600** [NIT] `posteingang.compose.template_loading: "Vorlage wird geladen …"` is defined in DE only (missing in en/ru/uk/ar/tr — verified by parity script) and never referenced anywhere in `src/`. Either wire it on `templatePending` state or delete it. Anti-pattern: "Component with no usage anywhere" (analogous for keys).

### `src/lib/i18n/locales/ar.json`

- **versand_modal.body** [NIT] Renders `المادتان 185 و 241 — StGB` instead of preserving the `§§ 185, 241 StGB` symbol-set. Domain §10.2 explicitly mandates: "bei Lokalisierung als-ist beibehalten (deutsche Gesetzes-Norm-Zitate sind in jeder Sprache so zu zitieren); ergänzend kann ein Klammerzusatz „(Beleidigung, Bedrohung)" in der Zielsprache hinzugefügt werden." The Arabic translation replaces `§§` instead of supplementing it. EN/RU/UK/TR all preserve `§§` correctly. **Suggested fix**: re-translate AR to keep `§§ 185, 241 StGB` token verbatim, optionally adding `(الإهانة، التهديد)` as parenthetical gloss; if uncertain, escalate to domain-expert per Domain §10.2 "bei Zweifeln zurück zur Domain für Re-Verifizierung".

### `src/lib/mock-backend/schemas.ts`

- **L411-465** [INFO] `replySchema.superRefine` enforces `template_id === 'termin_antwort' ⇔ mode set` and `status === 'sent_simulated' ⇒ all three of sent_at/kanal/receipt_text set`. Good discriminated-union enforcement.

### `src/types/letter.ts`

- **L276-280 vs `reply-templates.ts:69-74`** [NIT] Two diverging `ReplyTemplateId` definitions in adjacent modules: `letter.ts` excludes `'freitext'` (treated as `null`); `reply-templates.ts` includes `'freitext'`. The resolver-input boundary is the only place this matters, but having two same-named types is the kind of friction that bites V2 maintainers. Either rename the resolver's union (e.g. `ResolveReplyTemplateChoice`) or unify on a single source.

## Hard-line audit (V1.5 §11)

| Hard line | Status | Evidence |
|---|---|---|
| Pre-Versand-Modal verbatim | PASS | `de.json:638` matches Domain §6 verbatim |
| Body templates ZERO `§` | PASS | `grep §` in `de.json:568,573,578,583,594` returns 0; all 4 bodies match Domain §1–§4 verbatim |
| 4 templates + freitext, no Skelett | PASS | `replyTemplateIdSchema` enum lists exactly the 4; freitext rendered as `template_id: null` |
| No real send | PASS | `sendReplySimulated` only writes the `letter-replies` localStorage bucket |
| No AI polish | PASS | No `feature.replyAIPolish` reference in compose path; no LLM call from `<ReplySheet>` |
| Activity-log Rechtsgrundlage on all 5 events | PASS | `api.ts:1290,1304,1313,1340` + `1429-1438` |
| `[MOCK]` watermark | PARTIAL | Receipt body has `[MOCK – Verwaltungsdemo, keine echte Übermittlung]`; new letter Aktenzeichen `[MOCK] B-E-04711/2026`. But the receipt is hardcoded German (api.ts:1395 blocker) — watermark survives translation only by accident |
| No "Neue Nachricht" CTA | PASS | `grep` clean across `src/` |
| antrags-thread-gebunden framing | PASS | `outbound_speculative` key contains the verbatim phrase in DE + 5 translations |
| Read-Receipt-frei | PASS | No code path emits anything to a Behörde; activity log is local-only |
| Originaltext bleibt DE | PASS | `dir="ltr" lang="de"` on the textarea (`ReplySheet.tsx:625-626`) and on the read-only `<pre>` (L515-516) |

## Security review

- [x] No `dangerouslySetInnerHTML` in any V1.5 component.
- [x] No XSS vectors — body rendered via React text-binding, `<textarea value={...}>`, `<pre>{...}</pre>`. Safe.
- [x] No API key in client bundle.
- [x] No direct `localStorage` from components — all mock-backend access through `api.*`.
- [x] Activity-log entries do not store Bürger:innen-Body-Inhalt verbatim (only `template:<id>` or no `note` field) — privacy-by-design preserved.

## Convention adherence

- [x] File placement: components in `src/components/posteingang/`, lib in `src/lib/mock-backend/`, types in `src/types/letter.ts`.
- [x] Naming: kebab-case files, PascalCase components, camelCase functions.
- [x] Imports use `@/` alias throughout.
- [x] Server Components by default — `'use client'` justified everywhere it appears.
- [ ] **i18n discipline** — three breaches enumerated above (ReplySheet L317, ReplyConfirmationView L132, api.ts L1395).
- [x] Mock-data realism — Standesamt Mitte address (Karl-Marx-Allee 31, 10178 Berlin) genuine; Az `[MOCK] B-E-04711/2026` follows Standesamt convention; `[MOCK]` watermark in body opener.

## Approval blockers

1. **`src/components/posteingang/ReplySheet.tsx:317`** — replace `window.confirm(...)` with an `<AlertDialog>` that uses `template_switch_confirm_title`, `template_switch_confirm_body`, `template_switch_confirm_cta_yes`, `template_switch_confirm_cta_no` from `de.json:608-611`.
2. **`src/components/posteingang/ReplyConfirmationView.tsx:131-133`** — hardcoded `Empfänger: {empfaengerBehoerde}` in `sr-only` span. Move to i18n key, or delete the redundant span.
3. **`src/lib/mock-backend/api.ts:1395`** — hardcoded German `receiptText`. Source the wording from i18n (Domain §7 specifies the exact key + verbatim text). Bonus: drop the raw `${now}` ISO timestamp in favour of `formatDateDe`.
4. **`src/components/posteingang/ReplySheet.tsx:295-300`** — `nachweis_einreichen` template never invokes a `<Select>` over `nachweisBezeichnungen`. Spec §1399 + Domain §10.3 + §8 mandate the controlled-list UI; the const is exported but unused. Wire a `<Select>` for at least the nachweis case.
5. **A11y audit absent** — no `docs/a11y-reports/posteingang-v1.5-*.md` exists. Per code-reviewer hard rule ("A11y FAIL = code REVISE"), an absent audit on new components (`<ReplySheet>`, `<PreVersandModal>`, `<ReplyDiscardConfirmDialog>`, `<FilterPopover>`, `<FilterSheet>`, `<ActiveFilterChips>`, `<StickyFristAction>`, `<RechtlicheHinweiseDetails>`) cannot be treated as PASS. a11y-tester must run the V1.5 axe-suite and Lighthouse before re-review.

## Approval nits (non-blocking; fix when convenient)

1. `ReplySheet.tsx:124, 132, 180, 200, 283` — five WHAT-comments; remove or upgrade to WHY.
2. `ReplySheet.tsx:41` and `letter.ts:276-280` vs `reply-templates.ts:69-74` — two same-named `ReplyTemplateId` unions with different shapes. Unify or rename.
3. `reply-templates.ts:130-138` and `api.ts:219` — two `as unknown as` casts. Defensible individually; consider lifting both to module-level type aliases.
4. `reply-templates.ts:218-225` — `extractTerminVorgeschlagen` heuristic is brittle for any future Termin-letter; either widen the test matrix or collapse to "first match with time component, else first match".
5. `PreInsertionModal.tsx:23` — `TODO(V1.5.1)` lacks owner + ticket per CLAUDE.md anti-pattern; spec pre-approves the stub but the format is sub-conformant.
6. `ActiveFilterChips.tsx:29, 72-75` — redundant `sr-only` span + unused `t` hook; drop both.
7. `de.json:600` — `template_loading` key defined but never used; wire it on `templatePending` or delete. Also missing in 5 non-DE locales (parity break).
8. `ar.json` versand_modal.body — preserve `§§ 185, 241 StGB` verbatim per Domain §10.2; current AR text replaces with `المادتان … StGB`. Either re-localize or escalate to domain-expert.
9. `letter.ts` `Reply.kanal: string | null` — currently free-form string; consider a discriminated union of the 7 mock channels for V2-safe rendering.

## Recommendation

- **Verdict**: REVISE.
- **Owner of blockers**: 1, 2, 4 → frontend-coder; 3 → mock-backend-coder + i18n-localizer; 5 → a11y-tester.
- **Re-review trigger**: after blockers 1-4 land and a11y-tester posts `docs/a11y-reports/posteingang-v1.5-*.md` with PASS, re-request code review. Spec status stays `spec` — do **not** advance to `shipped` until then.

## Notes for the spec maintainer

- Domain §7 (`full_receipt_template`, `kanal_speculative_2027_text`) is referenced in the domain doc but absent from spec §6 lines 480-485. Either spec or implementation needs alignment; recommendation is spec-amendment to mirror Domain §7 verbatim, then implementation follows.
- Spec §12 line 1190 (Datenschutz-Cockpit consumes `reply_*` events) is a forward-promise that depends on the Datenschutz-Cockpit being built. Activity-log writes are correct and validate; mark this checklist item as deferred-to-cockpit-feature rather than as a V1.5.0 deliverable, to avoid false-fail in this review.
