'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';

import { api } from '@/lib/mock-backend';
import { formatDateDe, formatTimeDe } from '@/lib/utils';
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
import type { EidDocument } from '@/components/onboarding/EidCredentialCard';
import { PresentCredentialDialog } from '@/components/dokumente/PresentCredentialDialog';
import {
  AkteTabsPanels,
  AkteTabsRail,
  type AkteTabId,
} from '@/components/stammdaten/akte/AkteTabs';
import { DatenhoheitKarte } from '@/components/stammdaten/akte/DatenhoheitKarte';
import {
  DokumentePanel,
  istVorzeigbar,
} from '@/components/stammdaten/akte/DokumentePanel';
import { DokumenteNachweiseKarte } from '@/components/stammdaten/akte/DokumenteNachweiseKarte';
import { IdentitaetsKopf } from '@/components/stammdaten/akte/IdentitaetsKopf';
import { PortraitKarte } from '@/components/stammdaten/akte/PortraitKarte';
import { Schnellaktionen } from '@/components/stammdaten/akte/Schnellaktionen';
import { UeberblickPanel } from '@/components/stammdaten/akte/UeberblickPanel';
import { VerlaufRailKarte } from '@/components/stammdaten/akte/VerlaufRailKarte';
import { VorgaengeRailKarte } from '@/components/stammdaten/akte/VorgaengeRailKarte';
import { Aenderungsprotokoll } from '@/components/stammdaten/datenblatt/Aenderungsprotokoll';
import { Datenblatt } from '@/components/stammdaten/datenblatt/Datenblatt';
import { RegisterAuszug } from '@/components/stammdaten/datenblatt/RegisterAuszug';
import {
  buildDatenblattModel,
  findMeldebehoerde,
} from '@/components/stammdaten/datenblatt/datenblatt-model';
import { deriveRegisterNodes } from '@/components/stammdaten/datenblatt/register-map';
import type {
  Behoerde,
  Document,
  Persona,
  Stammdaten,
  UebermittlungsLogEntry,
  Vorgang,
  WalletAttestation,
} from '@/types';

interface Loaded {
  persona: Persona;
  stammdaten: Stammdaten;
  log: UebermittlungsLogEntry[];
  wallet: WalletAttestation[];
  behoerden: Behoerde[];
  behoerdenById: Record<string, Behoerde>;
  vorgaenge: Vorgang[];
  documents: Document[];
}

/**
 * Priority of the two document tiles in card B — the paper that proves the
 * current status first, the travel document second (Spec `stammdaten-akte-v2.md`
 * § 4.6). A persona without either simply gets fewer tiles.
 */
const KACHEL_PRIO = ['aufenthaltstitel', 'personalausweis', 'reisepass'];

/**
 * `<StammdatenView>` — Ihre Daten aus Ihrer Sicht (Spec `stammdaten-akte-v2.md`).
 *
 * The screen answers in this order: who am I in the register (portrait plate
 * with its provenance foot + five facts), what applies right now (status card,
 * documents), what the detail says (data sheet, documents, change log — four
 * registers), and, in the rail, what I can do or want to know.
 *
 * It stays a read-only single source of truth: exactly one secondary action in
 * the header explains where corrections really happen, and the rail links to
 * flows that really run. Nothing here says „Akte" — the record belongs to the
 * authority (§ 29 VwVfG), and this page visibly aggregates five registers
 * instead of being one file.
 */
export function StammdatenView() {
  const [phase, setPhase] = React.useState<'loading' | 'ready' | 'error'>(
    'loading',
  );
  const [data, setData] = React.useState<Loaded | null>(null);
  const [reloadToken, setReloadToken] = React.useState(0);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [presentDoc, setPresentDoc] = React.useState<Document | null>(null);
  const [tab, setTab] = React.useState<AkteTabId>('ueberblick');

  const t = useTranslations('stammdaten');
  const tD = useTranslations('stammdaten.datenblatt');
  const tFmt = useTranslations('stammdaten.format');

  React.useEffect(() => {
    let cancelled = false;
    setPhase('loading');
    /* Mock-backend injects a 5% error per call; with six parallel calls a fresh
     * mount fails ~26% of the time. Retry the whole bundle up to 3× with a
     * short backoff (<2% residual), then show an error state instead of an
     * endless skeleton. Vorgänge and Dokumente ride the same bundle — a partial
     * failure path would trade consistency for a special case. */
    (async () => {
      for (let attempt = 0; attempt < 3 && !cancelled; attempt++) {
        try {
          const persona = await api.getProfile();
          const [stammdaten, log, wallet, behoerden, vorgaenge, documents] =
            await Promise.all([
              api.getStammdaten(persona.id),
              api.getUebermittlungsLog(persona.id, { limit: 20 }),
              api.getWalletAttestations(persona.id),
              api.getBehoerden(),
              api.getVorgaenge(),
              api.getDocuments(),
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
            vorgaenge,
            documents,
          });
          setPhase('ready');
          return;
        } catch {
          await new Promise((r) => setTimeout(r, 200));
        }
      }
      if (!cancelled) setPhase('error');
    })();
    return () => {
      cancelled = true;
    };
  }, [reloadToken]);

  if (phase === 'error') {
    return (
      <div>
        <div className="gt-page-head">
          <h1 id="sd-page-title">{t('page.title')}</h1>
        </div>
        {/* role=alert: the skeleton's role=status vanishes on error — without a
            live region the swap is silent for screen readers (WCAG 4.1.3). */}
        <p role="alert" className="text-sm text-text-secondary">
          {t('page.error_load')}
        </p>
        <Button
          type="button"
          variant="outline"
          className="mt-3"
          onClick={() => setReloadToken((n) => n + 1)}
        >
          {t('page.error_retry')}
        </Button>
      </div>
    );
  }

  if (phase === 'loading' || !data) {
    return <StammdatenSkeleton />;
  }

  const {
    persona,
    stammdaten,
    log,
    wallet,
    behoerden,
    behoerdenById,
    vorgaenge,
    documents,
  } = data;

  const fullName = `${stammdaten.identitaet.vornamen} ${stammdaten.identitaet.familienname}`;
  const geburtsdatumIso = stammdaten.identitaet.geburtsdatum;

  const nationalityKey = stammdaten.identitaet.staatsangehoerigkeit.toLowerCase();
  const nationality = tD.has(`nationality.${nationalityKey}`)
    ? tD(`nationality.${nationalityKey}`)
    : capitalize(stammdaten.identitaet.staatsangehoerigkeit);

  /* No fallback derivation from partner presence — a partner does not imply
   * „verheiratet" (that equation is exactly what the model's label logic
   * rejects). Missing Familienstand ⇒ empty value ⇒ the row is dropped,
   * per the model's no-value-no-row invariant. */
  const familienstandKey = stammdaten.familie.familienstand ?? '';
  const familienstand =
    familienstandKey && tD.has(`familienstand.${familienstandKey}`)
      ? tD(`familienstand.${familienstandKey}`)
      : familienstandKey;

  /* Spoken languages are a self-declaration — no register keeps them, so an
   * unknown code is dropped rather than shown raw. */
  const sprachen = (persona.sprachen ?? [])
    .filter((code) => tD.has(`sprache.${code}`))
    .map((code) => tD(`sprache.${code}`))
    .join(', ');

  const meldebehoerde = findMeldebehoerde(
    behoerden,
    stammdaten.anschrift_aktuell?.ort,
  );

  /* Which credential actually carries the eID function: the Personalausweis
   * (§ 18 PAuswG) or, for third-country nationals, the eAT (§ 78 Abs. 5
   * AufenthG). A foreign passport never does — Anna's russischer Reisepass is
   * therefore not a candidate here, only her Aufenthaltstitel is. */
  const eidDocument: EidDocument | undefined = stammdaten.dokumente_refs
    .personalausweis
    ? { kind: 'personalausweis', ...(meldebehoerde ? { issuer: meldebehoerde.name_de } : {}) }
    : persona.aufenthaltstitel
      ? {
          kind: 'eat',
          ...(persona.aufenthaltstitel.abh_behoerde_id &&
          behoerdenById[persona.aufenthaltstitel.abh_behoerde_id]
            ? {
                issuer:
                  behoerdenById[persona.aufenthaltstitel.abh_behoerde_id].name_de,
              }
            : {}),
        }
      : undefined;

  /* Persona-symmetric by construction: every persona has a Meldebehörde, and
     where the seed has no local match the generic wording stands in. This is
     the ONE field of the portrait foot that is always set — and the ONLY place
     provenance is rendered; the model carries no „Führende Quelle"-Zeile
     (code-review 2026-07-29, Minor 6). */
  const fuehrendeQuelle =
    meldebehoerde?.name_de ?? tD('identitaet.quelle_fallback');

  const model = buildDatenblattModel({
    persona,
    stammdaten,
    log,
    behoerdenById,
    texte: {
      familienstand,
      staatsangehoerigkeit: nationality,
      sprachen,
      gesetzlicheRente: tD('value.gesetzliche_rente'),
      kind: (name, datum) => `${name} · ${tD('value.kind_geboren', { datum })}`,
    },
  });

  const register = deriveRegisterNodes({ behoerden, log });

  const alleAusweise = documents.filter((d) => d.kategorie === 'ausweise');
  /* Die Kacheln wählen aus der VOLLEN Ausweismenge (Spec § 4.6); erst die
     Register-Liste ist auf fünf Zeilen gedeckelt. Andersherum hinge die
     Priorität still an der Seed-Reihenfolge. */
  const kacheln = KACHEL_PRIO.map((typ) =>
    alleAusweise.find((d) => d.typ === typ),
  )
    .filter((d): d is Document => d !== undefined)
    .slice(0, 2);

  const ausweise = alleAusweise.slice(0, 5);
  const vorzeigbar = ausweise.find(istVorzeigbar);

  const aktualisierung = model.letzteAktualisierung;
  const aktualisiertWert = aktualisierung
    ? t('akte.portraet.aktualisiert_wert', {
        datum: formatDateDe(aktualisierung.iso),
        zeit: tFmt('uhrzeit', { zeit: formatTimeDe(aktualisierung.iso) }),
      })
    : undefined;

  /* Switching the register from the rail must also move the focus there — the
     content appears far from the trigger, and the trigger itself stays put
     (WCAG 2.4.3). rAF because the tab only becomes focusable after the state
     commit paints. */
  const zeigeVerlauf = () => {
    setTab('verlauf');
    requestAnimationFrame(() => {
      document.getElementById('sd-tab-verlauf')?.focus();
    });
  };

  return (
    <div className="sd-screen">
      <div className="gt-page-head">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <h1 id="sd-page-title">{t('page.title')}</h1>
          <div data-testid="sd-header-actions">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDialogOpen(true)}
            >
              {tD('cta_korrigieren')}
            </Button>
          </div>
        </div>
      </div>

      {/* DOM-Reihenfolge: Hero (inkl. Registerzeile) → Register-Inhalt → Rail
          (Inhalt vor Sekundäraktionen). ≤1279 stapelt `.sd-cols` genau so — die
          frühere `order`-Vorziehung der Schnellaktionen ist raus (Escape-Hatch
          Spec § 9, a11y-Report 2026-07-29 F-1: Fokus-Sprünge, WCAG 2.4.3). */}
      <div className="sd-cols">
        <div className="sd-main min-w-0">
          {/* Zwei Zellen (`.sd-hero` = `auto minmax(0,1fr)`): Porträt-Platte,
              daneben die Identitätsspalte. Die fünf Fakten liegen INNERHALB
              dieser Spalte, nicht über die volle Hero-Breite darunter — jede
              Zelle liefert deshalb genau EIN Grid-Kind. */}
          <section
            aria-labelledby="sd-hero-name"
            data-testid="sd-akte-hero"
            className="sd-hero"
          >
            {/* Die Spaltenbreite liegt hier, nicht auf der Platte: Legende und
                Platte sollen dieselbe Kante haben — eine breitere Legende hätte
                die `auto`-Spur des Heros aufgezogen und der Identitätsspalte
                Platz genommen. */}
            <div className="w-[176px] md:w-[192px] 2xl:w-[208px]">
              <PortraitKarte
                {...(aktualisiertWert ? { aktualisiertWert } : {})}
                quelleWert={fuehrendeQuelle}
              />
              {/* Die Legende ist eine Aussage ÜBER das Artefakt und steht
                  deshalb unter der Karte, nicht in ihr (Spec § 4.2). */}
              <p
                data-testid="sd-portraet-legende"
                className="mt-1.5 text-[12px] leading-snug text-text-secondary md:text-[10.5px]"
              >
                {t('akte.portraet.legende')}
              </p>
            </div>

            {/* Die Registerzeile ist letztes Kind der Identitätsspalte (Spec
                § 14, Layout-Nachtrag): sie steht damit neben der unteren
                Porträthälfte statt unter dem gesamten Hero, wo die Höhe der
                Platte ein leeres Feld erzwang. Die Panels bleiben vollbreit
                darunter — `aria-controls` trägt die Zuordnung. */}
            <div className="flex min-w-0 flex-col gap-y-5">
              <IdentitaetsKopf
                fullName={fullName}
                rows={model.identitaet}
                angaben={model.angabenCount}
                register={register.count}
              />
              <AkteTabsRail aktiv={tab} onAktivChange={setTab} />
            </div>
          </section>

          <div className="sd-tabsblock min-w-0">
            <AkteTabsPanels
              aktiv={tab}
              panels={{
                ueberblick: (
                  <div className="flex flex-col gap-y-[22px]">
                    <UeberblickPanel
                      persona={persona}
                      stammdaten={stammdaten}
                      behoerdenById={behoerdenById}
                    />
                    <DokumenteNachweiseKarte
                      dokumente={kacheln}
                      behoerdenById={behoerdenById}
                      walletCount={wallet.length}
                      onPresent={setPresentDoc}
                    />
                  </div>
                ),
                persoenlich: <Datenblatt sektionen={model.sektionen} />,
                dokumente: (
                  <DokumentePanel
                    fullName={fullName}
                    nationality={nationality}
                    geburtsdatum={formatDateDe(geburtsdatumIso)}
                    geburtsjahr={geburtsdatumIso.slice(0, 4)}
                    eidDocument={eidDocument}
                    documents={ausweise}
                    behoerdenById={behoerdenById}
                    onPresent={setPresentDoc}
                  />
                ),
                verlauf: (
                  <Aenderungsprotokoll
                    entries={log}
                    behoerdenById={behoerdenById}
                    personaId={persona.id}
                    limit={12}
                  />
                ),
              }}
            />
          </div>
        </div>

        {/* Ein `<div>`, kein `<aside>`: ≤1279 ist die Rail `display: contents`,
            und ein Landmark ohne Kasten ist ein a11y-Baum-Risiko. */}
        <div data-testid="sd-rail" className="sd-rail min-w-0">
          <Schnellaktionen
            {...(vorzeigbar
              ? { onPresent: () => setPresentDoc(vorzeigbar) }
              : {})}
          />

          <div data-testid="sd-rail-rest" className="sd-rail-rest min-w-0">
            <VorgaengeRailKarte vorgaenge={vorgaenge} />

            <div className="sd-flaeche min-w-0 px-4 py-4 md:px-[18px]">
              <RegisterAuszug nodes={register.nodes} count={register.count} />
            </div>

            <VerlaufRailKarte
              entries={log}
              behoerdenById={behoerdenById}
              personaId={persona.id}
              onAlleAktivitaeten={zeigeVerlauf}
            />

            <DatenhoheitKarte />
          </div>
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{tD('dialog.title')}</DialogTitle>
            <DialogDescription>{tD('dialog.body')}</DialogDescription>
          </DialogHeader>
          <p className="text-sm text-text-secondary">{tD('dialog.hinweis')}</p>
          <p className="text-xs text-muted-foreground">{t('dialog.mock_hint')}</p>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDialogOpen(false)}
            >
              {t('dialog.close')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* One dialog instance for both triggers (rail row and document row) —
          two mounted copies would mean two `[role=dialog]` nodes to reason
          about in the focus and axe gates. */}
      <PresentCredentialDialog
        open={presentDoc !== null}
        doc={presentDoc}
        holderName={`${persona.vorname} ${persona.nachname}`.trim()}
        behoerdeName={
          presentDoc
            ? (behoerdenById[presentDoc.ausstellende_behoerde_id]?.name_de ??
              presentDoc.ausstellende_behoerde_id)
            : ''
        }
        onOpenChange={(next) => {
          if (!next) setPresentDoc(null);
        }}
      />
    </div>
  );
}

function capitalize(value: string): string {
  if (!value) return value;
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function StammdatenSkeleton() {
  const tCommon = useTranslations('common');
  return (
    <div role="status" aria-busy="true">
      <span className="sr-only">{tCommon('loading')}</span>
      <div className="gt-page-head">
        <Skeleton shape="text" className="h-8 w-48" />
      </div>
      <div className="sd-cols">
        <div className="sd-main min-w-0">
          <div className="flex flex-col gap-x-7 gap-y-6 sm:flex-row">
            <Skeleton className="h-[330px] w-[192px] shrink-0 rounded-xl" />
            <div className="flex flex-1 flex-col gap-3">
              <Skeleton shape="text" className="h-8 w-56" />
              <Skeleton shape="text" className="w-72" />
              <Skeleton className="h-[120px] rounded-[10px]" />
              <Skeleton shape="text" className="mt-2 h-10 w-full max-w-md" />
            </div>
          </div>
          <div className="sd-tabsblock flex flex-col gap-y-[22px]">
            <Skeleton className="h-[260px] rounded-[10px]" />
            <Skeleton className="h-[160px] rounded-[10px]" />
          </div>
        </div>
        <div className="sd-rail min-w-0">
          <Skeleton className="h-[140px] rounded-xl" />
          <div className="sd-rail-rest">
            <Skeleton className="h-52 rounded-[10px]" />
            <Skeleton className="h-56 rounded-[10px]" />
            <Skeleton className="h-40 rounded-[10px]" />
            <Skeleton className="h-24 rounded-[10px]" />
          </div>
        </div>
      </div>
    </div>
  );
}
