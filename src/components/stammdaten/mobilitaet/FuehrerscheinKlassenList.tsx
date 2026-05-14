'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { format, parseISO } from 'date-fns';
import { de as deLocale } from 'date-fns/locale';
import { ChevronDown } from 'lucide-react';

import { cn } from '@/lib/utils';

import { SchluesselzahlTooltip } from './SchluesselzahlTooltip';

export interface FeKlasseView {
  klasse: string;
  /** ISO-Date YYYY-MM-DD. */
  erteilt_am: string;
  /** ISO-Date YYYY-MM-DD; undefined = unbefristet (B/AM/L/T). */
  gueltig_bis?: string;
  /** Schlüsselzahlen aus Anlage 9 FeV, z. B. ['95']. */
  schluesselzahlen: string[];
}

interface FuehrerscheinKlassenListProps {
  klassen: FeKlasseView[];
  /** Default-collapsed; ein Toggle öffnet die volle Liste. */
  defaultOpen?: boolean;
  className?: string;
}

/**
 * `<FuehrerscheinKlassenList>` (Spec § 4.1 / § 7.3).
 *
 * Native `<details>` / `<summary>`-Disclosure für volle Tastatur-/SR-Support
 * (Pattern aus `<StammdatenSektion>`). Pro Klasse: Klassen-Code +
 * Erteilungs-/Ablaufdatum + Schlüsselzahlen-Pills (Anlage 9 FeV) mit Tooltip.
 */
export function FuehrerscheinKlassenList({
  klassen,
  defaultOpen = false,
  className,
}: FuehrerscheinKlassenListProps) {
  const t = useTranslations('stammdaten.mobilitaet.fe');
  const [open, setOpen] = React.useState(defaultOpen);

  return (
    <details
      open={open}
      onToggle={(e) => setOpen((e.currentTarget as HTMLDetailsElement).open)}
      className={cn(
        'group rounded-lg border border-border bg-card',
        className,
      )}
      data-testid="fe-klassen-list"
    >
      <summary
        className={cn(
          'flex cursor-pointer list-none items-center justify-between gap-2 px-3 py-2 marker:hidden',
          '[&::-webkit-details-marker]:hidden',
          'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring rounded-lg text-sm font-medium text-foreground',
        )}
      >
        <span>
          {open
            ? t('klassen_disclosure_expanded')
            : t('klassen_disclosure_collapsed')}
        </span>
        <ChevronDown
          aria-hidden="true"
          className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180"
        />
      </summary>
      <ul className="flex flex-col gap-2 border-t border-border px-3 py-3">
        {klassen.map((k) => (
          <li
            key={k.klasse + k.erteilt_am}
            className="flex flex-col gap-1 rounded-md border border-dashed border-border bg-muted/30 p-2"
            data-testid={`fe-klasse-${k.klasse}`}
          >
            <div className="flex flex-wrap items-baseline gap-2">
              <span className="text-sm font-semibold text-foreground">
                {t('klasse_label', { klasse: k.klasse })}
              </span>
              <span className="text-xs text-muted-foreground">
                {t('klasse_erteilt_label', {
                  datum: formatIso(k.erteilt_am),
                })}
              </span>
              <span className="text-xs text-muted-foreground">
                ·{' '}
                {k.gueltig_bis
                  ? t('klasse_gueltig_bis_label', {
                      datum: formatIso(k.gueltig_bis),
                    })
                  : t('klasse_gueltig_unbefristet')}
              </span>
            </div>
            {k.schluesselzahlen.length > 0 ? (
              <div
                className="flex flex-wrap items-center gap-1.5"
                role="group"
                aria-label={t('schluesselzahlen_legend')}
              >
                <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  {t('schluesselzahlen_legend')}:
                </span>
                {k.schluesselzahlen.map((code) => (
                  <SchluesselzahlTooltip
                    key={code}
                    code={code}
                  />
                ))}
              </div>
            ) : (
              <p className="text-[11px] text-muted-foreground">
                {t('schluesselzahl_keine')}
              </p>
            )}
          </li>
        ))}
      </ul>
    </details>
  );
}

function formatIso(iso: string): string {
  try {
    return format(parseISO(iso), 'dd.MM.yyyy', { locale: deLocale });
  } catch {
    return iso;
  }
}
