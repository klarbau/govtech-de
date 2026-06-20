'use client';

import { useTranslations } from 'next-intl';
import { Check, ChevronRight } from 'lucide-react';

import { cn } from '@/lib/utils';

const MRZ_WIDTH = 30;

/** Letters that Unicode NFD does not decompose into ASCII + combining mark. */
const MRZ_LETTER_MAP: Record<string, string> = {
  ß: 'SS',
  Æ: 'AE',
  Ø: 'O',
  Ð: 'D',
  Þ: 'TH',
  Ł: 'L',
  ı: 'I',
  İ: 'I',
};

/** Folds one already-uppercased token to bare ASCII letters for the MRZ. */
function foldToAscii(token: string): string {
  let out = '';
  for (const ch of token) {
    if (MRZ_LETTER_MAP[ch] !== undefined) {
      out += MRZ_LETTER_MAP[ch];
      continue;
    }
    const stripped = ch.normalize('NFD').replace(/[̀-ͯ]/g, '');
    out += stripped.replace(/[^A-Z]/g, '');
  }
  return out;
}

/**
 * Builds a machine-readable-zone-style identity line for a credential card, e.g.
 * `IDD<<PETROV<<ANNA<<<<<<<<<<<<`. Decorative: surname then given name, folded
 * to bare ASCII, joined and padded with `<` to a fixed width. Not a valid ICAO
 * MRZ — a recognizable detail only.
 */
export function formatMrz(name: string): string {
  const parts = name.trim().toUpperCase().split(/\s+/).filter(Boolean);
  const surname = foldToAscii(parts.length > 1 ? parts[parts.length - 1] : parts[0] ?? '');
  const given = foldToAscii(parts.slice(0, -1).join('<<')) || foldToAscii(parts[0] ?? '');
  const core = `IDD<<${surname}<<${given}`;
  return core.length >= MRZ_WIDTH
    ? core.slice(0, MRZ_WIDTH)
    : core + '<'.repeat(MRZ_WIDTH - core.length);
}

/** Black/red/gold horizontal flag stripe. Decorative — the non-infringing nod. */
function FlagMark({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'inline-flex h-[11px] w-4 flex-col overflow-hidden rounded-[2px] ring-1 ring-black/10',
        className,
      )}
    >
      <span className="flex-1 bg-[#000000]" />
      <span className="flex-1 bg-[#DD0000]" />
      <span className="flex-1 bg-[#FFCE00]" />
    </span>
  );
}

/** Gold contact-chip glyph with inner divider lines. Decorative. */
function ChipGlyph({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'relative inline-flex h-[22px] w-7 items-center justify-center rounded-[3px] bg-amber-300 ring-1 ring-amber-500/40',
        className,
      )}
    >
      <span className="absolute inset-x-1 top-1.5 h-px bg-amber-600/50" />
      <span className="absolute inset-x-1 top-1/2 h-px -translate-y-1/2 bg-amber-600/50" />
      <span className="absolute inset-x-1 bottom-1.5 h-px bg-amber-600/50" />
      <span className="absolute left-1/2 top-1 h-[14px] w-px -translate-x-1/2 bg-amber-600/40" />
    </span>
  );
}

interface EidCredentialCardBaseProps {
  name: string;
}

interface EidCredentialHeroProps extends EidCredentialCardBaseProps {
  variant: 'hero';
  nationality: string;
  birthYear: string;
}

interface EidCredentialSelectProps extends EidCredentialCardBaseProps {
  variant: 'select';
  descriptor: string;
  selected?: boolean;
  onClick: () => void;
}

type EidCredentialCardProps = EidCredentialHeroProps | EidCredentialSelectProps;

/**
 * A credible digital-ID credential rendered as a real artifact — flag stripe,
 * gold chip, MRZ line, honest `[MOCK]` stamp. No gradients/glow/glass: the
 * authenticity is document detailing, not effect.
 *
 * - `hero`: full dark credential, the visual anchor of the transparency screen.
 * - `select`: a light, scannable credential row that reads as one ID in a rack.
 */
export function EidCredentialCard(props: EidCredentialCardProps) {
  const t = useTranslations('onboarding.eid_card');

  if (props.variant === 'select') {
    return <EidCredentialSelect {...props} mockLabel={t('mock')} />;
  }

  return (
    <EidCredentialHero
      {...props}
      kindLabel={t('kind')}
      subtitle={t('subtitle')}
      mockLabel={t('mock')}
    />
  );
}

function EidCredentialHero({
  name,
  nationality,
  birthYear,
  kindLabel,
  subtitle,
  mockLabel,
}: EidCredentialHeroProps & {
  kindLabel: string;
  subtitle: string;
  mockLabel: string;
}) {
  const mrz = formatMrz(name);

  return (
    <div className="relative overflow-hidden rounded-xl bg-slate-900 p-5 text-white shadow-sm ring-1 ring-white/10 sm:p-6">
      <span aria-hidden="true" className="absolute inset-x-0 top-0 h-px bg-primary/60" />

      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1.5">
          <FlagMark />
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white">
            {kindLabel}
          </p>
          <p className="text-xs text-zinc-300">{subtitle}</p>
        </div>
        <ChipGlyph />
      </div>

      <p className="mt-4 text-xl font-semibold tracking-wide text-white">{name}</p>
      <p className="mt-1 text-sm text-zinc-300">
        {nationality} · geb. {birthYear}
      </p>

      <div className="mt-5 flex items-end justify-between gap-4">
        <p
          aria-hidden="true"
          className="min-w-0 flex-1 truncate font-mono text-xs tracking-[0.2em] text-zinc-400"
          dir="ltr"
        >
          {mrz}
        </p>
        <span className="shrink-0 -rotate-6 rounded border border-amber-300/70 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-widest text-amber-300">
          {mockLabel}
        </span>
      </div>
    </div>
  );
}

function EidCredentialSelect({
  name,
  descriptor,
  selected = false,
  onClick,
  mockLabel,
}: EidCredentialSelectProps & { mockLabel: string }) {
  const mrz = formatMrz(name);

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        'relative flex w-full min-h-[44px] items-center gap-3 overflow-hidden rounded-lg border bg-surface py-3 pe-4 ps-5 text-start transition-colors',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary',
        selected
          ? 'border-primary bg-accent-soft'
          : 'border-border hover:border-border-strong hover:bg-surface-muted',
      )}
    >
      <span
        aria-hidden="true"
        className="absolute inset-y-0 start-0 flex w-1 flex-col overflow-hidden rounded-s-lg"
      >
        <span className="flex-1 bg-[#000000]" />
        <span className="flex-1 bg-[#DD0000]" />
        <span className="flex-1 bg-[#FFCE00]" />
      </span>

      <ChipGlyph className="shrink-0" />

      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="truncate text-base font-semibold text-text-primary">{name}</span>
        <span className="text-sm text-text-secondary">{descriptor}</span>
        <span
          aria-hidden="true"
          className="truncate font-mono text-[10px] tracking-[0.15em] text-text-muted"
          dir="ltr"
        >
          {mrz}
        </span>
      </span>

      <span
        aria-hidden="true"
        className="shrink-0 rounded border border-border px-1 py-0.5 text-[9px] font-bold uppercase tracking-widest text-text-muted"
      >
        {mockLabel}
      </span>

      {selected ? (
        <Check className="size-5 shrink-0 text-primary" aria-hidden="true" />
      ) : (
        <ChevronRight
          className="size-5 shrink-0 text-text-muted rtl:-scale-x-100"
          aria-hidden="true"
        />
      )}
    </button>
  );
}
