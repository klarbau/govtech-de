'use client';

import { useTranslations } from 'next-intl';

import { formatDateDe, formatTimeDe } from '@/lib/utils';

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
  const tFmt = useTranslations('stammdaten.format');

  const safePercent = Math.max(0, Math.min(100, Math.round(percent)));
  const dashOffset = CIRCUMFERENCE * (1 - safePercent / 100);
  // Numeric date (dd.MM.yyyy) stays locale-neutral; the German „Uhr" suffix is
  // supplied by the i18n layer so it drops out in non-German locales. Guard the
  // suffix key so locales that have not localized it yet show a bare time.
  const withUhr = (iso: string) => {
    const zeit = formatTimeDe(iso);
    return tFmt.has('uhrzeit') ? tFmt('uhrzeit', { zeit }) : zeit;
  };
  const aktualisierung = letzteAktualisierungIso
    ? `${formatDateDe(letzteAktualisierungIso)}, ${withUhr(letzteAktualisierungIso)}`
    : null;

  return (
    /* Phones: the ring column's centered 4-line caption read ragged next to
       the heading — ring + left-aligned captions become one row instead. */
    <div
      className="flex flex-col items-center text-center max-[560px]:flex-row max-[560px]:items-center max-[560px]:gap-4 max-[560px]:text-left"
      data-testid="v2-completeness-ring"
    >
      <span
        role="img"
        aria-label={t('aria', { percent: safePercent })}
        className="relative inline-flex size-24 shrink-0 items-center justify-center"
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
      <div className="max-[560px]:min-w-0">
        <p className="mt-2 text-sm font-medium text-text-secondary max-[560px]:mt-0">
          {t('label')}
        </p>
        {aktualisierung ? (
          <p className="mt-0.5 text-xs text-text-muted">
            {t('letzte_aktualisierung', { datum: aktualisierung })}
          </p>
        ) : null}
      </div>
    </div>
  );
}
