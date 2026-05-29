import { Landmark, ScrollText } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { IconCircle } from '@/components/shared/IconCircle';

/**
 * Recipient + legal-basis block (Screen D). Pure presentation; all strings via
 * `t()`. Norm/brand terms (eIDAS 2 / OZG / DSGVO) live inside the localized
 * string and stay Latin/bidi-neutral per the i18n discipline.
 */
export function OnboardingLegalBasis() {
  const t = useTranslations('onboarding.transparency');

  return (
    <div className="flex flex-col gap-3 border-t border-border pt-4">
      <div className="flex items-start gap-3">
        <IconCircle icon={<Landmark />} tone="neutral" size="sm" />
        <p className="text-sm text-text-secondary">
          <bdi>{t('recipient')}</bdi>
        </p>
      </div>
      <div className="flex items-start gap-3">
        <IconCircle icon={<ScrollText />} tone="neutral" size="sm" />
        <p className="text-sm text-text-secondary">
          <bdi>{t('legal_basis')}</bdi>
        </p>
      </div>
    </div>
  );
}
