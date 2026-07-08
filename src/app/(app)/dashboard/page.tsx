import { DashboardView } from '@/components/dashboard/DashboardView';
import { LiquidGlassScreen } from '@/components/layout/LiquidGlassScreen';

export const dynamic = 'force-dynamic';

export default function DashboardPage() {
  return (
    <>
      <LiquidGlassScreen name="dashboard" />
      <DashboardView nowIso={new Date().toISOString()} />
    </>
  );
}
