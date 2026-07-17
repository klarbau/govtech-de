import { defineConfig, devices } from '@playwright/test';

/**
 * STANDALONE config for the LG + Mobile-Comfort teaser stills
 * (tests/demo/lg-teaser-stills.spec.ts). NOT a test gate. No video — PNGs
 * into demo-recording/refs/.
 *
 * Deliberately NO webServer block: it runs against the ALREADY RUNNING
 * systemd-managed `next dev` on :3000 (live tunnel — never build/restart it).
 * If :3000 is down, the tests fail fast instead of spawning a server.
 *
 *   npx playwright test --config=playwright.lg-stills.config.ts
 */
export default defineConfig({
  testDir: './tests/demo',
  testMatch: '**/lg-teaser-stills.spec.ts',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list']],
  timeout: 300_000,
  outputDir: './demo-recording/.lg-stills-output',
  use: {
    ...devices['Desktop Chrome'],
    baseURL: 'http://localhost:3000',
    video: 'off',
    launchOptions: { slowMo: 0 },
  },
});
