'use client';

import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { MockWatermarkBanner } from '@/components/shared/MockWatermarkBanner';
import { OnboardingPersonaCard } from '@/components/onboarding/OnboardingPersonaCard';
import {
  ONBOARDING_PERSONA_IDS,
  PERSONA_I18N_KEY,
} from '@/components/onboarding/persona-attributes';

interface OnboardingPersonaSelectProps {
  onSelect: (personaId: string) => void;
  onBack: () => void;
  selectedId?: string;
}

/**
 * Persona selection (Screen C). Carries the step's single `<h1>`. Selection is
 * remembered (passed up) but NOT committed — the reseed happens on Screen D.
 * Layout: an account-picker list with hairlines instead of stacked ID cards;
 * the [MOCK] disclosure sits as a quiet inline chip next to the step kicker.
 */
export function OnboardingPersonaSelect({
  onSelect,
  onBack,
  selectedId,
}: OnboardingPersonaSelectProps) {
  const t = useTranslations('onboarding.persona');
  const tFlow = useTranslations('onboarding');

  return (
    <Card className="mx-auto w-full max-w-2xl gap-5 p-6 sm:p-8">
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">
            {tFlow('wizard_step', { current: 2, total: 3 })}
          </p>
          <MockWatermarkBanner variant="inline" />
        </div>
        <h1 className="text-2xl font-bold text-text-primary md:text-3xl">
          {t('title')}
        </h1>
        <p className="text-sm text-text-secondary">{t('subtitle')}</p>
      </div>

      <ul className="-mx-3 flex flex-col divide-y divide-border">
        {ONBOARDING_PERSONA_IDS.map((personaId) => {
          const stem = PERSONA_I18N_KEY[personaId];
          return (
            <li key={personaId}>
              <OnboardingPersonaCard
                personaId={personaId}
                name={t(`${stem}.name`)}
                descriptor={t(`${stem}.descriptor`)}
                story={t(`${stem}.story`)}
                selected={selectedId === personaId}
                onClick={() => onSelect(personaId)}
              />
            </li>
          );
        })}
      </ul>

      <div className="flex justify-start">
        <Button variant="ghost" onClick={onBack}>
          {t('back')}
        </Button>
      </div>
    </Card>
  );
}
