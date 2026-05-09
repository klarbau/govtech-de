import { format, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';
import { getTranslations } from 'next-intl/server';

import { cn } from '@/lib/utils';
import type { VorgangStatus } from '@/types';

interface VorgangHeaderProps {
  title: string;
  status: VorgangStatus;
  angelegtIso: string;
  stichtagIso?: string;
}

const statusTone: Record<VorgangStatus, string> = {
  angelegt: 'bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-200',
  in_pruefung: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200',
  genehmigt: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200',
  abgelehnt: 'bg-destructive/15 text-destructive',
  abgeschlossen: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200',
};

export async function VorgangHeader({
  title,
  status,
  angelegtIso,
  stichtagIso,
}: VorgangHeaderProps) {
  const t = await getTranslations('umzug.detail');
  const angelegtLabel = format(parseISO(angelegtIso), 'd. MMMM yyyy', {
    locale: de,
  });
  const stichtagLabel = stichtagIso
    ? format(parseISO(stichtagIso), 'd. MMMM yyyy', { locale: de })
    : null;

  const statusKey: 'laeuft' | 'abgeschlossen' | 'fehlerhaft' =
    status === 'abgeschlossen'
      ? 'abgeschlossen'
      : status === 'abgelehnt'
        ? 'fehlerhaft'
        : 'laeuft';

  return (
    <header className="flex flex-col gap-2 border-b border-border pb-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          {title}
        </h1>
        <span
          className={cn(
            'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
            statusTone[status],
          )}
        >
          {t(`status.${statusKey}`)}
        </span>
      </div>
      <p className="text-sm text-muted-foreground">
        {t('angelegt_template', { datum: angelegtLabel })}
        {stichtagLabel ? ` · ${t('stichtag_template', { datum: stichtagLabel })}` : ''}
      </p>
    </header>
  );
}
