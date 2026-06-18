import { getTranslations } from 'next-intl/server';

import { LebenslagenView } from '@/components/lebenslagen/LebenslagenView';
import { Breadcrumb } from '@/components/shared/Breadcrumb';

export const dynamic = 'force-dynamic';

/**
 * Leistungskatalog / Lebenslagen (Spec: docs/specs/brandbook-redesign.md §5.6).
 * Eine statische Katalog-Oberfläche — kein Mock-Backend nötig. Die Suche,
 * Themenfilter und Sortierung filtern die in-file Leistungsliste clientseitig.
 */
export default async function LebenslagenPage() {
  const tShell = await getTranslations('shell.breadcrumb');
  const tNav = await getTranslations('topnav');
  const t = await getTranslations('lebenslagen');

  return (
    <>
      <Breadcrumb
        items={[
          { label: tShell('home'), href: '/dashboard' },
          { label: tNav('lebenslagen'), href: '/lebenslagen' },
          { label: t('breadcrumb_catalog') },
        ]}
      />
      <LebenslagenView />
    </>
  );
}
