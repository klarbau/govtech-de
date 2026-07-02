'use client';

import { useTranslations } from 'next-intl';
import { CheckCircle2 } from 'lucide-react';

import { IconCircle } from '@/components/shared/IconCircle';
import { ZukunftChip } from '@/components/shared/ZukunftChip';
import type { AnspruchLaneEntry } from '@/types';

interface AnspruchLaneRowProps {
  entry: AnspruchLaneEntry;
}

/**
 * `<AnspruchLaneRow>` (Spec `anspruch-arc.md` § 4.2, Beat b) — der kompakte
 * „Eingerichtet"-Eintrag (NUR antragsloses Kindergeld).
 *
 * HARTE INVARIANTE (§ 6): „Eingerichtet" für einen Regierungsentwurf ist nur mit
 * dem [ZUKUNFT 2027]-Chip UND der Phasing-Zeile vertretbar — beide rendern hier
 * unbedingt (nie „wird gezahlt"). Der Status-Unterschied ist Text
 * („Eingerichtet"), nicht nur Tönung.
 */
export function AnspruchLaneRow({ entry }: AnspruchLaneRowProps) {
  const t = useTranslations('anspruchLane');
  const kind = entry.kind_name ?? '';

  return (
    <div className="flex items-start gap-2.5 rounded-xl border border-border bg-surface p-3">
      <IconCircle icon={<CheckCircle2 />} tone="success" size="sm" />
      <div className="flex flex-col gap-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-semibold text-text-primary">
            {t(entry.titel_i18n_key.replace('anspruchLane.', ''), { kind })}
          </span>
          <ZukunftChip label={t('kindergeld.zukunft_chip')} />
        </div>
        <span className="text-xs text-text-secondary">{t('kindergeld.status')}</span>
        <span className="text-xs text-text-muted">
          {t(entry.foederal_label_i18n_key.replace('anspruchLane.', ''))} ·{' '}
          {t('kindergeld.phasing')}
        </span>
      </div>
    </div>
  );
}
