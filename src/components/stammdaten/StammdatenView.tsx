'use client';

import * as React from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { parseISO } from 'date-fns';
import { FilePlus, Link2, MapPin, Pencil } from 'lucide-react';

import { api } from '@/lib/mock-backend';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/shared/Skeleton';
import { ProfilCard } from '@/components/stammdaten/v2/ProfilCard';
import { KontaktCard } from '@/components/stammdaten/v2/KontaktCard';
import { AnschriftCard } from '@/components/stammdaten/v2/AnschriftCard';
import { DokumenteCard } from '@/components/stammdaten/v2/DokumenteCard';
import { FamilieCard } from '@/components/stammdaten/v2/FamilieCard';
import { VersicherungVorsorgeCard } from '@/components/stammdaten/v2/VersicherungVorsorgeCard';
import { VerbundeneNachweiseCard } from '@/components/stammdaten/v2/VerbundeneNachweiseCard';
import { WeitereVerifizierungenCard } from '@/components/stammdaten/v2/WeitereVerifizierungenCard';
import { AenderungsprotokollCard } from '@/components/stammdaten/v2/AenderungsprotokollCard';
import { ProfilCompletenessRing } from '@/components/stammdaten/v2/ProfilCompletenessRing';
import { VerifyChipRow } from '@/components/stammdaten/v2/VerifyChipRow';
import { DatenhoheitFooter } from '@/components/stammdaten/v2/DatenhoheitFooter';
import type {
  Behoerde,
  Persona,
  Stammdaten,
  UebermittlungsLogEntry,
  WalletAttestation,
} from '@/types';

interface StammdatenViewProps {
  nowIso: string;
}

interface Loaded {
  persona: Persona;
  stammdaten: Stammdaten;
  log: UebermittlungsLogEntry[];
  wallet: WalletAttestation[];
  behoerdenById: Record<string, Behoerde>;
}

type EditFlow = { title: string; body: string };

/** Stable [MOCK] date for the „Weitere Verifizierungen" verified-on line. */
const VERIFIZIERT_AM_MOCK_ISO = '2026-06-14';

/**
 * Shared Behörden-Hinweis: in this 2027-vision prototype, Stammdaten are a
 * read-only single source of truth. Changes don't happen here — they flow
 * through the responsible Behörde and sync back automatically.
 */
const BEHOERDEN_HINWEIS =
  'In dieser Demo sind Stammdaten ein read-only Single-Source-of-Truth: Änderungen nehmen Sie nicht hier vor, sondern bei der zuständigen Behörde – die aktualisierten Daten fließen anschließend automatisch in Ihr Profil zurück.';

/**
 * `<StammdatenView>` — „Green Bento" redesign (Spec `stammdaten-green-bento.md`).
 *
 * Wires the previously-orphaned `v2/*` cards into the live view: a
 * completeness-ring header + 4 action buttons + 4-chip status row, then a
 * 6-column bento card grid with a full-height „Änderungsprotokoll" right rail,
 * on a full-bleed wide canvas (`.sd-wide`). Data comes from the same
 * `api.*` reads the legacy view used.
 */
export function StammdatenView({ nowIso }: StammdatenViewProps) {
  const [data, setData] = React.useState<Loaded | null>(null);
  const [editFlow, setEditFlow] = React.useState<EditFlow | null>(null);

  const t = useTranslations('stammdaten');
  const tHead = useTranslations('stammdaten.header');
  const tCta = useTranslations('stammdaten.cta');

  React.useEffect(() => {
    let cancelled = false;
    /* Mock-backend injects a 5% error per call; with 4 parallel calls a fresh
     * mount fails ~19% of the time. Retry the whole bundle up to 3× with a
     * short backoff so the demo doesn't get stuck on the loading state. */
    (async () => {
      for (let attempt = 0; attempt < 3 && !cancelled; attempt++) {
        try {
          const persona = await api.getProfile();
          const [stammdaten, log, wallet, behoerden] = await Promise.all([
            api.getStammdaten(persona.id),
            api.getUebermittlungsLog(persona.id, { limit: 5 }),
            api.getWalletAttestations(persona.id),
            api.getBehoerden(),
          ]);
          if (cancelled) return;
          const map: Record<string, Behoerde> = {};
          for (const b of behoerden) map[b.id] = b;
          setData({ persona, stammdaten, log, wallet, behoerdenById: map });
          return;
        } catch {
          await new Promise((r) => setTimeout(r, 200));
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!data) {
    return <StammdatenSkeleton />;
  }

  const { persona, stammdaten, log, wallet } = data;

  const fullName = `${stammdaten.identitaet.vornamen} ${stammdaten.identitaet.familienname}`;
  const geburt = stammdaten.identitaet.geburtsdatum;
  const staatsangehoerigkeit = stammdaten.identitaet.staatsangehoerigkeit;
  const partner = stammdaten.familie.partner;
  const email =
    persona.kontakt?.bundid_email.value ?? stammdaten.kontakt.email;
  const emailVerifiziert = Boolean(persona.kontakt?.bundid_email.verified);
  const mobil =
    persona.kontakt?.bundid_mobil?.value ?? stammdaten.kontakt.mobil;
  const mobilVerifiziert = Boolean(persona.kontakt?.bundid_mobil?.verified);
  const anschrift = stammdaten.anschrift_aktuell;
  const reisepass = stammdaten.dokumente_refs.reisepass;
  const personalausweis = stammdaten.dokumente_refs.personalausweis;
  const aufenthalt = persona.aufenthaltstitel;
  const kk = persona.krankenversicherung;
  const kvnr =
    persona.kvnr_v1_1?.unveraenderbar ??
    persona.krankenversicherung?.versichertennummer;
  const kinder = stammdaten.familie.kinder;

  const nowMs = parseISO(nowIso).getTime();
  const aufenthaltGueltig = Boolean(
    aufenthalt && parseISO(aufenthalt.valid_until).getTime() > nowMs,
  );
  const walletVerbunden = wallet.length > 0;
  const kontaktVerifiziert = emailVerifiziert || mobilVerifiziert;
  const anschriftBestaetigtIso = log.find((e) => e.sektion === 'anschrift')
    ?.timestamp;

  // ── Completeness percentage (deterministic; Spec § 7) ──────────────────────
  const checklist = [
    Boolean(fullName.trim()),
    Boolean(geburt),
    Boolean(staatsangehoerigkeit),
    Boolean(email),
    emailVerifiziert,
    Boolean(mobil),
    mobilVerifiziert,
    Boolean(anschrift?.strasse),
    Boolean(personalausweis),
    Boolean(reisepass),
    Boolean(aufenthalt),
    Boolean(kk),
    Boolean(persona.steuer_id),
  ];
  const percent = Math.round(
    (checklist.filter(Boolean).length / checklist.length) * 100,
  );
  const letzteAktualisierungIso = log[0]?.timestamp;

  const openProfilEdit = () =>
    setEditFlow({
      title: t('dialog.profil.title'),
      body: `${t('dialog.profil.body')} ${BEHOERDEN_HINWEIS}`,
    });
  const openAnschriftEdit = () =>
    setEditFlow({
      title: t('dialog.anschrift.title'),
      body: `${t('dialog.anschrift.body')} ${BEHOERDEN_HINWEIS}`,
    });

  return (
    <>
      <header className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex items-start gap-5">
          <ProfilCompletenessRing
            percent={percent}
            letzteAktualisierungIso={letzteAktualisierungIso}
          />
          <div className="pt-1">
            <h1 className="text-[30px] font-bold tracking-tight text-text-primary">
              {t('page.title')}
            </h1>
            <p className="mt-1 max-w-xl text-sm text-text-secondary">
              {tHead('subtitle')}
            </p>
          </div>
        </div>

        <div
          className="flex flex-wrap items-center gap-2"
          data-testid="sd-header-actions"
        >
          <Button type="button" variant="default" onClick={openProfilEdit}>
            <Pencil aria-hidden="true" />
            {tCta('bearbeiten')}
          </Button>
          <Button variant="outline" render={<Link href="/dokumente" />}>
            <FilePlus aria-hidden="true" />
            {tHead('actions.dokument_hinzufuegen')}
          </Button>
          <Button type="button" variant="outline" onClick={openAnschriftEdit}>
            <MapPin aria-hidden="true" />
            {tHead('actions.adresse_aendern')}
          </Button>
          <Button variant="outline" render={<Link href="/datenschutz" />}>
            <Link2 aria-hidden="true" />
            {tHead('actions.verknuepfung_verwalten')}
          </Button>
        </div>
      </header>

      <VerifyChipRow
        adresseBestaetigt
        walletVerbunden={walletVerbunden}
        aufenthaltGueltig={aufenthaltGueltig}
        kontaktVerifiziert={kontaktVerifiziert}
      />

      <div className="sd-bento mt-1">
        <div className="sd-bento-left">
          <div className="sd-span-2">
            <ProfilCard
              vorname={stammdaten.identitaet.vornamen}
              nachname={stammdaten.identitaet.familienname}
              geburtsdatumIso={geburt}
              staatsangehoerigkeit={capitalize(staatsangehoerigkeit)}
              partnerVorhanden={Boolean(partner)}
            />
          </div>
          <div className="sd-span-2">
            <KontaktCard
              email={email}
              emailVerifiziert={emailVerifiziert}
              mobil={mobil}
              mobilVerifiziert={mobilVerifiziert}
            />
          </div>
          <div className="sd-span-2">
            <AnschriftCard
              adresse={anschrift}
              zuletztBestaetigtIso={anschriftBestaetigtIso}
            />
          </div>

          <div className="sd-span-3">
            <DokumenteCard
              reisepass={
                reisepass
                  ? { nummer: reisepass.nummer, gueltigBisIso: reisepass.gueltig_bis }
                  : undefined
              }
              personalausweis={
                personalausweis
                  ? {
                      nummer: personalausweis.nummer,
                      gueltigBisIso: personalausweis.gueltig_bis,
                    }
                  : undefined
              }
              aufenthaltstitel={
                aufenthalt
                  ? { norm: aufenthalt.norm, gueltigBisIso: aufenthalt.valid_until }
                  : undefined
              }
            />
          </div>
          <div className="sd-span-3">
            <FamilieCard
              partner={
                partner
                  ? {
                      vorname: partner.vorname,
                      nachname: partner.nachname,
                      geburtsdatumIso: partner.geburtsdatum,
                    }
                  : undefined
              }
              kinder={kinder.map((kind) => ({
                vorname: kind.vorname,
                nachname: kind.nachname,
                geburtsdatumIso: kind.geburtsdatum,
              }))}
            />
          </div>

          <div className="sd-span-2">
            <VersicherungVorsorgeCard
              krankenkasse={
                kk ? { traegerName: kk.traeger, kvnr } : undefined
              }
              altersvorsorgeTraeger={
                persona.rentenversicherungsnummer
                  ? t('altersvorsorge.gesetzliche_rente')
                  : undefined
              }
            />
          </div>
          <div className="sd-span-2">
            <VerbundeneNachweiseCard />
          </div>
          <div className="sd-span-2">
            <WeitereVerifizierungenCard
              steuerId={persona.steuer_id}
              sozialversicherungsnummer={persona.rentenversicherungsnummer}
              verifiziertAmIso={VERIFIZIERT_AM_MOCK_ISO}
            />
          </div>
        </div>

        <AenderungsprotokollCard
          entries={log}
          behoerdenById={data.behoerdenById}
        />
      </div>

      <DatenhoheitFooter />

      <Dialog
        open={editFlow !== null}
        onOpenChange={(open) => {
          if (!open) setEditFlow(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editFlow?.title ?? ''}</DialogTitle>
            <DialogDescription>{editFlow?.body ?? ''}</DialogDescription>
          </DialogHeader>
          <p className="text-xs text-muted-foreground">
            {t('dialog.mock_hint')}
          </p>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setEditFlow(null)}>
              {t('dialog.close')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function StammdatenSkeleton() {
  const tCommon = useTranslations('common');
  return (
    <div role="status" aria-busy="true">
      <span className="sr-only">{tCommon('loading')}</span>
      <div className="flex items-start gap-5">
        <Skeleton className="size-24 rounded-full" />
        <div className="pt-2">
          <Skeleton shape="text" className="h-8 w-64" />
          <Skeleton shape="text" className="mt-2 w-80" />
        </div>
      </div>
      <div className="mt-6 grid grid-cols-1 gap-[18px] lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="grid grid-cols-1 gap-[18px] sm:grid-cols-2">
          <Skeleton className="h-44 rounded-2xl" />
          <Skeleton className="h-44 rounded-2xl" />
          <Skeleton className="h-44 rounded-2xl" />
          <Skeleton className="h-44 rounded-2xl" />
        </div>
        <Skeleton className="h-96 rounded-2xl" />
      </div>
    </div>
  );
}

// ── helpers ─────────────────────────────────────────────────────────────────

function capitalize(s: string): string {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}
