'use client';

import * as React from 'react';
import { Network, ArrowRight } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { de as deLocale } from 'date-fns/locale';

import { IconCircle } from '@/components/shared/IconCircle';
import { wrapNormZitate } from '@/components/posteingang/wrapNormZitate';
import type { Behoerde } from '@/types';
import type { UebermittlungsLogEntry } from '@/types/stammdaten';
import {
  deriveRegisterNodes,
  type RegisterNodeModel,
  type RegisterNodeStatus,
} from './register-map';

interface OnceOnlyRegisterPanelProps {
  behoerden: Behoerde[];
  behoerdenById: Record<string, Behoerde>;
  log: UebermittlungsLogEntry[];
  onOpenFullLog: () => void;
}

const STATUS_DOT: Record<RegisterNodeStatus, string> = {
  synchronisiert: 'bg-success',
  angebunden: 'bg-text-muted',
  in_anbindung: 'bg-warning',
};

const STATUS_KEY: Record<RegisterNodeStatus, string> = {
  synchronisiert: 'status_synchronisiert',
  angebunden: 'status_angebunden',
  in_anbindung: 'status_in_anbindung',
};

/**
 * Band 3 — the Once-Only „wow" (Stammdaten V3).
 *
 * A brand-50 sovereignty band: Once-Only headline + node-grounded register
 * count, a wrap-row of register-node chips (status dot derived from real log
 * activity, status word in the aria-label so it is never color-only), and a
 * 3-row „Letzte Synchronisation" snapshot of the Übermittlungslog with honest
 * §§ via `wrapNormZitate`. No fake live ticker. Owns
 * `<h2 id="sd-onceonly-title">`.
 */
export function OnceOnlyRegisterPanel({
  behoerden,
  behoerdenById,
  log,
  onOpenFullLog,
}: OnceOnlyRegisterPanelProps) {
  const t = useTranslations('stammdaten.once_only');

  const { nodes, count } = React.useMemo(
    () => deriveRegisterNodes({ behoerden, log }),
    [behoerden, log],
  );

  const feed = React.useMemo(
    () =>
      log
        .filter(
          (e) =>
            e.kategorie === 'behoerde_zu_behoerde' ||
            e.kategorie === 'behoerde_zu_buerger',
        )
        .slice(0, 3),
    [log],
  );

  return (
    <section
      aria-labelledby="sd-onceonly-title"
      className="mt-5 rounded-[var(--radius-card)] border border-brand-100 bg-brand-50 p-5 dark:border-white/10 dark:bg-[var(--brand-50)] sm:p-6"
    >
      <header className="flex items-center gap-2">
        <IconCircle icon={<Network />} tone="primary" size="sm" />
        <h2
          id="sd-onceonly-title"
          className="text-base font-semibold text-text-primary"
        >
          {t('region_title')}
        </h2>
      </header>
      <p className="mt-1 text-sm text-text-secondary">{t('summary', { count })}</p>

      <ul role="list" className="mt-4 flex flex-wrap gap-2">
        {nodes.map((node) => (
          <RegisterNodeChip key={node.id} node={node} />
        ))}
      </ul>

      <div className="mt-5 border-t border-brand-100 pt-4 dark:border-white/10">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
          {t('feed_title')}
        </h3>

        {feed.length === 0 ? (
          <p className="mt-2 text-sm text-text-secondary">{t('feed_empty')}</p>
        ) : (
          <ol className="mt-2">
            {feed.map((entry, idx) => {
              const absender = entry.absender_behoerde_id
                ? (behoerdenById[entry.absender_behoerde_id]?.name_de ?? '—')
                : '—';
              const empfaenger = entry.empfaenger_id
                ? (behoerdenById[entry.empfaenger_id]?.name_de ??
                  entry.empfaenger_id)
                : '—';
              let zeit = '—';
              try {
                zeit = formatDistanceToNow(parseISO(entry.timestamp), {
                  locale: deLocale,
                  addSuffix: true,
                });
              } catch {
                zeit = '—';
              }
              return (
                <li
                  key={entry.id}
                  className={`flex items-start justify-between gap-4 py-3 ${idx > 0 ? 'border-t border-brand-100 dark:border-white/10' : ''}`}
                >
                  <div className="min-w-0">
                    <p className="flex min-w-0 items-center gap-1.5 text-sm font-medium text-text-primary">
                      <span className="min-w-0 flex-1 truncate">{absender}</span>
                      <ArrowRight
                        aria-hidden="true"
                        className="size-3.5 shrink-0 text-text-muted rtl:-scale-x-100"
                      />
                      <span className="min-w-0 flex-1 truncate">{empfaenger}</span>
                    </p>
                    <p className="mt-0.5 text-xs leading-relaxed text-text-secondary">
                      {wrapNormZitate(entry.rechtsgrundlage)}
                    </p>
                  </div>
                  <span className="shrink-0 whitespace-nowrap text-xs text-text-secondary">
                    {zeit}
                  </span>
                </li>
              );
            })}
          </ol>
        )}

        <button
          type="button"
          onClick={onOpenFullLog}
          className="mt-3 inline-flex min-h-11 items-center text-sm font-medium text-primary hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring dark:text-[var(--brand-700)]"
        >
          {t('show_all')}
        </button>
      </div>

      <p className="mt-4 text-xs text-text-secondary">{t('pilot_note')}</p>
    </section>
  );
}

function RegisterNodeChip({ node }: { node: RegisterNodeModel }) {
  const t = useTranslations('stammdaten.once_only');
  const register = t(node.labelKey);
  const status = t(STATUS_KEY[node.status]);
  return (
    <li
      aria-label={t('node_aria', { register, status })}
      className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1.5 text-[13px] font-medium text-text-primary"
    >
      <span
        aria-hidden="true"
        className={`size-1.5 rounded-full ${STATUS_DOT[node.status]}`}
      />
      {register}
    </li>
  );
}
