import { useTranslations } from 'next-intl';
import { format, parseISO } from 'date-fns';
import { de as deLocale } from 'date-fns/locale';
import { ExternalLink } from 'lucide-react';

import { wrapNormZitate } from '@/components/posteingang/wrapNormZitate';
import { cn } from '@/lib/utils';

type PostfachStatus = 'aktiv' | 'inaktiv' | 'teilaktiviert';

interface BundidPostfachCardProps {
  status: PostfachStatus;
  aktiviertAm?: string;
}

/**
 * `<BundidPostfachCard>` — Spec § 6.3 + Hard-Line § 11.32, § 11.33.
 *
 * Card 1 in der Kontakt-Sektion. Zeigt Postfach-Status + Wegweiser-
 * Pointer auf id.bund.de + Norm-Pointer „§ 9 OZG". Hard-Line: KEIN
 * Aktivierungs-Toggle in der App.
 */
export function BundidPostfachCard({
  status,
  aktiviertAm,
}: BundidPostfachCardProps) {
  const t = useTranslations('stammdaten.kontakt.card.bundid_postfach');
  const tPostfach = useTranslations('stammdaten.kontakt.postfach');

  const statusBadgeClass: Record<PostfachStatus, string> = {
    aktiv:
      'bg-emerald-100 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-100',
    inaktiv:
      'bg-zinc-200 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200',
    teilaktiviert:
      'bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-100',
  };

  let aktiviertSeitText: string | null = null;
  if (status === 'aktiv' && aktiviertAm) {
    try {
      const formatted = format(parseISO(aktiviertAm), 'dd.MM.yyyy', {
        locale: deLocale,
      });
      aktiviertSeitText = t('aktiviert_seit_template', { datum: formatted });
    } catch {
      aktiviertSeitText = t('aktiviert_seit_template', { datum: aktiviertAm });
    }
  }

  return (
    <article
      className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4"
      data-testid="bundid-postfach-card"
      data-status={status}
    >
      <header className="flex items-start justify-between gap-3">
        <h3 className="text-sm font-semibold tracking-tight text-foreground">
          {t('title')}
        </h3>
        <span
          className={cn(
            'inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium',
            statusBadgeClass[status],
          )}
        >
          {t(`status.${status}`)}
        </span>
      </header>

      {aktiviertSeitText && (
        <p className="text-xs text-muted-foreground">{aktiviertSeitText}</p>
      )}

      <p className="text-xs leading-relaxed text-muted-foreground">
        {wrapNormZitate(t('norm_pointer'))}
      </p>

      <p className="text-xs leading-relaxed text-muted-foreground">
        {wrapNormZitate(tPostfach('wegweiser_pointer'))}
      </p>

      <a
        href="https://id.bund.de/de/postfach"
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex w-fit items-center gap-1 rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        data-testid="postfach-wegweiser-link"
      >
        {t('wegweiser_link_label')}
        <ExternalLink aria-hidden="true" className="size-3" />
      </a>
    </article>
  );
}
