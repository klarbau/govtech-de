'use client';

import * as React from 'react';
import { AlertDialog as AlertDialogPrimitive } from '@base-ui/react/alert-dialog';
import { useTranslations } from 'next-intl';

import { wrapNormZitate } from '@/components/posteingang/wrapNormZitate';
import { Button } from '@/components/ui/button';
import { useStripBaseUiFocusGuardAriaHidden } from '@/components/ui/use-strip-base-ui-focus-guard-aria-hidden';
import { cn } from '@/lib/utils';

interface PunkteEidReauthModalProps {
  open: boolean;
  onOpenChange: (next: boolean) => void;
  onConfirm: () => void;
  onCancel: () => void;
  pending?: boolean;
}

/**
 * `<PunkteEidReauthModal>` (Spec § 4.1 / HL-MOB-2 / VL-8).
 *
 * Pre-Insertion-Modal-Pattern für den FAER-Punktestand-Pull
 * (§ 30 Abs. 8 + § 30a StVG). Pattern-Konsistenz zu V1
 * `<ReligionConsentModal>` und V1.1 `<PflegegradConsentModal>`:
 *
 *   - Body verbatim aus `stammdaten.disclaimer.faer_punkte_on_demand`
 *   - Toggle „Ich willige in den simulierten FAER-Abruf ein"; primary
 *     „Punktestand abrufen (Mock)" disabled bis Toggle on
 *   - TTL ≤ 5 min — niemals in localStorage (HL-MOB-11)
 *   - Activity-Log-Eintrag pro Pull (kfz_faer_punkte_pulled)
 *
 * a11y: base-ui `<AlertDialog>` mit `aria-modal`, focus-trap, ESC schließt.
 */
export function PunkteEidReauthModal({
  open,
  onOpenChange,
  onConfirm,
  onCancel,
  pending,
}: PunkteEidReauthModalProps) {
  const t = useTranslations();
  const tModal = useTranslations('stammdaten.mobilitaet.punkte.modal');
  useStripBaseUiFocusGuardAriaHidden(open);

  const [consentChecked, setConsentChecked] = React.useState(false);

  // WCAG 2.4.3 / 2.4.7: Trigger merken bei Open, restore bei Close.
  // base-ui-1.4.1 AlertDialog stellt den Fokus nicht zuverlaessig wieder her,
  // wenn der Trigger ueber State-Prop (nicht <Trigger>) eroeffnet wurde
  // (Esc liefert document.activeElement = null). Wir kapseln das hier,
  // damit Caller den Pattern nicht selbst kennen muss.
  const triggerRef = React.useRef<HTMLElement | null>(null);

  React.useEffect(() => {
    if (open) {
      setConsentChecked(false);
      // Trigger = das vorher fokussierte Element (i. d. R. der CTA-Button).
      const active = document.activeElement;
      if (active instanceof HTMLElement) {
        triggerRef.current = active;
      }
      return;
    }
    // Close-Pfad: Focus zurueck, wenn der Trigger noch im DOM ist.
    const trigger = triggerRef.current;
    if (trigger && document.contains(trigger)) {
      // Naechster Frame, damit base-ui den Portal/Backdrop abgebaut hat,
      // bevor wir den Fokus setzen.
      requestAnimationFrame(() => {
        if (document.contains(trigger)) {
          trigger.focus();
        }
      });
    }
    triggerRef.current = null;
  }, [open]);

  const titleId = 'punkte-eid-reauth-modal-title';
  const bodyId = 'punkte-eid-reauth-modal-body';
  const toggleId = 'punkte-eid-reauth-modal-toggle';

  let bodyText: string;
  try {
    bodyText = t('stammdaten.disclaimer.faer_punkte_on_demand');
  } catch {
    bodyText = 'stammdaten.disclaimer.faer_punkte_on_demand';
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
            {tModal('title')}
          </AlertDialogPrimitive.Title>
          <AlertDialogPrimitive.Description
            id={bodyId}
            className="leading-relaxed text-muted-foreground"
            render={<div />}
          >
            <p>{wrapNormZitate(bodyText)}</p>
            <p className="mt-2 text-xs">{wrapNormZitate(tModal('body'))}</p>
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
              data-testid="punkte-eid-reauth-consent-toggle"
              autoFocus
            />
            <span className="text-xs leading-relaxed text-foreground">
              {tModal('consent_toggle_label')}
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
              onClick={onConfirm}
              disabled={!consentChecked || pending}
              data-testid="punkte-eid-reauth-confirm"
            >
              {tModal('cta_confirm')}
            </Button>
          </div>
        </AlertDialogPrimitive.Popup>
      </AlertDialogPrimitive.Portal>
    </AlertDialogPrimitive.Root>
  );
}
