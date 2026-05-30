import { VorgangDetailLoader } from '@/components/vorgaenge/VorgangDetailLoader';

export const dynamic = 'force-dynamic';

/**
 * Client-only-Loader (Mock-Backend lebt in localStorage; Server hat keinen
 * Zugriff). Server-Komponente reicht nur die `id` in den Loader.
 */
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <VorgangDetailLoader id={id} />;
}
