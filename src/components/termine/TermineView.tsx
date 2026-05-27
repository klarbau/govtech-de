'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { differenceInCalendarDays, format, parseISO } from 'date-fns';
import {
  Bell,
  CalendarDays,
  Landmark,
  MapPin,
  Video,
} from 'lucide-react';

import { cn } from '@/lib/utils';
import { formatDateDe, formatTimeDe } from '@/lib/utils';
import { api } from '@/lib/mock-backend';
import type { Behoerde, Reminder, Termin } from '@/types';

import { PageHeader } from '@/components/shared/PageHeader';
import { SectionCard } from '@/components/shared/SectionCard';
import { RightRailCard } from '@/components/shared/RightRailCard';
import { ListRow } from '@/components/shared/ListRow';
import { IconCircle } from '@/components/shared/IconCircle';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { EmptyState } from '@/components/shared/EmptyState';
import { Button } from '@/components/ui/button';

import { MonthCalendar } from './MonthCalendar';
import {
  TermineFilter,
  type TermineFilterKey,
} from './TermineFilter';
import { NaechsterTerminCard } from './NaechsterTerminCard';
import { TerminVorbereitungChecklist } from './TerminVorbereitungChecklist';
import { downloadIcs } from './buildIcs';

interface TermineViewProps {
  /** SSR-stable demo "now". */
  nowIso: string;
}

type TerminItem =
  | { kind: 'termin'; id: string; datum: string; data: Termin }
  | { kind: 'reminder'; id: string; datum: string; data: Reminder };

function terminFilterKey(termin: Termin, nowIso: string): TermineFilterKey {
  if (differenceInCalendarDays(parseISO(termin.datum), parseISO(nowIso)) < 0) {
    return 'abgeschlossen';
  }
  if (termin.kategorie === 'buchung') return 'buchungen';
  return 'behoerdentermine';
}

export function TermineView({ nowIso }: TermineViewProps) {
  const t = useTranslations('termine');
  const tCommon = useTranslations('common');
  const tStatus = useTranslations('common.status');

  const [termine, setTermine] = React.useState<Termin[]>([]);
  const [reminders, setReminders] = React.useState<Reminder[]>([]);
  const [behoerdenById, setBehoerdenById] = React.useState<
    Record<string, Behoerde>
  >({});
  const [loadState, setLoadState] = React.useState<'loading' | 'ready' | 'error'>(
    'loading',
  );

  const [selectedIso, setSelectedIso] = React.useState<string | null>(null);
  const [activeFilters, setActiveFilters] = React.useState<TermineFilterKey[]>([
    'behoerdentermine',
    'erinnerungen',
    'buchungen',
  ]);
  const [detailTerminId, setDetailTerminId] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    setLoadState('loading');
    try {
      const [terms, rems, behoerden] = await Promise.all([
        api.getTermine(),
        api.getReminders(),
        api.getBehoerden(),
      ]);
      setTermine(terms);
      setReminders(rems);
      setBehoerdenById(Object.fromEntries(behoerden.map((b) => [b.id, b])));
      setLoadState('ready');
    } catch {
      setLoadState('error');
    }
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  const behoerdeName = React.useCallback(
    (id?: string) => (id ? behoerdenById[id]?.name_de ?? id : ''),
    [behoerdenById],
  );

  const toggleFilter = React.useCallback((key: TermineFilterKey) => {
    setActiveFilters((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
    );
  }, []);

  // Event-count map for the calendar (termine + reminders by yyyy-MM-dd).
  const eventCounts = React.useMemo(() => {
    const map: Record<string, number> = {};
    const add = (iso: string) => {
      const key = format(parseISO(iso), 'yyyy-MM-dd');
      map[key] = (map[key] ?? 0) + 1;
    };
    termine.forEach((x) => add(x.datum));
    reminders.forEach((x) => add(x.datum));
    return map;
  }, [termine, reminders]);

  // The chronologically next future, non-cancelled termin.
  const naechsterTermin = React.useMemo(() => {
    const future = termine
      .filter(
        (x) =>
          x.status !== 'abgesagt' &&
          differenceInCalendarDays(parseISO(x.datum), parseISO(nowIso)) >= 0,
      )
      .sort((a, b) => a.datum.localeCompare(b.datum));
    return future[0] ?? null;
  }, [termine, nowIso]);

  // Combined + filtered list for "Weitere Termine & Erinnerungen".
  const combinedItems = React.useMemo<TerminItem[]>(() => {
    const items: TerminItem[] = [];

    for (const termin of termine) {
      const cat = terminFilterKey(termin, nowIso);
      if (!activeFilters.includes(cat)) continue;
      items.push({ kind: 'termin', id: termin.id, datum: termin.datum, data: termin });
    }

    if (activeFilters.includes('erinnerungen')) {
      for (const reminder of reminders) {
        items.push({
          kind: 'reminder',
          id: reminder.id,
          datum: reminder.datum,
          data: reminder,
        });
      }
    }

    const dayFiltered = selectedIso
      ? items.filter(
          (x) => format(parseISO(x.datum), 'yyyy-MM-dd') === selectedIso,
        )
      : items;

    return dayFiltered.sort((a, b) => a.datum.localeCompare(b.datum));
  }, [termine, reminders, activeFilters, selectedIso, nowIso]);

  // "Weitere" excludes the highlighted next termin (unless a day is selected).
  const weitereItems = React.useMemo(() => {
    if (selectedIso) return combinedItems;
    return combinedItems.filter(
      (x) => !(x.kind === 'termin' && x.id === naechsterTermin?.id),
    );
  }, [combinedItems, naechsterTermin, selectedIso]);

  const fristen = React.useMemo(
    () =>
      reminders
        .filter((r) => r.kategorie === 'frist')
        .sort((a, b) => a.datum.localeCompare(b.datum)),
    [reminders],
  );

  const detailTermin = React.useMemo(() => {
    const id = detailTerminId ?? naechsterTermin?.id ?? null;
    return termine.find((x) => x.id === id) ?? naechsterTermin;
  }, [detailTerminId, naechsterTermin, termine]);

  function exportIcs(termin: Termin) {
    downloadIcs(termin, behoerdeName(termin.behoerde_id));
  }

  function fristTone(datumIso: string): 'warn' | 'danger' | undefined {
    const days = differenceInCalendarDays(parseISO(datumIso), parseISO(nowIso));
    if (days <= 7) return 'danger';
    if (days <= 30) return 'warn';
    return undefined;
  }

  function fristLabel(datumIso: string): string {
    const days = differenceInCalendarDays(parseISO(datumIso), parseISO(nowIso));
    if (days < 0) return t('fristen.ueberfaellig');
    return t('fristen.in_tagen', { count: days });
  }

  return (
    <div className="px-4 py-4 md:px-6 md:py-6">
      <PageHeader
        title={t('title')}
        subtitle={t('subtitle')}
        contextChip={{
          label: tCommon('context_chip.speculative'),
          tone: 'speculative',
        }}
      />

      {loadState === 'error' ? (
        <EmptyState
          icon={<CalendarDays aria-hidden="true" />}
          title={t('error')}
          action={
            <Button type="button" variant="outline" onClick={() => void load()}>
              {tCommon('cta.erneut_versuchen')}
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[18rem_minmax(0,1fr)_20rem]">
          {/* Left column: calendar + filter */}
          <div className="space-y-6">
            <SectionCard padding="md">
              <MonthCalendar
                selectedIso={selectedIso}
                todayIso={nowIso}
                eventCounts={eventCounts}
                onSelect={setSelectedIso}
              />
            </SectionCard>
            <SectionCard padding="md">
              <TermineFilter active={activeFilters} onToggle={toggleFilter} />
            </SectionCard>
          </div>

          {/* Center column: next termin + further list */}
          <div className="space-y-6">
            <section aria-labelledby="termine-naechste">
              <h2
                id="termine-naechste"
                className="mb-3 text-lg font-semibold text-text-primary"
              >
                {t('naechste.title')}
              </h2>
              {loadState === 'loading' ? (
                <div
                  className="h-40 animate-pulse rounded-xl bg-surface-muted motion-reduce:animate-none"
                  aria-hidden="true"
                />
              ) : naechsterTermin ? (
                <NaechsterTerminCard
                  termin={naechsterTermin}
                  behoerdeName={behoerdeName(naechsterTermin.behoerde_id)}
                  statusLabel={tStatus('bestaetigt')}
                  onIcsExport={() => exportIcs(naechsterTermin)}
                  onDetails={() => setDetailTerminId(naechsterTermin.id)}
                />
              ) : (
                <EmptyState
                  icon={<CalendarDays aria-hidden="true" />}
                  title={t('empty.title')}
                  description={t('empty.description')}
                />
              )}
            </section>

            <section aria-labelledby="termine-weitere">
              <h2
                id="termine-weitere"
                className="mb-3 text-lg font-semibold text-text-primary"
              >
                {t('weitere.title')}
              </h2>
              {loadState === 'loading' ? (
                <div className="space-y-2" aria-hidden="true">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div
                      key={i}
                      className="h-14 animate-pulse rounded-md bg-surface-muted motion-reduce:animate-none"
                    />
                  ))}
                </div>
              ) : weitereItems.length === 0 ? (
                <EmptyState
                  icon={<CalendarDays aria-hidden="true" />}
                  title={t('empty.filter_title')}
                />
              ) : (
                <ul className="divide-y divide-border">
                  {weitereItems.map((item) => (
                    <li key={`${item.kind}-${item.id}`}>
                      {item.kind === 'termin' ? (
                        <TerminListRow
                          termin={item.data}
                          behoerdeName={behoerdeName(item.data.behoerde_id)}
                          ortLabel={t(`ort.${item.data.ort.typ}`)}
                          detailsLabel={t('card.details')}
                          onDetails={() => setDetailTerminId(item.data.id)}
                        />
                      ) : (
                        <ReminderListRow
                          reminder={item.data}
                          behoerdeName={behoerdeName(item.data.behoerde_id)}
                          fristLabel={fristLabel(item.data.datum)}
                          fristTone={fristTone(item.data.datum)}
                        />
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>

          {/* Right column: detail + checklist + fristen */}
          <aside className="space-y-6" aria-label={t('naechster_schritt.title')}>
            <RightRailCard title={t('naechster_schritt.title')} as="h2">
              {detailTermin ? (
                <div className="space-y-2">
                  <p className="font-medium text-text-primary">
                    {detailTermin.betreff}
                  </p>
                  <p>{behoerdeName(detailTermin.behoerde_id)}</p>
                  <p className="tabular-nums text-text-primary" dir="ltr">
                    {formatDateDe(detailTermin.datum)} ·{' '}
                    {formatTimeDe(detailTermin.datum)}
                  </p>
                  <p className="flex items-start gap-1.5">
                    <MapPin
                      className="mt-0.5 size-4 shrink-0 text-text-secondary"
                      aria-hidden="true"
                    />
                    {detailTermin.ort.details}
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    className="mt-1 w-full"
                    onClick={() => exportIcs(detailTermin)}
                    aria-label={t('card.ics_aria', { betreff: detailTermin.betreff })}
                  >
                    {t('card.ics')}
                  </Button>
                </div>
              ) : (
                <p>{t('empty.naechster_schritt')}</p>
              )}
            </RightRailCard>

            {detailTermin?.vorbereitung && detailTermin.vorbereitung.length > 0 ? (
              <SectionCard title={t('vorbereitung.title')} padding="md">
                <TerminVorbereitungChecklist items={detailTermin.vorbereitung} />
              </SectionCard>
            ) : null}

            <SectionCard title={t('fristen.title')} padding="md">
              {fristen.length === 0 ? (
                <p className="text-sm text-text-secondary">
                  {t('empty.description')}
                </p>
              ) : (
                <ul className="space-y-2">
                  {fristen.map((frist) => (
                    <li
                      key={frist.id}
                      className="flex items-center justify-between gap-2 text-sm"
                    >
                      <span className="min-w-0 truncate text-text-primary">
                        {frist.titel}
                      </span>
                      <StatusBadge
                        variant="ablauf_bald"
                        urgency={fristTone(frist.datum) === 'danger' ? 'danger' : 'warn'}
                      >
                        {fristLabel(frist.datum)}
                      </StatusBadge>
                    </li>
                  ))}
                </ul>
              )}
            </SectionCard>
          </aside>
        </div>
      )}
    </div>
  );
}

function TerminListRow({
  termin,
  behoerdeName,
  ortLabel,
  detailsLabel,
  onDetails,
}: {
  termin: Termin;
  behoerdeName: string;
  ortLabel: string;
  detailsLabel: string;
  onDetails: () => void;
}) {
  const icon =
    termin.ort.typ === 'video' ? (
      <Video aria-hidden="true" />
    ) : (
      <Landmark aria-hidden="true" />
    );
  return (
    <ListRow
      leading={<IconCircle icon={icon} tone="primary" />}
      title={termin.betreff}
      subtitle={
        <span className="tabular-nums" dir="ltr">
          {formatDateDe(termin.datum)} · {formatTimeDe(termin.datum)} · {behoerdeName}
        </span>
      }
      meta={<span>{ortLabel}</span>}
      actions={
        <Button type="button" variant="ghost" size="sm" onClick={onDetails}>
          {detailsLabel}
        </Button>
      }
    />
  );
}

function ReminderListRow({
  reminder,
  behoerdeName,
  fristLabel,
  fristTone,
}: {
  reminder: Reminder;
  behoerdeName: string;
  fristLabel: string;
  fristTone: 'warn' | 'danger' | undefined;
}) {
  return (
    <ListRow
      leading={
        <IconCircle
          icon={<Bell aria-hidden="true" />}
          tone={reminder.kategorie === 'frist' ? 'warning' : 'neutral'}
        />
      }
      title={reminder.titel}
      subtitle={
        <span className={cn('tabular-nums')} dir="ltr">
          {formatDateDe(reminder.datum)}
          {behoerdeName ? ` · ${behoerdeName}` : ''}
        </span>
      }
      status={
        reminder.kategorie === 'frist' ? (
          <StatusBadge
            variant="ablauf_bald"
            urgency={fristTone === 'danger' ? 'danger' : 'warn'}
          >
            {fristLabel}
          </StatusBadge>
        ) : undefined
      }
    />
  );
}
