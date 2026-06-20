import { LebenslageCascade } from '@/components/lebenslagen/LebenslageCascade';

export const dynamic = 'force-dynamic';

/**
 * Server-Shell für die Submission-Kaskade. Reicht nur den `slug`; der Client-View
 * lädt (oder startet bei antragslos) den Vorgang gegen das localStorage-Mock-
 * Backend und abonniert den `autopilot_step`-Tick-Stream.
 */
export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <LebenslageCascade slug={slug} />;
}
