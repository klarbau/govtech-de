'use client';

import Link from 'next/link';
import { Shield, Lock } from 'lucide-react';
import { useTranslations } from 'next-intl';

/**
 * Prototype-v2 — cobalt-tinted "Datenhoheit" footer banner (Spec § Below grid).
 *
 * Replaces the legacy `<HoheitFooterBanner>` for the prototype-v2 layout.
 * The link inside the body opens `/datenschutz`; the trailing CTA does the
 * same — both routes converge on the Datenschutz-Cockpit.
 */
export function DatenhoheitFooter() {
  const t = useTranslations('stammdaten.v2.datenhoheit');

  return (
    <section
      aria-labelledby="v2-datenhoheit-title"
      className="mt-2 flex flex-col items-start gap-3 rounded-[var(--radius-card)] border border-brand-100 bg-brand-50 p-5 dark:border-white/10 dark:bg-[var(--brand-50)] sm:flex-row sm:items-center"
      data-testid="v2-datenhoheit-banner"
    >
      <span
        aria-hidden="true"
        className="flex size-10 shrink-0 items-center justify-center rounded-full bg-surface/80 text-primary [&_svg]:size-5"
      >
        <Shield />
      </span>
      <div className="min-w-0 flex-1">
        <p
          id="v2-datenhoheit-title"
          className="text-sm font-semibold text-text-primary"
        >
          {t('title')}
        </p>
        <p className="mt-1 text-sm leading-relaxed text-text-secondary">
          {t('body_before_link')}{' '}
          <Link
            href="/datenschutz"
            className="font-medium text-primary hover:underline focus-visible:underline dark:text-[var(--brand-700)]"
          >
            {t('body_link')}
          </Link>
        </p>
      </div>
      <Link
        href="/datenschutz"
        className="inline-flex min-h-9 shrink-0 items-center justify-center gap-2 rounded-md border border-border-strong bg-surface px-3 text-[0.8125rem] font-medium text-text-primary hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        <Lock aria-hidden="true" className="size-4" />
        {t('cta')}
      </Link>
    </section>
  );
}
