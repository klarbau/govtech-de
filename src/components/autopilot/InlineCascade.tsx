'use client';

import * as React from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { format, parseISO } from 'date-fns';
import { useReducedMotion } from 'framer-motion';
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Fingerprint,
  Loader2,
} from 'lucide-react';

import { ValueReceiptCard } from '@/components/autopilot/ValueReceiptCard';
import { BehoerdenBadge } from '@/components/shared/BehoerdenBadge';
import { api } from '@/lib/mock-backend';
import { cn } from '@/lib/utils';
import type {
  AutopilotStepStatus,
  Behoerde,
  BehoerdeId,
  BlockTyp,
  MockBackendEvent,
  ValueReceipt,
  Vorgang,
} from '@/types';

interface InlineCascadeProps {
  /** Live run id. Subscribes to api tick stream for this vorgang. */
  vorgangId: string;
  /** 'live' (in-session, the only caller for now) → animated, single polite region. */
  variant?: 'live';
  className?: string;
}

/** A→D→B first, C dropped — mirrors run/page.tsx (C2: duplicated, not extracted). */
const BLOCK_RANK: Record<BlockTyp, number> = { A: 0, D: 1, B: 2, C: 99 };

/** Status icon + tone, mirroring `BehoerdenStatusRow`'s visual language. */
const STATUS_VIZ: Record<
  AutopilotStepStatus,
  { Icon: typeof CheckCircle2; tone: string }
> = {
  pending: { Icon: Clock, tone: 'text-muted-foreground' },
  in_progress: { Icon: Loader2, tone: 'text-sky-600' },
  needs_eid: { Icon: Fingerprint, tone: 'text-sky-600' },
  pending_eid_confirmation: { Icon: Fingerprint, tone: 'text-sky-600' },
  self_assigned: { Icon: Clock, tone: 'text-muted-foreground' },
  confirmed: { Icon: CheckCircle2, tone: 'text-emerald-600' },
  failed: { Icon: AlertCircle, tone: 'text-destructive' },
};

/**
 * Status TEXT tone — kept SEPARATE from the (decorative, aria-hidden) icon tone.
 * The raw `text-sky-600`/`text-emerald-600` icon tones are only ~3.65–4.02:1 at
 * 12px on `bg-surface` and fail WCAG AA for text; these semantic tokens clear AA.
 */
const STATUS_TEXT_TONE: Record<AutopilotStepStatus, string> = {
  pending: 'text-text-muted',
  in_progress: 'text-primary',
  needs_eid: 'text-primary',
  pending_eid_confirmation: 'text-primary',
  self_assigned: 'text-text-muted',
  confirmed: 'text-success',
  failed: 'text-destructive',
};

/** Collapse the seven step states onto the four labelled run-status buckets. */
const STATUS_LABEL_KEY: Record<AutopilotStepStatus, string> = {
  pending: 'pending',
  in_progress: 'in_progress',
  needs_eid: 'in_progress',
  pending_eid_confirmation: 'in_progress',
  self_assigned: 'pending',
  confirmed: 'confirmed',
  failed: 'failed',
};

interface CascadeNode {
  stepId: string;
  behoerdeName: string;
  status: AutopilotStepStatus;
  primary: string;
}

/**
 * `<InlineCascade>` (Wow #1) — the live Behörden cascade + value receipt that
 * plays IN the chat thread under the `starte_umzug` ToolCallCard, so the
 * "ich sprach → es handelte → ich sah zu → hier die Quittung"-beat never leaves
 * the conversation. Reuses the run-page data source (tick stream + getVorgang +
 * getValueReceipt) WITHOUT importing or mutating run/page.tsx (C2).
 */
export function InlineCascade({
  vorgangId,
  variant = 'live',
  className,
}: InlineCascadeProps) {
  const t = useTranslations('convenience.inline_cascade');
  const tCa = useTranslations('convenience.value_receipt');
  const reduceMotion = useReducedMotion();

  const [vorgang, setVorgang] = useState<Vorgang | null>(null);
  const [behoerdenById, setBehoerdenById] = useState<
    Record<BehoerdeId, Pick<Behoerde, 'name_de'>>
  >({});
  const [receipt, setReceipt] = useState<ValueReceipt | null>(null);
  const [posteingangCount, setPosteingangCount] = useState(0);

  const receiptFetchedRef = useRef(false);
  const seenLetterIdsRef = useRef<Set<string>>(new Set());

  /* Initial fetch — the live autopilot session for this vorgang (§6.1). */
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const v = await api.getVorgang(vorgangId);
        if (!cancelled) setVorgang(v);
      } catch {
        // graceful: rows simply stay empty until a tick arrives
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [vorgangId]);

  /* Behörden lookup for row names (§6.1). */
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const list = await api.getBehoerden();
        if (cancelled) return;
        const map: Record<BehoerdeId, Pick<Behoerde, 'name_de'>> = {};
        for (const b of list) map[b.id] = { name_de: b.name_de };
        setBehoerdenById(map);
      } catch {
        // names fall back to behoerde_id
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  /* Tick subscription — same shape as run/page.tsx:162–189 (§6.2). */
  useEffect(() => {
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
      if (
        event.type === 'vorgang_status_changed' &&
        event.vorgangId === vorgangId
      ) {
        setVorgang((prev) => (prev ? { ...prev, status: event.status } : prev));
      }
      if (
        event.type === 'letter_received' &&
        event.letter.vorgang_id === vorgangId
      ) {
        const seen = seenLetterIdsRef.current;
        if (!seen.has(event.letter.id)) {
          seen.add(event.letter.id);
          setPosteingangCount(seen.size);
        }
      }
    });
    return () => {
      unsubscribe();
    };
  }, [vorgangId]);

  /* Receipt fetch — once-complete, exactly once, nice-to-have (§6.4). */
  useEffect(() => {
    if (!vorgang || vorgang.status !== 'abgeschlossen') return;
    if (receiptFetchedRef.current) return;
    receiptFetchedRef.current = true;
    let cancelled = false;
    void (async () => {
      try {
        const r = await api.getValueReceipt(vorgang.id);
        if (!cancelled) setReceipt(r);
      } catch {
        // receipt is nice-to-have — rows + posteingang line still render
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [vorgang]);

  /* Cascade-node derivation — DUPLICATED from run/page.tsx (C2): block !== 'C',
   * sort A→D→B, slice to 5. Do NOT refactor run/page.tsx to share this. */
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
        behoerdeName: behoerdenById[step.behoerde_id]?.name_de ?? step.behoerde_id,
        status: step.status,
        primary: step.agent_label ?? step.aktion,
      }));
  }, [vorgang, behoerdenById]);

  const sourceDatum = useMemo(() => {
    if (!receipt?.stammdaten_bestaetigt_am) return null;
    try {
      return format(parseISO(receipt.stammdaten_bestaetigt_am), 'dd.MM.yyyy');
    } catch {
      return null;
    }
  }, [receipt]);

  return (
    <div
      data-testid="inline-cascade"
      className={cn('flex flex-col gap-3', className)}
    >
      {/* C7: the ONE polite region — rows + counters, NOT the receipt card. */}
      <div
        data-testid="inline-cascade-live"
        aria-live="polite"
        aria-label={t('live_region_label')}
        className="flex flex-col gap-3"
      >
        {cascadeNodes.length > 0 ? (
          <ul className="flex flex-col gap-1.5">
            {cascadeNodes.map((node) => {
              const viz = STATUS_VIZ[node.status];
              const spin =
                !reduceMotion &&
                (node.status === 'in_progress' ||
                  node.status === 'needs_eid' ||
                  node.status === 'pending_eid_confirmation');
              return (
                <li
                  key={node.stepId}
                  className="flex items-start gap-3 rounded-lg border border-border bg-surface px-3 py-2"
                >
                  <span
                    className={cn('mt-0.5 flex size-5 items-center justify-center', viz.tone)}
                    aria-hidden="true"
                  >
                    <viz.Icon className={cn('size-4', spin && 'animate-spin')} />
                  </span>
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <BehoerdenBadge name={node.behoerdeName} />
                    <p className="ml-9 text-sm font-medium text-text-primary">
                      {node.primary}
                    </p>
                  </div>
                  <span className={cn('shrink-0 text-xs font-medium', STATUS_TEXT_TONE[node.status])}>
                    <span className="sr-only">Status: </span>
                    {t(`row_status.${STATUS_LABEL_KEY[node.status]}`)}
                  </span>
                </li>
              );
            })}
          </ul>
        ) : null}

        {receipt ? (
          <p className="text-sm font-medium text-text-primary">
            {tCa('ca_prefix')} {receipt.once_only_fields} {t('once_only_label')}
          </p>
        ) : null}

        {sourceDatum ? (
          <p className="text-xs text-text-muted">
            {t('source_line', { datum: sourceDatum })}
          </p>
        ) : null}

        <Link
          href="/posteingang"
          className="inline-flex items-center gap-1 self-start text-sm font-medium text-primary hover:text-primary-hover"
        >
          {t('posteingang_landing', { count: posteingangCount })}
        </Link>
      </div>

      {/* C7: receipt OWNS its own aria-live region → rendered OUTSIDE ours. */}
      {receipt ? (
        <ValueReceiptCard receipt={receipt} variant={variant} />
      ) : null}

      {/* C3: the [MOCK] disclaimer travels with the inline beat. */}
      <p className="text-xs text-text-muted">{t('disclaimer')}</p>
    </div>
  );
}
