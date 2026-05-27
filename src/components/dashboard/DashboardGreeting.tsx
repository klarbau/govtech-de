'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Info } from 'lucide-react';

import { SectionCard } from '@/components/shared/SectionCard';
import { PrototypeDisclaimer } from '@/components/shared/PrototypeDisclaimer';
import type { DashboardSnapshot } from '@/types';

interface DashboardGreetingProps {
  greeting: DashboardSnapshot['greeting'];
}

/**
 * „Guten Tag, Frau Petrov" + darunter das Demo-Modus-Info-Banner (eine Zeile,
 * `bg-accent-soft`, Info-Icon). Der inline-Button „Disclaimer ansehen" blendet
 * den vollständigen `PrototypeDisclaimer` ein (kein eigenes Drawer-Bauteil).
 */
export function DashboardGreeting({ greeting }: DashboardGreetingProps) {
  const t = useTranslations('dashboard');
  const [showDisclaimer, setShowDisclaimer] = useState(false);

  const greetingText =
    greeting.geschlecht_anrede === 'frau'
      ? t('greeting.frau', { nachname: greeting.nachname })
      : greeting.geschlecht_anrede === 'herr'
        ? t('greeting.herr', { nachname: greeting.nachname })
        : t('greeting.neutral', {
            vorname: greeting.vorname,
            nachname: greeting.nachname,
          });

  return (
    <SectionCard padding="md" className="h-full">
      <h2 className="text-lg font-semibold text-text-primary">
        {greetingText}
      </h2>

      <aside
        aria-label={t('demo_banner.text')}
        className="mt-3 flex flex-col gap-2 rounded-md bg-accent-soft px-3 py-2.5"
      >
        <div className="flex items-start gap-2">
          <Info
            className="mt-0.5 size-4 shrink-0 text-primary"
            aria-hidden="true"
          />
          <p className="text-sm text-text-secondary">
            {t('demo_banner.text')}{' '}
            <button
              type="button"
              onClick={() => setShowDisclaimer((open) => !open)}
              aria-expanded={showDisclaimer}
              className="rounded-sm font-medium text-primary underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              {t('demo_banner.disclaimer_link')}
            </button>
          </p>
        </div>
        {showDisclaimer ? <PrototypeDisclaimer defaultOpen /> : null}
      </aside>
    </SectionCard>
  );
}
