'use client';

import * as React from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { CheckCircle2, ChevronRight, Loader2 } from 'lucide-react';

import { verifyMeldebestaetigungCredential } from '@/app/actions/eudi';
/* Type-only import from the leaf `types` module — the `@/lib/eudi` barrel is
 * server-only (re-exports `node:crypto`/`jose`). The type is erased at compile
 * time but we point at `types.ts` to keep the rule unambiguous. */
import type { MeldebestaetigungVerificationResult } from '@/lib/eudi/types';
import { cn } from '@/lib/utils';

interface MeldebestaetigungInlineBeatProps {
  className?: string;
  /** Active persona id — selects which credential the server mints + re-verifies. */
  personaId?: string;
  /** The completed Umzug Vorgang the credential is returned for. */
  vorgangId: string;
}

type BeatState = 'issuing' | 'present' | 'error';

/**
 * `<MeldebestaetigungInlineBeat>` (Beat 1) — the quiet in-thread hand-off that
 * the Umzug cascade returns a re-verifiable amtliche Meldebestätigung. NOT the
 * full panel (that lives in Dokumente, Beat 3): a slim row showing „liegt vor",
 * the consolidated marker badge, a one-line re-verified summary, and a link into
 * `/dokumente`.
 *
 * Resilience (C9 / spec §4.1, §9): issuance/verify failure is QUIET + ADDITIVE —
 * it shows `vono.inline.error` and must NEVER break the cascade. The component is
 * rendered OUTSIDE the cascade's `aria-live` region (mirror of `ValueReceiptCard`)
 * and owns its own polite region; it never steals focus (it appears passively
 * under the receipt card).
 *
 * Architecture: `verifyMeldebestaetigungCredential` is a server action; this
 * client beat only receives the serializable result.
 */
export function MeldebestaetigungInlineBeat({
  className,
  personaId,
  vorgangId,
}: MeldebestaetigungInlineBeatProps) {
  const t = useTranslations('vono.inline');
  const tCred = useTranslations('vono.credential');

  const [result, setResult] =
    React.useState<MeldebestaetigungVerificationResult | null>(null);
  const [state, setState] = React.useState<BeatState>('issuing');

  React.useEffect(() => {
    let cancelled = false;
    setState('issuing');
    void verifyMeldebestaetigungCredential(personaId, vorgangId)
      .then((res) => {
        if (cancelled) return;
        setResult(res);
        setState('present');
      })
      .catch(() => {
        if (!cancelled) setState('error');
      });
    return () => {
      cancelled = true;
    };
  }, [personaId, vorgangId]);

  const reverified =
    result !== null && result.verified && result.chainValid;

  return (
    <section
      aria-live="polite"
      aria-busy={state === 'issuing'}
      aria-label={t('present_title')}
      data-testid="meldebestaetigung-inline-beat"
      className={cn(
        'flex flex-col gap-2 rounded-xl border border-emerald-200/80 bg-emerald-50/40 p-4 shadow-sm dark:border-emerald-800/60 dark:bg-emerald-950/20',
        className,
      )}
    >
      {state === 'issuing' ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          {t('issuing')}
        </p>
      ) : null}

      {state === 'error' ? (
        <p className="flex items-start gap-2 text-sm text-muted-foreground">
          {t('error')}
        </p>
      ) : null}

      {state === 'present' ? (
        <>
          <div className="flex flex-wrap items-start justify-between gap-2">
            <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <CheckCircle2
                className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400"
                aria-hidden="true"
              />
              {t('present_title')}
            </p>
            <span className="inline-flex shrink-0 items-center rounded-md bg-emerald-100 px-2 py-0.5 text-[11px] font-medium text-emerald-900 ring-1 ring-emerald-300/70 dark:bg-emerald-900/40 dark:text-emerald-100 dark:ring-emerald-700/60">
              {tCred('marker_badge')}
            </span>
          </div>

          {reverified ? (
            <p className="ml-6 text-xs text-muted-foreground">
              {t('reverified_line')}
            </p>
          ) : null}

          <Link
            href="/dokumente"
            className="ml-6 inline-flex w-fit items-center gap-1 text-sm font-medium text-primary hover:text-primary-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            data-testid="meldebestaetigung-inline-link"
          >
            {t('view_in_dokumente')}
            <ChevronRight className="size-4" aria-hidden="true" />
          </Link>
        </>
      ) : null}
    </section>
  );
}
