'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, ShieldCheck, Wallet } from 'lucide-react';

import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { IdentitaetDatenCard } from '@/components/umzug/IdentitaetDatenCard';
import { IdentitaetFreigabenCard } from '@/components/umzug/IdentitaetFreigabenCard';
import { IdentitaetSourceCard } from '@/components/umzug/IdentitaetSourceCard';
import { IdentitaetSpekulativeNote } from '@/components/umzug/IdentitaetSpekulativeNote';

export default function UmzugIdentitaetPage() {
  const router = useRouter();

  return (
    <div className="flex flex-col gap-6 pb-24 md:pb-6">
      <div className="flex flex-col gap-3">
        <Link
          href="/dashboard"
          className="inline-flex w-fit items-center gap-1 text-sm text-text-secondary hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          <span>Zurück zur Übersicht</span>
        </Link>
        <PageHeader
          title="Identität bestätigen"
          subtitle="Bitte prüfen Sie, welche Daten verwendet werden, bevor der Umzug-Autopilot gestartet wird."
          contextChip={{ label: 'Prototyp · Mock-Daten' }}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <IdentitaetSourceCard
          icon={<ShieldCheck aria-hidden="true" />}
          title="DeutschlandID"
          subtitle="Staatliches Online-Identitätskonto"
          connectionLabel="Verbunden"
          status="verifiziert"
          statusLabel="Verifiziert"
        />
        <IdentitaetSourceCard
          icon={<Wallet aria-hidden="true" />}
          title="EUDI Wallet"
          subtitle="Europäische digitale Brieftasche"
          connectionLabel="Bereit"
          status="bestaetigt"
          statusLabel="Bereit"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <IdentitaetDatenCard />
        <IdentitaetFreigabenCard />
      </div>

      <IdentitaetSpekulativeNote />

      <div className="sticky bottom-0 -mx-4 mt-2 flex items-center justify-between gap-3 border-t border-border bg-surface-page px-4 py-3 md:static md:mx-0 md:border-0 md:bg-transparent md:p-0">
        <Button
          variant="outline"
          onClick={() => router.push('/dashboard')}
        >
          Abbrechen
        </Button>
        <Button
          variant="default"
          size="lg"
          onClick={() => router.push('/vorgaenge/umzug/preview')}
        >
          <span>Mit eID bestätigen und Autopilot vorbereiten</span>
          <ArrowRight aria-hidden="true" />
        </Button>
      </div>
    </div>
  );
}
