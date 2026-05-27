import { DatenschutzView } from '@/components/datenschutz/DatenschutzView';

export const dynamic = 'force-dynamic';

/**
 * Datenschutz-Cockpit (Spec: docs/specs/redesign-datenschutz.md).
 * Die Einwilligungs-Toggles sind funktional + persistiert; das Mock-Backend
 * lebt im `localStorage`, daher lädt `DatenschutzView` auf Mount via `api.*`.
 */
export default function DatenschutzPage() {
  return <DatenschutzView nowIso={new Date().toISOString()} />;
}
