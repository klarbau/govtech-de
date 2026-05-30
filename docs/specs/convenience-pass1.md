---
feature: convenience-pass1
title: Maximal-Konvenienz — Pass 1 (Datenfundament, Wert-Sichtbarmachung, Ripple, Realismus)
status: spec
track: spine            # Pass-1 is overwhelmingly spine; per-item track tags below (A2 / A3-secondary / A-katalog / C2 / C3 / C4 are supporting)
owner_agents: [mock-backend-coder, frontend-coder, assistant-engineer, i18n-localizer, a11y-tester]
inputs:
  reviews:
    - docs/reviews/mock-convenience-gaps-mockdata.md   # data + ops audit (P0/P1/P2 findings)
    - docs/reviews/mock-convenience-gaps-ux.md          # value-surfacing GAPs 1.x–4.x
    - docs/reviews/mock-convenience-gaps-realism.md     # norm fixes G1–G11 + Loom-staging note
  domain: docs/domain/umzug-konvenienz-und-normen.md    # SOURCE OF TRUTH for ALL time-saved numbers + corrected legal norms (written in parallel)
  spine: docs/demo-spine.md
  loom: docs/loom-script.md
verify: concept-verifier verdict = PROCEED for Pass-1 scope (A+B+C+D). Verticals E1/E2 = Pass-2, OUT OF SCOPE except the A-katalog "demnächst" teaser.
---

> **HOW TO READ THIS SPEC (coders).** It is §-numbered. Read only your sections.
> - **mock-backend-coder** → §0 (coordination), §1 (type deltas — you own all of `src/types/*` + `docs/architecture.md`), §A.*, §B.* data shapes, §C.* ops, §D.* (norm/data fixes), §16, §17.
> - **frontend-coder** → §0, §1 (read-only — consume the types mock-backend ships), §A4/A5 (display side), §B.* (all screen flows), §C.* (UI for ops), §13 (i18n DE source), §14 (a11y), §16.
> - **assistant-engineer** → §0, §7 (assistant integration), §13 (assistant keys), §16.
> - **i18n-localizer** → §13 only.
> - **a11y-tester** → §14 + §15.
>
> **CITATION RULE.** Every "real" claim (norm tag, Bearbeitungszeit, Zeitersparnis number, beteiligte Behörde) is sourced from `docs/domain/umzug-konvenienz-und-normen.md`. Where this spec writes `[domain: <anchor>]`, the coder PULLS THE EXACT VALUE FROM THE DOMAIN NOTE — do not invent or round numbers here. If the domain note lacks a value the spec references, STOP and kick back to domain-expert with the precise missing anchor. Do not ship a placeholder number.

---

## 0. Coordination — who owns which files (run in parallel, zero conflicts)

The three coders MUST stay inside their file boundaries below. Cross-boundary needs are satisfied by the **type contract in §1** (mock-backend ships it first; the other two consume it). The single hard ordering dependency: **§1 type deltas + §A1 seed anchor land before frontend/assistant wire against them.** Everything else parallelizes.

| Agent | OWNS (writes) | MUST NOT touch |
|---|---|---|
| **mock-backend-coder** | `src/lib/mock-backend/**` (api.ts, seed.ts, store.ts, autopilot/umzug.ts, events.ts, dashboard/api.ts), `src/data/*.json`, `src/types/*` (ALL type files), `docs/architecture.md` | `src/app/**`, `src/components/**`, `src/lib/ai/**` |
| **frontend-coder** | `src/app/**`, `src/components/**`, `src/lib/i18n/locales/de.json` (DE source only) | `src/types/*`, `src/lib/mock-backend/**`, `src/lib/ai/**` |
| **assistant-engineer** | `src/lib/ai/**` (tools.ts, system-prompt.ts), `src/app/api/assistant/route.ts` | `src/types/*` (consume only), `src/lib/mock-backend/**` (call via `api.*` only), `src/components/**` |
| **i18n-localizer** | `src/lib/i18n/locales/{en,ru,uk,ar,tr}.json` | everything else |

**Sequencing within the run:**
1. mock-backend-coder lands §1 types + §A1 anchor + §A3 leak-fix + §A4 cold-open + §A5 link-tidy + §D realism fixes + §B1/§B4 data + §C1 ripple events FIRST (this is the foundation gate).
2. frontend-coder + assistant-engineer build against the shipped types in parallel.
3. i18n-localizer translates after de.json keys are committed (§13).
4. a11y-tester + code-reviewer gate (§14, §15).

**Cross-cutting invariants baked into every item (non-negotiable):**
- New events `document_created` and `termin_created` MUST be emitted wherever the autopilot mints a Document/Termin (§C1), so live screens react (§1.2).
- Every new artefact (Document, Termin, Letter, EUDI export payload) carries a visible `[MOCK]` marker (CLAUDE.md realism rule).
- All count-ups and the cascade animation respect `prefers-reduced-motion` → instant (§14).
- All value numbers traceable to the domain note (§B1 acceptance).

---

## 1. Type deltas (mock-backend-coder owns; others consume) — listed explicitly

> Mirror every change in `src/types/*` AND `docs/architecture.md` (CLAUDE.md mandate). These are the ONLY new/changed types in Pass 1. Field names below are the contract — frontend/assistant code against exactly these. **Existing fields confirmed against source** (`AutopilotStep`, `Persona`, `MockBackendEvent`, `DashboardSnapshot`, `Termin`, `Document`).

### 1.1 `AutopilotStep` (`src/types/vorgang.ts`) — additive
```ts
// ADD to existing AutopilotStep interface (current fields: id, behoerde_id, block,
// aktion, rechtsgrundlage, status, started_at?, completed_at?, letter_id?,
// requires_eid?, requires_consent?, consent_given_at?, eid_confirmed_at?, failure_reason?):
/** Delegierte Agent-Stimme ("Wir melden Sie beim Bürgeramt an"). DE-Daten. Primärzeile in B3. */
agent_label?: string;
/** Datenkategorien, die in diesem Hop übermittelt werden (Datenminimierung — G8/B4). */
datenkategorien?: string[];
```
- `aktion` + `rechtsgrundlage` STAY (they become the **trust subline** in B3, not the primary line).
- Mirror the same two fields into `AutopilotStepDraft` (`src/types/umzug.ts`) so previews carry them too.

### 1.2 `MockBackendEvent` (`src/types/mock-event.ts`) — new variants
```ts
// ADD to the MockBackendEvent union (currently: letter_received, letter_status_changed,
// vorgang_created, vorgang_status_changed, autopilot_step, document_added, StammdatenEvent):
| { type: 'document_created'; document: Document }
| { type: 'termin_created'; termin: Termin }
```
- NOTE: a `document_added` variant already exists. If it is already emitted on document mint and consumed by the Dokumente screen, REUSE it instead of adding `document_created` — pick one and document the choice in architecture.md. `termin_created` is genuinely new. The REQUIREMENT is "an event fires on Document/Termin mint and the screen reacts live" — not the specific name. Do not emit two events for one mint.

### 1.3 Value-receipt shape — new type (`src/types/value-receipt.ts`, mock-backend creates)
```ts
export interface ValueReceipt {
  vorgang_id: string;
  lebenslage: 'umzug';                    // Pass-1 only value
  behoerden_count: number;                // distinct Behörden the run touched [domain: beteiligte-behoerden]
  geschaetzte_zeitersparnis_min: number;  // conservative "ca." minutes [domain: zeitersparnis]
  klassische_schritte: number;            // status-quo Antrag/Behördengang count [domain: status-quo-aufwand]
  ihr_aufwand_schritte: 1;                // literal 1 ("ein Satz") — constant
}
```
- Returned by `api.getValueReceipt(vorgangId)` (§B1), embedded in the dashboard snapshot (§B2), mirrored to the assistant (§7).

### 1.4 `DashboardSnapshot` (`src/types/dashboard.ts`) — additive
```ts
/** Triumph-Banner-Quelle: jüngster abgeschlossener Autopilot-Lauf. Absent vor jedem Lauf. */
autopilot_highlight?: {
  vorgang_id: string;
  lebenslage: 'umzug';
  value_receipt: ValueReceipt;
  abgeschlossen_at: string;               // ISO, anchored via §A1 → renders "gerade eben"
};
/** "Automatisch erledigt für Sie" feed — chronologisch, neueste zuerst. */
erledigt_feed: Array<{
  id: string;
  behoerde_id: BehoerdeId;
  agent_label: string;                    // delegated voice (§B3)
  erledigt_at: string;                    // ISO → relative time
  vorgang_id: string;
  letter_id?: string;
}>;
```
- The existing `top_actions: TopActionItem[]` and `vorgaenge_abgeschlossen_jahr` STAY; §B2 adds the empty branch in the VIEW (empty array is already representable — no type change for the empty state).

### 1.5 `store.ts` meta — seed anchor (req) + clock offset (opt)
```ts
// in the persisted meta blob:
seeded_at: string;          // ISO — the seed anchor (§A1). REQUIRED, lands in Pass-1.
clock_offset_ms?: number;   // demo-only time travel (§A2). Optional, DEFER-LAST.
```
- A single `now()` helper in mock-backend returns `new Date(Date.now() + (meta.clock_offset_ms ?? 0))`. §A1 only needs `seeded_at`; `clock_offset_ms` + `advanceClock` is §A2 and ships LAST (or is dropped if time-boxed). Route the existing bare `new Date()` reads in `dashboard/api.ts` (`buildDashboard(... now: Date)`) and `umzug.ts` through `now()`.

### 1.6 Document / Termin — NO new fields (confirmed)
- `Termin` (`src/types/termin.ts`) already has `vorgang_id?`, `status: 'gebucht'|'bestaetigt'|'abgesagt'`, `buchungsreferenz?`, `betreff`, `ort`. The LEA Termin (§C1) and Termine ops (§C2) reuse these as-is. NOTE: TerminStatus has no `verschoben` — for §C2 reschedule, keep `status: 'gebucht'` and change `datum` (do not invent a status), OR add `'verschoben'` here if the Termine UI needs it; mock-backend's call, mirror if added.
- `Document` reuses existing shape (`typ`, `ausstellende_behoerde`/`ausstellende_behörde`, `vorgang_id`, `qr_payload`, `eudi_compatible`, `[MOCK]`). Confirm the `typ` enum has `meldebestaetigung` + `zulassungsbescheinigung_teil_i`; if missing, add to the union and mirror.

### 1.7 EUDI export payload (§C3, supporting) — new type (`src/types/document.ts` or value-receipt.ts)
```ts
export interface EudiExportPreview {
  document_id: string;
  mock: true;                  // always true — never a production export
  payload_preview: string;     // pretty-printed [MOCK] VC-shaped JSON string
  disclaimer_key: string;      // i18n key naming EUDI 2027 rollout status
}
```

### 1.8 Autopilot catalog (§A-katalog, supporting) — new type
```ts
export interface AutopilotKatalogEntry {
  id: 'umzug' | 'kindergeburt' | 'steuererklaerung';
  status: 'live' | 'demnaechst';
  titel_key: string;            // i18n
  beschreibung_key: string;     // i18n
  behoerden_preview: BehoerdeId[]; // static teaser list, real names from behoerden.json
}
```

---

## A. Data foundation (mock-backend-coder)

### A1. Relative-time seed anchor — `[spine]`
- **WHAT:** Stop hardcoding fixture dates. Add `meta.seeded_at = <now at seed time>` and re-express every demo-relevant timestamp in fixtures as **sentinels resolved at load** against `seeded_at`. The seed loader replaces sentinels with concrete ISO dates.
- **Sentinel format (contract):** `"@now"`, `"@now-<N>d"`, `"@now+<N>d"`. Loader: any string in a date field matching `^@now([+-]\d+d)?$` → resolve to ISO. Document the resolver in `architecture.md`. Sentinels are also valid in datetime fields (resolve to a fixed time-of-day, e.g. 09:00, for determinism).
- **Re-tune Anna's posture to a deliberate, legible mix** (mockdata P1, ux GAP 1.2):
  1. **1 overdue-but-handled** — a Frist at `@now-3d` whose item is ALREADY resolved (status `erledigt`/confirmed via the cold-open run §A4). Reads "the product caught it," not a bug. [domain: status-quo / Frist behaviour]
  2. **1 amber ~5d** — a real open Frist at `@now+5d` (the dashboard's live amber item the viewer sees).
  3. **1 calm** — no urgent action remaining (feeds "heute nichts zu tun", §B2).
  4. **1 future Termin** — a Termin at `@now+Nd` so Termine isn't empty pre-run.
- **Fix the drifted items the audits named:** `letter-anna-standesamt-eheschliessung-termin` Rückmeldung-Frist (was 2026-05-30, one day out) → re-anchor via sentinel; any "early-May 2026 today" fixtures → sentinels.
- **Edge cases:** sentinels live ONLY in fixtures, never in user-written localStorage state; already-resolved persisted state is not re-anchored on a reseed-after-persist (only a fresh seed resolves sentinels).
- **Acceptance:** open the app on any future date → Anna's dashboard always shows the same relative posture (1 overdue-handled, 1 amber, calm rest, 1 upcoming Termin). No drift.

### A2. `advanceClock(days)` — `[supporting; DEFER-LAST]`
- **WHAT:** `api.advanceClock(days: number): void` shifts `meta.clock_offset_ms` by `days*86400000`; `api.resetClock(): void` zeroes it. All mock-backend `now()` reads honour it (§1.5). Demo-only; gate behind a query param (`?demo-clock=1`) or hidden control — NEVER a normal-UI button.
- **Out-of-scope guard:** do NOT route this through any spine screen. It is a presenter affordance. Ships LAST; if Pass-1 is time-boxed, DROP it (the §A1 anchor alone satisfies the spine).
- **Acceptance:** with `?demo-clock=1`, advancing 3 days moves the amber Frist toward red and ages relative times; resetting restores. Spine e2e unaffected when the flag is absent.

### A3. Persona data-leak fix — `[spine BUG]` + populate secondaries `[supporting]`
- **BUG (spine):** Audit confirms all non-letter fixtures are Anna-exclusive; switching persona empties screens, and any record lacking an owner filter leaks across personas. **Enforce an owner filter on every list read** — `getVorgaenge`, `getDocuments`, `getTermine`, `getReminders`, and dashboard derivation (`buildDashboard` already takes `personaId`; verify it filters letters/vorgaenge/termine/documents by owner, currently it `loadLetters()`/`loadVorgaenge()`/`loadTermine()` without an obvious persona filter). Use the existing owner field per entity (`persona_id` on Vorgang, `empfaenger_persona_id` on Letter, the equivalent on Document/Termin/Reminder); where an entity has no owner field, ADD `owner_persona_id` and mirror (§1). No record without an owner match may appear for a persona it doesn't belong to.
- **Populate Schmidt + Mehmet `[supporting]`** (mockdata P2): per persona add 1–2 Vorgänge, 6–10 documents, 2–3 Termine, 2 reminders, `vorgang_id`-linked to their EXISTING letters; dates via sentinels (§A1). Schmidt → a Kindergeburt-Mia Vorgang mid-flight (DATA ONLY). Mehmet → a Steuererklärung Vorgang (DATA ONLY).
- **Out of scope:** NO autopilot `start` for Schmidt/Mehmet verticals (Pass-2). Static life-states only.
- **Acceptance:** switching persona never shows another persona's record; Schmidt/Mehmet land on populated (non-empty) Vorgänge/Dokumente/Termine screens.

### A4. Seeded "Umzug fully done" cold-open hero — `[spine]`
- **WHAT:** Seed ONE `abgeschlossen` Umzug Vorgang for Anna whose steps are all `confirmed`, with **real same-period confirmation letters** (one per Behörde, `vorgang_id`-linked), a minted **Meldebestätigung Document** (`vorgang_id`-linked), and the LEA Termin where applicable. Timestamps via sentinels (`@now-1d` / `@now`) so the cold-open reads "gerade eben."
- This powers the dashboard triumph banner (§B2) and the cold-open Loom variant. It MUST coexist with a STILL-RUNNABLE fresh Umzug (the live flow the Loom main path fires via the assistant): the seeded done-run is a SEPARATE historical Vorgang, not the one the assistant starts. Do not let the seeded done-run pre-occupy or block the live flow.
- The 2024 Erstanmeldung historical Vorgang stays as the older track record (its linkage must survive §A5).
- **Acceptance:** on first load as Anna, the dashboard shows a completed-Umzug triumph banner reading "gerade eben"; clicking it opens a Vorgang whose letters, the Meldebestätigung doc, and Termin all resolve (no dead/wrong-year links). The assistant can still start a fresh Umzug afterward.

### A5. Cross-link tidy — `[spine]`
- **WHAT (mockdata P0):**
  1. The 2026 Umzug (`vg-anna-umzug-skalitzer-friedrichstr`) must STOP reusing the 2024 `letter-buergeramt-meldebestaetigung-anmeldung` (currently double-booked with `vorgang-anna-anmeldung-2024`). Give the 2026 run its own same-period Bürgeramt confirmation letter, or drop the stale `letter_id`.
  2. Every process letter belonging to a case carries that case's `vorgang_id`; every confirmed step claiming a produced letter has a real same-period `letter_id` (the Umzug's confirmed Finanzamt/Beitragsservice/KFZ steps currently have no `letter_id`).
  3. Stamp `vorgang_id` on `letter-familienkasse-bewilligung` (Kindergeld Vorgang `vorgang-anna-kindergeld-aktualisierung-2026`) and any Eheschließung letter so those Vorgänge have an openable letter; fix all year mismatches.
- **Add a read** `api.getVorgangRelated(vorgangId): { letters, documents, termine, reminders }` filtered by `vorgang_id` (reuse `getLetterThread`, `LetterFilter.vorgang_id`). Frontend uses it for Vorgang-detail + the "Gehört zu" chips.
- **Acceptance:** no Vorgang-detail view renders a wrong-year or dead link; every "Erledigt"/confirmed step opens a correct same-period letter.

### A-katalog. `getAutopilotKatalog()` teaser — `[supporting]`
- **WHAT (mockdata P3):** `api.getAutopilotKatalog(): AutopilotKatalogEntry[]` (§1.8) returning: `umzug` → `live`; `kindergeburt` → `demnaechst`; `steuererklaerung` → `demnaechst`. `behoerden_preview` uses real ids from `behoerden.json`.
- **Out of scope:** NO `start`/orchestration for kindergeburt/steuererklaerung — preview-only catalog rows answering "is this a pattern?". Building either vertical = Pass-2.
- **frontend:** render the catalog (likely on `/(app)/assistent` or `/(app)/vorgaenge`): Umzug actionable, the other two visibly "demnächst" (disabled), citing real Behörden.
- **Acceptance:** catalog shows Umzug actionable, two others "demnächst" with real Behörden names.

---

## B. Value surfacing (cite domain note for ALL numbers)

### B1. Value receipt — `[spine; ACCEPTANCE: every number traceable to domain note]`
- **WHAT:** `api.getValueReceipt(vorgangId): ValueReceipt | null` (shape §1.3). Computed from the run's confirmed steps + domain-note baselines:
  - `behoerden_count` = distinct Behörden in the run [domain: beteiligte-behoerden].
  - `geschaetzte_zeitersparnis_min` = conservative status-quo minutes minus the ~4 the citizen spent [domain: zeitersparnis]. **Phrase as "ca." everywhere.** Conservative > impressive.
  - `klassische_schritte` = status-quo Antrag/Behördengang count [domain: status-quo-aufwand].
  - `ihr_aufwand_schritte` = `1` (literal "ein Satz").
- **SURFACES (frontend):**
  1. **End of autopilot timeline** — an "Ihre Ersparnis" card: big numbers, count-up animation (reduced-motion → instant). Copy frames SAVED effort, not done effort.
  2. **Dashboard** — mirrored inside the triumph banner (§B2).
  3. **Assistant** — mirrored in the post-run assistant summary (§7).
- **Screen: autopilot run** — `Route: /(app)/vorgaenge/umzug/[id]` (run/detail view) + the live run page. `Component: <ValueReceiptCard> <NEW>` in `src/components/autopilot/`.
- **i18n keys:** see §13 (`convenience.value_receipt.*`).
- **Edge cases:** receipt is `null` until ≥1 step confirmed → card hidden; never shows a number the domain note can't source (if missing → kick back to domain-expert, do not placeholder).
- **ACCEPTANCE (hard):** every rendered number is grep-traceable to `docs/domain/umzug-konvenienz-und-normen.md`. code-reviewer verifies against the note.

### B2. Dashboard "Automatisch erledigt für Sie" feed + calm empty state — `[spine]`
- **Screen: Dashboard** — `Route: /(app)/dashboard`, `File: src/app/(app)/dashboard/page.tsx` (RSC) feeding `DashboardView` (client). `Components: <TriumphBanner> <NEW>`, `<ErledigtFeed> <NEW>` in `src/components/dashboard/`.
- **Triumph banner (above "Heute zu tun"):** rendered ONLY when `snapshot.autopilot_highlight` present. Copy: *"Erledigt für Sie: Umzug an {behoerden_count} Behörden gemeldet — Sie mussten nichts tun"* + the §B1 receipt numbers ("ca. {min} Min gespart"). Relative time "gerade eben" from `abgeschlossen_at`. Hidden pre-run.
- **"Automatisch erledigt für Sie" feed:** renders `snapshot.erledigt_feed` (each row = delegated `agent_label` + Behörden-Badge + relative time + link to the source letter/Vorgang).
- **Calm empty state:** replace the current unconditional `top_actions.slice(0,3)` render. When "Heute zu tun" is empty → render *"Heute nichts zu tun. Wir melden uns, wenn etwas ansteht."* + the achievement line (`vorgaenge_abgeschlossen_jahr`). Blank space is a bug; designed calm is the product.
- **Fix the hardcoded greeting** (`DEMO_PRIOR_LOGIN_DAYS = 23` in `DashboardView.tsx`): derive "letzter Login vor N Tagen" from the seed anchor (`last_login_at` relative to `seeded_at`) so it stays truthful.
- **i18n:** §13 (`dashboard.triumph.*`, `dashboard.erledigt_feed.*`, `dashboard.heute.empty_*`, `dashboard.achievement.jahr`).
- **a11y:** triumph banner is `aria-live="polite"` ONLY on live in-session arrival, NOT on the static cold-open instance (avoid SR spam on load); feed is a semantic list (§14).
- **Acceptance:** pre-run dashboard shows amber + calm posture; cold-open/post-run shows the triumph banner + erledigt feed; an empty "Heute zu tun" shows the calm state, never blank.

### B3. Delegated agent-voice step copy + §-tag trust subline — `[spine]`
- **WHAT:** Every cascade step renders the **delegated voice as the PRIMARY line** (`agent_label`, §1.1) and the dry `aktion` + `rechtsgrundlage` as a quieter **trust subline**.
  - mock-backend populates `agent_label` per step in DE (first-person-plural, present tense, citizen's name where natural): e.g. *"Wir melden Sie beim Einwohnermeldeamt an"*, *"Wir aktualisieren Ihre Adresse bei der {Krankenkasse}"*, *"Wir informieren Ihren Arbeitgeber über Ihre neue Anschrift"*.
  - frontend surfaces `agent_label` as the primary line in `BehoerdenStatusRow.tsx`; `aktion` + `rechtsgrundlage` become the subline.
- **Component:** edit `src/components/umzug/BehoerdenStatusRow.tsx` (primary-line swap; add subline).
- **i18n:** `agent_label` is DE-source DATA on the step (content, like `aktion`) — NOT a t()-key per step. The static labels around it are keys: `convenience.step.basis_label`, `convenience.step.data_label` (§13).
- **Acceptance:** the timeline reads as an assistant acting ("Wir melden Sie …"), not a form ("Anmeldung neuer Wohnort"); the norm tag is still visible as supporting trust copy.

### B4. Übermittlungs-Log per-Behörde receipt — `[spine]`
- **WHAT:** A collapsible "Was wurde übermittelt, an wen, auf welcher Rechtsgrundlage?" receipt per Behörde on the timeline, driven by per-step `datenkategorien` (§1.1) + `rechtsgrundlage` + consent timestamp. Datenminimierung made visible (G8): *"An den Beitragsservice: nur neue Anschrift, Einzugsdatum, Beitragsnummer — nicht Ihr Familienstand oder Ihre Religion."*
- mock-backend populates `datenkategorien` per recipient. Example sets (exact list per the domain note): Beitragsservice → `["neue_anschrift","einzugsdatum","beitragsnummer"]`; Wohnsitz-Finanzamt → `["neue_anschrift","steuer_id"]`; Krankenkasse → `["neue_anschrift","einzugsdatum","versichertennummer"]`; Arbeitgeber → `["neue_anschrift","einzugsdatum"]`; Einwohnermeldeamt → `["neue_anschrift","einzugsdatum","familienstand"]`. [domain: datenkategorien-pro-behoerde]
- This also replaces the activity-log hook's hardcoded `field_id: 'anschrift_aktuell'` (every recipient) with the real per-hop field set (§D7).
- **Component:** `<UebermittlungsReceipt> <NEW>` in `src/components/autopilot/`, rendered as a disclosure inside each `BehoerdenStatusRow`.
- **i18n:** §13 (`convenience.receipt.*`, `convenience.datenkat.<key>`).
- **a11y:** disclosure is a real `<button aria-expanded>` controlling a `role=region` panel; collapsed by default (§14).
- **Acceptance:** expanding any Behörde shows exactly the fields sent (matching its `datenkategorien`), the Rechtsgrundlage, and (Block B) the consent timestamp.

---

## C. Ripple + ops

### C1. Autopilot mints Termin + Document, cross-linked, emits events — `[spine]`
- **WHAT (mockdata P0 / ux GAP 3.1):** extend the umzug completion path so confirmed steps leave durable, clickable proof:
  - **Bürgeramt step → mint a Meldebestätigung `Document`** (`typ: meldebestaetigung`, `ausstellende_behoerde_id: 'buergeramt-berlin-mitte'` — VERIFIED existing id, NOT `buergeramt-mitte`; `vorgang_id` = run, `owner_persona_id` = run persona, `[MOCK]` `qr_payload`, `eudi_compatible: true`). Reuse the existing `createWohnungsgeberDoc()` helper pattern in `api.ts` (it already targets `buergeramt-berlin-mitte`). Emit the document event (§1.2).
  - **KFZ Block-D step → mint a Zulassungsbescheinigung Teil I `Document`** (same pattern). Emit.
  - **ABH Block-D step → create a `Termin`** (LEA, `status: 'gebucht'`, `vorgang_id` set, date via sentinel `@now+Nd`, `betreff` "Adressaktualisierung Aufenthaltstitel") — the LEA letter already promises one. Emit `termin_created`.
  - Resolve the run's Frist/Reminder to done.
- Generalise the existing `createWohnungsgeberDoc()` pattern (umzug.ts); reuse `aktenzeichenForBehoerde`. Save via `saveDocuments` / the Termin store + emit.
- **frontend:** Dokumente + Termine screens subscribe to the new events and render newly minted artefacts live, each with `[MOCK]` + a "Gehört zu: Umzug" chip linking back via `getVorgangRelated`. Add a subtle "neu" dot on the Dokumente/Termine sidebar items post-run so the Loom can pan the nav and show the ripple.
- **Edge cases:** a failed step mints no artefact; a non-KFZ persona simply has no Zulassungsbescheinigung (gated like the step). (For Anna, KFZ is now ON — §16.1.)
- **Acceptance:** after a run, Dokumente shows the Meldebestätigung (+ Zulassungsbescheinigung for Anna) and Termine shows the LEA Termin, all back-linked; both screens update without a manual refresh.

### C2. Termine ops — `[supporting]`
- **WHAT:** `api.bestaetigeTerminVorschlag(terminId)` (→ `status: 'bestaetigt'`), `api.verschiebeTermin(terminId, neuesDatumIso)` (change `datum`; keep `status` or add `'verschoben'` per §1.6), `api.sageTerminAb(terminId)` (→ `status: 'abgesagt'`). Emit a termin event (reuse/add per mock-backend's call). Backs the Standesamt Termin-Vorschlag + LEA flows.
- **frontend:** wire the currently-dead Termine action buttons on `src/app/(app)/termine/**` to these ops.
- **i18n:** §13 (`termine.action.*`).
- **Acceptance:** no dead Termine button; cancel/confirm/reschedule reflect immediately.

### C3. EUDI export — CLEARLY-MOCKED preview only — `[supporting; ACCEPTANCE: no production-looking export]`
- **WHAT:** `api.exportiereDokumentEudi(docId): EudiExportPreview` (§1.7) returning a `[MOCK]` VC-shaped payload preview + a `disclaimer_key` naming the real EUDI-Wallet 2027 rollout status.
- **frontend:** an "In EUDI Wallet exportieren (Vorschau)" affordance on a Document → dialog showing the `[MOCK]` payload + the disclaimer. Optional "Download" writes the same `[MOCK]` JSON. NEVER renders anything resembling a real verifiable credential / production export.
- **i18n:** §13 (`dokumente.eudi.*`).
- **ACCEPTANCE (hard):** the export visibly carries `[MOCK]` and the 2027-status disclaimer; a reviewer cannot mistake it for a real export. code-reviewer enforces.

### C4. markReminderDone / snooze + dashboard dismiss — `[supporting]`
- **WHAT:** `api.markReminderDone(reminderId)`, `api.snoozeReminder(reminderId, tage)`. Dashboard "Heute zu tun" items get a dismiss/snooze affordance that calls these and re-derives the snapshot (feeds the calm empty-state beat, §B2).
- **frontend:** dismiss/snooze control on `DashboardView` to-do rows.
- **i18n:** §13 (`dashboard.heute.done`, `.snooze`, `.snooze_days`).
- **Acceptance:** dismissing/snoozing a to-do removes it and can empty the list into the calm state.

---

## D. Realism fixes (ALL spine; cite domain note) — mock-backend-coder, in `umzug.ts` + fixtures

> Each fix must be applied **consistently across all sites** — autopilot `umzug.ts` (BLOCK_A/B/D + the activity-log hook) AND the seeded fixtures in `vorgaenge.json`. The realism review found the SAME action carrying different norms in 3 places; convergence is the deliverable. Exact norm strings come from `docs/domain/umzug-konvenienz-und-normen.md`.

### D1. Finanzamt → Wohnsitz-FA, §19 AO — `[spine]` (realism G2)
- Route Anna's income-tax move to a **residence Finanzamt** (add `finanzamt-berlin-mitte-tiergarten` to `behoerden.json` if absent), NOT `finanzamt-koerperschaften-i-berlin`. `aktion`: "Mitteilung örtliche Zuständigkeit nach §19 AO". `rechtsgrundlage`: "§19 AO i.V.m. §36 BMG". **Drop `§39 AO` everywhere** (currently in umzug.ts + vorgaenge.json L52). Reserve `§139b AO` for the Steuer-ID only. [domain: D1-finanzamt]
- **Code touchpoints (verified):** update the `aktenzeichenForBehoerde` switch arm in `id.ts` from `finanzamt-koerperschaften-i-berlin` to the new id (the existing `aktenzeichenFinanzamt('11')` Berlin-format generator is reusable). Update BLOCK_A in `umzug.ts` + the FA letter body + `vorgaenge.json`.

### D2. eAT / ABH basis fix + §86/§87 sync — `[spine]` (realism G1)
- ABH/LEA address step: replace the §87 AufenthG citation (umzug.ts L213, vorgaenge.json L41) with the eID basis (`§18 PAuswG`) + framing "Antrags-/Termin-gebunden — kein Melderegister-Push (AZR-Abruf on-demand)". Make all three sites consistent (drop the §86 vs §87 disagreement). No fabricated Melderegister→ABH auto-push. [domain: D2-abh]

### D3. Krankenkasse single basis — `[spine]` (realism G3)
- ONE basis everywhere for the citizen KK notification: **Art. 6 Abs. 1 lit. a DSGVO** (optionally + §206 SGB V). **Drop §28a SGB IV / DEÜV** from the citizen path (umzug.ts L339 — that's the employer→KK duty, not this). Fix the lit. a vs lit. b drift across live step (L145) + fixture (L140) + log. [domain: D3-krankenkasse]

### D4. Wohnungsgeberbestätigung §19 BMG — `[spine]` (realism G6)
- Surface the Wohnungsgeberbestätigung (§19 BMG) as a **satisfied prerequisite** on the Bürgeramt step ("Nachweis aus EUDI-Wallet beigefügt") OR a Block-C self-task. The start screen already references a Wohnungsgeber upload (`UmzugInput.wohnungsgeber_bestaetigung_dataurl`); if present, mark it satisfied on the step. [domain: D4-wohnungsgeber]

### D5. Steuer-IdNr immutability §139b AO — `[spine]` (realism G7)
- The FA confirmation letter (umzug.ts L98–110) adds one clause: "Ihre steuerliche Identifikationsnummer (§139b AO) bleibt unverändert; lediglich Ihre örtliche Steuernummer ändert sich durch den Zuständigkeitswechsel." Optionally surface IdNr in `aktenzeichen_weitere`. Pairs with D1. [domain: D5-steuer-id]

### D6. Arbeitgeber step — ELEVATED spine-critical — `[spine]` (realism G5)
- **The Loom headline names "Arbeitgeber"; it MUST appear in Anna's actual cascade.** Add an **Arbeitgeber Block-B** entry, gated `visibleIf: (p) => p.beschaeftigung?.typ === 'angestellt'` (Anna is `angestellt` → step fires; Mehmet is `selbstaendig` → no step, correct).
  - `aktion` "Adressänderung Personalstammdaten / Lohnabrechnung", `rechtsgrundlage` "Art. 6 Abs. 1 lit. b DSGVO — Durchführung des Arbeitsverhältnisses", `agent_label` "Wir informieren Ihren Arbeitgeber über Ihre neue Anschrift", `datenkategorien` `["neue_anschrift","einzugsdatum"]`. Generates a confirmation letter like the other Block-B steps.
- **VERIFIED from `personas.json`: Anna's employer is `Mittelstand Software GmbH`, NOT Zalando** (the gap reports/brief were imprecise). Add a Behörde entry to `behoerden.json` (`id: 'arbeitgeber-mittelstand-software'`, `kategorie: 'privat'`) + an `aktenzeichenForBehoerde` arm in `id.ts`. Include the Arbeitgeber step in the §A4 cold-open completed Vorgang too. [domain: D6-arbeitgeber]
- **CROSS-CUTTING (see §16.1):** Anna's flag set must make her live fan-out contain all six named Behörden — Arbeitgeber is the sixth hop.

### D7. Per-step `datenkategorien[]` on AutopilotStep — `[spine]` (realism G8)
- Add the field (§1.1), populate per recipient (values §B4 / domain note). Powers the B4 receipt; replaces the activity-log's hardcoded `field_id: 'anschrift_aktuell'` (umzug.ts L363) with the real per-hop field set. [domain: datenkategorien-pro-behoerde]

---

## 7. Assistant integration (assistant-engineer)

- **B1 mirror — post-run summary.** After `starte_umzug` completes (or when the user asks "was hast du erledigt?"), the assistant returns a short DE summary embedding the `ValueReceipt` (§B1): behörden_count, "ca." Zeitersparnis, klassische_schritte vs. "ein Satz". Pull via a NEW read-only tool `hole_ersparnis(vorgang_id)` → `api.getValueReceipt`. Numbers are "ca."/conservative — same source-of-truth (domain note); the assistant must NOT invent its own numbers.
- **No new orchestration tools** beyond `hole_ersparnis`. The existing confirm-gated `preview_umzug` → `starte_umzug` flow is UNCHANGED — do not regress the spine. `hole_ersparnis` is read-only, no confirm gate.
- **System-prompt addition (DE), one line:** "Wenn ein Umzug abgeschlossen ist, fasse die Ersparnis sachlich zusammen (ca.-Angaben aus der Vorgangs-Bilanz via Tool; erfinde keine Zahlen)."
- **Sample dialogue:**
  - U: "Was hast du erledigt?" → A: (calls `hole_ersparnis`) "Ihr Umzug ist an {N} Behörden gemeldet — Einwohnermeldeamt, Finanzamt, KFZ-Stelle, Krankenkasse, Beitragsservice und Ihr Arbeitgeber. Klassisch wären das ca. {klassische_schritte} Behördengänge/Anträge und rund {min} Minuten gewesen; Sie haben einen Satz gesagt. Alle Bestätigungen liegen in Ihrem Posteingang."
- **i18n:** assistant prose is generated text (not t()-keyed). Any chip/scaffolding labels use `convenience.assistant.*` (§13).
- **Acceptance:** the assistant's summary numbers EQUAL the timeline card numbers (same `getValueReceipt`), all "ca.".

### 7.3 Sample dialogues (assistant-engineer — built, tools wired)

> Implemented: two read-only, non-confirm-gated tools — `hole_ersparnis(vorgang_id)` → `api.getValueReceipt`, `hole_autopilot_katalog()` → `api.getAutopilotKatalog`. Dispatch entries in `TOOL_DISPATCH`; zod validator for `hole_ersparnis`; system-prompt capability + etiquette lines added (cached, DE-source). Numbers are spoken only from the tool result, always "ca.", flagged illustrative. The confirm-gated `preview_umzug` → `starte_umzug` flow is unchanged.

1. **Post-run / "Was hast du erledigt?"** (the headline beat)
   - U: „Was hast du erledigt?"
   - A: *(calls `hole_ersparnis` with the run's vorgang_id)* „Ihr Umzug ist an ca. 6 Behörden gemeldet — Einwohnermeldeamt, Finanzamt, KFZ-Stelle, Krankenkasse, Beitragsservice und Ihr Arbeitgeber; auch die Familienkasse wurde einbezogen. Klassisch wären das rund {klassische_schritte} Behördengänge bzw. Anträge und ca. {min} Minuten gewesen — Sie haben einen Satz gesagt. Alle Bestätigungen liegen in Ihrem Posteingang. (Die Zeitangabe ist eine konservative, illustrative Schätzung.)"
     *(Hinweis-Disclaimer angehängt.)*

2. **Zeitfrage ohne Run-Kontext** (graceful null)
   - U: „Wie viel Zeit habe ich gespart?"
   - A: *(calls `hole_ersparnis`; receipt is null because no step is confirmed yet)* „Dazu liegt mir noch keine abgeschlossene Bilanz vor — sobald der Umzug-Autopilot mindestens einen Schritt bestätigt hat, kann ich Ihnen die Ersparnis nennen."

3. **„Was kannst du noch automatisieren?"** (catalog, no over-promise)
   - U: „Was kannst du außer Umzug noch automatisieren?"
   - A: *(calls `hole_autopilot_katalog`)* „Heute verfügbar ist der **Umzug** — er informiert u. a. Bürgeramt, Finanzamt, KFZ-Stelle, Krankenkasse und Familienkasse für Sie. In Vorbereitung („demnächst") sind **Geburt eines Kindes** und die **Steuererklärung** — diese kann ich noch nicht starten, sie sind aber als nächste Lebenslagen geplant."

---

## 13. i18n — new DE-source keys (frontend-coder writes de.json; i18n-localizer does the other 5)

> All keys DE-source-of-truth. **Tiers:** spine items (A1/A4/A5/B*/C1/D*) → full 6-locale human-reviewed incl. AR-RTL. Supporting items (A2/A3-secondary/A-katalog/C2/C3/C4) → DE source + fast-drafted other locales flagged `needs_review` (per demo-spine rigor tiers).

| Key | DE value (source) | tier |
|---|---|---|
| `convenience.value_receipt.title` | "Ihre Ersparnis" | spine |
| `convenience.value_receipt.behoerden` | "Behörden informiert" | spine |
| `convenience.value_receipt.zeitersparnis` | "Zeit gespart (ca.)" | spine |
| `convenience.value_receipt.klassische_schritte` | "klassische Schritte" | spine |
| `convenience.value_receipt.ihr_aufwand` | "Ihr Aufwand" | spine |
| `convenience.value_receipt.ein_satz` | "ein Satz" | spine |
| `convenience.value_receipt.ca_prefix` | "ca." | spine |
| `convenience.value_receipt.disclaimer_conservative` | "Konservative Schätzung. [MOCK]" | spine |
| `convenience.step.basis_label` | "Rechtsgrundlage" | spine |
| `convenience.step.data_label` | "Übermittelte Daten" | spine |
| `convenience.receipt.toggle` | "Was wurde übermittelt?" | spine |
| `convenience.receipt.fields_label` | "Übermittelte Daten" | spine |
| `convenience.receipt.basis_label` | "Rechtsgrundlage" | spine |
| `convenience.receipt.consent_label` | "Einwilligung erteilt am" | spine |
| `convenience.receipt.minimierung_note` | "Datenminimierung: nur diese Felder werden übermittelt." | spine |
| `convenience.datenkat.neue_anschrift` | "neue Anschrift" | spine |
| `convenience.datenkat.einzugsdatum` | "Einzugsdatum" | spine |
| `convenience.datenkat.beitragsnummer` | "Beitragsnummer" | spine |
| `convenience.datenkat.steuer_id` | "Steuer-Identifikationsnummer" | spine |
| `convenience.datenkat.versichertennummer` | "Versichertennummer" | spine |
| `convenience.datenkat.familienstand` | "Familienstand" | spine |
| `convenience.assistant.run_summary_intro` | "Zusammenfassung Ihrer Ersparnis" | spine |
| `dashboard.triumph.title` | "Erledigt für Sie" | spine |
| `dashboard.triumph.subtitle` | "Umzug an {count} Behörden gemeldet — Sie mussten nichts tun." | spine |
| `dashboard.triumph.zeitersparnis` | "ca. {min} Min gespart" | spine |
| `dashboard.erledigt_feed.title` | "Automatisch erledigt für Sie" | spine |
| `dashboard.erledigt_feed.empty` | "Noch nichts automatisch erledigt." | spine |
| `dashboard.heute.empty_title` | "Heute nichts zu tun" | spine |
| `dashboard.heute.empty_body` | "Wir melden uns, wenn etwas ansteht." | spine |
| `dashboard.achievement.jahr` | "{count} Vorgänge dieses Jahr für Sie erledigt" | spine |
| `dashboard.heute.done` | "Erledigt" | supporting |
| `dashboard.heute.snooze` | "Später erinnern" | supporting |
| `dashboard.heute.snooze_days` | "Um {days} Tage verschoben" | supporting |
| `shared.gehoert_zu` | "Gehört zu: {vorgang}" | spine |
| `shared.neu_badge` | "neu" | spine |
| `termine.action.bestaetigen` | "Bestätigen" | supporting |
| `termine.action.verschieben` | "Verschieben" | supporting |
| `termine.action.absagen` | "Absagen" | supporting |
| `termine.action.confirm_cancel` | "Termin wirklich absagen?" | supporting |
| `dokumente.eudi.button` | "In EUDI Wallet exportieren (Vorschau)" | supporting |
| `dokumente.eudi.dialog_title` | "EUDI-Wallet-Export — Vorschau [MOCK]" | supporting |
| `dokumente.eudi.disclaimer_2027` | "[MOCK] Simulierte EUDI-Wallet-Vorschau. Die EUDI Wallet befindet sich 2027 im Rollout; hier wird kein echter Nachweis exportiert." | supporting |
| `dokumente.eudi.download` | "Vorschau herunterladen" | supporting |
| `dokumente.eudi.mock_badge` | "[MOCK]" | supporting |
| `katalog.titel` | "Autopilot-Katalog" | supporting |
| `katalog.umzug.titel` | "Umzug" | supporting |
| `katalog.kindergeburt.titel` | "Geburt eines Kindes" | supporting |
| `katalog.steuererklaerung.titel` | "Steuererklärung" | supporting |
| `katalog.status.live` | "verfügbar" | supporting |
| `katalog.status.demnaechst` | "demnächst" | supporting |

> `agent_label`, `aktion`, and `datenkategorien` values per step are DATA (DE) on the mock-backend, not t()-keys — they travel with the step. **i18n-localizer does NOT translate per-step `agent_label` in Pass-1** (the demo runs in DE; other locales render the DE content with the static chrome translated). Note this in the locale handoff.

---

## 14. Accessibility notes (a11y-tester gate)

- **Count-ups (ValueReceiptCard, animated stat transitions):** `prefers-reduced-motion: reduce` → render final value instantly, no tween.
- **Cascade animation (BehoerdenStatusList):** reduced-motion → steps resolve instantly to final state; no staggered motion.
- **Triumph banner:** `aria-live="polite"` ONLY when it appears as a result of a live in-session run; the seeded cold-open instance is static (no live-region announcement) to avoid SR spam on load.
- **Übermittlungs-Receipt disclosure:** `<button aria-expanded controls=panelId>`; panel `role="region"`; collapsed by default; keyboard-operable.
- **New artefacts:** `[MOCK]` markers are real text (not background images) so SR reads them.
- **Erledigt feed:** semantic list; each item's relative time uses `<time datetime>` with an accessible absolute-date title.
- Lighthouse a11y > 95 on Dashboard + autopilot run + Dokumente.

---

## 15. Review checklist (code-reviewer — final gate)

- [ ] No hardcoded chrome strings — all via `t()`; only `agent_label`/`aktion`/`datenkategorien` are DE data (allowed).
- [ ] **Every value-receipt number traceable to `docs/domain/umzug-konvenienz-und-normen.md`** (grep each number against the note). No invented numbers; all "ca.".
- [ ] All six D-fixes applied consistently across `umzug.ts` + `vorgaenge.json` + the activity-log hook (no norm disagreeing across sites).
- [ ] **Anna's live cascade and the §A4 cold-open show the SAME Behörden the (updated) Loom audio names** — six core hops (Bürgeramt, Wohnsitz-Finanzamt, Beitragsservice/Rundfunk, AOK Nordost, Arbeitgeber=Mittelstand Software GmbH, KFZ) + Familienkasse if `kindergeld_bezug` stays true — in lane order A→B→D. No hop the narration does not name; none it names is missing. Anna `kfz_halter` flipped to `true` (§16.1).
- [ ] A document event + `termin_created` emitted on mint; Dokumente/Termine update live (no double-emit per mint).
- [ ] Every minted artefact + the EUDI export carries `[MOCK]`; EUDI export is unmistakably a preview (§C3).
- [ ] No persona data leak — every list read filtered by owner persona (§A3).
- [ ] No Vorgang-detail dead/wrong-year links (§A5); 2026 Umzug not reusing the 2024 letter.
- [ ] Count-ups + cascade respect `prefers-reduced-motion`.
- [ ] Spine e2e (`tests/e2e/spine.spec.ts`) still green; new artefacts asserted.
- [ ] Types mirrored in `src/types/*` AND `docs/architecture.md`.

---

## 16. CROSS-CUTTING decisions (resolved here so coders don't ask)

### 16.1 "Sechs Behörden" vs Anna's persona flags — RESOLVED
The Loom (Szene 0/5) and the headline name **six** Behörden: Einwohnermeldeamt, Finanzamt, KFZ-Stelle, Krankenkasse, Rundfunkbeitrag (Beitragsservice), Arbeitgeber. The realism review flagged that KFZ + Familienkasse only appear for personas with the right flags. **Verified in `src/data/personas.json`: Anna is currently `kfz_halter: false`, `kindergeld_bezug: true`** — the exact mismatch (her live fan-out omits KFZ, the headline's third hop, and could add a 7th Familienkasse hop that muddies "sechs").

**DECISION — tune Anna's flag set so her live cascade contains exactly the six named Behörden, no more, no fewer:**
- **Flip Anna to `kfz_halter: true`** → surfaces the **KFZ-Stelle** Block-D hop (she already has a `mobilitaet.halter` VW Polo seeded, so this is consistent).
- **Add Arbeitgeber** as a Block-B step (§D6) → the sixth named hop.
- Block A: **Einwohnermeldeamt** (Anmeldung) + **Wohnsitz-Finanzamt** (§D1).
- Block B: **Krankenkasse** + **Beitragsservice (Rundfunk)** + **Arbeitgeber**.
- **Familienkasse / Kindergeld (`kindergeld_bezug: true` — VERIFIED; Anna has child Lev) — the one genuine tension.** The umzug autopilot currently gates a Familienkasse Block-D step on `kindergeld_bezug`, so Anna's live run today fans out Familienkasse + ABH but NOT KFZ — a hop the audio never names. **DECISION (preferred): keep `kindergeld_bezug: true` and ADD "Familienkasse" to the Loom audio's named list** — she genuinely has a dependent; a cascade the narration fully acknowledges is more honest than silently deleting her child. Net live cascade = the six core + Familienkasse (7), narration updated to match. **Fallback if the recording is locked:** set `kindergeld_bezug: false` for Anna so the run is exactly six — but this contradicts her seeded family (Lev) + the Kindergeld Vorgang (§A5), so it is the second choice. Either way: **what the audience hears MUST equal what the live cascade shows.** Flag to orchestrator (§16.4).
- The **eAT/ABH hop (§D2)** is a teil-automatisierter extra (Anna is Blue Card, `§18g AufenthG`) shown as termin-gebunden; it is NOT counted in the "sechs" headline — present it as the additional aufenthaltsrechtliche step, framed honestly (it produces the LEA Termin in §C1).

mock-backend-coder pulls the canonical six-Behörde list + the exact flag values from `docs/domain/umzug-konvenienz-und-normen.md`. **If the note's six differ from the Loom script's six, the note wins and the orchestrator updates the Loom — flag the discrepancy in your handoff, do not silently diverge.**

### 16.2 Events
A document-mint event (reuse `document_added` if already wired, else `document_created`) and `termin_created` (new) MUST fire at mint time (§C1). `termin_updated`/reuse for §C2 is mock-backend's call but must exist for the Termine ops. Never emit two events for one mint.

### 16.3 Type-change list (single source — mock-backend ships, mirrors to architecture.md)
`agent_label` + `datenkategorien` on AutopilotStep (+ AutopilotStepDraft); `ValueReceipt`; document-mint + `termin_created` (+ maybe `termin_updated`) event variants; `autopilot_highlight` + `erledigt_feed` on DashboardSnapshot; `meta.seeded_at` (req) + `meta.clock_offset_ms` (opt); `AutopilotKatalogEntry`; `EudiExportPreview`; `owner_persona_id` on `Document`/`Termin`/`Reminder` (§A3 — note `Reminder` already has `persona_id?`; reconcile to ONE owner field, prefer `owner_persona_id`); possibly `meldebestaetigung`/`zulassungsbescheinigung_teil_i` in the Document `typ` union; possibly `'verschoben'` in `TerminStatus`.

### 16.4 Open decisions I made (for domain-note / orchestrator sign-off)
1. **Anna's flags (Loom staging) — biggest decision.** Flip `kfz_halter` → `true` (she owns a VW Polo in `mobilitaet.halter[]` — consistent, adds the audio's "KFZ-Stelle"); KEEP `kindergeld_bezug: true` and name Familienkasse in the audio rather than delete child Lev; Arbeitgeber gated on `angestellt`. Touches the locked Loom narration ("sechs Behörden") → needs orchestrator sign-off (§16.1).
2. **§A4 vs live Umzug ids:** cold-open completed run gets a NEW id (e.g. `vg-anna-umzug-2026-completed`); existing `vg-anna-umzug-skalitzer-friedrichstr` stays the live-fired one. Confirm no collision with the spine e2e fixture (`tests/e2e/spine.spec.ts`).
3. **`document_created` vs existing unused `document_added`:** I specified adding/emitting `document_created`; mock-backend may instead emit the existing `document_added` if it wires it up — pick one, note in architecture.md, never double-emit.
4. **A2 clock:** engine-only + DEFER-LAST, with an explicit "ship as documented stub if threading is risky" escape hatch to protect the spine from a half-threaded clock.
5. **Reminder owner field:** reconcile `persona_id?` vs new `owner_persona_id?` to one field (prefer the latter for cross-entity consistency).

---

## 17. Out of scope (explicit — Pass-2 or never)

- **Vertical autopilots E1 (Kindergeburt) / E2 (Steuererklärung) orchestration** — Pass-2. Only the A-katalog "demnächst" teaser ships in Pass-1.
- **Aufenthaltstitel-Verlängerung autopilot** — not even teased as `live`; stays guided/teilautomatisiert.
- **Soft-fail + retry branch** (ux GAP 4.3) — risky in a 3-min Loom; not in Pass-1.
- **Cancel/undo mid-run affordance** (ux GAP 4.4) — the confirm-gate is sufficient for Pass-1.
- **Schulamt/Kita school-age gating** (realism G11, low-confidence §) — out.
- **`simulateIncomingLetter()` presenter tool** — out of Pass-1 (the clock anchor §A1 covers the liveness need).
- **Real EUDI / DeutschlandID integration** — never; always `[MOCK]`.
- **Per-step `agent_label` translation into the 5 non-DE locales** — out of Pass-1 (DE demo).

---

## Build log — frontend-coder
- date: 2026-05-30
- screens implemented: Dashboard (`/dashboard`), Autopilot-Run (`/vorgaenge/umzug/run`), Vorgang-Detail/cold-open (`/vorgaenge/umzug/[id]`), Termine (`/termine`), Dokumente (`/dokumente`)
- components created:
  - `src/components/autopilot/ValueReceiptCard.tsx` (§B1 — count-up respects prefers-reduced-motion; `live` vs `static` variant; aria-live only on live)
  - `src/components/autopilot/UebermittlungsReceipt.tsx` (§B4 — `<button aria-expanded controls>` → `role=region` disclosure, collapsed default; datenkategorien + rechtsgrundlage + consent timestamp)
  - `src/components/autopilot/AutopilotKatalogTeaser.tsx` (§A-katalog — Umzug live/actionable, Kindergeburt+Steuererklärung "demnächst" disabled, real Behörden names)
  - `src/components/dashboard/TriumphBanner.tsx` (§B2 — mirrors receipt numbers, "gerade eben" `<time>`, aria-live only on `live`)
  - `src/components/dashboard/ErledigtFeed.tsx` (§B2 — semantic `<ul>`, agent_label primary, `<time>` relative+absolute title)
  - `src/components/dokumente/EudiExportDialog.tsx` (§C3 — `[MOCK]` payload + 2027 disclaimer; role=dialog, Esc/focus; download writes MOCK JSON)
- components modified:
  - `src/components/dashboard/DashboardView.tsx` — full t()-ification (was hardcoded), triumph banner + erledigt feed + calm empty state + to-do dismiss/snooze (§C4) + katalog; derives "letzter Login vor N Tagen" from `snapshot.last_login_at` (replaced hardcoded 23)
  - `src/components/umzug/BehoerdenStatusRow.tsx` (§B3 — agent_label PRIMARY line, aktion+§ trust subline, embeds UebermittlungsReceipt)
  - `src/app/(app)/vorgaenge/umzug/run/page.tsx` — ValueReceiptCard on completion (variant=live), cascade cards/feed now show agent_label
  - `src/app/(app)/vorgaenge/umzug/[id]/page.tsx` — ValueReceiptCard for completed Vorgang (variant=static) + minted-document deep-links via getVorgangRelated (§A4/§A5)
  - `src/components/termine/TermineView.tsx` (§C2 — bestätigen/verschieben/absagen wired to api, optimistic + confirm-on-cancel; live subscribe to termin_created/termin_updated)
  - `src/components/dokumente/DokumenteView.tsx` (§C1 — live subscribe to document_added, "neu" dot, [MOCK] badge, Gehört-zu chip, EUDI export button §C3)
  - `src/app/prototype-v2.css` — added all Pass-1 component CSS (vr-card, triumph, erledigt-feed, heute-empty, heute-actions, katalog-grid, gehoert-zu-chip, btn-sm/btn-danger, reduced-motion) using the existing prototype-v2 token set
- i18n key namespaces added to de.json (DE source — for i18n-localizer):
  - `convenience.*` (value_receipt, step, receipt, datenkat, assistant) — spine
  - `katalog.*` (titel, untertitel, behoerden_label, starten, umzug/kindergeburt/steuererklaerung, status) — supporting
  - `dashboard.*` additions: triumph, erledigt_feed, achievement, heute.{empty_title,empty_body,done,snooze,snooze_days,actions_label}, kacheln, seit_login, prototyp_hinweis, letzter_login, greeting.guten_tag, fehler, titel/untertitel (existing keys kept; new aliases added)
  - `termine.action.*` — supporting
  - `dokumente.eudi.*` — supporting
  - `shared.{gehoert_zu,neu_badge}` — spine
  - `umzug.detail.dokumente_count` (plural)
- typecheck: pass (`tsc --noEmit` clean)
- lint: not confirmed this session (Bash output channel stalled mid-run; no `any`/`@ts-ignore`/`console.log` introduced; imports pruned). code-reviewer to re-run `npm run lint`.
- known gaps / follow-ups:
  - `dashboard.heute_zu_tun.*` legacy keys still exist alongside the new `dashboard.heute.*` — i18n-localizer/code-reviewer may consolidate; I kept both to avoid breaking any other consumer.
  - The erledigt-feed letter deep-link uses `/posteingang?brief=<id>`; confirm Posteingang reads that param (it is the existing convention used elsewhere).
  - Triumph banner is always `variant="static"` on the dashboard (cold-open seed). A genuinely in-session live arrival would need a transient `variant="live"` signal from the run flow — deferred (cold-open seed is the demo path).
  - `npm run build` not run this session (sandbox/output constraints); typecheck is green. Recommend code-reviewer runs `npm run build` + spine e2e.
- next: i18n-localizer (translate the new namespaces), a11y-tester (count-up/disclosure/aria-live/[MOCK] audit), code-reviewer (final gate + build + e2e)
