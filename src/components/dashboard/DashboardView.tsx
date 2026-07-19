'use client';

import * as React from 'react';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { ArrowRight, Check, Clock3 } from 'lucide-react';
import { toast } from 'sonner';

import { AnspruchLane } from '@/components/dashboard/AnspruchLane';
import {
  AufenthaltFristNudge,
  resolveAufenthaltFristNudge,
} from '@/components/dashboard/AufenthaltFristNudge';
import { WohngeldHinweisCard } from '@/components/dashboard/WohngeldHinweisCard';
import { Skeleton } from '@/components/shared/Skeleton';
import { resolveBehoerdeName } from '@/lib/behoerde-name';
import { api } from '@/lib/mock-backend';
import { cn } from '@/lib/utils';
import type { AutopilotKatalogEntry, DashboardSnapshot, Persona } from '@/types';
import type { TopActionItem } from '@/types/dashboard';

interface DashboardViewProps {
  nowIso: string;
}

const DEMO_PRIOR_LOGIN_DAYS = 23;

/** Frist-Nähe-Schwelle: bis so viele Tage vor Ablauf färbt der Slot amber. */
const FRIST_NAH_TAGE = 7;

/**
 * Offene Mitwirkungs-Punkte des Aufenthalts-Nudges. Entspricht den drei
 * „Was noch von Ihnen kommt"-Zeilen, die `<AufenthaltFristNudge>` beim
 * Aufklappen zeigt — der Slot-Zähler bleibt damit gegen den Inhalt prüfbar.
 */
const AUFENTHALT_OFFENE_PUNKTE = 3;

/**
 * `<DashboardView>` — „Ein Blick, eine Antwort" (Spec `dashboard-redesign.md`).
 * Eine redaktionelle „Heute"-Liste (Top-Actions, nächster Termin, Wohngeld- und
 * Aufenthalts-Hinweise als Disclosure-Zeilen), EIN Glas-Anker (Umzug-Panel), die
 * „Ihnen steht zu"-Lane sowie eine schlanke Rail (Kennzahlen, Autopilot-Katalog,
 * Kontrolle-Fußzeile). Daten via `api.getProfile()` + `api.getDashboard()`;
 * Behörden-Namen synchron via `resolveBehoerdeName`, Katalog parallel geladen.
 */
export function DashboardView({ nowIso }: DashboardViewProps) {
  const t = useTranslations('dashboard');
  const tCommon = useTranslations('common');
  const tTermin = useTranslations('dashboard.naechster_termin');
  const tKatalog = useTranslations('katalog');
  const tWohngeld = useTranslations('wohngeldHinweis');
  const locale = useLocale();

  const [snapshot, setSnapshot] = React.useState<DashboardSnapshot | null>(null);
  const [persona, setPersona] = React.useState<Persona | null>(null);
  const [katalog, setKatalog] = React.useState<AutopilotKatalogEntry[]>([]);
  const [dismissed, setDismissed] = React.useState<Set<string>>(() => new Set());
  const [wohngeldHidden, setWohngeldHidden] = React.useState(false);
  const [aufenthaltHidden, setAufenthaltHidden] = React.useState(false);
  const [wohngeldOpen, setWohngeldOpen] = React.useState(false);
  const [aufenthaltOpen, setAufenthaltOpen] = React.useState(false);
  const wohngeldPanelId = React.useId();
  const aufenthaltPanelId = React.useId();
  const [error, setError] = React.useState<string | null>(null);
  const lastSeenWrittenRef = React.useRef(false);

  const reload = React.useCallback(async () => {
    const p = await api.getProfile();
    const priorLogin = new Date(
      new Date(nowIso).getTime() - DEMO_PRIOR_LOGIN_DAYS * 24 * 60 * 60 * 1000,
    ).toISOString();
    // Aufenthalt-Frist-Nudge-Suppression (dismiss/snooze) parallel mitziehen —
    // der Nudge selbst wird komponentenlokal aus der Persona abgeleitet.
    const [snap, aufenthaltSuppressed] = await Promise.all([
      api.getDashboard(p.id, { last_seen_at: priorLogin }),
      api.isAufenthaltFristNudgeSuppressed(p.id).catch(() => false),
    ]);
    setPersona(p);
    setSnapshot(snap);
    setAufenthaltHidden(aufenthaltSuppressed);
    return p;
  }, [nowIso]);

  React.useEffect(() => {
    let cancelled = false;
    // Autopilot-Katalog parallel zum Profil/Dashboard laden (persona-unabhängig)
    // — flacht den Fetch-Wasserfall ab. Behörden-Namen kommen synchron aus
    // `resolveBehoerdeName` (behoerden.json), daher kein getBehoerden-Roundtrip.
    const katalogPromise = api
      .getAutopilotKatalog()
      .catch(() => [] as AutopilotKatalogEntry[]);
    (async () => {
      try {
        const p = await reload();
        if (cancelled) return;
        if (!lastSeenWrittenRef.current) {
          lastSeenWrittenRef.current = true;
          await api.setLastSeen(p.id, nowIso);
        }
        const cat = await katalogPromise;
        if (!cancelled) setKatalog(cat);
      } catch {
        if (!cancelled) setError(t('fehler.laden'));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [nowIso, reload, t]);

  const anrede = greetingAnrede(snapshot, persona);
  const highlight = snapshot?.autopilot_highlight;
  const receipt = highlight?.value_receipt;
  const umzugDone = receipt ? receipt.behoerden_count : 0;
  const umzugTotal = receipt ? Math.max(umzugDone, receipt.klassische_schritte) : 0;
  const umzugComplete = umzugTotal > 0 && umzugDone >= umzugTotal;
  const umzugFristDate = nextUmzugFristDate(snapshot, nowIso);
  const umzugOrt = persona?.adresse?.ort ?? '';
  const erledigtLatest = snapshot?.erledigt_feed?.[0];

  const terminTile = snapshot?.termin_tile;

  const visibleTodos = sortByRank(
    (snapshot?.top_actions ?? []).filter((a) => !dismissed.has(a.id)),
  ).slice(0, 3);

  const wohngeldHinweis = snapshot?.wohngeld_hinweis ?? null;
  const showWohngeld = wohngeldHinweis !== null && !wohngeldHidden;

  const anspruchLane = snapshot?.anspruch_lane ?? [];

  // Antizipations-Nudge (wow-#10): proaktive Fristbewachung — rein aus der
  // Persona abgeleitet, kein Snapshot-Feld.
  const aufenthaltFrist = persona
    ? resolveAufenthaltFristNudge(persona, nowIso)
    : null;
  const showAufenthalt = aufenthaltFrist !== null && !aufenthaltHidden;

  const fristCount = snapshot?.frist_count_14d ?? 0;
  const tldrDatum = earliestFristDatum(snapshot?.top_actions ?? [], nowIso, locale);

  const heuteEmpty =
    visibleTodos.length === 0 && !terminTile && !showWohngeld && !showAufenthalt;

  // Autopilot-Katalog-Teaser in der Rail: nur die noch nicht live geschalteten
  // Lebenslagen (Umzug ist bereits das Hero-Panel). Quelle: Katalog-Daten.
  const autopilotEntries = katalog.filter((e) => e.status !== 'live');

  async function handleDone(reminderId: string) {
    setDismissed((prev) => new Set(prev).add(reminderId));
    try {
      await api.markReminderDone(reminderId);
      await reload();
    } catch {
      /* optimistic dismiss already applied */
    }
  }

  async function handleSnooze(reminderId: string) {
    setDismissed((prev) => new Set(prev).add(reminderId));
    try {
      await api.snoozeReminder(reminderId, 7);
      await reload();
    } catch {
      /* optimistic dismiss already applied */
    }
  }

  async function handleWohngeldDismiss() {
    if (!persona) return;
    setWohngeldHidden(true);
    try {
      await api.dismissWohngeldHinweis(persona.id);
      await reload();
    } catch {
      /* optimistic hide already applied */
    }
  }

  async function handleWohngeldSnooze() {
    if (!persona) return;
    setWohngeldHidden(true);
    try {
      await api.snoozeWohngeldHinweis(persona.id, 30);
      await reload();
    } catch {
      /* optimistic hide already applied */
    }
  }

  async function handleWohngeldRevokeConsent() {
    if (!persona) return;
    setWohngeldHidden(true);
    try {
      await api.setWohngeldHinweisConsent(persona.id, false);
      await reload();
    } catch {
      /* optimistic hide already applied */
    }
    toast(tWohngeld('consent_revoked_toast'));
  }

  async function handleAufenthaltDismiss() {
    if (!persona) return;
    setAufenthaltHidden(true);
    try {
      await api.dismissAufenthaltFristNudge(persona.id);
      await reload();
    } catch {
      /* optimistic hide already applied */
    }
  }

  async function handleAufenthaltSnooze() {
    if (!persona) return;
    setAufenthaltHidden(true);
    try {
      await api.snoozeAufenthaltFristNudge(persona.id, 30);
      await reload();
    } catch {
      /* optimistic hide already applied */
    }
  }

  const kennzahlen = [
    {
      href: '/posteingang',
      num: snapshot?.posteingang_tile.ungelesen ?? 0,
      label: t('kennzahl.posteingang'),
    },
    {
      href: '/vorgaenge',
      num: snapshot?.vorgangs_stand_tile.length ?? 0,
      label: t('kennzahl.vorgaenge'),
    },
    {
      href: '/posteingang',
      num: fristCount,
      label: t('kennzahl.fristen'),
    },
  ];

  if (snapshot === null && error === null) {
    return (
      <>
        <div className="gt-page-head dash-head">
          <h1 className="dash-greeting">{t('greeting.guten_tag', { name: anrede })}</h1>
          <Skeleton className="mt-2 h-4 w-80 max-w-full" />
        </div>
        <DashboardSkeleton label={tCommon('loading')} />
      </>
    );
  }

  const strong = (chunks: React.ReactNode) => (
    <strong className="font-semibold text-text-primary">{chunks}</strong>
  );
  // Der „{done} von {total} Stellen"-Chunk darf nicht mitten in der Phrase
  // umbrechen (Review-Nit a) — eigener nowrap-Strong nur für die TL;DR-Umzug-Zeile.
  const strongNoWrap = (chunks: React.ReactNode) => (
    <strong className="whitespace-nowrap font-semibold text-text-primary">{chunks}</strong>
  );
  const dueTag = (chunks: React.ReactNode) => (
    <span className="font-semibold text-amber-700 dark:text-amber-400">{chunks}</span>
  );

  const fristenNode =
    fristCount === 0
      ? t('tldr.keine_fristen')
      : tldrDatum
        ? t.rich('tldr.fristen', { count: fristCount, datum: tldrDatum, b: strong })
        : t.rich('tldr.fristen_ohne_datum', { count: fristCount, b: strong });
  const umzugNode = highlight
    ? t.rich('tldr.umzug', { done: umzugDone, total: umzugTotal, b: strongNoWrap })
    : null;

  const ersparnis = receipt
    ? receipt.geschaetzte_zeitersparnis_min >= 120
      ? t('umzug_panel.ersparnis_std', {
          hours: Math.round(receipt.geschaetzte_zeitersparnis_min / 60),
        })
      : t('umzug_panel.ersparnis_min', { min: receipt.geschaetzte_zeitersparnis_min })
    : '';

  return (
    <>
      <div className="gt-page-head dash-head">
        <h1 className="dash-greeting">{t('greeting.guten_tag', { name: anrede })}</h1>
        <p className="dash-greeting-sub md:max-w-[76ch]!">
          {fristenNode}
          {umzugNode ? (
            <>
              {' · '}
              {umzugNode}
            </>
          ) : null}
        </p>
      </div>

      <div className="dash-layout">
        <div className="dash-col">
          {/* ── „Heute" — eine redaktionelle Liste (boxless, Hairlines) ─────── */}
          <section aria-labelledby="dashboard-heute">
            <div className="mb-1 flex items-baseline justify-between gap-3">
              <h2
                id="dashboard-heute"
                className="text-[17px] font-semibold tracking-tight text-text-primary"
              >
                {t('heute.titel')}
              </h2>
              <Link
                href="/posteingang"
                className="shrink-0 text-[13px] text-text-muted no-underline transition-colors hover:text-text-secondary"
              >
                {t('heute.alle_anzeigen')}
              </Link>
            </div>

            {heuteEmpty ? (
              <div className="flex flex-col items-start gap-1 border-t border-border py-8">
                <span
                  className="mb-1 grid size-9 place-items-center rounded-full bg-surface-muted text-primary [&>svg]:size-4"
                  aria-hidden="true"
                >
                  <Check />
                </span>
                <div className="font-semibold text-text-primary">
                  {t('heute.empty_title')}
                </div>
                <div className="text-sm text-text-muted">{t('heute.empty_body')}</div>
                <div className="mt-1 text-sm text-text-secondary">
                  {t('achievement.jahr', {
                    count: snapshot?.vorgaenge_abgeschlossen_jahr ?? 0,
                  })}
                </div>
              </div>
            ) : (
              <ol className="border-t border-border">
                {visibleTodos.map((item) => {
                  const view = mapToHeuteItem(item);
                  const behoerde = resolveBehoerdeName(view.behoerdeId);
                  const reason = reasonSubline(view.reasonToken, t);
                  // Die generische „Frist rückt näher"-Begründung ist redundant,
                  // sobald die Fällig-Datum-Zeile ohnehin sichtbar ist.
                  const showReason =
                    reason.length > 0 &&
                    !(view.reasonToken === 'frist_naehe' && Boolean(view.fristDatum));
                  const sub = [behoerde, showReason ? reason : null]
                    .filter(Boolean)
                    .join(' · ');
                  const near = view.fristIso
                    ? daysUntil(view.fristIso, nowIso) <= FRIST_NAH_TAGE
                    : false;
                  return (
                    <li
                      key={view.id}
                      className="group relative border-b border-border last:border-b-0"
                    >
                      <Link
                        href={view.href}
                        className="grid grid-cols-[76px_minmax(0,1fr)] items-baseline gap-3 rounded-md py-3 pl-1 pr-12 no-underline transition-colors hover:bg-surface-muted/50 sm:grid-cols-[92px_minmax(0,1fr)] sm:pr-24"
                      >
                        <span
                          className={cn(
                            'whitespace-nowrap text-[12.5px] tabular-nums',
                            near
                              ? 'font-semibold text-amber-700 dark:text-amber-400'
                              : 'text-text-muted',
                          )}
                        >
                          {view.fristDatum
                            ? t('heute.slot_bis', { datum: shortDMY(view.fristDatum) })
                            : ''}
                        </span>
                        <span className="min-w-0">
                          <span className="block font-semibold leading-snug text-text-primary">
                            {view.titel}
                          </span>
                          {sub ? (
                            <span className="mt-0.5 block truncate text-[13px] leading-snug text-text-muted">
                              {sub}
                            </span>
                          ) : null}
                        </span>
                      </Link>
                      <div
                        className="pointer-events-none absolute right-2 top-1/2 flex -translate-y-1/2 gap-1 rounded-lg bg-surface-muted p-0.5 opacity-0 transition-opacity group-hover:pointer-events-auto group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:opacity-100 [&_button:focus-visible]:opacity-100"
                        role="group"
                        aria-label={t('heute.actions_label', { titel: view.titel })}
                      >
                        <button
                          type="button"
                          aria-label={t('heute.done')}
                          title={t('heute.done')}
                          onClick={() => handleDone(view.sourceId)}
                          className="grid size-9 place-items-center rounded-md border border-border bg-surface text-text-secondary transition-colors hover:bg-surface-muted hover:text-text-primary [&>svg]:size-4"
                        >
                          <Check />
                        </button>
                        <button
                          type="button"
                          aria-label={t('heute.snooze')}
                          title={t('heute.snooze')}
                          onClick={() => handleSnooze(view.sourceId)}
                          className="grid size-9 place-items-center rounded-md border border-border bg-surface text-text-secondary transition-colors hover:bg-surface-muted hover:text-text-primary [&>svg]:size-4"
                        >
                          <Clock3 />
                        </button>
                      </div>
                    </li>
                  );
                })}

                {terminTile ? (
                  <li className="border-b border-border last:border-b-0">
                    <Link
                      href="/termine"
                      className="grid grid-cols-[76px_minmax(0,1fr)] items-baseline gap-3 rounded-md py-3 pl-1 pr-3 no-underline transition-colors hover:bg-surface-muted/50 sm:grid-cols-[92px_minmax(0,1fr)]"
                    >
                      <span className="whitespace-nowrap text-[12.5px] tabular-nums text-text-muted">
                        {formatTerminSlot(terminTile.datum_iso, locale)}
                      </span>
                      <span className="min-w-0">
                        <span className="block font-semibold leading-snug text-text-primary">
                          {terminTile.betreff}
                        </span>
                        <span className="mt-0.5 block truncate text-[13px] leading-snug text-text-muted">
                          {resolveBehoerdeName(terminTile.behoerde_id)}
                          {' · '}
                          {terminTile.ort_typ === 'video'
                            ? t('heute.termin_video_hinweis')
                            : tTermin(terminTile.ort_typ)}
                        </span>
                      </span>
                    </Link>
                  </li>
                ) : null}

                {showWohngeld && wohngeldHinweis ? (
                  <li className="border-b border-border last:border-b-0">
                    <button
                      type="button"
                      aria-expanded={wohngeldOpen}
                      aria-controls={wohngeldOpen ? wohngeldPanelId : undefined}
                      onClick={() => setWohngeldOpen((o) => !o)}
                      className="grid w-full grid-cols-[76px_minmax(0,1fr)] items-baseline gap-3 rounded-md py-3 pl-1 pr-3 text-left transition-colors hover:bg-surface-muted/50 sm:grid-cols-[92px_minmax(0,1fr)]"
                    >
                      <span className="whitespace-nowrap text-[12.5px] text-text-muted">
                        {t('heute.slot_hinweis')}
                      </span>
                      <span className="min-w-0">
                        <span className="block font-semibold leading-snug text-text-primary">
                          {wohngeldHinweis.variant === 'risiko'
                            ? t('heute.slot_wohngeld_titel_risiko')
                            : t('heute.slot_wohngeld_titel', {
                                min: wohngeldHinweis.geschaetzt_min_eur,
                                max: wohngeldHinweis.geschaetzt_max_eur,
                              })}
                        </span>
                        <span className="mt-0.5 block text-[13px] leading-snug text-text-muted">
                          {t('heute.slot_wohngeld_sub')}
                        </span>
                      </span>
                    </button>
                    {wohngeldOpen ? (
                      <div id={wohngeldPanelId} className="pb-4 pt-1">
                        <WohngeldHinweisCard
                          estimate={wohngeldHinweis}
                          ort={persona?.adresse?.ort ?? ''}
                          onDismiss={handleWohngeldDismiss}
                          onSnooze={handleWohngeldSnooze}
                          onRevokeConsent={handleWohngeldRevokeConsent}
                          onRequestCollapse={() => setWohngeldOpen(false)}
                        />
                      </div>
                    ) : null}
                  </li>
                ) : null}

                {showAufenthalt && aufenthaltFrist ? (
                  <li className="border-b border-border last:border-b-0">
                    <button
                      type="button"
                      aria-expanded={aufenthaltOpen}
                      aria-controls={aufenthaltOpen ? aufenthaltPanelId : undefined}
                      onClick={() => setAufenthaltOpen((o) => !o)}
                      className="grid w-full grid-cols-[76px_minmax(0,1fr)] items-baseline gap-3 rounded-md py-3 pl-1 pr-3 text-left transition-colors hover:bg-surface-muted/50 sm:grid-cols-[92px_minmax(0,1fr)]"
                    >
                      <span className="whitespace-nowrap text-[12.5px] text-text-muted">
                        {t('heute.slot_hinweis')}
                      </span>
                      <span className="min-w-0">
                        <span className="block font-semibold leading-snug text-text-primary">
                          {t('heute.slot_aufenthalt_titel', {
                            monat: formatMonthYear(aufenthaltFrist.validUntilIso, locale),
                          })}
                        </span>
                        <span className="mt-0.5 block text-[13px] leading-snug text-text-muted">
                          {t('heute.slot_aufenthalt_sub', {
                            count: AUFENTHALT_OFFENE_PUNKTE,
                            behoerde: aufenthaltFrist.abhBehoerdeId
                              ? resolveBehoerdeName(aufenthaltFrist.abhBehoerdeId)
                              : '',
                          })}
                        </span>
                      </span>
                    </button>
                    {aufenthaltOpen ? (
                      <div id={aufenthaltPanelId} className="pb-4 pt-1">
                        <AufenthaltFristNudge
                          view={aufenthaltFrist}
                          behoerdeName={
                            aufenthaltFrist.abhBehoerdeId
                              ? resolveBehoerdeName(aufenthaltFrist.abhBehoerdeId)
                              : undefined
                          }
                          onDismiss={handleAufenthaltDismiss}
                          onSnooze={handleAufenthaltSnooze}
                        />
                      </div>
                    ) : null}
                  </li>
                ) : null}
              </ol>
            )}
          </section>

          {/* ── Umzug-Panel — der EINE Glas-Anker ────────────────────────────── */}
          {highlight ? (
            <section
              aria-labelledby="dash-umzug-title"
              className="dash-umzug-panel rounded-2xl border border-border bg-card p-6 shadow-sm"
            >
              <div className="flex items-baseline justify-between gap-3">
                <h2
                  id="dash-umzug-title"
                  className="text-[17px] font-semibold text-text-primary"
                >
                  {t('umzug_panel.titel', { ort: umzugOrt })}
                </h2>
                <span
                  className={cn(
                    'shrink-0 text-[13px] font-semibold',
                    umzugComplete ? 'text-text-secondary' : 'text-primary',
                  )}
                >
                  {umzugComplete
                    ? t('umzug_panel.state_fertig')
                    : t('umzug_panel.state_laeuft')}
                </span>
              </div>

              <p className="mt-3 font-heading text-2xl font-bold tracking-tight text-text-primary">
                {t('umzug_panel.stellen', { done: umzugDone, total: umzugTotal })}
              </p>

              <div
                className="mt-3 flex gap-1.5"
                role="img"
                aria-label={t('umzug_panel.segbar_aria', {
                  done: umzugDone,
                  total: umzugTotal,
                })}
              >
                {Array.from({ length: umzugTotal }).map((_, i) => (
                  <span
                    key={i}
                    className={cn(
                      'h-1.5 flex-1 rounded-full',
                      i < umzugDone
                        ? 'bg-primary'
                        : 'border-[1.5px] border-amber-600 dark:border-amber-400',
                    )}
                  />
                ))}
              </div>

              {!umzugComplete ? (
                <p className="mt-4 text-sm leading-relaxed text-text-secondary">
                  {umzugFristDate
                    ? t.rich('umzug_panel.naechster', {
                        schritt: t('umzug_panel.schritt_default'),
                        datum: formatLongDate(umzugFristDate, locale),
                        b: strong,
                        due: dueTag,
                      })
                    : t.rich('umzug_panel.naechster_ohne_frist', {
                        schritt: t('umzug_panel.schritt_default'),
                        b: strong,
                      })}
                </p>
              ) : null}

              <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2">
                {!umzugComplete ? (
                  <Link
                    href={`/vorgaenge/umzug/${highlight.vorgang_id}`}
                    className="btn btn-primary"
                  >
                    {t('umzug_panel.cta_pruefen')}
                  </Link>
                ) : null}
                <Link
                  href={`/vorgaenge/umzug/${highlight.vorgang_id}`}
                  className="text-[13.5px] text-text-secondary underline decoration-border underline-offset-[3px] transition-colors hover:text-text-primary"
                >
                  {t('umzug_panel.alle_schritte')}
                </Link>
              </div>

              {receipt ? (
                <p className="mt-4 border-t border-border pt-3 text-[12.5px] leading-relaxed text-text-muted">
                  {erledigtLatest
                    ? t('umzug_panel.meta', {
                        aktion: erledigtLatest.agent_label,
                        zeit: formatRelative(erledigtLatest.erledigt_at, nowIso, locale),
                        ersparnis,
                      })
                    : t('umzug_panel.meta_ohne_eintrag', { ersparnis })}
                </p>
              ) : null}
            </section>
          ) : null}

          {/* ── „Ihnen steht zu"-Lane (boxless Sektion, interne Logik unverändert) */}
          {anspruchLane.length > 0 && persona ? (
            <AnspruchLane
              entries={anspruchLane}
              personaId={persona.id}
              onReload={reload}
            />
          ) : null}
        </div>

        {/* ── Rail ───────────────────────────────────────────────────────────── */}
        <div className="dash-col">
          <ul data-testid="dash-kennzahl-list" className="border-t border-border">
            {kennzahlen.map(({ href, num, label }) => (
              <li key={label} className="border-b border-border">
                <Link
                  href={href}
                  className="flex items-baseline gap-3 rounded-md px-1 py-[13px] no-underline transition-colors hover:bg-surface-muted/60"
                >
                  <span className="min-w-[30px] font-heading text-[22px] font-bold leading-none tabular-nums text-text-primary">
                    {num}
                  </span>
                  <span className="font-medium text-text-secondary">{label}</span>
                </Link>
              </li>
            ))}
          </ul>

          {autopilotEntries.length > 0 ? (
            <section aria-labelledby="dash-autopilot-title">
              <h2
                id="dash-autopilot-title"
                className="mb-2 text-[13px] font-semibold text-text-secondary"
              >
                {t('autopilot_verfuegbar.titel')}
              </h2>
              <p className="text-[13.5px] leading-relaxed text-text-secondary">
                {autopilotEntries.map((entry, i) => (
                  <React.Fragment key={entry.id}>
                    {i > 0 ? ' · ' : ''}
                    <span>
                      {tKatalog(`${entry.id}.titel`)}
                      {entry.status !== 'live' ? (
                        <span className="text-text-muted">
                          {' '}
                          ({t('autopilot_verfuegbar.in_vorbereitung')})
                        </span>
                      ) : null}
                    </span>
                  </React.Fragment>
                ))}
              </p>
              <Link
                href="/lebenslagen"
                className="group mt-2 inline-flex items-center gap-1 text-[13px] text-text-secondary no-underline underline-offset-[3px] transition-colors hover:text-text-primary hover:underline"
              >
                {t('autopilot_verfuegbar.alle')}
                <ArrowRight
                  aria-hidden="true"
                  className="size-3.5 transition-transform motion-reduce:transition-none group-hover:translate-x-0.5"
                />
              </Link>
            </section>
          ) : null}

          <p className="border-t border-border pt-[14px] text-[12.5px] leading-relaxed text-text-muted">
            {t('kontrolle_fuss.text')}{' '}
            <Link
              href="/datenschutz"
              className="underline decoration-border underline-offset-[3px] transition-colors hover:text-text-secondary"
            >
              {t('kontrolle_fuss.mehr')}
            </Link>
          </p>
        </div>
      </div>

      {error && (
        <p className="mt-3 text-[13px] text-[color:var(--red-600)]">{error}</p>
      )}
    </>
  );
}

/**
 * Ruhiger Lade-Zustand: spiegelt grob das `dash-layout` (Heute-Liste + Panel
 * links, Kennzahlen + Rail rechts). Dekorative Shimmer-Blöcke; das sr-only-Label
 * trägt die Semantik.
 */
function DashboardSkeleton({ label }: { label: string }) {
  return (
    <div role="status" aria-busy="true">
      <span className="sr-only">{label}</span>
      <div className="dash-layout">
        <div className="dash-col">
          <Skeleton className="h-64 rounded-2xl" />
          <Skeleton className="h-40 rounded-2xl" />
        </div>
        <div className="dash-col">
          <Skeleton className="h-40 rounded-2xl" />
          <Skeleton className="h-24 rounded-2xl" />
        </div>
      </div>
    </div>
  );
}

// ── helpers ───────────────────────────────────────────────────────────────

/**
 * Reordnet die „Heute"-Aktionen in KI-Reihenfolge (Backend-`rank`, 1 = oben).
 */
function sortByRank(actions: TopActionItem[]): TopActionItem[] {
  return [...actions].sort((a, b) => a.rank - b.rank);
}

function greetingAnrede(
  snapshot: DashboardSnapshot | null,
  persona: Persona | null,
): string {
  if (snapshot) {
    return `${snapshot.greeting.vorname} ${snapshot.greeting.nachname}`;
  }
  if (persona) {
    return `${persona.vorname} ${persona.nachname}`;
  }
  return '';
}

function formatDDMMYYYY(d: Date): string {
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${dd}.${mm}.${d.getFullYear()}`;
}

/** „24.07.2026" → „24.07." (Tag.Monat-Slot ohne Jahr). */
function shortDMY(ddmmyyyy: string): string {
  return ddmmyyyy.length >= 6 ? ddmmyyyy.slice(0, 6) : ddmmyyyy;
}

/** Tage bis zur Frist (aufgerundet); `Infinity` bei ungültigem Datum. */
function daysUntil(iso: string, nowIso: string): number {
  const then = new Date(iso).getTime();
  const now = new Date(nowIso).getTime();
  if (Number.isNaN(then) || Number.isNaN(now)) return Number.POSITIVE_INFINITY;
  return Math.ceil((then - now) / 86_400_000);
}

/** Langes DE-Datum ohne Jahr für die TL;DR-/Panel-Zeile („24. Juli"). */
function formatLongDate(d: Date, locale: string): string {
  if (Number.isNaN(d.getTime())) return '';
  return new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'long' }).format(d);
}

/** Monat + Jahr, kurz („Sept. 2027"). */
function formatMonthYear(iso: string, locale: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return new Intl.DateTimeFormat(locale, { month: 'short', year: 'numeric' }).format(d);
}

/** Termin-Slot „{Wochentag kurz} · {HH:MM}" (locale-formatiert). */
function formatTerminSlot(iso: string, locale: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const weekday = new Intl.DateTimeFormat(locale, { weekday: 'short' }).format(d);
  const time = new Intl.DateTimeFormat(locale, {
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
  return `${weekday} · ${time}`;
}

/** Relative Zeitangabe („vor 8 Stunden", „gestern") via Intl, locale-korrekt. */
function formatRelative(iso: string, nowIso: string, locale: string): string {
  const then = new Date(iso).getTime();
  const now = new Date(nowIso).getTime();
  if (Number.isNaN(then) || Number.isNaN(now)) return '';
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
  const diffMin = Math.round((then - now) / 60000);
  if (Math.abs(diffMin) < 60) return rtf.format(diffMin, 'minute');
  const diffH = Math.round(diffMin / 60);
  if (Math.abs(diffH) < 24) return rtf.format(diffH, 'hour');
  const diffD = Math.round(diffH / 24);
  return rtf.format(diffD, 'day');
}

/** Frühestes zukünftiges Frist-Datum unter den Top-Actions, lang formatiert. */
function earliestFristDatum(
  actions: TopActionItem[],
  nowIso: string,
  locale: string,
): string | undefined {
  const now = new Date(nowIso).getTime();
  if (Number.isNaN(now)) return undefined;
  const upcoming = actions
    .map((a) => (a.frist_datum ? new Date(a.frist_datum).getTime() : Number.NaN))
    .filter((ts) => !Number.isNaN(ts) && ts >= now)
    .sort((a, b) => a - b);
  if (upcoming.length === 0) return undefined;
  return formatLongDate(new Date(upcoming[0]), locale);
}

/**
 * Nächstgelegene offene Frist der Umzug-Kacheln ab `nowIso` (für die
 * „Nächster Schritt"-Zeile des Panels), sonst undefined.
 */
function nextUmzugFristDate(
  snapshot: DashboardSnapshot | null,
  nowIso: string,
): Date | undefined {
  const fristen = snapshot?.frist_tile ?? [];
  const now = new Date(nowIso).getTime();
  if (Number.isNaN(now)) return undefined;
  const upcoming = fristen
    .map((f) => new Date(f.frist_datum).getTime())
    .filter((ts) => !Number.isNaN(ts) && ts >= now)
    .sort((a, b) => a - b);
  if (upcoming.length === 0) return undefined;
  return new Date(upcoming[0]);
}

interface HeuteView {
  id: string;
  sourceId: string;
  titel: string;
  /** Whitelist-Reason-Token (→ Klartext-Subline). */
  reasonToken: string;
  behoerdeId: string;
  href: string;
  /** ISO-Frist (für Nähe-Berechnung). */
  fristIso?: string;
  /** DD.MM.YYYY-Frist (für den Slot). */
  fristDatum: string | null;
}

function mapToHeuteItem(ta: TopActionItem): HeuteView {
  return {
    id: ta.id,
    sourceId: ta.source_id ?? ta.id,
    titel: ta.titel,
    reasonToken: ta.reason_token,
    behoerdeId: ta.behoerde_id,
    href: ta.target_route,
    fristIso: ta.frist_datum,
    fristDatum: ta.frist_datum ? formatDDMMYYYY(new Date(ta.frist_datum)) : null,
  };
}

/**
 * Whitelist-Reason-Token → i18n-Klartext-Subline. Unbekannte Tokens fallen auf
 * leeren String zurück (keine Roh-Token-Anzeige).
 */
function reasonSubline(token: string, t: ReturnType<typeof useTranslations>): string {
  switch (token) {
    case 'frist_naehe':
      return t('heute.reason_frist_naehe');
    case 'termin_steht':
      return t('heute.reason_termin_steht');
    case 'folgevorgang':
      return t('heute.reason_folgevorgang');
    case 'manuell_priorisiert':
      return t('heute.reason_manuell_priorisiert');
    default:
      return '';
  }
}
