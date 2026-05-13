'use client';

import * as React from 'react';
import { AlertDialog as AlertDialogPrimitive } from '@base-ui/react/alert-dialog';
import { useTranslations } from 'next-intl';

import { wrapNormZitate } from '@/components/posteingang/wrapNormZitate';
import { Button } from '@/components/ui/button';
import { useStripBaseUiFocusGuardAriaHidden } from '@/components/ui/use-strip-base-ui-focus-guard-aria-hidden';
import { cn } from '@/lib/utils';

interface ReligionConsentModalProps {
  open: boolean;
  onOpenChange: (next: boolean) => void;
  onConsent: () => void;
  onCancel: () => void;
  pending?: boolean;
}

/**
 * `<ReligionConsentModal>` (Spec § 3 / Hard-Lines § 11.3 + § 11.4 + § 11.20).
 *
 * Pre-Insertion-Modal-Pattern für die Religion-Anzeige (Art. 9 DSGVO).
 *
 * Verhalten:
 *   - Body verbatim aus `stammdaten.disclaimer.religion_art9` (Hard-Line § 11.3).
 *   - Toggle-Label verbatim aus `stammdaten.disclaimer.religion_consent_toggle_label`.
 *   - Toggle initial off; primary-Button „Religionsmerkmal anzeigen" disabled
 *     bis Toggle on.
 *   - Einwilligung gilt **nur für die aktuelle Sitzung** (Hard-Line § 11.4) —
 *     der Caller speichert den Status NICHT in localStorage.
 *   - Hard-Line § 11.20: keine „nicht mehr zeigen"-Checkbox.
 *
 * a11y:
 *   - `role="alertdialog"` (base-ui-Default), `aria-modal="true"`,
 *     `aria-labelledby`, `aria-describedby`, focus-trap, ESC schließt.
 *   - Norm-Zitate im Body via `wrapNormZitate` (Hard-Line § 11.7).
 *   - `useStripBaseUiFocusGuardAriaHidden(open)` workaroundet
 *     `aria-hidden="true" + tabindex=0` auf base-ui-FocusGuards.
 */
export function ReligionConsentModal({
  open,
  onOpenChange,
  onConsent,
  onCancel,
  pending,
}: ReligionConsentModalProps) {
  const t = useTranslations();
  const tModal = useTranslations('stammdaten.modal.religion_consent');
  useStripBaseUiFocusGuardAriaHidden(open);

  const [consentChecked, setConsentChecked] = React.useState(false);

  // Reset Toggle bei Modal-(Re-)Open. Hard-Line § 11.4 (session-only).
  React.useEffect(() => {
    if (open) setConsentChecked(false);
  }, [open]);

  const titleId = 'religion-consent-modal-title';
  const bodyId = 'religion-consent-modal-body';
  const toggleId = 'religion-consent-modal-toggle';

  let bodyText: string;
  try {
    bodyText = t('stammdaten.disclaimer.religion_art9');
  } catch {
    bodyText = 'stammdaten.disclaimer.religion_art9';
  }

  let toggleLabel: string;
  try {
    toggleLabel = t('stammdaten.disclaimer.religion_consent_toggle_label');
  } catch {
    toggleLabel = 'stammdaten.disclaimer.religion_consent_toggle_label';
  }

  return (
    <AlertDialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <AlertDialogPrimitive.Portal>
        <AlertDialogPrimitive.Backdrop
          className={cn(
            'fixed inset-0 z-50 bg-black/40 data-open:animate-in data-open:fade-in-0',
            'data-closed:animate-out data-closed:fade-out-0',
          )}
        />
        <AlertDialogPrimitive.Popup
          aria-modal="true"
          aria-labelledby={titleId}
          aria-describedby={bodyId}
          className={cn(
            'fixed top-1/2 left-1/2 z-50 grid w-[calc(100vw-2rem)] max-w-xl -translate-x-1/2 -translate-y-1/2 gap-4 rounded-xl border border-border bg-background p-6 text-sm shadow-2xl outline-none',
            'data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95',
            'data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95',
          )}
        >
          <AlertDialogPrimitive.Title
            id={titleId}
            className="text-base font-semibold"
          >
            {tModal('title')}
          </AlertDialogPrimitive.Title>
          <AlertDialogPrimitive.Description
            id={bodyId}
            className="leading-relaxed text-muted-foreground"
            render={<div />}
          >
            <p>{wrapNormZitate(bodyText)}</p>
          </AlertDialogPrimitive.Description>

          <label
            htmlFor={toggleId}
            className="flex items-start gap-2 rounded-lg border border-border bg-muted/30 p-3"
          >
            <input
              id={toggleId}
              type="checkbox"
              checked={consentChecked}
              onChange={(e) => setConsentChecked(e.currentTarget.checked)}
              className="mt-0.5 size-4 cursor-pointer accent-primary"
              data-testid="religion-consent-toggle"
              autoFocus
            />
            <span className="text-xs leading-relaxed text-foreground">
              {toggleLabel}
            </span>
          </label>

          <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
            <AlertDialogPrimitive.Close
              render={
                <Button
                  type="button"
                  variant="outline"
                  onClick={onCancel}
                  disabled={pending}
                />
              }
            >
              {tModal('cta_cancel')}
            </AlertDialogPrimitive.Close>
            <Button
              type="button"
              onClick={onConsent}
              disabled={!consentChecked || pending}
              data-testid="religion-consent-confirm"
            >
              {tModal('cta_show')}
            </Button>
          </div>
        </AlertDialogPrimitive.Popup>
      </AlertDialogPrimitive.Portal>
    </AlertDialogPrimitive.Root>
  );
}
