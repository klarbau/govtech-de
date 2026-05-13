'use client';

import { useTranslations } from 'next-intl';

import { wrapNormZitate } from '@/components/posteingang/wrapNormZitate';

interface LiveCounterProps {
  briefeProJahrGespart: number;
  tageFristGespart: number;
}

/**
 * `<LiveCounter>` — Spec § 6.9 + Hard-Line § 13.5.
 *
 * Live-Zeitersparnis-Anzeige nach erfolgreichem Save. Rendered als
 * `<output aria-live="polite">`-Region. Bei `briefe === 0` rendert
 * stattdessen die „keine-Briefe-Aussage". Norm-Zitate via
 * `wrapNormZitate`.
 *
 * Hard-Line § 11.36 / § 13.3: respektiert `prefers-reduced-motion`
 * (kein fade — dauerhaft sichtbar bis nächste Änderung).
 */
export function LiveCounter({
  briefeProJahrGespart,
  tageFristGespart,
}: LiveCounterProps) {
  const t = useTranslations('stammdaten.kontakt.notification.live_counter');

  const text =
    briefeProJahrGespart === 0
      ? t('no_savings')
      : t('savings', {
          briefe_pro_jahr_gespart: briefeProJahrGespart,
          tage_frist_gespart: tageFristGespart,
        });

  return (
    <output
      aria-live="polite"
      aria-label={t('aria_label')}
      data-testid="live-counter"
      data-briefe={briefeProJahrGespart}
      data-tage={tageFristGespart}
      className="block rounded-md border-l-2 border-emerald-400 bg-emerald-50/70 px-3 py-2 text-xs leading-relaxed text-emerald-950 dark:border-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-100 motion-safe:animate-in motion-safe:fade-in-0"
    >
      {wrapNormZitate(text)}
    </output>
  );
}
