import { defineConfig, devices } from '@playwright/test';

/**
 * STANDALONE config for the LIVE-REFLOW teaser
 * (tests/demo/lg-reflow-teaser.spec.ts). Unlike the stills-compositor teasers,
 * this take embeds the LIVE app from the already-running dev server on :3000
 * in a same-origin iframe and films it reflowing in real time — so the dev
 * server MUST be up (systemd `govtech-dev.service`). Read-only navigation,
 * no build, no server restart (see CLAUDE.md live-tunnel rules). There is
 * deliberately NO webServer block: the spec fails fast if :3000 is down
 * instead of silently spawning a second server.
 *
 *   npx playwright test --config=playwright.lg-reflow.config.ts
 *   npm run demo:render -- --out demo-recording/lg-reflow-live.mp4
 *
 * Output: one 1920×1080 .webm under demo-recording/.lg-reflow-output/.
 */
export default defineConfig({
  testDir: './tests/demo',
  testMatch: '**/lg-reflow-teaser.spec.ts',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list']],
  timeout: 300_000,
  outputDir: './demo-recording/.lg-reflow-output',
  use: {
    ...devices['Desktop Chrome'],
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 1,
    video: { mode: 'on', size: { width: 1920, height: 1080 } },
    launchOptions: { slowMo: 0 },
  },
});
