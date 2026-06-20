import { defineConfig, devices } from '@playwright/test';

/**
 * Runs the umzug SPINE e2e (the demo-shipped gate) against the worktree's OWN
 * :3100 production build — to prove this feature didn't regress umzug (the only
 * shared touch was EidConfirmDialog, made backward-compatible). No webServer:
 * the orchestrator runs `next start -p 3100` (NEXT_PUBLIC_RELIABLE=1) first.
 */
export default defineConfig({
  testDir: './tests/e2e',
  testMatch: '**/spine.spec.ts',
  fullyParallel: false,
  retries: 1,
  workers: 1,
  timeout: 150_000,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:3100',
    trace: 'off',
  },
  projects: [{ name: 'spine', use: { ...devices['Desktop Chrome'] } }],
});
