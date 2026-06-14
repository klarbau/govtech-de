'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';

import { Sheet, SheetContent } from '@/components/ui/sheet';
import type { Behoerde, Letter, Reply } from '@/types';

import {
  ReplyComposeContent,
  type ComposeShellRenderer,
} from './ReplyComposeContent';

interface ReplyModalSheetProps {
  open: boolean;
  onOpenChange: (next: boolean) => void;
  letter: Letter;
  empfaengerBehoerde: Behoerde | null;
  existingReply: Reply | null;
  onPersisted?: () => void;
}

/**
 * Modaler Compose-Wrapper (< 1100 px, Spec §4.2/§5). Verhalten unverändert
 * gegenüber dem geprüften `ReplySheet`: base-ui-`Dialog` mit Backdrop,
 * `aria-modal`, Fokusfalle-Hooks + manuellem Tab-Zyklus (alles in `SheetContent`),
 * Eintrittsanimation `fade-in-0 slide-in-from-right-4`. Escape + Backdrop-Klick
 * schließen (base-ui-Default). Rendert das stabile `ReplyComposeContent` als
 * Render-Slot-Kern, sodass ein Inline↔Modal-Wechsel den Entwurf nicht verliert
 * (§6.4).
 */
export function ReplyModalSheet({
  open,
  onOpenChange,
  letter,
  empfaengerBehoerde,
  existingReply,
  onPersisted,
}: ReplyModalSheetProps) {
  const t = useTranslations('posteingang.compose');

  const renderShell: ComposeShellRenderer = (chrome) => (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        aria-labelledby="reply-compose-heading"
        closeAriaLabel={t('sheet_close_aria')}
      >
        {chrome}
      </SheetContent>
    </Sheet>
  );

  return (
    <ReplyComposeContent
      variant="modal"
      letter={letter}
      empfaengerBehoerde={empfaengerBehoerde}
      existingReply={existingReply}
      onPersisted={onPersisted}
      onRequestClose={() => onOpenChange(false)}
      renderShell={renderShell}
    />
  );
}
