import { getTranslations } from 'next-intl/server';

import { Footer } from '@/components/layout/Footer';
import { Sidebar } from '@/components/layout/Sidebar';
import { Topbar } from '@/components/layout/Topbar';
import { PrototypeDisclaimerBanner } from '@/components/shared/PrototypeDisclaimerBanner';

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
    <div className="flex min-h-screen flex-col bg-background">
      <a
        href="#main-content"
        className="sr-only focus-visible:not-sr-only focus-visible:absolute focus-visible:left-4 focus-visible:top-4 focus-visible:z-50 focus-visible:rounded-md focus-visible:bg-foreground focus-visible:px-3 focus-visible:py-2 focus-visible:text-sm focus-visible:text-background"
      >
        {tApp('skip_to_content')}
      </a>
      <div className="flex flex-1">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar />
          <PrototypeDisclaimerBanner />
          <main
            id="main-content"
            tabIndex={-1}
            className="flex-1 px-4 py-8 sm:px-6 lg:px-8"
          >
            <div className="mx-auto w-full max-w-7xl">{children}</div>
          </main>
          <Footer />
        </div>
      </div>
    </div>
  );
}
