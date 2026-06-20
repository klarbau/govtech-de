'use client';

import * as React from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { useTranslations } from 'next-intl';
import {
  ArrowRight,
  Check,
  Clock,
  Euro,
  FileText,
  Info,
  Landmark,
  Lock,
  Scale,
  ShieldCheck,
  Sparkles,
  UploadCloud,
} from 'lucide-react';

import { api } from '@/lib/mock-backend';
import type { LebenslageConfig } from '@/lib/mock-backend/lebenslagen/types';
import type { Behoerde } from '@/types';
import { iconForConfig } from './lebenslagen-shared';

interface LeistungDetailViewProps {
  slug: string;
}

type LoadState =
  | { kind: 'loading' }
  | { kind: 'not-found' }
  | { kind: 'ready'; config: LebenslageConfig; behoerden: Behoerde[] };

export function LeistungDetailView({ slug }: LeistungDetailViewProps) {
  const [state, setState] = React.useState<LoadState>({ kind: 'loading' });

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const config = await api.getLebenslageConfig(slug);
        if (cancelled) return;
        if (!config) {
          setState({ kind: 'not-found' });
          return;
        }
        let behoerden: Behoerde[] = [];
        try {
          behoerden = await api.getBehoerden();
        } catch {
          behoerden = [];
        }
        if (!cancelled) setState({ kind: 'ready', config, behoerden });
      } catch {
        if (!cancelled) setState({ kind: 'not-found' });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  if (state.kind === 'loading') return <DetailSkeleton />;
  if (state.kind === 'not-found') return notFound();

  return <DetailReady config={state.config} behoerden={state.behoerden} />;
}

function DetailSkeleton() {
  const tCommon = useTranslations('common');
  return (
    <div role="status" aria-busy="true">
      <span className="sr-only">{tCommon('loading')}</span>
      <div className="gt-page-head">
        <h1>…</h1>
      </div>
      <div className="lk-layout">
        <div className="ll-main">
          <div className="gt-card" style={{ height: 160 }} />
          <div className="gt-card" style={{ height: 200 }} />
        </div>
        <aside className="lk-rail" aria-hidden="true">
          <div className="gt-card" style={{ height: 180 }} />
        </aside>
      </div>
    </div>
  );
}

function DetailReady({ config, behoerden }: { config: LebenslageConfig; behoerden: Behoerde[] }) {
  const t = useTranslations();
  const td = useTranslations('lebenslagen.detail');
  const Icon = iconForConfig(config.icon);

  const behoerdenById = React.useMemo(() => {
    const map: Record<string, Behoerde> = {};
    for (const b of behoerden) map[b.id] = b;
    return map;
  }, [behoerden]);

  const primaryBehoerde = behoerdenById[config.zustaendige_behoerden[0]];
  const weitereBehoerden = config.zustaendige_behoerden
    .slice(1)
    .map((id) => behoerdenById[id]?.name_de ?? id);

  const prefilledCount = config.formFields.filter(
    (f) => f.prefill.path && !f.prefill.user_decision,
  ).length;

  const istAntragslos = config.mode === 'antragslos';
  const antragHref = `/lebenslagen/${config.slug}/antrag`;
  const cascadeHref = `/lebenslagen/${config.slug}/cascade`;

  return (
    <div>
      <div className="gt-page-head">
        <h1>{t(`lebenslagen.${config.slug}.title`)}</h1>
        <div className="sub">{t(`lebenslagen.${config.slug}.lead`)}</div>
      </div>

      {config.zukunft ? (
        <div className="gt-banner amber ll-zukunft-banner" role="note">
          <Info aria-hidden="true" />
          <div>
            <strong>{td('zukunft_banner_badge')}</strong> {td('zukunft_banner_body')}
          </div>
        </div>
      ) : null}

      <div className="lk-layout" style={{ marginTop: 20 }}>
        <div className="ll-main">
          {/* 1 — Intro + zuständige Behörde */}
          <section className="gt-card" aria-labelledby="ll-intro-title">
            <div className="ll-intro-head">
              <span className="icon-circle lg" aria-hidden="true">
                <Icon />
              </span>
              <div>
                <h2 id="ll-intro-title" className="gt-card-title">
                  {td('section.intro')}
                </h2>
                <p className="ll-intro-lead">{t(`lebenslagen.${config.slug}.lead`)}</p>
              </div>
            </div>
            <dl className="ll-behoerde-row">
              <dt>{td('zustaendige_behoerde')}</dt>
              <dd>
                <span className="ll-behoerde-name">
                  {primaryBehoerde?.name_de ?? config.zustaendige_behoerden[0]}
                </span>
                {primaryBehoerde ? (
                  <span className="badge outline ll-kat-badge">
                    {td(`kategorie.${primaryBehoerde.kategorie}`)}
                  </span>
                ) : null}
              </dd>
            </dl>
            {weitereBehoerden.length > 0 ? (
              <p className="ll-weitere">
                {td('weitere_behoerden')}: {weitereBehoerden.join(' · ')}
              </p>
            ) : null}
          </section>

          {/* 2 — Voraussetzungen */}
          <section className="gt-card" aria-labelledby="ll-vor-title">
            <div className="gt-card-head">
              <h2 id="ll-vor-title" className="gt-card-title">
                <Check aria-hidden="true" />
                {td('section.voraussetzungen')}
              </h2>
            </div>
            <ul className="ll-checklist">
              {config.voraussetzungen_keys.map((key) => (
                <li key={key}>
                  <Check aria-hidden="true" />
                  <span>{t(key)}</span>
                </li>
              ))}
            </ul>
          </section>

          {/* 3 — Benötigte Dokumente */}
          <section className="gt-card" aria-labelledby="ll-dok-title">
            <div className="gt-card-head">
              <h2 id="ll-dok-title" className="gt-card-title">
                <FileText aria-hidden="true" />
                {td('section.dokumente')}
              </h2>
            </div>
            <ul className="ll-doklist">
              {config.benoetigte_dokumente_keys.map((key) => (
                <li key={key}>
                  <FileText aria-hidden="true" />
                  <span className="ll-dok-name">{t(key)}</span>
                  <span className="ll-prefill-chip is-upload">
                    <UploadCloud aria-hidden="true" />
                    {td('upload_mock_chip')}
                  </span>
                </li>
              ))}
            </ul>
          </section>

          {/* 4 — Rechtsgrundlagen */}
          <section className="gt-card" aria-labelledby="ll-recht-title">
            <div className="gt-card-head">
              <h2 id="ll-recht-title" className="gt-card-title">
                <Scale aria-hidden="true" />
                {td('section.rechtsgrundlagen')}
              </h2>
            </div>
            <dl className="ll-recht-list">
              {config.rechtsgrundlagen.map((rg) => (
                <div key={rg.norm} className="ll-recht-row">
                  <dt className="ll-recht-norm">{rg.norm}</dt>
                  <dd className="ll-recht-bedeutung">{t(rg.bedeutung_key)}</dd>
                </div>
              ))}
            </dl>
          </section>

          {/* 5 — Frist / Gebühr */}
          <div className="ll-ministats">
            <section className="gt-card ll-ministat" aria-labelledby="ll-frist-title">
              <span className="icon-circle" aria-hidden="true">
                <Clock />
              </span>
              <h3 id="ll-frist-title">{td('section.frist')}</h3>
              <p>
                {config.frist
                  ? t(config.frist.beschreibung_key)
                  : td('keine_frist')}
              </p>
            </section>
            <section className="gt-card ll-ministat" aria-labelledby="ll-geb-title">
              <span className="icon-circle" aria-hidden="true">
                <Euro />
              </span>
              <h3 id="ll-geb-title">{td('section.gebuehr')}</h3>
              {config.gebuehr.gibt_es ? (
                <>
                  <p className="ll-geb-betrag">
                    {config.gebuehr.betrag_key ? t(config.gebuehr.betrag_key) : ''}
                    <span className="ll-mock-rail">{td('mock_payment')}</span>
                  </p>
                  {config.gebuehr.hinweis_key ? (
                    <p className="ll-geb-hinweis">{t(config.gebuehr.hinweis_key)}</p>
                  ) : null}
                </>
              ) : (
                <p>{config.gebuehr.hinweis_key ? t(config.gebuehr.hinweis_key) : td('keine_gebuehr')}</p>
              )}
            </section>
          </div>

          {/* CTA */}
          {istAntragslos ? (
            <section className="ll-antragslos" aria-labelledby="ll-antragslos-title">
              <span className="icon-circle green" aria-hidden="true">
                <Sparkles />
              </span>
              <div className="ll-antragslos-body">
                <h2 id="ll-antragslos-title">{td('antragslos.kein_antrag_title')}</h2>
                <p>
                  {config.antragslos_note_key
                    ? t(config.antragslos_note_key)
                    : td('antragslos.kein_antrag_body')}
                </p>
                <Link href={cascadeHref} className="btn btn-primary">
                  <ArrowRight aria-hidden="true" />
                  {td('cta_cascade_view')}
                </Link>
              </div>
            </section>
          ) : (
            <div className="ll-cta-row">
              <Link href={antragHref} className="btn btn-primary btn-lg">
                {td('cta_beantragen')}
                <ArrowRight aria-hidden="true" />
              </Link>
            </div>
          )}
        </div>

        <aside className="lk-rail" aria-label={td('rail_label')}>
          <section className="gt-card lk-secure">
            <span className="icon-circle green" aria-hidden="true">
              <Lock />
            </span>
            <h2 className="lk-secure-title">{td('datenschutz_title')}</h2>
            <p className="lk-secure-body">{td('datenschutz_body')}</p>
            <Link href="/datenschutz" className="btn btn-secondary lk-secure-link">
              <ShieldCheck aria-hidden="true" />
              {td('datenschutz_link')}
            </Link>
          </section>

          <section className="gt-card ll-once-only" aria-labelledby="ll-oo-title">
            <span className="icon-circle" aria-hidden="true">
              <Landmark />
            </span>
            <h2 id="ll-oo-title" className="ll-once-only-title">
              {td('once_only_title')}
            </h2>
            <p className="ll-once-only-note">
              {td('once_only_note', { count: prefilledCount })}
            </p>
          </section>
        </aside>
      </div>
    </div>
  );
}
