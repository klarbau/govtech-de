import { getTranslations } from 'next-intl/server';
import { Construction } from 'lucide-react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface PlaceholderSectionProps {
  navKey: 'dashboard' | 'posteingang' | 'stammdaten' | 'vorgaenge' | 'dokumente' | 'termine' | 'steuer' | 'familie' | 'assistent' | 'datenschutz';
}

export async function PlaceholderSection({ navKey }: PlaceholderSectionProps) {
  const t = await getTranslations();
  const sectionTitle = t(`nav.${navKey}`);

  return (
    <section
      aria-labelledby="placeholder-title"
      className="flex flex-col gap-4"
    >
      <h1
        id="placeholder-title"
        className="text-2xl font-semibold tracking-tight"
      >
        {sectionTitle}
      </h1>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Construction className="size-4 text-muted-foreground" aria-hidden="true" />
            {t('placeholder.wip')}
          </CardTitle>
          <CardDescription>{t('placeholder.wip_helper')}</CardDescription>
        </CardHeader>
        <CardContent />
      </Card>
    </section>
  );
}
