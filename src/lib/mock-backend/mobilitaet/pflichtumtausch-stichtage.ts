/**
 * Pflichtumtausch-Stichtags-Lookup nach Anlage 8a FeV.
 *
 * Spec: `docs/specs/stammdaten-v1-3-mobilitaet.md` § 4.3, § 6, § 13.1, VL-6 +
 * HL-MOB-6.
 *
 * Anlage 8a FeV staffelt den Stichtag für die Umtauschpflicht in zwei Achsen:
 *   1. Erste Achse — Geburtsjahr (für vor-1999 ausgestellte „graue Lappen" /
 *      „rosa Karte"-Führerscheine).
 *   2. Zweite Achse — Ausstellungsjahr (für 1999..2013-ausgestellte EU-
 *      Plastikkarten-Vorgänger). Ausstellung ab 19.01.2013 EU-konform mit
 *      eigenständigem 15-Jahre-Rhythmus nach § 6 Abs. 7 FeV → Stichtag
 *      `undefined` (`pflichtumtausch_status: 'nicht_relevant'`).
 *
 * Die Lookup-Funktion ist deterministisch und ohne `Date.now()`-Abhängigkeit;
 * sie produziert nur den Stichtag, NICHT den Status (Status wird aus
 * Stichtag + Umtausch-Datum berechnet — siehe `computePflichtumtauschStatus`).
 *
 * Quelle: Anlage 8a FeV (Stand 19.01.2022 i.d.F. der Sechsten ÄndV);
 * die Tabelle ist in unserer Mock-Lookup vereinfacht auf die Stichtage, die
 * für die V1.3-Persona-Konstellation relevant sind, plus Demo-Edge-Cases.
 */

/**
 * Tabelle 1 — Ausstellung vor 1999 (graue Lappen / rosa Karte), Stichtag
 * abhängig vom Geburtsjahr der Inhaber:in.
 *
 * Quelle: Anlage 8a FeV, Tabelle „Vor 1999 ausgestellte Führerscheine".
 */
const PRE_1999_STICHTAGE_NACH_GEBURTSJAHR: Array<{
  geburtsjahr_min: number;
  geburtsjahr_max: number;
  stichtag: string;
}> = [
  // Geburtsjahr vor 1953 → Stichtag 19.01.2033
  { geburtsjahr_min: 0, geburtsjahr_max: 1952, stichtag: '2033-01-19' },
  // Geburtsjahr 1953–1958 → Stichtag 19.01.2022 (bereits abgelaufen)
  { geburtsjahr_min: 1953, geburtsjahr_max: 1958, stichtag: '2022-01-19' },
  // Geburtsjahr 1959–1964 → Stichtag 19.01.2023 (abgelaufen)
  { geburtsjahr_min: 1959, geburtsjahr_max: 1964, stichtag: '2023-01-19' },
  // Geburtsjahr 1965–1970 → Stichtag 19.01.2024 (abgelaufen)
  { geburtsjahr_min: 1965, geburtsjahr_max: 1970, stichtag: '2024-01-19' },
  // Geburtsjahr 1971+ → Stichtag 19.01.2025 (abgelaufen)
  { geburtsjahr_min: 1971, geburtsjahr_max: 9999, stichtag: '2025-01-19' },
];

/**
 * Tabelle 2 — Ausstellung 1999..2013 (EU-Plastik-Vorgänger), Stichtag
 * abhängig vom Ausstellungsjahr.
 *
 * Quelle: Anlage 8a FeV, Tabelle „1999..2013 ausgestellte Führerscheine".
 */
const POST_1998_PRE_2014_STICHTAGE_NACH_AUSSTELLUNGSJAHR: Array<{
  ausstellungsjahr_min: number;
  ausstellungsjahr_max: number;
  stichtag: string;
}> = [
  // 1999–2001 → 19.01.2026 (abgelaufen)
  { ausstellungsjahr_min: 1999, ausstellungsjahr_max: 2001, stichtag: '2026-01-19' },
  // 2002–2004 → 19.01.2027 (Schmidt-Persona: Ausstellung 2002 → 19.01.2027)
  { ausstellungsjahr_min: 2002, ausstellungsjahr_max: 2004, stichtag: '2027-01-19' },
  // 2005–2007 → 19.01.2028
  { ausstellungsjahr_min: 2005, ausstellungsjahr_max: 2007, stichtag: '2028-01-19' },
  // 2008 → 19.01.2029
  { ausstellungsjahr_min: 2008, ausstellungsjahr_max: 2008, stichtag: '2029-01-19' },
  // 2009 → 19.01.2030
  { ausstellungsjahr_min: 2009, ausstellungsjahr_max: 2009, stichtag: '2030-01-19' },
  // 2010 → 19.01.2025 (Mehmet-Persona — past; Mehmet hat 14.01.2025 umgetauscht)
  { ausstellungsjahr_min: 2010, ausstellungsjahr_max: 2010, stichtag: '2025-01-19' },
  // 2011 → 19.01.2031
  { ausstellungsjahr_min: 2011, ausstellungsjahr_max: 2011, stichtag: '2031-01-19' },
  // 2012 → 19.01.2032
  { ausstellungsjahr_min: 2012, ausstellungsjahr_max: 2012, stichtag: '2032-01-19' },
  // 18.01.2013 (Stichtag-Grenztag): Karte ist noch alt-format → 19.01.2033
  { ausstellungsjahr_min: 2013, ausstellungsjahr_max: 2013, stichtag: '2033-01-19' },
];

/**
 * Liefert den Pflichtumtausch-Stichtag nach Anlage 8a FeV oder `undefined`,
 * wenn der Stichtag nicht relevant ist (Ausstellung ab 19.01.2014; EU-konforme
 * Karte mit eigenständigem 15-Jahre-Rhythmus § 6 Abs. 7 FeV).
 *
 * @param geburtsjahr Geburtsjahr der Inhaber:in (z. B. 1988).
 * @param ausstellungsjahr Jahr der Ausstellung der aktuellen Karte (z. B. 2002).
 *
 * VL-6 / HL-MOB-6: Banner sichtbar **nur** wenn beide Werte bekannt sind.
 * Caller (`<PflichtumtauschBanner>`) sollte bei `undefined`-Input den stillen
 * Hinweis `stammdaten.mobilitaet.pflichtumtausch.stiller_hinweis` rendern,
 * nicht das Banner.
 */
export function lookupPflichtumtauschStichtag(
  geburtsjahr: number | undefined,
  ausstellungsjahr: number | undefined,
): string | undefined {
  if (geburtsjahr === undefined || ausstellungsjahr === undefined) {
    return undefined;
  }

  // Ausstellung ab 19.01.2014 (technisch ab Ausstellungsjahr 2014; der
  // Stichtag-Grenztag 18.01.2013 zählt zur vor-2014-Kohorte): EU-konforme
  // 15-Jahre-Karte, kein Pflichtumtausch-Stichtag nach Anlage 8a.
  if (ausstellungsjahr >= 2014) {
    return undefined;
  }

  // Ausstellung 1999..2013: Lookup nach Ausstellungsjahr.
  if (ausstellungsjahr >= 1999) {
    const row = POST_1998_PRE_2014_STICHTAGE_NACH_AUSSTELLUNGSJAHR.find(
      (r) =>
        ausstellungsjahr >= r.ausstellungsjahr_min &&
        ausstellungsjahr <= r.ausstellungsjahr_max,
    );
    return row?.stichtag;
  }

  // Ausstellung vor 1999: Lookup nach Geburtsjahr.
  const row = PRE_1999_STICHTAGE_NACH_GEBURTSJAHR.find(
    (r) => geburtsjahr >= r.geburtsjahr_min && geburtsjahr <= r.geburtsjahr_max,
  );
  return row?.stichtag;
}
