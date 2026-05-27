import { cn } from '@/lib/utils';
import type { BehoerdeKategorie } from '@/types';

interface BehoerdenBadgeProps {
  name: string;
  /**
   * Kategorie is rendered as a neutral text label only — never as colour.
   * HL-DS-10: the computed monogram background/border/text must be identical
   * across bund/land/kommune/sozialversicherung/privat.
   */
  kategorie?: BehoerdeKategorie;
  /** Show the kategorie as a secondary text label below the name. */
  showKategorie?: boolean;
  kategorieLabel?: string;
  className?: string;
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

export function BehoerdenBadge({
  name,
  showKategorie = false,
  kategorieLabel,
  className,
}: BehoerdenBadgeProps) {
  const initials = monogram(name);

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <span
        aria-hidden="true"
        className="inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-surface-muted text-xs font-semibold text-text-secondary"
      >
        {initials}
      </span>
      <span className="flex flex-col leading-tight">
        <span className="text-sm font-medium text-text-primary">{name}</span>
        {showKategorie && kategorieLabel ? (
          <span className="text-xs text-text-muted">{kategorieLabel}</span>
        ) : null}
      </span>
    </div>
  );
}
