'use client';

import * as React from 'react';
import { Suspense, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { format, parseISO } from 'date-fns';
import {
  Check,
  ChevronRight,
  Euro,
  HeartPulse,
  Home,
  Info,
  Landmark,
  Shield,
  Sparkles,
} from 'lucide-react';

import { api } from '@/lib/mock-backend';
import type {
  AutopilotStep,
  AutopilotStepStatus,
  Behoerde,
  BehoerdeId,
  BlockTyp,
  Letter,
  MockBackendEvent,
  Vorgang,
} from '@/types';

/* Literal port of docs/design-prototype-v2/umzug.html.
 * Subscribes to the autopilot tick stream — DO NOT BREAK. */

const BLOCK_RANK: Record<BlockTyp, number> = { A: 0, D: 1, B: 2, C: 99 };

interface CascadeNode {
  stepId: string;
  behoerdeId: BehoerdeId;
  behoerdeName: string;
  status: AutopilotStepStatus;
  aktion: string;
  timestamp: string | null;
}

function formatHHmm(iso?: string): string | null {
  if (!iso) return null;
  try {
    return format(parseISO(iso), 'HH:mm');
  } catch {
    return null;
  }
}

function formatGermanDate(iso?: string): string | null {
  if (!iso) return null;
  try {
    return format(parseISO(iso), 'dd.MM.yyyy');
  } catch {
    return null;
  }
}

const ICONS_BY_BLOCK_OR_NAME = (behoerdeName: string) => {
  const lower = behoerdeName.toLowerCase();
  if (lower.includes('bürger') || lower.includes('burger') || lower.includes('meldebehörde')) return Landmark;
  if (lower.includes('finanzamt')) return Euro;
  if (lower.includes('beitragsservice') || lower.includes('rundfunk')) return Landmark;
  if (lower.includes('bundesdruckerei') || lower.includes('ausweis')) return Shield;
  if (lower.includes('aok') || lower.includes('krankenkasse') || lower.includes('tk ') || lower.startsWith('tk')) return HeartPulse;
  return Landmark;
};

const ICON_TONE_BY_STATE = (state: 'done' | 'current' | 'pending'): string =>
  state === 'done' ? 'green' : state === 'current' ? '' : '';

function nodeState(status: AutopilotStepStatus): 'done' | 'current' | 'pending' {
  if (status === 'confirmed') return 'done';
  if (
    status === 'in_progress' ||
    status === 'needs_eid' ||
    status === 'pending_eid_confirmation'
  ) {
    return 'current';
  }
  return 'pending';
}

function statusLabel(status: AutopilotStepStatus): { label: string; variant: 'green' | 'brand' | 'outline' } {
  if (status === 'confirmed') return { label: 'Abgeschlossen', variant: 'green' };
  if (status === 'failed') return { label: 'Fehlgeschlagen', variant: 'outline' };
  if (
    status === 'in_progress' ||
    status === 'needs_eid' ||
    status === 'pending_eid_confirmation'
  ) {
    return { label: 'In Bearbeitung', variant: 'brand' };
  }
  return { label: 'Ausstehend', variant: 'outline' };
}

function formatRunContext(context: Record<string, unknown> | undefined): { adresse: string; stichtag: string } | null {
  if (!context) return null;
  const adresseValue = context.neue_adresse;
  const stichtagValue = context.stichtag ?? context.stichtag_iso;
  if (typeof stichtagValue !== 'string' || typeof adresseValue !== 'object' || adresseValue === null) {
    return null;
  }
  const a = adresseValue as Record<string, unknown>;
  const strasse = typeof a.strasse === 'string' ? a.strasse : '';
  const hausnummer = typeof a.hausnummer === 'string' ? a.hausnummer : '';
  const plz = typeof a.plz === 'string' ? a.plz : '';
  const ort = typeof a.ort === 'string' ? a.ort : '';
  const adresse = `${strasse} ${hausnummer}, ${plz} ${ort}`.trim();
  const stichtag = formatGermanDate(stichtagValue) ?? stichtagValue;
  return { adresse, stichtag };
}

function UmzugRunInner() {
  const searchParams = useSearchParams();
  const vorgangId = searchParams?.get('vorgangId') ?? null;

  const [vorgang, setVorgang] = useState<Vorgang | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [behoerdenById, setBehoerdenById] = useState<
    Record<BehoerdeId, Pick<Behoerde, 'name_de' | 'kategorie'>>
  >({});
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [lettersById, setLettersById] = useState<Record<string, Pick<Letter, 'aktenzeichen'>>>({});

  /* Initial fetch. With a vorgangId we load that live autopilot session.
   * Without one (the demo entry point) we load the seeded Umzug-Vorgang from
   * the backend so the cascade view is sourced from real mock data and never
   * empty — the same derivation path handles both cases. */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (vorgangId) {
          const v = await api.getVorgang(vorgangId);
          if (!cancelled) setVorgang(v);
        } else {
          const umzuege = await api.getVorgaenge({ typ: 'umzug' });
          if (!cancelled && umzuege.length > 0) setVorgang(umzuege[0]);
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Fehler');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [vorgangId]);

  /* Autopilot tick subscription — DO NOT BREAK. */
  useEffect(() => {
    if (!vorgangId) return;
    const unsubscribe = api.subscribe((event: MockBackendEvent) => {
      if (event.type === 'autopilot_step' && event.vorgangId === vorgangId) {
        setVorgang((prev) => {
          if (!prev) return prev;
          const idx = prev.schritte.findIndex((s) => s.id === event.step.id);
          const nextSteps =
            idx === -1
              ? [...prev.schritte, event.step]
              : prev.schritte.map((s, i) => (i === idx ? event.step : s));
          return { ...prev, schritte: nextSteps };
        });
      }
      if (event.type === 'letter_received') {
        setLettersById((prev) => ({
          ...prev,
          [event.letter.id]: { aktenzeichen: event.letter.aktenzeichen },
        }));
      }
      if (event.type === 'vorgang_status_changed' && event.vorgangId === vorgangId) {
        setVorgang((prev) => (prev ? { ...prev, status: event.status } : prev));
      }
    });
    return () => {
      unsubscribe();
    };
  }, [vorgangId]);

  /* Behörden lookup. */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const list = await api.getBehoerden();
        if (cancelled) return;
        const map: Record<BehoerdeId, Pick<Behoerde, 'name_de' | 'kategorie'>> = {};
        for (const b of list) map[b.id] = { name_de: b.name_de, kategorie: b.kategorie };
        setBehoerdenById(map);
      } catch {
        // names fall back to behoerde_id
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  /* Derive cascade nodes — block C filtered out, sorted A → D → B.
   * While the Vorgang is still loading the empty array yields graceful
   * placeholder slots (see displayNodes). */
  const cascadeNodes: CascadeNode[] = useMemo(() => {
    if (!vorgang) return [];
    return vorgang.schritte
      .map((step, insertionIndex) => ({ step, insertionIndex }))
      .filter(({ step }) => step.block !== 'C')
      .sort((a, b) => {
        const rank = BLOCK_RANK[a.step.block] - BLOCK_RANK[b.step.block];
        return rank !== 0 ? rank : a.insertionIndex - b.insertionIndex;
      })
      .slice(0, 5)
      .map(({ step }) => ({
        stepId: step.id,
        behoerdeId: step.behoerde_id,
        behoerdeName: behoerdenById[step.behoerde_id]?.name_de ?? step.behoerde_id,
        status: step.status,
        aktion: step.aktion,
        timestamp: formatHHmm(step.completed_at ?? step.started_at),
      }));
  }, [vorgang, behoerdenById]);

  /* Pad/truncate to exactly 5 visual slots like the HTML mockup. */
  const displayNodes: Array<CascadeNode | null> = useMemo(() => {
    const arr: Array<CascadeNode | null> = [...cascadeNodes];
    while (arr.length < 5) arr.push(null);
    return arr.slice(0, 5);
  }, [cascadeNodes]);

  /* Filled-bar width = share of done nodes. */
  const filledPct = useMemo(() => {
    const done = cascadeNodes.filter((n) => nodeState(n.status) === 'done').length;
    const total = Math.max(cascadeNodes.length, 1);
    return Math.round((done / total) * 100);
  }, [cascadeNodes]);

  const heroBadge = useMemo(() => {
    const anyRunning = cascadeNodes.some((n) => nodeState(n.status) === 'current');
    const anyPending = cascadeNodes.some((n) => nodeState(n.status) === 'pending');
    if (anyRunning || anyPending) return { label: 'In Bearbeitung', variant: 'brand' as const };
    if (cascadeNodes.some((n) => n.status === 'failed')) return { label: 'Mit Fehlern', variant: 'outline' as const };
    return { label: 'Abgeschlossen', variant: 'green' as const };
  }, [cascadeNodes]);

  const context = useMemo(() => formatRunContext(vorgang?.context), [vorgang]);

  /* Live feed: step events sorted by time DESC + synthetic "gestartet". */
  const liveFeed = useMemo(() => {
    const stepEntries = cascadeNodes
      .filter((n) => nodeState(n.status) !== 'pending')
      .map((n) => {
        const { label, variant } = statusLabel(n.status);
        const state = nodeState(n.status);
        return {
          id: n.stepId,
          time: n.timestamp ?? '',
          pipClass: state === 'done' ? '' : 'brand',
          iconToneClass: state === 'done' ? 'green' : '',
          behoerdeName: n.behoerdeName,
          aktion: n.aktion,
          badgeLabel: label,
          badgeVariant: variant,
        };
      })
      .sort((a, b) => b.time.localeCompare(a.time));

    const synthetic = {
      id: '__started__',
      time: formatHHmm(vorgang?.angelegt_am) ?? '',
      pipClass: 'mute',
      iconToneClass: '',
      behoerdeName: 'Autopilot gestartet',
      aktion: 'Ihre Angaben wurden geprüft und die Kaskade gestartet.',
      badgeLabel: '',
      badgeVariant: 'outline' as const,
    };
    return [...stepEntries, synthetic];
  }, [cascadeNodes, vorgang]);

  return (
    <main className="gt-content">
      <div className="gt-page-head">
        <h1>Umzug auf Autopilot</h1>
        <div className="sub">Sie bestätigen einmal – das System koordiniert die nächsten Schritte.</div>
      </div>

      {error ? (
        <div className="gt-banner amber" role="alert">
          {error}
        </div>
      ) : null}

      <div className="umz-banner">
        <span className="icon-square">
          <Sparkles />
        </span>
        <div className="body grow">
          <div className="t">Kaskade wird ausgeführt</div>
          <div className="s">Ihre Angaben werden sicher an die zuständigen Behörden übermittelt.</div>
        </div>
        <span className={`badge ${heroBadge.variant}`}>
          {heroBadge.variant === 'brand' ? (
            <span className="dot" style={{ background: 'var(--brand-500)' }} />
          ) : null}
          {heroBadge.label}
        </span>
      </div>

      <div className="cascade">
        <div className="cascade-rail">
          <div className="cascade-track">
            <div className="filled" style={{ width: `${filledPct}%` }} />
          </div>
          <div className="cascade-nodes">
            {displayNodes.map((n, i) => {
              const state = n ? nodeState(n.status) : 'pending';
              return (
                <div key={n?.stepId ?? `slot-${i}`} className={`cas-node${state === 'done' ? ' done' : state === 'current' ? ' current' : ''}`}>
                  <div className="ring">
                    {state === 'done' ? <Check /> : null}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="cascade-cards">
          {displayNodes.map((n, i) => {
            if (!n) {
              return (
                <div key={`empty-${i}`} className="cas-card">
                  <span className="icon-circle">
                    <Landmark />
                  </span>
                  <div className="t">—</div>
                  <div className="s">Wird geladen</div>
                  <div className="time">—</div>
                  <span className="badge outline">Ausstehend</span>
                </div>
              );
            }
            const state = nodeState(n.status);
            const Icon = ICONS_BY_BLOCK_OR_NAME(n.behoerdeName);
            const { label, variant } = statusLabel(n.status);
            const iconToneClass = ICON_TONE_BY_STATE(state);
            return (
              <div key={n.stepId} className={`cas-card${state === 'current' ? ' current' : ''}`}>
                <span className={`icon-circle${iconToneClass ? ` ${iconToneClass}` : ''}`}>
                  <Icon />
                </span>
                <div className="t">{n.behoerdeName}</div>
                <div className="s">{n.aktion}</div>
                <div className="time">
                  {n.timestamp ? `${n.timestamp} Uhr` : state === 'pending' ? 'Wird gestartet' : '—'}
                </div>
                <span className={`badge ${variant}`}>{label}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="umz-bottom">
        <div className="umz-card">
          <h3>Ihr Umzug – Übersicht</h3>
          <div className="uebersicht-grid">
            <div className="uebersicht-left">
              <span className="icon-circle">
                <Home />
              </span>
              <div>
                <div className="lbl">Neue Adresse</div>
                <div className="v">{context?.adresse ?? '—'}</div>
                <div style={{ marginTop: 12 }}>
                  <div className="lbl">Einzugsdatum</div>
                  <div className="v">{context?.stichtag ?? '—'}</div>
                </div>
              </div>
            </div>
            <div className="autopilot">
              <div className="head">
                <div className="t">Autopilot-Bereich</div>
                <span className="badge brand">{cascadeNodes.length || 5} Behörden</span>
              </div>
              <div className="lbl">Umfasst</div>
              <div className="auth-list">
                {cascadeNodes.map((n) => (
                  <div key={n.stepId} className="row">
                    <Check />
                    {n.behoerdeName}
                  </div>
                ))}
              </div>
            </div>
          </div>
          <Link href="/datenschutz" className="schutz">
            <span className="icon-circle">
              <Shield />
            </span>
            <div className="body">
              <div className="t">Ihre Daten sind geschützt</div>
              <div className="s">Übermittlung verschlüsselt, nur an zuständige Stellen.</div>
            </div>
            <ChevronRight style={{ color: 'var(--ink-4)' }} />
          </Link>
        </div>

        <div className="umz-card live" style={{ position: 'relative' }}>
          <h3>Live-Aktivitäten</h3>
          <div style={{ position: 'relative' }}>
            <div className="vline" />
            {liveFeed.map((item) => {
              const Icon = item.id === '__started__' ? Info : ICONS_BY_BLOCK_OR_NAME(item.behoerdeName);
              return (
                <div key={item.id} className="item">
                  <div className={`time${item.pipClass ? ` ${item.pipClass}` : ''}`}>
                    {item.time}
                    <span
                      className="pip"
                      style={
                        item.pipClass === 'brand'
                          ? { background: 'var(--brand-500)', borderColor: 'var(--brand-500)' }
                          : item.pipClass === 'mute'
                            ? {}
                            : { background: 'var(--green-500)', borderColor: 'var(--green-500)' }
                      }
                    />
                  </div>
                  <span className={`icon-circle${item.iconToneClass ? ` ${item.iconToneClass}` : ''}`}>
                    <Icon />
                  </span>
                  <div>
                    <div className="t">{item.behoerdeName}</div>
                    <div className="s">{item.aktion}</div>
                  </div>
                  {item.badgeLabel ? (
                    <span className={`badge ${item.badgeVariant}`}>{item.badgeLabel}</span>
                  ) : (
                    <span />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </main>
  );
}

export default function UmzugRunPage() {
  return (
    <Suspense fallback={null}>
      <UmzugRunInner />
    </Suspense>
  );
}
