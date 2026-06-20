'use client';

import { Home, Pencil, Check } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { format, parseISO } from 'date-fns';
import { de as deLocale } from 'date-fns/locale';

import { Button } from '@/components/ui/button';
import { IconCircle } from '@/components/shared/IconCircle';
import { Badge } from '@/components/ui/badge';
import type { Adresse } from '@/types/adresse';

interface AnschriftCardProps {
  adresse: Adresse;
  /**
   * ISO timestamp of the most recent confirmation in the Übermittlungslog
   * (anschrift sektion, kategorie behoerde_zu_behoerde). Falls back to the
   * persona's seed date when no log entry exists.
   */
  zuletztBestaetigtIso?: string;
  onEdit?: () => void;
}

/**
 * Prototype-v2 — „Anschrift" card (Spec § COL 2.1).
 */
export function AnschriftCard({
  adresse,
  zuletztBestaetigtIso,
  onEdit,
}: AnschriftCardProps) {
  const t = useTranslations('stammdaten.v2.anschrift');
  const land = adresse.land === 'DE' || !adresse.land ? 'Deutschland' : adresse.land;
  const bestaetigt = zuletztBestaetigtIso
    ? formatDe(zuletztBestaetigtIso)
    : null;

  return (
    <section
      aria-labelledby="v2-anschrift-title"
      className="rounded-[var(--radius-card)] border border-border bg-surface p-5 shadow-[var(--shadow-1)]"
      data-testid="v2-anschrift-card"
    >
      <header className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <IconCircle icon={<Home />} tone="neutral" size="sm" />
          <h2
            id="v2-anschrift-title"
            className="text-base font-semibold text-text-primary"
          >
            {t('title')}
          </h2>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={onEdit}>
          <Pencil aria-hidden="true" />
          {t('aendern')}
        </Button>
      </header>

      <p className="text-xs text-text-secondary">{t('aktuell_label')}</p>
      <p className="mt-1 text-sm font-medium leading-relaxed text-text-primary">
        {adresse.strasse} {adresse.hausnummer}
        <br />
        {adresse.plz} {adresse.ort}
        <br />
        {land}
      </p>

      <div className="mt-3 flex items-center justify-between gap-3 border-t border-border pt-3">
        <span className="text-xs text-text-secondary">
          {bestaetigt
            ? t('zuletzt_bestaetigt', { datum: bestaetigt })
            : t('zuletzt_bestaetigt_unbekannt')}
        </span>
        <Badge variant="success" size="sm" leadingIcon={<Check />}>
          {t('bestaetigt')}
        </Badge>
      </div>
    </section>
  );
}

function formatDe(iso: string): string {
  try {
    return format(parseISO(iso), 'dd.MM.yyyy', { locale: deLocale });
  } catch {
    return iso;
  }
}
