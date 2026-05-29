# Skills — imported from `loneliness-is-repulsive/govtech-de/.claude/skills/`

17 design-related skill packages, copied verbatim from the upstream repo so a Claude Code agent (or any human) working in this project has them on hand. Each folder is a self-contained skill with its own `SKILL.md` + `references/` + occasionally `templates/`.

## Index

| Skill | Author / origin | What it does |
|---|---|---|
| [`banner-design/`](./banner-design/SKILL.md) | claudekit | Multi-format banner generation — social, ads, web hero, print; 13+ art directions. |
| [`brand/`](./brand/SKILL.md) | claudekit | Brand voice, visual identity, messaging frameworks, asset management, consistency. |
| [`design/`](./design/SKILL.md) | claudekit | Umbrella design skill — brand + tokens + UI + logo + CIP + slides + banners + icons. |
| [`design-everyday-things/`](./design-everyday-things/SKILL.md) | wondelai | Don Norman's foundations — affordances, signifiers, constraints, feedback, mental models, the two gulfs. |
| [`design-sprint/`](./design-sprint/SKILL.md) | wondelai | The Google Ventures 5-day sprint — map, sketch, decide, prototype, test. |
| [`design-system/`](./design-system/SKILL.md) | claudekit | Three-layer token architecture (primitive → semantic → component); systematic spec writing. |
| [`emil-design-eng/`](./emil-design-eng/SKILL.md) | — | Emil Kowalski's UI-polish + animation philosophy. |
| [`ios-hig-design/`](./ios-hig-design/SKILL.md) | wondelai | Apple HIG patterns: tab bars, sheets, SF Symbols, safe areas, haptics, Dynamic Island. |
| [`microinteractions/`](./microinteractions/SKILL.md) | wondelai | Dan Saffer's trigger / rules / feedback / loops framework for tiny interactions. |
| [`refactoring-ui/`](./refactoring-ui/SKILL.md) | wondelai | Refactoring UI — grayscale-first, constrained scales, shadow + depth, dark-mode systems. |
| [`slides/`](./slides/SKILL.md) | claudekit | Strategic HTML decks with Chart.js, design tokens, contextual layout strategies. |
| [`top-design/`](./top-design/SKILL.md) | wondelai | Awwwards-tier immersive web — cinematic motion, scroll storytelling, dramatic type. |
| [`ui-refactor/`](./ui-refactor/SKILL.md) | — | Tactical UI fixes — layouts, colors, fonts, hierarchy. Feature-first, low-fi, system-driven. |
| [`ui-styling/`](./ui-styling/SKILL.md) | claudekit | shadcn/ui + Tailwind + canvas visuals — accessible components, dark mode, theming. |
| [`ui-ux-pro-max/`](./ui-ux-pro-max/SKILL.md) | — | 50+ styles · 161 palettes · 57 font pairs · 99 UX guidelines · 10 frameworks. |
| [`ux-heuristics/`](./ux-heuristics/SKILL.md) | wondelai | Nielsen-style heuristic evaluation, severity ratings, information-architecture audits. |
| [`web-typography/`](./web-typography/SKILL.md) | wondelai | Type selection, pairing, line-height, variable fonts, FOUT/FOIT, performance. |

## How to use them

These follow the [Agent Skills](https://github.com/anthropics/agent-skills) front-matter convention. To activate one inside Claude Code, drop the relevant `<folder>/` into your `~/.claude/skills/` directory; to use one as plain reference, open its `SKILL.md` and the `references/` markdown files alongside.

For the project-local design system you already have, see `../SKILL.md` (`govtech-de-design`) at the project root.

## Provenance

All 250 files in this folder are imported verbatim from `loneliness-is-repulsive/govtech-de/.claude/skills/` on `main` (commit `746f2550`). No edits — if you find a typo, fix it upstream and re-import.
