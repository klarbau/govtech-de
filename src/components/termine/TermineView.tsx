'use client';

import * as React from 'react';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { differenceInCalendarDays, format, parseISO } from 'date-fns';
import { toast } from 'sonner';
import { CalendarDays, ChevronRight, Info, RefreshCw } from 'lucide-react';

import { api } from '@/lib/mock-backend';
import { dateFnsLocale } from '@/lib/utils';
import type { AutopilotStep, Behoerde, Reminder, Termin, Vorgang } from '@/types';
import { EmptyState } from '@/components/shared/EmptyState';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/shared/Skeleton';

import { TerminDetailContent } from './TerminDetailContent';
import { TerminRescheduleDialog } from './TerminRescheduleDialog';
import { TerminAbsagenDialog } from './TerminAbsagenDialog';
import { VorgangSchrittAuthDialog } from '@/components/vorgaenge/VorgangSchrittAuthDialog';
import { dayKey, formatDateLong } from './termin-format';
import {
  displayStatus,
  displayStatusLabelKey,
  istBuergeramtVorgemerkt,
} from './termin-status';

/* termine-uebergaben.md: „Übergaben"-Redesign. Der Screen ist kein Kalender,
   sondern die Liste der Momente, in denen das autopilotierte System die Kontrolle
   an die Bürgerin zurückgeben muss (Präsenz-/eID-/Freigabe-Übergaben). Eine
   chronologische Spine mergt Termine + Fristen + Erinnerungen; jedes Item existiert
   genau einmal. Datenschicht (load/retry/subscribe, optimistic revert-on-error,
   ICS-Export, §17-Vorgemerkt-Semantik, Persona-Scoping) bleibt erhalten. Beide
   confirm-gated Write-Pfade (Zusammenlegen §7, Frist-Einreichen §8) gehören der
   View end-to-end (kein Stub-Split). */

interface TermineViewProps {
  nowIso: string;
}

const TWENTY_FOUR_HOURS_MS = 24 * 3600 * 1000;
/** Offset des späteren Termins hinter den früheren beim Zusammenlegen (§ 7.1). */
const MERGE_MINUTES = 45;
/** Angenommene Termindauer für den ICS-Export (VEVENT DTEND). */
const ICS_EVENT_MINUTES = 45;
const GAP_TAGE = 21;

type ViewMode = 'anstehend' | 'vergangen';

/** Ein aufgelöster Nachweis-Schritt für die Ein-Klick-Frist-Karte (§ 5.2). */
interface FristStep {
  stepId: string;
  datenkategorien: string[];
  behoerdeId: string;
}

type SpineItem =
  | { kind: 'dossier'; datum: string; id: string; term: Termin }
  | { kind: 'frist'; datum: string; id: string; rem: Reminder; step: FristStep }
  | {
      kind: 'quiet-termin';
      datum: string;
      id: string;
      term: Termin;
      variant: 'privat' | 'wartet';
    }
  | {
      kind: 'quiet-reminder';
      datum: string;
      id: string;
      rem: Reminder;
      variant: 'automatisch' | 'vorbereitung' | 'frist' | 'erinnerung';
    };

/** Stabile Zweitsortierung bei Gleichstand: Termin < Frist < Erinnerung. */
function kindOrder(item: SpineItem): number {
  if (item.kind === 'dossier' || item.kind === 'quiet-termin') return 0;
  if (item.kind === 'frist') return 1;
  if (item.kind === 'quiet-reminder' && item.variant === 'frist') return 1;
  return 2;
}

/** Ein-Klick-Frist-Gate (§ 5.2): frist/nachweis-Reminder mit vollziehbarem eID-Schritt. */
function resolveFristStep(
  rem: Reminder,
  vorgaenge: Vorgang[],
): FristStep | null {
  if (rem.kategorie !== 'frist' || rem.frist_typ !== 'nachweis') return null;
  if (!rem.vorgang_id) return null;
  const vorgang = vorgaenge.find((v) => v.id === rem.vorgang_id);
  if (!vorgang) return null;
  const step = vorgang.schritte.find(
    (s: AutopilotStep) =>
      (s.status === 'needs_eid' || s.status === 'self_assigned') &&
      s.requires_eid === true,
  );
  if (!step) return null;
  return {
    stepId: step.id,
    datenkategorien: step.datenkategorien ?? [],
    behoerdeId: step.behoerde_id,
  };
}

function parseWartebereich(details: string): string {
  const match = details.match(/Wartebereich[^,]*$/);
  if (match) return match[0].trim();
  const segments = details.split(',');
  return segments[segments.length - 1]?.trim() ?? details;
}

export function TermineView({ nowIso }: TermineViewProps) {
  const t = useTranslations('termine');
  const tRoot = useTranslations();
  const tStatus = useTranslations('termine.status');
  const dateLocale = dateFnsLocale(useLocale());

  const now = React.useMemo(() => parseISO(nowIso), [nowIso]);

  const [termine, setTermine] = React.useState<Termin[]>([]);
  const [reminders, setReminders] = React.useState<Reminder[]>([]);
  const [vorgaenge, setVorgaenge] = React.useState<Vorgang[]>([]);
  const [behoerdenById, setBehoerdenById] = React.useState<
    Record<string, Behoerde>
  >({});
  const [activePersonaId, setActivePersonaId] = React.useState<string | null>(
    null,
  );
  const [bundlingDismissed, setBundlingDismissed] = React.useState<string[]>([]);
  const [busy, setBusy] = React.useState<string | null>(null);
  const [phase, setPhase] = React.useState<'loading' | 'ready' | 'error'>(
    'loading',
  );

  const [view, setView] = React.useState<ViewMode>('anstehend');
  const [recentlyConfirmedId, setRecentlyConfirmedId] = React.useState<
    string | null
  >(null);
  const [liveMsg, setLiveMsg] = React.useState('');

  const [rescheduleTermin, setRescheduleTermin] = React.useState<Termin | null>(
    null,
  );
  const [absagenTermin, setAbsagenTermin] = React.useState<Termin | null>(null);
  const absagenOpenerRef = React.useRef<HTMLElement | null>(null);
  const [fristDialog, setFristDialog] = React.useState<{
    reminder: Reminder;
    step: FristStep;
  } | null>(null);

  const spineRef = React.useRef<HTMLDivElement | null>(null);
  const spineEndRef = React.useRef<HTMLDivElement | null>(null);
  const pendingFristFocusRef = React.useRef<string | null>(null);

  const announce = React.useCallback((msg: string) => setLiveMsg(msg), []);

  const load = React.useCallback(async () => {
    setPhase('loading');
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const [terms, rems, vorg, behoerden, profile] = await Promise.all([
          api.getTermine(),
          api.getReminders(),
          api.getVorgaenge(),
          api.getBehoerden(),
          api.getProfile(),
        ]);
        const dismissed = await api.getTerminBundlingDismissed(profile.id);
        setTermine(terms);
        setReminders(rems);
        setVorgaenge(vorg);
        setBehoerdenById(Object.fromEntries(behoerden.map((b) => [b.id, b])));
        setActivePersonaId(profile.id);
        setBundlingDismissed(dismissed);
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

  /* React live when the autopilot mints/updates a Termin. Deferred past the first
     settle so the page can reach an idle network for SSR/axe. */
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
  // Persona scoping (termine carry owner_persona_id; reminders are server-scoped).
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

  const isUpcoming = React.useCallback(
    (iso: string) =>
      new Date(iso).getTime() >= now.getTime() - TWENTY_FOUR_HOURS_MS,
    [now],
  );

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
  // §17-Bürgeramt-Hero: erstes/expandiertes Dossier; nie Nicht-Bürgeramt.
  // --------------------------------------------------------------------------
  const heroTermin = React.useMemo(() => {
    const vorgemerkt = upcomingTermine.find((term) =>
      istBuergeramtVorgemerkt(term, nowIso),
    );
    if (vorgemerkt) return vorgemerkt;
    if (recentlyConfirmedId) {
      return (
        upcomingTermine.find((term) => term.id === recentlyConfirmedId) ?? null
      );
    }
    return null;
  }, [upcomingTermine, nowIso, recentlyConfirmedId]);

  // --------------------------------------------------------------------------
  // Zusammenlegen-Vorschlag (§ 7.1) — abgeleitet, kein Backend-Objekt.
  // --------------------------------------------------------------------------
  const bundleVorschlag = React.useMemo(() => {
    for (let i = 0; i < upcomingTermine.length; i++) {
      const frueher = upcomingTermine[i]!;
      if (frueher.ort.typ !== 'praesenz') continue;
      if (displayStatus(frueher, nowIso) === 'abgesagt') continue;
      for (let j = 0; j < upcomingTermine.length; j++) {
        if (i === j) continue;
        const spaeter = upcomingTermine[j]!;
        if (spaeter.ort.typ !== 'praesenz') continue;
        if (displayStatus(spaeter, nowIso) === 'abgesagt') continue;
        if (frueher.behoerde_id !== spaeter.behoerde_id) continue;
        if (bundlingDismissed.includes(spaeter.id)) continue;
        if (dayKey(frueher.datum) === dayKey(spaeter.datum)) continue;
        const diff = differenceInCalendarDays(
          parseISO(spaeter.datum),
          parseISO(frueher.datum),
        );
        if (diff <= 0 || diff > 7) continue;
        const start = parseISO(frueher.datum);
        const neues = new Date(start.getTime() + MERGE_MINUTES * 60 * 1000);
        return { frueher, spaeter, neuesIso: neues.toISOString() };
      }
    }
    return null;
  }, [upcomingTermine, nowIso, bundlingDismissed]);

  // --------------------------------------------------------------------------
  // Item-Klassifikation (§ 5) + Spine-Merge (persona-scoped, chronologisch).
  // --------------------------------------------------------------------------
  const classifyTermin = React.useCallback(
    (term: Termin): SpineItem => {
      if (istBuergeramtVorgemerkt(term, nowIso)) {
        return { kind: 'dossier', datum: term.datum, id: term.id, term };
      }
      if (term.kategorie === 'buchung') {
        return {
          kind: 'quiet-termin',
          datum: term.datum,
          id: term.id,
          term,
          variant: 'privat',
        };
      }
      if (displayStatus(term, nowIso) === 'vorgemerkt') {
        return {
          kind: 'quiet-termin',
          datum: term.datum,
          id: term.id,
          term,
          variant: 'wartet',
        };
      }
      return { kind: 'dossier', datum: term.datum, id: term.id, term };
    },
    [nowIso],
  );

  const classifyReminder = React.useCallback(
    (rem: Reminder): SpineItem => {
      const step = resolveFristStep(rem, vorgaenge);
      if (step) {
        return { kind: 'frist', datum: rem.datum, id: rem.id, rem, step };
      }
      const variant: 'automatisch' | 'vorbereitung' | 'frist' | 'erinnerung' =
        rem.autopilot_hinweis === 'automatisch'
          ? 'automatisch'
          : rem.autopilot_hinweis === 'vorbereitung'
            ? 'vorbereitung'
            : rem.kategorie === 'frist'
              ? 'frist'
              : 'erinnerung';
      return { kind: 'quiet-reminder', datum: rem.datum, id: rem.id, rem, variant };
    },
    [vorgaenge],
  );

  const spineItems = React.useMemo<SpineItem[]>(() => {
    const items = [
      ...upcomingTermine.map(classifyTermin),
      ...upcomingReminders.map(classifyReminder),
    ];
    items.sort((a, b) => {
      const cmp = a.datum.localeCompare(b.datum);
      return cmp !== 0 ? cmp : kindOrder(a) - kindOrder(b);
    });
    return items;
  }, [upcomingTermine, upcomingReminders, classifyTermin, classifyReminder]);

  const einklickFrist = spineItems.some((it) => it.kind === 'frist');

  // --------------------------------------------------------------------------
  // Thesen-Subline (§ 4) — deterministisch, ehrlich, je Persona degradiert.
  // --------------------------------------------------------------------------
  const thesis = React.useMemo(() => {
    if (upcomingTermine.length === 0 && upcomingReminders.length === 0) {
      return t('leer.text');
    }
    const kontakte14 = upcomingTermine.filter((term) => {
      const d = differenceInCalendarDays(parseISO(term.datum), now);
      return d >= 0 && d <= 14;
    });
    const behoerdengaenge14 = kontakte14.filter(
      (term) =>
        term.kategorie === 'behoerdentermin' && term.ort.typ === 'praesenz',
    );
    const parts: string[] = [];
    if (kontakte14.length === 0) {
      parts.push(t('these.keine_kontakte'));
    } else {
      parts.push(
        `${t('these.kontakte', { count: kontakte14.length })} ${t(
          'these.behoerdengaenge',
          { count: behoerdengaenge14.length },
        )}`,
      );
    }
    if (bundleVorschlag) parts.push(t('these.buendelung'));
    if (einklickFrist) parts.push(t('these.frist_einklick'));
    if (!bundleVorschlag && !einklickFrist && kontakte14.length > 0) {
      const nx = upcomingTermine[0]!;
      parts.push(
        t('these.naechster', {
          betreff: nx.betreff,
          datum: formatDateLong(nx.datum, dateLocale),
        }),
      );
    }
    return parts.join(' ');
  }, [
    upcomingTermine,
    upcomingReminders,
    now,
    bundleVorschlag,
    einklickFrist,
    dateLocale,
    t,
  ]);

  const frostTargetId = heroTermin
    ? heroTermin.id
    : (spineItems.find((it) => it.kind === 'dossier')?.id ?? null);

  // --------------------------------------------------------------------------
  // Vergangen — nur Quiet-Rows (§ 17).
  // --------------------------------------------------------------------------
  const pastItems = React.useMemo<SpineItem[]>(() => {
    const items: SpineItem[] = [
      ...pastTermine.map((term) => ({
        kind: 'quiet-termin' as const,
        datum: term.datum,
        id: term.id,
        term,
        variant: 'privat' as const, // Variante irrelevant im Vergangen-Renderer.
      })),
      ...pastReminders.map((rem) => ({
        kind: 'quiet-reminder' as const,
        datum: rem.datum,
        id: rem.id,
        rem,
        variant: 'erinnerung' as const,
      })),
    ];
    items.sort((a, b) => b.datum.localeCompare(a.datum));
    return items;
  }, [pastTermine, pastReminders]);

  // Tagesgruppen + Gap-Notes (§ 5.4).
  type DayGroup = { dayKey: string; items: SpineItem[] };
  const groupByDay = React.useCallback((items: SpineItem[]): DayGroup[] => {
    const groups: DayGroup[] = [];
    for (const it of items) {
      const key = dayKey(it.datum);
      const last = groups[groups.length - 1];
      if (last && last.dayKey === key) last.items.push(it);
      else groups.push({ dayKey: key, items: [it] });
    }
    return groups;
  }, []);

  const anstehendGroups = React.useMemo(
    () => groupByDay(spineItems),
    [spineItems, groupByDay],
  );
  const vergangenGroups = React.useMemo(
    () => groupByDay(pastItems),
    [pastItems, groupByDay],
  );

  // --------------------------------------------------------------------------
  // Operationen — optimistic, revert-on-error, sichtbarer Toast.
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
        toast.error(t('bestaetigen.toast_error'));
      } finally {
        setBusy(null);
      }
    },
    [applyTermin, t],
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
          t('reschedule.toast_template', {
            datum: formatDateLong(neuesDatumIso, dateLocale),
          }),
        );
      } catch {
        applyTermin({ ...termin, datum: prevDatum });
        toast.error(t('reschedule.toast_error'));
      } finally {
        setBusy(null);
      }
    },
    [applyTermin, dateLocale, t],
  );

  const handleWaitlist = React.useCallback(() => {
    setRescheduleTermin(null);
    toast(t('reschedule.warteliste_toast'));
  }, [t]);

  const handleAbsagenConfirm = React.useCallback(
    async (termin: Termin) => {
      const prevStatus = termin.status;
      setAbsagenTermin(null);
      setBusy(termin.id);
      applyTermin({ ...termin, status: 'abgesagt' });
      try {
        await api.sageTerminAb(termin.id);
        toast(t('absagen.toast'), {
          duration: 6000,
          action: {
            label: t('absagen.toast_undo'),
            onClick: () => {
              void (async () => {
                applyTermin({ ...termin, status: prevStatus });
                try {
                  if (prevStatus !== 'vorgeschlagen') {
                    await api.bestaetigeTerminVorschlag(termin.id);
                  }
                  toast.success(t('absagen.undo_done'));
                } catch {
                  applyTermin({ ...termin, status: 'abgesagt' });
                  toast.error(t('absagen.toast_error'));
                }
              })();
            },
          },
        });
      } catch {
        applyTermin({ ...termin, status: prevStatus });
        toast.error(t('absagen.toast_error'));
      } finally {
        setBusy(null);
      }
    },
    [applyTermin, t],
  );

  // Zusammenlegen (§ 7.3) — verschiebe → (bestaetige), optimistic revert.
  const handleMerge = React.useCallback(async () => {
    if (!bundleVorschlag) return;
    const { spaeter, neuesIso } = bundleVorschlag;
    const priorDatum = spaeter.datum;
    const priorStatus = spaeter.status;
    setBusy(spaeter.id);
    applyTermin({ ...spaeter, datum: neuesIso, status: 'bestaetigt' });
    try {
      await api.verschiebeTermin(spaeter.id, neuesIso);
      if (priorStatus === 'vorgeschlagen') {
        await api.bestaetigeTerminVorschlag(spaeter.id);
      }
      const datum = formatDateLong(neuesIso, dateLocale);
      toast.success(t('buendelung.toast_success', { datum }));
      announce(t('buendelung.aria_done', { datum }));
    } catch {
      applyTermin({ ...spaeter, datum: priorDatum, status: priorStatus });
      toast.error(t('buendelung.toast_error'));
    } finally {
      setBusy(null);
    }
  }, [bundleVorschlag, applyTermin, dateLocale, t, announce]);

  const handleGetrennt = React.useCallback(async () => {
    if (!bundleVorschlag || !activePersonaId) return;
    const id = bundleVorschlag.spaeter.id;
    try {
      await api.dismissTerminBundling(activePersonaId, id);
      setBundlingDismissed((prev) => (prev.includes(id) ? prev : [...prev, id]));
      announce(t('buendelung.aria_getrennt'));
    } catch {
      toast.error(t('buendelung.toast_error'));
    }
  }, [bundleVorschlag, activePersonaId, t, announce]);

  // Frist einreichen (§ 8) — bestehender confirm-gated Pfad, kein neuer Endpoint.
  const handleFristConfirm = React.useCallback(async () => {
    if (!fristDialog) return;
    const { reminder, step } = fristDialog;
    try {
      await api.starteVorgangSchritt(reminder.vorgang_id!, step.stepId);
    } catch (error) {
      toast.error(t('frist.toast_error'));
      throw error; // Dialog bleibt offen (Retry) — keine Mutation vorher.
    }
    // Fokus-Rückgabe (§ 8.3): der CTA wird mit der Frist-Karte demontiert → beim
    // Dialog-Schluss zieht der Handoff-Effekt (rAF-Schleife) den Fokus auf die
    // Tages-Position bzw. das Spine-Ende. Der Tages-Key wird hier vorgemerkt.
    pendingFristFocusRef.current = dayKey(reminder.datum);
    setReminders((prev) =>
      prev.map((r) => (r.id === reminder.id ? { ...r, erledigt: true } : r)),
    );
    toast.success(t('frist.toast_success'));
    announce(t('frist.aria_done'));
    // Reconcile im Hintergrund (Backend hat den Reminder erledigt gesetzt) → das
    // onConfirm resolvt sofort, der Dialog schließt und der Handoff kann laufen.
    void api
      .getReminders()
      .then(setReminders)
      .catch(() => {
        /* optimistic hält den Erfolgszustand */
      });
  }, [fristDialog, t, announce]);

  // Fokus-Rückgabe nach eID-Confirm (§ 8.3, WCAG 2.4.3) — Muster der Schritt-
  // Autopilot-Welle (VorgangDetailLoader): der Confirm-Button unmountet und
  // base-ui restauriert auf den ebenfalls demontierten Öffner (die verschwundene
  // Frist-Karte) → Fokus fiele auf <body>. Sobald der Dialog wirklich zu ist
  // (fristDialog === null), zieht eine rAF-Schleife den Fokus auf das Spine-Ziel
  // und HÄLT ihn gegen ein spätes base-ui-Restore (deshalb Schleife, nicht ein
  // einzelnes rAF). Der ESC-/Abbrechen-Pfad setzt kein pendingFristFocusRef →
  // base-uis Restore auf den CTA bleibt unangetastet (keine Regression).
  React.useEffect(() => {
    if (fristDialog !== null) return; // Dialog noch offen → warten
    const day = pendingFristFocusRef.current;
    if (!day) return; // kein Confirm anhängig (ESC-/Abbrechen-Pfad)
    let raf = 0;
    let attempts = 0;
    const step = () => {
      const active = document.activeElement as HTMLElement | null;
      const spine = spineRef.current;
      let target: HTMLElement | null = null;
      if (spine) {
        const heads = Array.from(
          spine.querySelectorAll<HTMLElement>('[data-tm-dayhead]'),
        );
        target = heads.find((h) => (h.dataset.tmDaykey ?? '') >= day) ?? null;
      }
      target = target ?? spineEndRef.current;
      const inClosingDialog = Boolean(
        active?.closest('[data-slot="dialog-content"], [role="dialog"]'),
      );
      if (target && active === target) {
        pendingFristFocusRef.current = null; // Ziel erreicht
        return;
      }
      // Nutzer hat selbst woanders hin fokussiert → nicht stehlen.
      if (active && active !== document.body && !inClosingDialog) {
        pendingFristFocusRef.current = null;
        return;
      }
      // Erst fokussieren, wenn der Dialog den Fokus freigegeben hat.
      if (target && !inClosingDialog) target.focus();
      if (attempts++ < 40) {
        raf = requestAnimationFrame(step);
      } else {
        pendingFristFocusRef.current = null;
      }
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [fristDialog]);

  const onAbsagenClick = (termin: Termin) => {
    absagenOpenerRef.current = document.activeElement as HTMLElement | null;
    setAbsagenTermin(termin);
  };

  const statusPlain = (term: Termin) =>
    tStatus(displayStatusLabelKey(displayStatus(term, nowIso)));

  // --------------------------------------------------------------------------
  // ICS-Export (persona-scoped, aktive, anstehende Termine).
  // --------------------------------------------------------------------------
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
      const end = new Date(start.getTime() + ICS_EVENT_MINUTES * 60 * 1000);
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

  // --------------------------------------------------------------------------
  // Row-Renderer.
  // --------------------------------------------------------------------------
  const ROW_GRID =
    'grid grid-cols-[60px_18px_1fr] gap-x-2.5 min-[768px]:grid-cols-[86px_22px_1fr] min-[768px]:gap-x-3';
  const ACTION_LINK =
    'inline-flex items-center rounded-md text-sm font-medium text-primary hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-50 max-[767px]:min-h-[44px]';

  function dateColumn(datum: string, dayKeyValue: string, showDate: boolean) {
    const delta = differenceInCalendarDays(parseISO(datum), now);
    const primary =
      delta === 0
        ? t('agenda.heute')
        : delta === 1
          ? t('agenda.morgen')
          : format(parseISO(datum), 'EEEEEE', { locale: dateLocale });
    const secondary = format(parseISO(datum), 'dd.MM.', { locale: dateLocale });
    return (
      <div
        className="pt-1 text-end"
        data-tm-dayhead={showDate ? '' : undefined}
        data-tm-daykey={showDate ? dayKeyValue : undefined}
        tabIndex={showDate ? -1 : undefined}
      >
        {showDate ? (
          <>
            <span className="block text-[13.5px] font-semibold text-text-primary">
              {primary}
            </span>
            <span className="block text-xs tabular-nums text-text-muted">
              {secondary}
            </span>
          </>
        ) : null}
      </div>
    );
  }

  function railCell(dotClass: string, ring: boolean, dashed: boolean) {
    return (
      <div className="relative flex justify-center">
        <span
          aria-hidden="true"
          className={
            dashed
              ? 'absolute inset-y-0 border-l border-dashed border-border'
              : 'absolute inset-y-0 w-px bg-border'
          }
        />
        <span
          aria-hidden="true"
          className={`relative mt-1.5 size-[9px] rounded-full ${dotClass} ${
            ring ? 'ring-4 ring-primary/15' : ''
          }`}
        />
      </div>
    );
  }

  function fristChip(datum: string) {
    const days = differenceInCalendarDays(parseISO(datum), now);
    return days < 0
      ? { label: t('fristen.ueberfaellig'), tone: 'red' }
      : { label: t('fristen.in_tagen', { count: days }), tone: 'amber' };
  }

  function renderDossier(term: Termin) {
    const isFrost = term.id === frostTargetId;
    const isBundleFrueher =
      bundleVorschlag !== null && bundleVorschlag.frueher.id === term.id;
    return (
      <article
        data-testid={`termine-dossier-${term.id}`}
        className={`tm-detail rounded-2xl border border-border bg-surface p-5 shadow-sm sm:p-6 ${
          isFrost ? 'tm-frost' : ''
        }`}
      >
        <TerminDetailContent
          termin={term}
          nowIso={nowIso}
          dateLocale={dateLocale}
          busy={busy === term.id}
          behoerdeName={behoerdeName}
          recentlyConfirmed={
            term.id === recentlyConfirmedId &&
            displayStatus(term, nowIso) === 'bestaetigt'
          }
          onBestaetigen={() => void handleBestaetigen(term)}
          onReschedule={() => setRescheduleTermin(term)}
          onAbsagen={() => onAbsagenClick(term)}
        />
        {isBundleFrueher ? renderBundleFooter() : null}
      </article>
    );
  }

  function renderBundleFooter() {
    if (!bundleVorschlag) return null;
    const { spaeter, neuesIso } = bundleVorschlag;
    const isMerging = busy === spaeter.id;
    const wartebereich = parseWartebereich(spaeter.ort.details);
    const frueherDatum = formatDateLong(neuesIso, dateLocale);
    const zeit = format(parseISO(neuesIso), 'HH:mm');
    return (
      <div
        className="mt-5 border-t border-border pt-4"
        data-testid="termine-buendelung"
      >
        <p className="text-sm font-semibold text-text-primary">
          {t('buendelung.lead')}
        </p>
        <p className="mt-1 text-sm leading-relaxed text-text-secondary">
          {t('buendelung.text', {
            spaeter_betreff: spaeter.betreff,
            spaeter_datum: formatDateLong(spaeter.datum, dateLocale),
            frueher_datum: frueherDatum,
            wartebereich,
          })}
        </p>
        <p className="mt-2 text-xs text-text-muted">
          {t('buendelung.fineprint', { frueher_datum: frueherDatum, zeit })}
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-3 max-[540px]:flex-col max-[540px]:items-stretch">
          <button
            type="button"
            className="btn btn-primary lg-iridescent max-[540px]:justify-center"
            disabled={isMerging}
            onClick={() => void handleMerge()}
          >
            {t('buendelung.cta_zusammenlegen')}
          </button>
          <button
            type="button"
            className={ACTION_LINK}
            disabled={isMerging}
            onClick={() => void handleGetrennt()}
          >
            {t('buendelung.cta_getrennt')}
          </button>
        </div>
      </div>
    );
  }

  function renderFrist(rem: Reminder, step: FristStep) {
    const chip = fristChip(rem.datum);
    const days = Math.max(0, differenceInCalendarDays(parseISO(rem.datum), now));
    return (
      <article
        data-testid={`termine-frist-${rem.id}`}
        className="tm-frist rounded-2xl border border-border bg-surface p-5 shadow-sm"
      >
        <div className="flex flex-wrap items-start justify-between gap-2">
          <h2 className="text-base font-semibold tracking-tight text-text-primary sm:text-lg">
            {rem.titel}
          </h2>
          <span className={`badge ${chip.tone}`}>{chip.label}</span>
        </div>
        <p className="mt-2 text-sm leading-relaxed text-text-secondary">
          {t('frist.lead', {
            tage: days,
            behoerde: behoerdeName(step.behoerdeId),
            kategorien: step.datenkategorien.join(', '),
          })}
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-3 max-[540px]:flex-col max-[540px]:items-stretch">
          <button
            type="button"
            className="btn btn-primary lg-iridescent max-[540px]:justify-center"
            onClick={() => setFristDialog({ reminder: rem, step })}
          >
            {t('frist.cta_pruefen_einreichen')}
          </button>
          <Link href={`/vorgaenge/${rem.vorgang_id}`} className={ACTION_LINK}>
            {t('frist.zum_vorgang')}
          </Link>
        </div>
      </article>
    );
  }

  function renderQuietTermin(
    term: Termin,
    variant: 'privat' | 'wartet',
  ) {
    if (variant === 'privat') {
      return (
        <div>
          <p className="font-medium text-text-primary">{term.betreff}</p>
          <p className="mt-0.5 text-sm text-text-secondary">
            <span className="font-medium">{t('meta.privat')}</span>{' '}
            {t('quiet.privat_note', { ort: term.ort.details })}
          </p>
        </div>
      );
    }
    const isBundleSpaeter =
      bundleVorschlag !== null && bundleVorschlag.spaeter.id === term.id;
    return (
      <div>
        <div className="flex flex-wrap items-start justify-between gap-2">
          <p className="font-medium text-text-primary">
            {behoerdeName(term.behoerde_id)} — {term.betreff}
          </p>
          <span className="badge amber">{t('meta.wartet_bestaetigung')}</span>
        </div>
        {isBundleSpaeter ? (
          <p className="mt-0.5 text-sm text-text-secondary">
            {t('quiet.wartet_note', { behoerde: behoerdeName(term.behoerde_id) })}
          </p>
        ) : null}
        <button
          type="button"
          className={`mt-1.5 ${ACTION_LINK}`}
          disabled={busy === term.id}
          onClick={() => void handleBestaetigen(term)}
        >
          {t('action.bestaetigen')}
        </button>
      </div>
    );
  }

  function renderQuietReminder(
    rem: Reminder,
    variant: 'automatisch' | 'vorbereitung' | 'frist' | 'erinnerung',
  ) {
    const behoerde = rem.behoerde_id ? behoerdeName(rem.behoerde_id) : null;
    if (variant === 'automatisch') {
      return (
        <div>
          <p className="font-medium text-text-muted">{rem.titel}</p>
          <p className="mt-0.5 text-sm text-text-secondary">
            <span className="font-medium">{t('meta.laeuft_ohne_sie')}</span>{' '}
            {t('quiet.laeuft_ohne_sie_note', { behoerde: behoerde ?? '' })}
          </p>
        </div>
      );
    }
    if (variant === 'vorbereitung') {
      return (
        <div>
          <p className="font-medium text-text-primary">{rem.titel}</p>
          <p className="mt-0.5 text-sm text-text-secondary">
            <span className="font-medium">{t('meta.vorbereitung_auto')}</span>{' '}
            {t('quiet.vorbereitung_note')}
          </p>
        </div>
      );
    }
    if (variant === 'frist') {
      const chip = fristChip(rem.datum);
      return (
        <div>
          <div className="flex flex-wrap items-start justify-between gap-2">
            <p className="font-medium text-text-primary">{rem.titel}</p>
            <span className={`badge ${chip.tone}`}>{chip.label}</span>
          </div>
          {behoerde ? (
            <p className="mt-0.5 text-sm text-text-secondary">{behoerde}</p>
          ) : null}
        </div>
      );
    }
    return (
      <div>
        <p className="font-medium text-text-primary">{rem.titel}</p>
        {behoerde ? (
          <p className="mt-0.5 text-sm text-text-secondary">{behoerde}</p>
        ) : null}
      </div>
    );
  }

  function renderPast(item: SpineItem) {
    if (item.kind === 'quiet-termin') {
      return (
        <div>
          <div className="flex flex-wrap items-start justify-between gap-2">
            <p className="font-medium text-text-secondary">
              {behoerdeName(item.term.behoerde_id)} — {item.term.betreff}
            </p>
            <span className="text-sm text-text-muted">
              {statusPlain(item.term)}
            </span>
          </div>
          <p className="mt-0.5 text-sm tabular-nums text-text-muted">
            {formatDateLong(item.term.datum, dateLocale)}
          </p>
        </div>
      );
    }
    const rem = (item as Extract<SpineItem, { kind: 'quiet-reminder' }>).rem;
    const behoerde = rem.behoerde_id ? behoerdeName(rem.behoerde_id) : null;
    return (
      <div>
        <p className="font-medium text-text-secondary">{rem.titel}</p>
        <p className="mt-0.5 text-sm tabular-nums text-text-muted">
          {formatDateLong(rem.datum, dateLocale)}
          {behoerde ? ` · ${behoerde}` : ''}
        </p>
      </div>
    );
  }

  function renderItemContent(item: SpineItem, past: boolean) {
    if (past) return renderPast(item);
    if (item.kind === 'dossier') return renderDossier(item.term);
    if (item.kind === 'frist') return renderFrist(item.rem, item.step);
    if (item.kind === 'quiet-termin')
      return renderQuietTermin(item.term, item.variant);
    return renderQuietReminder(item.rem, item.variant);
  }

  function dotFor(item: SpineItem): string {
    if (item.kind === 'dossier') return 'bg-primary';
    if (item.kind === 'frist') return 'bg-amber-400 dark:bg-amber-500';
    if (item.kind === 'quiet-reminder' && item.variant === 'frist')
      return 'bg-amber-400 dark:bg-amber-500';
    return 'border-2 border-border bg-surface';
  }

  // --------------------------------------------------------------------------
  // Render — phases.
  // --------------------------------------------------------------------------
  if (phase === 'error') {
    return (
      <div>
        <div className="gt-page-head">
          <h1>{t('title')}</h1>
        </div>
        <EmptyState
          icon={<Info aria-hidden="true" />}
          title={t('error')}
          action={
            <Button onClick={() => void load()}>
              <RefreshCw aria-hidden="true" />
              {t('retry')}
            </Button>
          }
        />
      </div>
    );
  }

  if (phase === 'loading') {
    return (
      <div role="status" aria-busy="true">
        <span className="sr-only">{tRoot('common.loading')}</span>
        <div className="gt-page-head">
          <Skeleton shape="text" className="h-8 w-48" />
          <Skeleton shape="text" className="mt-2 w-80" />
        </div>
        <div className="mt-6 flex flex-col gap-4">
          <Skeleton className="h-40 rounded-2xl" />
          <Skeleton className="h-28 rounded-2xl" />
          <Skeleton className="h-24 rounded-2xl" />
        </div>
      </div>
    );
  }

  const groups = view === 'anstehend' ? anstehendGroups : vergangenGroups;
  let globalIndex = 0;
  // Wiederholungs-Diät (§ 5.4): nur der erste Gap trägt den Satz; weitere Gaps
  // rendern als textlose gestrichelte Rail-Sektion (aria-hidden) — die sichtbare
  // Lücke trägt die Info, vier identische Sätze wären selbst ein Slop-Marker.
  let gapTextShown = false;

  return (
    <div>
      <p className="sr-only" aria-live="polite">
        {liveMsg}
      </p>

      {/* Zone 0 — Kopf + Thesen-Subline. */}
      <div className="gt-page-head">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <h1>{t('title')}</h1>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleIcsExport}
          >
            <CalendarDays aria-hidden="true" />
            {t('toolbar.export')}
          </button>
        </div>
        <p className="sub" data-testid="termine-thesis">
          {thesis}
        </p>
      </div>

      {/* Zone 1 — Ansichts-Umschalter. */}
      <nav
        aria-label={t('ansicht.aria')}
        className="mb-6 flex gap-4 border-b border-border"
      >
        {(['anstehend', 'vergangen'] as const).map((mode) => (
          <button
            key={mode}
            type="button"
            className={`relative -mb-px border-b-2 px-1 pb-2.5 pt-1 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary max-[767px]:min-h-[44px] ${
              view === mode
                ? 'border-primary text-text-primary'
                : 'border-transparent text-text-secondary hover:text-text-primary'
            }`}
            aria-current={view === mode ? 'true' : undefined}
            onClick={() => setView(mode)}
          >
            {t(`ansicht.${mode}`)}
          </button>
        ))}
      </nav>

      {/* Zone 2 — Zeitstrahl. */}
      <div className="tm-spine" data-testid="termine-spine" ref={spineRef}>
        {groups.map((group, groupIdx) => {
          const prevGroup = groups[groupIdx - 1];
          const gapNode =
            view === 'anstehend' && prevGroup
              ? (() => {
                  const wochen = Math.round(
                    differenceInCalendarDays(
                      parseISO(group.items[0]!.datum),
                      parseISO(
                        prevGroup.items[prevGroup.items.length - 1]!.datum,
                      ),
                    ) / 7,
                  );
                  const diff = differenceInCalendarDays(
                    parseISO(group.items[0]!.datum),
                    parseISO(prevGroup.items[prevGroup.items.length - 1]!.datum),
                  );
                  return diff >= GAP_TAGE ? wochen : null;
                })()
              : null;

          return (
            <React.Fragment key={group.dayKey}>
              {gapNode !== null
                ? (() => {
                    const showText = !gapTextShown;
                    gapTextShown = true;
                    return (
                      <div
                        className={ROW_GRID}
                        aria-hidden={showText ? undefined : 'true'}
                      >
                        <div />
                        {railCell('bg-transparent', false, true)}
                        {showText ? (
                          <p className="pb-6 text-sm text-text-muted">
                            {t('gap_ruhig', { wochen: gapNode })}
                          </p>
                        ) : (
                          <div className="h-7" />
                        )}
                      </div>
                    );
                  })()
                : null}
              <section aria-label={formatDateLong(group.items[0]!.datum, dateLocale)}>
                {group.items.map((item, itemIdx) => {
                  const isFirstOverall = view === 'anstehend' && globalIndex === 0;
                  globalIndex += 1;
                  return (
                    <div key={item.id} className={ROW_GRID}>
                      {dateColumn(item.datum, group.dayKey, itemIdx === 0)}
                      {railCell(
                        dotFor(item),
                        isFirstOverall && item.kind === 'dossier',
                        false,
                      )}
                      <div className="min-w-0 pb-6">
                        {renderItemContent(item, view === 'vergangen')}
                      </div>
                    </div>
                  );
                })}
              </section>
            </React.Fragment>
          );
        })}

        {/* Spine-Ende (nur Anstehend). */}
        {view === 'anstehend' ? (
          <div className={ROW_GRID}>
            <div />
            <div className="relative flex justify-center">
              <span
                aria-hidden="true"
                className="absolute top-0 h-1/2 w-px bg-border"
              />
              <span
                aria-hidden="true"
                className="relative top-1/2 mt-0 size-[9px] -translate-y-1/2 rounded-full border-2 border-border bg-surface"
              />
            </div>
            <div className="min-w-0 pb-2" ref={spineEndRef} tabIndex={-1}>
              <p className="text-sm text-text-secondary">{t('spine_end')}</p>
              {pastItems.length > 0 ? (
                <button
                  type="button"
                  className="mt-1 inline-flex items-center gap-1 rounded-md text-sm font-medium text-primary hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                  onClick={() => setView('vergangen')}
                >
                  {t('rail.vergangen_link')}
                  <ChevronRight
                    aria-hidden="true"
                    className="size-4 rtl:-scale-x-100"
                  />
                </button>
              ) : null}
            </div>
          </div>
        ) : groups.length === 0 ? (
          <p className="py-6 text-sm text-text-secondary">{t('leer.text')}</p>
        ) : null}
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

      <VorgangSchrittAuthDialog
        open={fristDialog !== null}
        onOpenChange={(open) => {
          if (!open) setFristDialog(null);
        }}
        mode="eid"
        behoerdeName={fristDialog ? behoerdeName(fristDialog.step.behoerdeId) : ''}
        datenkategorien={fristDialog?.step.datenkategorien ?? []}
        onConfirm={handleFristConfirm}
      />
    </div>
  );
}
