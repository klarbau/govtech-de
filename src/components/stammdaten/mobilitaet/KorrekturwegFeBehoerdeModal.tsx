'use client';

import * as React from 'react';
import { Dialog as DialogPrimitive } from '@base-ui/react/dialog';
import { useTranslations } from 'next-intl';
import { ExternalLink } from 'lucide-react';

import { wrapNormZitate } from '@/components/posteingang/wrapNormZitate';
import { BehoerdenBadge } from '@/components/shared/BehoerdenBadge';
import { Button } from '@/components/ui/button';
import { useStripBaseUiFocusGuardAriaHidden } from '@/components/ui/use-strip-base-ui-focus-guard-aria-hidden';
import { useInertOutsideModal } from '@/components/ui/use-inert-outside-modal';
import { cn } from '@/lib/utils';
import type { Behoerde } from '@/types';

interface KorrekturwegFeBehoerdeModalProps {
  open: boolean;
  onOpenChange: (next: boolean) => void;
  /** Zuständige Fahrerlaubnisbehörde (kommune; § 73 FeV). */
  behoerde?: Behoerde;
  onClose: () => void;
}

/**
 * `<KorrekturwegFeBehoerdeModal>` (Spec § 4.1 / VL-10 / HL-MOB-10).
 *
 * Wegweiser-Modal: zeigt die zuständige kommunale Fahrerlaubnisbehörde mit
 * Adresse, Telefonkontakt-Mock, OZG-Online-Dienst-Status + Hinweis
 * „Diese App ist nicht-hoheitlich".
 *
 * **Kein** Self-Edit-Pfad (HL-MOB-10): keine FE-Nr-Self-Edit-Affordance,
 * kein Speculative-Push-Modal. Pattern-Konsistenz zu V1.2
 * `PostanschriftCrossRefCard`: rein wegweisend.
 *
 * a11y: base-ui `<Dialog>`, `aria-modal="true"`, focus-trap;
 * `useStripBaseUiFocusGuardAriaHidden` Workaround für base-ui-1.4.1-Bug.
 */
export function KorrekturwegFeBehoerdeModal({
  open,
  onOpenChange,
  behoerde,
  onClose,
}: KorrekturwegFeBehoerdeModalProps) {
  const t = useTranslations('stammdaten.mobilitaet.fe.korrekturweg_modal');
  useStripBaseUiFocusGuardAriaHidden(open);
  useInertOutsideModal(open);

  const titleId = 'korrekturweg-fe-modal-title';
  const bodyId = 'korrekturweg-fe-modal-body';

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange} modal>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Backdrop
          className={cn(
            'fixed inset-0 z-50 bg-black/40',
            'data-open:animate-in data-open:fade-in-0',
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
          <DialogPrimitive.Title
            id={titleId}
            className="text-base font-semibold"
          >
            {t('title')}
          </DialogPrimitive.Title>
          <DialogPrimitive.Description
            id={bodyId}
            className="leading-relaxed text-muted-foreground"
            render={<div />}
          >
            <p>{wrapNormZitate(t('body'))}</p>
          </DialogPrimitive.Description>

          {behoerde && (
            <section
              aria-label={behoerde.name_de}
              className="flex flex-col gap-2 rounded-lg border border-border bg-muted/30 p-3"
              data-testid="korrekturweg-fe-modal-behoerde"
            >
              <BehoerdenBadge
                name={behoerde.name_de}
                kategorie={behoerde.kategorie}
              />
              <p className="text-xs leading-relaxed text-muted-foreground">
                {behoerde.adresse.strasse} {behoerde.adresse.hausnummer},{' '}
                {behoerde.adresse.plz} {behoerde.adresse.ort}
              </p>
              <dl className="grid grid-cols-1 gap-1 text-xs sm:grid-cols-2">
                <div className="flex flex-col">
                  <dt className="font-medium text-muted-foreground">
                    {t('telefonkontakt_label')}
                  </dt>
                  <dd className="font-mono text-foreground">[MOCK] +49 …</dd>
                </div>
                <div className="flex flex-col">
                  <dt className="font-medium text-muted-foreground">
                    {t('online_dienst_label')}
                  </dt>
                  <dd className="text-foreground">{t('online_dienst_value_mock')}</dd>
                </div>
              </dl>
              {behoerde.online.portal_url && (
                <a
                  href={behoerde.online.portal_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 self-start text-xs font-medium text-foreground underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                >
                  {behoerde.online.portal_url}
                  <ExternalLink className="size-3" aria-hidden="true" />
                </a>
              )}
            </section>
          )}

          <div className="flex justify-end pt-2">
            <DialogPrimitive.Close
              render={
                <Button type="button" variant="outline" onClick={onClose} />
              }
            >
              {t('cta_close')}
            </DialogPrimitive.Close>
          </div>
        </DialogPrimitive.Popup>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
