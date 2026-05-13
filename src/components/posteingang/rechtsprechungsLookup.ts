/**
 * Rechtsprechungs-Zitat-Lookup (Spec § 11.28 Hard-Line — Stammdaten V1.1).
 *
 * Pattern-Schwester der V1 `normZitatLookup.ts`-Map: liefert für ein
 * sichtbares Kurzzitat die Voll-aria-Aussprache, das Vollzitat und die
 * Kernaussage in deutscher Klartext-Form. Wird von
 * `<RechtsprechungZitatSpan>` und vom Pflegegrad-Modal-Body verwendet.
 *
 * Frontend-coder darf das EuGH-Zitat NICHT in einen string-Hardcoded-
 * Mode degradieren — alle Verweise gehen über diese Map.
 */

export interface RechtsprechungsZitat {
  /** Sichtbarer Kurztext, z. B. „EuGH C-184/20". */
  kurz: string;
  /**
   * Voll-aria-label für Screenreader, z. B. „Urteil des Europäischen
   * Gerichtshofs vom 1. August 2022 in der Rechtssache C-184 Schrägstrich 20".
   */
  aria_label: string;
  /** Vollständiges Zitat für Tooltip-Body. */
  vollzitat: string;
  /** Hauptaussage in 1 Satz für Tooltip-Body (deutscher Klartext). */
  kernaussage_de: string;
}

export const RECHTSPRECHUNGS_LOOKUP: Record<string, RechtsprechungsZitat> = {
  'EuGH C-184/20': {
    kurz: 'EuGH C-184/20',
    aria_label:
      'Urteil des Europäischen Gerichtshofs vom 1. August 2022 in der Rechtssache C-184 Schrägstrich 20',
    vollzitat:
      'EuGH, Urteil v. 01.08.2022 — C-184/20 (OT v. Vyriausioji tarnybinės etikos komisija)',
    kernaussage_de:
      'Sensitive Daten iSv Art. 9 DSGVO sind alle Daten, aus denen durch gedanklichen Schluss oder Vergleich Informationen über die geschützten Kategorien (Gesundheit, Sexualität, Religion, Politik) ableitbar sind — auch eine indirekte Offenbarung genügt (weite Auslegung).',
  },
};

/**
 * Liefert die `aria-label`-Aussprache zu einem sichtbaren Rechtsprechungs-
 * Kurzzitat. `undefined` → Caller fällt auf den sichtbaren Text zurück.
 */
export function getRechtsprechungsAriaLabel(text: string): string | undefined {
  const normalised = text.trim();
  return RECHTSPRECHUNGS_LOOKUP[normalised]?.aria_label;
}

/**
 * Liefert das volle Lookup-Objekt zu einem Kurzzitat (für Tooltip-Inhalte).
 */
export function getRechtsprechungsZitat(
  text: string,
): RechtsprechungsZitat | undefined {
  const normalised = text.trim();
  return RECHTSPRECHUNGS_LOOKUP[normalised];
}
