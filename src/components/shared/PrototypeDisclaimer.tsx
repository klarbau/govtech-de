'use client';

import { useTranslations } from 'next-intl';
import { Info } from 'lucide-react';

interface PrototypeDisclaimerProps {
  defaultOpen?: boolean;
  /**
   * Vollständiger i18n-Schlüssel der Body-Nachricht (inkl. Namespace).
   * Default: `common.disclaimer.prototype` (Bestandsverhalten).
   */
  messageKey?: string;
  /**
   * Vollständiger i18n-Schlüssel des Titels (sichtbar im
   * `<summary>`-Element). Default: `common.disclaimer.prototype_title`.
   */
  titleKey?: string;
}

const DEFAULT_TITLE_KEY = 'common.disclaimer.prototype_title';
const DEFAULT_MESSAGE_KEY = 'common.disclaimer.prototype';

function splitKey(fullKey: string): { ns: string; leaf: string } {
  const idx = fullKey.lastIndexOf('.');
  if (idx === -1) return { ns: '', leaf: fullKey };
  return { ns: fullKey.slice(0, idx), leaf: fullKey.slice(idx + 1) };
}

export function PrototypeDisclaimer({
  defaultOpen = false,
  messageKey = DEFAULT_MESSAGE_KEY,
  titleKey = DEFAULT_TITLE_KEY,
}: PrototypeDisclaimerProps) {
  const titleParts = splitKey(titleKey);
  const messageParts = splitKey(messageKey);
  const tTitle = useTranslations(titleParts.ns);
  const tMessage = useTranslations(messageParts.ns);

  return (
    <details
      className="group rounded-lg border border-border bg-muted/40 px-4 py-3 text-sm"
      open={defaultOpen}
    >
      <summary className="flex cursor-pointer list-none items-center gap-2 font-medium text-foreground marker:hidden">
        <Info className="size-4 text-muted-foreground" aria-hidden="true" />
        <span>{tTitle(titleParts.leaf)}</span>
      </summary>
      <p className="mt-3 whitespace-pre-line text-xs leading-relaxed text-muted-foreground">
        {tMessage(messageParts.leaf)}
      </p>
    </details>
  );
}
