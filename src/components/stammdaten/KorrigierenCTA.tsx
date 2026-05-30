'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';
import { wrapNormZitate } from '@/components/posteingang/wrapNormZitate';
import { cn } from '@/lib/utils';

interface KorrigierenCTAProps {
  /**
   * Wizard-Slug für `/vorgaenge/neu/<slug>` — siehe Spec § 8.2 Lookup-Map.
   * `undefined` = read-only Pointer ohne Wizard-Hand-off (rein papierhaft).
   */
  wizardSlug?: string;
  /** i18n-Key des Pointer-Texts (verbatim aus de.json). */
  pointerI18nKey: string;
  /** Norm-Kürzel (für `<NormZitatSpan>`-Wrap). */
  rechtsgrundlage: string;
  /** Field-ID für `?from=stammdaten&field=<id>`-Pre-Fill. */
  fieldId: string;
  className?: string;
}

/**
 * `<KorrigierenCTA>` — Wegweiser-Pattern (Spec § 11.2).
 *
 * - Mit `wizardSlug` → Button, der per `router.push('/vorgaenge/neu/<slug>')`
 *   den entsprechenden Wizard öffnet (Mock-V2-Stub akzeptabel).
 * - Ohne `wizardSlug` → reiner Hinweis-Text mit Norm-Pointer.
 *
 * Hard-Line § 11.2: NIEMALS inline-edit auf hoheitliche Felder. Self-Edit
 * läuft nur über separate FieldCard-Variants.
 */
export function KorrigierenCTA({
  wizardSlug,
  pointerI18nKey,
  rechtsgrundlage,
  fieldId,
  className,
}: KorrigierenCTAProps) {
  const t = useTranslations();
  const tCta = useTranslations('stammdaten.cta');

  let pointerText: string;
  try {
    pointerText = t(pointerI18nKey);
  } catch {
    pointerText = pointerI18nKey;
  }

  const fullText = `${pointerText} (${rechtsgrundlage})`;

  if (!wizardSlug) {
    return (
      <p
        className={cn(
          'text-xs leading-relaxed text-muted-foreground',
          className,
        )}
        data-testid={`korrigieren-pointer-${fieldId}`}
      >
        <span className="font-medium text-foreground">
          {tCta('korrekturweg_label')}:
        </span>{' '}
        {wrapNormZitate(fullText)}
      </p>
    );
  }

  // Latent-Route-Guard: Der Wizard-Hand-off zeigte auf `/vorgaenge/neu/<slug>`
  // — eine Route, die in dieser Demo nicht existiert (404). Statt eines
  // navigierenden Buttons rendern wir den Korrekturweg-Pointer + einen
  // honestly-inerten Button (disabled, kein irreführendes Icon), bis ein
  // echter Wizard existiert. i18n-followup: eigener „demnächst"-Hinweis-Key.
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <p className="text-xs leading-relaxed text-muted-foreground">
        <span className="font-medium text-foreground">
          {tCta('korrekturweg_label')}:
        </span>{' '}
        {wrapNormZitate(fullText)}
      </p>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="self-start"
        data-testid={`korrigieren-cta-${fieldId}`}
        disabled
        aria-disabled="true"
        title="Korrektur-Wizard folgt (Demo)"
      >
        {tCta('korrigieren')} (demnächst)
      </Button>
    </div>
  );
}
