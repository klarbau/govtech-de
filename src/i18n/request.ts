import { cookies, headers } from 'next/headers';
import { getRequestConfig } from 'next-intl/server';

import { getMessageFallback } from './message-fallback';
import { defaultLocale, isLocale, localeCookieName, type Locale } from './routing';

async function resolveLocale(): Promise<Locale> {
  // cookies()/headers() are request-scoped. During static prerender at build
  // time (e.g. the landing page and the not-found page) there is no request, so
  // these throw — fall back to the default locale instead of bubbling up an
  // undefined-messages error that aborts `next build`.
  try {
    const cookieStore = await cookies();
    const fromCookie = cookieStore.get(localeCookieName)?.value;
    if (isLocale(fromCookie)) return fromCookie;

    const headerStore = await headers();
    const accept = headerStore.get('accept-language') ?? '';
    const candidate = accept.split(',')[0]?.split('-')[0]?.toLowerCase();
    if (isLocale(candidate)) return candidate;
  } catch {
    return defaultLocale;
  }

  return defaultLocale;
}

export default getRequestConfig(async () => {
  const locale = await resolveLocale();
  const messages = (await import(`@/lib/i18n/locales/${locale}.json`)).default;
  // Single, explicit time zone (German administration → Europe/Berlin) avoids the
  // next-intl ENVIRONMENT_FALLBACK warning + server/client date-markup mismatches.
  return { locale, messages, getMessageFallback, timeZone: 'Europe/Berlin' };
});
