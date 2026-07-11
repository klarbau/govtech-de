'use client';

import { useTranslations } from 'next-intl';
import { Info } from 'lucide-react';

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

interface EidCredentialCardBaseProps {
  name: string;
}

interface EidCredentialHeroProps extends EidCredentialCardBaseProps {
  variant: 'hero';
  nationality: string;
  /** Four-digit birth year — fallback when no full `birthdate` is supplied. */
  birthYear: string;
  /** Full German civilian birthdate (e.g. `22.03.1997`); preferred over `birthYear`. */
  birthdate?: string;
}

type EidCredentialCardProps = EidCredentialHeroProps;

/**
 * A credible digital-ID credential rendered as a real artifact — flag stripe,
 * MRZ line, honest `[MOCK]` stamp. No gradients/glow/glass: the authenticity
 * is document detailing, not effect. `hero` is the single variant: the full
 * dark credential anchoring the transparency screen and the Stammdaten hero.
 */
export function EidCredentialCard(props: EidCredentialCardProps) {
  const t = useTranslations('onboarding.eid_card');

  return (
    <EidCredentialHero
      {...props}
      kindLabel={t('label')}
      footerLabel={t('footer')}
      mockLabel={t('mock')}
    />
  );
}

/**
 * Faint Bundesadler-adjacent crest silhouette for the hero's lower-right
 * corner — a quiet authenticity detail at very low opacity, never a logo.
 * Decorative only.
 */
function EagleWatermark({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 64 64"
      fill="currentColor"
      className={className}
    >
      <path d="M32 6c2 0 3.4 1.4 3.6 3.2C40 8.6 44 10 46.4 13.4c2.6-1 5.2-.8 7 .4-1.4 1-2 2.6-1.8 4.2 3 .6 5.4 2.6 6.4 5.4-1.8-.4-3.6 0-5 1 2 1.6 3.2 3.8 3.4 6.2-2-1.2-4.2-1.6-6.4-1.2 1.4 2 1.8 4.4 1.2 6.6-1.6-1.6-3.6-2.6-5.8-2.8 1 2 1 4.2.2 6.2-1.4-1.8-3.4-3-5.6-3.4l-1 2.4c2.2 1.4 3.6 3.8 3.8 6.4-2-1.4-4.4-2-6.8-1.8v3.2c2 .4 3.6 2 4 4-1.8-.8-3.8-1-5.6-.4v3.4h6v3h-6v3h-2v-3h-6v-3h6v-3.4c-1.8-.6-3.8-.4-5.6.4.4-2 2-3.6 4-4v-3.2c-2.4-.2-4.8.4-6.8 1.8.2-2.6 1.6-5 3.8-6.4l-1-2.4c-2.2.4-4.2 1.6-5.6 3.4-.8-2-.8-4.2.2-6.2-2.2.2-4.2 1.2-5.8 2.8-.6-2.2-.2-4.6 1.2-6.6-2.2-.4-4.4 0-6.4 1.2.2-2.4 1.4-4.6 3.4-6.2-1.4-1-3.2-1.4-5-1 1-2.8 3.4-4.8 6.4-5.4.2-1.6-.4-3.2-1.8-4.2 1.8-1.2 4.4-1.4 7-.4C20 10 24 8.6 28.4 9.2 28.6 7.4 30 6 32 6z" />
    </svg>
  );
}

function EidCredentialHero({
  name,
  nationality,
  birthYear,
  birthdate,
  kindLabel,
  footerLabel,
  mockLabel,
}: EidCredentialHeroProps & {
  kindLabel: string;
  footerLabel: string;
  mockLabel: string;
}) {
  const mrz = formatMrz(name);
  const birthValue = birthdate ?? birthYear;

  return (
    <div className="relative overflow-hidden rounded-xl bg-[#0F3D2E] p-5 text-white shadow-sm ring-1 ring-white/10 sm:p-6">
      <span aria-hidden="true" className="absolute inset-x-0 top-0 h-px bg-white/20" />

      <EagleWatermark
        className="pointer-events-none absolute -bottom-4 -right-3 size-32 text-white/[0.04]"
      />

      <div className="relative flex items-start justify-between gap-4">
        <div className="flex items-center gap-2">
          <FlagMark />
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-200">
            {kindLabel}
          </p>
        </div>
        <span className="shrink-0 rounded-full bg-[#1E5C46] px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-white ring-1 ring-white/15">
          {mockLabel}
        </span>
      </div>

      <p className="relative mt-5 text-xl font-semibold tracking-wide text-white sm:text-2xl">
        {name}
      </p>
      <p className="relative mt-1 text-sm text-zinc-300">
        {nationality} · geb. {birthValue}
      </p>

      <p
        aria-hidden="true"
        className="relative mt-4 truncate font-mono text-xs tracking-[0.2em] text-zinc-400"
        dir="ltr"
      >
        {mrz}
      </p>

      <p className="relative mt-4 inline-flex items-center gap-1.5 text-[11px] text-zinc-300">
        {footerLabel}
        <Info className="size-3 shrink-0" aria-hidden="true" />
      </p>
    </div>
  );
}

