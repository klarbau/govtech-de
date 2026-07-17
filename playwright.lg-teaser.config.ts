import { defineConfig, devices } from '@playwright/test';

/**
 * STANDALONE config for the LG + Mobile-Comfort motion teaser
 * (tests/demo/lg-mobile-comfort-teaser.spec.ts). Clone of
 * playwright.motion.config.ts — no app server needed, the spec builds a
 * self-contained HTML stage from demo-recording/refs/ stills (data URIs) and
 * animates them with the browser compositor.
 *
 *   npx playwright test --config=playwright.lg-teaser.config.ts
 *   npm run demo:render -- --out demo-recording/lg-mobile-comfort-teaser.mp4
 *
 * Output: one 1920×1080 .webm under demo-recording/.lg-teaser-output/.
 */
export default defineConfig({
  testDir: './tests/demo',
  testMatch: '**/lg-mobile-comfort-teaser.spec.ts',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list']],
  timeout: 180_000,
  outputDir: './demo-recording/.lg-teaser-output',
  use: {
    ...devices['Desktop Chrome'],
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 1,
    video: { mode: 'on', size: { width: 1920, height: 1080 } },
    launchOptions: { slowMo: 0 },
  },
});
