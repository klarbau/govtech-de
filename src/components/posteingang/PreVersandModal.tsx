'use client';

import { useTranslations } from 'next-intl';
import { AlertDialog as AlertDialogPrimitive } from '@base-ui/react/alert-dialog';

import { Button } from '@/components/ui/button';
import { useStripBaseUiFocusGuardAriaHidden } from '@/components/ui/use-strip-base-ui-focus-guard-aria-hidden';
import { cn } from '@/lib/utils';

interface PreVersandModalProps {
  open: boolean;
  onOpenChange: (next: boolean) => void;
  empfaengerBehoerde: string;
  onConfirm: () => void;
  pending?: boolean;
}

/**
 * Pre-Versand-Bestätigungs-Modal (Spec §4.6.1, §11 #1; Verifier-Verbatim).
 *
 * Wortlaut **nicht-modifizierbar** durch UI: kommt verbatim aus
 * `posteingang.compose.versand_modal.body`. shadcn-`<AlertDialog>` (focus-trap,
 * `aria-modal`, ESC dismisses).
 */
export function PreVersandModal({
  open,
  onOpenChange,
  empfaengerBehoerde,
  onConfirm,
  pending,
}: PreVersandModalProps) {
  const t = useTranslations('posteingang.compose.versand_modal');
  useStripBaseUiFocusGuardAriaHidden(open);
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
          className={cn(
            'fixed top-1/2 left-1/2 z-50 grid w-full max-w-lg -translate-x-1/2 -translate-y-1/2 gap-4 rounded-xl border border-border bg-background p-6 text-sm shadow-2xl outline-none',
            'data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95',
            'data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95',
          )}
        >
          <AlertDialogPrimitive.Title className="text-base font-semibold">
            {t('title')}
          </AlertDialogPrimitive.Title>
          <AlertDialogPrimitive.Description className="leading-relaxed text-muted-foreground">
            {t('body', { empfaenger_behoerde: empfaengerBehoerde })}
          </AlertDialogPrimitive.Description>
          <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
            <AlertDialogPrimitive.Close
              render={
                <Button type="button" variant="outline" disabled={pending} />
              }
            >
              {t('cta_cancel')}
            </AlertDialogPrimitive.Close>
            <Button type="button" onClick={onConfirm} disabled={pending}>
              {t('cta_send')}
            </Button>
          </div>
        </AlertDialogPrimitive.Popup>
      </AlertDialogPrimitive.Portal>
    </AlertDialogPrimitive.Root>
  );
}
