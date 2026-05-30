import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';

import { ValueReceiptCard } from '@/components/autopilot/ValueReceiptCard';
import { LetterCard } from '@/components/posteingang/LetterCard';
import { DatenschutzCockpitLink } from '@/components/shared/DatenschutzCockpitLink';
import { FristDetailModal } from '@/components/shared/FristDetailModal';
import { PrototypeDisclaimer } from '@/components/shared/PrototypeDisclaimer';
import { TerminCard } from '@/components/shared/TerminCard';
import { AdresseDiff } from '@/components/umzug/AdresseDiff';
import { BehoerdenStatusList } from '@/components/umzug/BehoerdenStatusList';
import { VorgangHeader } from '@/components/umzug/VorgangHeader';
import { api } from '@/lib/mock-backend/api';
import type {
  Adresse,
  Behoerde,
  BehoerdeId,
  Document,
  Letter,
  Termin,
  ValueReceipt,
  Vorgang,
} from '@/types';

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

interface UmzugDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function UmzugDetailPage({ params }: UmzugDetailPageProps) {
  const { id } = await params;
  const t = await getTranslations('umzug.detail');

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
    return <UmzugDetailNotFound />;
  }
  if (!vorgang) {
    notFound();
  }

  let behoerden: Behoerde[] = [];
  try {
    behoerden = await api.getBehoerden();
  } catch {
    behoerden = [];
  }

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

  // A4 / B1: completed Umzug shows its value receipt; A5: minted artefacts
  // (Meldebestätigung, Zulassungsbescheinigung, …) deep-linked via getVorgangRelated.
  let receipt: ValueReceipt | null = null;
  let relatedDocuments: Document[] = [];
  if (vorgang.status === 'abgeschlossen') {
    try {
      receipt = await api.getValueReceipt(id);
    } catch {
      receipt = null;
    }
  }
  try {
    const related = await api.getVorgangRelated(id);
    relatedDocuments = related.documents;
  } catch {
    relatedDocuments = [];
  }

  return (
    <div className="flex flex-col gap-8">
      <VorgangHeader
        title={vorgang.titel ?? t('title')}
        status={vorgang.status}
        angelegtIso={vorgang.angelegt_am}
        stichtagIso={stichtag}
      />

      {receipt ? <ValueReceiptCard receipt={receipt} variant="static" /> : null}

      {adresseNeu ? <AdresseDiff alt={adresseAlt} neu={adresseNeu} /> : null}

      <BehoerdenStatusList
        steps={vorgang.schritte}
        behoerdenById={behoerdenById}
        lettersById={lettersById}
      />

      {relatedDocuments.length > 0 ? (
        <VorgangDocuments documents={relatedDocuments} behoerdenById={behoerdenById} />
      ) : null}

      {termine.length > 0 ? (
        <section
          aria-labelledby="termine-section"
          className="flex flex-col gap-3"
        >
          <h2 id="termine-section" className="text-sm font-medium text-foreground">
            {t('termin_label_template', {
              datum: '',
              ort: '',
            }).replace(/[,\s]+$/, '')}
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
        <section
          aria-labelledby="posteingang-section"
          className="flex flex-col gap-3"
        >
          <h2
            id="posteingang-section"
            className="text-sm font-medium text-foreground"
          >
            {t('posteingang_count', { count: letters.length })}
          </h2>
          <ul className="flex flex-col gap-2">
            {letters.map((letter) => (
              <li key={letter.id}>
                <LetterCard
                  letter={letter}
                  absender={behoerdenById[letter.absender_behoerde_id]}
                />
              </li>
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

async function VorgangDocuments({
  documents,
  behoerdenById,
}: {
  documents: Document[];
  behoerdenById: Record<BehoerdeId, Pick<Behoerde, 'name_de' | 'kategorie'>>;
}) {
  const t = await getTranslations('umzug.detail');
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
                <span className="text-sm font-medium text-foreground">
                  {doc.titel}
                </span>
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

async function UmzugDetailNotFound() {
  const t = await getTranslations('umzug.detail');
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
