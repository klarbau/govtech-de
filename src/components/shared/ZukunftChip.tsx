import { Sparkles } from 'lucide-react';

import { cn } from '@/lib/utils';

interface ZukunftChipProps {
  /** Localized label, e.g. „ZUKUNFT 2027" — the caller supplies the i18n string. */
  label: string;
  className?: string;
}

/**
 * `<ZukunftChip>` — kleiner Waldgrün-getönter Marker für spekulative 2027-
 * Konzepte (proaktive Anspruchs-Erkennung, antragsloses Kindergeld-Phasing).
 * Grün ist reiner Akzent — die Bedeutung trägt der Text (kein Farb-Coding).
 * Kontrast klärt AA via `--color-primary` (Waldgrün) auf `bg-accent-soft`.
 */
export function ZukunftChip({ label, className }: ZukunftChipProps) {
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center gap-1 rounded-full border border-primary/30 bg-accent-soft px-2 py-0.5 text-[11px] font-semibold text-primary',
        className,
      )}
    >
      <Sparkles aria-hidden="true" className="size-3" />
      {label}
    </span>
  );
}
