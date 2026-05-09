import { useTranslations } from 'next-intl';
import { Beaker } from 'lucide-react';

import { cn } from '@/lib/utils';

interface MockWatermarkBannerProps {
  className?: string;
  /** Falls true, wird das Banner als schmaler dauerhafter Streifen oberhalb von Brief/Dokument gerendert. */
  variant?: 'banner' | 'inline';
}

/**
 * `[MOCK – Verwaltungsdemo, keine echten Daten]`-Banner. Wird für
 * Posteingang-LetterReader (oben) und Dokumenten-Vault wiederverwendet.
 *
 * a11y: nicht aria-hidden — Screen-Reader müssen den MOCK-Hinweis vorlesen.
 */
export function MockWatermarkBanner({
  className,
  variant = 'banner',
}: MockWatermarkBannerProps) {
  const t = useTranslations('posteingang.watermark');

  if (variant === 'inline') {
    return (
      <span
        className={cn(
          'inline-flex items-center gap-1 rounded-md bg-amber-100 px-1.5 py-0.5 font-mono text-[11px] font-medium uppercase tracking-wide text-amber-900 ring-1 ring-amber-300/70 dark:bg-amber-900/40 dark:text-amber-100 dark:ring-amber-700/60',
          className,
        )}
      >
        <Beaker className="size-3" aria-hidden="true" />
        {t('inline')}
      </span>
    );
  }

  return (
    <div
      role="note"
      className={cn(
        'flex items-center gap-2 rounded-lg border border-amber-300/70 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-900 dark:border-amber-700/60 dark:bg-amber-900/30 dark:text-amber-100',
        className,
      )}
    >
      <Beaker className="size-4 shrink-0" aria-hidden="true" />
      <span>{t('banner')}</span>
    </div>
  );
}
