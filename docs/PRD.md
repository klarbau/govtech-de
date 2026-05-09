# GovTech DE — Product Requirements (Living Doc)

Status: **draft** — to be filled in via the autonomous workflow. The first pipeline run (recommended starting feature: **Umzug autopilot**) will populate this document via product-architect.

---

## 1. Vision

A speculative-design demo that shows what a citizen-first interaction layer for German public administration could feel like in 2027, sitting on top of DeutschlandID + EUDI Wallet + Deutschland-Stack. The thesis: "fast bureaucracy" is the wrong frame. The real frame is **autopilot** — the system does the work, the citizen confirms.

## 2. Audience

- **Primary viewer**: GovTech stakeholders in DACH — DigitalService GmbH, BMDS team members, Tech4Germany alumni and applicants, GovTech Deutschland network, GovStart cohort, Smart Country Convention attendees.
- **Secondary viewer**: hiring managers and product leads at private German GovTech companies (Polyteia, Localyze, Jobbatical, Bureaucrazy, init AG, msg, mgm tp).
- **Tertiary viewer**: foreign expats, journalists, and citizens curious about what a modern German digital service could look like.

## 3. Personas

See `docs/personas.md` (to be authored). Initial set:
- **Anna Petrov, 28** — relocated from St Petersburg to Berlin on Blue Card, has a 1-year-old child.
- **Familie Schmidt** — DE family, second child on the way, both parents employed.
- **Mehmet Yıldız, 34** — turkish-german, becoming self-employed (Gewerbeanmeldung).

## 4. North-star scenarios (in priority order)

1. **Umzug** — the wow demo. One input → six Behörden visibly synchronised in <90 seconds.
2. **Kindergeburt-Bündel** — Geburtsurkunde + Elterngeld + Kindergeld + Krankenkassenanmeldung from one form.
3. **Aufenthaltstitel-Verlängerung** — proactive 90-days-before notification, AI fills the application from the document vault, books the Termin.
4. **Posteingang + AI-Brief-Erklärer** — every Behörden-Brief auto-translated, summarised, action-extracted.
5. **Vorausgefüllte Steuererklärung** — pre-filled from data the state already has.

(Further features pass through the pipeline only after concept-verifier signs off.)

## 5. Non-goals

- Real integration with any Behörde or register.
- Production-grade auth, billing, or SLA.
- Native mobile apps. Web responsive only.
- Multi-tenant or B2B features.
- Anything that obscures the prototype nature.

## 6. Success metrics for the demo

- **Demo viewer engagement**: ≥ 70% of viewers reach the autopilot wow-moment in the Loom video.
- **Quality signals**: Lighthouse a11y ≥ 95 on every shipped screen; zero `serious`/`critical` axe violations.
- **Reach**: LinkedIn post auf DE crosses 5k impressions; ≥ 3 conversations opened with target organisations.
- **Conversion**: ≥ 1 fellowship/role/program response within 8 weeks of public launch.

## 7. Constraints

- Single non-technical owner using AI-assisted build (Lovable / v0 / Cursor / Claude Code).
- Budget: ~€100–150/month tools + domain.
- Timeline: ~6–8 weeks part-time to first public version.
- All copy in DE first, then EN, RU, UK, AR, TR.
- BITV 2.0 + WCAG 2.1 AA mandatory.

## 8. Open product questions (escalations to user)

- [ ] Final domain name + visual brand (placeholder names: `unsere-id.de`, `verwaltung-neu.de`, `buergerportal.cloud`).
- [ ] How prominently to showcase the AI assistant vs autopilot — feature parity or AI as gateway?
- [ ] Whether to include a "share with viewer" guided tour (recorded walkthrough vs interactive).

## 9. Roadmap (revisable)

| Week | Milestone | Owner agents |
|---|---|---|
| 1 | Personas finalised, Umzug research + domain notes + verification | research-scout, domain-expert, concept-verifier |
| 2 | Project scaffold, Umzug spec, mock-backend foundation | product-architect, mock-backend-coder, frontend-coder |
| 3 | Umzug autopilot end-to-end, AI assistant skeleton | frontend-coder, mock-backend-coder, assistant-engineer |
| 4 | Posteingang + AI Brief-Erklärer | full pipeline |
| 5 | Kindergeburt OR Aufenthaltstitel-Verlängerung | full pipeline |
| 6 | i18n complete, a11y polish, dark mode, responsive | i18n-localizer, a11y-tester, frontend-coder |
| 7 | README, Loom video, deploy, copywriting | user + frontend-coder |
| 8 | Public launch, LinkedIn post, applications | user |

This roadmap is not a contract — the pipeline reorders based on concept-verifier verdicts and discovered constraints.
