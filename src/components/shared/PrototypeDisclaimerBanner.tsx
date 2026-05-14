import { getTranslations } from 'next-intl/server';
import { Info } from 'lucide-react';

/**
 * Schmaler Sticky-Banner direkt unter der Topbar. Macht den Prototype-Status
 * im Gov-Kontext sofort sichtbar, ohne den vorhandenen `<details>`-Block in
 * Footer + Page-Bodies zu verdrängen (Langform bleibt erhalten).
 *
 * Visuell tokenbasiert (warning-soft + warning-strong) und print-versteckt.
 */
export async function PrototypeDisclaimerBanner() {
  const tDisclaimer = await getTranslations('common.disclaimer');
  const tWatermark = await getTranslations('posteingang.watermark');

  return (
    <div
      role="note"
      aria-label={tDisclaimer('prototype_title')}
      data-print="hide"
      className="border-b border-[var(--ds-color-warning-strong,var(--color-border))] bg-[var(--ds-color-warning-soft,var(--color-muted))] px-4 py-2 text-xs text-amber-950 sm:px-6 lg:px-8 dark:text-foreground"
    >
      <div className="mx-auto flex w-full max-w-7xl items-center gap-2">
        <Info className="size-4 shrink-0" aria-hidden="true" />
        <span>
          <strong className="font-semibold">
            {tDisclaimer('prototype_title')}:
          </strong>{' '}
          <span className="text-amber-950/90 dark:text-muted-foreground">
            {tWatermark('banner')}
          </span>
        </span>
      </div>
    </div>
  );
}
