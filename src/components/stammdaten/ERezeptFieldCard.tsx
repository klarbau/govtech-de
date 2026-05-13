'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { Pill } from 'lucide-react';

import { cn } from '@/lib/utils';

export type ERezeptModus = 'app' | 'egk' | 'papier';

interface ERezeptFieldCardProps {
  modus: ERezeptModus;
}

/**
 * `<ERezeptFieldCard>` (Spec § 6.2, § 11.29 — Stammdaten V1.1).
 *
 * eRezept-Bezugsmodus (App / eGK / Papierausdruck) als Read-Only-Pill;
 * Wegweiser „App herunterladen → gematik E-Rezept-App".
 *
 * Hard-Line § 11.29: ERSTE streichbare Komponente bei Scope-Druck — kann
 * ohne fachlichen Verlust nach V1.2 verschoben werden. i18n-Keys bleiben
 * als V1.2-Hook erhalten.
 *
 * a11y:
 *   - `<article aria-labelledby>` mit `<h3>`-Header
 *   - Modus-Pill mit ausgeschriebenem `aria-label`
 */
export function ERezeptFieldCard({ modus }: ERezeptFieldCardProps) {
  const t = useTranslations('stammdaten.kv_pflege.erezept');

  let title: string;
  try {
    title = t('title');
  } catch {
    title = 'eRezept';
  }
  let modusLabel: string;
  try {
    modusLabel = t(`modus.${modus}`);
  } catch {
    modusLabel =
      modus === 'app'
        ? 'Bezug via gematik E-Rezept-App'
        : modus === 'egk'
          ? 'Bezug via eGK in der Apotheke'
          : 'Bezug via Papierausdruck';
  }

  const titleId = 'erezept-field-card-title';

  return (
    <article
      aria-labelledby={titleId}
      data-testid="erezept-field-card"
      className={cn(
        'rounded-xl border border-border bg-card p-4 shadow-sm',
      )}
    >
      <header className="flex flex-wrap items-center gap-2">
        <Pill
          className="size-4 shrink-0 text-muted-foreground"
          aria-hidden="true"
        />
        <h3
          id={titleId}
          className="text-sm font-semibold tracking-tight text-foreground"
        >
          {title}
        </h3>
      </header>
      <p
        className="mt-3 inline-flex rounded-full bg-muted px-3 py-1 text-xs text-foreground"
        aria-label={modusLabel}
        data-testid={`erezept-modus-${modus}`}
      >
        {modusLabel}
      </p>
    </article>
  );
}
