import { DashboardView } from '@/components/dashboard/DashboardView';

export const dynamic = 'force-dynamic';

/**
 * Dashboard-Page (Spec: docs/specs/redesign-dashboard.md § 4.1).
 *
 * RSC-Wrapper, der die interaktive `<DashboardView>` mountet. Die Daten
 * werden client-seitig über `api.getDashboard()` geladen, weil das
 * Mock-Backend in `localStorage` lebt (siehe docs/architecture.md). Der
 * einzige `<h1>` der Seite kommt aus dem `PageHeader` innerhalb der View.
 */
export default function DashboardPage() {
  return <DashboardView nowIso={new Date().toISOString()} />;
}
