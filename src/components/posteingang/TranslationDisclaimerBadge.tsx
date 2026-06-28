'use client';

import * as React from 'react';
import { createTranslator, useLocale, useTranslations } from 'next-intl';
import { Languages } from 'lucide-react';

import deMessages from '@/lib/i18n/locales/de.json';
import { isLocale, rtlLocales, type Locale } from '@/i18n/routing';
import { cn } from '@/lib/utils';

import type { ErklaererLang } from './use-erklaerer-lang';

interface TranslationDisclaimerBadgeProps {
  /** Aktive Erläuterungs-Sprache (≠ 'de', wenn das Badge sichtbar ist). */
  activeLang: Exclude<ErklaererLang, 'de'>;
  className?: string;
}

const NAMESPACE = 'posteingang.erklaerer';
const BADGE_KEY = 'badge_nonbinding';
const HINT_KEY = 'badge_nonbinding_hint';

const DE_TRANSLATOR = createTranslator({
  locale: 'de',
  messages: deMessages,
  namespace: NAMESPACE,
});

const DE_BADGE = DE_TRANSLATOR(BADGE_KEY);
const DE_HINT = DE_TRANSLATOR(HINT_KEY);

/**
 * Non-Binding-Badge (Spec §4.2.2 — Pflichtplatzierung).
 *
 * Sichtbar **immer dann**, wenn die aktive Erläuterungs-Sprache ≠ `de` ist,
 * direkt über der Bullet-Liste, nicht wegklappbar. Zeigt den Pflichtsatz
 * „Übersetzte Erläuterung — rechtsverbindlich ist allein das deutsche
 * Original." in **DE** UND im Äquivalent der aktiven Sprache.
 *
 * Das DE-Original kommt verbatim aus `de.json` (locale-unabhängig). Der
 * aktive-Sprach-Satz wird in der aktiven Erläuterungs-Sprache aufgelöst:
 * stimmt sie mit der UI-Locale überein, über den In-Context-`useTranslations`;
 * sonst über die lazy geladenen Locale-Messages (`createTranslator`), damit das
 * Umschalten des Toggles nicht die UI-Locale ändern muss.
 *
 * Liegt ZUSÄTZLICH zum roten `RoterHinweisBanner` vor, ersetzt ihn nicht.
 */
export function TranslationDisclaimerBadge({
  activeLang,
  className,
}: TranslationDisclaimerBadgeProps) {
  const uiLocaleRaw = useLocale();
  const uiLocale: Locale = isLocale(uiLocaleRaw) ? uiLocaleRaw : 'de';
  const tActive = useTranslations(NAMESPACE);

  // Active-language Messages: aus dem Kontext, wenn aktive Sprache == UI-Locale;
  // sonst lazy laden, damit der brief-lokale Toggle ohne UI-Locale-Wechsel
  // korrekt übersetzt.
  const [loadedMessages, setLoadedMessages] = React.useState<
    Record<string, unknown> | null
  >(null);

  const needsLazyLoad = activeLang !== uiLocale;

  React.useEffect(() => {
    if (!needsLazyLoad) {
      setLoadedMessages(null);
      return;
    }
    let cancelled = false;
    void import(`@/lib/i18n/locales/${activeLang}.json`)
      .then((mod) => {
        if (cancelled) return;
        setLoadedMessages(mod.default as Record<string, unknown>);
      })
      .catch(() => {
        if (cancelled) return;
        setLoadedMessages(null);
      });
    return () => {
      cancelled = true;
    };
  }, [activeLang, needsLazyLoad]);

  const activeTranslator = React.useMemo(() => {
    if (!needsLazyLoad) return null;
    if (!loadedMessages) return null;
    return createTranslator({
      locale: activeLang,
      messages: loadedMessages,
      namespace: NAMESPACE,
    });
  }, [needsLazyLoad, loadedMessages, activeLang]);

  const activeBadge = activeTranslator
    ? activeTranslator(BADGE_KEY)
    : tActive(BADGE_KEY);
  const activeHint = activeTranslator
    ? activeTranslator(HINT_KEY)
    : tActive(HINT_KEY);

  const isRtl = (rtlLocales as readonly string[]).includes(activeLang);

  return (
    <div
      role="note"
      className={cn(
        'flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-900 dark:border-amber-800/70 dark:bg-amber-950/40 dark:text-amber-100',
        className,
      )}
    >
      <Languages className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <div className="flex flex-col gap-1">
        {/* DE-Pflichtsatz — locale-unabhängig verbatim aus de.json. */}
        <p lang="de" className="font-medium">
          {DE_BADGE}
        </p>
        {/* Äquivalent in der aktiven Sprache; RTL für ar. */}
        <p
          lang={activeLang}
          dir={isRtl ? 'rtl' : undefined}
          className="text-amber-800 dark:text-amber-200"
        >
          {activeBadge}
        </p>
        <p
          lang={activeLang}
          dir={isRtl ? 'rtl' : undefined}
          className="text-amber-800 dark:text-amber-300/80"
        >
          {activeHint}
        </p>
        <p lang="de" className="sr-only">
          {DE_HINT}
        </p>
      </div>
    </div>
  );
}
