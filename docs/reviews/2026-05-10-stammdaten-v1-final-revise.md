---
feature: stammdaten-v1
date: 2026-05-10
reviewer: code-reviewer
verdict: APPROVE
review_type: narrow_re_review_post_revise_wave
prior_verdict: REVISE (2026-05-10, same day)
prior_blockers_count: 4
prior_blockers_resolved: 4
build_logs_reviewed:
  - frontend-coder (cast removal + behörden-id rename)
  - mock-backend-coder (new behörden entries + persistence)
  - i18n-localizer (66-key parity propagation)
  - product-architect (spec § 11.4 amendment)
a11y_report: docs/a11y-reports/stammdaten-v1-FINAL.md (carry-over from prior PASS)
---

## Verdict
**APPROVE** — All 4 P0/P1 ship-blockers from prior REVISE pass are resolved and verified by automated checks. Stammdaten V1 is clear to ship.

## Scope of this review
Narrow re-review of the 4 specific REVISE-blockers from `docs/reviews/2026-05-10-stammdaten-v1-revise-final.md`. NOT a full re-audit of Stammdaten V1 (P2 nits and best-practice items are carried as V1.0.1 followups, not blockers).

## Per-blocker verification

### Blocker 1 — i18n parity (66 new keys × 5 non-DE locales) — RESOLVED

Method: structurally diffed the `stammdaten.*` key-tree across all 6 locales via flatten + Set-symmetric-diff in Node.

Result:
- `de.json` `stammdaten.*` → 180 leaf-keys
- `en.json` → 180 leaf-keys, 0 missing-vs-DE, 0 orphans
- `ru.json` → 180 leaf-keys, 0 missing-vs-DE, 0 orphans
- `uk.json` → 180 leaf-keys, 0 missing-vs-DE, 0 orphans
- `ar.json` → 180 leaf-keys, 0 missing-vs-DE, 0 orphans
- `tr.json` → 180 leaf-keys, 0 missing-vs-DE, 0 orphans

13 top-level branches present in every locale: `aktivitaet`, `badge`, `cta`, `disclaimer`, `field`, `field_card`, `hero`, `korrekturweg`, `modal`, `page`, `sektion`, `subtab`, `tab`.

JSON.parse pre-flight (main thread): 6/6 OK (per build log).

PASS.

### Blocker 2 — `as unknown as` casts removed — RESOLVED

Method: `Grep "as unknown as"` and `Grep "as unknown"` recursively in `src/components/stammdaten/`.

Result: 0 matches (both patterns).

Spot-check `api.*` call sites in `src/components/stammdaten/StammdatenView.tsx`:
- L83: `api.getProfile()`
- L84: `api.getBehoerden()`
- L90: `api.getStammdaten(persona.id)`
- L91: `api.getUebermittlungsLog(persona.id, { limit: 50 })`
- L92: `api.getWalletAttestations(persona.id)`
- L190: `api.setReligionSessionConsent(persona.id, true)`
- L214: `api.toggleAuskunftssperre(persona.id, true, begruendung)`
- L219: `api.toggleUebermittlungssperre(...)`
- L244: `api.simulateIbanPush(persona.id, targets)`

All 9 call sites are direct, no casts.

`src/components/stammdaten/WalletSubTab.tsx`:
- L83: `api.getWalletAttestationPreview(...)` — direct, no cast.

Also no `any`, no `@ts-ignore` in `src/components/stammdaten/`.

`npx tsc --noEmit` → 0 errors (verified locally).

PASS.

### Blocker 3 — 4 invalid Behörde-IDs — RESOLVED

`src/data/behoerden.json` (verified line numbers via Read of file):
- L360-378: `bzst` — Bundeszentralamt für Steuern, Bonn 53225, complete shape (id/name_de/kategorie/zustaendige_themen/adresse/online).
- L381-400: `bamf` — Bundesamt für Migration und Flüchtlinge, Nürnberg 90461, complete shape including `auslaenderzentralregister` thema.
- L403-422: `abh-koeln` — Stadt Köln Ausländerbehörde, Walter-Pauli-Ring 2-6, 51103 Köln, complete shape.
- L241: `standesamt-berlin-mitte` — present (canonical id, was already present pre-rename in `StammdatenView.tsx` callers).

`Grep "standesamt-mitte"` in `src/components/stammdaten/` → 0 matches (rename complete).
`Grep "standesamt-mitte|standesamt_mitte"` in `src/` → 1 match in `src/data/behoerden.json:253` — a URL slug inside `portal_url`, NOT an id-reference. Harmless.

PASS.

### Blocker 4 — Spec § 11.4 reload-semantic amendment — RESOLVED (with one P2 nit)

`docs/specs/stammdaten.md`:
- L6: frontmatter `last_amended_at: 2026-05-10` present.
- L1182-1213: § 11.4 Hard-Line section. Final wording:
  - Storage-Layer: `sessionStorage` key `govtech-de:v1:stammdaten:religion-consent-session` (per-Tab-Scope).
  - Verbot: `localStorage` persistence of `consent_session`.
  - Reset-Bedingungen: Tab-Close, Browser-Beendigung, Persona-Switch, explicit `revokeReligionConsent()`.
  - NICHT-Reset: F5/Ctrl+R within same tab — preserves consent (Reibungs-Vermeidung).
  - Privacy-Intent: per-Tab, no cross-tab share, no persistence over Tab/Browser-Close. Audit-trail for show-events + revoke remains in `localStorage` activity-log.
- L1215-1223: implementation footnote citing HTML Living Standard.
- L1844-1901: Amendment Log section appended; touches §§ 4.2, 5.4, 7.1, 11.3, 11.4, 11.5, 13.3, 13.6 documented.

Implementation match check (`src/lib/mock-backend/stammdaten/api.ts`):
- L64: `const SESSION_KEY = 'govtech-de:v1:stammdaten:religion-consent-session';` — matches spec key exactly.
- L67-119: read/write helpers use `sessionStorage` API, In-Memory-Map fallback for Node tests. F5-survival is automatic per Web-Plattform-Definition. PASS.

**P2 nit (NOT a blocker)** — `src/lib/mock-backend/stammdaten/api.ts:59`:
> `// wir sessionStorage (überlebt Tab-Switch, NICHT Reload — Hard-Line § 11.4).`

This comment is **factually wrong**: it says "NICHT Reload" while the amended Hard-Line § 11.4 explicitly defines F5/Ctrl+R as a NICHT-Reset-Bedingung (i.e., reload IS survived). The actual code is correct (sessionStorage survives F5 by Web-Plattform-Definition); only the doc-comment drifted from the pre-amendment spec wording.

Carry as V1.0.1 followup (1-line edit). NOT blocking ship because:
1. Behavior is correct.
2. Nothing in `src/components/stammdaten/` reads or relies on this comment.
3. Spec is the source of truth and was amended; the comment is a stale remnant.

PASS.

## Verification gates

- `npx tsc --noEmit` → 0 errors (re-verified).
- `npx vitest run` → 298/298 PASS, 15 files.
- JSON-parse pre-flight on 6 locales → 6/6 OK (per build log).
- `Grep "as unknown" src/components/stammdaten/` → 0 matches.
- `Grep "standesamt-mitte" src/components/stammdaten/` → 0 matches.

## Final ship recommendation
**Clear to ship.** Stammdaten V1 is ready for spec status flip `spec → shipped` + `shipped_at: 2026-05-10`. Update CLAUDE.md status line accordingly.

## V1.0.1 followups (carry-over, non-blocking)

From this review:
1. **`src/lib/mock-backend/stammdaten/api.ts:59`** — fix stale comment "überlebt Tab-Switch, NICHT Reload" → "überlebt Tab-Switch UND Reload, NICHT Tab-Close" to match Hard-Line § 11.4 final wording. 1-line edit.

Carry-over from prior REVISE pass (P2-NITs):
2. `console.error` left in non-test code path
3. unused `read` import in `lib/mock-backend/api.ts:39`
4. `void label;` discard pattern
5. `'sbgg-3-stufen'` slug normalization
6. AZR-zweck-key spelling
7. ABH-Block-D zweck mis-mapping
8. Persona address mismatch (Mehmet 50825 Köln vs ABH-Köln 51103)
9. Schmidt 1-vs-2 children inconsistency in seed
10. Mock-string collision between two FieldCards
11. `countRegisters` magic number — declarative field-defs preferred
12. Best-practice axe — 5 sektion `<aside>` sharing one `aria-label` (fold-into distinct labels for V1.0.1)

Test-harness:
13. 14 pre-existing test-harness failures documented as task #60 — V1.0.1.

Lifecycle:
14. After V1.5/V1.5.1 followups, finally hard-remove `Reply.receipt_text` (still optional + @deprecated).

## Recommendation
**APPROVE** — main thread should proceed to:
1. Flip `docs/specs/stammdaten.md` frontmatter `status: spec → shipped`, add `shipped_at: 2026-05-10`.
2. Update `CLAUDE.md` status line: `[x] Stammdaten V1 (shipped 2026-05-10: a11y PASS, code review APPROVE after 1 REVISE iteration, vitest 298/298 PASS).`
3. Commit.

V1.0.1 followup-list (14 items) goes into a separate tracking issue / spec-followup section.
