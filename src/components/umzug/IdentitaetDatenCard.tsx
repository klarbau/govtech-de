'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import {
  BadgeCheck,
  CalendarDays,
  Database,
  Files,
  Heart,
  MapPin,
  ShieldCheck,
  User,
} from 'lucide-react';

import { api } from '@/lib/mock-backend';
import { formatDateDe } from '@/lib/utils';
import type { Persona } from '@/types';
import { SectionCard } from '@/components/shared/SectionCard';
import { IdentitaetDatenRow } from './IdentitaetDatenRow';

function formatAnschrift(adresse: Persona['adresse']): string {
  const zusatz = adresse.zusatz ? `, ${adresse.zusatz}` : '';
  return `${adresse.strasse} ${adresse.hausnummer}${zusatz}, ${adresse.plz} ${adresse.ort}`;
}

export function IdentitaetDatenCard() {
  const t = useTranslations('umzug.identitaet.daten');
  const [persona, setPersona] = useState<Persona | null>(null);
  const [walletCount, setWalletCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const p = await api.getProfile();
        if (cancelled) return;
        setPersona(p);
        const documents = await api.getDocuments();
        if (cancelled) return;
        setWalletCount(documents.length);
      } catch {
        if (!cancelled) setPersona(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <SectionCard title={t('title')} icon={<Database />} as="h2" padding="md">
        <div className="flex flex-col gap-3" aria-hidden="true">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-12 w-full animate-pulse rounded-md bg-surface-muted motion-reduce:animate-none"
            />
          ))}
        </div>
      </SectionCard>
    );
  }

  if (!persona) {
    return (
      <SectionCard title={t('title')} icon={<Database />} as="h2" padding="md">
        <p className="py-6 text-sm text-text-secondary">{t('empty')}</p>
      </SectionCard>
    );
  }

  const aufenthaltstitel = persona.aufenthaltstitel
    ? t('aufenthaltstitel.value', {
        norm: persona.aufenthaltstitel.norm,
        datum: formatDateDe(persona.aufenthaltstitel.valid_until),
      })
    : null;

  const familienstand = persona.familienstand
    ? t(`familienstand.value.${persona.familienstand}`)
    : null;

  return (
    <SectionCard title={t('title')} icon={<Database />} as="h2" padding="md">
      <ul className="divide-y divide-border">
        <IdentitaetDatenRow
          icon={<User />}
          iconTone="success"
          label={t('name.label')}
          sub={`${persona.vorname} ${persona.nachname}`}
          status="verifiziert"
          statusLabel={t('status.bestaetigt')}
          expandedBody={t('name.body')}
        />
        <IdentitaetDatenRow
          icon={<CalendarDays />}
          iconTone="success"
          label={t('geburtsdatum.label')}
          sub={formatDateDe(persona.geburtsdatum)}
          status="verifiziert"
          statusLabel={t('status.bestaetigt')}
          expandedBody={t('geburtsdatum.body')}
        />
        <IdentitaetDatenRow
          icon={<MapPin />}
          iconTone="success"
          label={t('anschrift.label')}
          sub={formatAnschrift(persona.adresse)}
          status="verifiziert"
          statusLabel={t('status.bestaetigt')}
          expandedBody={t('anschrift.body')}
        />
        {familienstand ? (
          <IdentitaetDatenRow
            icon={<Heart />}
            iconTone="success"
            label={t('familienstand.label')}
            sub={familienstand}
            status="verifiziert"
            statusLabel={t('status.bestaetigt')}
            expandedBody={t('familienstand.body')}
          />
        ) : null}
        {aufenthaltstitel ? (
          <IdentitaetDatenRow
            icon={<BadgeCheck />}
            iconTone="primary"
            label={t('aufenthaltstitel.label')}
            sub={aufenthaltstitel}
            status="neu"
            statusLabel={t('status.verfuegbar')}
            expandedBody={t('aufenthaltstitel.body')}
          />
        ) : null}
        {walletCount != null ? (
          <IdentitaetDatenRow
            icon={<Files />}
            iconTone="neutral"
            label={t('dokumente.label')}
            sub={t('dokumente.value', { count: walletCount })}
            status="vorlage"
            statusLabel={t('status.optional')}
            expandedBody={t('dokumente.body')}
          />
        ) : null}
      </ul>
      <div className="mt-4 flex items-start gap-2 border-t border-border pt-3 text-xs text-text-secondary">
        <ShieldCheck className="size-4 shrink-0" aria-hidden="true" />
        <p>
          {t('dsgvo.text')}{' '}
          <Link
            href="/datenschutz"
            className="font-medium text-primary underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            {t('dsgvo.link')}
          </Link>
        </p>
      </div>
    </SectionCard>
  );
}
