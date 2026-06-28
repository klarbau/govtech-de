'use client';

import * as React from 'react';
import { useLocale } from 'next-intl';

import { isLocale, type Locale } from '@/i18n/routing';
import type { LetterAiSummary, LetterAiSummaryPostOpen } from '@/types';

/**
 * Mehrsprachiger Brief-Erklärer (Spec §4.2) — locale-bewusste Auswahl der
 * Erläuterungs-Bullets.
 *
 * Quelle der Wahrheit: `summary.translations?.[lang]?.post_open ?? summary.post_open`
 * (graceful DE-Fallback). Die Sprachwahl ist **brief-lokal** (sie ändert nicht die
 * globale UI-Locale) und initialisiert sich aus der aktiven UI-Locale, sofern für
 * diesen Brief ein Seed existiert; sonst `de`.
 *
 * Diese Hook kapselt die gesamte Auswahl-Logik, damit `AISummaryBlock` und
 * `AiErklaererCard` dieselbe Quelle verwenden (kein Drift).
 */

export type ErklaererLang = 'de' | Exclude<Locale, 'de'>;

const TRANSLATABLE: ReadonlyArray<Exclude<Locale, 'de'>> = [
  'en',
  'ru',
  'uk',
  'ar',
  'tr',
];

/** Liefert die Nicht-DE-Locales, für die DIESER Brief ein `post_open`-Seed trägt. */
export function seededLangsFor(
  aiSummary: LetterAiSummary | undefined,
): ReadonlyArray<Exclude<Locale, 'de'>> {
  const translations = aiSummary?.translations;
  if (!translations) return [];
  return TRANSLATABLE.filter((code) => {
    const post = translations[code]?.post_open;
    return !!post && post.bullets.length > 0;
  });
}

interface ErklaererLangState {
  /** Aktive Erläuterungs-Sprache (brief-lokal). */
  activeLang: ErklaererLang;
  /** Setter — ändert nur diesen Brief, nie die UI-Locale. */
  setActiveLang: (lang: ErklaererLang) => void;
  /** Auswählbare Optionen: `de` + alle geseedeten Nicht-DE-Locales (keine toten Einträge). */
  options: ReadonlyArray<ErklaererLang>;
  /** Aktive Post-Open-Bullets (übersetzt oder DE-Fallback). */
  activeSummary: LetterAiSummaryPostOpen | undefined;
  /** True, wenn die aktive Sprache ≠ de IST und ein Seed geliefert wurde. */
  isTranslated: boolean;
  /**
   * True, wenn die initiale UI-Locale ≠ de war, der Brief aber KEIN Seed dafür
   * hat → DE-Bullets + sichtbarer `fallback_de_note`-Hinweis (Spec §9).
   */
  isFallbackDe: boolean;
}

export function useErklaererLang(
  aiSummary: LetterAiSummary | undefined,
  /** Aktuell gerenderte DE-Bullets (kommen ggf. lazy aus `extrahiereAktion`). */
  dePostOpen: LetterAiSummaryPostOpen | undefined,
): ErklaererLangState {
  const uiLocaleRaw = useLocale();
  const uiLocale: Locale = isLocale(uiLocaleRaw) ? uiLocaleRaw : 'de';

  const seeded = React.useMemo(() => seededLangsFor(aiSummary), [aiSummary]);

  const options = React.useMemo<ReadonlyArray<ErklaererLang>>(
    () => ['de', ...seeded],
    [seeded],
  );

  // Initialwert = UI-Locale, wenn dafür ein Seed existiert; sonst de.
  const initialLang: ErklaererLang =
    uiLocale !== 'de' && seeded.includes(uiLocale) ? uiLocale : 'de';

  const [activeLang, setActiveLang] = React.useState<ErklaererLang>(initialLang);

  // UI-Locale-Wechsel (oder spätes Seed-Laden) re-initialisiert die brief-lokale
  // Wahl, solange die Bürger:in nicht selbst umgeschaltet hat.
  const userTouched = React.useRef(false);
  React.useEffect(() => {
    if (userTouched.current) return;
    setActiveLang(initialLang);
  }, [initialLang]);

  const onSetActiveLang = React.useCallback((lang: ErklaererLang) => {
    userTouched.current = true;
    setActiveLang(lang);
  }, []);

  const translatedPostOpen =
    activeLang !== 'de'
      ? aiSummary?.translations?.[activeLang]?.post_open
      : undefined;

  const activeSummary =
    activeLang === 'de' ? dePostOpen : (translatedPostOpen ?? dePostOpen);

  const isTranslated = activeLang !== 'de' && !!translatedPostOpen;

  // Fallback-Zustand: die initiale UI-Locale war Nicht-DE, hat aber keinen Seed,
  // sodass DE angezeigt wird — sichtbarer Hinweis (Spec §9). Greift nur, solange
  // die Bürger:in nicht aktiv DE gewählt hat.
  const isFallbackDe =
    !userTouched.current &&
    uiLocale !== 'de' &&
    !seeded.includes(uiLocale) &&
    activeLang === 'de';

  return {
    activeLang,
    setActiveLang: onSetActiveLang,
    options,
    activeSummary,
    isTranslated,
    isFallbackDe,
  };
}
