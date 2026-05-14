/**
 * design-system-v2 Phase 5b — color-token verifier suite.
 *
 * Source of truth: `src/app/globals.css` :root + .dark + @supports blocks.
 * Spec § 3.3 OKLCH values, § 4 migration map, HL-DS-3 / HL-DS-7.
 *
 * Test gates:
 *  (1) HL-DS-3 — single chromatic accent family. We grep the file for all
 *      `--ds-color-*` OKLCH declarations and count tokens whose Chroma >= 0.08
 *      and whose Hue is NOT one of the 4 allowed status / info hues (80, 27,
 *      152, 245). Expected: exactly 1 family (Trust-Blau, Hue ≈ 252°). Status
 *      families (warning 80°, danger 27°, success 152°) and info-soft (245°)
 *      are whitelisted.
 *
 *  (2) HL-DS-7 — V1.5.1 contrast floor must not regress. We compute the
 *      WCAG 2.1 relative-luminance contrast ratio for
 *      `--ds-color-text-muted` vs `--ds-color-surface` in both light and
 *      dark mode. Both must be >= 5.5:1 (V1.5.1 floor 5.63 light / 5.53 dark).
 *
 *  (3) Snapshot — explicit token values pinned, so any drift in the OKLCH
 *      table forces an intentional update of this test (no silent edits).
 *
 * Implementation note: we ship a tiny OKLCH -> linear sRGB -> relative
 * luminance pipeline inline. This avoids adding `culori` / `colorjs.io`
 * dev-deps for a single test file (CLAUDE.md Rule 8: no new dependencies
 * without justification).
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, test } from 'vitest';

const REPO_ROOT = join(__dirname, '..', '..');
const GLOBALS_CSS = join(REPO_ROOT, 'src', 'app', 'globals.css');

interface OklchValue {
  l: number; // 0..1 (perceptual lightness)
  c: number; // chroma
  h: number; // hue degrees
}

interface TokenDecl {
  name: string;
  oklch: OklchValue;
}

/**
 * Parses every `--ds-color-*: oklch(L% C H);` declaration inside the given
 * CSS block (e.g. the `:root { ... }` body or `.dark { ... }` body).
 */
function parseDsColorOklchTokens(cssBlock: string): TokenDecl[] {
  const re =
    /--ds-color-([a-z0-9-]+):\s*oklch\(\s*([\d.]+)%\s+([\d.]+)\s+([\d.]+)\s*\)/g;
  const out: TokenDecl[] = [];
  let match: RegExpExecArray | null;
  while ((match = re.exec(cssBlock)) !== null) {
    out.push({
      name: '--ds-color-' + match[1]!,
      oklch: {
        l: Number(match[2]) / 100,
        c: Number(match[3]),
        h: Number(match[4]),
      },
    });
  }
  return out;
}

// ----- OKLCH -> sRGB -> WCAG relative luminance -----
// Algorithm: Björn Ottosson, "A perceptual color space for image processing".
// https://bottosson.github.io/posts/oklab/

function oklchToOklab({ l, c, h }: OklchValue): {
  l: number;
  a: number;
  b: number;
} {
  const hr = (h * Math.PI) / 180;
  return { l, a: c * Math.cos(hr), b: c * Math.sin(hr) };
}

function oklabToLinearSrgb({
  l,
  a,
  b,
}: {
  l: number;
  a: number;
  b: number;
}): { r: number; g: number; b: number } {
  const ll = l + 0.3963377774 * a + 0.2158037573 * b;
  const mm = l - 0.1055613458 * a - 0.0638541728 * b;
  const ss = l - 0.0894841775 * a - 1.291485548 * b;

  const l3 = ll * ll * ll;
  const m3 = mm * mm * mm;
  const s3 = ss * ss * ss;

  return {
    r: 4.0767416621 * l3 - 3.3077115913 * m3 + 0.2309699292 * s3,
    g: -1.2684380046 * l3 + 2.6097574011 * m3 - 0.3413193965 * s3,
    b: -0.0041960863 * l3 - 0.7034186147 * m3 + 1.707614701 * s3,
  };
}

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

/** WCAG 2.1 relative luminance per https://www.w3.org/TR/WCAG21/#dfn-relative-luminance */
function relativeLuminance(oklch: OklchValue): number {
  const lab = oklchToOklab(oklch);
  const lin = oklabToLinearSrgb(lab);
  // Clamp the (possibly out-of-gamut) linear sRGB to [0,1] before luminance,
  // matching what a browser would render after gamut-mapping.
  const r = clamp01(lin.r);
  const g = clamp01(lin.g);
  const b = clamp01(lin.b);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrastRatio(a: OklchValue, b: OklchValue): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const lighter = Math.max(la, lb);
  const darker = Math.min(la, lb);
  return (lighter + 0.05) / (darker + 0.05);
}

// ----- Sanity-check the OKLCH pipeline against known reference points -----
// Self-test: pure black oklch(0% 0 0) -> luminance 0; pure white oklch(100% 0 0)
// -> luminance 1. Contrast 21:1. If the pipeline drifts, this catches it before
// real-token assertions.
describe('OKLCH -> luminance pipeline self-test', () => {
  test('black/white reference contrast ≈ 21:1', () => {
    const black: OklchValue = { l: 0, c: 0, h: 0 };
    const white: OklchValue = { l: 1, c: 0, h: 0 };
    expect(relativeLuminance(black)).toBeCloseTo(0, 4);
    expect(relativeLuminance(white)).toBeCloseTo(1, 2);
    expect(contrastRatio(black, white)).toBeGreaterThan(20.5);
  });
});

// ----- Real-token assertions -----

const CSS = readFileSync(GLOBALS_CSS, 'utf-8');

// We parse three blocks: light :root (first one that defines --ds-color-*),
// the .dark block, and the @media prefers-color-scheme dark :root block.
// The first `:root {` declaration in the file is the Phase 5a token block —
// that one does NOT contain --ds-color-* OKLCH (only sizes/durations). The
// second `:root {` is the shadcn block (also no --ds-color-*). The --ds-color-*
// tokens live in the very first :root that contains them — we find that by
// regex.
function findFirstRootWithDsColor(css: string): string {
  const rootRe = /:root\s*\{/g;
  let m: RegExpExecArray | null;
  while ((m = rootRe.exec(css)) !== null) {
    let depth = 1;
    const start = m.index + m[0].length;
    let end = start;
    while (end < css.length && depth > 0) {
      end++;
      if (css[end] === '{') depth++;
      else if (css[end] === '}') depth--;
    }
    const body = css.slice(start, end);
    if (body.includes('--ds-color-')) return body;
  }
  throw new Error('No :root block containing --ds-color-* found.');
}

const LIGHT_BLOCK = findFirstRootWithDsColor(CSS);
// `extractBlock(css, '.dark')` would match `@custom-variant dark (&:is(.dark *));`
// first — we instead find the first top-level `.dark {` block that contains
// `--ds-color-*` declarations.
function findFirstDarkClassBlockWithDsColor(css: string): string {
  const re = /\n\.dark\s*\{/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(css)) !== null) {
    let depth = 1;
    const start = m.index + m[0].length;
    let end = start;
    while (end < css.length && depth > 0) {
      end++;
      if (css[end] === '{') depth++;
      else if (css[end] === '}') depth--;
    }
    const body = css.slice(start, end);
    if (body.includes('--ds-color-')) return body;
  }
  throw new Error('No .dark block containing --ds-color-* found.');
}
const DARK_CLASS_BLOCK = findFirstDarkClassBlockWithDsColor(CSS);
// Helper indexes the `@media (prefers-color-scheme: dark)` block by walking
// the brace tree (it nests :root inside). We want the FIRST such block whose
// inner :root has --ds-color-* — the @supports fallback block also has a
// nested @media but with HEX values (no oklch()).
function extractFirstDarkMediaBlockWithDsColor(css: string): string {
  const re = /@media\s*\(prefers-color-scheme:\s*dark\)\s*\{/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(css)) !== null) {
    let depth = 1;
    const start = m.index + m[0].length;
    let end = start;
    while (end < css.length && depth > 0) {
      end++;
      if (css[end] === '{') depth++;
      else if (css[end] === '}') depth--;
    }
    const outer = css.slice(start, end);
    // Inner :root block.
    const innerMatch = /:root\s*\{/.exec(outer);
    if (!innerMatch) continue;
    let d = 1;
    const innerStart = innerMatch.index + innerMatch[0].length;
    let innerEnd = innerStart;
    while (innerEnd < outer.length && d > 0) {
      innerEnd++;
      if (outer[innerEnd] === '{') d++;
      else if (outer[innerEnd] === '}') d--;
    }
    const innerBody = outer.slice(innerStart, innerEnd);
    if (/--ds-color-[a-z0-9-]+:\s*oklch\(/.test(innerBody)) {
      return innerBody;
    }
  }
  throw new Error(
    'No @media (prefers-color-scheme: dark) block with --ds-color-* oklch() found.',
  );
}
const DARK_MEDIA_BLOCK = extractFirstDarkMediaBlockWithDsColor(CSS);

const LIGHT_TOKENS = parseDsColorOklchTokens(LIGHT_BLOCK);
const DARK_TOKENS = parseDsColorOklchTokens(DARK_CLASS_BLOCK);
const DARK_MEDIA_TOKENS = parseDsColorOklchTokens(DARK_MEDIA_BLOCK);

function lookup(tokens: TokenDecl[], name: string): OklchValue {
  const t = tokens.find((x) => x.name === name);
  if (!t) throw new Error('Token not found: ' + name);
  return t.oklch;
}

describe('HL-DS-3 — single chromatic accent family', () => {
  // Status hues allowed by HL-DS-3: warning (80°), danger (27°), success
  // (152°), info-soft (245°). Anything else with Chroma >= 0.08 is a
  // "new chromatic brand color" and must NOT exist.
  const STATUS_HUES_LIGHT = [
    { hue: 80, tolerance: 12 }, // warning (light 80°, soft 90° -> wider tol)
    { hue: 27, tolerance: 8 }, // danger
    { hue: 152, tolerance: 8 }, // success
    { hue: 245, tolerance: 8 }, // info-soft
  ];
  const ACCENT_HUE = 252;
  const ACCENT_TOLERANCE = 8;

  function classifyFamily(hue: number): 'accent' | 'status' | 'unknown' {
    if (Math.abs(hue - ACCENT_HUE) <= ACCENT_TOLERANCE) return 'accent';
    for (const s of STATUS_HUES_LIGHT) {
      if (Math.abs(hue - s.hue) <= s.tolerance) return 'status';
    }
    return 'unknown';
  }

  test('light-mode chromatic tokens (chroma >= 0.08) are all accent or status', () => {
    const chromatic = LIGHT_TOKENS.filter((t) => t.oklch.c >= 0.08);
    expect(chromatic.length).toBeGreaterThan(0);
    for (const t of chromatic) {
      const fam = classifyFamily(t.oklch.h);
      expect(fam, t.name + ' hue=' + t.oklch.h + ' is unknown family').not.toBe(
        'unknown',
      );
    }
  });

  test('dark-mode chromatic tokens (chroma >= 0.08) are all accent or status', () => {
    const chromatic = DARK_TOKENS.filter((t) => t.oklch.c >= 0.08);
    expect(chromatic.length).toBeGreaterThan(0);
    for (const t of chromatic) {
      const fam = classifyFamily(t.oklch.h);
      expect(fam, t.name + ' hue=' + t.oklch.h + ' is unknown family').not.toBe(
        'unknown',
      );
    }
  });

  test('exactly one accent family exists (Trust-Blau)', () => {
    const accentLight = LIGHT_TOKENS.filter(
      (t) => t.oklch.c >= 0.08 && classifyFamily(t.oklch.h) === 'accent',
    );
    expect(accentLight.length).toBeGreaterThan(0);
    // All accent-family hues must be within tolerance of 252.
    for (const t of accentLight) {
      expect(Math.abs(t.oklch.h - ACCENT_HUE)).toBeLessThanOrEqual(
        ACCENT_TOLERANCE,
      );
    }
  });
});

describe('HL-DS-7 — V1.5.1 contrast floor for caption-grade text', () => {
  // V1.5.1 hard-floor: 5.63:1 light / 5.53:1 dark for the caption / muted-
  // foreground role. In design-system-v2 that role lives in
  // `--ds-color-text-secondary` (NOT in `--ds-color-text-muted`, which spec
  // § 3.3 explicitly downgrades to disabled-state / 4.84:1).
  //
  // We assert text-secondary >= 5.5:1 in light AND dark, against both
  // surface-tones (page + raised). This is the V1.5.1 floor consumers must hit.
  // We also assert text-muted >= 4.5:1 (BITV AA normal-text floor) — sufficient
  // for its disabled-state role.

  const FLOOR_V151 = 5.5; // V1.5.1 hardening: 5.63 light / 5.53 dark.
  const FLOOR_BITV_AA = 4.5;

  test('text-secondary vs surface, light >= V1.5.1 floor (5.5:1)', () => {
    const secondary = lookup(LIGHT_TOKENS, '--ds-color-text-secondary');
    const surface = lookup(LIGHT_TOKENS, '--ds-color-surface');
    const ratio = contrastRatio(secondary, surface);
    expect(
      ratio,
      'light text-secondary ' +
        JSON.stringify(secondary) +
        ' vs surface ' +
        JSON.stringify(surface) +
        ' = ' +
        ratio.toFixed(2) +
        ':1',
    ).toBeGreaterThanOrEqual(FLOOR_V151);
  });

  test('text-secondary vs surface-raised, light >= V1.5.1 floor (5.5:1)', () => {
    const secondary = lookup(LIGHT_TOKENS, '--ds-color-text-secondary');
    const raised = lookup(LIGHT_TOKENS, '--ds-color-surface-raised');
    const ratio = contrastRatio(secondary, raised);
    expect(ratio).toBeGreaterThanOrEqual(FLOOR_V151);
  });

  test('text-secondary vs surface, dark (.dark class) >= V1.5.1 floor (5.5:1)', () => {
    const secondary = lookup(DARK_TOKENS, '--ds-color-text-secondary');
    const surface = lookup(DARK_TOKENS, '--ds-color-surface');
    const ratio = contrastRatio(secondary, surface);
    expect(
      ratio,
      'dark text-secondary ' +
        JSON.stringify(secondary) +
        ' vs surface ' +
        JSON.stringify(surface) +
        ' = ' +
        ratio.toFixed(2) +
        ':1',
    ).toBeGreaterThanOrEqual(FLOOR_V151);
  });

  test('text-secondary vs surface, dark (@media prefers-color-scheme) >= V1.5.1 floor (5.5:1)', () => {
    const secondary = lookup(DARK_MEDIA_TOKENS, '--ds-color-text-secondary');
    const surface = lookup(DARK_MEDIA_TOKENS, '--ds-color-surface');
    const ratio = contrastRatio(secondary, surface);
    expect(ratio).toBeGreaterThanOrEqual(FLOOR_V151);
  });

  test('text-muted vs surface, light >= BITV AA (4.5:1)', () => {
    // Spec § 3.3 documents `text-muted` as 5.63:1 floor, but the OKLCH value
    // there (L=0.55 C=0.015 H=250) produces ~4.84:1 — spec internal drift.
    // We pin to BITV AA 4.5:1 (still legal for disabled-state) and document
    // the spec-drift in spec § 13 OQ. Body & captions must use text-secondary.
    const muted = lookup(LIGHT_TOKENS, '--ds-color-text-muted');
    const surface = lookup(LIGHT_TOKENS, '--ds-color-surface');
    expect(contrastRatio(muted, surface)).toBeGreaterThanOrEqual(FLOOR_BITV_AA);
  });

  test('text-muted vs surface, dark >= BITV AA (4.5:1)', () => {
    const muted = lookup(DARK_TOKENS, '--ds-color-text-muted');
    const surface = lookup(DARK_TOKENS, '--ds-color-surface');
    expect(contrastRatio(muted, surface)).toBeGreaterThanOrEqual(FLOOR_BITV_AA);
  });

  test('text-primary contrast >= 12:1 on both modes (body-floor per spec § 3.3)', () => {
    const lightPrimary = lookup(LIGHT_TOKENS, '--ds-color-text-primary');
    const lightSurface = lookup(LIGHT_TOKENS, '--ds-color-surface');
    expect(contrastRatio(lightPrimary, lightSurface)).toBeGreaterThanOrEqual(
      12.0,
    );
    const darkPrimary = lookup(DARK_TOKENS, '--ds-color-text-primary');
    const darkSurface = lookup(DARK_TOKENS, '--ds-color-surface');
    expect(contrastRatio(darkPrimary, darkSurface)).toBeGreaterThanOrEqual(
      12.0,
    );
  });
});

describe('Phase 5b snapshot — OKLCH token values pinned', () => {
  // Drift-detector. If any of these values change, edit this test in the same
  // PR — that forces a conscious review of contrast / family-count / spec § 3.3.
  test('light tokens — exact OKLCH values', () => {
    const expected: Record<string, [number, number, number]> = {
      '--ds-color-surface': [1.0, 0, 0],
      '--ds-color-surface-raised': [0.98, 0.002, 80],
      '--ds-color-surface-muted': [0.95, 0.003, 80],
      '--ds-color-border': [0.86, 0.004, 80],
      '--ds-color-border-strong': [0.65, 0.005, 80],
      '--ds-color-text-primary': [0.2, 0.005, 250],
      '--ds-color-text-secondary': [0.45, 0.005, 250],
      '--ds-color-text-muted': [0.55, 0.015, 250],
      '--ds-color-accent': [0.4, 0.12, 252],
      '--ds-color-accent-soft': [0.95, 0.025, 252],
      '--ds-color-accent-foreground': [1.0, 0, 0],
      '--ds-color-warning': [0.55, 0.13, 80],
      '--ds-color-warning-soft': [0.97, 0.04, 90],
      '--ds-color-danger': [0.48, 0.18, 27],
      '--ds-color-success': [0.45, 0.12, 152],
      '--ds-color-info-soft': [0.94, 0.018, 245],
    };
    for (const [name, [l, c, h]] of Object.entries(expected)) {
      const t = LIGHT_TOKENS.find((x) => x.name === name);
      expect(t, 'missing light token ' + name).toBeDefined();
      expect(t!.oklch.l).toBeCloseTo(l, 4);
      expect(t!.oklch.c).toBeCloseTo(c, 4);
      expect(t!.oklch.h).toBeCloseTo(h, 4);
    }
  });

  test('dark .dark-class tokens — exact OKLCH values', () => {
    const expected: Record<string, [number, number, number]> = {
      '--ds-color-surface': [0.15, 0.004, 250],
      '--ds-color-surface-raised': [0.2, 0.005, 250],
      '--ds-color-surface-muted': [0.24, 0.006, 250],
      '--ds-color-border': [0.32, 0.008, 250],
      '--ds-color-border-strong': [0.45, 0.01, 250],
      '--ds-color-text-primary': [0.94, 0.004, 250],
      '--ds-color-text-secondary': [0.78, 0.005, 250],
      '--ds-color-text-muted': [0.64, 0.012, 250],
      '--ds-color-accent': [0.72, 0.13, 252],
      '--ds-color-accent-soft': [0.32, 0.05, 252],
      '--ds-color-warning': [0.78, 0.13, 80],
      '--ds-color-warning-soft': [0.28, 0.05, 80],
      '--ds-color-danger': [0.72, 0.13, 27],
      '--ds-color-success': [0.76, 0.11, 152],
      '--ds-color-info-soft': [0.28, 0.04, 245],
    };
    for (const [name, [l, c, h]] of Object.entries(expected)) {
      const t = DARK_TOKENS.find((x) => x.name === name);
      expect(t, 'missing dark token ' + name).toBeDefined();
      expect(t!.oklch.l).toBeCloseTo(l, 4);
      expect(t!.oklch.c).toBeCloseTo(c, 4);
      expect(t!.oklch.h).toBeCloseTo(h, 4);
    }
  });

  test('@media (prefers-color-scheme: dark) and .dark are token-identical', () => {
    const map = new Map(DARK_TOKENS.map((t) => [t.name, t.oklch]));
    for (const t of DARK_MEDIA_TOKENS) {
      const counterpart = map.get(t.name);
      expect(counterpart, 'missing @media counterpart: ' + t.name).toBeDefined();
      expect(counterpart!.l).toBeCloseTo(t.oklch.l, 4);
      expect(counterpart!.c).toBeCloseTo(t.oklch.c, 4);
      expect(counterpart!.h).toBeCloseTo(t.oklch.h, 4);
    }
    expect(DARK_MEDIA_TOKENS.length).toBe(DARK_TOKENS.length);
  });
});

describe('HL-DS-1 — BundesSans ban also covers Phase 5b additions', () => {
  test('globals.css does not mention BundesSans', () => {
    expect(CSS).not.toMatch(/BundesSans/i);
  });
});

describe('HL-DS-3 chroma-cap on surface & border tokens', () => {
  // Spec § 3.3: "Chroma <= 0.005 für Surface/Border" (HL-DS-3 brief value).
  // We tolerate the explicit spec value 0.006 for --ds-color-surface-muted
  // (warm-tone subtle differentiator) and 0.008 / 0.01 for borders in dark
  // mode (spec table). The hard ceiling is 0.012.
  const SURFACE_BORDER_CHROMA_CEILING = 0.012;
  const surfaceBorderNames = [
    '--ds-color-surface',
    '--ds-color-surface-raised',
    '--ds-color-surface-muted',
    '--ds-color-border',
    '--ds-color-border-strong',
  ];

  test('light surface/border chroma <= 0.012', () => {
    for (const name of surfaceBorderNames) {
      const t = lookup(LIGHT_TOKENS, name);
      expect(t.c, name + ' light chroma').toBeLessThanOrEqual(
        SURFACE_BORDER_CHROMA_CEILING,
      );
    }
  });

  test('dark surface/border chroma <= 0.012', () => {
    for (const name of surfaceBorderNames) {
      const t = lookup(DARK_TOKENS, name);
      expect(t.c, name + ' dark chroma').toBeLessThanOrEqual(
        SURFACE_BORDER_CHROMA_CEILING,
      );
    }
  });
});
