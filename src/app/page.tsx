import Link from 'next/link';
import { getTranslations } from 'next-intl/server';

import { LanguageSwitcher } from '@/components/layout/LanguageSwitcher';
import { ThemeToggle } from '@/components/layout/ThemeToggle';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default async function HomePage() {
  const t = await getTranslations('landing');

  const personas: { key: 'persona_anna' | 'persona_schmidt' | 'persona_mehmet'; href: string }[] = [
    { key: 'persona_anna', href: '/dashboard?persona=anna' },
    { key: 'persona_schmidt', href: '/dashboard?persona=schmidt' },
    { key: 'persona_mehmet', href: '/dashboard?persona=mehmet' },
  ];

  return (
    <main className="min-h-screen bg-background">
      <header className="flex items-center justify-end gap-2 px-6 pt-6">
        <LanguageSwitcher />
        <ThemeToggle />
      </header>
      <section className="mx-auto flex max-w-3xl flex-col gap-8 px-6 py-16">
        <div className="flex flex-col gap-3">
          <p className="text-sm font-medium text-muted-foreground">
            {t('eyebrow')}
          </p>
          <h1 className="text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
            {t('title')}
          </h1>
          <p className="text-lg leading-relaxed text-muted-foreground">
            {t('subtitle')}
          </p>
        </div>

        <section aria-labelledby="personas-title" className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <h2
              id="personas-title"
              className="text-lg font-medium text-foreground"
            >
              {t('personas_title')}
            </h2>
            <p className="text-sm text-muted-foreground">
              {t('personas_helper')}
            </p>
          </div>
          <ul className="grid gap-3">
            {personas.map((p) => (
              <li key={p.key}>
                <Link
                  href={p.href}
                  className="block rounded-xl outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  <Card className="transition-shadow hover:shadow-md">
                    <CardHeader>
                      <CardTitle>{t(p.key)}</CardTitle>
                      <CardDescription>{t('cta_continue')}</CardDescription>
                    </CardHeader>
                    <CardContent />
                  </Card>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </section>
    </main>
  );
}
