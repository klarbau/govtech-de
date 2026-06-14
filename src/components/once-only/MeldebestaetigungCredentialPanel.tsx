'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { AlertTriangle, CheckCircle2, Home, Loader2 } from 'lucide-react';

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
  /** The active persona's id — selects which credential the server verifies. */
  personaId?: string;
  /** The Vorgang the credential belongs to. */
  vorgangId?: string;
}

type PanelState = 'loading' | 'ready' | 'error';

/**
 * `<MeldebestaetigungCredentialPanel>` — a SIMPLE, citizen-facing view of the
 * amtliche Meldebestätigung (§ 24 Abs. 2 BMG) the Umzug cascade returns, inside
 * the Dokumente vault preview.
 *
 * The cryptographic work is INVISIBLE backend machinery: on mount the panel calls
 * the `verifyMeldebestaetigungCredential` server action, which mints + verifies the
 * real ES256 SD-JWT VC offline against the Demo-Trust-Anchor. The UI just shows the
 * plain outcome — „Echtheit automatisch geprüft" + the citizen's data + one honest
 * footnote. No buttons, no crypto jargon, no raw token. `src/lib/eudi` is
 * server-only; this client panel only receives the serializable result.
 */
export function MeldebestaetigungCredentialPanel({
  className,
  personaId,
  vorgangId,
}: MeldebestaetigungCredentialPanelProps) {
  const t = useTranslations('vono');
  const headingId = React.useId();

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

  const verified = result !== null && result.verified && result.chainValid;

  return (
    <article
      aria-labelledby={headingId}
      className={cn(
        'flex flex-col gap-4 rounded-xl border border-emerald-200/80 bg-emerald-50/40 p-5 shadow-sm dark:border-emerald-800/60 dark:bg-emerald-950/20',
        className,
      )}
      data-testid="meldebestaetigung-credential-panel"
    >
      <header className="flex items-center gap-3">
        <span
          className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-200"
          aria-hidden="true"
        >
          <Home className="size-5" />
        </span>
        <h3
          id={headingId}
          className="text-base font-semibold tracking-tight text-foreground"
        >
          {t('credential.title')}
        </h3>
      </header>

      <div aria-live="polite" aria-busy={state === 'loading'}>
        {state === 'loading' ? (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            {t('credential.loading')}
          </p>
        ) : null}

        {state === 'error' ? (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <AlertTriangle className="size-4 shrink-0" aria-hidden="true" />
            {t('credential.not_yet_issued')}
          </p>
        ) : null}

        {state === 'ready' && result !== null ? (
          <div className="flex flex-col gap-4">
            {verified ? (
              <p
                className="flex items-center gap-2 text-sm font-medium text-emerald-700 dark:text-emerald-300"
                data-testid="meldebestaetigung-status"
              >
                <CheckCircle2 className="size-5 shrink-0" aria-hidden="true" />
                {t('credential.simple_status')}
              </p>
            ) : null}

            <dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
              {MELDEBESTAETIGUNG_FIELDS.map((field) => {
                if (!result.presentFields.includes(field)) return null;
                return (
                  <div key={field} className="flex flex-col">
                    <dt className="text-[11px] uppercase tracking-wide text-muted-foreground">
                      {t(`credential.field.${field}`)}
                    </dt>
                    <dd className="text-sm text-foreground">
                      {formatFieldValue(field, result.fields[field])}
                    </dd>
                  </div>
                );
              })}
            </dl>

            <p className="border-t border-emerald-200/60 pt-3 text-[11px] leading-relaxed text-muted-foreground dark:border-emerald-800/50">
              {t('disclaimer.short')}
            </p>
          </div>
        ) : null}
      </div>
    </article>
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
    return formatDateDe(value) || value;
  }
  return value;
}
