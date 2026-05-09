import { getTranslations } from 'next-intl/server';
import { ArrowRight } from 'lucide-react';

import type { Adresse } from '@/types';

interface AdresseDiffProps {
  alt?: Adresse;
  neu: Adresse;
}

function formatAdresse(a: Adresse): string {
  const line1 = [a.strasse, a.hausnummer, a.zusatz].filter(Boolean).join(' ');
  const line2 = [a.plz, a.ort].filter(Boolean).join(' ');
  return `${line1}, ${line2}`;
}

export async function AdresseDiff({ alt, neu }: AdresseDiffProps) {
  const t = await getTranslations('umzug.detail');

  return (
    <dl className="grid gap-3 sm:grid-cols-[auto_auto_1fr] sm:items-start">
      <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {t('adresse_alt')}
      </dt>
      <dd className="sm:col-span-2 text-sm text-muted-foreground line-through">
        {alt ? formatAdresse(alt) : '—'}
      </dd>
      <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {t('adresse_neu')}
      </dt>
      <dd className="flex items-center gap-2 text-sm font-medium text-foreground sm:col-span-2">
        <ArrowRight className="size-3.5 text-primary" aria-hidden="true" />
        <span>{formatAdresse(neu)}</span>
      </dd>
    </dl>
  );
}
