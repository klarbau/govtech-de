'use client';

import * as React from 'react';
import Link from 'next/link';
import { notFound, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import {
  ArrowRight,
  Bookmark,
  Building2,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  ExternalLink,
  FileText,
  Info,
  Scale,
  ShieldCheck,
  UploadCloud,
} from 'lucide-react';

import { api } from '@/lib/mock-backend';
import type { LebenslageConfig } from '@/lib/mock-backend/lebenslagen/types';
import type { Behoerde, Persona } from '@/types';
import { formatDateDe } from '@/lib/utils';
import { MobileStickyCta } from '@/components/shared/MobileStickyCta';
import { isGenuineNotFound, loadWithRetry } from './lebenslagen-shared';
import { LebenslageBadge } from './lebenslage-icon';
import { FortschrittRing } from './FortschrittRing';
import {
  SchrittKette,
  type SchrittKetteRow,
  type SchrittKetteZustand,
} from './SchrittKette';

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

/** Schritt-Zustand → Status-Pille der Rail-Überblicksliste. */
const STATUS_PILL: Record<SchrittKetteZustand, { cls: string; key: string }> = {
  erledigt: { cls: 'is-done', key: 'erledigt' },
  aktuell: { cls: 'is-next', key: 'naechster' },
  offen: { cls: 'is-open', key: 'offen' },
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

  if (state.kind === 'not-found') return notFound();

  // `.ak` ist der Papier-Scope (akte-paper.css) — er trägt alle Zustände, damit
  // Skeleton und Fehlerfall dieselbe Fläche haben wie die fertige Seite.
  return (
    <div className="ak">
      {state.kind === 'loading' ? (
        <DetailSkeleton />
      ) : state.kind === 'error' ? (
        <DetailLoadError onRetry={() => setReloadKey((k) => k + 1)} />
      ) : (
        <DetailReady config={state.config} behoerden={state.behoerden} persona={state.persona} />
      )}
    </div>
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
        <h1 className="ak-h1">…</h1>
      </div>
      <div className="ak-kette" style={{ height: 56 }} aria-hidden="true" />
      <div className="lk-layout">
        <div className="ll-main">
          <div className="ll-sec" style={{ height: 120 }} aria-hidden="true" />
          <div className="ll-sec" style={{ height: 180 }} aria-hidden="true" />
        </div>
        <aside className="lk-rail" aria-hidden="true">
          <div className="ak-rail-card" style={{ height: 320 }} />
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

  // Antragsloser Start: der Klick LEGT den Vorgang an (Write-on-Click) und
  // öffnet dann dessen Live-Kaskade. Die Kaskadenseite selbst startet nie.
  const [isStarting, setIsStarting] = React.useState(false);
  const [startError, setStartError] = React.useState(false);

  async function startCascade() {
    setIsStarting(true);
    setStartError(false);
    try {
      const { vorgangId } = await api.starteLebenslage(config.slug, {}, []);
      router.push(`/vorgaenge/${encodeURIComponent(vorgangId)}`);
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

  const ketteRows: SchrittKetteRow[] = config.cascade.map((step, idx) => ({
    position: idx + 1,
    label: step.kurzlabel ?? step.aktion,
    stelle: step.behoerdeKurz,
    zustand: idx === 0 ? 'aktuell' : 'offen',
  }));

  const ersterSchritt = ketteRows[0] ?? null;

  const istAntragslos = config.mode === 'antragslos';
  /**
   * Die Mini-Karte trägt nur eine 1–2-zeilige Notiz. Der antragslose Hinweis ist
   * ein mehrzeiliger Ehrlichkeits-Absatz ([ZUKUNFT]-Phasing) — er steht darum
   * unter der Karte statt in ihr.
   */
  const miniNote = istAntragslos ? null : td('naechster_schritt_body');
  const absatzNote = istAntragslos
    ? config.antragslos_note_key
      ? t(config.antragslos_note_key)
      : td('antragslos.kein_antrag_body')
    : null;
  const antragHref = `/lebenslagen/${config.slug}/antrag`;
  const phaseLabel = td(`phase.${PHASE_LABEL_KEY[config.kategorie]}`);
  const dauer = config.dauer_geschaetzt_key ? t(config.dauer_geschaetzt_key) : null;
  const docCount = config.benoetigte_dokumente_keys.length;

  /** Redaktionelle Meta-Zeile unter dem Lead: primäre Stelle · Schritte ·
   *  Behörden · Dauer. Fehlende Stelle / 0-Werte fallen weg (kein leeres Segment). */
  const metaSegments: string[] = [];
  if (primaryBehoerde) metaSegments.push(primaryBehoerde.name_de);
  if (config.cascade.length > 0) {
    metaSegments.push(t('lebenslagen.meta_schritte', { count: config.cascade.length }));
  }
  if (config.zustaendige_behoerden.length > 0) {
    metaSegments.push(t('lebenslagen.meta_behoerden', { count: config.zustaendige_behoerden.length }));
  }
  if (dauer) metaSegments.push(dauer);

  return (
    <div>
      <nav className="ll-breadcrumb" aria-label={td('breadcrumb_label')}>
        <Link href="/lebenslagen">{td('breadcrumb_root')}</Link>
        <ChevronRight aria-hidden="true" />
        <span>{phaseLabel}</span>
        <ChevronRight aria-hidden="true" />
        <span className="ll-breadcrumb-current">
          {t(`lebenslagen.${config.slug}.title`)}
        </span>
      </nav>

      <div className="gt-page-head ak-head">
        <LebenslageBadge icon={config.icon} />
        <div className="ak-head-text">
          <h1 className="ak-h1">{t(`lebenslagen.${config.slug}.title`)}</h1>
          <div className="sub ak-sub">{t(`lebenslagen.${config.slug}.lead`)}</div>
          {metaSegments.length > 0 ? (
            <p className="ll-meta ak-micro">
              {metaSegments.map((seg, idx) => (
                <React.Fragment key={seg}>
                  {idx > 0 ? (
                    <span className="ll-meta-sep" aria-hidden="true">
                      ·
                    </span>
                  ) : null}
                  <span>{seg}</span>
                </React.Fragment>
              ))}
            </p>
          ) : null}
        </div>
      </div>

      {/* Schritt-Kette — Config-Reihenfolge, direkt unter dem Kopf (Mockup-
          Anatomie); auf der Leistungsseite ist noch nichts vollzogen: alle
          Schritte offen, der erste ist der aktuelle. */}
      <SchrittKette rows={ketteRows} ariaLabel={td('stepper_label')} />

      {/* Zukunft-Banner entfernt (User-Entscheid 2026-07-28): das [ZUKUNFT]-
          Phasing bleibt auf Schritt-Ebene (Kaskaden-Rechtsgrundlagen) und in
          den Kaskaden-Texten erhalten — nur der Seiten-Banner ist weg. */}

      {/* Fristen-Rescue (wow-#12) — ehrlicher „ohne Antrag verfällt Geld"-Beat;
          Datum aus Persona-Seed, €-Wert „geschätzt ca.". */}
      {rescue ? (
        <div className="ll-note" role="note" aria-labelledby="ll-fr-title">
          <h2 id="ll-fr-title" className="ll-note-title">
            {rescue.titel}
          </h2>
          <p className="ll-note-body">{rescue.body}</p>
          <p className="ll-note-status">{rescue.status}</p>
        </div>
      ) : null}

      <div className="lk-layout">
        <div className="ll-main">
          {/* Zuständige Stellen — löst die Intro-Karte ab (ohne Lead-Doppelung). */}
          <section className="ll-sec" aria-labelledby="ll-stellen-title">
            <h2 id="ll-stellen-title" className="ll-h2 ak-sec-title">
              <Building2 className="ak-sec-icon" aria-hidden="true" />
              {td('section.zustaendige_stellen')}
            </h2>
            <div className="ll-stellen">
              <p className="ll-stellen-name">
                {primaryBehoerde?.name_de ?? config.zustaendige_behoerden[0]}
                {primaryBehoerde ? (
                  <span className="ll-stellen-kat">
                    {' '}
                    ({td(`kategorie.${primaryBehoerde.kategorie}`)})
                  </span>
                ) : null}
              </p>
              {primaryBehoerde ? (
                <p className="ll-stellen-addr">
                  {primaryBehoerde.adresse.strasse} {primaryBehoerde.adresse.hausnummer}
                  {', '}
                  {primaryBehoerde.adresse.plz} {primaryBehoerde.adresse.ort}
                </p>
              ) : null}
              {weitereBehoerden.length > 0 ? (
                <details className="ll-disclosure ll-stellen-disclosure">
                  <summary className="ll-disclosure-summary">
                    <span>
                      {td('stellen_disclosure', { count: weitereBehoerden.length })}
                    </span>
                    <ChevronDown className="ll-disclosure-chevron" aria-hidden="true" />
                  </summary>
                  <ul className="ll-stellen-list">
                    {weitereBehoerden.map((name) => (
                      <li key={name}>{name}</li>
                    ))}
                  </ul>
                </details>
              ) : null}
            </div>
          </section>

          {/* Voraussetzungen — schlichte Liste mit hängenden Markern. */}
          {config.voraussetzungen_keys.length > 0 ? (
            <section className="ll-sec" aria-labelledby="ll-vor-title">
              <h2 id="ll-vor-title" className="ll-h2 ak-sec-title">
                <CheckCircle2 className="ak-sec-icon" aria-hidden="true" />
                {td('section.voraussetzungen')}
              </h2>
              <ul className="ll-reqlist">
                {config.voraussetzungen_keys.map((key) => (
                  <li key={key}>{t(key)}</li>
                ))}
              </ul>
            </section>
          ) : null}

          {/* Benötigte Nachweise — interaktiv; [MOCK] einmal auf Sektionsebene. */}
          {docCount > 0 ? (
            <section className="ll-sec" aria-labelledby="ll-dok-title">
              <div className="ll-sec-head">
                <h2 id="ll-dok-title" className="ll-h2 ak-sec-title">
                  <FileText className="ak-sec-icon" aria-hidden="true" />
                  {td('section.dokumente')}
                </h2>
                <span className="ll-mock-rail">{td('mock_marker')}</span>
              </div>
              <ul className="ll-doklist">
                {config.benoetigte_dokumente_keys.map((key, idx) => {
                  const ausstehend = idx === docCount - 1;
                  return (
                    <li key={key}>
                      <span className="ll-dok-name">{t(key)}</span>
                      {ausstehend ? (
                        <span className="ak-pill is-next ll-dok-status">
                          {td('nachweis_ausstehend')}
                        </span>
                      ) : (
                        <span className="ak-pill is-done ll-dok-status">
                          <Check aria-hidden="true" />
                          {td('nachweis_hochgeladen')}
                        </span>
                      )}
                      {ausstehend ? (
                        <button type="button" className="btn btn-secondary btn-sm ll-dok-action">
                          {td('nachweis_hochladen')}
                        </button>
                      ) : (
                        <button type="button" className="ak-link-action ll-dok-action">
                          {td('nachweis_anzeigen')}
                          <ExternalLink aria-hidden="true" />
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>
              <button type="button" className="ll-dropzone ll-dok-dropzone">
                <span className="ak-dz-ic" aria-hidden="true">
                  <UploadCloud />
                </span>
                <span className="ak-dz-text">
                  <span>{td('nachweis_dropzone')}</span>
                  <span className="ak-dz-hint">{td('nachweis_dropzone_hint')}</span>
                </span>
              </button>
            </section>
          ) : null}

          {/* Once-Only — Produkt-Kernbotschaft: die EINZIGE Content-Fläche mit
              weichem Hintergrund-Shift (Box-Eskalationsstufe 2). */}
          {autoFields.length > 0 ? (
            <section className="ll-oo-panel" aria-labelledby="ll-oo-auto-title">
              <h2 id="ll-oo-auto-title" className="ll-h2 ll-oo-title">
                {td('section.once_only_auto')}
                <span className="ll-oo-qualifier">{td('once_only_qualifier')}</span>
              </h2>
              <p className="ll-oo-intro">{td('once_only_intro')}</p>
              <p className="ll-oo-datensparsam">{td('datensparsam')}</p>
              <ul className="ll-oo-grid">
                {autoFields.map((field) => (
                  <li key={field.key}>
                    <Check className="ak-oo-check" aria-hidden="true" />
                    <span>{t(`lebenslagen.${config.slug}.fields.${field.key}.label`)}</span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {/* Rechtsgrundlagen — die längste Referenz-Wand kollabiert (closed by
              default, alle Viewports); Frist bleibt darunter immer sichtbar. */}
          {config.rechtsgrundlagen.length > 0 ? (
            <section className="ll-sec" aria-labelledby="ll-recht-title">
              <details className="ll-disclosure">
                <summary className="ll-disclosure-summary">
                  <h2 id="ll-recht-title" className="ll-h2 ll-disclosure-h2 ak-sec-title">
                    <Scale className="ak-sec-icon" aria-hidden="true" />
                    {td('section.rechtsgrundlagen')}
                  </h2>
                  <ChevronDown className="ll-disclosure-chevron" aria-hidden="true" />
                </summary>
                <dl className="ll-recht-list ll-disclosure-body">
                  {config.rechtsgrundlagen.map((rg) => (
                    <div key={rg.norm} className="ll-recht-row">
                      <dt className="ll-recht-norm">{rg.norm}</dt>
                      <dd className="ll-recht-bedeutung">{t(rg.bedeutung_key)}</dd>
                    </div>
                  ))}
                </dl>
              </details>
            </section>
          ) : null}

          {/* Fristen & Gebühren — bleibt AUSGEKLAPPT (kurz, trägt die rechtlich
              wichtige Frist). */}
          <section className="ll-sec" aria-labelledby="ll-fg-title">
            <h2 id="ll-fg-title" className="ll-h2 ak-sec-title">
              <Clock className="ak-sec-icon" aria-hidden="true" />
              {td('section.fristen_gebuehren')}
            </h2>
            <dl className="ll-fg-list">
              <div className="ll-fg-row">
                <dt>{td('frist_label')}</dt>
                <dd>{config.frist ? t(config.frist.beschreibung_key) : td('keine_frist')}</dd>
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

        {/* Rail = EINE durchgehende berandete Karte; innen per Hairline
            gegliedert. Der Fortschritts-Ring (<FortschrittRing>) gehört der
            Akte — vor der Erstellung ist nichts vollzogen. */}
        <aside className="lk-rail" aria-label={td('rail_vorgang_label')}>
          <div className="ak-rail-card">
            {ketteRows.length > 0 ? (
              <section className="ak-rail-block" aria-labelledby="ll-fortschritt-title">
                <h2 id="ll-fortschritt-title" className="ak-rail-h ak-rail-h-solo">
                  {td('rail_fortschritt_title')}
                </h2>
                <FortschrittRing
                  erledigt={0}
                  gesamt={ketteRows.length}
                  zaehler={`0/${ketteRows.length}`}
                  sub={td('ring_sub')}
                  lead={td('fortschritt_pre_lead')}
                  hinweis={td('fortschritt_pre_hint')}
                />
              </section>
            ) : null}

            <section className="ak-rail-block" aria-labelledby="ll-next-title">
              <div className="ak-rail-head">
                <h2 id="ll-next-title" className="ak-rail-h">
                  {istAntragslos ? td('antragslos.kein_antrag_title') : td('naechster_schritt')}
                </h2>
                <span className="ak-pill is-empfohlen">{td('rail_empfohlen')}</span>
              </div>

              {ersterSchritt ? (
                <div className="ak-mini">
                  <span className="ak-mini-num" aria-hidden="true">
                    {ersterSchritt.position}
                  </span>
                  <div className="ak-mini-body">
                    <p className="ak-mini-title">{ersterSchritt.label}</p>
                    {ersterSchritt.stelle ? (
                      <p className="ak-mini-stelle">{ersterSchritt.stelle}</p>
                    ) : null}
                    {miniNote ? <p className="ak-mini-note">{miniNote}</p> : null}
                  </div>
                  <ChevronRight className="ak-mini-chev" aria-hidden="true" />
                </div>
              ) : null}
              {absatzNote ? <p className="ll-next-body ak-rail-note">{absatzNote}</p> : null}

              <div className="ll-next-actions ak-rail-actions">
                <MobileStickyCta>
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
                </MobileStickyCta>
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

            {ketteRows.length > 0 ? (
              <section className="ak-rail-block" aria-labelledby="ll-ueberblick-title">
                <h2 id="ll-ueberblick-title" className="ak-rail-h ak-rail-h-solo">
                  {td('rail_ueberblick_title')}
                </h2>
                <ol className="ak-ueberblick">
                  {ketteRows.map((row) => {
                    const status = STATUS_PILL[row.zustand];
                    return (
                      <li key={row.position} className={`ak-ub-row is-${row.zustand}`}>
                        <span className="ak-ub-num" aria-hidden="true">
                          {row.zustand === 'erledigt' ? <Check /> : row.position}
                        </span>
                        <span className="ak-ub-body">
                          <span className="ak-ub-title">{row.label}</span>
                          {row.stelle ? (
                            <span className="ak-ub-stelle">{row.stelle}</span>
                          ) : null}
                        </span>
                        {/* Mockup-Anatomie: Pille nur für Erledigt/Nächster
                            Schritt — offene Zeilen bleiben ruhig (sr-only). */}
                        {row.zustand === 'offen' ? (
                          <span className="sr-only">
                            {td(`schritt_status.${status.key}`)}
                          </span>
                        ) : (
                          <span className={`ak-pill ${status.cls} ak-ub-pill`}>
                            {td(`schritt_status.${status.key}`)}
                          </span>
                        )}
                      </li>
                    );
                  })}
                </ol>
              </section>
            ) : null}

            <section className="ak-rail-block ak-secure" aria-labelledby="ll-sicher-title">
              <ShieldCheck className="ak-secure-icon" aria-hidden="true" />
              <div className="ak-secure-body">
                <h2 id="ll-sicher-title" className="ak-rail-h ak-rail-h-solo">
                  {td('daten_sicher_title')}
                </h2>
                <p className="ak-secure-text">{td('datenschutz_body')}</p>
                <Link href="/datenschutz" className="ll-datenschutz-link">
                  {td('datenschutz_link')}
                  <ExternalLink aria-hidden="true" />
                </Link>
              </div>
            </section>
          </div>
        </aside>
      </div>
    </div>
  );
}
