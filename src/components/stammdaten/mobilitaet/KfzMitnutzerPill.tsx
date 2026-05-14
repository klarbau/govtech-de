import { useTranslations } from 'next-intl';
import { Users } from 'lucide-react';

import { wrapNormZitate } from '@/components/posteingang/wrapNormZitate';
import { cn } from '@/lib/utils';

interface KfzMitnutzerPillProps {
  vorname: string;
  nachname: string;
  className?: string;
}

/**
 * `<KfzMitnutzerPill>` (Spec § 4.1 / VL-12 / HL-MOB-12).
 *
 * Innerhalb einer Halter-Card: Pill für Mitnutzer:innen, die rechtlich kein
 * Halter sind. § 15 FZV-Mitteilungspflicht trifft nur den Halter.
 *
 * Pattern: Familie Schmidt → Markus = Halter, Lena = Mitnutzerin (eine
 * Pill in Markus' Halter-Card).
 *
 * a11y: `<span role="note">` mit aria-label; tooltip via native `title`
 * für sehende Nutzer:innen; volle Erläuterung sichtbar als kleiner Footer-
 * Text unterhalb der Pill (kein Tooltip-Only — Spec § 7.6 Tooltip-Text ist
 * dauerhaft sichtbar).
 */
export function KfzMitnutzerPill({
  vorname,
  nachname,
  className,
}: KfzMitnutzerPillProps) {
  const t = useTranslations('stammdaten.mobilitaet.halter');

  return (
    <div
      className={cn(
        'flex flex-col gap-1 rounded-md border border-dashed border-border bg-muted/40 p-2',
        className,
      )}
      data-testid={`mitnutzer-pill-${vorname.toLowerCase()}-${nachname.toLowerCase()}`}
    >
      <span
        role="note"
        aria-label={t('mitnutzer_pill_aria_label', { vorname, nachname })}
        className="inline-flex items-center gap-1.5 text-xs font-medium text-foreground"
      >
        <Users className="size-3" aria-hidden="true" />
        {t('mitnutzer_pill', { vorname, nachname })}
      </span>
      <p className="text-[11px] leading-relaxed text-muted-foreground">
        {wrapNormZitate(t('mitnutzer_pill_tooltip'))}
      </p>
    </div>
  );
}
