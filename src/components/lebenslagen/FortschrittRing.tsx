interface FortschrittRingProps {
  erledigt: number;
  gesamt: number;
  /** „0/6" — vom Aufrufer lokalisiert (diese Datei kennt keine Keys). */
  zaehler: string;
  /** Kleinwort unter dem Zähler im Ring („erledigt"). */
  sub: string;
  /** Fetter Kurzsatz rechts neben dem Ring. */
  lead: string;
  /** Graue Erklärzeile. */
  hinweis?: string;
}

/**
 * Fortschritts-Block der Rail: dünner Ring mit dem Zähler IM Ring (Mockup-
 * Anatomie), Lead + Hinweis rechts daneben. Auf der Leistungsseite ehrlich im
 * 0-Zustand („Noch nicht gestartet"), in der Akte mit echtem Vollzugsstand.
 * Der Ring ist reine Doppelung des Zählers und darum `aria-hidden`.
 */
export function FortschrittRing({ erledigt, gesamt, zaehler, sub, lead, hinweis }: FortschrittRingProps) {
  const radius = 19;
  const umfang = 2 * Math.PI * radius;
  const anteil = gesamt > 0 ? Math.min(Math.max(erledigt / gesamt, 0), 1) : 0;
  const bogen = umfang * anteil;

  return (
    <div className="ak-ring">
      <div className="ak-ring-visual" aria-hidden="true">
        <svg className="ak-ring-svg" viewBox="0 0 44 44">
          <circle className="ak-ring-track" cx="22" cy="22" r={radius} />
          {anteil > 0 ? (
            <circle
              className="ak-ring-arc"
              cx="22"
              cy="22"
              r={radius}
              strokeDasharray={`${bogen} ${umfang - bogen}`}
              transform="rotate(-90 22 22)"
            />
          ) : null}
        </svg>
        <span className="ak-ring-center">
          <span className="ak-ring-zaehler">{zaehler}</span>
          <span className="ak-ring-sub">{sub}</span>
        </span>
      </div>
      <div className="ak-ring-text">
        <p className="ak-ring-lead">{lead}</p>
        {hinweis ? <p className="ak-ring-hint">{hinweis}</p> : null}
      </div>
    </div>
  );
}
