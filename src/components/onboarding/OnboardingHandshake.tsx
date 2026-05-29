'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useReducedMotion } from 'framer-motion';
import { CheckCircle2, Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { OnboardingQrMock } from '@/components/onboarding/OnboardingQrMock';
import { cn } from '@/lib/utils';

interface OnboardingHandshakeProps {
  method: 'deutschlandid' | 'eudi';
  onDone: () => void;
  onCancel: () => void;
}

const METHOD_LABEL: Record<OnboardingHandshakeProps['method'], string> = {
  deutschlandid: 'DeutschlandID',
  eudi: 'EUDI Wallet',
};

const HANDSHAKE_MS = 1500;
const REDUCED_MOTION_MS = 150;

/**
 * Simulated identity handshake (Screen B). Client-only latency mock — no
 * mock-backend call, no error path (the demo always settles green). Under
 * reduced motion the spinner is static and the wait collapses to an instant.
 */
export function OnboardingHandshake({
  method,
  onDone,
  onCancel,
}: OnboardingHandshakeProps) {
  const t = useTranslations('onboarding.handshake');
  const prefersReducedMotion = useReducedMotion();
  const [phase, setPhase] = useState<'connecting' | 'confirmed'>('connecting');
  const statusRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    statusRef.current?.focus();
  }, []);

  useEffect(() => {
    const duration = prefersReducedMotion ? REDUCED_MOTION_MS : HANDSHAKE_MS;
    const settleTimer = window.setTimeout(() => {
      setPhase('confirmed');
    }, duration);
    return () => window.clearTimeout(settleTimer);
  }, [prefersReducedMotion]);

  useEffect(() => {
    if (phase !== 'confirmed') return;
    // Brief beat so the „bestätigt"-state is announced before advancing.
    const advanceTimer = window.setTimeout(
      onDone,
      prefersReducedMotion ? 0 : 600,
    );
    return () => window.clearTimeout(advanceTimer);
  }, [phase, onDone, prefersReducedMotion]);

  const methodLabel = METHOD_LABEL[method];
  const confirmed = phase === 'confirmed';

  return (
    <Card className="mx-auto w-full max-w-md items-center gap-6 p-8 text-center">
      <OnboardingQrMock label={t('qr_label')} />

      <div className="flex flex-col items-center gap-3">
        {confirmed ? (
          <CheckCircle2 className="size-7 text-success" aria-hidden="true" />
        ) : (
          <Loader2
            className={cn(
              'size-7 text-primary',
              !prefersReducedMotion && 'animate-spin',
              'motion-reduce:animate-none',
            )}
            aria-hidden="true"
          />
        )}
        <p
          ref={statusRef}
          tabIndex={-1}
          role="status"
          aria-live="polite"
          className="text-base font-medium text-text-primary outline-none"
        >
          {confirmed
            ? t('confirmed')
            : t('connecting', { method: methodLabel })}
        </p>
      </div>

      <p className="text-sm text-text-muted">{t('mock_note')}</p>

      <Button variant="ghost" onClick={onCancel} disabled={confirmed}>
        {t('cancel')}
      </Button>
    </Card>
  );
}
