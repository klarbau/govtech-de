'use client';

import * as React from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { format, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';
import {
  Award,
  Bell,
  CalendarClock,
  Check,
  ChevronRight,
  Clock,
  Copy,
  ExternalLink,
  FileText,
  Fingerprint,
  Folder,
  Gauge,
  Landmark,
  Lock,
  Minus,
  Play,
  ShieldCheck,
  Users,
} from 'lucide-react';

import type {
  CascadeStepConfig,
  LebenslageConfig,
} from '@/lib/mock-backend/lebenslagen/types';
import type {
  AutopilotStepStatus,
  BehoerdeId,
  Document,
  Letter,
  ValueReceipt,
  Vorgang,
} from '@/types';
import {
  formatHHmm,
  iconForBehoerde,
  iconForStep,
  isDoneStep,
  isEidWaiting,
  isSkippedStep,
  splitRechtsgrundlage,
  type CascadeRowData,
} from './lebenslagen-shared';
import { useCascadeReplay } from './use-cascade-replay';

function formatDay(iso?: string): string | null {
  if (!iso) return null;
  try {
    return format(parseISO(iso), 'd. MMM yyyy', { locale: de });
  } catch {
    return null;
  }
}

function formatVorgangsId(vorgangId: string, primaryAz?: string): string {
  // Prefer the numeric tail of the primary Aktenzeichen (mirrors the mockup's
  // "VG-0471132" ← "…PG-0471132"); else a deterministic 7-digit from the id.
  const azDigits = primaryAz?.match(/(\d{4,})(?!.*\d)/)?.[1];
  if (azDigits) return `VG-${azDigits}`;
  let h = 2166136261;
  for (let i = 0; i < vorgangId.length; i++) {
    h ^= vorgangId.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return `VG-${String((h >>> 0) % 10_000_000).padStart(7, '0')}`;
}

interface VorgangAbgeschlossenProps {
  config: LebenslageConfig;
  vorgang: Vorgang;
  rows: CascadeRowData[];
  receipt: ValueReceipt | null;
  related: { letters: Letter[]; documents: Document[] };
  primaryAz?: string;
  /** Optional page title rendered as the dossier's single <h1> (left of the
   *  overview card). Absent → no <h1> is rendered (graceful fallback). */
  title?: string;
  subtitle?: string;
}

export function VorgangAbgeschlossen({
  config,
  vorgang,
  rows,
  receipt,
  related,
  primaryAz,
  title,
  subtitle,
}: VorgangAbgeschlossenProps) {
  const tc = useTranslations('lebenslagen.detail.cascade');
  const tr = useTranslations('lebenslagen.detail.result');
  const t = useTranslations();

  const [copied, setCopied] = React.useState(false);

  // The parent sorts `rows` in RUN order (A → D → B, an Umzug-parity execution
  // artefact). For the finished dossier we re-sort into the CONFIG authoring
  // order, which is the logical/chronological reading order the mockup shows
  // (Antrag → Auftrag → Begutachtung → Bescheid → Folgeleistungen) — the eID
  // Erstantrag is step 1, not buried after the Bescheid.
  const orderIdx = React.useMemo(() => {
    const m = new Map<string, number>();
    config.cascade.forEach((c, i) => m.set(c.id, i));
    return m;
  }, [config.cascade]);

  const orderedRows = React.useMemo(
    () =>
      rows
        .slice()
        .sort(
          (a, b) =>
            (orderIdx.get(a.cfg?.id ?? '') ?? 999) -
            (orderIdx.get(b.cfg?.id ?? '') ?? 999),
        ),
    [rows, orderIdx],
  );

  // ── Live-Demo replay — extracted verbatim into `useCascadeReplay` (purely
  // local display state; never touches the backend). confirmEid is a local
  // replay tap and must not re-confirm the already-completed Vorgang.
  const { effectiveStatuses, inDemo, demoRunning, play, confirmEid } =
    useCascadeReplay(orderedRows);

  // ── Derived view-state (real or replay) ───────────────────────────────────
  const total = orderedRows.length;
  const eidIdx = effectiveStatuses.findIndex(isEidWaiting);
  const workingIdx = effectiveStatuses.findIndex((s) => s === 'in_progress');
  const confirmedCount = effectiveStatuses.filter(isDoneStep).length;
  const resolvedCount = effectiveStatuses.filter(
    (s) => isDoneStep(s) || isSkippedStep(s),
  ).length;
  const allResolved = total > 0 && resolvedCount === total;
  const displayPct = inDemo
    ? Math.round((resolvedCount / Math.max(total, 1)) * 100)
    : 100;

  const labelOf = React.useCallback(
    (r: CascadeRowData) => r.cfg?.kurzlabel ?? r.step.aktion,
    [],
  );
  const activeIdx = eidIdx >= 0 ? eidIdx : workingIdx;
  const activeRow = activeIdx >= 0 ? orderedRows[activeIdx] : null;

  const confirmedDisplayRows = orderedRows.filter((_, idx) =>
    isDoneStep(effectiveStatuses[idx]),
  );

  const distinctBehoerden = React.useMemo(() => {
    const ids = new Set<BehoerdeId>();
    for (const r of rows) ids.add(r.step.behoerde_id);
    return ids.size;
  }, [rows]);

  const consentTotal = React.useMemo(
    () => rows.filter((r) => r.cfg?.gate === 'consent').length,
    [rows],
  );
  const consentGranted = React.useMemo(
    () =>
      rows.filter((r) => r.cfg?.gate === 'consent' && isDoneStep(r.step.status))
        .length,
    [rows],
  );

  // Ein abgeschlossener Vorgang hat keine „aktuelle Phase" — kurzes
  // „Abgeschlossen" statt des (langen) letzten Step-Namens, der die Überblick-
  // Card sonst vertikal aufbläht. Im Replay (inDemo && !allResolved) bleibt der
  // aktive Step-Name die richtige Info.
  const phaseLabel =
    !inDemo || allResolved
      ? tr('phase_done')
      : activeRow
        ? labelOf(activeRow)
        : tc('preparing');

  const overviewPillLabel = inDemo && !allResolved ? tc('running') : tc('done');

  const nextMode: 'done' | 'eid' | 'working' =
    !inDemo || allResolved ? 'done' : eidIdx >= 0 ? 'eid' : 'working';
  const nextTitle =
    nextMode === 'done'
      ? tr('next_done_title')
      : activeRow
        ? labelOf(activeRow)
        : tc('preparing');
  const nextSub =
    nextMode === 'done'
      ? tr('next_done_sub')
      : nextMode === 'eid'
        ? tr('next_eid_title_sub')
        : tr('next_working_sub', { behoerde: activeRow?.behoerdeName ?? '' });

  const liveMessage = !inDemo
    ? ''
    : allResolved
      ? tr('next_done_title')
      : eidIdx >= 0
        ? `${activeRow ? labelOf(activeRow) : ''} – ${tr('tl_status_eid')}`
        : workingIdx >= 0
          ? `${activeRow ? labelOf(activeRow) : ''} – ${tr('tl_status_running')}`
          : tc('preparing');

  const bescheidLetter = React.useMemo(() => {
    if (related.letters.length === 0) return null;
    return (
      related.letters.find((l) => /bescheid/i.test(l.betreff)) ??
      related.letters[0]
    );
  }, [related.letters]);

  const docCount = related.letters.length + related.documents.length;
  const zeitMin = receipt?.geschaetzte_zeitersparnis_min ?? 0;
  // Ehrlicher Fallback: fehlt der Receipt (der einmalige Fetch auf der Run-Page
  // ist an der 5%-Mock-Fehlerrate gescheitert), keinen falschen „0"-Zahlenclaim
  // rendern, sondern „—" — für jede Lebenslage gleich sinnvoll (kein Receipt →
  // keine Zahl). Kein Retry, nur die Anzeige.
  const zeitDisplay = receipt ? tr('zeit_value', { min: zeitMin }) : '—';
  const ergebnis = config.ergebnis;
  // Prozess-Kennzahlen wie „Abgeschlossen" sind Wörter, keine Zahlen — dann die
  // Text-Behandlung der übrigen Zellen (16px, Umbruch erlaubt) statt der 30px
  // nowrap-Zahlenkachel, die sonst in die Nachbarzelle überläuft.
  const kennzahlIsText = ergebnis ? !/^\d/.test(ergebnis.kennzahl.wert) : false;
  const displayId = formatVorgangsId(vorgang.id, primaryAz);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(displayId);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard not available — link/value still visible */
    }
  }

  function gateBadge(gate: CascadeStepConfig['gate'] | undefined): {
    label: string;
    variant: string;
  } {
    if (gate === 'eid') return { label: tr('tl_kind_eid'), variant: 'green' };
    if (gate === 'consent')
      return { label: tr('gate_consent'), variant: 'brand' };
    return { label: tr('gate_auto'), variant: 'outline' };
  }

  function statusNode(status: AutopilotStepStatus): React.ReactNode {
    if (isDoneStep(status)) {
      return (
        <span className="vab-node is-done">
          {inDemo ? <span className="vab-node-pulse" aria-hidden="true" /> : null}
          <Check aria-hidden="true" />
        </span>
      );
    }
    if (isEidWaiting(status)) {
      return (
        <span className="vab-node is-eid">
          <span className="vab-node-halo is-amber" aria-hidden="true" />
          <Fingerprint aria-hidden="true" />
        </span>
      );
    }
    if (status === 'in_progress') {
      return (
        <span className="vab-node is-working">
          <span className="vab-node-halo" aria-hidden="true" />
          <span className="vab-spinner" aria-hidden="true" />
        </span>
      );
    }
    return <span className="vab-node is-pending" aria-hidden="true" />;
  }

  function statusCell(
    status: AutopilotStepStatus,
    time: string | null,
    skipped: boolean,
  ): React.ReactNode {
    if (skipped) {
      return (
        <span className="vab-tl-status-top">
          <Minus className="vab-tl-status-skip" aria-hidden="true" />
          <span className="vab-tl-status-lbl is-skip">{tc('skipped')}</span>
        </span>
      );
    }
    if (isDoneStep(status)) {
      return (
        <>
          <span className="vab-tl-status-top">
            <Check className="vab-tl-status-check" aria-hidden="true" />
            <span className="vab-tl-status-lbl">{tr('step_done')}</span>
          </span>
          {time ? (
            <span className="vab-tl-time">
              {time} {tc('uhr')}
            </span>
          ) : null}
        </>
      );
    }
    if (isEidWaiting(status)) {
      return (
        <>
          <span className="vab-tl-status-top">
            <Fingerprint className="vab-tl-status-eid" aria-hidden="true" />
            <span className="vab-tl-status-lbl is-eid">{tr('tl_status_eid')}</span>
          </span>
          <span className="vab-tl-status-sub">{tr('tl_status_eid_sub')}</span>
        </>
      );
    }
    if (status === 'in_progress') {
      return (
        <>
          <span className="vab-tl-status-top">
            <span className="vab-spinner vab-spinner-sm" aria-hidden="true" />
            <span className="vab-tl-status-lbl is-run">
              {tr('tl_status_running')}
            </span>
          </span>
          <span className="vab-shimmer" aria-hidden="true" />
        </>
      );
    }
    return (
      <span className="vab-tl-status-top">
        <Clock className="vab-tl-status-queue" aria-hidden="true" />
        <span className="vab-tl-status-lbl is-queue">{tr('tl_status_queue')}</span>
      </span>
    );
  }

  const bescheidHref = bescheidLetter
    ? `/posteingang/${encodeURIComponent(bescheidLetter.id)}`
    : '/posteingang';

  const overviewCard = (
    <section className="gt-card vab-overview" aria-labelledby="vab-overview-title">
      <div className="gt-card-head vab-overview-head">
        <div className="vab-overview-titlewrap">
          <h2 id="vab-overview-title" className="gt-card-title">
            {tr('overview_title')}
          </h2>
          <span
            className={`badge ${inDemo && !allResolved ? 'brand' : 'green'} vab-overview-pill`}
          >
            {overviewPillLabel}
          </span>
        </div>
        <div className="vab-id-row">
          <div className="vab-id">
            <span className="vab-id-lbl">{tr('vorgang_id')}</span>
            <span className="vd-mono vab-id-val">{displayId}</span>
          </div>
          <button
            type="button"
            className="vab-copy"
            onClick={handleCopy}
            aria-label={tr('copy_aria')}
          >
            {copied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
            <span>{copied ? tr('copied') : tr('copy')}</span>
          </button>
        </div>
      </div>

      {primaryAz ? (
        <p className="vab-az">
          <span className="vab-az-lbl">{tc('aktenzeichen')}:</span>{' '}
          <span className="vd-mono">{primaryAz}</span>
        </p>
      ) : null}

      <div className="vab-stats">
        <div className="vab-stat vab-stat-progress">
          <div className="vab-stat-top">
            <span className="vab-stat-icon" aria-hidden="true">
              <Gauge />
            </span>
            <div className="vab-stat-textblock">
              <div className="vab-stat-num">
                {tr('fortschritt_value', { pct: displayPct })}
              </div>
              <div className="vab-stat-lbl">{tr('stat_fortschritt')}</div>
            </div>
          </div>
          <div
            className="vab-progress"
            role="progressbar"
            aria-valuenow={displayPct}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={tr('progress_aria', { pct: displayPct })}
          >
            <div className="vab-progress-fill" style={{ width: `${displayPct}%` }} />
          </div>
        </div>

        <div className="vab-stat">
          <div className="vab-stat-top">
            <span className="vab-stat-icon" aria-hidden="true">
              <Clock />
            </span>
            <div className="vab-stat-textblock">
              <div className="vab-stat-num">{zeitDisplay}</div>
              <div className="vab-stat-lbl">{tr('stat_zeit_ca')}</div>
            </div>
          </div>
        </div>

        <div className="vab-stat">
          <div className="vab-stat-top">
            <span className="vab-stat-icon" aria-hidden="true">
              <Award />
            </span>
            <div className="vab-stat-textblock">
              <div className="vab-stat-num vab-stat-num-sm">{phaseLabel}</div>
              <div className="vab-stat-lbl">{tr('stat_phase')}</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );

  return (
    <div className="vab-layout lk-layout" style={{ marginTop: 20 }}>
      <div className="vab-main">
        <p className="vab-sr-live" role="status" aria-live="polite">
          {liveMessage}
        </p>

        {/* 1) Side-by-side title + overview */}
        {title ? (
          <div className="vab-tophead">
            <div className="vab-tophead-intro">
              <h1 className="vab-tophead-h1">{title}</h1>
              {subtitle ? <p className="vab-tophead-sub">{subtitle}</p> : null}
            </div>
            {overviewCard}
          </div>
        ) : (
          overviewCard
        )}

        {/* 2) Gesamtergebnis */}
        <section className="gt-card vab-result" aria-labelledby="vab-result-title">
          <div className="gt-card-head">
            <h2 id="vab-result-title" className="gt-card-title">
              {tr('result_title')}
            </h2>
          </div>
          <div className="vab-result-grid">
            <div className="vab-result-cell vab-result-cell-a">
              <span className="icon-circle green" aria-hidden="true">
                <Check />
              </span>
              <div className="vab-result-a-body">
                <div className="vab-result-a-head">{tr('result_status')}</div>
                <p className="vab-result-a-text">
                  {ergebnis ? t(ergebnis.lead_key) : tr('result_lead')}
                </p>
                <Link href={bescheidHref} className="vab-btn">
                  <span>{tr('bescheid_link')}</span>
                  <ExternalLink aria-hidden="true" />
                </Link>
              </div>
            </div>

            {ergebnis ? (
              <>
                <div className="vab-result-cell">
                  <span className="vab-result-icon" aria-hidden="true">
                    <ShieldCheck />
                  </span>
                  <div className="vab-result-lbl">{t(ergebnis.kennzahl.label_key)}</div>
                  <div
                    className={`vab-result-num${kennzahlIsText ? ' vab-result-num-txt' : ''}`}
                  >
                    {ergebnis.kennzahl.wert}
                    {ergebnis.kennzahl.mock ? (
                      <span className="vab-result-mock">{tr('mock_tag')}</span>
                    ) : null}
                  </div>
                  <div className="vab-result-sub">{t(ergebnis.kennzahl.sub_key)}</div>
                </div>

                <div className="vab-result-cell">
                  <span className="vab-result-icon" aria-hidden="true">
                    <Bell />
                  </span>
                  <div className="vab-result-lbl">{t(ergebnis.status.label_key)}</div>
                  <div className="vab-result-num vab-result-num-txt">
                    {t(ergebnis.status.wert_key)}
                  </div>
                  <div className="vab-result-sub">{t(ergebnis.status.sub_key)}</div>
                </div>

                <div className="vab-result-cell">
                  <span className="vab-result-icon" aria-hidden="true">
                    <Landmark />
                  </span>
                  <div className="vab-result-lbl">{tr('stat_stellen')}</div>
                  <div className="vab-result-num vab-result-num-txt">
                    {tr('result_cell_stellen_val', { count: distinctBehoerden })}
                  </div>
                  <div className="vab-result-sub">{tr('result_cell_stellen_sub')}</div>
                </div>
              </>
            ) : (
              <>
                <div className="vab-result-cell">
                  <span className="vab-result-icon" aria-hidden="true">
                    <ShieldCheck />
                  </span>
                  <div className="vab-result-lbl">{tr('stat_stellen')}</div>
                  <div className="vab-result-num">{distinctBehoerden}</div>
                  <div className="vab-result-sub">{tr('result_cell_stellen_sub')}</div>
                </div>

                <div className="vab-result-cell">
                  <span className="vab-result-icon" aria-hidden="true">
                    <Bell />
                  </span>
                  <div className="vab-result-lbl">{tr('stat_nachweise')}</div>
                  <div className="vab-result-num">{docCount}</div>
                  <div className="vab-result-sub">{tr('result_cell_nachweise_sub')}</div>
                </div>

                <div className="vab-result-cell">
                  <span className="vab-result-icon" aria-hidden="true">
                    <Landmark />
                  </span>
                  <div className="vab-result-lbl">{tr('stat_zeit_ca')}</div>
                  <div className="vab-result-num vab-result-num-sm">
                    {zeitDisplay}
                  </div>
                  <div className="vab-result-sub">
                    {tr('result_cell_zeit_sub')}
                    <span className="vab-synthetic">{tr('synthetic_note')}</span>
                  </div>
                </div>
              </>
            )}
          </div>
        </section>

        {/* 3) Alle Schritte im Überblick — + Live-Demo player */}
        <section className="gt-card vab-timeline-card" aria-labelledby="vab-timeline-title">
          <div className="gt-card-head vab-timeline-head">
            <h2 id="vab-timeline-title" className="gt-card-title">
              {tr('timeline_title')}
            </h2>
            {total > 0 ? (
              <button
                type="button"
                className="vab-demo-btn"
                onClick={play}
                disabled={demoRunning}
                aria-pressed={demoRunning}
                aria-label={tr('demo_aria')}
              >
                <Play aria-hidden="true" />
                <span>{demoRunning ? tr('demo_playing') : tr('demo_play')}</span>
              </button>
            ) : null}
          </div>
          <ol className="vab-timeline">
            {orderedRows.map((r, idx) => {
              const Icon = iconForStep(r.cfg?.kurzlabel ?? r.step.aktion);
              const gb = gateBadge(r.cfg?.gate);
              const status = effectiveStatuses[idx];
              const skipped = isSkippedStep(status);
              const done = isDoneStep(status);
              const ts = formatHHmm(r.step.completed_at ?? r.step.started_at);
              const no = String(idx + 1).padStart(2, '0');
              const isFirst = idx === 0;
              const isLast = idx === orderedRows.length - 1;
              // „§ 18a SGB XI · Art. 6 … DSGVO" → norm on line 1, the rest as a
              // muted sub-line, so a compound Rechtsgrundlage reads as a clean
              // 2-line stack instead of an arbitrary mid-word wrap.
              const rechtParts = splitRechtsgrundlage(r.step.rechtsgrundlage);
              return (
                <li
                  key={r.step.id}
                  className={`vab-tl-row${skipped ? ' is-skipped' : ''}`}
                >
                  <div className="vab-tl-rail" aria-hidden="true">
                    <span
                      className={`vab-tl-line${isFirst ? ' is-first' : ''}${
                        isLast ? ' is-last' : ''
                      }`}
                    />
                    <span
                      className={`vab-tl-line-fill${isFirst ? ' is-first' : ''}${
                        isLast ? ' is-last' : ''
                      }${done ? ' is-on' : ''}`}
                    />
                    <span className="vab-tl-nodewrap">{statusNode(status)}</span>
                  </div>

                  <span className="vab-tl-bicon" aria-hidden="true">
                    <Icon />
                  </span>

                  <div className="vab-tl-titlewrap">
                    <span className="vab-tl-no" aria-hidden="true">
                      {no}
                    </span>
                    <span className="vab-tl-title">
                      {r.cfg?.kurzlabel ?? r.step.aktion}
                    </span>
                  </div>

                  <div className="vab-tl-org">
                    <span className="vab-tl-org-name">{r.behoerdeName}</span>
                    {r.step.agent_label ? (
                      <span className="vab-tl-org-sub">{r.step.agent_label}</span>
                    ) : null}
                  </div>

                  <div className="vab-tl-recht">
                    {rechtParts.map((p, i) => (
                      <span
                        key={i}
                        className={i === 0 ? 'vab-tl-recht-norm' : 'vab-tl-recht-sub'}
                      >
                        {p}
                      </span>
                    ))}
                  </div>

                  <div className="vab-tl-kind">
                    {/* A skipped consent step never took the consent path — show a
                        neutral „Nicht erteilt" instead of the affirmative gate badge. */}
                    <span className={`badge ${skipped ? 'outline' : gb.variant}`}>
                      {skipped ? tr('gate_nicht_erteilt') : gb.label}
                    </span>
                    {r.cfg?.zukunft ? (
                      <span className="badge amber">{tc('zukunft_chip')}</span>
                    ) : null}
                  </div>

                  <div className="vab-tl-status">{statusCell(status, ts, skipped)}</div>
                </li>
              );
            })}
          </ol>
          <p className="vab-tl-dsgvo">
            <Lock aria-hidden="true" />
            {tr('dsgvo_micro')}
          </p>
        </section>

        {/* 4) Zwei-Spalten-Boden */}
        <div className="vab-bottom">
          <section className="gt-card vab-docs" aria-labelledby="vab-docs-title">
            <div className="gt-card-head">
              <h2 id="vab-docs-title" className="gt-card-title">
                {tr('docs_title')}
              </h2>
            </div>
            <ul className="vab-doc-list">
              {related.letters.map((l) => {
                const day = formatDay(l.empfangen_am);
                return (
                  <li key={l.id} className="vab-doc-row">
                    <span className="icon-circle" aria-hidden="true">
                      <FileText />
                    </span>
                    <div className="vab-doc-body">
                      <span className="vab-doc-name">{l.betreff}</span>
                      {day ? (
                        <span className="vab-doc-meta">
                          {tr('docs_created', { date: day })}
                        </span>
                      ) : null}
                    </div>
                    <Link
                      href={`/posteingang/${encodeURIComponent(l.id)}`}
                      className="vab-doc-btn"
                    >
                      {tr('anzeigen')}
                    </Link>
                  </li>
                );
              })}
              {related.documents.map((d) => {
                const day = formatDay(d.ausgestellt_am);
                return (
                  <li key={d.id} className="vab-doc-row">
                    <span className="icon-circle" aria-hidden="true">
                      <FileText />
                    </span>
                    <div className="vab-doc-body">
                      <span className="vab-doc-name">
                        {d.titel}
                        <span className="vab-doc-mock">{d.watermark}</span>
                      </span>
                      {day ? (
                        <span className="vab-doc-meta">
                          {tr('docs_created', { date: day })}
                        </span>
                      ) : null}
                    </div>
                    <Link href="/dokumente" className="vab-doc-btn">
                      {tr('anzeigen')}
                    </Link>
                  </li>
                );
              })}
            </ul>

            <div className="vab-allesort">
              <span className="icon-circle green" aria-hidden="true">
                <Folder />
              </span>
              <div className="vab-allesort-body">
                <div className="vab-allesort-title">{tr('allesort_title')}</div>
                <p className="vab-allesort-text">{tr('allesort_body')}</p>
                <Link href="/posteingang" className="vab-btn">
                  <span>{tr('zum_posteingang')}</span>
                  <ExternalLink aria-hidden="true" />
                </Link>
              </div>
            </div>

            <Link href="/posteingang" className="vab-link vab-docs-all">
              {tr('alle_dokumente')}
              <ChevronRight aria-hidden="true" />
            </Link>
          </section>

          <section className="gt-card vab-log" aria-labelledby="vab-log-title">
            <div className="gt-card-head">
              <h2 id="vab-log-title" className="gt-card-title">
                {tr('log_title')}
              </h2>
            </div>
            <ul className="vab-alog">
              {confirmedDisplayRows.map((r) => {
                const Icon = iconForBehoerde(r.behoerdeName);
                const ts = formatHHmm(r.step.completed_at ?? r.step.started_at);
                return (
                  <li key={r.step.id} className="vab-alog-row">
                    <span className="vab-alog-time">{ts ?? ''}</span>
                    <span className="vab-alog-icon" aria-hidden="true">
                      <Icon />
                    </span>
                    <span className="vab-alog-text">
                      {r.step.agent_label ?? r.step.aktion}
                    </span>
                  </li>
                );
              })}
            </ul>
            <Link href="/posteingang" className="vab-link vab-log-all">
              {tr('log_all')}
              <ChevronRight aria-hidden="true" />
            </Link>
          </section>
        </div>
      </div>

      {/* RIGHT RAIL */}
      <aside className="lk-rail vab-rail" aria-label={tr('rail_aria')}>
        {/* Nächster Schritt — status-aware */}
        <section className="gt-card vab-rail-card vab-next" aria-labelledby="vab-next-title">
          <div className="vab-next-body">
            <div className="vab-next-eyebrow">{tr('next_title')}</div>
            <h3 id="vab-next-title" className="vab-next-title">
              {nextTitle}
            </h3>
            <p className="vab-next-sub">{nextSub}</p>
            <div className="vab-next-cta">
              {nextMode === 'eid' ? (
                <button type="button" className="vab-eid-btn" onClick={confirmEid}>
                  <Fingerprint aria-hidden="true" />
                  <span>{tc('confirm_eid')}</span>
                </button>
              ) : (
                <Link href={bescheidHref} className="vab-btn">
                  <span>{tr('details_ansehen')}</span>
                  <ChevronRight aria-hidden="true" />
                </Link>
              )}
            </div>
          </div>
          <span className={`vab-next-circle is-${nextMode}`} aria-hidden="true">
            {nextMode === 'done' ? (
              <Check />
            ) : nextMode === 'eid' ? (
              <>
                <span className="vab-node-halo is-amber" />
                <Fingerprint />
              </>
            ) : (
              <>
                <span className="vab-node-halo" />
                <span className="vab-spinner" />
              </>
            )}
          </span>
        </section>

        {/* Ihre Kontrolle — grouped card */}
        <section className="gt-card vab-kontrolle" aria-labelledby="vab-kontrolle-title">
          <h3 id="vab-kontrolle-title" className="vab-rail-title vab-kontrolle-title">
            {tr('kontrolle_title')}
          </h3>
          <ul className="vab-kontrolle-list">
            <li>
              <Link href="/datenschutz" className="vab-kontrolle-row is-link">
                <span className="icon-circle" aria-hidden="true">
                  <ShieldCheck />
                </span>
                <span className="vab-kontrolle-body">
                  <span className="vab-kontrolle-title-row">{tr('consent_title')}</span>
                  <span className="vab-kontrolle-val">
                    {tr('consent_count', { granted: consentGranted, total: consentTotal })}
                  </span>
                  <span className="vab-kontrolle-sub">{tr('consent_revoke')}</span>
                </span>
                <ChevronRight className="vab-kontrolle-chev" aria-hidden="true" />
              </Link>
            </li>
            <li>
              <Link href="/datenschutz" className="vab-kontrolle-row is-link">
                <span className="icon-circle" aria-hidden="true">
                  <Lock />
                </span>
                <span className="vab-kontrolle-body">
                  <span className="vab-kontrolle-title-row">{tr('datenschutz_title')}</span>
                  <span className="vab-kontrolle-sub">{tr('datenschutz_body')}</span>
                </span>
                <ChevronRight className="vab-kontrolle-chev" aria-hidden="true" />
              </Link>
            </li>
            <li>
              <div className="vab-kontrolle-row">
                <span className="icon-circle" aria-hidden="true">
                  <CalendarClock />
                </span>
                <span className="vab-kontrolle-body">
                  <span className="vab-kontrolle-title-row">{tr('update_title')}</span>
                  <span className="vab-kontrolle-val">{tr('update_eta')}</span>
                  <span className="vab-kontrolle-sub">{tr('update_body')}</span>
                </span>
              </div>
            </li>
            <li>
              <div className="vab-kontrolle-row">
                <span className="icon-circle" aria-hidden="true">
                  <Users />
                </span>
                <span className="vab-kontrolle-body">
                  <span className="vab-kontrolle-title-row">{tr('inst_title')}</span>
                  <span className="vab-kontrolle-val">
                    {tr('inst_count', { count: distinctBehoerden })}
                  </span>
                  <span className="vab-kontrolle-sub">{tr('inst_note')}</span>
                </span>
              </div>
            </li>
          </ul>
        </section>

        {/* Was wurde bereits erledigt? */}
        <section
          className="gt-card vab-rail-card vab-checklist"
          aria-labelledby="vab-check-title"
        >
          <h3 id="vab-check-title" className="vab-rail-title vab-checklist-title">
            {tr('checklist_title')}
          </h3>
          <ul className="vab-check-list">
            {orderedRows.map((r, idx) => {
              const done = isDoneStep(effectiveStatuses[idx]);
              if (!inDemo && !done) return null;
              return (
                <li key={r.step.id} className={done ? '' : 'is-pending'}>
                  {done ? (
                    <Check aria-hidden="true" />
                  ) : (
                    <span className="vab-check-dot" aria-hidden="true" />
                  )}
                  <span>{r.cfg?.kurzlabel ?? r.step.aktion}</span>
                </li>
              );
            })}
          </ul>
        </section>

        {/* Ihre Daten sind geschützt */}
        <Link href="/datenschutz" className="gt-card vab-rail-item vab-rail-schutz">
          <span className="icon-circle green" aria-hidden="true">
            <ShieldCheck />
          </span>
          <div className="vab-rail-item-body">
            <div className="vab-rail-item-title">{tr('schutz_title')}</div>
            <div className="vab-rail-item-sub">{tr('schutz_body')}</div>
          </div>
          <ChevronRight className="vab-rail-chev" aria-hidden="true" />
        </Link>
      </aside>
    </div>
  );
}
