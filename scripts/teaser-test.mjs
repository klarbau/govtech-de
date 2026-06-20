/**
 * teaser-test.mjs — ONE cheap probe clip to settle the question:
 * does a generative i2v model keep dense UI text legible when it MOVES the
 * screen (horizontal pan) instead of zooming? Generates a single 5s clip on the
 * most text-heavy product panel (the resilient cascade) with a pure horizontal
 * camera move (the user's "двигать экраны" idea) and downloads it so we can
 * judge the text with our own eyes.
 *
 *   $env:AIMLAPI_KEY = '<key>'; node scripts/teaser-test.mjs
 *   node scripts/teaser-test.mjs --file 10-code-verify.png --move zoom   # other probe
 *
 * Output: demo-recording/teaser/test-<file>.mp4   (~$0.3-0.5, only billed if it completes)
 */
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';

const KEY = process.env.AIMLAPI_KEY || process.env.AIMLAPI_API_KEY;
if (!KEY) { console.error('Set AIMLAPI_KEY first.'); process.exit(1); }

const API = 'https://api.aimlapi.com/v2/video/generations';
const MODEL = 'klingai/v2-master-image-to-video';
const a = process.argv.slice(2);
const arg = (f, d) => { const i = a.indexOf(f); return i !== -1 && a[i + 1] ? a[i + 1] : d; };
const FILE = arg('--file', '02-cascade.png');
const MOVE = arg('--move', 'pan'); // pan | zoom

const camera = MOVE === 'zoom'
  ? { type: 'simple', config: { zoom: 5 } }
  : { type: 'simple', config: { horizontal: 5 } };
const prompt = MOVE === 'zoom'
  ? 'A German government web UI panel. Slow steady cinematic push-in. The interface stays perfectly sharp, still and unchanged — only the camera moves. No text changes, no new elements.'
  : 'A German government web UI panel full of small legal text. Slow steady horizontal camera move across the panel (the screen slides), like a dolly. The interface stays perfectly sharp, still and unchanged — only the camera moves. No text changes, no morphing, no new elements.';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const main = async () => {
  await mkdir('demo-recording/teaser', { recursive: true });
  const buf = await readFile(join('demo-recording/refs', FILE));
  const image_url = `data:image/png;base64,${buf.toString('base64')}`;
  console.log(`probe: ${FILE}  move=${MOVE}  model=${MODEL}`);

  const res = await fetch(API, {
    method: 'POST',
    headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: MODEL, prompt, image_url, duration: 5, cfg_scale: 0.5,
      negative_prompt: 'warped text, morphing letters, distorted UI, changing words, gibberish, flickering text, hallucinated elements, blurry text, melting interface',
      camera_control: camera,
    }),
  });
  const created = await res.json().catch(() => ({}));
  if (!res.ok || created.error) { console.error(`create failed (${res.status}):`, JSON.stringify(created.error ?? created)); process.exit(1); }
  const id = created.id;
  console.log(`created: ${id} — polling (Kling ~5-6 min)...`);

  for (let i = 0; i < 240; i += 1) {
    const r = await fetch(`${API}?generation_id=${encodeURIComponent(id)}`, { headers: { Authorization: `Bearer ${KEY}` } });
    const j = await r.json().catch(() => ({}));
    if (j.status === 'completed' && j.video?.url) {
      const out = join('demo-recording/teaser', `test-${FILE.replace(/\.png$/, '')}-${MOVE}.mp4`);
      await writeFile(out, Buffer.from(await (await fetch(j.video.url)).arrayBuffer()));
      console.log(`\n✓ done → ${out}   credits_used=${j.meta?.usage?.credits_used ?? '?'}`);
      return;
    }
    if (j.status === 'error') { console.error('\nerrored:', JSON.stringify(j.error)); process.exit(1); }
    process.stdout.write(`  ${i * 8}s · ${j.status ?? '...'}        \r`);
    await sleep(8000);
  }
  console.error('\ntimed out'); process.exit(1);
};
main().catch((e) => { console.error(e); process.exit(1); });
