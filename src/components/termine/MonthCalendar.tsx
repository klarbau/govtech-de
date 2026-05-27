'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import {
  addDays,
  addMonths,
  format,
  isSameDay,
  isSameMonth,
  parseISO,
  startOfMonth,
  startOfWeek,
} from 'date-fns';
import { de } from 'date-fns/locale';
import { ChevronLeft, ChevronRight } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

const WEEKDAY_KEYS = ['mo', 'di', 'mi', 'do', 'fr', 'sa', 'so'] as const;

interface MonthCalendarProps {
  /** ISO date of the currently selected day, or null for "no day selected". */
  selectedIso: string | null;
  /** ISO date treated as "today" (SSR-stable demo now). */
  todayIso: string;
  /** ISO date strings (yyyy-MM-dd) that carry one or more events, with a count. */
  eventCounts: Record<string, number>;
  onSelect: (iso: string | null) => void;
}

function dayKey(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

/**
 * Keyboard-navigable month grid. a11y pattern (WAI-ARIA grid):
 * - `role="grid"` wrapper, `role="row"` weeks, `role="gridcell"` days.
 * - Roving tabindex: exactly one focusable day (`tabIndex 0`), the rest `-1`.
 * - Arrow keys move by day, Home/End to week edges, PageUp/PageDown by month.
 * - Selected day `aria-selected`, today `aria-current="date"`.
 * - Event marker is announced in the cell `aria-label` (text, not colour only).
 */
export function MonthCalendar({
  selectedIso,
  todayIso,
  eventCounts,
  onSelect,
}: MonthCalendarProps) {
  const t = useTranslations('termine.calendar');
  const today = React.useMemo(() => parseISO(todayIso), [todayIso]);
  const selected = selectedIso ? parseISO(selectedIso) : null;

  const [visibleMonth, setVisibleMonth] = React.useState<Date>(
    () => startOfMonth(selected ?? today),
  );
  // The day that holds keyboard focus within the grid (roving tabindex anchor).
  const [activeDay, setActiveDay] = React.useState<Date>(selected ?? today);

  const gridRef = React.useRef<HTMLDivElement>(null);
  const shouldFocusRef = React.useRef(false);

  React.useEffect(() => {
    if (!shouldFocusRef.current) return;
    shouldFocusRef.current = false;
    const el = gridRef.current?.querySelector<HTMLButtonElement>(
      'button[tabindex="0"]',
    );
    el?.focus();
  }, [activeDay]);

  const weeks = React.useMemo(() => {
    const first = startOfWeek(startOfMonth(visibleMonth), { weekStartsOn: 1 });
    const result: Date[][] = [];
    let cursor = first;
    // Always render 6 weeks for a stable grid height.
    for (let w = 0; w < 6; w += 1) {
      const week: Date[] = [];
      for (let d = 0; d < 7; d += 1) {
        week.push(cursor);
        cursor = addDays(cursor, 1);
      }
      result.push(week);
    }
    return result;
  }, [visibleMonth]);

  function goToMonth(next: Date) {
    setVisibleMonth(startOfMonth(next));
  }

  function moveActive(next: Date) {
    shouldFocusRef.current = true;
    setActiveDay(next);
    if (!isSameMonth(next, visibleMonth)) goToMonth(next);
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    let next: Date | null = null;
    switch (event.key) {
      case 'ArrowRight':
        next = addDays(activeDay, 1);
        break;
      case 'ArrowLeft':
        next = addDays(activeDay, -1);
        break;
      case 'ArrowDown':
        next = addDays(activeDay, 7);
        break;
      case 'ArrowUp':
        next = addDays(activeDay, -7);
        break;
      case 'Home':
        next = startOfWeek(activeDay, { weekStartsOn: 1 });
        break;
      case 'End':
        next = addDays(startOfWeek(activeDay, { weekStartsOn: 1 }), 6);
        break;
      case 'PageUp':
        next = addMonths(activeDay, -1);
        break;
      case 'PageDown':
        next = addMonths(activeDay, 1);
        break;
      case 'Enter':
      case ' ': {
        event.preventDefault();
        const key = dayKey(activeDay);
        onSelect(selectedIso === key ? null : key);
        return;
      }
      default:
        return;
    }
    event.preventDefault();
    if (next) moveActive(next);
  }

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label={t('prev')}
          onClick={() => goToMonth(addMonths(visibleMonth, -1))}
        >
          <ChevronLeft className="rtl:-scale-x-100" aria-hidden="true" />
        </Button>
        <p
          className="text-sm font-semibold text-text-primary"
          aria-live="polite"
        >
          {format(visibleMonth, 'LLLL yyyy', { locale: de })}
        </p>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label={t('next')}
          onClick={() => goToMonth(addMonths(visibleMonth, 1))}
        >
          <ChevronRight className="rtl:-scale-x-100" aria-hidden="true" />
        </Button>
      </div>

      <div
        role="grid"
        aria-label={t('label')}
        ref={gridRef}
        onKeyDown={onKeyDown}
        className="select-none"
      >
        <div role="row" className="grid grid-cols-7">
          {WEEKDAY_KEYS.map((key) => (
            <div
              key={key}
              role="columnheader"
              aria-label={t(`weekday_long.${key}`)}
              className="py-1 text-center text-xs font-medium text-text-muted"
            >
              <span aria-hidden="true">{t(`weekday_short.${key}`)}</span>
            </div>
          ))}
        </div>

        {weeks.map((week) => (
          <div role="row" key={dayKey(week[0]!)} className="grid grid-cols-7">
            {week.map((day) => {
              const key = dayKey(day);
              const inMonth = isSameMonth(day, visibleMonth);
              const isToday = isSameDay(day, today);
              const isSelected = selected ? isSameDay(day, selected) : false;
              const isActive = isSameDay(day, activeDay);
              const count = eventCounts[key] ?? 0;

              const eventSuffix =
                count > 0 ? t('day_events_suffix', { count }) : '';
              const label = t('day_aria', {
                datum: format(day, 'EEEE, d. MMMM yyyy', { locale: de }),
                events: eventSuffix,
              });

              return (
                <div
                  role="gridcell"
                  key={key}
                  aria-selected={isSelected}
                  aria-current={isToday ? 'date' : undefined}
                  className="p-0.5 text-center"
                >
                  {/* size-9 (36px): deliberate <44px — a 7-column grid in the
                      18rem calendar column cannot fit 44px cells. 36px clears
                      WCAG 2.5.8 AA (24px min) and the grid spacing-exception. */}
                  <button
                    type="button"
                    tabIndex={isActive ? 0 : -1}
                    aria-label={label}
                    onClick={() => {
                      setActiveDay(day);
                      onSelect(isSelected ? null : key);
                    }}
                    className={cn(
                      'relative inline-flex size-9 items-center justify-center rounded-full text-sm tabular-nums transition-colors',
                      'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
                      !inMonth && 'text-text-muted',
                      inMonth && !isSelected && 'text-text-primary hover:bg-surface-muted',
                      isToday && !isSelected && 'ring-1 ring-inset ring-primary',
                      isSelected && 'bg-primary font-semibold text-primary-foreground',
                    )}
                  >
                    <span>{format(day, 'd')}</span>
                    {count > 0 ? (
                      <span
                        aria-hidden="true"
                        className={cn(
                          'absolute bottom-1 size-1 rounded-full',
                          isSelected ? 'bg-primary-foreground' : 'bg-primary',
                        )}
                      />
                    ) : null}
                  </button>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
