import { cookies, headers } from 'next/headers';
import { getRequestConfig } from 'next-intl/server';

import { defaultLocale, isLocale, localeCookieName, type Locale } from './routing';

async function resolveLocale(): Promise<Locale> {
  const cookieStore = await cookies();
  const fromCookie = cookieStore.get(localeCookieName)?.value;
  if (isLocale(fromCookie)) return fromCookie;

  const headerStore = await headers();
  const accept = headerStore.get('accept-language') ?? '';
  const candidate = accept.split(',')[0]?.split('-')[0]?.toLowerCase();
  if (isLocale(candidate)) return candidate;

  return defaultLocale;
}

export default getRequestConfig(async () => {
  const locale = await resolveLocale();
  const messages = (await import(`@/lib/i18n/locales/${locale}.json`)).default;
  return { locale, messages };
});
