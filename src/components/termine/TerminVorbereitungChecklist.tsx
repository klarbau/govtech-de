'use client';

import * as React from 'react';
import { useId } from 'react';
import { useTranslations } from 'next-intl';

import { Checkbox } from '@/components/ui/checkbox';
import type { TerminVorbereitungItem } from '@/types';

interface TerminVorbereitungChecklistProps {
  items: TerminVorbereitungItem[];
}

/**
 * Abhakbare Vorbereitungs-Checkliste (Demo-State, client-only, kein Persist).
 * Item-Labels kommen aus `vorbereitung[].label_i18n_key`.
 */
export function TerminVorbereitungChecklist({
  items,
}: TerminVorbereitungChecklistProps) {
  const t = useTranslations();
  const baseId = useId();
  const [checked, setChecked] = React.useState<Record<string, boolean>>({});

  // Reset checks when the underlying termin (item set) changes.
  const signature = items.map((i) => i.label_i18n_key).join('|');
  React.useEffect(() => {
    setChecked({});
  }, [signature]);

  if (items.length === 0) return null;

  return (
    <ul className="space-y-1">
      {items.map((item, index) => {
        const id = `${baseId}-${index}`;
        const isChecked = checked[item.label_i18n_key] ?? false;
        return (
          <li key={item.label_i18n_key}>
            <label
              htmlFor={id}
              className="flex min-h-[44px] cursor-pointer items-center gap-2.5 text-sm text-text-primary"
            >
              <Checkbox
                id={id}
                checked={isChecked}
                onCheckedChange={(value) =>
                  setChecked((prev) => ({
                    ...prev,
                    [item.label_i18n_key]: value === true,
                  }))
                }
              />
              <span className={isChecked ? 'text-text-muted line-through' : undefined}>
                {t(item.label_i18n_key)}
              </span>
            </label>
          </li>
        );
      })}
    </ul>
  );
}
