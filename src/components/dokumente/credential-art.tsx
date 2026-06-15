/**
 * credential-art.tsx — purely decorative SVG marks for the document-detail
 * preview (the faux „Urkunde" render): the Berlin-style Wappen emblem, a
 * deterministic synthetic QR block, and a round official stamp.
 *
 * All three are `[MOCK]` artefacts — they look like an amtliches Dokument but
 * carry no real data. The QR is generated deterministically from the document id
 * (stable across renders + SSR; no `Math.random`). Nothing here is interactive,
 * so the marks are `aria-hidden` where they only repeat text already on screen.
 */

import * as React from 'react';

/** Berlin-style heraldic emblem: a bear face on a white shield, red border. */
export function WappenEmblem({
  className,
  title,
}: {
  className?: string;
  title?: string;
}) {
  return (
    <svg
      viewBox="0 0 44 52"
      className={className}
      role={title ? 'img' : 'presentation'}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      focusable="false"
    >
      {/* Shield */}
      <path
        d="M3 3 H41 V29 C41 41 22 49 22 49 C22 49 3 41 3 29 Z"
        fill="#ffffff"
        stroke="#E2231A"
        strokeWidth="2.4"
        strokeLinejoin="round"
      />
      {/* Bear face */}
      <g fill="#16181d">
        <circle cx="14.5" cy="17" r="4.1" />
        <circle cx="29.5" cy="17" r="4.1" />
        <circle cx="22" cy="24" r="9.2" />
      </g>
      <ellipse cx="22" cy="27.5" rx="4.6" ry="3.6" fill="#f4d9c4" />
      <circle cx="22" cy="24.6" r="1.7" fill="#16181d" />
    </svg>
  );
}

/** Deterministic synthetic QR matrix (25×25) seeded by the document id. */
function buildQr(value: string): boolean[][] {
  const N = 25;
  const m: boolean[][] = Array.from({ length: N }, () =>
    Array<boolean>(N).fill(false),
  );

  const placeFinder = (r0: number, c0: number) => {
    for (let r = 0; r < 7; r++) {
      for (let c = 0; c < 7; c++) {
        const border = r === 0 || r === 6 || c === 0 || c === 6;
        const core = r >= 2 && r <= 4 && c >= 2 && c <= 4;
        m[r0 + r][c0 + c] = border || core;
      }
    }
  };
  placeFinder(0, 0);
  placeFinder(0, N - 7);
  placeFinder(N - 7, 0);

  // FNV-1a hash → seeded LCG, so the same id always yields the same pattern.
  let h = 2166136261;
  for (let i = 0; i < value.length; i++) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  let s = (h >>> 0) || 1;
  const rnd = () => {
    s = (Math.imul(s, 1103515245) + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };

  const inFinder = (r: number, c: number) =>
    (r < 8 && c < 8) || (r < 8 && c >= N - 8) || (r >= N - 8 && c < 8);

  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N; c++) {
      if (inFinder(r, c)) continue;
      m[r][c] = rnd() > 0.52;
    }
  }
  return m;
}

export function MockQr({
  value,
  className,
  title,
}: {
  value: string;
  className?: string;
  title?: string;
}) {
  const matrix = React.useMemo(() => buildQr(value), [value]);
  const N = matrix.length;
  return (
    <svg
      viewBox={`-1 -1 ${N + 2} ${N + 2}`}
      className={className}
      role="img"
      aria-label={title}
      shapeRendering="crispEdges"
    >
      <rect x={-1} y={-1} width={N + 2} height={N + 2} fill="#ffffff" />
      {matrix.flatMap((row, r) =>
        row.map((on, c) =>
          on ? (
            <rect key={`${r}-${c}`} x={c} y={r} width={1} height={1} fill="#0b0c0f" />
          ) : null,
        ),
      )}
    </svg>
  );
}

/** Round official stamp: double ring + curved authority text + center emblem. */
export function OfficialStamp({
  topText,
  bottomText,
  className,
}: {
  topText: string;
  bottomText: string;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 100 100"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <path id="stampArcTop" d="M 14,50 A 36,36 0 1 1 86,50" fill="none" />
        <path id="stampArcBottom" d="M 16,50 A 34,34 0 1 0 84,50" fill="none" />
      </defs>
      <g
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        opacity="0.9"
      >
        <circle cx="50" cy="50" r="47" />
        <circle cx="50" cy="50" r="40" />
      </g>
      <g fill="currentColor" opacity="0.95">
        <text fontSize="9.5" fontWeight={700} letterSpacing="1.1">
          <textPath href="#stampArcTop" startOffset="50%" textAnchor="middle">
            {topText}
          </textPath>
        </text>
        <text fontSize="9.5" fontWeight={700} letterSpacing="1.1">
          <textPath href="#stampArcBottom" startOffset="50%" textAnchor="middle">
            {bottomText}
          </textPath>
        </text>
        {/* center star */}
        <path
          d="M50 35 l3.4 7 7.6 0.7 -5.8 5 1.8 7.5 -7 -4 -7 4 1.8 -7.5 -5.8 -5 7.6 -0.7 Z"
          opacity="0.85"
        />
      </g>
    </svg>
  );
}
