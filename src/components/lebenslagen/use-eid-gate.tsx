'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';

import { EidConfirmDialog } from '@/components/umzug/EidConfirmDialog';
import type { CascadeRowData } from './lebenslagen-shared';

interface UseEidGateArgs {
  rows: CascadeRowData[];
  vorgangId: string | null;
  /** Konsumentenspezifischer Bestätigungsaufruf (api.bestaetige*). */
  confirmStep: (vorgangId: string, stepId: string) => Promise<void>;
}

interface UseEidGateResult {
  /** Öffnet das eID-Gate für einen Schritt — an `VorgangInBearbeitung.onConfirmEid`. */
  requestEid: (stepId: string) => void;
  /** Fertig gerenderter Bestätigungsdialog; der Konsument hängt ihn ein. */
  eidDialog: React.ReactElement;
}

/**
 * eID-Gate des Dossiers: das Öffnen/Schließen des `EidConfirmDialog`, der
 * Behörden-Lookup der gewählten Zeile und der Bestätigungsaufruf — geteilt von
 * den beiden Dossier-Konsumenten (Lebenslage-Kaskade und Umzug-Run), die sich
 * nur in der injizierten `confirmStep`-Operation unterscheiden.
 */
export function useEidGate({
  rows,
  vorgangId,
  confirmStep,
}: UseEidGateArgs): UseEidGateResult {
  const td = useTranslations('lebenslagen.detail');
  const [eidStepId, setEidStepId] = React.useState<string | null>(null);

  const eidRow = React.useMemo(
    () => rows.find((r) => r.step.id === eidStepId) ?? null,
    [rows, eidStepId],
  );

  function requestEid(stepId: string) {
    setEidStepId(stepId);
  }

  const eidDialog = (
    <EidConfirmDialog
      open={eidStepId !== null}
      onOpenChange={(open) => {
        if (!open) setEidStepId(null);
      }}
      title={td('eid_dialog.title')}
      body={td('eid_dialog.body_template', { behoerde: eidRow?.behoerdeName ?? '' })}
      confirmLabel={td('eid_dialog.confirm')}
      cancelLabel={td('eid_dialog.cancel')}
      onConfirm={async () => {
        if (!vorgangId || !eidStepId) return;
        try {
          await confirmStep(vorgangId, eidStepId);
        } catch {
          /* mock latency error — keep the step gated for retry; don't orphan the rejection */
        } finally {
          setEidStepId(null);
        }
      }}
    />
  );

  return { requestEid, eidDialog };
}
