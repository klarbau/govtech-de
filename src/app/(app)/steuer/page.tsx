import { LiquidGlassScreen } from '@/components/layout/LiquidGlassScreen';
import { SteuerView } from '@/components/steuer/SteuerView';

export const dynamic = 'force-dynamic';

/**
 * Steuer — vorausgefüllte Steuererklärung (Spec: docs/specs/redesign-steuer.md).
 * Das Mock-Backend lebt im `localStorage` und wird erst nach Hydration
 * befüllt — die Page liefert nur `nowIso` für deterministische Frist-Anzeige;
 * `SteuerView` lädt auf Mount via `api.getSteuerUebersicht()`.
 *
 * `LiquidGlassScreen` markiert die Route (`data-lg-screen='steuer'`), damit die
 * Steuer-spezifischen Glasflächen (steuer-liquid-glass.css) nur hier greifen —
 * `.nachweise` ist mit der Live-/familie-View geteilt.
 */
export default function SteuerPage() {
  return (
    <>
      <LiquidGlassScreen name="steuer" />
      <SteuerView nowIso={new Date().toISOString()} steuerjahr={2024} />
    </>
  );
}
