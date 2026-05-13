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
  /**
   * V1.5.1 (Spec § 8.2): wenn `true`, rendert der Dialog mit drei Buttons —
   * primary „Beide als getrennte Briefe versenden" / secondary „Aktuellen
   * Entwurf verwerfen und wechseln" / tertiary „Abbrechen". Trigger ↔ Switch
   * zwischen `rechtsbehelf_einspruch_skelett` und
   * `aussetzung_vollziehung_skelett` auf demselben Letter.
   *
   * Bei `false` (Default) bleibt das V1.5.0-2-Button-Verhalten unverändert
   * (Verwerfen / Abbrechen).
   */
  dualSendMode?: boolean;
  /**
   * Pflicht im 3-Button-Mode: Aktion für „Beide als getrennte Briefe
   * versenden" — startet den Cross-Template-Versand-Pfad in der ReplySheet.
   */
  onDualSend?: () => void;
}

/**
 * Bestätigungs-Dialog vor dem Wechsel der Antwort-Vorlage, wenn der Body
 * bereits Inhalt enthält.
 *
 * V1.5.0: 2-Button-Mode (Verwerfen / Abbrechen).
 * V1.5.1 § 8.2: 3-Button-Mode für Einspruch ↔ Aussetzung-Switch.
 */
export function ReplyTemplateSwitchConfirmDialog({
  open,
  onOpenChange,
  onConfirm,
  onCancel,
  dualSendMode = false,
  onDualSend,
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
          {dualSendMode ? (
            <div className="flex flex-col gap-2 pt-2">
              <Button
                type="button"
                onClick={onDualSend}
                autoFocus
                data-testid="template-switch-dual-send"
              >
                {t('template_switch.dual_send')}
              </Button>
              <Button type="button" variant="outline" onClick={onConfirm}>
                {t('template_switch.discard_and_switch')}
              </Button>
              <AlertDialogPrimitive.Close
                render={
                  <Button type="button" variant="ghost" onClick={onCancel} />
                }
              >
                {t('template_switch.cancel')}
              </AlertDialogPrimitive.Close>
            </div>
          ) : (
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
          )}
        </AlertDialogPrimitive.Popup>
      </AlertDialogPrimitive.Portal>
    </AlertDialogPrimitive.Root>
  );
}
