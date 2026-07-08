'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';

import {
  useLiveSignals,
  useTransientFlag,
} from '@/components/providers/LiveBackendProvider';

/**
 * Beat 3 — dezenter Unread-Zähler am Posteingang-Eintrag der Navigation. Liest
 * den gebündelten `unreadCount` aus dem Live-Hub (initial geseedet aus
 * `getLetters`, danach live via Bus). Bei einem Inkrement ein einmaliger
 * Micro-Pop; Reduced-Motion neutralisiert den Pop global. Null ungelesen →
 * rendert nichts.
 */
export function PosteingangUnreadBadge() {
  const t = useTranslations('liveness');
  const { unreadCount } = useLiveSignals();
  const [popped, pop] = useTransientFlag(240);
  const prevRef = React.useRef(unreadCount);

  React.useEffect(() => {
    if (unreadCount > prevRef.current) pop();
    prevRef.current = unreadCount;
  }, [unreadCount, pop]);

  if (unreadCount <= 0) return null;

  return (
    <span
      className={`lw-nav-badge${popped ? ' lw-nav-badge--pop' : ''}`}
      aria-label={t('unread_badge_aria', { count: unreadCount })}
    >
      {unreadCount > 99 ? '99+' : unreadCount}
    </span>
  );
}
