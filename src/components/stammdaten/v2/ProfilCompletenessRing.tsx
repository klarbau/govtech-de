'use client';

import { useTranslations } from 'next-intl';
import { format, parseISO } from 'date-fns';
import { de as deLocale } from 'date-fns/locale';

interface ProfilCompletenessRingProps {
  /** 0–100. */
  percent: number;
  /** ISO timestamp of the most recent change (drives the „Letzte Aktualisierung"-line). */
  letzteAktualisierungIso?: string;
}

const RADIUS = 42;
const STROKE = 8;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/**
 * Green-bento — profile-completeness donut ring (Spec § 5.1).
 *
 * SVG donut with a neutral track + a green progress arc starting at 12 o'clock.
 * Percent is computed deterministically in the view (no randomness here). The
 * SVG group is `role="img"` with a spoken label; the decorative circles are
 * `aria-hidden`.
 */
export function ProfilCompletenessRing({
  percent,
  letzteAktualisierungIso,
}: ProfilCompletenessRingProps) {
  const t = useTranslations('stammdaten.ring');

  const safePercent = Math.max(0, Math.min(100, Math.round(percent)));
  const dashOffset = CIRCUMFERENCE * (1 - safePercent / 100);
  const aktualisierung = letzteAktualisierungIso
    ? formatDeDateTime(letzteAktualisierungIso)
    : null;

  return (
    <div
      className="flex flex-col items-center text-center"
      data-testid="v2-completeness-ring"
    >
      <span
        role="img"
        aria-label={t('aria', { percent: safePercent })}
        className="relative inline-flex size-24 items-center justify-center"
      >
        <svg
          viewBox="0 0 100 100"
          className="size-24 -rotate-90"
          aria-hidden="true"
        >
          <circle
            cx="50"
            cy="50"
            r={RADIUS}
            fill="none"
            stroke="var(--color-surface-muted)"
            strokeWidth={STROKE}
          />
          <circle
            cx="50"
            cy="50"
            r={RADIUS}
            fill="none"
            stroke="var(--color-success)"
            strokeWidth={STROKE}
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={dashOffset}
          />
        </svg>
        <span
          aria-hidden="true"
          className="absolute text-2xl font-bold text-text-primary tabular-nums"
        >
          {safePercent}%
        </span>
      </span>
      <p className="mt-2 text-sm font-medium text-text-secondary">
        {t('label')}
      </p>
      {aktualisierung ? (
        <p className="mt-0.5 text-xs text-text-muted">
          {t('letzte_aktualisierung', { datum: aktualisierung })}
        </p>
      ) : null}
    </div>
  );
}

function formatDeDateTime(iso: string): string {
  try {
    return format(parseISO(iso), "dd.MM.yyyy, HH:mm 'Uhr'", { locale: deLocale });
  } catch {
    return iso;
  }
}
