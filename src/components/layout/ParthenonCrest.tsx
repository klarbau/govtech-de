/**
 * Parthenon mark used by both the topbar logo (.gt-brand-logo svg) and the
 * sidebar crest (.gt-sidebar-brand .crest svg). 1:1 copy of the inline SVG
 * from `docs/design-prototype-v2/assets/govtech.js`.
 */
export function ParthenonCrest() {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M16 3.5 3.5 9.5h25L16 3.5Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path
        d="M5 11.5V23M11 11.5V23M16 11.5V23M21 11.5V23M27 11.5V23"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <path
        d="M3 23.5h26M2 27h28"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}
