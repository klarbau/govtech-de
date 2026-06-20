import { defineConfig, devices } from '@playwright/test';

/** Fixup stills (tests/demo/update-arc-stills3.spec.ts). Reuses prod server on :3000. */
export default defineConfig({
  testDir: './tests/demo',
  testMatch: '**/update-arc-stills3.spec.ts',
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
