'use client';

import { useTranslations } from 'next-intl';
import { Menu as MenuPrimitive } from '@base-ui/react/menu';
import { Download, Eye, MoreHorizontal, Share2 } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useStripBaseUiFocusGuardAriaHidden } from '@/components/ui/use-strip-base-ui-focus-guard-aria-hidden';

interface DokumentRowActionsProps {
  documentName: string;
  onView: () => void;
  onDownload: () => void;
  onShare: () => void;
}

/**
 * Die drei Zeilen-Aktionen einer Dokumentenzeile: Ansehen / Herunterladen /
 * Mehr. Jeder Button trägt ein individuelles `aria-label` inkl. Dokumentname.
 */
export function DokumentRowActions({
  documentName,
  onView,
  onDownload,
  onShare,
}: DokumentRowActionsProps) {
  const t = useTranslations('dokumente.action');

  return (
    <div className="flex items-center justify-end gap-0.5">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label={t('ansehen', { name: documentName })}
        onClick={onView}
      >
        <Eye aria-hidden="true" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label={t('herunterladen', { name: documentName })}
        onClick={onDownload}
      >
        <Download aria-hidden="true" />
      </Button>
      <MoreMenu documentName={documentName} onView={onView} onShare={onShare} />
    </div>
  );
}

function MoreMenu({
  documentName,
  onView,
  onShare,
}: Pick<DokumentRowActionsProps, 'documentName' | 'onView' | 'onShare'>) {
  const t = useTranslations('dokumente.action');
  useStripBaseUiFocusGuardAriaHidden(true);

  const itemClass = cn(
    'flex min-h-[44px] cursor-default items-center gap-2 rounded-md px-3 text-sm text-text-primary outline-none',
    'data-highlighted:bg-surface-muted',
  );

  return (
    <MenuPrimitive.Root>
      <MenuPrimitive.Trigger
        render={
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={t('mehr', { name: documentName })}
          />
        }
      >
        <MoreHorizontal aria-hidden="true" />
      </MenuPrimitive.Trigger>
      <MenuPrimitive.Portal>
        <MenuPrimitive.Positioner sideOffset={6} align="end">
          <MenuPrimitive.Popup
            className={cn(
              'z-50 min-w-44 rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-[var(--shadow-popover)] outline-none',
              'data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0',
            )}
          >
            <MenuPrimitive.Item className={itemClass} onClick={onView}>
              <Eye
                className="size-4 shrink-0 text-text-secondary"
                aria-hidden="true"
              />
              <span>{t('menu_ansehen')}</span>
            </MenuPrimitive.Item>
            <MenuPrimitive.Item className={itemClass} onClick={onShare}>
              <Share2
                className="size-4 shrink-0 text-text-secondary"
                aria-hidden="true"
              />
              <span>{t('menu_teilen')}</span>
            </MenuPrimitive.Item>
          </MenuPrimitive.Popup>
        </MenuPrimitive.Positioner>
      </MenuPrimitive.Portal>
    </MenuPrimitive.Root>
  );
}
