'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import {
  AlertTriangle,
  CheckCircle2,
  Home,
  Loader2,
} from 'lucide-react';

import { CheckRow } from '@/components/once-only/CheckRow';
import { verifyMeldebestaetigungCredential } from '@/app/actions/eudi';
/* Import field list + types from the leaf `types` module, NOT the `@/lib/eudi`
 * barrel: the barrel re-exports `issue.ts`/`verify.ts` which pull `node:crypto`
 * + `jose` (server-only) and would leak into this client bundle. `types.ts` has
 * zero runtime deps, so the field-id const is client-safe. */
import {
  MELDEBESTAETIGUNG_FIELDS,
  type MeldebestaetigungField,
  type MeldebestaetigungVerificationResult,
} from '@/lib/eudi/types';
import { cn, formatDateDe } from '@/lib/utils';

interface MeldebestaetigungCredentialPanelProps {
  className?: string;
  /** The active persona's id — selects which credential the server mints + re-verifies. */
  personaId?: string;
  /** The Vorgang the credential belongs to (deterministic id `mb-vono-${vorgangId}`). */
  vorgangId?: string;
}

type PanelState = 'loading' | 'ready' | 'error';

/**
 * `<MeldebestaetigungCredentialPanel>` (Beat 3 — the heart of Phase 1) — surfaces
 * the re-verifiable amtliche Meldebestätigung (§ 24 Abs. 2 BMG) the Umzug cascade
 * returns, inside the Dokumente vault preview.
 *
 * Structurally + visually mirrors `EudiReferencePidCard` (emerald card, CheckRow
 * block, consolidated marker badge, load-bearing honesty-block foot). The verdict
 * headline is `verified && chainValid` (identical contract). The THIRD CheckRow
 * is NEVER „X von 5 PID-Pflichtattribute" — it is „{present} von {total}
 * Bestätigungsfeldern vorhanden" from the readout adapter (C4). The field list is
 * the 8 § 24 Abs. 2 fields, never PID attributes (C3).
 *
 * Architecture: `src/lib/eudi` is SERVER-ONLY. Verification runs in the
 * `verifyMeldebestaetigungCredential` server action; this client panel only ever
 * receives the plain serializable `MeldebestaetigungVerificationResult` and
 * forwards `personaId`/`vorgangId`. The trust anchor is read from
 * `result.trustAnchorSubject` (never importing the server-only CA PEM).
 *
 * a11y: status icons are ALWAYS paired with text (axe 1.4.1). `aria-live`/`aria-busy`
 * during load (mirror `EudiReferencePidCard`). The panel sits under the vault
 * preview context, so its top heading is `h3` and the field-list heading `h4`
 * (clean nesting under the dialog title). The honesty-block foot is load-bearing
 * and never hidden behind a toggle.
 */
export function MeldebestaetigungCredentialPanel({
  className,
  personaId,
  vorgangId,
}: MeldebestaetigungCredentialPanelProps) {
  const t = useTranslations('vono');
  const headingId = React.useId();
  const fieldsHeadingId = React.useId();

  const [result, setResult] =
    React.useState<MeldebestaetigungVerificationResult | null>(null);
  const [state, setState] = React.useState<PanelState>('loading');

  React.useEffect(() => {
    let cancelled = false;
    setState('loading');
    void verifyMeldebestaetigungCredential(personaId, vorgangId)
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
  }, [personaId, vorgangId]);

  const cryptoVerified =
    result !== null && result.verified && result.chainValid;

  /* Defensive: a degenerate result with no disclosed fields AND no signature ⇒
   * treat as „not yet issued" (e.g. opened before a run minted anything). The
   * live preview path only mounts this for an existing minted doc, so this is a
   * belt-and-suspenders calm state, never the common path. */
  const notYetIssued =
    state === 'ready' &&
    result !== null &&
    !result.verified &&
    result.presentFields.length === 0;

  const doktorgradAbsent =
    result !== null && !result.presentFields.includes('doktorgrad');

  /* The field-count check passes when every APPLICABLE field is present.
   * `doktorgrad` is statutorily optional (§ 24 Abs. 2 BMG), so a credential
   * without it is COMPLETE at 7/8 — a green check, not a verification failure.
   * Only a genuinely missing required field (e.g. anschrift) fails this row. */
  const fieldsComplete =
    result !== null &&
    result.presentFields.length ===
      (doktorgradAbsent ? result.totalFields - 1 : result.totalFields);

  return (
    <article
      aria-labelledby={headingId}
      className={cn(
        'flex flex-col gap-4 rounded-xl border border-emerald-200/80 bg-emerald-50/40 p-5 shadow-sm dark:border-emerald-800/60 dark:bg-emerald-950/20',
        className,
      )}
      data-testid="meldebestaetigung-credential-panel"
    >
      <header className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <span
            className="inline-flex size-8 shrink-0 items-center justify-center rounded-md bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-200"
            aria-hidden="true"
          >
            <Home className="size-4" />
          </span>
          <div className="flex flex-col gap-0.5">
            <h3
              id={headingId}
              className="text-sm font-semibold tracking-tight text-foreground"
            >
              {t('credential.title')}
            </h3>
            <p className="text-xs text-muted-foreground">
              {t('credential.issuer_label')}
            </p>
          </div>
        </div>
        <span className="inline-flex shrink-0 items-center rounded-md bg-emerald-100 px-2 py-0.5 text-[11px] font-medium text-emerald-900 ring-1 ring-emerald-300/70 dark:bg-emerald-900/40 dark:text-emerald-100 dark:ring-emerald-700/60">
          {t('credential.marker_badge')}
        </span>
      </header>

      <div
        className="flex flex-col gap-4"
        aria-live="polite"
        aria-busy={state === 'loading'}
      >
        {state === 'loading' ? (
          <p className="flex items-center gap-2 rounded-lg border border-dashed border-border bg-card/60 p-4 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            {t('credential.loading')}
          </p>
        ) : null}

        {state === 'error' ? (
          <p className="flex items-center gap-2 rounded-lg border border-amber-300/70 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-700/60 dark:bg-amber-950/30 dark:text-amber-100">
            <AlertTriangle className="size-4 shrink-0" aria-hidden="true" />
            {t('credential.not_yet_issued')}
          </p>
        ) : null}

        {notYetIssued ? (
          <p className="flex items-center gap-2 rounded-lg border border-dashed border-border bg-card/60 p-4 text-sm text-muted-foreground">
            <AlertTriangle className="size-4 shrink-0" aria-hidden="true" />
            {t('credential.not_yet_issued')}
          </p>
        ) : null}

        {state === 'ready' && result !== null && !notYetIssued ? (
          <div className="flex flex-col gap-4">
            {/* Verification status — headline + per-check rows. */}
            <section
              aria-label={t('credential.title')}
              className="flex flex-col gap-2 rounded-lg border border-border bg-card p-4"
            >
              {cryptoVerified ? (
                <p
                  className="flex items-center gap-2 text-sm font-semibold text-emerald-700 dark:text-emerald-300"
                  data-testid="meldebestaetigung-status"
                >
                  <CheckCircle2 className="size-4 shrink-0" aria-hidden="true" />
                  {t('credential.status_verified')}
                </p>
              ) : (
                <p
                  className="flex items-center gap-2 text-sm font-semibold text-destructive"
                  data-testid="meldebestaetigung-status"
                >
                  <AlertTriangle className="size-4 shrink-0" aria-hidden="true" />
                  {t('credential.status_not_verified')}
                </p>
              )}

              <ul className="flex flex-col gap-1.5 text-xs">
                <CheckRow
                  ok={result.verified}
                  label={t('credential.check_signature')}
                  notOkText={t('credential.status_not_verified')}
                />
                <CheckRow
                  ok={result.chainValid}
                  label={t('credential.check_chain')}
                  notOkText={t('credential.status_not_verified')}
                />
                <CheckRow
                  ok={fieldsComplete}
                  label={t('credential.check_fields', {
                    present: result.presentFields.length,
                    total: result.totalFields,
                  })}
                  notOkText={t('credential.status_not_verified')}
                />
              </ul>

              {/* Validity + honest expiry line. */}
              <div className="flex flex-col gap-1 border-t border-border pt-2 text-xs">
                {result.validity.expiresAt && !result.expired ? (
                  <p className="text-foreground">
                    {t('credential.valid_until', {
                      datum: formatDateDe(result.validity.expiresAt),
                    })}
                  </p>
                ) : null}
                {result.expired ? (
                  <p
                    className="flex items-start gap-1.5 text-amber-700 dark:text-amber-300"
                    data-testid="meldebestaetigung-expired"
                  >
                    <AlertTriangle
                      className="mt-0.5 size-3.5 shrink-0"
                      aria-hidden="true"
                    />
                    <span>
                      {t('credential.expired', {
                        datum: result.validity.expiresAt
                          ? formatDateDe(result.validity.expiresAt)
                          : '—',
                      })}
                    </span>
                  </p>
                ) : null}
              </div>
            </section>

            {/* Disclosed § 24 Abs. 2 fields — Selective Disclosure (never PID). */}
            <section
              aria-labelledby={fieldsHeadingId}
              className="flex flex-col gap-2 rounded-lg border border-border bg-card p-4"
              data-testid="meldebestaetigung-fields"
            >
              <h4
                id={fieldsHeadingId}
                className="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
              >
                {t('credential.fields_heading')}
              </h4>
              <dl className="grid grid-cols-1 gap-x-4 gap-y-2 sm:grid-cols-2">
                {MELDEBESTAETIGUNG_FIELDS.map((field) => {
                  const present = result.presentFields.includes(field);
                  const value = result.fields[field];
                  if (!present) return null;
                  return (
                    <FieldRow
                      key={field}
                      label={t(`credential.field.${field}`)}
                      value={formatFieldValue(field, value)}
                    />
                  );
                })}
              </dl>
              {doktorgradAbsent ? (
                <p className="text-[11px] text-muted-foreground">
                  {t('credential.no_doktorgrad_note')}
                </p>
              ) : null}
            </section>

            {/* Credential metadata: vct (demo-owned) + Rechtsgrundlage (single
             * statement line — § 24 Abs. 2 BMG, NEVER a return-path §§, C2). */}
            <section className="flex flex-col gap-1.5 rounded-lg border border-border bg-card p-4 text-xs">
              <div className="flex flex-col gap-0.5">
                <span className="font-medium text-muted-foreground">
                  {t('credential.vct_label')}
                </span>
                <span
                  className="break-words font-mono text-[11px] text-foreground"
                  data-testid="meldebestaetigung-vct"
                >
                  {result.vct}
                </span>
              </div>
              <p className="border-t border-border pt-1.5 text-foreground">
                {t('credential.rechtsgrundlage')}
              </p>
            </section>

            {/* Wallet-path Once-Only note (C5 — wallet-present, never register-pull). */}
            <p className="text-xs leading-relaxed text-muted-foreground">
              {t('once_only.wallet_path_note')}
            </p>

            {/* TODO Phase 2 (Beat 4 — optional, HIGH-VALUE-IF-CHEAP): a
             * „Nur Anschrift + Anmeldedatum vorlegen" trigger here opens
             * <SelectiveDisclosureSheet> → presentMeldebestaetigungSubset(...) for
             * the literal Datenminimierung proof. Deferred per the spec phase-gate
             * (C10): build only once Phase 1 is fully green. The server action
             * (`presentMeldebestaetigungSubset`) + the `vono.disclosure.*` i18n keys
             * already exist; this is purely the trigger button + sheet UI. */}
          </div>
        ) : null}
      </div>

      {/* Honesty block — load-bearing, verbatim, NEVER hidden behind a toggle (C9). */}
      <p className="rounded-lg border border-amber-300/70 bg-amber-50 p-3 text-xs leading-relaxed text-amber-900 dark:border-amber-700/60 dark:bg-amber-950/30 dark:text-amber-100">
        {t('disclaimer.long')}
      </p>
    </article>
  );
}

/** A disclosed-field row inside the `<dl>`. */
function FieldRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col">
      <dt className="text-[11px] uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd className="text-sm text-foreground">{value}</dd>
    </div>
  );
}

/** Format a field value for display — dates German, others verbatim. */
function formatFieldValue(
  field: MeldebestaetigungField,
  value: string | undefined,
): string {
  if (value === undefined) return '—';
  if (
    field === 'geburtsdatum' ||
    field === 'einzugsdatum' ||
    field === 'datum_anmeldung'
  ) {
    const formatted = formatDateDe(value);
    return formatted || value;
  }
  return value;
}
