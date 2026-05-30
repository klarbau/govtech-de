'use client';

import * as React from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import { api, MockBackendError } from '@/lib/mock-backend';
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

/**
 * Row ordering: A→D→B, block C dropped. All non-C rows are shown (no slice cap)
 * so the eID-gated Block-D rows completion depends on stay visible (P3). This
 * mirrors run/page.tsx's block ranking (C2: duplicated, not extracted) — but
 * run/page.tsx keeps its own .slice(0,5); the inline hero intentionally does not.
 */
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

/**
 * Collapse the step states onto labelled run-status buckets. The eID-gate states
 * map to their OWN honest bucket ("Ihre Bestätigung nötig") — never the
 * "in_progress"/"Wird übermittelt" bucket: an un-acted gate is awaiting the user,
 * not transmitting. `in_progress` ("Wird übermittelt") is reserved for the genuine
 * write that follows the user's eID tap (P2).
 */
const STATUS_LABEL_KEY: Record<AutopilotStepStatus, string> = {
  pending: 'pending',
  in_progress: 'in_progress',
  needs_eid: 'needs_eid',
  pending_eid_confirmation: 'needs_eid',
  self_assigned: 'pending',
  confirmed: 'confirmed',
  failed: 'failed',
};

interface CascadeNode {
  stepId: string;
  behoerdeName: string;
  status: AutopilotStepStatus;
  primary: string;
  block: BlockTyp;
  rechtsgrundlage: string;
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
  const [confirmState, setConfirmState] = useState<
    Record<string, 'idle' | 'confirming' | 'error'>
  >({});

  const receiptFetchedRef = useRef(false);
  const seenLetterIdsRef = useRef<Set<string>>(new Set());
  const receiptCardRef = useRef<HTMLDivElement | null>(null);

  /**
   * Task 1 (focus-continuity): when a Block-D eID button is activated and the
   * step flips to `confirmed`, the button unmounts and keyboard focus would drop
   * to <body> — jarring for keyboard/SR users and risky for the on-camera
   * two-tap Loom flow. We remember the stepId the user just confirmed and, in an
   * effect that fires once the event stream flips that step to `confirmed`, move
   * focus to the next remaining eID button if one exists, else to that row's
   * (now focusable) status span. The event stream — not the click handler —
   * drives the status change, so the move must be effect-driven, not inline.
   */
  const justConfirmedStepIdRef = useRef<string | null>(null);
  const eidButtonRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
  const statusRefs = useRef<Map<string, HTMLSpanElement>>(new Map());

  /**
   * eID-confirm a single Block-D step (Decision A). The `autopilot_step` events
   * that `bestaetigeImpl` emits (pending_eid_confirmation → in_progress →
   * confirmed) flow through the subscription below and drive the row — we do NOT
   * optimistically mutate the Vorgang here; the event stream is the source of
   * truth. On rejection the row returns to its gate state and stays retryable.
   */
  async function onConfirmEid(stepId: string) {
    setConfirmState((s) => ({ ...s, [stepId]: 'confirming' }));
    justConfirmedStepIdRef.current = stepId;
    try {
      await api.bestaetigeAutopilotSchritt(vorgangId, stepId);
      setConfirmState((s) => ({ ...s, [stepId]: 'idle' }));
    } catch {
      justConfirmedStepIdRef.current = null;
      setConfirmState((s) => ({ ...s, [stepId]: 'error' }));
    }
  }

  /**
   * Fix 2 — seed the Posteingang counter from the FULL letter thread, not just
   * live `letter_received` events. Letters the autopilot emits BEFORE this
   * component subscribes are otherwise never counted (undercount / shows 0).
   * `getLetterThread(vorgangId)` returns every letter for the vorgang; we fold
   * its ids into `seenLetterIdsRef` (de-duped) so a subsequent live event for an
   * already-seen letter does not double-count, then publish `seen.size`. Errors
   * are swallowed — the counter is a nice-to-have and live events still flow. */
  const seedPosteingangCountFromThread = useCallback(() => {
    void (async () => {
      try {
        const thread = await api.getLetterThread(vorgangId);
        const seen = seenLetterIdsRef.current;
        for (const letter of thread) seen.add(letter.id);
        setPosteingangCount(seen.size);
      } catch {
        // counter is nice-to-have — live events keep incrementing regardless
      }
    })();
  }, [vorgangId]);

  /* Initial fetch — the live autopilot session for this vorgang (§6.1).
   *
   * Resilience: the mock backend throws a ~5% retryable error in the default
   * (non-reliable) public-demo mode. A single un-retried `getVorgang` failure
   * left the whole cascade empty (rows + receipt + counter dead) for ~5% of
   * sessions, since the tick handler bails on a null vorgang. We retry the
   * retryable failures with a short backoff; if every attempt still fails, the
   * tick handler below SEEDS a minimal vorgang from the first event so rows
   * render anyway (belt-and-suspenders). On success we also seed the
   * Posteingang counter from the letter thread (Fix 2 — see below). */
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const MAX_ATTEMPTS = 3;
      for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
        try {
          const v = await api.getVorgang(vorgangId);
          if (cancelled) return;
          setVorgang(v);
          seedPosteingangCountFromThread();
          return;
        } catch (err) {
          const retryable =
            err instanceof MockBackendError ? err.retryable : false;
          if (cancelled || !retryable || attempt === MAX_ATTEMPTS) {
            // graceful: rows still render via the tick-seed path below
            return;
          }
          await new Promise((resolve) => setTimeout(resolve, attempt * 200));
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [vorgangId, seedPosteingangCountFromThread]);

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
          /* Fix 1(b): if the initial getVorgang never succeeded (all retries hit
           * the ~5% error), `prev` is still null — seed a MINIMAL vorgang from the
           * event so rows start rendering anyway. Later events merge into it, and
           * a successful late getVorgang would backfill the rest. Defaults are
           * sensible placeholders; the cascade only reads id / status / schritte. */
          const base: Vorgang =
            prev ??
            {
              id: event.vorgangId,
              typ: 'umzug',
              titel: '',
              status: 'in_pruefung',
              beteiligte_behoerden_ids: [],
              schritte: [],
              fristen: [],
              angelegt_am: new Date().toISOString(),
              persona_id: '',
            };
          const idx = base.schritte.findIndex((s) => s.id === event.step.id);
          const nextSteps =
            idx === -1
              ? [...base.schritte, event.step]
              : base.schritte.map((s, i) => (i === idx ? event.step : s));
          return { ...base, schritte: nextSteps };
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
    /* Fix 2 (backstop): on completion every autopilot letter has been emitted —
     * re-read the thread so the counter reflects ALL letters even if the initial
     * seed raced ahead of the last few. De-duped via seenLetterIdsRef. */
    seedPosteingangCountFromThread();
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
  }, [vorgang, seedPosteingangCountFromThread]);

  /* Climax visibility (Flag #3): the receipt now renders only after two manual
   * eID taps deep in an 8-row thread — scroll it into view when it mounts so the
   * payoff never lands below the fold. Honors reduced-motion. */
  useEffect(() => {
    if (!receipt) return;
    receiptCardRef.current?.scrollIntoView({
      behavior: reduceMotion ? 'auto' : 'smooth',
      block: 'nearest',
    });
  }, [receipt, reduceMotion]);

  /* Cascade-node derivation — DUPLICATED from run/page.tsx (C2): block !== 'C',
   * sort A→D→B, and show ALL non-C steps (no slice cap) so the ABH eID step that
   * completion depends on is visible (P3). Do NOT refactor run/page.tsx to share
   * this — run/page.tsx keeps its own .slice(0,5); the inline hero does not slice. */
  const cascadeNodes: CascadeNode[] = useMemo(() => {
    if (!vorgang) return [];
    return vorgang.schritte
      .map((step, insertionIndex) => ({ step, insertionIndex }))
      .filter(({ step }) => step.block !== 'C')
      .sort((a, b) => {
        const rank = BLOCK_RANK[a.step.block] - BLOCK_RANK[b.step.block];
        return rank !== 0 ? rank : a.insertionIndex - b.insertionIndex;
      })
      .map(({ step }) => ({
        stepId: step.id,
        behoerdeName: behoerdenById[step.behoerde_id]?.name_de ?? step.behoerde_id,
        status: step.status,
        primary: step.agent_label ?? step.aktion,
        block: step.block,
        rechtsgrundlage: step.rechtsgrundlage,
      }));
  }, [vorgang, behoerdenById]);

  /* Flag #2: scope the consent-gate hint — show it only when ≥1 Block-D row is
   * still awaiting the user's eID tap. The copy is scoped to the Block-D rows
   * (NOT a global "nothing transmitted" claim — Block-A already fired). */
  const showEidGateHint = useMemo(
    () =>
      cascadeNodes.some(
        (n) =>
          n.block === 'D' &&
          (n.status === 'needs_eid' ||
            n.status === 'pending_eid_confirmation'),
      ),
    [cascadeNodes],
  );

  /* Anchor the gate hint above the first Block-D row in the A→D→B sorted list. */
  const firstBlockDStepId = useMemo(
    () => cascadeNodes.find((n) => n.block === 'D')?.stepId ?? null,
    [cascadeNodes],
  );

  const sourceDatum = useMemo(() => {
    if (!receipt?.stammdaten_bestaetigt_am) return null;
    try {
      return format(parseISO(receipt.stammdaten_bestaetigt_am), 'dd.MM.yyyy');
    } catch {
      return null;
    }
  }, [receipt]);

  /* Task 1: once the step the user just eID-confirmed flips to `confirmed` (its
   * button has unmounted), move focus off the now-gone button. Prefer the next
   * remaining eID button (keeps the two-tap flow on the keyboard); otherwise the
   * confirmed row's status span (tabIndex={-1}). Robust to the event-stream
   * timing — keyed on cascadeNodes so it re-checks on every status tick. */
  useEffect(() => {
    const justConfirmed = justConfirmedStepIdRef.current;
    if (!justConfirmed) return;
    const node = cascadeNodes.find((n) => n.stepId === justConfirmed);
    if (!node || node.status !== 'confirmed') return;
    justConfirmedStepIdRef.current = null;

    const nextEidButton = cascadeNodes
      .filter(
        (n) =>
          n.status === 'needs_eid' || n.status === 'pending_eid_confirmation',
      )
      .map((n) => eidButtonRefs.current.get(n.stepId))
      .find((el): el is HTMLButtonElement => Boolean(el));
    if (nextEidButton) {
      nextEidButton.focus();
      return;
    }
    statusRefs.current.get(justConfirmed)?.focus();
  }, [cascadeNodes]);

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
              /* P2: spin ONLY for the genuine in_progress write — the eID-gate
               * states are awaiting the user, not working; a spinning fingerprint
               * on an un-acted gate is a lie. */
              const spin = !reduceMotion && node.status === 'in_progress';
              const isEidGate =
                node.status === 'needs_eid' ||
                node.status === 'pending_eid_confirmation';
              const cstate = confirmState[node.stepId] ?? 'idle';
              const confirming = cstate === 'confirming';
              return (
                <React.Fragment key={node.stepId}>
                  {/* Flag #2: consent-gate hint, scoped above the Block-D rows. */}
                  {showEidGateHint && node.stepId === firstBlockDStepId ? (
                    <li
                      data-testid="inline-cascade-eid-gate-hint"
                      className="rounded-lg bg-muted/50 px-3 py-2 text-xs text-text-muted"
                    >
                      {t('eid_gate_hint')}
                    </li>
                  ) : null}
                  <li className="flex items-start gap-3 rounded-lg border border-border bg-surface px-3 py-2">
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
                      {/* Flag #1: per-row legal basis so the silent auto rows are
                       * never unexplained — they read as lawful, not arbitrary. */}
                      {node.rechtsgrundlage ? (
                        <p className="ml-9 text-xs text-text-muted">
                          {node.rechtsgrundlage}
                        </p>
                      ) : null}
                      {/* Decision A: the per-step eID-confirm affordance. */}
                      {isEidGate ? (
                        <div className="ml-9 mt-1 flex flex-col gap-1">
                          <button
                            type="button"
                            ref={(el) => {
                              if (el) eidButtonRefs.current.set(node.stepId, el);
                              else eidButtonRefs.current.delete(node.stepId);
                            }}
                            onClick={() => void onConfirmEid(node.stepId)}
                            disabled={confirming}
                            aria-busy={confirming}
                            aria-label={t('eid_confirm_cta_aria', {
                              behoerde: node.behoerdeName,
                            })}
                            data-testid="inline-eid-confirm"
                            data-step-id={node.stepId}
                            data-behoerde={node.behoerdeName}
                            className="inline-flex w-fit items-center gap-1.5 rounded-md border border-primary bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-70"
                          >
                            {confirming ? (
                              <>
                                <Loader2
                                  className={cn('size-4', !reduceMotion && 'animate-spin')}
                                  aria-hidden="true"
                                />
                                {t('eid_confirming')}
                              </>
                            ) : (
                              <>
                                <Fingerprint className="size-4" aria-hidden="true" />
                                {t('eid_confirm_cta')}
                              </>
                            )}
                          </button>
                          {cstate === 'error' ? (
                            <p
                              role="alert"
                              className="text-xs font-medium text-destructive"
                            >
                              {t('eid_confirm_error')}
                            </p>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                    <span
                      ref={(el) => {
                        if (el) statusRefs.current.set(node.stepId, el);
                        else statusRefs.current.delete(node.stepId);
                      }}
                      tabIndex={-1}
                      data-testid="inline-cascade-row-status"
                      data-step-id={node.stepId}
                      data-status={node.status}
                      className={cn(
                        'shrink-0 text-xs font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary',
                        STATUS_TEXT_TONE[node.status],
                      )}
                    >
                      <span className="sr-only">{t('row_status_sr_prefix')}</span>
                      {t(`row_status.${STATUS_LABEL_KEY[node.status]}`)}
                    </span>
                  </li>
                </React.Fragment>
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
        <div ref={receiptCardRef} data-testid="inline-cascade-receipt">
          <ValueReceiptCard receipt={receipt} variant={variant} />
        </div>
      ) : null}

      {/* C3: the [MOCK] disclaimer travels with the inline beat. */}
      <p className="text-xs text-text-muted">{t('disclaimer')}</p>
    </div>
  );
}
