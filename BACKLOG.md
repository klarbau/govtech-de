# Backlog — GovTech DE demo

Candidate tasks for the project. Maintained by two sources:

- the **daily "GovTech Backlog Scout" routine** (a scheduled Claude Code cloud agent — see
  [`routine-backlog-scout.md`](routine-backlog-scout.md)). It only **appends** dated, source-cited
  candidates to *Candidate tasks* on a `claude/backlog-<date>` branch. It never edits *Accepted* or *Done*
  and never touches code. You review the branch/PR and promote what's worth doing.
- **humans** — triage candidates: move good ones up to *Accepted*, drop noise.

## Entry format

```
- [YYYY-MM-DD] [tag] **One-line task.** Why it matters for this demo (1 sentence).
  Source: <url> · confidence: high | med | speculative
```

Tags: `[ecosystem]` (OZG / Deutschland-Stack / EUDI / BundID …) · `[legal]` (legislation, deadlines) ·
`[user-pain]` (concrete citizen friction in German public admin) · `[gap]` (what this demo is missing).

---

## Accepted (human-triaged → real work)

_(empty — promote candidates here)_

## Candidate tasks (unreviewed — appended by the routine, newest first)

<!-- BACKLOG-SCOUT-APPEND-BELOW -->

- [2026-06-27] [legal] **Update demo onboarding to reflect DIdG enactment (20 May 2026) and EUDI-Wallet EU deadline (24 Dec 2026).** The cabinet-approved Digitalidentitätengesetz confirms the BundID → DeutschlandID rename and mandates EUDI-Wallet availability by 24 December 2026 — the demo's speculative framing is now legislative reality and should be labelled accordingly.
  Source: https://bmds.bund.de/aktuelles/pressemitteilungen/detail/kabinett-beschliesst-gesetz-fuer-digitale-identitaeten · confidence: high

- [2026-06-27] [legal] **Promote antragsloses Kindergeld from `[ZUKUNFT 2027]` speculation to confirmed legislation in the Familien dossier.** Cabinet enacted the Once-Only Kindergeld law on 18 March 2026 (effective 2027 in two phases: March 2027 for subsequent children, November 2027 for first children) — the demo should surface this as "Gesetz verabschiedet, automatische Zahlung ab März 2027" with the real phase dates and estimated 300,000 fewer applications.
  Source: https://www.bundesfinanzministerium.de/Content/DE/Pressemitteilungen/Finanzpolitik/2026/03/2026-03-18-antragsloses-kindergeld.html · confidence: high

- [2026-06-27] [ecosystem] **Add a consent-gated NOOTS data-pull step to Vorgänge wizards to demonstrate Once-Only in action.** The National Once-Only Technical System (NOOTS) went live in January 2026 with the first real data retrieval (Kraftfahrt-Bundesamt vehicle register → Bewohnerparken application in Baden-Württemberg) — the demo can model this with a "Daten automatisch abrufen?" consent screen showing which register is queried, on what legal basis, and that the citizen controls the pull.
  Source: https://www.bva.bund.de/SharedDocs/Pressemitteilungen/DE/2026/20260114_livegang_noots.html · confidence: high

- [2026-06-27] [user-pain] **Add Leichte Sprache / B1 plain-language toggle for Bescheid summaries in the AI assistant.** A May 2026 Bundestag hearing on digitizing migration administration found "mehrsprachig reicht nicht" — translation alone does not overcome bureaucratic German, which is a concrete barrier for 14M+ residents in Germany; the AI assistant already summarises letters but has no plain-language mode.
  Source: https://www.bundestag.de/dokumente/textarchiv/2026/kw19-pa-inneres-migrationsverwaltung-1170216 · confidence: high

- [2026-06-27] [gap] **Build a "Meine Datenspur" register-access log inside /datenschutz.** OZG 2.0 and the Registermodernisierungsgesetz mandate that citizens can see which authorities accessed their data in which register; the existing /datenschutz screen shows consent settings but not a per-register access timeline — adding this would concretely demonstrate the privacy-by-design pillar.
  Source: https://insights.mgm-tp.com/de/auswirkungen-und-aenderungen-des-ozg-2-0-gesetzes · confidence: med

- [2026-06-27] [ecosystem] **Audit demo components against KERN UX-Standard v2.3.2 before the Vercel deploy.** In early 2026, Bund + Bayern + Hessen launched a joint KERN implementation blueprint (designsystem.gov.de v2.3.2) as the reference standard for all German government digital services — a component-level diff would identify form-validation patterns, error messages, and Bescheid template gaps before going public.
  Source: https://www.designsystem.gov.de · confidence: med

## Done

_(archive)_
