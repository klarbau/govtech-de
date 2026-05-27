'use client';

import { useTranslations } from 'next-intl';

import { FilterTabs } from '@/components/shared/FilterTabs';
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
    <div className={cn('flex flex-col gap-3 md:flex-row md:items-center', className)}>
      <AktenzeichenSearch
        value={searchQuery}
        onChange={onSearchChange}
        behoerdenNameById={behoerdenNameById}
        className="md:flex-1"
      />
      <div className="flex items-center gap-2">
        <FilterTabs
          ariaLabel={t('list.tab_chronologisch')}
          tabs={[
            { id: 'chronologisch', label: t('list.tab_chronologisch') },
            {
              id: 'nach-vorgang',
              label: t('list.tab_nach_vorgang'),
              count:
                typeof filterCount === 'number' && filterCount > 0
                  ? filterCount
                  : undefined,
            },
          ]}
          activeId={view}
          onChange={(id) =>
            onViewChange(
              (id as 'chronologisch' | 'nach-vorgang') ?? 'chronologisch',
            )
          }
        />
      </div>
    </div>
  );
}
