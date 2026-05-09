/**
 * Tokenisiert AI-Bullet- und Was-kann-ich-tun-Texte in plain / bold / norm
 * Segmente. Beide Renderer (`AISummaryBlock`, `WasKannIchTunFooter`)
 * verwenden diesen Parser um auf React-Element-Introspection und
 * duplizierte Norm-Regexes zu verzichten.
 *
 *  - **Bold**-Markdown: `**text**` → `{ kind: 'bold', text }`.
 *  - Norm-Kürzel (z. B. `§ 240 AO`, `Art. 6 DSGVO`, `BGH I ZR 113/20`)
 *    werden als `{ kind: 'norm', text, norm }` ausgewiesen — innerhalb
 *    bold-Blöcken wird **nicht** weiter aufgesplittet (Norm-Kürzel kommen
 *    in der Demo nie innerhalb von `**…**` vor).
 *  - Alles andere → `{ kind: 'plain', text }`.
 */

const NORM_PATTERN =
  /(§\s?\d+[a-z]?(?:\s?Abs\.\s?\d+[a-z]?)?\s?[A-Z][A-Za-zÄÖÜäöüß]+|Art\.\s?\d+[a-z]?\s?DSGVO|BGH\s?I\s?ZR\s?\d+\/\d+)/g;

export type ParsedSegment =
  | { kind: 'plain'; text: string }
  | { kind: 'bold'; text: string }
  | { kind: 'norm'; text: string; norm: string };

function splitNorms(text: string): ParsedSegment[] {
  if (!text) return [];
  const segments: ParsedSegment[] = [];
  let lastEnd = 0;
  const re = new RegExp(NORM_PATTERN);
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m.index > lastEnd) {
      segments.push({ kind: 'plain', text: text.slice(lastEnd, m.index) });
    }
    segments.push({ kind: 'norm', text: m[0], norm: m[0] });
    lastEnd = m.index + m[0].length;
  }
  if (lastEnd < text.length) {
    segments.push({ kind: 'plain', text: text.slice(lastEnd) });
  }
  return segments;
}

export function parseBoldAndNorms(text: string): ParsedSegment[] {
  if (!text) return [];
  const out: ParsedSegment[] = [];
  const boldParts = text.split(/(\*\*[^*]+\*\*)/g);
  for (const part of boldParts) {
    if (!part) continue;
    if (part.startsWith('**') && part.endsWith('**')) {
      out.push({ kind: 'bold', text: part.slice(2, -2) });
    } else {
      out.push(...splitNorms(part));
    }
  }
  return out;
}
