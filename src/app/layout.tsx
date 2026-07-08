import type { Metadata } from 'next';
import { Inter, Inter_Tight, Source_Serif_4 } from 'next/font/google';
import { getLocale, getMessages } from 'next-intl/server';

import { Providers } from '@/components/providers/Providers';
import { IntlClientProvider } from '@/i18n/IntlClientProvider';
import { rtlLocales, type Locale } from '@/i18n/routing';
import { getNoFoucScript } from '@/lib/a11y/no-fouc-script';
import { cn } from '@/lib/utils';

import './globals.css';
import './prototype-v2.css';
// App-wide Liquid-Glass layer (inert unless <html data-lg> — see
// LiquidGlassChrome). Core shell + generic primitives first, then the
// screen-scoped Posteingang specifics. Imported last so they win on order as
// well as specificity.
import './liquid-glass-core.css';
import './posteingang-liquid-glass.css';
import './dashboard-liquid-glass.css';
import './assistent-liquid-glass.css';
import './vorgaenge-liquid-glass.css';
import './dokumente-liquid-glass.css';
import './termine-liquid-glass.css';
import './stammdaten-liquid-glass.css';
import './familie-liquid-glass.css';
import './steuer-liquid-glass.css';
import './datenschutz-liquid-glass.css';
import './lebenslagen-liquid-glass.css';
import './onboarding-landing-liquid-glass.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' });
const interTight = Inter_Tight({ subsets: ['latin'], variable: '--font-display' });
const sourceSerif = Source_Serif_4({
  subsets: ['latin'],
  weight: ['500', '600', '700'],
  variable: '--font-serif',
});

export const metadata: Metadata = {
  metadataBase: new URL('https://govtech-de.vercel.app'),
  title: 'GovTech DE — Concept Demo',
  description:
    'Speculative-design prototype: how a citizen-first interaction layer for German public administration could feel in 2027.',
  openGraph: {
    title: 'GovTech DE — ein Satz statt sechs Behördengängen',
    description:
      'Ein:e Bürger:in sagt einmal „ich ziehe um" — und das System informiert jede zuständige Behörde. Speculative-Design-Prototyp, alle Daten erfunden.',
    images: ['/og.png'],
    locale: 'de_DE',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'GovTech DE — ein Satz statt sechs Behördengängen',
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
        interTight.variable,
        sourceSerif.variable,
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
