#!/usr/bin/env bash
#
# Cloud dependency installer for Claude Code on the web.
#
# This runs as a SessionStart hook (wired in .claude/settings.json), NOT as the
# environment "Setup script". SessionStart hooks run AFTER Claude Code launches,
# inside the cloned repo directory, so package.json is present. The environment
# Setup script runs earlier in /home/user (before the repo is the cwd), where
# `pnpm install` fails with ERR_PNPM_NO_PKG_MANIFEST.
#
# Cache the heavy Playwright browser via the env *Setup script* field instead
# (it needs no repo and is snapshot-cached). Set the Setup script to:
#     npx -y playwright@1.49.1 install --with-deps chromium
#
# Skips local machines — only runs in cloud sessions (CLAUDE_CODE_REMOTE=true).
# See agent-context.md.

if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

set -e

corepack enable >/dev/null 2>&1 || true

echo "[install] pnpm install (cloud session)…"
pnpm install --frozen-lockfile

# Browser + OS libs are pre-cached by the env Setup script; this is a fast no-op
# if the matching Chromium build is already on disk.
pnpm exec playwright install chromium >/dev/null 2>&1 || true

echo "[install] done."
exit 0
