'use client';

import { useTranslations } from 'next-intl';
import {
  Ban,
  FileText,
  FlaskConical,
  IdCard,
  Landmark,
  Lock,
  Rocket,
  ShieldCheck,
  Sparkles,
  Wallet,
} from 'lucide-react';

import { Card } from '@/components/ui/card';
import { IconCircle } from '@/components/shared/IconCircle';
import { OnboardingMethodCard } from '@/components/onboarding/OnboardingMethodCard';
import { OnboardingStepList } from '@/components/onboarding/OnboardingStepList';
import { OnboardingTrustItem } from '@/components/onboarding/OnboardingTrustItem';

interface OnboardingWelcomeProps {
  onSelectMethod: (method: 'deutschlandid' | 'eudi' | 'demo') => void;
}

/**
 * Screen A — welcome + method selection. Carries the flow's first `<h1>`.
 */
export function OnboardingWelcome({ onSelectMethod }: OnboardingWelcomeProps) {
  const t = useTranslations('onboarding');

  const steps = [
    { num: 1, title: t('how.step1.title'), desc: t('how.step1.desc') },
    { num: 2, title: t('how.step2.title'), desc: t('how.step2.desc') },
    { num: 3, title: t('how.step3.title'), desc: t('how.step3.desc') },
  ];

  return (
    <Card className="mx-auto grid w-full max-w-5xl gap-8 rounded-xl p-6 shadow-sm sm:p-8 lg:grid-cols-[1.4fr_1fr]">
      {/* LEFT — method selection */}
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-3">
          <IconCircle icon={<Landmark />} tone="primary" size="lg" />
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-bold text-text-primary md:text-3xl">
              {t('welcome.title')}
            </h1>
            <p className="text-sm text-text-secondary">
              {t('welcome.subtitle')}
            </p>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <OnboardingMethodCard
            icon={<IdCard />}
            title={t('method.deutschlandid.title')}
            helper={t('method.deutschlandid.helper')}
            variant="prominent"
            onClick={() => onSelectMethod('deutschlandid')}
          />
          <OnboardingMethodCard
            icon={<Wallet />}
            title={t('method.eudi.title')}
            helper={t('method.eudi.helper')}
            variant="prominent"
            onClick={() => onSelectMethod('eudi')}
          />
        </div>

        <OnboardingMethodCard
          icon={<FlaskConical />}
          title={t('method.demo.title')}
          helper={t('method.demo.helper')}
          variant="row"
          tone="accent"
          trailingChevron
          onClick={() => onSelectMethod('demo')}
        />

        {/*
          Descriptions are hard-coded German inline per prototype-v2 hard rule #2
          (do NOT edit i18n JSON files). i18n-localizer will promote these three
          strings to onboarding.trust.*_desc keys in a follow-up pass.
        */}
        <div className="grid gap-5 border-t border-border pt-5 sm:grid-cols-3">
          <OnboardingTrustItem
            icon={<Lock />}
            label={t('trust.secure')}
            desc="Verschlüsselte Übertragung gemäß BSI-Grundschutz."
          />
          <OnboardingTrustItem
            icon={<ShieldCheck />}
            label={t('trust.consent')}
            desc="Sie entscheiden, welche Daten geteilt werden."
          />
          <OnboardingTrustItem
            icon={<Ban />}
            label={t('trust.no_real_connection')}
            desc="Spekulativer Prototyp — sämtliche Daten sind Mock."
          />
        </div>
      </div>

      {/* RIGHT — steps + why */}
      <aside className="flex flex-col gap-6 rounded-lg bg-surface-page p-5">
        <section className="flex flex-col gap-4">
          <h2 className="text-base font-semibold text-text-primary">
            {t('how.title')}
          </h2>
          <OnboardingStepList steps={steps} />
        </section>

        <section className="flex flex-col gap-3 border-t border-border pt-4">
          <h2 className="text-base font-semibold text-text-primary">
            {t('why.title')}
          </h2>
          <ul className="flex flex-col gap-2.5">
            <li className="flex items-center gap-2">
              <IconCircle icon={<Sparkles />} tone="primary" size="sm" />
              <span className="text-sm text-text-secondary">
                {t('why.prefill')}
              </span>
            </li>
            <li className="flex items-center gap-2">
              <IconCircle icon={<FileText />} tone="primary" size="sm" />
              <span className="text-sm text-text-secondary">
                {t('why.explain')}
              </span>
            </li>
            <li className="flex items-center gap-2">
              <IconCircle icon={<Rocket />} tone="primary" size="sm" />
              <span className="text-sm text-text-secondary">
                {t('why.autopilot')}
              </span>
            </li>
          </ul>
        </section>
      </aside>
    </Card>
  );
}
