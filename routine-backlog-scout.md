# Routine spec — "GovTech DE Backlog Scout"

The full mission for the daily scheduled Claude Code routine that researches the German GovTech
landscape and grows the project backlog. The routine's saved prompt is thin and points here; this file
is the versioned source of truth. Edit here, not in the routine form, so changes are tracked and reviewed.

## Mission

Once per day, autonomously, find what's genuinely worth doing next for this demo and append it to
`BACKLOG.md` as dated, source-cited candidate tasks. You **propose**; a human **disposes**. Quality and
honesty beat volume — a few real, well-sourced items beat a long list of plausible-sounding noise.

## Before you research — load project state

1. Read `agent-context.md` (git/publishing model, gates, conventions, **Open threads / followups**).
2. Read `CLAUDE.md` (mission constraints, Demo-Spine, what the demo is and is NOT).
3. Read the current `BACKLOG.md` (so you don't duplicate existing candidates/accepted items).

The point is relevance: a finding only becomes a task if it advances *this* demo (a citizen-first
interaction layer on DeutschlandID + EUDI Wallet + Deutschland-Stack, German, WCAG/BITV, autopilot-as-hero,
all-mocked) and isn't already captured.

## What to research

- **Ecosystem**: OZG / OZG 2.0, Deutschland-Stack, Registermodernisierung, EUDI Wallet, BundID /
  DeutschlandID, FIT-Connect / XÖV / XMeld, KERN Design System — recent changes, launches, roadmaps.
- **Legal / legislative (2026–2027)**: new or amended statutes, deadlines, antragslose Leistungen,
  Once-Only obligations, data-protection rules that change what a citizen layer may do.
- **Citizen pain points**: concrete friction Germans actually hit with public administration — slow
  Termine, opaque Bescheide, repeated data entry, language barriers, missing digital paths — and **what
  this demo does not yet address** but realistically could.

Use WebSearch / WebFetch. Prefer primary/credible sources (gov.de, BMI/BMDS, DigitalService, Bundesanzeiger,
established press). Note the date of each development.

## Honesty rules (non-negotiable)

- **Cite a real source URL you actually opened** for every candidate. Before writing an item, FETCH the
  source and confirm the specific claim is on that page. A URL you could not open is not a citation — drop it.
- **Assert only what the fetched source states.** Do not add names, renames, dates, figures, or "confirms X"
  details that are not on the page. (First run: a `confidence: high` item claimed a "BundID → DeutschlandID
  rename" the cited source never mentioned.) If part of a task is your own inference, keep it separate and
  tag it `speculative` — never fold an unsourced guess into a high-confidence claim.
- **No fabricated "developments."** If you're inferring or speculating, tag it `confidence: speculative`
  and say so plainly.
- Distinguish **shipped reality** from **roadmap/future** (the project marks future things `[ZUKUNFT 20xx]`).
- Stay inside the demo's honesty guardrails (no false claims about what German systems do; no
  Melderegister→Ausländerbehörde push). Note: **antragsloses Kindergeld is now enacted law** (Kabinett
  18.03.2026; automatic payment phased März 2027 / Nov 2027), no longer `[ZUKUNFT]` speculation.
- **Cap: 3–7 candidates per run.** If nothing genuinely new/relevant today, append fewer — or none, and say
  so in the run. An empty honest run is better than padding.

## Output — how to write to the repo

1. Append each candidate to the **"Candidate tasks"** section of `BACKLOG.md`, directly below the
   `<!-- BACKLOG-SCOUT-APPEND-BELOW -->` marker, newest first, using the entry format defined in
   `BACKLOG.md`.
2. **Only edit `BACKLOG.md`.** Do not touch *Accepted*/*Done*, do not edit any other file, do not change code.
3. Commit just `BACKLOG.md` to a new branch **`claude/backlog-<YYYY-MM-DD>`** and stop. Do **not** merge,
   do not push to `main`/`feat/*`. The human reviews the branch and promotes items.

## What NOT to do

- Don't implement anything, refactor, or run the build/tests — you're a scout, not a builder.
- Don't open a flood: respect the cap; dedupe hard against existing `BACKLOG.md`.
- Don't invent legal facts or German procedures — if unsure, mark speculative or omit.

## If web research is blocked

If outbound requests fail (`403 host_not_allowed`) because the environment's network access is too narrow,
**append nothing fabricated** — instead add a single line under Candidate tasks noting that research was
network-blocked that day, and stop. (Fix: set the routine environment's Network access to Full or add the
needed domains — see agent-context "Cloud env".)

## Success looks like

A reviewer opens the `claude/backlog-<date>` session, sees 0–7 honest, sourced, relevant, non-duplicate
candidate tasks, and can promote the good ones into real work in under five minutes.
