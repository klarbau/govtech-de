import { useTranslations } from 'next-intl';
import { Sparkles } from 'lucide-react';

import { wrapNormZitate } from '@/components/posteingang/wrapNormZitate';
import { cn } from '@/lib/utils';

interface VisionBanner2031Props {
  /**
   * Optionaler Override: Default `2031` (mDL-Default-Datum nach RL (EU) 2025/2205).
   * `2029` für Anwendungsbeginn-Variante (VL-7-konformes Naming).
   */
  targetYear?: '2029' | '2031';
  className?: string;
}

/**
 * `<VisionBanner2031>` (Spec § 4.2 / VL-7 / HL-MOB-7).
 *
 * mDL-spezifischer Vision-Banner für die Wallet-Sub-Tab mDL-Card. Pattern-
 * Konsistenz zu V1.2 `<VisionBanner>` (Notification-Präferenzen).
 *
 * **Naming distinct from V1 `2027_vision`-pill**: mDL nutzt explizit
 * 2029-/2031-Semantik (VL-7), NICHT 2027.
 *
 * Wortlaut verbatim aus `stammdaten.wallet.mdl.vision_banner_2031_body`.
 * Disclaimer-Marker `eudi_mdl_speculative` über Cross-Ref im Body.
 *
 * a11y: `role="note"`, `aria-label` aus i18n; respektiert `prefers-reduced-motion`.
 */
export function VisionBanner2031({
  targetYear = '2031',
  className,
}: VisionBanner2031Props) {
  const t = useTranslations('stammdaten.wallet.mdl');

  return (
    <aside
      role="note"
      aria-label={t('vision_banner_aria_label')}
      data-testid="vision-banner-2031"
      data-target-year={targetYear}
      className={cn(
        'rounded-lg border border-violet-300 bg-violet-50 p-4 text-sm leading-relaxed text-violet-950',
        'dark:border-violet-800/60 dark:bg-violet-900/20 dark:text-violet-100',
        className,
      )}
    >
      <p className="mb-1 inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide">
        <Sparkles className="size-3" aria-hidden="true" />
        {t('vision_banner_2031_eyebrow')}
      </p>
      <p>{wrapNormZitate(t('vision_banner_2031_body'))}</p>
    </aside>
  );
}
