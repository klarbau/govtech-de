'use client';

import { Shield, Pencil, PiggyBank, ChevronRight, PlusCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';
import { IconCircle } from '@/components/shared/IconCircle';
import { Badge } from '@/components/ui/badge';

interface VersicherungVorsorgeCardProps {
  /** GKV/PKV-Träger + KVNR. */
  krankenkasse?: { traegerName: string; kvnr?: string };
  /** Altersvorsorge-Subtitle (z. B. „Gesetzliche Rentenversicherung · Versichert seit 12.05.2015"). */
  altersvorsorgeTraeger?: string;
  altersvorsorgeSeitIso?: string;
}

/**
 * Prototype-v2 — „Versicherung & Vorsorge" card (Spec § COL 2.3).
 *
 * Lightweight read-only summary of KV + Renten. Detailed editing happens in
 * the secondary row sections (`<KvPflegeSektion>` / `<AltersvorsorgeSektion>`)
 * which remain mounted below the 3-column grid.
 */
export function VersicherungVorsorgeCard({
  krankenkasse,
  altersvorsorgeTraeger,
  altersvorsorgeSeitIso,
}: VersicherungVorsorgeCardProps) {
  const t = useTranslations('stammdaten.v2.versicherung');
  const tCta = useTranslations('stammdaten.cta');

  const hasContent = Boolean(krankenkasse) || Boolean(altersvorsorgeTraeger);

  return (
    <section
      aria-labelledby="v2-versicherung-title"
      className="rounded-[var(--radius-card)] border border-border bg-surface p-5 shadow-[var(--shadow-1)]"
      data-testid="v2-versicherung-card"
    >
      <header className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <IconCircle icon={<Shield />} tone="neutral" size="sm" />
          <h2
            id="v2-versicherung-title"
            className="text-base font-semibold text-text-primary"
          >
            {t('title')}
          </h2>
        </div>
        <Button type="button" variant="outline" size="sm">
          <Pencil aria-hidden="true" />
          {tCta('bearbeiten')}
        </Button>
      </header>

      <ul className="flex flex-col">
        {krankenkasse ? (
          <li
            className="flex items-center gap-3 py-2.5"
            data-testid="v2-vorsorge-row-kv"
          >
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-success-soft text-success text-[11px] font-semibold uppercase">
              {deriveMonogram(krankenkasse.traegerName)}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13.5px] font-medium text-text-primary">
                {t('krankenkasse')}
              </p>
              <p className="truncate text-xs text-text-secondary tabular-nums">
                {krankenkasse.traegerName}
                {krankenkasse.kvnr
                  ? ` · ${t('versichertennummer', { nr: krankenkasse.kvnr })}`
                  : ''}
              </p>
            </div>
            <Badge variant="success" size="sm">
              {t('aktiv')}
            </Badge>
            <ChevronRight aria-hidden="true" className="size-3.5 text-text-muted" />
          </li>
        ) : null}

        {altersvorsorgeTraeger ? (
          <li
            className={`flex items-center gap-3 py-2.5 ${krankenkasse ? 'border-t border-border' : ''}`}
            data-testid="v2-vorsorge-row-rente"
          >
            <span className="flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-accent-soft text-primary [&_svg]:size-4">
              <PiggyBank />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13.5px] font-medium text-text-primary">
                {t('altersvorsorge')}
              </p>
              <p className="truncate text-xs text-text-secondary">
                {altersvorsorgeTraeger}
                {altersvorsorgeSeitIso
                  ? ` · ${t('versichert_seit', { datum: formatSeit(altersvorsorgeSeitIso) })}`
                  : ''}
              </p>
            </div>
            <Badge variant="success" size="sm">
              {t('aktiv')}
            </Badge>
            <ChevronRight aria-hidden="true" className="size-3.5 text-text-muted" />
          </li>
        ) : null}

        {!hasContent ? (
          <li className="py-3 text-sm text-text-secondary">{t('empty')}</li>
        ) : null}
      </ul>

      <button
        type="button"
        className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline focus-visible:underline"
      >
        <PlusCircle aria-hidden="true" className="size-3.5" />
        {t('add_link')}
      </button>
    </section>
  );
}

function deriveMonogram(name: string): string {
  // First word's first 3 letters (e.g. "AOK Nordost" → "AOK", "DAK-Gesundheit" → "DAK").
  const first = name.split(/[\s-]+/)[0] ?? name;
  return first.slice(0, 3).toUpperCase();
}

function formatSeit(iso: string): string {
  // Pre-formatted via toLocaleDateString if the caller passes a YYYY-MM-DD
  // — keep tabular-num formatting at the caller for full date format. Here we
  // re-use the dd.MM.yyyy form via dynamic import-free parsing.
  try {
    const [y, m, d] = iso.split('-');
    if (y && m && d) return `${d}.${m}.${y}`;
    return iso;
  } catch {
    return iso;
  }
}
