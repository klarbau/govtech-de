'use client';

import * as React from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Check } from 'lucide-react';

import {
  useLiveSignals,
  useTransientFlag,
} from '@/components/providers/LiveBackendProvider';

/**
 * Beat 1 — „Autopilot arbeitet"-Ambient-Indikator in der Top-Navigation.
 *
 * Idle (kein laufender Vorgang) → rendert NICHTS (keine tote Fläche). Sobald ein
 * echter Vorgang läuft, erscheint eine dezente Pille mit ruhig pulsierendem
 * Punkt (`--color-primary`) und dem Text „Autopilot aktiv" — ein Link zum
 * Assistenten, wo der Kaskaden-Thread läuft. Bei jedem frisch bestätigten
 * Schritt (`confirmNonce` tickt hoch) ein EINMALIGER kurzer Häkchen-Tick, dann
 * zurück zum ruhigen Puls.
 *
 * a11y: KEINE aria-live-Region (der Indikator ist rein visuell). Der accessible
 * name ist statisch beschreibend. Reduced-Motion wird global neutralisiert →
 * der Punkt steht dann still, der Indikator bleibt sichtbar.
 */
export function AutopilotPulse() {
  const t = useTranslations('liveness');
  const { runningCount, confirmNonce } = useLiveSignals();
  const [ticking, tick] = useTransientFlag(900);
  const seenNonceRef = React.useRef(confirmNonce);

  React.useEffect(() => {
    if (confirmNonce === seenNonceRef.current) return;
    seenNonceRef.current = confirmNonce;
    tick();
  }, [confirmNonce, tick]);

  if (runningCount <= 0) return null;

  return (
    <Link
      href="/assistent"
      className="lw-pulse"
      aria-label={t('autopilot_active_aria')}
    >
      <span
        className={`lw-pulse-dot${ticking ? ' lw-pulse-dot--tick' : ''}`}
        aria-hidden="true"
      >
        {ticking ? <Check className="lw-pulse-check" /> : null}
      </span>
      <span className="lw-pulse-text">{t('autopilot_active')}</span>
    </Link>
  );
}
