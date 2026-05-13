import { useTranslations } from 'next-intl';

/**
 * `<PersonaSelbststaendigCaveat>` — Spec § 6.4.B + Hard-Line § 11.41.
 *
 * Conditional Disclaimer-Block, der nur für Personas mit
 * `beschaeftigung.typ === 'selbstaendig'` (Mehmet) gerendert wird.
 * Caller entscheidet conditional-render; diese Komponente trägt nur
 * den Wortlaut. Marker `bundid_email_selbststaendig_caveat`.
 */
export function PersonaSelbststaendigCaveat() {
  const t = useTranslations('stammdaten.kontakt.email');

  return (
    <p
      className="rounded-md border-l-2 border-amber-400 bg-amber-50/60 px-3 py-2 text-xs leading-relaxed text-amber-900 dark:border-amber-700 dark:bg-amber-900/20 dark:text-amber-100"
      data-disclaimer-marker="bundid_email_selbststaendig_caveat"
      data-testid="persona-selbststaendig-caveat"
    >
      {t('disclaimer_selbststaendig')}
    </p>
  );
}
