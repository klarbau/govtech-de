'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { format, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { toast } from 'sonner';
import {
  AlertCircle,
  ArrowRight,
  Briefcase,
  Building2,
  Calendar,
  CalendarClock,
  Car,
  Check,
  CheckCircle2,
  ChevronDown,
  Clock,
  Copy,
  Euro,
  FileText,
  Fingerprint,
  HeartPulse,
  Landmark,
  ListChecks,
  Loader2,
  ShieldCheck,
  Tv,
} from 'lucide-react';

import { UebermittlungsReceipt } from '@/components/autopilot/UebermittlungsReceipt';
import { ValueReceiptCard } from '@/components/autopilot/ValueReceiptCard';
import { LetterCard } from '@/components/posteingang/LetterCard';
import { BehoerdenBadge } from '@/components/shared/BehoerdenBadge';
import { Button } from '@/components/ui/button';
import { DatenschutzCockpitLink } from '@/components/shared/DatenschutzCockpitLink';
import { PrototypeDisclaimer } from '@/components/shared/PrototypeDisclaimer';
import { Skeleton } from '@/components/shared/Skeleton';
import { TerminCard } from '@/components/shared/TerminCard';
import {
  VorgangSchrittAuthDialog,
  type VorgangSchrittAuthMode,
} from '@/components/vorgaenge/VorgangSchrittAuthDialog';
import { api, MockBackendError } from '@/lib/mock-backend';
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

interface VorgangDetailLoaderProps {
  id: string;
}

interface LoadedState {
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

/**
 * Kanonische Akten-Route eines Vorgangs mit eigenem Dossier — /vorgaenge/[id]
 * dispatcht dorthin statt eine zweite, abweichende Ansicht derselben Akte zu
 * rendern (Lifecycle-Modell „Akte statt Video": EINE Seite pro Vorgang).
 * Umzug-Saga → Run-/Dossier-Seite; engine-gelaufene Lebenslagen (Cascade-
 * Step-IDs tragen das `<vorgangId>:`-Präfix, siehe engine.stepIdFor) → ihr
 * Kaskaden-Dossier. Seeded-/Stub-Vorgänge mit Bürger-Schritten (z. B.
 * Aufenthaltstitel-Stub, Kindergeld-Aktualisierung) haben kein Dossier und
 * bleiben auf dieser Detailseite. Fehlt der Katalog transient, rendert die
 * Detailseite als Fallback weiter.
 */
async function canonicalDossierHref(vorgang: Vorgang): Promise<string | null> {
  if (vorgang.typ === 'umzug') {
    return `/vorgaenge/umzug/run?vorgangId=${encodeURIComponent(vorgang.id)}`;
  }
  const engineRun = vorgang.schritte.some((s) => s.id.startsWith(`${vorgang.id}:`));
  if (!engineRun) return null;
  try {
    const catalog = await api.getLebenslagen();
    const slug = catalog.find((e) => e.vorgangTyp === vorgang.typ)?.slug;
    return slug
      ? `/lebenslagen/${encodeURIComponent(slug)}/cascade?vorgangId=${encodeURIComponent(vorgang.id)}`
      : null;
  } catch {
    return null;
  }
}

export function VorgangDetailLoader({ id }: VorgangDetailLoaderProps) {
  const router = useRouter();
  const [state, setState] = React.useState<
    | { kind: 'loading' }
    | { kind: 'ready'; data: LoadedState }
    | { kind: 'not-found' }
  >({ kind: 'loading' });

  const load = React.useCallback(async (opts?: { silent?: boolean }) => {
    // `silent` = In-Place-Reconcile nach einer Aktion: kein Skeleton, die Seite
    // bleibt gemountet, nur der frische Datenstand wird eingespielt. Sonst
    // identischer Rumpf (inkl. Transient-Retry + Dossier-Dispatch).
    if (!opts?.silent) setState({ kind: 'loading' });
    let vorgang: Vorgang | undefined;
    let letters: Letter[] = [];
    let termine: Termin[] = [];
    // The mock backend simulates a ~5% transient error rate — only a real
    // VORGANG_NOT_FOUND may render the not-found screen; transient failures
    // get retried instead of masquerading as a deleted Vorgang.
    for (let attempt = 0; attempt < 3 && !vorgang; attempt++) {
      try {
        const [v, l, te] = await Promise.all([
          api.getVorgang(id),
          api.getLetters({ vorgang_id: id }).catch(() => [] as Letter[]),
          api.getTermine().catch(() => [] as Termin[]),
        ]);
        vorgang = v;
        letters = l;
        termine = te.filter((tx) => tx.vorgang_id === id);
      } catch (e) {
        if (e instanceof MockBackendError && e.code === 'VORGANG_NOT_FOUND') break;
      }
    }
    if (!vorgang) {
      setState({ kind: 'not-found' });
      return;
    }

    const dossierHref = await canonicalDossierHref(vorgang);
    if (dossierHref) {
      router.replace(dossierHref);
      return; // Skeleton bleibt stehen, bis die kanonische Seite übernimmt.
    }

    // One retry: a transient mock error here degrades every Behörden-Name on
    // the screen to its slug (timeline, action band).
    let behoerden: Behoerde[] = [];
    try {
      behoerden = await api.getBehoerden();
    } catch {
      behoerden = await api.getBehoerden().catch(() => [] as Behoerde[]);
    }

    // A4 / B1: completed Umzug shows its value receipt; C5 guard keeps the
    // receipt fetch scoped to umzug + abgeschlossen.
    let receipt: ValueReceipt | null = null;
    if (vorgang.typ === 'umzug' && vorgang.status === 'abgeschlossen') {
      try {
        receipt = await api.getValueReceipt(id);
      } catch {
        receipt = null;
      }
    }

    let relatedDocuments: Document[] = [];
    try {
      const related = await api.getVorgangRelated(id);
      relatedDocuments = related.documents;
    } catch {
      relatedDocuments = [];
    }

    setState({
      kind: 'ready',
      data: { vorgang, letters, termine, behoerden, relatedDocuments, receipt },
    });
  }, [id, router]);

  const reconcile = React.useCallback(() => load({ silent: true }), [load]);

  React.useEffect(() => {
    void load();
  }, [load]);

  // Live-Vollzug: nach einer Autorisierung streamt `starteVorgangSchritt` die
  // Übergänge `in_progress` → `letter_received` → `confirmed` über den
  // In-Process-EventBus. Auf diesen Vorgang gefiltert, löst jedes Event einen
  // stillen Reconcile aus (kein Skeleton) → die Timeline rendert live, dann die
  // geshippte Erledigt-Choreo. Max. 3 Reconciles je Lauf (kein Debounce nötig).
  React.useEffect(() => {
    return api.subscribe((event) => {
      const relevant =
        (event.type === 'autopilot_step' && event.vorgangId === id) ||
        (event.type === 'letter_received' && event.letter.vorgang_id === id);
      if (relevant) void load({ silent: true });
    });
  }, [id, load]);

  if (state.kind === 'loading') {
    return <VorgangDetailSkeleton />;
  }

  if (state.kind === 'not-found') {
    return <VorgangDetailNotFound />;
  }

  return <VorgangDetail data={state.data} id={id} reconcile={reconcile} />;
}

function VorgangDetailSkeleton() {
  const tCommon = useTranslations('common');
  return (
    <div role="status" aria-busy="true">
      <span className="sr-only">{tCommon('loading')}</span>
      <div className="gt-page-head">
        <Skeleton shape="text" className="h-8 w-64" />
        <Skeleton shape="text" className="mt-2 w-48" />
      </div>
      <div className="vg-layout">
        <div className="flex flex-col gap-6">
          <Skeleton className="h-40 rounded-2xl" />
          <Skeleton className="h-56 rounded-2xl" />
        </div>
        <Skeleton className="h-72 rounded-2xl" />
      </div>
    </div>
  );
}

function VorgangDetailNotFound() {
  const t = useTranslations('umzug.detail');
  return (
    <>
      <div className="gt-page-head">
        <h1>{t('not_found_title')}</h1>
        <div className="sub">{t('not_found_body')}</div>
      </div>
      <Link href="/dashboard" className="btn btn-secondary">
        <ArrowRight aria-hidden="true" />
        {t('back_to_dashboard')}
      </Link>
    </>
  );
}

/** Step statuses that put the ball in the citizen's court. */
const CITIZEN_ACTION_STATUS: ReadonlySet<AutopilotStepStatus> = new Set([
  'needs_eid',
  'pending_eid_confirmation',
  'self_assigned',
]);

function pickNextStep(steps: AutopilotStep[]): AutopilotStep | undefined {
  return (
    steps.find((s) => CITIZEN_ACTION_STATUS.has(s.status)) ??
    steps.find((s) => s.status === 'pending')
  );
}

/** Step statuses that count as the currently-active step for the progress bar. */
const IN_PROGRESS_STATUS: ReadonlySet<AutopilotStepStatus> = new Set([
  'in_progress',
  'needs_eid',
  'pending_eid_confirmation',
  'self_assigned',
]);

/* Per-authority glyph for the step tile — matched by name (mirrors the
 * ICONS_BY_BLOCK_OR_NAME approach on the Umzug-run page). Falls back to a
 * neutral building glyph. */
function behoerdeStepIcon(name: string): typeof Building2 {
  const lower = name.toLowerCase();
  if (lower.includes('finanzamt')) return Euro;
  if (lower.includes('krankenkasse') || lower.includes('aok') || lower.startsWith('tk')) {
    return HeartPulse;
  }
  if (lower.includes('beitragsservice') || lower.includes('rundfunk')) return Tv;
  if (lower.includes('zulassung') || lower.includes('kfz') || lower.includes('fahrzeug')) {
    return Car;
  }
  if (lower.includes('arbeitgeber') || lower.includes('arbeit')) return Briefcase;
  if (lower.includes('bundesdruckerei') || lower.includes('ausweis')) return Landmark;
  if (
    lower.includes('bürger') ||
    lower.includes('burger') ||
    lower.includes('meldebehörde') ||
    lower.includes('einwohner')
  ) {
    return Building2;
  }
  return Building2;
}

function VorgangDetail({
  data,
  id,
  reconcile,
}: {
  data: LoadedState;
  id: string;
  reconcile: () => Promise<void>;
}) {
  const t = useTranslations('umzug.detail');
  const tv = useTranslations('vorgang.detail');
  const reduce = useReducedMotion();
  const { vorgang, letters, termine, behoerden, relatedDocuments, receipt } = data;

  const behoerdenById: Record<BehoerdeId, Pick<Behoerde, 'name_de' | 'kategorie'>> = {};
  for (const b of behoerden) {
    behoerdenById[b.id] = { name_de: b.name_de, kategorie: b.kategorie };
  }

  const lettersById: Record<string, Pick<Letter, 'aktenzeichen' | 'betreff' | 'id'>> = {};
  for (const l of letters) {
    lettersById[l.id] = { aktenzeichen: l.aktenzeichen, betreff: l.betreff, id: l.id };
  }

  // Echtes Aktenzeichen aus dem ersten Brief mit gesetztem Feld — nie die
  // interne Vorgang-ID (ein Slug ist keine Behörden-Referenz). Fehlt es, wird
  // die Zeile ausgelassen.
  const aktenzeichen = letters.find((l) => l.aktenzeichen)?.aktenzeichen;

  const adresseAlt = readAdresseFromContext(vorgang.context, 'alte_adresse');
  const adresseNeu = readAdresseFromContext(vorgang.context, 'neue_adresse');
  const stichtag = readStichtagFromContext(vorgang.context);

  const nextStep = pickNextStep(vorgang.schritte);
  const nextBehoerde = nextStep ? behoerdenById[nextStep.behoerde_id] : undefined;

  // Confirm-Typ des nächsten Schritts — nur wenn der Bürger am Zug ist. Termin-
  // Systemleistung vor Einwilligung vor eID (Default). Ein reiner Warte-Schritt
  // (pending/in_progress) trägt keinen Autorisierungs-CTA.
  const nextStepMode: VorgangSchrittAuthMode | undefined =
    nextStep && CITIZEN_ACTION_STATUS.has(nextStep.status)
      ? nextStep.requires_termin
        ? 'termin'
        : nextStep.requires_consent
          ? 'consent'
          : 'eid'
      : undefined;

  const doneCount = vorgang.schritte.filter((s) => s.status === 'confirmed').length;
  const totalCount = vorgang.schritte.length;
  const activeStepIndex = vorgang.schritte.findIndex((s) => IN_PROGRESS_STATUS.has(s.status));
  const primaryRechtsgrundlage =
    vorgang.schritte.find((s) => s.rechtsgrundlage)?.rechtsgrundlage ??
    (vorgang.typ === 'umzug' ? '§ 17 BMG' : undefined);

  // State-aware Kopfdaten: eine Frist gilt nur, solange noch etwas aussteht —
  // nach dem letzten Schritt (oder Abschluss) wäre „Nächste Frist" ein
  // stehengebliebenes Schild. Gleiches für die Fertigstellungs-Plitte: sie
  // sagt, WESSEN Zug es ist, statt statisch „2–3 Tage" zu versprechen.
  const citizenTurn = nextStep ? CITIZEN_ACTION_STATUS.has(nextStep.status) : false;
  const allConfirmed = totalCount > 0 && doneCount === totalCount;
  const closed = vorgang.status === 'abgeschlossen' || vorgang.status === 'genehmigt';
  const naechsteFristIso =
    closed || allConfirmed ? undefined : vorgang.fristen?.[0]?.datum;

  let fertigLabel = tv('fertigstellung_label');
  let fertigValue = tv('fertigstellung_value');
  if (closed && vorgang.abgeschlossen_am) {
    fertigLabel = tv('fertigstellung_label_done');
    fertigValue = format(parseISO(vorgang.abgeschlossen_am), 'd. MMMM yyyy', { locale: de });
  } else if (allConfirmed) {
    fertigLabel = tv('fertigstellung_label_in_review');
  } else if (citizenTurn) {
    fertigLabel = tv('fertigstellung_label_after_action');
  }

  // Erledigt-Moment: eine stabile aria-live-Region (überlebt das Unmounten des
  // Banners) + ein doneCount-Vergleich, der beim Schrittwechsel Ansage/Fokus
  // steuert. `pendingFocusRef` merkt einen fälligen Fokus-Sprung vor, der erst
  // NACH dem Dialog-Schluss ausgeführt wird; `justCompleted` schaltet den
  // Check-Draw-in des Done-Banners nur beim Live-Übergang frei.
  const [announcement, setAnnouncement] = React.useState('');
  const [justCompleted, setJustCompleted] = React.useState(false);
  const prevDoneRef = React.useRef<number | null>(null);
  const pendingFocusRef = React.useRef(false);

  // Autorisierungs-Dialog auf VorgangDetail-Ebene (überlebt den Banner-Wechsel,
  // wenn der laufende Schritt in_progress wird): der CTA öffnet nur den Dialog,
  // der Write sitzt im Dialog-Confirm.
  const [authStep, setAuthStep] = React.useState<{
    stepId: string;
    mode: VorgangSchrittAuthMode;
    behoerdeName: string;
    datenkategorien: string[];
    eidPreview?: string;
  } | null>(null);

  const openAuth = () => {
    if (!nextStep || !nextStepMode) return;
    setAuthStep({
      stepId: nextStep.id,
      mode: nextStepMode,
      behoerdeName: nextBehoerde?.name_de ?? nextStep.behoerde_id,
      datenkategorien: nextStep.datenkategorien ?? [],
      eidPreview: nextStep.eid_preview,
    });
  };

  const authorizeStep = async () => {
    if (!authStep) return;
    try {
      await api.starteVorgangSchritt(vorgang.id, authStep.stepId);
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
    // Fokus erst NACH dem Dialog-Schluss nachziehen (der Dialog ist beim
    // confirmed-Reconcile noch offen + inert; ein Fokus jetzt wäre no-op).
    pendingFocusRef.current = true;
  }, [doneCount, nextStep, tv]);

  // WCAG 2.4.3: Nach dem Vollzug ruht der Fokus sonst auf <body> — der
  // Dialog-Confirm-Button unmountet, und base-ui restauriert auf den ebenfalls
  // unmounteten Öffner-Trigger. Sobald der Dialog wirklich geschlossen ist,
  // setzen wir den Fokus explizit auf den neuen CTA (Kette) bzw. die Done-
  // Section (letzter Schritt). Per rAF-Schleife: solange der Fokus noch im
  // (mit Fade-out) schließenden Dialog hängt, warten wir; erst wenn er auf
  // <body> fällt, ziehen wir ihn aufs Ziel — und halten ihn gegen ein etwaiges
  // spätes base-ui-Restore. Ein echtes Element AUSSERHALB des Dialogs bedeutet,
  // der Nutzer hat selbst weiterfokussiert → dann nicht stehlen.
  React.useEffect(() => {
    if (authStep !== null || !pendingFocusRef.current) return;
    let raf = 0;
    let attempts = 0;
    const step = () => {
      const active = document.activeElement as HTMLElement | null;
      const target =
        document.querySelector<HTMLElement>('[data-vd-cta]') ??
        document.querySelector<HTMLElement>('.vd-next.is-done');
      const inClosingDialog = Boolean(
        active?.closest('[data-slot="dialog-content"], [role="dialog"]'),
      );
      if (target && active === target) {
        pendingFocusRef.current = false; // Ziel erreicht
        return;
      }
      // Nutzer hat selbst woanders hin fokussiert (echtes Element außerhalb des
      // schließenden Dialogs, nicht unser Ziel) → nicht stehlen.
      if (active && active !== document.body && !inClosingDialog) {
        pendingFocusRef.current = false;
        return;
      }
      // Erst fokussieren, wenn der Dialog den Fokus freigegeben hat (sonst wäre
      // das Ziel noch inert bzw. base-ui restauriert danach zurück auf <body>).
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

  // Einmaliger, dezenter Seiten-Eintritts-Stagger (nur beim ersten Mount, nie
  // beim Reconcile — VorgangDetail bleibt gemountet). reduced-motion: instant.
  const entrance = (delay: number) =>
    reduce
      ? {}
      : {
          initial: { opacity: 0, y: 4 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.22, delay, ease: 'easeOut' as const },
        };

  return (
    <>
      <VorgangDetailBreadcrumb title={vorgang.titel ?? t('title')} />

      <p aria-live="polite" className="sr-only">
        {announcement}
      </p>

      <VorgangHeaderClient
        title={vorgang.titel ?? t('title')}
        typ={vorgang.typ}
        aktenzeichen={aktenzeichen}
        status={vorgang.status}
      />

      {/* The one thing the citizen must do sits full-width right under the
        * header — never buried in the rail below the fold. On erledigen the
        * banner morphs in place (AnimatePresence) to the next citizen step or
        * the Done-state, instead of a full skeleton reload. */}
      <motion.div {...entrance(0)}>
        <AnimatePresence initial={false} mode="wait">
          {nextStep ? (
            <motion.div
              key={nextStep.id}
              initial={reduce ? false : { opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduce ? { opacity: 1 } : { opacity: 0, y: -6 }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
            >
              <NextStepBanner
                behoerdeName={nextBehoerde?.name_de ?? nextStep.behoerde_id}
                kategorie={nextBehoerde?.kategorie}
                aktion={nextStep.aktion}
                rechtsgrundlage={nextStep.rechtsgrundlage}
                datenkategorien={nextStep.datenkategorien}
                mode={nextStepMode}
                letterId={nextStep.letter_id}
                fristIso={naechsteFristIso}
                onAuthorize={openAuth}
              />
            </motion.div>
          ) : vorgang.schritte.length > 0 && !receipt ? (
            <motion.div
              key="done"
              initial={reduce ? false : { opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduce ? { opacity: 1 } : { opacity: 0, y: -6 }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
            >
              <NoNextStepBanner draw={justCompleted} />
            </motion.div>
          ) : null}
        </AnimatePresence>
      </motion.div>

      <div className="vg-layout">
        <motion.div className="flex flex-col gap-6" {...entrance(0.06)}>
          {receipt ? <ValueReceiptCard receipt={receipt} variant="static" /> : null}

          {adresseNeu ? <AdresseDiffClient alt={adresseAlt} neu={adresseNeu} /> : null}

          <BehoerdenStatusListClient
            steps={vorgang.schritte}
            behoerdenById={behoerdenById}
            lettersById={lettersById}
            done={doneCount}
            total={totalCount}
            activeIndex={activeStepIndex}
          />

          {relatedDocuments.length > 0 ? (
            <VorgangDocuments documents={relatedDocuments} behoerdenById={behoerdenById} />
          ) : null}

          {termine.length > 0 ? (
            <section aria-labelledby="termine-section" className="gt-card">
              <div className="gt-card-head">
                <h2 id="termine-section" className="gt-card-title">
                  <Calendar aria-hidden="true" />
                  {tv('termine_title', { count: termine.length })}
                </h2>
              </div>
              <ul className="grid gap-3 sm:grid-cols-2">
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

          {letters.length > 0 ? (
            <section aria-labelledby="posteingang-section" className="gt-card">
              <div className="gt-card-head">
                <h2 id="posteingang-section" className="gt-card-title">
                  <FileText aria-hidden="true" />
                  {t('posteingang_count', { count: letters.length })}
                </h2>
              </div>
              <ul className="flex flex-col gap-2">
                {letters.map((letter) => (
                  <LetterCard
                    key={letter.id}
                    letter={letter}
                    absender={behoerdenById[letter.absender_behoerde_id]}
                  />
                ))}
              </ul>
            </section>
          ) : null}
        </motion.div>

        <motion.aside
          aria-label={tv('details_title')}
          className="flex flex-col gap-4"
          {...entrance(0.12)}
        >
          <VorgangDetailsRail
            angelegtIso={vorgang.angelegt_am}
            stichtagIso={stichtag}
            behoerdenCount={vorgang.schritte.length}
            naechsteFristIso={naechsteFristIso}
            fertigLabel={fertigLabel}
            fertigValue={fertigValue}
            rechtsgrundlage={primaryRechtsgrundlage}
            vorgangId={id}
          />

          <PrototypeDisclaimer />
        </motion.aside>
      </div>

      <VorgangSchrittAuthDialog
        open={authStep !== null}
        onOpenChange={(o) => {
          if (!o) setAuthStep(null);
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

/* CTA-Glyph + Label-Key je Confirm-Modus. */
const MODE_CTA: Record<
  VorgangSchrittAuthMode,
  {
    Icon: typeof Fingerprint;
    labelKey: 'next_step_cta_eid' | 'next_step_cta_consent' | 'next_step_cta_termin';
  }
> = {
  eid: { Icon: Fingerprint, labelKey: 'next_step_cta_eid' },
  consent: { Icon: ShieldCheck, labelKey: 'next_step_cta_consent' },
  termin: { Icon: CalendarClock, labelKey: 'next_step_cta_termin' },
};

/* Full-width action band under the hero — the screen's single primary action.
 * Der CTA öffnet NUR den Autorisierungs-Dialog (der Write sitzt im Dialog-
 * Confirm); ein Schritt ohne Bürger-Aktion (pending/in_progress) rendert das
 * Band ohne CTA. Surface + CTA sind token-getrieben. */
function NextStepBanner({
  behoerdeName,
  kategorie,
  aktion,
  rechtsgrundlage,
  datenkategorien,
  mode,
  letterId,
  fristIso,
  onAuthorize,
}: {
  behoerdeName: string;
  kategorie?: Behoerde['kategorie'];
  aktion: string;
  rechtsgrundlage?: string;
  datenkategorien?: string[];
  mode?: VorgangSchrittAuthMode;
  letterId?: string;
  fristIso?: string;
  onAuthorize: () => void;
}) {
  const tv = useTranslations('vorgang.detail');

  // Der Fokus-Advance nach dem Vollzug liegt bewusst in `VorgangDetail` (nach
  // dem Dialog-Schluss, WCAG 2.4.3) statt in einem Mount-Effect hier: der neue
  // Banner mountet schon beim in_progress-Reconcile, bevor der Sprung fällig ist.
  const fristLabel = fristIso
    ? format(parseISO(fristIso), 'd. MMMM yyyy', { locale: de })
    : null;

  const cta = mode ? MODE_CTA[mode] : undefined;
  const prep =
    datenkategorien && datenkategorien.length > 0
      ? datenkategorien.join(', ')
      : null;

  return (
    <section aria-labelledby="next-step-title" className="vd-next">
      <div className="vd-next-body">
        <h2 id="next-step-title" className="vd-next-kicker">
          {tv('next_step_title')}
        </h2>
        <p className="vd-next-aktion">{aktion}</p>
        {/* div, nicht p — BehoerdenBadge rendert ein div (invalides p-Nesting). */}
        <div className="vd-next-meta">
          <BehoerdenBadge name={behoerdeName} kategorie={kategorie} />
          {rechtsgrundlage ? (
            <span>
              {tv('next_step_basis_label')}: {rechtsgrundlage}
            </span>
          ) : null}
        </div>
        {/* Agent-Voice-Prep: „Aus Ihren Stammdaten vorbereitet: …" — der Schritt
          * ist vom System vorbereitet, der Bürger autorisiert nur. */}
        {prep ? (
          <p className="mt-1.5 text-[13px] text-muted-foreground">
            {tv('next_step_prepared', { kategorien: prep })}
          </p>
        ) : null}
      </div>
      <div className="vd-next-actions">
        {fristLabel ? (
          <span className="badge amber">
            <Calendar aria-hidden="true" />
            {tv('next_step_frist', { datum: fristLabel })}
          </span>
        ) : null}
        {letterId ? (
          <Link
            href={`/posteingang/${encodeURIComponent(letterId)}`}
            className="btn btn-secondary"
          >
            <FileText aria-hidden="true" />
            {tv('next_step_brief_cta')}
          </Link>
        ) : null}
        {cta ? (
          <Button size="lg" data-vd-cta onClick={onAuthorize}>
            <cta.Icon aria-hidden="true" />
            {tv(cta.labelKey)}
          </Button>
        ) : null}
      </div>
    </section>
  );
}

function NoNextStepBanner({ draw }: { draw: boolean }) {
  const tv = useTranslations('vorgang.detail');
  const reduce = useReducedMotion();
  const ref = React.useRef<HTMLElement>(null);

  React.useEffect(() => {
    ref.current?.focus();
  }, []);

  return (
    <section
      ref={ref}
      tabIndex={-1}
      aria-labelledby="no-next-step-title"
      className="vd-next is-done focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
    >
      <div className="vd-next-body">
        <h2 id="no-next-step-title" className="vd-next-kicker">
          {tv('next_step_title')}
        </h2>
        <p className="vd-next-aktion">{tv('no_next_step')}</p>
      </div>
      {/* Check zeichnet sich NUR beim Live-Übergang ein (draw); ein bereits
        * fertig geladenes Dossier zeigt ihn statisch (initial={false}). */}
      <motion.span
        aria-hidden="true"
        style={{ display: 'inline-flex', flexShrink: 0 }}
        initial={draw && !reduce ? { scale: 0.6, opacity: 0 } : false}
        animate={{ scale: 1, opacity: 1 }}
        transition={reduce ? { duration: 0 } : { type: 'spring', stiffness: 380, damping: 26 }}
      >
        <CheckCircle2 className="vd-next-check" aria-hidden="true" />
      </motion.span>
    </section>
  );
}

/* One quiet rail card instead of three stacked boxes: the temporal facts, then
 * a hairline-separated Rechtsgrundlage/Berechtigungen block, then the
 * Datenschutz-Cockpit link. Editorial hairline rows (no per-row icon tiles) so
 * the rail never towers over a content-light main column. */
function VorgangDetailsRail({
  angelegtIso,
  stichtagIso,
  behoerdenCount,
  naechsteFristIso,
  fertigLabel,
  fertigValue,
  rechtsgrundlage,
  vorgangId,
}: {
  angelegtIso: string;
  stichtagIso?: string;
  behoerdenCount: number;
  naechsteFristIso?: string;
  fertigLabel: string;
  fertigValue: string;
  rechtsgrundlage?: string;
  vorgangId: string;
}) {
  const tv = useTranslations('vorgang.detail');
  const angelegtLabel = format(parseISO(angelegtIso), 'd. MMMM yyyy', { locale: de });
  const stichtagLabel = stichtagIso
    ? format(parseISO(stichtagIso), 'd. MMMM yyyy', { locale: de })
    : null;
  const fristLabel = naechsteFristIso
    ? format(parseISO(naechsteFristIso), 'd. MMMM yyyy', { locale: de })
    : null;

  return (
    <div className="rail-card flex flex-col gap-4">
      <div>
        <h3>{tv('details_title')}</h3>
        <dl className="mt-2 flex flex-col">
          <SummaryRow label={tv('summary_angelegt_label')}>{angelegtLabel}</SummaryRow>
          {stichtagLabel ? (
            <SummaryRow label={tv('summary_stichtag_label')}>{stichtagLabel}</SummaryRow>
          ) : null}
          <SummaryRow label={tv('summary_behoerden_label')}>{behoerdenCount}</SummaryRow>
          {fristLabel ? (
            <SummaryRow label={tv('summary_frist_label')}>
              <span className="inline-flex items-center gap-1.5">
                <Calendar className="size-3.5 text-muted-foreground" aria-hidden="true" />
                {fristLabel}
              </span>
            </SummaryRow>
          ) : null}
          <SummaryRow label={fertigLabel}>{fertigValue}</SummaryRow>
        </dl>
      </div>

      {rechtsgrundlage ? (
        <div className="border-t border-border pt-4">
          <h4 className="text-[13px] font-semibold text-text-secondary">
            {tv('berechtigungen_title')}
          </h4>
          <dl className="mt-2 flex flex-col">
            <SummaryRow label={tv('berechtigungen_basis_label')} stacked>
              <span className="vd-mono">{rechtsgrundlage}</span>
            </SummaryRow>
            <SummaryRow label={tv('berechtigungen_datenweitergabe_label')} stacked>
              {tv('berechtigungen_behoerden', { count: behoerdenCount })}
            </SummaryRow>
            <SummaryRow label={tv('berechtigungen_einwilligungen_label')} stacked>
              {tv('berechtigungen_einwilligungen_value')}
            </SummaryRow>
          </dl>
        </div>
      ) : null}

      <div className="border-t border-border pt-4">
        <p className="mb-3 text-[13px] leading-relaxed text-text-muted">
          {tv('datenschutz_sub')}
        </p>
        <DatenschutzCockpitLink vorgangId={vorgangId} />
      </div>
    </div>
  );
}

function SummaryRow({
  label,
  stacked = false,
  children,
}: {
  label: string;
  stacked?: boolean;
  children: React.ReactNode;
}) {
  // Stacked = label above, value left-aligned below — for prose values (legal
  // consents) that read badly ragged-right. Inline = label left, short value
  // right (dates, counts): the value stays on one line, the label may wrap.
  if (stacked) {
    return (
      <div className="border-t border-border py-2.5 first:border-t-0 first:pt-0">
        <dt className="text-xs text-muted-foreground">{label}</dt>
        <dd className="mt-1 text-sm font-medium leading-relaxed text-foreground">
          {children}
        </dd>
      </div>
    );
  }
  return (
    <div className="flex items-baseline justify-between gap-4 border-t border-border py-2.5 first:border-t-0 first:pt-0">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="shrink-0 text-right text-sm font-medium text-foreground">{children}</dd>
    </div>
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
    <span className="inline-flex items-center gap-1.5">
      <span className="vd-mono">{value}</span>
      <button
        type="button"
        onClick={handleCopy}
        aria-label={tv('aktenzeichen_copy_aria')}
        className="inline-flex size-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        {copied ? (
          <Check className="size-3.5 text-emerald-600" aria-hidden="true" />
        ) : (
          <Copy className="size-3.5" aria-hidden="true" />
        )}
      </button>
    </span>
  );
}

/* Status badge — `.badge` colour conveys tone decoratively; the localized
 * label carries the meaning (status is never colour-only). */
const STATUS_BADGE: Record<
  VorgangStatus,
  { tone: 'brand' | 'green' | 'amber' | 'red'; dot: string; key: 'laeuft' | 'abgeschlossen' | 'fehlerhaft' }
> = {
  angelegt: { tone: 'brand', dot: 'var(--brand-500)', key: 'laeuft' },
  in_pruefung: { tone: 'amber', dot: 'var(--amber-500)', key: 'laeuft' },
  genehmigt: { tone: 'green', dot: 'var(--green-500)', key: 'abgeschlossen' },
  abgeschlossen: { tone: 'green', dot: 'var(--green-500)', key: 'abgeschlossen' },
  abgelehnt: { tone: 'red', dot: 'var(--red-500)', key: 'fehlerhaft' },
};

function VorgangStatusBadge({ status }: { status: VorgangStatus }) {
  const t = useTranslations('umzug.detail');
  const cfg = STATUS_BADGE[status];
  return (
    <span className={`badge ${cfg.tone}`}>
      <span className="dot" style={{ background: cfg.dot }} aria-hidden="true" />
      {t(`status.${cfg.key}`)}
    </span>
  );
}

function VorgangDetailBreadcrumb({ title }: { title: string }) {
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

/* Boxless page head — the same `.gt-page-head` chrome every other screen uses.
 * The old icon-circle hero tile (an AI-design tell) is gone; the title carries
 * the meaning. Status sits inline at the top-right, the realistic Aktenzeichen
 * (from the Vorgang's letters) below — never the internal slug id. */
function VorgangHeaderClient({
  title,
  typ,
  aktenzeichen,
  status,
}: {
  title: string;
  typ: Vorgang['typ'];
  aktenzeichen?: string;
  status: VorgangStatus;
}) {
  const tv = useTranslations('vorgang.detail');
  return (
    <div className="gt-page-head">
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <h1>{title}</h1>
        <div className="mt-0.5 shrink-0">
          <VorgangStatusBadge status={status} />
        </div>
      </div>
      <p className="sub">{typ === 'umzug' ? tv('hero_sub') : tv('hero_sub_generic')}</p>
      {aktenzeichen ? (
        <p className="mt-2 text-[13px] text-muted-foreground">
          <span>{tv('aktenzeichen_label')}:</span>{' '}
          <AktenzeichenValue value={aktenzeichen} />
        </p>
      ) : null}
    </div>
  );
}

/* Segment progress bar folded into the Schritte card head. Solid fill for done
 * steps, an outlined pill for the rest (amber for the active step) — so the bar
 * can never read as more progress than done/total. The amber outline is skipped
 * when the active segment is the ONLY segment: full-track accent at „0 von 1"
 * still reads as a filled bar at 6px height. Mirrors the dashboard seg-bar. */
function StepProgressBar({
  done,
  total,
  activeIndex,
  label,
}: {
  done: number;
  total: number;
  activeIndex: number;
  label: string;
}) {
  const reduce = useReducedMotion();
  return (
    <div
      className="flex gap-1.5"
      role="progressbar"
      aria-valuenow={done}
      aria-valuemin={0}
      aria-valuemax={total}
      aria-label={label}
    >
      {Array.from({ length: total }).map((_, i) => {
        const filled = i < done;
        const active = !filled && i === activeIndex && total > 1;
        // Der grüne Fill überdeckt Rand + Fläche (−inset-px, overflow-hidden) und
        // baut sich beim neu erledigten Segment logisch von der inline-Startkante
        // auf. initial={false} → ein fertiges Dossier zeigt alles sofort gefüllt.
        return (
          <span
            key={i}
            aria-hidden="true"
            className={cn(
              'relative h-1.5 flex-1 overflow-hidden rounded-full',
              active
                ? 'border-[1.5px] border-amber-600 dark:border-amber-400'
                : 'border border-border',
            )}
          >
            <motion.span
              className="vd-seg-fill absolute -inset-px rounded-full bg-primary"
              initial={false}
              animate={{ scaleX: filled ? 1 : 0 }}
              transition={
                reduce ? { duration: 0 } : { duration: 0.32, delay: 0.04, ease: 'easeOut' }
              }
            />
          </span>
        );
      })}
    </div>
  );
}

function AdresseDiffClient({ alt, neu }: { alt?: Adresse; neu: Adresse }) {
  const t = useTranslations('umzug.detail');
  return (
    <div className="gt-card">
      <dl className="grid gap-3 sm:grid-cols-[auto_1fr] sm:items-start">
        <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {t('adresse_alt')}
        </dt>
        <dd className="text-sm text-muted-foreground line-through">
          {alt ? formatAdresse(alt) : '—'}
        </dd>
        <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {t('adresse_neu')}
        </dt>
        <dd className="flex items-center gap-2 text-sm font-medium text-foreground">
          <ArrowRight className="size-3.5 text-primary" aria-hidden="true" />
          <span>{formatAdresse(neu)}</span>
        </dd>
      </dl>
    </div>
  );
}

/* Status icon + tone, mirroring `BehoerdenStatusRow`'s visual language. The
 * decorative icon tones (sky/emerald) are aria-hidden; the status TEXT uses
 * AA-clearing semantic tokens (mirrors InlineCascade's split). */
const STATUS_VIZ: Record<AutopilotStepStatus, { Icon: typeof CheckCircle2; tone: string }> = {
  pending: { Icon: Clock, tone: 'text-muted-foreground' },
  in_progress: { Icon: Loader2, tone: 'text-sky-600' },
  needs_eid: { Icon: Fingerprint, tone: 'text-sky-600' },
  pending_eid_confirmation: { Icon: Fingerprint, tone: 'text-sky-600' },
  self_assigned: { Icon: Clock, tone: 'text-muted-foreground' },
  confirmed: { Icon: CheckCircle2, tone: 'text-emerald-600' },
  failed: { Icon: AlertCircle, tone: 'text-destructive' },
};

const STATUS_KEY_MAP: Record<AutopilotStepStatus, string> = {
  pending: 'pending',
  in_progress: 'in_progress',
  needs_eid: 'needs_eid',
  pending_eid_confirmation: 'in_progress',
  self_assigned: 'pending',
  confirmed: 'confirmed',
  failed: 'failed',
};

/* Per-row status chip tone — `.badge` colour is decorative; the localized label
 * carries the meaning (status is never colour-only). */
const STATUS_CHIP_TONE: Record<AutopilotStepStatus, 'green' | 'amber' | 'brand' | 'red' | 'outline'> = {
  pending: 'outline',
  in_progress: 'brand',
  needs_eid: 'amber',
  pending_eid_confirmation: 'amber',
  self_assigned: 'outline',
  confirmed: 'green',
  failed: 'red',
};

function BehoerdenStatusListClient({
  steps,
  behoerdenById,
  lettersById,
  done,
  total,
  activeIndex,
}: {
  steps: AutopilotStep[];
  behoerdenById: Record<BehoerdeId, Pick<Behoerde, 'name_de' | 'kategorie'>>;
  lettersById: Record<string, Pick<Letter, 'aktenzeichen' | 'betreff' | 'id'>>;
  done: number;
  total: number;
  activeIndex: number;
}) {
  const tv = useTranslations('vorgang.detail');
  const reduce = useReducedMotion();
  const progressLabel = tv('progress_steps', { done, total });

  return (
    <section aria-labelledby="behoerden-status-title" className="gt-card">
      <div className="gt-card-head">
        <div className="min-w-0">
          <h2 id="behoerden-status-title" className="gt-card-title">
            <ListChecks aria-hidden="true" />
            {tv('steps_overview_title')}
          </h2>
          <p className="gt-card-sub">{tv('steps_overview_sub')}</p>
        </div>
        {total > 0 ? (
          <span
            className="shrink-0 text-[13px] tabular-nums text-text-muted"
            aria-hidden="true"
          >
            <AnimatePresence initial={false} mode="wait">
              <motion.span
                key={done}
                style={{ display: 'inline-block' }}
                initial={reduce ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={reduce ? { opacity: 1 } : { opacity: 0 }}
                transition={{ duration: 0.18 }}
              >
                {progressLabel}
              </motion.span>
            </AnimatePresence>
          </span>
        ) : null}
      </div>
      {total > 0 ? (
        <div className="mb-6">
          <StepProgressBar
            done={done}
            total={total}
            activeIndex={activeIndex}
            label={progressLabel}
          />
        </div>
      ) : null}
      <ol className="vd-timeline">
        {steps.map((step, index) => (
          <TimelineRow
            key={step.id}
            index={index}
            step={step}
            behoerde={behoerdenById[step.behoerde_id]}
            letter={step.letter_id ? lettersById[step.letter_id] : undefined}
          />
        ))}
      </ol>
    </section>
  );
}

function TimelineRow({
  index,
  step,
  behoerde,
  letter,
}: {
  index: number;
  step: AutopilotStep;
  behoerde?: Pick<Behoerde, 'name_de' | 'kategorie'>;
  letter?: Pick<Letter, 'aktenzeichen' | 'betreff' | 'id'>;
}) {
  const t = useTranslations('umzug.detail');
  const tRun = useTranslations('umzug.run');
  const tStep = useTranslations('convenience.step');
  const tv = useTranslations('vorgang.detail');
  const reduce = useReducedMotion();
  const [open, setOpen] = React.useState(false);

  const viz = STATUS_VIZ[step.status];
  const done = step.status === 'confirmed';
  const primary = step.agent_label ?? step.aktion;
  const chipTone = STATUS_CHIP_TONE[step.status];
  const uebermitteltIso = step.completed_at ?? step.started_at;
  const uebermitteltLabel = uebermitteltIso
    ? format(parseISO(uebermitteltIso), 'd. MMMM yyyy', { locale: de })
    : null;
  // Termin-Systemleistung (§ 24a FeV u. a.) trägt „Termin vereinbart am"; eine
  // echte Autopilot-Übermittlung (agent_label / Datenkategorien / eID) „Übermittelt
  // am"; eine Bürger-Eigenleistung neutral „Erledigt am".
  const istUebermittlung = Boolean(
    step.agent_label ||
      (step.datenkategorien && step.datenkategorien.length > 0) ||
      step.eid_confirmed_at,
  );
  const abschlussLabel = step.requires_termin
    ? tv('termin_vereinbart_label')
    : istUebermittlung
      ? tv('uebermittelt_label')
      : tv('erledigt_label');
  const StepTileIcon = behoerdeStepIcon(behoerde?.name_de ?? step.behoerde_id);
  const hasDatenkategorien =
    Array.isArray(step.datenkategorien) && step.datenkategorien.length > 0;
  const hasDetails =
    Boolean(step.rechtsgrundlage) ||
    Boolean(letter?.aktenzeichen) ||
    Boolean(letter?.betreff) ||
    hasDatenkategorien;
  const detailsId = `vd-details-${step.id}`;

  // Row-Wash: einmaliger Grün-Schleier NUR beim Live-Übergang → confirmed,
  // nicht beim Laden eines bereits erledigten Dossiers.
  const [washing, setWashing] = React.useState(false);
  const prevDoneRef = React.useRef(done);
  React.useEffect(() => {
    if (!prevDoneRef.current && done && !reduce) setWashing(true);
    prevDoneRef.current = done;
  }, [done, reduce]);

  return (
    <li className={cn('vd-step', done && 'is-done')}>
      {washing ? (
        <motion.span
          className="vd-step-wash"
          aria-hidden="true"
          initial={{ opacity: 0.12 }}
          animate={{ opacity: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          onAnimationComplete={() => setWashing(false)}
        />
      ) : null}
      <span className={cn('vd-step-node', done && 'is-done')} aria-hidden="true">
        <AnimatePresence initial={false} mode="wait">
          {done ? (
            <motion.span
              key="check"
              style={{ display: 'inline-flex' }}
              initial={reduce ? false : { scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={
                reduce ? { duration: 0 } : { type: 'spring', stiffness: 380, damping: 26 }
              }
            >
              <Check />
            </motion.span>
          ) : (
            <motion.span key="num" className="vd-step-num">
              {index + 1}
            </motion.span>
          )}
        </AnimatePresence>
      </span>
      <div className="vd-step-body">
        <div className="vd-step-head">
          <span className="vd-step-tile" aria-hidden="true">
            <StepTileIcon />
          </span>
          <span className={cn('vd-step-icon', viz.tone)} aria-hidden="true">
            <viz.Icon className="size-4" />
          </span>
          <BehoerdenBadge
            name={behoerde?.name_de ?? step.behoerde_id}
            kategorie={behoerde?.kategorie}
          />
          <span className="vd-step-chip-slot">
            <AnimatePresence initial={false} mode="wait">
              <motion.span
                key={step.status}
                className={`badge ${chipTone} vd-step-chip`}
                initial={reduce ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={reduce ? { opacity: 1 } : { opacity: 0 }}
                transition={{ duration: 0.18, delay: reduce ? 0 : 0.06 }}
              >
                <span className="sr-only">Status: </span>
                {tRun(`status.${STATUS_KEY_MAP[step.status]}`)}
              </motion.span>
            </AnimatePresence>
          </span>
        </div>
        <p className="vd-step-aktion">{primary}</p>
        <AnimatePresence initial={false}>
          {done && uebermitteltLabel ? (
            <motion.p
              key="done-line"
              className="vd-step-meta"
              initial={reduce ? false : { opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, delay: reduce ? 0 : 0.12, ease: 'easeOut' }}
            >
              {abschlussLabel}: {uebermitteltLabel}
            </motion.p>
          ) : null}
        </AnimatePresence>

        {hasDetails ? (
          <>
            <button
              type="button"
              className="vd-step-disclose"
              aria-expanded={open}
              aria-controls={detailsId}
              onClick={() => setOpen((v) => !v)}
            >
              <ChevronDown
                className={cn('vd-step-chevron', open && 'is-open')}
                aria-hidden="true"
              />
              {open ? tv('details_hide') : tv('details_show')}
            </button>
            {open ? (
              <div id={detailsId} className="vd-step-details">
                <p className="vd-step-detail-line">
                  {step.aktion}
                  {step.rechtsgrundlage ? (
                    <>
                      {' · '}
                      <span className="vd-step-detail-em">{tStep('basis_label')}:</span>{' '}
                      {step.rechtsgrundlage}
                    </>
                  ) : null}
                </p>
                {letter?.aktenzeichen ? (
                  <p className="vd-step-detail-line vd-mono">
                    {t('aktz_label')}: {letter.aktenzeichen}
                  </p>
                ) : null}
                {letter?.betreff ? (
                  <p className="vd-step-detail-line">
                    {t('brief_label')}: {letter.betreff}
                  </p>
                ) : null}
                {hasDatenkategorien ? (
                  <UebermittlungsReceipt
                    id={step.id}
                    datenkategorien={step.datenkategorien ?? []}
                    rechtsgrundlage={step.rechtsgrundlage}
                    consentGivenAt={step.consent_given_at}
                  />
                ) : null}
              </div>
            ) : null}
          </>
        ) : null}
      </div>
    </li>
  );
}

function VorgangDocuments({
  documents,
  behoerdenById,
}: {
  documents: Document[];
  behoerdenById: Record<BehoerdeId, Pick<Behoerde, 'name_de' | 'kategorie'>>;
}) {
  const t = useTranslations('umzug.detail');
  return (
    <section aria-labelledby="vorgang-docs" className="gt-card">
      <div className="gt-card-head">
        <h2 id="vorgang-docs" className="gt-card-title">
          <FileText aria-hidden="true" />
          {t('dokumente_count', { count: documents.length })}
        </h2>
      </div>
      <ul className="grid gap-3 sm:grid-cols-2">
        {documents.map((doc) => (
          <li key={doc.id}>
            <Link
              href="/dokumente"
              className="flex flex-col gap-1 rounded-xl border border-border bg-background p-4 transition-shadow hover:shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium text-foreground">{doc.titel}</span>
                <span className="rounded-full bg-muted px-2 py-0.5 font-mono text-[10px] text-muted-foreground">
                  {doc.watermark}
                </span>
              </div>
              <span className="text-xs text-muted-foreground">
                {behoerdenById[doc.ausstellende_behoerde_id]?.name_de ??
                  doc.ausstellende_behoerde_id}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
