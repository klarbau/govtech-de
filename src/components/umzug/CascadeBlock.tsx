import type { ReactNode } from 'react';

import { RechtsgrundlageTag } from '@/components/shared/RechtsgrundlageTag';
import { cn } from '@/lib/utils';
import type { BlockTyp } from '@/types';

interface CascadeBlockProps {
  block: BlockTyp;
  title: string;
  subhead: string;
  helper?: string;
  rechtsgrundlagen?: { norm: string; i18nKey?: string }[];
  children: ReactNode;
  id: string;
  /**
   * When true, the block is rendered as the visually-dominant "hero" block
   * (Block A — "Erledigen wir automatisch"). Larger title typography +
   * accent ring + extra padding. B/C/D fall back to the secondary treatment.
   */
  primary?: boolean;
}

const blockAccents: Record<BlockTyp, string> = {
  A: 'border-l-emerald-500/60',
  B: 'border-l-violet-500/60',
  C: 'border-l-zinc-400/60',
  D: 'border-l-sky-500/60',
};

export function CascadeBlock({
  block,
  title,
  subhead,
  helper,
  rechtsgrundlagen,
  children,
  id,
  primary = false,
}: CascadeBlockProps) {
  const titleId = `${id}-title`;
  return (
    <section
      aria-labelledby={titleId}
      className={cn(
        'border-l-2',
        blockAccents[block],
        primary
          ? 'rounded-r-xl border border-l-2 border-[var(--ds-color-accent-soft,var(--color-border))] bg-[var(--ds-color-bg-elevated,var(--color-card))] p-[var(--ds-space-fixed-25,1.5rem)] shadow-[var(--shadow-card,0_1px_2px_0_rgb(0_0_0/0.04))]'
          : 'pl-4',
      )}
    >
      <header
        className={cn(
          'flex flex-col gap-1',
          primary ? 'pb-[var(--ds-space-fixed-15,1rem)]' : 'pb-2',
        )}
      >
        <h2
          id={titleId}
          className={cn(
            'font-semibold text-foreground',
            primary
              ? 'text-[length:var(--ds-text-h3,1.5rem)] leading-[var(--ds-line-h3,1.25)]'
              : 'text-sm uppercase tracking-wide',
          )}
        >
          {title}
        </h2>
        <p
          className={cn(
            primary ? 'text-sm text-muted-foreground' : 'text-xs text-muted-foreground',
          )}
        >
          {subhead}
        </p>
        {rechtsgrundlagen && rechtsgrundlagen.length > 0 ? (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {rechtsgrundlagen.map((r) => (
              <RechtsgrundlageTag
                key={r.norm}
                norm={r.norm}
                i18nKey={r.i18nKey}
              />
            ))}
          </div>
        ) : null}
        {helper ? (
          <p className="pt-1 text-xs text-muted-foreground">{helper}</p>
        ) : null}
      </header>
      <ol className="flex flex-col">{children}</ol>
    </section>
  );
}
