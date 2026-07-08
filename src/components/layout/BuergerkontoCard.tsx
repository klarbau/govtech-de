'use client';

import Link from 'next/link';
import * as React from 'react';
import { useTranslations } from 'next-intl';
import { ChevronRight, Landmark } from 'lucide-react';

import { api } from '@/lib/mock-backend/api';

/**
 * Archive-faithful „Bürgerkonto" card pinned to the bottom of the sidebar
 * (Liquid-Glass Posteingang only — SideNav renders it just on that route). A
 * green crest tile + the active persona's Meldeort + „Bürgerkonto", linking to
 * the profile. Location comes from the live persona (api.getProfile), not a
 * hardcoded city; renders once loaded to avoid showing a wrong place.
 */
export function BuergerkontoCard() {
  const t = useTranslations('shell.sidebar');
  const [ort, setOrt] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    void api
      .getProfile()
      .then((p) => {
        if (!cancelled) setOrt(p.adresse?.ort ?? null);
      })
      .catch(() => {
        // Decorative — a missing profile just leaves the place line empty.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <Link href="/stammdaten" className="lg-account-card">
      <span className="lg-account-icon" aria-hidden="true">
        <Landmark />
      </span>
      <span className="lg-account-text">
        <span className="lg-account-place">{ort ?? t('buergerkonto')}</span>
        <span className="lg-account-sub">{t('buergerkonto')}</span>
      </span>
      <ChevronRight className="lg-account-chevron" aria-hidden="true" />
    </Link>
  );
}
