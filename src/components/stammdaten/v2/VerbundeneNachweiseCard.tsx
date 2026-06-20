'use client';

import { ShieldCheck, Check, CheckCircle2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { IconCircle } from '@/components/shared/IconCircle';

/**
 * Green-bento — „Verbundene Nachweise & Wallet" highlighted card (Spec § 5.2).
 *
 * Tinted green surface with a round green check-seal top-right, a 3-item
 * verification check-list and a two-column footer (Vertrauensdienst /
 * Nächste Überprüfung). All values are illustrative `[MOCK]` 2027-vision
 * constants (sourced from i18n, not the data model) — they are not real
 * eIDAS production assertions.
 */
export function VerbundeneNachweiseCard() {
  const t = useTranslations('stammdaten.v2.nachweise');

  const checks = [t('check1'), t('check2'), t('check3')];

  return (
    <section
      aria-labelledby="v2-nachweise-title"
      className="rounded-[var(--radius-card)] border border-success/30 bg-success-soft p-5 shadow-[var(--shadow-1)]"
      data-testid="v2-nachweise-card"
    >
      <header className="mb-3 flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <IconCircle icon={<ShieldCheck />} tone="success" size="sm" />
          <h2
            id="v2-nachweise-title"
            className="text-base font-semibold text-text-primary"
          >
            {t('title')}
          </h2>
        </div>
        <span
          role="img"
          aria-label={t('seal_aria')}
          className="flex size-7 shrink-0 items-center justify-center rounded-full bg-success text-white [&_svg]:size-4"
        >
          <Check aria-hidden="true" />
        </span>
      </header>

      <p className="text-sm text-text-secondary">{t('body')}</p>

      <ul className="mt-3 flex flex-col gap-2">
        {checks.map((label) => (
          <li key={label} className="flex items-center gap-2">
            <CheckCircle2
              aria-hidden="true"
              className="size-4 shrink-0 text-success"
            />
            <span className="text-sm font-medium text-text-primary">
              {label}
            </span>
          </li>
        ))}
      </ul>

      <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-success/30 pt-3">
        <div className="min-w-0">
          <dt className="text-xs text-text-secondary">{t('quelle_label')}</dt>
          <dd className="mt-0.5 text-sm font-medium text-text-primary">
            {t('quelle_value')}
          </dd>
        </div>
        <div className="min-w-0">
          <dt className="text-xs text-text-secondary">{t('naechste_label')}</dt>
          <dd className="mt-0.5 text-sm font-medium text-text-primary tabular-nums">
            {t('naechste_value')}
          </dd>
        </div>
      </dl>
    </section>
  );
}
