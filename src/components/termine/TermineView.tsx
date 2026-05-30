'use client';

import * as React from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import {
  Bell,
  Bookmark,
  Calendar,
  CalendarPlus,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Euro,
  FileText,
  Info,
  Landmark,
  MapPin,
  ReceiptText,
  Stethoscope,
  X,
} from 'lucide-react';

import { api } from '@/lib/mock-backend';
import type { Behoerde, Reminder, Termin } from '@/types';

/* Literal port of docs/design-prototype-v2/termine.html. */

interface TermineViewProps {
  nowIso: string;
}

type FilterKey = 'behoerden' | 'erinnerungen' | 'buchungen' | 'abgeschlossen';

const MONTH_LABELS = [
  'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
  'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember',
] as const;

const WEEKDAY_DE = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'] as const;

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return `${WEEKDAY_DE[d.getDay()] === 'So' ? 'Sonntag' :
      d.getDay() === 1 ? 'Montag' :
      d.getDay() === 2 ? 'Dienstag' :
      d.getDay() === 3 ? 'Mittwoch' :
      d.getDay() === 4 ? 'Donnerstag' :
      d.getDay() === 5 ? 'Freitag' : 'Samstag'}, ${d.getDate().toString().padStart(2, '0')}. ${MONTH_LABELS[d.getMonth()]} ${d.getFullYear()}`;
  } catch {
    return iso.slice(0, 10);
  }
}

function formatTimeRange(iso: string, durationMinutes = 45): string {
  try {
    const d = new Date(iso);
    const hh = d.getHours().toString().padStart(2, '0');
    const mm = d.getMinutes().toString().padStart(2, '0');
    const end = new Date(d.getTime() + durationMinutes * 60 * 1000);
    const eh = end.getHours().toString().padStart(2, '0');
    const em = end.getMinutes().toString().padStart(2, '0');
    return `${hh}:${mm} – ${eh}:${em} Uhr`;
  } catch {
    return '';
  }
}

export function TermineView({ nowIso }: TermineViewProps) {
  const t = useTranslations();
  const tAction = useTranslations('termine.action');
  const [termine, setTermine] = React.useState<Termin[]>([]);
  const [reminders, setReminders] = React.useState<Reminder[]>([]);
  const [behoerdenById, setBehoerdenById] = React.useState<Record<string, Behoerde>>({});
  const [busy, setBusy] = React.useState<string | null>(null);

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

  const handleVerschieben = React.useCallback(
    async (termin: Termin) => {
      setBusy(termin.id);
      // Demo: shift the appointment by 7 days.
      const next = new Date(new Date(termin.datum).getTime() + 7 * 86400000).toISOString();
      applyTermin({ ...termin, datum: next, status: 'verschoben' });
      try {
        await api.verschiebeTermin(termin.id, next);
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
      if (typeof window !== 'undefined' && !window.confirm(tAction('confirm_cancel'))) {
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
  const [filters, setFilters] = React.useState<Record<FilterKey, boolean>>({
    behoerden: true,
    erinnerungen: true,
    buchungen: true,
    abgeschlossen: false,
  });
  const [loaded, setLoaded] = React.useState(false);
  const [detailTermin, setDetailTermin] = React.useState<Termin | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    void (async () => {
      for (let attempt = 0; attempt < 3 && !cancelled; attempt++) {
        try {
          const [terms, rems, behoerden] = await Promise.all([
            api.getTermine(),
            api.getReminders(),
            api.getBehoerden(),
          ]);
          if (cancelled) return;
          setTermine(terms);
          setReminders(rems);
          setBehoerdenById(Object.fromEntries(behoerden.map((b) => [b.id, b])));
          setLoaded(true);
          return;
        } catch {
          await new Promise((r) => setTimeout(r, 200));
        }
      }
      if (!cancelled) setLoaded(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  /* C1/§1.2: react live when the autopilot mints/updates a Termin. */
  React.useEffect(() => {
    const unsubscribe = api.subscribe((event) => {
      if (event.type === 'termin_created') {
        setTermine((prev) =>
          prev.some((x) => x.id === event.termin.id) ? prev : [...prev, event.termin],
        );
      }
      if (event.type === 'termin_updated') {
        setTermine((prev) =>
          prev.map((x) => (x.id === event.termin.id ? event.termin : x)),
        );
      }
    });
    return () => unsubscribe();
  }, []);

  const behoerdeName = React.useCallback(
    (id?: string) => {
      if (!id) return '';
      return behoerdenById[id]?.name_de ?? id;
    },
    [behoerdenById],
  );

  /* WCAG 2.4.3: Detail-Dialog merkt sich den Trigger und stellt den Fokus zurück. */
  const detailTriggerRef = React.useRef<HTMLElement | null>(null);
  const detailCloseRef = React.useRef<HTMLButtonElement | null>(null);
  React.useEffect(() => {
    if (detailTermin) {
      const active = typeof document !== 'undefined' ? document.activeElement : null;
      if (active instanceof HTMLElement) detailTriggerRef.current = active;
      requestAnimationFrame(() => detailCloseRef.current?.focus());
      return;
    }
    const trigger = detailTriggerRef.current;
    if (trigger && typeof document !== 'undefined' && document.contains(trigger)) {
      requestAnimationFrame(() => trigger.focus());
    }
    detailTriggerRef.current = null;
  }, [detailTermin]);

  const now = React.useMemo(() => new Date(nowIso), [nowIso]);

  /* Calendar navigation: which month the grid currently shows (default = now). */
  const [viewedMonth, setViewedMonth] = React.useState(
    () => ({ year: new Date(nowIso).getFullYear(), month: new Date(nowIso).getMonth() }),
  );
  const monthLabel = `${MONTH_LABELS[viewedMonth.month]} ${viewedMonth.year}`;

  const stepMonth = React.useCallback((delta: number) => {
    setViewedMonth((prev) => {
      const d = new Date(prev.year, prev.month + delta, 1);
      return { year: d.getFullYear(), month: d.getMonth() };
    });
  }, []);

  /**
   * Filter-Gate für einen Termin. Behördentermine (`behoerdentermin`) und
   * Buchungen (`buchung`) werden über die Kategorie unterschieden; fehlt sie,
   * leiten wir aus `ort.typ` ab (Präsenz ⇒ Behördentermin, sonst Buchung).
   * "Abgeschlossen" steuert, ob abgesagte/erledigte Termine sichtbar sind.
   */
  const isTerminVisible = React.useCallback(
    (termin: Termin): boolean => {
      const istBuchung = (termin.kategorie ?? (termin.ort.typ === 'praesenz' ? 'behoerdentermin' : 'buchung')) === 'buchung';
      if (istBuchung) {
        if (!filters.buchungen) return false;
      } else if (!filters.behoerden) {
        return false;
      }
      const istAbgeschlossen = termin.status === 'abgesagt';
      if (istAbgeschlossen && !filters.abgeschlossen) return false;
      return true;
    },
    [filters],
  );

  /* Build calendar grid: Mon–Sun rows. */
  const calendarCells = React.useMemo(() => {
    const year = viewedMonth.year;
    const month = viewedMonth.month;
    const firstOfMonth = new Date(year, month, 1);
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    // Monday-first weekday index of day 1 (0 = Mon).
    const dow = (firstOfMonth.getDay() + 6) % 7;
    const cells: Array<{ key: string; label: number; date: Date; mute: boolean; today: boolean; hasEvent: boolean }> = [];

    // Trailing days of previous month.
    const prevMonthDays = new Date(year, month, 0).getDate();
    for (let i = dow - 1; i >= 0; i--) {
      const d = new Date(year, month - 1, prevMonthDays - i);
      cells.push({ key: `p-${d.getTime()}`, label: d.getDate(), date: d, mute: true, today: false, hasEvent: false });
    }
    // Current month.
    const todayKey = `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}`;
    const eventKeys = new Set<string>();
    const calendarTermine = termine.filter(isTerminVisible);
    const calendarReminders = filters.erinnerungen ? reminders : [];
    [...calendarTermine, ...calendarReminders].forEach((x) => {
      const d = new Date(x.datum);
      eventKeys.add(`${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`);
    });
    for (let day = 1; day <= daysInMonth; day++) {
      const d = new Date(year, month, day);
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      cells.push({
        key: `c-${d.getTime()}`,
        label: day,
        date: d,
        mute: false,
        today: key === todayKey,
        hasEvent: eventKeys.has(key),
      });
    }
    // Leading days of next month to round to 6 weeks (42 cells max).
    while (cells.length % 7 !== 0) {
      const last = cells[cells.length - 1].date;
      const d = new Date(last.getFullYear(), last.getMonth(), last.getDate() + 1);
      cells.push({ key: `n-${d.getTime()}`, label: d.getDate(), date: d, mute: true, today: false, hasEvent: false });
    }
    return cells;
  }, [viewedMonth, now, termine, reminders, filters.erinnerungen, isTerminVisible]);

  const futureTermine = React.useMemo(
    () =>
      [...termine]
        .filter(isTerminVisible)
        .filter((t) => new Date(t.datum).getTime() >= now.getTime() - 24 * 3600 * 1000)
        .sort((a, b) => a.datum.localeCompare(b.datum)),
    [termine, now, isTerminVisible],
  );

  const naechster = futureTermine[0] ?? null;
  const weitere = futureTermine.slice(1);

  const futureFristen = React.useMemo(
    () =>
      (filters.erinnerungen ? reminders : [])
        .filter((r) => new Date(r.datum).getTime() >= now.getTime() - 24 * 3600 * 1000)
        .sort((a, b) => a.datum.localeCompare(b.datum)),
    [reminders, now, filters.erinnerungen],
  );

  function toggleFilter(key: FilterKey) {
    setFilters((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  function termineIconTone(t: Termin): { tone: string; Icon: React.ComponentType<{ className?: string }> } {
    const lower = (behoerdeName(t.behoerde_id) || t.betreff || '').toLowerCase();
    if (lower.includes('kinderarzt') || lower.includes('arzt')) return { tone: 'violet', Icon: Stethoscope };
    if (lower.includes('finanz') || lower.includes('steuer')) return { tone: 'green', Icon: ReceiptText };
    if (lower.includes('beitragsservice') || lower.includes('rundfunk')) return { tone: 'green', Icon: Euro };
    return { tone: '', Icon: Landmark };
  }

  /* Mock-ICS-Export: VCALENDAR aus den aktuell sichtbaren Terminen, Client-Blob. */
  function handleIcsExport() {
    if (futureTermine.length === 0) return;
    const pad = (n: number) => n.toString().padStart(2, '0');
    const toIcsStamp = (d: Date) =>
      `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`;
    const escapeIcs = (s: string) => s.replace(/[\\;,]/g, (m) => `\\${m}`).replace(/\n/g, '\\n');

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
        termin.buchungsreferenz ? `DESCRIPTION:${escapeIcs(`Buchungsreferenz: ${termin.buchungsreferenz}`)}` : 'DESCRIPTION:',
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

  function scrollToId(id: string) {
    if (typeof document === 'undefined') return;
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  return (
    <div className="gt-content">
      <div className="gt-page-head">
        <h1>Termine</h1>
        <div className="sub">Behördentermine, Erinnerungen und Buchungen an einem Ort.</div>
      </div>

      <div className="tm-layout">
        {/* Left: calendar + filter */}
        <div>
          <div className="tm-card">
            <div className="cal-head">
              <div className="m">{monthLabel}</div>
              <div className="nav">
                <button type="button" aria-label="Vorheriger Monat" onClick={() => stepMonth(-1)}>
                  <ChevronLeft />
                </button>
                <button type="button" aria-label="Nächster Monat" onClick={() => stepMonth(1)}>
                  <ChevronRight />
                </button>
              </div>
            </div>
            <div className="cal">
              <div className="h">Mo</div>
              <div className="h">Di</div>
              <div className="h">Mi</div>
              <div className="h">Do</div>
              <div className="h">Fr</div>
              <div className="h">Sa</div>
              <div className="h">So</div>
              {calendarCells.map((c) => {
                const classes = ['d'];
                if (c.mute) classes.push('mute');
                if (c.today) classes.push('today');
                if (c.hasEvent && !c.today) classes.push('has-event');
                return (
                  <div key={c.key} className={classes.join(' ')}>
                    {c.today ? <span>{c.label}</span> : c.label}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="tm-card filter-card">
            <h4>Filter</h4>
            <button
              type="button"
              className="filter-row"
              aria-pressed={filters.behoerden}
              onClick={() => toggleFilter('behoerden')}
              style={{ background: 'none', border: 0, padding: '6px 0', width: '100%', textAlign: 'left' }}
            >
              <span className={`cb${filters.behoerden ? ' on' : ''}`}>
                {filters.behoerden ? <CheckCircle2 /> : null}
              </span>
              <span className="dot" style={{ background: 'var(--brand-500)' }} />
              Behördentermine
            </button>
            <button
              type="button"
              className="filter-row"
              aria-pressed={filters.erinnerungen}
              onClick={() => toggleFilter('erinnerungen')}
              style={{ background: 'none', border: 0, padding: '6px 0', width: '100%', textAlign: 'left' }}
            >
              <span className={`cb${filters.erinnerungen ? ' on' : ''}`}>
                {filters.erinnerungen ? <CheckCircle2 /> : null}
              </span>
              <span className="dot" style={{ background: 'var(--green-500)' }} />
              Erinnerungen / Fristen
            </button>
            <button
              type="button"
              className="filter-row"
              aria-pressed={filters.buchungen}
              onClick={() => toggleFilter('buchungen')}
              style={{ background: 'none', border: 0, padding: '6px 0', width: '100%', textAlign: 'left' }}
            >
              <span className={`cb${filters.buchungen ? ' on' : ''}`}>
                {filters.buchungen ? <CheckCircle2 /> : null}
              </span>
              <span className="dot" style={{ background: 'var(--violet-500)' }} />
              Buchungen
            </button>
            <button
              type="button"
              className="filter-row"
              aria-pressed={filters.abgeschlossen}
              onClick={() => toggleFilter('abgeschlossen')}
              style={{ background: 'none', border: 0, padding: '6px 0', width: '100%', textAlign: 'left' }}
            >
              <span className={`cb${filters.abgeschlossen ? ' on' : ''}`}>
                {filters.abgeschlossen ? <CheckCircle2 /> : null}
              </span>
              <span className="dot" style={{ background: 'var(--border-strong)', border: '1px solid var(--ink-4)' }} />
              Abgeschlossen
            </button>
          </div>
        </div>

        {/* Middle: next termin + further list */}
        <div>
          <div className="text-md fw-600" style={{ marginBottom: 12 }}>
            Nächste Termine
          </div>
          {naechster ? (
            <div className="tm-next">
              <div className="row1">
                <span className="icon-circle">
                  <Calendar />
                </span>
                <div className="grow">
                  <div className="t">
                    {behoerdeName(naechster.behoerde_id)} — {naechster.betreff}
                  </div>
                  <div className="meta">
                    <span>
                      <Calendar style={{ width: 14, height: 14 }} />
                      {formatDate(naechster.datum)} &nbsp;
                      <Clock style={{ width: 14, height: 14 }} />
                      {formatTimeRange(naechster.datum)}
                    </span>
                    <span>
                      <MapPin style={{ width: 14, height: 14 }} />
                      {naechster.ort.details}
                    </span>
                    {naechster.buchungsreferenz ? (
                      <span>Buchungsreferenz: {naechster.buchungsreferenz}</span>
                    ) : null}
                  </div>
                </div>
                <span
                  className={`badge ${naechster.status === 'abgesagt' ? 'red' : naechster.status === 'verschoben' ? 'amber' : 'green'}`}
                >
                  {naechster.status === 'bestaetigt'
                    ? tAction('bestaetigt')
                    : naechster.status === 'abgesagt'
                      ? tAction('abgesagt')
                      : naechster.status === 'verschoben'
                        ? tAction('verschoben_um')
                        : 'Gebucht'}
                </span>
              </div>
              <div className="appt-actions">
                {naechster.status !== 'bestaetigt' && naechster.status !== 'abgesagt' ? (
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    disabled={busy === naechster.id}
                    onClick={() => handleBestaetigen(naechster)}
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
                    onClick={() => handleVerschieben(naechster)}
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
                    onClick={() => handleAbsagen(naechster)}
                  >
                    {tAction('absagen')}
                  </button>
                ) : null}
              </div>
            </div>
          ) : !loaded ? (
            <div className="tm-next" aria-busy="true" style={{ minHeight: 120 }} />
          ) : (
            <div className="tm-card">Keine bevorstehenden Termine.</div>
          )}

          <div
            id="termine-liste"
            className="text-md fw-600"
            style={{ margin: '22px 0 12px', scrollMarginTop: 24 }}
          >
            Weitere Termine und Erinnerungen
          </div>

          {weitere.map((t) => {
            const { tone, Icon } = termineIconTone(t);
            return (
              <div key={t.id} className="tm-list-item">
                <span className={`icon-circle${tone ? ` ${tone}` : ''}`}>
                  <Icon />
                </span>
                <div>
                  <div className="t">
                    {behoerdeName(t.behoerde_id)} — {t.betreff}
                  </div>
                  <div className="meta">
                    <span>
                      <Calendar style={{ width: 14, height: 14 }} />
                      {formatDate(t.datum)}
                    </span>{' '}
                    <span>
                      <Clock style={{ width: 14, height: 14 }} />
                      {formatTimeRange(t.datum)}
                    </span>
                  </div>
                  <div className="meta">
                    <span>
                      <MapPin style={{ width: 14, height: 14 }} />
                      {t.ort.details}
                    </span>
                  </div>
                </div>
                <span className={`badge ${tone === 'violet' ? 'violet' : 'brand'}`}>Gebucht</span>
                <ChevronRight style={{ color: 'var(--ink-4)' }} />
              </div>
            );
          })}

          {futureFristen.slice(0, 2).map((r) => {
            const lower = (r.titel || '').toLowerCase();
            const Icon = lower.includes('steuer') ? ReceiptText : lower.includes('rundfunk') || lower.includes('beitrag') ? Euro : Bell;
            return (
              <div key={r.id} className="tm-list-item">
                <span className="icon-circle green">
                  <Icon />
                </span>
                <div>
                  <div className="t">{r.titel}</div>
                  <div className="meta">
                    <span>
                      <Calendar style={{ width: 14, height: 14 }} />
                      {r.kategorie === 'frist' ? 'Frist: ' : 'Fällig: '}
                      {formatDate(r.datum)}
                    </span>
                  </div>
                  <div className="meta">{behoerdeName(r.behoerde_id)}</div>
                </div>
                <span className="badge green">Erinnerung</span>
                <ChevronRight style={{ color: 'var(--ink-4)' }} />
              </div>
            );
          })}

          <button
            type="button"
            className="btn btn-secondary"
            style={{ marginTop: 14 }}
            onClick={() => scrollToId('termine-liste')}
          >
            <Calendar />
            Alle Termine anzeigen
          </button>
        </div>

        {/* Right: detail + prep + fristen */}
        <div>
          <div className="text-md fw-600" style={{ marginBottom: 12 }}>
            Nächster Schritt
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
                    : 'Kein offener Termin'}
                </div>
              </div>
              <span className="badge green">
                {naechster?.status === 'bestaetigt' ? 'Bestätigt' : 'Gebucht'}
              </span>
            </div>

            <div className="ns-info">
              <div className="row">
                <Calendar />
                {naechster ? formatDate(naechster.datum) : '—'}
              </div>
              <div className="row">
                <Clock />
                {naechster ? `${formatTimeRange(naechster.datum)} (45 Min.)` : '—'}
              </div>
              <div className="row">
                <MapPin />
                <div>
                  <span className="link">{behoerdeName(naechster?.behoerde_id)}</span>
                  <br />
                  {naechster?.ort.details ?? ''}
                </div>
              </div>
              {naechster?.buchungsreferenz ? (
                <div className="row" style={{ marginTop: 6 }}>
                  <Bookmark style={{ opacity: 0 }} />
                  <div>
                    Buchungsreferenz
                    <br />
                    <span className="mono">{naechster.buchungsreferenz}</span>
                  </div>
                </div>
              ) : null}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <button
                type="button"
                className="btn btn-secondary"
                disabled={futureTermine.length === 0}
                aria-disabled={futureTermine.length === 0}
                onClick={handleIcsExport}
              >
                <CalendarPlus />
                ICS exportieren
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                disabled={!naechster}
                aria-disabled={!naechster}
                onClick={() => naechster && setDetailTermin(naechster)}
              >
                Details anzeigen <ChevronRight />
              </button>
            </div>

            <div className="prep-card">
              <h4>{t('termine.vorbereitung.title')}</h4>
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
              <div className="prep-row">
                <Clock className="icon" />
                <div>
                  <div className="t">Planen Sie genug Zeit ein</div>
                  <div className="s">Bitte erscheinen Sie 10–15 Minuten vor Ihrem Termin.</div>
                </div>
              </div>
              <div className="prep-row">
                <Info className="icon" />
                <div>
                  <div className="t">Nicht wahrnehmen?</div>
                  <div className="s">
                    Sie können Ihren Termin bis 48 Stunden vorher online stornieren oder verschieben.
                  </div>
                </div>
              </div>
            </div>

            <div
              id="fristen"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginTop: 16,
                padding: 14,
                background: 'var(--green-50)',
                borderRadius: 'var(--r-md)',
                scrollMarginTop: 24,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <CheckCircle2 style={{ color: 'var(--green-600)', width: 18, height: 18 }} />
                <div>
                  <div className="fw-600">Fristen im Überblick</div>
                  <div className="text-xs muted">{futureFristen.length} offene Fristen</div>
                </div>
              </div>
              <Link
                href="#fristen"
                style={{ color: 'var(--brand-600)', fontWeight: 500, fontSize: 13 }}
              >
                Fristen anzeigen <ChevronRight style={{ width: 12, height: 12 }} />
              </Link>
            </div>
          </div>
        </div>
      </div>

      {detailTermin ? (
        <div
          role="presentation"
          onClick={() => setDetailTermin(null)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 50,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
            background: 'rgba(0,0,0,0.4)',
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="termin-detail-title"
            onClick={(event) => event.stopPropagation()}
            onKeyDown={(event) => {
              if (event.key === 'Escape') {
                event.preventDefault();
                setDetailTermin(null);
              }
            }}
            style={{
              width: 'min(520px, 100%)',
              maxHeight: '85vh',
              overflowY: 'auto',
              background: 'var(--surface-1, #fff)',
              borderRadius: 'var(--r-lg, 12px)',
              border: '1px solid var(--border)',
              boxShadow: '0 12px 40px rgba(0,0,0,0.18)',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                gap: 16,
                padding: 20,
                borderBottom: '1px solid var(--border)',
              }}
            >
              <h2 id="termin-detail-title" className="text-md fw-600" style={{ margin: 0 }}>
                {behoerdeName(detailTermin.behoerde_id)} — {detailTermin.betreff}
              </h2>
              <button
                ref={detailCloseRef}
                type="button"
                className="btn btn-secondary btn-sm"
                aria-label="Schließen"
                onClick={() => setDetailTermin(null)}
                style={{ flexShrink: 0 }}
              >
                <X />
              </button>
            </div>
            <div className="ns-info" style={{ padding: 20 }}>
              <div className="row">
                <Calendar />
                {formatDate(detailTermin.datum)}
              </div>
              <div className="row">
                <Clock />
                {`${formatTimeRange(detailTermin.datum)} (45 Min.)`}
              </div>
              <div className="row">
                <MapPin />
                <div>
                  <span className="link">{behoerdeName(detailTermin.behoerde_id)}</span>
                  <br />
                  {detailTermin.ort.details}
                </div>
              </div>
              {detailTermin.buchungsreferenz ? (
                <div className="row" style={{ marginTop: 6 }}>
                  <Bookmark style={{ opacity: 0 }} />
                  <div>
                    Buchungsreferenz
                    <br />
                    <span className="mono">{detailTermin.buchungsreferenz}</span>
                  </div>
                </div>
              ) : null}
              <div className="row" style={{ marginTop: 6 }}>
                <Info />
                <div>
                  Status: {detailTermin.status === 'bestaetigt'
                    ? 'Bestätigt'
                    : detailTermin.status === 'abgesagt'
                      ? 'Abgesagt'
                      : detailTermin.status === 'verschoben'
                        ? 'Verschoben'
                        : 'Gebucht'}
                </div>
              </div>
            </div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: 10,
                padding: 16,
                borderTop: '1px solid var(--border)',
              }}
            >
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => setDetailTermin(null)}
              >
                Schließen
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
