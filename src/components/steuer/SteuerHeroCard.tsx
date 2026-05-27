import { useTranslations } from 'next-intl';
import {
  Baby,
  FileText,
  HeartPulse,
  Landmark,
  type LucideIcon,
} from 'lucide-react';

import { Card } from '@/components/ui/card';
import { StatusBadge } from '@/components/shared/StatusBadge';
import type { SteuerDatenquelle, SteuerUebersicht } from '@/types';

import { DatenquelleTile } from './DatenquelleTile';

interface SteuerHeroCardProps {
  uebersicht: SteuerUebersicht;
  /** Behörde-ID → Klartext-Name (für Datenquellen-Herkunft). */
  behoerdeName: (id: string) => string;
}

/** Quellen-Icons je i18n-Key (deterministisch, kein Farb-State). */
const QUELLE_ICON: Record<string, LucideIcon> = {
  'steuer.quelle.lohnsteuer': FileText,
  'steuer.quelle.kind': Baby,
  'steuer.quelle.krankenkasse': HeartPulse,
  'steuer.quelle.bekannt': Landmark,
};

const euroFormatter = new Intl.NumberFormat('de-DE', {
  style: 'currency',
  currency: 'EUR',
});

function formatCent(cent: number): string {
  return euroFormatter.format(cent / 100);
}

/** Resolves the human herkunft: a Behörde-ID maps to its name, otherwise verbatim. */
function herkunftText(
  quelle: SteuerDatenquelle,
  behoerdeName: (id: string) => string,
): string {
  const resolved = behoerdeName(quelle.herkunft);
  return resolved === quelle.herkunft ? quelle.herkunft : resolved;
}

export function SteuerHeroCard({ uebersicht, behoerdeName }: SteuerHeroCardProps) {
  const t = useTranslations('steuer.hero');
  const tRoot = useTranslations();

  const isErstattung = uebersicht.voraussichtliche_erstattung_cent >= 0;
  const betragText = formatCent(
    Math.abs(uebersicht.voraussichtliche_erstattung_cent),
  );
  const label = isErstattung ? t('erstattung_label') : t('nachzahlung_label');
  const ariaLabel = isErstattung
    ? t('erstattung_aria', { betrag: betragText })
    : t('nachzahlung_aria', { betrag: betragText });

  return (
    <Card className="gap-5 p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold text-text-primary">
          {t('steuerjahr', { jahr: uebersicht.steuerjahr })}
        </h2>
        <StatusBadge variant="vorlage">{t('entwurf_badge')}</StatusBadge>
      </div>

      <div>
        <p className="text-sm text-text-secondary">{label}</p>
        <p
          aria-label={ariaLabel}
          className={amountClassName(isErstattung)}
        >
          {isErstattung ? '' : '−'}
          {betragText}
        </p>
      </div>

      <div>
        <p className="mb-3 text-sm font-medium text-text-secondary">
          {t('datenquellen_label')}
        </p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {uebersicht.datenquellen.map((quelle) => (
            <DatenquelleTile
              key={quelle.id}
              icon={QUELLE_ICON[quelle.label_i18n_key] ?? FileText}
              label={tRoot(quelle.label_i18n_key)}
              herkunft={herkunftText(quelle, behoerdeName)}
            />
          ))}
        </div>
      </div>
    </Card>
  );
}

function amountClassName(isErstattung: boolean): string {
  return [
    'mt-1 text-3xl font-bold tabular-nums md:text-4xl',
    isErstattung ? 'text-success' : 'text-danger',
  ].join(' ');
}
