'use client';

import * as React from 'react';
import { AlertDialog as AlertDialogPrimitive } from '@base-ui/react/alert-dialog';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';
import { useStripBaseUiFocusGuardAriaHidden } from '@/components/ui/use-strip-base-ui-focus-guard-aria-hidden';
import { cn } from '@/lib/utils';

interface MobilOtpMockModalProps {
  open: boolean;
  onOpenChange: (next: boolean) => void;
  onVerify: (code: string) => Promise<void>;
  onCancel: () => void;
  pending?: boolean;
  errorText?: string | null;
}

/**
 * `<MobilOtpMockModal>` — Spec § 6.5 + Hard-Line § 11.37.
 *
 * Mock-OTP-Modal für Mobilfunk-Verifikation. Demo-Pattern:
 * Code `124857` wird akzeptiert. Banner: „Kein echter SMS-Versand".
 *
 * a11y: base-ui `<AlertDialog>` mit `aria-modal`, `aria-labelledby`,
 * `aria-describedby`, focus-trap, ESC schließt. `useStripBaseUiFocusGuardAriaHidden`
 * Workaround für base-ui-1.4.1-FocusGuard-Bug (V1.5-Lesson #4).
 */
export function MobilOtpMockModal({
  open,
  onOpenChange,
  onVerify,
  onCancel,
  pending,
  errorText,
}: MobilOtpMockModalProps) {
  const tModal = useTranslations('stammdaten.kontakt.modal.mobil_otp');
  useStripBaseUiFocusGuardAriaHidden(open);

  const [code, setCode] = React.useState('');

  React.useEffect(() => {
    if (open) setCode('');
  }, [open]);

  const titleId = 'mobil-otp-modal-title';
  const bodyId = 'mobil-otp-modal-body';
  const inputId = 'mobil-otp-modal-input';

  const handleVerify = async () => {
    if (code.length === 0) return;
    await onVerify(code.trim());
  };

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
            <p className="text-xs">{tModal('demo_hint')}</p>
          </AlertDialogPrimitive.Description>

          <label htmlFor={inputId} className="flex flex-col gap-1">
            <span className="text-xs font-medium text-foreground">
              {tModal('input_label')}
            </span>
            <input
              id={inputId}
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={code}
              onChange={(e) =>
                setCode(e.currentTarget.value.replace(/\D/g, '').slice(0, 6))
              }
              className="rounded-md border border-border bg-background px-3 py-2 font-mono tracking-[0.5em] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              placeholder={tModal('input_placeholder')}
              data-testid="mobil-otp-input"
              autoFocus
            />
          </label>

          {errorText && (
            <p
              role="alert"
              className="text-xs text-destructive"
              data-testid="mobil-otp-error"
            >
              {errorText}
            </p>
          )}

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
              onClick={handleVerify}
              disabled={code.length < 6 || pending}
              data-testid="mobil-otp-verify"
            >
              {tModal('cta_verify')}
            </Button>
          </div>
        </AlertDialogPrimitive.Popup>
      </AlertDialogPrimitive.Portal>
    </AlertDialogPrimitive.Root>
  );
}
