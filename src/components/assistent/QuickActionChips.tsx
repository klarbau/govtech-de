'use client';

import { useTranslations } from 'next-intl';

interface QuickActionChipsProps {
  onSelect: (text: string) => void;
  disabled?: boolean;
}

const CHIP_KEYS = [
  'erklaere_brief',
  'naechster_schritt',
  'fehlende_unterlagen',
] as const;

export function QuickActionChips({ onSelect, disabled }: QuickActionChipsProps) {
  const t = useTranslations('assistent.quick');

  return (
    <div
      className="flex flex-wrap gap-2"
      role="group"
      aria-label={t('label')}
    >
      {CHIP_KEYS.map((key) => {
        const label = t(key);
        return (
          <button
            key={key}
            type="button"
            disabled={disabled}
            onClick={() => onSelect(label)}
            className="inline-flex min-h-[44px] items-center rounded-full bg-surface-muted px-4 text-sm font-medium text-text-secondary transition-colors hover:bg-border hover:text-text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-50"
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
