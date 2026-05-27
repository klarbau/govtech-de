/**
 * redesign-foundation (2026-05-27) — HL-DS-10 regression guard.
 *
 * Source of truth: docs/specs/redesign-foundation.md § 6.A "Behörden-Kategorie-
 * Badges bekommen KEINE Farbe (HL-DS-10)" + § 6.B B6/§ 11.
 *
 * The `BehoerdenBadge` monogram MUST render identically across every
 * Behörden-Kategorie (bund / land / kommune / sozialversicherung / privat):
 * the same neutral surface, the same neutral text colour, no per-kategorie
 * tint. This is the cross-cutting invariant all 10 screens rely on — a colour
 * class slipping into this primitive would leak a kategorie signal through
 * colour alone (WCAG 1.4.1 use-of-colour) on every screen at once.
 *
 * Strategy: this is a Node-environment source-analysis guard (consistent with
 * the rest of tests/unit/**, which run without jsdom/Testing-Library). It
 * asserts on the component source that:
 *   (1) no colour-bearing Tailwind utility appears (semantic role colours,
 *       raw palette colours, or *-soft tints) — only neutral surface/text
 *       utilities are permitted;
 *   (2) the `kategorie` value is never mapped to a className (no switch /
 *       Record / ternary keyed on kategorie that yields a class), so the
 *       computed appearance cannot diverge per kategorie.
 *
 * A pure source-grep (rather than a DOM render) is the stronger guard here:
 * it catches a forbidden class the instant it is written, regardless of which
 * kategorie a future test happens to render.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, test } from 'vitest';

const REPO_ROOT = join(__dirname, '..', '..');
const BADGE_PATH = join(
  REPO_ROOT,
  'src',
  'components',
  'shared',
  'BehoerdenBadge.tsx',
);
const SOURCE = readFileSync(BADGE_PATH, 'utf-8');

/**
 * Only the className string literals are relevant — JSDoc and prop comments
 * legitimately mention "colour"/"HL-DS-10" in prose. Extract the contents of
 * every `className={cn(...)}` / `className="..."` so prose can never trip the
 * grep, and so the assertion is about what actually ships to the DOM.
 */
function extractClassNameLiterals(source: string): string[] {
  const literals: string[] = [];
  const stringLiteral = /(["'`])((?:\\.|(?!\1).)*)\1/g;
  // Walk only the regions that follow a `className`.
  const classNameRegions = source.split('className');
  for (let i = 1; i < classNameRegions.length; i += 1) {
    // Look at a generous window after each `className` for string literals.
    const window = classNameRegions[i].slice(0, 600);
    let match: RegExpExecArray | null;
    stringLiteral.lastIndex = 0;
    while ((match = stringLiteral.exec(window)) !== null) {
      literals.push(match[2]);
    }
  }
  return literals;
}

const CLASS_LITERALS = extractClassNameLiterals(SOURCE);
const ALL_CLASSES = CLASS_LITERALS.join(' ')
  .split(/\s+/)
  .filter((c) => c.length > 0);

// Neutral, structural utilities that are identical across all kategorien and
// therefore allowed. Anything tinted is forbidden.
const ALLOWED_COLOUR_CLASSES = new Set([
  'bg-surface',
  'bg-surface-muted',
  'bg-surface-raised',
  'bg-surface-page',
  'bg-card',
  'bg-transparent',
  'text-text-primary',
  'text-text-secondary',
  'text-text-muted',
  'border-border',
  'border-border-strong',
]);

// Semantic role colours + raw palette families that would carry a signal.
const SEMANTIC_ROLES = [
  'primary',
  'accent',
  'accent-soft',
  'success',
  'warning',
  'danger',
  'destructive',
  'info',
  'info-soft',
  'success-soft',
  'warning-soft',
  'danger-soft',
];
const RAW_PALETTES = [
  'slate',
  'gray',
  'zinc',
  'neutral',
  'stone',
  'red',
  'orange',
  'amber',
  'yellow',
  'lime',
  'green',
  'emerald',
  'teal',
  'cyan',
  'sky',
  'blue',
  'indigo',
  'violet',
  'purple',
  'fuchsia',
  'pink',
  'rose',
];
const COLOUR_PREFIXES = ['bg', 'text', 'border', 'ring', 'fill', 'stroke', 'from', 'to', 'via'];

function isColourBearing(cls: string): boolean {
  // Strip a leading responsive/state variant chain (e.g. `dark:hover:`).
  const base = cls.includes(':') ? cls.slice(cls.lastIndexOf(':') + 1) : cls;
  if (ALLOWED_COLOUR_CLASSES.has(base)) return false;
  for (const prefix of COLOUR_PREFIXES) {
    if (!base.startsWith(`${prefix}-`)) continue;
    const rest = base.slice(prefix.length + 1);
    if (SEMANTIC_ROLES.some((role) => rest === role || rest.startsWith(`${role}-`)))
      return true;
    if (RAW_PALETTES.some((p) => rest === p || rest.startsWith(`${p}-`))) return true;
  }
  return false;
}

describe('HL-DS-10 — BehoerdenBadge renders no colour', () => {
  test('extracts at least the monogram + name className literals', () => {
    // Sanity: the grep actually found the classNames it is meant to guard.
    expect(ALL_CLASSES.length).toBeGreaterThan(0);
    expect(ALL_CLASSES).toContain('bg-surface-muted');
  });

  test('no colour-bearing Tailwind utility class appears', () => {
    const offenders = ALL_CLASSES.filter(isColourBearing);
    expect(offenders).toEqual([]);
  });

  test('the monogram uses only the neutral surface + neutral text colours', () => {
    // The kategorie-neutral chip: same surface + same text for every authority.
    expect(ALL_CLASSES).toContain('bg-surface-muted');
    expect(ALL_CLASSES).toContain('text-text-secondary');
    expect(ALL_CLASSES).toContain('text-text-primary');
  });

  test('kategorie is never mapped to a className (no per-kategorie colour branch)', () => {
    // A colour leak would require turning the kategorie value into a class.
    // Forbid switch/Record/ternary constructs that read `kategorie` AND emit a
    // colour utility — and the simplest tell: any colour class adjacent to a
    // `kategorie` reference. We assert the strong invariant that no colour
    // class exists at all (covered above) PLUS that kategorie is not consumed
    // to compute styling: it is only used as a text label (showKategorie /
    // kategorieLabel), never inside a className expression.
    const kategorieInClassName =
      /className=\{[^}]*\bkategorie\b[^}]*\}/.test(SOURCE);
    expect(kategorieInClassName).toBe(false);

    // No object/Record literal keyed by the kategorie enum values producing
    // colour utilities (e.g. `{ bund: 'bg-blue-…' }`).
    const kategorieColourRecord =
      /\b(bund|land|kommune|kommunal|sozialversicherung|privat)\b\s*:\s*['"`][^'"`]*\b(bg|text|border)-(?!surface|text|border|transparent|card)/.test(
        SOURCE,
      );
    expect(kategorieColourRecord).toBe(false);
  });
});
