'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { ExternalLink } from 'lucide-react';
import { AlertDialog as AlertDialogPrimitive } from '@base-ui/react/alert-dialog';

import { wrapNormZitate } from '@/components/posteingang/wrapNormZitate';
import { Button } from '@/components/ui/button';
import { useStripBaseUiFocusGuardAriaHidden } from '@/components/ui/use-strip-base-ui-focus-guard-aria-hidden';
import { cn } from '@/lib/utils';

/**
 * `<ZfdrWegweiserCard>` (Spec § 11.23 Hard-Line — Stammdaten V1.1).
 *
 * Wegweiser-Card auf rentenuebersicht.de mit Disclaimer-9 verbatim
 * (Versorgungswerke/Beamten/Direktzusagen-Ehrlichkeits-Klausel). KEIN
 * OAuth-Flow, KEIN Anwartschafts-Aggregations-Mock, KEIN Kontostand-
 * Render — nur ein externer Link mit Mock-Disclaimer-Modal vor Navigation.
 *
 * a11y:
 *   - `<section aria-labelledby>` mit `<h3>`-Header
 *   - Disclaimer-Body via `wrapNormZitate` (Norm-Zitate werden gewrappt)
 *   - Link öffnet Pre-Insertion-Modal (`<AlertDialog>`) statt sofortiger
 *     Navigation; user-bestätigtes Link-Klick → `window.open(...)`.
 */
export function ZfdrWegweiserCard() {
  const t = useTranslations();
  const tCard = useTranslations('stammdaten.altersvorsorge.zfdr_wegweiser');

  const [confirmOpen, setConfirmOpen] = React.useState(false);
  useStripBaseUiFocusGuardAriaHidden(confirmOpen);

  let title: string;
  try {
    title = tCard('title');
  } catch {
    title = 'Trägerübergreifender Überblick: Digitale Rentenübersicht';
  }
  let cta: string;
  try {
    cta = tCard('cta');
  } catch {
    cta = 'Zur Digitalen Rentenübersicht (rentenuebersicht.de)';
  }
  let disclaimerBody: string;
  try {
    disclaimerBody = t('stammdaten.disclaimer.zfdr_unvollstaendig');
  } catch {
    disclaimerBody = 'stammdaten.disclaimer.zfdr_unvollstaendig';
  }

  const titleId = 'zfdr-wegweiser-title';
  const dialogTitleId = 'zfdr-confirm-title';
  const dialogBodyId = 'zfdr-confirm-body';

  function openExternal() {
    setConfirmOpen(false);
    if (typeof window !== 'undefined') {
      window.open('https://rentenuebersicht.de', '_blank', 'noopener');
    }
  }

  return (
    <section
      aria-labelledby={titleId}
      className="rounded-xl border border-border bg-card p-4 shadow-sm"
      data-testid="zfdr-wegweiser-card"
    >
      <h3
        id={titleId}
        className="text-sm font-semibold tracking-tight text-foreground"
      >
        {title}
      </h3>
      <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
        {wrapNormZitate(disclaimerBody)}
      </p>
      <div className="mt-3">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setConfirmOpen(true)}
          data-testid="zfdr-wegweiser-cta"
        >
          <ExternalLink className="mr-1 size-4" aria-hidden="true" />
          {cta}
        </Button>
      </div>

      <AlertDialogPrimitive.Root open={confirmOpen} onOpenChange={setConfirmOpen}>
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
            aria-labelledby={dialogTitleId}
            aria-describedby={dialogBodyId}
            className={cn(
              'fixed top-1/2 left-1/2 z-50 grid w-[calc(100vw-2rem)] max-w-md',
              '-translate-x-1/2 -translate-y-1/2 gap-4 rounded-xl border border-border',
              'bg-background p-6 text-sm shadow-2xl outline-none',
              'data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95',
              'data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95',
            )}
          >
            <AlertDialogPrimitive.Title
              id={dialogTitleId}
              className="text-base font-semibold"
            >
              Externer Link wird geöffnet
            </AlertDialogPrimitive.Title>
            <AlertDialogPrimitive.Description
              id={dialogBodyId}
              className="leading-relaxed text-muted-foreground"
              render={<div />}
            >
              <p>
                Sie verlassen die Demo-App. Die Digitale Rentenübersicht wird in
                einem neuen Tab geöffnet — die Daten dort sind real, nicht
                gemockt. Diese Demo führt keinerlei Anwartschafts-Aggregation
                durch.
              </p>
            </AlertDialogPrimitive.Description>
            <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
              <AlertDialogPrimitive.Close
                render={
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setConfirmOpen(false)}
                  />
                }
              >
                Abbrechen
              </AlertDialogPrimitive.Close>
              <Button
                type="button"
                onClick={openExternal}
                data-testid="zfdr-confirm-open"
              >
                Weiter zu rentenuebersicht.de
              </Button>
            </div>
          </AlertDialogPrimitive.Popup>
        </AlertDialogPrimitive.Portal>
      </AlertDialogPrimitive.Root>
    </section>
  );
}
