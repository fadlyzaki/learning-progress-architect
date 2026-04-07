import type { ReactNode } from 'react';

type MarkdownContentProps = {
  content: string;
  className?: string;
};

type MarkdownBlock =
  | { type: 'heading'; level: 1 | 2 | 3; text: string }
  | { type: 'paragraph'; text: string }
  | { type: 'unordered-list'; items: string[] }
  | { type: 'ordered-list'; items: string[] }
  | { type: 'code'; text: string };

export function MarkdownContent({ content, className = '' }: MarkdownContentProps) {
  const blocks = parseMarkdownBlocks(content);

  return (
    <div className={className}>
      {blocks.map((block, index) => renderBlock(block, index))}
    </div>
  );
}

function parseMarkdownBlocks(content: string): MarkdownBlock[] {
  const lines = content.replace(/\r\n/g, '\n').split('\n');
  const blocks: MarkdownBlock[] = [];

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index].trimEnd();
    const trimmed = line.trim();

    if (!trimmed) {
      continue;
    }

    if (trimmed.startsWith('```')) {
      const codeLines: string[] = [];
      for (index += 1; index < lines.length; index += 1) {
        if (lines[index].trim().startsWith('```')) {
          break;
        }
        codeLines.push(lines[index]);
      }
      blocks.push({ type: 'code', text: codeLines.join('\n') });
      continue;
    }

    const headingMatch = trimmed.match(/^(#{1,3})\s+(.+)$/);
    if (headingMatch) {
      blocks.push({
        type: 'heading',
        level: headingMatch[1].length as 1 | 2 | 3,
        text: headingMatch[2].trim(),
      });
      continue;
    }

    const unorderedMatch = trimmed.match(/^[-*]\s+(.+)$/);
    if (unorderedMatch) {
      const items = [unorderedMatch[1].trim()];
      while (index + 1 < lines.length) {
        const nextLine = lines[index + 1].trim();
        const nextMatch = nextLine.match(/^[-*]\s+(.+)$/);
        if (!nextMatch) {
          break;
        }
        items.push(nextMatch[1].trim());
        index += 1;
      }
      blocks.push({ type: 'unordered-list', items });
      continue;
    }

    const orderedMatch = trimmed.match(/^\d+\.\s+(.+)$/);
    if (orderedMatch) {
      const items = [orderedMatch[1].trim()];
      while (index + 1 < lines.length) {
        const nextLine = lines[index + 1].trim();
        const nextMatch = nextLine.match(/^\d+\.\s+(.+)$/);
        if (!nextMatch) {
          break;
        }
        items.push(nextMatch[1].trim());
        index += 1;
      }
      blocks.push({ type: 'ordered-list', items });
      continue;
    }

    const paragraphLines = [trimmed];
    while (index + 1 < lines.length) {
      const nextLine = lines[index + 1].trim();
      if (
        !nextLine ||
        nextLine.startsWith('```') ||
        /^#{1,3}\s+/.test(nextLine) ||
        /^[-*]\s+/.test(nextLine) ||
        /^\d+\.\s+/.test(nextLine)
      ) {
        break;
      }

      paragraphLines.push(nextLine);
      index += 1;
    }

    blocks.push({ type: 'paragraph', text: paragraphLines.join('\n') });
  }

  return blocks;
}

function renderBlock(block: MarkdownBlock, index: number) {
  if (block.type === 'heading') {
    if (block.level === 1) {
      return (
        <h1 key={index} className="mt-1 text-2xl font-semibold tracking-tight text-[var(--text-primary)] first:mt-0">
          {renderInline(block.text, `heading-${index}`)}
        </h1>
      );
    }

    if (block.level === 2) {
      return (
        <h2 key={index} className="mt-5 text-xl font-semibold text-[var(--text-primary)] first:mt-0">
          {renderInline(block.text, `heading-${index}`)}
        </h2>
      );
    }

    return (
      <h3 key={index} className="mt-4 text-base font-semibold text-[var(--text-primary)] first:mt-0">
        {renderInline(block.text, `heading-${index}`)}
      </h3>
    );
  }

  if (block.type === 'unordered-list') {
    return (
      <ul key={index} className="mt-3 list-disc space-y-2 pl-5 text-[var(--text-secondary)] first:mt-0">
        {block.items.map((item, itemIndex) => (
          <li key={`${index}-${itemIndex}`}>{renderInline(item, `ul-${index}-${itemIndex}`)}</li>
        ))}
      </ul>
    );
  }

  if (block.type === 'ordered-list') {
    return (
      <ol key={index} className="mt-3 list-decimal space-y-2 pl-5 text-[var(--text-secondary)] first:mt-0">
        {block.items.map((item, itemIndex) => (
          <li key={`${index}-${itemIndex}`}>{renderInline(item, `ol-${index}-${itemIndex}`)}</li>
        ))}
      </ol>
    );
  }

  if (block.type === 'code') {
    return (
      <pre
        key={index}
        className="mt-3 overflow-x-auto rounded-2xl border border-[var(--border-color)] bg-[var(--bg-void)]/80 p-4 text-sm text-[var(--text-primary)] first:mt-0"
      >
        <code>{block.text}</code>
      </pre>
    );
  }

  return (
    <p key={index} className="mt-3 whitespace-pre-wrap leading-relaxed text-[var(--text-secondary)] first:mt-0">
      {renderInline(block.text, `paragraph-${index}`)}
    </p>
  );
}

function renderInline(text: string, keyPrefix: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const pattern = /(\[[^\]]+\]\([^\)]+\)|`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*)/g;
  let cursor = 0;
  let match = pattern.exec(text);

  while (match) {
    if (match.index > cursor) {
      nodes.push(renderTextWithBreaks(text.slice(cursor, match.index), `${keyPrefix}-text-${cursor}`));
    }

    const token = match[0];
    if (token.startsWith('[')) {
      const linkMatch = token.match(/^\[([^\]]+)\]\(([^\)]+)\)$/);
      if (linkMatch) {
        const href = getSafeHref(linkMatch[2]);
        if (href) {
          nodes.push(
            <a
              key={`${keyPrefix}-link-${match.index}`}
              href={href}
              target="_blank"
              rel="noreferrer"
              className="font-medium text-[var(--accent-blue)] underline decoration-[var(--accent-blue)]/45 underline-offset-4 transition-colors hover:text-[var(--text-primary)]"
            >
              {linkMatch[1]}
            </a>,
          );
        } else {
          nodes.push(token);
        }
      }
    } else if (token.startsWith('**')) {
      nodes.push(
        <strong key={`${keyPrefix}-strong-${match.index}`} className="font-semibold text-[var(--text-primary)]">
          {token.slice(2, -2)}
        </strong>,
      );
    } else if (token.startsWith('*')) {
      nodes.push(
        <em key={`${keyPrefix}-em-${match.index}`} className="italic text-[var(--text-primary)]">
          {token.slice(1, -1)}
        </em>,
      );
    } else if (token.startsWith('`')) {
      nodes.push(
        <code
          key={`${keyPrefix}-code-${match.index}`}
          className="rounded-md bg-[var(--bg-surface)] px-1.5 py-0.5 text-[0.95em] text-[var(--text-primary)]"
        >
          {token.slice(1, -1)}
        </code>,
      );
    }

    cursor = match.index + token.length;
    match = pattern.exec(text);
  }

  if (cursor < text.length) {
    nodes.push(renderTextWithBreaks(text.slice(cursor), `${keyPrefix}-text-${cursor}`));
  }

  return nodes;
}

function renderTextWithBreaks(text: string, keyPrefix: string) {
  return text.split('\n').map((part, index, parts) => (
    <span key={`${keyPrefix}-${index}`}>
      {part}
      {index < parts.length - 1 ? <br /> : null}
    </span>
  ));
}

function getSafeHref(value: string) {
  try {
    const url = new URL(value);
    if (url.protocol === 'http:' || url.protocol === 'https:') {
      return url.toString();
    }
  } catch {
    return null;
  }

  return null;
}