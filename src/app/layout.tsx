import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { getLocale, getMessages } from 'next-intl/server';

import { Providers } from '@/components/providers/Providers';
import { IntlClientProvider } from '@/i18n/IntlClientProvider';
import { rtlLocales, type Locale } from '@/i18n/routing';
import { getNoFoucScript } from '@/lib/a11y/no-fouc-script';
import { cn } from '@/lib/utils';

import './globals.css';
import './prototype-v2.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' });

export const metadata: Metadata = {
  metadataBase: new URL('https://govtech-de.vercel.app'),
  title: 'GovTech DE — Concept Demo',
  description:
    'Speculative-design prototype: how a citizen-first interaction layer for German public administration could feel in 2027.',
  openGraph: {
    title: 'GovTech DE — Verwaltung neu gedacht',
    description:
      'Ein:e Bürger:in sagt einmal „ich ziehe um" — und das System informiert jede zuständige Behörde. Speculative-Design-Prototyp, alle Daten erfunden.',
    images: ['/og.png'],
    locale: 'de_DE',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'GovTech DE — Verwaltung neu gedacht',
    description:
      'Ein Satz statt sechs Behördengängen — Speculative-Design-Prototyp für die deutsche Verwaltung 2027.',
    images: ['/og.png'],
  },
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = (await getLocale()) as Locale;
  const messages = await getMessages();
  const dir = rtlLocales.includes(locale) ? 'rtl' : 'ltr';

  return (
    <html
      lang={locale}
      dir={dir}
      suppressHydrationWarning
      className={cn(
        'font-sans',
        inter.variable,
      )}
    >
      <head>
        {/* No-FOUC: apply persisted Bedienhilfen (font-scale/contrast/readable/
            reduce-motion) to <html> before first paint. Mirrors next-themes'
            own pre-paint inline script. */}
        <script dangerouslySetInnerHTML={{ __html: getNoFoucScript() }} />
      </head>
      <body className="min-h-screen bg-background text-foreground antialiased">
        <IntlClientProvider locale={locale} messages={messages}>
          <Providers>{children}</Providers>
        </IntlClientProvider>
      </body>
    </html>
  );
}
