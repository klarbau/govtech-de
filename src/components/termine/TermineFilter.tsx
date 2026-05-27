'use client';

import { useId } from 'react';
import { useTranslations } from 'next-intl';

import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';

export type TermineFilterKey =
  | 'behoerdentermine'
  | 'erinnerungen'
  | 'buchungen'
  | 'abgeschlossen';

export const TERMINE_FILTER_KEYS: TermineFilterKey[] = [
  'behoerdentermine',
  'erinnerungen',
  'buchungen',
  'abgeschlossen',
];

const DOT_CLASS: Record<TermineFilterKey, string> = {
  behoerdentermine: 'bg-primary',
  erinnerungen: 'bg-warning',
  buchungen: 'bg-success',
  abgeschlossen: 'bg-text-muted',
};

interface TermineFilterProps {
  active: TermineFilterKey[];
  onToggle: (key: TermineFilterKey) => void;
}

/**
 * Vier Kategorie-Checkboxen mit dekorativem Farb-Dot. Der Dot ist `aria-hidden`;
 * das Label trägt die Bedeutung.
 */
export function TermineFilter({ active, onToggle }: TermineFilterProps) {
  const t = useTranslations('termine.filter');
  const baseId = useId();

  return (
    <fieldset className="space-y-2">
      <legend className="mb-2 text-sm font-semibold text-text-primary">
        {t('title')}
      </legend>
      {TERMINE_FILTER_KEYS.map((key) => {
        const id = `${baseId}-${key}`;
        return (
          <label
            key={key}
            htmlFor={id}
            className="flex min-h-[44px] cursor-pointer items-center gap-2.5 text-sm text-text-primary"
          >
            <Checkbox
              id={id}
              checked={active.includes(key)}
              onCheckedChange={() => onToggle(key)}
            />
            <span
              aria-hidden="true"
              className={cn('size-2 shrink-0 rounded-full', DOT_CLASS[key])}
            />
            <span>{t(key)}</span>
          </label>
        );
      })}
    </fieldset>
  );
}
