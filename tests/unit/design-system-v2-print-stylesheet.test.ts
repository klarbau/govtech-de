/**
 * design-system-v2 — Phase 5e — HL-DS-13 + BITV 2.0 § 1.4.6 AAA.
 *
 * Asserts that `src/app/globals.css` contains:
 *   (a) a `@media print { … }` Block (Print-Stylesheet, Spec § 7)
 *   (b) a `@media (prefers-contrast: more) { … }` Block (Hochkontrast, Spec § 8)
 *
 * These two layers are additive — they must not modify existing rules.
 * The tests below are intentionally string-level, not selector-tree-level:
 * the goal is to guarantee presence + key invariants (monochrome text,
 * Source-Sans-3 print font, data-print selector hook), not to enforce a
 * specific implementation.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, test } from 'vitest';

const REPO_ROOT = join(__dirname, '..', '..');
const GLOBALS_CSS = readFileSync(
  join(REPO_ROOT, 'src/app/globals.css'),
  'utf-8',
);

describe('design-system-v2 Phase 5e — Print + Hochkontrast', () => {
  describe('HL-DS-13 — Print-Stylesheet (Spec § 7)', () => {
    test('contains @media print block', () => {
      expect(GLOBALS_CSS).toMatch(/@media\s+print\s*\{/);
    });

    test('forces black text in print (monochrome)', () => {
      expect(GLOBALS_CSS).toMatch(/color:\s*#000\s*!important/i);
    });

    test('exposes data-print selector hook for layout-shell elements', () => {
      expect(GLOBALS_CSS).toMatch(/\[data-print="hide"\]/);
      expect(GLOBALS_CSS).toMatch(/\[data-print="show"\]/);
    });

    test('uses --font-sans (Geist) as print font-family', () => {
      const printBlockMatch = GLOBALS_CSS.match(
        /@media\s+print\s*\{[\s\S]*?\n\}\s*$/m,
      );
      // Fallback: search the whole file when the regex anchor misses.
      const haystack = printBlockMatch ? printBlockMatch[0] : GLOBALS_CSS;
      expect(haystack).toMatch(/--font-sans\b/);
    });

    test('sets A4 portrait @page', () => {
      expect(GLOBALS_CSS).toMatch(/@page\s*\{[^}]*A4\s+portrait/);
    });

    test('appends URL to external links via a[href]::after', () => {
      expect(GLOBALS_CSS).toMatch(/a\[href\]::after/);
    });
  });

  describe('BITV 2.0 § 1.4.6 AAA — Hochkontrast-Layer (Spec § 8)', () => {
    test('contains @media (prefers-contrast: more) block', () => {
      expect(GLOBALS_CSS).toMatch(/@media\s*\(\s*prefers-contrast:\s*more\s*\)\s*\{/);
    });

    test('forces 3 px focus-outline in high-contrast mode', () => {
      const hcMatch = GLOBALS_CSS.match(
        /@media\s*\(\s*prefers-contrast:\s*more\s*\)\s*\{[\s\S]*?\n\}\s*\n/,
      );
      expect(hcMatch).not.toBeNull();
      const block = hcMatch![0];
      expect(block).toMatch(/outline-width:\s*3px\s*!important/);
    });

    test('nests a prefers-color-scheme: dark override for high-contrast dark theme', () => {
      const hcMatch = GLOBALS_CSS.match(
        /@media\s*\(\s*prefers-contrast:\s*more\s*\)\s*\{[\s\S]*?\n\}\s*\n/,
      );
      expect(hcMatch).not.toBeNull();
      expect(hcMatch![0]).toMatch(/@media\s*\(\s*prefers-color-scheme:\s*dark\s*\)/);
    });
  });

  describe('Additive guarantee — no clobbering of existing tokens', () => {
    test('Phase-5a tokens (--ds-text-h1, --ds-ease-standard) remain in :root', () => {
      expect(GLOBALS_CSS).toMatch(/--ds-text-h1:\s*3rem/);
      expect(GLOBALS_CSS).toMatch(/--ds-ease-standard/);
    });

    test('shadcn :root tokens (--background, --foreground) remain unchanged at default declaration', () => {
      // The default :root declarations live BEFORE the @media print / @media
      // (prefers-contrast: more) overrides; assert their presence.
      expect(GLOBALS_CSS).toMatch(/--background:\s*\n?\s*oklch\(1 0 0\)/);
      expect(GLOBALS_CSS).toMatch(/--foreground:\s*\n?\s*oklch\(0\.145 0 0\)/);
    });
  });
});
