'use client';

import * as React from 'react';
import { Suspense } from 'react';
import Link from 'next/link';
import { notFound, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { format, parseISO } from 'date-fns';
import {
  Calendar,
  Check,
  ChevronRight,
  FileText,
  Fingerprint,
  Info,
  Landmark,
  Shield,
  Sparkles,
} from 'lucide-react';

import { ValueReceiptCard } from '@/components/autopilot/ValueReceiptCard';
import { EidConfirmDialog } from '@/components/umzug/EidConfirmDialog';
import { api } from '@/lib/mock-backend';
import type {
  CascadeStepConfig,
  LebenslageConfig,
} from '@/lib/mock-backend/lebenslagen/types';
import type {
  AutopilotStep,
  AutopilotStepStatus,
  Behoerde,
  BehoerdeId,
  Document,
  Letter,
  MockBackendEvent,
  Termin,
  ValueReceipt,
  Vorgang,
} from '@/types';
import { BLOCK_RANK, iconForBehoerde } from './lebenslagen-shared';

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

function nodeState(status: AutopilotStepStatus): 'done' | 'current' | 'pending' {
  if (status === 'confirmed') return 'done';
  if (status === 'in_progress' || status === 'needs_eid' || status === 'pending_eid_confirmation') {
    return 'current';
  }
  return 'pending';
}

interface CascadeRow {
  step: AutopilotStep;
  cfg?: CascadeStepConfig;
  behoerdeName: string;
}

function LebenslageCascadeInner({ slug }: { slug: string }) {
  const searchParams = useSearchParams();
  const t = useTranslations();
  const tc = useTranslations('lebenslagen.detail.cascade');
  const td = useTranslations('lebenslagen.detail');
  const tRun = useTranslations('umzug.run');

  const queryVorgangId = searchParams?.get('vorgangId') ?? null;

  const [vorgangId, setVorgangId] = React.useState<string | null>(queryVorgangId);
  const [config, setConfig] = React.useState<LebenslageConfig | null>(null);
  const [notFoundFlag, setNotFoundFlag] = React.useState(false);
  const [vorgang, setVorgang] = React.useState<Vorgang | null>(null);
  const [behoerdenById, setBehoerdenById] = React.useState<Record<BehoerdeId, Behoerde>>({});
  const [receipt, setReceipt] = React.useState<ValueReceipt | null>(null);
  const [related, setRelated] = React.useState<{
    letters: Letter[];
    documents: Document[];
    termine: Termin[];
  }>({ letters: [], documents: [], termine: [] });

  const startedRef = React.useRef(false);
  const receiptFetchedRef = React.useRef(false);
  const relatedFetchedRef = React.useRef(false);

  const [eidStepId, setEidStepId] = React.useState<string | null>(null);

  // Config laden (für gate/zukunft/aktenzeichen-Korrelation + antragslos-Start).
  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const c = await api.getLebenslageConfig(slug);
        if (cancelled) return;
        if (!c) {
          setNotFoundFlag(true);
          return;
        }
        setConfig(c);
      } catch {
        if (!cancelled) setNotFoundFlag(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  // Behörden-Lookup.
  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const list = await api.getBehoerden();
        if (cancelled) return;
        const map: Record<BehoerdeId, Behoerde> = {};
        for (const b of list) map[b.id] = b;
        setBehoerdenById(map);
      } catch {
        /* names fall back to id */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Antragslos-Einstieg: ohne ?vorgangId einmalig die Kaskade starten.
  React.useEffect(() => {
    if (!config) return;
    if (vorgangId) return;
    if (startedRef.current) return;
    startedRef.current = true;
    let cancelled = false;
    (async () => {
      try {
        const { vorgangId: newId } = await api.starteLebenslage(slug, {}, []);
        if (!cancelled) setVorgangId(newId);
      } catch {
        if (!cancelled) setNotFoundFlag(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [config, vorgangId, slug]);

  // Initialer Vorgang-Load.
  React.useEffect(() => {
    if (!vorgangId) return;
    let cancelled = false;
    (async () => {
      try {
        const v = await api.getVorgang(vorgangId);
        if (!cancelled) setVorgang(v);
      } catch {
        if (!cancelled) setNotFoundFlag(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [vorgangId]);

  // Tick-Subscription — projiziert autopilot_step + status auf den lokalen State.
  React.useEffect(() => {
    if (!vorgangId) return;
    const unsubscribe = api.subscribe((event: MockBackendEvent) => {
      if (event.type === 'autopilot_step' && event.vorgangId === vorgangId) {
        setVorgang((prev) => {
          if (!prev) return prev;
          const idx = prev.schritte.findIndex((s) => s.id === event.step.id);
          const next =
            idx === -1
              ? [...prev.schritte, event.step]
              : prev.schritte.map((s, i) => (i === idx ? event.step : s));
          return { ...prev, schritte: next };
        });
      }
      if (event.type === 'vorgang_status_changed' && event.vorgangId === vorgangId) {
        setVorgang((prev) => (prev ? { ...prev, status: event.status } : prev));
      }
    });
    return () => unsubscribe();
  }, [vorgangId]);

  // Value-Receipt + verknüpfte Artefakte bei Abschluss einmalig laden.
  React.useEffect(() => {
    if (!vorgang || !vorgangId || vorgang.status !== 'abgeschlossen') return;
    if (!receiptFetchedRef.current) {
      receiptFetchedRef.current = true;
      void (async () => {
        try {
          const r = await api.getValueReceipt(vorgangId);
          setReceipt(r);
        } catch {
          /* nice-to-have */
        }
      })();
    }
    if (!relatedFetchedRef.current) {
      relatedFetchedRef.current = true;
      void (async () => {
        try {
          const rel = await api.getVorgangRelated(vorgangId);
          setRelated({ letters: rel.letters, documents: rel.documents, termine: rel.termine });
        } catch {
          /* nice-to-have */
        }
      })();
    }
  }, [vorgang, vorgangId]);

  const cfgById = React.useMemo(() => {
    const map: Record<string, CascadeStepConfig> = {};
    if (config && vorgangId) {
      for (const c of config.cascade) map[`${vorgangId}:${c.id}`] = c;
    }
    return map;
  }, [config, vorgangId]);

  // Zeilen: alle Nicht-C-Schritte, sortiert A → D → B (keine Begrenzung).
  const rows: CascadeRow[] = React.useMemo(() => {
    if (!vorgang) return [];
    return vorgang.schritte
      .map((step, insertionIndex) => ({ step, insertionIndex }))
      .filter(({ step }) => step.block !== 'C')
      .sort((a, b) => {
        const rank = BLOCK_RANK[a.step.block] - BLOCK_RANK[b.step.block];
        return rank !== 0 ? rank : a.insertionIndex - b.insertionIndex;
      })
      .map(({ step }) => ({
        step,
        cfg: cfgById[step.id],
        behoerdeName: behoerdenById[step.behoerde_id]?.name_de ?? step.behoerde_id,
      }));
  }, [vorgang, cfgById, behoerdenById]);

  const filledPct = React.useMemo(() => {
    const done = rows.filter((r) => nodeState(r.step.status) === 'done').length;
    return Math.round((done / Math.max(rows.length, 1)) * 100);
  }, [rows]);

  const heroBadge = React.useMemo(() => {
    if (vorgang?.status === 'abgeschlossen') {
      return { label: tRun('status.confirmed'), variant: 'green' as const };
    }
    if (rows.some((r) => r.step.status === 'failed')) {
      return { label: tRun('status.failed'), variant: 'red' as const };
    }
    return { label: tRun('status.in_progress'), variant: 'brand' as const };
  }, [vorgang, rows, tRun]);

  // Der erste offene eID-Schritt ist der „aktuelle" Gate (sequentielle Freigabe).
  const currentEidStep = React.useMemo(
    () => rows.find((r) => r.step.status === 'pending_eid_confirmation') ?? null,
    [rows],
  );

  const eidRow = React.useMemo(
    () => rows.find((r) => r.step.id === eidStepId) ?? null,
    [rows, eidStepId],
  );

  function statusBadge(status: AutopilotStepStatus): { label: string; variant: string } {
    if (status === 'confirmed') return { label: tRun('status.confirmed'), variant: 'green' };
    if (status === 'failed') return { label: tRun('status.failed'), variant: 'red' };
    if (status === 'self_assigned') return { label: tc('skipped'), variant: 'outline' };
    if (status === 'pending_eid_confirmation' || status === 'needs_eid') {
      return { label: tRun('status.needs_eid'), variant: 'amber' };
    }
    if (status === 'in_progress') return { label: tRun('status.in_progress'), variant: 'brand' };
    return { label: tRun('status.pending'), variant: 'outline' };
  }

  function gateChipLabel(gate: CascadeStepConfig['gate'] | undefined): string {
    if (gate === 'eid') return tc('gate_eid');
    if (gate === 'consent') return tc('gate_consent');
    return tc('gate_auto');
  }

  if (notFoundFlag) return notFound();

  const primaryRow = rows.find((r) => r.cfg?.isPrimarySubmission);
  const primaryAz = primaryRow?.cfg?.aktenzeichen;
  const isAntragslos = config?.mode === 'antragslos';
  const isDone = vorgang?.status === 'abgeschlossen';

  return (
    <div>
      <div className="gt-page-head">
        <h1>{config ? t(`lebenslagen.${config.slug}.title`) : tc('running')}</h1>
        <div className="sub">{tc('lead')}</div>
      </div>

      {isAntragslos ? (
        <div className="gt-banner amber ll-zukunft-banner" role="note">
          <Info aria-hidden="true" />
          <div>
            <strong>{td('antragslos.kein_antrag_title')}</strong>{' '}
            {config?.antragslos_note_key
              ? t(config.antragslos_note_key)
              : td('antragslos.kein_antrag_body')}
          </div>
        </div>
      ) : null}

      <div className="umz-banner" style={{ marginTop: 16 }}>
        <span className="icon-square" aria-hidden="true">
          <Sparkles />
        </span>
        <div className="body grow">
          <div className="t">{isDone ? tc('done') : tc('running')}</div>
          <div className="s">{tc('subline')}</div>
        </div>
        <span className={`badge ${heroBadge.variant}`}>
          {heroBadge.variant === 'brand' ? (
            <span className="dot" style={{ background: 'var(--brand-500)' }} />
          ) : null}
          {heroBadge.label}
        </span>
      </div>

      {receipt ? (
        <div style={{ marginTop: 20 }}>
          <ValueReceiptCard receipt={receipt} variant="live" />
        </div>
      ) : null}

      {isDone && (primaryAz || related.letters.length > 0 || related.termine.length > 0) ? (
        <CompletionCard
          aktenzeichen={primaryAz}
          letters={related.letters}
          documents={related.documents}
          termine={related.termine}
        />
      ) : null}

      <div className="cascade">
        <div className="cascade-rail">
          <div className="cascade-track">
            <div className="filled" style={{ width: `${filledPct}%` }} />
          </div>
        </div>

        <ul className="ll-cascade-list">
          {rows.length === 0 ? (
            <li className="cas-card">
              <span className="icon-circle" aria-hidden="true">
                <Landmark />
              </span>
              <div className="t">—</div>
              <div className="s">{tc('preparing')}</div>
            </li>
          ) : (
            rows.map((r) => {
              const state = nodeState(r.step.status);
              const Icon = iconForBehoerde(r.behoerdeName);
              const sb = statusBadge(r.step.status);
              const ts = formatHHmm(r.step.completed_at ?? r.step.started_at);
              const showEid =
                r.step.status === 'pending_eid_confirmation' &&
                currentEidStep?.step.id === r.step.id;
              return (
                <li
                  key={r.step.id}
                  className={`cas-card ll-cas-row${state === 'current' ? ' current' : ''}${
                    r.step.status === 'self_assigned' ? ' is-skipped' : ''
                  }`}
                >
                  <div className="ll-cas-main">
                    <span
                      className={`icon-circle${state === 'done' ? ' green' : ''}`}
                      aria-hidden="true"
                    >
                      {state === 'done' ? <Check /> : <Icon />}
                    </span>
                    <div className="ll-cas-body">
                      <div className="ll-cas-headline">
                        <span className="t">{r.behoerdeName}</span>
                        <span className="ll-cas-chips">
                          <span
                            className={`ll-gate-chip is-${r.cfg?.gate ?? 'auto'}`}
                          >
                            {r.cfg?.gate === 'eid' ? (
                              <Fingerprint aria-hidden="true" />
                            ) : null}
                            {gateChipLabel(r.cfg?.gate)}
                          </span>
                          {r.cfg?.zukunft ? (
                            <span className="ll-zukunft-chip">{tc('zukunft_chip')}</span>
                          ) : null}
                        </span>
                      </div>
                      <div className="s">{r.step.agent_label ?? r.step.aktion}</div>
                      <div className="ll-cas-recht">{r.step.rechtsgrundlage}</div>
                    </div>
                  </div>
                  <div className="ll-cas-foot">
                    <span className="time">
                      {ts ? `${ts} ${tc('uhr')}` : state === 'pending' ? tc('starting') : '—'}
                    </span>
                    <span className={`badge ${sb.variant}`}>{sb.label}</span>
                  </div>
                  {showEid ? (
                    <div className="ll-cas-eid">
                      <button
                        type="button"
                        className="btn btn-primary"
                        onClick={() => setEidStepId(r.step.id)}
                      >
                        <Fingerprint aria-hidden="true" />
                        {tc('confirm_eid')}
                      </button>
                    </div>
                  ) : null}
                </li>
              );
            })
          )}
        </ul>
      </div>

      <div className="umz-bottom">
        <div className="umz-card">
          <h3>{tc('overview_title')}</h3>
          <div className="autopilot">
            <div className="head">
              <div className="t">{tc('beteiligte_behoerden')}</div>
              <span className="badge brand">
                {tc('behoerden_count', { count: rows.length })}
              </span>
            </div>
            <div className="auth-list">
              {rows.map((r) => (
                <div key={r.step.id} className="row">
                  <Check aria-hidden="true" />
                  {r.behoerdeName}
                </div>
              ))}
            </div>
          </div>
          <Link href="/datenschutz" className="schutz">
            <span className="icon-circle" aria-hidden="true">
              <Shield />
            </span>
            <div className="body">
              <div className="t">{tc('schutz_title')}</div>
              <div className="s">{tc('schutz_body')}</div>
            </div>
            <ChevronRight style={{ color: 'var(--ink-4)' }} aria-hidden="true" />
          </Link>
        </div>

        <div className="umz-card live" style={{ position: 'relative' }}>
          <h3>{tc('live_title')}</h3>
          <div style={{ position: 'relative' }} aria-live="polite">
            <div className="vline" aria-hidden="true" />
            {rows
              .filter((r) => nodeState(r.step.status) !== 'pending')
              .slice()
              .sort((a, b) => {
                const ta = a.step.completed_at ?? a.step.started_at ?? '';
                const tb = b.step.completed_at ?? b.step.started_at ?? '';
                return tb.localeCompare(ta);
              })
              .map((r) => {
                const state = nodeState(r.step.status);
                const Icon = iconForBehoerde(r.behoerdeName);
                const sb = statusBadge(r.step.status);
                const ts = formatHHmm(r.step.completed_at ?? r.step.started_at);
                return (
                  <div key={r.step.id} className="item">
                    <div className={`time${state === 'done' ? '' : ' brand'}`}>
                      {ts ?? ''}
                      <span
                        className="pip"
                        style={
                          state === 'done'
                            ? { background: 'var(--green-500)', borderColor: 'var(--green-500)' }
                            : { background: 'var(--brand-500)', borderColor: 'var(--brand-500)' }
                        }
                        aria-hidden="true"
                      />
                    </div>
                    <span
                      className={`icon-circle${state === 'done' ? ' green' : ''}`}
                      aria-hidden="true"
                    >
                      <Icon />
                    </span>
                    <div>
                      <div className="t">{r.behoerdeName}</div>
                      <div className="s">{r.step.agent_label ?? r.step.aktion}</div>
                    </div>
                    <span className={`badge ${sb.variant}`}>{sb.label}</span>
                  </div>
                );
              })}
            <div className="item">
              <div className="time mute">
                {formatHHmm(vorgang?.angelegt_am) ?? ''}
                <span className="pip" aria-hidden="true" />
              </div>
              <span className="icon-circle" aria-hidden="true">
                <Info />
              </span>
              <div>
                <div className="t">{tc('started_title')}</div>
                <div className="s">{tc('started_body')}</div>
              </div>
              <span />
            </div>
          </div>
        </div>
      </div>

      <EidConfirmDialog
        open={eidStepId !== null}
        onOpenChange={(open) => {
          if (!open) setEidStepId(null);
        }}
        behoerdeName={eidRow?.behoerdeName ?? ''}
        title={td('eid_dialog.title')}
        body={td('eid_dialog.body_template', { behoerde: eidRow?.behoerdeName ?? '' })}
        confirmLabel={td('eid_dialog.confirm')}
        cancelLabel={td('eid_dialog.cancel')}
        onConfirm={async () => {
          if (!vorgangId || !eidStepId) return;
          try {
            await api.bestaetigeLebenslageSchritt(vorgangId, eidStepId);
          } finally {
            setEidStepId(null);
          }
        }}
      />
    </div>
  );
}

function CompletionCard({
  aktenzeichen,
  letters,
  documents,
  termine,
}: {
  aktenzeichen?: string;
  letters: Letter[];
  documents: Document[];
  termine: Termin[];
}) {
  const tc = useTranslations('lebenslagen.detail.cascade');
  return (
    <section className="gt-card ll-completion" aria-labelledby="ll-completion-title">
      <div className="gt-card-head">
        <h2 id="ll-completion-title" className="gt-card-title">
          <Check aria-hidden="true" />
          {tc('completion_title')}
        </h2>
      </div>
      {aktenzeichen ? (
        <p className="ll-completion-az">
          <span className="ll-completion-az-lbl">{tc('aktenzeichen')}:</span>{' '}
          <span className="vd-mono">{aktenzeichen}</span>
        </p>
      ) : null}
      <ul className="ll-completion-links">
        {letters.map((l) => (
          <li key={l.id}>
            <Link href={`/posteingang/${encodeURIComponent(l.id)}`} className="ll-completion-link">
              <FileText aria-hidden="true" />
              <span>
                {tc('posteingang_link')}: {l.betreff}
              </span>
            </Link>
          </li>
        ))}
        {documents.map((d) => (
          <li key={d.id}>
            <Link href="/dokumente" className="ll-completion-link">
              <FileText aria-hidden="true" />
              <span>
                {tc('vault_link')}: {d.titel}
              </span>
              <span className="ll-mock-rail">{d.watermark}</span>
            </Link>
          </li>
        ))}
        {termine.map((te) => (
          <li key={te.id}>
            <Link href="/termine" className="ll-completion-link">
              <Calendar aria-hidden="true" />
              <span>
                {tc('termin_vorgemerkt')}: {te.betreff}
                {te.datum ? ` (${formatGermanDate(te.datum)})` : ''}
              </span>
            </Link>
          </li>
        ))}
      </ul>
      <p className="ll-completion-next">{tc('naechster_schritt')}</p>
    </section>
  );
}

export function LebenslageCascade({ slug }: { slug: string }) {
  return (
    <Suspense fallback={null}>
      <LebenslageCascadeInner slug={slug} />
    </Suspense>
  );
}
