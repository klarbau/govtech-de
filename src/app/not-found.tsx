import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { Compass } from 'lucide-react';

import { PrototypeDisclaimerBanner } from '@/components/shared/PrototypeDisclaimerBanner';
import { Button } from '@/components/ui/button';

// Rendered at request time: see (app)/layout.tsx — the next-intl@3 + Next 15.5
// client IntlProvider is not statically prerenderable in this setup.
export const dynamic = 'force-dynamic';

export default async function NotFound() {
  const t = await getTranslations('error.not_found');

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <PrototypeDisclaimerBanner />
      <main
        id="main-content"
        className="flex flex-1 items-center justify-center px-4 py-16 sm:px-6 lg:px-8"
      >
        <div className="flex w-full max-w-md flex-col items-center gap-6 text-center">
          <span
            className="inline-flex size-14 items-center justify-center rounded-full bg-surface-muted text-text-secondary"
            aria-hidden="true"
          >
            <Compass className="size-7" />
          </span>
          <div className="flex flex-col gap-2">
            <p className="text-sm font-semibold uppercase tracking-wide text-text-muted tabular-nums">
              {t('code')}
            </p>
            <h1 className="text-2xl font-bold text-text-primary md:text-3xl">
              {t('title')}
            </h1>
            <p className="text-sm text-text-secondary">{t('description')}</p>
          </div>
          <Button render={<Link href="/dashboard" />}>{t('cta')}</Button>
        </div>
      </main>
    </div>
  );
}
