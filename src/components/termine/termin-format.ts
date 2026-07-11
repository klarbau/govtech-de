import { format, parseISO, type Locale } from 'date-fns';

/** yyyy-MM-dd Tagesschlüssel eines ISO-Timestamps (lokal). */
export function dayKey(iso: string): string {
  try {
    return format(parseISO(iso), 'yyyy-MM-dd');
  } catch {
    return iso.slice(0, 10);
  }
}

export function formatDateLong(iso: string, locale: Locale): string {
  try {
    // 'PPPP' = lokalisiertes Langdatum inkl. Wochentag („Sonntag, 12. Juli 2026"
    // / "Sunday, July 12th, 2026") — kein deutsches Muster in Fremd-Locales.
    return format(parseISO(iso), 'PPPP', { locale });
  } catch {
    return iso.slice(0, 10);
  }
}

export function formatDateShort(iso: string, locale: Locale): string {
  try {
    return format(parseISO(iso), 'EE, PP', { locale });
  } catch {
    return iso.slice(0, 10);
  }
}

/** Reiner 24h-Zeitraum ohne Suffix — das deutsche „Uhr" hängt die i18n-Ebene an
 *  (`termine.zeit_range` / `termine.uhr_dauer`). */
export function formatTimeRange(iso: string, durationMinutes = 45): string {
  try {
    const d = parseISO(iso);
    const end = new Date(d.getTime() + durationMinutes * 60 * 1000);
    return `${format(d, 'HH:mm')} – ${format(end, 'HH:mm')}`;
  } catch {
    return '';
  }
}
