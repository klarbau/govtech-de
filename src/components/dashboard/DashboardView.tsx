'use client';

import * as React from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import {
  Calendar,
  CalendarClock,
  CalendarPlus,
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
  MapPin,
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
  const tTermin = useTranslations('dashboard.naechster_termin');
  const tAktiv = useTranslations('dashboard.aktivitaeten');
  const tCommon = useTranslations('common');
  const [snapshot, setSnapshot] = React.useState<DashboardSnapshot | null>(null);
  const [persona, setPersona] = React.useState<Persona | null>(null);
  const [behoerdenNames, setBehoerdenNames] = React.useState<Record<string, string>>({});
  const [dismissed, setDismissed] = React.useState<Set<string>>(() => new Set());
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
  const umzugFristDatum = nextUmzugFrist(snapshot, nowIso);

  const visibleTodos = sortByRank(
    (snapshot?.top_actions ?? []).filter((a) => !dismissed.has(a.id)),
  ).slice(0, 3);
  const todosEmpty = visibleTodos.length === 0;

  // „Aktivitäten" speist sich aus echten Vorgangs-Bewegungen (letzte
  // Schritt-Timestamps), neueste zuerst, max. 3 — distinkt vom Autopilot-Feed.
  const aktivitaeten = [...(snapshot?.vorgangs_stand_tile ?? [])]
    .sort((a, b) => b.letzte_bewegung_iso.localeCompare(a.letzte_bewegung_iso))
    .slice(0, 3);

  const fristenWithin14 = countFristenWithin14(snapshot, nowIso);
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
        <div className="gt-page-head dash-head">
          <h1 className="dash-greeting">{t('greeting.guten_tag', { name: anrede })}</h1>
          <p className="dash-greeting-sub">{t('greeting.sub')}</p>
        </div>
        <DashboardSkeleton label={tCommon('loading')} />
      </>
    );
  }

  return (
    <>
      <div className="gt-page-head dash-head">
        <h1 className="dash-greeting">{t('greeting.guten_tag', { name: anrede })}</h1>
        <p className="dash-greeting-sub">{t('greeting.sub')}</p>
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
              <ol className="heute-grid">
                {visibleTodos.map((item, idx) => {
                  const view = mapToHeuteItem(item, idx);
                  return (
                    <li key={view.id} className="heute-tile">
                      <Link href={view.href} className="heute-tile-link">
                        <span className={`icon-circle ${view.iconCircleTone}`}>{view.icon}</span>
                        <div className="ht-body">
                          <div className="ht-titel">{view.titel}</div>
                          <div className="ht-sub">{reasonSubline(view.reasonToken, t)}</div>
                        </div>
                        {view.fristDatum ? (
                          <div className="ht-frist">
                            <Calendar aria-hidden="true" />
                            {t('heute.frist_bis', { datum: view.fristDatum })}
                          </div>
                        ) : null}
                        <ChevronRight className="ht-chev" aria-hidden="true" />
                      </Link>
                      <div
                        className="ht-actions"
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
              <h2 id="erledigt-feed-title" className="heute-head-title">
                {t('erledigt_feed.title')}
                <span className="head-count" aria-hidden="true">
                  ({erledigtFeed.length})
                </span>
                <span className="sr-only">
                  {t('erledigt_feed.count_aria', { count: erledigtFeed.length })}
                </span>
              </h2>
              <Link href="/vorgaenge" className="card-head-link">
                {t('erledigt_feed.alle_schritte')}
                <ChevronRight aria-hidden="true" />
              </Link>
            </div>
            <ErledigtFeed
              items={erledigtFeed.slice(0, 4)}
              behoerdenNames={behoerdenNames}
              nowIso={nowIso}
            />
          </section>

          {terminTile ? (
            <section aria-labelledby="naechster-termin-title" className="nt-card">
              <div className="nt-head">
                <span className="icon-circle"><CalendarClock aria-hidden="true" /></span>
                <h3 id="naechster-termin-title">{tTermin('titel')}</h3>
                <span className="badge green nt-badge">{tTermin('badge_bestaetigt')}</span>
              </div>
              <p className="nt-betreff">{terminTile.betreff}</p>
              <div className="nt-meta">
                <span className="nt-meta-row">
                  <CalendarClock aria-hidden="true" />
                  {formatTerminDateTime(terminTile.datum_iso)}
                </span>
                <span className="nt-meta-row">
                  <MapPin aria-hidden="true" />
                  <span>
                    <span className="nt-ort-typ">{tTermin(terminTile.ort_typ)}</span>
                    {terminTile.ort_details ? ` · ${terminTile.ort_details}` : ''}
                  </span>
                </span>
              </div>
              <div className="nt-actions">
                <Link href="/termine" className="btn btn-secondary btn-sm">
                  {tTermin('details')}
                </Link>
                <Link href="/termine" className="btn btn-ghost btn-sm">
                  <CalendarPlus aria-hidden="true" />
                  {tTermin('kalender')}
                </Link>
              </div>
            </section>
          ) : null}

          {aktivitaeten.length > 0 ? (
            <section aria-labelledby="aktivitaeten-title" className="heute-card">
              <div className="heute-head">
                <h2 id="aktivitaeten-title">{tAktiv('titel')}</h2>
                <Link href="/vorgaenge" className="card-head-link">
                  {tAktiv('alle')}
                  <ChevronRight aria-hidden="true" />
                </Link>
              </div>
              <ul className="aktiv-feed">
                {aktivitaeten.map((akt) => (
                  <li key={akt.vorgang_id} className="aktiv-row">
                    <Link href={`/vorgaenge/${akt.vorgang_id}`} className="aktiv-item">
                      <span className="aktiv-icon" aria-hidden="true"><Folder /></span>
                      <div className="aktiv-body">
                        <div className="aktiv-titel">{akt.titel}</div>
                        <div className="aktiv-sub">
                          {tAktiv('bewegung', {
                            zeit: relativeBewegung(akt.letzte_bewegung_iso, nowIso),
                          })}
                        </div>
                      </div>
                      <span className="badge brand aktiv-status">
                        {tAktiv(`status.${akt.status}`)}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>

        <div className="dash-col">
          {highlight ? (
            <TriumphBanner
              highlight={highlight}
              variant="static"
              fristDatum={umzugFristDatum}
            />
          ) : null}

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

/**
 * Relative DE-Zeitangabe („gerade eben", „vor 3 Std", „vor 5 Tagen") für die
 * „Aktivitäten"-Bewegungszeile. Speist sich aus echten Vorgangs-Timestamps.
 */
function relativeBewegung(iso: string, nowIso: string): string {
  const then = new Date(iso).getTime();
  const now = new Date(nowIso).getTime();
  if (Number.isNaN(then) || Number.isNaN(now)) return '';
  const diffMin = Math.round((now - then) / 60000);
  if (diffMin < 2) return 'gerade eben';
  if (diffMin < 60) return `vor ${diffMin} Min`;
  const diffH = Math.round(diffMin / 60);
  if (diffH < 24) return `vor ${diffH} Std`;
  const diffD = Math.round(diffH / 24);
  return `vor ${diffD} Tag${diffD === 1 ? '' : 'en'}`;
}

/** Termin-Datum + Uhrzeit, DE-formatiert (z. B. „24.06.2025, 10:30 Uhr"). */
function formatTerminDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const datum = formatDDMMYYYY(d);
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${datum}, ${hh}:${mm} Uhr`;
}

/**
 * Frist-Datum (DD.MM.YYYY) für die „Nächster Schritt"-Zeile der Umzug-Karte:
 * die nächstgelegene offene Frist ab `nowIso`, sonst undefined.
 */
function nextUmzugFrist(snapshot: DashboardSnapshot | null, nowIso: string): string | undefined {
  const fristen = snapshot?.frist_tile ?? [];
  const now = new Date(nowIso).getTime();
  if (Number.isNaN(now)) return undefined;
  const upcoming = fristen
    .map((f) => new Date(f.frist_datum).getTime())
    .filter((ts) => !Number.isNaN(ts) && ts >= now)
    .sort((a, b) => a - b);
  if (upcoming.length === 0) return undefined;
  return formatDDMMYYYY(new Date(upcoming[0]));
}

interface HeuteView {
  id: string;
  sourceId: string;
  titel: string;
  /** Klartext-Begründung (z. B. „Frist rückt näher …") als Karten-Subline. */
  reasonToken: string;
  /** Sekundäres Detail (Aktenzeichen) — Karten-fern, nur für SR/Detail. */
  aktenzeichen?: string;
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
    return {
      id: ta.id,
      sourceId: ta.source_id ?? ta.id,
      titel: ta.titel,
      reasonToken: ta.reason_token,
      aktenzeichen: ta.aktenzeichen,
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

/**
 * Whitelist-Reason-Token → i18n-Klartext-Subline für die „Heute wichtig"-Karte.
 * Unbekannte Tokens fallen auf leeren String zurück (keine Roh-Token-Anzeige).
 */
function reasonSubline(
  token: string,
  t: ReturnType<typeof useTranslations>,
): string {
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
