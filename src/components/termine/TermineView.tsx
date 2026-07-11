'use client';

import * as React from 'react';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { differenceInCalendarDays, format, parseISO } from 'date-fns';
import { toast } from 'sonner';
import {
  Bell,
  Calendar,
  CalendarDays,
  ChevronRight,
  Info,
  RefreshCw,
  Search,
} from 'lucide-react';

import { api } from '@/lib/mock-backend';
import { dateFnsLocale } from '@/lib/utils';
import type { Behoerde, Reminder, Termin } from '@/types';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/shared/EmptyState';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/shared/Skeleton';

import { MonthCalendar, type DayEventBreakdown } from './MonthCalendar';
import { TerminDetailContent } from './TerminDetailContent';
import { TerminRescheduleDialog } from './TerminRescheduleDialog';
import { TerminAbsagenDialog } from './TerminAbsagenDialog';
import {
  dayKey,
  formatDateLong,
  formatDateShort,
  formatTimeRange,
} from './termin-format';
import { displayStatus, istBuergeramtVorgemerkt } from './termin-status';
import {
  viewBadge,
  viewBadgeTone,
  viewBadgeLabelKey,
  type ViewBadge,
} from './termin-badge';

/* termine-rework.md: agenda-first rework of /termine. The data layer
   (load/retry/subscribe, optimistic revert-on-error mutations, ICS export, §17
   „Vorgemerkt" semantics) is PRESERVED — only the derivations + JSX/CSS change:
   one chronological Agenda merging Termine + Fristen + Erinnerungen, a „Wartet
   auf Sie"-Band hosting the §17 hero + overdue Fristen, details on demand
   (inline accordion) instead of the former persistent right panel. All ops stay
   honest: the §17 confirm shows only the „Gelesen: nichts aus Ihrem Kalender."-
   Quittung, never a Posteingang claim; the ABH/LEA termin is never the §17 hero. */

interface TermineViewProps {
  nowIso: string;
}

const TWENTY_FOUR_HOURS_MS = 24 * 3600 * 1000;
const THIRTY_DAYS_MS = 30 * 24 * 3600 * 1000;

type TabId = 'alle' | 'termine' | 'fristen' | 'erinnerungen' | 'vergangen';

type AgendaKind = 'termin' | 'frist' | 'erinnerung';

type AgendaItem =
  | { kind: 'termin'; datum: string; id: string; term: Termin }
  | { kind: 'frist'; datum: string; id: string; rem: Reminder }
  | { kind: 'erinnerung'; datum: string; id: string; rem: Reminder };

/** Stable secondary sort at equal timestamp: termin < frist < erinnerung. */
const KIND_ORDER: Record<AgendaKind, number> = {
  termin: 0,
  frist: 1,
  erinnerung: 2,
};

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
  // Accordion: exactly one expanded agenda termin at a time (null = none open).
  const [expandedId, setExpandedId] = React.useState<string | null>(null);
  // The §17 confirm flips the badge green; keep that hero in the band as a receipt.
  const [recentlyConfirmedId, setRecentlyConfirmedId] = React.useState<
    string | null
  >(null);
  // Auto-expand is applied exactly once after the first successful load.
  const autoExpandedRef = React.useRef(false);
  // Sub-1024 the rail collapses into a <details>; ≥1024 it is a sticky column.
  const [isNarrow, setIsNarrow] = React.useState(false);

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

  React.useEffect(() => {
    const mq = window.matchMedia('(max-width: 1023px)');
    const update = () => setIsNarrow(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

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

  // --------------------------------------------------------------------------
  // „Wartet auf Sie"-Band qualification (§4). Only items that wait on the CITIZEN:
  // the §17 Bürgeramt hero + overdue Fristen. Everything else stays in the agenda.
  // --------------------------------------------------------------------------
  const heroTermin = React.useMemo(() => {
    const vorgemerkt = upcomingTermine.find((term) =>
      istBuergeramtVorgemerkt(term, nowIso),
    );
    if (vorgemerkt) return vorgemerkt;
    // Keep the just-confirmed hero in the band as a green receipt for the session.
    if (recentlyConfirmedId) {
      return (
        upcomingTermine.find((term) => term.id === recentlyConfirmedId) ?? null
      );
    }
    return null;
  }, [upcomingTermine, nowIso, recentlyConfirmedId]);

  const overdueFristen = React.useMemo(
    () =>
      upcomingReminders
        .filter(
          (r) =>
            r.kategorie === 'frist' &&
            differenceInCalendarDays(parseISO(r.datum), now) < 0,
        )
        .sort((a, b) => a.datum.localeCompare(b.datum)),
    [upcomingReminders, now],
  );

  const tabIncludesKind = React.useCallback(
    (kind: AgendaKind) => {
      switch (activeTab) {
        case 'vergangen':
          return false;
        case 'termine':
          return kind === 'termin';
        case 'fristen':
          return kind === 'frist';
        case 'erinnerungen':
          return kind === 'erinnerung';
        default:
          return true;
      }
    },
    [activeTab],
  );

  const showHeroInBand = heroTermin !== null && tabIncludesKind('termin');
  const showOverdueInBand = overdueFristen.length > 0 && tabIncludesKind('frist');
  const bandVisible = showHeroInBand || showOverdueInBand;

  /** One chronological agenda merging Termine + Fristen + Erinnerungen (§3).
   *  Band-promoted items are removed here so nothing renders twice. */
  const agendaItems = React.useMemo<AgendaItem[]>(() => {
    const isPast = activeTab === 'vergangen';
    const baseTermine = isPast ? pastTermine : upcomingTermine;
    const baseReminders = isPast ? pastReminders : upcomingReminders;

    const promoted = new Set<string>();
    if (heroTermin) promoted.add(heroTermin.id);
    for (const r of overdueFristen) promoted.add(r.id);

    const items: AgendaItem[] = [];
    for (const term of baseTermine) {
      if (promoted.has(term.id)) continue;
      items.push({ kind: 'termin', datum: term.datum, id: term.id, term });
    }
    for (const r of baseReminders) {
      if (promoted.has(r.id)) continue;
      const kind: AgendaKind = r.kategorie === 'frist' ? 'frist' : 'erinnerung';
      items.push({ kind, datum: r.datum, id: r.id, rem: r });
    }

    const filtered = items
      .filter((it) => {
        if (activeTab === 'termine') return it.kind === 'termin';
        if (activeTab === 'fristen') return it.kind === 'frist';
        if (activeTab === 'erinnerungen') return it.kind === 'erinnerung';
        return true; // 'alle' | 'vergangen'
      })
      .filter((it) => matchesSelectedDay(it.datum))
      .filter((it) =>
        it.kind === 'termin'
          ? matchesQuery(
              `${behoerdeName(it.term.behoerde_id)} ${it.term.betreff}`,
            )
          : matchesQuery(`${it.rem.titel} ${behoerdeName(it.rem.behoerde_id)}`),
      );

    filtered.sort((a, b) => {
      const cmp = a.datum.localeCompare(b.datum);
      if (cmp !== 0) return isPast ? -cmp : cmp;
      return KIND_ORDER[a.kind] - KIND_ORDER[b.kind];
    });
    return filtered;
  }, [
    activeTab,
    pastTermine,
    upcomingTermine,
    pastReminders,
    upcomingReminders,
    heroTermin,
    overdueFristen,
    matchesSelectedDay,
    matchesQuery,
    behoerdeName,
  ]);

  /** Agenda items grouped by day, in sort order. */
  const agendaGroups = React.useMemo(() => {
    const groups: Array<{ key: string; datum: string; items: AgendaItem[] }> =
      [];
    for (const it of agendaItems) {
      const key = dayKey(it.datum);
      const last = groups[groups.length - 1];
      if (last && last.key === key) last.items.push(it);
      else groups.push({ key, datum: it.datum, items: [it] });
    }
    return groups;
  }, [agendaItems]);

  /* Auto-expand once after first load so a `.tm-detail` is present on load
     (Demo-Tour pans onto it). A §17 hero lives in the band (always expanded) —
     then no agenda auto-expand is needed; otherwise expand the nächster Termin. */
  React.useEffect(() => {
    if (phase !== 'ready' || autoExpandedRef.current) return;
    if (heroTermin) {
      autoExpandedRef.current = true;
      return;
    }
    if (upcomingTermine.length === 0) return; // wait for data to settle
    autoExpandedRef.current = true;
    setExpandedId(upcomingTermine[0]!.id);
  }, [phase, heroTermin, upcomingTermine]);

  /** Calendar dots — per-day category breakdown across termine + reminders.
   *  The breakdown feeds the cell aria-label (text); the dot itself is neutral. */
  const calendarEvents = React.useMemo(() => {
    const events: Record<string, DayEventBreakdown> = {};
    const bump = (iso: string, cat: keyof DayEventBreakdown) => {
      const key = dayKey(iso);
      const cur = events[key] ?? { termine: 0, fristen: 0, erinnerungen: 0 };
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

  function fristBadge(iso: string): {
    label: string;
    variant: 'neutral' | 'warning' | 'danger';
  } {
    const days = differenceInCalendarDays(parseISO(iso), now);
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
    ? format(parseISO(selectedIso), 'PPPP', { locale: dateLocale })
    : '';

  const hasFilter =
    query.trim().length > 0 || selectedIso !== null || activeTab !== 'alle';

  /** Relative day-group header: heute / morgen else localized short date. */
  function groupLabel(datum: string): {
    primary: string;
    secondary: string | null;
    isToday: boolean;
  } {
    const delta = differenceInCalendarDays(parseISO(datum), now);
    if (delta === 0) {
      return {
        primary: tTermine('agenda.heute'),
        secondary: formatDateShort(datum, dateLocale),
        isToday: true,
      };
    }
    if (delta === 1) {
      return {
        primary: tTermine('agenda.morgen'),
        secondary: formatDateShort(datum, dateLocale),
        isToday: false,
      };
    }
    return {
      primary: formatDateShort(datum, dateLocale),
      secondary: null,
      isToday: false,
    };
  }

  const onAbsagenClick = (termin: Termin) => {
    absagenOpenerRef.current = document.activeElement as HTMLElement | null;
    setAbsagenTermin(termin);
  };

  // --------------------------------------------------------------------------
  // Agenda row renderers (inline — not reused elsewhere, per Karpathy simplicity).
  // --------------------------------------------------------------------------

  function renderTerminRow(term: Termin) {
    const badge = viewBadge(term, nowIso);
    const isOpen = expandedId === term.id;
    const ortLabel =
      term.ort.typ === 'video'
        ? tTermine('ort.video')
        : term.ort.typ === 'telefon'
          ? tTermine('ort.telefon')
          : tTermine('ort.praesenz');
    const title = `${behoerdeName(term.behoerde_id)} — ${term.betreff}`;
    return (
      <React.Fragment key={term.id}>
        <button
          type="button"
          className={`tm-agenda-row flex w-full flex-col gap-1.5 rounded-lg py-3.5 text-start transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary min-[541px]:flex-row min-[541px]:items-center min-[541px]:gap-3 ${
            isOpen ? 'is-open' : 'hover:bg-surface-muted/60'
          }`}
          aria-expanded={isOpen}
          aria-controls={`tm-detail-${term.id}`}
          aria-label={`${title}, ${statusLabel(badge)}`}
          onClick={() => setExpandedId((cur) => (cur === term.id ? null : term.id))}
        >
          <span className="flex w-full min-w-0 items-start gap-3 min-[541px]:w-auto min-[541px]:flex-1">
            {/* Bare HH:mm in the compact row (list idiom; „Uhr" lives in the KPI
                strip + detail card) — semibold „09:30 Uhr" wrapped inside w-16. */}
            <span className="w-16 shrink-0 pt-0.5 text-sm font-semibold tabular-nums text-text-primary">
              {format(parseISO(term.datum), 'HH:mm')}
            </span>
            <span className="min-w-0 flex-1">
              <span
                className="line-clamp-3 font-semibold text-text-primary min-[541px]:line-clamp-2"
                title={title}
              >
                {title}
              </span>
              <span className="mt-0.5 line-clamp-2 text-sm text-text-secondary">
                {ortLabel} · {term.ort.details}
              </span>
            </span>
          </span>
          <span className="flex w-full items-center justify-between gap-2 ps-16 min-[541px]:w-auto min-[541px]:justify-start min-[541px]:ps-0 min-[541px]:shrink-0">
            <span className={`badge ${viewBadgeTone(badge)}`}>
              {statusLabel(badge)}
            </span>
            <ChevronRight
              aria-hidden="true"
              className={`size-4 shrink-0 text-text-muted transition-transform motion-reduce:transition-none rtl:-scale-x-100 ${
                isOpen ? 'rotate-90' : ''
              }`}
            />
          </span>
        </button>
        {isOpen ? (
          <div
            id={`tm-detail-${term.id}`}
            role="region"
            aria-label={title}
            /* Raised card, not a wash — the expanded surface must separate from
               the list (figure-ground). @starting-style entrance, ease-out. */
            className="tm-detail mb-4 mt-1 rounded-xl border border-border bg-surface p-4 shadow-sm transition-[opacity,translate] duration-200 ease-out starting:-translate-y-1 starting:opacity-0 motion-reduce:transition-none sm:p-5"
          >
            <TerminDetailContent
              termin={term}
              nowIso={nowIso}
              dateLocale={dateLocale}
              busy={busy === term.id}
              behoerdeName={behoerdeName}
              statusLabel={statusLabel}
              recentlyConfirmed={
                term.id === recentlyConfirmedId &&
                displayStatus(term, nowIso) === 'bestaetigt'
              }
              context="accordion"
              onBestaetigen={() => void handleBestaetigen(term)}
              onReschedule={() => setRescheduleTermin(term)}
              onAbsagen={() => onAbsagenClick(term)}
            />
          </div>
        ) : null}
      </React.Fragment>
    );
  }

  // ≤540: stack the right cluster (badge/CTA) below the title so the title wins
  // the width fight; ≥541: title flex-1, cluster inline right.
  const AGENDA_ROW_STACK =
    'tm-agenda-row flex flex-col gap-1.5 rounded-lg py-3.5 min-[541px]:flex-row min-[541px]:items-center min-[541px]:gap-3';
  const AGENDA_LINK_STACK = `${AGENDA_ROW_STACK} transition-colors hover:bg-surface-muted/60 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary`;

  function renderFristRow(r: Reminder) {
    const badge = fristBadge(r.datum);
    const secondary = r.behoerde_id ? behoerdeName(r.behoerde_id) : null;
    const leftGroup = (
      <span className="flex w-full min-w-0 items-start gap-3 min-[541px]:w-auto min-[541px]:flex-1">
        <span
          className="flex w-16 shrink-0 justify-center pt-0.5 text-text-muted"
          aria-hidden="true"
        >
          <Calendar className="size-4" />
        </span>
        <span className="min-w-0 flex-1">
          <span
            className="line-clamp-3 font-semibold text-text-primary min-[541px]:line-clamp-2"
            title={r.titel}
          >
            {r.titel}
          </span>
          {secondary ? (
            <span className="mt-0.5 line-clamp-2 text-sm text-text-secondary">
              {secondary}
            </span>
          ) : null}
        </span>
      </span>
    );
    const rightGroup = (
      <span className="flex w-full items-center justify-between gap-3 ps-16 min-[541px]:w-auto min-[541px]:justify-start min-[541px]:ps-0 min-[541px]:shrink-0">
        <Badge variant={badge.variant} className="shrink-0">
          {badge.label}
        </Badge>
        {r.vorgang_id ? (
          <span className="tm-row-cta" aria-hidden="true">
            {tTermine('row.zum_vorgang_cta')}
            <ChevronRight />
          </span>
        ) : null}
      </span>
    );
    return r.vorgang_id ? (
      <Link
        key={r.id}
        href={`/vorgaenge/${r.vorgang_id}`}
        className={AGENDA_LINK_STACK}
        // Fold the due-badge into the accessible name — a bare aria-label would
        // override the child text and drop the urgency („In 12 Tagen"/„überfällig")
        // for screen readers (a11y-audit moderate finding).
        aria-label={`${r.titel}, ${badge.label} — ${tTermine('row.zum_vorgang_cta')}`}
      >
        {leftGroup}
        {rightGroup}
      </Link>
    ) : (
      <div key={r.id} className={AGENDA_ROW_STACK}>
        {leftGroup}
        {rightGroup}
      </div>
    );
  }

  function renderErinnerungRow(r: Reminder) {
    const secondary = r.behoerde_id ? behoerdeName(r.behoerde_id) : null;
    // The day-group header already carries the full date; the right side only
    // adds a neutral month label for far-out reminders (>30d), nothing sooner.
    const monthLabel =
      differenceInCalendarDays(parseISO(r.datum), now) > 30
        ? format(parseISO(r.datum), 'MMM yyyy', { locale: dateLocale })
        : null;
    const leftGroup = (
      <span className="flex w-full min-w-0 items-start gap-3 min-[541px]:w-auto min-[541px]:flex-1">
        <span
          className="flex w-16 shrink-0 justify-center pt-0.5 text-text-muted"
          aria-hidden="true"
        >
          <Bell className="size-4" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-start gap-2">
            <span
              className="line-clamp-2 min-w-0 font-semibold text-text-primary"
              title={r.titel}
            >
              {r.titel}
            </span>
            <span className="mt-0.5 shrink-0 rounded-full bg-surface-muted px-2 py-0.5 text-xs text-text-secondary">
              {tTermine('marker.erinnerung')}
            </span>
          </span>
          {secondary ? (
            <span className="mt-0.5 line-clamp-2 text-sm text-text-secondary">
              {secondary}
            </span>
          ) : null}
        </span>
      </span>
    );
    const rightGroup = monthLabel ? (
      <span className="flex w-full items-center justify-between ps-16 min-[541px]:w-auto min-[541px]:justify-start min-[541px]:ps-0 min-[541px]:shrink-0">
        <Badge variant="neutral" className="shrink-0 tabular-nums">
          {monthLabel}
        </Badge>
      </span>
    ) : null;
    return r.vorgang_id ? (
      <Link
        key={r.id}
        href={`/vorgaenge/${r.vorgang_id}`}
        className={AGENDA_LINK_STACK}
        // Fold the right-side label (month, if any) into the accessible name so
        // the bare aria-label doesn't drop it (a11y-audit moderate finding).
        aria-label={
          monthLabel
            ? `${r.titel}, ${monthLabel} — ${tTermine('row.zum_vorgang_cta')}`
            : `${r.titel} — ${tTermine('row.zum_vorgang_cta')}`
        }
      >
        {leftGroup}
        {rightGroup}
      </Link>
    ) : (
      <div key={r.id} className={AGENDA_ROW_STACK}>
        {leftGroup}
        {rightGroup}
      </div>
    );
  }

  function renderRow(it: AgendaItem) {
    if (it.kind === 'termin') return renderTerminRow(it.term);
    if (it.kind === 'frist') return renderFristRow(it.rem);
    return renderErinnerungRow(it.rem);
  }

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
        <div className="mb-[18px] flex flex-col divide-y divide-border border-y border-border sm:flex-row sm:divide-x sm:divide-y-0">
          <div className="flex flex-col justify-center gap-1.5 py-3.5 sm:flex-1 sm:pr-6">
            <Skeleton shape="text" className="h-3 w-24" />
            <Skeleton shape="text" className="h-5 w-40" />
            <Skeleton shape="text" className="h-3 w-20" />
          </div>
          <div className="flex flex-col justify-center py-3 sm:flex-1 sm:px-6">
            <div className="flex items-baseline gap-2">
              <Skeleton shape="text" className="h-6 w-8" />
              <Skeleton shape="text" className="h-3 w-24" />
            </div>
          </div>
          <div className="flex flex-col justify-center py-3 sm:flex-1 sm:px-6">
            <div className="flex items-baseline gap-2">
              <Skeleton shape="text" className="h-6 w-8" />
              <Skeleton shape="text" className="h-3 w-24" />
            </div>
          </div>
          <div className="flex flex-col justify-center py-3 sm:flex-1 sm:px-6">
            <div className="flex items-baseline gap-2">
              <Skeleton shape="text" className="h-6 w-8" />
              <Skeleton shape="text" className="h-3 w-24" />
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_300px] xl:grid-cols-[minmax(0,1fr)_340px]">
          <Skeleton className="h-80 rounded-2xl" />
          <Skeleton className="h-72 rounded-2xl" />
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
    ? tTermine('zeit_range', { range: formatTimeRange(kpis.naechster.datum) })
    : '—';

  const railInner = (
    <>
      <div className="tm-rail-card rounded-2xl border border-border bg-surface p-4">
        <MonthCalendar
          selectedIso={selectedIso}
          todayIso={todayIso}
          events={calendarEvents}
          onSelect={setSelectedIso}
        />
      </div>
      <button
        type="button"
        className="mt-3 inline-flex items-center gap-1 rounded-md text-sm font-medium text-primary hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        onClick={() => setActiveTab('vergangen')}
      >
        {tTermine('rail.vergangen_link')}
        <ChevronRight aria-hidden="true" className="size-4 rtl:-scale-x-100" />
      </button>
    </>
  );

  return (
    <div>
      <div className="gt-page-head">
        <h1>{t('termine.title')}</h1>
        <div className="sub">{t('termine.subtitle')}</div>
      </div>

      {/* Editorial summary strip: „Nächster Termin" leads (date + time), the three
          counts follow as Zahl + Label on one line. No boxes, no icon circles. */}
      <div
        data-testid="termine-kennzahl-strip"
        className="mb-[18px] flex flex-col divide-y divide-border border-y border-border sm:flex-row sm:divide-x sm:divide-y-0"
        role="group"
        aria-label={t('termine.kpi.strip_label')}
        tabIndex={0}
      >
        <div className="flex flex-col justify-center gap-0.5 py-3.5 sm:flex-1 sm:pr-6">
          <span className="text-xs font-semibold text-text-secondary">
            {t('termine.kpi.naechster_termin')}
          </span>
          <span className="text-xl font-semibold tracking-tight tabular-nums text-text-primary">
            {naechsterDatum}
          </span>
          <span className="text-sm tabular-nums text-text-secondary">
            {naechsterZeit}
          </span>
        </div>
        <div className="flex flex-col justify-center py-3 sm:flex-1 sm:px-6">
          <p className="flex items-baseline gap-2">
            <span className="text-2xl font-bold leading-none tabular-nums text-text-primary">
              {kpis.offeneFristen}
            </span>
            <span className="text-sm text-text-secondary">
              {t('termine.kpi.offene_fristen')}
            </span>
          </p>
        </div>
        <div className="flex flex-col justify-center py-3 sm:flex-1 sm:px-6">
          <p className="flex items-baseline gap-2">
            <span className="text-2xl font-bold leading-none tabular-nums text-text-primary">
              {kpis.bestaetigte}
            </span>
            <span className="text-sm text-text-secondary">
              {t('termine.kpi.bestaetigte')}
            </span>
          </p>
        </div>
        <div className="flex flex-col justify-center py-3 sm:flex-1 sm:px-6">
          <p className="flex items-baseline gap-2">
            <span className="text-2xl font-bold leading-none tabular-nums text-text-primary">
              {kpis.warten}
            </span>
            <span className="text-sm text-text-secondary">
              {t('termine.kpi.warten')}
            </span>
          </p>
        </div>
      </div>

      {/* Toolbar — tabs + search + Export (dead Filter button removed). */}
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
            onClick={handleIcsExport}
            aria-label={t('termine.card.ics_aria_all')}
          >
            <CalendarDays aria-hidden="true" />
            {t('termine.toolbar.export')}
          </button>
        </div>
      </div>

      <p className="sr-only" aria-live="polite">
        {tTermine('agenda.titel')}: {agendaItems.length}
      </p>

      {/* „Wartet auf Sie"-Band — §17 hero + overdue Fristen; hidden when empty. */}
      {bandVisible ? (
        <section aria-labelledby="tm-wartet-h" className="tm-wartet mb-8">
          <div className="mb-3">
            <h2
              id="tm-wartet-h"
              className="text-lg font-semibold tracking-tight text-text-primary"
            >
              {tTermine('wartet.titel')}
            </h2>
            <p className="mt-0.5 text-sm text-text-secondary">
              {tTermine('wartet.hint')}
            </p>
          </div>

          {showHeroInBand && heroTermin ? (
            <div
              role="region"
              aria-label={`${behoerdeName(heroTermin.behoerde_id)} — ${heroTermin.betreff}`}
              className="tm-detail rounded-2xl border border-border bg-surface p-5 shadow-sm sm:p-6"
            >
              <TerminDetailContent
                termin={heroTermin}
                nowIso={nowIso}
                dateLocale={dateLocale}
                busy={busy === heroTermin.id}
                behoerdeName={behoerdeName}
                statusLabel={statusLabel}
                recentlyConfirmed={
                  heroTermin.id === recentlyConfirmedId &&
                  displayStatus(heroTermin, nowIso) === 'bestaetigt'
                }
                context="band"
                onBestaetigen={() => void handleBestaetigen(heroTermin)}
                onReschedule={() => setRescheduleTermin(heroTermin)}
                onAbsagen={() => onAbsagenClick(heroTermin)}
              />
            </div>
          ) : null}

          {showOverdueInBand ? (
            <div
              className={`divide-y divide-border border-t border-border ${
                showHeroInBand ? 'mt-4' : ''
              }`}
            >
              {overdueFristen.map((r) => renderFristRow(r))}
            </div>
          ) : null}
        </section>
      ) : null}

      {/* Body — Agenda (primary) + Rail (secondary). */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_300px] lg:gap-6 xl:grid-cols-[minmax(0,1fr)_340px] xl:gap-8">
        <section aria-labelledby="tm-agenda-h" className="tm-agenda min-w-0">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <h2
              id="tm-agenda-h"
              className="text-lg font-semibold tracking-tight text-text-primary"
            >
              {tTermine('agenda.titel')}
              {/* Visual count only — aria-hidden keeps the region's accessible
                  name „Anstehend" (the sr-only live line already announces N). */}
              <span
                aria-hidden="true"
                className="ms-2 text-sm font-normal tabular-nums text-text-muted"
              >
                · {agendaItems.length}
              </span>
            </h2>
            {selectedIso ? (
              <div className="flex items-center gap-2">
                <span className="badge brand">
                  <span className="tabular-nums">
                    {tTermine('auswahl.label', { datum: selectedDateLabel })}
                  </span>
                </span>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setSelectedIso(null)}
                >
                  {tTermine('auswahl.aufheben')}
                </button>
              </div>
            ) : null}
          </div>

          {agendaGroups.length > 0 ? (
            /* Timeline spine: a continuous hairline down the agenda gutter; each
               day header hangs a dot on it. The FIRST group (the nearest thing
               coming up) gets the filled Waldgrün dot + halo — the page's "you
               are here" anchor. Logical props → RTL-safe; tokens → dark-safe. */
            <div className="relative flex flex-col gap-7 ps-5">
              <span
                aria-hidden="true"
                className="pointer-events-none absolute bottom-3 start-[3px] top-2 w-px bg-border"
              />
              {agendaGroups.map((group, groupIdx) => {
                const label = groupLabel(group.datum);
                return (
                  <div key={group.key}>
                    <h3 className="relative mb-1.5 flex items-baseline gap-2 text-sm font-semibold text-text-primary">
                      <span
                        aria-hidden="true"
                        className={`absolute -start-5 top-1/2 size-[7px] -translate-y-1/2 rounded-full ${
                          groupIdx === 0
                            ? 'bg-primary ring-4 ring-primary/15'
                            : 'border-2 border-border bg-surface'
                        }`}
                      />
                      <span className={label.isToday ? 'text-primary' : undefined}>
                        {label.primary}
                      </span>
                      {label.secondary ? (
                        <span className="text-xs font-normal tabular-nums text-text-muted">
                          {label.secondary}
                        </span>
                      ) : null}
                    </h3>
                    <div className="divide-y divide-border border-t border-border">
                      {group.items.map((it) => renderRow(it))}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="py-6 text-sm text-text-secondary">
              {hasFilter
                ? t('termine.empty.filter_title')
                : tTermine('agenda.leer')}
            </p>
          )}
        </section>

        {isNarrow ? (
          <section
            aria-labelledby="tm-rail-h"
            className="tm-rail-details rounded-2xl border border-border"
          >
            <details className="group">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-2 rounded-2xl p-4 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary [&::-webkit-details-marker]:hidden">
                <h2
                  id="tm-rail-h"
                  className="text-lg font-semibold tracking-tight text-text-primary"
                >
                  {tTermine('rail.titel')}
                </h2>
                <ChevronRight
                  aria-hidden="true"
                  className="size-5 text-text-muted transition-transform group-open:rotate-90 motion-reduce:transition-none rtl:-scale-x-100"
                />
              </summary>
              <div className="px-4 pb-4">{railInner}</div>
            </details>
          </section>
        ) : (
          <section
            aria-labelledby="tm-rail-h"
            className="self-start lg:sticky lg:top-[calc(var(--header-h)+14px)]"
          >
            <div>
              <h2
                id="tm-rail-h"
                className="mb-3 text-lg font-semibold tracking-tight text-text-primary"
              >
                {tTermine('rail.titel')}
              </h2>
            </div>
            {railInner}
          </section>
        )}
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
