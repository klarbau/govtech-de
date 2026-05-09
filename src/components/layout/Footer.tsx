import { getTranslations } from 'next-intl/server';
import Link from 'next/link';

import { PrototypeDisclaimer } from '@/components/shared/PrototypeDisclaimer';

export async function Footer() {
  const t = await getTranslations('footer');

  return (
    <footer className="border-t border-border bg-muted/30 px-4 py-6 md:px-8">
      <div className="mx-auto flex max-w-6xl flex-col gap-4">
        <PrototypeDisclaimer />
        <nav
          className="flex flex-wrap gap-x-6 gap-y-2 text-xs text-muted-foreground"
          aria-label="Footer"
        >
          <Link href="#" className="hover:text-foreground">
            {t('imprint')}
          </Link>
          <Link href="#" className="hover:text-foreground">
            {t('privacy')}
          </Link>
          <Link href="#" className="hover:text-foreground">
            {t('accessibility')}
          </Link>
        </nav>
      </div>
    </footer>
  );
}
