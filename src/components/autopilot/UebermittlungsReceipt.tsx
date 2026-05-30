'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { ChevronDown, ShieldCheck } from 'lucide-react';

import { cn } from '@/lib/utils';

interface UebermittlungsReceiptProps {
  /** Eindeutige ID für aria-controls (z. B. step.id). */
  id: string;
  /** Datenkategorien dieses Hops (§1.1) — Schlüssel in `convenience.datenkat.*`. */
  datenkategorien: string[];
  /** Norm-Tag des Schritts (z. B. "§ 19 AO i.V.m. § 36 BMG"). */
  rechtsgrundlage: string;
  /** ISO-Timestamp der erteilten Einwilligung (nur Block B). */
  consentGivenAt?: string;
  className?: string;
}

/**
 * `<UebermittlungsReceipt>` (§B4) — pro-Behörde-Disclosure „Was wurde
 * übermittelt, an wen, auf welcher Rechtsgrundlage?". Datenminimierung sichtbar
 * (G8). `<button aria-expanded controls>` steuert ein `role="region"`-Panel;
 * collapsed by default (§14).
 */
export function UebermittlungsReceipt({
  id,
  datenkategorien,
  rechtsgrundlage,
  consentGivenAt,
  className,
}: UebermittlungsReceiptProps) {
  const t = useTranslations('convenience.receipt');
  const tKat = useTranslations('convenience.datenkat');
  const [open, setOpen] = React.useState(false);
  const panelId = `uebermittlung-${id}`;

  const labelFor = (key: string): string => {
    try {
      return tKat(key);
    } catch {
      return key;
    }
  };

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
        className="inline-flex w-fit items-center gap-1.5 rounded-md text-xs font-medium text-[var(--brand-600)] hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand-600)]"
      >
        <ShieldCheck className="size-3.5" aria-hidden="true" />
        {t('toggle')}
        <ChevronDown
          className={cn('size-3.5 transition-transform', open && 'rotate-180')}
          aria-hidden="true"
        />
      </button>

      {open ? (
        <div
          id={panelId}
          role="region"
          aria-label={t('toggle')}
          className="flex flex-col gap-2 rounded-lg border border-[var(--line)] bg-[var(--surface-2)] p-3 text-xs"
        >
          <div>
            <div className="font-medium text-[var(--ink-2)]">
              {t('fields_label')}
            </div>
            <ul className="mt-1 flex flex-wrap gap-1.5">
              {datenkategorien.map((key) => (
                <li
                  key={key}
                  className="rounded-full bg-[var(--surface-1)] px-2 py-0.5 text-[var(--ink-2)] ring-1 ring-inset ring-[var(--line)]"
                >
                  {labelFor(key)}
                </li>
              ))}
            </ul>
          </div>

          <div>
            <span className="font-medium text-[var(--ink-2)]">
              {t('basis_label')}:{' '}
            </span>
            <span className="text-[var(--ink-3)]">{rechtsgrundlage}</span>
          </div>

          {consentGivenAt ? (
            <div>
              <span className="font-medium text-[var(--ink-2)]">
                {t('consent_label')}:{' '}
              </span>
              <time dateTime={consentGivenAt} className="text-[var(--ink-3)]">
                {formatDe(consentGivenAt)}
              </time>
            </div>
          ) : null}

          <p className="text-[var(--ink-3)]">{t('minimierung_note')}</p>
        </div>
      ) : null}
    </div>
  );
}

function formatDe(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  return `${day}.${month}.${d.getFullYear()}`;
}
