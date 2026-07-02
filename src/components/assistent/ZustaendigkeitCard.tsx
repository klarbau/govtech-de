'use client';

import { useTranslations } from 'next-intl';
import { Scale } from 'lucide-react';

import { BehoerdenBadge } from '@/components/shared/BehoerdenBadge';
import type { ZustaendigkeitTreffer } from '@/lib/ai/zustaendigkeit';

interface ZustaendigkeitCardProps {
  treffer: ZustaendigkeitTreffer;
}

/**
 * Read-only Zuständigkeits-Card (wow-backlog #15). Docks under the
 * `finde_zustaendige_stelle` ToolCallCard and names the ONE resolved Behörde.
 *
 * HARD RULE (verbindlich): das Framing ist „Zuständig ist X (, nicht Y)" bzw.
 * „Zuständig wäre X; dorthin würde Ihre Anfrage geleitet" — die Card impliziert
 * NIEMALS eine reale Weiterleitung. Rechtsgrundlage on-screen: § 25 VwVfG
 * (Beratungs- und Auskunftspflicht); [MOCK]-Konvention des Threads respektiert.
 */
export function ZustaendigkeitCard({ treffer }: ZustaendigkeitCardProps) {
  const t = useTranslations('assistent.zustaendigkeit');

  return (
    <div className="mt-1 flex flex-col gap-2 border-t border-border pt-3">
      <span className="text-xs font-medium uppercase tracking-wide text-text-muted">
        {t('zustaendig_ist')}
      </span>
      <BehoerdenBadge
        name={treffer.name}
        kategorie={treffer.ebene}
        showKategorie
        kategorieLabel={t(`kategorie.${treffer.ebene}`)}
      />
      <p className="text-sm text-text-secondary">{t(`thema.${treffer.thema}`)}</p>
      <div className="flex flex-col gap-1 rounded-md bg-surface-muted px-3 py-2 text-xs text-text-muted">
        <span className="inline-flex items-center gap-1.5">
          <Scale className="size-3.5 shrink-0" aria-hidden="true" />
          {t('rechtsgrundlage_label')}: {t('rechtsgrundlage')}
        </span>
        <span>{t('hinweis')}</span>
        <span>{t('mock')}</span>
      </div>
    </div>
  );
}
