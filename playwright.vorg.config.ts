import { defineConfig, devices } from '@playwright/test';

/**
 * Dedicated config for the funktionale-Lebenslagen verification run.
 * Points at the worktree's OWN production server on :3100 (NOT the shared
 * :3000 dev server, which is a different worktree). No webServer block —
 * the orchestrator starts `next start -p 3100` (built with
 * NEXT_PUBLIC_RELIABLE=1) before invoking this.
 */
export default defineConfig({
  testDir: './tests/a11y',
  testMatch: '**/lebenslagen-vorgaenge-a11y.spec.ts',
  fullyParallel: false,
  retries: 1,
  workers: 1,
  timeout: 120_000,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:3100',
    trace: 'off',
  },
  projects: [{ name: 'vorg', use: { ...devices['Desktop Chrome'] } }],
});
