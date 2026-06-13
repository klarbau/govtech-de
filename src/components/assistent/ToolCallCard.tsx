'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import {
  AlertCircle,
  ArrowRight,
  Check,
  Loader2,
  Wrench,
} from 'lucide-react';
import { useReducedMotion } from 'framer-motion';

import { InlineCascade } from '@/components/autopilot/InlineCascade';
import {
  LaufzettelPanel,
  OrchestrationTestBridge,
  RecoveryBanner,
} from '@/components/orchestration';
import { IconCircle } from '@/components/shared/IconCircle';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { cn } from '@/lib/utils';

import type { ChatToolCall } from './types';

interface ToolCallCardProps {
  call: ChatToolCall;
}

const TOOL_LABEL_KEYS: Record<string, string> = {
  starte_umzug: 'starte_umzug',
  preview_umzug: 'preview_umzug',
  lese_posteingang: 'lese_posteingang',
  hole_vorgang: 'hole_vorgang',
  hole_profil: 'hole_profil',
  liste_termine: 'liste_termine',
  erklaere_brief: 'erklaere_brief',
  extrahiere_frist: 'extrahiere_frist',
  vorschlage_naechsten_schritt: 'vorschlage_naechsten_schritt',
};

export function ToolCallCard({ call }: ToolCallCardProps) {
  const t = useTranslations('assistent.tool');
  const reduceMotion = useReducedMotion();

  const labelKey = TOOL_LABEL_KEYS[call.name];
  const label = labelKey ? t(`label.${labelKey}`) : call.name;
  const isUmzugStart = call.name === 'starte_umzug' && call.status === 'done';

  const tone =
    call.status === 'error'
      ? 'danger'
      : call.status === 'done'
        ? 'success'
        : 'primary';

  const icon =
    call.status === 'error' ? (
      <AlertCircle aria-hidden="true" />
    ) : call.status === 'done' ? (
      <Check aria-hidden="true" />
    ) : (
      <Wrench aria-hidden="true" />
    );

  return (
    <div className="flex gap-3" role="status">
      <span className="size-7 shrink-0" aria-hidden="true" />
      <div className="flex max-w-[85%] flex-1 flex-col gap-2 rounded-lg border border-border bg-surface px-4 py-3">
        <div className="flex items-center gap-3">
          <IconCircle icon={icon} tone={tone} size="sm" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-text-primary">
              {isUmzugStart ? t('umzug_started') : label}
            </p>
            {call.resultSummary ? (
              <p className="truncate text-xs text-text-muted">
                {call.resultSummary}
              </p>
            ) : null}
          </div>
          {call.status === 'running' ? (
            <span className="inline-flex items-center gap-1.5 text-xs text-text-muted">
              <Loader2
                className={cn('size-3.5', !reduceMotion && 'animate-spin')}
                aria-hidden="true"
              />
              {t('running')}
            </span>
          ) : call.status === 'error' ? (
            <StatusBadge variant="abgelaufen">{t('failed')}</StatusBadge>
          ) : (
            <StatusBadge variant="bestaetigt">{t('done')}</StatusBadge>
          )}
        </div>
        {isUmzugStart && call.vorgangId ? (
          <>
            <OrchestrationTestBridge />
            <RecoveryBanner sagaId={call.vorgangId} />
            <InlineCascade vorgangId={call.vorgangId} variant="live" />
            {/* Resilient Orchestration Engine (Spec § 6.1): the Laufzettel travels
                with the in-thread cascade — additive, collapsible, never weakening
                the hero rows above. sagaId === vorgangId (§ 5.1). */}
            <LaufzettelPanel sagaId={call.vorgangId} variant="inline" />
            <Link
              href={`/vorgaenge/umzug/run?vorgangId=${encodeURIComponent(call.vorgangId)}`}
              className="inline-flex items-center gap-1 self-start text-sm font-medium text-primary hover:text-primary-hover"
            >
              {t('cta_kaskade')}
              <ArrowRight className="size-4 rtl:-scale-x-100" aria-hidden="true" />
            </Link>
          </>
        ) : null}
      </div>
    </div>
  );
}
