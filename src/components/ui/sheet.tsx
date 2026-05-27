'use client';

import * as React from 'react';
import { Dialog as DialogPrimitive } from '@base-ui/react/dialog';
import { XIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useStripBaseUiFocusGuardAriaHidden } from './use-strip-base-ui-focus-guard-aria-hidden';

/**
 * Side-anchored Sheet — auf shadcn/ui-Konvention, gebaut auf base-ui-`Dialog`.
 *
 * - Default: rechts angedockt (`side="right"`); 480 px breit auf Desktop.
 * - Mobile: fullscreen (Tailwind `inset-0`).
 * - AR-RTL flippt zur linken Kante via `rtl:`-Variants.
 */

function Sheet({ ...props }: DialogPrimitive.Root.Props) {
  // base-ui's Dialog defaults to `modal: true` already, but we set it explicitly
  // for clarity — combined with `aria-modal` on the popup, this gives axe + SR
  // the strongest signal we have a real modal (closes the focus-trap leak the
  // a11y audit flagged on 2026-05-09).
  return <DialogPrimitive.Root modal {...props} />;
}

function SheetTrigger({ ...props }: DialogPrimitive.Trigger.Props) {
  return <DialogPrimitive.Trigger data-slot="sheet-trigger" {...props} />;
}

function SheetPortal({ ...props }: DialogPrimitive.Portal.Props) {
  return <DialogPrimitive.Portal data-slot="sheet-portal" {...props} />;
}

function SheetClose({ ...props }: DialogPrimitive.Close.Props) {
  return <DialogPrimitive.Close data-slot="sheet-close" {...props} />;
}

function SheetOverlay({
  className,
  ...props
}: DialogPrimitive.Backdrop.Props) {
  return (
    <DialogPrimitive.Backdrop
      data-slot="sheet-overlay"
      className={cn(
        'fixed inset-0 z-50 bg-black/40 data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0',
        className,
      )}
      {...props}
    />
  );
}

interface SheetContentProps extends DialogPrimitive.Popup.Props {
  /**
   * Logical anchor edge.
   * - `inline-end` (default) — trailing edge (right in LTR), the standard detail sheet.
   * - `inline-start` — leading edge (left in LTR), used by the mobile navigation drawer.
   * `right`/`left` kept as physical aliases for backward compatibility.
   */
  side?: 'inline-start' | 'inline-end' | 'right' | 'left';
  showCloseButton?: boolean;
  closeAriaLabel?: string;
  /** Drawer width preset. `nav` is a slimmer column for the mobile sidebar. */
  width?: 'default' | 'nav';
}

function SheetContent({
  className,
  children,
  side = 'inline-end',
  width = 'default',
  showCloseButton = true,
  closeAriaLabel,
  ...props
}: SheetContentProps) {
  useStripBaseUiFocusGuardAriaHidden(true);
  const t = useTranslations('shell.sheet');
  const resolvedCloseAriaLabel = closeAriaLabel ?? t('close');
  const startSide = side === 'inline-start' || side === 'left';
  return (
    <SheetPortal>
      <SheetOverlay />
      <DialogPrimitive.Popup
        data-slot="sheet-content"
        data-side={startSide ? 'inline-start' : 'inline-end'}
        aria-modal="true"
        className={cn(
          // Mobile = fullscreen.
          'fixed inset-0 z-50 flex flex-col bg-surface text-text-primary shadow-[var(--shadow-modal)] outline-none',
          // Desktop ≥ md = side sheet.
          width === 'nav'
            ? 'md:inset-y-0 md:w-72 md:max-w-[100vw]'
            : 'md:inset-y-0 md:w-[480px] md:max-w-[100vw]',
          // Logical positioning. `inline-start` anchors to the leading edge.
          startSide
            ? 'md:left-0 md:right-auto rtl:md:left-auto rtl:md:right-0'
            : 'md:right-0 md:left-auto rtl:md:right-auto rtl:md:left-0',
          // Animation (crossfade-forward; reduced-motion collapses globally).
          startSide
            ? 'data-open:animate-in data-open:fade-in-0 data-open:slide-in-from-left-4 data-closed:animate-out data-closed:fade-out-0 data-closed:slide-out-to-left-4 rtl:data-open:slide-in-from-right-4 rtl:data-closed:slide-out-to-right-4'
            : 'data-open:animate-in data-open:fade-in-0 data-open:slide-in-from-right-4 data-closed:animate-out data-closed:fade-out-0 data-closed:slide-out-to-right-4 rtl:data-open:slide-in-from-left-4 rtl:data-closed:slide-out-to-left-4',
          className,
        )}
        {...props}
      >
        {children}
        {showCloseButton && (
          <DialogPrimitive.Close
            render={
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-3 right-3 rtl:right-auto rtl:left-3"
                aria-label={resolvedCloseAriaLabel}
              />
            }
          >
            <XIcon className="size-4" aria-hidden="true" />
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Popup>
    </SheetPortal>
  );
}

function SheetHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="sheet-header"
      className={cn(
        'flex flex-col gap-1 border-b border-border px-5 py-4',
        className,
      )}
      {...props}
    />
  );
}

function SheetFooter({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="sheet-footer"
      className={cn(
        'flex flex-col gap-2 border-t border-border bg-surface-muted/40 px-5 py-4',
        className,
      )}
      {...props}
    />
  );
}

function SheetTitle({ className, ...props }: DialogPrimitive.Title.Props) {
  return (
    <DialogPrimitive.Title
      data-slot="sheet-title"
      className={cn('text-lg font-semibold text-text-primary', className)}
      {...props}
    />
  );
}

function SheetDescription({
  className,
  ...props
}: DialogPrimitive.Description.Props) {
  return (
    <DialogPrimitive.Description
      data-slot="sheet-description"
      className={cn('text-sm text-text-secondary', className)}
      {...props}
    />
  );
}

function SheetBody({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="sheet-body"
      className={cn('flex flex-1 flex-col gap-4 overflow-y-auto px-5 py-4', className)}
      {...props}
    />
  );
}

export {
  Sheet,
  SheetBody,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetOverlay,
  SheetPortal,
  SheetTitle,
  SheetTrigger,
};
