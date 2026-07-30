'use client';

import * as React from 'react';
import Link from 'next/link';
import { Check, Copy } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { formatDateDe } from '@/lib/utils';
import type { Behoerde, Persona, Stammdaten } from '@/types';

interface UeberblickPanelProps {
  persona: Persona;
  stammdaten: Stammdaten;
  behoerdenById: Record<string, Behoerde>;
}

/**
 * What the residence title is actually called. „§ 18g AufenthG" is a citation,
 * not an answer — the title's official heading is „Blaue Karte EU", Mehmet's
 * „Aufenthaltserlaubnis zur selbständigen Tätigkeit" (§ 21 AufenthG). An
 * unknown norm falls back to the bare citation; guessing a name would be an
 * invented legal claim.
 */
const TITEL_BEZEICHNUNG: Record<string, string> = {
  '§ 18g AufenthG': 'status.bezeichnung_18g',
  '§ 21 AufenthG': 'status.bezeichnung_21',
};

/**
 * Ein deutsches LTR-Token (Normzitat, Behördenname, Kennung) in ggf.
 * fremdsprachiger Prosa: `lang` für die Sprachausgabe (WCAG 3.1.2), die
 * `<bdi dir="ltr">`-Isolierung gegen die BiDi-Zerlegung unter `dir="rtl"` —
 * ohne sie rutscht das § in AR ans Zeilenende („18g AufenthG §").
 * Hausmuster: `OriginaltextBlock`, `OnboardingTransparency`.
 */
function DeToken({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <bdi lang="de" dir="ltr" className={className}>
      {children}
    </bdi>
  );
}

function StatusZeile({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-1 gap-x-6 gap-y-0.5 border-t border-border/60 py-2.5 first:border-t-0 first:pt-0 sm:grid-cols-[minmax(140px,180px)_1fr]">
      <dt className="text-sm text-text-secondary">{label}</dt>
      <dd className="min-w-0 break-words text-sm font-medium text-text-primary">
        {children}
      </dd>
    </div>
  );
}

/**
 * The Aktenzeichen with its copy control — the ONE place on this screen where
 * the number appears (Spec § 2 C5). Same mechanics as `VorgangDetailLoader`,
 * plus a polite live region: a bare icon swap says nothing to a screen reader.
 */
function AktenzeichenWert({ value }: { value: string }) {
  const t = useTranslations('stammdaten.akte');
  const tv = useTranslations('vorgang.detail');
  const [copied, setCopied] = React.useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard?.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      // Clipboard unavailable (insecure context / denied) — no-op.
    }
  };

  return (
    <span className="inline-flex flex-wrap items-center gap-x-1.5 gap-y-1">
      <DeToken className="tabular-nums">{value}</DeToken>
      <button
        type="button"
        onClick={handleCopy}
        aria-label={tv('aktenzeichen_copy_aria')}
        className="-m-2.5 inline-flex size-11 items-center justify-center rounded-md text-text-secondary transition-colors hover:bg-muted hover:text-text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        {copied ? (
          <Check className="size-4 text-success" aria-hidden="true" />
        ) : (
          <Copy className="size-4" aria-hidden="true" />
        )}
      </button>
      <span aria-live="polite" className="sr-only">
        {copied ? t('status.az_kopiert') : ''}
      </span>
    </span>
  );
}

/**
 * Card A of the register „Überblick" (Spec `stammdaten-akte-v2.md` § 4.6) —
 * what currently applies: the residence title or the ID document she holds.
 *
 * The running Vorgänge left this panel for the rail: they are a standing list,
 * not a detail of the „Überblick" register, and in the rail they stay visible
 * while she reads the sheet.
 *
 * No deadline countdown and no traffic-light chip: the residence deadline is
 * carried once, by the dashboard nudge. Saying it twice would be claiming it
 * twice.
 */
export function UeberblickPanel({
  persona,
  stammdaten,
  behoerdenById,
}: UeberblickPanelProps) {
  const t = useTranslations('stammdaten.akte');

  const aufenthalt = persona.aufenthaltstitel;
  const bezeichnungKey = aufenthalt
    ? TITEL_BEZEICHNUNG[aufenthalt.norm]
    : undefined;
  const abh = aufenthalt?.abh_behoerde_id
    ? behoerdenById[aufenthalt.abh_behoerde_id]
    : undefined;

  const ausweis = stammdaten.dokumente_refs.personalausweis
    ? {
        labelKey: 'status.ausweis_personalausweis',
        ...stammdaten.dokumente_refs.personalausweis,
      }
    : stammdaten.dokumente_refs.reisepass
      ? {
          labelKey: 'status.ausweis_reisepass',
          ...stammdaten.dokumente_refs.reisepass,
        }
      : undefined;

  return (
    <section
      aria-labelledby="sd-status-title"
      data-testid="sd-status-block"
      className="sd-flaeche min-w-0 px-5 pb-5 pt-[18px] md:px-6 md:pb-[22px] md:pt-5"
    >
      <h2
        id="sd-status-title"
        className="text-[15px] font-semibold text-text-primary"
      >
        {t('status.title')}
      </h2>

      {aufenthalt ? (
        <>
          <dl className="sd-status-dl mt-3 max-w-3xl">
            <StatusZeile label={t('status.aufenthalt_label')}>
              {bezeichnungKey ? `${t(bezeichnungKey)} · ` : null}
              <DeToken>{aufenthalt.norm}</DeToken>
            </StatusZeile>
            <StatusZeile label={t('status.gueltig_bis_label')}>
              {formatDateDe(aufenthalt.valid_until)}
            </StatusZeile>
            {abh ? (
              <StatusZeile label={t('status.behoerde_label')}>
                <DeToken>{abh.name_de}</DeToken>
              </StatusZeile>
            ) : null}
            <StatusZeile label={t('status.az_label')}>
              <AktenzeichenWert value={aufenthalt.az} />
            </StatusZeile>
          </dl>
          {/* The AZR is the one leading register of this screen that the
              register rail does not list (`CURATED_REGISTERS`); without this
              line the „geführt von N Registern" service line would implicitly
              claim the residence status came from one of the counted ones. */}
          <p className="mt-3 max-w-3xl text-xs leading-relaxed text-text-secondary">
            {t('status.quelle_aufenthalt')}
          </p>
          <Link
            href="/lebenslagen/aufenthalt-verlaengerung"
            className="mt-1 inline-flex min-h-11 items-center text-sm font-medium text-primary hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            {t('status.verlaengerung_link')}
          </Link>
        </>
      ) : ausweis ? (
        <dl className="sd-status-dl mt-3 max-w-3xl">
          <StatusZeile label={t('status.ausweis_label')}>
            {t(ausweis.labelKey)}
          </StatusZeile>
          <StatusZeile label={t('status.ausweis_nummer_label')}>
            <DeToken className="tabular-nums">{ausweis.nummer}</DeToken>
          </StatusZeile>
          <StatusZeile label={t('status.gueltig_bis_label')}>
            {formatDateDe(ausweis.gueltig_bis)}
          </StatusZeile>
        </dl>
      ) : (
        <p className="mt-3 max-w-3xl text-sm text-text-secondary">
          {t('status.leer')}
        </p>
      )}
    </section>
  );
}
