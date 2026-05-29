'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  Calendar,
  CheckCircle2,
  ChevronRight,
  ChevronsUpDown,
  Clock,
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

import { api } from '@/lib/mock-backend';
import type { DashboardSnapshot, Persona } from '@/types';

interface DashboardViewProps {
  nowIso: string;
}

const DEMO_PRIOR_LOGIN_DAYS = 23;

type ChipTone = 'red' | 'brand' | 'amber';

/**
 * `<DashboardView>` — literal port of `docs/design-prototype-v2/dashboard.html`.
 * Same DOM, same class names; data wired through `api.getProfile()` +
 * `api.getDashboard()`. No new abstractions — repeated rows are inline.
 */
export function DashboardView({ nowIso }: DashboardViewProps) {
  const [snapshot, setSnapshot] = React.useState<DashboardSnapshot | null>(null);
  const [persona, setPersona] = React.useState<Persona | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const lastSeenWrittenRef = React.useRef(false);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const p = await api.getProfile();
        const priorLogin = new Date(
          new Date(nowIso).getTime() -
            DEMO_PRIOR_LOGIN_DAYS * 24 * 60 * 60 * 1000,
        ).toISOString();
        const snap = await api.getDashboard(p.id, {
          last_seen_at: priorLogin,
        });
        if (cancelled) return;
        setPersona(p);
        setSnapshot(snap);
        if (!lastSeenWrittenRef.current) {
          lastSeenWrittenRef.current = true;
          await api.setLastSeen(p.id, nowIso);
        }
      } catch {
        if (!cancelled) setError('Daten konnten nicht geladen werden.');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [nowIso]);

  const anrede = greetingAnrede(snapshot, persona);
  const diff = snapshot?.diff_block ?? null;
  const topActions = snapshot?.top_actions ?? [];
  const stammdatenSubtitle = formatStammdatenSubtitle(snapshot);
  const terminSubtitle = formatTerminSubtitle(snapshot);

  return (
    <>
      <div className="gt-page-head">
        <h1>Dashboard</h1>
        <div className="sub">Ihr persönlicher Überblick über Briefe, Fristen und Vorgänge.</div>
      </div>

      <div className="dash-grid">
        <div className="greeting">
          <h2>Guten Tag, {anrede}</h2>
          <div className="meta">letzter Login vor 23 Tagen · auf diesem Gerät</div>
          <div className="gt-banner" style={{ marginTop: '16px' }}>
            <Info />
            <div>
              <a href="#" style={{ color: 'var(--brand-600)', fontWeight: 500 }}>
                Demo-Modus · Mock-Daten · Originale liegen in den amtlichen Postfächern
              </a>
            </div>
          </div>
        </div>

        <div className="since-last">
          <h4>Seit Ihrem letzten Login</h4>
          <div className="since-stat">
            <span className="icon-circle"><Mail /></span>
            <div>
              <div className="n">{diff?.neue_briefe ?? 0}</div>
              <div className="l">neue Briefe</div>
            </div>
          </div>
          <div className="since-stat">
            <span className="icon-circle"><Clock /></span>
            <div>
              <div className="n">{diff?.fristen_naeher_gerueckt ?? 0}</div>
              <div className="l">Frist näher gerückt</div>
            </div>
          </div>
          <div className="since-stat">
            <span className="icon-circle green"><CheckCircle2 /></span>
            <div>
              <div className="n">{diff?.vorgaenge_abgeschlossen ?? 0}</div>
              <div className="l">Vorgang abgeschlossen</div>
            </div>
          </div>
        </div>
      </div>

      <div className="heute-card" style={{ marginTop: '24px' }}>
        <div className="heute-head">
          <h3>Heute zu tun</h3>
          <div className="tab-chips">
            <button type="button" className="chip active"><Sparkles />KI</button>
            <button type="button" className="chip">
              Frist <ChevronsUpDown style={{ width: '12px', height: '12px' }} />
            </button>
            <button type="button" className="chip">Behörde</button>
            <button type="button" className="chip">Vorgang</button>
          </div>
        </div>
        <div className="heute-list">
          {topActions.slice(0, 3).map(
            (item, idx) => {
              const view = mapToHeuteItem(item, idx);
              return (
                <Link key={view.id} href={view.href} className="heute-item">
                  <span className={`n${idx === 2 ? ' muted' : ''}`}>{idx + 1}</span>
                  <span className={`icon-circle ${view.iconCircleTone}`}>{view.icon}</span>
                  <div className="body grow">
                    <div className="t">{view.titel}</div>
                    <div className="s">{view.subline}</div>
                  </div>
                  <span className={`badge ${view.badgeTone}`}>{view.badgeLabel}</span>
                  <ChevronRight style={{ color: 'var(--ink-4)' }} />
                </Link>
              );
            },
          )}
        </div>
      </div>

      <div className="grid-cards">
        <div className="small-card">
          <span className="icon-circle"><Clock /></span>
          <div>
            <h3 className="t">Fristen</h3>
            <div className="s">{snapshot?.frist_tile.length ?? 0} offen</div>
            <Link className="link" href="/termine">
              Ansehen <ChevronRight />
            </Link>
          </div>
        </div>
        <div className="small-card">
          <span className="icon-circle"><Mail /></span>
          <div>
            <h3 className="t">Posteingang</h3>
            <div className="s">{snapshot?.posteingang_tile.ungelesen ?? 0} ungelesen</div>
            <Link className="link" href="/posteingang">
              Öffnen <ChevronRight />
            </Link>
          </div>
        </div>
        <div className="small-card">
          <span className="icon-circle"><Folder /></span>
          <div>
            <h3 className="t">Vorgänge</h3>
            <div className="s">
              {snapshot
                ? `${snapshot.vorgangs_stand_tile.length} läuft, ${snapshot.vorgaenge_abgeschlossen_jahr} abgeschlossen`
                : '—'}
            </div>
            <Link className="link" href="/vorgaenge">
              Ansehen <ChevronRight />
            </Link>
          </div>
        </div>
        <div className="small-card">
          <span className="icon-circle"><Calendar /></span>
          <div>
            <h3 className="t">Termine</h3>
            <div className="s">{terminSubtitle}</div>
            <Link className="link" href="/termine">
              Ansehen <ChevronRight />
            </Link>
          </div>
        </div>
        <div className="small-card">
          <span className="icon-circle"><Shield /></span>
          <div>
            <h3 className="t">Datenschutz-Cockpit</h3>
            <div className="s">
              {snapshot
                ? `${snapshot.dsc_tile.app_activity.briefe_geoeffnet + snapshot.dsc_tile.app_activity.stammdaten_aktivitaeten} Aktivitäten in 30 Tagen`
                : '—'}
            </div>
            <Link className="link" href="/datenschutz">
              Öffnen <ChevronRight />
            </Link>
          </div>
        </div>
        <div className="small-card">
          <span className="icon-circle"><User /></span>
          <div>
            <h3 className="t">Stammdaten-Status</h3>
            <div className="s">{stammdatenSubtitle}</div>
            <Link className="link" href="/stammdaten">
              Ansehen <ChevronRight />
            </Link>
          </div>
        </div>
      </div>

      {error && (
        <p style={{ marginTop: '12px', color: 'var(--red-600)', fontSize: '13px' }}>{error}</p>
      )}
    </>
  );
}

// ── helpers ───────────────────────────────────────────────────────────────

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

function formatStammdatenSubtitle(snapshot: DashboardSnapshot | null): string {
  const iso = snapshot?.stammdaten_tile.letzte_bestaetigung_durch_buerger;
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return `Adresse zuletzt bestätigt am ${formatDDMMYYYY(d)}`;
}

function formatTerminSubtitle(snapshot: DashboardSnapshot | null): string {
  const t = snapshot?.termin_tile;
  if (!t) return '—';
  const d = new Date(t.datum_iso);
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
