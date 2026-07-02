'use client';

import * as React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import {
  Check,
  EyeOff,
  Fingerprint,
  Landmark,
  ShieldCheck,
} from 'lucide-react';
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
import type { Document } from '@/types';

interface PresentCredentialDialogProps {
  open: boolean;
  onOpenChange: (next: boolean) => void;
  doc: Document | null;
  /** Name der Inhaberin (aus der Persona), z. B. „Anna Petrov". */
  holderName: string;
  /** Name der anfragenden Stelle (aus `behoerden`), z. B. „Landesamt für Einwanderung Berlin (LEA)". */
  behoerdeName: string;
}

/** dd.mm.yyyy — lokaler Formatter, unabhängig vom Elternscope. */
function formatDeDate(iso: string | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  return `${day}.${month}.${d.getFullYear()}`;
}

function stripMock(s: string | undefined): string {
  return (s ?? '').replace(/^\[MOCK\]\s*/, '').trim();
}

function formatDeDateTime(d: Date): string {
  return new Intl.DateTimeFormat('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
}

/**
 * `<PresentCredentialDialog>` — Sichtbare Datenminimierung am
 * Present-Credential-Moment (wow-backlog #8).
 *
 * Wenn eine Behörde einen Nachweis anfragt, sieht die Bürgerin die EXAKT
 * angefragten Felder mit ihren Werten, bestätigt mit einem eID-Tipp
 * (biometrie-artiger Fingerprint-Puls) — und nichts sonst verlässt das Wallet.
 * Die übrigen Attribute des eAT werden als „Nicht übermittelt" durchgestrichen
 * gezeigt (Selective Disclosure gefühlt statt Kleingedrucktes).
 *
 * Honesty: [ZUKUNFT 2027]-Rollout-Zielbild + [MOCK] — keine reale Übermittlung,
 * kein Register-Abruf. Rechtsgrundlagen als Microline (eIDAS 2 / DSGVO / PAuswG).
 *
 * a11y: base-ui `<Dialog>` (ui/dialog) trägt die Fokusfalle + `inert`-Containment
 * bereits (`useStripBaseUiFocusGuardAriaHidden` + `useInertOutsideModal`). Title
 * + Description werden von base-ui automatisch an den Popup gebunden. Der
 * Fingerprint-Puls respektiert `prefers-reduced-motion`.
 */
export function PresentCredentialDialog({
  open,
  onOpenChange,
  doc,
  holderName,
  behoerdeName,
}: PresentCredentialDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {doc ? (
        <PresentCredentialContent
          doc={doc}
          holderName={holderName}
          behoerdeName={behoerdeName}
          onClose={() => onOpenChange(false)}
        />
      ) : null}
    </Dialog>
  );
}

type Phase = 'consent' | 'sharing' | 'done';

/** Die exakt drei angefragten Felder — plausible LEA-Anfrage zum eAT (FLAG #8). */
const REQUESTED_FIELD_KEYS = ['name', 'eat_nr', 'gueltigkeit'] as const;
/** Attribute des eAT, die bei dieser Anfrage NICHT übermittelt werden. */
const WITHHELD_FIELD_KEYS = [
  'anschrift',
  'geburtsdatum',
  'geburtsort',
  'lichtbild',
] as const;

function PresentCredentialContent({
  doc,
  holderName,
  behoerdeName,
  onClose,
}: {
  doc: Document;
  holderName: string;
  behoerdeName: string;
  onClose: () => void;
}) {
  const t = useTranslations('dokumente.present');
  const reducedMotion = useReducedMotion();
  const [phase, setPhase] = React.useState<Phase>('consent');
  const [sharedAt, setSharedAt] = React.useState<Date | null>(null);
  const timerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  React.useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const fieldValues: Record<(typeof REQUESTED_FIELD_KEYS)[number], string> = {
    name: holderName || '—',
    eat_nr: stripMock(doc.dokument_nr) || '—',
    gueltigkeit: formatDeDate(doc.gueltig_bis),
  };

  function handleConfirm() {
    setPhase('sharing');
    // Lokaler Wallet-Moment: eID-Tipp + Selective Disclosure. Es geht KEIN
    // Backend-Call raus (nichts wird kopiert, kein Register abgefragt) — das ist
    // der ehrliche Kern der Datenminimierung. Kurze Verzögerung für den
    // Bestätigungs-Puls.
    timerRef.current = setTimeout(() => {
      setSharedAt(new Date());
      setPhase('done');
    }, 900);
  }

  return (
    <DialogContent className="sm:max-w-lg" showCloseButton={phase !== 'sharing'}>
      <DialogHeader>
        <div className="flex flex-wrap items-center gap-2">
          <DialogTitle>{t('dialog_title')}</DialogTitle>
          <span className="rounded-full bg-surface-muted px-2 py-0.5 font-mono text-[10px] text-text-secondary">
            {t('zukunft_badge')}
          </span>
          <span className="rounded-full bg-surface-muted px-2 py-0.5 font-mono text-[10px] text-text-secondary">
            {t('mock_badge')}
          </span>
        </div>
        <DialogDescription>{t('subtitle')}</DialogDescription>
      </DialogHeader>

      {phase === 'done' ? (
        <DoneState
          count={REQUESTED_FIELD_KEYS.length}
          sharedAt={sharedAt}
          reducedMotion={reducedMotion}
        />
      ) : phase === 'sharing' ? (
        <SharingState reducedMotion={reducedMotion} />
      ) : (
        <div className="flex flex-col gap-4">
          {/* Anfragende Stelle */}
          <div className="flex items-center gap-3 rounded-lg border border-border bg-surface-muted/40 p-3">
            <span
              className="flex size-9 shrink-0 items-center justify-center rounded-full bg-surface-muted text-text-secondary"
              aria-hidden="true"
            >
              <Landmark className="size-4" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-text-primary">
                {behoerdeName}
              </p>
              <p className="text-xs text-text-secondary">{t('requester_typ')}</p>
            </div>
          </div>

          {/* Exakt angefragte Felder + Werte */}
          <div>
            <p className="mb-2 text-sm text-text-secondary">
              {t('asks_lead', { behoerde: behoerdeName })}
            </p>
            <dl
              className="flex flex-col gap-1.5 rounded-lg border border-primary/30 bg-primary/5 p-3"
              aria-label={t('asks_title')}
            >
              {REQUESTED_FIELD_KEYS.map((key) => (
                <div
                  key={key}
                  className="flex items-baseline justify-between gap-3"
                >
                  <dt className="flex items-center gap-1.5 text-sm text-text-secondary">
                    <Check
                      className="size-3.5 shrink-0 text-primary"
                      aria-hidden="true"
                    />
                    {t(`field.${key}`)}
                  </dt>
                  <dd className="text-end text-sm font-medium text-text-primary">
                    {fieldValues[key]}
                  </dd>
                </div>
              ))}
            </dl>
          </div>

          {/* „Mehr nicht." — durchgestrichene, nicht übermittelte Felder */}
          <div className="rounded-lg border border-border p-3">
            <p className="text-sm font-medium text-text-primary">
              {t('mehr_nicht_title')}
            </p>
            <p className="mt-0.5 text-xs text-text-secondary">
              {t('mehr_nicht_body')}
            </p>
            <ul
              className="mt-2 flex flex-wrap gap-x-4 gap-y-1"
              aria-label={t('withheld_title')}
            >
              {WITHHELD_FIELD_KEYS.map((key) => (
                <li
                  key={key}
                  className="flex items-center gap-1.5 text-xs text-muted-foreground"
                >
                  <EyeOff className="size-3 shrink-0" aria-hidden="true" />
                  <span className="line-through">{t(`withheld.${key}`)}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Honesty-Framing + Rechtsgrundlagen */}
          <div className="flex flex-col gap-1.5 border-t border-border pt-3">
            <p className="text-[11px] leading-relaxed text-text-secondary">
              {t('framing')}
            </p>
            <p className="text-[11px] leading-relaxed text-muted-foreground">
              {t('rechtsgrundlage')}
            </p>
          </div>
        </div>
      )}

      {phase === 'consent' ? (
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {t('cancel')}
          </Button>
          <Button onClick={handleConfirm}>
            <Fingerprint aria-hidden="true" />
            <span>{t('confirm')}</span>
          </Button>
        </DialogFooter>
      ) : phase === 'done' ? (
        <DialogFooter>
          <Button onClick={onClose}>{t('close')}</Button>
        </DialogFooter>
      ) : null}
    </DialogContent>
  );
}

function SharingState({ reducedMotion }: { reducedMotion: boolean | null }) {
  const t = useTranslations('dokumente.present');
  return (
    <div
      className="flex flex-col items-center gap-3 py-8"
      role="status"
      aria-live="polite"
    >
      <motion.span
        className="flex size-20 items-center justify-center rounded-full bg-primary/10 text-primary"
        animate={
          reducedMotion
            ? { scale: 1, opacity: 1 }
            : { scale: [1, 1.15, 1], opacity: [0.7, 1, 0.7] }
        }
        transition={{
          duration: reducedMotion ? 0 : 1.5,
          repeat: reducedMotion ? 0 : Infinity,
          ease: 'easeInOut',
        }}
      >
        <Fingerprint className="size-10" aria-hidden="true" />
      </motion.span>
      <p className="text-sm text-text-secondary">{t('sharing')}</p>
    </div>
  );
}

function DoneState({
  count,
  sharedAt,
  reducedMotion,
}: {
  count: number;
  sharedAt: Date | null;
  reducedMotion: boolean | null;
}) {
  const t = useTranslations('dokumente.present');
  return (
    <div
      className="flex flex-col items-center gap-3 py-4 text-center"
      role="status"
      aria-live="polite"
    >
      <motion.span
        className="flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary"
        initial={reducedMotion ? false : { scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: reducedMotion ? 0 : 0.25 }}
        aria-hidden="true"
      >
        <ShieldCheck className="size-7" />
      </motion.span>
      <div>
        <p className="text-base font-semibold text-text-primary">
          {t('done_title')}
        </p>
        <p className="mt-1 text-sm font-medium text-primary">
          {t('done_summary', { count })}
        </p>
      </div>
      <p className="max-w-sm text-xs leading-relaxed text-text-secondary">
        {t('done_note')}
      </p>
      {sharedAt ? (
        <p className="text-[11px] text-muted-foreground">
          {t('done_time', { datum: formatDeDateTime(sharedAt) })}
        </p>
      ) : null}
    </div>
  );
}
