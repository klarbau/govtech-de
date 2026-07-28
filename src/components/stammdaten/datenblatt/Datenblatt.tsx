'use client';

import Link from 'next/link';
import { Check } from 'lucide-react';
import { useTranslations } from 'next-intl';

import type { DatenblattQuelle, DatenblattSection } from './datenblatt-model';

interface DatenblattProps {
  sektionen: DatenblattSection[];
}

/**
 * Hand-balanced column split of the ≥1280px sheet (Spec
 * `stammdaten-blatt-dense.md` § 3.3): these sections go left, every other one
 * right. No runtime balancing — „kontakt" always renders (the e-mail is always
 * set) and dokumente/versicherung/kennungen are never all empty at once, so
 * neither column can come up empty.
 */
const SPALTE_1 = new Set(['kontakt', 'anschrift', 'familie']);

/**
 * Sections whose values are short enough for two fields per line from 768px on
 * (Partner│Kinder, Kasse│Vorsorge). Everything else keeps the full column
 * width: an address is multi-line anyway, and e-mail addresses, Aktenzeichen
 * and identifier numbers are exactly the values that break at the wrong place
 * in a half column — „anna.petrov@example.de" behind the `[MOCK]` prefix, and
 * „ABH-B-2024/IV-A-1782" mid-Aktenzeichen at its hyphen. ≤767px everything is
 * single-column inside the carousel slides.
 */
const ZWEI_PRO_ZEILE = new Set(['familie', 'versicherung']);

/** Sections whose values are identifiers — set in tabular figures. */
const ZIFFERN_SEKTIONEN = new Set(['dokumente', 'kennungen']);

/**
 * Band 2 — the register extract itself (Spec § 4.3). Boxless from 768px on: the
 * sheet carries no surface of its own, its sections stand typographically on the
 * ambient the way the register list does. The one strong plane of the screen
 * stays the eID card.
 *
 * Fields are set in the card idiom — micro label ABOVE the value, source line
 * under it — instead of label-left/value-right table rows: proximity groups,
 * whitespace separates. Hairlines exist only above a section head. Values that
 * are missing were never turned into rows by `buildDatenblattModel`, so nothing
 * here renders a dash or an empty section.
 *
 * ≤767px the same DOM becomes a card carousel (`prototype-v2.css` #9) where the
 * per-slide chrome is what bounds a swipe.
 */
export function Datenblatt({ sektionen }: DatenblattProps) {
  const t = useTranslations('stammdaten.datenblatt');

  const quelleText = (quelle: DatenblattQuelle) =>
    quelle.params ? t(quelle.key, quelle.params) : t(quelle.key);

  const renderSektion = (sektion: DatenblattSection, sektionIdx: number) => (
    <div
      key={sektion.id}
      data-testid={`sd-datenblatt-section-${sektion.id}`}
      /* 24px + Haarlinie + 16px = die 40px Sektionsdistanz der Spec. Die erste
         Sektion beider Spalten setzt auf derselben Höhe an, sodass ihre
         Haarlinie als eine durchgehende Blattkante liest. */
      className={
        sektionIdx > 0
          ? 'mt-6 border-t border-border pt-4'
          : 'mt-4 border-t border-border pt-4'
      }
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-text-secondary">
          {t(sektion.titleKey)}
        </h3>
        {sektion.quelle ? (
          <p className="text-xs text-text-secondary">{quelleText(sektion.quelle)}</p>
        ) : null}
      </div>

      <dl
        className={`mt-3 grid gap-x-8 gap-y-4 ${
          ZWEI_PRO_ZEILE.has(sektion.id) ? 'md:grid-cols-2' : ''
        }`}
      >
        {sektion.rows.map((row) => (
          <div key={row.id} className="min-w-0">
            <dt className="text-[10px] font-medium uppercase tracking-[0.14em] text-text-secondary">
              {t(row.labelKey)}
            </dt>
            <dd className="mt-0.5 min-w-0">
              <span
                /* `break-words`, weil E-Mail und Aktenzeichen keine natürliche
                   Trennstelle haben und in einer halben Spalte sonst in die
                   Nachbarspalte laufen würden. */
                className={`whitespace-pre-line break-words text-[15px] font-medium leading-snug text-text-primary ${
                  ZIFFERN_SEKTIONEN.has(sektion.id) || row.id === 'kontakt.mobil'
                    ? 'tabular-nums'
                    : ''
                }`}
              >
                {row.value}
              </span>
              {row.verifiziert ? (
                <span className="ms-2 inline-flex items-center gap-1 whitespace-nowrap text-xs text-text-secondary">
                  <Check aria-hidden="true" className="size-3.5 text-success" />
                  {t('value.verifiziert')}
                </span>
              ) : null}
              {row.quelle ? (
                <span className="mt-0.5 block text-xs leading-snug text-text-secondary">
                  {quelleText(row.quelle)}
                </span>
              ) : null}
            </dd>
          </div>
        ))}
      </dl>

      {/* Steht linksbündig unter der Adresse — mit dem Label über dem Wert gibt
          es keine Label-Spalte mehr, an der die Aktion sich ausrichten müsste. */}
      {sektion.id === 'anschrift' ? (
        <Link
          href="/vorgaenge/umzug/start"
          className="inline-flex min-h-11 items-center text-sm font-medium text-primary hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          {t('anschrift_link')}
        </Link>
      ) : null}
    </div>
  );

  return (
    <section aria-labelledby="sd-datenblatt-title" data-testid="sd-datenblatt">
      {/* Gleiche Größe wie die Sektionsköpfe, aber in Primärfarbe: das Band
          bekommt seinen Titel, ohne wieder ein fetter Kartentitel zu werden. */}
      <h2
        id="sd-datenblatt-title"
        className="text-[11px] font-semibold uppercase tracking-[0.12em] text-text-primary"
      >
        {t('title')}
      </h2>

      {/* ≥1280px the wrapper becomes the two-column form sheet (prototype-v2.css
          #11): the wide gutter separates the columns, no spine hairline. At
          768–1279px the WRAPPER is `display:contents` while the two
          `.sd-blatt-col` stay real boxes stacked in the sheet — the sections keep
          their single-column rhythm inside them (review fix #4: the sections are
          NOT direct children of the sheet there). ≤767px it turns into a
          horizontal card carousel (`.m-shelf` + per-slide card chrome, #9) with
          the columns transparent, so the slides are the sections. The wrapper is
          that carousel's scroll container — focusable with a visible ring so
          keyboard access never depends on which section happens to carry a link
          (WCAG 2.1.1/2.4.7, a11y INFO-1; same pattern as the Steuer/Dokumente
          shelves). */}
      <div
        className="sd-blatt-shelf m-shelf rounded-sm focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
        role="group"
        tabIndex={0}
        aria-labelledby="sd-datenblatt-title"
      >
        <div className="sd-blatt-col">
          {sektionen.filter((s) => SPALTE_1.has(s.id)).map(renderSektion)}
        </div>
        <div className="sd-blatt-col">
          {sektionen.filter((s) => !SPALTE_1.has(s.id)).map(renderSektion)}
        </div>
      </div>
    </section>
  );
}
