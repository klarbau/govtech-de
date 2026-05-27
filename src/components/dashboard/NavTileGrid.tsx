'use client';

import { useTranslations } from 'next-intl';
import { format, parseISO } from 'date-fns';
import { de as deLocale } from 'date-fns/locale';
import {
  CalendarClock,
  CalendarDays,
  FolderKanban,
  IdCard,
  Inbox,
  ShieldCheck,
} from 'lucide-react';

import { NavTile } from './NavTile';
import type { DashboardSnapshot } from '@/types';

interface NavTileGridProps {
  snapshot: DashboardSnapshot;
}

function formatDate(iso: string): string {
  return format(parseISO(iso), 'dd.MM.yyyy', { locale: deLocale });
}

/**
 * Die sechs Navigations-Kacheln in verbindlicher Prototyp-Reihenfolge
 * (Fristen, Posteingang, Vorgänge, Termine, Datenschutz-Cockpit,
 * Stammdaten-Status). Jede Kachel zieht ihren Live-Wert aus dem Snapshot und
 * verlinkt in die zuständige Capability.
 */
export function NavTileGrid({ snapshot }: NavTileGridProps) {
  const t = useTranslations('dashboard.tile');

  const naechsteFrist = snapshot.frist_tile[0]?.frist_datum;
  const laufendeVorgaenge = snapshot.vorgangs_stand_tile.length;
  const naechsterTermin = snapshot.termin_tile?.datum_iso;
  const dscActivity = snapshot.dsc_tile.app_activity;
  const dscSumme =
    dscActivity.briefe_geoeffnet +
    dscActivity.ki_zusammenfassungen_erstellt +
    dscActivity.ai_uebermittlungen +
    dscActivity.stammdaten_aktivitaeten;
  const stammdatenBestaetigt =
    snapshot.stammdaten_tile.letzte_bestaetigung_durch_buerger;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <NavTile
        id="fristen"
        icon={<CalendarClock />}
        title={t('fristen.title')}
        value={
          naechsteFrist ? (
            <span className="tabular-nums">
              {t('fristen.next', { datum: formatDate(naechsteFrist) })}
            </span>
          ) : (
            t('fristen.none')
          )
        }
        ctaLabel={t('cta_ansehen')}
        href="/posteingang"
      />

      <NavTile
        id="posteingang"
        icon={<Inbox />}
        title={t('posteingang.title')}
        value={
          <span className="tabular-nums">
            {t('posteingang.value', {
              ungelesen: snapshot.posteingang_tile.ungelesen,
              gesamt: snapshot.posteingang_tile.gesamt,
            })}
          </span>
        }
        ctaLabel={t('cta_oeffnen')}
        href="/posteingang"
      />

      <NavTile
        id="vorgaenge"
        icon={<FolderKanban />}
        title={t('vorgaenge.title')}
        value={
          <span className="tabular-nums">
            {t('vorgaenge.value', { laufend: laufendeVorgaenge })}
          </span>
        }
        ctaLabel={t('cta_ansehen')}
        href="/vorgaenge"
      />

      <NavTile
        id="termine"
        icon={<CalendarDays />}
        title={t('termine.title')}
        value={
          naechsterTermin ? (
            <span className="tabular-nums">
              {t('termine.next', { datum: formatDate(naechsterTermin) })}
            </span>
          ) : (
            t('termine.none')
          )
        }
        ctaLabel={t('cta_ansehen')}
        href="/termine"
      />

      <NavTile
        id="datenschutz"
        icon={<ShieldCheck />}
        title={t('datenschutz.title')}
        value={
          <span className="tabular-nums">
            {t('datenschutz.value', { count: dscSumme })}
          </span>
        }
        ctaLabel={t('cta_ansehen')}
        href="/datenschutz"
      />

      <NavTile
        id="stammdaten"
        icon={<IdCard />}
        title={t('stammdaten.title')}
        value={
          stammdatenBestaetigt ? (
            <span className="tabular-nums">
              {t('stammdaten.last_confirmed', {
                datum: formatDate(stammdatenBestaetigt),
              })}
            </span>
          ) : (
            t('stammdaten.value')
          )
        }
        ctaLabel={t('cta_ansehen')}
        href="/stammdaten"
      />
    </div>
  );
}
