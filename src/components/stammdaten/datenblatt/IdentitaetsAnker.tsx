'use client';

import type { ReactNode } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

import {
  EidCredentialCard,
  type EidDocument,
} from '@/components/onboarding/EidCredentialCard';

import type { DatenblattRow } from './datenblatt-model';

interface IdentitaetsAnkerProps {
  fullName: string;
  /** Already localized (e.g. „Russisch"). */
  nationality: string;
  /** German civilian date `dd.MM.yyyy`. */
  geburtsdatum: string;
  geburtsjahr: string;
  rows: DatenblattRow[];
  /** The credential carrying the eID function; omitted ⇒ card without it. */
  eidDocument?: EidDocument;
  /** Rendered under the facts, hairline-separated (the wallet line). */
  children?: ReactNode;
}

/**
 * Band 1 — the identity anchor (Spec § 4.2). The dark `[MOCK]` credential card
 * is the one strong surface of the screen; the right column states the four
 * identity facts as a plain `<dl>`. No chips, no badges, no buttons: the
 * verification claim lives in a single status line, the provenance in the
 * „Führende Quelle" row.
 */
export function IdentitaetsAnker({
  fullName,
  nationality,
  geburtsdatum,
  geburtsjahr,
  rows,
  eidDocument,
  children,
}: IdentitaetsAnkerProps) {
  const t = useTranslations('stammdaten.datenblatt');

  return (
    <section
      aria-labelledby="sd-identitaet-title"
      data-testid="sd-identitaet"
      className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[300px_1fr] lg:gap-8"
    >
      <EidCredentialCard
        variant="hero"
        name={fullName}
        nationality={nationality}
        birthYear={geburtsjahr}
        birthdate={geburtsdatum}
        document={eidDocument}
      />

      <div className="min-w-0">
        <h2
          id="sd-identitaet-title"
          className="text-xs font-medium uppercase tracking-wide text-text-secondary"
        >
          {t('identitaet.region_label')}
        </h2>
        <p className="mt-1 text-2xl font-semibold tracking-tight text-text-primary">
          {fullName}
        </p>
        <p className="mt-2 flex items-center gap-1.5 text-sm font-medium text-success">
          <CheckCircle2 aria-hidden="true" className="size-4 shrink-0" />
          {t('identitaet.status')}
        </p>

        {/* ≤767px the four facts sit in a compact two-column grid instead of
            four stacked rows (`.sd-ident-grid`, prototype-v2.css) — same
            content, one screen less scroll before the data sheet starts.
            Deliberately NOT an `.m-shelf`: a swipe strip of bare text rows
            clips values mid-word at the viewport edge and reads as broken
            (phone verdict 2026-07-25) — shelves carry cards, not text. */}
        <dl
          data-testid="sd-identitaet-fakten"
          className="sd-ident-grid mt-5 text-sm"
        >
          {/* Narrower label column than the sheet's (110–140px vs 140–180px):
              this dl lives beside the 300px credential card, and the wider
              column pressed values like „Führende Quelle" into a ~110px
              four-line ribbon. */}
          {rows.map((row, idx) => (
            <div
              key={row.id}
              className={`grid grid-cols-1 gap-x-6 py-2 sm:grid-cols-[minmax(110px,140px)_1fr] ${
                idx > 0 ? 'border-t border-border/60' : ''
              }`}
            >
              <dt className="text-text-secondary">{t(row.labelKey)}</dt>
              <dd className="font-medium text-text-primary">{row.value}</dd>
            </div>
          ))}
        </dl>

        {/* „Nachweise & Wallet" sits here, not in the register zone: what you
            hold belongs to who you are, and without it this column ends ~230px
            above the credential card (Spec `stammdaten-blatt-dense.md` § 3.2). */}
        {children ? (
          <div className="mt-5 border-t border-border/60 pt-4">{children}</div>
        ) : null}
      </div>
    </section>
  );
}
