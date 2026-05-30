'use client';

import { NextIntlClientProvider } from 'next-intl';
import type { ComponentProps, ReactNode } from 'react';

import { getMessageFallback } from '@/i18n/message-fallback';

type ProviderProps = ComponentProps<typeof NextIntlClientProvider>;

/**
 * Client boundary for next-intl. `getMessageFallback` is a function and therefore
 * cannot be passed from the Server Component `layout.tsx` directly into
 * `NextIntlClientProvider` (Next.js forbids passing functions across the
 * server→client boundary). Referencing it INSIDE this 'use client' component keeps
 * it in client-land, so only serialisable props (locale, messages, children) cross.
 * The DE-source fallback thus works on the client too, matching the server config
 * in `request.ts` (which uses the same `getMessageFallback`).
 */
export function IntlClientProvider({
  locale,
  messages,
  children,
}: {
  locale: ProviderProps['locale'];
  messages: ProviderProps['messages'];
  children: ReactNode;
}) {
  return (
    <NextIntlClientProvider
      locale={locale}
      messages={messages}
      timeZone="Europe/Berlin"
      getMessageFallback={getMessageFallback}
    >
      {children}
    </NextIntlClientProvider>
  );
}
