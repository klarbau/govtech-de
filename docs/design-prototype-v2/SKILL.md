---
name: govtech-de-design
description: Use this skill to generate well-branded interfaces and assets for GovTech DE — a speculative-design prototype for a citizen-first interaction layer over the German public-administration stack (DeutschlandID + EUDI Wallet + Deutschland-Stack). Contains design guidelines, OKLCH colour tokens, typography (Source Sans 3 + 5-px-line-height-rhythm GOV.UK scale), Lucide-icon usage rules, the three-tier shadow + motion system, and a web UI kit (Posteingang, Stammdaten, Umzug surfaces) for prototyping.
user-invocable: true
---

# GovTech DE Design Skill

Read the README.md file within this skill first; it documents the brand context (speculative prototype, all data mocked), the three primary personas (Anna Petrov, Familie Schmidt, Mehmet Yıldız), the content fundamentals (Sie-Form, gov.uk register, no emoji), the visual foundations (Hue-80° warm-neutral surfaces, Trust-Blau accent, three-tier shadows, two motion curves with no bounce), the 14 Hard-Lines, and the file index.

Then explore the other files:

- `colors_and_type.css` — Drop into any HTML artefact; `--ds-*` tokens + `.ds-*` semantic classes + automatic dark mode + reduced-motion + high-contrast support.
- `assets/` — Brand mark (logo-mark.svg) and wordmark (logo-wordmark.svg). Iconography is **lucide-react** (ISC) — load via CDN from `https://unpkg.com/lucide@latest/dist/umd/lucide.min.js` for static artefacts.
- `fonts/README.md` — Source Sans 3 (SIL-OFL) via Google Fonts CDN; substitution notes.
- `preview/` — One HTML card per token cluster (colours, type, spacing, motion, components). Use as visual reference.
- `ui_kits/web/` — Click-through web prototype with sidebar + topbar + the three shipped surfaces (Posteingang, Stammdaten, Umzug). Copy the component you need into your artefact.

## When generating artefacts

- **Slides, mocks, throwaway prototypes:** Copy `colors_and_type.css` (or its `:root` block) into the artefact. Use `.ds-*` classes for headings + body. Reference Lucide via CDN. Never emit emoji. Use Sie-Form German for any UI copy unless the user has asked for another language.
- **Production code:** The upstream Next.js app is at <https://github.com/klarbau/govtech-de>. Read its `CLAUDE.md` for tech-stack constraints (Next.js 15 + Tailwind v4 + shadcn/ui + lucide-react + next-intl + framer-motion sparingly). Apply the same `--ds-*` tokens — they map 1:1 to `src/app/globals.css` in the live app.

## Default behaviour on plain invocation

If the user invokes this skill without further guidance, ask them:

1. **What are you building?** (a slide / a mock / a prototype / production code)
2. **Which surface?** (Posteingang / Stammdaten / a Vorgangs-wizard / Dashboard / something new)
3. **Which persona's data?** (Anna / Schmidt / Mehmet — or generic)
4. **In which language?** (Deutsch is default; EN / RU / UK / AR / TR also supported via next-intl)
5. **Light, dark, or both?** (Both is default — `prefers-color-scheme` is honoured automatically.)

Then act as an expert designer working in the GovTech DE register and output HTML artefacts (or production code, depending on the answer).

## Non-negotiable rules

- Never use emoji.
- Never frame Source Sans 3 as a "BundesSans alternative". It's chosen on tech merits only (SIL-OFL, 9 weights, German diacritics including ẞ, slashed zero).
- Never colour-code Behörden categories (Bund / Land / Kommune are text-only).
- Never invent norm citations — every `§` reference must resolve to a real regulation (`gesetze-im-internet.de`).
- Always include a prototype disclaimer / `[MOCK]` watermark on any surface that displays personal data.
- Always use tabular numerals (`font-variant-numeric: tabular-nums` or `.ds-tabular`) for Aktenzeichen, FE-Nr, IBAN, Renten-Nr, Fristen.
