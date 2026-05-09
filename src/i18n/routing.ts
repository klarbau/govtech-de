export const locales = ['de', 'en', 'ru', 'uk', 'ar', 'tr'] as const;

export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = 'de';

export const localeCookieName = 'govtech-de:v1:locale';

export const rtlLocales: readonly Locale[] = ['ar'];

export function isLocale(value: string | undefined | null): value is Locale {
  return !!value && (locales as readonly string[]).includes(value);
}
