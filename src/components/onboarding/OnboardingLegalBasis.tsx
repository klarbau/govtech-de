import { Building2, ScrollText } from 'lucide-react';
import { useTranslations } from 'next-intl';

/**
 * Recipient + legal-basis panel (Screen D). A quiet labelled data panel, not
 * icon-circle rows. Norm/brand terms (eIDAS 2 / OZG / DSGVO) live inside the
 * localized string and stay Latin/bidi-neutral via `<bdi>` per i18n discipline.
 */
export function OnboardingLegalBasis() {
  const t = useTranslations('onboarding.transparency');

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-surface-muted/40 p-4">
      <div className="flex items-start gap-2.5">
        <Building2
          className="mt-0.5 size-4 shrink-0 text-text-muted"
          aria-hidden="true"
        />
        <p className="text-sm text-text-secondary">
          <bdi>{t('recipient')}</bdi>
        </p>
      </div>
      <div className="flex items-start gap-2.5">
        <ScrollText
          className="mt-0.5 size-4 shrink-0 text-text-muted"
          aria-hidden="true"
        />
        <p className="text-sm text-text-secondary">
          <bdi>{t('legal_basis')}</bdi>
        </p>
      </div>
    </div>
  );
}
