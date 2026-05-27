import * as React from 'react';

import { parseBoldAndNorms } from '@/components/posteingang/utils/parse-bold-norms';

/**
 * Markdown-lite renderer for chat prose. Handles only what the assistant
 * emits: paragraphs, `-`/`•`-bullets, `**bold**`, and norm spans (§/Art.).
 * No tables, no code, no links — per redesign-assistent.md §10.
 */

function renderInline(text: string): React.ReactNode {
  const segments = parseBoldAndNorms(text);
  return segments.map((seg, idx) => {
    if (seg.kind === 'bold') {
      return (
        <strong key={idx} className="font-semibold text-text-primary">
          {seg.text}
        </strong>
      );
    }
    if (seg.kind === 'norm') {
      return (
        <span key={idx} className="font-medium tabular-nums">
          {seg.text}
        </span>
      );
    }
    return <React.Fragment key={idx}>{seg.text}</React.Fragment>;
  });
}

interface Block {
  kind: 'para' | 'list';
  lines: string[];
}

function toBlocks(text: string): Block[] {
  const blocks: Block[] = [];
  for (const rawLine of text.split('\n')) {
    const line = rawLine.trimEnd();
    const bulletMatch = /^\s*[-•*]\s+(.*)$/.exec(line);
    if (bulletMatch) {
      const last = blocks[blocks.length - 1];
      if (last && last.kind === 'list') {
        last.lines.push(bulletMatch[1]);
      } else {
        blocks.push({ kind: 'list', lines: [bulletMatch[1]] });
      }
      continue;
    }
    if (line.trim() === '') {
      continue;
    }
    const last = blocks[blocks.length - 1];
    if (last && last.kind === 'para') {
      last.lines.push(line);
    } else {
      blocks.push({ kind: 'para', lines: [line] });
    }
  }
  return blocks;
}

export function MessageMarkdown({ text }: { text: string }) {
  const blocks = React.useMemo(() => toBlocks(text), [text]);
  return (
    <div className="space-y-2">
      {blocks.map((block, idx) => {
        if (block.kind === 'list') {
          return (
            <ul key={idx} className="ml-1 list-disc space-y-1 pl-4">
              {block.lines.map((line, li) => (
                <li key={li}>{renderInline(line)}</li>
              ))}
            </ul>
          );
        }
        return (
          <p key={idx} className="whitespace-pre-wrap">
            {block.lines.map((line, li) => (
              <React.Fragment key={li}>
                {li > 0 ? <br /> : null}
                {renderInline(line)}
              </React.Fragment>
            ))}
          </p>
        );
      })}
    </div>
  );
}
