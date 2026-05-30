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

  const now = React.useMemo(() => new Date(nowIso), [nowIso]);
  const monthLabel = `${MONTH_LABELS[now.getMonth()]} ${now.getFullYear()}`;

  /* Build calendar grid: Mon–Sun rows. */
  const calendarCells = React.useMemo(() => {
    const year = now.getFullYear();
    const month = now.getMonth();
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
    [...termine, ...reminders].forEach((x) => {
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
  }, [now, termine, reminders]);

  const futureTermine = React.useMemo(
    () =>
      [...termine]
        .filter((t) => t.status !== 'abgesagt' && new Date(t.datum).getTime() >= now.getTime() - 24 * 3600 * 1000)
        .sort((a, b) => a.datum.localeCompare(b.datum)),
    [termine, now],
  );

  const naechster = futureTermine[0] ?? null;
  const weitere = futureTermine.slice(1);

  const futureFristen = React.useMemo(
    () =>
      reminders
        .filter((r) => new Date(r.datum).getTime() >= now.getTime() - 24 * 3600 * 1000)
        .sort((a, b) => a.datum.localeCompare(b.datum)),
    [reminders, now],
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
                <button type="button" aria-label="Vorheriger Monat">
                  <ChevronLeft />
                </button>
                <button type="button" aria-label="Nächster Monat">
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

          <div className="text-md fw-600" style={{ margin: '22px 0 12px' }}>
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

          <button type="button" className="btn btn-secondary" style={{ marginTop: 14 }}>
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
              <button type="button" className="btn btn-secondary">
                <CalendarPlus />
                ICS exportieren
              </button>
              <button type="button" className="btn btn-secondary">
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
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginTop: 16,
                padding: 14,
                background: 'var(--green-50)',
                borderRadius: 'var(--r-md)',
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
    </div>
  );
}
