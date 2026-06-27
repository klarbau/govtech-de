'use client';

import * as React from 'react';
import { AlertDialog as AlertDialogPrimitive } from '@base-ui/react/alert-dialog';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';
import { useStripBaseUiFocusGuardAriaHidden } from '@/components/ui/use-strip-base-ui-focus-guard-aria-hidden';
import { useInertOutsideModal } from '@/components/ui/use-inert-outside-modal';
import { cn } from '@/lib/utils';

interface TerminAbsagenDialogProps {
  open: boolean;
  onOpenChange: (next: boolean) => void;
  onConfirm: () => void;
  onCancel: () => void;
  pending?: boolean;
  /**
   * Element, das beim Schließen den Fokus zurückerhält (WCAG 2.4.3). Der
   * native `autoFocus` der „Behalten"-Schaltfläche stört base-uis automatische
   * Trigger-Erkennung im kontrollierten Modus → wir geben das öffnende Element
   * (in `TermineView` beim Klick gemerkt) explizit als `finalFocus` weiter.
   */
  finalFocusRef?: React.RefObject<HTMLElement | null>;
}

/**
 * `<TerminAbsagenDialog>` (redesign-termine-vorgemerkt.md, Tier 2, § 4.1).
 *
 * Ersetzt den nativen `window.confirm()`. base-ui-`AlertDialog`-Muster aus
 * `SperrenAktivierenConfirmDialog`: `role="alertdialog"`, `aria-modal`, Focus-Trap
 * (`useInertOutsideModal` + `useStripBaseUiFocusGuardAriaHidden`), ESC = Behalten.
 * Pro-soziale Copy: „Absagen" / „Behalten".
 */
export function TerminAbsagenDialog({
  open,
  onOpenChange,
  onConfirm,
  onCancel,
  pending,
  finalFocusRef,
}: TerminAbsagenDialogProps) {
  const t = useTranslations('termine.absagen');
  useStripBaseUiFocusGuardAriaHidden(open);
  useInertOutsideModal(open);

  const titleId = 'termin-absagen-title';
  const bodyId = 'termin-absagen-body';

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
          finalFocus={finalFocusRef}
          className={cn(
            'fixed top-1/2 left-1/2 z-50 grid w-[calc(100vw-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 gap-4 rounded-xl border border-border bg-background p-6 text-sm shadow-2xl outline-none',
            'data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95',
            'data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95',
          )}
        >
          <AlertDialogPrimitive.Title
            id={titleId}
            className="text-base font-semibold"
          >
            {t('title')}
          </AlertDialogPrimitive.Title>
          <AlertDialogPrimitive.Description
            id={bodyId}
            className="leading-relaxed text-muted-foreground"
          >
            {t('body')}
          </AlertDialogPrimitive.Description>

          <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
            <AlertDialogPrimitive.Close
              render={
                <Button
                  type="button"
                  variant="outline"
                  onClick={onCancel}
                  disabled={pending}
                  autoFocus
                />
              }
            >
              {t('cta_cancel')}
            </AlertDialogPrimitive.Close>
            <Button
              type="button"
              variant="destructive"
              onClick={onConfirm}
              disabled={pending}
            >
              {t('cta_confirm')}
            </Button>
          </div>
        </AlertDialogPrimitive.Popup>
      </AlertDialogPrimitive.Portal>
    </AlertDialogPrimitive.Root>
  );
}
