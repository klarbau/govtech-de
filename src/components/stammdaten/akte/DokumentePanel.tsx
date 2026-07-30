'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';

import {
  EidCredentialCard,
  type EidDocument,
} from '@/components/onboarding/EidCredentialCard';
import { formatDateDe } from '@/lib/utils';
import type { Behoerde, Document } from '@/types';

interface DokumentePanelProps {
  fullName: string;
  nationality: string;
  /** German civilian date `dd.MM.yyyy`. */
  geburtsdatum: string;
  geburtsjahr: string;
  eidDocument?: EidDocument;
  documents: Document[];
  behoerdenById: Record<string, Behoerde>;
  /** Present-dialog trigger; only offered for the eAT (see `istVorzeigbar`). */
  onPresent: (doc: Document) => void;
}

/**
 * Only the electronic residence permit is offered for presentation — the same
 * gate `DokumenteView` uses. The dialog shows eAT attributes, so offering it on
 * anything else would claim fields the credential does not carry.
 */
export function istVorzeigbar(doc: Document): boolean {
  return doc.eudi_compatible && doc.typ === 'aufenthaltstitel';
}

/**
 * Register „Dokumente" (Spec § 4.6): the eID credential as the one strong
 * plane, then the ID papers as quiet hairline rows — not four identical tiles
 * with a download icon each. Downloading lives in the vault, one click away;
 * duplicating it here would be a copy without a purpose. There is no upload
 * flow in this demo, so there is no „+"-tile either.
 */
export function DokumentePanel({
  fullName,
  nationality,
  geburtsdatum,
  geburtsjahr,
  eidDocument,
  documents,
  behoerdenById,
  onPresent,
}: DokumentePanelProps) {
  const t = useTranslations('stammdaten.akte');
  const tD = useTranslations('stammdaten.datenblatt');
  const tPresent = useTranslations('dokumente.present');

  const gueltigBis = (doc: Document) =>
    doc.gueltig_bis
      ? tD('value.gueltig_bis', { datum: formatDateDe(doc.gueltig_bis) })
      : t('dokumente.ohne_ablauf');

  return (
    <div className="flex flex-col gap-y-10">
      {eidDocument ? (
        <section
          aria-labelledby="sd-eid-title"
          data-testid="sd-eid-karte"
          className="min-w-0"
        >
          <h2
            id="sd-eid-title"
            className="text-[11px] font-semibold uppercase tracking-[0.12em] text-text-secondary"
          >
            {t('dokumente.eid_titel')}
          </h2>
          <div className="mt-3 max-w-[360px]">
            <EidCredentialCard
              variant="hero"
              name={fullName}
              nationality={nationality}
              birthYear={geburtsjahr}
              birthdate={geburtsdatum}
              document={eidDocument}
            />
          </div>
        </section>
      ) : null}

      <section
        aria-labelledby="sd-dokumente-title"
        data-testid="sd-dokumente-liste"
        className="min-w-0 border-t border-border pt-4"
      >
        <h2
          id="sd-dokumente-title"
          className="text-[11px] font-semibold uppercase tracking-[0.12em] text-text-secondary"
        >
          {t('dokumente.title')}
        </h2>

        {documents.length === 0 ? (
          <p className="mt-3 text-sm text-text-secondary">{t('dokumente.leer')}</p>
        ) : (
          <ul className="mt-3">
            {documents.map((doc, idx) => (
              <li
                key={doc.id}
                className={`flex flex-wrap items-start justify-between gap-x-4 gap-y-2 py-3 ${
                  idx > 0 ? 'border-t border-border/60' : ''
                }`}
              >
                <div className="min-w-0 flex-1">
                  <p className="min-w-0 break-words text-sm font-medium text-text-primary">
                    {doc.titel}
                  </p>
                  <p className="mt-0.5 min-w-0 break-words text-xs leading-snug text-text-secondary">
                    {behoerdenById[doc.ausstellende_behoerde_id]?.name_de ??
                      doc.ausstellende_behoerde_id}
                    {' · '}
                    {gueltigBis(doc)}
                  </p>
                </div>
                {istVorzeigbar(doc) ? (
                  <button
                    type="button"
                    onClick={() => onPresent(doc)}
                    aria-label={tPresent('button_aria', { name: doc.titel })}
                    className="inline-flex min-h-11 items-center rounded-md border border-border px-3 text-sm font-medium text-text-primary transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                  >
                    {t('aktionen.nachweis')}
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
        )}

        <Link
          href="/dokumente"
          className="mt-1 inline-flex min-h-11 items-center text-sm font-medium text-primary hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          {t('dokumente.alle')}
        </Link>
      </section>
    </div>
  );
}
