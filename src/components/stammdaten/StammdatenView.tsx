'use client';

import * as React from 'react';
import Link from 'next/link';
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
import { Aenderungsprotokoll } from '@/components/stammdaten/datenblatt/Aenderungsprotokoll';
import { Datenblatt } from '@/components/stammdaten/datenblatt/Datenblatt';
import { IdentitaetsAnker } from '@/components/stammdaten/datenblatt/IdentitaetsAnker';
import { RegisterAuszug } from '@/components/stammdaten/datenblatt/RegisterAuszug';
import { WalletZeile } from '@/components/stammdaten/datenblatt/WalletZeile';
import {
  buildDatenblattModel,
  findMeldebehoerde,
} from '@/components/stammdaten/datenblatt/datenblatt-model';
import { deriveRegisterNodes } from '@/components/stammdaten/datenblatt/register-map';
import type {
  Behoerde,
  Persona,
  Stammdaten,
  UebermittlungsLogEntry,
  WalletAttestation,
} from '@/types';

interface Loaded {
  persona: Persona;
  stammdaten: Stammdaten;
  log: UebermittlungsLogEntry[];
  wallet: WalletAttestation[];
  behoerden: Behoerde[];
  behoerdenById: Record<string, Behoerde>;
}

/**
 * `<StammdatenView>` — „Amtliches Datenblatt" (Spec `stammdaten-datenblatt.md`).
 *
 * The screen reads as a register extract in three full-width bands: an identity
 * band (dark `[MOCK]` credential + facts + wallet, beside the registers that
 * keep the data), one calm data sheet whose every entry names its register, and
 * the change log as a tabular foot band.
 * No completeness percentage, no verification badges, no edit affordances that
 * lead nowhere — the single secondary action explains where corrections really
 * happen, and „Adresse ändern" links to the Umzug wizard that really does it.
 */
export function StammdatenView() {
  const [phase, setPhase] = React.useState<'loading' | 'ready' | 'error'>(
    'loading',
  );
  const [data, setData] = React.useState<Loaded | null>(null);
  const [reloadToken, setReloadToken] = React.useState(0);
  const [dialogOpen, setDialogOpen] = React.useState(false);

  const t = useTranslations('stammdaten');
  const tD = useTranslations('stammdaten.datenblatt');
  const tFmt = useTranslations('stammdaten.format');

  React.useEffect(() => {
    let cancelled = false;
    setPhase('loading');
    /* Mock-backend injects a 5% error per call; with 4 parallel calls a fresh
     * mount fails ~19% of the time. Retry the whole bundle up to 3× with a
     * short backoff, then show an error state instead of an endless skeleton. */
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
          setData({ persona, stammdaten, log, wallet, behoerden, behoerdenById: map });
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

  const { persona, stammdaten, log, wallet, behoerden, behoerdenById } = data;

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

  const meldebehoerde = findMeldebehoerde(
    behoerden,
    stammdaten.anschrift_aktuell?.ort,
  );

  /* Which credential actually carries the eID function: the Personalausweis
   * (§ 18 PAuswG) or, for third-country nationals, the eAT (§ 78 AufenthG).
   * A foreign passport never does — Anna's russischer Reisepass is therefore
   * not a candidate here, only her Aufenthaltstitel is. */
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

  const model = buildDatenblattModel({
    persona,
    stammdaten,
    log,
    behoerdenById,
    texte: {
      familienstand,
      staatsangehoerigkeit: nationality,
      fuehrendeQuelle: meldebehoerde?.name_de ?? tD('identitaet.quelle_fallback'),
      gesetzlicheRente: tD('value.gesetzliche_rente'),
      kind: (name, datum) => `${name} · ${tD('value.kind_geboren', { datum })}`,
    },
  });

  const register = deriveRegisterNodes({ behoerden, log });

  const aktualisierung = model.letzteAktualisierung;
  const updateSatz = aktualisierung
    ? aktualisierung.behoerdeName
      ? tD('subline_update', {
          datum: formatDateDe(aktualisierung.iso),
          zeit: tFmt('uhrzeit', { zeit: formatTimeDe(aktualisierung.iso) }),
          behoerde: aktualisierung.behoerdeName,
        })
      : tD('subline_update_ohne_absender', {
          datum: formatDateDe(aktualisierung.iso),
          zeit: tFmt('uhrzeit', { zeit: formatTimeDe(aktualisierung.iso) }),
        })
    : null;

  return (
    <div>
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
        <p className="sub max-w-2xl">
          {tD('subline', {
            angaben: model.angabenCount,
            register: register.count,
          })}
          {updateSatz ? ` ${updateSatz}` : null}
        </p>
      </div>

      {/* Three full-width bands instead of a 2fr/1fr page grid (Spec
          `stammdaten-blatt-dense.md` § 2): every band spans the canvas and sets
          its own height, so the dead quadrant a short rail left beside a long
          content column cannot come back — for any persona. */}
      {/* `gap-y-*` statt `gap-*`: die FROZEN prototype-v2.css definiert ein
          gleichnamiges `.gap-8 { gap: 8px }` und gewinnt per Quellreihenfolge —
          die Bänder standen dadurch 8px auseinander. Mit dem boxlosen Blatt
          (kein Panel-Padding mehr) fiele der Blattkopf sonst an die Unterkante
          der eID-Karte. */}
      <div className="flex flex-col gap-y-8">
        <div className="grid gap-y-8 xl:grid-cols-[minmax(0,1fr)_260px] xl:items-start xl:gap-x-8">
          <IdentitaetsAnker
            fullName={fullName}
            nationality={nationality}
            geburtsdatum={formatDateDe(geburtsdatumIso)}
            geburtsjahr={geburtsdatumIso.slice(0, 4)}
            rows={model.identitaet}
            eidDocument={eidDocument}
          >
            <WalletZeile count={wallet.length} />
          </IdentitaetsAnker>

          {/* „Wer führt Ihre Daten" beside „wer Sie sind". `max-w-2xl` keeps the
              six status rows readable at 768–1279px, where the zone is full
              width. Named after its content since the rail is history (review
              nit #7); labelled by the register title inside (a11y INFO-4). */}
          <aside
            data-testid="sd-register-zone"
            aria-labelledby="sd-register-title"
            className="min-w-0 max-w-2xl xl:max-w-none"
          >
            <RegisterAuszug nodes={register.nodes} count={register.count} />
          </aside>
        </div>

        <Datenblatt sektionen={model.sektionen} />

        <Aenderungsprotokoll
          entries={log}
          behoerdenById={behoerdenById}
          personaId={persona.id}
        />
      </div>

      <div
        data-testid="sd-datenhoheit"
        className="mt-10 border-t border-border pt-5"
      >
        <p className="max-w-3xl text-sm leading-relaxed text-text-secondary">
          {tD('datenhoheit.text')}
        </p>
        <Link
          href="/datenschutz"
          className="inline-flex min-h-11 items-center text-sm font-medium text-primary hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          {tD('datenhoheit.link')}
        </Link>
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
        <Skeleton shape="text" className="mt-2 w-96" />
      </div>
      <div className="grid grid-cols-1 items-start gap-8 xl:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)] xl:gap-10">
        <div className="flex flex-col gap-8">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[300px_1fr]">
            <Skeleton className="h-[190px] rounded-xl" />
            <div className="flex flex-col gap-3">
              <Skeleton shape="text" className="h-7 w-56" />
              <Skeleton shape="text" className="w-64" />
              <Skeleton shape="text" className="w-72" />
              <Skeleton shape="text" className="w-60" />
            </div>
          </div>
          <Skeleton className="h-[520px] rounded-2xl" />
        </div>
        <div className="flex flex-col gap-6">
          <Skeleton className="h-40 rounded-xl" />
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-56 rounded-xl" />
        </div>
      </div>
    </div>
  );
}
