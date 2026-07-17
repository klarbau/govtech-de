'use client';

import * as React from 'react';
import { notFound, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { ArrowLeft, Euro, Fingerprint, Info, Landmark, Lock, UploadCloud } from 'lucide-react';

import { EidConfirmDialog } from '@/components/umzug/EidConfirmDialog';
import { api } from '@/lib/mock-backend';
import type {
  CascadeStepConfig,
  LebenslageConfig,
} from '@/lib/mock-backend/lebenslagen/types';
import type { Behoerde, Persona } from '@/types';
import { formatPrefillValue, isGenuineNotFound, loadWithRetry, resolvePath } from './lebenslagen-shared';

interface AntragFormProps {
  slug: string;
}

interface FieldState {
  value: string;
  /** Genuines, nicht prefillbares Eingabefeld (user_decision oder path null). */
  isUserInput: boolean;
}

type LoadState =
  | { kind: 'loading' }
  | { kind: 'not-found' }
  | { kind: 'error' }
  | { kind: 'ready'; config: LebenslageConfig; persona: Persona; behoerden: Behoerde[] };

export function AntragForm({ slug }: AntragFormProps) {
  const [state, setState] = React.useState<LoadState>({ kind: 'loading' });
  const [reloadKey, setReloadKey] = React.useState(0);

  React.useEffect(() => {
    let cancelled = false;
    setState({ kind: 'loading' });
    (async () => {
      try {
        const config = await loadWithRetry(() => api.getLebenslageConfig(slug));
        if (cancelled) return;
        if (!config || config.mode === 'antragslos') {
          setState({ kind: 'not-found' });
          return;
        }
        const [persona, behoerden] = await Promise.all([
          loadWithRetry(() => api.getProfile()),
          loadWithRetry(() => api.getBehoerden()).catch(() => [] as Behoerde[]),
        ]);
        if (!cancelled) setState({ kind: 'ready', config, persona, behoerden });
      } catch (err) {
        // Transienter (5%) Latenzfehler → Retry-Zustand; nur ein genuiner
        // Not-Found-Fehler rendert 404.
        if (!cancelled) setState({ kind: isGenuineNotFound(err) ? 'not-found' : 'error' });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [slug, reloadKey]);

  if (state.kind === 'loading') return <FormSkeleton />;
  if (state.kind === 'not-found') return notFound();
  if (state.kind === 'error') return <FormLoadError onRetry={() => setReloadKey((k) => k + 1)} />;

  return (
    <AntragFormReady
      config={state.config}
      persona={state.persona}
      behoerden={state.behoerden}
    />
  );
}

function FormLoadError({ onRetry }: { onRetry: () => void }) {
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

function FormSkeleton() {
  const tCommon = useTranslations('common');
  return (
    <div role="status" aria-busy="true">
      <span className="sr-only">{tCommon('loading')}</span>
      <div className="gt-page-head">
        <h1>…</h1>
      </div>
      <div className="gt-card" style={{ height: 320 }} />
    </div>
  );
}

function AntragFormReady({
  config,
  persona,
  behoerden,
}: {
  config: LebenslageConfig;
  persona: Persona;
  behoerden: Behoerde[];
}) {
  const router = useRouter();
  const t = useTranslations();
  const td = useTranslations('lebenslagen.detail');
  const tf = useTranslations(`lebenslagen.${config.slug}.fields`);

  const behoerdeName = React.useCallback(
    (id: string) => behoerden.find((b) => b.id === id)?.name_de ?? id,
    [behoerden],
  );

  // Persona-Prefill für jedes Feld einmalig auflösen.
  const initialFields = React.useMemo(() => {
    const map: Record<string, FieldState> = {};
    for (const f of config.formFields) {
      const isUserInput = !f.prefill.path || f.prefill.user_decision === true;
      const resolved = isUserInput ? '' : formatPrefillValue(resolvePath(persona, f.prefill.path));
      map[f.key] = { value: resolved, isUserInput };
    }
    return map;
  }, [config.formFields, persona]);

  const [fields, setFields] = React.useState<Record<string, FieldState>>(initialFields);
  const [uploads, setUploads] = React.useState<Record<string, boolean>>({});

  // Consent-Hops der Kaskade (gate==='consent'); gesammelt werden die Config-IDs.
  const consentSteps = React.useMemo<CascadeStepConfig[]>(
    () => config.cascade.filter((s) => s.gate === 'consent'),
    [config.cascade],
  );
  const [granted, setGranted] = React.useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    for (const s of consentSteps) init[s.id] = true; // Default opt-in, sichtbar abwählbar.
    return init;
  });

  const [eidOpen, setEidOpen] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  // Pflichtfeld-Validierung (a11y): invalide Feld-Keys nach einem Submit-Versuch.
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, boolean>>({});

  const clearFieldError = React.useCallback((key: string) => {
    setFieldErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }, []);

  /** Leere/ungesetzte Pflichtfelder (Text/Datum/Zahl/Checkbox/Upload). */
  const findInvalidFields = React.useCallback((): string[] => {
    const invalid: string[] = [];
    for (const f of config.formFields) {
      if (!f.required) continue;
      if (f.typ === 'upload') {
        if (!uploads[f.key]) invalid.push(f.key);
      } else if (f.typ === 'checkbox') {
        if (fields[f.key]?.value !== 'true') invalid.push(f.key);
      } else if ((fields[f.key]?.value ?? '').trim() === '') {
        invalid.push(f.key);
      }
    }
    return invalid;
  }, [config.formFields, fields, uploads]);

  // Datenminimierung: Datenkategorien je Empfänger-Behörde, abgeleitet aus der
  // Kaskade. Consent-Empfänger sind erst aktiv, wenn ihre Einwilligung an ist.
  const recipientGroups = React.useMemo(() => {
    return config.cascade
      .filter((s) => !s.visibleIf || s.visibleIf(persona))
      .map((s) => ({
        stepId: s.id,
        behoerdeId: s.behoerdeId,
        name: behoerdeName(s.behoerdeId),
        kategorien: s.datenkategorien,
        gate: s.gate,
        active: s.gate !== 'consent' || granted[s.id] === true,
      }));
  }, [config.cascade, persona, behoerdeName, granted]);

  function handleConfirm() {
    const grantedConsentIds = consentSteps
      .filter((s) => granted[s.id] === true)
      .map((s) => s.id);
    const formValues: Record<string, unknown> = {};
    for (const [key, fs] of Object.entries(fields)) formValues[key] = fs.value;

    return (async () => {
      try {
        const { vorgangId } = await api.starteLebenslage(config.slug, formValues, grantedConsentIds);
        router.push(
          `/lebenslagen/${config.slug}/cascade?vorgangId=${encodeURIComponent(vorgangId)}`,
        );
      } catch (e) {
        setError(e instanceof Error ? e.message : td('submit_error'));
      }
    })();
  }

  const primaryBehoerdeName = behoerdeName(config.zustaendige_behoerden[0]);

  return (
    <div>
      <div className="gt-page-head">
        <Link href={`/lebenslagen/${config.slug}`} className="ll-back-link">
          <ArrowLeft aria-hidden="true" />
          {td('back_to_detail')}
        </Link>
        <h1>{td('antrag_title', { leistung: t(`lebenslagen.${config.slug}.title`) })}</h1>
        <div className="sub">{td('antrag_lead')}</div>
      </div>

      {error ? (
        <div className="gt-banner amber" role="alert">
          {error}
        </div>
      ) : null}

      <form
        className="lk-layout"
        style={{ marginTop: 8 }}
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          setError(null);
          const invalid = findInvalidFields();
          if (invalid.length > 0) {
            const map: Record<string, boolean> = {};
            for (const k of invalid) map[k] = true;
            setFieldErrors(map);
            document.getElementById(`ll-field-${invalid[0]}`)?.focus();
            return;
          }
          setFieldErrors({});
          setEidOpen(true);
        }}
      >
        <div className="ll-main">
          <section className="gt-card" aria-labelledby="ll-form-title">
            <div className="gt-card-head">
              <h2 id="ll-form-title" className="gt-card-title">
                {td('antrag_fields_title')}
              </h2>
            </div>
            <div className="ll-fields">
              {config.formFields.map((f) => {
                const fs = fields[f.key];
                const inputId = `ll-field-${f.key}`;
                const errorId = `${inputId}-error`;
                const invalid = fieldErrors[f.key] === true;
                const labelText = tf(`${f.key}.label`);
                const isUpload = f.typ === 'upload';
                return (
                  <div key={f.key} className="ll-field-row">
                    <div className="ll-field-labelline">
                      <label htmlFor={inputId} className="ll-field-label">
                        {labelText}
                        {f.required ? (
                          <span className="ll-required" aria-hidden="true">
                            {' '}
                            *
                          </span>
                        ) : null}
                      </label>
                      <span className={`ll-prefill-chip${fs.isUserInput ? ' is-user' : ''}`}>
                        {fs.isUserInput
                          ? td('chip_user_input')
                          : td('chip_from_source', { source: f.prefill.label_de })}
                      </span>
                    </div>

                    {isUpload ? (
                      <button
                        type="button"
                        id={inputId}
                        className={`ll-dropzone${uploads[f.key] ? ' is-set' : ''}`}
                        aria-pressed={uploads[f.key] === true}
                        aria-describedby={invalid ? errorId : undefined}
                        onClick={() => {
                          clearFieldError(f.key);
                          setUploads((u) => ({ ...u, [f.key]: !u[f.key] }));
                        }}
                      >
                        <UploadCloud aria-hidden="true" />
                        <span>
                          {uploads[f.key]
                            ? td('upload_set', { label: labelText })
                            : td('upload_prompt')}
                        </span>
                        <span className="ll-mock-rail">{td('mock_upload')}</span>
                      </button>
                    ) : f.typ === 'checkbox' ? (
                      <label className="ll-checkbox" htmlFor={inputId}>
                        <input
                          id={inputId}
                          type="checkbox"
                          checked={fs.value === 'true'}
                          aria-invalid={invalid || undefined}
                          aria-describedby={invalid ? errorId : undefined}
                          onChange={(e) => {
                            clearFieldError(f.key);
                            setFields((prev) => ({
                              ...prev,
                              [f.key]: { ...prev[f.key], value: e.target.checked ? 'true' : '' },
                            }));
                          }}
                        />
                        <span>{tf(`${f.key}.hint`)}</span>
                      </label>
                    ) : (
                      <input
                        id={inputId}
                        className="input"
                        type={f.typ === 'date' ? 'date' : f.typ === 'number' ? 'number' : 'text'}
                        value={fs.value}
                        required={f.required}
                        aria-invalid={invalid || undefined}
                        aria-describedby={invalid ? errorId : undefined}
                        placeholder={fs.isUserInput ? tf(`${f.key}.hint`) : undefined}
                        onChange={(e) => {
                          clearFieldError(f.key);
                          setFields((prev) => ({
                            ...prev,
                            [f.key]: { ...prev[f.key], value: e.target.value },
                          }));
                        }}
                      />
                    )}
                    {invalid ? (
                      <p id={errorId} role="alert" className="mt-1 text-xs text-destructive">
                        {td('field_required')}
                      </p>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </section>

          {consentSteps.length > 0 ? (
            <section className="gt-card" aria-labelledby="ll-consent-title">
              <div className="gt-card-head">
                <h2 id="ll-consent-title" className="gt-card-title">
                  {td('consent_title')}
                </h2>
              </div>
              <p className="ll-consent-lead">{td('consent_lead')}</p>
              <ul className="ll-consent-list">
                {consentSteps.map((s) => {
                  const cid = `ll-consent-${s.id}`;
                  return (
                    <li key={s.id} className="ll-consent-item">
                      <label htmlFor={cid} className="ll-consent-label">
                        <input
                          id={cid}
                          type="checkbox"
                          checked={granted[s.id] === true}
                          onChange={(e) =>
                            setGranted((g) => ({ ...g, [s.id]: e.target.checked }))
                          }
                        />
                        <span className="ll-consent-text">
                          <span className="ll-consent-aktion">{s.agentLabel}</span>
                          <span className="ll-consent-basis">
                            {behoerdeName(s.behoerdeId)} · {s.rechtsgrundlage}
                          </span>
                        </span>
                      </label>
                    </li>
                  );
                })}
              </ul>
            </section>
          ) : null}

          {config.gebuehr.gibt_es ? (
            <section className="gt-card ll-gebuehr-card" aria-labelledby="ll-geb-form-title">
              <span className="icon-circle" aria-hidden="true">
                <Euro />
              </span>
              <div>
                <h2 id="ll-geb-form-title" className="gt-card-title">
                  {td('section.gebuehr')}
                </h2>
                <p className="ll-geb-betrag">
                  {config.gebuehr.betrag_key ? t(config.gebuehr.betrag_key) : ''}
                  <span className="ll-mock-rail">{td('mock_payment')}</span>
                </p>
              </div>
            </section>
          ) : null}

          <div className="ll-cta-row">
            <button type="submit" className="btn btn-primary btn-lg lg-iridescent">
              <Fingerprint aria-hidden="true" />
              {td('cta_eid_submit')}
            </button>
          </div>
        </div>

        <aside className="lk-rail" aria-label={td('datenminimierung_title')}>
          <section className="gt-card ll-dm-panel" tabIndex={0} aria-labelledby="ll-dm-title">
            <div className="ll-dm-head">
              <span className="icon-circle" aria-hidden="true">
                <Landmark />
              </span>
              <div>
                <h2 id="ll-dm-title" className="ll-dm-title">
                  {td('datenminimierung_title')}
                </h2>
                <p className="ll-dm-sub">{td('datenminimierung_sub')}</p>
              </div>
            </div>
            <ul className="ll-dm-list">
              {recipientGroups.map((r) => (
                <li
                  key={r.stepId}
                  className={`ll-dm-recipient${r.active ? '' : ' is-muted'}`}
                >
                  <span className="ll-dm-recipient-name">{r.name}</span>
                  <span className="ll-dm-kats">
                    {r.kategorien.map((k) => (
                      <span key={k} className="ll-dm-kat">
                        {k}
                      </span>
                    ))}
                  </span>
                  {r.gate === 'consent' && !r.active ? (
                    <span className="ll-dm-off">{td('datenminimierung_off')}</span>
                  ) : null}
                </li>
              ))}
            </ul>
          </section>

          <section className="gt-card lk-secure">
            <span className="icon-circle green" aria-hidden="true">
              <Lock />
            </span>
            <h2 className="lk-secure-title">{td('datenschutz_title')}</h2>
            <p className="lk-secure-body">{td('datenschutz_body')}</p>
          </section>
        </aside>
      </form>

      <EidConfirmDialog
        open={eidOpen}
        onOpenChange={setEidOpen}
        onConfirm={handleConfirm}
        title={td('eid_dialog.title')}
        body={td('eid_dialog.body_template', { behoerde: primaryBehoerdeName })}
        confirmLabel={td('eid_dialog.confirm')}
        cancelLabel={td('eid_dialog.cancel')}
      />
    </div>
  );
}
