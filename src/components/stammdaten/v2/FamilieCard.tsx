'use client';

import { Users, Pencil, ChevronRight, PlusCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { format, parseISO } from 'date-fns';
import { de as deLocale } from 'date-fns/locale';

import { Button } from '@/components/ui/button';
import { IconCircle } from '@/components/shared/IconCircle';
import { Avatar } from '@/components/shared/Avatar';

interface FamilieMember {
  vorname: string;
  nachname: string;
  geburtsdatumIso: string;
}

interface FamilieCardProps {
  kinder: FamilieMember[];
  partner?: FamilieMember;
  onEdit?: () => void;
  onAdd?: () => void;
}

/**
 * Prototype-v2 — „Familie & Bezugspersonen" card (Spec § COL 1.3).
 *
 * Renders partner (if present) and each child as a list-row with a green
 * monogram avatar, name, Geburtsdatum on the right, and a chevron disclosure.
 * The trailing "+ Weitere Person hinzufügen" link is a no-op in V2 — the real
 * edit path remains in the Vorgang/Standesamt-Wegweiser.
 */
export function FamilieCard({ kinder, partner, onEdit, onAdd }: FamilieCardProps) {
  const t = useTranslations('stammdaten.v2.familie');
  const tCta = useTranslations('stammdaten.cta');

  return (
    <section
      aria-labelledby="v2-familie-title"
      className="rounded-[var(--radius-card)] border border-border bg-surface p-5 shadow-[var(--shadow-1)]"
      data-testid="v2-familie-card"
    >
      <header className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <IconCircle icon={<Users />} tone="neutral" size="sm" />
          <h2
            id="v2-familie-title"
            className="text-base font-semibold text-text-primary"
          >
            {t('card_title')}
          </h2>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={onEdit}>
          <Pencil aria-hidden="true" />
          {tCta('bearbeiten')}
        </Button>
      </header>

      {partner ? (
        <div className="mb-1">
          <p className="mb-1 text-xs text-text-secondary">
            {t('partner_eyebrow')}
          </p>
          <FamilieRow
            member={partner}
            verwandtschaftLabel={t('partner_label')}
            verwandtschaftCaption={t('row_verwandtschaft')}
            geburtsdatumLabel={t('row_geburtsdatum')}
          />
        </div>
      ) : null}

      {kinder.length > 0 ? (
        <div>
          <p
            className={`mb-1 text-xs text-text-secondary ${partner ? 'mt-2' : ''}`}
          >
            {t('kinder_eyebrow')}
          </p>
          {kinder.map((kind, idx) => (
            <FamilieRow
              key={`${kind.vorname}-${idx}`}
              member={kind}
              verwandtschaftLabel={t('kind')}
              verwandtschaftCaption={t('row_verwandtschaft')}
              geburtsdatumLabel={t('row_geburtsdatum')}
            />
          ))}
        </div>
      ) : null}

      <button
        type="button"
        onClick={onAdd}
        className="mt-2 inline-flex min-h-11 items-center gap-1.5 text-sm font-medium text-primary hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        <PlusCircle aria-hidden="true" className="size-3.5" />
        {t('add_link')}
      </button>
    </section>
  );
}

interface FamilieRowProps {
  member: FamilieMember;
  verwandtschaftLabel: string;
  verwandtschaftCaption: string;
  geburtsdatumLabel: string;
}

function FamilieRow({
  member,
  verwandtschaftLabel,
  verwandtschaftCaption,
  geburtsdatumLabel,
}: FamilieRowProps) {
  const name = `${member.vorname} ${member.nachname}`.trim();
  const geburt = formatDe(member.geburtsdatumIso);
  return (
    <div className="flex items-center gap-3 border-t border-border py-2 first:border-t-0">
      <Avatar name={name} tone="primary" size="md" className="bg-success-soft text-success" />
      <div className="flex-1 min-w-0">
        <p className="truncate text-sm font-semibold text-text-primary">
          {name}
        </p>
        <p className="text-xs text-text-secondary">
          {geburtsdatumLabel} {geburt}
        </p>
      </div>
      <div className="text-right text-xs">
        <p className="text-text-secondary">{verwandtschaftCaption}</p>
        <p className="font-medium text-text-primary">{verwandtschaftLabel}</p>
      </div>
      <ChevronRight aria-hidden="true" className="size-4 text-text-muted" />
    </div>
  );
}

function formatDe(iso: string): string {
  try {
    return format(parseISO(iso), 'dd.MM.yyyy', { locale: deLocale });
  } catch {
    return iso;
  }
}
