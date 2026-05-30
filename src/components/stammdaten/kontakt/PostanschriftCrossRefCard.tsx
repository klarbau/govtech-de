import { useTranslations } from 'next-intl';
import { ArrowRight } from 'lucide-react';

import { wrapNormZitate } from '@/components/posteingang/wrapNormZitate';

/**
 * `<PostanschriftCrossRefCard>` — Spec § 6.6.
 *
 * Card 4: Cross-Reference zur V1-Anschrift-Sektion. Kein Doppel-Display
 * der Anschrift; Hinweis-Block + Link mit `aria-label`. Authoritative
 * Quelle: Melderegister (§ 3 BMG).
 */
export function PostanschriftCrossRefCard() {
  const t = useTranslations('stammdaten.kontakt');
  const tCard = useTranslations('stammdaten.kontakt.card.postanschrift');

  return (
    <article
      className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4"
      data-testid="postanschrift-cross-ref-card"
    >
      <header>
        <h3 className="text-sm font-semibold tracking-tight text-foreground">
          {tCard('title')}
        </h3>
      </header>

      <p className="text-xs leading-relaxed text-muted-foreground">
        {wrapNormZitate(t('postanschrift.cross_ref_pointer'))}
      </p>

      <a
        href="#anschrift"
        aria-label={tCard('cross_ref_link_label')}
        className="inline-flex w-fit items-center gap-1 rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        data-testid="postanschrift-cross-ref-link"
      >
        {tCard('cross_ref_link_label')}
        <ArrowRight aria-hidden="true" className="size-3" />
      </a>
    </article>
  );
}
