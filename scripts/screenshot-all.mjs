import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

const OUT = resolve(process.cwd(), '.audit-shots');
mkdirSync(OUT, { recursive: true });

const ROUTES = [
  ['/', '00-landing'],
  ['/dashboard', '01-dashboard'],
  ['/posteingang', '02-posteingang'],
  ['/stammdaten', '03-stammdaten'],
  ['/vorgaenge', '04-vorgaenge'],
  ['/vorgaenge/umzug/run', '05-umzug-run'],
  ['/dokumente', '06-dokumente'],
  ['/termine', '07-termine'],
  ['/steuer', '08-steuer'],
  ['/familie', '09-familie'],
  ['/assistent', '10-assistent'],
  ['/datenschutz', '11-datenschutz'],
  ['/onboarding', '12-onboarding'],
];

const BASE = 'http://localhost:3201';

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  const consoleErrors = {};
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      const url = page.url();
      consoleErrors[url] = consoleErrors[url] ?? [];
      consoleErrors[url].push(msg.text().slice(0, 200));
    }
  });
  for (const [path, name] of ROUTES) {
    const url = BASE + path;
    try {
      const resp = await page.goto(url, { waitUntil: 'networkidle', timeout: 15000 });
      const status = resp ? resp.status() : 'no-resp';
      /* Mock-backend simulates 300–800ms latency in-memory (no network) so
       * `networkidle` fires before client-side data resolves. Wait a beat
       * for useEffect chains to settle. */
      await page.waitForTimeout(3500);
      await page.screenshot({ path: resolve(OUT, `${name}.png`), fullPage: false });
      console.log(`${status}\t${path}\t${name}.png`);
    } catch (e) {
      console.log(`ERR\t${path}\t${e.message.slice(0, 150)}`);
    }
  }
  console.log('\n--- console errors ---');
  for (const [u, errs] of Object.entries(consoleErrors)) {
    console.log(u);
    errs.forEach((e) => console.log('  ', e));
  }
  await browser.close();
})();
