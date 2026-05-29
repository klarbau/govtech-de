import { StammdatenView } from '@/components/stammdaten/StammdatenView';

export const dynamic = 'force-dynamic';

export default function StammdatenPage() {
  return <StammdatenView nowIso={new Date().toISOString()} />;
}
