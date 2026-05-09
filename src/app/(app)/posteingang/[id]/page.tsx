import { LetterDetailLoader } from '@/components/posteingang/LetterDetailLoader';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ id: string }>;
}

/**
 * Client-only-Loader (Mock-Backend lebt in localStorage; Server hat keinen
 * Zugriff). Server-Komponente reicht nur die `id` in den Loader.
 */
export default async function LetterDetailPage({ params }: PageProps) {
  const { id } = await params;
  return <LetterDetailLoader id={id} />;
}
