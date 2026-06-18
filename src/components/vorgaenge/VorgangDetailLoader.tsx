'use client';

import * as React from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { format, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';
import { toast } from 'sonner';
import {
  AlertCircle,
  ArrowRight,
  Calendar,
  Check,
  CheckCircle2,
  ChevronDown,
  Clock,
  FileText,
  Fingerprint,
  Home,
  ListChecks,
  Loader2,
  Scale,
} from 'lucide-react';

import { UebermittlungsReceipt } from '@/components/autopilot/UebermittlungsReceipt';
import { ValueReceiptCard } from '@/components/autopilot/ValueReceiptCard';
import { LetterCard } from '@/components/posteingang/LetterCard';
import { BehoerdenBadge } from '@/components/shared/BehoerdenBadge';
import { DatenschutzCockpitLink } from '@/components/shared/DatenschutzCockpitLink';
import { FristDetailModal } from '@/components/shared/FristDetailModal';
import { PrototypeDisclaimer } from '@/components/shared/PrototypeDisclaimer';
import { Skeleton } from '@/components/shared/Skeleton';
import { TerminCard } from '@/components/shared/TerminCard';
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

export function VorgangDetailLoader({ id }: VorgangDetailLoaderProps) {
  const [state, setState] = React.useState<
    | { kind: 'loading' }
    | { kind: 'ready'; data: LoadedState }
    | { kind: 'not-found' }
  >({ kind: 'loading' });

  const load = React.useCallback(async () => {
    setState({ kind: 'loading' });
    let vorgang: Vorgang;
    let letters: Letter[];
    let termine: Termin[];
    try {
      const [v, l, te] = await Promise.all([
        api.getVorgang(id),
        api.getLetters({ vorgang_id: id }),
        api.getTermine().catch(() => [] as Termin[]),
      ]);
      vorgang = v;
      letters = l;
      termine = te.filter((tx) => tx.vorgang_id === id);
    } catch {
      setState({ kind: 'not-found' });
      return;
    }

    let behoerden: Behoerde[] = [];
    try {
      behoerden = await api.getBehoerden();
    } catch {
      behoerden = [];
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
  }, [id]);

  React.useEffect(() => {
    void load();
  }, [load]);

  if (state.kind === 'loading') {
    return <VorgangDetailSkeleton />;
  }

  if (state.kind === 'not-found') {
    return <VorgangDetailNotFound />;
  }

  return <VorgangDetail data={state.data} id={id} reload={load} />;
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

function VorgangDetail({
  data,
  id,
  reload,
}: {
  data: LoadedState;
  id: string;
  reload: () => Promise<void>;
}) {
  const t = useTranslations('umzug.detail');
  const tv = useTranslations('vorgang.detail');
  const { vorgang, letters, termine, behoerden, relatedDocuments, receipt } = data;

  const behoerdenById: Record<BehoerdeId, Pick<Behoerde, 'name_de' | 'kategorie'>> = {};
  for (const b of behoerden) {
    behoerdenById[b.id] = { name_de: b.name_de, kategorie: b.kategorie };
  }

  const lettersById: Record<string, Pick<Letter, 'aktenzeichen' | 'betreff' | 'id'>> = {};
  for (const l of letters) {
    lettersById[l.id] = { aktenzeichen: l.aktenzeichen, betreff: l.betreff, id: l.id };
  }

  const adresseAlt = readAdresseFromContext(vorgang.context, 'alte_adresse');
  const adresseNeu = readAdresseFromContext(vorgang.context, 'neue_adresse');
  const stichtag = readStichtagFromContext(vorgang.context);

  const nextStep = pickNextStep(vorgang.schritte);
  const nextBehoerde = nextStep ? behoerdenById[nextStep.behoerde_id] : undefined;
  const naechsteFristIso = vorgang.fristen?.[0]?.datum;

  const doneCount = vorgang.schritte.filter((s) => s.status === 'confirmed').length;
  const totalCount = vorgang.schritte.length;
  const primaryRechtsgrundlage =
    vorgang.schritte.find((s) => s.rechtsgrundlage)?.rechtsgrundlage ??
    (vorgang.typ === 'umzug' ? '§ 17 BMG' : undefined);

  return (
    <>
      <VorgangDetailBreadcrumb title={vorgang.titel ?? t('title')} />

      <VorgangHeaderClient
        title={vorgang.titel ?? t('title')}
        vorgangNummer={vorgang.id}
        status={vorgang.status}
      />

      {totalCount > 0 ? (
        <GesamtfortschrittCard done={doneCount} total={totalCount} />
      ) : null}

      <div className="vg-layout">
        <div className="flex flex-col gap-6">
          {nextStep ? (
            <NextStepCard
              vorgangId={vorgang.id}
              stepId={nextStep.id}
              behoerdeName={nextBehoerde?.name_de ?? nextStep.behoerde_id}
              kategorie={nextBehoerde?.kategorie}
              aktion={nextStep.aktion}
              rechtsgrundlage={nextStep.rechtsgrundlage}
              letterId={nextStep.letter_id}
              reload={reload}
            />
          ) : vorgang.schritte.length > 0 && !receipt ? (
            <NoNextStepCard />
          ) : null}

          {receipt ? <ValueReceiptCard receipt={receipt} variant="static" /> : null}

          {adresseNeu ? <AdresseDiffClient alt={adresseAlt} neu={adresseNeu} /> : null}

          <BehoerdenStatusListClient
            steps={vorgang.schritte}
            behoerdenById={behoerdenById}
            lettersById={lettersById}
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
        </div>

        <aside aria-label={tv('summary_title')} className="flex flex-col gap-4">
          <VorgangSummaryRail
            status={vorgang.status}
            angelegtIso={vorgang.angelegt_am}
            stichtagIso={stichtag}
            behoerdenCount={vorgang.schritte.length}
            naechsteFristIso={naechsteFristIso}
          />

          {primaryRechtsgrundlage ? (
            <BerechtigungenRail
              rechtsgrundlage={primaryRechtsgrundlage}
              behoerdenCount={vorgang.schritte.length}
            />
          ) : null}

          <div className="rail-card flex flex-col gap-3">
            <h3>{tv('datenschutz_title')}</h3>
            <p className="sub" style={{ marginBottom: 0 }}>
              {tv('datenschutz_sub')}
            </p>
            <DatenschutzCockpitLink vorgangId={id} />
            <FristDetailModal />
          </div>

          <PrototypeDisclaimer />
        </aside>
      </div>
    </>
  );
}

function NextStepCard({
  vorgangId,
  stepId,
  behoerdeName,
  kategorie,
  aktion,
  rechtsgrundlage,
  letterId,
  reload,
}: {
  vorgangId: string;
  stepId: string;
  behoerdeName: string;
  kategorie?: Behoerde['kategorie'];
  aktion: string;
  rechtsgrundlage?: string;
  letterId?: string;
  reload: () => Promise<void>;
}) {
  const tv = useTranslations('vorgang.detail');
  const [busy, setBusy] = React.useState(false);

  const handleErledigen = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await api.erledigeVorgangSchritt(vorgangId, stepId);
      toast.success(tv('step_done_toast'));
      await reload();
      // On success the step becomes `confirmed`, pickNextStep returns nothing,
      // and this card unmounts in favour of NoNextStepCard — which takes focus.
    } catch {
      toast.error(tv('step_done_error'));
      setBusy(false);
    }
  };

  return (
    <section
      aria-labelledby="next-step-title"
      className="gt-card"
      style={{ borderColor: 'var(--brand-200)', background: 'var(--brand-50)' }}
    >
      <div className="flex items-start gap-4">
        <span className="icon-square" aria-hidden="true">
          <ListChecks />
        </span>
        <div className="grow">
          <h2 id="next-step-title" className="gt-card-title">
            {tv('next_step_title')}
          </h2>
          <div className="mt-1">
            <BehoerdenBadge name={behoerdeName} kategorie={kategorie} />
          </div>
          <p className="mt-2 text-sm font-medium text-foreground">{aktion}</p>
          {rechtsgrundlage ? (
            <p className="mt-1 text-xs text-muted-foreground">
              <span className="font-medium">{tv('next_step_basis_label')}:</span>{' '}
              {rechtsgrundlage}
            </p>
          ) : null}

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleErledigen}
              disabled={busy}
              aria-busy={busy}
            >
              {busy ? (
                <Loader2 className="animate-spin" aria-hidden="true" />
              ) : (
                <CheckCircle2 aria-hidden="true" />
              )}
              {busy ? tv('step_done_busy') : tv('next_step_cta')}
            </button>
            {letterId ? (
              <Link
                href={`/posteingang/${encodeURIComponent(letterId)}`}
                className="btn btn-secondary"
              >
                <FileText aria-hidden="true" />
                {tv('next_step_brief_cta')}
              </Link>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}

function NoNextStepCard() {
  const tv = useTranslations('vorgang.detail');
  const ref = React.useRef<HTMLElement>(null);

  React.useEffect(() => {
    ref.current?.focus();
  }, []);

  return (
    <section
      ref={ref}
      tabIndex={-1}
      aria-labelledby="no-next-step-title"
      className="gt-card focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      style={{ borderColor: 'var(--green-100)', background: 'var(--green-50)' }}
    >
      <div className="flex items-start gap-4">
        <span className="mt-0.5 flex size-9 items-center justify-center text-emerald-600" aria-hidden="true">
          <CheckCircle2 className="size-6" />
        </span>
        <div className="grow">
          <h2 id="no-next-step-title" className="gt-card-title">
            {tv('next_step_title')}
          </h2>
          <p className="mt-2 text-sm text-foreground">{tv('no_next_step')}</p>
        </div>
      </div>
    </section>
  );
}

function VorgangSummaryRail({
  status,
  angelegtIso,
  stichtagIso,
  behoerdenCount,
  naechsteFristIso,
}: {
  status: VorgangStatus;
  angelegtIso: string;
  stichtagIso?: string;
  behoerdenCount: number;
  naechsteFristIso?: string;
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
    <div className="rail-card">
      <h3>{tv('summary_title')}</h3>
      <dl className="flex flex-col">
        <SummaryRow label={tv('summary_status_label')}>
          <VorgangStatusBadge status={status} />
        </SummaryRow>
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
      </dl>
    </div>
  );
}

function SummaryRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 border-t border-border py-2.5 first:border-t-0 first:pt-0">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-sm font-medium text-foreground">{children}</dd>
    </div>
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

function VorgangHeaderClient({
  title,
  vorgangNummer,
  status,
}: {
  title: string;
  vorgangNummer: string;
  status: VorgangStatus;
}) {
  const tv = useTranslations('vorgang.detail');
  return (
    <div className="vd-hero">
      <span className="icon-circle lg" aria-hidden="true">
        <Home />
      </span>
      <div className="vd-hero-body">
        <h1 className="vd-hero-title">{title}</h1>
        <p className="vd-hero-sub">{tv('hero_sub')}</p>
        <p className="vd-hero-nr">
          <span className="vd-hero-nr-lbl">{tv('vorgangsnummer_label')}:</span>{' '}
          <span className="vd-hero-nr-val">{vorgangNummer}</span>
        </p>
      </div>
      <div className="vd-hero-status">
        <VorgangStatusBadge status={status} />
      </div>
    </div>
  );
}

function GesamtfortschrittCard({ done, total }: { done: number; total: number }) {
  const tv = useTranslations('vorgang.detail');
  const segments = Array.from({ length: total }, (_, i) => i < done);
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  return (
    <div className="vd-progress">
      <div className="vd-progress-main">
        <div className="vd-progress-head">
          <span className="vd-progress-title">{tv('progress_title')}</span>
          <span className="vd-progress-count">{tv('progress_steps', { done, total })}</span>
        </div>
        <div
          className="vd-progress-track"
          role="progressbar"
          aria-valuenow={done}
          aria-valuemin={0}
          aria-valuemax={total}
          aria-label={tv('progress_steps', { done, total })}
        >
          {segments.map((filled, i) => (
            <span
              key={i}
              className={cn('vd-progress-seg', filled && 'is-filled')}
              aria-hidden="true"
            />
          ))}
        </div>
        <span className="sr-only">{pct}%</span>
      </div>
      <div className="vd-fertig">
        <span className="icon-circle" aria-hidden="true">
          <Clock />
        </span>
        <div>
          <div className="vd-fertig-lbl">{tv('fertigstellung_label')}</div>
          <div className="vd-fertig-val">{tv('fertigstellung_value')}</div>
        </div>
      </div>
    </div>
  );
}

function BerechtigungenRail({
  rechtsgrundlage,
  behoerdenCount,
}: {
  rechtsgrundlage: string;
  behoerdenCount: number;
}) {
  const tv = useTranslations('vorgang.detail');
  return (
    <div className="rail-card vd-berechtigungen">
      <h3>
        <Scale aria-hidden="true" />
        {tv('berechtigungen_title')}
      </h3>
      <dl className="vd-berechtigungen-list">
        <div className="vd-berechtigungen-row">
          <dt>{tv('berechtigungen_basis_label')}</dt>
          <dd className="vd-mono">{rechtsgrundlage}</dd>
        </div>
        <div className="vd-berechtigungen-row">
          <dt>{tv('summary_behoerden_label')}</dt>
          <dd>{tv('berechtigungen_behoerden', { count: behoerdenCount })}</dd>
        </div>
        <div className="vd-berechtigungen-row">
          <dt>{tv('berechtigungen_einwilligungen_label')}</dt>
          <dd>{tv('berechtigungen_einwilligungen_value')}</dd>
        </div>
      </dl>
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
}: {
  steps: AutopilotStep[];
  behoerdenById: Record<BehoerdeId, Pick<Behoerde, 'name_de' | 'kategorie'>>;
  lettersById: Record<string, Pick<Letter, 'aktenzeichen' | 'betreff' | 'id'>>;
}) {
  const tv = useTranslations('vorgang.detail');

  return (
    <section aria-labelledby="behoerden-status-title" className="gt-card">
      <div className="gt-card-head">
        <h2 id="behoerden-status-title" className="gt-card-title">
          <ListChecks aria-hidden="true" />
          {tv('timeline_title', { count: steps.length })}
        </h2>
      </div>
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
  const [open, setOpen] = React.useState(false);

  const viz = STATUS_VIZ[step.status];
  const done = step.status === 'confirmed';
  const primary = step.agent_label ?? step.aktion;
  const chipTone = STATUS_CHIP_TONE[step.status];
  const uebermitteltIso = step.completed_at ?? step.started_at;
  const uebermitteltLabel = uebermitteltIso
    ? format(parseISO(uebermitteltIso), 'd. MMMM yyyy', { locale: de })
    : null;
  const hasDatenkategorien =
    Array.isArray(step.datenkategorien) && step.datenkategorien.length > 0;
  const hasDetails =
    Boolean(step.rechtsgrundlage) ||
    Boolean(letter?.aktenzeichen) ||
    Boolean(letter?.betreff) ||
    hasDatenkategorien;
  const detailsId = `vd-details-${step.id}`;

  return (
    <li className={cn('vd-step', done && 'is-done')}>
      <span className={cn('vd-step-node', done && 'is-done')} aria-hidden="true">
        {done ? <Check /> : <span className="vd-step-num">{index + 1}</span>}
      </span>
      <div className="vd-step-body">
        <div className="vd-step-head">
          <span className={cn('vd-step-icon', viz.tone)} aria-hidden="true">
            <viz.Icon className="size-4" />
          </span>
          <BehoerdenBadge
            name={behoerde?.name_de ?? step.behoerde_id}
            kategorie={behoerde?.kategorie}
          />
          <span className={`badge ${chipTone} vd-step-chip`}>
            <span className="sr-only">Status: </span>
            {tRun(`status.${STATUS_KEY_MAP[step.status]}`)}
          </span>
        </div>
        <p className="vd-step-aktion">{primary}</p>
        {uebermitteltLabel && done ? (
          <p className="vd-step-meta">
            {tv('uebermittelt_label')}: {uebermitteltLabel}
          </p>
        ) : null}

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
