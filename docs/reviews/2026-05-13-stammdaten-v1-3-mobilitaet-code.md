---
feature: stammdaten-v1-3-mobilitaet
date: 2026-05-13
reviewer: code-reviewer
verdict: APPROVE
inputs-reviewed:
  - docs/specs/stammdaten-v1-3-mobilitaet.md (2350 lines, 14 VL + 14 HL)
  - docs/reviews/2026-05-13-fuehrerschein-kfz-verify.md
  - docs/a11y-reports/stammdaten-v1-3-mobilitaet-2026-05-13.md
  - src/components/stammdaten/mobilitaet/** (16 components)
  - src/components/stammdaten/wallet/** (3 components: VisionBanner2031, WalletMdlCard, WalletMdlAttestationPreviewModal)
  - src/components/stammdaten/{StammdatenView,WalletSubTab}.tsx (V1.3 wire-ups)
  - src/types/mobilitaet.ts + persona.ts + mock-event.ts
  - src/lib/mock-backend/schemas.ts (mobilitaetSchema.strict + 4 sub-schemas)
  - src/lib/mock-backend/persistence-migrations.ts (migratePersonaV12ToV13 + stripPunkteField)
  - src/lib/mock-backend/autopilot/umzug.ts (Block-D rewrite)
  - src/lib/mock-backend/stammdaten/v1-3-api.ts (4 V1.3 methods)
  - src/data/{personas,behoerden,letters,letter-summaries}.json
  - src/lib/i18n/locales/*.json (6 locales)
  - tests/unit/stammdaten-v1-3-*.test.ts (10 files, 115 tests)
  - tests/a11y/stammdaten-v1-3-mobilitaet-{sektion,modals}.spec.ts
build-checks:
  - tsc --noEmit: EXIT 0
  - next lint: EXIT 0 (1 pre-existing warning in stammdaten/api.ts unused read import, V1-era)
  - vitest: 575/578 PASS (3 failures all in tests/unit/reply-templates-skelett.test.ts pre-existing V1.5.1 markus-schmidt skelett-template anchor drift; unrelated to V1.3)
  - vitest V1.3 subset: 10 files / 115 tests / 115 PASS
  - i18n parity spot-check on 10 V1.3 keys: 6/6 locales each
---

## Verdict
APPROVE -- V1.3 Mobilitaet-Sektion ships. All 14 Verifier-Locks + 14 Hard-Lines verifiably enforced (10 dedicated unit-test files + schema.strict() + ban-list-grep), a11y 2 blockers from the REVISE pass demonstrably fixed in UmzugBridgeBadge.tsx + focus-restore in PunkteEidReauthModal.tsx, tsc clean, vitest green for V1.3 surface, i18n parity intact across 6 locales for spot-checked keys, no new console.log in components, no localStorage in components.

## Strengths
- VL-enforcement is mechanical, not advisory. Every binding lock is backed by a unit test that would fail loudly on regression (tests/unit/stammdaten-v1-3-{ban-list-grep,schema-no-punkte,persistence-migration,norm-zitate-extension,iso-mdl-toggle-enum,behoerden-kategorie,block-d-wording,faer-on-demand-ttl}.test.ts). The ban-list-grep test whitelist mechanism for kfz_halter_adresse_speculative (strip-by-key-name before grep) is elegant and correct.
- mobilitaetSchema.strict() (schemas.ts:1151-1157) does the structural work the spec demands. punkte / punktezahl / mpu_status / bezirk_der_fe_behoerde / faer_eintragungen all bounce at parse-time, not via prose disclaimer.
- ISO_18013_5_MDL_TOGGLE_SET (types/mobilitaet.ts:260-275) is a real closed const-assert, re-exported from mock-backend/wallet/iso-18013-5-toggle-set.ts as the single source of truth. VL-9 audit passes by construction.
- Block-D co-correction (autopilot/umzug.ts:177-225) rewrote both aktion (Pre-Fill der i-Kfz-Adressaenderung gemaess Paragraph 15 FZV) and briefTemplate.floskel cleanly. Activity-Log mapping at lines 346-347 correctly emits Paragraph 15 FZV for kfz-berlin-labo. The same wording is mirrored in all 6 locale files under umzug.rechtsgrundlage.fzv_15 with the verbatim unverzueglich (i.d.R. innerhalb einer Woche) phrasing.
- mDL Vision-Banner naming is correctly differentiated. stammdaten.disclaimer.eudi_mdl_speculative (de.json:964) names 2029-2031 explicitly, VisionBanner2031 is a distinct component from the V1 2027_vision-pill, mDL-flagged surfaces use only this disclaimer. VL-7 honored.
- PunkteEidReauthModal focus-restore (PunkteEidReauthModal.tsx:53-77) implements an explicit triggerRef + requestAnimationFrame-deferred refocus that survives base-ui-1.4.1 portal teardown. The doc-comment names the upstream bug and the rationale -- good engineering hygiene.
- No FeNrSpeculativePushModal exists in the tree. The only occurrences of that identifier are inside the doc-comment of types/mobilitaet.ts:19-20 listing it as forbidden. VL-10 honored at the file-system level.
- Lena Schmidt seed-correction (personas.json:259: kfz_halter false) plus migratePersonaV12ToV13 idempotently re-zeroes the value if a stale V1.2 bucket still has it true. VL-12 doubly enforced.

## Verifier-Lock x Hard-Line audit (VL-1..VL-14, HL-MOB-1..HL-MOB-14)

| Lock | Status | Evidence (file:line or test) |
|---|---|---|
| VL-1 / HL-MOB-1..9 | PASS | Domain-expert HL-V1.1-1..9 verbatim-inherited as spec Section 11.1-Section 11.9; each backed by named test or component-level enforcement below. |
| VL-2 / HL-MOB-14 (7-Tage-Frist verboten) | PASS | tests/unit/stammdaten-v1-3-ban-list-grep.test.ts greps the 7-Tage-Frist and Frist-7-Tage variants across 6 locales + autopilot + letters.json. Grep on src/ returns no matches. umzug.rechtsgrundlage.fzv_15 in de.json:193 says unverzueglich (i.d.R. innerhalb einer Woche). |
| VL-3 (NormZitatLookup + negative assertions) | PASS | tests/unit/stammdaten-v1-3-norm-zitate-extension.test.ts has positive assertions for 24 entries AND negative assertions: Paragraph-13-FZV not Mitteilungspflicht, Paragraph-32-FZV not Halterdaten-Speicherung, Paragraph-33-FZV not in map. |
| VL-4 / HL-MOB-11 (no punkte field) | PASS | mobilitaetSchema.strict() at schemas.ts:1151-1157 rejects excess keys. migratePersonaV12ToV13 runs stripPunkteField defensively even on polluted V1.2 input (persistence-migrations.ts:619-620). Persistence-migration test asserts punkte not in persona.mobilitaet after migration. |
| VL-5 (Behoerden-Kategorie) | PASS | tests/unit/stammdaten-v1-3-behoerden-kategorie.test.ts covers FE-/KFZ-pattern maps to kategorie=kommune and kba-flensburg maps to kategorie=bund. 7 new IDs audited. |
| VL-6 (Pflichtumtausch-Banner suppression) | PASS | A11y report Section 4 confirmed PflichtumtauschBanner.tsx:55-69 nicht_relevant branch returns null unless datenUnvollstaendig is true. |
| VL-7 / HL-MOB-7 (mDL Vision-Banner 2029-2031) | PASS | stammdaten.disclaimer.eudi_mdl_speculative (de.json:964) names 2029-2031, RL-(EU)-2025/2205, 26.11.2029, ~Mai-2031. VisionBanner2031.tsx is a distinct component. Renders inside WalletMdlAttestationPreviewModal.tsx:118 and WalletMdlCard. |
| VL-8 / HL-MOB-11 (FAER on-demand TTL 5min, no localStorage) | PASS | PunktestandPullResult.ttl_seconds is a hard-typed literal 300 (types/mobilitaet.ts:196). tests/unit/stammdaten-v1-3-faer-on-demand-ttl.test.ts asserts (a) ttl_seconds === 300, (b) bucket-after-pull contains no punkte key, (c) aktenzeichen never appears in any persisted bucket. v1-3-api.ts:196-253 writes only the log entry, never the result. |
| VL-9 (ISO 18013-5 closed enum) | PASS | tests/unit/stammdaten-v1-3-iso-mdl-toggle-enum.test.ts asserts 14 expected + 5 forbidden absent + single-source-of-truth re-export equality. WalletMdlAttestationPreviewModal.tsx:136 maps over ISO_18013_5_MDL_TOGGLE_SET only -- no other source. |
| VL-10 / HL-MOB-1+10 (no FeNrSpeculativePushModal) | PASS | Grep returns only the doc-comment in types/mobilitaet.ts:19-20. FuehrerscheinHauptkarte.tsx:85-123 renders FE-Nr as font-mono dd read-only with KorrekturwegFeBehoerdeCTA as the only outgoing action. |
| VL-11 (Mehmet eAT + eID) | PASS | personas.json:407+ Mehmet retained with tuerkisch + Paragraph-21-AufenthG. MobilitaetSektion.tsx:762 derives show_eat_stufe4_pill from persona.eat_can !== undefined. |
| VL-12 (single Halter Schmidt + Mitnutzerin Lena) | PASS | personas.json:259 Lena kfz_halter=false. personas.json:304 Markus kfz_halter=true. Migration persistence-migrations.ts:622-629 defensively re-zeroes a stale kfz_halter=true on Lena. |
| VL-13 / HL-MOB-13 (Bridge wording + Halter-Adresse-aktualisiert verboten) | PASS | tests/unit/stammdaten-v1-3-ban-list-grep.test.ts greps Halter-Adresse-aktualisiert pattern across 6 locales + letters.json + autopilot. Whitelist mechanism correctly allows the disclaimer that quotes the banned phrase as meta-text. Activity-Log + Uebergangs-Badge keys present in 6/6 locales. api.ts:1041-1051 invokes setHalterAdresseUebergangsMarker after successful Block-D eID confirmation for any kfz-* behoerde. |
| VL-14 (Block-D co-correction Paragraph-32-FZV to Paragraph-15-FZV) | PASS | Grep Paragraph-32-FZV in src/ returns 0 matches. autopilot/umzug.ts:180 aktion is Pre-Fill der i-Kfz-Adressaenderung gemaess Paragraph 15 FZV. autopilot/umzug.ts:190 floskel uses Paragraph 15 FZV. umzug.rechtsgrundlage.fzv_15 in all 6 locales updated. tests/unit/stammdaten-v1-3-block-d-wording.test.ts locks this verbatim. |

## Code-quality findings

### Strict TypeScript (no any / @ts-ignore / fresh as-unknown-as)
- New src/components/stammdaten/mobilitaet/** (16 files) and src/components/stammdaten/wallet/** (3 files): grep returns ZERO matches for any-type, as-any, as-unknown-as, @ts-ignore, @ts-expect-error. Clean.
- src/types/mobilitaet.ts: zero violations. ISO_18013_5_MDL_TOGGLE_SET is a proper as-const tuple, MdlSelectiveDisclosureToggle is derived via (typeof ...)[number]. Good.
- New src/lib/mock-backend/stammdaten/v1-3-api.ts introduces 3 new as-unknown-as casts (v1-3-api.ts:86, 95, 380) for the Zod ZodType<Persona[]>/ZodType<Letter[]>/ZodType<Vorgang[]> pattern. This mirrors the V1.0/V1.1/V1.2 idiom exactly and is consistent with the existing stammdaten/{v1-1-api,v1-2-api}.ts. The CLAUDE.md V1.0.1 followup already calls for an extract helper to abstract this pattern -- V1.3 did not address that backlog item but also did not regress it. Flag as V1.3.1 followup, not blocker.
- New src/lib/mock-backend/persistence-migrations.ts:548 adds 1 new as-unknown-as in stripPunkteField. The cast is local to a defensive strip-helper that intentionally deletes excess keys to enforce HL-MOB-11; the alternative (re-typing Mobilitaet to allow Record<string, unknown> access) would weaken the type. Accept as idiomatic.

### Security
- No dangerouslySetInnerHTML in V1.3 surface.
- No new API-key reads in client bundle.
- FIN displayed as masked-by-default; full reveal is user-initiated (FinMaskedSpan.tsx:39, 57). aria-label mirrors visible content (a11y-report Finding 5 noted optional hardening -- keep aria-label always masked -- non-blocking).
- No localStorage/sessionStorage access from any component under src/components/stammdaten/mobilitaet/** or src/components/stammdaten/wallet/**. Only doc-comments mention the term.

### Comment hygiene
- Component doc-comments reference Spec-Section-N / VL-N / HL-MOB-N -- these are WHY-comments anchoring legal/normative rationale, not WHAT-comments. Acceptable.
- No PR-anchored comments seen.
- No TODOs without owner+ticket in new V1.3 files (grepped).

### console.log / console.error / console.warn
- src/components/stammdaten/mobilitaet/PunktestandOnDemandCard.tsx:58: a guarded console.error inside a try/catch around the FAER pull. Identical defensive pattern as existing StammdatenView.tsx:145 and WalletSubTab.tsx:121. Consistent with the V1.1 followup item try/catch defensive-fallback cleanup in 4 V1.1 components that is already tracked. NIT, not blocker -- but flag as V1.3.1 followup to track alongside the existing backlog.
- src/lib/mock-backend/stammdaten/v1-3-api.ts:239, 344 console.warn inside defensive try/catch. Consistent with lib/mock-backend/** precedent (see autopilot/umzug.ts:375, persistence.ts:87, etc.). Acceptable.

### i18n
- 10 critical V1.3 keys spot-checked: 6/6 locales each present and non-empty.
- All 6 locale JSON files parse cleanly (JSON.parse 6/6 OK).
- No hardcoded German user-visible strings found in src/components/stammdaten/mobilitaet/** or wallet/**. Every visible text routes through useTranslations(...).

### Server vs client components
- 11 of 16 mobilitaet components carry use-client (modals, on-demand-state-bearing cards). The 5 server components (UmzugBridgeBadge, SchluesselzahlTooltip, KfzMitnutzerPill, HalterAdresseFieldCard, WalletMdlCrossRefLink) correctly omit the directive. No use-client-at-root-with-no-interactivity anti-pattern.
- WalletMdlAttestationPreviewModal and WalletMdlCard are correctly client; VisionBanner2031 is server. OK.

### Mock-backend boundary
- WalletSubTab.tsx:67 calls api.getMdlAttestation(personaId) -- through lib/mock-backend/api.ts. Correct.
- StammdatenView.tsx:131, 766 calls api.getMobilitaet + api.getPunktestandOnDemand -- through the same facade. Correct.
- No direct import of stammdatenV13Api from any component. Correct layering.

### Test coverage
- Unit: 10 V1.3 test files, 115/115 PASS in 9.6s.
- A11y: 14/14 PASS per Playwright (a11y-report Section 2 verdict was REVISE pre-fix because of 2 axe-contrast blockers; both fixed in UmzugBridgeBadge.tsx:46, 49 via text-amber-950 + dark text-amber-100; verified by reading the current file).
- Existing V1.5.1 reply-template tests are still failing (3 tests in tests/unit/reply-templates-skelett.test.ts for markus-schmidt aussetzung_vollziehung + einspruch_steuerbescheid_skelett). These are pre-existing CLAUDE.md-acknowledged failures unrelated to V1.3.

## Architect-deviation classifications

### 1. FE-Nr regex 12-char actual vs 11-char spec Section 6.8 -- Accept as documented deviation, V1.3.1 reconcile
fahrerlaubnisSchema.fe_nr at schemas.ts:1080-1082 uses a permissive regex (9-12 chars after the Bundesland letter). All three persona seeds are 12 chars (F0727RRE2I50, J0512SCH08X1, N0428MEH47K2). The architect spec Section 6.8 says 11 chars. The seed values are user-visible in the loom-demo and were architect-supplied verbatim; the regex was widened to match them. Test tests/unit/stammdaten-v1-3-fe-nr-format-validator.test.ts documents the deviation explicitly with the rationale comment. Verdict: reasonable scope-management decision (do not break the demo seed values for a spec-pedantic one-char discrepancy that has no legal-realism consequence). Reconcile in V1.3.1 -- either tighten the regex to 11 chars and re-mint the seed values, or amend the spec to 12 chars with a note about FS-VwV Ausfertigung-Suffix conventions.

### 2. setHalterAdresseUebergangsMarker lifted to public API -- Accept
Spec described it as an internal autopilot-callable. v1-3-api.ts:176-179 and api.ts:962-965 expose it on the public MockBackend surface. The exposure is required because api.ts:bestaetigeImpl (Block-D eID confirmation path) lives in a separate module and needs to invoke it after autopilot-driven Block-D completion. Marking it @internal in the doc-comment would suffice; making it private would require either co-locating bestaetigeImpl into v1-3-api.ts (cross-cutting) or using a back-channel event. The chosen exposure is pragmatic. Verdict: accept; treat as a spec Section 9.3 amendment.

### 3. getMdlAttestation made required (spec said optional) -- Accept
MockBackend interface at api.ts:944 declares it required, not optional. The wire-up in WalletSubTab.tsx:67 (api.getMdlAttestation(personaId).then(...)) needs the method to exist on every persona, including those without a fahrerlaubnis (where it returns status:not_issued -- see v1-3-api.ts:260-264). Making it optional would require defensive optional-chains in WalletSubTab and would surface undefined as a render-state concern. Verdict: stricter than spec, in a good direction; accept.

## Approval blockers
None.

## Followups (V1.3.1, non-blocking)

1. FE-Nr regex 11 vs 12 chars -- pick one and reconcile (see Architect-deviation #1 above). Update spec Section 6.8 OR tighten regex+re-mint seeds.
2. as-unknown-as ZodType<...> helper extraction -- V1.3 added 3 new occurrences in stammdaten/v1-3-api.ts. CLAUDE.md V1.0.1 followup already tracks this for the broader codebase. Extract once across seed.ts + api.ts + all stammdaten/v*-api.ts.
3. console.error inside try/catch in PunktestandOnDemandCard.tsx:58 -- align with the V1.1 followup try/catch defensive-fallback cleanup in 4 V1.1 components. Either keep all of them (consistent) or drop all of them (cleaner); right now V1.3 added one more to the pile.
4. FinMaskedSpan aria-label hardening (a11y-report Finding 5) -- keep aria-label always masked even when visible content is revealed; trade-off: blind users get more privacy at the cost of more clicks to know what was just revealed. Architect-discretion.
5. dir=ltr in AR locale (a11y-report Finding 7) -- add dir=ltr to the FIN/FE-Nr value spans for screen-reader announcement order in Arabic.
6. Lighthouse CLI configuration (a11y-report Finding 4) -- add @lhci/cli to devDependencies + a lighthouse:a11y script so future audits can produce a real numeric score instead of estimating.
7. Dev-server hygiene pretest hook (a11y-report Finding 8) -- npx kill-port 3000 before Playwright runs on Windows to avoid stale daemons.
8. Activity-Log note field carries comma-delimited key:value pairs as a string. This is consistent with V1.0+ but fragile; consider a typed note_meta field of type Record<string, unknown> companion field in V2.
9. kfz-* startsWith heuristic at api.ts:1042-1044 is brittle -- a future Behoerde-ID kfz-handel-XY (KFZ-Haendler) would trigger the Halter-Adresse-Marker incorrectly. Tighten via behoerden lookup on zustaendige_themen. V1.3.1.
10. Spec Section 11.4 wording-grep test does not include autopilot brief-templates per block -- currently the ban-list-grep test reads the whole autopilot/umzug.ts file content, which captures it incidentally, but a future split into per-block files could miss them. Add explicit per-template-block coverage.

## Recommendation
- APPROVE -- V1.3 Mobilitaet-Sektion is ready to ship. The user may commit and update CLAUDE.md status-line. Update spec frontmatter status from spec to shipped (the spec currently says status: spec).
- Re-stamp docs/a11y-reports/stammdaten-v1-3-mobilitaet-2026-05-13.md verdict from REVISE to PASS in a frontmatter update (the body already describes the post-fix 14/14 PASS state).
