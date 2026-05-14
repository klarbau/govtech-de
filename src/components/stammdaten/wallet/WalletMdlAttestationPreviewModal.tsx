'use client';

import * as React from 'react';
import { Dialog as DialogPrimitive } from '@base-ui/react/dialog';
import { useTranslations } from 'next-intl';

import { wrapNormZitate } from '@/components/posteingang/wrapNormZitate';
import { Button } from '@/components/ui/button';
import { useStripBaseUiFocusGuardAriaHidden } from '@/components/ui/use-strip-base-ui-focus-guard-aria-hidden';
import { cn } from '@/lib/utils';

import {
  ISO_18013_5_MDL_TOGGLE_SET,
  type MdlSelectiveDisclosureToggle,
} from '@/types/mobilitaet';

import { VisionBanner2031 } from './VisionBanner2031';

export interface MdlPreviewData {
  given_name: string;
  family_name: string;
  birth_date: string;
  driving_privileges: Array<{
    klasse: string;
    erteilt_am: string;
    gueltig_bis?: string;
    schluesselzahlen: string[];
  }>;
  issuing_authority: string;
  issuing_country: 'DE';
  document_number: string;
  issue_date: string;
  expiry_date: string;
}

interface WalletMdlAttestationPreviewModalProps {
  open: boolean;
  onOpenChange: (next: boolean) => void;
  /**
   * Deterministische Mock-Daten der Persona für die Vorschau. Bei
   * Toggle-Auswahl werden nur die selected fields in die Preview-JSON gerendert.
   */
  previewData: MdlPreviewData | null;
  onClose: () => void;
}

/**
 * `<WalletMdlAttestationPreviewModal>` (Spec § 4.2 / VL-9 / HL-MOB-9).
 *
 * Selective-Disclosure-Toggle-Group **closed-enum** aus
 * `ISO_18013_5_MDL_TOGGLE_SET` (VL-9). Forbidden-Toggles wie „Punktezahl",
 * „MPU-Status", „FAER-Eintragungen" können gar nicht gerendert werden.
 *
 * Preview rendert als JSON-Card die selected fields; default alle off →
 * Hinweis-Text.
 *
 * a11y: base-ui `<Dialog>` mit `aria-modal`, focus-trap;
 * Vision-Banner als `role="note"` im Header;
 * Toggle-Group als `<fieldset>` + `<legend>` + native Switches.
 */
export function WalletMdlAttestationPreviewModal({
  open,
  onOpenChange,
  previewData,
  onClose,
}: WalletMdlAttestationPreviewModalProps) {
  const t = useTranslations('stammdaten.wallet.mdl.modal');
  const tToggle = useTranslations('stammdaten.wallet.mdl.modal.toggle');
  useStripBaseUiFocusGuardAriaHidden(open);

  const [selected, setSelected] = React.useState<
    Record<MdlSelectiveDisclosureToggle, boolean>
  >(() => buildInitialToggles());

  React.useEffect(() => {
    if (open) setSelected(buildInitialToggles());
  }, [open]);

  const toggle = (key: MdlSelectiveDisclosureToggle) =>
    setSelected((prev) => ({ ...prev, [key]: !prev[key] }));

  const titleId = 'wallet-mdl-modal-title';
  const bodyId = 'wallet-mdl-modal-body';

  const selectedJson = previewData
    ? buildSelectedJson(previewData, selected)
    : {};
  const anySelected = Object.values(selected).some(Boolean);

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange} modal>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Backdrop
          className={cn(
            'fixed inset-0 z-50 bg-black/40',
            'data-open:animate-in data-open:fade-in-0',
            'data-closed:animate-out data-closed:fade-out-0',
          )}
        />
        <DialogPrimitive.Popup
          aria-modal="true"
          aria-labelledby={titleId}
          aria-describedby={bodyId}
          className={cn(
            'fixed top-1/2 left-1/2 z-50 grid w-[calc(100vw-2rem)] max-w-2xl -translate-x-1/2 -translate-y-1/2 gap-4 rounded-xl border border-border bg-background p-6 text-sm shadow-2xl outline-none',
            'data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95',
            'data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95',
            'max-h-[90vh] overflow-y-auto',
          )}
        >
          <DialogPrimitive.Title
            id={titleId}
            className="text-base font-semibold"
          >
            {t('title')}
          </DialogPrimitive.Title>

          <VisionBanner2031 />

          <DialogPrimitive.Description
            id={bodyId}
            className="leading-relaxed text-muted-foreground"
            render={<div />}
          >
            <p>{wrapNormZitate(t('disclaimer_header'))}</p>
          </DialogPrimitive.Description>

          <fieldset className="flex flex-col gap-2 rounded-lg border border-border bg-muted/30 p-3">
            <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {t('toggle_group_label')}
            </legend>
            <p className="px-1 pb-1 text-[11px] text-muted-foreground">
              {t('toggle_group_helper')}
            </p>
            <ul className="grid grid-cols-1 gap-1 sm:grid-cols-2">
              {ISO_18013_5_MDL_TOGGLE_SET.map((key) => (
                <li key={key} className="contents">
                  <label
                    htmlFor={`mdl-toggle-${key}`}
                    className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-foreground hover:bg-background"
                  >
                    <input
                      id={`mdl-toggle-${key}`}
                      type="checkbox"
                      className="size-4 cursor-pointer accent-primary"
                      checked={selected[key]}
                      onChange={() => toggle(key)}
                      data-testid={`mdl-toggle-${key}`}
                    />
                    <span>{tToggle(key)}</span>
                  </label>
                </li>
              ))}
            </ul>
          </fieldset>

          <section
            aria-labelledby="mdl-preview-json-title"
            className="flex flex-col gap-2 rounded-lg border border-border bg-background p-3"
          >
            <h4
              id="mdl-preview-json-title"
              className="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
            >
              {t('preview_json_label')}
            </h4>
            {anySelected ? (
              <pre
                className="overflow-x-auto rounded-md bg-muted p-3 font-mono text-[11px] leading-relaxed text-foreground"
                data-testid="mdl-preview-json"
              >
                {JSON.stringify(selectedJson, null, 2)}
              </pre>
            ) : (
              <p className="text-xs text-muted-foreground">
                {t('preview_empty')}
              </p>
            )}
          </section>

          <p className="text-[11px] text-muted-foreground">
            {t('footer_mock_hint')}
          </p>

          <div className="flex justify-end pt-2">
            <DialogPrimitive.Close
              render={
                <Button type="button" variant="outline" onClick={onClose} />
              }
            >
              {t('cta_close')}
            </DialogPrimitive.Close>
          </div>
        </DialogPrimitive.Popup>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

function buildInitialToggles(): Record<MdlSelectiveDisclosureToggle, boolean> {
  const out = {} as Record<MdlSelectiveDisclosureToggle, boolean>;
  for (const key of ISO_18013_5_MDL_TOGGLE_SET) {
    out[key] = false;
  }
  return out;
}

function buildSelectedJson(
  data: MdlPreviewData,
  selected: Record<MdlSelectiveDisclosureToggle, boolean>,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (selected.given_name) out.given_name = data.given_name;
  if (selected.family_name) out.family_name = data.family_name;
  if (selected.birth_date) out.birth_date = data.birth_date;
  if (selected.age_over_18) {
    const birthYear = parseInt(data.birth_date.slice(0, 4), 10);
    const ageNow = new Date().getUTCFullYear() - birthYear;
    out.age_over_18 = ageNow >= 18;
  }
  if (selected.age_in_years) {
    const birthYear = parseInt(data.birth_date.slice(0, 4), 10);
    out.age_in_years = new Date().getUTCFullYear() - birthYear;
  }
  if (selected.driving_privileges) {
    out.driving_privileges = data.driving_privileges;
  }
  if (selected.portrait) out.portrait = '[MOCK base64 image data]';
  if (selected.signature_usual_mark) {
    out.signature_usual_mark = '[MOCK base64 signature]';
  }
  if (selected.issue_date) out.issue_date = data.issue_date;
  if (selected.expiry_date) out.expiry_date = data.expiry_date;
  if (selected.issuing_authority) out.issuing_authority = data.issuing_authority;
  if (selected.issuing_country) out.issuing_country = data.issuing_country;
  if (selected.document_number) out.document_number = data.document_number;
  if (selected.un_distinguishing_sign) out.un_distinguishing_sign = 'D';
  return out;
}
