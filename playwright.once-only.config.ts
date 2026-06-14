import { defineConfig } from '@playwright/test';
import base from './playwright.config';

/**
 * One-off gate config for the Verifiable Once-Only worktree.
 * - Port 3100 to avoid the concurrent a11y dev server squatting :3000.
 * - Deterministic: production `next start` (NOT next dev) + NEXT_PUBLIC_RELIABLE=1,
 *   per the verification-discipline rule. Playwright starts + tears down the server.
 */
export default defineConfig({
  ...base,
  timeout: 60_000,
  use: { ...base.use, baseURL: 'http://localhost:3100' },
  webServer: {
    command: 'npx next start -p 3100',
    url: 'http://localhost:3100',
    reuseExistingServer: false,
    timeout: 180_000,
    stdout: 'pipe',
    stderr: 'pipe',
    env: { NEXT_PUBLIC_RELIABLE: '1', NEXT_TELEMETRY_DISABLED: '1' },
  },
});
