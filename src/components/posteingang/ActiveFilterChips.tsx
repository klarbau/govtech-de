'use client';

import { useTranslations } from 'next-intl';
import { X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

import type { FilterKategorie } from './FilterPopover';

interface ActiveFilterChipsProps {
  selected: FilterKategorie[];
  onRemove: (k: FilterKategorie) => void;
  onClearAll: () => void;
  className?: string;
}

/**
 * MOJ-Pattern Chip-Row direkt unter Suche/Filter-Button. Pro aktiver Filter
 * ein Chip mit `×`-Button (`aria-label="Filter ‚{label}' entfernen"`); rechts
 * „Alle zurücksetzen"-Link. Keine aktiven Filter → Komponente rendert `null`.
 */
export function ActiveFilterChips({
  selected,
  onRemove,
  onClearAll,
  className,
}: ActiveFilterChipsProps) {
  const tFilter = useTranslations('posteingang.filter.kategorie');
  const tInbox = useTranslations('posteingang.inbox');

  if (selected.length === 0) return null;

  return (
    <div
      role="region"
      aria-labelledby="active-filter-heading"
      className={cn('flex flex-wrap items-center gap-2 text-xs', className)}
    >
      <h2 id="active-filter-heading" className="sr-only">
        {tInbox('active_filters_label')}
      </h2>
      {selected.map((k) => {
        const label = tFilter(k);
        return (
          <span
            key={k}
            className="inline-flex items-center gap-1 rounded-full border border-border bg-muted px-2 py-1 text-foreground"
          >
            <span>{label}</span>
            <button
              type="button"
              onClick={() => onRemove(k)}
              aria-label={tInbox('filter_chip_remove_aria', { filter: label })}
              className="inline-flex size-6 items-center justify-center rounded-full transition-colors hover:bg-foreground/10 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring"
            >
              <X className="size-3" aria-hidden="true" />
            </button>
          </span>
        );
      })}
      <Button
        type="button"
        variant="link"
        size="sm"
        onClick={onClearAll}
        className="h-auto px-1 text-xs text-muted-foreground"
      >
        {tInbox('active_filters_clear_all')}
      </Button>
    </div>
  );
}
