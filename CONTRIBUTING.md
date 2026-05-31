# Beiträge / Contributing

Vielen Dank für Ihr Interesse. / Thanks for your interest.

**This is a portfolio / speculative-design demo, not a product seeking large contributions.** It exists to communicate an idea (see [`README.md`](README.md)). Sweeping feature PRs are unlikely to be merged — but **issues and feedback are very welcome**, especially on UX, accessibility, German administrative realism, or the autopilot concept.

## Run it locally

```bash
pnpm install
cp .env.example .env.local   # ANTHROPIC_API_KEY is OPTIONAL — the assistant degrades gracefully without it
pnpm dev                     # http://localhost:3000
```

Quality gates (the same checks that keep the project green):

```bash
pnpm typecheck   # TypeScript (strict)
pnpm test:unit   # Vitest unit tests
pnpm test:e2e    # Playwright end-to-end (incl. the Umzug cascade spine flow)
pnpm test:a11y   # Playwright + axe-core accessibility audit
```

## Conventions

- **All data is mocked.** Components access the mock backend only via `src/lib/mock-backend` — never `localStorage` directly. No real PII; synthetic data is marked `[MOCK]` where helpful.
- **No hardcoded strings.** UI copy goes through `next-intl`; `de.json` is the source of truth. (The static landing page `src/app/page.tsx` is the intentional DE-inline exception.)
- **Accessibility is a gate, not a nice-to-have.** WCAG 2.1 AA + BITV 2.0 — keep `pnpm test:a11y` green.
- Files `kebab-case`; components `PascalCase`; `@/` aliases `./src/`. Server Components by default; add `'use client'` only when interactive state is required.

Please open an issue before a larger change so we can align on scope.
