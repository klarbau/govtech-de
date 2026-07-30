'use client';

import * as React from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { format, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import {
  BadgeCheck,
  CalendarClock,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Clock,
  Copy,
  ExternalLink,
  FileSignature,
  Fingerprint,
  Gauge,
  Landmark,
  Lock,
  ShieldCheck,
  Users,
} from 'lucide-react';

import { HerkunftBadge } from '@/components/autopilot/HerkunftBadge';
import { ProtokollInspector } from '@/components/autopilot/ProtokollInspector';
import { UnterDerHaubeLeiste } from '@/components/autopilot/UnterDerHaubeLeiste';
import { WohngeldFolgeCard } from '@/components/dashboard/WohngeldFolgeCard';
import {
  AuthentizitaetsBadge,
  DEFAULT_AUTH_CHANNEL,
} from '@/components/posteingang/AuthentizitaetsBadge';
import { FristChip } from '@/components/posteingang/FristChip';
import {
  LaufzettelPanel,
  OrchestrationTestBridge,
  RecoveryBanner,
} from '@/components/orchestration';
import { DatenschutzCockpitLink } from '@/components/shared/DatenschutzCockpitLink';
import { FristDetailModal } from '@/components/shared/FristDetailModal';
import { PrototypeDisclaimer } from '@/components/shared/PrototypeDisclaimer';
import { TerminCard } from '@/components/shared/TerminCard';
import { Button } from '@/components/ui/button';
import {
  VorgangSchrittAuthDialog,
  type VorgangSchrittAuthMode,
} from '@/components/vorgaenge/VorgangSchrittAuthDialog';
import { api } from '@/lib/mock-backend';
import { cn } from '@/lib/utils';
import type {
  Adresse,
  AutopilotStep,
  AutopilotStepStatus,
  Behoerde,
  BehoerdeId,
  Document,
  Letter,
  Termin,
  ValueReceipt,
  Vorgang,
  VorgangStatus,
} from '@/types';

export interface VorgangUebersichtData {
  vorgang: Vorgang;
  letters: Letter[];
  termine: Termin[];
  behoerden: Behoerde[];
  relatedDocuments: Document[];
  receipt: ValueReceipt | null;
}

function readAdresseFromContext(
  context: Vorgang['context'],
  key: 'neue_adresse' | 'alte_adresse',
): Adresse | undefined {
  if (!context || typeof context !== 'object') return undefined;
  const value = (context as Record<string, unknown>)[key];
  if (!value || typeof value !== 'object') return undefined;
  const a = value as Record<string, unknown>;
  if (
    typeof a.strasse === 'string' &&
    typeof a.hausnummer === 'string' &&
    typeof a.plz === 'string' &&
    typeof a.ort === 'string'
  ) {
    return {
      strasse: a.strasse,
      hausnummer: a.hausnummer,
      zusatz: typeof a.zusatz === 'string' ? a.zusatz : undefined,
      plz: a.plz,
      ort: a.ort,
      land: 'DE',
    };
  }
  return undefined;
}

/** Einzugs-Stichtag des Umzugs — die § 17 BMG-Frist hängt an genau diesem Datum. */
function readStichtagFromContext(context: Vorgang['context']): string | undefined {
  if (!context || typeof context !== 'object') return undefined;
  const value =
    (context as Record<string, unknown>).stichtag ??
    (context as Record<string, unknown>).stichtag_iso;
  return typeof value === 'string' ? value : undefined;
}

function formatAdresse(a: Adresse): string {
  const line1 = [a.strasse, a.hausnummer, a.zusatz].filter(Boolean).join(' ');
  const line2 = [a.plz, a.ort].filter(Boolean).join(' ');
  return `${line1}, ${line2}`;
}

/** Ein bereits vollzogener Schritt — trägt garantiert einen Abschluss-Zeitpunkt. */
type CompletedStep = AutopilotStep & { completed_at: string };

/** Anzeige-Phase eines Schritts — treibt die CSS-Zustände via `data-phase`. */
type Phase = 'pending' | 'active' | 'eid' | 'done' | 'failed';

function phaseOf(status: AutopilotStepStatus): Phase {
  if (status === 'confirmed') return 'done';
  if (status === 'failed') return 'failed';
  if (status === 'needs_eid' || status === 'pending_eid_confirmation') return 'eid';
  if (status === 'in_progress') return 'active';
  return 'pending';
}

/** Schritt-Status, bei denen der Bürger am Zug ist. */
const CITIZEN_ACTION_STATUS: ReadonlySet<AutopilotStepStatus> = new Set([
  'needs_eid',
  'pending_eid_confirmation',
  'self_assigned',
]);

const STATUS_KEY_MAP: Record<AutopilotStepStatus, string> = {
  pending: 'pending',
  in_progress: 'in_progress',
  needs_eid: 'needs_eid',
  pending_eid_confirmation: 'in_progress',
  self_assigned: 'pending',
  confirmed: 'confirmed',
  failed: 'failed',
};

const STATUS_PILL: Record<VorgangStatus, { tone: '' | 'is-action' | 'is-error'; key: string }> = {
  angelegt: { tone: '', key: 'laeuft' },
  in_pruefung: { tone: '', key: 'laeuft' },
  genehmigt: { tone: '', key: 'abgeschlossen' },
  abgeschlossen: { tone: '', key: 'abgeschlossen' },
  abgelehnt: { tone: 'is-error', key: 'fehlerhaft' },
};

export function VorgangUebersichtView({
  data,
  id,
  reconcile,
}: {
  data: VorgangUebersichtData;
  id: string;
  reconcile: () => Promise<void>;
}) {
  const tv = useTranslations('vorgang.detail');
  const tu = useTranslations('vorgang.uebersicht');
  const tUmzug = useTranslations('umzug.detail');
  const { vorgang, letters, termine, behoerden, relatedDocuments, receipt } = data;

  const behoerdenById: Record<BehoerdeId, Pick<Behoerde, 'name_de' | 'kategorie'>> = {};
  for (const b of behoerden) {
    behoerdenById[b.id] = { name_de: b.name_de, kategorie: b.kategorie };
  }
  const behoerdeName = (bid: BehoerdeId) => behoerdenById[bid]?.name_de ?? bid;

  // Echtes Aktenzeichen aus dem ersten Brief mit gesetztem Feld — nie die
  // interne Vorgang-ID (ein Slug ist keine Behörden-Referenz).
  const aktenzeichen = letters.find((l) => l.aktenzeichen)?.aktenzeichen;

  // Block-C-Schritte des Umzugs sind private Selbst-Erinnerungen (PA-Aufkleber
  // u. a.), kein Behörden-Vollzug — sie gehören nicht in Timeline/Fortschritt.
  const steps =
    vorgang.typ === 'umzug'
      ? vorgang.schritte.filter((s) => s.block !== 'C')
      : vorgang.schritte;

  const totalCount = steps.length;
  const doneCount = steps.filter((s) => s.status === 'confirmed').length;
  const pct = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;

  const citizenStep = steps.find((s) => CITIZEN_ACTION_STATUS.has(s.status));
  const runningStep = steps.find((s) => s.status === 'in_progress');
  const waitingStep = steps.find((s) => s.status === 'pending');
  const nextStep = citizenStep ?? runningStep ?? waitingStep;
  const allDone = totalCount > 0 && !nextStep;
  const closed = vorgang.status === 'abgeschlossen' || vorgang.status === 'genehmigt';

  // Confirm-Typ: Termin-Systemleistung vor Einwilligung vor eID (Default).
  const nextStepMode: VorgangSchrittAuthMode | undefined = citizenStep
    ? citizenStep.requires_termin
      ? 'termin'
      : citizenStep.requires_consent
        ? 'consent'
        : 'eid'
    : undefined;

  // Eine Frist gilt nur, solange noch etwas aussteht.
  const naechsteFristIso = closed || allDone ? undefined : vorgang.fristen?.[0]?.datum;

  let fertigLabel = tv('fertigstellung_label');
  let fertigValue = tv('fertigstellung_value');
  if (closed && vorgang.abgeschlossen_am) {
    fertigLabel = tv('fertigstellung_label_done');
    fertigValue = format(parseISO(vorgang.abgeschlossen_am), 'd. MMMM yyyy', { locale: de });
  } else if (allDone) {
    fertigLabel = tv('fertigstellung_label_in_review');
  } else if (citizenStep) {
    fertigLabel = tv('fertigstellung_label_after_action');
  }

  const stellenCount = new Set(steps.map((s) => s.behoerde_id)).size;
  const bescheid = letters.find((l) => /bescheid/i.test(l.betreff));

  // Telefon (≤767): die wichtigste Aktion des aktuellen Zustands wandert in eine
  // fixierte Zone über der Bottom-Tab-Bar. Der Zustand steuert zugleich, welcher
  // Inline-CTA dort doppelt wäre (CSS, `data-msticky`).
  const stickyKind: 'action' | 'running' | 'bescheid' | null =
    citizenStep && nextStepMode
      ? 'action'
      : runningStep
        ? 'running'
        : closed && bescheid
          ? 'bescheid'
          : null;
  const adresseAlt = readAdresseFromContext(vorgang.context, 'alte_adresse');
  const adresseNeu = readAdresseFromContext(vorgang.context, 'neue_adresse');
  const stichtagIso = readStichtagFromContext(vorgang.context);

  const phaseLabel = closed
    ? tu('phase_closed')
    : nextStep
      ? (nextStep.agent_label ?? nextStep.aktion)
      : tu('phase_prepare');

  // Erledigt-Moment: eine stabile aria-live-Region + ein doneCount-Vergleich,
  // der Ansage und Fokus steuert. `pendingFocusRef` merkt einen fälligen
  // Fokus-Sprung vor, der erst NACH dem Dialog-Schluss ausgeführt wird.
  const [announcement, setAnnouncement] = React.useState('');
  const [justCompleted, setJustCompleted] = React.useState(false);
  const prevDoneRef = React.useRef<number | null>(null);
  const pendingFocusRef = React.useRef(false);

  // Autorisierungs-Dialog auf Seiten-Ebene (überlebt den Kartenwechsel, wenn
  // der laufende Schritt in_progress wird): der CTA öffnet nur den Dialog,
  // der Write sitzt im Dialog-Confirm.
  const [authStep, setAuthStep] = React.useState<{
    stepId: string;
    status: AutopilotStepStatus;
    mode: VorgangSchrittAuthMode;
    behoerdeName: string;
    datenkategorien: string[];
    eidPreview?: string;
  } | null>(null);

  const openAuth = () => {
    if (!citizenStep || !nextStepMode) return;
    setAuthStep({
      stepId: citizenStep.id,
      status: citizenStep.status,
      mode: nextStepMode,
      behoerdeName: behoerdeName(citizenStep.behoerde_id),
      datenkategorien: citizenStep.datenkategorien ?? [],
      eidPreview: citizenStep.eid_preview,
    });
  };

  const authorizeStep = async () => {
    if (!authStep) return;
    const { stepId, status } = authStep;
    try {
      // Welcher Write vollzieht den Schritt? Ein laufender Umzug ist eine
      // Engine-Saga: seine eID-Gates (Block D) laufen über
      // `bestaetigeAutopilotSchritt` (dessen Saga-Schritt-IDs tragen ebenfalls
      // das `<vorgangId>:`-Präfix — deshalb VOR dem Lebenslagen-Zweig prüfen).
      // Eine engine-gelaufene Lebenslage confirmt ihre eID-Gates über
      // `bestaetigeLebenslageSchritt`. Alles andere sind Seed-Schritte, die das
      // System über `starteVorgangSchritt` vollzieht.
      if (
        vorgang.typ === 'umzug' &&
        (status === 'needs_eid' || status === 'pending_eid_confirmation')
      ) {
        await api.bestaetigeAutopilotSchritt(vorgang.id, stepId);
      } else if (stepId.startsWith(`${vorgang.id}:`)) {
        await api.bestaetigeLebenslageSchritt(vorgang.id, stepId);
      } else {
        await api.starteVorgangSchritt(vorgang.id, stepId);
      }
    } catch (error) {
      toast.error(tv('step_done_error'));
      throw error; // Dialog offen lassen (Retry) — der Schritt bleibt unangetastet.
    }
    toast.success(tv('step_authorized_toast'));
    await reconcile();
  };

  React.useEffect(() => {
    const prev = prevDoneRef.current;
    prevDoneRef.current = doneCount;
    if (prev === null || doneCount <= prev) return;
    if (nextStep) {
      setAnnouncement(tv('step_done_live_next', { aktion: nextStep.aktion }));
    } else {
      setAnnouncement(tv('step_done_live_all'));
      setJustCompleted(true);
    }
    pendingFocusRef.current = true;
  }, [doneCount, nextStep, tv]);

  // Das Schritte-Regal startet beim ersten noch offenen Schritt statt bei
  // Schritt 01 — auf allen Breiten, sobald es überhaupt scrollt.
  const stepsRef = React.useRef<HTMLOListElement>(null);
  const openIndex = steps.findIndex((s) => s.status !== 'confirmed');
  React.useEffect(() => {
    const el = stepsRef.current;
    if (!el || openIndex <= 0) return;
    if (el.scrollWidth <= el.clientWidth + 8) return;
    const card = el.children[openIndex];
    const first = el.children[0];
    if (!(card instanceof HTMLElement) || !(first instanceof HTMLElement)) return;
    // Abstand ZUR ERSTEN KARTE statt zum Container: beide tragen im selben
    // Moment denselben Eintritts-Versatz (translateX), der sich so heraushebt.
    // Der Abstand IST der gesuchte Scroll-Weg — in RTL zählt er negativ.
    const rect = card.getBoundingClientRect();
    const firstRect = first.getBoundingClientRect();
    el.scrollLeft =
      getComputedStyle(el).direction === 'rtl'
        ? rect.right - firstRect.right
        : rect.left - firstRect.left;
  }, [openIndex]);

  // WCAG 2.4.3: Nach dem Vollzug ruht der Fokus sonst auf <body> — der
  // Dialog-Confirm-Button unmountet, und base-ui restauriert auf den ebenfalls
  // unmounteten Öffner-Trigger. Sobald der Dialog wirklich geschlossen ist,
  // setzen wir den Fokus explizit auf den neuen CTA (Kette) bzw. die Fertig-
  // Karte (letzter Schritt). Ein echtes Element AUSSERHALB des Dialogs bedeutet,
  // der Nutzer hat selbst weiterfokussiert → dann nicht stehlen.
  // Den CTA gibt es zweimal (Begleit-Leiste am Desktop, gepinnte Zone am
  // Telefon) — sichtbar ist immer genau einer, und der bekommt den Fokus.
  // Nach dem letzten Schritt gibt es keinen CTA mehr: dann fängt die Leiste im
  // Fertig-Zustand (Desktop) bzw. das Ergebnisband (Telefon) den Fokus.
  React.useEffect(() => {
    if (authStep !== null || !pendingFocusRef.current) return;
    let raf = 0;
    let attempts = 0;
    const step = () => {
      const active = document.activeElement as HTMLElement | null;
      const target =
        Array.from(document.querySelectorAll<HTMLElement>('[data-vd-cta]')).find(
          (el) => el.getClientRects().length > 0,
        ) ??
        Array.from(
          document.querySelectorAll<HTMLElement>('.pgv-dock.is-done, .pgv-result'),
        ).find((el) => el.getClientRects().length > 0);
      const inClosingDialog = Boolean(
        active?.closest('[data-slot="dialog-content"], [role="dialog"]'),
      );
      if (target && active === target) {
        pendingFocusRef.current = false;
        return;
      }
      if (active && active !== document.body && !inClosingDialog) {
        pendingFocusRef.current = false;
        return;
      }
      if (target && !inClosingDialog) target.focus();
      if (attempts++ < 40) {
        raf = requestAnimationFrame(step);
      } else {
        pendingFocusRef.current = false;
      }
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [authStep]);

  const protokoll = steps
    .filter((s): s is CompletedStep => s.status === 'confirmed' && Boolean(s.completed_at))
    .sort((a, b) => b.completed_at.localeCompare(a.completed_at));

  return (
    <>
      <VorgangBreadcrumb title={vorgang.titel} />

      <p aria-live="polite" className="sr-only">
        {announcement}
      </p>

      {/* Umzug-Saga-Resilienz (Spec § 5.1/§ 6.1): der Test-Seam
        * (`window.__orchestrationTest`) + das Recovery-Banner (DR-Signal, replayt
        * eine unterbrochene Saga). Umzug-only — geseedete/Lebenslagen-Vorgänge
        * haben keine Saga. Die e2e-Resilienz-Suite hängt an diesen Mounts. */}
      {vorgang.typ === 'umzug' ? (
        <>
          <OrchestrationTestBridge />
          <div className="mb-4">
            <RecoveryBanner sagaId={id} />
          </div>
        </>
      ) : null}

      <div className="pgv" data-msticky={stickyKind ?? undefined}>
        <div className="pgv-grid">
          <div className="pgv-main">
            <div className="pgv-head-row">
              <div className="pgv-title-col">
                <h1 className="pgv-h1">{vorgang.titel}</h1>
                <p className="pgv-h1-sub">
                  {vorgang.typ === 'umzug' ? tv('hero_sub') : tv('hero_sub_generic')}
                </p>
              </div>

              <section
                aria-labelledby="pgv-ov-title"
                className="pgv-card"
                style={{ padding: '18px 22px' }}
              >
                <div className="pgv-ov-head">
                  <div className="pgv-ov-label">
                    <h2 id="pgv-ov-title" className="pgv-ov-title">
                      {tu('overview_title')}
                    </h2>
                    <StatusPill status={vorgang.status} action={Boolean(citizenStep)} />
                  </div>
                  {aktenzeichen ? <AktenzeichenValue value={aktenzeichen} /> : null}
                </div>

                <div className="pgv-ov-metrics">
                  <div>
                    <Metric
                      icon={<Gauge size={20} aria-hidden="true" />}
                      value={tu('metric_progress_value', { pct })}
                      label={tu('metric_progress_label')}
                    />
                    <div
                      className="pgv-progress-track"
                      role="progressbar"
                      aria-valuenow={doneCount}
                      aria-valuemin={0}
                      aria-valuemax={totalCount}
                      aria-label={tv('progress_steps', { done: doneCount, total: totalCount })}
                    >
                      <div className="pgv-progress-fill" style={{ width: `${pct}%` }} />
                    </div>
                  </div>

                  {receipt ? (
                    <Metric
                      icon={<Clock size={20} aria-hidden="true" />}
                      value={tu('metric_time_value', {
                        minuten: receipt.geschaetzte_zeitersparnis_min,
                      })}
                      label={tu('metric_time_label')}
                    />
                  ) : null}

                  <Metric
                    icon={<BadgeCheck size={20} aria-hidden="true" />}
                    value={phaseLabel}
                    label={tu('metric_phase_label')}
                    small
                  />
                </div>

                <p className="pgv-ov-foot">
                  {tv('summary_angelegt_label')}:{' '}
                  {format(parseISO(vorgang.angelegt_am), 'd. MMMM yyyy', { locale: de })}
                  {stichtagIso ? (
                    <>
                      {' · '}
                      {tUmzug('stichtag_template', {
                        datum: format(parseISO(stichtagIso), 'd. MMMM yyyy', { locale: de }),
                      })}
                    </>
                  ) : null}
                  {naechsteFristIso ? (
                    <>
                      {' · '}
                      {tv('summary_frist_label')}:{' '}
                      {format(parseISO(naechsteFristIso), 'd. MMMM yyyy', { locale: de })}
                    </>
                  ) : null}
                </p>
              </section>
            </div>

            {adresseNeu ? <AdresseDiff alt={adresseAlt} neu={adresseNeu} /> : null}

            {closed ? (
              <Gesamtergebnis
                abgeschlossenAmIso={vorgang.abgeschlossen_am}
                stellenCount={stellenCount}
                receipt={receipt}
                bescheidId={bescheid?.id}
              />
            ) : null}

            {/* Wohngeld-Folge-Beat (anspruch-arc.md § 4.1, Beat a): direkt unter
              * dem Gesamtergebnis — nur beim abgeschlossenen Umzug + quali-
              * fizierter Persona. Self-fetching; rendert `null`, wenn nicht quali-
              * fiziert / dismissed / consent widerrufen. */}
            {receipt && vorgang.typ === 'umzug' && vorgang.persona_id ? (
              <WohngeldFolgeCard personaId={vorgang.persona_id} />
            ) : null}

            <section aria-labelledby="pgv-steps-title" className="pgv-card pgv-card-pad">
              <div className="pgv-ov-head">
                <div className="min-w-0">
                  <h2 id="pgv-steps-title" className="pgv-steps-title">
                    {tv('steps_overview_title')}
                  </h2>
                  <p className="pgv-steps-sub">{tv('steps_overview_sub')}</p>
                </div>
                <div className="pgv-steps-headright">
                  {totalCount > 0 ? (
                    <span className="pgv-steps-count">
                      {tv('progress_steps', { done: doneCount, total: totalCount })}
                    </span>
                  ) : null}
                  <ShelfPager
                    shelfRef={stepsRef}
                    prevLabel={tu('shelf_prev')}
                    nextLabel={tu('shelf_next')}
                  />
                </div>
              </div>

              {/* Karten-Regal statt Zeitstrahl (≤767 über `.m-shelf`, darüber über
                * die eigene Regal-Mechanik in vorgang-uebersicht.css) — jede Karte
                * trägt Behörde, Aktion, Rechtsgrundlage, Freigabe-Art und Status.
                * Als Scroll-Region fokussierbar (die Karten selbst enthalten
                * nichts Fokussierbares, WCAG 2.1.1); am Zeigergerät blättern
                * zusätzlich die Tasten im Kopf. */}
              <ol
                ref={stepsRef}
                tabIndex={0}
                aria-labelledby="pgv-steps-title"
                className="pgv-steps m-shelf pgv-steps-shelf rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                {steps.map((step, index) => (
                  <StepRow
                    key={step.id}
                    index={index}
                    step={step}
                    behoerdeName={behoerdeName(step.behoerde_id)}
                  />
                ))}
              </ol>

              <p className="pgv-steps-foot">
                <Lock size={14} aria-hidden="true" className="mt-0.5 shrink-0" />
                {tu('steps_foot')}
              </p>
            </section>

            {letters.length > 0 || relatedDocuments.length > 0 ? (
              <BescheideCard
                letters={letters}
                documents={relatedDocuments}
                behoerdeName={behoerdeName}
              />
            ) : null}

            {protokoll.length > 0 ? (
              <ProtokollCard steps={protokoll} behoerdeName={behoerdeName} />
            ) : null}

            {termine.length > 0 ? (
              <section aria-labelledby="pgv-termine-title" className="pgv-card pgv-card-pad">
                <h2 id="pgv-termine-title" className="pgv-steps-title">
                  {tv('termine_title', { count: termine.length })}
                </h2>
                <ul className="m-shelf pgv-termine-shelf mt-3 grid gap-3 sm:grid-cols-2">
                  {termine.map((termin) => (
                    <li key={termin.id}>
                      <TerminCard
                        termin={termin}
                        behoerde={
                          behoerdenById[termin.behoerde_id] ?? { name_de: termin.behoerde_id }
                        }
                      />
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
          </div>

          <div className="pgv-rail-col">
            <KontrolleRail
              steps={steps}
              stellenCount={stellenCount}
              fertigLabel={fertigLabel}
              fertigValue={fertigValue}
              vorgangId={id}
            />

            <div className="pgv-rail-foot">
              <PrototypeDisclaimer />
            </div>
          </div>
        </div>

        {stickyKind ? (
          <MobileActionBar
            kind={stickyKind}
            citizenStep={citizenStep}
            mode={nextStepMode}
            runningStep={runningStep}
            behoerdeName={runningStep ? behoerdeName(runningStep.behoerde_id) : ''}
            bescheidId={bescheid?.id}
            onAuthorize={openAuth}
          />
        ) : null}

        {/* Umzug-Transparenz-Fußzeile (Feature-Erhalt der Run-Seite, Review-
          * Auflagen): Engine-Laufzettel (Inspector), Herkunft, „Unter der Haube",
          * der § 17 BMG-Fristerklärer (dessen Bußgeld-Copy AUSSCHLIESSLICH im
          * FristDetailModal lebt) und der capability-gated Protokoll-Inspektor.
          * Umzug-only; die Resilienz-e2e hängt an diesen Mounts. */}
        {vorgang.typ === 'umzug' ? (
          <div className="mt-8 flex flex-col gap-5">
            <LaufzettelPanel sagaId={id} variant="inspector" behoerdenById={behoerdenById} />
            <div className="flex flex-col gap-2">
              <HerkunftBadge />
              <UnterDerHaubeLeiste vorgangId={id} inspectorPointer />
              <FristDetailModal />
            </div>
            <ProtokollInspector
              behoerdeName={behoerdenById['kfz-berlin-labo']?.name_de ?? ''}
            />
          </div>
        ) : null}

        {/* Letztes Kind von `.pgv` — Voraussetzung dafür, dass die Leiste beim
          * Scrollen schwebt und am Seitenende in ihren Flussplatz einrastet. */}
        <BegleitDock
          allDone={allDone}
          closed={closed}
          citizenStep={citizenStep}
          runningStep={runningStep}
          waitingStep={waitingStep}
          mode={nextStepMode}
          behoerdeName={nextStep ? behoerdeName(nextStep.behoerde_id) : ''}
          abgeschlossenAmIso={vorgang.abgeschlossen_am}
          stellenCount={stellenCount}
          bescheidId={bescheid?.id}
          focusOnMount={justCompleted}
          onAuthorize={openAuth}
        />
      </div>

      <VorgangSchrittAuthDialog
        open={authStep !== null}
        onOpenChange={(open) => {
          if (!open) setAuthStep(null);
        }}
        onConfirm={authorizeStep}
        mode={authStep?.mode ?? 'eid'}
        behoerdeName={authStep?.behoerdeName ?? ''}
        datenkategorien={authStep?.datenkategorien ?? []}
        eidPreview={authStep?.eidPreview}
      />
    </>
  );
}

/* ── Blättern in einem Karten-Regal (Zeigergerät; am Telefon wischt man) ──── */
function ShelfPager({
  shelfRef,
  prevLabel,
  nextLabel,
}: {
  shelfRef: React.RefObject<HTMLElement | null>;
  prevLabel: string;
  nextLabel: string;
}) {
  const [reach, setReach] = React.useState({ scrolls: false, atStart: true, atEnd: false });

  React.useEffect(() => {
    const el = shelfRef.current;
    if (!el) return;
    const update = () => {
      const max = el.scrollWidth - el.clientWidth;
      // RTL zählt `scrollLeft` negativ ab null — der Betrag ist in beiden
      // Schreibrichtungen der zurückgelegte Weg.
      const pos = Math.abs(el.scrollLeft);
      setReach({ scrolls: max > 8, atStart: pos <= 4, atEnd: pos >= max - 4 });
    };
    update();
    el.addEventListener('scroll', update, { passive: true });
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => {
      el.removeEventListener('scroll', update);
      observer.disconnect();
    };
  }, [shelfRef]);

  if (!reach.scrolls) return null;

  const page = (dir: 1 | -1) => {
    const el = shelfRef.current;
    if (!el) return;
    const rtl = getComputedStyle(el).direction === 'rtl';
    // Der Bedienhilfen-Schalter zählt wie die OS-Einstellung: ein explizit
    // übergebenes `behavior: 'smooth'` schlägt sonst das globale CSS-Reset.
    const reduce =
      window.matchMedia('(prefers-reduced-motion: reduce)').matches ||
      document.documentElement.classList.contains('a11y-reduce-motion');
    el.scrollBy({
      left: (rtl ? -dir : dir) * Math.max(el.clientWidth - 100, 200),
      behavior: reduce ? 'auto' : 'smooth',
    });
  };

  return (
    <span className="pgv-steps-pager">
      <button
        type="button"
        className="pgv-pager-btn"
        onClick={() => page(-1)}
        disabled={reach.atStart}
        aria-label={prevLabel}
      >
        <ChevronLeft size={16} aria-hidden="true" />
      </button>
      <button
        type="button"
        className="pgv-pager-btn"
        onClick={() => page(1)}
        disabled={reach.atEnd}
        aria-label={nextLabel}
      >
        <ChevronRight size={16} aria-hidden="true" />
      </button>
    </span>
  );
}

/* ── Eine Karte des Schritte-Regals ───────────────────────────────────────── */
function StepRow({
  index,
  step,
  behoerdeName,
}: {
  index: number;
  step: AutopilotStep;
  behoerdeName: string;
}) {
  const tRun = useTranslations('umzug.run');
  const tu = useTranslations('vorgang.uebersicht');
  const phase = phaseOf(step.status);
  const time = step.completed_at ?? step.started_at;
  const timeLabel = time ? format(parseISO(time), 'HH:mm', { locale: de }) : null;
  const primary = step.agent_label ?? step.aktion;

  const gateLabel = step.requires_termin
    ? tu('gate_termin')
    : step.requires_eid
      ? tu('gate_eid')
      : step.requires_consent
        ? tu('gate_consent')
        : tu('gate_auto');

  return (
    <li
      className={cn('pgv-row', phase === 'done' && 'is-done')}
      data-phase={phase}
      style={{ '--pgv-i': index } as React.CSSProperties}
    >
      <span className="pgv-railcell" aria-hidden="true">
        <span className="pgv-node">
          <span className="pgv-halo" />
          <span className="pgv-node-dot">
            {phase === 'done' ? (
              <svg
                width={13}
                height={13}
                viewBox="0 0 24 24"
                fill="none"
                stroke="#fff"
                strokeWidth={3.2}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path className="pgv-check-path" d="M20 6 9 17l-5-5" />
              </svg>
            ) : phase === 'eid' ? (
              <Fingerprint size={13} color="#fff" />
            ) : phase === 'active' ? (
              <Spinner size={15} />
            ) : null}
          </span>
        </span>
      </span>

      <span className="pgv-row-behoerde">
        <span className="pgv-row-index" aria-hidden="true">
          {String(index + 1).padStart(2, '0')}
        </span>
        <span className="min-w-0">{behoerdeName}</span>
      </span>

      <div className="pgv-row-aktion-cell min-w-0">
        <div className="pgv-row-aktion">{primary}</div>
        {primary !== step.aktion ? <div className="pgv-row-sub">{step.aktion}</div> : null}
        {step.rechtsgrundlage ? (
          <div className="pgv-row-basis">{step.rechtsgrundlage}</div>
        ) : null}
        {/* Datenminimierung sichtbar (Art. 5 Abs. 1 lit. c DSGVO): was in diesem
          * Hop tatsächlich übermittelt wurde — erst NACH dem Vollzug. */}
        {phase === 'done' && step.datenkategorien && step.datenkategorien.length > 0 ? (
          <div className="pgv-row-basis">
            {tu('row_daten', { kategorien: step.datenkategorien.join(', ') })}
          </div>
        ) : null}
      </div>

      <span className="pgv-row-badge">
        <span className="pgv-badge">{gateLabel}</span>
      </span>

      <div className="pgv-row-status">
        <span className={cn('pgv-status', `is-${phase}`)}>
          {phase === 'done' ? (
            <Check size={14} aria-hidden="true" />
          ) : phase === 'eid' ? (
            <Fingerprint size={14} aria-hidden="true" />
          ) : phase === 'active' ? (
            <Spinner size={14} />
          ) : phase === 'pending' ? (
            <Clock size={14} aria-hidden="true" />
          ) : null}
          <span>
            <span className="sr-only">{tu('status_sr')}: </span>
            {tRun(`status.${STATUS_KEY_MAP[step.status]}`)}
          </span>
        </span>
        {phase === 'done' && timeLabel ? (
          <div className="pgv-status-time">{tu('status_time', { zeit: timeLabel })}</div>
        ) : phase === 'eid' ? (
          <div className="pgv-status-time">{tu('status_sub_eid')}</div>
        ) : phase === 'active' ? (
          <div className="pgv-shimmer" aria-hidden="true" />
        ) : null}
      </div>
    </li>
  );
}

function Spinner({ size }: { size: number }) {
  return (
    <svg
      className="pgv-spin"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle cx={12} cy={12} r={9} stroke="var(--pgv-border)" strokeWidth={3.2} />
      <circle
        cx={12}
        cy={12}
        r={9}
        stroke="var(--pgv-brand)"
        strokeWidth={3.2}
        strokeLinecap="round"
        strokeDasharray={56.5}
        strokeDashoffset={34}
      />
    </svg>
  );
}

/* ── Nächster Schritt — der einzige confirm-gated CTA der Seite ───────────── */
const MODE_CTA: Record<
  VorgangSchrittAuthMode,
  {
    Icon: typeof Fingerprint;
    labelKey: 'next_step_cta_eid' | 'next_step_cta_consent' | 'next_step_cta_termin';
    subKey: 'next_sub_eid' | 'next_sub_consent' | 'next_sub_termin';
  }
> = {
  eid: { Icon: Fingerprint, labelKey: 'next_step_cta_eid', subKey: 'next_sub_eid' },
  consent: {
    Icon: ShieldCheck,
    labelKey: 'next_step_cta_consent',
    subKey: 'next_sub_consent',
  },
  termin: {
    Icon: CalendarClock,
    labelKey: 'next_step_cta_termin',
    subKey: 'next_sub_termin',
  },
};

/* ── Begleit-Leiste: der Zustand des Vorgangs läuft mit ───────────────────────
 * Ab 768px die einzige Zustands-/Handlungsfläche der Akte (die Schienen-Karte
 * ist darin aufgegangen). Kein `position: fixed`: die Leiste ist das letzte
 * Kind von `.pgv` und klebt per `position: sticky; bottom: 16px` über der
 * Viewport-Unterkante, bis sie am Seitenende in ihren eigenen Flussplatz
 * einrastet — nichts wird dauerhaft verdeckt. ≤767 bleibt die gepinnte
 * `MobileActionBar` zuständig; die Leiste ist dort ausgeblendet, sodass immer
 * genau EIN `[data-vd-cta]` sichtbar ist.
 */
type DockState = 'action' | 'running' | 'done' | 'waiting';

function BegleitDock({
  allDone,
  closed,
  citizenStep,
  runningStep,
  waitingStep,
  mode,
  behoerdeName,
  abgeschlossenAmIso,
  stellenCount,
  bescheidId,
  focusOnMount,
  onAuthorize,
}: {
  allDone: boolean;
  closed: boolean;
  citizenStep?: AutopilotStep;
  runningStep?: AutopilotStep;
  waitingStep?: AutopilotStep;
  mode?: VorgangSchrittAuthMode;
  behoerdeName: string;
  abgeschlossenAmIso?: string;
  stellenCount: number;
  bescheidId?: string;
  focusOnMount: boolean;
  onAuthorize: () => void;
}) {
  const tv = useTranslations('vorgang.detail');
  const tu = useTranslations('vorgang.uebersicht');
  const ref = React.useRef<HTMLElement>(null);

  const cta = mode ? MODE_CTA[mode] : undefined;
  // Reihenfolge wie beim Telefon-Pendant (`stickyKind`): der Bürger-Schritt
  // schlägt den laufenden, der laufende den Abschluss.
  const state: DockState =
    citizenStep && cta
      ? 'action'
      : runningStep
        ? 'running'
        : closed || allDone
          ? 'done'
          : 'waiting';

  React.useEffect(() => {
    if (state === 'done' && focusOnMount) ref.current?.focus();
  }, [state, focusOnMount]);

  const step = citizenStep ?? runningStep ?? waitingStep;
  const primary =
    state === 'done'
      ? closed
        ? tu('next_closed_title')
        : tv('no_next_step')
      : (step?.agent_label ?? step?.aktion ?? tu('next_waiting_title'));

  const sub =
    state === 'done'
      ? closed && abgeschlossenAmIso
        ? `${tv('fertigstellung_label_done')}: ${format(parseISO(abgeschlossenAmIso), 'd. MMMM yyyy', { locale: de })} · ${tu('kontrolle_stellen_value', { count: stellenCount })}`
        : tu('next_done_sub')
      : state === 'action' && cta
        ? `${behoerdeName} · ${tu(cta.subKey)}`
        : state === 'running'
          ? tu('next_running_sub', { behoerde: behoerdeName })
          : tu('next_waiting_sub');

  return (
    // FLIP-Layout-Animation: die Leiste ist in jedem Zustand fit-content +
    // mittig (CSS); wechselt der Inhalt (Action → Done), fährt `layout` die
    // Breitenänderung als eine Bewegung — die ganze Pille zieht sich über ihre
    // volle Länge zur Mitte zusammen. `layout="position"` auf den Kindern
    // verhindert Text-Verzerrung während des Scale-Frames. Reduced-Motion
    // (OS + manueller Schalter) deckt der globale <MotionProvider> ab.
    <motion.section
      ref={ref}
      layout
      transition={{ layout: { duration: 0.55, ease: [0.65, 0, 0.35, 1] } }}
      tabIndex={state === 'done' ? -1 : undefined}
      aria-label={tv('next_step_title')}
      data-state={state}
      className={cn(
        'pgv-dock focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
        state === 'done' && 'is-done',
      )}
    >
      <motion.span layout="position" className="pgv-dock-glyph" aria-hidden="true">
        {state === 'done' ? (
          <Check size={16} strokeWidth={3} />
        ) : state === 'action' && cta ? (
          <cta.Icon size={15} />
        ) : state === 'running' ? (
          <Spinner size={16} />
        ) : (
          <Clock size={15} />
        )}
      </motion.span>

      <motion.div layout="position" className="pgv-dock-text">
        <p className="pgv-dock-aktion">{primary}</p>
        <p className="pgv-dock-sub">{sub}</p>
      </motion.div>

      {state === 'action' && cta ? (
        <motion.div layout="position">
          <Button data-vd-cta onClick={onAuthorize}>
            <cta.Icon aria-hidden="true" />
            {tv(cta.labelKey)}
          </Button>
        </motion.div>
      ) : state === 'done' && bescheidId ? (
        <Link
          href={`/posteingang/${encodeURIComponent(bescheidId)}`}
          className="btn btn-secondary"
        >
          {tu('result_bescheid_cta')}
          <ExternalLink aria-hidden="true" />
        </Link>
      ) : null}
    </motion.section>
  );
}

/* ── Telefon: gepinnte Aktionszone (≤767) ─────────────────────────────────────
 * Die wichtigste Handlung des aktuellen Zustands liegt am Daumen, nie unter dem
 * Fold: Bürger-Schritt → derselbe confirm-gated CTA wie in der Schiene (der
 * Schienen-CTA ist ≤767 ausgeblendet, es bleibt genau EIN sichtbarer Auslöser),
 * laufender Schritt → ruhiger Status-Streifen, abgeschlossen → der Bescheid.
 * Ab 768px `display: none` (CSS) — Desktop-Tabreihenfolge unverändert.
 */
function MobileActionBar({
  kind,
  citizenStep,
  mode,
  runningStep,
  behoerdeName,
  bescheidId,
  onAuthorize,
}: {
  kind: 'action' | 'running' | 'bescheid';
  citizenStep?: AutopilotStep;
  mode?: VorgangSchrittAuthMode;
  runningStep?: AutopilotStep;
  behoerdeName: string;
  bescheidId?: string;
  onAuthorize: () => void;
}) {
  const tv = useTranslations('vorgang.detail');
  const tu = useTranslations('vorgang.uebersicht');

  if (kind === 'action' && citizenStep && mode) {
    const cta = MODE_CTA[mode];
    return (
      <div className="pgv-msticky" data-kind="action">
        <p className="pgv-msticky-context">
          {citizenStep.agent_label ?? citizenStep.aktion}
        </p>
        <Button size="lg" data-vd-cta onClick={onAuthorize}>
          <cta.Icon aria-hidden="true" />
          {tv(cta.labelKey)}
        </Button>
      </div>
    );
  }

  if (kind === 'running' && runningStep) {
    return (
      <div className="pgv-msticky" data-kind="running">
        <p className="pgv-msticky-status">
          <Spinner size={15} />
          {/* Zustand vorn: die Zeile wird am Telefon beschnitten, und was
            * überlebt, muss die Aussage tragen. */}
          <span className="min-w-0 flex-1">
            {tu('sticky_running', { behoerde: behoerdeName })}
          </span>
        </p>
      </div>
    );
  }

  if (kind === 'bescheid' && bescheidId) {
    return (
      <div className="pgv-msticky" data-kind="bescheid">
        <Link
          href={`/posteingang/${encodeURIComponent(bescheidId)}`}
          className="btn btn-primary"
        >
          {tu('result_bescheid_cta')}
          <ExternalLink aria-hidden="true" />
        </Link>
      </div>
    );
  }

  return null;
}

/* ── „Ihre Kontrolle" ─────────────────────────────────────────────────────── */
function KontrolleRail({
  steps,
  stellenCount,
  fertigLabel,
  fertigValue,
  vorgangId,
}: {
  steps: AutopilotStep[];
  stellenCount: number;
  fertigLabel: string;
  fertigValue: string;
  vorgangId: string;
}) {
  const tv = useTranslations('vorgang.detail');
  const tu = useTranslations('vorgang.uebersicht');

  // Ehrlicher Nenner: nur Schritte, die überhaupt eine Freigabe brauchen.
  const gates = steps.filter((s) => s.requires_consent || s.requires_eid);
  const givenCount = gates.filter((s) => s.consent_given_at || s.eid_confirmed_at).length;

  return (
    <section aria-labelledby="pgv-kontrolle-title" className="pgv-kontrolle">
      <h2 id="pgv-kontrolle-title" className="pgv-rail-title pgv-hide-phone">
        {tu('kontrolle_title')}
      </h2>

      <MobileDisclosure id="pgv-kontrolle-body" title={tu('kontrolle_title')}>
        <div className="pgv-card pgv-krows mt-3">
          {gates.length > 0 ? (
            <KontrolleRow
              Icon={FileSignature}
              title={tu('kontrolle_freigaben_title')}
              value={tu('kontrolle_freigaben_value', {
                given: givenCount,
                total: gates.length,
              })}
              sub={tu('kontrolle_freigaben_sub')}
            />
          ) : null}
          <KontrolleRow
            Icon={ShieldCheck}
            title={tu('kontrolle_datenschutz_title')}
            value={tu('kontrolle_datenschutz_value')}
          />
          <KontrolleRow Icon={CalendarClock} title={fertigLabel} value={fertigValue} />
          <KontrolleRow
            Icon={Users}
            title={tv('summary_behoerden_label')}
            value={tu('kontrolle_stellen_value', { count: stellenCount })}
          />
        </div>

        <div className="pgv-card pgv-card-pad mt-4">
          <h3 className="pgv-card-title">{tu('erledigt_title')}</h3>
          <ul className="pgv-check-list">
            {steps.map((s) => {
              const done = s.status === 'confirmed';
              return (
                <li key={s.id} className={cn('pgv-check-item', done && 'is-done')}>
                  <span className="pgv-check-mark" aria-hidden="true">
                    {done ? <Check size={11} strokeWidth={3.4} /> : null}
                  </span>
                  <span className="min-w-0">
                    <span className="sr-only">
                      {done ? tu('erledigt_sr_done') : tu('erledigt_sr_open')}:{' '}
                    </span>
                    {s.agent_label ?? s.aktion}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="pgv-tint mt-4 p-4">
          <p className="pgv-card-title mb-1">{tu('datenschutz_title')}</p>
          <p className="pgv-krow-sub mb-3">{tv('datenschutz_sub')}</p>
          <DatenschutzCockpitLink vorgangId={vorgangId} />
        </div>
      </MobileDisclosure>
    </section>
  );
}

function KontrolleRow({
  Icon,
  title,
  value,
  sub,
}: {
  Icon: typeof ShieldCheck;
  title: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="pgv-krow">
      <span className="pgv-tile" aria-hidden="true">
        <Icon size={18} />
      </span>
      <div className="min-w-0">
        <div className="pgv-krow-title">{title}</div>
        <div className="pgv-krow-value">{value}</div>
        {sub ? <div className="pgv-krow-sub">{sub}</div> : null}
      </div>
    </div>
  );
}

/* ── Gesamtergebnis (nur bei abgeschlossenem Vorgang) ─────────────────────── */
function Gesamtergebnis({
  abgeschlossenAmIso,
  stellenCount,
  receipt,
  bescheidId,
}: {
  abgeschlossenAmIso?: string;
  stellenCount: number;
  receipt: ValueReceipt | null;
  bescheidId?: string;
}) {
  const tu = useTranslations('vorgang.uebersicht');
  const datum = abgeschlossenAmIso
    ? format(parseISO(abgeschlossenAmIso), 'd. MMMM yyyy', { locale: de })
    : null;

  return (
    // `tabIndex={-1}`: am Telefon ist die Begleit-Leiste ausgeblendet — dann ist
    // dieses Band das Fokusziel nach dem letzten Vollzug (WCAG 2.4.3).
    <section
      aria-labelledby="pgv-result-title"
      tabIndex={-1}
      className="pgv-tint pgv-result focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
    >
      <h2 id="pgv-result-title" className="pgv-result-kicker">
        {tu('result_title')}
      </h2>
      <div className="pgv-result-grid">
        <div>
          <div className="pgv-result-lead">
            <span className="pgv-result-mark" aria-hidden="true">
              <Check size={15} strokeWidth={3} />
            </span>
            <div>
              <div className="pgv-result-status">{tu('result_status')}</div>
              <p className="pgv-result-body">{tu('result_body')}</p>
            </div>
          </div>
          {bescheidId ? (
            <Link
              href={`/posteingang/${encodeURIComponent(bescheidId)}`}
              className="btn btn-primary pgv-result-cta mt-4"
            >
              {tu('result_bescheid_cta')}
              <ExternalLink aria-hidden="true" />
            </Link>
          ) : null}
        </div>

        {datum ? (
          <ResultStat
            Icon={CalendarClock}
            label={tu('result_datum_label')}
            value={datum}
          />
        ) : null}

        <ResultStat
          Icon={Landmark}
          label={tu('result_stellen_label')}
          value={tu('result_stellen_value', { count: stellenCount })}
        />

        {receipt ? (
          <ResultStat
            Icon={Clock}
            label={tu('metric_time_label')}
            value={tu('metric_time_value', { minuten: receipt.geschaetzte_zeitersparnis_min })}
            sub={tu('result_zeit_sub')}
          />
        ) : null}
      </div>
    </section>
  );
}

function ResultStat({
  Icon,
  label,
  value,
  sub,
}: {
  Icon: typeof Clock;
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="flex gap-2.5">
      <span className="mt-0.5 flex shrink-0 text-[var(--pgv-muted)]" aria-hidden="true">
        <Icon size={20} />
      </span>
      <div className="min-w-0">
        <div className="pgv-result-stat-label">{label}</div>
        <div className="pgv-result-stat-value">{value}</div>
        {sub ? <div className="pgv-result-stat-sub">{sub}</div> : null}
      </div>
    </div>
  );
}

/* ── Adressänderung (Umzug) ───────────────────────────────────────────────── */
function AdresseDiff({ alt, neu }: { alt?: Adresse; neu: Adresse }) {
  const t = useTranslations('umzug.detail');
  return (
    <div className="pgv-card pgv-card-pad">
      <dl className="grid gap-3 sm:grid-cols-[auto_1fr] sm:items-baseline">
        <dt className="pgv-result-stat-label">{t('adresse_alt')}</dt>
        <dd className="pgv-row-aktion line-through">{alt ? formatAdresse(alt) : '—'}</dd>
        <dt className="pgv-result-stat-label">{t('adresse_neu')}</dt>
        <dd className="pgv-list-title">{formatAdresse(neu)}</dd>
      </dl>
    </div>
  );
}

/* ── Bescheide & Nachweise ────────────────────────────────────────────────── */
function BescheideCard({
  letters,
  documents,
  behoerdeName,
}: {
  letters: Letter[];
  documents: Document[];
  behoerdeName: (id: BehoerdeId) => string;
}) {
  const tu = useTranslations('vorgang.uebersicht');
  const listRef = React.useRef<HTMLUListElement>(null);
  return (
    <section aria-labelledby="pgv-bescheide-title" className="pgv-card pgv-card-pad">
      <div className="pgv-ov-head">
        <h2 id="pgv-bescheide-title" className="pgv-steps-title min-w-0">
          {tu('bescheide_title')}
        </h2>
        <div className="pgv-steps-headright">
          <ShelfPager
            shelfRef={listRef}
            prevLabel={tu('shelf_prev_eintraege')}
            nextLabel={tu('shelf_next_eintraege')}
          />
        </div>
      </div>
      {/* Karten-Regal wie bei den Schritten. Jede Karte trägt einen Link → die
        * Scroll-Region hat fokussierbare Kinder und braucht keinen eigenen
        * Tab-Stop (WCAG 2.1.1, axe `scrollable-region-focusable`). */}
      <ul ref={listRef} className="pgv-list m-shelf pgv-bescheide-shelf mt-2">
        {letters.map((letter, index) => {
          // Signal-Chrome wie auf der LetterCard: der Empfangskanal belegt die
          // Echtheit, die Frist bleibt am Brief sichtbar. Eine Frist auf einem
          // erledigten Brief ist kein offenes Signal mehr (LetterCard `row`).
          const frist = letter.status === 'erledigt' ? undefined : letter.fristen?.[0];
          return (
            <li key={letter.id} style={{ '--pgv-i': index } as React.CSSProperties}>
              <Link
                href={`/posteingang/${encodeURIComponent(letter.id)}`}
                className="pgv-list-link"
              >
                <span className="min-w-0 flex-1">
                  <span className="pgv-list-title block">{letter.betreff}</span>
                  <span className="pgv-list-meta block">
                    {behoerdeName(letter.absender_behoerde_id)}
                    {letter.aktenzeichen ? ` · ${letter.aktenzeichen}` : ''}
                  </span>
                  <span className="pgv-list-signals">
                    {frist ? <FristChip frist={frist} /> : null}
                    <AuthentizitaetsBadge
                      channel={letter.auth_channel ?? DEFAULT_AUTH_CHANNEL}
                      variant="tiny-icon-only"
                    />
                  </span>
                </span>
                <ChevronRight size={17} aria-hidden="true" className="shrink-0 opacity-60" />
              </Link>
            </li>
          );
        })}
        {documents.map((doc, index) => (
          <li
            key={doc.id}
            style={{ '--pgv-i': letters.length + index } as React.CSSProperties}
          >
            <Link href="/dokumente" className="pgv-list-link">
              <span className="min-w-0 flex-1">
                <span className="pgv-list-title block">{doc.titel}</span>
                <span className="pgv-list-meta block">
                  {behoerdeName(doc.ausstellende_behoerde_id)}
                  {doc.watermark ? ` · ${doc.watermark}` : ''}
                </span>
              </span>
              <ChevronRight size={17} aria-hidden="true" className="shrink-0 opacity-60" />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

/* ── Aktivitätsprotokoll ──────────────────────────────────────────────────── */
/** Sichtbare Einträge vor dem Aufklappen — der Rest bleibt einen Klick entfernt. */
const PROTOKOLL_PREVIEW = 5;

function ProtokollCard({
  steps,
  behoerdeName,
}: {
  steps: CompletedStep[];
  behoerdeName: (id: BehoerdeId) => string;
}) {
  const tu = useTranslations('vorgang.uebersicht');
  const [expanded, setExpanded] = React.useState(false);
  const visible = expanded ? steps : steps.slice(0, PROTOKOLL_PREVIEW);
  return (
    <section
      aria-labelledby="pgv-protokoll-title"
      className="pgv-card pgv-card-pad pgv-protokoll"
    >
      <h2 id="pgv-protokoll-title" className="pgv-steps-title pgv-hide-phone">
        {tu('protokoll_title')}
      </h2>
      <MobileDisclosure id="pgv-protokoll-body" title={tu('protokoll_title')}>
        <ul id="pgv-protokoll-list" className="pgv-list mt-2">
          {visible.map((step) => (
            <li key={step.id}>
              <div className="pgv-list-row">
                <span className="pgv-list-time">
                  {format(parseISO(step.completed_at), 'd. MMM, HH:mm', { locale: de })}
                </span>
                <span className="pgv-log-text">
                  <span className="pgv-log-behoerde">{behoerdeName(step.behoerde_id)}</span>
                  {' — '}
                  {step.agent_label ?? step.aktion}
                </span>
              </div>
            </li>
          ))}
        </ul>
        {steps.length > PROTOKOLL_PREVIEW ? (
          <button
            type="button"
            className="pgv-log-toggle"
            aria-expanded={expanded}
            aria-controls="pgv-protokoll-list"
            onClick={() => setExpanded((value) => !value)}
          >
            {expanded
              ? tu('protokoll_show_less')
              : tu('protokoll_show_all', { count: steps.length })}
            {expanded ? (
              <ChevronUp size={15} aria-hidden="true" />
            ) : (
              <ChevronDown size={15} aria-hidden="true" />
            )}
          </button>
        ) : null}
      </MobileDisclosure>
    </section>
  );
}

/* ── Telefon-Disclosure ───────────────────────────────────────────────────────
 * Textzeilen-Blöcke (Kontrolle, Protokoll) bauen am Telefon das „Polotno".
 * ≤767 kollabieren sie hinter eine Überschrift-Taste; ab 768 ist der Wrapper
 * layoutneutral (`display: contents`) und der Rumpf immer offen — die Taste ist
 * dort ausgeblendet, also weder sicht- noch fokussierbar. Kein JS-Viewport-
 * Zweig: die Breakpoint-Entscheidung trifft ausschließlich CSS.
 */
function MobileDisclosure({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = React.useState(false);
  return (
    <div className="pgv-mdisc" data-open={open ? 'true' : 'false'}>
      <h2 className="pgv-mdisc-head">
        <button
          type="button"
          className="pgv-mdisc-btn"
          aria-expanded={open}
          aria-controls={id}
          onClick={() => setOpen((v) => !v)}
        >
          <span className="min-w-0">{title}</span>
          <ChevronDown size={18} aria-hidden="true" className="pgv-mdisc-chev" />
        </button>
      </h2>
      <div id={id} className="pgv-mdisc-body">
        {children}
      </div>
    </div>
  );
}

/* ── Kleinteile ───────────────────────────────────────────────────────────── */
function Metric({
  icon,
  value,
  label,
  small,
}: {
  icon: React.ReactNode;
  value: string;
  label: string;
  small?: boolean;
}) {
  return (
    <div className="pgv-metric">
      <span className="pgv-metric-icon">{icon}</span>
      <div className="min-w-0">
        <div className={cn('pgv-metric-value', small && 'is-small')}>{value}</div>
        <div className="pgv-metric-label">{label}</div>
      </div>
    </div>
  );
}

function StatusPill({ status, action }: { status: VorgangStatus; action: boolean }) {
  const t = useTranslations('umzug.detail');
  const tu = useTranslations('vorgang.uebersicht');
  const cfg = STATUS_PILL[status];
  const isAction = action && cfg.tone === '';
  const label = isAction ? tu('pill_action') : t(`status.${cfg.key}`);
  return (
    <span className={cn('pgv-pill', isAction ? 'is-action' : cfg.tone)}>
      {isAction ? (
        <Fingerprint size={13} aria-hidden="true" />
      ) : (
        <Check size={13} aria-hidden="true" />
      )}
      {label}
    </span>
  );
}

function AktenzeichenValue({ value }: { value: string }) {
  const tv = useTranslations('vorgang.detail');
  const [copied, setCopied] = React.useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard?.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      // Clipboard unavailable (insecure context / denied) — no-op.
    }
  };

  return (
    <span className="pgv-aktz">
      <span>
        {tv('aktenzeichen_label')}: <span className="pgv-aktz-value">{value}</span>
      </span>
      <button
        type="button"
        onClick={handleCopy}
        aria-label={tv('aktenzeichen_copy_aria')}
        className={cn('pgv-copy', copied && 'is-copied')}
      >
        {copied ? (
          <Check size={14} aria-hidden="true" />
        ) : (
          <Copy size={14} aria-hidden="true" />
        )}
      </button>
    </span>
  );
}

function VorgangBreadcrumb({ title }: { title: string }) {
  const tCrumb = useTranslations('shell.breadcrumb');
  const tNav = useTranslations('nav');
  return (
    <nav aria-label={tCrumb('aria_label')} className="breadcrumb">
      <ol className="breadcrumb-list">
        <li className="breadcrumb-item">
          <Link href="/dashboard" className="breadcrumb-link">
            {tCrumb('home')}
          </Link>
          <span className="breadcrumb-sep" aria-hidden="true">
            ›
          </span>
        </li>
        <li className="breadcrumb-item">
          <Link href="/vorgaenge" className="breadcrumb-link">
            {tNav('vorgaenge')}
          </Link>
          <span className="breadcrumb-sep" aria-hidden="true">
            ›
          </span>
        </li>
        <li className="breadcrumb-item">
          <span className="breadcrumb-current" aria-current="page">
            {title}
          </span>
        </li>
      </ol>
    </nav>
  );
}
