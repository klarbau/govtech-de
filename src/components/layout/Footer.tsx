import { getTranslations } from 'next-intl/server';
import Link from 'next/link';

import { PrototypeDisclaimer } from '@/components/shared/PrototypeDisclaimer';

export async function Footer() {
  const t = await getTranslations('footer');
  const tShell = await getTranslations('shell');

  return (
    <footer className="border-t border-border bg-surface px-4 py-6 md:px-8">
      <div className="mx-auto flex max-w-6xl flex-col gap-4">
        <PrototypeDisclaimer />
        <nav
          className="flex flex-wrap gap-x-6 gap-y-2 text-xs text-text-muted"
          aria-label={tShell('footer.landmark')}
        >
          <Link href="#" className="hover:text-text-primary">
            {t('imprint')}
          </Link>
          <Link href="#" className="hover:text-text-primary">
            {t('privacy')}
          </Link>
          <Link href="#" className="hover:text-text-primary">
            {t('accessibility')}
          </Link>
        </nav>
      </div>
    </footer>
  );
}
