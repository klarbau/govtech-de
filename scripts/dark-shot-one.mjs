import { chromium } from 'playwright-core';
import fs from 'node:fs';

const OUT = 'C:/Users/iaiaa/govtech/.dark-shots';
fs.mkdirSync(OUT, { recursive: true });

const [, , name = 'dashboard', path = '/dashboard'] = process.argv;

const browser = await chromium.launch();
const ctx = await browser.newContext({
  viewport: { width: 1320, height: 940 },
  colorScheme: 'dark',
  deviceScaleFactor: 2,
});
await ctx.addInitScript(() => {
  try { localStorage.setItem('theme', 'dark'); } catch {}
  const apply = () => {
    if (document.documentElement) {
      document.documentElement.classList.add('dark');
      document.documentElement.style.colorScheme = 'dark';
    }
  };
  apply();
  try { new MutationObserver(apply).observe(document.documentElement || document, { attributes: true }); } catch {}
});
const page = await ctx.newPage();
await page.goto('http://localhost:3000' + path, { waitUntil: 'networkidle', timeout: 45000 });
await page.waitForTimeout(2500);
await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: false });
console.log('shot', name, page.url());
await browser.close();
