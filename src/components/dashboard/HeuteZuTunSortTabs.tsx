'use client';

import { useTranslations } from 'next-intl';

import { cn } from '@/lib/utils';
import { FilterTabs } from '@/components/shared/FilterTabs';
import type { DashboardSortMode } from '@/types';

const SORT_MODES: DashboardSortMode[] = ['ki', 'frist', 'behoerde', 'vorgang'];

interface HeuteZuTunSortTabsProps {
  value: DashboardSortMode;
  onChange: (mode: DashboardSortMode) => void;
  /** When there are no actions, the toggle is shown but inert (aria-disabled). */
  disabled?: boolean;
}

/**
 * Sort-Toggle der „Heute zu tun"-Liste: KI / Frist / Behörde / Vorgang.
 * Nutzt die `FilterTabs`-Primitive (keyboard-operable, ≥ 44px Touch-Target).
 * Bei 0 Aktionen bleibt die Leiste sichtbar, aber `aria-disabled` + Tooltip.
 */
export function HeuteZuTunSortTabs({
  value,
  onChange,
  disabled = false,
}: HeuteZuTunSortTabsProps) {
  const t = useTranslations('dashboard.heute_zu_tun');

  const tabs = SORT_MODES.map((mode) => ({
    id: mode,
    label: t(`sort.${mode}`),
  }));

  if (disabled) {
    return (
      <div
        role="group"
        aria-label={t('sort_aria')}
        aria-disabled="true"
        title={t('sort_disabled_tooltip')}
        className="flex flex-wrap items-center gap-1 opacity-50"
      >
        {tabs.map((tab) => (
          <span
            key={tab.id}
            aria-disabled="true"
            className={cn(
              'inline-flex min-h-[44px] cursor-not-allowed items-center rounded-full px-3.5 text-sm',
              tab.id === value
                ? 'bg-accent-soft font-medium text-primary'
                : 'text-text-secondary',
            )}
          >
            {tab.label}
          </span>
        ))}
      </div>
    );
  }

  return (
    <FilterTabs
      tabs={tabs}
      activeId={value}
      onChange={(id) => onChange(id as DashboardSortMode)}
      ariaLabel={t('sort_aria')}
    />
  );
}
