'use client';

import { useTranslations } from 'next-intl';
import { CalendarClock, CalendarPlus, Landmark, MapPin } from 'lucide-react';

import { formatDateDe, formatTimeDe } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { IconCircle } from '@/components/shared/IconCircle';
import { StatusBadge } from '@/components/shared/StatusBadge';
import type { StatusVariant } from '@/components/shared/StatusBadge';
import type { Termin, TerminStatus } from '@/types';

const STATUS_TO_VARIANT: Record<TerminStatus, StatusVariant> = {
  gebucht: 'bestaetigt',
  bestaetigt: 'bestaetigt',
  abgesagt: 'abgeschlossen',
};

interface NaechsterTerminCardProps {
  termin: Termin;
  behoerdeName: string;
  statusLabel: string;
  onIcsExport: () => void;
  onDetails: () => void;
}

/**
 * Hervorgehobene Card für den nächsten Termin: Behörde, Betreff, Datum/Uhrzeit,
 * Adresse, Buchungsreferenz, Status-Badge und ICS-/Details-Aktionen.
 */
export function NaechsterTerminCard({
  termin,
  behoerdeName,
  statusLabel,
  onIcsExport,
  onDetails,
}: NaechsterTerminCardProps) {
  const t = useTranslations('termine');

  return (
    <Card className="gap-4 border-primary/30 bg-accent-soft p-5">
      <div className="flex items-start gap-3">
        <IconCircle icon={<Landmark aria-hidden="true" />} tone="primary" size="lg" />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-sm text-text-secondary">{behoerdeName}</p>
              <h3 className="text-base font-semibold text-text-primary">
                {termin.betreff}
              </h3>
            </div>
            <StatusBadge variant={STATUS_TO_VARIANT[termin.status]}>
              {statusLabel}
            </StatusBadge>
          </div>

          <dl className="mt-3 space-y-1.5 text-sm text-text-primary">
            <div className="flex items-center gap-2">
              <CalendarClock className="size-4 shrink-0 text-text-secondary" aria-hidden="true" />
              <dt className="sr-only">{t('card.details')}</dt>
              <dd className="tabular-nums" dir="ltr">
                {formatDateDe(termin.datum)} · {formatTimeDe(termin.datum)}
              </dd>
            </div>
            <div className="flex items-start gap-2">
              <MapPin className="mt-0.5 size-4 shrink-0 text-text-secondary" aria-hidden="true" />
              <dt className="sr-only">{t('ort.praesenz')}</dt>
              <dd className="text-text-secondary">{termin.ort.details}</dd>
            </div>
            {termin.buchungsreferenz ? (
              <div className="text-text-secondary">
                <dt className="sr-only">{t('card.buchungsreferenz', { ref: '' }).trim()}</dt>
                <dd className="tabular-nums" dir="ltr">
                  {t('card.buchungsreferenz', { ref: termin.buchungsreferenz })}
                </dd>
              </div>
            ) : null}
          </dl>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={onIcsExport}
          aria-label={t('card.ics_aria', { betreff: termin.betreff })}
        >
          <CalendarPlus aria-hidden="true" />
          {t('card.ics')}
        </Button>
        <Button type="button" onClick={onDetails}>
          {t('card.details')}
        </Button>
      </div>
    </Card>
  );
}
