'use client';

import {
  ChevronRight,
  Globe,
  IdCard as IdCardIcon,
  PlusCircle,
  Settings,
  Fingerprint,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { format, parseISO } from 'date-fns';
import { de as deLocale } from 'date-fns/locale';

import { Button } from '@/components/ui/button';
import { IconCircle } from '@/components/shared/IconCircle';
import { Badge } from '@/components/ui/badge';

interface DokumenteCardProps {
  reisepass?: { nummer: string; gueltigBisIso: string };
  personalausweis?: { nummer: string; gueltigBisIso: string };
  aufenthaltstitel?: { norm: string; gueltigBisIso: string };
  eatCan?: string;
  onEdit?: () => void;
}

/**
 * Prototype-v2 — „Identitätsdokumente" card (Spec § COL 2.2).
 *
 * Renders Reisepass / Personalausweis / Aufenthaltstitel / eAT-CAN depending on
 * which fields the Persona / Stammdaten exposes. Each row is a flat list-item
 * with a small icon-square, title + sub-line, status badge and chevron.
 */
export function DokumenteCard({
  reisepass,
  personalausweis,
  aufenthaltstitel,
  eatCan,
  onEdit,
}: DokumenteCardProps) {
  const t = useTranslations('stammdaten.v2.dokumente');

  const rows: Array<{
    key: string;
    icon: ReactNode;
    title: string;
    sub: string;
    badge: string;
  }> = [];

  if (reisepass) {
    rows.push({
      key: 'reisepass',
      icon: <Globe />,
      title: t('reisepass'),
      sub: t('nummer_template', {
        nummer: reisepass.nummer,
        gueltig_bis: formatDe(reisepass.gueltigBisIso),
      }),
      badge: t('gueltig'),
    });
  }
  if (personalausweis) {
    rows.push({
      key: 'personalausweis',
      icon: <IdCardIcon />,
      title: t('personalausweis'),
      sub: t('nummer_template', {
        nummer: personalausweis.nummer,
        gueltig_bis: formatDe(personalausweis.gueltigBisIso),
      }),
      badge: t('gueltig'),
    });
  }
  if (aufenthaltstitel) {
    rows.push({
      key: 'aufenthaltstitel',
      icon: <IdCardIcon />,
      title: t('aufenthaltstitel'),
      sub: t('aufenthaltstitel_template', {
        norm: aufenthaltstitel.norm,
        gueltig_bis: formatDe(aufenthaltstitel.gueltigBisIso),
      }),
      badge: t('gueltig'),
    });
  }
  if (eatCan) {
    rows.push({
      key: 'eat_can',
      icon: <Fingerprint />,
      title: t('eat_can'),
      sub: t('eat_can_template', { can: eatCan }),
      badge: t('gueltig'),
    });
  }

  return (
    <section
      aria-labelledby="v2-dokumente-title"
      className="rounded-[var(--radius-card)] border border-border bg-surface p-5 shadow-[var(--shadow-1)]"
      data-testid="v2-dokumente-card"
    >
      <header className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <IconCircle icon={<IdCardIcon />} tone="neutral" size="sm" />
          <h2
            id="v2-dokumente-title"
            className="text-base font-semibold text-text-primary"
          >
            {t('title')}
          </h2>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={onEdit}>
          <Settings aria-hidden="true" />
          {t('verwalten')}
        </Button>
      </header>

      <ul className="flex flex-col">
        {rows.length === 0 ? (
          <li className="py-3 text-sm text-text-secondary">{t('empty')}</li>
        ) : (
          rows.map((row, idx) => (
            <li
              key={row.key}
              className={`flex items-center gap-3 py-2.5 ${idx > 0 ? 'border-t border-border' : ''}`}
              data-testid={`v2-doc-row-${row.key}`}
            >
              <span className="flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-accent-soft text-primary [&_svg]:size-4">
                {row.icon}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13.5px] font-medium text-text-primary">
                  {row.title}
                </p>
                <p className="truncate text-xs text-text-secondary tabular-nums">
                  {row.sub}
                </p>
              </div>
              <Badge variant="success" size="sm">
                {row.badge}
              </Badge>
              <ChevronRight
                aria-hidden="true"
                className="size-3.5 shrink-0 text-text-muted"
              />
            </li>
          ))
        )}
      </ul>

      <a
        href="/dokumente"
        className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline focus-visible:underline"
      >
        <PlusCircle aria-hidden="true" className="size-3.5" />
        {t('add_link')}
      </a>
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
