import { Cog, Hand, KeyRound, ListChecks } from 'lucide-react';
import type { ReactNode } from 'react';

import { BehoerdenBadge } from '@/components/shared/BehoerdenBadge';
import { cn } from '@/lib/utils';
import type { BehoerdeKategorie, BlockTyp } from '@/types';

interface CascadeRowProps {
  block: BlockTyp;
  behoerdeName: string;
  behoerdeKategorie?: BehoerdeKategorie;
  aktion: string;
  trailing?: ReactNode;
  className?: string;
}

const blockIcons: Record<BlockTyp, typeof Cog> = {
  A: Cog,
  B: Hand,
  C: ListChecks,
  D: KeyRound,
};

export function CascadeRow({
  block,
  behoerdeName,
  behoerdeKategorie,
  aktion,
  trailing,
  className,
}: CascadeRowProps) {
  const Icon = blockIcons[block];

  return (
    <li
      className={cn(
        'flex flex-col gap-2 border-b border-border/60 py-3 last:border-b-0 sm:flex-row sm:items-center sm:justify-between',
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <Icon
          className="mt-0.5 size-4 shrink-0 text-muted-foreground"
          aria-hidden="true"
        />
        <div className="flex flex-col gap-0.5">
          <BehoerdenBadge name={behoerdeName} kategorie={behoerdeKategorie} />
          <p className="ml-9 text-xs text-muted-foreground">{aktion}</p>
        </div>
      </div>
      {trailing ? <div className="ml-9 sm:ml-0">{trailing}</div> : null}
    </li>
  );
}
