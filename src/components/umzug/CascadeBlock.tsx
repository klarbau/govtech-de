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
}: CascadeBlockProps) {
  const titleId = `${id}-title`;
  return (
    <section
      aria-labelledby={titleId}
      className={cn('border-l-2 pl-4', blockAccents[block])}
    >
      <header className="flex flex-col gap-1 pb-2">
        <h2
          id={titleId}
          className="text-sm font-semibold uppercase tracking-wide text-foreground"
        >
          {title}
        </h2>
        <p className="text-xs text-muted-foreground">{subhead}</p>
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
