/**
 * ID- und Aktenzeichen-Generatoren.
 *
 * Aktenzeichen-Formate stammen verbatim aus `docs/domain/umzug.md`
 * §"Aktenzeichen-Formate" und müssen dort gepflegt werden. Jedes generierte
 * Aktenzeichen ist mit einem `[MOCK]`-Präfix versehen (außer bei Steuer-IDs,
 * die als Roh-Wert im Document-Vault stehen — dort taucht `[MOCK]` im
 * Watermark-Feld auf).
 */

/**
 * RFC4122-v4-kompatible UUID. Verwendet `crypto.randomUUID` falls verfügbar
 * (Browser + Node ≥ 19), fällt sonst auf einen Math.random-basierten Generator
 * zurück (für Test-Umgebungen ohne crypto).
 */
export function uuid(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  // Fallback: nicht kryptografisch stark, aber für Demo-IDs ausreichend.
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

const pad = (value: number, width: number): string =>
  value.toString().padStart(width, '0');

const randomDigits = (count: number): string => {
  let out = '';
  for (let i = 0; i < count; i++) out += Math.floor(Math.random() * 10).toString();
  return out;
};

const currentYear = (): number => new Date().getUTCFullYear();
const currentMonth = (): string => pad(new Date().getUTCMonth() + 1, 2);

/** Bürgeramt Berlin-Mitte: `[MOCK] BA-MITTE/EWA-2026-04-0083421`. */
export function aktenzeichenBuergeramtBerlin(bezirk: string = 'MITTE'): string {
  return `[MOCK] BA-${bezirk.toUpperCase()}/EWA-${currentYear()}-${currentMonth()}-${randomDigits(7)}`;
}

/**
 * Finanzamt-Steuernummer im Format NN/BBB/UUUUP (Berlin: NN=11). Liefert
 * Standard-Berliner-Steuernummer-Format aus dem Domain-Note. Jahres-Suffix
 * gemäß Mock-Backend-Coder-Note `<Steuernummer> // <Jahr>`.
 */
export function aktenzeichenFinanzamt(faNummer: string = '11'): string {
  return `[MOCK] ${faNummer}/${randomDigits(3)}/${randomDigits(5)} // ${currentYear()}`;
}

/** KFZ Berlin LABO: `[MOCK] B-KFZ-2026-04711-Halter`. */
export function aktenzeichenKfzBerlin(): string {
  return `[MOCK] B-KFZ-${currentYear()}-${randomDigits(5)}-Halter`;
}

/** AOK Nordost — Versichertennummer-artiges Format (synthetisch). */
export function aktenzeichenAokNordost(): string {
  return `[MOCK] AOK-NO-${currentYear()}-${randomDigits(8)}`;
}

/** Beitragsservice ARD/ZDF/Dlr — 9-stellige Beitragsnummer. */
export function aktenzeichenBeitragsservice(): string {
  const a = randomDigits(3);
  const b = randomDigits(3);
  const c = randomDigits(3);
  return `[MOCK] ${a} ${b} ${c}`;
}

/** Familienkasse Berlin-Brandenburg — `[MOCK] FK 123456 / 7890`. */
export function aktenzeichenFamilienkasse(): string {
  return `[MOCK] FK ${randomDigits(6)} / ${randomDigits(4)}`;
}

/** Ausländerbehörde Berlin LEA — `[MOCK] ABH-B-2026/IV-A-7842`. */
export function aktenzeichenAbhBerlin(): string {
  return `[MOCK] ABH-B-${currentYear()}/IV-A-${randomDigits(4)}`;
}

/** Bundesdruckerei — interne Auftragsnummer (synthetisch). */
export function aktenzeichenBundesdruckerei(): string {
  return `[MOCK] BD-PA/${currentYear()}-${currentMonth()}-${randomDigits(6)}`;
}

/** Synthetische Steuer-Identifikationsnummer (AO §139b, 11 Ziffern). */
export function steuerIdSynthetic(): string {
  return `${randomDigits(2)} ${randomDigits(3)} ${randomDigits(3)} ${randomDigits(3)}`;
}

/** Synthetische Rentenversicherungsnummer (AANNNNNNNAA, 12 Stellen). */
export function rentenversicherungsnummerSynthetic(): string {
  const a = randomDigits(2);
  const b = randomDigits(6);
  const letter = String.fromCharCode(65 + Math.floor(Math.random() * 26));
  const c = randomDigits(3);
  return `${a} ${b} ${letter} ${c}`;
}

/**
 * Wählt das passende Aktenzeichen-Format basierend auf einer Behörden-ID.
 * Fallback ist ein generisches `[MOCK] AZ-<id>-<digits>`.
 */
export function aktenzeichenForBehoerde(behoerdeId: string): string {
  switch (behoerdeId) {
    case 'buergeramt-berlin-mitte':
      return aktenzeichenBuergeramtBerlin('MITTE');
    case 'finanzamt-koerperschaften-i-berlin':
      return aktenzeichenFinanzamt('11');
    case 'kfz-berlin-labo':
      return aktenzeichenKfzBerlin();
    case 'aok-nordost':
      return aktenzeichenAokNordost();
    case 'beitragsservice-koeln':
      return aktenzeichenBeitragsservice();
    case 'familienkasse-berlin-brandenburg':
      return aktenzeichenFamilienkasse();
    case 'abh-berlin-lea':
      return aktenzeichenAbhBerlin();
    case 'bundesdruckerei':
      return aktenzeichenBundesdruckerei();
    default:
      return `[MOCK] AZ-${behoerdeId.toUpperCase().slice(0, 6)}-${randomDigits(7)}`;
  }
}
