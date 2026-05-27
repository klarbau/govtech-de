import { TermineView } from '@/components/termine/TermineView';

export const dynamic = 'force-dynamic';

/**
 * Termine — Behördentermine, Erinnerungen & Buchungen. Das Mock-Backend lebt
 * im `localStorage`; `TermineView` lädt auf Mount via `api`. Die Page reicht
 * nur einen SSR-stabilen Demo-`nowIso` durch.
 */
export default function TerminePage() {
  return <TermineView nowIso={new Date().toISOString()} />;
}
