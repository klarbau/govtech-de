'use client';

import * as React from 'react';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { ArrowRight, Check, Circle, Clock3 } from 'lucide-react';
import { toast } from 'sonner';

import { AnspruchLane } from '@/components/dashboard/AnspruchLane';
import {
  AufenthaltFristNudge,
  resolveAufenthaltFristNudge,
} from '@/components/dashboard/AufenthaltFristNudge';
import { WohngeldHinweisCard } from '@/components/dashboard/WohngeldHinweisCard';
import { Skeleton } from '@/components/shared/Skeleton';
import { StatusBadge, type StatusVariant } from '@/components/shared/StatusBadge';
import { resolveBehoerdeName } from '@/lib/behoerde-name';
import { api } from '@/lib/mock-backend';
import { cn } from '@/lib/utils';
import type {
  AutopilotKatalogEntry,
  DashboardSnapshot,
  Document,
  Letter,
  Persona,
  SteuerUebersicht,
  Termin,
  UebermittlungsLogEntry,
  VorgangStatus,
} from '@/types';
import type { TopActionItem } from '@/types/dashboard';

interface DashboardViewProps {
  nowIso: string;
}

const DEMO_PRIOR_LOGIN_DAYS = 23;

/** Steuerjahr des Demo-Entwurfs (nur 2024 ist geseedet; identisch zur Steuer-Seite). */
const DEMO_STEUERJAHR = 2024;

/** Frist-Nähe-Schwelle: bis so viele Tage vor Ablauf färbt der Slot amber. */
const FRIST_NAH_TAGE = 7;

/**
 * Offene Mitwirkungs-Punkte des Aufenthalts-Nudges. Entspricht den drei
 * „Was noch von Ihnen kommt"-Zeilen, die `<AufenthaltFristNudge>` beim
 * Aufklappen zeigt — der Slot-Zähler bleibt damit gegen den Inhalt prüfbar.
 */
const AUFENTHALT_OFFENE_PUNKTE = 3;

/** Vorgangs-Status → geteilte Badge-Semantik (`StatusBadge`). */
const VORGANG_STATUS_VARIANT: Record<VorgangStatus, StatusVariant> = {
  angelegt: 'laufend',
  in_pruefung: 'wird_geprueft',
  genehmigt: 'bestaetigt',
  abgelehnt: 'abgelaufen',
  abgeschlossen: 'abgeschlossen',
};

/**
 * `<DashboardView>` — „Dicht, aber ruhig" (Spec `dashboard-dense.md`). Ein
 * verdichtetes Modul-Grid: boxlose Kennzahlen-Leiste, Umzug-Glas-Hero (der EINE
 * Frost), „Ihnen steht zu"-Lane und ein 2×3-Grid ruhiger Karten (Heute, Meine
 * Vorgänge, Nächste Termine, Posteingang-neu, Steuer-Status, Zuletzt
 * übermittelt), darunter die boxlose Autopilot-Fußzeile. Daten via
 * `api.getProfile()` + `api.getDashboard()` plus parallele, je fehlertolerante
 * Modul-Fetches; Behörden-Namen synchron via `resolveBehoerdeName`.
 */
export function DashboardView({ nowIso }: DashboardViewProps) {
  const t = useTranslations('dashboard');
  const tRoot = useTranslations();
  const tCommon = useTranslations('common');
  const tKatalog = useTranslations('katalog');
  const tWohngeld = useTranslations('wohngeldHinweis');
  const locale = useLocale();

  const [snapshot, setSnapshot] = React.useState<DashboardSnapshot | null>(null);
  const [persona, setPersona] = React.useState<Persona | null>(null);
  const [katalog, setKatalog] = React.useState<AutopilotKatalogEntry[]>([]);
  const [termine, setTermine] = React.useState<Termin[]>([]);
  const [unreadLetters, setUnreadLetters] = React.useState<Letter[]>([]);
  const [steuer, setSteuer] = React.useState<SteuerUebersicht | null>(null);
  const [uebermittelt, setUebermittelt] = React.useState<UebermittlungsLogEntry[]>([]);
  const [docCount, setDocCount] = React.useState<number>(0);
  const [dismissed, setDismissed] = React.useState<Set<string>>(() => new Set());
  const [wohngeldHidden, setWohngeldHidden] = React.useState(false);
  const [aufenthaltHidden, setAufenthaltHidden] = React.useState(false);
  const [wohngeldOpen, setWohngeldOpen] = React.useState(false);
  const [aufenthaltOpen, setAufenthaltOpen] = React.useState(false);
  const wohngeldPanelId = React.useId();
  const aufenthaltPanelId = React.useId();
  const [error, setError] = React.useState<string | null>(null);
  const lastSeenWrittenRef = React.useRef(false);

  const euro = React.useMemo(
    () => new Intl.NumberFormat(locale, { style: 'currency', currency: 'EUR' }),
    [locale],
  );

  const reload = React.useCallback(async () => {
    const p = await api.getProfile();
    const priorLogin = new Date(
      new Date(nowIso).getTime() - DEMO_PRIOR_LOGIN_DAYS * 24 * 60 * 60 * 1000,
    ).toISOString();
    // Aufenthalt-Frist-Nudge-Suppression (dismiss/snooze) parallel mitziehen —
    // der Nudge selbst wird komponentenlokal aus der Persona abgeleitet.
    const [snap, aufenthaltSuppressed] = await Promise.all([
      api.getDashboard(p.id, { last_seen_at: priorLogin }),
      api.isAufenthaltFristNudgeSuppressed(p.id).catch(() => false),
    ]);
    setPersona(p);
    setSnapshot(snap);
    setAufenthaltHidden(aufenthaltSuppressed);
    return p;
  }, [nowIso]);

  React.useEffect(() => {
    let cancelled = false;
    // Autopilot-Katalog parallel zum Profil/Dashboard laden (persona-unabhängig)
    // — flacht den Fetch-Wasserfall ab. Behörden-Namen kommen synchron aus
    // `resolveBehoerdeName` (behoerden.json), daher kein getBehoerden-Roundtrip.
    const katalogPromise = api
      .getAutopilotKatalog()
      .catch(() => [] as AutopilotKatalogEntry[]);
    (async () => {
      try {
        const p = await reload();
        if (cancelled) return;
        if (!lastSeenWrittenRef.current) {
          lastSeenWrittenRef.current = true;
          await api.setLastSeen(p.id, nowIso);
        }
        // Modul-Daten parallel + je einzeln fehlertolerant (§3): ein Fehler
        // blendet nur das betroffene Modul leise aus, reißt nie die Seite.
        const [term, letters, steu, log, docs] = await Promise.all([
          api.getTermine().catch(() => [] as Termin[]),
          api.getLetters({ unread: true }).catch(() => [] as Letter[]),
          api.getSteuerUebersicht(p.id, DEMO_STEUERJAHR).catch(() => null),
          api
            .getUebermittlungsLog(p.id)
            .catch(() => [] as UebermittlungsLogEntry[]),
          api.getDocuments().catch(() => [] as Document[]),
        ]);
        if (!cancelled) {
          setTermine(term);
          setUnreadLetters(letters);
          setSteuer(steu);
          setUebermittelt(log);
          setDocCount(docs.length);
        }
        const cat = await katalogPromise;
        if (!cancelled) setKatalog(cat);
      } catch {
        if (!cancelled) setError(t('fehler.laden'));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [nowIso, reload, t]);

  async function handleDone(reminderId: string) {
    setDismissed((prev) => new Set(prev).add(reminderId));
    try {
      await api.markReminderDone(reminderId);
      await reload();
    } catch {
      /* optimistic dismiss already applied */
    }
  }

  async function handleSnooze(reminderId: string) {
    setDismissed((prev) => new Set(prev).add(reminderId));
    try {
      await api.snoozeReminder(reminderId, 7);
      await reload();
    } catch {
      /* optimistic dismiss already applied */
    }
  }

  async function handleWohngeldDismiss() {
    if (!persona) return;
    setWohngeldHidden(true);
    try {
      await api.dismissWohngeldHinweis(persona.id);
      await reload();
    } catch {
      /* optimistic hide already applied */
    }
  }

  async function handleWohngeldSnooze() {
    if (!persona) return;
    setWohngeldHidden(true);
    try {
      await api.snoozeWohngeldHinweis(persona.id, 30);
      await reload();
    } catch {
      /* optimistic hide already applied */
    }
  }

  async function handleWohngeldRevokeConsent() {
    if (!persona) return;
    setWohngeldHidden(true);
    try {
      await api.setWohngeldHinweisConsent(persona.id, false);
      await reload();
    } catch {
      /* optimistic hide already applied */
    }
    toast(tWohngeld('consent_revoked_toast'));
  }

  async function handleAufenthaltDismiss() {
    if (!persona) return;
    setAufenthaltHidden(true);
    try {
      await api.dismissAufenthaltFristNudge(persona.id);
      await reload();
    } catch {
      /* optimistic hide already applied */
    }
  }

  async function handleAufenthaltSnooze() {
    if (!persona) return;
    setAufenthaltHidden(true);
    try {
      await api.snoozeAufenthaltFristNudge(persona.id, 30);
      await reload();
    } catch {
      /* optimistic hide already applied */
    }
  }

  const anrede = greetingAnrede(snapshot, persona);
  const highlight = snapshot?.autopilot_highlight;
  const receipt = highlight?.value_receipt;
  // Das Highlight existiert nur für einen abgeschlossenen Umzug-Lauf
  // (`autopilot_highlight` wird ausschließlich aus dem jüngsten `abgeschlossen`-
  // Vorgang gebaut). Das Panel rendert daher immer den fertigen Zustand:
  // `behoerden_count` Stellen wurden vollständig gemeldet.
  const umzugCount = receipt ? receipt.behoerden_count : 0;
  const umzugOrt = persona?.adresse?.ort ?? '';
  const erledigtLatest = snapshot?.erledigt_feed?.[0];

  const visibleTodos = sortByRank(
    (snapshot?.top_actions ?? []).filter((a) => !dismissed.has(a.id)),
  ).slice(0, 3);

  const wohngeldHinweis = snapshot?.wohngeld_hinweis ?? null;
  const showWohngeld = wohngeldHinweis !== null && !wohngeldHidden;

  const anspruchLane = snapshot?.anspruch_lane ?? [];

  // Antizipations-Nudge (wow-#10): proaktive Fristbewachung — rein aus der
  // Persona abgeleitet, kein Snapshot-Feld.
  const aufenthaltFrist = persona
    ? resolveAufenthaltFristNudge(persona, nowIso)
    : null;
  const showAufenthalt = aufenthaltFrist !== null && !aufenthaltHidden;

  const fristCount = snapshot?.frist_count_14d ?? 0;
  const tldrDatum = earliestFristDatum(snapshot?.top_actions ?? [], nowIso, locale);

  const heuteEmpty =
    visibleTodos.length === 0 && !showWohngeld && !showAufenthalt;

  // Modul-abgeleitete Sichten.
  const nowMs = new Date(nowIso).getTime();
  const futureTermine = [...termine]
    .filter(
      (term) =>
        term.status !== 'abgesagt' && new Date(term.datum).getTime() >= nowMs,
    )
    .sort((a, b) => a.datum.localeCompare(b.datum));
  const termineTop = futureTermine.slice(0, 3);
  const postTop = unreadLetters.slice(0, 3);
  const vorgaengeTop = (snapshot?.vorgangs_stand_tile ?? []).slice(0, 4);
  // „Zuletzt übermittelt" zeigt echte Übermittlungen — App-Selbst-Aktivität
  // (`app_aktivitaet`) ist keine Übermittlung und bleibt draußen.
  const uebermitteltTop = uebermittelt
    .filter((e) => e.kategorie !== 'app_aktivitaet')
    .slice(0, 3);

  // Autopilot-Katalog-Fußzeile: nur die noch nicht live geschalteten Lebenslagen
  // (Umzug ist bereits das Hero-Panel). Quelle: Katalog-Daten.
  const autopilotEntries = katalog.filter((e) => e.status !== 'live');

  const kennzahlen = [
    {
      href: '/posteingang',
      num: snapshot?.posteingang_tile.ungelesen ?? 0,
      label: t('kennzahl.posteingang'),
    },
    {
      href: '/vorgaenge',
      num: snapshot?.vorgangs_stand_tile.length ?? 0,
      label: t('kennzahl.vorgaenge'),
    },
    {
      href: '/posteingang',
      num: fristCount,
      label: t('kennzahl.fristen'),
    },
    {
      href: '/termine',
      num: futureTermine.length,
      label: t('kennzahl.termine'),
    },
    {
      href: '/dokumente',
      num: docCount,
      label: t('kennzahl.dokumente'),
    },
  ];

  if (snapshot === null && error === null) {
    return (
      <>
        <div className="gt-page-head dash-head">
          <h1 className="dash-greeting">{t('greeting.guten_tag', { name: anrede })}</h1>
          <Skeleton className="mt-2 h-4 w-80 max-w-full" />
        </div>
        <DashboardSkeleton label={tCommon('loading')} />
      </>
    );
  }

  const strong = (chunks: React.ReactNode) => (
    <strong className="font-semibold text-text-primary">{chunks}</strong>
  );

  const fristenNode =
    fristCount === 0
      ? t('tldr.keine_fristen')
      : tldrDatum
        ? t.rich('tldr.fristen', { count: fristCount, datum: tldrDatum, b: strong })
        : t.rich('tldr.fristen_ohne_datum', { count: fristCount, b: strong });
  const umzugNode = highlight
    ? t.rich('tldr.umzug', { b: strong })
    : null;

  const ersparnis = receipt
    ? receipt.geschaetzte_zeitersparnis_min >= 120
      ? t('umzug_panel.ersparnis_std', {
          hours: Math.round(receipt.geschaetzte_zeitersparnis_min / 60),
        })
      : t('umzug_panel.ersparnis_min', { min: receipt.geschaetzte_zeitersparnis_min })
    : '';

  // Module als Elemente vordefiniert, damit sie unten in handverteilte
  // Flex-Spalten gruppiert werden können (unabhängige Spaltenhöhen → keine toten
  // Zonen; „Heute" ist mit Abstand die höchste Karte und trägt daher ihre Spalte
  // fast allein). Quell-/DOM-Reihenfolge der Spalten = Mobile-Stapelung §5:
  // Heute zuerst, Posteingang in der oberen Hälfte.
  const heuteCard = (
    <ModuleCard
      title={t('heute.titel')}
      allLabel={t('heute.alle_anzeigen')}
      allHref="/posteingang"
    >
      {heuteEmpty ? (
        <div className="flex flex-col items-start gap-1 py-2">
          <span
            className="mb-1 grid size-9 place-items-center rounded-full bg-surface-muted text-primary [&>svg]:size-4"
            aria-hidden="true"
          >
            <Check />
          </span>
          <div className="font-semibold text-text-primary">
            {t('heute.empty_title')}
          </div>
          <div className="text-sm text-text-muted">{t('heute.empty_body')}</div>
          <div className="mt-1 text-sm text-text-secondary">
            {t('achievement.jahr', {
              count: snapshot?.vorgaenge_abgeschlossen_jahr ?? 0,
            })}
          </div>
        </div>
      ) : (
        <ol className="border-t border-border">
          {visibleTodos.map((item) => {
            const view = mapToHeuteItem(item);
            const behoerde = resolveBehoerdeName(view.behoerdeId);
            const reason = reasonSubline(view.reasonToken, t);
            // Die generische „Frist rückt näher"-Begründung ist redundant,
            // sobald die Fällig-Datum-Zeile ohnehin sichtbar ist.
            const showReason =
              reason.length > 0 &&
              !(view.reasonToken === 'frist_naehe' && Boolean(view.fristDatum));
            const sub = [behoerde, showReason ? reason : null]
              .filter(Boolean)
              .join(' · ');
            const near = view.fristIso
              ? daysUntil(view.fristIso, nowIso) <= FRIST_NAH_TAGE
              : false;
            return (
              <li
                key={view.id}
                className="group relative border-b border-border last:border-b-0"
              >
                <Link
                  href={view.href}
                  className="grid grid-cols-[64px_minmax(0,1fr)] items-baseline gap-3 rounded-md py-3 pl-1 pr-11 no-underline transition-colors hover:bg-surface-muted/50"
                >
                  <span
                    className={cn(
                      'whitespace-nowrap text-[12.5px] tabular-nums',
                      near
                        ? 'font-semibold text-amber-700 dark:text-amber-400'
                        : 'text-text-muted',
                    )}
                  >
                    {view.fristDatum
                      ? t('heute.slot_bis', { datum: shortDMY(view.fristDatum) })
                      : ''}
                  </span>
                  <span className="min-w-0">
                    <span className="block font-semibold leading-snug text-text-primary">
                      {view.titel}
                    </span>
                    {sub ? (
                      <span className="mt-0.5 block line-clamp-2 text-[13px] leading-snug text-text-muted">
                        {sub}
                      </span>
                    ) : null}
                  </span>
                </Link>
                <div
                  className="pointer-events-none absolute right-1 top-1/2 flex -translate-y-1/2 gap-1 rounded-lg bg-surface-muted p-0.5 opacity-0 transition-opacity group-hover:pointer-events-auto group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:opacity-100 [&_button:focus-visible]:opacity-100"
                  role="group"
                  aria-label={t('heute.actions_label', { titel: view.titel })}
                >
                  <button
                    type="button"
                    aria-label={t('heute.done')}
                    title={t('heute.done')}
                    onClick={() => handleDone(view.sourceId)}
                    className="grid size-9 place-items-center rounded-md border border-border bg-surface text-text-secondary transition-colors hover:bg-surface-muted hover:text-text-primary [&>svg]:size-4"
                  >
                    <Check />
                  </button>
                  <button
                    type="button"
                    aria-label={t('heute.snooze')}
                    title={t('heute.snooze')}
                    onClick={() => handleSnooze(view.sourceId)}
                    className="grid size-9 place-items-center rounded-md border border-border bg-surface text-text-secondary transition-colors hover:bg-surface-muted hover:text-text-primary [&>svg]:size-4"
                  >
                    <Clock3 />
                  </button>
                </div>
              </li>
            );
          })}

          {showWohngeld && wohngeldHinweis ? (
            <li className="border-b border-border last:border-b-0">
              <button
                type="button"
                aria-expanded={wohngeldOpen}
                aria-controls={wohngeldOpen ? wohngeldPanelId : undefined}
                onClick={() => setWohngeldOpen((o) => !o)}
                className="grid w-full grid-cols-[64px_minmax(0,1fr)] items-baseline gap-3 rounded-md py-3 pl-1 pr-3 text-left transition-colors hover:bg-surface-muted/50"
              >
                <span className="whitespace-nowrap text-[12.5px] text-text-muted">
                  {t('heute.slot_hinweis')}
                </span>
                <span className="min-w-0">
                  <span className="block font-semibold leading-snug text-text-primary">
                    {wohngeldHinweis.variant === 'risiko'
                      ? t('heute.slot_wohngeld_titel_risiko')
                      : t('heute.slot_wohngeld_titel', {
                          min: wohngeldHinweis.geschaetzt_min_eur,
                          max: wohngeldHinweis.geschaetzt_max_eur,
                        })}
                  </span>
                  <span className="mt-0.5 block text-[13px] leading-snug text-text-muted">
                    {t('heute.slot_wohngeld_sub')}
                  </span>
                </span>
              </button>
              {wohngeldOpen ? (
                <div id={wohngeldPanelId} className="pb-4 pt-1">
                  <WohngeldHinweisCard
                    estimate={wohngeldHinweis}
                    ort={persona?.adresse?.ort ?? ''}
                    onDismiss={handleWohngeldDismiss}
                    onSnooze={handleWohngeldSnooze}
                    onRevokeConsent={handleWohngeldRevokeConsent}
                    onRequestCollapse={() => setWohngeldOpen(false)}
                  />
                </div>
              ) : null}
            </li>
          ) : null}

          {showAufenthalt && aufenthaltFrist ? (
            <li className="border-b border-border last:border-b-0">
              <button
                type="button"
                aria-expanded={aufenthaltOpen}
                aria-controls={aufenthaltOpen ? aufenthaltPanelId : undefined}
                onClick={() => setAufenthaltOpen((o) => !o)}
                className="grid w-full grid-cols-[64px_minmax(0,1fr)] items-baseline gap-3 rounded-md py-3 pl-1 pr-3 text-left transition-colors hover:bg-surface-muted/50"
              >
                <span className="whitespace-nowrap text-[12.5px] text-text-muted">
                  {t('heute.slot_hinweis')}
                </span>
                <span className="min-w-0">
                  <span className="block font-semibold leading-snug text-text-primary">
                    {t('heute.slot_aufenthalt_titel', {
                      monat: formatMonthYear(aufenthaltFrist.validUntilIso, locale),
                    })}
                  </span>
                  <span className="mt-0.5 block text-[13px] leading-snug text-text-muted">
                    {t('heute.slot_aufenthalt_sub', {
                      count: AUFENTHALT_OFFENE_PUNKTE,
                      behoerde: aufenthaltFrist.abhBehoerdeId
                        ? resolveBehoerdeName(aufenthaltFrist.abhBehoerdeId)
                        : '',
                    })}
                  </span>
                </span>
              </button>
              {aufenthaltOpen ? (
                <div id={aufenthaltPanelId} className="pb-4 pt-1">
                  <AufenthaltFristNudge
                    view={aufenthaltFrist}
                    behoerdeName={
                      aufenthaltFrist.abhBehoerdeId
                        ? resolveBehoerdeName(aufenthaltFrist.abhBehoerdeId)
                        : undefined
                    }
                    onDismiss={handleAufenthaltDismiss}
                    onSnooze={handleAufenthaltSnooze}
                  />
                </div>
              ) : null}
            </li>
          ) : null}
        </ol>
      )}
    </ModuleCard>
  );

  const vorgaengeCard = (
    <ModuleCard
      title={t('module.vorgaenge_titel')}
      allLabel={t('module.vorgaenge_alle')}
      allHref="/vorgaenge"
    >
      {vorgaengeTop.length === 0 ? (
        <CalmEmptyLine text={t('heute.empty_body')} />
      ) : (
        <ul className="-my-1 divide-y divide-border">
          {vorgaengeTop.map((v) => {
            const variant = VORGANG_STATUS_VARIANT[v.status];
            return (
              <li key={v.vorgang_id} className="py-2.5">
                <Link
                  href={`/vorgaenge/${v.vorgang_id}`}
                  className="group flex flex-col items-start gap-1 no-underline"
                >
                  <StatusBadge variant={variant}>
                    {tCommon(`status.${variant}`)}
                  </StatusBadge>
                  <span className="line-clamp-2 font-medium leading-snug text-text-primary">
                    {v.titel}
                  </span>
                  <span className="line-clamp-2 text-[12.5px] leading-snug text-text-muted">
                    {t('module.vorgaenge_beteiligte', {
                      count: v.beteiligte_anzahl,
                    })}
                    {' · '}
                    {t('module.vorgaenge_bewegung', {
                      zeit: formatRelative(v.letzte_bewegung_iso, nowIso, locale),
                    })}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </ModuleCard>
  );

  const termineCard = (
    <ModuleCard
      title={t('module.termine_titel')}
      allLabel={t('module.termine_alle')}
      allHref="/termine"
    >
      {termineTop.length === 0 ? (
        <CalmEmptyLine text={t('module.termine_leer')} />
      ) : (
        <ul className="-my-1 divide-y divide-border">
          {termineTop.map((term) => (
            <li key={term.id} className="py-2.5">
              <Link
                href="/termine"
                className="grid grid-cols-[auto_minmax(0,1fr)] items-baseline gap-3 no-underline"
              >
                <span className="whitespace-nowrap text-[12.5px] leading-snug tabular-nums text-text-muted">
                  <span className="block font-medium text-text-secondary">
                    {terminSlotDay(term.datum, locale)}
                  </span>
                  {terminSlotTime(term.datum, locale)}
                </span>
                <span className="min-w-0">
                  <span className="line-clamp-2 block font-medium leading-snug text-text-primary">
                    {term.betreff}
                  </span>
                  <span className="mt-0.5 line-clamp-2 block text-[12.5px] leading-snug text-text-muted">
                    {resolveBehoerdeName(term.behoerde_id)}
                    {' · '}
                    {t(`module.termine_ort_${term.ort.typ}`)}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </ModuleCard>
  );

  const postCard = (
    <ModuleCard
      title={t('module.post_titel')}
      allLabel={t('module.post_alle')}
      allHref="/posteingang"
    >
      {postTop.length === 0 ? (
        <CalmEmptyLine text={t('module.post_leer')} />
      ) : (
        <ul className="-my-1 divide-y divide-border">
          {postTop.map((l) => (
            <li key={l.id} className="py-2.5">
              <Link
                href={`/posteingang/${l.id}`}
                className="flex items-start gap-2.5 no-underline"
              >
                <span
                  className="mt-[7px] size-2 shrink-0 rounded-full bg-primary"
                  aria-hidden="true"
                />
                <span className="min-w-0 flex-1">
                  <span className="flex items-start justify-between gap-2">
                    <span className="line-clamp-2 min-w-0 flex-1 font-semibold leading-snug text-text-primary">
                      {resolveBehoerdeName(l.absender_behoerde_id)}
                    </span>
                    <span className="shrink-0 text-[12px] tabular-nums text-text-muted">
                      {formatRelative(l.empfangen_am, nowIso, locale)}
                    </span>
                  </span>
                  <span className="mt-0.5 line-clamp-2 block text-[13px] leading-snug text-text-muted">
                    {l.betreff}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </ModuleCard>
  );

  const steuerCard = steuer ? (
    <ModuleCard
      title={t('module.steuer_titel', { jahr: steuer.steuerjahr })}
      allLabel={t('module.steuer_cta')}
      allHref="/steuer"
    >
      <p className="font-heading text-[28px] font-bold leading-none tabular-nums text-text-primary">
        {euro.format(steuer.voraussichtliche_erstattung_cent / 100)}
      </p>
      <p className="mt-1.5 text-[13px] leading-snug text-text-muted">
        {t('module.steuer_erstattung_label')}
        {' — '}
        {t('module.steuer_basis')}
      </p>
      {steuer.bereiche.length > 0 ? (
        <ul className="mt-3 flex flex-col gap-1.5 border-t border-border pt-3">
          {steuer.bereiche.slice(0, 3).map((b) => {
            const done = b.status === 'geprueft';
            return (
              <li
                key={b.id}
                className="flex items-center gap-2 text-[13px] text-text-secondary"
              >
                {done ? (
                  <Check
                    className="size-3.5 shrink-0 text-primary"
                    aria-hidden="true"
                  />
                ) : (
                  <Circle
                    className="size-3.5 shrink-0 text-text-muted"
                    aria-hidden="true"
                  />
                )}
                <span className="line-clamp-2">{tRoot(b.name_i18n_key)}</span>
              </li>
            );
          })}
        </ul>
      ) : null}
    </ModuleCard>
  ) : null;

  const uebermitteltCard = (
    <ModuleCard
      title={t('module.uebermittelt_titel')}
      allLabel={t('module.uebermittelt_alle')}
      allHref="/datenschutz"
    >
      {uebermitteltTop.length > 0 ? (
        <ul className="-my-1 divide-y divide-border">
          {uebermitteltTop.map((e) => (
            <li key={e.id} className="py-2 text-[13px] leading-snug">
              <span className="tabular-nums text-text-muted">
                {shortDMY(formatDDMMYYYY(new Date(e.timestamp)))}
              </span>{' '}
              <span className="text-text-secondary">
                {tRoot(e.zweck_i18n_key)}
                {e.empfaenger_id ? (
                  <>
                    {' → '}
                    {resolveBehoerdeName(String(e.empfaenger_id))}
                  </>
                ) : null}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <CalmEmptyLine text={t('kontrolle_fuss.text')} />
      )}
      <p className="mt-3 border-t border-border pt-3 text-[12px] leading-relaxed text-text-muted">
        {t('kontrolle_fuss.text')}{' '}
        <Link
          href="/datenschutz"
          className="underline decoration-border underline-offset-[3px] transition-colors hover:text-text-secondary"
        >
          {t('kontrolle_fuss.mehr')}
        </Link>
      </p>
    </ModuleCard>
  );

  return (
    <>
      <div className="gt-page-head dash-head">
        <h1 className="dash-greeting">{t('greeting.guten_tag', { name: anrede })}</h1>
        <p className="dash-greeting-sub md:max-w-[76ch]!">
          {fristenNode}
          {umzugNode ? (
            <>
              {' · '}
              {umzugNode}
            </>
          ) : null}
        </p>
      </div>

      <div className="flex flex-col gap-6">
        {/* ── Kennzahlen-Leiste (boxlos, 5 Links, Hairline-getrennt) ─────────── */}
        <nav aria-label={t('kennzahl.leiste_aria')}>
          <ul className="grid grid-cols-2 border-t border-border sm:grid-cols-3 lg:grid-cols-5 lg:border-b">
            {kennzahlen.map(({ href, num, label }, i) => (
              <li key={label} className="border-b border-border lg:border-b-0">
                <Link
                  href={href}
                  aria-label={`${num} ${label}`}
                  className={cn(
                    'flex min-h-[52px] items-baseline gap-2.5 px-1 py-3 no-underline transition-colors hover:bg-surface-muted/60 sm:px-3',
                    i > 0 ? 'lg:border-l lg:border-border' : '',
                  )}
                >
                  <span
                    className="font-heading text-[22px] font-bold leading-none tabular-nums text-text-primary"
                    aria-hidden="true"
                  >
                    {num}
                  </span>
                  <span
                    className="text-[13px] font-medium leading-tight text-text-secondary"
                    aria-hidden="true"
                  >
                    {label}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {/* ── Hero — Umzug (der EINE Frost des Screens) ──────────────────────── */}
        {highlight ? (
          <section
            aria-labelledby="dash-umzug-title"
            className="dash-umzug-panel rounded-2xl border border-border bg-card p-6 shadow-sm"
          >
            <div className="grid gap-x-8 gap-y-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)_minmax(0,1fr)] lg:items-center">
              {/* links: Titel + Status */}
              <div>
                <h2
                  id="dash-umzug-title"
                  className="text-[17px] font-semibold text-text-primary"
                >
                  {t('umzug_panel.titel', { ort: umzugOrt })}
                </h2>
                <span className="mt-1 block text-[13px] font-semibold text-text-secondary">
                  {t('umzug_panel.state_fertig')}
                </span>
              </div>

              {/* Mitte: große Zahl + Segment-Balken */}
              <div>
                <p className="font-heading text-2xl font-bold tracking-tight text-text-primary">
                  {t('umzug_panel.stellen', { done: umzugCount, total: umzugCount })}
                </p>
                <div
                  className="mt-3 flex gap-1.5"
                  role="img"
                  aria-label={t('umzug_panel.segbar_aria', {
                    done: umzugCount,
                    total: umzugCount,
                  })}
                >
                  {Array.from({ length: umzugCount }).map((_, i) => (
                    <span key={i} className="h-1.5 flex-1 rounded-full bg-primary" />
                  ))}
                </div>
              </div>

              {/* rechts: ein leiser Link zur Vorgangs-Akte */}
              <div>
                <Link
                  href={`/vorgaenge/umzug/${highlight.vorgang_id}`}
                  className="text-[13.5px] text-text-secondary underline decoration-border underline-offset-[3px] transition-colors hover:text-text-primary"
                >
                  {t('umzug_panel.alle_schritte')}
                </Link>
              </div>
            </div>

            {receipt ? (
              <p className="mt-5 border-t border-border pt-3 text-[12.5px] leading-relaxed text-text-muted">
                {erledigtLatest
                  ? t('umzug_panel.meta', {
                      aktion: erledigtLatest.agent_label,
                      zeit: formatRelative(erledigtLatest.erledigt_at, nowIso, locale),
                      ersparnis,
                    })
                  : t('umzug_panel.meta_ohne_eintrag', { ersparnis })}
              </p>
            ) : null}
          </section>
        ) : null}

        {/* ── „Ihnen steht zu"-Lane (volle Breite, interne Logik unverändert) ── */}
        {anspruchLane.length > 0 && persona ? (
          <AnspruchLane
            entries={anspruchLane}
            personaId={persona.id}
            onReload={reload}
          />
        ) : null}

        {/* ── Modul-Grid — 3 handverteilte Flex-Spalten (unabhängige Höhen →
            keine toten Zonen; „Heute“ ist mit Abstand die höchste Karte und
            trägt daher ihre Spalte fast allein). Spalten-DOM-Reihenfolge =
            Mobile-Stapelung §5: Heute zuerst, Posteingang in der oberen Hälfte. */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
          <div className="flex flex-1 flex-col gap-4">
            {heuteCard}
            {steuerCard}
          </div>
          <div className="flex flex-1 flex-col gap-4">
            {postCard}
            {vorgaengeCard}
          </div>
          <div className="flex flex-1 flex-col gap-4">
            {termineCard}
            {uebermitteltCard}
          </div>
        </div>

        {/* ── Autopilot-Fußzeile (boxlos) ───────────────────────────────────── */}
        {autopilotEntries.length > 0 ? (
          <section
            aria-labelledby="dash-autopilot-title"
            className="border-t border-border pt-4"
          >
            <h2
              id="dash-autopilot-title"
              className="mb-1.5 text-[13px] font-semibold text-text-secondary"
            >
              {t('autopilot_verfuegbar.titel')}
            </h2>
            <p className="text-[13.5px] leading-relaxed text-text-secondary">
              {autopilotEntries.map((entry, i) => (
                <React.Fragment key={entry.id}>
                  {i > 0 ? ' · ' : ''}
                  <span>
                    {tKatalog(`${entry.id}.titel`)}
                    {entry.status !== 'live' ? (
                      <span className="text-text-muted">
                        {' '}
                        ({t('autopilot_verfuegbar.in_vorbereitung')})
                      </span>
                    ) : null}
                  </span>
                </React.Fragment>
              ))}
            </p>
            <Link
              href="/lebenslagen"
              className="group mt-2 inline-flex items-center gap-1 text-[13px] text-text-secondary no-underline underline-offset-[3px] transition-colors hover:text-text-primary hover:underline"
            >
              {t('autopilot_verfuegbar.alle')}
              <ArrowRight
                aria-hidden="true"
                className="size-3.5 transition-transform motion-reduce:transition-none group-hover:translate-x-0.5"
              />
            </Link>
          </section>
        ) : null}
      </div>

      {error && (
        <p className="mt-3 text-[13px] text-[color:var(--red-600)]">{error}</p>
      )}
    </>
  );
}

/**
 * Gemeinsame ruhige Modul-Karte: `--surface`-Glasfläche (LG: rgba-weiß OHNE
 * blur via `lg-glass-surface`, Kill-Switch-Fallback über `bg-card`/`border`),
 * Kopf = h2 + optionaler leiser „Alle …"-Link. Die Module unterscheiden sich
 * bewusst im Inneren (Liste / Checkliste / große Zahl), nicht in der Hülle.
 */
function ModuleCard({
  title,
  allLabel,
  allHref,
  children,
}: {
  title: string;
  allLabel?: string;
  allHref?: string;
  children: React.ReactNode;
}) {
  const id = React.useId();
  return (
    <section
      aria-labelledby={id}
      className="lg-glass-surface flex flex-col rounded-2xl border border-border bg-card p-5"
    >
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h2
          id={id}
          className="text-[15px] font-semibold tracking-tight text-text-primary"
        >
          {title}
        </h2>
        {allHref && allLabel ? (
          <Link
            href={allHref}
            className="shrink-0 text-[12.5px] text-text-muted no-underline transition-colors hover:text-text-secondary"
          >
            {allLabel}
          </Link>
        ) : null}
      </div>
      {children}
    </section>
  );
}

/** Ruhige einzeilige Leer-Aussage innerhalb eines Moduls. */
function CalmEmptyLine({ text }: { text: string }) {
  return <p className="py-1 text-[13px] leading-relaxed text-text-muted">{text}</p>;
}

/**
 * Ruhiger Lade-Zustand: spiegelt grob den neuen Aufbau (Kennzahlen-Streifen,
 * Hero, Modul-Grid). Dekorative Shimmer-Blöcke; das sr-only-Label trägt die
 * Semantik.
 */
function DashboardSkeleton({ label }: { label: string }) {
  return (
    <div role="status" aria-busy="true" className="flex flex-col gap-6">
      <span className="sr-only">{label}</span>
      <Skeleton className="h-14 rounded-xl" />
      <Skeleton className="h-40 rounded-2xl" />
      <div className="grid items-start gap-4 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-44 rounded-2xl" />
        ))}
      </div>
    </div>
  );
}

// ── helpers ───────────────────────────────────────────────────────────────

/**
 * Reordnet die „Heute"-Aktionen in KI-Reihenfolge (Backend-`rank`, 1 = oben).
 */
function sortByRank(actions: TopActionItem[]): TopActionItem[] {
  return [...actions].sort((a, b) => a.rank - b.rank);
}

function greetingAnrede(
  snapshot: DashboardSnapshot | null,
  persona: Persona | null,
): string {
  if (snapshot) {
    return `${snapshot.greeting.vorname} ${snapshot.greeting.nachname}`;
  }
  if (persona) {
    return `${persona.vorname} ${persona.nachname}`;
  }
  return '';
}

function formatDDMMYYYY(d: Date): string {
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${dd}.${mm}.${d.getFullYear()}`;
}

/** „24.07.2026" → „24.07." (Tag.Monat-Slot ohne Jahr). */
function shortDMY(ddmmyyyy: string): string {
  return ddmmyyyy.length >= 6 ? ddmmyyyy.slice(0, 6) : ddmmyyyy;
}

/** Tage bis zur Frist (aufgerundet); `Infinity` bei ungültigem Datum. */
function daysUntil(iso: string, nowIso: string): number {
  const then = new Date(iso).getTime();
  const now = new Date(nowIso).getTime();
  if (Number.isNaN(then) || Number.isNaN(now)) return Number.POSITIVE_INFINITY;
  return Math.ceil((then - now) / 86_400_000);
}

/** Langes DE-Datum ohne Jahr für die TL;DR-/Panel-Zeile („24. Juli"). */
function formatLongDate(d: Date, locale: string): string {
  if (Number.isNaN(d.getTime())) return '';
  return new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'long' }).format(d);
}

/** Monat + Jahr, kurz („Sept. 2027"). */
function formatMonthYear(iso: string, locale: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return new Intl.DateTimeFormat(locale, { month: 'short', year: 'numeric' }).format(d);
}

/** Termin-Slot Zeile 1: „{Wochentag kurz} {dd.mm.}". */
function terminSlotDay(iso: string, locale: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const weekday = new Intl.DateTimeFormat(locale, { weekday: 'short' }).format(d);
  const dm = new Intl.DateTimeFormat(locale, {
    day: '2-digit',
    month: '2-digit',
  }).format(d);
  return `${weekday} ${dm}`;
}

/** Termin-Slot Zeile 2: „{HH:MM}". */
function terminSlotTime(iso: string, locale: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return new Intl.DateTimeFormat(locale, {
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
}

/** Relative Zeitangabe („vor 8 Stunden", „gestern") via Intl, locale-korrekt. */
function formatRelative(iso: string, nowIso: string, locale: string): string {
  const then = new Date(iso).getTime();
  const now = new Date(nowIso).getTime();
  if (Number.isNaN(then) || Number.isNaN(now)) return '';
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
  const diffMin = Math.round((then - now) / 60000);
  if (Math.abs(diffMin) < 60) return rtf.format(diffMin, 'minute');
  const diffH = Math.round(diffMin / 60);
  if (Math.abs(diffH) < 24) return rtf.format(diffH, 'hour');
  const diffD = Math.round(diffH / 24);
  return rtf.format(diffD, 'day');
}

/** Frühestes zukünftiges Frist-Datum unter den Top-Actions, lang formatiert. */
function earliestFristDatum(
  actions: TopActionItem[],
  nowIso: string,
  locale: string,
): string | undefined {
  const now = new Date(nowIso).getTime();
  if (Number.isNaN(now)) return undefined;
  const upcoming = actions
    .map((a) => (a.frist_datum ? new Date(a.frist_datum).getTime() : Number.NaN))
    .filter((ts) => !Number.isNaN(ts) && ts >= now)
    .sort((a, b) => a - b);
  if (upcoming.length === 0) return undefined;
  return formatLongDate(new Date(upcoming[0]), locale);
}

interface HeuteView {
  id: string;
  sourceId: string;
  titel: string;
  /** Whitelist-Reason-Token (→ Klartext-Subline). */
  reasonToken: string;
  behoerdeId: string;
  href: string;
  /** ISO-Frist (für Nähe-Berechnung). */
  fristIso?: string;
  /** DD.MM.YYYY-Frist (für den Slot). */
  fristDatum: string | null;
}

function mapToHeuteItem(ta: TopActionItem): HeuteView {
  return {
    id: ta.id,
    sourceId: ta.source_id ?? ta.id,
    titel: ta.titel,
    reasonToken: ta.reason_token,
    behoerdeId: ta.behoerde_id,
    href: ta.target_route,
    fristIso: ta.frist_datum,
    fristDatum: ta.frist_datum ? formatDDMMYYYY(new Date(ta.frist_datum)) : null,
  };
}

/**
 * Whitelist-Reason-Token → i18n-Klartext-Subline. Unbekannte Tokens fallen auf
 * leeren String zurück (keine Roh-Token-Anzeige).
 */
function reasonSubline(token: string, t: ReturnType<typeof useTranslations>): string {
  switch (token) {
    case 'frist_naehe':
      return t('heute.reason_frist_naehe');
    case 'termin_steht':
      return t('heute.reason_termin_steht');
    case 'folgevorgang':
      return t('heute.reason_folgevorgang');
    case 'manuell_priorisiert':
      return t('heute.reason_manuell_priorisiert');
    default:
      return '';
  }
}
