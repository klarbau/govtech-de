'use client';

import { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import { useTranslations } from 'next-intl';
import { Monitor, Moon, Sun } from 'lucide-react';

/**
 * `.gt-header-btn.icon` from the HTML prototype: a 36px square ghost button
 * holding only the icon. Cycles light → dark → system (existing behaviour).
 */
export function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const t = useTranslations('topbar');

  useEffect(() => {
    setMounted(true);
  }, []);

  const current = mounted ? (theme ?? 'system') : 'system';
  const next = current === 'system' ? 'light' : current === 'light' ? 'dark' : 'system';
  const labels: Record<string, string> = {
    light: t('theme_toggle_light'),
    dark: t('theme_toggle_dark'),
    system: t('theme_toggle_system'),
  };

  const isDark = mounted ? resolvedTheme === 'dark' : false;

  return (
    <button
      type="button"
      className="gt-header-btn icon"
      onClick={() => setTheme(next)}
      aria-label={labels[next]}
      title={labels[current]}
    >
      {current === 'system' ? (
        <Monitor aria-hidden="true" />
      ) : isDark ? (
        <Moon aria-hidden="true" />
      ) : (
        <Sun aria-hidden="true" />
      )}
    </button>
  );
}
