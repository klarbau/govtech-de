import { defineConfig, devices } from '@playwright/test';

/**
 * STANDALONE config for RECORDING the "what's new in the green redesign" /
 * green-tour walkthrough (tests/demo/green-tour-demo.spec.ts) — NOT part of the
 * test gate. Kept separate from the other demo configs so each demo records on
 * its own and the takes / clicks.json never collide.
 *
 *   npm run demo:record:green
 *
 * Output: one .webm under `demo-recording/` that is ALREADY the finished cut
 * (intro/outro cards, lower-third captions, cinematic zoom push-ins, white
 * cross-fades, pacing). Convert + score to mp4 with `npm run demo:render`
 * (newest .webm wins; supports `-- --speed 1.1`). No assistant SSE is used, so
 * NO ANTHROPIC_API_KEY is needed and the run is deterministic; every route is
 * visited with `?reliable=1` to disable the 5% mock-error injection.
 *
 * For the cleanest visuals (no Next dev overlay / no cold-compile reload
 * mid-take), start a PROD server first, then record (the recorder reuses it):
 *
 *   $env:NEXT_PUBLIC_RELIABLE='1'; npm run build; npm run start      # PowerShell
 *   # then, in another shell:
 *   npm run demo:record:green
 *
 * If no server is on :3000 this config falls back to `npm run dev`.
 */
export default defineConfig({
  testDir: './tests/demo',
  testMatch: '**/green-tour-demo.spec.ts',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list']],
  timeout: 360_000,
  outputDir: './demo-recording',
  use: {
    ...devices['Desktop Chrome'],
    baseURL: 'http://localhost:3000',
    viewport: { width: 1920, height: 1080 },
    video: { mode: 'on', size: { width: 1920, height: 1080 } },
    // No global slowMo — the spec drives all pacing explicitly (eased cursor
    // glides + zoom holds + "let the viewer read" beats).
    launchOptions: { slowMo: 0 },
  },
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
