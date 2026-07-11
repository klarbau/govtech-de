'use client';

import * as React from 'react';
import Link from 'next/link';
import { notFound, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import {
  ArrowRight,
  Bookmark,
  Check,
  ChevronRight,
  Clock,
  Eye,
  FileText,
  Info,
  Landmark,
  ListChecks,
  Lock,
  MapPin,
  Rocket,
  Scale,
  ShieldCheck,
  UploadCloud,
} from 'lucide-react';

import { api } from '@/lib/mock-backend';
import type { LebenslageConfig } from '@/lib/mock-backend/lebenslagen/types';
import type { Behoerde, Persona } from '@/types';
import { formatDateDe } from '@/lib/utils';
import { iconForConfig, isGenuineNotFound, loadWithRetry } from './lebenslagen-shared';

interface LeistungDetailViewProps {
  slug: string;
}

type LoadState =
  | { kind: 'loading' }
  | { kind: 'not-found' }
  | { kind: 'error' }
  | {
      kind: 'ready';
      config: LebenslageConfig;
      behoerden: Behoerde[];
      /** Nur geladen, wenn `config.frist_rescue` gesetzt ist (Anker-Auflösung). */
      persona: Persona | null;
    };

/** config.kategorie → Lebensphasen-Label (Breadcrumb). */
const PHASE_LABEL_KEY: Record<LebenslageConfig['kategorie'], string> = {
  familie: 'familie',
  wohnen: 'wohnen',
  arbeit: 'arbeit',
  migration: 'migration',
  steuern: 'steuern',
  mehr: 'mehr',
};

export function LeistungDetailView({ slug }: LeistungDetailViewProps) {
  const [state, setState] = React.useState<LoadState>({ kind: 'loading' });
  const [reloadKey, setReloadKey] = React.useState(0);

  React.useEffect(() => {
    let cancelled = false;
    setState({ kind: 'loading' });
    (async () => {
      try {
        const config = await loadWithRetry(() => api.getLebenslageConfig(slug));
        if (cancelled) return;
        if (!config) {
          setState({ kind: 'not-found' });
          return;
        }
        let behoerden: Behoerde[] = [];
        try {
          behoerden = await loadWithRetry(() => api.getBehoerden());
        } catch {
          behoerden = [];
        }
        // Persona nur laden, wenn diese Lebenslage einen Fristen-Rescue-Beat
        // trägt (Anker-Datum stammt aus dem Persona-Seed, nie aus Date.now()).
        let persona: Persona | null = null;
        if (config.frist_rescue) {
          try {
            persona = await loadWithRetry(() => api.getProfile());
          } catch {
            persona = null;
          }
        }
        if (!cancelled) setState({ kind: 'ready', config, behoerden, persona });
      } catch (err) {
        // Nur ein genuiner Not-Found-Fehler darf 404 rendern; ein transienter
        // (5%) Latenzfehler nach erschöpften Retries zeigt einen Retry-Zustand.
        if (!cancelled) setState({ kind: isGenuineNotFound(err) ? 'not-found' : 'error' });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [slug, reloadKey]);

  if (state.kind === 'loading') return <DetailSkeleton />;
  if (state.kind === 'not-found') return notFound();
  if (state.kind === 'error') return <DetailLoadError onRetry={() => setReloadKey((k) => k + 1)} />;

  return (
    <DetailReady config={state.config} behoerden={state.behoerden} persona={state.persona} />
  );
}

/**
 * Jüngstes Kind = spätestes (ISO-max) `geburtsdatum` aus `persona.familie.kinder`.
 * `null`, wenn die Persona keine (datierten) Kinder trägt → der Fristen-Rescue-
 * Beat rendert dann nicht (kein erfundenes Datum, §5-Guardrail).
 */
function resolveJuengstesKindGeburtsdatum(persona: Persona | null): string | null {
  const daten = (persona?.familie?.kinder ?? [])
    .map((k) => k.geburtsdatum)
    .filter((d): d is string => typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d));
  if (daten.length === 0) return null;
  return [...daten].sort().at(-1) ?? null;
}

/** Addiert `months` Kalendermonate auf ein ISO-Datum. `null` bei ungültiger Eingabe. */
function addMonths(iso: string, months: number): Date | null {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  d.setMonth(d.getMonth() + months);
  return d;
}

function DetailLoadError({ onRetry }: { onRetry: () => void }) {
  const td = useTranslations('lebenslagen.detail');
  const tc = useTranslations('common.cta');
  return (
    <div className="gt-page-head">
      <div className="gt-banner amber" role="alert">
        <Info aria-hidden="true" />
        <div>
          <strong>{td('load_error')}</strong>
        </div>
      </div>
      <button type="button" className="btn btn-secondary" onClick={onRetry} style={{ marginTop: 12 }}>
        {tc('erneut_versuchen')}
      </button>
    </div>
  );
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

function DetailReady({
  config,
  behoerden,
  persona,
}: {
  config: LebenslageConfig;
  behoerden: Behoerde[];
  persona: Persona | null;
}) {
  const t = useTranslations();
  const td = useTranslations('lebenslagen.detail');
  const router = useRouter();
  const Icon = iconForConfig(config.icon);

  // Antragsloser Start: der Klick LEGT den Vorgang an (Write-on-Click) und
  // öffnet dann dessen Live-Kaskade. Die Kaskadenseite selbst startet nie.
  const [isStarting, setIsStarting] = React.useState(false);
  const [startError, setStartError] = React.useState(false);

  async function startCascade() {
    setIsStarting(true);
    setStartError(false);
    try {
      const { vorgangId } = await api.starteLebenslage(config.slug, {}, []);
      router.push(
        `/lebenslagen/${config.slug}/cascade?vorgangId=${encodeURIComponent(vorgangId)}`,
      );
    } catch {
      setStartError(true);
      setIsStarting(false);
    }
  }

  /**
   * Fristen-Rescue (wow-#12): Datum deterministisch aus dem Persona-Seed
   * (jüngstes Kind) + `frist_monate` — nie aus `Date.now()`. Ohne auflösbaren
   * Anker bleibt der Beat aus.
   */
  const rescue = React.useMemo(() => {
    const fr = config.frist_rescue;
    if (!fr) return null;
    const anker =
      fr.anker === 'juengstes_kind_geburtsdatum'
        ? resolveJuengstesKindGeburtsdatum(persona)
        : null;
    if (!anker) return null;
    const deadline = addMonths(anker, fr.frist_monate);
    if (!deadline) return null;
    // Nur zeigen, solange das Anspruchsfenster offen ist. `new Date()` ist hier
    // AUSSCHLIESSLICH das Sichtbarkeits-Gate — das angezeigte Datum bleibt
    // seed-abgeleitet (Anker + frist_monate), nicht aus der Uhr erfunden. Bei
    // einer Persona mit älterem Kind (Fenster längst zu) bleibt der Beat aus.
    if (deadline.getTime() <= new Date().getTime()) return null;
    return {
      titel: t(fr.titel_key),
      body: t(fr.body_key, {
        datum: formatDateDe(deadline),
        betrag: fr.betrag_geschaetzt_eur,
        norm: fr.norm,
      }),
      status: t(fr.status_key),
    };
  }, [config.frist_rescue, persona, t]);

  const behoerdenById = React.useMemo(() => {
    const map: Record<string, Behoerde> = {};
    for (const b of behoerden) map[b.id] = b;
    return map;
  }, [behoerden]);

  const primaryBehoerde = behoerdenById[config.zustaendige_behoerden[0]];
  const weitereBehoerden = config.zustaendige_behoerden
    .slice(1)
    .map((id) => behoerdenById[id]?.name_de ?? id);

  /** Once-Only: register-sourced, non-user-decision fields are auto-prepared. */
  const autoFields = config.formFields.filter(
    (f) => f.prefill.path && !f.prefill.user_decision,
  );

  const istAntragslos = config.mode === 'antragslos';
  const antragHref = `/lebenslagen/${config.slug}/antrag`;
  const phaseLabel = td(`phase.${PHASE_LABEL_KEY[config.kategorie]}`);
  const dauer = config.dauer_geschaetzt_key ? t(config.dauer_geschaetzt_key) : '—';
  const docCount = config.benoetigte_dokumente_keys.length;

  return (
    <div>
      <nav className="ll-breadcrumb" aria-label={td('breadcrumb_label')}>
        <Link href="/lebenslagen">{td('breadcrumb_root')}</Link>
        <ChevronRight aria-hidden="true" />
        <span className="ll-breadcrumb-current">{phaseLabel}</span>
      </nav>

      <div className="gt-page-head">
        <h1>{t(`lebenslagen.${config.slug}.title`)}</h1>
        <div className="sub">{t(`lebenslagen.${config.slug}.lead`)}</div>
      </div>

      {/* Stepper — config.cascade order */}
      {config.cascade.length > 0 ? (
        <div
          className="ll-stepper"
          role="group"
          aria-label={td('stepper_label')}
          tabIndex={0}
        >
          <ol className="ll-stepper-track">
            {config.cascade.map((step, idx) => (
              <li
                key={step.id}
                className={`ll-step${idx === 0 ? ' is-current' : ''}`}
              >
                <span className="ll-step-num" aria-hidden="true">
                  {idx + 1}
                </span>
                <span className="ll-step-body">
                  <span className="ll-step-label">{step.kurzlabel ?? step.aktion}</span>
                  {step.behoerdeKurz ? (
                    <span className="ll-step-sub">{step.behoerdeKurz}</span>
                  ) : null}
                </span>
                {idx < config.cascade.length - 1 ? (
                  <ChevronRight className="ll-step-sep" aria-hidden="true" />
                ) : null}
              </li>
            ))}
          </ol>
        </div>
      ) : null}

      {config.zukunft ? (
        <div className="gt-banner amber ll-zukunft-banner" role="note">
          <Info aria-hidden="true" />
          <div>
            <strong>{td('zukunft_banner_badge')}</strong> {td('zukunft_banner_body')}
            {/* antragslos configs already surface this note in the `ll-next`
               card below — only render it here for non-antragslos (hybrid)
               configs like `geburt`, else `kindergeld` would show it twice. */}
            {config.antragslos_note_key && !istAntragslos ? (
              <> {t(config.antragslos_note_key)}</>
            ) : null}
          </div>
        </div>
      ) : null}

      <div className="lk-layout" style={{ marginTop: 20 }}>
        <div className="ll-main">
          {/* L0 — Fristen-Rescue (wow-#12): ehrlicher „ohne Antrag verfällt
              Geld"-Beat; Datum aus Persona-Seed, €-Wert „geschätzt ca.". */}
          {rescue ? (
            <section className="gt-card" aria-labelledby="ll-fr-title" role="note">
              <div className="ll-intro-head">
                <span className="icon-circle lg" aria-hidden="true">
                  <Clock />
                </span>
                <div>
                  <h2 id="ll-fr-title" className="gt-card-title">
                    {rescue.titel}
                  </h2>
                  <p className="ll-intro-lead">{rescue.body}</p>
                  <div style={{ marginTop: 10 }}>
                    <span className="badge amber">{rescue.status}</span>
                  </div>
                </div>
              </div>
            </section>
          ) : null}

          {/* L1 — Was enthalten ist */}
          <section className="gt-card" aria-labelledby="ll-intro-title">
            <div className="ll-intro-head">
              <span className="icon-circle lg" aria-hidden="true">
                <Icon />
              </span>
              <div>
                <h2 id="ll-intro-title" className="gt-card-title">
                  {td('section.enthalten')}
                </h2>
                <p className="ll-intro-lead">{t(`lebenslagen.${config.slug}.lead`)}</p>
              </div>
            </div>

            <div className="ll-stellen">
              <div className="ll-stellen-block">
                <span className="ll-stellen-label">{td('zustaendige_behoerde')}</span>
                <div className="ll-stellen-primary">
                  <span className="ll-behoerde-name">
                    {primaryBehoerde?.name_de ?? config.zustaendige_behoerden[0]}
                  </span>
                  {primaryBehoerde ? (
                    <span className="badge outline ll-kat-badge">
                      {td(`kategorie.${primaryBehoerde.kategorie}`)}
                    </span>
                  ) : null}
                </div>
                {primaryBehoerde ? (
                  <p className="ll-stellen-addr">
                    <MapPin aria-hidden="true" />
                    <span>
                      {primaryBehoerde.adresse.strasse} {primaryBehoerde.adresse.hausnummer}
                      {', '}
                      {primaryBehoerde.adresse.plz} {primaryBehoerde.adresse.ort}
                    </span>
                  </p>
                ) : null}
              </div>

              {weitereBehoerden.length > 0 ? (
                <div className="ll-stellen-block">
                  <span className="ll-stellen-label">{td('beteiligte_stellen')}</span>
                  <div className="ll-stellen-chips">
                    {weitereBehoerden.map((name) => (
                      <span key={name} className="badge outline">
                        {name}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          </section>

          {/* L2 — Voraussetzungen */}
          {config.voraussetzungen_keys.length > 0 ? (
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
          ) : null}

          {/* L3 — Benötigte Nachweise (presentational [MOCK] status) */}
          {docCount > 0 ? (
            <section className="gt-card" aria-labelledby="ll-dok-title">
              <div className="gt-card-head">
                <h2 id="ll-dok-title" className="gt-card-title">
                  <FileText aria-hidden="true" />
                  {td('section.dokumente')}
                </h2>
                <span className="ll-mock-rail">{td('mock_marker')}</span>
              </div>
              <ul className="ll-doklist">
                {config.benoetigte_dokumente_keys.map((key, idx) => {
                  const ausstehend = idx === docCount - 1;
                  return (
                    <li key={key}>
                      <FileText aria-hidden="true" />
                      <span className="ll-dok-name">{t(key)}</span>
                      {ausstehend ? (
                        <span className="badge amber ll-dok-status">
                          {td('nachweis_ausstehend')}
                        </span>
                      ) : (
                        <span className="badge green ll-dok-status">
                          <Check aria-hidden="true" />
                          {td('nachweis_hochgeladen')}
                        </span>
                      )}
                      <button type="button" className="btn btn-secondary btn-sm ll-dok-action">
                        {ausstehend ? td('nachweis_hochladen') : td('nachweis_anzeigen')}
                      </button>
                    </li>
                  );
                })}
              </ul>
              <button type="button" className="ll-dropzone ll-dok-dropzone">
                <UploadCloud aria-hidden="true" />
                <span>{td('nachweis_dropzone')}</span>
                <span className="ll-mock-rail">{td('mock_marker')}</span>
              </button>
            </section>
          ) : null}

          {/* L4 — Once-Only auto-prepared fields */}
          {autoFields.length > 0 ? (
            <section className="gt-card" aria-labelledby="ll-oo-auto-title">
              <div className="gt-card-head ll-oo-head">
                <h2 id="ll-oo-auto-title" className="gt-card-title">
                  {td('section.once_only_auto')}
                  <span className="ll-oo-qualifier">{td('once_only_qualifier')}</span>
                </h2>
                <span className="badge green ll-oo-badge">
                  <ShieldCheck aria-hidden="true" />
                  {td('datensparsam')}
                </span>
              </div>
              <p className="ll-oo-intro">{td('once_only_intro')}</p>
              <ul className="ll-oo-grid">
                {autoFields.map((field) => (
                  <li key={field.key}>
                    <Check aria-hidden="true" />
                    <span>{t(`lebenslagen.${config.slug}.fields.${field.key}.label`)}</span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {/* L5 — Rechtsgrundlagen + Fristen & Gebühren */}
          <div className="ll-bottom-row">
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

            <section className="gt-card" aria-labelledby="ll-fg-title">
              <div className="gt-card-head">
                <h2 id="ll-fg-title" className="gt-card-title">
                  <Clock aria-hidden="true" />
                  {td('section.fristen_gebuehren')}
                </h2>
              </div>
              <dl className="ll-fg-list">
                <div className="ll-fg-row">
                  <dt>{td('frist_label')}</dt>
                  <dd>
                    {config.frist ? t(config.frist.beschreibung_key) : td('keine_frist')}
                  </dd>
                </div>
                <div className="ll-fg-row">
                  <dt>{td('dauer_geschaetzt')}</dt>
                  <dd>{dauer}</dd>
                </div>
                <div className="ll-fg-row">
                  <dt>{td('gebuehren_label')}</dt>
                  <dd>
                    {config.gebuehr.gibt_es ? (
                      <span className="ll-fg-geb">
                        <span className="ll-fg-betrag">
                          {config.gebuehr.betrag_key ? t(config.gebuehr.betrag_key) : ''}
                        </span>
                        <span className="ll-mock-rail">{td('mock_payment')}</span>
                        {config.gebuehr.hinweis_key ? (
                          <span className="ll-fg-hinweis">{t(config.gebuehr.hinweis_key)}</span>
                        ) : null}
                      </span>
                    ) : config.gebuehr.hinweis_key ? (
                      t(config.gebuehr.hinweis_key)
                    ) : (
                      td('keine_gebuehr')
                    )}
                  </dd>
                </div>
              </dl>
            </section>
          </div>
        </div>

        <aside className="lk-rail" aria-label={td('rail_label')}>
          {/* R1 — Auf einen Blick */}
          <section className="gt-card" aria-labelledby="ll-blick-title">
            <h2 id="ll-blick-title" className="gt-card-title llh-rail-title">
              <Eye aria-hidden="true" />
              {td('auf_einen_blick')}
            </h2>
            <dl className="ll-blick-list">
              <div className="ll-blick-row">
                <dt>
                  <Clock aria-hidden="true" />
                  {td('gesamtdauer')}
                </dt>
                <dd>{dauer}</dd>
              </div>
              <div className="ll-blick-row">
                <dt>
                  <ListChecks aria-hidden="true" />
                  {td('schritte_insgesamt')}
                </dt>
                <dd>{config.cascade.length}</dd>
              </div>
              <div className="ll-blick-row">
                <dt>
                  <Landmark aria-hidden="true" />
                  {td('beteiligte_behoerden_count')}
                </dt>
                <dd>{config.zustaendige_behoerden.length}</dd>
              </div>
            </dl>
          </section>

          {/* R2 — Ihre Daten sind geschützt */}
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

          {/* R3 — Nächster Schritt (CTA) */}
          <section className="gt-card ll-next" aria-labelledby="ll-next-title">
            <div className="ll-next-head">
              <span className="icon-circle green" aria-hidden="true">
                <Rocket />
              </span>
              <h2 id="ll-next-title" className="gt-card-title">
                {istAntragslos ? td('antragslos.kein_antrag_title') : td('naechster_schritt')}
              </h2>
            </div>
            <p className="ll-next-body">
              {istAntragslos
                ? config.antragslos_note_key
                  ? t(config.antragslos_note_key)
                  : td('antragslos.kein_antrag_body')
                : td('naechster_schritt_body')}
            </p>
            <div className="ll-next-actions">
              {istAntragslos ? (
                <button
                  type="button"
                  className="btn btn-primary ll-next-primary"
                  onClick={startCascade}
                  disabled={isStarting}
                >
                  <ArrowRight aria-hidden="true" />
                  {td('cta_cascade_start')}
                </button>
              ) : (
                <Link href={antragHref} className="btn btn-primary ll-next-primary">
                  {td('cta_beantragen')}
                  <ArrowRight aria-hidden="true" />
                </Link>
              )}
              <button type="button" className="btn btn-secondary ll-next-save">
                <Bookmark aria-hidden="true" />
                {td('vorgang_speichern')}
              </button>
            </div>
            {startError ? (
              <p className="ll-next-foot" role="alert">
                {td('load_error')}
              </p>
            ) : null}
            <p className="ll-next-foot">{td('vorgang_fortsetzen')}</p>
          </section>
        </aside>
      </div>
    </div>
  );
}
