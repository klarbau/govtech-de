'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { Eye, EyeOff } from 'lucide-react';

import { cn } from '@/lib/utils';

interface FinMaskedSpanProps {
  /** Volle FIN inkl. `[MOCK]`-Präfix (17 Zeichen Nutzteil nach ISO 3779). */
  finVoll: string;
  /** Maskierte Darstellung (Default-State), z. B. `WAUZZZ•••••••3456`. */
  finMasked: string;
  /**
   * Anker-ID, damit mehrere Halter-Cards pro Persona eindeutige Buttons rendern.
   * (Mehmet hat zwei Halter-Cards → zwei Toggle-Buttons; ARIA-Eindeutigkeit, VL-A11y.)
   */
  uniqueKey: string;
  className?: string;
}

/**
 * `<FinMaskedSpan>` (Spec § 4.1 — HL-MOB-3, HL-MOB-7).
 *
 * FIN ist personenbezogen (KBA-Selbstauskunft + Schadenakten +
 * Versicherungsbetrugsschutz). Default `WAUZZZ•••••••3456`; on-click voll.
 * Pattern-Konsistenz zu V1 `<IbanSpeculativeBadge>`-Mask-Pattern.
 *
 * a11y: separater Toggle-Button mit `aria-pressed` + `aria-controls`;
 * `aria-label` enthält maskiert/voll-Hinweis je nach State.
 */
export function FinMaskedSpan({
  finVoll,
  finMasked,
  uniqueKey,
  className,
}: FinMaskedSpanProps): React.ReactElement {
  const t = useTranslations('stammdaten.mobilitaet.halter');
  const [revealed, setRevealed] = React.useState(false);

  const valueId = `fin-value-${uniqueKey}`;
  const buttonId = `fin-toggle-${uniqueKey}`;

  const tail = finMasked.slice(-4);
  const ariaLabel = revealed
    ? t('fin_aria_label_full', { fin: finVoll })
    : t('fin_aria_label_masked', { tail });

  return (
    <span className={cn('inline-flex flex-wrap items-center gap-2', className)}>
      <span
        id={valueId}
        dir="ltr"
        className="font-mono text-sm text-foreground"
        aria-label={ariaLabel}
        data-testid={`fin-value-${uniqueKey}`}
      >
        {revealed ? finVoll : finMasked}
      </span>
      <button
        id={buttonId}
        type="button"
        aria-pressed={revealed}
        aria-controls={valueId}
        onClick={() => setRevealed((prev) => !prev)}
        data-testid={`fin-toggle-${uniqueKey}`}
        className={cn(
          'inline-flex items-center gap-1 rounded-md border border-border bg-background px-2 py-1 text-[11px] font-medium text-foreground',
          'hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
        )}
      >
        {revealed ? (
          <>
            <EyeOff className="size-3" aria-hidden="true" />
            {t('fin_hide_cta')}
          </>
        ) : (
          <>
            <Eye className="size-3" aria-hidden="true" />
            {t('fin_reveal_cta')}
          </>
        )}
      </button>
    </span>
  );
}
