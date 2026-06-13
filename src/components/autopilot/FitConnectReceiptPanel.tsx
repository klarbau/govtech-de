'use client';

import { useTranslations } from 'next-intl';
import { useReducedMotion } from 'framer-motion';
import { AlertTriangle, CheckCircle2, Lock, ShieldCheck } from 'lucide-react';

import { BehoerdenBadge } from '@/components/shared/BehoerdenBadge';
import { cn } from '@/lib/utils';
import type { FitConnectReceipt } from '@/types/fit-connect';

interface FitConnectReceiptPanelProps {
  receipt: FitConnectReceipt;
  behoerdeName: string;
  /** `live` (the only caller) → announce once via the panel's OWN polite region. */
  variant?: 'live';
  className?: string;
}

/**
 * `<FitConnectReceiptPanel>` (Spec § 9) — the "Übermittlung via FIT-Connect"
 * receipt, rendered inline UNDER a Block-D row in `InlineCascade.tsx` AFTER the
 * "Mit eID bestätigen" tap succeeds. The strongest realism beat: a real
 * federal transport form (schema-validated metadata + JWE crypto preview +
 * eIDAS-LoA) — honestly marked `[MOCK destination]`, never claiming a real
 * Behörde received anything (Spec § 13.2 #4/#5).
 *
 * a11y (Spec § 11): the panel OWNS its own `aria-live="polite"` region —
 * SEPARATE from the InlineCascade live region — so it announces its appearance
 * exactly once and never double-announces with the cascade ticks. The only
 * focusable element is the scrollable JWE block (`tabIndex=0` + `role=region`).
 * No focus trap; the panel never steals focus from the eID focus-move.
 */
export function FitConnectReceiptPanel({
  receipt,
  behoerdeName,
  className,
}: FitConnectReceiptPanelProps) {
  const t = useTranslations('fit_connect');
  const reduceMotion = useReducedMotion();

  const schemaOk = receipt.schemaValid;
  const isTier2 = receipt.tier === 2;

  return (
    <section
      data-testid="fit-connect-receipt-panel"
      aria-label={t('panel_title')}
      aria-live="polite"
      className={cn(
        'mt-2 flex flex-col gap-2 rounded-xl border border-border bg-surface p-4',
        !reduceMotion && 'motion-safe:animate-in motion-safe:fade-in',
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
          <h3 className="text-sm font-semibold text-text-primary">
            {t('panel_title')}
          </h3>
        </div>
        <span
          data-testid="fit-connect-mock-destination"
          className="inline-flex items-center rounded-md bg-surface-muted px-2 py-0.5 text-xs font-medium text-text-secondary"
        >
          {t('mock_destination')}
        </span>
      </header>

      <div className="flex items-center gap-2 border-t border-border pt-2">
        <BehoerdenBadge name={behoerdeName} />
      </div>

      {/* Label:value rows. NOT a <dl>: the rows are interleaved with free-text
       * honesty/warning notes (leika-unconfirmed under Leistung, loa_honesty
       * under Vertrauensniveau), which a definition list cannot contain as
       * direct children. Plain semantic div/span rows keep the same visual
       * layout + label styling while staying valid HTML (axe 1.3.1). */}
      <div className="flex flex-col gap-1.5 text-xs">
        {/* Leistung (LeiKa) — placeholder, with the not-catalogue-confirmed warn. */}
        <div className="flex flex-col gap-0.5">
          <div className="flex flex-wrap items-baseline gap-x-2">
            <span className="font-medium text-text-secondary">
              {t('leistung_label')}
            </span>
            <span className="min-w-0 break-all font-mono text-text-primary">
              {receipt.metadataPreview.publicServiceIdentifier}
            </span>
          </div>
          {!receipt.routing.leikaKeyConfirmed ? (
            <p className="flex items-center gap-1 text-text-secondary">
              <AlertTriangle className="size-3.5 shrink-0" aria-hidden="true" />
              {t('leika_unconfirmed')}
            </p>
          ) : null}
        </div>

        {/* Vertrauensniveau (eIDAS LoA) + honesty line. */}
        <div className="flex flex-col gap-0.5">
          <div className="flex flex-wrap items-baseline gap-x-2">
            <span className="font-medium text-text-secondary">
              {t('loa_label')}
            </span>
            <span className="text-text-primary">{t('loa_high')}</span>
          </div>
          <p className="text-text-muted">{t('loa_honesty')}</p>
        </div>

        {/* Schema — valid/invalid. */}
        <div className="flex flex-wrap items-baseline gap-x-2">
          <span className="font-medium text-text-secondary">
            {t('schema_label')}
          </span>
          <span className="flex items-center gap-1.5 text-text-primary">
            <span>{t('schema_value')}</span>
            {schemaOk ? (
              <span className="inline-flex items-center gap-1 font-medium text-success">
                <CheckCircle2 className="size-3.5" aria-hidden="true" />
                {t('schema_valid')}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 font-medium text-destructive">
                <AlertTriangle className="size-3.5" aria-hidden="true" />
                {t('schema_invalid')}
              </span>
            )}
          </span>
        </div>

        {/* Verschlüsselung. */}
        <div className="flex flex-wrap items-baseline gap-x-2">
          <span className="flex items-center gap-1 font-medium text-text-secondary">
            <Lock className="size-3.5" aria-hidden="true" />
            {t('encryption_label')}
          </span>
          <span className="text-text-primary">{t('encryption_value')}</span>
        </div>
      </div>

      {/* JWE Compact excerpt — scrollable, focusable region (axe scrollable-region-focusable). */}
      <figure className="flex flex-col gap-1">
        <figcaption className="text-xs font-medium text-text-secondary">
          {t('jwe_excerpt_label')}
        </figcaption>
        <pre
          tabIndex={0}
          role="region"
          aria-label={t('jwe_region_aria')}
          data-testid="fit-connect-jwe-excerpt"
          className="max-h-24 overflow-auto rounded-lg border border-border bg-surface-muted p-2 text-xs leading-relaxed break-all whitespace-pre-wrap text-text-secondary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          {receipt.jwePreview.compactExcerpt}
        </pre>
      </figure>

      {/* Tier-2-only fields. Plain div/span rows (same rationale as above). */}
      {isTier2 ? (
        <div className="flex flex-col gap-1 border-t border-border pt-2 text-xs">
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
          {receipt.status ? (
            <div className="flex flex-wrap items-baseline gap-x-2">
              <span className="font-medium text-text-secondary">
                {t('status_label')}
              </span>
              <span
                className={cn(
                  'font-medium',
                  receipt.status === 'error'
                    ? 'text-destructive'
                    : 'text-text-primary',
                )}
              >
                {t(`status.${receipt.status}`)}
              </span>
            </div>
          ) : null}
        </div>
      ) : (
        <p className="text-xs text-text-muted">{t('tier1_offline_note')}</p>
      )}

      <p className="border-t border-border pt-2 text-xs text-text-muted">
        {t('disclaimer_short')}
      </p>
    </section>
  );
}
