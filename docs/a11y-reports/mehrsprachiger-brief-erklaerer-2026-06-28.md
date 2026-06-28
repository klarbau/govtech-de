---
feature: mehrsprachiger-brief-erklaerer
date: 2026-06-28
auditor: a11y-tester
build: 4ccbdbb + integration fix + contrast fix (branch claude/buergerservice-ideas-k5c08z), audited against live next dev on :3000
verdict: PASS
track: supporting
---

## Verdict
**PASS** — The feature renders on the LIVE `/posteingang/[id]` route (verified in the running app, not
on a self-report) and is WCAG 2.1 AA / BITV 2.0 clean across RU + AR, light + dark. The single serious
color-contrast violation found in the re-audit (amber badge hint line, light mode) has been fixed and
re-verified as gone. Supporting-tier a11y PASS.

> Audit trail: pass 1 = FAIL (feature wired only into dead readers, not on the live route). pass 2
> (after integration) = FAIL (1 serious color-contrast, badge hint, light only). pass 3 (after
> `text-amber-700/90` → `text-amber-800` on the hint line) = PASS.

## Routes tested (live next dev :3000, full-chromium, WCAG 2.1 A/AA tags)
- `/posteingang` (inbox, RU) — PASS (0 violations; card hint renders)
- `/posteingang/letter-abh-erinnerung-verlaengerung` (Anna, citation_match=false):
  - RU LIGHT — PASS (0 violations) ← previously failed on contrast, now clean
  - RU DARK — PASS (0 violations)
  - AR LIGHT (RTL) — PASS (0 violations) ← previously failed on contrast, now clean
  - AR DARK (RTL) — PASS (0 violations)

## 1. New nodes render on the live surface (integration confirmed)
| Locale / mode | `ol[lang]` | dir | bullets | Erklärer toggle (aria-label) | badge | `<bdi dir=ltr>` | [MOCK] |
|---|---|---|---|---|---|---|---|
| RU LIGHT | 1 | — | 5 | "Язык пояснения" | 1 | 3 | yes |
| RU DARK | 1 | — | 5 | "Язык пояснения" | 1 | 3 | yes |
| AR LIGHT | 1 | rtl | 5 | "لغة الشرح" | 1 | 5 | yes |
| AR DARK | 1 | rtl | 5 | "لغة الشرح" | 1 | 5 | yes |

Inbox list card hint: 2 `svg.lucide-languages` icons in RU (the two seeded letters), each with sr-only
`card.in_ihrer_sprache_hint`. Toggle options resolve to all 6 native endonyms.

## 2. Amber TranslationDisclaimerBadge — color contrast (FIXED)
| Line | Light | Dark |
|---|---|---|
| DE Pflichtsatz `text-amber-900` on `bg-amber-50` | PASS | PASS (`dark:text-amber-100`) |
| active-lang badge `text-amber-800` | PASS | PASS (`dark:text-amber-200`) |
| active-lang hint `text-amber-800` (was `amber-700/90`) | **PASS** (was 3.95:1, now ≥ 4.5:1) | PASS (`dark:text-amber-300/80`) |

Live axe `color-contrast` rule on RU LIGHT and AR LIGHT: **0 nodes**. The 1.4.3 violation is gone.

## 3. Toggle / lang / dir / bdi
- [x] Real control, keyboard-operable; accessible name via `sprache_label` (localized); focus ring
  `focus-visible:outline-2`; 44px min target. (WCAG 2.1.1, 2.4.7, 4.1.2)
- [x] `lang` on translated container (`ol[lang="ru"]` / `ol[lang="ar"]`). (3.1.2)
- [x] AR `dir="rtl"` on the list. (1.3.2)
- [x] `<bdi dir="ltr">` isolates German §/numbers/dates in AR (5 islands). (1.3.2)

## 4. No new axe WCAG 2.1 AA violations
- Inbox `/posteingang` (RU): 0. Detail RU LIGHT/DARK: 0. Detail AR LIGHT/DARK: 0.
- At/above the known-good baseline; the feature introduces **no** net violations.

## Manual rubric
- [x] Semantic HTML (`<ol>/<li>`, real Select button, `role=note` badge)
- [x] Landmarks/headings unchanged (heading order intact, no new `<h1>`)
- [x] Focus visible + logical
- [x] Color contrast (all badge lines pass light + dark)
- [x] Motion (`useReducedMotion` zeroes bullet stagger)
- [x] Language of parts (`lang` on translated runs; citations `lang="de"`)
- [x] Live region `aria-live="polite"` on summary section (pre-existing, acceptable)
- [x] i18n parity — all 6 erklaerer keys + `card.in_ihrer_sprache_hint` in de/en/ru/uk/ar/tr

## BITV 2.0 specifics
- [x] "Erläuterung" framing; non-binding badge (DE + active language), not collapsible; [MOCK] watermark
  on every translated view — live-confirmed.
- [x] `<html lang>` flips per UI locale; `dir="rtl"` at document root for ar.

## Issues to fix
- None blocking. Feature passes on the live shipped surface.

## Recommendations for code-reviewer
- Clear to merge from an a11y standpoint. The earlier integration gap and the light-mode badge contrast
  are both fixed and re-verified in the running app.
- For future passes: the badge's light-mode contrast was the inverse of the usual dark tinted-band
  gotcha — keep light AND dark in the contrast check, not dark only.

## WCAG criteria referenced
- 1.4.3 Contrast (Minimum) — all badge text, light + dark: PASS (hint line fixed).
- 1.3.1 / 1.3.2 — `lang`/`dir`/`bdi` on translated bullets: PASS.
- 2.1.1 / 2.4.7 / 4.1.2 — toggle keyboard, focus, name/role/value: PASS.
- 3.1.2 Language of Parts — `lang={activeLang}` + `lang="de"` citations: PASS.

## Temp artifacts to remove (rm is permission-blocked for the auditor)
- `tests/a11y/erklaerer-reaudit.spec.ts`
- `playwright.erkl.config.ts`
- `test-results/` (if present)
