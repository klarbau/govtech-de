'use client';

import * as React from 'react';
import {
  ArrowRight,
  Briefcase,
  ChevronRight,
  Clock,
  Download,
  Eye,
  FileText,
  HelpCircle,
  Info,
  Landmark,
  Lock,
  MapPin,
  RefreshCw,
  ScrollText,
  Settings,
  Shield,
  ShieldCheck,
  User,
  Users,
} from 'lucide-react';

import Link from 'next/link';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/shared/Skeleton';
import { ZukunftChip } from '@/components/shared/ZukunftChip';
import { resolveBehoerdeName } from '@/lib/behoerde-name';
import { api } from '@/lib/mock-backend';
import { formatDateDe } from '@/lib/utils';
import { useTranslations } from 'next-intl';
import type {
  Behoerde,
  DatenquellenEintrag,
  DatenschutzEinwilligung,
  EinwilligungEmpfaenger,
  PersonaId,
  UebermittlungsLogEntry,
} from '@/types';

interface DatenschutzViewProps {
  nowIso: string;
}

function formatActivityWhen(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${day}.${month}.${d.getFullYear()}, ${hh}:${mm}`;
}

function isWithinDays(iso: string, days: number, now: number): boolean {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return false;
  return now - t <= days * 24 * 60 * 60 * 1000;
}

function activityBadgeFor(
  kategorie: UebermittlungsLogEntry['kategorie'],
): { cls: string; labelKey: string } {
  switch (kategorie) {
    case 'behoerde_zu_behoerde':
      return { cls: 'green', labelKey: 'uebermittlung' };
    case 'speculative_2027':
      return { cls: 'brand', labelKey: 'vision' };
    case 'behoerde_zu_buerger':
      return { cls: 'brand', labelKey: 'eingang' };
    case 'app_aktivitaet':
    default:
      return { cls: 'brand', labelKey: 'app' };
  }
}

const EMPFAENGER_ORDER: EinwilligungEmpfaenger[] = [
  'krankenkasse',
  'arbeitgeber',
  'familienkasse',
  'private',
];

const EMPFAENGER_ICON: Record<
  EinwilligungEmpfaenger,
  React.ComponentType<{ 'aria-hidden'?: boolean | 'true' | 'false' }>
> = {
  krankenkasse: Landmark,
  arbeitgeber: Briefcase,
  familienkasse: Users,
  private: User,
};

export function DatenschutzView({ nowIso }: DatenschutzViewProps) {
  const t = useTranslations();
  const [personaId, setPersonaId] = React.useState<PersonaId | null>(null);
  const [loaded, setLoaded] = React.useState(false);
  const [activities, setActivities] = React.useState<UebermittlungsLogEntry[]>([]);
  const [behoerdenById, setBehoerdenById] = React.useState<Record<string, Behoerde>>({});
  const [einwilligungen, setEinwilligungen] = React.useState<DatenschutzEinwilligung[]>([]);
  const [quellen, setQuellen] = React.useState<DatenquellenEintrag[]>([]);
  // [ZUKUNFT 2027] Aktualitäts-Hinweis: nur für Personas mit abgeschlossenem
  // Umzug (aus eigener Vorgangs-Historie ableitbar — kein Live-Registerabgleich).
  const [letzteUmmeldung, setLetzteUmmeldung] = React.useState<string | null>(null);
  const [hatAufenthaltstitel, setHatAufenthaltstitel] = React.useState(false);

  const [logDialogOpen, setLogDialogOpen] = React.useState(false);
  const [histDialogOpen, setHistDialogOpen] = React.useState(false);
  const [fullLog, setFullLog] = React.useState<UebermittlungsLogEntry[] | null>(null);
  const [exportState, setExportState] = React.useState<'idle' | 'busy' | 'done'>('idle');
  const [liveAnnouncement, setLiveAnnouncement] = React.useState('');

  const weitergabeRef = React.useRef<HTMLElement | null>(null);
  const consentHeadingRef = React.useRef<HTMLHeadingElement | null>(null);

  void nowIso;

  React.useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const profile = await api.getProfile();
        const [log, behoerden, einw, qs, umzugFinished] = await Promise.all([
          api.getUebermittlungsLog(profile.id, { limit: 8 }),
          api.getBehoerden(),
          api.getDatenschutzEinwilligungen(profile.id),
          api.getDatenquellen(profile.id),
          api.getUmzugVorgaengeFinished(profile.id),
        ]);
        if (cancelled) return;
        setPersonaId(profile.id);
        setActivities(log);
        setBehoerdenById(Object.fromEntries(behoerden.map((b) => [b.id, b])));
        setEinwilligungen(einw);
        setQuellen(qs);
        const letzterUmzug = umzugFinished
          .map((u) => u.abgeschlossen_am)
          .filter((d): d is string => Boolean(d))
          .sort()
          .at(-1);
        setLetzteUmmeldung(letzterUmzug ?? null);
        setHatAufenthaltstitel(Boolean(profile.aufenthaltstitel));
      } catch {
        if (!cancelled) setActivities([]);
      } finally {
        if (!cancelled) setLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleToggle = React.useCallback(
    async (empfaenger: EinwilligungEmpfaenger, next: boolean) => {
      if (!personaId) return;
      setEinwilligungen((prev) =>
        prev.map((e) =>
          e.empfaenger === empfaenger ? { ...e, erteilt: next } : e,
        ),
      );
      const empfLabel = t(`datenschutz.einwilligungen.${empfaenger}`);
      try {
        await api.setDatenschutzEinwilligung(personaId, empfaenger, next);
        setLiveAnnouncement(
          t(
            next
              ? 'datenschutz.einwilligungen.announce_ein'
              : 'datenschutz.einwilligungen.announce_aus',
            { empfaenger: empfLabel },
          ),
        );
        try {
          const log = await api.getUebermittlungsLog(personaId, { limit: 8 });
          setActivities(log);
        } catch {
          /* the optimistic toggle already reflects the new state */
        }
      } catch {
        setEinwilligungen((prev) =>
          prev.map((e) =>
            e.empfaenger === empfaenger ? { ...e, erteilt: !next } : e,
          ),
        );
      }
    },
    [personaId, t],
  );

  const openLogDialog = React.useCallback(() => {
    setLogDialogOpen(true);
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

  const scrollToWeitergabe = React.useCallback(() => {
    const node = weitergabeRef.current;
    if (!node) return;
    node.scrollIntoView({ behavior: 'smooth', block: 'start' });
    const firstToggle = node.querySelector<HTMLElement>('[role="switch"]');
    firstToggle?.focus({ preventScroll: true });
  }, []);

  const handleExport = React.useCallback(() => {
    if (!personaId) return;
    setExportState('busy');
    const summary = {
      hinweis: t('datenschutz.export.hinweis'),
      erstellt_am: new Date().toISOString(),
      persona_id: personaId,
      einwilligungen: einwilligungen.map((e) => ({
        empfaenger: e.empfaenger,
        erteilt: e.erteilt,
        rechtsgrundlage: e.rechtsgrundlage,
        geaendert_am: e.geaendert_am ?? null,
      })),
      datenquellen: quellen.map((q) => ({
        stelle: behoerdenById[q.behoerde_id]?.name_de ?? q.behoerde_id,
        zugriffsart: q.zugriffsart,
        rechtsgrundlage: q.rechtsgrundlage,
        aktualitaet: q.aktualitaet,
      })),
      letzte_aktivitaeten: activities.map((a) => ({
        zeitpunkt: a.timestamp,
        kategorie: a.kategorie,
        zweck: a.zweck_i18n_key,
        rechtsgrundlage: a.rechtsgrundlage,
      })),
    };
    const blob = new Blob([JSON.stringify(summary, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `MOCK-datenexport-${personaId}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setExportState('done');
    window.setTimeout(() => setExportState('idle'), 2500);
  }, [activities, behoerdenById, einwilligungen, personaId, quellen, t]);

  const consentHistory = (fullLog ?? activities).filter(
    (e) => e.field_id === 'datenschutz_einwilligung',
  );

  const activityTitle = React.useCallback(
    (entry: UebermittlungsLogEntry): string =>
      t.has(entry.zweck_i18n_key)
        ? t(entry.zweck_i18n_key)
        : entry.zweck_i18n_key.split('.').pop() ??
          t('datenschutz.activity.fallback'),
    [t],
  );

  const activityEmpfaenger = React.useCallback(
    (entry: UebermittlungsLogEntry): string | undefined =>
      entry.absender_behoerde_id
        ? behoerdenById[entry.absender_behoerde_id]?.name_de ??
          resolveBehoerdeName(entry.absender_behoerde_id)
        : entry.empfaenger_id
          ? t.has(`datenschutz.einwilligungen.${entry.empfaenger_id}`)
            ? t(`datenschutz.einwilligungen.${entry.empfaenger_id}`)
            : behoerdenById[entry.empfaenger_id]?.name_de ??
              resolveBehoerdeName(entry.empfaenger_id)
          : undefined,
    [behoerdenById, t],
  );

  const renderLogRow = React.useCallback(
    (entry: UebermittlungsLogEntry) => {
      const senderName = activityEmpfaenger(entry);
      const badge = activityBadgeFor(entry.kategorie);
      const title = activityTitle(entry);
      return (
        <div key={entry.id} className="item">
          <span className="icon-circle">
            <Shield aria-hidden="true" />
          </span>
          <div>
            <div className="t">{title}</div>
            <div className="s">{senderName ?? entry.rechtsgrundlage}</div>
          </div>
          <div className="meta">
            <div className="when">{formatActivityWhen(entry.timestamp)}</div>
            <span className={`badge ${badge.cls}`}>
              {t(`datenschutz.activity.typ.${badge.labelKey}`)}
            </span>
          </div>
        </div>
      );
    },
    [activityEmpfaenger, activityTitle, t],
  );

  const sortedEinw = EMPFAENGER_ORDER.map((emp) =>
    einwilligungen.find((e) => e.empfaenger === emp),
  ).filter((e): e is DatenschutzEinwilligung => Boolean(e));

  const activeCount = einwilligungen.filter((e) => e.erteilt).length;
  const totalCount = einwilligungen.length || EMPFAENGER_ORDER.length;

  const nowMs = Date.now();
  const anfragenCount = activities.filter((a) =>
    isWithinDays(a.timestamp, 30, nowMs),
  ).length;
  const letzteAktivitaet =
    activities.length > 0
      ? formatActivityWhen(activities[0].timestamp)
      : t('datenschutz.stats.letzte_empty');

  // Compact "Letzte Aktivitäten" timeline — the heading + <ul> the a11y spec
  // pins (toggling a consent surfaces "Einwilligung geändert" at the top).
  const activityRows = activities.slice(0, 5).map((entry) => ({
    id: entry.id,
    title: activityTitle(entry),
    sub: activityEmpfaenger(entry) ?? entry.rechtsgrundlage,
    when: formatActivityWhen(entry.timestamp),
    badge: activityBadgeFor(entry.kategorie),
  }));

  // Audit-Log rows (full table view of the transmission log).
  const auditRows = activities.slice(0, 6);

  if (!loaded) {
    return <DatenschutzSkeleton />;
  }

  return (
    <>
      <div className="gt-page-head ds2-head">
        <h1>{t('datenschutz.page.title')}</h1>
        <div className="sub">{t('datenschutz.page.subtitle')}</div>
        <span className="gt-page-tag">{t('datenschutz.page.tag')}</span>
      </div>

      <div aria-live="polite" role="status" className="sr-only">
        {liveAnnouncement}
      </div>

      {/* Kennzahlen — editorial rows: value + label on one line, hairline
          separators, no boxes, no icons (docs/research/ai-design-tells.md §1). */}
      <div
        className="ds2-kennzahlen mt-[18px] flex flex-col divide-y divide-border border-y border-border sm:flex-row sm:divide-x sm:divide-y-0"
        role="group"
        aria-label={t('datenschutz.stats.strip_label')}
        tabIndex={0}
      >
        <div className="flex flex-col justify-center gap-1 py-4 sm:flex-1 sm:py-3 sm:pr-6">
          <p className="flex flex-wrap items-baseline gap-x-2">
            <span className="text-2xl font-semibold leading-tight tabular-nums text-text-primary">
              {t('datenschutz.stats.aktiv_value', {
                active: activeCount,
                total: totalCount,
              })}
            </span>
            <span className="text-sm font-medium text-text-secondary">
              {t('datenschutz.stats.aktiv_title')}
            </span>
          </p>
          <p className="text-xs leading-relaxed text-text-secondary">
            {t('datenschutz.stats.aktiv_sub')}
          </p>
        </div>
        <div className="flex flex-col justify-center gap-1 py-4 sm:flex-1 sm:px-6 sm:py-3">
          <p className="flex flex-wrap items-baseline gap-x-2">
            <span className="text-2xl font-semibold leading-tight tabular-nums text-text-primary">
              {anfragenCount}
            </span>
            <span className="text-sm font-medium text-text-secondary">
              {t('datenschutz.stats.anfragen_title')}
            </span>
          </p>
          <p className="text-xs leading-relaxed text-text-secondary">
            {t('datenschutz.stats.anfragen_sub')}
          </p>
        </div>
        <div className="flex flex-col justify-center gap-1 py-4 sm:flex-1 sm:px-6 sm:py-3">
          <p className="flex flex-wrap items-baseline gap-x-2">
            <span className="text-2xl font-semibold leading-tight tabular-nums text-text-primary">
              {letzteAktivitaet}
            </span>
            <span className="text-sm font-medium text-text-secondary">
              {t('datenschutz.stats.letzte_title')}
            </span>
          </p>
          <p className="text-xs leading-relaxed text-text-secondary">
            {t('datenschutz.stats.letzte_sub')}
          </p>
        </div>
      </div>

      <div className="ds2-layout">
        <div className="ds2-main">
          {/* Einwilligungen für Datenweitergabe */}
          <section className="gt-card ds2-consent" ref={weitergabeRef}>
            <div className="ds2-section-head">
              <h2 ref={consentHeadingRef} tabIndex={-1} className="ds2-heading-focus">
                <Shield aria-hidden="true" />
                {t('datenschutz.weitergabe.title')}
              </h2>
              <p className="sub">{t('datenschutz.weitergabe.subtitle')}</p>
            </div>

            <div className="ds2-consent-scroll" role="region" tabIndex={0} aria-label={t('datenschutz.weitergabe.title')}>
              <table className="ds2-consent-table">
                <thead>
                  <tr>
                    <th scope="col">{t('datenschutz.weitergabe.col_empfaenger')}</th>
                    <th scope="col">{t('datenschutz.weitergabe.col_zweck')}</th>
                    <th scope="col">{t('datenschutz.weitergabe.col_kategorien')}</th>
                    <th scope="col">{t('datenschutz.weitergabe.col_status')}</th>
                    <th scope="col">{t('datenschutz.weitergabe.col_einwilligung')}</th>
                    <th scope="col">
                      <span className="sr-only">{t('datenschutz.weitergabe.col_details')}</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sortedEinw.map((e) => {
                    const empfLabel = t(`datenschutz.einwilligungen.${e.empfaenger}`);
                    const empfKat = t(`datenschutz.einwilligungen.${e.empfaenger}_sub`);
                    const EmpfIcon = EMPFAENGER_ICON[e.empfaenger] ?? Shield;
                    return (
                      <tr key={e.empfaenger}>
                        <td>
                          <div className="ds2-empf">
                            <span className="icon-circle">
                              <EmpfIcon aria-hidden="true" />
                            </span>
                            <div className="ds2-empf-text">
                              <span className="ds2-empf-name">{empfLabel}</span>
                              <span className="ds2-empf-kat">{empfKat}</span>
                            </div>
                          </div>
                        </td>
                        <td className="ds2-zweck">
                          {t(`datenschutz.weitergabe.${e.empfaenger}_zweck`)}
                        </td>
                        <td className="ds2-kat">
                          {t(`datenschutz.weitergabe.${e.empfaenger}_kategorien`)}
                        </td>
                        <td>
                          <span className={`badge ${e.erteilt ? 'green' : 'outline'}`}>
                            <span className="dot" aria-hidden="true" />
                            {e.erteilt
                              ? t('datenschutz.weitergabe.status_aktiv')
                              : t('datenschutz.weitergabe.status_inaktiv')}
                          </span>
                        </td>
                        <td>
                          <button
                            type="button"
                            className={`toggle${e.erteilt ? ' on' : ''}`}
                            role="switch"
                            aria-checked={e.erteilt}
                            aria-label={t(
                              e.erteilt
                                ? 'datenschutz.einwilligungen.toggle_aus'
                                : 'datenschutz.einwilligungen.toggle_ein',
                              { empfaenger: empfLabel },
                            )}
                            onClick={() => void handleToggle(e.empfaenger, !e.erteilt)}
                          />
                        </td>
                        <td>
                          <ChevronRight className="ds2-chev" aria-hidden="true" />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="ds2-consent-foot">
              <p className="ds2-note">
                <Info aria-hidden="true" />
                {t('datenschutz.weitergabe.widerruf_note')}
              </p>
              <button type="button" className="ds2-link" onClick={() => setHistDialogOpen(true)}>
                {t('datenschutz.einwilligungen.historie_anzeigen')}
                <ChevronRight aria-hidden="true" />
              </button>
            </div>
          </section>

          {/* [ZUKUNFT 2027] Aktualität der Datenquellen — Fold-in. Rendert nur,
              wenn aus der eigenen Vorgangs-Historie ein abgeschlossener Umzug
              ableitbar ist (kein Live-Registerabgleich, keine fremde „alte
              Adresse"). Amtswegige Selbstkorrektur (§ 6 BMG / § 6 IDNrG); die
              eID-gegatete Ausländerbehörde (§ 18 PAuswG) ist der ehrliche
              Anker — sie wird bewusst NICHT auto-gepusht. */}
          {letzteUmmeldung && (
            <section
              className="gt-card"
              aria-labelledby="ds-aktualitaet-heading"
            >
              <div className="flex flex-col gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <RefreshCw
                    className="size-4 shrink-0 text-muted-foreground"
                    aria-hidden="true"
                  />
                  <h2
                    id="ds-aktualitaet-heading"
                    className="text-sm font-semibold tracking-tight text-foreground"
                  >
                    {t('datenschutz.quellen.aktualitaet_note.title')}
                  </h2>
                  <ZukunftChip
                    label={t('datenschutz.quellen.aktualitaet_note.zukunft_chip')}
                  />
                </div>
                <p className="text-[13px] leading-relaxed text-muted-foreground">
                  {t('datenschutz.quellen.aktualitaet_note.amtswegig')}
                </p>
                <p className="text-[13px] leading-relaxed text-muted-foreground">
                  {t('datenschutz.quellen.aktualitaet_note.detektion', {
                    datum: formatDateDe(letzteUmmeldung),
                  })}
                </p>
                {hatAufenthaltstitel && (
                  <p className="text-[13px] leading-relaxed text-muted-foreground">
                    {t('datenschutz.quellen.aktualitaet_note.abh')}
                  </p>
                )}
                <p className="border-t border-dashed border-border pt-2 text-[11px] leading-relaxed text-muted-foreground">
                  {t('datenschutz.quellen.aktualitaet_note.rechtsgrundlage')}
                </p>
                <Link
                  href="/stammdaten"
                  className="inline-flex w-fit items-center gap-1 text-[13px] font-medium text-primary underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                >
                  {t('datenschutz.quellen.aktualitaet_note.korrekturweg_link')}
                  <ChevronRight className="size-4" aria-hidden="true" />
                </Link>
              </div>
            </section>
          )}

          {/* Compact recent-activity timeline. The heading + <ul> must share
              their nearest div/section/article container (a11y spec asserts the
              timeline card holds a `ul > li`), so no inner wrapper here. */}
          <section className="gt-card ds2-recent act">
            <h2 className="ds2-recent-heading">
              <Clock aria-hidden="true" />
              {t('datenschutz.aktivitaet.title')}
            </h2>
            {activityRows.length === 0 ? (
              <p className="ds2-empty">{t('datenschutz.aktivitaet.empty')}</p>
            ) : (
              <ul className="act-list">
                {activityRows.map((row) => (
                  <li key={row.id} className="item">
                    <span className="icon-circle">
                      <Shield aria-hidden="true" />
                    </span>
                    <div>
                      <div className="t">{row.title}</div>
                      <div className="s">{row.sub}</div>
                    </div>
                    <div className="meta">
                      <div className="when">{row.when}</div>
                      <span className={`badge ${row.badge.cls}`}>
                        {t(`datenschutz.activity.typ.${row.badge.labelKey}`)}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            <button type="button" className="ds2-link" onClick={openLogDialog}>
              {t('datenschutz.aktivitaet.show_all')}
              <ChevronRight aria-hidden="true" />
            </button>
          </section>

          {/* Audit-Log table */}
          <section className="gt-card ds2-audit">
            <div className="ds2-section-head">
              <h2>
                <ScrollText aria-hidden="true" />
                {t('datenschutz.audit.title')}
              </h2>
              <p className="sub">{t('datenschutz.audit.subtitle')}</p>
            </div>
            <div className="ds2-audit-scroll" role="region" tabIndex={0} aria-label={t('datenschutz.audit.title')}>
              <table className="ds2-audit-table">
                <thead>
                  <tr>
                    <th scope="col">{t('datenschutz.audit.col_zeitpunkt')}</th>
                    <th scope="col">{t('datenschutz.audit.col_ereignis')}</th>
                    <th scope="col">{t('datenschutz.audit.col_empfaenger')}</th>
                    <th scope="col">{t('datenschutz.audit.col_rechtsgrundlage')}</th>
                    <th scope="col">{t('datenschutz.audit.col_details')}</th>
                  </tr>
                </thead>
                <tbody>
                  {auditRows.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="ds2-empty">
                        {t('datenschutz.audit.empty')}
                      </td>
                    </tr>
                  ) : (
                    auditRows.map((entry) => {
                      const title = activityTitle(entry);
                      return (
                        <tr key={entry.id}>
                          <td className="ds2-when">{formatActivityWhen(entry.timestamp)}</td>
                          <td className="ds2-ereignis">{title}</td>
                          <td className="ds2-empf-col">
                            {activityEmpfaenger(entry) ??
                              t('datenschutz.audit.empfaenger_fallback')}
                          </td>
                          <td className="ds2-grund">{entry.rechtsgrundlage}</td>
                          <td>
                            <button
                              type="button"
                              className="ds2-detail-link"
                              onClick={openLogDialog}
                              aria-label={t('datenschutz.audit.details_aria', {
                                ereignis: title,
                              })}
                            >
                              <FileText aria-hidden="true" />
                              {t('datenschutz.audit.details_ansehen')}
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
            <div className="ds2-audit-foot">
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={handleExport}
                disabled={!personaId || exportState === 'busy'}
                aria-disabled={!personaId || exportState === 'busy'}
              >
                <Download aria-hidden="true" />
                {exportState === 'done'
                  ? t('datenschutz.kontrolle.export_bereit')
                  : t('datenschutz.kontrolle.datenexport')}
              </button>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={scrollToWeitergabe}
              >
                <Settings aria-hidden="true" />
                {t('datenschutz.kontrolle.einstellungen')}
              </button>
            </div>
          </section>
        </div>

        {/* Right rail — Vertrauen durch Prinzipien */}
        <aside className="ds2-rail" aria-label={t('datenschutz.rail.title')}>
          <section className="gt-card ds2-rail-card">
            <h2 className="ds2-rail-title">{t('datenschutz.rail.title')}</h2>
            <p className="ds2-rail-sub">{t('datenschutz.rail.subtitle')}</p>
            <ul className="ds2-principles">
              <li>
                <span className="icon-circle green">
                  <ShieldCheck aria-hidden="true" />
                </span>
                <div>
                  <div className="ds2-principle-title">
                    {t('datenschutz.rail.principle_1_title')}
                  </div>
                  <p className="ds2-principle-body">
                    {t('datenschutz.rail.principle_1_body')}
                  </p>
                  <button
                    type="button"
                    className="ds2-principle-link"
                    onClick={scrollToWeitergabe}
                  >
                    {t('datenschutz.rail.principle_1_link')}
                    <ArrowRight aria-hidden="true" />
                  </button>
                </div>
              </li>
              <li>
                <span className="icon-circle">
                  <Lock aria-hidden="true" />
                </span>
                <div>
                  <div className="ds2-principle-title">
                    {t('datenschutz.rail.principle_2_title')}
                  </div>
                  <p className="ds2-principle-body">
                    {t('datenschutz.rail.principle_2_body')}
                  </p>
                  <button
                    type="button"
                    className="ds2-principle-link"
                    onClick={scrollToWeitergabe}
                  >
                    {t('datenschutz.rail.principle_2_link')}
                    <ArrowRight aria-hidden="true" />
                  </button>
                </div>
              </li>
              <li>
                <span className="icon-circle">
                  <Eye aria-hidden="true" />
                </span>
                <div>
                  <div className="ds2-principle-title">
                    {t('datenschutz.rail.principle_3_title')}
                  </div>
                  <p className="ds2-principle-body">
                    {t('datenschutz.rail.principle_3_body')}
                  </p>
                  <button
                    type="button"
                    className="ds2-principle-link"
                    onClick={openLogDialog}
                  >
                    {t('datenschutz.rail.principle_3_link')}
                    <ArrowRight aria-hidden="true" />
                  </button>
                </div>
              </li>
            </ul>
          </section>

          <section className="gt-card ds2-faq">
            <span className="icon-circle">
              <HelpCircle aria-hidden="true" />
            </span>
            <div>
              <h2 className="ds2-faq-title">{t('datenschutz.faq.title')}</h2>
              <p className="ds2-faq-body">{t('datenschutz.faq.body')}</p>
              <button type="button" className="ds2-principle-link" onClick={openLogDialog}>
                {t('datenschutz.faq.link')}
                <ArrowRight aria-hidden="true" />
              </button>
            </div>
          </section>
        </aside>
      </div>

      {/* Footer trust line + security badges */}
      <div className="ds2-footer">
        <p className="ds2-footer-title">
          <Lock aria-hidden="true" />
          {t('datenschutz.footer.title')}
        </p>
        <ul className="ds2-badges">
          <li>
            <ShieldCheck aria-hidden="true" />
            {t('datenschutz.footer.badge_encrypted')}
          </li>
          <li>
            <MapPin aria-hidden="true" />
            {t('datenschutz.footer.badge_germany')}
          </li>
          <li>
            <Landmark aria-hidden="true" />
            {t('datenschutz.footer.badge_iso')}
          </li>
          <li>
            <FileText aria-hidden="true" />
            {t('datenschutz.footer.badge_dsgvo')}
          </li>
        </ul>
        <p className="ds2-footer-basis">{t('datenschutz.footer.rechtsgrundlage')}</p>
        <p className="ds2-footer-basis">{t('datenschutz.footer.noots')}</p>
      </div>

      <Dialog open={logDialogOpen} onOpenChange={setLogDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{t('datenschutz.kontrolle.zugriffsprotokoll')}</DialogTitle>
            <DialogDescription>
              {t('datenschutz.log_dialog.description')}
            </DialogDescription>
          </DialogHeader>
          <div
            className="ds-card act"
            style={{
              border: 'none',
              padding: 0,
              boxShadow: 'none',
              maxHeight: '60vh',
              overflowY: 'auto',
            }}
          >
            {fullLog === null ? (
              <p style={{ color: 'var(--ink-3)', fontSize: 13.5 }}>
                {t('datenschutz.log_dialog.loading')}
              </p>
            ) : fullLog.length === 0 ? (
              <p style={{ color: 'var(--ink-3)', fontSize: 13.5 }}>
                {t('datenschutz.log_dialog.empty')}
              </p>
            ) : (
              fullLog.map(renderLogRow)
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={histDialogOpen} onOpenChange={setHistDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{t('datenschutz.hist_dialog.title')}</DialogTitle>
            <DialogDescription>
              {t('datenschutz.hist_dialog.description')}
            </DialogDescription>
          </DialogHeader>
          <div
            className="ds-card act"
            style={{
              border: 'none',
              padding: 0,
              boxShadow: 'none',
              maxHeight: '60vh',
              overflowY: 'auto',
            }}
          >
            {consentHistory.length === 0 ? (
              <p style={{ color: 'var(--ink-3)', fontSize: 13.5 }}>
                {t('datenschutz.hist_dialog.empty')}
              </p>
            ) : (
              consentHistory.map(renderLogRow)
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function DatenschutzSkeleton() {
  const tCommon = useTranslations('common');
  return (
    <div role="status" aria-busy="true">
      <span className="sr-only">{tCommon('loading')}</span>
      <div className="gt-page-head">
        <Skeleton shape="text" className="h-8 w-64" />
        <Skeleton shape="text" className="mt-2 w-80" />
      </div>
      <Skeleton className="mb-6 h-20 rounded-2xl" />
      <div className="flex flex-col gap-6">
        <Skeleton className="h-32 rounded-2xl" />
        <Skeleton className="h-32 rounded-2xl" />
        <Skeleton className="h-32 rounded-2xl" />
        <Skeleton className="h-32 rounded-2xl" />
      </div>
    </div>
  );
}
