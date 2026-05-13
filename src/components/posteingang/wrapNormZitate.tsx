/**
 * Norm-Zitat-JSX-Helfer (Spec § 11.5 Posteingang V1.5.1, vererbt auf
 * Stammdaten V1 § 11.7).
 *
 * Diese Datei ist bewusst getrennt von `normZitatLookup.ts`:
 *   - `normZitatLookup.ts` enthält die Plain-TS-Daten (Map, Regex, Aria-
 *     Lookup-Funktion) und ist von Vitest direkt ladbar, ohne den Rolldown-
 *     JSX-Pfad.
 *   - `wrapNormZitate.tsx` enthält den JSX-Helfer.
 *
 * Trennung in zwei Dateinamen löst zwei Pfad-Resolver-Probleme gleichzeitig:
 *   - `import { wrapNormZitate } from '.../wrapNormZitate'` resolved zur
 *     `.tsx`-Datei (eindeutiger Basename, keine `.ts`/`.tsx`-Kollision).
 *   - `import { NORM_ZITAT_REGEX } from '.../normZitatLookup'` resolved zur
 *     `.ts`-Datei.
 */
import * as React from 'react';

import { NormZitatSpan } from './NormZitatSpan';
import { NORM_ZITAT_REGEX } from './normZitatLookup';

/**
 * Wrappt §-Zitate in einem freien Text-String mit `<NormZitatSpan>`-Komponenten
 * (Hard-Line § 11.5 Posteingang V1.5.1; vererbt auf Stammdaten V1 § 11.7).
 *
 * Liefert ein Array von `ReactNode`, das direkt in JSX-Children gerendert
 * werden kann.
 */
export function wrapNormZitate(text: string): React.ReactNode[] {
  const out: React.ReactNode[] = [];
  const re = new RegExp(NORM_ZITAT_REGEX.source, 'g');
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) {
      out.push(text.slice(last, m.index));
    }
    out.push(<NormZitatSpan key={`nz-${i}`} text={m[0]} />);
    last = re.lastIndex;
    i += 1;
  }
  if (last < text.length) {
    out.push(text.slice(last));
  }
  if (out.length === 0) out.push(text);
  return out;
}
