'use client';

import * as React from 'react';
import { useLocale, useTranslations } from 'next-intl';
import {
  addDays,
  addMonths,
  format,
  isSameDay,
  isSameMonth,
  lastDayOfMonth,
  parseISO,
  startOfMonth,
  startOfWeek,
} from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';

import { cn, dateFnsLocale } from '@/lib/utils';

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
 * Keyboard-navigable month grid (WAI-ARIA grid):
 * - `role="grid"` wrapper, `role="row"` weeks, `role="gridcell"` days.
 * - Roving tabindex: exactly one focusable day (`tabIndex 0`), rest `-1`.
 * - Arrow keys move by day, Home/End to week edges, PageUp/PageDown by month.
 * - Selected day `aria-selected`, today `aria-current="date"`.
 * - Event marker announced in the cell `aria-label` (text, not colour only).
 *
 * Styling follows the prototype-v2 `.cal` look (today = filled brand circle,
 * event = small dot, muted out-of-month) on the cobalt design tokens.
 */
export function MonthCalendar({
  selectedIso,
  todayIso,
  eventCounts,
  onSelect,
}: MonthCalendarProps) {
  const t = useTranslations('termine.calendar');
  const dateLocale = dateFnsLocale(useLocale());
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
    // Always render 6 weeks (42 cells) for a stable grid height.
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

  /**
   * Page to `next`'s month AND keep `activeDay` inside it, so a rendered cell
   * always carries the roving `tabIndex=0`. Without this clamp the chevrons
   * would leave the grid keyboard-unreachable once paged off `activeDay`'s
   * month (WCAG 2.1.1). Preserves the day-of-month where valid, else clamps to
   * the last day (e.g. Jan 31 → Feb 28).
   */
  function goToMonth(next: Date) {
    const month = startOfMonth(next);
    setVisibleMonth(month);
    if (!isSameMonth(activeDay, month)) {
      const lastDom = lastDayOfMonth(month).getDate();
      const clampedDom = Math.min(activeDay.getDate(), lastDom);
      setActiveDay(addDays(month, clampedDom - 1));
    }
  }

  function moveActive(next: Date) {
    shouldFocusRef.current = true;
    setActiveDay(next);
    if (!isSameMonth(next, visibleMonth)) setVisibleMonth(startOfMonth(next));
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
      <div className="cal-head">
        <div className="m" aria-live="polite">
          {format(visibleMonth, 'LLLL yyyy', { locale: dateLocale })}
        </div>
        <div className="nav">
          <button
            type="button"
            aria-label={t('prev')}
            onClick={() => goToMonth(addMonths(visibleMonth, -1))}
          >
            <ChevronLeft className="rtl:-scale-x-100" aria-hidden="true" />
          </button>
          <button
            type="button"
            aria-label={t('next')}
            onClick={() => goToMonth(addMonths(visibleMonth, 1))}
          >
            <ChevronRight className="rtl:-scale-x-100" aria-hidden="true" />
          </button>
        </div>
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
              className="py-1.5 text-center text-xs font-medium text-text-muted"
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
                datum: format(day, 'EEEE, d. MMMM yyyy', { locale: dateLocale }),
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
                      ~18rem calendar column cannot fit 44px cells. 36px clears
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
                      // Solid muted token for out-of-month (>= 4.5:1 vs page bg).
                      !inMonth && 'text-text-muted',
                      inMonth && !isSelected && 'text-text-primary hover:bg-surface-muted',
                      // Today = ring/outline (keeps dark text → contrast-safe vs
                      // page bg), matching the accessible baseline; only the
                      // selected day gets the filled primary pill.
                      isToday && !isSelected && 'font-semibold ring-2 ring-inset ring-primary',
                      isSelected && 'bg-primary font-semibold text-primary-foreground',
                    )}
                  >
                    <span>{format(day, 'd')}</span>
                    {count > 0 ? (
                      <span
                        aria-hidden="true"
                        className={cn(
                          'absolute bottom-1 size-1 rounded-full',
                          isSelected ? 'bg-primary-foreground' : 'bg-success',
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
