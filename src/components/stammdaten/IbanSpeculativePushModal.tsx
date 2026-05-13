'use client';

import * as React from 'react';
import { Dialog as DialogPrimitive } from '@base-ui/react/dialog';
import { useTranslations } from 'next-intl';

import { wrapNormZitate } from '@/components/posteingang/wrapNormZitate';
import { Button } from '@/components/ui/button';
import { useStripBaseUiFocusGuardAriaHidden } from '@/components/ui/use-strip-base-ui-focus-guard-aria-hidden';
import { cn } from '@/lib/utils';

import { IbanSpeculativeBadge } from './IbanSpeculativeBadge';

export interface IbanSpeculativePushTargets {
  familienkasse: boolean;
  elster: boolean;
  gkv: boolean;
}

interface IbanSpeculativePushModalProps {
  open: boolean;
  onOpenChange: (next: boolean) => void;
  iban: string;
  onConfirm: (targets: IbanSpeculativePushTargets) => void;
  onCancel: () => void;
  pending?: boolean;
}

/**
 * `<IbanSpeculativePushModal>` (Spec § 3 / Hard-Lines § 11.12 + § 11.20).
 *
 * Mock-Push für 3 Empfänger (Familienkasse, ELSTER, GKV) mit individuellen
 * Toggles. Keine echte API-Anbindung; jeder Toggle erzeugt einen
 * `speculative_2027`-Activity-Log-Eintrag.
 *
 * Disclaimer-4 (`iban_speculative`) verbatim im Body, gewrappt mit
 * `<NormZitatSpan>` (Hard-Line § 11.7).
 */
export function IbanSpeculativePushModal({
  open,
  onOpenChange,
  iban,
  onConfirm,
  onCancel,
  pending,
}: IbanSpeculativePushModalProps) {
  const t = useTranslations();
  const tModal = useTranslations('stammdaten.modal.iban_push');
  useStripBaseUiFocusGuardAriaHidden(open);

  const [targets, setTargets] = React.useState<IbanSpeculativePushTargets>({
    familienkasse: false,
    elster: false,
    gkv: false,
  });

  React.useEffect(() => {
    if (open) setTargets({ familienkasse: false, elster: false, gkv: false });
  }, [open]);

  let bodyText: string;
  try {
    bodyText = t('stammdaten.disclaimer.iban_speculative');
  } catch {
    bodyText = 'stammdaten.disclaimer.iban_speculative';
  }

  const titleId = 'iban-push-modal-title';
  const bodyId = 'iban-push-modal-body';

  const noTargetSelected = !targets.familienkasse && !targets.elster && !targets.gkv;

  const empfaenger: Array<{
    key: keyof IbanSpeculativePushTargets;
    label: string;
  }> = [
    { key: 'familienkasse', label: tModal('empfaenger_label.familienkasse') },
    { key: 'elster', label: tModal('empfaenger_label.elster') },
    { key: 'gkv', label: tModal('empfaenger_label.gkv') },
  ];

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
            'fixed top-1/2 left-1/2 z-50 grid w-[calc(100vw-2rem)] max-w-xl -translate-x-1/2 -translate-y-1/2 gap-4 rounded-xl border border-border bg-background p-6 text-sm shadow-2xl outline-none',
            'data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95',
            'data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95',
          )}
        >
          <DialogPrimitive.Title id={titleId} className="flex items-center gap-2 text-base font-semibold">
            {tModal('title')}
            <IbanSpeculativeBadge />
          </DialogPrimitive.Title>
          <DialogPrimitive.Description
            id={bodyId}
            className="leading-relaxed text-muted-foreground"
            render={<div />}
          >
            <p>{wrapNormZitate(bodyText)}</p>
            <p className="mt-2 text-foreground">
              <span className="font-medium">{tModal('iban_label')}:</span>{' '}
              <span className="font-mono">{iban}</span>
            </p>
          </DialogPrimitive.Description>

          <fieldset className="flex flex-col gap-2 rounded-lg border border-border bg-muted/30 p-3">
            <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {tModal('empfaenger_legend')}
            </legend>
            {empfaenger.map(({ key, label }) => (
              <label
                key={key}
                htmlFor={`iban-target-${key}`}
                className="flex items-center gap-2 text-sm text-foreground"
              >
                <input
                  id={`iban-target-${key}`}
                  type="checkbox"
                  className="size-4 cursor-pointer accent-primary"
                  checked={targets[key]}
                  onChange={(e) =>
                    setTargets((prev) => ({
                      ...prev,
                      [key]: e.currentTarget.checked,
                    }))
                  }
                  data-testid={`iban-target-${key}`}
                />
                <span>{label}</span>
              </label>
            ))}
          </fieldset>

          <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
            <DialogPrimitive.Close
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
            </DialogPrimitive.Close>
            <Button
              type="button"
              onClick={() => onConfirm(targets)}
              disabled={noTargetSelected || pending}
              data-testid="iban-push-confirm"
            >
              {tModal('cta_simulate')}
            </Button>
          </div>
        </DialogPrimitive.Popup>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
