'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { format, parseISO, differenceInCalendarDays } from 'date-fns';
import { de as deLocale } from 'date-fns/locale';
import { AlertTriangle, CheckCircle2, Info } from 'lucide-react';

import { wrapNormZitate } from '@/components/posteingang/wrapNormZitate';
import { cn } from '@/lib/utils';

export type PflichtumtauschStatus =
  | 'nicht_relevant'
  | 'frist_aktiv'
  | 'frist_abgelaufen_offen'
  | 'umtausch_erfolgt';

interface PflichtumtauschBannerProps {
  status: PflichtumtauschStatus;
  /** Stichtag aus Anlage 8a FeV; nur bei `frist_aktiv` / `frist_abgelaufen_offen` gesetzt. */
  stichtag?: string;
  /** Datum des erfolgten Umtauschs; nur bei `umtausch_erfolgt` gesetzt. */
  erfolgtAm?: string;
  /** Name der zuständigen FE-Behörde (für CTA-Text). */
  feBehoerdeName: string;
  /**
   * Stiller Hinweis: wenn `geburtsjahr` oder `ausstellungsdatum` fehlt, kann
   * der Stichtag nicht berechnet werden (VL-6). Parent setzt dann
   * `status === 'nicht_relevant'` UND `daten_unvollstaendig === true`.
   */
  datenUnvollstaendig?: boolean;
  className?: string;
}

/**
 * `<PflichtumtauschBanner>` (Spec § 4.1 / VL-6 / HL-MOB-6).
 *
 * Bedingter Render nach Pflichtumtausch-Status:
 *   - `nicht_relevant` + `!datenUnvollstaendig` → **kein Render**
 *   - `nicht_relevant` + `datenUnvollstaendig` → stiller Hinweis
 *   - `frist_aktiv` → Frist-Banner mit Countdown + CTA; bei <30 Tagen `aria-live`
 *   - `frist_abgelaufen_offen` → rote Variante mit OWi-Hinweis (§ 75 Nr. 4 FeV)
 *   - `umtausch_erfolgt` → grüne Success-Pill
 */
export function PflichtumtauschBanner({
  status,
  stichtag,
  erfolgtAm,
  feBehoerdeName,
  datenUnvollstaendig,
  className,
}: PflichtumtauschBannerProps) {
  const t = useTranslations('stammdaten.mobilitaet.pflichtumtausch');

  if (status === 'nicht_relevant') {
    if (!datenUnvollstaendig) return null;
    return (
      <div
        className={cn(
          'flex items-start gap-2 rounded-lg border border-border bg-muted/40 p-3 text-xs leading-relaxed text-muted-foreground',
          className,
        )}
        data-testid="pflichtumtausch-banner-stiller-hinweis"
      >
        <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        <p>{t('stiller_hinweis')}</p>
      </div>
    );
  }

  // Bei 'frist_aktiv' / 'frist_abgelaufen_offen': Stichtag formatieren + Days-Diff.
  const stichtagFormatted = formatIso(stichtag);
  const daysToStichtag = stichtag
    ? differenceInCalendarDays(parseISO(stichtag), new Date())
    : null;
  const within30d =
    daysToStichtag !== null && daysToStichtag > 0 && daysToStichtag <= 30;

  if (status === 'frist_aktiv') {
    return (
      <div
        className={cn(
          'flex flex-col gap-2 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm leading-relaxed text-amber-950',
          'dark:border-amber-700/60 dark:bg-amber-900/20 dark:text-amber-100',
          className,
        )}
        role={within30d ? 'status' : undefined}
        aria-live={within30d ? 'polite' : undefined}
        data-testid="pflichtumtausch-banner-frist-aktiv"
      >
        <div className="flex items-center gap-2">
          <AlertTriangle className="size-4" aria-hidden="true" />
          <h3 className="text-sm font-semibold">{t('title')}</h3>
        </div>
        <p className="text-sm">
          {wrapNormZitate(
            t('frist_aktiv.body', {
              stichtag: stichtagFormatted,
              fe_behoerde_name: feBehoerdeName,
            }),
          )}
        </p>
        {within30d && (
          <p className="text-xs font-medium">{t('frist_aktiv.warning_30d')}</p>
        )}
      </div>
    );
  }

  if (status === 'frist_abgelaufen_offen') {
    return (
      <div
        className={cn(
          'flex flex-col gap-2 rounded-lg border border-red-300 bg-red-50 p-4 text-sm leading-relaxed text-red-950',
          'dark:border-red-700/60 dark:bg-red-900/20 dark:text-red-100',
          className,
        )}
        role="status"
        aria-live="polite"
        data-testid="pflichtumtausch-banner-frist-abgelaufen"
      >
        <div className="flex items-center gap-2">
          <AlertTriangle className="size-4" aria-hidden="true" />
          <h3 className="text-sm font-semibold">{t('title')}</h3>
        </div>
        <p className="text-sm">
          {wrapNormZitate(
            t('frist_abgelaufen.body', {
              stichtag: stichtagFormatted,
              fe_behoerde_name: feBehoerdeName,
            }),
          )}
        </p>
      </div>
    );
  }

  if (status === 'umtausch_erfolgt') {
    const erfolgtFormatted = formatIso(erfolgtAm);
    return (
      <div
        className={cn(
          'flex items-start gap-2 rounded-lg border border-emerald-300 bg-emerald-50 p-3 text-sm leading-relaxed text-emerald-950',
          'dark:border-emerald-700/60 dark:bg-emerald-900/20 dark:text-emerald-100',
          className,
        )}
        data-testid="pflichtumtausch-banner-umtausch-erfolgt"
      >
        <CheckCircle2 className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        <div className="flex flex-col gap-0.5">
          <span className="text-xs font-semibold uppercase tracking-wide">
            {t('title')}
          </span>
          <p className="text-sm">
            {wrapNormZitate(
              t('umtausch_erfolgt.body', { erfolgt_am: erfolgtFormatted }),
            )}
          </p>
        </div>
      </div>
    );
  }

  return null;
}

function formatIso(iso: string | undefined): string {
  if (!iso) return '';
  try {
    return format(parseISO(iso), 'dd.MM.yyyy', { locale: deLocale });
  } catch {
    return iso;
  }
}
