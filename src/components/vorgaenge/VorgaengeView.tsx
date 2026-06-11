'use client';

import * as React from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import {
  AlertCircle,
  AlertTriangle,
  Calendar,
  Check,
  ChevronRight,
  ClipboardList,
  Clock,
  Filter,
  Home,
  IdCard,
  MoreHorizontal,
  MoreVertical,
  Users,
} from 'lucide-react';

import { api } from '@/lib/mock-backend';
import { Skeleton } from '@/components/shared/Skeleton';
import type { Behoerde, BehoerdeId, Vorgang } from '@/types';

/* Literal port of docs/design-prototype-v2/vorgaenge.html. */

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

interface SmallVorgang {
  id: string;
  titel: string;
  primaryBehoerde: string;
  typ: string;
  fristIso?: string;
  unterlagenFehlen: boolean;
  abgeschlossen: boolean;
  href: string;
}

interface BigVorgang {
  id: string;
  steps: Array<{ id: string; behoerde: string; aktion: string; date?: string; state: 'done' | 'current' | 'pending' }>;
  doneCount: number;
  totalCount: number;
  angelegtAm: string;
  href: string;
}

export function VorgaengeView() {
  const [vorgaenge, setVorgaenge] = React.useState<Vorgang[]>([]);
  const [behoerdenById, setBehoerdenById] = React.useState<Record<BehoerdeId, Pick<Behoerde, 'name_de'>>>({});
  const [activeTab, setActiveTab] = React.useState<FilterId>('alle');
  const [nowIso] = React.useState(() => new Date().toISOString());
  const [loaded, setLoaded] = React.useState(false);

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

  /* Vorgänge visible under the active tab — drives BOTH the featured card and the small cards. */
  const visibleVorgaenge = React.useMemo(
    () => vorgaenge.filter((v) => matchesTab(v, activeTab)),
    [vorgaenge, activeTab],
  );

  /* Pick the featured (umzug) Vorgang from the visible set — null if no umzug matches the tab. */
  const featuredUmzug = React.useMemo(() => {
    const running = visibleVorgaenge.find((v) => v.typ === 'umzug' && v.status !== 'abgeschlossen');
    return running ?? visibleVorgaenge.find((v) => v.typ === 'umzug') ?? null;
  }, [visibleVorgaenge]);

  const bigVorgang: BigVorgang | null = React.useMemo(() => {
    if (!featuredUmzug) return null;
    const seenBehoerden = new Set<string>();
    const realSteps: BigVorgang['steps'] = [];
    for (const step of featuredUmzug.schritte) {
      if (step.block === 'C') continue;
      const name = behoerdenById[step.behoerde_id]?.name_de ?? step.behoerde_id;
      const key = name;
      if (seenBehoerden.has(key)) continue;
      seenBehoerden.add(key);
      let state: 'done' | 'current' | 'pending' = 'pending';
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
  }, [featuredUmzug, behoerdenById]);

  /* Badge state for the featured Umzug big card, derived from its actual status (not hardcoded). */
  const featuredState: 'abgeschlossen' | 'warten' | 'laufend' | null = React.useMemo(() => {
    if (!featuredUmzug) return null;
    if (isAbgeschlossen(featuredUmzug)) return 'abgeschlossen';
    if (isWarten(featuredUmzug)) return 'warten';
    return 'laufend';
  }, [featuredUmzug]);

  /* Small cards: the other visible Vorgänge (excluding the featured Umzug) under the active tab. */
  const smallVorgaenge: SmallVorgang[] = React.useMemo(() => {
    const filtered = visibleVorgaenge.filter((v) => v.id !== featuredUmzug?.id);
    return filtered.slice(0, 4).map<SmallVorgang>((v) => {
      const primaryId = v.beteiligte_behoerden_ids?.[0];
      const fristen = (v.fristen ?? []).map((f) => f.datum).sort();
      return {
        id: v.id,
        titel: v.titel,
        primaryBehoerde: primaryId ? behoerdenById[primaryId]?.name_de ?? primaryId : '',
        typ: v.typ,
        fristIso: fristen[0],
        unterlagenFehlen: v.context?.unterlagen_fehlen === true,
        abgeschlossen: isAbgeschlossen(v),
        href: `/vorgaenge/${encodeURIComponent(v.id)}`,
      };
    });
  }, [visibleVorgaenge, featuredUmzug, behoerdenById]);

  /* Rail numbers — derived purely from the API response. */
  const rail = React.useMemo(() => {
    const offen = vorgaenge.filter((v) => v.status !== 'abgeschlossen' && v.status !== 'abgelehnt').length;
    const fristen14 = vorgaenge.filter((v) =>
      (v.fristen ?? []).some((f) => {
        const d = daysUntil(f.datum, nowIso);
        return d !== null && d >= 0 && d <= 14;
      }),
    ).length;
    const warten = counts.warten;
    return { offen, fristen14, warten };
  }, [vorgaenge, nowIso, counts.warten]);

  if (!loaded) {
    return <VorgaengeSkeleton />;
  }

  return (
    // Kein eigenes <main className="gt-content"> — das (app)-Layout stellt
    // bereits main#main-content.gt-content; doppelt = doppeltes Padding +
    // doppelte main-Landmark.
    <div>
      <div className="gt-page-head">
        <h1>Vorgänge</h1>
        <div className="sub">Laufende und abgeschlossene Verwaltungsprozesse im Überblick.</div>
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
        <button type="button" className="btn btn-secondary filter" disabled aria-disabled="true">
          <Filter />
          Filter
        </button>
      </div>

      <div className="vg-layout">
        <section id="vorgaenge-liste" aria-label="Vorgangsliste" tabIndex={-1}>
            {bigVorgang ? (
            <div className="vg-big">
              <div className="vg-big-head">
                <span className="icon-circle">
                  <Home />
                </span>
                <div className="grow">
                  <div className="title">Umzug</div>
                  <div className="sub">Ihre Behörden werden automatisch informiert.</div>
                </div>
                <div style={{ textAlign: 'right' }}>
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
                  {bigVorgang.steps.map((s) => (
                    <div
                      key={s.id}
                      className={`step${s.state === 'current' ? ' current' : ''}${s.state === 'pending' ? ' pending' : ''}`}
                    >
                      <div className="dot">
                        {s.state === 'done' ? (
                          <Check style={{ width: 18, height: 18 }} />
                        ) : s.state === 'current' ? (
                          <MoreHorizontal style={{ width: 18, height: 18 }} />
                        ) : null}
                      </div>
                      <div className="t">{s.behoerde}</div>
                      <div className="s">
                        {s.aktion.split('\n').map((line, i) => (
                          <React.Fragment key={i}>
                            {i > 0 ? <br /> : null}
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
                  <Clock style={{ width: 14, height: 14 }} />
                  Gestartet: {bigVorgang.angelegtAm}
                </span>
                <Link href={bigVorgang.href} className="btn btn-secondary">
                  Vorgang öffnen <ChevronRight />
                </Link>
              </div>
            </div>
            ) : null}

          <div className="vg-row">
            {smallVorgaenge.length === 0
              ? null
              : smallVorgaenge.map((u, idx) => {
                  const warten = u.unterlagenFehlen;
                  const done = u.abgeschlossen;
                  const days = daysUntil(u.fristIso, nowIso);
                  const Icon = u.typ === 'aufenthaltstitel-verlaengerung' ? IdCard : Users;
                  const iconToneClass = idx % 2 === 0 ? 'violet' : 'pink';
                  return (
                    <div key={u.id} className="vg-card">
                      <div className="vg-card-head">
                        <span className={`icon-circle ${iconToneClass}`}>
                          <Icon />
                        </span>
                        <div className="grow">
                          <div className="title">{u.titel}</div>
                          <div className="sub">{u.primaryBehoerde}</div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          {done ? (
                            <span className="badge green">
                              <span className="dot" style={{ background: 'var(--green-500)' }} />
                              Abgeschlossen
                            </span>
                          ) : warten ? (
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
                          <div className="muted text-xs" style={{ marginTop: 6 }}>
                            Verantwortlich: Sie
                          </div>
                        </div>
                      </div>
                      {done ? (
                        <div className="frist-box">
                          <div className="t" style={{ color: 'var(--green-700)' }}>
                            <Check style={{ width: 18, height: 18 }} />
                            Abgeschlossen
                          </div>
                          <div className="s">Alle Behörden wurden informiert. Keine Frist offen.</div>
                        </div>
                      ) : warten ? (
                        <div className="frist-box warn">
                          <div className="t">
                            <AlertTriangle />
                            Unterlagen fehlen
                          </div>
                          <div className="s">
                            Bitte laden Sie die fehlenden Dokumente hoch.
                            <br />
                            <span style={{ fontWeight: 600 }}>Seit 2 Tagen offen</span>
                          </div>
                        </div>
                      ) : (
                        <div className="frist-box">
                          <div className="t">
                            <Calendar />
                            {days !== null && days >= 0 ? `Frist in ${days} Tagen` : 'Aktive Frist'}
                          </div>
                          <div className="s">
                            {u.fristIso ? `Fällig am ${formatDateShort(u.fristIso)}` : 'Termin offen'}
                          </div>
                        </div>
                      )}
                      <div className="vg-card-actions">
                        <Link href={u.href} className="btn btn-secondary">
                          {done ? 'Vorgang ansehen' : warten ? 'Unterlagen hochladen' : 'Weiter bearbeiten'}
                        </Link>
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          style={{ height: 32, width: 32, padding: 0 }}
                          aria-label="Mehr Aktionen"
                          disabled
                          aria-disabled="true"
                        >
                          <MoreVertical />
                        </button>
                      </div>
                    </div>
                  );
                })}
          </div>

          {!bigVorgang && smallVorgaenge.length === 0 ? (
            <div className="vg-empty muted" role="status">
              Keine Vorgänge in dieser Ansicht.
            </div>
          ) : null}
        </section>

        <div className="rail-card">
          <h3>Was ist gerade wichtig?</h3>
          <div className="rail-item">
            <span className="icon-circle">
              <ClipboardList />
            </span>
            <div className="grow">
              <div className="n">{rail.offen}</div>
              <div className="lbl">offene Vorgänge</div>
              <a className="link" href="#vorgaenge-liste">
                Ansehen <ChevronRight style={{ width: 12, height: 12 }} />
              </a>
            </div>
          </div>
          <div className="rail-item">
            <span className="icon-circle">
              <Calendar />
            </span>
            <div className="grow">
              <div className="n">{rail.fristen14}</div>
              <div className="lbl">Frist in den nächsten 14 Tagen</div>
              <Link className="link" href="/termine">
                Fristen ansehen <ChevronRight style={{ width: 12, height: 12 }} />
              </Link>
            </div>
          </div>
          <div className="rail-item">
            <span className="icon-circle amber">
              <AlertCircle />
            </span>
            <div className="grow">
              <div className="n">{rail.warten}</div>
              <div className="lbl">Warten auf Ihre Bestätigung</div>
              <a className="link" href="#vorgaenge-liste">
                Ansehen <ChevronRight style={{ width: 12, height: 12 }} />
              </a>
            </div>
          </div>
          <a
            className="link"
            href="#vorgaenge-liste"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 12 }}
          >
            Alle Vorgänge ansehen <ChevronRight style={{ width: 12, height: 12 }} />
          </a>
        </div>
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
      <div className="flex flex-col gap-6">
        <Skeleton className="h-56 rounded-2xl" />
        <Skeleton className="h-24 rounded-2xl" />
        <Skeleton className="h-24 rounded-2xl" />
        <Skeleton className="h-24 rounded-2xl" />
      </div>
    </div>
  );
}
