'use client';

import { useTranslations } from 'next-intl';
import { format, parseISO } from 'date-fns';
import { de as deLocale } from 'date-fns/locale';
import { Check } from 'lucide-react';

import { SectionCard } from '@/components/shared/SectionCard';
import { IconCircle } from '@/components/shared/IconCircle';
import type { DiffBlock } from '@/types';

interface DiffStatProps {
  count: number;
  label: string;
  /** Success accent (green Check IconCircle) for the „Vorgang abgeschlossen"-Zähler. */
  success?: boolean;
}

function DiffStat({ count, label, success = false }: DiffStatProps) {
  return (
    <div className="flex flex-1 flex-col items-center gap-1 px-2 text-center">
      <div className="flex items-center gap-1.5">
        {success ? (
          <IconCircle icon={<Check />} tone="success" size="sm" />
        ) : null}
        <span className="text-3xl font-bold tabular-nums text-text-primary">
          {count}
        </span>
      </div>
      <span className="text-xs leading-tight text-text-secondary">{label}</span>
    </div>
  );
}

interface DiffStatCardProps {
  diff: DiffBlock;
}

/**
 * „Seit Ihrem letzten Login" — drei Diff-Zähler (neue Briefe / Frist näher /
 * Vorgang abgeschlossen) als Stat-Karte. Bei Erst-Login bzw. keinen Änderungen
 * werden statt der Zähler die jeweiligen Hinweis-Texte gezeigt. Jeder Zähler
 * trägt Zahl + Label im accessiblen Namen (nicht Farbe/Dot allein).
 */
export function DiffStatCard({ diff }: DiffStatCardProps) {
  const t = useTranslations('dashboard.diff');

  const isFirstLogin = diff.last_seen_at === undefined;
  const hasChanges = diff.total_changes > 0;

  const subtitle = isFirstLogin
    ? t('first_login')
    : diff.last_seen_at
      ? t('last_login_tooltip', {
          datum: format(parseISO(diff.last_seen_at), 'd. MMMM yyyy', {
            locale: deLocale,
          }),
        })
      : undefined;

  return (
    <section aria-labelledby="dashboard-diff-title" className="h-full">
      <SectionCard variant="soft" padding="md" className="h-full">
        <div className="mb-3">
          <h2
            id="dashboard-diff-title"
            className="text-base font-semibold text-text-primary"
          >
            {t('title')}
          </h2>
          {subtitle ? (
            <p className="mt-0.5 text-xs text-text-muted">{subtitle}</p>
          ) : null}
        </div>

        {isFirstLogin ? (
          <p className="text-sm text-text-secondary">{t('first_login')}</p>
        ) : !hasChanges ? (
          <p className="text-sm text-text-secondary">{t('no_changes')}</p>
        ) : (
          <div className="flex items-start justify-between gap-1">
            <DiffStat count={diff.neue_briefe} label={t('neue_briefe')} />
            <DiffStat
              count={diff.fristen_naeher_gerueckt}
              label={t('frist_naeher')}
            />
            <DiffStat
              count={diff.vorgaenge_abgeschlossen}
              label={t('vorgang_abgeschlossen')}
              success
            />
          </div>
        )}
      </SectionCard>
    </section>
  );
}
