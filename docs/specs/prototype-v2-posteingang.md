# Prototype v2 — Posteingang re-alignment

- **Date:** 2026-05-28
- **Branch:** `redesign-prototype-sweep` (no commit)
- **Track:** supporting (single-screen redesign sweep; behaviour preserved)
- **Reference sketch:** `C:\Users\iaiaa\Downloads\1c31b045-dfff-40f1-98ce-5ff9d9ba746d.png`
- **Files touched:** `src/app/(app)/posteingang/**` + `src/components/posteingang/**` only.

## 1. Why
The 2026-05-27 full-sweep redesign re-skinned the Posteingang to the cobalt
design system but the screen still reads as **three stacked toolbar rows + a
verbose list row + a side-by-side `AISummaryBlock`/`OriginaltextBlock` reader**.
The user's new sketch shows a much calmer surface:

1. one toolbar row (search left, segmented Chronologisch/Nach-Vorgang +
   Filter button right);
2. a left rail of **collapsible** status groups whose rows are stripped down
   to `avatar · bold absender — betreff / kategorie · Aktenzeichen / date +
   frist-badge` with a **cobalt left-edge bar** when selected;
3. a vertical reader pane: badge row → headline → `Aktenzeichen ·
   Eingegangen` row → **blue tinted AI Brief-Erklärer card with a small €
   illustration** → frist pill → three CTAs (Antwort vorbereiten / Vorgang
   erstellen / Originaltext anzeigen) → "Was kann ich tun?" chip-row →
   "Auszug aus dem Originaltext" `<details>`.

The current layout differs significantly; this spec bridges the gap without
touching shared chrome, i18n JSON, or other features' code.

## 2. Non-goals
- No new i18n keys. All strings reused from the existing
  `posteingang.*` namespace; sketch-only labels are hardcoded inline DE per
  the sweep convention.
- No mock-backend changes. `api.*` calls stay identical.
- No changes to `<ReplySheet>`, `<NeuerVorgangAusBriefModal>`,
  `<WasKannIchTunFooter>` internals — only how they are arranged.
- No removal of `<StickyFristAction>` — the sketch's CTA row replaces its
  visual role in the inline reader, so the sticky band is **hidden in the
  inline (≥ lg) reader** and kept on the standalone `/posteingang/[id]`
  route.

## 3. Screen architecture (≥ lg, 3-pane)

```
┌─────────────────────────────────────────────────────────────────┐
│ PageHeader (Posteingang + subtitle + Prototyp·Mock-Daten pill)  │
├─────────────────────────────────────────────────────────────────┤
│ Toolbar: [🔍 Suche nach Aktenzeichen oder Behörde         ]     │
│          [ Chronologisch | Nach Vorgang ]   [⧉ Filter]          │
├──────────────────────┬──────────────────────────────────────────┤
│ Left rail (400 px)   │ Reader pane                              │
│ ┌──────────────────┐ │ ┌────────────────────────────────────┐   │
│ │ ▼ Neu       (2)  │ │ │ [avatar Finanzamt Berlin]           │   │
│ │   • Letter row 1 │ │ │ [✓ Authentisch geprüft]             │   │
│ │   • Letter row 2 │ │ │                                     │   │
│ │                  │ │ │ Steuerbescheid 2024                 │   │
│ │ ▼ Frist offen ≤  │ │ │ Aktenzeichen: 1234... · Eingegangen │   │
│ │   7 Tagen   (1)  │ │ │                                     │   │
│ │   • Letter row 3 │ │ │ ╭────────────────────────────────╮  │   │
│ │                  │ │ │ │ [KI] Brief-Erklärer        🪙€ │  │   │
│ │ ▶ Erledigt  (2)  │ │ │ │ Sie erhalten 371,00 € …        │  │   │
│ └──────────────────┘ │ │ │ • bullet • bullet • bullet     │  │   │
│                      │ │ ╰────────────────────────────────╯  │   │
│                      │ │ [⏱ Einspruch bis 12.04.2026]        │   │
│                      │ │ [Antwort vorbereiten] [Vorgang erst.]│  │
│                      │ │ [Originaltext anzeigen]              │  │
│                      │ │                                      │  │
│                      │ │ Was kann ich tun? ›                  │  │
│                      │ │ [Einspruch erkl.][Zahlung][Ablegen]   │  │
│                      │ │                                      │  │
│                      │ │ ▸ Auszug aus dem Originaltext         │  │
│                      │ └─────────────────────────────────────┘  │
└──────────────────────┴──────────────────────────────────────────┘
```

< lg: list is full-width, group rows navigate to `/posteingang/[id]`.
The standalone `[id]/page.tsx` keeps `<LetterReader embedded={false}>` with
its current side-by-side AISummary/Originaltext layout — that route is not
in scope for this sweep.

## 4. Component map (diff vs current)

| Component | Status | Change |
|---|---|---|
| `PosteingangInbox` | edit | Toolbar order: search → tabs → filter button. Drop the separate `<RechtlicheHinweiseDetails>` slot above the toolbar; keep it only as the disclaimer footer. |
| `LetterListHeader` | edit | Remove the embedded filter slot; emit pure search + tabs row. Toolbar in `PosteingangInbox` composes filter button to the right. |
| `LetterListGroup` | edit | Become collapsible (button-driven `aria-expanded` + chevron). Default open for Neu/Frist≤7d, open if it has rows for Frist>7d, closed for Erledigt/Archiv. |
| `LetterCard` (variant `row`) | edit | Replace status badge with right-aligned `Datum + FristChip` stack. Add a cobalt 3-px left edge bar when `selected`. Show optional kategorie line below absender. Keep authentic-channel + unread dot. |
| `InlineLetterReader` | edit (route) | Render the new `<LetterReaderProto>` instead of `<LetterReader embedded>`. |
| `LetterReaderProto` | **new** | The vertical reader pane matching the sketch. Reuses `BehoerdenBadge`, `StatusBadge`, `AISummaryBlock` (re-themed cobalt soft card), `FristChip`, `WasKannIchTunFooter`, `OriginaltextBlock` (collapsed in `<details>`). |
| `AiErklaererCard` | **new** | Blue tinted card wrapper around `<AISummaryBlock>` with hero sentence + small lucide euro/document icon stack. |
| `RechtlicheHinweiseDetails` | keep | Render unchanged in the disclaimer footer only. |
| `StickyFristAction` | edit (callsite) | Hidden when `embedded` (the inline-reader replaces the band via the three CTAs). |

## 5. Data flow
Untouched. `PosteingangInbox` still pulls `api.getLetters() / api.getBehoerden()`;
`InlineLetterReader` still calls `api.getLetter(id)` + `api.getBehoerde` +
`api.getVorgang` for the right pane.

## 6. Visual tokens (no theme edits)
- Selected row left-edge: `before:bg-primary before:w-[3px]` (cobalt).
- AI-Erklärer card: `bg-accent-soft border border-primary/15`,
  rounded `rounded-2xl`, primary-tinted heading (`text-primary`).
- Group header chevron: `lucide-react ChevronDown` rotated 0° / -90°.
- Right-rail date: `text-xs tabular-nums text-text-muted`.

## 7. Accessibility
- Collapsible group: `<button aria-expanded aria-controls>` + `<ul id>` —
  button is the only focusable header element; the row count stays in the
  button label so SR reads "Neu, 2".
- Reader headline is the only `<h2>` (page `<h1>` lives in PageHeader);
  inside the reader, `KI-Brief-Erklärer`, `Was kann ich tun?`, and
  `Originaltext` are `<h3>`.
- Cobalt left-edge bar on the selected row is decorative; the existing
  `aria-current="true"` on the `<Link>` is the canonical selection signal.
- All three CTAs (Antwort / Vorgang / Originaltext) are real `<button>`s
  with visible labels — no icon-only fallback.
- `<details>` "Auszug aus dem Originaltext" uses native disclosure;
  default-collapsed.

## 8. Out of scope follow-ups
- Mobile (< lg) keeps the current full-width list with deep-link nav. The
  sketch only depicts the 3-pane desktop arrangement.
- The standalone `/posteingang/[id]/page.tsx` keeps the existing reader.
- No re-skin of `<ReplySheet>` — opens unchanged.
- `<AISummaryBlock>` keeps its internal markup; the new tint comes from
  the wrapping `<AiErklaererCard>`.

## 9. Verification
- `npx tsc --noEmit` clean.
- Manual happy path: select Anna persona → open first letter → confirm
  three CTAs render → click "Originaltext anzeigen" → `<details>` opens.

## 10. Build log
- date: 2026-05-28
- screens implemented: Posteingang inbox (list + inline reader pane)
- components created: `LetterReaderProto`, `AiErklaererCard`
- components modified: `PosteingangInbox`, `LetterListHeader`,
  `LetterListGroup`, `LetterCard`, `InlineLetterReader`
- i18n keys added: none (sweep convention — hardcoded DE inline where the
  sketch introduces new labels)
- typecheck: pass
- known gaps: none in scope; mobile + standalone route untouched
- next: a11y-tester / code-reviewer
