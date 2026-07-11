import { getTranslations } from 'next-intl/server';
import { ExternalLink } from 'lucide-react';

import { DgsErklaervideoPlaceholder } from '@/components/a11y/DgsErklaervideoPlaceholder';
import { BarriereMeldenForm } from '@/components/barrierefreiheit/BarriereMeldenForm';
import { LiquidGlassScreen } from '@/components/layout/LiquidGlassScreen';
import { Breadcrumb } from '@/components/shared/Breadcrumb';
import { MockWatermarkBanner } from '@/components/shared/MockWatermarkBanner';

export const dynamic = 'force-dynamic';

/**
 * Erklärung zur Barrierefreiheit (Spec: docs/specs/barrierefreiheit-v2.md §4.3).
 * Text-geführte Statement-Seite im Gov-Register — kein Karten-Grid, keine
 * Icon-Tiles; Hierarchie über Weißraum + Überschriften (ai-design-tells).
 * Ehrlicher [MOCK]-Status: Demonstration, keine amtliche Konformitätserklärung.
 */
export default async function BarrierefreiheitPage() {
  const tShell = await getTranslations('shell.breadcrumb');
  const t = await getTranslations('barrierefreiheit');
  const tDgs = await getTranslations('a11y.dgs');

  return (
    <>
      <LiquidGlassScreen name="barrierefreiheit" />
      <Breadcrumb
        items={[
          { label: tShell('home'), href: '/dashboard' },
          { label: t('page.title') },
        ]}
      />

      <article className="mx-auto flex max-w-3xl flex-col gap-10 py-2">
        <header className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight text-text-primary">
              {t('page.title')}
            </h1>
            <MockWatermarkBanner variant="inline" />
          </div>
          <p className="text-sm leading-relaxed text-text-secondary">
            {t('page.intro')}
          </p>
        </header>

        <section
          aria-labelledby="barrierefreiheit-status"
          className="flex flex-col gap-3"
        >
          <h2
            id="barrierefreiheit-status"
            className="text-lg font-semibold text-text-primary"
          >
            {t('status.heading')}
          </h2>
          <p className="text-sm leading-relaxed text-text-secondary">
            {t('status.body')}
          </p>
          <p className="text-sm text-text-secondary">
            {[t('status.wcag'), t('status.bitv'), t('status.en')].join(' · ')}
          </p>
          <dl className="grid gap-x-6 gap-y-1.5 text-sm sm:grid-cols-[auto_1fr]">
            <dt className="font-medium text-text-primary">
              {t('status.stand_label')}
            </dt>
            <dd className="text-text-secondary">{t('status.stand_value')}</dd>
            <dt className="font-medium text-text-primary">
              {t('status.konformitaet_label')}
            </dt>
            <dd className="text-text-secondary">
              {t('status.konformitaet_value')}
            </dd>
          </dl>
        </section>

        <section
          aria-labelledby="barrierefreiheit-limitations"
          className="flex flex-col gap-3"
        >
          <h2
            id="barrierefreiheit-limitations"
            className="text-lg font-semibold text-text-primary"
          >
            {t('limitations.heading')}
          </h2>
          <p className="text-sm leading-relaxed text-text-secondary">
            {t('limitations.intro')}
          </p>
          <ul className="ml-4 flex list-disc flex-col gap-1.5 text-sm leading-relaxed text-text-secondary">
            <li>{t('limitations.item_onboarding')}</li>
            <li>{t('limitations.item_vorgang')}</li>
            <li>{t('limitations.item_dark')}</li>
            <li>{t('limitations.item_mock')}</li>
          </ul>
        </section>

        <section
          aria-labelledby="barrierefreiheit-dgs"
          className="flex flex-col gap-3"
        >
          <h2
            id="barrierefreiheit-dgs"
            className="text-lg font-semibold text-text-primary"
          >
            {tDgs('heading')}
          </h2>
          <DgsErklaervideoPlaceholder />
        </section>

        <section
          aria-labelledby="barrierefreiheit-melden"
          className="flex flex-col gap-3"
        >
          <h2
            id="barrierefreiheit-melden"
            className="text-lg font-semibold text-text-primary"
          >
            {t('melden.heading')}
          </h2>
          <p className="text-sm leading-relaxed text-text-secondary">
            {t('melden.intro')}
          </p>
          <BarriereMeldenForm />
        </section>

        <section
          aria-labelledby="barrierefreiheit-schlichtung"
          className="flex flex-col gap-3"
        >
          <h2
            id="barrierefreiheit-schlichtung"
            className="text-lg font-semibold text-text-primary"
          >
            {t('schlichtung.heading')}
          </h2>
          <p className="text-sm leading-relaxed text-text-secondary">
            {t('schlichtung.body')}
          </p>
          <a
            href="https://www.schlichtungsstelle-bgg.de"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex w-fit items-center gap-1.5 text-sm font-medium text-primary underline underline-offset-4 hover:no-underline"
          >
            {t('schlichtung.link')}
            <ExternalLink className="size-3.5" aria-hidden="true" />
          </a>
        </section>

        <section
          aria-labelledby="barrierefreiheit-more"
          className="flex flex-col gap-3"
        >
          <h2
            id="barrierefreiheit-more"
            className="text-lg font-semibold text-text-primary"
          >
            {t('more.heading')}
          </h2>
          <p className="text-sm leading-relaxed text-text-secondary">
            {t('more.panel_hint')}
          </p>
        </section>
      </article>
    </>
  );
}
