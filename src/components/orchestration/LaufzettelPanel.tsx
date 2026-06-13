'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { format, parseISO } from 'date-fns';
import {
  CheckCircle2,
  ChevronDown,
  Link2,
  ScrollText,
  ShieldCheck,
  XCircle,
} from 'lucide-react';

import { MockWatermarkBanner } from '@/components/shared/MockWatermarkBanner';
import { api } from '@/lib/mock-backend';
import { cn } from '@/lib/utils';
import type { AuditLogEntry, BehoerdeId, Behoerde } from '@/types';

import { AUDIT_EVENT_META, AUDIT_TONE_CLASS } from './audit-event-meta';
import { useOrchestrationState } from './use-orchestration-state';
import { ResilienceStatusBar } from './ResilienceStatusBar';

interface LaufzettelPanelProps {
  sagaId: string;
  /**
   * 'inline' renders a compact, collapsible panel under the in-thread cascade;
   * 'inspector' renders the expanded "Engine-Protokoll" section on the run page.
   */
  variant: 'inline' | 'inspector';
  /** Behörde-id → display name lookup for receipt rows. */
  behoerdenById?: Record<BehoerdeId, Pick<Behoerde, 'name_de'>>;
  className?: string;
}

type VerifyResult =
  | { state: 'idle' }
  | { state: 'checking' }
  | { state: 'ok'; count: number }
  | { state: 'broken'; seq: number };

function formatTs(iso: string): string {
  try {
    return format(parseISO(iso), 'dd.MM.yyyy HH:mm:ss');
  } catch {
    return iso;
  }
}

function shortHash(hash: string): string {
  if (!hash) return '∅';
  return hash.slice(0, 8);
}

/**
 * `<LaufzettelPanel>` (Spec § 6.1/§ 6.2/§ 6.4) — the append-only audit-trail
 * panel for one Umzug saga. Renders the hash-chained `AuditLogEntry[]` as an
 * ordered, live-updating list (each row shows seq, timestamp, the DE event
 * label, the Behörde, and — for STEP_RECEIPT rows — the OSCI/XTA-shaped Quittung
 * + Laufzettel data), a one-tap "Protokoll prüfen" (verifyChain) tamper proof,
 * and the honest partial-failure (compensation) summary.
 *
 * Honesty (§ 10): every surface carries a [MOCK] marker; copy says
 * tamper-EVIDENT, OSCI/XTA-inspired (not real). a11y: the scroll region is
 * focusable with an accessible name; new entries announce via aria-live.
 */
export function LaufzettelPanel({
  sagaId,
  variant,
  behoerdenById = {},
  className,
}: LaufzettelPanelProps) {
  const t = useTranslations('orchestration');
  const { audit, dlq, breakers, status } = useOrchestrationState(sagaId);

  const [verify, setVerify] = useState<VerifyResult>({ state: 'idle' });
  const [open, setOpen] = useState(variant === 'inspector');
  const liveRef = useRef<HTMLOListElement | null>(null);

  const onVerify = useCallback(() => {
    setVerify({ state: 'checking' });
    void (async () => {
      try {
        const result = await api.verifyChain();
        setVerify(
          result.ok
            ? { state: 'ok', count: result.count }
            : { state: 'broken', seq: result.brokenAtSeq ?? -1 },
        );
      } catch {
        setVerify({ state: 'idle' });
      }
    })();
  }, []);

  const isCompensated = status === 'compensating' || status === 'compensated';
  const isFailed = status === 'failed';

  const behoerdeName = useCallback(
    (id?: string): string | null => {
      if (!id) return null;
      return behoerdenById[id]?.name_de ?? id;
    },
    [behoerdenById],
  );

  const rows = useMemo(() => audit, [audit]);

  const body = (
    <div className={cn('flex flex-col gap-3')}>
      <p className="text-xs text-text-muted">{t('panel.mock_line')}</p>

      {(isCompensated || isFailed) && (
        <div
          data-testid="orchestration-compensation-summary"
          role="note"
          className="rounded-lg border border-warning/40 bg-warning-soft px-3 py-2 text-xs text-text-primary"
        >
          <p className="font-medium">{t('compensation.summary')}</p>
          <p className="mt-1 text-text-muted">{t('compensation.remediation')}</p>
          {isFailed ? (
            <p className="mt-1 font-medium text-danger">
              {t('compensation.not_reversible')}
            </p>
          ) : null}
        </div>
      )}

      {/* The append-only hash chain — a scrollable region with an accessible
          name (axe scrollable-region-focusable). New entries announce polite. */}
      <div className="relative">
        <ol
          ref={liveRef}
          data-testid="orchestration-audit-log"
          tabIndex={0}
          aria-live="polite"
          aria-label={t('aria.audit_live')}
          className="flex max-h-72 flex-col gap-1.5 overflow-y-auto rounded-lg border border-border bg-surface p-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          {rows.length === 0 ? (
            <li className="px-2 py-3 text-sm text-text-muted">
              {t('panel.empty')}
            </li>
          ) : (
            rows.map((entry) => (
              <AuditRow
                key={entry.seq}
                entry={entry}
                behoerdeName={behoerdeName(
                  typeof entry.payload.behoerdeId === 'string'
                    ? (entry.payload.behoerdeId as string)
                    : undefined,
                )}
              />
            ))
          )}
        </ol>
      </div>

      {/* verifyChain — the tamper-evidence proof (§ 6.2). */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <button
          type="button"
          onClick={onVerify}
          disabled={verify.state === 'checking'}
          aria-busy={verify.state === 'checking'}
          data-testid="orchestration-verify-cta"
          className="inline-flex w-fit items-center gap-1.5 rounded-md border border-primary px-3 py-1.5 text-sm font-medium text-primary transition-colors hover:bg-accent-soft focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-70"
        >
          <ShieldCheck className="size-4" aria-hidden="true" />
          {verify.state === 'checking' ? t('verify.checking') : t('verify.cta')}
        </button>

        {verify.state === 'ok' || verify.state === 'broken' ? (
          <p
            role="status"
            data-testid="orchestration-verify-result"
            data-verify-result={verify.state}
            className={cn(
              'inline-flex items-center gap-1.5 text-sm font-medium',
              verify.state === 'ok' ? 'text-success' : 'text-danger',
            )}
          >
            {verify.state === 'ok' ? (
              <CheckCircle2 className="size-4 shrink-0" aria-hidden="true" />
            ) : (
              <XCircle className="size-4 shrink-0" aria-hidden="true" />
            )}
            {verify.state === 'ok'
              ? t('verify.ok', { count: verify.count })
              : t('verify.broken', { seq: verify.seq })}
          </p>
        ) : null}
      </div>

      <ResilienceStatusBar
        sagaId={sagaId}
        variant={variant}
        dlq={dlq}
        breakers={breakers}
        behoerdenById={behoerdenById}
      />

      <MockWatermarkBanner variant="banner" />
    </div>
  );

  if (variant === 'inspector') {
    return (
      <section
        aria-labelledby={`laufzettel-title-${sagaId}`}
        className={cn(
          'rounded-2xl border border-border bg-surface p-5 shadow-sm',
          className,
        )}
      >
        <div className="mb-3 flex items-center gap-2">
          <ScrollText className="size-5 text-text-secondary" aria-hidden="true" />
          <h2
            id={`laufzettel-title-${sagaId}`}
            className="text-base font-semibold text-text-primary"
          >
            {t('panel.title')}
          </h2>
        </div>
        {body}
      </section>
    );
  }

  // inline — collapsible to keep the in-thread cascade as the hero.
  return (
    <div
      className={cn(
        'rounded-xl border border-border bg-surface-muted p-3',
        className,
      )}
    >
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls={`laufzettel-body-${sagaId}`}
        data-testid="orchestration-inline-toggle"
        className="flex w-full items-center gap-2 rounded-md text-left text-sm font-medium text-text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        <Link2 className="size-4 text-text-secondary" aria-hidden="true" />
        <span className="flex-1">{t('panel.title')}</span>
        <ChevronDown
          className={cn(
            'size-4 text-text-secondary transition-transform',
            open && 'rotate-180',
          )}
          aria-hidden="true"
        />
      </button>
      <div id={`laufzettel-body-${sagaId}`} hidden={!open} className="mt-3">
        {open ? body : null}
      </div>
    </div>
  );
}

interface AuditRowProps {
  entry: AuditLogEntry;
  behoerdeName: string | null;
}

function AuditRow({ entry, behoerdeName }: AuditRowProps) {
  const t = useTranslations('orchestration');
  const meta = AUDIT_EVENT_META[entry.type];
  const Icon = meta.Icon;

  const isReceipt = entry.type === 'STEP_RECEIPT';
  const quittung = entry.payload.quittung;
  const positive = quittung === 'positive';
  const receiptId =
    typeof entry.payload.receiptId === 'string'
      ? (entry.payload.receiptId as string)
      : null;
  const transportCode =
    typeof entry.payload.transportCode === 'string'
      ? (entry.payload.transportCode as string)
      : null;

  return (
    <li
      data-testid="orchestration-audit-row"
      data-audit-type={entry.type}
      data-seq={entry.seq}
      className="flex items-start gap-2.5 rounded-md px-2 py-1.5"
    >
      <span
        className={cn('mt-0.5 shrink-0', AUDIT_TONE_CLASS[meta.tone])}
        aria-hidden="true"
      >
        <Icon className="size-4" />
      </span>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <span className="text-xs font-medium tabular-nums text-text-muted">
            {t('panel.seq_label', { seq: entry.seq })}
          </span>
          <span className="text-sm font-medium text-text-primary">
            {t(`event.${meta.labelKey}`)}
          </span>
          {behoerdeName ? (
            <span className="text-xs text-text-secondary">{behoerdeName}</span>
          ) : null}
        </div>
        <time className="text-xs tabular-nums text-text-muted" dateTime={entry.ts}>
          {formatTs(entry.ts)}
        </time>
        {isReceipt ? (
          <p
            className={cn(
              'mt-0.5 text-xs',
              positive ? 'text-success' : 'text-danger',
            )}
          >
            {positive ? t('quittung.positive') : t('quittung.negative')}
            {transportCode ? (
              <span className="ml-1 font-mono text-[11px] text-text-muted">
                {t('quittung.transport_code', { code: transportCode })}
              </span>
            ) : null}
          </p>
        ) : null}
        {/* Hash-chain indicator: prevHash → hash (tamper-evident link). */}
        <p className="mt-0.5 font-mono text-[11px] text-text-muted">
          <span className="sr-only">
            {t('panel.hash_link_aria', {
              prev: shortHash(entry.prevHash),
              hash: shortHash(entry.hash),
            })}
          </span>
          <span aria-hidden="true">
            {shortHash(entry.prevHash)} → {shortHash(entry.hash)}
          </span>
          {receiptId ? (
            <span className="ml-1 text-text-muted" aria-hidden="true">
              · {receiptId}
            </span>
          ) : null}
        </p>
      </div>
    </li>
  );
}
