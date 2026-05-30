'use client';

import { AlertDialog as AlertDialogPrimitive } from '@base-ui/react/alert-dialog';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';
import { useStripBaseUiFocusGuardAriaHidden } from '@/components/ui/use-strip-base-ui-focus-guard-aria-hidden';
import { useInertOutsideModal } from '@/components/ui/use-inert-outside-modal';
import { cn } from '@/lib/utils';

interface SaveConfirmDialogProps {
  open: boolean;
  onOpenChange: (next: boolean) => void;
  onConfirm: () => void;
  onCancel: () => void;
  pending?: boolean;
}

/**
 * `<SaveConfirmDialog>` — Spec § 2.1 + Hard-Line § 11.36.
 *
 * Erneuter Save-Confirm-Dialog pro Mutation in der Notification-
 * Präferenzen-Sektion. Doppel-Disclaimer (Vision-Charakter). Primary
 * „Demo-Präferenz speichern" / Tertiary „Abbrechen". Niemals skip-bar.
 *
 * a11y: base-ui `<AlertDialog>` mit role="alertdialog", aria-modal,
 * aria-labelledby, aria-describedby, focus-trap, ESC schließt mit
 * Cancel-Semantik. Workaround-Hook für base-ui-1.4.1-FocusGuard-Bug.
 */
export function SaveConfirmDialog({
  open,
  onOpenChange,
  onConfirm,
  onCancel,
  pending,
}: SaveConfirmDialogProps) {
  const tModal = useTranslations('stammdaten.kontakt.modal.save_confirm');
  const tNotif = useTranslations('stammdaten.kontakt.notification');
  useStripBaseUiFocusGuardAriaHidden(open);
  useInertOutsideModal(open);

  const titleId = 'kontakt-save-confirm-title';
  const bodyId = 'kontakt-save-confirm-body';

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
            'fixed top-1/2 left-1/2 z-50 grid w-[calc(100vw-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 gap-4 rounded-xl border border-border bg-background p-6 text-sm shadow-2xl outline-none',
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
            <p>{tNotif('save_confirm_body')}</p>
          </AlertDialogPrimitive.Description>

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
              {tNotif('save_confirm.cta_cancel')}
            </AlertDialogPrimitive.Close>
            <Button
              type="button"
              onClick={onConfirm}
              disabled={pending}
              data-testid="kontakt-save-confirm-primary"
              autoFocus
            >
              {tNotif('save_confirm.cta_save')}
            </Button>
          </div>
        </AlertDialogPrimitive.Popup>
      </AlertDialogPrimitive.Portal>
    </AlertDialogPrimitive.Root>
  );
}
