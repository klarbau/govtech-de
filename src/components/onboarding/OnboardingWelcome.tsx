'use client';

import { useTranslations } from 'next-intl';
import { FlaskConical, IdCard, Wallet } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { OnboardingMethodCard } from '@/components/onboarding/OnboardingMethodCard';
import { OnboardingStepList } from '@/components/onboarding/OnboardingStepList';
import { OnboardingTrustItem } from '@/components/onboarding/OnboardingTrustItem';

interface OnboardingWelcomeProps {
  onSelectMethod: (method: 'deutschlandid' | 'eudi' | 'demo') => void;
}

/**
 * Screen A — welcome + method selection. Carries the flow's first `<h1>`.
 * The two sign-in methods are quiet editorial rows; the demo entry is the
 * screen's single accent CTA (`lg-iridescent`, same opt-in recipe as the
 * landing hero and the transparency confirm — one per screen).
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
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold text-text-primary md:text-3xl">
            {t('welcome.title')}
          </h1>
          <p className="text-sm text-text-secondary">
            {t('welcome.subtitle')}
          </p>
        </div>

        <div className="flex flex-col gap-1">
          <div className="-mx-3 flex flex-col divide-y divide-border">
            <OnboardingMethodCard
              icon={<IdCard />}
              title={t('method.deutschlandid.title')}
              helper={t('method.deutschlandid.helper')}
              onClick={() => onSelectMethod('deutschlandid')}
            />
            <OnboardingMethodCard
              icon={<Wallet />}
              title={t('method.eudi.title')}
              helper={t('method.eudi.helper')}
              onClick={() => onSelectMethod('eudi')}
            />
          </div>

          {/*
            Inline-German per prototype-v2 hard rule #2 (onboarding strings are
            hardcoded, not in i18n JSON). Honest [MOCK] scope note: the real EUDI
            Wallet launches in 2027 with PID only — keeps the demo from overclaiming.
          */}
          <p className="text-xs text-text-muted">
            [MOCK] EUDI-Wallet, Phase 1 (ab 2027): zunächst nur der
            Identitätsnachweis (PID) — Zahlungen und Qualifikationsnachweise
            folgen erst in späteren Ausbaustufen.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span aria-hidden="true" className="h-px flex-1 bg-border" />
          <span className="text-xs text-text-muted">{t('welcome.or')}</span>
          <span aria-hidden="true" className="h-px flex-1 bg-border" />
        </div>

        <div className="flex flex-col gap-2">
          <Button
            size="lg"
            className="lg-iridescent w-full"
            onClick={() => onSelectMethod('demo')}
          >
            <FlaskConical className="size-4" aria-hidden="true" />
            {t('method.demo.title')}
          </Button>
          <p className="text-center text-xs text-text-muted">
            {t('method.demo.helper')}
          </p>
        </div>

        {/*
          Descriptions are hard-coded German inline per prototype-v2 hard rule #2
          (do NOT edit i18n JSON files). i18n-localizer will promote these three
          strings to onboarding.trust.*_desc keys in a follow-up pass.
        */}
        <div className="grid gap-y-5 border-t border-border pt-5 sm:grid-cols-3 sm:gap-x-5 sm:gap-y-0">
          <OnboardingTrustItem
            label={t('trust.secure')}
            desc="Verschlüsselte Übertragung gemäß BSI-Grundschutz."
          />
          <OnboardingTrustItem
            label={t('trust.consent')}
            desc="Sie entscheiden, welche Daten geteilt werden."
            className="border-t border-border pt-5 sm:border-s sm:border-t-0 sm:pt-0 sm:ps-5"
          />
          <OnboardingTrustItem
            label={t('trust.no_real_connection')}
            desc="Spekulativer Prototyp — sämtliche Daten sind Mock."
            className="border-t border-border pt-5 sm:border-s sm:border-t-0 sm:pt-0 sm:ps-5"
          />
        </div>
      </div>

      {/* RIGHT — steps + why */}
      <aside className="lg-aux-panel flex flex-col gap-6 rounded-lg bg-surface-page p-5">
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
            <li className="text-sm text-text-secondary">{t('why.prefill')}</li>
            <li className="text-sm text-text-secondary">{t('why.explain')}</li>
            <li className="text-sm text-text-secondary">
              {t('why.autopilot')}
            </li>
          </ul>
        </section>
      </aside>
    </Card>
  );
}
