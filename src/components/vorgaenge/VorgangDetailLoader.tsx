'use client';

import * as React from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { format, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Clock,
  Fingerprint,
  Loader2,
} from 'lucide-react';

import { UebermittlungsReceipt } from '@/components/autopilot/UebermittlungsReceipt';
import { ValueReceiptCard } from '@/components/autopilot/ValueReceiptCard';
import { LetterCard } from '@/components/posteingang/LetterCard';
import { BehoerdenBadge } from '@/components/shared/BehoerdenBadge';
import { DatenschutzCockpitLink } from '@/components/shared/DatenschutzCockpitLink';
import { FristDetailModal } from '@/components/shared/FristDetailModal';
import { PrototypeDisclaimer } from '@/components/shared/PrototypeDisclaimer';
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
    return (
      <div aria-busy="true" className="flex flex-col gap-6">
        <div className="flex flex-col gap-2 border-b border-border pb-4">
          <div className="h-7 w-64 animate-pulse rounded-md bg-muted/60" />
          <div className="h-4 w-48 animate-pulse rounded-md bg-muted/60" />
        </div>
        <div className="h-40 animate-pulse rounded-xl bg-muted/40" />
        <div className="h-40 animate-pulse rounded-xl bg-muted/40" />
      </div>
    );
  }

  if (state.kind === 'not-found') {
    return <VorgangDetailNotFound />;
  }

  return <VorgangDetail data={state.data} id={id} />;
}

function VorgangDetailNotFound() {
  const t = useTranslations('umzug.detail');
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold tracking-tight text-foreground">
        {t('not_found_title')}
      </h1>
      <p className="text-sm text-muted-foreground">{t('not_found_body')}</p>
      <Link
        href="/dashboard"
        className="inline-flex h-8 w-fit items-center rounded-lg border border-border bg-background px-3 text-sm font-medium text-foreground hover:bg-muted"
      >
        {t('back_to_dashboard')}
      </Link>
    </div>
  );
}

function VorgangDetail({ data, id }: { data: LoadedState; id: string }) {
  const t = useTranslations('umzug.detail');
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

  return (
    <div className="flex flex-col gap-8">
      <VorgangHeaderClient
        title={vorgang.titel ?? t('title')}
        status={vorgang.status}
        angelegtIso={vorgang.angelegt_am}
        stichtagIso={stichtag}
      />

      {receipt ? <ValueReceiptCard receipt={receipt} variant="static" /> : null}

      {adresseNeu ? (
        <AdresseDiffClient alt={adresseAlt} neu={adresseNeu} />
      ) : null}

      <BehoerdenStatusListClient
        steps={vorgang.schritte}
        behoerdenById={behoerdenById}
        lettersById={lettersById}
      />

      {relatedDocuments.length > 0 ? (
        <VorgangDocuments
          documents={relatedDocuments}
          behoerdenById={behoerdenById}
        />
      ) : null}

      {termine.length > 0 ? (
        <section aria-labelledby="termine-section" className="flex flex-col gap-3">
          <h2 id="termine-section" className="text-sm font-medium text-foreground">
            {t('termin_label_template', { datum: '', ort: '' }).replace(/[,\s]+$/, '')}
          </h2>
          <ul className="grid gap-3 sm:grid-cols-2">
            {termine.map((termin) => (
              <li key={termin.id}>
                <TerminCard
                  termin={termin}
                  behoerde={
                    behoerdenById[termin.behoerde_id] ?? {
                      name_de: termin.behoerde_id,
                    }
                  }
                />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {letters.length > 0 ? (
        <section aria-labelledby="posteingang-section" className="flex flex-col gap-3">
          <h2 id="posteingang-section" className="text-sm font-medium text-foreground">
            {t('posteingang_count', { count: letters.length })}
          </h2>
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

      <div className="flex flex-wrap items-center justify-between gap-3">
        <FristDetailModal />
        <DatenschutzCockpitLink vorgangId={id} />
      </div>

      <PrototypeDisclaimer />
    </div>
  );
}

const statusTone: Record<VorgangStatus, string> = {
  angelegt: 'bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-200',
  in_pruefung: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200',
  genehmigt: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200',
  abgelehnt: 'bg-destructive/15 text-destructive',
  abgeschlossen: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200',
};

function VorgangHeaderClient({
  title,
  status,
  angelegtIso,
  stichtagIso,
}: {
  title: string;
  status: VorgangStatus;
  angelegtIso: string;
  stichtagIso?: string;
}) {
  const t = useTranslations('umzug.detail');
  const angelegtLabel = format(parseISO(angelegtIso), 'd. MMMM yyyy', { locale: de });
  const stichtagLabel = stichtagIso
    ? format(parseISO(stichtagIso), 'd. MMMM yyyy', { locale: de })
    : null;

  const statusKey: 'laeuft' | 'abgeschlossen' | 'fehlerhaft' =
    status === 'abgeschlossen'
      ? 'abgeschlossen'
      : status === 'abgelehnt'
        ? 'fehlerhaft'
        : 'laeuft';

  return (
    <header className="flex flex-col gap-2 border-b border-border pb-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          {title}
        </h1>
        <span
          className={cn(
            'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
            statusTone[status],
          )}
        >
          {t(`status.${statusKey}`)}
        </span>
      </div>
      <p className="text-sm text-muted-foreground">
        {t('angelegt_template', { datum: angelegtLabel })}
        {stichtagLabel ? ` · ${t('stichtag_template', { datum: stichtagLabel })}` : ''}
      </p>
    </header>
  );
}

function AdresseDiffClient({ alt, neu }: { alt?: Adresse; neu: Adresse }) {
  const t = useTranslations('umzug.detail');
  return (
    <dl className="grid gap-3 sm:grid-cols-[auto_auto_1fr] sm:items-start">
      <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {t('adresse_alt')}
      </dt>
      <dd className="text-sm text-muted-foreground line-through sm:col-span-2">
        {alt ? formatAdresse(alt) : '—'}
      </dd>
      <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {t('adresse_neu')}
      </dt>
      <dd className="flex items-center gap-2 text-sm font-medium text-foreground sm:col-span-2">
        <ArrowRight className="size-3.5 text-primary" aria-hidden="true" />
        <span>{formatAdresse(neu)}</span>
      </dd>
    </dl>
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

const STATUS_TEXT_TONE: Record<AutopilotStepStatus, string> = {
  pending: 'text-text-muted',
  in_progress: 'text-primary',
  needs_eid: 'text-primary',
  pending_eid_confirmation: 'text-primary',
  self_assigned: 'text-text-muted',
  confirmed: 'text-success',
  failed: 'text-destructive',
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

function BehoerdenStatusListClient({
  steps,
  behoerdenById,
  lettersById,
}: {
  steps: AutopilotStep[];
  behoerdenById: Record<BehoerdeId, Pick<Behoerde, 'name_de' | 'kategorie'>>;
  lettersById: Record<string, Pick<Letter, 'aktenzeichen' | 'betreff' | 'id'>>;
}) {
  const t = useTranslations('umzug.detail');
  const tRun = useTranslations('umzug.run');
  const tStep = useTranslations('convenience.step');

  return (
    <section aria-labelledby="behoerden-status-title" className="flex flex-col gap-3">
      <h2 id="behoerden-status-title" className="text-sm font-medium text-foreground">
        {t('beteiligte_behoerden_count', { count: steps.length })}
      </h2>
      <ol className="divide-y divide-border rounded-xl border border-border bg-card">
        {steps.map((step) => {
          const viz = STATUS_VIZ[step.status];
          const behoerde = behoerdenById[step.behoerde_id];
          const letter = step.letter_id ? lettersById[step.letter_id] : undefined;
          const primary = step.agent_label ?? step.aktion;
          const hasDatenkategorien =
            Array.isArray(step.datenkategorien) && step.datenkategorien.length > 0;
          return (
            <li
              key={step.id}
              className="grid grid-cols-[24px_1fr_auto] items-start gap-3 px-4 py-3"
            >
              <span
                className={cn('mt-0.5 flex size-5 items-center justify-center', viz.tone)}
                aria-hidden="true"
              >
                <viz.Icon className="size-4" />
              </span>
              <div className="flex min-w-0 flex-col gap-1">
                <BehoerdenBadge
                  name={behoerde?.name_de ?? step.behoerde_id}
                  kategorie={behoerde?.kategorie}
                />
                <p className="ml-9 text-sm font-medium text-foreground">{primary}</p>
                <p className="ml-9 text-xs text-muted-foreground">
                  {step.aktion}
                  {step.rechtsgrundlage ? (
                    <>
                      {' · '}
                      <span className="font-medium">{tStep('basis_label')}:</span>{' '}
                      {step.rechtsgrundlage}
                    </>
                  ) : null}
                </p>
                {letter?.aktenzeichen ? (
                  <p className="ml-9 font-mono text-[11px] text-muted-foreground">
                    {t('aktz_label')}: {letter.aktenzeichen}
                  </p>
                ) : null}
                {letter?.betreff ? (
                  <p className="ml-9 text-xs text-muted-foreground">
                    {t('brief_label')}: {letter.betreff}
                  </p>
                ) : null}
                {hasDatenkategorien ? (
                  <div className="ml-9">
                    <UebermittlungsReceipt
                      id={step.id}
                      datenkategorien={step.datenkategorien ?? []}
                      rechtsgrundlage={step.rechtsgrundlage}
                      consentGivenAt={step.consent_given_at}
                    />
                  </div>
                ) : null}
              </div>
              <span
                className={cn('text-xs font-medium', STATUS_TEXT_TONE[step.status])}
              >
                <span className="sr-only">Status: </span>
                {tRun(`status.${STATUS_KEY_MAP[step.status]}`)}
              </span>
            </li>
          );
        })}
      </ol>
    </section>
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
    <section aria-labelledby="vorgang-docs" className="flex flex-col gap-3">
      <h2 id="vorgang-docs" className="text-sm font-medium text-foreground">
        {t('dokumente_count', { count: documents.length })}
      </h2>
      <ul className="grid gap-3 sm:grid-cols-2">
        {documents.map((doc) => (
          <li key={doc.id}>
            <Link
              href="/dokumente"
              className="flex flex-col gap-1 rounded-xl border border-border bg-card p-4 transition-shadow hover:shadow-sm"
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
