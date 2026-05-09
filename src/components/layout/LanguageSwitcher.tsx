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
        size="sm"
        aria-label={t('language_label')}
        className="gap-2"
      >
        <Globe className="size-3.5 text-muted-foreground" aria-hidden="true" />
        <SelectValue />
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
