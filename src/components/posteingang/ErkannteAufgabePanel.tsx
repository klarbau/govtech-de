'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { format, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';
import { toast } from 'sonner';
import {
  AlertTriangle,
  ArrowRight,
  CalendarPlus,
  CheckCircle2,
  ExternalLink,
  ListChecks,
  Loader2,
} from 'lucide-react';

import { api } from '@/lib/mock-backend';
import type { BriefBridgeTarget } from '@/lib/mock-backend/brief-bridge';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import type { Letter, LetterFrist } from '@/types';

interface ErkannteAufgabePanelProps {
  letter: Letter;
  /**
   * Bridge-Ziel des Archetyps (oder `null` → graceful `action + no-slug`-State).
   * Vom Parent via `bridgeTargetForArchetype(letter.archetype)` aufgelöst.
   */
  bridge: BriefBridgeTarget | null;
  /**
   * Async-geladener Frist-State des Reader-Parents (`api.extrahiereAktion`).
   * Wird durchgereicht statt re-derived, damit der Chip ohne Layout-Sprung
   * nachfüllt (Spec §9 Edge case #1).
   */
  fristen: LetterFrist[];
  /**
   * Scrollt zum + hebt den Original-Satz hervor (vorhandener
   * `OriginaltextBlockHandle.scrollToZitat`). Ersatz-Pfad bei `citation_match=false`.
   */
  onScrollToZitat: (zitat: string) => void;
  /**
   * Parent-eigener Kalender-Handler. Das Panel ruft ihn strukturell nur im
   * `citation_match=true`-Zweig auf (der advisory-Zweig rendert stattdessen einen
   * deaktivierten Button + „Im Original prüfen"). Die Parent-Handler guarden
   * `citation_match === false` zusätzlich defensiv (toast + refuse).
   */
  onAddToCalendar: (frist: LetterFrist) => void;
  /**
   * Inline-3-Pane-Modus: der Reader-Titel ist auf h2 demotiert, daher demotiert
   * das Panel auf h3 (saubere Heading-Order; ein `<h1>` pro Screen).
   */
  embedded?: boolean;
  /**
   * Visuelle Sprache des umgebenden Renderers:
   *  - `'card'`: Shared-Primitive-Look (verwaister `LetterReader`).
   *  - `'post-panel'`: prototype-v2.css „mockup3"-Look des Live-Renderers
   *    `PostDetail` (gleiche Karten-Chrome wie „Was bedeutet das" / „Nächste
   *    Schritte"): `.post-panel` + `.post-panel-head` + `.btn btn-primary`.
   */
  variant?: 'card' | 'post-panel';
  /**
   * Provenienz-Label für „erkannt aus: {label}" (Spec §6.1 = `archetypeText`,
   * z. B. „Erinnerung"). Fällt auf das i18n-Archetyp-Label zurück, wenn nicht
   * gesetzt (der verwaiste `LetterReader` reicht es nicht durch).
   */
  provenanceLabel?: string;
}

function formatFristDe(iso: string): string {
  try {
    return format(parseISO(iso), 'dd.MM.yyyy', { locale: de });
  } catch {
    return iso;
  }
}

/**
 * `<ErkannteAufgabePanel>` — Hero-Karte „Der Brief, der handelt"
 * (docs/specs/brief-der-handelt.md §4.1, §5).
 *
 * Rendert nur für Action-Briefe (`required_action` ODER Frist). Zeigt die
 * erkannte Aufgabe ehrlich (Provenienz + `[ZUKUNFT 2027]`-Disclaimer), die
 * Frist mit citation-Gate (advisory + „Im Original prüfen" bei
 * `citation_match=false`, Kalender-CTA sonst) und — wenn der Archetyp gemappt
 * ist — eine proaktive Bridge in den vorbereiteten Lebenslage-Vorgang.
 *
 * Spiegelt die Form der bestehenden Yellow-Letter-Bridge (`RentenBridgeCTA`):
 * derselbe Karten-Stil, dieselbe Idempotenz-Zeile, derselbe citation-Gate.
 */
export function ErkannteAufgabePanel({
  letter,
  bridge,
  fristen,
  onScrollToZitat,
  onAddToCalendar,
  embedded = false,
  variant = 'card',
  provenanceLabel,
}: ErkannteAufgabePanelProps) {
  const t = useTranslations('posteingang.erkannteAufgabe');
  const tArche = useTranslations('posteingang.archetype.label');
  const tFristTyp = useTranslations('common.frist');
  const tReaderActions = useTranslations('posteingang.reader.actions');
  const router = useRouter();

  const [pending, setPending] = React.useState(false);
  const titleId = React.useId();
  const disabledHintId = React.useId();

  // Render-Gate (Spec §4.1): nur Action-Briefe. Sonst nichts rendern.
  const isActionLetter = Boolean(letter.required_action) || fristen.length > 0;
  if (!isActionLetter) return null;

  const archetype = letter.archetype ?? 'sonstiges';
  const archetypeLabel = provenanceLabel ?? tArche(archetype);
  const isPrepared = Boolean(letter.vorgang_id);
  const HeadingTag = (embedded ? 'h3' : 'h2') as 'h2' | 'h3';
  const isPostPanel = variant === 'post-panel';

  async function onBridgeCta() {
    if (!bridge) return;
    setPending(true);
    try {
      // Idempotenz (Spec §6.2): vorhandenen Vorgang nicht duplizieren.
      if (!letter.vorgang_id) {
        await api.erstelleVorgangAusBrief(letter.id, bridge.vorgangsTyp);
      }
      router.push(bridge.href);
      // pending bleibt true bis zum Routenwechsel (kein Flash); bei Erfolg kein Reset.
    } catch (err) {
      // Edge case #6: Kein Pseudo-Erfolg — Panel bleibt im unprepared-State.
      toast.error(t('cta_error'));
      if (typeof console !== 'undefined') console.error(err);
      setPending(false);
    }
  }

  return (
    <section
      aria-labelledby={titleId}
      data-testid="erkannte-aufgabe-panel"
      className={
        isPostPanel
          ? 'post-panel'
          : 'rounded-xl border border-border bg-card p-4 shadow-sm'
      }
    >
      {isPostPanel ? (
        <div className="post-panel-head">
          <ListChecks aria-hidden="true" />
          <HeadingTag id={titleId}>{t('title')}</HeadingTag>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <ListChecks
            className="size-4 shrink-0 text-foreground"
            aria-hidden="true"
          />
          <HeadingTag
            id={titleId}
            className="text-sm font-semibold tracking-tight text-foreground"
          >
            {t('title')}
          </HeadingTag>
        </div>
      )}

      {/* Provenienz — ehrlich, pattern-basiert. */}
      <p className="mt-1 text-xs text-muted-foreground">
        {t('provenance', { label: archetypeLabel })}
      </p>

      {/* Frist-Chips mit citation-Gate je Frist (Spec §5, §9 #3). */}
      {fristen.length > 0 && (
        <ul className="mt-3 flex flex-col gap-2">
          {fristen.map((frist, i) => {
            const advisory = frist.citation_match === false;
            const datum = formatFristDe(frist.datum);
            const typLabel = tFristTyp(frist.typ);
            const hintId = `${disabledHintId}-${i}`;
            return (
              <li
                key={`erkannte-frist-${i}`}
                className={cn(
                  'rounded-lg border px-3 py-2',
                  advisory
                    ? 'border-amber-300 bg-amber-50 dark:border-amber-700/60 dark:bg-amber-900/20'
                    : 'border-border bg-muted/40',
                )}
              >
                <p className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-foreground">
                  <span className="font-semibold">{t('frist_label')}</span>
                  <span className="font-medium">{datum}</span>
                  <span aria-hidden="true">·</span>
                  <span>{typLabel}</span>
                  {frist.rechtsgrundlage && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span className="text-muted-foreground">
                        {frist.rechtsgrundlage}
                      </span>
                    </>
                  )}
                </p>

                {advisory ? (
                  <div className="mt-2 flex flex-col gap-2">
                    <p className="flex items-center gap-1.5 text-xs text-amber-800 dark:text-amber-200">
                      <AlertTriangle
                        className="size-3.5 shrink-0"
                        aria-hidden="true"
                      />
                      {t('frist_advisory')}
                    </p>
                    <div className="flex flex-wrap items-center gap-3">
                      <button
                        type="button"
                        onClick={() => onScrollToZitat(frist.original_zitat)}
                        className="inline-flex items-center gap-1 text-xs font-medium text-foreground underline underline-offset-2 hover:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                      >
                        {t('frist_im_original')}
                        <ExternalLink className="size-3" aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        disabled
                        aria-disabled="true"
                        aria-describedby={hintId}
                        className="inline-flex cursor-not-allowed items-center gap-1 rounded-md border border-border px-2 py-1 text-xs text-muted-foreground opacity-60"
                      >
                        <CalendarPlus className="size-3" aria-hidden="true" />
                        {tReaderActions('kalender')}
                      </button>
                      <span id={hintId} className="sr-only">
                        {t('calendar_disabled_a11y')}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="mt-2">
                    <button
                      type="button"
                      onClick={() => onAddToCalendar(frist)}
                      className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs font-medium text-foreground hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                    >
                      <CalendarPlus className="size-3" aria-hidden="true" />
                      {tReaderActions('kalender')}
                    </button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {/* Prepared-Zeile (idempotent) — spiegelt RentenBridgeCTA-Applied-State. */}
      {isPrepared && (
        <div
          data-testid="erkannte-aufgabe-prepared"
          className={cn(
            'mt-3 flex flex-wrap items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-900',
            'dark:border-emerald-700/60 dark:bg-emerald-900/30 dark:text-emerald-100',
          )}
        >
          <CheckCircle2 className="size-4 shrink-0" aria-hidden="true" />
          <span>{t('prepared')}</span>
          <Link
            href={`/vorgaenge/${letter.vorgang_id}`}
            className="ml-auto inline-flex items-center gap-1 font-medium underline-offset-2 hover:underline"
          >
            {t('prepared_link')}
            <ArrowRight className="size-3" aria-hidden="true" />
          </Link>
        </div>
      )}

      {/* Bridge-CTA (proaktiv) ODER graceful no-slug (Spec §5). */}
      <div className="mt-3">
        {bridge ? (
          isPostPanel ? (
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => void onBridgeCta()}
              disabled={pending}
              aria-busy={pending ? 'true' : undefined}
              data-testid="erkannte-aufgabe-cta"
            >
              {pending && (
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              )}
              {t(bridge.ctaKey)}
            </button>
          ) : (
            <Button
              type="button"
              onClick={() => void onBridgeCta()}
              disabled={pending}
              aria-busy={pending ? 'true' : undefined}
              data-testid="erkannte-aufgabe-cta"
            >
              {pending && (
                <Loader2 className="mr-1 size-4 animate-spin" aria-hidden="true" />
              )}
              {t(bridge.ctaKey)}
            </Button>
          )
        ) : (
          <p className="text-xs text-muted-foreground">{t('no_target')}</p>
        )}
      </div>

      {/* [ZUKUNFT 2027] Provenienz-Disclaimer — unaufdringlich, [MOCK] erhalten. */}
      <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
        {t('zukunft_hint')}
      </p>
    </section>
  );
}
