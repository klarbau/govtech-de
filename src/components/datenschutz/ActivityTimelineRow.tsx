'use client';

import { useTranslations } from 'next-intl';
import { formatDistance, parseISO } from 'date-fns';
import { de as deLocale } from 'date-fns/locale';
import {
  ArrowLeftRight,
  Mail,
  ShieldCheck,
  Sparkles,
  type LucideIcon,
} from 'lucide-react';

import { IconCircle } from '@/components/shared/IconCircle';
import { StatusBadge, type StatusVariant } from '@/components/shared/StatusBadge';
import { wrapNormZitate } from '@/components/posteingang/wrapNormZitate';
import { formatDateDe } from '@/lib/utils';
import type { Behoerde, UebermittlungsLogEntry } from '@/types';

interface ActivityTimelineRowProps {
  entry: UebermittlungsLogEntry;
  behoerdenById: Record<string, Behoerde>;
  /** SSR-stable demo "now" für deterministische Relativ-Zeit. */
  nowIso: string;
}

type Kategorie = UebermittlungsLogEntry['kategorie'];

const KATEGORIE_ICON: Record<Kategorie, LucideIcon> = {
  behoerde_zu_behoerde: ArrowLeftRight,
  behoerde_zu_buerger: Mail,
  app_aktivitaet: ShieldCheck,
  speculative_2027: Sparkles,
};

const KATEGORIE_BADGE: Record<
  Kategorie,
  { variant: StatusVariant; labelKey: string }
> = {
  behoerde_zu_behoerde: { variant: 'laufend', labelKey: 'uebermittlung' },
  behoerde_zu_buerger: { variant: 'neu', labelKey: 'eingang' },
  app_aktivitaet: { variant: 'aktiv', labelKey: 'app' },
  speculative_2027: { variant: 'vorlage', labelKey: 'vision' },
};

/**
 * Eine Zeile der „Letzte Aktivitäten"-Timeline (Spec § 4.1). Über
 * `<ListRow>`-artiges Layout, aber als `<li>` mit `<time datetime>` für den
 * absoluten ISO-Wert. Der Typ steht als Text-Badge (nicht nur Farbe).
 */
export function ActivityTimelineRow({
  entry,
  behoerdenById,
  nowIso,
}: ActivityTimelineRowProps) {
  const tTyp = useTranslations('datenschutz.activity.typ');
  const tRoot = useTranslations();

  const Icon = KATEGORIE_ICON[entry.kategorie];
  const badge = KATEGORIE_BADGE[entry.kategorie];

  let title = entry.zweck_i18n_key;
  try {
    title = tRoot(entry.zweck_i18n_key);
  } catch {
    title = entry.zweck_i18n_key;
  }

  const partnerId = entry.empfaenger_id ?? entry.absender_behoerde_id;
  const subtitle = partnerId
    ? (behoerdenById[partnerId]?.name_de ?? undefined)
    : undefined;

  let relative = '';
  try {
    relative = formatDistance(parseISO(entry.timestamp), parseISO(nowIso), {
      locale: deLocale,
      addSuffix: true,
    });
  } catch {
    relative = formatDateDe(entry.timestamp);
  }

  return (
    <li className="flex items-start gap-3 py-3">
      <IconCircle icon={<Icon />} tone="neutral" size="md" />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-semibold text-text-primary">{title}</span>
          <StatusBadge variant={badge.variant}>{tTyp(badge.labelKey)}</StatusBadge>
        </div>
        {subtitle ? (
          <p className="truncate text-sm text-text-secondary">{subtitle}</p>
        ) : null}
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-text-muted">
          <span className="tabular-nums">{wrapNormZitate(entry.rechtsgrundlage)}</span>
          <time dateTime={entry.timestamp} className="tabular-nums">
            {relative}
          </time>
        </div>
      </div>
    </li>
  );
}
