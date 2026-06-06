# Spec — Posteingang „Antwort verfassen" Re-Skin + KI-Aktionen

- **Feature:** Re-skin of the reply compose experience (`ReplySheet`) to the
  donated *GovTech DE Design System* „Antwort verfassen" panel, plus a new,
  RDG-safe **KI-Umformulieren** capability.
- **track:** supporting (deep-feature on the Posteingang vertical; NOT the
  Umzug spine). Rigor: full 6-locale i18n (the existing reply tree is already
  6-locale — do not regress it) + a11y PASS + green build + green unit/e2e.
- **Status:** spec
- **Source design:** `C:\Users\iaiaa\Downloads\_gov_extract\export\Antwort verfassen.html`
  + `INTEGRATION.md` + `assets/govtech.css` (reference only — DO NOT import
  govtech.css; map every scoped color to the app's existing tokens).

## 0. Headline

Keep the a11y-certified `Sheet` (it is already a right-docked 480px column on
desktop = the archive's "docked compose column"). **Re-skin its contents** —
header meta, amber disclaimer, template cards, editor frame + live char count,
KI-Aktionen chips, drag-drop dropzone, footer — and wire the KI chips to a new
`/api/reply/rewrite` endpoint. **Do NOT** convert the Posteingang into a 3-pane
mail client and **do NOT** lose any existing wired logic.

## 1. Hard constraints (regression guards — verified against the test suite)

These MUST survive the re-skin or the e2e/a11y suites break:

1. **Template picker stays a WAI-ARIA radiogroup.** Each option keeps
   `role="radio"`, `aria-checked`, roving `tabIndex`, arrow-key navigation, and
   the `recommendedTemplate` vs `checked` split. `tests/e2e/v1-5-1-*.spec.ts`
   call `.getByRole('radio')`.
2. Preserve these `data-testid`s and their host components, unchanged:
   `frist-cited-format-header`, `bekanntgabe-caveat-details`,
   `reply-skeleton-banner`, `skelett-footer-no-legal-advice`,
   `cross-send-announcement`.
3. The open trigger / sheet title text must keep matching
   `/Antwort verfassen|Erneut antworten|Entwurf weiter schreiben/i`
   (existing i18n `compose.cta_open_sheet` / `sheet_title` are fine).
4. Keep ALL conditional sub-components in current render order (V1.5.1 § 9.1):
   SpeculativeBanner → FristAbgelaufenWarnung → FristCitedFormatHeader →
   BekanntgabeCaveatDetails → cross-send announcement → template picker →
   termin-mode radios | nachweis select | body textarea → attachments.
5. Keep ALL wired behavior intact: draft autosave (2s debounce), template
   registry + `resolveReplyBody`, Pre-Insertion modal flow, cross-template dual
   send, confirmation view, discard, PreVersandModal, attachment validation
   (`validateNewFiles`, `LETTER_ATTACHMENT_LIMITS`), every i18n key already used.
6. Keep the `[MOCK]` watermark on the Aktenzeichen.
7. No new dependencies. No `govtech.css`. Tailwind v4 + existing tokens only.

## 2. Token mapping (archive scoped CSS → app tokens)

Map, never hardcode hex. The app exposes these (see `globals.css`, dark-mode
parity required):

| Archive token | App equivalent (Tailwind / CSS var) |
|---|---|
| `--surface` | `bg-surface` / `bg-background` |
| `--surface-soft` / `--surface-muted` | `bg-muted` / `bg-surface-muted` |
| `--border` / `--border-strong` | `border-border` / `border-border-strong` |
| `--ink` / `--ink-2` / `--ink-3` / `--ink-4` | `text-text-primary` / `text-foreground` / `text-muted-foreground` / `text-text-muted` |
| `--brand-50/100/500/600/700` | `bg-brand-50` / `border-brand-200` / `text-brand-700` / `bg-primary` etc. (cobalt OKLCH) |
| `--amber-50/100/500/600` (`.cp-disc`) | `--ds-color-warning-soft` / `--ds-color-warning` (the tuned, contrast-safe amber already used by `reply-skeleton-banner`) |
| `--r-md/--r-lg` | `rounded-lg` / `rounded-xl` |
| `--shadow-1/2` | existing `shadow-sm` / `--shadow-modal` |

Use `lucide-react` icons (NOT the Lucide CDN). Tabular nums (`font-mono` /
`tabular-nums`) for Aktenzeichen, char count, file sizes, dates.

## 3. Screen-by-screen (ReplySheet body, compose mode only — confirmation mode unchanged)

### 3.1 Header (`SheetHeader`)
- Title: `sheet_title` (unchanged).
- Meta block, archive `.cp-meta` style (small, muted, stacked):
  - `An:` **{empfaengerName}** — reuse `recipient_label_template`.
  - `Betreff:` **{letter.betreff}** — NEW key `compose.betreff_label_template`.
  - `Aktenzeichen:` `[MOCK]` (distinct muted watermark chip) **{letter.aktenzeichen}**
    (mono) — NEW key `compose.aktenzeichen_label_template` rendering the literal
    `[MOCK]` as a small `text-text-muted` chip before the mono Az.

### 3.2 Speculative disclaimer (`SpeculativeBanner`)
- Re-skin to the archive `.cp-disc` card: amber-soft surface, amber `Info` icon
  (lucide `Info`), text. Use `--ds-color-warning-soft` bg + `--ds-color-warning`
  icon; text color contrast-safe in light AND dark. Keep both i18n strings
  (`speculative_banner_title` + `outbound_speculative`). `role="note"`.

### 3.3 Template cards (the radiogroup)
- Re-skin each radio to the archive `.tpl` card: rounded border, `p-3`, grid
  `[radio] [content]`. Content = icon (emoji from `tPicker(\`${id}.icon\`)`) +
  bold label + muted description.
- **Selected/recommended state** = `border-brand-500 bg-brand-50` + a subtle
  `ring-1 ring-brand-500`, filled radio dot (`bg-primary`). Hover on unselected
  = `bg-muted/40`. Keep `focus-visible` ring.
- All radiogroup semantics from §1.1 preserved verbatim.

### 3.4 Editor frame + live char count (NO toolbar)
- Wrap the existing `<textarea id="reply-body">` in a bordered rounded frame
  (`.editor` look): `border border-border-strong rounded-lg overflow-hidden`,
  textarea borderless inside (`border-0 outline-none bg-transparent`), keep
  `min-h`, autosize rows, `lang="de"`, `dir="ltr"`, placeholder, `aria-describedby`.
- **Live char count** pinned bottom-right inside the frame: `Zeichen: {n}` via
  NEW key `compose.char_count_template`. Visual only (`aria-hidden` on the count
  so it doesn't spam SR on each keystroke); the textarea keeps its label + hint.
- **NO formatting toolbar** (decision: plain-text Behörden letters; decorative
  B/I/U buttons fail BITV). Keep `reply-skeleton-banner` above the textarea and
  `disclaimer_inline` + `skelett-footer-no-legal-advice` below, as today.

### 3.5 KI-Aktionen chips (NEW — see §4 for the endpoint)
- Row directly under the editor, archive `.ai-chips` style:
  - Primary chip `Mit KI umformulieren` (lucide `Sparkles`, brand-tinted:
    `border-brand-200 bg-brand-50 text-brand-700`).
  - `Kürzer` (`Minimize2`), `Formeller` (`ScrollText`), `Einfacher` (`Feather`)
    — neutral outline chips.
- Each is a real `<button type="button">`.
- **Busy state**: on click → `aria-busy="true"`, disabled, label swaps to
  `Wird bearbeitet …` with a spinning `Loader2` (icon `aria-hidden`). On
  resolve → restore.
- **RDG gate (HARD):** when `currentIsSkelett` (Einspruch / Widerspruch /
  Aussetzung), the whole chip row is **disabled** and a small muted note renders:
  `ai_rewrite.disabled_skelett_hint` ("Für Rechtsbehelf-Vorlagen nicht verfügbar:
  Die App formuliert keine rechtlichen Begründungen (§ 2 RDG)."). Rationale: AI
  must never generate legal argumentation (mirrors the Skelett "die App schlägt
  keine Argumente vor" guardrails).
- Also disabled when `formState.body.trim()` is empty or `templatePending`.
- On click: `POST /api/reply/rewrite { body: formState.body, action }` →
  on `{ body, source }` set `formState.body = body`. If `source === 'fallback'`
  show a subtle `toast(ai_rewrite.offline_fallback)`; on HTTP/parse error show
  `toast.error(ai_rewrite.error)` and leave the body unchanged.
- Add an `sr-only` `aria-live="polite"` status that announces
  `ai_rewrite.done` ("Text aktualisiert.") on success.

### 3.6 Attachments — drag-drop dropzone (replaces the add-button)
- Replace the "Datei hinzufügen" `<Button>` with the archive `.dropzone`: a
  focusable control (`<button type="button">` styled as the dropzone, full
  width, dashed border, `paperclip` icon + `Dateien auswählen` (bold) +
  `oder hier ablegen`). Click → opens the hidden `<input type="file">`.
- Add drag handlers on the dropzone wrapper: `dragenter/dragover` →
  `border-brand-500 bg-brand-50` (`data-drag` state); `drop` → feed
  `e.dataTransfer.files` through the EXISTING `validateNewFiles` path (same
  validation, same error block, same limits — reuse, do not fork).
- Keep the constraints line + allowed-types line + error `role="alert"` block.
- File rows re-skinned to archive `.at-file`: file icon tile + name + size (KB)
  + remove `X`. Keep persisted vs staged distinction and `remove_template`
  aria-labels. NEW keys: `attachments.dropzone_cta`, `attachments.dropzone_hint`,
  `attachments.dropzone_aria`.

### 3.7 Footer (`SheetFooter`)
- Keep the autosave status line (`draftSavedRel`) + retry button as today.
- Action row, archive `.cp-foot` style (rounded 11px, taller buttons):
  - Left: `Entwurf verwerfen` (ghost, destructive) — unchanged behavior.
  - Right: `Speichern und schließen` (outline) + `Antwort versenden (simuliert)`
    (primary; keep `Send`/`lock` lucide icon, tasteful). Keep all disabled logic.
- No extra hint line (the body already carries the disclaimers).

## 4. AI endpoint contract (assistant-engineer)

### 4.1 `src/lib/ai/reply-rewrite.ts`
```ts
export type ReplyRewriteAction = 'umformulieren' | 'kuerzer' | 'formeller' | 'einfacher';
export interface ReplyRewriteResult { body: string; source: 'ai' | 'fallback'; }
export async function rewriteReplyBody(input: { body: string; action: ReplyRewriteAction }): Promise<ReplyRewriteResult>;
```
- Uses `getAnthropicClient()` + `ASSISTANT_MODEL` (Haiku 4.5), **prompt caching
  ON** for the system block (mirror `dashboard-prioritize.ts`), low temperature,
  `max_tokens` ≈ 1024.
- **System prompt (STRICT, German):** "Du formulierst ausschließlich den
  *bestehenden* Text der Nutzerin um — Ton/Länge/Klarheit. Sie-Form, reiner
  Plain-Text, kein Markdown. Du fügst KEINE neuen Fakten, KEINE rechtlichen
  Argumente, KEINE Behauptungen hinzu. Aktenzeichen, Daten, Namen, Beträge und
  Anschriften bleiben unverändert. Struktur (Anschriftenblock, Aktenzeichen,
  Betreff, Anrede, Grußformel) bleibt erhalten. Gib NUR den umformulierten
  Brieftext zurück." Per-action instruction: `umformulieren` = gleiche Bedeutung,
  flüssiger; `kuerzer` = prägnanter, nichts Inhaltliches streichen; `formeller`
  = behördlich-förmlicher Ton; `einfacher` = einfache, klare Sprache.
- **Graceful fallback** (missing key / SDK error / timeout / empty output):
  return `{ body: <original, unchanged>, source: 'fallback' }`. Never throw to
  the route. The demo must never break offline.

### 4.2 `src/app/api/reply/rewrite/route.ts`
- Mirror `api/dashboard/top-actions/route.ts`: `runtime='nodejs'`,
  `dynamic='force-dynamic'`, rate-limited via NEW bucket
  `REPLY_REWRITE_RATE_LIMIT` (reuse `checkRateLimit` + `rateLimitKeyFromRequest`),
  body size cap (add `CAPS.maxReplyBodyChars ≈ 16_000` or reuse `maxCharsPerBlock`).
- Request `{ body: string, action: ReplyRewriteAction }`. Validate `action`
  against the union; reject unknown with 400. Validate `body` non-empty string.
- 200 `{ body, source }`. On ANY failure → 200 with
  `{ body: <original>, source: 'fallback' }` (so the client degrades silently),
  EXCEPT 400 for malformed input and 429 for rate limit (with `Retry-After`).
- The route is intentionally template-agnostic; the RDG safety is enforced both
  by the fixed tone/length system prompt AND by the client disabling chips on
  Skelett templates (defense in depth).

### 4.3 Unit test
- `rewriteReplyBody` returns `source:'fallback'` + original body when the key is
  unset (no network). Action union type-checks. (Pure, no live API call.)

## 5. i18n inventory (NEW keys — DE source, then EN/RU/UK/AR/TR)

All under `posteingang.compose`:
```jsonc
"betreff_label_template": "Betreff: {betreff}",
"aktenzeichen_label_template": "Aktenzeichen: {aktenzeichen}",   // [MOCK] rendered as separate literal chip in JSX
"char_count_template": "Zeichen: {n}",
"ai_rewrite": {
  "section_label": "KI-Aktionen",
  "umformulieren": "Mit KI umformulieren",
  "kuerzer": "Kürzer",
  "formeller": "Formeller",
  "einfacher": "Einfacher",
  "busy": "Wird bearbeitet …",
  "done": "Text aktualisiert.",
  "error": "Umformulieren fehlgeschlagen – bitte erneut versuchen.",
  "offline_fallback": "KI offline – Text unverändert.",
  "disabled_skelett_hint": "Für Rechtsbehelf-Vorlagen nicht verfügbar: Die App formuliert keine rechtlichen Begründungen (§ 2 RDG)."
},
"attachments": {
  // add to the EXISTING attachments object — do not remove existing keys:
  "dropzone_cta": "Dateien auswählen",
  "dropzone_hint": "oder hier ablegen",
  "dropzone_aria": "Dateien auswählen oder per Drag-and-drop ablegen"
}
```
- Non-DE locales: keep Behörden terms in DE with a translation in parentheses
  where idiomatic; preserve `§ 2 RDG` verbatim; AR gets RTL-correct strings.
- Validate every locale file is valid JSON (`JSON.parse`) — the main thread
  runs this gate after the i18n phase.

## 6. a11y checklist (BITV 2.0 / WCAG 2.1 AA)

- Template radiogroup: roles/checked/roving-tabindex/arrow keys intact; visible
  focus ring; selected state not conveyed by color alone (filled radio dot +
  border + ring).
- KI chips: real buttons; `aria-busy` during fetch; disabled state has a
  *textual* reason on Skelett (the hint), not just a title attr; `Loader2` is
  `aria-hidden`; success announced via `aria-live="polite"`; hit target ≥ 32px.
- Dropzone: keyboard-operable (Enter/Space activates file picker); drag is an
  enhancement, never the only path; `aria-label` = `dropzone_aria`.
- Char count: `aria-hidden` (avoid keystroke spam); textarea keeps label+hint.
- Amber disclaimer: text contrast ≥ 4.5:1 on the warning-soft surface in light
  AND dark (use the tuned `--ds-color-warning*` tokens).
- Brand template-card selected text + brand AI primary chip text ≥ 4.5:1.
- Focus trap (Sheet) intact — do not alter the Sheet primitive.
- Dark-mode parity for every new surface.

## 7. Out of scope

- 3-pane mail layout / list+detail columns (the app already has its inbox).
- Rich-text formatting toolbar (dropped by decision).
- Changing the confirmation (`ReplyConfirmationView`) or any send/persist logic.
- New locales beyond the existing six.
