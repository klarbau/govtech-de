'use client';

import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';

import { AktenzeichenSearch } from './AktenzeichenSearch';

interface LetterListHeaderProps {
  view: 'chronologisch' | 'nach-vorgang';
  onViewChange: (next: 'chronologisch' | 'nach-vorgang') => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  /** Auflösung von `letter.absender_behoerde_id` zu Behörden-Namen für Trefferzeilen. */
  behoerdenNameById?: Record<string, string>;
  /** Phase 6b — Anzahl aktiver Filter; rendert ein Badge im Nach-Vorgang-Tab. */
  filterCount?: number;
  className?: string;
}

export function LetterListHeader({
  view,
  onViewChange,
  searchQuery,
  onSearchChange,
  behoerdenNameById,
  filterCount,
  className,
}: LetterListHeaderProps) {
  const t = useTranslations('posteingang');

  return (
    <div className={cn('flex flex-col gap-3', className)}>
      <AktenzeichenSearch
        value={searchQuery}
        onChange={onSearchChange}
        behoerdenNameById={behoerdenNameById}
      />
      <Tabs
        value={view}
        onValueChange={(v) =>
          onViewChange((v as 'chronologisch' | 'nach-vorgang') ?? 'chronologisch')
        }
      >
        <TabsList>
          <TabsTrigger value="chronologisch">
            {t('list.tab_chronologisch')}
          </TabsTrigger>
          <TabsTrigger value="nach-vorgang">
            {t('list.tab_nach_vorgang')}
            {typeof filterCount === 'number' && filterCount > 0 && (
              <span
                data-testid="nach-vorgang-filter-badge"
                aria-label={t('list.tab_filter_badge_aria', {
                  count: filterCount,
                })}
                className="ml-2 inline-flex min-w-5 items-center justify-center rounded-full bg-[var(--ds-color-accent)] px-1.5 text-[11px] font-medium text-[var(--ds-color-accent-foreground)] tabular-nums"
              >
                {filterCount}
              </span>
            )}
          </TabsTrigger>
        </TabsList>
      </Tabs>
    </div>
  );
}
