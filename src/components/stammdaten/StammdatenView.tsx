'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { parseISO } from 'date-fns';

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
import { EudiReferencePidCard } from '@/components/stammdaten/wallet/EudiReferencePidCard';
import { ProfilCard } from '@/components/stammdaten/v2/ProfilCard';
import { KontaktCard } from '@/components/stammdaten/v2/KontaktCard';
import { FamilieCard } from '@/components/stammdaten/v2/FamilieCard';
import { AnschriftCard } from '@/components/stammdaten/v2/AnschriftCard';
import { DokumenteCard } from '@/components/stammdaten/v2/DokumenteCard';
import { VersicherungVorsorgeCard } from '@/components/stammdaten/v2/VersicherungVorsorgeCard';
import { AenderungsprotokollCard } from '@/components/stammdaten/v2/AenderungsprotokollCard';
import { DatenhoheitFooter } from '@/components/stammdaten/v2/DatenhoheitFooter';
import { IdentitaetsHero } from '@/components/stammdaten/v3/IdentitaetsHero';
import { OnceOnlyRegisterPanel } from '@/components/stammdaten/v3/OnceOnlyRegisterPanel';
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
  behoerden: Behoerde[];
  behoerdenById: Record<string, Behoerde>;
}

type DialogFlow = { title: string; body: string };

/**
 * Shared Behörden-Hinweis: in this 2027-vision prototype, Stammdaten are a
 * read-only single source of truth. Changes don't happen here — they flow
 * through the responsible Behörde and sync back automatically.
 */
const BEHOERDEN_HINWEIS =
  'In dieser Demo sind Stammdaten ein read-only Single-Source-of-Truth: Änderungen nehmen Sie nicht hier vor, sondern bei der zuständigen Behörde – die aktualisierten Daten fließen anschließend automatisch in Ihr Profil zurück.';

/**
 * `<StammdatenView>` — V3 „Verifizierter Identitätsraum + Once-Only-Maschine".
 *
 * Page head (single `<h1>`) → `<IdentitaetsHero>` (credential anchor) →
 * `<OnceOnlyRegisterPanel>` (register-sovereignty band) → token-styled 3-column
 * grid of the v2 cards → `<DatenhoheitFooter>`. All edit/add controls open the
 * existing honest Behörden-Hinweis dialogs — never fake editing.
 */
export function StammdatenView(_props: StammdatenViewProps) {
  const t = useTranslations('stammdaten');
  const [data, setData] = React.useState<Loaded | null>(null);
  const [addFlow, setAddFlow] = React.useState<DialogFlow | null>(null);
  const [editFlow, setEditFlow] = React.useState<DialogFlow | null>(null);
  const [protokollOpen, setProtokollOpen] = React.useState(false);
  const [fullLog, setFullLog] = React.useState<UebermittlungsLogEntry[] | null>(
    null,
  );

  const personaId = data?.persona.id ?? null;

  const openProtokoll = React.useCallback(() => {
    setProtokollOpen(true);
    if (fullLog !== null || !personaId) return;
    void (async () => {
      try {
        const log = await api.getUebermittlungsLog(personaId, { limit: 50 });
        setFullLog(log);
      } catch {
        setFullLog([]);
      }
    })();
  }, [fullLog, personaId]);

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
            api.getUebermittlungsLog(persona.id, { limit: 8 }),
            api.getWalletAttestations(persona.id),
            api.getBehoerden(),
          ]);
          if (cancelled) return;
          const map: Record<string, Behoerde> = {};
          for (const b of behoerden) map[b.id] = b;
          setData({
            persona,
            stammdaten,
            log,
            wallet,
            behoerden,
            behoerdenById: map,
          });
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

  const { persona, stammdaten, log, wallet, behoerden, behoerdenById } = data;
  const identitaet = stammdaten.identitaet;
  const fullName = `${identitaet.vornamen} ${identitaet.familienname}`.trim();

  const email =
    persona.kontakt?.bundid_email.value ?? stammdaten.kontakt.email ?? undefined;
  const emailVerifiziert = Boolean(persona.kontakt?.bundid_email.verified);
  const mobil =
    persona.kontakt?.bundid_mobil?.value ?? stammdaten.kontakt.mobil ?? undefined;
  const mobilVerifiziert = Boolean(persona.kontakt?.bundid_mobil?.verified);

  const anschrift = stammdaten.anschrift_aktuell;
  const reisepass = stammdaten.dokumente_refs.reisepass;
  const personalausweis = stammdaten.dokumente_refs.personalausweis;
  const eatCan = stammdaten.dokumente_refs.eat_can;
  const aufenthalt = persona.aufenthaltstitel;
  const kk = persona.krankenversicherung;
  const kvnr =
    persona.kvnr_v1_1?.unveraenderbar ??
    persona.krankenversicherung?.versichertennummer;
  const kinder = stammdaten.familie.kinder;
  const partner = stammdaten.familie.partner;

  const aufenthaltGueltig = Boolean(
    aufenthalt && parseISO(aufenthalt.valid_until).getTime() > Date.now(),
  );
  const walletVerbunden = wallet.length > 0;

  const anschriftLogEntry = log.find((e) => e.sektion === 'anschrift');
  const anschriftBestaetigtIso = anschriftLogEntry?.timestamp;
  const fuehrendeQuelle =
    (anschriftLogEntry?.absender_behoerde_id
      ? behoerdenById[anschriftLogEntry.absender_behoerde_id]?.name_de
      : undefined) ?? t('hero_v3.quelle_fallback');

  const fallbackChipLabel = !aufenthaltGueltig
    ? t('hero_v3.fallback_chip_ausweis')
    : undefined;

  return (
    <>
      <header className="mb-5">
        <h1 className="text-2xl font-semibold tracking-tight text-text-primary sm:text-3xl">
          {t('page.title')}
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-text-secondary">
          {t('page.subtitle')}
        </p>
      </header>

      <IdentitaetsHero
        fullName={fullName}
        geburtsdatumIso={identitaet.geburtsdatum}
        staatsangehoerigkeit={identitaet.staatsangehoerigkeit}
        fuehrendeQuelle={fuehrendeQuelle}
        verify={{
          adresseBestaetigt: true,
          walletVerbunden,
          aufenthaltGueltig,
        }}
        fallbackChipLabel={fallbackChipLabel}
      />

      <OnceOnlyRegisterPanel
        behoerden={behoerden}
        behoerdenById={behoerdenById}
        log={log}
        onOpenFullLog={openProtokoll}
      />

      <section aria-labelledby="sd-sections-title" className="mt-5">
        <h2 id="sd-sections-title" className="sr-only">
          {t('sections.region_title')}
        </h2>
        <div className="grid grid-cols-1 items-start gap-[18px] lg:grid-cols-3">
          <div className="flex flex-col gap-[18px]">
            <ProfilCard
              vorname={identitaet.vornamen}
              nachname={identitaet.familienname}
              geburtsdatumIso={identitaet.geburtsdatum}
              staatsangehoerigkeit={capitalize(identitaet.staatsangehoerigkeit)}
              partnerVorhanden={Boolean(partner)}
              onEdit={() =>
                setEditFlow({
                  title: 'Persönliches Profil ändern',
                  body: `Name, Geburtsdatum, Staatsangehörigkeit und Familienstand werden von der zuständigen Behörde (Standesamt bzw. Bürgeramt) geführt. ${BEHOERDEN_HINWEIS}`,
                })
              }
            />
            <KontaktCard
              email={email}
              emailVerifiziert={emailVerifiziert}
              mobil={mobil}
              mobilVerifiziert={mobilVerifiziert}
              onEdit={() =>
                setEditFlow({
                  title: 'Kontaktdaten ändern',
                  body: `E-Mail und Telefonnummer werden zentral über Ihr DeutschlandID-Konto verwaltet und nach jeder Änderung neu verifiziert. ${BEHOERDEN_HINWEIS}`,
                })
              }
            />
            <FamilieCard
              kinder={kinder.map((kind) => ({
                vorname: kind.vorname,
                nachname: kind.nachname,
                geburtsdatumIso: kind.geburtsdatum,
              }))}
              partner={
                partner
                  ? {
                      vorname: partner.vorname,
                      nachname: partner.nachname,
                      geburtsdatumIso: partner.geburtsdatum,
                    }
                  : undefined
              }
              onEdit={() =>
                setEditFlow({
                  title: 'Familie & Bezugspersonen ändern',
                  body: `Familienstand und Bezugspersonen ergeben sich aus den beim Standesamt geführten Personenstandsdaten. ${BEHOERDEN_HINWEIS}`,
                })
              }
              onAdd={() =>
                setAddFlow({
                  title: 'Weitere Person hinzufügen',
                  body: 'Das Hinterlegen weiterer Bezugspersonen (Kinder, betreute Personen) ist eine 2027-Vision dieser Demo. In der echten App würde hier ein geführter Dialog mit DeutschlandID-Verknüpfung und Nachweis-Upload starten.',
                })
              }
            />
          </div>

          <div className="flex flex-col gap-[18px]">
            <AnschriftCard
              adresse={anschrift}
              zuletztBestaetigtIso={anschriftBestaetigtIso}
              onEdit={() =>
                setEditFlow({
                  title: 'Anschrift ändern',
                  body: `Ihre Meldeanschrift wird vom Bürgeramt im Melderegister geführt. Eine Adressänderung erfolgt über die Ummeldung – in dieser Demo als Umzug-Autopilot abgebildet. ${BEHOERDEN_HINWEIS}`,
                })
              }
            />
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
              eatCan={eatCan}
              onEdit={() =>
                setEditFlow({
                  title: 'Identitätsdokumente verwalten',
                  body: `Reisepass, Personalausweis und Aufenthaltstitel werden von der ausstellenden Behörde geführt. Neuausstellung oder Verlängerung erfolgt dort. ${BEHOERDEN_HINWEIS}`,
                })
              }
            />
            <EudiReferencePidCard personaId={persona.id} />
            <VersicherungVorsorgeCard
              krankenkasse={
                kk
                  ? { traegerName: kk.traeger, kvnr: kvnr ?? undefined }
                  : undefined
              }
              altersvorsorgeTraeger={
                persona.rentenversicherungsnummer
                  ? 'Gesetzliche Rentenversicherung'
                  : undefined
              }
              onEdit={() =>
                setEditFlow({
                  title: 'Versicherung & Vorsorge ändern',
                  body: `Krankenkasse und Rentenversicherung werden von den jeweiligen Trägern geführt. Ein Kassenwechsel oder eine Statusänderung wird dort beantragt. ${BEHOERDEN_HINWEIS}`,
                })
              }
            />
          </div>

          <div className="flex flex-col gap-[18px]">
            <AenderungsprotokollCard
              entries={log}
              behoerdenById={behoerdenById}
              limit={6}
              onShowAll={openProtokoll}
            />
          </div>
        </div>
      </section>

      <DatenhoheitFooter />

      <Dialog
        open={addFlow !== null}
        onOpenChange={(open) => {
          if (!open) setAddFlow(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{addFlow?.title ?? ''}</DialogTitle>
            <DialogDescription>{addFlow?.body ?? ''}</DialogDescription>
          </DialogHeader>
          <p className="text-xs text-muted-foreground">
            [MOCK] — Demo-Funktion, demnächst verfügbar.
          </p>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setAddFlow(null)}>
              Schließen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
            [MOCK] — Geführte Behörden-Änderung in Vorbereitung.
          </p>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setEditFlow(null)}>
              Schließen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={protokollOpen} onOpenChange={setProtokollOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Vollständiges Änderungsprotokoll</DialogTitle>
            <DialogDescription>
              Alle Änderungen und Übermittlungen Ihrer Stammdaten.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-y-auto" tabIndex={0}>
            {fullLog === null ? (
              <p className="py-3.5 text-sm text-text-secondary">Wird geladen …</p>
            ) : fullLog.length === 0 ? (
              <p className="py-3.5 text-sm text-text-secondary">
                Keine Änderungen vorhanden.
              </p>
            ) : (
              fullLog.map((entry, idx) => (
                <div
                  key={entry.id}
                  className={`flex items-start justify-between gap-3 py-2.5 ${idx > 0 ? 'border-t border-border' : ''}`}
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-text-primary">
                      {timelineTitle(entry)}
                    </p>
                    <p className="text-xs text-text-secondary">
                      {behoerdenName(entry, behoerdenById)}
                      {entry.note ? ` · ${entry.note}` : ''}
                    </p>
                  </div>
                  <p className="shrink-0 whitespace-nowrap text-xs text-text-secondary tabular-nums">
                    {formatDDMMYYYY(parseISO(entry.timestamp))}
                  </p>
                </div>
              ))
            )}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setProtokollOpen(false)}
            >
              Schließen
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
      <div className="mb-5">
        <Skeleton shape="text" className="h-8 w-64" />
        <Skeleton shape="text" className="mt-2 w-80" />
      </div>
      <Skeleton className="h-44 rounded-2xl" />
      <Skeleton className="mt-5 h-40 rounded-2xl" />
      <div className="mt-5 grid grid-cols-1 gap-[18px] lg:grid-cols-3">
        <div className="flex flex-col gap-[18px]">
          <Skeleton className="h-40 rounded-2xl" />
          <Skeleton className="h-32 rounded-2xl" />
          <Skeleton className="h-36 rounded-2xl" />
        </div>
        <div className="flex flex-col gap-[18px]">
          <Skeleton className="h-36 rounded-2xl" />
          <Skeleton className="h-40 rounded-2xl" />
          <Skeleton className="h-36 rounded-2xl" />
        </div>
        <div className="flex flex-col gap-[18px]">
          <Skeleton className="h-72 rounded-2xl" />
        </div>
      </div>
    </div>
  );
}

// ── helpers ─────────────────────────────────────────────────────────────────

function capitalize(s: string): string {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function formatDDMMYYYY(d: Date): string {
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${dd}.${mm}.${d.getFullYear()}`;
}

function timelineTitle(entry: UebermittlungsLogEntry): string {
  if (entry.zweck_i18n_key.includes('adresse')) return 'Adresse bestätigt';
  if (
    entry.zweck_i18n_key.includes('kontakt') ||
    entry.zweck_i18n_key.includes('email')
  )
    return 'E-Mail-Adresse geändert';
  if (
    entry.zweck_i18n_key.includes('mobil') ||
    entry.zweck_i18n_key.includes('telefon')
  )
    return 'Telefonnummer bestätigt';
  if (
    entry.zweck_i18n_key.includes('rundfunk') ||
    entry.zweck_i18n_key.includes('beitragsservice')
  )
    return 'Rundfunkbeitrag aktualisiert';
  if (
    entry.zweck_i18n_key.includes('krankenkasse') ||
    entry.zweck_i18n_key.includes('kv')
  )
    return 'Krankenkasse bestätigt';
  return 'Stammdaten aktualisiert';
}

function behoerdenName(
  entry: UebermittlungsLogEntry,
  behoerdenById: Record<string, Behoerde>,
): string {
  const id = entry.absender_behoerde_id ?? '';
  if (!id) return 'Über die GovTech DE App';
  return behoerdenById[id]?.name_de ?? id;
}
