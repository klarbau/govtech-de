'use client';

import * as React from 'react';
import { useFormatter, useTranslations } from 'next-intl';
import { Home, ShieldCheck } from 'lucide-react';

import { BehoerdenBadge } from '@/components/shared/BehoerdenBadge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { IconCircle } from '@/components/shared/IconCircle';

import type { UmzugProposal } from './types';

interface UmzugConfirmCardProps {
  proposal: UmzugProposal;
  /** Resolve a behoerde_id to its display name; falls back to the id. */
  behoerdeName: (id: string) => string;
  onConfirm: () => void;
  onCancel: () => void;
  /** True while `starte_umzug` is dispatching. */
  busy?: boolean;
}

interface BlockSpec {
  key: 'a' | 'b' | 'c' | 'd';
  ids: string[];
}

export function UmzugConfirmCard({
  proposal,
  behoerdeName,
  onConfirm,
  onCancel,
  busy = false,
}: UmzugConfirmCardProps) {
  const t = useTranslations('assistent.umzug_confirm');
  const format = useFormatter();
  const titleId = React.useId();

  const resolved = proposal.resolution !== undefined;
  const { neue_adresse, stichtag, preview } = proposal;

  const adresseLine = [
    `${neue_adresse.strasse} ${neue_adresse.hausnummer}`,
    neue_adresse.zusatz,
    `${neue_adresse.plz} ${neue_adresse.ort}`,
  ]
    .filter(Boolean)
    .join(', ');

  const stichtagDate = new Date(stichtag);
  const stichtagLabel = Number.isNaN(stichtagDate.getTime())
    ? stichtag
    : format.dateTime(stichtagDate, {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });

  const blocks: BlockSpec[] = [
    { key: 'a', ids: preview.block_a.map((s) => s.behoerde_id) },
    { key: 'b', ids: preview.block_b.map((s) => s.behoerde_id) },
    { key: 'c', ids: preview.block_c.map((s) => s.id) },
    { key: 'd', ids: preview.block_d.map((s) => s.behoerde_id) },
  ];

  return (
    <div className="flex gap-3">
      <IconCircle
        icon={<Home aria-hidden="true" />}
        tone="primary"
        size="sm"
        className="mt-0.5"
      />
      <Card
        role="group"
        aria-labelledby={titleId}
        className="max-w-[90%] flex-1 gap-4 border-border p-5"
      >
        <div>
          <h3
            id={titleId}
            className="text-base font-semibold text-text-primary"
          >
            {t('title')}
          </h3>
          <p className="mt-1 text-sm text-text-secondary">{t('subtitle')}</p>
        </div>

        <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <dt className="text-xs font-medium text-text-muted">
              {t('neue_adresse')}
            </dt>
            <dd className="text-sm text-text-primary tabular-nums">
              {adresseLine}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-text-muted">
              {t('stichtag')}
            </dt>
            <dd className="text-sm text-text-primary tabular-nums">
              {stichtagLabel}
            </dd>
          </div>
        </dl>

        <div className="space-y-4">
          {blocks.map((block) => (
            <BlockGroup
              key={block.key}
              label={t(`empfaenger_${block.key}`)}
              emptyLabel={t('empfaenger_leer')}
              ids={block.ids}
              behoerdeName={behoerdeName}
            />
          ))}
        </div>

        <p className="flex items-start gap-2 rounded-md bg-surface-muted p-3 text-xs text-text-secondary">
          <ShieldCheck
            className="mt-0.5 size-4 shrink-0 text-text-muted"
            aria-hidden="true"
          />
          <span>{t('consent_note')}</span>
        </p>

        {resolved ? (
          <p className="text-sm font-medium text-text-secondary">
            {proposal.resolution === 'cancelled'
              ? t('cancelled')
              : t('cta_start')}
          </p>
        ) : (
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button onClick={onConfirm} disabled={busy}>
              {t('cta_start')}
            </Button>
            <Button variant="outline" onClick={onCancel} disabled={busy}>
              {t('cta_cancel')}
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}

function BlockGroup({
  label,
  emptyLabel,
  ids,
  behoerdeName,
}: {
  label: string;
  emptyLabel: string;
  ids: string[];
  behoerdeName: (id: string) => string;
}) {
  return (
    <div>
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-muted">
        {label}
      </p>
      {ids.length === 0 ? (
        <p className="text-sm text-text-muted">{emptyLabel}</p>
      ) : (
        <ul className="space-y-1.5">
          {ids.map((id) => (
            <li key={id}>
              <BehoerdenBadge name={behoerdeName(id)} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
