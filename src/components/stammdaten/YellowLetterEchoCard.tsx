'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { Info } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { de as deLocale } from 'date-fns/locale';

import { NormZitatSpan } from '@/components/posteingang/NormZitatSpan';
import { cn } from '@/lib/utils';

/**
 * Lokal definierte Renten-Eckdaten-Form (mirror Spec § 4.2).
 *
 * Diese Form lebt redundant zu `src/types/renten-kv.ts` (Mock-Backend-
 * Territory; wird vom mock-backend-coder gepflegt). Wir halten sie hier
 * lokal, damit der Frontend-Build typecheck-clean ist, bevor das
 * Mock-Backend die Typen exportiert. Sobald `@/types/renten-kv` landet,
 * wird dieser Block durch `import type { RentenEckdaten } from
 * '@/types/renten-kv'` ersetzt.
 */
export interface RentenEckdatenView {
  grundlage_kurzauszug: {
    beitragszeit_von: string;
    beitragszeit_bis: string;
    entgeltpunkte_aktuell: number;
  };
  em_rente_prognose_eur_monat: number;
  regelalter_prognose_eur_monat: number;
  anpassungs_wirkung: {
    beispiel_prozent_p_a: number;
    plus_eur_monat: number;
  };
  beitragsuebersicht: {
    jahr: string;
    gesamt_eur: number;
    versicherter_anteil_eur: number;
    arbeitgeber_anteil_eur: number;
    oeffentliche_kassen_eur?: number;
  };
  stichtag: string;
  quelle_letter_aktenzeichen: string;
  quelle_letter_id: string;
  abgelegt_am: string;
}

interface YellowLetterEchoCardProps {
  eckdaten: RentenEckdatenView;
}

function formatEur(value: number): string {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(value);
}

function formatEntgeltpunkte(value: number): string {
  return new Intl.NumberFormat('de-DE', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatIsoDe(iso: string): string {
  try {
    return format(parseISO(iso), 'dd.MM.yyyy', { locale: deLocale });
  } catch {
    return iso;
  }
}

/**
 * `<YellowLetterEchoCard>` (Spec § 11.27 Hard-Line — Stammdaten V1.1).
 *
 * Card-Top-3 / Tooltip-2 / Expandable-5 Strukturierung:
 *   - Card-Top-3 visible: Entgeltpunkte, Regelalter-Prognose, EM-Rente-Prognose
 *   - Tooltip-2: Anpassungs-Wirkung + Beitragsübersicht (Hover + Focus-
 *     Equivalent via `<details>`/`<summary>` per V1.5-a11y-Konvention)
 *   - Expandable-5: alle 5 Pflicht-Inhalte (§ 109 Abs. 3 SGB VI) ausführlich
 *     nach Click auf den Disclosure-Button
 *
 * Werte sind read-only Echo der DRV-Renteninformation; Korrekturpfad ist
 * der DRV-Online-Zugang (eservice-drv.de) — nicht über die App.
 *
 * a11y:
 *   - `<article aria-labelledby>` mit Top-3-Werten als `<dl>`/`<dt>`/`<dd>`
 *   - Tooltip-Anker als `<details>` mit `<summary aria-label>`
 *   - Expandable als nativem `<details>` mit `<summary>`
 *   - Norm-Zitate via `<NormZitatSpan>`
 */
export function YellowLetterEchoCard({ eckdaten }: YellowLetterEchoCardProps) {
  const t = useTranslations('stammdaten.altersvorsorge.yellow_letter_echo');
  const tEckwert = useTranslations('stammdaten.altersvorsorge.eckwert');

  const titleId = 'yellow-letter-echo-title';

  let entgeltpunkteLabel: string;
  try {
    entgeltpunkteLabel = t('card_top_3.entgeltpunkte');
  } catch {
    entgeltpunkteLabel = 'card_top_3.entgeltpunkte';
  }

  let regelalterLabel: string;
  try {
    regelalterLabel = t('card_top_3.regelalter_prognose');
  } catch {
    regelalterLabel = 'card_top_3.regelalter_prognose';
  }

  let emRenteLabel: string;
  try {
    emRenteLabel = t('card_top_3.em_rente_prognose');
  } catch {
    emRenteLabel = 'card_top_3.em_rente_prognose';
  }

  let expandableLabel: string;
  try {
    expandableLabel = t('expandable_label');
  } catch {
    expandableLabel = 'Alle 5 Pflicht-Inhalte (§ 109 Abs. 3 SGB VI) anzeigen';
  }

  let tooltipAnpassung: string;
  try {
    tooltipAnpassung = t('tooltip.anpassungs_wirkung', {
      prozent: eckdaten.anpassungs_wirkung.beispiel_prozent_p_a.toString(),
      plus: formatEur(eckdaten.anpassungs_wirkung.plus_eur_monat),
    });
  } catch {
    tooltipAnpassung = `Anpassungs-Wirkung: ${eckdaten.anpassungs_wirkung.beispiel_prozent_p_a} % p.a. → +${formatEur(
      eckdaten.anpassungs_wirkung.plus_eur_monat,
    )}/Monat`;
  }

  let tooltipBeitrag: string;
  try {
    tooltipBeitrag = t('tooltip.beitragsuebersicht', {
      jahr: eckdaten.beitragsuebersicht.jahr,
      gesamt: formatEur(eckdaten.beitragsuebersicht.gesamt_eur),
      versicherter: formatEur(eckdaten.beitragsuebersicht.versicherter_anteil_eur),
      arbeitgeber: formatEur(eckdaten.beitragsuebersicht.arbeitgeber_anteil_eur),
    });
  } catch {
    tooltipBeitrag = `Beiträge ${eckdaten.beitragsuebersicht.jahr}: ${formatEur(
      eckdaten.beitragsuebersicht.gesamt_eur,
    )}`;
  }

  let stamp: string;
  try {
    stamp = t('stamp', {
      stichtag: formatIsoDe(eckdaten.stichtag),
      aktenzeichen: eckdaten.quelle_letter_aktenzeichen,
    });
  } catch {
    stamp = `Werte stammen aus Ihrer Renteninformation vom ${formatIsoDe(
      eckdaten.stichtag,
    )} (Az. ${eckdaten.quelle_letter_aktenzeichen}).`;
  }

  return (
    <article
      aria-labelledby={titleId}
      data-testid="yellow-letter-echo-card"
      className={cn(
        'rounded-xl border border-border bg-card p-4 shadow-sm',
      )}
    >
      <header className="flex flex-wrap items-center justify-between gap-2">
        <h3
          id={titleId}
          className="text-sm font-semibold tracking-tight text-foreground"
        >
          <NormZitatSpan text="§ 109 Abs. 3 SGB VI" />
        </h3>
      </header>

      {/* Card-Top-3 (Hard-Line § 11.27) */}
      <dl
        className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3"
        data-testid="yellow-letter-card-top-3"
      >
        <Top3Cell
          label={entgeltpunkteLabel}
          value={formatEntgeltpunkte(
            eckdaten.grundlage_kurzauszug.entgeltpunkte_aktuell,
          )}
          unit={tEckwert('entgeltpunkte_unit')}
          ariaValue={`${formatEntgeltpunkte(
            eckdaten.grundlage_kurzauszug.entgeltpunkte_aktuell,
          )} ${tEckwert('entgeltpunkte_unit')}`}
        />
        <Top3Cell
          label={regelalterLabel}
          value={formatEur(eckdaten.regelalter_prognose_eur_monat)}
          unit={tEckwert('monthly_unit')}
          ariaValue={`${formatEur(eckdaten.regelalter_prognose_eur_monat)} ${tEckwert('monthly_aria')}`}
        />
        <Top3Cell
          label={emRenteLabel}
          value={formatEur(eckdaten.em_rente_prognose_eur_monat)}
          unit={tEckwert('monthly_unit')}
          ariaValue={`${formatEur(eckdaten.em_rente_prognose_eur_monat)} ${tEckwert('monthly_aria')}`}
        />
      </dl>

      {/* Tooltip-2 (Hard-Line § 11.27) */}
      <div
        className="mt-4 flex flex-wrap gap-2"
        data-testid="yellow-letter-tooltips"
      >
        <TooltipAnchor
          label={tEckwert('tooltip_anpassungen_label')}
          body={tooltipAnpassung}
          testId="tooltip-anpassung"
          expandableAriaTemplate={tEckwert('expandable_aria_template', {
            label: tEckwert('tooltip_anpassungen_label'),
          })}
        />
        <TooltipAnchor
          label={tEckwert('tooltip_beitrag_template', {
            jahr: eckdaten.beitragsuebersicht.jahr,
          })}
          body={tooltipBeitrag}
          testId="tooltip-beitrag"
          expandableAriaTemplate={tEckwert('expandable_aria_template', {
            label: tEckwert('tooltip_beitrag_template', {
              jahr: eckdaten.beitragsuebersicht.jahr,
            }),
          })}
        />
      </div>

      {/* Expandable-5 (Hard-Line § 11.27) */}
      <details
        className="mt-4 rounded-lg border border-dashed border-border bg-muted/20 p-3"
        data-testid="yellow-letter-expandable-5"
      >
        <summary
          className={cn(
            'cursor-pointer list-none text-sm font-medium text-foreground',
            'marker:hidden [&::-webkit-details-marker]:hidden',
            'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring rounded',
          )}
        >
          {expandableLabel}
        </summary>
        <ol className="mt-3 list-decimal space-y-2 pl-5 text-xs text-muted-foreground">
          <li>
            <span className="font-medium text-foreground">
              {tEckwert('label_grundlage')}
            </span>
            :{' '}
            {tEckwert('body_grundlage_template', {
              beitragszeit_von: eckdaten.grundlage_kurzauszug.beitragszeit_von,
              beitragszeit_bis: eckdaten.grundlage_kurzauszug.beitragszeit_bis,
              entgeltpunkte: formatEntgeltpunkte(
                eckdaten.grundlage_kurzauszug.entgeltpunkte_aktuell,
              ),
            })}
          </li>
          <li>
            <span className="font-medium text-foreground">
              {tEckwert('label_em_rente')}
            </span>
            :{' '}
            {tEckwert('body_em_rente_template', {
              eur: formatEur(eckdaten.em_rente_prognose_eur_monat),
            })}
          </li>
          <li>
            <span className="font-medium text-foreground">
              {tEckwert('label_regelalter')}
            </span>
            :{' '}
            {tEckwert('body_regelalter_template', {
              eur: formatEur(eckdaten.regelalter_prognose_eur_monat),
            })}
          </li>
          <li>
            <span className="font-medium text-foreground">
              {tEckwert('label_anpassungen')}
            </span>
            :{' '}
            {tEckwert('body_anpassungen_template', {
              prozent: eckdaten.anpassungs_wirkung.beispiel_prozent_p_a,
              plus: formatEur(eckdaten.anpassungs_wirkung.plus_eur_monat),
            })}
          </li>
          <li>
            <span className="font-medium text-foreground">
              {tEckwert('label_beitrag_template', {
                jahr: eckdaten.beitragsuebersicht.jahr,
              })}
            </span>
            :{' '}
            {tEckwert('body_beitrag_template', {
              gesamt: formatEur(eckdaten.beitragsuebersicht.gesamt_eur),
              versicherter: formatEur(
                eckdaten.beitragsuebersicht.versicherter_anteil_eur,
              ),
              arbeitgeber: formatEur(
                eckdaten.beitragsuebersicht.arbeitgeber_anteil_eur,
              ),
            })}
          </li>
        </ol>
      </details>

      <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
        {stamp}
      </p>
    </article>
  );
}

function Top3Cell({
  label,
  value,
  unit,
  ariaValue,
}: {
  label: string;
  value: string;
  unit: string;
  ariaValue: string;
}) {
  return (
    <div
      className={cn(
        'flex flex-col rounded-lg border border-border bg-muted/20 p-3',
      )}
    >
      <dt className="text-[11px] uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd
        className="mt-1 text-lg font-semibold text-foreground"
        aria-label={`${label}: ${ariaValue}`}
      >
        {value}{' '}
        <span className="text-xs font-normal text-muted-foreground">
          {unit}
        </span>
      </dd>
    </div>
  );
}

function TooltipAnchor({
  label,
  body,
  testId,
  expandableAriaTemplate,
}: {
  label: string;
  body: string;
  testId: string;
  expandableAriaTemplate: string;
}) {
  return (
    <details className="group inline-block" data-testid={testId}>
      <summary
        className={cn(
          'inline-flex cursor-pointer list-none items-center gap-1 rounded-md',
          'border border-border bg-muted/30 px-2 py-1 text-xs font-medium text-foreground',
          'hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
          '[&::-webkit-details-marker]:hidden marker:hidden',
        )}
        aria-label={expandableAriaTemplate}
      >
        <Info className="size-3" aria-hidden="true" />
        {label}
      </summary>
      <div
        role="tooltip"
        className={cn(
          'mt-2 rounded-md border border-border bg-popover',
          'p-2 text-xs leading-relaxed text-popover-foreground shadow-md',
        )}
      >
        {body}
      </div>
    </details>
  );
}
