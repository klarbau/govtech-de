'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { format, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';
import { useTranslations } from 'next-intl';
import { ArrowLeft } from 'lucide-react';

import { PrototypeDisclaimer } from '@/components/shared/PrototypeDisclaimer';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { CascadePreview } from '@/components/umzug/CascadePreview';
import { api } from '@/lib/mock-backend/api';
import { useUmzugDraft } from '@/stores/umzugDraft';
import type {
  Behoerde,
  BehoerdeId,
  UmzugInput,
  UmzugPreview,
} from '@/types';

export default function UmzugPreviewPage() {
  const router = useRouter();
  const t = useTranslations('umzug.preview');
  const tCommon = useTranslations('common');
  const draft = useUmzugDraft();

  const [preview, setPreview] = useState<UmzugPreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [behoerdenById, setBehoerdenById] = useState<
    Record<BehoerdeId, Pick<Behoerde, 'name_de' | 'kategorie'>>
  >({});
  const [, startTransition] = useTransition();
  const [isStarting, setIsStarting] = useState(false);

  useEffect(() => {
    if (!draft.neueAdresse || !draft.stichtagIso) {
      router.replace('/vorgaenge/umzug/start');
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const result = await api.previewUmzug({
          neue_adresse: draft.neueAdresse!,
          stichtag: draft.stichtagIso!,
        });
        if (!cancelled) setPreview(result);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : t('error'));
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [draft.neueAdresse, draft.stichtagIso, router, t]);

  const subtitleAdresse = draft.neueAdresse
    ? `${draft.neueAdresse.strasse} ${draft.neueAdresse.hausnummer}${draft.neueAdresse.zusatz ? ' ' + draft.neueAdresse.zusatz : ''}, ${draft.neueAdresse.plz} ${draft.neueAdresse.ort}`
    : '';
  const subtitleStichtag = draft.stichtagIso
    ? format(parseISO(draft.stichtagIso), 'd. MMMM yyyy', { locale: de })
    : '';

  function handleStart(consents: BehoerdeId[]) {
    if (!draft.neueAdresse || !draft.stichtagIso) return;
    setIsStarting(true);
    const input: UmzugInput = {
      neue_adresse: draft.neueAdresse,
      stichtag: draft.stichtagIso,
      betroffene_personen: [],
      consents,
      source: 'ui',
    };
    startTransition(() => {
      void api
        .startUmzug(input)
        .then(({ vorgangId }) => {
          router.push(`/vorgaenge/umzug/run?vorgangId=${encodeURIComponent(vorgangId)}`);
        })
        .catch((err) => {
          setError(err instanceof Error ? err.message : t('error'));
          setIsStarting(false);
        });
    });
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <Link
          href="/vorgaenge/umzug/start"
          className="inline-flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          {tCommon('cta.zurueck')}
        </Link>
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">
          {t('title')}
        </h1>
        {draft.neueAdresse && draft.stichtagIso ? (
          <p className="text-muted-foreground">
            {t('subtitle_template', {
              adresse: subtitleAdresse,
              stichtag: subtitleStichtag,
            })}
          </p>
        ) : null}
      </div>

      {error ? (
        <Card>
          <CardContent>
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
            <Button
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={() => router.refresh()}
            >
              {tCommon('cta.erneut_versuchen')}
            </Button>
          </CardContent>
        </Card>
      ) : !preview ? (
        <Card aria-busy="true">
          <CardContent>
            <p className="text-sm text-muted-foreground">{t('loading')}</p>
          </CardContent>
        </Card>
      ) : (
        <CascadePreview
          preview={preview}
          behoerdenById={behoerdenById}
          onStart={handleStart}
          isStarting={isStarting}
        />
      )}

      <PrototypeDisclaimer />

      <BehoerdenLoader onLoaded={setBehoerdenById} />
    </div>
  );
}

interface BehoerdenLoaderProps {
  onLoaded: (
    map: Record<BehoerdeId, Pick<Behoerde, 'name_de' | 'kategorie'>>,
  ) => void;
}

function BehoerdenLoader({ onLoaded }: BehoerdenLoaderProps) {
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const list = await api.getBehoerden();
        if (cancelled) return;
        const map: Record<BehoerdeId, Pick<Behoerde, 'name_de' | 'kategorie'>> = {};
        for (const b of list) {
          map[b.id] = { name_de: b.name_de, kategorie: b.kategorie };
        }
        onLoaded(map);
      } catch {
        // ignore — names will fall back to behoerde_id literals
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [onLoaded]);
  return null;
}
