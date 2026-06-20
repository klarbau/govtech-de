import { defineConfig, devices } from '@playwright/test';

/**
 * STANDALONE config for capturing clean update-arc REFERENCE STILLS
 * (tests/demo/update-arc-stills.spec.ts) for the AI video generator.
 * NOT a test gate. No video — just 1920×1080 PNGs into demo-recording/refs/.
 *
 *   # build + start a PROD server first (cleanest, no dev overlay):
 *   $env:NEXT_PUBLIC_RELIABLE='1'; npm run build; npm run start
 *   # then, in another shell:
 *   npx playwright test --config=playwright.stills.config.ts
 *
 * Reuses a server already on :3000; otherwise falls back to `npm run start`.
 */
export default defineConfig({
  testDir: './tests/demo',
  testMatch: '**/update-arc-stills.spec.ts',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list']],
  timeout: 300_000,
  outputDir: './demo-recording/.stills-output',
  use: {
    ...devices['Desktop Chrome'],
    baseURL: 'http://localhost:3000',
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 1,
    video: 'off',
    launchOptions: { slowMo: 0 },
  },
  webServer: {
    command: 'npm run start',
    url: 'http://localhost:3000',
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
