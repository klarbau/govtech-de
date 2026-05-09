import * as React from 'react';

import { cn } from '@/lib/utils';

interface LetterListGroupProps {
  title: string;
  count: number;
  children: React.ReactNode;
  className?: string;
}

/**
 * Status-Gruppen-Header (Neu / Frist ≤ 7d / Frist > 7d / Erledigt / Archiv).
 *
 * Live-Region wird auf dem äußeren `#letter-list`-Container in
 * `<PosteingangInbox>` gesetzt — die inneren Gruppen-`<ul>`s tragen
 * **keine** eigenen `aria-live`-Attribute, um doppelte SR-Ankündigungen
 * zu vermeiden (a11y-tester 2026-05-09).
 */
export function LetterListGroup({
  title,
  count,
  children,
  className,
}: LetterListGroupProps) {
  const id = React.useId();
  return (
    <section
      aria-labelledby={`group-${id}-title`}
      className={cn('flex flex-col gap-2', className)}
    >
      <h3
        id={`group-${id}-title`}
        className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground"
      >
        <span>{title}</span>
        <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-foreground">
          {count}
        </span>
      </h3>
      <ul role="list" className="flex flex-col gap-2">
        {children}
      </ul>
    </section>
  );
}
