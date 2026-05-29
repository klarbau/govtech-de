# Prototype v2 — Assistent re-skin

- **Date:** 2026-05-28
- **Branch:** `redesign-prototype-sweep` (no commit)
- **Track:** supporting (single-screen redesign sweep; behaviour preserved)
- **Reference sketch:** `C:\Users\iaiaa\Downloads\d9cba046-c4ba-4de3-9fcf-9468570dac17.png`
- **Files touched:** `src/app/(app)/assistent/**` + `src/components/assistent/**` only.

## 1. Why

The 2026-05-27 redesign-assistent ship landed a working chat surface, the
confirm gate, the tool-dispatch loop and 53 i18n keys. Visually it now reads
as a generic chat console: bubbles align hard to one side with **avatar
outside the bubble**, the conversation log carries **no shared `bg-card` panel**
(it bleeds into the page background), and the **context rail uses a single
"Ihre Daten" tile and a flat list of nav rows**. The new sketch shows a
calmer, more "console-of-a-Sachbearbeiter" layout:

1. a **chat panel** with rounded corners + soft shadow that visually contains
   the conversation, the sticky composer at its bottom, and a thin border
   separating the composer from the log;
2. **avatar inside the bubble row** — assistant avatar sits at the top-left
   of the assistant bubble; user bubbles are pure rounded-2xl pills with a
   slightly darker tinted blue background; double-check (✓✓) on the user
   bubble's bottom-right, inside the bubble;
3. quick-action chips above the log, each with a leading icon, rendered as
   **outline pills with subtle border** (not the current bg-surface-muted fill);
4. **a wider gap between the chat panel and the right rail** (≈ 32px) +
   **the context rail uses borderless cards with tinted icon tiles** —
   each row = small rounded square icon chip (primary-soft) + label + sub
   stacked above + chevron. The Datenschutz card below sits on a green-tinted
   soft surface with a `ShieldCheck` icon.

Tools, dispatch loop, confirm gate, greeting helper, SSE plumbing and i18n
strings all stay unchanged.

## 2. Non-goals

- **No i18n JSON edits.** Reuse every existing `assistent.*` key. The two
  sketch-only deltas (chip icons + green datenschutz tint) are stylistic and
  do not introduce new strings.
- **No mock-backend changes.**
- **No `src/lib/ai/**`** edits (route, prompts, tool-schemas, dispatch
  contract).
- **No shared chrome edits** (`Topbar`, `Sidebar`, design tokens, foundation
  primitives). Foundation primitives are reused as-is (`PageHeader`,
  `IconCircle`, `RightRailCard`, `Card`, `Tooltip`).
- **No new dependencies.** Quick-action chip icons come from `lucide-react`,
  already a dep.
- **No change to the confirm-gate behaviour.** `<UmzugConfirmCard>` keeps its
  `role="group"`, Block A/B/C/D recipient grouping, consent-note and
  primary/outline button pair.

## 3. Screen architecture (≥ lg, 2-col)

```
┌──────────────────────────────────────────────────┬────────────────────┐
│ PageHeader (Assistent · subtitle · Prototyp-pill)│                    │
├──────────────────────────────────────────────────┤                    │
│ Quick-action chips row (outline pills + icon)    │                    │
│ [📩 Erkläre meinen Brief] [✓ Was ist als …]      │                    │
│ [📎 Welche Unterlagen fehlen?]                   │                    │
├──────────────────────────────────────────────────┤   Kontext          │
│ ╭─────────────────────────────────────────────╮  │   ┌──────────────┐ │
│ │ Chat panel (rounded-2xl, border, shadow)    │  │   │ Ich beziehe  │ │
│ │ ┌─ greeting ──────────────────────────────┐ │  │   │ mich auf:    │ │
│ │ │ ✦ Hallo Anna, … bullets …  09:41        │ │  │   │              │ │
│ │ └─────────────────────────────────────────┘ │  │   │ ┌──────────┐ │ │
│ │                              ┌────────────┐ │  │   │ │📥 Posteingang│
│ │                              │User-Frage  │ │  │   │ │  2 ungelesen│ │
│ │                              │  09:42 ✓✓ │ │  │   │ └──────────┘ │ │
│ │                              └────────────┘ │  │   │ … 3 more …    │ │
│ │ ┌─────────────────────────────────────────┐ │  │   │              │ │
│ │ │ ✦ Gerne. … (assistant)         09:42    │ │  │   └──────────────┘ │
│ │ └─────────────────────────────────────────┘ │  │                    │
│ │ … (more turns)                              │  │   ┌──────────────┐ │
│ │                                             │  │   │ 🛡  Ihre Daten│ │
│ │ ┌─ composer (bordered top) ───────────────┐ │  │   │   sind        │ │
│ │ │ [📎] Schreiben Sie eine Nachricht…  [➤] │ │  │   │   geschützt    │ │
│ │ └─────────────────────────────────────────┘ │  │   │   Mehr ↗      │ │
│ ╰─────────────────────────────────────────────╯  │   └──────────────┘ │
└──────────────────────────────────────────────────┴────────────────────┘
```

Mobile / `< lg`: the right rail collapses below the chat panel as a stacked
list (same content). The chat panel keeps its bordered-rounded look; the
composer stays sticky at the bottom of the panel.

## 4. Component map (diff vs current)

| Component | Status | Change |
|---|---|---|
| `AssistentView` | edit | Wrap the chat + composer in a single `<ChatPanel>`-owned `<section>` (rounded-2xl, border, soft shadow). Drop the page-level sticky composer block; the composer lives **inside** the panel now (bottom-anchored). Pass `withIcon` to `<QuickActionChips>`. Slightly widen the right rail gutter (`lg:grid-cols-[minmax(0,1fr)_340px]` + `gap-8`). |
| `ChatPanel` | edit | Become a visible card (`rounded-2xl border border-border bg-card shadow-[var(--shadow-card)]`). Render the message log in a scrollable inner area (`max-h-[calc(100vh-22rem)] overflow-y-auto`). Append the composer as a slot below the log, separated by a hairline `border-t`. Replace the centred typing line with an inline indicator under the last bubble. |
| `MessageBubble` | edit | Move the assistant Sparkle avatar **inside the bubble's flex row top**, not a sibling left of it. Bubbles get `rounded-2xl` instead of `rounded-lg`. User-bubble background → saturated `bg-primary` (cobalt fill per sketch) with `text-primary-foreground`; the inline `CheckCheck` + timestamp tint to `text-primary-foreground/80`. Timestamp moves **below** the bubble (right-aligned for user, left-aligned for assistant) per sketch. The double-check stays inline at the bubble's bottom-right corner. |
| `QuickActionChips` | edit | Add a leading lucide icon per chip (`Mail` / `CheckCircle2` / `FileSearch`). Change pill style to outline (`border border-border bg-surface hover:bg-surface-muted`) per sketch. ≥ 44px height kept. |
| `KontextRail` | edit | Restructure: title block stays. Drop the per-row `border` on nav cards; replace with **`hover:bg-surface-muted` + soft `rounded-xl`** pills. Use a **tinted square icon tile** (`rounded-lg bg-primary-soft p-2`) instead of the round `IconCircle`. Datenschutz card switches to **success tone** (`bg-success-soft` with `text-success`) to mirror the sketch's mint-green card; reuse `RightRailCard variant="soft"` and override tone via a wrapper class. |
| `ChatComposer` | edit | Adapt to the panel-internal placement: drop the outer rounded border (the panel owns it); render as a plain flex row with `border-t border-border` on top, `bg-card` background, `p-3`. Send button stays primary, 44px. |
| `ToolCallCard` | keep | No visual change required by the sketch (does not appear in the sketch but stays correct under the new bubble system). |
| `UmzugConfirmCard` | keep | No layout change. The card already sits inline with the assistant avatar gutter (`gap-3`) and reads correctly under `rounded-2xl` bubble neighbours. |
| `MessageMarkdown` | keep | No change. |
| `dispatch-tool.ts` / `types.ts` | keep | No change. |
| `src/app/(app)/assistent/page.tsx` | keep | No change. |

## 5. Data flow

Unchanged. `AssistentView` still bootstraps `getProfile / getLetters /
getDocuments / getTermine / getBehoerden` on mount, drives the SSE loop
through `/api/assistant`, and dispatches tools via `dispatch-tool.ts`.

## 6. Visual tokens (no theme edits)

- **Chat panel**: `rounded-2xl border border-border bg-card
  shadow-[var(--shadow-card)] overflow-hidden`.
- **Inner scroll area**: `flex-1 overflow-y-auto px-4 py-5
  md:px-6` with `min-h-[28rem]` so the empty / single-turn state still feels
  like a panel.
- **Composer slot**: `border-t border-border bg-card p-3 flex items-end gap-2`.
- **Assistant bubble**: `bg-accent-soft text-text-primary rounded-2xl
  rounded-tl-md px-4 py-3 max-w-[80%]`; Sparkle avatar at the row top with
  `IconCircle size="sm"`.
- **User bubble**: `bg-primary text-primary-foreground rounded-2xl
  rounded-tr-md px-4 py-3 max-w-[80%]` (saturated cobalt per sketch);
  timestamp + `CheckCheck` inside the bubble bottom-right, both tinted with
  `text-primary-foreground/80` so they read on the cobalt fill.
- **Quick-action chip**: `inline-flex min-h-[44px] items-center gap-2
  rounded-full border border-border bg-surface px-4 text-sm font-medium
  text-text-secondary hover:bg-surface-muted hover:text-text-primary
  focus-visible:outline-2 …`.
- **Kontext rail row**: `flex items-center gap-3 rounded-xl px-3 py-2.5
  hover:bg-surface-muted`. Icon tile: `inline-flex size-9 items-center
  justify-center rounded-lg bg-primary-soft text-primary [&_svg]:size-4`.
- **Datenschutz card**: `bg-success-soft border-transparent` with title icon
  `text-success`.

> Note: `bg-primary-soft` already exists in `globals.css` as `--accent-soft`.
> The chat panel reuses `--shadow-card` from the foundation (`SectionCard`
> already uses it). No new tokens.

## 7. A11y deltas

- The chat panel `<section aria-label="Assistent">` keeps the `role="log"`
  on the inner `<ol>`. `aria-live="polite"` SR region stays unchanged.
- The composer keeps its `<label>` sr-only + 44px send button.
- Quick-action chips: the leading icon is `aria-hidden="true"`; chip label
  stays the accessible name.
- Bubble timestamp moves below the bubble visually, but stays in the same
  flow position inside the bubble flex container so SR order is unchanged
  (reads: avatar label → message text → timestamp → "Gesendet" tick).
- Right-rail rows are still real `<Link>`s; the icon-tile background swap is
  purely visual.
- `prefers-reduced-motion`: no new motion. The existing `Loader2 animate-spin`
  guards stay.

## 8. Out of scope (intentional)

- The sketch shows the sidebar highlighting "Assistent" — sidebar styling
  is shared chrome and out of scope.
- The sketch shows context-card chevrons as a small right-arrow glyph; we
  keep the existing `ArrowRight` icon at the same size for consistency
  across the rest of the redesign sweep.
- The sketch's bubble corner radius is slightly asymmetric (top-left smaller
  on assistant, top-right smaller on user). We approximate via
  `rounded-2xl rounded-tl-md` / `rounded-tr-md`; pixel-perfect match is not
  required.
- The "kleines €-Sparschwein"-illustration in the sketch's first assistant
  bullet (a Steuer-Erstattung hint) is content, not chrome — it shows up
  when the model talks about a refund. We do not pre-bake an illustration
  slot; the message body still renders via `MessageMarkdown`.

## 9. Files touched

Edited:

- `src/components/assistent/AssistentView.tsx`
- `src/components/assistent/ChatPanel.tsx`
- `src/components/assistent/MessageBubble.tsx`
- `src/components/assistent/QuickActionChips.tsx`
- `src/components/assistent/KontextRail.tsx`
- `src/components/assistent/ChatComposer.tsx`

Untouched (existing): `ToolCallCard.tsx`, `UmzugConfirmCard.tsx`,
`MessageMarkdown.tsx`, `dispatch-tool.ts`, `types.ts`,
`src/app/(app)/assistent/page.tsx`.

## 10. Verify

- `npx tsc --noEmit` runs clean for files in scope.
- Manual smoke (not executed in this pass): `/assistent` renders a single
  panel containing the message log + the composer at its bottom; assistant
  Sparkle avatar sits at the bubble row top; user bubbles use a soft cobalt
  tint with double-check inside; quick-action chips show a leading icon and
  outline pill style; right rail rows are borderless with square tinted icon
  tiles; Datenschutz card sits on the mint-green soft surface.
