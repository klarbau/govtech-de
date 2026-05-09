'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';

import { cn } from '@/lib/utils';

interface OriginaltextBlockProps {
  body: string;
  /** Substring im Body, der nach Citation-Klick hervorgehoben wird. */
  highlightZitat?: string;
  className?: string;
}

export interface OriginaltextBlockHandle {
  /** Scrollt zum Anker des Zitats und hebt 1500 ms hervor. */
  scrollToZitat(zitat: string): void;
  /** Scrollt den gesamten Originaltext-Block in den Viewport. */
  scrollIntoView(): void;
}

/**
 * Originaltext-Block — IMMER LTR-DE, auch in AR-RTL-UI (Spec §4.3
 * a11y-notes). Whitespace bleibt erhalten (Briefkopf-Layout).
 */
export const OriginaltextBlock = React.forwardRef<
  OriginaltextBlockHandle,
  OriginaltextBlockProps
>(function OriginaltextBlock(
  { body, highlightZitat, className },
  forwardedRef,
) {
  const t = useTranslations('posteingang.reader');
  const containerRef = React.useRef<HTMLPreElement | null>(null);
  const sectionRef = React.useRef<HTMLElement | null>(null);
  const [activeZitat, setActiveZitat] = React.useState<string | null>(
    highlightZitat ?? null,
  );

  React.useImperativeHandle(forwardedRef, () => ({
    scrollToZitat(zitat) {
      setActiveZitat(zitat);
      if (!containerRef.current) return;
      const idx = body.indexOf(zitat);
      if (idx < 0) {
        containerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }
      const ratio = idx / Math.max(body.length, 1);
      const target = ratio * containerRef.current.scrollHeight;
      containerRef.current.scrollTo({ top: target - 80, behavior: 'smooth' });
      window.setTimeout(() => setActiveZitat(null), 1800);
    },
    scrollIntoView() {
      sectionRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    },
  }));

  const renderedBody = React.useMemo(() => {
    if (!activeZitat) return body;
    const idx = body.indexOf(activeZitat);
    if (idx < 0) return body;
    return (
      <>
        {body.slice(0, idx)}
        <mark className="rounded-sm bg-amber-200 px-0.5 py-0 text-foreground dark:bg-amber-500/40">
          {activeZitat}
        </mark>
        {body.slice(idx + activeZitat.length)}
      </>
    );
  }, [body, activeZitat]);

  return (
    <section
      ref={sectionRef}
      aria-labelledby="originaltext-heading"
      id="original"
      dir="ltr"
      lang="de"
      className={cn('flex flex-col gap-3', className)}
    >
      <header className="flex items-center justify-between gap-2">
        <h2
          id="originaltext-heading"
          className="text-sm font-semibold tracking-tight"
        >
          {t('originaltext_heading')}
        </h2>
        <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          {t('originaltext_authoritative_label')}
        </span>
      </header>
      <pre
        ref={containerRef}
        className="max-h-[64vh] overflow-y-auto whitespace-pre-wrap break-words rounded-lg border border-border bg-card p-4 font-sans text-sm leading-relaxed text-foreground"
        tabIndex={0}
      >
        {renderedBody}
      </pre>
    </section>
  );
});
