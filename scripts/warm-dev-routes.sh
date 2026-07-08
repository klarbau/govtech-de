#!/usr/bin/env bash
# Warm every (app) route after `next dev` starts, so the live preview / tunnel
# never serves a cold on-demand webpack compile (3–6s per first-visit route in
# dev). Wired as an ExecStartPost drop-in on govtech-dev.service. Idempotent,
# always exits 0 (must never mark the unit failed). Re-runs on every restart;
# HMR edits still recompile the touched route, but cross-route navigation stays
# instant. Not needed in production — `next build` compiles everything ahead.
set -u

BASE="http://localhost:3000"
ROUTES=(
  /
  /onboarding
  /dashboard
  /posteingang
  /stammdaten
  /vorgaenge
  /dokumente
  /termine
  /steuer
  /familie
  /assistent
  /datenschutz
  /lebenslagen
)

# Wait (max ~90s) for the dev server to answer before warming.
for _ in $(seq 1 90); do
  if curl -s -o /dev/null --max-time 2 "$BASE/"; then break; fi
  sleep 1
done

for r in "${ROUTES[@]}"; do
  curl -s -o /dev/null --max-time 30 "$BASE$r" || true
done

exit 0
