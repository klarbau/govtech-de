import { getTranslations } from 'next-intl/server';

import { SelectionVorlesen } from '@/components/a11y/SelectionVorlesen';
import { TopNav } from '@/components/layout/TopNav';

// The app is a client-side mock-backend demo: every screen hydrates from
// localStorage at runtime, so static prerendering yields nothing and trips a
// next-intl@3 + Next 15.5 IntlProvider prerender bug. Render the whole app
// shell dynamically (request-time), matching how it behaves in `next dev`.
export const dynamic = 'force-dynamic';

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const tApp = await getTranslations('app');

  return (
    <>
      <a
        href="#main-content"
        className="sr-only focus-visible:not-sr-only focus-visible:absolute focus-visible:left-4 focus-visible:top-4 focus-visible:z-50 focus-visible:rounded-md focus-visible:bg-foreground focus-visible:px-3 focus-visible:py-2 focus-visible:text-sm focus-visible:text-background"
      >
        {tApp('skip_to_content')}
      </a>
      <TopNav />
      <main id="main-content" tabIndex={-1} className="app-content">
        {children}
      </main>
      <SelectionVorlesen />
    </>
  );
}
