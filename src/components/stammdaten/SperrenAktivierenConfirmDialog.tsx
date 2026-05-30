'use client';

import * as React from 'react';
import { AlertDialog as AlertDialogPrimitive } from '@base-ui/react/alert-dialog';
import { useTranslations } from 'next-intl';

import { wrapNormZitate } from '@/components/posteingang/wrapNormZitate';
import { Button } from '@/components/ui/button';
import { useStripBaseUiFocusGuardAriaHidden } from '@/components/ui/use-strip-base-ui-focus-guard-aria-hidden';
import { useInertOutsideModal } from '@/components/ui/use-inert-outside-modal';
import { cn } from '@/lib/utils';

const MIN_BEGRUENDUNG = 30;

interface SperrenAktivierenConfirmDialogProps {
  open: boolean;
  onOpenChange: (next: boolean) => void;
  /**
   * Variante:
   *  - 'auskunftssperre' (§ 51 Abs. 1 BMG) → Begründungs-Textarea ≥ 30 Zeichen.
   *  - 'uebermittlungssperre' (§§ 42 Abs. 3 / 50 Abs. 5 BMG) → ohne Begründung.
   */
  variante: 'auskunftssperre' | 'uebermittlungssperre';
  /** Welche konkrete Übermittlungssperre — nur für `uebermittlungssperre`. */
  uebermittlungssperreLabel?: string;
  onConfirm: (input: { begruendung?: string }) => void;
  onCancel: () => void;
  pending?: boolean;
}

/**
 * `<SperrenAktivierenConfirmDialog>` (Spec § 3 / Hard-Lines § 11.13 +
 * § 11.14 + § 11.20).
 *
 * Pre-Insertion-Modal-Pattern für die Sperren-Toggles. Body verbatim aus
 * `stammdaten.disclaimer.sperren_mock_pattern`. Bei Auskunftssperre § 51 Abs. 1
 * BMG erscheint zusätzlich eine Begründungs-Textarea mit Min-30-Zeichen-
 * Validierung (Hard-Line § 11.14).
 *
 * a11y: `role="alertdialog"`, `aria-modal`, focus-trap, ESC = Cancel,
 * Norm-Zitate im Body via `wrapNormZitate`. Hard-Line § 11.20:
 * keine „nicht mehr zeigen"-Checkbox.
 */
export function SperrenAktivierenConfirmDialog({
  open,
  onOpenChange,
  variante,
  uebermittlungssperreLabel,
  onConfirm,
  onCancel,
  pending,
}: SperrenAktivierenConfirmDialogProps) {
  const t = useTranslations();
  const tModal = useTranslations('stammdaten.modal.sperren_aktivieren');
  useStripBaseUiFocusGuardAriaHidden(open);
  useInertOutsideModal(open);

  const [begruendung, setBegruendung] = React.useState('');
  const textareaRef = React.useRef<HTMLTextAreaElement | null>(null);

  React.useEffect(() => {
    if (open) {
      setBegruendung('');
      // Auto-Focus Textarea bei Auskunftssperre (a11y-Empfehlung in Spec § 3).
      if (variante === 'auskunftssperre') {
        // Verzögern bis nach Mount/Portal.
        setTimeout(() => textareaRef.current?.focus(), 0);
      }
    }
  }, [open, variante]);

  const titleId = 'sperren-aktivieren-modal-title';
  const bodyId = 'sperren-aktivieren-modal-body';

  let bodyText: string;
  try {
    bodyText = t('stammdaten.disclaimer.sperren_mock_pattern');
  } catch {
    bodyText = 'stammdaten.disclaimer.sperren_mock_pattern';
  }

  const begruendungValid =
    variante !== 'auskunftssperre' ||
    begruendung.trim().length >= MIN_BEGRUENDUNG;

  const begruendungError =
    variante === 'auskunftssperre' &&
    begruendung.length > 0 &&
    begruendung.trim().length < MIN_BEGRUENDUNG;

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
            {variante === 'auskunftssperre'
              ? tModal('title_auskunftssperre')
              : tModal('title_uebermittlungssperre', {
                  sperre: uebermittlungssperreLabel ?? '',
                })}
          </AlertDialogPrimitive.Title>
          <AlertDialogPrimitive.Description
            id={bodyId}
            className="leading-relaxed text-muted-foreground"
            render={<div />}
          >
            <p>{wrapNormZitate(bodyText)}</p>
          </AlertDialogPrimitive.Description>

          {variante === 'auskunftssperre' && (
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="sperren-begruendung"
                className="text-sm font-medium text-foreground"
              >
                {tModal('begruendung_label')}
              </label>
              <textarea
                ref={textareaRef}
                id="sperren-begruendung"
                value={begruendung}
                onChange={(e) => setBegruendung(e.currentTarget.value)}
                rows={4}
                aria-invalid={begruendungError || undefined}
                aria-describedby="sperren-begruendung-helper"
                data-testid="sperren-begruendung-textarea"
                className={cn(
                  'w-full rounded-lg border border-border bg-background px-3 py-2 text-sm leading-relaxed shadow-sm',
                  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
                  'aria-[invalid=true]:border-destructive aria-[invalid=true]:ring-2 aria-[invalid=true]:ring-destructive/30',
                )}
              />
              <p
                id="sperren-begruendung-helper"
                className={cn(
                  'text-[11px] leading-relaxed',
                  begruendungError ? 'text-destructive' : 'text-muted-foreground',
                )}
                data-testid="sperren-begruendung-helper"
              >
                {begruendungError
                  ? tModal('begruendung_too_short_template', {
                      count: begruendung.trim().length,
                      min: MIN_BEGRUENDUNG,
                    })
                  : tModal('begruendung_helper_template', {
                      count: begruendung.trim().length,
                      min: MIN_BEGRUENDUNG,
                    })}
              </p>
            </div>
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
              onClick={() =>
                onConfirm({
                  begruendung:
                    variante === 'auskunftssperre' ? begruendung : undefined,
                })
              }
              disabled={!begruendungValid || pending}
              data-testid="sperren-confirm-button"
              autoFocus={variante !== 'auskunftssperre'}
            >
              {tModal('cta_activate')}
            </Button>
          </div>
        </AlertDialogPrimitive.Popup>
      </AlertDialogPrimitive.Portal>
    </AlertDialogPrimitive.Root>
  );
}
