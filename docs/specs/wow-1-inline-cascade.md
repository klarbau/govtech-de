# Spec — Wow #1: Kontinuierlicher Kaskaden-Moment (Inline-Kaskade im Chat)

```yaml
track: spine
status: ready-to-build
source: docs/research/wow-backlog.md §1 (PROCEED, alle fünf gefalteten Kandidaten)
domain:  docs/domain/umzug-konvenienz-und-normen.md §2 (Pro-Schritt-Normen) + §4 (Disclaimer) + §D7 (Datenkategorien)
owners:  mock-backend-coder (§5), frontend-coder (§4 + §6), assistant-engineer (§7), i18n-localizer (§8)
gate:    tests/e2e/spine.spec.ts MUST stay green (existing assertions unchanged; additive only)
```

> **One-sentence pitch:** "Sie sagen *ich ziehe um*, bestätigen einmal — und sehen die Behörden direkt im Chat grün aufleuchten, mit einer Quittung, die zählt, was Sie NICHT tun mussten." The emotional payoff stops requiring a click away from the thread.

---

## 1. Problem & decided design (no open questions)

Today, after the citizen confirms the Umzug, `ToolCallCard.tsx:90–98` renders ONLY a link "Kaskade ansehen →" to `/vorgaenge/umzug/run`. The hero — live Behörden cascade + value receipt + "watch them land" — plays on a **separate page**. In a 3-minute Loom this breaks the single continuous *"ich sprach → es handelte → ich sah zu → hier die Quittung"* beat.

**Decided (locked by the user — do not relitigate):**

1. **Inline hero + a quiet kept link.** The cascade plays INLINE in the chat thread, directly under the `starte_umzug` ToolCallCard. A secondary link to `/vorgaenge/umzug/run` stays for the detailed/historic view. `/run` and `/vorgaenge/umzug/[id]` stay **fully intact**.
2. **Full beat inline:** live Behörden rows (agent voice) + `ValueReceiptCard variant='live'` + a **Once-Only counter** ("ca. N Felder, die Sie nicht ausfüllen mussten") + a **Stammdaten source line** ("Quelle: Ihre Stammdaten, einmal bestätigt am …") + **confirmations visibly landing in Posteingang** ("X Bestätigungen im Posteingang").
3. **The Once-Only number is DERIVED, not invented:** computed from the per-step `datenkategorien` already attached to each autopilot step. Honest, defensible, prefixed "ca.".

This is a **presentation re-wire of already-validated data**. No new capability, no new data flow, no new backend event. Components and events already exist (`ValueReceiptCard variant='live'`, `BehoerdenStatusRow`, `autopilot_step` + `letter_received` events).

---

## 2. Hard constraints (encode verbatim; coders must not weaken)

| # | Constraint | Why |
|---|---|---|
| C1 | **DO NOT BREAK `tests/e2e/spine.spec.ts`.** Keep a link whose accessible name is exactly **"Kaskade ansehen"**, whose `href` contains `/vorgaenge/umzug/run?vorgangId=vorgang-`. The inline cascade is **additive** — render it ABOVE the kept link, never rename or remove the link. | Spine = demo-shipped gate. |
| C2 | **DO NOT refactor `src/app/(app)/vorgaenge/umzug/run/page.tsx`.** It carries a "Subscribes to the autopilot tick stream — DO NOT BREAK" warning and `.cascade-cards .cas-card` is asserted by the spine. The inline component is a NEW, compact component that REUSES the same data source (`api.subscribe` tick stream + `api.getVorgang` + `api.getValueReceipt`), NOT an extraction that mutates run/page.tsx's DOM. | Spine rides on run/page.tsx output byte-stability. |
| C3 | **Disclaimer travels with the cascade.** The conditional "[MOCK] — simuliert; keine reale Übermittlung" disclaimer MUST appear in the inline beat in the chat (domain §4). Do not lose it when moving the moment into the thread. | First place an NKR/DigitalService viewer says "belegen Sie das". |
| C4 | **Per-Behörde consequence texts match authoritative norms** (domain §2). Reuse `step.agent_label` (already authoritative) as the agent-voice line; do NOT author new consequence prose that could drift. The receipt's pro-Behörde context comes from existing step data. eAT address is user-driven §18 PAuswG (NOT auto-pushed); Steuer-IdNr §139b AO is constant (only örtliche Steuernummer changes). | Realism guardrail. |
| C5 | **Beitragsservice (Anstalt) + Arbeitgeber (private Stelle) are NOT Behörden** and MUST NOT be counted in any "Behörden"-number. Reuse the existing `PRIVATE_ODER_ANSTALT` exclusion set in `value-receipt.ts` — do not duplicate it. | Honest count (domain §3). |
| C6 | **All numbers prefixed "ca."/"geschätzt."** The Once-Only number uses the existing `convenience.value_receipt.ca_prefix` ("ca."). No false precision. | Anti-overclaim §1b. |
| C7 | **a11y — exactly ONE `aria-live="polite"` region** for the inline beat. `ValueReceiptCard variant='live'` ALREADY sets `aria-live="polite"` on its own `<section>`. The inline cascade MUST NOT wrap the receipt in a second live region (double announce). The live rows + counters live in their OWN single polite region that does NOT contain the receipt. See §9. | Avoid screen-reader spam. |

---

## 3. Screen flow (the continuous beat)

```
Assistent thread (existing) — user: "leite meinen Umzug ein"
  └─ assistant proposes  → <UmzugConfirmCard> (existing, unchanged)
       └─ user clicks "Umzug starten"  (existing confirm-gate)
            └─ <ToolCallCard call=starte_umzug>  (existing)
                 ├─ ① ToolCallCard header: "Umzug gestartet …"        (existing)
                 ├─ ② ★ NEW: <InlineCascade vorgangId variant="live"/> (this spec)
                 │     ├─ live Behörden rows: Spinner → grüner Haken + agent_label
                 │     ├─ <ValueReceiptCard variant="live"/>  (count-up, when run done)
                 │     ├─ Once-Only counter: "ca. N Felder, die Sie nicht ausfüllen mussten"
                 │     ├─ Quellzeile: "Quelle: Ihre Stammdaten, einmal bestätigt am …"
                 │     ├─ Posteingang-landing: "X Bestätigungen im Posteingang →"
                 │     └─ Disclaimer: "[MOCK] — simuliert; keine reale Übermittlung."
                 └─ ③ Kept quiet link: "Kaskade ansehen →"  (existing, unchanged)
```

**Timing.** The inline component subscribes to the same `autopilot_step` tick stream the run page does. Rows flip in real time as Block-A steps confirm (the in-process `runAutopilotInBackground` is already running by the time `starte_umzug` resolves). When `vorgang.status === 'abgeschlossen'` (or all Block-A steps confirmed), it fetches the value receipt once and the count-up + counters render.

**Reduced motion.** Global reduced-motion path already exists (`ValueReceiptCard` count-up checks `prefers-reduced-motion`; rows use no bespoke animation beyond the shared spinner). Inline component adds NO new motion that isn't gated.

---

## 4. Component inventory

### 4.1 NEW — `InlineCascade` (frontend-coder owns)

| Field | Value |
|---|---|
| **File** | `src/components/autopilot/InlineCascade.tsx` |
| **Directive** | `'use client'` (subscribes to events, holds state) |
| **Export** | `export function InlineCascade(props: InlineCascadeProps)` |

```ts
interface InlineCascadeProps {
  /** Live run id. Subscribes to api tick stream for this vorgang. */
  vorgangId: string;
  /** 'live' (in-session, the only caller for now) → animated, single polite region. */
  variant?: 'live';
  className?: string;
}
```

**What it renders (top → bottom), all strings via `t('convenience.inline_cascade.*')` / reused keys):**

1. **Live Behörden rows** — one compact row per cascade step (Block-A first, then visible Block-D/B), mirroring `run/page.tsx`'s derivation (block-C filtered, A→D→B sorted, sliced to ≤5). Each row: status icon (Spinner while `in_progress`/`needs_eid`, green Check when `confirmed`), `BehoerdenBadge` name, and the agent-voice primary line `step.agent_label ?? step.aktion`. **Reuse the visual language of `BehoerdenStatusRow`** (status icon tones, agent-voice-as-primary). `BehoerdenStatusRow` itself is an **async server component** (`getTranslations`) — it CANNOT be mounted inside this client component. Either: (a) render a compact inline row inline with the same `statusViz` tone map + `BehoerdenBadge` (client-safe) + `useTranslations`, or (b) factor a tiny presentational client row. **Do NOT import `BehoerdenStatusRow` directly.** Do NOT edit `BehoerdenStatusRow.tsx`.
2. **`<ValueReceiptCard receipt={receipt} variant="live" />`** — mounted only once `receipt` is non-null. This card OWNS its own `aria-live` region (see C7) — render it OUTSIDE the inline component's own live region.
3. **Once-Only counter** — `ca. {once_only_fields} {label}` where label = `t('convenience.inline_cascade.once_only_label')` ("Felder, die Sie nicht ausfüllen mussten"). `ca.` via existing `convenience.value_receipt.ca_prefix`. Render only when `receipt` present (so the number is final, not flickering mid-run).
4. **Stammdaten-Quellzeile** — `t('convenience.inline_cascade.source_line', { datum })` → "Quelle: Ihre Stammdaten, einmal bestätigt am {datum}." `datum` is German-formatted (`dd.MM.yyyy`) from the receipt's new `stammdaten_bestaetigt_am` field (§5).
5. **Posteingang-landing line** — `t('convenience.inline_cascade.posteingang_landing', { count })` → "{count} Bestätigungen im Posteingang", rendered as a Next `<Link href="/posteingang">` (keyboard-operable, focusable). `count` = number of distinct `letter_received` events seen for this vorgang during the run (the component counts them from the tick stream; see §6.3). The link's accessible name includes the count.
6. **Disclaimer** — `t('convenience.inline_cascade.disclaimer')` → "[MOCK] — simuliert; keine reale Übermittlung." (C3). Small, muted, always present.

**Data source (§6).** Subscribes to `api.subscribe`, fetches `api.getVorgang(vorgangId)`, `api.getBehoerden()`, and once-complete `api.getValueReceipt(vorgangId)`. Same three primitives the run page uses. **Offline-graceful:** if `getValueReceipt` rejects, render rows + posteingang line without the receipt/counters (nice-to-have, never crash) — mirror run/page.tsx's try/catch posture.

### 4.2 Reused, unchanged

| Component | File | Use |
|---|---|---|
| `ValueReceiptCard` | `src/components/autopilot/ValueReceiptCard.tsx` | mounted as-is, `variant="live"`. **No prop change.** |
| `BehoerdenBadge` | `src/components/shared/BehoerdenBadge.tsx` | name + kategorie in rows |
| `IconCircle` / status tones | shared | row status icon |
| `api` | `src/lib/mock-backend` | `subscribe`, `getVorgang`, `getBehoerden`, `getValueReceipt` |

### 4.3 Touched, additive-only

| Component | File | Change |
|---|---|---|
| `ToolCallCard` | `src/components/assistent/ToolCallCard.tsx` | mount `<InlineCascade>` above the kept link (§7). assistant-engineer owns. |
| `ValueReceipt` type | `src/types/value-receipt.ts` | + 2 fields (§5). mock-backend owns. |
| `computeValueReceipt` | `src/lib/mock-backend/value-receipt.ts` | derive the 2 new fields (§5). mock-backend owns. |

---

## 5. Data / type contract — ValueReceipt extension (mock-backend-coder owns)

### 5.1 Type change — `src/types/value-receipt.ts`

Add **two** fields to the `ValueReceipt` interface (keep all existing fields, do not reorder existing ones):

```ts
export interface ValueReceipt {
  // … existing fields unchanged …
  ihr_aufwand_schritte: 1;

  /**
   * Once-Only-Zähler: Summe der pro Schritt wiederverwendeten Datenkategorien
   * über alle bestätigten Schritte (NICHT dedupliziert über Schritte hinweg —
   * jede Übermittlung eines Feldes an eine Stelle ist ein vermiedenes Ausfüllen).
   * Abgeleitet aus `step.datenkategorien`, KEINE erfundene Zahl. Immer mit „ca."
   * gerendert (Anti-Overclaim §1b). [domain: §D7]
   */
  once_only_fields: number;

  /**
   * Quelle der Wiederverwendung: ISO-Datum, an dem die Stammdaten-Anschrift zuletzt
   * bestätigt wurde. Speist die „Quelle: Ihre Stammdaten, einmal bestätigt am …"-Zeile.
   * Ableitung: `verifiziert_am` des Anschrift-Feldes der Persona, sonst Fallback
   * `vorgang.angelegt_am`. [domain: Once-Only / RegMoG]
   */
  stammdaten_bestaetigt_am: string;
}
```

### 5.2 Derivation algorithm — `src/lib/mock-backend/value-receipt.ts`

`computeValueReceipt(vorgang)` already filters `confirmed` steps and already holds `PRIVATE_ODER_ANSTALT`. Extend it:

**`once_only_fields` (the Once-Only count):**

```
let onceOnly = 0;
for (const step of confirmed) {
  // jede Datenkategorie, die in diesem Hop wiederverwendet wurde, ist ein Feld,
  // das die Bürgerin NICHT erneut ausfüllen musste. Zählt ALLE Hops, auch
  // private/anstaltliche Empfänger (Once-Only gilt für Datenwiederverwendung,
  // nicht nur für Behörden — anders als behoerden_count, C5).
  onceOnly += Array.isArray(step.datenkategorien) ? step.datenkategorien.length : 0;
}
// once_only_fields = onceOnly
```

- **Counting rule:** sum of `datenkategorien.length` over **all confirmed steps** (NOT deduped across steps — each `Feld → Stelle` transmission is one avoided manual entry; this is the honest "Tell Us Once" framing). Pure function of step data already attached by the autopilot (§ umzug.ts `datenkategorien` per entry).
- **Scope note (decision, see §11 Risk R1):** unlike `behoerden_count`, the Once-Only count INCLUDES private/anstalt recipients, because Once-Only is about *data reuse* ("you didn't fill this form"), which is real regardless of recipient type. `behoerden_count` (which must exclude Anstalt/private, C5) is a different, already-correct number. Keep them distinct.
- **Worked example (Anna, reliable mode, Block A only — 4 confirmed steps):** Bürgeramt `[neue_anschrift, einzugsdatum, familienstand]`=3 · Finanzamt `[neue_anschrift, steuer_id]`=2 · Beitragsservice `[neue_anschrift, einzugsdatum, beitragsnummer]`=3 · Bundesdruckerei `[neue_anschrift]`=1 → **`once_only_fields = 9`** for Block-A-only. With Anna's Block-D/B steps confirmed the number grows accordingly. UI renders "ca. 9". The number is a deterministic function of which steps confirmed — defensible.

**`stammdaten_bestaetigt_am`:**

```
// Persona-Anschrift-Feld verifiziert_am, sonst Vorgang.angelegt_am.
// computeValueReceipt erhält bereits `vorgang`; lade die Persona via vorgang.persona_id
// ODER (einfacher, da api.ts den Profil-Loader hält) leite es im api.getValueReceipt-
// Wrapper ab und übergib es an computeValueReceipt als zweites Argument.
```

- **Implementation note:** `computeValueReceipt(vorgang)` is currently pure on `Vorgang`. To get `verifiziert_am` of the address field it needs the persona. Two acceptable shapes (mock-backend's choice, pick the cheaper):
  - **(A, preferred)** change signature to `computeValueReceipt(vorgang, stammdatenBestaetigtAm: string)` and compute `stammdatenBestaetigtAm` in the `api.getValueReceipt` wrapper (which already has `loadProfile()` available — see api.ts:2515). Pass `persona.stammdaten?.<anschrift-feld>.verifiziert_am ?? vorgang.angelegt_am`.
  - **(B)** load the profile inside `computeValueReceipt`. Avoid if it adds a store dependency to a pure helper.
- Update the **`run/page.tsx` caller is unaffected** (it calls `api.getValueReceipt(id)`, not `computeValueReceipt` directly — verify with codegraph before changing the signature; if any OTHER caller passes one arg, default the new param).
- **Do not** invent a date. If no `verifiziert_am` exists on the address field, fall back to `vorgang.angelegt_am` (always present).

### 5.3 No new event

`autopilot_step` and `letter_received` already carry everything the inline component needs. **Do not add a new MockBackendEvent.** (§ mock-event.ts is unchanged.)

---

## 6. Inline data wiring (frontend-coder owns) — mirror, don't extract

The inline component re-implements the **minimal** subset of run/page.tsx's subscription logic. It must NOT import from run/page.tsx (that file has no exports anyway) and must NOT alter it.

### 6.1 Initial fetch
```
useEffect on [vorgangId]:
  api.getVorgang(vorgangId) → setVorgang
  api.getBehoerden() → behoerdenById map (name_de + kategorie)
```

### 6.2 Tick subscription (same shape as run/page.tsx:162–189)
```
useEffect on [vorgangId]:
  unsub = api.subscribe((e) => {
    if (e.type === 'autopilot_step' && e.vorgangId === vorgangId) → merge step into vorgang.schritte
    if (e.type === 'vorgang_status_changed' && e.vorgangId === vorgangId) → update status
    if (e.type === 'letter_received') → increment posteingangCount (only count letters whose vorgang_id === vorgangId)
  })
  return unsub
```
> **Note:** `letter_received` payload is `{ letter }`; filter on `e.letter.vorgang_id === vorgangId` so only this run's confirmations are counted.

### 6.3 Posteingang count
`posteingangCount` = count of distinct `letter_received` events (by `letter.id`, deduped) seen for this vorgang during the live session. Use a `Set<string>` of letter ids in a ref → `setPosteingangCount(set.size)`. This is the honest "watch them land" number.

### 6.4 Receipt fetch (same guard as run/page.tsx:213–229)
```
useEffect on [vorgang]:
  if status !== 'abgeschlossen' return
  if alreadyFetched return
  api.getValueReceipt(vorgang.id) → setReceipt   // try/catch, receipt is nice-to-have
```
> If the run never reaches `abgeschlossen` within the session (e.g. a Block-D step stays `pending_eid_confirmation`), the receipt may not arrive — acceptable; rows + posteingang line still render. (For the spine demo Block-A completes; the receipt arrives once `vorgang.status === 'abgeschlossen'`, which the existing `runAutopilotInBackground` sets — verify the status-set path is reached for the assistant-triggered run as it is for the UI run.)

### 6.5 Cascade node derivation
Reuse run/page.tsx's logic conceptually: filter `block !== 'C'`, sort A→D→B (`BLOCK_RANK`), slice to 5. A small **shared pure helper** is allowed (e.g. `src/lib/autopilot/cascade-nodes.ts` exporting `deriveCascadeNodes(vorgang, behoerdenById)`) **only if** run/page.tsx's rendered DOM stays byte-identical after adopting it — otherwise just duplicate the ~15 lines in the inline component (duplication is cheaper than risking C2). **Default: duplicate.** Do not refactor run/page.tsx to consume a shared helper in this change.

---

## 7. ToolCallCard wiring (assistant-engineer owns)

In `src/components/assistent/ToolCallCard.tsx`, when `isUmzugStart && call.vorgangId`, render `<InlineCascade>` **above** the kept "Kaskade ansehen" link. The link block (lines 90–98) stays **exactly as is** (same `href`, same `t('cta_kaskade')` accessible name "Kaskade ansehen").

```tsx
import { InlineCascade } from '@/components/autopilot/InlineCascade';
// …
{isUmzugStart && call.vorgangId ? (
  <>
    <InlineCascade vorgangId={call.vorgangId} variant="live" />
    <Link
      href={`/vorgaenge/umzug/run?vorgangId=${encodeURIComponent(call.vorgangId)}`}
      className="inline-flex items-center gap-1 self-start text-sm font-medium text-primary hover:text-primary-hover"
    >
      {t('cta_kaskade')}
      <ArrowRight className="size-4 rtl:-scale-x-100" aria-hidden="true" />
    </Link>
  </>
) : null}
```

- **One-liner:** mount `<InlineCascade vorgangId={call.vorgangId} variant="live" />` immediately before the existing `<Link>` "Kaskade ansehen", inside the same `isUmzugStart && call.vorgangId` branch, wrapped in a fragment.
- `ToolCallCard` already lives inside a `<div role="status">`; the inline component's own polite region is fine within it (the outer `role="status"` is for the header line). Keep `InlineCascade` visually inside the card body (it already is, as a child of the `flex-col` content div).
- Assistant-engineer does NOT edit `InlineCascade.tsx` or `value-receipt.ts` — only this mount.

---

## 8. i18n key table (i18n-localizer owns — adds to ALL 6 locales)

**Namespace:** `convenience.inline_cascade.*`. Add this block to `src/lib/i18n/locales/de.json` (source) inside the existing `"convenience"` object, then mirror into `en/ru/uk/ar/tr.json`. Coders REFERENCE these via `t(...)`; coders MUST NOT edit locale JSON.

| Key | DE source value |
|---|---|
| `convenience.inline_cascade.live_region_label` | `Live: Behörden werden informiert` |
| `convenience.inline_cascade.once_only_label` | `Felder, die Sie nicht ausfüllen mussten` |
| `convenience.inline_cascade.source_line` | `Quelle: Ihre Stammdaten, einmal bestätigt am {datum}` |
| `convenience.inline_cascade.posteingang_landing` | `{count, plural, =0 {Noch keine Bestätigung im Posteingang} one {# Bestätigung im Posteingang} other {# Bestätigungen im Posteingang}}` |
| `convenience.inline_cascade.posteingang_cta` | `Posteingang öffnen` |
| `convenience.inline_cascade.disclaimer` | `[MOCK] — simuliert; keine reale Übermittlung.` |
| `convenience.inline_cascade.row_status.in_progress` | `Wird übermittelt` |
| `convenience.inline_cascade.row_status.confirmed` | `Bestätigt` |
| `convenience.inline_cascade.row_status.pending` | `Wartet` |
| `convenience.inline_cascade.row_status.failed` | `Fehlgeschlagen` |

**Notes for i18n-localizer:**
- `posteingang_landing` uses ICU plural (next-intl supports it). Keep the `{count}`/`#` placeholders in every locale; translate only the surrounding words. AR/TR/RU/UK plural categories differ — use the correct CLDR categories per locale (do NOT copy the DE `one`/`other` skeleton blindly for RU/UK/AR which have `few`/`many`).
- `source_line` keeps the `{datum}` placeholder (already German-formatted by the component — do not localize the date string itself).
- Reuse existing keys (do NOT duplicate): `convenience.value_receipt.ca_prefix` ("ca."), all `convenience.value_receipt.*` (the card renders itself), `assistent.tool.cta_kaskade` ("Kaskade ansehen" — unchanged).
- `[MOCK]` token stays literal in all locales (it's a watermark, not prose).

**New-key count: 10** (namespace `convenience.inline_cascade.*`), × 6 locales.

---

## 9. a11y checklist (SPINE surface → full rigor; a11y-tester gate)

- [ ] **Exactly ONE** `aria-live="polite"` region introduced by `InlineCascade` (C7). It wraps the **live Behörden rows + Once-Only counter + posteingang line**, labelled by `aria-label={t('convenience.inline_cascade.live_region_label')}`. The `ValueReceiptCard` (which sets its OWN `aria-live="polite"`) is rendered OUTSIDE this region — never nested in it — so a screen reader announces the card once and the rows once, not twice.
- [ ] Row status changes (Spinner → Check) are conveyed by **text**, not color alone — each row exposes a status label via the `row_status.*` keys (visually or `sr-only`), mirroring `BehoerdenStatusRow`'s `sr-only "Status: "` pattern.
- [ ] **Reduced motion:** no new animation that isn't gated. `ValueReceiptCard` count-up already honors `prefers-reduced-motion` → final state instant. Row spinner reuses the shared `animate-spin` gated by `useReducedMotion()` (see `ToolCallCard` Loader2 pattern). Reduced-motion → rows show final icon state without spin.
- [ ] **Keyboard:** the posteingang-landing line is a real `<Link>` (focusable, Enter-activates). The kept "Kaskade ansehen" link stays focusable. No new scroll-trap; if rows overflow, the container is not a keyboard trap.
- [ ] **Contrast:** muted disclaimer + source line meet AA against the card `bg-surface` (reuse existing `text-text-muted`/`text-muted-foreground` tokens already AA-verified).
- [ ] **Headings/landmarks:** `InlineCascade` introduces no new `<h1>`; `ValueReceiptCard`'s internal `<h2>` is fine. The live region is a `<div>`/`<section>` with `aria-label`, not a heading.
- [ ] DE-source + all 6 locales render without layout break (AR RTL: row icons already use `rtl:-scale-x-100` pattern where directional).

---

## 10. e2e plan (preserve existing; add inline assertions)

**File:** `tests/e2e/spine.spec.ts`. **Rule:** never weaken existing assertions.

**Keep unchanged (do not touch):**
- `getByRole('link', { name: 'Kaskade ansehen' })` visible + `href` contains `/vorgaenge/umzug/run?vorgangId=vorgang-`, the click, the `waitForURL('**/vorgaenge/umzug/run**')`, and the `.cascade-cards .cas-card` → "Abgeschlossen" assertions (steps 5–6). The link MUST still be the navigation the test clicks.

**Add (inline beat — between step 4's link-visible assertion and step 5's `kaskadeLink.click()`):** assert the inline cascade plays IN the chat before the navigation.

Give the inline component a **stable test hook**: root element `data-testid="inline-cascade"` (and the live region `data-testid="inline-cascade-live"`). Then add:

```ts
// ── Step 4b: the cascade ALSO plays inline in the chat (additive) ──
const inlineCascade = page.getByTestId('inline-cascade');
await expect(inlineCascade).toBeVisible({ timeout: 20_000 });
// at least one Behörde row reaches the confirmed status text inline
await expect(
  inlineCascade.getByText(/Bürgeramt|Bezirksamt|Finanzamt/i).first(),
).toBeVisible();
// the kept link is STILL present (regression guard for C1)
await expect(page.getByRole('link', { name: 'Kaskade ansehen' })).toBeVisible();
```

Optionally, after the run completes inline (receipt arrives), assert the once-only / posteingang text is visible inline — but keep it tolerant (the receipt is timing-dependent on `abgeschlossen`). Recommended **minimal additive** assertion: just the `inline-cascade` testid + one Behörde row + the kept link still present. **Do not** make the spine depend on the receipt count-up timing (flake risk) — the run/page assertions already prove completion.

**One-liner:** add `data-testid="inline-cascade"` to the component root; insert an additive block asserting the inline cascade is visible and the "Kaskade ansehen" link still co-exists, before the existing `kaskadeLink.click()`.

---

## 11. Edge cases & risks (decisions made)

- **R1 — Once-Only scope (DECIDED):** `once_only_fields` counts ALL confirmed steps' `datenkategorien` (incl. private/Anstalt), because Once-Only = data-reuse, not Behörden-count. `behoerden_count` keeps excluding Anstalt/private (C5). The two numbers are intentionally different and both honest. The UI labels them distinctly ("Behörden informiert" vs "Felder, die Sie nicht ausfüllen mussten"). Coder must NOT reuse the `PRIVATE_ODER_ANSTALT` filter for the Once-Only sum.
- **R2 — `computeValueReceipt` signature change** (for `stammdaten_bestaetigt_am`): verify all callers via codegraph before changing the arity. Preferred shape (A) computes the date in the `api.getValueReceipt` wrapper and passes it in. If any other caller exists, default the new param to `vorgang.angelegt_am`.
- **Run not completing inline:** if the assistant-triggered run doesn't reach `abgeschlossen` in-session (Block-D `pending_eid_confirmation` only), the receipt + counters don't render — rows + posteingang line still do. Acceptable. The spine demo (Anna, reliable mode) completes Block A → status `abgeschlossen` → receipt arrives.
- **Receipt `null`:** `getValueReceipt` returns `null` until ≥1 step confirmed (existing B1 behavior). Inline component renders rows/posteingang without the card until non-null. No crash.
- **Offline / SDK error:** the autopilot runs in-process via `dispatchStarteUmzug` → `api.startUmzug` (no network for the cascade itself). Inline component is offline-graceful like run/page.tsx.
- **Double-mount / unmount mid-run:** clean up the `api.subscribe` unsubscribe on unmount (component may unmount if the user navigates away within the SPA); the run continues in the background and `/run` picks it up — that's the kept link's job.
- **Posteingang count vs actual letters:** the inline number counts `letter_received` events seen **during the live session**; a page reload resets it (the component is session-scoped). That's honest ("watch them land" is a live moment). The authoritative inbox is `/posteingang` (linked).

---

## 12. Out of scope (do NOT build here)

- No changes to `/vorgaenge/umzug/run/page.tsx` DOM or behavior (C2).
- No changes to `/vorgaenge/umzug/[id]/page.tsx`.
- No new MockBackendEvent (§5.3).
- No new autopilot vertical (Kindergeburt etc. — separate backlog items #2/#11).
- No Wohngeld/entitlement bolt-on (backlog #3).
- No rename/removal of the "Kaskade ansehen" link (C1).
- No new consequence prose per Behörde — reuse `step.agent_label` (C4).
- No EUDI/Datenschutz-cockpit surface changes.

---

## 13. Build order (parallelizable)

1. **mock-backend-coder** (§5): add `once_only_fields` + `stammdaten_bestaetigt_am` to the type + `computeValueReceipt` derivation + `api.getValueReceipt` wrapper date. (Unblocks the receipt contract.)
2. **frontend-coder** (§4, §6): build `InlineCascade.tsx` against the §5 contract + §8 keys. (Can start in parallel; the two new fields are typed up front.)
3. **assistant-engineer** (§7): mount `<InlineCascade>` in `ToolCallCard.tsx` above the kept link. (Needs the component name only.)
4. **i18n-localizer** (§8): add the 10 keys to all 6 locales.
5. **a11y-tester** (§9) + **e2e** (§10): single live region verified, additive spine assertions green.
6. **code-reviewer:** C1–C7 honored, spine green, run/page.tsx byte-stable.

---

## Build log — i18n-localizer
- date: 2026-05-30
- locales updated: [de, en, ru, uk, ar, tr]
- new keys: 10 (namespace `convenience.inline_cascade.*`) × 6 locales = 60 strings
- changed keys: 0 (additive only; reused `convenience.value_receipt.ca_prefix` + `assistent.tool.cta_kaskade` left byte-identical, not duplicated)
- review-needed flags resolved: 0 (none were open for this namespace; this is a SPINE surface delivered at FULL quality with AR-RTL verified — no `needs_review` flags raised)
- known gaps:
  - JSON.parse + `npx tsc --noEmit` gate NOT runnable in this agent (no Bash tool). Structural review PASS on all 6 (balanced braces, no trailing commas, ASCII double-quotes, `assistant → inline_cascade → katalog` transition re-read in every file). **Main thread must run `JSON.parse` on all 6 locales + `npx tsc --noEmit` before commit** per V1.5 ship lesson.
  - `posteingang_landing` ICU plural categories per CLDR: de/en `one`/`other`(+`=0`); ru/uk `=0`/`one`/`few`/`many`/`other`; ar `=0`/`one`/`two`/`few`/`many`/`other`; tr `=0`/`other` (no numeral plural agreement). NOT copied from the DE skeleton.
  - `source_line` keeps `{datum}` (component-formatted dd.MM.yyyy — not localized in JSON, per §8).
  - `[MOCK]` literal in all 6 disclaimers. AR-RTL: `{datum}`/`#`/`[MOCK]` LTR tokens render via bidi under `dir="rtl"` (wired `app/layout.tsx:28`, `rtlLocales=['ar']` in `src/i18n/routing.ts:9`).
  - Length: AR/RU `live_region_label` + `posteingang_landing` are the longest, within the +40% tolerance vs DE; none flagged layout-breaking (rendered in card body, wraps). Frontend-coder: confirm no single-line clamp on the live-region label / posteingang link.

---

## Build log — mock-backend-coder
- date: 2026-05-30
- types added/changed: `src/types/value-receipt.ts` → `ValueReceipt` + `once_only_fields: number` + `stammdaten_bestaetigt_am: string` (additive; existing fields unchanged/unreordered).
- api methods added: none new. Changed `api.getValueReceipt(vorgangId)` wrapper to derive `stammdatenBestaetigtAm` from `loadProfile().adresse.verifiziert_am ?? vorgang.angelegt_am` and pass it to `computeValueReceipt` (signature unchanged externally: `(vorgangId: string) => Promise<ValueReceipt | null>`).
- autopilot orchestrators: none (§5.3 — no new MockBackendEvent).
- derivation: `computeValueReceipt(vorgang, stammdatenBestaetigtAm: string = vorgang.angelegt_am)`. `once_only_fields` = sum of `step.datenkategorien.length` over ALL confirmed steps incl. private/Anstalt (R1 — does NOT reuse the `PRIVATE_ODER_ANSTALT` filter; `behoerden_count` still excludes them per C5). Worked example (Anna Block-A) = 9, matches §5.2.
- callers verified via codegraph (R2): `api.getValueReceipt` (api.ts:2515, passes real date) + `buildDashboard` (dashboard/api.ts:649, calls one-arg — covered by the default param, NOT owned, left unchanged, compiles).
- seed records added: none.
- typecheck: pass (`npx tsc --noEmit` exit 0).
- known gaps: `Adresse` (`src/types/adresse.ts`) has no `verifiziert_am` field today (only `persona.kontakt.bundid_*` carry one), so `stammdaten_bestaetigt_am` resolves to the `vorgang.angelegt_am` fallback for all current seed personas. The wrapper reads `adresse.verifiziert_am` defensively (cast), so if a future spec adds address-level field verification it lights up with no further change here. Out-of-scope to add that field in this pass.
