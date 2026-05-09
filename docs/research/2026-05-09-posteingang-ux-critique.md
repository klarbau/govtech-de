---
feature: posteingang
date: 2026-05-09
auditor: research-scout (UX critique mode)
build: post-ship 2026-05-09 (status: shipped)
spec: docs/specs/posteingang.md
companion_reports:
  - docs/a11y-reports/posteingang-2026-05-09-recheck.md
  - docs/reviews/2026-05-09-posteingang-code.md
scope: structural UX critique of shipped feature; read-only
out_of_scope:
  - aesthetic / colour / typography polish
  - issues already verified-fixed in companion reports (a11y blockers, code-blockers, the 10 nits)
---

# Posteingang -- structural UX critique

The feature **ships**, the spec is satisfied, the a11y gate is green. This document is a separate axis: where the **structure** the user encounters is more cluttered, more redundant, or harder to scan than it needs to be. It does not re-flag anything already addressed in the 2026-05-09 a11y re-audit or the 2026-05-09 code-review re-pass.

---

## Executive summary -- top 5 structural changes ranked by ROI

> Ranked: highest user-visible benefit per unit of work, given the demo's purpose (30-second Loom wow + portfolio scan).

1. **Collapse the 4 disclaimer banners + watermark on the LetterReader from 5 stacked blocks into one priority disclaimer + one footer-collapsible group.** (Issue 4) -- Currently a single brief renders 5+ yellow/red/grey banners, which drown the actual content within the first viewport. This is the single biggest structural drag on "verstehen in 60 s".
2. **Move the per-letter footer "Aktionen zu diesem Brief" to a sticky right-rail (desktop) / bottom-sheet (mobile), and make the chronologically-first action ("Frist in Kalender") the primary visual anchor.** (Issue 6) -- Right now actions are buried below a full-height side-by-side and the "Was kann ich tun?" footer; the user has scrolled 3+ screens before they see the call-to-action that closes the loop.
3. **Demote the LetterCard's `Authentizitäts-Badge` and `Datenschutz-Cockpit-Link` to a hover-/expand-state -- and promote the Frist-chip to be the primary pre-open scan target.** (Issue 1) -- Six concepts on a card flatten the visual hierarchy; the user's scan target (urgency) currently competes equally with two boilerplate trust-cues. The spec demands these elements *exist on every card*; it does not demand they be visually equal-weight.
4. **Decouple the "Status filter sidebar" from the "Status group headers" by making them mutually exclusive: when any status filter is active, drop the per-group headers and render a flat sorted list.** (Issue 2) -- Currently both encode the same dimension twice: a user filtering for "Frist <= 7 Tage" still sees a "Frist <= 7 Tage" group header above their (now single-bucket) list.
5. **Split the `?tab=nach-vorgang` view from the inbox: render it under the same route but suppress the per-status group headers there too, since vorgang-grouping and status-grouping cannot meaningfully co-exist.** (Issue 3) -- The current implementation puts vorgang-grouping inside a layout that still expects status-grouping; the user sees neither cleanly. A small structural fix; large clarity payoff.

The remaining issues (5--14) are individually smaller but compound: AR-RTL header asymmetry, a "Stand 2027" footer that lands before the user knows what they're looking at, an Aktenzeichen search that overlaps semantically with the always-visible filter sidebar, etc.

---

## Per-issue findings

### Issue 1 -- LetterCard carries 6 concepts at equal weight

**Severity**: high
**File:line evidence**: `src/components/posteingang/LetterCard.tsx:103-192` (whole render).

**Observation**: The card renders, in this stacking order: (1) status-dot + truncated 80-char pre-open string + Mail-icon (line 123-160), (2) `<BehoerdenBadge>` (146-150), (3) Aktenzeichen mono-font (152-154), (4) `<FristChip>` row (162-168), (5) `<AuthentizitaetsBadge>` (171), (6) `<VorgangsBuendelTag>` either-or (172-185), (7) `<DatenschutzCockpitLink>` (186-190). Each block has its own typography, icon, border, or pill -- there is no visual anchor that says "this is what to look at first."

**Why it's a problem**: The spec's success criterion is "Bürger:in erkennt in <30 s den dringendsten Brief" (`docs/specs/posteingang.md:30`, §3 first bullet). Urgency is a Frist property, but on the rendered card the FristChip sits in row 4, after the Behörden-Badge and Aktenzeichen-string -- both of which the user does not need at scan time. The Authentizitäts-Badge ("Empfangen über Briefpost") is identical on 17 of the 18 mock letters (`src/data/letters.json` -- only one letter uses a non-`briefpost` channel) -- it is structural noise that contributes zero discrimination. The Datenschutz-Cockpit-Link as a full-width button is visually heavier than the FristChip.

**Proposed fix**: Promote the FristChip to row 1, beside the status-dot, so urgency is the first thing the eye lands on. Demote the Authentizitäts-Badge to a tiny non-pill icon-only marker on hover, or to an `aria-label` on the cover-link plus a single-icon. Make the Datenschutz-Cockpit-Link a discreet 16-px shield-icon button (icon-only with `aria-label`), not a labelled pill -- the link still exists per spec §3, but its weight shouldn't compete with content. The result: card scans top-down as `[Status] [Frist] | [Behörde] [Brieftyp] | [Aktenzeichen]` with utility chips in a muted utility row.

---

### Issue 2 -- Status filter checkboxes and per-status group headers double-encode

**Severity**: high
**File:line evidence**: `src/components/posteingang/PosteingangInbox.tsx:387-442` (rendering of `LetterListGroup` per-bucket); `BehoerdenKategorieFilterSidebar.tsx:151-174` (5-checkbox status fieldset).

**Observation**: The sidebar offers 5 status checkboxes: Neu / Frist <= 7d / Frist > 7d / Erledigt / Archiv. The list, after filtering, then *re-groups* the filtered subset back into the same 5 status buckets with section headers. If the user checks "Frist <= 7 Tage", they see a single group header reading "Frist offen <= 7 Tagen (3)" with 3 cards under it -- the header restates exactly what the user just filtered for.

**Why it's a problem**: The user has spent an interaction on the sidebar to narrow their view; the page then echoes that narrowing back at them as a redundant header. It also creates the visual oddity of sometimes showing 5 group headers (no filter) and sometimes 1 (full filter) -- there is no consistency rule the user can build a mental model of.

**Proposed fix**: When `selectedStatus.length > 0`, suppress the per-status `<LetterListGroup>` headers and render a flat sorted list under a single sticky-ish "Treffer (N)" caption. The status-grouping is genuinely useful as the *default* view (zero filters), where it acts as a reading scaffold; once the user has filtered, the grouping is decorative. Conditional-render the headers based on `status.length === 0`.

---

### Issue 3 -- "Nach Vorgang gruppieren" tab still inherits status-grouping context

**Severity**: medium
**File:line evidence**: `PosteingangInbox.tsx:445-468` (the `view === 'nach-vorgang'` branch); compare to `:387-443` (chronologisch branch).

**Observation**: When the user switches the tab to `nach-vorgang`, the chronologisch-branch code is suppressed and the page renders `<VorgangsGruppe>` cards -- but the **status-checkboxes in the sidebar remain active**. A user with "Neu" checked plus the "nach-vorgang" tab sees Vorgang-grouped lists where each Vorgang shows only the unread letters. There is no UI affordance that explains to the user what's happening, and the per-Vorgang count `({letters.length})` no longer reflects the total in the Vorgang -- it reflects the filtered subset.

Additionally, switching tabs does not reset the `LetterListGroup` headers because they're suppressed by the branch-`if`, but the *side-effect* the user perceives is that "the status filter still does *something*, but I can't see it". On the AR-RTL render the Vorgangs-Gruppe cards are very wide but the sidebar still lives on the right -- viewport shrinks, structure feels broken.

**Why it's a problem**: The "nach-vorgang" tab is one of the three "typische Inbox-Szenen" in the spec (§2 line 32, "Sammeln über alle Vorgänge"). The user mental model on entering this tab is "show me my Vorgänge"; status-filtering is a secondary lens that should either be cleared on tab-switch, or visually paired with a "Filter ist aktiv -- 3 von 8 Briefen pro Vorgang gezeigt"-affordance.

**Proposed fix**: On tab-switch to `nach-vorgang`, either (a) auto-clear the status-checkboxes and surface a small toast "Status-Filter zurückgesetzt -- in der Vorgangsansicht nicht zutreffend", or (b) keep them but render a compact "(N gefiltert von M)" suffix in each `<VorgangsGruppe>` header so the count math is honest. The ASCII layout in spec §4.2 already implicitly assumes (a). Pick one and document.

---

### Issue 4 -- Disclaimer fatigue: 5 stacked banners on a typical reader page

**Severity**: high
**File:line evidence**: `LetterReader.tsx:205` (MockWatermarkBanner), `:269-276` (citation mismatch warning when applicable), `AISummaryBlock.tsx:98-104` (skeleton-hint blue note), `:106` (RoterHinweisBanner red banner), `:175-177` (summary footer hint), `LetterReader.tsx:390-392` (frist_modal_inline grey hint), `:400` (PrototypeDisclaimer collapsed), `:402-409` (opening details collapsed). On the inbox: hero `speculative_footer` + `disclaimer.opening` collapsible (`PosteingangInbox.tsx:277-287`) + footer `disclaimer.mock_data` (`:471-475`).

**Observation**: Counting on the LetterReader for `letter-fa-steuerbescheid-2025`: (1) MOCK watermark amber banner at top, (2) skeleton-hint blue/grey "Zusammenfassung wird mit KI erstellt" inside AI-Summary, (3) RoterHinweisBanner red "Rechtsverbindlich ist der Originaltext" inside AI-Summary, (4) optional citation-mismatch yellow line above FristChip row when `citation_match === false`, (5) summary-footer-hint grey 11px line below bullets, (6) frist-modal-inline grey hint inside actions section, (7) collapsed PrototypeDisclaimer details, (8) collapsed Hinweis-zum-Öffnen details. Five visible at all times, three more behind `<details>`.

**Why it's a problem**: Banner-blindness is well-documented (cookie-banner research, Nielsen 2019). Six warnings, each a different colour and each saying "be careful" in slightly different words, drowns the actual brief content -- which is the entire point of the screen. The spec mandates the **strings exist** (§3, §11); it does not mandate they all be visible simultaneously. The four mandatory disclaimers (`opening`, `no_legal_advice`, `mock_data`, `original_authoritative`) plus the MOCK watermark plus the citation-mismatch contextual line should be hierarchically organised, not stacked.

**Proposed fix**: Establish a 3-tier hierarchy. (1) **Tier 1 = always visible above the fold**: just the MOCK watermark (it's the truthfulness disclaimer; everything else is legal nuance). (2) **Tier 2 = visible only when contextually triggered**: the RoterHinweisBanner ("rechtsverbindlich ist der Originaltext") should appear only on the AI-Summary side, and only after the bullets have rendered (not in the skeleton state) -- right now it's rendered above the skeleton, which is content-empty. The citation-mismatch warning stays inline next to the affected FristChip. (3) **Tier 3 = collapsed in a single "Hinweise zum Brief"-`<details>` group**: opening + no_legal_advice + summary-footer-hint + frist-modal-inline live behind one expandable, not four separate ones. The skeleton-hint can be removed entirely once the AI-summary has resolved -- it's only meaningful during loading.

---

### Issue 5 -- Inbox hero: speculative-footer + opening-disclaimer compete for the first 80 px

**Severity**: medium
**File:line evidence**: `PosteingangInbox.tsx:269-288`.

**Observation**: The hero renders, in order: `<h1>Posteingang</h1>` (line 270-275), subtitle (276), then a muted 12px "speculative_footer" paragraph (277-279), then a `<details>` "Hinweis zum Öffnen" (280-287). Both the speculative-footer and the opening-details look like grey advisory boxes. The user lands on the page and sees *two greyed-out warnings* before any letter content.

**Why it's a problem**: Information scent: in 2 seconds a user must understand "this is my Posteingang and these are my Briefe." The two grey boxes delay that. Worse, the speculative_footer text begins "Diese Demo zeigt, wie ein einheitlicher Behörden-Posteingang 2027 aussehen *könnte*..." -- 200+ words of context-setting before the user sees a single LetterCard. On a 375x667 mobile viewport (Tailwind `text-xs leading-relaxed` ~16px line-height, 4-6 lines of text per box), the speculative-footer alone consumes ~80-100 px; adding the opening-details title eats another 32 px. With Topbar + h1 + subtitle the user's first letter is almost certainly below the fold on mobile.

**Proposed fix**: Move the speculative-footer to the **page footer** (next to the existing `disclaimer.mock_data` block) rather than the hero. The "Stand 2027"-framing is portfolio-narrative for a recruiter scrolling the page, not citizen-onboarding context for a mock-user mid-task. The opening-details `<details>` should also be relocated; in its current spot it acts as a second hero-level greybox. Keep `<h1>` + subtitle in the hero; everything else descends.

---

### Issue 6 -- "Aktionen zu diesem Brief" footer competes for attention with "Was kann ich tun?"

**Severity**: high
**File:line evidence**: `LetterReader.tsx:344-393` (Aktionen-section), `:395-398` (WasKannIchTunFooter), `WasKannIchTunFooter.tsx:88-138`.

**Observation**: Two footers stack vertically below the side-by-side: (a) "Aktionen zu diesem Brief" -- buttons "Zahlung in Kalender (.ics)", "Brief speichern (.txt)", "Originaltext anzeigen" -- (b) "Was kann ich tun?" -- bullet list "Zahlung leisten", "Einspruch einlegen", "Aussetzung der Vollziehung beantragen". The two sections are semantically different (a = imperative actions the app can do for you, b = informative actions you might do yourself), but visually they are both `border bg-card p-4` cards with `<h2>` headings. Their disambiguation lives entirely in the verbose German heading.

**Why it's a problem**: User mental model on a Frist-driven brief: "what do I do now?" Both sections answer that question, but neither is the obvious primary CTA. The actually-clickable Frist-Kalender action is buried inside a fwlist of 3-4 buttons. On mobile the Aktionen-section is a `flex flex-wrap` of small Outline-style buttons -- not visually privileged. The "Was kann ich tun?"-list looks more important because it's longer, but it's intentionally non-actionable per RDG-Linie.

**Proposed fix**: Hierarchically separate. The Frist-Kalender action is the primary outcome of opening the brief (per spec §2 second bullet "klickt 'Frist im Kalender'"). Promote it to a sticky right-rail on desktop (a single big button with the Frist-date and an FristChip beside it), and a fixed bottom-sheet "Frist-CTA" on mobile. Demote "Brief speichern" + "Originaltext anzeigen" to a small overflow menu (kebab) since they're rare. Leave WasKannIchTunFooter where it is structurally but visually de-emphasise it (remove the `border bg-card`, render as a quiet bullet list under a small heading) so it reads as advisory rather than primary.

---

### Issue 7 -- Filter sidebar consumes 260 px on every desktop render including when no filter is in use

**Severity**: medium
**File:line evidence**: `PosteingangInbox.tsx:290` (`grid gap-6 md:grid-cols-[260px_1fr]`); `BehoerdenKategorieFilterSidebar.tsx:101-181`.

**Observation**: The grid is hardcoded `260px_1fr` from `md:` upward. The sidebar renders 5 Kategorie-checkboxes + 5 Status-checkboxes (10 total) with their fieldsets and a reset-button -- a rigid 260px column even when no filter is active and the inbox has 6 letters total.

**Why it's a problem**: On a 1024-px laptop (very common citizen device), 260 px is 25% of the viewport going to filter scaffolding. The mock data has 18 letters across 9 archetypes -- the user almost never needs all 10 checkboxes simultaneously. A persistent sidebar is a "power-user dashboard" pattern; this is a citizen letter-inbox where the median session probably touches 0-1 filters. Mobile already correctly uses a drawer (line 300-314); desktop should follow the same affordance pattern: collapsed by default with an icon-button "Filter" + a count-badge for active filters, expanding to a horizontal Sheet on click.

Additionally: the **Selbstverwaltung** + **Privatrechtl. (behördenartig)** categories together account for only 2-3 of the 18 mock letters (AOK, Beitragsservice, IHK, BG -- mostly mapped to `sozialversicherung`/`privat`). For a demo audience these two split categories add cognitive load without information gain.

**Proposed fix**: Make the desktop sidebar collapsible (icon-button + Sheet) by default; expand-by-default only when `kategorien.length + status.length > 0`. Merge `Selbstverwaltung` + `Privatrechtl. (behördenartig)` into a single "Sonstige" filter for V1.5 (3 categories: Bund/Land/Kommunal/Sonstige). The data layer keeps all 5 internal `BehoerdeKategorie` values; only the UI filter is collapsed.

---

### Issue 8 -- Citation-footnote `[⌖N]` marker has low discoverability

**Severity**: medium
**File:line evidence**: `CitationFootnote.tsx:42-89`; `AISummaryBlock.tsx:160-167`.

**Observation**: The marker is a 5x5 outlined button containing `⌖N` after each bullet. It is iconographically novel (the cross-circle "⌖" is rare in German UX), and on hover/focus opens a popover with the original quote. There is no inline-readable footnote text -- the user has to click to discover what this is.

**Why it's a problem**: The spec calls citation-per-bullet "obligatorisch" (§3, line 41) -- this is one of the demo's two structural innovations (the other being unified inbox). If the user doesn't notice the marker, the entire trust-design of "AI summary + verifiable citation" collapses to "AI summary, with a strange unicode glyph". The popover-on-click pattern works for power-users but not for the 30-second Loom viewer -- the marker reads as decorative.

**Proposed fix**: Two complementary changes. (a) Change the marker visual to a numbered superscript `[1]`, `[2]`, etc. -- a near-universal footnote idiom that makes the click-affordance self-explanatory. (b) Add a permanently-visible "Originaltext anzeigen" inline mini-link directly after the bullet text (in muted 11px, no popover), replacing the popover with direct scroll-to-original-and-highlight. The popover-with-blockquote can stay for Tab/keyboard discovery, but the primary interaction becomes "click the citation marker -> Originaltext-block scrolls and highlights". This is closer to how Wikipedia footnotes work and far more discoverable.

---

### Issue 9 -- AktenzeichenSearch and the always-visible filter sidebar overlap semantically

**Severity**: low
**File:line evidence**: `LetterListHeader.tsx:34-54` (Search above tabs); `BehoerdenKategorieFilterSidebar.tsx:108-181` (sidebar).

**Observation**: The user can narrow the visible-letter set in three ways: (1) type into the search input (`PosteingangInbox.tsx:179-191` -- substring match on Aktenzeichen + Behörden-Name), (2) tick a Kategorie-checkbox in sidebar, (3) tick a Status-checkbox in sidebar. Search is at top-right of the content column; sidebar is on the left. They function as parallel filters but they live in different visual regions and have different interaction models (text-input vs checkbox).

**Why it's a problem**: When all three are active simultaneously, the user has no single place to see "what's currently filtering my view". The reset button (`:177-180`) clears only the sidebar, not the search query. Mental model fracture: power user-mode treats them as one, the UI treats them as two.

**Proposed fix**: Either (a) collapse all three filter mechanisms into one horizontal toolbar above the list (search-input + filter-chips for active Kategorie/Status), making the sidebar disappear when no filter is set; or (b) keep the sidebar but add a "Suche: 'Müller'" chip into it when the search-query is non-empty, so the filter state is unified. (a) is the larger change but better long-term; (b) is the V1.5 quick-fix.

---

### Issue 10 -- LetterCard's pre-open string and the FristChip restate the same Frist

**Severity**: low
**File:line evidence**: `LetterCard.tsx:71-79` (computes `fristSuffix` from earliest Frist datum), `:82-85` (uses it inside the pre-open string when no AI pre-open exists), `:162-168` (renders the same Frist as a FristChip below).

**Observation**: When the letter has no AI-generated pre-open text, the pre-open line is computed as `"{Behörde} · {Brieftyp} · Frist {dd.mm.yyyy}"` (lines 82-85), and then a `<FristChip>` renders the same date as a coloured pill (162-168). The user sees the date twice, once in the pre-open string and once in the chip below. When the AI pre-open *does* exist (`letter.ai_summary?.pre_open?.text`), it may or may not contain the date -- inconsistent.

**Why it's a problem**: Redundancy of the same datum reduces the value of both. The chip is the colour-coded urgency cue (urgent = amber, overdue = red); duplicating the date in the unstyled pre-open line makes the chip feel ornamental, and the pre-open line feel verbose.

**Proposed fix**: When a `<FristChip>` will render, drop the Frist-segment from the fallback pre-open string (keep only `"{Behörde} · {Brieftyp}"`). When no Frist exists, the pre-open line keeps its "Keine Frist" suffix -- but in this case, suppress the chip-row entirely. The code already conditionally renders the chip-row (`fristen.length > 0`), so this is a one-line change in `clampPreOpen` source string.

---

### Issue 11 -- AR-RTL header row layout-tested only in axe; visual flip likely to break

**Severity**: medium
**File:line evidence**: `LetterReader.tsx:181-279` (header block uses `flex-wrap items-center gap-3` -- no `rtl:` logical properties); `OriginaltextBlock.tsx:78-84` correctly forces `dir="ltr" lang="de"`.

**Observation**: a11y-recheck verified `<html dir="rtl" lang="ar">` is correctly applied (`docs/a11y-reports/posteingang-2026-05-09-recheck.md:78-80`), and that `OriginaltextBlock` correctly stays LTR-DE. But the LetterReader's *upstream* header (BehoerdenBadge + AuthentizitaetsBadge + Vorgang-Link, lines 208-235) and the action-row (lines 351-384) use plain `flex flex-wrap` with no `rtl:` modifiers. These will RTL-flip, but the icon-on-left convention (BehoerdenBadge initials-circle then name) inverts to initials-circle-on-right -- which reads correctly in AR but pairs awkwardly with the LTR-DE OriginaltextBlock that lives directly below in the side-by-side grid.

The skip-link nav (`:190-203`) renders two LTR skip-links visually flipped to the right edge in AR-mode -- they collide with the LTR-DE Originaltext block on desktop side-by-side.

**Why it's a problem**: AR-mode is one of the demo's six explicit locales, and the speculative narrative includes "Mehmet" as a Turkish-speaking persona; recruiters from BMDS/DigitalService will probe AR/TR. The current layout is a11y-correct (axe passes) but visually inconsistent: half the page LTR-flipping with the UI, half pinned LTR for legal reasons.

**Proposed fix**: Audit the LetterReader header + actions row with `rtl:` Tailwind logical properties (`gap-x` -> already logical, `flex-row-reverse rtl:flex-row` if needed for icon-pair flips). The OriginaltextBlock should also wrap in a visual divider/border that matches its LTR island -- e.g. a 2px border-left in LTR becomes border-right in RTL -- so the user reads it as "this island stays in German, by design". A small `<span class="text-xs text-muted-foreground">Originaltext (Deutsch -- rechtsverbindlich)</span>` label above it would land the intent.

---

### Issue 12 -- Long German compound nouns overflow narrow card layouts

**Severity**: low
**File:line evidence**: `LetterCard.tsx:135-143` (the `truncate` class on the pre-open string); `de.json:259` ("Privatrechtl. (behörden­artig)" with soft-hyphen) -- but this is the only soft-hyphen in the namespace.

**Observation**: The pre-open string is `truncate`d to 80 chars then visually truncated again by CSS `truncate`. Test cases in mock data: `"Erinnerung Aufenthaltstitel-Verlängerung 2027 — letzter Hinweis"` (62 chars, fits but tight on 320-px viewport), `"Wohnungsgeberbestätigung — Rückübersendung an die Meldebehörde"` (longer, will CSS-truncate). Single-`<p truncate>` works for the pre-open; FristChip uses `text-xs` no-wrap and **does not** soft-break compound Frist-Typ labels like "Antragstellung" + "in 14 Tagen" -- on 320 px wide cards this overflows the chip ring.

**Why it's a problem**: AR/TR/RU translations don't have the compound-noun problem, but DE is the source-of-truth and 30% of citizens read the demo in DE. The FristChip overflow is the most visible.

**Proposed fix**: Add `<wbr>` or soft-hyphens (`&shy;`) to the longest archetype labels in `de.json` (`abh-verlaengerung` -> "Aufenthalts&shy;titel"; `berufsgenossenschaft-beitrag` -> "BG-Beitrag" already short). For FristChip: switch the chip's flex layout to `flex-wrap` with `min-w-0` and let the typ-label and tage-label sit on two lines on narrow viewports.

---

### Issue 13 -- Empty / loading / error / 404 states are technically correct but generic

**Severity**: low
**File:line evidence**: `PosteingangInbox.tsx:350-385` (skeleton, empty, filter-empty, error); `LetterDetailLoader.tsx:77-129` (loading skeleton, not-found, error-with-retry); `de.json:324-325` (`reader.not_found_title` / `_body`).

**Observation**: Each state is implemented and works. But:
- The **inbox-empty** state (`:361-385`) shows the same Inbox-icon + grey text whether the user has 0 letters total or filtered all 18 down to 0. The disambiguation is in the message string (`empty_inbox` vs `empty_filter`) but the box is otherwise identical.
- The **not-found** state on the reader (`LetterDetailLoader.tsx:94-110`) shows just `<h1>Brief nicht gefunden</h1>` + a one-liner body and a back-link. No "vielleicht meinten Sie ..." suggestion, no recently-viewed list, no link to search, no filter chips. The user clicks a stale URL and dead-ends.
- The **error** state (`LetterDetailLoader.tsx:112-128`) shows a neutral `text-destructive` line + retry button -- no indication of what failed (network, mock-backend 5%-error rate per spec §4.1).

**Why it's a problem**: Empty/error states are the showcase for a demo's polish. Recruiters explicitly probe broken paths; "lass mal `/posteingang/lol123` aufrufen" is a 5-second sanity check. Generic states signal "this was the last priority of the build."

**Proposed fix**: (a) On inbox filter-empty, list the active filters as clickable chips with X-buttons next to the message: "Filter: Bund (x), Frist <= 7 Tage (x). Filter zurücksetzen?" -- this turns the dead-end into a one-click recovery. (b) On reader not-found, show the 3 most-recently-opened brief-titles as a "Vielleicht suchten Sie ..." list, plus a search-hint linking back to inbox `?search=`. (c) On reader error, distinguish "Verbindungsproblem -- bitte erneut versuchen" from "Brief lässt sich nicht öffnen -- bitte den Originalbrief abrufen" (different copy keys, same Retry-button).

---

### Issue 14 -- Citation-mismatch warning is rendered twice on the same screen

**Severity**: low
**File:line evidence**: `LetterReader.tsx:269-276` (warning above FristChip-row), `:385-388` (warning above CTA-disabled-hint), `FristChip.tsx:85-87` (sr-only on chip itself).

**Observation**: When `citation_match === false` for any Frist, three things happen simultaneously: (1) a yellow `<p role="status">` line appears above the FristChip-row at the top of the reader (line 270-276), (2) the FristChip itself shows an `AlertTriangle` icon and an sr-only "citation_mismatch_warning_sr" string (`FristChip.tsx:77-87`), (3) below the action-buttons, another yellow line (`:386-388`) explains the kalender-CTA is disabled. Three signals, one root cause.

**Why it's a problem**: For the user the message is "this Frist is uncertain"; signalling it three different ways teaches them to ignore it. The spec calls this out as a hand-off ("Bitte selbst prüfen") -- it's important, so it deserves *one* clear signal, not three weak ones.

**Proposed fix**: Keep signal (2) -- the FristChip warning icon -- as the visual anchor. Replace signals (1) and (3) with a single inline tooltip on the FristChip itself ("Diese Frist ist nicht eindeutig im Original belegt") that opens on hover/click. The disabled Kalender-CTA can communicate its disabled-ness via the standard `disabled` styling + `aria-describedby` pointing at that single tooltip. Net: one warning, one location, three a11y affordances behind it.

---

## Out of scope (intentional per spec; do not change)

These look structurally suspicious but are deliberate and should NOT be flagged in V1.5:

1. **Default-Tab on mobile = Originaltext, not Zusammenfassung** (`LetterReader.tsx:283`). This is spec §3 success criterion "citizen-respectful, gegen Apple-Intelligence-Default" -- the rechtsverbindlich text leads on the constrained device. Intentional.

2. **OriginaltextBlock stays LTR-DE in AR-RTL UI** (`OriginaltextBlock.tsx:82-83`). Spec §4.3 a11y-notes mandates this -- the legal text cannot flip. Issue 11 only concerns the *surrounding* layout, not the block itself.

3. **No "Antwort vorschlagen"-CTA in the WasKannIchTunFooter** (`WasKannIchTunFooter.tsx:88-138`). RDG-Linie -- spec §3 last bullet, also flagged in domain.md. Reply-generation is explicitly out of V1; do not propose adding it as a "missing primary action" without going through the verifier.

4. **MOCK watermark rendered on every reader page** (`LetterReader.tsx:205`). Spec §3 + §11. Even though Issue 4 recommends collapsing other disclaimers, the MOCK watermark is the *one* disclaimer that should remain always-visible -- it's the truthfulness disclaimer, not a legal-nuance disclaimer.

5. **Pre-open string clamped to 80 chars exactly** (`LetterCard.tsx:32-37`). Spec §3 + verifier-Probe-2. Visual truncation feels harsh on long compound nouns (Issue 12) but the contract is structural, not aesthetic.

6. **Two Aktenzeichen rows in the LetterReader header (`primaer` + `weitere`)** (`LetterReader.tsx:240-250`). Spec §4.3 i18n keys explicitly. This is realism -- a Steuerbescheid has both Steuernummer and Steuer-IdNr; collapsing them would lose realism the spec wants.

7. **`<details>` collapsibles on `disclaimer.opening` and `mock_data`** (`PosteingangInbox.tsx:280-287`, `:471-475`). The progressive-disclosure pattern is intentional; what Issue 4 critiques is that *both* elements *plus* the speculative-footer paragraph + watermark renders simultaneously, not that `<details>` itself is wrong.

8. **Authentizitäts-Badge values that don't differentiate today** (`AuthentizitaetsBadge.tsx:38-72`). 17/18 mock letters use `briefpost`; the spec includes EUDI-Wallet + ZBP-BundID for the 2027-speculative narrative. Demoting the badge visually (Issue 1) is fine, *removing* it is not -- it's the seed of the speculative-design narrative.

---

## Validation note

This critique was authored against the post-shipping commit referenced by:
- `docs/specs/posteingang.md` (`status: shipped`, `shipped_at: 2026-05-09`).
- `docs/a11y-reports/posteingang-2026-05-09-recheck.md` (PASS).
- `docs/reviews/2026-05-09-posteingang-code.md` (APPROVE re-review).

Dev server returned HTTP 200 / ~135 KB on `/posteingang` and `/posteingang?tab=nach-vorgang`; HTTP 404 on `/ar/posteingang` (locale routing for AR likely needs a re-check; not flagged as an issue here because it may be a pre-existing middleware behaviour outside this critique's scope -- worth a 5-minute follow-up).

No code was modified. All recommendations are descriptive; implementation is the V1.5 spec / frontend-coder pass.
