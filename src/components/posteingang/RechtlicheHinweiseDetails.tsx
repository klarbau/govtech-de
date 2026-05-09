import { useTranslations } from 'next-intl';

import { cn } from '@/lib/utils';

interface RechtlicheHinweiseDetailsProps {
  className?: string;
}

/**
 * Konsolidiertes `<details>` für `posteingang.disclaimer.opening` +
 * `posteingang.disclaimer.no_legal_advice`. Default closed. Spec § 12 (V1.5)
 * superseded V1 § 12 lines 1086 + 1088: beide Wordings bleiben verbatim und
 * sind beide im selben `<details>` lesbar — die Visible-by-Default-Pflicht
 * für `opening` ist explizit aufgehoben.
 *
 * Hard-line: dieses `<details>` enthält **nicht** den `[MOCK]`-Watermark und
 * **nicht** den `original_authoritative`-Banner — diese beiden bleiben
 * always-visible (Truthfulness-Anchor; Verifier #B2 #5).
 */
export function RechtlicheHinweiseDetails({
  className,
}: RechtlicheHinweiseDetailsProps) {
  const t = useTranslations('posteingang.disclaimer');

  // Key lebt unter `posteingang.disclaimer.rechtliche_hinweise_summary`;
  // ein früheres Lookup in `posteingang.reader.*` hat die literal Key-Pfad-
  // Zeichenkette gerendert (a11y-issue #9, 2026-05-09).
  const summary = t('rechtliche_hinweise_summary');

  return (
    <details
      className={cn(
        'rounded-lg border border-border bg-muted/40 px-3 py-2 text-xs',
        className,
      )}
    >
      <summary className="cursor-pointer font-medium text-foreground">
        {summary}
      </summary>
      <div className="mt-3 flex flex-col gap-3 text-muted-foreground">
        <section aria-labelledby="rh-opening-heading" className="flex flex-col gap-1">
          <h3
            id="rh-opening-heading"
            className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground"
          >
            {t('opening_title')}
          </h3>
          <p className="whitespace-pre-line leading-relaxed">{t('opening')}</p>
        </section>
        <section
          aria-labelledby="rh-no-legal-heading"
          className="flex flex-col gap-1"
        >
          <h3
            id="rh-no-legal-heading"
            className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground"
          >
            {t('no_legal_advice_title')}
          </h3>
          <p className="whitespace-pre-line leading-relaxed">
            {t('no_legal_advice')}
          </p>
        </section>
      </div>
    </details>
  );
}
