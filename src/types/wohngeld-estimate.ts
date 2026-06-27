/**
 * Proaktiver Wohngeld-Anspruch-Hinweis — Heuristik-Ergebnis
 * (Spec `proaktiver-wohngeld-anspruch.md` § 6).
 *
 * KEIN WoGG-Rechner, KEINE Anspruchsberechnung. Die Euro-Range ist eine
 * synthetische **[MOCK]-Schätzung** aus `(haushaltsgroesse, mietstufe)`, hart
 * begrenzt auf das verifizierte Realismus-Fenster €180–370 (Destatis-Mittel
 * ~€297/Monat). Sie stammt **niemals** aus Seed-Daten — es gibt nirgends ein
 * numerisches Einkommens- oder Miet-Feld in den Stammdaten. Der Hinweis selbst
 * ist ein **[ZUKUNFT 2027]**-Konzept (proaktiver daten-getriggerter Anspruchs-
 * Hinweis, Koalitionsvertrag-2025-Zusage; antragsloses Kindergeld ist die
 * benannte Blaupause).
 */
export interface WohngeldAnspruchEstimate {
  /** Heuristik-Ergebnis: Hinweis nur zeigen, wenn true. */
  qualifiziert: boolean;
  /** Untere Grenze der unverbindlichen Monats-Schätzung, EUR (synthetisch, [MOCK]). */
  geschaetzt_min_eur: number;
  /** Obere Grenze der unverbindlichen Monats-Schätzung, EUR (synthetisch, [MOCK]). */
  geschaetzt_max_eur: number;
  /** Mietstufe I–VII, aus registrierter Gemeinde abgeleitet (NICHT Roh-PLZ), [MOCK]. */
  mietstufe: 1 | 2 | 3 | 4 | 5 | 6 | 7;
  /** Haushaltsgröße = 1 + Partner? + Anzahl Kinder (Melderegister-Proxy via persona.familie). */
  haushaltsgroesse: number;
  /** i18n-Key des Trigger-/Begründungs-Labels (DE source). */
  trigger_label_i18n_key: string;
  /** Norm-Kürzel, die der Hinweis on-screen zitiert. */
  rechtsgrundlage: string[];
  /** Immer true — proaktiver daten-getriggerter Hinweis ist [ZUKUNFT 2027]. */
  zukunft: true;
}
