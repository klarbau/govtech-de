import { defineConfig, devices } from '@playwright/test';

/**
 * STANDALONE config for the CLEAN green-tour capture
 * (tests/demo/green-tour-clean.spec.ts) — a raw recording of the whole new
 * Waldgrün interface + the functional Lebenslagen flow, clicked through
 * end-to-end, with NO in-take edit (no title cards, captions, zoom push-ins or
 * cross-fades), meant to be post-processed downstream (e.g. via an MCP pipeline).
 *
 *   npm run demo:record:green:clean
 *
 * Output: one .webm under `demo-recording/` showing just navigation + clicks
 * (injected cursor + ripple) at 1920×1080. Deterministic; `?reliable=1` disables
 * the 5% mock-error injection. No ANTHROPIC_API_KEY needed.
 *
 * Record against a PROD server for the cleanest visuals (no dev overlay, no
 * cold-compile reload mid-take). With nothing on :3000 this falls back to
 * `npm run dev` (the dev overlay would then show in the take):
 *
 *   $env:NEXT_PUBLIC_RELIABLE='1'; npm run build; npm run start   # PowerShell
 *   # then, in another shell:
 *   npm run demo:record:green:clean
 */
export default defineConfig({
  testDir: './tests/demo',
  testMatch: '**/green-tour-clean.spec.ts',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list']],
  timeout: 380_000,
  outputDir: './demo-recording',
  use: {
    ...devices['Desktop Chrome'],
    baseURL: 'http://localhost:3000',
    viewport: { width: 1920, height: 1080 },
    video: { mode: 'on', size: { width: 1920, height: 1080 } },
    launchOptions: { slowMo: 0 },
  },
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
