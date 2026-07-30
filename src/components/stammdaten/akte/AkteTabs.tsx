'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';

export type AkteTabId = 'ueberblick' | 'persoenlich' | 'dokumente' | 'verlauf';

const TAB_IDS: AkteTabId[] = [
  'ueberblick',
  'persoenlich',
  'dokumente',
  'verlauf',
];

interface AkteTabsRailProps {
  /** Controlled: the rail's „Alle Aktivitäten" also switches this. */
  aktiv: AkteTabId;
  onAktivChange: (id: AkteTabId) => void;
}

interface AkteTabsPanelsProps {
  panels: Record<AkteTabId, React.ReactNode>;
  aktiv: AkteTabId;
}

/**
 * The four registers of the Stammdaten screen (Spec § 4.3), built on the tab
 * pattern the repo already ships (`DokumenteView` detail tabs): roving
 * tabindex, ←/→/Home/End with wrap-around, `aria-selected`/`aria-controls`.
 *
 * Rail and panels are two components because they live in two places since the
 * layout addendum (Spec § 14): the tablist is the last child of the identity
 * column, beside the lower half of the portrait, while the panels stay full
 * width beneath the hero. `aria-controls`/`aria-labelledby` carry the pairing,
 * so the distance in the DOM changes nothing about the semantics.
 *
 * The active tab is marked by weight AND a 2px underline, never by colour
 * alone; the focus stays on the tab button after a switch (no scroll jump).
 */
export function AkteTabsRail({ aktiv, onAktivChange }: AkteTabsRailProps) {
  const t = useTranslations('stammdaten.akte');
  const tabRefs = React.useRef<Array<HTMLButtonElement | null>>([]);

  function onTabKeyDown(e: React.KeyboardEvent, idx: number) {
    const last = TAB_IDS.length - 1;
    let next = idx;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown')
      next = idx === last ? 0 : idx + 1;
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp')
      next = idx === 0 ? last : idx - 1;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = last;
    else return;
    e.preventDefault();
    onAktivChange(TAB_IDS[next]);
    tabRefs.current[next]?.focus();
  }

  return (
    /* The hairline sits on the wrapper, not on the scroller: ≤767 the scroller
       gets vertical breathing room (`.m-shelf` pattern) so the tab focus rings
       are not swallowed by its own overflow — with the border on the scroller
       that padding would push the rail away from the active tab's underline. */
    <div className="sd-tabs-rail border-b border-border">
      <div
        role="tablist"
        aria-label={t('tabs.aria')}
        data-testid="sd-tabs"
        className="sd-tabs-scroll flex gap-x-6"
      >
        {TAB_IDS.map((id, idx) => (
          <button
            key={id}
            type="button"
            role="tab"
            id={`sd-tab-${id}`}
            data-testid={`sd-tab-${id}`}
            ref={(el) => {
              tabRefs.current[idx] = el;
            }}
            aria-selected={aktiv === id}
            aria-controls={`sd-panel-${id}`}
            tabIndex={aktiv === id ? 0 : -1}
            onClick={() => onAktivChange(id)}
            onKeyDown={(e) => onTabKeyDown(e, idx)}
            className={`-mb-px inline-flex min-h-11 shrink-0 items-center whitespace-nowrap border-b-2 px-0.5 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${
              aktiv === id
                ? 'border-primary font-medium text-text-primary'
                : 'border-transparent text-text-secondary hover:text-text-primary'
            }`}
          >
            {t(`tabs.${id}`)}
          </button>
        ))}
      </div>
    </div>
  );
}

/**
 * The panels of the same four registers, full width beneath the hero.
 *
 * Only the active panel is mounted. `Datenblatt` and `Aenderungsprotokoll` set
 * fixed DOM `id`s, so keeping the inactive ones in the tree would duplicate
 * them — and duplicate ids are exactly what the axe scan on this page trips on.
 */
export function AkteTabsPanels({ panels, aktiv }: AkteTabsPanelsProps) {
  return (
    <>
      {TAB_IDS.map((id) => (
        <section
          key={id}
          role="tabpanel"
          id={`sd-panel-${id}`}
          data-testid={`sd-panel-${id}`}
          aria-labelledby={`sd-tab-${id}`}
          tabIndex={0}
          hidden={aktiv !== id}
          className="focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          {aktiv === id ? panels[id] : null}
        </section>
      ))}
    </>
  );
}
