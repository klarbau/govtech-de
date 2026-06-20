/**
 * CRISP-MOTION TEASER — the "screens actually move" cut, with PERFECT text.
 *
 * The honest alternative to feeding our UI into a generative i2v model (which
 * warps dense German legal text): here the real reference stills
 * (demo-recording/refs/*.png) are TRANSFORMED by the browser compositor —
 * translated, scaled, parallaxed, 3D-tilted — never regenerated. So screens
 * slide in, dolly, push and pull like a produced motion-design piece, and every
 * pixel of text stays razor-sharp. Captions/titles are real HTML (crisp too).
 *
 *   npx playwright test --config=playwright.motion.config.ts
 *   # → newest .webm under demo-recording/.motion-output/  → convert to mp4 (footer)
 *
 * No app server needed: a self-contained HTML stage is built from the stills
 * embedded as data URIs and animated with the Web Animations API. AI is added
 * later (German voiceover + optional abstract B-roll), never on the text screens.
 */
import { test, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const REFS = 'demo-recording/refs';
const uri = (file: string): string =>
  `data:image/png;base64,${readFileSync(join(REFS, file)).toString('base64')}`;

type Scene = {
  img: string;
  mode: 'bleed' | 'card' | 'dark';
  enter: 'right' | 'up' | 'bottom' | 'tilt' | 'pop' | 'none';
  move: 'push' | 'pushStrong' | 'pull' | 'panDown' | 'kenburns' | 'holdpop';
  dur: number; // seconds
  kicker: string;
  text: string;
  title?: { kicker: string; head: string; sub?: string; note?: string };
};

// Refocused on what REALLY updated for the citizen (review): Bedienhilfen,
// geprüfte Dokumente (Klick aufs Auge), leichtere Antworten, neue Übersichten.
// No Umzug-as-hero (pre-existing), no audit-log / FIT-Connect / code / keys.
const SCENES: Scene[] = [
  { img: '00-dashboard.png',            mode: 'bleed', enter: 'none', move: 'push',     dur: 4.5,
    kicker: '', text: '',
    title: { kicker: 'WAS IST NEU', head: 'Für alle\nzugänglich.', sub: 'Neue Bedienhilfen, geprüfte Dokumente und leichtere Antworten.' } },
  { img: '20-a11y-panel@el.png',        mode: 'card',  enter: 'right', move: 'push',    dur: 4.4,
    kicker: 'BEDIENHILFEN', text: 'Schrift, Vorlesen, Kontrast — direkt eingebaut.' },
  { img: '21-a11y-effect.png',          mode: 'bleed', enter: 'none', move: 'panDown',  dur: 4.6,
    kicker: 'FÜR ALLE LESBAR', text: 'Größer und kontrastreich, auf einen Klick.' },
  { img: '25-dokumente-list.png',       mode: 'bleed', enter: 'none', move: 'push',     dur: 4.0,
    kicker: 'DOKUMENTE', text: 'Ihr Nachweis-Tresor — alles an einem Ort.' },
  { img: '09-once-only.png',            mode: 'bleed', enter: 'none', move: 'pushStrong', dur: 4.6,
    kicker: 'GEPRÜFT', text: 'Ein Klick — die Echtheit wird automatisch bestätigt.' },
  { img: '22-posteingang-reply@el.png', mode: 'card',  enter: 'up',   move: 'push',     dur: 4.4,
    kicker: 'ANTWORTEN', text: 'Mit KI-Hilfe formuliert — in Ihren Worten.' },
  { img: '23-termine.png',              mode: 'bleed', enter: 'none', move: 'panDown',  dur: 4.0,
    kicker: 'TERMINE', text: 'Nach Fristen sortiert — nichts mehr verpassen.' },
  { img: '24-dashboard-katalog.png',    mode: 'bleed', enter: 'none', move: 'pull',     dur: 4.2,
    kicker: 'ÜBERSICHT', text: 'Was automatisch für Sie erledigt wird.' },
  { img: '00-dashboard.png',            mode: 'bleed', enter: 'none', move: 'pull',     dur: 5.0,
    kicker: '', text: '',
    title: { kicker: 'GOVTECH DE', head: 'Verwaltung,\ndie für Sie arbeitet.', sub: 'govtech-de.vercel.app', note: 'Speculative-Design-Prototyp · alle Daten erfunden · keine echte Behörde angebunden.' } },
];

const PAGE_HTML = (scenesJson: string) => `<!doctype html><html><head><meta charset="utf-8"><style>
  *{margin:0;box-sizing:border-box}
  html,body{height:100%;background:#05070d;overflow:hidden;font-family:Inter,system-ui,-apple-system,"Segoe UI",sans-serif}
  #stage{position:absolute;inset:0;overflow:hidden;background:#F8FAFC;perspective:1700px}
  .layer{position:absolute;inset:0;opacity:0;display:flex;align-items:center;justify-content:center;overflow:hidden}
  .layer.card{background:radial-gradient(120% 120% at 50% 28%,#FFFFFF 0%,#EEF2F9 55%,#E2E8F4 100%)}
  .layer.dark{background:#060A14}
  .holder{display:flex;align-items:center;justify-content:center;transform-style:preserve-3d;will-change:transform}
  .layer.bleed .holder,.layer.dark .holder{position:absolute;inset:0}
  .screen{will-change:transform}
  .layer.bleed .screen,.layer.dark .screen{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
  .layer.card .screen{max-height:80%;max-width:82%;width:auto;border-radius:16px;background:#fff;
    box-shadow:0 50px 110px rgba(8,15,40,.30),0 8px 26px rgba(8,15,40,.18)}
  .scrim{position:absolute;inset:0;background:linear-gradient(180deg,rgba(8,12,24,.30),rgba(8,12,24,.55))}
  .caption{position:absolute;left:46px;bottom:46px;max-width:760px;background:#fff;border-left:4px solid #2563EB;
    border-radius:10px;box-shadow:0 10px 34px rgba(15,23,42,.18);padding:14px 22px 16px;opacity:0;transform:translateY(16px)}
  .caption .k{margin:0 0 3px;font-size:13px;font-weight:700;letter-spacing:.13em;text-transform:uppercase;color:#2563EB}
  .caption .t{margin:0;font-size:21px;line-height:1.32;font-weight:600;color:#0F172A}
  .big{position:relative;z-index:2;max-width:1180px;padding:0 80px;text-align:left}
  .big .brand{display:flex;align-items:center;gap:11px;margin:0 0 26px;font-size:19px;font-weight:700;color:#fff}
  .big .brand i{width:15px;height:15px;border-radius:4px;background:#2563EB;display:inline-block}
  .big .k{margin:0 0 16px;font-size:15px;font-weight:700;letter-spacing:.16em;text-transform:uppercase;color:#93C5FD}
  .big .h{margin:0 0 22px;font-size:74px;line-height:1.06;font-weight:800;letter-spacing:-.02em;color:#fff;white-space:pre-line}
  .big .s{margin:0;font-size:25px;line-height:1.45;color:#E2E8F0;max-width:820px}
  .big .n{margin:22px 0 0;padding-top:16px;border-top:1px solid rgba(255,255,255,.22);font-size:16px;color:#CBD5E1}
</style></head><body><div id="stage"></div><script>
const SCENES = ${scenesJson};
const stage = document.getElementById('stage');
const GLIDE = 'cubic-bezier(.4,0,.2,1)', PUNCH = 'cubic-bezier(.16,.84,.30,1)';
const ENTER = {
  right:  { f:[{transform:'translateX(72px) scale(.985)'},{transform:'translateX(0) scale(1)'}], e:PUNCH },
  up:     { f:[{transform:'translateY(64px) scale(.985)'},{transform:'translateY(0) scale(1)'}], e:PUNCH },
  bottom: { f:[{transform:'translateY(96px)'},{transform:'translateY(0)'}], e:PUNCH },
  tilt:   { f:[{transform:'rotateY(10deg) translateX(70px) scale(.985)'},{transform:'rotateY(0) translateX(0) scale(1)'}], e:GLIDE },
  pop:    { f:[{transform:'scale(.86)'},{transform:'scale(1)'}], e:PUNCH },
  none:   { f:[{transform:'scale(1)'},{transform:'scale(1)'}], e:GLIDE },
};
const MOVE = {
  push:       { f:[{transform:'scale(1)'},{transform:'scale(1.11)'}], e:GLIDE },
  pushStrong: { f:[{transform:'scale(1.02)'},{transform:'scale(1.32)'}], e:GLIDE },
  pull:       { f:[{transform:'scale(1.12)'},{transform:'scale(1.0)'}], e:GLIDE },
  panDown:    { f:[{transform:'scale(1.1) translateY(0)'},{transform:'scale(1.1) translateY(-5%)'}], e:GLIDE },
  kenburns:   { f:[{transform:'scale(1.0) translate(0,0)'},{transform:'scale(1.07) translate(-1.2%,-1%)'}], e:'linear' },
  holdpop:    { f:[{transform:'scale(1)'},{transform:'scale(1.05)'}], e:GLIDE },
};
const wait = (ms)=>new Promise(r=>setTimeout(r,ms));
function buildLayer(sc){
  const layer=document.createElement('div'); layer.className='layer '+sc.mode;
  const holder=document.createElement('div'); holder.className='holder';
  const img=document.createElement('img'); img.className='screen'; img.src=sc.img;
  holder.appendChild(img); layer.appendChild(holder);
  if((sc.mode==='bleed'||sc.mode==='dark') && sc.title){ const sc2=document.createElement('div'); sc2.className='scrim'; layer.appendChild(sc2); }
  if(sc.title){
    const b=document.createElement('div'); b.className='big';
    b.innerHTML='<p class="brand"><i></i>GovTech DE</p>'+
      (sc.title.kicker?'<p class="k">'+sc.title.kicker+'</p>':'')+
      '<p class="h">'+sc.title.head+'</p>'+
      (sc.title.sub?'<p class="s">'+sc.title.sub+'</p>':'')+
      (sc.title.note?'<p class="n">'+sc.title.note+'</p>':'');
    layer.appendChild(b);
  }
  if(sc.text){
    const c=document.createElement('div'); c.className='caption';
    c.innerHTML='<p class="k">'+sc.kicker+'</p><p class="t">'+sc.text+'</p>';
    layer.appendChild(c);
  }
  return layer;
}
async function preload(){ await Promise.all(SCENES.map(s=>{const i=new Image();i.src=s.img;return i.decode().catch(()=>{});})); }
async function run(){
  await preload(); await wait(350);
  let prev=null;
  for(const sc of SCENES){
    const layer=buildLayer(sc); stage.appendChild(layer);
    layer.animate([{opacity:0},{opacity:1}],{duration:600,easing:'ease',fill:'both'});
    if(prev){ const p=prev; p.animate([{opacity:1},{opacity:0}],{duration:600,easing:'ease',fill:'both'}); setTimeout(()=>p.remove(),680); }
    const holder=layer.querySelector('.holder'), screen=layer.querySelector('.screen');
    const en=ENTER[sc.enter]; holder.animate(en.f,{duration:820,easing:en.e,fill:'both'});
    const big=layer.querySelector('.big'); if(big) big.animate([{opacity:0,transform:'translateY(22px)'},{opacity:1,transform:'translateY(0)'}],{duration:760,easing:GLIDE,fill:'both',delay:180});
    const cap=layer.querySelector('.caption'); if(cap) cap.animate([{opacity:0,transform:'translateY(16px)'},{opacity:1,transform:'translateY(0)'}],{duration:520,easing:GLIDE,fill:'both',delay:520});
    await wait(540);
    const mv=MOVE[sc.move]; const moveMs=sc.dur*1000-540;
    screen.animate(mv.f,{duration:moveMs,easing:mv.e,fill:'both'});
    await wait(moveMs);
    prev=layer;
  }
  if(prev) prev.animate([{opacity:1},{opacity:0}],{duration:700,easing:'ease',fill:'both'});
  await wait(800);
  window.__teaserDone = true;
}
run();
</script></body></html>`;

test('CRISP-MOTION teaser (update arc)', async ({ page }: { page: Page }) => {
  test.setTimeout(150_000);
  const scenes = SCENES.map((s) => ({ ...s, img: uri(s.img) }));
  await page.setContent(PAGE_HTML(JSON.stringify(scenes)), { waitUntil: 'load' });
  await page.waitForFunction('window.__teaserDone === true', null, { timeout: 120_000 });
  await page.waitForTimeout(400);
});
