'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { Languages } from 'lucide-react';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

import type { ErklaererLang } from './use-erklaerer-lang';

interface ErklaererLangToggleProps {
  activeLang: ErklaererLang;
  options: ReadonlyArray<ErklaererLang>;
  onChange: (lang: ErklaererLang) => void;
  className?: string;
}

/**
 * Sprach-Toggle (Spec §4.2.1) — ein **echtes** Steuerelement im Erläuterungs-
 * Header. Optionen = `de` + alle Locales, für die DIESER Brief einen Seed hat
 * (keine toten Einträge). Umschalten ist brief-lokal und ändert NICHT die
 * globale UI-Locale.
 *
 * Native Sprach-Endonyme (`Deutsch`, `Русский`, …) bleiben unübersetzt; das
 * `option_<lang>`-Label ist über `posteingang.erklaerer.sprache_*` geseedet.
 */
const NATIVE_LABEL: Record<ErklaererLang, string> = {
  de: 'Deutsch',
  en: 'English',
  ru: 'Русский',
  uk: 'Українська',
  ar: 'العربية',
  tr: 'Türkçe',
};

export function ErklaererLangToggle({
  activeLang,
  options,
  onChange,
  className,
}: ErklaererLangToggleProps) {
  const t = useTranslations('posteingang.erklaerer');

  // Nur ein einziger (deutscher) Eintrag → kein Toggle nötig (Spec §4.2.1).
  if (options.length <= 1) return null;

  return (
    <Select
      value={activeLang}
      onValueChange={(next) => {
        if (next) onChange(next as ErklaererLang);
      }}
    >
      <SelectTrigger
        size="sm"
        aria-label={t('sprache_label')}
        className={cn('gap-1.5 text-xs', className)}
      >
        <Languages className="size-3.5 text-muted-foreground" aria-hidden="true" />
        <SelectValue>
          {(value) => (
            <span lang={value as string}>
              {NATIVE_LABEL[(value as ErklaererLang) ?? 'de']}
            </span>
          )}
        </SelectValue>
      </SelectTrigger>
      <SelectContent align="end">
        {options.map((code) => (
          <SelectItem key={code} value={code}>
            <span lang={code}>{NATIVE_LABEL[code]}</span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
