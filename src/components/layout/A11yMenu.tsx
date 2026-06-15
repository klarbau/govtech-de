'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { Accessibility } from 'lucide-react';

import { useA11yPreferences } from '@/lib/a11y/use-a11y-preferences';

import { A11yPanel } from './A11yPanel';

const PANEL_ID = 'a11y-panel';

/**
 * Header trigger for the Bedienhilfen panel. Mirrors the `ThemeToggle`
 * `.gt-header-btn icon` pattern. Shows a small active dot when any preference
 * deviates from the default, so it is visible that Bedienhilfen are engaged.
 */
export function A11yMenu() {
  const t = useTranslations('a11y');
  const { isDefault } = useA11yPreferences();
  const [open, setOpen] = React.useState(false);

  const label = t('menu.open');

  return (
    <>
      <button
        type="button"
        className="gt-header-btn icon relative"
        onClick={() => setOpen(true)}
        aria-label={label}
        title={label}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={PANEL_ID}
      >
        <Accessibility aria-hidden="true" />
        {!isDefault && (
          <span
            aria-hidden="true"
            className="absolute right-1 top-1 size-2 rounded-full bg-primary ring-2 ring-background"
          />
        )}
      </button>
      <A11yPanel id={PANEL_ID} open={open} onOpenChange={setOpen} />
    </>
  );
}
