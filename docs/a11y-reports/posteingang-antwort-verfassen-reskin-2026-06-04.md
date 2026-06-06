# a11y Report — Posteingang „Antwort verfassen" Re-Skin + KI-Aktionen

- **Date:** 2026-06-04
- **Feature / spec:** `docs/specs/posteingang-antwort-verfassen-reskin.md`
- **Surfaces:** `src/components/posteingang/ReplySheet.tsx` (compose mode of the
  reply `Sheet`) + co-located `KiAktionenChips` / attachment dropzone.
- **Standard:** WCAG 2.1 AA + BITV 2.0.
- **Verdict:** **PASS** (0 axe violations; static checklist clear; 3
  informational-only notes).

## How it was verified (authoritative protocol)

Per the certified reliable-mode protocol (NOT `next dev` — its 5 % mock-error
rate + cold-compile cause false flakes):

```
NEXT_PUBLIC_RELIABLE=1 npm run build   # green
NEXT_PUBLIC_RELIABLE=1 npm run start   # prod server on :3000
npm run test:a11y                      # playwright --project=a11y (axe-core), reuses :3000
```

**Result: `131 passed · 0 failed · 48 skipped` (5.6 min).** The 48 skipped are the
pre-existing `test.fixme` Stammdaten/Familie redesign-integration deferrals —
unrelated to this feature.

The re-skinned compose `Sheet` is exercised by the a11y suite via
`tests/a11y/posteingang.spec.ts` and `tests/a11y/pre-insertion-modal.spec.ts`
(open letter → „Antwort verfassen" → template radiogroup → Pre-Insertion modal),
so axe runs against the new markup — header meta, amber disclaimer, template
cards, editor frame, KI chips, dropzone — in light **and** dark, LTR **and** AR-RTL.

## Static checklist (spec §6) — all satisfied

| §6 item | Status | Evidence |
|---|---|---|
| Template radiogroup: role/aria-checked/roving-tabindex/arrow keys; selection not color-only | ✅ | `role="radio"` cards, filled inner dot (`bg-primary`) + border + ring on select (1.4.1); roving tab stop preserved |
| KI chips: real `<button>`, `aria-busy` during fetch, textual disabled reason on Skelett, `aria-hidden` spinner, `aria-live` success, ≥32 px target | ✅ | `KiAktionenChips`; § 2 RDG reason rendered as visible `<p>`; `role=status aria-live=polite` announces `ai_rewrite.done` |
| Dropzone keyboard-operable; drag = enhancement only; `aria-label` | ✅ | `<button>` opens hidden file input on Enter/Space; drag handlers layer on the same `validateNewFiles` path; `aria-label = dropzone_aria` |
| Char count `aria-hidden` (no keystroke spam); textarea keeps label + hint | ✅ | count `aria-hidden`; `<label for=reply-body>` + `aria-describedby=reply-body-hint` intact |
| Amber disclaimer contrast ≥ 4.5:1 light + dark | ✅ | `--ds-color-warning-soft` surface; light ≈ 12:1, dark ≈ 9.5:1 |
| Brand selected-card + brand AI primary-chip text ≥ 4.5:1 light + dark | ✅ | `text-brand-700` on `bg-brand-50` ≈ 8–9:1 both themes |
| Sheet focus trap intact | ✅ | `ui/sheet.tsx` (and its `use-inert-outside-modal` hook) unchanged by this diff |
| Dark-mode parity for every new surface | ✅ | all new colors route through tokens/Tailwind utilities; no literal markup hex |

## Informational notes (none block PASS)

1. **`text-amber-950`** on the two amber disclaimers is a Tailwind palette literal
   rather than a `--ds-color-*` token. Contrast-safe in both themes and correctly
   dark-overridden; a token-consistency nicety only.
2. **24 px attachment remove (`X`) buttons** are below the WCAG 2.5.5 **AAA** 44 px
   target. AA / BITV does not require it; KI chips meet the spec's ≥32 px.
3. The Skelett-disabled KI reason is a visible adjacent `<p>` (not
   `aria-describedby`-linked). Spec only requires a textual reason, and the chips
   are `disabled` (removed from tab order), so no SR user lands on them.

## Note on the `contextTemplate` fix

This pass also corrected a **pre-existing** bug (commit `6797e659`, 2026-05-13):
`FristCitedFormatHeader` / `FristAbgelaufenWarnung` were gated on
`formState.template`, which stays `'freitext'` while a Skelett is only
*recommended* — hiding the § -Frist context on open. The fix passes the
*recommended* template to those two components (without checking the radio or
filling the body), restoring the Frist context. No a11y impact; it repaired the
`frist-cited-format-header` assertions in `v1-5-1-widerspruch-sgg`,
`-widerspruch-vwgo`, and `-einspruch-aussetzung:64`.
