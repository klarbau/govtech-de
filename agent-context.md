# Agent context — shared working memory

**Purpose.** Durable, cross-session project knowledge that does NOT live in the code or git
history: the git/publishing model, how to run the gates, known gotchas, and open threads.
CLAUDE.md imports this file (`@agent-context.md`), so every Claude Code session — local **or web** —
loads it at start. It is the in-repo equivalent of the assistant's local memory, so a cloud clone
understands the project from the first message.

> Lives at the **repo root** on purpose: `.gitignore` makes everything under `docs/` local-only, so a
> context file there would never reach a clone. Keep this at root.

**Maintenance rule (read + keep updated).** At the start of a task, read this file. Whenever you
learn a durable project fact, make a cross-session decision, or hit a non-obvious gotcha, append a
**dated one-line entry** to the relevant section and commit it. Convert relative dates to absolute.
Keep it curated, not a dump — one fact per line, prune what's stale.

**Public-safe by construction.** This file is written to be safe even if it reaches the public
mirror: no machine-local paths, no secrets, no sensitive personal data. Keep it that way — it is
engineering notes, not a private scratchpad.

---

## Git remotes & publishing model (set up 2026-06-27)

- `origin` → `github.com/klarbau/govtech-de-private` — **PRIVATE** working repo, **default `git push`
  target**, holds full WIP history.
- `public` → `github.com/klarbau/govtech-de` — **PUBLIC** mirror, deployed on `govtech-de.vercel.app`.
- **Default push goes to PRIVATE.** Publishing is deliberate and explicit: `git push public <branch>`
  (chosen style = whole branch as-is, no squash). Never push to `public` implicitly.
- `git push` is in the `deny` list in `.claude/settings.json`, so the agent cannot push — a human runs
  every push (locally via the `! ` prompt prefix).
- Caveat: the public repo's existing history stays public; going private is not retroactive.

## Branches (local)

- `main` — canonical; the green "Waldgrün" redesign + functional Lebenslagen landed here (merge tip ~`fd444a4`).
- `feat/termine-vorgemerkt` — **active WIP**; snapshot commit `d02b3cd` (2026-06-27) holds the entangled
  in-progress work below. Not yet merged to `main`, not on `public`.
- Also present: `feat/brandbook-redesign`, `feat/vorgaenge-functional`, `feat/termin-autopilot`, plus
  `backup/*` safety branches.

## How to verify — gates (do not trust a self-reported PASS)

The project's #1 recurring failure is the false-PASS. Re-run gates yourself, deterministically:

- Run against a **prod build**, not `next dev`: `next build` then `next start`, with
  `NEXT_PUBLIC_RELIABLE=1` (disables the 5% mock-error injection).
- On Windows, pnpm is broken (corepack/libuv) → call binaries via `node_modules/.bin/*`.
- **a11y**: axe specs in `tests/a11y/` (`@axe-core/playwright`). Read the failed AND flaky counts.
  Known-good baseline ≈ `132 passed / 0 failed / 47 skipped` (6 reds that appear are the pre-existing
  once-only `/dokumente` panel, proven pre-existing).
- **Spine e2e**: `tests/e2e/spine.spec.ts` (2/2) — green spine = demo-shipped.
- **i18n**: 6 locales, `de.json` is source-of-truth; spine-tier surfaces require full parity (validate
  JSON in the main thread — `JSON.parse` each locale).

## Known gotchas (hard-won)

- **`next build` over a live `next dev` corrupts `.next`** → app-wide "Wird geladen" hangs (SSR still 200).
  Stop dev first; never build over :3000. Coordinate the :3000 pause with the user.
- **`*/` inside a CSS comment** (e.g. `--color-*/`) closes the comment early → prod `next build` fails in
  cssnano; `next dev` + static review pass. Always run a real `next build` after `prototype-v2.css` edits.
- **RSC function-prop**: passing a function from a Server Component into a client provider passes `tsc`
  AND `next build` but 500s every page at runtime. Only the running app / e2e catches it — always run it.
- **base-ui 1.5.0 modal** contains the background via `aria-hidden`, not `inert` → Tab focus escapes the
  dialog (scoped `[role=dialog]` axe is a false-PASS). Fixed via shared `use-inert-outside-modal.ts`.
- **Tailwind v4 centres dialogs via the CSS `translate` property** → re-anchoring a base-ui popup needs
  `translate:none` (not just `transform:none`).
- **ajv `ajv/dist/2020` resolution**: junctioned/hoisted `node_modules` breaks `next build` → `next.config`
  webpack alias to the v8 copy (already added to main config).
- **Anchor-as-primary-button**: an `<a>` styled `bg-primary text-primary-foreground` renders body-text
  colour (Tailwind preflight `a{color:inherit}` beats the utility on anchors) → axe contrast fail. Use a
  real `Button` with `render={<Link/>}` or unlayered CSS colour.
- **Dark-mode tinted bands**: `bg-brand-50` bands fail dark contrast (token doesn't flip) → always run axe
  with `.dark`; use a dark-aware band + flipping text tokens.
- **Playwright `addInitScript`** runs before `<html>` exists — guard `documentElement` access or the whole
  script dies silently (blank takes, exit 0).

## Conventions & workflow

- Feature work goes through the 10-agent pipeline (see `docs/WORKFLOW.md`); the main thread orchestrates,
  it does not write feature code directly. Trivial post-ship fixes in the main thread are fine.
- **Worktree-per-task**: never switch/stash/reset the primary checkout (user edits live there); isolate
  file-mutating subagents with their own worktree.
- **CodeGraph first**: query the graph (`mcp__codegraph__*`) before Read/Grep/Glob for code location.
- **Run-to-verify**: every visible change must be runnable (dev :3000, HMR) and handed over with exact
  test steps — route, persona, steps, what to look for. Never a self-reported "done".
- Strings via `next-intl` `t('…')`, `de.json` source. Components reach data only through
  `lib/mock-backend/api.ts`. Commit/push only when the user asks.

## Tooling

- **CodeGraph MCP** — local **stdio** code graph (`@colbymchenry/codegraph`, index in gitignored
  `.codegraph/`). **Cannot run in Claude Code web**: the web sandbox doesn't support stdio MCP servers and
  codegraph has no HTTP/remote transport (`serve` is stdio-only). On web, use Read/Grep/Glob (full ripgrep
  is available) — codegraph is a token optimization, not a capability. Verified 2026-06-27.
- **Demo recorders** — `demo-record` skill; clean takes `green-tour-clean` (functional Lebenslagen tour)
  and `update-arc-clean` (FIT-Connect security arc) render via the post-process pipeline.

## Cloud env (Claude Code on the web) — verified 2026-06-27

- Point the cloud session at the **private** repo `govtech-de-private`; CLAUDE.md + `@agent-context.md`
  load automatically from the clone.
- **Dependency install split** (the env Setup script runs in `/home/user` BEFORE the repo is the cwd, so
  `pnpm install` there fails `ERR_PNPM_NO_PKG_MANIFEST`):
  - **Env "Setup script" field** (cached snapshot, no repo needed) → cache the heavy browser:
    `npx -y playwright@1.49.1 install --with-deps chromium`
  - **SessionStart hook** (`.claude/settings.json` → `scripts/install_pkgs.sh`, runs in the repo dir each
    session, cloud-guarded via `CLAUDE_CODE_REMOTE`) → `pnpm install --frozen-lockfile`.
- Keep **Network access = Trusted** (npm registry); deps reinstall each session (~1 min) — only global
  tools/browsers are snapshot-cached, repo `node_modules` is not. Don't set `NODE_ENV=production` (skips
  devDependencies). No Node pin / no native deps; all Playwright configs are Chromium-only.

## Automation — scheduled routine (2026-06-27)

- **`BACKLOG.md`** (root) is the project task list. A daily Claude Code **routine** ("GovTech Backlog
  Scout", spec in `routine-backlog-scout.md`) researches the German GovTech ecosystem + legal changes +
  citizen pain points and **appends** dated, source-cited candidate tasks on a **self-named
  `claude/<date>-<slug>` branch** (the routine derives the slug from the day's themes) — review-gated,
  append-only, never edits code. That branch is also the **working branch** for implementing the promoted
  items (interactive session checks it out, builds, opens a PR). Humans triage candidates into *Accepted*.
- If you're a routine run: follow `routine-backlog-scout.md` exactly. Otherwise: the routine env needs
  **Full** (or Custom) network access for open web research — Trusted blocks arbitrary domains.

## Open threads / followups

- **SHIPPED 2026-06-28 (branch `claude/buergerservice-ideas-k5c08z`)** — wow-round-2 **idea A: Mehrsprachiger
  Brief-Erklärer**. Posteingang brief-explainer is now locale-aware (RU/UK/AR/TR/EN) as a comprehension aid;
  German original authoritative + one tap away. Reuses the dormant `LetterAiSummary.translations` type slot +
  6-locale i18n. **Gotcha learned:** the **live** Posteingang renders `PosteingangInbox.tsx` (in-file
  `PostDetail` + `PostItemRow`), NOT `LetterReader`/`AISummaryBlock`/`AiErklaererCard` (those are orphaned/dead)
  — integrate UI there. Ideas B (Klartext-Rückkanal) + D (Heirats-/Namens-Kaskade) still queued on this branch.
  Backlog round-2 candidates = `wow-backlog.md §5`.
- **SHIPPED 2026-06-28 (same branch)** — wow-round-2 **idea B: Klartext-Rückkanal**. Under an explained
  letter with a Rechtsbehelf-Skelett active, the citizen types plain-language facts; a new RDG-fenced AI tool
  `formuliere_sachverhalt` (server one-shot at `/api/reply/sachverhalt`, mirrors `/api/reply/rewrite`,
  offline-graceful verbatim fallback) restates ONLY those facts into the skeleton's `begruendung_kurz`. Live
  in `ReplyComposeContent` (`RechtsbehelfFaktenCapture` + non-skippable `NoSuspensionHintBanner`).
  **Durable legal note:** a Widerspruch against a Beitragsbescheid has NO aufschiebende Wirkung (§86a Abs.2
  SGG / §80 Abs.2 Nr.1 VwGO) — the no-suspension hint + independent Zahlungsfrist must stay non-skippable on
  ALL Beitrag letters or the feature misleads. Reply templates are DE-only by design (`body_template_de`).
  Idea D (Heirats-/Namens-Kaskade) still queued.
- `d02b3cd` (feat/termine-vorgemerkt) bundles, all NOT yet merged to `main` / `public`: green `/termine`
  command-center relayout, Lebenslagen hub + detail relayout, Pflegegrad results-dossier, Umzug `/run` →
  shared dossier, dossier dedup into `lebenslagen-shared.ts`, proactive Wohngeld nudge, `brief-bridge`
  proactive inbox, eID-consent "Waldgrün" redesign.
- **Deferred** — Stammdaten + Familie redesign integration: orphaned `v2/*` components, ~6 `stammdaten-*`
  + 4 `redesign-familie` a11y specs `test.fixme`'d. Live pages are axe-clean; this is spec-coverage debt.
- **Repo hygiene (pending)** — ~725-file `git rm --cached` untrack (docs/.claude/etc. tracked despite the
  `.gitignore` policy) + port the `.gitignore` policy onto `main`.
- **Keyless web visitors** can't trigger the live KI turn until a deployed `ANTHROPIC_API_KEY` exists.
