'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { Popover as PopoverPrimitive } from '@base-ui/react/popover';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { useStripBaseUiFocusGuardAriaHidden } from '@/components/ui/use-strip-base-ui-focus-guard-aria-hidden';
import { cn } from '@/lib/utils';
import type { BehoerdeKategorie } from '@/types';

/**
 * UI-Filter-Schlüssel — V1.5 mergt `selbstverwaltung` + `privat` zu `sonstige`
 * (Architect-Empfehlung Flag #3). Datenmodell-Enum bleibt unverändert; das
 * Mapping passiert hier auf UI-Ebene.
 */
export type FilterKategorie = 'bund' | 'land' | 'kommunal' | 'sonstige';

export const FILTER_KATEGORIEN: FilterKategorie[] = [
  'bund',
  'land',
  'kommunal',
  'sonstige',
];

export function filterKategorieToInternal(
  k: FilterKategorie,
): BehoerdeKategorie[] {
  switch (k) {
    case 'bund':
      return ['bund'];
    case 'land':
      return ['land'];
    case 'kommunal':
      return ['kommune'];
    case 'sonstige':
      return ['sozialversicherung', 'privat'];
  }
}

interface FilterPopoverProps {
  open: boolean;
  onOpenChange: (next: boolean) => void;
  selected: FilterKategorie[];
  onChange: (next: FilterKategorie[]) => void;
  /** Trigger-Element (FilterButton). */
  trigger: React.ReactNode;
  /** Klasse für das Popup. */
  className?: string;
}

/**
 * Filter-Popover (Desktop ≥ md). Enthält ausschließlich Behörden-Kategorie-
 * Checkboxes. Status-Filter sind in V1.5 gelöscht (Verifier #6); die Status-
 * Gruppen-Header in der chronologischen Ansicht übernehmen die Funktion.
 */
export function FilterPopover({
  open,
  onOpenChange,
  selected,
  onChange,
  trigger,
  className,
}: FilterPopoverProps) {
  const t = useTranslations('posteingang.filter');
  useStripBaseUiFocusGuardAriaHidden(open);
  // Lokaler Draft-State, damit „Filter anwenden" eine echte Bestätigung ist
  // (MOJ-Pattern: explicit apply, kein Auto-Apply pro Klick).
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

  function clearLocal() {
    setDraft([]);
  }

  return (
    <PopoverPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <PopoverPrimitive.Trigger render={<>{trigger}</>} />
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Positioner sideOffset={6} align="start">
          <PopoverPrimitive.Popup
            className={cn(
              'z-50 w-72 rounded-xl border border-border bg-popover p-4 text-sm text-popover-foreground shadow-lg outline-none',
              'data-open:animate-in data-open:fade-in-0',
              'data-closed:animate-out data-closed:fade-out-0',
              className,
            )}
            aria-labelledby="filter-popover-title"
          >
            <div className="flex flex-col gap-4">
              <PopoverPrimitive.Title
                id="filter-popover-title"
                className="text-sm font-semibold"
              >
                {t('popover_title')}
              </PopoverPrimitive.Title>
              <fieldset className="flex flex-col gap-2">
                <legend className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {t('kategorie.title')}
                </legend>
                <ul className="flex flex-col gap-2">
                  {FILTER_KATEGORIEN.map((k) => {
                    const id = `popover-kat-${k}`;
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
              <div className="flex items-center justify-between gap-2 pt-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={clearLocal}
                  disabled={draft.length === 0}
                >
                  {t('popover_clear')}
                </Button>
                <Button type="button" size="sm" onClick={apply}>
                  {t('popover_apply')}
                </Button>
              </div>
            </div>
          </PopoverPrimitive.Popup>
        </PopoverPrimitive.Positioner>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
}
