'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { X } from 'lucide-react';

import type { Behoerde, Letter, Reply } from '@/types';

import {
  ReplyComposeContent,
  type ComposeShellRenderer,
} from './ReplyComposeContent';

interface ReplyInlinePanelProps {
  /** Steuert nur die Eintritts-/Austrittsanimation (AnimatePresence). */
  open: boolean;
  letter: Letter;
  empfaengerBehoerde: Behoerde | null;
  existingReply: Reply | null;
  onPersisted?: () => void;
  /** Schließen-Request (X / Escape) — Aufrufer fährt die Exit-Animation, dann Fokus-Rückgabe. */
  onRequestClose: () => void;
  /** Nach der Exit-Animation: Fokus zurück auf den auslösenden Button (§6.1). */
  onClosed: () => void;
}

/**
 * Inline-Compose-Panel (≥ 1100 px, Spec §4.1/§5). KEIN Portal, KEIN Dialog,
 * KEIN Backdrop, KEINE Fokusfalle — semantisch eine `<section>`-Region. Eintritt
 * per `aria-live` angekündigt; Fokus wandert beim Öffnen aufs Heading, beim
 * Schließen zurück auf den Trigger. Dismiss = X-Button + Escape (kein
 * Click-Outside). Motion: M1 column-enter/exit (transform+opacity), reduced-
 * motion über die globale Collapse + framer-motion `useReducedMotion`.
 */
export function ReplyInlinePanel({
  open,
  letter,
  empfaengerBehoerde,
  existingReply,
  onPersisted,
  onRequestClose,
  onClosed,
}: ReplyInlinePanelProps) {
  const t = useTranslations('posteingang.compose');
  const reduceMotion = useReducedMotion();

  const headingRef = React.useRef<HTMLHeadingElement | null>(null);
  const sectionRef = React.useRef<HTMLElement | null>(null);
  const nestedModalOpenRef = React.useRef(false);

  const [announcement, setAnnouncement] = React.useState('');

  // Öffnen: Fokus aufs Heading + polite-Ankündigung (§6.1).
  React.useEffect(() => {
    if (!open) return;
    const id = window.setTimeout(() => {
      headingRef.current?.focus();
    }, 0);
    setAnnouncement(t('inline.opened_announcement'));
    return () => window.clearTimeout(id);
  }, [open, t]);

  function handleKeyDown(event: React.KeyboardEvent<HTMLElement>) {
    if (event.key !== 'Escape') return;
    // Solange ein nested-Modal offen ist, gehört Escape diesem (§6.3) — base-ui
    // stoppt die Propagation ohnehin, dies ist die zusätzliche Absicherung.
    if (nestedModalOpenRef.current) return;
    event.stopPropagation();
    requestClose();
  }

  function requestClose() {
    setAnnouncement(t('inline.closed_announcement'));
    onRequestClose();
  }

  const renderShell: ComposeShellRenderer = (chrome) => (
    <div className="flex flex-col">
      <button
        type="button"
        onClick={requestClose}
        aria-label={t('sheet_close_aria')}
        className="absolute right-3 top-3 z-10 inline-flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-foreground/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
      >
        <X className="size-4" aria-hidden="true" />
      </button>
      {chrome}
    </div>
  );

  return (
    <AnimatePresence onExitComplete={onClosed}>
      {open && (
        <motion.section
          ref={sectionRef}
          aria-labelledby="reply-compose-heading"
          onKeyDown={handleKeyDown}
          data-testid="reply-inline-panel"
          tabIndex={0}
          className="relative flex max-h-[calc(100vh-7rem)] flex-col overflow-y-auto rounded-2xl border border-border bg-surface text-text-primary shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
          {...(reduceMotion
            ? {}
            : {
                // M1-in: 220 ms ease-out; M1-out: 160 ms ease-in (Spec §7).
                initial: { opacity: 0, x: 14 },
                animate: {
                  opacity: 1,
                  x: 0,
                  transition: { duration: 0.22, ease: 'easeOut' },
                },
                exit: {
                  opacity: 0,
                  x: 14,
                  transition: { duration: 0.16, ease: 'easeIn' },
                },
              })}
        >
          <div className="sr-only" role="status" aria-live="polite">
            {announcement}
          </div>

          <ReplyComposeContent
            variant="inline"
            letter={letter}
            empfaengerBehoerde={empfaengerBehoerde}
            existingReply={existingReply}
            onPersisted={onPersisted}
            onRequestClose={requestClose}
            headingRef={headingRef}
            onNestedModalOpenChange={(anyOpen) => {
              nestedModalOpenRef.current = anyOpen;
            }}
            renderShell={renderShell}
          />
        </motion.section>
      )}
    </AnimatePresence>
  );
}
