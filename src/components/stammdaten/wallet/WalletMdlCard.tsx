'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { Smartphone } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

import {
  WalletMdlAttestationPreviewModal,
  type MdlPreviewData,
} from './WalletMdlAttestationPreviewModal';
import { VisionBanner2031 } from './VisionBanner2031';

interface WalletMdlCardProps {
  /**
   * Status der mDL-Attestation. V1.3-Default für alle 3 Personas:
   * `not_issued` (Vision-Banner + Mock-Preview-CTA enabled).
   */
  status: 'not_issued' | 'mock_preview_ready';
  /** Mock-Preview-Daten (immer befüllt aus persona.mobilitaet.fahrerlaubnis). */
  previewData: MdlPreviewData | null;
  /** Telemetry-Hook für Activity-Log-Eintrag `kfz_mdl_preview_opened`. */
  onPreviewOpened?: () => void;
  className?: string;
}

/**
 * `<WalletMdlCard>` (Spec § 4.2 / VL-7 / VL-9).
 *
 * Zweite Mock-Attestation-Card im Wallet-Sub-Tab (neben V1-PID-Card).
 * Vision-Banner 2029/2031 verbindlich; Preview-CTA öffnet
 * `<WalletMdlAttestationPreviewModal>` mit closed-enum-Toggles aus
 * ISO/IEC 18013-5 Annex B.
 */
export function WalletMdlCard({
  status,
  previewData,
  onPreviewOpened,
  className,
}: WalletMdlCardProps) {
  const t = useTranslations('stammdaten.wallet.mdl');

  const [modalOpen, setModalOpen] = React.useState(false);

  const handleOpen = () => {
    setModalOpen(true);
    onPreviewOpened?.();
  };

  return (
    <>
      <article
        aria-labelledby="wallet-mdl-card-title"
        className={cn(
          'flex flex-col gap-3 rounded-xl border border-border bg-card p-4 shadow-sm',
          className,
        )}
        data-testid="wallet-mdl-card"
      >
        <header className="flex items-center gap-2">
          <Smartphone
            className="size-4 text-muted-foreground"
            aria-hidden="true"
          />
          <h3
            id="wallet-mdl-card-title"
            className="text-sm font-semibold tracking-tight text-foreground"
          >
            {t('title')}
          </h3>
        </header>

        <VisionBanner2031 />

        <p className="text-xs text-muted-foreground">
          {t('status_not_issued')}
        </p>

        <Button
          type="button"
          variant="outline"
          size="sm"
          className="self-start"
          onClick={handleOpen}
          disabled={!previewData}
          title={!previewData ? t('preview_cta_disabled_tooltip') : undefined}
          data-testid="wallet-mdl-preview-cta"
        >
          {t('preview_cta')}
        </Button>
      </article>

      <WalletMdlAttestationPreviewModal
        open={modalOpen}
        onOpenChange={(next) => {
          if (!next) setModalOpen(false);
        }}
        previewData={previewData}
        onClose={() => setModalOpen(false)}
      />
      {/* status === 'mock_preview_ready' wird hier (V1.3) nicht weiter
          differenziert — Default-Path ist `not_issued` für alle 3 Personas. */}
      <span className="sr-only" data-testid="wallet-mdl-card-status">
        {status}
      </span>
    </>
  );
}
