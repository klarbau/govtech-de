import { defineConfig, devices } from '@playwright/test';

/**
 * STANDALONE config for RECORDING a demo-walkthrough video of the headline-wow
 * path — NOT part of the test gate.
 *
 *   npm run demo:record
 *
 * Output: one .webm under `demo-recording/` that is ALREADY the finished cut —
 * the spec does the whole edit in-take (intro/outro title cards, lower-third
 * scene captions, white cross-fades on route changes, pacing). Convert to mp4
 * for GitHub/Loom upload with `npm run demo:render` (needs ffmpeg; supports
 * `-- --speed 1.15` for a global speed-up). The assistant SSE is MOCKED in the
 * spec, so NO ANTHROPIC_API_KEY is needed and the run is deterministic;
 * `?reliable=1` disables the 5% mock-error injection.
 *
 * For the cleanest visuals (no Next dev overlay / no cold-compile reload mid-take),
 * start a PROD server first, then record (the recorder reuses it):
 *
 *   $env:NEXT_PUBLIC_RELIABLE='1'; npm run build; npm run start      # PowerShell
 *   # then, in another shell:
 *   npm run demo:record
 *
 * If no server is on :3000 this config falls back to `npm run dev`.
 *
 * ffmpeg to mp4 (1080p, H.264):
 *   ffmpeg -i demo-recording/<...>.webm -c:v libx264 -crf 18 -pix_fmt yuv420p demo.mp4
 */
export default defineConfig({
  testDir: './tests/demo',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list']],
  timeout: 180_000,
  outputDir: './demo-recording',
  use: {
    ...devices['Desktop Chrome'],
    baseURL: 'http://localhost:3000',
    viewport: { width: 1920, height: 1080 },
    // Record every step; size matches the viewport for a crisp 1080p capture.
    video: { mode: 'on', size: { width: 1920, height: 1080 } },
    // No global slowMo — the spec drives all pacing explicitly (eased cursor
    // glides + "let the viewer read" beats), so slowMo would double-delay every
    // one of the per-step mouse moves.
    launchOptions: { slowMo: 0 },
  },
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
