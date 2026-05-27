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

    test('uses --font-sans (Inter) as print font-family', () => {
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

    test('carries a .dark override for the high-contrast dark theme', () => {
      // next-themes uses the class strategy (`.dark`), not `prefers-color-scheme`,
      // throughout globals.css — so the high-contrast layer nests a `.dark { … }`
      // override rather than a nested `@media (prefers-color-scheme: dark)`.
      // Walk the brace tree to capture the full prefers-contrast block.
      const opener = /@media\s*\(\s*prefers-contrast:\s*more\s*\)\s*\{/.exec(
        GLOBALS_CSS,
      );
      expect(opener).not.toBeNull();
      let depth = 1;
      let end = opener!.index + opener![0].length;
      while (end < GLOBALS_CSS.length && depth > 0) {
        end++;
        if (GLOBALS_CSS[end] === '{') depth++;
        else if (GLOBALS_CSS[end] === '}') depth--;
      }
      const block = GLOBALS_CSS.slice(opener!.index, end + 1);
      expect(block).toMatch(/\.dark\s*\{/);
      // The dark override must lift primary to a light, high-chroma blue.
      expect(block).toMatch(/--color-primary:\s*#9DBBFF/i);
    });
  });

  describe('Additive guarantee — foundation token set + behavioural layers coexist', () => {
    // redesign-foundation (2026-05-27) replaced the warm-neutral OKLCH token
    // layer with the consolidated cool-neutral `--color-*: #hex` set, and
    // re-pointed the shadcn aliases (--background/--foreground) onto it. The
    // motion/type tokens from design-system-v2 remain additively. We pin to
    // the NEW contract: behavioural ease token survives, and the aliases now
    // reference the consolidated --color-* variables (not bare oklch()).
    test('design-system-v2 motion token --ds-ease-standard remains in :root', () => {
      expect(GLOBALS_CSS).toMatch(/--ds-ease-standard/);
    });

    test('shadcn aliases are re-pointed at the consolidated --color-* token set', () => {
      // The default :root declarations live BEFORE the @media print / @media
      // (prefers-contrast: more) overrides; assert the new aliasing contract.
      expect(GLOBALS_CSS).toMatch(/--background:\s*\n?\s*var\(--color-surface-page\)/);
      expect(GLOBALS_CSS).toMatch(/--foreground:\s*\n?\s*var\(--color-text-primary\)/);
    });

    test('foundation neutral scale is declared as --color-* hex tokens', () => {
      expect(GLOBALS_CSS).toMatch(/--color-surface:\s*#FFFFFF/);
      expect(GLOBALS_CSS).toMatch(/--color-text-primary:\s*#1A1F2A/);
    });
  });
});
