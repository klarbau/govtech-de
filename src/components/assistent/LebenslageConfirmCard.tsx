'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { Baby, Clock, Landmark, ShieldCheck } from 'lucide-react';

import { BehoerdenBadge } from '@/components/shared/BehoerdenBadge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { IconCircle } from '@/components/shared/IconCircle';

import type { LebenslageProposal } from './types';

interface LebenslageConfirmCardProps {
  proposal: LebenslageProposal;
  /** Resolve a behoerde_id to its display name; falls back to the id. */
  behoerdeName: (id: string) => string;
  onConfirm: () => void;
  onCancel: () => void;
  /** True while `starte_lebenslage` is dispatching. */
  busy?: boolean;
}

/**
 * `<LebenslageConfirmCard>` — the confirm-gate for an antragslose Lebenslagen-
 * Kaskade (currently only Kindergeld). Analogous to `<UmzugConfirmCard>` but a
 * SEPARATE component (Spec § 5.3): no address / Stichtag / Block-B, but a
 * [ZUKUNFT 2027] + Verfahrensstand chip and a masked-IBAN CONFIRMATION line the
 * Umzug card has no place for. `starte_lebenslage` is dispatched only on confirm.
 */
export function LebenslageConfirmCard({
  proposal,
  behoerdeName,
  onConfirm,
  onCancel,
  busy = false,
}: LebenslageConfirmCardProps) {
  const t = useTranslations('assistent.lebenslage_confirm');
  const titleId = React.useId();

  const resolved = proposal.resolution !== undefined;
  const { beteiligteBehoerden, zukunft, maskedIban } = proposal;

  return (
    <div className="flex gap-3">
      <IconCircle
        icon={<Baby aria-hidden="true" />}
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
          <h3 id={titleId} className="text-base font-semibold text-text-primary">
            {t('title')}
          </h3>
          <p className="mt-1 text-sm text-text-secondary">{t('subtitle')}</p>
        </div>

        {zukunft ? (
          <div className="flex flex-wrap items-center gap-2">
            <span
              data-testid="lebenslage-zukunft-chip"
              className="inline-flex items-center rounded-md bg-surface-muted px-2 py-0.5 text-xs font-medium text-text-secondary"
            >
              {t('zukunft_chip')}
            </span>
            <span className="inline-flex items-center gap-1 rounded-md bg-surface-muted px-2 py-0.5 text-xs font-medium text-text-secondary">
              <Clock className="size-3" aria-hidden="true" />
              {t('verfahrensstand_chip')}
            </span>
          </div>
        ) : null}

        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-muted">
            {t('behoerden_label')}
          </p>
          {beteiligteBehoerden.length === 0 ? (
            <p className="text-sm text-text-muted">{t('behoerden_leer')}</p>
          ) : (
            <ul className="space-y-1.5">
              {beteiligteBehoerden.map((id) => (
                <li key={id}>
                  <BehoerdenBadge name={behoerdeName(id)} />
                </li>
              ))}
            </ul>
          )}
        </div>

        {maskedIban ? (
          <div className="rounded-md bg-surface-muted p-3">
            <p className="flex items-start gap-2 text-xs text-text-secondary">
              <Landmark
                className="mt-0.5 size-4 shrink-0 text-text-muted"
                aria-hidden="true"
              />
              <span>
                <span className="font-medium tabular-nums text-text-primary">
                  {maskedIban}
                </span>{' '}
                {t('iban_auszahlen')}
              </span>
            </p>
          </div>
        ) : null}

        <p className="flex items-start gap-2 rounded-md bg-surface-muted p-3 text-xs text-text-secondary">
          <ShieldCheck
            className="mt-0.5 size-4 shrink-0 text-text-muted"
            aria-hidden="true"
          />
          <span>{t('mock_note')}</span>
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
