'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { Building2 } from 'lucide-react';

import { NormZitatSpan } from '@/components/posteingang/NormZitatSpan';
import { cn } from '@/lib/utils';

interface VersorgungswerkWegweiserCardProps {
  /** Name des Versorgungswerks (z. B. „Bayerische Architektenkammer"). */
  name: string;
  /** Mitgliedsnummer (`[MOCK]`-watermarked). */
  mitgliedsnummer: string;
}

/**
 * `<VersorgungswerkWegweiserCard>` (Spec § 6.1, Track B — Stammdaten V1.1).
 *
 * Track-B (Kammerberuf): Wegweiser-Pointer auf Versorgungswerk-Portal.
 * NICHT in V1.1-Demo-Personas sichtbar (kein Persona auf Track B);
 * fall-back-Render falls künftig eine Track-B-Persona kommt.
 *
 * In V1.1 als „dead code"-akzeptabel; aktiv nur, wenn `persona.renten_track ===
 * 'B'` und `persona.versorgungswerk_v1_1` gesetzt.
 */
export function VersorgungswerkWegweiserCard({
  name,
  mitgliedsnummer,
}: VersorgungswerkWegweiserCardProps) {
  const t = useTranslations('stammdaten.altersvorsorge');

  let mitgliedsnummerLabel: string;
  try {
    mitgliedsnummerLabel = t('versorgungswerk.mitgliedsnummer_label');
  } catch {
    mitgliedsnummerLabel = 'Mitgliedsnummer';
  }
  let befreiungHint: string;
  try {
    befreiungHint = t('versorgungswerk.befreiungs_hint');
  } catch {
    befreiungHint =
      'Bei Versorgungswerks-Pflichtmitgliedschaft kann eine Befreiung von der GRV nach § 6 Abs. 1 Nr. 1 SGB VI bestehen.';
  }

  const titleId = 'versorgungswerk-title';

  return (
    <section
      aria-labelledby={titleId}
      data-testid="versorgungswerk-wegweiser-card"
      className={cn(
        'flex gap-3 rounded-xl border border-border bg-card p-4 shadow-sm',
      )}
    >
      <Building2
        className="mt-0.5 size-5 shrink-0 text-muted-foreground"
        aria-hidden="true"
      />
      <div className="flex flex-col gap-2">
        <h3
          id={titleId}
          className="text-sm font-semibold tracking-tight text-foreground"
        >
          {name}
        </h3>
        <dl className="grid grid-cols-1 gap-1 text-xs sm:grid-cols-[auto_1fr] sm:gap-x-4">
          <dt className="font-medium text-muted-foreground">
            {mitgliedsnummerLabel}
          </dt>
          <dd className="font-mono text-foreground">{mitgliedsnummer}</dd>
        </dl>
        <p className="text-[11px] leading-relaxed text-muted-foreground">
          {befreiungHint}{' '}
          <NormZitatSpan text="§ 6 Abs. 1 Nr. 1 SGB VI" />
        </p>
      </div>
    </section>
  );
}
