#!/usr/bin/env node
/**
 * capture-lg-reflow-smooth.mjs — deterministic frame-stepped re-capture of the
 * Live-Reflow teaser at TRUE 60 fps.
 *
 * Why: the original take (tests/demo/lg-reflow-teaser.spec.ts) used Playwright's
 * real-time video recording (CDP screencast), which is hard-capped ~25 fps in
 * this environment — the slow continuous reflow reads visibly choppy. This
 * script re-films the SAME cut (same stage HTML, German captions, choreography,
 * SFX design) but drives the timeline itself instead of recording in real time:
 *
 *   - every WAAPI animation of the original stage is re-expressed as a scrubbed
 *     cue evaluated at fixed 16.67 ms increments (window.seekTo(t));
 *   - the live app's own CSS animations (lg-blob ambient drift, lg-glare) are
 *     frozen with `animation-play-state: paused` and scrubbed deterministically
 *     via `animation-delay: calc(var(--lg-seek) * -1s)`, so they move at their
 *     true speed in the final video instead of ~12x too fast;
 *   - each step is captured as a fully-settled PNG via CDP Page.captureScreenshot
 *     (which forces a complete render) — smooth by construction, no dropped
 *     frames possible;
 *   - frames stream straight into ffmpeg (image2pipe, libx264 crf 18) so no
 *     multi-GB PNG sequence hits disk;
 *   - the pad + click soundtrack of scripts/render-demo.mjs is synthesized
 *     sample-exact in Node (the Remotion ffmpeg build has no aevalsrc/afade/
 *     lowpass/alimiter) and muxed in a second, -c:v copy pass.
 *
 * Real-time remnants: the two in-app taps (Bottom-Tab-Bar → Posteingang,
 * letter → detail) trigger genuine SPA navigations that load in wall time;
 * the pump keeps stepping the 60 fps clock while they do, so the load occupies
 * a handful of timeline frames (reads as a snappy, real navigation).
 *
 * Prereqs: dev server on :3000 (read-only — never built/restarted from here).
 *
 *   node scripts/capture-lg-reflow-smooth.mjs            # full render
 *   node scripts/capture-lg-reflow-smooth.mjs --probe    # sparse stills dry-run
 */
import { chromium } from '@playwright/test';
import { spawn, spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const APP = 'http://localhost:3000';
const NS = 'govtech-de:v1:';
const ACTIVE_PERSONA = 'anna-petrov';
const STAGE_PATH = '/__lg_stage__';
const FPS = 60;
const FRAME_MS = 1000 / FPS;
const FFMPEG = join(
  ROOT,
  'remotion/node_modules/@remotion/compositor-linux-x64-gnu/ffmpeg',
);
const FFPROBE = join(
  ROOT,
  'remotion/node_modules/@remotion/compositor-linux-x64-gnu/ffprobe',
);
const OUT_FINAL = join(ROOT, 'demo-recording/lg-reflow-live-smooth.mp4');
const SCRATCH =
  process.env.SCRATCH_DIR ||
  '/tmp/claude-0/-root-projects-govtech/014c8dae-cba4-4b23-b0fa-17089131ade4/scratchpad';
const VIDEO_ONLY = join(SCRATCH, 'lg-reflow-smooth-video.mp4');
const WAV = join(SCRATCH, 'lg-reflow-smooth-audio.wav');
const PROBE = process.argv.includes('--probe');
const PROBE_DIR = join(SCRATCH, 'probe');

/* ------------------------------------------------------------------ */
/* Real app typography for the overlays (same as the original spec). */
async function appFontCss() {
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
/* Stage page: identical CSS/DOM to the original spec, but the WAAPI stage
 * API is replaced by a scrub engine — cues registered via window.addCues()
 * and evaluated by window.seekTo(tMs). No wall-clock dependence. */
const STAGE_HTML = (fontCss) => `<!doctype html><html><head><meta charset="utf-8"><style>
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
    <p class="h">Ein Interface.
Jede Breite.</p>
    <p class="s">Liquid Glass und die neue Mobil-Bedienung — in einer einzigen, ungeschnittenen Einstellung, live aus der laufenden Anwendung.</p>
  </div>
  <div id="endcard">
    <p class="brand"><i></i>GovTech DE</p>
    <p class="h">Verwaltung,
die für Sie arbeitet.</p>
    <p class="s">govtech-de.vercel.app</p>
    <p class="n">Speculative-Design-Prototyp · Alle Daten erfunden · Keine echte Behörde angebunden.</p>
  </div>
</div></div>
<div id="cursor"><div class="dot"></div><span class="ripple" id="rip" style="opacity:0"></span></div>
<script>
var $=function(id){return document.getElementById(id)};
var device=$('device'),frost=$('frost'),hud=$('hud'),cap=$('cap'),cursor=$('cursor'),rip=$('rip');
var hudV=hud.querySelector('.hud-v'),chip=hud.querySelector('.hud-chip');

/* cubic-bezier solver — matches CSS timing functions exactly */
function bezier(x1,y1,x2,y2){
  var cx=3*x1,bx=3*(x2-x1)-cx,ax=1-cx-bx,cy=3*y1,by=3*(y2-y1)-cy,ay=1-cy-by;
  function sx(t){return((ax*t+bx)*t+cx)*t}
  function sy(t){return((ay*t+by)*t+cy)*t}
  function dx(t){return(3*ax*t+2*bx)*t+cx}
  return function(x){
    if(x<=0)return 0; if(x>=1)return 1;
    var t=x,i;
    for(i=0;i<8;i++){var e=sx(t)-x;if(Math.abs(e)<1e-6)break;var d=dx(t);if(Math.abs(d)<1e-6)break;t-=e/d;}
    if(t<0||t>1||Math.abs(sx(t)-x)>1e-4){var lo=0,hi=1;while(hi-lo>1e-5){t=(lo+hi)/2;if(sx(t)<x)lo=t;else hi=t;}}
    return sy(t);
  };
}
var EASES={
  glide:bezier(.4,0,.2,1), ease:bezier(.25,.1,.25,1), easeOut:bezier(0,0,.58,1),
  easeInOut:bezier(.42,0,.58,1), legA:bezier(.5,0,.15,1), legB:bezier(.4,0,.3,1),
  legD:bezier(.3,0,.2,1), legR:bezier(.45,0,.2,1), cursor:bezier(.35,0,.25,1),
  linear:function(p){return p},
  scroll:function(p){return p<.5?2*p*p:1-Math.pow(-2*p+2,2)/2}
};
var cues=[],events=[],evPtr=0;
function cue(t0,dur,ease,apply){cues.push({t0:t0,dur:dur,ease:EASES[ease]||EASES.glide,apply:apply,done:false});}
function evt(t,fn){events.push({t:t,fn:fn});events.sort(function(a,b){return a.t-b.t});}
function lerp(a,b,p){return a+(b-a)*p}
function mix(c1,c2,p){return[lerp(c1[0],c2[0],p),lerp(c1[1],c2[1],p),lerp(c1[2],c2[2],p),lerp(c1[3],c2[3],p)]}
function setBg(c){frost.style.background='rgba('+Math.round(c[0])+','+Math.round(c[1])+','+Math.round(c[2])+','+c[3].toFixed(4)+')';}
function setBlur(px){var v='blur('+px.toFixed(2)+'px)';frost.style.backdropFilter=v;frost.style.webkitBackdropFilter=v;}
var geom={w:1920,h:1080,r:0,tx:0},cur={x:0,y:0};

var OPS={
  /* boot veil -> light frost + opening title (mirrors stage.openTitle) */
  title:function(o){var t=o.t;
    cue(t,350,'ease',function(p){$('boot').style.opacity=String(1-p);});
    evt(t+320,function(){$('boot').style.display='none';var el=$('title');el.style.display='block';
      for(var i=0;i<el.children.length;i++){el.children[i].style.opacity='0';el.children[i].style.transform='translateY(26px)';}});
    cue(t+320,1300,'glide',function(p){setBg(mix([10,22,17,1],[234,244,238,.6],p));});
    for(var i=0;i<4;i++){(function(i){cue(t+320+260+150*i,720,'glide',function(p){
      var c=$('title').children[i];c.style.opacity=String(p);c.style.transform='translateY('+(26*(1-p)).toFixed(2)+'px)';});})(i);}
  },
  defrost:function(o){var t=o.t;
    for(var i=0;i<4;i++){(function(i){cue(t+90*i,520,'glide',function(p){
      var c=$('title').children[i];c.style.opacity=String(1-p);c.style.transform='translateY('+(-24*p).toFixed(2)+'px)';});})(i);}
    cue(t+420,1500,'glide',function(p){setBg(mix([234,244,238,.6],[234,244,238,0],p));setBlur(26*(1-p));});
    evt(t+1920,function(){frost.style.display='none';});
  },
  caption:function(o){var t=o.t;
    if(!o.first){cue(t,280,'ease',function(p){cap.style.opacity=String(1-p);cap.style.transform='translateY('+(10*p).toFixed(2)+'px)';});}
    var tin=o.first?t:t+290;
    evt(tin,function(){cap.querySelector('.k').textContent=o.k;cap.querySelector('.t').textContent=o.txt;});
    cue(tin,460,'glide',function(p){cap.style.opacity=String(p);cap.style.transform='translateY('+(14*(1-p)).toFixed(2)+'px)';});
  },
  captionHide:function(o){cue(o.t,340,'ease',function(p){cap.style.opacity=String(1-p);});},
  hud:function(o){var s=o.show;cue(o.t,450,'ease',function(p){hud.style.opacity=String(s?p:1-p);});},
  morph:function(o){var f={w:geom.w,h:geom.h,r:geom.r,tx:geom.tx};var tx=o.tx||0;
    evt(o.t,function(){device.classList.toggle('phone',!!o.phone);});
    cue(o.t,o.dur,o.ease,function(p){
      device.style.width=lerp(f.w,o.w,p).toFixed(2)+'px';
      device.style.height=lerp(f.h,o.h,p).toFixed(2)+'px';
      device.style.borderRadius=lerp(f.r,o.r,p).toFixed(2)+'px';
      device.style.transform='translateX('+lerp(f.tx,tx,p).toFixed(2)+'px)';
    });
    geom={w:o.w,h:o.h,r:o.r,tx:tx};
  },
  cross:function(o){var t=o.t;
    evt(t,function(){chip.querySelector('span').textContent=o.label;hud.classList.add('crossed');});
    cue(t,380,'glide',function(p){chip.style.opacity=String(p);chip.style.transform='translateY('+(-6*(1-p)).toFixed(2)+'px)';});
    cue(t,900,'ease',function(p){device.style.outlineColor='rgba(43,212,137,'+(0.65*Math.sin(Math.PI*p)).toFixed(3)+')';});
    evt(t+2600,function(){hud.classList.remove('crossed');});
    cue(t+2600,420,'ease',function(p){chip.style.opacity=String(1-p);});
  },
  scroll:function(o){cue(o.t,o.dur,'scroll',function(p){
    try{$('app').contentWindow.scrollTo(0,Math.round(lerp(o.from,o.to,p)));}catch(e){}});},
  cursorShow:function(o){var x=o.x,y=o.y;
    evt(o.t,function(){cursor.style.transform='translate('+x+'px,'+y+'px)';});
    cue(o.t,350,'ease',function(p){cursor.style.opacity=String(p);});cur={x:x,y:y};},
  cursorMove:function(o){var f={x:cur.x,y:cur.y};
    cue(o.t,o.dur,'cursor',function(p){cursor.style.transform='translate('+lerp(f.x,o.x,p).toFixed(1)+'px,'+lerp(f.y,o.y,p).toFixed(1)+'px)';});
    cur={x:o.x,y:o.y};},
  press:function(o){var dot=cursor.querySelector('.dot');
    cue(o.t,260,'ease',function(p){dot.style.transform='scale('+(1-0.22*Math.sin(Math.PI*p)).toFixed(3)+')';});
    cue(o.t,650,'easeOut',function(p){rip.style.opacity=String(0.9*(1-p));rip.style.transform='scale('+(0.5+2.1*p).toFixed(3)+')';});
  },
  cursorHide:function(o){cue(o.t,300,'ease',function(p){cursor.style.opacity=String(1-p);});},
  frostPulse:function(o){
    evt(o.t,function(){$('title').style.display='none';$('endcard').style.display='none';frost.style.display='flex';});
    cue(o.t,o.dur,'easeInOut',function(p){var q=Math.sin(Math.PI*p);setBg([210,235,222,0.22*q]);setBlur(12*q);});
    evt(o.t+o.dur,function(){frost.style.display='none';});
  },
  endCard:function(o){var t=o.t;
    evt(t,function(){frost.style.display='flex';var e=$('endcard');e.style.display='block';e.style.opacity='1';
      for(var i=0;i<e.children.length;i++){e.children[i].style.opacity='0';e.children[i].style.transform='translateY(24px)';}});
    cue(t,1400,'glide',function(p){setBg([5,12,9,0.74*p]);setBlur(24*p);});
    for(var i=0;i<4;i++){(function(i){cue(t+500+160*i,700,'glide',function(p){
      var c=$('endcard').children[i];c.style.opacity=String(p);c.style.transform='translateY('+(24*(1-p)).toFixed(2)+'px)';});})(i);}
  },
  fadeOut:function(o){
    cue(o.t,1100,'ease',function(p){setBg(mix([5,12,9,.74],[4,9,6,1],p));});
    cue(o.t,900,'ease',function(p){$('endcard').style.opacity=String(1-p);});
  }
};
window.addCues=function(list){for(var i=0;i<list.length;i++){OPS[list[i].op](list[i]);}};
window.seekTo=function(t){
  while(evPtr<events.length&&events[evPtr].t<=t){try{events[evPtr].fn()}catch(e){}evPtr++;}
  for(var i=0;i<cues.length;i++){var c=cues[i];if(c.done||t<c.t0)continue;
    var raw=(t-c.t0)/c.dur;var p=c.ease(Math.min(1,raw));
    try{c.apply(p)}catch(e){}
    if(raw>=1)c.done=true;}
  hudV.textContent=Math.round(device.getBoundingClientRect().width)+' px';
  try{var d=$('app').contentDocument;
    if(d&&d.documentElement)d.documentElement.style.setProperty('--lg-seek',(t/1000).toFixed(4));}catch(e){}
  return true;
};
</script></body></html>`;

/* ------------------------------------------------------------------ */
/* Node-side cubic-bezier (for computing the reverse-morph 768px crossing) */
function bezierNode(x1, y1, x2, y2) {
  const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx;
  const cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
  const sx = (t) => ((ax * t + bx) * t + cx) * t;
  const sy = (t) => ((ay * t + by) * t + cy) * t;
  return (x) => {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    let lo = 0, hi = 1, t = x;
    while (hi - lo > 1e-6) { t = (lo + hi) / 2; if (sx(t) < x) lo = t; else hi = t; }
    return sy(t);
  };
}
/** timeline offset (ms) into the reverse morph where width crosses 768px */
function crossUpOffset() {
  const ease = bezierNode(0.45, 0, 0.2, 1);
  const target = (768 - 390) / (1920 - 390);
  let lo = 0, hi = 1;
  while (hi - lo > 1e-6) { const m = (lo + hi) / 2; if (ease(m) < target) lo = m; else hi = m; }
  return ((lo + hi) / 2) * 3800;
}

/* ------------------------------------------------------------------ */
/* Soundtrack: sample-exact Node port of scripts/render-demo.mjs's synthesized
 * pad (I–vi–IV–V in A major, 10s swells) + soft UI clicks. The Remotion ffmpeg
 * is a minimal build without aevalsrc/lowpass/tremolo/aecho/afade/alimiter,
 * so the whole chain is rendered here and written as a 16-bit WAV. */
function synthWav(durSec, clicksMs, musicVol = 0.14, clickVol = 0.65) {
  const SR = 44100;
  const N = Math.ceil(durSec * SR);
  const pad = new Float64Array(N);
  const chords = [
    [110.0, 164.81, 220.0, 277.18],
    [92.5, 138.59, 185.0, 220.0],
    [146.83, 185.0, 220.0, 293.66],
    [164.81, 207.65, 246.94, 329.63],
  ];
  const SEG = 10, CYC = SEG * chords.length;
  for (let i = 0; i < N; i++) {
    const t = i / SR, m = t % CYC, k = Math.min(3, Math.floor(m / SEG));
    const env = Math.sin(Math.PI * (m - k * SEG) / SEG);
    const notes = chords[k];
    let v = 0;
    for (const f of notes) v += 0.145 * Math.sin(2 * Math.PI * f * t) + 0.08 * Math.sin(2 * Math.PI * f * 1.004 * t);
    v += 0.11 * Math.sin(Math.PI * notes[0] * t); // sub-octave root (2π·f/2 = π·f)
    const top2 = notes[3] * 2;
    v += 0.05 * Math.sin(2 * Math.PI * top2 * t) + 0.03 * Math.sin(2 * Math.PI * top2 * 1.004 * t);
    pad[i] = env * v;
  }
  // biquad lowpass 2200 Hz, Q = 0.7071 (RBJ)
  {
    const w0 = 2 * Math.PI * 2200 / SR, alpha = Math.sin(w0) / (2 * 0.7071), cw = Math.cos(w0);
    const a0 = 1 + alpha;
    const b0 = (1 - cw) / 2 / a0, b1 = (1 - cw) / a0, b2 = (1 - cw) / 2 / a0;
    const a1 = (-2 * cw) / a0, a2 = (1 - alpha) / a0;
    let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
    for (let i = 0; i < N; i++) {
      const x0 = pad[i];
      const y0 = b0 * x0 + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2;
      x2 = x1; x1 = x0; y2 = y1; y1 = y0; pad[i] = y0;
    }
  }
  // tremolo f=0.13 d=0.25
  for (let i = 0; i < N; i++) {
    const t = i / SR;
    pad[i] *= 0.75 + 0.25 * (0.5 + 0.5 * Math.sin(2 * Math.PI * 0.13 * t));
  }
  // echo taps 90/150 ms, decays .2/.12, in .7 out .55
  const d1 = Math.round(0.09 * SR), d2 = Math.round(0.15 * SR);
  const out = new Float64Array(N);
  for (let i = 0; i < N; i++) {
    let v = 0.7 * pad[i];
    if (i >= d1) v += 0.2 * pad[i - d1];
    if (i >= d2) v += 0.12 * pad[i - d2];
    out[i] = 0.55 * v;
  }
  // fade in 2.5s / fade out last 3.5s, then music volume
  const fi = 2.5 * SR, foLen = 3.5 * SR, foStart = Math.max(0, N - foLen);
  for (let i = 0; i < N; i++) {
    let g = 1;
    if (i < fi) g *= i / fi;
    if (i > foStart) g *= Math.max(0, 1 - (i - foStart) / foLen);
    out[i] *= g * musicVol;
  }
  // clicks: two damped sines, 80 ms
  const CN = Math.round(0.08 * SR);
  for (const ms of clicksMs) {
    const s0 = Math.round((ms / 1000) * SR);
    for (let j = 0; j < CN && s0 + j < N; j++) {
      const tj = j / SR;
      out[s0 + j] += clickVol * (
        Math.exp(-tj * 120) * 0.8 * Math.sin(2 * Math.PI * 1500 * tj) +
        Math.exp(-tj * 220) * 0.35 * Math.sin(2 * Math.PI * 3400 * tj)
      );
    }
  }
  // limiter (clamp ±0.9) + 16-bit PCM
  const pcm = Buffer.alloc(N * 2);
  for (let i = 0; i < N; i++) {
    const v = Math.max(-0.9, Math.min(0.9, out[i]));
    pcm.writeInt16LE(Math.round(v * 32767), i * 2);
  }
  const hdr = Buffer.alloc(44);
  hdr.write('RIFF', 0); hdr.writeUInt32LE(36 + pcm.length, 4); hdr.write('WAVE', 8);
  hdr.write('fmt ', 12); hdr.writeUInt32LE(16, 16); hdr.writeUInt16LE(1, 20); hdr.writeUInt16LE(1, 22);
  hdr.writeUInt32LE(SR, 24); hdr.writeUInt32LE(SR * 2, 28); hdr.writeUInt16LE(2, 32); hdr.writeUInt16LE(16, 34);
  hdr.write('data', 36); hdr.writeUInt32LE(pcm.length, 40);
  writeFileSync(WAV, Buffer.concat([hdr, pcm]));
}

/* ------------------------------------------------------------------ */
async function main() {
  /* -- pre-flight: the LIVE dev server must already be on :3000 -------- */
  const up = await fetch(`${APP}/dashboard?reliable=1`).then((r) => r.ok).catch(() => false);
  if (!up) throw new Error('dev server on :3000 is not reachable — this take films the LIVE app');
  await Promise.all(
    ['/dashboard?reliable=1', '/posteingang?reliable=1', '/posteingang/warmup?reliable=1'].map(
      (p) => fetch(`${APP}${p}`).catch(() => {}),
    ),
  );
  const fontCss = await appFontCss();
  mkdirSync(SCRATCH, { recursive: true });
  if (PROBE) mkdirSync(PROBE_DIR, { recursive: true });

  /* -- ffmpeg pass 1: PNG pipe -> final-quality H.264 (video only) ------ */
  let ff = null, ffExit = null;
  if (!PROBE) {
    ff = spawn(FFMPEG, [
      '-y', '-f', 'image2pipe', '-framerate', String(FPS), '-vcodec', 'png', '-i', 'pipe:0',
      '-c:v', 'libx264', '-crf', '18', '-preset', 'slow', '-pix_fmt', 'yuv420p',
      VIDEO_ONLY,
    ], { stdio: ['pipe', 'ignore', 'pipe'] });
    let ferr = '';
    ff.stderr.on('data', (d) => { ferr += d; if (ferr.length > 40000) ferr = ferr.slice(-20000); });
    ffExit = new Promise((res, rej) => {
      ff.on('close', (code) => (code === 0 ? res() : rej(new Error(`ffmpeg pass1 exit ${code}\n${ferr.slice(-3000)}`))));
    });
    ff.on('error', (e) => { throw e; });
  }

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();
  await context.addCookies([{ name: `${NS}locale`, value: 'de', domain: 'localhost', path: '/' }]);
  /* deterministic Anna persona + frame hygiene + CSS-animation scrubbing.
   * The last style rule freezes every CSS animation in the LIVE app and pins
   * it to the scrubbed clock: seekTo(t) sets --lg-seek (seconds) on the app
   * document, so ambient drift (lg-blob-*) moves at true speed at 60 fps. */
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
            '*{scrollbar-width:none!important;caret-color:transparent!important}' +
            '*{animation-play-state:paused!important;animation-delay:calc(var(--lg-seek,0)*-1s)!important}';
          document.head.appendChild(s);
        });
      } catch { /* guarded per demo-record runbook */ }
    },
    [NS, ACTIVE_PERSONA],
  );

  await page.route(`**${STAGE_PATH}`, (r) =>
    r.fulfill({ contentType: 'text/html', body: STAGE_HTML(fontCss) }),
  );
  await page.goto(`${APP}${STAGE_PATH}`, { waitUntil: 'domcontentloaded' });

  /* -- boot behind the solid brand veil (real-time, not captured) ------- */
  let fr = null;
  for (let i = 0; i < 120 && !fr; i++) {
    fr = page.frames().find(
      (f) => f !== page.mainFrame() && f.url().includes('localhost:3000') && !f.url().includes(STAGE_PATH),
    ) || null;
    if (!fr) await page.waitForTimeout(250);
  }
  if (!fr) throw new Error('app iframe never appeared');
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
  await page.waitForTimeout(1200); // hydration + glass ambient settle

  const cdp = await context.newCDPSession(page);
  await cdp.send('Page.enable').catch(() => {});

  /* -- frame pump ------------------------------------------------------- */
  let frame = 0;
  let lastProbeShot = -Infinity;
  const t0Wall = Date.now();
  let screenshotOpts = { format: 'png', optimizeForSpeed: true };
  const captureFrame = async (tMs) => {
    await page.evaluate((t) => window.seekTo(t), tMs);
    if (PROBE) {
      if (tMs - lastProbeShot >= 2500) {
        lastProbeShot = tMs;
        const shot = await cdp.send('Page.captureScreenshot', { format: 'png' });
        writeFileSync(join(PROBE_DIR, `probe-${String(Math.round(tMs)).padStart(6, '0')}.png`), Buffer.from(shot.data, 'base64'));
      }
      return;
    }
    let shot;
    try {
      shot = await cdp.send('Page.captureScreenshot', screenshotOpts);
    } catch {
      screenshotOpts = { format: 'png' }; // older CDP without optimizeForSpeed
      shot = await cdp.send('Page.captureScreenshot', screenshotOpts);
    }
    const buf = Buffer.from(shot.data, 'base64');
    if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once('drain', r));
  };
  const STRIDE = PROBE ? 4 : 1;
  const now = () => frame * FRAME_MS;
  const pumpTo = async (tMs) => {
    const target = Math.round(tMs / FRAME_MS);
    while (frame < target) {
      await captureFrame(frame * FRAME_MS);
      frame += STRIDE;
      if (!PROBE && frame % 300 === 0) {
        console.log(`  frame ${frame}  t=${(now() / 1000).toFixed(1)}s  wall=${((Date.now() - t0Wall) / 1000).toFixed(0)}s`);
      }
    }
  };
  /** pump frames while waiting for a real-load condition (real time keeps
   * running between frames, so a wall-second of load costs only a few frames) */
  const pumpUntil = async (cond, maxMs) => {
    const cap = now() + maxMs;
    while (now() < cap) {
      if (await cond().catch(() => false)) return true;
      await captureFrame(frame * FRAME_MS);
      frame += STRIDE;
    }
    return false;
  };
  const addCues = (ops) => page.evaluate((list) => window.addCues(list), ops);

  /* ================== deterministic beat schedule (beats 1–4) ========= */
  const TL = {};
  TL.title = 800;                          // boot veil hold, then title in
  TL.defrost = TL.title + 4620;            // 5420
  TL.cap1 = TL.defrost + 2420;             // 7840  LIQUID GLASS
  TL.scroll1 = TL.cap1 + 1000;             // 8840  0 -> 660 over 2400
  TL.scroll2 = TL.scroll1 + 3400;          // 12240 660 -> 0 over 1500
  TL.cap2 = TL.scroll2 + 1900;             // 14140 LIVE REFLOW (swap)
  TL.hudOn = TL.cap2 + 290;                // 14430
  TL.legA = TL.hudOn + 1900;               // 16330 1920x1080 -> 1360x900
  TL.cap3 = TL.legA + 2100;                // 18430 caption mid-legA
  TL.legB = TL.legA + 3200;                // 19530 -> 800x880
  TL.legC = TL.legB + 3400;                // 22930 -> 720x870 (linear)
  TL.crossDown = TL.legC + 960;            // 23890 width crosses 768
  TL.cap4 = TL.legC + 1400;                // 24330 767 PIXEL
  TL.legD = TL.legC + 3600;                // 26530 -> 390x844 phone
  TL.cap5 = TL.legD + 1200;                // 27730 SMARTPHONE
  TL.hudOff = TL.legD + 4000;              // 30530

  const clicks = [TL.crossDown];

  await addCues([
    { op: 'title', t: TL.title },
    { op: 'defrost', t: TL.defrost },
    { op: 'caption', t: TL.cap1, first: true, k: 'LIQUID GLASS', txt: 'Das neue Erscheinungsbild — ruhige Glasflächen, klare Typografie. Live aus der laufenden Anwendung.' },
    { op: 'scroll', t: TL.scroll1, dur: 2400, from: 0, to: 660 },
    { op: 'scroll', t: TL.scroll2, dur: 1500, from: 660, to: 0 },
    { op: 'caption', t: TL.cap2, k: 'LIVE REFLOW', txt: 'Wir verkleinern jetzt die Fensterbreite. Alles Weitere macht die Oberfläche selbst.' },
    { op: 'hud', t: TL.hudOn, show: true },
    { op: 'morph', t: TL.legA, dur: 3200, ease: 'legA', w: 1360, h: 900, r: 18, tx: 0 },
    { op: 'caption', t: TL.cap3, k: 'LIVE REFLOW', txt: 'Navigation, Karten, Spalten — jede Breite ordnet sich neu.' },
    { op: 'morph', t: TL.legB, dur: 3400, ease: 'legB', w: 800, h: 880, r: 22, tx: 160 },
    { op: 'morph', t: TL.legC, dur: 2400, ease: 'linear', w: 720, h: 870, r: 24, tx: 175 },
    { op: 'cross', t: TL.crossDown, label: 'mobile Ansicht aktiv' },
    { op: 'caption', t: TL.cap4, k: '767 PIXEL', txt: 'Hier wechselt die Oberfläche in die mobile Ansicht — die Tab-Bar erscheint von selbst.' },
    { op: 'morph', t: TL.legD, dur: 2600, ease: 'legD', w: 390, h: 844, r: 34, tx: 245, phone: true },
    { op: 'caption', t: TL.cap5, k: 'SMARTPHONE', txt: 'Dieselbe Anwendung, keine zwei Welten — die fünf wichtigsten Bereiche in Daumenreichweite.' },
    { op: 'hud', t: TL.hudOff, show: false },
  ]);
  console.log('beats 1-4 scheduled — pumping to tap setup');
  await pumpTo(TL.hudOff);

  /* ================== BEAT 5 — real tap #1: Bottom-Tab-Bar ============ */
  const tab = fr.locator('nav.mobile-tabbar a[href="/posteingang"]');
  const tabBox = await tab.boundingBox();
  if (!tabBox) throw new Error('Bottom-Tab-Bar Posteingang tab not visible at 390px');
  let T = now();
  const press1 = T + 350 + 900;
  clicks.push(press1);
  await addCues([
    { op: 'cursorShow', t: T, x: tabBox.x - 170, y: tabBox.y - 190 },
    { op: 'cursorMove', t: T + 350, dur: 900, x: tabBox.x + tabBox.width / 2, y: tabBox.y + tabBox.height / 2 - 3 },
    { op: 'press', t: press1 },
  ]);
  await pumpTo(press1 + 180);
  await tab.click({ timeout: 10_000 });
  const cap6t = now() + 60;
  await addCues([
    { op: 'caption', t: cap6t, k: 'ECHTE BEDIENUNG', txt: 'Ein Tipp öffnet den Posteingang — echte Navigation, kein Videoschnitt.' },
  ]);
  const listOk = await pumpUntil(() => fr.locator('a.post-item').first().isVisible(), 2400);
  if (!listOk) console.warn('  (list poll capped — continuing)');
  await pumpTo(Math.max(now(), cap6t + 750) + 2100);

  /* ================== BEAT 6 — real tap #2: open a letter ============= */
  const letter = fr.locator('a.post-item').first();
  const letterBox = await letter.boundingBox();
  if (!letterBox) throw new Error('first letter card not visible');
  T = now();
  const press2 = T + 800;
  clicks.push(press2);
  await addCues([
    { op: 'cursorMove', t: T, dur: 800, x: letterBox.x + letterBox.width / 2, y: letterBox.y + letterBox.height / 2 },
    { op: 'press', t: press2 },
  ]);
  await pumpTo(press2 + 180);
  await letter.click({ timeout: 10_000 });
  await addCues([{ op: 'cursorHide', t: now() + 500 }]);
  const detailOk = await pumpUntil(
    () => fr.getByText('Behördenkonto verifiziert').first().isVisible(),
    2500,
  );
  if (!detailOk) console.warn('  (detail poll capped — continuing)');
  await pumpTo(now() + 400);
  const cap7t = now();
  await addCues([
    { op: 'caption', t: cap7t, k: 'POSTEINGANG', txt: 'Ein Brief vom Amt — mit Frist, Anhängen und verständlicher Erklärung.' },
  ]);
  await pumpTo(cap7t + 2590);

  /* ================== BEAT 7 — real dark-mode flip ===================== */
  T = now();
  await addCues([
    { op: 'caption', t: T, k: 'DUNKELMODUS', txt: 'Folgt Ihrer Systemeinstellung — mit geprüften Kontrasten.' },
  ]);
  const pulseT = T + 1090;
  await addCues([{ op: 'frostPulse', t: pulseT, dur: 900 }]);
  await pumpTo(pulseT + 430);
  await page.emulateMedia({ colorScheme: 'dark' }); // REAL prefers-color-scheme flip
  await pumpTo(pulseT + 900 + 2400);

  /* ================== BEAT 8 — reverse reflow, phone -> dark desktop === */
  T = now();
  const morphRT = T + 790;
  const crossUp = morphRT + crossUpOffset();
  clicks.push(crossUp);
  await addCues([
    { op: 'hud', t: T, show: true },
    { op: 'caption', t: T, k: 'UND ZURÜCK', txt: 'Aus dem Smartphone wird wieder der Desktop — derselbe Brief, jetzt zweispaltig.' },
    { op: 'morph', t: morphRT, dur: 3800, ease: 'legR', w: 1920, h: 1080, r: 0, tx: 0, phone: false },
    { op: 'cross', t: crossUp, label: 'Desktop-Ansicht aktiv' },
  ]);
  await pumpTo(morphRT + 3800 + 1000);
  await addCues([{ op: 'hud', t: now(), show: false }]);
  await pumpTo(now() + 800);

  /* ================== BEAT 9 — dark glass end card ===================== */
  T = now();
  await addCues([
    { op: 'captionHide', t: T },
    { op: 'endCard', t: T },
  ]);
  await pumpTo(T + 1900 + 4200);
  await addCues([{ op: 'fadeOut', t: now() }]);
  await pumpTo(now() + 1700);

  const totalFrames = frame;
  const durSec = totalFrames / FPS;
  console.log(`capture done: ${totalFrames} frames = ${durSec.toFixed(2)}s @ ${FPS}fps (wall ${((Date.now() - t0Wall) / 1000).toFixed(0)}s)`);
  await browser.close();

  if (PROBE) {
    console.log(`probe stills in ${PROBE_DIR}`);
    return;
  }

  ff.stdin.end();
  await ffExit;
  console.log(`video-only intermediate: ${VIDEO_ONLY}`);

  /* -- soundtrack + mux -------------------------------------------------- */
  clicks.sort((a, b) => a - b);
  console.log(`click SFX at: ${clicks.map((c) => (c / 1000).toFixed(2) + 's').join(', ')}`);
  synthWav(durSec, clicks);
  writeFileSync(
    join(ROOT, 'demo-recording/clicks-smooth.json'),
    JSON.stringify({
      generated_at: new Date().toISOString(),
      source: 'capture-lg-reflow-smooth',
      fps: FPS,
      total_frames: totalFrames,
      clicks_ms: clicks.map((c) => Math.round(c)),
    }, null, 2),
  );
  const mux = spawnSync(FFMPEG, [
    '-y', '-i', VIDEO_ONLY, '-i', WAV,
    '-map', '0:v', '-map', '1:a',
    '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k',
    '-movflags', '+faststart', '-shortest',
    OUT_FINAL,
  ], { stdio: ['ignore', 'inherit', 'inherit'] });
  if (mux.status !== 0) throw new Error(`ffmpeg mux exit ${mux.status}`);
  console.log(`FINAL: ${OUT_FINAL}`);

  const probe = spawnSync(FFPROBE, [
    '-v', 'error', '-select_streams', 'v', '-count_frames',
    '-show_entries', 'stream=r_frame_rate,avg_frame_rate,nb_read_frames,duration',
    '-of', 'default=nw=1', OUT_FINAL,
  ], { encoding: 'utf8' });
  console.log(probe.stdout);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
