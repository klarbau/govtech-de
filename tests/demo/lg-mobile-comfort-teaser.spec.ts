/**
 * LG + MOBILE-COMFORT TEASER — "what's new" motion cut (Liquid-Glass rollout +
 * Mobile-Comfort-Welle), desktop AND mobile views, with PERFECT text.
 *
 * Same compositor approach as motion-teaser.spec.ts (the proven pattern): the
 * real reference stills (demo-recording/refs/3N-d-* desktop, 4N-m-* mobile)
 * are embedded as data URIs into a self-contained HTML stage and TRANSFORMED
 * by the browser compositor — translated, scaled, pushed — never regenerated,
 * so every pixel of German UI text stays razor-sharp. Mobile stills render as
 * floating phone-framed cards (portrait, dark bezel ring); desktop stills as
 * full-bleed scenes. Captions/titles are real HTML.
 *
 *   npx playwright test --config=playwright.lg-teaser.config.ts
 *   npm run demo:render -- --out demo-recording/lg-mobile-comfort-teaser.mp4
 *
 * No app server needed. Brand accents follow the live design system
 * (Waldgrün #0F3D2E / #1FA864 — NOT the legacy cobalt).
 */
import { test, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const REFS = 'demo-recording/refs';
const uri = (file: string): string =>
  `data:image/png;base64,${readFileSync(join(REFS, file)).toString('base64')}`;

type Scene = {
  img: string;
  /** second image → two phones side by side (only with phone:true) */
  img2?: string;
  mode: 'bleed' | 'card';
  /** phone bezel treatment for portrait mobile stills */
  phone?: boolean;
  enter: 'right' | 'up' | 'bottom' | 'tilt' | 'pop' | 'none';
  move: 'push' | 'pushStrong' | 'pull' | 'panDown' | 'kenburns' | 'holdpop';
  dur: number; // seconds
  kicker: string;
  text: string;
  title?: { kicker: string; head: string; sub?: string; note?: string };
};

// The arc: new Liquid-Glass look (desktop, light + dark) → the same product
// made comfortable on the phone (Bottom-Tab-Bar, compact headers, pinned
// composer) → both worlds side by side → brand card.
const SCENES: Scene[] = [
  { img: '30-d-dashboard.png',        mode: 'bleed', enter: 'none', move: 'push',       dur: 4.8,
    kicker: '', text: '',
    title: { kicker: 'WAS IST NEU', head: 'Ein neues Gesicht.\nAuf jedem Gerät.', sub: 'Das Liquid-Glass-Design auf allen Seiten — und eine Bedienung, die aufs Smartphone abgestimmt ist.' } },
  { img: '31-d-posteingang.png',      mode: 'bleed', enter: 'none', move: 'panDown',    dur: 4.2,
    kicker: 'LIQUID GLASS', text: 'Ruhige Glasflächen, klare Typografie — durchgängig auf jeder Seite.' },
  { img: '34-d-vorgaenge.png',        mode: 'bleed', enter: 'none', move: 'push',       dur: 4.2,
    kicker: 'VORGÄNGE', text: 'Schwebende Karten, klare Schritte — jeder Stand nachvollziehbar.' },
  { img: '36-d-posteingang-dark.png', mode: 'bleed', enter: 'none', move: 'pushStrong', dur: 4.4,
    kicker: 'DUNKELMODUS', text: 'Derselbe Anspruch bei Nacht — mit geprüften Kontrasten.' },
  { img: '40-m-dashboard.png',        mode: 'card', phone: true, enter: 'up',    move: 'push',    dur: 4.4,
    kicker: 'NEU: FÜRS SMARTPHONE', text: 'Die fünf wichtigsten Bereiche — immer in Daumenreichweite.' },
  { img: '42-m-termine.png',          mode: 'card', phone: true, enter: 'right', move: 'push',    dur: 4.2,
    kicker: 'SCHNELLER AM INHALT', text: 'Kompakte Seitenköpfe: Termine und Fristen sofort im Blick.' },
  { img: '44-m-assistent.png',        mode: 'card', phone: true, enter: 'up',    move: 'push',    dur: 4.2,
    kicker: 'ASSISTENT', text: 'Die Eingabe bleibt beim Schreiben immer griffbereit.' },
  { img: '41-m-posteingang.png',      img2: '45-m-dashboard-dark.png',
    mode: 'card', phone: true, enter: 'pop', move: 'holdpop', dur: 4.6,
    kicker: 'AUF JEDEM GERÄT', text: 'Große Tippflächen, lesbare Schrift — hell wie dunkel.' },
  { img: '30-d-dashboard.png',        mode: 'bleed', enter: 'none', move: 'pull',       dur: 5.2,
    kicker: '', text: '',
    title: { kicker: 'GOVTECH DE', head: 'Verwaltung,\ndie für Sie arbeitet.', sub: 'govtech-de.vercel.app', note: 'Speculative-Design-Prototyp · alle Daten erfunden · keine echte Behörde angebunden.' } },
];

const PAGE_HTML = (scenesJson: string) => `<!doctype html><html><head><meta charset="utf-8"><style>
  *{margin:0;box-sizing:border-box}
  html,body{height:100%;background:#05070d;overflow:hidden;font-family:Inter,system-ui,-apple-system,"Segoe UI",sans-serif}
  #stage{position:absolute;inset:0;overflow:hidden;background:#05070D;perspective:1700px}
  .layer{position:absolute;inset:0;opacity:0;display:flex;align-items:center;justify-content:center;overflow:hidden}
  .layer.card{background:radial-gradient(120% 120% at 50% 26%,#FFFFFF 0%,#EDF4EF 52%,#DCE8E1 100%)}
  /* inset:0 on ALL holders: gives the flex box a definite height so the
     percentage max-heights on portrait phone stills actually resolve. */
  .holder{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;transform-style:preserve-3d;will-change:transform}
  .screen{will-change:transform}
  .layer.bleed .screen{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
  .layer.card .screen{max-height:80%;max-width:82%;width:auto;border-radius:16px;background:#fff;
    box-shadow:0 50px 110px rgba(8,20,15,.30),0 8px 26px rgba(8,20,15,.18)}
  .layer.card .screen.phone{max-height:84%;border-radius:34px;
    box-shadow:0 0 0 9px #0D1117,0 0 0 10.5px rgba(255,255,255,.12),0 46px 90px rgba(8,20,15,.35)}
  .holder.duo{gap:90px}
  .layer.card .holder.duo .screen.phone{max-height:76%}
  /* Left-weighted, layered scrim: the title block is left-aligned, so the text
     zone gets real darkening while the UI stays recognizable on the right. */
  .scrim{position:absolute;inset:0;background:
    linear-gradient(90deg,rgba(5,12,9,.74) 0%,rgba(5,12,9,.54) 48%,rgba(5,12,9,.28) 100%),
    linear-gradient(180deg,rgba(5,12,9,.30),rgba(5,12,9,.52))}
  .caption{position:absolute;left:46px;bottom:46px;max-width:760px;background:#fff;border-left:4px solid #0F3D2E;
    border-radius:10px;box-shadow:0 10px 34px rgba(10,26,19,.18);padding:14px 22px 16px;opacity:0;transform:translateY(16px)}
  .caption .k{margin:0 0 3px;font-size:13px;font-weight:700;letter-spacing:.13em;text-transform:uppercase;color:#0F6B40}
  .caption .t{margin:0;font-size:21px;line-height:1.32;font-weight:600;color:#101613}
  .big{position:relative;z-index:2;max-width:1180px;padding:0 80px;text-align:left;text-shadow:0 1px 22px rgba(3,8,6,.45)}
  .big .brand{display:flex;align-items:center;gap:11px;margin:0 0 26px;font-size:19px;font-weight:700;color:#fff}
  .big .brand i{width:15px;height:15px;border-radius:4px;background:linear-gradient(135deg,#1FA864,#0F3D2E);display:inline-block}
  .big .k{margin:0 0 16px;font-size:15px;font-weight:700;letter-spacing:.16em;text-transform:uppercase;color:#9FE0C7}
  .big .h{margin:0 0 22px;font-size:74px;line-height:1.06;font-weight:800;letter-spacing:-.02em;color:#fff;white-space:pre-line}
  .big .s{margin:0;font-size:25px;line-height:1.45;color:#E4EDE8;max-width:820px}
  .big .n{margin:22px 0 0;padding-top:16px;border-top:1px solid rgba(255,255,255,.22);font-size:16px;color:#C4D2CB}
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
  const holder=document.createElement('div'); holder.className='holder'+(sc.img2?' duo':'');
  const mk=(src)=>{const im=document.createElement('img'); im.className='screen'+(sc.phone?' phone':''); im.src=src; return im;};
  holder.appendChild(mk(sc.img));
  if(sc.img2) holder.appendChild(mk(sc.img2));
  layer.appendChild(holder);
  if(sc.mode==='bleed' && sc.title){ const sc2=document.createElement('div'); sc2.className='scrim'; layer.appendChild(sc2); }
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
async function preload(){
  const all=[];
  for(const s of SCENES){ all.push(s.img); if(s.img2) all.push(s.img2); }
  await Promise.all(all.map(src=>{const i=new Image();i.src=src;return i.decode().catch(()=>{});}));
}
async function run(){
  await preload(); await wait(350);
  let prev=null;
  for(const sc of SCENES){
    const layer=buildLayer(sc); stage.appendChild(layer);
    layer.animate([{opacity:0},{opacity:1}],{duration:600,easing:'ease',fill:'both'});
    if(prev){ const p=prev; p.animate([{opacity:1},{opacity:0}],{duration:600,easing:'ease',fill:'both'}); setTimeout(()=>p.remove(),680); }
    const holder=layer.querySelector('.holder');
    const en=ENTER[sc.enter]; holder.animate(en.f,{duration:820,easing:en.e,fill:'both'});
    const big=layer.querySelector('.big'); if(big) big.animate([{opacity:0,transform:'translateY(22px)'},{opacity:1,transform:'translateY(0)'}],{duration:760,easing:GLIDE,fill:'both',delay:180});
    const cap=layer.querySelector('.caption'); if(cap) cap.animate([{opacity:0,transform:'translateY(16px)'},{opacity:1,transform:'translateY(0)'}],{duration:520,easing:GLIDE,fill:'both',delay:520});
    await wait(540);
    const mv=MOVE[sc.move]; const moveMs=sc.dur*1000-540;
    for(const screen of layer.querySelectorAll('.screen')){
      screen.animate(mv.f,{duration:moveMs,easing:mv.e,fill:'both'});
    }
    await wait(moveMs);
    prev=layer;
  }
  if(prev) prev.animate([{opacity:1},{opacity:0}],{duration:700,easing:'ease',fill:'both'});
  await wait(800);
  window.__teaserDone = true;
}
run();
</script></body></html>`;

test('LG + Mobile-Comfort teaser', async ({ page }: { page: Page }) => {
  test.setTimeout(150_000);
  const scenes = SCENES.map((s) => ({
    ...s,
    img: uri(s.img),
    ...(s.img2 ? { img2: uri(s.img2) } : {}),
  }));
  await page.setContent(PAGE_HTML(JSON.stringify(scenes)), { waitUntil: 'load' });
  await page.waitForFunction('window.__teaserDone === true', null, { timeout: 120_000 });
  await page.waitForTimeout(400);
});
