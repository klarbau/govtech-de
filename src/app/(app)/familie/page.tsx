import { FamilieView } from '@/components/familie/FamilieView';
import { LiquidGlassScreen } from '@/components/layout/LiquidGlassScreen';

export const dynamic = 'force-dynamic';

/**
 * Familie — „Mein Haushalt" (Spec: docs/specs/redesign-familie.md).
 * Lese-/Wegweiser-Sicht über die bestehende Persona. Das Mock-Backend lebt im
 * `localStorage` und wird erst nach Hydration befüllt; `FamilieView` lädt auf
 * Mount via `api.getFamilie()`.
 *
 * `LiquidGlassScreen` markiert die Route (`data-lg-screen='familie'`), damit die
 * Familie-spezifischen Glasflächen (familie-liquid-glass.css) nur hier greifen —
 * die Live-View nutzt generische Klassennamen (.person, .item, .rail), die mit
 * anderen Routen geteilt sind.
 */
export default function FamiliePage() {
  return (
    <>
      <LiquidGlassScreen name="familie" />
      <FamilieView />
    </>
  );
}
