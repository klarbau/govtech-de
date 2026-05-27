import { useTranslations } from 'next-intl';

/**
 * Lade-Skelett für `/dashboard` (Stat-Karte + Liste + Kachel-Grid). Die
 * Puls-Animation wird per `motion-reduce:animate-none` und der globalen
 * `prefers-reduced-motion`-Regel deaktiviert. Es ist ein RSC (kein State).
 */
function Block({ className }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-lg bg-surface-muted motion-reduce:animate-none ${className ?? ''}`}
    />
  );
}

export function DashboardSkeleton() {
  const t = useTranslations('dashboard');
  return (
    <div
      className="flex flex-col gap-6"
      role="status"
      aria-busy="true"
      aria-label={t('loading')}
    >
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Block className="h-32" />
        <Block className="h-32" />
      </div>
      <Block className="h-64" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Block className="h-32" />
        <Block className="h-32" />
        <Block className="h-32" />
        <Block className="h-32" />
        <Block className="h-32" />
        <Block className="h-32" />
      </div>
    </div>
  );
}
