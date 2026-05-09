/**
 * Quick smoke for the new safety patterns: erfolgsprognose + real_letter_paste.
 * Run via: npx tsx src/lib/ai/__smoke_safety__.ts
 */

import { detectRefusal } from './safety';

let failures = 0;
function check(label: string, ok: boolean, detail?: unknown): void {
  if (ok) {
    // eslint-disable-next-line no-console
    console.log(`  ok  ${label}`);
  } else {
    failures += 1;
     
    console.error(`  FAIL ${label}`, detail ?? '');
  }
}

// eslint-disable-next-line no-console
console.log('## smoke: safety refusal patterns');

// erfolgsprognose: triggers
const e1 = detectRefusal('Wird mein Einspruch gegen den Steuerbescheid Erfolg haben?');
check('DE: "Wird mein Einspruch Erfolg haben" → erfolgsprognose', e1?.category === 'erfolgsprognose', e1);

const e2 = detectRefusal('Lohnt sich ein Widerspruch gegen diesen Bescheid?');
check('DE: "Lohnt sich ein Widerspruch" → erfolgsprognose', e2?.category === 'erfolgsprognose', e2);

const e3 = detectRefusal('Will my appeal succeed?');
check('EN: "Will my appeal succeed" → erfolgsprognose', e3?.category === 'erfolgsprognose', e3);

const e4 = detectRefusal('Ist dieser Bescheid rechtmäßig?');
check('DE: "Ist dieser Bescheid rechtmäßig" → erfolgsprognose', e4?.category === 'erfolgsprognose', e4);

const e5 = detectRefusal('Wie stehen meine Chancen?');
check('DE: "Wie stehen meine Chancen" → erfolgsprognose', e5?.category === 'erfolgsprognose', e5);

// real_letter_paste: triggers
const realBrief = `Finanzamt Hamburg-Eimsbüttel
Steuernummer: 22/123/45678
Sehr geehrter Herr Mustermann,

Ihr Steuerbescheid für das Veranlagungsjahr 2024.
Bitte zahlen Sie bis zum 12.06.2026 den Betrag von 1.247,00 EUR.

Rechtsbehelfsbelehrung:
Gegen diesen Bescheid kann innerhalb eines Monats Einspruch eingelegt werden.

Mit freundlichen Grüßen
Finanzamt Hamburg`;

const r1 = detectRefusal(realBrief);
check('Real-Brief paste (no [MOCK]) → real_letter_paste', r1?.category === 'real_letter_paste', r1);

// MOCK-watermarked content should NOT trigger
const mockBrief = `[MOCK – Verwaltungsdemo, keine echten Daten]\n\n${realBrief}`;
const r2 = detectRefusal(mockBrief);
check('Mock-watermarked Brief → NOT real_letter_paste', r2?.category !== 'real_letter_paste', r2);

// Short message should not trigger
const r3 = detectRefusal('Aktenzeichen: 22/123/45678');
check('Short Aktenzeichen-only message → not flagged', r3?.category !== 'real_letter_paste', r3);

// Normal questions should not trigger
const n1 = detectRefusal('Was steht in meinem Brief vom Finanzamt?');
check('Normal Brief-Frage → no refusal', n1 === undefined, n1);

const n2 = detectRefusal('Welche Frist hat der ABH-Brief?');
check('Frist-Frage → no refusal', n2 === undefined, n2);

if (failures > 0) {
   
  console.error(`\n${failures} smoke check(s) failed.`);
  process.exit(1);
} else {
  // eslint-disable-next-line no-console
  console.log('\nAll smoke checks passed.');
}
