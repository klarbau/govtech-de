/**
 * Brand mark used by both the topbar logo (.gt-brand-logo svg) and the
 * sidebar crest (.gt-sidebar-brand .crest svg).
 *
 * Brandbook §02 „Waldgrün" v1.0: a filled rounded square in Waldgrün (#0F3D2E)
 * with a white angular corner-bracket („⌐") glyph in the upper-left — two white
 * strokes meeting at a right angle. Self-coloured (NOT currentColor) so the mark
 * always renders green-with-white wherever it is used. Decorative → aria-hidden;
 * the wordmark („GovTech-DE") carries the accessible name beside it.
 */
export function ParthenonCrest() {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* Filled Waldgrün rounded square — self-coloured, not currentColor. */}
      <rect x="0" y="0" width="32" height="32" rx="7" fill="#0F3D2E" />
      {/* White corner-bracket „⌐": horizontal stroke (top) meeting a vertical
          stroke (down) at a right angle in the upper-left. */}
      <path
        d="M10 10.5H20.5M10 10.5V21"
        stroke="#FFFFFF"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
