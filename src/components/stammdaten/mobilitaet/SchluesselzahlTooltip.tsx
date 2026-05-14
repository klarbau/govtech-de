import { useTranslations } from 'next-intl';

import { cn } from '@/lib/utils';

interface SchluesselzahlTooltipProps {
  /**
   * Schlüsselzahl-Code (Anlage 9 FeV), z. B. `95`, `79.06`.
   * V1.3 demo-Set: `95`, `70`, `78`, `79`, `79.06`, `96` (Spec § 7.3).
   * Unbekannte Codes rendern den Code-Text ohne Tooltip-Aussage.
   */
  code: string;
  className?: string;
}

/**
 * `<SchluesselzahlTooltip>` (Spec § 4.1 / § 7.3).
 *
 * Inline-Pill mit der Schlüsselzahl plus nativem `title`-Tooltip (Anlage 9 FeV
 * Erläuterung). Server-renderbar (kein Client-State; nativer Tooltip ist
 * Screenreader-zugänglich via `aria-label`).
 *
 * V1.3 deckt die 6 Demo-Codes ab; vollständige ~150-Code-Map als V1.3.1-Followup
 * (Spec § 15.2).
 */
export function SchluesselzahlTooltip({
  code,
  className,
}: SchluesselzahlTooltipProps) {
  const t = useTranslations('stammdaten.mobilitaet.fe.schluesselzahl');

  // i18n-key-Kollision: `79.06` enthält Punkt, der in i18n-Pfaden Trennzeichen
  // ist. Wir mappen auf `79_06` als Key-Form.
  const keyName = code.replace('.', '_');

  let label: string;
  try {
    label = t(keyName);
  } catch {
    label = code;
  }

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md bg-muted px-2 py-0.5 font-mono text-[11px] font-medium text-foreground',
        'ring-1 ring-border',
        className,
      )}
      title={label}
      aria-label={label}
      data-testid={`schluesselzahl-${keyName}`}
    >
      {code}
    </span>
  );
}
