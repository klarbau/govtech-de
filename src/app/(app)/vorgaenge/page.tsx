import { LiquidGlassScreen } from '@/components/layout/LiquidGlassScreen';
import { VorgaengeView } from '@/components/vorgaenge/VorgaengeView';

export const dynamic = 'force-dynamic';

/**
 * Vorgänge-Übersicht. Das Mock-Backend lebt im `localStorage`; die Daten
 * werden client-seitig nach Hydration geladen (`VorgaengeView` triggert auf
 * Mount `getVorgaenge()` + `getBehoerden()`).
 *
 * `LiquidGlassScreen` markiert die Route (`data-lg-screen='vorgaenge'`), damit
 * die Vorgänge-spezifischen Glasflächen (vorgaenge-liquid-glass.css) nur hier
 * greifen — mehrere Klassennamen (stat-tile, rail-card) sind mit anderen Routen
 * geteilt.
 */
export default function VorgaengePage() {
  return (
    <>
      <LiquidGlassScreen name="vorgaenge" />
      <VorgaengeView />
    </>
  );
}
