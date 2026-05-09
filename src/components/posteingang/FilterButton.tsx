'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { Filter } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface FilterButtonProps {
  /** Anzahl aktiver Filter (zeigt Count-Badge wenn > 0). */
  count: number;
  onClick: () => void;
  /** Wenn das Filter-Popover/Sheet gerade geöffnet ist. */
  expanded?: boolean;
  /** ID des kontrollierten Popover-Containers (für `aria-controls`). */
  controlsId?: string;
  /** „dialog" für Sheet-Trigger, „menu" oder kein Wert für Popover. */
  hasPopup?: 'dialog' | 'menu' | 'true';
  className?: string;
}

/**
 * Trigger-Button für `<FilterPopover>` (Desktop ≥ md) bzw. `<FilterSheet>`
 * (Mobile / sm). Zeigt Count-Badge bei aktiven Filtern.
 */
export function FilterButton({
  count,
  onClick,
  expanded,
  controlsId,
  hasPopup,
  className,
}: FilterButtonProps) {
  const t = useTranslations('posteingang.inbox');
  const label =
    count > 0 ? t('filter_button_count_template', { count }) : t('filter_button_label');
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={onClick}
      aria-haspopup={hasPopup ?? 'dialog'}
      aria-expanded={expanded ?? undefined}
      aria-controls={controlsId}
      className={cn('gap-1.5', className)}
    >
      <Filter className="size-4" aria-hidden="true" />
      <span>{label}</span>
    </Button>
  );
}
