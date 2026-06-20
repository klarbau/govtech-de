import { AntragForm } from '@/components/lebenslagen/AntragForm';

export const dynamic = 'force-dynamic';

/**
 * Server-Shell für das vorausgefüllte Antrags-Formular. Reicht nur den `slug`
 * an den Client-View; Once-Only-Prefill + Konfig laufen client-seitig gegen das
 * localStorage-Mock-Backend.
 */
export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <AntragForm slug={slug} />;
}
