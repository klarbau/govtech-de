'use client';

import { useTranslations } from 'next-intl';
import { AlertDialog as AlertDialogPrimitive } from '@base-ui/react/alert-dialog';

import { Button } from '@/components/ui/button';
import { useStripBaseUiFocusGuardAriaHidden } from '@/components/ui/use-strip-base-ui-focus-guard-aria-hidden';
import { cn } from '@/lib/utils';

interface ReplyTemplateSwitchConfirmDialogProps {
  open: boolean;
  onOpenChange: (next: boolean) => void;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Bestätigungs-Dialog vor dem Wechsel der Antwort-Vorlage, wenn der Body
 * bereits Inhalt enthält (Spec §4.6 + Code-Review BLOCKER #1, 2026-05-09).
 * Ersetzt `window.confirm`, damit (a) `title`, `body`, `cta_yes`, `cta_no`
 * via `t()` lokalisiert sind und (b) die Bestätigungs-UI dem Restdesign folgt.
 */
export function ReplyTemplateSwitchConfirmDialog({
  open,
  onOpenChange,
  onConfirm,
  onCancel,
}: ReplyTemplateSwitchConfirmDialogProps) {
  const t = useTranslations('posteingang.compose');
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
            'fixed top-1/2 left-1/2 z-50 grid w-full max-w-md -translate-x-1/2 -translate-y-1/2 gap-4 rounded-xl border border-border bg-background p-6 text-sm shadow-2xl outline-none',
            'data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95',
            'data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95',
          )}
        >
          <AlertDialogPrimitive.Title className="text-base font-semibold">
            {t('template_switch_confirm_title')}
          </AlertDialogPrimitive.Title>
          <AlertDialogPrimitive.Description className="leading-relaxed text-muted-foreground">
            {t('template_switch_confirm_body')}
          </AlertDialogPrimitive.Description>
          <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
            <AlertDialogPrimitive.Close
              render={
                <Button type="button" variant="outline" onClick={onCancel} />
              }
            >
              {t('template_switch_confirm_cta_no')}
            </AlertDialogPrimitive.Close>
            <Button type="button" onClick={onConfirm}>
              {t('template_switch_confirm_cta_yes')}
            </Button>
          </div>
        </AlertDialogPrimitive.Popup>
      </AlertDialogPrimitive.Portal>
    </AlertDialogPrimitive.Root>
  );
}
