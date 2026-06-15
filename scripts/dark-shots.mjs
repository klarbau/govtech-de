import { chromium } from 'playwright-core';
import fs from 'node:fs';

const OUT = 'C:/Users/iaiaa/govtech/.dark-shots';
fs.mkdirSync(OUT, { recursive: true });

const pages = [
  ['dashboard', '/dashboard'],
  ['posteingang', '/posteingang'],
  ['stammdaten', '/stammdaten'],
  ['dokumente', '/dokumente'],
  ['vorgaenge', '/vorgaenge'],
  ['termine', '/termine'],
  ['assistent', '/assistent'],
  ['datenschutz', '/datenschutz'],
];

const browser = await chromium.launch();
const ctx = await browser.newContext({
  viewport: { width: 1280, height: 900 },
  colorScheme: 'dark',
});

// Force next-themes into dark before any app code runs.
await ctx.addInitScript(() => {
  try {
    localStorage.setItem('theme', 'dark');
  } catch {}
  const apply = () => {
    if (document.documentElement) {
      document.documentElement.classList.add('dark');
      document.documentElement.style.colorScheme = 'dark';
    }
  };
  apply();
  const obs = new MutationObserver(apply);
  try {
    obs.observe(document.documentElement || document, { attributes: true });
  } catch {}
});

const page = await ctx.newPage();

for (const [name, path] of pages) {
  try {
    await page.goto('http://localhost:3000' + path, { waitUntil: 'networkidle', timeout: 45000 });
    await page.waitForTimeout(1200);
    await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: false });
    console.log('shot', name, '->', page.url());
  } catch (e) {
    console.log('FAIL', name, e.message);
  }
}

await browser.close();
console.log('done');
