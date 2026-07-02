'use client';

/**
 * ProtokollInspector (Protokoll-Modus Spec § 5.3) — the user-triggered, real
 * FIT-Connect transport view on the Umzug run page.
 *
 * DISCOVERY-GATED: on mount it GETs `/api/protocol/fit-connect/capability`. When
 * `available === false` (the deployed/flag-off default) it renders NOTHING, so
 * Demo-Modus is byte-identical. When available it renders the inspector card:
 * a single "Live-Übermittlung auslösen" button (HARD-RULE: write only on click)
 * that runs ONE real i-Kfz leg against OUR OWN FITKO TEST Zustellpunkt
 * (`[MOCK destination]`), then shows the settled receipt (via the shipped
 * `FitConnectReceiptPanel`, not forked), the sent JWE protected-header trio and
 * a SET-decode timeline with the real polled event vocabulary
 * (create → submit → notify → accept-submission).
 *
 * Honesty (Spec § 9): the sandbox banner + `[MOCK destination]` chip are always
 * present; a failure is framed as the TEST sandbox, never a real Behörde.
 *
 * a11y (Spec § 5.5): labelled `<section aria-labelledby>`, the SET timeline is an
 * `<ol>`, status transitions announce via an `aria-live` region, every
 * verified/not-verified verdict pairs icon + text (never colour-only), and the
 * reveal animation respects `prefers-reduced-motion`.
 */

import { useCallback, useEffect, useId, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useReducedMotion } from 'framer-motion';
import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react';

import { FitConnectReceiptPanel } from '@/components/autopilot/FitConnectReceiptPanel';
import { cn } from '@/lib/utils';
import type { FitConnectReceipt } from '@/types/fit-connect';
import type { DecodedSet } from '@/lib/fit-connect/set-decode';

interface ProtokollInspectorProps {
  /** Display name of the i-Kfz Behörde for the embedded receipt panel. */
  behoerdeName: string;
  className?: string;
}

type InspectorState = 'idle' | 'running' | 'success' | 'error';

interface SubmitResult {
  receipt: FitConnectReceipt;
  sets: DecodedSet[];
}

/** Map a raw RFC-8417 event-type URI to a friendly-label i18n key suffix. */
function eventLabelKey(uri: string): 'create' | 'submit' | 'notify' | 'accept' | null {
  if (uri.endsWith('/create-submission')) return 'create';
  if (uri.endsWith('/submit-submission')) return 'submit';
  if (uri.endsWith('/notify-submission')) return 'notify';
  if (uri.endsWith('/accept-submission')) return 'accept';
  return null;
}

export function ProtokollInspector({ behoerdeName, className }: ProtokollInspectorProps) {
  const t = useTranslations('protokoll.fit_connect');
  const tFc = useTranslations('fit_connect');
  const reduceMotion = useReducedMotion();

  const titleId = useId();

  // null = not yet discovered; false = unavailable (render nothing); true = show.
  const [available, setAvailable] = useState<boolean | null>(null);
  const [state, setState] = useState<InspectorState>('idle');
  const [result, setResult] = useState<SubmitResult | null>(null);

  /* Discovery — GET capability on mount. Any failure ⇒ unavailable ⇒ nothing. */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/protocol/fit-connect/capability');
        if (cancelled) return;
        const data = res.ok ? ((await res.json()) as { available?: boolean }) : null;
        setAvailable(Boolean(data?.available));
      } catch {
        if (!cancelled) setAvailable(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  /* HARD-RULE: the ONLY write, and only from this click. Double-submit guarded
   * by the disabled button while `running`. */
  const trigger = useCallback(async () => {
    setState('running');
    try {
      const res = await fetch('/api/protocol/fit-connect/submit', { method: 'POST' });
      if (!res.ok) throw new Error('sandbox');
      const data = (await res.json()) as SubmitResult;
      setResult(data);
      setState('success');
    } catch {
      setState('error');
    }
  }, []);

  /* Re-poll the event log for the same case (additive; keeps the receipt). */
  const refreshEvents = useCallback(async () => {
    const caseId = result?.receipt.caseId;
    if (!caseId) return;
    try {
      const res = await fetch(
        `/api/protocol/fit-connect/events?caseId=${encodeURIComponent(caseId)}`,
      );
      if (!res.ok) return;
      const data = (await res.json()) as { sets: DecodedSet[] };
      setResult((prev) => (prev ? { ...prev, sets: data.sets } : prev));
    } catch {
      // Keep the existing SETs on a transient sandbox hiccup.
    }
  }, [result]);

  // Demo-Modus / not-yet-discovered → render nothing (byte-identical).
  if (available !== true) return null;

  const receipt = result?.receipt;
  const sets = result?.sets ?? [];

  return (
    <section
      data-testid="protokoll-inspector"
      aria-labelledby={titleId}
      className={cn(
        'flex flex-col gap-3 rounded-xl border border-border bg-surface p-4',
        className,
      )}
    >
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span
            className="inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-accent-soft text-primary"
            aria-hidden="true"
          >
            <ShieldCheck className="size-4" />
          </span>
          <h2 id={titleId} className="text-sm font-semibold text-text-primary">
            {t('inspector_title')}
          </h2>
        </div>
        <span className="inline-flex items-center rounded-md bg-surface-muted px-2 py-0.5 text-xs font-medium text-text-secondary">
          {tFc('mock_destination')}
        </span>
      </header>

      <p className="text-xs text-text-secondary">{t('inspector_sub')}</p>

      {/* Honesty banner (§9) — always present. */}
      <p
        role="note"
        className="flex items-start gap-1.5 rounded-lg border border-border bg-surface-muted p-2 text-xs text-text-secondary"
      >
        <AlertTriangle className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
        {t('banner_sandbox')}
      </p>

      {/* Action + status. */}
      <div className="flex flex-wrap items-center gap-2">
        {state === 'success' ? (
          <button
            type="button"
            className="btn btn-secondary"
            onClick={refreshEvents}
          >
            <RefreshCw className="size-4" aria-hidden="true" />
            {t('refresh_events_cta')}
          </button>
        ) : (
          <button
            type="button"
            className="btn btn-primary"
            onClick={trigger}
            disabled={state === 'running'}
          >
            {state === 'running' ? (
              <Loader2 className="size-4 vlf-spin" aria-hidden="true" />
            ) : null}
            {state === 'running' ? t('trigger_running') : t('trigger_cta')}
          </button>
        )}
      </div>

      {/* Status announcements. */}
      <div aria-live="polite" className="min-h-0">
        {state === 'running' ? (
          <p className="text-xs text-text-secondary">{t('trigger_running')}</p>
        ) : null}
        {state === 'error' ? (
          <p className="flex items-start gap-1.5 text-xs font-medium text-destructive">
            <AlertTriangle className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
            {t('state_error')}
          </p>
        ) : null}
      </div>

      {state === 'success' && receipt ? (
        <div
          className={cn(
            'flex flex-col gap-3',
            !reduceMotion && 'motion-safe:animate-in motion-safe:fade-in',
          )}
        >
          {/* Submission + case identifiers (mono, break-all). */}
          <div className="flex flex-col gap-1 text-xs">
            {receipt.submissionId ? (
              <div className="flex flex-wrap items-baseline gap-x-2">
                <span className="font-medium text-text-secondary">
                  {t('submission_id_label')}
                </span>
                <span className="min-w-0 break-all font-mono text-text-primary">
                  {receipt.submissionId}
                </span>
              </div>
            ) : null}
            {receipt.caseId ? (
              <div className="flex flex-wrap items-baseline gap-x-2">
                <span className="font-medium text-text-secondary">
                  {t('case_id_label')}
                </span>
                <span className="min-w-0 break-all font-mono text-text-primary">
                  {receipt.caseId}
                </span>
              </div>
            ) : null}
          </div>

          {/* Reuse the shipped receipt panel (schema/LeiKa/LoA/JWE-excerpt +
              live evidence) — not forked. */}
          <FitConnectReceiptPanel receipt={receipt} behoerdeName={behoerdeName} />

          {/* Sent JWE protected-header trio (alg/enc/kid) — decoded wire data,
              no plaintext, no key material. */}
          <figure className="flex flex-col gap-1">
            <figcaption className="text-xs font-semibold text-text-primary">
              {t('jwe_headers_heading')}
            </figcaption>
            <pre
              tabIndex={0}
              role="region"
              aria-label={t('jwe_headers_heading')}
              className="max-h-28 overflow-auto rounded-lg border border-border bg-surface-muted p-2 text-xs leading-relaxed break-all whitespace-pre-wrap text-text-secondary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              {JSON.stringify(
                {
                  alg: receipt.jwePreview.alg,
                  enc: receipt.jwePreview.enc,
                  ...(receipt.jwePreview.kid ? { kid: receipt.jwePreview.kid } : {}),
                },
                null,
                2,
              )}
            </pre>
          </figure>

          {/* SET-decode timeline — real polled event vocabulary, one row per SET. */}
          {sets.length > 0 ? (
            <div className="flex flex-col gap-1.5">
              <h3 className="text-xs font-semibold text-text-primary">
                {t('timeline_heading')}
              </h3>
              <ol
                aria-label={t('set_heading')}
                className="flex flex-col gap-2"
              >
                {sets.map((set, i) => {
                  const friendly = set.eventTypes
                    .map((uri) => {
                      const key = eventLabelKey(uri);
                      return key ? t(`event.${key}`) : null;
                    })
                    .filter((label): label is string => label !== null);
                  return (
                    <li
                      key={`${set.header.kid ?? 'set'}-${set.iat ?? i}-${i}`}
                      className="flex flex-col gap-1 rounded-lg border border-border bg-surface-muted p-2 text-xs"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-medium text-text-primary">
                          {friendly.length > 0 ? friendly.join(' · ') : t('set_heading')}
                        </span>
                        {set.signatureVerified ? (
                          <span className="inline-flex items-center gap-1 font-medium text-success">
                            <CheckCircle2 className="size-3.5" aria-hidden="true" />
                            {t('set_verified')}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 font-medium text-destructive">
                            <AlertTriangle className="size-3.5" aria-hidden="true" />
                            {t('set_not_verified')}
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-text-secondary">
                        <span>
                          <span className="font-medium">{t('set_alg_label')}</span>{' '}
                          <span className="font-mono text-text-primary">
                            {set.header.alg}
                          </span>
                        </span>
                        {set.header.typ ? (
                          <span>
                            <span className="font-medium">{t('set_typ_label')}</span>{' '}
                            <span className="font-mono text-text-primary">
                              {set.header.typ}
                            </span>
                          </span>
                        ) : null}
                        {set.iatIso ? (
                          <span>
                            <span className="font-medium">{t('set_iat_label')}</span>{' '}
                            <span className="font-mono text-text-primary">
                              {set.iatIso}
                            </span>
                          </span>
                        ) : null}
                      </div>

                      {set.header.kid ? (
                        <div className="flex flex-wrap items-baseline gap-x-2 text-text-secondary">
                          <span className="font-medium">{t('set_kid_label')}</span>
                          <span className="min-w-0 break-all font-mono text-text-primary">
                            {set.header.kid}
                          </span>
                        </div>
                      ) : null}

                      {/* Raw event-type URIs shown verbatim below the friendly label. */}
                      {set.eventTypes.length > 0 ? (
                        <div className="flex flex-col gap-0.5">
                          <span className="font-medium text-text-secondary">
                            {t('set_events_label')}
                          </span>
                          <ul className="flex flex-col gap-0.5 pl-1">
                            {set.eventTypes.map((uri) => (
                              <li
                                key={uri}
                                className="min-w-0 break-all font-mono text-text-secondary"
                              >
                                {uri}
                              </li>
                            ))}
                          </ul>
                        </div>
                      ) : null}
                    </li>
                  );
                })}
              </ol>
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
