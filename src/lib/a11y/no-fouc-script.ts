import { A11Y_STORAGE_KEY } from './preferences';

/**
 * Pre-paint, render-blocking inline-script STRING (mirrors next-themes' own
 * approach). Rendered into `<head>` via `dangerouslySetInnerHTML` BEFORE the
 * React bundle hydrates, it reads the persisted prefs and applies the
 * `--a11y-zoom` custom property, the `data-font-scale` attribute and the
 * `.a11y-*` classes to `documentElement` so the first paint already reflects
 * the user's settings (no flash of un-styled defaults).
 *
 * It is a self-contained string: no module imports survive serialisation, so
 * the only injected value is the storage key. Everything is wrapped in
 * try/catch AND guards `document.documentElement` for null — an unguarded
 * `documentElement` access in a pre-paint script silently kills the whole
 * script (the project's known initScript pitfall).
 */
export function getNoFoucScript(): string {
  // Inlining the allowed scales + the multiplier mapping keeps the string
  // dependency-free. Mirror this with `preferences.ts` if the steps change.
  return `(function(){try{
var el=document.documentElement;if(!el){return;}
var KEY=${JSON.stringify(A11Y_STORAGE_KEY)};
var SCALES=[100,115,130,150];
var raw=null;try{raw=window.localStorage.getItem(KEY);}catch(e){return;}
var p={fontScale:100,contrast:false,readable:false,reduceMotion:false};
if(raw){try{var j=JSON.parse(raw);if(j&&typeof j==='object'){
if(SCALES.indexOf(j.fontScale)!==-1){p.fontScale=j.fontScale;}
if(typeof j.contrast==='boolean'){p.contrast=j.contrast;}
if(typeof j.readable==='boolean'){p.readable=j.readable;}
if(typeof j.reduceMotion==='boolean'){p.reduceMotion=j.reduceMotion;}
}}catch(e2){}}
el.style.setProperty('--a11y-zoom',String(p.fontScale/100));
el.setAttribute('data-font-scale',String(p.fontScale));
if(p.contrast){el.classList.add('a11y-contrast');}else{el.classList.remove('a11y-contrast');}
if(p.readable){el.classList.add('a11y-readable');}else{el.classList.remove('a11y-readable');}
if(p.reduceMotion){el.classList.add('a11y-reduce-motion');}else{el.classList.remove('a11y-reduce-motion');}
}catch(e){}})();`;
}
