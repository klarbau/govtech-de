'use client';

import * as React from 'react';
import { Popover as PopoverPrimitive } from '@base-ui/react/popover';
import { useTranslations } from 'next-intl';

import { cn } from '@/lib/utils';
import type { LetterCitation } from '@/types';

interface CitationFootnoteProps {
  citation: LetterCitation;
  /** Marker-Nummer 1-basiert. */
  number: number;
  /** Ruft den Original-Text-Anker auf (Scroll + Highlight). */
  onShowInOriginal?: (citation: LetterCitation) => void;
  className?: string;
}

/**
 * Inline-Marker `[⌖N]` neben einem AI-Bullet. Klick öffnet ein Popover
 * mit dem Original-Zitat-Satz aus dem Brief; Sekundär-CTA scrollt zum
 * Anker im Originaltext-Block.
 *
 * Spec §4.3 a11y: `aria-haspopup="dialog"`, Popover als `role="dialog"`
 * mit Focus-Trap (von base-ui übernommen) und Esc/Outside-Click-Close.
 *
 * Wenn `original_zitat` leer ist (reiner Norm-Kontext-Bullet), wird KEIN
 * Marker gerendert — Aufrufer-Komponente prüft das.
 */
export function CitationFootnote({
  citation,
  number,
  onShowInOriginal,
  className,
}: CitationFootnoteProps) {
  const t = useTranslations('posteingang.reader.citation');
  const triggerLabel = t('marker_aria_template', { n: number });
  const popoverId = React.useId();
  const dialogId = `citation-popover-${popoverId}`;

  return (
    <PopoverPrimitive.Root>
      <PopoverPrimitive.Trigger
        render={
          <button
            type="button"
            aria-label={triggerLabel}
            aria-haspopup="dialog"
            aria-controls={dialogId}
            className={cn(
              'ml-1 inline-flex h-5 min-w-[1.4rem] items-center justify-center rounded-md border border-border bg-muted px-1 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-foreground hover:text-background focus-visible:bg-foreground focus-visible:text-background focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
              className,
            )}
          />
        }
      >
        <span aria-hidden="true">⌖</span>
        <span className="ml-0.5">{number}</span>
      </PopoverPrimitive.Trigger>
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Positioner side="top" sideOffset={6} className="isolate z-50">
          <PopoverPrimitive.Popup
            id={dialogId}
            role="dialog"
            aria-modal="false"
            aria-labelledby={`${dialogId}-title`}
            className="z-50 max-w-md rounded-md bg-foreground px-3 py-2 text-left text-xs leading-relaxed text-background shadow-lg outline-none ring-1 ring-foreground/10 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95"
          >
            <p id={`${dialogId}-title`} className="font-semibold">
              {t('popover_title')}
            </p>
            <blockquote className="mt-1 border-l-2 border-background/50 pl-2 italic">
              {`„${citation.original_zitat}"`}
            </blockquote>
            {onShowInOriginal && (
              <button
                type="button"
                onClick={() => onShowInOriginal(citation)}
                className="mt-2 inline-flex items-center text-[11px] underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-background"
              >
                {t('scroll_to_original')}
              </button>
            )}
          </PopoverPrimitive.Popup>
        </PopoverPrimitive.Positioner>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
}
