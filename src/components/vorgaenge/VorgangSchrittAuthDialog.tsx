'use client';

import * as React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { CalendarClock, Fingerprint, Loader2, ShieldCheck } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

/** Autorisierungs-Modus eines Vorgang-Schritts (Spec vorgang-schritt-autopilot §3.2). */
export type VorgangSchrittAuthMode = 'eid' | 'consent' | 'termin';

interface VorgangSchrittAuthDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /**
   * Führt den eigentlichen Write aus (api.starteVorgangSchritt → Erfolgs-Toast →
   * Reconcile). Wirft bei einem Boundary-Fehler → der Dialog bleibt offen (Retry);
   * der Fehler-Toast kommt aus dem Aufrufer (der Schritt bleibt unangetastet).
   */
  onConfirm: () => Promise<void>;
  mode: VorgangSchrittAuthMode;
  behoerdeName: string;
  datenkategorien: string[];
  /** Maskierte Konto-Vorschau (nur eid, z. B. Steuer-Nachzahlung). */
  eidPreview?: string;
}

const MODE_ICON: Record<VorgangSchrittAuthMode, typeof Fingerprint> = {
  eid: Fingerprint,
  consent: ShieldCheck,
  termin: CalendarClock,
};

/**
 * Uniforme Autorisierungs-Oberfläche für alle drei Confirm-Typen (eID /
 * Einwilligung / Termin). Spiegelt das bewährte `EidConfirmDialog`-Muster
 * (base-ui `Dialog` = inert-Fokus-Trap; reduced-motion-Puls), schließt aber nur
 * im Erfolgsfall — ein Boundary-Fehler hält den Dialog für einen erneuten
 * Versuch offen.
 */
export function VorgangSchrittAuthDialog({
  open,
  onOpenChange,
  onConfirm,
  mode,
  behoerdeName,
  datenkategorien,
  eidPreview,
}: VorgangSchrittAuthDialogProps) {
  const tv = useTranslations('vorgang.detail');
  const reduce = useReducedMotion();
  const [pulsing, setPulsing] = React.useState(false);

  React.useEffect(() => {
    if (!open) setPulsing(false);
  }, [open]);

  const Icon = MODE_ICON[mode];
  const kategorien = datenkategorien.join(', ');

  const title =
    mode === 'consent'
      ? tv('auth_dialog_consent_title')
      : mode === 'termin'
        ? tv('auth_dialog_termin_title')
        : tv('auth_dialog_eid_title');

  const body =
    mode === 'consent'
      ? tv('auth_dialog_body_consent', { behoerde: behoerdeName, kategorien })
      : mode === 'termin'
        ? tv('auth_dialog_body_termin', { behoerde: behoerdeName })
        : tv('auth_dialog_body_eid', { kategorien });

  const confirmLabel =
    mode === 'consent'
      ? tv('next_step_cta_consent')
      : mode === 'termin'
        ? tv('next_step_cta_termin')
        : tv('next_step_cta_eid');

  async function handleConfirm() {
    if (pulsing) return;
    setPulsing(true);
    try {
      await onConfirm();
      onOpenChange(false); // nur im Erfolgsfall schließen
    } catch {
      // Boundary-Fehler: Dialog offen lassen (Retry), Toast kam aus onConfirm.
      setPulsing(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{body}</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center gap-4 py-4">
          <motion.span
            className="flex size-20 items-center justify-center rounded-full bg-primary/10 text-primary"
            aria-hidden="true"
            animate={
              pulsing && !reduce
                ? { scale: [1, 1.12, 1], opacity: [0.7, 1, 0.7] }
                : { scale: 1, opacity: 1 }
            }
            transition={{
              duration: reduce ? 0 : 1.4,
              repeat: pulsing && !reduce ? Infinity : 0,
              ease: 'easeInOut',
            }}
          >
            <Icon className="size-10" aria-hidden="true" />
          </motion.span>

          {mode === 'eid' && eidPreview ? (
            <p className="text-center text-sm text-text-secondary">
              <span className="text-muted-foreground">
                {tv('auth_dialog_eid_preview_label')}:
              </span>{' '}
              <span className="vd-mono">{eidPreview}</span>
            </p>
          ) : null}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={pulsing}
          >
            {tv('auth_dialog_cancel')}
          </Button>
          {/* Während des Laufs `aria-disabled` + Click-Guard (kein natives
            * `disabled`): ein natives disabled zöge den Fokus sofort auf <body>
            * (WCAG 2.4.3). So bleibt der Fokus auf dem Button, bis der Dialog
            * schließt und die Detailseite ihn explizit weiterreicht. */}
          <Button
            onClick={handleConfirm}
            aria-disabled={pulsing}
            aria-busy={pulsing}
            className={pulsing ? 'opacity-70' : undefined}
          >
            {pulsing ? (
              <Loader2 className="animate-spin" aria-hidden="true" />
            ) : (
              <Icon aria-hidden="true" />
            )}
            <span>{pulsing ? tv('step_done_busy') : confirmLabel}</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
