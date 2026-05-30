'use client';

import * as React from 'react';
import { AlertDialog as AlertDialogPrimitive } from '@base-ui/react/alert-dialog';
import { useTranslations } from 'next-intl';
import { AlertTriangle, Download, X } from 'lucide-react';

import { useStripBaseUiFocusGuardAriaHidden } from '@/components/ui/use-strip-base-ui-focus-guard-aria-hidden';
import { api } from '@/lib/mock-backend';
import { cn } from '@/lib/utils';
import type { Document, EudiExportPreview } from '@/types';

interface EudiExportDialogProps {
  open: boolean;
  onOpenChange: (next: boolean) => void;
  doc: Document | null;
}

/**
 * `<EudiExportDialog>` (§C3) — CLEARLY-MOCKED EUDI-Wallet-Export-Vorschau.
 * Zeigt den `[MOCK]`-VC-Payload + den 2027-Rollout-Disclaimer. Niemals ein
 * produktiv aussehender Export — `[MOCK]` ist sichtbarer Text (SR-lesbar, §14).
 *
 * a11y (B1): base-ui `<AlertDialog>` mit `aria-modal` + Focus-Trap.
 * Pattern-Konsistenz zu `<PunkteEidReauthModal>`:
 *   - `<AlertDialog>` (nicht `<Dialog>`): die Hintergrund-Containment laeuft
 *     ueber `inert`, nicht `aria-hidden` — daher unberuehrt von
 *     `useStripBaseUiFocusGuardAriaHidden`. Mit `<Dialog>` leckte der
 *     Focus-Trap, weil der Strip-Hook das `aria-hidden`-Containment entfernt.
 *   - `useStripBaseUiFocusGuardAriaHidden(open)` gegen den base-ui-1.4.1
 *     FocusGuard-`aria-hidden`-Bug (WCAG 4.1.2).
 *   - Trigger merken bei Open, Fokus zurueck bei Close (WCAG 2.4.3) — base-ui
 *     stellt den Fokus nicht zuverlaessig wieder her, wenn ueber State-Prop
 *     (nicht `<Trigger>`) eroeffnet.
 *   - `<AlertDialog>` schliesst absichtlich NICHT auf ESC/Backdrop; wir geben
 *     ESC explizit zurueck (Dismiss-Erwartung fuer eine Vorschau, kein
 *     destruktiver Bestaetigungs-Dialog).
 */
export function EudiExportDialog({ open, onOpenChange, doc }: EudiExportDialogProps) {
  const t = useTranslations('dokumente.eudi');
  useStripBaseUiFocusGuardAriaHidden(open);

  const [preview, setPreview] = React.useState<EudiExportPreview | null>(null);
  const [error, setError] = React.useState(false);

  // WCAG 2.4.3 / 2.4.7: Trigger merken bei Open, restore bei Close.
  // base-ui-1.4.1 AlertDialog stellt den Fokus nicht zuverlaessig wieder her,
  // wenn der Trigger ueber State-Prop (nicht <Trigger>) eroeffnet wurde.
  const triggerRef = React.useRef<HTMLElement | null>(null);

  React.useEffect(() => {
    if (open) {
      const active = document.activeElement;
      if (active instanceof HTMLElement) {
        triggerRef.current = active;
      }
      return;
    }
    const trigger = triggerRef.current;
    if (trigger && document.contains(trigger)) {
      requestAnimationFrame(() => {
        if (document.contains(trigger)) {
          trigger.focus();
        }
      });
    }
    triggerRef.current = null;
  }, [open]);

  // WCAG 2.1.2 (No Keyboard Trap leak): base-ui-1.5.0 contains the background
  // via `aria-hidden` on the outside elements it tags `[data-base-ui-inert]`,
  // NOT via real `inert`. `aria-hidden` hides from the a11y tree but does NOT
  // remove elements from the Tab order — so Tab leaked from the popup out to
  // the page skip-link and BODY before the FocusGuard wrapped. We promote
  // base-ui's own marker to a real `inert` attribute (physical focus removal),
  // keyed strictly off `open`, and revert on close. Reusing base-ui's marker
  // set means we inert exactly the elements it already chose to hide.
  React.useEffect(() => {
    if (!open) return;
    if (typeof document === 'undefined') return;

    const inerted = new Set<HTMLElement>();
    function applyInert() {
      document
        .querySelectorAll<HTMLElement>('[data-base-ui-inert]:not([inert])')
        .forEach((el) => {
          el.setAttribute('inert', '');
          inerted.add(el);
        });
    }

    applyInert();
    const observer = new MutationObserver(() => applyInert());
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['data-base-ui-inert'],
    });

    return () => {
      observer.disconnect();
      inerted.forEach((el) => el.removeAttribute('inert'));
    };
  }, [open]);

  React.useEffect(() => {
    if (!open || !doc) {
      setPreview(null);
      setError(false);
      return;
    }
    let cancelled = false;
    setPreview(null);
    setError(false);
    void (async () => {
      try {
        const p = await api.exportiereDokumentEudi(doc.id);
        if (!cancelled) setPreview(p);
      } catch {
        if (!cancelled) setError(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, doc]);

  function handleDownload() {
    if (!preview || !doc) return;
    const blob = new Blob([preview.payload_preview], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `MOCK-eudi-${doc.id}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // base-ui <AlertDialog> dismisst absichtlich nicht auf ESC. Eine
  // Export-Vorschau ist kein destruktiver Bestaetigungs-Dialog, daher
  // geben wir ESC explizit zurueck (WCAG 2.1.2 — kein Keyboard-Trap).
  function handleEscape(event: React.KeyboardEvent<HTMLElement>) {
    if (event.key === 'Escape') {
      event.preventDefault();
      onOpenChange(false);
    }
  }

  return (
    <AlertDialogPrimitive.Root open={open} onOpenChange={(next) => onOpenChange(next)}>
      <AlertDialogPrimitive.Portal>
        <AlertDialogPrimitive.Backdrop
          aria-hidden="true"
          className={cn(
            'fixed inset-0 z-50 bg-black/40 p-4',
            'data-open:animate-in data-open:fade-in-0',
            'data-closed:animate-out data-closed:fade-out-0',
          )}
        />
        <AlertDialogPrimitive.Popup
          aria-modal="true"
          aria-labelledby="eudi-dialog-title"
          onKeyDown={handleEscape}
          className={cn(
            'fixed top-1/2 left-1/2 z-50 flex max-h-[85vh] w-[calc(100vw-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-xl border border-border bg-card shadow-lg outline-none',
            'data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95',
            'data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95',
          )}
        >
          <div className="flex items-start justify-between gap-4 border-b border-border p-5">
            <AlertDialogPrimitive.Title
              id="eudi-dialog-title"
              className="text-base font-semibold text-foreground"
            >
              {t('dialog_title')}
            </AlertDialogPrimitive.Title>
            <AlertDialogPrimitive.Close
              aria-label={t('close')}
              className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand-600)]"
            >
              <X className="size-5" />
            </AlertDialogPrimitive.Close>
          </div>

          <div className="flex flex-col gap-4 overflow-y-auto p-5">
            <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-[var(--amber-50)] p-3 text-xs text-[var(--amber-700)]">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              <p>{t('disclaimer_2027')}</p>
            </div>

            <div>
              <div className="mb-1 flex items-center gap-2 text-xs font-medium text-muted-foreground">
                <span>{t('payload_label')}</span>
                <span className="rounded-full bg-muted px-2 py-0.5 font-mono text-[10px]">
                  {t('mock_badge')}
                </span>
              </div>
              {error ? (
                <p className="text-sm text-destructive">[MOCK] Vorschau nicht verfügbar.</p>
              ) : preview ? (
                <pre
                  tabIndex={0}
                  role="region"
                  aria-label={t('payload_label')}
                  className="max-h-64 overflow-auto rounded-lg border border-border bg-[var(--surface-2)] p-3 font-mono text-[11px] leading-relaxed text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand-600)]"
                >
                  {preview.payload_preview}
                </pre>
              ) : (
                <p className="text-sm text-muted-foreground">…</p>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-2 border-t border-border p-4">
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              disabled={!preview}
              onClick={handleDownload}
            >
              <Download />
              {t('download')}
            </button>
            <AlertDialogPrimitive.Close className="btn btn-primary btn-sm">
              {t('close')}
            </AlertDialogPrimitive.Close>
          </div>
        </AlertDialogPrimitive.Popup>
      </AlertDialogPrimitive.Portal>
    </AlertDialogPrimitive.Root>
  );
}
