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
  ChevronRight,
  ChevronUp,
  Clock,
  FilePlus2,
  FileText,
  Filter,
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
  typ: string;
  titel: string;
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
  kindergeld: Users,
  kindergeburt: Baby,
  eheschliessung: Heart,
  gewerbeanmeldung: Briefcase,
};
function typIcon(typ: string): typeof Home {
  if (typ.startsWith('steuer')) return BadgeEuro;
  return TYP_ICON[typ] ?? FileText;
}

const QUICK_LINKS: Array<{ href: string; icon: typeof FilePlus2; label: string }> = [
  { href: '/lebenslagen', icon: FilePlus2, label: 'Neuen Vorgang starten' },
  { href: '/lebenslagen', icon: LayoutGrid, label: 'Häufige Dienstleistungen' },
  { href: '/dokumente', icon: FileText, label: 'Unterlagen verwalten' },
  { href: '/stammdaten', icon: Settings, label: 'Profil & Einstellungen' },
];

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

  /* Pick the featured Vorgang from the visible set: ein laufender Umzug, sonst
     irgendein Umzug, sonst der jüngste ABGESCHLOSSENE Mehr-Stationen-Vorgang
     (≥3 Schritte — Familie Schmidt: das antragslose Kindergeld). Personas ohne
     passende Akte (Mehmet) bekommen weiterhin keine Big-Card. */
  const featured = React.useMemo(() => {
    const running = visibleVorgaenge.find((v) => v.typ === 'umzug' && v.status !== 'abgeschlossen');
    if (running) return running;
    const umzug = visibleVorgaenge.find((v) => v.typ === 'umzug');
    if (umzug) return umzug;
    const completedChains = visibleVorgaenge
      .filter((v) => isAbgeschlossen(v) && (v.schritte?.length ?? 0) >= 3)
      .sort((a, b) => (abschlussDatum(b) ?? '').localeCompare(abschlussDatum(a) ?? ''));
    return completedChains[0] ?? null;
  }, [visibleVorgaenge]);

  const bigVorgang: BigVorgang | null = React.useMemo(() => {
    if (!featured) return null;
    /* Eine Station pro Behörde: der SPÄTESTE Schritt gewinnt (Position der
       Erst-Nennung bleibt) — beim Kindergeld zeigt die Familienkasse so die
       Festsetzung statt der früheren Konto-Bestätigung. */
    const stepByBehoerde = new Map<string, BigStep>();
    const behoerdenOrder: string[] = [];
    for (const step of featured.schritte) {
      if (step.block === 'C') continue;
      const name = behoerdeName(step.behoerde_id);
      let state: BigStep['state'] = 'pending';
      if (step.status === 'confirmed') state = 'done';
      else if (
        step.status === 'in_progress' ||
        step.status === 'needs_eid' ||
        step.status === 'pending_eid_confirmation'
      ) {
        state = 'current';
      }
      if (!stepByBehoerde.has(name)) behoerdenOrder.push(name);
      stepByBehoerde.set(name, {
        id: step.id,
        behoerde: name,
        aktion: step.aktion,
        date: state === 'pending' ? 'Ausstehend' : formatDateShort(step.completed_at ?? step.started_at) || undefined,
        state,
      });
    }
    const steps = behoerdenOrder
      .map((name) => stepByBehoerde.get(name)!)
      .slice(0, 5);
    const doneCount = steps.filter((s) => s.state === 'done').length;
    return {
      id: featured.id,
      typ: featured.typ,
      titel: featured.typ === 'umzug' ? 'Umzug' : featured.titel,
      steps,
      doneCount,
      totalCount: steps.length,
      angelegtAm: formatDateShort(featured.angelegt_am),
      href: `/vorgaenge/${encodeURIComponent(featured.id)}`,
    };
  }, [featured, behoerdeName]);

  /* Badge state for the featured big card, derived from its actual status. */
  const featuredState: 'abgeschlossen' | 'warten' | 'laufend' | null = React.useMemo(() => {
    if (!featured) return null;
    if (isAbgeschlossen(featured)) return 'abgeschlossen';
    if (isWarten(featured)) return 'warten';
    return 'laufend';
  }, [featured]);

  /* Small cards: up to 6 visible Vorgänge (excluding the featured one). */
  const smallVorgaenge: SmallVorgang[] = React.useMemo(() => {
    const filtered = visibleVorgaenge.filter((v) => v.id !== featured?.id);
    return filtered.slice(0, 6).map<SmallVorgang>((v) => {
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
      };
    });
  }, [visibleVorgaenge, featured, nowIso, behoerdeName]);

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

  /* Rail — Priorisierte Aufgaben: nur Vorgänge, die eine Handlung VON IHNEN
     erfordern (Warten auf Sie). Klar abgegrenzt gegen „Termine & Fristen"
     darunter, das reine Fälligkeits-Termine listet — so erscheint nicht dieselbe
     Zeile doppelt (§B5). Nach nächster Frist sortiert, Cap 3. */
  const prioRows: PrioRow[] = React.useMemo(() => {
    return vorgaenge
      .filter((v) => !isAbgeschlossen(v))
      .map((v) => {
        const frist = naechsteFrist(v, nowIso);
        return { vorgang: v, frist };
      })
      .filter(({ vorgang }) => isWarten(vorgang))
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

  if (!loaded) {
    return <VorgaengeSkeleton />;
  }

  /* Editorial Kennzahlen-Zeile: nur die Werte, die die Filter-Chips unten NICHT
     bereits führen. „Warten auf Sie" und „Abgeschlossen" sind mit den Chips
     (gleiche Zahl, gleiches Label) deckungsgleich und hier weggelassen. */
  const kennzahlen: Array<{ id: string; num: number; label: string }> = [
    { id: 'offen', num: rail.offen, label: 'Offene Vorgänge' },
    { id: 'fristen', num: rail.fristen14, label: 'Fristen in 14 Tagen' },
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

      <dl
        data-testid="vorgaenge-kennzahl-strip"
        className="mb-6 flex flex-col divide-y divide-border border-y border-border sm:mb-7 sm:flex-row sm:divide-x sm:divide-y-0 sm:border-y-0 sm:border-none"
      >
        {kennzahlen.map((k) => (
          <div
            key={k.id}
            className="flex items-baseline gap-2 py-3 sm:flex-col sm:items-start sm:gap-0.5 sm:py-0 sm:pr-10 sm:pl-10 sm:first:pl-0"
          >
            <dt className="order-2 text-sm text-text-secondary sm:order-2">{k.label}</dt>
            <dd className="order-1 m-0 text-2xl font-semibold tabular-nums leading-none text-text-primary sm:order-1 sm:text-3xl">
              {k.num}
            </dd>
          </div>
        ))}
      </dl>

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
                  {React.createElement(typIcon(bigVorgang.typ), {
                    'aria-hidden': true,
                  })}
                </span>
                <div className="grow">
                  <div className="title">{bigVorgang.titel}</div>
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
                  <div className="lbl" id="vg-fortschritt-lbl">
                    Fortschritt
                  </div>
                  <div>
                    {bigVorgang.doneCount} von {bigVorgang.totalCount} abgeschlossen
                  </div>
                </div>
                {/* ≤767px: horizontaler m-shelf (#3d) — als Scroll-Region fokussierbar. */}
                <div
                  className="steps m-shelf vg-steps-shelf"
                  role="group"
                  tabIndex={0}
                  aria-labelledby="vg-fortschritt-lbl"
                  /* Spaltenzahl == Stationenzahl (globals.css-Override) — die
                     frozen repeat(5,1fr)-Regel ließe bei 3 Stationen (Schmidt-
                     Kindergeld) zwei Leerspalten rechts stehen. */
                  style={{ '--vg-steps': bigVorgang.steps.length } as React.CSSProperties}
                >
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
            <ul data-testid="vorgaenge-list" className="m-shelf m-shelf-top vg-list-shelf mt-6 border-t border-border">
              {smallVorgaenge.map((u) => {
                const Icon = typIcon(u.typ);
                return (
                  <li key={u.id} className="border-b border-border">
                    <div className="flex flex-col gap-2 py-4 sm:flex-row sm:items-center sm:gap-4">
                      <div className="flex min-w-0 flex-1 items-start gap-3">
                        <Icon className="mt-0.5 h-5 w-5 shrink-0 text-text-secondary" aria-hidden="true" />
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                            <span className="font-medium text-text-primary" title={u.titel}>
                              {u.titel}
                            </span>
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
                          <p className="mt-0.5 text-sm text-text-secondary">{u.primaryBehoerde}</p>
                          {u.state === 'abgeschlossen' ? (
                            <p className="mt-1 text-sm text-text-secondary">
                              Abgeschlossen{u.abgeschlossenAm ? ` am ${u.abgeschlossenAm}` : ''} · Alle Behörden wurden informiert.
                            </p>
                          ) : (
                            <p className="mt-1 text-sm text-text-secondary">
                              <span className="text-text-primary">Nächste Aktion: {u.actionLabel}</span>
                              {u.fristDays !== null ? (
                                <>
                                  {' · '}Fällig in {u.fristDays} Tagen
                                  {u.fristIso ? ` (am ${formatDateShort(u.fristIso)})` : ''}
                                </>
                              ) : null}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-2 pl-8 sm:pl-0">
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
                  </li>
                );
              })}
            </ul>
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

          <div className="m-shelf m-shelf-top vg-wichtig-shelf">
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
          </div>

          <section className="rail-card">
            <h3>Schnellzugriff</h3>
            <ul className="m-shelf m-shelf-auto vg-quick-shelf">
              {QUICK_LINKS.map(({ href, icon: Icon, label }) => (
                <li key={label} className="border-t border-border first:border-t-0">
                  <Link
                    href={href}
                    className="group flex min-h-11 items-center gap-3 py-2 text-sm font-medium text-text-primary"
                  >
                    <Icon className="h-4 w-4 shrink-0 text-text-secondary" aria-hidden="true" />
                    <span className="flex-1">{label}</span>
                    <ChevronRight
                      className="h-4 w-4 shrink-0 text-text-secondary transition-transform ease-out group-hover:translate-x-1 motion-reduce:transition-none"
                      aria-hidden="true"
                    />
                  </Link>
                </li>
              ))}
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
      <div className="mb-7 flex gap-10">
        <Skeleton className="h-10 w-28 rounded-md" />
        <Skeleton className="h-10 w-36 rounded-md" />
      </div>
      <div className="vg-layout" style={{ marginTop: 18 }}>
        <div className="flex flex-col gap-6">
          <Skeleton className="h-56 rounded-2xl" />
          <div className="flex flex-col">
            <Skeleton className="h-16 rounded-none border-b border-border" />
            <Skeleton className="h-16 rounded-none border-b border-border" />
            <Skeleton className="h-16 rounded-none border-b border-border" />
          </div>
        </div>
        <Skeleton className="h-96 rounded-2xl" />
      </div>
    </div>
  );
}
