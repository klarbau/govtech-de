import { cn } from '@/lib/utils';

type AvatarSize = 'sm' | 'md' | 'lg';
type AvatarTone = 'neutral' | 'primary';

interface AvatarProps {
  /** Full name; initials are derived when `initials` is not supplied. */
  name?: string;
  initials?: string;
  size?: AvatarSize;
  tone?: AvatarTone;
  imageUrl?: string;
  className?: string;
  /**
   * Accessible label. When omitted the monogram is decorative (`aria-hidden`)
   * and the surrounding context provides the name.
   */
  'aria-label'?: string;
}

function deriveInitials(name: string): string {
  const parts = name
    .replace(/[—–-]/g, ' ')
    .split(/\s+/)
    .filter((p) => p.length > 0 && /^[\p{L}]/u.test(p));
  if (parts.length === 0) return '—';
  const first = parts[0]?.[0] ?? '';
  const second = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : '';
  return (first + second).toUpperCase();
}

const sizeClasses: Record<AvatarSize, string> = {
  sm: 'size-7 text-xs',
  md: 'size-9 text-sm',
  lg: 'size-11 text-base',
};

const toneClasses: Record<AvatarTone, string> = {
  neutral: 'bg-surface-muted text-text-secondary',
  primary: 'bg-accent-soft text-primary',
};

export function Avatar({
  name,
  initials,
  size = 'md',
  tone = 'neutral',
  imageUrl,
  className,
  'aria-label': ariaLabel,
}: AvatarProps) {
  const label = initials ?? (name ? deriveInitials(name) : '—');
  const labelled = Boolean(ariaLabel);

  if (imageUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={imageUrl}
        alt={ariaLabel ?? name ?? ''}
        className={cn(
          'inline-block shrink-0 rounded-full object-cover',
          sizeClasses[size],
          className,
        )}
      />
    );
  }

  return (
    <span
      role={labelled ? 'img' : undefined}
      aria-label={ariaLabel}
      aria-hidden={labelled ? undefined : true}
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-full font-semibold',
        sizeClasses[size],
        toneClasses[tone],
        className,
      )}
    >
      {label}
    </span>
  );
}
