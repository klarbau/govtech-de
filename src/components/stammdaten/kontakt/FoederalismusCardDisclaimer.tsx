import { useTranslations } from 'next-intl';

import { wrapNormZitate } from '@/components/posteingang/wrapNormZitate';

/**
 * `<FoederalismusCardDisclaimer>` — Spec § 2.2 + Hard-Line § 11.34.
 *
 * Sektions-Card-Banner zwischen Sektion-Header und den 4 Cards der
 * Kontakt-Sektion. Verbatim-Wortlaut aus § 2.2; renders als `<aside
 * role="note">` mit Norm-Zitat-Wrap für „§ 9 OZG" und Datum-`<time>`.
 */
export function FoederalismusCardDisclaimer() {
  const t = useTranslations('stammdaten.kontakt');

  return (
    <aside
      role="note"
      aria-label={t('foederalismus_card_aria_label')}
      data-testid="foederalismus-card-disclaimer"
      className="rounded-lg border border-amber-200 bg-amber-50/70 p-3 text-sm leading-relaxed text-amber-950 dark:border-amber-900/60 dark:bg-amber-900/20 dark:text-amber-100"
    >
      <p>{wrapNormZitate(t('foederalismus_card_disclaimer'))}</p>
    </aside>
  );
}
