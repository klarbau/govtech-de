/**
 * Proaktiver Kinderzuschlag-Anspruch-Radar — Heuristik-Ergebnis
 * (Spec `anspruch-arc.md` § 6, Beat c).
 *
 * KEIN § 6a-BKGG-Rechner, KEINE Anspruchsberechnung. Die Euro-Range ist eine
 * synthetische **[MOCK]-Haushalts-Schätzung**, hart auf den § 6a-BKGG-
 * Höchstbetrag geklemmt (297 €/Kind/Monat → Haushalts-Cap `297 · kinder`, für
 * Familie Schmidt = 2 Kinder → ≤ 594 €). Sie stammt **niemals** aus Seed-Daten
 * — es gibt nirgends ein numerisches Einkommensfeld in den Stammdaten. Der
 * Radar selbst ist ein **[ZUKUNFT 2027]**-Konzept (proaktive daten-getriggerte
 * Erkennung), antragsgebunden (§ 6a Abs. 7 BKGG) → „Antrag vorbereiten", nie
 * „läuft schon".
 */
export interface KinderzuschlagAnspruchEstimate {
  /** Heuristik-Ergebnis: Radar nur zeigen, wenn true. */
  qualifiziert: boolean;
  /** Untere Grenze der unverbindlichen Monats-Schätzung, EUR (synthetisch, [MOCK]). */
  geschaetzt_min_eur: number;
  /** Obere Grenze der unverbindlichen Monats-Schätzung, EUR (synthetisch, [MOCK]). */
  geschaetzt_max_eur: number;
  /** Anzahl unverheirateter kindergeld-berechtigter Kinder < 25 im Haushalt (auslösender Datenpunkt). */
  kinder_im_haushalt: number;
  /** Bezieht laufend Kindergeld (§ 6a BKGG-Voraussetzung) — auslösender Datenpunkt. */
  kindergeld_bezug: boolean;
  /** i18n-Keys der auslösenden Datenpunkte (DE source). */
  datenpunkt_i18n_keys: string[];
  /**
   * INANSPRUCHNAHME-Quote für den Counter — der Anteil der berechtigten Kinder,
   * die die Leistung TATSÄCHLICH beziehen (BMFSFJ-Schätzung: ~0.35). ⚠️ NICHT die
   * Non-take-up-Quote (die wäre ~0.65). Der Counter-String rechnet NICHT invertiert.
   */
  inanspruchnahme_quote: number;
  /** Norm-Kürzel, die die Card on-screen zitiert. */
  rechtsgrundlage: string[];
  /** CTA-Deep-Link-Ziel (bestehende Lebenslage). */
  cta_route: '/lebenslagen/kinderzuschlag';
  /** Immer true — proaktive daten-getriggerte Erkennung ist [ZUKUNFT 2027]. */
  zukunft: true;
}
