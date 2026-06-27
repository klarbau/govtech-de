'use client';

import * as React from 'react';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import {
  differenceInCalendarDays,
  format,
  parseISO,
  type Locale,
} from 'date-fns';
import { toast } from 'sonner';
import {
  Bell,
  Calendar,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Circle,
  Clock,
  Euro,
  FileText,
  Filter,
  Info,
  Landmark,
  MapPin,
  ReceiptText,
  RefreshCw,
  Search,
  Stethoscope,
  Users,
  X,
} from 'lucide-react';

import { api } from '@/lib/mock-backend';
import { dateFnsLocale } from '@/lib/utils';
import type { Behoerde, Reminder, Termin } from '@/types';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/shared/EmptyState';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/shared/Skeleton';

import { MonthCalendar, type DayEventBreakdown } from './MonthCalendar';
import { TerminRescheduleDialog } from './TerminRescheduleDialog';
import { TerminAbsagenDialog } from './TerminAbsagenDialog';
import { dayKey, formatDateLong, formatTimeRange } from './termin-format';
import { displayStatus, istBuergeramtVorgemerkt } from './termin-status';

/* termine-green-relayout.md: green command-center relayout of /termine. The data
   layer (load/retry/subscribe, optimistic revert-on-error mutations, ICS export,
   §17 „Vorgemerkt" semantics) is PRESERVED — only the derivations + JSX/CSS are
   rebuilt around the 3-column command center. All operations stay honest: the §17
   confirm shows only the „Gelesen: nichts aus Ihrem Kalender."-Quittung, never a
   Posteingang claim; the ABH/LEA termin is never the §17 hero. */

interface TermineViewProps {
  nowIso: string;
}

const TWENTY_FOUR_HOURS_MS = 24 * 3600 * 1000;
const THIRTY_DAYS_MS = 30 * 24 * 3600 * 1000;

type TabId = 'alle' | 'termine' | 'fristen' | 'erinnerungen' | 'vergangen';

/** View-level badge state: the Bürgeramt-vs-not split happens HERE so the shared
 *  displayStatus() (and the spine) keep their 4-state union untouched. */
type ViewBadge =
  | 'bestaetigt'
  | 'vorgemerkt'
  | 'wartet'
  | 'abgesagt'
  | 'erledigt';

function viewBadge(term: Termin, nowIso: string): ViewBadge {
  const ds = displayStatus(term, nowIso);
  if (ds === 'vorgemerkt') {
    return istBuergeramtVorgemerkt(term, nowIso) ? 'vorgemerkt' : 'wartet';
  }
  return ds;
}

function viewBadgeTone(badge: ViewBadge): string {
  switch (badge) {
    case 'bestaetigt':
      return 'green';
    case 'vorgemerkt':
      return 'amber';
    case 'wartet':
      return 'violet';
    case 'abgesagt':
      return 'red';
    case 'erledigt':
      return 'outline';
  }
}

function viewBadgeLabelKey(badge: ViewBadge): string {
  switch (badge) {
    case 'vorgemerkt':
      return 'vorgeschlagen'; // Enum-Key bleibt; Label = „Vorgemerkt"
    case 'wartet':
      return 'wartet';
    case 'bestaetigt':
      return 'bestaetigt';
    case 'abgesagt':
      return 'abgesagt';
    case 'erledigt':
      return 'erledigt';
  }
}

export function TermineView({ nowIso }: TermineViewProps) {
  const t = useTranslations();
  const tTermine = useTranslations('termine');
  const tStatus = useTranslations('termine.status');
  const dateLocale = dateFnsLocale(useLocale());

  const now = React.useMemo(() => parseISO(nowIso), [nowIso]);
  const todayIso = React.useMemo(() => format(now, 'yyyy-MM-dd'), [now]);

  const [termine, setTermine] = React.useState<Termin[]>([]);
  const [reminders, setReminders] = React.useState<Reminder[]>([]);
  const [behoerdenById, setBehoerdenById] = React.useState<
    Record<string, Behoerde>
  >({});
  const [activePersonaId, setActivePersonaId] = React.useState<string | null>(
    null,
  );
  const [busy, setBusy] = React.useState<string | null>(null);
  const [phase, setPhase] = React.useState<'loading' | 'ready' | 'error'>(
    'loading',
  );

  const [activeTab, setActiveTab] = React.useState<TabId>('alle');
  const [query, setQuery] = React.useState('');
  const [selectedIso, setSelectedIso] = React.useState<string | null>(null);
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  // The §17 confirm flips the badge green; keep that termin selected as a receipt.
  const [recentlyConfirmedId, setRecentlyConfirmedId] = React.useState<
    string | null
  >(null);
  // Auto-selection is applied exactly once after the first successful load.
  const autoSelectedRef = React.useRef(false);

  const [rescheduleTermin, setRescheduleTermin] = React.useState<Termin | null>(
    null,
  );
  const [absagenTermin, setAbsagenTermin] = React.useState<Termin | null>(null);
  // Element that opened the „Absagen"-AlertDialog — for focus-return on close
  // (WCAG 2.4.3). Remembered on click, handed to `finalFocusRef`.
  const absagenOpenerRef = React.useRef<HTMLElement | null>(null);

  const load = React.useCallback(async () => {
    setPhase('loading');
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const [terms, rems, behoerden, profile] = await Promise.all([
          api.getTermine(),
          api.getReminders(),
          api.getBehoerden(),
          api.getProfile(),
        ]);
        setTermine(terms);
        setReminders(rems);
        setBehoerdenById(Object.fromEntries(behoerden.map((b) => [b.id, b])));
        setActivePersonaId(profile.id);
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

  /* React live when the autopilot mints/updates a Termin. The SSE connection is
     deferred past the first settle so the page can reach an idle network for
     SSR/axe (autopilot events arrive far later in the demo). */
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

  // --------------------------------------------------------------------------
  // Persona scoping. getTermine() returns ALL personas' termine; scope to the
  // active persona by `owner_persona_id` (reminders are already persona-scoped
  // server-side). Termine without the field stay visible defensively.
  // --------------------------------------------------------------------------
  const ownTermine = React.useMemo(
    () =>
      termine.filter(
        (term) =>
          !term.owner_persona_id ||
          !activePersonaId ||
          term.owner_persona_id === activePersonaId,
      ),
    [termine, activePersonaId],
  );

  // --------------------------------------------------------------------------
  // Operations — optimistic, revert-on-error, visible toast (no empty catch).
  // --------------------------------------------------------------------------

  const handleBestaetigen = React.useCallback(
    async (termin: Termin) => {
      const prev = termin;
      setBusy(termin.id);
      setRecentlyConfirmedId(termin.id);
      setSelectedId(termin.id);
      applyTermin({ ...termin, status: 'bestaetigt' });
      try {
        await api.bestaetigeTerminVorschlag(termin.id);
      } catch {
        applyTermin(prev);
        toast.error(tTermine('bestaetigen.toast_error'));
      } finally {
        setBusy(null);
      }
    },
    [applyTermin, tTermine],
  );

  const handleReschedule = React.useCallback(
    async (termin: Termin, neuesDatumIso: string) => {
      const prevDatum = termin.datum;
      setBusy(termin.id);
      applyTermin({ ...termin, datum: neuesDatumIso });
      setRescheduleTermin(null);
      try {
        await api.verschiebeTermin(termin.id, neuesDatumIso);
        toast.success(
          tTermine('reschedule.toast_template', {
            datum: formatDateLong(neuesDatumIso, dateLocale),
          }),
        );
      } catch {
        applyTermin({ ...termin, datum: prevDatum });
        toast.error(tTermine('reschedule.toast_error'));
      } finally {
        setBusy(null);
      }
    },
    [applyTermin, dateLocale, tTermine],
  );

  const handleWaitlist = React.useCallback(() => {
    setRescheduleTermin(null);
    toast(tTermine('reschedule.warteliste_toast'));
  }, [tTermine]);

  const handleAbsagenConfirm = React.useCallback(
    async (termin: Termin) => {
      const prevStatus = termin.status;
      setAbsagenTermin(null);
      setBusy(termin.id);
      applyTermin({ ...termin, status: 'abgesagt' });
      try {
        await api.sageTerminAb(termin.id);
        // Honest „Rückgängig": 6 s window. The undo restores the prior status
        // client-side via the same mutate path; the 5% error on undo is surfaced.
        toast(tTermine('absagen.toast'), {
          duration: 6000,
          action: {
            label: tTermine('absagen.toast_undo'),
            onClick: () => {
              void (async () => {
                applyTermin({ ...termin, status: prevStatus });
                try {
                  // The only backend op that re-activates an appointment is
                  // bestaetigeTerminVorschlag → 'bestaetigt'. A previously
                  // 'vorgeschlagen' termin is restored client-side only (no op
                  // writes 'vorgeschlagen' back — keeps this honest rather than
                  // firing a misleading no-op).
                  if (prevStatus !== 'vorgeschlagen') {
                    await api.bestaetigeTerminVorschlag(termin.id);
                  }
                  toast.success(tTermine('absagen.undo_done'));
                } catch {
                  applyTermin({ ...termin, status: 'abgesagt' });
                  toast.error(tTermine('absagen.toast_error'));
                }
              })();
            },
          },
        });
      } catch {
        applyTermin({ ...termin, status: prevStatus });
        toast.error(tTermine('absagen.toast_error'));
      } finally {
        setBusy(null);
      }
    },
    [applyTermin, tTermine],
  );

  // --------------------------------------------------------------------------
  // Derived data.
  // --------------------------------------------------------------------------

  const isUpcoming = React.useCallback(
    (iso: string) =>
      new Date(iso).getTime() >= now.getTime() - TWENTY_FOUR_HOURS_MS,
    [now],
  );

  const matchesSelectedDay = React.useCallback(
    (iso: string) => !selectedIso || dayKey(iso) === selectedIso,
    [selectedIso],
  );

  const matchesQuery = React.useCallback(
    (haystack: string) => {
      const needle = query.trim().toLowerCase();
      return needle.length === 0 || haystack.toLowerCase().includes(needle);
    },
    [query],
  );

  /** Upcoming, persona-scoped, active termine (not cancelled, not past). */
  const upcomingTermine = React.useMemo(
    () =>
      ownTermine
        .filter((term) => {
          const ds = displayStatus(term, nowIso);
          return ds !== 'abgesagt' && ds !== 'erledigt' && isUpcoming(term.datum);
        })
        .sort((a, b) => a.datum.localeCompare(b.datum)),
    [ownTermine, nowIso, isUpcoming],
  );

  /** Past / cancelled termine for the „Vergangen" tab. */
  const pastTermine = React.useMemo(
    () =>
      ownTermine
        .filter((term) => {
          const ds = displayStatus(term, nowIso);
          return ds === 'abgesagt' || ds === 'erledigt';
        })
        .sort((a, b) => b.datum.localeCompare(a.datum)),
    [ownTermine, nowIso],
  );

  const upcomingReminders = React.useMemo(
    () =>
      reminders
        .filter((r) => !r.erledigt && isUpcoming(r.datum))
        .sort((a, b) => a.datum.localeCompare(b.datum)),
    [reminders, isUpcoming],
  );

  const pastReminders = React.useMemo(
    () =>
      reminders
        .filter((r) => r.erledigt || !isUpcoming(r.datum))
        .sort((a, b) => b.datum.localeCompare(a.datum)),
    [reminders, isUpcoming],
  );

  /* Auto-select once after first load: a Bürgeramt §17 `vorgemerkt` termin wins
     (its confirm CTA + §17 reasoning = the wow); else the nächster Termin. */
  React.useEffect(() => {
    if (phase !== 'ready' || autoSelectedRef.current) return;
    if (upcomingTermine.length === 0) return;
    autoSelectedRef.current = true;
    const hero = upcomingTermine.find((term) =>
      istBuergeramtVorgemerkt(term, nowIso),
    );
    setSelectedId(hero?.id ?? upcomingTermine[0]?.id ?? null);
  }, [phase, upcomingTermine, nowIso]);

  /** Tab + day + search filtered appointment rows for the center list. */
  const visibleTermine = React.useMemo(() => {
    const base = activeTab === 'vergangen' ? pastTermine : upcomingTermine;
    return base
      .filter((term) => matchesSelectedDay(term.datum))
      .filter((term) =>
        matchesQuery(`${behoerdeName(term.behoerde_id)} ${term.betreff}`),
      );
  }, [
    activeTab,
    pastTermine,
    upcomingTermine,
    matchesSelectedDay,
    matchesQuery,
    behoerdeName,
  ]);

  /** Tab + day + search filtered Frist/Erinnerung rows for the center list. */
  const visibleReminders = React.useMemo(() => {
    const base = activeTab === 'vergangen' ? pastReminders : upcomingReminders;
    return base
      .filter((r) => {
        if (activeTab === 'fristen') return r.kategorie === 'frist';
        if (activeTab === 'erinnerungen') return r.kategorie === 'erinnerung';
        return true;
      })
      .filter((r) => matchesSelectedDay(r.datum))
      .filter((r) => matchesQuery(`${r.titel} ${behoerdeName(r.behoerde_id)}`));
  }, [
    activeTab,
    pastReminders,
    upcomingReminders,
    matchesSelectedDay,
    matchesQuery,
    behoerdeName,
  ]);

  const showTermineSection = activeTab === 'alle' || activeTab === 'termine' || activeTab === 'vergangen';
  const showFristenSection = activeTab === 'alle' || activeTab === 'fristen' || activeTab === 'erinnerungen' || activeTab === 'vergangen';

  const fristenHeading =
    activeTab === 'erinnerungen'
      ? tTermine('liste.erinnerungen_titel')
      : tTermine('spur.fristen_titel');

  const visibleCount =
    (showTermineSection ? visibleTermine.length : 0) +
    (showFristenSection ? visibleReminders.length : 0);

  const detailTermin = React.useMemo(
    () => ownTermine.find((term) => term.id === selectedId) ?? null,
    [ownTermine, selectedId],
  );

  /** Calendar dots — per-day category breakdown across termine + reminders. */
  const calendarEvents = React.useMemo(() => {
    const events: Record<string, DayEventBreakdown> = {};
    const bump = (
      iso: string,
      cat: keyof DayEventBreakdown,
    ) => {
      const key = dayKey(iso);
      const cur = events[key] ?? {
        termine: 0,
        fristen: 0,
        erinnerungen: 0,
      };
      cur[cat] += 1;
      events[key] = cur;
    };
    for (const term of ownTermine) {
      if (displayStatus(term, nowIso) === 'abgesagt') continue;
      bump(term.datum, 'termine');
    }
    for (const r of reminders) {
      if (r.erledigt) continue;
      bump(r.datum, r.kategorie === 'frist' ? 'fristen' : 'erinnerungen');
    }
    return events;
  }, [ownTermine, reminders, nowIso]);

  // --------------------------------------------------------------------------
  // KPI predicates (persona-filtered, honest — numbers come from the real seed).
  // --------------------------------------------------------------------------
  const kpis = React.useMemo(() => {
    const naechster = upcomingTermine.find((term) => {
      const b = viewBadge(term, nowIso);
      return b === 'bestaetigt' || b === 'vorgemerkt' || b === 'wartet';
    });
    const offeneFristen = upcomingReminders.length;
    const bestaetigte = upcomingTermine.filter(
      (term) =>
        viewBadge(term, nowIso) === 'bestaetigt' &&
        new Date(term.datum).getTime() <= now.getTime() + THIRTY_DAYS_MS,
    ).length;
    const warten = upcomingTermine.filter((term) => {
      const b = viewBadge(term, nowIso);
      return b === 'vorgemerkt' || b === 'wartet';
    }).length;
    return { naechster, offeneFristen, bestaetigte, warten };
  }, [upcomingTermine, upcomingReminders, now, nowIso]);

  function fristTage(iso: string): number {
    return differenceInCalendarDays(parseISO(iso), now);
  }

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

  function statusLabel(badge: ViewBadge): string {
    return tStatus(viewBadgeLabelKey(badge));
  }

  function termineIconTone(term: Termin): {
    tone: string;
    Icon: React.ComponentType<{ className?: string }>;
  } {
    const lower = (
      behoerdeName(term.behoerde_id) ||
      term.betreff ||
      ''
    ).toLowerCase();
    if (lower.includes('kinderarzt') || lower.includes('arzt'))
      return { tone: 'violet', Icon: Stethoscope };
    if (lower.includes('finanz') || lower.includes('steuer'))
      return { tone: 'green', Icon: ReceiptText };
    if (lower.includes('beitragsservice') || lower.includes('rundfunk'))
      return { tone: 'green', Icon: Euro };
    return { tone: '', Icon: Landmark };
  }

  function reminderIcon(
    r: Reminder,
  ): React.ComponentType<{ className?: string }> {
    const lower = (r.titel || '').toLowerCase();
    if (lower.includes('steuer')) return ReceiptText;
    if (lower.includes('rundfunk') || lower.includes('beitrag')) return Euro;
    return Bell;
  }

  /* Mock-ICS-Export aller aktiven (persona-scoped) Termine. */
  const futureTermine = React.useMemo(
    () =>
      ownTermine
        .filter((term) => displayStatus(term, nowIso) !== 'abgesagt')
        .filter((term) => isUpcoming(term.datum)),
    [ownTermine, nowIso, isUpcoming],
  );

  const handleIcsExport = React.useCallback(() => {
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
          ? `DESCRIPTION:${escapeIcs(`[MOCK] ${termin.buchungsreferenz}`)}`
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
  }, [futureTermine, now, behoerdeName]);

  const selectedDateLabel = selectedIso
    ? format(parseISO(selectedIso), 'EEEE, dd. MMMM yyyy', {
        locale: dateLocale,
      })
    : '';

  // --------------------------------------------------------------------------
  // Render.
  // --------------------------------------------------------------------------

  if (phase === 'error') {
    return (
      <div>
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
      </div>
    );
  }

  if (phase === 'loading') {
    return (
      <div role="status" aria-busy="true">
        <span className="sr-only">{t('common.loading')}</span>
        <div className="gt-page-head">
          <Skeleton shape="text" className="h-8 w-48" />
          <Skeleton shape="text" className="mt-2 w-72" />
        </div>
        <div className="tm-kpis">
          <Skeleton className="h-24 rounded-2xl" />
          <Skeleton className="h-24 rounded-2xl" />
          <Skeleton className="h-24 rounded-2xl" />
          <Skeleton className="h-24 rounded-2xl" />
        </div>
        <div className="tm-layout">
          <Skeleton className="h-80 rounded-2xl" />
          <Skeleton className="h-80 rounded-2xl" />
          <Skeleton className="h-80 rounded-2xl" />
        </div>
      </div>
    );
  }

  const TABS: Array<{ id: TabId; label: string }> = [
    { id: 'alle', label: tTermine('tabs.alle') },
    { id: 'termine', label: tTermine('tabs.termine') },
    { id: 'fristen', label: tTermine('tabs.fristen') },
    { id: 'erinnerungen', label: tTermine('tabs.erinnerungen') },
    { id: 'vergangen', label: tTermine('tabs.vergangen') },
  ];

  const naechsterDatum = kpis.naechster
    ? formatDateLong(kpis.naechster.datum, dateLocale)
    : t('termine.kpi.kein_termin');
  const naechsterZeit = kpis.naechster
    ? formatTimeRange(kpis.naechster.datum)
    : '—';

  return (
    <div>
      <div className="gt-page-head">
        <h1>{t('termine.title')}</h1>
        <div className="sub">{t('termine.subtitle')}</div>
      </div>

      {/* Row 1 — KPI tiles. */}
      <div className="tm-kpis">
        <div className="tm-kpi">
          <span className="icon-circle lg green">
            <Calendar aria-hidden="true" />
          </span>
          <div className="tm-kpi-body">
            <span className="k-label">{t('termine.kpi.naechster_termin')}</span>
            <span className="k-val tabular-nums">{naechsterDatum}</span>
            <span className="k-sub tabular-nums">{naechsterZeit}</span>
          </div>
        </div>
        <div className="tm-kpi">
          <span className="icon-circle lg amber">
            <Clock aria-hidden="true" />
          </span>
          <div className="tm-kpi-body">
            <span className="k-label">{t('termine.kpi.offene_fristen')}</span>
            <span className="k-val tabular-nums">{kpis.offeneFristen}</span>
            <span className="k-sub">{t('termine.kpi.offene_fristen_sub')}</span>
          </div>
        </div>
        <div className="tm-kpi">
          <span className="icon-circle lg green">
            <CheckCircle2 aria-hidden="true" />
          </span>
          <div className="tm-kpi-body">
            <span className="k-label">{t('termine.kpi.bestaetigte')}</span>
            <span className="k-val tabular-nums">{kpis.bestaetigte}</span>
            <span className="k-sub">{t('termine.kpi.bestaetigte_sub')}</span>
          </div>
        </div>
        <div className="tm-kpi">
          <span className="icon-circle lg">
            <Users aria-hidden="true" />
          </span>
          <div className="tm-kpi-body">
            <span className="k-label">{t('termine.kpi.warten')}</span>
            <span className="k-val tabular-nums">{kpis.warten}</span>
            <span className="k-sub">{t('termine.kpi.warten_sub')}</span>
          </div>
        </div>
      </div>

      {/* Toolbar — tabs + search + Filter + Export. */}
      <div className="tm-toolbar">
        <div className="tab-chips">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={`chip${activeTab === tab.id ? ' active' : ''}`}
              aria-pressed={activeTab === tab.id}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className="tm-toolbar-actions">
          <div className="vg-search" role="search">
            <label htmlFor="tm-search-input" className="sr-only">
              {t('termine.toolbar.suche_label')}
            </label>
            <Search className="vg-search-icon" aria-hidden="true" />
            <input
              id="tm-search-input"
              type="search"
              className="vg-search-input"
              placeholder={t('termine.toolbar.suche_placeholder')}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              autoComplete="off"
            />
          </div>
          <button
            type="button"
            className="btn btn-secondary"
            disabled
            aria-disabled="true"
          >
            <Filter aria-hidden="true" />
            {t('termine.toolbar.filter')}
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleIcsExport}
            aria-label={t('termine.card.ics_aria_all')}
          >
            <CalendarDays aria-hidden="true" />
            {t('termine.toolbar.export')}
          </button>
        </div>
      </div>

      <p className="sr-only" aria-live="polite">
        {t('termine.liste.anstehende_titel')}: {visibleTermine.length} ·{' '}
        {t('termine.fristen_offen', { count: visibleReminders.length })}
      </p>

      <div className="tm-layout">
        {/* LEFT rail — calendar + legend. */}
        <div className="tm-card">
          <MonthCalendar
            selectedIso={selectedIso}
            todayIso={todayIso}
            events={calendarEvents}
            onSelect={setSelectedIso}
          />
          <div
            className="cal-legend"
            role="group"
            aria-label={t('termine.cal.legend.titel')}
          >
            <div className="cal-legend-row">
              <span className="cal-legend-dot cal-dot-termin" aria-hidden="true" />
              {t('termine.cal.legend.termine')}
            </div>
            <div className="cal-legend-row">
              <span className="cal-legend-dot cal-dot-frist" aria-hidden="true" />
              {t('termine.cal.legend.fristen')}
            </div>
            <div className="cal-legend-row">
              <span
                className="cal-legend-dot cal-dot-erinnerung"
                aria-hidden="true"
              />
              {t('termine.cal.legend.erinnerungen')}
            </div>
            <div className="cal-legend-row">
              <span
                className="cal-legend-dot cal-dot-mehrere"
                aria-hidden="true"
              />
              {t('termine.cal.legend.mehrere')}
            </div>
          </div>
        </div>

        {/* CENTER — appointment + Frist sections. */}
        <div>
          {selectedIso ? (
            <div className="tm-selected-row">
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

          {showTermineSection ? (
            <section className="tm-section" aria-labelledby="tm-anstehende">
              <div className="tm-section-head">
                <h2 id="tm-anstehende">{t('termine.liste.anstehende_titel')}</h2>
              </div>

              {visibleTermine.length > 0 ? (
                visibleTermine.map((term) => {
                  const { tone, Icon } = termineIconTone(term);
                  const badge = viewBadge(term, nowIso);
                  const isSelected = term.id === selectedId;
                  return (
                    <button
                      key={term.id}
                      type="button"
                      className={`tm-list-item is-interactive${isSelected ? ' is-selected' : ''}`}
                      style={{ width: '100%', textAlign: 'left' }}
                      aria-pressed={isSelected}
                      aria-label={t('termine.row.details_aria', {
                        betreff: `${behoerdeName(term.behoerde_id)} — ${term.betreff}, ${statusLabel(badge)}`,
                      })}
                      onClick={() => setSelectedId(term.id)}
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
                            {t('termine.uhr_dauer', {
                              zeit: formatTimeRange(term.datum),
                              dauer: 45,
                            })}
                          </span>
                        </div>
                        <div className="meta">
                          <span>
                            <MapPin style={{ width: 14, height: 14 }} />
                            {term.ort.details}
                          </span>
                        </div>
                      </div>
                      <span className={`badge ${viewBadgeTone(badge)}`}>
                        {statusLabel(badge)}
                      </span>
                      <span className="tm-row-cta" aria-hidden="true">
                        {t('termine.row.details_cta')}
                        <ChevronRight />
                      </span>
                    </button>
                  );
                })
              ) : (
                <EmptyState
                  icon={<Calendar aria-hidden="true" />}
                  title={t('termine.spur.termine_leer')}
                />
              )}

              {visibleTermine.length > 0 && activeTab === 'alle' ? (
                <div className="tm-section-foot">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setActiveTab('termine')}
                  >
                    {t('termine.liste.alle_termine')}
                    <ChevronRight aria-hidden="true" />
                  </button>
                </div>
              ) : null}
            </section>
          ) : null}

          {showFristenSection ? (
            <section className="tm-section" aria-labelledby="tm-fristen">
              <div className="tm-section-head">
                <h2 id="tm-fristen">{fristenHeading}</h2>
              </div>

              {visibleReminders.length > 0 ? (
                visibleReminders.map((r) => {
                  const Icon = reminderIcon(r);
                  const isFrist = r.kategorie === 'frist';
                  const badge = fristBadge(r.datum);
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
                          <div className="meta">
                            {behoerdeName(r.behoerde_id)}
                          </div>
                        ) : null}
                      </div>
                      <Badge variant={badge.variant}>{badge.label}</Badge>
                    </>
                  );
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
                })
              ) : (
                <EmptyState
                  icon={<Bell aria-hidden="true" />}
                  title={t('termine.spur.fristen_leer')}
                />
              )}

              {visibleReminders.length > 0 && activeTab === 'alle' ? (
                <div className="tm-section-foot">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setActiveTab('fristen')}
                  >
                    {t('termine.liste.alle_fristen')}
                    <ChevronRight aria-hidden="true" />
                  </button>
                </div>
              ) : null}
            </section>
          ) : null}

          {visibleCount === 0 ? (
            <EmptyState
              icon={<Calendar aria-hidden="true" />}
              title={t('termine.empty.filter_title')}
            />
          ) : null}
        </div>

        {/* RIGHT rail — Termindetails panel. */}
        <div className="tm-card tm-detail">
          <TerminDetailPanel
            termin={detailTermin}
            nowIso={nowIso}
            dateLocale={dateLocale}
            busy={detailTermin ? busy === detailTermin.id : false}
            behoerdeName={behoerdeName}
            statusLabel={statusLabel}
            recentlyConfirmed={
              detailTermin !== null &&
              detailTermin.id === recentlyConfirmedId &&
              displayStatus(detailTermin, nowIso) === 'bestaetigt'
            }
            onClose={() => setSelectedId(null)}
            onBestaetigen={() => {
              if (detailTermin) void handleBestaetigen(detailTermin);
            }}
            onReschedule={() => {
              if (detailTermin) setRescheduleTermin(detailTermin);
            }}
            onAbsagen={() => {
              if (!detailTermin) return;
              absagenOpenerRef.current =
                document.activeElement as HTMLElement | null;
              setAbsagenTermin(detailTermin);
            }}
          />
        </div>
      </div>

      <TerminRescheduleDialog
        termin={rescheduleTermin}
        nowIso={nowIso}
        dateLocale={dateLocale}
        busy={rescheduleTermin ? busy === rescheduleTermin.id : false}
        onPick={(slot) => {
          if (rescheduleTermin) void handleReschedule(rescheduleTermin, slot);
        }}
        onWaitlist={handleWaitlist}
        onOpenChange={(open) => {
          if (!open) setRescheduleTermin(null);
        }}
      />

      <TerminAbsagenDialog
        open={absagenTermin !== null}
        onOpenChange={(open) => {
          if (!open) setAbsagenTermin(null);
        }}
        pending={absagenTermin ? busy === absagenTermin.id : false}
        onConfirm={() => {
          if (absagenTermin) void handleAbsagenConfirm(absagenTermin);
        }}
        onCancel={() => setAbsagenTermin(null)}
        finalFocusRef={absagenOpenerRef}
      />
    </div>
  );
}

interface TerminDetailPanelProps {
  termin: Termin | null;
  nowIso: string;
  dateLocale: Locale;
  busy: boolean;
  behoerdeName: (id?: string) => string;
  statusLabel: (badge: ViewBadge) => string;
  recentlyConfirmed: boolean;
  onClose: () => void;
  onBestaetigen: () => void;
  onReschedule: () => void;
  onAbsagen: () => void;
}

/**
 * „Termindetails" right panel — replaces the old detail Dialog. Persistent
 * `.tm-detail` card bound to the selected termin. For a Bürgeramt §17 termin it
 * surfaces the live „noch N Tage"-§17-reasoning + the primary „Termin bestätigen"
 * CTA; after confirm it flips green and renders the honest Datenminimierungs-
 * Quittung („Gelesen: nichts aus Ihrem Kalender.") — never a Posteingang claim.
 */
function TerminDetailPanel({
  termin,
  nowIso,
  dateLocale,
  busy,
  behoerdeName,
  statusLabel,
  recentlyConfirmed,
  onClose,
  onBestaetigen,
  onReschedule,
  onAbsagen,
}: TerminDetailPanelProps) {
  const t = useTranslations('termine');
  const tRoot = useTranslations();
  const [done, setDone] = React.useState<Record<number, boolean>>({});

  // Reset the local checklist toggles when the selected termin changes.
  React.useEffect(() => {
    setDone({});
  }, [termin?.id]);

  const reasoningLine = React.useMemo(() => {
    if (!termin || termin.reasoning_typ !== 'bmg_17' || !termin.frist_iso) {
      return t('hero.reasoning_bmg17_statisch');
    }
    const frist = parseISO(termin.frist_iso);
    if (Number.isNaN(frist.getTime())) {
      return t('hero.reasoning_bmg17_statisch');
    }
    const tage = differenceInCalendarDays(frist, parseISO(nowIso));
    if (tage < 0) return t('hero.reasoning_bmg17_statisch');
    return t('hero.reasoning_bmg17', { tage });
  }, [termin, nowIso, t]);

  if (!termin) {
    return (
      <>
        <div className="tm-detail-head">
          <h2>{t('detail.titel')}</h2>
        </div>
        <p className="tm-detail-empty">{t('empty.naechster_schritt')}</p>
      </>
    );
  }

  const badge = viewBadge(termin, nowIso);
  const istVorgemerktHero = istBuergeramtVorgemerkt(termin, nowIso);
  const isVideo = termin.ort.typ === 'video';
  const ortLabel =
    termin.ort.typ === 'video'
      ? t('ort.video')
      : termin.ort.typ === 'telefon'
        ? t('ort.telefon')
        : t('ort.praesenz');

  return (
    <>
      <div className="tm-detail-head">
        <h2>{t('detail.titel')}</h2>
        <button
          type="button"
          className="tm-detail-close"
          aria-label={t('detail.schliessen')}
          onClick={onClose}
        >
          <X aria-hidden="true" />
        </button>
      </div>

      <div className="tm-detail-title">
        <span className="t">
          {behoerdeName(termin.behoerde_id)} — {termin.betreff}
        </span>
        <span className={`badge ${viewBadgeTone(badge)}`}>
          {statusLabel(badge)}
        </span>
      </div>

      <div className="ns-info">
        <div className="row tabular-nums">
          <Calendar aria-hidden="true" />
          {formatDateLong(termin.datum, dateLocale)}
        </div>
        <div className="row tabular-nums">
          <Clock aria-hidden="true" />
          {t('uhr_dauer', { zeit: formatTimeRange(termin.datum), dauer: 45 })}
        </div>
        <div className="row">
          <Landmark aria-hidden="true" />
          <div>
            <span className="link">{behoerdeName(termin.behoerde_id)}</span>
            <br />
            {ortLabel} · {termin.ort.details}
          </div>
        </div>
        {termin.buchungsreferenz ? (
          <div className="row">
            <FileText aria-hidden="true" />
            <span className="mono tabular-nums">{termin.buchungsreferenz}</span>
          </div>
        ) : null}
      </div>

      {termin.vorbereitung && termin.vorbereitung.length > 0 ? (
        <div className="prep-card">
          <h3>{t('detail.vorbereitung_titel')}</h3>
          {termin.vorbereitung.map((item, idx) => {
            const checked = done[idx] ?? item.done ?? false;
            return (
              <button
                key={item.label_i18n_key}
                type="button"
                className="prep-toggle"
                aria-pressed={checked}
                onClick={() =>
                  setDone((prev) => ({ ...prev, [idx]: !checked }))
                }
              >
                <span className="pt-icon" aria-hidden="true">
                  {checked ? <CheckCircle2 /> : <Circle />}
                </span>
                <span className="pt-label">
                  {tRoot(item.label_i18n_key as never)}
                </span>
              </button>
            );
          })}
        </div>
      ) : null}

      {termin.vorgang_id ? (
        <div className="ns-info" style={{ marginBottom: 8 }}>
          <div className="row">
            <FileText aria-hidden="true" />
            <Link href={`/vorgaenge/${termin.vorgang_id}`} className="link">
              {t('detail.zugehoeriger_vorgang')}
            </Link>
          </div>
        </div>
      ) : null}

      {istVorgemerktHero ? (
        <div className="tm-detail-reason">
          <Info aria-hidden="true" />
          <div>
            <span className="tabular-nums">{reasoningLine}</span>
            <br />
            <span className="open">{t('hero.nicht_abgeschlossen')}</span>
          </div>
        </div>
      ) : null}

      {recentlyConfirmed ? (
        <section
          className="vr-card"
          aria-live="polite"
          aria-label={t('quittung.titel')}
          style={{ marginBottom: 12 }}
        >
          <div className="vr-head">
            <span className="vr-icon" aria-hidden="true">
              <CheckCircle2 />
            </span>
            <h3 className="vr-title">{t('quittung.titel')}</h3>
          </div>
          <p style={{ fontSize: 13.5, lineHeight: 1.6, margin: 0 }}>
            {t('quittung.gelesen')}
          </p>
        </section>
      ) : null}

      <div className="tm-detail-actions">
        {istVorgemerktHero ? (
          <button
            type="button"
            className="btn btn-primary"
            disabled={busy}
            aria-label={t('hero.aria_bestaetigen', {
              behoerde: behoerdeName(termin.behoerde_id),
              datum: formatDateLong(termin.datum, dateLocale),
            })}
            onClick={onBestaetigen}
          >
            <CheckCircle2 aria-hidden="true" />
            {t('hero.cta_bestaetigen')}
          </button>
        ) : null}

        {termin.vorgang_id ? (
          <Link
            href={`/vorgaenge/${termin.vorgang_id}`}
            className="btn btn-primary"
          >
            {t('detail.zum_vorgang')}
          </Link>
        ) : null}

        <button
          type="button"
          className="btn btn-secondary"
          disabled={busy}
          onClick={onReschedule}
        >
          <Calendar aria-hidden="true" />
          {t('detail.verschieben')}
        </button>

        <button
          type="button"
          className="btn btn-danger"
          disabled={busy}
          onClick={onAbsagen}
        >
          <X aria-hidden="true" />
          {t('action.absagen')}
        </button>
      </div>

      {isVideo ? (
        <div className="tm-detail-foot">{t('detail.link_hinweis')}</div>
      ) : null}
    </>
  );
}
