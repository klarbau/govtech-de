import { useTranslations } from 'next-intl';

import { wrapNormZitate } from '@/components/posteingang/wrapNormZitate';

/**
 * `<VisionBanner>` — Spec § 2.1 + Hard-Line § 11.36.
 *
 * Bildschirm-übergreifender 2027-Vision-Banner für die Notification-
 * Präferenzen-Sektion. ARIA-Role `note`; screenreader-pflicht-gelesen
 * beim ersten Sektions-Expand. Marker `cross_channel_routing_speculative`.
 */
export function VisionBanner() {
  const t = useTranslations('stammdaten.kontakt.notification');

  return (
    <aside
      role="note"
      aria-label={t('vision_banner_aria_label')}
      data-testid="vision-banner"
      className="rounded-lg border border-violet-300 bg-violet-50 p-4 text-sm leading-relaxed text-violet-950 dark:border-violet-800/60 dark:bg-violet-900/20 dark:text-violet-100"
    >
      <p className="mb-1 text-xs font-semibold uppercase tracking-wide">
        {t('vision_banner_heading')}
      </p>
      <p>{wrapNormZitate(t('vision_banner'))}</p>
    </aside>
  );
}
