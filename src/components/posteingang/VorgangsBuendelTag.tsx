'use client';

import { useTranslations } from 'next-intl';
import { FolderOpen, FolderPlus } from 'lucide-react';
import Link from 'next/link';

import { cn } from '@/lib/utils';

interface ExistingVorgangProps {
  vorgangId: string;
  vorgangTitle: string;
  className?: string;
}

interface InitialVorgangProps {
  brieftypLabel: string;
  jahr: number;
  onCreate: () => void;
  className?: string;
}

/**
 * Tag „Gehört zu Vorgang ‚{title}'" — verlinkt auf den Vorgang.
 */
export function VorgangsBuendelTagExisting({
  vorgangId,
  vorgangTitle,
  className,
}: ExistingVorgangProps) {
  const t = useTranslations('posteingang.card');

  return (
    <Link
      href={`/vorgaenge/${vorgangId}`}
      className={cn(
        'inline-flex min-h-6 items-center gap-1 rounded-md border border-border bg-background px-1.5 py-1 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:bg-muted focus-visible:text-foreground',
        className,
      )}
    >
      <FolderOpen className="size-3" aria-hidden="true" />
      <span>{t('vorgang_tag_template', { title: vorgangTitle })}</span>
    </Link>
  );
}

/**
 * CTA-Tag „Neuer Vorgang? {Brieftyp} {Jahr} anlegen?" — öffnet das
 * `<NeuerVorgangAusBriefModal>`. Wird auf Initial-Briefen ohne
 * `vorgang_id` gerendert, wenn der Archetyp einen Vorgangs-Typ vorschlägt.
 */
export function VorgangsBuendelTagInitial({
  brieftypLabel,
  jahr,
  onCreate,
  className,
}: InitialVorgangProps) {
  const t = useTranslations('posteingang.card');

  return (
    <button
      type="button"
      onClick={onCreate}
      className={cn(
        'inline-flex min-h-6 items-center gap-1 rounded-md border border-dashed border-border bg-background px-1.5 py-1 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:bg-muted focus-visible:text-foreground',
        className,
      )}
    >
      <FolderPlus className="size-3" aria-hidden="true" />
      <span>
        {t('vorgang_anlegen_template', { brieftyp: brieftypLabel, jahr })}
      </span>
    </button>
  );
}
