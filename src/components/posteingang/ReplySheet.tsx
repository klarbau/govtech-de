'use client';

import type { Behoerde, Letter, Reply } from '@/types';

import { ReplyModalSheet } from './ReplyModalSheet';

interface ReplySheetProps {
  open: boolean;
  onOpenChange: (next: boolean) => void;
  letter: Letter;
  empfaengerBehoerde: Behoerde | null;
  /** Optional: gesendete Reply, falls vorhanden — öffnet im Read-only-Confirmation-Mode. */
  existingReply: Reply | null;
  /** Wird nach Versand / Save gerufen, damit der Aufrufer Briefdaten neu lädt. */
  onPersisted?: () => void;
}

/**
 * Rückwärtskompatibler Re-Export (Spec §5.1: „umbauen, nicht löschen").
 *
 * Der gesamte frühere Compose-Innenkörper lebt jetzt wrapper-agnostisch in
 * `ReplyComposeContent`; der modale Sheet-Vertrag (Backdrop, Fokusfalle,
 * Animation) liegt unverändert in `ReplyModalSheet`. `<ReplySheet>` bleibt als
 * dünner Alias erhalten, damit bestehende Konsumenten (`LetterReader`,
 * `LetterReaderProto`) ohne Änderung weiter den modalen Sheet bekommen.
 * `PosteingangInbox` nutzt stattdessen direkt den `ReplyInlinePanel`/
 * `ReplyModalSheet`-Gateway (Inline ↔ Modal).
 */
export function ReplySheet(props: ReplySheetProps) {
  return <ReplyModalSheet {...props} />;
}
