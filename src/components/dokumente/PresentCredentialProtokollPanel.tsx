'use client';

import * as React from 'react';
import { useReducedMotion } from 'framer-motion';
import { AlertTriangle, Loader2, QrCode, RefreshCw, ShieldCheck } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';
import type { CreateVpSessionResult, VpState, VpStatusResult } from '@/lib/eudi/vp/types';
import { cn, formatDateDe } from '@/lib/utils';

/** Local panel state — extends the wire {@link VpState} with pre-session steps. */
type PanelState = 'creating' | 'no_tunnel' | VpState;

const POLL_INTERVAL_MS = 1200;

/**
 * `<PresentCredentialProtokollPanel>` (Spec §6.5) — the flag-gated "present a
 * REAL PID over OpenID4VP" path inside {@link PresentCredentialDialog}. Only
 * mounted when `/api/eudi/vp/capability` reports `available` (Protokoll-Modus).
 *
 * Flow: POST create-session → render the real QR (`qrPngDataUrl` + the copyable
 * `openid4vp://` URI) → poll `status` (~1.2 s) → pending → scanned →
 * verified/expired/error. On `verified` it renders the 3 cryptographically
 * checked claims + the sandbox honesty banner + the `verified_via` provenance.
 *
 * Honesty (§9): the banner ("Sandbox-Vertrauensanker — nicht produktiv") is
 * shown at every step. This is EU reference/development ecosystem — NOT
 * German-state, NOT eIDAS, NOT production.
 *
 * a11y (§6.8): the QR is an `<img>` with a descriptive `alt`; the URI is also
 * present as selectable text (never QR-only); status transitions are announced
 * via `aria-live="polite"`; verified/error pair icon + text; the spinner honours
 * `prefers-reduced-motion`.
 */
export function PresentCredentialProtokollPanel() {
  const t = useTranslations('protokoll.eudi_vp');
  const reducedMotion = useReducedMotion();

  const [session, setSession] = React.useState<CreateVpSessionResult | null>(null);
  const [state, setState] = React.useState<PanelState>('creating');
  const [claims, setClaims] = React.useState<VpStatusResult['claims'] | null>(null);
  const startingRef = React.useRef(false);

  const start = React.useCallback(async () => {
    // Double-submit guard: never overlap two create-session calls.
    if (startingRef.current) return;
    startingRef.current = true;
    setState('creating');
    setClaims(null);
    setSession(null);
    try {
      const res = await fetch('/api/eudi/vp/create-session', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({}),
      });
      if (res.status === 404) {
        setState('no_tunnel');
        return;
      }
      if (!res.ok) {
        setState('error');
        return;
      }
      const data = (await res.json()) as CreateVpSessionResult;
      setSession(data);
      setState('pending');
    } catch {
      setState('error');
    } finally {
      startingRef.current = false;
    }
  }, []);

  // Auto-start when the panel mounts (clicking the tab is the user trigger, §6.5).
  React.useEffect(() => {
    void start();
  }, [start]);

  // Poll status while a session is live; stop on any terminal state.
  React.useEffect(() => {
    if (!session) return;
    let active = true;
    const id = setInterval(async () => {
      if (!active) return;
      try {
        const res = await fetch(`/api/eudi/vp/status/${session.sessionId}`, {
          cache: 'no-store',
        });
        const status = (await res.json()) as VpStatusResult;
        if (!active) return;
        setState(status.state);
        if (status.state === 'verified') setClaims(status.claims ?? null);
        if (
          status.state === 'verified' ||
          status.state === 'expired' ||
          status.state === 'error'
        ) {
          active = false;
          clearInterval(id);
        }
      } catch {
        /* transient — keep polling */
      }
    }, POLL_INTERVAL_MS);
    return () => {
      active = false;
      clearInterval(id);
    };
  }, [session]);

  const statusLabel: Record<PanelState, string> = {
    creating: t('state_pending'),
    pending: t('state_pending'),
    scanned: t('state_scanned'),
    verified: t('state_verified'),
    expired: t('state_expired'),
    error: t('state_error'),
    no_tunnel: t('no_tunnel_hint'),
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Honesty banner — shown at every step (§9). */}
      <p className="flex items-start gap-2 rounded-lg border border-amber-400/40 bg-amber-50 p-3 text-[11px] leading-relaxed text-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
        <ShieldCheck className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
        <span>{t('banner_sandbox')}</span>
      </p>

      {/* Live status region. */}
      <div aria-live="polite">
        {state === 'verified' ? (
          <VerifiedView claims={claims} t={t} />
        ) : state === 'no_tunnel' || state === 'error' || state === 'expired' ? (
          <ProblemView
            label={statusLabel[state]}
            onRegenerate={start}
            regenerateLabel={t('regenerate_cta')}
          />
        ) : (
          <PendingView
            session={session}
            label={statusLabel[state]}
            qrAlt={t('qr_hint')}
            uriLabel={t('qr_uri_label')}
            reducedMotion={reducedMotion}
          />
        )}
      </div>
    </div>
  );
}

function PendingView({
  session,
  label,
  qrAlt,
  uriLabel,
  reducedMotion,
}: {
  session: CreateVpSessionResult | null;
  label: string;
  qrAlt: string;
  uriLabel: string;
  reducedMotion: boolean | null;
}) {
  return (
    <div className="flex flex-col items-center gap-3">
      {session ? (
        <img
          src={session.qrPngDataUrl}
          alt={qrAlt}
          width={220}
          height={220}
          className="rounded-lg border border-border bg-white p-2"
        />
      ) : (
        <span
          className="flex size-[220px] items-center justify-center rounded-lg border border-dashed border-border text-text-secondary"
          aria-hidden="true"
        >
          <QrCode className="size-10" />
        </span>
      )}

      <p className="flex items-center gap-2 text-sm text-text-secondary">
        <Loader2
          className={cn('size-4 shrink-0', reducedMotion ? '' : 'animate-spin')}
          aria-hidden="true"
        />
        <span>{label}</span>
      </p>

      {session ? (
        <div className="w-full">
          <p className="mb-1 text-xs text-text-secondary">{uriLabel}</p>
          <code className="block w-full select-all break-all rounded-md border border-border bg-surface-muted/50 p-2 font-mono text-[11px] text-text-primary">
            {session.openid4vpUri}
          </code>
        </div>
      ) : null}
    </div>
  );
}

function VerifiedView({
  claims,
  t,
}: {
  claims: VpStatusResult['claims'] | null;
  t: ReturnType<typeof useTranslations>;
}) {
  const rows: { key: 'given_name' | 'family_name' | 'birthdate'; value: string }[] = [
    { key: 'given_name', value: claims?.given_name ?? '—' },
    { key: 'family_name', value: claims?.family_name ?? '—' },
    {
      key: 'birthdate',
      value: claims?.birthdate ? formatDateDe(claims.birthdate) : '—',
    },
  ];

  return (
    <div className="flex flex-col gap-3">
      <p className="flex items-center gap-2 text-base font-semibold text-text-primary">
        <ShieldCheck className="size-5 shrink-0 text-primary" aria-hidden="true" />
        <span>{t('state_verified')}</span>
      </p>

      <div>
        <p className="mb-2 text-sm text-text-secondary">{t('claims_heading')}</p>
        <dl className="flex flex-col gap-1.5 rounded-lg border border-primary/30 bg-primary/5 p-3">
          {rows.map((row) => (
            <div key={row.key} className="flex items-baseline justify-between gap-3">
              <dt className="text-sm text-text-secondary">{t(`claim.${row.key}`)}</dt>
              <dd className="text-end text-sm font-medium text-text-primary">{row.value}</dd>
            </div>
          ))}
        </dl>
      </div>

      <p className="text-[11px] leading-relaxed text-muted-foreground">{t('verified_via')}</p>
    </div>
  );
}

function ProblemView({
  label,
  onRegenerate,
  regenerateLabel,
}: {
  label: string;
  onRegenerate: () => void;
  regenerateLabel: string;
}) {
  return (
    <div className="flex flex-col items-center gap-3 py-2 text-center">
      <span
        className="flex size-12 items-center justify-center rounded-full bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300"
        aria-hidden="true"
      >
        <AlertTriangle className="size-6" />
      </span>
      <p className="flex items-center gap-2 text-sm text-text-secondary">
        <span>{label}</span>
      </p>
      <Button variant="outline" onClick={onRegenerate}>
        <RefreshCw aria-hidden="true" />
        <span>{regenerateLabel}</span>
      </Button>
    </div>
  );
}
