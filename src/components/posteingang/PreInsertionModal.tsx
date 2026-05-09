import type { ReplyTemplateId } from '@/types';

interface PreInsertionModalProps {
  open: boolean;
  onOpenChange: (next: boolean) => void;
  templateId: ReplyTemplateId | 'freitext' | null;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Pre-Insertion-Modal-Slot. V1.5.0 ist dies eine leere Hülle — die zwei
 * Skelett-Templates `rechtsbehelf_skelett_einspruch` /
 * `rechtsbehelf_skelett_widerspruch` sind V1.5.0-OUT (siehe Spec §4.6.2 +
 * Verifier-Out-of-Scope #4).
 *
 * V1.5.1 wird hier den `<AlertDialog>` mit dem Adressat-Risiko-Wortlaut
 * (§ 357 Abs. 2 AO) und den Pflicht-Disclaimern aus
 * `posteingang.compose.template_disclaimer.skelett` rendern.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function PreInsertionModal(_props: PreInsertionModalProps): null {
  // TODO(V1.5.1): Render shadcn `<AlertDialog>` with Adressat-Risiko-Wortlaut
  //   wenn `templateId === 'rechtsbehelf_skelett_einspruch' | 'rechtsbehelf_skelett_widerspruch'`.
  return null;
}
