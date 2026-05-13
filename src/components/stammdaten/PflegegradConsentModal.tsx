'use client';

import * as React from 'react';
import { AlertDialog as AlertDialogPrimitive } from '@base-ui/react/alert-dialog';
import { useTranslations } from 'next-intl';

import { wrapNormZitate } from '@/components/posteingang/wrapNormZitate';
import { RechtsprechungZitatSpan } from '@/components/posteingang/RechtsprechungZitatSpan';
import { Button } from '@/components/ui/button';
import { useStripBaseUiFocusGuardAriaHidden } from '@/components/ui/use-strip-base-ui-focus-guard-aria-hidden';
import { cn } from '@/lib/utils';

interface PflegegradConsentModalProps {
  open: boolean;
  onOpenChange: (next: boolean) => void;
  onConsent: () => void;
  onCancel: () => void;
  pending?: boolean;
}

/**
 * `<PflegegradConsentModal>` (Spec § 11.22 Hard-Line — Stammdaten V1.1).
 *
 * Pre-Insertion-Modal-Pattern für die Pflegegrad-Anzeige (Art. 9 DSGVO,
 * § 14 SGB XI). Pattern-Konsistenz zu V1 `<ReligionConsentModal>`:
 *
 *   - Body verbatim aus `stammdaten.disclaimer.pflegegrad_art9`
 *     (mit EuGH C-184/20 + § 14 SGB XI + § 18c SGB XI Verweisen)
 *   - Toggle-Label verbatim aus
 *     `stammdaten.disclaimer.pflegegrad_consent_toggle_label`
 *   - Toggle initial off; primary „Pflegegrad anzeigen" disabled bis
 *     Toggle on
 *   - Einwilligung gilt NUR für die aktuelle Sitzung (Hard-Line § 11.22) —
 *     der Caller speichert den Status NICHT in `localStorage`, ausschließlich
 *     in `sessionStorage` mit Key
 *     `govtech-de:v1:stammdaten:pflegegrad-consent-session`
 *   - KEIN „nicht mehr zeigen"-Checkbox (Pattern-Konsistenz § 11.20-V1)
 *
 * a11y:
 *   - `role="alertdialog"` (base-ui-Default), `aria-modal="true"`,
 *     `aria-labelledby`, `aria-describedby`, focus-trap, ESC schließt
 *   - Norm-Zitate im Body via `wrapNormZitate` (Hard-Line § 11.7)
 *   - EuGH-Zitat als `<RechtsprechungZitatSpan>` mit Tooltip-Anker
 *     (Hard-Line § 11.28)
 *   - `useStripBaseUiFocusGuardAriaHidden(open)` MUSS — workaroundet
 *     base-ui-1.4.1-FocusGuard-`aria-hidden`-Bug (V1-Lesson #4)
 */
export function PflegegradConsentModal({
  open,
  onOpenChange,
  onConsent,
  onCancel,
  pending,
}: PflegegradConsentModalProps) {
  const t = useTranslations();
  const tModal = useTranslations('stammdaten.modal.pflegegrad_consent');
  // Lesson #4: base-ui-FocusGuard-Bug Workaround MUSS für jedes Modal.
  useStripBaseUiFocusGuardAriaHidden(open);

  const [consentChecked, setConsentChecked] = React.useState(false);

  // Reset Toggle bei Modal-(Re-)Open. Hard-Line § 11.22 (session-only).
  React.useEffect(() => {
    if (open) setConsentChecked(false);
  }, [open]);

  const titleId = 'pflegegrad-consent-modal-title';
  const bodyId = 'pflegegrad-consent-modal-body';
  const toggleId = 'pflegegrad-consent-modal-toggle';

  let bodyText: string;
  try {
    bodyText = t('stammdaten.disclaimer.pflegegrad_art9');
  } catch {
    bodyText = 'stammdaten.disclaimer.pflegegrad_art9';
  }

  let toggleLabel: string;
  try {
    toggleLabel = t('stammdaten.disclaimer.pflegegrad_consent_toggle_label');
  } catch {
    toggleLabel =
      'Ich willige ausdrücklich in die Anzeige meines Pflegegrads ein (Art. 9 Abs. 2 lit. a DSGVO).';
  }

  let titleText: string;
  try {
    titleText = tModal('title');
  } catch {
    titleText = 'Pflegegrad anzeigen — Einwilligung erforderlich';
  }
  let ctaShow: string;
  try {
    ctaShow = tModal('cta_show');
  } catch {
    ctaShow = 'Pflegegrad anzeigen';
  }
  let ctaCancel: string;
  try {
    ctaCancel = tModal('cta_cancel');
  } catch {
    ctaCancel = 'Abbrechen';
  }

  return (
    <AlertDialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <AlertDialogPrimitive.Portal>
        <AlertDialogPrimitive.Backdrop
          className={cn(
            'fixed inset-0 z-50 bg-black/40',
            'data-open:animate-in data-open:fade-in-0',
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
            {titleText}
          </AlertDialogPrimitive.Title>
          <AlertDialogPrimitive.Description
            id={bodyId}
            className="leading-relaxed text-muted-foreground"
            render={<div />}
          >
            <p>{wrapNormZitate(bodyText)}</p>
            <p className="mt-2 text-xs">
              {t('stammdaten.modal.pflegegrad_consent.eugh_lesart_intro')}{' '}
              <RechtsprechungZitatSpan text="EuGH C-184/20" inline />.
            </p>
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
              data-testid="pflegegrad-consent-toggle"
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
              {ctaCancel}
            </AlertDialogPrimitive.Close>
            <Button
              type="button"
              onClick={onConsent}
              disabled={!consentChecked || pending}
              data-testid="pflegegrad-consent-confirm"
            >
              {ctaShow}
            </Button>
          </div>
        </AlertDialogPrimitive.Popup>
      </AlertDialogPrimitive.Portal>
    </AlertDialogPrimitive.Root>
  );
}
