import { FamilieView } from '@/components/familie/FamilieView';

export const dynamic = 'force-dynamic';

/**
 * Familie — „Mein Haushalt" (Spec: docs/specs/redesign-familie.md).
 * Lese-/Wegweiser-Sicht über die bestehende Persona. Das Mock-Backend lebt im
 * `localStorage` und wird erst nach Hydration befüllt; `FamilieView` lädt auf
 * Mount via `api.getFamilie()`.
 */
export default function FamiliePage() {
  return <FamilieView />;
}
