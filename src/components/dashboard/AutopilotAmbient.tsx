/** Pfad-Koordinaten im 390×300-viewBox; Endpunkte tragen die Knoten. */
const LINES = [
  'M 40 250 C 80 215, 100 190, 120 170',
  'M 120 170 C 160 190, 195 205, 230 210',
  'M 230 210 C 265 190, 300 165, 330 140',
  'M 120 170 C 145 210, 155 245, 170 275',
  'M 230 210 C 255 230, 275 250, 300 265',
];

const NODES: Array<[number, number, number]> = [
  [40, 250, 3],
  [120, 170, 3.5],
  [230, 210, 3.5],
  [330, 140, 3],
  [170, 275, 2.5],
  [300, 265, 2.5],
];

const COMETS = [
  { d: LINES[0], cls: 'apx-c1' },
  { d: LINES[2], cls: 'apx-c2' },
  { d: LINES[4], cls: 'apx-c3' },
];

/**
 * Rein dekoratives Once-Only-Netz für die Leerzone unter kurzen Modul-Slides
 * des mobilen Dashboards (mobile-shelves.md Nachtrag). Bewusst abstrakt und
 * unbeschriftet — es behauptet keine laufende Übermittlung. Sichtbarkeit,
 * Farben und alle Animationen liegen in prototype-v2.css (apx-*-Block,
 * nur ≤767px, prefers-reduced-motion-sicher).
 */
export function AutopilotAmbient() {
  return (
    // Inline display:none ist der Stale-CSS-Guard: ein Client ohne die
    // apx-Regeln (HMR-/Cache-Fenster) zeigt sonst den rohen SVG-Block
    // (schwarze Default-Fills, In-Flow-Höhe). Das apx-CSS überstimmt den
    // Inline-Wert per !important (≤767). Das `hidden`-Attribut taugt hier
    // nicht: Tailwind-Preflight setzt [hidden] selbst mit !important.
    <div className="apx-ambient" style={{ display: 'none' }} aria-hidden="true">
      <div className="apx-aura" />
      <svg
        className="apx-net"
        viewBox="0 0 390 300"
        preserveAspectRatio="xMidYMax meet"
        focusable="false"
      >
        {LINES.map((d) => (
          <path key={d} className="apx-line" d={d} />
        ))}
        {NODES.map(([cx, cy, r]) => (
          <circle key={`${cx}-${cy}`} className="apx-node" cx={cx} cy={cy} r={r} />
        ))}
        {COMETS.map((comet) => (
          <path
            key={comet.cls}
            className={`apx-comet ${comet.cls}`}
            d={comet.d}
            pathLength={100}
          />
        ))}
      </svg>
    </div>
  );
}
