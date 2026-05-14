'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { Gauge } from 'lucide-react';

import { wrapNormZitate } from '@/components/posteingang/wrapNormZitate';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

import { PunkteEidReauthModal } from './PunkteEidReauthModal';
import {
  PunkteResultCard,
  type PunkteResultView,
} from './PunkteResultCard';

interface PunktestandOnDemandCardProps {
  /** Mock-Pull-Funktion (vom Mock-Backend api.getPunktestandOnDemand). */
  onPull: () => Promise<PunkteResultView>;
  /** Disabled wenn keine Fahrerlaubnis im Profil hinterlegt (Lena-Schmidt-Fall). */
  disabledNoFe?: boolean;
  className?: string;
}

/**
 * `<PunktestandOnDemandCard>` (Spec § 4.1 / VL-8 / HL-MOB-11).
 *
 * Stub-Card mit Default-State „Punktestand abrufen" + Disclaimer-Marker
 * `faer_punkte_on_demand`. Klick öffnet `<PunkteEidReauthModal>`; nach
 * erfolgreichem Pull rendert `<PunkteResultCard>` mit 5-min-TTL.
 *
 * **Niemals** in `localStorage` (HL-MOB-11). State lebt component-local;
 * TTL-Expiry resettet auf CTA.
 */
export function PunktestandOnDemandCard({
  onPull,
  disabledNoFe,
  className,
}: PunktestandOnDemandCardProps) {
  const t = useTranslations('stammdaten.mobilitaet.punkte');
  const tToast = useTranslations('stammdaten.mobilitaet.toast');
  const tDisclaimer = useTranslations('stammdaten.disclaimer');

  const [modalOpen, setModalOpen] = React.useState(false);
  const [pending, setPending] = React.useState(false);
  const [result, setResult] = React.useState<PunkteResultView | null>(null);

  const handleConfirm = async () => {
    setPending(true);
    try {
      const r = await onPull();
      setResult(r);
      setModalOpen(false);
      toast.success(tToast('punkte_pulled'));
    } catch (err) {
      toast.error(t('error.toast'));
      if (typeof console !== 'undefined') console.error(err);
    } finally {
      setPending(false);
    }
  };

  return (
    <section
      aria-labelledby="punktestand-card-title"
      className={cn(
        'flex flex-col gap-3 rounded-xl border border-border bg-card p-4 shadow-sm',
        className,
      )}
      data-testid="punktestand-on-demand-card"
    >
      <header className="flex items-center gap-2">
        <Gauge className="size-4 text-muted-foreground" aria-hidden="true" />
        <h3
          id="punktestand-card-title"
          className="text-sm font-semibold tracking-tight text-foreground"
        >
          {t('title')}
        </h3>
      </header>

      <p className="text-xs leading-relaxed text-muted-foreground">
        {wrapNormZitate(tDisclaimer('faer_punkte_on_demand'))}
      </p>

      {result ? (
        <PunkteResultCard
          result={result}
          onExpired={() => setResult(null)}
        />
      ) : (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="self-start"
          disabled={disabledNoFe}
          onClick={() => setModalOpen(true)}
          data-testid="punktestand-cta-pull"
          title={disabledNoFe ? t('cta_pull_disabled_no_fe') : undefined}
        >
          {t('cta_pull')}
        </Button>
      )}

      <PunkteEidReauthModal
        open={modalOpen}
        onOpenChange={(next) => {
          if (!next) setModalOpen(false);
        }}
        onCancel={() => setModalOpen(false)}
        onConfirm={handleConfirm}
        pending={pending}
      />
    </section>
  );
}
