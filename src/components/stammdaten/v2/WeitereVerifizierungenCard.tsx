'use client';

import { BadgeCheck, Fingerprint, Landmark, CheckCircle2 } from 'lucide-react';
import type { ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { format, parseISO } from 'date-fns';
import { de as deLocale } from 'date-fns/locale';

import { IconCircle } from '@/components/shared/IconCircle';
import { Badge } from '@/components/ui/badge';

interface WeitereVerifizierungenCardProps {
  steuerId?: string;
  sozialversicherungsnummer?: string;
  /** Stable ISO date of the last verification (deterministic — no `new Date()`). */
  verifiziertAmIso?: string;
}

/**
 * Green-bento — „Weitere Verifizierungen" card (Spec § 5.3).
 *
 * Two verified-identifier rows (Steuer-ID, Sozialversicherungsnummer) with a
 * green „Verifiziert" badge each, mirroring the `DokumenteCard` row layout.
 * The verified date is a stable `[MOCK]` value passed by the view.
 */
export function WeitereVerifizierungenCard({
  steuerId,
  sozialversicherungsnummer,
  verifiziertAmIso,
}: WeitereVerifizierungenCardProps) {
  const t = useTranslations('stammdaten.v2.weitere');

  const verifiziertAm = verifiziertAmIso ? formatDe(verifiziertAmIso) : null;
  const rows: Array<{ key: string; icon: ReactNode; title: string; value: string }> =
    [];

  if (steuerId) {
    rows.push({
      key: 'steuer_id',
      icon: <Landmark />,
      title: t('steuer_id'),
      value: steuerId,
    });
  }
  if (sozialversicherungsnummer) {
    rows.push({
      key: 'sozialversicherungsnummer',
      icon: <Fingerprint />,
      title: t('sozialversicherungsnummer'),
      value: sozialversicherungsnummer,
    });
  }

  return (
    <section
      aria-labelledby="v2-weitere-title"
      className="rounded-[var(--radius-card)] border border-border bg-surface p-5 shadow-[var(--shadow-1)]"
      data-testid="v2-weitere-card"
    >
      <header className="mb-3 flex items-center gap-2">
        <IconCircle icon={<BadgeCheck />} tone="neutral" size="sm" />
        <h2
          id="v2-weitere-title"
          className="text-base font-semibold text-text-primary"
        >
          {t('title')}
        </h2>
      </header>

      <ul className="flex flex-col">
        {rows.map((row, idx) => (
          <li
            key={row.key}
            className={`flex items-center gap-3 py-2.5 ${idx > 0 ? 'border-t border-border' : ''}`}
            data-testid={`v2-weitere-row-${row.key}`}
          >
            <span className="flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-accent-soft text-primary [&_svg]:size-4">
              {row.icon}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13.5px] font-medium text-text-primary">
                {row.title}
              </p>
              <p className="truncate text-xs text-text-secondary tabular-nums">
                {row.value}
                {verifiziertAm
                  ? ` · ${t('verifiziert_am', { datum: verifiziertAm })}`
                  : ''}
              </p>
            </div>
            <Badge variant="success" size="sm" leadingIcon={<CheckCircle2 />}>
              {t('verifiziert_badge')}
            </Badge>
          </li>
        ))}
      </ul>

      <a
        href="/datenschutz"
        className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline focus-visible:underline"
      >
        {t('alle_anzeigen')}
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
