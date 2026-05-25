/**
 * Purpose-built tiny Markdown renderer for Communitas content pages.
 *
 * Phase-3 scope: we render manifesto.md, glossar.md, stille.md. None of these
 * contain code-fences, tables, images or arbitrary HTML. Pulling in a full
 * markdown parser would be over-engineering for the sober content set. This
 * renderer therefore supports only what the three documents actually use:
 *
 *   - `# H1`, `## H2`, `### H3`
 *   - paragraphs (blank-line separated)
 *   - unordered lists with `- item`
 *   - bold via `**...**`
 *   - italic via `*...*`
 *   - inline links via `[text](url)`
 *
 * Output is plain HTML; the surrounding component supplies styling.
 *
 * Special form: a paragraph that begins with `**TERM** — DEFINITION` is
 * detected by the caller to feed the definition-list (glossar) rendering;
 * the generic paragraph renderer treats the same line as a normal `<p>`.
 */

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function renderInline(text: string): string {
  let out = escapeHtml(text);
  // Links: [label](url)  (url is restricted to http(s):, tel:, mailto:)
  out = out.replace(
    /\[([^\]]+)\]\((https?:\/\/[^\s)]+|tel:[^\s)]+|mailto:[^\s)]+)\)/g,
    (_m, label: string, url: string) =>
      `<a href="${url}">${label}</a>`,
  );
  // Bold: **text**
  out = out.replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>');
  // Italic: *text*  (only when surrounded by non-word boundaries)
  out = out.replace(/(^|[\s(])\*([^*\n]+)\*(?=[\s.,;:!?)]|$)/g, '$1<em>$2</em>');
  return out;
}

interface Block {
  type: 'h1' | 'h2' | 'h3' | 'p' | 'ul';
  text?: string;
  items?: string[];
}

function tokenize(src: string): Block[] {
  const lines = src.replace(/\r\n/g, '\n').split('\n');
  const blocks: Block[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (line.trim() === '') {
      i++;
      continue;
    }
    if (line.startsWith('### ')) {
      blocks.push({ type: 'h3', text: line.slice(4).trim() });
      i++;
      continue;
    }
    if (line.startsWith('## ')) {
      blocks.push({ type: 'h2', text: line.slice(3).trim() });
      i++;
      continue;
    }
    if (line.startsWith('# ')) {
      blocks.push({ type: 'h1', text: line.slice(2).trim() });
      i++;
      continue;
    }
    if (line.startsWith('- ')) {
      const items: string[] = [];
      while (i < lines.length && lines[i].startsWith('- ')) {
        items.push(lines[i].slice(2).trim());
        i++;
      }
      blocks.push({ type: 'ul', items });
      continue;
    }
    // Paragraph: collect contiguous non-blank, non-heading, non-list lines
    const buf: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() !== '' &&
      !lines[i].startsWith('# ') &&
      !lines[i].startsWith('## ') &&
      !lines[i].startsWith('### ') &&
      !lines[i].startsWith('- ')
    ) {
      buf.push(lines[i]);
      i++;
    }
    blocks.push({ type: 'p', text: buf.join(' ').trim() });
  }
  return blocks;
}

/** Render generic markdown (manifesto, stille). */
export function renderMarkdown(src: string): string {
  const blocks = tokenize(src);
  const parts: string[] = [];
  for (const b of blocks) {
    if (b.type === 'h1') parts.push(`<h1>${renderInline(b.text ?? '')}</h1>`);
    else if (b.type === 'h2') parts.push(`<h2>${renderInline(b.text ?? '')}</h2>`);
    else if (b.type === 'h3') parts.push(`<h3>${renderInline(b.text ?? '')}</h3>`);
    else if (b.type === 'p') parts.push(`<p>${renderInline(b.text ?? '')}</p>`);
    else if (b.type === 'ul') {
      const items = (b.items ?? []).map((it) => `<li>${renderInline(it)}</li>`).join('');
      parts.push(`<ul>${items}</ul>`);
    }
  }
  return parts.join('\n');
}

/**
 * Render the glossar: paragraphs of the form `**Term** — Definition` become
 * `<dt>Term</dt><dd>Definition</dd>` pairs inside a single `<dl>`.
 * Everything else (the H1 at the top) renders normally.
 */
export function renderGlossar(src: string): string {
  const blocks = tokenize(src);
  const parts: string[] = [];
  let dlOpen = false;
  for (const b of blocks) {
    if (b.type === 'p') {
      const text = b.text ?? '';
      // Match `**TERM** — Definition` (em-dash) or `**TERM** - Definition`
      const m = /^\*\*([^*]+)\*\*\s+[—-]\s+(.+)$/.exec(text);
      if (m) {
        if (!dlOpen) {
          parts.push('<dl>');
          dlOpen = true;
        }
        const term = renderInline(m[1].trim());
        const def = renderInline(m[2].trim());
        parts.push(`<dt>${term}</dt><dd>${def}</dd>`);
        continue;
      }
    }
    if (dlOpen) {
      parts.push('</dl>');
      dlOpen = false;
    }
    if (b.type === 'h1') parts.push(`<h1>${renderInline(b.text ?? '')}</h1>`);
    else if (b.type === 'h2') parts.push(`<h2>${renderInline(b.text ?? '')}</h2>`);
    else if (b.type === 'h3') parts.push(`<h3>${renderInline(b.text ?? '')}</h3>`);
    else if (b.type === 'p') parts.push(`<p>${renderInline(b.text ?? '')}</p>`);
    else if (b.type === 'ul') {
      const items = (b.items ?? []).map((it) => `<li>${renderInline(it)}</li>`).join('');
      parts.push(`<ul>${items}</ul>`);
    }
  }
  if (dlOpen) parts.push('</dl>');
  return parts.join('\n');
}

/** Extract the first N paragraphs (after the title), joined as plain text/HTML. */
export function firstParagraphs(src: string, n: number): string {
  const blocks = tokenize(src);
  let count = 0;
  const out: string[] = [];
  for (const b of blocks) {
    if (b.type !== 'p') continue;
    out.push(`<p>${renderInline(b.text ?? '')}</p>`);
    count++;
    if (count >= n) break;
  }
  return out.join('\n');
}
