import { Check, ChevronRight } from 'lucide-react';

export type SchrittKetteZustand = 'erledigt' | 'aktuell' | 'offen';

export interface SchrittKetteRow {
  position: number;
  label: string;
  /** Zuständige Stelle (Kurzform), zweite Zeile des Knotens. */
  stelle?: string;
  zustand: SchrittKetteZustand;
  /**
   * Klartext-Status für Screenreader (z. B. „Erledigt"). Farbe/Füllung ist nie
   * alleiniger Bedeutungsträger — ohne Label bleibt der Knoten reine Anzeige.
   */
  statusLabel?: string;
}

interface SchrittKetteProps {
  rows: SchrittKetteRow[];
  ariaLabel: string;
}

/**
 * Kompakte, berandete Schritt-Kette über die volle Breite — geteilt von der
 * Leistungsseite (Plan aus der Config) und der Lebenslage-Akte (Plan aus dem
 * Vorgang). Reine Anzeige: kein Klick, kein Hover, keine Fake-Affordanz.
 * Horizontal scrollbar und darum als Region fokussierbar (WCAG 2.1.1).
 */
export function SchrittKette({ rows, ariaLabel }: SchrittKetteProps) {
  if (rows.length === 0) return null;

  return (
    <div className="ak-kette" role="group" aria-label={ariaLabel} tabIndex={0}>
      <ol className="ak-kette-track">
        {rows.map((row, idx) => (
          <li key={row.position} className={`ak-knoten is-${row.zustand}`}>
            <span className="ak-knoten-num" aria-hidden="true">
              {row.zustand === 'erledigt' ? <Check /> : row.position}
            </span>
            <span className="ak-knoten-body">
              <span className="ak-knoten-label">{row.label}</span>
              {row.stelle ? <span className="ak-knoten-stelle">{row.stelle}</span> : null}
              {row.statusLabel ? <span className="sr-only">{row.statusLabel}</span> : null}
            </span>
            {idx < rows.length - 1 ? (
              <ChevronRight className="ak-knoten-sep" aria-hidden="true" />
            ) : null}
          </li>
        ))}
      </ol>
    </div>
  );
}
