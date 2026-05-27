'use client';

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { format, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { PrototypeDisclaimer } from '@/components/shared/PrototypeDisclaimer';
import { AutopilotTimeline } from '@/components/umzug/AutopilotTimeline';
import { EidConfirmDialog } from '@/components/umzug/EidConfirmDialog';
import { WizardProgress } from '@/components/umzug/WizardProgress';
import { api } from '@/lib/mock-backend/api';
import type {
  AutopilotStep,
  Behoerde,
  BehoerdeId,
  Letter,
  MockBackendEvent,
  Vorgang,
} from '@/types';

function UmzugRunInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const vorgangId = searchParams?.get('vorgangId') ?? null;
  const t = useTranslations('umzug.run');

  const [vorgang, setVorgang] = useState<Vorgang | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [behoerdenById, setBehoerdenById] = useState<
    Record<BehoerdeId, Pick<Behoerde, 'name_de' | 'kategorie'>>
  >({});
  const [lettersById, setLettersById] = useState<
    Record<string, Pick<Letter, 'aktenzeichen'>>
  >({});
  const [eidStepId, setEidStepId] = useState<string | null>(null);
  const [cancelOpen, setCancelOpen] = useState(false);

  useEffect(() => {
    if (!vorgangId) {
      router.replace('/vorgaenge/umzug/start');
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const v = await api.getVorgang(vorgangId);
        if (!cancelled) setVorgang(v);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Fehler');
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [vorgangId, router]);

  useEffect(() => {
    if (!vorgangId) return;
    const unsubscribe = api.subscribe((event: MockBackendEvent) => {
      if (event.type === 'autopilot_step' && event.vorgangId === vorgangId) {
        setVorgang((prev) => {
          if (!prev) return prev;
          const idx = prev.schritte.findIndex((s) => s.id === event.step.id);
          const nextSteps =
            idx === -1
              ? [...prev.schritte, event.step]
              : prev.schritte.map((s, i) => (i === idx ? event.step : s));
          return { ...prev, schritte: nextSteps };
        });
      }
      if (event.type === 'letter_received') {
        setLettersById((prev) => ({
          ...prev,
          [event.letter.id]: { aktenzeichen: event.letter.aktenzeichen },
        }));
      }
      if (
        event.type === 'vorgang_status_changed' &&
        event.vorgangId === vorgangId
      ) {
        setVorgang((prev) => (prev ? { ...prev, status: event.status } : prev));
      }
    });
    return () => {
      unsubscribe();
    };
  }, [vorgangId]);

  const eidStep: AutopilotStep | null = useMemo(() => {
    if (!eidStepId || !vorgang) return null;
    return vorgang.schritte.find((s) => s.id === eidStepId) ?? null;
  }, [eidStepId, vorgang]);

  const eidBehoerdeName = eidStep
    ? (behoerdenById[eidStep.behoerde_id]?.name_de ?? eidStep.behoerde_id)
    : '';

  const handleConfirmEid = useCallback(async () => {
    if (!vorgangId || !eidStepId) return;
    try {
      await api.bestaetigeAutopilotSchritt(vorgangId, eidStepId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler');
    }
  }, [vorgangId, eidStepId]);

  async function handleCancelConfirmed() {
    if (!vorgangId) return;
    try {
      await api.cancelUmzug(vorgangId);
      setCancelOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler');
    }
  }

  const subtitle =
    vorgang?.context && typeof vorgang.context === 'object'
      ? formatRunSubtitle(vorgang.context)
      : null;

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-4">
        <WizardProgress currentStep={2} />
        <div className="flex flex-col gap-2">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground tabular-nums">
            {vorgangId ? t('vorgang_label', { id: vorgangId }) : ''}
          </p>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">
            {t('title')}
          </h1>
          {subtitle ? (
            <p className="text-muted-foreground">
              {t('subtitle_template', subtitle)}
            </p>
          ) : null}
        </div>
      </header>

      {error ? (
        <Card>
          <CardContent>
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          </CardContent>
        </Card>
      ) : !vorgang ? (
        <Card aria-busy="true">
          <CardContent>
            <ul className="flex flex-col gap-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <li
                  key={i}
                  className="h-10 animate-pulse rounded-md bg-muted/50"
                />
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : (
        <AutopilotTimeline
          steps={vorgang.schritte}
          behoerdenById={behoerdenById}
          lettersById={lettersById}
          onConfirmEid={(stepId) => setEidStepId(stepId)}
        />
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCancelOpen(true)}
          >
            {t('cta_cancel')}
          </Button>
        </div>
        {vorgangId ? (
          <Button
            variant="default"
            onClick={() =>
              router.push(`/vorgaenge/umzug/${encodeURIComponent(vorgangId)}`)
            }
          >
            {t('cta_to_vorgang')}
          </Button>
        ) : null}
      </div>

      <PrototypeDisclaimer />

      <EidConfirmDialog
        open={Boolean(eidStep)}
        onOpenChange={(open) => {
          if (!open) setEidStepId(null);
        }}
        behoerdeName={eidBehoerdeName}
        onConfirm={handleConfirmEid}
      />

      <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('cancel_dialog.title')}</DialogTitle>
            <DialogDescription>{t('cancel_dialog.body')}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelOpen(false)}>
              {t('cancel_dialog.cta_keep_running')}
            </Button>
            <Button variant="destructive" onClick={handleCancelConfirmed}>
              {t('cancel_dialog.cta_confirm_cancel')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <BehoerdenLoader onLoaded={setBehoerdenById} />
    </div>
  );
}

function formatRunSubtitle(
  context: Record<string, unknown>,
): { adresse: string; stichtag: string } | null {
  const adresseValue = context.neue_adresse;
  const stichtagValue = context.stichtag ?? context.stichtag_iso;
  if (
    typeof stichtagValue !== 'string' ||
    typeof adresseValue !== 'object' ||
    adresseValue === null
  ) {
    return null;
  }
  const a = adresseValue as Record<string, unknown>;
  const strasse = typeof a.strasse === 'string' ? a.strasse : '';
  const hausnummer = typeof a.hausnummer === 'string' ? a.hausnummer : '';
  const zusatz = typeof a.zusatz === 'string' ? a.zusatz : '';
  const plz = typeof a.plz === 'string' ? a.plz : '';
  const ort = typeof a.ort === 'string' ? a.ort : '';
  const adresse = `${strasse} ${hausnummer}${zusatz ? ' ' + zusatz : ''}, ${plz} ${ort}`.trim();
  const stichtag = format(parseISO(stichtagValue), 'd. MMMM yyyy', {
    locale: de,
  });
  return { adresse, stichtag };
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
        // ignore — names fall back to behoerde_id
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [onLoaded]);
  return null;
}

export default function UmzugRunPage() {
  return (
    <Suspense fallback={null}>
      <UmzugRunInner />
    </Suspense>
  );
}
