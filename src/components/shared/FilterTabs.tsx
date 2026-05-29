'use client';

import { cn } from '@/lib/utils';

interface FilterTab {
  id: string;
  label: string;
  count?: number;
}

type FilterTabsVariant = 'pill' | 'chip';

interface FilterTabsProps {
  tabs: FilterTab[];
  activeId: string;
  onChange: (id: string) => void;
  ariaLabel?: string;
  className?: string;
  /**
   * Visual style.
   *  - 'pill' (default): rounded-full accent-soft when active — used app-wide.
   *  - 'chip': rectangular bordered chip with count pill inside — matches the
   *    `docs/design-prototype-v2/vorgaenge.html` toolbar look.
   */
  variant?: FilterTabsVariant;
}

export function FilterTabs({
  tabs,
  activeId,
  onChange,
  ariaLabel,
  className,
  variant = 'pill',
}: FilterTabsProps) {
  if (variant === 'chip') {
    return (
      <div
        role="group"
        aria-label={ariaLabel}
        className={cn('flex flex-wrap items-center gap-2', className)}
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
                'inline-flex h-9 min-h-[44px] items-center gap-2 rounded-[10px] border px-3.5 text-[13px] font-medium transition-colors',
                'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
                active
                  ? 'border-brand-100 bg-brand-50 text-brand-700'
                  : 'border-border text-text-ink-2 hover:bg-surface-soft hover:text-text-primary',
              )}
            >
              <span>{tab.label}</span>
              {typeof tab.count === 'number' ? (
                <span
                  className={cn(
                    'inline-flex min-w-5 items-center justify-center rounded-full px-2 py-0.5 text-[12px] tabular-nums',
                    active
                      ? 'bg-brand-100 text-brand-700'
                      : 'bg-surface-muted text-text-ink-2',
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
