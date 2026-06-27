import type { Letter, LetterFrist } from '@/types';

/**
 * Erzeugt eine `.ics`-Kalender-Datei für eine Brief-Frist und löst den Download
 * aus. Client-only (kein Backend). Geteilt zwischen `PostDetail`
 * (PosteingangInbox.tsx, der Live-Renderer) und dem verwaisten `LetterReader`.
 */
export function downloadIcs(letter: Letter, frist: LetterFrist): void {
  const dt = frist.datum.replaceAll('-', '');
  const summary = `Frist · ${frist.typ} · ${letter.aktenzeichen}`;
  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//govtech-de-demo//posteingang//DE',
    'BEGIN:VEVENT',
    `UID:${letter.id}-${frist.typ}@govtech-de-demo`,
    `DTSTAMP:${dt}T080000Z`,
    `DTSTART;VALUE=DATE:${dt}`,
    `DTEND;VALUE=DATE:${dt}`,
    `SUMMARY:${summary}`,
    `DESCRIPTION:[MOCK] ${frist.original_zitat.replaceAll(/[\r\n]+/g, ' ')}`,
    'END:VEVENT',
    'END:VCALENDAR',
    '',
  ].join('\r\n');
  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `frist-${letter.id}-${frist.typ}.ics`;
  a.click();
  URL.revokeObjectURL(url);
}
