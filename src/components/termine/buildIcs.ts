import type { Termin } from '@/types';

/** Pad to 2 digits. */
function p2(n: number): string {
  return String(n).padStart(2, '0');
}

/** ISO timestamp → iCalendar UTC stamp `YYYYMMDDTHHMMSSZ`. */
function toIcsUtc(iso: string): string {
  const d = new Date(iso);
  return (
    `${d.getUTCFullYear()}${p2(d.getUTCMonth() + 1)}${p2(d.getUTCDate())}` +
    `T${p2(d.getUTCHours())}${p2(d.getUTCMinutes())}${p2(d.getUTCSeconds())}Z`
  );
}

/** Escape iCalendar TEXT values (RFC 5545 § 3.3.11). */
function escapeIcsText(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
}

const DEFAULT_DURATION_MIN = 60;
const MOCK_NOTE = '[MOCK – Verwaltungsdemo, keine echten Daten]';

/**
 * Builds a valid single-VEVENT `.ics` string for a Termin. Pure frontend —
 * no backend call. DESCRIPTION carries the `[MOCK]` notice + Buchungsreferenz.
 */
export function buildIcs(termin: Termin, behoerdeName: string): string {
  const start = new Date(termin.datum);
  const end = new Date(start.getTime() + DEFAULT_DURATION_MIN * 60_000);

  const descriptionParts = [MOCK_NOTE];
  if (termin.buchungsreferenz) {
    descriptionParts.push(`Buchungsreferenz: ${termin.buchungsreferenz}`);
  }
  descriptionParts.push(behoerdeName);

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//GovTech DE//Termine Demo//DE',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${termin.id}@govtech-de.mock`,
    `DTSTAMP:${toIcsUtc(new Date().toISOString())}`,
    `DTSTART:${toIcsUtc(start.toISOString())}`,
    `DTEND:${toIcsUtc(end.toISOString())}`,
    `SUMMARY:${escapeIcsText(termin.betreff)}`,
    `LOCATION:${escapeIcsText(termin.ort.details)}`,
    `DESCRIPTION:${escapeIcsText(descriptionParts.join('\n'))}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ];

  return lines.join('\r\n');
}

/** Triggers a client-side download of the generated `.ics` file. */
export function downloadIcs(termin: Termin, behoerdeName: string): void {
  const blob = new Blob([buildIcs(termin, behoerdeName)], {
    type: 'text/calendar;charset=utf-8',
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `${termin.id}.ics`;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}
