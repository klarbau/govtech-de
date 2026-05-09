import Link from 'next/link';
import { getTranslations } from 'next-intl/server';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default async function VorgaengePage() {
  const t = await getTranslations('nav');
  const tStart = await getTranslations('umzug.start');

  return (
    <section aria-labelledby="vorgaenge-title" className="flex flex-col gap-4">
      <h1 id="vorgaenge-title" className="text-2xl font-semibold tracking-tight">
        {t('vorgaenge')}
      </h1>
      <ul className="grid gap-3 sm:grid-cols-2">
        <li>
          <Link
            href="/vorgaenge/umzug/start"
            className="block rounded-xl outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <Card className="transition-shadow hover:shadow-md">
              <CardHeader>
                <CardTitle>{tStart('title')}</CardTitle>
                <CardDescription>{tStart('subtitle')}</CardDescription>
              </CardHeader>
              <CardContent />
            </Card>
          </Link>
        </li>
      </ul>
    </section>
  );
}
