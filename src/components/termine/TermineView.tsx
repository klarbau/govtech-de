'use client';

import * as React from 'react';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import {
  addDays,
  differenceInCalendarDays,
  format,
  parseISO,
  setHours,
  setMinutes,
  type Locale,
} from 'date-fns';
import {
  Bell,
  Calendar,
  CalendarPlus,
  CheckCircle2,
  ChevronRight,
  Clock,
  Euro,
  FileText,
  Info,
  Landmark,
  MapPin,
  ReceiptText,
  RefreshCw,
  Stethoscope,
} from 'lucide-react';

import { api } from '@/lib/mock-backend';
import { dateFnsLocale } from '@/lib/utils';
import type { Behoerde, Reminder, Termin, TerminStatus } from '@/types';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/shared/EmptyState';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

import { Skeleton } from '@/components/shared/Skeleton';

import { MonthCalendar } from './MonthCalendar';
import { TermineFilter, type TermineFilterKey } from './TermineFilter';

/* Re-wire of docs/design-prototype-v2/termine.html on the cobalt design
   system: keeps the prototype look, restores accessible + interactive
   behaviour (keyboard calendar, day-selection filtering, focus-trapped
   dialogs, live updates, real list affordances). */

interface TermineViewProps {
  nowIso: string;
}

type FilterState = Record<TermineFilterKey, boolean>;

/** yyyy-MM-dd key of an ISO timestamp (local). */
function dayKey(iso: string): string {
  try {
    return format(parseISO(iso), 'yyyy-MM-dd');
  } catch {
    return iso.slice(0, 10);
  }
}

function formatDateLong(iso: string, locale: Locale): string {
  try {
    return format(parseISO(iso), 'EEEE, dd. MMMM yyyy', { locale });
  } catch {
    return iso.slice(0, 10);
  }
}

function formatTimeRange(iso: string, durationMinutes = 45): string {
  try {
    const d = parseISO(iso);
    const end = new Date(d.getTime() + durationMinutes * 60 * 1000);
    return `${format(d, 'HH:mm')} – ${format(end, 'HH:mm')} Uhr`;
  } catch {
    return '';
  }
}

export function TermineView({ nowIso }: TermineViewProps) {
  const t = useTranslations();
  const tAction = useTranslations('termine.action');
  const tStatus = useTranslations('termine.status');
  const dateLocale = dateFnsLocale(useLocale());

  const now = React.useMemo(() => parseISO(nowIso), [nowIso]);
  const todayIso = React.useMemo(() => format(now, 'yyyy-MM-dd'), [now]);

  const [termine, setTermine] = React.useState<Termin[]>([]);
  const [reminders, setReminders] = React.useState<Reminder[]>([]);
  const [behoerdenById, setBehoerdenById] = React.useState<
    Record<string, Behoerde>
  >({});
  const [busy, setBusy] = React.useState<string | null>(null);
  const [phase, setPhase] = React.useState<'loading' | 'ready' | 'error'>(
    'loading',
  );

  const [filters, setFilters] = React.useState<FilterState>({
    behoerdentermine: true,
    erinnerungen: true,
    buchungen: true,
    abgeschlossen: false,
  });
  const [selectedIso, setSelectedIso] = React.useState<string | null>(null);
  const [detailTermin, setDetailTermin] = React.useState<Termin | null>(null);
  const [rescheduleTermin, setRescheduleTermin] = React.useState<Termin | null>(
    null,
  );

  const load = React.useCallback(async () => {
    setPhase('loading');
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const [terms, rems, behoerden] = await Promise.all([
          api.getTermine(),
          api.getReminders(),
          api.getBehoerden(),
        ]);
        setTermine(terms);
        setReminders(rems);
        setBehoerdenById(Object.fromEntries(behoerden.map((b) => [b.id, b])));
        setPhase('ready');
        return;
      } catch {
        await new Promise((r) => setTimeout(r, 200));
      }
    }
    setPhase('error');
  }, []);

  React.useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (cancelled) return;
      await load();
    })();
    return () => {
      cancelled = true;
    };
  }, [load]);

  /* C1/§1.2: react live when the autopilot mints/updates a Termin.
     The SSE connection (EventSource) is a long-lived request; opening it during
     the initial page load would keep the network permanently busy. We defer it
     past the first settle so the page can reach an idle network for SSR/axe,
     then attach for the rest of the session (autopilot events arrive far later
     in the demo, so the small delay is invisible). */
  React.useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    const handle = window.setTimeout(() => {
      unsubscribe = api.subscribe((event) => {
        if (event.type === 'termin_created') {
          setTermine((prev) =>
            prev.some((x) => x.id === event.termin.id)
              ? prev
              : [...prev, event.termin],
          );
        }
        if (event.type === 'termin_updated') {
          setTermine((prev) =>
            prev.map((x) => (x.id === event.termin.id ? event.termin : x)),
          );
        }
      });
    }, 4000);
    return () => {
      window.clearTimeout(handle);
      unsubscribe?.();
    };
  }, []);

  const behoerdeName = React.useCallback(
    (id?: string) => (id ? (behoerdenById[id]?.name_de ?? id) : ''),
    [behoerdenById],
  );

  const applyTermin = React.useCallback((updated: Termin) => {
    setTermine((prev) => prev.map((x) => (x.id === updated.id ? updated : x)));
  }, []);

  const handleBestaetigen = React.useCallback(
    async (termin: Termin) => {
      setBusy(termin.id);
      applyTermin({ ...termin, status: 'bestaetigt' });
      try {
        await api.bestaetigeTerminVorschlag(termin.id);
      } catch {
        /* optimistic update already applied */
      } finally {
        setBusy(null);
      }
    },
    [applyTermin],
  );

  const handleReschedule = React.useCallback(
    async (termin: Termin, neuesDatumIso: string) => {
      setBusy(termin.id);
      applyTermin({ ...termin, datum: neuesDatumIso, status: 'verschoben' });
      setRescheduleTermin(null);
      try {
        await api.verschiebeTermin(termin.id, neuesDatumIso);
      } catch {
        /* optimistic update already applied */
      } finally {
        setBusy(null);
      }
    },
    [applyTermin],
  );

  const handleAbsagen = React.useCallback(
    async (termin: Termin) => {
      if (
        typeof window !== 'undefined' &&
        !window.confirm(tAction('confirm_cancel'))
      ) {
        return;
      }
      setBusy(termin.id);
      applyTermin({ ...termin, status: 'abgesagt' });
      try {
        await api.sageTerminAb(termin.id);
      } catch {
        /* optimistic update already applied */
      } finally {
        setBusy(null);
      }
    },
    [applyTermin, tAction],
  );

  function toggleFilter(key: TermineFilterKey) {
    setFilters((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  /**
   * Filter-Gate für einen Termin. Buchung vs. Behördentermin über `kategorie`
   * (Fallback: Präsenz ⇒ Behördentermin). „Abgeschlossen" steuert, ob
   * abgesagte Termine sichtbar sind.
   */
  const isTerminVisible = React.useCallback(
    (termin: Termin): boolean => {
      const istBuchung =
        (termin.kategorie ??
          (termin.ort.typ === 'praesenz' ? 'behoerdentermin' : 'buchung')) ===
        'buchung';
      if (istBuchung) {
        if (!filters.buchungen) return false;
      } else if (!filters.behoerdentermine) {
        return false;
      }
      if (termin.status === 'abgesagt' && !filters.abgeschlossen) return false;
      return true;
    },
    [filters],
  );

  const visibleTermine = React.useMemo(
    () => termine.filter(isTerminVisible),
    [termine, isTerminVisible],
  );

  const visibleReminders = React.useMemo(
    () => (filters.erinnerungen ? reminders : []),
    [filters.erinnerungen, reminders],
  );

  const eventCounts = React.useMemo(() => {
    const counts: Record<string, number> = {};
    for (const item of [...visibleTermine, ...visibleReminders]) {
      const key = dayKey(item.datum);
      counts[key] = (counts[key] ?? 0) + 1;
    }
    return counts;
  }, [visibleTermine, visibleReminders]);

  const matchesSelectedDay = React.useCallback(
    (iso: string) => !selectedIso || dayKey(iso) === selectedIso,
    [selectedIso],
  );

  const futureTermine = React.useMemo(
    () =>
      visibleTermine
        .filter(
          (term) =>
            new Date(term.datum).getTime() >=
            now.getTime() - 24 * 3600 * 1000,
        )
        .sort((a, b) => a.datum.localeCompare(b.datum)),
    [visibleTermine, now],
  );

  const dayTermine = React.useMemo(
    () => futureTermine.filter((term) => matchesSelectedDay(term.datum)),
    [futureTermine, matchesSelectedDay],
  );

  const naechster = dayTermine[0] ?? null;
  const weitere = dayTermine.slice(1);

  const futureFristen = React.useMemo(
    () =>
      visibleReminders
        .filter(
          (r) =>
            new Date(r.datum).getTime() >= now.getTime() - 24 * 3600 * 1000,
        )
        .sort((a, b) => a.datum.localeCompare(b.datum)),
    [visibleReminders, now],
  );

  const dayFristen = React.useMemo(
    () => futureFristen.filter((r) => matchesSelectedDay(r.datum)),
    [futureFristen, matchesSelectedDay],
  );

  const hasDayContent = dayTermine.length > 0 || dayFristen.length > 0;

  function fristTage(iso: string): number {
    return differenceInCalendarDays(parseISO(iso), now);
  }

  /** Frist-Badge text + tone (relativ ≤30, danger ≤7, sonst absolutes Datum). */
  function fristBadge(iso: string): {
    label: string;
    variant: 'neutral' | 'warning' | 'danger';
  } {
    const days = fristTage(iso);
    if (days < 0) {
      return { label: t('termine.fristen.ueberfaellig'), variant: 'danger' };
    }
    if (days > 30) {
      return {
        label: format(parseISO(iso), 'MMM yyyy', { locale: dateLocale }),
        variant: 'neutral',
      };
    }
    const label = t('termine.fristen.in_tagen', { count: days });
    const variant = days <= 7 ? 'danger' : 'warning';
    return { label, variant };
  }

  function statusLabel(status: TerminStatus): string {
    return tStatus(status);
  }

  function statusBadgeClass(status: TerminStatus): string {
    switch (status) {
      case 'abgesagt':
        return 'red';
      case 'verschoben':
        return 'amber';
      case 'bestaetigt':
        return 'green';
      // Termin-Autopilot proposal: still awaiting the citizen's confirmation —
      // reads as "in progress", visually distinct from the confirmed green.
      case 'vorgeschlagen':
        return 'brand';
      default:
        return 'brand';
    }
  }

  function termineIconTone(term: Termin): {
    tone: string;
    Icon: React.ComponentType<{ className?: string }>;
  } {
    const lower = (behoerdeName(term.behoerde_id) || term.betreff || '').toLowerCase();
    if (lower.includes('kinderarzt') || lower.includes('arzt'))
      return { tone: 'violet', Icon: Stethoscope };
    if (lower.includes('finanz') || lower.includes('steuer'))
      return { tone: 'green', Icon: ReceiptText };
    if (lower.includes('beitragsservice') || lower.includes('rundfunk'))
      return { tone: 'green', Icon: Euro };
    return { tone: '', Icon: Landmark };
  }

  function reminderIcon(r: Reminder): React.ComponentType<{ className?: string }> {
    const lower = (r.titel || '').toLowerCase();
    if (lower.includes('steuer')) return ReceiptText;
    if (lower.includes('rundfunk') || lower.includes('beitrag')) return Euro;
    return Bell;
  }

  /** Drei Vorschlags-Slots: nächste 3 Werktage je 09:00 nach dem aktuellen Termin. */
  const rescheduleSlots = React.useMemo(() => {
    if (!rescheduleTermin) return [] as string[];
    const slots: string[] = [];
    let cursor = parseISO(rescheduleTermin.datum);
    const hours = [9, 11, 14];
    let i = 0;
    while (slots.length < 3 && i < 21) {
      cursor = addDays(cursor, 1);
      i += 1;
      const dow = cursor.getDay();
      if (dow === 0 || dow === 6) continue;
      const slot = setMinutes(setHours(cursor, hours[slots.length]!), 0);
      slots.push(slot.toISOString());
    }
    return slots;
  }, [rescheduleTermin]);

  /* Mock-ICS-Export: VCALENDAR aus den aktuell sichtbaren Terminen. */
  function handleIcsExport() {
    if (futureTermine.length === 0) return;
    const pad = (n: number) => n.toString().padStart(2, '0');
    const toIcsStamp = (d: Date) =>
      `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`;
    const escapeIcs = (s: string) =>
      s.replace(/[\\;,]/g, (m) => `\\${m}`).replace(/\n/g, '\\n');

    const lines = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//GovTech DE [MOCK]//Termine//DE',
      'CALSCALE:GREGORIAN',
    ];
    futureTermine.forEach((termin) => {
      const start = new Date(termin.datum);
      const end = new Date(start.getTime() + 45 * 60 * 1000);
      lines.push(
        'BEGIN:VEVENT',
        `UID:MOCK-${termin.id}@govtech.de`,
        `DTSTAMP:${toIcsStamp(now)}`,
        `DTSTART:${toIcsStamp(start)}`,
        `DTEND:${toIcsStamp(end)}`,
        `SUMMARY:${escapeIcs(`[MOCK] ${behoerdeName(termin.behoerde_id)} — ${termin.betreff}`)}`,
        `LOCATION:${escapeIcs(termin.ort.details)}`,
        termin.buchungsreferenz
          ? `DESCRIPTION:${escapeIcs(`[MOCK] Buchungsreferenz: ${termin.buchungsreferenz}`)}`
          : 'DESCRIPTION:[MOCK]',
        'END:VEVENT',
      );
    });
    lines.push('END:VCALENDAR');

    const blob = new Blob([lines.join('\r\n')], { type: 'text/calendar' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'MOCK-termine.ics';
    a.click();
    URL.revokeObjectURL(url);
  }

  const selectedDateLabel = selectedIso
    ? format(parseISO(selectedIso), 'EEEE, dd. MMMM yyyy', { locale: dateLocale })
    : '';

  if (phase === 'error') {
    return (
      <>
        <div className="gt-page-head">
          <h1>{t('termine.title')}</h1>
          <div className="sub">{t('termine.subtitle')}</div>
        </div>
        <EmptyState
          icon={<Info aria-hidden="true" />}
          title={t('termine.error')}
          action={
            <Button onClick={() => void load()}>
              <RefreshCw aria-hidden="true" />
              {t('termine.retry')}
            </Button>
          }
        />
      </>
    );
  }

  const loading = phase === 'loading';

  return (
    <>
      <div className="gt-page-head">
        <h1>{t('termine.title')}</h1>
        <div className="sub">{t('termine.subtitle')}</div>
      </div>

      <div className="tm-layout">
        {/* Left: calendar + filter */}
        <div>
          <div className="tm-card">
            {loading ? (
              <div role="status" aria-busy="true">
                <span className="sr-only">{t('common.loading')}</span>
                <Skeleton className="rounded-md" style={{ height: 280 }} />
              </div>
            ) : (
              <MonthCalendar
                selectedIso={selectedIso}
                todayIso={todayIso}
                eventCounts={eventCounts}
                onSelect={setSelectedIso}
              />
            )}
          </div>

          <div className="tm-card filter-card">
            <TermineFilter
              active={(
                Object.keys(filters) as TermineFilterKey[]
              ).filter((k) => filters[k])}
              onToggle={toggleFilter}
            />
          </div>
        </div>

        {/* Middle: next termin + further list */}
        <div>
          <h2 className="text-md fw-600" style={{ marginBottom: 12 }}>
            {t('termine.naechste.title')}
          </h2>

          {selectedIso ? (
            <div
              className="filter-chip-row"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                marginBottom: 12,
              }}
            >
              <span className="badge brand">
                <span className="tabular-nums">
                  {t('termine.auswahl.label', { datum: selectedDateLabel })}
                </span>
              </span>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setSelectedIso(null)}
              >
                {t('termine.auswahl.aufheben')}
              </button>
            </div>
          ) : null}

          {loading ? (
            <div role="status" aria-busy="true">
              <span className="sr-only">{t('common.loading')}</span>
              <Skeleton className="rounded-lg" style={{ minHeight: 120 }} />
              <Skeleton
                className="rounded-lg"
                style={{ marginTop: 22, height: 72 }}
              />
              <Skeleton
                className="rounded-lg"
                style={{ marginTop: 10, height: 72 }}
              />
            </div>
          ) : naechster ? (
            <div className="tm-next">
              {/* Info area = details entry point. The whole block is clickable
                  (mouse), and a focusable Details button in the header makes the
                  same destination keyboard-reachable. The lifecycle action
                  buttons stopPropagation so they never trigger the dialog. */}
              <div
                className="row1 is-clickable"
                onClick={() => setDetailTermin(naechster)}
              >
                <span className="icon-circle">
                  <Calendar />
                </span>
                <div className="grow">
                  <div className="t">
                    {behoerdeName(naechster.behoerde_id)} — {naechster.betreff}
                  </div>
                  <div className="meta">
                    <span className="tabular-nums">
                      <Calendar style={{ width: 14, height: 14 }} />
                      {formatDateLong(naechster.datum, dateLocale)} &nbsp;
                      <Clock style={{ width: 14, height: 14 }} />
                      {formatTimeRange(naechster.datum)}
                    </span>
                    <span>
                      <MapPin style={{ width: 14, height: 14 }} />
                      {naechster.ort.details}
                    </span>
                    {naechster.buchungsreferenz ? (
                      <span className="tabular-nums">
                        {t('termine.card.buchungsreferenz', {
                          ref: naechster.buchungsreferenz,
                        })}
                      </span>
                    ) : null}
                  </div>
                </div>
                <div className="row1-end">
                  <span
                    className={`badge ${statusBadgeClass(naechster.status)}`}
                  >
                    {statusLabel(naechster.status)}
                  </span>
                  <button
                    type="button"
                    className="tm-row-cta tm-row-cta-btn"
                    aria-label={t('termine.naechste.details_aria', {
                      betreff: naechster.betreff,
                    })}
                    onClick={(e) => {
                      e.stopPropagation();
                      setDetailTermin(naechster);
                    }}
                  >
                    {t('termine.row.details_cta')}
                    <ChevronRight aria-hidden="true" />
                  </button>
                </div>
              </div>
              <div className="appt-actions">
                {naechster.status !== 'bestaetigt' &&
                naechster.status !== 'abgesagt' ? (
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    disabled={busy === naechster.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleBestaetigen(naechster);
                    }}
                  >
                    <CheckCircle2 />
                    {tAction('bestaetigen')}
                  </button>
                ) : null}
                {naechster.status !== 'abgesagt' ? (
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    disabled={busy === naechster.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      setRescheduleTermin(naechster);
                    }}
                  >
                    <CalendarPlus />
                    {tAction('verschieben')}
                  </button>
                ) : null}
                {naechster.status !== 'abgesagt' ? (
                  <button
                    type="button"
                    className="btn btn-danger btn-sm"
                    disabled={busy === naechster.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAbsagen(naechster);
                    }}
                  >
                    {tAction('absagen')}
                  </button>
                ) : null}
              </div>
            </div>
          ) : !hasDayContent && selectedIso ? (
            <EmptyState
              icon={<Calendar aria-hidden="true" />}
              title={t('termine.empty.filter_title')}
            />
          ) : (
            <EmptyState
              icon={<Calendar aria-hidden="true" />}
              title={t('termine.empty.title')}
              description={t('termine.empty.description')}
            />
          )}

          <h2 className="text-md fw-600" style={{ margin: '22px 0 12px' }}>
            {t('termine.weitere.title')}
          </h2>

          {!loading &&
            weitere.map((term) => {
              const { tone, Icon } = termineIconTone(term);
              return (
                <button
                  key={term.id}
                  type="button"
                  className="tm-list-item is-interactive"
                  style={{ width: '100%', textAlign: 'left' }}
                  aria-label={t('termine.row.details_aria', {
                    betreff: `${behoerdeName(term.behoerde_id)} — ${term.betreff}`,
                  })}
                  onClick={() => setDetailTermin(term)}
                >
                  <span className={`icon-circle${tone ? ` ${tone}` : ''}`}>
                    <Icon />
                  </span>
                  <div>
                    <div className="t">
                      {behoerdeName(term.behoerde_id)} — {term.betreff}
                    </div>
                    <div className="meta tabular-nums">
                      <span>
                        <Calendar style={{ width: 14, height: 14 }} />
                        {formatDateLong(term.datum, dateLocale)}
                      </span>{' '}
                      <span>
                        <Clock style={{ width: 14, height: 14 }} />
                        {formatTimeRange(term.datum)}
                      </span>
                    </div>
                    <div className="meta">
                      <span>
                        <MapPin style={{ width: 14, height: 14 }} />
                        {term.ort.details}
                      </span>
                    </div>
                  </div>
                  <span className={`badge ${statusBadgeClass(term.status)}`}>
                    {statusLabel(term.status)}
                  </span>
                  <span className="tm-row-cta" aria-hidden="true">
                    {t('termine.row.details_cta')}
                    <ChevronRight />
                  </span>
                </button>
              );
            })}

          {!loading &&
            dayFristen.map((r) => {
              const Icon = reminderIcon(r);
              const isFrist = r.kategorie === 'frist';
              const content = (
                <>
                  <span className="icon-circle green">
                    <Icon />
                  </span>
                  <div>
                    <div className="t">{r.titel}</div>
                    <div className="meta tabular-nums">
                      <span>
                        <Calendar style={{ width: 14, height: 14 }} />
                        {isFrist
                          ? t('termine.frist_praefix', {
                              datum: formatDateLong(r.datum, dateLocale),
                            })
                          : t('termine.faellig_praefix', {
                              datum: formatDateLong(r.datum, dateLocale),
                            })}
                      </span>
                    </div>
                    {r.behoerde_id ? (
                      <div className="meta">{behoerdeName(r.behoerde_id)}</div>
                    ) : null}
                  </div>
                  <Badge variant={fristBadge(r.datum).variant}>
                    {fristBadge(r.datum).label}
                  </Badge>
                </>
              );
              /* Interactive iff there is a destination (a Vorgang). The whole
                 row is the single click target, with a destination-accurate
                 trailing affordance. Reminders without a Vorgang render flat:
                 plain div, no link styling, no CTA, not focusable. */
              return r.vorgang_id ? (
                <Link
                  key={r.id}
                  href={`/vorgaenge/${r.vorgang_id}`}
                  className="tm-list-item is-interactive"
                  aria-label={t('termine.row.zum_vorgang_aria', {
                    titel: r.titel,
                  })}
                >
                  {content}
                  <span className="tm-row-cta" aria-hidden="true">
                    {t('termine.row.zum_vorgang_cta')}
                    <ChevronRight />
                  </span>
                </Link>
              ) : (
                <div key={r.id} className="tm-list-item">
                  {content}
                </div>
              );
            })}

          {!loading ? (
            <button
              type="button"
              className="btn btn-secondary"
              style={{ marginTop: 14 }}
              onClick={() => toggleFilter('abgeschlossen')}
            >
              <Calendar />
              {filters.abgeschlossen
                ? t('termine.alle_anzeigen.hide')
                : t('termine.alle_anzeigen.show')}
            </button>
          ) : null}
        </div>

        {/* Right: prepare-for-the-appointment + fristen */}
        <div>
          <h2 className="text-md fw-600" style={{ marginBottom: 2 }}>
            {t('termine.naechster_schritt.title')}
          </h2>
          <div className="text-xs muted" style={{ marginBottom: 12 }}>
            {t('termine.naechster_schritt.untertitel')}
          </div>
          <div className="tm-card ns-card">
            <div className="heading">
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span className="icon-circle">
                  <Calendar />
                </span>
                <div className="t">
                  {naechster
                    ? `${behoerdeName(naechster.behoerde_id)} — ${naechster.betreff}`
                    : t('termine.naechster_schritt.kein_termin')}
                </div>
              </div>
              {naechster ? (
                <span className={`badge ${statusBadgeClass(naechster.status)}`}>
                  {statusLabel(naechster.status)}
                </span>
              ) : null}
            </div>

            <div className="ns-info">
              <div className="row tabular-nums">
                <Calendar />
                {naechster ? formatDateLong(naechster.datum, dateLocale) : '—'}
              </div>
              <div className="row tabular-nums">
                <Clock />
                {naechster
                  ? t('termine.uhr_dauer', {
                      zeit: formatTimeRange(naechster.datum),
                      dauer: 45,
                    })
                  : '—'}
              </div>
              <div className="row">
                <MapPin />
                <div>
                  <span className="link">
                    {behoerdeName(naechster?.behoerde_id)}
                  </span>
                  <br />
                  {naechster?.ort.details ?? ''}
                </div>
              </div>
              {naechster?.buchungsreferenz ? (
                <div className="row" style={{ marginTop: 6 }}>
                  <FileText />
                  <div>
                    {t('termine.card.buchungsreferenz_label')}
                    <br />
                    <span className="mono tabular-nums">
                      {naechster.buchungsreferenz}
                    </span>
                  </div>
                </div>
              ) : null}
            </div>

            <button
              type="button"
              className="btn btn-primary"
              style={{ width: '100%' }}
              disabled={futureTermine.length === 0}
              aria-disabled={futureTermine.length === 0}
              aria-label={t('termine.card.ics_aria_all')}
              onClick={handleIcsExport}
            >
              <CalendarPlus />
              {t('termine.card.ics')}
            </button>

            <div className="prep-card">
              <h3>{t('termine.vorbereitung.title')}</h3>
              {naechster?.vorbereitung && naechster.vorbereitung.length > 0 ? (
                naechster.vorbereitung.map((item) => (
                  <div key={item.label_i18n_key} className="prep-row">
                    <FileText className="icon" />
                    <div>
                      <div className="t">{t(item.label_i18n_key)}</div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="prep-row">
                  <FileText className="icon" />
                  <div>
                    <div className="s">
                      {t('termine.empty.naechster_schritt')}
                    </div>
                  </div>
                </div>
              )}
              <div className="ns-notes">
                <div className="ns-note">
                  <Clock className="icon" aria-hidden="true" />
                  <div>
                    <div className="t">
                      {t('termine.naechster_schritt.vorerinnerung_titel')}
                    </div>
                    <div className="s">
                      {t('termine.naechster_schritt.vorerinnerung_text')}
                    </div>
                  </div>
                </div>
                <div className="ns-note">
                  <Info className="icon" aria-hidden="true" />
                  <div>
                    <div className="t">
                      {t('termine.naechster_schritt.storno_titel')}
                    </div>
                    <div className="s">
                      {t('termine.naechster_schritt.storno_text')}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {(() => {
              const hasFristen = dayFristen.length > 0;
              const urgentCount = dayFristen.filter(
                (r) => fristTage(r.datum) <= 7,
              ).length;

              const buckets: {
                key: 'diese_woche' | 'demnaechst' | 'spaeter';
                rows: typeof dayFristen;
              }[] = [
                { key: 'diese_woche', rows: [] },
                { key: 'demnaechst', rows: [] },
                { key: 'spaeter', rows: [] },
              ];
              for (const r of dayFristen) {
                const days = fristTage(r.datum);
                if (days <= 7) buckets[0]!.rows.push(r);
                else if (days <= 30) buckets[1]!.rows.push(r);
                else buckets[2]!.rows.push(r);
              }

              function renderRow(r: (typeof dayFristen)[number]) {
                const badge = fristBadge(r.datum);
                const row = (
                  <div className={`frist-rail-row frist-rail-row--${badge.variant}`}>
                    <span className="frist-rail-row__title">{r.titel}</span>
                    <span className="frist-rail-row__end">
                      <Badge variant={badge.variant}>{badge.label}</Badge>
                      {r.vorgang_id ? (
                        <ChevronRight
                          className="frist-rail-row__chev"
                          aria-hidden="true"
                        />
                      ) : null}
                    </span>
                  </div>
                );
                /* A destination (Vorgang) makes the whole row a link; the
                   trailing chevron + the aria-label carry the affordance.
                   Rows without a Vorgang stay flat, static information. */
                return (
                  <li key={r.id}>
                    {r.vorgang_id ? (
                      <Link
                        href={`/vorgaenge/${r.vorgang_id}`}
                        className="frist-rail-link"
                        aria-label={t('termine.row.zum_vorgang_aria', {
                          titel: r.titel,
                        })}
                      >
                        {row}
                      </Link>
                    ) : (
                      row
                    )}
                  </li>
                );
              }

              return (
                <div
                  className={hasFristen ? 'frist-panel' : undefined}
                  style={
                    hasFristen
                      ? undefined
                      : {
                          marginTop: 16,
                          padding: 14,
                          background: 'var(--banner-success-bg)',
                          borderRadius: 'var(--r-md)',
                        }
                  }
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      marginBottom: hasFristen ? 12 : 0,
                    }}
                  >
                    {hasFristen ? (
                      <Bell
                        style={{
                          color: 'var(--ink-2)',
                          width: 18,
                          height: 18,
                          flexShrink: 0,
                        }}
                        aria-hidden="true"
                      />
                    ) : (
                      <CheckCircle2
                        style={{
                          color: 'var(--green-600)',
                          width: 18,
                          height: 18,
                          flexShrink: 0,
                        }}
                        aria-hidden="true"
                      />
                    )}
                    <div>
                      <h3 className="fw-600" style={{ margin: 0, fontSize: 14 }}>
                        {t('termine.fristen.title')}
                      </h3>
                      <div className="text-xs muted">
                        {urgentCount > 0
                          ? t('termine.fristen.summary', {
                              urgent: urgentCount,
                              total: dayFristen.length,
                            })
                          : t('termine.fristen_offen', {
                              count: dayFristen.length,
                            })}
                      </div>
                    </div>
                  </div>
                  {hasFristen
                    ? buckets
                        .filter((b) => b.rows.length > 0)
                        .map((b) => (
                          <React.Fragment key={b.key}>
                            <h4 className="frist-group-head">
                              {t(`termine.fristen.group.${b.key}`)}
                            </h4>
                            <ul className="frist-panel__group">
                              {b.rows.map(renderRow)}
                            </ul>
                          </React.Fragment>
                        ))
                    : null}
                </div>
              );
            })()}
          </div>
        </div>
      </div>

      {/* Detail dialog (focus-trapped shared primitive). */}
      <Dialog
        open={detailTermin !== null}
        onOpenChange={(open) => {
          if (!open) setDetailTermin(null);
        }}
      >
        <DialogContent>
          {detailTermin ? (
            <>
              <DialogHeader>
                <DialogTitle>
                  {behoerdeName(detailTermin.behoerde_id)} —{' '}
                  {detailTermin.betreff}
                </DialogTitle>
                <DialogDescription>
                  {t('termine.detail.status_label', {
                    status: statusLabel(detailTermin.status),
                  })}
                </DialogDescription>
              </DialogHeader>
              <div className="ns-info">
                <div className="row tabular-nums">
                  <Calendar />
                  {formatDateLong(detailTermin.datum, dateLocale)}
                </div>
                <div className="row tabular-nums">
                  <Clock />
                  {t('termine.uhr_dauer', {
                    zeit: formatTimeRange(detailTermin.datum),
                    dauer: 45,
                  })}
                </div>
                <div className="row">
                  <MapPin />
                  <div>
                    <span className="link">
                      {behoerdeName(detailTermin.behoerde_id)}
                    </span>
                    <br />
                    {detailTermin.ort.details}
                  </div>
                </div>
                {detailTermin.buchungsreferenz ? (
                  <div className="row" style={{ marginTop: 6 }}>
                    <FileText />
                    <div>
                      {t('termine.card.buchungsreferenz_label')}
                      <br />
                      <span className="mono tabular-nums">
                        {detailTermin.buchungsreferenz}
                      </span>
                    </div>
                  </div>
                ) : null}
              </div>
              <DialogFooter>
                {detailTermin.vorgang_id ? (
                  <Button variant="outline" render={<Link href={`/vorgaenge/${detailTermin.vorgang_id}`} />}>
                    {t('termine.row.zum_vorgang_cta')}
                  </Button>
                ) : null}
                <DialogClose render={<Button />}>
                  {t('common.actions.close')}
                </DialogClose>
              </DialogFooter>
            </>
          ) : null}
        </DialogContent>
      </Dialog>

      {/* Reschedule dialog (focus-trapped shared primitive). */}
      <Dialog
        open={rescheduleTermin !== null}
        onOpenChange={(open) => {
          if (!open) setRescheduleTermin(null);
        }}
      >
        <DialogContent>
          {rescheduleTermin ? (
            <>
              <DialogHeader>
                <DialogTitle>{t('termine.reschedule.title')}</DialogTitle>
                <DialogDescription>
                  {t('termine.reschedule.intro')}
                </DialogDescription>
              </DialogHeader>
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10,
                  marginTop: 4,
                }}
              >
                {rescheduleSlots.map((slot) => (
                  <button
                    key={slot}
                    type="button"
                    className="btn btn-secondary"
                    style={{ justifyContent: 'flex-start' }}
                    disabled={busy === rescheduleTermin.id}
                    onClick={() => handleReschedule(rescheduleTermin, slot)}
                  >
                    <Calendar />
                    <span className="tabular-nums">
                      {formatDateLong(slot, dateLocale)} · {formatTimeRange(slot)}
                    </span>
                  </button>
                ))}
              </div>
              <DialogFooter>
                <DialogClose render={<Button variant="outline" />}>
                  {t('common.actions.abbrechen')}
                </DialogClose>
              </DialogFooter>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
