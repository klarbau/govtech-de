import { useTranslations } from 'next-intl';
import { Home } from 'lucide-react';

import { wrapNormZitate } from '@/components/posteingang/wrapNormZitate';
import { cn } from '@/lib/utils';

import { UmzugBridgeBadge } from './UmzugBridgeBadge';

export interface HalterAdresseView {
  strasse: string;
  hausnummer: string;
  plz: string;
  ort: string;
  /**
   * VL-13 — Übergangs-Marker bei Umzug-Bridge. true = `<UmzugBridgeBadge>`
   * rendert; bei false → sync_status_known.
   */
  uebergangs_marker_via_umzug: boolean;
}

interface HalterAdresseFieldCardProps {
  adresse: HalterAdresseView;
  className?: string;
}

/**
 * `<HalterAdresseFieldCard>` (Spec § 4.1 / VL-13 / HL-MOB-4).
 *
 * Separate Card für die Halter-Anschrift (eine pro Persona, deckt alle
 * Fahrzeuge gleichen Halters ab). Bei aktivem Umzug-Bridge-Marker rendert
 * `<UmzugBridgeBadge>` mit verbatim-Wortlaut; sonst sync_status_known.
 *
 * Disclaimer-Marker `kfz_halter_adresse_speculative` als Card-Footer.
 */
export function HalterAdresseFieldCard({
  adresse,
  className,
}: HalterAdresseFieldCardProps) {
  const t = useTranslations('stammdaten.field_card.halter_adresse');
  const tDisclaimer = useTranslations('stammdaten.disclaimer');

  return (
    <article
      aria-labelledby="halter-adresse-card-title"
      className={cn(
        'flex flex-col gap-3 rounded-xl border border-border bg-card p-4 shadow-sm',
        className,
      )}
      data-testid="halter-adresse-field-card"
    >
      <header className="flex items-center gap-2">
        <Home className="size-4 text-muted-foreground" aria-hidden="true" />
        <h3
          id="halter-adresse-card-title"
          className="text-sm font-semibold tracking-tight text-foreground"
        >
          {t('title')}
        </h3>
      </header>

      <address className="not-italic text-sm text-foreground">
        <span className="block">
          {t('label_strasse_hausnummer', {
            strasse: adresse.strasse,
            hausnummer: adresse.hausnummer,
          })}
        </span>
        <span className="block">
          {t('label_plz_ort', {
            plz: adresse.plz,
            ort: adresse.ort,
          })}
        </span>
      </address>

      {adresse.uebergangs_marker_via_umzug ? (
        <UmzugBridgeBadge />
      ) : (
        <p className="text-xs text-muted-foreground">
          {wrapNormZitate(t('sync_status_known'))}
        </p>
      )}

      <p className="text-[11px] leading-relaxed text-muted-foreground border-t border-dashed border-border pt-2">
        {wrapNormZitate(tDisclaimer('kfz_halter_adresse_speculative'))}
      </p>
    </article>
  );
}
