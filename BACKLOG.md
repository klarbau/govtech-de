# Backlog — GovTech DE demo

Candidate tasks for the project. Maintained by two sources:

- the **daily "GovTech Backlog Scout" routine** (a scheduled Claude Code cloud agent — see
  [`routine-backlog-scout.md`](routine-backlog-scout.md)). It only **appends** dated, source-cited
  candidates to *Candidate tasks* on a **descriptively-named `claude/<date>-<slug>` branch** (the routine
  picks the slug from the day's themes). It never edits *Accepted* or *Done* and never touches code. That
  branch is also the **working branch**: you review it, promote items, and build them out on the same branch.
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

- [2026-06-28] [legal] **Implement Geburt-Autopilot for antragsloses Kindergeld in `/vorgaenge/geburt` (BT-Drs. 21/5874).** The Bundestag Finance Committee expert hearing completed 22.06.2026 with broad expert support; the official data chain (Standesamt → BZSt Steuer-ID → Familienkasse → IBAN auto-payout) is now documented by the Bundesregierung — enabling a realistic inline-cascade demo moment before the law enters force 01.01.2027.
  Source: https://www.bundesregierung.de/breg-de/aktuelles/kindergeld-ohne-antrag-2412916 · https://www.bundestag.de/dokumente/textarchiv/2026/kw26-pa-finanzen-1185060 · confidence: high

- [2026-06-28] [ecosystem] **Update demo EUDI Wallet onboarding to cite IT-Planungsrat B-2026/19-IT "Verwaltungsanbindung EUDI-Wallet" (17.06.2026) and the EU enrollment deadline of 24.12.2026.** The IT-Planungsrat formally anchored EUDI Wallet in German government architecture six days ago; an EU implementing regulation (April 2026) makes 24.12.2026 the hard member-state deployment deadline — the demo can cite these instead of vague 2027 speculation, with Germany's draft DIdG (20.05.2026) as the national legal basis.
  Source: https://www.it-planungsrat.de/beschluesse-informationen/sitzungen-it-planungsrat/50-sitzung · https://www.deepidv.com/media/news/eu-eudi-wallet-enrollment-rules-2026 · https://www.eideasy.com/blog/eu-digital-identity-wallets-status-april-2026 · confidence: high (IT-PR decision + EU deadline); med (DIdG draft — primary source returned 403)

- [2026-06-28] [ecosystem] **Audit demo UI against KERN Design System and add attribution after IT-Planungsrat formally adopted KERN as a product (B-2026/24-IT, 17.06.2026).** This is the strongest official government endorsement KERN has received; Behörden stakeholders now recognise KERN as the binding standard — a brief attribution in the demo footer or Über-screen adds institutional credibility for GovTech pitches.
  Source: https://www.it-planungsrat.de/beschluesse-informationen/sitzungen-it-planungsrat/50-sitzung · confidence: high

- [2026-06-28] [gap] **Reframe planned Wohngeld Pass-3 vertical from "apply automatically" to "am I still eligible after the Kürzungen?": Federal Building Minister confirmed ⅓ of Wohngeld households will lose entitlement (savings: €1.5bn by 2027, €2bn from 2028).** The political direction reversed since the vertical was planned — the demo's autopilot wow now lies in proactively warning affected households before their next Bescheid, not in triggering new applications.
  Source: https://www.haufe.de/immobilien/wirtschaft-politik/wohngeld-bundesregierung-denkt-ueber-erhoehungen-nach_84342_417752.html · confidence: high (page fetched, confirmed: "Ein Drittel der Wohngeldhaushalte werde rausfallen")

- [2026-06-28] [ecosystem] **Update demo autopilot Rechtsgrundlage citations: BGBl. I 2026 Nr. 121 (01.05.2026) officially declares IDNr technical prerequisites met nationwide (Art. 22 Abs. 3 RegMoG); NOOTS-Staatsvertrag in force.** The Once-Only infrastructure the demo's Umzug cascade assumes is now legally operational — replace speculative framing with accurate IDNrG + NOOTS-Staatsvertrag citations in autopilot Rechtsgrundlage micro-lines.
  Source: https://www.recht.bund.de/bgbl/1/2026/121/VO.html · https://netzpolitik.org/2025/national-once-only-technical-system-bundestag-macht-weg-frei-fuer-datenautobahn/ · confidence: high (BGBl. primary source); med (NOOTS entry-into-force date)

## Done

_(archive)_
