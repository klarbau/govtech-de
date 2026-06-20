'use client';

import * as React from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import {
  ArrowRight,
  BadgeEuro,
  Baby,
  Briefcase,
  ChevronDown,
  GraduationCap,
  Heart,
  Home,
  Lock,
  Plane,
  Search,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Users,
  Wallet,
  type LucideIcon,
} from 'lucide-react';

import { cn } from '@/lib/utils';

type CategoryId =
  | 'alle'
  | 'familie'
  | 'wohnen'
  | 'arbeit'
  | 'migration'
  | 'steuern'
  | 'mehr';

type Frequency = 'very_often' | 'often';

interface ServiceEntry {
  id: string;
  href: string;
  icon: LucideIcon;
  iconTone: 'brand' | 'green' | 'amber' | 'violet' | 'teal' | 'pink';
  category: Exclude<CategoryId, 'alle'>;
  frequency: Frequency;
}

interface PopularEntry {
  id: string;
  href: string;
  icon: LucideIcon;
  relevance: 'very' | 'normal';
}

const SERVICES: ServiceEntry[] = [
  {
    id: 'umzug',
    href: '/vorgaenge/umzug/run',
    icon: Home,
    iconTone: 'brand',
    category: 'wohnen',
    frequency: 'very_often',
  },
  {
    id: 'geburt',
    href: '/vorgaenge',
    icon: Baby,
    iconTone: 'pink',
    category: 'familie',
    frequency: 'often',
  },
  {
    id: 'aufenthalt',
    href: '/vorgaenge',
    icon: Plane,
    iconTone: 'teal',
    category: 'migration',
    frequency: 'often',
  },
  {
    id: 'kindergeld',
    href: '/vorgaenge',
    icon: Users,
    iconTone: 'violet',
    category: 'familie',
    frequency: 'very_often',
  },
  {
    id: 'steuer',
    href: '/steuer',
    icon: BadgeEuro,
    iconTone: 'green',
    category: 'steuern',
    frequency: 'very_often',
  },
  {
    id: 'reisepass',
    href: '/vorgaenge',
    icon: Wallet,
    iconTone: 'brand',
    category: 'migration',
    frequency: 'often',
  },
  {
    id: 'bafoeg',
    href: '/vorgaenge',
    icon: GraduationCap,
    iconTone: 'amber',
    category: 'arbeit',
    frequency: 'often',
  },
  {
    id: 'pflege',
    href: '/dashboard',
    icon: Heart,
    iconTone: 'pink',
    category: 'familie',
    frequency: 'often',
  },
  {
    id: 'wohngeld',
    href: '/vorgaenge',
    icon: Briefcase,
    iconTone: 'teal',
    category: 'wohnen',
    frequency: 'often',
  },
];

const CATEGORY_ORDER: CategoryId[] = [
  'alle',
  'familie',
  'wohnen',
  'arbeit',
  'migration',
  'steuern',
  'mehr',
];

const POPULAR: PopularEntry[] = [
  { id: 'kindergeld', href: '/vorgaenge', icon: Users, relevance: 'very' },
  { id: 'umzug', href: '/vorgaenge/umzug/run', icon: Home, relevance: 'very' },
  { id: 'wohngeld', href: '/vorgaenge', icon: Home, relevance: 'normal' },
  { id: 'steuer', href: '/steuer', icon: BadgeEuro, relevance: 'normal' },
];

const INITIAL_VISIBLE = 9;

/** Catalog-wide count shown in the result bar when no filter/search is active —
 *  the mockup reads "128 Leistungen gefunden" (the full OZG catalogue), while the
 *  9 demo cards are the curated slice. Live filtered count is used once the user
 *  narrows by category or query. */
const TOTAL_CATALOG = 128;

type SortMode = 'relevance' | 'popular' | 'name';

export function LebenslagenView() {
  const t = useTranslations('lebenslagen');

  const [query, setQuery] = React.useState('');
  const [category, setCategory] = React.useState<CategoryId>('alle');
  const [sort, setSort] = React.useState<SortMode>('relevance');
  const [showAll, setShowAll] = React.useState(false);

  const localizedServices = React.useMemo(
    () =>
      SERVICES.map((service) => ({
        ...service,
        title: t(`services.${service.id}.title`),
        description: t(`services.${service.id}.description`),
      })),
    [t],
  );

  const filtered = React.useMemo(() => {
    const needle = query.trim().toLowerCase();
    const matchesCategory = (service: (typeof localizedServices)[number]) =>
      category === 'alle' ||
      category === 'mehr' ||
      service.category === category;
    const matchesQuery = (service: (typeof localizedServices)[number]) =>
      needle.length === 0 ||
      service.title.toLowerCase().includes(needle) ||
      service.description.toLowerCase().includes(needle);

    const result = localizedServices.filter(
      (service) => matchesCategory(service) && matchesQuery(service),
    );

    if (sort === 'name') {
      return [...result].sort((a, b) =>
        a.title.localeCompare(b.title, 'de'),
      );
    }
    if (sort === 'popular') {
      const weight: Record<Frequency, number> = { very_often: 0, often: 1 };
      return [...result].sort(
        (a, b) => weight[a.frequency] - weight[b.frequency],
      );
    }
    return result;
  }, [localizedServices, category, query, sort]);

  const visible = showAll ? filtered : filtered.slice(0, INITIAL_VISIBLE);
  const hasMore = filtered.length > visible.length;

  // Headline count: the full catalogue size when unfiltered, the live match
  // count once the user narrows by theme or search.
  const isUnfiltered = category === 'alle' && query.trim().length === 0;
  const displayCount = isUnfiltered ? TOTAL_CATALOG : filtered.length;

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setShowAll(false);
  }

  return (
    <>
      <div className="gt-page-head lk-head">
        <h1>
          {t('title')}
          <span className="lk-subline">{t('subtitle')}</span>
        </h1>
        <p className="lk-intro">{t('intro')}</p>
      </div>

      <form className="lk-search" role="search" onSubmit={handleSubmit}>
        <label htmlFor="lk-search-input" className="sr-only">
          {t('search_label')}
        </label>
        <Search className="lk-search-icon" aria-hidden="true" />
        <input
          id="lk-search-input"
          type="search"
          className="lk-search-input"
          placeholder={t('search_placeholder')}
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setShowAll(false);
          }}
          autoComplete="off"
        />
        <button
          type="submit"
          className="lk-search-submit"
          aria-label={t('search_submit')}
        >
          <ArrowRight aria-hidden="true" />
        </button>
      </form>

      <div className="lk-layout">
        <div className="lk-main">
          <div
            className="lk-chips"
            role="group"
            aria-label={t('filter_label')}
          >
            {CATEGORY_ORDER.map((cat) => {
              const active = category === cat;
              return (
                <button
                  key={cat}
                  type="button"
                  className={cn('lk-chip', active && 'active')}
                  aria-pressed={active}
                  onClick={() => {
                    setCategory(cat);
                    setShowAll(false);
                  }}
                >
                  {t(`categories.${cat}`)}
                  {cat === 'mehr' ? (
                    <ChevronDown aria-hidden="true" />
                  ) : null}
                </button>
              );
            })}
          </div>

          <div className="lk-resultbar">
            <p className="lk-count" aria-live="polite">
              {t('results_count', { count: displayCount })}
            </p>
            <label className="lk-sort">
              <span className="lk-sort-label">{t('sort_label')}</span>
              <span className="lk-sort-select">
                <select
                  className="lk-sort-field"
                  value={sort}
                  aria-label={t('sort_aria')}
                  onChange={(event) =>
                    setSort(event.target.value as SortMode)
                  }
                >
                  <option value="relevance">{t('sort.relevance')}</option>
                  <option value="popular">{t('sort.popular')}</option>
                  <option value="name">{t('sort.name')}</option>
                </select>
                <ChevronDown aria-hidden="true" />
              </span>
            </label>
          </div>

          {visible.length === 0 ? (
            <p className="lk-empty">{t('results_none')}</p>
          ) : (
            <ul className="lk-grid">
              {visible.map((service) => {
                const Icon = service.icon;
                return (
                  <li key={service.id} className="lk-card-item">
                    <Link href={service.href} className="lk-card">
                      <span className="lk-card-top">
                        <span
                          className={cn('icon-circle lg', service.iconTone)}
                        >
                          <Icon aria-hidden="true" />
                        </span>
                        <span
                          className={cn(
                            'badge',
                            service.frequency === 'very_often'
                              ? 'green'
                              : 'brand',
                          )}
                        >
                          <TrendingUp aria-hidden="true" />
                          {t(`frequency.${service.frequency}`)}
                        </span>
                      </span>
                      <span className="lk-card-title">{service.title}</span>
                      <span className="lk-card-desc">
                        {service.description}
                      </span>
                      <span className="lk-card-foot" aria-hidden="true">
                        <ArrowRight />
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}

          {hasMore ? (
            <div className="lk-more">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setShowAll(true)}
              >
                {t('show_more')}
                <ChevronDown aria-hidden="true" />
              </button>
            </div>
          ) : null}
        </div>

        <aside className="lk-rail" aria-label={t('rail_popular_title')}>
          <section className="gt-card lk-rail-card">
            <div className="lk-rail-head">
              <span className="icon-circle">
                <Sparkles aria-hidden="true" />
              </span>
              <div>
                <h2 className="lk-rail-title">{t('rail_popular_title')}</h2>
                <p className="lk-rail-sub">{t('rail_popular_sub')}</p>
              </div>
            </div>
            <ul className="lk-popular">
              {POPULAR.map((entry) => {
                const Icon = entry.icon;
                return (
                  <li key={entry.id}>
                    <Link href={entry.href} className="lk-popular-row">
                      <span className="icon-circle">
                        <Icon aria-hidden="true" />
                      </span>
                      <span className="lk-popular-body">
                        <span className="lk-popular-title">
                          {t(`services.${entry.id}.title`)}
                        </span>
                        <span className="lk-popular-desc">
                          {t(`rail_items.${entry.id}`)}
                        </span>
                        <span
                          className={cn(
                            'badge',
                            entry.relevance === 'very' ? 'green' : 'amber',
                          )}
                        >
                          {t(`relevance.${entry.relevance}`)}
                        </span>
                      </span>
                      <ArrowRight
                        className="lk-popular-arrow"
                        aria-hidden="true"
                      />
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>

          <section className="gt-card lk-secure">
            <span className="icon-circle green">
              <Lock aria-hidden="true" />
            </span>
            <h2 className="lk-secure-title">{t('rail_secure_title')}</h2>
            <p className="lk-secure-body">{t('rail_secure_body')}</p>
            <Link href="/datenschutz" className="btn btn-secondary lk-secure-link">
              <ShieldCheck aria-hidden="true" />
              {t('rail_secure_link')}
            </Link>
          </section>
        </aside>
      </div>

      <p className="lk-trust">
        <ShieldCheck aria-hidden="true" />
        {t('trust_title')}
      </p>
    </>
  );
}
