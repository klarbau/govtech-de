import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { ar, de, enUS, ru, tr, uk, type Locale } from "date-fns/locale"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

const DATE_FNS_LOCALES: Record<string, Locale> = {
  de,
  en: enUS,
  ru,
  uk,
  ar,
  tr,
};

/**
 * Map a next-intl locale code to its `date-fns` Locale so month/day WORDS
 * localize (numerals stay Latin). Falls back to German for unknown codes.
 */
export function dateFnsLocale(locale: string): Locale {
  return DATE_FNS_LOCALES[locale] ?? de;
}

/** German civilian date `dd.MM.yyyy` (no timezone, no Locale-API drift). */
export function formatDateDe(input: string | Date): string {
  const d = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(d.getTime())) return "";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = String(d.getFullYear());
  return `${dd}.${mm}.${yyyy}`;
}

/** German civilian time `HH:mm` (24-h, no Locale-API drift). */
export function formatTimeDe(input: string | Date): string {
  const d = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(d.getTime())) return "";
  const hh = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${hh}:${min}`;
}
