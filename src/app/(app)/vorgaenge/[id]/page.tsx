import { LiquidGlassScreen } from '@/components/layout/LiquidGlassScreen';
import { VorgangDetailLoader } from '@/components/vorgaenge/VorgangDetailLoader';

export const dynamic = 'force-dynamic';

/**
 * Client-only-Loader (Mock-Backend lebt in localStorage; Server hat keinen
 * Zugriff). Server-Komponente reicht nur die `id` in den Loader.
 *
 * `LiquidGlassScreen` markiert die Route (`data-lg-screen='vorgaenge'`) für die
 * Vorgänge-Glasflächen (vorgaenge-liquid-glass.css).
 */
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <>
      <LiquidGlassScreen name="vorgaenge" />
      <VorgangDetailLoader id={id} />
    </>
  );
}
