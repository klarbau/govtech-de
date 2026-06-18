import { getTranslations } from 'next-intl/server';

import { DatenschutzView } from '@/components/datenschutz/DatenschutzView';
import { Breadcrumb } from '@/components/shared/Breadcrumb';

export const dynamic = 'force-dynamic';

/**
 * Datenschutz & Einwilligungen (Spec: docs/specs/brandbook-redesign.md §5.5,
 * mockup #2). Die Einwilligungs-Toggles sind funktional + persistiert; das
 * Mock-Backend lebt im `localStorage`, daher lädt `DatenschutzView` auf Mount
 * via `api.*`.
 */
export default async function DatenschutzPage() {
  const tShell = await getTranslations('shell.breadcrumb');
  const t = await getTranslations('datenschutz');

  return (
    <>
      <Breadcrumb
        items={[
          { label: tShell('home'), href: '/dashboard' },
          { label: t('page.title') },
        ]}
      />
      <DatenschutzView nowIso={new Date().toISOString()} />
    </>
  );
}
