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
  FileText,
  Folder,
  Gauge,
  IdCard,
  Info,
  Mail,
  Shield,
  Sparkles,
  User,
} from 'lucide-react';

import { AutopilotKatalogTeaser } from '@/components/autopilot/AutopilotKatalogTeaser';
import { ErledigtFeed } from '@/components/dashboard/ErledigtFeed';
import { TriumphBanner } from '@/components/dashboard/TriumphBanner';
import { Skeleton } from '@/components/shared/Skeleton';
import { api } from '@/lib/mock-backend';
import type { Behoerde, DashboardSnapshot, Persona } from '@/types';
import type { DashboardSortMode, TopActionItem } from '@/types/dashboard';

interface DashboardViewProps {
  nowIso: string;
}

const DEMO_PRIOR_LOGIN_DAYS = 23;

type ChipTone = 'red' | 'brand' | 'amber';

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
  const [activeTab, setActiveTab] = React.useState<DashboardSortMode>('ki');
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
          const mode = await api.getDashboardSortMode(p.id);
          if (!cancelled) setActiveTab(mode);
        } catch {
          /* sort mode falls back to 'ki' */
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
  const diff = snapshot?.diff_block ?? null;
  const stammdatenSubtitle = formatStammdatenSubtitle(snapshot);
  const terminSubtitle = formatTerminSubtitle(snapshot);
  const highlight = snapshot?.autopilot_highlight;
  const erledigtFeed = snapshot?.erledigt_feed ?? [];

  const visibleTodos = sortTopActions(
    (snapshot?.top_actions ?? []).filter((a) => !dismissed.has(a.id)),
    activeTab,
    behoerdenNames,
  ).slice(0, 3);
  const todosEmpty = visibleTodos.length === 0;

  const loginDays = computeLoginDays(snapshot, nowIso) ?? DEMO_PRIOR_LOGIN_DAYS;

  function handleTabChange(mode: DashboardSortMode) {
    setActiveTab(mode);
    if (persona) {
      void api.setDashboardSortMode(persona.id, mode).catch(() => {
        /* in-memory order already applied; persistence is best-effort */
      });
    }
  }

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
          <div className="sub">{t('untertitel')}</div>
        </div>
        <DashboardSkeleton label={tCommon('loading')} />
      </>
    );
  }

  return (
    <>
      <div className="gt-page-head">
        <h1>{t('titel')}</h1>
        <div className="sub">{t('untertitel')}</div>
      </div>

      <div className="dash-grid">
        <div className="greeting">
          <h2>{t('greeting.guten_tag', { name: anrede })}</h2>
          <div className="meta">{t('letzter_login', { days: loginDays })}</div>
          <div className="gt-banner" style={{ marginTop: '16px' }}>
            <Info />
            <div>
              <Link href="/datenschutz" style={{ color: 'var(--brand-600)', fontWeight: 500 }}>
                {t('prototyp_hinweis.text')}
              </Link>
            </div>
          </div>
        </div>

        <div className="since-last">
          <h3>{t('seit_login.titel')}</h3>
          <div className="since-stat">
            <span className="icon-circle"><Mail aria-hidden="true" /></span>
            <div>
              <div className="n">{diff?.neue_briefe ?? 0}</div>
              <div className="l">{t('seit_login.neue_briefe')}</div>
            </div>
          </div>
          <div className="since-stat">
            <span className="icon-circle"><Clock /></span>
            <div>
              <div className="n">{diff?.fristen_naeher_gerueckt ?? 0}</div>
              <div className="l">{t('seit_login.frist_naeher')}</div>
            </div>
          </div>
          <div className="since-stat">
            <span className="icon-circle green"><CheckCircle2 /></span>
            <div>
              <div className="n">{diff?.vorgaenge_abgeschlossen ?? 0}</div>
              <div className="l">{t('seit_login.vorgang_abgeschlossen')}</div>
            </div>
          </div>
        </div>
      </div>

      {highlight ? (
        <div style={{ marginTop: '24px' }}>
          <TriumphBanner highlight={highlight} variant="static" />
        </div>
      ) : null}

      <section
        aria-labelledby="dashboard-heute-zu-tun"
        className="heute-card"
        style={{ marginTop: '24px' }}
      >
        <div className="heute-head">
          <h3 id="dashboard-heute-zu-tun">{t('heute.titel')}</h3>
          <div className="tab-chips" role="group" aria-label={t('heute.sort_aria')}>
            <button
              type="button"
              className={`chip${activeTab === 'ki' ? ' active' : ''}`}
              aria-pressed={activeTab === 'ki'}
              onClick={() => handleTabChange('ki')}
            >
              <Sparkles />
              {t('heute.tab_ki')}
            </button>
            <button
              type="button"
              className={`chip${activeTab === 'frist' ? ' active' : ''}`}
              aria-pressed={activeTab === 'frist'}
              onClick={() => handleTabChange('frist')}
            >
              {t('heute.tab_frist')}
            </button>
            <button
              type="button"
              className={`chip${activeTab === 'behoerde' ? ' active' : ''}`}
              aria-pressed={activeTab === 'behoerde'}
              onClick={() => handleTabChange('behoerde')}
            >
              {t('heute.tab_behoerde')}
            </button>
            <button
              type="button"
              className={`chip${activeTab === 'vorgang' ? ' active' : ''}`}
              aria-pressed={activeTab === 'vorgang'}
              onClick={() => handleTabChange('vorgang')}
            >
              {t('heute.tab_vorgang')}
            </button>
          </div>
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
                  <Link
                    href={view.href}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 14,
                      textDecoration: 'none',
                      color: 'inherit',
                      minWidth: 0,
                      flex: 1,
                    }}
                  >
                    <span className={`n${idx === 2 ? ' muted' : ''}`}>{idx + 1}</span>
                    <span className={`icon-circle ${view.iconCircleTone}`}>{view.icon}</span>
                    <div className="body grow">
                      <div className="t">{view.titel}</div>
                      <div className="s">{view.subline}</div>
                    </div>
                    <span className={`badge ${view.badgeTone}`}>{view.badgeLabel}</span>
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

      <section
        aria-labelledby="erledigt-feed-title"
        className="heute-card"
        style={{ marginTop: '24px' }}
      >
        <div className="heute-head">
          <h3 id="erledigt-feed-title">{t('erledigt_feed.title')}</h3>
        </div>
        <ErledigtFeed items={erledigtFeed} behoerdenNames={behoerdenNames} nowIso={nowIso} />
      </section>

      <div style={{ marginTop: '24px' }}>
        <AutopilotKatalogTeaser />
      </div>

      <div className="grid-cards" style={{ marginTop: '24px' }}>
        <Link className="small-card" href="/posteingang">
          <span className="icon-circle"><Clock aria-hidden="true" /></span>
          <div>
            <h3 className="t">{t('kacheln.fristen.titel')}</h3>
            <div className="s">{t('kacheln.fristen.offen', { count: snapshot?.frist_tile.length ?? 0 })}</div>
            <span className="link">
              {t('kacheln.fristen.cta')} <ChevronRight aria-hidden="true" />
            </span>
          </div>
        </Link>
        <Link className="small-card" href="/posteingang">
          <span className="icon-circle"><Mail aria-hidden="true" /></span>
          <div>
            <h3 className="t">{t('kacheln.posteingang.titel')}</h3>
            <div className="s">{t('kacheln.posteingang.ungelesen', { count: snapshot?.posteingang_tile.ungelesen ?? 0 })}</div>
            <span className="link">
              {t('kacheln.posteingang.cta')} <ChevronRight aria-hidden="true" />
            </span>
          </div>
        </Link>
        <Link className="small-card" href="/vorgaenge">
          <span className="icon-circle"><Folder aria-hidden="true" /></span>
          <div>
            <h3 className="t">{t('kacheln.vorgaenge.titel')}</h3>
            <div className="s">
              {snapshot
                ? t('kacheln.vorgaenge.stand', {
                    laeuft: snapshot.vorgangs_stand_tile.length,
                    abgeschlossen: snapshot.vorgaenge_abgeschlossen_jahr,
                  })
                : '—'}
            </div>
            <span className="link">
              {t('kacheln.vorgaenge.cta')} <ChevronRight aria-hidden="true" />
            </span>
          </div>
        </Link>
        <Link className="small-card" href="/termine">
          <span className="icon-circle"><Calendar aria-hidden="true" /></span>
          <div>
            <h3 className="t">{t('kacheln.termine.titel')}</h3>
            <div className="s">{terminSubtitle}</div>
            <span className="link">
              {t('kacheln.termine.cta')} <ChevronRight aria-hidden="true" />
            </span>
          </div>
        </Link>
        <Link className="small-card" href="/datenschutz">
          <span className="icon-circle"><Shield aria-hidden="true" /></span>
          <div>
            <h3 className="t">{t('kacheln.datenschutz.titel')}</h3>
            <div className="s">
              {snapshot
                ? t('kacheln.datenschutz.aktivitaeten', {
                    count:
                      snapshot.dsc_tile.app_activity.briefe_geoeffnet +
                      snapshot.dsc_tile.app_activity.stammdaten_aktivitaeten,
                  })
                : '—'}
            </div>
            <span className="link">
              {t('kacheln.datenschutz.cta')} <ChevronRight aria-hidden="true" />
            </span>
          </div>
        </Link>
        <Link className="small-card" href="/stammdaten">
          <span className="icon-circle"><User aria-hidden="true" /></span>
          <div>
            <h3 className="t">{t('kacheln.stammdaten.titel')}</h3>
            <div className="s">{stammdatenSubtitle}</div>
            <span className="link">
              {t('kacheln.stammdaten.cta')} <ChevronRight aria-hidden="true" />
            </span>
          </div>
        </Link>
      </div>

      {error && (
        <p style={{ marginTop: '12px', color: 'var(--red-600)', fontSize: '13px' }}>{error}</p>
      )}
    </>
  );
}

/**
 * Ruhiger Lade-Zustand für das Dashboard: spiegelt grob das `dash-grid`-Layout
 * (Begrüßungskarte links, zwei gestapelte Karten rechts) plus zwei breite
 * Folge-Karten. Dekorative Shimmer-Blöcke; das sr-only-Label trägt die Semantik.
 */
function DashboardSkeleton({ label }: { label: string }) {
  return (
    <div role="status" aria-busy="true">
      <span className="sr-only">{label}</span>
      <div className="dash-grid">
        <Skeleton className="h-64 rounded-2xl" />
        <div className="flex flex-col gap-4">
          <Skeleton className="h-28 rounded-2xl" />
          <Skeleton className="h-28 rounded-2xl" />
        </div>
      </div>
      <Skeleton className="mt-6 h-40 rounded-2xl" />
      <Skeleton className="mt-6 h-32 rounded-2xl" />
    </div>
  );
}

// ── helpers ───────────────────────────────────────────────────────────────

/**
 * Reordnet die „Heute zu tun"-Aktionen nach dem aktiven Sortier-Modus.
 * - `ki`     → KI-Reihenfolge (Backend-`rank`, 1 = oben).
 * - `frist`  → aufsteigend nach Frist-Datum; Aktionen ohne Frist ans Ende.
 * - `behoerde` → gruppiert/sortiert nach Behörden-Anzeigename (Fallback: ID).
 * - `vorgang`  → gruppiert/sortiert nach zugehörigem Vorgang (Quelle/Folgevorgang).
 * Innerhalb jeder Gruppe bleibt die KI-Reihenfolge (`rank`) als Tiebreak erhalten.
 */
function sortTopActions(
  actions: TopActionItem[],
  mode: DashboardSortMode,
  behoerdenNames: Record<string, string>,
): TopActionItem[] {
  const byRank = (a: TopActionItem, b: TopActionItem) => a.rank - b.rank;
  const sorted = [...actions];

  if (mode === 'frist') {
    sorted.sort((a, b) => {
      const da = a.frist_datum ? new Date(a.frist_datum).getTime() : Number.POSITIVE_INFINITY;
      const db = b.frist_datum ? new Date(b.frist_datum).getTime() : Number.POSITIVE_INFINITY;
      if (da !== db) return da - db;
      return byRank(a, b);
    });
    return sorted;
  }

  if (mode === 'behoerde') {
    const key = (a: TopActionItem) =>
      (behoerdenNames[a.behoerde_id] ?? a.behoerde_id ?? '').toLowerCase();
    sorted.sort((a, b) => {
      const cmp = key(a).localeCompare(key(b), 'de');
      if (cmp !== 0) return cmp;
      return byRank(a, b);
    });
    return sorted;
  }

  if (mode === 'vorgang') {
    sorted.sort((a, b) => {
      const cmp = vorgangKey(a).localeCompare(vorgangKey(b), 'de');
      if (cmp !== 0) return cmp;
      return byRank(a, b);
    });
    return sorted;
  }

  // mode === 'ki'
  sorted.sort(byRank);
  return sorted;
}

/**
 * Leitet einen stabilen Gruppierungs-Schlüssel je Vorgang ab. Direkt
 * vorgangs-basierte Aktionen nutzen `source_id`; Folgevorgänge den Titel des
 * auslösenden Vorgangs (`reason_context`); sonst den eigenen Titel als Fallback.
 */
function vorgangKey(a: TopActionItem): string {
  if (a.source_typ === 'vorgang') return `0:${a.source_id}`;
  if (a.reason_context) return `1:${a.reason_context.toLowerCase()}`;
  return `2:${a.titel.toLowerCase()}`;
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

/** Leitet „letzter Login vor N Tagen" aus `snapshot.last_login_at` ab (§B2). */
function computeLoginDays(
  snapshot: DashboardSnapshot | null,
  nowIso: string,
): number | null {
  const iso = snapshot?.last_login_at ?? snapshot?.diff_block?.last_seen_at;
  if (!iso) return null;
  const then = new Date(iso).getTime();
  const now = new Date(nowIso).getTime();
  if (Number.isNaN(then) || Number.isNaN(now)) return null;
  return Math.max(0, Math.round((now - then) / (24 * 60 * 60 * 1000)));
}

function formatStammdatenSubtitle(snapshot: DashboardSnapshot | null): string {
  const iso = snapshot?.stammdaten_tile.letzte_bestaetigung_durch_buerger;
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return `Adresse zuletzt bestätigt am ${formatDDMMYYYY(d)}`;
}

function formatTerminSubtitle(snapshot: DashboardSnapshot | null): string {
  const tt = snapshot?.termin_tile;
  if (!tt) return '—';
  const d = new Date(tt.datum_iso);
  if (Number.isNaN(d.getTime())) return '—';
  return `Nächster Termin ${formatDDMMYYYY(d)}`;
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
  badgeLabel: string;
  badgeTone: ChipTone;
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
      frist_datum?: string;
      source_typ: string;
    };
    const sub = ta.frist_datum
      ? `Frist ${formatDDMMYYYY(new Date(ta.frist_datum))}`
      : reasonLabel(ta.reason_token);
    return {
      id: ta.id,
      sourceId: ta.source_id ?? ta.id,
      titel: ta.titel,
      subline: sub,
      href: ta.target_route,
      icon: iconForReason(ta.reason_token, ta.source_typ, idx),
      iconCircleTone: idx === 0 ? 'violet' : '',
      badgeLabel: badgeLabelForReason(ta.reason_token),
      badgeTone: badgeToneForReason(ta.reason_token),
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
function badgeLabelForReason(token: string): string {
  switch (token) {
    case 'frist_naehe':
      return 'Fristnähe';
    case 'folgevorgang':
      return 'Folgevorgang';
    case 'manuell_priorisiert':
      return 'Manuell priorisiert';
    default:
      return 'Fristnähe';
  }
}
function badgeToneForReason(token: string): ChipTone {
  if (token === 'frist_naehe') return 'red';
  if (token === 'folgevorgang') return 'brand';
  return 'amber';
}
