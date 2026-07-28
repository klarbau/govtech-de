'use client';

import { useTransition } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Globe } from 'lucide-react';

import { setLocaleCookie } from '@/app/actions/locale';
import { locales, type Locale } from '@/i18n/routing';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const localeLabels: Record<Locale, string> = {
  de: 'Deutsch',
  en: 'English',
  ru: 'Русский',
  uk: 'Українська',
  ar: 'العربية',
  tr: 'Türkçe',
};

/**
 * Language pill inside `.gt-header-actions`. The HTML markup is:
 *   `<button class="gt-header-btn"><i>globe</i>DE<i>chevron-down</i></button>`
 * We keep the existing Select widget for the dropdown (and its keyboard a11y)
 * but stamp the prototype's `.gt-header-btn` class onto the trigger.
 */
export function LanguageSwitcher() {
  const locale = useLocale() as Locale;
  const t = useTranslations('topbar');
  const [, startTransition] = useTransition();

  function handleChange(next: string | null) {
    if (!next || next === locale) return;
    startTransition(() => {
      void setLocaleCookie(next);
    });
  }

  return (
    <Select value={locale} onValueChange={handleChange}>
      <SelectTrigger
        aria-label={t('language_label')}
        title={t('language_label')}
        // Override the shadcn defaults: wear `.gt-header-btn` only.
        // `!bg-none !shadow-none`: the LG frosted-input skin (liquid-glass-core
        // „Inputs / selects") paints a background-image gradient + inset
        // box-shadow ring on every select-trigger — neither is cleared by
        // `!bg-transparent`/`!border-0`, which left this header pill looking
        // like a boxed form field.
        className="gt-header-btn !min-h-0 !border-0 !bg-transparent !bg-none !shadow-none !p-0 !text-[13px]"
      >
        <Globe aria-hidden="true" />
        <SelectValue>{(value) => (value as string).toUpperCase()}</SelectValue>
      </SelectTrigger>
      <SelectContent align="end">
        {locales.map((code) => (
          <SelectItem key={code} value={code}>
            {localeLabels[code]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
