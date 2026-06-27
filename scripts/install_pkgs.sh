#!/usr/bin/env bash
#
# Cloud setup script for Claude Code on the web (reusable across sessions).
#
# Set this ONCE in the web environment's "Setup script" field as:
#     bash scripts/install_pkgs.sh
#
# Its output is filesystem-snapshotted by Anthropic and reused as the starting
# point for later sessions, so dependencies and the Playwright browser are NOT
# reinstalled every session. The setup step only re-runs when you edit the
# script, change allowed network hosts, or after the ~7-day cache expiry.
# See agent-context.md and https://code.claude.com/docs/en/claude-code-on-the-web
#
# Needs "Trusted" network access (default) so pnpm/Playwright can reach registries.

set -euo pipefail

echo "[setup] enabling pnpm via corepack…"
corepack enable >/dev/null 2>&1 || true

echo "[setup] installing dependencies (pnpm, frozen lockfile)…"
pnpm install --frozen-lockfile

echo "[setup] installing Playwright Chromium + OS deps (for a11y/e2e gates)…"
pnpm exec playwright install --with-deps chromium

echo "[setup] done — deps + Chromium are now on disk and will be cached."
