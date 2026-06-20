/**
 * generate-teaser.mjs — drive aimlapi.com image-to-video over the clean
 * update-arc reference stills (demo-recording/refs/*.png) to produce the
 * scene clips for the ~40s German LinkedIn "big update" teaser.
 *
 * The full creative brief (zoom choreography, captions, voiceover, honesty
 * rules, assembly) lives in docs/video-presentation-prompt.md — this script is
 * the executable half of it. It does NOT burn in captions or voiceover: the
 * video model only does the camera move. Titles/captions/VO/music are laid on
 * afterwards (see the doc's "Assembly" section) so all on-screen text stays
 * crisp and un-warped.
 *
 *   # 1. set your key (do NOT commit it):
 *   $env:AIMLAPI_KEY = (Get-Content "$env:USERPROFILE\Downloads\AIMLAPI_APIkey_2c6e0f06.txt" |
 *                       Select-String 'API key:' ).ToString().Split(':')[-1].Trim()
 *   # 2. generate every scene clip (sequential; Kling ~5-6 min per 5s clip):
 *   node scripts/generate-teaser.mjs
 *   # options:
 *   node scripts/generate-teaser.mjs --only s3,s5      # just these scenes
 *   node scripts/generate-teaser.mjs --model veo        # use Veo 3.1 fast instead of Kling
 *   node scripts/generate-teaser.mjs --concurrency 3    # poll several at once
 *
 * Output: demo-recording/teaser/<id>.mp4 (one per scene).
 * Needs Node 18+ (global fetch). No deps.
 */
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

const KEY = process.env.AIMLAPI_KEY || process.env.AIMLAPI_API_KEY;
if (!KEY) {
  console.error('Set AIMLAPI_KEY (your aimlapi.com key) in the environment first. See header.');
  process.exit(1);
}

const API = 'https://api.aimlapi.com/v2/video/generations';
const REFS = 'demo-recording/refs';
const OUT = 'demo-recording/teaser';

// Primary = Kling v2-master (accepts base64 local image + explicit camera zoom).
// `--model veo` swaps to Veo 3.1 fast (faster, but image must be an http URL —
// see the doc; base64 is not accepted by Veo).
const MODELS = {
  kling: 'klingai/v2-master-image-to-video',
  veo: 'google/veo-3.1-i2v-fast',
};

const NEGATIVE =
  'warped text, morphing letters, distorted UI, changing words, gibberish, ' +
  'flickering text, hallucinated elements, extra UI, melting interface, blurry text, ' +
  'watermark, people, hands, camera shake, fast motion, jump cut';

/**
 * The storyboard. `zoom` (-10..10) drives Kling's camera_control: positive =
 * push-IN, negative = pull-OUT; `tilt`/`pan` add a slow drift. `prompt` repeats
 * the move in words so it also works on models without camera_control.
 * Mirrors docs/video-presentation-prompt.md §Storyboard.
 */
const SCENES = [
  { id: 's0', file: '00-dashboard.png',            dur: 5, zoom: 2,
    prompt: 'A clean German government web dashboard. Hold the UI perfectly still and legible; very slow, smooth cinematic push-in toward the centre. Subtle parallax only. No text changes, no new elements.' },
  { id: 's1', file: '01-assistent-confirm@el.png', dur: 5, zoom: 4,
    prompt: 'A confirmation card listing German authorities with legal-basis lines. Slow steady push-in toward the list and the blue "Umzug starten" button. UI stays sharp and unchanged; cinematic, calm.' },
  { id: 's2', file: '02-cascade.png',              dur: 5, zoom: -3,
    prompt: 'A long list of government authorities being processed. Slow smooth pull-OUT that reveals more rows, conveying scale. UI perfectly stable and readable; no morphing.' },
  { id: 's3', file: '03-audit-chain.png',          dur: 5, zoom: 6,
    prompt: 'A technical audit-log panel with hash-chained entries. Strong but slow cinematic push-in toward the chained log rows, as if to read them. Text stays crisp and unchanged.' },
  { id: 's4', file: '04-verify-ok@el.png',         dur: 5, zoom: 4,
    prompt: 'A green success badge reading a verification result. Quick confident push-in that settles on the green check, then holds. Crisp, no text change.' },
  { id: 's5', file: '07-fitconnect-jwe@el.png',    dur: 5, zoom: 5,
    prompt: 'An encrypted submission receipt panel showing JWE byte strings and a savings summary. Slow cinematic push-in onto the encrypted bytes. UI stable, text unchanged, premium feel.' },
  { id: 's6', file: '08-eudi-card@el.png',         dur: 5, zoom: 4, tilt: 2,
    prompt: 'A verified EU digital-identity credential card with a green verified status and an attribute list. Slow push-in onto the verified status, then a gentle downward drift over the attributes. Crisp and unchanged.' },
  { id: 's7', file: '10-code-verify.png',          dur: 5, zoom: 2,
    prompt: 'A dark IDE window showing real TypeScript cryptography code. Very slow Ken-Burns push-in drift. Code text stays perfectly sharp and unchanged; cinematic, focused.' },
  { id: 's8', file: '00-dashboard.png',            dur: 4, zoom: -2,
    prompt: 'A clean German government web dashboard. Slow smooth pull-OUT to a calm wide hold for an outro. UI stable and legible; no changes.' },
];

function args() {
  const a = process.argv.slice(2);
  const get = (flag, def) => {
    const i = a.indexOf(flag);
    return i !== -1 && a[i + 1] ? a[i + 1] : def;
  };
  return {
    only: get('--only', '').split(',').map((s) => s.trim()).filter(Boolean),
    model: get('--model', 'kling'),
    concurrency: Number(get('--concurrency', '1')),
  };
}

async function toDataUri(path) {
  const buf = await readFile(path);
  return `data:image/png;base64,${buf.toString('base64')}`;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function createGeneration(modelId, scene, imageUrl) {
  const body = {
    model: modelId,
    prompt: scene.prompt,
    image_url: imageUrl,
    duration: scene.dur <= 5 ? 5 : scene.dur, // Kling: 5|10
    negative_prompt: NEGATIVE,
  };
  if (modelId.startsWith('klingai/') || modelId.startsWith('kling-video/')) {
    body.cfg_scale = 0.5;
    const config = { zoom: scene.zoom };
    if (scene.tilt) config.tilt = scene.tilt;
    if (scene.pan) config.pan = scene.pan;
    body.camera_control = { type: 'simple', config };
  }
  if (modelId.startsWith('google/veo')) {
    body.aspect_ratio = '16:9';
    body.resolution = '1080p';
    body.duration = scene.dur <= 6 ? 6 : 8; // Veo: 4|6|8
    body.generate_audio = false;
  }
  const res = await fetch(API, {
    method: 'POST',
    headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.error) {
    throw new Error(`create ${scene.id} failed (${res.status}): ${JSON.stringify(json.error ?? json)}`);
  }
  return json.id;
}

async function poll(id) {
  for (let i = 0; i < 240; i += 1) {
    const res = await fetch(`${API}?generation_id=${encodeURIComponent(id)}`, {
      headers: { Authorization: `Bearer ${KEY}` },
    });
    const json = await res.json().catch(() => ({}));
    const status = json.status;
    if (status === 'completed' && json.video?.url) return json.video.url;
    if (status === 'error') throw new Error(`generation ${id} errored: ${JSON.stringify(json.error)}`);
    process.stdout.write(`  · ${id.slice(0, 8)} ${status ?? '...'}\r`);
    await sleep(8000);
  }
  throw new Error(`generation ${id} timed out`);
}

async function runScene(modelId, scene) {
  const refPath = join(REFS, scene.file);
  if (!existsSync(refPath)) throw new Error(`missing ref still: ${refPath} (run the stills capture first)`);
  console.log(`▶ ${scene.id}  ${scene.file}  zoom=${scene.zoom}`);
  const imageUrl = modelId.startsWith('google/veo')
    ? scene.httpUrl ?? (() => { throw new Error(`Veo needs an http image_url for ${scene.id} — host the still and set scene.httpUrl, or use the default Kling model.`); })()
    : await toDataUri(refPath);
  const id = await createGeneration(modelId, scene, imageUrl);
  const url = await poll(id);
  const buf = Buffer.from(await (await fetch(url)).arrayBuffer());
  const outPath = join(OUT, `${scene.id}.mp4`);
  await writeFile(outPath, buf);
  console.log(`✓ ${scene.id}  →  ${outPath}`);
  return outPath;
}

async function main() {
  const { only, model, concurrency } = args();
  const modelId = MODELS[model] ?? model;
  await mkdir(OUT, { recursive: true });
  const scenes = only.length ? SCENES.filter((s) => only.includes(s.id)) : SCENES;
  console.log(`model: ${modelId}\nscenes: ${scenes.map((s) => s.id).join(', ')}\n`);

  const queue = [...scenes];
  const workers = Array.from({ length: Math.max(1, concurrency) }, async () => {
    while (queue.length) {
      const scene = queue.shift();
      try { await runScene(modelId, scene); }
      catch (e) { console.error(`✗ ${scene.id}: ${e.message}`); }
    }
  });
  await Promise.all(workers);

  console.log(`\nDone. Clips in ${OUT}/. Assemble with the ffmpeg recipe in docs/video-presentation-prompt.md.`);
}

main().catch((e) => { console.error(e); process.exit(1); });
