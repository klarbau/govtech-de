import { chromium } from 'playwright';
const b = await chromium.launch();
const c = await b.newContext({ viewport: { width: 1440, height: 1100 } });
const p = await c.newPage();
await p.goto('http://localhost:3201/familie', { waitUntil: 'domcontentloaded', timeout: 20000 });
await p.waitForTimeout(4500);
// Crop around the Familie main card
await p.screenshot({ path: '.audit-shots/09-familie-crop.png', fullPage: false, clip: { x: 280, y: 60, width: 1160, height: 1040 } });
// Inspect computed style of one badge
const styles = await p.evaluate(() => {
  const out = {};
  const badges = document.querySelectorAll('.badge');
  badges.forEach((b, i) => {
    if (i < 6) {
      const cs = getComputedStyle(b);
      out[`badge[${i}]_${b.textContent?.trim().slice(0, 20)}`] = {
        bg: cs.backgroundColor,
        color: cs.color,
        classes: b.className,
      };
    }
  });
  const avs = document.querySelectorAll('.avs');
  avs.forEach((a, i) => {
    if (i < 2) {
      const av = a.querySelector('.avatar');
      const cs = av ? getComputedStyle(av) : null;
      out[`avs[${i}]_${a.children.length}_kids`] = {
        avs_display: getComputedStyle(a).display,
        first_avatar: cs ? { w: cs.width, h: cs.height, bg: cs.backgroundColor, ml: cs.marginLeft } : 'no avatar',
      };
    }
  });
  return out;
});
console.log(JSON.stringify(styles, null, 2));
await b.close();
