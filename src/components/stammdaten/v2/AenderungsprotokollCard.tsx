'use client';

import Link from 'next/link';
import { Clock, Landmark, User, FileText } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { format, parseISO } from 'date-fns';
import { de as deLocale } from 'date-fns/locale';

import { IconCircle } from '@/components/shared/IconCircle';
import type { Behoerde } from '@/types';
import type { UebermittlungsLogEntry } from '@/types/stammdaten';

interface AenderungsprotokollCardProps {
  entries: UebermittlungsLogEntry[];
  behoerdenById: Record<string, Behoerde>;
  /** Maximum rows to render. Defaults to 6 for the right-rail card. */
  limit?: number;
  /**
   * When provided, the „show all" control opens the in-page full-log dialog via
   * this callback instead of linking to `/datenschutz`.
   */
  onShowAll?: () => void;
}

interface DerivedRow {
  id: string;
  title: string;
  sub: string;
  whenLine1: string;
  whenLine2: string;
  variant: 'landmark' | 'user' | 'monogram';
  monogram?: string;
  monogramTone?: 'success' | 'primary';
}

/**
 * Prototype-v2 — „Änderungsprotokoll" right-rail card (Spec § COL 3).
 *
 * Pulls from the existing `UebermittlungsLogEntry[]` stream, derives a single
 * title + sub + timestamp triplet per row, and shows a monogram or icon avatar
 * matching the prototype mockup (Landmark for Behörde-zu-Behörde, monogram for
 * named services, user-icon for app-internal activity).
 */
export function AenderungsprotokollCard({
  entries,
  behoerdenById,
  limit = 6,
  onShowAll,
}: AenderungsprotokollCardProps) {
  const t = useTranslations('stammdaten.v2.protokoll');
  const tRoot = useTranslations();
  const tLog = useTranslations('stammdaten.aktivitaet');

  const rows = entries.slice(0, limit).map((entry) =>
    deriveRow(entry, behoerdenById, tRoot, tLog),
  );

  return (
    <section
      aria-labelledby="v2-protokoll-title"
      className="rounded-[var(--radius-card)] border border-border bg-surface p-5 shadow-[var(--shadow-1)]"
      data-testid="v2-protokoll-card"
    >
      <header className="mb-1 flex items-center gap-2">
        <IconCircle icon={<Clock />} tone="neutral" size="sm" />
        <h2
          id="v2-protokoll-title"
          className="text-base font-semibold text-text-primary"
        >
          {t('title')}
        </h2>
      </header>
      <p className="mb-2 text-xs text-text-secondary">{t('subtitle')}</p>

      <ol className="flex flex-col" data-testid="v2-protokoll-list">
        {rows.length === 0 ? (
          <li className="py-3 text-sm text-text-secondary">{t('empty')}</li>
        ) : (
          rows.map((row, idx) => (
            <li
              key={row.id}
              className={`grid grid-cols-[40px_1fr_auto] items-start gap-3 py-3.5 ${idx > 0 ? 'border-t border-border' : ''}`}
              data-testid={`v2-protokoll-row-${row.id}`}
            >
              <RowAvatar row={row} />
              <div className="min-w-0">
                <p className="text-[13.5px] font-semibold text-text-primary">
                  {row.title}
                </p>
                <p className="whitespace-pre-line text-xs text-text-secondary">
                  {row.sub}
                </p>
              </div>
              <div className="text-right text-xs text-text-secondary tabular-nums">
                <p>{row.whenLine1}</p>
                <p>{row.whenLine2}</p>
              </div>
            </li>
          ))
        )}
      </ol>

      {onShowAll ? (
        <button
          type="button"
          onClick={onShowAll}
          data-testid="v2-protokoll-show-all"
          className="mt-3 inline-flex w-full min-h-9 items-center justify-center gap-2 rounded-md border border-border-strong bg-surface px-3 text-[0.8125rem] font-medium text-text-primary hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          <FileText aria-hidden="true" className="size-4" />
          {t('show_all')}
        </button>
      ) : (
        <Link
          href="/datenschutz"
          data-testid="v2-protokoll-show-all"
          className="mt-3 inline-flex w-full min-h-9 items-center justify-center gap-2 rounded-md border border-border-strong bg-surface px-3 text-[0.8125rem] font-medium text-text-primary hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          <FileText aria-hidden="true" className="size-4" />
          {t('show_all')}
        </Link>
      )}
    </section>
  );
}

function RowAvatar({ row }: { row: DerivedRow }) {
  if (row.variant === 'landmark') {
    return (
      <span
        aria-hidden="true"
        className="flex size-9 shrink-0 items-center justify-center rounded-full bg-surface-muted text-text-secondary [&_svg]:size-4"
      >
        <Landmark />
      </span>
    );
  }
  if (row.variant === 'user') {
    return (
      <span
        aria-hidden="true"
        className="flex size-9 shrink-0 items-center justify-center rounded-full bg-surface-muted text-text-secondary [&_svg]:size-4"
      >
        <User />
      </span>
    );
  }
  // monogram
  const toneClass =
    row.monogramTone === 'success'
      ? 'bg-success-soft text-success'
      : 'bg-primary text-primary-foreground';
  return (
    <span
      aria-hidden="true"
      className={`flex size-9 shrink-0 items-center justify-center rounded-full text-[10px] font-bold leading-tight ${toneClass}`}
    >
      {row.monogram}
    </span>
  );
}

function deriveRow(
  entry: UebermittlungsLogEntry,
  behoerdenById: Record<string, Behoerde>,
  tRoot: ReturnType<typeof useTranslations>,
  tLog: ReturnType<typeof useTranslations>,
): DerivedRow {
  let zweck: string;
  try {
    zweck = tRoot(entry.zweck_i18n_key);
  } catch {
    zweck = entry.zweck_i18n_key;
  }

  const absender =
    entry.absender_behoerde_id !== undefined
      ? behoerdenById[entry.absender_behoerde_id]
      : undefined;
  const empfaenger =
    entry.empfaenger_id !== undefined
      ? behoerdenById[entry.empfaenger_id]
      : undefined;

  let when1 = entry.timestamp;
  let when2 = '';
  try {
    const dt = parseISO(entry.timestamp);
    when1 = format(dt, 'dd.MM.yyyy', { locale: deLocale });
    when2 = format(dt, "HH:mm 'Uhr'", { locale: deLocale });
  } catch {
    // keep raw timestamp
  }

  // Variant + sub-line + title derivation:
  if (entry.kategorie === 'app_aktivitaet') {
    return {
      id: entry.id,
      title: zweck,
      sub: tLog('via_app'),
      whenLine1: when1,
      whenLine2: when2,
      variant: 'user',
    };
  }

  // Behörde-zu-Behörde / Behörde-zu-Bürger:in / 2027-Vision → use an avatar
  // derived from the most identifying side.
  const counterparty = empfaenger ?? absender;
  if (counterparty) {
    const mono = deriveMonogram(counterparty.name_de);
    const variant: DerivedRow['variant'] = mono.length <= 4 && mono.length >= 2 ? 'monogram' : 'landmark';
    const tone: DerivedRow['monogramTone'] = pickMonogramTone(counterparty);
    return {
      id: entry.id,
      title: zweck,
      sub: counterparty.name_de,
      whenLine1: when1,
      whenLine2: when2,
      variant,
      monogram: mono,
      monogramTone: tone,
    };
  }

  return {
    id: entry.id,
    title: zweck,
    sub: '',
    whenLine1: when1,
    whenLine2: when2,
    variant: 'landmark',
  };
}

function deriveMonogram(name: string): string {
  // Strip leading articles, take first letter of each word — capped at 4.
  const words = name.replace(/[—–-]/g, ' ').split(/\s+/).filter(Boolean);
  if (words.length === 0) return '?';
  if (words.length === 1) return words[0]!.slice(0, 3).toUpperCase();
  const letters = words.slice(0, 4).map((w) => w[0]!.toUpperCase());
  return letters.join('').slice(0, 4);
}

function pickMonogramTone(b: Behoerde): 'success' | 'primary' {
  // Krankenkassen / Pflegekassen / Sozial-Versicherer → green; everything else → cobalt.
  if (
    b.kategorie === 'sozialversicherung' ||
    /aok|tk|barmer|dak|krankenkasse|pflegekasse/i.test(b.name_de)
  ) {
    return 'success';
  }
  return 'primary';
}
