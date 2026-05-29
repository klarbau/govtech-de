import { chromium } from 'playwright';
const b = await chromium.launch();
const c = await b.newContext({ viewport: { width: 1440, height: 900 } });
const p = await c.newPage();
p.on('requestfailed', (r) => console.log('FAIL', r.url(), r.failure()?.errorText));
p.on('response', (r) => {
  if (r.status() >= 400) console.log('HTTP', r.status(), r.url());
});
await p.goto('http://localhost:3201/vorgaenge', { waitUntil: 'domcontentloaded', timeout: 20000 });
await p.waitForTimeout(4500);
await p.screenshot({ path: '.audit-shots/04-vorgaenge.png', fullPage: false });
console.log('OK');
await b.close();
