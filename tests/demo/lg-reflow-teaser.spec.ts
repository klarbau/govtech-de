/**
 * LIVE-REFLOW TEASER — "what's new" cut for the Liquid-Glass rollout +
 * Mobile-Comfort-Welle, built around ONE continuous, uncut shot of the REAL
 * running application reflowing live from desktop width to phone width.
 *
 * How it differs from the stills-compositor teasers (motion-teaser,
 * lg-mobile-comfort-teaser): nothing here is a screenshot. A 1920×1080 stage
 * page (served same-origin via route interception on :3000/__lg_stage__)
 * embeds the LIVE app in an iframe. The iframe establishes its own CSS
 * viewport, so animating its width genuinely re-runs the app's Tailwind
 * breakpoints — the Bottom-Tab-Bar slides in at exactly 767 px because the
 * real code does that, not because it was edited in. On top of that:
 * a real in-page scroll, two real cursor taps (tab bar → letter) causing real
 * navigations, a real prefers-color-scheme flip via CDP emulation, and a
 * reverse reflow back to a dark desktop two-pane. Frost transitions are real
 * CSS backdrop-filter — the "Liquid Glass" name embodied by the edit itself.
 *
 * Prerequisites: dev server running on :3000 (systemd unit). Read-only —
 * no build, no restart, seeded Anna persona, ?reliable=1. No AI key needed.
 *
 *   npx playwright test --config=playwright.lg-reflow.config.ts
 *   npm run demo:render -- --out demo-recording/lg-reflow-live.mp4
 *
 * The spec writes demo-recording/clicks.json (tap + breakpoint-crossing
 * timestamps) so demo:render can lay click SFX under the real interactions.
 */
import { test, type Page, type Frame } from '@playwright/test';
import { writeFileSync } from 'node:fs';

const APP = 'http://localhost:3000';
const NS = 'govtech-de:v1:';
const ACTIVE_PERSONA = 'anna-petrov';
const STAGE_PATH = '/__lg_stage__';

/* ------------------------------------------------------------------ */
/* Real app typography for the overlays: extract the Inter / Inter Tight
 * @font-face blocks from the app's own CSS chunk so titles + captions use
 * the product's typefaces, not a system fallback. Graceful '' on failure. */
async function appFontCss(): Promise<string> {
  try {
    const html = await (await fetch(`${APP}/dashboard?reliable=1`)).text();
    const hrefs = [...html.matchAll(/<link[^>]+rel="stylesheet"[^>]+href="([^"]+)"/g)].map(
      (m) => m[1],
    );
    let out = '';
    for (const href of hrefs) {
      const css = await (await fetch(`${APP}${href}`)).text();
      for (const m of css.matchAll(/@font-face\s*\{[^}]*\}/g)) {
        if (!/Inter/.test(m[0])) continue;
        out += m[0].replace(/url\("\.\.\//g, 'url("/_next/static/') + '\n';
      }
    }
    return out;
  } catch {
    return '';
  }
}

/* ------------------------------------------------------------------ */
const STAGE_HTML = (fontCss: string) => `<!doctype html><html><head><meta charset="utf-8"><style>
${fontCss}
*{margin:0;box-sizing:border-box}
html,body{height:100%;overflow:hidden;font-family:Inter,system-ui,-apple-system,"Segoe UI",sans-serif;
  background:radial-gradient(120% 90% at 18% 0%,#122B20 0%,#0A1712 46%,#050C09 100%)}
#wrap{position:absolute;inset:0;display:flex;align-items:center;justify-content:center}
#device{width:1920px;height:1080px;border-radius:0;overflow:hidden;position:relative;flex:none;
  outline:3px solid rgba(43,212,137,0);box-shadow:0 46px 120px rgba(0,0,0,.55);transition:box-shadow .7s ease}
#device.phone{box-shadow:0 0 0 10px #0D1117,0 0 0 11.5px rgba(255,255,255,.17),0 46px 110px rgba(0,0,0,.55)}
#app{width:100%;height:100%;border:0;display:block;background:#fff}
/* live width HUD */
#hud{position:absolute;top:26px;left:50%;transform:translateX(-50%);z-index:40;
  display:flex;flex-direction:column;align-items:center;gap:10px;opacity:0;pointer-events:none}
.hud-pill{display:flex;align-items:baseline;gap:12px;padding:10px 20px;border-radius:999px;
  background:rgba(8,18,13,.64);border:1px solid rgba(255,255,255,.15);
  backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);
  box-shadow:0 10px 30px rgba(0,0,0,.35);transition:border-color .4s ease,box-shadow .4s ease}
#hud.crossed .hud-pill{border-color:rgba(43,212,137,.75);
  box-shadow:0 0 0 1px rgba(43,212,137,.45),0 10px 30px rgba(0,0,0,.35)}
.hud-k{font-size:11px;font-weight:700;letter-spacing:.15em;color:#9FE0C7}
.hud-v{font-size:21px;font-weight:700;color:#fff;font-variant-numeric:tabular-nums;min-width:100px;text-align:right}
.hud-chip{display:flex;align-items:center;gap:8px;padding:7px 15px;border-radius:999px;
  background:rgba(16,61,40,.8);border:1px solid rgba(43,212,137,.55);
  backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);
  color:#DFF5E9;font-size:13px;font-weight:600;opacity:0}
.hud-chip i{width:7px;height:7px;border-radius:99px;background:#2BD489}
/* caption — dark liquid-glass card, works over light app and dark stage */
#cap{position:absolute;left:46px;bottom:44px;z-index:40;max-width:680px;padding:15px 22px 17px;
  border-radius:12px;background:rgba(7,16,12,.6);border:1px solid rgba(255,255,255,.13);
  backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);
  box-shadow:0 14px 40px rgba(0,0,0,.38);opacity:0}
#cap .k{margin:0 0 4px;font-size:12px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:#8FE2BC}
#cap .t{margin:0;font-size:20px;line-height:1.38;font-weight:500;color:#F4FAF6}
/* frost sheet — boot veil, opening title, dark end card. REAL backdrop blur. */
#frost{position:absolute;inset:0;z-index:60;display:flex;align-items:center;justify-content:center;
  background:#0A1611;backdrop-filter:blur(26px);-webkit-backdrop-filter:blur(26px)}
#frost .inner{width:100%;max-width:1250px;padding:0 90px;text-align:left}
#boot{display:flex;align-items:center;justify-content:center;gap:12px;
  font-size:21px;font-weight:700;color:#DCEDE4;letter-spacing:.01em}
#boot i,#title .brand i,#endcard .brand i{width:16px;height:16px;border-radius:4px;flex:none;
  background:linear-gradient(135deg,#1FA864,#0F3D2E);display:inline-block}
#title,#endcard{display:none}
#title .brand{display:flex;align-items:center;gap:11px;margin:0 0 28px;font-size:19px;font-weight:700;color:#123128}
#title .k{margin:0 0 16px;font-size:15px;font-weight:700;letter-spacing:.17em;text-transform:uppercase;color:#0F6B40}
#title .h{margin:0 0 22px;font-size:78px;line-height:1.05;font-weight:800;letter-spacing:-.022em;
  color:#0E241B;white-space:pre-line;font-family:"Inter Tight",Inter,system-ui,sans-serif}
#title .s{margin:0;font-size:25px;line-height:1.46;color:#2C4F41;max-width:860px}
#endcard .brand{display:flex;align-items:center;gap:11px;margin:0 0 26px;font-size:19px;font-weight:700;color:#fff}
#endcard .h{margin:0 0 20px;font-size:72px;line-height:1.07;font-weight:800;letter-spacing:-.02em;
  color:#fff;white-space:pre-line;font-family:"Inter Tight",Inter,system-ui,sans-serif}
#endcard .s{margin:0;font-size:26px;line-height:1.4;color:#B9E4CD;font-weight:600}
#endcard .n{margin:24px 0 0;padding-top:17px;border-top:1px solid rgba(255,255,255,.22);
  font-size:16px;color:#AFC4B9;max-width:760px}
/* fake touch cursor */
#cursor{position:absolute;left:0;top:0;z-index:80;opacity:0;pointer-events:none}
#cursor .dot{width:26px;height:26px;margin:-13px 0 0 -13px;border-radius:99px;
  background:rgba(255,255,255,.95);border:2px solid rgba(10,20,15,.4);
  box-shadow:0 4px 16px rgba(0,0,0,.45)}
.ripple{position:absolute;left:0;top:0;width:26px;height:26px;margin:-13px 0 0 -13px;
  border-radius:99px;border:2.5px solid #2BD489;pointer-events:none}
</style></head><body>
<div id="wrap"><div id="device"><iframe id="app" src="${APP}/dashboard?reliable=1"></iframe></div></div>
<div id="hud"><div class="hud-pill"><span class="hud-k">FENSTERBREITE</span><span class="hud-v">1920 px</span></div>
  <div class="hud-chip"><i></i><span></span></div></div>
<div id="cap"><p class="k"></p><p class="t"></p></div>
<div id="frost"><div class="inner">
  <div id="boot"><i></i>GovTech DE</div>
  <div id="title">
    <p class="brand"><i></i>GovTech DE</p>
    <p class="k">WAS IST NEU</p>
    <p class="h">Ein Interface.\nJede Breite.</p>
    <p class="s">Liquid Glass und die neue Mobil-Bedienung — in einer einzigen, ungeschnittenen Einstellung, live aus der laufenden Anwendung.</p>
  </div>
  <div id="endcard">
    <p class="brand"><i></i>GovTech DE</p>
    <p class="h">Verwaltung,\ndie für Sie arbeitet.</p>
    <p class="s">govtech-de.vercel.app</p>
    <p class="n">Speculative-Design-Prototyp · Alle Daten erfunden · Keine echte Behörde angebunden.</p>
  </div>
</div></div>
<div id="cursor"><div class="dot"></div></div>
<script>
const $ = (id) => document.getElementById(id);
const GLIDE = 'cubic-bezier(.4,0,.2,1)';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const device = $('device'), frost = $('frost'), hud = $('hud'), cap = $('cap'), cursor = $('cursor');
const hudV = hud.querySelector('.hud-v'), chip = hud.querySelector('.hud-chip');

/* ---- live width watcher: HUD readout + breakpoint events ---- */
let crossDown = false, crossUp = false;
function flashDevice(){
  device.animate(
    [{outlineColor:'rgba(43,212,137,0)'},{outlineColor:'rgba(43,212,137,.65)'},{outlineColor:'rgba(43,212,137,0)'}],
    {duration:900,easing:'ease'});
}
function markCross(text){
  hud.classList.add('crossed');
  chip.querySelector('span').textContent = text;
  chip.animate([{opacity:0,transform:'translateY(-6px)'},{opacity:1,transform:'translateY(0)'}],
    {duration:380,easing:GLIDE,fill:'both'});
  flashDevice();
  setTimeout(()=>{ hud.classList.remove('crossed');
    chip.animate([{opacity:1},{opacity:0}],{duration:420,easing:'ease',fill:'both'}); }, 2600);
}
(function tick(){
  const w = device.getBoundingClientRect().width;
  hudV.textContent = Math.round(w) + ' px';
  if (!crossDown && w < 768) { crossDown = true; window.__crossDownEpoch = Date.now(); markCross('mobile Ansicht aktiv'); }
  if (crossDown && !crossUp && w >= 768 && Date.now() - (window.__crossDownEpoch||0) > 5000) {
    crossUp = true; window.__crossUpEpoch = Date.now(); markCross('Desktop-Ansicht aktiv');
  }
  requestAnimationFrame(tick);
})();

/* ---- stage API driven by the Playwright spec ---- */
let capVisible = false, curX = 0, curY = 0;
window.stage = {
  /* boot veil (solid) -> light frost + opening title */
  async openTitle(){
    $('boot').animate([{opacity:1},{opacity:0}],{duration:350,easing:'ease',fill:'both'});
    await wait(320);
    $('boot').style.display='none';
    frost.animate([{background:'#0A1611'},{background:'rgba(234,244,238,.6)'}],
      {duration:1300,easing:GLIDE,fill:'both'});
    const t = $('title'); t.style.display='block';
    let d = 260;
    for (const el of t.children){
      el.animate([{opacity:0,transform:'translateY(26px)'},{opacity:1,transform:'translateY(0)'}],
        {duration:720,easing:GLIDE,fill:'both',delay:d});
      d += 150;
    }
  },
  /* the glass de-frosts: blur + tint melt away, title exits up */
  async defrost(){
    const t = $('title');
    let d = 0;
    for (const el of t.children){
      el.animate([{opacity:1,transform:'translateY(0)'},{opacity:0,transform:'translateY(-24px)'}],
        {duration:520,easing:GLIDE,fill:'both',delay:d});
      d += 90;
    }
    await wait(420);
    frost.animate(
      [{background:'rgba(234,244,238,.6)',backdropFilter:'blur(26px)'},
       {background:'rgba(234,244,238,0)',backdropFilter:'blur(0px)'}],
      {duration:1500,easing:GLIDE,fill:'both'});
    await wait(1500);
    frost.style.display='none';
  },
  async caption(k, txt){
    if (capVisible){
      cap.animate([{opacity:1,transform:'translateY(0)'},{opacity:0,transform:'translateY(10px)'}],
        {duration:280,easing:'ease',fill:'both'});
      await wait(290);
    }
    cap.querySelector('.k').textContent = k;
    cap.querySelector('.t').textContent = txt;
    cap.animate([{opacity:0,transform:'translateY(14px)'},{opacity:1,transform:'translateY(0)'}],
      {duration:460,easing:GLIDE,fill:'both'});
    capVisible = true;
  },
  async captionHide(){
    if (!capVisible) return;
    cap.animate([{opacity:1},{opacity:0}],{duration:340,easing:'ease',fill:'both'});
    capVisible = false; await wait(340);
  },
  hud(show){
    hud.animate([{opacity:show?0:1},{opacity:show?1:0}],{duration:450,easing:'ease',fill:'both'});
  },
  /* THE core move: animate the iframe canvas — the embedded document's
     viewport follows, so the app genuinely reflows every frame. tx drifts
     the canvas right-of-center as it narrows so the caption zone at the
     bottom-left never occludes the incoming Bottom-Tab-Bar. */
  morph(w, h, r, ms, ease, phone, tx){
    return new Promise((res) => {
      const b = device.getBoundingClientRect();
      const fromTx = window.__tx || 0, toTx = tx || 0;
      device.classList.toggle('phone', !!phone);
      const a = device.animate(
        [{width:b.width+'px',height:b.height+'px',borderRadius:getComputedStyle(device).borderRadius,
          transform:'translateX('+fromTx+'px)'},
         {width:w+'px',height:h+'px',borderRadius:r+'px',transform:'translateX('+toTx+'px)'}],
        {duration:ms,easing:ease||GLIDE,fill:'forwards'});
      a.onfinish = () => {
        device.style.width=w+'px'; device.style.height=h+'px'; device.style.borderRadius=r+'px';
        device.style.transform='translateX('+toTx+'px)'; window.__tx=toTx;
        a.cancel(); res();
      };
    });
  },
  cursorShow(x,y){ curX=x; curY=y;
    cursor.style.transform='translate('+x+'px,'+y+'px)';
    cursor.animate([{opacity:0},{opacity:1}],{duration:350,easing:'ease',fill:'both'});
  },
  cursorMove(x,y,ms){
    return new Promise((res)=>{
      const a = cursor.animate(
        [{transform:'translate('+curX+'px,'+curY+'px)'},{transform:'translate('+x+'px,'+y+'px)'}],
        {duration:ms,easing:'cubic-bezier(.35,0,.25,1)',fill:'forwards'});
      a.onfinish=()=>{ cursor.style.transform='translate('+x+'px,'+y+'px)'; a.cancel(); curX=x; curY=y; res(); };
    });
  },
  async cursorPress(){
    cursor.querySelector('.dot').animate(
      [{transform:'scale(1)'},{transform:'scale(.78)'},{transform:'scale(1)'}],
      {duration:260,easing:'ease'});
    const rip = document.createElement('span'); rip.className='ripple';
    cursor.appendChild(rip);
    rip.animate([{transform:'scale(.5)',opacity:.9},{transform:'scale(2.6)',opacity:0}],
      {duration:650,easing:'ease-out',fill:'both'});
    setTimeout(()=>rip.remove(), 700);
    await wait(180);
  },
  cursorHide(){ cursor.animate([{opacity:1},{opacity:0}],{duration:300,easing:'ease',fill:'both'}); },
  /* quick frost pulse masking the prefers-color-scheme flip */
  async frostPulse(ms){
    const el = frost; el.style.display='flex';
    $('title').style.display='none'; $('endcard').style.display='none';
    el.animate(
      [{background:'rgba(210,235,222,0)',backdropFilter:'blur(0px)'},
       {background:'rgba(210,235,222,.22)',backdropFilter:'blur(12px)',offset:.5},
       {background:'rgba(210,235,222,0)',backdropFilter:'blur(0px)'}],
      {duration:ms,easing:'ease-in-out',fill:'both'});
    await wait(ms);
    el.style.display='none';
  },
  /* dark liquid-glass end card frosting over the live dark desktop */
  async endCard(){
    frost.style.display='flex';
    frost.animate(
      [{background:'rgba(5,12,9,0)',backdropFilter:'blur(0px)'},
       {background:'rgba(5,12,9,.74)',backdropFilter:'blur(24px)'}],
      {duration:1400,easing:GLIDE,fill:'both'});
    const e = $('endcard'); e.style.display='block';
    let d = 500;
    for (const el of e.children){
      el.animate([{opacity:0,transform:'translateY(24px)'},{opacity:1,transform:'translateY(0)'}],
        {duration:700,easing:GLIDE,fill:'both',delay:d});
      d += 160;
    }
    await wait(1900);
  },
  async fadeOut(){
    frost.animate([{background:'rgba(5,12,9,.74)'},{background:'rgba(4,9,6,1)'}],
      {duration:1100,easing:'ease',fill:'both'});
    $('endcard').animate([{opacity:1},{opacity:0}],{duration:900,easing:'ease',fill:'both'});
    await wait(1100);
  },
};
</script></body></html>`;

/* ------------------------------------------------------------------ */
async function appFrame(page: Page): Promise<Frame> {
  for (let i = 0; i < 120; i++) {
    const fr = page
      .frames()
      .find(
        (f) =>
          f !== page.mainFrame() &&
          f.url().includes('localhost:3000') &&
          !f.url().includes(STAGE_PATH),
      );
    if (fr) return fr;
    await page.waitForTimeout(250);
  }
  throw new Error('app iframe never appeared');
}

/** Cinematic in-app scroll — real page scroll inside the live iframe. */
const smoothScroll = ({ to, ms }: { to: number; ms: number }) =>
  new Promise<void>((res) => {
    const from = window.scrollY;
    const t0 = performance.now();
    const ease = (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
    const step = (now: number) => {
      const p = Math.min(1, (now - t0) / ms);
      window.scrollTo(0, from + (to - from) * ease(p));
      if (p < 1) requestAnimationFrame(step);
      else res();
    };
    requestAnimationFrame(step);
  });

test('Live-Reflow teaser (one continuous shot)', async ({ page }) => {
  test.setTimeout(300_000);
  const t0 = Date.now();
  const clicks: number[] = [];

  /* -- pre-flight: the LIVE dev server must already be on :3000 -------- */
  const up = await fetch(`${APP}/dashboard?reliable=1`).then((r) => r.ok).catch(() => false);
  if (!up) throw new Error('dev server on :3000 is not reachable — this take films the LIVE app (systemctl status govtech-dev.service)');
  // warm the routes the take navigates through (Turbopack cold compiles)
  await Promise.all(
    ['/dashboard?reliable=1', '/posteingang?reliable=1', '/posteingang/warmup?reliable=1'].map(
      (p) => fetch(`${APP}${p}`).catch(() => {}),
    ),
  );
  const fontCss = await appFontCss();

  /* -- deterministic Anna persona + frame hygiene (runs in ALL frames) -- */
  await page.context().addCookies([
    { name: `${NS}locale`, value: 'de', domain: 'localhost', path: '/' },
  ]);
  await page.addInitScript(
    ([ns, id]) => {
      try {
        const sentinel = `${ns}__lg_reflow_seeded`;
        if (!window.localStorage.getItem(sentinel)) {
          window.localStorage.setItem(sentinel, '1');
          window.localStorage.setItem(
            `${ns}meta`,
            JSON.stringify({
              version: 1,
              active_persona_id: id,
              seeded_at: new Date().toISOString(),
              reliable_mode: true,
            }),
          );
          for (const key of [
            'profile', 'letters', 'vorgaenge', 'documents', 'termine',
            'orchestration:sagas', 'orchestration:outbox', 'orchestration:audit-log',
            'orchestration:dlq', 'orchestration:breakers',
          ]) {
            window.localStorage.removeItem(`${ns}${key}`);
          }
        }
      } catch { /* non-browser env */ }
      try {
        document.addEventListener('DOMContentLoaded', () => {
          const s = document.createElement('style');
          s.textContent =
            '::-webkit-scrollbar{width:0!important;height:0!important}' +
            '*{scrollbar-width:none!important;caret-color:transparent!important}';
          document.head.appendChild(s);
        });
      } catch { /* guarded per demo-record runbook */ }
    },
    [NS, ACTIVE_PERSONA],
  );

  /* -- same-origin stage via route interception (never hits the server) - */
  await page.route(`**${STAGE_PATH}`, (r) =>
    r.fulfill({ contentType: 'text/html', body: STAGE_HTML(fontCss) }),
  );
  await page.goto(`${APP}${STAGE_PATH}`, { waitUntil: 'domcontentloaded' });

  // Boot happens behind the solid brand veil: wait for the live app + fonts.
  const fr = await appFrame(page);
  await fr.locator('main').first().waitFor({ state: 'visible', timeout: 60_000 });
  await fr.getByRole('heading', { level: 1 }).first().waitFor({ timeout: 30_000 }).catch(() => {});
  await page.evaluate(async () => {
    try {
      await Promise.all([
        document.fonts.load('800 78px "Inter Tight"'),
        document.fonts.load('700 21px Inter'),
        document.fonts.load('600 20px Inter'),
        document.fonts.load('500 20px Inter'),
      ]);
    } catch { /* fallback stack is fine */ }
  });
  await page.waitForTimeout(800); // hydration + glass ambient settle

  /* ================== BEAT 1 — frost title (de-frost open) ============ */
  await page.evaluate(() => window.stage.openTitle());
  await page.waitForTimeout(4300);
  await page.evaluate(() => window.stage.defrost());
  await page.waitForTimeout(500);

  /* ================== BEAT 2 — live dashboard scroll =================== */
  await page.evaluate(() =>
    window.stage.caption('LIQUID GLASS', 'Das neue Erscheinungsbild — ruhige Glasflächen, klare Typografie. Live aus der laufenden Anwendung.'),
  );
  await page.waitForTimeout(1000);
  await fr.evaluate(smoothScroll, { to: 660, ms: 2400 });
  await page.waitForTimeout(1000);
  await fr.evaluate(smoothScroll, { to: 0, ms: 1500 });
  await page.waitForTimeout(400);

  /* ================== BEAT 3 — reflow setup ============================ */
  await page.evaluate(() =>
    window.stage.caption('LIVE REFLOW', 'Wir verkleinern jetzt die Fensterbreite. Alles Weitere macht die Oberfläche selbst.'),
  );
  await page.evaluate(() => window.stage.hud(true));
  await page.waitForTimeout(1900);

  /* ================== BEAT 4 — the reflow, desktop → phone ============ */
  // Leg A: full-bleed detaches into a floating canvas (still desktop layout)
  const legA = page.evaluate(() => window.stage.morph(1360, 900, 18, 3200, 'cubic-bezier(.5,0,.15,1)'));
  await page.waitForTimeout(2100);
  await page.evaluate(() =>
    window.stage.caption('LIVE REFLOW', 'Navigation, Karten, Spalten — jede Breite ordnet sich neu.'),
  );
  await legA;
  // Leg B: decelerate toward the breakpoint, drifting right-of-center
  await page.evaluate(() => window.stage.morph(800, 880, 22, 3400, 'cubic-bezier(.4,0,.3,1)', false, 160));
  // Leg C: cross 767 px SLOWLY — the Bottom-Tab-Bar slides in mid-leg
  const legC = page.evaluate(() => window.stage.morph(720, 870, 24, 2400, 'linear', false, 175));
  await page.waitForTimeout(1400);
  await page.evaluate(() =>
    window.stage.caption('767 PIXEL', 'Hier wechselt die Oberfläche in die mobile Ansicht — die Tab-Bar erscheint von selbst.'),
  );
  await legC;
  await page.waitForTimeout(1200);
  // Leg D: settle into the phone
  const legD = page.evaluate(() => window.stage.morph(390, 844, 34, 2600, 'cubic-bezier(.3,0,.2,1)', true, 245));
  await page.waitForTimeout(1200);
  await page.evaluate(() =>
    window.stage.caption('SMARTPHONE', 'Dieselbe Anwendung, keine zwei Welten — die fünf wichtigsten Bereiche in Daumenreichweite.'),
  );
  await legD;
  await page.waitForTimeout(1400);
  await page.evaluate(() => window.stage.hud(false));

  /* ================== BEAT 5 — real tap #1: Bottom-Tab-Bar ============ */
  const tab = fr.locator('nav.mobile-tabbar a[href="/posteingang"]');
  const tabBox = await tab.boundingBox();
  if (!tabBox) throw new Error('Bottom-Tab-Bar Posteingang tab not visible at 390px');
  await page.evaluate(
    ([x, y]) => window.stage.cursorShow(x, y),
    [tabBox.x - 170, tabBox.y - 190] as const,
  );
  await page.waitForTimeout(350);
  await page.evaluate(
    ([x, y, ms]) => window.stage.cursorMove(x, y, ms),
    [tabBox.x + tabBox.width / 2, tabBox.y + tabBox.height / 2 - 3, 900] as const,
  );
  await page.evaluate(() => window.stage.cursorPress());
  clicks.push(Date.now() - t0);
  await tab.click();
  await page.evaluate(() =>
    window.stage.caption('ECHTE BEDIENUNG', 'Ein Tipp öffnet den Posteingang — echte Navigation, kein Videoschnitt.'),
  );
  await fr.locator('a.post-item').first().waitFor({ state: 'visible', timeout: 30_000 });
  await page.waitForTimeout(2100);

  /* ================== BEAT 6 — real tap #2: open a letter ============= */
  const letter = fr.locator('a.post-item').first();
  const letterBox = await letter.boundingBox();
  if (!letterBox) throw new Error('first letter card not visible');
  await page.evaluate(
    ([x, y, ms]) => window.stage.cursorMove(x, y, ms),
    [letterBox.x + letterBox.width / 2, letterBox.y + letterBox.height / 2, 800] as const,
  );
  await page.evaluate(() => window.stage.cursorPress());
  clicks.push(Date.now() - t0);
  await letter.click();
  await page.waitForTimeout(500);
  await page.evaluate(() => window.stage.cursorHide()); // out of the way while the detail loads
  // wait for real detail content (skip the loading skeleton) before captioning
  await fr
    .getByText('Behördenkonto verifiziert')
    .first()
    .waitFor({ state: 'visible', timeout: 30_000 })
    .catch(() => {});
  await page.waitForTimeout(400);
  await page.evaluate(() =>
    window.stage.caption('POSTEINGANG', 'Ein Brief vom Amt — mit Frist, Anhängen und verständlicher Erklärung.'),
  );
  await page.waitForTimeout(2300);

  /* ================== BEAT 7 — real dark-mode flip ===================== */
  await page.evaluate(() =>
    window.stage.caption('DUNKELMODUS', 'Folgt Ihrer Systemeinstellung — mit geprüften Kontrasten.'),
  );
  await page.waitForTimeout(800);
  const pulse = page.evaluate(() => window.stage.frostPulse(900));
  await page.waitForTimeout(430);
  await page.emulateMedia({ colorScheme: 'dark' }); // REAL prefers-color-scheme flip
  await pulse;
  await page.waitForTimeout(2400);

  /* ================== BEAT 8 — reverse reflow, phone → dark desktop === */
  await page.evaluate(() => window.stage.hud(true));
  await page.evaluate(() =>
    window.stage.caption('UND ZURÜCK', 'Aus dem Smartphone wird wieder der Desktop — derselbe Brief, jetzt zweispaltig.'),
  );
  await page.waitForTimeout(500);
  await page.evaluate(() => window.stage.morph(1920, 1080, 0, 3800, 'cubic-bezier(.45,0,.2,1)', false));
  await page.waitForTimeout(1000);
  await page.evaluate(() => window.stage.hud(false));
  await page.waitForTimeout(800);

  /* ================== BEAT 9 — dark glass end card ===================== */
  await page.evaluate(() => window.stage.captionHide());
  await page.evaluate(() => window.stage.endCard());
  await page.waitForTimeout(4200);
  await page.evaluate(() => window.stage.fadeOut());
  await page.waitForTimeout(600);

  /* -- click SFX timeline for demo:render ------------------------------ */
  const cross = await page.evaluate(() => ({
    down: (window as unknown as { __crossDownEpoch?: number }).__crossDownEpoch ?? 0,
    up: (window as unknown as { __crossUpEpoch?: number }).__crossUpEpoch ?? 0,
  }));
  if (cross.down) clicks.push(cross.down - t0);
  if (cross.up) clicks.push(cross.up - t0);
  clicks.sort((a, b) => a - b);
  writeFileSync(
    'demo-recording/clicks.json',
    JSON.stringify({ generated_at: new Date().toISOString(), source: 'lg-reflow-teaser', clicks_ms: clicks }, null, 2),
  );
});

/* Stage API typing for the evaluate() calls above. */
declare global {
  interface Window {
    stage: {
      openTitle(): Promise<void>;
      defrost(): Promise<void>;
      caption(k: string, t: string): Promise<void>;
      captionHide(): Promise<void>;
      hud(show: boolean): void;
      morph(w: number, h: number, r: number, ms: number, ease?: string, phone?: boolean, tx?: number): Promise<void>;
      cursorShow(x: number, y: number): void;
      cursorMove(x: number, y: number, ms: number): Promise<void>;
      cursorPress(): Promise<void>;
      cursorHide(): void;
      frostPulse(ms: number): Promise<void>;
      endCard(): Promise<void>;
      fadeOut(): Promise<void>;
    };
  }
}
