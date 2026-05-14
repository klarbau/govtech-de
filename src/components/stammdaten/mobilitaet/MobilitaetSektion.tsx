'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { format, parseISO } from 'date-fns';
import { de as deLocale } from 'date-fns/locale';
import { ChevronDown } from 'lucide-react';

import { wrapNormZitate } from '@/components/posteingang/wrapNormZitate';
import { cn } from '@/lib/utils';
import type { Behoerde } from '@/types';

import {
  FuehrerscheinHauptkarte,
} from './FuehrerscheinHauptkarte';
import {
  FuehrerscheinKlassenList,
  type FeKlasseView,
} from './FuehrerscheinKlassenList';
import {
  PflichtumtauschBanner,
  type PflichtumtauschStatus,
} from './PflichtumtauschBanner';
import { PunktestandOnDemandCard } from './PunktestandOnDemandCard';
import {
  KfzHalterKarte,
  type KfzHalterView,
} from './KfzHalterKarte';
import {
  HalterAdresseFieldCard,
  type HalterAdresseView,
} from './HalterAdresseFieldCard';
import { WalletMdlCrossRefLink } from './WalletMdlCrossRefLink';
import type { PunkteResultView } from './PunkteResultCard';

export interface MobilitaetSektionFahrerlaubnis {
  fe_nr: string;
  fe_behoerde_id?: string;
  /** Bundesland-Buchstabe der FE-Nr (Pos. 1). */
  bundesland_kennzeichen: string;
  ausstellungsdatum: string;
  fe_aktenzeichen: string;
  klassen: FeKlasseView[];
  pflichtumtausch_status: PflichtumtauschStatus;
  pflichtumtausch_stichtag?: string;
  pflichtumtausch_erfolgt_am?: string;
}

export interface MobilitaetSektionData {
  /** undefined = Empty-State „kein FE im Profil" (Lena-Fall). */
  fahrerlaubnis?: MobilitaetSektionFahrerlaubnis;
  halter: Array<
    KfzHalterView & {
      zulassungsstelle_id: string;
    }
  >;
  halter_adresse?: HalterAdresseView;
  /**
   * VL-11 — Mehmet-Hook für eAT-Stufe-4-Pill auf der FuehrerscheinHauptkarte.
   * Default false. UI rendert die Pill nur, wenn die Persona eAT-CAN +
   * `eid_aktiviert` hat (Mehmet).
   */
  show_eat_stufe4_pill?: boolean;
}

interface MobilitaetSektionProps {
  data: MobilitaetSektionData;
  behoerdenById: Record<string, Behoerde>;
  /**
   * Mock-Pull-Funktion vom Mock-Backend für Punktestand-on-demand.
   * Wird in `<PunktestandOnDemandCard>` aufgerufen, wenn der User Consent gibt.
   */
  onPunktestandPull: () => Promise<PunkteResultView>;
  /** Telemetry-Hook für Activity-Log: Korrekturweg-CTA geöffnet. */
  onKorrekturwegFeOpened?: (behoerdeName: string) => void;
  /** Default-collapsed (Sektion-Default-Pattern). */
  defaultOpen?: boolean;
}

/**
 * `<MobilitaetSektion>` (Spec § 3.1 / § 4.1 — Stammdaten V1.3).
 *
 * Container der Mobilitäts-Sektion. Strukturell zwei Gruppen + 1 Cross-Ref:
 *   1. Fahrerlaubnis: Hauptkarte + KlassenList + Pflichtumtausch-Banner +
 *      Punkte-on-demand-Card. Empty-State (Lena): „keine FE im Profil".
 *   2. KFZ-Halter: 0..n Halter-Karten + Halter-Adresse-Card (mit Umzug-
 *      Bridge-Badge).
 *   3. Cross-Ref zum Wallet-Sub-Tab (mDL).
 *
 * Pattern-Konsistenz zum V1 `<StammdatenSektion>`: native `<details>` mit
 * `<h2>`-Header; default-collapsed.
 *
 * a11y: section landmark mit `aria-labelledby`, focus-order folgt Render-Order.
 * Disclaimer-Card als role="region" mit dauerhaft sichtbaren Wegweiser-Texten
 * (HL-MOB-1).
 */
export function MobilitaetSektion({
  data,
  behoerdenById,
  onPunktestandPull,
  onKorrekturwegFeOpened,
  defaultOpen = false,
}: MobilitaetSektionProps) {
  const t = useTranslations('stammdaten.sektion.mobilitaet');
  const tGruppe = useTranslations('stammdaten.mobilitaet.gruppe');
  const tFe = useTranslations('stammdaten.mobilitaet.fe');
  const tHalter = useTranslations('stammdaten.mobilitaet.halter');
  const tDisclaimer = useTranslations('stammdaten.disclaimer');

  const [open, setOpen] = React.useState(defaultOpen);

  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.location.hash === '#mobilitaet') {
      setOpen(true);
      const node = document.getElementById('mobilitaet');
      if (node) node.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, []);

  const titleId = 'sektion-mobilitaet-title';
  const sectionId = 'mobilitaet';

  const feBehoerde =
    data.fahrerlaubnis?.fe_behoerde_id !== undefined
      ? behoerdenById[data.fahrerlaubnis.fe_behoerde_id]
      : undefined;

  const fahrerlaubnisVorhanden = data.fahrerlaubnis !== undefined;

  return (
    <section
      id={sectionId}
      aria-labelledby={titleId}
      className="rounded-xl border border-border bg-card"
      data-testid="sektion-mobilitaet"
    >
      <details
        open={open}
        onToggle={(e) => setOpen((e.currentTarget as HTMLDetailsElement).open)}
        className="group"
      >
        <summary
          className={cn(
            'flex cursor-pointer list-none items-center justify-between gap-4 px-4 py-4 marker:hidden',
            '[&::-webkit-details-marker]:hidden',
            'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring rounded-xl',
          )}
        >
          <div className="flex flex-col gap-0.5">
            <h2
              id={titleId}
              className="text-base font-semibold tracking-tight text-foreground"
            >
              {t('title')}
            </h2>
            {!open && (
              <span
                className="text-xs text-muted-foreground"
                data-testid="mobilitaet-subtitle"
              >
                {buildSubtitlePreview(data, t)}
              </span>
            )}
          </div>
          <ChevronDown
            aria-hidden="true"
            className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180"
          />
        </summary>

        <div className="flex flex-col gap-5 border-t border-border px-4 py-4">
          {/* Disclaimer-Card: Lese-Schicht-Mobilität (HL-MOB-1) */}
          <aside
            role="region"
            aria-label={t('title')}
            className="rounded-lg border border-dashed border-border bg-muted/30 p-3 text-xs leading-relaxed text-muted-foreground"
            data-testid="mobilitaet-disclaimer"
          >
            {wrapNormZitate(tDisclaimer('fuehrerschein_lese_schicht'))}
          </aside>

          {/* Gruppe 1 — Fahrerlaubnis */}
          <section
            aria-labelledby="mobilitaet-gruppe-fe-heading"
            className="flex flex-col gap-3"
          >
            <h3
              id="mobilitaet-gruppe-fe-heading"
              className="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
            >
              {tGruppe('fahrerlaubnis.label')}
            </h3>

            {fahrerlaubnisVorhanden && data.fahrerlaubnis ? (
              <>
                <FuehrerscheinHauptkarte
                  feNr={data.fahrerlaubnis.fe_nr}
                  feBehoerde={feBehoerde}
                  ausstellungsdatum={data.fahrerlaubnis.ausstellungsdatum}
                  feAktenzeichen={data.fahrerlaubnis.fe_aktenzeichen}
                  showEatStufe4Pill={data.show_eat_stufe4_pill}
                  onKorrekturwegOpened={onKorrekturwegFeOpened}
                />
                <FuehrerscheinKlassenList
                  klassen={data.fahrerlaubnis.klassen}
                />
                <PflichtumtauschBanner
                  status={data.fahrerlaubnis.pflichtumtausch_status}
                  stichtag={data.fahrerlaubnis.pflichtumtausch_stichtag}
                  erfolgtAm={data.fahrerlaubnis.pflichtumtausch_erfolgt_am}
                  feBehoerdeName={feBehoerde?.name_de ?? ''}
                />
                <PunktestandOnDemandCard onPull={onPunktestandPull} />
              </>
            ) : (
              <article
                className="rounded-xl border border-dashed border-border bg-muted/30 p-4"
                data-testid="fe-empty-state"
              >
                <h4 className="text-sm font-semibold text-foreground">
                  {tFe('empty_state.title')}
                </h4>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  {wrapNormZitate(
                    tFe('empty_state.body', {
                      fe_behoerde_default_name:
                        feBehoerde?.name_de ?? '—',
                    }),
                  )}
                </p>
                {/* Punkte-CTA disabled mit Tooltip-Hinweis (Lena-Fall). */}
                <div className="mt-3">
                  <PunktestandOnDemandCard
                    onPull={onPunktestandPull}
                    disabledNoFe
                  />
                </div>
              </article>
            )}
          </section>

          {/* Gruppe 2 — KFZ-Halter */}
          <section
            aria-labelledby="mobilitaet-gruppe-halter-heading"
            className="flex flex-col gap-3"
          >
            <h3
              id="mobilitaet-gruppe-halter-heading"
              className="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
            >
              {tGruppe('halter.label')}
            </h3>

            {data.halter.length === 0 ? (
              <article
                className="rounded-xl border border-dashed border-border bg-muted/30 p-4"
                data-testid="halter-empty-state"
              >
                <h4 className="text-sm font-semibold text-foreground">
                  {tHalter('empty_state.title')}
                </h4>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  {wrapNormZitate(tHalter('empty_state.body'))}
                </p>
              </article>
            ) : (
              <>
                {data.halter.map((h, idx) => (
                  <KfzHalterKarte
                    key={h.kennzeichen}
                    halter={h}
                    zulassungsstelle={behoerdenById[h.zulassungsstelle_id]}
                    cardIndex={idx}
                  />
                ))}
                {data.halter_adresse && (
                  <HalterAdresseFieldCard adresse={data.halter_adresse} />
                )}
              </>
            )}
          </section>

          {/* Gruppe 3 — Cross-Ref zum Wallet-Sub-Tab mDL */}
          <section
            aria-labelledby="mobilitaet-gruppe-wallet-heading"
            className="flex flex-col gap-3"
          >
            <h3
              id="mobilitaet-gruppe-wallet-heading"
              className="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
            >
              {tGruppe('wallet_cross_ref.label')}
            </h3>
            <WalletMdlCrossRefLink />
          </section>
        </div>
      </details>
    </section>
  );
}

/**
 * Buildet die persona-spezifische Subtitle-Preview für den collapsed-State.
 *
 * Cases:
 *   - keine FE          → „Keine Fahrerlaubnis registriert"
 *   - FE + Pflichtumtausch frist_aktiv → „Klasse {…} — Pflichtumtausch bis {Stichtag}"
 *   - FE + Halter       → „Klasse {…} · {n} Fahrzeuge als Halter"
 *   - FE allein         → „Klasse {…} · Punktestand on-demand"
 */
function buildSubtitlePreview(
  data: MobilitaetSektionData,
  t: ReturnType<typeof useTranslations>,
): string {
  if (!data.fahrerlaubnis) {
    return safeT(t, 'preview_no_fe');
  }
  const klassen = data.fahrerlaubnis.klassen.map((k) => k.klasse).join(' + ');
  const isPflichtumtauschAktiv =
    data.fahrerlaubnis.pflichtumtausch_status === 'frist_aktiv' &&
    data.fahrerlaubnis.pflichtumtausch_stichtag;

  if (isPflichtumtauschAktiv && data.fahrerlaubnis.pflichtumtausch_stichtag) {
    const stichtag = formatStichtag(
      data.fahrerlaubnis.pflichtumtausch_stichtag,
    );
    return safeT(t, 'preview_fe_with_pflichtumtausch', {
      klassen,
      stichtag,
    });
  }

  if (data.halter.length > 0) {
    const halterText = safeT(t, 'preview_halter_count', {
      count: data.halter.length,
    });
    return `${safeT(t, 'preview_fe_classes', { klassen })} · ${halterText}`;
  }

  return safeT(t, 'preview_fe_only', { klassen });
}

function safeT(
  t: ReturnType<typeof useTranslations>,
  key: string,
  values?: Record<string, string | number>,
): string {
  try {
    return values === undefined ? t(key) : t(key, values);
  } catch {
    return key;
  }
}

function formatStichtag(iso: string): string {
  try {
    return format(parseISO(iso), 'dd.MM.yyyy', { locale: deLocale });
  } catch {
    return iso;
  }
}
