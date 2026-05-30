# Mock-Backend Convenience Gaps — Data + Operations Audit

- date: 2026-05-29
- author: mock-backend-coder (ANALYSIS ONLY — no code or data written)
- scope: `src/lib/mock-backend/{seed,api,store}.ts`, `src/lib/mock-backend/autopilot/umzug.ts`,
  `src/types/{letter,document,vorgang,termin}.ts`, `src/data/*.json`
- method note: the actual layout differs from the task brief. The mock backend is **NOT**
  under `src/lib/mock-backend/server/` — the hand-written data lives in `src/data/*.json`
  fixtures, and `seed.ts` only *loads* them into a store. There is no monolithic data
  `store.ts`; `store.ts` is a thin KV abstraction. Personas live in `personas.json` and
  there are **three** of them, not one.

## Premise

The demo's hero is **what the system does FOR the user** — the cross-Behörden autopilot
cascade, "today's to-dos handled automatically," progression without the citizen chasing
paper. To a GovTech stakeholder the wow is *convenience over time*: things move, link up,
and resolve on their own. This audit measures whether the **mock data + backend
operations** can actually SHOW that.

## What exists today (corrected baseline — counts verified against the fixtures)

**Entities** (all real, richly typed): Letter, Document, Vorgang (+AutopilotStep/`schritte`),
Termin, Reminder, Persona, ConsentEntry, plus deep Stammdaten/Datenschutz/Steuer/Familie/
Mobilität read-models. Linkage schema is fully present: `vorgang_id` on Letter/Document/
Termin/Reminder; `letter_id` on each Vorgang `schritt`.

**Seed volume (verified):**
- `letters.json`: **28 letters**, spread across 3 personas, rich `body_de` + `ai_summary`
  + `fristen[]` + archetypes. Genuinely good variety (Steuerbescheid erstattung +
  nachzahlung, KK-Beitrag, Beitragsservice-Mahnung mit Säumniszuschlag, ABH-Erinnerung,
  Familienkasse-Mitwirkung, Standesamt-Termin-Vorschlag, Renteninfo, Pflichtumtausch,
  FZV-15, FAER).
- `documents.json`: **19 documents** (all Anna), good kategorie spread incl. one
  `gueltig_bis` in the past (Mietvertrag) and one ablaufend (Personalausweis 2026-08-04).
- `vorgaenge.json`: **4 Vorgänge** (all Anna): Erstanmeldung 2024 (abgeschlossen, 4
  confirmed steps), Umzug (in_pruefung, **mixed states**: 4 confirmed / 1 in_progress /
  1 pending), Aufenthaltstitel-Stub (angelegt, 1 self_assigned), Kindergeld (in_pruefung,
  1 self_assigned).
- `termine.json`: **5 Termine** (all Anna).
- `reminders.json`: **4 reminders** (all Anna).
- `personas.json`: **3 personas** — anna-petrov (default), markus-schmidt, mehmet-yildiz.

So the data is **far richer than the brief implied.** The convenience problem is not "too
few records" — it is **uneven population across personas, broken/partial cross-linkage, no
durable autopilot output, and a frozen + already-stale clock.** The findings below are
re-scoped to the real state.

## Headline findings (the three that hurt most)

1. **Linkage is half-wired, and the wiring that exists points at the WRONG Vorgang.** This
   is the single most damaging realism bug. Inspect the cross-references:
   - `vorgang-anna-anmeldung-2024` (the 2024 Erstanmeldung) and the live `vg-anna-umzug-
     skalitzer-friedrichstr` **both** claim `letter-buergeramt-meldebestaetigung-anmeldung`
     as their Bürgeramt `step.letter_id`. The same 2024 letter is double-booked: it is
     `vorgang_id`-stamped to the 2024 Anmeldung (correct), yet the *2026* Umzug's Bürgeramt
     step also references it as if the move just produced it. A stakeholder clicking the
     Umzug's "Anmeldung abgeschlossen" step lands on a 2024 letter about a different
     address — instantly reads as fake.
   - The live Umzug Vorgang has **no letter and no document carrying its `vorgang_id`** —
     none of the 28 letters reference it, and the new Meldebestätigung it implies does not
     exist. Its confirmed Finanzamt / Beitragsservice / KFZ steps have **no `letter_id` at
     all** (only the mis-pointed Bürgeramt step does).
   - `vorgang-anna-kindergeld-aktualisierung-2026` exists, but Anna's Familienkasse letter
     (`letter-familienkasse-bewilligung`) carries **no `vorgang_id`** linking to it; the
     Mitwirkungs-Aufforderung that should drive this Vorgang is on a *different persona*
     (markus-schmidt's `letter-schmidt-familienkasse-nachweis`). So Anna's Kindergeld
     Vorgang has a Frist and a self-task but no letter to open.
   **Why it limits convenience:** the Vorgang-detail view — the screen that should prove
   "one move, here's everything it touched" — renders either a wrong-year letter or a dead
   link. The most convincing convenience signal is actively undermined.

2. **The Umzug autopilot leaves almost no durable artefact.** `umzugAutopilot` emits
   confirmation **letters** (good) but: it mints **no new Meldebestätigung document** (the
   `createWohnungsgeberDoc()` helper only fires if the user *uploaded* a Wohnungsgeber-
   bestätigung — it never creates the *output* Meldebestätigung); it mints **no new
   Zulassungsbescheinigung Teil I** after the KFZ Block-D step; it creates **no Termin**
   (the ABH Block-D letter literally says "nehmen Sie den vereinbarten Termin wahr" yet no
   Termin is booked); and it resolves **no Frist/Reminder**. After the cascade animation
   ends, the vault, calendar and Fristen look untouched. The wow is a 30-second animation
   with no inspectable "after" state. (Document creation also emits **no event** — there is
   no `document_created` in the event surface — so even a minted doc wouldn't update the
   Dokumente screen live.)

3. **The world is frozen at one timestamp, and the seeded "now" is already stale.** `store.ts`
   has no clock; all time is `new Date()`. Worse, the fixtures are dated for an early-May
   2026 "today," but the current demo date is **2026-05-29** — so items meant to be
   *upcoming* are drifting past (e.g. `letter-anna-standesamt-eheschliessung-termin`
   Rückmeldung-Frist **2026-05-30** is one day out, and the Eheschließung Vorgang it implies
   doesn't even exist). There is no advanceable "now" to re-anchor, no *intentionally*
   overdue item the assistant rescues, and no way to show "3 days later the Behörde
   answered." Convenience-over-time is asserted by the UI but not reproducibly demonstrable.

---

## Prioritized gaps (ranked by demo-wow impact)

### P0 — Fix the broken/partial `vorgang_id` ↔ `letter_id` cross-links in the seed · effort S
**WHAT:** Repair the three linkage defects in finding #1: (a) stop the live Umzug Vorgang
from re-using the 2024 Meldebestätigung letter — give it its own confirmation letters or
drop the stale `letter_id`; (b) stamp `vorgang_id` on the letters that belong to the
Kindergeld (and any new Eheschließung) Vorgang; (c) ensure every confirmed Vorgang step
that claims a produced letter has a *real, same-period* `letter_id`, and every letter that
belongs to a case carries that case's `vorgang_id`.
**WHY it limits convenience:** cheapest fix with the highest realism payoff — it makes the
Vorgang-detail view, the Posteingang "gehört zu Vorgang X" chip, and the Termine→Vorgang
link all render correctly instead of pointing at wrong-year or non-existent records.
**CONCRETE change:** edit `src/data/{vorgaenge,letters,termine,reminders}.json` to align
ids. Add a thin read (`getVorgangRelated(id)` or extend `getVorgang`) that inlines
`{ letters, documents, termine, reminders }` filtered by `vorgang_id` — most plumbing
already exists (`getLetterThread(vorgangId)`, `LetterFilter.vorgang_id`). No type changes.

### P0 — Make the Umzug autopilot mint durable artefacts (Document + Termin + resolved Frist) · effort M
**WHAT:** extend the cascade so confirmed steps leave clickable proof, not just letters:
(a) a new **Meldebestätigung** Document on the Bürgeramt step; (b) a new
**Zulassungsbescheinigung Teil I** Document on the KFZ Block-D confirmation; (c) a real
**Termin** for the ABH Block-D step (the letter already promises one); (d) flip the run's
Frist/Reminder to resolved. Add a `document_created` event so the Dokumente screen reacts
live.
**WHY it limits convenience:** the payoff of "the system did the work" is the *after*
state. Today the only residue is a stack of letters; vault, calendar and Fristen look
untouched. Artefacts turn a transient animation into a permanent, inspectable result the
presenter can scroll through.
**CONCRETE change:** in `umzug.ts` / `bestaetigeImpl` (api.ts) generalise the existing
`createWohnungsgeberDoc()` pattern: on confirmed Bürgeramt + KFZ steps push a `VaultDocument`
(typ `meldebestaetigung` / `zulassungsbescheinigung_teil_i`, `vorgang_id` = run's Vorgang,
`[MOCK]` qr_payload) via `saveDocuments` + emit; on the ABH step create a `Termin`
(`vorgang_id` set, status `gebucht`) + emit. Reuse `aktenzeichenForBehoerde`. Needs a
`document_created` (and `termin_created`) variant in `src/types/mock-event.ts`.

### P1 — Re-anchor "now" + seed an intentionally overdue Frist; keep a completed historical run · effort S
**WHAT:** the fixtures are dated for an early-May "today" that has drifted past 2026-05-29.
Re-anchor the seed timestamps to a stable relative window, give **one** item a deliberately
*overdue* Frist (status `ungelesen`) so the dashboard surfaces a red item the assistant
offers to handle, and keep one `abgeschlossen` Umzug as the visible track record. (The 2024
Erstanmeldung already serves as the historical completed cascade — good — but its linkage
must survive the P0 fix.)
**WHY it limits convenience:** convenience is most legible against the pain it removes — a
deadline going red, and a track record. An *accidentally* stale Frist reads as a bug; an
*intentional* overdue item reads as the product working.
**CONCRETE change:** shift fixture dates relative to a single seed anchor (or document the
intended demo date). Pick one letter, set its `fristen[0].datum` ~3 days before the anchor.
Verify the completed-Vorgang linkage post-P0.

### P1 — Add the write-operations every dead UI button implies · effort M
**WHAT:** several obvious affordances have no backing handler:
- **Reschedule / cancel a Termin** — no `aktualisiereTermin` / `sageTerminAb` (the type has
  `status: 'abgesagt'` but nothing sets it). Letters (Standesamt Termin-Vorschlag, ABH)
  imply booking/answering a Termin.
- **Generate / download / EUDI-export a Document** — `getDocuments` is read-only; EUDI
  export is a headline capability (`eudi_compatible` flag everywhere) with no operation.
- **Fulfil a letter's `required_action` / Mitwirkungs-Frist** (e.g. Familienkasse "Nachweis
  einreichen") — there is a rich reply pipeline, but no op that *satisfies* the request and
  then advances the linked Vorgang's `self_assigned` step + emits an "Eingang bestätigt"
  follow-up letter.
- **Mark a non-eID Vorgang step done / dismiss a Frist** — only Block-D eID confirm exists.
**WHY it limits convenience:** every dead button reads as "prototype." The
upload→advance-Vorgang→get-confirmation loop is a compact, self-contained convenience story
(citizen does one small thing, system fans it out) currently impossible to show end-to-end.
**CONCRETE change:** add `aktualisiereTermin(id,{datum?,status?})` + `sageTerminAb(id)`
(emit `termin_updated`); `exportiereDokumentEudi(docId)` returning a `[MOCK]` EUDI payload +
emit; `erfuelleLetterAktion(letterId)` → clears `required_action`, finds linked Vorgang via
`vorgang_id`, marks the matching `schritt` `confirmed`/`self_assigned`, appends a follow-up
confirmation letter. Depends on P0 linkage.

### P2 — Populate the two secondary personas to the same depth as Anna · effort M
**WHAT:** `markus-schmidt` and `mehmet-yildiz` have **letters only** — no Vorgänge, no
documents, no Termine, no reminders (all fixtures except `letters.json` are Anna-exclusive).
Switch persona (plumbing exists: `reseedForActivePersona`, `SEEDED_PRIOR_LOGIN` even lists
`markus-schmidt`) and the Vorgänge / Dokumente / Termine screens go empty.
**WHY it limits convenience:** a second/third *complete* life turns "one demo account" into
"a platform for everyone" — the family persona (Schmidt) showcases the shared-dependents
`familie` aggregate, the self-employed persona (Mehmet) the `steuer` aggregate, both of
which run against thin data today. The Schmidt Geburtsurkunde + Familienkasse-Mitwirkung
letters already imply a Kindergeburt Vorgang that doesn't exist.
**CONCRETE change:** in the fixtures add, per persona, 1–2 Vorgänge (Schmidt: Kindergeburt
Mia mid-flight; Mehmet: Steuererklärung), 6–10 documents, 2–3 Termine, 2 reminders —
`vorgang_id`-linked to the letters that already exist. Loader already filters by
`empfaenger_persona_id` / `persona_id`; mostly fixture work.

### P2 — Advanceable "now" / time simulation + simulate-incoming-letter · effort M
**WHAT:** `store.ts` has no clock; the demo can't push time forward to show Fristen
approaching, Bearbeitungszeiten elapsing, or "3 days later the Behörde answered."
**WHY it limits convenience:** progression-over-time is the most visceral proof the system
works *for* you while you're away. Any "later" state currently requires editing fixtures.
**CONCRETE change:** add `meta.clock_offset_ms` + a demo-only `advanceDemoTime({days})` that
shifts it, and route a single `now()` helper through handlers + autopilot + dashboard instead
of bare `new Date()`. Add `simulateIncomingLetter()` — the existing
`simulateFamilienkasseFollowupLetter` proves the pattern — so a presenter can trigger "a
letter just arrived and the assistant already summarised it" live. Gate so it never appears
in normal UI.

### P3 — Autopilot breadth: make it a platform, not one trick · effort M
**WHAT:** only Umzug is orchestrated. The Schmidt Geburtsurkunde letter and Mehmet's
self-employed bundle both *invite* a Kindergeburt and a Steuer autopilot that don't exist.
"What else can it do?" shows one vertical.
**WHY it limits convenience:** the pitch is a *platform* of autopilots. One is a demo;
three is a category.
**CONCRETE change (data-first, minimal):** add `getAutopilotKatalog()` returning available
autopilots with status — `umzug` (live) plus `kindergeburt` and
`aufenthaltstitel-verlaengerung` as **preview-only** entries returning a
`buildUmzugPreview`-shaped cascade (Behörden list + produced-artefact list) without a live
`start`. Even static preview cascades make the platform legible at near-zero orchestration
cost. Full `start` for a second vertical is a follow-on L.

---

## Effort rollup

| Priority | Gap | Effort |
|---|---|---|
| P0 | Fix broken/partial `vorgang_id`↔`letter_id` cross-links (+ related read) | S |
| P0 | Autopilot mints durable Document + Termin + resolved Frist (+ events) | M |
| P1 | Re-anchor "now" + intentional overdue Frist + verify historical run | S |
| P1 | Write ops: reschedule/cancel Termin, EUDI export, fulfil-letter-action | M |
| P2 | Populate Schmidt + Mehmet to Anna's depth (Vorgänge/Docs/Termine) | M |
| P2 | Advanceable "now" + simulate-incoming-letter | M |
| P3 | Autopilot catalog + preview-only extra verticals | M |

## Recommended demo-critical slice (if time-boxed)

Do **P0 linkage fix (S) + P0 autopilot artefacts (M) + P1 re-anchor/overdue (S)** first —
roughly one focused session. The data is already rich; these three convert it from "rich
but disconnected screens where the hero leaves no trace" into "a connected life where the
system visibly did the work and left correct, clickable proof behind" — exactly the
Bequemlichkeit story a GovTech stakeholder needs. P1 write-ops next, to kill dead buttons;
P2 persona-depth before any multi-persona walkthrough.

## Type-change note

No type changes are needed for P0 linkage — `vorgang_id`/`letter_id` already exist. The
autopilot-artefact work needs `document_created` (+ `termin_created`/`termin_updated`)
variants in `src/types/mock-event.ts`; the clock needs a `meta.clock_offset_ms` field. Per
CLAUDE.md, any new field must be mirrored in `src/types/*` + `docs/architecture.md` and
coordinated with frontend-coder via `docs/reviews/`.
