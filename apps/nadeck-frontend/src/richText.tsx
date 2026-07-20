/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { ReactNode } from 'react';

// Lets admin-entered description text use a small whitelist of inline formatting tags
// (<b>, <strong>, <i>, <em>, <u>) plus newlines, without ever treating the string as real
// HTML - we only ever emit text nodes or wrap them in one of the whitelisted host elements,
// so there is no dangerouslySetInnerHTML and no way to inject arbitrary markup/scripts.
const TAG_PATTERN = /<(b|strong|i|em|u)>([\s\S]*?)<\/\1>/gi;

function splitLines(text: string, keyPrefix: string): ReactNode[] {
  const lines = text.split('\n');
  const nodes: ReactNode[] = [];
  lines.forEach((line, i) => {
    if (i > 0) nodes.push(<br key={`${keyPrefix}-br-${i}`} />);
    if (line) nodes.push(line);
  });
  return nodes;
}

export function renderRichText(text: string | undefined | null, keyPrefix = 'rt'): ReactNode[] {
  if (!text) return [];

  const nodes: ReactNode[] = [];
  let lastIndex = 0;
  let idx = 0;
  let match: RegExpExecArray | null;

  TAG_PATTERN.lastIndex = 0;
  while ((match = TAG_PATTERN.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(...splitLines(text.slice(lastIndex, match.index), `${keyPrefix}-${idx++}`));
    }
    const Tag = match[1].toLowerCase() as 'b' | 'strong' | 'i' | 'em' | 'u';
    nodes.push(<Tag key={`${keyPrefix}-${idx++}`}>{match[2]}</Tag>);
    lastIndex = TAG_PATTERN.lastIndex;
  }
  if (lastIndex < text.length) {
    nodes.push(...splitLines(text.slice(lastIndex), `${keyPrefix}-${idx++}`));
  }

  return nodes;
}
