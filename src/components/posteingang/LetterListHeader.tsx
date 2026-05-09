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
  className?: string;
}

export function LetterListHeader({
  view,
  onViewChange,
  searchQuery,
  onSearchChange,
  behoerdenNameById,
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
          </TabsTrigger>
        </TabsList>
      </Tabs>
    </div>
  );
}
