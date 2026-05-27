/**
 * redesign-foundation (2026-05-27) — color-token verifier suite.
 *
 * Source of truth: `src/app/globals.css` :root (LIGHT) + .dark (DARK).
 *
 * SUPERSEDES the design-system-v2 `--ds-color-* oklch()` contract. The
 * foundation redesign consolidates onto ONE cool-neutral, white-surface,
 * single-cobalt token set declared as plain `--color-*: #hex` variables
 * (see docs/specs/redesign-foundation.md § 6.A and docs/demo-spine.md). The
 * old warm-neutral OKLCH tokens no longer exist in globals.css, so this suite
 * is re-pointed at the new hex set and recomputes the contrast floors against
 * the new values.
 *
 * Test gates:
 *  (1) HL-DS-7 — caption/muted contrast floor. `--color-text-muted` must clear
 *      ~5.6:1 against BOTH `--color-surface` and `--color-surface-muted` in
 *      light and dark (the muted role lands on tinted rows, not only white).
 *  (2) Foundation a11y blockers (a11y-tester 2026-05-27) must stay fixed:
 *      - dark primary on accent-soft (active nav pill) >= 4.5:1
 *      - light danger on danger-soft >= 4.5:1
 *      - light success on success-soft >= 4.5:1
 *  (3) text-primary body floor >= 12:1 both modes.
 *  (4) Snapshot — explicit hex values pinned so any drift forces an
 *      intentional update of this test.
 *
 * Implementation note: a tiny sRGB-hex -> WCAG relative-luminance pipeline is
 * inlined to avoid a `culori`/`colorjs.io` dev-dep (CLAUDE.md Rule 8).
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, test } from 'vitest';

const REPO_ROOT = join(__dirname, '..', '..');
const GLOBALS_CSS = readFileSync(
  join(REPO_ROOT, 'src', 'app', 'globals.css'),
  'utf-8',
);

// ----- sRGB hex -> WCAG relative luminance -----

function channelLinear(c8: number): number {
  const c = c8 / 255;
  return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

/** WCAG 2.1 relative luminance per https://www.w3.org/TR/WCAG21/#dfn-relative-luminance */
function relativeLuminance(hex: string): number {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return (
    0.2126 * channelLinear(r) +
    0.7152 * channelLinear(g) +
    0.0722 * channelLinear(b)
  );
}

function contrastRatio(a: string, b: string): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const lighter = Math.max(la, lb);
  const darker = Math.min(la, lb);
  return (lighter + 0.05) / (darker + 0.05);
}

// ----- Sanity-check the pipeline against known reference points -----
describe('hex -> luminance pipeline self-test', () => {
  test('black/white reference contrast = 21:1', () => {
    expect(relativeLuminance('#000000')).toBeCloseTo(0, 4);
    expect(relativeLuminance('#FFFFFF')).toBeCloseTo(1, 4);
    expect(contrastRatio('#000000', '#FFFFFF')).toBeCloseTo(21, 1);
  });
});

// ----- Token extraction -----
// The foundation token set lives in two blocks:
//   - the first `:root {` that declares `--color-surface:` (LIGHT)
//   - the first top-level `.dark {` that declares `--color-surface:` (DARK)
// We deliberately skip the @theme / @media print / prefers-contrast overrides.

function extractBalancedBlock(css: string, openerRegex: RegExp): string {
  let m: RegExpExecArray | null;
  while ((m = openerRegex.exec(css)) !== null) {
    let depth = 1;
    const start = m.index + m[0].length;
    let end = start;
    while (end < css.length && depth > 0) {
      end++;
      if (css[end] === '{') depth++;
      else if (css[end] === '}') depth--;
    }
    const body = css.slice(start, end);
    if (/--color-surface:\s*#/.test(body)) return body;
  }
  throw new Error('No block declaring --color-surface: #hex found.');
}

const LIGHT_BLOCK = extractBalancedBlock(GLOBALS_CSS, /:root\s*\{/g);
const DARK_BLOCK = extractBalancedBlock(GLOBALS_CSS, /\n\.dark\s*\{/g);

function parseHexTokens(block: string): Map<string, string> {
  const re = /(--color-[a-z0-9-]+):\s*(#[0-9A-Fa-f]{6})\b/g;
  const out = new Map<string, string>();
  let m: RegExpExecArray | null;
  while ((m = re.exec(block)) !== null) {
    out.set(m[1]!, m[2]!.toUpperCase());
  }
  return out;
}

const LIGHT = parseHexTokens(LIGHT_BLOCK);
const DARK = parseHexTokens(DARK_BLOCK);

function tok(map: Map<string, string>, name: string): string {
  const v = map.get(name);
  if (!v) throw new Error('Token not found: ' + name);
  return v;
}

// ----- HL-DS-7 — caption / muted contrast floor -----
describe('HL-DS-7 — muted/caption contrast floor (redesign-foundation)', () => {
  // ~5.6:1 floor that must hold against BOTH white surface AND the tinted
  // surface-muted (muted text lands on hover rows / inactive pills too).
  const FLOOR = 5.6;

  test('LIGHT text-muted vs surface >= ~5.6:1', () => {
    const ratio = contrastRatio(
      tok(LIGHT, '--color-text-muted'),
      tok(LIGHT, '--color-surface'),
    );
    expect(ratio, `light muted vs surface = ${ratio.toFixed(2)}:1`).toBeGreaterThanOrEqual(FLOOR);
  });

  test('LIGHT text-muted vs surface-muted >= ~5.6:1', () => {
    const ratio = contrastRatio(
      tok(LIGHT, '--color-text-muted'),
      tok(LIGHT, '--color-surface-muted'),
    );
    expect(ratio, `light muted vs surface-muted = ${ratio.toFixed(2)}:1`).toBeGreaterThanOrEqual(FLOOR);
  });

  test('DARK text-muted vs surface >= ~5.6:1', () => {
    const ratio = contrastRatio(
      tok(DARK, '--color-text-muted'),
      tok(DARK, '--color-surface'),
    );
    expect(ratio, `dark muted vs surface = ${ratio.toFixed(2)}:1`).toBeGreaterThanOrEqual(FLOOR);
  });

  test('DARK text-muted vs surface-muted >= ~5.6:1', () => {
    const ratio = contrastRatio(
      tok(DARK, '--color-text-muted'),
      tok(DARK, '--color-surface-muted'),
    );
    expect(ratio, `dark muted vs surface-muted = ${ratio.toFixed(2)}:1`).toBeGreaterThanOrEqual(FLOOR);
  });

  test('text-secondary clears AA (>= 4.5:1) on surface, both modes', () => {
    expect(
      contrastRatio(tok(LIGHT, '--color-text-secondary'), tok(LIGHT, '--color-surface')),
    ).toBeGreaterThanOrEqual(4.5);
    expect(
      contrastRatio(tok(DARK, '--color-text-secondary'), tok(DARK, '--color-surface')),
    ).toBeGreaterThanOrEqual(4.5);
  });
});

// ----- Foundation a11y blockers (2026-05-27) must stay fixed -----
describe('redesign-foundation a11y blockers — contrast regressions', () => {
  const AA = 4.5;

  test('DARK primary on accent-soft (active nav pill) >= 4.5:1', () => {
    const ratio = contrastRatio(
      tok(DARK, '--color-primary'),
      tok(DARK, '--color-accent-soft'),
    );
    expect(ratio, `dark primary on accent-soft = ${ratio.toFixed(2)}:1`).toBeGreaterThanOrEqual(AA);
  });

  test('LIGHT primary on accent-soft (active nav pill) >= 4.5:1', () => {
    const ratio = contrastRatio(
      tok(LIGHT, '--color-primary'),
      tok(LIGHT, '--color-accent-soft'),
    );
    expect(ratio, `light primary on accent-soft = ${ratio.toFixed(2)}:1`).toBeGreaterThanOrEqual(AA);
  });

  test('LIGHT danger text on danger-soft >= 4.5:1', () => {
    const ratio = contrastRatio(
      tok(LIGHT, '--color-danger'),
      tok(LIGHT, '--color-danger-soft'),
    );
    expect(ratio, `light danger on danger-soft = ${ratio.toFixed(2)}:1`).toBeGreaterThanOrEqual(AA);
  });

  test('LIGHT success text on success-soft >= 4.5:1', () => {
    const ratio = contrastRatio(
      tok(LIGHT, '--color-success'),
      tok(LIGHT, '--color-success-soft'),
    );
    expect(ratio, `light success on success-soft = ${ratio.toFixed(2)}:1`).toBeGreaterThanOrEqual(AA);
  });
});

// ----- text-primary body floor -----
describe('text-primary body-floor >= 12:1 both modes', () => {
  test('LIGHT text-primary vs surface >= 12:1', () => {
    expect(
      contrastRatio(tok(LIGHT, '--color-text-primary'), tok(LIGHT, '--color-surface')),
    ).toBeGreaterThanOrEqual(12);
  });
  test('DARK text-primary vs surface >= 12:1', () => {
    expect(
      contrastRatio(tok(DARK, '--color-text-primary'), tok(DARK, '--color-surface')),
    ).toBeGreaterThanOrEqual(12);
  });
});

// ----- Snapshot — pin the foundation hex token set -----
describe('redesign-foundation snapshot — hex token values pinned', () => {
  // Drift-detector. If any of these change, edit this test in the same PR so
  // the contrast recompute above is consciously re-reviewed.
  test('LIGHT token values', () => {
    const expected: Record<string, string> = {
      '--color-surface': '#FFFFFF',
      '--color-surface-page': '#F7F8FA',
      '--color-surface-raised': '#FFFFFF',
      '--color-surface-muted': '#EEF1F5',
      '--color-border': '#E3E7ED',
      '--color-border-strong': '#C7CDD6',
      '--color-text-primary': '#1A1F2A',
      '--color-text-secondary': '#4B5563',
      '--color-text-muted': '#545C69',
      '--color-primary': '#2563EB',
      '--color-primary-hover': '#1D4FD8',
      '--color-primary-active': '#1A45BE',
      '--color-accent-soft': '#EAF1FE',
      '--color-success': '#137034',
      '--color-success-soft': '#E7F6EC',
      '--color-warning': '#B45309',
      '--color-warning-soft': '#FEF3DA',
      '--color-danger': '#B91C1C',
      '--color-danger-soft': '#FCE8E8',
      '--color-info': '#2563EB',
      '--color-info-soft': '#EAF1FE',
    };
    for (const [name, hex] of Object.entries(expected)) {
      expect(tok(LIGHT, name), name).toBe(hex);
    }
  });

  test('DARK token values', () => {
    const expected: Record<string, string> = {
      '--color-surface': '#1A1E27',
      '--color-surface-page': '#13161D',
      '--color-surface-raised': '#1A1E27',
      '--color-surface-muted': '#242935',
      '--color-border': '#2C3340',
      '--color-border-strong': '#404A5B',
      '--color-text-primary': '#ECEFF4',
      '--color-text-secondary': '#B6BDC9',
      '--color-text-muted': '#9AA2B0',
      '--color-primary': '#5B8DEF',
      '--color-primary-hover': '#4F82EC',
      '--color-primary-active': '#3F74E6',
      '--color-accent-soft': '#152038',
      '--color-success': '#5CC98A',
      '--color-success-soft': '#13351F',
      '--color-warning': '#E3B341',
      '--color-warning-soft': '#3A2C0E',
      '--color-danger': '#F2837C',
      '--color-danger-soft': '#3A1714',
      '--color-info': '#5B8DEF',
      '--color-info-soft': '#152038',
    };
    for (const [name, hex] of Object.entries(expected)) {
      expect(tok(DARK, name), name).toBe(hex);
    }
  });
});

describe('HL-DS-1 — BundesSans ban remains in force', () => {
  test('globals.css does not mention BundesSans', () => {
    expect(GLOBALS_CSS).not.toMatch(/BundesSans/i);
  });
});
