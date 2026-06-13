'use client';

import * as React from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import {
  Calendar,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock,
  Clock3,
  ExternalLink,
  FileText,
  Folder,
  Gauge,
  IdCard,
  Mail,
  Shield,
} from 'lucide-react';

import { AutopilotKatalogTeaser } from '@/components/autopilot/AutopilotKatalogTeaser';
import { ErledigtFeed } from '@/components/dashboard/ErledigtFeed';
import { TriumphBanner } from '@/components/dashboard/TriumphBanner';
import { Skeleton } from '@/components/shared/Skeleton';
import { api } from '@/lib/mock-backend';
import type { Behoerde, DashboardSnapshot, Persona } from '@/types';
import type { TopActionItem } from '@/types/dashboard';

interface DashboardViewProps {
  nowIso: string;
}

const DEMO_PRIOR_LOGIN_DAYS = 23;

/**
 * `<DashboardView>` — Dashboard mit Konvenienz-Pass-1-Schicht: Triumph-Banner
 * (§B2), „Automatisch erledigt für Sie"-Feed (§B2), ruhiger Leer-Zustand für
 * „Heute zu tun" (§B2), Dismiss/Snooze auf To-dos (§C4), Autopilot-Katalog
 * (§A-katalog). Daten via `api.getProfile()` + `api.getDashboard()`.
 */
export function DashboardView({ nowIso }: DashboardViewProps) {
  const t = useTranslations('dashboard');
  const tCommon = useTranslations('common');
  const [snapshot, setSnapshot] = React.useState<DashboardSnapshot | null>(null);
  const [persona, setPersona] = React.useState<Persona | null>(null);
  const [behoerdenNames, setBehoerdenNames] = React.useState<Record<string, string>>({});
  const [dismissed, setDismissed] = React.useState<Set<string>>(() => new Set());
  const [upcomingTermine, setUpcomingTermine] = React.useState(0);
  const [error, setError] = React.useState<string | null>(null);
  const lastSeenWrittenRef = React.useRef(false);

  const reload = React.useCallback(async () => {
    const p = await api.getProfile();
    const priorLogin = new Date(
      new Date(nowIso).getTime() - DEMO_PRIOR_LOGIN_DAYS * 24 * 60 * 60 * 1000,
    ).toISOString();
    const snap = await api.getDashboard(p.id, { last_seen_at: priorLogin });
    setPersona(p);
    setSnapshot(snap);
    return p;
  }, [nowIso]);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const p = await reload();
        if (cancelled) return;
        if (!lastSeenWrittenRef.current) {
          lastSeenWrittenRef.current = true;
          await api.setLastSeen(p.id, nowIso);
        }
        try {
          const behoerden = (await api.getBehoerden()) as Behoerde[];
          if (!cancelled) {
            const names: Record<string, string> = {};
            for (const b of behoerden) names[b.id] = b.name_de;
            setBehoerdenNames(names);
          }
        } catch {
          /* names are nice-to-have */
        }
        try {
          const termine = await api.getTermine();
          if (!cancelled) {
            const now = new Date(nowIso).getTime();
            const count = termine.filter((termin) => {
              const ts = new Date(termin.datum).getTime();
              return !Number.isNaN(ts) && ts >= now;
            }).length;
            setUpcomingTermine(count);
          }
        } catch {
          /* termine count gracefully falls back to 0 */
        }
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
  const erledigtFeed = snapshot?.erledigt_feed ?? [];
  const terminTile = snapshot?.termin_tile;

  const visibleTodos = sortByRank(
    (snapshot?.top_actions ?? []).filter((a) => !dismissed.has(a.id)),
  ).slice(0, 3);
  const todosEmpty = visibleTodos.length === 0;

  const fristenWithin14 = countFristenWithin14(snapshot, nowIso);
  const terminSub = terminTile
    ? t('tiles.termine_sub', { datum: formatDDMMYYYY(new Date(terminTile.datum_iso)) })
    : t('tile.termine.none');
  const erledigtPending = terminTile
    ? {
        behoerdeName: behoerdenNames[terminTile.behoerde_id] ?? terminTile.behoerde_id,
        href: '/termine',
      }
    : undefined;

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

  if (snapshot === null && error === null) {
    return (
      <>
        <div className="gt-page-head">
          <h1>{t('titel')}</h1>
          <h2 className="dash-greeting">{t('greeting.guten_tag', { name: anrede })}</h2>
        </div>
        <DashboardSkeleton label={tCommon('loading')} />
      </>
    );
  }

  return (
    <>
      <div className="gt-page-head">
        <h1>{t('titel')}</h1>
        <h2 className="dash-greeting">{t('greeting.guten_tag', { name: anrede })}</h2>
      </div>

      <div className="dash-layout">
        <div className="dash-col">
          <section aria-labelledby="dashboard-heute-zu-tun" className="heute-card">
            <div className="heute-head">
              <h2 id="dashboard-heute-zu-tun">{t('heute.titel')}</h2>
              <Link href="/posteingang" className="card-head-link">
                {tCommon('show_all')}
                <ChevronRight aria-hidden="true" />
              </Link>
            </div>

            {todosEmpty ? (
              <div className="heute-empty">
                <span className="he-icon" aria-hidden="true"><Check /></span>
                <div className="he-title">{t('heute.empty_title')}</div>
                <div className="he-body">{t('heute.empty_body')}</div>
                <div className="he-achievement">
                  {t('achievement.jahr', {
                    count: snapshot?.vorgaenge_abgeschlossen_jahr ?? 0,
                  })}
                </div>
              </div>
            ) : (
              <ol className="heute-list">
                {visibleTodos.map((item, idx) => {
                  const view = mapToHeuteItem(item, idx);
                  return (
                    <li key={view.id} className="heute-item">
                      <Link href={view.href} className="heute-link">
                        <span className="n">{idx + 1}</span>
                        <span className={`icon-circle ${view.iconCircleTone}`}>{view.icon}</span>
                        <div className="body grow">
                          <div className="t">{view.titel}</div>
                          <div className="s">{view.subline}</div>
                        </div>
                        {view.fristDatum ? (
                          <span className="heute-frist">
                            <span className="badge amber">{t('heute.frist_bald')}</span>
                            <span className="heute-frist-am">
                              {t('heute.frist_am', { datum: view.fristDatum })}
                            </span>
                          </span>
                        ) : null}
                        <ChevronRight className="heute-chev" aria-hidden="true" />
                      </Link>
                      <div
                        className="heute-actions"
                        role="group"
                        aria-label={t('heute.actions_label', { titel: view.titel })}
                      >
                        <button
                          type="button"
                          aria-label={t('heute.done')}
                          title={t('heute.done')}
                          onClick={() => handleDone(view.sourceId)}
                        >
                          <Check />
                        </button>
                        <button
                          type="button"
                          aria-label={t('heute.snooze')}
                          title={t('heute.snooze')}
                          onClick={() => handleSnooze(view.sourceId)}
                        >
                          <Clock3 />
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ol>
            )}
          </section>

          <section aria-labelledby="erledigt-feed-title" className="heute-card">
            <div className="heute-head">
              <h2 id="erledigt-feed-title">{t('erledigt_feed.title')}</h2>
              <Link href="/vorgaenge" className="card-head-link">
                {t('erledigt_feed.alle_schritte')}
                <ChevronRight aria-hidden="true" />
              </Link>
            </div>
            <ErledigtFeed
              items={erledigtFeed}
              behoerdenNames={behoerdenNames}
              nowIso={nowIso}
              pending={erledigtPending}
            />
          </section>
        </div>

        <div className="dash-col">
          {highlight ? <TriumphBanner highlight={highlight} variant="static" /> : null}

          <div className="dash-tiles">
            <Link className="stat-tile" href="/posteingang">
              <div className="st-head">
                <span className="icon-circle"><Mail aria-hidden="true" /></span>
                <h3>{t('kacheln.posteingang.titel')}</h3>
              </div>
              <div className="st-num">{snapshot?.posteingang_tile.ungelesen ?? 0}</div>
              <div className="st-sub">{t('tiles.posteingang_sub')}</div>
              <span className="st-cta">
                {t('tiles.posteingang_cta')}
                <ChevronRight aria-hidden="true" />
              </span>
            </Link>
            <Link className="stat-tile" href="/posteingang">
              <div className="st-head">
                <span className="icon-circle"><Clock aria-hidden="true" /></span>
                <h3>{t('kacheln.fristen.titel')}</h3>
              </div>
              <div className="st-num">{fristenWithin14}</div>
              <div className="st-sub">{t('tiles.fristen_sub')}</div>
              <span className="st-cta">
                {t('tiles.fristen_cta')}
                <ChevronRight aria-hidden="true" />
              </span>
            </Link>
            <Link className="stat-tile" href="/termine">
              <div className="st-head">
                <span className="icon-circle"><Calendar aria-hidden="true" /></span>
                <h3>{t('kacheln.termine.titel')}</h3>
              </div>
              <div className="st-num">{upcomingTermine}</div>
              <div className="st-sub">{terminSub}</div>
              <span className="st-cta">
                {t('tiles.termine_cta')}
                <ChevronRight aria-hidden="true" />
              </span>
            </Link>
            <Link className="stat-tile" href="/vorgaenge">
              <div className="st-head">
                <span className="icon-circle"><Folder aria-hidden="true" /></span>
                <h3>{t('kacheln.vorgaenge.titel')}</h3>
              </div>
              <div className="st-num">{snapshot?.vorgangs_stand_tile.length ?? 0}</div>
              <div className="st-sub">{t('tiles.vorgaenge_sub')}</div>
              <span className="st-cta">
                {t('tiles.vorgaenge_cta')}
                <ChevronRight aria-hidden="true" />
              </span>
            </Link>
          </div>

          <section aria-labelledby="kontrolle-title" className="kontrolle-card">
            <div className="kontrolle-head">
              <span className="icon-circle"><Shield aria-hidden="true" /></span>
              <h3 id="kontrolle-title">{t('kontrolle.title')}</h3>
            </div>
            <p className="kontrolle-sub">{t('kontrolle.subtitle')}</p>
            <ul className="kontrolle-list">
              <li>
                <CheckCircle2 aria-hidden="true" />
                <span>{t('kontrolle.punkt_einwilligung')}</span>
              </li>
              <li>
                <CheckCircle2 aria-hidden="true" />
                <span>{t('kontrolle.punkt_eid')}</span>
              </li>
              <li>
                <CheckCircle2 aria-hidden="true" />
                <span>{t('kontrolle.punkt_rechtsgrundlage')}</span>
              </li>
            </ul>
            <Link href="/datenschutz" className="kontrolle-link">
              {t('kontrolle.mehr')}
              <ExternalLink aria-hidden="true" />
            </Link>
          </section>
        </div>
      </div>

      <div style={{ marginTop: 24 }}>
        <AutopilotKatalogTeaser />
      </div>

      {error && (
        <p style={{ marginTop: '12px', color: 'var(--red-600)', fontSize: '13px' }}>{error}</p>
      )}
    </>
  );
}

/**
 * Ruhiger Lade-Zustand für das Dashboard: spiegelt grob das `dash-layout`
 * (Aktions-Feed links, Rail mit Hero/Kacheln/Kontrolle rechts). Dekorative
 * Shimmer-Blöcke; das sr-only-Label trägt die Semantik.
 */
function DashboardSkeleton({ label }: { label: string }) {
  return (
    <div role="status" aria-busy="true">
      <span className="sr-only">{label}</span>
      <div className="dash-layout">
        <div className="dash-col">
          <Skeleton className="h-64 rounded-2xl" />
          <Skeleton className="h-48 rounded-2xl" />
        </div>
        <div className="dash-col">
          <Skeleton className="h-56 rounded-2xl" />
          <Skeleton className="h-32 rounded-2xl" />
        </div>
      </div>
    </div>
  );
}

// ── helpers ───────────────────────────────────────────────────────────────

/**
 * Reordnet die „Heute zu tun"-Aktionen in KI-Reihenfolge (Backend-`rank`,
 * 1 = oben). Die früheren alternativen Sortier-Modi (Frist/Behörde/Vorgang)
 * sind mit den Sortier-Tabs aus der UI entfernt worden.
 */
function sortByRank(actions: TopActionItem[]): TopActionItem[] {
  return [...actions].sort((a, b) => a.rank - b.rank);
}

function greetingAnrede(
  snapshot: DashboardSnapshot | null,
  persona: Persona | null,
): string {
  if (snapshot) {
    const { geschlecht_anrede, nachname } = snapshot.greeting;
    if (geschlecht_anrede === 'frau') return `Frau ${nachname}`;
    if (geschlecht_anrede === 'herr') return `Herr ${nachname}`;
    return `${snapshot.greeting.vorname} ${snapshot.greeting.nachname}`;
  }
  if (persona) {
    return `${persona.vorname} ${persona.nachname}`;
  }
  return '';
}

/**
 * Zählt offene Fristen, deren Frist-Datum innerhalb von 14 Tagen ab `nowIso`
 * liegt (vergangene Fristen zählen nicht). Speist die „Fristen"-Kachel.
 */
function countFristenWithin14(snapshot: DashboardSnapshot | null, nowIso: string): number {
  const fristen = snapshot?.frist_tile ?? [];
  const now = new Date(nowIso).getTime();
  if (Number.isNaN(now)) return 0;
  const horizon = now + 14 * 24 * 60 * 60 * 1000;
  return fristen.filter((f) => {
    const ts = new Date(f.frist_datum).getTime();
    return !Number.isNaN(ts) && ts >= now && ts <= horizon;
  }).length;
}

function formatDDMMYYYY(d: Date): string {
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${dd}.${mm}.${d.getFullYear()}`;
}

interface HeuteView {
  id: string;
  sourceId: string;
  titel: string;
  subline: string;
  href: string;
  icon: React.ReactNode;
  iconCircleTone: string;
  fristDatum: string | null;
}

function mapToHeuteItem(item: unknown, idx: number): HeuteView {
  if (
    typeof item === 'object' &&
    item !== null &&
    'titel' in item &&
    'target_route' in item
  ) {
    const ta = item as {
      id: string;
      source_id?: string;
      titel: string;
      target_route: string;
      reason_token: string;
      aktenzeichen?: string;
      frist_datum?: string;
      source_typ: string;
    };
    const sub = ta.aktenzeichen ?? reasonLabel(ta.reason_token);
    return {
      id: ta.id,
      sourceId: ta.source_id ?? ta.id,
      titel: ta.titel,
      subline: sub,
      href: ta.target_route,
      icon: iconForReason(ta.reason_token, ta.source_typ, idx),
      iconCircleTone: idx === 0 ? 'violet' : '',
      fristDatum: ta.frist_datum ? formatDDMMYYYY(new Date(ta.frist_datum)) : null,
    };
  }
  return item as HeuteView;
}

function iconForReason(token: string, sourceTyp: string, idx: number): React.ReactNode {
  if (token === 'folgevorgang') return <FileText />;
  if (sourceTyp === 'vorgang' || idx === 0) return <IdCard />;
  if (idx === 2) return <Gauge />;
  return <FileText />;
}
function reasonLabel(token: string): string {
  switch (token) {
    case 'frist_naehe':
      return 'Frist näher als bei anderen offenen Aktionen';
    case 'termin_steht':
      return 'Termin bereits vereinbart';
    case 'folgevorgang':
      return 'Folgevorgang aus laufendem Verfahren';
    case 'manuell_priorisiert':
      return 'Manuell als prioritär markiert';
    default:
      return '';
  }
}
