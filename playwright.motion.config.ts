import { defineConfig, devices } from '@playwright/test';

/**
 * STANDALONE config for the CRISP-MOTION teaser (tests/demo/motion-teaser.spec.ts).
 * No app server needed — the spec builds a self-contained HTML stage from the
 * clean reference stills (demo-recording/refs/*.png embedded as data URIs) and
 * animates them with the browser compositor (sub-pixel, no jitter, text stays
 * pixel-sharp because the real PNG is transformed, never regenerated).
 *
 *   npx playwright test --config=playwright.motion.config.ts
 *   # then convert the newest .webm → mp4 (see the spec footer / generate-teaser doc)
 *
 * Output: one 1920×1080 .webm under demo-recording/.motion-output/.
 */
export default defineConfig({
  testDir: './tests/demo',
  testMatch: '**/motion-teaser.spec.ts',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list']],
  timeout: 180_000,
  outputDir: './demo-recording/.motion-output',
  use: {
    ...devices['Desktop Chrome'],
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 1,
    video: { mode: 'on', size: { width: 1920, height: 1080 } },
    launchOptions: { slowMo: 0 },
  },
});
