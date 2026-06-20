import { LeistungDetailView } from '@/components/lebenslagen/LeistungDetailView';

export const dynamic = 'force-dynamic';

/**
 * Server-Shell. Das Mock-Backend lebt in localStorage (kein Server-Zugriff) —
 * die Server-Komponente reicht nur den `slug` an den Client-View weiter, der
 * `api.getLebenslageConfig(slug)` lädt und bei `null` `notFound()` auslöst.
 */
export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <LeistungDetailView slug={slug} />;
}
