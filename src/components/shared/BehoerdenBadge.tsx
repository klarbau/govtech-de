import { cn } from '@/lib/utils';
import type { BehoerdeKategorie } from '@/types';

interface BehoerdenBadgeProps {
  name: string;
  kategorie?: BehoerdeKategorie;
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

const kategorieClasses: Record<BehoerdeKategorie, string> = {
  bund: 'bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300',
  land: 'bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-200',
  kommune: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200',
  sozialversicherung: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200',
  privat: 'bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-200',
};

export function BehoerdenBadge({
  name,
  kategorie,
  className,
}: BehoerdenBadgeProps) {
  const initials = monogram(name);
  const tone = kategorie ? kategorieClasses[kategorie] : kategorieClasses.bund;

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <span
        aria-hidden="true"
        className={cn(
          'inline-flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold',
          tone,
        )}
      >
        {initials}
      </span>
      <span className="text-sm font-medium text-foreground">{name}</span>
    </div>
  );
}
