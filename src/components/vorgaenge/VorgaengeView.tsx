'use client';

import * as React from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import {
  Baby,
  BadgeEuro,
  Briefcase,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronRight,
  ChevronUp,
  Clock,
  FilePlus2,
  FileText,
  Filter,
  FolderOpen,
  Heart,
  Home,
  IdCard,
  LayoutGrid,
  MoreHorizontal,
  MoreVertical,
  Search,
  Settings,
  Users,
} from 'lucide-react';

import { api } from '@/lib/mock-backend';
import { Skeleton } from '@/components/shared/Skeleton';
import type { Behoerde, BehoerdeId, Vorgang } from '@/types';

/* Green "command-center" relayout of /vorgaenge. The data layer (load effect,
   retry/cancel, status predicates, date helpers) is unchanged — only the
   derivations and JSX were rebuilt around the richer mockup. */

type FilterId = 'alle' | 'laufend' | 'warten' | 'abgeschlossen';

/* Shared status predicates — single source of truth for both tab counts and tab filtering. */
function isAbgeschlossen(v: Vorgang): boolean {
  return v.status === 'abgeschlossen';
}

function isLaufend(v: Vorgang): boolean {
  return (
    v.status !== 'abgeschlossen' &&
    v.status !== 'abgelehnt' &&
    v.schritte.filter((s) => s.status === 'confirmed').length < v.schritte.length
  );
}

function isWarten(v: Vorgang): boolean {
  return (
    v.schritte.some(
      (s) =>
        s.status === 'needs_eid' ||
        s.status === 'pending_eid_confirmation' ||
        s.status === 'self_assigned',
    ) || v.context?.unterlagen_fehlen === true
  );
}

function matchesTab(v: Vorgang, tab: FilterId): boolean {
  switch (tab) {
    case 'laufend':
      return isLaufend(v);
    case 'warten':
      return isWarten(v);
    case 'abgeschlossen':
      return isAbgeschlossen(v);
    case 'alle':
    default:
      return true;
  }
}

function formatDateShort(iso?: string): string {
  if (!iso) return '';
  const datePart = iso.slice(0, 10);
  const parts = datePart.split('-');
  if (parts.length !== 3) return '';
  const [y, m, d] = parts;
  return `${d}.${m}.${y}`;
}

function daysUntil(iso: string | undefined, nowIso: string): number | null {
  if (!iso) return null;
  const a = new Date(iso).getTime();
  const b = new Date(nowIso).getTime();
  if (Number.isNaN(a) || Number.isNaN(b)) return null;
  return Math.ceil((a - b) / (1000 * 60 * 60 * 24));
}

/** Whole days elapsed since an ISO timestamp, clamped to >= 0. */
function daysSince(iso: string | undefined, nowIso: string): number {
  if (!iso) return 0;
  const a = new Date(iso).getTime();
  const b = new Date(nowIso).getTime();
  if (Number.isNaN(a) || Number.isNaN(b)) return 0;
  return Math.max(0, Math.floor((b - a) / (1000 * 60 * 60 * 24)));
}

type IconTone = 'brand' | 'green' | 'amber' | 'violet' | 'pink' | 'teal';
const SMALL_TONES: IconTone[] = ['violet', 'pink', 'teal', 'amber', 'brand', 'green'];

interface SmallVorgang {
  id: string;
  titel: string;
  primaryBehoerde: string;
  typ: string;
  fristIso?: string;
  fristDays: number | null;
  abgeschlossenAm: string;
  actionLabel: string;
  state: 'abgeschlossen' | 'warten' | 'laufend';
  href: string;
  tone: IconTone;
}

interface BigStep {
  id: string;
  behoerde: string;
  aktion: string;
  date?: string;
  state: 'done' | 'current' | 'pending';
}

interface BigVorgang {
  id: string;
  steps: BigStep[];
  doneCount: number;
  totalCount: number;
  angelegtAm: string;
  href: string;
}

interface PrioRow {
  id: string;
  action: string;
  titel: string;
  days: number | null;
}

interface FristRow {
  id: string;
  titel: string;
  datum: string;
  days: number;
}

interface RueckmeldungRow {
  id: string;
  behoerde: string;
  titel: string;
  aktion: string;
  seitDays: number;
}

/** "Nächste Aktion"-Label aus dem tatsächlichen Vorgangsstatus ableiten. */
function nextActionLabel(v: Vorgang): string {
  if (isWarten(v)) return 'Unterlagen hochladen';
  if (v.schritte.some((s) => s.status === 'in_progress')) return 'Bestätigung abwarten';
  return 'Unterlagen prüfen';
}

/** Spätestes Abschlussdatum eines Vorgangs (abgeschlossen_am, sonst letzter Schritt). */
function abschlussDatum(v: Vorgang): string {
  if (v.abgeschlossen_am) return v.abgeschlossen_am;
  const completed = v.schritte
    .map((s) => s.completed_at)
    .filter((c): c is string => Boolean(c))
    .sort();
  return completed[completed.length - 1] ?? '';
}

/** Nächste offene (noch nicht verstrichene) Frist eines Vorgangs. */
function naechsteFrist(v: Vorgang, nowIso: string): { datum: string; days: number } | null {
  const upcoming = (v.fristen ?? [])
    .map((f) => ({ datum: f.datum, days: daysUntil(f.datum, nowIso) }))
    .filter((f): f is { datum: string; days: number } => f.days !== null && f.days >= 0)
    .sort((a, b) => a.days - b.days);
  return upcoming[0] ?? null;
}

/** Pro Vorgangstyp ein passendes Icon (Variation wie auf /lebenslagen). */
const TYP_ICON: Record<string, typeof Home> = {
  umzug: Home,
  anmeldung: Home,
  'aufenthaltstitel-verlaengerung': IdCard,
  familienkasse: Users,
  kindergeburt: Baby,
  eheschliessung: Heart,
  gewerbeanmeldung: Briefcase,
};
function typIcon(typ: string): typeof Home {
  if (typ.startsWith('steuer')) return BadgeEuro;
  return TYP_ICON[typ] ?? FileText;
}

export function VorgaengeView() {
  const [vorgaenge, setVorgaenge] = React.useState<Vorgang[]>([]);
  const [behoerdenById, setBehoerdenById] = React.useState<Record<BehoerdeId, Pick<Behoerde, 'name_de'>>>({});
  const [activeTab, setActiveTab] = React.useState<FilterId>('alle');
  const [query, setQuery] = React.useState('');
  const [nowIso] = React.useState(() => new Date().toISOString());
  const [loaded, setLoaded] = React.useState(false);
  const listRef = React.useRef<HTMLElement>(null);

  React.useEffect(() => {
    let cancelled = false;
    void (async () => {
      for (let attempt = 0; attempt < 3 && !cancelled; attempt++) {
        try {
          const [v, b] = await Promise.all([api.getVorgaenge(), api.getBehoerden()]);
          if (cancelled) return;
          const map: Record<BehoerdeId, Pick<Behoerde, 'name_de'>> = {};
          for (const x of b) map[x.id] = { name_de: x.name_de };
          setBehoerdenById(map);
          setVorgaenge(v);
          return;
        } catch {
          await new Promise((r) => setTimeout(r, 200));
        }
      }
    })().finally(() => {
      if (!cancelled) setLoaded(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const behoerdeName = React.useCallback(
    (id: BehoerdeId | undefined): string => (id ? behoerdenById[id]?.name_de ?? id : ''),
    [behoerdenById],
  );

  /* Counts for tab chips, derived purely from the API response via the shared predicates. */
  const counts = React.useMemo(
    () => ({
      alle: vorgaenge.length,
      laufend: vorgaenge.filter(isLaufend).length,
      warten: vorgaenge.filter(isWarten).length,
      abgeschlossen: vorgaenge.filter(isAbgeschlossen).length,
    }),
    [vorgaenge],
  );

  /* Vorgänge visible under the active tab + free-text search. */
  const visibleVorgaenge = React.useMemo(() => {
    const needle = query.trim().toLowerCase();
    return vorgaenge.filter((v) => {
      if (!matchesTab(v, activeTab)) return false;
      if (needle.length === 0) return true;
      const behoerden = v.beteiligte_behoerden_ids.map((id) => behoerdeName(id).toLowerCase()).join(' ');
      return v.titel.toLowerCase().includes(needle) || behoerden.includes(needle);
    });
  }, [vorgaenge, activeTab, query, behoerdeName]);

  /* Pick the featured (umzug) Vorgang from the visible set — null if no umzug matches. */
  const featuredUmzug = React.useMemo(() => {
    const running = visibleVorgaenge.find((v) => v.typ === 'umzug' && v.status !== 'abgeschlossen');
    return running ?? visibleVorgaenge.find((v) => v.typ === 'umzug') ?? null;
  }, [visibleVorgaenge]);

  const bigVorgang: BigVorgang | null = React.useMemo(() => {
    if (!featuredUmzug) return null;
    const seenBehoerden = new Set<string>();
    const realSteps: BigStep[] = [];
    for (const step of featuredUmzug.schritte) {
      if (step.block === 'C') continue;
      const name = behoerdeName(step.behoerde_id);
      if (seenBehoerden.has(name)) continue;
      seenBehoerden.add(name);
      let state: BigStep['state'] = 'pending';
      if (step.status === 'confirmed') state = 'done';
      else if (
        step.status === 'in_progress' ||
        step.status === 'needs_eid' ||
        step.status === 'pending_eid_confirmation'
      ) {
        state = 'current';
      }
      realSteps.push({
        id: step.id,
        behoerde: name,
        aktion: step.aktion,
        date: state === 'pending' ? 'Ausstehend' : formatDateShort(step.completed_at ?? step.started_at) || undefined,
        state,
      });
    }
    const steps = realSteps.slice(0, 5);
    const doneCount = steps.filter((s) => s.state === 'done').length;
    return {
      id: featuredUmzug.id,
      steps,
      doneCount,
      totalCount: steps.length,
      angelegtAm: formatDateShort(featuredUmzug.angelegt_am),
      href: `/vorgaenge/umzug/run?vorgangId=${encodeURIComponent(featuredUmzug.id)}`,
    };
  }, [featuredUmzug, behoerdeName]);

  /* Badge state for the featured Umzug big card, derived from its actual status. */
  const featuredState: 'abgeschlossen' | 'warten' | 'laufend' | null = React.useMemo(() => {
    if (!featuredUmzug) return null;
    if (isAbgeschlossen(featuredUmzug)) return 'abgeschlossen';
    if (isWarten(featuredUmzug)) return 'warten';
    return 'laufend';
  }, [featuredUmzug]);

  /* Small cards: up to 6 visible Vorgänge (excluding the featured Umzug). */
  const smallVorgaenge: SmallVorgang[] = React.useMemo(() => {
    const filtered = visibleVorgaenge.filter((v) => v.id !== featuredUmzug?.id);
    return filtered.slice(0, 6).map<SmallVorgang>((v, idx) => {
      const frist = naechsteFrist(v, nowIso);
      const done = isAbgeschlossen(v);
      const state: SmallVorgang['state'] = done ? 'abgeschlossen' : isWarten(v) ? 'warten' : 'laufend';
      return {
        id: v.id,
        titel: v.titel,
        primaryBehoerde: behoerdeName(v.beteiligte_behoerden_ids?.[0]),
        typ: v.typ,
        fristIso: frist?.datum,
        fristDays: frist?.days ?? null,
        abgeschlossenAm: formatDateShort(abschlussDatum(v)),
        actionLabel: done ? '' : nextActionLabel(v),
        state,
        href: `/vorgaenge/${encodeURIComponent(v.id)}`,
        tone: SMALL_TONES[idx % SMALL_TONES.length],
      };
    });
  }, [visibleVorgaenge, featuredUmzug, nowIso, behoerdeName]);

  /* Rail numbers — derived purely from the API response. */
  const rail = React.useMemo(() => {
    const offen = vorgaenge.filter((v) => v.status !== 'abgeschlossen' && v.status !== 'abgelehnt').length;
    const fristen14 = vorgaenge.filter((v) =>
      (v.fristen ?? []).some((f) => {
        const d = daysUntil(f.datum, nowIso);
        return d !== null && d >= 0 && d <= 14;
      }),
    ).length;
    return { offen, fristen14, warten: counts.warten };
  }, [vorgaenge, nowIso, counts.warten]);

  /* Rail — Priorisierte Aufgaben: nicht abgeschlossene Vorgänge mit Handlungsbedarf
     (Warten ODER Frist ≤ 14 Tage), nach nächster Frist sortiert, Cap 3. */
  const prioRows: PrioRow[] = React.useMemo(() => {
    return vorgaenge
      .filter((v) => !isAbgeschlossen(v))
      .map((v) => {
        const frist = naechsteFrist(v, nowIso);
        return { vorgang: v, frist };
      })
      .filter(({ vorgang, frist }) => isWarten(vorgang) || (frist !== null && frist.days <= 14))
      .sort((a, b) => (a.frist?.days ?? 9999) - (b.frist?.days ?? 9999))
      .slice(0, 3)
      .map<PrioRow>(({ vorgang, frist }) => ({
        id: vorgang.id,
        action: nextActionLabel(vorgang),
        titel: vorgang.titel,
        days: frist?.days ?? null,
      }));
  }, [vorgaenge, nowIso]);

  /* Rail — Termine & Fristen: alle offenen Fristen nicht abgeschlossener Vorgänge,
     aufsteigend nach Datum, Cap 3. */
  const fristRows: FristRow[] = React.useMemo(() => {
    return vorgaenge
      .filter((v) => !isAbgeschlossen(v))
      .flatMap((v) =>
        (v.fristen ?? []).map((f) => ({
          id: `${v.id}-${f.typ}`,
          titel: v.titel,
          datum: f.datum,
          days: daysUntil(f.datum, nowIso),
        })),
      )
      .filter((f): f is FristRow => f.days !== null && f.days >= 0)
      .sort((a, b) => a.days - b.days)
      .slice(0, 3);
  }, [vorgaenge, nowIso]);

  /* Rail — Warten auf Rückmeldung: laufende Schritte (in_progress mit started_at). */
  const rueckmeldungRows: RueckmeldungRow[] = React.useMemo(() => {
    return vorgaenge
      .flatMap((v) =>
        v.schritte
          .filter((s) => s.status === 'in_progress' && Boolean(s.started_at))
          .map((s) => ({
            id: s.id,
            behoerde: behoerdeName(s.behoerde_id),
            titel: v.titel,
            aktion: s.aktion.split('\n')[0],
            seitDays: daysSince(s.started_at, nowIso),
          })),
      )
      .slice(0, 3);
  }, [vorgaenge, nowIso, behoerdeName]);

  function focusList() {
    listRef.current?.focus();
  }

  if (!loaded) {
    return <VorgaengeSkeleton />;
  }

  const statTiles: Array<{
    id: string;
    icon: typeof FolderOpen;
    tone: IconTone;
    num: number;
    label: string;
    onActivate: () => void;
  }> = [
    {
      id: 'offen',
      icon: FolderOpen,
      tone: 'brand',
      num: rail.offen,
      label: 'Offene Vorgänge',
      onActivate: () => setActiveTab('laufend'),
    },
    {
      id: 'warten',
      icon: Clock,
      tone: 'amber',
      num: counts.warten,
      label: 'Warten auf Sie',
      onActivate: () => setActiveTab('warten'),
    },
    {
      id: 'fristen',
      icon: CalendarDays,
      tone: 'violet',
      num: rail.fristen14,
      label: 'Fristen in 14 Tagen',
      onActivate: () => {
        setActiveTab('alle');
        focusList();
      },
    },
    {
      id: 'fertig',
      icon: CheckCircle2,
      tone: 'green',
      num: counts.abgeschlossen,
      label: 'Abgeschlossen',
      onActivate: () => setActiveTab('abgeschlossen'),
    },
  ];

  return (
    // Kein eigenes <main className="app-content"> — das (app)-Layout stellt
    // bereits main#main-content.app-content; doppelt = doppeltes Padding +
    // doppelte main-Landmark.
    <div>
      <div className="gt-page-head">
        <h1>Vorgänge</h1>
        <div className="sub">Verwalten Sie Ihre Anträge und behördlichen Prozesse an einem Ort.</div>
      </div>

      <div className="vg-stats">
        {statTiles.map((tile) => {
          const Icon = tile.icon;
          return (
            <div key={tile.id} className="stat-tile">
              <div className="st-head">
                <span className={`icon-circle ${tile.tone}`}>
                  <Icon aria-hidden="true" />
                </span>
              </div>
              <div className="st-num">{tile.num}</div>
              <div className="st-sub">{tile.label}</div>
              <button type="button" className="st-cta vg-stat-cta" onClick={tile.onActivate}>
                Ansehen <ChevronRight aria-hidden="true" />
              </button>
            </div>
          );
        })}
      </div>

      <div className="vg-toolbar">
        <div className="tab-chips">
          {(
            [
              { id: 'alle', label: 'Alle', n: counts.alle },
              { id: 'laufend', label: 'Laufend', n: counts.laufend },
              { id: 'warten', label: 'Warten auf Sie', n: counts.warten },
              { id: 'abgeschlossen', label: 'Abgeschlossen', n: counts.abgeschlossen },
            ] as Array<{ id: FilterId; label: string; n: number }>
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={`chip${activeTab === tab.id ? ' active' : ''}`}
              aria-pressed={activeTab === tab.id}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label} <span className="count">{tab.n}</span>
            </button>
          ))}
        </div>
        <div className="vg-search" role="search">
          <label htmlFor="vg-search-input" className="sr-only">
            Vorgänge suchen
          </label>
          <Search className="vg-search-icon" aria-hidden="true" />
          <input
            id="vg-search-input"
            type="search"
            className="vg-search-input"
            placeholder="Vorgänge suchen …"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            autoComplete="off"
          />
        </div>
        <button type="button" className="btn btn-secondary filter" disabled aria-disabled="true">
          <Filter aria-hidden="true" />
          Filter
        </button>
      </div>

      <p className="sr-only" aria-live="polite">
        {visibleVorgaenge.length} Vorgänge angezeigt
      </p>

      <div className="vg-layout">
        <section id="vorgaenge-liste" aria-label="Vorgangsliste" tabIndex={-1} ref={listRef}>
          {bigVorgang ? (
            <div className="vg-big">
              <div className="vg-big-head">
                <span className="icon-circle">
                  <Home aria-hidden="true" />
                </span>
                <div className="grow">
                  <div className="title">Umzug</div>
                  <div className="sub">Ihre Behörden werden automatisch informiert.</div>
                </div>
                <div className="vg-big-meta">
                  <div className="vg-big-meta-top">
                    {featuredState === 'abgeschlossen' ? (
                      <span className="badge green">
                        <span className="dot" style={{ background: 'var(--green-500)' }} />
                        Abgeschlossen
                      </span>
                    ) : featuredState === 'warten' ? (
                      <span className="badge amber">
                        <span className="dot" style={{ background: 'var(--amber-500)' }} />
                        Warten auf Sie
                      </span>
                    ) : (
                      <span className="badge brand">
                        <span className="dot" style={{ background: 'var(--brand-500)' }} />
                        Laufend
                      </span>
                    )}
                    <ChevronUp className="vg-big-chev" aria-hidden="true" />
                  </div>
                  <div className="muted text-xs" style={{ marginTop: 6 }}>
                    Verantwortlich: Sie
                  </div>
                </div>
              </div>

              <div className="fortschritt-card">
                <div className="fortschritt-head">
                  <div className="lbl">Fortschritt</div>
                  <div>
                    {bigVorgang.doneCount} von {bigVorgang.totalCount} abgeschlossen
                  </div>
                </div>
                <div className="steps">
                  {bigVorgang.steps.map((s, i) => (
                    <div
                      key={s.id}
                      className={`step${s.state === 'current' ? ' current' : ''}${s.state === 'pending' ? ' pending' : ''}`}
                    >
                      <div className="dot">
                        {s.state === 'done' ? (
                          <Check style={{ width: 18, height: 18 }} aria-hidden="true" />
                        ) : s.state === 'current' ? (
                          <MoreHorizontal style={{ width: 18, height: 18 }} aria-hidden="true" />
                        ) : null}
                      </div>
                      <div className="t">
                        {i + 1}. {s.behoerde}
                      </div>
                      <div className="s">
                        {s.aktion.split('\n').map((line, li) => (
                          <React.Fragment key={li}>
                            {li > 0 ? <br /> : null}
                            {line}
                          </React.Fragment>
                        ))}
                      </div>
                      {s.date ? <div className="date">{s.date}</div> : null}
                    </div>
                  ))}
                </div>
              </div>

              <div className="vg-big-foot">
                <span className="left">
                  <Clock style={{ width: 14, height: 14 }} aria-hidden="true" />
                  Gestartet: {bigVorgang.angelegtAm}
                </span>
                <Link href={bigVorgang.href} className="btn btn-secondary">
                  Vorgang öffnen <ChevronRight aria-hidden="true" />
                </Link>
              </div>
            </div>
          ) : null}

          {smallVorgaenge.length > 0 ? (
            <div className="vg-cards">
              {smallVorgaenge.map((u) => {
                const Icon = typIcon(u.typ);
                return (
                  <div key={u.id} className="vg-card">
                    <div className="vg-card-head">
                      <span className={`icon-circle ${u.tone}`}>
                        <Icon aria-hidden="true" />
                      </span>
                      <div className="grow">
                        <div className="title">{u.titel}</div>
                        <div className="sub">{u.primaryBehoerde}</div>
                      </div>
                      {u.state === 'abgeschlossen' ? (
                        <span className="badge green">
                          <span className="dot" style={{ background: 'var(--green-500)' }} />
                          Abgeschlossen
                        </span>
                      ) : u.state === 'warten' ? (
                        <span className="badge amber">
                          <span className="dot" style={{ background: 'var(--amber-500)' }} />
                          Warten auf Sie
                        </span>
                      ) : (
                        <span className="badge brand">
                          <span className="dot" style={{ background: 'var(--brand-500)' }} />
                          Laufend
                        </span>
                      )}
                    </div>

                    {u.state === 'abgeschlossen' ? (
                      <div className="vg-naction done">
                        <div className="t">
                          <Check aria-hidden="true" />
                          Abgeschlossen{u.abgeschlossenAm ? ` am ${u.abgeschlossenAm}` : ''}
                        </div>
                        <div className="s">Alle Behörden wurden informiert.</div>
                      </div>
                    ) : (
                      <div className="vg-naction">
                        <div className="vg-naction-main">
                          <span className="lbl">Nächste Aktion</span>
                          <span className="act">{u.actionLabel}</span>
                        </div>
                        {u.fristDays !== null ? (
                          <div className="vg-naction-frist">
                            <span className="d">Fällig in {u.fristDays} Tagen</span>
                            {u.fristIso ? (
                              <span className="dt">am {formatDateShort(u.fristIso)}</span>
                            ) : null}
                          </div>
                        ) : null}
                      </div>
                    )}

                    <div className="vg-card-actions">
                      <Link href={u.href} className="btn btn-secondary">
                        {u.state === 'abgeschlossen' ? 'Vorgang ansehen' : 'Weiter bearbeiten'}
                      </Link>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm vg-kebab"
                        aria-label="Mehr Aktionen"
                        disabled
                        aria-disabled="true"
                      >
                        <MoreVertical aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : null}

          {!bigVorgang && smallVorgaenge.length === 0 ? (
            <div className="vg-empty muted" role="status">
              Keine Vorgänge in dieser Ansicht.
            </div>
          ) : (
            <button type="button" className="btn btn-secondary vg-all" onClick={() => setActiveTab('alle')}>
              Alle Vorgänge anzeigen <ChevronRight aria-hidden="true" />
            </button>
          )}
        </section>

        <aside className="vg-rail" aria-label="Was ist jetzt wichtig?">
          <h2 className="vg-rail-title">Was ist jetzt wichtig?</h2>

          <section className="rail-card">
            <h3>Priorisierte Aufgaben</h3>
            <ul className="rail-list">
              {prioRows.length === 0 ? (
                <li className="rail-row empty">Keine offenen Aufgaben.</li>
              ) : (
                prioRows.map((row) => (
                  <li key={row.id} className="rail-row">
                    <span className="icon-circle amber">
                      <Clock aria-hidden="true" />
                    </span>
                    <span className="rail-body">
                      <span className="rail-strong">{row.action}</span>
                      <span className="rail-sub">{row.titel}</span>
                    </span>
                    {row.days !== null ? (
                      <span className="rail-meta">Fällig in {row.days} Tagen</span>
                    ) : null}
                  </li>
                ))
              )}
            </ul>
            <Link href="/termine" className="link rail-foot">
              Alle Aufgaben ansehen <ChevronRight aria-hidden="true" />
            </Link>
          </section>

          <section className="rail-card">
            <h3>Termine &amp; Fristen</h3>
            <ul className="rail-list">
              {fristRows.length === 0 ? (
                <li className="rail-row empty">Keine offenen Fristen.</li>
              ) : (
                fristRows.map((row) => (
                  <li key={row.id} className="rail-row">
                    <span className="icon-circle violet">
                      <CalendarDays aria-hidden="true" />
                    </span>
                    <span className="rail-body">
                      <span className="rail-strong">Frist in {row.days} Tagen</span>
                      <span className="rail-sub">{row.titel}</span>
                    </span>
                    <span className="rail-meta">Fällig am {formatDateShort(row.datum)}</span>
                  </li>
                ))
              )}
            </ul>
            <Link href="/termine" className="link rail-foot">
              Alle Fristen ansehen <ChevronRight aria-hidden="true" />
            </Link>
          </section>

          <section className="rail-card">
            <h3>Warten auf Rückmeldung</h3>
            <ul className="rail-list">
              {rueckmeldungRows.length === 0 ? (
                <li className="rail-row empty">Keine offenen Rückmeldungen.</li>
              ) : (
                rueckmeldungRows.map((row) => (
                  <li key={row.id} className="rail-row">
                    <span className="icon-circle teal">
                      <Users aria-hidden="true" />
                    </span>
                    <span className="rail-body">
                      <span className="rail-strong">{row.behoerde}</span>
                      <span className="rail-sub">
                        {row.titel} – {row.aktion}
                      </span>
                    </span>
                    <span className="rail-meta">Seit {row.seitDays} Tagen</span>
                  </li>
                ))
              )}
            </ul>
            <Link href="/posteingang" className="link rail-foot">
              Alle offenen Rückmeldungen ansehen <ChevronRight aria-hidden="true" />
            </Link>
          </section>

          <section className="rail-card">
            <h3>Schnellzugriff</h3>
            <ul className="vg-quick">
              <li>
                <Link href="/lebenslagen" className="vg-quick-tile">
                  <FilePlus2 aria-hidden="true" />
                  <span>Neuen Vorgang starten</span>
                  <ChevronRight className="vg-quick-arrow" aria-hidden="true" />
                </Link>
              </li>
              <li>
                <Link href="/lebenslagen" className="vg-quick-tile">
                  <LayoutGrid aria-hidden="true" />
                  <span>Häufige Dienstleistungen</span>
                  <ChevronRight className="vg-quick-arrow" aria-hidden="true" />
                </Link>
              </li>
              <li>
                <Link href="/dokumente" className="vg-quick-tile">
                  <FileText aria-hidden="true" />
                  <span>Unterlagen verwalten</span>
                  <ChevronRight className="vg-quick-arrow" aria-hidden="true" />
                </Link>
              </li>
              <li>
                <Link href="/stammdaten" className="vg-quick-tile">
                  <Settings aria-hidden="true" />
                  <span>Profil &amp; Einstellungen</span>
                  <ChevronRight className="vg-quick-arrow" aria-hidden="true" />
                </Link>
              </li>
            </ul>
          </section>
        </aside>
      </div>
    </div>
  );
}

function VorgaengeSkeleton() {
  const tCommon = useTranslations('common');
  return (
    <div role="status" aria-busy="true">
      <span className="sr-only">{tCommon('loading')}</span>
      <div className="gt-page-head">
        <Skeleton shape="text" className="h-8 w-48" />
        <Skeleton shape="text" className="mt-2 w-72" />
      </div>
      <div className="vg-stats">
        <Skeleton className="h-32 rounded-2xl" />
        <Skeleton className="h-32 rounded-2xl" />
        <Skeleton className="h-32 rounded-2xl" />
        <Skeleton className="h-32 rounded-2xl" />
      </div>
      <div className="vg-layout" style={{ marginTop: 18 }}>
        <div className="flex flex-col gap-6">
          <Skeleton className="h-56 rounded-2xl" />
          <div className="vg-cards">
            <Skeleton className="h-44 rounded-2xl" />
            <Skeleton className="h-44 rounded-2xl" />
            <Skeleton className="h-44 rounded-2xl" />
          </div>
        </div>
        <Skeleton className="h-96 rounded-2xl" />
      </div>
    </div>
  );
}
