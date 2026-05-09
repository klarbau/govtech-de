'use server';

import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';

import { isLocale, localeCookieName } from '@/i18n/routing';

export async function setLocaleCookie(locale: string): Promise<void> {
  if (!isLocale(locale)) return;
  const cookieStore = await cookies();
  cookieStore.set(localeCookieName, locale, {
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
    sameSite: 'lax',
  });
  revalidatePath('/', 'layout');
}
