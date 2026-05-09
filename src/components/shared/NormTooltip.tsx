'use client';

import { useTranslations } from 'next-intl';
import { ExternalLink, Info } from 'lucide-react';

import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

/**
 * Statische Liste der erlaubten Norm-Kürzel ↔ URL ↔ i18n-Key Mappings
 * (Spec §8.5). Komponenten dürfen nur diese Kürzel rendern; alles andere
 * fällt zurück auf reinen Text ohne Tooltip.
 */
const NORM_TARGETS = {
  '§ 41 Abs. 2 VwVfG': {
    url: 'https://www.gesetze-im-internet.de/vwvfg/__41.html',
    i18n: 'posteingang.normtooltip.vwvfg_41_2',
  },
  '§ 41 Abs. 2a VwVfG': {
    url: 'https://www.gesetze-im-internet.de/vwvfg/__41.html',
    i18n: 'posteingang.normtooltip.vwvfg_41_2a',
  },
  '§ 122 AO': {
    url: 'https://www.gesetze-im-internet.de/ao_1977/__122.html',
    i18n: 'posteingang.normtooltip.ao_122',
  },
  '§ 122a AO': {
    url: 'https://www.gesetze-im-internet.de/ao_1977/__122a.html',
    i18n: 'posteingang.normtooltip.ao_122a',
  },
  '§ 5 VwZG': {
    url: 'https://www.gesetze-im-internet.de/vwzg_2005/__5.html',
    i18n: 'posteingang.normtooltip.vwzg_5',
  },
  '§ 240 AO': {
    url: 'https://www.gesetze-im-internet.de/ao_1977/__240.html',
    i18n: 'posteingang.normtooltip.ao_240',
  },
  '§ 361 AO': {
    url: 'https://www.gesetze-im-internet.de/ao_1977/__361.html',
    i18n: 'posteingang.normtooltip.ao_361',
  },
  '§ 355 AO': {
    url: 'https://www.gesetze-im-internet.de/ao_1977/__355.html',
    i18n: 'posteingang.normtooltip.ao_355',
  },
  '§ 357 AO': {
    url: 'https://www.gesetze-im-internet.de/ao_1977/__357.html',
    i18n: 'posteingang.normtooltip.ao_357',
  },
  '§ 70 VwGO': {
    url: 'https://www.gesetze-im-internet.de/vwgo/__70.html',
    i18n: 'posteingang.normtooltip.vwgo_70',
  },
  '§ 84 SGG': {
    url: 'https://www.gesetze-im-internet.de/sgg/__84.html',
    i18n: 'posteingang.normtooltip.sgg_84',
  },
  '§ 67 OWiG': {
    url: 'https://www.gesetze-im-internet.de/owig_1968/__67.html',
    i18n: 'posteingang.normtooltip.owig_67',
  },
  '§ 2 RDG': {
    url: 'https://www.gesetze-im-internet.de/rdg/__2.html',
    i18n: 'posteingang.normtooltip.rdg_2',
  },
  '§ 30 AO': {
    url: 'https://www.gesetze-im-internet.de/ao_1977/__30.html',
    i18n: 'posteingang.normtooltip.ao_30',
  },
  '§ 87a AO': {
    url: 'https://www.gesetze-im-internet.de/ao_1977/__87a.html',
    i18n: 'posteingang.normtooltip.ao_87a',
  },
  '§ 22 BDSG': {
    url: 'https://www.gesetze-im-internet.de/bdsg_2018/__22.html',
    i18n: 'posteingang.normtooltip.bdsg_22',
  },
  '§ 68 EStG': {
    url: 'https://www.gesetze-im-internet.de/estg/__68.html',
    i18n: 'posteingang.normtooltip.estg_68',
  },
  '§ 81 Abs. 4 AufenthG': {
    url: 'https://www.gesetze-im-internet.de/aufenthg_2004/__81.html',
    i18n: 'posteingang.normtooltip.aufenthg_81_4',
  },
  '§ 110 AO': {
    url: 'https://www.gesetze-im-internet.de/ao_1977/__110.html',
    i18n: 'posteingang.normtooltip.ao_110',
  },
  'Art. 6 DSGVO': {
    url: 'https://dsgvo-gesetz.de/art-6-dsgvo/',
    i18n: 'posteingang.normtooltip.dsgvo_6',
  },
  'Art. 9 DSGVO': {
    url: 'https://dsgvo-gesetz.de/art-9-dsgvo/',
    i18n: 'posteingang.normtooltip.dsgvo_9',
  },
  'Art. 22 DSGVO': {
    url: 'https://dsgvo-gesetz.de/art-22-dsgvo/',
    i18n: 'posteingang.normtooltip.dsgvo_22',
  },
  'Art. 28 DSGVO': {
    url: 'https://dsgvo-gesetz.de/art-28-dsgvo/',
    i18n: 'posteingang.normtooltip.dsgvo_28',
  },
  'BGH I ZR 113/20': {
    url: 'https://www.bundesgerichtshof.de/SharedDocs/Pressemitteilungen/DE/2021/2021167.html',
    i18n: 'posteingang.normtooltip.bgh_smartlaw',
  },
} as const satisfies Record<string, { url: string; i18n: string }>;

export type NormKuerzel = keyof typeof NORM_TARGETS;

interface NormTooltipProps {
  norm: string;
  className?: string;
}

function isKnownNorm(value: string): value is NormKuerzel {
  return Object.prototype.hasOwnProperty.call(NORM_TARGETS, value);
}

/**
 * Inline-Norm-Tooltip mit kurzer Erklärung + externem Link auf
 * `gesetze-im-internet.de` o. ä. URLs aus Spec §8.5 sind hardcoded;
 * unbekannte Norm-Kürzel werden ohne Tooltip als Plaintext gerendert
 * (Audit-Schutz, kein freies Linken).
 */
export function NormTooltip({ norm, className }: NormTooltipProps) {
  const t = useTranslations();
  const tCommon = useTranslations('posteingang.normtooltip');

  if (!isKnownNorm(norm)) {
    return <span className={cn('font-mono text-xs', className)}>{norm}</span>;
  }
  const target = NORM_TARGETS[norm];

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <button
            type="button"
            aria-label={`${norm} – ${tCommon('aria_open')}`}
            className={cn(
              'inline-flex items-center gap-1 rounded-md border border-border bg-muted/40 px-1.5 py-0.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:bg-muted focus-visible:text-foreground',
              className,
            )}
          />
        }
      >
        <Info className="size-3" aria-hidden="true" />
        <span className="font-mono">{norm}</span>
      </TooltipTrigger>
      <TooltipContent className="max-w-sm whitespace-normal text-left text-xs leading-relaxed">
        <span className="block font-semibold">{norm}</span>
        <span className="mt-1 block">{t(target.i18n)}</span>
        <a
          href={target.url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 inline-flex items-center gap-1 text-[11px] underline underline-offset-4"
        >
          <ExternalLink className="size-3" aria-hidden="true" />
          gesetze-im-internet.de
        </a>
      </TooltipContent>
    </Tooltip>
  );
}

export { NORM_TARGETS };
