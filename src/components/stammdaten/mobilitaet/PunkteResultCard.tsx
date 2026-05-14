'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { format, parseISO } from 'date-fns';
import { de as deLocale } from 'date-fns/locale';
import { Clock } from 'lucide-react';

import { wrapNormZitate } from '@/components/posteingang/wrapNormZitate';
import { cn } from '@/lib/utils';

export interface PunkteResultView {
  punkte: number;
  /** ISO-Timestamp wann das Result abgerufen wurde (Pull-Zeit). */
  abgerufen_am: string;
  /** Sekunden bis Verwurf. V1.3: immer 300. */
  ttl_seconds: number;
  /** ISO-Date — Stand der zugrundeliegenden Eintragungen (KBA). */
  stichtag: string;
  /** Mock-Geschäftszeichen `[MOCK] FAER-AK-…`. */
  aktenzeichen: string;
}

interface PunkteResultCardProps {
  result: PunkteResultView;
  /** Wird gerufen, sobald TTL abgelaufen ist (Parent kann CTA wieder default-state setzen). */
  onExpired: () => void;
  className?: string;
}

/**
 * `<PunkteResultCard>` (Spec § 4.1 / VL-8).
 *
 * Render nach erfolgreichem FAER-Pull:
 *   - Punktestand-Zahl groß
 *   - Stand-Stempel + Aktenzeichen
 *   - TTL-Countdown (Live-Counter, default 5 min)
 *   - Activity-Log-Hinweis
 *
 * Nach TTL-Expiry: `onExpired()` wird gerufen; Parent ersetzt diese Card durch
 * das default-CTA.
 *
 * a11y: TTL-Countdown läuft mit `aria-live="polite"`; nach Expiry rendert ein
 * sr-only-Hinweis. Respekt für `prefers-reduced-motion`: kein Pulsen.
 */
export function PunkteResultCard({
  result,
  onExpired,
  className,
}: PunkteResultCardProps) {
  const t = useTranslations('stammdaten.mobilitaet.punkte.result');

  const abgerufenMs = React.useMemo(
    () => new Date(result.abgerufen_am).getTime(),
    [result.abgerufen_am],
  );
  const expiresMs = abgerufenMs + result.ttl_seconds * 1000;

  const [remainingSec, setRemainingSec] = React.useState(() => {
    const diff = Math.max(0, Math.floor((expiresMs - Date.now()) / 1000));
    return diff;
  });
  const expiredRef = React.useRef(false);

  React.useEffect(() => {
    const tick = () => {
      const diff = Math.max(0, Math.floor((expiresMs - Date.now()) / 1000));
      setRemainingSec(diff);
      if (diff <= 0 && !expiredRef.current) {
        expiredRef.current = true;
        onExpired();
      }
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [expiresMs, onExpired]);

  let stichtagFormatted: string;
  try {
    stichtagFormatted = format(parseISO(result.stichtag), 'dd.MM.yyyy', {
      locale: deLocale,
    });
  } catch {
    stichtagFormatted = result.stichtag;
  }

  const isExpired = remainingSec <= 0;

  return (
    <article
      className={cn(
        'flex flex-col gap-3 rounded-xl border border-border bg-card p-4 shadow-sm',
        className,
      )}
      data-testid="punkte-result-card"
    >
      <div className="flex flex-wrap items-baseline gap-2">
        <span
          className="text-3xl font-semibold tracking-tight text-foreground"
          data-testid="punkte-result-value"
        >
          {t('value', { punkte: result.punkte })}
        </span>
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {t('label')}
        </span>
      </div>
      <dl className="grid grid-cols-1 gap-2 text-xs sm:grid-cols-2">
        <div className="flex flex-col">
          <dt className="font-medium text-muted-foreground">
            {t('stichtag_label_short')}
          </dt>
          <dd className="text-foreground">{stichtagFormatted}</dd>
        </div>
        <div className="flex flex-col">
          <dt className="font-medium text-muted-foreground">
            {t('aktenzeichen_label_short')}
          </dt>
          <dd className="font-mono text-foreground">{result.aktenzeichen}</dd>
        </div>
      </dl>

      <div
        role="status"
        aria-live="polite"
        className={cn(
          'flex items-center gap-2 rounded-md border border-dashed border-border bg-muted/40 px-3 py-2 text-xs',
          isExpired ? 'text-muted-foreground' : 'text-foreground',
        )}
        data-testid="punkte-ttl-countdown"
      >
        <Clock className="size-3.5" aria-hidden="true" />
        {isExpired ? (
          <span>{t('ttl_expired')}</span>
        ) : (
          <span>{t('ttl_countdown', { seconds: remainingSec })}</span>
        )}
      </div>

      <p className="text-[11px] leading-relaxed text-muted-foreground">
        {wrapNormZitate(t('activity_log_hint'))}
      </p>
    </article>
  );
}
