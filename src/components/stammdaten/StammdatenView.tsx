'use client';

import * as React from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { format, parseISO } from 'date-fns';
import { de as deLocale } from 'date-fns/locale';
import { toast } from 'sonner';

import { api } from '@/lib/mock-backend';
import { cn } from '@/lib/utils';
import type {
  Behoerde,
  MdlAttestationMock,
  Mobilitaet,
  Persona,
} from '@/types';
import type {
  Stammdaten,
  StammdatenSektionId,
  StammdatenUebermittlungssperreId,
  UebermittlungsLogEntry,
  WalletAttestation,
} from '@/types/stammdaten';

import { IbanSpeculativePushModal, type IbanSpeculativePushTargets } from './IbanSpeculativePushModal';
import { MdlTeaserCard } from './MdlTeaserCard';
import { ReligionConsentModal } from './ReligionConsentModal';
import { SperrenAktivierenConfirmDialog } from './SperrenAktivierenConfirmDialog';
import { StammdatenFieldCard } from './StammdatenFieldCard';
import { StammdatenHero } from './StammdatenHero';
import {
  StammdatenSectionNav,
  type StammdatenSectionNavKey,
} from './StammdatenSectionNav';
import { StammdatenSektion } from './StammdatenSektion';
import {
  UebermittlungsLogList,
  type UebermittlungsLogRichtung,
} from './UebermittlungsLogList';
import { RichtungSwitch } from './kontakt/RichtungSwitch';
import { WalletSubTab } from './WalletSubTab';
import { AltersvorsorgeSektion } from './AltersvorsorgeSektion';
import { KvPflegeSektion } from './KvPflegeSektion';
import { PflegegradConsentModal } from './PflegegradConsentModal';
import type {
  AltersvorsorgeSektionData,
} from './AltersvorsorgeSektion';
import type {
  KvPflegeSektionData,
} from './KvPflegeSektion';
import type {
  AnrechnungszeitEntry,
} from './AnrechnungszeitenList';
import type { RentenEckdatenView } from './YellowLetterEchoCard';
import { MobilitaetSektion } from './mobilitaet/MobilitaetSektion';
import type { PunkteResultView } from './mobilitaet/PunkteResultCard';
import { Button } from '@/components/ui/button';

interface StammdatenViewProps {
  nowIso: string;
}

type Tab = 'profil' | 'wallet';

interface Loaded {
  stammdaten: Stammdaten;
  persona: Persona;
  behoerdenById: Record<string, Behoerde>;
  walletAttestations: WalletAttestation[];
  log: UebermittlungsLogEntry[];
  altersvorsorge: NonNullable<Stammdaten['altersvorsorge']> | null;
  kvPflege: NonNullable<Stammdaten['krankenversicherung_pflege']> | null;
  mobilitaet: Mobilitaet | null;
  mdl: MdlAttestationMock | null;
}

/**
 * `<StammdatenView>` — Client-side view-Container für `/stammdaten`.
 *
 * - Lädt `getStammdaten`, `getProfile`, `getBehoerden`, `getWalletAttestations`,
 *   `getUebermittlungsLog(personaId,{limit:50})` parallel.
 * - Re-Render bei Search-Param-Wechsel zwischen `?tab=profil` und `?tab=wallet`.
 * - Hält die Modal-States für Religion-Consent / Sperren / IBAN-Push /
 *   Wallet-Preview.
 */
export function StammdatenView({ nowIso }: StammdatenViewProps) {
  const tPage = useTranslations('stammdaten.page');
  const tTab = useTranslations('stammdaten.tab');
  const searchParams = useSearchParams();
  const tab: Tab = searchParams.get('tab') === 'wallet' ? 'wallet' : 'profil';

  const [data, setData] = React.useState<Loaded | null>(null);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [refreshing, setRefreshing] = React.useState(false);

  const [religionModalOpen, setReligionModalOpen] = React.useState(false);
  const [religionPending, setReligionPending] = React.useState(false);

  const [sperrenModal, setSperrenModal] = React.useState<{
    open: boolean;
    variante: 'auskunftssperre' | 'uebermittlungssperre';
    sperreId?: StammdatenUebermittlungssperreId;
    label?: string;
  }>({ open: false, variante: 'uebermittlungssperre' });

  const [ibanModalOpen, setIbanModalOpen] = React.useState(false);
  const [ibanPending, setIbanPending] = React.useState(false);

  // V1.1 — Pflegegrad-Modal-State (Pattern-Konsistenz zu Religion-V1).
  const [pflegegradModalOpen, setPflegegradModalOpen] = React.useState(false);
  const [pflegegradPending, setPflegegradPending] = React.useState(false);

  // V1.1 — Activity-Log-Idempotenz (epa-banner-seen). Höchstens 1× pro Mount.
  const epaBannerSeenRef = React.useRef(false);

  const refresh = React.useCallback(async () => {
    setRefreshing(true);
    setLoadError(null);
    try {
      const [persona, behoerden] = await Promise.all([
        api.getProfile(),
        api.getBehoerden(),
      ]);
      const behoerdenById: Record<string, Behoerde> = {};
      for (const b of behoerden) behoerdenById[b.id] = b;

      const [
        stammdaten,
        log,
        walletAttestations,
        altersvorsorge,
        kvPflege,
        mobilitaet,
        mdl,
      ] = await Promise.all([
        api.getStammdaten(persona.id),
        api.getUebermittlungsLog(persona.id, { limit: 50 }),
        api.getWalletAttestations(persona.id),
        api.getAltersvorsorge(persona.id),
        api.getKrankenversicherungPflege(persona.id),
        api.getMobilitaet(persona.id),
        api.getMdlAttestation(persona.id),
      ]);

      setData({
        stammdaten,
        persona,
        behoerdenById,
        walletAttestations,
        log,
        altersvorsorge,
        kvPflege,
        mobilitaet,
        mdl,
      });
    } catch (err) {
      if (typeof console !== 'undefined') console.error(err);
      setLoadError(tPage('error_load'));
    } finally {
      setRefreshing(false);
    }
  }, [tPage]);

  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  if (loadError) {
    return (
      <section className="flex flex-col items-start gap-3">
        <p className="text-sm text-destructive">{loadError}</p>
        <Button type="button" variant="outline" onClick={refresh}>
          {tPage('error_retry')}
        </Button>
      </section>
    );
  }

  if (!data) {
    return (
      <section className="flex flex-col gap-3" aria-busy="true">
        <p className="text-sm text-muted-foreground">{tPage('loading')}</p>
      </section>
    );
  }

  const {
    stammdaten,
    persona,
    behoerdenById,
    walletAttestations,
    log,
    altersvorsorge,
    kvPflege,
    mobilitaet,
    mdl,
  } = data;

  // V1.1 — derive sektionen-data aus Persona + altersvorsorge / kvPflege.
  const altersvorsorgeData: AltersvorsorgeSektionData | null =
    altersvorsorge !== null
      ? deriveAltersvorsorgeData(persona, altersvorsorge, kvPflege)
      : null;
  const kvPflegeData: KvPflegeSektionData | null =
    kvPflege !== null
      ? deriveKvPflegeData(persona, kvPflege, behoerdenById)
      : null;

  return (
    <section
      aria-labelledby="stammdaten-hero-title"
      className="flex flex-col gap-6"
      data-testid="stammdaten-view"
    >
      <nav
        aria-label={tTab('aria_label')}
        className="flex gap-1 border-b border-border"
      >
        <TabLink active={tab === 'profil'} href="?" testId="tab-profil">
          {tTab('profil.label')}
        </TabLink>
        <TabLink
          active={tab === 'wallet'}
          href="?tab=wallet"
          testId="tab-wallet"
        >
          {tTab('wallet.label')}
        </TabLink>
      </nav>

      {tab === 'profil' ? (
        <ProfilTab
          stammdaten={stammdaten}
          persona={persona}
          behoerdenById={behoerdenById}
          log={log}
          nowIso={nowIso}
          altersvorsorgeData={altersvorsorgeData}
          kvPflegeData={kvPflegeData}
          mobilitaet={mobilitaet}
          mdl={mdl}
          onOpenReligion={() => setReligionModalOpen(true)}
          onOpenIban={() => setIbanModalOpen(true)}
          onOpenSperre={(variante, sperreId, label) =>
            setSperrenModal({
              open: true,
              variante,
              sperreId,
              label,
            })
          }
          onOpenPflegegrad={() => setPflegegradModalOpen(true)}
          onEpaBannerSeen={() => {
            if (epaBannerSeenRef.current) return;
            epaBannerSeenRef.current = true;
            void api.getEpaStatus(persona.id).catch(() => {
              // Stiller Fehler — Activity-Log ist optional.
            });
          }}
        />
      ) : (
        <WalletSubTab
          attestations={walletAttestations}
          personaId={persona.id}
        />
      )}

      <ReligionConsentModal
        open={religionModalOpen}
        onOpenChange={(next) => {
          if (!next) setReligionModalOpen(false);
        }}
        onCancel={() => setReligionModalOpen(false)}
        onConsent={async () => {
          setReligionPending(true);
          try {
            await api.setReligionSessionConsent(persona.id, true);
            setReligionModalOpen(false);
            await refresh();
          } catch (err) {
            toast.error(tPage('religion_consent_error'));
            if (typeof console !== 'undefined') console.error(err);
          } finally {
            setReligionPending(false);
          }
        }}
        pending={religionPending}
      />

      <SperrenAktivierenConfirmDialog
        open={sperrenModal.open}
        onOpenChange={(next) => {
          if (!next) setSperrenModal((s) => ({ ...s, open: false }));
        }}
        variante={sperrenModal.variante}
        uebermittlungssperreLabel={sperrenModal.label}
        onCancel={() => setSperrenModal((s) => ({ ...s, open: false }))}
        onConfirm={async ({ begruendung }) => {
          try {
            if (sperrenModal.variante === 'auskunftssperre') {
              await api.toggleAuskunftssperre(persona.id, true, begruendung);
            } else {
              if (!sperrenModal.sperreId) {
                throw new Error('uebermittlungssperre id missing');
              }
              await api.toggleUebermittlungssperre(
                persona.id,
                sperrenModal.sperreId,
                true,
              );
            }
            setSperrenModal((s) => ({ ...s, open: false }));
            await refresh();
          } catch (err) {
            toast.error(tPage('sperre_error'));
            if (typeof console !== 'undefined') console.error(err);
          }
        }}
      />

      <IbanSpeculativePushModal
        open={ibanModalOpen}
        onOpenChange={(next) => {
          if (!next) setIbanModalOpen(false);
        }}
        iban={stammdaten.iban_speculative.iban ?? ''}
        onCancel={() => setIbanModalOpen(false)}
        onConfirm={async (targets: IbanSpeculativePushTargets) => {
          setIbanPending(true);
          try {
            await api.simulateIbanPush(persona.id, targets);
            setIbanModalOpen(false);
            await refresh();
          } catch (err) {
            toast.error(tPage('iban_push_error'));
            if (typeof console !== 'undefined') console.error(err);
          } finally {
            setIbanPending(false);
          }
        }}
        pending={ibanPending}
      />

      <PflegegradConsentModal
        open={pflegegradModalOpen}
        onOpenChange={(next) => {
          if (!next) setPflegegradModalOpen(false);
        }}
        onCancel={() => setPflegegradModalOpen(false)}
        onConsent={async () => {
          setPflegegradPending(true);
          try {
            await api.consentPflegegrad(persona.id, true);
            setPflegegradModalOpen(false);
            await refresh();
          } catch (err) {
            toast.error(tPage('pflegegrad_consent_error'));
            if (typeof console !== 'undefined') console.error(err);
          } finally {
            setPflegegradPending(false);
          }
        }}
        pending={pflegegradPending}
      />

      {refreshing && (
        <span className="sr-only" aria-live="polite">
          {tPage('refreshing')}
        </span>
      )}
    </section>
  );
}

function TabLink({
  active,
  href,
  testId,
  children,
}: {
  active: boolean;
  href: string;
  testId: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      data-testid={testId}
      className={cn(
        'inline-flex items-center gap-1 rounded-t-md border-b-2 px-3 py-2 text-sm font-medium transition-colors',
        active
          ? 'border-foreground text-foreground'
          : 'border-transparent text-muted-foreground hover:text-foreground',
      )}
    >
      {children}
    </Link>
  );
}

interface ProfilTabProps {
  stammdaten: Stammdaten;
  persona: Persona;
  behoerdenById: Record<string, Behoerde>;
  log: UebermittlungsLogEntry[];
  nowIso: string;
  altersvorsorgeData: AltersvorsorgeSektionData | null;
  kvPflegeData: KvPflegeSektionData | null;
  mobilitaet: Mobilitaet | null;
  mdl: MdlAttestationMock | null;
  onOpenReligion: () => void;
  onOpenIban: () => void;
  onOpenSperre: (
    variante: 'auskunftssperre' | 'uebermittlungssperre',
    sperreId?: StammdatenUebermittlungssperreId,
    label?: string,
  ) => void;
  onOpenPflegegrad: () => void;
  onEpaBannerSeen: () => void;
}

function ProfilTab({
  stammdaten,
  persona,
  behoerdenById,
  log,
  nowIso,
  altersvorsorgeData,
  kvPflegeData,
  mobilitaet,
  mdl,
  onOpenReligion,
  onOpenIban,
  onOpenSperre,
  onOpenPflegegrad,
  onEpaBannerSeen,
}: ProfilTabProps) {
  const tPage = useTranslations('stammdaten.page');
  const tField = useTranslations('stammdaten.field');
  const tCta = useTranslations('stammdaten.cta');
  const tLog = useTranslations('stammdaten.aktivitaet');

  const personaName = `${stammdaten.identitaet.vornamen} ${stammdaten.identitaet.familienname}`.trim();
  const registerCount = countRegisters(stammdaten);
  const letzteUebermittlung = log[0] ?? null;

  // V1.2 — page-level Richtung-Filter (Spec § 6.11 / Hard-Line § 11.40).
  // Per-Sektion-Listen bleiben unverändert auf Default `alle`.
  const [richtung, setRichtung] =
    React.useState<UebermittlungsLogRichtung>('alle');

  const filterLog = (sektion: StammdatenSektionId) =>
    log.filter((e) => e.sektion === sektion).slice(0, 5);

  // Phase-6c — In-Page-ToC: nur Sektionen aufnehmen, die tatsächlich gerendert
  // werden. Render-Order entspricht der JSX-Reihenfolge unten.
  const sectionNavKeys: StammdatenSectionNavKey[] = [
    'identitaet',
    'anschrift',
    'familie',
  ];
  if (altersvorsorgeData) sectionNavKeys.push('altersvorsorge');
  if (kvPflegeData) sectionNavKeys.push('krankenversicherung_pflege');
  if (mobilitaet) sectionNavKeys.push('mobilitaet');
  sectionNavKeys.push('dokumente', 'sperren_einstellungen');

  return (
    <div className="flex flex-col gap-5">
      <StammdatenHero
        personaName={personaName}
        registerCount={registerCount}
        letzteUebermittlung={letzteUebermittlung}
        behoerdenById={behoerdenById}
        disclaimerMeta={stammdaten.disclaimer_meta}
        nowIso={nowIso}
      />

      {/* Phase-6c — mDL-Teaser, nur wenn Persona eine mDL-Attestation hat. */}
      {mdl && <MdlTeaserCard />}

      {/* Phase-6c — In-Page-Section-Navigation (Audit-Finding #2). */}
      <StammdatenSectionNav sections={sectionNavKeys} />

      {/* V1.2 — page-level Aktivitätsprotokoll mit Richtung-Filter
          (Spec § 6.11 / Hard-Line § 11.40). */}
      <section
        aria-labelledby="page-aktivitaet-heading"
        className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4"
        data-testid="page-aktivitaet-section"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2
            id="page-aktivitaet-heading"
            className="text-base font-semibold tracking-tight text-foreground"
          >
            {tLog('list_heading')}
          </h2>
          <RichtungSwitch value={richtung} onChange={setRichtung} />
        </div>
        <UebermittlungsLogList
          entries={log}
          behoerdenById={behoerdenById}
          richtung={richtung}
          limit={10}
        />
      </section>

      {/* Sektion: Identität */}
      <StammdatenSektion
        sektionId="identitaet"
        titleI18nKey="stammdaten.sektion.identitaet.title"
        defaultOpen
        fieldCount={5}
        preview={`${stammdaten.identitaet.vornamen} ${stammdaten.identitaet.familienname}`}
        aktivitaetslog={
          <UebermittlungsLogList
            entries={filterLog('identitaet')}
            behoerdenById={behoerdenById}
          />
        }
      >
        <StammdatenFieldCard
          fieldId="familienname"
          labelI18nKey="stammdaten.field.familienname.label"
          value={stammdaten.identitaet.familienname}
          editability="read_only"
          quellen={[
            {
              behoerde_id: detectBuergeramtId(behoerdenById, persona),
              rechtsgrundlage: '§ 3 Abs. 1 Nr. 12 BMG',
            },
          ]}
          korrekturweg={{
            wizard_slug: undefined,
            pointer_i18n_key: 'stammdaten.korrekturweg.familienname.pointer',
            rechtsgrundlage: '§ 1355 BGB',
          }}
          behoerdenById={behoerdenById}
        />
        <StammdatenFieldCard
          fieldId="vornamen"
          labelI18nKey="stammdaten.field.vornamen.label"
          value={stammdaten.identitaet.vornamen}
          editability="read_only"
          quellen={[
            {
              behoerde_id: detectBuergeramtId(behoerdenById, persona),
              rechtsgrundlage: '§ 3 Abs. 1 Nr. 12 BMG',
            },
          ]}
          korrekturweg={{
            wizard_slug: undefined,
            pointer_i18n_key: 'stammdaten.korrekturweg.vornamen.pointer',
            rechtsgrundlage: '§ 45 PStG',
          }}
          behoerdenById={behoerdenById}
        />
        <StammdatenFieldCard
          fieldId="geburtsdatum"
          labelI18nKey="stammdaten.field.geburtsdatum.label"
          value={formatIsoDe(stammdaten.identitaet.geburtsdatum)}
          editability="read_only"
          quellen={[
            {
              behoerde_id: detectBuergeramtId(behoerdenById, persona),
              rechtsgrundlage: '§ 3 Abs. 1 Nr. 4 BMG',
            },
          ]}
          korrekturweg={{
            wizard_slug: undefined,
            pointer_i18n_key: 'stammdaten.korrekturweg.geburtsdatum.pointer',
            rechtsgrundlage: '§ 21 PStG',
          }}
          behoerdenById={behoerdenById}
        />
        <StammdatenFieldCard
          fieldId="geschlecht"
          labelI18nKey="stammdaten.field.geschlecht.label"
          value={tField(`geschlecht.value.${stammdaten.identitaet.geschlecht}`)}
          editability="read_only"
          quellen={[
            {
              behoerde_id: detectBuergeramtId(behoerdenById, persona),
              rechtsgrundlage: '§ 3 Abs. 1 Nr. 7 BMG',
            },
          ]}
          korrekturweg={{
            wizard_slug: 'sbgg-3-stufen',
            pointer_i18n_key: 'stammdaten.korrekturweg.geschlecht.pointer',
            rechtsgrundlage: '§ 4 SBGG',
          }}
          behoerdenById={behoerdenById}
        />
        {stammdaten.identitaet.steuer_id && (
          <StammdatenFieldCard
            fieldId="steuer_id"
            labelI18nKey="stammdaten.field.steuer_id.label"
            value={stammdaten.identitaet.steuer_id}
            editability="read_only"
            quellen={[
              {
                behoerde_id: 'bzst',
                rechtsgrundlage: '§ 139b AO',
              },
            ]}
            korrekturweg={{
              wizard_slug: undefined,
              pointer_i18n_key: 'stammdaten.korrekturweg.steuer_id.pointer',
              rechtsgrundlage: '§ 139b AO',
            }}
            behoerdenById={behoerdenById}
            mockWatermark
          />
        )}
      </StammdatenSektion>

      {/* Sektion: Anschrift */}
      <StammdatenSektion
        sektionId="anschrift"
        titleI18nKey="stammdaten.sektion.anschrift.title"
        fieldCount={1 + stammdaten.anschriften_historisch.length}
        preview={`${stammdaten.anschrift_aktuell.strasse} ${stammdaten.anschrift_aktuell.hausnummer}, ${stammdaten.anschrift_aktuell.plz} ${stammdaten.anschrift_aktuell.ort}`}
        aktivitaetslog={
          <UebermittlungsLogList
            entries={filterLog('anschrift')}
            behoerdenById={behoerdenById}
          />
        }
      >
        <StammdatenFieldCard
          fieldId="anschrift_aktuell"
          labelI18nKey="stammdaten.field.anschrift_aktuell.label"
          value={formatAdresse(stammdaten.anschrift_aktuell)}
          editability="read_only"
          quellen={[
            {
              behoerde_id: detectBuergeramtId(behoerdenById, persona),
              rechtsgrundlage: '§ 3 Abs. 1 Nr. 8 BMG',
            },
          ]}
          korrekturweg={{
            wizard_slug: 'adresse-ewa',
            pointer_i18n_key: 'stammdaten.korrekturweg.anschrift_aktuell.pointer',
            rechtsgrundlage: '§ 17 BMG',
          }}
          behoerdenById={behoerdenById}
        />
        {stammdaten.anschriften_historisch.map((adr, idx) => (
          <StammdatenFieldCard
            key={`anschrift-hist-${idx}`}
            fieldId={`anschrift_historisch_${idx}`}
            labelI18nKey="stammdaten.field.anschriften_historisch.label"
            value={`${formatAdresse(adr)} (${formatIsoDe(adr.gueltig_ab)} – ${formatIsoDe(adr.gueltig_bis)})`}
            editability="read_only"
            quellen={[
              {
                behoerde_id: detectBuergeramtId(behoerdenById, persona),
                rechtsgrundlage: '§ 3 Abs. 1 Nr. 8 BMG',
              },
            ]}
            korrekturweg={{
              wizard_slug: undefined,
              pointer_i18n_key: 'stammdaten.korrekturweg.anschriften_historisch.pointer',
              rechtsgrundlage: '§ 33 BMG',
            }}
            behoerdenById={behoerdenById}
          />
        ))}
      </StammdatenSektion>

      {/* Sektion: Familie */}
      <StammdatenSektion
        sektionId="familie"
        titleI18nKey="stammdaten.sektion.familie.title"
        fieldCount={
          (stammdaten.familie.partner ? 1 : 0) + stammdaten.familie.kinder.length
        }
        preview={tCta('familie_preview', {
          partner: stammdaten.familie.partner ? '1' : '0',
          kinder: String(stammdaten.familie.kinder.length),
        })}
        aktivitaetslog={
          <UebermittlungsLogList
            entries={filterLog('familie')}
            behoerdenById={behoerdenById}
          />
        }
      >
        {stammdaten.familie.partner && (
          <StammdatenFieldCard
            fieldId="familie_partner"
            labelI18nKey="stammdaten.field.partner.label"
            value={`${stammdaten.familie.partner.vorname} ${stammdaten.familie.partner.nachname} (${formatIsoDe(stammdaten.familie.partner.geburtsdatum)})`}
            editability="read_only"
            quellen={[
              {
                behoerde_id: 'standesamt-berlin-mitte',
                rechtsgrundlage: '§ 21 PStG',
              },
            ]}
            korrekturweg={{
              wizard_slug: undefined,
              pointer_i18n_key: 'stammdaten.korrekturweg.partner.pointer',
              rechtsgrundlage: '§ 21 PStG',
            }}
            behoerdenById={behoerdenById}
          />
        )}
        {stammdaten.familie.kinder.map((k, idx) => (
          <StammdatenFieldCard
            key={`kind-${idx}`}
            fieldId={`familie_kind_${idx}`}
            labelI18nKey="stammdaten.field.kinder.label"
            value={`${k.vorname} ${k.nachname} (${formatIsoDe(k.geburtsdatum)})`}
            editability="read_only"
            quellen={[
              {
                behoerde_id: 'standesamt-berlin-mitte',
                rechtsgrundlage: '§ 21 PStG',
              },
            ]}
            korrekturweg={{
              wizard_slug: undefined,
              pointer_i18n_key: 'stammdaten.korrekturweg.kinder.pointer',
              rechtsgrundlage: '§ 21 PStG',
            }}
            behoerdenById={behoerdenById}
          />
        ))}
        {stammdaten.familie.eheschliessung && (
          <StammdatenFieldCard
            fieldId="familie_ehe"
            labelI18nKey="stammdaten.field.eheschliessung.label"
            value={`${stammdaten.familie.eheschliessung.az} — ${stammdaten.familie.eheschliessung.ort}, ${formatIsoDe(stammdaten.familie.eheschliessung.datum)}`}
            editability="read_only"
            quellen={[
              {
                behoerde_id: 'standesamt-berlin-mitte',
                rechtsgrundlage: '§ 1310 BGB',
              },
            ]}
            korrekturweg={{
              wizard_slug: undefined,
              pointer_i18n_key: 'stammdaten.korrekturweg.eheschliessung.pointer',
              rechtsgrundlage: '§ 1310 BGB',
            }}
            behoerdenById={behoerdenById}
            mockWatermark
          />
        )}
      </StammdatenSektion>

      {/* V1.1 — Sektion: Altersvorsorge (zwischen Familie und Dokumente per Spec § 12). */}
      {altersvorsorgeData && (
        <AltersvorsorgeSektion
          data={altersvorsorgeData}
          behoerdenById={behoerdenById}
        />
      )}

      {/* V1.1 — Sektion: Krankenversicherung & Pflege. */}
      {kvPflegeData && (
        <KvPflegeSektion
          data={kvPflegeData}
          onRequestPflegegradConsent={onOpenPflegegrad}
          onEpaBannerSeen={onEpaBannerSeen}
        />
      )}

      {/* V1.3 — Sektion: Mobilität (zwischen Pflege und Kontakt, Spec § 3.1). */}
      {mobilitaet && (
        <MobilitaetSektion
          data={{
            fahrerlaubnis: mobilitaet.fahrerlaubnis
              ? {
                  fe_nr: mobilitaet.fahrerlaubnis.fe_nr,
                  fe_behoerde_id: mobilitaet.fahrerlaubnis.fe_behoerde_id,
                  bundesland_kennzeichen:
                    mobilitaet.fahrerlaubnis.bundesland_kennzeichen,
                  ausstellungsdatum:
                    mobilitaet.fahrerlaubnis.ausstellungsdatum,
                  fe_aktenzeichen: mobilitaet.fahrerlaubnis.fe_aktenzeichen,
                  klassen: mobilitaet.fahrerlaubnis.klassen,
                  pflichtumtausch_status:
                    mobilitaet.fahrerlaubnis.pflichtumtausch_status,
                  pflichtumtausch_stichtag:
                    mobilitaet.fahrerlaubnis.pflichtumtausch_stichtag,
                  pflichtumtausch_erfolgt_am:
                    mobilitaet.fahrerlaubnis.pflichtumtausch_erfolgt_am,
                }
              : undefined,
            halter: mobilitaet.halter,
            halter_adresse: mobilitaet.halter_adresse,
            show_eat_stufe4_pill: persona.eat_can !== undefined,
          }}
          behoerdenById={behoerdenById}
          onPunktestandPull={async () => {
            const r = await api.getPunktestandOnDemand(persona.id);
            const view: PunkteResultView = {
              punkte: r.punkte,
              abgerufen_am: r.abgerufen_am,
              ttl_seconds: r.ttl_seconds,
              stichtag: r.stichtag,
              aktenzeichen: r.aktenzeichen,
            };
            return view;
          }}
        />
      )}

      {/* Sektion: Dokumente */}
      <StammdatenSektion
        sektionId="dokumente"
        titleI18nKey="stammdaten.sektion.dokumente.title"
        fieldCount={Object.keys(stammdaten.dokumente_refs).length}
        aktivitaetslog={
          <UebermittlungsLogList
            entries={filterLog('dokumente')}
            behoerdenById={behoerdenById}
          />
        }
      >
        {stammdaten.dokumente_refs.personalausweis && (
          <StammdatenFieldCard
            fieldId="personalausweis_nr"
            labelI18nKey="stammdaten.field.personalausweis.label"
            value={`${stammdaten.dokumente_refs.personalausweis.nummer} (${formatIsoDe(stammdaten.dokumente_refs.personalausweis.gueltig_bis)})`}
            editability="read_only"
            quellen={[
              {
                behoerde_id: detectBuergeramtId(behoerdenById, persona),
                rechtsgrundlage: '§ 3 Abs. 1 Nr. 14 BMG',
              },
            ]}
            korrekturweg={{
              wizard_slug: undefined,
              pointer_i18n_key: 'stammdaten.korrekturweg.personalausweis.pointer',
              rechtsgrundlage: '§ 4 PauswG',
            }}
            behoerdenById={behoerdenById}
            mockWatermark
          />
        )}
        {stammdaten.dokumente_refs.eat_can && (
          <StammdatenFieldCard
            fieldId="eat_can"
            labelI18nKey="stammdaten.field.eat_can.label"
            value={stammdaten.dokumente_refs.eat_can}
            editability="read_only"
            art9Relevant
            quellen={[
              {
                behoerde_id: 'abh-koeln',
                rechtsgrundlage: '§ 78 AufenthG',
              },
            ]}
            korrekturweg={{
              wizard_slug: 'abh-termin-buchung',
              pointer_i18n_key: 'stammdaten.korrekturweg.eat_can.pointer',
              rechtsgrundlage: '§ 86 AufenthG',
            }}
            behoerdenById={behoerdenById}
            mockWatermark
          />
        )}
        {stammdaten.dokumente_refs.azr_nr && (
          <StammdatenFieldCard
            fieldId="azr_nr"
            labelI18nKey="stammdaten.field.azr_nr.label"
            value={stammdaten.dokumente_refs.azr_nr}
            editability="read_only"
            art9Relevant
            quellen={[
              {
                behoerde_id: 'bamf',
                rechtsgrundlage: '§ 3 Abs. 1 Nr. 17a BMG',
              },
            ]}
            korrekturweg={{
              wizard_slug: undefined,
              pointer_i18n_key: 'stammdaten.korrekturweg.azr_nr.pointer',
              rechtsgrundlage: '§ 86 AufenthG',
            }}
            behoerdenById={behoerdenById}
            mockWatermark
          />
        )}
      </StammdatenSektion>

      {/* Sektion: Sperren & Einstellungen */}
      <StammdatenSektion
        sektionId="sperren_einstellungen"
        titleI18nKey="stammdaten.sektion.sperren_einstellungen.title"
        fieldCount={4}
        aktivitaetslog={
          <UebermittlungsLogList
            entries={filterLog('sperren_einstellungen')}
            behoerdenById={behoerdenById}
          />
        }
      >
        {/* Religion-Card hidden-by-default. */}
        <StammdatenFieldCard
          fieldId="religion"
          labelI18nKey="stammdaten.field.religionszugehoerigkeit.label"
          value={
            stammdaten.religion.consent.consent_session
              ? tField(`religion.value.${stammdaten.religion.wert ?? 'ohne'}`)
              : undefined
          }
          editability="hidden_by_default"
          hiddenByDefault
          consentVisible={stammdaten.religion.consent.consent_session}
          onRequestConsent={onOpenReligion}
          quellen={[
            {
              behoerde_id: detectBuergeramtId(behoerdenById, persona),
              rechtsgrundlage: '§ 3 Abs. 1 Nr. 11 BMG',
            },
          ]}
          korrekturweg={{
            wizard_slug: 'religion-austritt',
            pointer_i18n_key: 'stammdaten.korrekturweg.religionszugehoerigkeit.pointer',
            rechtsgrundlage: '§ 42 BMG',
          }}
          behoerdenById={behoerdenById}
        />

        {/* Auskunftssperre § 51 Abs. 1 BMG. */}
        <StammdatenFieldCard
          fieldId="auskunftssperre"
          labelI18nKey="stammdaten.field.auskunftssperre.label"
          value={
            stammdaten.sperren.auskunftssperre_aktiv
              ? tField('auskunftssperre.value.aktiv')
              : tField('auskunftssperre.value.inaktiv')
          }
          editability="self_edit_mock_pattern"
          quellen={[
            {
              behoerde_id: detectBuergeramtId(behoerdenById, persona),
              rechtsgrundlage: '§ 51 Abs. 1 BMG',
            },
          ]}
          korrekturweg={{
            wizard_slug: undefined,
            pointer_i18n_key: 'stammdaten.korrekturweg.auskunftssperre.pointer',
            rechtsgrundlage: '§ 51 Abs. 1 BMG',
          }}
          behoerdenById={behoerdenById}
          trailing={
            !stammdaten.sperren.auskunftssperre_aktiv && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="self-start"
                onClick={() => onOpenSperre('auskunftssperre')}
                data-testid="sperre-toggle-auskunftssperre"
              >
                {tCta('sperre_aktivieren')}
              </Button>
            )
          }
        />

        {/* Übermittlungssperre § 42 Abs. 3 BMG (Religionsgesellschaften). */}
        <StammdatenFieldCard
          fieldId="uebermittlungssperre_42_3"
          labelI18nKey="stammdaten.field.uebermittlungssperren.label"
          value={
            stammdaten.sperren.uebermittlungssperren.includes(
              'religionsgesellschaften_42_3',
            )
              ? tField('uebermittlungssperre.value.aktiv')
              : tField('uebermittlungssperre.value.inaktiv')
          }
          editability="self_edit_mock_pattern"
          quellen={[
            {
              behoerde_id: detectBuergeramtId(behoerdenById, persona),
              rechtsgrundlage: '§ 42 Abs. 3 BMG',
            },
          ]}
          korrekturweg={{
            wizard_slug: undefined,
            pointer_i18n_key:
              'stammdaten.korrekturweg.uebermittlungssperren.pointer',
            rechtsgrundlage: '§ 42 Abs. 3 BMG',
          }}
          behoerdenById={behoerdenById}
          trailing={
            !stammdaten.sperren.uebermittlungssperren.includes(
              'religionsgesellschaften_42_3',
            ) && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="self-start"
                onClick={() =>
                  onOpenSperre(
                    'uebermittlungssperre',
                    'religionsgesellschaften_42_3',
                    tField('uebermittlungssperre_42_3.label'),
                  )
                }
                data-testid="sperre-toggle-42-3"
              >
                {tCta('sperre_aktivieren')}
              </Button>
            )
          }
        />

        {/* IBAN — Speculative 2027. */}
        <StammdatenFieldCard
          fieldId="iban_speculative"
          labelI18nKey="stammdaten.field.iban.label"
          value={stammdaten.iban_speculative.iban}
          editability="self_edit_speculative_2027"
          speculative2027
          quellen={[]}
          korrekturweg={{
            wizard_slug: undefined,
            pointer_i18n_key: 'stammdaten.korrekturweg.iban.pointer',
            rechtsgrundlage: '§ 8 OZG',
          }}
          behoerdenById={behoerdenById}
          mockWatermark={Boolean(stammdaten.iban_speculative.iban)}
          trailing={
            stammdaten.iban_speculative.iban && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="self-start"
                data-testid="iban-push-trigger"
                onClick={onOpenIban}
              >
                {tCta('iban_push_trigger')}
              </Button>
            )
          }
        />
      </StammdatenSektion>

      {/* Beschäftigung Read-only-Aggregations-Sicht (Hard-Line § 11.16). */}
      {stammdaten.beschaeftigung_readonly && (
        <section
          aria-labelledby="beschaeftigung-readonly-title"
          className="flex flex-col gap-3 rounded-xl border border-border bg-muted/20 p-4"
          data-testid="beschaeftigung-readonly"
        >
          <h2
            id="beschaeftigung-readonly-title"
            className="text-base font-semibold tracking-tight text-foreground"
          >
            {tPage('beschaeftigung_heading')}
          </h2>
          <p className="text-xs text-muted-foreground">
            {tPage('beschaeftigung_helper')}
          </p>
          <dl className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <ReadonlyEntry
              label={tField('beschaeftigung.typ.label')}
              value={stammdaten.beschaeftigung_readonly.typ}
            />
            {stammdaten.beschaeftigung_readonly.arbeitgeber && (
              <ReadonlyEntry
                label={tField('beschaeftigung.arbeitgeber.label')}
                value={stammdaten.beschaeftigung_readonly.arbeitgeber}
              />
            )}
            {stammdaten.beschaeftigung_readonly.kvnr && (
              <ReadonlyEntry
                label={tField('beschaeftigung.kvnr.label')}
                value={stammdaten.beschaeftigung_readonly.kvnr}
              />
            )}
            {stammdaten.beschaeftigung_readonly.drv_versicherungsnummer && (
              <ReadonlyEntry
                label={tField('beschaeftigung.drv.label')}
                value={stammdaten.beschaeftigung_readonly.drv_versicherungsnummer}
              />
            )}
          </dl>
        </section>
      )}
    </div>
  );
}

function ReadonlyEntry({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col">
      <dt className="text-xs uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd className="text-sm text-foreground">{value}</dd>
    </div>
  );
}

function formatIsoDe(iso: string): string {
  try {
    return format(parseISO(iso), 'dd.MM.yyyy', { locale: deLocale });
  } catch {
    return iso;
  }
}

function formatAdresse(a: {
  strasse: string;
  hausnummer: string;
  plz: string;
  ort: string;
  zusatz?: string;
}): string {
  const zusatz = a.zusatz ? `, ${a.zusatz}` : '';
  return `${a.strasse} ${a.hausnummer}${zusatz}, ${a.plz} ${a.ort}`;
}

function countRegisters(s: Stammdaten): number {
  // Sichtbare Behörden-Quellen aus dem Read-Model — Demo-Heuristik: pro
  // gepflegtem Feld zählen wir die Quellen-Behörde, dedupliziert.
  const ids = new Set<string>();
  if (s.identitaet.steuer_id) ids.add('bzst');
  if (s.dokumente_refs.azr_nr) ids.add('bamf');
  if (s.dokumente_refs.eat_can) ids.add('abh');
  // Bürgeramt zählt durch Anschrift / Identität.
  ids.add('buergeramt');
  // Beitragsservice / Finanzamt / Religion / GKV werden durch das
  // Aktivitätsprotokoll repräsentiert; UI zeigt nur kanonische Anzahl.
  ids.add('finanzamt');
  ids.add('beitragsservice');
  ids.add('gkv');
  return ids.size;
}

function detectBuergeramtId(
  behoerdenById: Record<string, Behoerde>,
  persona: Persona,
): string {
  // Wähle die Behörde-ID, die am ehesten als Meldebehörde zu der Persona
  // passt. Heuristik über die `zustaendige_themen` (meldewesen) — Fallback
  // auf den ersten Treffer; im Demo-Set ist das unkritisch.
  const candidates = Object.values(behoerdenById).filter(
    (b) =>
      b.zustaendige_themen.includes('meldewesen') &&
      b.kategorie === 'kommune',
  );
  if (candidates.length === 0) {
    return Object.values(behoerdenById)[0]?.id ?? 'buergeramt-mitte';
  }
  // Match auf PLZ-Präfix, falls möglich.
  const plz = persona.adresse.plz.slice(0, 2);
  const matched = candidates.find((b) => b.adresse.plz.startsWith(plz));
  return (matched ?? candidates[0]).id;
}

/**
 * Derive `<AltersvorsorgeSektion>` props aus der V1.1-Stammdaten-Sektion +
 * Persona-Familie (Anrechnungszeit Kindererziehung — § 56 SGB VI).
 *
 * `quelle_letter_aktenzeichen` wird über das Mock-Backend nicht direkt
 * geliefert; wir übernehmen den `quelle_letter_id` als Fallback-Stamp,
 * damit der Yellow-Letter-Echo-Card-Stamp nicht leer bleibt.
 */
function deriveAltersvorsorgeData(
  persona: Persona,
  altersvorsorge: NonNullable<Stammdaten['altersvorsorge']>,
  kvPflege: NonNullable<Stammdaten['krankenversicherung_pflege']> | null,
): AltersvorsorgeSektionData {
  const eckdatenView: RentenEckdatenView | undefined = altersvorsorge.eckdaten
    ? {
        grundlage_kurzauszug: altersvorsorge.eckdaten.grundlage_kurzauszug,
        em_rente_prognose_eur_monat:
          altersvorsorge.eckdaten.em_rente_prognose_eur_monat,
        regelalter_prognose_eur_monat:
          altersvorsorge.eckdaten.regelalter_prognose_eur_monat,
        anpassungs_wirkung: altersvorsorge.eckdaten.anpassungs_wirkung,
        beitragsuebersicht: altersvorsorge.eckdaten.beitragsuebersicht,
        stichtag: altersvorsorge.eckdaten.stichtag,
        quelle_letter_id: altersvorsorge.eckdaten.quelle_letter_id,
        quelle_letter_aktenzeichen: altersvorsorge.eckdaten.quelle_letter_id,
        abgelegt_am: altersvorsorge.eckdaten.abgelegt_am,
      }
    : undefined;

  // Anrechnungszeiten: Kindererziehung (§ 56 SGB VI) pro Kind in Persona.familie
  // + Pflege (§ 3 SGB VI) bei Mock-Coupling an Pflegegrad-Modal-Toggle.
  const anrechnungszeiten: AnrechnungszeitEntry[] = [];
  for (const kind of persona.familie?.kinder ?? []) {
    const ageMonths = monthsBetween(kind.geburtsdatum, new Date().toISOString());
    if (ageMonths > 0) {
      anrechnungszeiten.push({
        typ: 'kindererziehung',
        monate: Math.min(36, ageMonths),
        kind_vorname: kind.vorname,
      });
    }
  }
  if (
    persona.anrechnungszeit_pflege_v1_1 &&
    kvPflege?.pflegegrad_consent.consent_session === true
  ) {
    anrechnungszeiten.push({
      typ: 'pflege',
      monate: persona.anrechnungszeit_pflege_v1_1.monate,
      pflegebeduerftige_person:
        persona.anrechnungszeit_pflege_v1_1.pflegebeduerftige_person,
    });
  }

  return {
    track: altersvorsorge.track,
    drv_traeger_id: altersvorsorge.drv_traeger_id,
    eckdaten: eckdatenView,
    versorgungswerk: altersvorsorge.versorgungswerk,
    anrechnungszeiten,
    pflegegradConsentSession:
      kvPflege?.pflegegrad_consent.consent_session ?? false,
  };
}

function deriveKvPflegeData(
  persona: Persona,
  kvPflege: NonNullable<Stammdaten['krankenversicherung_pflege']>,
  behoerdenById: Record<string, Behoerde>,
): KvPflegeSektionData {
  const krankenkasseBehoerde = behoerdenById[String(kvPflege.krankenkasse.id)];

  const familienversicherteSubjects = kvPflege.familienversicherte_personen.map(
    (p) => ({
      vorname: p.vorname,
      nachname: p.nachname,
      familienversichert_bis: p.familienversichert_bis,
      art: p.art,
    }),
  );

  let familienversichert_ueber:
    | { stammversicherte_name: string; bis: string }
    | undefined;
  if (kvPflege.familienversichert_ueber && kvPflege.familienversichert_bis) {
    familienversichert_ueber = {
      stammversicherte_name: String(kvPflege.familienversichert_ueber),
      bis: kvPflege.familienversichert_bis,
    };
  }

  return {
    krankenkasse: {
      name: kvPflege.krankenkasse.name,
      kategorie: krankenkasseBehoerde?.kategorie ?? 'sozialversicherung',
    },
    kvnr_v1_1: kvPflege.kvnr_v1_1,
    kvnr_fallback: persona.krankenversicherung?.versichertennummer,
    versicherten_status: kvPflege.versicherten_status,
    familienversichert_ueber,
    mitversicherte_personen: familienversicherteSubjects,
    epa_status: kvPflege.epa_status,
    erezept_modus: kvPflege.erezept_modus,
    pflegekasse: {
      name: kvPflege.pflegekasse.name,
    },
    pflegegrad_exists: kvPflege.pflegegrad_exists,
    pflegegrad: kvPflege.pflegegrad,
    pflegegrad_consent_session: kvPflege.pflegegrad_consent.consent_session,
  };
}

function monthsBetween(fromIso: string, toIso: string): number {
  try {
    const from = new Date(fromIso);
    const to = new Date(toIso);
    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) return 0;
    const yearDiff = to.getUTCFullYear() - from.getUTCFullYear();
    const monthDiff = to.getUTCMonth() - from.getUTCMonth();
    return Math.max(0, yearDiff * 12 + monthDiff);
  } catch {
    return 0;
  }
}
