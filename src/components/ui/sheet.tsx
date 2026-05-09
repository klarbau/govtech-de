'use client';

import * as React from 'react';
import { Dialog as DialogPrimitive } from '@base-ui/react/dialog';
import { XIcon } from 'lucide-react';

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
  side?: 'right' | 'left';
  showCloseButton?: boolean;
  closeAriaLabel?: string;
}

function SheetContent({
  className,
  children,
  side = 'right',
  showCloseButton = true,
  closeAriaLabel = 'Sheet schließen',
  ...props
}: SheetContentProps) {
  useStripBaseUiFocusGuardAriaHidden(true);
  return (
    <SheetPortal>
      <SheetOverlay />
      <DialogPrimitive.Popup
        data-slot="sheet-content"
        data-side={side}
        aria-modal="true"
        className={cn(
          // Mobile = fullscreen.
          'fixed inset-0 z-50 flex flex-col bg-background text-foreground shadow-2xl outline-none',
          // Desktop ≥ md = 480 px Side-Sheet.
          'md:inset-y-0 md:w-[480px] md:max-w-[100vw]',
          // Positioning per side. RTL flips automatically on `rtl:` variant.
          side === 'right' &&
            'md:right-0 md:left-auto rtl:md:right-auto rtl:md:left-0',
          side === 'left' &&
            'md:left-0 md:right-auto rtl:md:left-auto rtl:md:right-0',
          // Animation
          'data-open:animate-in data-open:fade-in-0 data-open:slide-in-from-right-4',
          'data-closed:animate-out data-closed:fade-out-0 data-closed:slide-out-to-right-4',
          'rtl:data-open:slide-in-from-left-4 rtl:data-closed:slide-out-to-left-4',
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
                size="icon-sm"
                className="absolute top-3 right-3 rtl:right-auto rtl:left-3"
                aria-label={closeAriaLabel}
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
        'flex flex-col gap-2 border-t border-border bg-muted/30 px-5 py-4',
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
      className={cn('text-base font-semibold tracking-tight', className)}
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
      className={cn('text-xs text-muted-foreground', className)}
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
