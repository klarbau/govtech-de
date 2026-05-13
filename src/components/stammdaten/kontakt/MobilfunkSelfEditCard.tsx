'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { format, parseISO } from 'date-fns';
import { de as deLocale } from 'date-fns/locale';
import { CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

import { api } from '@/lib/mock-backend';
import { Button } from '@/components/ui/button';
import { wrapNormZitate } from '@/components/posteingang/wrapNormZitate';
import type { PersonaId } from '@/types';

import { MobilOtpMockModal } from './MobilOtpMockModal';

interface MobilfunkSelfEditCardProps {
  personaId: PersonaId;
  value?: string;
  verified: boolean;
  verifiziertAm?: string;
  /** Callback nach erfolgreicher Verifikation — Caller refresht Daten. */
  onVerified?: () => void;
}

/**
 * `<MobilfunkSelfEditCard>` — Spec § 6.5.
 *
 * Card 3: Mobilfunk read+self-edit. Verifikations-Status; CTA „Verifizieren
 * (Mock-OTP)" → öffnet `<MobilOtpMockModal>`. Hard-Line § 11.37: nur als
 * Notification-Träger, niemals als Bekanntgabe-Kanal.
 */
export function MobilfunkSelfEditCard({
  personaId,
  value,
  verified,
  verifiziertAm,
  onVerified,
}: MobilfunkSelfEditCardProps) {
  const t = useTranslations('stammdaten.kontakt.card.mobil');
  const tMobil = useTranslations('stammdaten.kontakt.mobil');
  const tModal = useTranslations('stammdaten.kontakt.modal.mobil_otp');

  const [otpOpen, setOtpOpen] = React.useState(false);
  const [otpPending, setOtpPending] = React.useState(false);
  const [otpError, setOtpError] = React.useState<string | null>(null);

  let verifiedText = t('not_verified_label');
  if (verified && verifiziertAm) {
    try {
      const formatted = format(parseISO(verifiziertAm), 'dd.MM.yyyy', {
        locale: deLocale,
      });
      verifiedText = t('verified_label', { datum: formatted });
    } catch {
      verifiedText = t('verified_label', { datum: verifiziertAm });
    }
  }

  const handleVerify = async (code: string) => {
    setOtpPending(true);
    setOtpError(null);
    try {
      // Mock-Backend signature per spec § 5.1.
      const result = await api.simulateMobilOtpFlow(personaId, { code });
      if (result.verified) {
        setOtpOpen(false);
        toast.success(tModal('success_toast'));
        onVerified?.();
      } else {
        setOtpError(tModal('error_invalid'));
      }
    } catch {
      setOtpError(tModal('error_invalid'));
    } finally {
      setOtpPending(false);
    }
  };

  return (
    <article
      className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4"
      data-testid="mobilfunk-self-edit-card"
    >
      <header>
        <h3 className="text-sm font-semibold tracking-tight text-foreground">
          {t('title')}
        </h3>
      </header>

      <div className="flex flex-col gap-1">
        {value ? (
          <p
            className="font-mono text-sm text-foreground"
            data-testid="mobil-value"
          >
            {value}
          </p>
        ) : (
          <p className="text-xs text-muted-foreground">
            {t('no_value_helper')}
          </p>
        )}
        {value && (
          <p
            className="inline-flex items-center gap-1 text-xs text-muted-foreground"
            data-testid="mobil-verified-state"
            data-verified={verified ? 'true' : 'false'}
          >
            {verified && (
              <CheckCircle2
                aria-hidden="true"
                className="size-3 text-emerald-600 dark:text-emerald-400"
              />
            )}
            {verifiedText}
          </p>
        )}
      </div>

      {value && !verified && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setOtpOpen(true)}
          data-testid="mobil-cta-verify"
          className="w-fit"
        >
          {t('cta_verify')}
        </Button>
      )}

      <p
        className="text-xs leading-relaxed text-muted-foreground"
        data-disclaimer-marker="mobil_self_attested_no_authoritative_register"
      >
        {wrapNormZitate(tMobil('disclaimer_self_attested'))}
      </p>

      <p className="rounded-md border-l-2 border-amber-400 bg-amber-50/60 px-3 py-2 text-xs leading-relaxed text-amber-900 dark:border-amber-700 dark:bg-amber-900/20 dark:text-amber-100">
        {wrapNormZitate(tMobil('hardlock_only_notification'))}
      </p>

      <MobilOtpMockModal
        open={otpOpen}
        onOpenChange={(next) => {
          if (!next) {
            setOtpOpen(false);
            setOtpError(null);
          }
        }}
        onVerify={handleVerify}
        onCancel={() => {
          setOtpOpen(false);
          setOtpError(null);
        }}
        pending={otpPending}
        errorText={otpError}
      />
    </article>
  );
}
