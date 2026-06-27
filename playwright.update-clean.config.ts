import { defineConfig, devices } from '@playwright/test';

/**
 * STANDALONE config for the CLEAN update-arc capture
 * (tests/demo/update-arc-clean.spec.ts) — a raw recording with NO in-take edit
 * (no title cards, captions, zoom push-ins, code overlays or cross-fades), meant
 * to be post-processed downstream (e.g. via an MCP video pipeline).
 *
 *   npm run demo:record:update:clean
 *
 * Output: one .webm under `demo-recording/` showing just the navigation + clicks
 * (injected cursor + ripple) at 1920×1080. The assistant SSE is MOCKED, so NO
 * ANTHROPIC_API_KEY is needed and the run is deterministic; `?reliable=1`
 * disables the 5% mock-error injection.
 *
 * Record against a PROD server for the cleanest visuals (no dev overlay, no
 * cold-compile reload mid-take). With nothing on :3000 this falls back to
 * `npm run dev` (the dev overlay would then show in the take):
 *
 *   $env:NEXT_PUBLIC_RELIABLE='1'; npm run build; npm run start   # PowerShell
 *   # then, in another shell:
 *   npm run demo:record:update:clean
 */
export default defineConfig({
  testDir: './tests/demo',
  testMatch: '**/update-arc-clean.spec.ts',
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
    launchOptions: { slowMo: 0 },
  },
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
