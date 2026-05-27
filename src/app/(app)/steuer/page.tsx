import { SteuerView } from '@/components/steuer/SteuerView';

export const dynamic = 'force-dynamic';

/**
 * Steuer — vorausgefüllte Steuererklärung (Spec: docs/specs/redesign-steuer.md).
 * Das Mock-Backend lebt im `localStorage` und wird erst nach Hydration
 * befüllt — die Page liefert nur `nowIso` für deterministische Frist-Anzeige;
 * `SteuerView` lädt auf Mount via `api.getSteuerUebersicht()`.
 */
export default function SteuerPage() {
  return <SteuerView nowIso={new Date().toISOString()} steuerjahr={2024} />;
}
