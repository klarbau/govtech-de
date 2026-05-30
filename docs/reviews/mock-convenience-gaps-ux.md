---
title: Mock & Screen Convenience Gaps — Product/UX + Demo-Storytelling Review
date: 2026-05-29
author: product-architect (analysis only — no spec, no code)
lens: "Does the mock make Bequemlichkeit tangible in a 3-min Loom + live demo?"
anchor: docs/demo-spine.md (headline wow + 6-step spine)
status: gap-report
scope_note: >
  Grounded in direct reads of: src/lib/mock-backend/autopilot/umzug.ts (full),
  src/components/dashboard/DashboardView.tsx, src/types/dashboard.ts,
  src/lib/mock-backend/dashboard/api.ts (dashboardApi.getDashboard), plus the
  full demo-spine.md and CLAUDE.md data model. Two structural facts were
  verified by grep across all of src/: (1) NO time-saved / Ersparnis / "gespart"
  concept exists anywhere in the codebase; (2) the umzug autopilot creates
  Letters ONLY — it never writes a Termin or a Document record. Remaining
  [VERIFY] items are the few components I did not open (BehoerdenStatusRow copy,
  timeline animation, assistant tool wiring in lib/ai/tools.ts).
---

# Convenience-Gap Report — making "the system did it FOR you" undeniable

## TL;DR

The plumbing for the hero is genuinely strong — the Umzug autopilot has a real,
well-typed step model (`aktion`, `rechtsgrundlage`, `letter_id`, per-step
timestamps, consent/eID gates, failure reasons), staggered latency choreography
(900/1100/1400/1700 ms — already filmable), a Stammdaten Übermittlungs-Log that
records every behörde-to-behörde data transfer with `rechtsgrundlage`, and it
generates richly worded confirmation letters into Posteingang. The Dashboard
stats are also live-derived from the mock-backend (`getDashboard` reads
letters/vorgaenge/termine), so counts DO reconcile after a run.

But the Dashboard does NOT (verified by reading `DashboardView.tsx`) have any
"Erledigt für Sie" autopilot-proof section, and it has NO calm "nichts zu tun"
empty state — "Heute zu tun" always maps the top-3 with no empty branch, and the
greeting line "letzter Login vor 23 Tagen" is a hardcoded string. So the opening
screen has nowhere to land the headline wow today.

**What's missing is not mechanism, it's evidence, emotion, and reach.** The demo
can *run* the autopilot, but it cannot in five seconds make a stakeholder *feel*
"this saved me a day of bureaucracy," and the run only lights up two or three of
the ten screens.

The three highest-leverage gaps, in order:

1. **No quantified before/after anywhere — VERIFIED ABSENT.** A grep across all
   of `src/` finds zero occurrences of any Ersparnis / time-saved / "gespart"
   concept. The autopilot tracks *what* it did but never states *what it would
   have cost the citizen* (6 Behörden, mehrere Anträge, ~3 h, Behördengänge) vs.
   now (1 Satz, ~4 min). The single most quotable convenience number does not
   exist in the data model. This is the biggest gap.
2. **The ripple stops at Letters — VERIFIED.** The autopilot writes Letters and
   the Übermittlungs-Log only. It creates NO Termin and NO Document, even though
   its own LEA letter says *"nehmen Sie den vereinbarten Termin wahr"* and its
   Bürgeramt step logically produces a Meldebestätigung. So after a run, Termine
   and Dokumente stay empty — 2 of 10 screens light up, 8 look like static
   decoration to a skeptic who clicks around.
3. **The system doesn't speak as an agent.** Step copy is administrative
   ("Anmeldung neuer Wohnort nach § 17 BMG") rather than delegated ("Wir melden
   Sie beim Bürgeramt an"). The hero is "what the system does FOR you" — the
   copy must perform that agency, not read like a form.

Everything below is ranked by demo-wow impact, tagged spine-critical vs.
nice-to-have, with S/M/L effort.

---

## Section 1 — The magic moment (Dashboard first 5 seconds)

### GAP 1.1 — No "Erledigt für Sie" triumph banner on the Dashboard [SPINE-CRITICAL] [M]
**VERIFIED:** `DashboardView.tsx` has greeting + a "Seit Ihrem letzten Login"
diff block (neue Briefe / Frist näher / Vorgang abgeschlossen) + "Heute zu tun"
top-3 + 6 nav cards. There is NO autopilot-proof / "Erledigt" section. The diff
block is the closest thing to proof, but it's framed as "stuff changed," not
"WE did this FOR you."
**What's missing:** a single dominant top-of-Dashboard banner that, post-run,
reads *"Erledigt für Sie: Umzug an 6 Behörden gemeldet — Sie mussten nichts tun"*
with the saved-time number (see 2.1), sitting ABOVE "Heute zu tun."

**Why it weakens the story:** A stakeholder's lasting impression is set in the
first screen. The diff block is informative but passive ("3 neue Briefe"); a
banner titled "Wir haben Ihren Umzug erledigt — 6 Behörden, 0 Aufgaben für Sie,
~3 Std gespart" is the headline wow living on the opening screen.

**Concrete minimal fix (data + state):**
- Add an `autopilotHighlight?` to `DashboardSnapshot` (derived from the most
  recent completed autopilot Vorgang): `{ vorgang_id, lebenslage: 'umzug',
  behoerdenCount, confirmationsReceived, ersparnis }`.
- Render it as a prominent success banner above the "Heute zu tun" card when
  present; hide when absent (pre-run).

### GAP 1.1b — No calm "nichts zu tun" empty state for "Heute zu tun" [SPINE-CRITICAL] [S]
**VERIFIED:** "Heute zu tun" unconditionally renders `topActions.slice(0,3)`.
There is no empty branch — if the list is empty the section is just blank. The
`DashboardSnapshot` even has a `lebenslagen_hinweise` field and the spec mentions
an achievement counter, but the view does not render a calm/earned-rest state.

**Why it weakens the story:** In gov UX, an earned empty inbox/task-list IS the
product. After the autopilot finishes, the most powerful beat is "Heute zu tun:
nichts — wir kümmern uns." Blank space reads as broken; a designed calm state
reads as trust.

**Concrete minimal fix:** Add an empty branch to the "Heute zu tun" card —
*"Heute nichts zu tun. Wir melden uns, wenn etwas ansteht."* + the
`vorgaenge_abgeschlossen_jahr` achievement line that the snapshot already carries.

---

### GAP 1.2 — Demo starts cold; no "just happened" framing [SPINE-CRITICAL] [S]
**What's missing:** A seeded "moments ago" timestamp story. If the autopilot has
just run, the Dashboard / Posteingang should read *"vor 2 Minuten"*, *"gerade
eben"* — not a static date. [VERIFY: relative-time util exists per changelog
("SSR-stable relative time"); confirm the seed data anchors confirmations to
*now* rather than a fixed past date.]

**Why it weakens the story:** "vor 2 Minuten" sells *liveness* — the system is
acting in real time on the citizen's behalf. Fixed dates make the mock feel like a
screenshot.

**Concrete minimal fix:** Anchor autopilot-generated letters/steps to
`Date.now() - small offset` in the seed so a fresh demo always shows "gerade eben"
across Posteingang, Vorgang timeline, and Dashboard.

---

## Section 2 — Proof of work-done-for-you

### GAP 2.1 — No quantified before/after ("Zeitersparnis") anywhere [SPINE-CRITICAL] [M]
**What's missing:** A summary artefact that contrasts status quo vs. autopilot.
The `AutopilotStep` model knows the *steps* but the demo never converts them into
a citizen-legible scorecard: *Ohne Autopilot: 6 Behörden, 7 Formulare, ~3 Std,
3 Behördengänge. Mit Autopilot: 1 Satz, ~4 Min, 0 Wege.*

**Why it weakens the story:** This is the literal definition of Bequemlichkeit and
it is the line a stakeholder will quote back. Right now value is *implied* by a
list of steps; a skeptic counts the steps and thinks "that's still six things."
The framing must be saved-effort, not done-effort.

**Concrete minimal fix (data + screen state):**
- Add a derived `autopilotSummary` to the Vorgang/mock: `{ behoerdenCount,
  formulareSaved, minutesNow, hoursStatusQuo, wegeSaved }`.
- Render it as a compact "Ihre Ersparnis" card at the *end* of the autopilot
  timeline and mirrored on the Dashboard post-state. One card, big numbers.
- All numbers must be defensible from the domain note (cite the Umzug domain note
  for the status-quo baseline — number of Behörden, typical Bearbeitungszeit).

---

### GAP 2.2 — Steps don't read as "on your behalf"; missing the agent voice [SPINE-CRITICAL] [S]
**What's missing:** The step `aktion` strings are administrative ("Anmeldung neuer
Wohnort"). For demo-wow they need the *delegated* voice: *"Wir melden Sie beim
Einwohnermeldeamt an"*, *"Wir aktualisieren Ihre Adresse bei der Techniker
Krankenkasse"* — present-tense, system-as-agent. [VERIFY: check whether
BehoerdenStatusRow already renders an "auf Ihren Wunsch / in Ihrem Auftrag" frame.]

**Why it weakens the story:** "Anmeldung neuer Wohnort" is what a form says. "Wir
melden Sie an" is what an *assistant* says. The hero is "what the system does FOR
you" — the copy has to perform that agency, visibly with the citizen's name where
possible.

**Concrete minimal fix:** Add a `claim`/`agentLabel` field per step (DE source)
phrased in first-person-plural delegated voice, and surface it in
`BehoerdenStatusRow` as the primary line, with the dry `aktion` + `rechtsgrundlage`
as the trust-building subline.

---

### GAP 2.3 — No legal-basis / Datenminimierung receipt tied to the run [NICE-TO-HAVE] [S]
**What's missing:** The model has `rechtsgrundlage` (e.g. `§ 36 BMG`) and
consent/eID gates — but there's no per-run *receipt* showing "wir haben nur diese
Daten an diese Behörde übermittelt, auf dieser Rechtsgrundlage." This is the
BITV/Privacy-by-design credibility that the CLAUDE.md mission explicitly demands.

**Why it weakens the story:** A German GovTech audience is suspicious of "the
system did it for me" — their first question is *welche Daten, an wen, auf welcher
Grundlage?* Answering it preemptively converts skepticism into trust and is a
differentiator vs. naive automation demos.

**Concrete minimal fix:** A collapsible "Was wurde übermittelt?" row per Behörde
on the timeline: data fields sent (Datenminimierung — only what's needed) +
`rechtsgrundlage` + consent timestamp. The data already exists on `AutopilotStep`;
this is presentation only.

---

## Section 3 — Continuity across screens (the illusion of one coherent life)

### GAP 3.1 — Ripple stops at Letters: Termine + Dokumente never update [SPINE-CRITICAL] [M]
**VERIFIED:** `umzug.ts` produces only `Letter` objects (via `buildLetter`) and
`UebermittlungsLogEntry` entries. It creates NO `Termin` and NO `Document`. Yet
the LEA Block-D letter explicitly says *"bitten wir Sie, den vereinbarten Termin
wahrzunehmen"* — promising a Termin that never appears — and a real Bürgeramt
Anmeldung yields a Meldebestätigung document. The dashboard api already reads
`termine` and the screens are live-derived, so the moment the autopilot writes
those records, two more screens light up for free.

**Why it weakens the story:** The "coherent life OS" claim only lands if the
viewer can click into *any* screen after the run and find the umzug already there.
Today only Posteingang + Vorgänge + Dashboard react; Termine and Dokumente stay
empty, contradicting the letters' own text — the exact thing a skeptic clicking
around will catch.

**Concrete minimal fix:**
- In the umzug autopilot completion path, also write: 1 `Document`
  (Meldebestätigung `[MOCK]` + QR payload, ausstellende_behörde = Bürgeramt) and,
  for the LEA Block-D step, 1 `Termin` (LEA, video/vor-Ort, linked `vorgang_id`).
- All cross-linked by `vorgang_id` (the field already exists on Letter + the step
  model), so deep-links (3.2) come almost free.
- Add a subtle "neu" badge / unread dot on the relevant sidebar items post-run so
  the Loom can show the ripple by just panning the nav.

---

### GAP 3.2 — No deep-links back to the source Vorgang from Letter/Termin/Document [NICE-TO-HAVE] [S]
**What's missing:** From a confirmation letter, can the viewer jump to "this
belongs to your Umzug" and see all related items? `Letter` and `AutopilotStep`
carry IDs (`letter_id`, `vorgang_id`) so the linkage exists in data.

**Why it weakens the story:** Bidirectional links are what makes it feel like
*one* system rather than six tabs. Cheap to add given the IDs are present.

**Concrete minimal fix:** A "Gehört zu: Umzug nach <Ort>" chip on each generated
Letter/Termin/Document that routes to the Vorgang detail.

---

### GAP 3.3 — Dashboard counters: already live, but no animated old→new transition [NICE-TO-HAVE] [S]
**VERIFIED:** `dashboardApi.getDashboard` derives `stats` live from
vorgaenge/letters/termine via `buildStats`, so the numbers DO reconcile after a
run — this is already correct, not a gap. The only enhancement: animate the count
old→new (e.g. ungelesene Briefe 0→4) when the user returns to the Dashboard after
the cascade, so the Loom can visibly show the ripple landing.

**Why it weakens the story:** Mild. Static-but-correct numbers are fine; an
animated tick-up is a polish multiplier for the "watch it ripple" beat.

**Concrete minimal fix:** A count-up transition on `StatCard` values
(reduced-motion → instant). No data change required.

---

## Section 4 — Empty / edge states & trust

### GAP 4.1 — The calm "nichts zu tun" state isn't a designed asset [SPINE-CRITICAL] [S]
**What's missing:** A deliberately reassuring empty state for Dashboard/Posteingang
*after* everything is handled — *"Alles erledigt. Wir melden uns, wenn etwas
ansteht."* (See also 1.1.)

**Why it weakens the story:** In gov UX, an empty inbox is the *product*. Most
demos show busy screens; showing earned calm is a stronger convenience signal and
is rare enough to be memorable.

**Concrete minimal fix:** One illustrated/iconographic calm-state component +
copy, seeded as the terminal state of the demo persona.

---

### GAP 4.2 — No in-flight "läuft gerade" + per-Behörde live status during the run [SPINE-CRITICAL] [S]
**What's missing:** The `AutopilotStepStatus` enum exists (queued/running/done/
failed per the types) and `BehoerdenStatusRow` renders rows — but the spine wants
"each Behörde *receives* the change with realistic delays." [VERIFY: confirm the
timeline animates pending→sent→bestätigt with staggered latency, not instant.]

**Why it weakens the story:** The single most filmable Loom moment is the cascade
of confirmations arriving one-by-one. If it resolves instantly it's not a moment.

**Concrete minimal fix:** Stagger step latency (e.g. 800 ms / 1.4 s / 600 ms per
spine guidance), each row transitioning "wird übermittelt…" → "bestätigt", with
`prefers-reduced-motion` falling back to instant. Backend latency sim exists
(`latency.ts`); ensure the *timeline* consumes it visibly.

### GAP 4.3 — No failure/recovery state to show robustness [NICE-TO-HAVE] [M]
**What's missing:** `AutopilotStep.failure_reason` exists but the demo never shows
a Behörde rejecting/timing out and the system *handling* it ("Finanzamt nicht
erreichbar — wir versuchen es erneut, Sie müssen nichts tun").

**Why it weakens the story:** A skeptic's reflex is "what happens when it breaks?"
A graceful failure + auto-retry is a trust multiplier — but it's risky in a 3-min
Loom, so keep it as an *optional* branch, not the main path.

**Concrete minimal fix:** One seeded "soft-fail then retry then success" Behörde,
behind a demo toggle so the main spine stays green.

### GAP 4.4 — No undo / "doch nicht" affordance before firing [NICE-TO-HAVE] [S]
**What's missing:** The assistant flow is confirm-gated (`preview_umzug` →
`starte_umzug`), which is good — but there's no visible "abbrechen / rückgängig"
once running, which a cautious citizen expects.

**Why it weakens the story:** Reversibility = trust. Even a disabled "die ersten
Schritte sind bereits verbindlich" explanation reads as honest.

**Concrete minimal fix:** A cancel affordance on the confirm dialog + an
explanatory note on which steps are reversible.

---

## Section 5 — What the demo CAN'T currently show (skeptic questions)

These are the questions a DigitalService/BMDS reviewer will ask. Each is a gap
because the mock has no answer state.

| Skeptic question | Can demo answer today? | Minimal fix | Effort |
|---|---|---|---|
| "Wie viel Zeit spart das konkret?" | No (see 2.1) | Ersparnis card | M |
| "Welche Daten gehen an wen, auf welcher Rechtsgrundlage?" | Partially (data exists, not surfaced — 2.3) | Übermittlungs-receipt row | S |
| "Was, wenn eine Behörde ablehnt?" | No (4.3) | Soft-fail branch | M |
| "Kann ich das stoppen / rückgängig machen?" | No (4.4) | Cancel affordance | S |
| "Ist das nur Umzug oder ein Muster?" | No — only Umzug wired | Add ONE teaser autopilot stub (Kindergeld/KFZ) shown as "demnächst" so the pattern reads as generalizable WITHOUT building it | S |
| "Woher weiß das System, dass ich umziehe?" | Weak — relies on user typing it | Dashboard nudge (1.1) makes the trigger feel proactive | M |
| "Sieht meine Familie/mein Partner das auch?" | Unknown (Familie screen exists) | Show the umzug appearing in shared Familie view | M |

**Note on the assistant trigger:** the spine declared step 3 (assistant → autopilot)
the breaking gap; the current snapshot says it is now wired (`preview_umzug` →
`starte_umzug`, "spine e2e green"). So the *mechanism* is closed. The gaps in this
report are the layer above mechanism — **the evidence and emotion that turn a
working automation into a felt convenience.** [VERIFY assistant wiring against
lib/ai/tools.ts since I could not read it this session.]

---

## Prioritized build order (for the next pipeline run)

**Tier 1 — do these or the Loom has no wow (all SPINE-CRITICAL):**
1. GAP 1.1 + 1.1b — Dashboard "Erledigt für Sie" triumph banner + calm "nichts zu tun" empty state (M)
2. GAP 2.1 — Zeitersparnis before/after scorecard (M)
3. GAP 4.2 — staggered, animated Behörden-confirmation cascade (S — backend latency already staggered; verify the timeline consumes it)
4. GAP 2.2 — delegated agent-voice step copy (S)
5. GAP 3.1 — ripple into Dokumente + Termine (autopilot writes Document + Termin) (M)

**Tier 2 — converts skeptics, cheap wins:**
6. GAP 1.2 — "gerade eben" liveness seeding (S)
7. GAP 2.3 — Datenminimierung / Rechtsgrundlage receipt (S)
8. GAP 4.1 — designed calm empty state (S)
9. GAP 3.2 — bidirectional Vorgang deep-links (S)

**Tier 3 — robustness/honesty, optional in a 3-min cut:**
10. GAP 4.3 — soft-fail + retry branch (M, demo-toggled)
11. GAP 4.4 — cancel/undo affordance (S)
12. Skeptic-table "is this a pattern?" teaser stub (S)

## One-line summary for the orchestrator

The autopilot *works*; it doesn't yet *brag*. Spend the next run on **evidence
(before/after numbers), agency (delegated voice + visible cascade), and ripple
(one run lighting up five screens + live Dashboard counts)** — that is the gap
between "a working mock" and "a stakeholder who feels the Bequemlichkeit."
