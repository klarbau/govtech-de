'use client';

import * as React from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import {
  Accessibility,
  ArrowRight,
  Baby,
  BadgeCheck,
  BadgeEuro,
  Briefcase,
  Car,
  Check,
  ChevronDown,
  ChevronRight,
  Clock,
  Coins,
  Globe,
  Heart,
  Home,
  Landmark,
  Lock,
  MessageCircle,
  Pencil,
  Search,
  ShieldCheck,
  Sparkles,
  Tag,
  Users,
  type LucideIcon,
} from 'lucide-react';

import { api } from '@/lib/mock-backend';
import type { LebenslageCatalogEntry } from '@/lib/mock-backend/lebenslagen/types';
import { Skeleton } from '@/components/shared/Skeleton';
import { cn } from '@/lib/utils';

type CategoryId =
  | 'alle'
  | 'familie'
  | 'wohnen'
  | 'arbeit'
  | 'migration'
  | 'gesundheit'
  | 'mobilitaet'
  | 'rente'
  | 'mehr';

type IconTone = 'brand' | 'green' | 'amber' | 'violet' | 'teal' | 'pink';

/** Filter chips in the header. Each maps onto config.kategorie where one exists. */
interface ChipDef {
  id: CategoryId;
  icon?: LucideIcon;
  trailing?: LucideIcon;
}

const CHIPS: ChipDef[] = [
  { id: 'alle' },
  { id: 'familie', icon: Users },
  { id: 'wohnen', icon: Home },
  { id: 'arbeit', icon: Briefcase },
  { id: 'migration', icon: Globe },
  { id: 'gesundheit', icon: Heart },
  { id: 'mobilitaet', icon: Car },
  { id: 'rente', icon: Coins },
  { id: 'mehr', trailing: ChevronDown },
];

/** The six REAL, functional Lebenslagen surfaced as "Beliebte" cards.
 *  Each href points only at an existing detail page (honesty-lock). */
interface BeliebtEntry {
  /** slug used to read the catalog counts + i18n title/desc. */
  slug: string;
  href: string;
  icon: LucideIcon;
  tone: IconTone;
  /** Chip filter this card belongs to. */
  category: CategoryId;
  /** i18n key under lebenslagen.beliebte.{key}.title/desc — falls back to services. */
  i18nKey: string;
}

const BELIEBTE: BeliebtEntry[] = [
  { slug: 'geburt', href: '/lebenslagen/geburt', icon: Baby, tone: 'pink', category: 'familie', i18nKey: 'geburt' },
  { slug: 'umzug', href: '/vorgaenge/umzug/start', icon: Home, tone: 'brand', category: 'wohnen', i18nKey: 'umzug' },
  {
    slug: 'aufenthalt-verlaengerung',
    href: '/lebenslagen/aufenthalt-verlaengerung',
    icon: Globe,
    tone: 'violet',
    category: 'migration',
    i18nKey: 'aufenthalt',
  },
  { slug: 'kindergeld', href: '/lebenslagen/kindergeld', icon: Users, tone: 'amber', category: 'familie', i18nKey: 'kindergeld' },
  { slug: 'wohngeld', href: '/lebenslagen/wohngeld', icon: BadgeEuro, tone: 'teal', category: 'wohnen', i18nKey: 'wohngeld' },
  { slug: 'pflegegrad', href: '/lebenslagen/pflegegrad', icon: Heart, tone: 'pink', category: 'gesundheit', i18nKey: 'pflege' },
];

/** Real detail destinations for directory checklist items (honesty-lock). */
const REAL_HREFS: Record<string, string> = {
  geburt: '/lebenslagen/geburt',
  kindergeld: '/lebenslagen/kindergeld',
  umzug: '/vorgaenge/umzug/start',
  wohngeld: '/lebenslagen/wohngeld',
  aufenthalt: '/lebenslagen/aufenthalt-verlaengerung',
  pflege: '/lebenslagen/pflegegrad',
};

interface PhaseItem {
  /** i18n key under lebenslagen.phasen.{phaseKey}.items.{itemKey} */
  itemKey: string;
  /** Only a Link if a real detail page exists. */
  realKey?: keyof typeof REAL_HREFS;
}
interface PhaseDef {
  key: string;
  icon: LucideIcon;
  tone: IconTone;
  count: number;
  items: PhaseItem[];
}

const PHASEN: PhaseDef[] = [
  {
    key: 'familie',
    icon: Users,
    tone: 'pink',
    count: 12,
    items: [
      { itemKey: 'geburt', realKey: 'geburt' },
      { itemKey: 'kindergeld', realKey: 'kindergeld' },
      { itemKey: 'elterngeld' },
    ],
  },
  {
    key: 'wohnen',
    icon: Home,
    tone: 'brand',
    count: 10,
    items: [
      { itemKey: 'umzug', realKey: 'umzug' },
      { itemKey: 'wohnberechtigung' },
      { itemKey: 'wohngeld', realKey: 'wohngeld' },
    ],
  },
  {
    key: 'arbeit',
    icon: Briefcase,
    tone: 'green',
    count: 14,
    items: [
      { itemKey: 'arbeit_aufnehmen' },
      { itemKey: 'arbeitslos' },
      { itemKey: 'buergergeld' },
    ],
  },
  {
    key: 'migration',
    icon: Globe,
    tone: 'violet',
    count: 9,
    items: [
      { itemKey: 'aufenthalt', realKey: 'aufenthalt' },
      { itemKey: 'einbuergerung' },
      { itemKey: 'visum' },
    ],
  },
  {
    key: 'gesundheit',
    icon: Heart,
    tone: 'pink',
    count: 11,
    items: [
      { itemKey: 'pflege', realKey: 'pflege' },
      { itemKey: 'krankenversicherung' },
      { itemKey: 'vorsorge' },
    ],
  },
];

interface WarumRow {
  key: 'once_only' | 'verstaendlich' | 'schutz';
  icon: LucideIcon;
  tone: IconTone;
}
const WARUM: WarumRow[] = [
  { key: 'once_only', icon: Lock, tone: 'brand' },
  { key: 'verstaendlich', icon: MessageCircle, tone: 'teal' },
  { key: 'schutz', icon: ShieldCheck, tone: 'green' },
];

interface EmpfRow {
  key: 'geburt' | 'umzug' | 'wohngeld';
  icon: LucideIcon;
  tone: IconTone;
  href: string;
}
const EMPFOHLEN: EmpfRow[] = [
  { key: 'geburt', icon: Baby, tone: 'pink', href: '/lebenslagen/geburt' },
  { key: 'umzug', icon: Home, tone: 'brand', href: '/vorgaenge/umzug/start' },
  { key: 'wohngeld', icon: BadgeEuro, tone: 'teal', href: '/lebenslagen/wohngeld' },
];

interface TrustRow {
  key: 'offiziell' | 'barrierefrei' | 'kostenfrei' | 'verfuegbar';
  icon: LucideIcon;
}
const TRUST: TrustRow[] = [
  { key: 'offiziell', icon: BadgeCheck },
  { key: 'barrierefrei', icon: Accessibility },
  { key: 'kostenfrei', icon: Tag },
  { key: 'verfuegbar', icon: Clock },
];

export function LebenslagenView() {
  const t = useTranslations('lebenslagen');

  const [catalog, setCatalog] = React.useState<Record<string, LebenslageCatalogEntry>>({});
  const [loaded, setLoaded] = React.useState(false);
  const [query, setQuery] = React.useState('');
  const [category, setCategory] = React.useState<CategoryId>('alle');

  React.useEffect(() => {
    let cancelled = false;
    void (async () => {
      for (let attempt = 0; attempt < 3 && !cancelled; attempt++) {
        try {
          const entries = await api.getLebenslagen();
          if (cancelled) return;
          const map: Record<string, LebenslageCatalogEntry> = {};
          for (const e of entries) map[e.slug] = e;
          setCatalog(map);
          return;
        } catch {
          await new Promise((r) => setTimeout(r, 200));
        }
      }
    })().finally(() => {
      if (!cancelled) setLoaded(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const localizedBeliebte = React.useMemo(
    () =>
      BELIEBTE.map((b) => ({
        ...b,
        title: t(`beliebte.${b.i18nKey}.title`),
        desc: t(`beliebte.${b.i18nKey}.desc`),
        entry: catalog[b.slug],
      })),
    [t, catalog],
  );

  const filteredBeliebte = React.useMemo(() => {
    const needle = query.trim().toLowerCase();
    return localizedBeliebte.filter((b) => {
      const matchesCategory =
        category === 'alle' || category === 'mehr' || b.category === category;
      const matchesQuery =
        needle.length === 0 ||
        b.title.toLowerCase().includes(needle) ||
        b.desc.toLowerCase().includes(needle);
      return matchesCategory && matchesQuery;
    });
  }, [localizedBeliebte, category, query]);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
  }

  return (
    <div>
      <div className="gt-page-head llh-head">
        <div className="llh-head-text">
          <h1>{t('title')}</h1>
          <p className="llh-subtitle">{t('hub_subtitle')}</p>
        </div>

        <div className="llh-head-search">
          <form className="llh-search" role="search" onSubmit={handleSubmit}>
            <label htmlFor="llh-search-input" className="sr-only">
              {t('search_label')}
            </label>
            <Search className="llh-search-icon" aria-hidden="true" />
            <input
              id="llh-search-input"
              type="search"
              className="llh-search-input"
              placeholder={t('search_placeholder')}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              autoComplete="off"
            />
            <button type="submit" className="llh-search-submit">
              {t('search_submit')}
            </button>
          </form>

          <div className="llh-chips" role="group" aria-label={t('filter_label')}>
            {CHIPS.map((chip) => {
              const active = category === chip.id;
              const Icon = chip.icon;
              const Trailing = chip.trailing;
              return (
                <button
                  key={chip.id}
                  type="button"
                  className={cn('llh-chip', active && 'active')}
                  aria-pressed={active}
                  onClick={() => setCategory(chip.id)}
                >
                  {Icon ? <Icon aria-hidden="true" /> : null}
                  {t(`categories.${chip.id}`)}
                  {Trailing ? <Trailing aria-hidden="true" /> : null}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="llh-layout">
        <div className="llh-main">
          {/* B1 — Beliebte Lebenslagen */}
          <section className="gt-card" aria-labelledby="llh-beliebte-title">
            <div className="gt-card-head">
              <h2 id="llh-beliebte-title" className="gt-card-title">
                {t('beliebte_title')}
              </h2>
              <Link href="/lebenslagen" className="llh-card-link">
                {t('alle_anzeigen')}
                <ArrowRight aria-hidden="true" />
              </Link>
            </div>

            {!loaded ? (
              <div className="llh-beliebte-grid" aria-hidden="true">
                <Skeleton className="h-40 rounded-2xl" />
                <Skeleton className="h-40 rounded-2xl" />
                <Skeleton className="h-40 rounded-2xl" />
                <Skeleton className="h-40 rounded-2xl" />
                <Skeleton className="h-40 rounded-2xl" />
                <Skeleton className="h-40 rounded-2xl" />
              </div>
            ) : filteredBeliebte.length === 0 ? (
              <p className="llh-empty">{t('results_none_category')}</p>
            ) : (
              <ul className="llh-beliebte-grid">
                {filteredBeliebte.map((b) => {
                  const Icon = b.icon;
                  const schritte = b.entry?.schritte ?? 0;
                  const behoerden = b.entry?.behoerden ?? 0;
                  const teilauto =
                    schritte === 0 ||
                    b.entry?.mode === 'antragslos' ||
                    b.entry?.mode === 'hybrid' ||
                    b.entry?.zukunft === true;
                  return (
                    <li key={b.slug} className="llh-beliebte-item">
                      <Link href={b.href} className="llh-beliebte-card">
                        <span className={cn('icon-circle lg', b.tone)}>
                          <Icon aria-hidden="true" />
                        </span>
                        <span className="llh-beliebte-cardtitle">{b.title}</span>
                        <span className="llh-beliebte-carddesc">{b.desc}</span>
                        <span className="llh-beliebte-meta">
                          {schritte > 0 ? (
                            <span className="llh-meta-item">
                              <Check aria-hidden="true" />
                              {t('meta_schritte', { count: schritte })}
                            </span>
                          ) : null}
                          {behoerden > 0 ? (
                            <span className="llh-meta-item">
                              <Landmark aria-hidden="true" />
                              {t('meta_behoerden', { count: behoerden })}
                            </span>
                          ) : null}
                          {teilauto ? (
                            <span className="badge green llh-meta-auto">
                              <Sparkles aria-hidden="true" />
                              {t('teilautomatisch')}
                            </span>
                          ) : null}
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          {/* B2 — Nach Lebensphase (informational directory) */}
          <section className="gt-card" aria-labelledby="llh-phasen-title">
            <div className="gt-card-head">
              <h2 id="llh-phasen-title" className="gt-card-title">
                {t('nach_lebensphase_title')}
              </h2>
            </div>
            <div className="llh-phasen">
              {PHASEN.map((phase) => {
                const Icon = phase.icon;
                return (
                  <div key={phase.key} className="llh-phase">
                    <span className={cn('icon-circle lg', phase.tone)}>
                      <Icon aria-hidden="true" />
                    </span>
                    <h3 className="llh-phase-title">{t(`phasen.${phase.key}.title`)}</h3>
                    <ul className="llh-phase-list">
                      {phase.items.map((item) => {
                        const label = t(`phasen.${phase.key}.items.${item.itemKey}`);
                        const href = item.realKey ? REAL_HREFS[item.realKey] : null;
                        return (
                          <li key={item.itemKey} className="llh-phase-item">
                            <Check aria-hidden="true" />
                            {href ? (
                              <Link href={href} className="llh-phase-itemlink">
                                {label}
                              </Link>
                            ) : (
                              <span>{label}</span>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                    <Link href="/lebenslagen" className="llh-card-link llh-phase-foot">
                      {t('alle_phase', { count: phase.count })}
                      <ArrowRight aria-hidden="true" />
                    </Link>
                  </div>
                );
              })}
            </div>
            <div className="llh-phasen-foot">
              <Link href="/lebenslagen" className="btn btn-secondary">
                {t('alle_lebenslagen_anzeigen')}
                <ArrowRight aria-hidden="true" />
              </Link>
            </div>
          </section>
        </div>

        {/* Right rail */}
        <aside className="lk-rail" aria-label={t('warum_title')}>
          {/* R1 — Warum das hilfreich ist */}
          <section className="gt-card" aria-labelledby="llh-warum-title">
            <h2 id="llh-warum-title" className="gt-card-title llh-rail-title">
              {t('warum_title')}
            </h2>
            <ul className="llh-warum-list">
              {WARUM.map((row) => {
                const Icon = row.icon;
                return (
                  <li key={row.key} className="llh-warum-row">
                    <span className={cn('icon-circle', row.tone)}>
                      <Icon aria-hidden="true" />
                    </span>
                    <span className="llh-warum-body">
                      <span className="llh-warum-rowtitle">{t(`warum.${row.key}.title`)}</span>
                      <span className="llh-warum-rowdesc">{t(`warum.${row.key}.desc`)}</span>
                    </span>
                  </li>
                );
              })}
            </ul>
            <Link href="/datenschutz" className="btn btn-secondary llh-rail-cta">
              <ShieldCheck aria-hidden="true" />
              {t('warum.link')}
            </Link>
          </section>

          {/* R2 — Empfohlen für Sie */}
          <section className="gt-card" aria-labelledby="llh-empf-title">
            <div className="gt-card-head">
              <h2 id="llh-empf-title" className="gt-card-title llh-rail-title">
                {t('empfohlen_title')}
              </h2>
              <Link href="/datenschutz" className="llh-empf-edit">
                <Pencil aria-hidden="true" />
                {t('empfohlen.bearbeiten')}
              </Link>
            </div>
            <ul className="llh-empf-list">
              {EMPFOHLEN.map((row) => {
                const Icon = row.icon;
                return (
                  <li key={row.key}>
                    <Link href={row.href} className="llh-empf-row">
                      <span className={cn('icon-circle', row.tone)}>
                        <Icon aria-hidden="true" />
                      </span>
                      <span className="llh-empf-body">
                        <span className="llh-empf-rowtitle">{t(`empfohlen.${row.key}.title`)}</span>
                        <span className="llh-empf-rowdesc">{t(`empfohlen.${row.key}.desc`)}</span>
                      </span>
                      <ChevronRight className="llh-empf-arrow" aria-hidden="true" />
                    </Link>
                  </li>
                );
              })}
            </ul>
            <Link href="/lebenslagen" className="llh-card-link llh-empf-foot">
              {t('empfohlen.alle')}
              <ArrowRight aria-hidden="true" />
            </Link>
          </section>
        </aside>
      </div>

      {/* C — Trust bar */}
      <div className="llh-trust" role="list" aria-label={t('trust.label')}>
        {TRUST.map((row) => {
          const Icon = row.icon;
          return (
            <div key={row.key} className="llh-trust-item" role="listitem">
              <Icon className="llh-trust-icon" aria-hidden="true" />
              <span className="llh-trust-body">
                <span className="llh-trust-title">{t(`trust.${row.key}.title`)}</span>
                <span className="llh-trust-sub">{t(`trust.${row.key}.sub`)}</span>
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
