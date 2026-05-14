'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { ArrowUpRight } from 'lucide-react';

import { Button } from '@/components/ui/button';
import type { Behoerde } from '@/types';

import { KorrekturwegFeBehoerdeModal } from './KorrekturwegFeBehoerdeModal';

interface KorrekturwegFeBehoerdeCTAProps {
  /** Zuständige FE-Behörde (kommune; § 73 FeV). */
  feBehoerde?: Behoerde;
  /** Optional: telemetrie-Hook für Activity-Log-Eintrag „kfz_korrekturweg_fe_cta_opened". */
  onOpened?: (behoerdeName: string) => void;
}

/**
 * `<KorrekturwegFeBehoerdeCTA>` (Spec § 4.1 / VL-10).
 *
 * CTA-Button-Pair zur kommunalen FE-Behörde + Wegweiser-Modal.
 * **Kein** Self-Edit; keine FE-Nr-Mutation.
 */
export function KorrekturwegFeBehoerdeCTA({
  feBehoerde,
  onOpened,
}: KorrekturwegFeBehoerdeCTAProps) {
  const t = useTranslations('stammdaten.mobilitaet.fe');

  const [open, setOpen] = React.useState(false);

  const handleOpen = () => {
    setOpen(true);
    if (feBehoerde && onOpened) {
      onOpened(feBehoerde.name_de);
    }
  };

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={handleOpen}
        data-testid="korrekturweg-fe-cta"
        className="self-start gap-1"
      >
        <ArrowUpRight className="size-3.5" aria-hidden="true" />
        {t('korrekturweg_cta')}
      </Button>
      <KorrekturwegFeBehoerdeModal
        open={open}
        onOpenChange={(next) => {
          if (!next) setOpen(false);
        }}
        behoerde={feBehoerde}
        onClose={() => setOpen(false)}
      />
    </>
  );
}
