'use client';

import { useTranslations } from 'next-intl';
import { ShieldCheck } from 'lucide-react';

import { IconCircle } from '@/components/shared/IconCircle';
import { SectionCard } from '@/components/shared/SectionCard';
import { Button } from '@/components/ui/button';
import { wrapNormZitate } from '@/components/posteingang/wrapNormZitate';

/**
 * „Sie haben die Hoheit über Ihre Daten"-Footer-Banner (Spec § 4.1 / § 4.2).
 *
 * Trägt Disclaimer-1 (Lese-/Wegweiser-Schicht) VERBATIM aus
 * `stammdaten.disclaimer.lese_schicht` (Hard-Line § 11.1) inkl. NormZitat-
 * Wrapping. Die CTA scrollt zur „Sperren & Einstellungen"-Card.
 */
export function HoheitFooterBanner() {
  const tHoheit = useTranslations('stammdaten.hoheit');
  const tDisclaimer = useTranslations('stammdaten.disclaimer');

  const onManage = () => {
    const target = document.getElementById('sperren_einstellungen');
    if (!target) return;
    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    target.scrollIntoView({
      behavior: prefersReducedMotion ? 'auto' : 'smooth',
      block: 'start',
    });
    const details = target.querySelector('details');
    if (details && !details.hasAttribute('open')) {
      details.setAttribute('open', '');
    }
  };

  return (
    <SectionCard variant="soft">
      <div
        className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"
        data-testid="stammdaten-hoheit-banner"
      >
        <div className="flex items-start gap-3">
          <IconCircle icon={<ShieldCheck />} tone="primary" />
          <div className="min-w-0">
            <p className="text-base font-semibold text-text-primary">
              {tHoheit('title')}
            </p>
            <p className="mt-1 text-sm leading-relaxed text-text-secondary">
              {wrapNormZitate(tDisclaimer('lese_schicht'))}
            </p>
          </div>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="shrink-0"
          onClick={onManage}
        >
          {tHoheit('cta')}
        </Button>
      </div>
    </SectionCard>
  );
}
