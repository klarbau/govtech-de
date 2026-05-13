'use client';

import * as React from 'react';
import { Dialog as DialogPrimitive } from '@base-ui/react/dialog';
import { useTranslations } from 'next-intl';
import { Beaker } from 'lucide-react';

import { wrapNormZitate } from '@/components/posteingang/wrapNormZitate';
import { Button } from '@/components/ui/button';
import { useStripBaseUiFocusGuardAriaHidden } from '@/components/ui/use-strip-base-ui-focus-guard-aria-hidden';
import { cn } from '@/lib/utils';
import type { WalletAttestationPreview } from '@/types/stammdaten';

interface WalletAttestationPreviewModalProps {
  open: boolean;
  onOpenChange: (next: boolean) => void;
  empfaengerLabel: string;
  preview: WalletAttestationPreview | null;
  loading?: boolean;
  onClose: () => void;
}

/**
 * `<WalletAttestationPreviewModal>` (Spec § 3 / Hard-Lines § 11.8 + § 11.11 +
 * § 11.18 + § 11.20).
 *
 * Mock-Vorschau einer EUDI-Wallet-PID-Attestation:
 *   - 8 PID-Pflichtattribute (Family-Name, Given-Name, Birth-Date, …)
 *   - 4-aus-6 PID-Hilfsattribute
 *   - `[MOCK]`-Watermark prominent (Hard-Line § 11.8)
 *   - Disclaimer-3 (`eudi_speculative`) verbatim im Body
 *
 * Hard-Line § 11.18: minimal-statisch — keine Versand-/Sign-Aktion in V1.
 */
export function WalletAttestationPreviewModal({
  open,
  onOpenChange,
  empfaengerLabel,
  preview,
  loading,
  onClose,
}: WalletAttestationPreviewModalProps) {
  const t = useTranslations();
  const tModal = useTranslations('stammdaten.modal.wallet_attestation_preview');
  const tBadge = useTranslations('stammdaten.badge');
  useStripBaseUiFocusGuardAriaHidden(open);

  let bodyText: string;
  try {
    bodyText = t('stammdaten.disclaimer.eudi_speculative');
  } catch {
    bodyText = 'stammdaten.disclaimer.eudi_speculative';
  }

  const titleId = 'wallet-preview-modal-title';
  const bodyId = 'wallet-preview-modal-body';

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange} modal>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Backdrop
          className={cn(
            'fixed inset-0 z-50 bg-black/40 data-open:animate-in data-open:fade-in-0',
            'data-closed:animate-out data-closed:fade-out-0',
          )}
        />
        <DialogPrimitive.Popup
          aria-modal="true"
          aria-labelledby={titleId}
          aria-describedby={bodyId}
          className={cn(
            'fixed top-1/2 left-1/2 z-50 grid max-h-[calc(100vh-2rem)] w-[calc(100vw-2rem)] max-w-2xl -translate-x-1/2 -translate-y-1/2 gap-4 overflow-y-auto rounded-xl border border-border bg-background p-6 text-sm shadow-2xl outline-none',
            'data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95',
            'data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95',
          )}
        >
          <DialogPrimitive.Title id={titleId} className="flex flex-wrap items-center gap-2 text-base font-semibold">
            {tModal('title')}
            <span className="inline-flex items-center gap-1 rounded-md bg-amber-100 px-1.5 py-0.5 font-mono text-[11px] font-medium uppercase tracking-wide text-amber-900 ring-1 ring-amber-300/70 dark:bg-amber-900/40 dark:text-amber-100 dark:ring-amber-700/60">
              <Beaker className="size-3" aria-hidden="true" />
              {tBadge('mock')}
            </span>
          </DialogPrimitive.Title>
          <p className="text-xs text-muted-foreground">
            {tModal('empfaenger_label')}: <span className="font-medium text-foreground">{empfaengerLabel}</span>
          </p>
          <DialogPrimitive.Description
            id={bodyId}
            className="leading-relaxed text-muted-foreground"
            render={<div />}
          >
            <p>{wrapNormZitate(bodyText)}</p>
          </DialogPrimitive.Description>

          {loading || preview === null ? (
            <p className="rounded-lg border border-dashed border-border bg-muted/30 p-4 text-sm text-muted-foreground">
              {tModal('loading')}
            </p>
          ) : (
            <div className="flex flex-col gap-4">
              <AttributeBlock
                heading={tModal('section_pflicht')}
                attributes={preview.pid_pflicht}
                testId="wallet-preview-pflicht"
              />
              <AttributeBlock
                heading={tModal('section_optional')}
                attributes={preview.pid_optional}
                testId="wallet-preview-optional"
              />
              <p className="text-[11px] text-muted-foreground">
                {tModal('attestation_id_label')}:{' '}
                <span className="font-mono">{preview.mock_attestation_id}</span>{' '}
                <span className="ml-1 inline-flex items-center rounded-md bg-amber-100 px-1.5 py-0.5 font-mono text-[10px] font-medium uppercase tracking-wide text-amber-900 ring-1 ring-amber-300/70 dark:bg-amber-900/40 dark:text-amber-100 dark:ring-amber-700/60">
                  {preview.watermark}
                </span>
              </p>
            </div>
          )}

          <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
            <DialogPrimitive.Close
              render={
                <Button type="button" variant="outline" onClick={onClose} autoFocus />
              }
            >
              {tModal('cta_close')}
            </DialogPrimitive.Close>
          </div>
        </DialogPrimitive.Popup>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

function AttributeBlock({
  heading,
  attributes,
  testId,
}: {
  heading: string;
  attributes: Record<string, string>;
  testId: string;
}) {
  return (
    <section className="rounded-lg border border-border bg-card p-3" data-testid={testId}>
      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {heading}
      </h3>
      <dl className="mt-2 grid grid-cols-1 gap-x-4 gap-y-2 sm:grid-cols-2">
        {Object.entries(attributes).map(([key, value]) => (
          <div key={key} className="flex flex-col">
            <dt className="text-[11px] uppercase tracking-wide text-muted-foreground">
              {key}
            </dt>
            <dd className="text-sm text-foreground">{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
