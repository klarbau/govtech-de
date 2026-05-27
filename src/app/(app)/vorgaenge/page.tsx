import { VorgaengeView } from '@/components/vorgaenge/VorgaengeView';

export const dynamic = 'force-dynamic';

/**
 * Vorgänge-Übersicht. Das Mock-Backend lebt im `localStorage`; die Daten
 * werden client-seitig nach Hydration geladen (`VorgaengeView` triggert auf
 * Mount `getVorgaenge()` + `getBehoerden()`).
 */
export default function VorgaengePage() {
  return <VorgaengeView />;
}
