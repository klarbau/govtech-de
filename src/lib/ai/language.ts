/**
 * Lightweight language detection for the assistant.
 *
 * Strategy:
 *   1. Trust an explicit `locale` from the client if it's one of the six
 *      supported locales (DE / EN / RU / UK / AR / TR).
 *   2. Otherwise sniff the most recent user message for cheap signals:
 *      script (Cyrillic, Arabic), DE-only diacritics + stopwords,
 *      TR-specific letters, common EN stopwords.
 *   3. Fall back to DE (the demo's primary language).
 *
 * Detection is intentionally pattern-based and locale-agnostic in shape —
 * we don't ship a full ML detector. Misclassification is recoverable: the
 * model itself will mirror the user's language regardless of our hint.
 */

export const SUPPORTED_LOCALES = ['de', 'en', 'ru', 'uk', 'ar', 'tr'] as const;
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

export const DEFAULT_LOCALE: SupportedLocale = 'de';

const LOCALE_NAMES_DE: Record<SupportedLocale, string> = {
  de: 'Deutsch',
  en: 'Englisch',
  ru: 'Russisch',
  uk: 'Ukrainisch',
  ar: 'Arabisch',
  tr: 'Türkisch',
};

export function localeNameDe(locale: SupportedLocale): string {
  return LOCALE_NAMES_DE[locale];
}

export function isSupportedLocale(value: unknown): value is SupportedLocale {
  return (
    typeof value === 'string' &&
    (SUPPORTED_LOCALES as readonly string[]).includes(value)
  );
}

/**
 * Detect language from a single user message. Best-effort, no allocations
 * beyond one regex test per signal. Returns `undefined` if no strong signal.
 */
function sniffMessage(text: string): SupportedLocale | undefined {
  if (!text) return undefined;
  const t = text.toLowerCase();

  // Script-based signals first (highest confidence).
  if (/[؀-ۿ]/.test(text)) return 'ar';

  if (/[Ѐ-ӿ]/.test(text)) {
    // Distinguish UK from RU via UK-only letters (є, і, ї, ґ).
    if (/[єіїґ]/i.test(text)) return 'uk';
    return 'ru';
  }

  // TR-specific letters (ı, ş, ğ, ç on top of common patterns).
  if (/[ıİşŞğĞ]/.test(text) || /\b(merhaba|teşekkür|nasıl)\b/.test(t)) {
    return 'tr';
  }

  // DE: sharp diacritics + frequent stopwords.
  if (/[äöüß]/.test(t) || /\b(ich|nicht|und|der|die|das|umzug|behörde)\b/.test(t)) {
    return 'de';
  }

  // EN fallback by stopwords.
  if (/\b(the|i'm|hello|please|move|address|help)\b/.test(t)) {
    return 'en';
  }

  return undefined;
}

/**
 * Resolve the active locale for an assistant turn.
 *
 * @param latestUserMessage  raw text of the most recent user message (optional).
 * @param requestedLocale    `locale` param from the POST body (optional).
 */
export function resolveLocale(
  latestUserMessage: string | undefined,
  requestedLocale: unknown,
): SupportedLocale {
  if (isSupportedLocale(requestedLocale)) return requestedLocale;
  const sniffed = latestUserMessage ? sniffMessage(latestUserMessage) : undefined;
  return sniffed ?? DEFAULT_LOCALE;
}
