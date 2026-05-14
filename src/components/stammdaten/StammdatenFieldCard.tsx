'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { ShieldAlert } from 'lucide-react';

import { BehoerdenBadge } from '@/components/shared/BehoerdenBadge';
import { wrapNormZitate } from '@/components/posteingang/wrapNormZitate';
import { cn } from '@/lib/utils';
import type { Behoerde } from '@/types';
import type {
  FeldQuelle,
  StammdatenFieldEditability,
  StammdatenKorrekturweg,
} from '@/types/stammdaten';

import { IbanSpeculativeBadge } from './IbanSpeculativeBadge';
import { KorrigierenCTA } from './KorrigierenCTA';

interface StammdatenFieldCardProps {
  fieldId: string;
  /** Sichtbares Feld-Label (i18n-Key, voll-qualifiziert). */
  labelI18nKey: string;
  /** Aktueller Wert (verbatim aus Persona / Stammdaten). */
  value?: string | null;
  editability: StammdatenFieldEditability;
  quellen: FeldQuelle[];
  korrekturweg: StammdatenKorrekturweg;
  behoerdenById: Record<string, Behoerde>;
  /** Letztes-Update-Stempel (formatiert oder ISO). */
  letztesUpdate?: string;
  /** Art-9-Hinweis-Badge sichtbar (z. B. AZR-Nr., eAT-CAN). */
  art9Relevant?: boolean;
  /** 2027-Vision-Speculative Badge sichtbar (IBAN). */
  speculative2027?: boolean;
  /** Hidden-by-default — wird nur bei `consentVisible` gerendert (Religion). */
  hiddenByDefault?: boolean;
  consentVisible?: boolean;
  /** Callback für „Anzeigen" auf hidden-by-default-Cards. */
  onRequestConsent?: () => void;
  /** `[MOCK]`-Watermark inline-Pill anzeigen (Aktenzeichen / IDNr / IBAN / …). */
  mockWatermark?: boolean;
  /** Ergänzende Inhalte (z. B. IBAN-Speculative-Push-Trigger). */
  trailing?: React.ReactNode;
  className?: string;
}

/**
 * `<StammdatenFieldCard>` (Spec § 3 / § 11.2 / § 11.8 / § 11.14–§ 11.16).
 *
 * Universelles Read-/Wegweiser-FieldCard. Vollständig read-only per Default;
 * Self-Edit-Flows (IBAN, Sperren, Religion) laufen über dezidierte Modale,
 * nie inline auf der Card (Hard-Line § 11.2).
 *
 * a11y: jede Card ist `<article>`, Label = `<dt>`, Wert = `<dd>` semantisch
 * über `<div role="group">` mit `aria-labelledby` plus Content. Norm-Zitate
 * im Korrekturweg-Pointer werden via `wrapNormZitate` gewrappt.
 */
export function StammdatenFieldCard({
  fieldId,
  labelI18nKey,
  value,
  editability,
  quellen,
  korrekturweg,
  behoerdenById,
  letztesUpdate,
  art9Relevant,
  speculative2027,
  hiddenByDefault,
  consentVisible,
  onRequestConsent,
  mockWatermark,
  trailing,
  className,
}: StammdatenFieldCardProps) {
  const t = useTranslations();
  const tCard = useTranslations('stammdaten.field_card');
  const tBadge = useTranslations('stammdaten.badge');

  let label: string;
  try {
    label = t(labelI18nKey);
  } catch {
    label = labelI18nKey;
  }

  const labelId = `field-card-label-${fieldId}`;
  const valueId = `field-card-value-${fieldId}`;

  const showHidden = hiddenByDefault === true && consentVisible !== true;

  // Phase-6c — Density-Refactor (Audit-Finding #3):
  // Bei langem Wert (>30 Zeichen) ODER ≥ 2 Badges → Badges in separater Zeile
  // unter dem Header rendern, statt inline mit dem Label.
  const badgeCount =
    (speculative2027 ? 1 : 0) + (art9Relevant ? 1 : 0) + (mockWatermark ? 1 : 0);
  const valueLength = typeof value === 'string' ? value.length : 0;
  const badgesOnSeparateRow = badgeCount >= 2 || valueLength > 30;

  const badges = (
    <>
      {speculative2027 && <IbanSpeculativeBadge />}
      {art9Relevant && (
        <span
          className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-900 ring-1 ring-amber-300/70 dark:bg-amber-900/40 dark:text-amber-100 dark:ring-amber-700/60"
          data-testid={`art9-badge-${fieldId}`}
        >
          <ShieldAlert className="size-3" aria-hidden="true" />
          {tBadge('art9_relevant')}
        </span>
      )}
      {mockWatermark && (
        <span className="inline-flex items-center rounded-md bg-amber-100 px-1.5 py-0.5 font-mono text-[11px] font-medium uppercase tracking-wide text-amber-900 ring-1 ring-amber-300/70 dark:bg-amber-900/40 dark:text-amber-100 dark:ring-amber-700/60">
          {tBadge('mock')}
        </span>
      )}
    </>
  );

  return (
    <article
      aria-labelledby={labelId}
      data-testid={`field-card-${fieldId}`}
      data-editability={editability}
      className={cn(
        'flex min-h-[80px] flex-col rounded-xl border border-border bg-card p-4 shadow-sm transition-colors',
        'hover:border-foreground/20',
        className,
      )}
    >
      <header className="flex flex-wrap items-center gap-2">
        <h3
          id={labelId}
          className="text-sm font-semibold tracking-tight text-foreground"
        >
          {label}
        </h3>
        {!badgesOnSeparateRow && badges}
      </header>

      {badgesOnSeparateRow && badgeCount > 0 && (
        <div
          className="mt-2 flex flex-wrap items-center gap-2"
          data-testid={`field-card-badges-${fieldId}`}
        >
          {badges}
        </div>
      )}

      <div className="mt-3 flex flex-col gap-3">
        {showHidden ? (
          <button
            type="button"
            data-testid={`field-card-reveal-${fieldId}`}
            onClick={onRequestConsent}
            className={cn(
              'w-fit rounded-md border border-dashed border-border bg-muted/40 px-3 py-2 text-sm text-muted-foreground',
              'hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
            )}
          >
            {tCard('reveal_religion')}
          </button>
        ) : (
          <p
            id={valueId}
            className="text-base font-medium text-foreground"
            data-testid={`field-card-value-${fieldId}`}
          >
            {value && value.length > 0 ? value : tCard('value_empty')}
          </p>
        )}

        {quellen.length > 0 && (
          <div className="flex flex-col gap-1">
            <span className="text-xs font-medium text-muted-foreground">
              {tCard('quelle_label')}
            </span>
            <ul className="flex flex-col gap-1">
              {quellen.map((q, idx) => {
                const beh = behoerdenById[q.behoerde_id];
                const name =
                  beh?.name_de ?? `[Behörde ${q.behoerde_id}]`;
                return (
                  <li
                    key={`quelle-${fieldId}-${idx}`}
                    className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground"
                  >
                    <BehoerdenBadge name={name} kategorie={beh?.kategorie} />
                    <span className="text-[11px]">
                      {wrapNormZitate(q.rechtsgrundlage)}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {letztesUpdate && (
          <p className="text-[11px] text-muted-foreground">
            {tCard('letztes_update_label')}: {letztesUpdate}
          </p>
        )}

        <KorrigierenCTA
          fieldId={fieldId}
          wizardSlug={korrekturweg.wizard_slug}
          pointerI18nKey={korrekturweg.pointer_i18n_key}
          rechtsgrundlage={korrekturweg.rechtsgrundlage}
        />

        {trailing}
      </div>
    </article>
  );
}
