import { Briefcase, Landmark } from 'lucide-react';
import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

type AvatarVariant =
  | 'eagle' // Federal / Finanzamt — black-blue eagle
  | 'aok' // AOK green "AOK"
  | 'ard' // ARD ZDF Beitragsservice — brand-deep blue, tiny multi-line text
  | 'lea' // LEA Berlin — ink black, multi-line text
  | 'jobcenter' // Jobcenter — red briefcase
  | 'neutral'; // Fallback — initials on muted

type AvatarSize = 'md' | 'lg';

interface BehoerdenAvatarV2Props {
  /** `Behoerde.id` from the seed data, or null if unresolved. */
  absenderId?: string | null;
  /** Behörde display name — used for initials fallback. */
  name: string;
  size?: AvatarSize;
  className?: string;
}

const sizeClasses: Record<AvatarSize, string> = {
  md: 'size-10', // 40 px
  lg: 'size-11', // 44 px
};

const iconSizeClasses: Record<AvatarSize, string> = {
  md: '[&_svg]:size-4',
  lg: '[&_svg]:size-5',
};

/**
 * Maps an `absender_behoerde_id` to a special-cased avatar variant. The
 * remaining ~30 Behörden fall through to `neutral` (initials on muted bg).
 *
 * Slugs follow `src/data/behoerden.json` and seed-files. Pattern matching
 * stays loose ("starts-with") so siblings (`finanzamt-koeln-mitte`,
 * `finanzamt-hamburg-eimsbuettel`, ...) get the same treatment.
 */
function variantForId(id: string | null | undefined): AvatarVariant {
  if (!id) return 'neutral';
  const slug = id.toLowerCase();
  if (slug.startsWith('finanzamt-')) return 'eagle';
  if (slug === 'bundesdruckerei' || slug === 'kba-flensburg') return 'eagle';
  if (slug.startsWith('aok-')) return 'aok';
  if (slug.startsWith('tk-') || slug.includes('-krankenkasse')) return 'aok';
  if (slug.startsWith('beitragsservice')) return 'ard';
  if (slug.startsWith('abh-') || slug.includes('-lea')) return 'lea';
  if (slug.startsWith('jobcenter-')) return 'jobcenter';
  return 'neutral';
}

function monogram(name: string): string {
  const parts = name
    .replace(/[—–-]/g, ' ')
    .split(/\s+/)
    .filter((p) => p.length > 0 && /^[A-Za-zÄÖÜäöüß]/.test(p));
  const first = parts[0]?.[0] ?? '?';
  const second = parts[1]?.[0] ?? '';
  return (first + second).toUpperCase();
}

function variantContent(variant: AvatarVariant, name: string): ReactNode {
  switch (variant) {
    case 'eagle':
      return <Landmark aria-hidden="true" />;
    case 'aok':
      return <span className="text-[10px] font-semibold tracking-wide">AOK</span>;
    case 'ard':
      return (
        <span className="px-1 text-center text-[7.5px] font-semibold leading-[1.05]">
          ARD ZDF
          <br />
          deutschland
          <br />
          radio
        </span>
      );
    case 'lea':
      return (
        <span className="px-1 text-center text-[8.5px] font-semibold leading-[1.05]">
          LEA
          <br />
          BERLIN
        </span>
      );
    case 'jobcenter':
      return <Briefcase aria-hidden="true" />;
    case 'neutral':
    default:
      return (
        <span className="text-[11px] font-semibold">{monogram(name)}</span>
      );
  }
}

const variantBgClasses: Record<AvatarVariant, string> = {
  // Deep navy (#0E1A36) — federal eagle. HL-DS-10 colour rule applies only to
  // BehoerdenBadge text labels; the Posteingang list relies on these avatars
  // as a *recognition aid* (icon-style monogram), not a category signal.
  eagle: 'bg-[#0E1A36] text-white',
  aok: 'bg-green-600 text-white',
  ard: 'bg-[#1B47C2] text-white',
  lea: 'bg-[#0E1A36] text-white',
  jobcenter: 'bg-[#C03B41] text-white',
  neutral: 'bg-surface-muted text-text-secondary',
};

/**
 * Round 40/44-px Behörden avatar matching the design-prototype-v2 sketch.
 *
 * Always decorative (`aria-hidden`) — the Behörde name is rendered next to it
 * in the list row, so SR users do not get a duplicate announcement.
 */
export function BehoerdenAvatarV2({
  absenderId,
  name,
  size = 'lg',
  className,
}: BehoerdenAvatarV2Props) {
  const variant = variantForId(absenderId);
  return (
    <span
      aria-hidden="true"
      className={cn(
        'inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full',
        sizeClasses[size],
        iconSizeClasses[size],
        variantBgClasses[variant],
        className,
      )}
    >
      {variantContent(variant, name)}
    </span>
  );
}
