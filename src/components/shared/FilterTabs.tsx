'use client';

import { cn } from '@/lib/utils';

interface FilterTab {
  id: string;
  label: string;
  count?: number;
}

interface FilterTabsProps {
  tabs: FilterTab[];
  activeId: string;
  onChange: (id: string) => void;
  ariaLabel?: string;
  className?: string;
}

export function FilterTabs({
  tabs,
  activeId,
  onChange,
  ariaLabel,
  className,
}: FilterTabsProps) {
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className={cn('flex flex-wrap items-center gap-1', className)}
    >
      {tabs.map((tab) => {
        const active = tab.id === activeId;
        return (
          <button
            key={tab.id}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(tab.id)}
            className={cn(
              'inline-flex min-h-[44px] items-center gap-1.5 rounded-full px-3.5 text-sm transition-colors',
              'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
              active
                ? 'bg-accent-soft font-medium text-primary'
                : 'text-text-secondary hover:bg-surface-muted hover:text-text-primary',
            )}
          >
            <span>{tab.label}</span>
            {typeof tab.count === 'number' ? (
              <span
                className={cn(
                  'tabular-nums',
                  active ? 'text-primary' : 'text-text-muted',
                )}
              >
                {tab.count}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
