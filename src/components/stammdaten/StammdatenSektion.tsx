'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { ChevronDown } from 'lucide-react';

import { cn } from '@/lib/utils';
import type { StammdatenSektionId } from '@/types/stammdaten';

interface StammdatenSektionProps {
  sektionId: StammdatenSektionId;
  /** i18n-Key für Sektions-Titel. */
  titleI18nKey: string;
  /** Default-zugeklappt? Per Spec § 6.3: alle Sektionen außer „Identität" collapsed. */
  defaultOpen?: boolean;
  /** Top-Felder-Vorschau (1–2 Felder als String) — sichtbar im Header bei collapsed-State. */
  preview?: string;
  /** Anzahl der Felder in der Sektion (für screen-reader-Helfer). */
  fieldCount: number;
  children: React.ReactNode;
  /** Optional: Aktivitätsprotokoll-Drawer (Sub-Komponente UebermittlungsLogList). */
  aktivitaetslog?: React.ReactNode;
  className?: string;
}

/**
 * `<StammdatenSektion>` (Spec § 3 / § 6.3).
 *
 * Native `<details>` / `<summary>`-Disclosure für vollständig native
 * Tastatur-/Screenreader-Unterstützung (kein base-ui-Disclosure-Polyfill nötig).
 *
 * a11y:
 *   - `<section aria-labelledby="...">` mit `<h2>`-Header.
 *   - `<details>`/`<summary>` für Disclosure-State (`aria-expanded` automatisch).
 *   - Aktivitätsprotokoll innerhalb als `<aside aria-label>` damit Screenreader
 *     es überspringen können (Hard-Line a11y-Auflage Probe #4).
 */
export function StammdatenSektion({
  sektionId,
  titleI18nKey,
  defaultOpen = false,
  preview,
  fieldCount,
  children,
  aktivitaetslog,
  className,
}: StammdatenSektionProps) {
  const t = useTranslations();
  const tSektion = useTranslations('stammdaten.sektion');
  const detailsRef = React.useRef<HTMLDetailsElement | null>(null);
  const [open, setOpen] = React.useState(defaultOpen);

  let title: string;
  try {
    title = t(titleI18nKey);
  } catch {
    title = titleI18nKey;
  }

  const titleId = `sektion-${sektionId}-title`;

  return (
    <section
      id={sektionId}
      aria-labelledby={titleId}
      className={cn(
        'scroll-mt-24 rounded-xl border border-border bg-card',
        className,
      )}
      data-testid={`sektion-${sektionId}`}
    >
      <details
        ref={detailsRef}
        open={open}
        onToggle={(e) => setOpen((e.currentTarget as HTMLDetailsElement).open)}
        className="group"
      >
        <summary
          className={cn(
            'flex cursor-pointer list-none items-center justify-between gap-4 px-4 py-4 marker:hidden',
            '[&::-webkit-details-marker]:hidden',
            'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring rounded-xl',
          )}
        >
          <div className="flex flex-col gap-0.5">
            <h2
              id={titleId}
              className="text-base font-semibold tracking-tight text-foreground"
            >
              {title}
            </h2>
            {!open && preview && (
              <span className="text-xs text-muted-foreground">{preview}</span>
            )}
            <span className="sr-only">
              {tSektion('sr_field_count', { count: fieldCount })}
            </span>
          </div>
          <ChevronDown
            aria-hidden="true"
            className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180"
          />
        </summary>

        <div className="border-t border-border px-4 py-4">
          <div className="flex flex-col gap-3" data-testid={`sektion-${sektionId}-fields`}>
            {children}
          </div>

          {aktivitaetslog && (
            <aside
              aria-label={tSektion('aktivitaet_aside_label')}
              className="mt-4 rounded-lg border border-dashed border-border bg-muted/30 p-3"
              data-testid={`sektion-${sektionId}-aktivitaetslog`}
            >
              {aktivitaetslog}
            </aside>
          )}
        </div>
      </details>
    </section>
  );
}
