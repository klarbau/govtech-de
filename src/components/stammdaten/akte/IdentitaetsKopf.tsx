'use client';

import { CheckCircle2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

import type { DatenblattRow } from '@/components/stammdaten/datenblatt/datenblatt-model';

interface IdentitaetsKopfProps {
  fullName: string;
  /** Identity rows from the model, in model order — all of them are rendered. */
  rows: DatenblattRow[];
  /** Value rows the screen actually renders (`model.angabenCount`). */
  angaben: number;
  /** Registers that lead them (`deriveRegisterNodes(...).count`). */
  register: number;
}

/**
 * The text half of the identity hero (Spec `stammdaten-akte-v2.md` § 4.3/4.4):
 * the name with its confirmation on one baseline, one grey service line, and
 * the five facts as a white card beneath.
 *
 * „Führende Quelle" is deliberately NOT among them any more — provenance lives
 * in the portrait foot, and since code-review 2026-07-29 (Minor 6) the model
 * does not build that row at all, so nothing has to be filtered out here. The
 * uppercase kicker is gone too: a label above a name that already says who this
 * is only repeats the heading.
 *
 * No `truncate` anywhere: clipped values cost this screen two a11y rounds
 * (WCAG 1.4.10), and the labels hyphenate rather than break mid-word.
 */
export function IdentitaetsKopf({
  fullName,
  rows,
  angaben,
  register,
}: IdentitaetsKopfProps) {
  const t = useTranslations('stammdaten.datenblatt');
  const tA = useTranslations('stammdaten.akte');

  return (
    <div className="min-w-0">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h2
          id="sd-hero-name"
          className="text-[26px] font-semibold leading-tight tracking-tight text-text-primary xl:text-[30px]"
        >
          {fullName}
        </h2>
        <span className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-success">
          <CheckCircle2 aria-hidden="true" className="size-3.5 shrink-0" />
          {tA('identitaet.bestaetigt')}
        </span>
      </div>

      <p
        data-testid="sd-service-line"
        className="mt-2 text-[13px] leading-relaxed text-text-secondary"
      >
        {tA('identitaet.service', { angaben, register })}
      </p>

      {/* The facts get their accessible name from the section, not from an
          `aria-label` on the `<dl>`: a `dl` carries no implicit role, and a
          naming attribute on a role-less element is an axe `aria-prohibited-attr`
          violation. The heading stays visually silent — the hero already has
          one, and a second visible kicker would only repeat it. */}
      <section
        aria-labelledby="sd-fakten-title"
        className="sd-flaeche mt-4 min-w-0 px-5 py-4 md:px-[22px] md:py-[18px]"
      >
        <h3 id="sd-fakten-title" className="sr-only">
          {tA('fakten.region_label')}
        </h3>
        <dl data-testid="sd-fakten" className="sd-fakten-grid gap-x-5 gap-y-4">
          {rows.map((row) => (
            <div key={row.id} className="min-w-0">
              {/* „Staatsangehörigkeit" ist breiter als seine Zelle. Umbrechen
                  muss es also — aber an der Silbengrenze mit Trennstrich, nicht
                  mitten im Wort (Hausidiom `overflow-wrap` + `hyphens: auto`,
                  globals.css). */}
              <dt className="min-w-0 hyphens-auto break-words text-[12px] leading-snug text-text-secondary md:text-[11.5px]">
                {t(row.labelKey)}
              </dt>
              <dd className="mt-1 min-w-0 break-words text-[14px] font-semibold leading-snug text-text-primary md:text-[13.5px]">
                {row.value}
                {row.quelle ? (
                  <span className="mt-1 block text-[12px] font-normal leading-snug text-text-secondary md:text-[11px]">
                    {row.quelle.params
                      ? t(row.quelle.key, row.quelle.params)
                      : t(row.quelle.key)}
                  </span>
                ) : null}
              </dd>
            </div>
          ))}
        </dl>
      </section>
    </div>
  );
}
