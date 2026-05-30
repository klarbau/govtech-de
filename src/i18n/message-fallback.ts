import deMessages from '@/lib/i18n/locales/de.json';

/**
 * i18n safety net. The German source (`de.json`) is the source of truth and is
 * the most complete locale; the other five intentionally omit ~172 DE-source /
 * orphaned keys. Without a fallback, a key present in `de.json` but missing in a
 * non-DE locale renders as the raw dotted key path (e.g. `termine.card.title`),
 * which looks broken to the user.
 *
 * This implements next-intl's `getMessageFallback`: for any message that is
 * missing in the active locale, look the same `namespace.key` path up in the DE
 * source and return that string. Only if the key is also absent in DE do we
 * fall back to the dotted key path — next-intl's default behaviour.
 *
 * Used by BOTH the server config (`getRequestConfig`) and the client
 * `NextIntlClientProvider`, so SSR and client render the identical string.
 */

type MessageNode = string | { [key: string]: MessageNode };

const deTree = deMessages as unknown as Record<string, MessageNode>;

function lookupDe(path: string): string | undefined {
  let node: MessageNode | undefined = deTree;
  for (const segment of path.split('.')) {
    if (typeof node !== 'object' || node === null) return undefined;
    node = node[segment];
  }
  return typeof node === 'string' ? node : undefined;
}

interface MessageFallbackArgs {
  namespace?: string;
  key: string;
}

export function getMessageFallback({ namespace, key }: MessageFallbackArgs): string {
  const path = namespace ? `${namespace}.${key}` : key;
  return lookupDe(path) ?? path;
}
