/**
 * render-demo.mjs — convert the newest demo-recording .webm into a
 * publication-ready H.264 .mp4 (GitHub README / YouTube upload both want mp4),
 * and lay a synthesized soundtrack under it:
 *
 *   - a calm ambient chord pad (pure-sine swells, I–vi–IV–V in A major,
 *     low-passed + slow tremolo + a touch of echo) — synthesized by ffmpeg,
 *     so there is NO licensing question for YouTube
 *   - a soft UI click sound under every cursor-click ripple, timed from
 *     demo-recording/clicks.json (written by the demo spec during the take)
 *
 *   npm run demo:render                  # 1:1 speed, with audio
 *   npm run demo:render -- --speed 1.15  # global 15% speed-up
 *   npm run demo:render -- --audio off   # video only (old behavior)
 *   npm run demo:render -- --music-vol 0.10 --click-vol 0.5
 *   npm run demo:render -- --out demo-recording/demo.mp4
 *
 * The edit itself (title cards, captions, cross-fades, pacing) happens
 * IN-TAKE in tests/demo/spine-demo.spec.ts — this script only transcodes
 * and scores.
 *
 * Needs ffmpeg on PATH, FFMPEG_PATH env, or `npm i --no-save ffmpeg-static`.
 */
import { spawnSync } from 'node:child_process';
import { readdirSync, statSync, existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createRequire } from 'node:module';

const RECORDING_DIR = 'demo-recording';
const CLICKS_JSON = join(RECORDING_DIR, 'clicks.json');

function findFfmpeg() {
  const candidates = [process.env.FFMPEG_PATH, 'ffmpeg'].filter(Boolean);
  try {
    const staticPath = createRequire(import.meta.url)('ffmpeg-static');
    if (staticPath) candidates.push(staticPath);
  } catch {
    /* ffmpeg-static not installed — fine */
  }
  for (const bin of candidates) {
    const probe = spawnSync(bin, ['-version'], { stdio: 'ignore', shell: false });
    if (probe.status === 0) return bin;
  }
  return null;
}

function newestWebm(dir) {
  if (!existsSync(dir)) return null;
  let best = null;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) {
      const nested = newestWebm(p);
      if (nested && (!best || nested.mtime > best.mtime)) best = nested;
    } else if (entry.name.endsWith('.webm')) {
      const mtime = statSync(p).mtimeMs;
      if (!best || mtime > best.mtime) best = { path: p, mtime };
    }
  }
  return best;
}

function argValue(flag, fallback) {
  const i = process.argv.indexOf(flag);
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}

/** Decode once to learn the real duration (Playwright webm headers can lack it). */
function probeDurationSec(ffmpeg, file) {
  const r = spawnSync(ffmpeg, ['-i', file, '-f', 'null', '-'], { encoding: 'utf8' });
  const err = r.stderr ?? '';
  const last = [...err.matchAll(/time=(\d+):(\d+):(\d+\.?\d*)/g)].pop();
  if (last) return Number(last[1]) * 3600 + Number(last[2]) * 60 + Number(last[3]);
  const hdr = err.match(/Duration:\s*(\d+):(\d+):(\d+\.?\d*)/);
  if (hdr) return Number(hdr[1]) * 3600 + Number(hdr[2]) * 60 + Number(hdr[3]);
  return null;
}

/**
 * The ambient pad as a single aevalsrc expression: four chords (A, F#m, D, E),
 * each swelling in and out over a 10 s window (sin envelope → zero at every
 * seam, so the loop never clicks). Two slightly detuned sines per chord note
 * give the body of the pad its warmth; a sub-octave root underneath adds weight
 * and a quiet two-octave shimmer on top adds air — so the loop reads as a fuller,
 * more "scored" bed rather than a thin organ. Everything is scaled by
 * `--music-vol` and clamped by the downstream `alimiter`, so the extra voices
 * never clip.
 */
function padExpression() {
  const SEG = 10;
  const chords = [
    [110.0, 164.81, 220.0, 277.18], // A   (A2 E3 A3 C#4)
    [92.5, 138.59, 185.0, 220.0], // F#m (F#2 C#3 F#3 A3)
    [146.83, 185.0, 220.0, 293.66], // D   (D3 F#3 A3 D4)
    [164.81, 207.65, 246.94, 329.63], // E   (E3 G#3 B3 E4)
  ];
  const cycle = SEG * chords.length;
  const terms = chords.map((notes, k) => {
    const lo = k * SEG;
    const hi = (k + 1) * SEG;
    const env = `between(mod(t,${cycle}),${lo},${hi})*sin(PI*(mod(t,${cycle})-${lo})/${SEG})`;
    const root = notes[0];
    const top = notes[notes.length - 1];
    const voice = [
      // chord body — two slightly detuned sines per note
      ...notes.map(
        (f) =>
          `0.145*sin(2*PI*${f}*t)+0.08*sin(2*PI*${(f * 1.004).toFixed(3)}*t)`,
      ),
      // sub-octave root — weight
      `0.11*sin(2*PI*${(root / 2).toFixed(2)}*t)`,
      // two-octave shimmer — air (detuned pair, kept quiet)
      `0.05*sin(2*PI*${(top * 2).toFixed(2)}*t)+0.03*sin(2*PI*${(
        top *
        2 *
        1.004
      ).toFixed(3)}*t)`,
    ].join('+');
    return `(${env})*(${voice})`;
  });
  return terms.join('+');
}

/** A short, soft UI tick — two damped sines, 80 ms. */
const CLICK_EXPR =
  "exp(-t*120)*0.8*sin(2*PI*1500*t)+exp(-t*220)*0.35*sin(2*PI*3400*t)";

const ffmpeg = findFfmpeg();
if (!ffmpeg) {
  console.error(
    'ffmpeg not found. Install it (Windows: `winget install Gyan.FFmpeg`, or `npm i --no-save ffmpeg-static`)\n' +
      'or point FFMPEG_PATH at the binary. The recorded .webm under demo-recording/ is already\n' +
      'the finished cut — mp4 is only needed for upload.',
  );
  process.exit(1);
}

const source = newestWebm(RECORDING_DIR);
if (!source) {
  console.error(`No .webm found under ${RECORDING_DIR}/ — run \`npm run demo:record\` first.`);
  process.exit(1);
}

const speed = Number(argValue('--speed', '1'));
if (!Number.isFinite(speed) || speed <= 0) {
  console.error(`Invalid --speed value.`);
  process.exit(1);
}
const out = argValue('--out', join(RECORDING_DIR, 'demo.mp4'));
const audio = argValue('--audio', 'on') !== 'off';
const musicVol = Number(argValue('--music-vol', '0.14'));
const clickVol = Number(argValue('--click-vol', '0.65'));

console.log(`source : ${source.path}`);
console.log(`speed  : ${speed}x`);
console.log(`audio  : ${audio ? 'pad + clicks' : 'off'}`);
console.log(`output : ${out}`);

const videoArgs = [
  '-c:v', 'libx264',
  '-crf', '18',
  '-preset', 'slow',
  '-pix_fmt', 'yuv420p',
  '-movflags', '+faststart',
  '-r', '30',
];

if (!audio) {
  const run = spawnSync(
    ffmpeg,
    ['-y', '-i', source.path, '-vf', `setpts=PTS/${speed}`, ...videoArgs, '-an', out],
    { stdio: 'inherit' },
  );
  process.exit(run.status ?? 1);
}

const srcDur = probeDurationSec(ffmpeg, source.path);
if (!srcDur) {
  console.error('Could not determine source duration — rerun with `--audio off` or check the take.');
  process.exit(1);
}
const outDur = srcDur / speed;
console.log(`length : ${srcDur.toFixed(1)}s → ${outDur.toFixed(1)}s`);

let clicks = [];
if (existsSync(CLICKS_JSON)) {
  try {
    const parsed = JSON.parse(readFileSync(CLICKS_JSON, 'utf8'));
    clicks = (parsed.clicks_ms ?? [])
      .map((ms) => Math.round(ms / speed))
      .filter((ms) => ms >= 0 && ms / 1000 < outDur);
  } catch {
    console.warn(`Could not parse ${CLICKS_JSON} — rendering without click sounds.`);
  }
} else {
  console.warn(`${CLICKS_JSON} not found — rendering without click sounds (re-record to regenerate).`);
}
console.log(`clicks : ${clicks.length ? clicks.map((c) => (c / 1000).toFixed(1) + 's').join(', ') : 'none'}`);

const fadeOutStart = Math.max(0, outDur - 3.5).toFixed(2);
const filters = [];
// [1:a] = pad
filters.push(
  `[1:a]lowpass=f=2200,tremolo=f=0.13:d=0.25,aecho=0.7:0.55:90|150:0.2|0.12,` +
    `afade=t=in:d=2.5,afade=t=out:st=${fadeOutStart}:d=3.5,volume=${musicVol}[mus]`,
);

let mixInputs = '[mus]';
if (clicks.length > 0) {
  const splitLabels = clicks.map((_, i) => `[s${i}]`).join('');
  filters.push(`[2:a]asplit=${clicks.length}${splitLabels}`);
  clicks.forEach((ms, i) => {
    filters.push(`[s${i}]adelay=${ms}:all=1,volume=${clickVol}[c${i}]`);
    mixInputs += `[c${i}]`;
  });
}
const mixCount = 1 + clicks.length;
filters.push(
  `${mixInputs}amix=inputs=${mixCount}:duration=longest:normalize=0,alimiter=limit=0.9[aout]`,
);

const args = [
  '-y',
  '-i', source.path,
  '-f', 'lavfi', '-i', `aevalsrc='${padExpression()}':s=44100:d=${(outDur + 1).toFixed(2)}`,
  ...(clicks.length > 0
    ? ['-f', 'lavfi', '-i', `aevalsrc='${CLICK_EXPR}':s=44100:d=0.08`]
    : []),
  '-filter_complex', filters.join(';'),
  '-map', '0:v', '-map', '[aout]',
  '-vf', `setpts=PTS/${speed}`,
  ...videoArgs,
  '-c:a', 'aac', '-b:a', '192k',
  '-t', outDur.toFixed(2),
  out,
];

const run = spawnSync(ffmpeg, args, { stdio: 'inherit' });
process.exit(run.status ?? 1);
