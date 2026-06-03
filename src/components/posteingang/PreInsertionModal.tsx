'use client';

import * as React from 'react';
import { AlertDialog as AlertDialogPrimitive } from '@base-ui/react/alert-dialog';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';
import { useStripBaseUiFocusGuardAriaHidden } from '@/components/ui/use-strip-base-ui-focus-guard-aria-hidden';
import { useInertOutsideModal } from '@/components/ui/use-inert-outside-modal';
import { cn } from '@/lib/utils';
import type { Behoerde, Letter, ReplyTemplateId } from '@/types';

import { wrapNormZitate } from './wrapNormZitate';
import {
  getPreInsertionModalSpec,
  pickNormFamilie,
} from './preInsertionModalLookup';

interface PreInsertionModalProps {
  open: boolean;
  onOpenChange: (next: boolean) => void;
  /** Letter, auf den das Skelett-Template angewendet wird. */
  letter: Letter;
  /** Empfänger-Behörde (für `{empfaenger_behoerde}`-Token im Modal-Body). */
  empfaengerBehoerde: Behoerde | null;
  /**
   * Skelett-Template-ID. Bei `null` / nicht-Skelett rendert das Modal
   * nichts (defensiv — Hard-Line § 11.13: Modal feuert nur bei Skeletten).
   */
  templateId: ReplyTemplateId | null;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Pre-Insertion-Modal (Spec § 7).
 *
 * Vier Varianten (AO / SGG / VwGO / AO-Aussetzung) — Norm-Familie via
 * `pickNormFamilie(letter, templateId)`. Bei AO + Familienkasse-Aufhebungs-/
 * Ablehnungsbescheid wird zusätzlich der Familienkasse-AO-Erklärer-Sentence
 * mandatorisch (§ 11.4).
 *
 * a11y:
 *   - `role="alertdialog"` durch base-ui `<AlertDialog>`-Default
 *   - `aria-modal="true"`, `aria-labelledby`, `aria-describedby` gesetzt
 *   - focus-trap (base-ui-Default)
 *   - ESC schließt mit Cancel-Semantik
 *   - jedes §-numerische Norm-Zitat im Body wird durch `<NormZitatSpan>`
 *     gewrappt (Hard-Line § 11.5).
 *
 * Hard-Line § 11.13: niemals „nicht mehr zeigen"-Checkbox.
 */
export function PreInsertionModal({
  open,
  onOpenChange,
  letter,
  empfaengerBehoerde,
  templateId,
  onConfirm,
  onCancel,
}: PreInsertionModalProps): React.ReactElement | null {
  // Top-Level-Translator — mock-backend liefert volle key-Pfade
  // („posteingang.compose.pre_insertion_modal.einspruch_ao.title").
  const t = useTranslations();
  useStripBaseUiFocusGuardAriaHidden(open);
  useInertOutsideModal(open);

  const popupRef = React.useRef<HTMLDivElement | null>(null);

  // Expliziter Tab-Zyklus innerhalb des Popups. base-ui 1.5.0 hält den Fokus
  // nicht zuverlässig im verschachtelten AlertDialog (geöffnet aus dem bereits
  // offenen ReplySheet) — der erste Tab entkommt zum <body> (WCAG 2.4.3 / 2.1.2;
  // BITV 2.0). Wir wrappen den Fokus deterministisch zwischen erstem und letztem
  // fokussierbaren Element des Popups.
  function handlePopupKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.key !== 'Tab') return;
    const popup = popupRef.current;
    if (!popup) return;
    const focusables = Array.from(
      popup.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      ),
    ).filter((el) => el.offsetParent !== null || el === document.activeElement);
    if (focusables.length === 0) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    const active = document.activeElement as HTMLElement | null;
    if (event.shiftKey) {
      if (active === first || !popup.contains(active)) {
        event.preventDefault();
        last.focus();
      }
    } else if (active === last || !popup.contains(active)) {
      event.preventDefault();
      first.focus();
    }
  }

  if (!templateId) return null;

  let norm: ReturnType<typeof pickNormFamilie>;
  try {
    norm = pickNormFamilie(letter, templateId);
  } catch {
    return null;
  }

  const spec = getPreInsertionModalSpec(norm, letter);
  const empfaengerName = empfaengerBehoerde?.name_de ?? '';

  let title: string;
  let body: string;
  let ctaContinue: string;
  let ctaCancel: string;
  try {
    title = t(spec.modal_title_key);
    body = t(spec.modal_body_key, { empfaenger_behoerde: empfaengerName });
    ctaContinue = t(spec.cta_continue_key);
    ctaCancel = t(spec.cta_cancel_key);
  } catch {
    // i18n nicht verfügbar (parallel-agent race): rendere graceful nichts —
    // der Caller bekommt onCancel-Verhalten via base-ui ESC.
    return null;
  }

  const additionalExplainer = (() => {
    if (!spec.additional_explainer_key) return null;
    try {
      return t(spec.additional_explainer_key);
    } catch {
      return null;
    }
  })();

  const titleId = `pre-insertion-modal-title-${norm}`;
  const bodyId = `pre-insertion-modal-body-${norm}`;

  return (
    <AlertDialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <AlertDialogPrimitive.Portal>
        <AlertDialogPrimitive.Backdrop
          className={cn(
            'fixed inset-0 z-50 bg-black/40 data-open:animate-in data-open:fade-in-0',
            'data-closed:animate-out data-closed:fade-out-0',
          )}
        />
        <AlertDialogPrimitive.Popup
          ref={popupRef}
          aria-modal="true"
          aria-labelledby={titleId}
          aria-describedby={bodyId}
          onKeyDown={handlePopupKeyDown}
          className={cn(
            'fixed top-1/2 left-1/2 z-50 grid w-[calc(100vw-2rem)] max-w-xl -translate-x-1/2 -translate-y-1/2 gap-4 rounded-xl border border-border bg-background p-6 text-sm shadow-2xl outline-none',
            // Entrance uses zoom only (no opacity fade): a mid-fade frame blends
            // the primary button against the bg-black/40 backdrop and trips axe
            // color-contrast (4.29 vs the real steady-state 5.17). Zoom keeps the
            // content at full opacity so the a11y scan is deterministic.
            'data-open:animate-in data-open:zoom-in-95',
            'data-closed:animate-out data-closed:zoom-out-95',
          )}
        >
          <AlertDialogPrimitive.Title
            id={titleId}
            className="text-base font-semibold"
          >
            {title}
          </AlertDialogPrimitive.Title>
          <AlertDialogPrimitive.Description
            id={bodyId}
            className="flex flex-col gap-3 leading-relaxed text-muted-foreground"
            render={<div />}
          >
            <p>{wrapNormZitate(body)}</p>
            {additionalExplainer && (
              <p data-testid="familienkasse-ao-zusatz">
                {wrapNormZitate(additionalExplainer)}
              </p>
            )}
          </AlertDialogPrimitive.Description>
          <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
            <AlertDialogPrimitive.Close
              render={
                <Button type="button" variant="outline" onClick={onCancel} />
              }
            >
              {ctaCancel}
            </AlertDialogPrimitive.Close>
            <Button type="button" onClick={onConfirm} autoFocus>
              {ctaContinue}
            </Button>
          </div>
        </AlertDialogPrimitive.Popup>
      </AlertDialogPrimitive.Portal>
    </AlertDialogPrimitive.Root>
  );
}

