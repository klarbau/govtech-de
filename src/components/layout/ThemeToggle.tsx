'use client';

import { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import { useTranslations } from 'next-intl';
import { Monitor, Moon, Sun } from 'lucide-react';

import { Button } from '@/components/ui/button';

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
    <Button
      variant="ghost"
      size="icon-sm"
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
    </Button>
  );
}
