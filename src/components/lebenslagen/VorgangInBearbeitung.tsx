'use client';

import * as React from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import {
  Activity,
  ChevronRight,
  Clock,
  Fingerprint,
  Gauge,
  Info,
  Landmark,
  ListChecks,
  Loader2,
  Shield,
} from 'lucide-react';

import { ValueReceiptCard } from '@/components/autopilot/ValueReceiptCard';
import { WohngeldFolgeCard } from '@/components/dashboard/WohngeldFolgeCard';
import type { CascadeStepConfig } from '@/lib/mock-backend/lebenslagen/types';
import type { AutopilotStepStatus, ValueReceipt, Vorgang } from '@/types';
import {
  formatHHmm,
  iconForBehoerde,
  iconForStep,
  nodeState,
  splitRechtsgrundlage,
  type CascadeRowData,
} from './lebenslagen-shared';

interface VorgangInBearbeitungProps {
  vorgang: Vorgang;
  rows: CascadeRowData[];
  receipt: ValueReceipt | null;
  filledPct: number;
  heroBadge: { label: string; variant: 'green' | 'red' | 'brand' };
  /** Öffnet den eID-Bestätigungsdialog im Elternteil (setzt eidStepId). */
  onConfirmEid: (stepId: string) => void;
}

/** Erledigt-Haken der Kaskade (Timeline-Knoten + Stellen-Liste, identisch). */
function CascadeCheck() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="vlf-tl-check-svg">
      <path
        d="M5 12.5l4.5 4.5L19 7"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function VorgangInBearbeitung({
  vorgang,
  rows,
  receipt,
  filledPct,
  heroBadge,
  onConfirmEid,
}: VorgangInBearbeitungProps) {
  const tc = useTranslations('lebenslagen.detail.cascade');
  const tl = useTranslations('lebenslagen.detail.laufend');

  const doneCount = React.useMemo(
    () => rows.filter((r) => nodeState(r.step.status) === 'done').length,
    [rows],
  );

  const currentEidStep = React.useMemo(
    () => rows.find((r) => r.step.status === 'pending_eid_confirmation') ?? null,
    [rows],
  );

  const currentPhaseLabel = React.useMemo(() => {
    const active = rows.find((r) => nodeState(r.step.status) === 'current');
    if (active) return active.cfg?.kurzlabel ?? active.behoerdeName;
    const lastDone = [...rows].reverse().find((r) => nodeState(r.step.status) === 'done');
    if (lastDone) return lastDone.cfg?.kurzlabel ?? lastDone.behoerdeName;
    return tl('phase_start');
  }, [rows, tl]);

  function statusBadge(status: AutopilotStepStatus): { label: string; variant: string } {
    if (status === 'confirmed') return { label: tl('status_confirmed'), variant: 'green' };
    if (status === 'failed') return { label: tl('status_failed'), variant: 'red' };
    if (status === 'self_assigned') return { label: tc('skipped'), variant: 'outline' };
    if (status === 'pending_eid_confirmation' || status === 'needs_eid') {
      return { label: tl('status_needs_eid'), variant: 'amber' };
    }
    if (status === 'in_progress') return { label: tl('status_in_progress'), variant: 'brand' };
    return { label: tl('status_pending'), variant: 'outline' };
  }

  function gateChipLabel(gate: CascadeStepConfig['gate'] | undefined): string {
    if (gate === 'eid') return tc('gate_eid');
    if (gate === 'consent') return tc('gate_consent');
    return tc('gate_auto');
  }

  const activityRows = React.useMemo(
    () =>
      rows
        .filter((r) => nodeState(r.step.status) !== 'pending')
        .slice()
        .sort((a, b) => {
          const ta = a.step.completed_at ?? a.step.started_at ?? '';
          const tb = b.step.completed_at ?? b.step.started_at ?? '';
          return tb.localeCompare(ta);
        }),
    [rows],
  );

  const eidBehoerde = currentEidStep?.behoerdeName ?? '';

  return (
    <div className="vlf-layout lk-layout" style={{ marginTop: 20 }}>
      <div className="vlf-main">
        {/* 1) Hero — Bearbeitung läuft */}
        <section className="gt-card vlf-hero" aria-labelledby="vlf-hero-title">
          <div className="vlf-hero-head">
            <span className="vlf-hero-icon" aria-hidden="true">
              <Loader2 className="vlf-spin" />
            </span>
            <div className="vlf-hero-headtext">
              <h2 id="vlf-hero-title" className="vlf-hero-title">
                {tc('running')}
              </h2>
              <p className="vlf-hero-lead">{tc('subline')}</p>
            </div>
            <span className={`badge ${heroBadge.variant} vlf-hero-badge`}>
              {heroBadge.variant === 'brand' ? (
                <span className="vlf-pulse" aria-hidden="true" />
              ) : null}
              {heroBadge.label}
            </span>
          </div>

          <div
            className="vlf-progress"
            role="progressbar"
            aria-valuenow={filledPct}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={tl('progress_aria', { pct: filledPct })}
          >
            <div className="vlf-progress-fill" style={{ width: `${filledPct}%` }} />
          </div>

          <div className="vlf-stats">
            <div className="vlf-stat">
              <div className="vlf-stat-top">
                <span className="vlf-stat-icon" aria-hidden="true">
                  <Gauge />
                </span>
                <div className="vlf-stat-textblock">
                  <div className="vlf-stat-num">{tl('pct_value', { pct: filledPct })}</div>
                  <div className="vlf-stat-lbl">{tl('stat_fortschritt')}</div>
                </div>
              </div>
            </div>
            <div className="vlf-stat">
              <div className="vlf-stat-top">
                <span className="vlf-stat-icon" aria-hidden="true">
                  <ListChecks />
                </span>
                <div className="vlf-stat-textblock">
                  <div className="vlf-stat-num">
                    {tl('schritte_value', { done: doneCount, total: Math.max(rows.length, 1) })}
                  </div>
                  <div className="vlf-stat-lbl">{tl('stat_schritte')}</div>
                </div>
              </div>
            </div>
            <div className="vlf-stat">
              <div className="vlf-stat-top">
                <span className="vlf-stat-icon" aria-hidden="true">
                  <Activity />
                </span>
                <div className="vlf-stat-textblock">
                  <div className="vlf-stat-num vlf-stat-num-sm">{currentPhaseLabel}</div>
                  <div className="vlf-stat-lbl">{tl('stat_phase')}</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 2) eID-Gate — elevated CTA */}
        {currentEidStep ? (
          <section className="gt-card vlf-eid" aria-labelledby="vlf-eid-title">
            <div className="vlf-eid-head">
              <span className="vlf-eid-icon" aria-hidden="true">
                <Fingerprint />
              </span>
              <div className="vlf-eid-headtext">
                <h2 id="vlf-eid-title" className="vlf-eid-title">
                  {tl('eid_title')}
                </h2>
                <p className="vlf-eid-sub">
                  {tl('eid_sub', { behoerde: eidBehoerde })}
                </p>
              </div>
            </div>
            <p className="vlf-eid-recht">{currentEidStep.step.rechtsgrundlage}</p>
            <button
              type="button"
              className="btn btn-primary btn-lg vlf-eid-btn"
              onClick={() => onConfirmEid(currentEidStep.step.id)}
            >
              <Fingerprint aria-hidden="true" />
              {tc('confirm_eid')}
            </button>
            <p className="vlf-eid-note">{tl('eid_note')}</p>
          </section>
        ) : null}

        {/* 3) ValueReceipt (live) */}
        {receipt ? <ValueReceiptCard receipt={receipt} variant="live" /> : null}

        {/* Wohngeld-Folge-Beat (anspruch-arc.md § 4.1, Beat a): direkt unter der
         * Value-Receipt — nur beim Umzug + qualifizierter Persona. Self-fetching;
         * rendert `null`, wenn nicht qualifiziert / dismissed / consent widerrufen. */}
        {receipt && vorgang.typ === 'umzug' && vorgang.persona_id ? (
          <WohngeldFolgeCard personaId={vorgang.persona_id} />
        ) : null}

        {/* 4) Timeline — alle Schritte */}
        <section className="gt-card vlf-timeline-card" aria-labelledby="vlf-tl-title">
          <div className="gt-card-head">
            <h2 id="vlf-tl-title" className="gt-card-title">
              {tl('timeline_title')}
            </h2>
            <span className="badge green vlf-tl-count">
              {tc('behoerden_count', { count: rows.length })}
            </span>
          </div>

          {rows.length === 0 ? (
            <div className="vlf-empty">
              <span className="icon-circle" aria-hidden="true">
                <Landmark />
              </span>
              <p>{tc('preparing')}</p>
            </div>
          ) : (
            <ol className="vlf-timeline">
              {rows.map((r, idx) => {
                const state = nodeState(r.step.status);
                const Icon = iconForStep(r.cfg?.kurzlabel ?? r.step.aktion);
                const sb = statusBadge(r.step.status);
                const ts = formatHHmm(r.step.completed_at ?? r.step.started_at);
                const isLast = idx === rows.length - 1;
                // „§ … · Art. … DSGVO" → norm on line 1, rest as a muted sub-line,
                // matching the completed dossier's 2-line Rechtsgrundlage stack.
                const rechtParts = splitRechtsgrundlage(r.step.rechtsgrundlage);
                return (
                  <li
                    key={r.step.id}
                    className={`vlf-tl-item is-${state}${
                      r.step.status === 'self_assigned' ? ' is-skipped' : ''
                    }`}
                  >
                    <div className="vlf-tl-rail" aria-hidden="true">
                      <span className={`vlf-tl-node is-${state}`}>
                        {state === 'done' ? (
                          <CascadeCheck />
                        ) : state === 'current' ? (
                          <span className="vlf-tl-dot" />
                        ) : (
                          <span className="vlf-tl-num">{idx + 1}</span>
                        )}
                      </span>
                      {!isLast ? (
                        <span
                          className={`vlf-tl-connector${state === 'done' ? ' is-done' : ''}`}
                        />
                      ) : null}
                    </div>

                    <div className="vlf-tl-body">
                      <div className="vlf-tl-headline">
                        <span className="vlf-tl-bicon" aria-hidden="true">
                          <Icon />
                        </span>
                        <span className="vlf-tl-title">{r.behoerdeName}</span>
                        <span className="vlf-tl-chips">
                          <span className={`ll-gate-chip is-${r.cfg?.gate ?? 'auto'}`}>
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
                      <div className="vlf-tl-sub">
                        {r.step.agent_label ?? r.step.aktion}
                      </div>
                      <div className="vlf-tl-recht">
                        {rechtParts.length > 0
                          ? rechtParts.map((p, i) => (
                              <span
                                key={i}
                                className={
                                  i === 0 ? 'vlf-tl-recht-norm' : 'vlf-tl-recht-sub'
                                }
                              >
                                {p}
                              </span>
                            ))
                          : null}
                      </div>
                      <div className="vlf-tl-meta">
                        <span className={`badge ${sb.variant}`}>{sb.label}</span>
                        <span className="vlf-tl-time">
                          {ts ? (
                            <>
                              <Clock aria-hidden="true" />
                              {ts} {tc('uhr')}
                            </>
                          ) : state === 'pending' ? (
                            tc('starting')
                          ) : (
                            '—'
                          )}
                        </span>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </section>

        {/* 5) Zwei-Spalten-Boden */}
        <div className="vlf-bottom">
          <section className="gt-card vlf-stellen" aria-labelledby="vlf-stellen-title">
            <div className="gt-card-head">
              <h2 id="vlf-stellen-title" className="gt-card-title">
                <Landmark aria-hidden="true" />
                {tc('beteiligte_behoerden')}
              </h2>
              <span className="badge green">
                {tc('behoerden_count', { count: rows.length })}
              </span>
            </div>
            <ul className="vlf-stellen-list">
              {rows.map((r) => {
                const state = nodeState(r.step.status);
                const Icon = iconForBehoerde(r.behoerdeName);
                const sb = statusBadge(r.step.status);
                return (
                  <li key={r.step.id} className="vlf-stellen-row">
                    <span
                      className={`icon-circle${state === 'done' ? ' green' : ''} vlf-stellen-icon`}
                      aria-hidden="true"
                    >
                      {state === 'done' ? <CascadeCheck /> : <Icon />}
                    </span>
                    <span className="vlf-stellen-name">{r.behoerdeName}</span>
                    <span className={`badge ${sb.variant}`}>{sb.label}</span>
                  </li>
                );
              })}
            </ul>
            <Link href="/datenschutz" className="vlf-schutz">
              <span className="icon-circle" aria-hidden="true">
                <Shield />
              </span>
              <span className="vlf-schutz-body">
                <span className="vlf-schutz-title">{tc('schutz_title')}</span>
                <span className="vlf-schutz-sub">{tc('schutz_body')}</span>
              </span>
              <ChevronRight className="vlf-schutz-arrow" aria-hidden="true" />
            </Link>
          </section>

          <section className="gt-card vlf-live" aria-labelledby="vlf-live-title">
            <div className="gt-card-head">
              <h2 id="vlf-live-title" className="gt-card-title">
                {tc('live_title')}
              </h2>
            </div>
            <div className="vlf-log-track" aria-live="polite">
              <div className="vlf-log-line" aria-hidden="true" />
              {activityRows.map((r) => {
                const state = nodeState(r.step.status);
                const Icon = iconForBehoerde(r.behoerdeName);
                const sb = statusBadge(r.step.status);
                const ts = formatHHmm(r.step.completed_at ?? r.step.started_at);
                return (
                  <div key={r.step.id} className="vlf-log-item">
                    <div className={`vlf-log-time${state === 'done' ? '' : ' is-active'}`}>
                      {ts ?? ''}
                      <span
                        className={`vlf-log-pip${state === 'done' ? ' is-done' : ' is-active'}`}
                        aria-hidden="true"
                      />
                    </div>
                    <span
                      className={`icon-circle${state === 'done' ? ' green' : ''} vlf-log-icon`}
                      aria-hidden="true"
                    >
                      <Icon />
                    </span>
                    <div className="vlf-log-text">
                      <div className="vlf-log-name">{r.behoerdeName}</div>
                      <div className="vlf-log-sub">{r.step.agent_label ?? r.step.aktion}</div>
                    </div>
                    <span className={`badge ${sb.variant} vlf-log-badge`}>{sb.label}</span>
                  </div>
                );
              })}
              <div className="vlf-log-item">
                <div className="vlf-log-time is-mute">
                  {formatHHmm(vorgang.angelegt_am) ?? ''}
                  <span className="vlf-log-pip is-mute" aria-hidden="true" />
                </div>
                <span className="icon-circle vlf-log-icon" aria-hidden="true">
                  <Info />
                </span>
                <div className="vlf-log-text">
                  <div className="vlf-log-name">{tc('started_title')}</div>
                  <div className="vlf-log-sub">{tc('started_body')}</div>
                </div>
                <span />
              </div>
            </div>
          </section>
        </div>
      </div>

      {/* RIGHT RAIL */}
      <aside className="lk-rail vlf-rail" aria-label={tl('rail_aria')}>
        <section className="gt-card vlf-rail-card vlf-rail-next" aria-labelledby="vlf-next-title">
          <div className="vlf-rail-head">
            <span className="vlf-rail-icon" aria-hidden="true">
              <Loader2 className="vlf-spin" />
            </span>
            <h3 id="vlf-next-title" className="vlf-rail-title">
              {tl('next_title')}
            </h3>
          </div>
          <p className="vlf-rail-body">
            {currentEidStep ? tl('next_body_eid') : tl('next_body')}
          </p>
        </section>

        <section className="gt-card vlf-rail-card" aria-labelledby="vlf-update-title">
          <div className="vlf-rail-head">
            <span className="icon-circle" aria-hidden="true">
              <Clock />
            </span>
            <h3 id="vlf-update-title" className="vlf-rail-title">
              {tl('update_title')}
            </h3>
          </div>
          <p className="vlf-rail-body">{tl('update_body')}</p>
        </section>

        <Link href="/datenschutz" className="gt-card vlf-rail-card vlf-rail-link">
          <div className="vlf-rail-head">
            <span className="icon-circle green" aria-hidden="true">
              <Shield />
            </span>
            <h3 className="vlf-rail-title">{tc('schutz_title')}</h3>
            <ChevronRight className="vlf-rail-arrow" aria-hidden="true" />
          </div>
          <p className="vlf-rail-body">{tc('schutz_body')}</p>
        </Link>
      </aside>
    </div>
  );
}
