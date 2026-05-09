'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';

import { FILTER_KATEGORIEN, type FilterKategorie } from './FilterPopover';

interface FilterSheetProps {
  open: boolean;
  onOpenChange: (next: boolean) => void;
  selected: FilterKategorie[];
  onChange: (next: FilterKategorie[]) => void;
}

/**
 * Mobiles Pendant zu `<FilterPopover>` — gleiche Inhalte, gerendert in einem
 * shadcn-Dialog (zentriert auf Mobile, fungiert als Filter-Sheet bis V1.5.0).
 */
export function FilterSheet({
  open,
  onOpenChange,
  selected,
  onChange,
}: FilterSheetProps) {
  const t = useTranslations('posteingang.filter');
  const [draft, setDraft] = React.useState<FilterKategorie[]>(selected);

  React.useEffect(() => {
    if (open) setDraft(selected);
  }, [open, selected]);

  function toggle(k: FilterKategorie) {
    setDraft((prev) =>
      prev.includes(k) ? prev.filter((x) => x !== k) : [...prev, k],
    );
  }

  function apply() {
    onChange(draft);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('popover_title')}</DialogTitle>
        </DialogHeader>
        <fieldset className="flex flex-col gap-3">
          <legend className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {t('kategorie.title')}
          </legend>
          <ul className="flex flex-col gap-2">
            {FILTER_KATEGORIEN.map((k) => {
              const id = `sheet-kat-${k}`;
              const checked = draft.includes(k);
              return (
                <li key={k} className="flex items-center gap-2">
                  <Checkbox
                    id={id}
                    checked={checked}
                    onCheckedChange={() => toggle(k)}
                  />
                  <label htmlFor={id} className="cursor-pointer text-sm">
                    {t(`kategorie.${k}`)}
                  </label>
                </li>
              );
            })}
          </ul>
        </fieldset>
        <div className="mt-2 flex items-center justify-between gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setDraft([])}
            disabled={draft.length === 0}
          >
            {t('popover_clear')}
          </Button>
          <Button type="button" size="sm" onClick={apply}>
            {t('popover_apply')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
