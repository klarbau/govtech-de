'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import {
  AlertTriangle,
  CheckCircle2,
  Fingerprint,
  Loader2,
  ShieldCheck,
} from 'lucide-react';

import { getVerifiedReferencePid } from '@/app/actions/eudi';
import type { PidVerificationResult } from '@/lib/eudi';
import { cn, formatDateDe } from '@/lib/utils';

interface EudiReferencePidCardProps {
  className?: string;
}

/**
 * `<EudiReferencePidCard>` — surfaces a REAL, offline-verified EU-reference PID
 * (SD-JWT VC) in the Stammdaten Wallet sub-tab.
 *
 * Honesty contract (`[reference-ecosystem]`): this is a proof-of-capability
 * about a SYNTHETIC reference test subject (Erika Mustermann), verified against
 * the EUDI *development* demo IACA. It is NOT the demo persona's own credential,
 * NOT German-state, NOT eIDAS-/production-verified. The German national EUDI
 * Wallet is `[ZUKUNFT]` (~2 Jan 2027). The honesty block at the foot is
 * load-bearing and must never be dropped.
 *
 * Architecture: `src/lib/eudi` is SERVER-ONLY (`node:crypto` + `jose` + vendored
 * cert). Verification runs in the `getVerifiedReferencePid` server action; this
 * client card only ever receives the plain serializable `PidVerificationResult`.
 *
 * a11y: status icons (`CheckCircle2`/`AlertTriangle`) are ALWAYS paired with
 * text — never colour-only (axe 1.4.1). Attribute rows use list semantics; the
 * GREEN „verifiziert" headline requires `verified && chainValid` (not `verified`
 * alone). An expired-but-cryptographically-verified credential still renders the
 * verified signature/chain plus an honest „abgelaufen" line.
 */
export function EudiReferencePidCard({ className }: EudiReferencePidCardProps) {
  const t = useTranslations('stammdaten.wallet.eudi_reference_pid');

  const [result, setResult] = React.useState<PidVerificationResult | null>(null);
  const [state, setState] = React.useState<'loading' | 'ready' | 'error'>(
    'loading',
  );

  React.useEffect(() => {
    let cancelled = false;
    setState('loading');
    void getVerifiedReferencePid()
      .then((res) => {
        if (cancelled) return;
        setResult(res);
        setState('ready');
      })
      .catch(() => {
        if (!cancelled) setState('error');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const cryptoVerified =
    result !== null && result.verified && result.chainValid;

  return (
    <article
      aria-labelledby="eudi-reference-pid-card-title"
      className={cn(
        'flex flex-col gap-4 rounded-xl border border-emerald-200/80 bg-emerald-50/40 p-5 shadow-sm dark:border-emerald-800/60 dark:bg-emerald-950/20',
        className,
      )}
      data-testid="eudi-reference-pid-card"
    >
      <header className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <span
            className="inline-flex size-8 shrink-0 items-center justify-center rounded-md bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-200"
            aria-hidden="true"
          >
            <Fingerprint className="size-4" />
          </span>
          <div className="flex flex-col gap-0.5">
            <h3
              id="eudi-reference-pid-card-title"
              className="text-sm font-semibold tracking-tight text-foreground"
            >
              {t('title')}
            </h3>
            <p className="text-xs text-muted-foreground">{t('subject_note')}</p>
          </div>
        </div>
        <span className="inline-flex shrink-0 items-center rounded-md bg-emerald-100 px-2 py-0.5 font-mono text-[11px] font-medium uppercase tracking-wide text-emerald-900 ring-1 ring-emerald-300/70 dark:bg-emerald-900/40 dark:text-emerald-100 dark:ring-emerald-700/60">
          {t('reference_ecosystem_badge')}
        </span>
      </header>

      <div className="flex flex-col gap-4" aria-live="polite" aria-busy={state === 'loading'}>
      {state === 'loading' ? (
        <p className="flex items-center gap-2 rounded-lg border border-dashed border-border bg-card/60 p-4 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          {t('loading')}
        </p>
      ) : null}

      {state === 'error' ? (
        <p className="flex items-center gap-2 rounded-lg border border-amber-300/70 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-700/60 dark:bg-amber-950/30 dark:text-amber-100">
          <AlertTriangle className="size-4 shrink-0" aria-hidden="true" />
          {t('error')}
        </p>
      ) : null}

      {state === 'ready' && result !== null ? (
        <div className="flex flex-col gap-4">
          {/* Verification status — headline + per-check rows. */}
          <section
            aria-label={t('status_section_aria')}
            className="flex flex-col gap-2 rounded-lg border border-border bg-card p-4"
          >
            {cryptoVerified ? (
              <p
                className="flex items-center gap-2 text-sm font-semibold text-emerald-700 dark:text-emerald-300"
                data-testid="eudi-reference-pid-status"
              >
                <CheckCircle2 className="size-4 shrink-0" aria-hidden="true" />
                {t('status_verified')}
              </p>
            ) : (
              <p
                className="flex items-center gap-2 text-sm font-semibold text-destructive"
                data-testid="eudi-reference-pid-status"
              >
                <AlertTriangle className="size-4 shrink-0" aria-hidden="true" />
                {t('status_not_verified')}
              </p>
            )}

            <ul className="flex flex-col gap-1.5 text-xs">
              <CheckRow
                ok={result.verified}
                label={t('check_signature_label')}
                okText={t('check_signature_ok', { alg: result.alg || '—' })}
                notOkText={t('check_signature_not_ok')}
              />
              <CheckRow
                ok={result.chainValid}
                label={t('check_chain_label')}
                okText={t('check_chain_ok', {
                  anchor: result.trustAnchorSubject || '—',
                })}
                notOkText={t('check_chain_not_ok')}
              />
            </ul>

            {/* Validity + honest expiry line. */}
            <div className="flex flex-col gap-1 border-t border-border pt-2 text-xs">
              {result.validity.notBefore ? (
                <ValueRow
                  label={t('validity_not_before_label')}
                  value={formatDateDe(result.validity.notBefore)}
                />
              ) : null}
              {result.validity.expiresAt ? (
                <ValueRow
                  label={t('validity_expires_label')}
                  value={formatDateDe(result.validity.expiresAt)}
                />
              ) : null}
              {result.expired ? (
                <p
                  className="flex items-start gap-1.5 text-amber-700 dark:text-amber-300"
                  data-testid="eudi-reference-pid-expired"
                >
                  <AlertTriangle
                    className="mt-0.5 size-3.5 shrink-0"
                    aria-hidden="true"
                  />
                  <span>
                    {t('expired_note', {
                      date: result.validity.expiresAt
                        ? formatDateDe(result.validity.expiresAt)
                        : '—',
                    })}
                  </span>
                </p>
              ) : null}
            </div>
          </section>

          {/* Disclosed PID attributes — Selective Disclosure. */}
          <section
            aria-labelledby="eudi-reference-pid-claims-heading"
            className="flex flex-col gap-2 rounded-lg border border-border bg-card p-4"
            data-testid="eudi-reference-pid-claims"
          >
            <div className="flex flex-col gap-0.5">
              <h4
                id="eudi-reference-pid-claims-heading"
                className="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
              >
                {t('claims_heading')}
              </h4>
              <p className="text-[11px] leading-relaxed text-muted-foreground">
                {t('selective_disclosure_note')}
              </p>
            </div>
            <dl className="grid grid-cols-1 gap-x-4 gap-y-2 sm:grid-cols-2">
              {result.claims.family_name !== undefined ? (
                <ClaimRow
                  label={t('claim_family_name')}
                  value={result.claims.family_name}
                />
              ) : null}
              {result.claims.given_name !== undefined ? (
                <ClaimRow
                  label={t('claim_given_name')}
                  value={result.claims.given_name}
                />
              ) : null}
              {result.claims.birthdate !== undefined ? (
                <ClaimRow
                  label={t('claim_birthdate')}
                  value={formatDateDe(result.claims.birthdate)}
                />
              ) : null}
              {result.claims.place_of_birth !== undefined ? (
                <ClaimRow
                  label={t('claim_place_of_birth')}
                  value={formatPlaceOfBirth(result.claims.place_of_birth)}
                />
              ) : null}
              {result.claims.nationalities !== undefined &&
              result.claims.nationalities.length > 0 ? (
                <ClaimRow
                  label={t('claim_nationalities')}
                  value={result.claims.nationalities.join(', ')}
                />
              ) : null}
            </dl>
          </section>
        </div>
      ) : null}
      </div>

      {/* Honesty block — load-bearing. NEVER imply German-state / production. */}
      <p className="rounded-lg border border-amber-300/70 bg-amber-50 p-3 text-xs leading-relaxed text-amber-900 dark:border-amber-700/60 dark:bg-amber-950/30 dark:text-amber-100">
        {t('honesty_block')}
      </p>
    </article>
  );
}

/** A check row: status icon ALWAYS paired with text (axe 1.4.1). */
function CheckRow({
  ok,
  label,
  okText,
  notOkText,
}: {
  ok: boolean;
  label: string;
  okText: string;
  notOkText: string;
}) {
  return (
    <li className="flex flex-wrap items-baseline gap-x-2">
      <span className="font-medium text-muted-foreground">{label}</span>
      {ok ? (
        <span className="inline-flex min-w-0 items-baseline gap-1 font-medium text-emerald-700 dark:text-emerald-300">
          <CheckCircle2
            className="size-3.5 shrink-0 self-center"
            aria-hidden="true"
          />
          <span className="min-w-0 break-words">{okText}</span>
        </span>
      ) : (
        <span className="inline-flex min-w-0 items-baseline gap-1 font-medium text-destructive">
          <AlertTriangle
            className="size-3.5 shrink-0 self-center"
            aria-hidden="true"
          />
          <span className="min-w-0 break-words">{notOkText}</span>
        </span>
      )}
    </li>
  );
}

/** A plain label:value row inside the validity block. */
function ValueRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-wrap items-baseline gap-x-2">
      <span className="font-medium text-muted-foreground">{label}</span>
      <span className="text-foreground">{value}</span>
    </div>
  );
}

/** A disclosed-claim row inside the `<dl>`. */
function ClaimRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col">
      <dt className="text-[11px] uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd className="text-sm text-foreground">{value}</dd>
    </div>
  );
}

/** Render the nested `place_of_birth` sub-claims compactly (locality, region, country). */
function formatPlaceOfBirth(place: {
  country?: string;
  region?: string;
  locality?: string;
}): string {
  return [place.locality, place.region, place.country]
    .filter((part): part is string => Boolean(part))
    .join(', ');
}
