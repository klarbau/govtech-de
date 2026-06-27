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
    return format(parseISO(iso), 'EEEE, dd. MMMM yyyy', { locale });
  } catch {
    return iso.slice(0, 10);
  }
}

export function formatDateShort(iso: string, locale: Locale): string {
  try {
    return format(parseISO(iso), 'EE, dd. MMM yyyy', { locale });
  } catch {
    return iso.slice(0, 10);
  }
}

export function formatTimeRange(iso: string, durationMinutes = 45): string {
  try {
    const d = parseISO(iso);
    const end = new Date(d.getTime() + durationMinutes * 60 * 1000);
    return `${format(d, 'HH:mm')} – ${format(end, 'HH:mm')} Uhr`;
  } catch {
    return '';
  }
}
