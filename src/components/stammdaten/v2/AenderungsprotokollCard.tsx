'use client';

import Link from 'next/link';
import {
  Clock,
  CheckCircle2,
  FileText,
  Home,
  IdCard,
  Landmark,
  Lock,
  Mail,
  PiggyBank,
  ShieldCheck,
  Sparkles,
  Tv,
  User,
  Users,
  type LucideIcon,
} from 'lucide-react';
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
}

interface DerivedRow {
  id: string;
  title: string;
  sub: string;
  whenLine1: string;
  whenLine2: string;
  /** Semantic lucide icon for the event (by recipient kind / section / activity). */
  Icon: LucideIcon;
  /** `success` → green circle (Kranken-/Sozialversicherung); else neutral. */
  tone: 'neutral' | 'success';
}

/**
 * Prototype-v2 — „Änderungsprotokoll" right-rail card (Spec § COL 3).
 *
 * Pulls from the existing `UebermittlungsLogEntry[]` stream and renders one
 * title + sub + timestamp triplet per row. Each row gets a SEMANTIC icon derived
 * from the event: the receiving authority's kind (Rundfunk → TV, Finanzamt →
 * Landmark, Krankenkasse → green check, Standesamt → Users, Ausweis-Stelle →
 * IdCard …), falling back to the affected Stammdaten-section, and a section/app
 * icon for self-service activity (Brief → Mail, Dokument → FileText). Replaces
 * the earlier generic monogram/landmark avatars.
 */
export function AenderungsprotokollCard({
  entries,
  behoerdenById,
  limit = 6,
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
      <header className="mb-1 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <IconCircle icon={<Clock />} tone="neutral" size="sm" />
          <h2
            id="v2-protokoll-title"
            className="text-base font-semibold text-text-primary"
          >
            {t('title')}
          </h2>
        </div>
        <Link
          href="/datenschutz"
          data-testid="v2-protokoll-alle-anzeigen"
          className="text-sm font-medium text-primary hover:underline focus-visible:underline"
        >
          {t('alle_anzeigen')}
        </Link>
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
              <RowAvatar Icon={row.Icon} tone={row.tone} />
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

      <Link
        href="/datenschutz"
        data-testid="v2-protokoll-show-all"
        className="mt-3 inline-flex w-full min-h-9 items-center justify-center gap-2 rounded-md border border-border-strong bg-surface px-3 text-[0.8125rem] font-medium text-text-primary hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        <FileText aria-hidden="true" className="size-4" />
        {t('show_all')}
      </Link>
    </section>
  );
}

function RowAvatar({ Icon, tone }: { Icon: LucideIcon; tone: DerivedRow['tone'] }) {
  const toneClass =
    tone === 'success'
      ? 'bg-success-soft text-success'
      : 'bg-surface-muted text-text-secondary';
  return (
    <span
      aria-hidden="true"
      className={`flex size-9 shrink-0 items-center justify-center rounded-full ${toneClass} [&_svg]:size-4`}
    >
      <Icon />
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

  const { Icon, tone } = resolveRowVisual(entry, empfaenger ?? absender);

  // App-internal self-service activity → "via App" sub-line.
  if (entry.kategorie === 'app_aktivitaet') {
    return {
      id: entry.id,
      title: zweck,
      sub: tLog('via_app'),
      whenLine1: when1,
      whenLine2: when2,
      Icon,
      tone,
    };
  }

  // Behörde-zu-Behörde / -Bürger:in → name the most identifying counterparty.
  const counterparty = empfaenger ?? absender;
  return {
    id: entry.id,
    title: zweck,
    sub: counterparty?.name_de ?? '',
    whenLine1: when1,
    whenLine2: when2,
    Icon,
    tone,
  };
}

/**
 * Map an entry to a semantic icon + tone. Order of preference:
 * 1. self-service activity → by field/zweck (Brief, Dokument, Einwilligung, KI),
 * 2. the receiving/sending authority's kind (most recognisable),
 * 3. the affected Stammdaten section.
 * Only Kranken-/Sozialversicherung gets the green `success` tone — matching the
 * mockup's single green „Krankenkasse"-check among otherwise neutral icons.
 */
function resolveRowVisual(
  entry: UebermittlungsLogEntry,
  counterparty: Behoerde | undefined,
): { Icon: LucideIcon; tone: DerivedRow['tone'] } {
  if (entry.kategorie === 'app_aktivitaet') {
    const f = entry.field_id ?? '';
    const z = entry.zweck_i18n_key;
    if (f.includes('letter') || z.includes('brief') || z.includes('email'))
      return { Icon: Mail, tone: 'neutral' };
    if (z.includes('ki')) return { Icon: Sparkles, tone: 'neutral' };
    if (f.includes('dokument') || z.includes('dokument'))
      return { Icon: FileText, tone: 'neutral' };
    if (f.includes('einwilligung') || f.includes('datenschutz') || z.includes('einwilligung'))
      return { Icon: ShieldCheck, tone: 'neutral' };
    return { Icon: User, tone: 'neutral' };
  }

  const name = (counterparty?.name_de ?? '').toLowerCase();
  const kat = counterparty?.kategorie;

  if (kat === 'sozialversicherung' || /aok|barmer|dak|kranken|pflege|\btk\b/.test(name))
    return { Icon: CheckCircle2, tone: 'success' };
  if (/beitragsservice|rundfunk|ard|zdf/.test(name))
    return { Icon: Tv, tone: 'neutral' };
  if (/finanzamt|steuer|körperschaft|koerperschaft/.test(name))
    return { Icon: Landmark, tone: 'neutral' };
  if (/standesamt/.test(name)) return { Icon: Users, tone: 'neutral' };
  if (/druckerei|ausweis|pass\b/.test(name)) return { Icon: IdCard, tone: 'neutral' };
  if (/ausländer|auslaender/.test(name)) return { Icon: IdCard, tone: 'neutral' };
  if (/bürgeramt|buergeramt|bezirksamt|melde|einwohner/.test(name))
    return { Icon: Home, tone: 'neutral' };

  switch (entry.sektion) {
    case 'anschrift':
      return { Icon: Home, tone: 'neutral' };
    case 'dokumente':
      return { Icon: IdCard, tone: 'neutral' };
    case 'familie':
      return { Icon: Users, tone: 'neutral' };
    case 'altersvorsorge':
      return { Icon: PiggyBank, tone: 'neutral' };
    case 'krankenversicherung_pflege':
      return { Icon: CheckCircle2, tone: 'success' };
    case 'sperren_einstellungen':
      return { Icon: Lock, tone: 'neutral' };
    case 'identitaet':
      return { Icon: User, tone: 'neutral' };
    default:
      return { Icon: Clock, tone: 'neutral' };
  }
}
