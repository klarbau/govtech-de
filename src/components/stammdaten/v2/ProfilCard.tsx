'use client';

import { User, Pencil } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { format, parseISO } from 'date-fns';
import { de as deLocale } from 'date-fns/locale';

import { Button } from '@/components/ui/button';
import { IconCircle } from '@/components/shared/IconCircle';

interface ProfilCardProps {
  vorname: string;
  nachname: string;
  geburtsdatumIso: string;
  staatsangehoerigkeit: string;
  partnerVorhanden: boolean;
}

/**
 * Prototype-v2 — „Persönliches Profil" card (Spec § COL 1.1).
 *
 * Flat (non-collapsible) card with a 130px label / value KV grid. Reads from
 * `Stammdaten.identitaet` + `Persona.familie.partner` (presence-only).
 */
export function ProfilCard({
  vorname,
  nachname,
  geburtsdatumIso,
  staatsangehoerigkeit,
  partnerVorhanden,
}: ProfilCardProps) {
  const t = useTranslations('stammdaten.v2.profil');
  const tCta = useTranslations('stammdaten.cta');

  const geburtsdatum = formatDe(geburtsdatumIso);
  const familienstand = partnerVorhanden
    ? t('familienstand.verheiratet')
    : t('familienstand.ledig');
  const name = `${vorname} ${nachname}`.trim();

  return (
    <section
      aria-labelledby="v2-profil-title"
      className="rounded-[var(--radius-card)] border border-border bg-surface p-5 shadow-[var(--shadow-1)]"
      data-testid="v2-profil-card"
    >
      <header className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <IconCircle icon={<User />} tone="neutral" size="sm" />
          <h2
            id="v2-profil-title"
            className="text-base font-semibold text-text-primary"
          >
            {t('card_title')}
          </h2>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          data-testid="v2-profil-edit"
        >
          <Pencil aria-hidden="true" />
          {tCta('bearbeiten')}
        </Button>
      </header>

      <dl className="flex flex-col">
        <KvRow label={t('kv.name')} value={name} />
        <KvRow label={t('kv.geburtsdatum')} value={geburtsdatum} />
        <KvRow
          label={t('kv.staatsangehoerigkeit')}
          value={staatsangehoerigkeit}
        />
        <KvRow label={t('kv.familienstand')} value={familienstand} />
      </dl>
    </section>
  );
}

function KvRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[130px_1fr] gap-2 py-2">
      <dt className="text-sm text-text-secondary">{label}</dt>
      <dd className="text-sm font-medium text-text-primary">{value}</dd>
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
